---
name: sync-docs
description: Documentation reconciler — reads all docs, skills, memory, and code to find and fix drift, inconsistency, and gaps across the entire information space.
disable-model-invocation: false
---

# Sync Docs

The documentation equivalent of `/audit`. Where `/audit` checks code health, `/sync-docs` checks documentation health — correctness, completeness, consistency, and alignment with code reality.

**Invoke when:** drift is sensed anywhere (stale doc, contradicting facts, missing log), at the end of every phase, or after a gap of multiple sessions.

## Usage

```
/sync-docs          # Full reconciliation across all layers
/sync-docs skills   # Focus: skill files only
/sync-docs memory   # Focus: MEMORY.md + CLAUDE.md context alignment
/sync-docs plans    # Focus: plans vs logs vs GitHub Issues
```

---

## The Information Stack

Each layer has a different relationship to reality. Code is the oracle — everything else describes it.

```
CODE (src/, supabase/, public/, .github/)  ← ground truth
  CLAUDE.md                                 ← architecture contract
  MEMORY.md                                 ← cross-session state
  docs/INDEX.md                             ← navigation hub + shipped table
  docs/plan/phase-*.md                      ← intended future
  docs/log/*.md                             ← historical record (append-only)
  docs/guides/workflow.md                   ← process instructions
  docs/reference/                           ← lookup tables
  .claude/skills/*/SKILL.md                 ← encoded workflows
  README.md                                 ← user-facing description
  GitHub Issues                             ← work tracking
```

---

## Phase 1 — INVENTORY

Build a complete map of what exists before reading any content.

**Run these commands:**
```bash
# All documentation files
ls docs/plan/ docs/log/ docs/guides/ docs/reference/

# All skill files
ls .claude/skills/

# GitHub Issues (all states)
gh issue list --repo aditya30103/ContentDeck --state all --limit 50 --json number,title,state,labels

# Test files (for count verification)
find src -name "*.test.ts" -o -name "*.test.tsx" | sort
```

**Build this manifest before proceeding:**

```
DOCUMENTATION MANIFEST
======================
Plan files:        [list]
Log files:         [list]
Guide files:       [list]
Reference files:   [list]
Skill files:       [list]
GitHub Issues:     [open: N, closed: N]
Test files:        [count]
```

**Flag immediately:**
- Plan files for features that have a log entry (stale plans — should be absorbed into phase-1.md or archived)
- Log files not referenced in `docs/INDEX.md` shipped table
- Skill directories without a `SKILL.md` inside

---

## Phase 2 — CODE GROUNDING

Read actual source files and verify specific factual claims made in docs. Code is the oracle — docs must match it, not the other way around.

### 2a. Package & CI pipeline

Read `package.json` (scripts section) and `.github/workflows/ci.yml`. Verify against every place the quality pipeline is described:

**Claimed pipeline** (must be identical in all locations):
```
npm run format:check → npm run lint → npm run typecheck → npm run test → npm run build
```

Check these files claim the same 5 steps in the same order:
- [ ] `CLAUDE.md` → Development Workflow → Quality Checks section
- [ ] `docs/guides/workflow.md` → Quality Pipeline section
- [ ] `.claude/skills/feature/SKILL.md` → Phase 3 VERIFY
- [ ] `.claude/skills/ship/SKILL.md` → Step 1 Quality checks
- [ ] `.github/workflows/ci.yml` → actual `run:` steps

Flag any that are missing the `test` step, use `npx` instead of `npm run`, or show a different order.

### 2b. Test infrastructure

Read `vite.config.ts` and glob `src/**/*.test.{ts,tsx}`.

Verify:
- [ ] `vite.config.ts` has `test:` block with `globals: true`, `environment: 'jsdom'`
- [ ] Actual test file count matches claimed count in `docs/log/v3.0-testing-ci.md` and `MEMORY.md`
- [ ] `src/test/setup.ts` exists and is referenced in `vite.config.ts` `setupFiles`
- [ ] `package.json` has both `test` and `test:watch` scripts

### 2c. Source structure vs CLAUDE.md architecture

Read `CLAUDE.md` architecture section. Verify against actual `src/` structure:
- [ ] All listed `src/` subdirectories exist
- [ ] All listed lib files exist (`supabase.ts`, `metadata.ts`, `ai.ts`, `obsidian.ts`, `tokens.ts`, `utils.ts`, `mock-supabase.ts`, `demo-data.ts`)
- [ ] Edge function path (`supabase/functions/save-bookmark/`) exists
- [ ] No new directories or significant files in `src/` that aren't mentioned

### 2d. Service worker strategy

