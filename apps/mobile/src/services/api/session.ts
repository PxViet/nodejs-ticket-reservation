import type { TokenPair } from '@movea/api-contract';

// Config
import { API_BASE_URL } from '@/services/api/config';

// Token persistence
import {
  clearTokens,
  getRefreshToken,
  saveTokens,
} from '@/features/auth/services/token-storage';

/**
 * Session-recovery helpers for the HTTP client. The client calls
 * `refreshAccessToken()` when an authenticated request comes back `401`; a
 * failed rotation means the refresh token is gone too, so the client then calls
 * `notifySessionExpired()` to tear the session down.
 *
 * This module never imports the HTTP client or the auth store, so wiring it into
 * `apiRequest` and the Zustand store creates no require cycle.
 */

/** In-flight rotation, shared so concurrent 401s spend one refresh token. */
let refreshPromise: Promise<string> | null = null;

/** Invoked once when a rotation fails — registered by the auth store. */
let sessionExpiredHandler: (() => void) | null = null;

const rotate = async (): Promise<string> => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token to rotate');
  }

  // Bare fetch, not `apiRequest` — no bearer, and no recursion back into the
  // 401 interceptor.
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error(`Refresh failed with status ${response.status}`);
  }

  const pair = (await response.json()) as TokenPair;
  await saveTokens(pair);
  return pair.accessToken;
};

/**
 * Rotate the stored token pair and resolve with the new access token.
 * Concurrent callers share a single rotation.
 */
export const refreshAccessToken = (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = rotate().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

/** Register the teardown run when a rotation fails (store `reset`). */
export const registerSessionExpiredHandler = (handler: () => void): void => {
  sessionExpiredHandler = handler;
};

/** Drop the stored tokens and let the app fall back to the sign-in flow. */
export const notifySessionExpired = async (): Promise<void> => {
  await clearTokens();
  sessionExpiredHandler?.();
};
