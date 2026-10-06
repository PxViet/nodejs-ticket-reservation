// Types
import type {
  CheckoutRequest,
  CheckoutResponse,
  Payment,
  PaymentMethod,
  SetupIntent,
} from '@movea/api-contract';
import type { Reservation } from '@/features/booking/schemas/reservation';
import type { Showtime } from '@/features/booking/schemas/showtime';

/**
 * Payment shapes come from `@movea/api-contract`, not a local schema: the
 * payment `status` vocabulary is the API's (DDR-025), and a hand-copied union
 * is how the old wallet schema once drifted to `completed` while the API said
 * `succeeded`.
 */
export type {
  CheckoutRequest,
  CheckoutResponse,
  Payment,
  PaymentMethod,
  SetupIntent,
};

export type PaymentStatus = Payment['status'];
export type CheckoutStatus = CheckoutResponse['status'];

/** A payment the API only tags with a `showtimeId` — enriched client-side
 * with the showtime (and its nested movie) for display, the same way
 * reservations are. `undefined` if the lookup fails rather than failing the
 * whole list. */
export interface PaymentWithShowtime extends Payment {
  showtime?: Showtime;
}

/** One page of an API list, as the payment hooks page through it (DDR-011). */
export interface PaymentsPage<T> {
  data: T[];
  page: number;
  hasMore: boolean;
}

/**
 * How a checkout ended, from the customer's side. `processing` means Stripe
 * has not reported back yet — the webhook will confirm the seats (ADR-018), so
 * this is not a failure; the ticket appears once it does.
 */
export type CheckoutOutcome =
  | { status: 'succeeded'; paymentId: string; reservation: Reservation }
  | { status: 'processing'; paymentId: string };
