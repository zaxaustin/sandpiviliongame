# What we can only do because we can edit the code

Written **2026-07-27**, from a question worth writing down: *"Are there any
other features we should add into the game that we have taken for granted with
the ability to edit and code ourselves?"*

That's the right question to ask before a beta, and the honest answer is: quite
a few. Every time this project needed something changed, the answer was "open a
file." A tester cannot open a file. Anything that only exists as *our* ability
to edit source is, from their side, a missing feature — and they will hit it
without having the words to describe what's wrong.

This is the audit. **Built** items are done; the rest are named, sized, and
ordered so none of it gets lost.

---

## Built (2026-07-27, in answer to this question)

- **✅ Edit any library card in-game — the Steward's Index.** A certified entry
  lives in `seed.js` (source) or Supabase; a browser can rewrite neither. So
  edits are an **override layer** in the save (`data.catalogEdits`, applied by
  `store.js` on read): correct a licence, fix an attribution, rewrite a summary,
  move a book to another shelf, or pull one from the shelves entirely. Takes
  effect immediately, travels with the save, and **exports** so a real
  correction can be folded back into the source and stop being an override.
  The book's *text* is never touched — only its card.
- **✅ Judge whether a book may be shared — the copyright check.** See
  `data/copyright.js`. Deliberately **not** an AI verdict: rules read the text
  and decide, the model only extracts evidence, and anything uncertain stays
  personal. We used to answer this with our own judgement per book; now it's a
  button in the add-a-book form.
- **✅ Your own shelves** (earlier the same day) — the fixed 11 traditions were
  *our* taxonomy, imposed on everyone's personal library.

---

## Also built (same day, items 1–3 of the list below)

- **✅ Standing instructions per resident**, with clickable suggestions tailored
  per resident. Appended via `withStanding()` — one funnel, every send path.
- **✅ The prompt inspector** — the exact message array, captured at the call
  site and rendered verbatim. Built beside #1 on purpose: it's where you *see*
  your instruction land.
- **✅ User-authored Learning Tree lessons**, with real prerequisites, so a
  visitor can build a progression rather than only a flat course.

Items 4–6 below remain open.

## Open, in the order I'd do them

### 1 · Standing instructions for a resident — ✅ BUILT 2026-07-27

**What we do that they can't:** edit `charter.js` and the per-resident system
prompts. That's how a resident gets told anything durable.

**What a user hits:** they cannot tell Quill "I'm working through electronics
this year, keep that in mind," or the Tutor "answer me in Spanish," or Sebastian
"I work nights, don't schedule mornings." `data.agentMemory` remembers questions
automatically, but nothing is *user-authored* and nothing is stable.

**The build:** a per-resident free-text "standing instructions" field on the
Connections panel or the chat's side rail, appended to that resident's system
prompt. Cheap — the prompts are already assembled per agent. Guardrail: it
appends to the charter, never replaces it, and the resident says plainly that
it's carrying an instruction from you.

### 2 · Show what was actually sent — ✅ BUILT 2026-07-27

**What we do that they can't:** read the code to know exactly what context a
resident receives.

**What a user hits:** the honest question "is it reading my notes?" has no
in-app answer. This project's whole pitch is that nothing is hidden — and the
one genuinely opaque thing is the prompt.

**The build:** a "what did it see?" toggle on a reply that shows the assembled
system prompt and grounding, verbatim, in a scrollable box. It costs nothing to
build (the string already exists at call time) and it is the single most
convincing thing we could show a sceptical person. Pairs with **Your Data**.

### 3 · Author your own Learning Tree lessons — ✅ BUILT 2026-07-27

**What we do that they can't:** add nodes to `CURRICULUM` in `overlays.js` —
title, steps, prerequisites, required reading.

**What a user hits:** they can make a Course Board course, but they cannot build
a *progression* — a 101 that unlocks a 201 — which is the thing
`COURSE-PROGRESSION-PLAN.md` says is crucial for "other people getting on
board." Teachers will want exactly this, and a teacher was the original test
case for the Tutor.

**The build:** user-authored nodes in the save alongside the built-in
`CURRICULUM`, with a prerequisite picker. The Tree renderer already handles
locked/available/complete; it needs a second source of nodes, not new drawing.
Publishing one as a **packet** already works, so this immediately feeds the
Commons Table.

### 4 · Repair or merge a save *(medium)*

**What we do that they can't:** hand-edit the localStorage JSON when something
goes wrong, or splice two saves together.

**What a user hits:** import **replaces**. Someone who used the app on two
machines has no way to keep both halves, and someone with one corrupted store
has no way to fix it without losing everything.

**The build:** a "merge instead of replace" option on import (per-store choice),
and a repair pass that validates each store against `freshData()`'s shape and
resets only what's broken. Data-safety work, so it needs real tests — and
`DATA_MAP` already enumerates every store, which is most of the job.

### 5 · Give a custom shelf a physical place in the room *(medium-hard)*

**What we do that they can't:** edit `shelfTraditionFor()` and the tile grids.

**What a user hits:** shelves they invent live in Your Library but have no
presence in the building — noted honestly when custom shelves were built. For a
place whose whole idea is spatial, that's a real seam.

**The build:** let a visitor assign one of their shelves to a physical shelf
block (the second floor has room), stored as a mapping in the save and consulted
by `shelfTraditionFor()`. Bounded: a fixed number of blocks, assignable, not an
unbounded map editor.

### 6 · Everything genuinely reserved to code *(and why that's fine)*

New rooms, new stations, new residents, the renderer, the charters themselves.
An in-game builder for these was weighed and set aside in
`TOOL-COMMONS-PLAN.md` as too big a first step, and that still holds. The
answer there isn't a builder — it's **teaching**: `LEARNING-PATH.md` plus a
`tools/commons/` convention, so a motivated non-expert can fork and build the
thing nobody here anticipated. Naming this as deliberate rather than missing is
the point.

---

## The principle underneath all of it

Every item above is the same shape: **something this project treated as an
editing task, which for a user is a locked door.** The test to apply to any
future feature is simply —

> *If we needed to do this, did we open a file? Then so will they, and they
> can't.*

Worth re-running that check whenever a new subsystem lands.
