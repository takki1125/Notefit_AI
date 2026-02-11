import React, { useState, useEffect } from 'react';
import {
    StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView,
    Modal, FlatList, ActivityIndicator, TextInput, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { Home, Dumbbell, Utensils, MoreHorizontal, Check, Clock, ChevronDown, Plus, X, Settings as SettingsIcon, LogOut } from 'lucide-react-native';

// Firebase関連
import { collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, auth } from './firebaseConfig';

// --- 定数・データ ---
const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const TRAINED_DAYS = [1, 5, 8, 12, 15, 20];

// --- コンポーネント: ログイン・新規登録画面 ---
function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false); // ログインか新規登録かの切り替え
    const [loading, setLoading] = useState(false);

    const handleAuthAction = async () => {
        setLoading(true);
        try {
            if (isSignUp) {
                // 新規登録
                await createUserWithEmailAndPassword(auth, email, password);
                Alert.alert('登録完了', 'アカウントが作成され、ログインしました。');
            } else {
                // ログイン
                await signInWithEmailAndPassword(auth, email, password);
                // ログイン成功すると自動的に画面が切り替わるのでアラートは不要
            }
        } catch (error) {
            let errorMessage = 'エラーが発生しました。';
            if (error.code === 'auth/email-already-in-use') errorMessage = 'このメールアドレスは既に使われています。';
            if (error.code === 'auth/invalid-email') errorMessage = 'メールアドレスの形式が正しくありません。';
            if (error.code === 'auth/user-not-found') errorMessage = 'ユーザーが見つかりません。新規登録してください。';
            if (error.code === 'auth/wrong-password') errorMessage = 'パスワードが間違っています。';
            if (error.code === 'auth/weak-password') errorMessage = 'パスワードは6文字以上で設定してください。';
            Alert.alert('エラー', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.loginContainer}>
            <View style={styles.loginBox}>
                <Text style={styles.loginTitle}>{isSignUp ? 'アカウント作成' : 'ログイン'}</Text>
                <TextInput
                    style={styles.inputField}
                    placeholder="メールアドレス"
                    placeholderTextColor="#888"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
                <TextInput
                    style={styles.inputField}
                    placeholder="パスワード (6文字以上)"
                    placeholderTextColor="#888"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
                <TouchableOpacity style={styles.loginButton} onPress={handleAuthAction} disabled={loading}>
                    {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.loginButtonText}>{isSignUp ? '新規登録' : 'ログイン'}</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={{ marginTop: 20 }}>
                    <Text style={styles.switchText}>
                        {isSignUp ? 'すでにアカウントをお持ちの方はこちら（ログイン）' : 'アカウントをお持ちでない方はこちら（新規登録）'}
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

// --- コンポーネント: 設定画面 ---
function SettingsScreen({ navigation }) {
    const handleSignOut = () => {
        Alert.alert('ログアウト', 'ログアウトしますか？', [
            { text: 'キャンセル', style: 'cancel' },
            {
                text: 'ログアウト',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await signOut(auth);
                    } catch (error) {
                        Alert.alert('エラー', 'ログアウトに失敗しました。');
                    }
                }
            },
        ]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerRowSimple}>
                <TouchableOpacity onPress={() => navigation.goBack()}><X color="#fff" size={24} /></TouchableOpacity>
                <Text style={styles.headerTitle}>設定</Text>
                <View style={{ width: 24 }} /> {/* レイアウト調整用のダミー */}
            </View>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.settingsItem} onPress={handleSignOut}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <LogOut color="#ff4444" size={20} style={{ marginRight: 10 }} />
                            <Text style={{ color: '#ff4444', fontSize: 16 }}>ログアウト</Text>
                        </View>
                    </TouchableOpacity>
                </View>
                {/* ここに将来的に他の設定項目を追加 */}
            </ScrollView>
        </SafeAreaView>
    );
}

