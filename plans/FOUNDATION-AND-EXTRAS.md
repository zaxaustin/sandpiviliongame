# Foundation and Extras — what everyone gets, what unlocks, what waits

Started 2026-07-10, at direct request: begin sorting what the Sand
Pavilion actually *is* for everyone from what's an extra feature — one
that unlocks one at a time, or isn't included unless someone adds it
later. This is the working inventory behind `TOOL-COMMONS-PLAN.md`'s
"bare-bones foundation vs. Zac's additions" split, made concrete against
the features that actually exist today.

**This is a first pass to walk through together, not a decree.** Nothing
here is final; it's a start on the list, meant to be argued with and
revised. Where a call isn't obvious, it's marked so.

## The guiding mission — the thing every tier serves, stated first

**A place to set intentions, and a place to put those intentions into
action.** That's the whole Pavilion in one line. Everything below is
sorted by how directly it serves those two halves:

- **Setting intentions** lives in the **Temple (the Keep)** — above all
  the **Eightfold Path**, the moral spine of the place. This is
  non-negotiable and permanent. It never becomes an "extra," never gets
  unlocked or removed, never gets traded for a flashier feature. It is
  load-bearing in the literal sense: the reason the rest has a direction
  to point at.
- **Putting them into action** lives in the **Library** (knowledge to
  act *on*) and the working rooms that turn knowledge into doing — the
  Study, the Writing Desk, the Course Board. The Library is the other
  permanent anchor: an open commons of real texts, no gate, always.

Anything that doesn't clearly serve one of those two halves is, by
default, a candidate for "extra" — not because it's bad, but because the
foundation should stay small enough that a new person isn't handed "a
thousand little gadgets" on day one (the user's own words, and the real
reason this split exists at all).

## Tier 1 — Foundation: everyone gets it, always on, never removed

The smallest set that still delivers the whole mission. If a fresh
Pavilion shipped with *only* this, it would still be the real thing.

- **The Temple / the Keep, with the Eightfold Path** — set intentions.
  Permanent, per above. The Buddha and Ganesha shrines belong here too;
  they're the place's character, not a feature to gate.
- **The Library** (shelves, the Reader, the Index) — read anything, no
  gate. The commons half of the mission. Permanent.
