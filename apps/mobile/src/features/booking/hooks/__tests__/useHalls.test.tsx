import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { Effect } from 'effect';
import React from 'react';

// Hooks
import { useHalls } from '../useHalls';

// Services
import { showtimesServiceEffect } from '../../services/showtimes';

// Types
import { ShowtimeError } from '../../error/showtime';
import { Hall } from '../../schemas/showtime';

jest.mock('@/features/booking/services/showtimes', () => ({
  showtimesServiceEffect: {
    getHalls: jest.fn(),
  },
}));

// Helper to create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
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

const MOCK_HALLS: Hall[] = [
  { id: 'hall1', name: 'Hall 1', hallType: 'IMAX', totalSeats: 100 },
  { id: 'hall2', name: 'Hall 2', hallType: '3D', totalSeats: 80 },
];

describe('useHalls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch the hall list', async () => {
    (showtimesServiceEffect.getHalls as jest.Mock).mockReturnValue(
      Effect.succeed(MOCK_HALLS),
    );

    const { result } = renderHook(() => useHalls(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(showtimesServiceEffect.getHalls).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(MOCK_HALLS);
  });

  it('should handle error when fetch fails', async () => {
    (showtimesServiceEffect.getHalls as jest.Mock).mockReturnValue(
      Effect.fail(ShowtimeError.hallsUnavailable('Failed to fetch halls')),
    );

    const { result } = renderHook(() => useHalls(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(ShowtimeError);
    expect((result.current.error as ShowtimeError).message).toBe(
      'Failed to fetch halls',
    );
  });
});
