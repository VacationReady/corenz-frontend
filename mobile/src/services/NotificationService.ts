import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiClient } from '../api/client';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and get Expo push token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Check if physical device (push notifications don't work on simulator)
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission for push notifications denied');
      return null;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });

    const token = tokenData.data;

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
      });

      await Notifications.setNotificationChannelAsync('shift-reminders', {
        name: 'Shift Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8B5CF6',
      });

      await Notifications.setNotificationChannelAsync('timesheet-approvals', {
        name: 'Timesheet Approvals',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      });
    }

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Send push token to server
 */
export async function sendTokenToServer(token: string): Promise<boolean> {
  try {
    const deviceId = await getDeviceId();
    const platform = Platform.OS;

    const response = await apiClient.post('/api/notifications/register-token', {
      token,
      deviceId,
      platform,
    });

    return response.data.success;
  } catch (error) {
    console.error('Error sending token to server:', error);
    return false;
  }
}

/**
 * Get unique device ID
 */
async function getDeviceId(): Promise<string> {
  // Use a combination of device info to create unique ID
  const deviceName = Device.deviceName || 'unknown';
  const modelName = Device.modelName || 'unknown';
  const osVersion = Device.osVersion || 'unknown';
  
  return `${Platform.OS}_${deviceName}_${modelName}_${osVersion}`.replace(/\s+/g, '_');
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  trigger: Date | number,
  data?: Record<string, any>
): Promise<string> {
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger:
      typeof trigger === 'number'
        ? { seconds: trigger }
        : { date: trigger },
  });

  return notificationId;
}

/**
 * Schedule daily reminder at specific time
 */
export async function scheduleDailyReminder(
  hour: number,
  minute: number,
  title: string,
  body: string
): Promise<string> {
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    },
  });

  return notificationId;
}

/**
 * Cancel a specific notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Add notification received listener
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add notification response listener (when user taps notification)
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Handle notification when received
 */
export function handleNotificationReceived(notification: Notifications.Notification): void {
  console.log('Notification received:', notification);
  
  const { data } = notification.request.content;
  
  // Handle different notification types
  switch (data?.type) {
    case 'SHIFT_REMINDER':
      console.log('Shift reminder:', data);
      break;
    case 'TIMESHEET_APPROVAL':
      console.log('Timesheet approval:', data);
      break;
    case 'CLOCK_OUT_REMINDER':
      console.log('Clock out reminder:', data);
      break;
    case 'SHIFT_SWAP':
      console.log('Shift swap request:', data);
      break;
    default:
      console.log('Generic notification:', data);
  }
}

/**
 * Handle notification response (when user taps)
 */
export function handleNotificationResponse(
  response: Notifications.NotificationResponse,
  navigation: any
): void {
  console.log('Notification tapped:', response);
  
  const { data } = response.notification.request.content;
  
  // Navigate based on notification type
  switch (data?.type) {
    case 'SHIFT_REMINDER':
      navigation.navigate('Schedule');
      break;
    case 'TIMESHEET_APPROVAL':
      navigation.navigate('Timesheet');
      break;
    case 'CLOCK_OUT_REMINDER':
      navigation.navigate('Home');
      break;
    case 'SHIFT_SWAP':
      navigation.navigate('Schedule');
      break;
  }
}

/**
 * Clear badge count
 */
export async function clearBadgeCount(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}
