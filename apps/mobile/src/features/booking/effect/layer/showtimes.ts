import { Effect, Layer } from 'effect';

// Effect
import { showtimesServiceEffect } from '../../services/showtimes';

// Service
import { ShowtimesService } from '../services/showtimes';

export const ShowtimesServiceLayer = Layer.effect(
  ShowtimesService,
  Effect.gen(function* () {
    return {
      getShowtimes: (movieId: string, date: string, hallId?: string) =>
        showtimesServiceEffect.getShowtimes(movieId, date, hallId),

      getShowtimeById: (id: string) =>
        showtimesServiceEffect.getShowtimeById(id),

      getHalls: () => showtimesServiceEffect.getHalls(),

      getSeatMap: (showtimeId: string) =>
        showtimesServiceEffect.getSeatMap(showtimeId),

      holdSeats: (showtimeId: string, seatIds: string[]) =>
        showtimesServiceEffect.holdSeats(showtimeId, seatIds),

      getMyActiveHolds: (showtimeId: string) =>
        showtimesServiceEffect.getMyActiveHolds(showtimeId),

      releaseHold: (holdId: string) =>
        showtimesServiceEffect.releaseHold(holdId),
    } as const;
  }),
);
