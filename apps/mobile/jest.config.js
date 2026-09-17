module.exports = {
  preset: 'jest-expo',
  // SDK 57 / reanimated 4.5: without this, Jest resolves worklets' native
  // module bindings (NativeWorklets.native.ts) instead of a jest-safe
  // variant, which crashes on import outside a real native runtime.
  resolver: 'react-native-worklets/jest/resolver.js',
  // Raised from Jest's 5s default when this app moved into the workspace
  // (ADR-015). Workers now share a root node_modules holding both apps' trees,
  // and under full parallelism the slowest test here (TopUp, Effect validation
  // pipeline) crossed 5s. Total suite time is unchanged and `--runInBand`
  // passes at the default, so this is contention headroom, not a slow test.
  testTimeout: 15000,
  setupFiles: [
    './jest.setup.ts',
    '@react-native-async-storage/async-storage/jest/async-storage-mock',
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/utils/**/*.{ts,tsx,js,jsx}',
    'src/components/**/*.{ts,tsx,js,jsx}',
    'src/hooks/**/*.{ts,tsx,js,jsx}',
    'src/features/**/*.{ts,tsx,js,jsx}',
    'src/services/**/*.{ts,tsx,js,jsx}',
    'src/stores/**/*.{ts,tsx,js,jsx}',
    'src/layouts/**/*.{ts,tsx,js,jsx}',
    '!src/features/**/*.stories.{ts,tsx,js,jsx}',
    '!src/features/**/schemas/*.{ts,tsx,js,jsx}',
    '!src/features/**/types/*.{ts,tsx,js,jsx}',
    '!src/features/**/error/*.{ts,tsx,js,jsx}',
    '!src/features/**/effect/*.{ts,tsx,js,jsx}',
    '!src/components/**/*.stories.{ts,tsx}',
    '!**/expo-env.d.ts',
    '!**/.expo/**',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      // branches: 80,
      functions: 80,
      lines: 80,
    },
  },
};
