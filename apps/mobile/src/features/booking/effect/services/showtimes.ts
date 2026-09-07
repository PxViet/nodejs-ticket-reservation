// Effect
import { Effect, Context } from 'effect';

// Schema
import { Hall, Showtime } from '../../schemas/showtime';
import { ShowtimeError } from '../../error/showtime';

export class ShowtimesService extends Context.Tag('ShowtimesServiceTag')<
  ShowtimesService,
  {
    readonly getShowtimes: (
      movieId: string,
      date: string,
      hallId?: string,
    ) => Effect.Effect<Showtime[], ShowtimeError, never>;

    readonly getShowtimeById: (
      id: string,
    ) => Effect.Effect<Showtime, ShowtimeError, never>;

    readonly getHalls: () => Effect.Effect<Hall[], ShowtimeError, never>;
  }
>() {}
