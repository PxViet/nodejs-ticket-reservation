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

// The seat-map vocabulary the API projects for the client: `held` is someone's
// live 10-minute hold, `reserved` a confirmed reservation (SeatStatus on the API).
export const SeatStatusSchema = Schema.Literal('available', 'held', 'reserved');

export const ShowtimeSeatSchema = Schema.Struct({
  seatId: Schema.String,
  seatRow: Schema.String,
  seatColumn: Schema.Number,
  seatLabel: Schema.String,
  status: SeatStatusSchema,
  // Present only when the caller sent a token — `held`/`reserved` seats that are
  // the caller's own (DDR-015). Omitted, not `false`, for anonymous reads.
  isMine: Schema.optional(Schema.Boolean),
});

// The storage vocabulary a hold row carries back (BR-08).
export const SeatHoldStatusSchema = Schema.Literal(
  'held',
  'confirmed',
  'released',
  'expired',
);

export const SeatHoldSchema = Schema.Struct({
  id: Schema.String,
  seatId: Schema.String,
  seatLabel: Schema.String,
  showtimeId: Schema.String,
  status: SeatHoldStatusSchema,
  heldUntil: Schema.String,
});

export type HallType = Schema.Schema.Type<typeof HallTypeSchema>;
export type ApiShowtimeStatus = Schema.Schema.Type<
  typeof ApiShowtimeStatusSchema
>;
export type ShowtimeHall = Schema.Schema.Type<typeof ShowtimeHallSchema>;
export type ShowtimeMovie = Schema.Schema.Type<typeof ShowtimeMovieSchema>;
export type Showtime = Schema.Schema.Type<typeof ShowtimeSchema>;
export type Hall = Schema.Schema.Type<typeof HallSchema>;
export type SeatStatus = Schema.Schema.Type<typeof SeatStatusSchema>;
export type ShowtimeSeat = Schema.Schema.Type<typeof ShowtimeSeatSchema>;
export type SeatHold = Schema.Schema.Type<typeof SeatHoldSchema>;

/** One hall and the times it plays a movie on a given date. */
export interface HallWithShowtimes {
  hall: ShowtimeHall;
  showtimes: Showtime[];
}

/** What the booking store keeps per selected seat — the id the hold call needs
 * plus the label Checkout shows. */
export interface SelectedSeat {
  seatId: string;
  seatLabel: string;
}
