import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Trash2, Sparkles } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
<<<<<<< HEAD
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
=======
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
>>>>>>> 5465913d89ee4b504cb97918ac2148fb938c0bc1

import { auth, db } from '../../firebaseConfig';
import { styles } from '../../theme/styles';

type Meal = {
  id: string;
  name: string;
  cal: number;
  pro: number;
  fat: number;
  carb: number;
};

const STORAGE_KEY = '@food_meals_today';
const DATE_KEY = '@food_last_opened_date';

export default function FoodTabScreen() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [foodName, setFoodName] = useState('');
  const [cal, setCal] = useState('');
  const [pro, setPro] = useState('');
  const [fat, setFat] = useState('');
  const [carb, setCarb] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // 1. 起動時：ローカルデータ読み込み ＆ 日付変更チェック
  useEffect(() => {
    const loadLocalData = async () => {
      try {
        const todayStr = new Date().toDateString();
        const storedDate = await AsyncStorage.getItem(DATE_KEY);

        if (storedDate !== todayStr) {
          // 日付が変わっていればリセット（新しい1日の始まり）
          setMeals([]);
          await AsyncStorage.removeItem(STORAGE_KEY);
          await AsyncStorage.setItem(DATE_KEY, todayStr);
        } else {
          // 今日ならデータを復元
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          if (stored) setMeals(JSON.parse(stored));
        }
      } catch (e) {
        console.error('データの読み込み失敗:', e);
      }
    };
    loadLocalData();
  }, []);

  // 2. ★超重要：完全オートセーブ関数（ローカル＆クラウド）
  const saveMealsToAll = async (newMeals: Meal[]) => {
    setMeals(newMeals); // 画面に即反映

    // ① ローカルに保存
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newMeals));
    } catch (e) { console.error('ローカル保存失敗:', e); }

    // ② 裏でこっそり Firestore を更新（オートセーブ）
    const user = auth.currentUser;
    if (user) {
      try {
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const docId = `${dateStr}_Food`;

        const tCal = newMeals.reduce((s, i) => s + i.cal, 0);
        const tPro = newMeals.reduce((s, i) => s + i.pro, 0);
        const tFat = newMeals.reduce((s, i) => s + i.fat, 0);
        const tCarb = newMeals.reduce((s, i) => s + i.carb, 0);

        await setDoc(doc(db, 'users', user.uid, 'food_logs', docId), {
          date: serverTimestamp(),
          dateObj: now.toISOString(),
          meals: newMeals,
          totalCal: tCal,
          totalPro: tPro,
          totalFat: tFat,
          totalCarb: tCarb
        });
      } catch (e) {
        console.error("オートセーブ失敗:", e);
      }
    }
  };

  const totalCal = meals.reduce((sum, item) => sum + item.cal, 0);
  const totalPro = meals.reduce((sum, item) => sum + item.pro, 0);
  const totalFat = meals.reduce((sum, item) => sum + item.fat, 0);
  const totalCarb = meals.reduce((sum, item) => sum + item.carb, 0);

<<<<<<< HEAD
  // --- AI解析 ＆ マイ辞書検索ロジック ---
=======
<<<<<<< HEAD
=======
  // --- ★進化：AI解析 ＆ マイ辞書検索ロジック ---
