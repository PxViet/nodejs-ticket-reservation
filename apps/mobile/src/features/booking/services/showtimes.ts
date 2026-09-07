// Effect
import { Effect } from 'effect';

// HTTP
import { apiRequest } from '@/services/api/client';
import { messageOf, toQuery } from '@/services/api/helpers';

// Types
import type {
  Hall as ApiHall,
  Showtime as ApiShowtime,
  ShowtimeHall as ApiShowtimeHall,
  ShowtimeMovie as ApiShowtimeMovie,
  PaginatedShowtimes,
} from '@movea/api-contract';
import {
  Hall,
  Showtime,
  ShowtimeHall,
  ShowtimeMovie,
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
}

export const showtimesServiceEffect = ShowtimesServiceEffect.getInstance();
