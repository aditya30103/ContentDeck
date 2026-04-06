import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSpacedReview } from '../useSpacedReview';
import { makeBookmark, makeNote, createHookWrapper } from '../../test/test-utils';
import type { Bookmark } from '../../types';

// ---- Mock setup ----

let mockBookmarks: Bookmark[] = [];

vi.mock('../useBookmarks', () => ({
  useBookmarks: () => ({ bookmarks: mockBookmarks }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockBookmarks = [];
});

// ---- Helpers ----

/** Build a bookmark that qualifies for spaced review:
 *  status=done + has a reflection note + finished_at in the past (default 10 days) */
function dueBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000).toISOString();
  return makeBookmark({
    id: 'bm-due',
    status: 'done',
    finished_at: tenDaysAgo,
    last_reviewed_at: null,
    notes: [makeNote({ type: 'reflection', content: 'Some reflection' })],
    ...overrides,
  });
}

function renderReview() {
  const { Wrapper } = createHookWrapper();
  return renderHook(() => useSpacedReview(), { wrapper: Wrapper });
}

// ---- Core behaviour ----

describe('useSpacedReview', () => {
  it('returns reviewItem: null when no bookmarks', () => {
    mockBookmarks = [];
    const { result } = renderReview();
    expect(result.current.reviewItem).toBeNull();
  });

  it('returns reviewItem: null when no done bookmarks', () => {
    mockBookmarks = [
      makeBookmark({ id: 'b1', status: 'unread' }),
      makeBookmark({ id: 'b2', status: 'reading' }),
    ];
    const { result } = renderReview();
    expect(result.current.reviewItem).toBeNull();
  });

  it('returns reviewItem: null when done but no reflection notes', () => {
    mockBookmarks = [
      makeBookmark({
        id: 'b1',
        status: 'done',
        finished_at: new Date(Date.now() - 10 * 86_400_000).toISOString(),
        notes: [],
      }),
    ];
    const { result } = renderReview();
    expect(result.current.reviewItem).toBeNull();
  });

  it('returns reviewItem: null when done + reflection but not yet due', () => {
    // finished 1 hour ago — default interval is 3 days, not due yet
    mockBookmarks = [
      makeBookmark({
        id: 'b1',
        status: 'done',
        finished_at: new Date(Date.now() - 3_600_000).toISOString(),
        notes: [makeNote({ type: 'reflection', content: 'Fresh reflection' })],
      }),
    ];
    const { result } = renderReview();
    expect(result.current.reviewItem).toBeNull();
  });

  it('returns the due bookmark when it qualifies', () => {
    mockBookmarks = [dueBookmark({ id: 'due-1' })];
    const { result } = renderReview();
    expect(result.current.reviewItem).not.toBeNull();
    expect(result.current.reviewItem!.id).toBe('due-1');
  });

  it('returns only first item from queue (most overdue)', () => {
    const older = dueBookmark({
      id: 'older',
      finished_at: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    });
    const newer = dueBookmark({
      id: 'newer',
      finished_at: new Date(Date.now() - 10 * 86_400_000).toISOString(),
    });
    mockBookmarks = [newer, older]; // intentionally wrong order
    const { result } = renderReview();
    // most overdue = older (30 days ago with 3-day interval)
    expect(result.current.reviewItem!.id).toBe('older');
  });

  it('ignores non-reflection notes (type=note)', () => {
    mockBookmarks = [
      makeBookmark({
        id: 'b1',
        status: 'done',
        finished_at: new Date(Date.now() - 10 * 86_400_000).toISOString(),
        notes: [makeNote({ type: 'note', content: 'A plain note, not a reflection' })],
      }),
    ];
    const { result } = renderReview();
    // no reflection note → not eligible
    expect(result.current.reviewItem).toBeNull();
  });

  it('requires status === done (not reading)', () => {
    mockBookmarks = [
      makeBookmark({
        id: 'b1',
        status: 'reading',
        notes: [makeNote({ type: 'reflection', content: 'Mid-read reflection' })],
      }),
    ];
    const { result } = renderReview();
    expect(result.current.reviewItem).toBeNull();
  });
});

// ---- Reactivity ----

describe('useSpacedReview — reactivity', () => {
  it('updates reviewItem when bookmarks change', () => {
    mockBookmarks = [];
    const { Wrapper } = createHookWrapper();
    const { result, rerender } = renderHook(() => useSpacedReview(), { wrapper: Wrapper });
    expect(result.current.reviewItem).toBeNull();

    act(() => {
      mockBookmarks = [dueBookmark({ id: 'new-due' })];
    });
    rerender();

    expect(result.current.reviewItem).not.toBeNull();
    expect(result.current.reviewItem!.id).toBe('new-due');
  });

  it('clears reviewItem when qualifying bookmark is removed', () => {
    mockBookmarks = [dueBookmark({ id: 'was-due' })];
    const { Wrapper } = createHookWrapper();
    const { result, rerender } = renderHook(() => useSpacedReview(), { wrapper: Wrapper });
    expect(result.current.reviewItem!.id).toBe('was-due');

    act(() => {
      mockBookmarks = [];
    });
    rerender();

    expect(result.current.reviewItem).toBeNull();
  });
});
