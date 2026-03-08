import React from 'react';
import { View, Text } from 'react-native';

const FoodTabScreen: React.FC = () => {
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
        食事記録（準備中）
      </Text>
    </View>
  );
};

export default FoodTabScreen;

