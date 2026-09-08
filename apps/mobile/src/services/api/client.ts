import { STORAGE_KEYS } from '@/constants';
import { API_BASE_URL } from '@/services/api/config';
import {
  notifySessionExpired,
  refreshAccessToken,
} from '@/services/api/session';
import { secureStorage } from '@/services/storage/secure';

/**
 * Minimal HTTP client for `@movea/api`. Every response is JSON; every error is
 * the one envelope the API's global filter produces (DDR-006):
 * `{ statusCode, errorCode, message, timestamp }`.
 *
 * A `401` on an authenticated request rotates the token pair once and replays
 * the request (see `doRequest`); if the rotation fails the session is torn down.
 */
export { API_BASE_URL } from '@/services/api/config';

interface ApiErrorBody {
  statusCode: number;
  errorCode: string;
  message: string | string[];
  timestamp: string;
}

/** A non-2xx response from the API, carrying its stable `errorCode`. */
export class ApiError extends Error {
  readonly status: number;
  readonly errorCode: string;

  constructor(status: number, errorCode: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Attach `Authorization: Bearer <access token>`. */
  auth?: boolean;
  /**
   * Access token to send instead of the stored one — avoids a read-after-write
   * race in the moment between logging in and persisting the token.
   */
  accessToken?: string;
}

const flattenMessage = (message: string | string[]): string =>
  Array.isArray(message) ? message.join(', ') : message;

const parseJson = (text: string): unknown => {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

export const apiRequest = <T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> => doRequest<T>(path, options, true);

const doRequest = async <T>(
  path: string,
  { method = 'GET', body, auth = false, accessToken }: RequestOptions,
  allowRetry: boolean,
): Promise<T> => {
  const headers: Record<string, string> = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token =
      accessToken ?? (await secureStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN));
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // Access token expired: rotate the pair once and replay with the new token.
  // A failed rotation means the refresh token is spent too — tear the session
  // down and let the original 401 surface below.
  if (response.status === 401 && auth && allowRetry) {
    let newAccessToken: string | null = null;

    try {
      newAccessToken = await refreshAccessToken();
    } catch {
      await notifySessionExpired();
    }

    if (newAccessToken) {
      return doRequest<T>(
        path,
        { method, body, auth, accessToken: newAccessToken },
        false,
      );
    }
  }

  const payload = parseJson(await response.text());

  if (!response.ok) {
    const error = payload as ApiErrorBody | undefined;
    throw new ApiError(
      response.status,
      error?.errorCode ?? 'UNKNOWN',
      error
        ? flattenMessage(error.message)
        : `Request failed with status ${response.status}`,
    );
  }

  return payload as T;
};
