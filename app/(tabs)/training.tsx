import React, { useEffect, useState, useCallback} from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  SectionList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native"; // ★ これを追加
import AsyncStorage from "@react-native-async-storage/async-storage"; // ★ これを追加
import { Check, ChevronDown, Clock, Dumbbell, Plus, Trash2, X } from "lucide-react-native";
import {
  addDoc,
  setDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../../firebaseConfig";
import { styles } from "../../theme/styles";

type WorkoutSet = {
  weight: string;
  reps: string;
  done: boolean;
};

type Exercise = {
  id: number;
  name: string;
  category: string;
  target: string;
  sets: WorkoutSet[];
};

type Routine = {
  id: string;
  name: string;
  exercises: Exercise[];
};

type ExerciseSelectorModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (exerciseName: string, category: string) => void;
};

type RoutineModalProps = {
  visible: boolean;
  onClose: () => void;
  currentMenu: Exercise[];
  onLoadRoutine: (routine: Routine) => void;
};

const ExerciseSelectorModal: React.FC<ExerciseSelectorModalProps> = ({
  visible,
  onClose,
  onSelect,
}) => {
  const [categories, setCategories] = useState<
    {
      id: string;
      label: string;
      sections: { title: string; data: string[] }[];
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<{
    id: string;
    label: string;
    sections: { title: string; data: string[] }[];
  } | null>(null);

  // ★追加：新しい種目名を入力・保存するためのState
  const [newExerciseName, setNewExerciseName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      const [masterSnap, customSnap] = await Promise.all([
        getDocs(collection(db, "master_data")),
        getDocs(collection(db, "users", user.uid, "custom_exercises"))
      ]);

      const data: {
        id: string;
        label: string;
        sections: { title: string; data: string[] }[];
      }[] = [];

      // ① マスターデータ処理
      masterSnap.forEach((d) => {
        const docData = d.data() as any;
        let sections: { title: string; data: string[] }[] = [];

        if (docData.categories && typeof docData.categories === "object") {
          Object.keys(docData.categories).forEach((key) => {
            const subCat = docData.categories[key];
            if (subCat && Array.isArray(subCat.exercises) && subCat.exercises.length > 0) {
              sections.push({ title: key, data: subCat.exercises });
            }
          });
        }

        if (Array.isArray(docData.exercises) && docData.exercises.length > 0) {
          sections.push({ title: "その他", data: docData.exercises });
        }

        data.push({
          id: d.id,
          label: docData.label || d.id,
          sections,
        });
      });

      // ② 個人データを「オリジナル」セクションに挿入
      const customDocs = customSnap.docs.map(doc => doc.data());
      
      data.forEach(targetCat => {
        const matchingCustoms = customDocs.filter(c => c.categoryLabel === targetCat.label);
        if (matchingCustoms.length > 0) {
          targetCat.sections.unshift({
            title: "オリジナル",
            data: matchingCustoms.map(c => c.name)
          });
        }
      });

      setCategories(data);

      setCategories((currentData) => {
        if (selectedCategory) {
          const updatedCat = currentData.find(c => c.id === selectedCategory.id);
          if (updatedCat) setSelectedCategory(updatedCat);
        } else {
          const firstValid = currentData.find((c) => c.sections.length > 0);
          if (firstValid) {
            setSelectedCategory(firstValid);
          } else if (currentData.length > 0) {
            setSelectedCategory(currentData[0]);
          }
        }
        return currentData;
      });

    } catch (e) {
      console.error("Error fetching data: ", e);
      Alert.alert("エラー", "データの読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchData();
      setNewExerciseName(""); // モーダルを開くたびに入力欄をリセット
    }
  }, [visible]);

  // ★追加：UIのボタンから呼ばれる保存処理
  const handleSaveCustomExercise = async () => {
    if (!newExerciseName.trim()) {
      Alert.alert("エラー", "種目名を入力してください");
      return;
    }
    if (!selectedCategory) return;

    setIsSaving(true);
    const user = auth.currentUser;
    if (!user) {
      setIsSaving(false);
      return;
    }

    try {
      await addDoc(collection(db, "users", user.uid, "custom_exercises"), {
        name: newExerciseName.trim(),
        categoryLabel: selectedCategory.label,
        createdAt: serverTimestamp(),
      });
      
      setNewExerciseName(""); // 入力欄をクリア
      await fetchData(); // 最新のリストを再取得して画面に反映
    } catch (e) {
      console.error("カスタム種目保存エラー:", e);
      Alert.alert("エラー", "種目の保存に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>種目を選択</Text>
          <TouchableOpacity onPress={onClose}>
            <X color="#fff" size={24} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#2ecc71"
            style={{ marginTop: 50 }}
          />
        ) : (
          <View style={{ flex: 1 }}>
            <View style={styles.modalCategoryContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
              >
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.tabBtn,
                      selectedCategory?.id === cat.id && styles.activeTabBtn,
                      cat.sections.length === 0 && { opacity: 0.5 },
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        selectedCategory?.id === cat.id && styles.activeTabText,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <SectionList
              sections={selectedCategory?.sections || []}
              keyExtractor={(item, index) => `${item}-${index}`}
              stickySectionHeadersEnabled={false}
              renderSectionHeader={({ section: { title } }) => (
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionHeaderText, title === "オリジナル" && { color: "#f1c40f" }]}>{title}</Text>
                </View>
              )}
              renderItem={({ item, section }) => (
                <TouchableOpacity
                  style={styles.exerciseListItem}
                  onPress={() => {
                    onSelect(item, selectedCategory?.label || "他");
                    onClose();
                  }}
                >
                  <Text style={[styles.exerciseListText, section.title === "オリジナル" && { color: "#f1c40f", fontWeight: "bold" }]}>{item}</Text>
                  <Plus color="#2ecc71" size={20} />
                </TouchableOpacity>
              )}
              // ★進化：リストの一番下に入力フォームを常時表示！
              ListFooterComponent={
                <View style={{ marginTop: 20, marginBottom: 40, padding: 15, backgroundColor: "#1a1a1a", borderRadius: 12, marginHorizontal: 16 }}>
                  <Text style={{ color: "#2ecc71", fontWeight: "bold", marginBottom: 10 }}>＋ オリジナル種目を追加</Text>
                  <TextInput
                    style={[styles.inputField, { marginBottom: 10, backgroundColor: "#2a2a2a", borderWidth: 0 }]}
                    placeholder={`「${selectedCategory?.label || "この部位"}」の新しい種目名`}
                    placeholderTextColor="#666"
                    value={newExerciseName}
                    onChangeText={setNewExerciseName}
                  />
                  <TouchableOpacity
                    style={[styles.loginButton, { marginTop: 0, paddingVertical: 12 }, isSaving && { opacity: 0.7 }]}
                    onPress={handleSaveCustomExercise}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={{ color: "#000", fontWeight: "bold", textAlign: "center" }}>リストに追加</Text>
                    )}
                  </TouchableOpacity>
                </View>
              }
            />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const RoutineModal: React.FC<RoutineModalProps> = ({
  visible,
  onClose,
  currentMenu,
  onLoadRoutine,
}) => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState("");
  const [mode, setMode] = useState<"list" | "save">("list");

  const fetchRoutines = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "users", user.uid, "routines"),
        orderBy("createdAt", "desc"),
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as Routine[];
      setRoutines(data);
    } catch (e) {
      console.error(e);
      Alert.alert("エラー", "ルーティンの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchRoutines();
      setMode("list");
      setNewRoutineName("");
    }
  }, [visible]);

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
      if (!user) return;

      const routineData = {
        name: newRoutineName,
        exercises: currentMenu,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "users", user.uid, "routines"), routineData);
      Alert.alert("保存完了", `「${newRoutineName}」を保存しました`);
      setMode("list");
      fetchRoutines();
    } catch (e) {
      console.error(e);
      Alert.alert("エラー", "保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoutine = async (id: string) => {
    Alert.alert("削除", "このルーティンを削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          try {
            const user = auth.currentUser;
            if (!user) return;
            await deleteDoc(doc(db, "users", user.uid, "routines", id));
            fetchRoutines();
          } catch (e) {
            Alert.alert("エラー", "削除できませんでした");
          }
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {mode === "list" ? "ルーティンを選択" : "ルーティンを保存"}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <X color="#fff" size={24} />
          </TouchableOpacity>
        </View>

        {mode === "list" ? (
          <View style={{ flex: 1, padding: 16 }}>
            <TouchableOpacity
              style={styles.createRoutineBtn}
              onPress={() => setMode("save")}
            >
              <Plus color="#000" size={20} />
              <Text style={styles.createRoutineText}>
                現在のメニューを保存する
              </Text>
            </TouchableOpacity>

            <Text style={{ color: "#666", marginTop: 20, marginBottom: 10 }}>
              SAVED ROUTINES
            </Text>

            {loading ? (
              <ActivityIndicator />
            ) : (
              <ScrollView>
                {routines.length === 0 ? (
                  <Text
                    style={{
                      color: "#444",
                      textAlign: "center",
                      marginTop: 20,
                    }}
                  >
                    保存されたルーティンはありません
                  </Text>
                ) : (
                  routines.map((item) => (
                    <View key={item.id} style={styles.routineItem}>
                      <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => {
                          onLoadRoutine(item);
                          onClose();
                        }}
                      >
                        <Text style={styles.routineNameText}>{item.name}</Text>
                        <Text style={styles.routineDescText}>
                          {item.exercises?.length ?? 0} 種目
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteRoutine(item.id)}
                        style={{ padding: 10 }}
                      >
                        <Trash2 color="#444" size={20} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        ) : (
          <View style={{ flex: 1, padding: 20 }}>
            <Text style={{ color: "#ccc", marginBottom: 10 }}>
              現在のメニュー内容をルーティンとして保存します。
            </Text>
            <Text
              style={{ color: "#fff", fontWeight: "bold", marginBottom: 20 }}
            >
              {currentMenu.map((e) => e.name).join(", ")}
            </Text>

            <TextInput
              style={styles.inputField}
              placeholder="ルーティン名 (例: 胸の日 A)"
              placeholderTextColor="#666"
              value={newRoutineName}
              onChangeText={setNewRoutineName}
              autoFocus
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  { backgroundColor: "#444", flex: 1 },
                ]}
                onPress={() => setMode("list")}
              >
                <Text style={{ color: "#fff" }}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.loginButton, { flex: 1 }]}
                onPress={handleSaveRoutine}
              >
                <Text style={{ fontWeight: "bold" }}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

type Props = {
  navigation: any;
};

const TrainingTabScreen: React.FC<Props> = ({ navigation }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [routineModalVisible, setRoutineModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const [menu, setMenu] = useState<Exercise[]>([]);
  const [currentRoutineName, setCurrentRoutineName] = useState("自由メニュー");

  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

  const [autoCheck, setAutoCheck] = useState(false);
  useFocusEffect(
    useCallback(() => {
      const loadSetting = async () => {
        const val = await AsyncStorage.getItem('@auto_check_set');
        setAutoCheck(val === 'true'); // 設定がtrueなら初期値もtrueになる
      };
      loadSetting();
    }, [])
  );

  useEffect(() => {
    navigation?.setOptions?.({
      tabBarStyle:
        menu.length > 0
          ? { display: "none" }
          : {
            backgroundColor: "#2a2a2a",
            borderTopWidth: 0,
            height: 60,
            paddingBottom: 10,
          },
    });
  }, [menu.length, navigation]);

  useEffect(() => {
    // ★ここを any に変更して、型のパニックを黙らせる！
    let interval: any = null;

    if (menu.length > 0) {
      setIsTimerActive(true);
    } else {
      setIsTimerActive(false);
      setTimerSeconds(0);
    }

    if (isTimerActive) {
      interval = setInterval(() => {
        setTimerSeconds((sec) => sec + 1);
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, menu.length]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  const handleAddExercise = (exerciseName: string, category: string) => {
    const newExercise: Exercise = {
      id: Date.now(),
      name: exerciseName,
      category: category,
      target: "- kg x -",
      sets: [{ weight: "", reps: "", done: autoCheck }],
    };
    setMenu((prev) => [...prev, newExercise]);
  };

  const handleLoadRoutine = (routine: Routine) => {
    Alert.alert(
      "ルーティン読み込み",
      "現在の入力内容は失われますが、よろしいですか？",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "読み込む",
          onPress: () => {
            const loadedExercises: Exercise[] = routine.exercises.map((ex) => ({
              ...ex,
              category: ex.category || "他",
              id: Date.now() + Math.random(),
              sets: ex.sets.map((s) => ({ ...s, done: autoCheck })),
            }));
            setMenu(loadedExercises);
            setCurrentRoutineName(routine.name);
            setTimerSeconds(0);
          },
        },
      ]
    );
  };

  const handleRemoveExercise = (exerciseId: number) => {
    Alert.alert("削除", "この種目を削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: () =>
          setMenu((prev) => prev.filter((item) => item.id !== exerciseId)),
      },
    ]);
  };

  const handleAddSet = (exerciseId: number) => {
    setMenu((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, sets: [...ex.sets, { weight: "", reps: "", done: autoCheck }] }
          : ex
      )
    );
  };

  const handleRemoveSet = (exerciseId: number, setIndex: number) => {
    setMenu((prev) =>
      prev.map((ex) => {
        if (ex.id === exerciseId) {
          if (ex.sets.length <= 1) {
            handleRemoveExercise(exerciseId);
            return ex;
          }
          return { ...ex, sets: ex.sets.filter((_, i) => i !== setIndex) };
        }
        return ex;
      })
    );
  };

  const handleUpdateSet = (
    exerciseId: number,
    setIndex: number,
    field: keyof WorkoutSet,
    value: string
  ) => {
    setMenu((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? {
            ...ex,
            sets: ex.sets.map((s, i) =>
              i === setIndex ? { ...s, [field]: value } : s
            ),
          }
          : ex
      )
    );
  };

  const toggleSetDone = (exerciseId: number, setIndex: number) => {
    setMenu((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? {
            ...ex,
            sets: ex.sets.map((s, i) =>
              i === setIndex ? { ...s, done: !s.done } : s
            ),
          }
          : ex
      )
    );
  };

  const handleFinishWorkout = async () => {
    if (menu.length === 0) {
      Alert.alert("エラー", "種目がありません");
      return;
    }

    Alert.alert("終了", "保存して終了しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "保存して終了",
        onPress: async () => {
          setLoading(true);
          try {
            const user = auth.currentUser;
            if (!user) {
              Alert.alert("エラー", "ユーザー情報がありません");
              return;
            }

            const now = new Date();
            const dateStr = `${now.getFullYear()}-${String(
              now.getMonth() + 1
            ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
            const timeStr = `${String(now.getHours()).padStart(
              2,
              "0"
            )}-${String(now.getMinutes()).padStart(2, "0")}-${String(
              now.getSeconds()
            ).padStart(2, "0")}`;

            const safeRoutineName = currentRoutineName
              ? currentRoutineName.replace(/[\/]/g, "_")
              : "自由メニュー";

            const customDocId = `${dateStr}_${timeStr}_${safeRoutineName}`;

            console.log("★保存データの中身確認:", menu);

            await setDoc(doc(db, "users", user.uid, "workouts", customDocId), {
              date: serverTimestamp(),
              dateObj: now.toISOString(),
              routineName: currentRoutineName,
              exercises: menu,
              durationSeconds: timerSeconds,
            });

            Alert.alert("Good Job!", "保存しました", [
              {
                text: "OK",
                onPress: () => {
                  setMenu([]);
                  navigation?.navigate?.("home");
                },
              },
            ]);
          } catch (e) {
            Alert.alert("エラー", "保存失敗");
            console.error(e);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.headerRow}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerLabel}>Today&apos;s Workout</Text>
            <TouchableOpacity
              style={styles.routineSelector}
              onPress={() => setRoutineModalVisible(true)}
            >
              <Text style={styles.routineText}>{currentRoutineName}</Text>
              <ChevronDown color="#2ecc71" size={20} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.timerButton}>
            <Clock color={isTimerActive ? "#2ecc71" : "#000"} size={20} />
            <Text style={styles.timerText}>{formatTime(timerSeconds)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          {menu.length === 0 && (
            <View style={{ alignItems: "center", marginTop: 50, opacity: 0.5 }}>
              <Dumbbell color="#666" size={50} />
              <Text
                style={{ color: "#666", marginTop: 10, textAlign: "center" }}
              >
                種目を追加するか、上のメニューから{"\n"}
                ルーティンを読み込んでください
              </Text>
            </View>
          )}

          {menu.map((item) => {
            // ★追加：カテゴリーが「有酸素」かどうかを判定！
            const isCardio = item.category?.includes("有酸素");

            return (
              <View key={item.id} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <View>
                    <Text style={styles.exerciseName}>{item.name}</Text>
                    {/* デバッグ用：部位を表示 */}
                    <Text style={{ color: "#2ecc71", fontSize: 10 }}>{item.category}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveExercise(item.id)}
                    style={{ padding: 5 }}
                  >
                    <X color="#ff4444" size={24} />
                  </TouchableOpacity>
                </View>

                {/* ★変更：有酸素の時はヘッダーを「MIN(分)」と「KM(距離)」に切り替える */}
                <View style={styles.setRowHeader}>
                  <Text style={[styles.colLabel, { width: "15%" }]}>SET</Text>
                  <Text style={[styles.colLabel, { width: "25%" }]}>{isCardio ? "MIN" : "KG"}</Text>
                  <Text style={[styles.colLabel, { width: "25%" }]}>{isCardio ? "KM" : "REPS"}</Text>
                  <Text style={[styles.colLabel, { width: "15%" }]}>DONE</Text>
                  <Text style={[styles.colLabel, { width: "10%" }]} />
                </View>

                {item.sets.map((set, index) => (
                  <View key={index} style={styles.setRow}>
                    <View style={[styles.setBadge, { width: "15%" }]}>
                      <Text style={styles.setText}>{index + 1}</Text>
                    </View>
                    <View style={[styles.inputBox, { width: "25%" }]}>
                      <TextInput
                        style={styles.inputFieldText}
                        keyboardType="numeric"
                        placeholder={isCardio ? "分" : "-"} // ★プレースホルダーも切り替え
                        placeholderTextColor="#444"
                        value={set.weight.toString()}
                        onChangeText={(val) =>
                          handleUpdateSet(item.id, index, "weight", val)
                        }
                        returnKeyType="done"
                      />
                    </View>
                    <View style={[styles.inputBox, { width: "25%" }]}>
                      <TextInput
                        style={styles.inputFieldText}
                        keyboardType="numeric"
                        placeholder={isCardio ? "km" : "-"} // ★プレースホルダーも切り替え
                        placeholderTextColor="#444"
                        value={set.reps.toString()}
                        onChangeText={(val) =>
                          handleUpdateSet(item.id, index, "reps", val)
                        }
                        returnKeyType="done"
                      />
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.checkBtn,
                        set.done && styles.checkedBtn,
                        { width: 36, height: 36, marginLeft: 5 },
                      ]}
                      onPress={() => toggleSetDone(item.id, index)}
                    >
                      <Check color={set.done ? "#000" : "#444"} size={16} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ width: 30, alignItems: "center", marginLeft: 5 }}
                      onPress={() => handleRemoveSet(item.id, index)}
                    >
                      <Trash2 color="#444" size={18} />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.addSetBtn}
                  onPress={() => handleAddSet(item.id)}
                >
                  <Plus color="#2ecc71" size={16} />
                  <Text style={styles.addSetBtnText}>セットを追加!</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          <TouchableOpacity
            style={styles.addExerciseBtn}
            onPress={() => setModalVisible(true)}
          >
            <Plus color="#000" size={20} />
            <Text style={styles.addExerciseBtnText}>種目を追加する</Text>
          </TouchableOpacity>

          {menu.length > 0 && (
            <TouchableOpacity
              style={[styles.finishBtn, loading && { opacity: 0.7 }]}
              onPress={handleFinishWorkout}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.finishBtnText}>
                  ワークアウトを終了して保存
                </Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ExerciseSelectorModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={handleAddExercise}
      />
      <RoutineModal
        visible={routineModalVisible}
        onClose={() => setRoutineModalVisible(false)}
        currentMenu={menu}
        onLoadRoutine={handleLoadRoutine}
      />
    </SafeAreaView>
  );
};

export default TrainingTabScreen;