import { Inbox, BookOpen, CheckCircle, Star, List, LayoutGrid } from 'lucide-react';
import { useUI } from '../../context/UIProvider';
import type { Status } from '../../types';

interface MobileNavProps {
  counts: { unread: number; reading: number; done: number; favorited: number };
}

const tabs: { status: Status; label: string; icon: React.ElementType }[] = [
  { status: 'unread', label: 'Unread', icon: Inbox },
  { status: 'reading', label: 'Reading', icon: BookOpen },
  { status: 'done', label: 'Done', icon: CheckCircle },
];

export default function MobileNav({ counts }: MobileNavProps) {
  const { currentStatus, setStatus, currentView, setView, showFavorites, setFavorites } = useUI();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md border-t border-surface-200 dark:border-surface-800"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
      aria-label="Bottom navigation"
    >
      <div className="flex items-center">
        {tabs.map(({ status, label, icon: Icon }) => {
          // Active reflects only the status dimension — favorites is independent.
          const active = currentStatus === status;
          return (
            <button
              key={status}
              onClick={() => setStatus(status)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 min-h-[56px] transition-colors
                ${active ? 'text-primary-600 dark:text-primary-400' : 'text-surface-400 dark:text-surface-500'}
              `}
              aria-label={`${label} (${counts[status]})`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{label}</span>
              {counts[status] > 0 && <span className="text-[10px]">{counts[status]}</span>}
            </button>
          );
        })}

        {/* Favorites — toggles independently; does not reset status or area */}
        <button
          onClick={() => setFavorites(!showFavorites)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 min-h-[56px] transition-colors
            ${showFavorites ? 'text-primary-600 dark:text-primary-400' : 'text-surface-400 dark:text-surface-500'}
          `}
          aria-label={`Favorites (${counts.favorited})`}
          aria-current={showFavorites ? 'page' : undefined}
        >
          <Star size={20} />
          <span className="text-[10px] font-medium">Favorites</span>
          {counts.favorited > 0 && <span className="text-[10px]">{counts.favorited}</span>}
        </button>

        {/* View toggle */}
        <button
          onClick={() => setView(currentView === 'list' ? 'areas' : 'list')}
          className="flex-1 flex flex-col items-center gap-0.5 py-2 min-h-[56px] text-surface-400 dark:text-surface-500"
          aria-label={`Switch to ${currentView === 'list' ? 'areas' : 'list'} view`}
        >
          {currentView === 'list' ? <LayoutGrid size={20} /> : <List size={20} />}
          <span className="text-[10px] font-medium">
            {currentView === 'list' ? 'Areas' : 'List'}
          </span>
        </button>
      </div>
    </nav>
  );
}
