---
name: ui
description: Systematic UI work — component states, mobile parity, accessibility, and design system compliance.
disable-model-invocation: false
---

# UI

Systematic guide for building and auditing UI in ContentDeck. Use this when building new components or auditing existing ones for quality.

## Usage

```
/ui <component name or area>      # Audit or build a specific component
/ui parity                        # Check mobile vs desktop parity
/ui audit                         # Full UI audit across the codebase
```

---

## Before Starting

**Read `docs/reference/design-system.md` first.** It is the canonical reference for all color tokens, container background rules, border radius, shadow scale, touch targets, typography, and component patterns. The rules below summarize the most critical checks — the design system doc has the full detail.

---

## Principle: Component-First, Not Screen-First

Don't think "fix the close button." Think "what are all the states this component needs, and are they all handled?" Build and review components in terms of their complete state surface, not individual visual complaints.

---

## Step 1: Component State Coverage

Every component that displays data must handle all four states. Read the component and verify each is implemented:

| State | What it looks like | What to check |
|-------|--------------------|---------------|
| **Loading** | Skeleton or spinner | Is it shown during async ops? Does layout shift when data arrives? |
| **Empty** | Empty state message | Is there a helpful message + CTA? Not just a blank space. |
| **Error** | Error message | Is it shown? Does it give the user an action (retry, reload)? |
| **Data** | Normal content | The happy path — is it correct? |

For each state, ask: **would a new user know what's happening and what to do?**

The `EmptyState` component (`src/components/ui/EmptyState.tsx`) is the standard — use it for empty and error states.

---

## Step 2: Mobile Parity Check

Desktop and mobile are separate component trees. Any new navigation item or action added to desktop must be manually added to mobile.

**Read both files:**
- `src/components/layout/Sidebar.tsx` — desktop nav + actions
- `src/components/layout/MobileNav.tsx` — mobile bottom tabs
- `src/components/layout/MobileHeader.tsx` — mobile top bar

**Current parity table:**

| Feature | Desktop | Mobile |
|---------|---------|--------|
| Add bookmark | Sidebar header button | MobileHeader + button |
| Search | FeedToolbar | MobileHeader search button |
| Unread / Reading / Done | Sidebar statusNav | MobileNav tabs |
| Favorites | Sidebar Star button | MobileNav Star tab |
| Areas/List toggle | Sidebar View section | MobileNav toggle button |
| Settings | Sidebar footer | MobileHeader gear button |
| Theme toggle | Sidebar footer | MobileHeader sun/moon button |
| Statistics | Sidebar footer | ❌ Not on mobile (known gap) |
| Sign Out | Sidebar footer | ❌ Not on mobile (via Settings modal) |
| All Bookmarks filter | Sidebar statusNav | ❌ Not in MobileNav (known gap) |

**Rule:** If you add a new item to Sidebar navigation or footer, check both `MobileNav.tsx` and `MobileHeader.tsx` before committing.

---

## Step 3: Touch Targets

All interactive elements on mobile must be at least 44×44px. This is enforced via `min-h-[44px]` + `min-w-[44px]` (or `min-h-[56px]` for bottom nav tabs).

Check:
- [ ] Every `<button>` has `min-h-[44px]` or is inside a container that provides it
- [ ] Bottom nav tabs use `min-h-[56px]` (extra height for thumb reach)
- [ ] Icon-only buttons have both `min-w-[44px]` and `min-h-[44px]`
- [ ] Clickable areas don't shrink on mobile viewports

---

## Step 4: Accessibility

- [ ] Every icon-only button has `aria-label` describing its action (not its icon): `aria-label="Delete bookmark"`, not `aria-label="trash"`
- [ ] Active nav items have `aria-current="page"`
- [ ] All interactive elements have `focus-visible:ring-2` (check the Tailwind classes)
- [ ] Form inputs have associated `<label>` elements (not just placeholder text)
- [ ] Modal: focus trap works (Tab cycles within), ESC closes, `role="dialog"` + `aria-modal="true"`
- [ ] Color is not the only way information is conveyed (status badges have text, not just color)

---

## Step 5: 4-Theme Compliance

ContentDeck has **4 themes** (Light, Dark, Sepia, Navy) — not just dark/light. Every UI change must work in all four. See `docs/reference/design-system.md` for the full token reference.

- [ ] No hardcoded Tailwind color classes (`text-gray-500`, `text-zinc-*`, `text-slate-*`) — use `surface-*` tokens only
- [ ] All colors use paired classes: `text-surface-600 dark:text-surface-400`
- [ ] No `bg-white` on panels/cards/modals — use `bg-surface-50` (sepia remaps this to warm cream; `bg-white` ignores it)
- [ ] All standalone icon/close buttons have explicit text color: `text-surface-500 dark:text-surface-400`
- [ ] Source type badge colors are defined in `src/index.css` as `--color-source-*` CSS variables — do not add new ones in component files (there is no `tailwind.config.ts`)
- [ ] After any bg/text/border change: cycle all 4 themes in `npm run dev` and verify

**Container background rules (from design-system.md):**

| Surface | Class |
|---------|-------|
| Panels, cards, modals, sidebar | `bg-surface-50 dark:bg-surface-900` |
| Form inputs, textareas, selects | `bg-white dark:bg-surface-800` (intentional white contrast) |
| Translucent fixed bars | `bg-surface-50/80 dark:bg-surface-900/80 backdrop-blur-md` |
| Hover state | `hover:bg-surface-100 dark:hover:bg-surface-800` |

**Text color pairs:**

| Use | Classes |
|-----|---------|
| Primary content | `text-surface-900 dark:text-surface-100` |
| Secondary / nav | `text-surface-600 dark:text-surface-400` |
| Icon / close buttons | `text-surface-500 dark:text-surface-400` |
| Muted / timestamps | `text-surface-400 dark:text-surface-500` |

---

## Step 6: Design Consistency

Read `docs/reference/design-system.md` as the canonical reference. Key rules:

- [ ] New components use existing patterns — don't invent new ones unless the existing ones are wrong
- [ ] Spacing: `p-3` for compact cards, `p-4` for panels/modals, `p-5`/`p-6` for prominent sections; `gap-3`/`gap-2` for rows; `space-y-6` for stacked sections
- [ ] Border radius: `rounded-lg` for buttons/inputs (94× usage), `rounded-xl` for cards (18×), `rounded-2xl` for modals/bottom-sheets (5×), `rounded-full` for pill tags/avatars
- [ ] Shadows: `shadow-xl` for modals/overlays, `shadow-lg` for toasts, `shadow-sm` for active toggle pill only — cards use borders, not shadows
- [ ] Typography: `text-sm` for body/buttons (116× usage), `text-xs` for metadata/badges/labels (111×), `text-base` for form inputs (prevents iOS zoom), `text-lg` for modal headings

---

## Output Format

For each component or area audited:

```
COMPONENT: <name>
File: src/components/...

States:
  Loading:  PASS / MISSING — [description]
  Empty:    PASS / MISSING — [description]
  Error:    PASS / MISSING — [description]
  Data:     PASS

Mobile parity: PASS / GAP — [what's missing]
Touch targets: PASS / FAIL — [which elements]
Accessibility: PASS / ISSUES — [list]
4-theme:       PASS / ISSUES — [list — check Light, Dark, Sepia, Navy]
Consistency:   PASS / ISSUES — [list]

Priority fixes:
  HIGH:   [issue + file:line]
  MEDIUM: [issue + file:line]
  LOW:    [issue + file:line]
```
