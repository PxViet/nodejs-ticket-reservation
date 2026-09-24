# Database Design

Source: _Capstone Practice — Movie Reservation System — Database Design_, 11–18 Aug 2026.
Eleven tables, fourteen relationships, thirty-four business rules, six views.

The design was not reviewed on paper: it was built as a real PostgreSQL 16 database and
seeded with 3,887 rows across all eleven tables, and every integrity claim below was measured
against it.

| Page                                           | What it covers                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| [mission-objectives.md](mission-objectives.md) | Mission statement, MO-01…MO-20, requirement sources, out of scope |
| [business-rules.md](business-rules.md)         | BR-01…BR-40 with the mechanism that enforces each                 |
| [views.md](views.md)                           | The six views and who may query them                              |

## Tables

Owner names are the module names from the Technical Design.

| Table            | Schema      | Owner        | Description                                                               |
| ---------------- | ----------- | ------------ | ------------------------------------------------------------------------- |
| `users`          | identity    | Users        | A person who holds an account, whether a customer or an administrator.    |
| `refresh_tokens` | identity    | Auth         | A revocable refresh token issued when a user logs in.                     |
| `movies`         | catalog     | Movies       | A film that may be scheduled for showing.                                 |
| `genres`         | catalog     | Movies       | A category to which a movie may belong.                                   |
| `movie_genres`   | catalog     | Movies       | The assignment of a genre to a movie.                                     |
| `halls`          | venue       | Showtimes    | A screening hall.                                                         |
| `seats`          | venue       | Showtimes    | An individual physical seat within a hall.                                |
| `showtimes`      | scheduling  | Showtimes    | A scheduled screening of one movie in one hall at one date and time.      |
| `seat_holds`     | reservation | Reservations | A claim on one seat for one showtime by one user, temporary or confirmed. |
| `reservations`   | reservation | Reservations | A confirmed reservation covering one or more seats for a showtime.        |
| `tickets`        | reservation | Reservations | A ticket issued for one seat of a reservation, identified by a reference. |

### Wallet tables (ADR-017, DDR-024) — `1790240623162-AddWallets.ts`

| Table                 | Schema | Owner   | Description                                                                     |
| --------------------- | ------ | ------- | ------------------------------------------------------------------------------- |
| `wallets`             | wallet | Wallets | A user's token balance and, once they add a card, their Stripe Customer id.     |
| `token_packages`      | wallet | Wallets | A purchasable bundle of tokens at a fixed USD price.                            |
| `wallet_transactions` | wallet | Wallets | One ledger entry per balance movement — today only card top-ups through Stripe. |

## Fields

| Table            | Fields                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `users`          | id, email, password_hash, first_name, last_name, phone_number, date_of_birth, address, avatar_url, role, is_active, created_at, updated_at |
| `refresh_tokens` | id, user_id, token_hash, expires_at, revoked_at, created_at                                                                                |
| `movies`         | id, title, synopsis, poster_url, duration_minutes, language, release_date, rating, is_active, created_at, updated_at                       |
| `genres`         | id, name                                                                                                                                   |
| `movie_genres`   | movie_id, genre_id                                                                                                                         |
| `halls`          | id, name, hall_type, is_active, created_at, updated_at                                                                                     |
| `seats`          | id, hall_id, seat_row, seat_column, seat_label, is_active                                                                                  |
| `showtimes`      | id, movie_id, hall_id, show_date, show_time, end_time, base_price, status, created_at, updated_at                                          |
| `seat_holds`     | id, showtime_id, seat_id, user_id, reservation_id, status, held_until, created_at                                                          |
| `reservations`   | id, reservation_number, user_id, showtime_id, status, created_at, updated_at                                                               |
| `tickets`        | id, reservation_id, seat_id, ticket_number, price, status, created_at                                                                      |

Wallet tables (DDR-024):

