/**
 * Base URL for `@movea/api`. Lives in its own module so both the HTTP client
 * and the refresh helper can read it without importing each other.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
