import { X, Trash2, CheckCircle, BookOpen, Inbox } from 'lucide-react';
import Button from '../ui/Button';
import type { Status } from '../../types';

interface BulkActionBarProps {
  selectedCount: number;
  onChangeStatus: (status: Status) => void;
  onDelete: () => void;
  onCancel: () => void;
}

export default function BulkActionBar({
  selectedCount,
  onChangeStatus,
  onDelete,
  onCancel,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-[44px] lg:bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-900 dark:bg-surface-100 text-white dark:text-surface-900 shadow-xl">
      <span className="text-sm font-medium mr-2">{selectedCount} selected</span>

      <button
        onClick={() => onChangeStatus('unread')}
        className="p-2 rounded-lg hover:bg-white/10 dark:hover:bg-black/10 min-w-[36px] min-h-[36px] flex items-center justify-center"
        aria-label="Mark as unread"
        title="Mark as unread"
      >
        <Inbox size={18} />
      </button>
      <button
        onClick={() => onChangeStatus('reading')}
        className="p-2 rounded-lg hover:bg-white/10 dark:hover:bg-black/10 min-w-[36px] min-h-[36px] flex items-center justify-center"
        aria-label="Mark as reading"
        title="Mark as reading"
      >
        <BookOpen size={18} />
      </button>
      <button
        onClick={() => onChangeStatus('done')}
        className="p-2 rounded-lg hover:bg-white/10 dark:hover:bg-black/10 min-w-[36px] min-h-[36px] flex items-center justify-center"
        aria-label="Mark as done"
        title="Mark as done"
      >
        <CheckCircle size={18} />
      </button>

      <div className="w-px h-6 bg-white/20 dark:bg-black/20 mx-1" />

      <button
        onClick={onDelete}
        className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 dark:text-red-500 min-w-[36px] min-h-[36px] flex items-center justify-center"
        aria-label="Delete selected"
        title="Delete selected"
      >
        <Trash2 size={18} />
      </button>

      <Button variant="ghost" onClick={onCancel} className="text-white dark:text-surface-900 ml-1">
        <X size={16} />
      </Button>
    </div>
  );
}
