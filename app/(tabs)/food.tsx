import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { doc, serverTimestamp, setDoc, getDoc, collection, query, getDocs, Timestamp } from "firebase/firestore";
import { Sparkles, Trash2, X, BookOpen, Search, Star, ClipboardList, Check, Plus } from "lucide-react-native";
import React, { useState, useCallback, useEffect, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
  Dimensions,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Video, ResizeMode } from 'expo-av';
import { FREE_MEAL_ROUTINE_LIMIT } from "../../constants/subscriptionLimits";
import { useRouter } from "expo-router";

import { auth, db } from "../../firebaseConfig";
import { useSubscriptionEntitlements } from "../../hooks/useSubscriptionEntitlements";
import { styles } from "../../theme/styles";
import { callableCreateMealRoutine, callableDeleteMealRoutine } from "../../utils/aiUserContentCallables";
import { sanitizeDocId } from "../../utils/firestoreUtils";

type Meal = {
  id: string;
  name: string;
  cal: number;
  pro: number;
  fat: number;
  carb: number;
  isFavorite?: boolean;
};

type MealRoutineRow = {
  id: string;
  name: string;
  meals: Omit<Meal, "id" | "isFavorite">[];
};

type RoutineEditorMode = "closed" | "fromToday" | "fromScratch";

type ScratchMealDraft = {
  key: string;
  name: string;
  cal: string;
  pro: string;
  fat: string;
  carb: string;
};

const STORAGE_KEY_BASE = "@food_meals_today_";
const DATE_KEY_BASE = '@food_last_opened_date_';
const { width } = Dimensions.get("window");

function foodAiSearchErrorMessage(err: unknown): string {
  const e = err as { message?: string; code?: string };
  if (e?.code === "functions/resource-exhausted") {
    return "食事AIのサーバーが一時的に混雑しているか、短時間の上限に達しています。30秒〜1分ほど待ってから「検索」をもう一度試してください。（連打すると出やすくなります）";
  }
  return e?.message || e?.code || "AIでの解析に失敗しました。";
}

// --- スライドチュートリアル用コンポーネント ---
const FOOD_SLIDES = [
  {
    id: '1',
    title: '1日の合計を把握',
    description: '今日の総摂取カロリーと、PFC（タンパク質・脂質・炭水化物）のバランスをここで確認できます。',
    image: require('../../assets/images/tutorial/slide_food1.png'),
  },
  {
    id: '2',
    title: 'ルーティンでサクッと記録',
    description: '毎日食べる決まったメニューは、ルーティンに登録しておけばワンタップで記録できます。',
    image: require('../../assets/images/tutorial/slide_food2.png'),
  },
  {
    id: '3',
    title: 'AI＆辞書で簡単入力',
    description: '『コンビニの牛丼』のように入力して検索するだけで、AIがカロリーと栄養素を自動で推測してくれます。',
    image: require('../../assets/images/tutorial/slide_food3.png'),
  }
];

const SlideTutorialModal: React.FC<{ visible: boolean; onFinish: () => void }> = ({ visible, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;
  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (currentIndex < FOOD_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      onFinish();
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(26, 26, 26, 0.95)' }}>
        <SafeAreaView style={{ flex: 1 }}>
          <TouchableOpacity onPress={onFinish} style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, padding: 15 }}>
            <Text style={{ color: '#aaa', fontSize: 16 }}>スキップ</Text>
          </TouchableOpacity>
          
          <FlatList
            ref={flatListRef}
            data={FOOD_SLIDES}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewConfig}
            renderItem={({ item }: { item: any }) => (
              <View style={{ width, flex: 1 }}>
                <ScrollView 
                  contentContainerStyle={{ alignItems: 'center', padding: 20, paddingBottom: 50 }}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={{ width: width * 0.7, height: width * 1.3, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 30, overflow: 'hidden' }}>
                    {item.video ? (
                      <Video
                        source={item.video}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode={ResizeMode.CONTAIN}
                        shouldPlay
                        isLooping
                        isMuted
                      />
                    ) : item.image ? (
                      <Image source={item.image} style={{ width: '100%', height: '100%', borderRadius: 20 }} resizeMode="contain" />
                    ) : (
                      <Text style={{ color: '#666' }}>メディアがありません</Text>
                    )}
                  </View>
                  <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }}>{item.title}</Text>
                  <Text style={{ color: '#aaa', fontSize: 16, textAlign: 'center', lineHeight: 24, paddingHorizontal: 10 }}>{item.description}</Text>
                </ScrollView>
              </View>
            )}
          />
          <View style={{ padding: 20, paddingBottom: 40, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', marginBottom: 30 }}>
              {FOOD_SLIDES.map((_, index) => (
                <View key={index} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: currentIndex === index ? '#2ecc71' : '#555', marginHorizontal: 4, ...(currentIndex === index && { width: 24 }) }} />
              ))}
            </View>
            <TouchableOpacity onPress={handleNext} style={{ backgroundColor: '#2ecc71', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, width: '90%', alignItems: 'center' }}>
              <Text style={{ color: '#000', fontSize: 18, fontWeight: 'bold' }}>
                {currentIndex === FOOD_SLIDES.length - 1 ? 'はじめる' : '次へ'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};
