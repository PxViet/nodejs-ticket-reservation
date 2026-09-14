import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { KeyboardStickyLayout } from '..';

jest.mock('uniwind', () => ({
  withUniwind: (Component: any) => (props: any) => <Component {...props} />,
}));

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 12, left: 0, right: 0 }),
}));

describe('KeyboardStickyLayout', () => {
  it('renders children', () => {
    const { getByText } = render(
      <KeyboardStickyLayout>
        <Text>Child Component</Text>
      </KeyboardStickyLayout>,
    );

    expect(getByText('Child Component')).toBeTruthy();
  });
});
