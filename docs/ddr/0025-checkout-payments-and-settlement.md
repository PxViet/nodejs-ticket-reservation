# DDR-025 — Checkout payments and settlement

Accepted · 26 Sep 2026 · Implements ADR-018, ADR-008, DDR-002 · Supersedes DDR-024

## Context

ADR-018 replaces token top-ups with paying for a reservation by card at checkout. DDR-024's
wallet, packages and ledger no longer have a job. ADR-018 settled _that_ checkout charges
first and confirms second; it left open where the payment is recorded, how it is tied to the
holds before a reservation exists, and how a charge is settled exactly once when the
synchronous response, the client's poll and a webhook can all report it.

## Decision

**Two tables**, owned by a new Payments module:

| Table               | Shape                                                                                                                                                                                                                                                                                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `payment_customers` | One per user who has added a card — `user_id` unique, `stripe_customer_id` unique. Created lazily with `ON CONFLICT (user_id) DO NOTHING`. The migration copies existing `wallets.stripe_customer_id` values here so saved cards survive.                                                                                                                          |
| `payments`          | One per checkout attempt — `user_id`, `showtime_id`, `hold_ids uuid[]`, `reservation_id` (nullable, unique), `status`, `amount_cents > 0`, `currency` (`usd`), `payment_method_id`, `card_brand`, `card_last4`, unique `stripe_payment_intent_id` and `stripe_refund_id`, failure code and message. `CHECK (status <> 'succeeded' OR reservation_id IS NOT NULL)`. |

**Status** is `pending → succeeded | failed | refunded`; terminal states never change
(ADR-008). `refunded` means the card was charged, the holds were gone by the time we tried to
confirm, and the money went back.

**Checkout order** (`CheckoutService.checkout`):

1. Check the card belongs to the caller's Customer (Stripe call, no transaction).
2. Transaction A: lock the caller's holds `pessimistic_write`, re-validate them, price them
   as `round(base_price × 100) × holds`, and insert a `pending` payment. If a pending payment
   already covers the exact same holds with the same card, **resume** it instead; if one
   overlaps any other way, fail `PAYMENT_IN_PROGRESS`. Below Stripe's USD minimum of 50 cents,
   fail `PAYMENT_AMOUNT_TOO_SMALL`.
3. Create and confirm the PaymentIntent (no transaction). A decline settles `failed`.
4. On `succeeded`, finalize. On `requires_action` or `processing`, return and let the poll or
   the webhook finalize.

**`finalize` is the one idempotent settle.** Transaction B locks the **payment row first**,
returns unchanged unless it is `pending`, then runs DDR-002's steps unchanged — lock holds,
re-validate, write reservation, tickets and holds — and marks the payment `succeeded` with the
reservation id, all in one commit. If the holds fail re-validation, B rolls back, the charge
is refunded outside any transaction, and the payment settles `refunded`.

**Idempotency keys** are `customer-<userId>`, `payment-<paymentId>` and `refund-<paymentId>`.

**Ticket price comes from the payment**, `amount_cents / holds / 100`, not from the showtime
at confirm time, so tickets record what was actually charged.

## Why

- Locking the payment row before the holds gives every settle path one serialisation point
  and one lock order. Transaction A takes hold locks but only reads payments, so the two
  cannot deadlock.
- `hold_ids` ties a payment to its seats before any reservation exists, without adding a
  column to `seat_holds` next to the ADR-007 index.
- Resuming an identical pending payment makes a retried request after a timeout reuse the same
  PaymentIntent (same idempotency key), so a flaky network cannot charge twice.
- Copying the card brand and last four digits at checkout means the history list never calls
  Stripe.
- With every confirmed reservation paid for, `SUM(tickets.price)` is captured money. That
  closes DDR-010's "revisit when a payment step is added" without a new revenue query.

## Rejected

- **Keep DDR-024's ledger and add a `payment` type** — the ledger is keyed by a wallet and
  counts tokens; a card payment has neither.
- **`payment_id` on `seat_holds`** — a hold can be retried with a different card after a
  decline, so the column would be overwritten; and it puts a new write path on the table the
  overbooking index guards.
- **Stripe Customer id on `users`** — the Users module would own a Stripe concern, and the
  Payments module would have to write another module's table (ADR-001).
- **Price tickets from `showtimes.base_price` at confirm time** — an admin repricing a
  showtime mid-checkout would make tickets disagree with the charge.

## Consequences

| Gains                                                                                      | Costs accepted                                                                                                            |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| A reservation and its succeeded payment commit together; neither exists without the other. | Two transactions and a Stripe call per checkout; a crash between them leaves a `pending` row for the poll or the webhook. |
| Settling twice — sync, poll, webhook in any order — is a no-op after the first.            | A 3-D Secure challenge longer than the hold's ten minutes charges and then refunds.                                       |
| Full per-user payment history, including failed and refunded attempts.                     | Token balances and top-up history are dropped by the migration; only Stripe Customer ids are carried over.                |
| Revenue equals money captured, with no query change.                                       | A pending row whose PaymentIntent was never created (Stripe down at step 3) stays `pending` until the customer retries.   |

## Follow-up

- Refund the card when a customer cancels a reservation (`POST /reservations/:id/cancel`
  currently releases seats and keeps the charge).
- A sweep that fails `pending` payments with no PaymentIntent after the hold TTL has passed.
- Reject a checkout when too little of the hold's lifetime remains to finish 3-D Secure.

## Revisit if

More than one currency is sold, partial refunds are needed, or a reservation can be paid for
in more than one charge — each changes the one-payment-per-reservation shape.
