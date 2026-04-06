import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUserValues, getUserValues, setUserValues, clearUserValues } from '../useUserValues';
import type { UserValues } from '../../types/scoring';

// ---- Helpers ----

const KEY = 'contentdeck_values';

const sampleValues: UserValues = {
  priorityAreaIds: ['area-1', 'area-2'],
  suppressedAreaIds: [],
  sessionLength: 'medium',
  completedAt: '2024-01-01T00:00:00Z',
  version: 1,
};

beforeEach(() => {
  // Clear localStorage before each test (setup.ts provides a Map-backed mock)
  localStorage.clear();
  vi.clearAllMocks();
});

// ---- getUserValues ----

describe('getUserValues (pure function)', () => {
  it('returns null when localStorage is empty', () => {
    expect(getUserValues()).toBeNull();
  });

  it('returns parsed values when stored', () => {
    localStorage.setItem(KEY, JSON.stringify(sampleValues));
    expect(getUserValues()).toEqual(sampleValues);
  });

  it('returns null for malformed JSON — does not throw', () => {
    localStorage.setItem(KEY, '{invalid json}');
    expect(getUserValues()).toBeNull();
  });

  it('returns null for null stored as string', () => {
    localStorage.setItem(KEY, 'null');
    // JSON.parse('null') is null — truthy check returns null
    expect(getUserValues()).toBeNull();
  });
});

// ---- setUserValues / clearUserValues ----

describe('setUserValues / clearUserValues (pure functions)', () => {
  it('setUserValues writes to localStorage', () => {
    setUserValues(sampleValues);
    const raw = localStorage.getItem(KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual(sampleValues);
  });

  it('clearUserValues removes the key from localStorage', () => {
    localStorage.setItem(KEY, JSON.stringify(sampleValues));
    clearUserValues();
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});

// ---- useUserValues hook ----

describe('useUserValues — hook', () => {
  it('returns null when localStorage is empty on mount', () => {
    const { result } = renderHook(() => useUserValues());
    expect(result.current.values).toBeNull();
  });

  it('reads existing values from localStorage on mount', () => {
    localStorage.setItem(KEY, JSON.stringify(sampleValues));
    const { result } = renderHook(() => useUserValues());
    expect(result.current.values).toEqual(sampleValues);
  });

  it('setValues writes to localStorage and exposes via returned helper', () => {
    const { result } = renderHook(() => useUserValues());
    act(() => {
      result.current.setValues(sampleValues);
    });
    // Verify localStorage was updated
    const raw = localStorage.getItem(KEY);
    expect(JSON.parse(raw!)).toEqual(sampleValues);
  });

  it('clearValues removes from localStorage', () => {
    localStorage.setItem(KEY, JSON.stringify(sampleValues));
    const { result } = renderHook(() => useUserValues());
    act(() => {
      result.current.clearValues();
    });
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('values persist across hook remounts (read from localStorage)', () => {
    localStorage.setItem(KEY, JSON.stringify(sampleValues));

    // First mount
    const { result: r1, unmount } = renderHook(() => useUserValues());
    expect(r1.current.values).toEqual(sampleValues);
    unmount();

    // Second mount — still reads from localStorage
    const { result: r2 } = renderHook(() => useUserValues());
    expect(r2.current.values).toEqual(sampleValues);
  });

  it('malformed JSON in localStorage returns null without throwing', () => {
    localStorage.setItem(KEY, ':::broken:::');
    const { result } = renderHook(() => useUserValues());
    expect(result.current.values).toBeNull();
  });

  it('responds to storage event by refreshing values', () => {
    const { result } = renderHook(() => useUserValues());
    expect(result.current.values).toBeNull();

    // Simulate another tab writing to localStorage
    localStorage.setItem(KEY, JSON.stringify(sampleValues));
    act(() => {
      window.dispatchEvent(new Event('storage'));
    });

    expect(result.current.values).toEqual(sampleValues);
  });

  it('responds to storage event clearing values', () => {
    localStorage.setItem(KEY, JSON.stringify(sampleValues));
    const { result } = renderHook(() => useUserValues());
    expect(result.current.values).toEqual(sampleValues);

    localStorage.removeItem(KEY);
    act(() => {
      window.dispatchEvent(new Event('storage'));
    });

    expect(result.current.values).toBeNull();
  });
});
