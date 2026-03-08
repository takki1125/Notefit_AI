import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Dumbbell, Settings as SettingsIcon, Check, X, Trash2 } from 'lucide-react-native';
import { collection, deleteDoc, doc, getDocs, orderBy, query } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { auth, db } from '../../firebaseConfig';
import { styles } from '../../theme/styles';

type WorkoutSet = {
  weight: number | string;
  reps: number | string;
  done: boolean;
};

type WorkoutExercise = {
  name: string;
  sets: WorkoutSet[];
};

type Workout = {
  id: string;
  routineName: string;
  exercises: WorkoutExercise[];
  dateObj: Date;
  dateStr: string;
  day: number;
};

type WorkoutDetailModalProps = {
  visible: boolean;
  onClose: () => void;
  workout: Workout | null;
  onDelete: (id: string) => void;
};

const WorkoutDetailModal: React.FC<WorkoutDetailModalProps> = ({
  visible,
  onClose,
  workout,
  onDelete,
}) => {
  if (!workout) return null;

  const confirmDelete = () => {
    Alert.alert(
      '記録を削除',
      'このトレーニング記録を削除しますか？\nこの操作は元に戻せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () => onDelete(workout.id),
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.8)',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <View style={{ backgroundColor: '#2a2a2a', borderRadius: 20, maxHeight: '80%' }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderColor: '#444',
            }}
          >
            <View>
              <Text style={{ color: '#888', fontSize: 12 }}>{workout.dateStr}</Text>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                {workout.routineName}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 15 }}>
              <TouchableOpacity onPress={confirmDelete}>
                <Trash2 color="#ff4444" size={24} />
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {workout.exercises.map((ex, i) => (
              <View key={i} style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View
                    style={{
                      width: 4,
                      height: 16,
                      backgroundColor: '#2ecc71',
                      marginRight: 8,
                    }}
                  />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                    {ex.name}
                  </Text>
                </View>
                {ex.sets.map((set, k) => (
                  <View
                    key={k}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingVertical: 4,
                      paddingHorizontal: 12,
                      borderBottomWidth: 1,
                      borderColor: '#333',
                    }}
                  >
                    <Text style={{ color: '#888', fontSize: 12 }}>SET {k + 1}</Text>
                    <Text style={{ color: '#fff' }}>
                      {set.weight}kg × {set.reps}reps
                    </Text>
                    {set.done && <Check size={14} color="#2ecc71" />}
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

type CalendarSectionProps = {
  trainedDays: number[];
  onDayPress: (day: number) => void;
};

const CalendarSection: React.FC<CalendarSectionProps> = ({ trainedDays, onDayPress }) => {
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
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, index) => (
          <Text key={index} style={styles.weekDayText}>
            {day}
          </Text>
        ))}
      </View>
      <View style={styles.daysGrid}>
        {days.map(day => {
          const isToday = day === currentDay;
          const isTrained = trainedDays.includes(day);

          return (
            <TouchableOpacity
              key={day}
              style={styles.dayCell}
              onPress={() => onDayPress(day)}
            >
              <View
                style={[
                  styles.dayCircle,
                  isToday && styles.activeDayCircle,
                  isTrained && !isToday && styles.trainedDayCircle,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    isToday && styles.activeDayText,
                    isTrained && !isToday && styles.trainedDayText,
                  ]}
                >
                  {day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const HomeTabScreen: React.FC = () => {
  const [history, setHistory] = useState<Workout[]>([]);
  const [trainedDays, setTrainedDays] = useState<number[]>([]);
  const [lastWorkout, setLastWorkout] = useState<Workout | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);

  const fetchHistory = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const q = query(
        collection(db, 'users', user.uid, 'workouts'),
        orderBy('date', 'desc'),
      );
      const snapshot = await getDocs(q);

      const historyData: Workout[] = [];
      const days: number[] = [];

      snapshot.docs.forEach(d => {
        const data = d.data() as any;
        const dateObj: Date = data.date ? data.date.toDate() : new Date();

        historyData.push({
          id: d.id,
          ...data,
          dateObj,
          dateStr: dateObj.toLocaleDateString(),
          day: dateObj.getDate(),
        });
        days.push(dateObj.getDate());
      });

      setHistory(historyData);
      setTrainedDays([...new Set(days)]);
      setLastWorkout(historyData[0] ?? null);

      await AsyncStorage.setItem('@workout_history', JSON.stringify(historyData));
    } catch (e) {
      console.error(e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory]),
  );

  const handleDayPress = (day: number) => {
    const targetWorkout = history.find(item => item.day === day);
    if (targetWorkout) {
      setSelectedWorkout(targetWorkout);
      setModalVisible(true);
    }
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await deleteDoc(doc(db, 'users', user.uid, 'workouts', workoutId));

      Alert.alert('削除完了', '記録を削除しました。');
      setModalVisible(false);
      fetchHistory();
    } catch (error) {
      console.error('削除エラー:', error);
      Alert.alert('エラー', '削除に失敗しました。');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.homeHeader}>
        <View>
          <Text style={styles.headerLabel}>Welcome back,</Text>
          <Text style={styles.routineText}>
            {auth.currentUser?.email?.split('@')[0] || 'User'}
          </Text>
        </View>
        {/* 設定画面は後で Expo Router に移行する */}
        <TouchableOpacity
          onPress={() => Alert.alert('準備中', '設定画面は Expo Router 版に移行中です。')}
          style={styles.iconButton}
        >
          <SettingsIcon color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <CalendarSection trainedDays={trainedDays} onDayPress={handleDayPress} />

        <View style={styles.card}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 15,
            }}
          >
            <View>
              <Text style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>LATEST WORKOUT</Text>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>
                {lastWorkout ? lastWorkout.routineName : 'START WORKOUT'}
              </Text>
              {lastWorkout && (
                <Text style={{ color: '#2ecc71', fontSize: 12, marginTop: 4 }}>
                  {lastWorkout.dateStr}
                </Text>
              )}
            </View>
            <View
              style={{
                backgroundColor: '#2ecc71',
                borderRadius: 20,
                width: 40,
                height: 40,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Dumbbell color="#000" size={20} />
            </View>
          </View>
          <View style={{ gap: 8 }}>
            {lastWorkout ? (
              lastWorkout.exercises.slice(0, 3).map((ex, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#2ecc71',
                      marginRight: 8,
                    }}
                  />
                  <Text style={{ color: '#ccc' }}>{ex.name}</Text>
                  <Text style={{ color: '#666', marginLeft: 'auto' }}>
                    {ex.sets.filter(s => s.done).length} sets
                  </Text>
                </View>
              ))
            ) : (
              <Text style={{ color: '#666' }}>タップしてトレーニングを開始</Text>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.calorieBox}>
              <Text style={styles.calorieLabel}>合計ワークアウト</Text>
              <Text style={styles.calorieValue}>{trainedDays.length}回</Text>
            </View>
            <View style={styles.aiBox}>
              <Text style={{ color: '#000', padding: 10 }}>継続は力なり！</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <WorkoutDetailModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        workout={selectedWorkout}
        onDelete={handleDeleteWorkout}
      />
    </SafeAreaView>
  );
};

export default HomeTabScreen;


