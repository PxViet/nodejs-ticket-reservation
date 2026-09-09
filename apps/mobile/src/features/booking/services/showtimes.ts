// Effect
import { Effect } from 'effect';

// HTTP
import { apiRequest } from '@/services/api/client';
import { codeOf, messageOf, toQuery } from '@/services/api/helpers';

// Types
import type {
  ActiveSeatHold as ApiActiveSeatHold,
  Hall as ApiHall,
  HoldSeatsRequest as ApiHoldSeatsRequest,
  HoldSeatsResponse as ApiHoldSeatsResponse,
  PaginatedSeatHolds,
  SeatHold as ApiSeatHold,
  Showtime as ApiShowtime,
  ShowtimeHall as ApiShowtimeHall,
  ShowtimeMovie as ApiShowtimeMovie,
  ShowtimeSeat as ApiShowtimeSeat,
  PaginatedShowtimes,
} from '@movea/api-contract';
import {
  ActiveSeatHold,
  Hall,
  SeatHold,
  Showtime,
  ShowtimeHall,
  ShowtimeMovie,
  ShowtimeSeat,
} from '@/features/booking/schemas/showtime';

// Constants
import { PAGINATION } from '@/constants';

// Error
import { ShowtimeError } from '@/features/booking/error/showtime';

// A day's schedule for one movie is small and the screen groups it by hall
// client-side, so a single wide page saves a round trip per date.
const PAGE_LIMIT = PAGINATION.PAGE_LIMIT_MAX;

const toShowtimeHall = ({
  id,
  name,
  hallType,
}: ApiShowtimeHall): ShowtimeHall => ({ id, name, hallType });

const toShowtimeMovie = ({
  id,
  title,
  durationMinutes,
  posterUrl,
  language,
  rating,
}: ApiShowtimeMovie): ShowtimeMovie => ({
  id,
  title,
  durationMinutes,
  posterUrl: posterUrl ?? '',
  language,
  rating: rating ?? 0,
});

const toShowtime = ({
  id,
  movieId,
  hallId,
  showDate,
  showTime,
  endTime,
  basePrice,
  status,
  totalSeats,
  seatsTaken,
  availableSeats,
  createdAt,
  updatedAt,
  hall,
  movie,
}: ApiShowtime): Showtime => ({
  id,
  movieId,
  hallId,
  showDate,
  showTime,
  endTime,
  basePrice,
  status,
  totalSeats,
  seatsTaken,
  availableSeats,
  createdAt,
  updatedAt,
  ...(hall ? { hall: toShowtimeHall(hall) } : {}),
  ...(movie ? { movie: toShowtimeMovie(movie) } : {}),
});

const toHall = ({ id, name, hallType, totalSeats }: ApiHall): Hall => ({
  id,
  name,
  hallType,
  totalSeats,
});

const toShowtimeSeat = ({
  seatId,
  seatRow,
  seatColumn,
  seatLabel,
  status,
  isMine,
}: ApiShowtimeSeat): ShowtimeSeat => ({
  seatId,
  seatRow,
  seatColumn,
  seatLabel,
  status,
  // Keep `isMine` off the object entirely for anonymous reads, matching the API.
  ...(isMine === undefined ? {} : { isMine }),
});

const toSeatHold = ({
  id,
  seatId,
  seatLabel,
  showtimeId,
  status,
  heldUntil,
}: ApiSeatHold): SeatHold => ({
  id,
  seatId,
  seatLabel,
  showtimeId,
  status,
  heldUntil,
});

export class ShowtimesServiceEffect {
  private static instance: ShowtimesServiceEffect;

  private constructor() {}

  static getInstance(): ShowtimesServiceEffect {
    if (!ShowtimesServiceEffect.instance) {
      ShowtimesServiceEffect.instance = new ShowtimesServiceEffect();
    }
    return ShowtimesServiceEffect.instance;
  }

