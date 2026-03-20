import {
  Check,
  ChevronDown,
  Clock,
  Dumbbell,
  Plus,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ExerciseSelectorModal from "../../components/training/ExerciseSelectorModal";
import RoutineModal from "../../components/training/RoutineModal";
import { useTrainingSession } from "../../hooks/useTrainingSession";
import { styles } from "../../theme/styles";
import { formatTime } from "../../utils/time";

type TrainingScreenProps = {
  navigation: any;
};

export default function TrainingScreen({ navigation }: TrainingScreenProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [routineModalVisible, setRoutineModalVisible] = useState(false);

  const {
    menu,
    currentRoutineName,
    timerSeconds,
    isTimerActive,
    loading,
    handleAddExercise,
    handleLoadRoutine,
    handleRemoveExercise,
    handleAddSet,
    handleRemoveSet,
    handleUpdateSet,
    toggleSetDone,
    handleFinishWorkout,
  } = useTrainingSession(navigation);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerLabel}>Today's Workout</Text>
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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={100}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
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

          {menu.map((item) => (
            <View key={item.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>{item.name}</Text>
                <TouchableOpacity
                  onPress={() => handleRemoveExercise(item.id)}
                  style={{ padding: 5 }}
                >
                  <X color="#ff4444" size={24} />
                </TouchableOpacity>
              </View>

              <View style={styles.setRowHeader}>
                <Text style={[styles.colLabel, { width: "15%" }]}>SET</Text>
                <Text style={[styles.colLabel, { width: "25%" }]}>KG</Text>
                <Text style={[styles.colLabel, { width: "25%" }]}>REPS</Text>
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
                      placeholder="-"
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
                      placeholder="-"
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
                <Text style={styles.addSetBtnText}>セットを追加</Text>
              </TouchableOpacity>
            </View>
          ))}

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
}
