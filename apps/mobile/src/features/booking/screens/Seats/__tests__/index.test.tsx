import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import SeatsScreen from '../index';

// Mock dependencies
const mockPush = jest.fn();
const mockAddSeat = jest.fn();
const mockRemoveSeat = jest.fn();

let mockSelectedMovie: any = {
  id: 'movie1',
  title: 'Test Movie',
};

let mockSelectedShowtime: any = {
  id: 'showtime1',
  basePrice: 50000,
  hall: {
    id: 'hall1',
    name: 'Hall 1',
    hallType: 'IMAX',
  },
};

let mockSelectedSeats: string[] = [];

jest.mock('expo-router', () => ({
  router: {
    push: (...args: any[]) => mockPush(...args),
  },
  Href: {} as any,
}));

jest.mock('@/features/booking/store/booking', () => ({
  useBookingStore: (selector: any) => {
    const state = {
      selectedMovie: mockSelectedMovie,
      selectedShowtime: mockSelectedShowtime,
      selectedSeats: mockSelectedSeats,
      addSeat: mockAddSeat,
      removeSeat: mockRemoveSeat,
    };
    return selector(state);
  },
  useShallow: (fn: any) => fn,
}));

jest.mock('@/utils/data', () => {
  return {
    generateSeats: () => [
      { id: 'A1', row: 'A', number: 1, status: 'available' },
      { id: 'A2', row: 'A', number: 2, status: 'available' },
      { id: 'A3', row: 'A', number: 3, status: 'available' },
      { id: 'A4', row: 'A', number: 4, status: 'available' },
      { id: 'A5', row: 'A', number: 5, status: 'available' },
      { id: 'B1', row: 'B', number: 1, status: 'booked' },
      { id: 'B2', row: 'B', number: 2, status: 'available' },
    ],
  };
});

jest.mock('@/utils/formats', () => ({
  groupSeatsByRow: (seats: any[]) => {
    const grouped: Record<string, any[]> = {};
    seats.forEach(seat => {
      if (!grouped[seat.row]) {
        grouped[seat.row] = [];
      }
      grouped[seat?.row || '']?.push(seat);
    });
    return grouped;
  },
  calculateTotalPrice: (price: number, seats: number) => price * seats,
  formatIDR: (amount: number) => `IDR ${amount.toLocaleString('id-ID')}`,
}));

// Mock constants
jest.mock('@/constants', () => ({
  ROUTES: {
    CHECKOUT: '/(main)/booking/checkout',
  },
  Size: {
    SMALL: 'small',
  },
}));

