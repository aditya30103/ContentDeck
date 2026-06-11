import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Settings, ArrowRight, ExternalLink, PlayCircle, Zap, BookMarked } from 'lucide-react';
import { useTagAreas } from '../hooks/useTagAreas';
import { useUserValues } from '../hooks/useUserValues';
import { useScoring } from '../hooks/useScoring';
import { useBookmarks } from '../hooks/useBookmarks';
import { useSpacedReview } from '../hooks/useSpacedReview';
import { getReadingMinutes } from '../lib/scoring';
import { isBookWithoutUrl } from '../lib/utils';
import { SourceBadge } from '../components/ui/Badge';
import SettingsModal from '../components/modals/SettingsModal';
import ValuesOnboardingModal from '../components/modals/ValuesOnboardingModal';
import ReflectionModal from '../components/modals/ReflectionModal';
import ReviewModal from '../components/modals/ReviewModal';
import { getReflectionNote, nextReviewState } from '../lib/spaced-review';
import type { MoodMode, UserValues } from '../types/scoring';
import type { Bookmark } from '../types';

// ---------------------------------------------------------------------------
// Module-level pure helpers
// ---------------------------------------------------------------------------

function getGreeting(h: number): string {
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getGreetingEmoji(h: number): string {
  if (h < 12) return '🌅';
  if (h < 17) return '☀️';
  return '🌙';
}

function getContextLabel(h: number, mood: MoodMode): string {
  if (mood === 'deep-dive') return 'DEEP DIVE PICK';
  if (mood === 'light-read') return 'LIGHT READ PICK';
  if (mood === 'quick-win') return 'QUICK WIN PICK';
  if (mood === 'shuffle') return 'SHUFFLE PICK';
  if (h < 12) return "THIS MORNING'S PICK";
  if (h < 17) return "THIS AFTERNOON'S PICK";
  return "TONIGHT'S PICK";
}

function getFirstName(email: string | null): string {
  if (!email) return '';
  const local = email.split('@')[0] ?? '';
  const part = local.split(/[._-]/)[0] ?? '';
  return part.charAt(0).toUpperCase() + part.slice(1);
}

const SOURCE_ACCENT: Record<string, string> = {
  youtube: 'var(--color-source-youtube)',
  twitter: 'var(--color-source-twitter)',
  linkedin: 'var(--color-source-linkedin)',
  substack: 'var(--color-source-substack)',
  blog: 'var(--color-source-blog)',
  book: 'var(--color-source-book)',
  arxiv: 'var(--color-source-arxiv)',
};

// When a non-default mood is active, override the pick card accent color.
const MOOD_ACCENT: Partial<Record<MoodMode, string>> = {
  'deep-dive': '#f59e0b', // amber  — focused, intense
  'light-read': '#10b981', // emerald — easy, refreshing
  'quick-win': '#22c55e', // green  — fast, satisfying
  shuffle: '#8b5cf6', // violet — playful, random
  // 'default' intentionally omitted — source color is used
};

const MOODS: Array<{ value: MoodMode; icon: string; label: string }> = [
  { value: 'default', icon: '🧠', label: 'Smart' },
  { value: 'deep-dive', icon: '🔥', label: 'Deep' },
  { value: 'light-read', icon: '📖', label: 'Light' },
  { value: 'quick-win', icon: '⚡', label: 'Quick' },
  { value: 'shuffle', icon: '🎲', label: 'Shuffle' },
];

// ---------------------------------------------------------------------------
// HomeHeader
// ---------------------------------------------------------------------------

interface HomeHeaderProps {
  userEmail: string | null;
  now: Date;
  onOpenSettings: () => void;
}

function HomeHeader({ userEmail, now, onOpenSettings }: HomeHeaderProps) {
  const h = now.getHours();
  const firstName = getFirstName(userEmail);
  const timeStr = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <p className="text-xl font-semibold text-surface-900 dark:text-surface-100">
          {getGreetingEmoji(h)} {getGreeting(h)}
          {firstName ? `, ${firstName}` : ''}
        </p>
        <p className="text-sm text-surface-400 mt-0.5">{timeStr}</p>
      </div>
      <button
        onClick={onOpenSettings}
        aria-label="Open settings"
        className="p-2 rounded-lg text-surface-500 hover:text-surface-900 dark:hover:text-surface-100 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors focus-visible:ring-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <Settings size={20} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PrimaryPickCard
// ---------------------------------------------------------------------------

interface PrimaryPickCardProps {
  topPick: { bookmark: Bookmark; reason: string } | null;
  isLoading: boolean;
  now: Date;
  mood: MoodMode;
  onStartReading: (b: Bookmark) => void;
  moodAccentOverride: string | null;
}

function PrimaryPickCard({
  topPick,
  isLoading,
  now,
  mood,
  onStartReading,
  moodAccentOverride,
}: PrimaryPickCardProps) {
  const h = now.getHours();
  const contextLabel = getContextLabel(h, mood);

  if (isLoading) {
    return (
      <div className="relative rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 p-5 mb-4 overflow-hidden animate-pulse">
        <div className="h-3 w-32 bg-surface-200 dark:bg-surface-700 rounded mb-3" />
        <div className="h-5 bg-surface-200 dark:bg-surface-700 rounded mb-2" />
        <div className="h-5 w-3/4 bg-surface-200 dark:bg-surface-700 rounded mb-4" />
        <div className="h-4 w-2/3 bg-surface-200 dark:bg-surface-700 rounded" />
      </div>
    );
  }

  if (!topPick) {
    return (
      <div className="rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 p-6 mb-4 text-center">
        <p className="text-surface-500 dark:text-surface-400 text-sm mb-3">
          Your queue is clear — nothing left to read.
        </p>
        <Link
          to="/library"
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
        >
          Add something to read <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  const { bookmark, reason } = topPick;
  const accentColor =
    moodAccentOverride ?? SOURCE_ACCENT[bookmark.source_type] ?? SOURCE_ACCENT['blog'];
  const minutes = getReadingMinutes(bookmark);

  return (
    <div
      className="relative rounded-2xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 p-5 mb-4 overflow-hidden motion-safe:animate-[fadeSlideUp_0.25s_ease-out] transition-[border-color,background-color] duration-300"
      style={
        moodAccentOverride
          ? {
              borderColor: `${moodAccentOverride}40`,
              backgroundColor: `${moodAccentOverride}06`,
            }
          : undefined
      }
    >
      {/* Source/mood color tint overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundColor: accentColor }}
        aria-hidden="true"
      />
      {/* Source accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ backgroundColor: accentColor }}
        aria-hidden="true"
      />
      <div className="pl-3">
        {/* Context label */}
        <p className="text-xs font-semibold tracking-widest text-surface-400 uppercase mb-2">
          {contextLabel}
        </p>
        <div className="flex gap-3 items-start">
          <div className="flex-1 min-w-0">
            {/* Title */}
            <p className="text-xl font-bold line-clamp-3 leading-snug text-surface-900 dark:text-surface-100 mb-2">
              {bookmark.title ?? bookmark.url}
            </p>
            {/* Source + reading time */}
            <div className="flex items-center gap-2 mb-3">
              <SourceBadge source={bookmark.source_type} />
              {minutes != null && minutes > 0 && (
                <span className="text-xs text-surface-400">{minutes} min</span>
              )}
            </div>
          </div>
          {/* Thumbnail */}
          {bookmark.image && (
            <img
              src={bookmark.image}
              alt=""
              aria-hidden="true"
              className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
            />
          )}
        </div>
        {/* Reason */}
        <p className="text-sm italic text-surface-600 dark:text-surface-400 leading-relaxed mb-4">
          &ldquo;{reason}&rdquo;
        </p>
        {/* CTAs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onStartReading(bookmark)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors focus-visible:ring-2 min-h-[44px]"
          >
            Start reading <ArrowRight size={16} />
          </button>
          {!isBookWithoutUrl(bookmark) && (
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open in new tab"
              className="flex items-center justify-center w-10 h-10 rounded-xl border border-surface-200 dark:border-surface-700 text-surface-500 hover:text-surface-900 dark:hover:text-surface-100 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors focus-visible:ring-2 min-h-[44px] min-w-[44px]"
            >
              <ExternalLink size={16} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SecondaryCard
// ---------------------------------------------------------------------------

interface SecondaryCardProps {
  type: 'continue' | 'quick-win' | 'review';
  bookmark: Bookmark | null;
  onOpen: (b: Bookmark) => void;
  onMarkDone?: (b: Bookmark) => void;
}

const CARD_CONFIG = {
  continue: {
    icon: <PlayCircle size={12} />,
    label: 'Continue',
    color: 'text-amber-500 dark:text-amber-400',
  },
  'quick-win': {
    icon: <Zap size={12} />,
    label: 'Quick Win',
    color: 'text-primary-600 dark:text-primary-400',
  },
  review: {
    icon: <BookMarked size={12} />,
    label: 'Review',
    color: 'text-violet-600 dark:text-violet-400',
  },
} as const;

function SecondaryCard({ type, bookmark, onOpen, onMarkDone }: SecondaryCardProps) {
  if (!bookmark) return <div />;

  const b = bookmark;
  const cfg = CARD_CONFIG[type];
  const minutes = getReadingMinutes(b);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(b);
    }
  }

  const ariaLabel = `${cfg.label}: ${b.title ?? b.url}`;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={() => onOpen(b)}
      onKeyDown={handleKeyDown}
      className="rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900 p-3 cursor-pointer hover:border-surface-300 dark:hover:border-surface-700 transition-colors focus-visible:ring-2 min-h-[44px]"
    >
      {/* Label row */}
      <div className={`flex items-center gap-1 mb-2 text-xs font-medium ${cfg.color}`}>
        {cfg.icon}
        <span>{cfg.label}</span>
      </div>
      {/* Title */}
      <p className="text-sm font-medium line-clamp-2 leading-snug text-surface-900 dark:text-surface-100 mb-2">
        {b.title ?? b.url}
      </p>
      {/* Source + time — hidden for review card (shows reflection snippet instead) */}
      {type !== 'review' && (
        <div className="flex items-center gap-2">
          <SourceBadge source={b.source_type} />
          {minutes != null && minutes > 0 && (
            <span className="text-xs text-surface-400">{minutes} min</span>
          )}
        </div>
      )}
      {type === 'review' && (
        <p className="text-xs text-surface-400 italic line-clamp-2">
          {getReflectionNote(b) ?? 'Tap to review'}
        </p>
      )}
      {/* Mark done — continue card only */}
      {type === 'continue' && onMarkDone && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMarkDone(b);
          }}
          className="mt-2 text-xs text-surface-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors min-h-[32px] text-left focus-visible:ring-2 rounded"
        >
          Mark done ✓
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// JustAddedStrip
// ---------------------------------------------------------------------------

interface JustAddedStripProps {
  bookmark: Bookmark;
  onOpen: (b: Bookmark) => void;
}

function JustAddedStrip({ bookmark, onOpen }: JustAddedStripProps) {
  const minutes = getReadingMinutes(bookmark);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(bookmark);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Just added: ${bookmark.title ?? bookmark.url}`}
      onClick={() => onOpen(bookmark)}
      onKeyDown={handleKeyDown}
      className="rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 mb-4 flex items-center gap-3 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors focus-visible:ring-2 min-h-[44px]"
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-0.5">
          🆕 Just added
        </p>
        <p className="text-sm font-medium text-surface-900 dark:text-surface-100 line-clamp-1">
          {bookmark.title ?? bookmark.url}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <SourceBadge source={bookmark.source_type} />
          {minutes != null && minutes > 0 && (
            <span className="text-xs text-surface-400">{minutes} min</span>
          )}
        </div>
      </div>
      <ArrowRight size={16} className="flex-shrink-0 text-surface-400" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// MoodSelector
// ---------------------------------------------------------------------------

interface MoodSelectorProps {
  mood: MoodMode;
  onChange: (m: MoodMode) => void;
}

function MoodSelector({ mood, onChange }: MoodSelectorProps) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold tracking-widest text-surface-400 uppercase mb-2">Mood</p>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {MOODS.map(({ value, icon, label }) => (
          <button
            key={value}
            onClick={() => onChange(value)}
            aria-pressed={mood === value}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors focus-visible:ring-2 min-h-[36px] ${
              mood === value
                ? 'bg-primary-600 text-white'
                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
            }`}
          >
            <span aria-hidden="true">{icon}</span>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HomeFooter
// ---------------------------------------------------------------------------

interface HomeFooterProps {
  onSignOut: () => void;
  isDemo: boolean;
}

function HomeFooter({ onSignOut, isDemo }: HomeFooterProps) {
  return (
    <div className="flex items-center justify-between pt-2">
      <Link
        to="/library"
        className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline focus-visible:ring-2 rounded"
      >
        Browse Library <ArrowRight size={14} />
      </Link>
      {!isDemo && (
        <button
          onClick={onSignOut}
          className="text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors focus-visible:ring-2 rounded min-h-[44px] px-2"
        >
          Sign out
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HomePage (exported)
// ---------------------------------------------------------------------------

interface HomePageProps {
  userEmail: string | null;
  onSignOut: () => void;
  isDemo: boolean;
}

export function HomePage({ userEmail, onSignOut, isDemo }: HomePageProps) {
  const [mood, setMood] = useState<MoodMode>('default');
  const [now, setNow] = useState(() => new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [pendingDoneBookmark, setPendingDoneBookmark] = useState<Bookmark | null>(null);
  const [pendingReviewBookmark, setPendingReviewBookmark] = useState<Bookmark | null>(null);

  const { areas, isLoading: areasLoading } = useTagAreas();
  const { setValues } = useUserValues();
  const { topPick, continueItem, quickWin } = useScoring(mood);
  const { isLoading, bookmarks, cycleStatus, addNote, updateBookmark } = useBookmarks();
  const { reviewItem } = useSpacedReview();

  // Update clock every 60 seconds
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Show onboarding only once areas have loaded and the user has at least one area
  useEffect(() => {
    if (
      !areasLoading &&
      areas.length > 0 &&
      localStorage.getItem('contentdeck_values') === null &&
      !isDemo
    ) {
      setShowOnboarding(true);
    }
  }, [areas, areasLoading, isDemo]);

  // Most recently saved unread bookmark that wasn't already surfaced as the primary pick.
  // ISO 8601 strings are lexicographically sortable — no Date parsing needed.
  const justAdded = useMemo(() => {
    const newest =
      bookmarks
        .filter((b) => b.status === 'unread')
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
    if (!newest || newest.id === topPick?.bookmark.id) return null;
    return newest;
  }, [bookmarks, topPick]);

  const handleStartReading = useCallback(
    (bookmark: Bookmark) => {
      if (bookmark.status === 'unread') {
        cycleStatus.mutate({ id: bookmark.id, newStatus: 'reading' });
      }
      if (!isBookWithoutUrl(bookmark)) {
        window.open(bookmark.url, '_blank', 'noopener,noreferrer');
      }
    },
    [cycleStatus],
  );

  function handleMarkDone(bookmark: Bookmark) {
    setPendingDoneBookmark(bookmark);
  }

  function handleReflectionCancel() {
    setPendingDoneBookmark(null);
  }

  const handleReflectionSave = useCallback(
    async (text: string) => {
      if (!pendingDoneBookmark) return;
      const { id } = pendingDoneBookmark;
      const trimmedText = text.trim();
      try {
        await Promise.all([
          trimmedText
            ? addNote.mutateAsync({ bookmarkId: id, type: 'reflection', content: trimmedText })
            : Promise.resolve(),
          cycleStatus.mutateAsync({ id, newStatus: 'done' }),
        ]);
      } finally {
        // Always close — even if one mutation failed, avoid stuck modal
        setPendingDoneBookmark(null);
      }
    },
    [pendingDoneBookmark, addNote, cycleStatus],
  );

  const handleReflectionSkip = useCallback(() => {
    if (!pendingDoneBookmark) return;
    cycleStatus.mutate({ id: pendingDoneBookmark.id, newStatus: 'done' });
    setPendingDoneBookmark(null);
  }, [pendingDoneBookmark, cycleStatus]);

  const handleReviewResponse = useCallback(
    async (resonates: boolean) => {
      if (!pendingReviewBookmark) return;
      const { interval, repetitions } = nextReviewState(pendingReviewBookmark, resonates);
      try {
        await updateBookmark.mutateAsync({
          id: pendingReviewBookmark.id,
          last_reviewed_at: new Date().toISOString(),
          metadata: {
            ...pendingReviewBookmark.metadata,
            review_interval: interval,
            review_repetitions: repetitions,
          },
        });
      } finally {
        setPendingReviewBookmark(null);
      }
    },
    [pendingReviewBookmark, updateBookmark],
  );

  function handleCompleteOnboarding(v: UserValues) {
    setValues(v);
    setShowOnboarding(false);
  }

  const hasSecondary = continueItem !== null || quickWin !== null || reviewItem !== null;

  const reviewCard = reviewItem ? (
    <SecondaryCard
      type="review"
      bookmark={reviewItem}
      onOpen={() => setPendingReviewBookmark(reviewItem)}
    />
  ) : null;

  return (
    <div
      className="h-full overflow-y-auto bg-surface-50 dark:bg-surface-950"
      style={{ overscrollBehavior: 'contain', paddingTop: 'var(--safe-top)' }}
    >
      <div
        className="max-w-lg mx-auto px-4 py-6"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 16px)' }}
      >
        <main id="main-content">
          <HomeHeader
            userEmail={userEmail}
            now={now}
            onOpenSettings={() => setShowSettings(true)}
          />

          <PrimaryPickCard
            topPick={topPick}
            isLoading={isLoading}
            now={now}
            mood={mood}
            onStartReading={handleStartReading}
            moodAccentOverride={MOOD_ACCENT[mood] ?? null}
          />

          {/* Secondary cards — only render row if at least one slot is filled */}
          {hasSecondary && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {continueItem ? (
                <SecondaryCard
                  type="continue"
                  bookmark={continueItem}
                  onOpen={handleStartReading}
                  onMarkDone={handleMarkDone}
                />
              ) : (
                (reviewCard ?? <div />)
              )}
              {quickWin ? (
                <SecondaryCard type="quick-win" bookmark={quickWin} onOpen={handleStartReading} />
              ) : continueItem ? (
                (reviewCard ?? <div />)
              ) : (
                <div />
              )}
            </div>
          )}

          {/* Just Added strip — most recent unread, only when not already the primary pick */}
          {justAdded && <JustAddedStrip bookmark={justAdded} onOpen={handleStartReading} />}

          <MoodSelector mood={mood} onChange={setMood} />

          <HomeFooter onSignOut={onSignOut} isDemo={isDemo} />
        </main>
      </div>

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        userEmail={userEmail}
        onSignOut={onSignOut}
        isDemo={isDemo}
      />

      <ValuesOnboardingModal
        open={showOnboarding}
        areas={areas}
        onComplete={handleCompleteOnboarding}
        onSkip={() => setShowOnboarding(false)}
      />

      <ReflectionModal
        open={pendingDoneBookmark !== null}
        bookmark={pendingDoneBookmark}
        onSave={handleReflectionSave}
        onSkip={handleReflectionSkip}
        onCancel={handleReflectionCancel}
      />

      <ReviewModal
        open={pendingReviewBookmark !== null}
        bookmark={pendingReviewBookmark}
        onResonates={() => handleReviewResponse(true)}
        onLostThread={() => handleReviewResponse(false)}
        onClose={() => setPendingReviewBookmark(null)}
      />
    </div>
  );
}
