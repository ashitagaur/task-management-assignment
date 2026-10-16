import { useState, useEffect } from 'react';

export interface SimulatedLoadState {
  isLoading: boolean;
  isFading: boolean;
}

// Module-level flag: tracks whether initial application load has occurred in this browser session.
// In-memory only: resets naturally whenever the browser reloads or hard-refreshes.
let hasCompletedInitialLoad = false;

/**
 * Hook to coordinate initial app load and browser refresh loading/shimmer state.
 *
 * Requirements:
 * - On first app load -> show smooth loading/shimmer state.
 * - On browser refresh -> show the same smooth loading/shimmer state.
 * - Shimmer transitions smoothly into final UI without pop/flicker.
 * - In-app list navigation -> NO shimmer.
 * - Board/List toggle -> NO shimmer.
 * - User switch -> NO shimmer.
 */
export function useSimulatedLoad(
  _triggerKey?: string | null,
  delayMs: number = 250
): SimulatedLoadState {
  const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

  const [state, setState] = useState<SimulatedLoadState>(() => {
    if (isTest || hasCompletedInitialLoad || delayMs <= 0) {
      return { isLoading: false, isFading: false };
    }
    return { isLoading: true, isFading: false };
  });

  useEffect(() => {
    if (isTest || hasCompletedInitialLoad || delayMs <= 0) return;

    // Phase 1: Hold the shimmer for the requested delay
    const fadeTimer = setTimeout(() => {
      setState({ isLoading: true, isFading: true });
    }, delayMs);

    // Phase 2: After the smooth 200ms crossfade, finalize and mark initial load complete
    const doneTimer = setTimeout(() => {
      hasCompletedInitialLoad = true;
      setState({ isLoading: false, isFading: false });
    }, delayMs + 200);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [delayMs, isTest]);

  return state;
}

/**
 * Resets the in-memory initial load flag.
 * Used for testing or debugging if needed.
 */
export function resetInitialLoadStateForTesting(): void {
  hasCompletedInitialLoad = false;
}

