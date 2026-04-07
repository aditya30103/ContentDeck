import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStats } from '../useStats';
import {
  createMockSupabase,
  createHookWrapper,
  makeBookmark,
  makeStatusHistoryEntry,
} from '../../test/test-utils';
import type { Bookmark, StatusHistoryEntry } from '../../types';

// ---- Mock setup ----

const mockClient = createMockSupabase();

vi.mock('../../context/SupabaseProvider', () => ({
  useSupabase: () => mockClient,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockClient._resetBuilders();
  // Fix time to 2024-03-15 12:00 UTC for deterministic streak/date tests
  // shouldAdvanceTime: true — lets real time pass so waitFor polling works
  // while still controlling Date for deterministic streak/date logic
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2024-03-15T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

// ---- Helpers ----

function renderStats(
  bookmarks: Bookmark[] = [makeBookmark()],
  historyData: StatusHistoryEntry[] = [],
) {
  const builder = mockClient._getBuilder('status_history');
  builder._resolve = { data: historyData, error: null };

  const { Wrapper } = createHookWrapper();
  return renderHook(() => useStats(bookmarks), { wrapper: Wrapper });
}

function doneEntry(daysAgo: number, bookmarkId = 'bm-1') {
  const d = new Date('2024-03-15T12:00:00Z');
  d.setDate(d.getDate() - daysAgo);
  return makeStatusHistoryEntry({
    bookmark_id: bookmarkId,
    old_status: 'reading',
    new_status: 'done',
    changed_at: d.toISOString(),
  });
}

// ---- Query behaviour ----

describe('useStats — query', () => {
  it('starts with isLoading: true', () => {
    const builder = mockClient._getBuilder('status_history');
    builder._resolve = { data: [], error: null };
    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useStats([]), { wrapper: Wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('populates stats after query resolves', async () => {
    const { result } = renderStats([], []);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats).toBeDefined();
  });

  it('uses empty history on DB error — does not throw', async () => {
    const builder = mockClient._getBuilder('status_history');
    builder._resolve = { data: null, error: { message: 'DB error' } };
    const { Wrapper } = createHookWrapper();
    const { result } = renderHook(() => useStats([]), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // With empty history, completedThisWeek should be 0
    expect(result.current.stats.completedThisWeek).toBe(0);
  });

  it('queries status_history with gte filter for 90 days', async () => {
    const builder = mockClient._getBuilder('status_history');
    builder._resolve = { data: [], error: null };
    const { Wrapper } = createHookWrapper();
    renderHook(() => useStats([]), { wrapper: Wrapper });
    await waitFor(() => expect(builder.gte).toHaveBeenCalled());
    expect(builder.gte).toHaveBeenCalledWith('changed_at', expect.any(String));
  });
});

// ---- completedThisWeek / completedThisMonth ----

describe('computeStats — completedThisWeek / completedThisMonth', () => {
  it('counts done entries within 7 days', async () => {
    const history = [
      doneEntry(0), // today
      doneEntry(3), // 3 days ago
      doneEntry(6), // 6 days ago = clearly within 7-day window
      doneEntry(8), // 8 days ago = outside
    ];
    const { result } = renderStats([], history);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats.completedThisWeek).toBe(3);
  });

  it('counts done entries within 30 days', async () => {
    // monthAgo uses setMonth(-1): 2024-03-15 → 2024-02-15.
    // 28 days before Mar 15 = Feb 16, which is after Feb 15 → inside window.
    // 35 days before Mar 15 = Feb 9, which is before Feb 15 → outside window.
    const history = [
      doneEntry(0),
      doneEntry(20),
      doneEntry(28), // 28 days ago = Feb 16 → inside 1-month window
      doneEntry(35), // outside
    ];
    const { result } = renderStats([], history);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats.completedThisMonth).toBe(3);
  });

  it('returns 0 when no completions exist', async () => {
    const { result } = renderStats([], []);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats.completedThisWeek).toBe(0);
    expect(result.current.stats.completedThisMonth).toBe(0);
  });

  it('only counts entries with new_status === done', async () => {
    const history = [
      makeStatusHistoryEntry({ new_status: 'reading', changed_at: new Date().toISOString() }),
      makeStatusHistoryEntry({ new_status: 'done', changed_at: new Date().toISOString() }),
    ];
    const { result } = renderStats([], history);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats.completedThisWeek).toBe(1);
  });
});

// ---- currentStreak ----

describe('computeStats — currentStreak', () => {
  it('returns 0 when no completions', async () => {
    const { result } = renderStats([], []);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats.currentStreak).toBe(0);
  });

  it('returns 1 when only today has a completion', async () => {
    const { result } = renderStats([], [doneEntry(0)]);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats.currentStreak).toBe(1);
  });

  it('returns 3 for 3 consecutive days including today', async () => {
    const history = [doneEntry(0), doneEntry(1), doneEntry(2)];
    const { result } = renderStats([], history);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats.currentStreak).toBe(3);
  });

  it('returns streak from yesterday when today has no completion (streak still active)', async () => {
    // Yesterday and 2 days ago, but NOT today
    const history = [doneEntry(1), doneEntry(2), doneEntry(3)];
    const { result } = renderStats([], history);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // Streak is 3 (yesterday, 2d ago, 3d ago)
    expect(result.current.stats.currentStreak).toBe(3);
  });

  it('breaks streak at gap day', async () => {
    // Today + 2 days ago (gap on day 1)
    const history = [doneEntry(0), doneEntry(2), doneEntry(3)];
    const { result } = renderStats([], history);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // Streak is 1 (only today is consecutive from today)
    expect(result.current.stats.currentStreak).toBe(1);
  });

  it('multiple completions on same day count as one streak day', async () => {
    // Two entries today
    const history = [doneEntry(0), doneEntry(0), doneEntry(1)];
    const { result } = renderStats([], history);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats.currentStreak).toBe(2);
  });
});

