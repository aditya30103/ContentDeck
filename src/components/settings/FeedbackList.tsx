import { useState } from 'react';
import { MessageSquare, Bug, Lightbulb, HelpCircle } from 'lucide-react';
import { useFeedback } from '../../hooks/useFeedback';
import type { FeedbackItem, FeedbackStatus, FeedbackType } from '../../types';

const isDemo = () => localStorage.getItem('contentdeck_demo') === 'true';

const TYPE_ICON: Record<FeedbackType, React.ElementType> = {
  bug: Bug,
  suggestion: Lightbulb,
  other: HelpCircle,
};

const SEVERITY_BADGE: Record<string, string> = {
  blocking: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  major: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  minor: 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400',
  polish: 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400',
};

const STATUS_BADGE: Record<FeedbackStatus, string> = {
  open: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  investigating: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  resolved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  wont_fix: 'bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-500',
};

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: 'Open',
  investigating: 'Investigating',
  resolved: 'Resolved',
  wont_fix: "Won't Fix",
};

type Filter = 'all' | 'open' | 'resolved';

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-surface-200 dark:border-surface-700 p-3 space-y-2 animate-pulse">
      <div className="h-4 bg-surface-200 dark:bg-surface-700 rounded w-3/4" />
      <div className="h-3 bg-surface-100 dark:bg-surface-800 rounded w-1/2" />
    </div>
  );
}

function FeedbackCard({ item }: { item: FeedbackItem }) {
  const { updateStatus } = useFeedback();
  const [resolutionNote, setResolutionNote] = useState(item.resolution_note ?? '');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const Icon = TYPE_ICON[item.feedback_type];

  function handleStatusChange(newStatus: FeedbackStatus) {
    if (newStatus === 'resolved' || newStatus === 'wont_fix') {
      setShowNoteInput(true);
    } else {
      setShowNoteInput(false);
      updateStatus.mutate({ id: item.id, status: newStatus });
    }
  }

  function handleNoteSubmit() {
    updateStatus.mutate({
      id: item.id,
      status: showNoteInput
        ? (((document.getElementById(`status-select-${item.id}`) as HTMLSelectElement | null)
            ?.value as FeedbackStatus) ?? item.status)
        : item.status,
      resolution_note: resolutionNote || undefined,
    });
    setShowNoteInput(false);
  }

  const date = new Date(item.created_at).toLocaleDateString();

  return (
    <div className="rounded-lg border border-surface-200 dark:border-surface-700 p-3 space-y-2">
      {/* Header */}
      <div className="flex items-start gap-2">
        <Icon size={16} className="text-surface-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-surface-900 dark:text-surface-100 leading-snug">
            {item.title}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="text-xs text-surface-400 dark:text-surface-500">{date}</span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_BADGE[item.status]}`}
            >
              {STATUS_LABELS[item.status]}
            </span>
            {item.feedback_type === 'bug' && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${SEVERITY_BADGE[item.severity] ?? ''}`}
              >
                {item.severity}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {item.description && (
        <p className="text-xs text-surface-500 dark:text-surface-400 line-clamp-2 pl-6">
          {item.description}
        </p>
      )}

      {/* Inline context fields */}
      <div className="pl-6 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-surface-400 dark:text-surface-500">
        {item.app_context.viewMode && <span>View: {item.app_context.viewMode}</span>}
        {item.app_context.statusFilter && item.app_context.statusFilter !== 'all' && (
          <span>Filter: {item.app_context.statusFilter}</span>
        )}
        {item.app_context.activeBookmarkTitle && (
          <span className="truncate max-w-[200px]">
            Bookmark: {item.app_context.activeBookmarkTitle}
          </span>
        )}
      </div>

      {/* Status change */}
      <div className="pl-6 flex items-center gap-2">
        <label
          htmlFor={`status-select-${item.id}`}
          className="text-xs text-surface-500 dark:text-surface-400 sr-only"
        >
          Change status
        </label>
        <select
          id={`status-select-${item.id}`}
          value={item.status}
          onChange={(e) => handleStatusChange(e.target.value as FeedbackStatus)}
          className="text-xs px-2 py-1 rounded border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 min-h-[32px]"
        >
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="wont_fix">Won't Fix</option>
        </select>
      </div>

      {/* Resolution note input */}
      {showNoteInput && (
        <div className="pl-6 space-y-2">
          <input
            type="text"
            placeholder="Resolution note (optional)"
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            className="w-full text-xs px-2.5 py-1.5 rounded border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 min-h-[36px]"
          />
          <div className="flex gap-2">
            <button
              onClick={handleNoteSubmit}
              className="text-xs px-3 py-1.5 rounded bg-primary-600 hover:bg-primary-700 text-white min-h-[32px]"
            >
              Save
            </button>
            <button
              onClick={() => setShowNoteInput(false)}
              className="text-xs px-3 py-1.5 rounded bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-600 dark:text-surface-400 min-h-[32px]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Resolution note display */}
      {item.resolution_note && !showNoteInput && (
        <p className="pl-6 text-xs text-surface-400 dark:text-surface-500 italic">
          Note: {item.resolution_note}
        </p>
      )}
    </div>
  );
}

export default function FeedbackList() {
  const { feedbackItems, isLoading } = useFeedback();
  const [filter, setFilter] = useState<Filter>('all');

  if (isDemo()) {
    return (
      <div className="rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30 p-4">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Sign in to use the feedback system.
        </p>
      </div>
    );
  }

  const filtered = feedbackItems.filter((item) => {
    if (filter === 'open') return item.status === 'open' || item.status === 'investigating';
    if (filter === 'resolved') return item.status === 'resolved' || item.status === 'wont_fix';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-1 bg-surface-100 dark:bg-surface-800 rounded-lg p-1">
        {(['all', 'open', 'resolved'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors min-h-[36px] capitalize
              ${
                filter === f
                  ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 shadow-sm'
                  : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300'
              }`}
          >
            {f === 'all' ? 'All' : f === 'open' ? 'Open' : 'Resolved'}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-surface-400 dark:text-surface-500">
          <MessageSquare size={32} strokeWidth={1.5} />
          <p className="text-sm">No feedback yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <FeedbackCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
