import { useMemo } from 'react';
import { useBookmarks } from './useBookmarks';
import { useUserValues } from './useUserValues';
import { buildScoreContext, rankBookmarks } from '../lib/scoring';
import type { MoodMode } from '../types/scoring';
import type { Bookmark } from '../types';

export function useScoring(mood: MoodMode = 'default') {
  const { bookmarks } = useBookmarks();
  const { values } = useUserValues();

  const ctx = useMemo(() => buildScoreContext(bookmarks, values, mood), [bookmarks, values, mood]);

  const topPick = useMemo(() => {
    const candidates = bookmarks.filter((b) => b.status === 'unread');
    const opts = mood === 'quick-win' ? { hardMaxMinutes: 15 } : {};
    const ranked = rankBookmarks(candidates, ctx, opts);
    const top = ranked[0];
    return top ? { bookmark: top.bookmark, reason: top.reason } : null;
  }, [bookmarks, ctx, mood]);

  const continueItem = useMemo<Bookmark | null>(() => {
    const reading = bookmarks.filter((b) => b.status === 'reading');
    const ranked = rankBookmarks(reading, ctx, { statusFilter: ['reading'] });
    return ranked[0]?.bookmark ?? null;
  }, [bookmarks, ctx]);

  const quickWin = useMemo<Bookmark | null>(() => {
    const candidates = bookmarks.filter(
      (b) => b.status === 'unread' && b.id !== topPick?.bookmark.id,
    );
    const ranked = rankBookmarks(candidates, ctx, { hardMaxMinutes: 15 });
    return ranked[0]?.bookmark ?? null;
  }, [bookmarks, ctx, topPick]);

  return { topPick, continueItem, quickWin, ctx };
}
