import { render, screen } from '@testing-library/react-native';

// Components
import { MovieBannerCarouselSkeleton } from '../';

describe('MovieBannerCarouselSkeleton', () => {
  describe('Rendering', () => {
    it('should render the skeleton container', () => {
      render(<MovieBannerCarouselSkeleton />);

      expect(screen.getByTestId('movie-banner-carousel-skeleton')).toBeTruthy();
    });

    it('should render with default count of 3 items', () => {
      render(<MovieBannerCarouselSkeleton />);

      const skeletonItems = screen.getAllByTestId('movie-banner-skeleton-item');
      expect(skeletonItems).toHaveLength(3);
    });

    it('should render with custom count', () => {
      render(<MovieBannerCarouselSkeleton count={5} />);

      const skeletonItems = screen.getAllByTestId('movie-banner-skeleton-item');
      expect(skeletonItems).toHaveLength(5);
    });

    it('should have correct accessibility label', () => {
      render(<MovieBannerCarouselSkeleton />);

      expect(screen.getByLabelText('Loading movies')).toBeTruthy();
    });
  });

  describe('Variants', () => {
    it('should render horizontal variant by default', () => {
      const { getByTestId } = render(<MovieBannerCarouselSkeleton />);

      const container = getByTestId('movie-banner-carousel-skeleton');
      expect(container).toBeTruthy();
    });

    it('should render horizontal variant when specified', () => {
      const { getByTestId } = render(
        <MovieBannerCarouselSkeleton variant="horizontal" />,
      );

      const container = getByTestId('movie-banner-carousel-skeleton');
      expect(container).toBeTruthy();
    });

    it('should render vertical variant when specified', () => {
      const { getByTestId } = render(
        <MovieBannerCarouselSkeleton variant="vertical" />,
      );

      const container = getByTestId('movie-banner-carousel-skeleton');
      expect(container).toBeTruthy();
    });

    it('should render correct number of items for vertical variant', () => {
      render(<MovieBannerCarouselSkeleton variant="vertical" count={4} />);

      const skeletonItems = screen.getAllByTestId('movie-banner-skeleton-item');
      expect(skeletonItems).toHaveLength(4);
    });
  });

  describe('Layout', () => {
    it.each(['horizontal', 'vertical'] as const)(
      'should apply row layout with gap-4 for %s variant',
      variant => {
        render(<MovieBannerCarouselSkeleton variant={variant} />);

        const { className } = screen.getByTestId(
          'movie-banner-carousel-skeleton',
        ).props;
        expect(className).toContain('flex-row');
        expect(className).toContain('px-6');
        expect(className).toContain('gap-4');
      },
    );
  });

  describe('Skeleton Items', () => {
    it('should render skeleton items with correct accessibility label', () => {
      render(<MovieBannerCarouselSkeleton count={2} />);

      const skeletonItems = screen.getAllByLabelText('Loading movie');
      expect(skeletonItems).toHaveLength(2);
    });

    it('should render skeleton items for horizontal variant', () => {
      render(<MovieBannerCarouselSkeleton variant="horizontal" count={3} />);

      const skeletonItems = screen.getAllByTestId('movie-banner-skeleton-item');
      expect(skeletonItems).toHaveLength(3);
    });

    it('should render skeleton items for vertical variant', () => {
      render(<MovieBannerCarouselSkeleton variant="vertical" count={4} />);

      const skeletonItems = screen.getAllByTestId('movie-banner-skeleton-item');
      expect(skeletonItems).toHaveLength(4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle count of 0', () => {
      render(<MovieBannerCarouselSkeleton count={0} />);

      const skeletonItems = screen.queryAllByTestId(
        'movie-banner-skeleton-item',
      );
      expect(skeletonItems).toHaveLength(0);
    });

    it('should handle count of 1', () => {
      render(<MovieBannerCarouselSkeleton count={1} />);

      const skeletonItems = screen.getAllByTestId('movie-banner-skeleton-item');
      expect(skeletonItems).toHaveLength(1);
    });

    it('should handle large count values', () => {
      render(<MovieBannerCarouselSkeleton count={10} />);

      const skeletonItems = screen.getAllByTestId('movie-banner-skeleton-item');
      expect(skeletonItems).toHaveLength(10);
    });
  });

  describe('Component Structure', () => {
    it('should render container with correct testID', () => {
      const { getByTestId } = render(<MovieBannerCarouselSkeleton />);

      expect(getByTestId('movie-banner-carousel-skeleton')).toBeTruthy();
    });

    it('should render all skeleton items with correct testID', () => {
      render(<MovieBannerCarouselSkeleton count={3} />);

      const items = screen.getAllByTestId('movie-banner-skeleton-item');
      expect(items).toHaveLength(3);
    });
  });
});
