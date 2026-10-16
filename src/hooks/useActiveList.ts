import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAppStore, getPermissionContext } from '../store/store';
import { getVisibleLists } from '../store/selectors';
import { canViewNode } from '../domain/permissions';
import { ContainerNode } from '../domain/types';

export interface ActiveListRoute {
  /** The listId currently resolved from the hash route, or null if no route */
  activeListId: string | null;
  /** The container node corresponding to activeListId, or null if unresolved */
  activeList: ContainerNode | null;
  /** True if the target list exists and is unarchived, but the active user is forbidden from viewing it */
  isForbidden: boolean;
  /** True if the target list does not exist, is not a list, or is archived */
  isNotFound: boolean;
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
 * Custom hook for Hash Routing.
 *
 * Invariant rules enforced:
 * - URL/hash (#/list/:listId) from app root (/) is the ONLY source of truth for the active list.
 * - Any unexpected pathname prefix (e.g. /jk, /foo) is normalized to the app root (/),
 *   preserving the intended hash if present.
 * - Never stores activeListId in Zustand.
 * - Gracefully handles default route (#/ or empty) with fallback to first visible list.
 * - Deterministically handles invalid, non-existent, or archived routes by redirecting to fallback.
 * - Reconciles automatically when store state changes (archive, permissions, hierarchy).
 * - Distinguishes invalid/archived routes (fallback) from forbidden direct routes (RestrictedCard).
 * - Preserves URL on forbidden routes (including user switch or permission change).
 */
export function useActiveList(): ActiveListRoute {
  const containersById = useAppStore((state) => state.containersById);
  const activeUserId = useAppStore((state) => state.activeUserId);
  const fullState = useAppStore((state) => state);

  // Track the current URL hash in local state
  const [currentHash, setCurrentHash] = useState<string>(() => {
    return typeof window !== 'undefined' ? window.location.hash : '';
  });

  // Pathname normalization effect:
  // Our routing contract is strictly hash-only from the root (/#/list/:listId).
  // If loaded with an arbitrary pathname (e.g. /jk#/list/...), normalize to / preserving hash.
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      const canonicalPath = `/${window.location.hash || ''}`;
      window.history.replaceState(null, '', canonicalPath);
    }
  }, []);

  // Listen to browser hashchange and popstate events
  useEffect(() => {
    const handleLocationChange = () => {
      // Normalize pathname to root if needed
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

  const defaultListId = visibleLists[0]?.id ?? null;

  // Parse candidate listId from current hash
  const rawListId = parseListIdFromHash(currentHash);

  // Resolve target container node and structural status
  const targetNode = rawListId ? containersById[rawListId] : null;
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

  // Forbidden: list exists and is unarchived, but active user lacks read capability
  // (In this state, preserve the URL and display RestrictedCard)
  const isForbidden = isValidList && !canView;

  // Not found: nonexistent node, wrong container type, or archived node/ancestor
  const isNotFound = Boolean(rawListId && !isValidList);

  // Helper to replace URL to canonical app root (/) and update local state synchronously
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

  // Effect: Route reconciliation on state changes, archive, invalid paths, and default fallback
  useEffect(() => {
    // 1. Empty, root, or unparseable hash -> redirect to first visible list
    if (!rawListId || currentHash === '' || currentHash === '#' || currentHash === '#/') {
      if (defaultListId) {
        redirectTo(`#/list/${defaultListId}`);
      }
      return;
    }

    // 2. Trailing slash normalization (e.g. #/list/list-backlog/ -> #/list/list-backlog)
    if (currentHash.endsWith('/') && rawListId) {
      redirectTo(`#/list/${rawListId}`);
      return;
    }

    // 3. Invalid, nonexistent, or archived list/ancestor -> redirect to fallback
    if (isNotFound) {
      if (defaultListId) {
        redirectTo(`#/list/${defaultListId}`);
      }
      return;
    }

    // 4. If current route is forbidden, we preserve the URL so RestrictedCard can render.
  }, [
    activeUserId,
    rawListId,
    currentHash,
    isNotFound,
    isForbidden,
    defaultListId,
    containersById,
    redirectTo,
  ]);

  // Determine active list for rendering
  // If route is forbidden, keep requested list so RestrictedCard can render target info
  // If route is valid, render requested list
  // If route is invalid / not found, fall back to defaultListId immediately so UI stays responsive
  const effectiveListId = isForbidden
    ? rawListId
    : isValidList
    ? rawListId
    : defaultListId;

  const effectiveNode: ContainerNode | null = isForbidden
    ? targetNode ?? null
    : isValidList && targetNode
    ? targetNode
    : defaultListId
    ? containersById[defaultListId] ?? null
    : null;

  return {
    activeListId: effectiveListId,
    activeList: effectiveNode,
    isForbidden,
    isNotFound,
    navigateToList,
  };
}
