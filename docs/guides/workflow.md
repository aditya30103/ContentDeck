# ContentDeck — Software Engineering Workflow

> Your personal reference for thinking, structuring work, and prompting.
> Read this at the start of every session. Follow it earnestly.

---

## Table of Contents

1. [Core Philosophy](#core-philosophy)
2. [Where You Stand](#where-you-stand)
3. [The Practice Ladder](#the-practice-ladder)
4. [Session Workflow](#session-workflow)
5. [How to Think About Development](#how-to-think-about-development)
6. [Branching & Commits](#branching--commits)
7. [Quality Pipeline](#quality-pipeline)
8. [Claude Code Skills Reference](#claude-code-skills-reference)
9. [How to Prompt Effectively](#how-to-prompt-effectively)
10. [Version-Aligned Practices Roadmap](#version-aligned-practices-roadmap)
11. [Principles to Internalize Gradually](#principles-to-internalize-gradually)
12. [Checklists](#checklists)

---

## Core Philosophy

**Learn professional software development by doing it on a real project.**

ContentDeck is not just a bookmark manager — it is your training ground. Every feature you build, every bug you fix, every session you run is an opportunity to practice the habits that professional engineers use daily. The goal is not perfection on day one. The goal is that each version of ContentDeck is built with slightly more discipline than the last, until the practices become second nature.

Three principles guide everything:

1. **Structure before speed.** A feature shipped with tests, on a branch, through a PR, with a clean commit is worth more than three features hacked directly onto `main`. You are building the muscle, not just the product.

2. **Gradual adoption beats big-bang change.** Don't adopt 10 practices at once. Adopt 2-3, make them habitual, then add more. Each tier of the practice ladder builds on the last.

3. **Encode practices into tools.** If a practice matters, automate it. That's why the Claude Code skills (`/feature`, `/ship`, `/audit`) exist — they make the right workflow the default workflow, even when you're tired or moving fast.

---

## Where You Stand

### What you already do well

These are genuinely ahead of many solo developers:

- **Version control from day one** — every change tracked in git
- **Documentation culture** — CLAUDE.md, docs/INDEX.md, README, structured docs/ directory
- **Audit-before-shipping mentality** — you check your work
- **Phased engineering plan** — you think about the future, not just today
- **PWA-first distribution** — real-world deployment from v1
- **Free-tier constraint** — forces good architecture decisions

### What's now in place (as of v3.2)

| Practice | Status |
|----------|--------|
| ESLint (type-checked) | Configured, zero errors |
| eslint-plugin-jsx-a11y | Configured — a11y issues caught at lint time |
| Prettier | Configured, all files pass |
| EditorConfig | Configured |
| Conventional commits | Adopted |
| Quality pipeline | `format → lint → typecheck → test → build` |
| Feature branches + PRs | All work goes through branches, PRs to main |
| Vitest (unit + component) | 165 tests — unit + component across 12+ files |
| GitHub Actions CI | `.github/workflows/ci.yml` — runs on PR + push to main |
| Sentry error tracking | Active — all mutations, ErrorBoundary, unhandledrejection |
| Vercel Analytics + Speed Insights | Active — web vitals per route |
| `/feature` skill | Branch-to-PR workflow, mandatory tests + log creation |
| `/ship` skill | Quality pipeline + mandatory docs/log update |
| `/audit` skill | 9-category deep audit, async/cache/demo-parity emphasis |
| `/perf-check` skill | Build size, deployment config, type safety |
| `/supabase-migrate` skill | SQL migration file generation |
| Skills tracked in git | `.claude/skills/` committed |

### What's still missing (adopt per the roadmap below)

| Practice | When to Adopt |
|----------|---------------|
| CHANGELOG.md | With next major version |
| Staging environment | Vercel preview deploys are already free per-branch |
| Pre-commit hooks (lint-staged + husky) | With v3.5 |
| E2E tests (Playwright) | With v4.0 |

---

## The Practice Ladder

Adopt practices in tiers. Each tier should feel habitual before moving to the next.

### Tier 1 — Adopt Now (done)

**Linting + Formatting.** ESLint catches bugs. Prettier eliminates style debates. Together they mean every file in the codebase follows the same rules, and you never waste mental energy on formatting.

**Conventional Commits.** `feat:`, `fix:`, `docs:`, `chore:` prefixes. Imperative mood. Why, not what. This enables auto-generated changelogs later and makes git history readable at a glance.

**Quality Pipeline.** Before every commit: `format:check -> lint -> typecheck -> test -> build`. In that order. If any step fails, fix it before moving on. Never skip.

### Tier 2 — Adopted (v3.0) ✅

**Feature Branches + PRs.** All work happens on branches. PRs to `main`. Even solo this gives:
- Clean history of what each feature changed
- A place to review your own work before it goes live
- Easy rollback (revert a PR, not hunt through commits)
- Vercel gives you free preview deployments per branch

**Vitest (Unit + Component Tests).** 165 tests across 12+ files. Unit tests in `src/lib/`, component tests in `src/components/__tests__/` and `src/hooks/__tests__/`. All new features require tests.

**GitHub Actions CI.** `.github/workflows/ci.yml` runs `format → lint → typecheck → test → build` on every PR and push to `main`. Secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) configured in GitHub Actions settings.

### Tier 3 — Adopt Now / In Progress

**GitHub Issues. ✅ Now active.** Every bug, feature idea, and known gap is tracked as an issue with labels. The label system:
- **Type:** `type: feature`, `type: bug`, `type: chore`, `type: perf`, `type: docs`
- **Priority:** `priority: high` (this session), `priority: medium` (this phase), `priority: low` (someday)
- **Phase:** `phase: 1`, `phase: 2`
- **Area:** `area: mobile`, `area: ui`, `area: backend`, `area: testing`

Branch names include the issue number: `feat/4-full-text-search`. PRs close issues automatically via `Closes #N` in the PR body.

**Staging Environment.** Vercel preview deployments are already free. Every PR gets its own URL. Use it before merging to production.

**CHANGELOG.md.** Auto-generated from conventional commits. Deferred — revisit at next major version.

**Error Tracking (Sentry). ✅ Shipped v3.2.** Active in production — all mutation `onError` callbacks, ErrorBoundary, global `unhandledrejection` listener, and fire-and-forget `.catch()` chains.

---

## Session Workflow

### Starting a Session

1. **Read this file.** Remind yourself of the current practices and what you're working toward.
2. **Check `docs/INDEX.md`.** Know what's next on the roadmap.
3. **Decide your scope.** One feature, one fix, or one chore per session. Don't try to do everything.
4. **Use `/feature`** to start. It creates a branch, plans the work, and gets your approval before coding.

### During a Session

5. **Stay on your branch.** Don't touch `main` directly.
6. **Commit often.** Small, focused, conventional commits. Each commit should be one logical change.
7. **Run the quality pipeline** before each commit. If you're unsure, run it anyway.
8. **Update docs as you go.** Don't save docs for the end — you'll forget what changed.

### Ending a Session

9. **Use `/ship`** to wrap up. It runs all quality checks, updates docs, commits, and pushes.
10. **Create a PR** if your work is complete. `/feature` does this in Phase 4.
11. **If work is incomplete,** push the branch anyway. You can pick it up next session.

### Between Sessions

12. **Update MEMORY.md** with anything you learned that should persist. Mistakes, patterns, decisions.

---

## How to Think About Development

### The Mindset Shift

You are not just writing code. You are building a system that can be understood, verified, maintained, and extended — by you in six months, or by a contributor who's never seen it before.

Every time you write code, ask:

- **Can I verify this works?** If there's no way to check, it will break silently.
- **Will I understand this in 3 months?** If not, add a comment or simplify.
- **Is this the simplest solution?** Over-engineering is as bad as under-engineering.
- **Does this follow the existing patterns?** Consistency matters more than cleverness.

### On Testing

Tests are not bureaucracy. They are **executable documentation** — they describe what your code does, and they prove it works. When you write a test, you're saying: "This behavior matters enough that I want to know immediately if it ever breaks."

Start simple:
- Test the functions in `src/lib/` first. They're pure logic.
- Test one thing per test. Name tests like sentences: `"detects youtube.com URLs"`.
- Don't test implementation details. Test behavior.
- A test that runs is better than a comprehensive test suite that doesn't exist.

### On Branches and PRs

A branch is a safe space to experiment. You can break things, try approaches, change your mind — and `main` stays clean. A PR is a checkpoint: you look at the diff, verify the quality pipeline passes, and only then merge.

Even solo, PRs give you:
- A record of why each change was made (the PR description)
- A natural point to run the full quality pipeline
- The ability to revert cleanly if something goes wrong
- Preview deployments for testing before going live

### On Commit Messages

Your git history is a story. Each commit message is a sentence in that story. Future you will read this story when debugging a regression, understanding why a decision was made, or writing release notes.

Bad: `fix stuff`, `updates`, `wip`
Good: `fix: handle null title in metadata fetch`, `feat: add PWA share target for Android`, `chore: upgrade Tailwind to v4`

---

## Branching & Commits

### Branch Naming

```
feat/<issue>-<slug>    New feature        feat/4-full-text-search
fix/<issue>-<slug>     Bug fix            fix/7-mobile-stats
refactor/<slug>        Code restructure   refactor/extract-query-hooks
chore/<slug>           Tooling/config     chore/add-vitest
docs/<slug>            Documentation      docs/api-reference
```

### Commit Format

```
<type>: <description>

[optional body — explain why, not what]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`, `style`

### Rules

- One logical change per commit
- Stage specific files (never `git add -A` or `git add .`)
- Run quality pipeline before committing
- Push your branch regularly — it's your backup

---

## Quality Pipeline

Run in this exact order before every commit. Each step catches different problems.

```
1. npm run format:check    # Consistent formatting
2. npm run lint            # Code quality + type safety
3. npm run typecheck       # TypeScript strict mode
4. npm run test            # Tests pass
5. npm run build           # Production build works
```

Why this order?
- **Format first** — so lint doesn't flag formatting issues
- **Lint second** — catches bugs, enforces patterns
- **Typecheck third** — catches type errors lint might miss
- **Test fourth** — verifies behavior; catches logic bugs before the expensive build
- **Build last** — final production readiness check (most comprehensive)

If any step fails, fix it before moving to the next. Never skip a step.

---

## Claude Code Skills Reference

| Skill | When to Use | What It Does |
|-------|-------------|--------------|
| `/feature` | Starting new work | Creates branch (with issue number), plans, implements, verifies, ships via PR |
| `/ship` | End of session | Quality pipeline, mandatory docs/log update, commit, push |
| `/audit` | Before releases | 10-category quality audit — async, cache, demo parity, mobile parity |
| `/sync-docs` | When drift is sensed; end of each phase | Documentation reconciler — reads all docs, skills, memory, code; finds and fixes drift |
| `/test` | Writing tests | Unit vs component decision, codebase mock patterns, checklist |
| `/ui` | Building or reviewing UI | Component states, mobile parity table, touch targets, a11y, dark mode |
| `/perf-check` | After significant changes | Bundle size, deployment config, TTFB investigation |
| `/supabase-migrate` | Database changes | Generates SQL migration files following schema conventions |

### `/feature` Workflow (the main one)

```
/feature add user authentication with magic link
```

Phase 1 — PLAN: Create branch, explore codebase, write plan, get approval
Phase 2 — IMPLEMENT: Write code + tests following patterns
Phase 3 — VERIFY: format -> lint -> typecheck -> build -> test
Phase 4 — SHIP: Update docs, commit, push, create PR, show URL

### Key Insight

`/feature` is the **orchestrator** that calls the patterns from `/audit` and `/ship` at the right moments. It's not one giant process — it's a workflow that references your other skills.

- `/ship` = "package what I already built" (end of session)
- `/feature` = "plan, build, verify, and deliver from scratch" (start of session)

---

## How to Prompt Effectively

### Starting a Feature

Be specific about what you want. Give context about why.

```
Good:  "Add Supabase Auth with magic link login. Replace the current
        manual credentials setup. Users should enter their email and
        get a magic link. Session should persist across refreshes."

Bad:   "Add authentication"
```

### Asking for Help

Tell Claude what you've tried, what you expected, and what happened.

```
Good:  "The metadata fetch is failing silently for LinkedIn URLs.
        I expected fetchMicrolinkMetadata to return a title but it
        returns {}. The URL is https://lnkd.in/abc123."

Bad:   "LinkedIn doesn't work"
```

### Using Plan Mode

When starting non-trivial work, let Claude plan first. This prevents wasted effort.

```
You:   "I want to add full-text search to bookmarks"
Claude: [enters plan mode, explores codebase, presents approach]
You:   "Looks good, but use pg_trgm instead of tsvector"
Claude: [updates plan]
You:   "Approved"
Claude: [implements]
```

### The Power Move: Compose Skills

```
/feature add full-text search with pg_trgm
  -> [Claude plans, you approve, Claude implements]
  -> [Claude runs /audit on the changes]
  -> [Claude runs /ship to commit and push]
  -> [PR created, Vercel preview deployed]
```

---

## Version-Aligned Practices Roadmap

This is the master plan. Each version adopts new practices alongside new features.

### v2.2 — Foundation Tooling ✅

**Features:** Bookmarks, PWA share target, demo mode, Obsidian export
**Practices adopted:**
- [x] ESLint + Prettier
- [x] Conventional commits
- [x] Quality pipeline (`format -> lint -> typecheck -> build`)
- [x] Claude Code skills (`/feature`, `/ship`, `/audit`)
- [x] EditorConfig
- [x] Skills tracked in git

### v3.0 — Professional Development ✅

**Features:** Supabase Auth, content extraction, areas & tagging redesign, testing & CI
**Practices adopted:**
- [x] Feature branches + PRs for all work
- [x] Vitest unit + component tests (95 tests at Phase 1 close)
- [x] GitHub Actions CI (`format → lint → typecheck → test → build` on every PR)
- [x] GitHub Issues for work tracking — labels + issues, branch names include issue number
- [ ] CHANGELOG.md — deferred
- [ ] Vercel preview deployments as staging — available, use per-branch

### v3.2 (Current) — Observability & Hardening ✅

**Features:** Reader mode improvements, book capture, feedback capture, PWA auto-update, Sentry, GitHub Issues sync
**Practices adopted:**
- [x] Sentry error tracking — all mutations, ErrorBoundary, unhandledrejection (165 tests)
- [x] Vercel Analytics + Speed Insights
- [x] Hook tests in `src/hooks/__tests__/` (useFeedback, useBookmarks patterns)

### v3.5 — Quality at Scale

**Features:** AI summarization, smart content queue, spaced review
**Practices to adopt:**
- [ ] Test coverage reporting
- [ ] Pre-commit hooks (lint-staged + husky)

### v4.0 — Platform Reliability

**Features:** Browser extension, public API, webhooks, offline-first sync
**Practices to adopt:**
- [ ] E2E tests (Playwright — critical user flows)
- [ ] API contract tests
- [ ] Security audit automation
- [ ] Performance budgets in CI (fail build if bundle > threshold)
- [ ] Semantic versioning with auto-release

### v5.0 — Production Grade

**Features:** Public lists, collaboration, analytics
**Practices to adopt:**
- [ ] Load testing
- [ ] Database migration testing
- [ ] Feature flags
- [ ] Observability (structured logging, metrics)

---

## Principles to Internalize Gradually

These are not rules to memorize. They are habits to develop over time. Read through them, then focus on the ones marked for your current version. Revisit this list each version.

### Now (v2.2)

**1. Never ship without checking.**
Run the quality pipeline before every commit. No exceptions. This single habit catches 80% of bugs before they reach production.

**2. Commit messages are for future you.**
Write them as if you'll need to understand this change in six months with no other context. Because you will.

**3. Small changes, often.**
One commit = one logical change. If your commit message needs "and" in it, it's probably two commits.

**4. Read before you write.**
Always read existing code before modifying it. Understand the patterns. Follow them. Don't invent new ones unless the existing ones are genuinely wrong.

**5. Document decisions, not just code.**
When you choose approach A over approach B, write down why. Your CLAUDE.md, `docs/reference/audit.md`, and this file are where decisions live.

### v3.0

**6. Never commit to main.**
All work happens on branches. PRs are not overhead — they are the checkpoint where you verify your work meets the bar.

**7. If it's not tested, it's not done.**
Start with lib functions. One test is infinitely better than zero tests. You don't need 100% coverage — you need coverage on the code that matters.

**8. CI is your safety net.**
If the CI pipeline passes, you can merge with confidence. If it fails, you know before users do. Invest in CI early — it pays dividends forever.

**9. Track your work explicitly.**
GitHub Issues, not mental notes. When you think "I should fix that someday," create an issue. Your brain is for solving problems, not remembering them.

### v3.5

**10. Test behavior, not implementation.**
Don't test that a function calls another function. Test that given input X, the output is Y. Implementation changes; behavior contracts don't.

**11. Errors are data.**
With Sentry, every error in production becomes a signal. Not all errors need fixing — but you should know about all of them.

**12. Automate what you repeat.**
If you run the same manual check three times, automate it. Pre-commit hooks, CI checks, and skills exist for this reason.

### v4.0

**13. Design for the unhappy path.**
What happens when the network is down? When the API returns garbage? When the user does something unexpected? These edge cases define reliability.

**14. Performance is a feature.**
Set budgets. Measure. Fail the build if a budget is exceeded. Users notice when things are slow.

**15. Security is not optional.**
With a public API and real users, every input is untrusted. Validate at boundaries. Escape outputs. Review dependencies.

### v5.0

**16. Observability beats debugging.**
When something goes wrong in production, you shouldn't need to reproduce it locally. Structured logs, metrics, and traces tell you what happened.

**17. Ship confidently with feature flags.**
Big features ship behind flags. Roll out to 10% of users, verify, then 100%. If something breaks, flip the flag, not a revert.

---

## Checklists

### Before Starting Work

- [ ] Read this file (`docs/guides/workflow.md`)
- [ ] Check `docs/INDEX.md` for current priorities
- [ ] Decide scope: one feature, one fix, or one chore
- [ ] Use `/feature` to create branch and plan

### Before Every Commit

- [ ] `npm run format:check` passes
- [ ] `npm run lint` — zero errors
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run test` — all pass
- [ ] `npm run build` — clean build
- [ ] Commit message uses conventional format
- [ ] Only relevant files are staged

### Before Creating a PR

- [ ] All commits are conventional format
- [ ] Quality pipeline passes
- [ ] Docs updated (CLAUDE.md, README, AUDIT as needed)
- [ ] SW cache version bumped (if src/ changed)
- [ ] PR description has Summary + Test Plan

### Before Merging to Main

- [ ] CI passes (when available)
- [ ] Self-reviewed the diff
- [ ] No console.log or debugging artifacts
- [ ] No secrets or hardcoded credentials

### End of Session

- [ ] Use `/ship` to wrap up
- [ ] Push your branch (even if incomplete)
- [ ] Update MEMORY.md with lessons learned

---

## Project Document Map

| Document | Purpose | When to Update |
|----------|---------|----------------|
| **docs/guides/workflow.md** (this file) | Your development reference | When practices change |
| **CLAUDE.md** | AI assistant context | When architecture/patterns change |
| **docs/INDEX.md** | Session entry point + navigation hub | Each session |
| **docs/plan/phase-*.md** | Feature roadmap by phase | When features ship or priorities shift |
| **docs/log/*.md** | Implementation records | When features are shipped |
| **docs/reference/audit.md** | Bug tracking trail | When bugs are found/fixed |
| **README.md** | User-facing docs | When features or setup change |

---

*Last updated: v3.2 — Sentry + GitHub Issues sync shipped, 165 tests, full observability in production.*
*Next milestone: Pre-Phase 2 backlog (source types, Obsidian wikilinks, race condition tests), then Phase 2 (Intelligence).*
