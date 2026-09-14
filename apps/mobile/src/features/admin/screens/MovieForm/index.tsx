import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, View } from 'react-native';

// Types
import type {
  CreateMovieRequest,
  UpdateMovieRequest,
} from '@movea/api-contract';

// Components
import { MovieForm } from '@/features/admin/components/MovieForm';
import { Typo } from '@/components/Typo';

// Hooks
import { useToastAlert } from '@/hooks/useToast';
import { useAdminMovie } from '@/features/admin/hooks/useAdminMovies';
import {
  useCreateMovie,
  useDeleteMovie,
  useUpdateMovie,
} from '@/features/admin/hooks/useAdminMovieMutations';

// Layout
import { KeyboardStickyLayout } from '@/layouts/KeyboardStickyLayout';

// Schema
import { MovieFormData } from '@/features/admin/schemas/movie-form';

const toRequestPayload = ({
  title,
  synopsis,
  posterUrl,
  durationMinutes,
  language,
  releaseDate,
  rating,
  genreIds,
}: MovieFormData): CreateMovieRequest & UpdateMovieRequest => ({
  title,
  synopsis: synopsis.trim() || undefined,
  posterUrl: posterUrl.trim() || undefined,
  durationMinutes: Number(durationMinutes),
  language,
  releaseDate,
  rating: rating.trim() === '' ? undefined : Number(rating),
  genreIds: [...genreIds],
});

const MovieFormScreen = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const toast = useToastAlert();

  const { data: movie, isLoading: isMovieLoading } = useAdminMovie(id);
  const { mutateAsync: createMovie, isPending: isCreating } = useCreateMovie();
  const { mutateAsync: updateMovie, isPending: isUpdating } = useUpdateMovie();
  const { mutateAsync: deleteMovie, isPending: isDeleting } = useDeleteMovie();

  if (isEditing && isMovieLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary">
        <ActivityIndicator size="large" />
        <Typo className="text-text-secondary mt-4">Loading movie...</Typo>
      </View>
    );
  }

  const handleSubmit = async (data: MovieFormData) => {
    try {
      const payload = toRequestPayload(data);

      if (isEditing) {
        await updateMovie({ id, payload });
        toast.success('Movie updated');
      } else {
        await createMovie(payload);
        toast.success('Movie created');
      }

      router.back();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save the movie.',
      );
    }
  };

  const handleDelete = () => {
    if (!id) return;

    Alert.alert(
      'Deactivate movie',
      'This hides the movie from the catalogue. Its reservation history is kept. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMovie(id);
              toast.success('Movie deactivated');
              router.back();
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : 'Could not deactivate the movie.',
              );
            }
          },
        },
      ],
    );
  };

  return (
    <KeyboardStickyLayout>
      <MovieForm
        isEditing={isEditing}
        isPending={isCreating || isUpdating}
        isDeleting={isDeleting}
        defaultValues={
          movie
            ? {
                title: movie.title,
                synopsis: movie.synopsis,
                posterUrl: movie.posterUrl,
                durationMinutes: String(movie.durationMinutes),
                language: movie.language,
                releaseDate: movie.releaseDate.slice(0, 10),
                rating: movie.rating ? String(movie.rating) : '',
                genreIds: movie.genres.map(genre => genre.id),
              }
            : undefined
        }
        onSubmit={handleSubmit}
        onDelete={isEditing ? handleDelete : undefined}
      />
    </KeyboardStickyLayout>
  );
};

export default MovieFormScreen;
