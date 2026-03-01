---
name: obsidian-plugin
description: Full lifecycle management of the obsidian-contentdeck plugin — debug, add features, release, and keep in sync with ContentDeck.
disable-model-invocation: false
---

# Obsidian Plugin Management

Manages the `aditya30103/obsidian-contentdeck` plugin repo alongside the ContentDeck main repo.

## Repos

| Repo | Local path | Purpose |
|---|---|---|
| ContentDeck | `D:/Projects/ContentDeck/` | Edge function (`sync-done`), `src/lib/obsidian.ts` |
| obsidian-contentdeck | `D:/Projects/obsidian-contentdeck/` | Plugin (`main.ts`), releases |

## Usage

```
/obsidian-plugin <task>
```

Examples:
- `/obsidian-plugin debug: sync fails silently on first install`
- `/obsidian-plugin add: show last-synced timestamp in settings`
- `/obsidian-plugin release: ship current changes as 1.1.0`
- `/obsidian-plugin check: verify plugin and edge function are in sync`

---

## Architecture Reference

### Plugin settings (stored in `data.json`)
- `supabaseUrl` — Supabase project URL (trailing slash stripped on save)
- `apiToken` — plaintext API token from ContentDeck Settings → API Tokens
- `vaultFolder` — subfolder inside this vault (default: `ContentDeck`)

### Sync flow
```
1. GET <supabaseUrl>/functions/v1/sync-done?token=<apiToken>
   → { bookmarks: Bookmark[] }  (done + synced=false, areas flattened)
2. For each bookmark:
   a. ensureFolder(vaultFolder/sourceFolder)  ← recursive, normalizePath
   b. vault.modify() or vault.create()
   c. push id to synced[]
3. POST sync-done?token=<apiToken> { ids: synced[] }
   → { marked: N }
```

### Vault folder structure (matches Phase A batch export and auto-export)
```
{vaultFolder}/
├── Videos/    ← youtube
├── Threads/   ← twitter
├── LinkedIn/  ← linkedin
├── Articles/  ← blog, substack
├── Books/     ← book
└── Papers/    ← arxiv
```

### Markdown format — identical to `src/lib/obsidian.ts generateMarkdown()`
YAML frontmatter: url, title, source, status, content_deck_id, favorited, areas (wikilinks), tags (wikilinks), created, started, finished, reading_time, channel, author, authors, arxiv_id

Sections: `# Title`, `> [Open original]`, `## Summary` / `## Abstract` (arXiv), `## Notes` (💡❓🖍️📝 subsections), `## Reflection`, metadata footer (duration | words | reading time)

**Critical invariant:** `generateMarkdown()` in `main.ts` must always produce identical output to `src/lib/obsidian.ts`. If either file changes, sync both.

### Edge function (`supabase/functions/sync-done/index.ts`)
- Same SHA-256 token auth as `save-bookmark`
- GET: joins `bookmark_tags → tag_areas`, flattens to `areas` array
- POST: scoped update (`eq('user_id', userId).in('id', ids)`)
- Deployed with `--no-verify-jwt`

---

## Phase A — B: What's where

| Feature | Where |
|---|---|
| Manual export (Export button on card) | `src/pages/Dashboard.tsx handleExport()` |
| Auto-export on mark-done | `src/hooks/useBookmarks.ts cycleStatus.onSuccess` |
| Batch export (Settings button) | `src/components/modals/SettingsModal.tsx` |
| Plugin sync (ribbon/command) | `D:/Projects/obsidian-contentdeck/main.ts syncBookmarks()` |
| Markdown generation | Both repos — must be kept identical |
| Vault Name setting | `obsidian_vault` localStorage (ContentDeck Settings) |
| Vault Folder setting | `obsidian_vault_folder` localStorage (ContentDeck) / `data.json` (plugin) |

---

## Debugging Workflow

### 1. Reproduce the issue
Read the error path only — don't tour the whole codebase.
- Plugin errors: check Obsidian → `Ctrl+Shift+I` → Console tab
- Edge function errors: Supabase Dashboard → Functions → sync-done → Logs
- Auth errors: verify token with `curl "https://gdmqqypburrocsirfnyr.supabase.co/functions/v1/sync-done?token=<token>"`

