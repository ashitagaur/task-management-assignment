import { useState, useEffect } from 'react';

/**
 * Custom hook to simulate brief initial loading / route transition state.
 * Configured with a short delay (250ms) for visual polish, and clean unmount cancellation.
 */
export function useSimulatedLoad(triggerKey?: string | null, delayMs: number = 250): boolean {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (delayMs <= 0) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [triggerKey, delayMs]);

  return isLoading;
}
