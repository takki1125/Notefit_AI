import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
      <StatusBar style="light" />
      <Slot />
    </SafeAreaView>
  );
}

