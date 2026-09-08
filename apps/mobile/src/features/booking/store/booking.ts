import { create } from 'zustand';

// Types
import { SelectedSeat, Showtime } from '@/features/booking/schemas/showtime';
import { Movie } from '../schemas/movie';

interface BookingState {
  selectedMovie: Movie | null;
  selectedShowtime: Showtime | null;
  selectedSeats: SelectedSeat[];
  holdIds: string[];
  heldUntil: string | null;
  reservationId: string | null;
  promoCode: string | null;
  discountAmount: number;

  setMovie: (movie: Movie) => void;
  setShowtime: (showtime: Showtime) => void;
  setSeats: (seats: SelectedSeat[]) => void;
  addSeat: (seat: SelectedSeat) => void;
  removeSeat: (seatId: string) => void;
  setHoldIds: (holdIds: string[]) => void;
  setHeldUntil: (heldUntil: string | null) => void;
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
  holdIds: [],
  heldUntil: null,
  reservationId: null,
  promoCode: null,
  discountAmount: 0,

  setMovie: movie => set({ selectedMovie: movie }),
  setShowtime: showtime => set({ selectedShowtime: showtime }),
  setSeats: seats => set({ selectedSeats: seats }),

  addSeat: seat =>
    set(state =>
      state.selectedSeats.some(s => s.seatId === seat.seatId)
        ? state
        : { selectedSeats: [...state.selectedSeats, seat] },
    ),

  removeSeat: seatId =>
    set(state => ({
      selectedSeats: state.selectedSeats.filter(s => s.seatId !== seatId),
    })),

  setHoldIds: holdIds => set({ holdIds }),
  setHeldUntil: heldUntil => set({ heldUntil }),
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
      holdIds: [],
      heldUntil: null,
      reservationId: null,
      promoCode: null,
      discountAmount: 0,
    }),
}));
