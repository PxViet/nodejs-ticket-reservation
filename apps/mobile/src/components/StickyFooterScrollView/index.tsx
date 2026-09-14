import { memo, ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

interface StickyFooterScrollViewProps {
  children: ReactNode;
  footer: ReactNode;
  testID?: string;
  contentContainerClassName?: string;
  footerClassName?: string;
}

/**
 * Scrolls `children` while `footer` stays pinned below the scroll area —
 * the shared shape behind SignUpForm, MovieForm and EditProfileForm. Use
 * inside a `KeyboardStickyLayout` screen so the keyboard doesn't cover the
 * pinned footer.
 */
export const StickyFooterScrollView = memo(
  ({
    children,
    footer,
    testID,
    contentContainerClassName = 'px-4 pt-4 pb-6',
    footerClassName = 'px-4 pt-3 pb-6',
  }: StickyFooterScrollViewProps) => (
    <View className="flex-1 w-full" testID={testID}>
      <ScrollView
        className="flex-1"
        contentContainerClassName={contentContainerClassName}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {children}
      </ScrollView>

      <View className={footerClassName}>{footer}</View>
    </View>
  ),
);

StickyFooterScrollView.displayName = 'StickyFooterScrollView';
