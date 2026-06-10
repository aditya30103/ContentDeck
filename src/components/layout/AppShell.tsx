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
  showSearch,
  children,
}: AppShellProps) {
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
        {/* Mobile Header — 3 buttons only (Search, Settings, Add) */}
        <MobileHeader
          onAdd={onAdd}
          onToggleSearch={onToggleSearch}
          onSettings={onSettings}
          showSearch={showSearch}
        />

        {/* Content Area */}
        <main
          id="main-content"
          className="flex-1 min-h-0 overflow-y-auto"
          style={{ overscrollBehavior: 'contain' }}
        >
          {children}
        </main>

        {/* Mobile Bottom Nav — static footer in the flex column (never `fixed`:
            iOS anchors fixed elements to the small viewport, leaving a dead band
            under the bar; in-flow keeps it flush with the app container bottom) */}
        <MobileNav counts={counts} />
      </div>
    </div>
  );
}
