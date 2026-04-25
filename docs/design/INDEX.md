# Design Overhaul — Index

> UI/UX overhaul sessions guided by **Claude Design** (claude.ai/design) and implemented by **Claude Code**. Each session starts with a design bundle export and produces concrete code changes.

---

## The Workflow

### How a session works

1. **Design phase** — Open [claude.ai/design](https://claude.ai/design), share the GitHub repo link, and let Claude Design audit the codebase and produce a design system bundle.
2. **Export** — Claude Design exports a `.tar.gz` bundle containing: `README.md`, `colors_and_type.css`, `phase1_diffs.html`, `ui_improvement_roadmap.html`, and UI kit prototypes.
3. **Implementation** — In Claude Code, provide the bundle URL (`https://api.anthropic.com/v1/design/h/...`) and say "implement the design system". Claude Code reads the bundle, extracts the diffs, and implements them.
4. **Verify** — `npm run typecheck && npm run lint && npm run test && npm run build` must all pass before committing.
5. **Document** — Add a session log here and update memory/CLAUDE.md.

### Bundle anatomy

```
contentdeck-design-system/
├── README.md                  ← Product context + full design spec (read first)
├── SKILL.md                   ← Agent skill definition
├── colors_and_type.css        ← CSS variables for all 4 themes
├── chats/chat1.md             ← Claude Design conversation transcript (intent lives here)
├── phase1_diffs.html          ← Exact copy-paste diffs for Phase 1 quick wins
├── ui_improvement_roadmap.html ← Full 4-phase roadmap with effort/impact ratings
├── assets/                    ← icon.svg, icon-180.png
├── preview/                   ← Color/type/component preview cards
└── ui_kits/web_app/           ← Interactive prototype (Home + Library)
```

### Rules for implementation sessions

- **Read `chats/chat1.md` first** — the transcript shows where the design landed after iteration. The HTML files are output; the chat is the intent.
- **Phase 1 always first** — quick wins in a single session, exact diffs provided.
- **4-theme verification** — any bg/text/border change must be checked in Light → Dark → Sepia → Navy before shipping.
- **Design system doc is canonical** — `docs/design/design-tokens.md` is the source of truth for tokens. `docs/reference/design-system.md` is legacy (code-derived); it will converge over time.
- **Never copy prototype internals** — the UI kits are HTML prototypes. Match the visual output; don't copy the structure.

---

## Session Index

| # | Date | Bundle | Phase | Items | Log |
|---|------|--------|-------|-------|-----|
| 1 | 2026-04-25 | `h/1ADyGRoVDpbQ-iYa6zrmXQ` | P1 complete · P2 partial | 8 changes | [session-01.md](session-01.md) |
| 2 | 2026-04-25 | `h/MGjdFGfpakM6fduJLkwDUA` | P2 complete | 2 changes | [session-02.md](session-02.md) |

---

## Roadmap Status

From the [UI Improvement Roadmap](ui-improvement-roadmap.md):

| Phase | Name | Status | Items |
|-------|------|--------|-------|
| 1 | Quick Wins | ✅ COMPLETE | 4/4 |
| 2 | Visual Hierarchy | ✅ COMPLETE | 5/5 |
| 3 | Delight & Feedback | ⬜ TODO | 0/4 |
| 4 | Signature Features | ⬜ TODO | 0/3 |

### Phase 3 — Delight & Feedback
- Empty queue: reward state (streak callout, completion count, CTA to add)
- Status cycle: micro-animation on Done (framer-motion green checkmark flash)
- Reflection modal: ceremonial feel (animated backdrop, hero text, "You finished it" heading)
- First-time user: inline onboarding on Home ("Add 3 bookmarks → get your first pick")

### Phase 4 — Signature Features
- Sepia theme: load warm serif font (Lora) for primary pick title + reader mode body
- Reading stats: GitHub-style heatmap, streak flame, personal best callout
- Areas view: full-bleed colored card grid with progress rings
