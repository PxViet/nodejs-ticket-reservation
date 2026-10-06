import { Href, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

// Unwind
import { withUniwind } from 'uniwind';

// Components
import { Button } from '@/components/Button';
import { DetailRow } from '@/components/DetailRow';
import { Divider } from '@/components/Divider';
import { HorizontalCard } from '@/components/HorizontalCard';
import { StickyFooterScrollView } from '@/components/StickyFooterScrollView';
import { Typo } from '@/components/Typo';
import { PaymentMethodItem } from '@/features/payments/components/PaymentMethodItem';

// Constants
import { ERROR_MESSAGES, MESSAGES, ROUTES, Size } from '@/constants';
import { CHECKOUT_STATUS } from '@/constants/status';

// Hooks
import {
  useAddCard,
  useCheckout,
  usePaymentMethods,
} from '@/features/payments/hooks/usePayments';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToastAlert } from '@/hooks/useToast';

// Utils
import { formatTime, formatUSD } from '@/utils/formats';

// Store
import { useBookingStore } from '@/features/booking/store/booking';
import { useLoadingStore } from '@/stores/loading';
import { useMovieStore } from '@/stores/movie';

// Types
import { Reservation } from '@/features/booking/schemas/reservation';
import type { PaymentMethod } from '@/features/payments/schemas/payments';

// Error
import { isAddCardCanceled } from '@/features/payments/error/payments';

// Icons
import { AddIcon } from '@/icons/AddIcon';

const StyledSafeAreaView = withUniwind(SafeAreaView);

// The holds these seats rested on are gone — the customer has to pick seats
// again, so checkout sends them back rather than letting them retry.
const SEATS_LOST_CODES = new Set(['SEAT_HOLD_EXPIRED', 'PAYMENT_REFUNDED']);

