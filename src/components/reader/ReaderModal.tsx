import { useState, useRef, useEffect, useCallback } from 'react';
import { X, BookOpen, Type } from 'lucide-react';
import { useReaderPrefs } from '../../hooks/useReaderPrefs';
import type { Bookmark, Status } from '../../types';
import { STATUS_NEXT } from '../../types';

interface ReaderModalProps {
  bookmark: Bookmark;
  open: boolean;
  onClose: () => void;
  onCycleStatus: (id: string, newStatus: Status) => void;
}

const FONT_SIZE_CLASSES = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
} as const;

const FONT_FAMILY_CLASSES = {
  sans: 'font-sans',
  serif: 'font-serif',
} as const;

// Approx. average reading speed in words per minute
const WPM = 238;

function getThemeClasses(theme: 'light' | 'dark' | 'sepia'): string {
  switch (theme) {
    case 'dark':
      return 'bg-surface-950 text-surface-100';
    case 'sepia':
      return 'bg-[#f9f5ed] text-[#433422]';
    default:
      return 'bg-white text-surface-900';
  }
}

function getHeaderThemeClasses(theme: 'light' | 'dark' | 'sepia'): string {
  switch (theme) {
    case 'dark':
      return 'bg-surface-950 border-surface-800 text-surface-100';
    case 'sepia':
      return 'bg-[#f0ebe0] border-[#d6ccb4] text-[#433422]';
    default:
      return 'bg-white border-surface-200 text-surface-900';
  }
}

