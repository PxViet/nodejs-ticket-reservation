// Load test environment variables
if (process.env.NODE_ENV === 'test') {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api/v1';
}

// Mock dependencies
jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  useSharedValue: jest.fn(() => ({ value: 0 })),
  useAnimatedStyle: jest.fn(fn => {
    const style = fn();
    return style;
  }),
  withRepeat: jest.fn(value => value),
  withTiming: jest.fn(value => value),
}));

// Mock uniwind
jest.mock('uniwind', () => ({
  useResolveClassNames: (classNames: string) => ({ className: classNames }),
  withUniwind: (Component: typeof Text) => Component,
  useUniwind: () => ({
    theme: 'dark',
  }),
}));

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mock dependencies
jest.mock('expo', () => ({
  useEvent: jest.fn((player, event, initialState) => initialState),
}));

const mockBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
  }),
}));

jest.mock('expo-video', () => ({
  useVideoPlayer: jest.fn((source, callback) => {
    const player = {
      playing: false,
      loop: false,
      play: jest.fn(),
      pause: jest.fn(),
    };
    callback?.(player);
    return player;
  }),
}));

jest.mock('expo-video-thumbnails', () => ({
  getThumbnailAsync: jest.fn(() =>
    Promise.resolve({ uri: 'mock-thumbnail-uri.jpg' }),
  ),
}));

// Mock expo-image
jest.mock('expo-image', () => ({
  Image: jest.fn(() => 'Image'),
}));

// Mock UUID utility (replaced uuid package)
jest.mock('@/utils/uuid', () => ({
  generateUUID: jest.fn(() => Promise.resolve('mock-uuid-async')),
  generateUUIDSync: jest.fn(() => 'mock-uuid-sync'),
}));

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: {
    manipulate: jest.fn(),
  },
  SaveFormat: { JPEG: 'jpeg' },
}));
