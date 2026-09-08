import {
  notifySessionExpired,
  refreshAccessToken,
} from '@/services/api/session';
import { secureStorage } from '@/services/storage/secure';
import { ApiError, apiRequest } from '../client';

jest.mock('@/services/api/session', () => ({
  refreshAccessToken: jest.fn(),
  notifySessionExpired: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/services/storage/secure', () => ({
  secureStorage: { getItem: jest.fn() },
}));

const mockRefreshAccessToken = refreshAccessToken as jest.Mock;
const mockNotifySessionExpired = notifySessionExpired as jest.Mock;
const mockGetItem = secureStorage.getItem as jest.Mock;

const response = (
  body: unknown,
  { ok = true, status = 200 }: { ok?: boolean; status?: number } = {},
) => ({
  ok,
  status,
  text: async () => (body === undefined ? '' : JSON.stringify(body)),
});

const unauthorizedBody = {
  statusCode: 401,
  errorCode: 'UNAUTHENTICATED',
  message: 'expired',
};

describe('apiRequest', () => {
  const originalFetch = global.fetch;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNotifySessionExpired.mockResolvedValue(undefined);
    mockFetch = jest.fn();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('returns the parsed body on success', async () => {
    mockFetch.mockResolvedValue(response({ id: 'm-1' }));

    await expect(apiRequest('/movies/m-1')).resolves.toEqual({ id: 'm-1' });
    expect(mockRefreshAccessToken).not.toHaveBeenCalled();
  });

  it('throws an ApiError on a non-401 failure without refreshing', async () => {
    mockFetch.mockResolvedValue(
      response(
        { statusCode: 404, errorCode: 'MOVIE_NOT_FOUND', message: 'nope' },
        { ok: false, status: 404 },
      ),
    );

    const error = await apiRequest('/movies/x').catch(caught => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, errorCode: 'MOVIE_NOT_FOUND' });
    expect(mockRefreshAccessToken).not.toHaveBeenCalled();
  });

  it('rotates the token and replays the request on a 401', async () => {
    mockGetItem.mockResolvedValue('stale-access');
    mockFetch
      .mockResolvedValueOnce(
        response(unauthorizedBody, { ok: false, status: 401 }),
      )
      .mockResolvedValueOnce(response({ id: 'u-1' }));
    mockRefreshAccessToken.mockResolvedValue('fresh-access');

    const result = await apiRequest('/users/me', { auth: true });

    expect(result).toEqual({ id: 'u-1' });
    expect(mockRefreshAccessToken).toHaveBeenCalledTimes(1);

    const replayInit = mockFetch.mock.calls[1][1] as {
      headers: Record<string, string>;
    };
    expect(replayInit.headers.Authorization).toBe('Bearer fresh-access');
    expect(mockNotifySessionExpired).not.toHaveBeenCalled();
  });

  it('tears the session down and throws when the rotation fails', async () => {
    mockGetItem.mockResolvedValue('stale-access');
    mockFetch.mockResolvedValue(
      response(unauthorizedBody, { ok: false, status: 401 }),
    );
    mockRefreshAccessToken.mockRejectedValue(new Error('refresh invalid'));

    await expect(apiRequest('/users/me', { auth: true })).rejects.toMatchObject(
      {
        status: 401,
      },
    );
    expect(mockNotifySessionExpired).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('does not refresh a 401 from an unauthenticated request', async () => {
    mockFetch.mockResolvedValue(
      response(
        {
          statusCode: 401,
          errorCode: 'INVALID_CREDENTIALS',
          message: 'bad creds',
        },
        { ok: false, status: 401 },
      ),
    );

    await expect(
      apiRequest('/auth/login', {
        method: 'POST',
        body: { email: 'a@b.com', password: 'x' },
      }),
    ).rejects.toMatchObject({ errorCode: 'INVALID_CREDENTIALS' });
    expect(mockRefreshAccessToken).not.toHaveBeenCalled();
  });
});