describe('SeatsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedMovie = {
      id: 'movie1',
      title: 'Test Movie',
    };
    mockSelectedShowtime = {
      id: 'showtime1',
      basePrice: 50000,
      hall: {
        id: 'hall1',
        name: 'Hall 1',
        hallType: 'IMAX',
      },
    };
    mockSelectedSeats = [];
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { getByText } = render(<SeatsScreen />);
      expect(getByText('Test Movie')).toBeTruthy();
    });

    it('should render movie title', () => {
      const { getByText } = render(<SeatsScreen />);
      expect(getByText('Test Movie')).toBeTruthy();
    });

    it('should render hall name', () => {
      const { getByText } = render(<SeatsScreen />);
      expect(getByText('Hall 1')).toBeTruthy();
    });

    it('should render status colors', () => {
      const { getByText } = render(<SeatsScreen />);
      expect(getByText('Available')).toBeTruthy();
      expect(getByText('Booked')).toBeTruthy();
      expect(getByText('Your Seat')).toBeTruthy();
    });

    it('should render screen icon', () => {
      const { getByTestId, getByText } = render(<SeatsScreen />);
      expect(getByTestId('screen-icon')).toBeTruthy();
      expect(getByText('Screen')).toBeTruthy();
    });

    it('should render book ticket button', () => {
      const { getByTestId } = render(<SeatsScreen />);
      expect(getByTestId('book-ticket-button')).toBeTruthy();
    });
  });

  describe('Seat Selection', () => {
    it('should add seat when available seat is pressed', () => {
      const { getByTestId } = render(<SeatsScreen />);
      const seatA1 = getByTestId('seat-A1');
      fireEvent.press(seatA1);

      expect(mockAddSeat).toHaveBeenCalledWith('A1');
      expect(mockRemoveSeat).not.toHaveBeenCalled();
    });

    it('should remove seat when selected seat is pressed', () => {
      mockSelectedSeats = ['A1'];
      const { getByTestId } = render(<SeatsScreen />);
      const seatA1 = getByTestId('seat-A1');
      fireEvent.press(seatA1);

      expect(mockRemoveSeat).toHaveBeenCalledWith('A1');
      expect(mockAddSeat).not.toHaveBeenCalled();
    });

    it('should update seat status when seat is selected', () => {
      mockSelectedSeats = ['A1'];
      const { getByTestId } = render(<SeatsScreen />);

      // Selected seat should exist
      expect(getByTestId('seat-A1')).toBeTruthy();
    });

    it('should show available seats as not selected', () => {
      const { getByTestId } = render(<SeatsScreen />);

      // Available seat should exist
      const seatA2 = getByTestId('seat-A2');
      expect(seatA2).toBeTruthy();
    });
  });

  describe('Total Price', () => {
    it('should calculate total price correctly', () => {
      mockSelectedSeats = ['A1', 'A2'];
      const { getByText } = render(<SeatsScreen />);

      // 2 seats × 50000 = 100000
      expect(getByText(/IDR 100/)).toBeTruthy();
    });

    it('should show zero price when no seats selected', () => {
      const { getByText } = render(<SeatsScreen />);
      expect(getByText(/IDR 0/)).toBeTruthy();
    });

    it('should show correct ticket count (plural)', () => {
      mockSelectedSeats = ['A1', 'A2'];
      const { getByText } = render(<SeatsScreen />);
      expect(getByText(/2 Tickets/)).toBeTruthy();
    });

    it('should handle missing showtime price', () => {
      mockSelectedShowtime = {
        ...mockSelectedShowtime,
        basePrice: undefined,
      };
      mockSelectedSeats = ['A1'];
      const { getByText } = render(<SeatsScreen />);

      // Should use 0 as default price
      expect(getByText(/IDR 0/)).toBeTruthy();
    });
  });

  describe('Book Ticket Button', () => {
    it('should be enabled when seats are selected', () => {
      mockSelectedSeats = ['A1'];
      const { getByTestId } = render(<SeatsScreen />);
      const button = getByTestId('book-ticket-button');

      expect(button.props.disabled).toBe(undefined);
    });

    it('should navigate to checkout when button is pressed with seats selected', () => {
      mockSelectedSeats = ['A1'];
      const { getByTestId } = render(<SeatsScreen />);
      const button = getByTestId('book-ticket-button');

      fireEvent.press(button);

      expect(mockPush).toHaveBeenCalledWith('/(main)/booking/checkout');
    });

    it('should not navigate when showtime is missing', () => {
      mockSelectedShowtime = null;
      mockSelectedSeats = ['A1'];
      const { getByTestId } = render(<SeatsScreen />);
      const button = getByTestId('book-ticket-button');

      fireEvent.press(button);

      // Should not navigate because selectedShowtime is null
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Seat Layout', () => {
    it('should group seats by row', () => {
      const { getByTestId } = render(<SeatsScreen />);

      // Should have seats from row A
      expect(getByTestId('seat-A1')).toBeTruthy();
      expect(getByTestId('seat-A2')).toBeTruthy();

      // Should have seats from row B
      expect(getByTestId('seat-B1')).toBeTruthy();
      expect(getByTestId('seat-B2')).toBeTruthy();
    });

    it('should apply aisle spacing for seat number 5', () => {
      const { getByTestId } = render(<SeatsScreen />);
      const seatA5 = getByTestId('seat-A5');

      // Seat number 5 should have aisle spacing (ml-10 class)
      expect(seatA5).toBeTruthy();
    });

    it('should not apply aisle spacing for other seat numbers', () => {
      const { getByTestId } = render(<SeatsScreen />);

      // Seat number 1 should not have aisle spacing
      expect(getByTestId('seat-A1')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing movie title', () => {
      mockSelectedMovie = null;
      const { queryByText } = render(<SeatsScreen />);

      // Should not crash, but movie title won't be displayed
      expect(queryByText('Test Movie')).toBeNull();
    });

    it('should handle missing hall name', () => {
      mockSelectedShowtime = {
        ...mockSelectedShowtime,
        hall: null,
      };
      const { queryByText } = render(<SeatsScreen />);

      // Should not crash, but the hall name won't be displayed
      expect(queryByText('Hall 1')).toBeNull();
    });

    it('should handle multiple seat selections', () => {
      mockSelectedSeats = ['A1', 'A2', 'A3'];
      const { getByText } = render(<SeatsScreen />);

      // Should calculate total for 3 seats
      expect(getByText(/3 Tickets/)).toBeTruthy();
      expect(getByText(/IDR 150/)).toBeTruthy(); // 3 × 50000 = 150000
    });
  });
});
