import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import SeatsScreen from '../index';

// Mocks
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockAddSeat = jest.fn();
const mockRemoveSeat = jest.fn();
const mockSetSeats = jest.fn();
const mockSetHoldIds = jest.fn();
const mockSetHeldUntil = jest.fn();
const mockShowError = jest.fn();
const mockRefetch = jest.fn();
const mockHoldSeats = jest.fn();

let mockSelectedMovie: any = { id: 'movie1', title: 'Test Movie' };
let mockSelectedShowtime: any = {
  id: 'showtime1',
  basePrice: 50000,
  hall: { id: 'hall1', name: 'Hall 1', hallType: 'IMAX' },
};
let mockSelectedSeats: any[] = [];
let mockIsAuthenticated = true;

let mockSeatMap: any = {
  data: [
    {
      seatId: 'id-A1',
      seatRow: 'A',
      seatColumn: 1,
      seatLabel: 'A1',
      status: 'available',
    },
    {
      seatId: 'id-A2',
      seatRow: 'A',
      seatColumn: 2,
      seatLabel: 'A2',
      status: 'available',
    },
    {
      seatId: 'id-A3',
      seatRow: 'A',
      seatColumn: 3,
      seatLabel: 'A3',
      status: 'held',
      isMine: false,
    },
    {
      seatId: 'id-B1',
      seatRow: 'B',
      seatColumn: 1,
      seatLabel: 'B1',
      status: 'reserved',
      isMine: false,
    },
    {
      seatId: 'id-B2',
      seatRow: 'B',
      seatColumn: 2,
      seatLabel: 'B2',
      status: 'available',
    },
  ],
  isLoading: false,
  isError: false,
  error: null,
  refetch: mockRefetch,
};

let mockHoldMutation: any = { mutate: mockHoldSeats, isPending: false };

jest.mock('expo-router', () => ({
  router: {
    push: (...args: any[]) => mockPush(...args),
    back: (...args: any[]) => mockBack(...args),
  },
  Href: {} as any,
}));

jest.mock('@/features/booking/hooks/useSeatMap', () => ({
  useSeatMap: () => mockSeatMap,
  useHoldSeats: () => mockHoldMutation,
}));

jest.mock('@/features/booking/store/booking', () => ({
  useBookingStore: (selector: any) =>
    selector({
      selectedMovie: mockSelectedMovie,
      selectedShowtime: mockSelectedShowtime,
      selectedSeats: mockSelectedSeats,
      addSeat: mockAddSeat,
      removeSeat: mockRemoveSeat,
      setSeats: mockSetSeats,
      setHoldIds: mockSetHoldIds,
      setHeldUntil: mockSetHeldUntil,
    }),
}));

jest.mock('@/features/auth/store/auth', () => ({
  useAuthStore: (selector: any) =>
    selector({ isAuthenticated: mockIsAuthenticated }),
}));

jest.mock('@/stores/toast', () => ({
  useToastStore: (selector: any) => selector({ showError: mockShowError }),
}));

jest.mock('@/constants', () => ({
  ROUTES: {
    CHECKOUT: '/(main)/booking/checkout',
    LOGIN: '/(auth)/signin',
  },
  Size: { SMALL: 'small' },
  ERROR_MESSAGES: { SOMETHING_WENT_WRONG: 'Something went wrong.' },
}));

jest.mock('@/utils/formats', () => ({
  calculateTotalPrice: (price: number, seats: number) => price * seats,
  formatIDR: (amount: number) => `IDR ${amount.toLocaleString('id-ID')}`,
}));

