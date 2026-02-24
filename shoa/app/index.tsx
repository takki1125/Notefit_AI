import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// NavigationContainerはExpo Router環境では不要な場合が多いですが、
// ご友人のコードに合わせて念のため残しつつ、独立させます。
import { NavigationContainer } from '@react-navigation/native';
import { Home, Dumbbell, Utensils, MoreHorizontal, Mail, Lock, LogOut } from 'lucide-react-native';
import { useAuth } from '../hooks/useAuth'; // パスの階層を修正 (../hooks)

// ==========================================
// 1. 認証画面 (ログイン・新規登録)
// ==========================================
const AuthScreen = () => {
  const { login, signup } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) return Alert.alert("エラー", "入力してください");
    setLoading(true);
    try {
      if (isLoginMode) {
        await login(email, password);
      } else {
        // 新規登録
        await signup(email, password);
        // useAuth側で成功アラートが出るのでここでは何もしない
      }
    } catch (e: any) {
      // エラーはuseAuth側で処理、またはここで表示
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.centered}>
      <Text style={[styles.monthText, { marginBottom: 30 }]}>Notefit AI</Text>
      <View style={styles.inputContainer}>
        <Mail color="#888" size={20} />
        <TextInput 
          placeholder="メールアドレス" placeholderTextColor="#666" style={styles.input} 
          value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"
        />
      </View>
      <View style={styles.inputContainer}>
        <Lock color="#888" size={20} />
        <TextInput 
          placeholder="パスワード (6文字以上)" placeholderTextColor="#666" style={styles.input} secureTextEntry 
          value={password} onChangeText={setPassword}
        />
      </View>
      <TouchableOpacity style={styles.authButton} onPress={handleAuth} disabled={loading}>
        {loading ? <ActivityIndicator color="#000" /> : (
          <Text style={styles.authButtonText}>{isLoginMode ? "ログイン" : "新規登録"}</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setIsLoginMode(!isLoginMode)} style={{ marginTop: 20 }}>
        <Text style={{ color: '#2ecc71' }}>{isLoginMode ? "新規登録はこちら" : "ログインはこちら"}</Text>
      </TouchableOpacity>
    </View>
  );
};

// ==========================================
// 2. メール確認待ち画面 (ここが門番！)
// ==========================================
const VerificationScreen = () => {
  const { user, reloadUser, resendEmail, logout } = useAuth();

  const handleCheck = async () => {
    const isVerified = await reloadUser();
    if (isVerified) {
      Alert.alert("成功", "確認できました！ホームへ移動します。");
    } else {
      Alert.alert("未完了", "まだ確認が取れていません。\nメール内のリンクを押しましたか？");
    }
  };

  return (
    <View style={styles.centered}>
      <Mail color="#2ecc71" size={60} style={{ marginBottom: 20 }} />
      <Text style={{ color: '#fff', fontSize: 20, marginBottom: 10, fontWeight:'bold' }}>メールを確認してください</Text>
      <Text style={{ color: '#aaa', textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 }}>
        {user?.email} 宛に確認メールを送信しました。
      </Text>
      
      <Text style={{ color: 'red', marginBottom: 20 }}>
        現在の状態: {user?.emailVerified ? "確認済み" : "未確認"}
      </Text>

      <TouchableOpacity style={styles.authButton} onPress={handleCheck}>
        <Text style={styles.authButtonText}>リンクを押したので更新</Text>
      </TouchableOpacity>

      <TouchableOpacity style={{ marginTop: 20 }} onPress={resendEmail}>
        <Text style={{ color: '#2ecc71' }}>メールが届かない場合は再送</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={{ marginTop: 40 }} onPress={logout}>
        <Text style={{ color: '#ff4444' }}>最初に戻る（ログアウト）</Text>
      </TouchableOpacity>
    </View>
  );
};

// ==========================================
// 3. メインアプリ (ご友人の作ったUI)
// ==========================================

// --- ここからご友人のコードの部品 ---
const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const TRAINED_DAYS = [1, 5, 8, 12, 15, 20];

