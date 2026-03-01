import type { Bookmark } from './index';

export type SessionLength = 'quick' | 'medium' | 'deep';
export type MoodMode = 'default' | 'deep-dive' | 'light-read' | 'quick-win' | 'shuffle';

export interface UserValues {
  priorityAreaIds: string[];
  sessionLength: SessionLength;
  suppressedAreaIds: string[];
  completedAt: string;
  version: 1;
}

export interface WeightVector {
  w1_staleness: number;
  w2_diversity: number;
  w3_effort: number;
  w4_completion: number;
  w5_freshness: number;
  w6_favorites: number;
  w7_recency_penalty: number;
}

export interface ScoreContext {
  now: Date;
  hourOfDay: number;
  dayOfWeek: number;
  isWeekend: boolean;
  timeSlot: 'morning' | 'afternoon' | 'evening';
  recentDone: Bookmark[];
  recentAreaCounts: Map<string, number>;
  completionRates: Map<string, number>;
  medianQueueDays: Map<string, number>;
  values: UserValues | null;
  mood: MoodMode;
  weights: WeightVector;
}

export type DominantFactor =
  | 'staleness'
  | 'diversity'
  | 'effort'
  | 'completion'
  | 'freshness'
  | 'favorites';

export interface ScoreResult {
  bookmark: Bookmark;
  totalScore: number;
  components: {
    staleness: number;
    diversity: number;
    effort: number;
    completion: number;
    freshness: number;
    favorites: number;
    recencyPenalty: number;
  };
  dominantFactor: DominantFactor;
  reason: string;
}
