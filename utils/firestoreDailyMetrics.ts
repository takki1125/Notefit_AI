import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';

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

export async function getDailyMetricsLastNDays(uid: string, n: number): Promise<DailyMetric[]> {
  if (!Number.isFinite(n) || n <= 0) return [];

  const q = query(
    collection(db, 'users', uid, 'daily_metrics'),
    orderBy('date', 'desc'),
    limit(n),
  );

  const snap = await getDocs(q);
  const metrics: DailyMetric[] = [];

  snap.docs.forEach((d) => {
    const data = d.data() as any;
    const date = typeof data?.date === 'string' ? data.date : d.id;
    const weight = typeof data?.weight === 'number' ? data.weight : NaN;
    if (!Number.isFinite(weight)) return;

    const bodyFatPercentage =
      typeof data?.bodyFatPercentage === 'number' ? data.bodyFatPercentage : undefined;

    metrics.push({ date, weight, bodyFatPercentage });
  });

  // Firestore query is descending; chart/progress calculations usually assume ascending.
  return metrics.sort((a, b) => a.date.localeCompare(b.date));
}

/** 直近の体重記録（日付降順で1件）。無ければ null */
export async function getLatestWeightKg(uid: string): Promise<number | null> {
  const q = query(
    collection(db, 'users', uid, 'daily_metrics'),
    orderBy('date', 'desc'),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const data = snap.docs[0].data() as { weight?: unknown };
  return typeof data?.weight === 'number' && Number.isFinite(data.weight) ? data.weight : null;
}

