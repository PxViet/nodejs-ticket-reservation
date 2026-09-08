import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { Effect } from 'effect';
import React from 'react';

// Hooks
import { useHoldSeats, useSeatMap } from '../useSeatMap';

// Services
import { showtimesServiceEffect } from '../../services/showtimes';

// Types
import { ShowtimeError } from '../../error/showtime';
import { SeatHold, ShowtimeSeat } from '../../schemas/showtime';

jest.mock('@/features/booking/services/showtimes', () => ({
  showtimesServiceEffect: {
    getSeatMap: jest.fn(),
    holdSeats: jest.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientWrapper';

  return Wrapper;
};

const SEATS: ShowtimeSeat[] = [
  {
    seatId: 'seat1',
    seatRow: 'A',
    seatColumn: 1,
    seatLabel: 'A1',
    status: 'available',
  },
];

describe('useSeatMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches the seat map when a showtimeId is given', async () => {
    (showtimesServiceEffect.getSeatMap as jest.Mock).mockReturnValue(
      Effect.succeed(SEATS),
    );

    const { result } = renderHook(() => useSeatMap('show1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(showtimesServiceEffect.getSeatMap).toHaveBeenCalledWith('show1');
    expect(result.current.data).toEqual(SEATS);
  });

  it('does not fetch when the showtimeId is empty', () => {
    renderHook(() => useSeatMap(''), { wrapper: createWrapper() });

    expect(showtimesServiceEffect.getSeatMap).not.toHaveBeenCalled();
  });

  it('surfaces a ShowtimeError when the map fails', async () => {
    (showtimesServiceEffect.getSeatMap as jest.Mock).mockReturnValue(
      Effect.fail(ShowtimeError.seatMapUnavailable('down')),
    );

    const { result } = renderHook(() => useSeatMap('show1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(ShowtimeError);
  });
});

describe('useHoldSeats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('holds the given seats and returns the holds', async () => {
    const holds: SeatHold[] = [
      {
        id: 'hold1',
        seatId: 'seat1',
        seatLabel: 'A1',
        showtimeId: 'show1',
        status: 'held',
        heldUntil: '2026-09-08T00:10:00.000Z',
      },
    ];
    (showtimesServiceEffect.holdSeats as jest.Mock).mockReturnValue(
      Effect.succeed(holds),
    );

    const { result } = renderHook(() => useHoldSeats(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ showtimeId: 'show1', seatIds: ['seat1'] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(showtimesServiceEffect.holdSeats).toHaveBeenCalledWith('show1', [
      'seat1',
    ]);
    expect(result.current.data).toEqual(holds);
  });

  it('exposes the errorCode when a hold loses the race', async () => {
    (showtimesServiceEffect.holdSeats as jest.Mock).mockReturnValue(
      Effect.fail(ShowtimeError.holdFailed('taken', 'SEAT_UNAVAILABLE')),
    );

    const { result } = renderHook(() => useHoldSeats(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ showtimeId: 'show1', seatIds: ['seat1'] });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.errorCode).toBe('SEAT_UNAVAILABLE');
  });
});
