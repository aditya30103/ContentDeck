import type { Bookmark, SourceType } from '../types';
import type {
  MoodMode,
  UserValues,
  WeightVector,
  ScoreContext,
  ScoreResult,
  DominantFactor,
  SessionLength,
} from '../types/scoring';

// ---------------------------------------------------------------------------
// Weight vectors per mood
// ---------------------------------------------------------------------------

export const WEIGHTS: Record<MoodMode, WeightVector> = {
  default: {
    w1_staleness: 0.25,
    w2_diversity: 0.2,
    w3_effort: 0.2,
    w4_completion: 0.15,
    w5_freshness: 0.1,
    w6_favorites: 0.05,
    w7_recency_penalty: 0.05,
  },
  'deep-dive': {
    w1_staleness: 0.2,
    w2_diversity: 0.1,
    w3_effort: 0.35,
    w4_completion: 0.2,
    w5_freshness: 0.1,
    w6_favorites: 0.05,
    w7_recency_penalty: 0.0,
  },
  'light-read': {
    w1_staleness: 0.3,
    w2_diversity: 0.15,
    w3_effort: 0.25,
    w4_completion: 0.15,
    w5_freshness: 0.05,
    w6_favorites: 0.05,
    w7_recency_penalty: 0.05,
  },
  'quick-win': {
    w1_staleness: 0.35,
    w2_diversity: 0.15,
    w3_effort: 0.15,
    w4_completion: 0.2,
    w5_freshness: 0.05,
    w6_favorites: 0.05,
    w7_recency_penalty: 0.05,
  },
  shuffle: {
    w1_staleness: 0.05,
    w2_diversity: 0.6,
    w3_effort: 0.1,
    w4_completion: 0.05,
    w5_freshness: 0.1,
    w6_favorites: 0.0,
    w7_recency_penalty: 0.1,
  },
};

// ---------------------------------------------------------------------------
// Reading time helpers
// ---------------------------------------------------------------------------

/** Parse "H:MM:SS" or "MM:SS" duration string to minutes */
function parseDurationToMinutes(duration: string): number | null {
  const parts = duration.split(':').map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) {
    const h = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    const s = parts[2] ?? 0;
    return h * 60 + m + s / 60;
  }
  if (parts.length === 2) {
    const m = parts[0] ?? 0;
    const s = parts[1] ?? 0;
    return m + s / 60;
  }
  return null;
}

/** Extract reading time in minutes from all available sources, in priority order */
export function getReadingMinutes(bookmark: Bookmark): number | null {
  // 1. Readability reading_time
  if (bookmark.content?.reading_time != null) return bookmark.content.reading_time;
  // 2. Metadata reading_time
  if (bookmark.metadata?.reading_time != null) return bookmark.metadata.reading_time;
  // 3. Duration string (video/podcast)
  if (bookmark.metadata?.duration) {
    const mins = parseDurationToMinutes(bookmark.metadata.duration);
    if (mins != null) return mins;
  }
  // 4. Word count ÷ 200 wpm
  const wc = bookmark.content?.word_count ?? bookmark.metadata?.word_count;
  if (wc != null) return wc / 200;
  // 5. No data
  return null;
}

// ---------------------------------------------------------------------------
// Source-type proxy for effort scoring when reading time is unknown
// ---------------------------------------------------------------------------

const SOURCE_PROXY_MINUTES: Record<SourceType, number> = {
  youtube: 15,
  twitter: 2,
  linkedin: 5,
  substack: 20,
  blog: 12,
  book: 60,
  arxiv: 45,
};

