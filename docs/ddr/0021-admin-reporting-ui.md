# DDR-021 — Admin reporting UI

Accepted · 11 Sep 2026 · Implements ADR-006, ADR-011, DDR-010

## Context

`@movea/api` already implements three admin reports (`GET /reports/revenue|capacity
|reservations`, ADR-011, admin-only per ADR-006) — no mobile UI existed for them before this
change; DDR-019 supplies the role gating that makes such a UI reachable. Each report is its
own aggregate query builder with no summary table (ADR-011) and no cross-report merge; the
mobile UI has to decide how to present three independently-paginated data sets without
inventing computed totals the backend deliberately doesn't provide.

## Decision

- A new `apps/mobile/src/features/admin/` slice for reporting (error/services/effect/hooks/
  screens), mirroring the same Effect-service + `Context.Tag` + `Layer` + React Query hook
  plumbing used by the rest of the app (`features/booking/effect/services/movies.ts`) and by
  the admin movie-management slice (DDR-020) — one data-fetching convention for the whole
  admin feature, not a second one for reports.
- Reports are one screen (`features/admin/screens/AdminReports`) switching between
  Revenue/Capacity/Reservations with the existing `Tabs` component, not a new bottom-sheet or
  segmented-control dependency.
- Each report is backed by its own paginated `useInfiniteQuery` — one query per report type,
  no merged query across report types. A page's numbers are exactly what
  `GET /reports/<type>` returns; there is no client-computed running total across pages.
- Currency and date/time rendering reuse the existing `utils/formats.ts` helpers (`formatIDR`,
  `formatDate`, `formatTime`) rather than new report-specific formatting.

## Why

- One query per report type matches how the backend already structures them — three
  independent endpoints, each its own `GROUP BY`/`COUNT`/`SUM` query builder (ADR-011).
  Merging them client-side would recompute, in the app, exactly what ADR-011 deliberately
  keeps as separate server-side aggregates.
- Not fabricating a cross-page running total follows the same principle DDR-003 and ADR-011
  already establish for this codebase: nothing computed is stored, and by extension nothing
  computed is invented on the client either — a page's numbers are exact and that is what is
  shown, rather than a total that could silently drift from the server's own aggregate.
- Reusing `Tabs` for the three-way switch avoids a new dependency for something the design
  system already does.
- Reusing the shared formatting helpers keeps report currency/date rendering consistent with
  the rest of the app (tickets, wallet) instead of a report-specific formatting path that
  could drift from it.

## Rejected

- **A bottom-sheet UI library for switching reports** — rejected: the existing `Tabs`
  component already does exactly this with no new dependency.
- **A single merged/combined report query** — rejected: would need a new backend aggregate
  endpoint nobody asked for, and throws away ADR-011's per-report clarity for no benefit.
- **A client-computed running total across pages** — rejected: DDR-003/ADR-011's "nothing
  computed is stored" reasoning extends to not fabricating on the client a number the server
  doesn't provide; a page's total could disagree with a true full-dataset total and mislead an
  admin who assumes it's the latter.

## Consequences

| Gains                                                                                                  | Costs accepted                                                                                                    |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Admins can browse revenue, capacity and reservations from the app, each exactly as the API reports it. | No always-visible running total (e.g. total revenue across all pages) — an admin has to page through to see more. |
| No new backend endpoint or dependency was needed — everything already existed.                         | No CSV or other export; the report is read-only in-app.                                                           |
| Report code shares one data-fetching convention with the rest of the admin feature.                    | Three separate `useInfiniteQuery` hooks and row renderers to maintain instead of one generic one.                 |

## Follow-up

- If a running total across the full report (not just the visible page) is requested, that
  needs a dedicated aggregate endpoint from `@movea/api` — do not approximate it by summing
  loaded pages client-side, which would be wrong the moment not every page has been fetched.
- CSV/export was not requested; treat it as a genuine gap to revisit if asked for, the same way
  DDR-018 tracks other named-but-unbuilt gaps.

## Revisit if

The admin needs a full-dataset total or export rather than a paginated browse — implement the
backend aggregate/export endpoint first, then build the UI against it, rather than
approximating either on the client.
