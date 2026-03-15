# Mobile UX Redesign — Design Spec

**Date:** 2026-03-15
**Status:** Approved
**Session:** Brainstorming → Design → Plan

---

## Problem

ContentDeck's mobile experience has two distinct categories of issues:

1. **Layout & rendering bugs** — the header overflows on iPhone 15 (390px), iOS Safari's address bar causes reflow, the body scrolls freely causing rubber-banding, and inputs below 16px trigger iOS auto-zoom.
2. **Missing gesture primitives** — no drag-to-dismiss on any panel/modal, no pull-to-refresh, no swipe-to-close on reader mode. The existing `DetailPanel` bottom sheet has no drag handle, no spring physics, and no velocity-based dismiss.

The result: the app feels unstable, unpolished, and unprofessional on real iOS devices. Android has the same structural issues.

**Primary target:** iPhone 15 (iOS Safari). Must also work on Android Chrome.

---

## Design Decisions

### Gesture paradigm: draggable bottom sheet (Option B)
Rejected swipe-to-reveal (Option A) — it promotes batch-processing over deliberate engagement, which contradicts ContentDeck's personal retreat philosophy. Rejected hybrid long-press (Option C) — long-press is not discoverable.

Bottom sheet aligns with the existing `DetailPanel` pattern (already a slide-up overlay on mobile) and the Consume → Reflect workflow.

### Bottom sheet snap points: direct to full (1 snap)
Tap a bookmark card → sheet opens immediately at ~85% height. No peek step. The bookmark card already surfaces all quick actions inline; a peek strip would duplicate them.

### Gesture library: Framer Motion
Single library for drag tracking + spring physics + `AnimatePresence`. Preferred over `@use-gesture` + `react-spring` (two APIs) and raw CSS transitions (no spring feel). ~12KB gzip on a PWA where JS is cached after first load.

---

## Track 1 — Layout & Rendering Fixes

### 1.1 Header overflow
**Problem:** `MobileHeader` has 6 buttons + title ≈ 420px on a 390px screen.
**Fix:** Reduce to 3 elements — title, Search button, Settings button, + Add button. Move Stats, Feedback, and Theme toggle into the Settings modal (already accessible there). No information is lost.
**Files:** `src/components/layout/MobileHeader.tsx`

### 1.2 Viewport height (100dvh)
**Problem:** `100vh` in iOS Safari does not account for the dynamic address bar, causing the layout to be clipped or to reflow when the bar hides/shows.
**Fix:** Add `height: 100dvh; overflow: hidden` to `html, body, #root` in `index.css`. Replace any `min-h-screen` (`100vh`) usages in layout-critical paths with `min-h-[100dvh]`.
**Files:** `src/index.css`, `src/App.tsx`

### 1.3 Body scroll lock
**Problem:** No `overflow: hidden` on `body` — iOS Safari allows the entire page body to rubber-band scroll alongside inner scroll containers.
**Fix:** `body { overflow: hidden; overscroll-behavior: none }`. The `<main>` scroll container in `AppShell` becomes the single scroll surface.
**Files:** `src/index.css`

### 1.4 Main scroll container
**Problem:** `<main>` in `AppShell` has no `overscroll-behavior`, allowing scroll chaining to the body.
**Fix:** Add `overscroll-behavior: contain` to `<main>`. This also prevents the browser's native pull-to-refresh from firing inside the app (our custom pull-to-refresh handles this in Track 2).
**Files:** `src/components/layout/AppShell.tsx`

### 1.5 Input font-size floor
**Problem:** iOS Safari auto-zooms any focused input with `font-size < 16px`. Some inputs may still be `text-sm` (14px) despite the v3.3.1 fix.
**Fix:** Add `input, textarea, select { font-size: max(16px, 1rem) }` to `index.css` as a global floor. Audit all components for remaining `text-sm` on form elements.
**Files:** `src/index.css`, component audit

### 1.6 HomePage layout
**Problem:** `HomePage` does not use `AppShell` and may have different overflow/height issues.
**Fix:** Audit `HomePage.tsx` — apply `min-h-[100dvh]`, `overflow: hidden` on outer container, safe-area padding consistency.
**Files:** `src/pages/HomePage.tsx`

---

## Track 2 — Framer Motion Gestures

### 2.0 Install Framer Motion
```bash
npm install framer-motion
```

### 2.1 Draggable bottom sheet — DetailPanel
Replace the CSS `slideUp` animation + static overlay with a proper Framer Motion bottom sheet.

**Behaviour:**
- Tap bookmark card → sheet animates up to 85% of viewport height
- Visible drag handle bar (32×4px pill) at top of sheet, always present on mobile
- Drag down: sheet follows finger with `dragElastic: 0.2`
- Release: if dragged > 40% of sheet height OR velocity > 500px/s → dismiss with spring. Otherwise snap back.
- Backdrop: `useMotionValue` + `useTransform` maps sheet Y position to backdrop opacity (0.5 → 0 as sheet moves down)
- Tap backdrop → dismiss

