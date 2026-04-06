import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScoring } from '../useScoring';
import { makeBookmark, createHookWrapper } from '../../test/test-utils';
import type { Bookmark } from '../../types';
import type { MoodMode } from '../../types/scoring';

// ---- Mock setup ----

// Mutable refs so individual tests can override the return value
let mockBookmarks: Bookmark[] = [];
let mockValues: null | object = null;

vi.mock('../useBookmarks', () => ({
  useBookmarks: () => ({ bookmarks: mockBookmarks }),
}));

vi.mock('../useUserValues', () => ({
  useUserValues: () => ({ values: mockValues, setValues: vi.fn(), clearValues: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockBookmarks = [];
  mockValues = null;
});

// ---- Helpers ----

function renderScoring(mood: MoodMode = 'default') {
  const { Wrapper } = createHookWrapper();
  return renderHook(() => useScoring(mood), { wrapper: Wrapper });
}

// ---- topPick ----

describe('useScoring — topPick', () => {
  it('returns null when no bookmarks exist', () => {
    mockBookmarks = [];
    const { result } = renderScoring();
    expect(result.current.topPick).toBeNull();
  });

  it('returns null when all bookmarks are done or reading', () => {
    mockBookmarks = [
      makeBookmark({ id: 'b1', status: 'done' }),
      makeBookmark({ id: 'b2', status: 'reading' }),
    ];
    const { result } = renderScoring();
    expect(result.current.topPick).toBeNull();
  });

  it('returns a bookmark from unread pool only', () => {
    mockBookmarks = [
      makeBookmark({ id: 'b1', status: 'unread' }),
      makeBookmark({ id: 'b2', status: 'reading' }),
      makeBookmark({ id: 'b3', status: 'done' }),
    ];
    const { result } = renderScoring();
    expect(result.current.topPick).not.toBeNull();
    expect(result.current.topPick!.bookmark.status).toBe('unread');
  });

  it('returns bookmark + reason shape', () => {
    mockBookmarks = [makeBookmark({ id: 'b1', status: 'unread' })];
    const { result } = renderScoring();
    expect(result.current.topPick).toHaveProperty('bookmark');
    expect(result.current.topPick).toHaveProperty('reason');
    expect(typeof result.current.topPick!.reason).toBe('string');
  });

  it('selects from unread when multiple statuses present', () => {
    mockBookmarks = [
      makeBookmark({ id: 'reading-1', status: 'reading' }),
      makeBookmark({ id: 'unread-1', status: 'unread' }),
      makeBookmark({ id: 'done-1', status: 'done' }),
    ];
    const { result } = renderScoring();
    // topPick must be from unread pool
    expect(result.current.topPick!.bookmark.id).toBe('unread-1');
  });
});

// ---- continueItem ----

describe('useScoring — continueItem', () => {
  it('returns null when no reading bookmarks', () => {
    mockBookmarks = [
      makeBookmark({ id: 'b1', status: 'unread' }),
      makeBookmark({ id: 'b2', status: 'done' }),
    ];
    const { result } = renderScoring();
    expect(result.current.continueItem).toBeNull();
  });

  it('returns null when no bookmarks at all', () => {
    mockBookmarks = [];
    const { result } = renderScoring();
    expect(result.current.continueItem).toBeNull();
  });

  it('returns a bookmark from reading pool only', () => {
    mockBookmarks = [
      makeBookmark({ id: 'b1', status: 'reading' }),
      makeBookmark({ id: 'b2', status: 'unread' }),
    ];
    const { result } = renderScoring();
    expect(result.current.continueItem).not.toBeNull();
    expect(result.current.continueItem!.status).toBe('reading');
  });

  it('returns a plain Bookmark (not wrapped in {bookmark, reason})', () => {
    mockBookmarks = [makeBookmark({ id: 'b1', status: 'reading' })];
    const { result } = renderScoring();
    // continueItem is Bookmark | null, not ScoreResult
    expect(result.current.continueItem).toHaveProperty('id');
    expect(result.current.continueItem).toHaveProperty('status');
    expect(result.current.continueItem).not.toHaveProperty('reason');
  });

  it('selects from reading pool when multiple reading items exist', () => {
    mockBookmarks = [
      makeBookmark({ id: 'r1', status: 'reading', created_at: '2024-01-01T00:00:00Z' }),
      makeBookmark({ id: 'r2', status: 'reading', created_at: '2024-01-10T00:00:00Z' }),
    ];
    const { result } = renderScoring();
    expect(['r1', 'r2']).toContain(result.current.continueItem!.id);
  });
});

// ---- quickWin ----

describe('useScoring — quickWin', () => {
  it('returns null when no unread bookmarks', () => {
    mockBookmarks = [];
    const { result } = renderScoring();
    expect(result.current.quickWin).toBeNull();
  });

  it('returns null when only one unread bookmark (already taken by topPick)', () => {
    mockBookmarks = [makeBookmark({ id: 'b1', status: 'unread' })];
    const { result } = renderScoring();
    // topPick takes b1, quickWin excludes it → null
    expect(result.current.quickWin).toBeNull();
  });

  it('never returns the same bookmark as topPick', () => {
    mockBookmarks = [
      makeBookmark({ id: 'b1', status: 'unread' }),
      makeBookmark({ id: 'b2', status: 'unread' }),
    ];
    const { result } = renderScoring();
    if (result.current.topPick && result.current.quickWin) {
      expect(result.current.quickWin.id).not.toBe(result.current.topPick.bookmark.id);
    }
  });

  it('returns a plain Bookmark (not wrapped)', () => {
    mockBookmarks = [
      makeBookmark({ id: 'b1', status: 'unread' }),
      makeBookmark({ id: 'b2', status: 'unread' }),
    ];
    const { result } = renderScoring();
    if (result.current.quickWin) {
      expect(result.current.quickWin).toHaveProperty('id');
      expect(result.current.quickWin).not.toHaveProperty('reason');
    }
  });
});

// ---- Edge: all done ----

describe('useScoring — all done edge case', () => {
  it('returns null for all three picks when all bookmarks are done', () => {
    mockBookmarks = [
      makeBookmark({ id: 'b1', status: 'done' }),
      makeBookmark({ id: 'b2', status: 'done' }),
      makeBookmark({ id: 'b3', status: 'done' }),
    ];
    const { result } = renderScoring();
    expect(result.current.topPick).toBeNull();
    expect(result.current.continueItem).toBeNull();
    expect(result.current.quickWin).toBeNull();
  });
});

// ---- Reactivity ----

describe('useScoring — reactivity', () => {
  it('recomputes topPick when bookmarks change', () => {
    mockBookmarks = [];
    const { Wrapper } = createHookWrapper();
    const { result, rerender } = renderHook(() => useScoring('default'), { wrapper: Wrapper });
    expect(result.current.topPick).toBeNull();

    act(() => {
      mockBookmarks = [makeBookmark({ id: 'b1', status: 'unread' })];
    });
    rerender();

    expect(result.current.topPick).not.toBeNull();
    expect(result.current.topPick!.bookmark.id).toBe('b1');
  });

  it('recomputes when mood changes', () => {
    mockBookmarks = [
      makeBookmark({ id: 'b1', status: 'unread' }),
      makeBookmark({ id: 'b2', status: 'unread' }),
    ];
    let mood: MoodMode = 'default';
    const { Wrapper } = createHookWrapper();
    const { result, rerender } = renderHook(() => useScoring(mood), { wrapper: Wrapper });

    const topPickBefore = result.current.topPick;

    act(() => {
      mood = 'quick-win';
    });
    rerender();

    // After mood change, ctx is rebuilt — topPick may differ; hook ran without error
    expect(result.current.ctx.mood).toBe('quick-win');
    void topPickBefore; // suppress unused
  });

  it('ctx reflects current mood', () => {
    mockBookmarks = [];
    const { result } = renderScoring('deep-dive');
    expect(result.current.ctx.mood).toBe('deep-dive');
  });
});
