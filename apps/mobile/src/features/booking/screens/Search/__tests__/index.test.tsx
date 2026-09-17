import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import SearchScreen from '../index';

// Mock dependencies
const mockPush = jest.fn();
const mockFetchNextPage = jest.fn();
const mockRefetch = jest.fn();

let mockMovies: any[] = [
  {
    id: '1',
    title: 'Movie 1',
    rating: 9.5,
    posterUrl: 'https://example.com/1.jpg',
  },
  {
    id: '2',
    title: 'Movie 2',
    rating: 6.8,
    posterUrl: 'https://example.com/2.jpg',
  },
];
let mockIsLoading = false;
let mockIsFetchingNextPage = false;
let mockHasNextPage = false;
let mockIsRefetching = false;
let mockIsError = false;
let mockError: Error | null = null;

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: (...args: any[]) => mockPush(...args),
  }),
}));

jest.mock('@/features/booking/hooks/useMovies', () => ({
  useSearchMoviesInfinite: () => ({
    movies: mockMovies,
    isLoading: mockIsLoading,
    isFetchingNextPage: mockIsFetchingNextPage,
    hasNextPage: mockHasNextPage,
    fetchNextPage: mockFetchNextPage,
    refetch: mockRefetch,
    isRefetching: mockIsRefetching,
    isError: mockIsError,
    error: mockError,
  }),
}));

let mockDebouncedValue = '';
jest.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => mockDebouncedValue || value,
}));

// Helper to create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientWrapper';

  return Wrapper;
};

