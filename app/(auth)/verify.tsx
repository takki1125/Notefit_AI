import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, RefreshCw, LogOut } from 'lucide-react-native';
import { sendEmailVerification, signOut } from 'firebase/auth';

import { auth, emailVerificationActionCodeSettings } from '../../firebaseConfig';
import { useAuthState } from '../../hooks/useAuthState';
import { router } from 'expo-router';

const VerificationScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { forceRefreshUser } = useAuthState();

  const handleCheck = async () => {
    setLoading(true);
    try {
      await auth.currentUser?.reload();
      const updatedUser = auth.currentUser;

      if (updatedUser?.emailVerified) {
        // Firebaseの認証状態を強制リフレッシュ
        await updatedUser.getIdToken(true); 

        Alert.alert('確認成功', '本人確認が完了しました！', [
          {
            text: 'OK',
            onPress: async () => {
              // 状態を最新に更新して、初期設定画面へ強制移動！
              await forceRefreshUser(); 
              router.replace('/onboarding'); 
            }
          }
        ]);
      } else {
        Alert.alert(
          '未完了',
          'まだ確認が取れていません。\nメール内のリンクをクリックしましたか？',
        );
      }
    } catch (e) {
      console.error(e);
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
      await sendEmailVerification(auth.currentUser, emailVerificationActionCodeSettings);
      Alert.alert('送信成功', '確認メールを再送しました。');
    } catch (e: any) {
      if (e.code === 'auth/too-many-requests') {
        Alert.alert('エラー', '送信回数が多すぎます。少し時間を空けてください。');
      } else {
        Alert.alert('エラー', 'メールの送信に失敗しました。');
      }
    }
  };

  const handleUseDifferentAccount = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      router.replace('/login');
    } catch {
      Alert.alert('エラー', 'ログアウトに失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroGlow} />
        <View style={styles.card}>
          <View style={styles.iconRing}>
            <Mail color="#2ecc71" size={32} strokeWidth={2} />
          </View>
          <Text style={styles.kicker}>あとひとステップ</Text>
          <Text style={styles.title}>メール内のリンクを開いてください</Text>

          <View style={styles.emailPill}>
            <Text style={styles.emailPillLabel}>送信先</Text>
            <Text style={styles.emailText} numberOfLines={2}>
              {auth.currentUser?.email ?? '—'}
            </Text>
          </View>

          <Text style={styles.description}>
            上記のアドレス宛に確認メールを送りました。メールのリンクをタップしたあと、この画面に戻って「確認を完了する」を押してください。
          </Text>

          <View style={styles.steps}>
            <Text style={styles.stepsTitle}>手順</Text>
            <View style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>1</Text>
              </View>
              <Text style={styles.stepBody}>メールアプリで受信トレイを確認</Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>2</Text>
              </View>
              <Text style={styles.stepBody}>「メールアドレスを確認」リンクをタップ</Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>3</Text>
              </View>
              <Text style={styles.stepBody}>ブラウザで完了後、アプリに戻る</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCheck}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#0a0a0a" />
            ) : (
              <Text style={styles.primaryButtonText}>確認を完了する</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleResend}
            activeOpacity={0.8}
          >
            <RefreshCw color="#2ecc71" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.secondaryButtonText}>確認メールを再送する</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tertiaryButton}
            onPress={handleUseDifferentAccount}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LogOut color="#ff6b6b" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.tertiaryButtonText}>別のアカウントでやり直す</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#121512',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    justifyContent: 'center',
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    alignSelf: 'center',
    width: 280,
    height: 200,
    borderRadius: 140,
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
    opacity: 0.9,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: '#1a1f1c',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(46, 204, 113, 0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 12,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(46, 204, 113, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  kicker: {
    color: '#2ecc71',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: '#f2f6f3',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 30,
  },
  emailPill: {
    backgroundColor: '#0d100e',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 18,
  },
  emailPillLabel: {
    color: '#7a8a82',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  emailText: {
    color: '#7bed9f',
    fontWeight: '600',
    fontSize: 15,
  },
  description: {
    color: '#a8b5ae',
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 23,
    fontSize: 14,
  },
  steps: {
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  stepsTitle: {
    color: '#8a9a92',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    color: '#2ecc71',
    fontSize: 13,
    fontWeight: '700',
  },
  stepBody: {
    flex: 1,
    color: '#dce5df',
    fontSize: 14,
    lineHeight: 21,
    paddingTop: 1,
  },
  primaryButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#2ecc71',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#0a0a0a',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(46, 204, 113, 0.45)',
    backgroundColor: 'rgba(46, 204, 113, 0.06)',
    marginBottom: 10,
  },
  secondaryButtonText: {
    color: '#2ecc71',
    fontSize: 15,
    fontWeight: '600',
  },
  tertiaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  tertiaryButtonText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default VerificationScreen;

