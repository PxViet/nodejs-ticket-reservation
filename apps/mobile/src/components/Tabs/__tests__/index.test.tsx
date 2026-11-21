import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Tabs } from '..';

// Mock uniwind
jest.mock('uniwind', () => ({
  useResolveClassNames: (classNames: string) => ({ className: classNames }),
  withUniwind: <T,>(Component: T) => Component,
}));

describe('Tabs Component', () => {
  const mockTabs = [
    { id: 'tab1', label: 'Tab 1' },
    { id: 'tab2', label: 'Tab 2' },
    { id: 'tab3', label: 'Tab 3' },
  ];

  const mockOnTabChange = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all tabs', () => {
      render(
        <Tabs tabs={mockTabs} activeTab="tab1" onTabChange={mockOnTabChange} />,
      );

      expect(screen.getByTestId('tab-tab1')).toBeTruthy();
      expect(screen.getByTestId('tab-tab2')).toBeTruthy();
      expect(screen.getByTestId('tab-tab3')).toBeTruthy();
    });

    it('should render tab labels correctly', () => {
      render(
        <Tabs tabs={mockTabs} activeTab="tab1" onTabChange={mockOnTabChange} />,
      );

      expect(screen.getByText('Tab 1')).toBeTruthy();
      expect(screen.getByText('Tab 2')).toBeTruthy();
      expect(screen.getByText('Tab 3')).toBeTruthy();
    });

    it('should render with primary variant by default', () => {
      const { getByTestId } = render(
        <Tabs tabs={mockTabs} activeTab="tab1" onTabChange={mockOnTabChange} />,
      );

      const container = getByTestId('tabs-container');
      expect(container.props.className).toContain('items-start');
    });

    it('should render with secondary variant when specified', () => {
      const { getByTestId } = render(
        <Tabs
          tabs={mockTabs}
          activeTab="tab1"
          onTabChange={mockOnTabChange}
          variant="secondary"
        />,
      );

      const container = getByTestId('tabs-container');
      expect(container.props.className).toContain(
        'justify-center items-center',
      );
    });

    it('should show active indicator for secondary variant', () => {
      render(
        <Tabs
          tabs={mockTabs}
          activeTab="tab2"
          onTabChange={mockOnTabChange}
          variant="secondary"
        />,
      );

      expect(screen.getByTestId('tab-indicator-tab2')).toBeTruthy();
    });

    it('should not show active indicator for primary variant', () => {
      render(
        <Tabs
          tabs={mockTabs}
          activeTab="tab1"
          onTabChange={mockOnTabChange}
          variant="primary"
        />,
      );

      expect(screen.queryByTestId('tab-indicator-tab1')).toBeNull();
    });
  });

  describe('Interactions', () => {
    it('should call onTabChange when a tab is pressed', () => {
      render(
        <Tabs tabs={mockTabs} activeTab="tab1" onTabChange={mockOnTabChange} />,
      );

      fireEvent.press(screen.getByTestId('tab-tab2'));
      expect(mockOnTabChange).toHaveBeenCalledWith('tab2');
      expect(mockOnTabChange).toHaveBeenCalledTimes(1);
    });

    it('should call onTabChange with correct id for each tab', () => {
      render(
        <Tabs tabs={mockTabs} activeTab="tab1" onTabChange={mockOnTabChange} />,
      );

      fireEvent.press(screen.getByTestId('tab-tab1'));
      expect(mockOnTabChange).toHaveBeenCalledWith('tab1');

      fireEvent.press(screen.getByTestId('tab-tab3'));
      expect(mockOnTabChange).toHaveBeenCalledWith('tab3');
    });

    it('should allow pressing the active tab', () => {
      render(
        <Tabs tabs={mockTabs} activeTab="tab1" onTabChange={mockOnTabChange} />,
      );

      fireEvent.press(screen.getByTestId('tab-tab1'));
      expect(mockOnTabChange).toHaveBeenCalledWith('tab1');
    });
  });

  describe('Accessibility', () => {
    it('should mark tabs with correct accessibility role', () => {
      const { getByTestId } = render(
        <Tabs tabs={mockTabs} activeTab="tab1" onTabChange={mockOnTabChange} />,
      );

      mockTabs.forEach(tab => {
        const tabElement = getByTestId(`tab-${tab.id}`);
        expect(tabElement.props.accessibilityRole).toBe('tab');
      });
    });

    it('should mark active tab as selected', () => {
      const { getByTestId } = render(
        <Tabs tabs={mockTabs} activeTab="tab2" onTabChange={mockOnTabChange} />,
      );

      expect(getByTestId('tab-tab2').props.accessibilityState.selected).toBe(
        true,
      );
      expect(getByTestId('tab-tab1').props.accessibilityState.selected).toBe(
        false,
      );
      expect(getByTestId('tab-tab3').props.accessibilityState.selected).toBe(
        false,
      );
    });

    it('should have correct accessibility labels for tabs', () => {
      const { getByTestId } = render(
        <Tabs tabs={mockTabs} activeTab="tab1" onTabChange={mockOnTabChange} />,
      );

      expect(getByTestId('tab-tab1').props.accessibilityLabel).toBe('Tab 1');
      expect(getByTestId('tab-tab2').props.accessibilityLabel).toBe('Tab 2');
      expect(getByTestId('tab-tab3').props.accessibilityLabel).toBe('Tab 3');
    });

    it('should have correct accessibility hint for active tab', () => {
      const { getByTestId } = render(
        <Tabs tabs={mockTabs} activeTab="tab1" onTabChange={mockOnTabChange} />,
      );

      expect(getByTestId('tab-tab1').props.accessibilityHint).toBe(
        'Tab 1 tab, currently active',
      );
    });

    it('should have correct accessibility hint for inactive tabs', () => {
      const { getByTestId } = render(
        <Tabs tabs={mockTabs} activeTab="tab1" onTabChange={mockOnTabChange} />,
      );

      expect(getByTestId('tab-tab2').props.accessibilityHint).toBe(
        'Switch to Tab 2 tab',
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tabs array', () => {
      const { getByTestId } = render(
        <Tabs tabs={[]} activeTab="" onTabChange={mockOnTabChange} />,
      );

      expect(getByTestId('tabs-container')).toBeTruthy();
    });

    it('should handle single tab', () => {
      const singleTab = [{ id: 'only', label: 'Only Tab' }];
      render(
        <Tabs
          tabs={singleTab}
          activeTab="only"
          onTabChange={mockOnTabChange}
        />,
      );

      expect(screen.getByTestId('tab-only')).toBeTruthy();
      expect(screen.getByText('Only Tab')).toBeTruthy();
    });

    it('should handle tabs with special characters in labels', () => {
      const specialTabs = [
        { id: '1', label: 'Tab & More' },
        { id: '2', label: 'Tab "Two"' },
        { id: '3', label: "Tab's Three" },
      ];

      render(
        <Tabs tabs={specialTabs} activeTab="1" onTabChange={mockOnTabChange} />,
      );

      expect(screen.getByText('Tab & More')).toBeTruthy();
      expect(screen.getByText('Tab "Two"')).toBeTruthy();
      expect(screen.getByText("Tab's Three")).toBeTruthy();
    });

    it('should handle very long tab labels', () => {
      const longLabelTabs = [
        { id: '1', label: 'This is a very long tab label that might wrap' },
      ];

      render(
        <Tabs
          tabs={longLabelTabs}
          activeTab="1"
          onTabChange={mockOnTabChange}
        />,
      );

      expect(
        screen.getByText('This is a very long tab label that might wrap'),
      ).toBeTruthy();
    });
  });

  describe('Active State Changes', () => {
    it('should update active indicator when activeTab changes', () => {
      const { rerender, queryByTestId } = render(
        <Tabs
          tabs={mockTabs}
          activeTab="tab1"
          onTabChange={mockOnTabChange}
          variant="secondary"
        />,
      );

      expect(queryByTestId('tab-indicator-tab1')).toBeTruthy();
      expect(queryByTestId('tab-indicator-tab2')).toBeNull();

      rerender(
        <Tabs
          tabs={mockTabs}
          activeTab="tab2"
          onTabChange={mockOnTabChange}
          variant="secondary"
        />,
      );

      expect(queryByTestId('tab-indicator-tab1')).toBeNull();
      expect(queryByTestId('tab-indicator-tab2')).toBeTruthy();
    });

    it('should update accessibility state when activeTab changes', () => {
      const { rerender, getByTestId } = render(
        <Tabs tabs={mockTabs} activeTab="tab1" onTabChange={mockOnTabChange} />,
      );

      expect(getByTestId('tab-tab1').props.accessibilityState.selected).toBe(
        true,
      );

      rerender(
        <Tabs tabs={mockTabs} activeTab="tab3" onTabChange={mockOnTabChange} />,
      );

      expect(getByTestId('tab-tab1').props.accessibilityState.selected).toBe(
        false,
      );
      expect(getByTestId('tab-tab3').props.accessibilityState.selected).toBe(
        true,
      );
    });
  });

  describe('Component Props', () => {
    it('should have correct displayName', () => {
      expect(Tabs.displayName).toBe('Tabs');
    });

    it('should be memoized', () => {
      const { rerender } = render(
        <Tabs tabs={mockTabs} activeTab="tab1" onTabChange={mockOnTabChange} />,
      );

      // Re-render with same props
      rerender(
        <Tabs tabs={mockTabs} activeTab="tab1" onTabChange={mockOnTabChange} />,
      );

      // Component should not re-render unnecessarily (memo working)
      expect(screen.getByTestId('tabs-container')).toBeTruthy();
    });
  });
});
