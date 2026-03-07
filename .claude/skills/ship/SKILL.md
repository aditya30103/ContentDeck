---
name: ship
description: End-of-session shipping routine. Lint, type-check, test, build, update docs, commit, and push.
disable-model-invocation: true
---

# Ship

End-of-session routine to verify, document, commit, and push all changes.

## Steps

### 1. Quality checks

Run these in sequence — stop if any fail:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

All five must pass with zero errors. Do NOT skip or reorder.

### 2. Update documentation

Check if any of these files need updates based on what changed this session:

- **`docs/log/<version>-<feature>.md`** — If a feature shipped this session, this log **must** exist. Create it if it doesn't. Include: what was built, key decisions, files changed, gotchas for future sessions.
- **`docs/INDEX.md`** — Shipped features table and "next up" status. Update if features were shipped.
- **`docs/plan/phase-1.md`** — Active roadmap. Mark completed items.
- **`CLAUDE.md`** — Architecture, key patterns, important rules. Update if new files, patterns, or conventions were added.
- **`README.md`** — User-facing docs. Update if features, setup steps, or project structure changed.
- **`docs/reference/audit.md`** — Bug tracking. Update if bugs were found and fixed.
- **`docs/reference/design-system.md`** — If any new UI pattern, token, component, or convention was established this session, update it here. The design system doc is only useful if it stays current.

If this session included UI changes: visually verify all 4 themes (Light, Dark, Sepia, Navy) in `npm run dev` before committing.

Only update what actually changed. But always check `docs/log/` — a missing log for a shipped feature is a documentation debt.

### 3. Bump service worker cache version

If any code in `src/` or `public/` changed, bump the `CACHE_NAME` version in `public/sw.js`. Follow semver:
- Patch (x.x.+1) for bug fixes
- Minor (x.+1.0) for new features
- Major (+1.0.0) for breaking changes

### 4. Commit

- Stage specific files (never `git add -A` or `git add .`)
- Use conventional commit format:
  - `feat:` new feature
  - `fix:` bug fix
  - `refactor:` code restructuring
  - `chore:` tooling, deps, config
  - `docs:` documentation only
  - `test:` tests only
- End with `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
- Use HEREDOC format for the message

### 5. Push

```bash
git push -u origin <current-branch>
```

### 6. Confirm

Show a summary table of what was shipped:
- Branch name
- Files changed (count)
- Commit hash + message
- Docs updated (which ones)
- Log created/updated (which file)
- All 5 quality checks: PASS/FAIL
