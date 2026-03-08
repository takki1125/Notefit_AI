import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Mail } from 'lucide-react-native';
import { sendEmailVerification, signOut } from 'firebase/auth';

import { auth } from '../../firebaseConfig';
import { useAuthState } from '../../hooks/useAuthState';

const VerificationScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { forceRefreshUser } = useAuthState();

  const handleCheck = async () => {
    setLoading(true);
    try {
      await auth.currentUser?.reload();
      if (auth.currentUser?.emailVerified) {
        Alert.alert('確認成功', '本人確認が完了しました！');
        await forceRefreshUser();
      } else {
        Alert.alert(
          '未完了',
          'まだ確認が取れていません。\nメール内のリンクをクリックしましたか？',
        );
      }
    } catch (e) {
      Alert.alert('エラー', '情報の更新に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      if (!auth.currentUser) {
        Alert.alert('エラー', 'ログイン状態が無効です。再度ログインしてください。');
        return;
      }
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
        <Text style={styles.title}>メールを確認してください</Text>

        <Text style={styles.description}>
          <Text style={styles.emailText}>{auth.currentUser?.email}</Text>
          {'\n'}
          宛に確認メールを送信しました。{'\n'}
          メール内のリンクをクリックしてから、{'\n'}
          下のボタンを押してください。
        </Text>

        <TouchableOpacity
          style={[styles.loginButton, { width: '100%' }]}
          onPress={handleCheck}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.loginButtonText}>確認完了ボタン</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={{ marginTop: 25, padding: 10 }} onPress={handleResend}>
          <Text style={styles.resendText}>メールが届かない場合は再送</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ marginTop: 20, padding: 10 }}
          onPress={() => signOut(auth)}
        >
          <Text style={styles.logoutText}>別のアカウントでやり直す</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loginContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginBox: {
    width: '100%',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  description: {
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  emailText: {
    color: '#2ecc71',
    fontWeight: 'bold',
  },
  loginButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#2ecc71',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resendText: {
    color: '#2ecc71',
    textDecorationLine: 'underline',
  },
  logoutText: {
    color: '#ff4444',
  },
});

export default VerificationScreen;

