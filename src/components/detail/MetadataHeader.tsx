import {
  Heart,
  ExternalLink,
  Clock,
  FileText,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { SourceBadge, StatusBadge } from '../ui/Badge';
import { getDomain, getFaviconUrl, timeAgo, formatDate } from '../../lib/utils';
import type { Bookmark, Status } from '../../types';
import { STATUS_NEXT } from '../../types';

interface MetadataHeaderProps {
  bookmark: Bookmark;
  onCycleStatus: (id: string, newStatus: Status) => void;
  onToggleFavorite: (id: string, favorited: boolean) => void;
  onRefreshMetadata: (bookmark: Bookmark) => void;
  isRefreshing?: boolean;
}

export default function MetadataHeader({
  bookmark: b,
  onCycleStatus,
  onToggleFavorite,
  onRefreshMetadata,
  isRefreshing,
}: MetadataHeaderProps) {
  const domain = getDomain(b.url);

  return (
    <div className="space-y-3">
      {/* Image */}
      {b.image && (
        <div className="w-full h-40 rounded-lg overflow-hidden bg-surface-100 dark:bg-surface-800">
          <img src={b.image} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}

      {/* Title */}
      <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100 leading-snug">
        {b.title || b.url}
      </h2>

      {/* Domain row */}
      <div className="flex items-center gap-2 text-sm text-surface-500 dark:text-surface-400">
        <img src={getFaviconUrl(b.url)} alt="" className="w-4 h-4" loading="lazy" />
        <span>{domain}</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => onRefreshMetadata(b)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1 text-surface-400 hover:text-primary-600 dark:hover:text-primary-400 text-xs font-medium disabled:opacity-50 min-w-[32px] min-h-[32px] justify-center"
            aria-label="Refresh metadata"
            title="Refresh metadata"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <a
            href={b.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline text-xs font-medium"
          >
            Open <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Badges + Actions row */}
      <div className="flex items-center gap-2 flex-wrap">
        <SourceBadge source={b.source_type} />
        <StatusBadge status={b.status} onClick={() => onCycleStatus(b.id, STATUS_NEXT[b.status])} />
        <button
          onClick={() => onToggleFavorite(b.id, !b.is_favorited)}
          className={`p-1.5 rounded-lg transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center ${
            b.is_favorited
              ? 'text-amber-500 bg-amber-500/10'
              : 'text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
          }`}
          aria-label={b.is_favorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart size={16} fill={b.is_favorited ? 'currentColor' : 'none'} />
        </button>

        {b.synced && (
          <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Synced
          </span>
        )}

        {b.content_status === 'extracting' && (
          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
            <Loader2 size={12} className="animate-spin" />
            Extracting...
          </span>
        )}

        {b.content_status === 'success' && b.content?.word_count && (
          <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
            <FileText size={12} />
            {b.content.word_count.toLocaleString()} words extracted
          </span>
        )}

        {b.content_status === 'failed' && (
          <button
            onClick={() => onRefreshMetadata(b)}
            disabled={isRefreshing}
            className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1 hover:underline disabled:opacity-50"
          >
            <AlertCircle size={12} />
            Extract failed — retry
          </button>
        )}
      </div>

      {/* Meta stats */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-surface-400 dark:text-surface-500">
        <span>Added {timeAgo(b.created_at)}</span>
        <span title={formatDate(b.created_at)}>{formatDate(b.created_at)}</span>
        {b.metadata?.reading_time && (
          <span className="flex items-center gap-1">
            <Clock size={12} /> {b.metadata.reading_time} min read
          </span>
        )}
        {b.metadata?.word_count && (
          <span className="flex items-center gap-1">
            <FileText size={12} /> {b.metadata.word_count.toLocaleString()} words
          </span>
        )}
        {b.metadata?.duration && <span>{b.metadata.duration}</span>}
        {b.metadata?.channel && <span>{b.metadata.channel}</span>}
      </div>

      {/* Tags */}
      {b.tags && b.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {b.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full text-xs bg-primary-600/10 text-primary-600 dark:text-primary-400 font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Excerpt */}
      {b.excerpt && (
        <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
          {b.excerpt}
        </p>
      )}
    </div>
  );
}
