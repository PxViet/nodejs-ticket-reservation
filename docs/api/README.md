# API Reference — Movie Reservation System

Base URL: `/api/v1` (health is `/api` only, no version). Auth: `Authorization: Bearer <accessToken>`.
Pagination (all list endpoints): query `page` (default 1), `limit` (default 20, max 100) → response
`{ data: [...], meta: { page, limit, total, hasMore } }`. Errors (all endpoints):
`{ statusCode, errorCode, message, timestamp }`.

Status: **Implemented** = Health, Auth, Users, Genres, Movies, Halls, Showtimes, Seat Holds,
Reservations, Reports. **Planned** = Token Packages, Wallet, Stripe webhook (ADR-017, DDR-024).

---

## Health

### `GET /api/health` — Implemented

Liveness / DB readiness probe.

- Auth: none
- Request: —
- Success: `200 OK` — `{ status, info, error, details }`
- Errors: `503 SERVICE_UNAVAILABLE` — database ping fails

---

## Auth

### `POST /auth/register` — Implemented

Create an account and issue a token pair.

- Auth: none
- Request: `{ email, password, firstName, lastName, phoneNumber?, dateOfBirth?, address? }`
- Success: `201 Created` — `{ accessToken, refreshToken, expiresIn }`
- Errors: `409 EMAIL_ALREADY_REGISTERED`, `400 BAD_REQUEST`

### `POST /auth/login` — Implemented

Authenticate and issue a token pair.

- Auth: none
- Request: `{ email, password }`
- Success: `200 OK` — `{ accessToken, refreshToken, expiresIn }`
- Errors: `401 INVALID_CREDENTIALS`, `403 ACCOUNT_INACTIVE`

### `POST /auth/refresh` — Implemented

Rotate a refresh token for a new token pair.

- Auth: none (refresh token is the credential)
- Request: `{ refreshToken }`
- Success: `200 OK` — `{ accessToken, refreshToken, expiresIn }`
- Errors: `401 REFRESH_TOKEN_INVALID`

### `POST /auth/logout` — Implemented

Revoke a refresh token.

- Auth: none (refresh token is the credential)
- Request: `{ refreshToken }`
- Success: `204 No Content`
- Errors: `401 REFRESH_TOKEN_INVALID`

### `GET /auth/me` — Implemented

The authenticated user's JWT claims (cheap "am I logged in" check).

- Auth: Bearer
- Request: —
- Success: `200 OK` — `{ id, email, role }`
- Errors: `401 UNAUTHENTICATED`

---

## Users

### `GET /users` — Implemented

List all users.

- Auth: Bearer, admin
- Request: query `page?, limit?`
- Success: `200 OK` — paginated `UserResponseDto[]`
- Errors: `401 UNAUTHENTICATED`, `403 FORBIDDEN`

### `GET /users/me` — Implemented

The authenticated user's full profile.

- Auth: Bearer
- Request: —
- Success: `200 OK` — `UserResponseDto`
- Errors: `401 UNAUTHENTICATED`

### `PATCH /users/me` — Implemented

Update the authenticated user's profile.

- Auth: Bearer
- Request: `{ firstName?, lastName?, phoneNumber?, dateOfBirth?, address?, avatarUrl? }`
- Success: `200 OK` — `UserResponseDto`
- Errors: `401 UNAUTHENTICATED`, `400 BAD_REQUEST`

### `PATCH /users/me/password` — Implemented

Change the authenticated user's password.

- Auth: Bearer
- Request: `{ currentPassword, newPassword }`
- Success: `204 No Content`
- Errors: `401 UNAUTHENTICATED`, `401 INVALID_CREDENTIALS`, `400 BAD_REQUEST`

### `GET /users/:id` — Implemented

Get any user by id.

- Auth: Bearer, admin
- Request: —
- Success: `200 OK` — `UserResponseDto`
- Errors: `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 NOT_FOUND`

### `PATCH /users/:id` — Implemented

Change another user's role or active status.

- Auth: Bearer, admin
- Request: `{ role?, isActive? }`
- Success: `200 OK` — `UserResponseDto`
- Errors: `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `403 ADMIN_SELF_ACTION_FORBIDDEN`, `404 NOT_FOUND`

### `DELETE /users/:id` — Implemented

Deactivate a user (soft delete).

- Auth: Bearer, admin
- Request: —
- Success: `204 No Content`
- Errors: `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `403 ADMIN_SELF_ACTION_FORBIDDEN`, `404 NOT_FOUND`

