# DDR-019 — Mobile RBAC: role-gated navigation and tab reuse

Accepted · 11 Sep 2026 · Implements ADR-005, ADR-006, DDR-014

## Context

`apps/mobile` already carries the caller's role on the access token: `GET /auth/me` returns
`MeResponseDto.role`, surfaced in the app as `@movea/api-contract`'s `AuthUser.role` — a
`"user" | "admin"` literal union generated from the OpenAPI document with no contract change
needed. Until now nothing in the mobile app read it; every screen was one-size-fits-all
regardless of who was signed in. The real authorization boundary is already ADR-006's
`RolesGuard` on each admin-only route (`POST/PATCH/DELETE /movies`, all of `/reports/*`) — the
mobile app has no independent security boundary to build and isn't meant to invent one. What
was missing was purely the UI: an admin account had no way to reach movie management or
reporting, and saw the same customer screens (browse, wallet, tickets) that are useless to
them.

## Decision

- `useAuth()` (`apps/mobile/src/features/auth/hooks/useAuth.ts`) derives and returns
  `isAdmin = user?.role === 'admin'` alongside the existing session fields — one place, not a
  role check duplicated per screen.
- Admin-only stack screens are gated with expo-router's `<Stack.Protected guard={...}>` — the
  same primitive `apps/mobile/src/app/_layout.tsx` already uses to gate the whole `(auth)` vs
  `(main)` stack by `isAuthenticated`. `apps/mobile/src/app/(main)/_layout.tsx` wraps the new
  `admin/movie-form` screen in `<Stack.Protected guard={isAdmin}>` — reused convention, not a
  second guarding mechanism.
- The three existing bottom-tab slots (route names `index`/`wallet`/`my-ticket`, physically
  unchanged) are **repurposed by role** rather than adding a fourth tab or a separate
  navigator. `apps/mobile/src/app/(main)/(tabs)/_layout.tsx` picks between
  `NAVIGATION_BOTTOM_TABS` and a new `ADMIN_NAVIGATION_BOTTOM_TABS`
  (`apps/mobile/src/constants/navigation.ts`) for tab titles/icons; each tab's route file
  (`index.tsx`, `wallet.tsx`, `my-ticket.tsx`) renders a different screen depending on
  `isAdmin` — movie management / reports / profile for an admin, movie browsing / wallet /
  tickets for a customer.
- `NavigationTabBar`/`TabBarItem`
  (`apps/mobile/src/features/navigation/components/NavigationTabBar/`) take an optional
  `bottomTabs` prop, defaulting to the customer set, instead of hardcoding one static import —
  this is what lets the same tab bar component render either role's icons/labels.
- This is a UX/navigation convenience, not a security boundary, in the same sense ADR-006
  frames the guard/decorator split for the API: a user who forges or inspects client state
  cannot reach anything the API doesn't already gate with `RolesGuard`.

## Why

- An admin account has no use for movie browsing, wallet or ticket screens, and a customer has
  no use for movie management or reports. Repurposing the slots keeps one tab bar layout
  instead of maintaining a second navigator tree for what is still, structurally, three tabs.
- `Stack.Protected` was already the established pattern for role/auth-gated stack screens in
  this codebase (the `(auth)`/`(main)` split). Reusing it for admin routes is consistent
  rather than introducing a second gating idiom a future contributor has to learn separately.
- Threading `bottomTabs` as a prop (rather than a second static import inside `TabBarItem`)
  keeps the tab bar itself role-agnostic — it renders whatever config it's given, and the
  role decision stays in one place (`(tabs)/_layout.tsx`).

## Rejected

- **A fourth "Admin" tab** — rejected: spends permanent bottom-tab real estate on a role most
  accounts never have, and the user explicitly asked for the three slots to be reused rather
  than extended.
- **A separate admin root navigator/stack** — rejected: duplicates the tab bar and header
  chrome for no behavioral difference from repurposing the existing one.
- **Role check only inside each screen body, no route-level guard** — rejected: inconsistent
  with how `(auth)`/`(main)` are already gated, and leaves a directly-linked admin route
  (e.g. a deep link to `admin/movie-form`) mounted for a non-admin session before the screen's
  own effect has a chance to redirect away.

## Consequences

| Gains                                                                                          | Costs accepted                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin and customer accounts each see only the screens relevant to them, with no new navigator. | A tab's route file (`index.tsx` etc.) now branches on role, so it is no longer a one-line re-export.                                                           |
| The route-level guard matches an already-familiar pattern (`Stack.Protected`), not a new one.  | `NavigationTabBar`/`TabBarItem` carry one more prop to keep in sync if the tab config shape ever changes.                                                      |
| No client-side security theatre — the API's `RolesGuard` remains the only real boundary.       | A non-admin who somehow renders the admin tab content sees admin UI but every write still 403s; this is by design but worth remembering when reading the code. |

## Follow-up

- If a third role is ever added (ADR-006 already notes the two-role model is a known limit),
  this tab-repurposing scheme does not generalize past two roles cleanly — revisit then rather
  than trying to stretch it to a third variant.

## Revisit if

A role gets its own dedicated navigation needs large enough that reusing three slots stops
making sense (e.g. an admin needing five or more distinct sections) — at that point a real
second navigator, not slot repurposing, is the right shape.
