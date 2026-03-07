# ContentDeck Design System

> **Reference document for Claude Code.** When making UI changes, consult this file first.
> All patterns here are extracted from the live codebase — nothing aspirational.

---

## 1. Theme Architecture

ContentDeck has 4 themes. Two CSS mechanisms work together:

| Mechanism | Controls |
|-----------|----------|
| `.dark` on `<html>` | Activates all `dark:` Tailwind variant classes |
| `.sepia` / `.navy` on `<html>` | Overrides `--color-surface-*` and `--color-primary-*` CSS variables |

**Navy requires both classes** — `.navy` (palette) + `.dark` (variants). This is enforced in `src/hooks/useTheme.ts`:
```ts
document.documentElement.classList.toggle('dark', resolved === 'dark' || resolved === 'navy');
```

### Theme palette overview

| Token | Light | Dark | Sepia | Navy (dark) |
|-------|-------|------|-------|-------------|
| `surface-50` (page bg) | #fafafa | — | #fdf9f0 | — |
| `surface-900` (panel bg dark) | — | #18181b | — | #0a1f3d |
| `primary-600` (CTA) | #4f46e5 | — | #bf7d18 | #1a85d8 |

All 9 surface stops + 4 primary stops are defined in `src/index.css`. The `@custom-variant dark` declaration makes `dark:` variants respond to `.dark` on any ancestor.

### 4-theme verification rule

**Any PR that touches `bg-*`, `text-*`, `border-*`, or adds a new UI surface must be visually checked in all 4 themes before merging.** Use `npm run dev` and cycle with the theme button.

---

## 2. Color Tokens

### Surface scale (neutral — adapts per theme)

Use `surface-*` for all backgrounds, borders, and neutral text. Never use Tailwind's `zinc-*`, `gray-*`, or `slate-*` — they are hardcoded and bypass theme remapping.

| Token | Light value | Role |
|-------|-------------|------|
| `surface-50` | #fafafa | Page background, panel/card background |
| `surface-100` | #f4f4f5 | Hover states, inactive toggle bg |
| `surface-200` | #e4e4e7 | Borders, dividers, skeleton blocks |
| `surface-300` | #d4d4d8 | Scrollbar thumb (light) |
| `surface-400` | #a1a1aa | Secondary text, muted icons |
| `surface-500` | #71717a | Close/icon button color, placeholder text |
| `surface-600` | #52525b | Scrollbar thumb (dark), body text dim |
| `surface-700` | #3f3f46 | Active toggle bg in dark mode |
| `surface-800` | #27272a | Form input bg in dark mode, hover on dark |
| `surface-900` | #18181b | Panel/modal bg in dark mode |

### Primary scale (indigo — adapts per theme)

| Token | Light value | Role |
|-------|-------------|------|
| `primary-400` | #818cf8 | Primary text/icon in dark mode |
| `primary-500` | #6366f1 | Focus ring outline |
| `primary-600` | #4f46e5 | CTA buttons, active nav highlight fill |
| `primary-700` | #4338ca | Button hover state |

### Semantic colors (fixed — do not theme-remap)

| Token | Value | Role |
|-------|-------|------|
| `danger` / `red-600` | #ef4444 | Destructive actions |
| `success` / `green-600` | #22c55e | Confirmation states |
| `amber-400/500` | — | Reading status, favorites star |
| `green-400/500` | — | Done status |

### Source type colors (always vivid — never remapped)

```css
youtube:  #ff4444    twitter:  #1da1f2    linkedin: #0077b5
substack: #ff6818    blog:     #6366f1    book:     #4ecdc4    arxiv: #b31b1b
```

Source badge backgrounds use `bg-[#xxxxxx18]` (10% alpha of the brand color) so they read on any theme surface.

---

## 3. Container / Background Rules

This is the most drift-prone area. Follow these rules exactly:

### Panels, modals, cards, sidebars
```
bg-surface-50 dark:bg-surface-900
```
Applied in: Sidebar, MobileHeader, MobileNav, Modal, DetailPanel, BookmarkCard, AreaCard, HomePage cards, SettingsModal, AuthScreen feature cards, AuthScreen auth section.