>>>>>>> 5465913d89ee4b504cb97918ac2148fb938c0bc1
>>>>>>> 1af63096fbc909c1afa5f91ed77f0d06cfdcc2bc
  const handleAIGenerate = async () => {
    if (!aiInput.trim()) {
      Alert.alert('エラー', '料理名を入力してくれ');
      return;
    }

<<<<<<< HEAD
    setIsAiLoading(true);

    try {
      // Cloud Functions（Callable）のクライアント取得
      const functions = getFunctions(undefined, 'asia-northeast1');
      const analyzeFoodPFC = httpsCallable(functions, 'analyzeFoodPFC');

      // Cloud Functions を呼び出し
      const res = await analyzeFoodPFC({ text: aiInput.trim() });

      const data = res.data as any;

      if (!data || !data.total) {
        Alert.alert('解析エラー', 'AIから予期しない形式のデータが返されました。');
        return;
      }

      const total = data.total as {
        name?: string;
        cal?: number;
        pro?: number;
        fat?: number;
        carb?: number;
      };

      // 合算1件としてフォームに反映
      setFoodName(total.name ?? aiInput.trim());
      setCal(String(total.cal ?? 0));
      setPro(String(total.pro ?? 0));
      setFat(String(total.fat ?? 0));
      setCarb(String(total.carb ?? 0));

      setAiInput('');
    } catch (error: any) {
      console.error('handleAIGenerate error', error);
      Alert.alert(
        '解析に失敗しました',
        error?.message ?? '通信エラーまたはサーバーエラーが発生しました。'
      );
    } finally {
      setIsAiLoading(false);
=======
    const user = auth.currentUser;
    if (!user) return;

    setIsAiLoading(true);

    try {
      const dictRef = doc(db, "users", user.uid, "food_dictionary", aiInput.trim());
      const dictSnap = await getDoc(dictRef);

      if (dictSnap.exists()) {
        const data = dictSnap.data();
        setFoodName(aiInput);
        setCal(String(data.cal));
        setPro(String(data.pro));
        setFat(String(data.fat));
        setCarb(String(data.carb));
        setIsAiLoading(false);
        setAiInput('');
        return;
      }

      const aiResult = await mockAICall(aiInput);

      if (aiResult) {
        setFoodName(aiResult.name);
        setCal(String(aiResult.cal));
        setPro(String(aiResult.pro));
        setFat(String(aiResult.fat));
        setCarb(String(aiResult.carb));
      }
    } catch (e) {
      console.error(e);
      Alert.alert('エラー', '解析に失敗したぜ');
    } finally {
      setIsAiLoading(false);
      setAiInput('');
>>>>>>> 5465913d89ee4b504cb97918ac2148fb938c0bc1
    }
  };

  const mockAICall = async (name: string) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { name, cal: 450, pro: 20, fat: 15, carb: 50 };
  };

  // --- リスト追加時にオートセーブ ＆ 辞書保存 ---
  const handleAddFood = async () => {
    if (!foodName.trim() || !cal) {
      Alert.alert('エラー', '最低限「食べたもの」と「カロリー」は入力して！');
      return;
    }

    const newFood: Meal = {
      id: Date.now().toString(),
      name: foodName,
      cal: parseInt(cal) || 0,
      pro: parseInt(pro) || 0,
      fat: parseInt(fat) || 0,
      carb: parseInt(carb) || 0,
    };

    // ★ 変更：オートセーブ関数を呼ぶ！
    await saveMealsToAll([...meals, newFood]);

    const user = auth.currentUser;
    if (user) {
      const dictRef = doc(db, "users", user.uid, "food_dictionary", foodName.trim());
      await setDoc(dictRef, {
        name: foodName,
        cal: newFood.cal,
        pro: newFood.pro,
        fat: newFood.fat,
        carb: newFood.carb,
        updatedAt: serverTimestamp()
      });
    }

    setFoodName(''); setCal(''); setPro(''); setFat(''); setCarb('');
  };

  // --- 削除時もオートセーブ ---
  const handleRemoveFood = (id: string) => {
    const newMeals = meals.filter(item => item.id !== id);
    // ★ 変更：ゴミ箱を押した時もクラウドから消えるように同期！
    saveMealsToAll(newMeals);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}><View style={styles.headerContent}><Text style={styles.headerLabel}>Today's Nutrition</Text></View></View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>

        {/* 合計表示 */}
        <View style={{ backgroundColor: '#1a1a1a', padding: 20, borderRadius: 16, marginBottom: 20 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }}>1日の合計摂取量</Text>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ color: '#666', fontSize: 14, marginBottom: 5 }}>カロリー</Text>
            <Text style={{ color: '#2ecc71', fontSize: 32, fontWeight: 'bold' }}>{totalCal} <Text style={{ fontSize: 16 }}>kcal</Text></Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}><Text style={{ color: '#666', fontSize: 12 }}>タンパク質</Text><Text style={{ color: '#4facfe', fontSize: 20, fontWeight: 'bold' }}>{totalPro}g</Text></View>
            <View style={{ alignItems: 'center' }}><Text style={{ color: '#666', fontSize: 12 }}>脂質</Text><Text style={{ color: '#f6d365', fontSize: 20, fontWeight: 'bold' }}>{totalFat}g</Text></View>
            <View style={{ alignItems: 'center' }}><Text style={{ color: '#666', fontSize: 12 }}>炭水化物</Text><Text style={{ color: '#ff0844', fontSize: 20, fontWeight: 'bold' }}>{totalCarb}g</Text></View>
          </View>
        </View>

        {/* AI自動入力 兼 辞書検索エリア */}
        <View style={{ backgroundColor: '#2a2a2a', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#444' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Sparkles color="#4facfe" size={20} style={{ marginRight: 8 }} />
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>AI ＆ 辞書検索</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              style={[styles.inputField, { flex: 1, marginBottom: 0 }]}
              placeholder="例: 吉野家の牛丼 並盛"
              placeholderTextColor="#666"
              value={aiInput}
              onChangeText={setAiInput}
            />
            <TouchableOpacity style={[styles.loginButton, { marginTop: 0, width: 60, justifyContent: 'center' }]} onPress={handleAIGenerate} disabled={isAiLoading}>
              {isAiLoading ? <ActivityIndicator color="#000" /> : <Text style={{ color: '#000', fontWeight: 'bold' }}>検索</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* 履歴 */}
        {meals.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>食べたもの履歴</Text>
            {meals.map((item) => (
              <View key={item.id} style={{ backgroundColor: '#1a1a1a', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{item.name}</Text>
                  <Text style={{ color: '#888', fontSize: 12 }}>{item.cal}kcal | P: {item.pro}g | F: {item.fat}g | C: {item.carb}g</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveFood(item.id)} style={{ padding: 10 }}><Trash2 color="#ff4444" size={20} /></TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* 手動入力フォーム */}
        <View style={{ backgroundColor: '#1a1a1a', padding: 15, borderRadius: 12, marginBottom: 40 }}>
          <Text style={{ color: '#2ecc71', fontSize: 16, fontWeight: 'bold', marginBottom: 15 }}>食事を追加・修正</Text>
          <TextInput style={[styles.inputField, { marginBottom: 10 }]} placeholder="食べたもの" placeholderTextColor="#666" value={foodName} onChangeText={setFoodName} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <TextInput style={[styles.inputField, { flex: 1, marginRight: 5, marginBottom: 0 }]} keyboardType="numeric" placeholder="カロリー" value={cal} onChangeText={setCal} />
            <TextInput style={[styles.inputField, { flex: 1, marginLeft: 5, marginBottom: 0 }]} keyboardType="numeric" placeholder="P(g)" value={pro} onChangeText={setPro} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
            <TextInput style={[styles.inputField, { flex: 1, marginRight: 5, marginBottom: 0 }]} keyboardType="numeric" placeholder="F(g)" value={fat} onChangeText={setFat} />
            <TextInput style={[styles.inputField, { flex: 1, marginLeft: 5, marginBottom: 0 }]} keyboardType="numeric" placeholder="C(g)" value={carb} onChangeText={setCarb} />
          </View>
          <TouchableOpacity style={[styles.loginButton, { marginTop: 0 }]} onPress={handleAddFood}>
            <Text style={styles.loginButtonText}>リストに追加して辞書に保存</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}