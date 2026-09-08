import type { TokenPair } from '@movea/api-contract';

import {
  clearTokens,
  getRefreshToken,
  saveTokens,
} from '@/features/auth/services/token-storage';
import {
  notifySessionExpired,
  refreshAccessToken,
  registerSessionExpiredHandler,
} from '../session';

jest.mock('@/features/auth/services/token-storage', () => ({
  getRefreshToken: jest.fn(),
  saveTokens: jest.fn().mockResolvedValue(undefined),
  clearTokens: jest.fn().mockResolvedValue(undefined),
}));

const mockGetRefreshToken = getRefreshToken as jest.Mock;
const mockSaveTokens = saveTokens as jest.Mock;
const mockClearTokens = clearTokens as jest.Mock;

const PAIR: TokenPair = {
  accessToken: 'access-2',
  refreshToken: 'refresh-2',
  expiresIn: 900,
};

const okJson = (body: unknown) => ({ ok: true, json: async () => body });

describe('api/session', () => {
  const originalFetch = global.fetch;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveTokens.mockResolvedValue(undefined);
    mockClearTokens.mockResolvedValue(undefined);
    mockFetch = jest.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('refreshAccessToken', () => {
    it('rotates the stored pair, persists it and returns the new access token', async () => {
      mockGetRefreshToken.mockResolvedValue('refresh-1');
      mockFetch.mockResolvedValue(okJson(PAIR));

      const token = await refreshAccessToken();

      expect(token).toBe(PAIR.accessToken);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/auth/refresh',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ refreshToken: 'refresh-1' }),
        }),
      );
      expect(mockSaveTokens).toHaveBeenCalledWith(PAIR);
    });

    it('throws when there is no stored refresh token', async () => {
      mockGetRefreshToken.mockResolvedValue(null);

      await expect(refreshAccessToken()).rejects.toThrow();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('throws when /auth/refresh responds non-2xx', async () => {
      mockGetRefreshToken.mockResolvedValue('refresh-1');
      mockFetch.mockResolvedValue({ ok: false, status: 401 });

      await expect(refreshAccessToken()).rejects.toThrow();
      expect(mockSaveTokens).not.toHaveBeenCalled();
    });

    it('shares one rotation between concurrent callers', async () => {
      mockGetRefreshToken.mockResolvedValue('refresh-1');
      let resolveFetch: (value: unknown) => void = () => {};
      mockFetch.mockReturnValue(
        new Promise(resolve => {
          resolveFetch = resolve;
        }),
      );

      const first = refreshAccessToken();
      const second = refreshAccessToken();
      resolveFetch(okJson(PAIR));

      await expect(Promise.all([first, second])).resolves.toEqual([
        PAIR.accessToken,
        PAIR.accessToken,
      ]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('starts a fresh rotation once the previous one has settled', async () => {
      mockGetRefreshToken.mockResolvedValue('refresh-1');
      mockFetch.mockResolvedValue(okJson(PAIR));

      await refreshAccessToken();
      await refreshAccessToken();

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('notifySessionExpired', () => {
    it('clears the tokens and runs the registered handler', async () => {
      const handler = jest.fn();
      registerSessionExpiredHandler(handler);

      await notifySessionExpired();

      expect(mockClearTokens).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
