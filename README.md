# Movea — Movie Reservation System

A pnpm workspace holding a NestJS API, an Expo mobile client, and the generated contract
between them ([ADR-015](docs/adr/0015-pnpm-workspace-monorepo.md)).

The system exists to solve one problem properly: **two customers must never be sold the same
seat.** Everything else — the catalogue, the schedule, the reports — is in service of that.

---

## Packages

| Package               | Path                    | What it is                                            |
| --------------------- | ----------------------- | ----------------------------------------------------- |
| `@movea/api`          | `apps/api`              | NestJS + TypeORM + PostgreSQL. Module per domain.     |
| `@movea/mobile`       | `apps/mobile`           | Expo / React Native client.                           |
| `@movea/api-contract` | `packages/api-contract` | TypeScript generated from the API's OpenAPI document. |

- `apps/*` holds deployables
- `packages/*` holds everything imported rather than deployed
- `@movea/<dir>` is a path and a `--filter` are derivable from each other
  ([DDR-017](docs/ddr/0017-workspace-layout-and-package-naming.md)).

The API and the mobile app share exactly one thing — `@movea/api-contract` — and it is generated, never hand-written.

---

## Prerequisites

| Tool       | Version                                                 |
| ---------- | ------------------------------------------------------- |
| Node.js    | 22+                                                     |
| pnpm       | 10+ (`packageManager` pins 10.3.0)                      |
| PostgreSQL | 16+ — a local install, or the Docker one in this repo   |
| Expo       | Simulator, emulator, or Expo Go on a device, for mobile |

---

## Getting started

```bash
pnpm install
```

Each app owns its own environment file. Copy both examples and fill them in — for the API a
missing or malformed value fails the boot rather than the first request that needs it ([DDR-008](docs/ddr/0008-configuration-and-logging.md)):

```bash
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Start PostgreSQL, then the API:

```bash
docker compose up -d postgres
```

```bash
pnpm api start:dev
```

Then the mobile app, in a second terminal:

```bash
pnpm mobile start
```

- API — http://localhost:3000/api/v1
- Swagger UI — http://localhost:3000/api/docs (when `SWAGGER_ENABLED=true`)
- Health probe — http://localhost:3000/api/health (version-neutral)

`pnpm docker:up` instead runs **both** the database and the API in containers, which is the grading path ([ADR-014](docs/adr/0014-docker-compose-for-local-and-grading.md)) - the override file builds the `development` target and mounts `apps/api/src`.

---

## Commands

- All from the workspace root.
  - `pnpm api` is shorthands for `pnpm --filter @movea/api`
  - `pnpm mobile` is shorthands for `pnpm --filter @movea/mobile`

So any script in an app's `package.json` is reachable as `pnpm api <script>`.

| Command                            | What it does                                             |
| ---------------------------------- | -------------------------------------------------------- |
| `pnpm lint` / `typecheck` / `test` | Turborepo, across every package                          |
| `pnpm build`                       | Turborepo build, respecting `dependsOn: ["^build"]`      |
| `pnpm api start:dev`               | API in watch mode                                        |
| `pnpm mobile start`                | Expo dev server                                          |
| `pnpm contract:generate`           | Regenerate the client contract (needs the database up)   |
| `pnpm format` / `format:check`     | Prettier over the whole workspace                        |
| `pnpm docker:up` / `docker:down`   | Compose up / down — PostgreSQL **and** the API container |
| `pnpm db:logs`                     | Follow the PostgreSQL logs                               |

---

## Layout

```
apps/
  api/                  @movea/api — NestJS service, its own .env and Dockerfile
  mobile/               @movea/mobile — Expo app, its own lint/test/TS configs
packages/
  api-contract/         @movea/api-contract — generated from openapi.json
docs/
  adr/                  Architecture Decision Records
  ddr/                  Design Decision Records
  database/             Schema, business rules, views
  api/                  REST endpoint reference
.github/
  workflows/            One path-filtered pipeline per app
  actions/              Shared setup-node-and-pnpm, setup-docker, eas-build
docker-compose.yml      PostgreSQL + the API container
turbo.json              Task graph and cache rules
```

---

## How overbooking is prevented

Two layers, decided in [ADR-007](docs/adr/0007-two-layer-seat-locking.md).

**Soft.** Selecting seats writes a `seat_holds` row per seat with a ten-minute expiry ([DDR-001](docs/ddr/0001-seat-hold-ttl-and-sweep-cadence.md)). A job every sixty seconds releases expired holds ([ADR-009](docs/adr0009-in-process-scheduled-jobs.md)).

**Hard.** A partial unique index makes a conflicting active hold impossible in the database:

```sql
CREATE UNIQUE INDEX uq_seat_hold_active
ON seat_holds (showtime_id, seat_id)
WHERE status IN ('held', 'confirmed');
```

Confirmation is one transaction in a fixed order — lock the holds with `pessimistic_write`, re-validate them, then write the reservation and its tickets ([DDR-002](docs/ddr/0002-reservation-confirmation-transaction.md)). The losing concurrent request gets a `409 Conflict`, not a corrupted seat map.

---

## Documentation

The design is written down, not folklore.

| Document                                               | What it holds                                             |
| ------------------------------------------------------ | --------------------------------------------------------- |
| [docs/](docs/README.md)                                | Index, and how the layers cross-reference                 |
| [docs/adr/](docs/adr/README.md)                        | Architecture Decision Records                             |
| [docs/ddr/](docs/ddr/README.md)                        | Design Decision Records                                   |
| [docs/database/](docs/database/README.md)              | 11 tables, 14 relationships, 34 business rules, 6 views   |
| [docs/api/](docs/api/README.md)                        | Every endpoint's request and response shape               |
| [docs/decisions-vs-code.md](docs/decisions-vs-code.md) | What is implemented, what diverges, what is not built yet |
| [CLAUDE.md](CLAUDE.md)                                 | Working agreements and the invariants to preserve         |

- An **ADR** shapes the whole system and is expensive to reverse.
- A **DDR** is a value or convention you could change this afternoon. No decision goes in both, and both logs are append-only.

---

## CI

Each app has its own path-filtered workflow, and they run in parallel with no dependency between them ([ADR-016](docs/adr/0016-independent-per-app-ci-pipelines.md)).

| Workflow             | Fires on                        | Jobs                                          |
| -------------------- | ------------------------------- | --------------------------------------------- |
| `api-ci.yml`         | `apps/api/**`, `packages/**`    | Format, lint, audit, unit tests, build, image |
| `mobile-ci.yml`      | `apps/mobile/**`, `packages/**` | Lint, Prettier, typecheck, tests              |
| `mobile-build-*.yml` | `apps/mobile/**`                | EAS builds per environment                    |

---

## Contributing

Commits follow Conventional Commits with a mandatory `[#N]` issue prefix and no scope:

```
[#248] feat: let admins activate and deactivate a movie
```

Before changing behaviour, read the record that governs it. Every non-obvious choice here
already has a written reason, and Prisma, Fastify, Redis, a message broker and a third-party
identity provider were all considered and turned down for stated ones.
