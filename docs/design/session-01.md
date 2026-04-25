# Design Overhaul Session 1 — Foundation

**Date:** 2026-04-25  
**Bundle:** `https://api.anthropic.com/v1/design/h/1ADyGRoVDpbQ-iYa6zrmXQ`  
**Phases implemented:** Phase 1 (all 4) + Phase 2 partial (4 of 5)  
**Tests before:** 481 · **Tests after:** 481  
**Build:** clean  

---

## Context

First-ever Claude Design session for ContentDeck. Claude Design audited the live codebase (v3.10.0) directly from the GitHub repo, extracted all tokens and component patterns, and produced:
- A full design system bundle (CSS variables, README spec, preview cards, interactive UI kit)
- A Phase 1 diff document with exact copy-paste code changes
- A 4-phase UI improvement roadmap with effort/impact ratings

No Figma was involved — all tokens were derived from the live codebase and codified into a formal design system for the first time.

---

## Phase 1 — Quick Wins (4/4 complete)

### 1. Card hover shadow
**File:** `src/components/feed/BookmarkCard.tsx`  
**Change:** `transition-colors` → `transition-[colors,box-shadow]`; added `hover:shadow-md` on unselected state and `shadow-sm` on selected state.  
**Why:** Cards previously only changed border color on hover — no depth signal. The shadow makes the list feel tactile and immediately communicates "clickable" without layout shift.

### 2. Sidebar icon + wordmark lockup
**File:** `src/components/layout/Sidebar.tsx`  
**Change:** Replaced the plain `<h1>ContentDeck</h1>` with a `<img src="/icon.svg" />` + wordmark `<h1>` side by side.  
**Why:** The app icon asset was already in `public/icon.svg` but unused in the UI. One change makes the sidebar feel like a product with brand identity, not a prototype.

### 3. Status badge discovery tooltip
**File:** `src/components/ui/Badge.tsx`  
**Change:** Added `STATUS_NEXT_LABEL` map; when `onClick` is provided, the badge now gets `title="Click to mark as {Next}"` in addition to its existing `aria-label`.  
**Why:** The click-to-cycle-status interaction is a power-user feature with zero discoverability. A native tooltip costs nothing and exposes the interaction on hover.

### 4. Detail panel header — echo the bookmark
**Files:** `src/components/detail/DetailPanel.tsx` (both mobile sheet + desktop panel headers)  
**Change:** Both "Details" headings replaced with `<SourceBadge source={...} /> + truncated title`. Added `SourceBadge` import.  
**Why:** "Details" provides zero context when you open the panel. The source badge + title immediately confirms you opened the right item without scrolling.

---

## Phase 2 — Visual Hierarchy (4/5 complete)

### 5. Card title weight
**File:** `src/components/feed/BookmarkCard.tsx`  
**Change:** `text-sm font-medium` → `text-base font-semibold` on the bookmark title `<h3>`.  
**Why:** Almost everything in the card used `text-sm`. Stepping the title up creates a visual anchor for the eye when scanning the list — domain/time metadata stays `text-xs` as the subordinate layer.

### 6. Primary pick card dominance
**File:** `src/pages/HomePage.tsx` (`PrimaryPickCard`)  
**Change:** Title stepped up from `text-[1.05rem] font-semibold` → `text-xl font-bold`. Added a `opacity-[0.04]` source-color tint overlay (`absolute inset-0`) on the entire card background.  
**Why:** The primary pick should feel *chosen*, not just listed. The tint visually ties the card to the source type; the bolder title creates clear hierarchy over secondary cards.

### 7. Secondary card subordination
**File:** `src/pages/HomePage.tsx` (`SecondaryCard`)  
**Change:** `p-4` → `p-3` padding on Continue / Quick Win / Review cards.  
**Why:** Secondary cards had the same visual weight as the primary pick. The reduced padding creates immediate spatial hierarchy — the primary card dominates, secondary cards are clearly supporting.

### 8. Source tab color dots
**File:** `src/components/feed/SourceTabs.tsx`  
**Change:** Added `SOURCE_COLORS` map; each non-"All" tab now renders a `6px × 6px` colored dot matching the source color before the label.  
**Why:** Plain text source tabs require reading each word. A colored dot gives instant visual discrimination — YouTube = red, Twitter = blue, etc. Much faster to scan.

---

## Deferred

### Phase 2 — Mood accent shift
When a mood is selected (🔥 Deep / ⚡ Quick / 🎲 Shuffle / 📖 Light), the primary pick card's left-bar color and tint should shift to reflect the mood rather than always tracking the bookmark's source color. Requires a mood-to-color palette and passing it down through `PrimaryPickCard`. Deferred for session 2.

### Phase 3 — Delight & Feedback
See `docs/design/INDEX.md` for full list. Requires deeper motion work and copy changes.

### Phase 4 — Signature Features
Sepia serif font, stats heatmap, Areas visual grid. Multi-session work.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/feed/BookmarkCard.tsx` | Shadow on hover/select + title size/weight |
| `src/components/layout/Sidebar.tsx` | Icon + wordmark lockup |
| `src/components/ui/Badge.tsx` | STATUS_NEXT_LABEL + title attribute |
| `src/components/detail/DetailPanel.tsx` | SourceBadge import + header replacement (both panels) |
| `src/components/feed/SourceTabs.tsx` | SOURCE_COLORS + colored dot indicators |
| `src/pages/HomePage.tsx` | PrimaryPickCard tint + title size; SecondaryCard p-3 |

---

## Quality Gates

```
npm run typecheck  ✅ (0 errors)
npm run lint       ✅ (0 errors, 6 pre-existing warnings)
npm run test       ✅ (481/481)
npm run build      ✅ (clean)
```
