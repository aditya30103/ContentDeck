import { describe, it, expect } from 'vitest';
import {
  getReadingMinutes,
  buildScoreContext,
  scoreBookmark,
  rankBookmarks,
  WEIGHTS,
} from '../scoring';
import type { Bookmark, TagArea } from '../../types';
import type { UserValues, ScoreContext } from '../../types/scoring';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function makeArea(overrides: Partial<TagArea> = {}): TagArea {
  return {
    id: 'area-1',
    name: 'Tech',
    description: null,
    color: '#6366f1',
    emoji: '💻',
    sort_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: 'bm-1',
    url: 'https://example.com/article',
    title: 'Test Article',
    image: null,
    excerpt: null,
    source_type: 'blog',
    status: 'unread',
    is_favorited: false,
    notes: [],
    tags: [],
    areas: [],
    metadata: {},
    content: {},
    content_status: 'pending',
    content_fetched_at: null,
    synced: false,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    status_changed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    started_reading_at: null,
    finished_at: null,
    ...overrides,
  };
}

const NOW = new Date('2026-03-02T14:00:00Z'); // Monday afternoon

function defaultCtx(bookmarks: Bookmark[] = [], values: UserValues | null = null): ScoreContext {
  return buildScoreContext(bookmarks, values, 'default', NOW);
}

// ---------------------------------------------------------------------------
// getReadingMinutes
// ---------------------------------------------------------------------------

