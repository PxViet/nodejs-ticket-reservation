import { render } from '@testing-library/react-native';

// Constants
import { MOCK_PROMOTIONS } from '@/mocks';

// Component
import { PromotionCard } from '..';
import { PromoCode } from '@/features/booking/schemas/movie';

jest.mock('uniwind', () => {
  return {
    withUniwind: jest.fn((Component: any) => Component),
    useResolveClassNames: jest.fn(() => ({})),
  };
});

jest.mock('uniwind', () => {
  return {
    withUniwind: jest.fn((Component: any) => Component),
    useResolveClassNames: jest.fn(() => ({})),
  };
});

// Mock expo-image
jest.mock('expo-image', () => ({
  ImageBackground: 'ImageBackground',
}));

// Mock uniwind
jest.mock('uniwind', () => ({
  useResolveClassNames: (classNames: string) => ({ className: classNames }),
  withUniwind: <T,>(Component: T) => Component,
}));

describe('PromotionCard Component', () => {
  const defaultProps = MOCK_PROMOTIONS[0] as PromoCode;

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { toJSON } = render(<PromotionCard {...defaultProps} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should display the title', async () => {
      const { getByText } = render(<PromotionCard {...defaultProps} />);
      expect(getByText('Student Holiday')).toBeTruthy();
    });

    it('should display the subtitle', () => {
      const { getByText } = render(<PromotionCard {...defaultProps} />);
      expect(getByText('Maximal only for two people')).toBeTruthy();
    });

    it('should display the discount', () => {
      const { getByText } = render(<PromotionCard {...defaultProps} />);
      expect(getByText('50%')).toBeTruthy();
    });

    it('should display "OFF" text', () => {
      const { getByText } = render(<PromotionCard {...defaultProps} />);
      expect(getByText('OFF')).toBeTruthy();
    });
  });

  describe('Props', () => {
    it('should render with different title', () => {
      const { getByText } = render(
        <PromotionCard
          code="Summer Sale"
          description="Special offer"
          discountValue={30}
        />,
      );
      expect(getByText('Summer Sale')).toBeTruthy();
      expect(getByText('Special offer')).toBeTruthy();
      expect(getByText('30%')).toBeTruthy();
    });

    it('should render with different subtitle', () => {
      const { getByText } = render(
        <PromotionCard
          code="Winter Deal"
          description="Limited time only"
          discountValue={25}
        />,
      );
      expect(getByText('Winter Deal')).toBeTruthy();
      expect(getByText('Limited time only')).toBeTruthy();
    });

    it('should render with different discount', () => {
      const { getByText } = render(
        <PromotionCard
          code="Flash Sale"
          description="Today only"
          discountValue={75}
        />,
      );
      expect(getByText('75%')).toBeTruthy();
    });
  });
});
