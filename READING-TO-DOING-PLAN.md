# Reading-to-Doing Plan

Not started as code — this is the written plan first, same as
`LIBRARY-GROWTH-PLAN.md` and `DESKTOP-APP-PLAN.md` were written down
before anything got built. See README's "What's next" for how this fits
the rest of the priority list.

## The actual goal

Direct instruction, 2026-07-09: **the Pavilion should not try to digest
books for you.** The shelf summary in the Reader is enough to get the
gist; reading the rest is meant to happen slowly, by an actual human,
at their own pace — that's not a gap to close with AI summarization,
it's the point. What's worth building instead is the other half of the
loop: once you *have* read something and it produced a real thought,
does that thought actually turn into something you do, or does it sit
there? The user is about to beta-test the Pavilion as a real office
this week — running a real budget, drafting real courses — so this is
the actual test of whether "daily ease, direction, and turning
knowledge into use" (the project's own stated north star) is real or
just a slogan.

## What already exists (verified by reading the actual code, not assumed)

The reading→doing bridge already has one real piece, built 2026-07-08:
a book note in the Reader gets a "Bring to today's plan" button; one
click and it lands as a **spark** — `{ts, text, source}` — on
`data.planner[today].sparks`, visible to the Steward's day-planning
chat and shown back on that day's own record afterward
(`overlays.js`'s `sendNoteToToday()` / `renderPlanSparks()` /
`viewPastDay()`).

That's the only bridge that exists. Three other real accumulation
surfaces already exist next to it, and none of them connect to
`sparks` at all:

- **Research Desk projects** (`data.workshop.research[i].notes`) —
  freeform notes on a study topic or a real project, added over
  multiple visits, with an AI chat grounded in the project's own notes
  so far. Genuinely accumulates over time already; just isolated from
  the daily planner.
- **Grant Desk projects** (`data.workshop.docs`, `category:'research'`)
  — same shape, grant-writing-specific.
- **Course Board due dates** — already surface passively via the
  existing "⏰ N" badge and the Writing Desk's Upcoming panel (see
  `feedback_automation_philosophy` in memory: opt-in, never a popup),
  but a course's *content* — what you were actually supposed to learn
  from it — doesn't feed sparks or planning the way a book note does.

**The real gap, stated plainly:** reading (books) got a doing-bridge.
Researching (Research Desk) and proposing (Grant Desk) — arguably the
more directly office-relevant of the three, given this week's beta test
— did not. And even where the bridge exists, a spark that isn't acted
on today just quietly disappears into `pastDays` — there's no signal
that anything's still waiting on you, unlike due dates, which already
resurface on their own.

## The plan — in order, each step small and shippable alone

1. **Extend the spark bridge to Research Desk and Grant Desk notes.**
   The data shape (`{ts, text, source}`) and the UI pattern (a small
   "→ Bring to today's plan" button next to any note) already exist and
   already work for book notes — this is reusing them in two more
   places, not building something new. Lowest-effort, highest-leverage
   step, and the most direct answer to "help me use the Pavilion as a
   real office."
2. **A lightweight "done" state on sparks, not just remove.** Right now
   a spark has exactly two fates: sit on today's list, or get deleted.
   Adding a `done` flag (a checkbox, not a popup) means a day's record
   actually shows whether something read/researched turned into
   something acted on — the difference between a journal and a to-do
   list that lies about its own history.
3. **Carry forward what's still open, opt-in.** A spark left `not done`
   at the end of a day currently vanishes into `pastDays` and has to be
   dug up by hand. Matching the existing due-date pattern exactly (see
   `feedback_automation_philosophy`): unacted sparks *can* roll into
   today's list if the user has opted into that, surfaced passively
   the same way the "⏰ N" badge already is — never a popup, never
   default-on.
4. **One glanceable "still open" view across every source.** Once
   sparks can come from three places and carry a done/not-done state,
   a single small panel — reachable the same way the Upcoming panel
   is, not auto-opened — showing everything not yet marked done, oldest
   first, closes the loop for real: not just "did I write this down"
   but "did I ever do anything with it."

Each step stands alone and ships independently — this isn't a big-bang
rewrite, it's four small extensions of a bridge that already works for
one of its three intended sources.

## What this deliberately does not include

No AI-generated book digests, no auto-summarization of anything you
haven't explicitly asked to be summarized (the Research/Grant Desk
assistants already do that on request, which is different), and no
proactive nudge that fires without the user opening the relevant desk
first. This plan is entirely about connecting surfaces that already
exist and already hold real, human-written thought — not generating
new thought for the user.