  getShowtimes = (movieId: string, date: string, hallId?: string) =>
    Effect.tryPromise({
      try: async () => {
        const { data } = await apiRequest<PaginatedShowtimes>(
          `/showtimes${toQuery({
            movieId,
            date,
            hallId,
            page: 1,
            limit: PAGE_LIMIT,
          })}`,
        );
        return data.map(toShowtime);
      },
      catch: (error: unknown) =>
        ShowtimeError.showtimesFailed(messageOf(error)),
    });

  getShowtimeById = (id: string) =>
    Effect.tryPromise({
      try: async () =>
        toShowtime(await apiRequest<ApiShowtime>(`/showtimes/${id}`)),
      catch: (error: unknown) =>
        ShowtimeError.showtimeNotFound(messageOf(error)),
    });

  // `GET /halls` answers with a plain array, not a page.
  getHalls = () =>
    Effect.tryPromise({
      try: async () => (await apiRequest<ApiHall[]>('/halls')).map(toHall),
      catch: (error: unknown) =>
        ShowtimeError.hallsUnavailable(messageOf(error)),
    });

  // The seat map is a plain array, row-then-column ordered. `auth: true` only
  // attaches a token when one is stored, so an anonymous read still works — a
  // token just earns the `isMine` flag on the caller's own held/reserved seats.
  getSeatMap = (showtimeId: string) =>
    Effect.tryPromise({
      try: async () =>
        (
          await apiRequest<ApiShowtimeSeat[]>(
            `/showtimes/${showtimeId}/seats`,
            { auth: true },
          )
        ).map(toShowtimeSeat),
      catch: (error: unknown) =>
        ShowtimeError.seatMapUnavailable(messageOf(error)),
    });

  // Holds every seat or none (ADR-007). A lost race comes back as
  // `409 SEAT_UNAVAILABLE`; a closed showtime as `409 SHOWTIME_NOT_BOOKABLE` —
  // both preserved on the error's `errorCode` for the screen to act on.
  holdSeats = (showtimeId: string, seatIds: string[]) =>
    Effect.tryPromise({
      try: async () => {
        const { holds } = await apiRequest<ApiHoldSeatsResponse>(
          `/showtimes/${showtimeId}/hold`,
          {
            method: 'POST',
            body: { seatIds } satisfies ApiHoldSeatsRequest,
            auth: true,
          },
        );
        return holds.map(toSeatHold);
      },
      catch: (error: unknown) =>
        ShowtimeError.holdFailed(messageOf(error), codeOf(error)),
    });

  // Active means held and not yet expired (the API re-checks this itself
  // rather than trusting its 60s sweep job) — what a resumed Seats screen
  // fetches to find a hold left over from an abandoned checkout.
  getMyActiveHolds = (showtimeId: string) =>
    Effect.tryPromise({
      try: async () => {
        const { data } = await apiRequest<PaginatedSeatHolds>(
          `/seat-holds/me${toQuery({ showtimeId, limit: PAGE_LIMIT })}`,
          { auth: true },
        );
        return data.map(
          ({
            id,
            seatId,
            seatLabel,
            showtimeId,
            status,
            heldUntil,
            price,
          }: ApiActiveSeatHold): ActiveSeatHold => ({
            id,
            seatId,
            seatLabel,
            showtimeId,
            status,
            heldUntil,
            price,
          }),
        );
      },
      catch: (error: unknown) =>
        ShowtimeError.myHoldsUnavailable(messageOf(error)),
    });

  // Voluntary HELD → RELEASED, so the seat frees up immediately instead of
  // waiting out the 10-minute TTL — lets the user drop a held seat before
  // checkout without abandoning the rest of their selection.
  releaseHold = (holdId: string) =>
    Effect.tryPromise({
      try: async () => {
        await apiRequest<void>(`/seat-holds/${holdId}`, {
          method: 'DELETE',
          auth: true,
        });
      },
      catch: (error: unknown) =>
        ShowtimeError.releaseFailed(messageOf(error), codeOf(error)),
    });
}

export const showtimesServiceEffect = ShowtimesServiceEffect.getInstance();
