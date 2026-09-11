// HTTP
import { apiRequest } from '@/services/api/client';

// Utils
import { runEffectForQuery } from '@/utils/effect';

// Error
import { AdminReportError } from '@/features/admin/error/reports';

// Services
import {
  AdminReportsServiceEffect,
  adminReportsServiceEffect,
} from '../reports';

jest.mock('@/services/api/client', () => ({
  ...jest.requireActual('@/services/api/client'),
  apiRequest: jest.fn(),
}));

const mockApiRequest = apiRequest as jest.Mock;

const apiPage = (items: unknown[], page = 1, hasMore = false) => ({
  data: items,
  meta: { page, limit: 20, total: items.length, hasMore },
});

describe('AdminReportsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be a singleton', () => {
    expect(AdminReportsServiceEffect.getInstance()).toBe(
      adminReportsServiceEffect,
    );
  });

  describe('getRevenue', () => {
    it('requests a one-indexed page from /reports/revenue with auth', async () => {
      const row = {
        showDate: '2026-01-01',
        movieId: 'm1',
        movieTitle: 'Movie 1',
        ticketsSold: 10,
        revenue: 500000,
      };
      mockApiRequest.mockResolvedValue(apiPage([row], 1, true));

      const result = await runEffectForQuery(
        adminReportsServiceEffect.getRevenue(1),
      );

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/reports/revenue?page=1&limit=20',
        { auth: true },
      );
      expect(result).toEqual({ data: [row], page: 1, hasMore: true });
    });

    it('throws an AdminReportError when the request fails', async () => {
      mockApiRequest.mockRejectedValue(new Error('boom'));

      await expect(
        runEffectForQuery(adminReportsServiceEffect.getRevenue(1)),
      ).rejects.toBeInstanceOf(AdminReportError);
    });
  });

  describe('getCapacity', () => {
    it('requests /reports/capacity with auth', async () => {
      mockApiRequest.mockResolvedValue(apiPage([], 1, false));

      await runEffectForQuery(adminReportsServiceEffect.getCapacity(2));

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/reports/capacity?page=2&limit=20',
        { auth: true },
      );
    });
  });

  describe('getReservations', () => {
    it('requests /reports/reservations with auth', async () => {
      mockApiRequest.mockResolvedValue(apiPage([], 1, false));

      await runEffectForQuery(adminReportsServiceEffect.getReservations(1));

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/reports/reservations?page=1&limit=20',
        { auth: true },
      );
    });
  });
});