// ---------------------------------------------------------------------------
// Context builder
// ---------------------------------------------------------------------------

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function applyTimeOfDayAdjustments(
  weights: WeightVector,
  ctx: Omit<ScoreContext, 'weights'>,
): WeightVector {
  const w = { ...weights };
  if (ctx.timeSlot === 'morning') {
    w.w3_effort = clamp(w.w3_effort + 0.05, 0, 0.5);
    w.w1_staleness = clamp(w.w1_staleness - 0.05, 0, 0.5);
  } else if (ctx.timeSlot === 'evening') {
    w.w3_effort = clamp(w.w3_effort - 0.05, 0, 0.5);
    w.w1_staleness = clamp(w.w1_staleness + 0.05, 0, 0.5);
  }
  if (ctx.isWeekend) {
    w.w3_effort = clamp(w.w3_effort + 0.05, 0, 0.5);
    w.w7_recency_penalty = clamp(w.w7_recency_penalty - 0.05, 0, 0.5);
  }
  return w;
}

function median(nums: number[]): number {
  if (nums.length === 0) return 14; // fallback: 2-week median
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? 14);
}

export function buildScoreContext(
  bookmarks: Bookmark[],
  values: UserValues | null,
  mood: MoodMode,
  now: Date = new Date(),
): ScoreContext {
  const hourOfDay = now.getHours();
  const dayOfWeek = now.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const timeSlot: ScoreContext['timeSlot'] =
    hourOfDay >= 6 && hourOfDay < 12
      ? 'morning'
      : hourOfDay >= 18 && hourOfDay < 23
        ? 'evening'
        : 'afternoon';

  // Last 7 done items by finished_at descending
  const recentDone = bookmarks
    .filter((b) => b.status === 'done' && b.finished_at != null)
    .sort((a, b) => new Date(b.finished_at!).getTime() - new Date(a.finished_at!).getTime())
    .slice(0, 7);

  // Area frequency in recent done
  const recentAreaCounts = new Map<string, number>();
  for (const b of recentDone) {
    for (const area of b.areas) {
      recentAreaCounts.set(area.id, (recentAreaCounts.get(area.id) ?? 0) + 1);
    }
  }

  // Completion rates per source_type
  const totalByType = new Map<string, number>();
  const doneByType = new Map<string, number>();
  for (const b of bookmarks) {
    const t = b.source_type;
    totalByType.set(t, (totalByType.get(t) ?? 0) + 1);
    if (b.status === 'done') doneByType.set(t, (doneByType.get(t) ?? 0) + 1);
  }
  const completionRates = new Map<string, number>();
  for (const [type, total] of totalByType) {
    const done = doneByType.get(type) ?? 0;
    completionRates.set(type, Math.max(0.1, done / total));
  }

  // Median queue days per source_type (unread/reading only)
  const queueDaysByType = new Map<string, number[]>();
  for (const b of bookmarks) {
    if (b.status === 'done') continue;
    const daysInQueue = (now.getTime() - new Date(b.created_at).getTime()) / (1000 * 60 * 60 * 24);
    const arr = queueDaysByType.get(b.source_type) ?? [];
    arr.push(daysInQueue);
    queueDaysByType.set(b.source_type, arr);
  }
  const medianQueueDays = new Map<string, number>();
  for (const [type, days] of queueDaysByType) {
    medianQueueDays.set(type, median(days));
  }

  // Base weights + time-of-day adjustments (only for default mood)
  const baseWeights = WEIGHTS[mood];
  const partialCtx = {
    now,
    hourOfDay,
    dayOfWeek,
    isWeekend,
    timeSlot,
    recentDone,
    recentAreaCounts,
    completionRates,
    medianQueueDays,
    values,
    mood,
  };
  const weights =
    mood === 'default' ? applyTimeOfDayAdjustments(baseWeights, partialCtx) : baseWeights;

  return { ...partialCtx, weights };
}

// ---------------------------------------------------------------------------
// Target minutes for effort match
// ---------------------------------------------------------------------------

const SESSION_TARGET: Record<SessionLength, number> = { quick: 8, medium: 25, deep: 60 };
const MOOD_TARGET: Partial<Record<MoodMode, number>> = {
  'deep-dive': 60,
  'light-read': 15,
  'quick-win': 8,
  shuffle: 20,
};

