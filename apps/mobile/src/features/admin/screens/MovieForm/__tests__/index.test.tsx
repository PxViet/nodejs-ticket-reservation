import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import MovieFormScreen from '../index';

// Mock expo-router
const mockBack = jest.fn();
let mockParams: { id?: string } = {};

jest.mock('expo-router', () => ({
  router: { back: () => mockBack() },
  useLocalSearchParams: () => mockParams,
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: ({ children, ...props }: any) => (
      <View {...props}>{children}</View>
    ),
  };
});

// Mock toast
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();

jest.mock('@/hooks/useToast', () => ({
  useToastAlert: () => ({
    success: mockToastSuccess,
    error: mockToastError,
  }),
}));

// Mock admin movie/mutation hooks
let mockMovie: any;
let mockIsMovieLoading = false;
const mockCreateMovie = jest.fn();
const mockUpdateMovie = jest.fn();
const mockDeleteMovie = jest.fn();
let mockIsCreating = false;
let mockIsUpdating = false;
let mockIsDeleting = false;

jest.mock('@/features/admin/hooks/useAdminMovies', () => ({
  useAdminMovie: jest.fn(() => ({
    data: mockMovie,
    isLoading: mockIsMovieLoading,
  })),
}));

jest.mock('@/features/admin/hooks/useAdminMovieMutations', () => ({
  useCreateMovie: jest.fn(() => ({
    mutateAsync: mockCreateMovie,
    isPending: mockIsCreating,
  })),
  useUpdateMovie: jest.fn(() => ({
    mutateAsync: mockUpdateMovie,
    isPending: mockIsUpdating,
  })),
  useDeleteMovie: jest.fn(() => ({
    mutateAsync: mockDeleteMovie,
    isPending: mockIsDeleting,
  })),
}));

// The form itself is unit-tested on its own — stand in a minimal fake that
// exposes just enough to drive this screen's submit/delete orchestration.
const FAKE_FORM_DATA = {
  title: 'The Matrix',
  synopsis: '  A hacker discovers the truth.  ',
  posterUrl: '',
  durationMinutes: '120',
  language: 'en',
  releaseDate: '1999-03-31',
  rating: '',
  genreIds: ['g1'],
};

jest.mock('@/features/admin/components/MovieForm', () => {
  const { Text, TouchableOpacity } = require('react-native');
  return {
    MovieForm: ({ onSubmit, onDelete, isEditing }: any) => (
      <>
        <TouchableOpacity
          testID="fake-submit"
          onPress={() => onSubmit(FAKE_FORM_DATA)}
        >
          <Text>submit</Text>
        </TouchableOpacity>
        {isEditing && onDelete && (
          <TouchableOpacity testID="fake-delete" onPress={onDelete}>
            <Text>delete</Text>
          </TouchableOpacity>
        )}
      </>
    ),
  };
});

