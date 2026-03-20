import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check } from 'lucide-react-native';

import { auth } from '../../firebaseConfig';
import type { DailyMetric, UserProfile } from '../../utils/models';
import { formatDateId, getDailyMetric, upsertDailyMetric } from '../../utils/firestoreDailyMetrics';
import { getUserProfile } from '../../utils/firestoreProfile';

export function DailyMetricQuickInput() {
  const user = auth.currentUser;
  const todayId = useMemo(() => formatDateId(new Date()), []);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const p = await getUserProfile(user.uid);
        setProfile(p);

        const m = await getDailyMetric(user.uid, todayId);
        if (m?.weight) setWeight(String(m.weight));
        if (typeof m?.bodyFatPercentage === 'number') setBodyFat(String(m.bodyFatPercentage));
      } catch {
        // 失敗しても入力はできるようにする
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [user, todayId]);

  // 設定モーダルなどで isDetailedTrackingEnabled が変わっても、タブはマウントされたままなので再取得する
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      void (async () => {
        try {
          const p = await getUserProfile(user.uid);
          setProfile(p);
        } catch {
          /* ignore */
        }
      })();
    }, [user]),
  );

  const detailedEnabled = !!profile?.isDetailedTrackingEnabled;

  const handleSave = async () => {
    if (!user) {
      Alert.alert('エラー', 'ログインが必要です。');
      return;
    }
    const w = Number(weight);
    if (!Number.isFinite(w) || w <= 0) {
      Alert.alert('入力確認', '体重(kg)を入力してください。');
      return;
    }

    let bf: number | undefined = undefined;
    if (detailedEnabled && bodyFat.trim().length > 0) {
      const v = Number(bodyFat);
      if (!Number.isFinite(v) || v <= 0 || v >= 100) {
        Alert.alert('入力確認', '体脂肪率(%)は 0〜100 未満で入力してください。');
        return;
      }
      bf = v;
    }

    const metric: DailyMetric = {
      date: todayId,
      weight: w,
      ...(typeof bf === 'number' ? { bodyFatPercentage: bf } : {}),
    };

    setSaving(true);
    try {
      await upsertDailyMetric(user.uid, metric);
    } catch (e) {
      Alert.alert('エラー', '保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={local.card}>
      <View style={local.headerRow}>
        <View>
          <Text style={local.title}>今日の体重</Text>
          <Text style={local.subtitle}>{todayId}</Text>
        </View>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || loading}
          style={[local.saveBtn, (saving || loading) && { opacity: 0.6 }]}
        >
          {saving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Check size={18} color="#000" />
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ paddingVertical: 10 }}>
          <ActivityIndicator color="#2ecc71" />
        </View>
      ) : (
        <View style={local.row}>
          <View style={{ flex: 1 }}>
            <Text style={local.label}>体重 (kg)</Text>
            <TextInput
              style={local.input}
              placeholder="例: 65.2"
              placeholderTextColor="#444"
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
              onEndEditing={handleSave}
              returnKeyType="done"
            />
          </View>

          {detailedEnabled && (
            <View style={{ flex: 1 }}>
              <Text style={local.label}>体脂肪率 (%)</Text>
              <TextInput
                style={local.input}
                placeholder="例: 18.5"
                placeholderTextColor="#444"
                keyboardType="numeric"
                value={bodyFat}
                onChangeText={setBodyFat}
                onEndEditing={handleSave}
                returnKeyType="done"
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const local = StyleSheet.create({
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  subtitle: {
    color: '#666',
    marginTop: 4,
    fontSize: 12,
  },
  saveBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#2ecc71',
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    color: '#888',
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    height: 46,
    backgroundColor: '#111',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#fff',
  },
});

