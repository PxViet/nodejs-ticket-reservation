// Schemas
import {
  BookingStatus,
  PaymentStatus,
} from '@/features/booking/schemas/booking';
import {
  SeatReservationStatus,
  SeatStatus,
  ShowtimeStatus,
} from '@/features/booking/schemas/cinema';
import { MovieStatus, PromoCodeStatus } from '@/features/booking/schemas/movie';
import {
  CheckoutStatus,
  PaymentStatus as CheckoutPaymentStatus,
} from '@/features/payments/schemas/payments';

export const BOOKING_STATUS = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  USED: 'used',
} as const satisfies Record<string, BookingStatus>;

// The legacy Supabase booking's payment state — not the API's (see
// CHECKOUT_PAYMENT_STATUS below).
export const LEGACY_PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const satisfies Record<string, PaymentStatus>;

export const SHOWTIME_STATUS = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const satisfies Record<string, ShowtimeStatus>;

export const SEAT_RESERVATION_STATUS = {
  CONFIRMED: 'confirmed',
  RESERVED: 'reserved',
  RELEASED: 'released',
} as const satisfies Record<string, SeatReservationStatus>;

export const SEAT_STATUS = {
  AVAILABLE: 'available',
  BOOKED: 'booked',
  SELECTED: 'selected',
} as const satisfies Record<string, SeatStatus>;

export const MOVIE_STATUS = {
  NOW_PLAYING: 'now_playing',
  COMING_SOON: 'coming_soon',
  ENDED: 'ended',
} as const satisfies Record<string, MovieStatus>;

export const PROMO_CODE_STATUS = {
  PERCENTAGE: 'percentage',
  FIXED_AMOUNT: 'fixed_amount',
} as const satisfies Record<string, PromoCodeStatus>;

// DDR-025: a checkout payment's lifecycle, as `GET /payments` reports it.
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const satisfies Record<string, CheckoutPaymentStatus>;

// What `POST /reservations/checkout` answers — an API-response status only.
export const CHECKOUT_STATUS = {
  SUCCEEDED: 'succeeded',
  REQUIRES_ACTION: 'requires_action',
  PROCESSING: 'processing',
} as const satisfies Record<string, CheckoutStatus>;
