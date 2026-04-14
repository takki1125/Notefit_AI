import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Modal,
  FlatList,
  TouchableWithoutFeedback
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { Flame, Activity, ChevronDown, Check } from 'lucide-react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import AsyncStorage from "@react-native-async-storage/async-storage";

import { auth, db } from '../../firebaseConfig';
import { styles } from '../../theme/styles';
import GoalProgressCard from '../../components/goal/GoalProgressCard';
import WeightTrendCard from '../../components/metrics/WeightTrendCard';

// ★追加：Copilotのインポート
import { CopilotProvider, CopilotStep, walkthroughable, useCopilot } from "react-native-copilot";

const screenWidth = Dimensions.get("window").width;

// ★追加：ラップ用コンポーネントの定義
const WalkthroughableView = walkthroughable(View);

// ★変更：関数名を StatsTabContent に変更（一番下でProviderでラップするため）
function StatsTabContent() {
  const [loading, setLoading] = useState(true);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [recentFoods, setRecentFoods] = useState<any[]>([]);

  // --- 部位グラフ用のState ---
  const [parts, setParts] = useState<string[]>([]);
  const [selectedPart, setSelectedPart] = useState<string>("");
  const [partProgress, setPartProgress] = useState<{ labels: string[], values: number[] }>({ labels: [], values: [] });

  // --- 種目グラフ用のState ---
  const [exercises, setExercises] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [exerciseProgress, setExerciseProgress] = useState<{ labels: string[], values: number[] }>({ labels: [], values: [] });
  const [isDropdownVisible, setDropdownVisible] = useState(false);

  // ★追加：CopilotのHooksとタイマー管理
  const { start, copilotEvents } = useCopilot();
  const startTutorialRef = useRef(start);
  startTutorialRef.current = start;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const checkTutorial = async () => {
        const user = auth.currentUser;
        if (!user) return;
        try {
          const hasSeen = await AsyncStorage.getItem(`@tutorial_stats_${user.uid}`);
          if (!hasSeen && !cancelled) {
            timer = setTimeout(() => {
              if (!cancelled) void startTutorialRef.current();
            }, 500);
          }
        } catch (e) {}
      };
      checkTutorial();

      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      };
    }, [])
  );

  useEffect(() => {
    const onStop = async () => {
      const user = auth.currentUser;
      if (user) {
        await AsyncStorage.setItem(`@tutorial_stats_${user.uid}`, "true");
      }
    };
    copilotEvents.on("stop", onStop);
    return () => {
      copilotEvents.off("stop", onStop);
    };
  }, [copilotEvents]);

  const fetchStatsData = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      // 1. マスターデータ（部位）の取得
      const masterSnapshot = await getDocs(collection(db, "master_data"));
      const partLabels = masterSnapshot.docs.map(d => d.data().label || d.id);
      setParts(partLabels);
      if (!selectedPart && partLabels.length > 0) setSelectedPart(partLabels[0]);

      const currentTargetPart = selectedPart || partLabels[0];

      // 2. トレーニング履歴の取得
      const wQuery = query(collection(db, "users", user.uid, "workouts"), orderBy("date", "asc"));
      const wSnapshot = await getDocs(wQuery);
      setWorkoutCount(wSnapshot.size);

      // --- 部位用＆種目用のデータ集計用ハコ ---
      const partLabelsArr: string[] = [];
      const partValuesArr: number[] = [];
      const exLabelsArr: string[] = [];
      const exValuesArr: number[] = [];
      
      const uniqueExercises = new Set<string>();

      wSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const dObj = data.date ? data.date.toDate() : new Date();
        const dateStr = `${dObj.getMonth() + 1}/${dObj.getDate()}`;

        let maxPartRmForThisDay = 0;
        let maxExRmForThisDay = 0;

        if (data.exercises) {
          data.exercises.forEach((ex: any) => {
            if (ex.name) uniqueExercises.add(ex.name);

            // 部位グラフの集計
            if (ex.category === currentTargetPart) {
              (ex.sets ?? []).forEach((set: any) => {
                if (set.done && set.weight && set.reps) {
                  const estimatedRM = parseFloat(set.weight) * (1 + parseInt(set.reps) / 30);
                  if (estimatedRM > maxPartRmForThisDay) maxPartRmForThisDay = Math.round(estimatedRM);
                }
              });
            }

            // 種目グラフの集計
            if (ex.name === selectedExercise) {
              (ex.sets ?? []).forEach((set: any) => {
                if (set.done && set.weight && set.reps) {
                  const estimatedRM = parseFloat(set.weight) * (1 + parseInt(set.reps) / 30);
                  if (estimatedRM > maxExRmForThisDay) maxExRmForThisDay = Math.round(estimatedRM);
                }
              });
            }
          });
        }

        if (maxPartRmForThisDay > 0) {
          partLabelsArr.push(dateStr);
          partValuesArr.push(maxPartRmForThisDay);
        }
        if (maxExRmForThisDay > 0) {
          exLabelsArr.push(dateStr);
          exValuesArr.push(maxExRmForThisDay);
        }
      });

      setPartProgress({ labels: partLabelsArr.slice(-7), values: partValuesArr.slice(-7) });
      setExerciseProgress({ labels: exLabelsArr.slice(-7), values: exValuesArr.slice(-7) });

      // 種目一覧をStateにセット
      const exList = Array.from(uniqueExercises);
      setExercises(exList);
      if (!selectedExercise && exList.length > 0) setSelectedExercise(exList[0]);

      // 3. 食事データの取得
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
  }, [selectedPart, selectedExercise]);

  useFocusEffect(useCallback(() => { fetchStatsData(); }, [fetchStatsData]));

  const chartConfig = {
    backgroundColor: "#1a1a1a",
    backgroundGradientFrom: "#1a1a1a",
    backgroundGradientTo: "#1a1a1a",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(79, 172, 254, ${opacity})`,
    labelColor: () => "#888",
    propsForDots: { r: "4", strokeWidth: "2", stroke: "#4facfe" }
  };

  const chartConfigPink = {
    ...chartConfig,
    color: (opacity = 1) => `rgba(255, 71, 87, ${opacity})`,
    propsForDots: { r: "4", strokeWidth: "2", stroke: "#ff4757" }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      
      {/* ★STEP 1: ヘッダーを光らせて画面全体を説明 */}
      <CopilotStep
        text="ここでは過去のトレーニングや体重、食事の記録を振り返ることができます。日々の成長をチェックしましょう！"
        order={1}
        name="statsIntro"
      >
        <WalkthroughableView style={styles.headerRow}>
          <View style={styles.headerContent}>
            <Text style={styles.headerLabel}>Analytics</Text>
          </View>
        </WalkthroughableView>
      </CopilotStep>

      <ScrollView 
        contentContainerStyle={{ paddingVertical: 20 }}
        // {...scrollViewProps}
      >
        
        {loading ? (
          <ActivityIndicator size="large" color="#2ecc71" style={{ marginTop: 50 }} />
        ) : (
          <View style={{ paddingHorizontal: 20 }}>
            <GoalProgressCard />
            <WeightTrendCard />

            <View style={{ marginBottom: 15 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {parts.map((part) => (
                  <TouchableOpacity
                    key={part}
                    onPress={() => setSelectedPart(part)}
                    style={{
                      paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                      backgroundColor: selectedPart === part ? '#2ecc71' : '#2a2a2a',
                      marginRight: 10, justifyContent: 'center', height: 40
                    }}
                  >
                    <Text style={{ color: selectedPart === part ? '#000' : '#888', fontWeight: 'bold' }}>{part}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
              {selectedPart} の推定1RM推移
            </Text>
            <View style={{ backgroundColor: '#1a1a1a', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginBottom: 35, minHeight: 200, justifyContent: 'center' }}>
              {partProgress.values.length > 1 ? (
                <LineChart data={{ labels: partProgress.labels, datasets: [{ data: partProgress.values }] }} width={screenWidth - 40} height={220} chartConfig={chartConfig} bezier style={{ borderRadius: 16 }} />
              ) : partProgress.values.length === 1 ? (
                <BarChart data={{ labels: partProgress.labels, datasets: [{ data: partProgress.values }] }} width={screenWidth - 40} height={220} chartConfig={chartConfig} yAxisLabel="" yAxisSuffix="kg" fromZero showValuesOnTopOfBars style={{ borderRadius: 16 }} />
              ) : (
                <Text style={{ color: '#666' }}>まだ記録がありません</Text>
              )}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>種目別の成長記録</Text>
              
              <TouchableOpacity 
                onPress={() => setDropdownVisible(true)}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', marginRight: 5 }}>
                  {selectedExercise ? (selectedExercise.length > 8 ? selectedExercise.substring(0, 8) + '...' : selectedExercise) : "種目を選択"}
                </Text>
                <ChevronDown color="#fff" size={16} />
              </TouchableOpacity>
            </View>

            <View style={{ backgroundColor: '#1a1a1a', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginBottom: 35, minHeight: 200, justifyContent: 'center', borderWidth: 1, borderColor: '#333' }}>
              {exerciseProgress.values.length > 1 ? (
                <LineChart data={{ labels: exerciseProgress.labels, datasets: [{ data: exerciseProgress.values }] }} width={screenWidth - 40} height={220} chartConfig={chartConfigPink} bezier style={{ borderRadius: 16 }} />
              ) : exerciseProgress.values.length === 1 ? (
                <BarChart data={{ labels: exerciseProgress.labels, datasets: [{ data: exerciseProgress.values }] }} width={screenWidth - 40} height={220} chartConfig={chartConfigPink} yAxisLabel="" yAxisSuffix="kg" fromZero showValuesOnTopOfBars style={{ borderRadius: 16 }} />
              ) : (
                <Text style={{ color: '#666' }}>まだ記録がありません</Text>
              )}
            </View>

            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>摂取カロリー推移</Text>
            <View style={{ backgroundColor: '#1a1a1a', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginBottom: 25, minHeight: 180, justifyContent: 'center' }}>
              {recentFoods.length > 1 ? (
                <LineChart data={{ labels: recentFoods.map(f => f.dateStr), datasets: [{ data: recentFoods.map(f => f.totalCal) }] }} width={screenWidth - 40} height={180} chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})` }} bezier style={{ borderRadius: 16 }} />
              ) : recentFoods.length === 1 ? (
                <BarChart data={{ labels: recentFoods.map(f => f.dateStr), datasets: [{ data: recentFoods.map(f => f.totalCal) }] }} width={screenWidth - 40} height={180} chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})` }} yAxisLabel="" yAxisSuffix="kcal" fromZero showValuesOnTopOfBars style={{ borderRadius: 16 }} />
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

      {/* ドロップダウンメニューのモーダル */}
      <Modal visible={isDropdownVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableWithoutFeedback>
              <View style={{ backgroundColor: '#2a2a2a', width: '80%', maxHeight: '60%', borderRadius: 16, overflow: 'hidden' }}>
                <View style={{ padding: 15, borderBottomWidth: 1, borderColor: '#444', alignItems: 'center' }}>
                  <Text style={{ color: '#888', fontSize: 12 }}>グラフを見たい種目を選択</Text>
                </View>
                <FlatList
                  data={exercises}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedExercise(item);
                        setDropdownVisible(false);
                      }}
                      style={{
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        padding: 16, borderBottomWidth: 1, borderColor: '#333'
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: selectedExercise === item ? 'bold' : 'normal' }}>
                        {item}
                      </Text>
                      {selectedExercise === item && <Check color="#2ecc71" size={20} />}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </SafeAreaView>
  );
}

// ★追加：チュートリアル全体をプロバイダーで包む
export default function StatsTabScreen() {
  return (
    <CopilotProvider
      stopOnOutsideClick={true}
      androidStatusBarVisible={true}
      tooltipStyle={{ backgroundColor: "#ffffff", borderRadius: 12, margin: 16 }}
      stepNumberComponent={() => null}
      labels={{ skip: "スキップ", previous: "前へ", next: "次へ", finish: "OK" }}
    >
      <StatsTabContent />
    </CopilotProvider>
  );
}