import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { MealReminderSettings } from './models';

const ANDROID_CHANNEL_ID = 'meal-reminders';

type NotificationsModule = typeof import('expo-notifications');

function isNativeMobile(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/** Expo Go (SDK 53+) では expo-notifications の読み込み自体がエラーになるため使わない */
function canUseNotificationsModule(): boolean {
  return isNativeMobile() && Constants.appOwnership !== 'expo';
}

let notificationsModule: NotificationsModule | null = null;
let handlerConfigured = false;

function getNotifications(): NotificationsModule | null {
  if (!canUseNotificationsModule()) return null;
  if (!notificationsModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsModule = require('expo-notifications') as NotificationsModule;
    if (!handlerConfigured) {
      notificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      handlerConfigured = true;
    }
  }
  return notificationsModule;
}

async function ensureAndroidChannel(N: NotificationsModule): Promise<void> {
  if (Platform.OS !== 'android') return;
  await N.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: '食事リマインダー',
    importance: N.AndroidImportance.DEFAULT,
  });
}

/** スケジュール済みの食事リマインダーだけキャンセル */
export async function cancelMealReminderNotifications(): Promise<void> {
  const N = getNotifications();
  if (!N) return;
  const all = await N.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((req) => req.content.data?.mealReminder === true)
      .map((req) => N.cancelScheduledNotificationAsync(req.identifier)),
  );
}

/** 設定に合わせて毎日繰り返しのローカル通知を張り直す */
export async function syncMealReminderSchedules(
  settings: MealReminderSettings,
): Promise<{ granted: boolean }> {
  const N = getNotifications();
  if (!N) return { granted: true };

  await cancelMealReminderNotifications();
  if (!settings.enabled) return { granted: true };

  await ensureAndroidChannel(N);

  const { status: existing } = await N.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await N.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return { granted: false };

  const slots: {
    slot: string;
    title: string;
    body: string;
    hour: number;
    minute: number;
  }[] = [
    {
      slot: 'breakfast',
      title: '朝食',
      body: '食事記録はしましたか？',
      hour: settings.breakfastHour,
      minute: settings.breakfastMinute,
    },
    {
      slot: 'lunch',
      title: '昼食',
      body: '食事記録はしましたか？',
      hour: settings.lunchHour,
      minute: settings.lunchMinute,
    },
    {
      slot: 'dinner',
      title: '夕食',
      body: '食事記録はしましたか？',
      hour: settings.dinnerHour,
      minute: settings.dinnerMinute,
    },
  ];

  for (const s of slots) {
    await N.scheduleNotificationAsync({
      content: {
        title: s.title,
        body: s.body,
        sound: 'default',
        data: { mealReminder: true, slot: s.slot },
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DAILY,
        hour: s.hour,
        minute: s.minute,
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
      },
    });
  }

  return { granted: true };
}
