import { fireEvent, render } from '@testing-library/react-native';

import AdminMoviesScreen from '../index';

// Types
import type { AdminMovie } from '@/features/admin/services/movies';

// Mock expo-router
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (route: any) => mockPush(route) },
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) => (
      <View {...props}>{children}</View>
    ),
  };
});

// Mock expo-image (used inside HorizontalCard)
jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: ({ testID, ...props }: any) => <View testID={testID} {...props} />,
  };
});

// No debounce delay in tests
jest.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

jest.mock('@/utils/cn', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

jest.mock('@/utils/formats', () => ({
  formatIDR: (value: string | number) => `IDR ${value}`,
  formatMovieDuration: (minutes: number) =>
    `${Math.floor(minutes / 60)}h ${minutes % 60}m`,
  formatShowtimeDate: () => '',
  clampedRatingToStars: (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (rating >= i + 1 ? 1 : 0)),
}));

jest.mock('@/constants', () => ({
  ROUTES: {
    ADMIN_MOVIE_FORM: (id?: string) =>
      id ? `/(main)/admin/movie-form?id=${id}` : '/(main)/admin/movie-form',
  },
  TABS_FOOTER_HEIGHT: 80,
  Size: { SMALL: 'small' },
  IMAGE_SIZE_MAP: { small: 'w-21 h-30' },
  BLUR_HASH: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4',
}));

const mockFetchNextPage = jest.fn();
const mockRefetch = jest.fn();

let mockMoviesData: { pages: { data: AdminMovie[] }[] } | undefined;
let mockIsLoading = false;
let mockIsRefetching = false;
let mockHasNextPage = false;
let mockIsFetchingNextPage = false;

jest.mock('@/features/admin/hooks/useAdminMovies', () => ({
  useAdminMoviesInfinite: jest.fn(() => ({
    data: mockMoviesData,
    isLoading: mockIsLoading,
    isRefetching: mockIsRefetching,
    refetch: mockRefetch,
    hasNextPage: mockHasNextPage,
    isFetchingNextPage: mockIsFetchingNextPage,
    fetchNextPage: mockFetchNextPage,
  })),
}));

const createMockMovie = (id: string, isActive = true): AdminMovie => ({
  id,
  title: `Movie ${id}`,
  synopsis: 'Synopsis',
  posterUrl: 'https://example.com/p.jpg',
  durationMinutes: 120,
  language: 'en',
  releaseDate: '2026-01-01',
  rating: 7,
  isActive,
  genres: [{ id: 'g1', name: 'Action' }],
});

describe('AdminMoviesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMoviesData = undefined;
    mockIsLoading = false;
    mockIsRefetching = false;
    mockHasNextPage = false;
    mockIsFetchingNextPage = false;
  });

  describe('Empty state', () => {
    it('shows an empty message when there are no movies', () => {
      mockMoviesData = { pages: [{ data: [] }] };

      const { getByText } = render(<AdminMoviesScreen />);

      expect(getByText('No movies match your search.')).toBeTruthy();
    });
  });

  describe('List rendering', () => {
    it('renders a movie title', () => {
      mockMoviesData = { pages: [{ data: [createMockMovie('1')] }] };

      const { getByText } = render(<AdminMoviesScreen />);

      expect(getByText('Movie 1')).toBeTruthy();
    });

    it('flags an inactive movie in its title', () => {
      mockMoviesData = { pages: [{ data: [createMockMovie('1', false)] }] };

      const { getByText } = render(<AdminMoviesScreen />);

      expect(getByText('Movie 1 (inactive)')).toBeTruthy();
    });

    it('flattens multiple pages', () => {
      mockMoviesData = {
        pages: [
          { data: [createMockMovie('1')] },
          { data: [createMockMovie('2')] },
        ],
      };

      const { getByText } = render(<AdminMoviesScreen />);

      expect(getByText('Movie 1')).toBeTruthy();
      expect(getByText('Movie 2')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('navigates to the create form when the add button is pressed', () => {
      mockMoviesData = { pages: [{ data: [] }] };

      const { getByTestId } = render(<AdminMoviesScreen />);

      fireEvent.press(getByTestId('admin-add-movie-button'));

      expect(mockPush).toHaveBeenCalledWith('/(main)/admin/movie-form');
    });

    it('navigates to the edit form when a movie is pressed', () => {
      mockMoviesData = { pages: [{ data: [createMockMovie('1')] }] };

      const { getByText } = render(<AdminMoviesScreen />);

      fireEvent.press(getByText('Movie 1'));

      expect(mockPush).toHaveBeenCalledWith('/(main)/admin/movie-form?id=1');
    });
  });

  describe('Search', () => {
    it('updates the search input value as the admin types', () => {
      mockMoviesData = { pages: [{ data: [] }] };

      const { getByPlaceholderText } = render(<AdminMoviesScreen />);
      const input = getByPlaceholderText('Search movies to edit');

      fireEvent.changeText(input, 'batman');

      expect(input.props.value).toBe('batman');
    });
  });

  describe('Pagination', () => {
    it('fetches the next page when the list end is reached', () => {
      mockMoviesData = { pages: [{ data: [createMockMovie('1')] }] };
      mockHasNextPage = true;

      const { getByTestId } = render(<AdminMoviesScreen />);

      fireEvent(getByTestId('admin-movies-list'), 'onEndReached');

      expect(mockFetchNextPage).toHaveBeenCalled();
    });

    it('does not fetch again while already fetching', () => {
      mockMoviesData = { pages: [{ data: [createMockMovie('1')] }] };
      mockHasNextPage = true;
      mockIsFetchingNextPage = true;

      const { getByTestId } = render(<AdminMoviesScreen />);

      fireEvent(getByTestId('admin-movies-list'), 'onEndReached');

      expect(mockFetchNextPage).not.toHaveBeenCalled();
    });
  });

  describe('Pull to refresh', () => {
    it('calls refetch on pull to refresh', async () => {
      mockMoviesData = { pages: [{ data: [createMockMovie('1')] }] };

      const { getByTestId } = render(<AdminMoviesScreen />);
      const list = getByTestId('admin-movies-list');

      await list.props.refreshControl.props.onRefresh();

      expect(mockRefetch).toHaveBeenCalled();
    });
  });
});