Read `public/sw.js`. Verify the documented strategy:
- [ ] Network-first for navigation requests (HTML pages)
- [ ] Stale-while-revalidate for assets
- [ ] `CACHE_NAME` version is present (note the current version for comparison)
- [ ] Supabase/API URLs bypass the cache entirely

### 2e. Branching convention vs skills

Read `.claude/skills/feature/SKILL.md`. Verify it matches `CLAUDE.md` and `docs/guides/workflow.md` on:
- [ ] Branch naming includes issue number (`feat/4-full-text-search`) — this is the current convention
- [ ] Co-Authored-By says `Claude Sonnet 4.6` in ALL skill files (not Opus)
- [ ] `npm run` used everywhere, not `npx prettier` or `npx eslint` directly

### 2f. GitHub Issues vs MEMORY.md "next priority"

Read `MEMORY.md` and compare to open GitHub Issues:
- [ ] The feature listed as "next priority" in `MEMORY.md` has an open GitHub Issue
- [ ] No open issue describes something that has already shipped (check log files)
- [ ] Issues #4, #5, #6, #7, #8 are all still appropriately open

---

## Phase 3 — CROSS-DOCUMENT CONSISTENCY

Find every fact stated in more than one document and verify they agree. A fact stated two different ways is a lie in at least one place.

### 3a. Test counts

The test count appears in: `MEMORY.md`, `docs/INDEX.md` (shipped table), `docs/log/v3.0-testing-ci.md`, `docs/guides/workflow.md`. Find every occurrence and verify they all state the same numbers (currently: 95 total, 62 unit, 33 component).

### 3b. Shipped feature list

These features are claimed as shipped. Verify the same set appears in all three places:

| Feature | docs/INDEX.md | docs/log/ file | docs/plan/phase-1.md marked done |
|---------|--------------|----------------|----------------------------------|
| Testing & CI (1.6) | ? | v3.0-testing-ci.md | ? |
| Areas & tagging redesign | ? | v3.0-areas-tagging-redesign.md | ? |
| Content extraction (1.2b) | ? | v3.0-content-extraction.md | ? |
| Metadata fix (1.2a) | ? | v3.0-metadata-fix.md | ? |
| iOS Shortcut (1.1b) | ? | v3.0-ios-shortcut.md | ? |
| Bookmarklet (1.1a) | ? | v3.0-bookmarklet.md | ? |
| Supabase Auth (1.1) | ? | v3.0-auth.md | ? |

### 3c. "Next priority" alignment

The next thing to build is stated in: `MEMORY.md`, `docs/INDEX.md`, `docs/plan/phase-1.md`. Verify all three agree and it matches an open GitHub Issue.

### 3d. Skills — co-author, npm scripts, and stale references

Read all skill files. Every skill must:
- Use `npm run <script>` not `npx <tool>`
- Reference `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` (not Opus)
- Not reference deleted files (`ENGINEERING-PLAN.md`, `UPGRADE-PLAN.md`, `AUDIT.md`, `WORKFLOW.md`)
- Not reference `tailwind.config.ts` — that file does not exist. Tailwind v4 is configured via `@theme` in `src/index.css`.

### 3e. CLAUDE.md vs workflow.md vs skills — branching convention

All three must agree on branch naming. Current convention: `feat/<issue-number>-<slug>`. If any still show the old `feat/<slug>` format without issue numbers, flag it.

### 3f. Stale plan files

Check `docs/plan/` for any files describing features that have already shipped (i.e., have a log entry). Example: `docs/plan/phase-1.2b-extraction.md` — content extraction shipped, this plan file may be stale.

---

## Phase 4 — COMPLETENESS CHECK

For every feature that has shipped, the full cascade must be complete. A partial cascade is a documentation debt.

### 4a. Cascade integrity — for each shipped feature

For each feature in the shipped table, verify all five cascade steps fired:

```
Feature ships →
  ✅ docs/log/<version>-<feature>.md created (append-only record)
  ✅ docs/INDEX.md shipped table has a row
  ✅ docs/plan/phase-1.md marks the item done
  ✅ MEMORY.md current status reflects it
  ✅ GitHub Issue closed (if one existed at time of shipping)
```

Any missing step is a `[MEDIUM]` finding.

### 4b. Missing logs

For every item marked as shipped or completed in `docs/plan/phase-1.md`, verify a `docs/log/` file exists. A shipped feature with no log is institutional knowledge lost.

### 4c. Orphaned logs

For every `docs/log/*.md` file, verify it appears in `docs/INDEX.md` shipped table. A log that isn't indexed is undiscoverable.

### 4d. Open GitHub Issues vs plans

For every open GitHub Issue, verify:
- The feature it describes is NOT already in `docs/log/` (would mean it shipped without closing the issue)
- It corresponds to a real item in `docs/plan/phase-1.md` or later phases

