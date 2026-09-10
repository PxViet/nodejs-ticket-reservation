import { Effect, Layer } from 'effect';

// Effect
import { reservationsServiceEffect } from '../../services/reservations';

// Schema
import { ReservationStatus } from '../../schemas/reservation';

// Service
import { ReservationsService } from '../services/reservations';

export const ReservationsServiceLayer = Layer.effect(
  ReservationsService,
  Effect.gen(function* () {
    return {
      confirmReservation: (holdIds: string[]) =>
        reservationsServiceEffect.confirmReservation(holdIds),

      getMinePaginated: (page?: number, status?: ReservationStatus) =>
        reservationsServiceEffect.getMinePaginated(page, status),

      getById: (id: string) => reservationsServiceEffect.getById(id),

      cancel: (id: string) => reservationsServiceEffect.cancel(id),
    } as const;
  }),
);
