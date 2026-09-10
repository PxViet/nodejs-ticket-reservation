# DDR-018 — Mobile migration scope and dead-code retention

Accepted · 10 Sep 2026 · Related: ADR-007, DDR-010

## Context

`apps/mobile` is migrating feature-by-feature off Supabase onto `@movea/api` (see
`docs/decisions-vs-code.md`). A screen's data layer moves once its API endpoint exists;
until then it keeps calling Supabase. This leaves two open questions every time a screen
moves: what to do with the Supabase code the screen no longer calls, and which of the
remaining Supabase-only screens are actually waiting on API work versus waiting on nothing
at all.

The reservation/ticket pass that just landed is the concrete case: Checkout and the Ticket
screens moved onto `POST/GET /reservations`, which left `features/booking/services/booking.ts`,
`features/ticket/services/tickets.ts` + `ticketExpiration.ts`, and the pre-ADR-007
`reserveSeats`/`releaseSeats`/`reservationId` path unreferenced by those screens. Meanwhile
`features/wallet/**` and `features/booking/services/cinema.ts` remain Supabase-only with no
migration path decided yet.

## Decision

**Don't delete a feature's Supabase code when a screen stops calling it.** Leave the old
service, its hooks and its tests in place until an API endpoint exists, the screen is
repointed at it, and that change is verified — then delete the old code in the same change
that migrates it, not before. A superseded file is a candidate for a dedicated cleanup pass,
not for opportunistic deletion during an unrelated screen migration.

**Only count a Supabase-backed screen as "blocked on the API" if no ADR/DDR already puts it
out of scope.** Checked against the existing records for this pass:

- **Not a gap — already decided:** wallet balance, top-up and payment-on-checkout.
  DDR-010 already places payment processing out of scope for the whole system ("no payment
  processing or wallet"); `features/wallet/**` is a Supabase-era screen outside this
  system's actual design, not a roadmap item. Confirming a reservation via `@movea/api`
  correctly has no payment step (matches DDR-010) — this is not a bug to fix later.
- **Genuine gaps — no endpoint exists yet, revisit when one does:** ticket QR scan/validate
  (no scan-and-mark-used endpoint, no ticket status beyond `valid`/`cancelled`), avatar
  upload/delete (no file-upload endpoint), push-token registration (no endpoint), auth
  password-reset-by-email (only change-password exists, per DDR-013), and cinema data (no
  cinema entity in the API's showtime model at all — see `schemas/showtime.ts`).

## Why

- A mid-migration app has working screens on both sides of the boundary at once; deleting a
  file because one caller left it can silently break another caller that hasn't moved yet
  (`booking.ts`'s Supabase reads back more than just Checkout historically).
- Distinguishing "no endpoint yet" from "out of scope by design" stops a `TODO` from being
  invented for something the design already settled — DDR-010's no-payment decision would
  otherwise get silently re-litigated by whoever next reads a wallet-related comment as a gap.
- Costs nothing to defer: the code keeps compiling and its tests keep passing, so leaving it
  in place is a no-op until someone schedules the cleanup.

## Rejected

- **Delete a Supabase service as soon as the screen that drove its creation stops calling
  it** — rejected; several of these files (`booking.ts`, `cinema.ts`) are still reachable
  from other, not-yet-migrated call sites, and deleting on a per-screen basis risks losing
  working code with no replacement ready to catch the regression.
- **Treat the missing wallet/payment path as an API gap to close** — rejected; it isn't a
  gap, it's DDR-010's decision. Building wallet/payment support to satisfy the mobile screen
  would mean reversing an already-accepted ADR/DDR without superseding it.
- **A tracking issue instead of a decision record** — rejected for the retention rule
  specifically; "don't delete X before Y" is a convention the codebase should encode
  somewhere a future contributor deleting dead code will actually check, not something that
  lives only in an issue tracker.

## Consequences

| Gains                                                                                           | Costs accepted                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No screen loses functionality because an unrelated migration deleted code it still depended on. | Confirmed-dead code (superseded services, the pre-ADR-007 seat-reservation path) lingers in the tree — larger surface, more to read past — until a cleanup pass runs. |
| A future contributor has one place to check before assuming "unused" means "safe to delete."    | Nothing enforces the retention rule mechanically; it relies on this record being read.                                                                                |
| The wallet/payment question stops being re-asked every time a mobile screen moves.              |                                                                                                                                                                       |

## Follow-up

- Dead code currently held under this rule, for the eventual cleanup pass:
  `features/booking/services/booking.ts` (Supabase reads only — `createBooking`,
  `cancelBooking`, `getBookings*`), `features/ticket/services/tickets.ts` +
  `ticketExpiration.ts`, `features/booking/hooks/useReserveSeats`/`useReleaseSeats`, and
  `store/booking.ts`'s `reservationId`/`setReservationId` (already dead before this DDR —
  nothing sets it).
- Genuinely open mobile-facing gaps to revisit as `@movea/api` grows, per screen: ticket
  scan/validate, avatar upload/delete, push-token registration, password-reset-by-email,
  cinema data. `features/wallet/**` and `features/booking/services/cinema.ts` stay
  Supabase-backed with no scheduled migration.

## Revisit if

`@movea/api` grows an endpoint for one of the genuine gaps above — migrate that feature and
delete its superseded Supabase code in the same change. Or: a dedicated Supabase-removal
pass is scheduled — delete everything in the Follow-up list at once rather than
opportunistically. Reopen the wallet/payment question only by superseding DDR-010 first,
not by adding mobile wallet work unilaterally.
