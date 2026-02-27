# ContentDeck — Product Philosophy

> The "why" that governs every decision. Read this before planning any feature.
> Written 2026-02-27, from a deep brainstorming session on the future of ContentDeck.

---

## The Mission

ContentDeck exists to help you be the reader you intend to be — not the reader anxiety makes you.

It is a **commitment device with a nutritionist's judgment**: it surfaces the right content at the right moment, enforces the intellectual diet you said you wanted (not just the one your in-the-moment preferences would produce), and closes the loop from consumption to reflection to recall.

---

## The Two Selves

Every design decision must serve the intentional self, not the anxious one.

**Anxiety-you:**
- Avoids long-form content because the opportunity cost feels too high
- Over-consumes content from a single topic (AI news) driven by FOMO
- Browses the library instead of committing to one thing
- Feels guilty looking at the unread pile
- Opens the app and closes it without engaging with anything

**Intentional-you:**
- Goes deep on one thing at a time
- Maintains a diverse intellectual diet across areas
- Commits to a session before opening the library
- Occasionally revisits what you've already thought about
- Feels at peace with what you haven't read yet — trusting the system to surface it

ContentDeck's job is to be the guardrails between these two selves.

---

## Five Product Principles

These are not aspirations. They are constraints. Any feature that violates them should be rejected, even if it seems useful.

### 1. Commitment, not menu
The app recommends one thing. You say yes or override. It never presents a buffet and calls it curation. Five equal options is still a filing cabinet — just a smaller one.

### 2. Nutritionist, not chef
Your preferences are biased (FOMO, recency, novelty). Your values are not. When they diverge — and they will — the app sides with your values: the ones you stated once, up front. The app will sometimes push content you wouldn't have chosen yourself. That's not a bug.

### 3. The session is the unit, not the item
Success isn't saving a bookmark or marking it done. It's a quality reading session: you knew what you were going to engage with before you opened the app, and you did it. Every design decision should be evaluated against this definition of success.

### 4. The loop must close
**Capture → Surface → Consume → Reflect → Review.** Every stage must hand off to the next with minimal friction. If the loop breaks at any stage, the whole system degrades. Currently the loop breaks at Reflect. The post-read prompt seals it. Once sealed, Review becomes meaningful.

### 5. Peace with the queue
The unread pile is not an obligation. The app holds it, tends to it, surfaces things at the right moment. The feeling of opening ContentDeck should be relief, not guilt. Any UI element that makes the full queue visible and dominant — without being explicitly requested — violates this principle.

---

## What ContentDeck Must Never Become

- An infinite scroll library where you pick the best thing for the next 20 minutes
- A platform that optimises for time-on-screen over quality of session
- A social comparison surface (public lists, follower counts, trending content)
- An obligation system (streaks, badges, "you haven't read anything in 3 days")
- A feature dump that requires maintenance energy from the user

The "retreat" metaphor is the constraint: a retreat is quiet, intentional, self-directed, and finite. You enter it deliberately and leave it feeling better than when you arrived.

---

## The Content Loop

```
CAPTURE          →   SURFACE          →   CONSUME        →   REFLECT       →   REVIEW
                                                                                      ↑
Save from any        Scoring engine        Reading session     Post-read            Spaced
context via:         picks the right       in ContentDeck      prompt on            recall of
PWA, bookmarklet,    item for this         or reader mode.     mark-done:           your own
iOS Shortcut,        moment. One           Obsidian Plugin     voice or text        words from
browser extension,   primary rec,          exports on          note saved.          time of
Obsidian plugin.     stated with           completion.                              reading.
                     confidence.
```

All five stages must work. ContentDeck currently handles Capture well and Consume adequately. The gap is Surface (no intelligence), Reflect (no prompt), and Review (no mechanism). Phase 2 closes all three.

---

## Patterns We Break By Design

These are known failure modes in the user's actual behaviour. The system must counteract them, not accommodate them.

**Long-form avoidance.** Deep content (2h+ podcasts, dense papers) gets indefinitely deferred because the opportunity cost feels too high. Fix: effort-aware scoring that surfaces long-form only in matching contexts (Saturday morning, evening wind-down). Frame it as a commitment, not a choice.

**Topic concentration (FOMO loop).** Saving and consuming AI news compulsively, despite knowing it's draining. Fix: hard diversity cap in recommendations — no more than one item from the same area in consecutive primary slots. The scoring engine enforces your stated values, not your momentary preferences.

**Decision fatigue from the list.** Scrolling the library creates the same paralysis as doomscrolling. Fix: the library is not the first view. The recommendation is. The library is always accessible but never the default destination.

**Guilt-loading from the pile.** Unread items feel like debts. Fix: the home screen never shows the full unread count prominently. The pile is tended to by the system; you only see what's relevant right now.

---

## The Paradigm Inversion

**Old paradigm (library-first):**
> You come to ContentDeck and choose what to engage with.

**New paradigm (curator-first):**
> ContentDeck has already chosen. You confirm or override.

This is not a UI change. It is a fundamental shift in the product's relationship with the user. The library still exists — it is always one tap away — but it is a power-user feature, not the default experience.

The transition is additive and non-destructive:
- `/` → New home screen (the curator)
- `/library` → Existing ContentDeck (unchanged, frozen)
- No data changes, no user migration, no breakage
- Demo mode remains on `/library` for showcase purposes; the new home screen requires real data

---

## Philosophy-First Feature Review

Before planning or shipping any feature, ask these questions in order:

1. **Which principle does this serve?** (If none of the five, reject it.)
2. **Does it help intentional-you or anxious-you?** (If anxious-you, reject it.)
3. **Does it close or strengthen the content loop?** (If it's orthogonal to the loop, deprioritise it.)
4. **Does it add user-visible complexity?** (If yes, the benefit must be proportionate.)
5. **Is it free?** (If not, the value must be extraordinary.)

A feature that can't answer question 1 should not be built, regardless of how clever it is.