---

## Genres

### `GET /genres` — Implemented

List genres.

- Auth: none
- Request: query `page?, limit?`
- Success: `200 OK` — paginated `{ id, name }[]`
- Errors: —

### `POST /genres` — Implemented

Create a genre.

- Auth: Bearer, admin
- Request: `{ name }`
- Success: `201 Created` — `{ id, name }`
- Errors: `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `409 GENRE_NAME_ALREADY_EXISTS`, `400 BAD_REQUEST`

### `PATCH /genres/:id` — Implemented

Rename a genre.

- Auth: Bearer, admin
- Request: `{ name }`
- Success: `200 OK` — `{ id, name }`
- Errors: `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `409 GENRE_NAME_ALREADY_EXISTS`, `404 NOT_FOUND`

### `DELETE /genres/:id` — Implemented

Delete a genre. Hard delete, not soft — a genre has no history worth preserving (DDR-014).

- Auth: Bearer, admin
- Request: —
- Success: `204 No Content`
- Errors: `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `409 GENRE_IN_USE`, `404 NOT_FOUND`

---

## Movies

### `GET /movies` — Implemented

List movies (public catalogue).

- Auth: optional Bearer (admin token also sees inactive movies)
- Request: query `page?, limit?, genreId?, title?`
- Success: `200 OK` — paginated movie list with nested `genres[]`
- Errors: —

### `GET /movies/:id` — Implemented

Get one movie.

- Auth: optional Bearer (admin token also sees inactive movies)
- Request: —
- Success: `200 OK` — movie with nested `genres[]`
- Errors: `404 NOT_FOUND`

### `POST /movies` — Implemented

Create a movie.

- Auth: Bearer, admin
- Request: `{ title, synopsis?, posterUrl?, durationMinutes, language, releaseDate, rating?, genreIds[] }`
- Success: `201 Created` — movie with nested `genres[]`
- Errors: `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `400 MOVIE_REQUIRES_GENRE`, `400 BAD_REQUEST`

### `PATCH /movies/:id` — Implemented

Update a movie.

- Auth: Bearer, admin
- Request: `{ title?, synopsis?, posterUrl?, durationMinutes?, language?, releaseDate?, rating?, genreIds?, isActive? }`
- Success: `200 OK` — movie with nested `genres[]`
- Errors: `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `400 MOVIE_REQUIRES_GENRE`, `404 NOT_FOUND`

### `DELETE /movies/:id` — Implemented

Deactivate a movie (soft delete). Reactivating is `PATCH /movies/:id { isActive: true }`.

- Auth: Bearer, admin
- Request: —
- Success: `204 No Content`
- Errors: `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 NOT_FOUND`,
  `409 SHOWTIME_INVALID_STATUS_TRANSITION` (a completed showtime cannot be cancelled)

---

## Halls — Implemented (read-only)

### `GET /halls`

List halls with seat capacity.

- Auth: none (DDR-015 — hall name, format and capacity are part of the public catalogue)
- Request: —
- Success: `200 OK` — `{ id, name, hallType, totalSeats }[]` (not paginated)
- Errors: —

---

## Showtimes — Implemented

### `GET /showtimes`

List showtimes with seat availability.

- Auth: none (an admin token additionally reveals cancelled showtimes)
- Request: query `page?, limit?, date?, movieId?, hallId?`
- Success: `200 OK` — paginated, each row includes `totalSeats, seatsTaken, availableSeats`
- Errors: —

### `GET /showtimes/:id`

Get one showtime, with nested movie and hall.

- Auth: none (an admin token additionally reveals cancelled showtimes)
- Request: —
- Success: `200 OK` — also carries `totalSeats, seatsTaken, availableSeats`
- Errors: `404 NOT_FOUND`

### `GET /showtimes/:id/seats`

Seat map for a showtime.

- Auth: optional Bearer (flags caller's own held seats)
- Request: —
- Success: `200 OK` — plain array `{ seatId, seatRow, seatColumn, seatLabel, status, isMine? }[]` (not paginated).
  `status` is `available | held | reserved`; `isMine` is omitted entirely for an anonymous caller.
- Errors: `404 NOT_FOUND`

### `POST /showtimes`

Create a showtime.

- Auth: Bearer, admin
- Request: `{ movieId, hallId, showDate, showTime, basePrice }`
- Success: `201 Created`
- Errors: `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `409 SHOWTIME_OVERLAP`, `400 BAD_REQUEST`

