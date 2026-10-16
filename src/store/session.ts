import { INITIAL_USERS } from './fixtures';

export const ACTIVE_USER_STORAGE_KEY = 'flowboard.activeUserId';
export const DEFAULT_USER_ID = 'user-alice';

/**
 * Safely reads the persisted active user ID from sessionStorage.
 * Validates against fixture users to prevent corrupted or malicious values.
 * Returns DEFAULT_USER_ID ('user-alice') if unavailable, empty, or invalid.
 */
export function getStoredActiveUserId(): string {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return DEFAULT_USER_ID;
    }
    const stored = window.sessionStorage.getItem(ACTIVE_USER_STORAGE_KEY);
    if (stored && Object.prototype.hasOwnProperty.call(INITIAL_USERS, stored)) {
      return stored;
    }
  } catch {
    // Storage access blocked or restricted (e.g., private browsing, sandboxed iframe)
  }
  return DEFAULT_USER_ID;
}

/**
 * Safely persists the active user ID to sessionStorage.
 * Wrapped in try/catch to ensure storage quota or access issues never crash the app.
 */
export function setStoredActiveUserId(userId: string): void {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(ACTIVE_USER_STORAGE_KEY, userId);
    }
  } catch {
    // Storage access or quota error ignored gracefully
  }
}
