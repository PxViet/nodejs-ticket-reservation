// Effect
import { Schema } from 'effect';

/**
 * The showtime as `@movea/api` serves it.
 *
 * Deliberately separate from `./cinema`: the API has no cinema entity — a
 * showtime belongs to a hall and nothing above it — while the Supabase-backed
 * ticket, wallet and booking reads still traverse `cinemaHall.cinema`. The two
 * shapes coexist until those features migrate too.
 */
export const HallTypeSchema = Schema.Literal('2D', '3D', 'IMAX');

// Wider than the legacy vocabulary in ./cinema: the API also has `scheduled`.
export const ApiShowtimeStatusSchema = Schema.Literal(
  'scheduled',
  'active',
  'completed',
  'cancelled',
);

export const ShowtimeHallSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  hallType: HallTypeSchema,
});

export const ShowtimeMovieSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  durationMinutes: Schema.Number,
  posterUrl: Schema.String,
  language: Schema.String,
  rating: Schema.Number,
});

export const ShowtimeSchema = Schema.Struct({
  id: Schema.String,
  movieId: Schema.String,
  hallId: Schema.String,
  showDate: Schema.String,
  showTime: Schema.String,
  endTime: Schema.String,
  basePrice: Schema.Number,
  status: ApiShowtimeStatusSchema,
  // Availability is computed by the API, never stored (DDR-003).
  totalSeats: Schema.Number,
  seatsTaken: Schema.Number,
  availableSeats: Schema.Number,
  createdAt: Schema.String,
  updatedAt: Schema.String,
  hall: Schema.optional(ShowtimeHallSchema),
  movie: Schema.optional(ShowtimeMovieSchema),
});

export const HallSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  hallType: HallTypeSchema,
  totalSeats: Schema.Number,
});

export type HallType = Schema.Schema.Type<typeof HallTypeSchema>;
export type ApiShowtimeStatus = Schema.Schema.Type<
  typeof ApiShowtimeStatusSchema
>;
export type ShowtimeHall = Schema.Schema.Type<typeof ShowtimeHallSchema>;
export type ShowtimeMovie = Schema.Schema.Type<typeof ShowtimeMovieSchema>;
export type Showtime = Schema.Schema.Type<typeof ShowtimeSchema>;
export type Hall = Schema.Schema.Type<typeof HallSchema>;

/** One hall and the times it plays a movie on a given date. */
export interface HallWithShowtimes {
  hall: ShowtimeHall;
  showtimes: Showtime[];
}
