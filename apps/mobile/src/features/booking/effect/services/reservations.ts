// Effect
import { Effect, Context } from 'effect';

// Schema
import { Reservation, ReservationStatus } from '../../schemas/reservation';
import { ReservationError } from '../../error/reservation';
import {
  ReservationDetail,
  ReservationPage,
} from '../../services/reservations';

export class ReservationsService extends Context.Tag('ReservationsServiceTag')<
  ReservationsService,
  {
    readonly confirmReservation: (
      holdIds: string[],
    ) => Effect.Effect<Reservation, ReservationError, never>;

    readonly getMinePaginated: (
      page?: number,
      status?: ReservationStatus,
    ) => Effect.Effect<ReservationPage, ReservationError, never>;

    readonly getById: (
      id: string,
    ) => Effect.Effect<ReservationDetail, ReservationError, never>;

    readonly cancel: (
      id: string,
    ) => Effect.Effect<Reservation, ReservationError, never>;
  }
>() {}
