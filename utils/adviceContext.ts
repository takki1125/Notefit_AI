import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore';

import { db } from '../firebaseConfig';
import { formatDateId } from './firestoreDailyMetrics';

/** 当日の food_logs ドキュメントID（food.tsx と同じ規則） */
export function foodLogDocId(dateId: string): string {
  return `${dateId}_Food`;
}

export type AdviceNutritionPayload = {
  hasData: boolean;
  totalCal: number;
  totalPro: number;
  totalFat: number;
  totalCarb: number;
  mealNames: string[];
};

export type AdviceWorkoutPayload = {
  dateId: string;
  routineName: string;
  durationMinutes: number | null;
  isToday: boolean;
  exerciseLines: string[];
};

export async function fetchAdviceNutrition(uid: string, dateId: string): Promise<AdviceNutritionPayload> {
  const ref = doc(db, 'users', uid, 'food_logs', foodLogDocId(dateId));
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return { hasData: false, totalCal: 0, totalPro: 0, totalFat: 0, totalCarb: 0, mealNames: [] };
  }
  const d = snap.data() as any;
  const meals = Array.isArray(d.meals) ? d.meals : [];
  const mealNames = meals
    .map((m: any) => (typeof m?.name === 'string' ? m.name.trim() : ''))
    .filter(Boolean)
    .slice(0, 12);

  return {
    hasData: true,
    totalCal: typeof d.totalCal === 'number' ? d.totalCal : 0,
    totalPro: typeof d.totalPro === 'number' ? d.totalPro : 0,
    totalFat: typeof d.totalFat === 'number' ? d.totalFat : 0,
    totalCarb: typeof d.totalCarb === 'number' ? d.totalCarb : 0,
    mealNames,
  };
}

function workoutDateId(data: any): string {
  if (data?.dateObj && typeof data.dateObj === 'string') {
    return data.dateObj.slice(0, 10);
  }
  if (data?.date?.toDate && typeof data.date.toDate === 'function') {
    try {
      return formatDateId(data.date.toDate());
    } catch {
      return '';
    }
  }
  return '';
}

function summarizeExercises(exercises: any[], maxEx = 6, maxSetsPerEx = 3): string[] {
  if (!Array.isArray(exercises)) return [];
  const lines: string[] = [];
  for (const ex of exercises.slice(0, maxEx)) {
    const name = typeof ex?.name === 'string' ? ex.name : '種目';
    const sets = Array.isArray(ex?.sets) ? ex.sets.filter((s: any) => s?.done) : [];
    const parts = sets
      .slice(0, maxSetsPerEx)
      .map((s: any) => `${s.weight}kg×${s.reps}`)
      .join(', ');
    if (parts) lines.push(`${name}: ${parts}`);
  }
  return lines;
}

/** 直近のワークアウトを最大 maxSessions 件要約（同日複数セッションあり得る） */
export async function fetchAdviceWorkouts(
  uid: string,
  todayId: string,
  maxSessions = 5,
): Promise<{ sessions: AdviceWorkoutPayload[]; workoutDocIds: string[] }> {
  const q = query(collection(db, 'users', uid, 'workouts'), orderBy('date', 'desc'), limit(12));
  const snap = await getDocs(q);
  const sessions: AdviceWorkoutPayload[] = [];
  const workoutDocIds: string[] = [];

  for (const docSnap of snap.docs) {
    workoutDocIds.push(docSnap.id);
    const data = docSnap.data() as any;
    const dateId = workoutDateId(data);
    const routineName = typeof data.routineName === 'string' ? data.routineName : 'ワークアウト';
    const durSec = typeof data.durationSeconds === 'number' ? data.durationSeconds : null;
    const durationMinutes = durSec != null ? Math.round(durSec / 60) : null;
    const exerciseLines = summarizeExercises(data.exercises);

    sessions.push({
      dateId: dateId || '不明',
      routineName,
      durationMinutes,
      isToday: dateId === todayId,
      exerciseLines,
    });
    if (sessions.length >= maxSessions) break;
  }

  return { sessions, workoutDocIds };
}

/** 食事の合計・件数とワークアウトdoc一覧でキャッシュの当たり判定 */
export function buildAdviceContextFingerprint(
  dateId: string,
  nutrition: AdviceNutritionPayload,
  workoutDocIds: string[],
  demographics?: { heightCm?: number; birthDate?: string },
  /** AIコーチ設定（口調・スタイル・自由記述）が変わったら再生成する */
  aiSettingsFingerprint?: string,
): string {
  const demo =
    demographics &&
    (typeof demographics.heightCm === 'number' || typeof demographics.birthDate === 'string')
      ? `h:${demographics.heightCm ?? 'x'}|b:${demographics.birthDate ?? 'x'}`
      : 'demo:x';
  return [
    'v5',
    dateId,
    demo,
    `cal:${nutrition.totalCal}`,
    `p:${nutrition.totalPro}`,
    `f:${nutrition.totalFat}`,
    `c:${nutrition.totalCarb}`,
    `mn:${nutrition.mealNames.length}`,
    `w:${workoutDocIds.join(',')}`,
    aiSettingsFingerprint ? `ai:${aiSettingsFingerprint}` : 'ai:default',
  ].join('|');
}
