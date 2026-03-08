import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Linking,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword } from 'firebase/auth';

import { auth } from '../../firebaseConfig';
import { styles } from '../../theme/styles';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
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
        const user = userCredential.user;
        await sendEmailVerification(user);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      let errorMessage = 'エラーが発生しました。';
      if (error.code === 'auth/email-already-in-use') errorMessage = 'このメールアドレスは既に使われています。';
      if (error.code === 'auth/invalid-email') errorMessage = 'メールアドレスの形式が正しくありません。';
      if (error.code === 'auth/user-not-found') errorMessage = 'ユーザーが見つかりません。';
      if (error.code === 'auth/wrong-password') errorMessage = 'パスワードが間違っています。';
      if (error.code === 'auth/weak-password') errorMessage = 'パスワードは6文字以上で設定してください。';
      Alert.alert('エラー', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const openTerms = () => {
    Linking.openURL('https://takki1125.github.io/Notefit-AI-docs/');
    setTermsOpened(true);
  };

  const handleCheckboxPress = () => {
    if (!termsOpened) {
      Alert.alert('確認', 'チェックを入れる前に、利用規約のリンクをタップして内容を確認してください。');
      return;
    }
    setAgreed(!agreed);
  };

  return (
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
        <TextInput
          style={styles.inputField}
          placeholder="パスワード (6文字以上)"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

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

        <TouchableOpacity style={styles.loginButton} onPress={handleAuthAction} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.loginButtonText}>{isSignUp ? '新規登録' : 'ログイン'}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={{ marginTop: 20 }}>
          <Text style={styles.switchText}>
            {isSignUp
              ? 'すでにアカウントをお持ちの方はこちら（ログイン）'
              : 'アカウントをお持ちでない方はこちら（新規登録）'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

