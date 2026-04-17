import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReaderProgress, RESUME_THRESHOLD } from '../useReaderProgress';

// Stub localStorage with an in-memory Map to assert writes/reads.
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => {
    store[k] = v;
  },
  removeItem: (k: string) => {
    delete store[k];
  },
  clear: () => Object.keys(store).forEach((k) => delete store[k]),
});

describe('useReaderProgress', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns savedProgress = 0 when no prior entry exists', () => {
    const { result } = renderHook(() => useReaderProgress('bm-1'));
    expect(result.current.savedProgress).toBe(0);
  });

  it('reads prior progress from localStorage on mount', () => {
    store['reader_progress:bm-42'] = '0.37';
    const { result } = renderHook(() => useReaderProgress('bm-42'));
    expect(result.current.savedProgress).toBeCloseTo(0.37, 4);
  });

  it('clamps savedProgress to [0, 1]', () => {
    store['reader_progress:bm-bad'] = '2.5';
    const { result } = renderHook(() => useReaderProgress('bm-bad'));
    expect(result.current.savedProgress).toBe(1);
  });

  it('treats non-numeric storage values as 0', () => {
    store['reader_progress:bm-nan'] = 'whatever';
    const { result } = renderHook(() => useReaderProgress('bm-nan'));
    expect(result.current.savedProgress).toBe(0);
  });

  it('writes progress on first call immediately (leading-edge throttle)', () => {
    const { result } = renderHook(() => useReaderProgress('bm-1'));
    act(() => result.current.write(0.5));
    expect(store['reader_progress:bm-1']).toBe('0.5');
  });

  it('throttles rapid writes to one per 250ms window (trailing flush)', () => {
    const { result } = renderHook(() => useReaderProgress('bm-1'));
    act(() => result.current.write(0.1));
    expect(store['reader_progress:bm-1']).toBe('0.1');
    act(() => {
      result.current.write(0.2);
      result.current.write(0.3);
      result.current.write(0.4);
    });
    // Trailing writes are queued, not flushed yet.
    expect(store['reader_progress:bm-1']).toBe('0.1');
    act(() => {
      vi.advanceTimersByTime(260);
    });
    expect(store['reader_progress:bm-1']).toBe('0.4');
  });

  it('clear() removes the stored entry and resets savedProgress', () => {
    store['reader_progress:bm-1'] = '0.6';
    const { result } = renderHook(() => useReaderProgress('bm-1'));
    expect(result.current.savedProgress).toBeCloseTo(0.6, 4);
    act(() => result.current.clear());
    expect(store['reader_progress:bm-1']).toBeUndefined();
    expect(result.current.savedProgress).toBe(0);
  });

  it('re-reads storage when the bookmarkId prop changes', () => {
    store['reader_progress:bm-a'] = '0.2';
    store['reader_progress:bm-b'] = '0.8';
    const { result, rerender } = renderHook(({ id }) => useReaderProgress(id), {
      initialProps: { id: 'bm-a' },
    });
    expect(result.current.savedProgress).toBeCloseTo(0.2, 4);
    rerender({ id: 'bm-b' });
    expect(result.current.savedProgress).toBeCloseTo(0.8, 4);
  });

  it('flushes pending progress on unmount so last scroll position is not lost', () => {
    const { result, unmount } = renderHook(() => useReaderProgress('bm-1'));
    act(() => {
      result.current.write(0.1); // leading edge — flushes immediately
      result.current.write(0.9); // trailing — queued
    });
    expect(store['reader_progress:bm-1']).toBe('0.1');
    unmount();
    expect(store['reader_progress:bm-1']).toBe('0.9');
  });

  it('RESUME_THRESHOLD is exported and non-trivial', () => {
    expect(RESUME_THRESHOLD).toBeGreaterThan(0);
    expect(RESUME_THRESHOLD).toBeLessThan(0.5);
  });
});
