# Design Overhaul Session 2 — Phase 2 Complete

**Date:** 2026-04-25  
**Bundle:** `https://api.anthropic.com/v1/design/h/MGjdFGfpakM6fduJLkwDUA`  
**Phases implemented:** Phase 2 remainder (items 8 + 9)  
**Tests before:** 481 · **Tests after:** 481  
**Build:** clean  

---

## Context

Continuation of Session 1. Phase 1 was complete (4/4) and Phase 2 was 4/5 after Session 1. This session closes out Phase 2 by implementing the two remaining items: source tab color dots polish and mood-driven pick card accent shift.

---

## Phase 2 — Remaining (2/2 complete)

### 8. Source tab active-state dot fix
**File:** `src/components/feed/SourceTabs.tsx`  
**Change:** Added `flex items-center gap-1.5` to button className for proper dot alignment; changed dot color on active tab from the source color to `rgba(255,255,255,0.7)` so it reads cleanly against the indigo active pill background.  
**Why:** The session 1 implementation rendered the dot in source color on active tabs — a red dot against indigo is hard to read. Using semi-transparent white keeps the dot visible as an affordance without color clash.

### 9. Mood selector → pick card accent shift
**File:** `src/pages/HomePage.tsx`  
**Change:** Added `MOOD_ACCENT` constant mapping each non-default mood to a thematic color (Deep = amber `#f59e0b`, Light = emerald `#10b981`, Quick = green `#22c55e`, Shuffle = violet `#8b5cf6`). Added `moodAccentOverride: string | null` prop to `PrimaryPickCard`. When active, the override:
  - replaces `accentColor` used by the left-bar and tint overlay
  - sets `borderColor: ${color}40` (25% alpha) and `backgroundColor: ${color}06` (4% alpha) via inline style on the card
  - animates smoothly with `transition-[border-color,background-color] duration-300`

`PrimaryPickCard` is called with `moodAccentOverride={MOOD_ACCENT[mood] ?? null}` — `default` mood uses `null` so source color is preserved.  
**Why:** The mood selector was purely algorithmic — switching between 🔥 Deep / ⚡ Quick / 🎲 Shuffle / 📖 Light had no visual consequence on the card. The accent shift makes the mode feel real and embodied: picking "Deep dive" now turns the card amber, reinforcing focus.

---

## Mood Accent Colors

| Mood | Icon | Accent | Rationale |
|------|------|--------|-----------|
| Smart (default) | 🧠 | source color | Unchanged — source identity is preserved |
| Deep dive | 🔥 | `#f59e0b` (amber) | Focused, intense, warm |
| Light read | 📖 | `#10b981` (emerald) | Easy, refreshing, calm |
| Quick win | ⚡ | `#22c55e` (green) | Fast, satisfying, energetic |
| Shuffle | 🎲 | `#8b5cf6` (violet) | Playful, random, exploratory |

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/feed/SourceTabs.tsx` | Active tab dot → `rgba(255,255,255,0.7)`; button `flex items-center gap-1.5` |
| `src/pages/HomePage.tsx` | `MOOD_ACCENT` constant; `moodAccentOverride` prop on `PrimaryPickCard`; mood-driven card border/bg/bar/tint |

---

## Quality Gates

```
npm run typecheck  ✅ (0 errors)
npm run lint       ✅ (0 errors, 6 pre-existing warnings)
npm run test       ✅ (481/481)
npm run build      ✅ (clean)
```
