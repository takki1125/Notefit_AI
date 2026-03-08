import React from 'react';
import { Alert, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Check, Trash2, X } from 'lucide-react-native';

type Workout = {
  id: string;
  dateStr: string;
  routineName: string;
  exercises: {
    name: string;
    sets: { weight: string | number; reps: string | number; done: boolean }[];
  }[];
};

type WorkoutDetailModalProps = {
  visible: boolean;
  onClose: () => void;
  workout: Workout | null;
  onDelete: (id: string) => void;
};

export default function WorkoutDetailModal({
  visible,
  onClose,
  workout,
  onDelete,
}: WorkoutDetailModalProps) {
  if (!workout) return null;

  const confirmDelete = () => {
    Alert.alert('記録を削除', 'このトレーニング記録を削除しますか？\nこの操作は元に戻せません。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: () => onDelete(workout.id),
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.8)',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <View style={{ backgroundColor: '#2a2a2a', borderRadius: 20, maxHeight: '80%' }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderColor: '#444',
            }}
          >
            <View>
              <Text style={{ color: '#888', fontSize: 12 }}>{workout.dateStr}</Text>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                {workout.routineName}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', columnGap: 15 }}>
              <TouchableOpacity onPress={confirmDelete}>
                <Trash2 color="#ff4444" size={24} />
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose}>
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {workout.exercises.map((ex, i) => (
              <View key={i} style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View
                    style={{
                      width: 4,
                      height: 16,
                      backgroundColor: '#2ecc71',
                      marginRight: 8,
                    }}
                  />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                    {ex.name}
                  </Text>
                </View>
                {ex.sets.map((set, k) => (
                  <View
                    key={k}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingVertical: 4,
                      paddingHorizontal: 12,
                      borderBottomWidth: 1,
                      borderColor: '#333',
                    }}
                  >
                    <Text style={{ color: '#888', fontSize: 12 }}>SET {k + 1}</Text>
                    <Text style={{ color: '#fff' }}>
                      {set.weight}
                      kg  ×  {set.reps}
                      reps
                    </Text>
                    {set.done && <Check size={14} color="#2ecc71" />}
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