### `PATCH /showtimes/:id`

Update or reschedule a showtime.

- Auth: Bearer, admin
- Request: `{ showDate?, showTime?, basePrice?, status? }`
- Success: `200 OK`
- Errors: `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `409 SHOWTIME_OVERLAP`,
  `409 SHOWTIME_INVALID_STATUS_TRANSITION`, `409 SHOWTIME_NOT_MODIFIABLE`, `404 NOT_FOUND`

### `DELETE /showtimes/:id`

Cancel a showtime (soft delete).

- Auth: Bearer, admin
- Request: —
- Success: `204 No Content`
- Errors: `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 NOT_FOUND`,
  `409 SHOWTIME_INVALID_STATUS_TRANSITION` (a completed showtime cannot be cancelled)

### `POST /showtimes/:id/hold`

Claim one or more seats (10-minute hold). Implemented in the Reservations module (DDR-015).

- Auth: Bearer
- Request: `{ seatIds[] }`
- Success: `201 Created` — `{ holds: [{ id, seatId, seatLabel, showtimeId, status, heldUntil }] }`
- Errors: `401 UNAUTHENTICATED`, `409 SEAT_UNAVAILABLE`, `409 SHOWTIME_NOT_BOOKABLE`, `400 BAD_REQUEST`

---

## Seat Holds — Implemented

### `GET /seat-holds/me`

List the authenticated user's active holds (`held`, not yet expired), so a client that left the
checkout flow and came back can resume it instead of re-selecting seats. Optional `showtimeId`
query filter; omitted, holds across all showtimes are returned.

- Auth: Bearer
- Request: `?showtimeId=` (optional), plus standard pagination query params
- Success: `200 OK` — `{ data: [{ id, seatId, seatLabel, showtimeId, status, heldUntil, price }], meta }`
- Errors: `401 UNAUTHENTICATED`

### `DELETE /seat-holds/:id`

Voluntarily release a held seat.

- Auth: Bearer, owner
- Request: —
- Success: `204 No Content`
- Errors: `401 UNAUTHENTICATED`, `403 SEAT_HOLD_NOT_OWNED`, `400 BAD_REQUEST` (not currently held), `404 NOT_FOUND`

---

## Reservations — Implemented

### `POST /reservations`

Confirm a reservation from one or more holds.

- Auth: Bearer
- Request: `{ holdIds[] }`
- Success: `201 Created` — `{ id, reservationNumber, userId, showtimeId, status, tickets[], totalSeats, totalAmount, createdAt }`
- Errors: `401 UNAUTHENTICATED`, `403 SEAT_HOLD_NOT_OWNED`, `409 SEAT_HOLD_EXPIRED`, `400 BAD_REQUEST`

### `GET /reservations/me`

List the authenticated user's reservations.

- Auth: Bearer
- Request: query `page?, limit?, status?`
- Success: `200 OK` — paginated reservation summaries
- Errors: `401 UNAUTHENTICATED`

### `GET /reservations/:id`

Get one reservation (owner or admin).

- Auth: Bearer, owner or admin
- Request: —
- Success: `200 OK` — full reservation with `tickets[]`
- Errors: `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 NOT_FOUND`

### `POST /reservations/:id/cancel`

Cancel a confirmed reservation.

- Auth: Bearer, owner
- Request: —
- Success: `200 OK` — updated reservation, `status: "cancelled"`
- Errors: `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `409 RESERVATION_NOT_CANCELLABLE`, `404 NOT_FOUND`

---

## Reports — Implemented (admin only)

### `GET /reports/revenue`

Revenue by day and movie.

- Auth: Bearer, admin
- Request: query `page?, limit?, from?, to?, movieId?, sortBy? (showDate|movieTitle|ticketsSold|revenue, default showDate), sortOrder? (asc|desc, default desc)`
- Success: `200 OK` — paginated `{ showDate, movieId, movieTitle, ticketsSold, revenue }[]`
- Errors: `401 UNAUTHENTICATED`, `403 FORBIDDEN`

### `GET /reports/capacity`

Occupancy per showtime.

- Auth: Bearer, admin
- Request: query `page?, limit?, from?, to?, hallId?, status?, sortBy? (showDate|showTime|movieTitle|hallName|totalSeats|seatsTaken|occupancyPct, default showDate), sortOrder? (asc|desc, default asc)`
- Success: `200 OK` — paginated `{ showtimeId, movieTitle, hallName, showDate, showTime, status, totalSeats, seatsTaken, occupancyPct }[]`
- Errors: `401 UNAUTHENTICATED`, `403 FORBIDDEN`

