import { useMemo } from 'react';
import { useBookmarks } from './useBookmarks';
import { buildReviewQueue } from '../lib/spaced-review';
import type { Bookmark } from '../types';

interface UseSpacedReviewResult {
  reviewItem: Bookmark | null;
}

/**
 * Returns the top due review item — the most overdue done bookmark
 * that has a reflection note. Null when nothing is due.
 */
export function useSpacedReview(): UseSpacedReviewResult {
  const { bookmarks } = useBookmarks();

  const reviewItem = useMemo(() => {
    const queue = buildReviewQueue(bookmarks);
    return queue[0] ?? null;
  }, [bookmarks]);

  return { reviewItem };
}
