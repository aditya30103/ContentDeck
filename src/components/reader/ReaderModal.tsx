import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { X, BookOpen, Type, RotateCw, ExternalLink, AlertCircle, ArrowDown } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useReaderPrefs } from '../../hooks/useReaderPrefs';
import { useReaderProgress, RESUME_THRESHOLD } from '../../hooks/useReaderProgress';
import type { Bookmark, Status } from '../../types';
import { STATUS_NEXT } from '../../types';
import {
  SPRING_SHEET,
  SWIPE_DISMISS_OFFSET,
  SWIPE_DISMISS_VELOCITY,
  REDUCED_MOTION_TRANSITION,
} from '../../lib/motion';

interface ReaderModalProps {
  bookmark: Bookmark;
  open: boolean;
  onClose: () => void;
  onCycleStatus: (id: string, newStatus: Status) => void;
  onRetryExtraction?: (bookmark: Bookmark) => Promise<void>;
}

const FONT_SIZE_CLASSES = {
  sm: 'prose-sm',
  md: 'prose-base',
  lg: 'prose-lg',
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

function getSubtleTextClass(theme: 'light' | 'dark' | 'sepia'): string {
  switch (theme) {
    case 'dark':
      return 'text-surface-400';
    case 'sepia':
      return 'text-[#7a6a55]';
    default:
      return 'text-surface-500';
  }
}

function getDividerClass(theme: 'light' | 'dark' | 'sepia'): string {
  switch (theme) {
    case 'dark':
      return 'border-surface-800';
    case 'sepia':
      return 'border-[#d6ccb4]';
    default:
      return 'border-surface-200';
  }
}

// Allow-list — must match the edge function's server-side sanitizer.
// Client-side sanitization is defence-in-depth: stored HTML is already
// safe, but we re-sanitize in case of migration accidents or manual edits.
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'br',
    'hr',
    'strong',
    'em',
    'b',
    'i',
    'u',
    'sup',
    'sub',
    'ul',
    'ol',
    'li',
    'blockquote',
    'a',
    'img',
    'figure',
    'figcaption',
    'pre',
    'code',
    'table',
    'thead',
    'tbody',
    'tr',
    'td',
    'th',
    'div',
    'span',
  ],
  ALLOWED_ATTR: [
    'href',
    'title',
    'src',
    'alt',
    'width',
    'height',
    'target',
    'rel',
    'class',
    'colspan',
    'rowspan',
    'scope',
  ],
  ALLOW_DATA_ATTR: false,
  RETURN_TRUSTED_TYPE: false,
};

// Register DOMPurify hook at module scope — DOMPurify is a global singleton,
// so hooks persist across all sanitize() calls. Registering here (not in
// useEffect) guarantees the hook is active before the component's first
// useMemo sanitization runs.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('href')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
  if (node.tagName === 'IMG') {
    node.setAttribute('loading', 'lazy');
    node.setAttribute('decoding', 'async');
  }
});

