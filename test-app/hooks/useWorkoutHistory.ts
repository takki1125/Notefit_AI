import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebaseConfig";

export const useWorkoutHistory = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 履歴を再取得する関数
  const fetchHistory = async () => {
    setLoading(true);
    try {
      // 「test_user_1」のデータを「日付が新しい順」に取ってくる
      const q = query(
        collection(db, "workouts"),
        where("uid", "==", "test_user_1"),
        orderBy("date", "desc"),
      );

      const querySnapshot = await getDocs(q);
      const dataList: any[] = [];
      querySnapshot.forEach((doc) => {
        dataList.push({ id: doc.id, ...doc.data() });
      });

      setHistory(dataList);
    } catch (error) {
      console.error("履歴取得エラー:", error);
    } finally {
      setLoading(false);
    }
  };

  // 最初に一回読み込む
  useEffect(() => {
    fetchHistory();
  }, []);

  return { history, loading, fetchHistory };
};
