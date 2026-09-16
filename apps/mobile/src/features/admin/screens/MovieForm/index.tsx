import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

// Types
import type {
  CreateMovieRequest,
  UpdateMovieRequest,
} from '@movea/api-contract';

// Components
import { ConfirmModal } from '@/components/ConfirmModal';
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

type StatusAction = 'deactivate' | 'activate';

const STATUS_ACTION_COPY = {
  deactivate: {
    title: 'Deactivate movie',
    message:
      'This hides the movie from the catalogue. Its reservation history is kept. Continue?',
    confirmText: 'Deactivate',
  },
  activate: {
    title: 'Activate movie',
    message: 'This makes the movie visible in the catalogue again. Continue?',
    confirmText: 'Activate',
  },
} as const;

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

  const [statusAction, setStatusAction] = useState<StatusAction | null>(null);

  const { data: movie, isLoading: isMovieLoading } = useAdminMovie(id);
  const { mutateAsync: createMovie, isPending: isCreating } = useCreateMovie();
  const { mutateAsync: updateMovie, isPending: isUpdating } = useUpdateMovie();
  const { mutateAsync: deleteMovie, isPending: isDeleting } = useDeleteMovie();

  if (isEditing && isMovieLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary">
        <ActivityIndicator size="large" />
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

  const handleCancel = () => setStatusAction(null);

  // ADR-010: DELETE deactivates; reactivation is `PATCH { isActive: true }`.
  const handleConfirmStatusAction = async () => {
    if (!id || !statusAction) return;

    const isDeactivating = statusAction === 'deactivate';

    try {
      if (isDeactivating) {
        await deleteMovie(id);
      } else {
        await updateMovie({ id, payload: { isActive: true } });
      }

      setStatusAction(null);
      toast.success(isDeactivating ? 'Movie deactivated' : 'Movie activated');
      router.back();
    } catch (error) {
      setStatusAction(null);
      toast.error(
        error instanceof Error
          ? error.message
          : `Could not ${statusAction} the movie.`,
      );
    }
  };

  return (
    <KeyboardStickyLayout>
      <MovieForm
        isEditing={isEditing}
        isPending={isCreating || isUpdating}
        isDeleting={isDeleting}
        isActive={movie?.isActive ?? true}
        isActivating={isUpdating}
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
        onDelete={isEditing ? () => setStatusAction('deactivate') : undefined}
        onActivate={isEditing ? () => setStatusAction('activate') : undefined}
      />

      {statusAction && (
        <ConfirmModal
          visible
          {...STATUS_ACTION_COPY[statusAction]}
          isDestructive={statusAction === 'deactivate'}
          isConfirming={isDeleting || isUpdating}
          testID="admin-movie-status-modal"
          onConfirm={handleConfirmStatusAction}
          onCancel={handleCancel}
        />
      )}
    </KeyboardStickyLayout>
  );
};

export default MovieFormScreen;
