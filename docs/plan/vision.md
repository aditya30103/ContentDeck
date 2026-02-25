# ContentDeck — Vision & Architecture

> From personal bookmark manager to full-stack knowledge capture platform.
> All components free-tier. No compromises on scale, security, or reliability.

---

## Vision

ContentDeck today: a personal bookmark manager with status tracking and Obsidian export.

ContentDeck tomorrow: **the bridge between consuming content and building knowledge** — a platform where you capture anything, an AI helps you understand it, and your insights flow into your permanent knowledge system.

```
v3.2 (now) ✅     v3.5 (next)        v4.0               v5.0
Auth + PWA    →  AI Intelligence →  Multi-platform →   Social
Edge functions   Summarize, link    Extension, API     Public lists
Reader mode      Smart queue        Offline-first      Collaboration
Sentry + CI      Spaced review      Webhooks           Analytics
GitHub sync      Chat with library
```

---

## Architecture Evolution

### Current (v3.2)
```
Browser (React SPA) → Supabase REST API → PostgreSQL (RLS, triggers, full-text search)
                    → Supabase Edge Functions:
                         save-bookmark    (bookmarklet + iOS Shortcut, token auth)
                         extract-content  (Readability article extraction)
                         create-github-issue (feedback → GitHub Issues sync)
                    → OpenRouter (AI tagging — Llama 3.3 70B / Gemma 3)
                    → YouTube Data API + Twitter oEmbed + Microlink (metadata)
                    → GitHub API (issue creation from in-app feedback)
                    → Sentry (runtime error capture + source maps)
                    → Vercel Analytics + Speed Insights
```

### Target (v5.0)
```
Browser Extension ─┐
React PWA ─────────┤
iOS Shortcut ──────┼→ Supabase (Auth + RLS + Edge Functions + Realtime)
Telegram Bot ──────┤     ├→ PostgreSQL (full-text search, JSONB, pg_cron)
CLI Tool ──────────┘     ├→ Supabase Storage (article snapshots, PDFs)
                         ├→ Edge Functions (content extraction, AI pipeline)
                         └→ Realtime (live sync across devices)
                    → OpenRouter (summarize, tag, recommend, chat)
                    → GitHub Actions (scheduled jobs, health checks)
```

### Key Architectural Principles
1. **Edge-first**: Processing at Supabase Edge Functions, not client-side
2. **Offline-capable**: Service worker + IndexedDB for full offline CRUD
3. **Event-driven**: Database triggers + webhooks for automation pipelines
4. **Progressive enhancement**: Every feature degrades gracefully without API keys
5. **Zero vendor lock-in**: Standard PostgreSQL, portable data, open formats
