import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import { db } from "../firebaseConfig";

export const useSaveWorkout = () => {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 保存を実行する関数
  const saveWorkout = async (
    exerciseName: string,
    weight: number,
    reps: number,
  ) => {
    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      // "workouts" というコレクションに保存する
      await addDoc(collection(db, "workouts"), {
        uid: user.uid, // ← ログインしている人のIDを使う！ 
        exercise: exerciseName,
        weight: Number(weight),
        reps: Number(reps),
        date: serverTimestamp(), // サーバーの時間を使う
      });

      console.log("✅ 保存成功！");
      setSuccess(true);
    } catch (err: any) {
      console.error("❌ 保存失敗:", err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return { saveWorkout, saving, success, error };
};
