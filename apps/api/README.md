# @movea/api — Movie Reservation System API

**NestJS** + **TypeORM** + **PostgreSQL** backend for the ticket reservation. One deployable, module per domain, over a schema designed across seven phases.

The system exists to solve one problem properly: **two customers must never be sold the same
seat.** Everything else — the catalogue, the schedule, the reports — is in service of that.

Part of the [Movea workspace](../../README.md); every command below is also reachable from the workspace root as `pnpm api <script>`.

---

## How overbooking is prevented

Two layers, decided in [ADR-007](../../docs/adr/0007-two-layer-seat-locking.md).

**Soft.** Selecting seats writes a `seat_holds` row per seat with a ten-minute expiry
([DDR-001](../../docs/ddr/0001-seat-hold-ttl-and-sweep-cadence.md)), giving that customer an exclusive window. A job every sixty seconds releases expired holds ([ADR-009](../../docs/adr/0009-in-process-scheduled-jobs.md)).

**Hard.** A partial unique index makes a conflicting active hold impossible in the database:

```sql
CREATE UNIQUE INDEX uq_seat_hold_active
ON seat_holds (showtime_id, seat_id)
WHERE status IN ('held', 'confirmed');
```

Confirmation is one transaction in a fixed order — lock the holds with `pessimistic_write`, re-validate them, then write the reservation and its tickets ([DDR-002](../../docs/ddr/0002-reservation-confirmation-transaction.md)). The losing concurrent request gets a `409 Conflict`, not a corrupted seat map.

Availability is never stored. It is derived from the hold rows, so the seat map and the capacity report cannot disagree ([DDR-003](../../docs/ddr/0003-computed-seat-availability.md)). Do not add a counter column.

---

## Prerequisites

| Tool       | Version                                                   |
| ---------- | --------------------------------------------------------- |
| Node.js    | 22+                                                       |
| pnpm       | 10+                                                       |
| PostgreSQL | 16+ — a local install, or `docker compose up -d postgres` |

---

## Getting started

From the workspace root:

```bash
pnpm install
```

```bash
cp apps/api/.env.example apps/api/.env
```

Fill in `.env` — every key is validated at boot by `src/config/env.validation.ts`, so a bad or
missing value fails startup rather than the first request that needs it ([DDR-008](../../docs/ddr/0008-configuration-and-logging.md)).
`JWT_PRIVATE_KEY_BASE64` and `JWT_PUBLIC_KEY_BASE64` need a generated RSA pair; `.env.example` carries the `openssl` lines.

Start the database, then the API:

```bash
docker compose up -d postgres
```

```bash
pnpm api start:dev
```

- API — http://localhost:3000/api/v1
- Swagger UI — http://localhost:3000/api/docs (when `SWAGGER_ENABLED=true`)
- Health probe — http://localhost:3000/api/health (version-neutral, so orchestrators get one
  stable URL)

`DB_HOST` is `localhost` when the API runs on the host against the compose-published port, and
`postgres` — the compose service name — when the API itself runs as the `app` container.

---

## Layout

```
src/
  main.ts                       bootstrap: helmet, CORS, prefix, versioning, Swagger
  app.module.ts                 root module — register domain modules here
  swagger.ts                    OpenAPI document builder, shared by the app and the generator
  config/
    env.validation.ts           Joi schema; a bad env fails startup, not runtime
    app.config.ts               typed `app` namespace
  database/
    data-source.options.ts      connection options shared by Nest and the CLI
    data-source.ts              entry point for the TypeORM CLI
    database.module.ts          TypeOrmModule.forRootAsync
    migrations/                 generated migrations land here
  common/
    filters/                    AllExceptionsFilter — one JSON error shape
    dto/                        PaginationQueryDto and friends
  modules/                      one directory per domain
  scripts/
    generate-openapi.ts         writes packages/api-contract/openapi.json
postman/                        request collections per domain
Dockerfile                      multi-stage; built from the workspace root as context
```

A module owns its entities and services; no module reaches into another's repositories ([ADR-001](../../docs/adr/0001-nestjs-modular-monolith.md)). Register new ones in `src/app.module.ts`.

| Module         | Owns                                            | Records                   |
| -------------- | ----------------------------------------------- | ------------------------- |
| `auth`         | Signup, login, refresh tokens                   | ADR-005, DDR-008          |
| `users`        | Profiles, roles, promotion                      | ADR-006, DDR-009, DDR-012 |
| `movies`       | Movies, genres                                  | ADR-010, DDR-014, BR-30   |
| `showtimes`    | Halls, seats, schedule, seat map                | DDR-015, DDR-016, BR-28   |
| `reservations` | Seat holds, reservations, tickets, cancellation | ADR-007–009, DDR-001–004  |
| `reports`      | Revenue, occupancy, all reservations            | ADR-011, DDR-010, DDR-021 |
| `health`       | Terminus probe with a database ping             | —                         |

