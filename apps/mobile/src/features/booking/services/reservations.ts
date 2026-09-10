// Effect
import { Effect } from 'effect';

// HTTP
import { apiRequest } from '@/services/api/client';
import { codeOf, messageOf, toQuery } from '@/services/api/helpers';

// Types
import type {
  ConfirmReservationRequest as ApiConfirmReservationRequest,
  PaginatedReservations,
  Reservation as ApiReservation,
  ReservationSummary as ApiReservationSummary,
} from '@movea/api-contract';
import {
  Reservation,
  ReservationStatus,
  ReservationSummary,
} from '@/features/booking/schemas/reservation';
import { Showtime } from '@/features/booking/schemas/showtime';

// Effect Services
import { showtimesServiceEffect } from '@/features/booking/services/showtimes';

// Constants
import { PAGINATION } from '@/constants';

// Error
import { ReservationError } from '@/features/booking/error/reservation';

const PAGE_LIMIT = PAGINATION.PAGE_LIMIT_MAX;

/** A reservation summary the API only tags with a `showtimeId` — enriched
 * client-side with the showtime (and its nested movie/hall) for display,
 * since `GET /reservations/me` doesn't nest it the way the old Supabase
 * joins did. Falls back to `undefined` if the showtime lookup fails rather
 * than failing the whole list. */
export interface ReservationWithShowtime extends ReservationSummary {
  showtime?: Showtime;
}

export interface ReservationDetail extends Reservation {
  showtime?: Showtime;
}

export interface ReservationPage {
  data: ReservationWithShowtime[];
  page: number;
  hasMore: boolean;
}

const withShowtime = async <T extends { showtimeId: string }>(
  summary: T,
): Promise<T & { showtime?: Showtime }> => {
  const showtime = await Effect.runPromise(
    showtimesServiceEffect.getShowtimeById(summary.showtimeId),
  ).catch(() => undefined);
  return { ...summary, showtime };
};

export class ReservationsServiceEffect {
  private static instance: ReservationsServiceEffect;

  private constructor() {}

  static getInstance(): ReservationsServiceEffect {
    if (!ReservationsServiceEffect.instance) {
      ReservationsServiceEffect.instance = new ReservationsServiceEffect();
    }
    return ReservationsServiceEffect.instance;
  }

  // No payment step (the API has no wallet/payment module yet) — this simply
  // turns held seats into confirmed tickets.
  confirmReservation = (holdIds: string[]) =>
    Effect.tryPromise({
      try: async () =>
        apiRequest<ApiReservation>('/reservations', {
          method: 'POST',
          body: { holdIds } satisfies ApiConfirmReservationRequest,
          auth: true,
        }) as Promise<Reservation>,
      catch: (error: unknown) =>
        ReservationError.confirmFailed(messageOf(error), codeOf(error)),
    });

  getMinePaginated = (page = 1, status?: ReservationStatus) =>
    Effect.tryPromise({
      try: async () => {
        const { data, meta } = await apiRequest<PaginatedReservations>(
          `/reservations/me${toQuery({ page, limit: PAGE_LIMIT, status })}`,
          { auth: true },
        );
        const enriched = await Promise.all(
          (data as ApiReservationSummary[]).map(withShowtime),
        );
        return {
          data: enriched,
          page: meta.page,
          hasMore: meta.hasMore,
        } satisfies ReservationPage;
      },
      catch: (error: unknown) =>
        ReservationError.reservationsUnavailable(messageOf(error)),
    });

  getById = (id: string) =>
    Effect.tryPromise({
      try: async () => {
        const reservation = await apiRequest<ApiReservation>(
          `/reservations/${id}`,
          { auth: true },
        );
        return withShowtime(reservation) as Promise<ReservationDetail>;
      },
      catch: (error: unknown) =>
        ReservationError.reservationNotFound(messageOf(error)),
    });

  cancel = (id: string) =>
    Effect.tryPromise({
      try: async () =>
        apiRequest<ApiReservation>(`/reservations/${id}/cancel`, {
          method: 'POST',
          auth: true,
        }) as Promise<Reservation>,
      catch: (error: unknown) =>
        ReservationError.cancelFailed(messageOf(error), codeOf(error)),
    });
}

export const reservationsServiceEffect =
  ReservationsServiceEffect.getInstance();
