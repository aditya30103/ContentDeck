# Mobile UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix iOS/Android layout rendering bugs and add Framer Motion gesture primitives (draggable bottom sheet, pull-to-refresh, swipe-to-close, animated transitions) to make ContentDeck feel professional and native on mobile.

**Architecture:** Two sequential tracks. Track 1 (layout fixes) must be done first — it establishes the correct CSS foundation that gestures build on. Track 2 (gestures) layers Framer Motion onto existing components without restructuring the data/state layer. All gesture logic is UI-only; no hooks, queries, or Supabase calls change.

**Tech Stack:** React 18 + TypeScript + Tailwind CSS v4 + Framer Motion (new) + Vitest + @testing-library/react

---

## Branch

```bash
git checkout -b feat/mobile-ux-redesign
```

---

## Chunk 1: Track 1 — Layout & Rendering Fixes

### Task 1: CSS foundation — viewport height, body scroll, input floor

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add the CSS fixes**

Open `src/index.css`. Make these three additions:

**1a. After the existing `html { scroll-behavior: smooth; }` block** (around line 99), replace the `html` rule and add body rules:

```css
html {
  scroll-behavior: smooth;
  height: 100dvh;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  height: 100dvh;
  overflow: hidden;
  overscroll-behavior: none;
}
```

**1b. After the safe area variables block** (after line 128), add the input font-size floor:

```css
/* iOS auto-zoom prevention — any input below 16px triggers zoom on focus */
input,
textarea,
select {
  font-size: max(16px, 1rem);
}
```

- [ ] **Step 2: Verify build still passes**

```bash
npm run typecheck && npm run build
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "fix: add 100dvh, body overflow lock, and input font-size floor for iOS"
```

---

### Task 2: App.tsx — replace min-h-screen with min-h-[100dvh]

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update loading and auth container heights**

In `src/App.tsx`, there are two places that use `min-h-screen`. Replace both with `min-h-[100dvh]`:

Loading state (around line 54):
```tsx
// Before
<div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">

// After
<div className="min-h-[100dvh] flex items-center justify-center bg-surface-50 dark:bg-surface-950">
```

Check for any other `min-h-screen` in App.tsx and replace them the same way.

- [ ] **Step 2: Run existing tests to verify nothing broke**

```bash
npm run test
```
Expected: all 264 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "fix: replace min-h-screen with min-h-[100dvh] in App root containers"
```

---

### Task 3: AppShell — overscroll contain on main scroll container

**Files:**
- Modify: `src/components/layout/AppShell.tsx`

- [ ] **Step 1: Add overscroll-behavior to main**

In `src/components/layout/AppShell.tsx`, the `<main>` element (around line 53) currently has:
```tsx
<main
  id="main-content"
  className="flex-1 overflow-y-auto"
  style={{ paddingBottom: 'calc(72px + var(--safe-bottom))' }}
>
```

Add `overscroll-behavior: contain` to the style prop:
```tsx
<main
  id="main-content"
  className="flex-1 overflow-y-auto"
  style={{
    paddingBottom: 'calc(72px + var(--safe-bottom))',
    overscrollBehavior: 'contain',
  }}
>
```

- [ ] **Step 2: Run tests**

```bash
npm run test
```
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "fix: add overscroll-behavior contain to main scroll container"
```

---

### Task 4: MobileHeader — fix overflow by reducing to 3 actions

**Files:**
- Modify: `src/components/layout/MobileHeader.tsx`

The current header has 6 buttons (Search, Settings, Stats, Feedback, Theme, Add) + title — too wide for 390px. Stats, Feedback, and Theme are already accessible inside the Settings modal, so we remove their shortcuts from the header.

- [ ] **Step 1: Write the failing render test**

Open `src/components/__tests__/` and create a new file `MobileHeader.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MobileHeader from '../layout/MobileHeader';

// No useTheme mock needed — the new MobileHeader does not import useTheme

const defaultProps = {
  onAdd: vi.fn(),
  onToggleSearch: vi.fn(),
  onSettings: vi.fn(),
  showSearch: false,
};

describe('MobileHeader', () => {
  it('renders title and exactly 3 action buttons', () => {
    render(<MobileHeader {...defaultProps} />);
    expect(screen.getByText('ContentDeck')).toBeInTheDocument();
    // Only Search, Settings, Add — no Stats/Feedback/Theme buttons
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add bookmark/i })).toBeInTheDocument();
    // Removed buttons must not be present
    expect(screen.queryByRole('button', { name: /statistics/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /feedback/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /theme/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm run test -- MobileHeader
```
Expected: FAIL — Statistics/Feedback/Theme buttons are found (they exist now).

- [ ] **Step 3: Rewrite MobileHeader.tsx**

Replace the entire file content:

```tsx
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
```

- [ ] **Step 4: Update AppShell.tsx to remove now-unused props**

