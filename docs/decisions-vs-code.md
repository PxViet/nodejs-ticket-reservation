# Decisions vs. code

What the records say against what is committed on this branch. Keep this table honest — an
ADR that quietly disagrees with the code is worse than no ADR.

Last checked: 03 Sep 2026, on `chore/setup-monorepo` (the API moved to `apps/api` and the Expo
client joined as `apps/mobile`; API behaviour unchanged).

> **Paths in this table are workspace-relative.** Everything that was at the repository root
> before ADR-015 now sits under `apps/api/`.

## Implemented and matching

| Record  | Where                                                                                                                                                                                                                                                                                                                                                                      |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ADR-001 | `apps/api/src/app.module.ts`, `apps/api/src/modules/` — one Nest app, modules registered at root                                                                                                                                                                                                                                                                           |
| ADR-002 | `apps/api/src/database/data-source.options.ts` — `type: 'postgres'`                                                                                                                                                                                                                                                                                                        |
| ADR-003 | `apps/api/package.json` — `typeorm`, `@nestjs/typeorm`; migrations under `apps/api/src/database/migrations/`                                                                                                                                                                                                                                                               |
| ADR-004 | `apps/api/src/main.ts` — `NestFactory.create(AppModule)` with no adapter, i.e. Express                                                                                                                                                                                                                                                                                     |
| ADR-005 | `apps/api/src/modules/auth/` — bcrypt, RS256 JWT access token, SHA-256-hashed refresh tokens                                                                                                                                                                                                                                                                               |
| ADR-006 | `apps/api/src/common/decorators/roles.decorator.ts`, `apps/api/src/common/guards/roles.guard.ts`                                                                                                                                                                                                                                                                           |
| ADR-010 | `apps/api/src/modules/users/`, `apps/api/src/modules/movies/` — `is_active` flag + soft-delete `remove()`; `apps/api/src/modules/showtimes/showtimes.service.ts` — `remove()` moves `status` to `cancelled`; `ReservationsService`/`SeatHoldSweepService`/`ReservationCompletionSweepService` now cover the Reservations/SeatHolds transitions too                         |
| ADR-012 | `apps/api/src/main.ts` — `SwaggerModule` at `${apiPrefix}/docs`, URI versioning                                                                                                                                                                                                                                                                                            |
| ADR-014 | `docker-compose.yml`, `docker-compose.override.yml`, `apps/api/Dockerfile`, `apps/api/.env.example` — `app` and `postgres` now start together; migrations run on container start (`docker-entrypoint.sh`/`docker-entrypoint.dev.sh`); seed data already ran on `SeedService.onApplicationBootstrap`                                                                        |
| DDR-006 | `apps/api/src/common/filters/all-exceptions.filter.ts` — `{ statusCode, errorCode, message, timestamp }`                                                                                                                                                                                                                                                                   |
| DDR-008 | `apps/api/src/config/env.validation.ts` — Joi schema, `abortEarly: false`, boot-time failure                                                                                                                                                                                                                                                                               |
| DDR-011 | `apps/api/src/common/dto/pagination-query.dto.ts` — one-indexed pages, supersedes DDR-005                                                                                                                                                                                                                                                                                  |
| DDR-012 | `apps/api/src/modules/users/users.controller.ts`, `users.service.ts` — endpoint/permission design                                                                                                                                                                                                                                                                          |
| DDR-013 | `apps/api/src/modules/users/users.controller.ts` — `PATCH /users/me/password`                                                                                                                                                                                                                                                                                              |
| DDR-014 | `apps/api/src/modules/movies/genres.controller.ts`, `genres.service.ts`, `movies.controller.ts`, `movies.service.ts` — endpoint/permission design                                                                                                                                                                                                                          |
| ADR-013 | `apps/api/src/database/migrations/1787211926318-InitSchema.ts` — every FK indexed, plus the composite paths ADR-013 names                                                                                                                                                                                                                                                  |
| DDR-003 | `apps/api/src/modules/showtimes/showtimes.service.ts` — `findSeatOccupancyRows` is the one derivation behind both the seat map and the availability triple; no counter column exists                                                                                                                                                                                       |
| DDR-015 | `apps/api/src/modules/showtimes/halls.controller.ts`, `halls.service.ts`, `showtimes.controller.ts`, `showtimes.service.ts` — endpoint/permission design                                                                                                                                                                                                                   |
| DDR-016 | `apps/api/src/modules/showtimes/showtimes.service.ts` — `ALLOWED_TRANSITIONS`, `assertStatusTransition`, `assertModifiable`                                                                                                                                                                                                                                                |
| ADR-007 | `apps/api/src/modules/reservations/seat-holds.service.ts`, `seat-holds.controller.ts` — `POST /showtimes/:id/hold`; a `23505` on `uq_seat_hold_active` is caught and returned as `409 SEAT_UNAVAILABLE`. `seat-hold.controller.ts` adds `GET /seat-holds/me` (the caller's active holds, for resuming checkout) and `DELETE /seat-holds/:id` (voluntary `HELD → RELEASED`) |
| ADR-008 | `apps/api/src/modules/reservations/reservations.service.ts` — `confirmReservation` (HELD→CONFIRMED), `cancel` (CONFIRMED→CANCELLED, and the held's own CONFIRMED→RELEASED); `reservation-completion-sweep.service.ts` (CONFIRMED→COMPLETED); `seat-hold-sweep.service.ts` (HELD→EXPIRED)                                                                                   |
| ADR-009 | `apps/api/src/modules/reservations/seat-hold-sweep.service.ts` (60s, BR-27) and `reservation-completion-sweep.service.ts` (15-min, `'0 */15 * * * *'` — no `CronExpression.EVERY_15_MINUTES` constant exists) — both jobs now built                                                                                                                                        |
| DDR-001 | `apps/api/src/modules/reservations/entities/seat-hold.entity.ts` (10-minute `held_until` DB default), `seat-hold-sweep.service.ts` (60s sweep cadence)                                                                                                                                                                                                                     |
| DDR-002 | `apps/api/src/modules/reservations/reservations.service.ts` — `confirmReservation`: lock the holds (`pessimistic_write`), re-validate (`SEAT_HOLD_NOT_OWNED`/`SEAT_HOLD_EXPIRED`), then write — the exact DDR-002 order                                                                                                                                                    |
| DDR-004 | `apps/api/src/modules/reservations/utils/reference-number.util.ts` plus `withReferenceRetry` in `reservations.service.ts` — retries the whole confirmation attempt (not a `SAVEPOINT`) on a `23505`, regenerating both the reservation and ticket numbers                                                                                                                  |
| ADR-011 | `apps/api/src/modules/reports/reports.service.ts` — `getRevenueReport`/`getCapacityReport`/`getReservationsReport`, each a `GROUP BY`/`COUNT`/`SUM` query builder against indexed columns, no summary table                                                                                                                                                                |
| DDR-010 | `apps/api/src/modules/reports/reports.service.ts` — `getRevenueReport` filters `ticket.status = 'valid' AND reservation.status != 'cancelled'`, the exact DDR-010 predicate                                                                                                                                                                                                |
| ADR-015 | `pnpm-workspace.yaml`, `turbo.json`, `apps/api/`, `apps/mobile/`, `packages/api-contract/` — one workspace, one lockfile, one hook set                                                                                                                                                                                                                                     |
| ADR-016 | `.github/workflows/api-ci.yml` and `mobile-ci.yml` — separate path-filtered workflows, no `needs:` edge between them, one shared `setup-node-and-pnpm` action                                                                                                                                                                                                              |
| DDR-017 | `pnpm-workspace.yaml` (`apps/*`, `packages/*`), `@movea/*` package names, root `lint-staged` dispatching by path, `apps/api/Dockerfile.dockerignore`                                                                                                                                                                                                                       |
| DDR-019 | `apps/mobile/src/features/auth/hooks/useAuth.ts` (`isAdmin`), `apps/mobile/src/app/(main)/_layout.tsx` (`Stack.Protected guard={isAdmin}`), `apps/mobile/src/app/(main)/(tabs)/_layout.tsx` + `index.tsx`/`wallet.tsx`/`my-ticket.tsx`, `apps/mobile/src/constants/navigation.ts` (`ADMIN_NAVIGATION_BOTTOM_TABS`), `NavigationTabBar`/`TabBarItem`'s `bottomTabs` prop    |
| DDR-020 | `apps/mobile/src/features/admin/{schemas,error,services,effect,hooks,components,screens}` for movies — movie CRUD screens/services/hooks against the existing `/movies` endpoints; `apps/mobile/src/app/(main)/admin/movie-form.tsx`; `packages/api-contract/src/index.ts`'s `CreateMovieRequest`/`UpdateMovieRequest` aliases (no backend change)                         |
| DDR-021 | `apps/mobile/src/features/admin/{error,services,effect,hooks,screens}` for reports — the Revenue/Capacity/Reservations report screen against `/reports/*`; `packages/api-contract/src/index.ts`'s report row/page aliases (no backend change)                                                                                                                              |

## Diverging — needs a fix or a superseding record

| Record                   | Says                                                                               | Code does                                                                                                                                                                                             | Where                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| DDR-007                  | `forbidNonWhitelisted` deliberately **off**                                        | `forbidNonWhitelisted: true`                                                                                                                                                                          | `apps/api/src/app.module.ts`                                                |
| `docs/database/views.md` | Defines six database views                                                         | **None of them exist** — no `CREATE VIEW` anywhere; all six are rebuilt as query builders (two in Showtimes, three in Reports; `v_reservation_summary`'s logic is inlined into `ReservationsService`) | `1787211926318-InitSchema.ts`, `showtimes.service.ts`, `reports.service.ts` |
| `docs/database/views.md` | `v_showtime_seat_map` / `v_showtime_availability` are for "any authenticated user" | Both readings are public (DDR-015) — availability is catalogue data, auth begins at seat selection                                                                                                    | `showtimes.controller.ts`                                                   |
| `docs/database/views.md` | `total_seats` is never needed outside a specific showtime's availability           | `GET /halls` returns `totalSeats` per hall (DDR-015)                                                                                                                                                  | `halls.service.ts`                                                          |
| `docs/api/README.md`     | `GET /halls` is `Bearer, admin`                                                    | Public (DDR-015); the API doc has been updated to match                                                                                                                                               | `halls.controller.ts`                                                       |

Each is also flagged in a blockquote at the foot of its own record. Resolve them either way —
change the code, or supersede the record — but do not leave them silently disagreeing.

## Not yet built

Records that are accepted but have no code behind them yet. This is expected; the branch is
the application skeleton over a designed schema.

| Record | Waiting on                                                                                                                                                                                                                                            |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —      | Nothing currently outstanding. `DELETE /seat-holds/:id` (voluntary release) was the last endpoint left undocumented as _Planned_ in `docs/api/README.md` — it's now implemented in `seat-hold.controller.ts`, alongside the new `GET /seat-holds/me`. |

## Notes

- **Ownership checks (ADR-006, BR-34).** Wired up for real in the Users module (DDR-012), the
  Movies/Genres module (DDR-014), and now Reservations end to end: `SeatHoldsController`
  (`POST /showtimes/:id/hold`), `SeatHoldController` (`GET /seat-holds/me`,
  `DELETE /seat-holds/:id`) and `ReservationsController` (`POST /reservations`,
  `GET /reservations/:id`, `POST /reservations/:id/cancel`) all take `userId`/`currentUser`
  from `@CurrentUser()`, never the request body. `GET /reservations/:id` is owner-or-admin;
  `POST /reservations/:id/cancel` and `DELETE /seat-holds/:id` are deliberately owner-only
  (the latter returns `403 SEAT_HOLD_NOT_OWNED`, matching `docs/api/README.md`'s "Auth: Bearer,
  owner"), no admin override for either.
- **ADR-009 is now fully built.** The 60-second seat-hold sweep (`SeatHoldSweepService`)
  flips expired `held` rows to `expired` (BR-27); `findSeatOccupancyRows`'s `held_until > NOW()`
  join condition stays regardless — a hold can still be up to a minute stale before the next
  sweep tick, and the read path was always meant to be correct independent of the sweep having
  run. `ReservationCompletionSweepService` now covers the 15-minute half, flipping `CONFIRMED`
  reservations to `COMPLETED` once their showtime has finished.
- **Nothing flips `showtimes.status` from `scheduled`/`active` to `completed` as real time
  passes** — `ShowtimesService`'s `ALLOWED_TRANSITIONS` only fires on an admin `PATCH`. Both
  `ReservationCompletionSweepService` (has this showtime finished?) and
  `ReservationsService.cancel` (BR-29 — has it started?) therefore compute the answer from
  `show_date`/`show_time`/`end_time` directly via two new `time.util.ts` helpers
  (`dateTimeToInstant`, `showtimeEndInstant`), rather than trusting `showtime.status`. Revisit
  if a job is ever added to advance `showtime.status` itself — at that point the two sources of
  truth should be reconciled rather than left to agree by construction.
- **Judgment call: reservation cancellation cascades to its tickets.** ADR-008/BR-24 mandate
  `CONFIRMED → CANCELLED` on the reservation and, as the only way to actually free the seats,
  `CONFIRMED → RELEASED` on its `seat_holds` (BR-17's index depends on it). Neither ADR-008 nor
  `business-rules.md`'s "State machine guards" table says anything about `tickets.status` on
  cancellation — `ReservationsService.cancel` flips `VALID → CANCELLED` there too, since leaving
  tickets permanently `valid` under a cancelled reservation makes BR-10's `cancelled` value dead
  code, and DDR-010's revenue query already filters on `reservation.status` alone so this has no
  effect on revenue correctness either way. Revisit if a future record says otherwise.
- **The seed's `DDR-009` row is gone from "Not yet built".** The seed exists at
  `apps/api/src/database/seed/` and runs on application bootstrap; the old entry was stale.
- **Container images: one `production` target promoted through staging and production.**
  `apps/api/Dockerfile` has two targets — `development` (hot reload, full deps, used via the
  auto-merged `docker-compose.override.yml`) and `production` (lean, compiled, non-root).
  Staging and production intentionally build and run the _same_ `production` image, differing
  only by env vars/secrets supplied at deploy time (`docker compose -f docker-compose.yml up`
  with an environment-specific `--env-file`), not by separate Dockerfile targets — this is the
  basis the future CI/CD pipeline should build on rather than re-deciding.
- **Refresh token reuse detection.** ADR-005/BR-32 are satisfied by rotation + revocation.
  Detecting _reuse_ of an already-revoked token as a theft signal (and revoking the rest of
  that user's sessions in response) was considered and deliberately deferred — it needs a
  schema change (tracking token lineage) beyond what either record asks for.
- **Mobile auth is migrating off Supabase.** `apps/mobile` sign in, sign up, session
  bootstrap and sign out now call `@movea/api` (`/auth/register|login|refresh|logout|me`)
  via `apps/mobile/src/services/api/client.ts`; the token pair is persisted in
  `secureStorage`. OAuth (Google/Facebook) and the password-reset screens were removed or
  hidden — the API has no equivalent yet (`PATCH /users/me/password` exists for change, not
  reset). Movies, booking, wallet, tickets and profile still read Supabase directly, so
  `apps/mobile/src/services/supabase/client.ts` stays until those features migrate; until
  then `useAuthStore().user.id` is an `@movea/api` id that will not match Supabase rows.
- **Mobile showtimes and halls read the API; the client's cinema concept is gone from the
  booking path.** The showtime screen calls `GET /showtimes` (filtered by `movieId`, `date` and
  an optional `hallId`) and `GET /halls`, through
  `apps/mobile/src/features/booking/services/showtimes.ts`. The API has no cinema entity — a
  showtime belongs to a hall and nothing above it — so the screen now groups showtimes by hall
  and a `HallDropdown` fed by `GET /halls` took over from the GPS `LocationDropdown`, which
  reverse-geocoded the device and narrowed nothing. `schemas/showtime.ts` holds the API-shaped
  type; the legacy `schemas/cinema.ts` stays because the still-Supabase ticket, wallet and
  booking reads traverse `cinemaHall.cinema`. Deliberately left behind: the seat map is still
  fabricated client-side (`src/utils/data.ts`) rather than read from
  `GET /showtimes/:id/seats`, and `LocationDropdown` plus `services/cinema.ts` with its tag and
  layer are kept in the tree although nothing references them any more.
  **Stale as of this entry**: the seat map and holds are no longer fabricated — see the next
  bullet.
- **Mobile checkout and tickets now confirm through `@movea/api`'s reservations, with no
  payment step.** `apps/mobile`'s Seats screen already held seats through
  `POST /showtimes/:id/hold` (ADR-007); Checkout now calls the real `POST /reservations` with
  those `holdIds` (`features/booking/services/reservations.ts`,
  `hooks/useReservations.ts`) instead of the Supabase RPC `create_booking_with_payment`, and
  `features/ticket`'s list/detail screens read `GET /reservations/me` /
  `GET /reservations/:id` instead of Supabase's `tickets`/`bookings` tables. Deliberately not
  done: **no wallet debit** — `ConfirmReservationDto` has no payment field and `apps/api` has
  no wallet/payment module, so a confirmed reservation is currently free; `features/wallet/**`
  is untouched and unconnected to checkout. Also not done: ticket QR **validation** — the API
  has no scan/mark-used endpoint, so the QR code the detail screen renders is a
  client-generated, cosmetic value with no backend effect, and `useValidateTicket` /
  `ticketsService.validateTicket` (Supabase) are unused by this flow. `cinema.ts`,
  `booking.ts`'s Supabase reads, `tickets.ts`, and `ticketExpiration.ts` were left in place —
  now genuinely dead code on the paths this migrated, kept until a dedicated Supabase-removal
  pass. The pre-ADR-007 `reserveSeats`/`releaseSeats`/`reservationId` path (`services/booking.ts`,
  `store/booking.ts`) was already dead before this change (nothing set `reservationId`) and is
  still not deleted. See
  [DDR-018](ddr/0018-mobile-migration-scope-and-dead-code-retention.md) for the retention rule
  and the list of what's genuinely blocked on an API endpoint versus already out of scope by
  DDR-010.
- **Admin RBAC and admin movie management landed in the mobile app.** `useAuth()` now exposes
  `isAdmin` (DDR-019), `apps/mobile/src/app/(main)/(tabs)/_layout.tsx` swaps in
  `ADMIN_NAVIGATION_BOTTOM_TABS`, and the `index`/`wallet`/`my-ticket` tab route files each
  render admin content instead of the customer screen when the signed-in user is an admin —
  the same three tab slots, not a fourth tab or a second navigator. The one admin-only stack
  screen, `admin/movie-form`, is gated with `<Stack.Protected guard={isAdmin}>`, mirroring how
  `(auth)`/`(main)` are already gated by `isAuthenticated`. New `features/admin/` adds movie
  create/update/deactivate against the existing `/movies` endpoints (DDR-020 — an
  authenticated request already gets `includeInactive` per DDR-014, so no new backend
  endpoint was needed). Deliberately not built: poster **upload** (posterUrl is a pasted URL —
  no upload endpoint exists, same gap DDR-018 already names for avatars) and genre
  **management** (the form only selects from `GET /genres`; create/rename/delete was
  explicitly scoped out) — both DDR-020. A Revenue / Capacity / Reservations report screen
  against `/reports/*` (DDR-021, ADR-011) switches between the three with the existing `Tabs`
  component, each its own paginated query with no cross-page running total or export — a page
  shows exactly what that endpoint returns, matching ADR-011/DDR-003's "nothing computed is
  invented" stance. `packages/api-contract` gained named aliases only (`CreateMovieRequest`,
  `UpdateMovieRequest`, report row/page types, …) for schemas the OpenAPI generator already
  produced — no backend change, no `pnpm contract:generate` run.

## Keeping this current

Re-check when a module lands, and when a record is added or superseded. The
`/decision-record` skill reminds you to update this file.