const CalendarSection = () => (
  <View style={styles.card}>
    <View style={styles.calendarHeader}>
      <Text style={styles.monthText}>2</Text>
      <Text style={styles.yearText}>2026</Text>
    </View>
    <View style={styles.weekRow}>{WEEKDAYS.map((d, i) => <Text key={i} style={styles.weekDayText}>{d}</Text>)}</View>
    <View style={styles.daysGrid}>
      {DAYS.map((day) => {
        const isToday = day === 15; const isTrained = TRAINED_DAYS.includes(day);
        return (
          <TouchableOpacity key={day} style={styles.dayCell}>
            <View style={[styles.dayCircle, isToday && styles.activeDayCircle, isTrained && styles.trainedDayCircle]}>
              <Text style={[styles.dayText, isToday && styles.activeDayText, isTrained && styles.trainedDayText]}>{day}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

const TrainingSection = () => (
  <View style={styles.card}>
    <Text style={styles.sectionTitle}>今日のメニュー</Text>
    <View style={styles.menuGrid}>
      <TouchableOpacity style={styles.menuItem}><View style={styles.menuIconCircle} /><Text style={styles.menuText}>ベンチ</Text><Text style={styles.menuSetText}>3set</Text></TouchableOpacity>
      {/* 他のメニュー項目は省略 */}
    </View>
  </View>
);

const StatsSection = () => (
  <View style={styles.statsRow}>
    <TouchableOpacity style={styles.calorieBox}><Text style={styles.calorieLabel}>摂取</Text><Text style={styles.calorieValue}>1800kcal</Text></TouchableOpacity>
    <TouchableOpacity style={styles.aiBox}><Text style={{fontSize:10}}>AI...</Text></TouchableOpacity>
  </View>
);

function HomeScreen() {
  const { logout } = useAuth();
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:10}}>
        <Text style={{color:'#fff', fontSize:18, fontWeight:'bold'}}>こんにちは</Text>
        <TouchableOpacity onPress={logout}><LogOut color="#ff4444"/></TouchableOpacity>
      </View>
      <CalendarSection />
      <TrainingSection />
      <StatsSection />
    </ScrollView>
  );
}

function DummyScreen() { return <View style={styles.centered}><Text style={{color:'#fff'}}>準備中</Text></View>; }
const Tab = createBottomTabNavigator();

// メインアプリ部分をまとめる
const MainApp = () => {
  return (
    // independent={true} は NavigationContainer の重複エラーを防ぐおまじない
    <NavigationContainer independent={true}>
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
};

// ==========================================
// 4. アプリ全体 (条件分岐の根元)
// ==========================================
export default function App() {
  const { user, loading } = useAuth();

  // 1. 読み込み中
  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2ecc71" /></View>;

  // 2. ログインしていない → AuthScreen
  if (!user) return <AuthScreen />;

  // 3. メール未確認 → VerificationScreen (★ここでブロック！)
  if (!user.emailVerified) return <VerificationScreen />;

  // 4. 全てOK → MainApp (友人のUI)
  return <MainApp />;
}

// --- スタイル定義 (統合版) ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  contentContainer: { padding: 16, paddingTop: 60, paddingBottom: 40 },
  centered: { flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { backgroundColor: '#2a2a2a', borderRadius: 20, padding: 16, marginBottom: 20 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', borderRadius: 10, paddingHorizontal: 15, marginBottom: 15, width: '100%', height: 50 },
  input: { flex: 1, color: '#fff', marginLeft: 10 },
  authButton: { backgroundColor: '#2ecc71', width: '100%', height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  authButtonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  
  // ご友人のスタイル
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, paddingHorizontal: 10 },
  monthText: { fontSize: 40, color: '#fff', fontWeight: '300' },
  yearText: { fontSize: 24, color: '#fff', fontWeight: '300' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  weekDayText: { color: '#888', width: 40, textAlign: 'center', fontSize: 12 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  dayCell: { width: '14%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  dayCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  activeDayCircle: { backgroundColor: '#2ecc71' },
  trainedDayCircle: { backgroundColor: '#fff' },
  dayText: { color: '#fff', fontSize: 16 },
  activeDayText: { color: '#fff', fontWeight: 'bold' },
  trainedDayText: { color: '#000', fontWeight: 'bold' },
  sectionTitle: { color: '#fff', fontSize: 14, textAlign: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#444', paddingBottom: 10 },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  menuItem: { width: '48%', height: 60, borderWidth: 1, borderColor: '#444', borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', paddingHorizontal: 5 },
  menuIconCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#fff', marginRight: 5 },
  menuText: { color: '#fff', fontSize: 12, marginRight: 5 },
  menuSetText: { color: '#2ecc71', fontSize: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  calorieBox: { backgroundColor: '#2a2a2a', borderRadius: 15, width: '48%', height: 80, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', paddingHorizontal: 10 },
  calorieLabel: { color: '#fff', fontSize: 12, marginRight: 10 },
  calorieValue: { color: '#2ecc71', fontSize: 14 },
  aiBox: { backgroundColor: '#e0e0e0', borderRadius: 15, width: '48%', height: 80 },
  tabBar: { backgroundColor: '#2a2a2a', borderTopWidth: 0, height: 60, paddingBottom: 10 },
});