# Views

Six views. ADR-011 decided that every reporting and availability figure is computed on read
with aggregate SQL, never written to a stored counter column. A stored `seats_available`
would need decrementing on hold, incrementing on release, and reconciling after every sweep
(BR-27) — three write paths that can drift out of sync with the SEAT_HOLDS rows that are the
actual source of truth. A view reads SEAT_HOLDS directly, so it is never out of date and
never needs its own update logic. This is DDR-003's principle applied to reporting.

Views are grouped by who reads them.

## Seat availability — Showtimes module

### `v_showtime_seat_map`

For one showtime, every seat in its hall with its current status. The seat-selection screen's
data source. Supports MO-09, MO-10.

```sql
CREATE VIEW v_showtime_seat_map AS
SELECT
  st.id      AS showtime_id,
  s.id       AS seat_id,
  s.seat_row,
  s.seat_column,
  s.seat_label,
  CASE
    WHEN sh.status = 'confirmed' THEN 'reserved'
    WHEN sh.status = 'held' AND sh.held_until > NOW() THEN 'held'
    ELSE 'available'
  END        AS seat_status,
  sh.held_until,
  sh.user_id AS held_by_user_id
FROM showtimes st
JOIN seats s ON s.hall_id = st.hall_id AND s.is_active = true
LEFT JOIN seat_holds sh
  ON sh.showtime_id = st.id AND sh.seat_id = s.id
  AND sh.status IN ('held', 'confirmed')
ORDER BY s.seat_row, s.seat_column;
```

### `v_showtime_availability`

One row per showtime with a seat count instead of a seat-by-seat list. Replaces the stored
`showtimes.available_seats` field. Supports MO-08.

```sql
CREATE VIEW v_showtime_availability AS
SELECT
  st.id        AS showtime_id,
  st.movie_id,
  st.hall_id,
  st.show_date,
  st.show_time,
  st.status    AS showtime_status,
  COUNT(s.id)  AS total_seats,
  COUNT(sh.id) FILTER (
    WHERE sh.status = 'confirmed'
       OR (sh.status = 'held' AND sh.held_until > NOW())
  )            AS seats_taken,
  COUNT(s.id) - COUNT(sh.id) FILTER (
    WHERE sh.status = 'confirmed'
       OR (sh.status = 'held' AND sh.held_until > NOW())
  )            AS available_seats
FROM showtimes st
JOIN seats s ON s.hall_id = st.hall_id AND s.is_active = true
LEFT JOIN seat_holds sh
  ON sh.showtime_id = st.id AND sh.seat_id = s.id
  AND sh.status IN ('held', 'confirmed')
GROUP BY st.id;
```

`total_seats` also stands in for the excluded `halls.total_seats` field — a hall's capacity
is `COUNT(seats) WHERE is_active`, and it never needs to be asked for outside the context of
a specific showtime's availability.

## Reservations — Reservations module

### `v_reservation_summary`

One row per reservation with its seat count and total charged. Replaces the stored
`reservations.total_seats` and `reservations.total_amount` fields. Supports MO-11, MO-12.

```sql
CREATE VIEW v_reservation_summary AS
SELECT
  r.id        AS reservation_id,
  r.reservation_number,
  r.user_id,
  r.showtime_id,
  r.status    AS reservation_status,
  r.created_at,
  COUNT(t.id) AS total_seats,
  COALESCE(SUM(t.price) FILTER (WHERE t.status = 'valid'), 0) AS total_amount
FROM reservations r
LEFT JOIN tickets t ON t.reservation_id = r.id
GROUP BY r.id;
```

Every write path that creates a reservation writes it together with at least one ticket in
the same transaction (BR-31, DDR-002), so `total_seats` is never zero for a row this view
returns.

## Admin reporting — Reports module

All three are admin-only and built as aggregate SQL per ADR-011, not by a scheduled job
writing to a summary table.

### `v_admin_revenue`

Revenue grouped by day and by movie. Supports MO-17.