---

## Domain model

Eleven tables. Full field lists, delete rules and cardinality in
[docs/database/](../../docs/database/README.md).

```
users ──< refresh_tokens
users ──< seat_holds >── seats >── halls ──< showtimes >── movies >── movie_genres >── genres
users ──< reservations >── showtimes
reservations ──< tickets >── seats
reservations ──< seat_holds
```

Six views serve every count and total, because none of them is stored:

- `v_showtime_seat_map`
- `v_showtime_availability`
- `v_reservation_summary`
- `v_admin_revenue`
- `v_admin_showtime_occupancy`
- `v_admin_all_reservations`

See [docs/database/views.md](../../docs/database/views.md).

---

## Conventions

**API surface.** URI versioning under a global `api` prefix, so routes resolve to `/api/v1/<resource>` ([ADR-012](../../docs/adr/0012-rest-api-with-generated-openapi.md)). Health is `VERSION_NEUTRAL`.

**Validation.** A global `ValidationPipe` strips any property a DTO does not declare. Fields a
client must never control — `role`, `status`, prices — are simply absent from the DTO, which is what makes privilege escalation structurally impossible rather than a check someone has to remember ([DDR-007](../../docs/ddr/0007-dto-validation-strategy.md), BR-33).

**Errors.** One global filter, one envelope, a stable `errorCode` the client branches on ([DDR-006](../../docs/ddr/0006-error-response-shape.md)). 5xx bodies are generic; the stack goes to the log.

**Pagination.** Every list endpoint takes `page` and `limit`, capped at 100 server-side ([DDR-005](../../docs/ddr/0005-pagination-convention.md)), one-indexed ([DDR-011](../../docs/ddr/0011-one-indexed-pagination-convention.md)).

**Authorization.** `@Roles()` plus a `RolesGuard` at the route. Ownership is checked in service code from the authenticated user id, never from client input ([ADR-006](../../docs/adr/0006-rbac-via-guards.md), BR-34).

**Deletion.** Catalogue entities are soft-deleted; foreign keys from reservations are `ON DELETE RESTRICT` so an accidental hard delete fails loudly ([ADR-010](../../docs/adr/0010-soft-delete-for-catalogue-entities.md)). `DELETE /movies/:id` deactivates; reactivating is `PATCH /movies/:id { "isActive": true }`.

**Schema changes.** `synchronize` is off. The schema is migration-managed.

```bash
pnpm api migration:run
```

---

## The generated contract

The mobile client consumes `@movea/api-contract`, which is generated from this API's OpenAPI
document. After changing a controller or a DTO, regenerate it from the workspace root (it boots
the API, so the database must be up):

```bash
pnpm contract:generate
```

Never hand-edit `packages/api-contract/openapi.json` or `src/generated/`.

---

## Scripts

Run as `pnpm api <script>` from the workspace root, or plain `pnpm <script>` inside `apps/api`.

| Script                                  | What it does                                  |
| --------------------------------------- | --------------------------------------------- |
| `start:dev`                             | Watch-mode dev server                         |
| `build` / `start:prod`                  | Compile to `dist/`, run the compiled app      |
| `lint` / `lint:check`                   | ESLint with / without `--fix`                 |
| `format` / `format:check`               | Prettier write / verify                       |
| `typecheck`                             | `tsc --noEmit` over the build config          |
| `test` / `test:watch` / `test:cov`      | Jest unit tests                               |
| `test:e2e`                              | End-to-end suite (needs a reachable database) |
| `migration:generate\|run\|revert\|show` | TypeORM migrations                            |
| `generate:openapi`                      | Write the OpenAPI document for the contract   |

---

## Documentation

| Document                                                     | What it holds                               |
| ------------------------------------------------------------ | ------------------------------------------- |
| [docs/api/](../../docs/api/README.md)                        | Every endpoint's request and response shape |
| [docs/adr/](../../docs/adr/README.md)                        | Architecture Decision Records               |
| [docs/ddr/](../../docs/ddr/README.md)                        | Design Decision Records                     |
| [docs/database/](../../docs/database/README.md)              | Schema, business rules, views               |
| [docs/decisions-vs-code.md](../../docs/decisions-vs-code.md) | Where code and records diverge              |