- **The Study: the Planner and the Course Board** — turn an intention
  into a day and a path. The simplest "put it into action" surface, and
  the one the north star ("help me find direction and the tools to make
  use of the knowledge") points at most directly.
- **The Writing Desk (Archive Desk)** — a place to actually write:
  notes, plans, your own texts. The user named this explicitly as core
  ("the library and the writing room, lesson planner").
- **The lesson/course planner with AI** *when a connection exists* — the
  neutral `WORK_CHARTER` planner that drafts a course toward any goal.
  Named as core. Degrades gracefully to hand-writing when there's no AI,
  so it's foundation whether or not someone ever sets up a model.
- **One resident to talk to (Quill)** — the Library's own voice, and the
  entry point to every AI feature. Not the whole roster — just enough
  that the place isn't silent.
- **The quiet connective tissue** — saving, the activity log, the
  glanceable due badge, meditation/postures, walking the world itself.
  Not "features" so much as the floor everything else stands on.

## Tier 2 — Extras: real, but opt-in / unlockable one at a time

Genuinely useful, already built, but *not* something to hand a newcomer
all at once. The right shape here is the one the user named: unlocked one
at a time, or surfaced only when someone actually reaches for that kind
of work — not defaulted on. (The **badges** system is already a soft
version of exactly this; whether "unlock" should become literal, or stay
"it's there when you walk to it," is an open call — see below.)

- **The Café and its social surfaces** — the Steward (Moss), the Notice
  Board, the Residents Board, the Hearth, coffee. Atmosphere and
  community, not core to a solo person's first day.
- **The specialized Workshop desks** — the **Research Desk**, the
  **Grant Desk**, the **Caravan Desk**, the **Records Hall**. Each is a
  real tool for a specific kind of work (thinking-through, funding,
  library intake, personal history). Powerful *once you need them*,
  overwhelming as a starting menu.
- **The Mountain Monk** — the deepest resident, on the best local model
  with real room to think. Precisely because he's the most resource-
  intensive and most exposed to the thinking-model failure mode (see
  `AI-INTEGRATION-NOTES.md`), he fits "unlock when ready," not "day one."
- **The Computer / terminal resident** — a distinct, more technical
  surface; an extra for people who want it.
- **Fishing and the overworld pond** — pure play. The clearest "extra":
  delightful, entirely optional, serves neither half of the mission
  directly (and that's fine — a place to *be*, not only to work).
- **The extra AI-flavored conveniences** — read-aloud/TTS, spoken
  summaries, the Local AI panel, the pocket phone. Real quality-of-life,
  none of them load-bearing.

## Tier 3 — Later: not included unless deliberately added

Written down, not built, or built only as placeholders. These don't ship
in a foundation *or* as a stock extra — they're additions someone (Zac
first) chooses to build.

- **Workshop floor 3's sketched rooms** — the Ledger, Maker's Bench,
  Greenhouse, Round Table, Mailroom. Placeholders with honest "not open
  yet" signs today.
- **The real in-world Phone** (`PHONE-PLAN.md`) — beyond today's pocket
  card.
- **Course Board Stages 2–3** — sharing standards and a real course site
  (`COURSE-BOARD-PLAN.md`). Explicitly gated behind the beta opening to
  other people.
- **The Tool Commons itself** (`TOOL-COMMONS-PLAN.md`) — the app-store-
  for-local-tools vision; becomes real when the beta opens, not before.
- **Agent embodiment** (`AGENT-EMBODIMENT-PLAN.md`) — residents that act,
  not just answer. Bounded, careful, later.

## The unlock mechanic — decided 2026-07-10

**How extras unlock (Zac's call):** you walk up to an extra and see its
**requirements to unlock**, right there at the door. Then one of two
paths opens it:
- **Learn-what-it-does-quickly → unlocks.** A short, honest explanation of
  what the tool is for; understanding it *is* the key. Low-friction, for
  the extras that just need context, not training.
- **A required learning path → unlocks.** For the extras that genuinely
  need groundwork first, the door points at a real short path (the
  LEARNING-PATH.md model, scoped to that tool) and opens when it's walked.

This keeps the Library and Temple ungated (they're foundation, always
open) while making the *extras* something you grow into on purpose —
"unlock one at a time" becomes real, but as an invitation with a visible
requirement, not a locked box with no explanation. The requirement being
*visible at the door* is what keeps it from feeling like a gate: you
always see what's behind it and exactly what opens it.

**A first-arrival tutorial** — a guided walk-around when someone first
enters the Pavilion — is the natural companion to this, but it's
**deferred to the beta test** on purpose (that's when there's actually a
newcomer who isn't Zac to walk through it). Written down here so it isn't
lost, not scheduled now.

**Still to decide when it's built:** which specific extras take the quick
path vs. a real learning path, and whether "requirements" can include
things other than learning (having used a prerequisite tool, having set
an intention in the Temple first, etc.). Left open until the mechanic is
actually built.

## The remaining open questions

These are the real forks still to settle, named so they don't get decided
by accident:

1. **Where's the line between "foundation" and "Zac's addition"?** Some
   Tier 2 items (the Research/Grant desks especially) are arguably *this*
   Pavilion's character more than every Pavilion's floor. The
   `TOOL-COMMONS-PLAN.md` split says a foundation should be forkable and
   minimal; that argues for a *smaller* Tier 1 than instinct wants.
2. **What's the newcomer's actual first five minutes?** The foundation
   list is only right if walking in with just Tier 1 feels complete, not
   sparse. That's testable — and the real check on whether this triage is
   honest.

The two fixed points, whatever else moves: **the Temple with the
Eightfold Path, and the Library, stay — always, in every tier of every
Pavilion.** Set intentions; act on them. Everything else is arrangement.
