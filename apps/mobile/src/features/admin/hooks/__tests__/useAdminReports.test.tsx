import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { Effect } from 'effect';
import React from 'react';

// Hooks
import {
  useCapacityReportInfinite,
  useReservationsReportInfinite,
  useRevenueReportInfinite,
} from '../useAdminReports';

// Services
import { adminReportsServiceEffect } from '@/features/admin/services/reports';

jest.mock('@/features/admin/services/reports', () => ({
  adminReportsServiceEffect: {
    getRevenue: jest.fn(),
    getCapacity: jest.fn(),
    getReservations: jest.fn(),
  },
}));

const page = (data: unknown[], pageNumber: number, hasMore: boolean) => ({
  data,
  page: pageNumber,
  hasMore,
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientWrapper';

  return Wrapper;
};

describe('useRevenueReportInfinite', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches the first page', async () => {
    (adminReportsServiceEffect.getRevenue as jest.Mock).mockReturnValue(
      Effect.succeed(page([{ movieTitle: 'A' }], 1, false)),
    );

    const { result } = renderHook(() => useRevenueReportInfinite(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminReportsServiceEffect.getRevenue).toHaveBeenCalledWith(1);
    expect(result.current.data?.pages[0]?.data).toHaveLength(1);
  });

  it('advances to the next page when hasMore', async () => {
    (adminReportsServiceEffect.getRevenue as jest.Mock)
      .mockReturnValueOnce(Effect.succeed(page([{ movieTitle: 'A' }], 1, true)))
      .mockReturnValueOnce(
        Effect.succeed(page([{ movieTitle: 'B' }], 2, false)),
      );

    const { result } = renderHook(() => useRevenueReportInfinite(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data?.pages.length).toBe(2));
    expect(adminReportsServiceEffect.getRevenue).toHaveBeenNthCalledWith(2, 2);
  });
});

describe('useCapacityReportInfinite', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches capacity report pages', async () => {
    (adminReportsServiceEffect.getCapacity as jest.Mock).mockReturnValue(
      Effect.succeed(page([{ showtimeId: 's1' }], 1, false)),
    );

    const { result } = renderHook(() => useCapacityReportInfinite(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminReportsServiceEffect.getCapacity).toHaveBeenCalledWith(1);
  });
});

describe('useReservationsReportInfinite', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches reservations report pages', async () => {
    (adminReportsServiceEffect.getReservations as jest.Mock).mockReturnValue(
      Effect.succeed(page([{ reservationId: 'r1' }], 1, false)),
    );

    const { result } = renderHook(() => useReservationsReportInfinite(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminReportsServiceEffect.getReservations).toHaveBeenCalledWith(1);
  });
});
