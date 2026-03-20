import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Trash2, X } from 'lucide-react-native';

import { styles } from '../../theme/styles';
import { useRoutines } from '../../hooks/useRoutines';
import type { TrainingExercise } from '../../hooks/useTrainingSession';

type RoutineModalProps = {
  visible: boolean;
  onClose: () => void;
  currentMenu: TrainingExercise[];
  onLoadRoutine: (routine: { id: string; name: string; exercises: TrainingExercise[] }) => void;
};

export default function RoutineModal({
  visible,
  onClose,
  currentMenu,
  onLoadRoutine,
}: RoutineModalProps) {
  const {
    routines,
    loading,
    mode,
    newRoutineName,
    setMode,
    setNewRoutineName,
    saveRoutine,
    deleteRoutine,
  } = useRoutines(visible);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {mode === 'list' ? 'ルーティンを選択' : 'ルーティンを保存'}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <X color="#fff" size={24} />
          </TouchableOpacity>
        </View>

        {mode === 'list' ? (
          <View style={{ flex: 1, padding: 16 }}>
            <TouchableOpacity
              style={styles.createRoutineBtn}
              onPress={() => setMode('save')}
            >
              <Plus color="#000" size={20} />
              <Text style={styles.createRoutineText}>現在のメニューを保存する</Text>
            </TouchableOpacity>

            <Text style={{ color: '#666', marginTop: 20, marginBottom: 10 }}>SAVED ROUTINES</Text>

            {loading ? (
              <ActivityIndicator />
            ) : (
              <FlatList
                data={routines}
                keyExtractor={item => item.id}
                ListEmptyComponent={
                  <Text style={{ color: '#444', textAlign: 'center', marginTop: 20 }}>
                    保存されたルーティンはありません
                  </Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.routineItem}
                    onPress={() => {
                      onLoadRoutine(item);
                      onClose();
                    }}
                  >
                    <View>
                      <Text style={styles.routineNameText}>{item.name}</Text>
                      <Text style={styles.routineDescText}>
                        {item.exercises.length} 種目
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => deleteRoutine(item.id)}
                      style={{ padding: 10 }}
                    >
                      <Trash2 color="#444" size={20} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        ) : (
          <View style={{ flex: 1, padding: 20 }}>
            <Text style={{ color: '#ccc', marginBottom: 10 }}>
              現在のメニュー内容をルーティンとして保存します。
            </Text>
            <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 20 }}>
              {currentMenu.map(e => e.name).join(', ')}
            </Text>

            <TextInput
              style={styles.inputField}
              placeholder="ルーティン名 (例: 胸の日 A)"
              placeholderTextColor="#666"
              value={newRoutineName}
              onChangeText={setNewRoutineName}
              autoFocus
            />

            <View style={{ flexDirection: 'row', columnGap: 10, marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.loginButton, { backgroundColor: '#444', flex: 1 }]}
                onPress={() => setMode('list')}
              >
                <Text style={{ color: '#fff' }}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.loginButton, { flex: 1 }]}
                onPress={() => saveRoutine(currentMenu)}
              >
                <Text style={{ fontWeight: 'bold' }}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

