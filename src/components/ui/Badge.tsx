import type { SourceType, Status } from '../../types';
import { SOURCE_LABELS } from '../../types';

const sourceStyles: Record<SourceType, string> = {
  youtube: 'bg-[#ff000018] text-source-youtube',
  twitter: 'bg-[#1da1f218] text-source-twitter',
  linkedin: 'bg-[#0077b518] text-source-linkedin',
  substack: 'bg-[#ff681818] text-source-substack',
  blog: 'bg-[#6366f118] text-source-blog',
  book: 'bg-[#4ecdc418] text-source-book',
  arxiv: 'bg-[#b31b1b18] text-source-arxiv',
};

const statusStyles: Record<Status, string> = {
  unread: 'bg-surface-200 dark:bg-surface-700 text-surface-500 dark:text-surface-400',
  reading: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  done: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
};

const statusLabels: Record<Status, string> = {
  unread: 'Unread',
  reading: 'Reading',
  done: 'Done',
};

export function SourceBadge({ source }: { source: SourceType }) {
  return (
    <span
      aria-label={`Source: ${SOURCE_LABELS[source]}`}
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sourceStyles[source]}`}
    >
      {SOURCE_LABELS[source]}
    </span>
  );
}

export function StatusBadge({ status, onClick }: { status: Status; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      className={`
        inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium
        min-h-[28px] min-w-[28px]
        ${statusStyles[status]}
        ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
      `}
      onClick={onClick}
      {...(onClick ? { 'aria-label': `Status: ${statusLabels[status]}. Click to advance.` } : {})}
    >
      {statusLabels[status]}
    </Tag>
  );
}
