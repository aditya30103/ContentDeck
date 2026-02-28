# ContentDeck — Potential Integrations & Extensions

A list of free API integrations, plugins, and extensions that could enhance ContentDeck.

---

## High Value (Directly Relevant)

| Integration | What it does | Free Tier | Status |
|-------------|--------------|-----------|--------|
| **Mozilla Readability** | Extract article text, read time, author from URLs | Self-hosted in edge function | ✅ Shipped — `extract-content` edge function |
| **YouTube Data API** | Get video duration, channel info, thumbnails | 10,000 units/day | ✅ Shipped — metadata fetch |
| **Microlink API** | Rich link previews for generic URLs | 50 req/day free | ✅ Shipped — metadata fallback |
| **OpenRouter** | AI tagging via free LLMs (Llama, Gemma, Qwen) | Free models available | ✅ Shipped — auto-tagging |
| **GitHub API** | Create issues from in-app feedback | Unlimited (PAT auth) | ✅ Shipped — feedback sync |
| **Pocket API** | Import existing Pocket bookmarks | Unlimited | 🔲 Planned (deferred) |
| **Instapaper API** | Import existing Instapaper bookmarks | Unlimited | 🔲 Planned (deferred) |
| **Raindrop.io API** | Import/sync bookmarks | Free tier available | 🔲 Planned (deferred) |
| **LinkPreview.net** | Rich link previews (image, description) | 60 req/month free | 🔲 Not planned — Microlink covers this |
| **Open Graph scraping** | Pull og:image, og:description from URLs | Self-parse, free | 🔲 Covered by Microlink |

---

## Medium Value (Nice to Have)

| Integration | What it does | Free Tier |
|-------------|--------------|-----------|
| **Readwise API** | Sync highlights from Kindle/articles | Requires Readwise subscription |
| **Notion API** | Export bookmarks to Notion database | Free |
| **Obsidian (local)** | Export as markdown files via URI scheme, batch File System export, auto-export on mark-done | Free | ✅ Shipped — Phase A (export) + Phase B ([Community Plugin](https://github.com/aditya30103/obsidian-contentdeck)) |
| **IFTTT/Zapier webhooks** | Trigger actions on bookmark add | Limited free |
| **RSS feed generation** | Expose your bookmarks as RSS | Self-implement, free |
| **Archive.today / Wayback Machine** | Auto-archive bookmarked pages | Free |

---

## Browser Extensions

| Extension Idea | What it does |
|----------------|--------------|
| **Chrome/Firefox extension** | One-click save with popup preview (better than bookmarklet) |
| **Context menu "Save to ContentDeck"** | Right-click any link to save |
| **Highlight & save** | Select text → save quote + URL |

---

## Recommended Quick Wins

These require minimal effort and provide high impact:

### 1. ~~Read Time Estimation~~ ✅ Shipped
- `extract-content` edge function extracts article text via Readability
- Word count + reading time (`words / 238`) stored in `content` JSONB column
- Shown in Reader Mode and Detail Panel automatically

### 2. ~~Open Graph Images / Thumbnails~~ ✅ Partially shipped
- Microlink API fetches `og:image` for generic URLs
- YouTube thumbnails via oEmbed
- Lead image extracted from article HTML by Readability

### 3. Browser Extension
- Much better UX than bookmarklet
- Can show confirmation popup with title/tag selection
- Works on pages where bookmarklet is blocked (CSP restrictions)
- Manifest V3 for Chrome, WebExtensions for Firefox

---

## API Links

- Postlight Parser: https://github.com/postlight/parser
- Pocket API: https://getpocket.com/developer/
- Instapaper API: https://www.instapaper.com/api
- Raindrop.io API: https://developer.raindrop.io/
- YouTube Data API: https://developers.google.com/youtube/v3
- Microlink API: https://microlink.io/ ✅ integrated
- OpenRouter (AI): https://openrouter.ai/ ✅ integrated
- GitHub API: https://docs.github.com/en/rest ✅ integrated (feedback → issues sync)

---

## Notes

- All recommendations prioritize **free tiers** suitable for personal use
- Browser extension would be the biggest UX improvement
- Import from Pocket/Instapaper would help onboard users with existing collections
