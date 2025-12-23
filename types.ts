
export type HabitType = 'good' | 'bad';
export type HabitStatus = 'done' | 'missed' | 'passed' | 'failed';

export interface Habit {
  id: string;
  name: string;
  weight: number; // Magnitude 1-5
  type: HabitType;
  status: HabitStatus;
}

export interface AnalysisResult {
  verdict_header: string;
  daily_momentum: number;
  slope_gradient: 'climbing' | 'flat' | 'declining';
  risk_assessment: 'low' | 'moderate' | 'high';
  projection_30_days: string;
  ai_summary: string;
}

export interface HistoryPoint {
  date: string;
  momentum: number;
}
