import React, { useState } from 'react';
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
import { Check, Eye, EyeOff } from 'lucide-react-native';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from 'firebase/auth';

import { PrivacyPolicyModal } from '../../components/legal/PrivacyPolicyModal';
import { auth, emailVerificationActionCodeSettings } from '../../firebaseConfig';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [termsOpened, setTermsOpened] = useState(false);

  const handleAuthAction = async () => {
    if (isSignUp && !agreed) {
      Alert.alert('確認', '利用規約への同意が必要です。');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user, emailVerificationActionCodeSettings);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        if (!user.emailVerified) {
          await signOut(auth);
          Alert.alert(
            'メール確認が未完了です',
            '登録時にお送りしたメールのリンクをタップして、本登録を完了してください。'
          );
          return;
        }
      }
    } catch (error: any) {
      let errorMessage = 'エラーが発生しました。';
      if (error.code === 'auth/email-already-in-use') errorMessage = 'このメールアドレスは既に使われています。';
      if (error.code === 'auth/invalid-email') errorMessage = 'メールアドレスの形式が正しくありません。';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') errorMessage = 'メールアドレスかパスワードが間違っています。';
      if (error.code === 'auth/wrong-password') errorMessage = 'メールアドレスかパスワードが間違っています。';
      if (error.code === 'auth/weak-password') errorMessage = 'パスワードは6文字以上で設定してください。';
      Alert.alert('エラー', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      Alert.alert('確認', 'パスワードを再設定するには、上の欄にメールアドレスを入力してからこのボタンを押してください。');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        'メール送信完了', 
        'パスワード再設定用のメールを送信しました。メール内のリンクから新しいパスワードを設定してください。'
      );
    } catch (error: any) {
      let errorMessage = 'エラーが発生しました。';
      if (error.code === 'auth/invalid-email') errorMessage = 'メールアドレスの形式が正しくありません。';
      if (error.code === 'auth/user-not-found') errorMessage = 'このメールアドレスは登録されていません。';
      Alert.alert('エラー', errorMessage);
    }
  };

  const openTerms = () => {
    setTermsModalVisible(true);
    setTermsOpened(true);
  };

  const handleCheckboxPress = () => {
    if (!termsOpened) {
      Alert.alert(
        '確認',
        'チェックを入れる前に、利用規約のリンクをタップして内容を確認してください。',
      );
      return;
    }
    setAgreed(!agreed);
  };

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.loginContainer}
      >
        <View style={styles.loginBox}>
          <Text style={styles.loginTitle}>{isSignUp ? 'アカウント作成' : 'ログイン'}</Text>

          <TextInput
            style={styles.inputField}
            placeholder="メールアドレス"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          
          {/* ★ ここを統合: パスワード入力＋目玉アイコン */}
          <View style={styles.passwordFieldContainer}>
            <TextInput
              style={styles.passwordInputField}
              placeholder="パスワード (6文字以上)"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(prev => !prev)}
              style={styles.passwordToggleButton}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
            >
              {showPassword ? <EyeOff size={20} color="#aaa" /> : <Eye size={20} color="#aaa" />}
            </TouchableOpacity>
          </View>

          {isSignUp && (
            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={[
                  styles.checkbox,
                  agreed && styles.checkboxChecked,
                  !termsOpened && { opacity: 0.5, borderColor: '#444' },
                ]}
                onPress={handleCheckboxPress}
              >
                {agreed && <Check size={14} color="#000" />}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.termsText}>
                  <Text style={styles.linkText} onPress={openTerms}>
                    利用規約
                  </Text>
                  に同意する
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleAuthAction}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.loginButtonText}>
                {isSignUp ? '新規登録' : 'ログイン'}
              </Text>
            )}
          </TouchableOpacity>

          {!isSignUp && (
            <TouchableOpacity onPress={handlePasswordReset} style={{ marginTop: 15 }}>
              <Text style={{ color: '#888', fontSize: 13, textDecorationLine: 'underline' }}>
                パスワードを忘れた・変更したい方はこちら
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={{ marginTop: 20 }}>
            <Text style={styles.switchText}>
              {isSignUp
                ? 'すでにアカウントをお持ちの方はこちら（ログイン）'
                : 'アカウントをお持ちでない方はこちら（新規登録）'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <PrivacyPolicyModal
        visible={termsModalVisible}
        onClose={() => setTermsModalVisible(false)}
      />
    </>
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
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
  },
  loginTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  inputField: {
    width: '100%',
    height: 50,
    backgroundColor: '#111',
    borderRadius: 10,
    paddingHorizontal: 15,
    color: '#fff',
    marginBottom: 15,
  },
  passwordFieldContainer: {
    width: '100%',
    height: 50,
    backgroundColor: '#111',
    borderRadius: 10,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInputField: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 15,
    color: '#fff',
  },
  passwordToggleButton: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
  switchText: {
    color: '#2ecc71',
    fontSize: 14,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#666',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2ecc71',
    borderColor: '#2ecc71',
  },
  termsText: {
    color: '#ccc',
    fontSize: 14,
  },
  linkText: {
    color: '#2ecc71',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;