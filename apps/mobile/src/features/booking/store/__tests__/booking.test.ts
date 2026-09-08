import { SelectedSeat, Showtime } from '@/features/booking/schemas/showtime';
import {
  GenreMovie,
  Movie,
  MovieStatus,
} from '@/features/booking/schemas/movie';
import { act } from '@testing-library/react-native';
import { useBookingStore } from '../booking';
import { GENRE_MOVIE } from '@/constants/movie';
import { MOVIE_STATUS, SHOWTIME_STATUS } from '@/constants/status';

/** A `{ seatId, seatLabel }` pair keyed off a human label. */
const seat = (label: string): SelectedSeat => ({
  seatId: `seat-${label}`,
  seatLabel: label,
});

describe('useBookingStore', () => {
  const mockMovie: Movie = {
    id: 'movie1',
    title: 'Test Movie',
    posterUrl: 'https://example.com/poster.jpg',
    genre: [GENRE_MOVIE.ACTION as GenreMovie, GENRE_MOVIE.DRAMA as GenreMovie],
    durationMinutes: 120,
    rating: 8.5,
    status: MOVIE_STATUS.NOW_PLAYING as MovieStatus,
    releaseDate: '2024-01-01',
    synopsis: 'Test synopsis',
    trailerUrl: ['https://example.com/trailer.mp4'],
    castCrew: {
      actors: [],
      directors: [],
      producers: [],
      writers: [],
    },
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  };

  const mockShowtime: Showtime = {
    id: 'showtime1',
    movieId: 'movie1',
    hallId: 'hall1',
    showDate: '2024-01-15',
    showTime: '14:00',
    endTime: '16:00',
    basePrice: 50000,
    status: SHOWTIME_STATUS.ACTIVE,
    totalSeats: 100,
    seatsTaken: 50,
    availableSeats: 50,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    hall: { id: 'hall1', name: 'Hall 1', hallType: 'IMAX' },
  };

  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useBookingStore.getState().reset();
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useBookingStore.getState();

      expect(state.selectedMovie).toBe(null);
      expect(state.selectedShowtime).toBe(null);
      expect(state.selectedSeats).toEqual([]);
      expect(state.holdIds).toEqual([]);
      expect(state.heldUntil).toBe(null);
      expect(state.reservationId).toBe(null);
      expect(state.promoCode).toBe(null);
      expect(state.discountAmount).toBe(0);
    });
  });

  describe('setMovie', () => {
    it('should set selected movie', () => {
      act(() => {
        useBookingStore.getState().setMovie(mockMovie);
      });

      const state = useBookingStore.getState();
      expect(state.selectedMovie).toEqual(mockMovie);
    });

    it('should replace existing movie when setting a new one', () => {
      const newMovie: Movie = {
        ...mockMovie,
        id: 'movie2',
        title: 'New Movie',
      };

      act(() => {
        useBookingStore.getState().setMovie(mockMovie);
        useBookingStore.getState().setMovie(newMovie);
      });

      const state = useBookingStore.getState();
      expect(state.selectedMovie).toEqual(newMovie);
      expect(state.selectedMovie?.id).toBe('movie2');
    });
  });

  describe('setShowtime', () => {
    it('should set selected showtime', () => {
      act(() => {
        useBookingStore.getState().setShowtime(mockShowtime);
      });

      const state = useBookingStore.getState();
      expect(state.selectedShowtime).toEqual(mockShowtime);
    });

    it('should replace existing showtime when setting a new one', () => {
      const newShowtime: Showtime = {
        ...mockShowtime,
        id: 'showtime2',
        showTime: '16:00',
      };

      act(() => {
        useBookingStore.getState().setShowtime(mockShowtime);
        useBookingStore.getState().setShowtime(newShowtime);
      });

      const state = useBookingStore.getState();
      expect(state.selectedShowtime).toEqual(newShowtime);
      expect(state.selectedShowtime?.id).toBe('showtime2');
    });
  });

  describe('setSeats', () => {
    it('should set selected seats', () => {
      const seats = [seat('A1'), seat('A2'), seat('A3')];

      act(() => {
        useBookingStore.getState().setSeats(seats);
      });

      const state = useBookingStore.getState();
      expect(state.selectedSeats).toEqual(seats);
    });

    it('should replace existing seats when setting new ones', () => {
      const initialSeats = [seat('A1'), seat('A2')];
      const newSeats = [seat('B1'), seat('B2'), seat('B3')];

      act(() => {
        useBookingStore.getState().setSeats(initialSeats);
        useBookingStore.getState().setSeats(newSeats);
      });

      const state = useBookingStore.getState();
      expect(state.selectedSeats).toEqual(newSeats);
      expect(state.selectedSeats).not.toEqual(initialSeats);
    });

    it('should set empty array when passing empty array', () => {
      act(() => {
        useBookingStore.getState().setSeats([seat('A1'), seat('A2')]);
        useBookingStore.getState().setSeats([]);
      });

      const state = useBookingStore.getState();
      expect(state.selectedSeats).toEqual([]);
    });
  });

  describe('addSeat', () => {
    it('should add a seat to selected seats', () => {
      act(() => {
        useBookingStore.getState().addSeat(seat('A1'));
      });

      const state = useBookingStore.getState();
      expect(state.selectedSeats).toEqual([seat('A1')]);
    });

    it('should add multiple seats sequentially', () => {
      act(() => {
        useBookingStore.getState().addSeat(seat('A1'));
        useBookingStore.getState().addSeat(seat('A2'));
        useBookingStore.getState().addSeat(seat('A3'));
      });

      const state = useBookingStore.getState();
      expect(state.selectedSeats).toEqual([seat('A1'), seat('A2'), seat('A3')]);
    });

    it('should ignore a seat that is already selected', () => {
      act(() => {
        useBookingStore.getState().addSeat(seat('A1'));
        useBookingStore.getState().addSeat(seat('A1'));
      });

      const state = useBookingStore.getState();
      expect(state.selectedSeats).toEqual([seat('A1')]);
    });
  });

  describe('removeSeat', () => {
    it('should remove a seat by its id', () => {
      act(() => {
        useBookingStore
          .getState()
          .setSeats([seat('A1'), seat('A2'), seat('A3')]);
        useBookingStore.getState().removeSeat('seat-A2');
      });

      const state = useBookingStore.getState();
      expect(state.selectedSeats).toEqual([seat('A1'), seat('A3')]);
    });

    it('should not throw error when removing non-existent seat', () => {
      act(() => {
        useBookingStore.getState().setSeats([seat('A1'), seat('A2')]);
        useBookingStore.getState().removeSeat('seat-B1');
      });

      const state = useBookingStore.getState();
      expect(state.selectedSeats).toEqual([seat('A1'), seat('A2')]);
    });

    it('should handle removing from empty array', () => {
      act(() => {
        useBookingStore.getState().removeSeat('seat-A1');
      });

      const state = useBookingStore.getState();
      expect(state.selectedSeats).toEqual([]);
    });
  });

  describe('setHoldIds / setHeldUntil', () => {
    it('should store the hold ids and expiry from a successful hold', () => {
      act(() => {
        useBookingStore.getState().setHoldIds(['hold1', 'hold2']);
        useBookingStore.getState().setHeldUntil('2024-01-15T14:10:00.000Z');
      });

      const state = useBookingStore.getState();
      expect(state.holdIds).toEqual(['hold1', 'hold2']);
      expect(state.heldUntil).toBe('2024-01-15T14:10:00.000Z');
    });

    it('should clear the expiry when set to null', () => {
      act(() => {
        useBookingStore.getState().setHeldUntil('2024-01-15T14:10:00.000Z');
        useBookingStore.getState().setHeldUntil(null);
      });

      expect(useBookingStore.getState().heldUntil).toBe(null);
    });
  });

  describe('setReservationId', () => {
    it('should set reservation ID', () => {
      act(() => {
        useBookingStore.getState().setReservationId('reservation123');
      });

      const state = useBookingStore.getState();
      expect(state.reservationId).toBe('reservation123');
    });

    it('should set reservation ID to null', () => {
      act(() => {
        useBookingStore.getState().setReservationId('reservation123');
        useBookingStore.getState().setReservationId(null);
      });

      const state = useBookingStore.getState();
      expect(state.reservationId).toBe(null);
    });
  });

  describe('setPromoCode', () => {
    it('should set promo code', () => {
      act(() => {
        useBookingStore.getState().setPromoCode('PROMO123');
      });

      const state = useBookingStore.getState();
      expect(state.promoCode).toBe('PROMO123');
    });

    it('should set promo code to null', () => {
      act(() => {
        useBookingStore.getState().setPromoCode('PROMO123');
        useBookingStore.getState().setPromoCode(null);
      });

      const state = useBookingStore.getState();
      expect(state.promoCode).toBe(null);
    });
  });

  describe('setDiscountAmount', () => {
    it('should set discount amount', () => {
      act(() => {
        useBookingStore.getState().setDiscountAmount(10000);
      });

      const state = useBookingStore.getState();
      expect(state.discountAmount).toBe(10000);
    });

    it('should set discount amount to 0', () => {
      act(() => {
        useBookingStore.getState().setDiscountAmount(10000);
        useBookingStore.getState().setDiscountAmount(0);
      });

      const state = useBookingStore.getState();
      expect(state.discountAmount).toBe(0);
    });

    it('should handle negative discount amount', () => {
      act(() => {
        useBookingStore.getState().setDiscountAmount(-5000);
      });

      const state = useBookingStore.getState();
      expect(state.discountAmount).toBe(-5000);
    });
  });

  describe('getTotalAmount', () => {
    it('should return 0 when no showtime is selected', () => {
      act(() => {
        useBookingStore.getState().setSeats([seat('A1'), seat('A2')]);
      });

      const total = useBookingStore.getState().getTotalAmount();
      expect(total).toBe(0);
    });

    it('should return 0 when no seats are selected', () => {
      act(() => {
        useBookingStore.getState().setShowtime(mockShowtime);
      });

      const total = useBookingStore.getState().getTotalAmount();
      expect(total).toBe(0);
    });

    it('should return 0 when both showtime and seats are missing', () => {
      const total = useBookingStore.getState().getTotalAmount();
      expect(total).toBe(0);
    });

    it('should calculate total amount correctly without discount', () => {
      act(() => {
        useBookingStore.getState().setShowtime(mockShowtime);
        useBookingStore.getState().setSeats([seat('A1'), seat('A2')]);
      });

      const total = useBookingStore.getState().getTotalAmount();
      // 2 seats × 50000 = 100000
      expect(total).toBe(100000);
    });

    it('should calculate total amount with discount', () => {
      act(() => {
        useBookingStore.getState().setShowtime(mockShowtime);
        useBookingStore
          .getState()
          .setSeats([seat('A1'), seat('A2'), seat('A3')]);
        useBookingStore.getState().setDiscountAmount(10000);
      });

      const total = useBookingStore.getState().getTotalAmount();
      // 3 seats × 50000 = 150000, minus 10000 discount = 140000
      expect(total).toBe(140000);
    });

    it('should handle discount larger than subtotal', () => {
      act(() => {
        useBookingStore.getState().setShowtime(mockShowtime);
        useBookingStore.getState().setSeats([seat('A1')]);
        useBookingStore.getState().setDiscountAmount(100000);
      });

      const total = useBookingStore.getState().getTotalAmount();
      // 1 seat × 50000 = 50000, minus 100000 discount = -50000
      expect(total).toBe(-50000);
    });

    it('should recalculate when showtime changes', () => {
      const newShowtime: Showtime = {
        ...mockShowtime,
        basePrice: 75000,
      };

      act(() => {
        useBookingStore.getState().setShowtime(mockShowtime);
        useBookingStore.getState().setSeats([seat('A1'), seat('A2')]);
      });

      let total = useBookingStore.getState().getTotalAmount();
      expect(total).toBe(100000); // 2 × 50000

      act(() => {
        useBookingStore.getState().setShowtime(newShowtime);
      });

      total = useBookingStore.getState().getTotalAmount();
      expect(total).toBe(150000); // 2 × 75000
    });

    it('should recalculate when seats change', () => {
      act(() => {
        useBookingStore.getState().setShowtime(mockShowtime);
        useBookingStore.getState().setSeats([seat('A1')]);
      });

      let total = useBookingStore.getState().getTotalAmount();
      expect(total).toBe(50000); // 1 × 50000

      act(() => {
        useBookingStore.getState().addSeat(seat('A2'));
      });

      total = useBookingStore.getState().getTotalAmount();
      expect(total).toBe(100000); // 2 × 50000
    });

    it('should recalculate when discount changes', () => {
      act(() => {
        useBookingStore.getState().setShowtime(mockShowtime);
        useBookingStore.getState().setSeats([seat('A1'), seat('A2')]);
        useBookingStore.getState().setDiscountAmount(5000);
      });

      let total = useBookingStore.getState().getTotalAmount();
      expect(total).toBe(95000); // 100000 - 5000

      act(() => {
        useBookingStore.getState().setDiscountAmount(15000);
      });

      total = useBookingStore.getState().getTotalAmount();
      expect(total).toBe(85000); // 100000 - 15000
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      act(() => {
        useBookingStore.getState().setMovie(mockMovie);
        useBookingStore.getState().setShowtime(mockShowtime);
        useBookingStore.getState().setSeats([seat('A1'), seat('A2')]);
        useBookingStore.getState().setHoldIds(['hold1']);
        useBookingStore.getState().setHeldUntil('2024-01-15T14:10:00.000Z');
        useBookingStore.getState().setReservationId('reservation123');
        useBookingStore.getState().setPromoCode('PROMO123');
        useBookingStore.getState().setDiscountAmount(10000);
      });

      act(() => {
        useBookingStore.getState().reset();
      });

      const state = useBookingStore.getState();
      expect(state.selectedMovie).toBe(null);
      expect(state.selectedShowtime).toBe(null);
      expect(state.selectedSeats).toEqual([]);
      expect(state.holdIds).toEqual([]);
      expect(state.heldUntil).toBe(null);
      expect(state.reservationId).toBe(null);
      expect(state.promoCode).toBe(null);
      expect(state.discountAmount).toBe(0);
    });

    it('should reset total amount to 0 after reset', () => {
      act(() => {
        useBookingStore.getState().setShowtime(mockShowtime);
        useBookingStore.getState().setSeats([seat('A1'), seat('A2')]);
      });

      let total = useBookingStore.getState().getTotalAmount();
      expect(total).toBe(100000);

      act(() => {
        useBookingStore.getState().reset();
      });

      total = useBookingStore.getState().getTotalAmount();
      expect(total).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete booking flow', () => {
      act(() => {
        // Step 1: Select movie
        useBookingStore.getState().setMovie(mockMovie);

        // Step 2: Select showtime
        useBookingStore.getState().setShowtime(mockShowtime);

        // Step 3: Select seats
        useBookingStore.getState().addSeat(seat('A1'));
        useBookingStore.getState().addSeat(seat('A2'));

        // Step 4: Apply promo code
        useBookingStore.getState().setPromoCode('PROMO123');
        useBookingStore.getState().setDiscountAmount(10000);

        // Step 5: Hold seats
        useBookingStore.getState().setHoldIds(['hold1', 'hold2']);
        useBookingStore.getState().setReservationId('reservation123');
      });

      const state = useBookingStore.getState();
      expect(state.selectedMovie).toEqual(mockMovie);
      expect(state.selectedShowtime).toEqual(mockShowtime);
      expect(state.selectedSeats).toEqual([seat('A1'), seat('A2')]);
      expect(state.promoCode).toBe('PROMO123');
      expect(state.discountAmount).toBe(10000);
      expect(state.holdIds).toEqual(['hold1', 'hold2']);
      expect(state.reservationId).toBe('reservation123');

      const total = state.getTotalAmount();
      expect(total).toBe(90000); // 100000 - 10000
    });

    it('should handle seat selection and removal', () => {
      act(() => {
        useBookingStore.getState().setShowtime(mockShowtime);
        useBookingStore.getState().addSeat(seat('A1'));
        useBookingStore.getState().addSeat(seat('A2'));
        useBookingStore.getState().addSeat(seat('A3'));
        useBookingStore.getState().removeSeat('seat-A2');
      });

      const state = useBookingStore.getState();
      expect(state.selectedSeats).toEqual([seat('A1'), seat('A3')]);

      const total = state.getTotalAmount();
      expect(total).toBe(100000); // 2 × 50000
    });
  });
});
