import { Heart, Trash2, ExternalLink, Clock, FileText } from 'lucide-react';
import { SourceBadge, StatusBadge } from '../ui/Badge';
import { timeAgo, getDomain, getFaviconUrl, truncate, isBookWithoutUrl } from '../../lib/utils';
import { useUI } from '../../context/UIProvider';
import type { Bookmark, Status } from '../../types';
import { STATUS_NEXT } from '../../types';

interface BookmarkCardProps {
  bookmark: Bookmark;
  selected?: boolean;
  selectMode?: boolean;
  onCycleStatus: (id: string, newStatus: Status) => void;
  onToggleFavorite: (id: string, favorited: boolean) => void;
  onDelete: (id: string) => void;
  onSelect?: (id: string) => void;
  onClick?: (id: string) => void;
}

export default function BookmarkCard({
  bookmark: b,
  selected,
  selectMode,
  onCycleStatus,
  onToggleFavorite,
  onDelete,
  onSelect,
  onClick,
}: BookmarkCardProps) {
  const { setTag } = useUI();
  const noUrl = isBookWithoutUrl(b);
  const domain = noUrl ? null : getDomain(b.url);
  const readingTime = b.metadata?.reading_time;

  function handleClick() {
    if (selectMode && onSelect) {
      onSelect(b.id);
    } else if (onClick) {
      onClick(b.id);
    }
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm('Delete this bookmark?')) {
      onDelete(b.id);
    }
  }

  function handleTagClick(e: React.MouseEvent, tag: string) {
    e.stopPropagation();
    setTag(tag);
  }

  return (
    <div
      role="button"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick();
      }}
      tabIndex={0}
      aria-label={b.title || b.url}
      className={`
        group relative flex gap-3 p-3 rounded-xl border transition-colors cursor-pointer
        ${
          selected
            ? 'border-primary-500 bg-primary-600/5 dark:bg-primary-400/5'
            : 'border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700 bg-surface-50 dark:bg-surface-900'
        }
      `}
    >
      {/* Thumbnail */}
      {b.image && (
        <div className="hidden sm:block flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-surface-100 dark:bg-surface-800">
          <img src={b.image} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Top row: source + status + time */}
        <div className="flex items-center gap-2 mb-1">
          <SourceBadge source={b.source_type} />
          <StatusBadge
            status={b.status}
            onClick={() => onCycleStatus(b.id, STATUS_NEXT[b.status])}
          />
          <span className="text-xs text-surface-400 dark:text-surface-500 ml-auto flex-shrink-0">
            {timeAgo(b.created_at)}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-medium text-surface-900 dark:text-surface-100 line-clamp-2 mb-1">
          {b.title || (noUrl ? 'Untitled Book' : truncate(b.url, 60))}
        </h3>

        {/* Domain + metadata */}
        <div className="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
          {!noUrl && (
            <img src={getFaviconUrl(b.url)} alt="" className="w-3.5 h-3.5" loading="lazy" />
          )}
          {domain && <span>{domain}</span>}
          {b.metadata?.author && (
            <span>{noUrl ? b.metadata.author : `· ${b.metadata.author}`}</span>
          )}
          {b.metadata?.duration && (
            <span className="flex items-center gap-0.5">
              &middot; <Clock size={11} /> {b.metadata.duration}
            </span>
          )}
          {b.metadata?.channel && <span>&middot; {b.metadata.channel}</span>}
          {readingTime && (
            <span className="flex items-center gap-0.5">
              &middot; <Clock size={11} /> {readingTime} min read
            </span>
          )}
          {!readingTime && b.metadata?.word_count && (
            <span className="flex items-center gap-0.5">
              &middot; <FileText size={11} /> {b.metadata.word_count.toLocaleString()} words
            </span>
          )}
        </div>

        {/* Areas & Tags */}
        {((b.areas && b.areas.length > 0) || (b.tags && b.tags.length > 0)) && (
          <div className="flex flex-wrap gap-1 mt-2">
            {/* Area pills — colored with emoji */}
            {b.areas?.map((area) => (
              <button
                key={`area-${area.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setTag(area.name);
                }}
                className="px-2 py-0.5 rounded-full text-xs font-medium text-white transition-opacity hover:opacity-80"
                style={{ backgroundColor: area.color || '#6366f1' }}
              >
                {area.emoji && <span className="mr-0.5">{area.emoji}</span>}
                {area.name}
              </button>
            ))}
            {/* Tag pills */}
            {b.tags.slice(0, 3).map((tag) => (
              <button
                key={tag}
                onClick={(e) => handleTagClick(e, tag)}
                className="px-2 py-0.5 rounded-full text-xs bg-primary-600/10 text-primary-600 dark:text-primary-400 font-medium hover:bg-primary-600/20 transition-colors"
              >
                {tag}
              </button>
            ))}
            {b.tags.length > 3 && (
              <span className="text-xs text-surface-400">+{b.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Actions (visible on hover / always on mobile) */}
      <div className="flex flex-col items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(b.id, !b.is_favorited);
          }}
          className={`p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 min-w-[36px] min-h-[36px] flex items-center justify-center ${
            b.is_favorited ? 'text-amber-500' : 'text-surface-400'
          }`}
          aria-label={b.is_favorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart size={16} fill={b.is_favorited ? 'currentColor' : 'none'} />
        </button>
        {!noUrl && (
          <a
            href={b.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-400 min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Open in new tab"
          >
            <ExternalLink size={16} />
          </a>
        )}
        <button
          onClick={handleDelete}
          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-surface-400 hover:text-red-500 min-w-[36px] min-h-[36px] flex items-center justify-center"
          aria-label="Delete bookmark"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
