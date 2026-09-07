import { fireEvent, render } from '@testing-library/react-native';

import { HallDropdown } from '../';

// Hooks
import { useHalls } from '@/features/booking/hooks/useHalls';

jest.mock('@/features/booking/hooks/useHalls', () => ({
  useHalls: jest.fn(),
}));

const mockUseHalls = useHalls as jest.Mock;

const HALLS = [
  { id: 'hall1', name: 'Hall 1', hallType: 'IMAX', totalSeats: 100 },
  { id: 'hall2', name: 'Hall 2', hallType: '3D', totalSeats: 80 },
];

const loaded = { data: HALLS, isLoading: false, isError: false };

describe('HallDropdown Component', () => {
  const defaultProps = {
    onChange: jest.fn(),
    testID: 'hall-dropdown',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHalls.mockReturnValue(loaded);
  });

  describe('Rendering', () => {
    it('should render with the all-halls placeholder when nothing is selected', () => {
      const { getByText } = render(<HallDropdown {...defaultProps} />);

      expect(getByText('All Halls')).toBeTruthy();
    });

    it('should render the selected hall with its type', () => {
      const { getByText } = render(
        <HallDropdown {...defaultProps} value="hall1" />,
      );

      expect(getByText('Hall 1 · IMAX')).toBeTruthy();
    });

    it('should show a loading label while halls are in flight', () => {
      mockUseHalls.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      const { getByText } = render(<HallDropdown {...defaultProps} />);

      expect(getByText('Loading halls...')).toBeTruthy();
    });

    it('should surface a failed hall fetch', () => {
      mockUseHalls.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      });

      const { getByTestId } = render(<HallDropdown {...defaultProps} />);

      expect(getByTestId('hall-dropdown-error')).toBeTruthy();
    });
  });

  describe('Selection', () => {
    it('should open the modal on press', () => {
      const { getByTestId } = render(<HallDropdown {...defaultProps} />);

      fireEvent.press(getByTestId('hall-dropdown-button'));

      expect(getByTestId('hall-dropdown-option-hall1')).toBeTruthy();
      expect(getByTestId('hall-dropdown-option-hall2')).toBeTruthy();
    });

    it('should report the chosen hall id', () => {
      const onChange = jest.fn();
      const { getByTestId } = render(
        <HallDropdown {...defaultProps} onChange={onChange} />,
      );

      fireEvent.press(getByTestId('hall-dropdown-button'));
      fireEvent.press(getByTestId('hall-dropdown-option-hall2'));

      expect(onChange).toHaveBeenCalledWith('hall2');
    });

    it('should clear the filter through the all-halls option', () => {
      const onChange = jest.fn();
      const { getByTestId } = render(
        <HallDropdown {...defaultProps} value="hall1" onChange={onChange} />,
      );

      fireEvent.press(getByTestId('hall-dropdown-button'));
      fireEvent.press(getByTestId('hall-dropdown-option-'));

      expect(onChange).toHaveBeenCalledWith('');
    });

    it('should not open while disabled', () => {
      const { getByTestId, queryByTestId } = render(
        <HallDropdown {...defaultProps} disabled />,
      );

      fireEvent.press(getByTestId('hall-dropdown-button'));

      expect(queryByTestId('hall-dropdown-option-hall1')).toBeNull();
    });

    it('should not open while halls are still loading', () => {
      mockUseHalls.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      const { getByTestId, queryByTestId } = render(
        <HallDropdown {...defaultProps} />,
      );

      fireEvent.press(getByTestId('hall-dropdown-button'));

      expect(queryByTestId('hall-dropdown-option-hall1')).toBeNull();
    });

    it('should close on the Done control', () => {
      const { getByTestId, queryByTestId } = render(
        <HallDropdown {...defaultProps} />,
      );

      fireEvent.press(getByTestId('hall-dropdown-button'));
      fireEvent.press(getByTestId('hall-dropdown-modal-close'));

      expect(queryByTestId('hall-dropdown-option-hall1')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should describe the current selection', () => {
      const { getByLabelText } = render(
        <HallDropdown {...defaultProps} value="hall1" />,
      );

      expect(
        getByLabelText('Hall selector, currently selected: Hall 1 · IMAX'),
      ).toBeTruthy();
    });
  });
});
