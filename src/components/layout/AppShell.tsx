import { useRef } from 'react';
import { motion, useTransform } from 'framer-motion';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import MobileNav from './MobileNav';

interface AppShellProps {
  counts: { unread: number; reading: number; done: number; favorited: number };
  onAdd: () => void;
  onSignOut: () => void;
  onToggleSearch: () => void;
  onSettings: () => void;
  onStats: () => void;
  onFeedback: () => void;
  onRefresh?: () => void;
  showSearch: boolean;
  children: React.ReactNode;
}

export default function AppShell({
  counts,
  onAdd,
  onSignOut,
  onToggleSearch,
  onSettings,
  onStats,
  onFeedback,
  onRefresh,
  showSearch,
  children,
}: AppShellProps) {
  const mainRef = useRef<HTMLElement>(null);
  const { pullDistance, isPulling, isRefreshing } = usePullToRefresh(mainRef, onRefresh || (() => {}));
  const pullTop = useTransform(pullDistance, (v) => `calc(${v}px + 12px)`);
  const pullOpacity = useTransform(pullDistance, [0, 32], [0, 1]);

  return (
    <div className="flex flex-1 min-w-0">
      {/* Desktop Sidebar */}
      <Sidebar
        counts={counts}
        onAdd={onAdd}
        onSignOut={onSignOut}
        onSettings={onSettings}
        onStats={onStats}
        onFeedback={onFeedback}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <MobileHeader
          onAdd={onAdd}
          onToggleSearch={onToggleSearch}
          onSettings={onSettings}
          showSearch={showSearch}
        />

        {/* Pull indicator */}
        <motion.div
          className={`absolute left-1/2 -translate-x-1/2 px-3 py-2 rounded-full text-xs font-medium transition-colors ${
            isPulling
              ? 'bg-primary-600 text-white'
              : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
          }`}
          style={{
            top: pullTop,
            opacity: pullOpacity,
            pointerEvents: 'none',
          }}
        >
          {isRefreshing ? 'Refreshing…' : isPulling ? 'Release to refresh' : 'Pull to refresh'}
        </motion.div>

        {/* Content Area */}
        <main
          ref={mainRef}
          id="main-content"
          className="flex-1 overflow-y-auto"
          style={{
            paddingBottom: 'calc(72px + var(--safe-bottom))',
            overscrollBehavior: 'contain',
          }}
        >
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <MobileNav counts={counts} />
      </div>
    </div>
  );
}
