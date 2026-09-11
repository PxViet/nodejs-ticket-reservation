import { Schema } from 'effect';

/**
 * The admin movie form's raw field values — every field is a string because
 * every field is a text input; numeric/array fields are parsed in
 * `toCreatePayload`/`toUpdatePayload` once validation has passed.
 */
export const movieFormSchema = Schema.Struct({
  title: Schema.String.pipe(
    Schema.nonEmptyString({ message: () => 'Title is required' }),
    Schema.maxLength(200, {
      message: () => 'Title must be 200 characters or fewer',
    }),
  ),
  synopsis: Schema.String,
  posterUrl: Schema.String,
  durationMinutes: Schema.String.pipe(
    Schema.filter(v => v.trim().length > 0, {
      message: () => 'Duration is required',
    }),
    Schema.filter(
      v => /^\d+$/.test(v.trim()) && Number(v) > 0 && Number(v) <= 180,
      { message: () => 'Duration must be between 1 and 180 minutes' },
    ),
  ),
  language: Schema.String.pipe(
    Schema.nonEmptyString({ message: () => 'Language is required' }),
    Schema.maxLength(10, {
      message: () => 'Language code must be 10 characters or fewer',
    }),
  ),
  releaseDate: Schema.String.pipe(
    Schema.pattern(/^\d{4}-\d{2}-\d{2}$/, {
      message: () => 'Use the YYYY-MM-DD format',
    }),
  ),
  rating: Schema.String.pipe(
    Schema.filter(
      v => v.trim() === '' || (/^\d+(\.\d+)?$/.test(v) && Number(v) <= 10),
      { message: () => 'Rating must be between 0 and 10' },
    ),
  ),
  genreIds: Schema.Array(Schema.String).pipe(
    // BR-30 / MOVIE_REQUIRES_GENRE — mirrored client-side so the picker can
    // show the error before a round trip, not instead of the server check.
    Schema.minItems(1, { message: () => 'Pick at least one genre' }),
  ),
});

export type MovieFormData = Schema.Schema.Type<typeof movieFormSchema>;

export const emptyMovieForm: MovieFormData = {
  title: '',
  synopsis: '',
  posterUrl: '',
  durationMinutes: '',
  language: '',
  releaseDate: '',
  rating: '',
  genreIds: [],
};
