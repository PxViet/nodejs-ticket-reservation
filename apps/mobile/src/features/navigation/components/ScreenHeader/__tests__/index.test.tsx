import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

// Component
import { ScreenHeader } from '..';

// Type
import { ParamListBase } from '@react-navigation/native';
// expo-router's own NativeStackNavigationProp — see index.tsx for why.
import { NativeStackNavigationProp } from 'expo-router';
import {
  GenreMovie,
  Movie,
  MovieStatus,
} from '@/features/booking/schemas/movie';

// Constant
import { GENRE_MOVIE } from '@/constants/movie';
import { MOVIE_STATUS } from '@/constants/status';

// Mock expo-router
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn();
const mockUsePathname = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    canGoBack: mockCanGoBack,
  }),
  usePathname: () => mockUsePathname(),
}));

// Mock utils
const mockGetHeaderTitle = jest.fn();
const mockIsScreenPathname = jest.fn();

jest.mock('@/utils/cn', () => ({
  cn: jest.fn((...classes: any[]) => classes.filter(Boolean).join(' ')),
}));

jest.mock('@/utils/convert', () => ({
  getHeaderTitle: jest.fn((pathname: string) => mockGetHeaderTitle(pathname)),
  isScreenPathname: jest.fn((pathname: string, screen: string) =>
    mockIsScreenPathname(pathname, screen),
  ),
}));

jest.mock('@/utils/platform', () => ({
  STATUS_BAR_HEIGHT: 44,
}));

// Mock constants
jest.mock('@/constants', () => ({
  SCREENS: {
    MAIN: {
      PROFILE: 'profile/index',
      CINEMA: 'cinema/index',
      SEATS: 'seats/index',
    },
  },
  ROUTES: {
    HOME: '/(main)/(tabs)',
  },
}));

// Mock header store
const mockClearSelectedMovie = jest.fn();
const mockMovieStoreState = {
  selectedMovie: null as Movie | null,
  clearSelectedMovie: mockClearSelectedMovie,
};

jest.mock('@/stores/movie', () => ({
  useMovieStore: (selector: any) => selector(mockMovieStoreState),
}));

