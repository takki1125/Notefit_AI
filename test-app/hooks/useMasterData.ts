import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebaseConfig.ts"; // 設定ファイルを読み込む

export const useMasterData = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("🔥 データ取得開始...");
        const querySnapshot = await getDocs(collection(db, "master_data"));

        const loadedData: any = {};
        querySnapshot.forEach((doc) => {
          loadedData[doc.id] = doc.data();
        });

        console.log("✅ データ取得成功");
        setData(loadedData);
      } catch (err: any) {
        console.error("❌ エラー:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
};