### Sticky headers inside panels/modals
```
bg-surface-50 dark:bg-surface-900   (same as the panel — not transparent)
```
Sticky headers must repeat the panel bg so scrolled content doesn't bleed through.

### Form inputs, textareas, selects
```
bg-white dark:bg-surface-800
```
White inputs on cream (sepia) background is intentional UX contrast. Do NOT change to `bg-surface-50`.

### Hover states on interactive rows/buttons
```
hover:bg-surface-100 dark:hover:bg-surface-800
```

### Translucent fixed bars (MobileHeader, MobileNav)
```
bg-surface-50/80 dark:bg-surface-900/80 backdrop-blur-md
```

### Active toggle pill (view switcher, settings tabs)
```
bg-surface-50 dark:bg-surface-700   (the "selected" pill inside a bg-surface-100 dark:bg-surface-800 track)
```

---

## 4. Typography

System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`

### Usage by frequency (from codebase audit)

| Class | Count | Use |
|-------|-------|-----|
| `text-sm` | 116 | Body text, button labels, card content |
| `text-xs` | 111 | Metadata, badges, tags, timestamps, labels |
| `text-base` | 16 | Form inputs (prevents iOS zoom-on-focus) |
| `text-lg` | 10 | Modal/panel headings, app title |
| `text-xl` | 5 | Section headings |
| `text-2xl` / `text-3xl` | 2 each | Hero text (AuthScreen, HomePage) |

### Text color pattern

```
text-surface-900 dark:text-surface-100   — primary content (titles, body)
text-surface-600 dark:text-surface-400   — secondary (nav items, descriptions)
text-surface-500 dark:text-surface-400   — tertiary (close buttons, icons, placeholders)
text-surface-400 dark:text-surface-500   — muted (timestamps, counts)
```

**Rule:** All close buttons and standalone icon buttons must have an explicit text color class. Icons inherit ambient color which defaults to near-black in browsers — invisible against dark surfaces.

---

## 5. Border Radius Scale

| Class | Count | Use |
|-------|-------|-----|
| `rounded-lg` | 94 | Default for buttons, inputs, badges, chips, small interactive elements |
| `rounded-xl` | 18 | Cards (BookmarkCard, AreaCard, SecondaryCard, feature cards) |
| `rounded-2xl` | 5 | Modals, bottom sheets, DetailPanel |
| `rounded-full` | 19 | Pills (tag chips, area chips, circular icon buttons) |
| `rounded-md` | 9 | Toggle pills inside a track, small auxiliary elements |

**Decision rule:**
- Button → `rounded-lg`
- Card/surface → `rounded-xl`
- Modal/overlay panel → `rounded-2xl`
- Pill/tag → `rounded-full`

---

## 6. Shadow Scale

| Class | Count | Use |
|-------|-------|-----|
| `shadow-xl` | 3 | Modals, DetailPanel overlay — highest elevation |
| `shadow-lg` | 4 | Toasts, floating UI — secondary elevation |
| `shadow-sm` | 3 | Active toggle pill — subtle lift to indicate selection |

Panels attached to the layout edge (Sidebar, desktop DetailPanel) use borders instead of shadows.

---

## 7. Touch Targets

**Minimum: 44×44px on all interactive elements.** Enforced with `min-h-[44px]` and `min-w-[44px]`.

- Primary action buttons: always `min-h-[44px]`
- Icon-only toolbar buttons: `min-w-[44px] min-h-[44px]`
- Small inline buttons (inside cards): `min-w-[36px] min-h-[36px]` — acceptable when multiple fit in a row at normal density
- Bottom nav tabs: `min-h-[56px]` — extra large for thumb reach

---

## 8. Component Catalog

### Button (`src/components/ui/Button.tsx`)

```tsx
<Button variant="primary" size="md">Label</Button>
```

| Variant | Use | Classes |
|---------|-----|---------|
| `primary` | CTA, save, confirm | `bg-primary-600 hover:bg-primary-700 text-white` |
| `secondary` | Cancel, alternative action | `bg-surface-200 dark:bg-surface-700 text-surface-900 dark:text-surface-100` |
| `danger` | Destructive (delete, remove) | `bg-red-600 hover:bg-red-700 text-white` |
| `ghost` | Toolbar, low-emphasis | `hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-400` |

All sizes include `min-h-[44px]`. All variants include `disabled:opacity-50 disabled:cursor-not-allowed`.

### Badge (`src/components/ui/Badge.tsx`)

- **SourceBadge** — colored by source type using `bg-[#xxxxxx18] text-source-*`
- **StatusBadge** — neutral (unread), amber (reading), green (done); clickable variant cycles status

### Modal (`src/components/ui/Modal.tsx`)

- Sizes: `sm` (max-w-sm), `md` (max-w-lg), `lg` (max-w-2xl)
- Comes with: focus trap, ESC to close, backdrop click to close, body scroll lock, auto-focus first element, ARIA `role="dialog"` on inner panel
- Background: `bg-surface-50 dark:bg-surface-900`
- Close button: `text-surface-500 dark:text-surface-400`

### Toast (`src/components/ui/Toast.tsx`)

| Type | Classes |
|------|---------|
| `success` | `bg-green-600 dark:bg-green-700 text-white` |
| `error` | `bg-red-600 dark:bg-red-700 text-white` |
| `info` | `bg-surface-700 text-surface-100 dark:bg-surface-800` |

Auto-dismiss at 3 seconds. Use `useToast()` hook.

---

## 9. Accessibility Patterns

### Focus ring
```css
/* Global — index.css */
*:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}
```
Add `focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none` on complex interactive elements that need custom ring placement (e.g. cards).

### Motion
```
motion-safe:animate-[fadeSlideUp_0.25s_ease-out]   — entrance animations
motion-safe:animate-[slideUp_0.2s_ease-out]         — bottom sheet / modal slide up
```
`@media (prefers-reduced-motion: reduce)` zeroes all durations globally in `index.css`.

### ARIA rules
- Clickable cards: `<div role="button" tabIndex={0}>` — never `<article role="button">`
- Modal backdrop: plain `<div>` with no role; `role="dialog"` goes on the inner content panel
- `aria-modal="true"` and `aria-labelledby` required on dialog panels
- `aria-label` required on all icon-only buttons
- `aria-current="page"` on active nav items

### Scrollbars
```css
/* index.css — auto-adapts to all themes */
* { scrollbar-width: thin; scrollbar-color: var(--color-surface-300) transparent; }
.dark * { scrollbar-color: var(--color-surface-600) transparent; }
```

---

## 10. Animation Keyframes

Defined in `src/index.css`:

```css
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

`slideUp` is referenced but defined via Tailwind config (bottom-sheet entrance). Both are wrapped in `motion-safe:`.

---

## 11. Spacing Conventions

No formal spacing scale deviation — standard Tailwind units used consistently:

| Context | Padding |
|---------|---------|
| Panel/modal content | `p-4` |
| Card content (bookmark) | `p-3` |
| Card content (area, secondary) | `p-4` |
| Larger modal sections | `p-5` / `p-6` |
| Sticky header in modal/panel | `p-4` |
| Nav items | `px-3 py-2.5` |
| Footer/toolbar | `p-3` |
| Gap between stacked sections | `space-y-6` |
| Gap between cards in a list | implicit via `space-y-*` or `gap-*` on parent |

---

## 12. Safe Area (PWA / iOS)

CSS variables set in `:root`:
```css
--safe-top: env(safe-area-inset-top, 0px);
--safe-bottom: env(safe-area-inset-bottom, 0px);
```

Use in `style` props (not Tailwind classes) since values are dynamic:
```tsx
style={{ paddingBottom: 'calc(16px + var(--safe-bottom))' }}
style={{ paddingTop: 'calc(12px + var(--safe-top))' }}
```

Applied on: MobileHeader, MobileNav, Modal, DetailPanel bottom sheets, Toast container.

---

## Where things live

| What | File |
|------|------|
| CSS variables / theme overrides / scrollbars / keyframes | `src/index.css` |
| Theme switching logic | `src/hooks/useTheme.ts` |
| Button component | `src/components/ui/Button.tsx` |
| Badge components (Source, Status) | `src/components/ui/Badge.tsx` |
| Modal component | `src/components/ui/Modal.tsx` |
| Toast system | `src/components/ui/Toast.tsx` |
| Type definitions (SourceType, Status, NoteType) | `src/types/index.ts` |
