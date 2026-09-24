# Documentation

Design record for the Movie Reservation System capstone. The source documents are Word
files; these pages are the in-repo, greppable, linkable version of them.

| Area                                         | What it holds                                                                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [adr/](adr/README.md)                        | 14 Architecture Decision Records — framework, database, locking strategy                                                         |
| [ddr/](ddr/README.md)                        | 14 Design Decision Records — the values and conventions underneath the ADRs                                                      |
| [database/](database/README.md)              | 11 tables, 14 relationships, 34 business rules, 6 views                                                                          |
| [api/](api/README.md)                        | REST API reference — every endpoint's request/response shape, pagination, error codes, and versioning; 30 implemented, 8 planned |
| [decisions-vs-code.md](decisions-vs-code.md) | What is implemented, what diverges, what is not built yet                                                                        |

## Where to start

- **New to the project?** [database/mission-objectives.md](database/mission-objectives.md)
  for what the system is for, then [adr/README.md](adr/README.md) for how it is built.
- **About to write code?** Find the ADR or DDR that governs the area, then check
  [decisions-vs-code.md](decisions-vs-code.md) for anything already known to diverge.
- **About to call or build an endpoint?** [api/README.md](api/README.md) is the request/response
  contract — conventions once, up front, then one entry per endpoint.
- **About to make a decision?** Run `/decision-record` — it picks the next number, uses the
  right template and updates the index.

## The one rule

An **ADR** is a decision that shapes the whole system and would be expensive to change. A
**DDR** is a decision made while implementing one — a value you could change this afternoon.
ADR-007 chose to lock seats with a hold and a database constraint; DDR-001 decides the hold
lasts ten minutes.

**No decision appears in both logs.** Both logs are append-only: never renumber, never delete.
A reversed decision is marked `Superseded` and a new record is added.

## Cross-reference map

The three layers cite each other by number. A change in one usually needs a change in the
others.

```text
Requirement (R1–R13)
  └─ Mission Objective (MO-01…MO-20)      docs/database/mission-objectives.md
       └─ ADR-001…014                     docs/adr/
            └─ DDR-001…010                docs/ddr/
                 └─ BR-01…BR-34           docs/database/business-rules.md
                      └─ view / index     docs/database/views.md
                           └─ endpoint     docs/api/README.md
```

Worked example — the overbooking guarantee:

```text
R12  the design must avoid overbooking
 └─ MO-10  track seats selected but not yet confirmed
     └─ ADR-007  two-layer seat locking
         ├─ DDR-001  ten-minute TTL, sixty-second sweep
         └─ DDR-002  lock, re-validate, then write
             └─ BR-17  partial unique index on active holds
                 └─ v_showtime_seat_map
                     └─ GET /showtimes/:id/seats
```
