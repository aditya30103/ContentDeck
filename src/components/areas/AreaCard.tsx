import type { TagArea } from '../../types';

interface AreaCardProps {
  area: TagArea;
  bookmarkCount: number;
  onClick: () => void;
  onEdit: () => void;
}

export default function AreaCard({ area, bookmarkCount, onClick, onEdit }: AreaCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group relative flex flex-col items-start gap-2 p-4 rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 hover:border-surface-300 dark:hover:border-surface-700 transition-colors text-left w-full min-h-[100px] cursor-pointer focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none"
      aria-label={`${area.emoji ? area.emoji + ' ' : ''}${area.name} — ${bookmarkCount} bookmarks`}
    >
      {/* Emoji + Name */}
      <div className="flex items-center gap-2">
        {area.emoji && <span className="text-xl">{area.emoji}</span>}
        <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
          {area.name}
        </h3>
      </div>

      {/* Description */}
      {area.description && (
        <p className="text-xs text-surface-500 dark:text-surface-400 line-clamp-2">
          {area.description}
        </p>
      )}

      {/* Count */}
      <span className="mt-auto text-xs text-surface-400 dark:text-surface-500">
        {bookmarkCount} {bookmarkCount === 1 ? 'bookmark' : 'bookmarks'}
      </span>

      {/* Color indicator */}
      {area.color && (
        <div
          className="absolute top-0 left-0 w-full h-1 rounded-t-xl"
          style={{ backgroundColor: area.color }}
        />
      )}

      {/* Edit button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-opacity min-w-[32px] min-h-[32px] flex items-center justify-center"
        aria-label={`Edit ${area.name}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        </svg>
      </button>
    </div>
  );
}
