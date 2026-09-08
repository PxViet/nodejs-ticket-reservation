import { Href, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

// Unwind
import { withUniwind } from 'uniwind';

// Components
import { Button } from '@/components/Button';
import { DetailRow } from '@/components/DetailRow';
import { Divider } from '@/components/Divider';
import { HorizontalCard } from '@/components/HorizontalCard';
import { Typo } from '@/components/Typo';

// Constants
import { ERROR_MESSAGES, PARAMS, ROUTES, Size } from '@/constants';

// Hooks
import { useCreateBooking } from '@/features/booking/hooks/useBookings';
import { useWallet } from '@/features/wallet/hooks/useWallet';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToastAlert } from '@/hooks/useToast';

// Utils
import { formatIDR, formatTime } from '@/utils/formats';

// Store
import { useAuthStore } from '@/features/auth/store/auth';
import { useBookingStore } from '@/features/booking/store/booking';
import { useLoadingStore } from '@/stores/loading';

// Type
import { useMovieStore } from '@/stores/movie';

// Utils
import { Booking } from '@/features/booking/schemas/booking';
import { cn } from '@/utils/cn';

// Icons
import { Wallet } from '@/icons/Wallet';

const StyledSafeAreaView = withUniwind(SafeAreaView);
const StyledScrollView = withUniwind(ScrollView);

