import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { StickyFooterScrollView } from '..';

describe('StickyFooterScrollView', () => {
  it('renders the scrollable content and the footer', () => {
    const { getByText } = render(
      <StickyFooterScrollView footer={<Text>Footer</Text>}>
        <Text>Field</Text>
      </StickyFooterScrollView>,
    );

    expect(getByText('Field')).toBeTruthy();
    expect(getByText('Footer')).toBeTruthy();
  });

  it('applies the outer testID', () => {
    const { getByTestId } = render(
      <StickyFooterScrollView testID="my-form" footer={<Text>Footer</Text>}>
        <Text>Field</Text>
      </StickyFooterScrollView>,
    );

    expect(getByTestId('my-form')).toBeTruthy();
  });

  it('applies custom container class names', () => {
    const { UNSAFE_getByProps } = render(
      <StickyFooterScrollView
        contentContainerClassName="gap-5 px-6"
        footer={<Text>Footer</Text>}
      >
        <Text>Field</Text>
      </StickyFooterScrollView>,
    );

    expect(
      UNSAFE_getByProps({ contentContainerClassName: 'gap-5 px-6' }),
    ).toBeTruthy();
  });
});
