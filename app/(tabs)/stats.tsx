import React from 'react';
import { View, Text } from 'react-native';

const StatsTabScreen: React.FC = () => {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>
        Stats（既存 StatsScreen の移行予定）
      </Text>
    </View>
  );
};

export default StatsTabScreen;

