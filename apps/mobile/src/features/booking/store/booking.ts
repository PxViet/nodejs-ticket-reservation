import { create } from 'zustand';

// Types
import { Showtime } from '@/features/booking/schemas/showtime';
import { Movie } from '../schemas/movie';

interface BookingState {
  selectedMovie: Movie | null;
  selectedShowtime: Showtime | null;
  selectedSeats: string[];
  reservationId: string | null;
  promoCode: string | null;
  discountAmount: number;

  setMovie: (movie: Movie) => void;
  setShowtime: (showtime: Showtime) => void;
  setSeats: (seats: string[]) => void;
  addSeat: (seat: string) => void;
  removeSeat: (seat: string) => void;
  setReservationId: (id: string | null) => void;
  setPromoCode: (code: string | null) => void;
  setDiscountAmount: (amount: number) => void;
  getTotalAmount: () => number;
  reset: () => void;
}

export const useBookingStore = create<BookingState>((set, get) => ({
  selectedMovie: null,
  selectedShowtime: null,
  selectedSeats: [],
  reservationId: null,
  promoCode: null,
  discountAmount: 0,

  setMovie: movie => set({ selectedMovie: movie }),
  setShowtime: showtime => set({ selectedShowtime: showtime }),
  setSeats: seats => set({ selectedSeats: seats }),

  addSeat: seat =>
    set(state => ({
      selectedSeats: [...state.selectedSeats, seat],
    })),

  removeSeat: seat =>
    set(state => ({
      selectedSeats: state.selectedSeats.filter(s => s !== seat),
    })),

  setReservationId: id => set({ reservationId: id }),
  setPromoCode: code => set({ promoCode: code }),
  setDiscountAmount: amount => set({ discountAmount: amount }),

  getTotalAmount: () => {
    const state = get();
    if (!state.selectedShowtime || state.selectedSeats.length === 0) {
      return 0;
    }
    const subtotal =
      state.selectedShowtime.basePrice * state.selectedSeats.length;
    return subtotal - state.discountAmount;
  },

  reset: () =>
    set({
      selectedMovie: null,
      selectedShowtime: null,
      selectedSeats: [],
      reservationId: null,
      promoCode: null,
      discountAmount: 0,
    }),
}));
