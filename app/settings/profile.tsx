import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Alert, SafeAreaView, Text, TouchableOpacity, View, TextInput, ActivityIndicator } from 'react-native';
import { ChevronLeft, Check } from 'lucide-react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { styles } from '../../theme/styles';

export default function ProfileEditScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) setUsername(docSnap.data().username || '');
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
    if (!user || !username.trim()) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        username: username,
        updatedAt: new Date(),
      }, { merge: true });
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

      <View style={{ padding: 20 }}>
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
            
            <TouchableOpacity 
              style={[styles.loginButton, { marginTop: 20, flexDirection: 'row' }]} 
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
      </View>
    </SafeAreaView>
  );
}