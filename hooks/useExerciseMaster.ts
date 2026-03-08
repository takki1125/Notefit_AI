import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';

import { db } from '../firebaseConfig';

// マスターデータコレクション（種目マスタ）から、
// カテゴリごとの種目一覧を取得して、ピッカー/セレクト用の形に整えるカスタムフック
export type ExerciseSection = {
  // セクションタイトル（例: 「ベンチプレス系」など）
  title: string;
  // そのセクションに属する種目名リスト
  data: string[];
};

export type ExerciseCategory = {
  // Firestore ドキュメントID
  id: string;
  // 画面表示用ラベル（なければIDを使う）
  label: string;
  // 各カテゴリ内のセクション一覧
  sections: ExerciseSection[];
};

export type UseExerciseMasterResult = {
  // 種目カテゴリ一覧
  categories: ExerciseCategory[];
  // 現在選択中のカテゴリ
  selectedCategory: ExerciseCategory | null;
  // ローディング状態
  loading: boolean;
  // カテゴリ選択変更用
  setSelectedCategory: (category: ExerciseCategory) => void;
};

// visible: 種目選択モーダルなどが開いているかどうか
// 開いているときだけマスターデータを読み込むことで無駄な通信を避ける
export function useExerciseMaster(visible: boolean): UseExerciseMasterResult {
  const [categories, setCategories] = useState<ExerciseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | null>(null);

  useEffect(() => {
    if (!visible) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'master_data'));
        const data: ExerciseCategory[] = [];

        querySnapshot.forEach(d => {
          const docData = d.data() as any;
          const sections: ExerciseSection[] = [];

          // docData.categories: { [key: string]: { exercises: string[] } } 形式を想定
          if (docData.categories && typeof docData.categories === 'object') {
            Object.keys(docData.categories).forEach(key => {
              const subCat = docData.categories[key];
              if (subCat && Array.isArray(subCat.exercises) && subCat.exercises.length > 0) {
                sections.push({
                  title: key,
                  data: subCat.exercises,
                });
              }
            });
          }

          // 単純な exercises 配列もあれば「その他」としてまとめる
          if (Array.isArray(docData.exercises) && docData.exercises.length > 0) {
            sections.push({
              title: 'その他',
              data: docData.exercises,
            });
          }

          data.push({
            id: d.id,
            label: docData.label || d.id,
            sections,
          });
        });

        setCategories(data);

        // 最初に、有効なセクションを持つカテゴリを選択状態にする
        const firstValid = data.find(c => c.sections.length > 0);
        if (firstValid) {
          setSelectedCategory(firstValid);
        } else if (data.length > 0) {
          setSelectedCategory(data[0]);
        }
      } catch (e) {
        console.error('Error fetching data: ', e);
        Alert.alert('エラー', 'データの読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [visible]);

  return {
    categories,
    selectedCategory,
    loading,
    setSelectedCategory,
  };
}

