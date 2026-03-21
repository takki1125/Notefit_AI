import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { auth } from '../../firebaseConfig';
import { styles } from '../../theme/styles';
import {
  AI_COACH_STYLE_LABELS,
  AI_CUSTOM_INSTRUCTIONS_MAX_LEN,
  AI_TONE_LABELS,
} from '../../utils/aiCoachSettings';
import type { AiCoachSettings, AiCoachStylePreset, AiTonePreset } from '../../utils/models';
import { DEFAULT_AI_COACH_SETTINGS } from '../../utils/models';
import { getAiCoachSettings, setAiCoachSettings } from '../../utils/firestoreProfile';

const COACH_ORDER: AiCoachStylePreset[] = ['gentle', 'balanced', 'spartan', 'facts'];
const TONE_ORDER: AiTonePreset[] = ['polite', 'neutral', 'friendly', 'casual'];

export default function AiCoachSettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<AiCoachSettings>({ ...DEFAULT_AI_COACH_SETTINGS });

  const load = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    try {
      const s = await getAiCoachSettings(user.uid);
      setDraft(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = async (next: AiCoachSettings, message?: string) => {
    const user = auth.currentUser;
    if (!user) return;
    setSaving(true);
    try {
      await setAiCoachSettings(user.uid, next);
      setDraft(next);
      Alert.alert(
        '完了',
        message ??
          'ホームのAIアドバイスは、次に再生成されるときから反映されます。',
      );
    } catch {
      Alert.alert('エラー', '保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  const onSave = () => void persist(draft);

  const onReset = () => {
    Alert.alert(
      'デフォルトに戻す',
      'コーチスタイル・口調・追加メモを初期状態（バランス／標準／空）に戻します。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '戻す',
          style: 'destructive',
          onPress: () =>
            void persist(
              { ...DEFAULT_AI_COACH_SETTINGS },
              '初期状態に戻しました。ホームのAIアドバイスは、次に再生成されるときから反映されます。',
            ),
        },
      ],
    );
  };

  const chip = (selected: boolean) => ({
    borderWidth: 2,
    borderColor: selected ? '#2ecc71' : '#333',
    backgroundColor: selected ? 'rgba(46, 204, 113, 0.12)' : '#262626',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>AIコーチのスタイル</Text>
        <TouchableOpacity onPress={() => router.back()} disabled={saving}>
          <X color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}>
          <Text style={[styles.routineDescText, { lineHeight: 20, marginBottom: 16 }]}>
            ホームの「今日のアドバイス」の言い回しを調整できます。保存後、記録が変わらなくても次回表示時に新しいトーンで再生成されます。
          </Text>

          {loading ? (
            <ActivityIndicator color="#2ecc71" style={{ marginTop: 24 }} />
          ) : (
            <>
              <Text style={[styles.sectionHeaderText, { marginBottom: 10 }]}>コーチのスタイル</Text>
              {COACH_ORDER.map((key) => {
                const meta = AI_COACH_STYLE_LABELS[key];
                const selected = draft.coachStyle === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={chip(selected)}
                    onPress={() => setDraft((d) => ({ ...d, coachStyle: key }))}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.routineNameText}>{meta.title}</Text>
                    <Text style={[styles.routineDescText, { marginTop: 4 }]}>{meta.desc}</Text>
                  </TouchableOpacity>
                );
              })}

              <Text style={[styles.sectionHeaderText, { marginTop: 20, marginBottom: 10 }]}>口調</Text>
              {TONE_ORDER.map((key) => {
                const meta = AI_TONE_LABELS[key];
                const selected = draft.tone === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={chip(selected)}
                    onPress={() => setDraft((d) => ({ ...d, tone: key }))}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.routineNameText}>{meta.title}</Text>
                    <Text style={[styles.routineDescText, { marginTop: 4 }]}>{meta.desc}</Text>
                  </TouchableOpacity>
                );
              })}

              <Text style={[styles.sectionHeaderText, { marginTop: 20, marginBottom: 10 }]}>
                追加の希望（任意）
              </Text>
              <Text style={[styles.routineDescText, { marginBottom: 8 }]}>
                例：「専門用語は少なめ」「肩の話題は避けて」など。{AI_CUSTOM_INSTRUCTIONS_MAX_LEN}文字まで。
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#262626',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#333',
                  color: '#fff',
                  padding: 14,
                  minHeight: 100,
                  textAlignVertical: 'top',
                  fontSize: 15,
                }}
                placeholder="自由に入力..."
                placeholderTextColor="#666"
                multiline
                maxLength={AI_CUSTOM_INSTRUCTIONS_MAX_LEN}
                value={draft.customInstructions}
                onChangeText={(t) => setDraft((d) => ({ ...d, customInstructions: t }))}
                editable={!saving}
              />
              <Text style={{ color: '#666', fontSize: 12, marginTop: 6, textAlign: 'right' }}>
                {draft.customInstructions.length}/{AI_CUSTOM_INSTRUCTIONS_MAX_LEN}
              </Text>

              <TouchableOpacity
                style={{
                  marginTop: 24,
                  backgroundColor: '#2ecc71',
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: 'center',
                  opacity: saving ? 0.7 : 1,
                }}
                onPress={onSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={{ color: '#000', fontSize: 16, fontWeight: 'bold' }}>保存</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={{ marginTop: 14, paddingVertical: 12, alignItems: 'center' }}
                onPress={onReset}
                disabled={saving}
              >
                <Text style={{ color: '#888', fontSize: 15 }}>デフォルトに戻す</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
