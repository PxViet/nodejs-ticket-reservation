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

/**
 * The cinema's halls. Far more stable than a day's schedule, so this uses the
 * longer shared stale time rather than the showtime one.
 */
export function useHalls() {
  return useQuery({
    queryKey: queryKeys.halls.list(),
    queryFn: () =>
      runEffectForQuery(
        Effect.gen(function* () {
          const showtimesService = yield* ShowtimesService;
          return yield* showtimesService.getHalls();
        }),
        ShowtimesServiceLayer,
      ),
    staleTime: API_CONFIG.QUERY_STALE_TIME,
  });
}
