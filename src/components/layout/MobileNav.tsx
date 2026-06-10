import { Inbox, BookOpen, CheckCircle, Star, List, LayoutGrid } from 'lucide-react';
import { useUI } from '../../context/UIProvider';
import type { Status } from '../../types';

interface MobileNavProps {
  counts: { unread: number; reading: number; done: number; favorited: number };
}

const tabs: {
  status: Status;
  label: string;
  icon: React.ElementType;
  countKey: keyof MobileNavProps['counts'];
}[] = [
  { status: 'unread', label: 'Unread', icon: Inbox, countKey: 'unread' },
  { status: 'reading', label: 'Reading', icon: BookOpen, countKey: 'reading' },
  { status: 'done', label: 'Done', icon: CheckCircle, countKey: 'done' },
];

function NavBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-primary-600 text-white text-[10px] font-bold leading-none px-0.5">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export default function MobileNav({ counts }: MobileNavProps) {
  const { currentStatus, setStatus, currentView, setView, showFavorites, setFavorites } = useUI();

  return (
    <nav
      className="lg:hidden flex-none z-30 bg-surface-50 dark:bg-surface-950 border-t border-surface-200 dark:border-surface-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Bottom navigation"
    >
      <div className="flex h-[49px]">
        {tabs.map(({ status, label, icon: Icon, countKey }) => {
          const active = currentStatus === status;
          const count = counts[countKey];
          return (
            <button
              key={status}
              onClick={() => setStatus(status)}
              className={`flex-1 flex items-center justify-center h-full transition-colors
                ${active ? 'text-primary-600 dark:text-primary-400' : 'text-surface-400 dark:text-surface-500'}
              `}
              aria-label={`${label} (${count})`}
              aria-current={active ? 'page' : undefined}
            >
              <div className="relative">
                <Icon size={20} />
                <NavBadge count={count} />
              </div>
            </button>
          );
        })}

        {/* Favorites — toggles independently; does not reset status or area */}
        <button
          onClick={() => setFavorites(!showFavorites)}
          className={`flex-1 flex items-center justify-center h-full transition-colors
            ${showFavorites ? 'text-primary-600 dark:text-primary-400' : 'text-surface-400 dark:text-surface-500'}
          `}
          aria-label={`Favorites (${counts.favorited})`}
          aria-current={showFavorites ? 'page' : undefined}
        >
          <div className="relative">
            <Star size={20} />
            <NavBadge count={counts.favorited} />
          </div>
        </button>

        {/* View toggle */}
        <button
          onClick={() => setView(currentView === 'list' ? 'areas' : 'list')}
          className="flex-1 flex items-center justify-center h-full text-surface-400 dark:text-surface-500"
          aria-label={`Switch to ${currentView === 'list' ? 'areas' : 'list'} view`}
        >
          {currentView === 'list' ? <LayoutGrid size={20} /> : <List size={20} />}
        </button>
      </div>
    </nav>
  );
}
