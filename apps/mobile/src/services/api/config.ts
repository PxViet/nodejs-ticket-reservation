/**
 * Base URL for `@movea/api`. Lives in its own module so both the HTTP client
 * and the refresh helper can read it without importing each other.
 *
 * `EXPO_PUBLIC_API_BASE_URL` is just the host — the `api/v1` prefix and version
 * are fixed by ADR-012, not per-environment config.
 */
// Strip surrounding whitespace and slashes so a host written as `https://x/` or a
// prefix written as `/api` cannot produce `//api/v1`, which the API 404s.
const trimSlashes = (value: string): string =>
  value.trim().replace(/^\/+|\/+$/g, '');

const API_HOST = (
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000'
)
  .trim()
  .replace(/\/+$/, '');
const API_PREFIX = trimSlashes(process.env.EXPO_PUBLIC_API_PREFIX || 'api');
const API_VERSION = trimSlashes(process.env.EXPO_PUBLIC_API_VERSION || 'v1');

export const API_BASE_URL = `${API_HOST}/${API_PREFIX}/${API_VERSION}`;
