import { render } from '@testing-library/react-native';

// Component
import { MainHeader } from '..';

// Type
import { type BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { type Layout } from '@react-navigation/elements';
import { type ParamListBase } from '@react-navigation/native';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

// Mock uniwind
jest.mock('uniwind', () => ({
  useResolveClassNames: (classNames: string) => ({ className: classNames }),
  withUniwind: (Component: typeof Text) => Component,
}));

// Mock useProfile hook
const mockUseProfile = jest.fn();

jest.mock('@/features/setting/hooks/useProfile', () => ({
  useProfile: () => mockUseProfile(),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('MainHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProfile.mockReturnValue({
      data: { id: 'test-user-id', avatarUrl: null },
      isLoading: false,
    });
  });

  const headerProps = {
    options: {
      title: 'Movies',
    },
    route: { key: 'test', name: 'test' },
    layout: {} as unknown as Layout,
    navigation: {} as unknown as BottomTabNavigationProp<
      ParamListBase,
      string,
      undefined
    >,
  };

  it('renders without crashing', () => {
    const { getByText } = render(<MainHeader {...headerProps} />);
    expect(getByText('Find Your Best Movie')).toBeTruthy();
  });

  it('displays title from MAIN_TITLE_MAP based on pathname', () => {
    const { getByText } = render(<MainHeader {...headerProps} />);
    expect(getByText('Find Your Best Movie')).toBeTruthy();
  });

  it('displays different title for different pathname', () => {
    const { getByText } = render(
      <MainHeader {...headerProps} options={{ title: 'Payments' }} />,
    );
    expect(getByText('Payment History')).toBeTruthy();
  });

  it('displays title for my-ticket pathname', () => {
    const { getByText } = render(
      <MainHeader {...headerProps} options={{ title: 'My Ticket' }} />,
    );
    expect(getByText('My Ticket')).toBeTruthy();
  });

  it('applies left alignment when isLeftTitle is true', () => {
    const { getByLabelText } = render(
      <MainHeader isLeftTitle {...headerProps} />,
    );
    const headerView = getByLabelText('Find Your Best Movie');
    expect(headerView).toBeTruthy();
  });

  it('applies center alignment when isLeftTitle is false', () => {
    const { getByLabelText } = render(
      <MainHeader isLeftTitle={false} {...headerProps} />,
    );
    const headerView = getByLabelText('Find Your Best Movie');
    expect(headerView).toBeTruthy();
  });
});
