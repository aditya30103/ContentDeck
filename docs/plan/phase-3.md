# Phase 3: Platform (v4.0)

> Goal: ContentDeck everywhere. Save from any context, access from any device.

## 3.1 Browser Extension (Manifest V3)
- **Chrome + Firefox** (same codebase via WebExtension API)
- Popup: current page title/URL, source detection, tag selection, one-click save
- Context menu: right-click any link → "Save to ContentDeck"
- Highlight mode: select text on any page → save as highlight note
- Side panel: browse your bookmarks without leaving the current tab
- Auth: uses Supabase session token from the main app
- Published on Chrome Web Store + Firefox Add-ons (both free)

## 3.3 Public API
- RESTful API via Supabase Edge Functions
- Endpoints: `/api/bookmarks`, `/api/areas`, `/api/search`
- API key authentication (generated in Settings)
- Rate limiting: 100 req/min per key
- OpenAPI spec auto-generated
- Enables: CLI tools, Zapier/IFTTT integration, third-party apps

## 3.4 CLI Tool
- `npx contentdeck save <url>` — save from terminal
- `npx contentdeck list --status=unread --source=youtube`
- `npx contentdeck search "react server components"`
- `npx contentdeck export --format=obsidian --area=engineering`
- Auth via `contentdeck login` (opens browser for OAuth)
- Published on npm (free)