### 2. Common failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| "Configure ContentDeck Sync settings first" | Any setting is empty | Fill all 3 fields |
| "ContentDeck sync failed: Invalid token" | Token expired or wrong | Regenerate in ContentDeck Settings |
| "ContentDeck sync failed: Failed to fetch" | Network error or wrong Supabase URL | Check URL (no trailing slash, correct project ref) |
| Note written to wrong folder | `getSourceFolder()` mismatch between plugin and ContentDeck | Sync both repos |
| First sync creates no files, no error | `createFolder` failed silently on nested path | Upgrade to 1.0.5+ (`ensureFolder` fix) |
| Double-click ribbon fires sync twice | Missing `isSyncing` guard | Upgrade to 1.0.5+ |
| Markdown differs between Phase A and B | `generateMarkdown()` diverged | Audit both files, sync changes |

### 3. Curl test suite
```bash
# GET — should return done+unsynced bookmarks
curl "https://gdmqqypburrocsirfnyr.supabase.co/functions/v1/sync-done?token=<token>"

# POST — mark IDs synced
curl -X POST "https://gdmqqypburrocsirfnyr.supabase.co/functions/v1/sync-done?token=<token>" \
  -H "Content-Type: application/json" \
  -d '{"ids":["<bookmark-id>"]}'

# Invalid token — should return 401
curl "https://gdmqqypburrocsirfnyr.supabase.co/functions/v1/sync-done?token=badtoken"
```

---

## Adding Features

Before adding anything, check:
1. Does it belong in the plugin (Obsidian-side UX) or in ContentDeck (data/export logic)?
2. If it touches `generateMarkdown()`, update BOTH `main.ts` AND `src/lib/obsidian.ts`
3. If it touches the `sync-done` response shape, update both the edge function AND the `Bookmark` interface in `main.ts`

Plugin-side additions go in `main.ts` — all logic is in one file by design.
ContentDeck-side additions follow the standard `/feature` workflow.

---

## Release Workflow

**Rule: manifest version and git tag must always match. Update manifest FIRST, then tag.**

```bash
cd "D:/Projects/obsidian-contentdeck"

# 1. Make all changes to main.ts / other files

# 2. Bump version in BOTH manifest.json AND package.json to X.Y.Z
#    (edit both files before committing)

# 3. Build to verify
npm run build

# 4. Commit + push (no tag yet)
git add -A
git commit -m "feat/fix: <description>"
git push origin master

# 5. Tag as the same version — Actions build picks up the correct manifest
git tag X.Y.Z
git push origin X.Y.Z

# 6. Verify release built correctly (~45s)
sleep 45 && gh run list --repo aditya30103/obsidian-contentdeck --limit 2
gh release view X.Y.Z --repo aditya30103/obsidian-contentdeck
```

**Never tag before updating manifest.json — the tag always triggers the build, and the build uses the manifest that's in the commit at that tag.**

If the release assets have wrong manifest version, fix with:
```bash
npm run build
gh release upload X.Y.Z main.js manifest.json styles.css --clobber \
  --repo aditya30103/obsidian-contentdeck
```

---

## Sync-docs checklist (run after any plugin change)

- [ ] `generateMarkdown()` identical in `main.ts` and `src/lib/obsidian.ts`
- [ ] Folder mapping identical in `getSourceFolder()` (plugin) and `getFolder()` (ContentDeck)
- [ ] `safeFilename()` identical in both
- [ ] `Bookmark` interface in `main.ts` matches `src/types/index.ts`
- [ ] `docs/log/v3.4-obsidian-plugin-phase-b.md` updated with new changes
- [ ] Plugin `manifest.json` version == git tag == `package.json` version
- [ ] Memory (`MEMORY.md`) reflects latest release version

---

## Current state

- **Plugin version:** 1.0.5 (latest release)
- **Edge function:** deployed to `gdmqqypburrocsirfnyr` as `sync-done`
- **Installation:** BRAT → `aditya30103/obsidian-contentdeck`
- **Plugin repo:** `D:/Projects/obsidian-contentdeck/`
- **ContentDeck Settings fields:** Vault Name (obsidian_vault) + Vault Folder (obsidian_vault_folder)
