import { useState } from 'react';

export type FontSize = 'sm' | 'md' | 'lg';
export type FontFamily = 'sans' | 'serif';
export type ReaderTheme = 'light' | 'dark' | 'sepia';

interface ReaderPrefs {
  fontSize: FontSize;
  fontFamily: FontFamily;
  theme: ReaderTheme;
}

const DEFAULT_PREFS: ReaderPrefs = { fontSize: 'md', fontFamily: 'sans', theme: 'light' };
const STORAGE_KEY = 'reader_prefs';

export function useReaderPrefs() {
  const [prefs, setPrefs] = useState<ReaderPrefs>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved
        ? { ...DEFAULT_PREFS, ...(JSON.parse(saved) as Partial<ReaderPrefs>) }
        : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  });

  function update(updates: Partial<ReaderPrefs>) {
    setPrefs((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }

  return { ...prefs, update };
}