**Implementation pattern:**
```tsx
const y = useMotionValue(0)
const backdropOpacity = useTransform(y, [0, sheetHeight * 0.5], [0.5, 0])

<motion.div
  drag="y"
  dragConstraints={{ top: 0 }}
  dragElastic={{ top: 0.05, bottom: 0.3 }}
  onDragEnd={(_, info) => {
    if (info.offset.y > sheetHeight * 0.4 || info.velocity.y > 500) {
      onClose()
    } else {
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 40 })
    }
  }}
  style={{ y }}
>
```

**Files:** `src/components/detail/DetailPanel.tsx`

### 2.2 Modal drag-to-dismiss — Modal.tsx base
Apply the same Framer Motion drag pattern to the base `Modal.tsx` component so all bottom-sheet modals (Add, Settings, Stats, Feedback, Reflection, Review) inherit drag-to-dismiss for free.

Mobile-only: `motion.div` wraps the panel on `< lg` breakpoint. Desktop modals remain unchanged (centred, no drag).

**Files:** `src/components/ui/Modal.tsx`

### 2.3 Pull-to-refresh
New `usePullToRefresh` hook:
- Attaches `onTouchStart`/`onTouchMove`/`onTouchEnd` to the scroll container ref
- Only activates when `scrollTop === 0` (prevents firing mid-scroll)
- Uses Framer Motion `useMotionValue` to drive a spinner reveal animation
- Threshold: 64px pull distance triggers refresh
- On release past threshold: calls `onRefresh()` → `queryClient.invalidateQueries(['bookmarks'])`
- Visual: spinner icon that rotates as pull distance increases, snaps back on release

**Files:** `src/hooks/usePullToRefresh.ts` (new), `src/components/layout/AppShell.tsx`

### 2.4 Reader mode swipe-to-close
Add horizontal drag gesture to `ReaderModal`:
- `drag="x"` with `dragConstraints={{ left: 0, right: window.innerWidth }}`
- Swipe right ≥ 80px OR velocity ≥ 400px/s → close
- Complements existing `history.pushState` + `popstate` back gesture (both paths call `onClose()`)
- Visual feedback: sheet translates with drag, slight opacity fade

**Files:** `src/components/reader/ReaderModal.tsx`

### 2.5 AnimatePresence for modal/route transitions
Replace all raw CSS `@keyframes slideUp` and `animate-[slideUp_0.2s_ease-out]` with `AnimatePresence` + `motion.div`:
- `initial={{ y: '100%', opacity: 0 }}` → `animate={{ y: 0, opacity: 1 }}` → `exit={{ y: '100%', opacity: 0 }}`
- Applied to: `Modal.tsx` (base), `DetailPanel.tsx`, `ReaderModal.tsx`
- Route transition (`App.tsx`): `AnimatePresence mode="wait"` wraps `<Routes>` for smooth Home ↔ Library slide

**Files:** `src/components/ui/Modal.tsx`, `src/components/detail/DetailPanel.tsx`, `src/components/reader/ReaderModal.tsx`, `src/App.tsx`

---

## Files Changed Summary

| File | Track | Change |
|------|-------|--------|
| `src/index.css` | 1 | `100dvh`, body overflow/overscroll, input font-size floor |
| `src/components/layout/MobileHeader.tsx` | 1 | Reduce to 3 buttons (Search, Settings, Add) |
| `src/components/layout/AppShell.tsx` | 1+2 | `overscroll-behavior: contain` on main; pull-to-refresh hook |
| `src/App.tsx` | 1+2 | `min-h-[100dvh]` loading state; `AnimatePresence` route wrapper |
| `src/pages/HomePage.tsx` | 1 | Overflow/height audit and fix |
| `src/components/ui/Modal.tsx` | 2 | Framer Motion drag-to-dismiss base |
| `src/components/detail/DetailPanel.tsx` | 2 | Full draggable bottom sheet |
| `src/components/reader/ReaderModal.tsx` | 2 | Swipe-right-to-close |
| `src/hooks/usePullToRefresh.ts` | 2 | New hook |
| Component audit (inputs) | 1 | `text-sm` → `text-base` on remaining form elements |

---

## Out of Scope
- Navigation swipe between Home ↔ Library (route-level horizontal swipe) — deferred, requires careful handling of router state
- Haptic feedback — Web Vibration API, deferred to a follow-up
- Drag-and-drop reordering on mobile — separate feature

---

## Testing
- All 264 existing Vitest tests must pass
- 4-theme verification (Light, Dark, Sepia, Navy) for all modified components
- Touch targets remain ≥ 44×44px
- Keyboard/accessibility not regressed — ESC close, focus trap in modals preserved
- Real-device target: iPhone 15, iOS Safari (primary); Android Chrome (secondary)
