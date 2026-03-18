<<<<<<< Updated upstream
// app/(auth)/_layout.tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="verify" />
        </Stack>
    );
}
=======
import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}

>>>>>>> Stashed changes
