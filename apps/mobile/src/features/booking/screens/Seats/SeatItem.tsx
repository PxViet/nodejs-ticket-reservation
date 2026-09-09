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

    // Only free seats are selectable, with one exception: a `held` seat that
    // is the caller's own stays tappable so they can release it (DELETE
    // /seat-holds/:id) — a `reserved` seat of theirs is a confirmed booking
    // and goes through cancellation instead, so it stays disabled here. Once
    // held, a seat resumes as selected (Seats pre-fills it from
    // `GET /seat-holds/me`), so "Your Seat" styling already covers it — no
    // separate indicator needed for holding vs. selecting.
    const isTaken = seat.status !== 'available';
    const isReleasableHold = seat.status === 'held' && seat.isMine === true;
    const hasAisleSpacing = seat.seatColumn === 5;

    const seatHint = isReleasableHold
      ? 'Tap to release this seat'
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
          disabled={isTaken && !isReleasableHold}
          onPress={handlePress}
          accessibilityLabel={`Seat ${seat.seatLabel}`}
          accessibilityHint={seatHint}
          className="pt-1.5 pb-2.5 rounded-base"
        />
      </View>
    );
  },
);

SeatItem.displayName = 'SeatItem';