```sql
CREATE VIEW v_admin_revenue AS
SELECT
  st.show_date,
  m.id        AS movie_id,
  m.title     AS movie_title,
  COUNT(t.id) AS tickets_sold,
  SUM(t.price) AS revenue
FROM tickets t
JOIN reservations r ON r.id = t.reservation_id
JOIN showtimes st   ON st.id = r.showtime_id
JOIN movies m       ON m.id = st.movie_id
WHERE t.status = 'valid'
  AND r.status <> 'cancelled'
GROUP BY st.show_date, m.id, m.title;
```

Per DDR-010 this is the whole revenue mechanism. DDR-024 has since superseded DDR-010 and
planned a `wallet_transactions` ledger for token top-ups, but it keeps this query as-is: a
top-up is customer money held as tokens, not ticket revenue, and tokens cannot yet be spent
on a reservation. Revenue for any period or movie is `SUM(tickets.price)`
for tickets still valid on a reservation that was never cancelled; a caller filters by
`show_date` to get "a given period". Because there is exactly one price per showtime (BR-07)
and it is copied onto `tickets.price` at issue time, this figure never needs a join to a
separate pricing or discount table.

### `v_admin_showtime_occupancy`

Capacity and occupancy per showtime. Supports MO-18.

```sql
CREATE VIEW v_admin_showtime_occupancy AS
SELECT
  st.id      AS showtime_id,
  m.title    AS movie_title,
  h.name     AS hall_name,
  st.show_date,
  st.show_time,
  v.total_seats,
  v.seats_taken,
  ROUND(v.seats_taken::numeric / NULLIF(v.total_seats, 0) * 100, 1) AS occupancy_pct
FROM v_showtime_availability v
JOIN showtimes st ON st.id = v.showtime_id
JOIN movies m     ON m.id = st.movie_id
JOIN halls h      ON h.id = st.hall_id;
```

### `v_admin_all_reservations`

Every reservation across every customer, with customer, showtime and totals in one row.
Supports MO-19.

```sql
CREATE VIEW v_admin_all_reservations AS
SELECT
  vrs.reservation_id,
  vrs.reservation_number,
  u.email     AS customer_email,
  u.first_name,
  u.last_name,
  m.title     AS movie_title,
  st.show_date,
  st.show_time,
  vrs.reservation_status,
  vrs.total_seats,
  vrs.total_amount,
  vrs.created_at
FROM v_reservation_summary vrs
JOIN users u      ON u.id = vrs.user_id
JOIN showtimes st ON st.id = vrs.showtime_id
JOIN movies m     ON m.id = st.movie_id;
```

Built on `v_reservation_summary` rather than repeating the SUM/COUNT logic a second time —
the admin-facing row is the customer-facing row plus identity and movie context an ordinary
customer endpoint would never need.

## Access rules

This design has **no database-level row security** — no Postgres RLS, unlike the
Supabase-backed mobile app it replaces. Access is enforced once, in the NestJS service layer,
per ADR-006 and BR-33/BR-34. Each view is a plain SELECT with no built-in filtering by the
caller; the module that owns it adds the WHERE clause or guard the caller's role requires.

| View                         | Who may query it                                                                     | Enforcement                                |
| ---------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------ |
| `v_showtime_seat_map`        | Any authenticated user, unfiltered — seat availability is not customer-specific.     | `RolesGuard`: authenticated (Showtimes)    |
| `v_showtime_availability`    | Any authenticated user, unfiltered.                                                  | `RolesGuard`: authenticated (Showtimes)    |
| `v_reservation_summary`      | A user may query only rows where `user_id` is their own; an admin may query any row. | Ownership check, not a view filter (BR-34) |
| `v_admin_revenue`            | Admin only.                                                                          | `RolesGuard`: `role = admin` (Reports)     |
| `v_admin_showtime_occupancy` | Admin only.                                                                          | `RolesGuard`: `role = admin` (Reports)     |
| `v_admin_all_reservations`   | Admin only.                                                                          | `RolesGuard`: `role = admin` (Reports)     |
