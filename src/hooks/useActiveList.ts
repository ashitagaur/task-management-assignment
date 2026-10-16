import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAppStore, getPermissionContext } from '../store/store';
import { getVisibleLists } from '../store/selectors';
import { canViewNode } from '../domain/permissions';
import { ContainerNode } from '../domain/types';

export interface ActiveListRoute {
  /** The listId currently resolved from the hash route, or null if no route */
  activeListId: string | null;
  /** The container node corresponding to activeListId, or null if unresolved */
  activeList: ContainerNode | null;
  /** True if the target list exists but the active user is forbidden from viewing it */
  isForbidden: boolean;
  /** True if the target list does not exist or is not a list */
  isNotFound: boolean;
  /** Navigation helper to switch lists via URL hash */
  navigateToList: (listId: string) => void;
}

/**
 * Parses the listId from an approved hash route (#/list/:listId).
 * Returns null if the hash does not match the approved pattern.
 */
export function parseListIdFromHash(hash: string): string | null {
  const match = hash.match(/^#\/list\/([a-zA-Z0-9_-]+)$/);
  return match && match[1] ? match[1] : null;
}

/**
 * Custom hook for Hash Routing.
 * 
 * Rules enforced:
 * - URL/hash (#/list/:listId) is the ONLY source of truth for the active list.
 * - Never stores activeListId in Zustand.
 * - Gracefully handles default route (#/ or empty) with fallback to first visible list.
 * - Handles invalid/nonexistent list deterministically.
 * - Reconciles route on user switch (redirects if the new user lacks access).
 * - Exposes isForbidden for direct navigation to restricted lists.
 */
export function useActiveList(): ActiveListRoute {
  const containersById = useAppStore((state) => state.containersById);
  const activeUserId = useAppStore((state) => state.activeUserId);
  const fullState = useAppStore((state) => state);

  // Track the current URL hash in local state
  const [currentHash, setCurrentHash] = useState<string>(() => {
    return typeof window !== 'undefined' ? window.location.hash : '';
  });

  // Track the previous user ID to detect user switches for route reconciliation
  const prevUserIdRef = useRef<string>(activeUserId);

  // Listen to browser hashchange events
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
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

  // Resolve target container node
  const targetNode = rawListId ? containersById[rawListId] : null;
  const isValidList = Boolean(targetNode && targetNode.type === 'list' && !targetNode.archived);

  // Check visibility if valid list
  const canView = isValidList && rawListId
    ? canViewNode(activeUserId, rawListId, permissionContext)
    : false;

  const isForbidden = isValidList && !canView;
  const isNotFound = Boolean(rawListId && !isValidList);

  // Navigate helper
  const navigateToList = useCallback((listId: string) => {
    window.location.hash = `#/list/${listId}`;
  }, []);

  // Effect: Route reconciliation and default fallback
  useEffect(() => {
    const isUserSwitch = prevUserIdRef.current !== activeUserId;
    prevUserIdRef.current = activeUserId;

    // 1. If empty or root hash, redirect to first visible list
    if (!rawListId || currentHash === '' || currentHash === '#' || currentHash === '#/') {
      if (defaultListId) {
        window.location.replace(`#/list/${defaultListId}`);
      }
      return;
    }

    // 2. If list is completely invalid or archived, redirect to fallback
    if (isNotFound) {
      if (defaultListId) {
        window.location.replace(`#/list/${defaultListId}`);
      }
      return;
    }

    // 3. User switch reconciliation: If user switched and current list is now denied, redirect to fallback
    if (isUserSwitch && isForbidden) {
      if (defaultListId) {
        window.location.replace(`#/list/${defaultListId}`);
      }
    }
  }, [
    activeUserId,
    rawListId,
    currentHash,
    isNotFound,
    isForbidden,
    defaultListId,
  ]);

  return {
    activeListId: rawListId,
    activeList: isValidList && targetNode ? targetNode : null,
    isForbidden,
    isNotFound,
    navigateToList,
  };
}
