import { useMemo } from 'react';
import { TouchableOpacity, View } from 'react-native';

// Expo
import { router } from 'expo-router';

// Components
import { Avatar } from '@/components/Avatar';
import { Typo } from '@/components/Typo';

// Constants
import { MAIN_TITLE_MAP, ROUTES } from '@/constants';

// Types
import { UserProfileIcon } from '@/icons/UserProfileIcon';

// Hooks
import { useProfile } from '@/features/setting/hooks/useProfile';

// Utils
import { cn } from '@/utils/cn';
import { STATUS_BAR_HEIGHT } from '@/utils/platform';
import { Skeleton } from '@/components/Skeleton';

export interface MainHeaderProps {
  options: { title?: string };
  isLeftTitle?: boolean;
  isRenderUserProfile?: boolean;
  topInset?: number;
}

export const MainHeader = ({
  isLeftTitle,
  isRenderUserProfile = true,
  topInset = STATUS_BAR_HEIGHT,
  ...props
}: MainHeaderProps) => {
  const { data: user, isLoading } = useProfile();

  const title = useMemo(
    () => MAIN_TITLE_MAP[props.options.title as keyof typeof MAIN_TITLE_MAP],
    [props.options.title],
  );

  const handleProfilePress = () => {
    router.push(ROUTES.PROFILE);
  };

  return (
    <View
      className="bg-bg-primary"
      style={{
        paddingTop: topInset,
      }}
    >
      <View className="flex-row items-center justify-between px-6 py-8">
        {/* Left Section */}
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel={title}
          className={cn('flex-1', isLeftTitle ? 'items-start' : 'items-center')}
        >
          <Typo
            size="2xl"
            weight="semibold"
            className={cn('leading-7', isLeftTitle && 'min-w-[198]')}
          >
            {title}
          </Typo>
        </View>

        {/* Right Section */}
        {isRenderUserProfile &&
          (isLoading ? (
            <View className="flex-1 items-end">
              <Skeleton width={48} height={48} borderRadius={50} />
            </View>
          ) : (
            <TouchableOpacity
              accessible
              accessibilityRole="button"
              accessibilityHint="Tap to open user profile"
              accessibilityLabel="Right section"
              className="flex-1 items-end"
              onPress={handleProfilePress}
            >
              <Avatar
                size={48}
                source={user?.avatarUrl}
                defaultAvatar={UserProfileIcon}
                accessibilityLabel="User profile picture"
              />
            </TouchableOpacity>
          ))}
      </View>
    </View>
  );
};

MainHeader.displayName = 'MainHeader';
