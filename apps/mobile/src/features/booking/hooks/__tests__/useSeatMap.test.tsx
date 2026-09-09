import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { Effect } from 'effect';
import React from 'react';

// Hooks
import {
  useHoldSeats,
  useMyActiveHolds,
  useReleaseHold,
  useSeatMap,
} from '../useSeatMap';

// Services
import { showtimesServiceEffect } from '../../services/showtimes';

// Types
import { ShowtimeError } from '../../error/showtime';
import { ActiveSeatHold, SeatHold, ShowtimeSeat } from '../../schemas/showtime';

jest.mock('@/features/booking/services/showtimes', () => ({
  showtimesServiceEffect: {
    getSeatMap: jest.fn(),
    holdSeats: jest.fn(),
    getMyActiveHolds: jest.fn(),
    releaseHold: jest.fn(),
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

describe('useMyActiveHolds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches the active holds when enabled', async () => {
    const holds: ActiveSeatHold[] = [
      {
        id: 'hold1',
        seatId: 'seat1',
        seatLabel: 'A1',
        showtimeId: 'show1',
        status: 'held',
        heldUntil: '2026-09-08T00:10:00.000Z',
        price: 75000,
      },
    ];
    (showtimesServiceEffect.getMyActiveHolds as jest.Mock).mockReturnValue(
      Effect.succeed(holds),
    );

    const { result } = renderHook(() => useMyActiveHolds('show1', true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(showtimesServiceEffect.getMyActiveHolds).toHaveBeenCalledWith(
      'show1',
    );
    expect(result.current.data).toEqual(holds);
  });

  it('does not fetch when disabled', () => {
    renderHook(() => useMyActiveHolds('show1', false), {
      wrapper: createWrapper(),
    });

    expect(showtimesServiceEffect.getMyActiveHolds).not.toHaveBeenCalled();
  });
});

describe('useReleaseHold', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('releases the hold and resolves with its id', async () => {
    (showtimesServiceEffect.releaseHold as jest.Mock).mockReturnValue(
      Effect.succeed(undefined),
    );

    const { result } = renderHook(() => useReleaseHold(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('hold1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(showtimesServiceEffect.releaseHold).toHaveBeenCalledWith('hold1');
    expect(result.current.data).toBe('hold1');
  });

  it('exposes the errorCode when release is refused', async () => {
    (showtimesServiceEffect.releaseHold as jest.Mock).mockReturnValue(
      Effect.fail(
        ShowtimeError.releaseFailed('not yours', 'SEAT_HOLD_NOT_OWNED'),
      ),
    );

    const { result } = renderHook(() => useReleaseHold(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('hold1');

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.errorCode).toBe('SEAT_HOLD_NOT_OWNED');
  });
});
