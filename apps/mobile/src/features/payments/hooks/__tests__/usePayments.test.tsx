import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Effect } from 'effect';
import React from 'react';

// Hooks
import {
  useAddCard,
  useCheckout,
  usePaymentMethods,
  usePaymentsInfinite,
} from '../usePayments';

// Constants
import { queryKeys } from '@/constants';

// Error
import { PaymentsError } from '@/features/payments/error/payments';

// Services
import { paymentsServiceEffect } from '@/features/payments/services/payments';

// Stores
import { useAuthStore } from '@/features/auth/store/auth';

jest.mock('@/features/payments/services/payments', () => ({
  paymentsServiceEffect: {
    getPaymentMethods: jest.fn(),
    getPayments: jest.fn(),
    addCard: jest.fn(),
    checkout: jest.fn(),
  },
}));

jest.mock('@/features/auth/store/auth', () => ({
  useAuthStore: jest.fn(),
}));

const mockResetBooking = jest.fn();

jest.mock('@/features/booking/store/booking', () => ({
  useBookingStore: (selector: (state: { reset: jest.Mock }) => unknown) =>
    selector({ reset: mockResetBooking }),
}));

// Fixtures here are partial rows, so the mocks are loosely typed on purpose.
const mockService = paymentsServiceEffect as unknown as Record<
  keyof typeof paymentsServiceEffect,
  jest.Mock
>;
const mockUseAuthStore = useAuthStore as unknown as jest.Mock;

const USER = { id: 'user-1', email: 'a@b.co', role: 'user' };
const CARD = { id: 'pm_1', brand: 'visa', last4: '4242' };
const REQUEST = { holdIds: ['hold-1'], paymentMethodId: 'pm_1' };

let queryClient: QueryClient;

const createWrapper = () => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientWrapper';

  return Wrapper;
};

const signIn = (user: typeof USER | null = USER) => {
  mockUseAuthStore.mockImplementation(
    (selector: (state: { user: typeof USER | null }) => unknown) =>
      selector({ user }),
  );
};

describe('payments hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    signIn();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  describe('usePaymentMethods', () => {
    it('loads the caller’s saved cards', async () => {
      mockService.getPaymentMethods.mockReturnValue(Effect.succeed([CARD]));

      const { result } = renderHook(() => usePaymentMethods(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual([CARD]);
    });

    it('does not fetch while signed out', () => {
      signIn(null);

      renderHook(() => usePaymentMethods(), { wrapper: createWrapper() });

      expect(mockService.getPaymentMethods).not.toHaveBeenCalled();
    });
  });

  describe('usePaymentsInfinite', () => {
    it('asks for the next page only while the API says there is more', async () => {
      mockService.getPayments.mockImplementation((page: number) =>
        Effect.succeed({
          data: [{ id: `pay-${page}` }],
          page,
          hasMore: page < 2,
        }),
      );

      const { result } = renderHook(() => usePaymentsInfinite(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.hasNextPage).toBe(true);

      await act(async () => {
        await result.current.fetchNextPage();
      });

      expect(mockService.getPayments).toHaveBeenLastCalledWith(2);
      await waitFor(() => expect(result.current.hasNextPage).toBe(false));
    });
  });

  describe('useAddCard', () => {
    it('refetches the saved cards once a card is added', async () => {
      mockService.addCard.mockReturnValue(Effect.succeed(undefined));

      const { result } = renderHook(() => useAddCard(), {
        wrapper: createWrapper(),
      });
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(invalidate).toHaveBeenCalledWith({
        queryKey: queryKeys.payments.paymentMethods(USER.id),
      });
    });

    it('surfaces a cancelled sheet as an error without refetching', async () => {
      mockService.addCard.mockReturnValue(
        Effect.fail(PaymentsError.addCardCanceled()),
      );

      const { result } = renderHook(() => useAddCard(), {
        wrapper: createWrapper(),
      });
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

      await act(async () => {
        await result.current.mutateAsync().catch(() => undefined);
      });

      expect(result.current.isError).toBe(true);
      expect(invalidate).not.toHaveBeenCalled();
    });
  });

  describe('useCheckout', () => {
    it('clears the booking and refreshes tickets and history once paid', async () => {
      mockService.checkout.mockReturnValue(
        Effect.succeed({
          status: 'succeeded',
          paymentId: 'pay-1',
          reservation: { id: 'res-1' },
        }),
      );

      const { result } = renderHook(() => useCheckout(), {
        wrapper: createWrapper(),
      });
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

      await act(async () => {
        await result.current.mutateAsync(REQUEST);
      });

      expect(mockService.checkout).toHaveBeenCalledWith(REQUEST);
      expect(mockResetBooking).toHaveBeenCalled();
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: queryKeys.tickets.all,
      });
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: queryKeys.payments.history(USER.id),
      });
    });

    it('keeps the booking when the card is declined, but refreshes history', async () => {
      mockService.checkout.mockReturnValue(
        Effect.fail(PaymentsError.checkoutFailed('Your card was declined.')),
      );

      const { result } = renderHook(() => useCheckout(), {
        wrapper: createWrapper(),
      });
      const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

      await act(async () => {
        await result.current.mutateAsync(REQUEST).catch(() => undefined);
      });

      expect(result.current.error?.message).toBe('Your card was declined.');
      expect(mockResetBooking).not.toHaveBeenCalled();
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: queryKeys.payments.history(USER.id),
      });
    });
  });
});
