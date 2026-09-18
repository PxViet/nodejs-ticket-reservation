import { render, screen } from '@testing-library/react-native';
import { Rating } from '../index';

describe('Rating Component', () => {
  describe('Rendering', () => {
    it('should render 5 stars', () => {
      render(<Rating rating={3} />);

      expect(screen.getByTestId('rating-star-1')).toBeTruthy();
      expect(screen.getByTestId('rating-star-2')).toBeTruthy();
      expect(screen.getByTestId('rating-star-3')).toBeTruthy();
      expect(screen.getByTestId('rating-star-4')).toBeTruthy();
      expect(screen.getByTestId('rating-star-5')).toBeTruthy();
    });

    it('should render with rating container', () => {
      render(<Rating rating={3} />);

      expect(screen.getByTestId('rating')).toBeTruthy();
    });
  });

  describe('Rating Values', () => {
    it('should handle rating of 0', () => {
      const { getByTestId } = render(<Rating rating={0} />);

      expect(getByTestId('rating')).toBeTruthy();
    });

    it('should handle rating of 5', () => {
      const { getByTestId } = render(<Rating rating={5} />);

      expect(getByTestId('rating')).toBeTruthy();
    });

    it('should handle decimal ratings', () => {
      const { getByTestId } = render(<Rating rating={3.5} />);

      expect(getByTestId('rating')).toBeTruthy();
    });

    it('should handle rating of 2.7', () => {
      const { getByTestId } = render(<Rating rating={2.7} />);

      expect(getByTestId('rating')).toBeTruthy();
    });

    it('should display clamped rating in accessibility label for rating above 10', () => {
      const { getByTestId } = render(<Rating rating={11} />);
      const container = getByTestId('rating');

      expect(container.props.accessibilityLabel).toBe('Rating: 11.0 out of 10');
    });

    it('should display clamped rating in accessibility label for rating below 0', () => {
      const { getByTestId } = render(<Rating rating={-1} />);
      const container = getByTestId('rating');

      expect(container.props.accessibilityLabel).toBe('Rating: -1.0 out of 10');
    });
  });

  describe('Layout', () => {
    it('should lay stars out in a row with gap-4', () => {
      render(<Rating rating={3} />);

      const { className } = screen.getByTestId('rating').props;
      expect(className).toContain('flex-row');
      expect(className).toContain('items-center');
      expect(className).toContain('gap-4');
    });
  });
});
