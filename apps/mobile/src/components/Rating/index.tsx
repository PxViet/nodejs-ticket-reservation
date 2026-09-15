import { memo } from 'react';
import { View } from 'react-native';

// Icons
import { StarIcon } from '@/icons/StarIcon';

// Components
import { Typo } from '../Typo';

// Utils
import { clampedRatingToStars } from '@/utils/formats';

interface RatingProps {
  rating: number;
  size?: number;
  spacing?: number;
}

export const Rating = memo(
  ({ rating, size = 12, spacing = 1 }: RatingProps) => {
    const stars = clampedRatingToStars(rating);

    return (
      <View
        testID="rating"
        className={`flex-row items-center gap-${spacing}`}
        accessibilityRole="image"
        accessibilityLabel={`Rating: ${rating.toFixed(1)} out of 10`}
        accessible
      >
        {stars.map((filled, index) => (
          <View
            key={index}
            testID={`rating-star-${index + 1}`}
            accessible={false}
          >
            <StarIcon filled={filled} size={size} />
          </View>
        ))}

        <Typo
          testID="rating-value"
          size="4xs"
          weight="medium"
          className="text-white"
        >
          ({rating.toFixed(1)})
        </Typo>
      </View>
    );
  },
);

Rating.displayName = 'Rating';
