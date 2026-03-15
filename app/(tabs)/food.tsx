import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
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

export default function FoodTabScreen() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [foodName, setFoodName] = useState("");
  const [cal, setCal] = useState("");
  const [pro, setPro] = useState("");
  const [fat, setFat] = useState("");
  const [carb, setCarb] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    const loadLocalData = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setMeals(JSON.parse(stored));
      } catch (e) {
        console.error("ローカルデータの読み込み失敗:", e);
      }
    };
    loadLocalData();
  }, []);

  const saveToLocal = async (newMeals: Meal[]) => {
    setMeals(newMeals);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newMeals));
    } catch (e) {
      console.error("ローカル保存失敗:", e);
    }
  };

  const totalCal = meals.reduce((sum, item) => sum + item.cal, 0);
  const totalPro = meals.reduce((sum, item) => sum + item.pro, 0);
  const totalFat = meals.reduce((sum, item) => sum + item.fat, 0);
  const totalCarb = meals.reduce((sum, item) => sum + item.carb, 0);

  // AI で自動解析
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
      const app = getApp();
      const functions = getFunctions(app, "asia-northeast1");
      const callable = httpsCallable(functions, "analyzeFoodPFC");

      const res = await callable({ text: aiInput.trim() });
      const data = res.data as any;
      const total = data?.total;

      if (!total) {
        throw new Error("AI解析結果の形式が不正です");
      }

      const totalName =
        typeof total.name === "string" && total.name.length > 0
          ? total.name
          : aiInput.trim();

      const safeCal = Number.isFinite(Number(total.cal)) ? Number(total.cal) : 0;
      const safePro = Number.isFinite(Number(total.pro)) ? Number(total.pro) : 0;
      const safeFat = Number.isFinite(Number(total.fat)) ? Number(total.fat) : 0;
      const safeCarb = Number.isFinite(Number(total.carb))
        ? Number(total.carb)
        : 0;

      setFoodName(totalName);
      setCal(String(Math.round(safeCal)));
      setPro(String(Math.round(safePro)));
      setFat(String(Math.round(safeFat)));
      setCarb(String(Math.round(safeCarb)));

      setAiInput("");
      Alert.alert("AI解析完了", "AIがPFCとカロリーを推定しました！");
    } catch (error: any) {
      console.error("AI解析エラー:", error);
      const message =
        error?.message ||
        error?.code ||
        "AIでの解析に失敗しました。時間をおいて再度お試しください。";
      Alert.alert("エラー", message);
    } finally {
      setIsAiLoading(false);
    }
  };

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

    // リストに追加
    saveToLocal([...meals, newFood]);

    // 同時に「food_dictionary」を更新
    const user = auth.currentUser;
    if (user) {
      const dictRef = doc(
        db,
        "users",
        user.uid,
        "food_dictionary",
        foodName.trim(),
      );
      await setDoc(dictRef, {
        name: foodName,
        cal: newFood.cal,
        pro: newFood.pro,
        fat: newFood.fat,
        carb: newFood.carb,
        updatedAt: serverTimestamp(),
      });
    }

    setFoodName("");
    setCal("");
    setPro("");
    setFat("");
    setCarb("");
  };

  const handleRemoveFood = (id: string) => {
    const newMeals = meals.filter((item) => item.id !== id);
    saveToLocal(newMeals);
  };

  const handleSaveToFirebase = () => {
    if (meals.length === 0) {
      Alert.alert("エラー", "保存する食事がありません");
      return;
    }

    Alert.alert("確認", "この1日のデータをクラウドに保存して終了しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "保存する",
        onPress: async () => {
          try {
            const user = auth.currentUser;
            if (!user) return;
            const now = new Date();
            const dateStr = `${now.getFullYear()}-${String(
              now.getMonth() + 1,
            ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
            const docId = `${dateStr}_Food`;

            await setDoc(doc(db, "users", user.uid, "food_logs", docId), {
              date: serverTimestamp(),
              dateObj: now.toISOString(),
              meals: meals,
              totalCal,
              totalPro,
              totalFat,
              totalCarb,
            });

            await AsyncStorage.removeItem(STORAGE_KEY);
            setMeals([]);
            Alert.alert(
              "Good Job!",
              "今日の食事データをクラウドに保存しました！",
            );
          } catch (error) {
            Alert.alert("エラー", "保存に失敗しました");
          }
        },
      },
    ]);
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
        <View
          style={{
            backgroundColor: "#1a1a1a",
            padding: 20,
            borderRadius: 16,
            marginBottom: 20,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 15,
              textAlign: "center",
            }}
          >
            1日の合計摂取量
          </Text>
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <Text style={{ color: "#666", fontSize: 14, marginBottom: 5 }}>
              カロリー
            </Text>
            <Text
              style={{ color: "#2ecc71", fontSize: 32, fontWeight: "bold" }}
            >
              {totalCal} <Text style={{ fontSize: 16 }}>kcal</Text>
            </Text>
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-around" }}
          >
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#666", fontSize: 12 }}>タンパク質</Text>
              <Text
                style={{ color: "#4facfe", fontSize: 20, fontWeight: "bold" }}
              >
                {totalPro}g
              </Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#666", fontSize: 12 }}>脂質</Text>
              <Text
                style={{ color: "#f6d365", fontSize: 20, fontWeight: "bold" }}
              >
                {totalFat}g
              </Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#666", fontSize: 12 }}>炭水化物</Text>
              <Text
                style={{ color: "#ff0844", fontSize: 20, fontWeight: "bold" }}
              >
                {totalCarb}g
              </Text>
            </View>
          </View>
        </View>

        {/* AI自動入力 兼 辞書検索エリア */}
        <View
          style={{
            backgroundColor: "#2a2a2a",
            padding: 15,
            borderRadius: 12,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: "#444",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <Sparkles color="#4facfe" size={20} style={{ marginRight: 8 }} />
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
              AI ＆ 辞書検索
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput
              style={[styles.inputField, { flex: 1, marginBottom: 0 }]}
              placeholder="例: 吉野家の牛丼 並盛"
              placeholderTextColor="#666"
              value={aiInput}
              onChangeText={setAiInput}
            />
            <TouchableOpacity
              style={[
                styles.loginButton,
                { marginTop: 0, width: 60, justifyContent: "center" },
              ]}
              onPress={handleAIGenerate}
              disabled={isAiLoading}
            >
              {isAiLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={{ color: "#000", fontWeight: "bold" }}>検索</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 履歴 */}
        {meals.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                color: "#fff",
                fontSize: 16,
                fontWeight: "bold",
                marginBottom: 10,
              }}
            >
              食べたもの履歴
            </Text>
            {meals.map((item) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: "#1a1a1a",
                  padding: 15,
                  borderRadius: 12,
                  marginBottom: 10,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}
                  >
                    {item.name}
                  </Text>
                  <Text style={{ color: "#888", fontSize: 12 }}>
                    {item.cal}kcal | P: {item.pro}g | F: {item.fat}g | C:{" "}
                    {item.carb}g
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveFood(item.id)}
                  style={{ padding: 10 }}
                >
                  <Trash2 color="#ff4444" size={20} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* 手動入力フォーム */}
        <View
          style={{
            backgroundColor: "#1a1a1a",
            padding: 15,
            borderRadius: 12,
            marginBottom: 20,
          }}
        >
          <Text
            style={{
              color: "#2ecc71",
              fontSize: 16,
              fontWeight: "bold",
              marginBottom: 15,
            }}
          >
            食事を追加・修正
          </Text>
          <TextInput
            style={[styles.inputField, { marginBottom: 10 }]}
            placeholder="食べたもの"
            placeholderTextColor="#666"
            value={foodName}
            onChangeText={setFoodName}
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <TextInput
              style={[
                styles.inputField,
                { flex: 1, marginRight: 5, marginBottom: 0 },
              ]}
              keyboardType="numeric"
              placeholder="カロリー"
              value={cal}
              onChangeText={setCal}
            />
            <TextInput
              style={[
                styles.inputField,
                { flex: 1, marginLeft: 5, marginBottom: 0 },
              ]}
              keyboardType="numeric"
              placeholder="P(g)"
              value={pro}
              onChangeText={setPro}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 15,
            }}
          >
            <TextInput
              style={[
                styles.inputField,
                { flex: 1, marginRight: 5, marginBottom: 0 },
              ]}
              keyboardType="numeric"
              placeholder="F(g)"
              value={fat}
              onChangeText={setFat}
            />
            <TextInput
              style={[
                styles.inputField,
                { flex: 1, marginLeft: 5, marginBottom: 0 },
              ]}
              keyboardType="numeric"
              placeholder="C(g)"
              value={carb}
              onChangeText={setCarb}
            />
          </View>
          <TouchableOpacity
            style={[styles.loginButton, { marginTop: 0 }]}
            onPress={handleAddFood}
          >
            <Text style={styles.loginButtonText}>
              リストに追加して辞書に保存
            </Text>
          </TouchableOpacity>
        </View>

        {meals.length > 0 && (
          <TouchableOpacity
            style={[styles.finishBtn, { marginBottom: 40 }]}
            onPress={handleSaveToFirebase}
          >
            <Text style={styles.finishBtnText}>
              今日の食事をクラウドに保存する
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
