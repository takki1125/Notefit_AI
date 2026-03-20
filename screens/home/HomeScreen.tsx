import { Dumbbell, Settings as SettingsIcon } from "lucide-react-native";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CalendarSection from "../../components/home/CalendarSection";
import WorkoutDetailModal from "../../components/home/WorkoutDetailModal";
import { auth } from "../../firebaseConfig";
import { useWorkoutHistory } from "../../hooks/useWorkoutHistory";
import { styles } from "../../theme/styles";

type HomeScreenProps = {
  navigation: any;
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const {
    trainedDays,
    lastWorkout,
    selectedWorkout,
    modalVisible,
    handleDayPress,
    closeModal,
    handleDeleteWorkout,
  } = useWorkoutHistory();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.homeHeader}>
        <View>
          <Text style={styles.headerLabel}>Welcome back,</Text>
          <Text style={styles.routineText}>
            {auth.currentUser?.email?.split("@")[0] || "User"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate("Settings")}
          style={styles.iconButton}
        >
          <SettingsIcon color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <CalendarSection
          trainedDays={trainedDays}
          onDayPress={handleDayPress}
        />

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate("TrainingTab")}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 15,
            }}
          >
            <View>
              <Text style={{ color: "#888", fontSize: 12, marginBottom: 4 }}>
                LATEST WORKOUT
              </Text>
              <Text style={{ color: "#fff", fontSize: 20, fontWeight: "bold" }}>
                {lastWorkout ? lastWorkout.routineName : "START WORKOUT"}
              </Text>
              {lastWorkout && (
                <Text style={{ color: "#2ecc71", fontSize: 12, marginTop: 4 }}>
                  {lastWorkout.dateStr}
                </Text>
              )}
            </View>
            <View
              style={{
                backgroundColor: "#2ecc71",
                borderRadius: 20,
                width: 40,
                height: 40,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Dumbbell color="#000" size={20} />
            </View>
          </View>
          <View style={{ gap: 8 }}>
            {lastWorkout ? (
              lastWorkout.exercises.slice(0, 3).map((ex, i) => (
                <View
                  key={i}
                  style={{ flexDirection: "row", alignItems: "center" }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "#2ecc71",
                      marginRight: 8,
                    }}
                  />
                  <Text style={{ color: "#ccc" }}>{ex.name}</Text>
                  <Text style={{ color: "#666", marginLeft: "auto" }}>
                    {ex.sets.filter((s) => s.done).length} sets
                  </Text>
                </View>
              ))
            ) : (
              <Text style={{ color: "#666" }}>
                タップしてトレーニングを開始
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.calorieBox}>
              <Text style={styles.calorieLabel}>合計ワークアウト</Text>
              <Text style={styles.calorieValue}>{trainedDays.length}回</Text>
            </View>
            <View style={styles.aiBox}>
              <Text style={{ color: "#000", padding: 10 }}>継続は力なり!</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <WorkoutDetailModal
        visible={modalVisible}
        onClose={closeModal}
        workout={selectedWorkout}
        onDelete={handleDeleteWorkout}
      />
    </SafeAreaView>
  );
}
