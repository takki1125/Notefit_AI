import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { doc, setDoc } from 'firebase/firestore';

import AutoCalorieModal from '../../components/goals/AutoCalorieModal';
import { auth, db } from '../../firebaseConfig';
import { styles as shared } from '../../theme/styles';
import type { Phase } from '../../utils/models';
import { setUserProfile } from '../../utils/firestoreProfile';

const phaseOptions: { label: string; value: Phase }[] = [
  { label: '減量', value: 'cut' },
  { label: '維持', value: 'maintain' },
  { label: '増量', value: 'bulk' },
];

const DECIMAL_NUMBER_PATTERN = /^\d+(?:[.,]\d+)?$/;
const INTEGER_NUMBER_PATTERN = /^\d+$/;

export default function OnboardingScreen() {
  const router = useRouter();
  const user = auth.currentUser;

  const [phase, setPhase] = useState<Phase>('cut');
  const [targetWeight, setTargetWeight] = useState('');
  const [targetCal, setTargetCal] = useState('');
  const [goesToGym, setGoesToGym] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [autoCalOpen, setAutoCalOpen] = useState(false);

  const canSubmit = useMemo(() => {
    const weight = targetWeight.trim();
    const cal = targetCal.trim();
    if (!DECIMAL_NUMBER_PATTERN.test(weight)) return false;
    if (!INTEGER_NUMBER_PATTERN.test(cal)) return false;
    const w = Number(weight.replace(',', '.'));
    const c = Number(cal);
    return Number.isFinite(w) && w > 0 && w <= 400 && Number.isFinite(c) && c >= 500 && c <= 10000 && goesToGym !== null;
  }, [goesToGym, targetWeight, targetCal]);

  const handleSave = async () => {
    if (!user) {
      Alert.alert('エラー', 'ログイン状態が無効です。');
      return;
    }
    if (targetWeight.trim().length === 0 || targetCal.trim().length === 0 || goesToGym === null) {
      Alert.alert('入力確認', '目標体重・目標カロリー・ジム通いの有無を入力してください。');
      return;
    }
    if (!DECIMAL_NUMBER_PATTERN.test(targetWeight.trim())) {
      Alert.alert('入力確認', '目標体重は半角数字で入力してください（例: 65 または 65.5）');
      return;
    }
    if (!INTEGER_NUMBER_PATTERN.test(targetCal.trim())) {
      Alert.alert('入力確認', '目標カロリーは半角数字で入力してください（例: 2000）');
      return;
    }
    const parsedWeight = Number(targetWeight.trim().replace(',', '.'));
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0 || parsedWeight > 400) {
      Alert.alert('入力確認', '目標体重は 1〜400kg の範囲で入力してください。');
      return;
    }
    const parsedCal = Number(targetCal.trim());
    if (!Number.isFinite(parsedCal) || parsedCal < 500 || parsedCal > 10000) {
      Alert.alert('入力確認', '目標カロリーは 500〜10000 kcal の範囲で入力してください。');
      return;
    }

    setSaving(true);
    try {
      await setUserProfile(user.uid, {
        phase,
        targetWeight: parsedWeight,
        targetCal: parsedCal,
        isDetailedTrackingEnabled: false,
      });
      await setDoc(
        doc(db, 'users', user.uid),
        {
          goesToGym,
          updatedAt: new Date(),
        },
        { merge: true },
      );
      router.replace('/home');
    } catch {
      Alert.alert('エラー', '保存に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={shared.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={{ padding: 20, flex: 1 }}>
          <Text style={local.title}>最初に目標だけ教えてください</Text>
          <Text style={local.subtitle}>
            入力は3つだけ。あとからいつでも変更できます。
          </Text>

          <View style={shared.card}>
            <Text style={local.label}>目的・フェーズ</Text>
            <View style={local.phaseRow}>
              {phaseOptions.map((opt) => {
                const active = phase === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[local.phasePill, active && local.phasePillActive]}
                    onPress={() => setPhase(opt.value)}
                    activeOpacity={0.85}
                  >
                    <Text style={[local.phaseText, active && local.phaseTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[local.label, { marginTop: 16 }]}>目標体重 (kg)</Text>
            <TextInput
              style={shared.inputField}
              value={targetWeight}
              onChangeText={setTargetWeight}
              placeholder="例: 65"
              placeholderTextColor="#444"
              keyboardType="numeric"
            />

            <Text style={local.label}>1日の目標カロリー (kcal)</Text>
            <TextInput
              style={shared.inputField}
              value={targetCal}
              onChangeText={setTargetCal}
              placeholder="例: 2000 または下のボタンで自動"
              placeholderTextColor="#444"
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={local.autoButton}
              onPress={() => setAutoCalOpen(true)}
              activeOpacity={0.85}
            >
              <Sparkles color="#2ecc71" size={18} />
              <Text style={local.autoButtonText}>目安から自動で入れる</Text>
            </TouchableOpacity>

            <Text style={[local.label, { marginTop: 2 }]}>ジムに通っていますか？</Text>
            <View style={local.gymRow}>
              <TouchableOpacity
                style={[local.gymPill, goesToGym === true && local.gymPillActive]}
                onPress={() => setGoesToGym(true)}
                activeOpacity={0.85}
              >
                <Text style={[local.gymPillText, goesToGym === true && local.gymPillTextActive]}>
                  通っている
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[local.gymPill, goesToGym === false && local.gymPillActive]}
                onPress={() => setGoesToGym(false)}
                activeOpacity={0.85}
              >
                <Text style={[local.gymPillText, goesToGym === false && local.gymPillTextActive]}>
                  通っていない
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                shared.loginButton,
                { marginTop: 10, opacity: canSubmit && !saving ? 1 : 0.5 },
              ]}
              onPress={handleSave}
              disabled={!canSubmit || saving}
            >
              {saving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={shared.loginButtonText}>はじめる</Text>
              )}
            </TouchableOpacity>

            <Text style={local.note}>
              詳細（体脂肪率など）は設定からいつでもONにできます。
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>

      <AutoCalorieModal
        visible={autoCalOpen}
        onClose={() => setAutoCalOpen(false)}
        phase={phase}
        onApply={(kcal) => setTargetCal(String(kcal))}
      />
    </SafeAreaView>
  );
}

const local = StyleSheet.create({
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 8,
  },
  subtitle: {
    color: '#888',
    marginBottom: 16,
    lineHeight: 20,
  },
  label: {
    color: '#888',
    marginBottom: 8,
    fontSize: 12,
  },
  phaseRow: {
    flexDirection: 'row',
    gap: 10,
  },
  phasePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  phasePillActive: {
    backgroundColor: '#2ecc71',
    borderColor: '#2ecc71',
  },
  phaseText: {
    color: '#ccc',
    fontWeight: 'bold',
  },
  phaseTextActive: {
    color: '#000',
  },
  note: {
    color: '#666',
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  autoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2ecc71',
    backgroundColor: '#142818',
    marginBottom: 10,
  },
  autoButtonText: {
    color: '#2ecc71',
    fontSize: 14,
    fontWeight: '600',
  },
  gymRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  gymPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  gymPillActive: {
    backgroundColor: '#2ecc71',
    borderColor: '#2ecc71',
  },
  gymPillText: {
    color: '#ccc',
    fontWeight: 'bold',
  },
  gymPillTextActive: {
    color: '#000',
  },
});

