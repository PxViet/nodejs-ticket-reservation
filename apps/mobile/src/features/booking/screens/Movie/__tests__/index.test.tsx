import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import MovieScreen from '../index';

// Mock dependencies
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockSetMovie = jest.fn();
const mockSetSelectedMovie = jest.fn();
const mockRefetchMovie = jest.fn();

let mockParams: { id?: string } = { id: 'movie1' };

const baseMovie = {
  id: 'movie1',
  title: 'Test Movie',
  posterUrl: 'https://example.com/poster.jpg',
  durationMinutes: 120,
  genre: ['Action', 'Drama'],
  rating: 4.5,
  synopsis: 'A test movie synopsis',
};

let mockMovieData: any = { ...baseMovie };
let mockIsLoading = false;
let mockIsError = false;
let mockError: Error | null = null;

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  router: {
    push: (...args: any[]) => mockPush(...args),
    back: (...args: any[]) => mockBack(...args),
  },
}));

jest.mock('@/features/booking/hooks/useMovies', () => ({
  useMovie: () => ({
    data: mockMovieData,
    isLoading: mockIsLoading,
    isError: mockIsError,
    error: mockError,
    refetch: mockRefetchMovie,
  }),
}));

const mockUseBookingStore = jest.fn((selector: any) =>
  selector({ setMovie: mockSetMovie }),
);

jest.mock('@/features/booking/store/booking', () => ({
  useBookingStore: (selector: any) => mockUseBookingStore(selector),
}));

const mockUseMovieStore = jest.fn((selector: any) =>
  selector({ setSelectedMovie: mockSetSelectedMovie }),
);

jest.mock('@/stores/movie', () => ({
  useMovieStore: (selector: any) => mockUseMovieStore(selector),
}));

jest.mock('@/components/Tabs', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, TouchableOpacity, Text } = require('react-native');
  return {
    Tabs: ({ tabs, activeTab, onTabChange }: any) => (
      <View testID="tabs" data-active-tab={activeTab}>
        {tabs.map((tab: any) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onTabChange(tab.id)}
            testID={`tab-${tab.id}`}
          >
            <Text>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    ),
  };
});

jest.mock('expo-image', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Image } = require('react-native');
  return {
    Image: (props: any) => <Image {...props} />,
  };
});

jest.mock('@/components/HorizontalCard', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text } = require('react-native');
  return {
    HorizontalCard: ({
      title,
      posterUrl,
      durationMinutes,
      genre,
      rating,
    }: any) => (
      <View testID="horizontal-card">
        <Text testID="horizontal-card-title">{title ?? ''}</Text>
        <Text testID="horizontal-card-image">{posterUrl ?? ''}</Text>
        <Text testID="horizontal-card-duration">{durationMinutes ?? ''}</Text>
        <Text testID="horizontal-card-genre">
          {genre ? genre.join(', ') : ''}
        </Text>
        {rating && <Text testID="horizontal-card-rating">{rating}</Text>}
      </View>
    ),
  };
});

jest.mock('react-native-safe-area-context', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    SafeAreaView: ({
      children,
      accessibilityLabel,
      accessibilityHint,
    }: any) => (
      <View
        testID="safe-area-view"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      >
        {children}
      </View>
    ),
  };
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientWrapper';

  return Wrapper;
};

describe('MovieScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { id: 'movie1' };
    mockMovieData = { ...baseMovie };
    mockIsLoading = false;
    mockIsError = false;
    mockError = null;
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { getByTestId } = render(<MovieScreen />, {
        wrapper: createWrapper(),
      });
      expect(getByTestId('safe-area-view')).toBeTruthy();
    });

    it('renders the banner and horizontal card', () => {
      const { getByTestId } = render(<MovieScreen />, {
        wrapper: createWrapper(),
      });
      expect(getByTestId('movie-banner-container')).toBeTruthy();
      expect(getByTestId('horizontal-card-container')).toBeTruthy();
    });

    it('passes the movie fields to the horizontal card', () => {
      const { getByTestId } = render(<MovieScreen />, {
        wrapper: createWrapper(),
      });
      expect(getByTestId('horizontal-card-title').props.children).toBe(
        'Test Movie',
      );
      expect(getByTestId('horizontal-card-image').props.children).toBe(
        'https://example.com/poster.jpg',
      );
      expect(getByTestId('horizontal-card-duration').props.children).toBe(120);
      expect(getByTestId('horizontal-card-genre').props.children).toBe(
        'Action, Drama',
      );
      expect(getByTestId('horizontal-card-rating').props.children).toBe(4.5);
    });

    it('renders the tabs and booking button', () => {
      const { getByTestId } = render(<MovieScreen />, {
        wrapper: createWrapper(),
      });
      expect(getByTestId('tabs')).toBeTruthy();
      expect(getByTestId('booking-button')).toBeTruthy();
    });
  });

  describe('Content', () => {
    it('renders the synopsis on the first tab', () => {
      const { getByTestId } = render(<MovieScreen />, {
        wrapper: createWrapper(),
      });
      expect(getByTestId('expandable-container')).toBeTruthy();
    });

    it('renders no content on a non-first tab', () => {
      const { getByTestId, queryByTestId } = render(<MovieScreen />, {
        wrapper: createWrapper(),
      });
      expect(getByTestId('expandable-container')).toBeTruthy();

      fireEvent.press(getByTestId('tab-review'));

      expect(queryByTestId('expandable-container')).toBeNull();
    });
  });

  describe('Navigation', () => {
    it('goes back when the back button is pressed', () => {
      const { UNSAFE_getAllByType } = render(<MovieScreen />, {
        wrapper: createWrapper(),
      });
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { TouchableOpacity } = require('react-native');
      const backButton = UNSAFE_getAllByType(TouchableOpacity)[0]!;
      fireEvent.press(backButton);

      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('renders with default values when there is no movie data', () => {
      mockMovieData = null;
      const { getByTestId } = render(<MovieScreen />, {
        wrapper: createWrapper(),
      });
      expect(getByTestId('horizontal-card-title').props.children).toBe('');
    });

    it.each(['title', 'posterUrl', 'genre', 'synopsis'])(
      'handles a missing %s',
      field => {
        mockMovieData = { ...baseMovie, [field]: undefined };
        const { getByTestId } = render(<MovieScreen />, {
          wrapper: createWrapper(),
        });
        expect(getByTestId('safe-area-view')).toBeTruthy();
      },
    );
  });

  describe('Accessibility', () => {
    it('labels the screen and the booking button', () => {
      const { getByTestId } = render(<MovieScreen />, {
        wrapper: createWrapper(),
      });
      expect(getByTestId('safe-area-view').props.accessibilityLabel).toBe(
        'Movie screen',
      );
      expect(getByTestId('booking-button').props.accessibilityLabel).toBe(
        'Booking Movie',
      );
      expect(getByTestId('booking-button').props.accessibilityHint).toBe(
        'Navigate to select cinema screen',
      );
    });
  });
});
