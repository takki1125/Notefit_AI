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