`AppShell.tsx` currently passes `onStats` and `onFeedback` to `MobileHeader`. Remove them.

In `src/components/layout/AppShell.tsx`:

Remove `onStats` and `onFeedback` from `AppShellProps` interface and from the `MobileHeader` JSX call. The props remain on `AppShell` itself (they're still used by `Sidebar`), just not forwarded to `MobileHeader`.

```tsx
// AppShellProps — keep onStats and onFeedback (Sidebar still uses them)
// Just remove them from the MobileHeader JSX:
<MobileHeader
  onAdd={onAdd}
  onToggleSearch={onToggleSearch}
  onSettings={onSettings}
  showSearch={showSearch}
/>
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
npm run test -- MobileHeader
```
Expected: PASS.

- [ ] **Step 6: Run full test suite**

```bash
npm run test
```
Expected: all tests pass (265 total — 264 existing + 1 new).

- [ ] **Step 7: Run quality pipeline**

```bash
npm run lint && npm run typecheck
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/MobileHeader.tsx src/components/layout/AppShell.tsx src/components/__tests__/MobileHeader.test.tsx
git commit -m "fix: slim MobileHeader to Search + Settings + Add — fixes 390px overflow"
```

---

### Task 5: HomePage layout audit

**Files:**
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: Find the outer container in HomePage.tsx**

Read the bottom of `HomePage.tsx` (the exported component's JSX return). Find the outermost container div that wraps the whole page. It likely has `min-h-screen` or similar.

- [ ] **Step 2: Apply overflow fix**

The outer page container should use `min-h-[100dvh]` and `overflow-y-auto overscroll-behavior-contain` (the page itself is a scroll surface since it doesn't use AppShell's `<main>`):

Find the outer wrapper div in the exported `HomePage` component and ensure it has:
```tsx
className="... min-h-[100dvh] overflow-y-auto"
style={{ overscrollBehavior: 'contain' }}
```

Also check the `HomeHeader` sub-component for safe-area padding — it uses a simple `flex items-start justify-between mb-6` with no sticky positioning, so no change needed there.

- [ ] **Step 3: Run tests**

```bash
npm run test -- HomePage
```
Expected: all HomePage tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "fix: apply 100dvh and overscroll-contain to HomePage outer container"
```

---

### Task 6: Input audit — catch remaining text-sm on form elements

**Files:**
- Audit: `src/components/**/*.tsx` for `text-sm` on `<input>`, `<textarea>`, `<select>`

The global CSS rule in Task 1 sets `font-size: max(16px, 1rem)` which covers new cases, but Tailwind utility classes override CSS — so any `text-sm` on a form element still causes iOS zoom.

- [ ] **Step 1: Search for remaining violations**

```bash
grep -rn "text-sm" src/components/ | grep -i "input\|textarea\|select"
```

Also search for inline input elements:
```bash
grep -rn "<input\|<textarea\|<select" src/components/ | grep "text-sm"
```

- [ ] **Step 2: Replace each found instance**

For each result: change `text-sm` to `text-base` on the form element itself (not its label or surrounding container).

Common locations from the v3.3.1 audit that might have been missed: `TagAreaInput.tsx`, search inputs inside modals.

- [ ] **Step 3: Run lint and tests**

```bash
npm run lint && npm run test
```
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add -p  # stage only changed component files
git commit -m "fix: ensure all form inputs use text-base (16px) to prevent iOS auto-zoom"
```

---

**End of Chunk 1. Run full quality pipeline before proceeding:**

```bash
npm run format:check && npm run lint && npm run typecheck && npm run test && npm run build
```

---

## Chunk 2: Track 2A — Framer Motion Core (Install + Pull-to-Refresh + DetailPanel)

### Task 7: Install Framer Motion

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install**

```bash
npm install framer-motion
```

- [ ] **Step 2: Verify it resolves**

```bash
npm run typecheck
```
Expected: no errors. Framer Motion ships its own types.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add framer-motion for gesture and animation primitives"
```

---

### Task 8: usePullToRefresh hook

**Files:**
- Create: `src/hooks/usePullToRefresh.ts`
- Create: `src/hooks/__tests__/usePullToRefresh.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/hooks/__tests__/usePullToRefresh.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePullToRefresh } from '../usePullToRefresh';

// Create a mock scroll container
function makeScrollRef(scrollTop = 0) {
  return {
    current: {
      scrollTop,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLElement,
  };
}

describe('usePullToRefresh', () => {
  it('registers touch event listeners on mount', () => {
    const ref = makeScrollRef();
    const onRefresh = vi.fn();
    renderHook(() => usePullToRefresh(ref, onRefresh));
    expect(ref.current.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: true });
    expect(ref.current.addEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function), { passive: false });
    expect(ref.current.addEventListener).toHaveBeenCalledWith('touchend', expect.any(Function));
  });

  it('does not register listeners if ref is null', () => {
    const ref = { current: null };
    const onRefresh = vi.fn();
    // Should not throw
    renderHook(() => usePullToRefresh(ref as React.RefObject<HTMLElement>, onRefresh));
  });

  it('removes listeners on unmount', () => {
    const ref = makeScrollRef();
    const onRefresh = vi.fn();
    const { unmount } = renderHook(() => usePullToRefresh(ref, onRefresh));
    unmount();
    expect(ref.current.removeEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(ref.current.removeEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function));
    expect(ref.current.removeEventListener).toHaveBeenCalledWith('touchend', expect.any(Function));
  });

  it('returns pullDistance as a MotionValue starting at 0', () => {
    const ref = makeScrollRef();
    const onRefresh = vi.fn();
    const { result } = renderHook(() => usePullToRefresh(ref, onRefresh));
    expect(result.current.pullDistance.get()).toBe(0);
  });

  it('returns isPulling false initially', () => {
    const ref = makeScrollRef();
    const onRefresh = vi.fn();
    const { result } = renderHook(() => usePullToRefresh(ref, onRefresh));
    expect(result.current.isPulling).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm run test -- usePullToRefresh
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

Create `src/hooks/usePullToRefresh.ts`:

```ts
import { useRef, useState, useCallback, useEffect } from 'react';
import { useMotionValue, useTransform } from 'framer-motion';
import type { MotionValue } from 'framer-motion';

const THRESHOLD = 64; // px to trigger refresh
const MAX_PULL = 96;  // px max visual travel

interface UsePullToRefreshReturn {
  pullDistance: MotionValue<number>;
  isPulling: boolean;
  isRefreshing: boolean;
}

export function usePullToRefresh(
  scrollRef: React.RefObject<HTMLElement>,
  onRefresh: () => void,
): UsePullToRefreshReturn {
  const pullDistance = useMotionValue(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) return;
    startYRef.current = e.touches[0]!.clientY;
    isPullingRef.current = true;
  }, [scrollRef]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPullingRef.current) return;
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) {
      isPullingRef.current = false;
      pullDistance.set(0);
      setIsPulling(false);
      return;
    }
    const delta = Math.max(0, e.touches[0]!.clientY - startYRef.current);
    // Apply resistance: feels natural, slows as it approaches MAX_PULL
    const resistance = delta / (delta + MAX_PULL);
    const visual = Math.min(MAX_PULL, delta * (1 - resistance * 0.5));
    pullDistance.set(visual);
    setIsPulling(visual > 4);
    // Prevent default only when pulling — stops page scroll during pull
    if (delta > 4) e.preventDefault();
  }, [scrollRef, pullDistance]);

  const handleTouchEnd = useCallback(() => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;
    const current = pullDistance.get();
    if (current >= THRESHOLD) {
      setIsRefreshing(true);
      pullDistance.set(THRESHOLD); // hold spinner position
      onRefresh();
      // Reset after short delay to let query refetch start
      setTimeout(() => {
        pullDistance.set(0);
        setIsPulling(false);
        setIsRefreshing(false);
      }, 800);
    } else {
      pullDistance.set(0);
      setIsPulling(false);
    }
  }, [pullDistance, onRefresh]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [scrollRef, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pullDistance, isPulling, isRefreshing };
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- usePullToRefresh
```
Expected: all 5 tests PASS.

- [ ] **Step 5: Wire into AppShell**

In `src/components/layout/AppShell.tsx`:

Add a `onRefresh` prop and integrate the hook + spinner UI. The `...` in the example below represents ALL existing props — do not remove any existing props, just add `onRefresh`:

```tsx
import { useRef } from 'react';
import { motion, useTransform } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
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
  onRefresh: () => void;   // ← new prop only; all others unchanged
  showSearch: boolean;
  children: React.ReactNode;
}

// In the destructure, add onRefresh to the existing list — do not remove counts/onAdd/etc:
export default function AppShell({
  counts, onAdd, onSignOut, onToggleSearch, onSettings, onStats, onFeedback,
  onRefresh,   // ← add this
  showSearch, children,
}: AppShellProps) {
  const mainRef = useRef<HTMLElement>(null);
  const { pullDistance, isRefreshing } = usePullToRefresh(
    mainRef as React.RefObject<HTMLElement>,
    onRefresh,
  );

  // Map pull distance to spinner opacity and rotation
  const spinnerOpacity = useTransform(pullDistance, [0, 32, 64], [0, 0.5, 1]);
  const spinnerY = useTransform(pullDistance, [0, 64], [-20, 0]);

  return (
    <div className="flex flex-1 min-w-0">
      <Sidebar ... />
      <div className="flex-1 flex flex-col min-w-0">
        {/* MobileHeader — keep all existing props (onAdd, onToggleSearch, onSettings, showSearch) */}
        <MobileHeader
          onAdd={onAdd}
          onToggleSearch={onToggleSearch}
          onSettings={onSettings}
          showSearch={showSearch}
        />

        {/* Pull-to-refresh indicator — mobile only */}
        <div className="lg:hidden relative overflow-hidden h-0">
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-surface-100 dark:bg-surface-800"
            style={{ opacity: spinnerOpacity, y: spinnerY, top: 4 }}
          >
            <motion.div
              animate={isRefreshing ? { rotate: 360 } : {}}
              transition={isRefreshing ? { repeat: Infinity, duration: 0.8, ease: 'linear' } : {}}
            >
              <RefreshCw size={14} className="text-primary-500" />
            </motion.div>
          </motion.div>
        </div>

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

        {/* MobileNav — keep existing counts prop */}
        <MobileNav counts={counts} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Wire `onRefresh` in Dashboard.tsx**

In `src/pages/Dashboard.tsx`, pass `onRefresh` to `AppShell`:

```tsx
// Inside Dashboard render, find <AppShell and add:
<AppShell
  ...
  onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['bookmarks'] })}
>
```

- [ ] **Step 7: Run full test suite**

```bash
npm run test
```
Expected: all tests pass.

- [ ] **Step 8: Run lint + typecheck**

```bash
npm run lint && npm run typecheck
```

- [ ] **Step 9: Commit**

```bash
git add src/hooks/usePullToRefresh.ts src/hooks/__tests__/usePullToRefresh.test.ts src/components/layout/AppShell.tsx src/pages/Dashboard.tsx
git commit -m "feat: add usePullToRefresh hook with Framer Motion spinner in AppShell"
```

---

### Task 9: DetailPanel — draggable bottom sheet

**Files:**
- Modify: `src/components/detail/DetailPanel.tsx`
- Modify: `src/components/__tests__/` — check for existing DetailPanel tests (none currently; add one)

This is the most complex task. Read the full current `DetailPanel.tsx` before starting — particularly the mobile overlay section (lines 79–109).

- [ ] **Step 1: Write the failing test**

Create `src/components/__tests__/DetailPanel.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DetailPanel from '../detail/DetailPanel';
import type { Bookmark } from '../../types';

// Mock framer-motion — jsdom has no layout engine so drag tests are visual-only
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    useMotionValue: () => ({ get: () => 0, set: vi.fn() }),
    useTransform: () => ({ get: () => 1 }),
    animate: vi.fn(),
  };
});

