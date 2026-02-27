# Phase 2: Trusted Curator (v3.5)

> Goal: from filing cabinet to trusted personal curator.
> Philosophy: read `docs/plan/philosophy.md` before building anything in this phase.

---

## Shipped (Pre-Phase 2 Cleanup — v3.3)

| Item | Version | PR |
|---|---|---|
| GitHub Issues sync — `create-github-issue` edge function, badge in FeedbackList | v3.2 | #23 |
| Sentry error tracking + full coverage (all 14 mutations, unhandledrejection) | v3.2 | #23, #26 |
| Obsidian Wikilinks — `[[tag]]` format in YAML frontmatter | v3.3 | #28 |
| Extended Themes — Sepia + Navy, 4-button picker in Settings | v3.3 | #29 |
| Race Condition & Metadata Tests | v3.3 | #30 |
| arXiv source type — API metadata, content.text, SQL migration | v3.3 | #31 |
| YouTube transcript extraction — caption scraping in `extract-content` | v3.3 | #32 |

---

## Deferred (Pre-Phase 2 Backlog)

These were planned but are not worth the effort relative to Phase 2's paradigm shift:

- **2.0.1 GitHub repository source type** — lower ROI; arXiv shipped instead
- **2.0.4 Feedback enhancements** — html2canvas screenshots, frequency dedup, analytics

---

## Build Order

The sequence matters. Each item unblocks the next.

```
1. Obsidian Plugin      ← closes the Reflect → Export loop. Makes "done" mean something.
2. Values Onboarding    ← states the user's constitution. Unlocks the scoring engine.
3. Scoring Engine       ← pure logic, fully testable. Unlocks the home screen.
4. New Home Screen      ← UI consuming the scoring engine. The paradigm inversion.
5. Post-Read Reflection ← completes the loop: Consume → Reflect. Unlocks Review.
                                                             ↓
                           (spaced review emerges naturally once reflections accumulate)
```

Each step is independently shippable. Don't wait for all five before shipping any one.

---

## 2.0 Obsidian Plugin

**Status:** Not started | **Priority:** PREREQUISITE

The loop: ContentDeck captures → Obsidian holds the knowledge. Without this, "done" items go nowhere permanent. The Review card becomes hollow — you'd be revisiting content with no notes rooted in your vault.

**Scope:**
- ContentDeck → Obsidian: auto-export when status changes to "done" (Markdown file + YAML frontmatter with tags, areas, URL, date, your notes)
- Obsidian → ContentDeck: save links from your vault directly into ContentDeck (plugin UI in Obsidian sidebar)
- Uses Obsidian Plugin API (TypeScript — same language as ContentDeck)
- Free to develop; free to publish on Obsidian Community Plugins

**Key design decisions:**
- Export format: same Markdown/YAML as current manual export, no format change
- Bidirectional: not just export — Obsidian can push URLs back to ContentDeck via the existing `save-bookmark` edge function (token auth already works)
- Conflict handling: ContentDeck is the source of truth for metadata; Obsidian is the source of truth for long-form notes

**Infrastructure note:** Enable pgvector on Supabase now (free, 30 seconds). Store the vector column on `bookmarks` even before embeddings are generated. Painful to add later, trivially cheap to add now.

---

## 2.1 Values Onboarding

**Status:** Not started | **Priority:** HIGH (unblocks scoring engine)

One-time setup. Three questions, asked once when the user first arrives at the new home screen. Never shown again unless manually reset.

**Questions:**
1. "Which areas matter most to you?" (multi-select from existing tag areas)
2. "What's a typical reading session for you?" — Quick (≤15 min) / Medium (30 min) / Deep (1h+)
3. "Any topics you want less of, even if you keep saving them?" (optional, multi-select)

**Storage:** `localStorage` key `contentdeck_values`. No new DB table needed for v1.

**Used by:** scoring engine for diversity enforcement and effort matching.

**Design principle:** these are the user's stated values, not preferences. The scoring engine treats them as constraints, not suggestions.

---

## 2.2 Scoring Engine

**Status:** Not started | **Priority:** HIGH

