import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from '../firebaseConfig';
import type { DailyMetric } from './models';

export function formatDateId(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function getDailyMetric(uid: string, dateId: string): Promise<DailyMetric | null> {
  const ref = doc(db, 'users', uid, 'daily_metrics', dateId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as any;
  if (typeof data?.weight !== 'number') return null;
  return {
    date: dateId,
    weight: data.weight,
    bodyFatPercentage: typeof data.bodyFatPercentage === 'number' ? data.bodyFatPercentage : undefined,
  };
}

export async function upsertDailyMetric(uid: string, metric: DailyMetric): Promise<void> {
  const ref = doc(db, 'users', uid, 'daily_metrics', metric.date);
  await setDoc(
    ref,
    {
      date: metric.date,
      weight: metric.weight,
      ...(typeof metric.bodyFatPercentage === 'number'
        ? { bodyFatPercentage: metric.bodyFatPercentage }
        : {}),
      updatedAt: new Date(),
    },
    { merge: true },
  );
}

