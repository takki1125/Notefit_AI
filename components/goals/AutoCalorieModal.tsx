import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, X } from 'lucide-react-native';

import { auth } from '../../firebaseConfig';
import { styles as shared } from '../../theme/styles';
import type { ActivityLevel, CalorieEstimateSex, Phase } from '../../utils/models';
import { calcAgeYearsFromBirthDate } from '../../utils/demographics';
import {
  activityLevelLabel,
  estimateDailyCalories,
} from '../../utils/estimateCalories';
import { getLatestWeightKg } from '../../utils/firestoreDailyMetrics';
import {
  getCalorieEstimatePrefs,
  getUserDemographics,
  mergeUserDemographicsFields,
  setCalorieEstimatePrefs,
} from '../../utils/firestoreProfile';

const ACTIVITY_OPTIONS: ActivityLevel[] = [
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
];

type Props = {
  visible: boolean;
  onClose: () => void;
  phase: Phase;
  onApply: (kcal: number) => void;
};

function isValidBirthDate(s: string): boolean {
  const t = s.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  const [y, m, d] = t.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return false;
  const now = new Date();
  if (dt > now) return false;
  return true;
}

export default function AutoCalorieModal({ visible, onClose, phase, onApply }: Props) {
  const router = useRouter();
  const user = auth.currentUser;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [heightDraft, setHeightDraft] = useState('');
  const [birthDraft, setBirthDraft] = useState('');
  const [weightDraft, setWeightDraft] = useState('');
  const [sex, setSex] = useState<CalorieEstimateSex>('male');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [demo, latestKg, prefs] = await Promise.all([
        getUserDemographics(user.uid),
        getLatestWeightKg(user.uid),
        getCalorieEstimatePrefs(user.uid),
      ]);
      setHeightDraft(typeof demo.heightCm === 'number' && demo.heightCm > 0 ? String(demo.heightCm) : '');
      setBirthDraft(typeof demo.birthDate === 'string' ? demo.birthDate : '');
      setWeightDraft(latestKg != null && latestKg > 0 ? String(latestKg) : '');
      setSex(prefs.sex ?? 'male');
      setActivity(prefs.activityLevel ?? 'moderate');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (visible && user) {
      load();
    }
  }, [visible, user, load]);

  const previewKcal = useMemo(() => {
    const h = Number(heightDraft.replace(',', '.'));
    const w = Number(weightDraft.replace(',', '.'));
    const birth = birthDraft.trim();
    if (!Number.isFinite(h) || h < 80 || h > 250) return null;
    if (!Number.isFinite(w) || w < 20 || w > 300) return null;
    if (!isValidBirthDate(birth)) return null;
    const age = calcAgeYearsFromBirthDate(birth);
    if (age == null) return null;
    return estimateDailyCalories({
      weightKg: w,
      heightCm: h,
      ageYears: age,
      sex,
      activity,
      phase,
    });
  }, [heightDraft, birthDraft, weightDraft, sex, activity, phase]);

  const handleApply = async () => {
    if (!user) {
      Alert.alert('エラー', 'ログインが必要です。');
      return;
    }
    if (previewKcal == null) {
      Alert.alert(
        '入力確認',
        '身長（80〜250cm）・生年月日（YYYY-MM-DD）・体重（kg）を正しく入力してください。',
      );
      return;
    }
    setSubmitting(true);
    try {
      const h = Number(heightDraft.replace(',', '.'));
      const birth = birthDraft.trim();
      await mergeUserDemographicsFields(user.uid, { heightCm: h, birthDate: birth });
      await setCalorieEstimatePrefs(user.uid, { sex, activityLevel: activity });
      onApply(previewKcal);
      onClose();
    } catch {
      Alert.alert('エラー', '保存に失敗しました。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={local.backdrop}>
        <View style={local.sheet}>
          <View style={local.sheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Sparkles color="#2ecc71" size={22} />
              <Text style={local.sheetTitle}>目標カロリー自動計算</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <X color="#ccc" size={24} />
            </TouchableOpacity>
          </View>

          <Text style={local.hint}>
            基礎代謝の目安（Mifflin–St Jeor）と活動量から、1日の摂取カロリーを計算します。個人差はあるため「目安」として使い、体調に合わせて調整してください。
          </Text>

          <TouchableOpacity
            style={local.profileLink}
            onPress={() => {
              onClose();
              router.push('/settings/profile');
            }}
          >
            <Text style={local.profileLinkText}>身長・生年月日はプロフィールでも編集できます</Text>
          </TouchableOpacity>

          {loading ? (
            <ActivityIndicator color="#2ecc71" style={{ marginVertical: 24 }} />
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }}>
              <Text style={local.label}>身長 (cm)</Text>
              <TextInput
                style={shared.inputField}
                value={heightDraft}
                onChangeText={setHeightDraft}
                placeholder="例: 170"
                placeholderTextColor="#444"
                keyboardType="decimal-pad"
              />

              <Text style={local.label}>生年月日</Text>
              <TextInput
                style={shared.inputField}
                value={birthDraft}
                onChangeText={setBirthDraft}
                placeholder="YYYY-MM-DD（例: 1995-03-15）"
                placeholderTextColor="#444"
                autoCapitalize="none"
              />

              <Text style={local.label}>現在の体重 (kg)</Text>
              <TextInput
                style={shared.inputField}
                value={weightDraft}
                onChangeText={setWeightDraft}
                placeholder="記録があれば自動で入ります"
                placeholderTextColor="#444"
                keyboardType="decimal-pad"
              />

              <Text style={local.label}>性別（計算式用）</Text>
              <View style={local.pillRow}>
                <TouchableOpacity
                  style={[local.pill, sex === 'male' && local.pillActive]}
                  onPress={() => setSex('male')}
                >
                  <Text style={[local.pillText, sex === 'male' && local.pillTextActive]}>男性</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[local.pill, sex === 'female' && local.pillActive]}
                  onPress={() => setSex('female')}
                >
                  <Text style={[local.pillText, sex === 'female' && local.pillTextActive]}>女性</Text>
                </TouchableOpacity>
              </View>

              <Text style={[local.label, { marginTop: 4 }]}>いつもの活動量</Text>
              {ACTIVITY_OPTIONS.map((lvl) => {
                const active = activity === lvl;
                return (
                  <TouchableOpacity
                    key={lvl}
                    style={[local.activityRow, active && local.activityRowActive]}
                    onPress={() => setActivity(lvl)}
                  >
                    <Text style={[local.activityText, active && local.activityTextActive]}>
                      {activityLevelLabel(lvl)}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <View style={local.previewBox}>
                <Text style={local.previewLabel}>今の設定での目安</Text>
                <Text style={local.previewValue}>
                  {previewKcal != null ? `${previewKcal} kcal / 日` : '—'}
                </Text>
                <Text style={local.previewSub}>
                  上で選んだ「{phase === 'cut' ? '減量' : phase === 'bulk' ? '増量' : '維持'}」に合わせて増減しています。
                </Text>
              </View>
            </ScrollView>
          )}

          <TouchableOpacity
            style={[
              shared.loginButton,
              { marginTop: 8, opacity: previewKcal != null && !submitting ? 1 : 0.45 },
            ]}
            disabled={previewKcal == null || submitting}
            onPress={handleApply}
          >
            {submitting ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={shared.loginButtonText}>このカロリーを使う</Text>
            )}
          </TouchableOpacity>

          <Text style={local.disclaimer}>
            妊娠中・持病・処方中の場合は、かかりつけ医に相談してください。
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const local = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#222',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
    maxHeight: '92%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  hint: {
    color: '#999',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  profileLink: {
    marginBottom: 14,
  },
  profileLinkText: {
    color: '#2ecc71',
    fontSize: 12,
  },
  label: {
    color: '#888',
    marginBottom: 6,
    fontSize: 12,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: '#2ecc71',
    borderColor: '#2ecc71',
  },
  pillText: {
    color: '#ccc',
    fontWeight: 'bold',
  },
  pillTextActive: {
    color: '#000',
  },
  activityRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 8,
  },
  activityRowActive: {
    borderColor: '#2ecc71',
    backgroundColor: '#1a2e1f',
  },
  activityText: {
    color: '#ccc',
    fontSize: 13,
  },
  activityTextActive: {
    color: '#2ecc71',
    fontWeight: '600',
  },
  previewBox: {
    marginTop: 8,
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  previewLabel: {
    color: '#888',
    fontSize: 11,
    marginBottom: 4,
  },
  previewValue: {
    color: '#2ecc71',
    fontSize: 22,
    fontWeight: 'bold',
  },
  previewSub: {
    color: '#666',
    fontSize: 11,
    marginTop: 6,
    lineHeight: 16,
  },
  disclaimer: {
    color: '#555',
    fontSize: 10,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
});
