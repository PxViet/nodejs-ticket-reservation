# Architecture Decision Records

Source: _Capstone Practice — Movie Reservation System — Architecture Decision Records_,
12–14 Aug 2026. All records are **Accepted**.

## ADR or DDR?

An **ADR** records a decision that shapes the whole system and would be expensive to
change — the framework, the database, the locking strategy. A **DDR**
([../ddr](../ddr/README.md)) records a decision made while implementing one: a specific
value, a step order, a response shape. The test is how hard it would be to reverse.

ADR-007 chose to lock seats with a hold and a database constraint; DDR-001 decides the hold
lasts ten minutes. **No decision appears in both documents.**

## Index

| ID                                                      | Title                                                       | Detailed by                        |
| ------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------- |
| [ADR-001](0001-nestjs-modular-monolith.md)              | NestJS Modular Monolith                                     | —                                  |
| [ADR-002](0002-postgresql-primary-datastore.md)         | PostgreSQL as Primary Datastore                             | —                                  |
| [ADR-003](0003-typeorm-with-pessimistic-locking.md)     | TypeORM as ORM with Pessimistic Locking                     | DDR-002                            |
| [ADR-004](0004-express-adapter.md)                      | Express Adapter (NestJS Default) for the HTTP Layer         | —                                  |
| [ADR-005](0005-self-issued-jwt-with-refresh-tokens.md)  | Self-Issued JWT with Revocable Refresh Tokens               | DDR-008, DDR-013                   |
| [ADR-006](0006-rbac-via-guards.md)                      | Role-Based Access Control via Guards                        | DDR-007, DDR-009, DDR-012          |
| [ADR-007](0007-two-layer-seat-locking.md)               | Two-Layer Seat Locking — TTL Hold plus Partial Unique Index | DDR-001, DDR-002                   |
| [ADR-008](0008-guarded-state-machines.md)               | Guarded State Machines for Seat Hold and Reservation        | —                                  |
| [ADR-009](0009-in-process-scheduled-jobs.md)            | In-Process Scheduled Jobs for Seat-Hold Expiry              | DDR-001                            |
| [ADR-010](0010-soft-delete-for-catalogue-entities.md)   | Soft Delete for Catalogue Entities                          | —                                  |
| [ADR-011](0011-reporting-as-indexed-aggregate-sql.md)   | Reporting as Indexed Aggregate SQL                          | DDR-003, DDR-010                   |
| [ADR-012](0012-rest-api-with-generated-openapi.md)      | REST API with Generated OpenAPI Documentation               | DDR-005, DDR-006, DDR-011, DDR-012 |
| [ADR-013](0013-index-all-foreign-keys.md)               | Index All Foreign Keys                                      | —                                  |
| [ADR-014](0014-docker-compose-for-local-and-grading.md) | Docker Compose for Local Development and Grading            | DDR-009                            |
| [ADR-015](0015-pnpm-workspace-monorepo.md)              | pnpm Workspace Monorepo for the API and the Mobile Client   | DDR-017                            |
| [ADR-016](0016-independent-per-app-ci-pipelines.md)     | Independent Per-App CI Pipelines in One Repository          | —                                  |
| [ADR-017](0017-stripe-as-payment-provider.md)           | Stripe as the Payment Provider for Token Top-Ups            | DDR-024                            |

## Numbering policy

Records are numbered in the order the decisions were taken, not grouped by subject. This log
is **append-only**: existing records are never renumbered, because other documents, commit
messages and review comments refer to them by number. A decision that is later reversed is
marked `Superseded` and a new record is added, rather than the original being edited or
removed.

## Earlier proposal revisions

An earlier revision of the proposal described a microservices edition — RabbitMQ, Clerk,
Stripe, seven deployables, thirty-one ADRs. It is **not** the design being built and its
numbering does not resolve against this log. It is not carried in this repository; the
records above are the current, authoritative set and are the ones the
[database design](../database/README.md) cites.

## Adding a record

Copy [`_template.md`](_template.md) to `NNNN-kebab-title.md` using the next unused number,
fill it in, and add a row to the index above. The `/decision-record` skill does this for you.
