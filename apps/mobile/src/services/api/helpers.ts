/**
 * Small helpers shared by the Effect services that call `apiRequest`.
 *
 * They live beside the client rather than inside it so a service test can keep
 * mocking `@/services/api/client` wholesale without losing them.
 */
import { ApiError } from '@/services/api/client';

/** The message of an unknown thrown value, for a tagged error's payload. */
export const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : '';

/** The API's stable `errorCode` when the failure came from `apiRequest`. */
export const codeOf = (error: unknown): string | undefined =>
  ApiError && error instanceof ApiError ? error.errorCode : undefined;

/** Build a query string, dropping params that are undefined or empty. */
export const toQuery = (
  params: Record<string, string | number | undefined>,
): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.append(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};
