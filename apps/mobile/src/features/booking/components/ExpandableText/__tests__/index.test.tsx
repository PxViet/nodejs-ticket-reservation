import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

// Component
import { ExpandableText } from '..';

describe('ExpandableText Component', () => {
  const shortText = 'This is a short text.';
  const longText =
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.';

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { getByText } = render(<ExpandableText text={shortText} />);
      expect(getByText(shortText)).toBeTruthy();
    });

    it('should render short text without read more button', () => {
      const { getByText, queryByText } = render(
        <ExpandableText text={shortText} />,
      );
      expect(getByText(shortText)).toBeTruthy();
      expect(queryByText('Read more')).toBeNull();
    });

    it('should render long text with read more button', () => {
      const { getByText } = render(<ExpandableText text={longText} />);
      expect(getByText(/Lorem ipsum dolor sit amet/)).toBeTruthy();
      expect(getByText('Read more')).toBeTruthy();
    });
  });

  describe('Text Truncation', () => {
    it('should truncate text to maxLength when not expanded', () => {
      const { getByText, queryByText } = render(
        <ExpandableText text={longText} maxLength={50} />,
      );
      const truncatedText = getByText(longText.substring(0, 50) + '...');
      expect(truncatedText).toBeTruthy();
      expect(queryByText(longText)).toBeNull();
    });

    it('should show full text when expanded', () => {
      const { getByText } = render(
        <ExpandableText text={longText} maxLength={50} />,
      );
      const readMoreButton = getByText('Read more');
      fireEvent.press(readMoreButton);
      expect(getByText(longText)).toBeTruthy();
    });

    it('should use custom maxLength', () => {
      const { getByText } = render(
        <ExpandableText text={longText} maxLength={100} />,
      );
      const readMoreButton = getByText('Read more');
      expect(readMoreButton).toBeTruthy();
    });
  });

  describe('Toggle Functionality', () => {
    it('should expand text when read more is pressed', () => {
      const { getByText } = render(
        <ExpandableText text={longText} maxLength={50} />,
      );
      const readMoreButton = getByText('Read more');
      fireEvent.press(readMoreButton);
      expect(getByText(longText)).toBeTruthy();
      expect(getByText('Read less')).toBeTruthy();
    });

    it('should collapse text when read less is pressed', () => {
      const { getByText } = render(
        <ExpandableText text={longText} maxLength={50} />,
      );
      const readMoreButton = getByText('Read more');
      fireEvent.press(readMoreButton);
      const readLessButton = getByText('Read less');
      fireEvent.press(readLessButton);
      expect(getByText('Read more')).toBeTruthy();
    });
  });

  describe('Custom Props', () => {
    it('should apply custom text size', () => {
      const { getByText } = render(
        <ExpandableText text={shortText} textSize="lg" />,
      );
      const textElement = getByText(shortText);
      expect(textElement.props.className).toContain('text-lg');
    });

    it('should apply custom text weight', () => {
      const { getByText } = render(
        <ExpandableText text={shortText} textWeight="medium" />,
      );
      const textElement = getByText(shortText);
      expect(textElement.props.className).toContain('font-montserrat-medium');
    });

    it('should apply custom text className', () => {
      const { getByText } = render(
        <ExpandableText text={shortText} textClassName="text-blue-500" />,
      );
      const textElement = getByText(shortText);
      expect(textElement.props.className).toContain('text-blue-500');
    });

    it('should apply custom read more className', () => {
      const { getByText } = render(
        <ExpandableText
          text={longText}
          readMoreClassName="text-red-500 mt-4"
        />,
      );
      const readMoreButton = getByText('Read more');
      expect(readMoreButton.props.className).toContain('text-red-500');
    });

    it('should apply custom container className', () => {
      const { getAllByTestId } = render(
        <ExpandableText
          text={shortText}
          containerClassName="px-4 py-2"
          testID="expandable-container"
        />,
      );
      const container = getAllByTestId('expandable-container');
      expect(container[0]?.props.className).toContain('px-4 py-2');
    });
  });
});
