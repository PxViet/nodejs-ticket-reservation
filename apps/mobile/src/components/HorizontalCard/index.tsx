import { memo, useMemo } from 'react';
import { TouchableOpacity, TouchableOpacityProps, View } from 'react-native';

// Expo
import { Image } from 'expo-image';

// Unwind
import { withUniwind } from 'uniwind';

// Constants
import { BLUR_HASH, IMAGE_SIZE_MAP, Size } from '@/constants';
import { WALLET_TRANSACTION_TYPE } from '@/constants/status';

// Types
import { WalletTransactionType } from '@/features/wallet/schemas/wallet';

// Components
import { Rating } from '../Rating';
import { Typo } from '../Typo';

// Utils
import { cn } from '@/utils/cn';
import {
  formatIDR,
  formatMovieDuration,
  formatShowtimeDate,
} from '@/utils/formats';

interface HorizontalCardProps extends Omit<TouchableOpacityProps, 'children'> {
  title: string;
  posterUrl: string;
  durationMinutes?: number;
  genre?: readonly string[];
  rating?: number;
  cinemaLocation?: string;
  cinemaName?: string;
  showtime?: string;
  showDate?: string;
  price?: string;
  imageSize?: Size;
  className?: string;
  transactionType?: WalletTransactionType;
  justifyContent?: 'center' | 'end';
}

const StyledImage = withUniwind(Image);

const WalletTransactionColor: Record<string, string> = {
  [WALLET_TRANSACTION_TYPE.TOP_UP]: 'text-text-success',
  [WALLET_TRANSACTION_TYPE.PAYMENT]: 'text-text-error',
  [WALLET_TRANSACTION_TYPE.REFUND]: 'text-text-primary',
};

export const HorizontalCard = memo(
  ({
    title,
    posterUrl,
    durationMinutes,
    rating,
    genre,
    cinemaLocation,
    cinemaName,
    showtime,
    showDate,
    price,
    imageSize = Size.SMALL,
    transactionType,
    className = '',
    justifyContent = 'end',
    onPress,
    ...rest
  }: HorizontalCardProps) => {
    const imageSizeClassName = useMemo(
      () => IMAGE_SIZE_MAP[imageSize as keyof typeof IMAGE_SIZE_MAP],
      [imageSize],
    );

    const genresText = useMemo(() => genre?.join(', '), [genre]);

    const showtimeDateText = useMemo(
      () => formatShowtimeDate(showtime, showDate),
      [showtime, showDate],
    );

    const hasBookingInfo = useMemo(
      () => !!(showtimeDateText || price || cinemaLocation || cinemaName),
      [showtimeDateText, price, cinemaLocation, cinemaName],
    );

    return (
      <TouchableOpacity
        testID="horizontal-card"
        activeOpacity={onPress ? 0.8 : 1}
        onPress={onPress}
        accessibilityLabel={title}
        accessibilityHint="Tap to view details"
        className={cn('w-full flex-row rounded-xl pr-4 gap-4', className)}
        {...rest}
      >
        {/* Left Section - Image */}
        <View className="relative">
          <StyledImage
            source={{ uri: posterUrl }}
            contentFit="cover"
            transition={200}
            accessibilityIgnoresInvertColors
            className={`${imageSizeClassName} rounded-lg`}
            testID="horizontal-card-image"
            placeholder={{
              blurhash: BLUR_HASH,
            }}
            cachePolicy="memory-disk"
            recyclingKey={posterUrl}
          />
        </View>

        {/* Right Section - Details */}
        <View
          className={cn(
            'flex-1 justify-end gap-3',
            `justify-${justifyContent}`,
          )}
        >
          {/* Title */}
          <Typo
            size="base"
            weight={imageSize === Size.SMALL ? 'medium' : 'semibold'}
            className="leading-5"
            testID="horizontal-card-title"
            accessibilityRole="text"
            accessibilityLabel={title}
          >
            {title}
          </Typo>

          {/* Booking Information (Showtime/Date, Price, Cinema) */}
          {hasBookingInfo ? (
            <View className="gap-1">
              {/* Price */}
              {price && (
                <Typo
                  size="sm"
                  weight="regular"
                  className={cn(
                    'text-white',
                    transactionType && WalletTransactionColor[transactionType],
                  )}
                  testID="horizontal-card-price"
                >
                  {formatIDR(price)}
                </Typo>
              )}

              {/* Showtime and Date */}
              {showtimeDateText && (
                <Typo
                  size="sm"
                  weight="regular"
                  className="text-white"
                  testID="horizontal-card-showtime"
                >
                  {showtimeDateText}
                </Typo>
              )}

              {/* Cinema Location */}
              {cinemaLocation && (
                <Typo
                  size="sm"
                  weight="light"
                  className="text-white"
                  testID="horizontal-card-location"
                >
                  {cinemaLocation}
                </Typo>
              )}

              {/* Cinema Name */}
              {cinemaName && (
                <Typo
                  size="sm"
                  weight="light"
                  className="text-white"
                  testID="horizontal-card-cinema"
                >
                  {cinemaName}
                </Typo>
              )}
            </View>
          ) : (
            <>
              {/* Rating */}
              {!!rating && (
                <View testID="horizontal-card-rating">
                  <Rating rating={rating} size={12} />
                </View>
              )}

              {/* Genres and Duration */}
              {!!(genresText || durationMinutes) && (
                <View className="gap-1">
                  {/* Genres */}
                  {genresText && (
                    <Typo
                      size="xs"
                      weight="light"
                      className="text-gradient-light"
                      testID="horizontal-card-genres"
                    >
                      {genresText}
                    </Typo>
                  )}

                  {/* Duration */}
                  {durationMinutes && (
                    <Typo
                      size="xs"
                      weight="light"
                      className="text-gradient-light"
                      testID="horizontal-card-duration"
                    >
                      {formatMovieDuration(durationMinutes)}
                    </Typo>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  },
);

HorizontalCard.displayName = 'HorizontalCard';
