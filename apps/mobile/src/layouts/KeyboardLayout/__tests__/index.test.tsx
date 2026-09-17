import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import { Text, Keyboard, EmitterSubscription } from 'react-native';

import { KeyboardLayout } from '..';
import { isIOS } from '@/utils/platform';

jest.mock('uniwind', () => ({
  withUniwind: (Component: any) => (props: any) => <Component {...props} />,
}));

jest.mock('@/utils/platform', () => ({
  isIOS: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('KeyboardLayout', () => {
  const mockIsIOS = isIOS as jest.Mock;
  const keyboardListeners: { [key: string]: ((...args: any[]) => any)[] } = {
    keyboardWillShow: [],
    keyboardDidShow: [],
    keyboardWillHide: [],
    keyboardDidHide: [],
  };

  beforeAll(() => {
    jest
      .spyOn(Keyboard, 'addListener')
      .mockImplementation((eventName, callback) => {
        keyboardListeners[eventName]?.push(callback);
        return {
          remove: () => {
            const index = keyboardListeners[eventName]?.indexOf(callback);
            if (index !== -1 && index !== undefined) {
              keyboardListeners[eventName]?.splice(index, 1);
            }
          },
        } as EmitterSubscription;
      });
  });

  beforeEach(() => {
    mockIsIOS.mockReturnValue(true); // Default to iOS
    Object.keys(keyboardListeners).forEach(key => {
      keyboardListeners[key] = [];
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const emitKeyboardEvent = (event: string) => {
    keyboardListeners[event]?.forEach(listener => listener());
  };

  it('renders children correctly', () => {
    const { getByText, debug } = render(
      <KeyboardLayout>
        <Text>Child Component</Text>
      </KeyboardLayout>,
    );
    // debug();
    expect(getByText('Child Component')).toBeTruthy();
  });

  it('applies custom content padding', () => {
    const { getByTestId } = render(
      <KeyboardLayout contentPadding="p-8">
        <Text testID="child">Child</Text>
      </KeyboardLayout>,
    );
    expect(getByTestId('child')).toBeTruthy();
  });

  // TODO: Add a testID to the TouchableWithoutFeedback in the component to make this test more robust.
  it('dismisses keyboard on press outside', () => {
    const dismissSpy = jest.spyOn(Keyboard, 'dismiss');
    const { getByTestId } = render(
      <KeyboardLayout>
        <Text testID="child">Child</Text>
      </KeyboardLayout>,
    );

    const touchable = getByTestId('child').parent!.parent!.parent!;
    fireEvent.press(touchable);

    expect(dismissSpy).toHaveBeenCalled();
    dismissSpy.mockRestore();
  });

  it('adjusts padding when keyboard is shown on iOS', () => {
    mockIsIOS.mockReturnValue(true);
    const { UNSAFE_getByProps } = render(
      <KeyboardLayout keyboardBottomPadding={50}>
        <Text>Child</Text>
      </KeyboardLayout>,
    );

    act(() => {
      emitKeyboardEvent('keyboardWillShow');
    });

    const scrollView = UNSAFE_getByProps({
      showsVerticalScrollIndicator: false,
    });
    expect(scrollView.props.contentContainerStyle).toEqual({
      paddingBottom: 50,
    });

    act(() => {
      emitKeyboardEvent('keyboardWillHide');
    });

    expect(scrollView.props.contentContainerStyle).toEqual({
      paddingBottom: 0,
    });
  });

  it('adjusts padding when keyboard is shown on Android', () => {
    mockIsIOS.mockReturnValue(false);
    const { UNSAFE_getByProps } = render(
      <KeyboardLayout keyboardBottomPadding={50}>
        <Text>Child</Text>
      </KeyboardLayout>,
    );

    act(() => {
      emitKeyboardEvent('keyboardDidShow');
    });

    const scrollView = UNSAFE_getByProps({
      showsVerticalScrollIndicator: false,
    });
    expect(scrollView.props.contentContainerStyle).toEqual({
      paddingBottom: 50,
    });

    act(() => {
      emitKeyboardEvent('keyboardDidHide');
    });

    expect(scrollView.props.contentContainerStyle).toEqual({
      paddingBottom: 0,
    });
  });
});
