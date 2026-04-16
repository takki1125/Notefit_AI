import { doc, getDoc, setDoc } from 'firebase/firestore';

import { db } from '../firebaseConfig';
import type {
  ActivityLevel,
  AiCoachSettings,
  CalorieEstimateSex,
  MealReminderSettings,
  Phase,
  TrainingLevel,
  UserDemographics,
  UserProfile,
} from './models';
import { DEFAULT_AI_COACH_SETTINGS } from './models';
import { normalizeAiCoachSettings } from './aiCoachSettings';

type UserDocShape = Partial<{
  username: string;
  phase: Phase;
  targetWeight: number;
  targetCal: number;
  isDetailedTrackingEnabled: boolean;
  heightCm: number;
  birthDate: string;
  trainingLevel: TrainingLevel;
  goesToGym: boolean;
  mealRemindersEnabled: boolean;
  mealReminderBreakfastHour: number;
  mealReminderBreakfastMinute: number;
  mealReminderLunchHour: number;
  mealReminderLunchMinute: number;
  mealReminderDinnerHour: number;
  mealReminderDinnerMinute: number;
  aiCoachStyle?: string;
  aiTonePreset?: string;
  aiCustomInstructions?: string;
  calorieEstimateSex?: string;
  activityLevel?: string;
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

const TRAINING_LEVELS: TrainingLevel[] = ['first_time', 'beginner', 'intermediate', 'advanced'];

function parseTrainingLevel(raw: unknown): TrainingLevel | undefined {
  if (typeof raw !== 'string') return undefined;
  return TRAINING_LEVELS.includes(raw as TrainingLevel) ? (raw as TrainingLevel) : undefined;
}

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
  const trainingLevel = parseTrainingLevel(data.trainingLevel);
  const goesToGym = typeof data.goesToGym === 'boolean' ? data.goesToGym : undefined;
  return { heightCm, birthDate, trainingLevel, goesToGym };
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

export async function getAiCoachSettings(uid: string): Promise<AiCoachSettings> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return { ...DEFAULT_AI_COACH_SETTINGS };
  const data = snap.data() as UserDocShape;
  return normalizeAiCoachSettings({
    coachStyle: data.aiCoachStyle,
    tone: data.aiTonePreset,
    customInstructions: data.aiCustomInstructions,
  });
}

export async function setAiCoachSettings(uid: string, settings: AiCoachSettings): Promise<void> {
  const normalized = normalizeAiCoachSettings(settings);
  await setDoc(
    doc(db, 'users', uid),
    {
      aiCoachStyle: normalized.coachStyle,
      aiTonePreset: normalized.tone,
      aiCustomInstructions: normalized.customInstructions,
      updatedAt: new Date(),
    },
    { merge: true },
  );
}

const ACTIVITY_LEVELS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active'];

function parseActivityLevel(raw: unknown): ActivityLevel | undefined {
  if (typeof raw !== 'string') return undefined;
  return ACTIVITY_LEVELS.includes(raw as ActivityLevel) ? (raw as ActivityLevel) : undefined;
}

function parseCalorieEstimateSex(raw: unknown): CalorieEstimateSex | undefined {
  if (raw === 'male' || raw === 'female') return raw;
  return undefined;
}

export async function getCalorieEstimatePrefs(uid: string): Promise<{
  sex?: CalorieEstimateSex;
  activityLevel?: ActivityLevel;
}> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return {};
  const data = snap.data() as UserDocShape;
  return {
    sex: parseCalorieEstimateSex(data.calorieEstimateSex),
    activityLevel: parseActivityLevel(data.activityLevel),
  };
}

export async function setCalorieEstimatePrefs(
  uid: string,
  prefs: { sex: CalorieEstimateSex; activityLevel: ActivityLevel },
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    {
      calorieEstimateSex: prefs.sex,
      activityLevel: prefs.activityLevel,
      updatedAt: new Date(),
    },
    { merge: true },
  );
}

/** 目標カロリー自動計算フローで入力された身長・生年月日をプロフィールに反映 */
export async function mergeUserDemographicsFields(
  uid: string,
  fields: { heightCm?: number; birthDate?: string },
): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof fields.heightCm === 'number' && Number.isFinite(fields.heightCm) && fields.heightCm >= 80 && fields.heightCm <= 250) {
    payload.heightCm = fields.heightCm;
  }
  if (
    typeof fields.birthDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(fields.birthDate.trim())
  ) {
    payload.birthDate = fields.birthDate.trim();
  }
  if (Object.keys(payload).length <= 1) return;
  await setDoc(doc(db, 'users', uid), payload, { merge: true });
}

/** 新規登録直後に最低限入力してほしいプロフィール（現状はユーザーネーム） */
export async function hasCompletedBasicProfile(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return false;
  const data = snap.data() as UserDocShape;
  return typeof data.username === 'string' && data.username.trim().length > 0;
}

