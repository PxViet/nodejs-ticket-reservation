import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
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
import { ROUTES, Size } from '@/constants';
import { SEAT_STATUS } from '@/constants/status';

// Icons
import { ScreenIcon } from '@/icons/ScreenIcon';

// Stores
import { useBookingStore } from '@/features/booking/store/booking';

// Utils
import { generateSeats } from '@/utils/data';
import {
  calculateTotalPrice,
  formatIDR,
  groupSeatsByRow,
} from '@/utils/formats';

// Types
import { Seat } from '@/features/booking/schemas/cinema';

const StyledSafeAreaView = withUniwind(SafeAreaView);

const STATUS_COLORS = [
  { color: 'bg-bg-quaternary', label: 'Available' },
  { color: 'bg-light-navy', label: 'Booked' },
  { color: 'bg-secondary', label: 'Your Seat' },
];

const SeatsScreen = () => {
  const {
    selectedMovie,
    selectedShowtime,
    selectedSeats,
    addSeat,
    removeSeat,
  } = useBookingStore(
    useShallow(state => ({
      selectedMovie: state.selectedMovie,
      selectedShowtime: state.selectedShowtime,
      selectedSeats: state.selectedSeats,
      addSeat: state.addSeat,
      removeSeat: state.removeSeat,
    })),
  );

  const movieTitle = selectedMovie?.title;
  const hallName = selectedShowtime?.hall?.name;

  const [seats] = useState<Seat[]>(() => generateSeats());

  // Update seat status based on selected seats
  const seatsWithStatus = useMemo(() => {
    return seats.map(seat => {
      if (seat.status === SEAT_STATUS.BOOKED) {
        return seat;
      }
      const isSelected = selectedSeats.includes(seat.id);
      return {
        ...seat,
        status: isSelected ? SEAT_STATUS.SELECTED : SEAT_STATUS.AVAILABLE,
      };
    });
  }, [seats, selectedSeats]);

  // Group seats by row
  const seatsByRow = useMemo(
    () => groupSeatsByRow(seatsWithStatus as Seat[]),
    [seatsWithStatus],
  );

  const totalPrice = calculateTotalPrice(
    selectedShowtime?.basePrice || 0,
    selectedSeats.length,
  );

  const handleSeatPress = useCallback(
    (seat: Seat) => {
      if (seat.status === SEAT_STATUS.BOOKED) {
        return;
      }

      if (seat.status === SEAT_STATUS.SELECTED) {
        removeSeat(seat.id);
      } else {
        addSeat(seat.id);
      }
    },
    [addSeat, removeSeat],
  );

  const handleBookTicket = useCallback(() => {
    if (selectedSeats.length === 0 || !selectedShowtime) return;

    router.push(ROUTES.CHECKOUT as Href);
  }, [selectedSeats.length, selectedShowtime]);

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
        </View>

        {/* Seat Grid */}
        <View className="mb-3">
          <ScrollView showsVerticalScrollIndicator={false}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 24 }}
              nestedScrollEnabled
            >
              <View>
                {/* Seat Rows */}
                {Object.entries(seatsByRow).map(([row, rowSeats]) => (
                  <View key={row} className="flex-row items-center mb-2">
                    {/* Seats */}
                    <View className="flex-row gap-2">
                      {rowSeats.map(seat => (
                        <SeatItem
                          key={seat.id}
                          seat={seat}
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
          title="Book Ticket"
          onPress={handleBookTicket}
          disabled={selectedSeats.length === 0}
          size={Size.SMALL}
          className="rounded-lg"
          testID="book-ticket-button"
        />
      </View>
    </StyledSafeAreaView>
  );
};

export default SeatsScreen;
