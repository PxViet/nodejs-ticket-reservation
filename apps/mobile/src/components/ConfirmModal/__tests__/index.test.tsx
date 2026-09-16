import { fireEvent, render } from '@testing-library/react-native';

import { ConfirmModal } from '../index';

describe('ConfirmModal', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    visible: true,
    title: 'Deactivate movie',
    message: 'This hides the movie from the catalogue.',
    confirmText: 'Deactivate',
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title, message and both actions when visible', () => {
    const { getByText } = render(<ConfirmModal {...defaultProps} />);

    expect(getByText('Deactivate movie')).toBeTruthy();
    expect(getByText('This hides the movie from the catalogue.')).toBeTruthy();
    expect(getByText('Deactivate')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('renders nothing when not visible', () => {
    const { queryByText } = render(
      <ConfirmModal {...defaultProps} visible={false} />,
    );

    expect(queryByText('Deactivate movie')).toBeNull();
  });

  it('uses a custom cancel label', () => {
    const { getByText } = render(
      <ConfirmModal {...defaultProps} cancelText="Keep it" />,
    );

    expect(getByText('Keep it')).toBeTruthy();
  });

  it('calls onConfirm when the confirm button is pressed', () => {
    const { getByTestId } = render(<ConfirmModal {...defaultProps} />);

    fireEvent.press(getByTestId('confirm-modal-confirm-button'));

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel from the cancel button and the backdrop', () => {
    const { getByTestId } = render(<ConfirmModal {...defaultProps} />);

    fireEvent.press(getByTestId('confirm-modal-cancel-button'));
    fireEvent.press(getByTestId('confirm-modal-backdrop'));

    expect(mockOnCancel).toHaveBeenCalledTimes(2);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('disables both actions while confirming', () => {
    const { getByTestId } = render(
      <ConfirmModal {...defaultProps} isConfirming />,
    );

    expect(
      getByTestId('confirm-modal-confirm-button').props.accessibilityState
        ?.disabled,
    ).toBe(true);
    expect(
      getByTestId('confirm-modal-cancel-button').props.accessibilityState
        ?.disabled,
    ).toBe(true);
  });

  it('prefixes inner test ids with a custom testID', () => {
    const { getByTestId } = render(
      <ConfirmModal {...defaultProps} testID="movie-confirm" />,
    );

    expect(getByTestId('movie-confirm-confirm-button')).toBeTruthy();
  });
});
