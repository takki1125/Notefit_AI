import React from 'react';
import { View, Text } from 'react-native';

export default function IndexScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>
        Notefit AI (Expo Router migration in progress)
      </Text>
    </View>
  );
}

