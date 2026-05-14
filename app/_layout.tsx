import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, DeviceEventEmitter } from 'react-native'; // ★ DeviceEventEmitterを追加
import { Redirect, Stack, useSegments } from 'expo-router';

import { useAuthState } from '../hooks/useAuthState';
import { getUserProfile, hasCompletedBasicProfile } from '../utils/firestoreProfile';

export default function RootLayout() {
  const { user, initializing } = useAuthState();
  const segmentList = useSegments() as string[];
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [needsBasicProfile, setNeedsBasicProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!user) {
        setOnboardingChecked(false);
        setNeedsOnboarding(false);
        setNeedsBasicProfile(false);
        return;
      }

      setOnboardingChecked(false);
      try {
        const [profile, basicProfileCompleted] = await Promise.all([
          getUserProfile(user.uid),
          hasCompletedBasicProfile(user.uid),
        ]);
        if (!cancelled) {
          setNeedsOnboarding(!profile);
          setNeedsBasicProfile(!basicProfileCompleted);
        }
      } catch {
        if (!cancelled) {
          setNeedsOnboarding(true);
          setNeedsBasicProfile(true);
        }
      } finally {
        if (!cancelled) {
          setOnboardingChecked(true);
        }
      }
    };

    run();

    // ★ 追加：他の画面から「reloadLayoutCheck」という電報が来たら、もう一度 run() を実行して再確認する！
    const subscription = DeviceEventEmitter.addListener('reloadLayoutCheck', run);

    return () => {
      cancelled = true;
      subscription.remove(); // ★ クリーンアップを忘れずに
    };
  }, [user]);

  const rootSegment = segmentList[0];
  const childSegment = segmentList[1];
  const inAuthGroup = rootSegment === '(auth)';
  const inLogin = inAuthGroup && childSegment === 'login';
  const inVerify = inAuthGroup && childSegment === 'verify';
  const inOnboarding = inAuthGroup && childSegment === 'onboarding';
  const inSettings = rootSegment === 'settings';
  const inProfile = inSettings && childSegment === 'profile';

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a' }}>
        <ActivityIndicator color="#2ecc71" />
      </View>
    );
  }

  if (!user) {
    if (!inLogin) return <Redirect href="/login" />;
  } else if (!user.emailVerified) {
    if (!inVerify) return <Redirect href="/verify" />;
  } else {
    if (!onboardingChecked) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a' }}>
          <ActivityIndicator color="#2ecc71" />
        </View>
      );
    }

    if (needsBasicProfile) {
      if (!inProfile) return <Redirect href="/settings/profile?required=1" />;
    } else if (needsOnboarding) {
      if (!inOnboarding) return <Redirect href="/onboarding" />;
    } else if (inAuthGroup) {
      return <Redirect href="/home" />;
    }
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="settings"
        options={{
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}