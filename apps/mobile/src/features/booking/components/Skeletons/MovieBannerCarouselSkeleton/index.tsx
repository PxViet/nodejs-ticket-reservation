import { View } from 'react-native';

// Components
import { Skeleton } from '@/components/Skeleton';

// Types
import { type Variant } from '../../MovieBannerCarousel/CarouseItem';

interface MovieBannerCarouselSkeletonProps {
  variant?: Variant;
  count?: number;
}

const VARIANTS_MAP: Record<
  Variant,
  {
    width: number;
    height: number;
    borderRadius: number;
  }
> = {
  vertical: {
    width: 103,
    height: 147,
    borderRadius: 6,
  },
  horizontal: {
    width: 300,
    height: 188,
    borderRadius: 8,
  },
};

const SkeletonItem = ({ variant = 'horizontal' }: { variant: Variant }) => {
  const { width, height, borderRadius } = VARIANTS_MAP[variant];

  return (
    <Skeleton
      width={width}
      height={height}
      borderRadius={borderRadius}
      accessibilityLabel="Loading movie"
      testID="movie-banner-skeleton-item"
    />
  );
};

export const MovieBannerCarouselSkeleton = ({
  variant = 'horizontal',
  count = 3,
}: MovieBannerCarouselSkeletonProps) => (
  <View
    testID="movie-banner-carousel-skeleton"
    accessibilityRole="none"
    accessibilityLabel="Loading movies"
    className="flex-row px-6 gap-4"
  >
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonItem key={index} variant={variant} />
    ))}
  </View>
);