### `GET /reports/reservations`

All reservations across all customers.

- Auth: Bearer, admin
- Request: query `page?, limit?, from?, to?, status?, sortBy? (createdAt|showDate|customerEmail|movieTitle|totalSeats|totalAmount|status, default createdAt), sortOrder? (asc|desc, default desc)`
- Success: `200 OK` — paginated `{ reservationId, reservationNumber, customerEmail, firstName, lastName, movieTitle, showDate, showTime, status, totalSeats, totalAmount, createdAt }[]`
- Errors: `401 UNAUTHENTICATED`, `403 FORBIDDEN`

---

## Token Packages — Planned

### `GET /token-packages`

Active token packages, in display order.

- Auth: Bearer
- Request: query `page?, limit?`
- Success: `200 OK` — paginated `{ id, code, name, tokens, priceCents, currency }[]`
- Errors: `401 UNAUTHENTICATED`

---

## Wallet — Planned

Every user has a wallet from signup (BR-39). All routes act on the caller's own wallet; none
takes a user or wallet id.

### `GET /wallet`

The caller's wallet.

- Auth: Bearer
- Request: —
- Success: `200 OK` — `{ id, balance, hasPaymentMethod }`
- Errors: `401 UNAUTHENTICATED`

### `GET /wallet/transactions`

The caller's ledger, newest first.

- Auth: Bearer
- Request: query `page?, limit?, type? (top_up|payment|refund), status? (pending|succeeded|failed)`
- Success: `200 OK` — paginated `{ id, type, status, tokens, amountCents, currency, tokenPackage?, failureMessage?, createdAt }[]`
- Errors: `401 UNAUTHENTICATED`

### `POST /wallet/payment-methods/setup-intent`

Start adding a card. Creates the caller's Stripe Customer on first use, then a SetupIntent
for Stripe's PaymentSheet in setup mode.

- Auth: Bearer
- Request: —
- Success: `201 Created` — `{ setupIntentClientSecret, ephemeralKeySecret, customerId, publishableKey }`
- Errors: `401 UNAUTHENTICATED`, `502 PAYMENT_PROVIDER_UNAVAILABLE`

### `GET /wallet/payment-methods`

The caller's saved cards, for the bill-review step.

- Auth: Bearer
- Request: query `page?, limit?`
- Success: `200 OK` — paginated `{ id, brand, last4, expMonth, expYear }[]`
- Errors: `401 UNAUTHENTICATED`, `502 PAYMENT_PROVIDER_UNAVAILABLE`

### `POST /wallet/top-ups`

Buy a token package with a saved card. The request holds until Stripe answers.

- Auth: Bearer
- Request: `{ tokenPackageId, paymentMethodId }` — no amount (BR-36)
- Success:
  - `201 Created` — `{ status: "succeeded", transaction, balance }`
  - `202 Accepted` — `{ status: "requires_action", transactionId, clientSecret }` — the client
    completes 3-D Secure with Stripe's SDK, then polls `GET /wallet/top-ups/:id`
  - `202 Accepted` — `{ status: "pending", transactionId }` — Stripe is still processing
- Errors: `401 UNAUTHENTICATED`, `404 TOKEN_PACKAGE_NOT_FOUND`, `404 PAYMENT_METHOD_NOT_FOUND`
  (unknown or not the caller's, BR-38), `402 PAYMENT_FAILED` (declined — `message` is Stripe's
  decline reason, safe to show the customer), `502 PAYMENT_PROVIDER_UNAVAILABLE`

### `GET /wallet/top-ups/:id`

One of the caller's top-ups.

- Auth: Bearer, owner
- Request: —
- Success: `200 OK` — `{ id, status, tokens, amountCents, currency, failureMessage?, balance }`
- Errors: `401 UNAUTHENTICATED`, `404 TOP_UP_NOT_FOUND`

---

## Payments — Planned

### `POST /payments/stripe/webhook`

Stripe's event callback. It settles any top-up the synchronous path did not (BR-37).

- Auth: none — trusted only through the `Stripe-Signature` header, checked against
  `STRIPE_WEBHOOK_SECRET` over the raw body. Not throttled.
- Request: a Stripe event; `payment_intent.succeeded` and `payment_intent.payment_failed` are
  handled, and any other event is acknowledged and ignored
