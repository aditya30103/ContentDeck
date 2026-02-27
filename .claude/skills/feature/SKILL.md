---
name: feature
description: Professional feature development workflow — branch, plan, implement, verify, and ship via PR.
disable-model-invocation: false
---

# Feature Development Workflow

Complete workflow for developing features professionally: branch → plan → implement → verify → PR.

## Usage

```
/feature <description of feature or fix>
```

## Phase 1 — PLAN

**USE PLAN MODE FOR PHASE 1 - dig into the codebase, write a detailed implementation plan, and get user approval before writing any code.**

1. **Find or create a GitHub Issue** for this work:
   - Check existing issues: `gh issue list --repo aditya30103/ContentDeck`
   - If the issue exists, note its number (e.g. `#4`)
   - If not, create one: `gh issue create --title "..." --label "type: feature,phase: 1,priority: high"`
   - Use labels: `type: feature/bug/chore/perf/docs`, `phase: 1/2`, `priority: high/medium/low`, `area: mobile/ui/backend/testing`

2. **Create feature branch** from `main`, including the issue number:
   - `feat/4-full-text-search` for new features
   - `fix/7-mobile-stats` for bug fixes
   - `refactor/<issue>-<name>` for refactoring
   - `chore/<issue>-<name>` for tooling, deps, config

3. **Philosophy check** — before reading a single source file, open `docs/plan/philosophy.md` and run the Philosophy-First Feature Review:
   - Which of the 5 principles does this feature serve? (If none, stop and discuss.)
   - Does it help intentional-you or anxiety-you?
   - Does it close or strengthen the content loop?
   - Does it add user-visible complexity proportionate to its benefit?
   - Is it free?

4. **Explore codebase** to understand affected areas:
   - Read `docs/INDEX.md` and the active phase plan for current roadmap state
   - Read relevant source files
   - Identify all files that need changes
   - Check for existing patterns to follow

5. **Write implementation plan:**
   - Files to create/modify
   - Dependencies or migrations needed
   - Risks or edge cases
   - Testing approach (unit tests for lib/, component tests for UI)
   - Which docs/log/ entry will record this feature

6. **Get user approval** before writing any code.

## Phase 2 — IMPLEMENT

1. **Write code** following `CLAUDE.md` patterns:
   - Use existing conventions (TanStack Query, Supabase client, etc.)
   - Follow TypeScript strict mode
   - Maintain accessibility standards (44px touch targets, ARIA, focus-visible)
   - Use `type` imports for type-only imports

2. **Write tests** — this is mandatory, not optional:
   - Unit tests in `src/lib/*.test.ts` for any lib function changes
   - Component tests in `src/components/__tests__/` for complex UI logic
   - Name tests as sentences: `"shows error when URL is empty"`
   - Test behavior, not implementation

## Phase 3 — VERIFY

Run all quality checks in order — stop and fix if any fail:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

All five must pass with zero errors before proceeding to Phase 4.

## Phase 4 — SHIP

1. **Update documentation** — mandatory, not optional:
   - `docs/log/<version>-<feature>.md` — **always create/update this log** when a feature ships. Record: what was built, key decisions, files changed, gotchas.
   - `docs/INDEX.md` — add to shipped features table, update "Next up"
   - `docs/plan/phase-2.md` (or active phase) — mark completed items
   - `CLAUDE.md` — if architecture, patterns, or rules changed
   - `README.md` — if user-facing features changed
   - `docs/reference/audit.md` — if bugs were found/fixed

2. **Bump SW cache version** in `public/sw.js` if `src/` or `public/` changed.

3. **Commit** with conventional commit format:
   - `feat: <description>` — new feature
   - `fix: <description>` — bug fix
   - `refactor: <description>` — code restructuring
   - `chore: <description>` — tooling, deps, config
   - `docs: <description>` — documentation only
   - `test: <description>` — tests only
   - End with `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`

4. **Push and create PR**, linking to the issue:
   ```bash
   git push -u origin <branch-name>
   gh pr create --title "<conventional title>" --body "..."
   ```
   PR body must include:
   - `## Summary` — 1-3 bullet points
   - `## Test plan` — verification checklist
   - `Closes #<issue-number>` — auto-closes the issue when PR merges

5. **Show PR URL** to user.
