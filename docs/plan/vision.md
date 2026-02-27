# ContentDeck — Vision

> From personal bookmark manager to trusted personal curator.
> All components free-tier. No compromises on quality or reliability.

---

## The Paradigm Shift

ContentDeck began as a filing cabinet: save things, organise them, find them later.

ContentDeck is becoming a **trusted curator**: a system that understands your intellectual diet, surfaces the right thing at the right moment, and closes the loop from consumption to lasting knowledge.

The founding insight: a well-curated collection becomes its own source of anxiety when you interact with it as a list. The cure is not better organisation — it is intelligence that removes the need to browse.

Read `docs/plan/philosophy.md` for the full product philosophy that governs this shift.

---

## Where We Are (v3.3)

A solid foundation:
- Multi-source capture (articles, videos, papers, books, podcasts, tweets, GitHub)
- Auth (magic link + Google + GitHub OAuth), RLS, edge functions
- Content extraction (Readability), YouTube transcripts, arXiv metadata
- Reader mode, full-text search, notes, Obsidian export
- Areas & tags (two-tier model), status tracking, stats
- In-app feedback → GitHub Issues sync
- Sentry error tracking, CI/CD pipeline, 179 Vitest tests
- PWA: share target, bookmarklet, iOS Shortcut

The capture layer is largely complete. The intelligence layer has not yet begun.

---

## Where We're Going

```
v3.3 (now) ✅         v3.5 (next)              v4.0                   v4.5
─────────────────────────────────────────────────────────────────────────────
Capture layer     →   Trusted Curator       →   Intelligence Layer →   Platform
complete              Obsidian Plugin           Embeddings (pgvector)   Browser Extension
                      Values onboarding         Smart Connections        CLI tool
                      Scoring engine            Auto-Collections         Public API
                      New home screen           Semantic recommendations
                      Post-read reflection
                      Spaced review
```

Phase 4 (Social & Scale) is **frozen**. A social layer contradicts the personal retreat philosophy. If ContentDeck ever becomes multi-user at scale, revisit then — not before.

---

## Transition Strategy

The move from filing cabinet to curator is **additive and non-destructive**. Nothing is removed. Nothing breaks.

| Route | Content | Status |
|---|---|---|
| `/` | New home screen — the curator | New in v3.5 |
| `/library` | Existing ContentDeck, unchanged | Frozen after Obsidian Plugin ships |
| `/settings` | Settings modal, unchanged | Unchanged |

**Demo mode** stays on `/library` for showcase purposes. The new home screen requires real user data — a demo of a personalised system with no data would be meaningless. No demo mode is built for the new home screen.

**Existing users** (including those you've onboarded) see no breakage. The library is always one tap from the home screen.

---

## Architecture Evolution

### Current (v3.3)
```
Browser (React SPA) → Supabase REST API → PostgreSQL (RLS, triggers, full-text search)
                    → Supabase Edge Functions:
                         save-bookmark    (bookmarklet + iOS Shortcut, token auth)
                         extract-content  (Readability article extraction)
                         create-github-issue (feedback → GitHub Issues sync)
                    → OpenRouter (AI tagging — Llama 3.3 70B / Gemma 3)
                    → YouTube Data API + Twitter oEmbed + Microlink (metadata)
                    → Sentry (runtime error capture + source maps)
                    → Vercel Analytics + Speed Insights
```

### v3.5 (Trusted Curator)
```
Browser (React SPA) → [all of the above, unchanged]
                    → Scoring Engine (client-side, pure JS, over TanStack Query cache)
                    → Web Speech API (browser-native voice transcription, free)
                    → Obsidian Plugin (bidirectional sync via Obsidian plugin API)
```

### v4.0 (Intelligence Layer)
```
[all of v3.5]       → pgvector (Supabase free, semantic similarity)
                    → OpenRouter embeddings (stored per bookmark on save)
                    → Smart Connections (semantic similarity in detail panel)
                    → Auto-Collections (AI clustering via OpenRouter)
```

### v4.5 (Platform)
```
[all of v4.0]       → Browser Extension (Chrome + Firefox, Manifest V3)
                    → CLI tool (npx contentdeck)
                    → Public API (edge functions, API key auth)
```

---

## Key Architectural Principles

1. **Curator-first**: The home screen is a recommendation, not a library. The library is always accessible but never the default.
2. **Interpretable intelligence**: Every recommendation comes with a plain-English reason. The scoring engine is a named formula, not a black box.
3. **Client-side scoring**: The recommendation engine runs in the browser over the TanStack Query cache. No new infrastructure, no new API, no cost.
4. **Edge-first for heavy work**: Content extraction, AI tagging, Obsidian sync — all run at Supabase Edge Functions. Never block the UI thread.
5. **Offline-capable**: Service worker + TanStack Query cache for full read capability offline.
6. **Zero vendor lock-in**: Standard PostgreSQL, portable JSONB data, open formats (Markdown for Obsidian, YAML frontmatter for export).
7. **Free tier always**: Every external service must have a free tier sufficient for personal scale. Monthly cost: $0.00.
8. **Progressive enhancement**: Every feature degrades gracefully when optional inputs (mood, values config, API keys) are absent.
