# DDR-020 — Admin movie management UI

Accepted · 11 Sep 2026 · Implements ADR-006, ADR-010, DDR-014, DDR-018

## Context

`@movea/api` already implements movie CRUD (`POST/PATCH/DELETE /movies`, admin only,
DDR-014) — no mobile UI existed for it before this change; DDR-019 supplies the role gating
that makes such a UI reachable. Two things bound the scope: the API has no file-upload
endpoint at all (DDR-018 already names avatar upload/delete as a genuine, still-open gap of
the same kind), and the user was asked whether the movie form should also manage genres and
chose selection-only — no genre create/rename/delete screen this pass.

## Decision

- A new `apps/mobile/src/features/admin/` domain (schemas/error/services/effect/hooks/
  components/screens) for movie management, mirroring the existing Effect-service +
  `Context.Tag` + `Layer` + React Query hook plumbing already used by
  `features/booking/effect/services/movies.ts`, rather than a different data-fetching
  pattern for admin screens.
- The admin movie list and mutations call the **same** `/movies` endpoints the public
  catalogue uses, always with `auth: true`. DDR-014's `OptionalJwtAuthGuard` already derives
  `includeInactive` from the caller's role, so an authenticated admin request is what surfaces
  deactivated movies — no separate "admin movies" endpoint exists or is needed. Because it's
  the same endpoint, a create/update/delete mutation invalidates both the new
  `queryKeys.adminMovies` cache and the existing `queryKeys.movies` cache the customer
  catalogue reads.
- The movie form's poster field is a plain URL text input with a live preview, not an image
  picker/upload — there is no upload endpoint, and building one is out of scope here for the
  same reason DDR-018 leaves avatar upload unbuilt.
- The genre field is a multi-select chip picker reading `GET /genres` through the existing
  `features/booking/hooks/useGenres` — not a second genre-fetch path. There is no genre
  create/rename/delete UI this pass; this is a scope decision, not an oversight.
- `DELETE /movies/:id` is labelled and confirmed in the UI as "Deactivate movie", not
  "Delete" — it maps to ADR-010's soft delete (`is_active = false`), and the confirmation copy
  says reservation history is kept, so an admin doesn't read the action as destructive.

## Why

- Reusing the exact `/movies` endpoint, rather than a hypothetical admin-only variant, means
  DDR-014's role-derived `includeInactive` behavior is exercised as designed and there is one
  source of truth on the client for "what movies exist."
- Reusing `features/booking/hooks/useGenres` for the picker avoids a second genre-list code
  path that could drift from the first.
- Declining poster upload and genre CRUD keeps this change scoped to what the API and the
  user's stated requirements actually cover, rather than speculatively building ahead of an
  endpoint that doesn't exist or a screen nobody asked for — the same distinction DDR-018
  draws between a genuine gap and an out-of-scope decision.

## Rejected

- **A separate admin-only movies list endpoint** — rejected: DDR-014's optional-auth pattern
  already solves this with zero backend changes.
- **An image-picker/upload flow for the poster** — rejected: no upload endpoint exists;
  building one is new backend scope nobody asked for in this pass.
- **A genre management screen** — rejected this pass: the user was asked directly and chose
  selection-only from existing genres.

## Consequences

| Gains                                                                                             | Costs accepted                                                                                                                           |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Admins can add, update and deactivate movies from the app.                                        | Poster images are pasted URLs, not uploads — an admin needs somewhere else to host the image first.                                      |
| No new backend endpoint, guard, or contract regeneration was needed — everything already existed. | Genres can't be created or renamed from the app; an admin still needs another path (Swagger/API client) to add a brand-new genre.        |
| One `/movies` cache invalidation path serves both the admin and customer screens.                 | The admin movie list and the customer catalogue share an endpoint, so a change to that endpoint's shape affects both call sites at once. |

## Follow-up

- Genre management UI and poster upload are both real, named gaps (like DDR-018's list) —
  build genre CRUD screens when asked for, and poster upload once `@movea/api` grows a
  file-upload endpoint (the same endpoint avatar upload is waiting on).

## Revisit if

`@movea/api` grows a file-upload endpoint (poster upload stops being a text field) or the
product wants genre management from the app (the picker becomes a management screen) —
implement then, don't speculatively build now.
