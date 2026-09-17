import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

// Services
import { pushNotificationService } from '@/services/notification/push-notification';
import { pushTokenService } from '@/services/notification/push-token';

// Stores
import { useAuthStore } from '@/features/auth/store/auth';

// Constants
import { ROUTES } from '@/constants';

export const usePushNotifications = () => {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription>(null);
  const responseListener = useRef<Notifications.EventSubscription>(null);

  /**
   * Handle notification tap
   */
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      if (!data) return;

      // Navigate based on notification type
      if (data.type === 'ticket_expiring' || data.type === 'show_reminder') {
        const ticketId = data.ticketId as string;
        if (ticketId) {
          router.push(ROUTES.TICKET_DETAILS(ticketId));
        }
      }
    },
    [router],
  );

  useEffect(() => {
    // Register for push notifications
    const registerPushNotifications = async () => {
      if (!user?.id) return;

      try {
        const token =
          await pushNotificationService.registerForPushNotifications();

        // iOS Simulator: token will be null
        // This is EXPECTED and OK!
        if (token) {
          setExpoPushToken(token);

          // Register the token server-side (only if we have a token) — not
          // implemented yet, see PushTokenService; failure is swallowed below.
          const platform = Platform.OS as 'ios' | 'android';
          await pushTokenService.savePushToken(user.id, token, platform);
        } else {
          // This is normal on iOS simulator
          setExpoPushToken(null);
        }
      } catch {
        // Don't throw - app should continue to work
      }
    };

    registerPushNotifications();

    // Listen for notifications received while app is foregrounded
    notificationListener.current =
      pushNotificationService.addNotificationReceivedListener(notification => {
        setNotification(notification);
      });

    // Listen for user interactions with notifications
    responseListener.current =
      pushNotificationService.addNotificationResponseReceivedListener(
        response => {
          handleNotificationResponse(response);
        },
      );

    // Cleanup
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [handleNotificationResponse, user?.id]);

  /**
   * Schedule ticket expiration notification
   */
  const scheduleTicketExpiration = useCallback(
    async (
      ticketId: string,
      movieTitle: string,
      showDate: string,
      showTime: string,
      expirationDate: Date,
    ) => {
      try {
        const notificationId =
          await pushNotificationService.scheduleTicketExpirationNotification(
            ticketId,
            movieTitle,
            showDate,
            showTime,
            expirationDate,
          );

        return notificationId;
      } catch (error) {
        throw error;
      }
    },
    [],
  );

  /**
   * Schedule show reminder notification
   */
  const scheduleShowReminder = useCallback(
    async (
      ticketId: string,
      movieTitle: string,
      showDate: string,
      showTime: string,
      showDateTime: Date,
    ) => {
      try {
        const notificationId =
          await pushNotificationService.scheduleShowReminderNotification(
            ticketId,
            movieTitle,
            showDate,
            showTime,
            showDateTime,
          );
        return notificationId;
      } catch (error) {
        throw error;
      }
    },
    [],
  );

  return {
    expoPushToken,
    notification,
    scheduleTicketExpiration,
    scheduleShowReminder,
  };
};