const CheckoutScreen = () => {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const toast = useToastAlert();
  const { showLoading, hideLoading } = useLoadingStore(
    useShallow(state => ({
      showLoading: state.showLoading,
      hideLoading: state.hideLoading,
    })),
  );

  const clearSelectedMovie = useMovieStore(state => state.clearSelectedMovie);

  // Push notification hook
  const { scheduleTicketExpiration, scheduleShowReminder } =
    usePushNotifications();

  const {
    selectedMovie,
    selectedShowtime,
    selectedSeats,
    reservationId,
    promoCode,
    discountAmount,
    getTotalAmount,
  } = useBookingStore(
    useShallow(state => ({
      selectedMovie: state.selectedMovie,
      selectedShowtime: state.selectedShowtime,
      selectedSeats: state.selectedSeats,
      reservationId: state.reservationId,
      promoCode: state.promoCode,
      discountAmount: state.discountAmount,
      getTotalAmount: state.getTotalAmount,
    })),
  );

  const { data: wallet } = useWallet();
  const { mutate: createBooking, isPending: isBooking } = useCreateBooking();

  // Calculate total price using booking store method (includes discount)
  const totalPrice = getTotalAmount();

  const isEnoughBalance = useMemo(() => {
    return wallet && wallet.balance >= totalPrice;
  }, [wallet, totalPrice]);

  const orderRows = useMemo(
    () => [
      {
        label: 'ID Order',
        value: reservationId || '209993282',
        testID: 'order-id',
      },
      {
        label: 'Hall',
        value: selectedShowtime?.hall?.name || '',
        testID: 'order-hall',
      },
      {
        label: 'Date & Time',
        value:
          selectedShowtime?.showDate +
          ' ' +
          formatTime(selectedShowtime?.showTime || ''),
        testID: 'order-datetime',
      },
      {
        label: 'Seat Number',
        value: selectedSeats.map(seat => seat.seatLabel).join(', '),
        testID: 'order-seats',
      },
      {
        label: 'Price',
        value: `IDR ${selectedShowtime?.basePrice.toLocaleString(
          'id-ID',
        )} x ${selectedSeats.length}`,
        testID: 'order-price',
      },
      {
        label: 'Total',
        value: formatIDR(totalPrice),
        testID: 'order-total',
      },
    ],
    [reservationId, selectedShowtime, selectedSeats, totalPrice],
  );

  /**
   * Schedule notifications for booking
   */
  const scheduleNotifications = useCallback(
    async (booking: Booking) => {
      try {
        if (!selectedShowtime || !selectedMovie) {
          return;
        }

        const showDate = selectedShowtime.showDate;
        const showTime = selectedShowtime.showTime;
        const movieTitle = selectedMovie.title;

        // Parse show datetime
        const showDateTime = new Date(`${showDate} ${showTime}`);

        // Calculate ticket expiration (30 minutes before show)
        const expirationDate = new Date(
          showDateTime.getTime() - 30 * 60 * 1000,
        );

        // Get tickets from booking
        const tickets = booking.tickets || [];

        // Schedule notifications for each ticket
        for (const ticket of tickets) {
          try {
            // Schedule expiration notification (1 hour before ticket expires)
            await scheduleTicketExpiration(
              ticket.id,
              movieTitle,
              showDate,
              showTime,
              expirationDate,
            );

            // Schedule show reminder (1 hour before show)
            await scheduleShowReminder(
              ticket.id,
              movieTitle,
              showDate,
              showTime,
              showDateTime,
            );
          } catch {
            // Don't block checkout if notification scheduling fails
            toast.error('Failed to schedule notifications.');
          }
        }
      } catch {
        // Don't block checkout if notification scheduling fails
        toast.error('Failed to schedule notifications.');
      }
    },
    [
      selectedShowtime,
      selectedMovie,
      scheduleTicketExpiration,
      scheduleShowReminder,
      toast,
    ],
  );

  const handleTopUp = useCallback(() => {
    // Pass fromCheckout param to indicate user came from checkout flow
    router.push(`${ROUTES.TOP_UP}?${PARAMS.FROM_CHECKOUT}=true` as Href);
  }, [router]);

  const handleCheckout = useCallback(() => {
    const bookingData = {
      userId: user?.id || '',
      showtimeId: selectedShowtime?.id || '',
      seats: selectedSeats.map(seat => seat.seatLabel),
      totalAmount: totalPrice,
      ...(promoCode && { promoCodeId: promoCode }),
      ...(discountAmount > 0 && { discountAmount }),
    };

    showLoading('Creating your booking...');

    createBooking(bookingData, {
      onSuccess: async booking => {
        // Schedule push notifications
        await scheduleNotifications(booking);

        clearSelectedMovie();

        // Show success message
        toast.success(
          'Booking confirmed! You will receive reminders before the show.',
        );

        // Navigate to success screen
        router.dismissAll();
        router.replace(ROUTES.CHECKOUT_SUCCESS as Href);
      },
      onError: (error: Error) => {
        toast.error(error.message || ERROR_MESSAGES.CHECKOUT_FAILED);
      },
      onSettled: hideLoading,
    });
  }, [
    user,
    selectedShowtime,
    selectedSeats,
    totalPrice,
    promoCode,
    discountAmount,
    router,
    createBooking,
    toast,
    showLoading,
    hideLoading,
    scheduleNotifications,
    clearSelectedMovie,
  ]);

  return (
    <StyledSafeAreaView
      edges={['bottom']}
      accessibilityLabel="Checkout screen"
      className="flex-1 bg-dark-blue"
    >
      <StyledScrollView
        className="flex-1 bg-dark-blue"
        contentContainerClassName="px-6 flex-1 justify-between pb-6"
        showsVerticalScrollIndicator={false}
      >
        <View>
          {/* Movie Details Section */}
          <View className="mb-8">
            <HorizontalCard
              title={selectedMovie?.title || ''}
              posterUrl={selectedMovie?.posterUrl || ''}
              rating={selectedMovie?.rating}
              genre={selectedMovie?.genre}
              durationMinutes={selectedMovie?.durationMinutes}
            />
          </View>

          <Divider />

          {/* Order Details Section */}
          <View className="my-8 gap-4">
            {orderRows.map(row => (
              <DetailRow
                key={row.testID}
                label={row.label}
                value={row.value}
                testID={row.testID}
              />
            ))}
          </View>

          <Divider />

          {/* Wallet Information */}
          <View className="my-6">
            <DetailRow
              label="Your Wallet"
              value={formatIDR(wallet?.balance || 0)}
              valueClassName={cn(
                'font-montserrat-semibold',
                isEnoughBalance ? 'text-primary' : 'text-text-error',
              )}
              testID="wallet-balance"
            />
          </View>
        </View>

        <Button
          title="Checkout"
          onPress={handleCheckout}
          testID="checkout-button"
          accessibilityLabel="Checkout button"
          accessibilityHint="Tap to checkout your ticket"
          size={Size.LARGE}
          disabled={isBooking || !isEnoughBalance}
        />
      </StyledScrollView>
      {!isEnoughBalance && (
        <View className="absolute bottom-36 right-6">
          <View className="items-center">
            <TouchableOpacity
              onPress={handleTopUp}
              className="justify-center p-2.5 items-center rounded-full bg-linear-to-r from-gradient-blue-start to-gradient-blue-end"
              accessibilityRole="button"
              accessibilityLabel="Top up wallet"
              accessibilityHint="Navigate to top up wallet screen"
            >
              <Wallet />
            </TouchableOpacity>
          </View>
          <Typo
            size="sm"
            weight="semibold"
            className="text-white whitespace-nowrap mt-1"
          >
            Top Up Now!
          </Typo>
        </View>
      )}
    </StyledSafeAreaView>
  );
};

export default CheckoutScreen;
