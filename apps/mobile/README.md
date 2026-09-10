# Movea App - Movie Ticket App

## 📱 Overview

This document provides information about React Native Expo big practice.

## ✨ Features

- **Authentication**
  - Sign In / Sign Up functionality
  - Secure user session management
  - Social sign in

- **Movie Management**
  - Paginated movies list (100+ items)
  - Search movies
  - Filter movies by genre and ratings
  - Booking a movie

- **Profile**
  - View and edit user profile
  - Change avatar using Camera or Image Picker
  - Profile settings management
  - Change password

- **My Ticket**
  - Paginated tickets list (100+ items)
  - Filter tickets by status

- **Wallet**
  - Paginated transactions list (100+ items)
  - Top up my wallet

- **UI/UX**
  - Custom splash screen
  - Custom app icon
  - Accessibility support
  - Platform-specific optimizations (Android & iOS)

## 🛠 Technical Stack

- [**React Native & Expo**](https://docs.expo.dev/)
- [**React**](https://react.dev/)
- [**TypeScript**](https://www.typescriptlang.org/)
- [**Zustand**](https://zustand-demo.pmnd.rs/)
- [**React Query**](https://tanstack.com/)
- [**React Hook Form**](https://react-hook-form.com/)
- [**Uniwind - Tailwind bindings for React Native**](https://docs.uniwind.dev/quickstart)
- [**Storybook**](https://storybook.js.org/)
- [**Jest & React Native Testing Library**](https://jestjs.io/)
- [**ESLint & Prettier**](https://eslint.org/)
- [**Husky**](https://typicode.github.io/husky/)

## 📂 Project Structure

```
movea-app/
├── src/
│   ├── app/                    # Expo Router screens & navigation
│   ├── components/             # Reusable UI components
│   ├── constants/              # App-wide constants & config
│   ├── features/               # Feature-based modules (logic + UI)
│   |   ├── auth
│   │   ├── booking
│   │   ├── setting
│   │   ├── ticket
│   │   └── wallet
│   ├── hooks/                  # Custom React hooks
│   ├── icons/                  # SVG & icon components
│   ├── layouts/                # Layout components (Auth, Main, etc.)
│   ├── mocks/                  # Mock data for development & testing
│   ├── services/               # API services
│   ├── stores/                 # State management (Zustand, etc.)
│   ├── types/                  # Global TypeScript types
│   ├── utils/                  # Utility & helper functions
│   ├── global.css              # Global styles (UniWind)
│   ├── uniwind-types.d.ts      # UniWind type definitions
│   └── index.ts                # App entry helpers / exports
│
├── assets/                     # Images, fonts, static assets
├── .editorconfig               # Editor configuration
├── .env.example                # Environment examples
├── .gitignore                  # Git ignore rules
├── .lintstagedrc.js            # Lint-staged configuration
├── .prettierrc                 # Prettier configuration
├── app.json                    # Expo app configuration
├── babel.config.js             # Babel configuration
├── eas.json                    # EAS build configuration
├── eslint.config.js            # ESLint configuration
├── google-services.json        # Example for set up Google services for local development
├── jest.config.js              # Jest configuration
├── jest.setup.ts               # Jest setup
├── metro.config.js             # Metro bundler configuration
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript configuration
├── pnpm-lock.yaml              # PNPM lock file
└── README.md                   # Project documentation
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm
- Expo CLI
- iOS Simulator (Mac only) or Android Emulator

### Installation

1. Clone the repository:

```bash
git@gitlab.asoft-python.com:viet.pham/reactnative.git
```

and

```bash
git checkout feat/expo-practice
```

2. Install dependencies:

```bash
npm install
# or
pnpm install
```

3. Setup environment variables

- Option 1: Create your **.env** file:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
GOOGLE_SERVICES_JSON=
```

`EXPO_PUBLIC_API_URL` points at the running `@movea/api`. On a device, replace `localhost`
with your machine's LAN IP.

- Option 2: Pull environment variables for your local development (need to Expo account)

Run the following command to create a .env file in the root of your project:

```bash
eas env:pull --environment development
```

The created .env.local file will look like this:

```bash
# Environment: development

EXPO_PUBLIC_API_URL=
# GOOGLE_SERVICES_JSON=***** (secret variables are not available for reading)
```

4. Google Services Configuration

The `google-services.json` file contains sensitive configuration details for Google services (e.g., Firebase). This file should **NOT** be committed directly to version control.

A placeholder file, `google-services.json.example`, has been provided in the project root. To set up Google services for your local development:

- Obtain your `google-services.json` file from your Firebase project settings.
- Rename the downloaded file to `google-services.json` and place it in the root of this project.
- **Ensure `google-services.json` is added to your `.gitignore` file** to prevent accidental commits.

Example of `google-services.json.example`:

```json
{
  "project_info": {
    "project_number": "YOUR_PROJECT_NUMBER",
    "firebase_url": "https://YOUR_FIREBASE_PROJECT_ID.firebaseio.com",
    "project_id": "YOUR_PROJECT_ID",
    "storage_bucket": "YOUR_STORAGE_BUCKET"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "YOUR_MOBILE_SDK_APP_ID",
        "android_client_info": {
          "package_name": "YOUR_PACKAGE_NAME"
        }
      },
      "oauth_client": [
        {
          "client_id": "YOUR_CLIENT_ID",
          "client_type": 1
        }
      ],
      "api_key": [
        {
          "current_key": "YOUR_API_KEY"
        }
      ],
      "services": {
        "appinvite_service": {
          "other_platform_oauth_client": [
            {
              "client_id": "YOUR_CLIENT_ID_2",
              "client_type": 3
            }
          ]
        }
      }
    }
  ],
  "configuration_version": "1"
}
```

5. Start the development server:

```bash
npx expo start
```

6. Run on your preferred platform:

- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your physical device

## 🧪 Testing

Run unit tests:

```bash
npm test
# or
yarn test
```

Run tests with coverage:

```bash
npm test -- --coverage
# or
yarn test --coverage
```

## 📚 Storybook

Launch Storybook for component development:

```bash
npm run storybook:start
# or
yarn storybook:start
```

## 🎨 Code Quality

Format code:

```bash
npm run format
# or
yarn format
```

Lint code:

```bash
npm run lint
# or
yarn lint
```

## 📅 Timeline

- **Estimation**: Dec 2, 2025 (2 Sprints)
- **Started**: Dec 3, 2025

## 🎯 Project Goals

- ✅ Handle platform differences between Android, iOS
- ✅ Unit test coverage should be greater than 80%
- ✅ Configure the AppIcon and SplashScreen that match the Expo app.
- ✅ Must have a form with multiple inputs
- ✅ Must have a Home screen with a list greater than 1000 items
- ✅ Must have a screen using Camera and Image Picker
- ✅ Apply Linking and Deep Linking
- ✅ Push Notifications
- ✅ Social authentications (Facebook, Google)
- ✅ Integrate Expo Application Services (EAS)
- ✅ Set up Github Actions

## 📝 Design

Design specifications can be found at: [Design Link](https://www.figma.com/design/g9Fn2CZXGHlHescFFIVBP7/Movea---Movie-Ticket-App?node-id=122-120&t=CMiMONaFu5Gcypz9-1)

## 📄 License

This project is licensed under the MIT License.

## 👥 Team

- Developer: [Nhat Duong Cong](mailto:nhat.duong@asnet.com.vn), [Viet Pham](mailto:viet.pham@asnet.com.vn)

- GitLab: [@nhat.duong](https://gitlab.asoft-python.com/nhat.duong), [@viet.pham](https://gitlab.asoft-python.com/viet.pham)

- Slack: nhat.duong, viet.pham