function makeBookmark(overrides: Partial<Bookmark> = {}): Bookmark {
  return {
    id: 'b1', url: 'https://example.com', title: 'Test', image: null, excerpt: null,
    source_type: 'blog', status: 'unread', is_favorited: false, notes: [], tags: [],
    areas: [], metadata: {}, content: {}, content_status: 'pending',
    content_fetched_at: null, synced: false, created_at: new Date().toISOString(),
    status_changed_at: new Date().toISOString(), started_reading_at: null,
    finished_at: null, ...overrides,
  };
}

const defaultProps = {
  bookmark: makeBookmark(),
  onClose: vi.fn(),
  onCycleStatus: vi.fn(),
  onToggleFavorite: vi.fn(),
  onAddNote: vi.fn(),
  onDeleteNote: vi.fn(),
  onEdit: vi.fn(),
  onExport: vi.fn(),
  onDelete: vi.fn(),
  onRefreshMetadata: vi.fn(),
  isNotePending: false,
};

describe('DetailPanel', () => {
  it('renders null when no bookmark', () => {
    const { container } = render(<DetailPanel {...defaultProps} bookmark={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders drag handle on mobile sheet', () => {
    render(<DetailPanel {...defaultProps} />);
    // drag handle is a decorative div with aria-hidden
    expect(document.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it('renders bookmark title in the panel', () => {
    render(<DetailPanel {...defaultProps} />);
    // MetadataHeader renders the bookmark title
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(<DetailPanel {...defaultProps} onClose={onClose} />);
    const closeBtn = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify current state**

```bash
npm run test -- DetailPanel
```
Expected: some tests PASS (basic render), drag handle test FAIL (not yet added).

- [ ] **Step 3: Rewrite the mobile overlay section of DetailPanel.tsx**

Read the full current file. Then replace **only the mobile overlay section** (the `lg:hidden` div at line 81 through the closing `</>`) with the Framer Motion version:

```tsx
// Add these imports at the top of DetailPanel.tsx:
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

// Replace the mobile overlay section:
// eslint-disable-next-line jsx-a11y/no-static-element-interactions
<div
  ref={overlayRef}
  className="lg:hidden fixed inset-0 z-50"
  onClick={(e) => {
    if (e.target === overlayRef.current) onClose();
  }}
  onKeyDown={(e) => {
    if (e.key === 'Escape') onClose();
  }}
>
  {/* Animated backdrop — opacity tracks sheet position */}
  <motion.div
    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
    style={{ opacity: backdropOpacity }}
  />

  {/* Draggable sheet */}
  <motion.div
    ref={panelRef}
    role="dialog"
    aria-modal="true"
    aria-label="Bookmark details"
    className="absolute inset-x-0 bottom-0 bg-surface-50 dark:bg-surface-900 rounded-t-2xl shadow-xl overflow-y-auto"
    style={{
      y,
      height: '85vh',
      paddingBottom: 'calc(16px + var(--safe-bottom))',
    }}
    initial={{ y: '100%' }}
    animate={{ y: 0 }}
    exit={{ y: '100%' }}
    transition={{ type: 'spring', stiffness: 400, damping: 40 }}
    drag="y"
    dragConstraints={{ top: 0 }}
    dragElastic={{ top: 0.05, bottom: 0.3 }}
    onDragEnd={(_, info) => {
      const sheetHeight = window.innerHeight * 0.85;
      if (info.offset.y > sheetHeight * 0.35 || info.velocity.y > 500) {
        void animate(y, window.innerHeight, {
          type: 'spring', stiffness: 400, damping: 40,
        }).then(onClose);
      } else {
        void animate(y, 0, { type: 'spring', stiffness: 400, damping: 40 });
      }
    }}
  >
    {/* Drag handle */}
    <div className="sticky top-0 z-10 bg-surface-50 dark:bg-surface-900 rounded-t-2xl pt-3 pb-0">
      <div
        aria-hidden="true"
        className="mx-auto w-8 h-1 rounded-full bg-surface-300 dark:bg-surface-600 mb-2"
      />
      {/* Existing mobile header (close button + title) */}
      <div className="flex items-center justify-between px-4 pb-3 border-b border-surface-200 dark:border-surface-700">
        <h2 className="text-base font-semibold text-surface-900 dark:text-surface-100 truncate">
          Details
        </h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 min-w-[44px] min-h-[44px] flex items-center justify-center text-surface-500 dark:text-surface-400"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>
    </div>

    {/* Panel content — copy the existing <div className="p-4"> block UNCHANGED from the
        current file. Do NOT remove or rewrite MetadataHeader, NotesTab, or DetailActions.
        Only the outer overlay div and the motion.div wrapper are new; everything inside
        <div className="p-4"> stays identical to the original. */}
    <div className="p-4">
      {/* paste existing content here verbatim */}
    </div>
  </motion.div>
</div>
```

**Wire up the motion values and refs** — add these inside the component function body (before the `if (!bookmark) return null` line). Note: the existing file already declares `panelRef` and `overlayRef` — keep them, just add the new motion values below them:

```tsx
// Keep existing refs (already in the file):
// const panelRef = useRef<HTMLDivElement>(null);
// const overlayRef = useRef<HTMLDivElement>(null);

// Add these new motion values:
const y = useMotionValue(0);
const sheetHeight = typeof window !== 'undefined' ? window.innerHeight * 0.85 : 600;
const backdropOpacity = useTransform(y, [0, sheetHeight * 0.5], [0.5, 0]);
```

**Wrap with AnimatePresence** — in the mobile section's return, the outermost mobile div should be wrapped so exit animation plays. This is done at the call site in Dashboard.tsx:

```tsx
// In Dashboard.tsx, where DetailPanel is rendered:
import { AnimatePresence } from 'framer-motion';

<AnimatePresence>
  {selectedBookmark && (
    <DetailPanel
      key={selectedBookmark.id}
      bookmark={selectedBookmark}
      ...
    />
  )}
</AnimatePresence>
```

- [ ] **Step 4: Run DetailPanel tests**

```bash
npm run test -- DetailPanel
```
Expected: all 4 tests PASS.

- [ ] **Step 5: Run full test suite**

```bash
npm run test
```
Expected: all tests pass.

- [ ] **Step 6: Lint + typecheck**

```bash
npm run lint && npm run typecheck
```

- [ ] **Step 7: Commit**

```bash
git add src/components/detail/DetailPanel.tsx src/components/__tests__/DetailPanel.test.tsx src/pages/Dashboard.tsx
git commit -m "feat: convert DetailPanel to Framer Motion draggable bottom sheet with spring dismiss"
```

---

**End of Chunk 2. Run full quality pipeline:**

```bash
npm run format:check && npm run lint && npm run typecheck && npm run test && npm run build
```

---

## Chunk 3: Track 2B — Modal Drag-to-Dismiss + Reader Swipe + AnimatePresence

### Task 10: Modal.tsx — drag-to-dismiss base

**Files:**
- Modify: `src/components/ui/Modal.tsx`

All bottom-sheet modals inherit from this component, so this fix propagates to Add, Settings, Stats, Feedback, Reflection, Review modals for free.

**Important:** `Modal.tsx` currently calls `document.body.style.overflow = 'hidden'` when open and resets it on close. Since Task 1 now sets `body { overflow: hidden }` permanently in CSS, this side effect is now redundant and must be removed.

- [ ] **Step 1: Write the failing test**

Add a test to `src/components/__tests__/AddBookmarkModal.test.tsx` (it already tests Modal):

Actually, check if there's a dedicated Modal test. If not, open `src/components/__tests__/AddBookmarkModal.test.tsx` and read how Modal is tested there. Add this test case:

Create `src/components/__tests__/Modal.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from '../ui/Modal';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    useMotionValue: () => ({ get: () => 0, set: vi.fn() }),
    animate: vi.fn(),
  };
});

describe('Modal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <Modal open={false} onClose={vi.fn()} title="Test"><p>content</p></Modal>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title and children when open', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="My Modal"><p>Hello</p></Modal>
    );
    expect(screen.getByText('My Modal')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', async () => {
    const onClose = vi.fn();
    render(<Modal open={true} onClose={onClose} title="T"><p>c</p></Modal>);
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT mutate document.body.style.overflow (body overflow is handled by CSS)', () => {
    const spy = vi.spyOn(document.body.style, 'overflow', 'set');
    render(<Modal open={true} onClose={vi.fn()} title="T"><p>c</p></Modal>);
    expect(spy).not.toHaveBeenCalled();
  });

  it('has a drag handle element on mobile', () => {
    render(<Modal open={true} onClose={vi.fn()} title="T"><p>c</p></Modal>);
    expect(document.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test — note which ones fail**

```bash
npm run test -- Modal.test
```
Expected: body overflow test FAILS (current code sets it), drag handle FAILS (not yet added).

- [ ] **Step 3: Rewrite Modal.tsx**

```tsx
import { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { motion, useMotionValue, animate } from 'framer-motion';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export default function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const y = useMotionValue(0);

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  // Focus trap
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !contentRef.current) return;
      const focusable = contentRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);
      // NOTE: do NOT touch document.body.style.overflow — handled by CSS globally
      requestAnimationFrame(() => {
        const first = contentRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        first?.focus();
      });
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- backdrop click-to-close is progressive enhancement; keyboard users have ESC via document-level handler
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <motion.div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`
          ${sizeClasses[size]} w-full bg-surface-50 dark:bg-surface-900
          rounded-t-2xl sm:rounded-2xl shadow-xl
          max-h-[88vh] sm:max-h-[80vh] overflow-y-auto
        `}
        style={{
          paddingBottom: 'calc(16px + var(--safe-bottom))',
          y,
        }}
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        // Drag to dismiss — mobile only feel (works on all sizes but most impactful on mobile)
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0.05, bottom: 0.3 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120 || info.velocity.y > 500) {
            void animate(y, window.innerHeight, {
              type: 'spring', stiffness: 400, damping: 40,
            }).then(onClose);
          } else {
            void animate(y, 0, { type: 'spring', stiffness: 400, damping: 40 });
          }
        }}
      >
        {/* Drag handle — visible on mobile */}
        <div
          aria-hidden="true"
          className="sm:hidden mx-auto mt-3 mb-1 w-8 h-1 rounded-full bg-surface-300 dark:bg-surface-600"
        />
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 rounded-t-2xl z-10">
          <h2
            id="modal-title"
            className="text-lg font-semibold text-surface-900 dark:text-surface-100"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 min-w-[44px] min-h-[44px] flex items-center justify-center text-surface-500 dark:text-surface-400"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 4: Wrap modal call sites with AnimatePresence in Dashboard.tsx**

For each modal in `Dashboard.tsx`, wrap with `AnimatePresence` so exit animations play:

```tsx
import { AnimatePresence } from 'framer-motion';

// Example pattern — apply to each modal:
<AnimatePresence>
  {showAddModal && (
    <AddBookmarkModal key="add" open={showAddModal} onClose={() => setShowAddModal(false)} ... />
  )}
</AnimatePresence>

<AnimatePresence>
  {showSettings && (
    <SettingsModal key="settings" open={showSettings} onClose={() => setShowSettings(false)} ... />
  )}
</AnimatePresence>

// Repeat for: StatsModal, FeedbackModal
```

Also in `HomePage.tsx`, wrap each modal the same way. Example for `ValuesOnboardingModal` (apply the same pattern to `ReflectionModal`, `ReviewModal`, `SettingsModal`):

```tsx
// In HomePage.tsx — find each modal render and wrap it:
<AnimatePresence>
  {showValues && (
    <ValuesOnboardingModal
      key="values"
      open={showValues}
      onClose={() => setShowValues(false)}
      // ... keep all existing props unchanged
    />
  )}
</AnimatePresence>
```

`AnimatePresence` must be imported at the top: `import { AnimatePresence } from 'framer-motion';`

- [ ] **Step 5: Run Modal tests**

```bash
npm run test -- Modal.test
```
Expected: all 5 PASS.

- [ ] **Step 6: Run full test suite**

```bash
npm run test
```
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/Modal.tsx src/components/__tests__/Modal.test.tsx src/pages/Dashboard.tsx src/pages/HomePage.tsx
git commit -m "feat: add Framer Motion drag-to-dismiss and AnimatePresence to Modal base and all call sites"
```

---

### Task 11: ReaderModal — swipe-right-to-close

**Files:**
- Modify: `src/components/reader/ReaderModal.tsx`

- [ ] **Step 1: Add swipe test to existing ReaderModal test file**

Open `src/components/__tests__/ReaderModal.test.tsx` and add:

```tsx
// Add to existing imports
import { vi } from 'vitest';

// Add this mock near the top (after existing mocks)
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    useMotionValue: () => ({ get: () => 0, set: vi.fn() }),
    animate: vi.fn(),
  };
});

// Add this test case inside the existing describe block:
it('renders a close button accessible via keyboard', () => {
  render(<ReaderModal {...defaultProps} open={true} />);
  const closeBtn = screen.getByRole('button', { name: /close/i });
  expect(closeBtn).toBeInTheDocument();
});

it('does not render content when closed', () => {
  render(<ReaderModal {...defaultProps} open={false} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run existing ReaderModal tests to establish baseline**

```bash
npm run test -- ReaderModal
```
Expected: all existing tests PASS.

- [ ] **Step 3: Read the full ReaderModal.tsx**

Read from line 60 onwards to understand the full JSX structure before editing.

- [ ] **Step 4: Add horizontal swipe gesture to ReaderModal**

In `src/components/reader/ReaderModal.tsx`:

Add imports:
```tsx
import { motion, useMotionValue, animate } from 'framer-motion';
```

In the component, add motion values:
```tsx
const x = useMotionValue(0);
```

Wrap the outermost container `div` (currently `fixed inset-0 z-[100] ...`) as a `motion.div` with horizontal drag:

```tsx
<motion.div
  className="fixed inset-0 z-[100] flex flex-col ..."  // keep existing classes
  style={{ x }}
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  dragElastic={{ left: 0, right: 0.3 }}
  onDragEnd={(_, info) => {
    if (info.offset.x > 80 || info.velocity.x > 400) {
      void animate(x, window.innerWidth, {
        type: 'spring', stiffness: 400, damping: 40,
      }).then(onClose);
    } else {
      void animate(x, 0, { type: 'spring', stiffness: 400, damping: 40 });
    }
  }}
>
```

**Important:** The reader content area has vertical scrolling. To prevent swipe-to-close from firing during vertical scroll, add `dragDirectionLock` to the `motion.div` — Framer Motion will lock to the dominant gesture direction:

```tsx
dragDirectionLock
```

- [ ] **Step 5: Run ReaderModal tests**

```bash
npm run test -- ReaderModal
```
Expected: all tests PASS.

- [ ] **Step 6: Run full test suite**

```bash
npm run test
```
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/reader/ReaderModal.tsx src/components/__tests__/ReaderModal.test.tsx
git commit -m "feat: add swipe-right-to-close gesture to ReaderModal with spring animation"
```

---

### Task 12: AnimatePresence — route transitions (Home ↔ Library)

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Wrap Routes with AnimatePresence**

In `src/App.tsx`, find the `<Routes>` block inside the authenticated/demo render:

```tsx
import { AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

// Inside App component, add:
const location = useLocation();

// Wrap Routes:
<AnimatePresence mode="wait">
  <Routes location={location} key={location.pathname}>
    <Route path="/" element={<HomePage ... />} />
    <Route path="/library" element={<Dashboard ... />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
</AnimatePresence>
```

- [ ] **Step 2: Add page transition wrapper in HomePage and Dashboard**

Both pages need their root element to be a `motion.div` with enter/exit animations. Since these are full-page components, a simple fade + slight Y translate works well:

In `src/pages/HomePage.tsx`, wrap the outermost return div:
```tsx
import { motion } from 'framer-motion';

// Replace outermost <div with:
<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -8 }}
  transition={{ duration: 0.2, ease: 'easeInOut' }}
  className="..." // keep existing classes
>
```

In `src/pages/Dashboard.tsx`, find the root element returned from `AppShell` — actually the Dashboard returns an `<AppShell>` directly. Wrap the AppShell:
```tsx
import { motion } from 'framer-motion';

return (
  <motion.div
    className="flex flex-col flex-1 min-h-[100dvh]"
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.2, ease: 'easeInOut' }}
  >
    <AppShell ...>
      ...
    </AppShell>
  </motion.div>
);
```

- [ ] **Step 3: Run App tests**

```bash
npm run test -- App.test
```
Expected: all pass.

- [ ] **Step 4: Run full test suite**

```bash
npm run test
```
Expected: all tests pass.

- [ ] **Step 5: Lint + typecheck**

```bash
npm run lint && npm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/pages/HomePage.tsx src/pages/Dashboard.tsx
git commit -m "feat: add AnimatePresence page transitions for Home <-> Library route navigation"
```

---

### Task 13: Final quality pipeline + docs + PR

- [ ] **Step 1: Run the full quality pipeline**

```bash
npm run format:check && npm run lint && npm run typecheck && npm run test && npm run build
```
Expected: all pass. Test count should be 270+ (264 original + new tests from this session).

- [ ] **Step 2: Format any files that need it**

```bash
npm run format
npm run format:check
```

- [ ] **Step 3: Write implementation log**

Create `docs/log/v3.7-mobile-ux.md`:

```markdown
# v3.7 — Mobile UX Redesign

**Date:** 2026-03-15
**Branch:** feat/mobile-ux-redesign
**PR:** #XX
**Tests:** [final count] tests
**Plan section:** [Mobile UX Redesign spec](../superpowers/specs/2026-03-15-mobile-ux-redesign.md)

## What shipped

### Track 1 — Layout & rendering fixes
- `index.css`: 100dvh for html/body, overflow hidden, overscroll-behavior none, input 16px floor
- `MobileHeader`: reduced to 3 buttons (Search + Settings + Add), fixes 390px overflow
- `AppShell`: overscroll-behavior contain on main scroll container
- `App.tsx`: min-h-[100dvh] on loading/auth states
- `HomePage`: overflow and height fixes
- Input audit: all form elements confirmed ≥ 16px

### Track 2 — Framer Motion gestures
- `usePullToRefresh`: new hook, motion-value-driven spinner, 64px threshold
- `DetailPanel`: full draggable bottom sheet, spring dismiss, animated backdrop
- `Modal.tsx`: drag-to-dismiss base — all modals inherit; removed body.style.overflow side effect
- `ReaderModal`: swipe-right-to-close with dragDirectionLock
- Route transitions: AnimatePresence around Routes in App.tsx

## Key decisions
- Framer Motion chosen over raw CSS (spring physics) and use-gesture+react-spring (two APIs)
- Direct-to-full sheet (no peek) — card already surfaces quick actions inline
- body overflow handled by CSS globally, not by Modal.tsx at runtime
```

- [ ] **Step 4: Commit log**

```bash
git add docs/log/v3.7-mobile-ux.md
git commit -m "docs: add v3.7 mobile UX implementation log"
```

- [ ] **Step 5: Push and open PR**

Note: Replace `#XX` in the title and log with the actual GitHub issue number if one exists, or omit the `(#XX)` if there is no associated issue.

```bash
git push -u origin feat/mobile-ux-redesign
gh pr create \
  --title "feat: mobile UX redesign — layout fixes + Framer Motion gestures" \
  --body "$(cat <<'EOF'
## Summary
- Fix iOS/Android layout bugs: header overflow, 100dvh, body scroll lock, input zoom
- Add Framer Motion draggable bottom sheet (DetailPanel), pull-to-refresh, modal drag-to-dismiss, reader swipe-to-close, route transitions

## Test plan
- [ ] All existing 264 tests pass
- [ ] New tests for MobileHeader, DetailPanel, Modal, usePullToRefresh, ReaderModal
- [ ] 4-theme check (Light, Dark, Sepia, Navy) on DetailPanel and Modal
- [ ] Real device: iPhone 15 iOS Safari — header fits, no zoom, sheet drags smoothly
- [ ] Real device: Android Chrome — same layout checks

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Quick Reference — Files Changed

| File | Track | What changes |
|------|-------|-------------|
| `src/index.css` | 1 | 100dvh, body overflow/overscroll, input floor |
| `src/App.tsx` | 1+2 | min-h-[100dvh]; AnimatePresence + useLocation for routes |
| `src/pages/HomePage.tsx` | 1+2 | overflow fix; motion.div page transition wrapper |
| `src/pages/Dashboard.tsx` | 2 | AnimatePresence for all modals; motion wrapper; onRefresh prop |
| `src/components/layout/MobileHeader.tsx` | 1 | 3 buttons only |
| `src/components/layout/AppShell.tsx` | 1+2 | overscroll contain; pull-to-refresh hook + spinner |
| `src/components/detail/DetailPanel.tsx` | 2 | Framer Motion draggable bottom sheet |
| `src/components/ui/Modal.tsx` | 2 | Drag-to-dismiss; remove body.style.overflow side effect |
| `src/components/reader/ReaderModal.tsx` | 2 | Swipe-right-to-close |
| `src/hooks/usePullToRefresh.ts` | 2 | New hook |
| `src/components/__tests__/MobileHeader.test.tsx` | test | New |
| `src/components/__tests__/DetailPanel.test.tsx` | test | New |
| `src/components/__tests__/Modal.test.tsx` | test | New |
| `src/hooks/__tests__/usePullToRefresh.test.ts` | test | New |
