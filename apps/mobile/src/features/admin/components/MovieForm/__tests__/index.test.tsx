import { fireEvent, render, waitFor } from '@testing-library/react-native';

// Component
import { MovieForm } from '../';

// Mock dependencies
const mockOnSubmit = jest.fn();
const mockOnDelete = jest.fn();
const mockOnActivate = jest.fn();

const mockGenres = [
  { id: 'g1', name: 'Action' },
  { id: 'g2', name: 'Comedy' },
];

jest.mock('@/features/booking/hooks/useGenres', () => ({
  useGenres: () => ({ data: mockGenres }),
}));

// expo-image is globally mocked to render as a bare string, which can't
// carry a testID — render it as a plain View like other screens' tests do.
jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: ({ testID, ...props }: any) => <View testID={testID} {...props} />,
  };
});

const validValues = {
  title: 'The Matrix',
  synopsis: 'A hacker discovers the truth.',
  posterUrl: 'https://example.com/poster.jpg',
  durationMinutes: '120',
  language: 'en',
  releaseDate: '1999-03-31',
  rating: '8.7',
  genreIds: ['g1'],
};

describe('MovieForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders every field', () => {
      const { getByTestId } = render(
        <MovieForm
          isPending={false}
          isEditing={false}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(getByTestId('admin-movie-title-input')).toBeTruthy();
      expect(getByTestId('admin-movie-synopsis-input')).toBeTruthy();
      expect(getByTestId('admin-movie-poster-input')).toBeTruthy();
      expect(getByTestId('admin-movie-duration-input')).toBeTruthy();
      expect(getByTestId('admin-movie-language-input')).toBeTruthy();
      expect(getByTestId('admin-movie-release-date-input')).toBeTruthy();
      expect(getByTestId('admin-movie-rating-input')).toBeTruthy();
      expect(getByTestId('admin-movie-submit-button')).toBeTruthy();
    });

    it('renders a chip for every genre', () => {
      const { getByTestId } = render(
        <MovieForm
          isPending={false}
          isEditing={false}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(getByTestId('admin-movie-genre-g1')).toBeTruthy();
      expect(getByTestId('admin-movie-genre-g2')).toBeTruthy();
    });

    it('prefills fields from defaultValues when editing', () => {
      const { getByTestId } = render(
        <MovieForm
          isPending={false}
          isEditing
          defaultValues={validValues}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(getByTestId('admin-movie-title-input-input').props.value).toBe(
        'The Matrix',
      );
      expect(getByTestId('admin-movie-duration-input-input').props.value).toBe(
        '120',
      );
    });

    it('does not show the poster preview when the URL is empty', () => {
      const { queryByTestId } = render(
        <MovieForm
          isPending={false}
          isEditing={false}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(queryByTestId('admin-movie-poster-preview')).toBeNull();
    });

    it('shows the poster preview once a URL is entered', () => {
      const { getByTestId } = render(
        <MovieForm
          isPending={false}
          isEditing={false}
          onSubmit={mockOnSubmit}
        />,
      );

      fireEvent.changeText(
        getByTestId('admin-movie-poster-input-input'),
        'https://example.com/p.jpg',
      );

      expect(getByTestId('admin-movie-poster-preview')).toBeTruthy();
    });

    it('does not render a delete button when creating', () => {
      const { queryByTestId } = render(
        <MovieForm
          isPending={false}
          isEditing={false}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(queryByTestId('admin-movie-delete-button')).toBeNull();
    });

    it('renders a delete button when editing with onDelete provided', () => {
      const { getByTestId, getByText } = render(
        <MovieForm
          isPending={false}
          isEditing
          onSubmit={mockOnSubmit}
          onDelete={mockOnDelete}
        />,
      );

      expect(getByTestId('admin-movie-delete-button')).toBeTruthy();
      expect(getByText('Deactivate movie')).toBeTruthy();
    });

    it('does not render a delete button when editing without onDelete', () => {
      const { queryByTestId } = render(
        <MovieForm isPending={false} isEditing onSubmit={mockOnSubmit} />,
      );

      expect(queryByTestId('admin-movie-delete-button')).toBeNull();
    });
  });

  describe('Genre selection', () => {
    it('selects a genre chip on press', () => {
      const { getByTestId } = render(
        <MovieForm
          isPending={false}
          isEditing={false}
          onSubmit={mockOnSubmit}
        />,
      );

      const chip = getByTestId('admin-movie-genre-g1');
      expect(chip.props.accessibilityState.checked).toBe(false);

      fireEvent.press(chip);

      expect(chip.props.accessibilityState.checked).toBe(true);
    });

    it('deselects an already-selected genre chip on press', () => {
      const { getByTestId } = render(
        <MovieForm
          isPending={false}
          isEditing
          defaultValues={{ genreIds: ['g1'] }}
          onSubmit={mockOnSubmit}
        />,
      );

      const chip = getByTestId('admin-movie-genre-g1');
      expect(chip.props.accessibilityState.checked).toBe(true);

      fireEvent.press(chip);

      expect(chip.props.accessibilityState.checked).toBe(false);
    });
  });

  describe('Validation', () => {
    it('shows an error when title is left empty', async () => {
      const { getByTestId, queryByTestId } = render(
        <MovieForm
          isPending={false}
          isEditing={false}
          onSubmit={mockOnSubmit}
        />,
      );
      const title = getByTestId('admin-movie-title-input-input');

      fireEvent.changeText(title, '');
      fireEvent(title, 'blur');

      await waitFor(() => {
        expect(queryByTestId('admin-movie-title-input-error')).toBeTruthy();
      });
    });

    it('shows an error for a non-numeric duration', async () => {
      const { getByTestId, queryByTestId } = render(
        <MovieForm
          isPending={false}
          isEditing={false}
          onSubmit={mockOnSubmit}
        />,
      );
      const duration = getByTestId('admin-movie-duration-input-input');

      fireEvent.changeText(duration, 'abc');
      fireEvent(duration, 'blur');

      await waitFor(() => {
        expect(queryByTestId('admin-movie-duration-input-error')).toBeTruthy();
      });
    });

    it('shows an error for a release date not in YYYY-MM-DD form', async () => {
      const { getByTestId, queryByTestId } = render(
        <MovieForm
          isPending={false}
          isEditing={false}
          onSubmit={mockOnSubmit}
        />,
      );
      const releaseDate = getByTestId('admin-movie-release-date-input-input');

      fireEvent.changeText(releaseDate, '03/31/1999');
      fireEvent(releaseDate, 'blur');

      await waitFor(() => {
        expect(
          queryByTestId('admin-movie-release-date-input-error'),
        ).toBeTruthy();
      });
    });

    it('allows an empty rating (optional field)', async () => {
      const { getByTestId, queryByTestId } = render(
        <MovieForm
          isPending={false}
          isEditing={false}
          onSubmit={mockOnSubmit}
        />,
      );
      const rating = getByTestId('admin-movie-rating-input-input');

      fireEvent.changeText(rating, '');
      fireEvent(rating, 'blur');

      await waitFor(() => {
        expect(queryByTestId('admin-movie-rating-input-error')).toBeNull();
      });
    });

    it('rejects a rating above 10', async () => {
      const { getByTestId, queryByTestId } = render(
        <MovieForm
          isPending={false}
          isEditing={false}
          onSubmit={mockOnSubmit}
        />,
      );
      const rating = getByTestId('admin-movie-rating-input-input');

      fireEvent.changeText(rating, '11');
      fireEvent(rating, 'blur');

      await waitFor(() => {
        expect(queryByTestId('admin-movie-rating-input-error')).toBeTruthy();
      });
    });

    it('does not call onSubmit when required fields are invalid', async () => {
      const { getByTestId } = render(
        <MovieForm
          isPending={false}
          isEditing={false}
          onSubmit={mockOnSubmit}
        />,
      );

      fireEvent.press(getByTestId('admin-movie-submit-button'));

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });
  });

  describe('Submission', () => {
    const fillValidForm = (getByTestId: (id: string) => any) => {
      fireEvent.changeText(
        getByTestId('admin-movie-title-input-input'),
        validValues.title,
      );
      fireEvent.changeText(
        getByTestId('admin-movie-duration-input-input'),
        validValues.durationMinutes,
      );
      fireEvent.changeText(
        getByTestId('admin-movie-language-input-input'),
        validValues.language,
      );
      fireEvent.changeText(
        getByTestId('admin-movie-release-date-input-input'),
        validValues.releaseDate,
      );
      fireEvent.press(getByTestId('admin-movie-genre-g1'));
    };

    it('calls onSubmit with the entered values once required fields are valid', async () => {
      const { getByTestId } = render(
        <MovieForm
          isPending={false}
          isEditing={false}
          onSubmit={mockOnSubmit}
        />,
      );

      fillValidForm(getByTestId);
      fireEvent.press(getByTestId('admin-movie-submit-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
      expect(mockOnSubmit.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          title: validValues.title,
          durationMinutes: validValues.durationMinutes,
          language: validValues.language,
          releaseDate: validValues.releaseDate,
          genreIds: ['g1'],
        }),
      );
    });

    it('labels the submit button "Create movie" when not editing', () => {
      const { getByText } = render(
        <MovieForm
          isPending={false}
          isEditing={false}
          onSubmit={mockOnSubmit}
        />,
      );
      expect(getByText('Create movie')).toBeTruthy();
    });

    it('labels the submit button "Save changes" when editing', () => {
      const { getByText } = render(
        <MovieForm isPending={false} isEditing onSubmit={mockOnSubmit} />,
      );
      expect(getByText('Save changes')).toBeTruthy();
    });

    it('disables the submit button while pending', () => {
      const { getByTestId } = render(
        <MovieForm isPending isEditing={false} onSubmit={mockOnSubmit} />,
      );

      expect(
        getByTestId('admin-movie-submit-button').props.accessibilityState
          ?.disabled,
      ).toBe(true);
    });
  });

  describe('Delete', () => {
    it('calls onDelete when the deactivate button is pressed', () => {
      const { getByTestId } = render(
        <MovieForm
          isPending={false}
          isEditing
          onSubmit={mockOnSubmit}
          onDelete={mockOnDelete}
        />,
      );

      fireEvent.press(getByTestId('admin-movie-delete-button'));

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it('shows an activate button instead of deactivate for an inactive movie', () => {
      const { getByTestId, getByText, queryByTestId } = render(
        <MovieForm
          isPending={false}
          isEditing
          isActive={false}
          onSubmit={mockOnSubmit}
          onDelete={mockOnDelete}
          onActivate={mockOnActivate}
        />,
      );

      expect(queryByTestId('admin-movie-delete-button')).toBeNull();
      expect(getByText('Activate movie')).toBeTruthy();

      fireEvent.press(getByTestId('admin-movie-activate-button'));

      expect(mockOnActivate).toHaveBeenCalledTimes(1);
      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it('does not render an activate button for an active movie', () => {
      const { queryByTestId } = render(
        <MovieForm
          isPending={false}
          isEditing
          onSubmit={mockOnSubmit}
          onDelete={mockOnDelete}
          onActivate={mockOnActivate}
        />,
      );

      expect(queryByTestId('admin-movie-activate-button')).toBeNull();
    });

    it('disables the activate button while activating', () => {
      const { getByTestId } = render(
        <MovieForm
          isPending={false}
          isEditing
          isActive={false}
          isActivating
          onSubmit={mockOnSubmit}
          onActivate={mockOnActivate}
        />,
      );

      expect(
        getByTestId('admin-movie-activate-button').props.accessibilityState
          ?.disabled,
      ).toBe(true);
    });

    it('disables the deactivate button while deleting', () => {
      const { getByTestId } = render(
        <MovieForm
          isPending={false}
          isEditing
          isDeleting
          onSubmit={mockOnSubmit}
          onDelete={mockOnDelete}
        />,
      );

      expect(
        getByTestId('admin-movie-delete-button').props.accessibilityState
          ?.disabled,
      ).toBe(true);
    });
  });
});
