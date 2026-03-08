import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { User } from 'firebase/auth';

import LoginScreen from '../screens/auth/LoginScreen';
import VerificationScreen from '../screens/auth/VerificationScreen';
import MainTabNavigator from './MainTabNavigator';

type RootNavigatorProps = {
  user: User | null;
  forceRefreshUser: () => Promise<void>;
};

const Stack = createStackNavigator();

export default function RootNavigator({ user, forceRefreshUser }: RootNavigatorProps) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : !user.emailVerified ? (
        <Stack.Screen name="Verify">
          {() => <VerificationScreen onCheckVerified={forceRefreshUser} />}
        </Stack.Screen>
      ) : (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      )}
    </Stack.Navigator>
  );
}

