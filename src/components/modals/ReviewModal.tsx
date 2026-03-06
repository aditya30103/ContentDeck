import { RotateCcw, CheckCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import { getReflectionNote, getReviewState } from '../../lib/spaced-review';
import type { Bookmark } from '../../types';

interface ReviewModalProps {
  open: boolean;
  bookmark: Bookmark | null;
  onResonates: () => void;
  onLostThread: () => void;
  onClose: () => void;
}

function daysSince(isoString: string | null): number {
  if (!isoString) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 86_400_000));
}

function timeLabel(isoString: string | null): string {
  const d = daysSince(isoString);
  if (d === 0) return 'Earlier today';
  if (d === 1) return 'Yesterday';
  return `${d} days ago`;
}

export default function ReviewModal({
  open,
  bookmark,
  onResonates,
  onLostThread,
  onClose,
}: ReviewModalProps) {
  if (!bookmark) return null;

  const reflectionNote = getReflectionNote(bookmark);
  const { repetitions } = getReviewState(bookmark);
  const anchor = bookmark.last_reviewed_at ?? bookmark.finished_at;

  return (
    <Modal open={open} onClose={onClose} title="Review" size="sm">
      {/* Subtitle */}
      <p className="text-sm text-surface-500 dark:text-surface-400 mb-4 line-clamp-1">
        {bookmark.title ?? bookmark.url}
      </p>

      {/* Framing */}
      <p className="text-xs font-medium text-surface-400 uppercase tracking-wide mb-2">
        {timeLabel(anchor)} you wrote
      </p>

      {/* Reflection quote */}
      <blockquote className="border-l-2 border-primary-400 dark:border-primary-600 pl-3 mb-5 text-surface-800 dark:text-surface-200 text-sm italic leading-relaxed">
        {reflectionNote ?? 'No reflection note saved.'}
      </blockquote>

      <p className="text-sm text-surface-600 dark:text-surface-400 mb-5">
        Does this still feel right?
      </p>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onLostThread}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors focus-visible:ring-2 min-h-[44px]"
        >
          <RotateCcw size={14} />
          Lost the thread
        </button>
        <button
          type="button"
          onClick={onResonates}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors focus-visible:ring-2 min-h-[44px]"
        >
          <CheckCircle size={14} />
          Still resonates
        </button>
      </div>

      {/* Review count */}
      {repetitions > 0 && (
        <p className="text-xs text-surface-400 text-center mt-3">
          Reviewed {repetitions} time{repetitions === 1 ? '' : 's'}
        </p>
      )}
    </Modal>
  );
}
