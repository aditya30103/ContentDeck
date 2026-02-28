import { useState, useRef, useEffect } from 'react';
import Button from '../ui/Button';
import type { NoteType } from '../../types';

interface NoteComposerProps {
  onAddNote: (type: NoteType, content: string) => void;
  isPending: boolean;
}

const NOTE_TYPES: { type: NoteType; emoji: string; label: string }[] = [
  { type: 'insight', emoji: '💡', label: 'Insight' },
  { type: 'question', emoji: '❓', label: 'Question' },
  { type: 'highlight', emoji: '🖍️', label: 'Highlight' },
  { type: 'note', emoji: '📝', label: 'Note' },
];

export default function NoteComposer({ onAddNote, isPending }: NoteComposerProps) {
  const [type, setType] = useState<NoteType>('note');
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [content]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    onAddNote(type, content.trim());
    setContent('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {/* Type toggles */}
      <div className="flex flex-wrap gap-1.5">
        {NOTE_TYPES.map(({ type: t, emoji, label }) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[32px] ${
              type === t
                ? 'bg-primary-600/10 text-primary-600 dark:text-primary-400 ring-1 ring-primary-500/30'
                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
            }`}
          >
            <span>{emoji}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your thought..."
        rows={2}
        className="w-full px-3 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-base text-surface-900 dark:text-surface-100 placeholder:text-surface-400 resize-none min-h-[60px]"
      />

      {/* Submit */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-surface-400">Ctrl+Enter to save</span>
        <Button type="submit" disabled={!content.trim() || isPending}>
          {isPending ? 'Saving...' : 'Add Note'}
        </Button>
      </div>
    </form>
  );
}
