import React, { useState } from 'react';
import { Alert, ActivityIndicator, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { Mail } from 'lucide-react-native';

import { auth } from '../../firebaseConfig';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { styles } from '../../theme/styles';

type VerificationScreenProps = {
  onCheckVerified: () => Promise<void> | void;
};

export default function VerificationScreen({ onCheckVerified }: VerificationScreenProps) {
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    setLoading(true);
    try {
      await auth.currentUser?.reload();
      if (auth.currentUser?.emailVerified) {
        Alert.alert('確認成功', '本人確認が完了しました！');
        await onCheckVerified();
      } else {
        Alert.alert('未完了', 'まだ確認が取れていません。\nメール内のリンクをクリックしましたか？');
      }
    } catch {
      Alert.alert('エラー', '情報の更新に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      if (!auth.currentUser) return;
      await sendEmailVerification(auth.currentUser);
      Alert.alert('送信成功', '確認メールを再送しました。');
    } catch (e: any) {
      if (e.code === 'auth/too-many-requests') {
        Alert.alert('エラー', '送信回数が多すぎます。少し時間を空けてください。');
      } else {
        Alert.alert('エラー', 'メールの送信に失敗しました。');
      }
    }
  };

  return (
    <SafeAreaView style={styles.loginContainer}>
      <View style={[styles.loginBox, { alignItems: 'center', paddingVertical: 40 }]}>
        <Mail color="#2ecc71" size={60} style={{ marginBottom: 20 }} />
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 15 }}>メールを確認してください</Text>

        <Text style={{ color: '#ccc', textAlign: 'center', marginBottom: 30, lineHeight: 24 }}>
          <Text style={{ color: '#2ecc71', fontWeight: 'bold' }}>{auth.currentUser?.email}</Text>
          {'\n'}
          宛に確認メールを送信しました。{'\n'}
          メール内のリンクをクリックしてから、{'\n'}下のボタンを押してください。
        </Text>

        <TouchableOpacity style={[styles.loginButton, { width: '100%' }]} onPress={handleCheck} disabled={loading}>
          {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.loginButtonText}>確認完了ボタン</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={{ marginTop: 25, padding: 10 }} onPress={handleResend}>
          <Text style={{ color: '#2ecc71', textDecorationLine: 'underline' }}>メールが届かない場合は再送</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ marginTop: 20, padding: 10 }} onPress={() => signOut(auth)}>
          <Text style={{ color: '#ff4444' }}>別のアカウントでやり直す</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

