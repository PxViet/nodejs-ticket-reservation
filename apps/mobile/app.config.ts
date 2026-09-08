import { existsSync } from 'node:fs';

import { ConfigContext, ExpoConfig } from 'expo/config';

// FCM push is not wired up yet, so google-services.json is optional. Point at it
// only when it is actually present (env var or checked-in file); otherwise leave
// the key off so `expo run:android` / prebuild does not fail on a missing file.
const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ??
  (existsSync('./google-services.json') ? './google-services.json' : undefined);

// Release Android blocks cleartext HTTP by default. Dev/preview builds point at
// an http:// API (the emulator reaches the host as http://10.0.2.2:3000), so
// allow cleartext whenever the configured API base is not https — production
// builds set an https URL and stay locked down.
const allowCleartextTraffic = !(
  process.env.EXPO_PUBLIC_API_URL ?? ''
).startsWith('https');

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  owner: 'viet.pham_agilityio',
  name: 'Movea',
  slug: 'movea',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/movea-icon.png',
  scheme: 'movieticketbooking',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  assetBundlePatterns: ['**/*'],
  backgroundColor: '#0B0F2F',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.anonymous.movieticketbooking',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      UIBackgroundModes: ['remote-notification'],
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: ['movieticketbooking'],
          CFBundleURLName: 'com.anonymous.movieticketbooking',
        },
      ],
    },
    associatedDomains: ['applinks:movie-ticket-booking.expo.app'],
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#0B0F2F',
      foregroundImage: './assets/images/movea-icon.png',
      backgroundImage: './assets/images/movea-icon.png',
    },
    edgeToEdgeEnabled: true,
    softwareKeyboardLayoutMode: 'pan',
    package: 'com.anonymous.movieticketbooking',
    predictiveBackGestureEnabled: false,
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'movieticketbooking',
            host: '*',
          },
          {
            scheme: 'https',
            host: '*.movie-ticket-booking.expo.app',
            pathPrefix: '/auth',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
    ...(googleServicesFile ? { googleServicesFile } : {}),
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/images/movea-icon.png',
        imageWidth: 120,
        resizeMode: 'contain',
        backgroundColor: '#0B0F2F',
        dark: {
          backgroundColor: '#0B0F2F',
        },
      },
    ],
    'expo-video',
    [
      'expo-camera',
      {
        photosPermission:
          'Allow $(PRODUCT_NAME) to access photos to choose profile picture',
        cameraPermission: 'Allow $(PRODUCT_NAME) to access your camera',
        microphonePermission: 'Allow $(PRODUCT_NAME) to access your microphone',
        recordAudioAndroid: true,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'The app needs access to your photos to choose profile picture',
        cameraPermission:
          'The app needs access to your camera for taking photos',
        microphonePermission:
          'The app needs access to your microphone for recording videos',
      },
    ],
    [
      'expo-secure-store',
      {
        configureAndroidBackup: true,
        faceIDPermission: 'Allow $(PRODUCT_NAME) to access your face ID',
        touchIDPermission: 'Allow $(PRODUCT_NAME) to access your touch ID',
      },
    ],
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Allow $(PRODUCT_NAME) to use your location.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/images/movea-icon.png',
        color: '#0B0F2F',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          usesCleartextTraffic: allowCleartextTraffic,
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  primaryColor: '#0B0F2F',
  extra: {
    eas: {
      projectId: '36d003fd-c40c-47c3-8f16-3eb497324288',
    },
  },
  updates: {
    url: 'https://u.expo.dev/36d003fd-c40c-47c3-8f16-3eb497324288',
  },
  runtimeVersion: '1.0.0',
});
