import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Home, Dumbbell, Utensils, MoreHorizontal } from 'lucide-react-native';

// --- データ定義 ---
const DAYS = Array.from({ length: 28 }, (_, i) => i + 1); // 2月の28日間
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const TRAINED_DAYS = [1, 5, 8, 12, 15, 20]; // トレーニングした日（白丸）

// --- コンポーネント群 ---

// 1. カレンダー部分
const CalendarSection = () => {
  return (
    <View style={styles.card}>
      <View style={styles.calendarHeader}>
        <Text style={styles.monthText}>2</Text>
        <Text style={styles.yearText}>2026</Text>
      </View>

      {/* 曜日ヘッダー */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map((day, index) => (
          <Text key={index} style={styles.weekDayText}>{day}</Text>
        ))}
      </View>

      {/* 日付グリッド */}
      <View style={styles.daysGrid}>
        {DAYS.map((day) => {
          const isToday = day === 2; // 今日（緑）
          const isTrained = TRAINED_DAYS.includes(day); // トレ日（白）

          return (
            <TouchableOpacity
              key={day}
              style={styles.dayCell}
              onPress={() => console.log(`${day}日の詳細へ`)}
            >
              <View style={[
                styles.dayCircle,
                isToday && styles.activeDayCircle,
                isTrained && styles.trainedDayCircle
              ]}>
                <Text style={[
                  styles.dayText,
                  isToday && styles.activeDayText,
                  isTrained && styles.trainedDayText
                ]}>
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

// 2. トレーニングメニュー部分
const TrainingSection = () => {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>今日のトレーニングメニュー</Text>
      <View style={styles.menuGrid}>
        <TouchableOpacity style={styles.menuItem} onPress={() => console.log('メニュー詳細へ')}>
          <View style={styles.menuIconCircle} />
          <Text style={styles.menuText}>○○○○○</Text>
          <Text style={styles.menuSetText}>○セット</Text>
        </TouchableOpacity>

        {/* 空の枠（モック） */}
        <TouchableOpacity style={styles.menuItem} onPress={() => console.log('追加')} />
        <TouchableOpacity style={styles.menuItem} onPress={() => console.log('追加')} />
        <TouchableOpacity style={styles.menuItem} onPress={() => console.log('追加')} />
        <TouchableOpacity style={styles.menuItem} onPress={() => console.log('追加')} />

        <TouchableOpacity style={styles.menuItem} onPress={() => console.log('もっと見る')}>
          <Text style={styles.dotsText}>•••</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// 3. 摂取カロリー & AI一言
const StatsSection = () => {
  return (
    <View style={styles.statsRow}>
      <TouchableOpacity style={styles.calorieBox} onPress={() => console.log('食事入力画面へ')}>
        <Text style={styles.calorieLabel}>摂取カロリー</Text>
        <Text style={styles.calorieValue}>0000kcal</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.aiBox} onPress={() => console.log('AI画面へ')}>
        {/* AIアドバイス表示エリア */}
      </TouchableOpacity>
    </View>
  );
};

// --- スクリーン設定 ---
function HomeScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <CalendarSection />
      <TrainingSection />
      <StatsSection />
    </ScrollView>
  );
}

// ダミー画面
function DummyScreen() {
  return <View style={styles.centered}><Text style={{ color: '#fff' }}>準備中</Text></View>;
}

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: '#2ecc71',
          tabBarInactiveTintColor: '#666',
          tabBarShowLabel: false,
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: ({ color }) => <Home color={color} size={28} /> }} />
        <Tab.Screen name="Training" component={DummyScreen} options={{ tabBarIcon: ({ color }) => <Dumbbell color={color} size={28} /> }} />
        <Tab.Screen name="Food" component={DummyScreen} options={{ tabBarIcon: ({ color }) => <Utensils color={color} size={28} /> }} />
        <Tab.Screen name="Other" component={DummyScreen} options={{ tabBarIcon: ({ color }) => <MoreHorizontal color={color} size={28} /> }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// --- スタイル定義 ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  contentContainer: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  // カレンダー関連
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  monthText: { fontSize: 40, color: '#fff', fontWeight: '300' },
  yearText: { fontSize: 24, color: '#fff', fontWeight: '300' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  weekDayText: { color: '#888', width: 40, textAlign: 'center', fontSize: 12 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  dayCell: { width: '14%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },

  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeDayCircle: { backgroundColor: '#2ecc71' }, // 今日（緑）
  trainedDayCircle: { backgroundColor: '#fff' },   // トレ日（白）

  dayText: { color: '#fff', fontSize: 16 },
  activeDayText: { color: '#fff', fontWeight: 'bold' },
  trainedDayText: { color: '#000', fontWeight: 'bold' }, // 白背景なので黒文字

  // トレーニング関連
  sectionTitle: {
    color: '#fff', fontSize: 14, textAlign: 'center', marginBottom: 15,
    borderBottomWidth: 1, borderBottomColor: '#444', paddingBottom: 10,
  },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  menuItem: {
    width: '48%', height: 60, borderWidth: 1, borderColor: '#444', borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', flexDirection: 'row', paddingHorizontal: 5,
  },
  menuIconCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#fff', marginRight: 5 },
  menuText: { color: '#fff', fontSize: 12, marginRight: 5 },
  menuSetText: { color: '#2ecc71', fontSize: 12 },
  dotsText: { color: '#fff', fontSize: 20, letterSpacing: 2 },

  // スタッツ関連
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  calorieBox: {
    backgroundColor: '#2a2a2a', borderRadius: 15, width: '48%', height: 80,
    justifyContent: 'center', alignItems: 'center', flexDirection: 'row', paddingHorizontal: 10,
  },
  calorieLabel: { color: '#fff', fontSize: 12, marginRight: 10 },
  calorieValue: { color: '#2ecc71', fontSize: 14 },
  aiBox: { backgroundColor: '#e0e0e0', borderRadius: 15, width: '48%', height: 80 },

  // タブバー
  tabBar: { backgroundColor: '#2a2a2a', borderTopWidth: 0, height: 60, paddingBottom: 10 },
});