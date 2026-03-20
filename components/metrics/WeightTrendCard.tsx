import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart, BarChart } from 'react-native-chart-kit';

import { auth } from '../../firebaseConfig';
import { styles } from '../../theme/styles';
import type { DailyMetric } from '../../utils/models';
import { getDailyMetricsLastNDays } from '../../utils/firestoreDailyMetrics';

const screenWidth = Dimensions.get('window').width;

function formatMMDD(dateId: string) {
  // YYYY-MM-DD -> MM/DD
  const mm = dateId.slice(5, 7);
  const dd = dateId.slice(8, 10);
  if (!mm || !dd) return dateId;
  return `${mm}/${dd}`;
}

export default function WeightTrendCard({ days = 14 }: { days?: number }) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);

  useFocusEffect(
    useCallback(() => {
      const run = async () => {
        const user = auth.currentUser;
        if (!user) {
          setMetrics([]);
          setLoading(false);
          return;
        }

        setLoading(true);
        try {
          const ms = await getDailyMetricsLastNDays(user.uid, days);
          setMetrics(ms);
        } catch {
          setMetrics([]);
        } finally {
          setLoading(false);
        }
      };
      run();
    }, [days]),
  );

  const chartData = useMemo(() => {
    const labels = metrics.map((m) => formatMMDD(m.date));
    const values = metrics.map((m) => m.weight);
    return { labels, values };
  }, [metrics]);

  const chartConfig = useMemo(
    () => ({
      backgroundColor: '#1a1a1a',
      backgroundGradientFrom: '#1a1a1a',
      backgroundGradientTo: '#1a1a1a',
      decimalPlaces: 1,
      color: (opacity = 1) => `rgba(79, 172, 254, ${opacity})`,
      labelColor: () => '#888',
      propsForDots: { r: '4', strokeWidth: '2', stroke: '#4facfe' },
    }),
    [],
  );

  return (
    <View style={styles.card}>
      <View style={local.headerRow}>
        <Text style={local.title}>体重推移</Text>
        <Text style={local.subtitle}>
          {loading ? '読み込み中…' : `${chartData.values.length}件`}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#2ecc71" />
      ) : chartData.values.length === 0 ? (
        <Text style={local.muted}>体重を記録するとグラフに表示されます</Text>
      ) : (
        <View style={local.chartWrap}>
          {chartData.values.length > 1 ? (
            <LineChart
              data={{ labels: chartData.labels, datasets: [{ data: chartData.values }] }}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={local.chart}
            />
          ) : (
            <BarChart
              data={{ labels: chartData.labels, datasets: [{ data: chartData.values }] }}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              yAxisLabel=""
              yAxisSuffix="kg"
              fromZero
              showValuesOnTopOfBars
              style={local.chart}
            />
          )}
        </View>
      )}
    </View>
  );
}

const local = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  title: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  subtitle: { color: '#888', fontSize: 12 },
  muted: { color: '#666', fontSize: 12, lineHeight: 18 },
  chartWrap: { backgroundColor: '#1a1a1a', borderRadius: 16, paddingVertical: 10, overflow: 'hidden' },
  chart: { borderRadius: 16 },
});

