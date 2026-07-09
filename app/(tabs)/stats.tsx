import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Modal,
  SectionList,
  TouchableWithoutFeedback,
  FlatList,
  Image
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

const screenWidth = Dimensions.get("window").width;

type CustomExerciseRow = {
  id: string;
  name: string;
  categoryLabel: string;
};

type ExercisePickerOption = {
  name: string;
  category: string;
  isCustom: boolean;
};

type PartTab = {
  label: string;
  shortLabel: string;
  subLabel: string;
};

function shortPartLabel(full: string): string {
  const ja = full.split("(")[0].trim();
  return ja || full;
}

function partSubLabel(full: string): string {
  const m = full.match(/\(([^)]+)\)/);
  return m?.[1]?.trim() ?? "";
}

const PART_GRID_GAP = 10;
const H_PAD = 20;

// --- スライドチュートリアル用コンポーネント ---
const STATS_SLIDES = [
  {
    id: '1',
    title: '成長を振り返る',
    description: '過去のトレーニングや体重、食事の記録を振り返り、日々の成長を実感しましょう。',
    image: require('../../assets/images/tutorial/slide_stats1.png'),
  },
  {
    id: '2',
    title: '部位・種目ごとの分析',
    description: '部位ごとに推定1RMの推移を見たり、特定の種目の成長グラフを確認できます。',
    image: require('../../assets/images/tutorial/slide_stats2.png'),
  }
];

const SlideTutorialModal: React.FC<{ visible: boolean; onFinish: () => void }> = ({ visible, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;
  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (currentIndex < STATS_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      onFinish();
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(26, 26, 26, 0.95)' }}>
        <SafeAreaView style={{ flex: 1 }}>
          <TouchableOpacity onPress={onFinish} style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, padding: 15 }}>
            <Text style={{ color: '#aaa', fontSize: 16 }}>スキップ</Text>
          </TouchableOpacity>
          
          <FlatList
            ref={flatListRef}
            data={STATS_SLIDES}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewConfig}
            renderItem={({ item }: { item: any }) => (
              <View style={{ width: screenWidth, flex: 1 }}>
                <ScrollView 
                  contentContainerStyle={{ alignItems: 'center', padding: 20, paddingBottom: 50 }}
                  showsVerticalScrollIndicator={false}
                >
                  {/* ▼ 指定通りのサイズ（0.7 と 1.3）に変更！ */}
                  <View style={{ width: screenWidth * 0.7, height: screenWidth * 1.3, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 30, overflow: 'hidden' }}>
                    {item.image ? (
                      <Image source={item.image} style={{ width: '100%', height: '100%', borderRadius: 20 }} resizeMode="contain" />
                    ) : (
                      <Text style={{ color: '#666' }}>画像がありません</Text>
                    )}
                  </View>
                  <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }}>{item.title}</Text>
                  <Text style={{ color: '#aaa', fontSize: 16, textAlign: 'center', lineHeight: 24, paddingHorizontal: 10 }}>{item.description}</Text>
                </ScrollView>
              </View>
            )}
          />
          <View style={{ padding: 20, paddingBottom: 40, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', marginBottom: 30 }}>
              {STATS_SLIDES.map((_, index) => (
                <View key={index} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: currentIndex === index ? '#2ecc71' : '#555', marginHorizontal: 4, ...(currentIndex === index && { width: 24 }) }} />
              ))}
            </View>
            <TouchableOpacity onPress={handleNext} style={{ backgroundColor: '#2ecc71', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, width: '90%', alignItems: 'center' }}>
              <Text style={{ color: '#000', fontSize: 18, fontWeight: 'bold' }}>
                {currentIndex === STATS_SLIDES.length - 1 ? 'はじめる' : '次へ'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};
// --- チュートリアルコンポーネントここまで ---

