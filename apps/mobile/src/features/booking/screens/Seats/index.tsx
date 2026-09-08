import { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

// Expo
import { Href, router } from 'expo-router';

// Unwind
import { withUniwind } from 'uniwind';

// Components
import { Button } from '@/components/Button';
import { Typo } from '@/components/Typo';
import { SeatItem } from './SeatItem';

// Constants
import { ERROR_MESSAGES, ROUTES, Size } from '@/constants';

// Icons
import { ScreenIcon } from '@/icons/ScreenIcon';

// Hooks
import { useHoldSeats, useSeatMap } from '@/features/booking/hooks/useSeatMap';

// Stores
import { useAuthStore } from '@/features/auth/store/auth';
import { useBookingStore } from '@/features/booking/store/booking';
import { useToastStore } from '@/stores/toast';

// Utils
import { calculateTotalPrice, formatIDR } from '@/utils/formats';

// Types
import { ShowtimeSeat } from '@/features/booking/schemas/showtime';

const StyledSafeAreaView = withUniwind(SafeAreaView);

const STATUS_COLORS = [
  { color: 'bg-bg-quaternary', label: 'Available' },
  { color: 'bg-light-navy', label: 'Taken' },
  { color: 'bg-secondary', label: 'Your Seat' },
];

/** Group the already row-then-column ordered seat list into rows, keeping order. */
const groupByRow = (seats: ShowtimeSeat[]): [string, ShowtimeSeat[]][] => {
  const rows = new Map<string, ShowtimeSeat[]>();
  seats.forEach(seat => {
    const row = rows.get(seat.seatRow) ?? [];
    row.push(seat);
    rows.set(seat.seatRow, row);
  });
  return [...rows.entries()];
};

const SeatsScreen = () => {
  const {
    selectedMovie,
    selectedShowtime,
    selectedSeats,
    addSeat,
    removeSeat,
    setSeats,
    setHoldIds,
    setHeldUntil,
  } = useBookingStore(
    useShallow(state => ({
      selectedMovie: state.selectedMovie,
      selectedShowtime: state.selectedShowtime,
      selectedSeats: state.selectedSeats,
      addSeat: state.addSeat,
      removeSeat: state.removeSeat,
      setSeats: state.setSeats,
      setHoldIds: state.setHoldIds,
      setHeldUntil: state.setHeldUntil,
    })),
  );

  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const showError = useToastStore(state => state.showError);

  const movieTitle = selectedMovie?.title;
  const hallName = selectedShowtime?.hall?.name;
  const showtimeId = selectedShowtime?.id ?? '';

  const {
    data: seats = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useSeatMap(showtimeId);

  const { mutate: holdSeats, isPending: isHolding } = useHoldSeats();

  useEffect(() => {
    if (isError) {
      showError(error?.message ?? ERROR_MESSAGES.SOMETHING_WENT_WRONG);
    }
  }, [isError, error, showError]);

  const selectedIds = useMemo(
    () => new Set(selectedSeats.map(seat => seat.seatId)),
    [selectedSeats],
  );

  const seatRows = useMemo(() => groupByRow(seats), [seats]);

  const hasOwnHold = useMemo(
    () => seats.some(seat => seat.status !== 'available' && seat.isMine),
    [seats],
  );

  const totalPrice = calculateTotalPrice(
    selectedShowtime?.basePrice ?? 0,
    selectedSeats.length,
  );

  const handleSeatPress = useCallback(
    (seat: ShowtimeSeat) => {
      if (seat.status !== 'available') return;

      if (selectedIds.has(seat.seatId)) {
        removeSeat(seat.seatId);
      } else {
        addSeat({ seatId: seat.seatId, seatLabel: seat.seatLabel });
      }
    },
    [selectedIds, addSeat, removeSeat],
  );

  const handleBookTicket = useCallback(() => {
    if (selectedSeats.length === 0 || !selectedShowtime) return;

    if (!isAuthenticated) {
      showError('Please sign in to reserve seats.');
      router.push(ROUTES.LOGIN as Href);
      return;
    }

    holdSeats(
      { showtimeId, seatIds: selectedSeats.map(seat => seat.seatId) },
      {
        onSuccess: holds => {
          setHoldIds(holds.map(hold => hold.id));
          setHeldUntil(holds.map(hold => hold.heldUntil).sort()[0] ?? null);
          router.push(ROUTES.CHECKOUT as Href);
        },
        onError: holdError => {
          if (holdError.errorCode === 'SEAT_UNAVAILABLE') {
            showError('Some of those seats were just taken.');
            setSeats([]);
            refetch();
            return;
          }
          if (holdError.errorCode === 'SHOWTIME_NOT_BOOKABLE') {
            showError('This showtime is no longer bookable.');
            router.back();
            return;
          }
          showError(holdError.message ?? ERROR_MESSAGES.SOMETHING_WENT_WRONG);
        },
      },
    );
  }, [
    selectedSeats,
    selectedShowtime,
    isAuthenticated,
    holdSeats,
    showtimeId,
    setHoldIds,
    setHeldUntil,
    setSeats,
    refetch,
    showError,
  ]);

  return (
    <StyledSafeAreaView
      edges={['bottom']}
      accessibilityLabel="Seat selection screen"
      className="flex-1 pl-6 bg-dark-blue"
    >
      <View className="flex-1 bg-dark-blue">
        {/* Movie Title and Hall Name */}
        <View className="pr-6 pb-2">
          <Typo
            size="lg"
            weight="semibold"
            accessible
            accessibilityRole="header"
            accessibilityLabel="Movie title"
            accessibilityHint={movieTitle}
          >
            {movieTitle}
          </Typo>
          <Typo
            size="sm"
            weight="light"
            className="text-gradient-light"
            accessible
            accessibilityRole="text"
            accessibilityLabel="Hall name"
            accessibilityHint={hallName}
          >
            {hallName}
          </Typo>
        </View>

        {/* Status */}
        <View className="pr-6 mb-6">
          <View className="flex-row items-center justify-center gap-10">
            {STATUS_COLORS.map(({ color, label }) => (
              <View
                key={label}
                className="flex-row items-center gap-2"
                accessible
                accessibilityLabel={label}
                accessibilityRole="text"
              >
                <View className={`w-5 h-5 rounded ${color}`} />
                <Typo size="sm">{label}</Typo>
              </View>
            ))}
          </View>
          {hasOwnHold && (
            <View className="flex-row items-center justify-center gap-2 mt-3">
              <View className="w-5 h-5 rounded border border-secondary" />
              <Typo size="sm">Your hold</Typo>
            </View>
          )}
        </View>
        <View className="flex-1 justify-between">
          {/* Seat Grid */}
          {isLoading ? (
            <View
              className="flex-1 items-center justify-center"
              accessibilityRole="progressbar"
            >
              <ActivityIndicator
                size="large"
                testID="seat-map-loading-indicator"
              />
              <Typo size="sm" className="text-text-secondary mt-4">
                Loading seats...
              </Typo>
            </View>
          ) : seatRows.length === 0 ? (
            <View className="flex-1 items-center justify-center px-6">
              <Typo
                size="xl"
                weight="semibold"
                className="text-text-secondary text-center mb-2"
              >
                No seats to show
              </Typo>
              <Typo size="sm" className="text-text-secondary text-center">
                This showtime has no seat map yet
              </Typo>
            </View>
          ) : (
            <View className="mb-3">
              <ScrollView showsVerticalScrollIndicator={false}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 24 }}
                  nestedScrollEnabled
                >
                  <View>
                    {seatRows.map(([row, rowSeats]) => (
                      <View key={row} className="flex-row items-center mb-2">
                        <View className="flex-row gap-2">
                          {rowSeats.map(seat => (
                            <SeatItem
                              key={seat.seatId}
                              seat={seat}
                              isSelected={selectedIds.has(seat.seatId)}
                              onSeatPress={handleSeatPress}
                            />
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </ScrollView>
            </View>
          )}

          {/* Screen Icon */}
          <View className="pr-6 mb-6 items-center">
            <Typo
              size="sm"
              weight="light"
              className="text-gradient-light text-center"
            >
              Screen
            </Typo>
            <ScreenIcon testID="screen-icon" />
          </View>
        </View>
      </View>

      {/* Bottom Section - Total Price and Book Ticket Button */}
      <View className="pr-6 flex-row justify-between">
        <View>
          <Typo size="sm" weight="light" className="text-gradient-light">
            Total Price ({selectedSeats.length} Ticket
            {selectedSeats.length !== 1 ? 's' : ''})
          </Typo>
          <Typo size="xl" weight="semibold">
            {formatIDR(totalPrice)}
          </Typo>
        </View>
        <Button
          title={isHolding ? 'Holding seats...' : 'Book Ticket'}
          onPress={handleBookTicket}
          disabled={selectedSeats.length === 0 || isHolding}
          size={Size.SMALL}
          className="rounded-lg"
          testID="book-ticket-button"
        />
      </View>
    </StyledSafeAreaView>
  );
};

export default SeatsScreen;
