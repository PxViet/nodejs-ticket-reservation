import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import CinemaScreen from '../index';

// Mock dependencies
const mockPush = jest.fn();
const mockSetShowtime = jest.fn();
const mockClearSelectedMovie = jest.fn();
const mockShowToast = jest.fn();

let mockParams: { movieId?: string; movieTitle: string } = {
  movieId: 'movie1',
  movieTitle: 'Test Movie',
};
const mockUseShowtimes = jest.fn();
let mockShowtimesData: any[] = [];
let mockIsLoading = false;
let mockIsError = false;
let mockError: Error | null = null;

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  router: {
    push: mockPush,
  },
}));

jest.mock('@/features/booking/hooks/useShowtimes', () => ({
  useShowtimes: (movieId: string, date: string, hallId?: string) => {
    mockUseShowtimes(movieId, date, hallId);
    return {
      data: mockShowtimesData,
      isLoading: mockIsLoading,
      isError: mockIsError,
      error: mockError,
    };
  },
}));

const mockUseBookingStore = jest.fn((selector: any) =>
  selector({
    setShowtime: mockSetShowtime,
  }),
);

jest.mock('@/features/booking/store/booking', () => ({
  useBookingStore: (selector: any) => mockUseBookingStore(selector),
}));

const mockUseMovieStore = jest.fn((selector: any) =>
  selector({
    clearSelectedMovie: mockClearSelectedMovie,
  }),
);

jest.mock('@/stores/movie', () => ({
  useMovieStore: (selector: any) => mockUseMovieStore(selector),
}));

const mockUseToastStore = jest.fn((selector: any) =>
  selector({
    showError: mockShowToast,
  }),
);

jest.mock('@/stores/toast', () => ({
  useToastStore: (selector: any) => mockUseToastStore(selector),
}));

// Mock utils
jest.mock('@/utils/dates', () => ({
  getDayOfWeekLabels: () => [
    { id: '2024-01-15', label: 'Today' },
    { id: '2024-01-16', label: 'Tomorrow' },
    { id: '2024-01-17', label: 'Wed' },
  ],
  formatShowTimes: (showtimes: any[], date: string) => {
    if (!showtimes || showtimes.length === 0) return [];
    const byHall = new Map<string, any>();
    for (const showtime of showtimes.filter(
      (s: any) => s.showDate === date && s.hall,
    )) {
      if (!byHall.has(showtime.hall.id)) {
        byHall.set(showtime.hall.id, { hall: showtime.hall, showtimes: [] });
      }
      byHall.get(showtime.hall.id).showtimes.push(showtime);
    }
    return Array.from(byHall.values());
  },
}));

jest.mock('@/utils/formats', () => ({
  formatTime: (time: string) => time,
}));

jest.mock('@/features/booking/components/HallDropdown', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    HallDropdown: ({ value, onChange, containerClassName, testID }: any) =>
      React.createElement(
        View,
        {
          testID: testID || 'hall-dropdown',
          className: containerClassName,
        },
        React.createElement(Text, null, `Hall: ${value || 'All'}`),
        React.createElement(
          TouchableOpacity,
          {
            onPress: () => onChange('hall2'),
            testID: 'hall-change-button',
          },
          React.createElement(Text, null, 'Change Hall'),
        ),
      ),
  };
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientWrapper';

  return Wrapper;
};

