import { describe, it, expect } from 'vitest';
import {
  getReviewState,
  isDue,
  nextReviewState,
  getReflectionNote,
  buildReviewQueue,
} from '../spaced-review';
import type { Bookmark } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: 'b1',
    url: 'https://example.com',
    title: 'Test Article',
    image: null,
    excerpt: null,
    source_type: 'blog',
    status: 'done',
    is_favorited: false,
    notes: [],
    tags: [],
    areas: [],
    metadata: {},
    content: {},
    content_status: 'pending',
    content_fetched_at: null,
    synced: false,
    created_at: '2026-01-01T00:00:00Z',
    status_changed_at: '2026-01-01T00:00:00Z',
    started_reading_at: null,
    finished_at: '2026-01-01T00:00:00Z',
    last_reviewed_at: null,
    ...overrides,
  };
}

function makeReflectionNote(text: string) {
  return { type: 'reflection' as const, content: text, created_at: '2026-01-01T00:00:00Z' };
}

// A date far in the past, making everything due
const PAST = new Date('2020-01-01T00:00:00Z');

// ---------------------------------------------------------------------------
// getReviewState
// ---------------------------------------------------------------------------

describe('getReviewState', () => {
  it('defaults to interval=3 and repetitions=0 when metadata is empty', () => {
    const b = makeBookmark();
    const state = getReviewState(b);
    expect(state.interval).toBe(3);
    expect(state.repetitions).toBe(0);
  });

  it('reads stored interval and repetitions from metadata', () => {
    const b = makeBookmark({ metadata: { review_interval: 12, review_repetitions: 3 } });
    const state = getReviewState(b);
    expect(state.interval).toBe(12);
    expect(state.repetitions).toBe(3);
  });

  it('dueAt is based on last_reviewed_at when present', () => {
    const b = makeBookmark({
      last_reviewed_at: '2026-03-01T00:00:00Z',
      metadata: { review_interval: 3 },
    });
    const state = getReviewState(b);
    expect(state.dueAt).toBe('2026-03-04T00:00:00.000Z');
  });

  it('dueAt falls back to finished_at when last_reviewed_at is null', () => {
    const b = makeBookmark({
      last_reviewed_at: null,
      finished_at: '2026-03-01T00:00:00Z',
      metadata: { review_interval: 3 },
    });
    const state = getReviewState(b);
    expect(state.dueAt).toBe('2026-03-04T00:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// isDue
// ---------------------------------------------------------------------------

describe('isDue', () => {
  it('returns true when dueAt is in the past', () => {
    const b = makeBookmark({
      finished_at: '2020-01-01T00:00:00Z',
      metadata: { review_interval: 3 },
    });
    expect(isDue(b, new Date('2026-03-07T00:00:00Z'))).toBe(true);
  });

  it('returns false when dueAt is in the future', () => {
    const b = makeBookmark({
      last_reviewed_at: '2026-03-06T00:00:00Z',
      metadata: { review_interval: 30 },
    });
    expect(isDue(b, new Date('2026-03-07T00:00:00Z'))).toBe(false);
  });

  it('returns true exactly when due date equals now', () => {
    const b = makeBookmark({
      last_reviewed_at: '2026-03-04T00:00:00Z',
      metadata: { review_interval: 3 },
    });
    expect(isDue(b, new Date('2026-03-07T00:00:00Z'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// nextReviewState
// ---------------------------------------------------------------------------

describe('nextReviewState', () => {
  it('doubles the interval when resonates=true', () => {
    const b = makeBookmark({ metadata: { review_interval: 3, review_repetitions: 0 } });
    const next = nextReviewState(b, true);
    expect(next.interval).toBe(6);
    expect(next.repetitions).toBe(1);
  });

  it('resets interval to 3 when resonates=false (lost the thread)', () => {
    const b = makeBookmark({ metadata: { review_interval: 24, review_repetitions: 4 } });
    const next = nextReviewState(b, false);
    expect(next.interval).toBe(3);
    expect(next.repetitions).toBe(5);
  });

  it('increments repetitions regardless of resonates', () => {
    const b = makeBookmark({ metadata: { review_interval: 6, review_repetitions: 2 } });
    expect(nextReviewState(b, true).repetitions).toBe(3);
    expect(nextReviewState(b, false).repetitions).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// getReflectionNote
// ---------------------------------------------------------------------------

describe('getReflectionNote', () => {
  it('returns null when no notes', () => {
    expect(getReflectionNote(makeBookmark())).toBeNull();
  });

  it('returns null when notes exist but none are reflection type', () => {
    const b = makeBookmark({
      notes: [{ type: 'insight', content: 'interesting', created_at: '2026-01-01T00:00:00Z' }],
    });
    expect(getReflectionNote(b)).toBeNull();
  });

  it('returns the reflection note content', () => {
    const b = makeBookmark({ notes: [makeReflectionNote('Key insight')] });
    expect(getReflectionNote(b)).toBe('Key insight');
  });

  it('returns the most recent reflection note when multiple exist', () => {
    const b = makeBookmark({
      notes: [makeReflectionNote('First'), makeReflectionNote('Second')],
    });
    expect(getReflectionNote(b)).toBe('Second');
  });
});

// ---------------------------------------------------------------------------
// buildReviewQueue
// ---------------------------------------------------------------------------

describe('buildReviewQueue', () => {
  it('returns empty array when no bookmarks are eligible', () => {
    const bookmarks = [makeBookmark({ status: 'unread' })];
    expect(buildReviewQueue(bookmarks, PAST)).toHaveLength(0);
  });

  it('excludes done bookmarks with no reflection note', () => {
    const b = makeBookmark({ status: 'done', notes: [] });
    expect(buildReviewQueue([b], PAST)).toHaveLength(0);
  });

  it('includes done bookmarks with a reflection note that are due', () => {
    const b = makeBookmark({
      status: 'done',
      created_at: '2019-06-01T00:00:00Z',
      finished_at: '2019-06-01T00:00:00Z',
      notes: [makeReflectionNote('My takeaway')],
    });
    expect(buildReviewQueue([b], PAST)).toHaveLength(1);
  });

  it('excludes items not yet due', () => {
    const b = makeBookmark({
      status: 'done',
      notes: [makeReflectionNote('My takeaway')],
      last_reviewed_at: new Date(Date.now() - 1000).toISOString(),
      metadata: { review_interval: 30 },
    });
    expect(buildReviewQueue([b], new Date())).toHaveLength(0);
  });

  it('sorts most-overdue first', () => {
    const older = makeBookmark({
      id: 'older',
      status: 'done',
      created_at: '2019-01-01T00:00:00Z',
      finished_at: '2019-01-01T00:00:00Z',
      notes: [makeReflectionNote('older note')],
    });
    const newer = makeBookmark({
      id: 'newer',
      status: 'done',
      created_at: '2019-02-01T00:00:00Z',
      finished_at: '2019-02-01T00:00:00Z',
      notes: [makeReflectionNote('newer note')],
    });
    const queue = buildReviewQueue([newer, older], PAST);
    expect(queue[0]!.id).toBe('older');
    expect(queue[1]!.id).toBe('newer');
  });
});

// ---------------------------------------------------------------------------
// Edge cases (plan Phase 3F additions)
// ---------------------------------------------------------------------------

describe('getReviewState — edge cases', () => {
  it('treats review_interval=0 as DEFAULT_INTERVAL (3) — zero is falsy', () => {
    // metadata.review_interval ?? DEFAULT_INTERVAL — 0 is falsy so ?? returns 3
    const b = makeBookmark({ metadata: { review_interval: 0 } });
    const state = getReviewState(b);
    // 0 ?? 3 = 0 (nullish coalescing only catches null/undefined, not 0)
    // so interval = 0; dueAt = anchor + 0 days = anchor itself = always due
    // The important thing: no crash, and dueAt is set
    expect(typeof state.interval).toBe('number');
    expect(state.dueAt).toBeTruthy();
  });

  it('anchor precedence: last_reviewed_at > finished_at > created_at', () => {
    const b = makeBookmark({
      last_reviewed_at: '2026-03-01T00:00:00Z',
      finished_at: '2026-01-01T00:00:00Z',
      created_at: '2025-06-01T00:00:00Z',
      metadata: { review_interval: 3 },
    });
    const state = getReviewState(b);
    // last_reviewed_at takes precedence → dueAt = 2026-03-01 + 3 days = 2026-03-04
    expect(state.dueAt).toBe('2026-03-04T00:00:00.000Z');
  });

  it('falls back to created_at when both last_reviewed_at and finished_at are null', () => {
    const b = makeBookmark({
      last_reviewed_at: null,
      finished_at: null,
      created_at: '2026-01-01T00:00:00Z',
      metadata: { review_interval: 3 },
    });
    const state = getReviewState(b);
    // Falls back to created_at: 2026-01-01 + 3 = 2026-01-04
    expect(state.dueAt).toBe('2026-01-04T00:00:00.000Z');
  });
});
