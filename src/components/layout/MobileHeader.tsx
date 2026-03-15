import { Search, Plus, Settings } from 'lucide-react';

interface MobileHeaderProps {
  onAdd: () => void;
  onToggleSearch: () => void;
  onSettings: () => void;
  showSearch: boolean;
}

export default function MobileHeader({
  onAdd,
  onToggleSearch,
  onSettings,
}: MobileHeaderProps) {
  return (
    <header
      className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-surface-50/80 dark:bg-surface-900/80 backdrop-blur-md border-b border-surface-200 dark:border-surface-800"
      style={{ paddingTop: 'calc(12px + var(--safe-top))' }}
    >
      <h1 className="text-lg font-bold text-surface-900 dark:text-surface-100">
        ContentDeck
      </h1>
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleSearch}
          className="p-2.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Search"
        >
          <Search size={20} className="text-surface-600 dark:text-surface-400" />
        </button>
        <button
          onClick={onSettings}
          className="p-2.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Settings"
        >
          <Settings size={20} className="text-surface-600 dark:text-surface-400" />
        </button>
        <button
          onClick={onAdd}
          className="p-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Add bookmark"
        >
          <Plus size={20} className="text-white" />
        </button>
      </div>
    </header>
  );
}
