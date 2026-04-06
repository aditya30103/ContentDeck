import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReaderPrefs } from '../useReaderPrefs';

const STORAGE_KEY = 'reader_prefs';

beforeEach(() => {
  localStorage.clear();
});

// ---- Defaults ----

describe('useReaderPrefs — defaults', () => {
  it('returns default prefs when localStorage is empty', () => {
    const { result } = renderHook(() => useReaderPrefs());
    expect(result.current.fontSize).toBe('md');
    expect(result.current.fontFamily).toBe('sans');
    expect(result.current.theme).toBe('light');
  });

  it('exposes an update function', () => {
    const { result } = renderHook(() => useReaderPrefs());
    expect(typeof result.current.update).toBe('function');
  });
});

// ---- Read from localStorage ----

describe('useReaderPrefs — read from localStorage', () => {
  it('reads stored prefs on mount', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ fontSize: 'lg', fontFamily: 'serif', theme: 'sepia' }),
    );
    const { result } = renderHook(() => useReaderPrefs());
    expect(result.current.fontSize).toBe('lg');
    expect(result.current.fontFamily).toBe('serif');
    expect(result.current.theme).toBe('sepia');
  });

  it('merges stored partial prefs with defaults', () => {
    // Only theme stored — fontSize and fontFamily should fall back to defaults
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ theme: 'dark' }));
    const { result } = renderHook(() => useReaderPrefs());
    expect(result.current.theme).toBe('dark');
    expect(result.current.fontSize).toBe('md'); // default
    expect(result.current.fontFamily).toBe('sans'); // default
  });

  it('falls back to defaults when JSON is invalid', () => {
    localStorage.setItem(STORAGE_KEY, '{broken json{{');
    const { result } = renderHook(() => useReaderPrefs());
    expect(result.current.fontSize).toBe('md');
    expect(result.current.fontFamily).toBe('sans');
    expect(result.current.theme).toBe('light');
  });
});

// ---- update ----

describe('useReaderPrefs — update', () => {
  it('applies a partial update — only provided keys change', () => {
    const { result } = renderHook(() => useReaderPrefs());

    act(() => {
      result.current.update({ fontSize: 'lg' });
    });

    expect(result.current.fontSize).toBe('lg');
    expect(result.current.fontFamily).toBe('sans'); // unchanged
    expect(result.current.theme).toBe('light'); // unchanged
  });

  it('updates fontFamily independently', () => {
    const { result } = renderHook(() => useReaderPrefs());

    act(() => {
      result.current.update({ fontFamily: 'serif' });
    });

    expect(result.current.fontFamily).toBe('serif');
    expect(result.current.fontSize).toBe('md'); // unchanged
  });

  it('updates theme independently', () => {
    const { result } = renderHook(() => useReaderPrefs());

    act(() => {
      result.current.update({ theme: 'sepia' });
    });

    expect(result.current.theme).toBe('sepia');
    expect(result.current.fontSize).toBe('md'); // unchanged
    expect(result.current.fontFamily).toBe('sans'); // unchanged
  });

  it('persists updates to localStorage', () => {
    const { result } = renderHook(() => useReaderPrefs());

    act(() => {
      result.current.update({ fontSize: 'sm', theme: 'dark' });
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!) as Record<string, unknown>;
    expect(stored['fontSize']).toBe('sm');
    expect(stored['theme']).toBe('dark');
    expect(stored['fontFamily']).toBe('sans'); // default preserved
  });

  it('multiple updates accumulate correctly', () => {
    const { result } = renderHook(() => useReaderPrefs());

    act(() => {
      result.current.update({ fontSize: 'lg' });
    });
    act(() => {
      result.current.update({ theme: 'dark' });
    });

    expect(result.current.fontSize).toBe('lg');
    expect(result.current.theme).toBe('dark');
  });
});

// ---- Persistence across remounts ----

describe('useReaderPrefs — persistence across remounts', () => {
  it('persists preferences across hook remounts', () => {
    const { result: r1, unmount } = renderHook(() => useReaderPrefs());

    act(() => {
      r1.current.update({ fontSize: 'lg', theme: 'sepia' });
    });
    unmount();

    // New mount reads from localStorage
    const { result: r2 } = renderHook(() => useReaderPrefs());
    expect(r2.current.fontSize).toBe('lg');
    expect(r2.current.theme).toBe('sepia');
  });
});
