import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

// Constants
import { ROUTES, TABS_FOOTER_HEIGHT } from '@/constants';

// Components
import { HorizontalCard } from '@/components/HorizontalCard';
import { SearchInput } from '@/components/SearchInput';
import { Typo } from '@/components/Typo';

// Icons
import { AddIcon } from '@/icons/AddIcon';

// Hooks
import { useAdminMoviesInfinite } from '@/features/admin/hooks/useAdminMovies';
import { useDebounce } from '@/hooks/useDebounce';

// Types
import type { AdminMovie } from '@/features/admin/services/movies';

const StyledSafeAreaView = withUniwind(SafeAreaView);

const AdminMoviesScreen = () => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useAdminMoviesInfinite(debouncedSearch);

  const movies = data?.pages.flatMap(page => page.data) ?? [];

  const handleReachEnd = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleAddMovie = useCallback(() => {
    router.push(ROUTES.ADMIN_MOVIE_FORM());
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: AdminMovie }) => (
      <View className="px-6 mb-4">
        <HorizontalCard
          title={item.isActive ? item.title : `${item.title} (inactive)`}
          posterUrl={item.posterUrl}
          durationMinutes={item.durationMinutes}
          genre={item.genres.map(genre => genre.name)}
          rating={item.rating}
          onPress={() => router.push(ROUTES.ADMIN_MOVIE_FORM(item.id))}
        />
      </View>
    ),
    [],
  );

  return (
    <StyledSafeAreaView
      edges={[]}
      className="flex-1 bg-bg-primary"
      accessibilityLabel="Manage movies screen"
    >
      <View className="flex-row items-center gap-3 px-6 mb-5">
        <View className="flex-1">
          <SearchInput
            value={search}
            placeholder="Search movies to edit"
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity
          accessible
          accessibilityRole="button"
          accessibilityLabel="Add movie"
          accessibilityHint="Create a new movie"
          testID="admin-add-movie-button"
          className="w-12 h-12 rounded-xl items-center justify-center bg-gradient-to-r from-secondary to-primary"
          onPress={handleAddMovie}
        >
          <AddIcon />
        </TouchableOpacity>
      </View>

      {!isLoading && movies.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Typo className="text-text-secondary text-center">
            No movies match your search.
          </Typo>
        </View>
      ) : (
        <FlashList
          testID="admin-movies-list"
          data={movies}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: TABS_FOOTER_HEIGHT }}
          onEndReachedThreshold={0.4}
          onEndReached={handleReachEnd}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              accessibilityLabel="Pull to refresh movies"
            />
          }
        />
      )}
    </StyledSafeAreaView>
  );
};

export default AdminMoviesScreen;
