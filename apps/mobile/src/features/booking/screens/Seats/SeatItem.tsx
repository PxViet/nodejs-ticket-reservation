import { memo, useCallback } from 'react';
import { View } from 'react-native';

// Components
import { SelectBox } from '@/features/booking/components/SelectBox';

// Types
import { ShowtimeSeat } from '@/features/booking/schemas/showtime';

interface SeatItemProps {
  seat: ShowtimeSeat;
  isSelected: boolean;
  onSeatPress: (seat: ShowtimeSeat) => void;
}

export const SeatItem = memo(
  ({ seat, isSelected, onSeatPress }: SeatItemProps) => {
    const handlePress = useCallback(() => {
      onSeatPress(seat);
    }, [seat, onSeatPress]);

    // Only free seats are selectable. A `held`/`reserved` seat that is the
    // caller's own still can't be tapped — there is no release endpoint yet — but
    // it gets a ring so they can see it is theirs.
    const isTaken = seat.status !== 'available';
    const isOwnHold = isTaken && seat.isMine === true;
    const hasAisleSpacing = seat.seatColumn === 5;

    const seatHint = isOwnHold
      ? 'You are holding this seat'
      : isTaken
        ? 'This seat is already taken'
        : isSelected
          ? 'Tap to deselect this seat'
          : 'Tap to select this seat';

    return (
      <View
        className={
          hasAisleSpacing
            ? 'w-9 h-9 rounded-base ml-10'
            : 'w-9 h-9 rounded-base'
        }
      >
        <SelectBox
          testID={`seat-${seat.seatLabel}`}
          value={seat.seatLabel}
          isPrimary={isSelected}
          disabled={isTaken}
          onPress={handlePress}
          accessibilityLabel={`Seat ${seat.seatLabel}`}
          accessibilityHint={seatHint}
          className={
            isOwnHold
              ? 'pt-1.5 pb-2.5 rounded-base border border-secondary'
              : 'pt-1.5 pb-2.5 rounded-base'
          }
        />
      </View>
    );
  },
);

SeatItem.displayName = 'SeatItem';
