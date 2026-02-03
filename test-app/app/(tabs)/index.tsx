import { Alert, Button, FlatList, Text, View } from "react-native";
import { useSaveWorkout } from "../../hooks/useSaveWorkout";
import { useWorkoutHistory } from "../../hooks/useWorkoutHistory"; // ★追加

export default function Index() {
  const { saveWorkout, saving } = useSaveWorkout();
  // ★履歴取得機能を使う
  const { history, fetchHistory } = useWorkoutHistory();

  const handlePress = async () => {
    await saveWorkout("ベンチプレス", 100, 10);
    Alert.alert("完了", "保存しました！");
    // 保存したら、リストを更新して最新の状態にする
    fetchHistory();
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#000",
        paddingTop: 50,
        paddingHorizontal: 20,
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          color: "#fff",
          marginBottom: 20,
          textAlign: "center",
        }}
      >
        📊 履歴管理システム
      </Text>

      {/* 保存ボタンエリア */}
      <View style={{ marginBottom: 30 }}>
        <Button
          title={saving ? "送信中..." : "ベンチ 100kg x10 を記録"}
          onPress={handlePress}
          disabled={saving}
        />
      </View>

      {/* 履歴リストエリア */}
      <Text style={{ color: "#aaa", marginBottom: 10 }}>
        最近のトレーニング:
      </Text>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: "#333",
              padding: 15,
              borderRadius: 8,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>
              {item.exercise}
            </Text>
            <Text style={{ color: "#0f0", fontSize: 16 }}>
              {item.weight}kg × {item.reps}回
            </Text>
          </View>
        )}
      />
    </View>
  );
}
