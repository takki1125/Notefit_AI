export type Phase = 'cut' | 'maintain' | 'bulk';

export interface UserProfile {
  uid: string;
  phase: Phase;
  targetWeight: number; // kg
  targetCal: number; // kcal/day
  isDetailedTrackingEnabled: boolean;
}

export interface DailyMetric {
  date: string; // YYYY-MM-DD
  weight: number; // kg
  bodyFatPercentage?: number; // %
}

/** 身長・生年月日（任意）。users/{uid} 直下に保存 */
export interface UserDemographics {
  heightCm?: number;
  /** 生年月日 YYYY-MM-DD（ローカル日付として解釈） */
  birthDate?: string;
}

/** 朝・昼・夕の食事記録リマインダー（users/{uid} に保存） */
export interface MealReminderSettings {
  enabled: boolean;
  breakfastHour: number;
  breakfastMinute: number;
  lunchHour: number;
  lunchMinute: number;
  dinnerHour: number;
  dinnerMinute: number;
}

export interface DailyAIAdvice {
  date: string; // YYYY-MM-DD
  title: string;
  bullets: string[]; // 1〜3個の行動提案
  calorieAdvice: string;
  workoutAdvice: string;
  updatedAt?: Date; // クライアント保存時の最終更新
  /** 体重・食事・トレ記録の要約が変わったら再生成するためのキー */
  contextFingerprint?: string;
}

/** ホーム「今日のアドバイス」用のコーチの振る舞い（users/{uid} に保存） */
export type AiCoachStylePreset = 'gentle' | 'balanced' | 'spartan' | 'facts';

/** 口調（users/{uid} に保存） */
export type AiTonePreset = 'polite' | 'neutral' | 'friendly' | 'casual';

export interface AiCoachSettings {
  coachStyle: AiCoachStylePreset;
  tone: AiTonePreset;
  /** 追加の希望（任意・短文） */
  customInstructions: string;
}

export const DEFAULT_AI_COACH_SETTINGS: AiCoachSettings = {
  coachStyle: 'balanced',
  tone: 'neutral',
  customInstructions: '',
};

