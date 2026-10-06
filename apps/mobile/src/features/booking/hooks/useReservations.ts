import {
  InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

// Effect
import { Effect } from 'effect';

// Utils
import { runEffectForQuery } from '@/utils/effect';

// Constants
import { API_CONFIG, queryKeys } from '@/constants';

// Effect Services
import { ReservationsService } from '@/features/booking/effect/services/reservations';
import { ReservationsServiceLayer } from '@/features/booking/effect/layer/reservations';
import type {
  ReservationDetail,
  ReservationPage,
} from '@/features/booking/services/reservations';

// Stores
import { useAuthStore } from '@/features/auth/store/auth';

// Types
import { ReservationError } from '@/features/booking/error/reservation';
import {
  Reservation,
  ReservationStatus,
} from '@/features/booking/schemas/reservation';

// The API pages are one-indexed and carry `hasMore` in `meta` (same shape as
// `useMovies.ts`'s `MoviePage`).
const nextPage = (lastPage: ReservationPage) =>
  lastPage.hasMore ? lastPage.page + 1 : undefined;

export const useReservationsInfinite = (status?: ReservationStatus) => {
  const user = useAuthStore(state => state.user);

  return useInfiniteQuery<
    ReservationPage,
    ReservationError,
    InfiniteData<ReservationPage>,
    ReturnType<typeof queryKeys.tickets.infinite>,
    number
  >({
    queryKey: queryKeys.tickets.infinite(user?.id),
    queryFn: ({ pageParam }) =>
      runEffectForQuery(
        Effect.gen(function* () {
          const reservationsService = yield* ReservationsService;
          return yield* reservationsService.getMinePaginated(pageParam, status);
        }),
        ReservationsServiceLayer,
      ),
    getNextPageParam: nextPage,
    initialPageParam: 1,
    enabled: !!user,
    staleTime: API_CONFIG.BOOKING_STALE_TIME,
  });
};

export const useReservation = (id: string) => {
  return useQuery<ReservationDetail, ReservationError>({
    queryKey: queryKeys.tickets.detail(id),
    queryFn: () =>
      runEffectForQuery(
        Effect.gen(function* () {
          const reservationsService = yield* ReservationsService;
          return yield* reservationsService.getById(id);
        }),
        ReservationsServiceLayer,
      ),
    enabled: !!id,
    staleTime: API_CONFIG.BOOKING_STALE_TIME,
  });
};

export const useCancelReservation = () => {
  const queryClient = useQueryClient();

  return useMutation<Reservation, ReservationError, string>({
    mutationFn: (id: string) =>
      runEffectForQuery(
        Effect.gen(function* () {
          const reservationsService = yield* ReservationsService;
          return yield* reservationsService.cancel(id);
        }),
        ReservationsServiceLayer,
      ),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
    },
  });
};
