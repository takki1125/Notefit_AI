import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
// addDoc を消して、使うものだけにした
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';

import { auth, db } from '../firebaseConfig';

export type TrainingSet = {
  weight: string | number;
  reps: string | number;
  done: boolean;
};

export type TrainingExercise = {
  id: number;
  name: string;
  target: string;
  sets: TrainingSet[];
};

export type UseTrainingSessionResult = {
  menu: TrainingExercise[];
  currentRoutineName: string;
  timerSeconds: number;
  isTimerActive: boolean;
  loading: boolean;
  handleAddExercise: (exerciseName: string) => void;
  handleLoadRoutine: (routine: { name: string; exercises: TrainingExercise[] }) => void;
  handleRemoveExercise: (exerciseId: number) => void;
  handleAddSet: (exerciseId: number) => void;
  handleRemoveSet: (exerciseId: number, setIndex: number) => void;
  handleUpdateSet: (exerciseId: number, setIndex: number, field: 'weight' | 'reps', value: string) => void;
  toggleSetDone: (exerciseId: number, setIndex: number) => void;
  handleFinishWorkout: () => void;
};

export function useTrainingSession(navigation: any): UseTrainingSessionResult {
  const [menu, setMenu] = useState<TrainingExercise[]>([]);
  const [currentRoutineName, setCurrentRoutineName] = useState('自由メニュー');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!navigation) return;

    if (menu.length > 0) {
      setIsTimerActive(true);
      navigation.setOptions({ tabBarStyle: { display: 'none' } });
    } else {
      setIsTimerActive(false);
      setTimerSeconds(0);
      navigation.setOptions({
        tabBarStyle: { backgroundColor: '#1a1a1a', borderTopColor: '#333' },
      });
    }
  }, [menu.length, navigation]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isTimerActive) {
      interval = setInterval(() => {
        setTimerSeconds(sec => sec + 1);
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isTimerActive]);

  const handleAddExercise = (exerciseName: string) => {
    const newExercise: TrainingExercise = {
      id: Date.now(),
      name: exerciseName,
      target: '- kg x -',
      sets: [{ weight: '', reps: '', done: false }],
    };
    setMenu(prev => [...prev, newExercise]);
  };

  const handleLoadRoutine = (routine: { name: string; exercises: TrainingExercise[] }) => {
    Alert.alert('ルーティン読み込み', '現在の入力内容は失われますが、よろしいですか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '読み込む',
        onPress: () => {
          const loadedExercises: TrainingExercise[] = routine.exercises.map(ex => ({
            ...ex,
            id: Date.now() + Math.random(),
            sets: ex.sets.map(s => ({ ...s, done: false })),
          }));
          setMenu(loadedExercises);
          setCurrentRoutineName(routine.name);
          setTimerSeconds(0);
        },
      },
    ]);
  };

  const handleRemoveExercise = (exerciseId: number) => {
    Alert.alert('削除', 'この種目を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => setMenu(prev => prev.filter(item => item.id !== exerciseId)),
      },
    ]);
  };

  const handleAddSet = (exerciseId: number) => {
    setMenu(prev =>
      prev.map(ex =>
        ex.id === exerciseId
          ? {
            ...ex,
            sets: [...ex.sets, { weight: '', reps: '', done: false }],
          }
          : ex,
      ),
    );
  };

  const handleRemoveSet = (exerciseId: number, setIndex: number) => {
    setMenu(prev =>
      prev.map(ex => {
        if (ex.id === exerciseId) {
          if (ex.sets.length <= 1) {
            handleRemoveExercise(exerciseId);
            return ex;
          }
          return {
            ...ex,
            sets: ex.sets.filter((_, i) => i !== setIndex),
          };
        }
        return ex;
      }),
    );
  };

  const handleUpdateSet = (
    exerciseId: number,
    setIndex: number,
    field: 'weight' | 'reps',
    value: string,
  ) => {
    setMenu(prev =>
      prev.map(ex =>
        ex.id === exerciseId
          ? {
            ...ex,
            sets: ex.sets.map((s, i) =>
              i === setIndex
                ? {
                  ...s,
                  [field]: value,
                }
                : s,
            ),
          }
          : ex,
      ),
    );
  };

  const toggleSetDone = (exerciseId: number, setIndex: number) => {
    setMenu(prev =>
      prev.map(ex =>
        ex.id === exerciseId
          ? {
            ...ex,
            sets: ex.sets.map((s, i) =>
              i === setIndex
                ? {
                  ...s,
                  done: !s.done,
                }
                : s,
            ),
          }
          : ex,
      ),
    );
  };

  const handleFinishWorkout = () => {
    if (menu.length === 0) {
      Alert.alert('エラー', '種目がありません');
      return;
    }

    Alert.alert('終了', '保存して終了しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '保存して終了',
        onPress: async () => {
          setLoading(true);
          try {
            const user = auth.currentUser;
            if (!user) return;

            // ★ わかりやすいドキュメントIDを作成
            const now = new Date();
            const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;

            // ルーティン名がない場合は「自由メニュー」、スラッシュなど使えない文字をアンダースコアに変換
            const safeRoutineName = currentRoutineName ? currentRoutineName.replace(/[\/]/g, '_') : '自由メニュー';

            // 例: "2026-03-10_14-30-00_胸トレ"
            const customDocId = `${dateStr}_${timeStr}_${safeRoutineName}`;
            console.log("★これから保存するファイル名:", customDocId);

            // ★ addDoc をやめて setDoc に変更。doc() で保存先とIDを明確に指定
            await setDoc(doc(db, 'users', user.uid, 'workouts', customDocId), {
              date: serverTimestamp(),
              dateObj: now.toISOString(), // グラフ描画用
              routineName: currentRoutineName,
              exercises: menu,
              durationSeconds: timerSeconds,
            });

            Alert.alert('Good Job!', '保存しました', [
              {
                text: 'OK',
                onPress: () => {
                  void (async () => {
                    try {
                      const { presentInterstitialWhenReady } = await import(
                        '../utils/interstitialAdPresenter'
                      );
                      await presentInterstitialWhenReady({ bypassCooldown: true });
                    } finally {
                      setMenu([]);
                      navigation.navigate('HomeTab');
                    }
                  })();
                },
              },
            ]);
          } catch (e) {
            Alert.alert('エラー', '保存失敗');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return {
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
  };
}