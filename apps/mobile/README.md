# @movea/mobile — Movea Movie Ticket App

Expo / React Native client for the Movie Reservation System. Part of the [Movea workspace](../../README.md); it talks to [`@movea/api`](../api/README.md) through the generated [`@movea/api-contract`](../../packages/api-contract), which is the only thing the two apps share.

## Overview

A movie ticket app: browse the catalogue, pick a showtime and seats, hold them, and confirm a
reservation. Admins manage the catalogue and read reports from the same app, behind role-gated
navigation ([DDR-019](../../docs/ddr/0019-mobile-rbac-role-gated-navigation.md)).

## Features

- **Authentication**
  - Sign In / Sign Up against `@movea/api`
  - Secure session management with refresh tokens

- **Movies & Booking**
  - Paginated movies list, search, and genre / rating filters
  - Showtime selection, seat map, and seat holds
  - Checkout and ticket confirmation

- **Admin**
  - Movie management — create, edit, activate and deactivate ([DDR-020](../../docs/ddr/0020-admin-movie-management-ui.md))
  - Reporting screens ([DDR-021](../../docs/ddr/0021-admin-reporting-ui.md))

- **Profile**
  - View and edit profile, change password
  - Change avatar using Camera or Image Picker

- **My Ticket**
  - Paginated tickets list, filtered by status

- **Wallet**
  - Paginated transactions, top up (currently behind a feature flag)

- **UI/UX**
  - Custom splash screen and app icon
  - Accessibility support
  - Platform-specific handling for Android and iOS

## Technical Stack

