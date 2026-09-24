# Business Rules

Forty rules, each with the mechanism that enforces it. Tables and keys (Phase 3) and
relationships and delete rules (Phase 4) cannot express a rule about the values inside a
column, the legal states a row may move through, or a constraint spanning more than one
table. Those are collected here.

## Value constraints

Column-level rules, enforced as CHECK constraints.

| ID    | Rule                                                                    | Source                 |
| ----- | ----------------------------------------------------------------------- | ---------------------- |
| BR-01 | `users.role` is `user` or `admin`, default `user`                       | ADR-006                |
| BR-02 | `movies.duration_minutes` is greater than 0                             | MOVIES field spec      |
| BR-03 | `movies.rating` is null or between 0.0 and 10.0                         | MOVIES field spec      |
| BR-04 | `halls.hall_type` is `2D`, `3D` or `IMAX`                               | HALLS field spec       |
| BR-05 | `seats.seat_column` is greater than 0                                   | SEATS field spec       |
| BR-06 | `showtimes.status` is `scheduled`, `active`, `completed` or `cancelled` | SHOWTIMES field spec   |
| BR-07 | `showtimes.base_price` is 0 or greater                                  | One price per showtime |
| BR-08 | `seat_holds.status` is `held`, `confirmed`, `released` or `expired`     | ADR-008                |
| BR-09 | `reservations.status` is `confirmed`, `cancelled` or `completed`        | ADR-008                |
| BR-10 | `tickets.status` is `valid` or `cancelled`                              | TICKETS field spec     |
| BR-11 | `tickets.price` is 0 or greater                                         | TICKETS field spec     |

## Uniqueness constraints

| ID    | Rule                                                                               | Mechanism            | Source  |
| ----- | ---------------------------------------------------------------------------------- | -------------------- | ------- |
| BR-12 | `users.email` is unique                                                            | UNIQUE               | —       |
| BR-13 | `genres.name` is unique                                                            | UNIQUE               | —       |
| BR-14 | `halls.name` is unique                                                             | UNIQUE               | —       |
| BR-15 | `(hall_id, seat_label)` is unique on SEATS                                         | UNIQUE               | —       |
| BR-16 | `(hall_id, show_date, show_time)` is unique on SHOWTIMES                           | UNIQUE               | —       |
| BR-17 | `(showtime_id, seat_id)` is unique on SEAT_HOLDS while status is held or confirmed | Partial unique index | ADR-007 |
| BR-18 | `reservation_number` is unique on RESERVATIONS                                     | UNIQUE               | DDR-004 |
| BR-19 | `ticket_number` is unique on TICKETS                                               | UNIQUE               | DDR-004 |
| BR-20 | `(reservation_id, seat_id)` is unique on TICKETS                                   | UNIQUE               | —       |

**BR-17 is the overbooking guarantee.** It is the database-level half of ADR-007.

## Reference number formats

| ID    | Rule                                                                                                                                                                                            | Mechanism                  | Source  |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------- |
| BR-21 | `reservation_number` matches `RSV-YYYYMMDD-XXXXXX` (6 base-36 characters). Generated inside the reservation transaction; a collision against BR-18 is retried and never surfaced to the client. | Application — Reservations | DDR-004 |
| BR-22 | `ticket_number` matches `TKT-{reservation suffix}-{seat sequence}`. A collision against BR-19 is retried the same way.                                                                          | Application — Reservations | DDR-004 |

## State machine guards

The transitions ADR-008 defined, restated as enforcement rules.

| Entity                | Legal transitions                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `seat_holds.status`   | HELD → CONFIRMED / RELEASED / EXPIRED; CONFIRMED → RELEASED. Any other transition — including EXPIRED → CONFIRMED or RELEASED → HELD — is illegal. |
| `reservations.status` | CONFIRMED → CANCELLED (only while the showtime has not started, BR-29) / COMPLETED. Any other transition is illegal.                               |

| ID    | Rule                                                                                  | Mechanism                        | Source  |
| ----- | ------------------------------------------------------------------------------------- | -------------------------------- | ------- |
| BR-23 | An illegal `seat_holds.status` transition is rejected rather than silently applied.   | Application guard — Reservations | ADR-008 |
| BR-24 | An illegal `reservations.status` transition is rejected rather than silently applied. | Application guard — Reservations | ADR-008 |

