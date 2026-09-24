# ADR-017 — Stripe as the Payment Provider for Token Top-Ups

Accepted · 23 Sep 2026 · Related: ADR-005, ADR-008, DDR-002, DDR-024

## Context

Customers are to buy tokens with a card: every account gets a wallet, the customer picks a
token package, adds a card, reviews the bill and pays (MO-21). Until now the design had no
payment step at all — DDR-010 and the Out of Scope table in
[mission-objectives.md](../database/mission-objectives.md) excluded it, and `apps/mobile`'s
`features/wallet/**` screens have sat on a stub service since the Supabase migration
(DDR-018).

Taking card payments brings constraints this codebase has never had to meet:

- **Card data is PCI-scoped.** Anything that stores, logs or even transits a card number
  pulls the API, its database and its logs into PCI DSS scope.
- **The amount must not be client-controlled.** BR-33's principle — a client never sets a
  value the server owns — applies with money attached.
- **A payment can finish after the request that started it.** 3-D Secure challenges and
  asynchronous settlement mean the HTTP response is not always the final word, so the credit
  cannot depend on the client coming back.
- **A network call to a payment provider is slow and can fail halfway.** DDR-002 already
  forbids a network call inside a database transaction.

An earlier microservices revision of the proposal named Stripe (see the ADR index); this is
the first time the current design adopts it.

## Decision

Stripe is the payment provider. The integration follows four rules:

1. **Stripe stores the card; we never see it.** Each wallet gets a Stripe Customer, created
   lazily the first time the customer adds a card — never at signup, so registration makes no
   external call. A card is added with a **SetupIntent** confirmed on the device by Stripe's
   own sheet; the API only ever holds Stripe ids (`cus_…`, `pm_…`, `pi_…`).
2. **The server prices and charges.** The client sends `{ tokenPackageId, paymentMethodId }`
   and nothing else. The API reads the price from `token_packages`, checks the payment method
   belongs to the caller's Stripe Customer, and creates and confirms the **PaymentIntent**
   itself, with the ledger row's id as Stripe's idempotency key.
3. **No Stripe call inside a database transaction.** A top-up writes a `pending` ledger row
   and commits, calls Stripe, then settles the row in a second short transaction — the same
   separation DDR-002 applies to reservation confirmation.
4. **A signed webhook is the backstop.** `payment_intent.succeeded` and
   `payment_intent.payment_failed`, verified against the endpoint's signing secret, settle
   any top-up the synchronous path did not. Both paths call one idempotent settle function, so
   a top-up is credited exactly once whichever arrives first (DDR-024).

The API gains the `stripe` server SDK and three variables — `STRIPE_SECRET_KEY`,
`STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` — added to `env.validation.ts` and
`.env.example` when the module is built (DDR-008). `apps/mobile` will gain
`@stripe/stripe-react-native`, pinned exactly per ADR-015. The wallet's shape, ledger and
settlement rules are DDR-024.

## Consequences

- No card number ever reaches our API, database or logs; PCI scope stays at the lightest
  self-assessment level Stripe's hosted elements allow.
- The amount charged always comes from a server-side row, so a tampered client can pay less
  only by changing what the database says.
- A top-up whose 3-D Secure challenge finishes after the request returns, or whose client
  crashes mid-payment, is still credited — by the webhook.
- **A new external dependency on the critical path.** When Stripe is down, nobody can buy
  tokens. That is accepted: nothing else in the system (browsing, holds, reservations)
  depends on it until tokens are spent at checkout.
- **The webhook route is the first unauthenticated write endpoint.** It is trusted only
  through signature verification, needs the raw request body (`rawBody: true` in `main.ts`)
  and is exempt from JWT and the throttler.
- **Local development needs the Stripe CLI** (`stripe listen --forward-to …`) to receive
  webhooks, and CI needs dummy keys to boot the app.
- The mobile client needs a native module, so Expo Go no longer runs the wallet flow — a dev
  build is required.
- Two sources of truth for a payment exist — Stripe's PaymentIntent and our ledger row — kept
  consistent only by the idempotent settle function and the unique
  `stripe_payment_intent_id`.

## Rejected

- **Creating or confirming the PaymentIntent on the client** — the client would choose the
  amount, and the credit would depend on the client reporting success honestly.
- **Stripe Checkout (hosted page)** — no PCI concern, but it leaves the app for a browser and
  back, which breaks the add-card → review bill → pay modal flow the existing mobile UI is
  built around.
- **Storing card details ourselves and charging through a gateway** — puts the API, database
  and logs in full PCI scope for no product gain.
- **Charging a new card every time with no saved card (PaymentSheet in payment mode only)** —
  simpler, but it removes the separate "review the final bill" step before money moves.
- **Trusting the synchronous response alone, with no webhook** — a 3-D Secure payment or a
  client that dies after paying would be charged and never credited.
- **Another payment provider** — nothing in the requirements favours one; Stripe has the
  most complete React Native SDK and test tooling, and the earlier proposal had already
  chosen it.