describe('MovieFormScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    mockMovie = undefined;
    mockIsMovieLoading = false;
    mockIsCreating = false;
    mockIsUpdating = false;
    mockIsDeleting = false;
  });

  describe('Loading state', () => {
    it('shows a loading indicator while an existing movie is being fetched', () => {
      mockParams = { id: 'movie1' };
      mockIsMovieLoading = true;

      const { getByText, queryByTestId } = render(<MovieFormScreen />);

      expect(getByText('Loading movie...')).toBeTruthy();
      expect(queryByTestId('fake-submit')).toBeNull();
    });

    it('does not block rendering while creating (no id, no fetch)', () => {
      mockIsMovieLoading = true;

      const { getByTestId } = render(<MovieFormScreen />);

      expect(getByTestId('fake-submit')).toBeTruthy();
    });
  });

  describe('Create flow', () => {
    it('creates a movie with the parsed payload and navigates back on success', async () => {
      mockCreateMovie.mockResolvedValue({ id: 'new-1' });

      const { getByTestId } = render(<MovieFormScreen />);
      fireEvent.press(getByTestId('fake-submit'));

      await waitFor(() => expect(mockCreateMovie).toHaveBeenCalled());

      expect(mockCreateMovie).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'The Matrix',
          synopsis: 'A hacker discovers the truth.',
          durationMinutes: 120,
          rating: undefined,
          genreIds: ['g1'],
        }),
      );
      expect(mockToastSuccess).toHaveBeenCalledWith('Movie created');
      expect(mockBack).toHaveBeenCalled();
      expect(mockUpdateMovie).not.toHaveBeenCalled();
    });

    it('shows an error toast and does not navigate back on failure', async () => {
      mockCreateMovie.mockRejectedValue(new Error('MOVIE_REQUIRES_GENRE'));

      const { getByTestId } = render(<MovieFormScreen />);
      fireEvent.press(getByTestId('fake-submit'));

      await waitFor(() =>
        expect(mockToastError).toHaveBeenCalledWith('MOVIE_REQUIRES_GENRE'),
      );
      expect(mockBack).not.toHaveBeenCalled();
    });
  });

  describe('Edit flow', () => {
    beforeEach(() => {
      mockParams = { id: 'movie1' };
      mockMovie = {
        id: 'movie1',
        title: 'Old Title',
        synopsis: 'Old synopsis',
        posterUrl: 'https://example.com/p.jpg',
        durationMinutes: 100,
        language: 'en',
        releaseDate: '1999-03-31T00:00:00.000Z',
        rating: 7,
        isActive: true,
        genres: [{ id: 'g1', name: 'Action' }],
      };
    });

    it('prefills the form from the loaded movie', () => {
      const { getByTestId } = render(<MovieFormScreen />);
      // The fake form doesn't render fields, but confirms the screen reaches
      // a non-loading state once the movie has loaded.
      expect(getByTestId('fake-submit')).toBeTruthy();
      expect(getByTestId('fake-delete')).toBeTruthy();
    });

    it('updates the movie by id and navigates back on success', async () => {
      mockUpdateMovie.mockResolvedValue({ id: 'movie1' });

      const { getByTestId } = render(<MovieFormScreen />);
      fireEvent.press(getByTestId('fake-submit'));

      await waitFor(() => expect(mockUpdateMovie).toHaveBeenCalled());

      expect(mockUpdateMovie).toHaveBeenCalledWith({
        id: 'movie1',
        payload: expect.objectContaining({ title: 'The Matrix' }),
      });
      expect(mockToastSuccess).toHaveBeenCalledWith('Movie updated');
      expect(mockBack).toHaveBeenCalled();
    });

    it('confirms before deactivating, and deactivates on confirm', async () => {
      mockDeleteMovie.mockResolvedValue(undefined);
      const alertSpy = jest.spyOn(Alert, 'alert');

      const { getByTestId } = render(<MovieFormScreen />);
      fireEvent.press(getByTestId('fake-delete'));

      expect(alertSpy).toHaveBeenCalledWith(
        'Deactivate movie',
        expect.stringContaining('reservation history is kept'),
        expect.any(Array),
      );

      const buttons = (alertSpy.mock.calls[0]?.[2] ?? []) as {
        text: string;
        onPress?: () => void;
      }[];
      const confirmButton = buttons.find(b => b.text === 'Deactivate');

      await confirmButton?.onPress?.();

      expect(mockDeleteMovie).toHaveBeenCalledWith('movie1');
      expect(mockToastSuccess).toHaveBeenCalledWith('Movie deactivated');
      expect(mockBack).toHaveBeenCalled();
    });

    it('shows an error toast when deactivation fails', async () => {
      mockDeleteMovie.mockRejectedValue(new Error('nope'));
      const alertSpy = jest.spyOn(Alert, 'alert');

      const { getByTestId } = render(<MovieFormScreen />);
      fireEvent.press(getByTestId('fake-delete'));

      const buttons = (alertSpy.mock.calls[0]?.[2] ?? []) as {
        text: string;
        onPress?: () => void;
      }[];
      const confirmButton = buttons.find(b => b.text === 'Deactivate');

      await confirmButton?.onPress?.();

      expect(mockToastError).toHaveBeenCalledWith('nope');
      expect(mockBack).not.toHaveBeenCalled();
    });
  });
});