export default function ReaderModal({ bookmark, open, onClose, onCycleStatus }: ReaderModalProps) {
  const { fontSize, fontFamily, theme, update } = useReaderPrefs();
  const [scrollProgress, setScrollProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  // Reset scroll when bookmark changes
  useEffect(() => {
    if (open && contentRef.current) {
      contentRef.current.scrollTop = 0;
      setScrollProgress(0);
    }
  }, [open, bookmark.id]);

  if (!open) return null;

  const contentText = bookmark.content?.text ?? '';
  const paragraphs = contentText.split(/\n{2,}/).filter(Boolean);
  const wordCount = bookmark.content?.word_count ?? 0;
  const readingTime =
    bookmark.content?.reading_time ?? (wordCount > 0 ? Math.ceil(wordCount / WPM) : null);
  const author = bookmark.content?.author;

  const wordsRemaining = Math.ceil((1 - scrollProgress) * wordCount);
  const minutesRemaining = wordCount > 0 ? Math.ceil(wordsRemaining / WPM) : null;

  function handleScroll() {
    const el = contentRef.current;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    if (scrollable <= 0) {
      setScrollProgress(1);
      return;
    }
    setScrollProgress(Math.min(el.scrollTop / scrollable, 1));
  }

  const themeClasses = getThemeClasses(theme);
  const headerThemeClasses = getHeaderThemeClasses(theme);
  const fontSizeClass = FONT_SIZE_CLASSES[fontSize];
  const fontFamilyClass = FONT_FAMILY_CLASSES[fontFamily];

  const statusNext = STATUS_NEXT[bookmark.status];

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col ${themeClasses}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Reading: ${bookmark.title ?? 'Article'}`}
    >
      {/* Progress bar */}
      <div className="h-0.5 w-full bg-transparent">
        <div
          className="h-full bg-primary-600 transition-all duration-150"
          style={{ width: `${scrollProgress * 100}%` }}
          aria-hidden="true"
        />
      </div>

      {/* Header */}
      <header
        className={`flex items-center justify-between gap-3 px-4 py-2 border-b ${headerThemeClasses} shrink-0`}
      >
        {/* Left: icon + title */}
        <div className="flex items-center gap-2 min-w-0">
          <BookOpen size={16} className="text-primary-600 shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium truncate max-w-[200px] sm:max-w-xs">
            {bookmark.title ?? 'Article'}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Font size */}
          <div className="flex items-center gap-0.5" aria-label="Font size">
            {(['sm', 'md', 'lg'] as const).map((size) => (
              <button
                key={size}
                onClick={() => update({ fontSize: size })}
                className={`px-1.5 py-1 rounded text-xs font-medium min-w-[28px] min-h-[36px] flex items-center justify-center transition-colors ${
                  fontSize === size
                    ? 'bg-primary-600 text-white'
                    : theme === 'dark'
                      ? 'text-surface-400 hover:bg-surface-800'
                      : 'text-surface-500 hover:bg-surface-100'
                }`}
                aria-label={`Font size ${size}`}
                aria-pressed={fontSize === size}
              >
                {size === 'sm' ? 'A' : size === 'md' ? 'A' : 'A'}
              </button>
            ))}
          </div>

          {/* Font family */}
          <button
            onClick={() => update({ fontFamily: fontFamily === 'sans' ? 'serif' : 'sans' })}
            className={`px-2 py-1 rounded text-xs font-medium min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors ${
              fontFamily === 'serif'
                ? 'bg-primary-600 text-white'
                : theme === 'dark'
                  ? 'text-surface-400 hover:bg-surface-800'
                  : 'text-surface-500 hover:bg-surface-100'
            }`}
            aria-label={`Font family: ${fontFamily === 'sans' ? 'switch to serif' : 'switch to sans-serif'}`}
            aria-pressed={fontFamily === 'serif'}
          >
            <Type size={13} />
          </button>

          {/* Theme swatches */}
          <div className="flex items-center gap-0.5 ml-1" aria-label="Reader theme">
            {(['light', 'dark', 'sepia'] as const).map((t) => (
              <button
                key={t}
                onClick={() => update({ theme: t })}
                className={`w-6 h-6 rounded-full border-2 transition-all min-w-[28px] min-h-[28px] flex items-center justify-center ${
                  theme === t ? 'border-primary-600 scale-110' : 'border-surface-300'
                }`}
                style={{
                  backgroundColor: t === 'light' ? '#ffffff' : t === 'dark' ? '#0a0a0f' : '#f9f5ed',
                }}
                aria-label={`${t} theme`}
                aria-pressed={theme === t}
              />
            ))}
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className={`ml-2 p-2 rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors ${
              theme === 'dark' ? 'hover:bg-surface-800' : 'hover:bg-surface-100'
            }`}
            aria-label="Close reader"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto" onScroll={handleScroll}>
        <div className={`max-w-2xl mx-auto px-6 py-10 ${fontSizeClass} ${fontFamilyClass}`}>
          {/* Article header */}
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-4">
            {bookmark.title ?? 'Untitled'}
          </h1>

          {/* Meta */}
          <div
            className={`flex flex-wrap gap-x-3 gap-y-1 text-sm mb-8 pb-6 border-b ${
              theme === 'dark'
                ? 'text-surface-400 border-surface-800'
                : theme === 'sepia'
                  ? 'text-[#7a6a55] border-[#d6ccb4]'
                  : 'text-surface-500 border-surface-200'
            }`}
          >
            {author && <span>{author}</span>}
            {readingTime && <span>{readingTime} min read</span>}
            {wordCount > 0 && <span>{wordCount.toLocaleString()} words</span>}
          </div>

          {/* Paragraphs */}
          {paragraphs.length > 0 ? (
            <div className="space-y-4 leading-relaxed">
              {paragraphs.map((para, i) => (
                <p key={i}>
                  {para.split('\n').map((line, j, arr) => (
                    <span key={j}>
                      {line}
                      {j < arr.length - 1 && <br />}
                    </span>
                  ))}
                </p>
              ))}
            </div>
          ) : (
            <p
              className={`text-center py-12 ${theme === 'dark' ? 'text-surface-500' : 'text-surface-400'}`}
            >
              No extracted content available.
            </p>
          )}

          {/* Bottom padding for footer */}
          <div className="h-16" />
        </div>
      </div>

      {/* Footer */}
      <footer
        className={`flex items-center justify-between px-4 py-2 border-t ${headerThemeClasses} shrink-0`}
      >
        <span
          className={`text-xs ${theme === 'dark' ? 'text-surface-500' : theme === 'sepia' ? 'text-[#7a6a55]' : 'text-surface-400'}`}
        >
          {minutesRemaining !== null && minutesRemaining > 0
            ? `${minutesRemaining} min remaining`
            : wordCount > 0
              ? 'Finished'
              : ''}
        </span>

        {bookmark.status !== 'done' ? (
          <button
            onClick={() => onCycleStatus(bookmark.id, statusNext)}
            className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 min-h-[36px] transition-colors"
          >
            {bookmark.status === 'unread' ? 'Start Reading' : 'Mark Done'}
          </button>
        ) : (
          <span className="text-xs font-medium text-green-600 dark:text-green-400">✓ Done</span>
        )}
      </footer>
    </div>
  );
}
