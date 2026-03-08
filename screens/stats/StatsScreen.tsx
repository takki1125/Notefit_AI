import React from 'react';
import { Dimensions, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';

import { styles } from '../../theme/styles';
import { useWorkoutStats } from '../../hooks/useWorkoutStats';

export default function StatsScreen() {
  const screenWidth = Dimensions.get('window').width;
  const { weeklyData, bodyPartData } = useWorkoutStats();

  const chartConfig = {
    backgroundGradientFrom: '#1a1a1a',
    backgroundGradientTo: '#1a1a1a',
    color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>Statistics</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text
          style={{
            color: '#fff',
            fontSize: 18,
            fontWeight: 'bold',
            marginBottom: 10,
          }}
        >
          直近4週間のワークアウト回数
        </Text>
        <LineChart
          data={{
            labels: ['3週前', '2週前', '1週前', '今週'],
            datasets: [{ data: weeklyData }],
          }}
          width={screenWidth - 40}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={{ borderRadius: 16, marginBottom: 30 }}
        />

        <Text
          style={{
            color: '#fff',
            fontSize: 18,
            fontWeight: 'bold',
            marginBottom: 10,
          }}
        >
          部位別セット数 (今月)
        </Text>
        <BarChart
          data={{
            labels: ['胸', '背中', '脚', '肩', '腕'],
            datasets: [{ data: bodyPartData }],
          }}
          width={screenWidth - 40}
          height={220}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={chartConfig}
          style={{ borderRadius: 16 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

