import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Check } from 'lucide-react-native';
import { deleteField, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { styles } from '../../theme/styles';

function isValidBirthDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return false;
  const [y, m, d] = s.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return false;
  const now = new Date();
  if (dt > now) return false;
  const min = new Date();
  min.setFullYear(now.getFullYear() - 120);
  if (dt < min) return false;
  return true;
}

export default function ProfileEditScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUsername((data.username as string) || '');
          if (typeof data.heightCm === 'number' && data.heightCm > 0) {
            setHeightCm(String(data.heightCm));
          }
          if (typeof data.birthDate === 'string') {
            setBirthDate(data.birthDate);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user || !username.trim()) {
      Alert.alert('確認', 'ユーザーネームを入力してください');
      return;
    }

    const heightTrim = heightCm.trim();
    let heightPayload: Record<string, unknown> = {};
    if (heightTrim.length === 0) {
      heightPayload = { heightCm: deleteField() };
    } else {
      const h = Number(heightTrim.replace(',', '.'));
      if (!Number.isFinite(h) || h < 80 || h > 250) {
        Alert.alert('確認', '身長は 80〜250 cm の数値で入力するか、空にしてください');
        return;
      }
      heightPayload = { heightCm: Math.round(h * 10) / 10 };
    }

    const birthTrim = birthDate.trim();
    let birthPayload: Record<string, unknown> = {};
    if (birthTrim.length === 0) {
      birthPayload = { birthDate: deleteField() };
    } else {
      if (!isValidBirthDate(birthTrim)) {
        Alert.alert('確認', '生年月日は YYYY-MM-DD 形式で、有効な過去の日付にしてください');
        return;
      }
      birthPayload = { birthDate: birthTrim };
    }

    setSaving(true);
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          username: username.trim(),
          ...heightPayload,
          ...birthPayload,
          updatedAt: new Date(),
        },
        { merge: true },
      );
      Alert.alert('完了', 'プロフィールを更新しました', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert('エラー', '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>プロフィール編集</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {loading ? (
            <ActivityIndicator color="#2ecc71" size="large" style={{ marginTop: 50 }} />
          ) : (
            <>
              <Text style={{ color: '#888', marginBottom: 8, fontSize: 12 }}>ユーザーネーム</Text>
              <TextInput
                style={styles.inputField}
                value={username}
                onChangeText={setUsername}
                placeholder="名前を入力"
                placeholderTextColor="#444"
              />

              <Text style={{ color: '#888', marginBottom: 8, fontSize: 12, marginTop: 16 }}>身長 (cm)</Text>
              <TextInput
                style={styles.inputField}
                value={heightCm}
                onChangeText={setHeightCm}
                placeholder="例: 172（未入力でクリア）"
                placeholderTextColor="#444"
                keyboardType="decimal-pad"
              />

              <Text style={{ color: '#888', marginBottom: 8, fontSize: 12, marginTop: 16 }}>生年月日</Text>
              <TextInput
                style={styles.inputField}
                value={birthDate}
                onChangeText={setBirthDate}
                placeholder="YYYY-MM-DD（例: 1995-04-12・未入力でクリア）"
                placeholderTextColor="#444"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={{ color: '#555', fontSize: 11, marginTop: 6, lineHeight: 16 }}>
                AIアドバイス・食事のAI推定の参考に使います（任意）。医学的診断ではありません。
              </Text>

              <TouchableOpacity
                style={[styles.loginButton, { marginTop: 24, flexDirection: 'row' }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <>
                    <Check color="#000" size={20} style={{ marginRight: 8 }} />
                    <Text style={styles.loginButtonText}>保存する</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
