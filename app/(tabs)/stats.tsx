import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { Flame, Activity } from 'lucide-react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';

import { auth, db } from '../../firebaseConfig';
import { styles } from '../../theme/styles';

const screenWidth = Dimensions.get("window").width;

export default function StatsTabScreen() {
  const [loading, setLoading] = useState(true);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [recentFoods, setRecentFoods] = useState<any[]>([]);

  const [parts, setParts] = useState<string[]>([]);
  const [selectedPart, setSelectedPart] = useState<string>("");
  const [rmProgress, setRmProgress] = useState<{ labels: string[], values: number[] }>({ labels: [], values: [] });

  const fetchStatsData = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      const masterSnapshot = await getDocs(collection(db, "master_data"));
      const partLabels = masterSnapshot.docs.map(d => d.data().label || d.id);
      setParts(partLabels);

      const currentTargetPart = selectedPart || partLabels[0];
      if (!selectedPart && partLabels.length > 0) {
        setSelectedPart(partLabels[0]);
      }

      const wQuery = query(collection(db, "users", user.uid, "workouts"), orderBy("date", "asc"));
      const wSnapshot = await getDocs(wQuery);
      setWorkoutCount(wSnapshot.size);

      const progressLabels: string[] = [];
      const progressValues: number[] = [];

      wSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const dObj = data.date ? data.date.toDate() : new Date();
        const dateStr = `${dObj.getMonth() + 1}/${dObj.getDate()}`;

        let maxRmForThisDay = 0;

        if (data.exercises) {
          data.exercises.forEach((ex: any) => {
            if (ex.category === currentTargetPart) {
              ex.sets.forEach((set: any) => {
                if (set.done && set.weight && set.reps) {
                  const weight = parseFloat(set.weight);
                  const reps = parseInt(set.reps);
                  const estimatedRM = weight * (1 + reps / 30);
                  if (estimatedRM > maxRmForThisDay) {
                    maxRmForThisDay = Math.round(estimatedRM);
                  }
                }
              });
            }
          });
        }

        if (maxRmForThisDay > 0) {
          progressLabels.push(dateStr);
          progressValues.push(maxRmForThisDay);
        }
      });

      setRmProgress({
        labels: progressLabels.slice(-7),
        values: progressValues.slice(-7)
      });

      const fQuery = query(collection(db, "users", user.uid, "food_logs"), orderBy("date", "desc"), limit(5));
      const fSnapshot = await getDocs(fQuery);
      setRecentFoods(fSnapshot.docs.map(d => {
        const data = d.data();
        const dObj = data.date ? data.date.toDate() : new Date();
        return { totalCal: data.totalCal, dateStr: `${dObj.getMonth() + 1}/${dObj.getDate()}` };
      }).reverse());

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedPart]);

  useFocusEffect(useCallback(() => { fetchStatsData(); }, [fetchStatsData]));

  const chartConfig = {
    backgroundColor: "#1a1a1a",
    backgroundGradientFrom: "#1a1a1a",
    backgroundGradientTo: "#1a1a1a",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(79, 172, 254, ${opacity})`,
    labelColor: () => "#888",
    propsForDots: { r: "5", strokeWidth: "2", stroke: "#4facfe" }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 1. ヘッダー：線を復活させたぜ */}
      <View style={styles.headerRow}>
        <View style={styles.headerContent}>
          <Text style={styles.headerLabel}>Analytics</Text>
        </View>
      </View>

      {/* メインのスクロールエリア */}
      <ScrollView contentContainerStyle={{ paddingVertical: 20 }}>
        
        {/* 2. カテゴリー選択：ScrollViewの中に移動したので、一緒にスクロールされるぜ */}
        <View style={{ marginBottom: 20 }}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {parts.map((part) => (
              <TouchableOpacity
                key={part}
                onPress={() => setSelectedPart(part)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: selectedPart === part ? '#2ecc71' : '#2a2a2a',
                  marginRight: 10,
                  justifyContent: 'center',
                  height: 40
                }}
              >
                <Text style={{ color: selectedPart === part ? '#000' : '#888', fontWeight: 'bold' }}>{part}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#2ecc71" style={{ marginTop: 50 }} />
        ) : (
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>
              {selectedPart} の推定1RM推移
            </Text>
            <View style={{ backgroundColor: '#1a1a1a', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginBottom: 25, minHeight: 200, justifyContent: 'center' }}>
              {rmProgress.values.length > 1 ? (
                <LineChart
                  data={{ labels: rmProgress.labels, datasets: [{ data: rmProgress.values }] }}
                  width={screenWidth - 40}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  style={{ borderRadius: 16 }}
                />
              ) : rmProgress.values.length === 1 ? (
                <BarChart
                  data={{ labels: rmProgress.labels, datasets: [{ data: rmProgress.values }] }}
                  width={screenWidth - 40}
                  height={220}
                  chartConfig={chartConfig}
                  yAxisLabel=""
                  yAxisSuffix="kg"
                  fromZero
                  showValuesOnTopOfBars
                  style={{ borderRadius: 16 }}
                />
              ) : (
                <Text style={{ color: '#666' }}>まだ記録がありません</Text>
              )}
            </View>

            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>摂取カロリー推移</Text>
            <View style={{ backgroundColor: '#1a1a1a', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginBottom: 25, minHeight: 180, justifyContent: 'center' }}>
              {recentFoods.length > 1 ? (
                <LineChart
                  data={{ labels: recentFoods.map(f => f.dateStr), datasets: [{ data: recentFoods.map(f => f.totalCal) }] }}
                  width={screenWidth - 40}
                  height={180}
                  chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})` }}
                  bezier
                  style={{ borderRadius: 16 }}
                />
              ) : recentFoods.length === 1 ? (
                <BarChart
                  data={{ labels: recentFoods.map(f => f.dateStr), datasets: [{ data: recentFoods.map(f => f.totalCal) }] }}
                  width={screenWidth - 40}
                  height={180}
                  chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})` }}
                  yAxisLabel=""
                  yAxisSuffix="kcal"
                  fromZero
                  showValuesOnTopOfBars
                  style={{ borderRadius: 16 }}
                />
              ) : (
                <Text style={{ color: '#666' }}>食事データを入力してください</Text>
              )}
            </View>

            <View style={{ backgroundColor: '#2a2a2a', padding: 20, borderRadius: 16, marginBottom: 25, flexDirection: 'row', alignItems: 'center' }}>
              <Activity color="#2ecc71" size={32} style={{ marginRight: 15 }} />
              <View>
                <Text style={{ color: '#888', fontSize: 12 }}>TOTAL WORKOUTS</Text>
                <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{workoutCount} 回</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}