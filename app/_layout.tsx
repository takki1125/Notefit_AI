import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
// ★ Slot を Stack に変更！
import { Stack, useRouter, useSegments } from 'expo-router'; 
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthState } from '../hooks/useAuthState';

export default function RootLayout() {
  const { user, initializing } = useAuthState();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isLoggedIn = !!user;
    const isVerified = !!user?.emailVerified;

    if (!isLoggedIn && !inAuthGroup) {
      router.replace('/(auth)/login');
      return;
    }

    if (isLoggedIn && !isVerified) {
      const inVerify = inAuthGroup && segments[1] === 'verify';
      if (!inVerify) {
        router.replace('/(auth)/verify');
      }
      return;
    }

    if (isLoggedIn && isVerified && inAuthGroup) {
      router.replace('/(tabs)/home');
    }
  }, [user, initializing, segments, router]);

  if (initializing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#2ecc71" />
      </SafeAreaView>
    );
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