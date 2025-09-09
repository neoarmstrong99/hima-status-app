import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_SETTINGS_KEY = 'hima_notification_settings';

export interface NotificationSettings {
  enabled: boolean;
  groupSettings: Record<string, boolean>;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const registerForPushNotificationsAsync = async () => {
  let token;

  // Web環境では通知登録をスキップ
  if (Platform.OS === 'web') {
    console.log('Web環境では通知登録をスキップします');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('通知許可が取得できませんでした');
      return null;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    console.warn('実機でのみ通知機能を利用できます');
    return null;
  }

  return token;
};

export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  try {
    const settings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    return settings ? JSON.parse(settings) : { enabled: true, groupSettings: {} };
  } catch (error) {
    console.error('Error getting notification settings:', error);
    return { enabled: true, groupSettings: {} };
  }
};

export const updateNotificationSettings = async (settings: NotificationSettings) => {
  try {
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error updating notification settings:', error);
    throw new Error('通知設定の保存に失敗しました');
  }
};

export const sendLocalNotification = async (title: string, body: string) => {
  // Web環境では通知送信をスキップ
  if (Platform.OS === 'web') {
    console.log('Web環境では通知送信をスキップします:', title, body);
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: null,
  });
};
