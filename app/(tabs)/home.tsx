import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import {
  Dumbbell,
  GripVertical,
  Minus,
  Pencil,
  Plus,
  Settings as SettingsIcon,
  Trash2,
  X,
  Flame,
  Utensils,
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Dimensions,
  Image,
  InteractionManager,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { usePathname, useRouter } from "expo-router";
import { Video, ResizeMode } from 'expo-av';

import { HOME_WIDGET_LABELS, type HomeWidgetId, hiddenWidgetIds } from "../../constants/homeWidgets";
import { auth, db } from "../../firebaseConfig";
import DailyAIAdviceCard from "../../components/ai/DailyAIAdviceCard";
import GoalProgressCard from "../../components/goal/GoalProgressCard";
import { CoinHubSummary } from "../../components/monetization/CoinHubSummary";
import { DailyMetricQuickInput } from "../../components/metrics/DailyMetricQuickInput";
import { useCoinBalance } from "../../hooks/useCoinBalance";
import { useHomeWidgetOrder } from "../../hooks/useHomeWidgetOrder";
import { styles } from "../../theme/styles";
import { requestRegistrationBonus } from "../../utils/coinBalance";
import {
  hasSeenHomeTutorial,
  markHomeTutorialSeen,
  TUTORIAL_REPLAY_PENDING_KEY,
} from "../../utils/homeTutorialStorage";

const { width } = Dimensions.get('window');

type WorkoutSet = { weight?: number | string; reps?: number | string; durationMinutes?: number | string; distanceKm?: number | string; done: boolean; };
type WorkoutExercise = { name: string; sets: WorkoutSet[]; category?: string; };
type Workout = { id: string; routineName: string; exercises: WorkoutExercise[]; dateObj: Date; dateStr: string; day: number; durationSeconds?: number; };
type Meal = { name: string; cal: number; pro: number; fat: number; carb: number; };
type DailyFoodLog = { meals: Meal[]; totalCal: number; totalPro: number; totalFat: number; totalCarb: number; };

const formatTime = (totalSeconds: number | undefined) => {
  if (!totalSeconds) return "00:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

// --- スライドチュートリアル用データ ---
const SLIDES = [
  {
    id: '1',
    title: 'ホーム画面',
    description: 'ここで今日のトレーニングや食事の記録を一目で確認できます。',
    image: require('../../assets/images/tutorial/slide_home1.png'),
    detailSlides: [
      {
        id: '1-1',
        title: '自分好みにカスタマイズ',
        description: 'ウィジェットを長押しすると、表示する項目の追加や削除、並び替えが自由にできます。',
        video: require('../../assets/images/tutorial/video_home1.mp4'),
      }
    ]
  },
  {
    id: '2',
    title: 'カレンダー機能',
    description: '日付をタップすると、その日の詳しい記録を確認・追加できます。',
    image: require('../../assets/images/tutorial/slide_home2.png'),
    detailSlides: [
      {
        id: '2-1',
        title: '1日の詳細画面',
        description: '日付をタップして開いた画面では、その日のトレーニングと食事の確認、新しい記録の追加、間違えた記録の削除がまとめて行えます。',
        video: require('../../assets/images/tutorial/video_home2.mp4'),
      }
    ]
  },
  {
    id: '3',
    title: 'さあ、始めよう',
    description: 'まずは今日のトレーニングを記録してみましょう！👇',
    image: require('../../assets/images/tutorial/slide_home3.png'),
    detailSlides: [
      {
        id: '3-1',
        title: '便利なリンクウィジェット',
        description: 'ホーム画面には「カレンダー」「トレーニング」「食事」「AIアドバイス」へ一発で飛べるボタンも配置されています。どんどん活用していきましょう！',
        video: require('../../assets/images/tutorial/video_home3.mp4'),
      }
    ]
  }
];

// --- チュートリアルモーダル本体 ---
const SlideTutorialModal: React.FC<{ visible: boolean; onFinish: () => void }> = ({ visible, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const [activeDetailSlides, setActiveDetailSlides] = useState<any[] | null>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const onDetailViewableItemsChanged = useRef(() => { }).current;

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      onFinish();
    }
  };

  if (!visible) return null;

  // ▼ 本編スライド
  const renderMainSlide = ({ item }: { item: any }) => (
    <View style={{ width, flex: 1 }}>
      <ScrollView contentContainerStyle={{ alignItems: 'center', padding: 20, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        <View style={{ width: width * 0.7, height: width * 1.3, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
          <Image source={item.image} style={{ width: '100%', height: '100%', borderRadius: 20 }} resizeMode="contain" />
        </View>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }}>{item.title}</Text>
        <Text style={{ color: '#aaa', fontSize: 16, textAlign: 'center', lineHeight: 24, paddingHorizontal: 10 }}>{item.description}</Text>

        {item.detailSlides && (
          <TouchableOpacity
            onPress={() => setActiveDetailSlides(item.detailSlides)}
            style={{ marginTop: 25, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 25, borderWidth: 1, borderColor: '#4facfe' }}
          >
            <Text style={{ color: '#4facfe', fontWeight: 'bold', fontSize: 15 }}>もっと詳しく見る ＞</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );

  // ▼ 詳細スライド（画像対応のみ）
  const renderDetailSlide = ({ item }: { item: any }) => (
    <View style={{ width, flex: 1 }}>
      <ScrollView contentContainerStyle={{ alignItems: 'center', padding: 20, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        <View style={{ width: width * 0.7, height: width * 1.3, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden' }}>
          
          {/* ▼ ここを修正！ */}
          {item.video ? (
            <Video source={item.video} style={{ width: '100%', height: '100%' }} resizeMode={ResizeMode.CONTAIN} shouldPlay isLooping isMuted />
          ) : item.image ? (
            <Image source={item.image} style={{ width: '100%', height: '100%', borderRadius: 20 }} resizeMode="contain" />
          ) : (
            <Text style={{ color: '#666' }}>メディアがありません</Text>
          )}

        </View>
        <Text style={{ color: '#4facfe', fontSize: 24, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }}>{item.title}</Text>
        <Text style={{ color: '#aaa', fontSize: 16, textAlign: 'center', lineHeight: 24, paddingHorizontal: 10 }}>{item.description}</Text>
      </ScrollView>
    </View>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(26, 26, 26, 0.95)' }}>
        <SafeAreaView style={{ flex: 1 }}>
          
          {activeDetailSlides ? (
            <View style={{ flex: 1 }}>
              <TouchableOpacity onPress={() => setActiveDetailSlides(null)} style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, padding: 15, flexDirection: 'row', alignItems: 'center' }}>
                <ChevronLeft color="#fff" size={24} />
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>戻る</Text>
              </TouchableOpacity>
              <FlatList
                key="detail"
                data={activeDetailSlides}
                renderItem={renderDetailSlide}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                keyExtractor={(item) => item.id}
                onViewableItemsChanged={onDetailViewableItemsChanged}
                style={{ marginTop: 40 }}
              />
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <TouchableOpacity onPress={onFinish} style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, padding: 15 }}>
                <Text style={{ color: '#aaa', fontSize: 16 }}>スキップ</Text>
              </TouchableOpacity>
              <FlatList
                key="main"
                ref={flatListRef}
                data={SLIDES}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewConfig}
                renderItem={renderMainSlide}
              />
              <View style={{ padding: 20, paddingBottom: 40, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', marginBottom: 30 }}>
                  {SLIDES.map((_, index) => (
                    <View key={index} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: currentIndex === index ? '#2ecc71' : '#555', marginHorizontal: 4, ...(currentIndex === index && { width: 24 }) }} />
                  ))}
                </View>
                <TouchableOpacity onPress={handleNext} style={{ backgroundColor: '#2ecc71', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, width: '90%', alignItems: 'center' }}>
                  <Text style={{ color: '#000', fontSize: 18, fontWeight: 'bold' }}>
                    {currentIndex === SLIDES.length - 1 ? 'はじめる' : '次へ'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        </SafeAreaView>
      </View>
    </Modal>
  );
};
// --- チュートリアルコンポーネントここまで ---

const WorkoutDetailModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  workouts: Workout[];
  foodLog: DailyFoodLog | null;
  targetDateId: string;
  onDeleteWorkout: (id: string) => void;
  onEditWorkout: (id: string) => void;
  onEditFood: (dateId: string) => void;
}> = ({ visible, onClose, workouts, foodLog, targetDateId, onDeleteWorkout, onEditWorkout, onEditFood }) => {

  const displayDateStr = targetDateId ? targetDateId.replace(/-/g, "/") : "記録詳細";
  const dateStr = workouts.length > 0 ? workouts[0].dateStr : displayDateStr;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: "#1a1a1a", borderTopLeftRadius: 30, borderTopRightRadius: 30, height: "85%" }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 25, alignItems: 'center', borderBottomWidth: 1, borderColor: '#333' }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>{dateStr}</Text>
            <TouchableOpacity onPress={onClose}><X color="#fff" size={28} /></TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
            <View style={{ marginBottom: 35 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Dumbbell color="#2ecc71" size={20} style={{ marginRight: 10 }} />
                  <Text style={{ color: '#2ecc71', fontWeight: 'bold', letterSpacing: 1 }}>TRAINING LOG</Text>
                </View>
                {workouts.length === 0 && (
                  <TouchableOpacity
                    onPress={() => onEditWorkout(targetDateId)}
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#2ecc71', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}
                  >
                    <Plus color="#000" size={16} style={{ marginRight: 4 }} />
                    <Text style={{ color: '#000', fontSize: 12, fontWeight: 'bold' }}>追加</Text>
                  </TouchableOpacity>
                )}
              </View>

              {workouts.length > 0 ? (
                workouts.map((workout) => (
                  <View key={workout.id} style={{ backgroundColor: '#262626', borderRadius: 15, padding: 15, marginBottom: 15 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{workout.routineName}</Text>
                        <Text style={{ color: '#666', fontSize: 12 }}>{formatTime(workout.durationSeconds)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => onEditWorkout(workout.id)} style={{ padding: 5, marginRight: 10 }}>
                          <Pencil color="#4facfe" size={20} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => onDeleteWorkout(workout.id)} style={{ padding: 5 }}>
                          <Trash2 color="#ff4444" size={20} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {workout.exercises.map((ex, i) => (
                      <View key={i} style={{ marginTop: 10, borderLeftWidth: 2, borderColor: '#2ecc71', paddingLeft: 12, marginBottom: 5 }}>
                        <Text style={{ color: '#eee', fontWeight: 'bold', fontSize: 15, marginBottom: 6 }}>{ex.name}</Text>

                        {ex.sets.filter(s => s.done || (s.weight !== undefined && s.weight !== "") || (s.durationMinutes !== undefined && s.durationMinutes !== "")).map((set, k) => {
                          const isCardio = set.durationMinutes !== undefined || set.distanceKm !== undefined;
                          const displayStr = isCardio
                            ? `${set.durationMinutes || 0}分 × ${set.distanceKm || 0}km`
                            : `${set.weight || 0}kg × ${set.reps || 0}reps`;

                          return (
                            <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingRight: 10, marginBottom: 3 }}>
                              <Text style={{ color: '#888', fontSize: 12 }}>Set {k + 1}</Text>
                              <Text style={{ color: '#ccc', fontSize: 13 }}>{displayStr}</Text>
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                ))
              ) : (
                <View style={{ backgroundColor: '#262626', borderRadius: 15, padding: 20, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#444' }}>
                  <Text style={{ color: '#666', fontSize: 14 }}>トレーニングの記録がありません</Text>
                </View>
              )}
            </View>

            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Utensils color="#ff4757" size={20} style={{ marginRight: 10 }} />
                  <Text style={{ color: '#ff4757', fontWeight: 'bold', letterSpacing: 1 }}>NUTRITION LOG</Text>
                </View>
                <TouchableOpacity onPress={() => onEditFood(targetDateId)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ff4757', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                  {foodLog ? <Pencil color="#fff" size={16} style={{ marginRight: 4 }} /> : <Plus color="#fff" size={16} style={{ marginRight: 4 }} />}
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{foodLog ? "編集" : "追加"}</Text>
                </TouchableOpacity>
              </View>

              <View style={{ backgroundColor: '#262626', borderRadius: 15, padding: 15 }}>
                {foodLog && foodLog.meals && foodLog.meals.length > 0 ? (
                  <>
                    {foodLog.meals.map((meal, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderColor: '#333' }}>
                        <Text style={{ color: '#fff' }}>{meal.name}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ color: '#fff', fontSize: 14 }}>{meal.cal} kcal</Text>
                          <Text style={{ color: '#666', fontSize: 11 }}>P: {meal.pro}g / F: {meal.fat}g / C: {meal.carb}g</Text>
                        </View>
                      </View>
                    ))}
                    <View style={{ marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderColor: '#444', flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Daily Total</Text>
                      <Text style={{ color: '#ff4757', fontWeight: 'bold', fontSize: 18 }}>{foodLog.totalCal} kcal</Text>
                    </View>
                  </>
                ) : (
                  <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                    <Text style={{ color: '#555' }}>食事の記録はありません</Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const CalendarSection: React.FC<{
  viewedDate: Date;
  trainedDays: number[];
  onDayPress: (day: number, month: number, year: number) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  editMode?: boolean;
  onLongPressEdit?: () => void;
}> = ({ viewedDate, trainedDays, onDayPress, onPrevMonth, onNextMonth, editMode, onLongPressEdit }) => {
  const currentYear = viewedDate.getFullYear();
  const currentMonthIdx = viewedDate.getMonth();
  const currentMonthNum = currentMonthIdx + 1;

  const displayMonth = currentMonthNum < 10 ? `0${currentMonthNum}` : `${currentMonthNum}`;
  const firstDayOfWeek = new Date(currentYear, currentMonthIdx, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfWeek }, (_, i) => i);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonthIdx;
  const currentDay = today.getDate();

  const header = (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <TouchableOpacity onPress={onPrevMonth} disabled={editMode} style={{ padding: 10 }}>
        <ChevronLeft color="#fff" size={20} />
      </TouchableOpacity>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>{displayMonth}</Text>
        <Text style={{ color: '#444', fontSize: 20, marginHorizontal: 8 }}>/</Text>
        <Text style={{ color: '#666', fontSize: 18, fontWeight: '400' }}>{currentYear}</Text>
      </View>
      <TouchableOpacity onPress={onNextMonth} disabled={editMode} style={{ padding: 10 }}>
        <ChevronRight color="#fff" size={20} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.card}>
      {!editMode && onLongPressEdit ? (
        <Pressable onLongPress={onLongPressEdit} delayLongPress={450}>{header}</Pressable>
      ) : (
        header
      )}
      <View style={styles.weekRow}>
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day, index) => (
          <Text key={index} style={styles.weekDayText}>{day}</Text>
        ))}
      </View>
      <View style={[styles.daysGrid, { justifyContent: 'flex-start' }]}>
        {blanks.map((_, i) => <View key={`blank-${i}`} style={{ width: "14.28%", height: 40 }} />)}
        {days.map((day) => {
          const isToday = isCurrentMonth && day === currentDay;
          const isTrained = trainedDays.includes(day);
          const cell = (
            <View style={[styles.dayCircle, isToday && styles.activeDayCircle, isTrained && !isToday && styles.trainedDayCircle]}>
              <Text style={[styles.dayText, isToday && styles.activeDayText, isTrained && !isToday && styles.trainedDayText]}>
                {day}
              </Text>
            </View>
          );
          return editMode ? (
            <View key={day} style={{ width: "14.28%", alignItems: "center", marginBottom: 10 }} pointerEvents="none">
              {cell}
            </View>
          ) : (
            <TouchableOpacity
              key={day}
              style={{ width: "14.28%", alignItems: "center", marginBottom: 10 }}
              onPress={() => onDayPress(day, currentMonthNum, currentYear)}
              onLongPress={onLongPressEdit}
              delayLongPress={450}
            >
              {cell}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

function HomeTabContent() {
  const router = useRouter();
  const pathname = usePathname();
  const isFocused = useIsFocused();
  const uid = auth.currentUser?.uid;
  const coinBalance = useCoinBalance();
  const { order, persistOrder, addWidget, hydrated } = useHomeWidgetOrder(uid);

  const [isEditMode, setIsEditMode] = useState(false);
  const [addWidgetModalVisible, setAddWidgetModalVisible] = useState(false);
  const [history, setHistory] = useState<Workout[]>([]);
  const [viewedDate, setViewedDate] = useState(new Date());

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDateWorkouts, setSelectedDateWorkouts] = useState<Workout[]>([]);
  const [selectedDateFoodLog, setSelectedDateFoodLog] = useState<DailyFoodLog | null>(null);
  const [targetDateId, setTargetDateId] = useState("");

  const [todayMeals, setTodayMeals] = useState<Meal[]>([]);
  const [displayName, setDisplayName] = useState("");

  const [showSlideTutorial, setShowSlideTutorial] = useState(false);

  const fetchHistory = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      setDisplayName(userDoc.exists() ? userDoc.data().username || "User" : "User");
      const q = query(collection(db, "users", user.uid, "workouts"), orderBy("date", "desc"));
      const snapshot = await getDocs(q);
      const historyData: Workout[] = snapshot.docs.map(d => {
        const data = d.data() as any;
        const dateObj = data.date ? data.date.toDate() : new Date();
        return { id: d.id, ...data, dateObj, dateStr: dateObj.toLocaleDateString(), day: dateObj.getDate() };
      });
      setHistory(historyData);
    } catch (e) { console.error(e); }
  }, []);

  const trainedDays = useMemo(() => {
    return [...new Set(history
      .filter(w =>
        w.dateObj.getFullYear() === viewedDate.getFullYear() &&
        w.dateObj.getMonth() === viewedDate.getMonth()
      )
      .map(w => w.day)
    )];
  }, [history, viewedDate]);

  const fetchTodayMeals = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) { setTodayMeals([]); return; }
    const storageKey = `@food_meals_today_${user.uid}`;
    const dateKey = `@food_last_opened_date_${user.uid}`;
    const todayStr = new Date().toDateString();
    const storedDate = await AsyncStorage.getItem(dateKey);
    if (storedDate !== todayStr) {
      setTodayMeals([]);
      await AsyncStorage.removeItem(storageKey);
      await AsyncStorage.setItem(dateKey, todayStr);
    } else {
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        try { setTodayMeals(JSON.parse(stored)); } catch { setTodayMeals([]); }
      } else {
        setTodayMeals([]);
      }
    }
  }, []);

  useEffect(() => {
    if (!uid || !hydrated || !isFocused) return;
    if ((pathname ?? "").includes("settings")) return;

    let cancelled = false;

    void (async () => {
      try {
        const pending = await AsyncStorage.getItem(TUTORIAL_REPLAY_PENDING_KEY);
        if (pending === uid) {
          if (!cancelled) {
            setShowSlideTutorial(true);
          }
          await AsyncStorage.removeItem(TUTORIAL_REPLAY_PENDING_KEY);
          return;
        }

        const hasSeen = await hasSeenHomeTutorial(uid);
        if (!cancelled && !hasSeen) {
          setShowSlideTutorial(true);
        }
      } catch (e) { console.error(e); }
    })();

    return () => { cancelled = true; };
  }, [uid, hydrated, isFocused, pathname]);

  const handleFinishTutorial = async () => {
    setShowSlideTutorial(false);
    if (uid) {
      await markHomeTutorialSeen(uid).catch(() => { });
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
      fetchTodayMeals();
      const u = auth.currentUser;
      if (u) {
        void requestRegistrationBonus().catch(() => { });
      }
    }, [fetchHistory, fetchTodayMeals]),
  );

  useFocusEffect(
    useCallback(() => {
      return () => {
        setIsEditMode(false);
        setAddWidgetModalVisible(false);
      };
    }, []),
  );

  const handleDayPress = async (day: number, month: number, year: number) => {
    const dayWorkouts = history.filter(item =>
      item.day === day && item.dateObj.getMonth() + 1 === month && item.dateObj.getFullYear() === year
    );
    setSelectedDateWorkouts(dayWorkouts);

    const mStr = String(month).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const docId = `${year}-${mStr}-${dStr}`;
    setTargetDateId(docId);

    const user = auth.currentUser;
    if (user) {
      try {
        const foodDocId = `${docId}_Food`;
        const docRef = doc(db, "users", user.uid, "food_logs", foodDocId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSelectedDateFoodLog(docSnap.data() as DailyFoodLog);
        } else {
          setSelectedDateFoodLog(null);
        }
      } catch (e) { console.error("食事ログ取得エラー:", e); }
    }
    setModalVisible(true);
  };

  const handleDeleteWorkout = (id: string) => {
    Alert.alert(
      "ワークアウトの削除",
      "このトレーニング記録を削除しますか？\nこの操作は取り消せません。",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: async () => {
            const user = auth.currentUser;
            if (!user) return;
            try {
              await deleteDoc(doc(db, "users", user.uid, "workouts", id));
              setModalVisible(false);
              fetchHistory();
            } catch (e) {
              console.error(e);
              Alert.alert("エラー", "削除に失敗しました。");
            }
          },
        },
      ]
    );
  };

  // ▼ バグ修正：AsyncStorage経由で日付を確実に渡すように変更
  const handleEditWorkout = async (workoutId: string) => {
    setModalVisible(false);
    await AsyncStorage.setItem('@target_edit_workout_date', workoutId);
    router.navigate("/training");
  };

  const handleEditFood = async (dateId: string) => {
    setModalVisible(false);
    await AsyncStorage.setItem('@target_edit_food_date', dateId);
    router.navigate("/food");
  };

  const todayTotalCal = todayMeals.reduce((sum, item) => sum + item.cal, 0);
  const todayTotalPro = todayMeals.reduce((sum, item) => sum + item.pro, 0);
  const todayStr = new Date().toLocaleDateString();
  const todaysWorkouts = history.filter(w => w.dateStr === todayStr);
  const hiddenIds = useMemo(() => hiddenWidgetIds(order), [order]);

  const removeWidget = useCallback(
    (id: HomeWidgetId) => {
      if (order.length <= 1) {
        Alert.alert("これ以上削除できません", "ホームには最低1つウィジェットが必要です。");
        return;
      }
      void persistOrder(order.filter((w) => w !== id));
    },
    [order, persistOrder],
  );

  const enterEditMode = useCallback(() => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsEditMode(true);
  }, []);

  const renderWidget = (id: HomeWidgetId, editMode: boolean, onLongPressEdit?: () => void) => {
    const blockPointer = editMode ? "none" as const : "auto";
    const wrapIfEditEntry = (node: React.ReactNode) => {
      if (editMode || !onLongPressEdit) return node;
      return <Pressable onLongPress={onLongPressEdit} delayLongPress={450}>{node}</Pressable>;
    };
    switch (id) {
      case "metrics": return wrapIfEditEntry(<View pointerEvents={blockPointer}><DailyMetricQuickInput /></View>);
      case "goal": return wrapIfEditEntry(<View pointerEvents={blockPointer}><GoalProgressCard /></View>);
      case "ai": return wrapIfEditEntry(<View pointerEvents={blockPointer}><DailyAIAdviceCard /></View>);
      case "calendar":
        return (
          <CalendarSection
            viewedDate={viewedDate}
            trainedDays={trainedDays}
            onDayPress={handleDayPress}
            onPrevMonth={() => setViewedDate(new Date(viewedDate.getFullYear(), viewedDate.getMonth() - 1, 1))}
            onNextMonth={() => setViewedDate(new Date(viewedDate.getFullYear(), viewedDate.getMonth() + 1, 1))}
            editMode={editMode}
            onLongPressEdit={!editMode ? onLongPressEdit : undefined}
          />
        );
      case "workout":
        return (
          <TouchableOpacity
            style={styles.card} activeOpacity={0.8} disabled={editMode}
            onPress={() => router.push("/training")} onLongPress={!editMode && onLongPressEdit ? onLongPressEdit : undefined} delayLongPress={450}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
              <View>
                <Text style={{ color: "#2ecc71", fontSize: 14, fontWeight: "bold", letterSpacing: 1, marginBottom: 4 }}>WORKOUT</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>{todaysWorkouts.length > 0 ? "TODAY" : "START WORKOUT"}</Text>
                  {todaysWorkouts[0]?.durationSeconds && (
                    <Text style={{ color: '#888', fontSize: 12, marginLeft: 10 }}>({formatTime(todaysWorkouts[0].durationSeconds)})</Text>
                  )}
                </View>
              </View>
              <View style={{ backgroundColor: "#2ecc71", borderRadius: 20, width: 40, height: 40, justifyContent: "center", alignItems: "center" }}>
                <Dumbbell color="#000" size={20} />
              </View>
            </View>
            <View style={{ marginTop: 5, borderTopWidth: 1, borderTopColor: '#333', paddingTop: 12 }}>
              {todaysWorkouts.length > 0 ? (
                todaysWorkouts.map((workout, index) => (
                  <View key={workout.id} style={{ marginBottom: index === todaysWorkouts.length - 1 ? 4 : 16 }}>
                    {todaysWorkouts.length > 1 && <Text style={{ color: "#666", fontSize: 9, fontWeight: 'bold', marginBottom: 8, textAlign: 'right' }}>SESSION {todaysWorkouts.length - index}</Text>}
                    <View style={{ gap: 10 }}>
                      {workout.exercises.map((ex, i) => {
                        const doneSets = ex.sets.filter(s => s.done || (s.weight !== undefined && s.weight !== "") || (s.durationMinutes !== undefined && s.durationMinutes !== ""));
                        return (
                          <View key={i} style={{ marginBottom: 10 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                              <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "#2ecc71", marginRight: 10 }} />
                              <Text style={{ color: "#fff", fontSize: 15, fontWeight: 'bold' }}>{ex.name}</Text>
                            </View>
                            {doneSets.length > 0 ? (
                              <Text style={{ color: '#888', fontSize: 12, paddingLeft: 14 }}>
                                {doneSets.map(s => {
                                  const isCardio = s.durationMinutes !== undefined || s.distanceKm !== undefined;
                                  return isCardio
                                    ? `${s.durationMinutes || 0}分×${s.distanceKm || 0}km`
                                    : `${s.weight || 0}kg×${s.reps || 0}`;
                                }).join('  |  ')}
                              </Text>
                            ) : (
                              <Text style={{ color: '#555', fontSize: 12, paddingLeft: 14 }}>未完了</Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))
              ) : (
                <Text style={{ color: "#666", textAlign: 'center', paddingVertical: 10 }}>タップして今日のトレーニングを開始</Text>
              )}
            </View>
          </TouchableOpacity>
        );
      case "nutrition":
        return (
          <TouchableOpacity
            style={styles.card} activeOpacity={0.8} disabled={editMode}
            onPress={() => router.push("/food")} onLongPress={!editMode && onLongPressEdit ? onLongPressEdit : undefined} delayLongPress={450}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
              <View>
                <Text style={{ color: "#ff4757", fontSize: 14, fontWeight: "bold", letterSpacing: 1, marginBottom: 4 }}>NUTRITION</Text>
                <Text style={{ color: "#fff", fontSize: 20, fontWeight: "bold" }}>{todayTotalCal} <Text style={{ fontSize: 14, fontWeight: 'normal' }}>kcal</Text></Text>
              </View>
              <View style={{ backgroundColor: "#ff4757", borderRadius: 20, width: 40, height: 40, justifyContent: "center", alignItems: "center" }}>
                <Flame color="#fff" size={20} />
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#4facfe", marginRight: 8 }} />
              <Text style={{ color: "#ccc" }}>タンパク質 (Protein)</Text>
              <Text style={{ color: "#fff", marginLeft: "auto", fontWeight: 'bold' }}>{todayTotalPro} g</Text>
            </View>
          </TouchableOpacity>
        );
      default: return null;
    }
  };

  const renderWidgetRow = (item: HomeWidgetId, drag?: () => void, isActive?: boolean) => {
    const showChrome = isEditMode;
    const body = (
      <View style={{ flex: 1, minWidth: 0, position: "relative" }}>
        {showChrome && (
          <TouchableOpacity
            onPress={() => removeWidget(item)}
            style={{
              position: "absolute", top: -6, left: -6, zIndex: 20, width: 26, height: 26,
              borderRadius: 13, backgroundColor: "#ff3b30", justifyContent: "center", alignItems: "center",
              borderWidth: 2, borderColor: "#1a1a1a",
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="ウィジェットを削除"
          >
            <Minus color="#fff" size={16} strokeWidth={3} />
          </TouchableOpacity>
        )}
        {renderWidget(item, !!showChrome, showChrome ? undefined : enterEditMode)}
      </View>
    );

    if (!showChrome) return <View style={{ marginBottom: 0 }}>{body}</View>;

    return (
      <ScaleDecorator>
        <View style={{ flexDirection: "row", alignItems: "flex-start", opacity: isActive ? 0.92 : 1, paddingTop: 4 }}>
          <TouchableOpacity
            onLongPress={drag ?? (() => { })} delayLongPress={200}
            style={{ paddingTop: 8, paddingRight: 6, paddingLeft: 0 }}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }} accessibilityLabel="並び替え"
          >
            <GripVertical color="#888" size={24} />
          </TouchableOpacity>
          {body}
        </View>
      </ScaleDecorator>
    );
  }

  const renderDraggableRow = ({ item, drag, isActive }: RenderItemParams<HomeWidgetId>) => renderWidgetRow(item, drag, isActive);
  const renderStaticRow = ({ item }: { item: HomeWidgetId }) => renderWidgetRow(item);

  const listHeader = useMemo(
    () => (
      <>
        <View style={styles.homeHeader}>
          {isEditMode ? (
            <>
              <TouchableOpacity onPress={() => { setIsEditMode(false); setAddWidgetModalVisible(false); }} style={{ paddingVertical: 8, paddingRight: 12 }} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}>
                <Text style={{ color: "#2ecc71", fontSize: 17, fontWeight: "600" }}>完了</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#888", fontSize: 12, marginBottom: 2 }}>ホームを編集</Text>
                <Text style={[styles.routineText, { fontSize: 18 }]}>並べ替え・削除</Text>
              </View>
              {hiddenIds.length > 0 && (
                <TouchableOpacity onPress={() => setAddWidgetModalVisible(true)} style={styles.iconButton} accessibilityLabel="ウィジェットを追加">
                  <Plus color="#2ecc71" size={26} strokeWidth={2.5} />
                </TouchableOpacity>
              )}
              <CoinHubSummary balance={coinBalance} compact onPress={() => router.push("/settings/monetization")} />
              <TouchableOpacity onPress={() => router.push("/settings")} style={styles.iconButton}>
                <SettingsIcon color="#fff" size={24} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View>
                <Text style={styles.homeWelcomeText}>Welcome back,</Text>
                <Text style={styles.routineText}>{displayName}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <CoinHubSummary balance={coinBalance} compact onPress={() => router.push("/settings/monetization")} />
                <TouchableOpacity onPress={() => router.push("/settings")} style={styles.iconButton}>
                  <SettingsIcon color="#fff" size={24} />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {!isEditMode && (
          <>
            <CoinHubSummary balance={coinBalance} onPress={() => router.push("/settings/monetization")} />
            <Text style={{ color: "#666", fontSize: 12, paddingHorizontal: 20, marginBottom: 14 }}>
              任意のウィジェットを長押しで編集モード
            </Text>
          </>
        )}
      </>
    ),
    [isEditMode, displayName, router, hiddenIds.length, coinBalance],
  );

  const listFooter = useMemo(() => {
    if (hiddenIds.length === 0) return null;
    return (
      <TouchableOpacity
        onPress={() => setAddWidgetModalVisible(true)}
        style={{ marginBottom: 24, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: "#444", borderStyle: "dashed", alignItems: "center" }}
      >
        <Text style={{ color: "#2ecc71", fontWeight: "600", fontSize: 15 }}>+ ウィジェットを追加</Text>
        <Text style={{ color: "#666", fontSize: 12, marginTop: 4 }}>非表示にした項目をホームに戻せます</Text>
      </TouchableOpacity>
    );
  }, [hiddenIds.length]);

  if (uid && !hydrated) {
    return (
      <View style={[styles.container, { flex: 1, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#2ecc71" />
      </View>
    );
  }

  const listCommon = {
    data: order,
    keyExtractor: (item: HomeWidgetId) => item,
    ListHeaderComponent: listHeader,
    ListFooterComponent: listFooter,
    contentContainerStyle: styles.scrollContent,
    keyboardShouldPersistTaps: "handled" as const,
    style: { flex: 1 },
  };

  return (
    <View style={[styles.container, { flex: 1 }]}>
      {isEditMode ? (
        <DraggableFlatList
          {...listCommon}
          onDragEnd={({ data }) => void persistOrder(data)}
          renderItem={renderDraggableRow}
          containerStyle={{ flex: 1 }}
        />
      ) : (
        <FlatList
          {...listCommon}
          renderItem={renderStaticRow}
        />
      )}

      <Modal visible={addWidgetModalVisible} transparent animationType="slide" onRequestClose={() => setAddWidgetModalVisible(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable style={{ flex: 1 }} onPress={() => setAddWidgetModalVisible(false)} />
          <View style={{ backgroundColor: "#262626", borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 28 }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 4 }}>ウィジェットを追加</Text>
            <Text style={{ color: "#888", fontSize: 13, marginBottom: 12 }}>ホームに表示する項目を選んでください</Text>
            {hiddenIds.length === 0 ? (
              <Text style={{ color: "#888", fontSize: 14, paddingVertical: 8 }}>追加できるウィジェットはありません</Text>
            ) : (
              hiddenIds.map((id) => (
                <TouchableOpacity key={id} onPress={() => { addWidget(id); setAddWidgetModalVisible(false); }} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#333" }}>
                  <Text style={{ color: "#fff", fontSize: 16 }}>{HOME_WIDGET_LABELS[id]}</Text>
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity onPress={() => setAddWidgetModalVisible(false)} style={{ marginTop: 14, alignItems: "center", paddingVertical: 10 }}>
              <Text style={{ color: "#888", fontSize: 15 }}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <WorkoutDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        workouts={selectedDateWorkouts}
        foodLog={selectedDateFoodLog}
        targetDateId={targetDateId}
        onDeleteWorkout={handleDeleteWorkout}
        onEditWorkout={handleEditWorkout}
        onEditFood={handleEditFood}
      />

      {/* スライドチュートリアル */}
      <SlideTutorialModal 
        visible={showSlideTutorial} 
        onFinish={handleFinishTutorial} 
      />

    </View>
  );
}

export default function HomeTabScreen() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <HomeTabContent />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}