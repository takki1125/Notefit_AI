import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect, Stack, useSegments } from 'expo-router';

import { useAuthState } from '../hooks/useAuthState';
import { getUserProfile } from '../utils/firestoreProfile';

export default function RootLayout() {
  const { user, initializing } = useAuthState();
  const segmentList = useSegments() as string[];
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!user) {
        setOnboardingChecked(false);
        setNeedsOnboarding(false);
        return;
      }

      setOnboardingChecked(false);
      try {
        const profile = await getUserProfile(user.uid);
        if (!cancelled) {
          setNeedsOnboarding(!profile);
        }
      } catch {
        if (!cancelled) {
          setNeedsOnboarding(true);
        }
      } finally {
        if (!cancelled) {
          setOnboardingChecked(true);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const rootSegment = segmentList[0];
  const childSegment = segmentList[1];
  const inAuthGroup = rootSegment === '(auth)';
  const inVerify = inAuthGroup && childSegment === 'verify';
  const inOnboarding = inAuthGroup && childSegment === 'onboarding';

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a1a' }}>
        <ActivityIndicator color="#2ecc71" />
      </View>
    );
  }

  if (!user) {
    if (!inAuthGroup) return <Redirect href="/login" />;
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

    if (needsOnboarding) {
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