### 4e. MEMORY.md completeness

`MEMORY.md` is loaded into every session. Verify it accurately reflects:
- Current status (what was last shipped)
- Next priority (what's next)
- Key learnings (nothing critical is missing from recent sessions)
- Development workflow (quality pipeline steps, co-author model, CI secrets status)

---

## Phase 5 — REMEDIATION

Classify every finding, then act.

### Severity classification

| Severity | Definition | Action |
|----------|-----------|--------|
| `[CRITICAL]` | Factually wrong claim that will cause incorrect AI behaviour or broken dev workflow | Fix immediately, flag to user |
| `[HIGH]` | Significant drift — wrong pipeline steps, missing log for shipped feature, wrong co-author | Fix immediately |
| `[MEDIUM]` | Incomplete cascade, stale "next priority", orphaned file | Fix with user awareness |
| `[LOW]` | Minor wording inconsistency, stale date, cosmetic | Auto-fix silently |

### What to AUTO-FIX (make the edit, show a diff summary)

- Incorrect co-author name in skill files (`Opus` → `Sonnet`)
- Wrong `npx` command in skills → `npm run`
- Missing checkboxes in `docs/plan/phase-1.md` for verified-shipped items
- Stale "next up" in `docs/INDEX.md` when it's clear from logs what's next
- References to deleted files (`ENGINEERING-PLAN.md` etc.)
- GitHub Issue: close an issue whose feature is confirmed shipped (with `gh issue close`)

### What to FLAG FOR REVIEW (describe the problem, show the fix, ask before applying)

- CLAUDE.md architecture section changes (impacts every session)
- MEMORY.md current status rewrites (narrative, not mechanical)
- Deleting or archiving any `docs/plan/` or `docs/log/` file
- Any change that alters the meaning of a doc, not just its accuracy

### What to FLAG-ONLY (report but don't touch)

- Code patterns that contradict docs (the code may need to change, not the doc)
- Missing features that were planned but never started (correct to be open)
- Anything ambiguous — where two interpretations are both plausible

---

## Output Format

```
SYNC-DOCS REPORT — <date>
==========================

FILES READ:
  Docs:    N files
  Skills:  N files
  Code:    N files
  GitHub:  N issues (N open, N closed)

PHASE RESULTS:
  1. Inventory           [CLEAN / N findings]
  2. Code Grounding      [CLEAN / N findings]
  3. Cross-consistency   [CLEAN / N findings]
  4. Completeness        [CLEAN / N findings]

FINDINGS:
  [CRITICAL] ...
  [HIGH] ...
  [MEDIUM] ...
  [LOW] ...

REMEDIATION:
  Auto-fixed:     N items
    - <description of each fix>
  Needs review:   N items
    - <description, proposed fix, awaiting approval>
  Flag only:      N items
    - <description, reason not auto-fixed>

DOCUMENTATION HEALTH: CLEAN / DRIFTED / CRITICAL
```

After remediation, commit any auto-fixes:
```bash
git add <specific files changed>
git commit -m "docs: sync documentation to code reality — <N> drift corrections

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Known Drift Vectors (update as new patterns emerge)

These are the historical causes of drift in this project. Check these first during any run:

1. **Skills not updated when npm scripts change** — skills use `npx tool` instead of `npm run script`
2. **Logs not created when features ship** — session ends, log step skipped
3. **Plan items not marked done** — feature ships, phase-2.md checkboxes left open
4. **MEMORY.md not updated at session end** — stale "next priority" or "current status"
5. **INDEX.md shipped table not updated** — feature ships, table row not added
6. **Co-author model drift** — model name changes, not updated in all skill files
7. **Stale plan files** — plan file created for a feature, feature ships, plan file left open
8. **GitHub Issues not closed on merge** — `Closes #N` missing from PR body
9. **CLAUDE.md architecture not updated** — new `src/` file added, not listed in architecture
10. **Branch naming convention evolves** — docs/skills not updated to match new convention
11. **philosophy.md not consulted** — feature built without philosophy-first review; may contradict a core principle
12. **Scoring engine undocumented** — `src/lib/scoring.ts` changes not reflected in phase-2.md scoring formula docs
13. **Route architecture drift** — new routes added without updating the `/` → home, `/library` → library convention in vision.md and phase-2.md
14. **Theme token drift** — new UI surfaces added using `bg-white` (ignores sepia remapping) or `zinc-*`/`gray-*`/`slate-*` tokens (hardcoded, bypass CSS variable theming) instead of `surface-*` tokens; or `tailwind.config.ts` referenced (does not exist — Tailwind v4 is CSS-first via `src/index.css`)
15. **design-system.md not updated** — new UI pattern established but `docs/reference/design-system.md` not updated to reflect it
