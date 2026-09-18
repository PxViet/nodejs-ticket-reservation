import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Unwind
import { withUniwind } from 'uniwind';

// Constants
import { ROUTES, SETTING_ITEMS } from '@/constants';

// Hooks
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useProfile } from '@/features/setting/hooks/useProfile';

// Components
import { Avatar } from '@/components/Avatar';
import { Typo } from '@/components/Typo';
import { SettingItem } from '@/features/setting/components/SettingItem';

// Icons
import { UserProfileIcon } from '@/icons/UserProfileIcon';

const StyledSafeAreaView = withUniwind(SafeAreaView);
const StyledScrollView = withUniwind(ScrollView);

enum SettingKey {
  Edit = 'edit',
  MyWallet = 'my_wallet',
  ChangeLanguage = 'change_language',
  HelpCenter = 'help_center',
  RateApp = 'rate_app',
  ChangePassword = 'change_password',
  Logout = 'logout',
}

const MyProfileScreen = () => {
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const { signOut } = useAuth();

  // Every account is email/password now, so every setting is visible.
  const visibleSettings = SETTING_ITEMS;

  const SETTING_ACTIONS: Record<SettingKey, () => void> = useMemo(
    () => ({
      [SettingKey.Edit]: () => router.push(ROUTES.PROFILE_EDIT),
      [SettingKey.MyWallet]: () => null,
      [SettingKey.ChangeLanguage]: () => null,
      [SettingKey.HelpCenter]: () => () => null,
      [SettingKey.RateApp]: () => {
        Alert.alert('Enjoying Movea?', 'Please take a moment to rate us ⭐', [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Rate now',
            onPress: () => null,
          },
        ]);
      },
      [SettingKey.ChangePassword]: () =>
        router.push(ROUTES.PROFILE_CHANGE_PASSWORD),
      [SettingKey.Logout]: () => signOut(),
    }),
    [signOut],
  );

  if (isProfileLoading) {
    return (
      <StyledSafeAreaView
        edges={['bottom']}
        className="flex-1 bg-bg-primary items-center justify-center"
        accessibilityLabel="Loading Profile"
      >
        <ActivityIndicator size="large" />
        <Typo className="text-text-secondary mt-4">Loading profile...</Typo>
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView
      edges={['bottom']}
      className="flex-1 bg-bg-primary"
      accessibilityLabel="Profile screen"
      accessibilityHint="Profile screen"
    >
      <StyledScrollView
        contentContainerClassName="px-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="justify-center items-center gap-6">
          <Avatar
            size={132}
            source={profile?.avatarUrl}
            defaultAvatar={UserProfileIcon}
            accessibilityLabel="Profile avatar"
          />

          <View className="gap-1 items-center">
            <Typo size="lg" weight="medium">
              {profile?.fullName}
            </Typo>
            <Typo size="base" weight="regular" className="text-overlay-soft">
              {profile?.email}
            </Typo>
          </View>
        </View>

        <View className="mt-8 gap-5">
          {visibleSettings.map(item => (
            <SettingItem
              key={item.TEST_ID}
              title={item.TITLE}
              icon={item.ICON}
              testID={item.TEST_ID}
              onPress={SETTING_ACTIONS[item.TEST_ID as SettingKey]}
            />
          ))}
        </View>
      </StyledScrollView>
    </StyledSafeAreaView>
  );
};

export default MyProfileScreen;
