import React from 'react';
import { Text, View } from 'react-native';

import { styles } from '../../theme/styles';

export default function DummyScreen() {
  return (
    <View style={styles.centered}>
      <Text style={{ color: '#fff' }}>準備中</Text>
    </View>
  );
}

