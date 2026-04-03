import type { ActivityLevel, Phase } from './models';

/** PAL（Physical Activity Level）で TDEE に近づける一般的な係数 */
const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** フェーズに応じた摂取カロリーの係数（TDEE 比） */
const PHASE_FACTORS: Record<Phase, number> = {
  cut: 0.82,
  maintain: 1,
  bulk: 1.12,
};

function mifflinStJeorBmr(weightKg: number, heightCm: number, ageYears: number, sex: 'male' | 'female'): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex === 'male' ? base + 5 : base - 161;
}

function roundToStep(n: number, step: number): number {
  return Math.round(n / step) * step;
}

export interface EstimateCaloriesInput {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  sex: 'male' | 'female';
  activity: ActivityLevel;
  phase: Phase;
}

/**
 * 1日の目標摂取カロリー（kcal）の目安。Mifflin–St Jeor の BMR × 活動係数 × フェーズ係数。
 * 個人差が大きいため「目安」として端数は 50kcal 単位に丸める。
 */
export function estimateDailyCalories(input: EstimateCaloriesInput): number {
  const bmr = mifflinStJeorBmr(input.weightKg, input.heightCm, input.ageYears, input.sex);
  const tdee = bmr * ACTIVITY_FACTORS[input.activity];
  const raw = tdee * PHASE_FACTORS[input.phase];
  const rounded = roundToStep(raw, 50);
  return Math.max(1000, Math.min(5000, rounded));
}

export function activityLevelLabel(level: ActivityLevel): string {
  switch (level) {
    case 'sedentary':
      return '低い（座り仕事が多い）';
    case 'light':
      return '軽い（週に軽い運動1〜2回）';
    case 'moderate':
      return '普通（週に中程度の運動3〜5回）';
    case 'active':
      return '高い（週にかなり運動6〜7回）';
    case 'very_active':
      return 'とても高い（肉体労働・激しいトレ多数）';
    default:
      return level;
  }
}
