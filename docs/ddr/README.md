# Design Decision Records

Source: _Capstone Practice — Movie Reservation System — Design Decision Records_,
13–14 Aug 2026. All records are **Accepted**.

Each record has five parts: what forced the decision, what was decided, why, what it costs,
and what would make it worth revisiting.

## ADR or DDR?

An **ADR** ([../adr](../adr/README.md)) records a decision that shapes the whole system and
would be expensive to change. A **DDR** records a decision made while implementing one — a
value you could change this afternoon. ADR-007 chose to lock seats with a hold and a database
constraint; DDR-001 decides the hold lasts ten minutes. **No decision appears in both
documents.**

## Index

| ID                                                                | Title                                                       | Implements                         |
| ----------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------- |
| [DDR-001](0001-seat-hold-ttl-and-sweep-cadence.md)                | Seat-hold TTL duration and expiry sweep cadence             | ADR-007, ADR-009                   |
| [DDR-002](0002-reservation-confirmation-transaction.md)           | Reservation-confirmation transaction step order and locking | ADR-003, ADR-007                   |
| [DDR-003](0003-computed-seat-availability.md)                     | Computed seat availability instead of a stored counter      | ADR-011                            |
| [DDR-004](0004-reference-number-format.md)                        | Reservation and ticket reference number format              | —                                  |
| [DDR-005](0005-pagination-convention.md)                          | Pagination convention for list endpoints                    | ADR-012                            |
| [DDR-006](0006-error-response-shape.md)                           | Error response shape and global exception handling          | ADR-012                            |
| [DDR-007](0007-dto-validation-strategy.md)                        | DTO validation strategy                                     | ADR-006                            |
| [DDR-008](0008-configuration-and-logging.md)                      | Configuration and logging conventions                       | ADR-005                            |
| [DDR-009](0009-seed-data-admin-and-catalogue.md)                  | Seed data for the initial admin and demo catalogue          | ADR-006, ADR-014                   |
| [DDR-010](0010-revenue-recognition-without-payment.md)            | Revenue recognition without a payment step                  | ADR-011                            |
| [DDR-011](0011-one-indexed-pagination-convention.md)              | One-indexed pagination convention (supersedes DDR-005)      | ADR-012                            |
| [DDR-012](0012-users-module-endpoint-design.md)                   | Users module endpoint and permission design                 | ADR-006, ADR-012                   |
| [DDR-013](0013-password-change-endpoint.md)                       | Password change endpoint                                    | ADR-005                            |
| [DDR-014](0014-movies-genres-module-endpoint-design.md)           | Movies/Genres module endpoint design                        | ADR-001, ADR-006, ADR-010, ADR-012 |
| [DDR-015](0015-showtimes-halls-module-endpoint-design.md)         | Showtimes/Halls module endpoint design                      | ADR-001, ADR-006, ADR-010, ADR-012 |
| [DDR-016](0016-showtime-status-state-machine.md)                  | Showtime status state machine                               | ADR-008, ADR-010                   |
| [DDR-017](0017-workspace-layout-and-package-naming.md)            | Workspace layout and package naming                         | ADR-015, ADR-016                   |
| [DDR-018](0018-mobile-migration-scope-and-dead-code-retention.md) | Mobile migration scope and dead-code retention              | ADR-007, DDR-010                   |

## Open divergences from the code

One record currently disagrees with what is committed. It is flagged in a blockquote at the
foot of its record; the summary lives in [decisions-vs-code.md](../decisions-vs-code.md).

| Record  | Disagreement                                                |
| ------- | ----------------------------------------------------------- |
| DDR-007 | Record rejects `forbidNonWhitelisted`; the pipe enables it. |

## Adding a record

Copy [`_template.md`](_template.md) to `NNNN-kebab-title.md` using the next unused number,
fill it in, name the ADR it implements, and add a row to the index above. The
`/decision-record` skill does this for you.
