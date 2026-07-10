import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationService = {
  requestPermissions: async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  },

  getExpoPushToken: async (): Promise<string | null> => {
    try {
      const { data } = await Notifications.getExpoPushTokenAsync();
      return data;
    } catch {
      return null;
    }
  },

  scheduleLocal: async (
    title: string,
    body: string,
    seconds = 1,
  ): Promise<string> => {
    return Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
    });
  },

  cancelAll: async (): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  addListener: (
    handler: (notification: Notifications.Notification) => void,
  ) => {
    return Notifications.addNotificationReceivedListener(handler);
  },

  addResponseListener: (
    handler: (response: Notifications.NotificationResponse) => void,
  ) => {
    return Notifications.addNotificationResponseReceivedListener(handler);
  },
};
