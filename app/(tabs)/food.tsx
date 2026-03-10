import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator // ★追加：ローディングのぐるぐる
} from 'react-native';
import { Trash2, Sparkles } from 'lucide-react-native'; // ★追加：AIっぽいキラキラアイコン
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

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

export default function FoodTabScreen() {
  const [meals, setMeals] = useState<Meal[]>([]);

  const [foodName, setFoodName] = useState('');
  const [cal, setCal] = useState('');
  const [pro, setPro] = useState('');
  const [fat, setFat] = useState('');
  const [carb, setCarb] = useState('');

  // ★追加：AI解析用のState
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    const loadLocalData = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setMeals(JSON.parse(stored));
        }
      } catch (e) {
        console.error('ローカルデータの読み込み失敗:', e);
      }
    };
    loadLocalData();
  }, []);

  const saveToLocal = async (newMeals: Meal[]) => {
    setMeals(newMeals);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newMeals));
    } catch (e) {
      console.error('ローカル保存失敗:', e);
    }
  };

  const totalCal = meals.reduce((sum, item) => sum + item.cal, 0);
  const totalPro = meals.reduce((sum, item) => sum + item.pro, 0);
  const totalFat = meals.reduce((sum, item) => sum + item.fat, 0);
  const totalCarb = meals.reduce((sum, item) => sum + item.carb, 0);

  // ★追加：相方さんがAI通信処理をここに書くためのダミー関数
  const handleAIGenerate = () => {
    if (!aiInput.trim()) {
      Alert.alert('エラー', 'AIに解析させる料理名を入力してください');
      return;
    }

    // UIのテスト用：ローディング状態にする
    setIsAiLoading(true);

    // TODO: ここに相方がAI APIと通信する処理を書く
    // 通信が終わったら、下のフォーム (foodName, cal, pro, fat, carb) に取得した値をセットする
    setTimeout(() => {
      // 仮のダミーデータ反映テスト
      setFoodName(aiInput);
      setCal('500'); // 例：ダミーのカロリー
      setIsAiLoading(false);
      setAiInput(''); // 入力欄をクリア
      Alert.alert('UIテスト', '相方へ：ここにAIのレスポンスを反映させてね！');
    }, 1500);
  };

  const handleAddFood = () => {
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

    saveToLocal([...meals, newFood]);

    setFoodName(''); setCal(''); setPro(''); setFat(''); setCarb('');
  };

  const handleRemoveFood = (id: string) => {
    const newMeals = meals.filter(item => item.id !== id);
    saveToLocal(newMeals);
  };

  const handleSaveToFirebase = () => {
    if (meals.length === 0) {
      Alert.alert('エラー', '保存する食事がありません');
      return;
    }

    Alert.alert("確認", "この1日のデータをクラウドに保存して終了しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "保存する",
        onPress: async () => {
          try {
            const user = auth.currentUser;
            if (!user) {
              Alert.alert('エラー', 'ログイン情報がありません');
              return;
            }

            const now = new Date();
            const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const docId = `${dateStr}_Food`;

            await setDoc(doc(db, 'users', user.uid, 'food_logs', docId), {
              date: serverTimestamp(),
              dateObj: now.toISOString(),
              meals: meals,
              totalCal,
              totalPro,
              totalFat,
              totalCarb
            });

            await AsyncStorage.removeItem(STORAGE_KEY);
            setMeals([]);

            Alert.alert('Good Job!', '今日の食事データをクラウドに保存しました！');
          } catch (error) {
            console.error(error);
            Alert.alert('エラー', '保存に失敗しました');
          }
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>Today's Nutrition</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>

        <View style={{ backgroundColor: '#1a1a1a', padding: 20, borderRadius: 16, marginBottom: 20 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }}>
            1日の合計摂取量
          </Text>

          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ color: '#666', fontSize: 14, marginBottom: 5 }}>カロリー</Text>
            <Text style={{ color: '#2ecc71', fontSize: 32, fontWeight: 'bold' }}>{totalCal} <Text style={{ fontSize: 16 }}>kcal</Text></Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#666', fontSize: 12, marginBottom: 5 }}>タンパク質 (P)</Text>
              <Text style={{ color: '#4facfe', fontSize: 20, fontWeight: 'bold' }}>{totalPro}g</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#666', fontSize: 12, marginBottom: 5 }}>脂質 (F)</Text>
              <Text style={{ color: '#f6d365', fontSize: 20, fontWeight: 'bold' }}>{totalFat}g</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#666', fontSize: 12, marginBottom: 5 }}>炭水化物 (C)</Text>
              <Text style={{ color: '#ff0844', fontSize: 20, fontWeight: 'bold' }}>{totalCarb}g</Text>
            </View>
          </View>
        </View>

        {/* ★新設：AI自動入力エリア */}
        <View style={{ backgroundColor: '#2a2a2a', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#444' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Sparkles color="#4facfe" size={20} style={{ marginRight: 8 }} />
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>AIで自動解析</Text>
          </View>
          <Text style={{ color: '#888', fontSize: 12, marginBottom: 10 }}>
            料理名や食べたものを入力すると、AIがPFCとカロリーを推測して下のフォームに入力します。
          </Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              style={[styles.inputField, { flex: 1, marginBottom: 0 }]}
              placeholder="例: 吉野家の牛丼 並盛"
              placeholderTextColor="#666"
              value={aiInput}
              onChangeText={setAiInput}
            />
            <TouchableOpacity
              style={[styles.loginButton, { marginTop: 0, width: 60, padding: 0, justifyContent: 'center' }]}
              onPress={handleAIGenerate}
              disabled={isAiLoading}
            >
              {isAiLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={{ color: '#000', fontWeight: 'bold' }}>解析</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {meals.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>食べたもの履歴</Text>
            {meals.map((item) => (
              <View key={item.id} style={{ backgroundColor: '#1a1a1a', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 5 }}>{item.name}</Text>
                  <Text style={{ color: '#888', fontSize: 12 }}>
                    {item.cal}kcal | P: {item.pro}g | F: {item.fat}g | C: {item.carb}g
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveFood(item.id)} style={{ padding: 10 }}>
                  <Trash2 color="#ff4444" size={20} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={{ backgroundColor: '#1a1a1a', padding: 15, borderRadius: 12, marginBottom: 20 }}>
          {/* ★修正：「＋ 食事を追加する」の「＋」を削除 */}
          <Text style={{ color: '#2ecc71', fontSize: 16, fontWeight: 'bold', marginBottom: 15 }}>食事を追加する</Text>

          <TextInput
            style={[styles.inputField, { marginBottom: 10 }]}
            placeholder="食べたもの (例: 鶏むね肉)"
            placeholderTextColor="#666"
            value={foodName}
            onChangeText={setFoodName}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <TextInput style={[styles.inputField, { flex: 1, marginRight: 5, marginBottom: 0 }]} keyboardType="numeric" placeholder="カロリー" placeholderTextColor="#666" value={cal} onChangeText={setCal} />
            <TextInput style={[styles.inputField, { flex: 1, marginLeft: 5, marginBottom: 0 }]} keyboardType="numeric" placeholder="タンパク質(g)" placeholderTextColor="#666" value={pro} onChangeText={setPro} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
            <TextInput style={[styles.inputField, { flex: 1, marginRight: 5, marginBottom: 0 }]} keyboardType="numeric" placeholder="脂質(g)" placeholderTextColor="#666" value={fat} onChangeText={setFat} />
            <TextInput style={[styles.inputField, { flex: 1, marginLeft: 5, marginBottom: 0 }]} keyboardType="numeric" placeholder="炭水化物(g)" placeholderTextColor="#666" value={carb} onChangeText={setCarb} />
          </View>

          <TouchableOpacity style={[styles.loginButton, { marginTop: 0 }]} onPress={handleAddFood}>
            <Text style={styles.loginButtonText}>リストに追加</Text>
          </TouchableOpacity>
        </View>

        {meals.length > 0 && (
          <TouchableOpacity style={[styles.finishBtn, { marginBottom: 40 }]} onPress={handleSaveToFirebase}>
            <Text style={styles.finishBtnText}>今日の食事をクラウドに保存する</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}