import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { Effect } from 'effect';
import React from 'react';

// Hooks
import {
  useCancelReservation,
  useConfirmReservation,
  useReservation,
  useReservationsInfinite,
} from '../useReservations';

// Services
import {
  reservationsServiceEffect,
  ReservationDetail,
  ReservationPage,
} from '../../services/reservations';

// Types
import { ReservationError } from '../../error/reservation';
import { Reservation } from '../../schemas/reservation';

jest.mock('@/features/booking/services/reservations', () => ({
  reservationsServiceEffect: {
    confirmReservation: jest.fn(),
    getMinePaginated: jest.fn(),
    getById: jest.fn(),
    cancel: jest.fn(),
  },
}));

const mockUser = { id: 'user1', email: 'test@example.com' };

jest.mock('@/features/auth/store/auth', () => ({
  useAuthStore: (selector: any) => selector({ user: mockUser }),
}));

const mockResetBooking = jest.fn();

jest.mock('@/features/booking/store/booking', () => ({
  useBookingStore: (selector: any) => selector({ reset: mockResetBooking }),
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

const RESERVATION: Reservation = {
  id: 'res1',
  reservationNumber: 'RSV-001',
  userId: 'user1',
  showtimeId: 'show1',
  status: 'confirmed',
  totalSeats: 1,
  totalAmount: 75000,
  createdAt: '2026-01-01T00:00:00.000Z',
  tickets: [
    {
      id: 'ticket1',
      seatId: 'seat1',
      seatLabel: 'A1',
      ticketNumber: 'TKT-001',
      price: 75000,
      status: 'valid',
    },
  ],
};

describe('useReservationsInfinite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches the first page for the current user', async () => {
    const resultPage: ReservationPage = {
      data: [
        {
          id: 'res1',
          reservationNumber: 'RSV-001',
          showtimeId: 'show1',
          status: 'confirmed',
          totalSeats: 1,
          totalAmount: 75000,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      page: 1,
      hasMore: false,
    };
    (reservationsServiceEffect.getMinePaginated as jest.Mock).mockReturnValue(
      Effect.succeed(resultPage),
    );

    const { result } = renderHook(() => useReservationsInfinite(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(reservationsServiceEffect.getMinePaginated).toHaveBeenCalledWith(
      1,
      undefined,
    );
    expect(result.current.data?.pages).toEqual([resultPage]);
  });

  it('surfaces a ReservationError when the list fails', async () => {
    (reservationsServiceEffect.getMinePaginated as jest.Mock).mockReturnValue(
      Effect.fail(ReservationError.reservationsUnavailable('offline')),
    );

    const { result } = renderHook(() => useReservationsInfinite(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(ReservationError);
  });
});

describe('useReservation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches one reservation by id', async () => {
    const detail: ReservationDetail = { ...RESERVATION };
    (reservationsServiceEffect.getById as jest.Mock).mockReturnValue(
      Effect.succeed(detail),
    );

    const { result } = renderHook(() => useReservation('res1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(reservationsServiceEffect.getById).toHaveBeenCalledWith('res1');
    expect(result.current.data).toEqual(detail);
  });

  it('does not fetch when the id is empty', () => {
    renderHook(() => useReservation(''), { wrapper: createWrapper() });

    expect(reservationsServiceEffect.getById).not.toHaveBeenCalled();
  });
});

describe('useConfirmReservation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('confirms the given hold ids and resets the booking store', async () => {
    (reservationsServiceEffect.confirmReservation as jest.Mock).mockReturnValue(
      Effect.succeed(RESERVATION),
    );

    const { result } = renderHook(() => useConfirmReservation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(['hold1']);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(reservationsServiceEffect.confirmReservation).toHaveBeenCalledWith([
      'hold1',
    ]);
    expect(mockResetBooking).toHaveBeenCalled();
  });

  it('exposes the errorCode when a hold has expired', async () => {
    (reservationsServiceEffect.confirmReservation as jest.Mock).mockReturnValue(
      Effect.fail(ReservationError.confirmFailed('expired', 'HOLD_EXPIRED')),
    );

    const { result } = renderHook(() => useConfirmReservation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(['hold1']);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.errorCode).toBe('HOLD_EXPIRED');
    expect(mockResetBooking).not.toHaveBeenCalled();
  });
});

describe('useCancelReservation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cancels the reservation by id', async () => {
    (reservationsServiceEffect.cancel as jest.Mock).mockReturnValue(
      Effect.succeed({ ...RESERVATION, status: 'cancelled' }),
    );

    const { result } = renderHook(() => useCancelReservation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('res1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(reservationsServiceEffect.cancel).toHaveBeenCalledWith('res1');
  });
});