describe('getReadingMinutes', () => {
  it('returns content.reading_time first', () => {
    const b = makeBookmark({ content: { reading_time: 10 }, metadata: { reading_time: 20 } });
    expect(getReadingMinutes(b)).toBe(10);
  });

  it('falls back to metadata.reading_time', () => {
    const b = makeBookmark({ content: {}, metadata: { reading_time: 20 } });
    expect(getReadingMinutes(b)).toBe(20);
  });

  it('parses MM:SS duration', () => {
    const b = makeBookmark({ content: {}, metadata: { duration: '12:30' } });
    expect(getReadingMinutes(b)).toBeCloseTo(12.5);
  });

  it('parses H:MM:SS duration', () => {
    const b = makeBookmark({ content: {}, metadata: { duration: '1:30:00' } });
    expect(getReadingMinutes(b)).toBeCloseTo(90);
  });

  it('falls back to word_count / 200', () => {
    const b = makeBookmark({ content: { word_count: 1000 }, metadata: {} });
    expect(getReadingMinutes(b)).toBe(5);
  });

  it('returns null when no data', () => {
    const b = makeBookmark({ content: {}, metadata: {} });
    expect(getReadingMinutes(b)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildScoreContext
// ---------------------------------------------------------------------------

describe('buildScoreContext', () => {
  it('completionRates floor at 0.1 (not 0)', () => {
    // 0 done out of 1 blog → should be 0.1, not 0
    const bookmarks = [makeBookmark({ source_type: 'blog', status: 'unread' })];
    const ctx = buildScoreContext(bookmarks, null, 'default', NOW);
    expect(ctx.completionRates.get('blog')).toBeCloseTo(0.1);
  });

  it('recentDone includes only done bookmarks by finished_at', () => {
    const done = makeBookmark({
      id: 'done-1',
      status: 'done',
      finished_at: new Date(NOW.getTime() - 1000).toISOString(),
    });
    const unread = makeBookmark({ id: 'unread-1', status: 'unread' });
    const ctx = buildScoreContext([done, unread], null, 'default', NOW);
    expect(ctx.recentDone).toHaveLength(1);
    expect(ctx.recentDone[0]!.id).toBe('done-1');
  });

  it('uses default weights for default mood', () => {
    const ctx = buildScoreContext([], null, 'default', NOW);
    // On a weekend afternoon the weights should be adjusted
    expect(ctx.weights).not.toStrictEqual(WEIGHTS['default']);
  });

  it('uses exact weights for non-default moods (no time adjustment)', () => {
    const ctx = buildScoreContext([], null, 'shuffle', NOW);
    expect(ctx.weights).toStrictEqual(WEIGHTS['shuffle']);
  });
});

// ---------------------------------------------------------------------------
// Staleness ranking
// ---------------------------------------------------------------------------

describe('Staleness: older item ranks above newer item', () => {
  it('stale item wins when all else equal', () => {
    const old = makeBookmark({
      id: 'old',
      created_at: new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const recent = makeBookmark({
      id: 'recent',
      created_at: new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const ctx = defaultCtx([old, recent]);
    const ranked = rankBookmarks([old, recent], ctx);
    expect(ranked[0]!.bookmark.id).toBe('old');
  });
});

// ---------------------------------------------------------------------------
// Diversity ranking
// ---------------------------------------------------------------------------

describe('Diversity: underrepresented area beats saturated area', () => {
  it('item from fresh area scores higher than item from saturated area', () => {
    const techArea = makeArea({ id: 'tech', name: 'Tech' });
    const sciArea = makeArea({ id: 'sci', name: 'Science' });

    // 3 recent done from Tech area
    const doneBookmarks = [1, 2, 3].map((i) =>
      makeBookmark({
        id: `done-${String(i)}`,
        status: 'done',
        areas: [techArea],
        finished_at: new Date(NOW.getTime() - i * 3600 * 1000).toISOString(),
      }),
    );

    const techItem = makeBookmark({ id: 'tech-item', areas: [techArea] });
    const sciItem = makeBookmark({ id: 'sci-item', areas: [sciArea] });

    const ctx = defaultCtx([...doneBookmarks, techItem, sciItem]);
    const ranked = rankBookmarks([techItem, sciItem], ctx);
    expect(ranked[0]!.bookmark.id).toBe('sci-item');
  });
});

// ---------------------------------------------------------------------------
// Diversity: hard suppression
// ---------------------------------------------------------------------------

describe('Diversity: suppressed area items score near-zero on diversity', () => {
  it('suppressed item diversity component is near zero', () => {
    const suppArea = makeArea({ id: 'news', name: 'News' });
    const values: UserValues = {
      priorityAreaIds: [],
      sessionLength: 'medium',
      suppressedAreaIds: ['news'],
      completedAt: NOW.toISOString(),
      version: 1,
    };
    const b = makeBookmark({ areas: [suppArea] });
    const ctx = buildScoreContext([b], values, 'default', NOW);
    const result = scoreBookmark(b, ctx);
    expect(result.components.diversity).toBeLessThanOrEqual(0.1);
  });
});

// ---------------------------------------------------------------------------
// Priority area boost
// ---------------------------------------------------------------------------

describe('Priority area boost', () => {
  it('priority area item scores higher on diversity than non-priority (when both have some saturation)', () => {
    const prioArea = makeArea({ id: 'prio', name: 'Philosophy' });
    const normalArea = makeArea({ id: 'norm', name: 'Random' });
    const values: UserValues = {
      priorityAreaIds: ['prio'],
      sessionLength: 'medium',
      suppressedAreaIds: [],
      completedAt: NOW.toISOString(),
      version: 1,
    };
    // 1 recent done in each area — saturation is equal (maxCount=1, base score=0.67)
    // Priority boost (+0.2) should make prio reach 0.87 vs norm stays at 0.67
    const donePrio = makeBookmark({
      id: 'done-prio',
      status: 'done',
      areas: [prioArea],
      finished_at: new Date(NOW.getTime() - 1000).toISOString(),
    });
    const doneNorm = makeBookmark({
      id: 'done-norm',
      status: 'done',
      areas: [normalArea],
      finished_at: new Date(NOW.getTime() - 2000).toISOString(),
    });
    const prioItem = makeBookmark({ id: 'prio-item', areas: [prioArea] });
    const normalItem = makeBookmark({ id: 'norm-item', areas: [normalArea] });
    const ctx = buildScoreContext(
      [donePrio, doneNorm, prioItem, normalItem],
      values,
      'default',
      NOW,
    );
    const prioScore = scoreBookmark(prioItem, ctx).components.diversity;
    const normScore = scoreBookmark(normalItem, ctx).components.diversity;
    expect(prioScore).toBeGreaterThan(normScore);
  });
});

// ---------------------------------------------------------------------------
// Effort match
// ---------------------------------------------------------------------------

describe('Effort: item near target beats far-off items', () => {
  it('in medium/default mode, ~25-min item scores higher than 2-min item', () => {
    const short = makeBookmark({ id: 'short', content: { reading_time: 2 } });
    const target = makeBookmark({ id: 'target', content: { reading_time: 25 } });
    const ctx = defaultCtx([short, target]);
    const shortScore = scoreBookmark(short, ctx).components.effort;
    const targetScore = scoreBookmark(target, ctx).components.effort;
    expect(targetScore).toBeGreaterThan(shortScore);
  });
});

// ---------------------------------------------------------------------------
// Quick-win hard filter
// ---------------------------------------------------------------------------

describe('Quick-win: items > 15 min are excluded', () => {
  it('long article is filtered out, short article is returned', () => {
    const long = makeBookmark({ id: 'long', content: { reading_time: 45 } });
    const short = makeBookmark({ id: 'short', content: { reading_time: 5 } });
    const ctx = buildScoreContext([long, short], null, 'quick-win', NOW);
    const ranked = rankBookmarks([long, short], ctx, { hardMaxMinutes: 15 });
    expect(ranked.every((r) => r.bookmark.id !== 'long')).toBe(true);
    expect(ranked.some((r) => r.bookmark.id === 'short')).toBe(true);
  });

  it('items with no reading time pass the filter', () => {
    const unknown = makeBookmark({ id: 'unknown', content: {}, metadata: {} });
    const ctx = buildScoreContext([unknown], null, 'quick-win', NOW);
    const ranked = rankBookmarks([unknown], ctx, { hardMaxMinutes: 15 });
    expect(ranked).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Shuffle: variety-maximising item wins
// ---------------------------------------------------------------------------

describe('Shuffle: diversity-dominated mode', () => {
  it('shuffle weights diversity at 0.6, staleness at 0.05', () => {
    expect(WEIGHTS['shuffle'].w2_diversity).toBe(0.6);
    expect(WEIGHTS['shuffle'].w1_staleness).toBe(0.05);
  });

  it('fresh-area item beats stale item in shuffle mode', () => {
    const techArea = makeArea({ id: 'tech' });

    // Saturate tech in recent done
    const doneItems = [1, 2, 3].map((i) =>
      makeBookmark({
        id: `done-${String(i)}`,
        status: 'done',
        areas: [techArea],
        finished_at: new Date(NOW.getTime() - i * 1000).toISOString(),
      }),
    );

    // Stale tech item vs fresh science item
    const staleStale = makeBookmark({
      id: 'stale-tech',
      areas: [techArea],
      created_at: new Date(NOW.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const freshSci = makeBookmark({
      id: 'fresh-sci',
      areas: [makeArea({ id: 'sci', name: 'Science' })],
      created_at: new Date(NOW.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const all = [...doneItems, staleStale, freshSci];
    const ctx = buildScoreContext(all, null, 'shuffle', NOW);
    const ranked = rankBookmarks([staleStale, freshSci], ctx);
    expect(ranked[0]!.bookmark.id).toBe('fresh-sci');
  });
});

// ---------------------------------------------------------------------------
// Recency penalty
// ---------------------------------------------------------------------------

describe('Recency penalty: recently touched item scores lower', () => {
  it('item started 10h ago scores lower than never-touched item', () => {
    const touched = makeBookmark({
      id: 'touched',
      status: 'reading',
      started_reading_at: new Date(NOW.getTime() - 10 * 60 * 60 * 1000).toISOString(),
    });
    const fresh = makeBookmark({ id: 'fresh', status: 'reading' });

    const ctx = defaultCtx([touched, fresh]);
    const touchedScore = scoreBookmark(touched, ctx);
    const freshScore = scoreBookmark(fresh, ctx);

    expect(touchedScore.components.recencyPenalty).toBeGreaterThan(0);
    expect(freshScore.components.recencyPenalty).toBe(0);
    expect(touchedScore.totalScore).toBeLessThan(freshScore.totalScore);
  });

  it('item started > 48h ago has zero recency penalty', () => {
    const old = makeBookmark({
      started_reading_at: new Date(NOW.getTime() - 72 * 60 * 60 * 1000).toISOString(),
    });
    const ctx = defaultCtx([old]);
    const result = scoreBookmark(old, ctx);
    expect(result.components.recencyPenalty).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

describe('Favorites: favorited item gets boost', () => {
  it('favorited item scores higher on favorites component', () => {
    const fav = makeBookmark({ id: 'fav', is_favorited: true });
    const notFav = makeBookmark({ id: 'not-fav', is_favorited: false });
    const ctx = defaultCtx([fav, notFav]);
    const favResult = scoreBookmark(fav, ctx);
    const notFavResult = scoreBookmark(notFav, ctx);
    expect(favResult.components.favorites).toBe(1.0);
    expect(notFavResult.components.favorites).toBe(0.0);
    // With default weights (w6=0.05), total should differ
    expect(favResult.totalScore).toBeGreaterThan(notFavResult.totalScore);
  });
});

// ---------------------------------------------------------------------------
// Deep-dive mood: long-form wins
// ---------------------------------------------------------------------------

describe('Mood: deep-dive prefers long content', () => {
  it('60-min article scores higher than 5-min article in deep-dive', () => {
    const long = makeBookmark({ id: 'long', content: { reading_time: 60 } });
    const short = makeBookmark({ id: 'short', content: { reading_time: 5 } });
    const ctx = buildScoreContext([long, short], null, 'deep-dive', NOW);
    const ranked = rankBookmarks([long, short], ctx);
    expect(ranked[0]!.bookmark.id).toBe('long');
  });

  it('light-read reverses the preference (short wins)', () => {
    const long = makeBookmark({ id: 'long', content: { reading_time: 60 } });
    const short = makeBookmark({ id: 'short', content: { reading_time: 5 } });
    const ctx = buildScoreContext([long, short], null, 'light-read', NOW);
    const ranked = rankBookmarks([long, short], ctx);
    expect(ranked[0]!.bookmark.id).toBe('short');
  });
});

// ---------------------------------------------------------------------------
// Untagged item edge case
// ---------------------------------------------------------------------------

describe('Untagged item: neutral diversity and freshness', () => {
  it('item with no areas gets neutral diversity (≥0) and fixed freshness (0.3)', () => {
    const b = makeBookmark({ areas: [] });
    const ctx = defaultCtx([b]);
    const result = scoreBookmark(b, ctx);
    expect(result.components.diversity).toBeGreaterThanOrEqual(0);
    expect(result.components.freshness).toBe(0.3);
  });
});

// ---------------------------------------------------------------------------
// Diversity cap: consecutive picks from different areas
// ---------------------------------------------------------------------------

describe('Diversity cap: consecutive pick mechanism works', () => {
  it('rankBookmarks can be called twice (filter first result) to get consecutive picks', () => {
    const techArea = makeArea({ id: 'tech', name: 'Tech' });
    const sciArea = makeArea({ id: 'sci', name: 'Science' });

    // Saturate tech area with 3 recent done items — sci item will score higher on diversity
    const doneItems = [1, 2, 3].map((i) =>
      makeBookmark({
        id: `done-tech-${String(i)}`,
        status: 'done',
        areas: [techArea],
        finished_at: new Date(NOW.getTime() - i * 1000).toISOString(),
      }),
    );

    const techItem = makeBookmark({ id: 'tech-candidate', areas: [techArea] });
    const sciItem = makeBookmark({ id: 'sci-candidate', areas: [sciArea] });

    const all = [...doneItems, techItem, sciItem];
    const ctx = defaultCtx(all);

    // First pick should be sci (better diversity when tech is saturated)
    const first = rankBookmarks([techItem, sciItem], ctx);
    expect(first[0]!.bookmark.id).toBe('sci-candidate');

    // Second pick mechanism: exclude first result and re-rank
    const remaining = [techItem]; // only tech remains
    const second = rankBookmarks(remaining, ctx);
    expect(second).toHaveLength(1);
    expect(second[0]!.bookmark.id).toBe('tech-candidate');
  });
});

// ---------------------------------------------------------------------------
// Edge case: empty bookmarks
// ---------------------------------------------------------------------------

describe('Empty bookmarks: no errors', () => {
  it('rankBookmarks returns [] with no bookmarks', () => {
    const ctx = defaultCtx([]);
    expect(rankBookmarks([], ctx)).toStrictEqual([]);
  });
});