function getTargetMinutes(ctx: ScoreContext): number {
  if (ctx.mood !== 'default') return MOOD_TARGET[ctx.mood] ?? 20;
  const base = ctx.values ? SESSION_TARGET[ctx.values.sessionLength] : 25;
  // Time modifiers (default mood only)
  if (ctx.timeSlot === 'evening') return base * 0.7;
  if (ctx.timeSlot === 'morning') return base * 1.2;
  if (ctx.isWeekend) return base * 1.4;
  return base;
}

function getSigma(ctx: ScoreContext): number {
  if (ctx.mood === 'deep-dive') return 30;
  if (ctx.values?.sessionLength === 'deep') return 30;
  return 15;
}

// ---------------------------------------------------------------------------
// Score component functions
// ---------------------------------------------------------------------------

function scoreStaleness(bookmark: Bookmark, ctx: ScoreContext): number {
  const daysInQueue =
    (ctx.now.getTime() - new Date(bookmark.created_at).getTime()) / (1000 * 60 * 60 * 24);
  const med = ctx.medianQueueDays.get(bookmark.source_type) ?? 14;
  return Math.min(1, daysInQueue / (2 * med));
}

function scoreDiversity(bookmark: Bookmark, ctx: ScoreContext): number {
  const areaIds = bookmark.areas.map((a) => a.id);

  // Suppression
  if (
    ctx.values &&
    areaIds.length > 0 &&
    areaIds.every((id) => ctx.values!.suppressedAreaIds.includes(id))
  ) {
    return 0.05;
  }

  const maxCount =
    areaIds.length > 0 ? Math.max(...areaIds.map((id) => ctx.recentAreaCounts.get(id) ?? 0)) : 0;

  let score = Math.max(0, 1 - maxCount / 3);

  // Priority area boost
  if (ctx.values && areaIds.some((id) => ctx.values!.priorityAreaIds.includes(id))) {
    score = Math.min(1, score + 0.2);
  }

  return score;
}

function scoreEffort(bookmark: Bookmark, ctx: ScoreContext): number {
  const minutes = getReadingMinutes(bookmark) ?? SOURCE_PROXY_MINUTES[bookmark.source_type];
  const target = getTargetMinutes(ctx);
  const sigma = getSigma(ctx);
  return Math.exp(-((minutes - target) ** 2) / (2 * sigma ** 2));
}

function scoreCompletion(bookmark: Bookmark, ctx: ScoreContext): number {
  return ctx.completionRates.get(bookmark.source_type) ?? 0.5;
}

function scoreFreshness(bookmark: Bookmark, ctx: ScoreContext): number {
  const areaIds = bookmark.areas.map((a) => a.id);
  if (areaIds.length === 0) return 0.3;
  const sameAreaCount = areaIds.reduce((sum, id) => sum + (ctx.recentAreaCounts.get(id) ?? 0), 0);
  if (sameAreaCount === 0) return 0.0;
  if (sameAreaCount === 1) return 0.5;
  if (sameAreaCount === 2) return 0.8;
  return 1.0;
}

function scoreFavorites(bookmark: Bookmark): number {
  return bookmark.is_favorited ? 1.0 : 0.0;
}

function scoreRecencyPenalty(bookmark: Bookmark, ctx: ScoreContext): number {
  if (!bookmark.started_reading_at) return 0;
  const hoursAgo =
    (ctx.now.getTime() - new Date(bookmark.started_reading_at).getTime()) / (1000 * 60 * 60);
  if (hoursAgo > 48) return 0;
  return Math.max(0, 1 - hoursAgo / 48);
}

// ---------------------------------------------------------------------------
// Reason strings
// ---------------------------------------------------------------------------

function daysAgo(isoDate: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24));
}

function mostRecentArea(ctx: ScoreContext): string {
  let maxCount = 0;
  let maxId = '';
  for (const [id, count] of ctx.recentAreaCounts) {
    if (count > maxCount) {
      maxCount = count;
      maxId = id;
    }
  }
  // Find the area name from any done bookmark
  for (const b of ctx.recentDone) {
    const area = b.areas.find((a) => a.id === maxId);
    if (area) return area.name;
  }
  return 'this topic';
}