// --- コンポーネント: カレンダー画面 (Home) ---
const CalendarSection = () => {
    return (
        <View style={styles.card}>
            <View style={styles.calendarHeader}>
                <Text style={styles.monthText}>2</Text>
                <Text style={styles.yearText}>2026</Text>
            </View>
            <View style={styles.weekRow}>
                {WEEKDAYS.map((day, index) => <Text key={index} style={styles.weekDayText}>{day}</Text>)}
            </View>
            <View style={styles.daysGrid}>
                {DAYS.map((day) => {
                    const isToday = day === 11; // 仮で今日を11日とする
                    const isTrained = TRAINED_DAYS.includes(day);
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
};

// ホーム画面 (ヘッダーに歯車追加)
function HomeScreen({ navigation }) {
    return (
        <SafeAreaView style={styles.container}>
            {/* ホーム画面専用ヘッダー */}
            <View style={styles.homeHeader}>
                <View>
                    <Text style={styles.headerLabel}>Welcome back,</Text>
                    <Text style={styles.routineText}>{auth.currentUser?.email?.split('@')[0] || 'User'}</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.iconButton}>
                    <SettingsIcon color="#fff" size={24} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <CalendarSection />

                <TouchableOpacity
                    style={styles.card}
                    onPress={() => navigation.navigate('TrainingTab')}
                >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                        <View>
                            <Text style={{ color: '#888', fontSize: 12, marginBottom: 4 }}>TODAY'S PLAN</Text>
                            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>胸・三頭筋の日 A</Text>
                        </View>
                        <View style={{ backgroundColor: '#2ecc71', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
                            <Dumbbell color="#000" size={20} />
                        </View>
                    </View>
                    <View style={{ gap: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#2ecc71', marginRight: 8 }} />
                            <Text style={{ color: '#ccc' }}>ベンチプレス</Text>
                            <Text style={{ color: '#666', marginLeft: 'auto' }}>80kg x 10</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#2ecc71', marginRight: 8 }} />
                            <Text style={{ color: '#ccc' }}>インクラインダンベル</Text>
                            <Text style={{ color: '#666', marginLeft: 'auto' }}>24kg x 12</Text>
                        </View>
                        <View style={{ marginTop: 5 }}>
                            <Text style={{ color: '#666', fontSize: 12 }}>+ 他 3 種目</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Stats</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.calorieBox}><Text style={styles.calorieLabel}>摂取カロリー</Text><Text style={styles.calorieValue}>1800kcal</Text></View>
                        <View style={styles.aiBox}><Text style={{ color: '#000', padding: 10 }}>AIアドバイス...</Text></View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// --- コンポーネント: 種目選択モーダル ---
// (前のコードと同じなので省略なしで記載)
const ExerciseSelectorModal = ({ visible, onClose, onSelect }) => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState(null);

    useEffect(() => {
        if (!visible) return;
        const fetchData = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "master_data"));
                const data = [];
                querySnapshot.forEach((doc) => {
                    data.push({ id: doc.id, ...doc.data() });
                });
                setCategories(data);
                if (data.length > 0) setSelectedCategory(data[0]);
            } catch (e) {
                console.error("Error fetching data: ", e);
                Alert.alert("エラー", "データの取得に失敗しました。");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [visible]);

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>種目を選択</Text>
                    <TouchableOpacity onPress={onClose}><X color="#fff" size={24} /></TouchableOpacity>
                </View>
                {loading ? (
                    <ActivityIndicator size="large" color="#2ecc71" style={{ marginTop: 50 }} />
                ) : (
                    <View style={{ flex: 1 }}>
                        <View style={{ height: 50 }}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
                                {categories.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[styles.tabBtn, selectedCategory?.id === cat.id && styles.activeTabBtn]}
                                        onPress={() => setSelectedCategory(cat)}
                                    >
                                        <Text style={[styles.tabText, selectedCategory?.id === cat.id && styles.activeTabText]}>{cat.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                        <FlatList
                            data={selectedCategory?.exercises || []}
                            keyExtractor={(item, index) => index.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.exerciseListItem} onPress={() => { onSelect(item); onClose(); }}>
                                    <Text style={styles.exerciseListText}>{item}</Text>
                                    <Plus color="#2ecc71" size={20} />
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                )}
            </SafeAreaView>
        </Modal>
    );
};

// --- コンポーネント: トレーニング画面 (メイン) ---
function TrainingScreen() {
    const [modalVisible, setModalVisible] = useState(false);
    const [menu, setMenu] = useState([
        { id: 1, name: 'ベンチプレス', target: '80kg x 10', sets: [{ weight: 80, reps: 10, done: true }, { weight: 80, reps: 8, done: false }] }
    ]);

    const handleAddExercise = (exerciseName) => {
        const newExercise = {
            id: Date.now(),
            name: exerciseName,
            target: '- kg x -',
            sets: [{ weight: '', reps: '', done: false }, { weight: '', reps: '', done: false }, { weight: '', reps: '', done: false }]
        };
        setMenu([...menu, newExercise]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.headerLabel}>Today's Workout</Text>
                    <TouchableOpacity style={styles.routineSelector}>
                        <Text style={styles.routineText}>自由メニュー</Text>
                        <ChevronDown color="#2ecc71" size={20} />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.timerButton}>
                    <Clock color="#000" size={20} />
                    <Text style={styles.timerText}>02:00</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {menu.map((item) => (
                    <View key={item.id} style={styles.exerciseCard}>
                        <View style={styles.exerciseHeader}>
                            <Text style={styles.exerciseName}>{item.name}</Text>
                            <MoreHorizontal color="#888" size={20} />
                        </View>
                        <View style={styles.exerciseInfo}>
                            <Text style={styles.infoText}>目標: <Text style={styles.highlightText}>{item.target}</Text></Text>
                        </View>
                        <View style={styles.setRowHeader}>
                            <Text style={styles.colLabel}>SET</Text>
                            <Text style={styles.colLabel}>KG</Text>
                            <Text style={styles.colLabel}>REPS</Text>
                            <Text style={styles.colLabel}>DONE</Text>
                        </View>
                        {item.sets.map((set, index) => (
                            <View key={index} style={styles.setRow}>
                                <View style={styles.setBadge}><Text style={styles.setText}>{index + 1}</Text></View>
                                <View style={styles.inputBox}><Text style={styles.inputValue}>{set.weight}</Text></View>
                                <View style={styles.inputBox}><Text style={styles.inputValue}>{set.reps}</Text></View>
                                <TouchableOpacity style={[styles.checkBtn, set.done && styles.checkedBtn]}>
                                    <Check color={set.done ? "#000" : "#444"} size={16} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                ))}

                <TouchableOpacity style={styles.addExerciseBtn} onPress={() => setModalVisible(true)}>
                    <Plus color="#000" size={20} />
                    <Text style={styles.addExerciseBtnText}>種目を追加する</Text>
                </TouchableOpacity>
            </ScrollView>

            <ExerciseSelectorModal visible={modalVisible} onClose={() => setModalVisible(false)} onSelect={handleAddExercise} />
        </SafeAreaView>
    );
}

// ダミー画面
function DummyScreen() { return <View style={styles.centered}><Text style={{ color: '#fff' }}>準備中</Text></View>; }

// --- ナビゲーション設定 ---
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// タブナビゲーション (ログイン後のメイン画面)
function MainTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: '#2ecc71',
                tabBarInactiveTintColor: '#666',
                tabBarShowLabel: false,
            }}
        >
            <Tab.Screen name="HomeTab" component={HomeStackNavigator} options={{ tabBarIcon: ({ color }) => <Home color={color} size={28} /> }} />
            <Tab.Screen name="TrainingTab" component={TrainingScreen} options={{ tabBarIcon: ({ color }) => <Dumbbell color={color} size={28} /> }} />
            <Tab.Screen name="FoodTab" component={DummyScreen} options={{ tabBarIcon: ({ color }) => <Utensils color={color} size={28} /> }} />
            <Tab.Screen name="OtherTab" component={DummyScreen} options={{ tabBarIcon: ({ color }) => <MoreHorizontal color={color} size={28} /> }} />
        </Tab.Navigator>
    );
}

// ホームタブ内のスタックナビゲーション (ホーム -> 設定画面への遷移用)
function HomeStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false, presentation: 'modal' }}>
            <Stack.Screen name="HomeScreen" component={HomeScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
    );
}

// メインコンポーネント (ログイン状態監視と画面切り替え)
export default function App() {
    const [user, setUser] = useState(null);
    const [initializing, setInitializing] = useState(true);

    // ログイン状態の変化を監視
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            if (initializing) setInitializing(false);
        });
        return unsubscribe; // クリーンアップ
    }, []);

    if (initializing) {
        return <View style={styles.centered}><ActivityIndicator size="large" color="#2ecc71" /></View>;
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {user ? (
                    // ログインしている場合
                    <Stack.Screen name="Main" component={MainTabNavigator} />
                ) : (
                    // ログインしていない場合
                    <Stack.Screen name="Login" component={LoginScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}

// --- スタイル定義 ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a1a' },
    contentContainer: { padding: 16, paddingBottom: 100 },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },
    centered: { flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: '#2a2a2a', borderRadius: 20, padding: 16, marginBottom: 20 },

    // ログイン画面
    loginContainer: { flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', padding: 20 },
    loginBox: { width: '100%', backgroundColor: '#2a2a2a', padding: 30, borderRadius: 20, alignItems: 'center' },
    loginTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 30 },
    inputField: { width: '100%', height: 50, backgroundColor: '#111', borderRadius: 10, paddingHorizontal: 15, color: '#fff', marginBottom: 15 },
    loginButton: { width: '100%', height: 50, backgroundColor: '#2ecc71', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    loginButtonText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
    switchText: { color: '#2ecc71', fontSize: 14 },

    // ヘッダー関連
    homeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20 },
    headerRowSimple: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#333' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    iconButton: { padding: 8 },

    // カレンダー (変更なし)
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

    // Stats (変更なし)
    sectionTitle: { color: '#fff', fontSize: 14, textAlign: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#444', paddingBottom: 10 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    calorieBox: { backgroundColor: '#2a2a2a', borderRadius: 15, width: '48%', height: 80, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
    calorieLabel: { color: '#fff', fontSize: 12, marginRight: 10 },
    calorieValue: { color: '#2ecc71', fontSize: 14 },
    aiBox: { backgroundColor: '#e0e0e0', borderRadius: 15, width: '48%', height: 80 },

    // Training Screen & Modal (変更なし)
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#333', marginBottom: 10, paddingTop: 20 },
    headerLabel: { color: '#888', fontSize: 12 },
    routineSelector: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    routineText: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginRight: 5 },
    timerButton: { flexDirection: 'row', backgroundColor: '#2ecc71', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, alignItems: 'center' },
    timerText: { color: '#000', fontWeight: 'bold', marginLeft: 5 },

    exerciseCard: { backgroundColor: '#2a2a2a', borderRadius: 16, padding: 16, marginBottom: 16 },
    exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    exerciseName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    exerciseInfo: { flexDirection: 'row', gap: 15, marginBottom: 15 },
    infoText: { color: '#888', fontSize: 12 },
    highlightText: { color: '#2ecc71' },

    setRowHeader: { flexDirection: 'row', marginBottom: 8, paddingHorizontal: 4 },
    colLabel: { color: '#666', fontSize: 10, width: '25%', textAlign: 'center' },
    setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    setBadge: { width: '25%', alignItems: 'center' },
    setText: { color: '#888', fontSize: 14 },
    inputBox: { width: '22%', height: 36, backgroundColor: '#111', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginHorizontal: '1.5%' },
    inputValue: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    checkBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', marginLeft: 'auto', marginRight: 'auto' },
    checkedBtn: { backgroundColor: '#2ecc71' },

    addExerciseBtn: { backgroundColor: '#2ecc71', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15, borderRadius: 10, marginTop: 20 },
    addExerciseBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },

    modalContainer: { flex: 1, backgroundColor: '#1a1a1a', paddingTop: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#333' },
    modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    tabScroll: { paddingHorizontal: 10, marginBottom: 10 },
    tabBtn: { paddingVertical: 8, paddingHorizontal: 16, marginRight: 10, borderRadius: 20, backgroundColor: '#333' },
    activeTabBtn: { backgroundColor: '#2ecc71' },
    tabText: { color: '#888' },
    activeTabText: { color: '#000', fontWeight: 'bold' },
    exerciseListItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#333' },
    exerciseListText: { color: '#fff', fontSize: 16 },

    tabBar: { backgroundColor: '#2a2a2a', borderTopWidth: 0, height: 60, paddingBottom: 10 },

    // 設定画面のスタイル
    settingsItem: { paddingVertical: 10 },
});