// Effect
import { Effect } from 'effect';

// Constants
import { API_CONFIG, queryKeys } from '@/constants';

// React Query
import { useQuery } from '@tanstack/react-query';

// Utils
import { runEffectForQuery } from '@/utils/effect';

// Effect Services
import { ShowtimesService } from '@/features/booking/effect/services/showtimes';
import { ShowtimesServiceLayer } from '@/features/booking/effect/layer/showtimes';

export function useShowtimes(movieId: string, date: string, hallId?: string) {
  return useQuery({
    queryKey: queryKeys.showtimes.list(movieId, date, hallId),
    queryFn: () =>
      runEffectForQuery(
        Effect.gen(function* () {
          const showtimesService = yield* ShowtimesService;
          return yield* showtimesService.getShowtimes(movieId, date, hallId);
        }),
        ShowtimesServiceLayer,
      ),
    enabled: !!movieId && !!date,
    staleTime: API_CONFIG.MOVIE_STALE_TIME,
  });
}

export function useShowtime(id: string) {
  return useQuery({
    queryKey: queryKeys.showtimes.detail(id),
    queryFn: () =>
      runEffectForQuery(
        Effect.gen(function* () {
          const showtimesService = yield* ShowtimesService;
          return yield* showtimesService.getShowtimeById(id);
        }),
        ShowtimesServiceLayer,
      ),
    enabled: !!id,
    staleTime: API_CONFIG.MOVIE_STALE_TIME,
  });
}
