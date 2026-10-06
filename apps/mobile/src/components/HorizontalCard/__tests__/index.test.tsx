import { render, screen } from '@testing-library/react-native';

// Component
import { HorizontalCard } from '..';

// Constants
import { Size } from '@/constants';

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('uniwind', () => ({
  withUniwind: jest.fn((Component: any) => Component),
  useResolveClassNames: jest.fn(() => ({})),
}));

describe('HorizontalCard Component', () => {
  const defaultProps = {
    title: 'Test Movie',
    posterUrl: 'https://example.com/poster.jpg',
    durationMinutes: 120,
    genre: ['Action', 'Comedy'],
  };

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { toJSON } = render(<HorizontalCard {...defaultProps} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should display the movie title', () => {
      render(<HorizontalCard {...defaultProps} />);
      expect(screen.getByText('Test Movie')).toBeTruthy();
    });

    it('should display the card image', () => {
      render(<HorizontalCard {...defaultProps} />);
      expect(screen.getByTestId('horizontal-card-image')).toBeTruthy();
    });
  });

  describe('Detailed Info Mode (Default)', () => {
    it('should display rating when provided', () => {
      render(<HorizontalCard {...defaultProps} rating={4.5} />);
      expect(screen.getByTestId('horizontal-card-rating')).toBeTruthy();
    });

    it('should display genres', () => {
      render(<HorizontalCard {...defaultProps} />);
      expect(screen.getByText('Action, Comedy')).toBeTruthy();
    });

    it('should display duration', () => {
      render(<HorizontalCard {...defaultProps} durationMinutes={120} />);
      expect(screen.getByText('2h')).toBeTruthy();
    });

    it('should not display rating when not provided', () => {
      render(<HorizontalCard {...defaultProps} />);
      expect(screen.queryByTestId('horizontal-card-rating')).toBeNull();
    });

    it('should not display booking info when not provided', () => {
      render(<HorizontalCard {...defaultProps} />);
      expect(screen.queryByTestId('horizontal-card-showtime')).toBeNull();
      expect(screen.queryByTestId('horizontal-card-price')).toBeNull();
      expect(screen.queryByTestId('horizontal-card-cinema')).toBeNull();
    });
  });

  describe('Booking Info Mode', () => {
    it('should display showtime and date when provided', () => {
      render(
        <HorizontalCard
          {...defaultProps}
          showtime="16:40"
          showDate="2025-12-18"
        />,
      );
      expect(screen.getByText('16:40, Thu Dec 18')).toBeTruthy();
    });

    it('should display price when provided', () => {
      render(<HorizontalCard {...defaultProps} price="150" />);
      expect(screen.getByText('$150.00')).toBeTruthy();
    });

    it('should display cinema location when provided', () => {
      render(
        <HorizontalCard {...defaultProps} cinemaLocation="FX Sudirman XXI" />,
      );
      expect(screen.getByText('FX Sudirman XXI')).toBeTruthy();
    });

    it('should display all booking info together', () => {
      render(
        <HorizontalCard
          {...defaultProps}
          showtime="16:40"
          showDate="2025-12-18"
          price="150"
          cinemaLocation="FX Sudirman XXI"
        />,
      );
      expect(screen.getByText('16:40, Thu Dec 18')).toBeTruthy();
      expect(screen.getByText('$150.00')).toBeTruthy();
      expect(screen.getByText('FX Sudirman XXI')).toBeTruthy();
    });

    it('should not display rating when booking info is present', () => {
      render(
        <HorizontalCard
          {...defaultProps}
          rating={4.5}
          showtime="16:40"
          showDate="2025-12-18"
        />,
      );
      expect(screen.queryByTestId('horizontal-card-rating')).toBeNull();
    });

    it('should not display genres and duration when booking info is present', () => {
      render(
        <HorizontalCard
          {...defaultProps}
          showtime="16:40"
          showDate="2025-12-18"
        />,
      );
      expect(screen.queryByText('Action, Comedy')).toBeNull();
      expect(screen.queryByText('2h')).toBeNull();
    });
  });

  describe('Image Sizes', () => {
    it('should render with small image size', () => {
      const { toJSON } = render(
        <HorizontalCard {...defaultProps} imageSize={Size.SMALL} />,
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should render with medium image size', () => {
      const { toJSON } = render(
        <HorizontalCard {...defaultProps} imageSize={Size.MEDIUM} />,
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should render with large image size', () => {
      const { toJSON } = render(
        <HorizontalCard {...defaultProps} imageSize={Size.LARGE} />,
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty genre array', () => {
      render(<HorizontalCard {...defaultProps} genre={[]} />);
      expect(screen.getByText('Test Movie')).toBeTruthy();
    });

    it('should handle zero duration', () => {
      render(<HorizontalCard {...defaultProps} durationMinutes={0} />);
      expect(screen.getByText('Test Movie')).toBeTruthy();
    });

    it('should handle showtime only without date', () => {
      render(<HorizontalCard {...defaultProps} showtime="16:40" />);
      expect(screen.getByText('16:40')).toBeTruthy();
    });

    it('should handle date only without showtime', () => {
      render(<HorizontalCard {...defaultProps} showDate="2025-12-18" />);
      expect(screen.getByText('Thu Dec 18')).toBeTruthy();
    });

    it('should handle only price without other booking info', () => {
      render(<HorizontalCard {...defaultProps} price="150" />);
      expect(screen.getByText('$150.00')).toBeTruthy();
      expect(screen.queryByTestId('horizontal-card-showtime')).toBeNull();
      expect(screen.queryByTestId('horizontal-card-cinema')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('should have correct accessibility label', () => {
      render(<HorizontalCard {...defaultProps} />);
      const card = screen.getByTestId('horizontal-card');
      expect(card.props.accessibilityLabel).toBe('Test Movie');
    });
  });
});