- Success: `200 OK`
- Errors: `400 STRIPE_WEBHOOK_SIGNATURE_INVALID`

---

## HTTP Status Codes

| Code | Meaning               | Used for                                                                                                                                     |
| ---- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 200  | OK                    | Successful GET, PATCH, or action endpoint that returns a body                                                                                |
| 201  | Created               | Successful POST that creates a resource                                                                                                      |
| 204  | No Content            | Successful DELETE, or POST/PATCH with nothing to return                                                                                      |
| 400  | Bad Request           | Validation failure, unknown field, missing/invalid data                                                                                      |
| 401  | Unauthorized          | Missing/invalid access token, or wrong credentials                                                                                           |
| 402  | Payment Required      | Planned — card payment declined by Stripe (`PAYMENT_FAILED`)                                                                                 |
| 403  | Forbidden             | Wrong role, not the resource owner, or admin-self-action blocked                                                                             |
| 404  | Not Found             | No resource with the given id                                                                                                                |
| 409  | Conflict              | Duplicate/unique-constraint clash, or a business-rule conflict (seat taken, hold expired, overlapping showtime, reservation not cancellable) |
| 429  | Too Many Requests     | Rate limit exceeded                                                                                                                          |
| 500  | Internal Server Error | Unhandled server error                                                                                                                       |
| 502  | Bad Gateway           | Planned — Stripe unreachable or erroring (`PAYMENT_PROVIDER_UNAVAILABLE`)                                                                    |
| 503  | Service Unavailable   | Health check failed                                                                                                                          |

## Error Codes

| errorCode                          | Status | Meaning                                                  |
| ---------------------------------- | ------ | -------------------------------------------------------- |
| INVALID_CREDENTIALS                | 401    | Wrong email/password, or wrong current password          |
| EMAIL_ALREADY_REGISTERED           | 409    | Email already registered                                 |
| ACCOUNT_INACTIVE                   | 403    | Login attempt on a deactivated account                   |
| REFRESH_TOKEN_INVALID              | 401    | Refresh token unknown, expired, or revoked               |
| UNAUTHENTICATED                    | 401    | Missing or invalid access token                          |
| ADMIN_SELF_ACTION_FORBIDDEN        | 403    | Admin targeting their own account on an admin-only route |
| GENRE_NAME_ALREADY_EXISTS          | 409    | Genre name already in use                                |
| MOVIE_REQUIRES_GENRE               | 400    | Movie left with zero genres                              |
| GENRE_IN_USE                       | 409    | Genre still assigned to a movie                          |
| SHOWTIME_OVERLAP                   | 409    | Showtime interval overlaps another in the same hall      |
| SHOWTIME_NOT_BOOKABLE              | 409    | Showtime is cancelled or completed                       |
| SHOWTIME_INVALID_STATUS_TRANSITION | 409    | Showtime status change not allowed (DDR-016)             |
| SHOWTIME_NOT_MODIFIABLE            | 409    | Showtime rescheduled or repriced after `scheduled`       |
| SEAT_UNAVAILABLE                   | 409    | Seat already held/reserved by someone else               |
| SEAT_HOLD_EXPIRED                  | 409    | Hold's TTL passed before confirmation                    |
| SEAT_HOLD_NOT_OWNED                | 403    | Hold belongs to a different user                         |
| RESERVATION_NOT_CANCELLABLE        | 409    | Showtime already started, or reservation not confirmed   |
| TOKEN_PACKAGE_NOT_FOUND            | 404    | Planned — package unknown or inactive                    |
| PAYMENT_METHOD_NOT_FOUND           | 404    | Planned — card unknown or not the caller's (BR-38)       |
| PAYMENT_FAILED                     | 402    | Planned — Stripe declined the payment                    |
| PAYMENT_PROVIDER_UNAVAILABLE       | 502    | Planned — Stripe unreachable or erroring                 |
| TOP_UP_NOT_FOUND                   | 404    | Planned — top-up unknown or not the caller's             |
| STRIPE_WEBHOOK_SIGNATURE_INVALID   | 400    | Planned — webhook signature missing or wrong             |
| BAD_REQUEST                        | 400    | Generic validation failure                               |
| FORBIDDEN                          | 403    | Generic role/ownership rejection                         |
| NOT_FOUND                          | 404    | Generic missing resource                                 |
| INTERNAL_SERVER_ERROR              | 500    | Unhandled error                                          |
