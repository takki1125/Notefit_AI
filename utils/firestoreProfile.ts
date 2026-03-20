import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from '../firebaseConfig';
import type { MealReminderSettings, Phase, UserDemographics, UserProfile } from './models';

type UserDocShape = Partial<{
  username: string;
  phase: Phase;
  targetWeight: number;
  targetCal: number;
  isDetailedTrackingEnabled: boolean;
  heightCm: number;
  birthDate: string;
  mealRemindersEnabled: boolean;
  mealReminderBreakfastHour: number;
  mealReminderBreakfastMinute: number;
  mealReminderLunchHour: number;
  mealReminderLunchMinute: number;
  mealReminderDinnerHour: number;
  mealReminderDinnerMinute: number;
}>;

export const DEFAULT_MEAL_REMINDER_SETTINGS: MealReminderSettings = {
  enabled: false,
  breakfastHour: 7,
  breakfastMinute: 0,
  lunchHour: 12,
  lunchMinute: 0,
  dinnerHour: 19,
  dinnerMinute: 0,
};

function clampMinute(n: unknown, fallback: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  const m = Math.floor(n);
  if (m < 0) return 0;
  if (m > 59) return 59;
  return m;
}

function clampHour(n: unknown, fallback: number): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  const h = Math.floor(n);
  if (h < 0) return 0;
  if (h > 23) return 23;
  return h;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data() as UserDocShape;
  if (!data.phase || typeof data.targetWeight !== 'number' || typeof data.targetCal !== 'number') {
    return null;
  }
  return {
    uid,
    phase: data.phase,
    targetWeight: data.targetWeight,
    targetCal: data.targetCal,
    isDetailedTrackingEnabled: !!data.isDetailedTrackingEnabled,
  };
}

export async function setUserProfile(
  uid: string,
  profile: Omit<UserProfile, 'uid'>,
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    {
      phase: profile.phase,
      targetWeight: profile.targetWeight,
      targetCal: profile.targetCal,
      isDetailedTrackingEnabled: profile.isDetailedTrackingEnabled,
      updatedAt: new Date(),
    },
    { merge: true },
  );
}

/** プロフィール用: 身長・生年月日（必要なら username 等と同じ doc を読む） */
export async function getUserDemographics(uid: string): Promise<UserDemographics> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return {};
  const data = snap.data() as UserDocShape;
  const heightCm = typeof data.heightCm === 'number' && data.heightCm > 0 ? data.heightCm : undefined;
  const birthDate =
    typeof data.birthDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.birthDate)
      ? data.birthDate
      : undefined;
  return { heightCm, birthDate };
}

export async function setDetailedTrackingEnabled(
  uid: string,
  enabled: boolean,
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    {
      isDetailedTrackingEnabled: enabled,
      updatedAt: new Date(),
    },
    { merge: true },
  );
}

export async function getMealReminderSettings(uid: string): Promise<MealReminderSettings> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return { ...DEFAULT_MEAL_REMINDER_SETTINGS };
  const data = snap.data() as UserDocShape;
  const d = DEFAULT_MEAL_REMINDER_SETTINGS;
  return {
    enabled: data.mealRemindersEnabled === true,
    breakfastHour: clampHour(data.mealReminderBreakfastHour, d.breakfastHour),
    breakfastMinute: clampMinute(data.mealReminderBreakfastMinute, d.breakfastMinute),
    lunchHour: clampHour(data.mealReminderLunchHour, d.lunchHour),
    lunchMinute: clampMinute(data.mealReminderLunchMinute, d.lunchMinute),
    dinnerHour: clampHour(data.mealReminderDinnerHour, d.dinnerHour),
    dinnerMinute: clampMinute(data.mealReminderDinnerMinute, d.dinnerMinute),
  };
}

export async function setMealReminderSettings(
  uid: string,
  settings: MealReminderSettings,
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    {
      mealRemindersEnabled: settings.enabled,
      mealReminderBreakfastHour: settings.breakfastHour,
      mealReminderBreakfastMinute: settings.breakfastMinute,
      mealReminderLunchHour: settings.lunchHour,
      mealReminderLunchMinute: settings.lunchMinute,
      mealReminderDinnerHour: settings.dinnerHour,
      mealReminderDinnerMinute: settings.dinnerMinute,
      updatedAt: new Date(),
    },
    { merge: true },
  );
}