## Concurrency and timing

| ID    | Rule                                                                                                                                                             | Mechanism                            | Source                                 |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------- |
| BR-25 | `seat_holds.held_until` is set to `created_at + 10 minutes` at insert.                                                                                           | Default value — Reservations         | DDR-001                                |
| BR-26 | A hold whose `held_until` has passed can never be confirmed, even if the sweep job has not run yet — re-checked inside the confirmation transaction.             | Guard inside the DDR-002 transaction | ADR-007, DDR-002                       |
| BR-27 | The seat-hold sweep job runs every 60 seconds and releases holds where `status = 'held'` and `held_until < NOW()`.                                               | Scheduled job (`@nestjs/schedule`)   | ADR-009, DDR-001                       |
| BR-28 | A showtime's `[show_time, end_time)` may not overlap another active showtime's interval in the same hall. `end_time` is computed from `movies.duration_minutes`. | Application guard — Showtimes        | Proposal — scheduling without conflict |

## Cross-table rules a constraint cannot express

Rules needing a join, a transaction, or knowledge of "now".

| ID    | Rule                                                                                                                                   | Mechanism                              | Source       |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------ |
| BR-29 | A reservation may be cancelled only while its showtime's `show_date` / `show_time` is still in the future.                             | Application guard — Reservations       | MO-13, R10   |
| BR-30 | A movie must have at least one MOVIE_GENRES row before it is exposed to public browsing (`is_active = true`).                          | Application guard — Movies, on publish | MO-05        |
| BR-31 | A reservation is written together with at least one ticket in a single transaction — a reservation can never exist with zero tickets.  | The DDR-002 transaction                | MO-11, MO-12 |
| BR-32 | A refresh token that is revoked (`revoked_at` is not null) or past its `expires_at` may never be accepted to issue a new access token. | Application guard — Auth               | ADR-005      |

BR-30 and BR-31 are the two gaps a foreign key cannot close — see
[README.md](README.md#what-a-foreign-key-cannot-express).

## Authorization and write rules

| ID    | Rule                                                                                                                                                                                                              | Mechanism                      | Source             |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------ |
| BR-33 | A client can never set their own role at signup; the role always defaults to `user` server-side. Only an existing admin can change another user's role.                                                           | DTO whitelist + RolesGuard     | MO-03, R3, ADR-006 |
| BR-34 | A user may act only on their own reservations and seat holds; ownership is checked from the authenticated user id, never a client-supplied value. An admin may read all reservations but not act as another user. | Application guard + RolesGuard | ADR-006            |

BR-33 is the rule DDR-007's `whitelist: true` enforces structurally, and DDR-009 is why no
route can create the first admin at all.

## Wallet and payment rules

Added by ADR-017 and DDR-024 for MO-21, enforced by `apps/api/src/modules/wallets/` and the
`AddWallets` migration.

| ID    | Rule                                                                                                                                                                           | Mechanism                                                     | Source           |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ---------------- |
| BR-35 | `wallets.balance` is a whole number of tokens and never below 0.                                                                                                               | CHECK                                                         | DDR-024          |
| BR-36 | A top-up's price, currency and token count come only from its `token_packages` row. The request carries a package id, never an amount.                                         | DTO whitelist + Application — Wallets                         | ADR-017, DDR-007 |
| BR-37 | A top-up is credited exactly once per PaymentIntent, whether the synchronous response or the webhook reports it first.                                                         | UNIQUE `stripe_payment_intent_id` + row-locked status guard   | ADR-017, DDR-024 |
| BR-38 | A payment method may be charged only if it belongs to the caller's own Stripe Customer; the customer is resolved from the authenticated user, never from a client-supplied id. | Application guard — Wallets                                   | ADR-017, BR-34   |
| BR-39 | Every user has exactly one wallet, created in the same transaction as the user.                                                                                                | UNIQUE `wallets.user_id` + the signup transaction             | DDR-024          |
| BR-40 | `wallet_transactions.status` moves only `pending → succeeded` or `pending → failed`; `balance` changes only in the transaction that makes the `succeeded` move.                | Application guard — Wallets, under a `pessimistic_write` lock | ADR-008, DDR-024 |