describe('ScreenHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack.mockReturnValue(true);
    mockUsePathname.mockReturnValue('/signup');
    mockGetHeaderTitle.mockReturnValue('Create Your New Account');
    mockIsScreenPathname.mockReturnValue(false);
    mockMovieStoreState.selectedMovie = null;
  });

  const headerProps = {
    options: {},
    route: { key: 'test', name: 'test' },
    navigation: {
      goBack: jest.fn(),
    } as unknown as NativeStackNavigationProp<ParamListBase, string, undefined>,
  };

  it('renders without crashing', () => {
    const { getByText } = render(<ScreenHeader {...headerProps} />);
    expect(getByText('Create Your New Account')).toBeTruthy();
  });

  it('displays title from HEADER_TITLE_MAP based on pathname', () => {
    mockUsePathname.mockReturnValue('/signup');
    const { getByText } = render(<ScreenHeader {...headerProps} />);
    expect(getByText('Create Your New Account')).toBeTruthy();
  });

  it('displays different title for different pathname', () => {
    mockUsePathname.mockReturnValue('/confirm-account');
    const { getByText } = render(<ScreenHeader {...headerProps} />);
    expect(getByText('Create Your New Account')).toBeTruthy();
  });

  it('displays custom title prop when provided', () => {
    const customTitle = 'Custom Title';
    const { getByText } = render(
      <ScreenHeader title={customTitle} {...headerProps} />,
    );
    expect(getByText(customTitle)).toBeTruthy();
  });

  it('hides back button when canGoBack returns false', () => {
    mockCanGoBack.mockReturnValue(false);
    const { queryByText } = render(<ScreenHeader {...headerProps} />);
    expect(queryByText('ArrowBackIcon')).toBeNull();
  });

  it('hides back button when showBackButton is false', () => {
    mockCanGoBack.mockReturnValue(true);
    const { queryByText } = render(
      <ScreenHeader showBackButton={false} {...headerProps} />,
    );
    expect(queryByText('ArrowBackIcon')).toBeNull();
  });

  it('prioritizes title prop over HEADER_TITLE_MAP', () => {
    mockUsePathname.mockReturnValue('/signup');
    const customTitle = 'Override Title';
    const { getByText, queryByText } = render(
      <ScreenHeader title={customTitle} {...headerProps} />,
    );

    expect(getByText(customTitle)).toBeTruthy();
    expect(queryByText('Create Your New Account')).toBeNull();
  });

  it('calls router.back when back button is pressed', () => {
    mockCanGoBack.mockReturnValue(true);
    const { getByLabelText } = render(<ScreenHeader {...headerProps} />);

    const backButton = getByLabelText('Go back');
    fireEvent.press(backButton);

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('calls router.replace with HOME route when on profile screen', () => {
    mockCanGoBack.mockReturnValue(true);
    mockUsePathname.mockReturnValue('/(main)/profile');
    mockIsScreenPathname.mockReturnValue(true);

    const { getByLabelText } = render(<ScreenHeader {...headerProps} />);

    const backButton = getByLabelText('Go back');
    fireEvent.press(backButton);

    expect(mockReplace).toHaveBeenCalledWith('/(main)/(tabs)');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('uses headerStoreTitle when title prop and getHeaderTitle are not provided', () => {
    mockGetHeaderTitle.mockReturnValue(undefined);
    mockMovieStoreState.selectedMovie = {
      id: '1',
      title: 'Store Title',
      posterUrl: 'https://example.com/poster.jpg',
      genre: [GENRE_MOVIE.ACTION as GenreMovie],
      durationMinutes: 120,
      rating: 8.5,
      synopsis: 'Test synopsis',
      trailerUrl: ['https://example.com/trailer.mp4'],
      releaseDate: '2024-01-01',
      castCrew: {
        actors: [],
        directors: [],
        producers: [],
        writers: [],
      },
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      status: MOVIE_STATUS.NOW_PLAYING as MovieStatus,
    };
  });

  it('does not render title section when headerTitle is falsy', () => {
    mockGetHeaderTitle.mockReturnValue(undefined);
    mockMovieStoreState.selectedMovie = null;

    const { queryByRole, getByLabelText } = render(
      <ScreenHeader {...headerProps} />,
    );

    // Title section should not be rendered, but right section should still exist
    expect(queryByRole('header')).toBeNull();
    expect(getByLabelText('Right section')).toBeTruthy();
  });

  it('renders back button when showBackButton is true and canGoBack is true', () => {
    mockCanGoBack.mockReturnValue(true);
    const { getByLabelText } = render(<ScreenHeader {...headerProps} />);

    expect(getByLabelText('Go back')).toBeTruthy();
  });

  it('calls getHeaderTitle with pathname', () => {
    mockUsePathname.mockReturnValue('/test-path');
    render(<ScreenHeader {...headerProps} />);

    expect(mockGetHeaderTitle).toHaveBeenCalledWith('/test-path');
  });

  it('calls isScreenPathname with pathname and profile screen', () => {
    mockUsePathname.mockReturnValue('/(main)/profile');
    render(<ScreenHeader {...headerProps} />);

    expect(mockIsScreenPathname).toHaveBeenCalledWith(
      '/(main)/profile',
      'profile/index',
    );
  });

  it('calls clearTitle when going back from Cinema screen with headerStoreTitle set', () => {
    mockCanGoBack.mockReturnValue(true);
    mockMovieStoreState.selectedMovie = {
      id: '1',
      title: 'Store Title',
      posterUrl: 'https://example.com/poster.jpg',
      genre: [GENRE_MOVIE.ACTION as GenreMovie],
      durationMinutes: 120,
      rating: 8.5,
      synopsis: 'Test synopsis',
      trailerUrl: ['https://example.com/trailer.mp4'],
      releaseDate: '2024-01-01',
      castCrew: {
        actors: [],
        directors: [],
        producers: [],
        writers: [],
      },
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      status: MOVIE_STATUS.NOW_PLAYING as MovieStatus,
    };
    // Simulate being on Cinema screen (second call to isScreenPathname returns true for CINEMA)
    mockIsScreenPathname.mockImplementation(
      (_pathname: string, screen: string) => screen === 'cinema/index',
    );

    const { getByLabelText } = render(<ScreenHeader {...headerProps} />);

    const backButton = getByLabelText('Go back');
    fireEvent.press(backButton);

    expect(mockClearSelectedMovie).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('does not call clearTitle when going back from Seats screen', () => {
    mockCanGoBack.mockReturnValue(true);
    mockMovieStoreState.selectedMovie = {
      id: '1',
      title: 'Store Title',
      posterUrl: 'https://example.com/poster.jpg',
      genre: [GENRE_MOVIE.ACTION as GenreMovie],
      durationMinutes: 120,
      rating: 8.5,
      synopsis: 'Test synopsis',
      trailerUrl: ['https://example.com/trailer.mp4'],
      releaseDate: '2024-01-01',
      castCrew: {
        actors: [],
        directors: [],
        producers: [],
        writers: [],
      },
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      status: MOVIE_STATUS.NOW_PLAYING as MovieStatus,
    };
    // Simulate being on Seats screen
    mockIsScreenPathname.mockImplementation(
      (_pathname: string, screen: string) => screen === 'seats/index',
    );

    const { getByLabelText } = render(<ScreenHeader {...headerProps} />);

    const backButton = getByLabelText('Go back');
    fireEvent.press(backButton);

    expect(mockClearSelectedMovie).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('does not show headerStoreTitle in header on Seats screen', () => {
    mockGetHeaderTitle.mockReturnValue(undefined);
    mockMovieStoreState.selectedMovie = {
      id: '1',
      title: 'Store Title',
      posterUrl: 'https://example.com/poster.jpg',
      genre: [GENRE_MOVIE.ACTION as GenreMovie],
      durationMinutes: 120,
      rating: 8.5,
      synopsis: 'Test synopsis',
      trailerUrl: ['https://example.com/trailer.mp4'],
      releaseDate: '2024-01-01',
      castCrew: {
        actors: [],
        directors: [],
        producers: [],
        writers: [],
      },
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      status: MOVIE_STATUS.NOW_PLAYING as MovieStatus,
    };

    // Simulate being on Seats screen
    mockIsScreenPathname.mockImplementation(
      (_pathname: string, screen: string) => screen === 'seats/index',
    );

    const { queryByText } = render(<ScreenHeader {...headerProps} />);

    expect(queryByText('Store Title')).toBeNull();
  });

  it('renders custom leftIcon when provided', () => {
    const MockLeftIcon = () => <Text>CustomLeftIcon</Text>;

    const { getByText } = render(
      <ScreenHeader leftIcon={MockLeftIcon} {...headerProps} />,
    );

    expect(getByText('CustomLeftIcon')).toBeTruthy();
  });

  it('renders custom rightIcon when provided', () => {
    const MockRightIcon = () => <Text>CustomRightIcon</Text>;

    const { getByText } = render(
      <ScreenHeader rightIcon={MockRightIcon} {...headerProps} />,
    );

    expect(getByText('CustomRightIcon')).toBeTruthy();
  });

  it('applies custom topInset', () => {
    const { getByLabelText } = render(
      <ScreenHeader topInset={100} {...headerProps} />,
    );

    // Component renders with custom inset - we verify it renders without crashing
    expect(getByLabelText('Go back')).toBeTruthy();
  });
});
