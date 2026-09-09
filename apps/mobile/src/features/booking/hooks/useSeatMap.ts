// Effect
import { Effect } from 'effect';

// React Query
import { useMutation, useQuery } from '@tanstack/react-query';

// Constants
import { queryKeys } from '@/constants';

// Utils
import { runEffectForQuery } from '@/utils/effect';

// Effect Services
import { ShowtimesService } from '@/features/booking/effect/services/showtimes';
import { ShowtimesServiceLayer } from '@/features/booking/effect/layer/showtimes';

// Types
import { ShowtimeError } from '@/features/booking/error/showtime';
import { ActiveSeatHold, SeatHold } from '@/features/booking/schemas/showtime';

// A hold lives 10 minutes and the server sweeps expiries every 60s, so the map
// goes stale quickly — refetch it on mount and on a short interval.
const SEAT_MAP_REFETCH_INTERVAL = 30_000;

export function useSeatMap(showtimeId: string) {
  return useQuery({
    queryKey: queryKeys.showtimes.seatMap(showtimeId),
    queryFn: () =>
      runEffectForQuery(
        Effect.gen(function* () {
          const showtimesService = yield* ShowtimesService;
          return yield* showtimesService.getSeatMap(showtimeId);
        }),
        ShowtimesServiceLayer,
      ),
    enabled: !!showtimeId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: SEAT_MAP_REFETCH_INTERVAL,
  });
}

interface HoldSeatsInput {
  showtimeId: string;
  seatIds: string[];
}

export function useHoldSeats() {
  return useMutation<SeatHold[], ShowtimeError, HoldSeatsInput>({
    mutationFn: ({ showtimeId, seatIds }) =>
      runEffectForQuery(
        Effect.gen(function* () {
          const showtimesService = yield* ShowtimesService;
          return yield* showtimesService.holdSeats(showtimeId, seatIds);
        }),
        ShowtimesServiceLayer,
      ),
  });
}

// A one-shot check for a hold left over from an abandoned checkout — Seats
// disables this once it has something selected (fresh or resumed), so it
// never clobbers an in-progress selection.
export function useMyActiveHolds(showtimeId: string, enabled: boolean) {
  return useQuery<ActiveSeatHold[], ShowtimeError>({
    queryKey: queryKeys.showtimes.myHolds(showtimeId),
    queryFn: () =>
      runEffectForQuery(
        Effect.gen(function* () {
          const showtimesService = yield* ShowtimesService;
          return yield* showtimesService.getMyActiveHolds(showtimeId);
        }),
        ShowtimesServiceLayer,
      ),
    enabled: enabled && !!showtimeId,
    staleTime: 0,
  });
}

export function useReleaseHold() {
  return useMutation<string, ShowtimeError, string>({
    mutationFn: holdId =>
      runEffectForQuery(
        Effect.gen(function* () {
          const showtimesService = yield* ShowtimesService;
          yield* showtimesService.releaseHold(holdId);
          return holdId;
        }),
        ShowtimesServiceLayer,
      ),
  });
}
