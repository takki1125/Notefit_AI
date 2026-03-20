import React, { useEffect, useMemo, useState } from 'react';
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
import { Check, ChevronLeft, Target } from 'lucide-react-native';

import { auth } from '../../firebaseConfig';
import { styles as shared } from '../../theme/styles';
import type { Phase } from '../../utils/models';
import { getUserProfile, setUserProfile } from '../../utils/firestoreProfile';

const phaseOptions: Array<{ label: string; value: Phase }> = [
  { label: '減量', value: 'cut' },
  { label: '維持', value: 'maintain' },
  { label: '増量', value: 'bulk' },
];

export default function GoalsScreen() {
  const router = useRouter();
  const user = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [phase, setPhase] = useState<Phase>('cut');
  const [targetWeight, setTargetWeight] = useState('');
  const [targetCal, setTargetCal] = useState('');

  useEffect(() => {
    const run = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setPhase(profile.phase);
          setTargetWeight(String(profile.targetWeight));
          setTargetCal(String(profile.targetCal));
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [user?.uid]);

  const canSubmit = useMemo(() => {
    const w = Number(targetWeight);
    const c = Number(targetCal);
    return Number.isFinite(w) && w > 0 && Number.isFinite(c) && c > 0;
  }, [targetWeight, targetCal]);

  const handleSave = async () => {
    if (!user) {
      Alert.alert('エラー', 'ログインが必要です。');
      return;
    }
    if (!canSubmit) {
      Alert.alert('入力確認', '目標体重(kg)と目標カロリー(kcal)を入力してください。');
      return;
    }
    setSaving(true);
    try {
      const current = await getUserProfile(user.uid);
      await setUserProfile(user.uid, {
        phase,
        targetWeight: Number(targetWeight),
        targetCal: Number(targetCal),
        isDetailedTrackingEnabled: current?.isDetailedTrackingEnabled ?? false,
      });
      Alert.alert('完了', '目標を更新しました。', [{ text: 'OK', onPress: () => router.back() }]);
    } catch {
      Alert.alert('エラー', '保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={shared.container}>
      <View style={shared.modalHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Target color="#2ecc71" size={20} />
          <Text style={shared.modalTitle}>目標設定</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={{ padding: 20, flex: 1 }}>
          {loading ? (
            <ActivityIndicator color="#2ecc71" size="large" style={{ marginTop: 50 }} />
          ) : (
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
                placeholder="例: 2000"
                placeholderTextColor="#444"
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={[
                  shared.loginButton,
                  {
                    marginTop: 10,
                    opacity: canSubmit && !saving ? 1 : 0.5,
                    flexDirection: 'row',
                  },
                ]}
                onPress={handleSave}
                disabled={!canSubmit || saving}
              >
                {saving ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Check color="#000" size={20} style={{ marginRight: 8 }} />
                    <Text style={shared.loginButtonText}>保存する</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const local = StyleSheet.create({
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
});

