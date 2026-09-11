import { authServiceEffect } from '@/features/auth/services/auth.effect';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { Effect } from 'effect';
import React from 'react';
import { useSignIn } from '../useSignIn';

// Mock dependencies
const mockSetSession = jest.fn();

jest.mock('@/features/auth/store/auth', () => ({
  useAuthStore: (selector: any) => {
    if (selector) {
      return selector({ setSession: mockSetSession });
    }
    return { setSession: mockSetSession };
  },
}));

jest.mock('@/features/auth/services/auth.effect', () => ({
  authServiceEffect: {
    signIn: jest.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientWrapper';

  return Wrapper;
};

describe('useSignIn', () => {
  const mockSession = { user: { id: '1' }, accessToken: 'token' };
  const signInData = { email: 'test@example.com', password: 'password123' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call authServiceEffect.signIn with correct data', async () => {
    (authServiceEffect.signIn as jest.Mock).mockReturnValue(
      Effect.succeed({ session: mockSession }),
    );

    const { result } = renderHook(() => useSignIn(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(signInData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(authServiceEffect.signIn).toHaveBeenCalledWith(signInData);
    expect(authServiceEffect.signIn).toHaveBeenCalledTimes(1);
  });

  it('should call setSession on success, with no success toast', async () => {
    (authServiceEffect.signIn as jest.Mock).mockReturnValue(
      Effect.succeed({ session: mockSession }),
    );

    const { result } = renderHook(() => useSignIn(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(signInData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockSetSession).toHaveBeenCalledWith(mockSession);
  });

  it('should handle error when signIn fails', async () => {
    const mockError = new Error('Sign in failed');
    (authServiceEffect.signIn as jest.Mock).mockReturnValue(
      Effect.fail(mockError),
    );

    const { result } = renderHook(() => useSignIn(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(signInData);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(mockError);
    expect(mockSetSession).not.toHaveBeenCalled();
  });
});
