# ContentDeck Design Tokens

> Canonical reference extracted by Claude Design from the live codebase (v3.10.0, 2026-04-25).  
> This supersedes `docs/reference/design-system.md` for token values — the reference doc remains authoritative for component patterns and theme architecture rules.

---

## Color System

### Surface Scale

| Token | Light | Dark | Sepia | Navy |
|-------|-------|------|-------|------|
| `surface-50` | `#fafafa` | `#fafafa` | `#fdf9f0` | `#f0f4ff` |
| `surface-100` | `#f4f4f5` | `#f4f4f5` | `#f9f3e3` | `#e0eaff` |
| `surface-200` | `#e4e4e7` | `#e4e4e7` | `#f0e6cc` | `#c7d8f8` |
| `surface-300` | `#d4d4d8` | `#d4d4d8` | `#e4d5b0` | `#a0bef0` |
| `surface-400` | `#a1a1aa` | `#a1a1aa` | `#c8b888` | `#6e9de0` |
| `surface-500` | `#71717a` | `#71717a` | `#a89060` | `#4a7dc8` |
| `surface-600` | `#52525b` | `#52525b` | `#7a6540` | `#3060a8` |
| `surface-700` | `#3f3f46` | `#3f3f46` | `#5c4828` | `#1e4580` |
| `surface-800` | `#27272a` | `#27272a` | `#3e2e15` | `#12305e` |
| `surface-850` | `#1e1e23` | `#1e1e23` | — | — |
| `surface-900` | `#18181b` | `#18181b` | `#261a08` | `#0a1f3d` |
| `surface-950` | `#09090b` | `#09090b` | `#150e04` | `#050f22` |

**Rule:** Never use `gray-*`, `zinc-*`, or `slate-*` — they bypass theme remapping.

### Primary Scale

| Token | Light / Dark | Sepia | Navy |
|-------|-------------|-------|------|
| `primary-400` | `#818cf8` | `#d4a340` | `#60b8ff` |
| `primary-500` | `#6366f1` (focus ring) | `#c0891e` | `#3ea0f0` |
| `primary-600` | `#4f46e5` (CTA) | `#bf7d18` | `#1a85d8` |
| `primary-700` | `#4338ca` (hover) | `#a06410` | `#0068b8` |

### Source Type Colors (fixed — never theme-remapped)

| Source | Hex | Tailwind class |
|--------|-----|----------------|
| YouTube | `#ff4444` | `text-source-youtube` |
| Twitter / X | `#1da1f2` | `text-source-twitter` |
| LinkedIn | `#0077b5` | `text-source-linkedin` |
| Substack | `#ff6818` | `text-source-substack` |
| Blog | `#6366f1` | `text-source-blog` |
| Book | `#4ecdc4` | `text-source-book` |
| arXiv | `#b31b1b` | `text-source-arxiv` |

Source badge bg: `bg-[#{hex}18]` — 10% alpha tint over any surface.

### Semantic Colors

| Role | Token |
|------|-------|
| Danger / destructive | `#ef4444` |
| Success | `#22c55e` |
| Status — Unread | `#a1a1aa` (surface-400) |
| Status — Reading | `#fbbf24` (amber) |
| Status — Done | `#4ade80` (green) |
| Note — Insight | `#fbbf24` |
| Note — Question | `#f87171` |
| Note — Highlight | `#4ade80` |
| Note — Note | `#818cf8` |

---

## Semantic Role Mapping

| Role | Light | Dark |
|------|-------|------|
| Page background | `surface-50` | `surface-950` |
| Panel / card / modal bg | `surface-50` | `surface-900` |
| Form input bg | `#ffffff` | `surface-800` |
| Hover row | `surface-100` | `surface-800` |
| Active nav fill | `primary-600/10` (color-mix) | same |
| Border — default | `surface-200` | `surface-800` |
| Border — hover | `surface-300` | `surface-700` |
| Border — active/selected | `primary-500` | `primary-500` |
| Text — primary | `surface-900` | `surface-100` |
| Text — secondary | `surface-600` | `surface-400` |
| Text — tertiary | `surface-500` | `surface-500` |
| Text — muted | `surface-400` | `surface-500` |
| Text — inverse | `#ffffff` | `#ffffff` |
| Icon button color | `surface-500` | `surface-400` |
| Translucent fixed bar | `surface-50/80` + backdrop-blur-md | `surface-900/80` + backdrop-blur-md |

---

## Typography