const REASONS: Record<DominantFactor, (b: Bookmark, ctx: ScoreContext) => string> = {
  staleness: (b, ctx) =>
    `This has been waiting ${String(daysAgo(b.created_at, ctx.now))} days — longer than most in your queue.`,
  diversity: (_b, ctx) =>
    `You've been reading a lot of ${mostRecentArea(ctx)}. Here's something different.`,
  effort: (b) => {
    const m = getReadingMinutes(b);
    return m != null
      ? `${String(Math.round(m))}-min read — fits your session.`
      : `Matches your current session style.`;
  },
  completion: (b) => `You almost always finish ${b.source_type} content.`,
  freshness: (b) =>
    `You've been on a roll with ${b.areas[0]?.name ?? 'this topic'} — keep the momentum.`,
  favorites: () => `You marked this as a favourite.`,
};

// ---------------------------------------------------------------------------
// Main scoring function
// ---------------------------------------------------------------------------

function findDominantFactor(
  components: ScoreResult['components'],
  weights: WeightVector,
): DominantFactor {
  const factors: Array<[DominantFactor, number]> = [
    ['staleness', components.staleness * weights.w1_staleness],
    ['diversity', components.diversity * weights.w2_diversity],
    ['effort', components.effort * weights.w3_effort],
    ['completion', components.completion * weights.w4_completion],
    ['freshness', components.freshness * weights.w5_freshness],
    ['favorites', components.favorites * weights.w6_favorites],
  ];
  return factors.reduce((best, curr) => (curr[1] > best[1] ? curr : best))[0];
}

export function scoreBookmark(bookmark: Bookmark, ctx: ScoreContext): ScoreResult {
  const staleness = scoreStaleness(bookmark, ctx);
  const diversity = scoreDiversity(bookmark, ctx);
  const effort = scoreEffort(bookmark, ctx);
  const completion = scoreCompletion(bookmark, ctx);
  const freshness = scoreFreshness(bookmark, ctx);
  const favorites = scoreFavorites(bookmark);
  const recencyPenalty = scoreRecencyPenalty(bookmark, ctx);

  const {
    w1_staleness,
    w2_diversity,
    w3_effort,
    w4_completion,
    w5_freshness,
    w6_favorites,
    w7_recency_penalty,
  } = ctx.weights;

  const totalScore =
    staleness * w1_staleness +
    diversity * w2_diversity +
    effort * w3_effort +
    completion * w4_completion +
    freshness * w5_freshness +
    favorites * w6_favorites -
    recencyPenalty * w7_recency_penalty;

  const components = {
    staleness,
    diversity,
    effort,
    completion,
    freshness,
    favorites,
    recencyPenalty,
  };
  const dominantFactor = findDominantFactor(components, ctx.weights);
  const reason = REASONS[dominantFactor](bookmark, ctx);

  return { bookmark, totalScore, components, dominantFactor, reason };
}

// ---------------------------------------------------------------------------
// Ranking
// ---------------------------------------------------------------------------

interface RankOptions {
  statusFilter?: string[];
  hardMaxMinutes?: number;
}

export function rankBookmarks(
  bookmarks: Bookmark[],
  ctx: ScoreContext,
  opts: RankOptions = {},
): ScoreResult[] {
  const { statusFilter = ['unread'], hardMaxMinutes } = opts;

  let candidates = bookmarks.filter((b) => statusFilter.includes(b.status));

  if (hardMaxMinutes != null) {
    candidates = candidates.filter((b) => {
      const mins = getReadingMinutes(b);
      // Treat unknowns charitably — pass the filter
      return mins == null || mins <= hardMaxMinutes;
    });
  }

  return candidates.map((b) => scoreBookmark(b, ctx)).sort((a, b) => b.totalScore - a.totalScore);
}