const CheckoutScreen = () => {
  const router = useRouter();
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
    holdIds,
    getTotalAmount,
  } = useBookingStore(
    useShallow(state => ({
      selectedMovie: state.selectedMovie,
      selectedShowtime: state.selectedShowtime,
      selectedSeats: state.selectedSeats,
      holdIds: state.holdIds,
      getTotalAmount: state.getTotalAmount,
    })),
  );

  const {
    data: paymentMethods = [],
    isLoading: isLoadingCards,
    isError: isCardsError,
    refetch: refetchCards,
  } = usePaymentMethods();
  const { mutateAsync: addCard, isPending: isAddingCard } = useAddCard();
  const { mutate: checkout, isPending: isPaying } = useCheckout();

  // The customer's pick, falling back to their most recent card — or to the
  // first card if the one they picked is no longer saved.
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const selectedCard = useMemo(
    () =>
      paymentMethods.find(card => card.id === selectedCardId) ??
      paymentMethods[0],
    [paymentMethods, selectedCardId],
  );

  // Display only: the server prices the seats when it charges (BR-36).
  const totalPrice = getTotalAmount();

  const orderRows = useMemo(
    () => [
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
        value: `${formatUSD(selectedShowtime?.basePrice ?? 0)} x ${selectedSeats.length}`,
        testID: 'order-price',
      },
      {
        label: 'Total',
        value: formatUSD(totalPrice),
        testID: 'order-total',
      },
    ],
    [selectedShowtime, selectedSeats, totalPrice],
  );

  /**
   * Schedule notifications for a confirmed reservation
   */
  const scheduleNotifications = useCallback(
    async (reservation: Reservation) => {
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

        // Get tickets from the confirmed reservation
        const tickets = reservation.tickets || [];

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

  const handleSelectCard = useCallback((card: PaymentMethod) => {
    setSelectedCardId(card.id);
  }, []);

  // PaymentSheet does not say which card it saved, so the new one is the id
  // that was not in the list before — selected straight away.
  const handleAddCard = useCallback(async () => {
    const knownIds = new Set(paymentMethods.map(card => card.id));

    try {
      await addCard();
    } catch (error) {
      if (!isAddCardCanceled(error)) {
        toast.error((error as Error).message || ERROR_MESSAGES.ADD_CARD_FAILED);
      }
      return;
    }

    toast.success(MESSAGES.ADD_CARD_SUCCESS);

    const { data: refreshed = [] } = await refetchCards();
    const added = refreshed.find(card => !knownIds.has(card.id));
    if (added) {
      setSelectedCardId(added.id);
    }
  }, [paymentMethods, addCard, refetchCards, toast]);

  const handleCheckout = useCallback(() => {
    if (holdIds.length === 0) {
      toast.error(ERROR_MESSAGES.CHECKOUT_FAILED);
      return;
    }

    if (!selectedCard) {
      toast.error(ERROR_MESSAGES.SELECT_CARD_REQUIRED);
      return;
    }

    showLoading('Processing your payment...');

    checkout(
      { holdIds, paymentMethodId: selectedCard.id },
      {
        onSuccess: async outcome => {
          clearSelectedMovie();

          if (outcome.status === CHECKOUT_STATUS.PROCESSING) {
            // Stripe has not settled yet — the webhook will confirm the seats.
            toast.success(MESSAGES.CHECKOUT_PROCESSING);
            router.dismissAll();
            router.replace(ROUTES.PAYMENTS as Href);
            return;
          }

          // Schedule push notifications
          await scheduleNotifications(outcome.reservation);

          // Show success message
          toast.success(
            'Booking confirmed! You will receive reminders before the show.',
          );

          // Navigate to success screen
          router.dismissAll();
          router.replace(ROUTES.CHECKOUT_SUCCESS as Href);
        },
        onError: error => {
          toast.error(error.message || ERROR_MESSAGES.CHECKOUT_FAILED);

          if (error.code && SEATS_LOST_CODES.has(error.code)) {
            router.back();
          }
        },
        onSettled: hideLoading,
      },
    );
  }, [
    holdIds,
    selectedCard,
    router,
    checkout,
    toast,
    showLoading,
    hideLoading,
    scheduleNotifications,
    clearSelectedMovie,
  ]);

  const renderCards = () => {
    if (isLoadingCards) {
      return (
        <View className="py-6 items-center" testID="payment-methods-loading">
          <ActivityIndicator size="small" />
        </View>
      );
    }

    if (isCardsError) {
      return (
        <View className="gap-3 items-center" accessibilityRole="alert">
          <Typo size="sm" className="text-text-error text-center">
            {ERROR_MESSAGES.PAYMENT_METHODS_LOAD_FAILED}
          </Typo>
          <Button
            size={Size.EXTRA_SMALL}
            title="Retry"
            onPress={refetchCards}
            testID="payment-methods-retry"
            accessibilityLabel="Retry loading saved cards"
          />
        </View>
      );
    }

    if (paymentMethods.length === 0) {
      return (
        <Typo
          size="sm"
          className="text-gradient-medium"
          testID="payment-methods-empty"
        >
          Add a card to pay for your tickets.
        </Typo>
      );
    }

    return paymentMethods.map(card => (
      <PaymentMethodItem
        key={card.id}
        paymentMethod={card}
        isSelected={card.id === selectedCard?.id}
        onSelect={handleSelectCard}
      />
    ));
  };

  return (
    <StyledSafeAreaView
      edges={['bottom']}
      accessibilityLabel="Checkout screen"
      className="flex-1 bg-dark-blue"
    >
      <StickyFooterScrollView
        contentContainerClassName="px-6"
        footerClassName="px-6 pt-3 pb-6"
        footer={
          <Button
            title={totalPrice > 0 ? `Pay ${formatUSD(totalPrice)}` : 'Checkout'}
            onPress={handleCheckout}
            testID="checkout-button"
            accessibilityLabel="Checkout button"
            accessibilityHint="Tap to pay for your tickets"
            size={Size.LARGE}
            disabled={
              isPaying || isAddingCard || !selectedCard || holdIds.length === 0
            }
          />
        }
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

          {/* Payment Method Section — ADR-018 */}
          <View className="my-8 gap-4" accessibilityRole="radiogroup">
            <Typo size="lg" weight="medium" accessibilityRole="header">
              Payment Method
            </Typo>

            {renderCards()}

            <TouchableOpacity
              onPress={handleAddCard}
              disabled={isAddingCard || isPaying}
              testID="add-card-button"
              accessibilityRole="button"
              accessibilityLabel="Add new card"
              accessibilityHint="Opens Stripe to save a new card"
              accessibilityState={{ disabled: isAddingCard || isPaying }}
              className="flex-row items-center justify-center gap-2 p-4 rounded-lg border border-dashed border-overlay-soft"
            >
              {isAddingCard ? <ActivityIndicator size="small" /> : <AddIcon />}
              <Typo size="sm" weight="medium">
                Add new card
              </Typo>
            </TouchableOpacity>
          </View>
        </View>
      </StickyFooterScrollView>
    </StyledSafeAreaView>
  );
};

export default CheckoutScreen;
