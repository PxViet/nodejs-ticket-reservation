/**
 * The typed contract between `@movea/api` and `@movea/mobile`.
 *
 * Everything here is derived from the API's own OpenAPI document — run
 * `pnpm contract:generate` from the repo root after changing a controller or
 * DTO. Nothing in this package is hand-written on purpose: status vocabularies
 * such as seat-hold state are load-bearing (ADR-008 ties them to a partial
 * unique index), so a second hand-maintained copy is exactly the drift this
 * package exists to prevent.
 */
export type {
  components,
  operations,
  paths,
  webhooks,
} from './generated/schema';

import type { components } from './generated/schema';

/** Every DTO the API publishes, keyed by its Swagger schema name. */
export type Schemas = components['schemas'];

/**
 * Named aliases (`Reservation`, `Showtime`, `SeatHoldStatus`, …) get added
 * here as the mobile app migrates each feature off Supabase, so the app
 * imports intent-revealing names rather than reaching into `Schemas` directly.
 */

/** `POST /auth/login` request body. */
export type LoginRequest = Schemas['LoginDto'];
/** `POST /auth/register` request body. */
export type RegisterRequest = Schemas['RegisterDto'];
/** `POST /auth/refresh` and `POST /auth/logout` request body. */
export type RefreshTokenRequest = Schemas['RefreshTokenDto'];
/** What `login`, `register` and `refresh` return. */
export type TokenPair = Schemas['TokenPairDto'];
/** What `GET /auth/me` returns — the authenticated user from the access token. */
export type AuthUser = Schemas['MeResponseDto'];
/** The authenticated user's full profile — what `GET /users/me` returns. */
export type UserProfile = Schemas['UserResponseDto'];
/** `PATCH /users/me` request body. */
export type UpdateUserProfileRequest = Schemas['UpdateProfileDto'];
/** `PATCH /users/me/password` request body — proves the current password first (DDR-013). */
export type ChangePasswordRequest = Schemas['ChangePasswordDto'];

/** A movie in the public catalogue — `GET /movies` / `GET /movies/:id`. */
export type Movie = Schemas['MovieResponseDto'];
/** One page of `GET /movies`. An admin token additionally includes inactive movies (DDR-014). */
export type PaginatedMovies = Schemas['PaginatedMovieResponseDto'];
/** `POST /movies` request body (admin only). */
export type CreateMovieRequest = Schemas['CreateMovieDto'];
/** `PATCH /movies/:id` request body (admin only). */
export type UpdateMovieRequest = Schemas['UpdateMovieDto'];
/** A catalogue genre — `GET /genres`. */
export type Genre = Schemas['GenreResponseDto'];
/** One page of `GET /genres`. */
export type PaginatedGenres = Schemas['PaginatedGenreResponseDto'];

/** A showtime in the public schedule — `GET /showtimes` / `GET /showtimes/:id`. */
export type Showtime = Schemas['ShowtimeResponseDto'];
/** One page of `GET /showtimes`. */
export type PaginatedShowtimes = Schemas['PaginatedShowtimeResponseDto'];
/** The movie a showtime plays, as nested on a showtime. */
export type ShowtimeMovie = Schemas['ShowtimeMovieDto'];
/** The hall a showtime plays in, as nested on a showtime. */
export type ShowtimeHall = Schemas['ShowtimeHallDto'];
/** A hall — `GET /halls`, which returns a plain array rather than a page. */
export type Hall = Schemas['HallResponseDto'];

/** One seat on a showtime's seat map — `GET /showtimes/:id/seats`, a plain array. */
export type ShowtimeSeat = Schemas['ShowtimeSeatResponseDto'];
/** `POST /showtimes/:id/hold` request body. */
export type HoldSeatsRequest = Schemas['CreateSeatHoldDto'];
/** One seat hold, as nested in a hold response. */
export type SeatHold = Schemas['SeatHoldResponseDto'];
/** What `POST /showtimes/:id/hold` returns. */
export type HoldSeatsResponse = Schemas['HoldSeatsResponseDto'];
/** One of the caller's own active holds — `GET /seat-holds/me`, adds `price` to `SeatHold`. */
export type ActiveSeatHold = Schemas['ActiveSeatHoldResponseDto'];
/** One page of `GET /seat-holds/me`. */
export type PaginatedSeatHolds = Schemas['PaginatedSeatHoldResponseDto'];

/** `POST /reservations/checkout` request body — the holds and a saved card, never an amount (ADR-018). */
export type CheckoutRequest = Schemas['CheckoutDto'];
/** What `POST /reservations/checkout` returns. `requires_action` carries a 3-D Secure `clientSecret`. */
export type CheckoutResponse = Schemas['CheckoutResponseDto'];
/** One ticket on a confirmed reservation, as nested in `Reservation`. */
export type ReservationTicket = Schemas['TicketResponseDto'];
/** A confirmed reservation — `GET /reservations/:id`, and nested in a succeeded `CheckoutResponse`. */
export type Reservation = Schemas['ReservationResponseDto'];
/** One row of `GET /reservations/me` — a `Reservation` without its tickets. */
export type ReservationSummary = Schemas['ReservationSummaryResponseDto'];
/** One page of `GET /reservations/me`. */
export type PaginatedReservations = Schemas['PaginatedReservationResponseDto'];

/** One row of `GET /reports/revenue` (admin only) — ADR-011/DDR-010. */
export type RevenueReportRow = Schemas['RevenueReportRowDto'];
/** One page of `GET /reports/revenue`. */
export type PaginatedRevenueReport =
  Schemas['PaginatedRevenueReportResponseDto'];
/** One row of `GET /reports/capacity` (admin only) — occupancy per showtime. */
export type CapacityReportRow = Schemas['CapacityReportRowDto'];
/** One page of `GET /reports/capacity`. */
export type PaginatedCapacityReport =
  Schemas['PaginatedCapacityReportResponseDto'];
/** One row of `GET /reports/reservations` (admin only) — every customer's reservations. */
export type AdminReservationRow = Schemas['AdminReservationRowDto'];
/** One page of `GET /reports/reservations`. */
export type PaginatedReservationsReport =
  Schemas['PaginatedReservationsReportResponseDto'];

/** What `POST /payment-methods/setup-intent` returns — everything Stripe's PaymentSheet needs (ADR-018). */
export type SetupIntent = Schemas['SetupIntentResponseDto'];
/** A saved card — Stripe ids and display fields only, never the card number. */
export type PaymentMethod = Schemas['PaymentMethodResponseDto'];
/** One page of `GET /payment-methods`. */
export type PaginatedPaymentMethods =
  Schemas['PaginatedPaymentMethodResponseDto'];
/** One checkout payment — `GET /payments` and `GET /reservations/checkout/:paymentId` (DDR-025). */
export type Payment = Schemas['PaymentResponseDto'];
/** One page of `GET /payments`, newest first. */
export type PaginatedPayments = Schemas['PaginatedPaymentResponseDto'];
