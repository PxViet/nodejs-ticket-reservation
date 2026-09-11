import { effectTsResolver } from '@hookform/resolvers/effect-ts';
import { Image } from 'expo-image';
import { memo, useRef } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { withUniwind } from 'uniwind';

// Components
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Typo } from '@/components/Typo';

// Hooks
import { useGenres } from '@/features/booking/hooks/useGenres';

// Schema
import {
  MovieFormData,
  movieFormSchema,
} from '@/features/admin/schemas/movie-form';

// Utils
import { cn } from '@/utils/cn';

const StyledImage = withUniwind(Image);

interface MovieFormProps {
  defaultValues?: Partial<MovieFormData>;
  isPending: boolean;
  isEditing: boolean;
  onSubmit: (data: MovieFormData) => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export const MovieForm = memo(
  ({
    defaultValues,
    isPending,
    isEditing,
    onSubmit,
    onDelete,
    isDeleting,
  }: MovieFormProps) => {
    const { data: genres = [] } = useGenres();

    const durationRef = useRef<TextInput>(null);
    const languageRef = useRef<TextInput>(null);
    const releaseDateRef = useRef<TextInput>(null);
    const ratingRef = useRef<TextInput>(null);

    const {
      control,
      handleSubmit,
      formState: { errors },
    } = useForm<MovieFormData>({
      resolver: effectTsResolver(
        movieFormSchema,
      ) as unknown as Resolver<MovieFormData>,
      mode: 'onBlur',
      defaultValues: {
        title: '',
        synopsis: '',
        posterUrl: '',
        durationMinutes: '',
        language: '',
        releaseDate: '',
        rating: '',
        genreIds: [],
        ...defaultValues,
      },
    });

    return (
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 px-6 pt-4 pb-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Controller
            control={control}
            name="title"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Title"
                value={value}
                error={errors.title?.message}
                testID="admin-movie-title-input"
                returnKeyType="next"
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />

          <Controller
            control={control}
            name="synopsis"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label="Description"
                value={value}
                error={errors.synopsis?.message}
                testID="admin-movie-synopsis-input"
                multiline
                numberOfLines={4}
                innerClassName="h-20"
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />

          <Controller
            control={control}
            name="posterUrl"
            render={({ field: { value, onChange, onBlur } }) => (
              <View className="gap-3">
                <Input
                  label="Poster image URL"
                  value={value}
                  error={errors.posterUrl?.message}
                  testID="admin-movie-poster-input"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  onChangeText={onChange}
                  onBlur={onBlur}
                />
                {!!value && (
                  <StyledImage
                    source={{ uri: value }}
                    contentFit="cover"
                    accessibilityIgnoresInvertColors
                    accessibilityLabel="Poster preview"
                    className="w-28 h-40 rounded-lg self-start"
                    testID="admin-movie-poster-preview"
                  />
                )}
              </View>
            )}
          />

          <Controller
            control={control}
            name="durationMinutes"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                ref={durationRef}
                label="Duration (minutes)"
                value={value}
                error={errors.durationMinutes?.message}
                testID="admin-movie-duration-input"
                keyboardType="number-pad"
                returnKeyType="next"
                onChangeText={onChange}
                onBlur={onBlur}
                onSubmitEditing={() => languageRef.current?.focus()}
              />
            )}
          />

          <Controller
            control={control}
            name="language"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                ref={languageRef}
                label="Language (e.g. en)"
                value={value}
                error={errors.language?.message}
                testID="admin-movie-language-input"
                autoCapitalize="none"
                returnKeyType="next"
                onChangeText={onChange}
                onBlur={onBlur}
                onSubmitEditing={() => releaseDateRef.current?.focus()}
              />
            )}
          />

          <Controller
            control={control}
            name="releaseDate"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                ref={releaseDateRef}
                label="Release date (YYYY-MM-DD)"
                value={value}
                error={errors.releaseDate?.message}
                testID="admin-movie-release-date-input"
                returnKeyType="next"
                onChangeText={onChange}
                onBlur={onBlur}
                onSubmitEditing={() => ratingRef.current?.focus()}
              />
            )}
          />

          <Controller
            control={control}
            name="rating"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                ref={ratingRef}
                label="Rating (0-10, optional)"
                value={value}
                error={errors.rating?.message}
                testID="admin-movie-rating-input"
                keyboardType="decimal-pad"
                returnKeyType="done"
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />

          <Controller
            control={control}
            name="genreIds"
            render={({ field: { value, onChange } }) => (
              <View className="gap-2">
                <Typo size="sm" weight="regular" className="text-overlay-soft">
                  Genres
                </Typo>
                <View className="flex-row flex-wrap gap-2">
                  {genres.map(genre => {
                    const isSelected = value.includes(genre.id);
                    return (
                      <TouchableOpacity
                        key={genre.id}
                        testID={`admin-movie-genre-${genre.id}`}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isSelected }}
                        accessibilityLabel={genre.name}
                        className={cn(
                          'px-4 py-2 rounded-base bg-bg-quaternary',
                          isSelected &&
                            'bg-gradient-to-r from-gradient-blue-start to-gradient-blue-end',
                        )}
                        onPress={() =>
                          onChange(
                            isSelected
                              ? value.filter(id => id !== genre.id)
                              : [...value, genre.id],
                          )
                        }
                      >
                        <Typo
                          size="sm"
                          weight="medium"
                          className={cn(
                            'text-white/70',
                            isSelected && 'text-white',
                          )}
                        >
                          {genre.name}
                        </Typo>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {errors.genreIds && (
                  <Typo
                    size="xs"
                    className="text-red"
                    accessibilityRole="alert"
                  >
                    {errors.genreIds.message}
                  </Typo>
                )}
              </View>
            )}
          />
        </ScrollView>

        {/* Sticky footer — stays put while the fields above scroll. */}
        <View className="gap-3 px-6 pt-3 pb-6 border-t border-overlay-soft/10">
          <Button
            title={isEditing ? 'Save changes' : 'Create movie'}
            testID="admin-movie-submit-button"
            disabled={isPending}
            onPress={handleSubmit(onSubmit)}
          />

          {isEditing && onDelete && (
            <TouchableOpacity
              accessible
              accessibilityRole="button"
              accessibilityLabel="Deactivate movie"
              accessibilityState={{ disabled: isDeleting }}
              testID="admin-movie-delete-button"
              disabled={isDeleting}
              activeOpacity={0.8}
              className={cn(
                'py-5 px-6 items-center justify-center rounded-xl bg-red',
                isDeleting && 'opacity-50',
              )}
              onPress={onDelete}
            >
              <Typo weight="medium" className="text-white text-center">
                Deactivate movie
              </Typo>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  },
);

MovieForm.displayName = 'MovieForm';
