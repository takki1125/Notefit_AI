import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
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
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Check, ChevronDown, Clock, Dumbbell, Pencil, Plus, Trash2, X } from "lucide-react-native";
import {
  addDoc,
  setDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { useLocalSearchParams } from "expo-router";

import { FREE_CUSTOM_EXERCISE_LIMIT } from "../../constants/subscriptionLimits";
import { type CustomExerciseListItem } from "../../hooks/useExerciseMaster";
import { auth, db } from "../../firebaseConfig";
import { styles } from "../../theme/styles";
import {
  callableCreateCustomExercise,
  callableDeleteCustomExercise,
  callableUpdateCustomExercise,
} from "../../utils/aiUserContentCallables";
import { CopilotProvider, CopilotStep, walkthroughable, useCopilot } from "react-native-copilot";

type ExerciseSectionRow = { title: string; data: (string | CustomExerciseListItem)[] };
type ExerciseCategoryRow = { id: string; label: string; sections: ExerciseSectionRow[] };

type WorkoutSet = {
  weight?: string;
  reps?: string;
  durationMinutes?: string;
  distanceKm?: string;
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

type PreviousExerciseHints = Record<string, WorkoutSet[]>;
type TrainingDraft = {
  savedDate: string;
  currentRoutineName: string;
  timerSeconds: number;
  menu: Exercise[];
};

const TRAINING_DRAFT_KEY_PREFIX = "@training_draft_v1_";

type ExerciseSelectorModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (exerciseName: string, category: string) => void;
};

type RoutineModalProps = {
  visible: boolean;
  onClose: () => void;
  currentMenu: Exercise[];
  autoCheck: boolean;
  onLoadRoutine: (routine: Routine) => void;
};

const WalkthroughableView = walkthroughable(TouchableOpacity);

const ExerciseSelectorModal: React.FC<ExerciseSelectorModalProps> = ({
  visible,
  onClose,
  onSelect,
}) => {
  const [categories, setCategories] = useState<ExerciseCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategoryRow | null>(null);

  const [newExerciseName, setNewExerciseName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    id: string;
    name: string;
    categoryLabel: string;
  } | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategoryLabel, setEditCategoryLabel] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      const [masterSnap, customSnap] = await Promise.all([
        getDocs(collection(db, "master_data")),
        getDocs(collection(db, "users", user.uid, "custom_exercises"))
      ]);

      const data: ExerciseCategoryRow[] = [];

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

      const customDocs = customSnap.docs.map((d) => {
        const x = d.data() as { name?: string; categoryLabel?: string };
        return {
          id: d.id,
          name: typeof x.name === "string" ? x.name : "",
          categoryLabel: typeof x.categoryLabel === "string" ? x.categoryLabel : "",
        };
      });

      data.forEach((targetCat) => {
        const matchingCustoms = customDocs.filter((c) => c.categoryLabel === targetCat.label);
        if (matchingCustoms.length > 0) {
          targetCat.sections.unshift({
            title: "オリジナル",
            data: matchingCustoms.map(
              (c): CustomExerciseListItem => ({
                kind: "custom",
                id: c.id,
                name: c.name,
                categoryLabel: c.categoryLabel,
              }),
            ),
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
      setNewExerciseName(""); 
    }
  }, [visible]);

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
      await callableCreateCustomExercise(newExerciseName.trim(), selectedCategory.label);
      setNewExerciseName("");
      await fetchData();
    } catch (e: unknown) {
      console.error("カスタム種目保存エラー:", e);
      const code = (e as { code?: string })?.code;
      if (code === "functions/resource-exhausted") {
        Alert.alert(
          "上限です",
          `無料プランではマイ種目は最大${FREE_CUSTOM_EXERCISE_LIMIT}件までです。`,
        );
      } else {
        Alert.alert("エラー", "種目の保存に失敗しました。");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const openEditCustom = (c: CustomExerciseListItem) => {
    setEditTarget({ id: c.id, name: c.name, categoryLabel: c.categoryLabel });
    setEditName(c.name);
    setEditCategoryLabel(c.categoryLabel);
  };

  const closeEditCustom = () => {
    setEditTarget(null);
    setEditName("");
    setEditCategoryLabel("");
  };

  const handleSaveEditCustom = async () => {
    if (!editTarget) return;
    const name = editName.trim();
    if (!name) {
      Alert.alert("エラー", "種目名を入力してください");
      return;
    }
    const cat = editCategoryLabel.trim();
    if (!cat) {
      Alert.alert("エラー", "部位を選んでください");
      return;
    }
    setSavingEdit(true);
    try {
      await callableUpdateCustomExercise(editTarget.id, name, cat);
      closeEditCustom();
      await fetchData();
    } catch (e: unknown) {
      Alert.alert("エラー", (e as Error)?.message ?? "更新に失敗しました。");
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDeleteCustom = (id: string, displayName: string) => {
    Alert.alert("削除", `「${displayName}」を削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await callableDeleteCustomExercise(id);
              await fetchData();
            } catch {
              Alert.alert("エラー", "削除に失敗しました。");
            }
          })();
        },
      },
    ]);
  };

  return (
    <>
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
                keyExtractor={(item, index) =>
                  typeof item === "string" ? `${item}_${index}` : item.id
                }
                stickySectionHeadersEnabled={false}
                renderSectionHeader={({ section: { title } }) => (
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionHeaderText, title === "オリジナル" && { color: "#f1c40f" }]}>{title}</Text>
                  </View>
                )}
                renderItem={({ item, section }) => {
                  if (typeof item === "string") {
                    return (
                      <TouchableOpacity
                        style={styles.exerciseListItem}
                        onPress={() => {
                          onSelect(item, selectedCategory?.label || "他");
                          onClose();
                        }}
                      >
                        <Text style={styles.exerciseListText}>{item}</Text>
                        <Plus color="#2ecc71" size={20} />
                      </TouchableOpacity>
                    );
                  }
                  const c = item;
                  return (
                    <View
                      style={[
                        styles.exerciseListItem,
                        { flexDirection: "row", alignItems: "center", paddingRight: 8 },
                      ]}
                    >
                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                        onPress={() => {
                          onSelect(c.name, selectedCategory?.label || "他");
                          onClose();
                        }}
                      >
                        <Text
                          style={[
                            styles.exerciseListText,
                            section.title === "オリジナル" && { color: "#f1c40f", fontWeight: "bold" },
                            { flex: 1 },
                          ]}
                        >
                          {c.name}
                        </Text>
                        <Plus color="#2ecc71" size={20} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => openEditCustom(c)} style={{ padding: 8 }} accessibilityLabel="編集">
                        <Pencil color="#4facfe" size={20} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => confirmDeleteCustom(c.id, c.name)}
                        style={{ padding: 8 }}
                        accessibilityLabel="削除"
                      >
                        <Trash2 color="#ff4444" size={20} />
                      </TouchableOpacity>
                    </View>
                  );
                }}
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

      <Modal visible={editTarget !== null} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.85)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View style={{ backgroundColor: "#2a2a2a", borderRadius: 16, padding: 16 }}>
            <Text style={{ color: "#fff", fontSize: 17, fontWeight: "bold", marginBottom: 12 }}>オリジナル種目を編集</Text>
            <Text style={{ color: "#888", fontSize: 12, marginBottom: 6 }}>種目名</Text>
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
              placeholder="種目名"
              placeholderTextColor="#666"
              value={editName}
              onChangeText={setEditName}
              editable={!savingEdit}
            />
            <Text style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>部位（タブ）</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {categories.map((cat) => {
                  const on = editCategoryLabel === cat.label;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setEditCategoryLabel(cat.label)}
                      style={{
                        backgroundColor: on ? "#2ecc71" : "#1a1a1a",
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: on ? "#2ecc71" : "#444",
                      }}
                    >
                      <Text style={{ color: on ? "#000" : "#ccc", fontWeight: on ? "800" : "500" }}>{cat.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
              <TouchableOpacity onPress={closeEditCustom} disabled={savingEdit}>
                <Text style={{ color: "#888", padding: 10 }}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: "#2ecc71",
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  borderRadius: 10,
                  opacity: savingEdit ? 0.6 : 1,
                }}
                onPress={() => void handleSaveEditCustom()}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={{ color: "#000", fontWeight: "800" }}>保存</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const RoutineModal: React.FC<RoutineModalProps> = ({
  visible,
  onClose,
  currentMenu,
  autoCheck,
  onLoadRoutine,
}) => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState("");
  const [mode, setMode] = useState<"list" | "save" | "scratch">("list");
  const [scratchSelectorVisible, setScratchSelectorVisible] = useState(false);
  const [scratchExercises, setScratchExercises] = useState<Exercise[]>([]);

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
      setScratchExercises([]);
    }
  }, [visible]);

  const buildScratchExercise = (exerciseName: string, category: string): Exercise => {
    const isCardio = category.includes("有酸素");
    return {
      id: Date.now() + Math.random(),
      name: exerciseName,
      category,
      target: "- kg x -",
      sets: [
        isCardio
          ? { durationMinutes: "", distanceKm: "", done: autoCheck }
          : { weight: "", reps: "", done: autoCheck },
      ],
    };
  };

  const handleAddScratchExercise = (exerciseName: string, category: string) => {
    const created = buildScratchExercise(exerciseName, category);
    setScratchExercises((prev) => [...prev, created]);
  };

  const handleRemoveScratchExercise = (exerciseId: number) => {
    setScratchExercises((prev) => prev.filter((item) => item.id !== exerciseId));
  };

  const handleSaveRoutine = async (exercisesToSave: Exercise[]) => {
    if (!newRoutineName.trim()) {
      Alert.alert("エラー", "ルーティン名を入力してください");
      return;
    }
    if (exercisesToSave.length === 0) {
      Alert.alert("エラー", "種目が追加されていません");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const routineData = {
        name: newRoutineName,
        exercises: exercisesToSave,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "users", user.uid, "routines"), routineData);
      Alert.alert("保存完了", `「${newRoutineName}」を保存しました`);
      setMode("list");
      setScratchExercises([]);
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
            <TouchableOpacity
              style={[styles.createRoutineBtn, { marginTop: 10, backgroundColor: "#333" }]}
              onPress={() => setMode("scratch")}
            >
              <Plus color="#2ecc71" size={20} />
              <Text style={[styles.createRoutineText, { color: "#2ecc71" }]}>
                ゼロから作成する
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
        ) : mode === "save" ? (
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
                onPress={() => void handleSaveRoutine(currentMenu)}
              >
                <Text style={{ fontWeight: "bold" }}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ flex: 1, padding: 20 }}>
            <Text style={{ color: "#ccc", marginBottom: 10 }}>
              種目を自由に選んで、新しいルーティンを作成できます。
            </Text>
            <TouchableOpacity
              style={[styles.createRoutineBtn, { marginBottom: 12 }]}
              onPress={() => setScratchSelectorVisible(true)}
            >
              <Plus color="#000" size={20} />
              <Text style={styles.createRoutineText}>種目を追加する</Text>
            </TouchableOpacity>
            <Text style={{ color: "#666", marginBottom: 10 }}>SELECTED EXERCISES</Text>
            <ScrollView style={{ flex: 1 }}>
              {scratchExercises.length === 0 ? (
                <Text style={{ color: "#444", textAlign: "center", marginTop: 12 }}>
                  種目を追加してください
                </Text>
              ) : (
                scratchExercises.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.routineItem,
                      { alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.routineNameText}>{item.name}</Text>
                      <Text style={styles.routineDescText}>{item.category}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveScratchExercise(item.id)}
                      style={{ padding: 10 }}
                    >
                      <Trash2 color="#444" size={20} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

            <TextInput
              style={styles.inputField}
              placeholder="ルーティン名 (例: 朝トレ 20分)"
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
                onPress={() => void handleSaveRoutine(scratchExercises)}
              >
                <Text style={{ fontWeight: "bold" }}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
      <ExerciseSelectorModal
        visible={scratchSelectorVisible}
        onClose={() => setScratchSelectorVisible(false)}
        onSelect={handleAddScratchExercise}
      />
    </Modal>
  );
};

type Props = {
  navigation: any;
};

const TrainingTabContent: React.FC<Props> = ({ navigation }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [routineModalVisible, setRoutineModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const [menu, setMenu] = useState<Exercise[]>([]);
  const [currentRoutineName, setCurrentRoutineName] = useState("自由メニュー");
  const [previousExerciseHints, setPreviousExerciseHints] = useState<PreviousExerciseHints>({});
  const [draftRestored, setDraftRestored] = useState(false);

  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

  const [autoCheck, setAutoCheck] = useState(false);

  const { start, copilotEvents } = useCopilot();
  const startTutorialRef = React.useRef(start);
  startTutorialRef.current = start;

  // ★ チュートリアル用のScrollRef
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const onStepChange = (step: any) => {
      if (step?.name === 'addExercise') {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    };

    copilotEvents.on("stepChange", onStepChange);
    return () => {
      copilotEvents.off("stepChange", onStepChange);
    };
  }, [copilotEvents]);

  const startTimeRef = React.useRef<number | null>(null);

  const { editWorkoutId } = useLocalSearchParams<{ editWorkoutId?: string }>();
  const [originalDateData, setOriginalDateData] = useState<any>(null);

  const getTodayDateString = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const getTrainingDraftKey = () => {
    const uid = auth.currentUser?.uid;
    return uid ? `${TRAINING_DRAFT_KEY_PREFIX}${uid}` : null;
  };

  const clearTrainingDraft = useCallback(async () => {
    const key = getTrainingDraftKey();
    if (!key) return;
    await AsyncStorage.removeItem(key);
  }, []);

  const persistTrainingDraft = useCallback(
    async (nextDraft: TrainingDraft) => {
      const key = getTrainingDraftKey();
      if (!key) return;
      await AsyncStorage.setItem(key, JSON.stringify(nextDraft));
    },
    []
  );

  const fetchPreviousExerciseHints = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    const hasInputValue = (value: unknown) => {
      if (value === null || value === undefined) return false;
      return String(value).trim().length > 0;
    };

    const hasSetValue = (set: WorkoutSet, isCardio: boolean) => {
      if (isCardio) {
        return hasInputValue(set.durationMinutes) || hasInputValue(set.distanceKm);
      }
      return hasInputValue(set.weight) || hasInputValue(set.reps);
    };

    const trimTrailingEmptySets = (sets: WorkoutSet[], isCardio: boolean) => {
      let lastFilledIndex = -1;
      sets.forEach((set, index) => {
        if (hasSetValue(set, isCardio)) lastFilledIndex = index;
      });
      if (lastFilledIndex < 0) return [];
      return sets.slice(0, lastFilledIndex + 1);
    };

    try {
      const q = query(
        collection(db, "users", user.uid, "workouts"),
        orderBy("dateObj", "desc"),
        limit(50),
      );
      const snapshot = await getDocs(q);

      const hints: PreviousExerciseHints = {};
      snapshot.forEach((workoutDoc) => {
        const workoutData = workoutDoc.data() as {
          exercises?: Array<{ name?: string; category?: string; sets?: WorkoutSet[] }>;
        };
        const exercises = workoutData.exercises ?? [];

        exercises.forEach((exercise) => {
          const exerciseName = exercise.name?.trim();
          if (!exerciseName) return;

          const isCardio = (exercise.category ?? "").includes("有酸素");
          const mappedSets = (exercise.sets ?? []).map((set) =>
            isCardio
              ? {
                durationMinutes: set.durationMinutes ?? set.weight ?? "",
                distanceKm: set.distanceKm ?? set.reps ?? "",
                done: false,
              }
              : {
                weight: set.weight ?? "",
                reps: set.reps ?? "",
                done: false,
              }
          );

          const existingSets = hints[exerciseName] ?? [];
          const maxLength = Math.max(existingSets.length, mappedSets.length);
          const mergedSets: WorkoutSet[] = Array.from({ length: maxLength }, (_, index) => {
            const existing = existingSets[index];
            const candidate = mappedSets[index];

            if (!existing && candidate) return candidate;
            if (existing && !candidate) return existing;
            if (!existing && !candidate) return { done: false };

            if (isCardio) {
              return {
                durationMinutes: hasInputValue(existing?.durationMinutes)
                  ? existing?.durationMinutes
                  : candidate?.durationMinutes ?? "",
                distanceKm: hasInputValue(existing?.distanceKm)
                  ? existing?.distanceKm
                  : candidate?.distanceKm ?? "",
                done: false,
              };
            }

            return {
              weight: hasInputValue(existing?.weight) ? existing?.weight : candidate?.weight ?? "",
              reps: hasInputValue(existing?.reps) ? existing?.reps : candidate?.reps ?? "",
              done: false,
            };
          });

          const cleanedSets = trimTrailingEmptySets(mergedSets, isCardio);
          if (cleanedSets.length > 0) {
            hints[exerciseName] = cleanedSets;
          }
        });
      });

      setPreviousExerciseHints(hints);
    } catch (error) {
      console.error("前回セットの取得に失敗:", error);
    }
  }, []);

  useEffect(() => {
    if (editWorkoutId) {
      const loadEditData = async () => {
        setLoading(true);
        try {
          const user = auth.currentUser;
          if (!user) return;
          const docRef = doc(db, "users", user.uid, "workouts", editWorkoutId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            setMenu(data.exercises || []);
            setCurrentRoutineName(data.routineName || "自由メニュー");
            setTimerSeconds(data.durationSeconds || 0);
            startTimeRef.current = Date.now() - (data.durationSeconds || 0) * 1000;
            setOriginalDateData({ date: data.date, dateObj: data.dateObj });
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
          setDraftRestored(true);
        }
      };
      loadEditData();
    }
  }, [editWorkoutId]);

  const restoreTrainingDraft = useCallback(async () => {
    if (draftRestored || editWorkoutId) return; 

    const key = getTrainingDraftKey();
    if (!key) {
      setDraftRestored(true);
      return;
    }

    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) {
        setDraftRestored(true);
        return;
      }

      const parsed = JSON.parse(raw) as Partial<TrainingDraft>;
      const today = getTodayDateString();

      if (parsed.savedDate !== today) {
        await AsyncStorage.removeItem(key);
        setDraftRestored(true);
        return;
      }

      if (!Array.isArray(parsed.menu) || parsed.menu.length === 0) {
        await AsyncStorage.removeItem(key);
        setDraftRestored(true);
        return;
      }

      setMenu(parsed.menu as Exercise[]);
      setCurrentRoutineName(
        typeof parsed.currentRoutineName === "string" && parsed.currentRoutineName.trim()
          ? parsed.currentRoutineName
          : "自由メニュー"
      );
      
      const restoredSeconds = typeof parsed.timerSeconds === "number" ? parsed.timerSeconds : 0;
      setTimerSeconds(restoredSeconds);
      startTimeRef.current = Date.now() - restoredSeconds * 1000;
      
    } catch (error) {
      console.error("トレーニング下書きの復元に失敗:", error);
    } finally {
      setDraftRestored(true);
    }
  }, [draftRestored, editWorkoutId]);

  useFocusEffect(
    useCallback(() => {
      const loadSetting = async () => {
        const val = await AsyncStorage.getItem('@auto_check_set');
        setAutoCheck(val === 'true');
      };
      void Promise.all([loadSetting(), fetchPreviousExerciseHints(), restoreTrainingDraft()]);

      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const checkTutorial = async () => {
        const user = auth.currentUser;
        if (!user) return;
        try {
          const hasSeen = await AsyncStorage.getItem(`@tutorial_training_${user.uid}`);
          if (!hasSeen && !cancelled) {
            timer = setTimeout(() => {
              if (!cancelled) void startTutorialRef.current();
            }, 500);
          }
        } catch (e) { }
      };
      checkTutorial();

      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      };
    }, [fetchPreviousExerciseHints, restoreTrainingDraft])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && startTimeRef.current && menu.length > 0) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setTimerSeconds(elapsed);
      }
    });
    return () => {
      subscription.remove();
    };
  }, [menu.length]);

  useEffect(() => {
    const onStop = async () => {
      const user = auth.currentUser;
      if (user) {
        await AsyncStorage.setItem(`@tutorial_training_${user.uid}`, "true");
      }
    };
    copilotEvents.on("stop", onStop);
    return () => {
      copilotEvents.off("stop", onStop);
    };
  }, [copilotEvents]);

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
    let interval: any = null;

    if (menu.length > 0) {
      setIsTimerActive(true);
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }
      interval = setInterval(() => {
        if (startTimeRef.current) {
          const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setTimerSeconds(elapsedSeconds);
        }
      }, 1000);
    } else {
      setIsTimerActive(false);
      startTimeRef.current = null;
      setTimerSeconds(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [menu.length]);

  useEffect(() => {
    if (!draftRestored || editWorkoutId) return; 

    if (menu.length === 0) {
      void clearTrainingDraft();
      return;
    }

    const draft: TrainingDraft = {
      savedDate: getTodayDateString(),
      currentRoutineName,
      timerSeconds,
      menu,
    };
    void persistTrainingDraft(draft);
  }, [draftRestored, menu, currentRoutineName, clearTrainingDraft, persistTrainingDraft, editWorkoutId]);

  useEffect(() => {
    if (!draftRestored || menu.length === 0 || editWorkoutId) return;
    if (timerSeconds === 0 || timerSeconds % 10 !== 0) return;

    const draft: TrainingDraft = {
      savedDate: getTodayDateString(),
      currentRoutineName,
      timerSeconds,
      menu,
    };
    void persistTrainingDraft(draft);
  }, [draftRestored, timerSeconds, menu, currentRoutineName, persistTrainingDraft, editWorkoutId]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  const getPreviousSetPlaceholder = (
    exerciseName: string,
    setIndex: number,
    field: "weight" | "reps" | "durationMinutes" | "distanceKm"
  ) => {
    const previousSet = previousExerciseHints[exerciseName]?.[setIndex];
    if (!previousSet) return "";
    const value = previousSet[field];
    return value && value.toString().trim() ? value.toString() : "";
  };

  const handleAddExercise = (exerciseName: string, category: string) => {
    const isCardio = category.includes("有酸素");
    const previousSets = previousExerciseHints[exerciseName] ?? [];
    const initialSetCount = Math.max(previousSets.length, 1);
    const newExercise: Exercise = {
      id: Date.now(),
      name: exerciseName,
      category: category,
      target: "- kg x -",
      sets: Array.from({ length: initialSetCount }, () =>
        isCardio
          ? { durationMinutes: "", distanceKm: "", done: autoCheck }
          : { weight: "", reps: "", done: autoCheck }
      ),
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
            const loadedExercises: Exercise[] = routine.exercises.map((ex) => {
              const isCardio = (ex.category || "").includes("有酸素");
              return {
                ...ex,
                category: ex.category || "他",
                id: Date.now() + Math.random(),
                sets: ex.sets.map((s) => {
                  if (isCardio) {
                    return {
                      durationMinutes: s.durationMinutes ?? s.weight ?? "",
                      distanceKm: s.distanceKm ?? s.reps ?? "",
                      done: autoCheck
                    };
                  } else {
                    return {
                      weight: s.weight ?? "",
                      reps: s.reps ?? "",
                      done: autoCheck
                    };
                  }
                }),
              };
            });
            setMenu(loadedExercises);
            setCurrentRoutineName(routine.name);
            setTimerSeconds(0);
            startTimeRef.current = Date.now();
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
      prev.map((ex) => {
        if (ex.id === exerciseId) {
          const isCardio = ex.category.includes("有酸素");
          const newSet = isCardio
            ? { durationMinutes: "", distanceKm: "", done: autoCheck }
            : { weight: "", reps: "", done: autoCheck };
          return { ...ex, sets: [...ex.sets, newSet] };
        }
        return ex;
      })
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

            const targetDocId = editWorkoutId ? editWorkoutId : `${dateStr}_${timeStr}_${safeRoutineName}`;

            const saveData = {
              routineName: currentRoutineName,
              exercises: menu,
              durationSeconds: timerSeconds,
              ...(editWorkoutId && originalDateData
                ? { date: originalDateData.date, dateObj: originalDateData.dateObj }
                : { date: serverTimestamp(), dateObj: now.toISOString() }
              )
            };

            await setDoc(doc(db, "users", user.uid, "workouts", targetDocId), saveData, { merge: true });
            
            if (!editWorkoutId) {
              await clearTrainingDraft();
            }

            Alert.alert("Good Job!", "保存しました", [
              {
                text: "OK",
                onPress: () => {
                  void (async () => {
                    try {
                      const { presentInterstitialWhenReady } = await import(
                        "../../utils/interstitialAdPresenter"
                      );
                      await presentInterstitialWhenReady({ bypassCooldown: true });
                    } finally {
                      setMenu([]);
                      startTimeRef.current = null;
                      navigation?.navigate?.("home");
                    }
                  })();
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
      {editWorkoutId && (
        <View style={{ backgroundColor: '#2ecc71', padding: 8, alignItems: 'center' }}>
          <Text style={{ color: '#000', fontWeight: 'bold' }}>過去のトレーニング記録を編集中</Text>
        </View>
      )}
      
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
          ref={scrollViewRef} // ★ Refを追加
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
            const isCardio = item.category?.includes("有酸素");

            return (
              <View key={item.id} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <View>
                    <Text style={styles.exerciseName}>{item.name}</Text>
                    <Text style={{ color: "#2ecc71", fontSize: 10 }}>{item.category}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveExercise(item.id)}
                    style={{ padding: 5 }}
                  >
                    <X color="#ff4444" size={24} />
                  </TouchableOpacity>
                </View>

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
                        placeholder={
                          getPreviousSetPlaceholder(
                            item.name,
                            index,
                            isCardio ? "durationMinutes" : "weight"
                          ) || (isCardio ? "分" : "-")
                        }
                        placeholderTextColor="#444"
                        value={isCardio ? (set.durationMinutes || "") : (set.weight || "")}
                        onChangeText={(val) =>
                          handleUpdateSet(item.id, index, isCardio ? "durationMinutes" : "weight", val)
                        }
                        returnKeyType="done"
                      />
                    </View>
                    <View style={[styles.inputBox, { width: "25%" }]}>
                      <TextInput
                        style={styles.inputFieldText}
                        keyboardType="numeric"
                        placeholder={
                          getPreviousSetPlaceholder(
                            item.name,
                            index,
                            isCardio ? "distanceKm" : "reps"
                          ) || (isCardio ? "km" : "-")
                        }
                        placeholderTextColor="#444"
                        value={isCardio ? (set.distanceKm || "") : (set.reps || "")}
                        onChangeText={(val) =>
                          handleUpdateSet(item.id, index, isCardio ? "distanceKm" : "reps", val)
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

          <CopilotStep
            text="まずはここから種目を追加して、今日のトレーニングを始めましょう！"
            order={1}
            name="addExercise"
          >
            <WalkthroughableView
              style={styles.addExerciseBtn}
              onPress={() => setModalVisible(true)}
            >
              <Plus color="#000" size={20} />
              <Text style={styles.addExerciseBtnText}>種目を追加する</Text>
            </WalkthroughableView>
          </CopilotStep>

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
        autoCheck={autoCheck}
        onLoadRoutine={handleLoadRoutine}
      />
    </SafeAreaView>
  );
};

export default function TrainingTabScreen(props: Props) {
  return (
    <CopilotProvider
      stopOnOutsideClick={false}
      androidStatusBarVisible={true}
      backdropColor="rgba(0, 0, 0, 0.85)"
      tooltipStyle={{ backgroundColor: "#ffffff", borderRadius: 12, margin: 16, paddingTop: 16, paddingBottom: 16 }}
      stepNumberComponent={() => null}
      labels={{ skip: "スキップ", previous: "前へ", next: "次へ", finish: "OK" }}
    >
      <TrainingTabContent {...props} />
    </CopilotProvider>
  );
}