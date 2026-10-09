import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Shopify
import { FlashList } from '@shopify/flash-list';

// Expo
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';

// Unwind
import { withUniwind } from 'uniwind';

// Components
import { Button } from '@/components/Button';
import { HorizontalCard } from '@/components/HorizontalCard';
import { HorizontalCardSkeleton } from '@/components/Skeletons/HorizontalCardSkeleton';
import { Tabs } from '@/components/Tabs';
import { Typo } from '@/components/Typo';
import { ExpandableText } from '@/features/booking/components/ExpandableText';
import { MovieContentSkeleton } from '@/features/booking/components/Skeletons/MovieContentSkeleton';

// Constants
import {
  BLUR_HASH,
  ContentType,
  DETAIL_MOVIE_TABS,
  ROUTES,
  Size,
  TABS_FOOTER_HEIGHT,
} from '@/constants';

// Hooks
import { useMovie } from '@/features/booking/hooks/useMovies';

// Stores
import { useBookingStore } from '@/features/booking/store/booking';
import { useMovieStore } from '@/stores/movie';

// Icons
import { ArrowRightIcon } from '@/icons/ArrowRightIcon';

type ContentItem = {
  type: ContentType.SYNOPSIS;
  data: string;
};

const StyledImage = withUniwind(Image);
const StyledSafeAreaView = withUniwind(SafeAreaView);

const IconWithUniWind = withUniwind(ArrowRightIcon);

const MovieScreen = () => {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id || '';

  const setMovie = useBookingStore(state => state.setMovie);

  const [activeTab, setActiveTab] = useState<string>(
    DETAIL_MOVIE_TABS[0]?.id || '',
  );

  const {
    data: movie,
    isLoading: isMovieLoading,
    refetch: refetchMovie,
  } = useMovie(id);

  const setSelectedMovie = useMovieStore(state => state.setSelectedMovie);

  const {
    title = '',
    posterUrl = '',
    durationMinutes = 0,
    genre = [],
    rating,
    synopsis = '',
    status,
  } = movie || {};

  const isBookable = status === 'now_playing';

  const contentItems = useMemo<ContentItem[]>(() => {
    if (activeTab === DETAIL_MOVIE_TABS[0]?.id) {
      return [{ type: ContentType.SYNOPSIS, data: synopsis }];
    }
    return [];
  }, [activeTab, synopsis]);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);

  const handleNavigateToSelectCinema = useCallback(() => {
    setMovie(movie!);
    setSelectedMovie(movie!);
    router.push({
      pathname: ROUTES.CINEMA,
      params: {
        movieId: id,
      },
    });
  }, [id, movie, setSelectedMovie, setMovie]);

  const handleGoBack = useCallback(() => {
    router.back();
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ContentItem }) => {
      if (isMovieLoading) {
        return <MovieContentSkeleton />;
      }

      switch (item.type) {
        case ContentType.SYNOPSIS:
          return (
            <View className="px-6 mb-7">
              <Typo size="lg" weight="medium" className="mb-4">
                Synopsis
              </Typo>
              <ExpandableText text={synopsis} />
            </View>
          );
        default:
          return null;
      }
    },
    [synopsis, isMovieLoading],
  );

  // Create skeleton content items for loading state
  const skeletonContentItems = useMemo<ContentItem[]>(() => {
    if (isMovieLoading && activeTab === DETAIL_MOVIE_TABS[0]?.id) {
      return [{ type: ContentType.SYNOPSIS, data: '' }];
    }
    return [];
  }, [isMovieLoading, activeTab]);

  const ListHeaderComponent = useCallback(
    () => (
      <>
        {/* Movie Banner */}
        <View
          className="relative w-full top-0 left-0 right-0"
          testID="movie-banner-container"
        >
          <View className="absolute top-10 left-0 right-0">
            <TouchableOpacity
              onPress={handleGoBack}
              accessibilityRole="button"
              accessibilityLabel="Go back to home"
              className="w-14 h-14 rounded-full z-2 rotate-180 items-center justify-center"
            >
              <IconWithUniWind className="text-white" />
            </TouchableOpacity>
          </View>
          <StyledImage
            contentFit="cover"
            transition={200}
            accessibilityLabel={title}
            accessibilityHint="Movie banner"
            accessibilityRole="image"
            className="w-full h-56"
            source={{
              uri: posterUrl,
            }}
            placeholder={{
              blurhash: BLUR_HASH,
            }}
          />
          <View className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-bg-quaternary to-bg-quaternary/0" />
        </View>
        {/* Horizontal Card */}
        <View className="px-6 -mt-20" testID="horizontal-card-container">
          {isMovieLoading ? (
            <HorizontalCardSkeleton imageSize={Size.MEDIUM} />
          ) : (
            <HorizontalCard
              title={title}
              posterUrl={posterUrl}
              durationMinutes={durationMinutes}
              genre={genre}
              rating={rating}
              imageSize={Size.MEDIUM}
            />
          )}
        </View>
        {/* Tabs */}
        <View className="px-6 mt-7.5 mb-7">
          <Tabs
            tabs={DETAIL_MOVIE_TABS}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            variant="secondary"
          />
        </View>
      </>
    ),
    [
      handleGoBack,
      title,
      posterUrl,
      isMovieLoading,
      durationMinutes,
      genre,
      rating,
      activeTab,
      handleTabChange,
    ],
  );

  return (
    <StyledSafeAreaView
      edges={['bottom']}
      accessibilityLabel="Movie screen"
      accessibilityHint="Movie screen"
      className="h-full bg-dark-blue"
    >
      <FlashList
        testID="vertical-flash-list"
        accessibilityLabel="Movie content list"
        accessibilityHint="Movie content list"
        data={isMovieLoading ? skeletonContentItems : contentItems}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item, index) => `${item.type}-${index}`}
        contentContainerStyle={{
          paddingBottom: TABS_FOOTER_HEIGHT,
        }}
        ListHeaderComponent={ListHeaderComponent}
        refreshControl={
          <RefreshControl
            testID="refresh-control"
            refreshing={isMovieLoading}
            onRefresh={refetchMovie}
            accessibilityLabel="Pull to refresh movie"
          />
        }
        ListEmptyComponent={
          !isMovieLoading ? (
            <View className="flex-1 items-center justify-center py-20">
              <Typo size="base" weight="medium">
                This feature will be available soon
              </Typo>
            </View>
          ) : null
        }
      />

      {/* Floating Button */}
      {isBookable && (
        <View className="absolute bottom-0 left-0 right-0 px-6 pb-16.5 pt-4 bg-linear-to-t from-bg-quaternary via-bg-quaternary to-transparent">
          <Button
            onPress={handleNavigateToSelectCinema}
            title="Booking Movie"
            testID="booking-button"
            accessibilityLabel="Booking Movie"
            accessibilityHint="Navigate to select cinema screen"
          />
        </View>
      )}
    </StyledSafeAreaView>
  );
};

export default MovieScreen;
