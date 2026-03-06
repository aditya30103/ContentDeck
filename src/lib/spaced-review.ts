import type { Bookmark } from '../types';

// ---------------------------------------------------------------------------
// SM-2 variant — pure client-side, no infrastructure cost
// Initial interval: 3 days
// 'Still resonates' → interval × 2
// 'Lost the thread'  → interval reset to 3 days
// ---------------------------------------------------------------------------

const DEFAULT_INTERVAL = 3; // days

export interface ReviewState {
  interval: number; // days until next review
  repetitions: number; // total times reviewed
  dueAt: string; // ISO timestamp when next review is due
}

/** Read SM-2 state from bookmark metadata + last_reviewed_at */
export function getReviewState(bookmark: Bookmark): ReviewState {
  const interval = bookmark.metadata.review_interval ?? DEFAULT_INTERVAL;
  const repetitions = bookmark.metadata.review_repetitions ?? 0;

  const anchor = bookmark.last_reviewed_at ?? bookmark.finished_at ?? bookmark.created_at;
  const dueAt = new Date(new Date(anchor).getTime() + interval * 86_400_000).toISOString();

  return { interval, repetitions, dueAt };
}

/** True when a review is due (or overdue) */
export function isDue(bookmark: Bookmark, now = new Date()): boolean {
  const { dueAt } = getReviewState(bookmark);
  return new Date(dueAt) <= now;
}

/** Compute the next review state after a user response */
export function nextReviewState(bookmark: Bookmark, resonates: boolean): ReviewState {
  const { interval, repetitions } = getReviewState(bookmark);
  const newInterval = resonates ? Math.round(interval * 2) : DEFAULT_INTERVAL;
  const newRepetitions = repetitions + 1;
  const dueAt = new Date(Date.now() + newInterval * 86_400_000).toISOString();
  return { interval: newInterval, repetitions: newRepetitions, dueAt };
}

/** Get the most recent reflection note text, or null if none */
export function getReflectionNote(bookmark: Bookmark): string | null {
  const reflections = bookmark.notes.filter((n) => n.type === 'reflection');
  return reflections[reflections.length - 1]?.content ?? null;
}

/**
 * Build the ordered review queue from a bookmark list.
 * Eligibility: done + has a reflection note + review is due.
 * Sorted most-overdue first.
 */
export function buildReviewQueue(bookmarks: Bookmark[], now = new Date()): Bookmark[] {
  return bookmarks
    .filter((b) => b.status === 'done' && getReflectionNote(b) !== null && isDue(b, now))
    .sort((a, b) => {
      const aDue = new Date(getReviewState(a).dueAt).getTime();
      const bDue = new Date(getReviewState(b).dueAt).getTime();
      return aDue - bDue;
    });
}
