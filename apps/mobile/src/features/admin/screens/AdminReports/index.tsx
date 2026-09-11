import { FlashList } from '@shopify/flash-list';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

// Types
import type {
  AdminReservationRow,
  CapacityReportRow,
  RevenueReportRow,
} from '@movea/api-contract';

// Constants
import { TABS_FOOTER_HEIGHT } from '@/constants';

// Components
import { DetailRow } from '@/components/DetailRow';
import { Tabs } from '@/components/Tabs';
import { Typo } from '@/components/Typo';

// Hooks
import {
  useCapacityReportInfinite,
  useReservationsReportInfinite,
  useRevenueReportInfinite,
} from '@/features/admin/hooks/useAdminReports';

// Utils
import { formatDate, formatIDR, formatTime } from '@/utils/formats';

const StyledSafeAreaView = withUniwind(SafeAreaView);

type ReportTabId = 'revenue' | 'capacity' | 'reservations';
type ReportRow = RevenueReportRow | CapacityReportRow | AdminReservationRow;

const REPORT_TABS: { id: ReportTabId; label: string }[] = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'capacity', label: 'Capacity' },
  { id: 'reservations', label: 'Reservations' },
];

// ADR-011: each report is a paginated aggregate query, not a stored summary
// — a page's numbers are exact, there is no running cross-page total.
const RevenueRow = ({ item }: { item: RevenueReportRow }) => (
  <View className="px-6 py-4 gap-2 border-b border-overlay-soft/20">
    <Typo weight="medium">{item.movieTitle}</Typo>
    <DetailRow label="Show date" value={formatDate(item.showDate)} />
    <DetailRow label="Tickets sold" value={String(item.ticketsSold)} />
    <DetailRow
      label="Revenue"
      value={formatIDR(item.revenue)}
      valueClassName="text-text-success"
    />
  </View>
);

const CapacityRow = ({ item }: { item: CapacityReportRow }) => (
  <View className="px-6 py-4 gap-2 border-b border-overlay-soft/20">
    <Typo weight="medium">{item.movieTitle}</Typo>
    <DetailRow label="Hall" value={item.hallName} />
    <DetailRow
      label="Showtime"
      value={`${formatDate(item.showDate)} · ${formatTime(item.showTime)}`}
    />
    <DetailRow
      label="Seats taken"
      value={`${item.seatsTaken}/${item.totalSeats}`}
    />
    <DetailRow label="Occupancy" value={`${Math.round(item.occupancyPct)}%`} />
  </View>
);

const ReservationRow = ({ item }: { item: AdminReservationRow }) => (
  <View className="px-6 py-4 gap-2 border-b border-overlay-soft/20">
    <Typo weight="medium">{item.reservationNumber}</Typo>
    <DetailRow label="Customer" value={`${item.firstName} ${item.lastName}`} />
    <DetailRow label="Movie" value={item.movieTitle} />
    <DetailRow
      label="Showtime"
      value={`${formatDate(item.showDate)} · ${formatTime(item.showTime)}`}
    />
    <DetailRow label="Seats" value={String(item.totalSeats)} />
    <DetailRow label="Total" value={formatIDR(item.totalAmount)} />
    <DetailRow label="Status" value={item.status} />
  </View>
);

const rowKey = (item: ReportRow, tab: ReportTabId, index: number): string => {
  if (tab === 'reservations')
    return (item as AdminReservationRow).reservationId;
  if (tab === 'capacity') return (item as CapacityReportRow).showtimeId;
  const row = item as RevenueReportRow;
  return `${row.movieId}-${row.showDate}-${index}`;
};

const AdminReportsScreen = () => {
  const [activeTab, setActiveTab] = useState<ReportTabId>('revenue');

  const revenue = useRevenueReportInfinite();
  const capacity = useCapacityReportInfinite();
  const reservations = useReservationsReportInfinite();

  const active =
    activeTab === 'revenue'
      ? revenue
      : activeTab === 'capacity'
        ? capacity
        : reservations;

  // `active` is a union of three differently-shaped query results, so its
  // `.pages` array is typed too narrowly for `.flatMap` to resolve across all
  // three — widen the page shape explicitly rather than fight the inference.
  const rows: ReportRow[] = (
    (active.data?.pages ?? []) as { data: ReportRow[] }[]
  ).flatMap(page => page.data);

  const handleReachEnd = useCallback(() => {
    if (active.hasNextPage && !active.isFetchingNextPage) {
      active.fetchNextPage();
    }
  }, [active]);

  const renderItem = useCallback(
    ({ item }: { item: ReportRow }) => {
      if (activeTab === 'revenue')
        return <RevenueRow item={item as RevenueReportRow} />;
      if (activeTab === 'capacity')
        return <CapacityRow item={item as CapacityReportRow} />;
      return <ReservationRow item={item as AdminReservationRow} />;
    },
    [activeTab],
  );

  return (
    <StyledSafeAreaView
      edges={[]}
      className="flex-1 bg-bg-primary"
      accessibilityLabel="Reports screen"
    >
      <View className="px-6 mb-4">
        <Tabs
          tabs={REPORT_TABS}
          activeTab={activeTab}
          onTabChange={tabId => setActiveTab(tabId as ReportTabId)}
        />
      </View>

      {active.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : rows.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Typo className="text-text-secondary text-center">
            No data for this report yet.
          </Typo>
        </View>
      ) : (
        <FlashList<ReportRow>
          testID="admin-reports-list"
          data={rows}
          renderItem={renderItem}
          keyExtractor={(item, index) => rowKey(item, activeTab, index)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: TABS_FOOTER_HEIGHT }}
          onEndReachedThreshold={0.4}
          onEndReached={handleReachEnd}
          refreshControl={
            <RefreshControl
              refreshing={active.isRefetching}
              onRefresh={active.refetch}
              accessibilityLabel="Pull to refresh report"
            />
          }
        />
      )}
    </StyledSafeAreaView>
  );
};

export default AdminReportsScreen;