// ---- avgCompletionDays ----

describe('computeStats — avgCompletionDays', () => {
  it('returns 0 when no bookmarks have start+finish times', async () => {
    const { result } = renderStats([makeBookmark()], []);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats.avgCompletionDays).toBe(0);
  });

  it('calculates average days between started_reading_at and finished_at', async () => {
    const bookmarks = [
      makeBookmark({
        id: 'bm-1',
        started_reading_at: '2024-01-01T00:00:00Z',
        finished_at: '2024-01-03T00:00:00Z', // 2 days
      }),
      makeBookmark({
        id: 'bm-2',
        started_reading_at: '2024-01-01T00:00:00Z',
        finished_at: '2024-01-05T00:00:00Z', // 4 days
      }),
    ];
    const { result } = renderStats(bookmarks, []);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats.avgCompletionDays).toBe(3); // (2+4)/2 = 3
  });

  it('rounds to 1 decimal place', async () => {
    const bookmarks = [
      makeBookmark({
        id: 'bm-1',
        started_reading_at: '2024-01-01T00:00:00Z',
        finished_at: '2024-01-02T12:00:00Z', // 1.5 days
      }),
    ];
    const { result } = renderStats(bookmarks, []);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats.avgCompletionDays).toBe(1.5);
  });

  it('ignores bookmarks missing started_reading_at', async () => {
    const bookmarks = [
      makeBookmark({ id: 'bm-1', started_reading_at: null, finished_at: '2024-01-03T00:00:00Z' }),
      makeBookmark({
        id: 'bm-2',
        started_reading_at: '2024-01-01T00:00:00Z',
        finished_at: '2024-01-03T00:00:00Z', // 2 days
      }),
    ];
    const { result } = renderStats(bookmarks, []);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats.avgCompletionDays).toBe(2);
  });
});

// ---- byStatus ----

describe('computeStats — byStatus', () => {
  it('counts bookmarks by status correctly', async () => {
    const bookmarks = [
      makeBookmark({ id: 'b1', status: 'unread' }),
      makeBookmark({ id: 'b2', status: 'unread' }),
      makeBookmark({ id: 'b3', status: 'reading' }),
      makeBookmark({ id: 'b4', status: 'done' }),
    ];
    const { result } = renderStats(bookmarks, []);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats.byStatus).toEqual({ unread: 2, reading: 1, done: 1 });
  });

  it('returns zeros when no bookmarks', async () => {
    const { result } = renderStats([], []);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats.byStatus).toEqual({ unread: 0, reading: 0, done: 0 });
  });
});

// ---- bySource ----

describe('computeStats — bySource', () => {
  it('aggregates source types', async () => {
    const bookmarks = [
      makeBookmark({ id: 'b1', source_type: 'youtube' }),
      makeBookmark({ id: 'b2', source_type: 'youtube' }),
      makeBookmark({ id: 'b3', source_type: 'blog' }),
    ];
    const { result } = renderStats(bookmarks, []);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats.bySource).toEqual({ youtube: 2, blog: 1 });
  });
});

// ---- totalBookmarks ----

describe('computeStats — totalBookmarks', () => {
  it('reflects the input array length', async () => {
    const bookmarks = [
      makeBookmark({ id: 'b1' }),
      makeBookmark({ id: 'b2' }),
      makeBookmark({ id: 'b3' }),
    ];
    const { result } = renderStats(bookmarks, []);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats.totalBookmarks).toBe(3);
  });
});

// ---- dailyCompletions ----

describe('computeStats — dailyCompletions', () => {
  it('always returns exactly 30 entries', async () => {
    const { result } = renderStats([], []);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.stats.dailyCompletions).toHaveLength(30);
  });

  it('last entry is today, first entry is 29 days ago', async () => {
    const { result } = renderStats([], []);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const entries = result.current.stats.dailyCompletions;
    // System time is 2024-03-15
    expect(entries[29]!.date).toBe('2024-03-15');
    expect(entries[0]!.date).toBe('2024-02-15');
  });

  it('counts completions per day correctly', async () => {
    const history = [doneEntry(0), doneEntry(0), doneEntry(1)];
    const { result } = renderStats([], history);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const entries = result.current.stats.dailyCompletions;
    const today = entries.find((e) => e.date === '2024-03-15')!;
    const yesterday = entries.find((e) => e.date === '2024-03-14')!;
    expect(today.count).toBe(2);
    expect(yesterday.count).toBe(1);
  });

  it('returns 0 counts for days with no completions', async () => {
    const { result } = renderStats([], []);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const entries = result.current.stats.dailyCompletions;
    expect(entries.every((e) => e.count === 0)).toBe(true);
  });
});