**Font stack:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`  
No custom typeface — native system fonts for PWA performance. (Exception pending for Phase 4 Sepia serif font.)

### Type Scale

| Class | Size | Use |
|-------|------|-----|
| `text-xs` | 12px | Metadata, badges, timestamps, section labels |
| `text-sm` | 14px | Body text, button labels, card metadata |
| `text-base` | 16px | Form inputs (prevents iOS zoom), **card titles** |
| `text-lg` | 18px | Modal / panel headings, app title |
| `text-xl` | 20px | Section headings, **primary pick title** |
| `text-2xl` | 24px | Hero text |
| `text-3xl` | 30px | Auth screen hero |

### Font Weights

| Weight | Class | Use |
|--------|-------|-----|
| 400 | `font-normal` | Body |
| 500 | `font-medium` | Buttons, secondary labels |
| 600 | `font-semibold` | **Card titles**, headings |
| 700 | `font-bold` | App title, **primary pick title**, nav brand |

### Letter Spacing

| Class | Value | Use |
|-------|-------|-----|
| `tracking-normal` | 0 | Body |
| `tracking-wide` | 0.025em | — |
| `tracking-widest` | 0.1em | MOOD, context section labels — uppercase only |

---

## Spacing

| Token | Value | Use |
|-------|-------|-----|
| `p-3` | 12px | Bookmark card padding, **secondary pick cards** |
| `p-4` | 16px | Panel / modal content, standard sections |
| `p-5` | 20px | **Primary pick card**, larger modal sections |
| `p-6` | 24px | — |
| `px-3 py-2.5` | — | Nav item padding |
| `space-y-6` | 24px | Gap between stacked sections |
| `gap-3` | 12px | Standard flex gap |

---

## Corner Radii

| Class | px | Use |
|-------|----|-----|
| `rounded-md` | 6px | Small auxiliary elements |
| `rounded-lg` | 8px | Buttons, action elements |
| `rounded-xl` | 12px | Cards, panels, thumbnails |
| `rounded-2xl` | 16px | Modals, overlays, primary pick card |
| `rounded-full` | ∞px | Pills, tags, dots |

---

## Shadows

| Class | Use |
|-------|-----|
| `shadow-sm` | Toggle selection pill, **selected card** |
| `shadow-md` | **Card hover state** |
| `shadow-lg` | Toasts |
| `shadow-xl` | Modals, overlays |

Panels attached to layout edges use **borders not shadows**.

---

## Animations & Motion

All wrapped in `motion-safe:` — disabled when `prefers-reduced-motion` is set.

| Name | Definition | Use |
|------|-----------|-----|
| `fadeSlideUp` | opacity 0→1 + translateY 8→0px, 0.25s ease-out | Primary card entrance, list items |
| `slideUp` | translateY 100%→0, 0.2s ease-out | Bottom sheets / modals |
| `fadeIn` | opacity 0→1 | Overlays |

Hover transitions: `transition-colors duration-150` — color-only, no transforms.  
Shadow transitions: `transition-[colors,box-shadow]` — when hover shadow is included.  
No bounce, no spring in standard UI. Springs used only in drag-gesture sheets (framer-motion).

---

## Component Anatomy

### Bookmark Card
```
rounded-xl border border-surface-200 dark:border-surface-800
bg-surface-50 dark:bg-surface-900 p-3
transition-[colors,box-shadow] cursor-pointer
// unselected: hover:border-surface-300 hover:shadow-md
// selected:   border-primary-500 bg-primary-600/5 shadow-sm
```
Title: `text-base font-semibold`  
Metadata: `text-xs text-surface-400`

### Primary Pick Card
```
relative rounded-2xl border border-surface-200 dark:border-surface-800
bg-surface-50 dark:bg-surface-900 p-5 overflow-hidden
```
- Left-edge source bar: `absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl` (source color)
- Source tint overlay: `absolute inset-0 opacity-[0.04]` (source color, pointer-events-none)
- Title: `text-xl font-bold`

### Secondary Pick Cards (Continue / Quick Win / Review)
```
rounded-xl border border-surface-200 dark:border-surface-800
bg-surface-50 dark:bg-surface-900 p-3 cursor-pointer
```
Title: `text-sm font-medium`  
Label: `text-xs font-medium` (colored per card type)

### Status Badge (clickable)
```
inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium
cursor-pointer hover:opacity-80 transition-opacity
title="Click to mark as {Next}"
aria-label="Status: {Current}. Click to advance."
```

### Source Tabs
Each non-"All" tab: `6×6px rounded-full` colored dot before label text.

### Sidebar
Header: `<img src="/icon.svg" width={22} height={22} className="rounded-[5px]" />` + `<h1 text-base font-bold>`

### Detail Panel Header (both desktop + mobile)
```jsx
<div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
  <SourceBadge source={bookmark.source_type} />
  <h2 className="text-sm font-semibold truncate">{bookmark.title || bookmark.url}</h2>
</div>
```

---

## Iconography

**Library:** Lucide React (stroke-style, never filled — except `Heart` with `fill="currentColor"` when favorited).

| Context | Size |
|---------|------|
| Nav / sidebar items | `size={18}` |
| Inline card actions | `size={16}` |
| Micro / metadata | `size={14}` |
| Header icons | `size={20}` |

Icon-only buttons always need `aria-label` and `min-w-[44px] min-h-[44px]`.  
Icons inherit color from parent — always set explicit `text-surface-500 dark:text-surface-400` on icon button containers.

---

## Focus & Accessibility

- Focus ring: `outline: 2px solid var(--color-primary-500); outline-offset: 2px` — on all `:focus-visible`
- Touch targets: min 44×44px everywhere; 56px for bottom nav
- Clickable cards: `role="button" tabIndex={0}` on `<div>` (not `<article>`)
- Modals: `role="dialog" aria-modal="true" aria-labelledby` on inner content panel (not backdrop)
- Backdrops: plain `<div>` with no role (keyboard users have ESC via document-level handler)
