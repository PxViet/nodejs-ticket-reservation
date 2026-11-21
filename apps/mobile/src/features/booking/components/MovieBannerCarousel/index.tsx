import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Dimensions, View, type ViewStyle } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';
import Carousel from 'react-native-reanimated-carousel';

// Expo
import { useRouter } from 'expo-router';

// Constants
import { ROUTES } from '@/constants';

// Types
import { Movie } from '@/features/booking/schemas/movie';

// Components
import { CarouselItem, Variant } from './CarouseItem';

// Utils
import { isAndroid, isIOS } from '@/utils/platform';

interface MovieBannerCarouselProps {
  variant?: Variant;
  movies: Movie[];
  onReachEnd?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
}

const VARIANTS_MAP: Record<
  Variant,
  {
    scale: number;
    offset: number;
    width: number;
    height: number;
    justifyContent: ViewStyle['justifyContent'];
  }
> = {
  vertical: {
    scale: 1,
    offset: -24,
    width: 103,
    height: 147,
    justifyContent: 'flex-start',
  },
  horizontal: {
    scale: 0.9,
    offset: 35,
    width: 300,
    height: 220,
    justifyContent: 'center',
  },
};

// Threshold: fetch when user reaches this percentage of total items
const FETCH_THRESHOLD = 0.8; // 80%

export const MovieBannerCarousel = memo(
  ({
    variant = 'horizontal',
    movies,
    onReachEnd,
    hasNextPage = false,
    isFetchingNextPage = false,
  }: MovieBannerCarouselProps) => {
    const navigate = useRouter();

    const progress = useSharedValue<number>(0);
    const width = Dimensions.get('screen').width;
    const hasFetchedRef = useRef(false);

    // Generate unique key based on movies IDs
    const carouselKey = useMemo(() => {
      return movies.map(m => m.id).join('-');
    }, [movies]);

    // Reset fetch flag when movies change (new data loaded)
    useEffect(() => {
      hasFetchedRef.current = false;
    }, [movies.length]);

    const variantLabel = variant === 'horizontal' ? 'horizontal' : 'vertical';

    const handleMoviePress = useCallback(
      (movieId: string) => {
        navigate.push(ROUTES.MOVIE_DETAILS(movieId));
      },
      [navigate],
    );

    const handleProgressChange = useCallback(
      (offsetProgress: number, absoluteProgress: number) => {
        progress.value = offsetProgress;

        // Calculate current index based on absolute progress
        const currentIndex = Math.round(absoluteProgress);
        const threshold = Math.floor(movies.length * FETCH_THRESHOLD);

        // Trigger fetch when:
        // 1. User scrolled past threshold
        // 2. Haven't fetched yet for this batch
        // 3. There's more data to fetch
        // 4. Not currently fetching
        if (
          currentIndex >= threshold &&
          !hasFetchedRef.current &&
          hasNextPage &&
          !isFetchingNextPage &&
          onReachEnd
        ) {
          hasFetchedRef.current = true;
          onReachEnd();
        }
      },
      [movies.length, hasNextPage, isFetchingNextPage, onReachEnd, progress],
    );

    if (movies.length === 0) {
      return null;
    }

    return (
      <View
        testID="movie-banner-carousel"
        accessibilityRole="none"
        accessibilityLabel={`Movie carousel with ${movies.length} movies, ${variantLabel} layout`}
        accessible
        {...(isAndroid() && {
          accessibilityLiveRegion: 'polite',
        })}
      >
        <Carousel
          key={carouselKey}
          autoPlayInterval={2000}
          data={movies}
          height={VARIANTS_MAP[variant].height}
          loop={movies.length > 3}
          pagingEnabled
          snapEnabled
          width={VARIANTS_MAP[variant].width}
          style={{
            width: width,
            justifyContent: VARIANTS_MAP[variant].justifyContent,
            alignItems: 'center',
            marginLeft: variant === 'vertical' ? 24 : 0,
          }}
          mode="parallax"
          modeConfig={{
            parallaxScrollingScale: VARIANTS_MAP[variant].scale,
            parallaxScrollingOffset: VARIANTS_MAP[variant].offset,
          }}
          onProgressChange={handleProgressChange}
          renderItem={({ item, index }) => (
            <Animated.View
              key={item.id}
              testID={`movie-banner-slide-item-${item.id}`}
              className="flex-1"
              accessibilityRole="button"
              accessibilityLabel={`Movie ${index + 1} of ${movies.length}: ${item.title}`}
              accessibilityHint={`Swipe left or right to see other movies. Tap to view details.`}
              accessible
              {...(isAndroid() && {
                accessibilityLiveRegion: 'polite',
              })}
              {...(isIOS() && {
                accessibilityTraits: ['button'],
              })}
            >
              <CarouselItem
                item={item}
                variant={variant}
                handleMoviePress={handleMoviePress}
              />
            </Animated.View>
          )}
        />
      </View>
    );
  },
);

MovieBannerCarousel.displayName = 'MovieBannerCarousel';