| Table                 | Fields                                                                                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wallets`             | id, user_id, balance, stripe_customer_id, created_at, updated_at                                                                                               |
| `token_packages`      | id, code, name, tokens, price_cents, currency, is_active, sort_order, created_at, updated_at                                                                   |
| `wallet_transactions` | id, wallet_id, type, status, tokens, amount_cents, currency, token_package_id, stripe_payment_intent_id, failure_code, failure_message, created_at, updated_at |

`wallets.balance` is the one stored summary in the design. DDR-024 explains why it does not
drift: only the transaction that settles a ledger row may write it.

Three values a first pass would have stored are deliberately absent — `showtimes.available_seats`,
`halls.total_seats`, `reservations.total_seats` / `total_amount`. All are computed on read
instead (DDR-003, DDR-010) and surface through the [views](views.md).

## Relationships

Cardinality reads parent : child. Participation is the child's — whether its foreign key may
be null (Optional) or must be set (Mandatory).

| Relationship                        | Cardinality | Participation | Foreign key                 | On delete |
| ----------------------------------- | ----------- | ------------- | --------------------------- | --------- |
| USERS issues REFRESH_TOKENS         | 1 : 0..N    | Optional      | `refresh_tokens.user_id`    | CASCADE   |
| USERS places SEAT_HOLDS             | 1 : 0..N    | Mandatory     | `seat_holds.user_id`        | RESTRICT  |
| USERS makes RESERVATIONS            | 1 : 0..N    | Mandatory     | `reservations.user_id`      | RESTRICT  |
| MOVIES tagged via MOVIE_GENRES      | 1 : 0..N    | Mandatory     | `movie_genres.movie_id`     | CASCADE   |
| GENRES classifies MOVIE_GENRES      | 1 : 0..N    | Mandatory     | `movie_genres.genre_id`     | RESTRICT  |
| MOVIES scheduled as SHOWTIMES       | 1 : 0..N    | Mandatory     | `showtimes.movie_id`        | RESTRICT  |
| HALLS contains SEATS                | 1 : 0..N    | Mandatory     | `seats.hall_id`             | RESTRICT  |
| HALLS hosts SHOWTIMES               | 1 : 0..N    | Mandatory     | `showtimes.hall_id`         | RESTRICT  |
| SEATS held as SEAT_HOLDS            | 1 : 0..N    | Mandatory     | `seat_holds.seat_id`        | RESTRICT  |
| SEATS ticketed as TICKETS           | 1 : 0..N    | Mandatory     | `tickets.seat_id`           | RESTRICT  |
| SHOWTIMES has SEAT_HOLDS            | 1 : 0..N    | Mandatory     | `seat_holds.showtime_id`    | RESTRICT  |
| SHOWTIMES reserved for RESERVATIONS | 1 : 0..N    | Mandatory     | `reservations.showtime_id`  | RESTRICT  |
| RESERVATIONS confirms SEAT_HOLDS    | 0..1 : 0..N | Optional      | `seat_holds.reservation_id` | RESTRICT  |
| RESERVATIONS yields TICKETS         | 1 : 0..N    | Mandatory     | `tickets.reservation_id`    | RESTRICT  |

The wallet tables (DDR-024). Every foreign key is indexed (ADR-013):

| Relationship                                    | Cardinality | Participation | Foreign key                            | On delete |
| ----------------------------------------------- | ----------- | ------------- | -------------------------------------- | --------- |
| USERS owns WALLETS                              | 1 : 1       | Mandatory     | `wallets.user_id` (unique)             | RESTRICT  |
| WALLETS records WALLET_TRANSACTIONS             | 1 : 0..N    | Mandatory     | `wallet_transactions.wallet_id`        | RESTRICT  |
| TOKEN_PACKAGES purchased as WALLET_TRANSACTIONS | 0..1 : 0..N | Optional      | `wallet_transactions.token_package_id` | RESTRICT  |

`token_package_id` is Optional because only `top_up` rows come from a package; the `payment`
and `refund` types DDR-024 reserves will not.

`seat_holds.reservation_id` starts NULL — a hold exists before it is confirmed — and is set
only at the moment DDR-002's transaction writes the reservation. That is why it reads
"Optional" even though every confirmed hold ends up with one.

### Delete rule convention

One rule governs all fourteen relationships, with two deliberate exceptions.

**RESTRICT by default.** USERS, MOVIES, GENRES, HALLS, SEATS, SHOWTIMES and RESERVATIONS are
never hard-deleted in normal operation — each has an `is_active` flag or a `status` field for
exactly this reason (ADR-010). RESTRICT means an accidental hard delete fails loudly instead
of silently destroying catalogue, seating or reservation history.

**CASCADE for `refresh_tokens.user_id`.** A refresh token has no meaning once its user is
gone and no reporting depends on it.

**CASCADE for `movie_genres.movie_id`.** A movie's genre tags are only meaningful together
with the movie. `genre_id` stays RESTRICT because GENRES is a small curated reference list —
deleting one while a movie still uses it should be deliberate, not a side effect.

### What a foreign key cannot express

A foreign key enforces "each child has exactly one parent". It cannot enforce "each parent
has at least one child". Two relationships need that, and both are business rules instead:

| Relationship           | Rule                                              | Enforced by |
| ---------------------- | ------------------------------------------------- | ----------- |
| MOVIES ↔ MOVIE_GENRES  | A published movie has at least one genre.         | BR-30       |
| RESERVATIONS ↔ TICKETS | A reservation is never written with zero tickets. | BR-31       |

Two constraints bound a relationship more tightly than "many": the partial unique index on
`seat_holds(showtime_id, seat_id) WHERE status IN ('held','confirmed')` (BR-17, ADR-007) and
the composite unique constraint on `tickets(reservation_id, seat_id)` (BR-20).
