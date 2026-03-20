import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from '../firebaseConfig';
import type { DailyAIAdvice } from './models';

export async function getDailyAIAdvice(uid: string, dateId: string): Promise<DailyAIAdvice | null> {
  const ref = doc(db, 'users', uid, 'daily_advice', dateId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = snap.data() as any;
  if (typeof data?.title !== 'string') return null;
  if (!Array.isArray(data?.bullets) || !data.bullets.every((b: any) => typeof b === 'string')) return null;
  if (typeof data?.calorieAdvice !== 'string') return null;
  if (typeof data?.workoutAdvice !== 'string') return null;

  let updatedAt: Date | undefined = undefined;
  if (data?.updatedAt) {
    // Firestore Timestamp -> Date
    if (typeof data.updatedAt.toDate === 'function') updatedAt = data.updatedAt.toDate();
    else if (data.updatedAt instanceof Date) updatedAt = data.updatedAt;
  }

  return {
    date: typeof data?.date === 'string' ? data.date : dateId,
    title: data.title,
    bullets: data.bullets,
    calorieAdvice: data.calorieAdvice,
    workoutAdvice: data.workoutAdvice,
    updatedAt,
    contextFingerprint: typeof data?.contextFingerprint === 'string' ? data.contextFingerprint : undefined,
  };
}

export async function setDailyAIAdvice(
  uid: string,
  dateId: string,
  advice: Omit<DailyAIAdvice, 'date' | 'updatedAt'>,
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid, 'daily_advice', dateId),
    {
      date: dateId,
      title: advice.title,
      bullets: advice.bullets,
      calorieAdvice: advice.calorieAdvice,
      workoutAdvice: advice.workoutAdvice,
      ...(typeof advice.contextFingerprint === 'string'
        ? { contextFingerprint: advice.contextFingerprint }
        : {}),
      updatedAt: new Date(),
    },
    { merge: true },
  );
}

