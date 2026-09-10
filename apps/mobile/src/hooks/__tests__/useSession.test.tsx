import { authServiceEffect } from '@/features/auth/services/auth.effect';
import { profileService } from '@/features/setting/services/profile';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { Effect } from 'effect';
import React from 'react';
import {
  useRefreshSession,
  useResetPassword,
  useSession,
  useUpdatePassword,
} from '../useSession';

jest.mock('@/features/auth/services/auth.effect', () => ({
  authServiceEffect: {
    getSession: jest.fn(),
    refreshSession: jest.fn(),
    resetPassword: jest.fn(),
  },
}));

jest.mock('@/features/setting/services/profile', () => ({
  profileService: {
    changePassword: jest.fn(),
  },
}));

jest.mock('@/constants', () => ({
  API_CONFIG: {
    QUERY_STALE_TIME: 5 * 60 * 1000,
  },
}));

// Helper to create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientWrapper';

  return Wrapper;
};

describe('useSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call authService.getSession', async () => {
    const mockSession = { user: { id: '1' }, access_token: 'token' };
    (authServiceEffect.getSession as jest.Mock).mockReturnValue(
      Effect.succeed(mockSession),
    );

    const { result } = renderHook(() => useSession(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(authServiceEffect.getSession).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockSession);
  });

  it('should handle error when getSession fails', async () => {
    const mockError = new Error('Session error');
    (authServiceEffect.getSession as jest.Mock).mockReturnValue(
      Effect.fail(mockError),
    );

    const { result } = renderHook(() => useSession(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(mockError);
  });
});

describe('useRefreshSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call authService.refreshSession', async () => {
    const mockSession = { user: { id: '1' }, access_token: 'new-token' };
    (authServiceEffect.refreshSession as jest.Mock).mockReturnValue(
      Effect.succeed(mockSession),
    );

    const { result } = renderHook(() => useRefreshSession(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(authServiceEffect.refreshSession).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockSession);
  });

  it('should handle error when refreshSession fails', async () => {
    const mockError = new Error('Refresh error');
    (authServiceEffect.refreshSession as jest.Mock).mockReturnValue(
      Effect.fail(mockError),
    );

    const { result } = renderHook(() => useRefreshSession(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(mockError);
  });
});

describe('useResetPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is not implemented yet — surfaces the stub error', async () => {
    const mockError = new Error(
      'Password reset by email is not available yet.',
    );
    (authServiceEffect.resetPassword as jest.Mock).mockReturnValue(
      Effect.fail(mockError),
    );

    const { result } = renderHook(() => useResetPassword(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('test@example.com');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(authServiceEffect.resetPassword).toHaveBeenCalledWith(
      'test@example.com',
    );
    expect(result.current.error).toEqual(mockError);
  });
});

describe('useUpdatePassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('changes the password in one call via PATCH /users/me/password', async () => {
    (profileService.changePassword as jest.Mock).mockReturnValue(
      Effect.succeed(undefined),
    );

    const { result } = renderHook(() => useUpdatePassword(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      currentPassword: 'oldPassword',
      newPassword: 'newPassword',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(profileService.changePassword).toHaveBeenCalledWith({
      currentPassword: 'oldPassword',
      newPassword: 'newPassword',
    });
    expect(result.current.data).toEqual({ success: true });
  });

  it('handles a rejected current password', async () => {
    const mockError = new Error('Current password is incorrect');
    (profileService.changePassword as jest.Mock).mockReturnValue(
      Effect.fail(mockError),
    );

    const { result } = renderHook(() => useUpdatePassword(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      currentPassword: 'wrongPassword',
      newPassword: 'newPassword',
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(mockError);
  });
});