export default function ReaderModal({
  bookmark,
  open,
  onClose,
  onCycleStatus,
  onRetryExtraction,
}: ReaderModalProps) {
  const { fontSize, fontFamily, theme, update } = useReaderPrefs();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const {
    savedProgress,
    write: writeProgress,
    clear: clearProgress,
  } = useReaderProgress(bookmark.id);
  const [showResumePill, setShowResumePill] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

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
      // Push a history entry so the PWA back gesture closes the reader
      // instead of navigating away from the app.
      history.pushState({ reader: true }, '');
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  // Intercept browser/PWA back gesture while reader is open.
  useEffect(() => {
    if (!open) return;
    const handlePopState = () => onClose();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [open, onClose]);

  // Reset scroll when bookmark changes.
  // If we have a saved position > threshold, surface a Resume pill instead
  // of auto-scrolling (feels less jarring than teleporting into the middle
  // of an article). Tap-to-resume calls jumpToSavedProgress().
  useEffect(() => {
    if (open && contentRef.current) {
      contentRef.current.scrollTop = 0;
      setScrollProgress(0);
      setShowResumePill(savedProgress > RESUME_THRESHOLD && savedProgress < 1);
    }
  }, [open, bookmark.id, savedProgress]);

  // When the user marks the bookmark done, the reading position is no
  // longer relevant — clear the saved progress so future opens start fresh.
  useEffect(() => {
    if (bookmark.status === 'done') {
      clearProgress();
    }
  }, [bookmark.status, clearProgress]);

  const contentHtml = bookmark.content?.html ?? '';
  const contentText = bookmark.content?.text ?? '';
  const wordCount = bookmark.content?.word_count ?? 0;
  const readingTime =
    bookmark.content?.reading_time ?? (wordCount > 0 ? Math.ceil(wordCount / WPM) : null);
  const author = bookmark.content?.author;

  // Client-side re-sanitization of stored HTML (defence-in-depth).
  // Anchors get target=_blank + rel=noopener via DOMPurify hook below.
  const sanitizedHtml = useMemo(() => {
    if (!contentHtml) return '';
    return String(DOMPurify.sanitize(contentHtml, PURIFY_CONFIG));
  }, [contentHtml]);

  // Fallback paragraphs for bookmarks extracted before content.html existed.
  const textParagraphs = useMemo(() => {
    if (sanitizedHtml) return [];
    if (!contentText.trim()) return [];
    return contentText
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
  }, [sanitizedHtml, contentText]);

  const hasContent = sanitizedHtml.length > 0 || textParagraphs.length > 0;

  const wordsRemaining = Math.ceil((1 - scrollProgress) * wordCount);
  const minutesRemaining = wordCount > 0 ? Math.ceil(wordsRemaining / WPM) : null;

  function handleScroll() {
    const el = contentRef.current;
    if (!el) return;
    // User scrolled — dismiss the resume pill (they've engaged with the article).
    if (showResumePill) setShowResumePill(false);
    const scrollable = el.scrollHeight - el.clientHeight;
    if (scrollable <= 0) {
      setScrollProgress(1);
      writeProgress(1);
      return;
    }
    const pct = Math.min(el.scrollTop / scrollable, 1);
    setScrollProgress(pct);
    writeProgress(pct);
  }

  function jumpToSavedProgress() {
    const el = contentRef.current;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    if (scrollable <= 0) return;
    el.scrollTop = scrollable * savedProgress;
    setShowResumePill(false);
  }

  async function handleRetry() {
    if (!onRetryExtraction || isRetrying) return;
    setIsRetrying(true);
    try {
      await onRetryExtraction(bookmark);
    } catch {
      // Toast surfaced by the hook — swallow here to avoid double-report.
    } finally {
      setIsRetrying(false);
    }
  }

  const themeClasses = getThemeClasses(theme);
  const headerThemeClasses = getHeaderThemeClasses(theme);
  const subtleText = getSubtleTextClass(theme);
  const divider = getDividerClass(theme);
  const fontSizeClass = FONT_SIZE_CLASSES[fontSize];
  const fontFamilyClass = FONT_FAMILY_CLASSES[fontFamily];

  const statusNext = STATUS_NEXT[bookmark.status];

  // Font size button labels — visually different sizes
  const fontSizeLabels: Record<'sm' | 'md' | 'lg', string> = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const transition = shouldReduceMotion ? REDUCED_MOTION_TRANSITION : SPRING_SHEET;

  return (
    <motion.div
      data-reader-theme={theme}
      className={`fixed inset-0 z-[60] flex flex-col ${themeClasses}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Reading: ${bookmark.title ?? 'Article'}`}
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={transition}
      drag="x"
      dragDirectionLock
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0.05, right: 0.3 }}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        if (info.offset.x > SWIPE_DISMISS_OFFSET || info.velocity.x > SWIPE_DISMISS_VELOCITY) {
          // Clean up the history entry that was pushed on open
          const state = history.state as Record<string, unknown> | null;
          if (state?.reader) history.back();
          onClose();
        }
      }}
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
          {/* Font size — visually distinct A labels */}
          <div className="flex items-center gap-0.5" aria-label="Font size">
            {(['sm', 'md', 'lg'] as const).map((size) => (
              <button
                key={size}
                onClick={() => update({ fontSize: size })}
                className={`px-1.5 rounded min-w-[28px] min-h-[36px] flex items-center justify-center transition-colors font-semibold ${fontSizeLabels[size]} ${
                  fontSize === size
                    ? 'bg-primary-600 text-white'
                    : theme === 'dark'
                      ? 'text-surface-400 hover:bg-surface-800'
                      : 'text-surface-500 hover:bg-surface-100'
                }`}
                aria-label={`Font size ${size}`}
                aria-pressed={fontSize === size}
              >
                A
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
      <div ref={contentRef} className="flex-1 overflow-y-auto relative" onScroll={handleScroll}>
        {/* Resume pill — shown when stored scroll > threshold (Phase 2F) */}
        {showResumePill && (
          <button
            onClick={jumpToSavedProgress}
            className="sticky top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-600 text-white text-xs font-medium shadow-lg hover:bg-primary-700 min-h-[36px] transition-colors motion-safe:animate-[fadeSlideUp_.25s_ease-out]"
            aria-label={`Resume from ${Math.round(savedProgress * 100)} percent`}
          >
            <ArrowDown size={14} />
            Resume from {Math.round(savedProgress * 100)}%
          </button>
        )}

        <div className={`max-w-prose mx-auto px-6 py-10 ${fontFamilyClass}`}>
          {/* Article title */}
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-4">
            {bookmark.title ?? 'Untitled'}
          </h1>

          {/* Meta */}
          <div
            className={`flex flex-wrap gap-x-3 gap-y-1 text-sm mb-8 pb-6 border-b ${subtleText} ${divider}`}
          >
            {author && <span>{author}</span>}
            {readingTime && <span>{readingTime} min read</span>}
            {wordCount > 0 && <span>{wordCount.toLocaleString()} words</span>}
          </div>

          {/* Partial-extraction banner (Phase 2E) */}
          {bookmark.content_status === 'partial' && (
            <div
              className={`flex items-start gap-2 mb-6 p-3 rounded-lg border ${divider} ${subtleText} text-sm`}
              role="status"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Full article could not be extracted — showing excerpt only.{' '}
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-primary-600 hover:text-primary-700"
                >
                  Open original
                </a>
                .
              </span>
            </div>
          )}

          {/* State-based rendering */}
          {bookmark.content_status === 'extracting' || bookmark.content_status === 'pending' ? (
            <div className={`text-center py-16 ${subtleText}`} role="status">
              <div className="inline-block w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full motion-safe:animate-spin mb-4" />
              <p className="text-sm">Extracting content…</p>
            </div>
          ) : bookmark.content_status === 'failed' ||
            (bookmark.content_status === 'skipped' &&
              !sanitizedHtml &&
              textParagraphs.length === 0) ? (
            <div className={`text-center py-12 ${subtleText}`} role="status">
              <AlertCircle size={32} className="mx-auto mb-3 opacity-60" aria-hidden="true" />
              <p className="text-sm mb-1">
                {bookmark.content_status === 'skipped'
                  ? 'Content extraction is not supported for this source.'
                  : 'We could not extract this article.'}
              </p>
              <p className="text-xs opacity-70 mb-5">
                Some sites block scrapers, require login, or render content in JavaScript.
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {bookmark.content_status === 'failed' && onRetryExtraction && (
                  <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed min-h-[36px] transition-colors"
                  >
                    <RotateCw size={14} className={isRetrying ? 'motion-safe:animate-spin' : ''} />
                    {isRetrying ? 'Retrying…' : 'Retry extraction'}
                  </button>
                )}
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium min-h-[36px] transition-colors ${divider} hover:bg-surface-100 dark:hover:bg-surface-800`}
                >
                  <ExternalLink size={14} />
                  Open original
                </a>
              </div>
            </div>
          ) : sanitizedHtml ? (
            <div
              className={`prose prose-reader ${fontSizeClass} max-w-none`}
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          ) : textParagraphs.length > 0 ? (
            <div className={`prose prose-reader ${fontSizeClass} max-w-none`}>
              {textParagraphs.map((para, i) => (
                <p key={`para-${i}`}>
                  {para.split('\n').map((line, j, arr) => (
                    <span key={`line-${j}`}>
                      {line}
                      {j < arr.length - 1 && <br />}
                    </span>
                  ))}
                </p>
              ))}
            </div>
          ) : (
            <p className={`text-center py-12 ${subtleText}`}>No extracted content available.</p>
          )}

          {/* Truncation notice (Phase 2D) */}
          {bookmark.content?.truncated && hasContent && (
            <div
              className={`mt-8 pt-4 border-t ${divider} text-xs text-center ${subtleText}`}
              role="note"
            >
              This article was truncated to keep it snappy.{' '}
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-primary-600 hover:text-primary-700"
              >
                Open original
              </a>{' '}
              to read the full text.
            </div>
          )}

          {/* Bottom padding for footer */}
          <div className="h-16" />
        </div>
      </div>

      {/* Footer */}
      <footer
        className={`flex items-center justify-between px-4 py-2 border-t ${headerThemeClasses} shrink-0`}
      >
        <span className={`text-xs ${subtleText}`}>
          {hasContent && minutesRemaining !== null && minutesRemaining > 0
            ? `${minutesRemaining} min remaining`
            : hasContent && wordCount > 0
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
    </motion.div>
  );
}
