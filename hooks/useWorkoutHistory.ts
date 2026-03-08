import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { collection, deleteDoc, doc, getDocs, orderBy, query } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import { auth, db } from '../firebaseConfig';

// Firebase からユーザーのトレーニング履歴を取得し、
// カレンダー表示用の情報や、最後のワークアウト情報などをまとめて管理するカスタムフック
export type WorkoutHistoryItem = {
  // Firestore ドキュメントID
  id: string;
  // 実行したルーティン名
  routineName: string;
  // 実行した種目とセット
  exercises: {
    name: string;
    sets: { weight: string | number; reps: string | number; done: boolean }[];
  }[];
  // 日付オブジェクト（UIロジックで使用）
  dateObj: Date;
  // ローカライズ済みの日付文字列（表示用）
  dateStr: string;
  // 日にちのみ（カレンダーのどの日か）
  day: number;
};

export type UseWorkoutHistoryResult = {
  // すべてのワークアウト履歴
  history: WorkoutHistoryItem[];
  // その月にトレーニングした「日」の一覧（例: [1,3,5,...]）
  trainedDays: number[];
  // 直近のワークアウト（1件）
  lastWorkout: WorkoutHistoryItem | null;
  // モーダルで詳細表示しているワークアウト
  selectedWorkout: WorkoutHistoryItem | null;
  // 詳細モーダルの表示・非表示
  modalVisible: boolean;
  // カレンダー上の日付タップ時のハンドラ
  handleDayPress: (day: number) => void;
  // モーダルを閉じる
  closeModal: () => void;
  // 履歴を削除する
  handleDeleteWorkout: (workoutId: string) => Promise<void>;
};

export function useWorkoutHistory(): UseWorkoutHistoryResult {
  const [history, setHistory] = useState<WorkoutHistoryItem[]>([]);
  const [trainedDays, setTrainedDays] = useState<number[]>([]);
  const [lastWorkout, setLastWorkout] = useState<WorkoutHistoryItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutHistoryItem | null>(null);

  // Firestore から履歴を取得し、state と AsyncStorage に保存する
  const fetchHistory = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const q = query(
        collection(db, 'users', user.uid, 'workouts'),
        orderBy('date', 'desc'),
      );
      const snapshot = await getDocs(q);

      const historyData: WorkoutHistoryItem[] = [];
      const days: number[] = [];

      snapshot.docs.forEach(d => {
        const data = d.data() as any;
        // Firestore の Timestamp から JS の Date 型へ変換
        const dateObj: Date = data.date ? data.date.toDate() : new Date();

        historyData.push({
          id: d.id,
          ...data,
          dateObj,
          dateStr: dateObj.toLocaleDateString(),
          day: dateObj.getDate(),
        });
        days.push(dateObj.getDate());
      });

      // カレンダー表示用の履歴と、トレーニングを行った日の一覧を更新
      setHistory(historyData);
      setTrainedDays([...new Set(days)]);
      if (historyData.length > 0) {
        setLastWorkout(historyData[0]);
      } else {
        setLastWorkout(null);
      }

      // 統計画面などで再利用できるようにローカルキャッシュも更新
      await AsyncStorage.setItem('@workout_history', JSON.stringify(historyData));
    } catch (e) {
      console.error(e);
    }
  }, []);

  // このhookを使っている画面がフォーカスされたタイミングで履歴を再取得
  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory]),
  );

  // カレンダーの日付をタップしたときに、その日のワークアウト詳細をモーダルで表示
  const handleDayPress = (day: number) => {
    const targetWorkout = history.find(item => item.day === day) || null;
    if (targetWorkout) {
      setSelectedWorkout(targetWorkout);
      setModalVisible(true);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  // ワークアウト履歴の削除処理
  const handleDeleteWorkout = async (workoutId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      await deleteDoc(doc(db, 'users', user.uid, 'workouts', workoutId));

      Alert.alert('削除完了', '記録を削除しました。');
      setModalVisible(false);
      fetchHistory();
    } catch (error) {
      console.error('削除エラー:', error);
      Alert.alert('エラー', '削除に失敗しました。');
    }
  };

  return {
    history,
    trainedDays,
    lastWorkout,
    selectedWorkout,
    modalVisible,
    handleDayPress,
    closeModal,
    handleDeleteWorkout,
  };
}

