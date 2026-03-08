import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import { categorizeBodyPart } from '../utils/workoutCategories';

// トレーニング履歴のキャッシュ（AsyncStorage）から
// 1) 直近4週間のトレーニング回数
// 2) 今月の部位ごとのセット数
// を集計して返すカスタムフック
export type UseWorkoutStatsResult = {
  // グラフ用の週次データ: [3週前, 2週前, 1週前, 今週]
  weeklyData: number[];
  // グラフ用の部位別データ: [胸, 背中, 脚, 肩, 腕]
  bodyPartData: number[];
};

export function useWorkoutStats(): UseWorkoutStatsResult {
  const [weeklyData, setWeeklyData] = useState<number[]>([0, 0, 0, 0]);
  const [bodyPartData, setBodyPartData] = useState<number[]>([0, 0, 0, 0, 0]);

  // AsyncStorage に保存してあるワークアウト履歴を読み出し、
  // 週次・部位別の統計値を計算して state に反映する
  const loadCachedData = useCallback(async () => {
    try {
      const cachedStr = await AsyncStorage.getItem('@workout_history');
      if (!cachedStr) return;

      const history = JSON.parse(cachedStr);
      const now = new Date();
      const currentMonth = now.getMonth();

      // weeks: [今週, 1週前, 2週前, 3週前] としてカウントしてから最後にreverseする
      let weeks = [0, 0, 0, 0]; // [今週, 1週前, 2週前, 3週前]
      // 部位ごとの完了セット数
      let chest = 0;
      let back = 0;
      let legs = 0;
      let shoulders = 0;
      let arms = 0;

      history.forEach((workout: any) => {
        const wDate = new Date(workout.dateObj);

        // 何日前のワークアウトかを算出して週ごとにカウント
        const diffTime = Math.abs(+now - +wDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) weeks[0]++;
        else if (diffDays <= 14) weeks[1]++;
        else if (diffDays <= 21) weeks[2]++;
        else if (diffDays <= 28) weeks[3]++;

        // 当月分のみ、部位ごとの完了セット数を集計
        if (wDate.getMonth() === currentMonth) {
          workout.exercises.forEach((ex: any) => {
            const doneSetsCount = ex.sets.filter((s: any) => s.done).length;
            const part = categorizeBodyPart(ex.name || '');
            if (!doneSetsCount || !part) return;
            if (part === 'chest') chest += doneSetsCount;
            if (part === 'back') back += doneSetsCount;
            if (part === 'legs') legs += doneSetsCount;
            if (part === 'shoulders') shoulders += doneSetsCount;
            if (part === 'arms') arms += doneSetsCount;
          });
        }
      });

      // 表示順を [3週前,2週前,1週前,今週] にそろえる
      setWeeklyData(weeks.reverse());
      setBodyPartData([chest, back, legs, shoulders, arms]);
    } catch (error) {
      console.error('キャッシュ読み込みエラー:', error);
    }
  }, []);

  // ホーム画面など、このhookを使う画面がフォーカスされたタイミングで
  // 毎回最新のキャッシュを読み直す
  useFocusEffect(
    useCallback(() => {
      loadCachedData();
    }, [loadCachedData]),
  );

  return {
    weeklyData,
    bodyPartData,
  };
}

