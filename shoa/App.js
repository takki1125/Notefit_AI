import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView,
    Modal, FlatList, SectionList, ActivityIndicator, TextInput, Alert, KeyboardAvoidingView, Platform,
    Linking, Dimensions
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';

<<<<<<< Updated upstream
// ↓↓↓ ここに Trash2 を追加 ↓↓↓
import { Home, Dumbbell, Utensils, MoreHorizontal, Check, Clock, ChevronDown, Plus, X, Settings as SettingsIcon, LogOut, Trash2, Mail, BarChart2 } from 'lucide-react-native';
=======
// ↓↓↓ アイコン類 ↓↓↓
import { Home, Dumbbell, Utensils, MoreHorizontal, Check, Clock, ChevronDown, Plus, X, Settings as SettingsIcon, LogOut, Trash2, Mail } from 'lucide-react-native';
>>>>>>> Stashed changes

// Firestore
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';

<<<<<<< Updated upstream
// ↓↓↓ ここに deleteUser を追加 ↓↓↓
=======
// ↓↓↓ Auth関連 (sendEmailVerificationを追加) ↓↓↓
>>>>>>> Stashed changes
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, deleteUser, sendEmailVerification } from 'firebase/auth';
import { db, auth } from './firebaseConfig';

import { LineChart, BarChart } from 'react-native-chart-kit';

// --- 定数・データ ---
const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);
const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const TRAINED_DAYS = [1, 5, 8, 12, 15, 20];

<<<<<<< Updated upstream
const VerificationScreen = ({ onCheckVerified }) => {
    const [loading, setLoading] = useState(false);

=======
// ==========================================
// ★追加: メール確認待ち画面 (VerificationScreen)
// ==========================================
const VerificationScreen = ({ onCheckVerified }) => {
    const [loading, setLoading] = useState(false);

    // 確認ボタンを押した時の処理
>>>>>>> Stashed changes
    const handleCheck = async () => {
        setLoading(true);
        try {
            await auth.currentUser.reload(); // Firebase上の最新情報を取得
            if (auth.currentUser.emailVerified) {
                Alert.alert("確認成功", "本人確認が完了しました！");
<<<<<<< Updated upstream
                onCheckVerified(); // Appコンポーネントに通知して画面を切り替える
=======
                onCheckVerified(); // 親コンポーネント(App)に通知して画面を切り替える
>>>>>>> Stashed changes
            } else {
                Alert.alert("未完了", "まだ確認が取れていません。\nメール内のリンクをクリックしましたか？");
            }
        } catch (e) {
            Alert.alert("エラー", "情報の更新に失敗しました。");
        } finally {
            setLoading(false);
        }
    };

<<<<<<< Updated upstream
=======
    // メール再送
>>>>>>> Stashed changes
    const handleResend = async () => {
        try {
            await sendEmailVerification(auth.currentUser);
            Alert.alert("送信成功", "確認メールを再送しました。");
        } catch (e) {
<<<<<<< Updated upstream
            if (e.code === 'auth/too-many-requests') {
                Alert.alert("エラー", "送信回数が多すぎます。少し時間を空けてください。");
            } else {
                Alert.alert("エラー", "メールの送信に失敗しました。");
            }
=======
            Alert.alert("エラー", "メールの送信に失敗しました。\n少し時間を空けてください。");
>>>>>>> Stashed changes
        }
    };

    return (
<<<<<<< Updated upstream
        <SafeAreaView style={styles.loginContainer}>
            <View style={[styles.loginBox, { alignItems: 'center', paddingVertical: 40 }]}>
                <Mail color="#2ecc71" size={60} style={{ marginBottom: 20 }} />
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 15 }}>メールを確認してください</Text>

                <Text style={{ color: '#ccc', textAlign: 'center', marginBottom: 30, lineHeight: 24 }}>
                    <Text style={{ color: '#2ecc71', fontWeight: 'bold' }}>{auth.currentUser?.email}</Text>{"\n"}
                    宛に確認メールを送信しました。{"\n"}
                    メール内のリンクをクリックしてから、{"\n"}下のボタンを押してください。
                </Text>

                <TouchableOpacity style={[styles.loginButton, { width: '100%' }]} onPress={handleCheck} disabled={loading}>
                    {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.loginButtonText}>確認完了ボタン</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={{ marginTop: 25, padding: 10 }} onPress={handleResend}>
                    <Text style={{ color: '#2ecc71', textDecorationLine: 'underline' }}>メールが届かない場合は再送</Text>
                </TouchableOpacity>

                {/* ログアウト（やり直し）ボタン */}
                <TouchableOpacity style={{ marginTop: 20, padding: 10 }} onPress={() => signOut(auth)}>
                    <Text style={{ color: '#ff4444' }}>別のアカウントでやり直す</Text>
=======
        <SafeAreaView style={styles.centered}>
            <View style={{ padding: 20, alignItems: 'center', width: '100%' }}>
                <Mail color="#2ecc71" size={60} style={{ marginBottom: 20 }} />
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 10 }}>メールを確認してください</Text>
                <Text style={{ color: '#ccc', textAlign: 'center', marginBottom: 30, lineHeight: 22 }}>
                    <Text style={{ color: '#2ecc71', fontWeight: 'bold' }}>{auth.currentUser?.email}</Text>
                    {"\n"}宛に確認メールを送信しました。{"\n"}メール内のリンクをクリックしてから、{"\n"}下のボタンを押してください。
                </Text>

                <TouchableOpacity style={styles.loginButton} onPress={handleCheck} disabled={loading}>
                    {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.loginButtonText}>確認完了ボタン</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={{ marginTop: 20, padding: 10 }} onPress={handleResend}>
                    <Text style={{ color: '#2ecc71' }}>メールが届かない場合は再送</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ marginTop: 40 }} onPress={() => signOut(auth)}>
                    <Text style={{ color: '#ff4444' }}>最初に戻る（ログアウト）</Text>
>>>>>>> Stashed changes
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

