import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import type { MealReminderSettings } from './models';

const ANDROID_CHANNEL_ID = 'meal-reminders';

function isNativeMobile(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

if (isNativeMobile()) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: '食事リマインダー',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** スケジュール済みの食事リマインダーだけキャンセル */
export async function cancelMealReminderNotifications(): Promise<void> {
  if (!isNativeMobile()) return;
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all
      .filter((req) => req.content.data?.mealReminder === true)
      .map((req) => Notifications.cancelScheduledNotificationAsync(req.identifier)),
  );
}

/** 設定に合わせて毎日繰り返しのローカル通知を張り直す */
export async function syncMealReminderSchedules(
  settings: MealReminderSettings,
): Promise<{ granted: boolean }> {
  if (!isNativeMobile()) return { granted: true };
  await cancelMealReminderNotifications();
  if (!settings.enabled) return { granted: true };

  await ensureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
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
      title: '朝食の記録',
      body: '朝食を記録して、今日の栄養バランスをつかみましょう。',
      hour: settings.breakfastHour,
      minute: settings.breakfastMinute,
    },
    {
      slot: 'lunch',
      title: '昼食の記録',
      body: '昼食を記録しましょう。',
      hour: settings.lunchHour,
      minute: settings.lunchMinute,
    },
    {
      slot: 'dinner',
      title: '夕食の記録',
      body: '夕食を記録して、一日の振り返りに使いましょう。',
      hour: settings.dinnerHour,
      minute: settings.dinnerMinute,
    },
  ];

  for (const s of slots) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: s.title,
        body: s.body,
        sound: 'default',
        data: { mealReminder: true, slot: s.slot },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: s.hour,
        minute: s.minute,
        ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
      },
    });
  }

  return { granted: true };
}
