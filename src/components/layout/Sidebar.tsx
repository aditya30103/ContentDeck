import {
  Inbox,
  BookOpen,
  CheckCircle,
  Star,
  Plus,
  Sun,
  Moon,
  Anchor,
  Settings,
  BarChart3,
  LogOut,
  LayoutGrid,
  List,
  MessageSquare,
} from 'lucide-react';
import { useUI } from '../../context/UIProvider';
import { useTheme } from '../../hooks/useTheme';
import type { Status, ViewMode } from '../../types';

interface SidebarProps {
  counts: { unread: number; reading: number; done: number; favorited: number };
  onAdd: () => void;
  onSignOut: () => void;
  onSettings: () => void;
  onStats: () => void;
  onFeedback: () => void;
}

const statusNav: { status: Status | 'all'; label: string; icon: React.ElementType }[] = [
  { status: 'all', label: 'All Bookmarks', icon: Inbox },
  { status: 'unread', label: 'Unread', icon: Inbox },
  { status: 'reading', label: 'Reading', icon: BookOpen },
  { status: 'done', label: 'Done', icon: CheckCircle },
];

export default function Sidebar({
  counts,
  onAdd,
  onSignOut,
  onSettings,
  onStats,
  onFeedback,
}: SidebarProps) {
  const {
    currentStatus,
    setStatus,
    currentView,
    setView,
    currentTag,
    setTag,
    showFavorites,
    setFavorites,
  } = useUI();
  const { toggleTheme, theme } = useTheme();

  const totalCount = counts.unread + counts.reading + counts.done;

  return (
    <aside className="hidden lg:flex flex-col w-64 h-[100dvh] bg-surface-50 dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800">
      {/* Header */}
      <div className="p-4 border-b border-surface-200 dark:border-surface-800">
        <h1 className="text-lg font-bold text-surface-900 dark:text-surface-100">ContentDeck</h1>
        <button
          onClick={onAdd}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors min-h-[44px]"
        >
          <Plus size={18} />
          New Bookmark
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto" aria-label="Main navigation">
        <div className="space-y-0.5">
          {statusNav.map(({ status, label, icon: Icon }) => {
            const count = status === 'all' ? totalCount : (counts[status] ?? 0);
            // Active reflects only the status dimension — area/favorites filters are independent.
            const active = currentStatus === status;
            return (
              <button
                key={status}
                aria-current={active ? 'page' : undefined}
                onClick={() => setStatus(status)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]
                  ${
                    active
                      ? 'bg-primary-600/10 text-primary-600 dark:text-primary-400'
                      : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
                  }
                `}
              >
                <Icon size={18} />
                <span className="flex-1 text-left">{label}</span>
                <span className="text-xs text-surface-400 dark:text-surface-500">{count}</span>
              </button>
            );
          })}

          {/* Divider between status filters and Favorites */}
          <div className="my-1 border-t border-surface-200 dark:border-surface-800" />

          {/* Favorites — toggles independently; does not reset status or area */}
          <button
            aria-current={showFavorites ? 'page' : undefined}
            onClick={() => setFavorites(!showFavorites)}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]
              ${
                showFavorites
                  ? 'bg-primary-600/10 text-primary-600 dark:text-primary-400'
                  : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
              }
            `}
          >
            <Star size={18} />
            <span className="flex-1 text-left">Favorites</span>
            <span className="text-xs text-surface-400 dark:text-surface-500">
              {counts.favorited}
            </span>
          </button>
        </div>

        {/* Active tag filter indicator */}
        {currentTag && (
          <div className="mt-4 px-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-600/10">
              <span className="text-xs font-medium text-primary-600 dark:text-primary-400 flex-1 truncate">
                {currentTag === '__untagged__' ? 'Untagged' : `Tag: ${currentTag}`}
              </span>
              <button
                onClick={() => setTag(null)}
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 text-xs font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* View Toggle */}
        <div className="mt-6 px-3">
          <p className="text-xs font-medium text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-2">
            View
          </p>
          <div className="flex gap-1 bg-surface-100 dark:bg-surface-800 rounded-lg p-1">
            {(
              [
                ['list', List, 'List'],
                ['areas', LayoutGrid, 'Areas'],
              ] as [ViewMode, React.ElementType, string][]
            ).map(([view, Icon, label]) => (
              <button
                key={view}
                onClick={() => setView(view)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors min-h-[36px]
                    ${
                      currentView === view
                        ? 'bg-surface-50 dark:bg-surface-700 text-surface-900 dark:text-surface-100 shadow-sm'
                        : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300'
                    }`}
                aria-label={`${label} view`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-surface-200 dark:border-surface-800 space-y-1">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors min-h-[44px]"
        >
          {theme === 'dark' ? (
            <Sun size={18} />
          ) : theme === 'sepia' ? (
            <Moon size={18} />
          ) : theme === 'navy' ? (
            <Anchor size={18} />
          ) : (
            <Moon size={18} />
          )}
          {theme === 'dark'
            ? 'Sepia Theme'
            : theme === 'sepia'
              ? 'Navy Theme'
              : theme === 'navy'
                ? 'Light Theme'
                : 'Dark Theme'}
        </button>
        <button
          onClick={onStats}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors min-h-[44px]"
        >
          <BarChart3 size={18} />
          Statistics
        </button>
        <button
          onClick={onFeedback}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors min-h-[44px]"
        >
          <MessageSquare size={18} />
          Feedback
        </button>
        <button
          onClick={onSettings}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors min-h-[44px]"
        >
          <Settings size={18} />
          Settings
        </button>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors min-h-[44px]"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
