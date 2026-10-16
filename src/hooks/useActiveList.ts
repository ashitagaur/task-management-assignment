import { useEffect, useState, useCallback, useMemo, useRef, useContext } from 'react';
import { useAppStore, getPermissionContext } from '../store/store';
import { getVisibleLists } from '../store/selectors';
import { canViewNode } from '../domain/permissions';
import { ContainerNode } from '../domain/types';
import { ToastContext } from '../components/shared/Toast';

export type RouteState = 'access' | 'forbidden' | 'not-found' | 'no-visible-lists';

export interface ActiveListRoute {
  /** Explicit routing state machine result */
  state: RouteState;
  /** The listId currently resolved from the hash route, or null if no valid list / not found / no access */
  activeListId: string | null;
  /** The container node corresponding to activeListId (only in 'access' state), or null */
  activeList: ContainerNode | null;
  /** True if state is 'forbidden' */
  isForbidden: boolean;
  /** True if state is 'not-found' */
  isNotFound: boolean;
  /** Target container node if route points to an existing list (for RestrictedCard in 403 state) */
  targetContainer: ContainerNode | null;
  /** First accessible visible list for current user, for CTAs and fallback navigation */
  fallbackList: ContainerNode | null;
  /** Navigation helper to switch lists via URL hash */
  navigateToList: (listId: string) => void;
}

/**
 * Parses the listId from an approved hash route (#/list/:listId).
 * Supports optional trailing slash.
 * Returns null if the hash does not match the approved pattern.
 */