Pure client-side function. Zero infrastructure cost. Runs over the TanStack Query bookmark cache on every home screen render.

### Score Formula

```
score(bookmark, context) =
  staleness_score        × w1   // days since saved ÷ avg time-in-queue for this source type
  + diversity_bonus      × w2   // underrepresented area vs recent reads (last 7 items done)
  + effort_match         × w3   // reading_time vs current time-of-day/session-length preference
  + completion_affinity  × w4   // do you finish this source type? (derived from status_history)
  + topic_freshness      × w5   // recent done items in same area → momentum bonus
  + favorites_bonus      × w6   // is_favorited = fixed bonus
  - recency_penalty      × w7   // penalise items viewed/opened in last 48h
```

All inputs are computable from existing DB data. No new columns needed for v1 (except `last_reviewed_at` — see DB Changes).

### Interpretability Requirement

Every recommendation must carry a plain-English reason derived from the dominant score factor:

| Dominant factor | Example reason |
|---|---|
| staleness_score | "This has been waiting 21 days — longer than anything else in your queue." |
| diversity_bonus | "You've been reading a lot of AI content. Here's something different." |
| effort_match | "Short read (8 min) — fits the time you have right now." |
| completion_affinity | "You almost always finish articles from this source." |
| favorites_bonus | "You marked this as a favourite." |

The reason is not generated by AI. It is the human-readable rendering of the top score term. Fully deterministic, fully debuggable.

### Mood Override

Four-icon row on the home screen. One tap changes the weight vector. Default (no tap) uses time-of-day inference.

| Mode | Weight adjustment |
|---|---|
| 🔥 Deep dive | Boost effort_match for long-form; diversity_bonus reduced |
| 📖 Light read | Favour short reading_time; staleness weighted more |
| ⚡ Quick win | Hard filter: reading_time ≤ 15 min only |
| 🎲 Shuffle | diversity_bonus maxed; staleness ignored; favourites ignored |

### Context Signals (free, zero user input)

- **Time of day** — morning (focus), afternoon (medium), evening (light/wind-down)
- **Day of week** — weekday vs weekend (weekend unlocks long-form in primary slot)
- **Recent status_history** — what you've been reading this week

### Testing

The scoring engine is pure logic. Write tests for it before the UI exists:
- Known input → expected top item
- Diversity cap: same area cannot win twice in 3 consecutive calls
- Long-form suppressed on weekday evening context
- Mood override changes output deterministically

---

## 2.3 New Home Screen

**Status:** Not started | **Priority:** HIGH

Replaces `/` as the default route. The library moves to `/library`. The transition is additive — nothing is removed.

### Layout

```
  Good evening, Aditya                         [time]

  ┌──────────────────────────────────────────────────┐
  │  TONIGHT'S PICK                                  │
  │                                                  │
  │  [Title of recommended content]                  │
  │  [Source type] · [reading time / duration]       │
  │                                                  │
  │  [One-sentence reason this was chosen]           │
  │                                             [→]  │
  └──────────────────────────────────────────────────┘

  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐
  │  Continue       │  │  Quick win      │  │  Review          │
  │  [in-progress]  │  │  [≤15 min item] │  │  [past note]     │
  └─────────────────┘  └─────────────────┘  └──────────────────┘

  [🔥 Deep dive]  [📖 Light read]  [⚡ Quick]  [🎲 Shuffle]

                           Browse Library →
```

### Card Slots

| Slot | Source | Shown when |
|---|---|---|
| **Tonight's Pick** | Top scored unread item | Always |
| **Continue** | Highest scored `reading` status item | Any item is in `reading` status |
| **Quick win** | Top scored item with reading_time ≤ 15 min | Different from Tonight's Pick |
| **Review** | Top item from spaced review queue | User has any `done` items with notes |
| **Browse Library →** | Link to `/library` | Always |

### Route Architecture

- `/` → `<HomePage />` (new component)
- `/library` → existing `<Dashboard />` (zero changes)
- `<HomePage />` uses the same `useBookmarks` hook — no new data layer
- Values onboarding modal shown on first visit (`localStorage` flag)

