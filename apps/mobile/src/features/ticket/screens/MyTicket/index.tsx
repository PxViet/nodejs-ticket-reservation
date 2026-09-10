import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Unwind
import { withUniwind } from 'uniwind';

// Constants
import {
  ERROR_MESSAGES,
  MESSAGES,
  ROUTES,
  Size,
  TABS_FOOTER_HEIGHT,
  TICKET_TABS,
} from '@/constants';
import { BOOKING_STATUS } from '@/constants/status';

// Hooks
import { useReservationsInfinite } from '@/features/booking/hooks/useReservations';

// Types
import {
  toDisplayStatus,
  TicketDisplayStatus,
} from '@/features/booking/schemas/reservation';
import { ReservationWithShowtime } from '@/features/booking/services/reservations';
// Components
import { Button } from '@/components/Button';
import { HorizontalCard } from '@/components/HorizontalCard';
import { HorizontalCardSkeleton } from '@/components/Skeletons/HorizontalCardSkeleton';
import { Tabs } from '@/components/Tabs';
import { Typo } from '@/components/Typo';
import { Tab } from '@/components/Tabs/TabItem';

const StyledSafeAreaView = withUniwind(SafeAreaView);

const MyTicketScreen = () => {
  const [activeTab, setActiveTab] = useState(TICKET_TABS[0]?.id || '');

  const {
    data,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useReservationsInfinite();

  // Flatten paginated data
  const allTickets = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.data);
  }, [data]);

  const isAllTickets = useMemo(
    () => activeTab === TICKET_TABS[0]?.id,
    [activeTab],
  );
  const isExpiredTickets = useMemo(
    () => activeTab === BOOKING_STATUS.EXPIRED,
    [activeTab],
  );
  const isActiveTickets = useMemo(
    () => activeTab === BOOKING_STATUS.ACTIVE,
    [activeTab],
  );

  // Filter reservations by the derived display status (see toDisplayStatus —
  // the API has no separate "expired" state, so it folds into this tab too).
  const filteredTickets = useMemo(() => {
    if (isAllTickets) return allTickets;

    if (isActiveTickets) {
      return allTickets.filter(
        reservation => toDisplayStatus(reservation.status) === 'active',
      );
    }

    if (isExpiredTickets) {
      return allTickets.filter(
        reservation => toDisplayStatus(reservation.status) !== 'active',
      );
    }

    return allTickets;
  }, [isAllTickets, allTickets, isActiveTickets, isExpiredTickets]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleBookNow = useCallback(() => {
    router.push(ROUTES.HOME);
  }, []);

  const handleTicketDetails = useCallback((reservationId: string) => {
    router.push(ROUTES.TICKET_DETAILS(reservationId));
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderTicket = useCallback(
    ({ item }: { item: ReservationWithShowtime }) => {
      const { movie, showTime, showDate } = item.showtime || {};

      if (!movie) return null;

      return (
        <HorizontalCard
          title={movie.title}
          posterUrl={movie.posterUrl}
          showtime={showTime}
          showDate={showDate}
          justifyContent="center"
          onPress={() => handleTicketDetails(item.id)}
        />
      );
    },
    [handleTicketDetails],
  );

  const keyExtractor = useCallback(
    (item: ReservationWithShowtime) => item.id,
    [],
  );

  const getItemType = useCallback((item: ReservationWithShowtime) => {
    return toDisplayStatus(item.status) satisfies TicketDisplayStatus;
  }, []);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;

    return (
      <View
        className="py-4 items-center"
        accessibilityRole="progressbar"
        accessibilityLabel="Loading more tickets"
      >
        <ActivityIndicator size="small" />
        <Typo size="xs" className="text-text-secondary mt-2">
          Loading more tickets...
        </Typo>
      </View>
    );
  }, [isFetchingNextPage]);

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View className="gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <HorizontalCardSkeleton
              key={`skeleton-${index}`}
              imageSize={Size.SMALL}
            />
          ))}
        </View>
      );
    }

    if (isError) {
      return (
        <View
          className="flex-1 items-center justify-center py-16 px-6 gap-4"
          accessibilityRole="alert"
        >
          <Typo
            size="base"
            className="text-text-error text-center"
            weight="semibold"
          >
            {ERROR_MESSAGES.TICKET_NETWORK_ERROR}
          </Typo>
          <Typo size="sm" className="text-text-secondary text-center mt-2">
            {error?.message || 'Please try again'}
          </Typo>
          <Button
            size={Size.EXTRA_SMALL}
            title="Retry"
            onPress={refetch}
            accessibilityRole="button"
            accessibilityLabel="Retry loading tickets"
          />
        </View>
      );
    }

    return (
      <View
        className="flex-1 items-center justify-center py-16 px-6"
        accessibilityRole="text"
      >
        <Typo
          size="xl"
          weight="semibold"
          className="text-text-secondary text-center mb-2"
        >
          {isAllTickets
            ? 'No tickets yet'
            : isActiveTickets
              ? 'No active tickets'
              : 'No expired tickets'}
        </Typo>
        <Typo size="sm" className="text-text-secondary text-center mb-6">
          {isAllTickets
            ? MESSAGES.NO_TICKETS
            : isActiveTickets
              ? MESSAGES.NO_ACTIVE_TICKETS
              : MESSAGES.NO_EXPIRED_TICKETS}
        </Typo>
        {isAllTickets && (
          <Button
            isPrimary={false}
            size={Size.EXTRA_SMALL}
            title="Book Now"
            onPress={handleBookNow}
            accessibilityRole="button"
            accessibilityLabel="Book a movie ticket"
          />
        )}
      </View>
    );
  }, [
    isLoading,
    isError,
    isAllTickets,
    isActiveTickets,
    handleBookNow,
    error?.message,
    refetch,
  ]);

  return (
    <StyledSafeAreaView
      edges={[]}
      accessibilityLabel="My Ticket screen"
      accessibilityHint="My Ticket screen"
      className="flex-1 bg-bg-primary"
    >
      <View className="px-6 gap-6 mb-6">
        <Tabs
          variant="tertiary"
          tabs={TICKET_TABS as Tab[]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <View className="border-b border-white/80" />
      </View>

      <FlashList
        key={activeTab}
        data={filteredTickets}
        renderItem={renderTicket}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: TABS_FOOTER_HEIGHT,
        }}
        ItemSeparatorComponent={() => <View className="h-6" />}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            accessibilityLabel="Pull to refresh tickets"
          />
        }
        accessibilityLabel={`Tickets list showing ${filteredTickets.length} ${activeTab} tickets`}
      />
    </StyledSafeAreaView>
  );
};

export default MyTicketScreen;
