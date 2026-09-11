import { Effect, Layer } from 'effect';

// Effect
import { adminReportsServiceEffect } from '../../services/reports';

// Service
import { AdminReportsService } from '../services/reports';

export const AdminReportsServiceLayer = Layer.effect(
  AdminReportsService,
  Effect.gen(function* () {
    return {
      getRevenue: (page?: number) => adminReportsServiceEffect.getRevenue(page),

      getCapacity: (page?: number) =>
        adminReportsServiceEffect.getCapacity(page),

      getReservations: (page?: number) =>
        adminReportsServiceEffect.getReservations(page),
    } as const;
  }),
);
