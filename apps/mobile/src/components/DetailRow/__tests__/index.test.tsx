import { render, screen } from '@testing-library/react-native';

// Component
import { DetailRow } from '..';

describe('DetailRow Component', () => {
  const defaultProps = {
    label: 'Test Label',
    value: 'Test Value',
  };

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { toJSON } = render(<DetailRow {...defaultProps} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should display the label', () => {
      render(<DetailRow {...defaultProps} />);
      expect(screen.getByText('Test Label')).toBeTruthy();
    });

    it('should display the value', () => {
      render(<DetailRow {...defaultProps} />);
      expect(screen.getByText('Test Value')).toBeTruthy();
    });

    it('should render with testID', () => {
      render(<DetailRow {...defaultProps} testID="test-order-row" />);
      expect(screen.getByTestId('test-order-row')).toBeTruthy();
    });
  });

  describe('Props', () => {
    it('should render with different label', () => {
      render(<DetailRow label="ID Order" value="22081996" />);
      expect(screen.getByText('ID Order')).toBeTruthy();
      expect(screen.getByText('22081996')).toBeTruthy();
    });

    it('should render with different value', () => {
      render(<DetailRow label="Price" value="Rp 50.000" />);
      expect(screen.getByText('Price')).toBeTruthy();
      expect(screen.getByText('Rp 50.000')).toBeTruthy();
    });

    it('should apply custom value className', () => {
      render(<DetailRow {...defaultProps} valueClassName="text-light-blue" />);
      const valueElement = screen.getByText('Test Value');
      expect(valueElement.props.className).toContain('text-light-blue');
    });

    it('should apply multiple custom value classNames', () => {
      render(
        <DetailRow
          {...defaultProps}
          valueClassName="text-primary font-montserrat-semibold"
        />,
      );
      const valueElement = screen.getByText('Test Value');
      expect(valueElement.props.className).toContain('text-primary');
      expect(valueElement.props.className).toContain(
        'font-montserrat-semibold',
      );
    });
  });

  describe('Layout', () => {
    it('should separate label and value with a gap', () => {
      render(<DetailRow {...defaultProps} testID="row" />);
      expect(screen.getByTestId('row').props.className).toContain('gap-4');
    });

    it('should let the label shrink', () => {
      render(<DetailRow {...defaultProps} />);
      expect(screen.getByText('Test Label').props.className).toContain(
        'shrink',
      );
    });

    it('should right-align the value', () => {
      render(<DetailRow {...defaultProps} />);
      expect(screen.getByText('Test Value').props.className).toContain(
        'text-right',
      );
    });

    it('should cap the value to half the row width', () => {
      render(<DetailRow {...defaultProps} />);
      let node = screen.getByText('Test Value').parent;
      while (node && node.props.className !== 'max-w-1/2') {
        node = node.parent;
      }
      expect(node).toBeTruthy();
    });

    it('should keep base value classes when a custom className is passed', () => {
      render(<DetailRow {...defaultProps} valueClassName="text-primary" />);
      const { className } = screen.getByText('Test Value').props;
      expect(className).toContain('text-right');
      expect(className).toContain('text-primary');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty label', () => {
      render(<DetailRow label="" value="Test Value" />);
      expect(screen.getByText('Test Value')).toBeTruthy();
    });

    it('should handle empty value', () => {
      render(<DetailRow label="Test Label" value="" />);
      expect(screen.getByText('Test Label')).toBeTruthy();
    });

    it('should handle long labels', () => {
      const longLabel =
        'This is a very long label that should be displayed correctly';
      render(<DetailRow label={longLabel} value="Value" />);
      expect(screen.getByText(longLabel)).toBeTruthy();
    });

    it('should handle long values', () => {
      const longValue =
        'This is a very long value that should be displayed correctly';
      render(<DetailRow label="Label" value={longValue} />);
      expect(screen.getByText(longValue)).toBeTruthy();
    });

    it('should handle numeric values', () => {
      render(<DetailRow label="Quantity" value="3" />);
      expect(screen.getByText('Quantity')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('should handle special characters in value', () => {
      render(<DetailRow label="Price" value="Rp 50.000 x 3" />);
      expect(screen.getByText('Price')).toBeTruthy();
      expect(screen.getByText('Rp 50.000 x 3')).toBeTruthy();
    });
  });
});
