import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';

import { auth, db } from '../firebaseConfig';
import type { TrainingExercise } from './useTrainingSession';

// ユーザーが作成したトレーニングルーティン
// （種目の組み合わせと名前）を管理するカスタムフック
export type Routine = {
  // Firestore ドキュメントID
  id: string;
  // ルーティン名（例: 「胸・上腕三頭筋」など）
  name: string;
  // ルーティンに含まれる種目とセット情報
  exercises: TrainingExercise[];
};

export type UseRoutinesResult = {
  // 登録済みルーティン一覧
  routines: Routine[];
  // Firestore との通信中フラグ
  loading: boolean;
  // 画面のモード: 一覧表示 or 保存フォーム
  mode: 'list' | 'save';
  // 新しく保存するルーティン名の入力値
  newRoutineName: string;
  // モード切り替え
  setMode: (mode: 'list' | 'save') => void;
  // ルーティン名入力更新
  setNewRoutineName: (name: string) => void;
  // ルーティン一覧を再取得
  fetchRoutines: () => Promise<void>;
  // 現在のメニュー（種目リスト）を新規ルーティンとして保存
  saveRoutine: (currentMenu: TrainingExercise[]) => Promise<void>;
  // 既存ルーティンを削除
  deleteRoutine: (id: string) => Promise<void>;
};

// モーダルなど「ルーティン一覧を表示するかどうか」で visible を渡し、
// 表示されたときにだけデータを取りに行く
export function useRoutines(visible: boolean): UseRoutinesResult {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [mode, setMode] = useState<'list' | 'save'>('list');

  // Firestoreからルーティン一覧を取得
  const fetchRoutines = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users', user.uid, 'routines'),
        orderBy('createdAt', 'desc'),
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(
        d =>
          ({
            id: d.id,
            ...d.data(),
          } as Routine),
      );
      setRoutines(data);
    } catch (e) {
      console.error(e);
      Alert.alert('エラー', 'ルーティンの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // ルーティン一覧のモーダルなどが開いたタイミングで一覧をロードし、
  // モードと入力値も初期化する
  useEffect(() => {
    if (visible) {
      fetchRoutines();
      setMode('list');
      setNewRoutineName('');
    }
  }, [visible]);

  // 現在のメニュー（各種目とセット）を、新しいルーティンとして保存
  const saveRoutine = async (currentMenu: TrainingExercise[]) => {
    if (!newRoutineName.trim()) {
      Alert.alert('エラー', 'ルーティン名を入力してください');
      return;
    }
    if (currentMenu.length === 0) {
      Alert.alert('エラー', '種目が追加されていません');
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

      await addDoc(collection(db, 'users', user.uid, 'routines'), routineData);
      Alert.alert('保存完了', `「${newRoutineName}」を保存しました`);
      setMode('list');
      fetchRoutines();
    } catch (e) {
      console.error(e);
      Alert.alert('エラー', '保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // ルーティン削除。確認ダイアログのOK押下時にFirestoreから削除する
  const deleteRoutine = async (id: string) => {
    Alert.alert('削除', 'このルーティンを削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          try {
            const user = auth.currentUser;
            if (!user) return;
            await deleteDoc(doc(db, 'users', user.uid, 'routines', id));
            fetchRoutines();
          } catch (e) {
            Alert.alert('エラー', '削除できませんでした');
          }
        },
      },
    ]);
  };

  return {
    routines,
    loading,
    mode,
    newRoutineName,
    setMode,
    setNewRoutineName,
    fetchRoutines,
    saveRoutine,
    deleteRoutine,
  };
}

