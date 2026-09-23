# DDR-010 — Revenue recognition without a payment step

Superseded by DDR-024 · 14 Aug 2026 · Implements ADR-011 · Related: DDR-003

## Context

MO-17 requires revenue reporting by period, movie and showtime. The approved Proposal has no
payment processing or wallet (Out of Scope) — a reservation confirms atomically with no
payment step, so there is no payment or settlement event to derive revenue from.

## Decision

Revenue is derived directly from confirmed reservations, not from a payment ledger. A
ticket's price counts as revenue the moment its reservation is confirmed or completed;
cancelling the reservation removes it from every future revenue query through the same status
filter, with no refund record needed.

```sql
SELECT m.title, SUM(t.price) AS revenue
FROM tickets t
JOIN reservations r ON r.id = t.reservation_id
JOIN showtimes s    ON s.id = r.showtime_id
JOIN movies m       ON m.id = s.movie_id
WHERE r.status != 'cancelled'
  AND s.show_date BETWEEN :from AND :to
GROUP BY m.title;
```

## Why

- No payment or refund concept exists to reconcile against — `confirmed` is the only
  revenue-relevant state.
- The same status that governs seat availability (DDR-003) and cancellation also governs
  revenue, so a reservation can never show as cancelled in one report and still contribute to
  another.
- Costs nothing to add: no new table, field, or scheduled job — one more query on the same
  aggregate-SQL approach already used for capacity (ADR-011).
- Matches DDR-003's principle throughout this design: compute on read, don't store and
  reconcile.

## Rejected

- **A `wallet_transactions`-style ledger recording each charge** — this is exactly the
  mechanism the Proposal's Out of Scope removes; building it would mean reintroducing payment
  processing just to populate a report.
- **A stored `total_revenue` or `total_amount` column, updated on confirm/cancel** —
  reintroduces the drift risk DDR-003 already rejected for seat counters: a missed update on
  cancellation would silently overstate revenue.
- **Recognizing revenue at reservation creation rather than confirmation** — moot here, since
  reservations confirm atomically (ADR-007, DDR-002); there is no separate pending state to
  distinguish creation from confirmation.

## Consequences

| Gains                                                                                                    | Costs accepted                                                                                                                            |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Revenue reporting needs no new schema.                                                                   | "Revenue" here means booking value, not cash actually collected — acceptable only because no cash changes hands anywhere in this design.  |
| A cancelled reservation can never be double-counted or need a reversing entry.                           | If a real payment step is added in a later phase, this derivation must be revisited to recognize revenue at payment, not at confirmation. |
| Revenue and capacity reporting share one derivation pattern (ADR-011), so there is nothing new to learn. |                                                                                                                                           |

## Follow-up

- `reservations(status, showtime_id)` and `tickets(reservation_id)` are covered by ADR-013's
  foreign-key indexing so the revenue aggregate stays cheap.
- Note explicitly in the Reports module's API documentation that revenue means _booked value_,
  not collected payment, so a reviewer does not mistake one for the other.

## Revisit if

A payment step is ever added in a later phase — revenue would then need to key off a
payment/settlement event rather than reservation confirmation.