describe('SearchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDebouncedValue = '';
    mockMovies = [
      {
        id: '1',
        title: 'Movie 1',
        rating: 9.5,
        posterUrl: 'https://example.com/1.jpg',
      },
      {
        id: '2',
        title: 'Movie 2',
        rating: 6.8,
        posterUrl: 'https://example.com/2.jpg',
      },
    ];
    mockIsLoading = false;
    mockIsFetchingNextPage = false;
    mockHasNextPage = false;
    mockIsRefetching = false;
    mockIsError = false;
    mockError = null;
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });
      expect(getByTestId('search-input')).toBeTruthy();
    });

    it('should render search input', () => {
      const { getByTestId } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });
      expect(getByTestId('search-input')).toBeTruthy();
    });

    it('should render rating filter tabs', () => {
      const { getByTestId } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });
      expect(getByTestId('tabs-container')).toBeTruthy();
    });

    it('should render horizontal cards', () => {
      const { getAllByTestId } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });
      expect(getAllByTestId('horizontal-card').length).toBe(2);
    });
  });

  describe('Search Functionality', () => {
    it('should update search query when input changes', () => {
      const { getByTestId } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });
      const searchInput = getByTestId('search-input-input');
      fireEvent.changeText(searchInput, 'test query');

      expect(searchInput.props.value).toBe('test query');
    });

    it('should show clear button when search query has text', () => {
      const { getByTestId, queryByTestId } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });
      const searchInput = getByTestId('search-input-input');

      // Initially no clear button
      expect(queryByTestId('cancel-icon')).toBeNull();

      // Type in search
      fireEvent.changeText(searchInput, 'test');

      // Clear button should appear
      expect(getByTestId('cancel-icon')).toBeTruthy();
    });

    it('should clear search when clear button is pressed', () => {
      const { getByTestId } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });
      const searchInput = getByTestId('search-input-input');

      // Type in search
      fireEvent.changeText(searchInput, 'test');

      // Press clear button
      const clearButton = getByTestId('clear-search-button');
      fireEvent.press(clearButton);

      // Search should be cleared
      expect(searchInput.props.value).toBe('');
    });

    it('should display search results when search query is active', () => {
      mockMovies = [
        {
          id: '3',
          title: 'Search Movie 1',
          rating: 4.0,
          posterUrl: 'https://example.com/3.jpg',
        },
        {
          id: '4',
          title: 'Search Movie 2',
          rating: 3.5,
          posterUrl: 'https://example.com/4.jpg',
        },
      ];
      mockDebouncedValue = 'test';

      const { getAllByTestId } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      // Should show search results
      expect(getAllByTestId('horizontal-card').length).toBe(2);
    });
  });

  describe('Movie Display', () => {
    it('should display all movies when no search query', () => {
      const { getAllByTestId } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });
      expect(getAllByTestId('horizontal-card').length).toBe(2);
    });

    it('should navigate to movie details when card is pressed', () => {
      const { getAllByTestId } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });
      const horizontalCards = getAllByTestId('horizontal-card');
      fireEvent.press(horizontalCards[0]);

      expect(mockPush).toHaveBeenCalledWith('/(main)/movies/1');
    });
  });

  describe('Rating Filter', () => {
    it('should filter movies by rating', () => {
      const { getByTestId, getAllByTestId } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      // Select 9-10 rating filter
      const highRatingTab = getByTestId('tab-9-10');
      fireEvent.press(highRatingTab);

      // Only Movie 1 with rating in [9, 10] should be shown
      expect(getAllByTestId('horizontal-card').length).toBe(1);
    });

    it('should show all movies when "All" rating is selected', () => {
      const { getByTestId, getAllByTestId } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      const allTab = getByTestId('tab-all');
      fireEvent.press(allTab);

      // All movies should be shown
      expect(getAllByTestId('horizontal-card').length).toBe(2);
    });

    it('should apply rating filter to search results', () => {
      mockMovies = [
        {
          id: '3',
          title: 'Search Movie 1',
          rating: 9.5,
          posterUrl: 'https://example.com/3.jpg',
        },
        {
          id: '4',
          title: 'Search Movie 2',
          rating: 6.0,
          posterUrl: 'https://example.com/4.jpg',
        },
      ];
      mockDebouncedValue = 'test';

      const { getByTestId, getAllByTestId } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      // Select 9-10 rating filter
      const highRatingTab = getByTestId('tab-9-10');
      fireEvent.press(highRatingTab);

      // Only high-rated search result should show
      expect(getAllByTestId('horizontal-card').length).toBe(1);
    });
  });

  describe('Results Count', () => {
    it('should display results count when movies are shown', () => {
      const { getByText } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });
      expect(getByText(/Showing 2 movies/)).toBeTruthy();
    });

    it('should display search results count when searching', () => {
      mockMovies = [
        {
          id: '3',
          title: 'Search Movie 1',
          rating: 4.0,
          posterUrl: 'https://example.com/3.jpg',
        },
      ];
      mockDebouncedValue = 'test';

      const { getByText } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      expect(getByText(/Found 1 movie for "test"/)).toBeTruthy();
    });

    it('should display rating filter in results count', () => {
      const { getByTestId, getByText } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      // Select 9-10 rating filter
      const highRatingTab = getByTestId('tab-9-10');
      fireEvent.press(highRatingTab);

      expect(getByText(/with 9-10/)).toBeTruthy();
    });

    it('should handle plural/singular in results count', () => {
      mockMovies = [
        {
          id: '1',
          title: 'Movie 1',
          rating: 4.5,
          posterUrl: 'https://example.com/1.jpg',
        },
      ];
      const { getByText } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      expect(getByText(/Showing 1 movie$/)).toBeTruthy();
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator when loading movies', () => {
      mockIsLoading = true;
      mockMovies = [];
      const { getByTestId } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      expect(getByTestId('empty-loading')).toBeTruthy();
    });

    it('should show loading indicator when searching', () => {
      mockIsLoading = true;
      mockDebouncedValue = 'test';
      mockMovies = [];
      const { getByTestId, getByText } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      expect(getByTestId('empty-loading')).toBeTruthy();
      expect(getByText('Searching movies...')).toBeTruthy();
    });

    it('should show footer loading when fetching next page', () => {
      mockIsFetchingNextPage = true;
      mockHasNextPage = true;
      const { getByTestId } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      expect(getByTestId('footer-loading')).toBeTruthy();
    });

    it('should not show footer loading when not fetching', () => {
      mockIsFetchingNextPage = false;
      const { queryByTestId } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      expect(queryByTestId('footer-loading')).toBeNull();
    });
  });

  describe('Infinite Scroll', () => {
    it('should call fetchNextPage when scrolling to end with hasNextPage', () => {
      mockHasNextPage = true;
      mockIsFetchingNextPage = false;

      const { getByTestId } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      const flashList = getByTestId('search-input').parent?.parent;

      // Simulate end reached
      fireEvent(flashList!, 'onEndReached');

      expect(mockFetchNextPage).toHaveBeenCalled();
    });

    it('should not call fetchNextPage when already fetching', () => {
      mockHasNextPage = true;
      mockIsFetchingNextPage = true;

      const { getByTestId } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      const flashList = getByTestId('search-input').parent?.parent;

      // Simulate end reached
      fireEvent(flashList!, 'onEndReached');

      expect(mockFetchNextPage).not.toHaveBeenCalled();
    });

    it('should support infinite scroll for search results', () => {
      mockMovies = [
        {
          id: '1',
          title: 'Search Movie 1',
          rating: 4.0,
          posterUrl: 'https://example.com/1.jpg',
        },
      ];
      mockDebouncedValue = 'test';
      mockHasNextPage = true;
      mockIsFetchingNextPage = false;

      const { getByTestId } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      const flashList = getByTestId('search-input').parent?.parent;
      fireEvent(flashList!, 'onEndReached');

      expect(mockFetchNextPage).toHaveBeenCalled();
    });
  });

  describe('Pull to Refresh', () => {
    it('should support pull to refresh for browse mode', () => {
      const { UNSAFE_getByType } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      // Find RefreshControl and trigger refresh
      const refreshControl = UNSAFE_getByType(
        require('react-native').RefreshControl,
      );
      refreshControl.props.onRefresh();

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should support pull to refresh for search mode', () => {
      mockDebouncedValue = 'test';
      const { UNSAFE_getByType } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      const refreshControl = UNSAFE_getByType(
        require('react-native').RefreshControl,
      );
      refreshControl.props.onRefresh();

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should show refreshing state', () => {
      mockIsRefetching = true;
      const { UNSAFE_getByType } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      const refreshControl = UNSAFE_getByType(
        require('react-native').RefreshControl,
      );
      expect(refreshControl.props.refreshing).toBe(true);
    });
  });

  describe('Error States', () => {
    it('should show error when loading fails', () => {
      mockIsError = true;
      mockError = new Error('Network error');
      mockMovies = [];
      const { getByTestId } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      expect(getByTestId('empty-error')).toBeTruthy();
    });

    it('should show retry button on error', () => {
      mockIsError = true;
      mockError = new Error('Network error');
      mockMovies = [];
      const { getByText } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      const retryButton = getByText('Retry');
      expect(retryButton).toBeTruthy();

      fireEvent.press(retryButton);
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should show different error message for search', () => {
      mockIsError = true;
      mockDebouncedValue = 'test';
      mockMovies = [];
      const { getByText } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      expect(
        getByText('No results found. Please try a different search.'),
      ).toBeTruthy();
    });
  });

  describe('Empty States', () => {
    it('should show "No movies found" when no results', () => {
      mockMovies = [];
      const { getByText } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      expect(getByText(/No movies found/)).toBeTruthy();
    });

    it('should show search-specific empty message', () => {
      mockMovies = [];
      mockDebouncedValue = 'test query';
      const { getByText } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      expect(
        getByText(/Try searching with different keywords for "test query"/),
      ).toBeTruthy();
    });

    it('should not show empty states when there are movies', () => {
      const { queryByTestId } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      expect(queryByTestId('empty-loading')).toBeNull();
      expect(queryByTestId('empty-no-results')).toBeNull();
      expect(queryByTestId('empty-error')).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle movies without rating', () => {
      mockMovies = [
        {
          id: '1',
          title: 'Movie 1',
          posterUrl: 'https://example.com/1.jpg',
        },
      ];
      const { getAllByTestId } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      expect(getAllByTestId('horizontal-card').length).toBe(1);
    });

    it('should handle empty pages array', () => {
      mockMovies = [];
      const { getByPlaceholderText } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      expect(getByPlaceholderText('Search movies...')).toBeTruthy();
    });

    it('should handle multiple movies', () => {
      mockMovies = [
        {
          id: '1',
          title: 'Movie 1',
          rating: 4.5,
          posterUrl: 'https://example.com/1.jpg',
        },
        {
          id: '2',
          title: 'Movie 2',
          rating: 3.8,
          posterUrl: 'https://example.com/2.jpg',
        },
        {
          id: '3',
          title: 'Movie 3',
          rating: 4.2,
          posterUrl: 'https://example.com/3.jpg',
        },
        {
          id: '4',
          title: 'Movie 4',
          rating: 3.5,
          posterUrl: 'https://example.com/4.jpg',
        },
      ];

      const { getAllByTestId } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      // Should display all movies (hook now handles flattening internally)
      expect(getAllByTestId('horizontal-card').length).toBe(4);
    });
  });

  describe('Accessibility', () => {
    it('should have correct accessibility label on search input', () => {
      const { getByLabelText } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      expect(getByLabelText('Search movies input')).toBeTruthy();
    });

    it('should have correct accessibility label on clear button', () => {
      const { getByTestId, getByLabelText } = render(<SearchScreen />, {
        wrapper: createWrapper(),
      });

      const searchInput = getByTestId('search-input-input');
      fireEvent.changeText(searchInput, 'test');

      expect(getByLabelText('Clear search')).toBeTruthy();
    });
  });
});
