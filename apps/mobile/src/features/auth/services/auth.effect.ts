import { Effect } from 'effect';

import type { AuthUser, TokenPair } from '@movea/api-contract';

// Constants
import { ERROR_MESSAGES } from '@/constants';

// HTTP
import { apiRequest } from '@/services/api/client';

// Types
import {
  AuthSession,
  SignInData,
  SignUpData,
} from '@/features/auth/types/auth';
import { AuthenticationError } from '../error/auth';

// Token persistence
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from './token-storage';

const messageOf = (
  error: unknown,
  fallback: string = ERROR_MESSAGES.UNKNOWN_ERROR,
): string =>
  error instanceof Error && error.message ? error.message : fallback;

const toSession = (user: AuthUser, accessToken: string): AuthSession => ({
  user,
  accessToken,
});

export class AuthServiceEffect {
  private static instance: AuthServiceEffect;

  private constructor() {}

  static getInstance(): AuthServiceEffect {
    if (!AuthServiceEffect.instance) {
      AuthServiceEffect.instance = new AuthServiceEffect();
    }
    return AuthServiceEffect.instance;
  }

  /** `GET /auth/me` with an explicit token, so it works right after login. */
  private me(accessToken: string) {
    return Effect.tryPromise({
      try: () => apiRequest<AuthUser>('/auth/me', { auth: true, accessToken }),
      catch: error => AuthenticationError.sessionFailed(messageOf(error)),
    });
  }

  signUp({ email, password, firstName, lastName }: SignUpData) {
    const self = this;

    return Effect.gen(function* () {
      const tokens = yield* Effect.tryPromise({
        try: () =>
          apiRequest<TokenPair>('/auth/register', {
            method: 'POST',
            body: { email, password, firstName, lastName },
          }),
        catch: error => AuthenticationError.signUpFailed(messageOf(error)),
      });

      yield* Effect.promise(() => saveTokens(tokens));
      const user = yield* self.me(tokens.accessToken);

      return { user, session: toSession(user, tokens.accessToken) };
    });
  }

  signIn({ email, password }: SignInData) {
    const self = this;

    return Effect.gen(function* () {
      const tokens = yield* Effect.tryPromise({
        try: () =>
          apiRequest<TokenPair>('/auth/login', {
            method: 'POST',
            body: { email, password },
          }),
        catch: error => AuthenticationError.loginFailed(messageOf(error)),
      });

      yield* Effect.promise(() => saveTokens(tokens));
      const user = yield* self.me(tokens.accessToken);

      return { user, session: toSession(user, tokens.accessToken) };
    });
  }

  signOut() {
    return Effect.gen(function* () {
      const refreshToken = yield* Effect.promise(() => getRefreshToken());

      if (refreshToken) {
        // Best effort — a failed revoke must not block the local sign-out.
        yield* Effect.ignore(
          Effect.tryPromise({
            try: () =>
              apiRequest<void>('/auth/logout', {
                method: 'POST',
                body: { refreshToken },
              }),
            catch: error => AuthenticationError.signOutFailed(messageOf(error)),
          }),
        );
      }

      yield* Effect.promise(() => clearTokens());
    });
  }

  /**
   * Restore the session from storage. Missing tokens → `null`. A rejected access
   * token is refreshed once; if that fails the stale tokens are cleared and the
   * caller is treated as signed out.
   */
  getSession() {
    const self = this;

    return Effect.gen(function* () {
      const [accessToken, refreshToken] = yield* Effect.promise(() =>
        Promise.all([getAccessToken(), getRefreshToken()]),
      );

      if (!accessToken || !refreshToken) {
        return null;
      }

      const current = yield* Effect.either(self.me(accessToken));
      if (current._tag === 'Right') {
        return toSession(current.right, accessToken);
      }

      const refreshed = yield* Effect.either(self.refreshSession());
      if (refreshed._tag === 'Right') {
        return refreshed.right;
      }

      yield* Effect.promise(() => clearTokens());
      return null;
    });
  }

  refreshSession() {
    const self = this;

    return Effect.gen(function* () {
      const refreshToken = yield* Effect.promise(() => getRefreshToken());

      if (!refreshToken) {
        return yield* Effect.fail(
          AuthenticationError.sessionFailed(ERROR_MESSAGES.UNKNOWN_ERROR),
        );
      }

      const tokens = yield* Effect.tryPromise({
        try: () =>
          apiRequest<TokenPair>('/auth/refresh', {
            method: 'POST',
            body: { refreshToken },
          }),
        catch: error => AuthenticationError.sessionFailed(messageOf(error)),
      });

      yield* Effect.promise(() => saveTokens(tokens));
      const user = yield* self.me(tokens.accessToken);

      return toSession(user, tokens.accessToken);
    });
  }

  /**
   * Send a password-reset email.
   *
   * Not implemented yet — the API has no password-reset-by-email endpoint,
   * and Supabase's email-link flow is no longer wired up. Kept as a stub so
   * the "Forgot password?" screen still compiles and renders until this is
   * built against `@movea/api`.
   */
  resetPassword(_email: string) {
    return Effect.fail(
      AuthenticationError.updatePasswordFailed(
        'Password reset by email is not available yet.',
      ),
    );
  }
}

export const authServiceEffect = AuthServiceEffect.getInstance();
