import { useRouter } from "expo-router";
import { Pencil, Plus, Trash2, X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  SectionList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, getDocs } from "firebase/firestore";

import { FREE_CUSTOM_EXERCISE_LIMIT } from "../../constants/subscriptionLimits";
import { auth, db } from "../../firebaseConfig";
import { useExerciseMaster, type CustomExerciseListItem } from "../../hooks/useExerciseMaster";
import { useSubscriptionEntitlements } from "../../hooks/useSubscriptionEntitlements";
import { styles } from "../../theme/styles";
import {
  callableCreateCustomExercise,
  callableDeleteCustomExercise,
  callableUpdateCustomExercise,
} from "../../utils/aiUserContentCallables";

type ExerciseSelectorModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (name: string) => void;
};

type CustomRow = { id: string; name: string; categoryLabel: string };

export default function ExerciseSelectorModal({
  visible,
  onClose,
  onSelect,
}: ExerciseSelectorModalProps) {
  const router = useRouter();
  const { categories, selectedCategory, loading, setSelectedCategory } = useExerciseMaster(visible);
  const { flags } = useSubscriptionEntitlements();

  const [customRows, setCustomRows] = useState<CustomRow[]>([]);
  const [newExerciseName, setNewExerciseName] = useState("");
  const [savingCustom, setSavingCustom] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategoryLabel, setEditCategoryLabel] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const isCustomUnlimited = flags.unlockExtraExercises || flags.hideAds;

  const reloadCustoms = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setCustomRows([]);
      return;
    }
    try {
      const snap = await getDocs(collection(db, "users", user.uid, "custom_exercises"));
      setCustomRows(
        snap.docs.map((d) => {
          const x = d.data() as { name?: string; categoryLabel?: string };
          return {
            id: d.id,
            name: typeof x.name === "string" ? x.name : "",
            categoryLabel: typeof x.categoryLabel === "string" ? x.categoryLabel : "",
          };
        }),
      );
    } catch {
      setCustomRows([]);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    void reloadCustoms();
    setNewExerciseName("");
  }, [visible, reloadCustoms]);

  const displayCategories = useMemo(() => {
    return categories.map((cat) => {
      const mine = customRows.filter((r) => r.categoryLabel === cat.label && r.name.length > 0);
      const baseSections = [...cat.sections];
      if (mine.length > 0) {
        baseSections.unshift({
          title: "マイ種目",
          data: mine.map(
            (m): CustomExerciseListItem => ({
              kind: "custom",
              id: m.id,
              name: m.name,
              categoryLabel: m.categoryLabel,
            }),
          ),
        });
      }
      return { ...cat, sections: baseSections };
    });
  }, [categories, customRows]);

  const activeSections = useMemo(() => {
    if (!selectedCategory) return [];
    const row = displayCategories.find((c) => c.id === selectedCategory.id);
    return row?.sections ?? [];
  }, [displayCategories, selectedCategory]);

  const customCount = customRows.filter((r) => r.name).length;
  const atCustomLimit = !isCustomUnlimited && customCount >= FREE_CUSTOM_EXERCISE_LIMIT;

  const promptUpgrade = () => {
    Alert.alert(
      "プレミアムで無制限",
      `無料プランではマイ種目は最大${FREE_CUSTOM_EXERCISE_LIMIT}件までです。`,
      [
        { text: "キャンセル", style: "cancel" },
        { text: "プランを見る", onPress: () => router.push("/settings/monetization") },
      ],
    );
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
      Alert.alert("入力エラー", "種目名を入力してください。");
      return;
    }
    const cat = editCategoryLabel.trim();
    if (!cat) {
      Alert.alert("入力エラー", "部位を選んでください。");
      return;
    }
    setSavingEdit(true);
    try {
      await callableUpdateCustomExercise(editTarget.id, name, cat);
      closeEditCustom();
      await reloadCustoms();
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
              await reloadCustoms();
            } catch {
              Alert.alert("エラー", "削除に失敗しました。");
            }
          })();
        },
      },
    ]);
  };

  const handleSaveCustom = async () => {
    const name = newExerciseName.trim();
    if (!name) {
      Alert.alert("入力エラー", "種目名を入力してください。");
      return;
    }
    if (!selectedCategory) return;
    if (atCustomLimit) {
      promptUpgrade();
      return;
    }
    setSavingCustom(true);
    try {
      await callableCreateCustomExercise(name, selectedCategory.label);
      setNewExerciseName("");
      await reloadCustoms();
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      const msg = (e as Error)?.message ?? "保存に失敗しました。";
      if (code === "functions/resource-exhausted") {
        promptUpgrade();
      } else {
        Alert.alert("エラー", msg);
      }
    } finally {
      setSavingCustom(false);
    }
  };

  return (
    <>
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>種目を選択</Text>
          <TouchableOpacity onPress={onClose}>
            <X color="#fff" size={24} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#2ecc71" style={{ marginTop: 50 }} />
        ) : (
          <View style={{ flex: 1 }}>
            <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <Text style={{ color: "#888", fontSize: 12 }}>
                マイ種目{" "}
                {isCustomUnlimited
                  ? "（プレミアム・無制限）"
                  : `（無料 ${customCount} / ${FREE_CUSTOM_EXERCISE_LIMIT}）`}
              </Text>
              <View style={{ flexDirection: "row", marginTop: 8, gap: 8 }}>
                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: "#1a1a1a",
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: "#fff",
                    borderWidth: 1,
                    borderColor: "#444",
                  }}
                  placeholder="マイ種目を追加…"
                  placeholderTextColor="#666"
                  value={newExerciseName}
                  onChangeText={setNewExerciseName}
                  editable={!savingCustom}
                />
                <TouchableOpacity
                  style={{
                    backgroundColor: atCustomLimit ? "#444" : "#2ecc71",
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    justifyContent: "center",
                    opacity: savingCustom ? 0.6 : 1,
                  }}
                  disabled={savingCustom || atCustomLimit}
                  onPress={() => (atCustomLimit ? promptUpgrade() : void handleSaveCustom())}
                >
                  {savingCustom ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={{ color: "#000", fontWeight: "700" }}>追加</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ height: 50 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
                {displayCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.tabBtn,
                      selectedCategory?.id === cat.id && styles.activeTabBtn,
                      cat.sections.length === 0 && { opacity: 0.5 },
                    ]}
                    onPress={() => {
                      const plain = categories.find((c) => c.id === cat.id);
                      if (plain) setSelectedCategory(plain);
                    }}
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
              sections={activeSections}
              keyExtractor={(item, index) =>
                typeof item === "string" ? `${item}_${index}` : item.id
              }
              stickySectionHeadersEnabled={false}
              renderSectionHeader={({ section: { title } }) => (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionHeaderText}>{title}</Text>
                </View>
              )}
              renderItem={({ item }) => {
                if (typeof item === "string") {
                  return (
                    <TouchableOpacity
                      style={styles.exerciseListItem}
                      onPress={() => {
                        onSelect(item);
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
                        onSelect(c.name);
                        onClose();
                      }}
                    >
                      <Text style={[styles.exerciseListText, { color: "#f1c40f", flex: 1 }]}>{c.name}</Text>
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
              ListEmptyComponent={
                <View style={{ padding: 20, alignItems: "center" }}>
                  <Text style={{ color: "#666" }}>種目がありません</Text>
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
          <Text style={{ color: "#fff", fontSize: 17, fontWeight: "bold", marginBottom: 12 }}>マイ種目を編集</Text>
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
          <Text style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>部位</Text>
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
}
