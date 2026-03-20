import React, { useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { Alert, Platform, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, X } from 'lucide-react-native';

import { auth } from '../../firebaseConfig';
import { styles } from '../../theme/styles';
import {
  DEFAULT_MEAL_REMINDER_SETTINGS,
  getMealReminderSettings,
  setMealReminderSettings,
} from '../../utils/firestoreProfile';
import type { MealReminderSettings } from '../../utils/models';
import { syncMealReminderSchedules } from '../../utils/mealReminderNotifications';

type MealSlot = 'breakfast' | 'lunch' | 'dinner';

function timeLabel(s: MealReminderSettings, slot: MealSlot): string {
  const h =
    slot === 'breakfast'
      ? s.breakfastHour
      : slot === 'lunch'
        ? s.lunchHour
        : s.dinnerHour;
  const m =
    slot === 'breakfast'
      ? s.breakfastMinute
      : slot === 'lunch'
        ? s.lunchMinute
        : s.dinnerMinute;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function dateForSlot(s: MealReminderSettings, slot: MealSlot): Date {
  const d = new Date();
  if (slot === 'breakfast') d.setHours(s.breakfastHour, s.breakfastMinute, 0, 0);
  else if (slot === 'lunch') d.setHours(s.lunchHour, s.lunchMinute, 0, 0);
  else d.setHours(s.dinnerHour, s.dinnerMinute, 0, 0);
  return d;
}

export default function MealRemindersScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<MealReminderSettings>(DEFAULT_MEAL_REMINDER_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [pickerSlot, setPickerSlot] = useState<MealSlot | null>(null);

  React.useEffect(() => {
    const run = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const s = await getMealReminderSettings(user.uid);
        setSettings(s);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const persistAndSync = async (next: MealReminderSettings) => {
    const user = auth.currentUser;
    if (!user) return;
    await setMealReminderSettings(user.uid, next);
    const { granted } = await syncMealReminderSchedules(next);
    if (next.enabled && !granted) {
      const reverted = { ...next, enabled: false };
      await setMealReminderSettings(user.uid, reverted);
      setSettings(reverted);
      Alert.alert('通知が許可されていません', 'OSの設定で通知をオンにしてください。');
      return;
    }
    setSettings(next);
  };

  const onToggleEnabled = async (enabled: boolean) => {
    const prev = settings;
    const next = { ...settings, enabled };
    setSettings(next);
    try {
      await persistAndSync(next);
    } catch {
      setSettings(prev);
      Alert.alert('エラー', '設定の保存に失敗しました。');
    }
  };

  const onTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setPickerSlot(null);
    if (event.type === 'dismissed') {
      return;
    }
    if (!date || !pickerSlot) return;

    const prevSnapshot = settings;
    const h = date.getHours();
    const m = date.getMinutes();
    const next: MealReminderSettings = { ...settings };
    if (pickerSlot === 'breakfast') {
      next.breakfastHour = h;
      next.breakfastMinute = m;
    } else if (pickerSlot === 'lunch') {
      next.lunchHour = h;
      next.lunchMinute = m;
    } else {
      next.dinnerHour = h;
      next.dinnerMinute = m;
    }

    setSettings(next);
    void (async () => {
      try {
        await persistAndSync(next);
      } catch {
        setSettings(prevSnapshot);
        Alert.alert('エラー', '時間の保存に失敗しました。');
      }
    })();
  };

  const slotRow = (slot: MealSlot, title: string, subtitle: string) => (
    <TouchableOpacity
      style={[styles.routineItem, { marginTop: 10 }]}
      onPress={() => setPickerSlot(slot)}
      disabled={!settings.enabled || loading}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.routineNameText}>{title}</Text>
        <Text style={styles.routineDescText}>{subtitle}</Text>
      </View>
      <Text style={[styles.routineNameText, { marginRight: 8 }]}>{timeLabel(settings, slot)}</Text>
      <ChevronRight color="#444" size={20} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>食事リマインダー</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <X color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.routineDescText, { lineHeight: 20 }]}>
          指定した時間にローカル通知で食事の記録をお知らせします。通知はこの端末にのみ届きます。
        </Text>

        <View style={{ marginTop: 20 }}>
          <View style={styles.routineItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.routineNameText}>リマインダーを使う</Text>
              <Text style={styles.routineDescText}>朝食・昼食・夕食の3回</Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={(v) => void onToggleEnabled(v)}
              disabled={loading}
              trackColor={{ false: '#333', true: '#2ecc71' }}
              thumbColor={'#fff'}
            />
          </View>

          {slotRow('breakfast', '朝食', '通知の時間')}
          {slotRow('lunch', '昼食', '通知の時間')}
          {slotRow('dinner', '夕食', '通知の時間')}
        </View>

        {pickerSlot !== null && (
          <View style={{ marginTop: 16 }}>
            {Platform.OS === 'ios' ? (
              <TouchableOpacity onPress={() => setPickerSlot(null)} style={{ marginBottom: 8 }}>
                <Text style={{ color: '#2ecc71', fontSize: 16 }}>閉じる</Text>
              </TouchableOpacity>
            ) : null}
            <DateTimePicker
              value={dateForSlot(settings, pickerSlot)}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
