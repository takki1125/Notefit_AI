import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
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
  Check,
  Dumbbell,
  Settings as SettingsIcon,
  Trash2,
  X,
  Flame,
  Utensils,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { auth, db } from "../../firebaseConfig";
import { styles } from "../../theme/styles";

// --- 型定義 ---
type WorkoutSet = { weight: number | string; reps: number | string; done: boolean; };
type WorkoutExercise = { name: string; sets: WorkoutSet[]; };
type Workout = { id: string; routineName: string; exercises: WorkoutExercise[]; dateObj: Date; dateStr: string; day: number; durationSeconds?: number; };
type Meal = { name: string; cal: number; pro: number; fat: number; carb: number; }; // ここは配列内の要素
type DailyFoodLog = { meals: Meal[]; totalCal: number; totalPro: number; totalFat: number; totalCarb: number; };

// --- 道具：時間を 00:00 形式にする ---
const formatTime = (totalSeconds: number | undefined) => {
  if (!totalSeconds) return "00:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

// --- 詳細モーダル（food_logs の構造に完全対応） ---
const WorkoutDetailModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  workouts: Workout[];
  foodLog: DailyFoodLog | null; // ★ 配列じゃなくて1日のログに変更
  onDelete: (id: string) => void;
}> = ({ visible, onClose, workouts, foodLog, onDelete }) => {
  if (workouts.length === 0 && !foodLog) return null;
  const dateStr = workouts.length > 0 ? workouts[0].dateStr : "記録詳細";

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "flex-end" }}>
        <View style={{ backgroundColor: "#1a1a1a", borderTopLeftRadius: 30, borderTopRightRadius: 30, height: "85%" }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 25, alignItems: 'center', borderBottomWidth: 1, borderColor: '#333' }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>{dateStr}</Text>
            <TouchableOpacity onPress={onClose}><X color="#fff" size={28} /></TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
            {/* トレーニングセクション */}
            {workouts.length > 0 && (
              <View style={{ marginBottom: 35 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                  <Dumbbell color="#2ecc71" size={20} style={{ marginRight: 10 }} />
                  <Text style={{ color: '#2ecc71', fontWeight: 'bold', letterSpacing: 1 }}>TRAINING LOG</Text>
                </View>
                {workouts.map((workout, idx) => (
                  <View key={workout.id} style={{ backgroundColor: '#262626', borderRadius: 15, padding: 15, marginBottom: 15 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                      <View>
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{workout.routineName}</Text>
                        <Text style={{ color: '#666', fontSize: 12 }}>{formatTime(workout.durationSeconds)}</Text>
                      </View>
                      <TouchableOpacity onPress={() => onDelete(workout.id)}><Trash2 color="#444" size={20} /></TouchableOpacity>
                    </View>
                    {workout.exercises.map((ex, i) => (
                      <View key={i} style={{ marginTop: 10, borderLeftWidth: 2, borderColor: '#2ecc71', paddingLeft: 12 }}>
                        <Text style={{ color: '#eee', fontWeight: '600' }}>{ex.name}</Text>
                        <Text style={{ color: '#888', fontSize: 12 }}>{ex.sets.length} sets completed</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}

            {/* 食事セクション（food_logs の meals 配列を展開） */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                <Utensils color="#ff4757" size={20} style={{ marginRight: 10 }} />
                <Text style={{ color: '#ff4757', fontWeight: 'bold', letterSpacing: 1 }}>NUTRITION LOG</Text>
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
                  <Text style={{ color: '#555', textAlign: 'center', paddingVertical: 10 }}>食事の記録はありません</Text>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// --- カレンダーセクション (省略なし) ---
const CalendarSection: React.FC<{ trainedDays: number[]; onDayPress: (day: number) => void; }> = ({ trainedDays, onDayPress }) => {
  const today = new Date();
  const currentDay = today.getDate();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <View style={styles.card}>
      <View style={styles.calendarHeader}>
        <Text style={styles.monthText}>{currentMonth}</Text>
        <Text style={styles.yearText}>{currentYear}</Text>
      </View>
      <View style={styles.weekRow}>
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day, index) => (
          <Text key={index} style={styles.weekDayText}>{day}</Text>
        ))}
      </View>
      <View style={[styles.daysGrid, { justifyContent: 'flex-start' }]}>
        {days.map((day) => {
          const isToday = day === currentDay;
          const isTrained = trainedDays.includes(day);
          return (
            <TouchableOpacity key={day} style={{ width: '14.28%', alignItems: 'center', marginBottom: 10 }} onPress={() => onDayPress(day)}>
              <View style={[styles.dayCircle, isToday && styles.activeDayCircle, isTrained && !isToday && styles.trainedDayCircle]}>
                <Text style={[styles.dayText, isToday && styles.activeDayText, isTrained && !isToday && styles.trainedDayText]}>{day}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// --- メイン画面 ---
export default function HomeTabScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<Workout[]>([]);
  const [trainedDays, setTrainedDays] = useState<number[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDateWorkouts, setSelectedDateWorkouts] = useState<Workout[]>([]);
  const [selectedDateFoodLog, setSelectedDateFoodLog] = useState<DailyFoodLog | null>(null);
  const [todayMeals, setTodayMeals] = useState<Meal[]>([]);
  const [displayName, setDisplayName] = useState("");

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
      setTrainedDays([...new Set(historyData.filter(w => w.dateObj.getMonth() === new Date().getMonth()).map(w => w.day))]);
    } catch (e) { console.error(e); }
  }, []);

  const fetchTodayMeals = useCallback(async () => {
    const stored = await AsyncStorage.getItem('@food_meals_today');
    setTodayMeals(stored ? JSON.parse(stored) : []);
  }, []);

  useFocusEffect(useCallback(() => { fetchHistory(); fetchTodayMeals(); }, [fetchHistory, fetchTodayMeals]));

  // カレンダータップ時の処理（日付固定IDで food_logs を狙い撃ち！）
  const handleDayPress = async (day: number) => {
    const dayWorkouts = history.filter(item => item.day === day);
    setSelectedDateWorkouts(dayWorkouts);

    const user = auth.currentUser;
    if (user) {
      try {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');

        // ターゲットドキュメントID: YYYY-MM-DD_Food
        const docId = `${year}-${month}-${dayStr}_Food`;
        const docRef = doc(db, "users", user.uid, "food_logs", docId);
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

  const handleDeleteWorkout = async (id: string) => {
    const user = auth.currentUser;
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "workouts", id));
    setModalVisible(false);
    fetchHistory();
  };

  const todayTotalCal = todayMeals.reduce((sum, item) => sum + item.cal, 0);
  const todayTotalPro = todayMeals.reduce((sum, item) => sum + item.pro, 0);
  const latestDateStr = history.length > 0 ? history[0].dateStr : null;
  const latestWorkouts = history.filter(w => w.dateStr === latestDateStr);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.homeHeader}>
          <View>
            <Text style={styles.homeWelcomeText}>Welcome back,</Text>
            <Text style={styles.routineText}>{displayName}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/settings")} style={styles.iconButton}>
            <SettingsIcon color="#fff" size={24} />
          </TouchableOpacity>
        </View>

        <CalendarSection trainedDays={trainedDays} onDayPress={handleDayPress} />

        <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => router.push("/training")}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
            <View>
              <Text style={{ color: "#2ecc71", fontSize: 14, fontWeight: "bold", letterSpacing: 1, marginBottom: 4 }}>WORKOUT</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>{latestDateStr || "START WORKOUT"}</Text>
                {latestWorkouts[0]?.durationSeconds && (
                  <Text style={{ color: '#888', fontSize: 12, marginLeft: 10 }}>({formatTime(latestWorkouts[0].durationSeconds)})</Text>
                )}
              </View>
            </View>
            <View style={{ backgroundColor: "#2ecc71", borderRadius: 20, width: 40, height: 40, justifyContent: "center", alignItems: "center" }}>
              <Dumbbell color="#000" size={20} />
            </View>
          </View>
          <View style={{ marginTop: 5, borderTopWidth: 1, borderTopColor: '#333', paddingTop: 12 }}>
            {latestWorkouts.length > 0 ? (
              latestWorkouts.map((workout, index) => (
                <View key={workout.id} style={{ marginBottom: index === latestWorkouts.length - 1 ? 4 : 16 }}>
                  {latestWorkouts.length > 1 && (
                    <Text style={{ color: "#666", fontSize: 9, fontWeight: 'bold', marginBottom: 8, textAlign: 'right' }}>SESSION {latestWorkouts.length - index}</Text>
                  )}
                  <View style={{ gap: 10 }}>
                    {workout.exercises.map((ex, i) => (
                      <View key={i} style={{ flexDirection: "row", alignItems: "center" }}>
                        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "#2ecc71", marginRight: 12 }} />
                        <Text style={{ color: "#fff", fontSize: 15, fontWeight: '500' }}>{ex.name}</Text>
                        <Text style={{ color: "#888", marginLeft: "auto", fontSize: 13 }}>{ex.sets.filter(s => s.done).length} sets</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ color: "#666", textAlign: 'center', paddingVertical: 10 }}>タップしてトレーニングを開始</Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => router.push("/food")}>
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
      </ScrollView>

      <WorkoutDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        workouts={selectedDateWorkouts}
        foodLog={selectedDateFoodLog} // ★ ここも 1日分のログに変更
        onDelete={handleDeleteWorkout}
      />
    </SafeAreaView>
  );
}