export function parseListIdFromHash(hash: string): string | null {
  const match = hash.match(/^#\/list\/([a-zA-Z0-9_-]+)\/?$/);
  return match && match[1] ? match[1] : null;
}

/**
 * Checks whether a node or any of its ancestor containers is archived.
 * Fails closed (returns true) if an ancestry cycle or broken hierarchy is detected.
 */
export function isNodeOrAncestorArchived(
  nodeId: string,
  containersById: Record<string, ContainerNode>
): boolean {
  let current: ContainerNode | undefined = containersById[nodeId];
  const visited = new Set<string>();

  while (current) {
    if (visited.has(current.id)) return true; // Cycle detected -> treat as invalid/archived
    visited.add(current.id);

    if (current.archived) return true;
    if (!current.parentId) break;

    const parent = containersById[current.parentId];
    if (!parent) return true; // Broken parent hierarchy -> fail closed
    current = parent;
  }

  return false;
}

/**
 * Custom hook for Hash Routing & Explicit Route Reconciliation State Machine.
 *
 * Product States:
 * 1. 'access' — Valid list route that the active user is authorized to view.
 * 2. 'forbidden' — Valid list route that the active user is denied access to (403).
 * 3. 'not-found' — Nonexistent ID, non-list container ID (space/folder), or archived list (404).
 * 4. 'no-visible-lists' — User account has zero visible lists across the workspace.
 *
 * Purity & Side Effect Invariants:
 * - Render is 100% pure: derives state, activeListId, and fallback projections without mutating
 *   Zustand, DOM, browser history, or dispatching toasts.
 * - All URL replacements and toasts are exclusively executed inside useEffect.
 * - StrictMode duplicate execution is guarded via lastToastSwitchRef.
 */
export function useActiveList(): ActiveListRoute {
  const containersById = useAppStore((state) => state.containersById);
  const activeUserId = useAppStore((state) => state.activeUserId);
  const usersById = useAppStore((state) => state.usersById);
  const fullState = useAppStore((state) => state);

  const prevUserIdRef = useRef<string>(activeUserId);
  const lastToastSwitchRef = useRef<string | null>(null);
  const toastContext = useContext(ToastContext);

  // Track the current URL hash in local state
  const [currentHash, setCurrentHash] = useState<string>(() => {
    return typeof window !== 'undefined' ? window.location.hash : '';
  });

  // Pathname normalization effect:
  // Strictly hash-only from the root (/#/list/:listId).
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      const canonicalPath = `/${window.location.hash || ''}`;
      window.history.replaceState(null, '', canonicalPath);
    }
  }, []);

  // Listen to browser hashchange and popstate events
  useEffect(() => {
    const handleLocationChange = () => {
      if (window.location.pathname !== '/') {
        window.history.replaceState(null, '', `/${window.location.hash || ''}`);
      }
      setCurrentHash(window.location.hash);
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Compute permission context
  const permissionContext = useMemo(() => {
    return getPermissionContext(fullState);
  }, [fullState]);

  // Compute lists visible to current user for deterministic fallback
  const visibleLists = useMemo(() => {
    return getVisibleLists(fullState);
  }, [fullState]);

  const defaultList = visibleLists[0] ?? null;
  const defaultListId = defaultList?.id ?? null;

  // Empty root hash check: #, #/, or empty string
  const isEmptyRootHash = currentHash === '' || currentHash === '#' || currentHash === '#/';

  // Parse candidate listId from current hash
  const rawListId = parseListIdFromHash(currentHash);

  // Resolve target container node and structural status
  const targetNode = rawListId ? containersById[rawListId] ?? null : null;
  const existsAsList = Boolean(targetNode && targetNode.type === 'list');
  const isArchived = Boolean(
    rawListId && targetNode && isNodeOrAncestorArchived(rawListId, containersById)
  );

  // A list is valid if it exists, is of type 'list', and neither it nor any ancestor is archived
  const isValidList = existsAsList && !isArchived;

  // Check visibility for the active user if structurally valid
  const canView = isValidList && rawListId
    ? canViewNode(activeUserId, rawListId, permissionContext)
    : false;

  // User switch detection (derived purely during render)
  const didUserSwitch = prevUserIdRef.current !== activeUserId;
  const isCurrentListAccessible = Boolean(isValidList && canView);
  const isUserSwitchToInaccessible = Boolean(
    didUserSwitch && !isEmptyRootHash && !isCurrentListAccessible && defaultListId
  );

  // Helper to replace URL to canonical app root (/) and update local state
  const redirectTo = useCallback((newHash: string) => {
    if (typeof window !== 'undefined') {
      const canonicalUrl = `/${newHash}`;
      window.history.replaceState(null, '', canonicalUrl);
      setCurrentHash(newHash);
    }
  }, []);

  // Navigation helper ensuring path is always canonical app root (/)
  const navigateToList = useCallback((listId: string) => {
    const newHash = `#/list/${listId}`;
    if (typeof window !== 'undefined') {
      if (window.location.pathname !== '/') {
        window.history.pushState(null, '', `/${newHash}`);
      } else {
        window.location.hash = newHash;
      }
      setCurrentHash(newHash);
    }
  }, []);

  // Effect: Handle side effects (URL replacement, toast, root initialization)
  useEffect(() => {
    const userSwitched = prevUserIdRef.current !== activeUserId;
    const prevUserId = prevUserIdRef.current;
    prevUserIdRef.current = activeUserId;

    // USER SWITCH reconciliation:
    // If perspective switch made current list inaccessible (forbidden or invalid/not-found),
    // replace URL to first accessible visible list and notify user
    if (userSwitched && !isEmptyRootHash && !isCurrentListAccessible && defaultListId) {
      if (typeof window !== 'undefined' && window.location.hash !== `#/list/${defaultListId}`) {
        window.history.replaceState(null, '', `/#/list/${defaultListId}`);
        setCurrentHash(`#/list/${defaultListId}`);
      }

      // Guard against duplicate toasts in StrictMode or re-renders
      const switchKey = `${prevUserId}->${activeUserId}:${rawListId || 'invalid'}`;
      if (lastToastSwitchRef.current !== switchKey) {
        lastToastSwitchRef.current = switchKey;

        if (toastContext) {
          const fromName = targetNode?.name || 'That list';
          const toName = defaultList?.name || 'accessible list';
          const newUserName = usersById[activeUserId]?.name?.split(' ')[0] || 'User';
          toastContext.showToast({
            type: 'info',
            title: 'List unavailable',
            body: `${fromName} isn't available to ${newUserName}. Showing ${toName} instead.`,
          });
        }
      }
      return;
    }

    // Root / empty hash initialization:
    if (isEmptyRootHash && defaultListId) {
      redirectTo(`#/list/${defaultListId}`);
      return;
    }

    // Trailing slash normalization:
    if (currentHash.endsWith('/') && rawListId && isValidList && canView) {
      redirectTo(`#/list/${rawListId}`);
      return;
    }
  }, [
    activeUserId,
    isCurrentListAccessible,
    isValidList,
    canView,
    defaultListId,
    defaultList,
    isEmptyRootHash,
    currentHash,
    rawListId,
    targetNode,
    usersById,
    toastContext,
    redirectTo,
  ]);

  // Explicit routing state machine (pure derivation):
  let state: RouteState;
  let activeListId: string | null = null;
  let activeList: ContainerNode | null = null;
  let isForbidden = false;
  let isNotFound = false;

  if (visibleLists.length === 0) {
    // STATE 5 — ZERO ACCESSIBLE LISTS
    state = 'no-visible-lists';
  } else if (isUserSwitchToInaccessible) {
    // STATE 2 — USER SWITCH RECONCILIATION
    // Purely project new user's default accessible list during switch render (prevents 403 flicker)
    state = 'access';
    activeListId = defaultListId;
    activeList = defaultList;
  } else if (isEmptyRootHash) {
    // Empty root route before initial redirect runs -> show first accessible list
    state = 'access';
    activeListId = defaultListId;
    activeList = defaultList;
  } else if (!isValidList) {
    // STATE 4 — WRONG / NON-FUNCTIONING ROUTE (404)
    state = 'not-found';
    isNotFound = true;
  } else if (!canView) {
    // STATE 3 — VALID EXISTING ROUTE + NO ACCESS (403)
    state = 'forbidden';
    isForbidden = true;
  } else {
    // STATE 1 — VALID ROUTE + ACCESS
    state = 'access';
    activeListId = rawListId;
    activeList = targetNode;
  }

  return {
    state,
    activeListId,
    activeList,
    isForbidden,
    isNotFound,
    targetContainer: targetNode,
    fallbackList: defaultList,
    navigateToList,
  };
}
