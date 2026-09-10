import { AuthenticationError } from '@/features/auth/error/auth';
import { apiRequest } from '@/services/api/client';
import { Cause, Chunk, Effect, Exit } from 'effect';
import { authServiceEffect } from '../auth.effect';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from '../token-storage';

// The @movea/api HTTP client
jest.mock('@/services/api/client', () => ({
  apiRequest: jest.fn(),
}));

// Token persistence
jest.mock('../token-storage', () => ({
  saveTokens: jest.fn().mockResolvedValue(undefined),
  clearTokens: jest.fn().mockResolvedValue(undefined),
  getAccessToken: jest.fn(),
  getRefreshToken: jest.fn(),
}));

const mockApiRequest = apiRequest as jest.Mock;
const mockSaveTokens = saveTokens as jest.Mock;
const mockClearTokens = clearTokens as jest.Mock;
const mockGetAccessToken = getAccessToken as jest.Mock;
const mockGetRefreshToken = getRefreshToken as jest.Mock;

const TOKENS = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  expiresIn: 900,
};
const USER = { id: 'u-1', email: 'test@example.com', role: 'user' as const };

const expectEffectFailure = async <A, E>(
  effect: Effect.Effect<A, E>,
  assertion: (error: E) => void,
) => {
  const exit = await Effect.runPromiseExit(effect);

  Exit.match(exit, {
    onFailure: cause => {
      const failures = Cause.failures(cause);
      assertion(Chunk.unsafeGet(failures, 0));
    },
    onSuccess: () => fail('Expected effect to fail'),
  });
};

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveTokens.mockResolvedValue(undefined);
    mockClearTokens.mockResolvedValue(undefined);
  });

  it('is a singleton', () => {
    expect(authServiceEffect).toBe(authServiceEffect);
  });

  describe('signUp', () => {
    const data = {
      email: 'test@example.com',
      password: 'password',
      firstName: 'Test',
      lastName: 'User',
    };

    it('registers, persists the tokens and returns the user + session', async () => {
      mockApiRequest
        .mockResolvedValueOnce(TOKENS) // POST /auth/register
        .mockResolvedValueOnce(USER); // GET /auth/me

      const result = await Effect.runPromise(authServiceEffect.signUp(data));

      expect(mockApiRequest).toHaveBeenNthCalledWith(1, '/auth/register', {
        method: 'POST',
        body: {
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
        },
      });
      expect(mockSaveTokens).toHaveBeenCalledWith(TOKENS);
      expect(mockApiRequest).toHaveBeenNthCalledWith(2, '/auth/me', {
        auth: true,
        accessToken: TOKENS.accessToken,
      });
      expect(result).toEqual({
        user: USER,
        session: { user: USER, accessToken: TOKENS.accessToken },
      });
    });

    it('fails with AuthenticationError when register is rejected', async () => {
      mockApiRequest.mockRejectedValueOnce(
        new Error('Email already registered'),
      );

      await expectEffectFailure(authServiceEffect.signUp(data), err => {
        expect(err).toBeInstanceOf(AuthenticationError);
        expect((err as AuthenticationError).message).toBe(
          'Email already registered',
        );
      });
      expect(mockSaveTokens).not.toHaveBeenCalled();
    });
  });

  describe('signIn', () => {
    const data = { email: 'test@example.com', password: 'password' };

    it('logs in, persists the tokens and returns the user + session', async () => {
      mockApiRequest.mockResolvedValueOnce(TOKENS).mockResolvedValueOnce(USER);

      const result = await Effect.runPromise(authServiceEffect.signIn(data));

      expect(mockApiRequest).toHaveBeenNthCalledWith(1, '/auth/login', {
        method: 'POST',
        body: data,
      });
      expect(mockSaveTokens).toHaveBeenCalledWith(TOKENS);
      expect(result).toEqual({
        user: USER,
        session: { user: USER, accessToken: TOKENS.accessToken },
      });
    });

    it('fails with AuthenticationError on bad credentials', async () => {
      mockApiRequest.mockRejectedValueOnce(
        new Error('Invalid email or password'),
      );

      await expectEffectFailure(authServiceEffect.signIn(data), err => {
        expect(err).toBeInstanceOf(AuthenticationError);
        expect((err as AuthenticationError).message).toBe(
          'Invalid email or password',
        );
      });
    });
  });

  describe('signOut', () => {
    it('revokes the stored refresh token and clears storage', async () => {
      mockGetRefreshToken.mockResolvedValue('refresh-1');
      mockApiRequest.mockResolvedValueOnce(undefined);

      await Effect.runPromise(authServiceEffect.signOut());

      expect(mockApiRequest).toHaveBeenCalledWith('/auth/logout', {
        method: 'POST',
        body: { refreshToken: 'refresh-1' },
      });
      expect(mockClearTokens).toHaveBeenCalled();
    });

    it('still clears storage when there is no refresh token', async () => {
      mockGetRefreshToken.mockResolvedValue(null);

      await Effect.runPromise(authServiceEffect.signOut());

      expect(mockApiRequest).not.toHaveBeenCalled();
      expect(mockClearTokens).toHaveBeenCalled();
    });

    it('still clears storage when the revoke call fails', async () => {
      mockGetRefreshToken.mockResolvedValue('refresh-1');
      mockApiRequest.mockRejectedValueOnce(new Error('network'));

      await Effect.runPromise(authServiceEffect.signOut());

      expect(mockClearTokens).toHaveBeenCalled();
    });
  });

  describe('getSession', () => {
    it('returns null when there are no stored tokens', async () => {
      mockGetAccessToken.mockResolvedValue(null);
      mockGetRefreshToken.mockResolvedValue(null);

      const result = await Effect.runPromise(authServiceEffect.getSession());

      expect(result).toBeNull();
      expect(mockApiRequest).not.toHaveBeenCalled();
    });

    it('hydrates the session from a valid access token', async () => {
      mockGetAccessToken.mockResolvedValue('access-1');
      mockGetRefreshToken.mockResolvedValue('refresh-1');
      mockApiRequest.mockResolvedValueOnce(USER);

      const result = await Effect.runPromise(authServiceEffect.getSession());

      expect(mockApiRequest).toHaveBeenCalledWith('/auth/me', {
        auth: true,
        accessToken: 'access-1',
      });
      expect(result).toEqual({ user: USER, accessToken: 'access-1' });
    });

    it('refreshes once when the access token is rejected', async () => {
      mockGetAccessToken.mockResolvedValue('stale');
      mockGetRefreshToken.mockResolvedValue('refresh-1');
      mockApiRequest
        .mockRejectedValueOnce(new Error('401')) // GET /auth/me with stale token
        .mockResolvedValueOnce(TOKENS) // POST /auth/refresh
        .mockResolvedValueOnce(USER); // GET /auth/me with new token

      const result = await Effect.runPromise(authServiceEffect.getSession());

      expect(mockApiRequest).toHaveBeenNthCalledWith(2, '/auth/refresh', {
        method: 'POST',
        body: { refreshToken: 'refresh-1' },
      });
      expect(mockSaveTokens).toHaveBeenCalledWith(TOKENS);
      expect(result).toEqual({ user: USER, accessToken: TOKENS.accessToken });
    });

    it('clears storage and returns null when the refresh also fails', async () => {
      mockGetAccessToken.mockResolvedValue('stale');
      mockGetRefreshToken.mockResolvedValue('refresh-1');
      mockApiRequest
        .mockRejectedValueOnce(new Error('401'))
        .mockRejectedValueOnce(new Error('refresh invalid'));

      const result = await Effect.runPromise(authServiceEffect.getSession());

      expect(result).toBeNull();
      expect(mockClearTokens).toHaveBeenCalled();
    });
  });

  describe('refreshSession', () => {
    it('rotates the token pair and returns the session', async () => {
      mockGetRefreshToken.mockResolvedValue('refresh-1');
      mockApiRequest.mockResolvedValueOnce(TOKENS).mockResolvedValueOnce(USER);

      const result = await Effect.runPromise(
        authServiceEffect.refreshSession(),
      );

      expect(mockApiRequest).toHaveBeenNthCalledWith(1, '/auth/refresh', {
        method: 'POST',
        body: { refreshToken: 'refresh-1' },
      });
      expect(mockSaveTokens).toHaveBeenCalledWith(TOKENS);
      expect(result).toEqual({ user: USER, accessToken: TOKENS.accessToken });
    });

    it('fails with AuthenticationError when there is no refresh token', async () => {
      mockGetRefreshToken.mockResolvedValue(null);

      await expectEffectFailure(authServiceEffect.refreshSession(), err => {
        expect(err).toBeInstanceOf(AuthenticationError);
      });
    });

    it('fails with AuthenticationError when refresh is rejected', async () => {
      mockGetRefreshToken.mockResolvedValue('refresh-1');
      mockApiRequest.mockRejectedValueOnce(
        new Error('Refresh token is invalid'),
      );

      await expectEffectFailure(authServiceEffect.refreshSession(), err => {
        expect(err).toBeInstanceOf(AuthenticationError);
        expect((err as AuthenticationError).message).toBe(
          'Refresh token is invalid',
        );
      });
    });
  });

  // Not implemented yet — no password-reset-by-email endpoint exists.
  describe('resetPassword', () => {
    it('fails with a not-available AuthenticationError', async () => {
      await expectEffectFailure(
        authServiceEffect.resetPassword('a@b.com'),
        err => {
          expect(err).toBeInstanceOf(AuthenticationError);
          expect((err as AuthenticationError).message).toBe(
            'Password reset by email is not available yet.',
          );
        },
      );
    });
  });
});
