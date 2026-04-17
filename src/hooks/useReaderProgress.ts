import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_PREFIX = 'reader_progress:';
// Throttle writes: at most one every 250ms (4/s). Scroll fires ~60/s on
// mobile — unthrottled localStorage writes were a layout-thrash hot path.
const WRITE_THROTTLE_MS = 250;
// Threshold below which we don't bother offering a resume prompt.
export const RESUME_THRESHOLD = 0.05;

function storageKey(bookmarkId: string): string {
  return `${STORAGE_PREFIX}${bookmarkId}`;
}

function readProgress(bookmarkId: string): number {
  try {
    const raw = localStorage.getItem(storageKey(bookmarkId));
    if (!raw) return 0;
    const n = Number(raw);
    if (!Number.isFinite(n)) return 0;
    return Math.min(Math.max(n, 0), 1);
  } catch {
    return 0;
  }
}

/**
 * Persist reading position (0..1) per bookmark to localStorage.
 * - `savedProgress` is the value at mount (used to show the Resume pill).
 * - `write(pct)` throttles rapidly-firing scroll updates.
 * - `clear()` removes the entry (call on status → done).
 */
export function useReaderProgress(bookmarkId: string) {
  const [savedProgress, setSavedProgress] = useState<number>(() => readProgress(bookmarkId));
  const lastWriteRef = useRef<number>(0);
  const pendingRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-read when bookmark changes (Reader is reused across bookmarks).
  useEffect(() => {
    setSavedProgress(readProgress(bookmarkId));
    lastWriteRef.current = 0;
    pendingRef.current = null;
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [bookmarkId]);

  const flush = useCallback(() => {
    const pct = pendingRef.current;
    if (pct === null) return;
    pendingRef.current = null;
    lastWriteRef.current = Date.now();
    try {
      localStorage.setItem(storageKey(bookmarkId), String(pct));
    } catch {
      /* storage quota / private mode */
    }
  }, [bookmarkId]);

  const write = useCallback(
    (pct: number) => {
      const bounded = Math.min(Math.max(pct, 0), 1);
      pendingRef.current = bounded;
      const now = Date.now();
      const elapsed = now - lastWriteRef.current;
      if (elapsed >= WRITE_THROTTLE_MS) {
        flush();
        return;
      }
      if (timerRef.current === null) {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          flush();
        }, WRITE_THROTTLE_MS - elapsed);
      }
    },
    [flush],
  );

  const clear = useCallback(() => {
    pendingRef.current = null;
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    try {
      localStorage.removeItem(storageKey(bookmarkId));
    } catch {
      /* ignore */
    }
    setSavedProgress(0);
  }, [bookmarkId]);

  // Flush any pending write on unmount so the last position isn't lost.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      flush();
    };
  }, [flush]);

  return { savedProgress, write, clear };
}
