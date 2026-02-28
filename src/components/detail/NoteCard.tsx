import { Trash2 } from 'lucide-react';
import { timeAgo } from '../../lib/utils';
import type { NoteType } from '../../types';

interface NoteCardProps {
  type: NoteType;
  content: string;
  createdAt: string;
  onDelete: () => void;
}

const NOTE_CONFIG: Record<NoteType, { emoji: string; label: string; color: string; bg: string }> = {
  insight: {
    emoji: '💡',
    label: 'Insight',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
  },
  question: {
    emoji: '❓',
    label: 'Question',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
  },
  highlight: {
    emoji: '🖍️',
    label: 'Highlight',
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-500/10 border-green-500/20',
  },
  note: {
    emoji: '📝',
    label: 'Note',
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-500/10 border-indigo-500/20',
  },
  reflection: {
    emoji: '🪞',
    label: 'Reflection',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
  },
};

export default function NoteCard({ type, content, createdAt, onDelete }: NoteCardProps) {
  const config = NOTE_CONFIG[type];

  return (
    <div className={`group relative p-3 rounded-lg border ${config.bg}`}>
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-sm">{config.emoji}</span>
        <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
        <span className="text-xs text-surface-400 dark:text-surface-500 ml-auto">
          {timeAgo(createdAt)}
        </span>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-surface-400 hover:text-red-500 transition-opacity min-w-[24px] min-h-[24px] flex items-center justify-center"
          aria-label="Delete note"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Content */}
      <p className="text-sm text-surface-800 dark:text-surface-200 whitespace-pre-wrap leading-relaxed">
        {content}
      </p>
    </div>
  );
}
