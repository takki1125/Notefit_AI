import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
// ★ Slot を Stack に変更！
import { Redirect, Stack, useSegments } from 'expo-router'; 
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthState } from '../hooks/useAuthState';
import { getUserProfile } from '../utils/firestoreProfile';

export default function RootLayout() {
  const { user, initializing } = useAuthState();
  const segments = useSegments();
  const [profileChecked, setProfileChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (initializing) return;

    const isVerified = !!user?.emailVerified;

    // 認証済みなら、オンボーディング（目標設定）が必要かチェック
    const checkProfile = async () => {
      // 未ログイン/未認証の時は、プロフィールチェック不要（点滅防止のため "checked" 扱いにする）
      if (!user || !isVerified) {
        setNeedsOnboarding(false);
        setProfileChecked(true);
        return;
      }

      setProfileChecked(false);
      try {
        const profile = await getUserProfile(user.uid);
        setNeedsOnboarding(!profile);
      } catch {
        // 取得失敗時は無限リダイレクトを避けるため、ひとまずオンボーディング不要扱い
        setNeedsOnboarding(false);
      } finally {
        setProfileChecked(true);
      }
    };
    checkProfile();
  }, [user?.uid, user?.emailVerified, initializing]);

  if (initializing || (!!user?.emailVerified && !profileChecked)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#2ecc71" />
      </SafeAreaView>
    );
  }

  const inAuthGroup = segments[0] === '(auth)';
  const authScreen = segments[1]; // login / verify / onboarding

  const isLoggedIn = !!user;
  const isVerified = !!user?.emailVerified;

  // URLにはグループ名は出ない（/login, /home など）
  if (!isLoggedIn) {
    if (!inAuthGroup || authScreen !== 'login') return <Redirect href="/login" />;
  } else if (!isVerified) {
    if (!inAuthGroup || authScreen !== 'verify') return <Redirect href="/verify" />;
  } else if (needsOnboarding) {
    if (!inAuthGroup || authScreen !== 'onboarding') return <Redirect href="/onboarding" />;
  } else {
    // 認証済み＆オンボーディング完了なら、auth配下にいる時だけ home へ戻す
    if (inAuthGroup) return <Redirect href="/home" />;
  }

  // initializeのチェックが終わった後の、一番下の return 部分
  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="(tabs)" />
  <Stack.Screen name="(auth)" />
  
  {/* ★ settings フォルダ全体を一つのモーダルとして定義する */}
  <Stack.Screen 
    name="settings" 
    options={{ 
      presentation: 'modal', 
    }} 
  />
</Stack>
    </View>
  );
} // ここでファイルが終わり