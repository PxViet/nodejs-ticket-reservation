# DDR-022 — Seat-hold creation re-checks heldUntil before inserting

Accepted · 21 Sep 2026 · Implements ADR-007, ADR-009, DDR-001, DDR-002

## Context

DDR-001 assumed the sixty-second sweep bounded how long a seat could be "falsely shown as
unavailable" to at most one extra minute. That assumption was wrong about where the gap
actually was: the availability read path (DDR-003) already excludes a `HELD` row whose
`heldUntil` has passed, regardless of whether the sweep has reached it yet
(`showtimes.service.ts`'s occupancy join is `status = confirmed OR (status = held AND
heldUntil > NOW())`). A seat has never been falsely shown as unavailable while waiting on the
sweep.

The gap was on the write side instead. `SeatHoldsService.holdSeats` created a new hold with a
plain insert, relying entirely on the partial unique index `uq_seat_hold_active` (`status IN
('held', 'confirmed')`, ADR-007) to reject a double-booking. That index knows nothing about
`heldUntil`. A `HELD` row past its expiry but not yet swept to `EXPIRED` still satisfied the
index, so a customer could see a seat correctly marked available, select it, and have the hold
request rejected with `SEAT_UNAVAILABLE` anyway — for up to 59 seconds, until the next sweep
tick.

## Decision

`holdSeats` runs in one transaction that first expires any `HELD` row for the requested
`(showtimeId, seatId)` pairs whose `heldUntil` has already passed, then inserts the new holds:

```ts
await manager.transaction(async (manager) => {
  await manager
    .createQueryBuilder()
    .update(SeatHold)
    .set({ status: SeatHoldStatus.EXPIRED })
    .where('showtimeId = :showtimeId', { showtimeId })
    .andWhere('seatId IN (:...seatIds)', { seatIds })
    .andWhere('status = :status', { status: SeatHoldStatus.HELD })
    .andWhere('heldUntil <= :now', { now: new Date() })
    .execute();

  return manager.save(SeatHold /* new hold rows */);
});
```

This is the same rule DDR-002 already applies to confirmation, and the read paths
(`findSeatOccupancyRows`, `findMyActiveHolds`) already apply to availability: re-check
`heldUntil`, never trust `status` alone. It now also applies to hold creation. The sweep keeps
running every sixty seconds (DDR-001, BR-27) but was already documented as non-load-bearing
for correctness (`seat-hold-sweep.service.ts`) — this closes the one place where that claim
wasn't yet true.

## Why

- Availability reads never depended on the sweep; only hold creation did. This was the one
  place where "shown available" and "actually bookable" could disagree.
- Doing the expiry update inside the same transaction as the insert costs nothing extra — it's
  one more statement over the connection that's already open, scoped to the exact seats about
  to be locked by the unique index.
- `uq_seat_hold_active` remains the actual overbooking guarantee (ADR-007); this change only
  makes sure a _stale_ row doesn't get credit for still blocking a seat it no longer holds.

## Rejected

- **Shorten the sweep interval (e.g. every 5s)** — narrows the window without closing it, and
  adds load to solve a problem that has a zero-cost fix at the write site.
- **Have the client retry on 409** — treats a server-side consistency bug as a client concern,
  and adds latency to every hold attempt on a busy showtime.
- **Re-check `heldUntil` for every active hold on the showtime before allowing any new hold** —
  unnecessary; only the specific requested seats can conflict.

## Consequences

| Gains                                                                                      | Costs accepted                                                         |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| A hold request can never fail against a seat the availability endpoint already shows free. | One extra `UPDATE` statement per hold request, scoped by index, cheap. |
| The sweep is now hygiene everywhere it touches seat holds, not just at confirmation.       | The `holdSeats` transaction does slightly more than a single insert.   |

## Follow-up

- DDR-001's Why section states the sweep bounds a "falsely shown unavailable" window on
  _availability_ — that was never accurate given DDR-003, and the real instance of the problem
  it was gesturing at (this record) was on the write path, not the read path. Left as written
  since records are append-only; this record is the correction.

## Revisit if

Seat-hold writes ever move off a single transaction against one database (e.g. sharding by
showtime), at which point the expire-then-insert step needs re-verifying for atomicity across
shards.
