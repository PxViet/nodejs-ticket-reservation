// Effect
import { Effect } from 'effect';

// React Query
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

// Constants
import { API_CONFIG, queryKeys } from '@/constants';

// Stores
import { useAuthStore } from '@/features/auth/store/auth';
import { useBookingStore } from '@/features/booking/store/booking';

// Utils
import { runEffectForQuery } from '@/utils/effect';

// Effect Services
import { PaymentsServiceLayer } from '@/features/payments/effect/layer/payments';
import { PaymentsService } from '@/features/payments/effect/services/payments';

// Types
import type {
  CheckoutOutcome,
  CheckoutRequest,
  PaymentsPage,
  PaymentWithShowtime,
} from '@/features/payments/schemas/payments';
import type { PaymentsError } from '@/features/payments/error/payments';

const runPayments = <A, E>(
  use: (service: PaymentsService['Type']) => Effect.Effect<A, E, never>,
) =>
  runEffectForQuery(
    Effect.gen(function* () {
      const service = yield* PaymentsService;
      return yield* use(service);
    }),
    PaymentsServiceLayer,
  );

export const usePaymentMethods = () => {
  const user = useAuthStore(state => state.user);

  return useQuery({
    queryKey: queryKeys.payments.paymentMethods(user?.id),
    queryFn: () => runPayments(service => service.getPaymentMethods()),
    enabled: !!user,
    staleTime: API_CONFIG.QUERY_STALE_TIME,
  });
};

// The API pages are one-indexed (DDR-011) and carry `hasMore` in `meta`.
export const usePaymentsInfinite = () => {
  const user = useAuthStore(state => state.user);

  return useInfiniteQuery({
    queryKey: queryKeys.payments.history(user?.id),
    queryFn: ({ pageParam }) =>
      runPayments(service => service.getPayments(pageParam)),
    getNextPageParam: (lastPage: PaymentsPage<PaymentWithShowtime>) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: !!user,
    staleTime: API_CONFIG.BOOKING_STALE_TIME,
  });
};

/**
 * Open Stripe's PaymentSheet to add a card. Resolves once the card is saved;
 * the saved-card list is refetched so the caller can find and select it.
 */
export const useAddCard = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);

  return useMutation<void, PaymentsError, void>({
    mutationFn: () => runPayments(service => service.addCard()),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.paymentMethods(user?.id),
      }),
  });
};

/**
 * Pay for the held seats and confirm the reservation (ADR-018). No optimistic
 * ticket: the server prices the seats and Stripe may still decline or
 * challenge the card, so the booking is cleared only once the API says the
 * payment succeeded.
 */
export const useCheckout = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);
  const resetBooking = useBookingStore(state => state.reset);

  return useMutation<CheckoutOutcome, PaymentsError, CheckoutRequest>({
    mutationFn: (request: CheckoutRequest) =>
      runPayments(service => service.checkout(request)),
    onSuccess: () => {
      resetBooking();
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.history(user?.id),
      });
    },
  });
};
