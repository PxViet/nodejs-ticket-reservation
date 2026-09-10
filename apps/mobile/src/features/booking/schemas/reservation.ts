// Effect
import { Schema } from 'effect';

/**
 * A confirmed reservation as `@movea/api` serves it — `POST /reservations`,
 * `GET /reservations/me`, `GET /reservations/:id` (BR-09/BR-10). Deliberately
 * separate from `./booking`: there is no wallet/payment step here and the
 * status vocabulary is the API's own (3-state reservation, 2-state ticket),
 * not the legacy 4-state Supabase `BookingStatusSchema`.
 */
export const ReservationStatusSchema = Schema.Literal(
  'confirmed',
  'cancelled',
  'completed',
);

export const TicketStatusSchema = Schema.Literal('valid', 'cancelled');

export const ReservationTicketSchema = Schema.Struct({
  id: Schema.String,
  seatId: Schema.String,
  seatLabel: Schema.String,
  ticketNumber: Schema.String,
  price: Schema.Number,
  status: TicketStatusSchema,
});

export const ReservationSchema = Schema.Struct({
  id: Schema.String,
  reservationNumber: Schema.String,
  userId: Schema.String,
  showtimeId: Schema.String,
  status: ReservationStatusSchema,
  tickets: Schema.Array(ReservationTicketSchema),
  totalSeats: Schema.Number,
  totalAmount: Schema.Number,
  createdAt: Schema.String,
});

export const ReservationSummarySchema = Schema.Struct({
  id: Schema.String,
  reservationNumber: Schema.String,
  showtimeId: Schema.String,
  status: ReservationStatusSchema,
  totalSeats: Schema.Number,
  totalAmount: Schema.Number,
  createdAt: Schema.String,
});

export type ReservationStatus = Schema.Schema.Type<
  typeof ReservationStatusSchema
>;
export type TicketStatus = Schema.Schema.Type<typeof TicketStatusSchema>;
export type ReservationTicket = Schema.Schema.Type<
  typeof ReservationTicketSchema
>;
export type Reservation = Schema.Schema.Type<typeof ReservationSchema>;
export type ReservationSummary = Schema.Schema.Type<
  typeof ReservationSummarySchema
>;

/** The three-tab ticket-list vocabulary the UI already speaks
 * (`BOOKING_STATUS` in `@/constants/status`) — derived from the two real
 * server fields since the API has no separate "expired" state. */
export type TicketDisplayStatus = 'active' | 'used' | 'cancelled';

/** `ticketStatus` is omitted for a reservation summary (`GET /reservations/me`
 * doesn't nest tickets) — reservation status alone is enough there, since
 * cancelling a reservation cancels every ticket on it. */
export const toDisplayStatus = (
  reservationStatus: ReservationStatus,
  ticketStatus?: TicketStatus,
): TicketDisplayStatus => {
  if (reservationStatus === 'cancelled' || ticketStatus === 'cancelled') {
    return 'cancelled';
  }
  if (reservationStatus === 'completed') {
    return 'used';
  }
  return 'active';
};
