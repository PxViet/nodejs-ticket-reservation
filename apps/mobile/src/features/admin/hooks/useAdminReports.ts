// Effect
import { Effect } from 'effect';

// React Query
import { useInfiniteQuery } from '@tanstack/react-query';

// Constants
import { API_CONFIG, queryKeys } from '@/constants';

// Utils
import { runEffectForQuery } from '@/utils/effect';

// Effect Services
import { AdminReportsService } from '@/features/admin/effect/services/reports';
import { AdminReportsServiceLayer } from '@/features/admin/effect/layer/reports';
import type { ReportPage } from '@/features/admin/services/reports';

// The API pages are one-indexed (DDR-011) and carry `hasMore` in `meta`.
const nextPage = <T>(lastPage: ReportPage<T>) =>
  lastPage.hasMore ? lastPage.page + 1 : undefined;

export const useRevenueReportInfinite = () =>
  useInfiniteQuery({
    queryKey: queryKeys.adminReports.revenue(),
    queryFn: ({ pageParam }) =>
      runEffectForQuery(
        Effect.gen(function* () {
          const reportsService = yield* AdminReportsService;
          return yield* reportsService.getRevenue(pageParam);
        }),
        AdminReportsServiceLayer,
      ),
    getNextPageParam: nextPage,
    initialPageParam: 1,
    staleTime: API_CONFIG.QUERY_STALE_TIME,
  });

export const useCapacityReportInfinite = () =>
  useInfiniteQuery({
    queryKey: queryKeys.adminReports.capacity(),
    queryFn: ({ pageParam }) =>
      runEffectForQuery(
        Effect.gen(function* () {
          const reportsService = yield* AdminReportsService;
          return yield* reportsService.getCapacity(pageParam);
        }),
        AdminReportsServiceLayer,
      ),
    getNextPageParam: nextPage,
    initialPageParam: 1,
    staleTime: API_CONFIG.QUERY_STALE_TIME,
  });

export const useReservationsReportInfinite = () =>
  useInfiniteQuery({
    queryKey: queryKeys.adminReports.reservations(),
    queryFn: ({ pageParam }) =>
      runEffectForQuery(
        Effect.gen(function* () {
          const reportsService = yield* AdminReportsService;
          return yield* reportsService.getReservations(pageParam);
        }),
        AdminReportsServiceLayer,
      ),
    getNextPageParam: nextPage,
    initialPageParam: 1,
    staleTime: API_CONFIG.QUERY_STALE_TIME,
  });