function StatsTabContent() {
  const [loading, setLoading] = useState(true);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [recentFoods, setRecentFoods] = useState<any[]>([]);

  // --- 部位グラフ用のState ---
  const [partTabs, setPartTabs] = useState<PartTab[]>([]);
  const [selectedPart, setSelectedPart] = useState<string>("");
  const [partProgress, setPartProgress] = useState<{ labels: string[], values: number[] }>({ labels: [], values: [] });

  // --- 種目グラフ用のState ---
  const [exerciseOptions, setExerciseOptions] = useState<ExercisePickerOption[]>([]);
  const [customExercises, setCustomExercises] = useState<CustomExerciseRow[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [exerciseProgress, setExerciseProgress] = useState<{ labels: string[], values: number[] }>({ labels: [], values: [] });
  const [isDropdownVisible, setDropdownVisible] = useState(false);

  const [exerciseUnit, setExerciseUnit] = useState<string>("kg");

  // スライドチュートリアル用ステート
  const [showSlideTutorial, setShowSlideTutorial] = useState(false);

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
              if (!cancelled) setShowSlideTutorial(true);
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

  const handleFinishTutorial = async () => {
    setShowSlideTutorial(false);
    const user = auth.currentUser;
    if (user) {
      await AsyncStorage.setItem(`@tutorial_stats_${user.uid}`, "true");
    }
  };

  const fetchStatsData = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      const masterSnapshot = await getDocs(collection(db, "master_data"));
      const tabs: PartTab[] = masterSnapshot.docs.map((d) => {
        const label = (d.data().label as string) || d.id;
        return {
          label,
          shortLabel: shortPartLabel(label),
          subLabel: partSubLabel(label),
        };
      });
      setPartTabs(tabs);
      if (!selectedPart && tabs.length > 0) setSelectedPart(tabs[0].label);

      const currentTargetPart = selectedPart || tabs[0]?.label || "";

      const [wSnapshot, customSnap] = await Promise.all([
        getDocs(query(collection(db, "users", user.uid, "workouts"), orderBy("date", "asc"))),
        getDocs(collection(db, "users", user.uid, "custom_exercises")),
      ]);
      setWorkoutCount(wSnapshot.size);

      const customRows: CustomExerciseRow[] = customSnap.docs
        .map((d) => {
          const x = d.data() as { name?: string; categoryLabel?: string };
          const name = typeof x.name === "string" ? x.name.trim() : "";
          if (!name) return null;
          return {
            id: d.id,
            name,
            categoryLabel: typeof x.categoryLabel === "string" ? x.categoryLabel : "",
          };
        })
        .filter((row): row is CustomExerciseRow => row !== null);
      setCustomExercises(customRows);

      const partLabelsArr: string[] = [];
      const partValuesArr: number[] = [];
      const exLabelsArr: string[] = [];
      const exValuesArr: number[] = [];
      
      const uniqueExercises = new Map<string, string>();

      wSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const dObj = data.date ? data.date.toDate() : new Date();
        const dateStr = `${dObj.getMonth() + 1}/${dObj.getDate()}`;

        let maxPartRmForThisDay = 0;
        let maxExRmForThisDay = 0;

        if (data.exercises) {
          data.exercises.forEach((ex: any) => {
            if (ex.name) uniqueExercises.set(ex.name, ex.category || "他");
            
            const isCardio = (ex.category || "").includes("有酸素");

            if (ex.category === currentTargetPart && !isCardio) {
              (ex.sets ?? []).forEach((set: any) => {
                if (set.done && set.weight && set.reps) {
                  const estimatedRM = parseFloat(set.weight) * (1 + parseInt(set.reps) / 30);
                  if (estimatedRM > maxPartRmForThisDay) maxPartRmForThisDay = Math.round(estimatedRM);
                }
              });
            }

            if (ex.name === selectedExercise) {
              (ex.sets ?? []).forEach((set: any) => {
                if (set.done) {
                  if (isCardio) {
                    const dist = parseFloat(set.distanceKm || "0");
                    const mins = parseFloat(set.durationMinutes || "0");
                    const val = dist > 0 ? dist : mins; 
                    if (val > maxExRmForThisDay) maxExRmForThisDay = val;
                  } else {
                    if (set.weight && set.reps) {
                      const estimatedRM = parseFloat(set.weight) * (1 + parseInt(set.reps) / 30);
                      if (estimatedRM > maxExRmForThisDay) maxExRmForThisDay = Math.round(estimatedRM);
                    }
                  }
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

      const customNameSet = new Set(customRows.map((c) => c.name));
      const optionMap = new Map<string, ExercisePickerOption>();

      uniqueExercises.forEach((cat, name) => {
        optionMap.set(name, {
          name,
          category: cat,
          isCustom: customNameSet.has(name),
        });
      });
      customRows.forEach((c) => {
        optionMap.set(c.name, {
          name: c.name,
          category: c.categoryLabel || "他",
          isCustom: true,
        });
      });

      const exOptions = Array.from(optionMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name, "ja"),
      );
      setExerciseOptions(exOptions);

      const activeEx = selectedExercise;
      if (activeEx) {
        const cat = optionMap.get(activeEx)?.category || uniqueExercises.get(activeEx) || "";
        if (cat.includes("有酸素")) {
          setExerciseUnit("km/分");
        } else {
          setExerciseUnit("kg");
        }
      }

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

  const customsForPart = useMemo(
    () => customExercises.filter((c) => c.categoryLabel === selectedPart),
    [customExercises, selectedPart],
  );

  const exercisesForPart = useMemo(
    () => exerciseOptions.filter((o) => o.category === selectedPart),
    [exerciseOptions, selectedPart],
  );

  const exercisePickerSections = useMemo(() => {
    const byPart = new Map<string, ExercisePickerOption[]>();
    exerciseOptions.forEach((o) => {
      const key = o.category || "その他";
      if (!byPart.has(key)) byPart.set(key, []);
      byPart.get(key)!.push(o);
    });
    return partTabs
      .map((p) => ({
        title: p.shortLabel,
        fullTitle: p.label,
        data: byPart.get(p.label) ?? [],
      }))
      .filter((s) => s.data.length > 0);
  }, [exerciseOptions, partTabs]);

  const selectedPartShort = shortPartLabel(selectedPart);
  const partCardWidth = (screenWidth - H_PAD * 2 - PART_GRID_GAP) / 2;

  useEffect(() => {
    if (!selectedPart) return;
    if (exercisesForPart.length === 0) {
      if (selectedExercise) setSelectedExercise("");
      return;
    }
    const valid = exercisesForPart.some((o) => o.name === selectedExercise);
    if (!valid) setSelectedExercise(exercisesForPart[0].name);
  }, [selectedPart, exercisesForPart]);

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
    <View style={[styles.container, { flex: 1 }]}>
      
      <View style={styles.headerRow}>
        <View style={styles.headerContent}>
          <Text style={styles.headerLabel}>Analytics</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingVertical: 20 }}
      >
        
        {loading ? (
          <ActivityIndicator size="large" color="#2ecc71" style={{ marginTop: 50 }} />
        ) : (
          <View style={{ paddingHorizontal: 20 }}>
            <GoalProgressCard />
            <WeightTrendCard />

            <Text style={{ color: '#888', fontSize: 12, fontWeight: '600', marginBottom: 10, letterSpacing: 0.5 }}>
              部位を選ぶ
            </Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                marginBottom: 20,
                marginHorizontal: -PART_GRID_GAP / 2,
              }}
            >
              {partTabs.map((part) => {
                const active = selectedPart === part.label;
                return (
                  <TouchableOpacity
                    key={part.label}
                    onPress={() => setSelectedPart(part.label)}
                    style={{
                      width: partCardWidth,
                      marginHorizontal: PART_GRID_GAP / 2,
                      marginBottom: PART_GRID_GAP,
                      paddingVertical: 14,
                      paddingHorizontal: 12,
                      borderRadius: 14,
                      backgroundColor: active ? '#2ecc71' : '#2a2a2a',
                      borderWidth: 1,
                      borderColor: active ? '#2ecc71' : '#3a3a3a',
                    }}
                  >
                    <Text
                      style={{
                        color: active ? '#000' : '#fff',
                        fontSize: 17,
                        fontWeight: 'bold',
                      }}
                    >
                      {part.shortLabel}
                    </Text>
                    {part.subLabel ? (
                      <Text
                        style={{
                          color: active ? 'rgba(0,0,0,0.55)' : '#666',
                          fontSize: 11,
                          marginTop: 4,
                        }}
                      >
                        {part.subLabel}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View
              style={{
                backgroundColor: '#242424',
                borderRadius: 16,
                padding: 16,
                marginBottom: 24,
                borderWidth: 1,
                borderColor: '#333',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: 'bold', marginBottom: 4 }}>
                {selectedPartShort}の推定1RM推移
              </Text>
              <Text style={{ color: '#666', fontSize: 12, marginBottom: 14 }}>
                この部位で完了チェック(✅)を付けたセットの最高記録
              </Text>
              <View
                style={{
                  backgroundColor: '#1a1a1a',
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: 'center',
                  minHeight: 200,
                  justifyContent: 'center',
                }}
              >
                {partProgress.values.length > 1 ? (
                  <LineChart
                    data={{ labels: partProgress.labels, datasets: [{ data: partProgress.values }] }}
                    width={screenWidth - H_PAD * 2 - 32}
                    height={220}
                    chartConfig={chartConfig}
                    bezier
                    style={{ borderRadius: 12 }}
                  />
                ) : partProgress.values.length === 1 ? (
                  <BarChart
                    data={{ labels: partProgress.labels, datasets: [{ data: partProgress.values }] }}
                    width={screenWidth - H_PAD * 2 - 32}
                    height={220}
                    chartConfig={chartConfig}
                    yAxisLabel=""
                    yAxisSuffix="kg"
                    fromZero
                    showValuesOnTopOfBars
                    style={{ borderRadius: 12 }}
                  />
                ) : (
                  <Text style={{ color: '#666', textAlign: 'center', paddingHorizontal: 16, lineHeight: 20 }}>
                    {selectedPartShort}の完了済みセットがまだありません
                  </Text>
                )}
              </View>

              {customsForPart.length > 0 ? (
                <View style={{ marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#333' }}>
                  <Text style={{ color: '#888', fontSize: 12, marginBottom: 10 }}>
                    {selectedPartShort}に登録したマイ種目
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {customsForPart.map((item) => {
                      const active = selectedExercise === item.name;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => setSelectedExercise(item.name)}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 20,
                            backgroundColor: active ? 'rgba(46, 204, 113, 0.2)' : '#1a1a1a',
                            borderWidth: 1,
                            borderColor: active ? '#2ecc71' : '#444',
                            maxWidth: '100%',
                          }}
                        >
                          <Text
                            style={{
                              color: active ? '#2ecc71' : '#fff',
                              fontSize: 14,
                              fontWeight: active ? 'bold' : '500',
                            }}
                            numberOfLines={2}
                          >
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: 'bold', marginBottom: 4 }}>
                種目別の成長記録
              </Text>
              <Text style={{ color: '#666', fontSize: 12, marginBottom: 12 }}>
                {selectedPartShort}の種目を選んで推移を確認
              </Text>

              {exercisesForPart.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 4, gap: 8 }}
                >
                  {exercisesForPart.map((item) => {
                    const active = selectedExercise === item.name;
                    return (
                      <TouchableOpacity
                        key={item.name}
                        onPress={() => setSelectedExercise(item.name)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 20,
                          backgroundColor: active ? '#ff4757' : '#2a2a2a',
                          borderWidth: 1,
                          borderColor: active ? '#ff4757' : '#444',
                          marginRight: 8,
                          maxWidth: 200,
                        }}
                      >
                        <Text
                          style={{
                            color: '#fff',
                            fontSize: 14,
                            fontWeight: active ? 'bold' : '500',
                          }}
                          numberOfLines={2}
                        >
                          {item.name}
                        </Text>
                        {item.isCustom ? (
                          <Text style={{ color: active ? 'rgba(255,255,255,0.75)' : '#888', fontSize: 10, marginTop: 3 }}>
                            マイ種目
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : (
                <Text style={{ color: '#666', fontSize: 13, lineHeight: 20 }}>
                  {selectedPartShort}の種目がまだありません。トレ画面で記録するか、マイ種目を追加してください。
                </Text>
              )}

              {exercisePickerSections.length > 1 ? (
                <TouchableOpacity
                  onPress={() => setDropdownVisible(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    alignSelf: 'flex-start',
                    marginTop: 10,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ color: '#4facfe', fontSize: 13, fontWeight: '600', marginRight: 4 }}>
                    他の部位の種目を見る
                  </Text>
                  <ChevronDown color="#4facfe" size={16} />
                </TouchableOpacity>
              ) : null}
            </View>

            {selectedExercise ? (
              <Text
                style={{
                  color: '#ff4757',
                  fontSize: 15,
                  fontWeight: 'bold',
                  marginBottom: 10,
                }}
                numberOfLines={2}
              >
                {selectedExercise}
                {exerciseUnit !== 'kg' ? `（${exerciseUnit}）` : '（推定1RM）'}
              </Text>
            ) : null}

            <View style={{ backgroundColor: '#1a1a1a', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginBottom: 35, minHeight: 200, justifyContent: 'center', borderWidth: 1, borderColor: '#333' }}>
              {exerciseProgress.values.length > 1 ? (
                <LineChart data={{ labels: exerciseProgress.labels, datasets: [{ data: exerciseProgress.values }] }} width={screenWidth - 40} height={220} chartConfig={chartConfigPink} yAxisSuffix={exerciseUnit === "kg" ? "" : ` ${exerciseUnit}`} bezier style={{ borderRadius: 16 }} />
              ) : exerciseProgress.values.length === 1 ? (
                <BarChart data={{ labels: exerciseProgress.labels, datasets: [{ data: exerciseProgress.values }] }} width={screenWidth - 40} height={220} chartConfig={chartConfigPink} yAxisLabel="" yAxisSuffix={exerciseUnit} fromZero showValuesOnTopOfBars style={{ borderRadius: 16 }} />
              ) : (
                <Text style={{ color: '#666' }}>完了チェック(✅)を付けた記録がありません</Text>
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

      <Modal visible={isDropdownVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableWithoutFeedback>
              <View style={{ backgroundColor: '#2a2a2a', width: '88%', maxHeight: '70%', borderRadius: 16, overflow: 'hidden' }}>
                <View style={{ padding: 16, borderBottomWidth: 1, borderColor: '#444' }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>
                    種目を選択
                  </Text>
                  <Text style={{ color: '#888', fontSize: 12, textAlign: 'center', marginTop: 6 }}>
                    部位ごとに表示しています
                  </Text>
                </View>
                <SectionList
                  sections={exercisePickerSections}
                  keyExtractor={(item) => item.name}
                  stickySectionHeadersEnabled
                  ListEmptyComponent={
                    <Text style={{ color: '#666', textAlign: 'center', padding: 24, lineHeight: 20 }}>
                      トレーニングで記録した種目、またはトレ画面で登録したマイ種目がここに表示されます
                    </Text>
                  }
                  renderSectionHeader={({ section }) => (
                    <View style={{ backgroundColor: '#333', paddingHorizontal: 16, paddingVertical: 8 }}>
                      <Text style={{ color: '#2ecc71', fontSize: 13, fontWeight: 'bold' }}>{section.title}</Text>
                    </View>
                  )}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedPart(item.category);
                        setSelectedExercise(item.name);
                        setDropdownVisible(false);
                      }}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 16,
                        borderBottomWidth: 1,
                        borderColor: '#333',
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text
                          style={{
                            color: '#fff',
                            fontSize: 16,
                            fontWeight: selectedExercise === item.name ? 'bold' : 'normal',
                          }}
                        >
                          {item.name}
                        </Text>
                        {item.isCustom ? (
                          <Text style={{ color: '#888', fontSize: 11, marginTop: 4 }}>マイ種目</Text>
                        ) : null}
                      </View>
                      {selectedExercise === item.name && <Check color="#2ecc71" size={20} />}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* スライドチュートリアル */}
      <SlideTutorialModal 
        visible={showSlideTutorial} 
        onFinish={handleFinishTutorial} 
      />
    </View>
  );
}

export default function StatsTabScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatsTabContent />
    </SafeAreaView>
  );
}