describe('SeatsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedMovie = { id: 'movie1', title: 'Test Movie' };
    mockSelectedShowtime = {
      id: 'showtime1',
      basePrice: 50000,
      hall: { id: 'hall1', name: 'Hall 1', hallType: 'IMAX' },
    };
    mockSelectedSeats = [];
    mockIsAuthenticated = true;
    mockSeatMap = {
      data: [
        {
          seatId: 'id-A1',
          seatRow: 'A',
          seatColumn: 1,
          seatLabel: 'A1',
          status: 'available',
        },
        {
          seatId: 'id-A2',
          seatRow: 'A',
          seatColumn: 2,
          seatLabel: 'A2',
          status: 'available',
        },
        {
          seatId: 'id-A3',
          seatRow: 'A',
          seatColumn: 3,
          seatLabel: 'A3',
          status: 'held',
          isMine: false,
        },
        {
          seatId: 'id-B1',
          seatRow: 'B',
          seatColumn: 1,
          seatLabel: 'B1',
          status: 'reserved',
          isMine: false,
        },
        {
          seatId: 'id-B2',
          seatRow: 'B',
          seatColumn: 2,
          seatLabel: 'B2',
          status: 'available',
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    };
    mockHoldMutation = { mutate: mockHoldSeats, isPending: false };
  });

  describe('Rendering', () => {
    it('renders the movie title and hall name', () => {
      const { getByText } = render(<SeatsScreen />);
      expect(getByText('Test Movie')).toBeTruthy();
      expect(getByText('Hall 1')).toBeTruthy();
    });

    it('renders the legend and the screen icon', () => {
      const { getByText, getByTestId } = render(<SeatsScreen />);
      expect(getByText('Available')).toBeTruthy();
      expect(getByText('Taken')).toBeTruthy();
      expect(getByText('Your Seat')).toBeTruthy();
      expect(getByTestId('screen-icon')).toBeTruthy();
    });

    it('renders one box per seat from the seat map', () => {
      const { getByTestId } = render(<SeatsScreen />);
      expect(getByTestId('seat-A1')).toBeTruthy();
      expect(getByTestId('seat-A2')).toBeTruthy();
      expect(getByTestId('seat-B1')).toBeTruthy();
    });

    it('shows the loading indicator while the map is loading', () => {
      mockSeatMap = { ...mockSeatMap, isLoading: true, data: undefined };
      const { getByTestId, queryByTestId } = render(<SeatsScreen />);
      expect(getByTestId('seat-map-loading-indicator')).toBeTruthy();
      expect(queryByTestId('seat-A1')).toBeNull();
    });

    it('shows a "Your hold" legend entry when the caller holds a seat', () => {
      mockSeatMap = {
        ...mockSeatMap,
        data: [
          {
            seatId: 'id-A1',
            seatRow: 'A',
            seatColumn: 1,
            seatLabel: 'A1',
            status: 'held',
            isMine: true,
          },
        ],
      };
      const { getByText } = render(<SeatsScreen />);
      expect(getByText('Your hold')).toBeTruthy();
    });

    it('toasts the error message when the map fails to load', () => {
      mockSeatMap = {
        ...mockSeatMap,
        isError: true,
        error: { message: 'seat map down' },
        data: undefined,
      };
      render(<SeatsScreen />);
      expect(mockShowError).toHaveBeenCalledWith('seat map down');
    });
  });

  describe('Seat selection', () => {
    it('adds an available seat when tapped', () => {
      const { getByTestId } = render(<SeatsScreen />);
      fireEvent.press(getByTestId('seat-A1'));
      expect(mockAddSeat).toHaveBeenCalledWith({
        seatId: 'id-A1',
        seatLabel: 'A1',
      });
      expect(mockRemoveSeat).not.toHaveBeenCalled();
    });

    it('removes a seat that is already selected', () => {
      mockSelectedSeats = [{ seatId: 'id-A1', seatLabel: 'A1' }];
      const { getByTestId } = render(<SeatsScreen />);
      fireEvent.press(getByTestId('seat-A1'));
      expect(mockRemoveSeat).toHaveBeenCalledWith('id-A1');
      expect(mockAddSeat).not.toHaveBeenCalled();
    });

    it('ignores taps on held or reserved seats', () => {
      const { getByTestId } = render(<SeatsScreen />);
      fireEvent.press(getByTestId('seat-A3')); // held
      fireEvent.press(getByTestId('seat-B1')); // reserved
      expect(mockAddSeat).not.toHaveBeenCalled();
      expect(mockRemoveSeat).not.toHaveBeenCalled();
    });
  });

  describe('Book Ticket', () => {
    it('is disabled with no seats selected', () => {
      const { getByTestId } = render(<SeatsScreen />);
      expect(
        getByTestId('book-ticket-button').props.accessibilityState.disabled,
      ).toBe(true);
    });

    it('holds the selected seats and routes to checkout on success', () => {
      mockSelectedSeats = [
        { seatId: 'id-A1', seatLabel: 'A1' },
        { seatId: 'id-A2', seatLabel: 'A2' },
      ];
      mockHoldSeats.mockImplementation((_input, { onSuccess }) =>
        onSuccess([
          { id: 'hold1', heldUntil: '2024-01-15T14:10:00.000Z' },
          { id: 'hold2', heldUntil: '2024-01-15T14:09:00.000Z' },
        ]),
      );

      const { getByTestId } = render(<SeatsScreen />);
      fireEvent.press(getByTestId('book-ticket-button'));

      expect(mockHoldSeats).toHaveBeenCalledWith(
        { showtimeId: 'showtime1', seatIds: ['id-A1', 'id-A2'] },
        expect.any(Object),
      );
      expect(mockSetHoldIds).toHaveBeenCalledWith(['hold1', 'hold2']);
      expect(mockSetHeldUntil).toHaveBeenCalledWith('2024-01-15T14:09:00.000Z');
      expect(mockPush).toHaveBeenCalledWith('/(main)/booking/checkout');
    });

    it('clears the selection and refetches on SEAT_UNAVAILABLE', () => {
      mockSelectedSeats = [{ seatId: 'id-A1', seatLabel: 'A1' }];
      mockHoldSeats.mockImplementation((_input, { onError }) =>
        onError({ errorCode: 'SEAT_UNAVAILABLE', message: 'taken' }),
      );

      const { getByTestId } = render(<SeatsScreen />);
      fireEvent.press(getByTestId('book-ticket-button'));

      expect(mockShowError).toHaveBeenCalledWith(
        'Some of those seats were just taken.',
      );
      expect(mockSetSeats).toHaveBeenCalledWith([]);
      expect(mockRefetch).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('goes back on SHOWTIME_NOT_BOOKABLE', () => {
      mockSelectedSeats = [{ seatId: 'id-A1', seatLabel: 'A1' }];
      mockHoldSeats.mockImplementation((_input, { onError }) =>
        onError({ errorCode: 'SHOWTIME_NOT_BOOKABLE', message: 'closed' }),
      );

      const { getByTestId } = render(<SeatsScreen />);
      fireEvent.press(getByTestId('book-ticket-button'));

      expect(mockBack).toHaveBeenCalled();
    });

    it('routes to sign-in when the user is not authenticated', () => {
      mockIsAuthenticated = false;
      mockSelectedSeats = [{ seatId: 'id-A1', seatLabel: 'A1' }];

      const { getByTestId } = render(<SeatsScreen />);
      fireEvent.press(getByTestId('book-ticket-button'));

      expect(mockHoldSeats).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/(auth)/signin');
    });
  });

  describe('Total price', () => {
    it('reflects the selected seat count', () => {
      mockSelectedSeats = [
        { seatId: 'id-A1', seatLabel: 'A1' },
        { seatId: 'id-A2', seatLabel: 'A2' },
      ];
      const { getByText } = render(<SeatsScreen />);
      expect(getByText(/2 Tickets/)).toBeTruthy();
      expect(getByText(/IDR 100/)).toBeTruthy();
    });
  });
});
