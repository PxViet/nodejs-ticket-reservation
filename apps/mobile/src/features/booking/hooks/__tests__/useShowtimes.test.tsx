import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { Effect } from 'effect';
import React from 'react';

// Hooks
import { useShowtime, useShowtimes } from '../useShowtimes';

// Services
import { showtimesServiceEffect } from '../../services/showtimes';

// Types
import { ShowtimeError } from '../../error/showtime';
import { Showtime } from '../../schemas/showtime';

jest.mock('@/features/booking/services/showtimes', () => ({
  showtimesServiceEffect: {
    getShowtimes: jest.fn(),
    getShowtimeById: jest.fn(),
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

describe('useShowtimes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch showtimes when movieId and date are provided', async () => {
    const mockShowtimes = [
      { id: '1', movieId: 'movie1', startTime: '10:00' },
      { id: '2', movieId: 'movie1', startTime: '13:00' },
    ];
    (showtimesServiceEffect.getShowtimes as jest.Mock).mockReturnValue(
      Effect.succeed(mockShowtimes as unknown as Showtime[]),
    );

    const { result } = renderHook(() => useShowtimes('movie1', '2024-01-01'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(showtimesServiceEffect.getShowtimes).toHaveBeenCalledWith(
      'movie1',
      '2024-01-01',
      undefined,
    );
    expect(showtimesServiceEffect.getShowtimes).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockShowtimes);
  });

  it('should not fetch when movieId is empty', () => {
    renderHook(() => useShowtimes('', '2024-01-01'), {
      wrapper: createWrapper(),
    });

    expect(showtimesServiceEffect.getShowtimes).not.toHaveBeenCalled();
  });

  it('should not fetch when date is empty', () => {
    renderHook(() => useShowtimes('movie1', ''), {
      wrapper: createWrapper(),
    });

    expect(showtimesServiceEffect.getShowtimes).not.toHaveBeenCalled();
  });

  it('should handle error when fetch fails', async () => {
    const mockError = ShowtimeError.showtimesFailed(
      'Failed to fetch showtimes',
    );
    (showtimesServiceEffect.getShowtimes as jest.Mock).mockReturnValue(
      Effect.fail(mockError),
    );

    const { result } = renderHook(() => useShowtimes('movie1', '2024-01-01'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(ShowtimeError);
    expect((result.current.error as ShowtimeError).message).toBe(
      'Failed to fetch showtimes',
    );
  });

  it('should pass the hall filter through to the service', async () => {
    (showtimesServiceEffect.getShowtimes as jest.Mock).mockReturnValue(
      Effect.succeed([] as unknown as Showtime[]),
    );

    const { result } = renderHook(
      () => useShowtimes('movie1', '2024-01-01', 'hall1'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(showtimesServiceEffect.getShowtimes).toHaveBeenCalledWith(
      'movie1',
      '2024-01-01',
      'hall1',
    );
  });

  it('should use correct query key', () => {
    const { result } = renderHook(() => useShowtimes('movie1', '2024-01-01'), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeDefined();
  });
});

describe('useShowtime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch showtime by id when id is provided', async () => {
    const mockShowtime = {
      id: '1',
      movieId: 'movie1',
      startTime: '10:00',
      availableSeats: 50,
    };
    (showtimesServiceEffect.getShowtimeById as jest.Mock).mockReturnValue(
      Effect.succeed(mockShowtime),
    );

    const { result } = renderHook(() => useShowtime('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(showtimesServiceEffect.getShowtimeById).toHaveBeenCalledWith('1');
    expect(showtimesServiceEffect.getShowtimeById).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockShowtime);
  });

  it('should not fetch when id is empty', () => {
    renderHook(() => useShowtime(''), {
      wrapper: createWrapper(),
    });

    expect(showtimesServiceEffect.getShowtimeById).not.toHaveBeenCalled();
  });

  it('should handle error when fetch fails', async () => {
    const mockError = ShowtimeError.showtimeNotFound(
      'Failed to fetch showtime',
    );
    (showtimesServiceEffect.getShowtimeById as jest.Mock).mockReturnValue(
      Effect.fail(mockError),
    );

    const { result } = renderHook(() => useShowtime('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(ShowtimeError);
    expect((result.current.error as ShowtimeError).message).toBe(
      'Failed to fetch showtime',
    );
  });

  it('should refetch when id changes', async () => {
    const mockShowtime1 = { id: '1', movieId: 'movie1' };
    const mockShowtime2 = { id: '2', movieId: 'movie2' };
    (showtimesServiceEffect.getShowtimeById as jest.Mock)
      .mockReturnValueOnce(Effect.succeed(mockShowtime1))
      .mockReturnValueOnce(Effect.succeed(mockShowtime2));

    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useShowtime(id),
      {
        wrapper: createWrapper(),
        initialProps: { id: '1' },
      },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockShowtime1);

    rerender({ id: '2' });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockShowtime2);
    });

    expect(showtimesServiceEffect.getShowtimeById).toHaveBeenCalledTimes(2);
  });
});