### No Demo Mode for Home Screen

The home screen requires real data to be meaningful. Demo mode remains at `/library`. First-time visitors without an account land at the existing auth flow; demo is accessible from there.

---

## 2.4 Post-Read Reflection Prompt

**Status:** Not started | **Priority:** HIGH

When the user marks a bookmark as "done", a prompt appears before the status update completes.

### Design

```
  ┌────────────────────────────────────────┐
  │  What's your main takeaway?            │
  │                                        │
  │  [ 🎤 Speak ]  or type below...        │
  │                                        │
  │  ________________________________      │
  │  ________________________________      │
  │                                        │
  │  [Skip for now]        [Save & Done]   │
  └────────────────────────────────────────┘
```

### Voice Transcription

Uses the **Web Speech API** (built into Chrome/Android). No backend required. No cost.

```typescript
const recognition = new window.SpeechRecognition();
recognition.continuous = false;
recognition.onresult = (event) => {
  setText(event.results[0][0].transcript);
};
```

Works on: Chrome desktop, Chrome Android, Edge. Not supported on Firefox (graceful degradation: text-only).

### Storage

Saves as a note in the existing `notes` JSONB array on the bookmark. No new columns. Format:

```json
{
  "id": "uuid",
  "text": "The user's reflection text",
  "created_at": "ISO timestamp",
  "type": "reflection"   // new optional field to distinguish from regular notes
}
```

### Skip Behaviour

If the user taps "Skip for now", the bookmark is marked done immediately with no note. No friction, no guilt. The prompt is a suggestion, not a gate.

### Integration with Review

The `type: "reflection"` notes are what the Review card surfaces. A bookmark with no reflection note is deprioritised in the review queue — there's less to revisit.

---

## 2.5 Spaced Review (emerges from reflection accumulation)

**Status:** Not started | **Priority:** MEDIUM (after reflection prompt ships)

Once reflection notes exist on done items, the Review card slot becomes meaningful.

**Algorithm (SM-2 variant, client-side):**
- Items enter the review queue when marked done with a reflection note
- Initial review interval: 3 days
- "Still resonates" → interval × 2
- "Lost the thread" → interval reset to 3 days
- `last_reviewed_at` column tracks state (single DB migration)

**Review card UI:**
- Shows the reflection note from time of reading (not the full content)
- Framing: "3 weeks ago you wrote: [your words]. Does this still feel right?"
- Two actions: "Still resonates ✓" / "Lost the thread ↺"
- No re-reading required — the note is the artifact

---

## DB Changes Required

Minimal. One new column:

```sql
-- Migration: 20260227_trusted_curator.sql
ALTER TABLE bookmarks ADD COLUMN last_reviewed_at timestamptz;
```

Everything else uses existing columns:
- `notes` JSONB — reflection notes stored here, distinguished by `type: "reflection"`
- `status_history` — used for completion affinity calculation
- `status`, `created_at`, `started_reading_at`, `finished_at` — all used by scoring engine
- `metadata.reading_time`, `source_type`, `is_favorited` — all scoring inputs

Values onboarding: `localStorage` only. No DB table needed for v1.

---

## v4.0 Preview — Intelligence Layer (after v3.5 ships)

Once the scoring engine and reflection loop are established, the intelligence layer adds semantic depth:

**pgvector embeddings:**
- Generate embedding for each bookmark's `content.text` on save (via OpenRouter, free models)
- Store in `bookmarks.embedding vector(1536)` (enable pgvector extension on Supabase now)
- Used for: semantic similarity in Smart Connections, embedding-based scoring term

**Smart Connections:**
- "Related" section at bottom of detail panel
- Algorithm: cosine similarity on stored embeddings + tag overlap + source type affinity
- Computed client-side or via edge function; cached in `metadata.related_ids`

**Auto-Collections:**
- AI clusters bookmarks into suggested tag areas: "You have 8 articles about system design — create a collection?"
- Runs on-demand or weekly via pg_cron → edge function → OpenRouter
- One-click accept → creates area with pre-assigned bookmarks
