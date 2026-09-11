// Effect
import { Context, Effect } from 'effect';

// Types
import type {
  AdminReservationRow,
  CapacityReportRow,
  RevenueReportRow,
} from '@movea/api-contract';

// Error
import { AdminReportError } from '../../error/reports';

// Service
import { ReportPage } from '../../services/reports';

export class AdminReportsService extends Context.Tag('AdminReportsServiceTag')<
  AdminReportsService,
  {
    readonly getRevenue: (
      page?: number,
    ) => Effect.Effect<ReportPage<RevenueReportRow>, AdminReportError, never>;

    readonly getCapacity: (
      page?: number,
    ) => Effect.Effect<ReportPage<CapacityReportRow>, AdminReportError, never>;

    readonly getReservations: (
      page?: number,
    ) => Effect.Effect<
      ReportPage<AdminReservationRow>,
      AdminReportError,
      never
    >;
  }
>() {}