<<<<<<< Updated upstream
// --- コンポーネント: ログイン・新規登録画面 (メール認証対応版) ---
=======
// --- コンポーネント: ログイン・新規登録画面 (修正版) ---
>>>>>>> Stashed changes
function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [agreed, setAgreed] = useState(false);
<<<<<<< Updated upstream
    const [termsOpened, setTermsOpened] = useState(false);
=======
>>>>>>> Stashed changes

    const handleAuthAction = async () => {
        if (isSignUp && !agreed) {
            Alert.alert('確認', '利用規約への同意が必要です。');
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
<<<<<<< Updated upstream
                // 新規登録
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // 認証メールを送信
                await sendEmailVerification(user);
                // ★ここで強制ログアウトはしない！そのままログイン状態にする

=======
                // ★新規登録時はメールを送る
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                
                // 確認メール送信
                await sendEmailVerification(user);
                Alert.alert('登録成功', '確認メールを送信しました。\nメールボックスを確認してください。');
>>>>>>> Stashed changes
            } else {
                await signInWithEmailAndPassword(auth, email, password);
                // ★未認証かどうかで弾く処理は削除（Appコンポーネントが勝手にVerify画面へ飛ばしてくれるため）
            }
        } catch (error) {
            let errorMessage = 'エラーが発生しました。';
            if (error.code === 'auth/email-already-in-use') errorMessage = 'このメールアドレスは既に使われています。';
            if (error.code === 'auth/invalid-email') errorMessage = 'メールアドレスの形式が正しくありません。';
            if (error.code === 'auth/user-not-found') errorMessage = 'ユーザーが見つかりません。';
            if (error.code === 'auth/wrong-password') errorMessage = 'パスワードが間違っています。';
            if (error.code === 'auth/weak-password') errorMessage = 'パスワードは6文字以上で設定してください。';
            Alert.alert('エラー', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const openTerms = () => {
        Linking.openURL('https://takki1125.github.io/Notefit-AI-docs/');
        setTermsOpened(true);
    };

    const handleCheckboxPress = () => {
        if (!termsOpened) {
            Alert.alert("確認", "チェックを入れる前に、利用規約のリンクをタップして内容を確認してください。");
            return;
        }
        setAgreed(!agreed);
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

                {isSignUp && (
                    <View style={styles.termsContainer}>
                        <TouchableOpacity
                            style={[
                                styles.checkbox,
                                agreed && styles.checkboxChecked,
                                !termsOpened && { opacity: 0.5, borderColor: '#444' }
                            ]}
                            onPress={handleCheckboxPress}
                        >
                            {agreed && <Check size={14} color="#000" />}
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.termsText}>
                                <Text style={styles.linkText} onPress={openTerms}>利用規約</Text>
                                に同意する
                            </Text>
                        </View>
                    </View>
                )}

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

// --- 以下、既存のコンポーネント群 (変更なしですが、一応全て含めます) ---
// SettingsScreen, WorkoutDetailModal, CalendarSection, HomeScreen, ExerciseSelectorModal, RoutineModal, TrainingScreen...
// 長くなるので、Appコンポーネント以外のロジックは変更していませんが、
// 上書き用に「Appコンポーネント」を修正します。

// (※ご友人の既存コード部分はそのまま動作するように配置します)

function SettingsScreen({ navigation }) {
    const handleSignOut = () => {
        Alert.alert('ログアウト', 'ログアウトしますか？', [
            { text: 'キャンセル', style: 'cancel' },
            { text: 'ログアウト', style: 'destructive', onPress: async () => { await signOut(auth); } },
        ]);
    };

    const handleDeleteAccount = () => {
        Alert.alert('アカウント削除', '本当に削除しますか？\n(データは復旧できません)', [
            { text: 'キャンセル', style: 'cancel' },
            {
                text: '削除', style: 'destructive', onPress: async () => {
                    try {
                        const user = auth.currentUser;
                        if (user) await deleteUser(user);
                    } catch (error) {
                        if (error.code === 'auth/requires-recent-login') {
                            Alert.alert('エラー', 'セキュリティのため、再ログインしてから実行してください。');
                        } else {
                            Alert.alert('エラー', '削除に失敗しました。');
                        }
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
                <View style={{ width: 24 }} />
            </View>
            <ScrollView contentContainerStyle={styles.contentContainer}>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.settingsItem} onPress={handleSignOut}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <LogOut color="#fff" size={20} style={{ marginRight: 10 }} />
                            <Text style={{ color: '#fff', fontSize: 16 }}>ログアウト</Text>
                        </View>
                    </TouchableOpacity>
                </View>
                <View style={[styles.card, { marginTop: 20, borderColor: '#ff4444', borderWidth: 1 }]}>
                    <TouchableOpacity style={styles.settingsItem} onPress={handleDeleteAccount}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Trash2 color="#ff4444" size={20} style={{ marginRight: 10 }} />
                            <Text style={{ color: '#ff4444', fontSize: 16, fontWeight: 'bold' }}>アカウントを削除</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// ... (他のコンポーネントは省略せず、前のコードと同じものを使いますが、
// 実際のファイルではここにある SettingsScreen, WorkoutDetailModal, CalendarSection, HomeScreen,
// ExerciseSelectorModal, RoutineModal, TrainingScreen, DummyScreen, Tab/Stack設定などは
// **元のファイルのまま** で大丈夫です。
// ★★★ 一番下の `export default function App` だけ書き換えるのが一番早いです ★★★ 
// ですが、丸ごとコピー用にここに全部記述しますね)

// --- 省略されたコンポーネント群 (コピペ用) ---
const WorkoutDetailModal = ({ visible, onClose, workout, onDelete }) => {
    if (!workout) return null;
    return (
        <Modal visible={visible} animationType="fade" transparent={true}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 }}>
                <View style={{ backgroundColor: '#2a2a2a', borderRadius: 20, maxHeight: '80%' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#444' }}>
                        <View>
                            <Text style={{ color: '#888', fontSize: 12 }}>{workout.dateStr}</Text>
                            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>{workout.routineName}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 15 }}>
                            <TouchableOpacity onPress={() => {
                                Alert.alert("削除", "本当に削除しますか？", [{text:"キャンセル"}, {text:"削除", style:'destructive', onPress:()=>onDelete(workout.id)}]);
                            }}>
                                <Trash2 color="#ff4444" size={24} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onClose}><X color="#fff" size={24} /></TouchableOpacity>
                        </View>
                    </View>
                    <ScrollView contentContainerStyle={{ padding: 16 }}>
                        {workout.exercises.map((ex, i) => (
                            <View key={i} style={{ marginBottom: 20 }}>
                                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom:5 }}>{ex.name}</Text>
                                {ex.sets.map((set, k) => (
                                    <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderColor: '#333' }}>
                                        <Text style={{ color: '#888' }}>SET {k + 1}</Text>
                                        <Text style={{ color: '#fff' }}>{set.weight}kg × {set.reps}reps</Text>
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

const CalendarSection = ({ trainedDays, onDayPress }) => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth() + 1;
    const daysInMonth = new Date(today.getFullYear(), currentMonth, 0).getDate();
    const DAYS = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
        <View style={styles.card}>
            <View style={styles.calendarHeader}>
                <Text style={styles.monthText}>{currentMonth}</Text>
                <Text style={styles.yearText}>{today.getFullYear()}</Text>
            </View>
            <View style={styles.weekRow}>{WEEKDAYS.map((d, i) => <Text key={i} style={styles.weekDayText}>{d}</Text>)}</View>
            <View style={styles.daysGrid}>
                {DAYS.map((day) => {
                    const isToday = day === currentDay;
                    const isTrained = trainedDays.includes(day);
                    return (
                        <TouchableOpacity key={day} style={styles.dayCell} onPress={() => onDayPress(day)}>
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

function HomeScreen({ navigation }) {
    const [history, setHistory] = useState([]);
    const [trainedDays, setTrainedDays] = useState([]);
    const [lastWorkout, setLastWorkout] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedWorkout, setSelectedWorkout] = useState(null);

    const fetchHistory = useCallback(async () => {
        const user = auth.currentUser;
        if (!user) return;
        try {
            const q = query(collection(db, "users", user.uid, "workouts"), orderBy("date", "desc"));
            const snapshot = await getDocs(q);
            const historyData = [];
            const days = [];
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                const dateObj = data.date ? data.date.toDate() : new Date();
                historyData.push({ id: doc.id, ...data, dateObj, dateStr: dateObj.toLocaleDateString(), day: dateObj.getDate() });
                days.push(dateObj.getDate());
            });
            setHistory(historyData);
            setTrainedDays([...new Set(days)]);
            setLastWorkout(historyData.length > 0 ? historyData[0] : null);
        } catch (e) { console.error(e); }
    }, []);

    useFocusEffect(useCallback(() => { fetchHistory(); }, [fetchHistory]));

    const handleDayPress = (day) => {
        const targetWorkout = history.find(item => item.day === day);
        if (targetWorkout) { setSelectedWorkout(targetWorkout); setModalVisible(true); }
    };

    const handleDeleteWorkout = async (workoutId) => {
        try {
            const user = auth.currentUser;
            if (!user) return;
            await deleteDoc(doc(db, "users", user.uid, "workouts", workoutId));
            Alert.alert("削除完了", "記録を削除しました。");
            setModalVisible(false);
            fetchHistory();
        } catch (error) { Alert.alert("エラー", "削除失敗"); }
    };

    return (
        <SafeAreaView style={styles.container}>
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
                <CalendarSection trainedDays={trainedDays} onDayPress={handleDayPress} />
                <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('TrainingTab')}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                        <View>
                            <Text style={{ color: '#888', fontSize: 12 }}>LATEST WORKOUT</Text>
                            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>{lastWorkout ? lastWorkout.routineName : "START WORKOUT"}</Text>
                        </View>
                        <View style={{ backgroundColor: '#2ecc71', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}><Dumbbell color="#000" size={20} /></View>
                    </View>
                </TouchableOpacity>
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Stats</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.calorieBox}><Text style={styles.calorieLabel}>合計ワークアウト</Text><Text style={styles.calorieValue}>{trainedDays.length}回</Text></View>
                        <View style={styles.aiBox}><Text style={{ color: '#000', padding: 10 }}>継続は力なり！</Text></View>
                    </View>
                </View>
            </ScrollView>
            <WorkoutDetailModal visible={modalVisible} onClose={() => setModalVisible(false)} workout={selectedWorkout} onDelete={handleDeleteWorkout} />
        </SafeAreaView>
    );
}

const ExerciseSelectorModal = ({ visible, onClose, onSelect }) => {
    const [categories, setCategories] = useState([]);
    useEffect(() => {
        if (!visible) return;
        const fetchData = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "master_data"));
                const data = [];
                querySnapshot.forEach((doc) => {
                    const docData = doc.data();
                    let sections = [];
                    if (docData.categories) {
                        Object.keys(docData.categories).forEach(key => {
                            if (docData.categories[key].exercises) sections.push({ title: key, data: docData.categories[key].exercises });
                        });
                    }
                    data.push({ id: doc.id, label: docData.label || doc.id, sections });
                });
                setCategories(data);
            } catch (e) { Alert.alert("エラー", "データ読み込み失敗"); }
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
                <ScrollView>
                    {categories.map((cat, i) => (
                        <View key={i} style={{marginBottom:20}}>
                            <Text style={{color:'#888', padding:10, backgroundColor:'#222'}}>{cat.label}</Text>
                            {cat.sections.map((sec, j) => (
                                <View key={j}>
                                    <Text style={styles.sectionHeader}><Text style={styles.sectionHeaderText}>{sec.title}</Text></Text>
                                    {sec.data.map((ex, k) => (
                                        <TouchableOpacity key={k} style={styles.exerciseListItem} onPress={() => { onSelect(ex); onClose(); }}>
                                            <Text style={styles.exerciseListText}>{ex}</Text>
                                            <Plus color="#2ecc71" size={20} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ))}
                        </View>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};

const RoutineModal = ({ visible, onClose, currentMenu, onLoadRoutine }) => {
    const [routines, setRoutines] = useState([]);
    const [mode, setMode] = useState('list');
    const [newRoutineName, setNewRoutineName] = useState("");

    const fetchRoutines = async () => {
        const user = auth.currentUser;
        if (!user) return;
        const q = query(collection(db, "users", user.uid, "routines"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        setRoutines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    useEffect(() => { if (visible) { fetchRoutines(); setMode('list'); } }, [visible]);

    const handleSave = async () => {
        if (!newRoutineName) return Alert.alert("エラー", "名前を入力してください");
        const user = auth.currentUser;
        await addDoc(collection(db, "users", user.uid, "routines"), { name: newRoutineName, exercises: currentMenu, createdAt: serverTimestamp() });
        setMode('list'); fetchRoutines();
    };

    const handleDelete = async (id) => {
        const user = auth.currentUser;
        await deleteDoc(doc(db, "users", user.uid, "routines", id));
        fetchRoutines();
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{mode === 'list' ? 'ルーティン' : '保存'}</Text>
                    <TouchableOpacity onPress={onClose}><X color="#fff" size={24} /></TouchableOpacity>
                </View>
                {mode === 'list' ? (
                    <View style={{flex:1, padding:16}}>
                        <TouchableOpacity style={styles.createRoutineBtn} onPress={() => setMode('save')}>
                            <Plus color="#000" size={20} /><Text style={styles.createRoutineText}>現在のメニューを保存</Text>
                        </TouchableOpacity>
                        <FlatList data={routines} keyExtractor={item => item.id} renderItem={({item}) => (
                            <TouchableOpacity style={styles.routineItem} onPress={() => { onLoadRoutine(item); onClose(); }}>
                                <View><Text style={styles.routineNameText}>{item.name}</Text></View>
                                <TouchableOpacity onPress={() => handleDelete(item.id)}><Trash2 color="#444" size={20}/></TouchableOpacity>
                            </TouchableOpacity>
                        )} />
                    </View>
                ) : (
                    <View style={{padding:20}}>
                        <TextInput style={styles.inputField} placeholder="ルーティン名" placeholderTextColor="#666" value={newRoutineName} onChangeText={setNewRoutineName} autoFocus />
                        <View style={{flexDirection:'row', gap:10, marginTop:20}}>
                            <TouchableOpacity style={[styles.loginButton, {backgroundColor:'#444', flex:1}]} onPress={() => setMode('list')}><Text style={{color:'#fff'}}>キャンセル</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.loginButton, {flex:1}]} onPress={handleSave}><Text style={{fontWeight:'bold'}}>保存</Text></TouchableOpacity>
                        </View>
                    </View>
                )}
            </SafeAreaView>
        </Modal>
    );
};

<<<<<<< Updated upstream
// --- コンポーネント: ルーティン管理モーダル (保存 & 読み込み) ---
const RoutineModal = ({ visible, onClose, currentMenu, onLoadRoutine }) => {
    const [routines, setRoutines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newRoutineName, setNewRoutineName] = useState("");
    const [mode, setMode] = useState('list'); // 'list' (一覧) or 'save' (保存画面)

    // ルーティン一覧を取得
    const fetchRoutines = async () => {
        const user = auth.currentUser;
        if (!user) return;
        setLoading(true);
        try {
            const q = query(collection(db, "users", user.uid, "routines"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRoutines(data);
        } catch (e) {
            console.error(e);
            Alert.alert("エラー", "ルーティンの取得に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    // モーダルが開くたびに一覧を更新
    useEffect(() => {
        if (visible) {
            fetchRoutines();
            setMode('list');
            setNewRoutineName("");
        }
    }, [visible]);

    // ルーティンを保存
    const handleSaveRoutine = async () => {
        if (!newRoutineName.trim()) {
            Alert.alert("エラー", "ルーティン名を入力してください");
            return;
        }
        if (currentMenu.length === 0) {
            Alert.alert("エラー", "種目が追加されていません");
            return;
        }

        setLoading(true);
        try {
            const user = auth.currentUser;
            // ルーティン用データを作成 (セットの中身は空にするか、重量を残すか選べるが、今回は重量も残す設定)
            const routineData = {
                name: newRoutineName,
                exercises: currentMenu,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, "users", user.uid, "routines"), routineData);
            Alert.alert("保存完了", `「${newRoutineName}」を保存しました`);
            setMode('list');
            fetchRoutines(); // リスト更新
        } catch (e) {
            console.error(e);
            Alert.alert("エラー", "保存に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    // ルーティン削除
    const handleDeleteRoutine = async (id) => {
        Alert.alert("削除", "このルーティンを削除しますか？", [
            { text: "キャンセル", style: "cancel" },
            {
                text: "削除", style: "destructive",
                onPress: async () => {
                    try {
                        const user = auth.currentUser;
                        await deleteDoc(doc(db, "users", user.uid, "routines", id));
                        fetchRoutines();
                    } catch (e) {
                        Alert.alert("エラー", "削除できませんでした");
                    }
                }
            }
        ]);
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                        {mode === 'list' ? 'ルーティンを選択' : 'ルーティンを保存'}
                    </Text>
                    <TouchableOpacity onPress={onClose}><X color="#fff" size={24} /></TouchableOpacity>
                </View>

                {mode === 'list' ? (
                    <View style={{ flex: 1, padding: 16 }}>
                        {/* 新規保存ボタン */}
                        <TouchableOpacity
                            style={styles.createRoutineBtn}
                            onPress={() => setMode('save')}
                        >
                            <Plus color="#000" size={20} />
                            <Text style={styles.createRoutineText}>現在のメニューを保存する</Text>
                        </TouchableOpacity>

                        <Text style={{ color: '#666', marginTop: 20, marginBottom: 10 }}>SAVED ROUTINES</Text>

                        {loading ? <ActivityIndicator /> : (
                            <FlatList
                                data={routines}
                                keyExtractor={item => item.id}
                                ListEmptyComponent={<Text style={{ color: '#444', textAlign: 'center', marginTop: 20 }}>保存されたルーティンはありません</Text>}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.routineItem}
                                        onPress={() => { onLoadRoutine(item); onClose(); }}
                                    >
                                        <View>
                                            <Text style={styles.routineNameText}>{item.name}</Text>
                                            <Text style={styles.routineDescText}>{item.exercises.length} 種目</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => handleDeleteRoutine(item.id)} style={{ padding: 10 }}>
                                            <Trash2 color="#444" size={20} />
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                ) : (
                    <View style={{ flex: 1, padding: 20 }}>
                        <Text style={{ color: '#ccc', marginBottom: 10 }}>現在のメニュー内容をルーティンとして保存します。</Text>
                        <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 20 }}>
                            {currentMenu.map(e => e.name).join(', ')}
                        </Text>

                        <TextInput
                            style={styles.inputField}
                            placeholder="ルーティン名 (例: 胸の日 A)"
                            placeholderTextColor="#666"
                            value={newRoutineName}
                            onChangeText={setNewRoutineName}
                            autoFocus
                        />

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                            <TouchableOpacity style={[styles.loginButton, { backgroundColor: '#444', flex: 1 }]} onPress={() => setMode('list')}>
                                <Text style={{ color: '#fff' }}>キャンセル</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.loginButton, { flex: 1 }]} onPress={handleSaveRoutine}>
                                <Text style={{ fontWeight: 'bold' }}>保存</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </SafeAreaView>
        </Modal>
    );
};

// --- コンポーネント: トレーニング画面 (タイマー & 集中モード搭載版) ---
function TrainingScreen({ navigation }) {
    const [modalVisible, setModalVisible] = useState(false);
    const [routineModalVisible, setRoutineModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    const [menu, setMenu] = useState([]);
    const [currentRoutineName, setCurrentRoutineName] = useState("自由メニュー");

    // ★追加: タイマー用の状態
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [isTimerActive, setIsTimerActive] = useState(false);

    // ★追加: メニューの増減を監視してタイマーと集中モードを制御
    useEffect(() => {
        if (menu.length > 0) {
            setIsTimerActive(true); // 種目があればタイマー開始
            // 下のタブメニューを隠す
            navigation.setOptions({ tabBarStyle: { display: 'none' } });
        } else {
            setIsTimerActive(false); // 種目がゼロならタイマー停止
            setTimerSeconds(0);      // リセット
            // 下のタブメニューを再表示
            navigation.setOptions({ tabBarStyle: { backgroundColor: '#1a1a1a', borderTopColor: '#333' } });
        }
    }, [menu.length, navigation]);

    // ★追加: タイマーを1秒ずつ進める処理
    useEffect(() => {
        let interval = null;
        if (isTimerActive) {
            interval = setInterval(() => {
                setTimerSeconds((sec) => sec + 1);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isTimerActive]);

    // ★追加: 秒数を MM:SS に変換する関数
    const formatTime = (totalSeconds) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
    };

    const handleAddExercise = (exerciseName) => {
        const newExercise = {
            id: Date.now(),
            name: exerciseName,
            target: '- kg x -',
            sets: [{ weight: '', reps: '', done: false }]
        };
        setMenu([...menu, newExercise]);
    };

    const handleLoadRoutine = (routine) => {
        Alert.alert(
            "ルーティン読み込み",
            "現在の入力内容は失われますが、よろしいですか？",
            [
                { text: "キャンセル", style: "cancel" },
                {
                    text: "読み込む",
                    onPress: () => {
                        const loadedExercises = routine.exercises.map(ex => ({
                            ...ex,
                            id: Date.now() + Math.random(),
                            sets: ex.sets.map(s => ({ ...s, done: false }))
                        }));
                        setMenu(loadedExercises);
                        setCurrentRoutineName(routine.name);
                        setTimerSeconds(0); // ルーティンを読み込んだらタイマーをリセットして再スタート
                    }
                }
            ]
        );
    };

    const handleRemoveExercise = (exerciseId) => {
        Alert.alert("削除", "この種目を削除しますか？", [
            { text: "キャンセル", style: "cancel" },
            { text: "削除", style: "destructive", onPress: () => setMenu(menu.filter(item => item.id !== exerciseId)) }
        ]);
    };

    const handleAddSet = (exerciseId) => {
        setMenu(menu.map(ex => ex.id === exerciseId ? { ...ex, sets: [...ex.sets, { weight: '', reps: '', done: false }] } : ex));
    };

    const handleRemoveSet = (exerciseId, setIndex) => {
        setMenu(menu.map(ex => {
            if (ex.id === exerciseId) {
                if (ex.sets.length <= 1) { handleRemoveExercise(exerciseId); return ex; }
                return { ...ex, sets: ex.sets.filter((_, i) => i !== setIndex) };
            }
            return ex;
        }));
    };

    const handleUpdateSet = (exerciseId, setIndex, field, value) => {
        setMenu(menu.map(ex => ex.id === exerciseId ? {
            ...ex, sets: ex.sets.map((s, i) => i === setIndex ? { ...s, [field]: value } : s)
        } : ex));
    };

    const toggleSetDone = (exerciseId, setIndex) => {
        setMenu(menu.map(ex => ex.id === exerciseId ? {
            ...ex, sets: ex.sets.map((s, i) => i === setIndex ? { ...s, done: !s.done } : s)
        } : ex));
    };

    const handleFinishWorkout = async () => {
        if (menu.length === 0) return Alert.alert("エラー", "種目がありません");

        Alert.alert("終了", "保存して終了しますか？", [
            { text: "キャンセル", style: "cancel" },
            {
                text: "保存して終了",
                onPress: async () => {
                    setLoading(true);
                    try {
                        const user = auth.currentUser;
                        await addDoc(collection(db, "users", user.uid, "workouts"), {
                            date: serverTimestamp(),
                            routineName: currentRoutineName,
                            exercises: menu,
                            durationSeconds: timerSeconds // ★追加: かかった時間も保存！
                        });
                        Alert.alert("Good Job!", "保存しました", [{
                            text: "OK",
                            onPress: () => {
                                setMenu([]); // ここで空になるのでタイマーもリセット＆タブも復活する
                                navigation.navigate("HomeTab");
                            }
                        }]);
                    } catch (e) { Alert.alert("エラー", "保存失敗"); } finally { setLoading(false); }
                }
            }
        ]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.headerLabel}>Today's Workout</Text>
                    <TouchableOpacity style={styles.routineSelector} onPress={() => setRoutineModalVisible(true)}>
                        <Text style={styles.routineText}>{currentRoutineName}</Text>
                        <ChevronDown color="#2ecc71" size={20} />
                    </TouchableOpacity>
                </View>

                {/* ★変更: 動くようになったタイマー表示 */}
                <TouchableOpacity style={styles.timerButton}>
                    <Clock color={isTimerActive ? "#2ecc71" : "#000"} size={20} />
                    <Text style={styles.timerText}>{formatTime(timerSeconds)}</Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }} keyboardVerticalOffset={100}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {menu.length === 0 && (
                        <View style={{ alignItems: 'center', marginTop: 50, opacity: 0.5 }}>
                            <Dumbbell color="#666" size={50} />
                            <Text style={{ color: '#666', marginTop: 10, textAlign: 'center' }}>種目を追加するか、上のメニューから{"\n"}ルーティンを読み込んでください</Text>
                        </View>
                    )}

                    {menu.map((item) => (
                        <View key={item.id} style={styles.exerciseCard}>
                            <View style={styles.exerciseHeader}>
                                <Text style={styles.exerciseName}>{item.name}</Text>
                                <TouchableOpacity onPress={() => handleRemoveExercise(item.id)} style={{ padding: 5 }}>
                                    <X color="#ff4444" size={24} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.setRowHeader}>
                                <Text style={[styles.colLabel, { width: '15%' }]}>SET</Text>
                                <Text style={[styles.colLabel, { width: '25%' }]}>KG</Text>
                                <Text style={[styles.colLabel, { width: '25%' }]}>REPS</Text>
                                <Text style={[styles.colLabel, { width: '15%' }]}>DONE</Text>
                                <Text style={[styles.colLabel, { width: '10%' }]}></Text>
                            </View>

                            {item.sets.map((set, index) => (
                                <View key={index} style={styles.setRow}>
                                    <View style={[styles.setBadge, { width: '15%' }]}><Text style={styles.setText}>{index + 1}</Text></View>
                                    <View style={[styles.inputBox, { width: '25%' }]}>
                                        <TextInput style={styles.inputFieldText} keyboardType="numeric" placeholder="-" placeholderTextColor="#444" value={set.weight.toString()} onChangeText={(val) => handleUpdateSet(item.id, index, 'weight', val)} returnKeyType="done" />
                                    </View>
                                    <View style={[styles.inputBox, { width: '25%' }]}>
                                        <TextInput style={styles.inputFieldText} keyboardType="numeric" placeholder="-" placeholderTextColor="#444" value={set.reps.toString()} onChangeText={(val) => handleUpdateSet(item.id, index, 'reps', val)} returnKeyType="done" />
                                    </View>
                                    <TouchableOpacity style={[styles.checkBtn, set.done && styles.checkedBtn, { width: 36, height: 36, marginLeft: 5 }]} onPress={() => toggleSetDone(item.id, index)}>
                                        <Check color={set.done ? "#000" : "#444"} size={16} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={{ width: 30, alignItems: 'center', marginLeft: 5 }} onPress={() => handleRemoveSet(item.id, index)}>
                                        <Trash2 color="#444" size={18} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            <TouchableOpacity style={styles.addSetBtn} onPress={() => handleAddSet(item.id)}>
                                <Plus color="#2ecc71" size={16} />
                                <Text style={styles.addSetBtnText}>セットを追加</Text>
                            </TouchableOpacity>
                        </View>
                    ))}

                    <TouchableOpacity style={styles.addExerciseBtn} onPress={() => setModalVisible(true)}>
                        <Plus color="#000" size={20} />
                        <Text style={styles.addExerciseBtnText}>種目を追加する</Text>
                    </TouchableOpacity>

                    {menu.length > 0 && (
                        <TouchableOpacity style={[styles.finishBtn, loading && { opacity: 0.7 }]} onPress={handleFinishWorkout} disabled={loading}>
                            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.finishBtnText}>ワークアウトを終了して保存</Text>}
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            <ExerciseSelectorModal visible={modalVisible} onClose={() => setModalVisible(false)} onSelect={handleAddExercise} />
            <RoutineModal visible={routineModalVisible} onClose={() => setRoutineModalVisible(false)} currentMenu={menu} onLoadRoutine={handleLoadRoutine} />
        </SafeAreaView>
    );
}

// コンポーネント: 統計(Stats)画面
function StatsScreen() {
    const screenWidth = Dimensions.get("window").width;

    // グラフのデザイン設定
    const chartConfig = {
        backgroundGradientFrom: "#1a1a1a",
        backgroundGradientTo: "#1a1a1a",
        color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,
        strokeWidth: 2,
        barPercentage: 0.5,
        useShadowColorFromDataset: false,
        decimalPlaces: 0,
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.headerLabel}>Statistics</Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>

                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>直近のワークアウト回数</Text>
                <LineChart
                    data={{
                        labels: ["1週前", "2週前", "3週前", "今週"],
                        datasets: [{ data: [3, 2, 4, 5] }]
                    }}
                    width={screenWidth - 40}
                    height={220}
                    chartConfig={chartConfig}
                    bezier
                    style={{ borderRadius: 16, marginBottom: 30 }}
                />

                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>部位別セット数 (今月)</Text>
                <BarChart
                    data={{
                        labels: ["胸", "背中", "脚", "肩", "腕"],
                        datasets: [{ data: [20, 15, 12, 10, 8] }]
                    }}
                    width={screenWidth - 40}
                    height={220}
                    chartConfig={chartConfig}
                    style={{ borderRadius: 16 }}
                />

            </ScrollView>
        </SafeAreaView>
    );
}

// メインタブナビゲーション
const Tab = createBottomTabNavigator();
function MainTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: { backgroundColor: '#1a1a1a', borderTopColor: '#333' },
                tabBarActiveTintColor: '#2ecc71',
                tabBarInactiveTintColor: '#666',
                tabBarIcon: ({ color, size }) => {
                    if (route.name === 'HomeTab') return <Home color={color} size={size} />;
                    if (route.name === 'TrainingTab') return <Dumbbell color={color} size={size} />;
                    if (route.name === 'FoodTab') return <Utensils color={color} size={size} />;
                    if (route.name === 'StatsTab') return <BarChart2 color={color} size={size} />;
                },
            })}
        >
            <Tab.Screen name="HomeTab" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
            <Tab.Screen name="TrainingTab" component={TrainingScreen} options={{ tabBarLabel: 'Workout' }} />
            <Tab.Screen name="FoodTab" component={DummyScreen} options={{ tabBarLabel: 'Food' }} />
            <Tab.Screen name="StatsTab" component={StatsScreen} options={{ tabBarLabel: 'Stats' }} />
        </Tab.Navigator>
    );
=======
function TrainingScreen({ navigation }) {
    const [modalVisible, setModalVisible] = useState(false);
    const [routineModalVisible, setRoutineModalVisible] = useState(false);
    const [menu, setMenu] = useState([]);
    const [currentRoutineName, setCurrentRoutineName] = useState("自由メニュー");

    const handleAddExercise = (name) => setMenu([...menu, { id: Date.now(), name, sets: [{ weight: '', reps: '', done: false }] }]);
    const handleLoadRoutine = (routine) => {
        setMenu(routine.exercises.map(ex => ({ ...ex, id: Date.now() + Math.random(), sets: ex.sets.map(s => ({ ...s, done: false })) })));
        setCurrentRoutineName(routine.name);
    };
    const handleAddSet = (id) => setMenu(menu.map(ex => ex.id === id ? { ...ex, sets: [...ex.sets, { weight: '', reps: '', done: false }] } : ex));
    const handleUpdateSet = (id, idx, field, val) => setMenu(menu.map(ex => ex.id === id ? { ...ex, sets: ex.sets.map((s, i) => i === idx ? { ...s, [field]: val } : s) } : ex));
    const toggleSetDone = (id, idx) => setMenu(menu.map(ex => ex.id === id ? { ...ex, sets: ex.sets.map((s, i) => i === idx ? { ...s, done: !s.done } : s) } : ex));
    const handleFinish = async () => {
        if(menu.length===0) return;
        const user = auth.currentUser;
        await addDoc(collection(db, "users", user.uid, "workouts"), { date: serverTimestamp(), routineName: currentRoutineName, exercises: menu });
        Alert.alert("保存完了", "記録しました", [{text:"OK", onPress:()=> {setMenu([]); navigation.navigate("HomeTab")}}]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => setRoutineModalVisible(true)}><Text style={styles.routineText}>{currentRoutineName} <ChevronDown color="#2ecc71" size={16}/></Text></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {menu.length === 0 && <View style={{alignItems:'center', marginTop:50}}><Dumbbell color="#666" size={50}/><Text style={{color:'#666'}}>種目を追加してください</Text></View>}
                {menu.map(item => (
                    <View key={item.id} style={styles.exerciseCard}>
                        <View style={styles.exerciseHeader}><Text style={styles.exerciseName}>{item.name}</Text><TouchableOpacity onPress={()=>setMenu(menu.filter(m=>m.id!==item.id))}><X color="#ff4444" size={24}/></TouchableOpacity></View>
                        {item.sets.map((set, i) => (
                            <View key={i} style={styles.setRow}>
                                <Text style={[styles.setText, {width:'10%'}]}>{i+1}</Text>
                                <TextInput style={[styles.inputBox, styles.inputValue]} placeholder="kg" placeholderTextColor="#444" value={set.weight} onChangeText={v=>handleUpdateSet(item.id, i, 'weight', v)} keyboardType="numeric"/>
                                <TextInput style={[styles.inputBox, styles.inputValue]} placeholder="reps" placeholderTextColor="#444" value={set.reps} onChangeText={v=>handleUpdateSet(item.id, i, 'reps', v)} keyboardType="numeric"/>
                                <TouchableOpacity style={[styles.checkBtn, set.done && styles.checkedBtn]} onPress={()=>toggleSetDone(item.id, i)}><Check color={set.done?"#000":"#444"} size={16}/></TouchableOpacity>
                            </View>
                        ))}
                        <TouchableOpacity style={styles.addSetBtn} onPress={()=>handleAddSet(item.id)}><Plus color="#2ecc71" size={16}/><Text style={styles.addSetBtnText}>セット追加</Text></TouchableOpacity>
                    </View>
                ))}
                <TouchableOpacity style={styles.addExerciseBtn} onPress={()=>setModalVisible(true)}><Plus color="#000" size={20}/><Text style={styles.addExerciseBtnText}>種目追加</Text></TouchableOpacity>
                {menu.length>0 && <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}><Text style={styles.finishBtnText}>終了して保存</Text></TouchableOpacity>}
            </ScrollView>
            <ExerciseSelectorModal visible={modalVisible} onClose={()=>setModalVisible(false)} onSelect={handleAddExercise}/>
            <RoutineModal visible={routineModalVisible} onClose={()=>setRoutineModalVisible(false)} currentMenu={menu} onLoadRoutine={handleLoadRoutine}/>
        </SafeAreaView>
    );
>>>>>>> Stashed changes
}

function DummyScreen() { return <View style={styles.centered}><Text style={{ color: '#fff' }}>準備中</Text></View>; }

// --- ナビゲーション設定 ---
const Stack = createStackNavigator();

function MainTabNavigator() {
    return (
        <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: styles.tabBar, tabBarActiveTintColor: '#2ecc71', tabBarInactiveTintColor: '#666', tabBarShowLabel: false }}>
            <Tab.Screen name="HomeTab" component={HomeStackNavigator} options={{ tabBarIcon: ({ color }) => <Home color={color} size={28} /> }} />
            <Tab.Screen name="TrainingTab" component={TrainingScreen} options={{ tabBarIcon: ({ color }) => <Dumbbell color={color} size={28} /> }} />
            <Tab.Screen name="FoodTab" component={DummyScreen} options={{ tabBarIcon: ({ color }) => <Utensils color={color} size={28} /> }} />
            <Tab.Screen name="OtherTab" component={DummyScreen} options={{ tabBarIcon: ({ color }) => <MoreHorizontal color={color} size={28} /> }} />
        </Tab.Navigator>
    );
}

function HomeStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false, presentation: 'modal' }}>
            <Stack.Screen name="HomeScreen" component={HomeScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
    );
}

// ==========================================
// ★変更: Appコンポーネント (全体の門番)
// ==========================================
export default function App() {
    const [user, setUser] = useState(null);
    const [initializing, setInitializing] = useState(true);

    // ユーザー状態監視
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (initializing) setInitializing(false);
        });
        return unsubscribe;
    }, []);

<<<<<<< Updated upstream
    // VerificationScreenから呼ばれる再読込関数
    const forceRefreshUser = async () => {
        if (auth.currentUser) {
            await auth.currentUser.reload();
            // 再レンダリングさせるために新しいオブジェクトとしてセットする
            setUser({ ...auth.currentUser });
=======
    // VerificationScreenから「確認したよ」と呼ばれたときに実行する関数
    const forceRefreshUser = async () => {
        if (auth.currentUser) {
            await auth.currentUser.reload();
            setUser({ ...auth.currentUser }); // 強制的に状態更新して再レンダリングさせる
>>>>>>> Stashed changes
        }
    };

    if (initializing) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#2ecc71" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!user ? (
<<<<<<< Updated upstream
                    // 1. 未ログイン → ログイン画面
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : !user.emailVerified ? (
                    // 2. ログイン中だがメール未確認 → 確認画面
                    <Stack.Screen name="Verify">
                        {() => <VerificationScreen onCheckVerified={forceRefreshUser} />}
                    </Stack.Screen>
                ) : (
                    // 3. 確認済み → メインアプリ画面
=======
                    // 1. ログインしていない
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : !user.emailVerified ? (
                    // 2. ログインしてるが、メール未確認 (★ここが門番！)
                    <Stack.Screen name="Verify">
                        {/* Props経由で更新関数を渡すテクニック */}
                        {() => <VerificationScreen onCheckVerified={forceRefreshUser} />}
                    </Stack.Screen>
                ) : (
                    // 3. 全てOK
>>>>>>> Stashed changes
                    <Stack.Screen name="Main" component={MainTabNavigator} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}

// ↓↓↓ ファイルの一番下にある styles をこれに書き換えてください ↓↓↓

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
    switchText: { color: '#2ecc71', fontSize: 14, marginTop: 10 },

    // ヘッダー関連
    homeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20 },
    headerRowSimple: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#333' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    iconButton: { padding: 8 },

    // カレンダー
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

    // Stats
    sectionTitle: { color: '#fff', fontSize: 14, textAlign: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#444', paddingBottom: 10 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    calorieBox: { backgroundColor: '#2a2a2a', borderRadius: 15, width: '48%', height: 80, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
    calorieLabel: { color: '#fff', fontSize: 12, marginRight: 10 },
    calorieValue: { color: '#2ecc71', fontSize: 14 },
    aiBox: { backgroundColor: '#e0e0e0', borderRadius: 15, width: '48%', height: 80 },

    // Training Screen & Modal
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#333', marginBottom: 10, paddingTop: 20 },
    headerLabel: { color: '#888', fontSize: 12 },
    routineSelector: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    routineText: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginRight: 5 },
    timerButton: { flexDirection: 'row', backgroundColor: '#2ecc71', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, alignItems: 'center' },
    timerText: { color: '#000', fontWeight: 'bold', marginLeft: 5 },

    exerciseCard: { backgroundColor: '#2a2a2a', borderRadius: 16, padding: 16, marginBottom: 16 },
    exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    exerciseName: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1 },
    exerciseInfo: { flexDirection: 'row', gap: 15, marginBottom: 15 },
    infoText: { color: '#888', fontSize: 12 },
    highlightText: { color: '#2ecc71' },

    setRowHeader: { flexDirection: 'row', marginBottom: 8, paddingHorizontal: 4 },
    colLabel: { color: '#666', fontSize: 10, width: '25%', textAlign: 'center' },
    setRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    setBadge: { width: '25%', alignItems: 'center' },
    setText: { color: '#888', fontSize: 14 },
    inputBox: { width: '22%', height: 36, backgroundColor: '#111', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginHorizontal: '1.5%' },
    inputValue: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign:'center', width:'100%', height:'100%' },
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

    // 設定画面
    settingsItem: { paddingVertical: 10 },

    // 終了ボタン
    finishBtn: { backgroundColor: '#fff', padding: 18, borderRadius: 10, marginTop: 40, marginBottom: 20, alignItems: 'center' },
    finishBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },

    // セクションヘッダー
    sectionHeader: { backgroundColor: '#333', paddingVertical: 8, paddingHorizontal: 16, marginTop: 10 },
    sectionHeaderText: { color: '#2ecc71', fontWeight: 'bold', fontSize: 14 },

    // 利用規約チェックボックス
    termsContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingHorizontal: 5 },
    checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#666', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
    checkboxChecked: { backgroundColor: '#2ecc71', borderColor: '#2ecc71' },
    termsText: { color: '#ccc', fontSize: 14 },
    linkText: { color: '#2ecc71', fontWeight: 'bold', textDecorationLine: 'underline' },

    // その他ボタン類
    addSetBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, marginTop: 5, borderTopWidth: 1, borderTopColor: '#333' },
    addSetBtnText: { color: '#2ecc71', fontSize: 14, fontWeight: 'bold', marginLeft: 5 },

    createRoutineBtn: { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 10, marginBottom: 20 },
    createRoutineText: { color: '#000', fontWeight: 'bold', marginLeft: 10 },

<<<<<<< Updated upstream
    createRoutineBtn: {
        backgroundColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
    },
    createRoutineText: {
        color: '#000',
        fontWeight: 'bold',
        marginLeft: 10,
    },
    routineItem: {
        backgroundColor: '#2a2a2a',
        padding: 16,
        borderRadius: 10,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    routineNameText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    routineDescText: {
        color: '#888',
        fontSize: 12,
    },
=======
    routineItem: { backgroundColor: '#2a2a2a', padding: 16, borderRadius: 10, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    routineNameText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    routineDescText: { color: '#888', fontSize: 12 }, // ★前回ここが抜けていました！
>>>>>>> Stashed changes
});