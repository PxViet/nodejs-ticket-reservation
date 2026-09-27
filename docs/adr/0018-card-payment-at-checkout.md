# ADR-018 — Card Payment at Checkout

Accepted · 26 Sep 2026 · Related: ADR-007, ADR-008, DDR-002, DDR-025 · Supersedes ADR-017

## Context

ADR-017 adopted Stripe so customers could buy token packages, with the idea that tokens would
later be spent at checkout. Two things changed:

- **Nothing ever spent the tokens.** `POST /reservations` still confirmed a booking for free,
  and the mobile Checkout compared a whole-token balance against a money total — two units
  that never meet. Closing that gap would need a token-to-dollar exchange rate, a debit, and a
  refund path for tokens as well as cards.
- **The product now asks for the simpler thing:** at checkout the customer picks a saved card,
  or adds one through Stripe's own UI, and pays the ticket price in US dollars. Each checkout
  is one entry in the customer's payment history. Wallets and packages go away.

The constraints ADR-017 listed still hold: card data is PCI-scoped, the amount must not be
client-controlled, a payment can finish after the request that started it (3-D Secure), and
DDR-002 forbids a network call inside the reservation-confirmation transaction.

The new one is ordering. A reservation must never exist without the money, and money must
never be kept without a reservation — yet the charge cannot sit inside the transaction that
writes the reservation.

## Decision

Stripe stays the payment provider. A reservation is paid for by card, in USD, at checkout,
and there is no other way to confirm one.

1. **Stripe stores the card; we never see it.** Each user gets a Stripe Customer, created
   lazily the first time they add a card. A card is added through **PaymentSheet in setup
   mode**, backed by a SetupIntent; the API only ever holds Stripe ids.
2. **The server prices and charges.** The client sends `{ holdIds, paymentMethodId }`. The
   API checks the card belongs to the caller's Customer, prices the charge as
   `showtimes.base_price × number of holds`, and creates and confirms the **PaymentIntent**
   itself with the payment row's id as the idempotency key.
3. **Charge, then confirm.** Checkout validates the holds and writes a `pending` payment row,
   commits, charges the card with no transaction open, and only then runs DDR-002's
   confirmation transaction — which also marks the payment `succeeded`. If the holds lapsed
   while the card was being charged, the charge is **refunded**, never kept.
4. **A signed webhook is the backstop.** `payment_intent.succeeded`, `payment_failed` and
   `canceled` settle any checkout the synchronous path or the client's poll did not. All three
   paths call one idempotent settle function (DDR-025).

`POST /reservations` — confirmation without payment — is removed. The wallet, the token
packages and the token ledger are dropped (DDR-025 supersedes DDR-024).

## Consequences

- A confirmed reservation always has exactly one succeeded payment behind it, enforced by a
  unique `payments.reservation_id` and a `CHECK` that a succeeded payment has a reservation.
- `SUM(tickets.price)` is now money actually captured, so revenue needs no new query.
- The seat-hold and reservation state machines are unchanged — no `pending_payment` status —
  so the `uq_seat_hold_active` index is untouched (ADR-008).
- **A 3-D Secure challenge that outlasts the ten-minute hold ends in a refund.** The customer
  is charged and refunded, and has to pick seats again. Accepted: it cannot double-sell a seat.
- **Checkout now depends on Stripe.** When Stripe is down, nobody can book. Browsing and
  holding seats still work.
- **Cancelling a reservation does not refund the card yet.** That is a known gap, tracked in
  DDR-025's follow-ups.
- The webhook remains the only unauthenticated write route, trusted through its signature.
- Checkout needs a dev build of the mobile app (native Stripe module) and the Stripe CLI to
  receive webhooks locally — unchanged from ADR-017.

## Rejected

- **Keep tokens and debit them at checkout** — needs an exchange rate, two refund paths
  (tokens and card) and a stored balance, for no product need the customer asked for.
- **Confirm, then charge** — write the reservation first and cancel it if the card fails. A
  declined card would briefly hold a confirmed booking and issue tickets for money never
  received, and doing it properly needs a `pending_payment` reservation status, which changes
  ADR-008's state machines and the index they guard.
- **Extend the hold while the customer pays** — changes DDR-001's fixed TTL for every hold to
  handle a rare 3-D Secure case, and still has to decide what happens when the extension runs
  out.
- **PaymentSheet in payment mode** — charges a new card on the device, with the client
  creating the payment. It would bypass the server pricing the charge.
- **Stripe Checkout (hosted page)** — leaves the app for a browser, and the customer cannot
  pick among saved cards on the in-app Checkout screen.