// --- チュートリアルコンポーネントここまで ---

function FoodTabContent() {
  const router = useRouter();
  
  // ▼ バグ修正：URLではなくAsyncStorageとStateを使って確実に対象日を読み取る
  const [editFoodDateId, setEditFoodDateId] = useState("");
  
  const { flags } = useSubscriptionEntitlements();
  const mealRoutineUnlimited = flags.hideAds || flags.unlockExtraExercises;

  const [meals, setMeals] = useState<Meal[]>([]);
  const [dictMeals, setDictMeals] = useState<Meal[]>([]);
  const [mealRoutines, setMealRoutines] = useState<MealRoutineRow[]>([]);
  const [routineEditorMode, setRoutineEditorMode] = useState<RoutineEditorMode>("closed");
  const [newRoutineName, setNewRoutineName] = useState("");
  const [routineSelectedIds, setRoutineSelectedIds] = useState<Record<string, boolean>>({});
  const [scratchMealDrafts, setScratchMealDrafts] = useState<ScratchMealDraft[]>([]);
  const [savingRoutine, setSavingRoutine] = useState(false);
  const [scratchAiInput, setScratchAiInput] = useState("");
  const [isScratchAiLoading, setIsScratchAiLoading] = useState(false);
  const [foodName, setFoodName] = useState("");
  const [cal, setCal] = useState("");
  const [pro, setPro] = useState("");
  const [fat, setFat] = useState("");
  const [carb, setCarb] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isDictModalVisible, setDictModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalTab, setModalTab] = useState<'all' | 'favorites'>('all');

  // スライドチュートリアル用ステート
  const [showSlideTutorial, setShowSlideTutorial] = useState(false);

  // 過去ログ読込中は誤書き込み（今日の値で過去ドキュメントを上書き／逆もまた然り）を防止する
  const [isLoadingPast, setIsLoadingPast] = useState(false);

  const editingDateIdRef = useRef<string | "">("");
  useEffect(() => {
    editingDateIdRef.current = editFoodDateId ?? "";
  }, [editFoodDateId]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const checkTutorial = async () => {
        const user = auth.currentUser;
        if (!user) return;
        try {
          const hasSeen = await AsyncStorage.getItem(`@tutorial_food_${user.uid}`);
          if (!hasSeen && !cancelled) {
            timer = setTimeout(() => {
              if (!cancelled) setShowSlideTutorial(true);
            }, 500);
          }
        } catch (e) {}
      };
      checkTutorial();

      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      };
    }, [])
  );

  const handleFinishTutorial = async () => {
    setShowSlideTutorial(false);
    const user = auth.currentUser;
    if (user) {
      await AsyncStorage.setItem(`@tutorial_food_${user.uid}`, "true");
    }
  };

  const sortDictMeals = (data: Meal[]) => {
    return [...data].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  };

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const user = auth.currentUser;
        if (!user) return;

        // ▼ バグ修正：Homeから渡された日付をここで受け取る
        let targetDateId = editFoodDateId;
        try {
          const stored = await AsyncStorage.getItem('@target_edit_food_date');
          if (stored) {
            targetDateId = stored;
            setEditFoodDateId(stored);
            await AsyncStorage.removeItem('@target_edit_food_date');
          }
        } catch(e) {}

        if (targetDateId) {
          setIsLoadingPast(true);
          try {
            const docId = `${targetDateId}_Food`;
            const snap = await getDoc(doc(db, "users", user.uid, "food_logs", docId));
            if (snap.exists()) {
              const data = snap.data();
              setMeals(data.meals || []);
            } else {
              setMeals([]);
            }
          } catch (e) {
            console.error("過去の食事ログ取得エラー:", e);
            setMeals([]);
          } finally {
            setIsLoadingPast(false);
          }
        } else {
          const storageKey = `${STORAGE_KEY_BASE}${user.uid}`;
          const dateKey = `${DATE_KEY_BASE}${user.uid}`;
          try {
            const todayStr = new Date().toDateString();
            const storedDate = await AsyncStorage.getItem(dateKey);

            if (storedDate !== todayStr) {
              setMeals([]);
              await AsyncStorage.removeItem(storageKey);
              await AsyncStorage.setItem(dateKey, todayStr);
            } else {
              const stored = await AsyncStorage.getItem(storageKey);
              if (stored) {
                try { setMeals(JSON.parse(stored)); } catch { setMeals([]); }
              }
            }
          } catch (e) {
            console.error("ローカルデータの読み込み失敗:", e);
          }
        }

        try {
          const q = query(collection(db, "users", user.uid, "food_dictionary"));
          const snap = await getDocs(q);
          const dictData = snap.docs.map(d => d.data() as Meal);
          setDictMeals(sortDictMeals(dictData));
        } catch (e) {
          console.error("辞書の読み込み失敗:", e);
        }

        try {
          const rq = query(collection(db, "users", user.uid, "meal_routines"));
          const rsnap = await getDocs(rq);
          const rows: MealRoutineRow[] = rsnap.docs.map((d) => {
            const x = d.data() as {
              name?: string;
              meals?: { name?: string; cal?: number; pro?: number; fat?: number; carb?: number }[];
            };
            const rawMeals = Array.isArray(x.meals) ? x.meals : [];
            return {
              id: d.id,
              name: typeof x.name === "string" ? x.name : "ルーティーン",
              meals: rawMeals.map((m) => ({
                name: typeof m.name === "string" ? m.name : "",
                cal: Number(m.cal) || 0,
                pro: Number(m.pro) || 0,
                fat: Number(m.fat) || 0,
                carb: Number(m.carb) || 0,
              })),
            };
          });
          setMealRoutines(rows);
        } catch (e) {
          console.error("食事ルーティーン読み込み失敗:", e);
        }
      };
      loadData();
    }, [editFoodDateId])
  );

  const dateIdToNoonDate = (dateId: string): Date | null => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateId);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    return new Date(y, mo, d, 12, 0, 0, 0);
  };

  const saveMealsToAll = async (newMeals: Meal[]) => {
    const targetDateId = (editingDateIdRef.current || "").trim();
    const isPastEdit = targetDateId.length > 0;

    if (isPastEdit && isLoadingPast) {
      Alert.alert("お待ちください", "過去の食事ログを読み込み中です。完了してから保存してください。");
      return;
    }

    setMeals(newMeals);

    const user = auth.currentUser;
    if (!user) return;

    const tCal = newMeals.reduce((s, i) => s + i.cal, 0);
    const tPro = newMeals.reduce((s, i) => s + i.pro, 0);
    const tFat = newMeals.reduce((s, i) => s + i.fat, 0);
    const tCarb = newMeals.reduce((s, i) => s + i.carb, 0);

    if (isPastEdit) {
      try {
        const docId = `${targetDateId}_Food`;
        const ref = doc(db, 'users', user.uid, 'food_logs', docId);

        const noon = dateIdToNoonDate(targetDateId);
        const payload: Record<string, unknown> = {
          meals: newMeals,
          totalCal: tCal,
          totalPro: tPro,
          totalFat: tFat,
          totalCarb: tCarb,
          updatedAt: serverTimestamp(),
        };
        if (noon) {
          const existing = await getDoc(ref);
          const hasExistingDate = existing.exists() && existing.data()?.date != null;
          if (!hasExistingDate) {
            payload.date = Timestamp.fromDate(noon);
            payload.dateObj = noon.toISOString();
          }
        }

        await setDoc(ref, payload, { merge: true });
      } catch (e) {
        console.error("過去データの保存失敗:", e);
      }
    } else {
      const storageKey = `${STORAGE_KEY_BASE}${user.uid}`;
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(newMeals));
      } catch (e) {
        console.error("ローカル保存失敗:", e);
      }

      try {
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const docId = `${dateStr}_Food`;

        await setDoc(doc(db, 'users', user.uid, 'food_logs', docId), {
          date: serverTimestamp(),
          dateObj: now.toISOString(),
          meals: newMeals,
          totalCal: tCal,
          totalPro: tPro,
          totalFat: tFat,
          totalCarb: tCarb
        }, { merge: true });
      } catch (e) {
        console.error("オートセーブ失敗:", e);
      }
    }
  };

  const totalCal = meals.reduce((sum, item) => sum + item.cal, 0);
  const totalPro = meals.reduce((sum, item) => sum + item.pro, 0);
  const totalFat = meals.reduce((sum, item) => sum + item.fat, 0);
  const totalCarb = meals.reduce((sum, item) => sum + item.carb, 0);

  const reloadMealRoutines = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const rq = query(collection(db, "users", user.uid, "meal_routines"));
      const rsnap = await getDocs(rq);
      const rows: MealRoutineRow[] = rsnap.docs.map((d) => {
        const x = d.data() as {
          name?: string;
          meals?: { name?: string; cal?: number; pro?: number; fat?: number; carb?: number }[];
        };
        const rawMeals = Array.isArray(x.meals) ? x.meals : [];
        return {
          id: d.id,
          name: typeof x.name === "string" ? x.name : "ルーティーン",
          meals: rawMeals.map((m) => ({
            name: typeof m.name === "string" ? m.name : "",
            cal: Number(m.cal) || 0,
            pro: Number(m.pro) || 0,
            fat: Number(m.fat) || 0,
            carb: Number(m.carb) || 0,
          })),
        };
      });
      setMealRoutines(rows);
    } catch {
      /* ignore */
    }
  };

  const promptRoutineUpgrade = () => {
    Alert.alert(
      "プレミアムで追加",
      `無料プランでは食事ルーティーンは最大${FREE_MEAL_ROUTINE_LIMIT}件までです。`,
      [
        { text: "キャンセル", style: "cancel" },
        { text: "プランを見る", onPress: () => router.push("/settings/monetization") },
      ],
    );
  };

  const applyMealRoutine = async (routine: MealRoutineRow) => {
    if (routine.meals.length === 0) return;
    const base = Date.now();
    const add: Meal[] = routine.meals.map((m, i) => ({
      id: `${base}_${i}`,
      name: m.name,
      cal: m.cal,
      pro: m.pro,
      fat: m.fat,
      carb: m.carb,
    }));
    await saveMealsToAll([...meals, ...add]);
  };

  const closeRoutineEditor = () => {
    setRoutineEditorMode("closed");
    setNewRoutineName("");
    setRoutineSelectedIds({});
    setScratchMealDrafts([]);
    setScratchAiInput("");
  };

  const openRoutineFromToday = () => {
    if (meals.length === 0) {
      Alert.alert("エラー", "食事リストにまだ品目がありません。先に食事を追加してください。");
      return;
    }
    const nextSel: Record<string, boolean> = {};
    for (const m of meals) nextSel[m.id] = true;
    setRoutineSelectedIds(nextSel);
    setNewRoutineName("");
    setRoutineEditorMode("fromToday");
  };

  const openRoutineFromScratch = () => {
    setScratchMealDrafts([
      { key: `s_${Date.now()}`, name: "", cal: "", pro: "", fat: "", carb: "" },
    ]);
    setNewRoutineName("");
    setRoutineEditorMode("fromScratch");
  };

  const toggleRoutineMealSelect = (id: string) => {
    setRoutineSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const addScratchRow = () => {
    setScratchMealDrafts((prev) => [
      ...prev,
      { key: `s_${Date.now()}_${prev.length}`, name: "", cal: "", pro: "", fat: "", carb: "" },
    ]);
  };

  const removeScratchRow = (key: string) => {
    setScratchMealDrafts((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)));
  };

  const updateScratchRow = (key: string, patch: Partial<ScratchMealDraft>) => {
    setScratchMealDrafts((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const confirmSaveMealRoutine = async () => {
    const name = newRoutineName.trim();
    if (!name) {
      Alert.alert("エラー", "ルーティーン名を入力してください。");
      return;
    }

    let payload: { name: string; cal: number; pro: number; fat: number; carb: number }[] = [];

    if (routineEditorMode === "fromToday") {
      payload = meals
        .filter((m) => routineSelectedIds[m.id])
        .map((m) => ({
          name: m.name,
          cal: m.cal,
          pro: m.pro,
          fat: m.fat,
          carb: m.carb,
        }));
      if (payload.length === 0) {
        Alert.alert("エラー", "ルーティーンに含める食事を1品以上選んでください。");
        return;
      }
    } else if (routineEditorMode === "fromScratch") {
      for (const row of scratchMealDrafts) {
        const n = row.name.trim();
        if (!n) continue;
        payload.push({
          name: n,
          cal: Math.max(0, Math.floor(Number(row.cal) || 0)),
          pro: Math.max(0, Math.floor(Number(row.pro) || 0)),
          fat: Math.max(0, Math.floor(Number(row.fat) || 0)),
          carb: Math.max(0, Math.floor(Number(row.carb) || 0)),
        });
      }
      if (payload.length === 0) {
        Alert.alert("エラー", "料理名を1つ以上入力してください。");
        return;
      }
    } else {
      return;
    }

    if (!mealRoutineUnlimited && mealRoutines.length >= FREE_MEAL_ROUTINE_LIMIT) {
      promptRoutineUpgrade();
      return;
    }
    setSavingRoutine(true);
    try {
      await callableCreateMealRoutine(name, payload);
      closeRoutineEditor();
      await reloadMealRoutines();
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === "functions/resource-exhausted") {
        promptRoutineUpgrade();
      } else {
        Alert.alert("エラー", (e as Error)?.message ?? "保存に失敗しました。");
      }
    } finally {
      setSavingRoutine(false);
    }
  };

  const removeMealRoutine = (id: string) => {
    Alert.alert("削除", "このルーティーンを削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await callableDeleteMealRoutine(id);
              await reloadMealRoutines();
            } catch {
              Alert.alert("エラー", "削除に失敗しました。");
            }
          })();
        },
      },
    ]);
  };

  const resolveFoodNutritionFromText = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      throw new Error("料理名や食事内容を入力してくれ");
    }
    const user = auth.currentUser;
    if (!user) {
      throw new Error("AI解析を使うにはログインが必要です");
    }

    const dictRef = doc(db, "users", user.uid, "food_dictionary", sanitizeDocId(trimmed));
    const dictSnap = await getDoc(dictRef);
    if (dictSnap.exists()) {
      const data = dictSnap.data();
      return {
        name: trimmed,
        cal: Math.round(Number(data.cal) || 0),
        pro: Math.round(Number(data.pro) || 0),
        fat: Math.round(Number(data.fat) || 0),
        carb: Math.round(Number(data.carb) || 0),
      };
    }

    const app = getApp();
    const functions = getFunctions(app, "asia-northeast1");
    const callable = httpsCallable(functions, "analyzeFoodPFC");
    const maxAttempts = 6;
    let res: Awaited<ReturnType<typeof callable>> | null = null;
    let lastErr: unknown;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        res = await callable({ text: trimmed });
        break;
      } catch (e) {
        lastErr = e;
        const code = (e as { code?: string })?.code;
        if (code === "functions/resource-exhausted" && attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
          continue;
        }
        throw e;
      }
    }
    if (!res) {
      throw lastErr instanceof Error ? lastErr : new Error("AI解析に失敗しました");
    }
    const data = res.data as { total?: { name?: string; cal?: unknown; pro?: unknown; fat?: unknown; carb?: unknown } };
    const total = data?.total;
    if (!total) {
      throw new Error("AI解析結果の形式が不正です");
    }
    const totalName = typeof total.name === "string" && total.name.length > 0 ? total.name : trimmed;
    const safeCal = Number.isFinite(Number(total.cal)) ? Number(total.cal) : 0;
    const safePro = Number.isFinite(Number(total.pro)) ? Number(total.pro) : 0;
    const safeFat = Number.isFinite(Number(total.fat)) ? Number(total.fat) : 0;
    const safeCarb = Number.isFinite(Number(total.carb)) ? Number(total.carb) : 0;
    return {
      name: totalName,
      cal: Math.round(safeCal),
      pro: Math.round(safePro),
      fat: Math.round(safeFat),
      carb: Math.round(safeCarb),
    };
  };

  const handleScratchAiAppendMeal = async () => {
    if (!scratchAiInput.trim()) {
      Alert.alert("エラー", "料理名や食事内容を入力してください。");
      return;
    }
    setIsScratchAiLoading(true);
    try {
      const r = await resolveFoodNutritionFromText(scratchAiInput);
      setScratchMealDrafts((prev) => {
        const last = prev[prev.length - 1];
        const lastEmpty =
          last &&
          !last.name.trim() &&
          !String(last.cal).trim() &&
          !String(last.pro).trim() &&
          !String(last.fat).trim() &&
          !String(last.carb).trim();
        if (lastEmpty) {
          return prev.map((row, i) =>
            i === prev.length - 1
              ? {
                  ...row,
                  name: r.name,
                  cal: String(r.cal),
                  pro: String(r.pro),
                  fat: String(r.fat),
                  carb: String(r.carb),
                }
              : row,
          );
        }
        return [
          ...prev,
          {
            key: `s_${Date.now()}`,
            name: r.name,
            cal: String(r.cal),
            pro: String(r.pro),
            fat: String(r.fat),
            carb: String(r.carb),
          },
        ];
      });
      setScratchAiInput("");
    } catch (error: unknown) {
      console.error("ルーティーンAI追加エラー:", error);
      Alert.alert("エラー", foodAiSearchErrorMessage(error));
    } finally {
      setIsScratchAiLoading(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!aiInput.trim()) {
      Alert.alert("エラー", "料理名や食事内容を入力してくれ");
      return;
    }
    setIsAiLoading(true);
    try {
      const r = await resolveFoodNutritionFromText(aiInput);
      setFoodName(r.name);
      setCal(String(r.cal));
      setPro(String(r.pro));
      setFat(String(r.fat));
      setCarb(String(r.carb));
      setAiInput("");
    } catch (error: unknown) {
      console.error("AI解析エラー:", error);
      Alert.alert("エラー", foodAiSearchErrorMessage(error));
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

    await saveMealsToAll([...meals, newFood]);

    const user = auth.currentUser;
    if (user) {
      const dictRef = doc(db, "users", user.uid, "food_dictionary", sanitizeDocId(foodName.trim()));
      await setDoc(dictRef, {
        name: foodName,
        cal: newFood.cal,
        pro: newFood.pro,
        fat: newFood.fat,
        carb: newFood.carb,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setDictMeals(prev => {
        const existingItem = prev.find(item => item.name === foodName.trim());
        const isFav = existingItem ? existingItem.isFavorite : false;
        
        const filtered = prev.filter(item => item.name !== foodName.trim());
        const newData = [{ ...newFood, isFavorite: isFav }, ...filtered];
        return sortDictMeals(newData);
      });
    }

    setFoodName(""); setCal(""); setPro(""); setFat(""); setCarb("");

    void import("../../utils/interstitialAdPresenter").then((m) =>
      m.recordFoodAddAndMaybePresentInterstitial(),
    );
  };

  const handleRemoveFood = async (id: string) => {
    const newMeals = meals.filter((item) => item.id !== id);
    try {
      await saveMealsToAll(newMeals);
    } catch {
      Alert.alert("エラー", "食事の削除に失敗しました。");
    }
  };

  const toggleFavorite = async (mealName: string, currentStatus: boolean) => {
    const user = auth.currentUser;
    if (!user) return;
    
    const newStatus = !currentStatus;

    setDictMeals(prev => {
      const newData = prev.map(m => m.name === mealName ? { ...m, isFavorite: newStatus } : m);
      return sortDictMeals(newData);
    });

    try {
      const dictRef = doc(db, "users", user.uid, "food_dictionary", sanitizeDocId(mealName));
      await setDoc(dictRef, { isFavorite: newStatus }, { merge: true });
    } catch (e) {
      console.error("お気に入り更新失敗:", e);
    }
  };

  const filteredDictMeals = dictMeals.filter(item => {
    const matchSearch = item.name.includes(searchQuery);
    const matchTab = modalTab === 'favorites' ? item.isFavorite : true;
    return matchSearch && matchTab;
  });

  return (
    <View style={[styles.container, { flex: 1 }]}>
      {editFoodDateId && (
        <View style={{ backgroundColor: '#2ecc71', padding: 8, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: '#000', fontWeight: 'bold', flex: 1, textAlign: 'center' }}>
            {editFoodDateId} の食事記録を編集中
          </Text>
          <TouchableOpacity 
            onPress={() => {
              setEditFoodDateId(""); // ▼ バグ修正：完了時にStateをクリア
              setTimeout(() => {
                router.navigate('/home');
              }, 50);
            }} 
            style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#000', borderRadius: 8 }}
          >
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>完了</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.headerRow}>
        <View style={styles.headerContent}>
          <Text style={styles.headerLabel}>
            {editFoodDateId ? "Past Nutrition" : "Today's Nutrition"}
          </Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        
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

        <View style={{ backgroundColor: "#252525", padding: 16, borderRadius: 14, marginBottom: 20, borderWidth: 1, borderColor: "#333" }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <ClipboardList color="#f1c40f" size={20} style={{ marginRight: 8 }} />
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold", flex: 1 }}>食事ルーティーン</Text>
            <Text style={{ color: "#888", fontSize: 12 }}>
              {mealRoutineUnlimited
                ? "無制限"
                : `${mealRoutines.length} / ${FREE_MEAL_ROUTINE_LIMIT}`}
            </Text>
          </View>
          <Text style={{ color: "#888", fontSize: 12, marginBottom: 12, lineHeight: 18 }}>
            定番の組み合わせをワンタップで今日のリストに追加できます。無料は {FREE_MEAL_ROUTINE_LIMIT} 件まで保存可能です。
          </Text>
          <View style={{ gap: 10, marginBottom: 12 }}>
            <TouchableOpacity
              style={{ backgroundColor: "#333", paddingVertical: 12, borderRadius: 10, alignItems: "center" }}
              onPress={() => {
                if (!mealRoutineUnlimited && mealRoutines.length >= FREE_MEAL_ROUTINE_LIMIT) {
                  promptRoutineUpgrade();
                  return;
                }
                openRoutineFromToday();
              }}
            >
              <Text style={{ color: "#4facfe", fontWeight: "700" }}>今日の食事から作成</Text>
              <Text style={{ color: "#666", fontSize: 11, marginTop: 4 }}>一覧から品目を選んで保存</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ backgroundColor: "#333", paddingVertical: 12, borderRadius: 10, alignItems: "center" }}
              onPress={() => {
                if (!mealRoutineUnlimited && mealRoutines.length >= FREE_MEAL_ROUTINE_LIMIT) {
                  promptRoutineUpgrade();
                  return;
                }
                openRoutineFromScratch();
              }}
            >
              <Text style={{ color: "#f1c40f", fontWeight: "700" }}>ゼロから作成</Text>
              <Text style={{ color: "#666", fontSize: 11, marginTop: 4 }}>品目を自由に入力してルーティーン化</Text>
            </TouchableOpacity>
          </View>
          {mealRoutines.length === 0 ? (
            <Text style={{ color: "#666", fontSize: 13 }}>まだルーティーンがありません</Text>
          ) : (
            mealRoutines.map((r) => (
              <View
                key={r.id}
                style={{
                  backgroundColor: "#1a1a1a",
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 10,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#fff", fontWeight: "700", marginBottom: 4 }}>{r.name}</Text>
                  <Text style={{ color: "#888", fontSize: 11 }}>
                    {r.meals.length} 品（計 {r.meals.reduce((s, m) => s + m.cal, 0)} kcal）
                  </Text>
                </View>
                <TouchableOpacity
                  style={{ backgroundColor: "#2ecc71", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8 }}
                  onPress={() => void applyMealRoutine(r)}
                >
                  <Text style={{ color: "#000", fontWeight: "800", fontSize: 12 }}>追加</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeMealRoutine(r.id)} style={{ padding: 8 }}>
                  <Trash2 color="#ff4444" size={20} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={{ backgroundColor: "#2a2a2a", padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: "#444" }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <Sparkles color="#4facfe" size={20} style={{ marginRight: 8 }} />
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>AI ＆ 辞書検索</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput
              style={[styles.inputField, { flex: 1, marginBottom: 0 }]}
              placeholder="例: コンビニの牛丼 並盛"
              placeholderTextColor="#666"
              value={aiInput}
              onChangeText={setAiInput}
            />
            <TouchableOpacity style={[styles.loginButton, { marginTop: 0, width: 60, justifyContent: "center" }]} onPress={handleAIGenerate} disabled={isAiLoading}>
              {isAiLoading ? <ActivityIndicator color="#000" /> : <Text style={{ color: "#000", fontWeight: "bold" }}>検索</Text>}
            </TouchableOpacity>
          </View>
        </View>

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

        <View style={{ backgroundColor: '#1a1a1a', padding: 15, borderRadius: 12, marginBottom: 40 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <Text style={{ color: '#2ecc71', fontSize: 16, fontWeight: 'bold' }}>食事を追加・修正</Text>
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 }}
              onPress={() => setDictModalVisible(true)}
            >
              <BookOpen color="#4facfe" size={16} style={{ marginRight: 5 }} />
              <Text style={{ color: '#4facfe', fontSize: 12, fontWeight: 'bold' }}>履歴から選ぶ</Text>
            </TouchableOpacity>
          </View>
          
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

      <Modal visible={isDictModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#2a2a2a", height: "85%", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#444', paddingBottom: 15, marginBottom: 15 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>過去に食べたものリスト</Text>
              <TouchableOpacity onPress={() => { setDictModalVisible(false); setSearchQuery(""); }}>
                <X color="#fff" size={28} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 12, paddingHorizontal: 15, marginBottom: 15 }}>
              <Search color="#666" size={20} style={{ marginRight: 10 }} />
              <TextInput
                style={{ flex: 1, color: '#fff', paddingVertical: 12 }}
                placeholder="料理名で検索..."
                placeholderTextColor="#666"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <View style={{ flexDirection: 'row', backgroundColor: '#1a1a1a', borderRadius: 10, padding: 4, marginBottom: 15 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: modalTab === 'all' ? '#333' : 'transparent', borderRadius: 8 }}
                onPress={() => setModalTab('all')}
              >
                <Text style={{ color: modalTab === 'all' ? '#fff' : '#666', fontWeight: 'bold' }}>すべて</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: modalTab === 'favorites' ? '#333' : 'transparent', borderRadius: 8 }}
                onPress={() => setModalTab('favorites')}
              >
                <Text style={{ color: modalTab === 'favorites' ? '#f1c40f' : '#666', fontWeight: 'bold' }}>⭐ お気に入り</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              {filteredDictMeals.length > 0 ? (
                filteredDictMeals.map((item, idx) => (
                  <View 
                    key={idx} 
                    style={{ backgroundColor: '#1a1a1a', borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' }}
                  >
                    <TouchableOpacity
                      style={{ flex: 1, padding: 15 }}
                      onPress={() => {
                        setFoodName(item.name);
                        setCal(String(item.cal));
                        setPro(String(item.pro));
                        setFat(String(item.fat));
                        setCarb(String(item.carb));
                        setDictModalVisible(false); 
                        setSearchQuery(""); 
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>{item.name}</Text>
                      <Text style={{ color: '#888', fontSize: 12 }}>
                        {item.cal}kcal | P: {item.pro}g | F: {item.fat}g | C: {item.carb}g
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={{ padding: 15 }}
                      onPress={() => toggleFavorite(item.name, !!item.isFavorite)}
                    >
                      <Star 
                        color={item.isFavorite ? "#f1c40f" : "#666"} 
                        fill={item.isFavorite ? "#f1c40f" : "transparent"} 
                        size={24} 
                      />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={{ color: '#666', textAlign: 'center', marginTop: 20 }}>該当する履歴がありません</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={routineEditorMode !== "closed"} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", padding: 16 }}>
          <View
            style={{
              backgroundColor: "#2a2a2a",
              borderRadius: 16,
              padding: 16,
              maxHeight: "90%",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={{ color: "#fff", fontSize: 17, fontWeight: "bold", flex: 1 }}>
                {routineEditorMode === "fromToday" ? "今日の食事から作成" : routineEditorMode === "fromScratch" ? "ゼロから作成" : ""}
              </Text>
              <TouchableOpacity onPress={closeRoutineEditor} style={{ padding: 8 }}>
                <X color="#fff" size={22} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: "#888", fontSize: 12, marginBottom: 12, lineHeight: 18 }}>
              {routineEditorMode === "fromToday"
                ? "ルーティーンに含める品目にチェックを付けてください（初期はすべて選択済みです）。"
                : routineEditorMode === "fromScratch"
                  ? "手入力のほか、下のAIで品目を追加できます（辞書にあるものはそちらを優先）。品目名は保存時に必須です。"
                  : ""}
            </Text>

            {routineEditorMode === "fromToday" && (
              <ScrollView style={{ maxHeight: 280, marginBottom: 12 }} keyboardShouldPersistTaps="handled">
                {meals.map((m) => {
                  const on = !!routineSelectedIds[m.id];
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => toggleRoutineMealSelect(m.id)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "#1a1a1a",
                        borderRadius: 10,
                        padding: 12,
                        marginBottom: 8,
                        borderWidth: 2,
                        borderColor: on ? "#2ecc71" : "transparent",
                      }}
                    >
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          borderWidth: 2,
                          borderColor: on ? "#2ecc71" : "#666",
                          backgroundColor: on ? "#2ecc71" : "transparent",
                          marginRight: 12,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {on ? <Check color="#000" size={16} strokeWidth={3} /> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#fff", fontWeight: "700" }}>{m.name}</Text>
                        <Text style={{ color: "#888", fontSize: 11 }}>
                          {m.cal}kcal | P {m.pro}g | F {m.fat}g | C {m.carb}g
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {routineEditorMode === "fromScratch" && (
              <ScrollView style={{ maxHeight: 320, marginBottom: 12 }} keyboardShouldPersistTaps="handled">
                <View
                  style={{
                    backgroundColor: "#252525",
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 14,
                    borderWidth: 1,
                    borderColor: "#444",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                    <Sparkles color="#4facfe" size={18} style={{ marginRight: 6 }} />
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>AIで品目を追加</Text>
                  </View>
                  <Text style={{ color: "#888", fontSize: 11, marginBottom: 10, lineHeight: 16 }}>
                    メニューや料理名を入力して「追加」で、推定PFCが入った品目を1件足します（先頭行が空ならそこを埋めます）。
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <TextInput
                      style={{
                        flex: 1,
                        backgroundColor: "#1a1a1a",
                        color: "#fff",
                        borderRadius: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderWidth: 1,
                        borderColor: "#444",
                      }}
                      placeholder="例: コンビニのサラダチキン"
                      placeholderTextColor="#666"
                      value={scratchAiInput}
                      onChangeText={setScratchAiInput}
                      editable={!isScratchAiLoading && !savingRoutine}
                    />
                    <TouchableOpacity
                      style={{
                        backgroundColor: "#4facfe",
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 8,
                        opacity: isScratchAiLoading || savingRoutine ? 0.55 : 1,
                        minWidth: 72,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onPress={() => void handleScratchAiAppendMeal()}
                      disabled={isScratchAiLoading || savingRoutine}
                    >
                      {isScratchAiLoading ? (
                        <ActivityIndicator color="#000" size="small" />
                      ) : (
                        <Text style={{ color: "#000", fontWeight: "800" }}>追加</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
                {scratchMealDrafts.map((row, idx) => (
                  <View
                    key={row.key}
                    style={{
                      backgroundColor: "#1a1a1a",
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <Text style={{ color: "#888", fontSize: 12 }}>品目 {idx + 1}</Text>
                      {scratchMealDrafts.length > 1 ? (
                        <TouchableOpacity onPress={() => removeScratchRow(row.key)} style={{ padding: 4 }}>
                          <Trash2 color="#ff4444" size={18} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                    <Text style={{ color: "#888", fontSize: 11, marginBottom: 4 }}>名前</Text>
                    <TextInput
                      style={{
                        backgroundColor: "#252525",
                        color: "#fff",
                        borderRadius: 8,
                        padding: 10,
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: "#444",
                      }}
                      placeholder="例: オートミール"
                      placeholderTextColor="#666"
                      value={row.name}
                      onChangeText={(t) => updateScratchRow(row.key, { name: t })}
                    />
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      <View style={{ width: "48%" }}>
                        <Text style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>kcal</Text>
                        <TextInput
                          style={{
                            backgroundColor: "#252525",
                            color: "#fff",
                            borderRadius: 8,
                            padding: 10,
                            borderWidth: 1,
                            borderColor: "#444",
                          }}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor="#666"
                          value={row.cal}
                          onChangeText={(t) => updateScratchRow(row.key, { cal: t })}
                        />
                      </View>
                      <View style={{ width: "48%" }}>
                        <Text style={{ color: "#4facfe", fontSize: 10, marginBottom: 4 }}>P (g)</Text>
                        <TextInput
                          style={{
                            backgroundColor: "#252525",
                            color: "#fff",
                            borderRadius: 8,
                            padding: 10,
                            borderWidth: 1,
                            borderColor: "#444",
                          }}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor="#666"
                          value={row.pro}
                          onChangeText={(t) => updateScratchRow(row.key, { pro: t })}
                        />
                      </View>
                      <View style={{ width: "48%" }}>
                        <Text style={{ color: "#f6d365", fontSize: 10, marginBottom: 4 }}>F (g)</Text>
                        <TextInput
                          style={{
                            backgroundColor: "#252525",
                            color: "#fff",
                            borderRadius: 8,
                            padding: 10,
                            borderWidth: 1,
                            borderColor: "#444",
                          }}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor="#666"
                          value={row.fat}
                          onChangeText={(t) => updateScratchRow(row.key, { fat: t })}
                        />
                      </View>
                      <View style={{ width: "48%" }}>
                        <Text style={{ color: "#ff0844", fontSize: 10, marginBottom: 4 }}>C (g)</Text>
                        <TextInput
                          style={{
                            backgroundColor: "#252525",
                            color: "#fff",
                            borderRadius: 8,
                            padding: 10,
                            borderWidth: 1,
                            borderColor: "#444",
                          }}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor="#666"
                          value={row.carb}
                          onChangeText={(t) => updateScratchRow(row.key, { carb: t })}
                        />
                      </View>
                    </View>
                  </View>
                ))}
                <TouchableOpacity
                  onPress={addScratchRow}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "#555",
                    borderStyle: "dashed",
                    gap: 8,
                  }}
                >
                  <Plus color="#4facfe" size={20} />
                  <Text style={{ color: "#4facfe", fontWeight: "700" }}>品目を追加</Text>
                </TouchableOpacity>
              </ScrollView>
            )}

            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600", marginBottom: 6 }}>ルーティーン名</Text>
            <TextInput
              style={{
                backgroundColor: "#1a1a1a",
                color: "#fff",
                borderRadius: 10,
                padding: 12,
                marginBottom: 14,
                borderWidth: 1,
                borderColor: "#444",
              }}
              placeholder="例: 平日ランチ"
              placeholderTextColor="#666"
              value={newRoutineName}
              onChangeText={setNewRoutineName}
            />
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12, alignItems: "center" }}>
              <TouchableOpacity onPress={closeRoutineEditor}>
                <Text style={{ color: "#888", padding: 10 }}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: "#2ecc71",
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  borderRadius: 10,
                  opacity: savingRoutine ? 0.6 : 1,
                }}
                disabled={savingRoutine}
                onPress={() => void confirmSaveMealRoutine()}
              >
                {savingRoutine ? <ActivityIndicator color="#000" /> : <Text style={{ color: "#000", fontWeight: "800" }}>保存</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* スライドチュートリアル */}
      <SlideTutorialModal 
        visible={showSlideTutorial} 
        onFinish={handleFinishTutorial} 
      />

    </View>
  );
}

export default function FoodTabScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <FoodTabContent />
    </SafeAreaView>
  );
}