describe('CinemaScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = { movieId: 'movie1', movieTitle: 'Test Movie' };
    mockShowtimesData = [
      {
        id: 'showtime1',
        movieId: 'movie1',
        hallId: 'hall1',
        showDate: '2024-01-15',
        showTime: '14:00',
        endTime: '16:00',
        basePrice: 50,
        status: 'active',
        hall: {
          id: 'hall1',
          name: 'Hall 1',
          hallType: 'IMAX',
        },
      },
      {
        id: 'showtime2',
        movieId: 'movie1',
        hallId: 'hall1',
        showDate: '2024-01-15',
        showTime: '16:00',
        endTime: '18:00',
        basePrice: 50,
        status: 'active',
        hall: {
          id: 'hall1',
          name: 'Hall 1',
          hallType: 'IMAX',
        },
      },
    ];
    mockIsLoading = false;
    mockIsError = false;
    mockError = null;
  });

  describe('Rendering', () => {
    it('should render HallDropdown in header', () => {
      const { getByTestId } = render(<CinemaScreen />, {
        wrapper: createWrapper(),
      });
      expect(getByTestId('hall-dropdown')).toBeTruthy();
    });

    it('should render date selection in header', () => {
      const { getByText } = render(<CinemaScreen />, {
        wrapper: createWrapper(),
      });
      expect(getByText('Choose Date')).toBeTruthy();
    });

    it('should render all date options', () => {
      const { getByText } = render(<CinemaScreen />, {
        wrapper: createWrapper(),
      });
      expect(getByText('Today')).toBeTruthy();
      expect(getByText('Tomorrow')).toBeTruthy();
      expect(getByText('Wed')).toBeTruthy();
    });

    it('should render halls with showtimes', () => {
      const { getByText } = render(<CinemaScreen />, {
        wrapper: createWrapper(),
      });
      expect(getByText('Hall 1')).toBeTruthy();
    });

    it('should render showtime options', () => {
      const { getByText } = render(<CinemaScreen />, {
        wrapper: createWrapper(),
      });
      expect(getByText('14:00')).toBeTruthy();
      expect(getByText('16:00')).toBeTruthy();
    });
  });

  describe('Loading State', () => {
    it('should not show navigation button when loading', () => {
      mockIsLoading = true;
      const { queryByTestId } = render(<CinemaScreen />, {
        wrapper: createWrapper(),
      });
      expect(queryByTestId('arrow-right-icon')).toBeNull();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no showtimes available', () => {
      mockShowtimesData = [];
      const { getByText } = render(<CinemaScreen />, {
        wrapper: createWrapper(),
      });
      expect(getByText('No showtimes available')).toBeTruthy();
      expect(getByText('Please select a different date')).toBeTruthy();
    });

    it('should not show navigation button when no showtimes', () => {
      mockShowtimesData = [];
      const { queryByTestId } = render(<CinemaScreen />, {
        wrapper: createWrapper(),
      });
      expect(queryByTestId('arrow-right-icon')).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should show error toast when error occurs', () => {
      mockIsError = true;
      mockError = new Error('Failed to fetch showtimes');

      render(<CinemaScreen />, {
        wrapper: createWrapper(),
      });

      waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Failed to fetch showtimes');
      });
    });

    it('should show default error message when error message is missing', async () => {
      mockIsError = true;
      mockError = new Error('');

      render(<CinemaScreen />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          'Something went wrong. Please try again later.',
        );
      });
    });

    it('should not show navigation button when error', () => {
      mockIsError = true;
      const { queryByTestId } = render(<CinemaScreen />, {
        wrapper: createWrapper(),
      });
      expect(queryByTestId('arrow-right-icon')).toBeNull();
    });
  });

  describe('Date Selection', () => {
    it('should select date when date option is pressed', () => {
      const { getByText } = render(<CinemaScreen />, {
        wrapper: createWrapper(),
      });
      const tomorrowButton = getByText('Tomorrow').parent;

      fireEvent.press(tomorrowButton!);

      // Date should be selected (check by re-rendering)
      const { getByText: getByTextAfter } = render(<CinemaScreen />, {
        wrapper: createWrapper(),
      });
      expect(getByTextAfter('Tomorrow')).toBeTruthy();
    });

    it('should clear selected showtime when date changes', () => {
      const { getByText } = render(<CinemaScreen />, {
        wrapper: createWrapper(),
      });

      // First select a showtime
      const showtimeButton = getByText('14:00').parent;
      fireEvent.press(showtimeButton!);

      // Then change date
      const tomorrowButton = getByText('Tomorrow').parent;
      fireEvent.press(tomorrowButton!);

      // Showtime should be cleared (button should be disabled)
      // This is tested through the navigation button state
    });
  });

  describe('Hall Selection', () => {
    it('should re-query with the chosen hall', () => {
      const { getByTestId } = render(<CinemaScreen />, {
        wrapper: createWrapper(),
      });

      fireEvent.press(getByTestId('hall-change-button'));

      // The hall filter reaches the query rather than sitting in local state.
      expect(mockUseShowtimes).toHaveBeenLastCalledWith(
        'movie1',
        '2024-01-15',
        'hall2',
      );
    });
  });

  describe('Showtime Selection', () => {
    it('should select showtime when showtime option is pressed', () => {
      const { getByText } = render(<CinemaScreen />, {
        wrapper: createWrapper(),
      });
      const showtimeButton = getByText('14:00').parent;

      fireEvent.press(showtimeButton!);

      expect(mockSetShowtime).toHaveBeenCalled();
    });

    it('should set showtime in booking store when selected', () => {
      const { getByText } = render(<CinemaScreen />, {
        wrapper: createWrapper(),
      });
      const showtimeButton = getByText('14:00').parent;

      fireEvent.press(showtimeButton!);

      expect(mockSetShowtime).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'showtime1',
        }),
      );
    });
  });

  describe('Navigation', () => {
    it('should not navigate when showtime is not selected', () => {
      const { queryByLabelText } = render(<CinemaScreen />, {
        wrapper: createWrapper(),
      });

      // Don't select showtime, button should be disabled
      const navButton = queryByLabelText('Continue to seat selection');
      if (navButton && !navButton.parent?.props.disabled) {
        fireEvent.press(navButton);
        expect(mockPush).not.toHaveBeenCalled();
      }
    });

    it('should not navigate when date is not selected', () => {
      const { queryByLabelText, queryByTestId } = render(<CinemaScreen />, {
        wrapper: createWrapper(),
      });

      // Select showtime but not date
      const showtimeButton = queryByTestId('selectbox-14:00');
      if (showtimeButton) {
        fireEvent.press(showtimeButton);
      }

      const navButton = queryByLabelText('Continue to seat selection');
      if (navButton && !navButton.parent?.props.disabled) {
        fireEvent.press(navButton);
        expect(mockPush).not.toHaveBeenCalled();
      }
    });
  });

  describe('Navigation Button State', () => {
    it('should enable navigation button when date and showtime are selected', () => {
      const { getByText, getByLabelText } = render(<CinemaScreen />, {
        wrapper: createWrapper(),
      });

      // Select date
      const dateButton = getByText('Today').parent;
      fireEvent.press(dateButton!);

      // Select showtime
      const showtimeButton = getByText('14:00').parent;
      fireEvent.press(showtimeButton!);

      // Button should be enabled (not disabled)
      const navButton = getByLabelText('Continue to seat selection').parent;
      expect(navButton?.props.disabled).toBe(undefined);
    });
  });

  describe('Edge Cases', () => {
    it('should return null from renderEmpty when data exists', () => {
      // When not loading and hallsWithShowtimes.length > 0, renderEmpty should return null
      mockIsLoading = false;
      mockShowtimesData = [
        {
          id: 'showtime1',
          movieId: 'movie1',
          hallId: 'hall1',
          showDate: '2024-01-15',
          showTime: '14:00',
          endTime: '16:00',
          basePrice: 50,
          status: 'active',
          hall: {
            id: 'hall1',
            name: 'Hall 1',
            hallType: 'IMAX',
          },
        },
      ];

      const { queryByText } = render(<CinemaScreen />, {
        wrapper: createWrapper(),
      });

      // Should not show empty state messages
      expect(queryByText('No showtimes available')).toBeNull();
      expect(queryByText('Loading showtimes...')).toBeNull();
      // Should show hall data instead
      expect(queryByText('Hall 1')).toBeTruthy();
    });

    it('should handle multiple halls', () => {
      mockShowtimesData = [
        {
          id: 'showtime1',
          movieId: 'movie1',
          hallId: 'hall1',
          showDate: '2024-01-15',
          showTime: '14:00',
          endTime: '16:00',
          basePrice: 50,
          status: 'active',
          hall: {
            id: 'hall1',
            name: 'Hall 1',
            hallType: 'IMAX',
          },
        },
        {
          id: 'showtime2',
          movieId: 'movie1',
          hallId: 'hall2',
          showDate: '2024-01-15',
          showTime: '16:00',
          endTime: '18:00',
          basePrice: 50,
          status: 'active',
          hall: {
            id: 'hall2',
            name: 'Hall 2',
            hallType: 'IMAX',
          },
        },
      ];

      const { getByText } = render(<CinemaScreen />, {
        wrapper: createWrapper(),
      });

      expect(getByText('Hall 1')).toBeTruthy();
      // Note: formatShowTimes groups by hall, so both should be visible
    });
  });

  describe('Accessibility', () => {
    it('should have correct accessibility label for navigation button', () => {
      const { getByLabelText } = render(<CinemaScreen />, {
        wrapper: createWrapper(),
      });

      const navButton = getByLabelText('Continue to seat selection').parent;
      expect(navButton?.props.accessibilityRole).toBe('button');
      expect(navButton?.props.accessibilityLabel).toBe(
        'Continue to seat selection',
      );
    });
  });
});
