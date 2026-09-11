// Effect
import { Effect } from 'effect';

// HTTP
import { apiRequest } from '@/services/api/client';
import { messageOf, toQuery } from '@/services/api/helpers';

// Types
import type {
  AdminReservationRow,
  CapacityReportRow,
  PaginatedCapacityReport,
  PaginatedReservationsReport,
  PaginatedRevenueReport,
  RevenueReportRow,
} from '@movea/api-contract';

// Constants
import { PAGINATION } from '@/constants';

// Error
import { AdminReportError } from '@/features/admin/error/reports';

const PAGE_LIMIT = PAGINATION.PAGE_LIMIT_MAX;

export interface ReportPage<T> {
  data: T[];
  page: number;
  hasMore: boolean;
}

const toReportPage = <T>({
  data,
  meta,
}: {
  data: T[];
  meta: { page: number; hasMore: boolean };
}): ReportPage<T> => ({ data, page: meta.page, hasMore: meta.hasMore });

const loadError = (error: unknown) =>
  AdminReportError.loadFailed(messageOf(error) || 'Could not load the report.');

export class AdminReportsServiceEffect {
  private static instance: AdminReportsServiceEffect;

  private constructor() {}

  static getInstance(): AdminReportsServiceEffect {
    if (!AdminReportsServiceEffect.instance) {
      AdminReportsServiceEffect.instance = new AdminReportsServiceEffect();
    }
    return AdminReportsServiceEffect.instance;
  }

  // ADR-011/DDR-010: booking value at confirmation, not collected payment.
  getRevenue = (page = 1) =>
    Effect.tryPromise({
      try: async () =>
        toReportPage<RevenueReportRow>(
          await apiRequest<PaginatedRevenueReport>(
            `/reports/revenue${toQuery({ page, limit: PAGE_LIMIT })}`,
            { auth: true },
          ),
        ),
      catch: loadError,
    });

  getCapacity = (page = 1) =>
    Effect.tryPromise({
      try: async () =>
        toReportPage<CapacityReportRow>(
          await apiRequest<PaginatedCapacityReport>(
            `/reports/capacity${toQuery({ page, limit: PAGE_LIMIT })}`,
            { auth: true },
          ),
        ),
      catch: loadError,
    });

  getReservations = (page = 1) =>
    Effect.tryPromise({
      try: async () =>
        toReportPage<AdminReservationRow>(
          await apiRequest<PaginatedReservationsReport>(
            `/reports/reservations${toQuery({ page, limit: PAGE_LIMIT })}`,
            { auth: true },
          ),
        ),
      catch: loadError,
    });
}

export const adminReportsServiceEffect =
  AdminReportsServiceEffect.getInstance();
