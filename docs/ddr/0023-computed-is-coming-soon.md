# DDR-023 — Computed `isComingSoon` instead of a stored flag

Accepted · 22 Sep 2026 · Implements ADR-012, DDR-014

## Context

`apps/mobile`'s Home screen already has a "Coming Soon" section next to "Now Playing", but the
API carried no notion of release status. The client derived it itself — `deriveStatus` in
`apps/mobile/src/features/booking/services/movies.ts` compared `releaseDate` to `Date.now()` —
and, because the API couldn't filter on that either, the client over-fetched a wide page
(`PAGE_LIMIT_MAX`) and filtered client-side, with two `useMovieData` calls sharing one cached
page of unfiltered movies. That page's `hasMore` reflected the unfiltered total, not the
filtered one, so infinite scroll could under-report how many "coming soon" movies were left.

Movies need a real API-level notion of release status so the list endpoint can filter and
paginate correctly, and the mobile carousels can stop over-fetching.

## Decision

`isComingSoon` is exposed on `MovieResponseDto` and accepted as a filter on
`MovieListQueryDto`, but it is **not a stored column**. `MoviesService.toResponse` computes it
at read time as `releaseDate > today`; `findAllMovies` applies the same comparison against
`CURRENT_DATE` in the query builder when the filter is given. No migration was added.

## Why

- The value already exists in full as `releaseDate` — a second column would be two sources of
  truth for one fact, and nothing keeps them in sync once a movie's release date arrives and
  nobody flips the flag.
- Matches the computed-not-stored stance already applied to seat availability (DDR-003):
  nothing here can drift, because nothing is written.
- No migration, no admin UI to manage the flag, no new field for `CreateMovieDto`/
  `UpdateMovieDto` to reject per DDR-007 — the field simply isn't client-settable.
- Lets `GET /movies` paginate and filter correctly, removing the client-side over-fetch and
  the two-carousels-share-one-cache-page trick in `useMovieData`.

## Rejected

- **A stored, admin-settable `is_coming_soon` boolean column** — needs a migration, and an
  admin who forgets to flip it after release leaves the catalogue visibly wrong. Also implies
  the flag can mean something other than "not yet released" (e.g. editorial promotion), which
  nothing in scope asked for.
- **Leaving the derivation client-only** — the mobile app already had this; it's what forced
  the over-fetch-and-filter workaround this record replaces.

## Consequences

| Gains                                                                | Costs accepted                                                                                                                                                                    |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isComingSoon` can never disagree with `releaseDate`.                | Every list read does one extra date comparison per row (cheap, unindexed).                                                                                                        |
| `GET /movies?isComingSoon=true` now paginates and filters correctly. | A movie flips from coming-soon to now-playing exactly at local midnight UTC on the API host, not per-viewer timezone.                                                             |
| Mobile's `useMovieData` fetches only what each section needs.        | Query-key/cache shape for `useMoviesInfinite`/`useMoviesByGenreInfinite` changed (now keyed by `isComingSoon` too), so old cached pages don't collide with the new filtered ones. |

## Follow-up

- None outstanding — `apps/mobile`'s `ComingSoonSection`/`NowPlayingSection` now read
  `isComingSoon` from the API response instead of deriving it.

## Revisit if

An admin ever needs to mark a movie "coming soon" independent of its actual release date (a
promotional pre-announcement before a date is finalized) — that's a genuinely different
concept from "not yet released" and would need its own field.
