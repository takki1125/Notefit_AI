import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { doc, serverTimestamp, setDoc, getDoc } from "firebase/firestore";
import { Sparkles, Trash2 } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { auth, db } from "../../firebaseConfig";
import { styles } from "../../theme/styles";

type Meal = {
  id: string;
  name: string;
  cal: number;
  pro: number;
  fat: number;
  carb: number;
};

const STORAGE_KEY = "@food_meals_today";
const DATE_KEY = '@food_last_opened_date'; // ★オートセーブ用の日付管理

export default function FoodTabScreen() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [foodName, setFoodName] = useState("");
  const [cal, setCal] = useState("");
  const [pro, setPro] = useState("");
  const [fat, setFat] = useState("");
  const [carb, setCarb] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  // 1. 起動時：日付変更チェック ＆ ローカルデータ読み込み
  useEffect(() => {
    const loadLocalData = async () => {
      try {
        const todayStr = new Date().toDateString();
        const storedDate = await AsyncStorage.getItem(DATE_KEY);

        if (storedDate !== todayStr) {
          // 日付が変わっていればリセット
          setMeals([]);
          await AsyncStorage.removeItem(STORAGE_KEY);
          await AsyncStorage.setItem(DATE_KEY, todayStr);
        } else {
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          if (stored) setMeals(JSON.parse(stored));
        }
      } catch (e) {
        console.error("ローカルデータの読み込み失敗:", e);
      }
    };
    loadLocalData();
  }, []);

  // 2. ★完全オートセーブ関数（ローカル＆クラウド）
  const saveMealsToAll = async (newMeals: Meal[]) => {
    setMeals(newMeals);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newMeals));
    } catch (e) {
      console.error("ローカル保存失敗:", e);
    }

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

  // --- AI ＆ 辞書検索 ---
  const handleAIGenerate = async () => {
    if (!aiInput.trim()) {
      Alert.alert("エラー", "料理名や食事内容を入力してくれ");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("エラー", "AI解析を使うにはログインが必要です");
      return;
    }

    setIsAiLoading(true);

    try {
      // 1. 辞書検索
      const dictRef = doc(db, "users", user.uid, "food_dictionary", aiInput.trim());
      const dictSnap = await getDoc(dictRef);

      if (dictSnap.exists()) {
        const data = dictSnap.data();
        setFoodName(aiInput);
        setCal(String(data.cal ?? 0));
        setPro(String(data.pro ?? 0));
        setFat(String(data.fat ?? 0));
        setCarb(String(data.carb ?? 0));
        setIsAiLoading(false);
        setAiInput('');
        return;
      }

      // 2. 辞書になければAI解析（相方さんの本物コード）
      const app = getApp();
      const functions = getFunctions(app, "asia-northeast1");
      const callable = httpsCallable(functions, "analyzeFoodPFC");

      const res = await callable({ text: aiInput.trim() });
      const data = res.data as any;
      const total = data?.total;

      if (!total) {
        throw new Error("AI解析結果の形式が不正です");
      }

      const totalName = typeof total.name === "string" && total.name.length > 0 ? total.name : aiInput.trim();
      const safeCal = Number.isFinite(Number(total.cal)) ? Number(total.cal) : 0;
      const safePro = Number.isFinite(Number(total.pro)) ? Number(total.pro) : 0;
      const safeFat = Number.isFinite(Number(total.fat)) ? Number(total.fat) : 0;
      const safeCarb = Number.isFinite(Number(total.carb)) ? Number(total.carb) : 0;

      setFoodName(totalName);
      setCal(String(Math.round(safeCal)));
      setPro(String(Math.round(safePro)));
      setFat(String(Math.round(safeFat)));
      setCarb(String(Math.round(safeCarb)));

      setAiInput("");
    } catch (error: any) {
      console.error("AI解析エラー:", error);
      const message = error?.message || error?.code || "AIでの解析に失敗しました。";
      Alert.alert("エラー", message);
    } finally {
      setIsAiLoading(false);
    }
  };

  // --- リスト追加時にオートセーブ ＆ 辞書登録 ---
  const handleAddFood = async () => {
    if (!foodName.trim() || !cal) {
      Alert.alert("エラー", "最低限「食べたもの」と「カロリー」は入力して！");
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

    // ★ オートセーブ
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
        updatedAt: serverTimestamp(),
      });
    }

    setFoodName(""); setCal(""); setPro(""); setFat(""); setCarb("");
  };

  const handleRemoveFood = (id: string) => {
    const newMeals = meals.filter((item) => item.id !== id);
    // ★ 削除時もオートセーブ
    saveMealsToAll(newMeals);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerContent}>
          <Text style={styles.headerLabel}>Today's Nutrition</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        
        {/* 合計表示 */}
        <View style={{ backgroundColor: "#1a1a1a", padding: 20, borderRadius: 16, marginBottom: 20 }}>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 15, textAlign: "center" }}>1日の合計摂取量</Text>
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <Text style={{ color: "#666", fontSize: 14, marginBottom: 5 }}>カロリー</Text>
            <Text style={{ color: "#2ecc71", fontSize: 32, fontWeight: "bold" }}>{totalCal} <Text style={{ fontSize: 16 }}>kcal</Text></Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#666", fontSize: 12 }}>タンパク質</Text>
              <Text style={{ color: "#4facfe", fontSize: 20, fontWeight: "bold" }}>{totalPro}g</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#666", fontSize: 12 }}>脂質</Text>
              <Text style={{ color: "#f6d365", fontSize: 20, fontWeight: "bold" }}>{totalFat}g</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#666", fontSize: 12 }}>炭水化物</Text>
              <Text style={{ color: "#ff0844", fontSize: 20, fontWeight: "bold" }}>{totalCarb}g</Text>
            </View>
          </View>
        </View>

        {/* AI自動入力 兼 辞書検索エリア */}
        <View style={{ backgroundColor: "#2a2a2a", padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: "#444" }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <Sparkles color="#4facfe" size={20} style={{ marginRight: 8 }} />
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>AI ＆ 辞書検索</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput
              style={[styles.inputField, { flex: 1, marginBottom: 0 }]}
              placeholder="例: 吉野家の牛丼 並盛"
              placeholderTextColor="#666"
              value={aiInput}
              onChangeText={setAiInput}
            />
            <TouchableOpacity style={[styles.loginButton, { marginTop: 0, width: 60, justifyContent: "center" }]} onPress={handleAIGenerate} disabled={isAiLoading}>
              {isAiLoading ? <ActivityIndicator color="#000" /> : <Text style={{ color: "#000", fontWeight: "bold" }}>検索</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* 履歴 */}
        {meals.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold", marginBottom: 10 }}>食べたもの履歴</Text>
            {meals.map((item) => (
              <View key={item.id} style={{ backgroundColor: "#1a1a1a", padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>{item.name}</Text>
                  <Text style={{ color: "#888", fontSize: 12 }}>{item.cal}kcal | P: {item.pro}g | F: {item.fat}g | C: {item.carb}g</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveFood(item.id)} style={{ padding: 10 }}>
                  <Trash2 color="#ff4444" size={20} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* 手動入力フォーム（カラフルラベル付き！） */}
        <View style={{ backgroundColor: '#1a1a1a', padding: 15, borderRadius: 12, marginBottom: 40 }}>
          <Text style={{ color: '#2ecc71', fontSize: 16, fontWeight: 'bold', marginBottom: 15 }}>食事を追加・修正</Text>
          
          <Text style={{ color: '#888', fontSize: 12, marginBottom: 4, marginLeft: 4 }}>食べたもの</Text>
          <TextInput style={[styles.inputField, { marginBottom: 10 }]} placeholder="例: 鶏むね肉" placeholderTextColor="#666" value={foodName} onChangeText={setFoodName} />
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <View style={{ flex: 1, marginRight: 5 }}>
              <Text style={{ color: '#ccc', fontSize: 12, marginBottom: 4, marginLeft: 4 }}>カロリー (kcal)</Text>
              <TextInput style={[styles.inputField, { marginBottom: 0 }]} keyboardType="numeric" placeholder="0" placeholderTextColor="#666" value={cal} onChangeText={setCal} />
            </View>
            <View style={{ flex: 1, marginLeft: 5 }}>
              <Text style={{ color: '#4facfe', fontSize: 12, marginBottom: 4, marginLeft: 4 }}>タンパク質 P(g)</Text>
              <TextInput style={[styles.inputField, { marginBottom: 0 }]} keyboardType="numeric" placeholder="0" placeholderTextColor="#666" value={pro} onChangeText={setPro} />
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
            <View style={{ flex: 1, marginRight: 5 }}>
              <Text style={{ color: '#f6d365', fontSize: 12, marginBottom: 4, marginLeft: 4 }}>脂質 F(g)</Text>
              <TextInput style={[styles.inputField, { marginBottom: 0 }]} keyboardType="numeric" placeholder="0" placeholderTextColor="#666" value={fat} onChangeText={setFat} />
            </View>
            <View style={{ flex: 1, marginLeft: 5 }}>
              <Text style={{ color: '#ff0844', fontSize: 12, marginBottom: 4, marginLeft: 4 }}>炭水化物 C(g)</Text>
              <TextInput style={[styles.inputField, { marginBottom: 0 }]} keyboardType="numeric" placeholder="0" placeholderTextColor="#666" value={carb} onChangeText={setCarb} />
            </View>
          </View>
          
          <TouchableOpacity style={[styles.loginButton, { marginTop: 0 }]} onPress={handleAddFood}>
            <Text style={styles.loginButtonText}>リストに追加して保存</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}