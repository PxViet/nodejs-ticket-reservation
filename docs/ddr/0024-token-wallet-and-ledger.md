# DDR-024 — Token wallet and ledger

Accepted · 23 Sep 2026 · Implements ADR-017, ADR-008 · Supersedes DDR-010

## Context

DDR-010 was written for a design with no payment step, and it rejected a
`wallet_transactions` ledger because building one "would mean reintroducing payment
processing". That is now the requirement: customers buy tokens with a card through Stripe
(ADR-017, MO-21). DDR-018 asked that the wallet question be reopened only by superseding
DDR-010, which this record does.

ADR-017 settled _how money moves_. It left open where the balance lives, how a top-up is
recorded, what a package is, and how a credit is kept to exactly once when both the
synchronous response and a webhook can report the same payment.

## Decision

**Three tables**, all owned by a new Wallets module:

| Table                 | Shape                                                                                                                                                                                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wallets`             | One per user — `user_id` unique, RESTRICT. `balance` is whole tokens, `bigint`, `CHECK (balance >= 0)`. `stripe_customer_id` nullable and unique, set on first add-card.                                                                                                                                                  |
| `token_packages`      | Server-owned catalogue — `code` unique, `name`, `tokens > 0`, `price_cents > 0`, `currency` (`usd`), `is_active`, `sort_order`. Seeded; no admin UI yet.                                                                                                                                                                  |
| `wallet_transactions` | The ledger. `type` is `top_up` \| `payment` \| `refund` (the vocabulary `apps/mobile`'s `WalletTransactionSchema` already uses); `status` is `pending` \| `succeeded` \| `failed`. Records `tokens`, `amount_cents`, `currency`, `token_package_id`, a unique `stripe_payment_intent_id`, and a failure code and message. |

**The balance is stored, and moves only with a ledger row.** `wallets.balance` changes in the
same transaction that moves a `wallet_transactions` row to `succeeded`, with the wallet row
locked `pessimistic_write` first. No other code path writes `balance`.

**Settlement is idempotent.** `settleSucceeded(paymentIntentId)` locks the ledger row, returns
without change unless it is `pending`, then locks the wallet, adds the tokens and marks the row
`succeeded`. `settleFailed` does the same guard and records Stripe's code and message. The
synchronous top-up path and the webhook both call these functions, so a top-up is credited
exactly once (BR-37).

**Legal ledger transitions** are `pending → succeeded` and `pending → failed` — terminal
states never change (ADR-008's guarded-state-machine rule, applied to a new entity).

**Every user has a wallet from signup.** `AuthService.register()` creates the user and the
wallet in one transaction; the seed does the same for the admin; the migration backfills
`INSERT INTO wallets (user_id) SELECT id FROM users`.

**Revenue is unchanged for now.** Reports still use DDR-010's booked-value query. A top-up is
customer money held as tokens, not ticket revenue; revenue changes when tokens are spent on a
reservation, which is a separate follow-up.

## Why

- A stored balance is one row read for `GET /wallet` and one row lock for a future debit at
  checkout. Computing `SUM` over the ledger would need that same lock plus a growing scan.
- DDR-010's drift objection was to a total updated _separately_ from the facts it summarises.
  Here the balance and its ledger row are written in one transaction, and the `CHECK`
  constraint makes an overdraft a database error rather than a bug to find later.
- The ledger is the history `GET /wallet/transactions` pages through, and the reconciliation
  record against Stripe's dashboard.
- A server-side package row is what makes ADR-017's "the server prices" rule concrete: the
  request carries an id, never an amount.
- Keeping the mobile client's existing `type` vocabulary means its `features/wallet/**`
  screens can bind to the generated contract without renaming anything.

## Rejected

- **Balance computed on read as `SUM` over succeeded ledger rows** — nothing can drift, but a
  debit at checkout must lock the wallet anyway to stop two concurrent spends, so the stored
  column costs nothing extra and saves the scan.
- **Balance as a column only, no ledger** — no history to show and nothing to reconcile a
  disputed charge against.
- **Client-supplied amount with server-side min/max limits** — the existing mobile
  `TOP_UP_MIN_AMOUNT`/`TOP_UP_MAX_AMOUNT` approach. It still lets the client pick the price,
  and it does not fit fixed packages with bonus tokens.
- **Fractional tokens or a `numeric` balance** — no product need, and integer arithmetic
  keeps the `CHECK` and future debits exact.
- **Creating the wallet lazily on first `GET /wallet`** — every reader would then have to
  handle "no wallet yet", and BR-39's one-wallet-per-user rule would hold only eventually.

## Consequences

| Gains                                                                                | Costs accepted                                                                                                                         |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| One-row balance reads; debits at checkout will serialise on a single row lock.       | A stored summary value again — correct only because exactly one code path writes it. A second writer would reintroduce DDR-010's risk. |
| Double-crediting is prevented by a row-status guard and a unique index, not by luck. | Two short transactions per top-up plus a Stripe call between them; a crash between the two leaves a `pending` row for the webhook.     |
| Full top-up history for the customer and an audit trail against Stripe.              | Signup now writes two rows and must run in a transaction; any future user-creation path has to create the wallet too.                  |
| Prices change by editing a row, not by shipping a build.                             | Changing a package's price does not reprice `pending` top-ups already created from it — they charge what they were created with.       |

## Follow-up

- Build the Wallets module, the Stripe webhook and the migration (the implementation issue for
  ADR-017), then regenerate `@movea/api-contract`.
- Wire `apps/mobile/src/features/wallet/**` to the generated contract, replacing the stub
  `walletService`.
- Spending tokens at checkout: debit inside DDR-002's confirmation transaction, and write a
  new record for how revenue is recognised once a reservation is paid for in tokens.
- Admin management of `token_packages`, if packages need to change without a deploy.

## Revisit if

A token ever needs to be worth something other than a whole unit bought at a fixed package
price — partial refunds to card, multiple currencies, or expiring tokens would each change the
ledger's shape.
