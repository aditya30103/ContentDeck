import { useMemo } from 'react';
import { Inbox, SearchX } from 'lucide-react';
import { useUI } from '../../context/UIProvider';
import BookmarkCard from './BookmarkCard';
import EmptyState from '../ui/EmptyState';
import Spinner from '../ui/Spinner';
import type { Bookmark, Status } from '../../types';

interface BookmarkListProps {
  bookmarks: Bookmark[];
  isLoading: boolean;
  onCycleStatus: (id: string, newStatus: Status) => void;
  onToggleFavorite: (id: string, favorited: boolean) => void;
  onDelete: (id: string) => void;
  onClick?: (id: string) => void;
}

export default function BookmarkList({
  bookmarks,
  isLoading,
  onCycleStatus,
  onToggleFavorite,
  onDelete,
  onClick,
}: BookmarkListProps) {
  const {
    currentSource,
    currentStatus,
    currentTag,
    showFavorites,
    searchQuery,
    currentSort,
    selectMode,
    selectedIds,
    toggleSelected,
  } = useUI();

  const filtered = useMemo(() => {
    let result = bookmarks;

    // Favorites filter
    if (showFavorites) {
      result = result.filter((b) => b.is_favorited);
    }

    // Source filter
    if (currentSource !== 'all') {
      result = result.filter((b) => b.source_type === currentSource);
    }

    // Status filter
    if (currentStatus !== 'all') {
      result = result.filter((b) => b.status === currentStatus);
    }

    // Tag/Area filter
    if (currentTag) {
      if (currentTag === '__untagged__') {
        result = result.filter(
          (b) => (!b.tags || b.tags.length === 0) && (!b.areas || b.areas.length === 0),
        );
      } else {
        result = result.filter(
          (b) =>
            b.tags.some((t) => t.toLowerCase() === currentTag.toLowerCase()) ||
            b.areas?.some((a) => a.name.toLowerCase() === currentTag.toLowerCase()),
        );
      }
    }

    // Search — covers title, url, tags, areas, excerpt, and extracted content body
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.title?.toLowerCase().includes(q) ||
          b.url.toLowerCase().includes(q) ||
          b.tags.some((t) => t.toLowerCase().includes(q)) ||
          b.areas?.some((a) => a.name.toLowerCase().includes(q)) ||
          b.excerpt?.toLowerCase().includes(q) ||
          b.content?.text?.toLowerCase().includes(q),
      );
    }

    // Sort
    switch (currentSort) {
      case 'oldest':
        result = [...result].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
        break;
      case 'title':
        result = [...result].sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
        break;
      case 'newest':
      default:
        // Already sorted by created_at desc from API
        break;
    }

    return result;
  }, [
    bookmarks,
    currentSource,
    currentStatus,
    currentTag,
    showFavorites,
    searchQuery,
    currentSort,
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No bookmarks yet"
        description="Add your first bookmark to get started."
      />
    );
  }

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="No matches"
        description="Try adjusting your filters or search query."
      />
    );
  }

  return (
    <>
      {searchQuery && (
        <p className="text-xs text-surface-500 dark:text-surface-400 mb-2 px-1" aria-live="polite">
          {filtered.length === 1
            ? `1 result for "${searchQuery}"`
            : `${filtered.length} results for "${searchQuery}"`}
        </p>
      )}
      <ul className="space-y-2" role="list">
        {filtered.map((b) => (
          <li key={b.id}>
            <BookmarkCard
              bookmark={b}
              selected={selectedIds.has(b.id)}
              selectMode={selectMode}
              onCycleStatus={onCycleStatus}
              onToggleFavorite={onToggleFavorite}
              onDelete={onDelete}
              onSelect={toggleSelected}
              onClick={onClick}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
