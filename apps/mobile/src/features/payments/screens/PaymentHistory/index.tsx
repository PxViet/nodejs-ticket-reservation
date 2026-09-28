import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Unwind
import { withUniwind } from 'uniwind';

// Constants
import { ROUTES, Size, TABS_FOOTER_HEIGHT } from '@/constants';

// Hooks
import { usePaymentsInfinite } from '@/features/payments/hooks/usePayments';

// Types
import type { PaymentWithShowtime } from '@/features/payments/schemas/payments';

// Components
import { Button } from '@/components/Button';
import { HorizontalCardSkeleton } from '@/components/Skeletons/HorizontalCardSkeleton';
import { Typo } from '@/components/Typo';
import { PaymentHistoryItem } from '@/features/payments/components/PaymentHistoryItem';

const StyledSafeAreaView = withUniwind(SafeAreaView);

/** Every checkout the customer has paid for, or tried to (DDR-025). */
const PaymentHistoryScreen = () => {
  const router = useRouter();

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
  } = usePaymentsInfinite();

  // Flatten paginated data
  const allPayments = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.flatMap(page => page.data);
  }, [data]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleBrowseMovies = useCallback(() => {
    router.push(ROUTES.HOME);
  }, [router]);

  const handleOpenTicket = useCallback(
    ({ reservationId }: PaymentWithShowtime) => {
      if (reservationId) {
        router.push(ROUTES.TICKET_DETAILS(reservationId));
      }
    },
    [router],
  );

  const renderPayment = useCallback(
    ({ item }: { item: PaymentWithShowtime }) => (
      <PaymentHistoryItem payment={item} onPress={handleOpenTicket} />
    ),
    [handleOpenTicket],
  );

  const keyExtractor = useCallback((item: PaymentWithShowtime) => item.id, []);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;

    return (
      <View
        className="py-4 items-center"
        accessibilityRole="progressbar"
        accessibilityLabel="Loading more payments"
      >
        <ActivityIndicator size="small" />
        <Typo size="xs" className="text-text-secondary mt-2">
          Loading more payments...
        </Typo>
      </View>
    );
  }, [isFetchingNextPage]);

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View className="gap-6" testID="payments-loading">
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
            Failed to load payments
          </Typo>
          <Typo size="sm" className="text-text-secondary text-center">
            {error?.message || 'Please try again'}
          </Typo>

          <Button
            size={Size.EXTRA_SMALL}
            title="Retry"
            onPress={refetch}
            accessibilityRole="button"
            accessibilityLabel="Retry loading payments"
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
          No payments yet
        </Typo>
        <Typo size="sm" className="text-gradient-medium text-center mb-6">
          Your ticket payments will appear here
        </Typo>
        <Button
          isPrimary={false}
          size={Size.EXTRA_SMALL}
          title="Browse Movies"
          onPress={handleBrowseMovies}
          accessibilityRole="button"
          accessibilityLabel="Browse movies"
        />
      </View>
    );
  }, [isLoading, isError, error, refetch, handleBrowseMovies]);

  const ListHeader = useCallback(
    () => (
      <View className="pb-7">
        <Typo size="lg" weight="medium" accessibilityRole="header">
          Recent Payments
        </Typo>
      </View>
    ),
    [],
  );

  return (
    <StyledSafeAreaView
      edges={[]}
      accessibilityLabel="Payment history screen"
      className="flex-1 bg-bg-primary"
    >
      <FlashList
        data={allPayments}
        renderItem={renderPayment}
        keyExtractor={keyExtractor}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: TABS_FOOTER_HEIGHT,
        }}
        ItemSeparatorComponent={() => <View className="h-6" />}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            accessibilityLabel="Pull to refresh payments"
          />
        }
        accessibilityLabel={`Payments list showing ${allPayments.length} payments`}
      />
    </StyledSafeAreaView>
  );
};

export default PaymentHistoryScreen;
