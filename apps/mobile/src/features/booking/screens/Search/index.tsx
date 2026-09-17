import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

// Constants
import {
  ERROR_MESSAGES,
  MESSAGES,
  RATING_FILTERS,
  ROUTES,
  Size,
} from '@/constants';

// Hooks
import { useSearchMoviesInfinite } from '@/features/booking/hooks/useMovies';
import { useDebounce } from '@/hooks/useDebounce';

// Types
import { Movie } from '@/features/booking/schemas/movie';

// Components
import { Button } from '@/components/Button';
import { HorizontalCard } from '@/components/HorizontalCard';
import { SearchInput } from '@/components/SearchInput';
import { Tabs } from '@/components/Tabs';
import { Typo } from '@/components/Typo';

// Icons
import { CancelIcon } from '@/icons/CancelIcon';

const StyledSafeAreaView = withUniwind(SafeAreaView);

const SearchScreen = () => {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRating, setSelectedRating] = useState('all');
  const debouncedQuery = useDebounce(searchQuery, 500);
  const {
    movies,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
    isError,
    error,
  } = useSearchMoviesInfinite({
    searchQuery: debouncedQuery,
  });

  const isSearchActive = Boolean(
    debouncedQuery && debouncedQuery.trim().length > 0,
  );

  // Apply rating filter
  const displayedMovies = useMemo(() => {
    if (selectedRating === 'all') return movies;

    const { minRating, maxRating } =
      RATING_FILTERS.find(f => f.id === selectedRating) ?? {};
    return movies.filter((movie: Movie) => {
      const rating = movie.rating || 0;
      return rating >= (minRating ?? 0) && rating <= (maxRating ?? 10);
    });
  }, [movies, selectedRating]);

  const handleMoviePress = useCallback(
    (movieId: string) => {
      router.push(ROUTES.MOVIE_DETAILS(movieId));
    },
    [router],
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderMovie = useCallback(
    ({ item }: { item: Movie }) => (
      <HorizontalCard
        {...item}
        onPress={() => handleMoviePress(item.id)}
        className="mb-4"
      />
    ),
    [handleMoviePress],
  );

  const keyExtractor = useCallback((item: Movie) => item.id, []);

  const getItemType = useCallback((item: Movie) => {
    return item.status || 'default';
  }, []);

  const resultsCountContent = useMemo(
    () =>
      isSearchActive
        ? `Found ${displayedMovies.length} movie${displayedMovies.length !== 1 ? 's' : ''} for "${debouncedQuery}"`
        : `Showing ${displayedMovies.length} movie${displayedMovies.length !== 1 ? 's' : ''}`,

    [debouncedQuery, displayedMovies.length, isSearchActive],
  );

  const ratingFilterContent = useMemo(
    () =>
      selectedRating !== 'all'
        ? ` with ${RATING_FILTERS.find(f => f.id === selectedRating)?.label}`
        : null,
    [selectedRating],
  );

  const Footer = useCallback(() => {
    if (!isFetchingNextPage) return null;

    return (
      <View
        testID="footer-loading"
        className="py-4 items-center"
        accessibilityRole="progressbar"
        accessibilityLabel="Loading more movies"
      >
        <ActivityIndicator size="small" />
        <Typo size="xs" className="text-text-secondary mt-2">
          Loading more movies...
        </Typo>
      </View>
    );
  }, [isFetchingNextPage]);

  const Empty = useCallback(() => {
    if (isLoading) {
      return (
        <View
          testID="empty-loading"
          className="flex-1 items-center justify-center py-16"
          accessibilityRole="progressbar"
        >
          <ActivityIndicator size="large" />
          <Typo size="sm" className="text-text-secondary mt-4">
            {isSearchActive ? 'Searching movies...' : 'Loading movies...'}
          </Typo>
        </View>
      );
    }

    if (isError) {
      return (
        <View
          testID="empty-error"
          className="flex-1 items-center justify-center py-16 px-6 gap-3"
          accessibilityRole="alert"
        >
          <Typo
            size="base"
            className="text-text-error text-center"
            weight="semibold"
          >
            {isSearchActive
              ? MESSAGES.NO_RESULT_FOUND
              : ERROR_MESSAGES.MOVIE_NETWORK_ERROR}
          </Typo>
          <Typo size="sm" className="text-center">
            {error?.message || 'Please try again'}
          </Typo>
          <Button
            size={Size.EXTRA_SMALL}
            title="Retry"
            onPress={refetch}
            accessibilityRole="button"
            accessibilityLabel={
              isSearchActive ? 'Retry search' : 'Retry loading'
            }
          />
        </View>
      );
    }

    if (displayedMovies.length === 0) {
      return (
        <View
          testID="empty-no-results"
          className="flex-1 items-center justify-center py-16 px-6"
          accessibilityRole="text"
        >
          <Typo
            size="lg"
            className="text-text-secondary text-center"
            weight="semibold"
          >
            No movies found
          </Typo>
          <Typo size="sm" className="text-center mt-2">
            {isSearchActive
              ? `Try searching with different keywords for "${debouncedQuery}"`
              : 'No movies available'}
          </Typo>
        </View>
      );
    }

    return null;
  }, [
    isLoading,
    isError,
    error,
    isSearchActive,
    debouncedQuery,
    displayedMovies.length,
    refetch,
  ]);

  return (
    <StyledSafeAreaView
      edges={['bottom']}
      accessibilityLabel="Search movies screen"
      accessibilityHint="Search screen"
      className="flex-1 bg-bg-primary"
    >
      <View className="px-6">
        <View className="mb-6">
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <SearchInput
                testID="search-input"
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search movies..."
                returnKeyType="search"
                accessibilityLabel="Search movies input"
                accessibilityHint="Enter movie title to search, or leave empty to browse all"
                className="border-0"
              />
            </View>

            {searchQuery.length > 0 && (
              <TouchableOpacity
                testID="clear-search-button"
                onPress={handleClearSearch}
                className="w-11.5 h-11.5 items-center justify-center rounded-lg bg-linear-to-r from-secondary to-primary"
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                accessibilityHint="Clears the search input and shows all movies"
              >
                <CancelIcon testID="cancel-icon" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* NEW: Rating Filter */}
        <View className="mb-4">
          <Typo size="sm" weight="medium" className="mb-2">
            Filter by Rating
          </Typo>
          <Tabs
            tabs={RATING_FILTERS}
            activeTab={selectedRating}
            onTabChange={setSelectedRating}
          />
        </View>

        {/* Results Count */}
        {displayedMovies.length > 0 && !isLoading && (
          <View className="py-2 mb-2 bg-success/10 rounded-lg">
            <Typo size="sm" accessibilityRole="text">
              {resultsCountContent}
              {ratingFilterContent}
            </Typo>
          </View>
        )}
      </View>

      <FlashList
        data={displayedMovies}
        renderItem={renderMovie}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
        contentContainerStyle={{ paddingHorizontal: 24, marginBottom: 24 }}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={Footer}
        ListEmptyComponent={Empty}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            accessibilityLabel="Pull to refresh movies"
          />
        }
        accessibilityLabel={`${isSearchActive ? 'Search results' : 'All movies'} showing ${displayedMovies.length} movies`}
      />
    </StyledSafeAreaView>
  );
};

export default SearchScreen;