- [**React Native & Expo**](https://docs.expo.dev/) — expo-router for navigation
- [**TypeScript**](https://www.typescriptlang.org/)
- [**Effect**](https://effect.website/) — services and validation
- [**Zustand**](https://zustand-demo.pmnd.rs/) — stores
- [**React Query**](https://tanstack.com/) — server state
- [**React Hook Form**](https://react-hook-form.com/) — forms
- [**Uniwind**](https://docs.uniwind.dev/quickstart) — Tailwind bindings for React Native
- [**Storybook**](https://storybook.js.org/) — on-device component workshop
- [**Jest & React Native Testing Library**](https://jestjs.io/)
- [**ESLint & Prettier**](https://eslint.org/)

This app's ESLint, Prettier, TypeScript and Jest configs are its own and deliberately differ
from the API's ([DDR-017](../../docs/ddr/0017-workspace-layout-and-package-naming.md)); they are not meant to be unified. Its dependency versions are pinned exactly — see detail at [ADR-015](../../docs/adr/0015-pnpm-workspace-monorepo.md).

## Project Structure

```
apps/mobile/
├── src/
│   ├── app/                    # Expo Router routes — (auth), (main), (storybook)
│   ├── components/             # Reusable UI components (+ stories and tests)
│   ├── constants/              # App-wide constants & config
│   ├── features/               # Feature modules (logic + UI)
│   │   ├── admin               # Catalogue management and reports
│   │   ├── auth
│   │   ├── booking
│   │   ├── camera
│   │   ├── navigation
│   │   ├── setting
│   │   ├── ticket
│   │   └── wallet
│   ├── hooks/                  # Custom React hooks
│   ├── icons/                  # SVG & icon components
│   ├── layouts/                # Layout components
│   ├── mocks/                  # Mock data for development & testing
│   ├── services/               # api/, notification/, storage/
│   ├── stores/                 # Zustand stores
│   ├── types/                  # Global TypeScript types
│   ├── utils/                  # Utility & helper functions
│   ├── global.css              # Design tokens and theme variants (uniwind)
│   └── uniwind-types.d.ts      # Generated uniwind type definitions
│
├── .rnstorybook/               # Storybook config (generated requires file)
├── assets/                     # Images, fonts, static assets
├── android/                    # Native project (expo prebuild)
├── plugins/                    # Expo config plugins
├── app.config.ts               # Expo app configuration
├── eas.json                    # EAS build configuration
├── metro.config.js             # Metro + uniwind + Storybook
├── jest.config.js              # Jest configuration
└── eslint.config.js            # ESLint configuration
```

A feature never reaches across `apps/` — the only shared code is the generated contract.

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 10+
- Expo CLI, plus an iOS Simulator (Mac only), an Android Emulator, or Expo Go on a device
- A running `@movea/api` — see [apps/api](../api/README.md)

### Installation

Install from the **workspace root**, not this directory — the lockfile and the `node_modules`
layout are shared:

```bash
pnpm install
```

### Environment

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

| Variable                   | Notes                                                             |
| -------------------------- | ----------------------------------------------------------------- |
| `EXPO_PUBLIC_API_BASE_URL` | Host only — `api/v1` is appended by `src/services/api/config.ts`  |
| `EXPO_PUBLIC_API_PREFIX`   | Optional override, defaults to `api`                              |
| `EXPO_PUBLIC_API_VERSION`  | Optional override, defaults to `v1`                               |
| `EXPO_PUBLIC_SUPABASE_*`   | Placeholders retained during the migration off Supabase (DDR-018) |
| `GOOGLE_SERVICES_JSON`     | Path to your local `google-services.json`                         |

The prefix and version are fixed in code by [ADR-012](../../docs/adr/0012-rest-api-with-generated-openapi.md), not per-environment config. Pick the host to match where the app runs:

- iOS simulator — `http://localhost:3000`
- Android emulator — `http://10.0.2.2:3000` (`localhost` inside an emulator is the emulator)
- Physical device — your machine's LAN IP

Alternatively, pull the values from EAS (needs an Expo account):

```bash
eas env:pull --environment development
```

### Google Services - Disable at this phase

`google-services.json` holds Firebase configuration and must **not** be committed. Download it
from your Firebase project settings, place it in `apps/mobile/`, and confirm it is git-ignored.
`google-services.json.example` shows the expected shape.

### Run

```bash
pnpm mobile start
```

Then press `i` for the iOS simulator, `a` for the Android emulator, or scan the QR code with
Expo Go. `pnpm mobile android` / `pnpm mobile ios` build and run the native projects directly.

## The generated contract

Request and response types come from `@movea/api-contract`. After an API controller or DTO
changes, regenerate from the workspace root (it boots the API, so the database must be up):

```bash
pnpm contract:generate
```

Do not retype API types by hand. This matters most for status vocabularies —
[ADR-008](../../docs/adr/0008-guarded-state-machines.md) ties seat-hold state to a database
index, so a hand-copied enum is a correctness bug waiting to happen.

## Testing

```bash
pnpm mobile test
```

```bash
pnpm mobile test:coverage
```

## Storybook

```bash
pnpm mobile storybook:start
```

Regenerate the story index after adding a `*.stories.tsx` file:

```bash
pnpm mobile storybook:generate
```

## Code Quality

```bash
pnpm mobile lint
```

```bash
pnpm mobile typecheck
```

```bash
pnpm mobile format
```

Hooks run `lint-staged` on commit, `commitlint` on the message, and
`turbo run typecheck lint:check test` on push, so a commit that compiles is not yet a commit
that pushes. Commits use a mandatory `[#N]` issue prefix and no scope:
`[#248] feat: let admins activate and deactivate a movie`.

## CI

`mobile-ci.yml` runs lint, Prettier, typecheck and tests on changes under `apps/mobile/**` or
`packages/**`; `mobile-build-development.yml`, `-staging.yml` and `-production.yml` drive EAS
builds. It is independent of the API pipeline and runs in parallel with it
([ADR-016](../../docs/adr/0016-independent-per-app-ci-pipelines.md)).

## Timeline

- **Estimation**: Dec 2, 2025 (2 Sprints)
- **Started**: Dec 3, 2025

## Project Goals

- Handle platform differences between Android and iOS
- Unit test coverage greater than 80%
- AppIcon and SplashScreen matching the Expo app
- A form with multiple inputs
- A Home screen with a list greater than 1000 items
- A screen using Camera and Image Picker
- Linking and Deep Linking
- Push Notifications
- Social authentication (Facebook, Google)
- Expo Application Services (EAS)
- GitHub Actions

## Design

Design specifications: [Figma](https://www.figma.com/design/g9Fn2CZXGHlHescFFIVBP7/Movea---Movie-Ticket-App?node-id=122-120&t=CMiMONaFu5Gcypz9-1)

## Team

- Developers:
  - Nhat Duong
  - Viet Pham
