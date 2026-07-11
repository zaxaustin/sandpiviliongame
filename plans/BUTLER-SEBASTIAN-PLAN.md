# Butler Sebastian — the calendar that's a person, not an app

Written 2026-07-10, at direct request, as its own plan. Sebastian is named
as **the last key before beta testing** — the piece that turns the
Pavilion from "a place that can help my day" into "the place I actually
manage my day from." Not built yet; this is the plan.

## The real problem, stated the way it was given

> "All the cool features in the world can't compare to one user. How do we
> get people to use a calendar app? Simple — we give them Butler
> Sebastian."

Calendar apps don't fail on features. They fail because a grid of empty
boxes asks everything of you and offers nothing back. It doesn't notice
when you're overbooked, doesn't care when you've planned nothing, doesn't
know what you said mattered last week. **The thing missing from calendar
apps isn't AI integration — it's a more human interaction.** Sebastian is
that: a butler you go to, who keeps your day the way a good butler keeps a
house — attentively, with a little judgment, and on your side.

This is the north star made literal: *ease* (someone helps hold the day),
*direction* (someone who'll tell you when there is none), and *knowledge
into action* (the plan actually gets kept, not just made).

## Who Sebastian is

A **butler** — warm, competent, a touch dry, genuinely attentive. He runs
your day and, later, perhaps your correspondence. He is where you go to:
- **plan the day** (and the week, and what's coming),
- **hear the truth about it** — "your afternoon's gotten thin, sir," or
  "nothing's on the books tomorrow, and I don't believe that's laziness so
  much as it hasn't been decided yet — shall we decide?",
- eventually, **manage email and professional exchanges** (a bigger, later
  piece — see the staging below).

**Sebastian needs his own charter, and this is worth naming.** The
in-world residents carry the devotional `CHARTER`; the work tools carry
the neutral `WORK_CHARTER`. Sebastian is neither. He needs a third:
a **`BUTLER_CHARTER`** — a real, warm personality (so the human hook
actually lands) that is still fully secular and goal-agnostic (so he keeps
*your* day toward *your* goals, never steering you toward the dharma or
anything else). Attentive, candid, a little funny, never preachy, never a
performance that gets in the way of being useful. This is the first
resident where the *personality is the feature*, not decoration on top of
one — and effectiveness-first still applies: a butler who's charming but
unreliable is a worse butler.

## The one hard rule this must not break: no background polling

Sebastian wants to "advise me that my time is getting thin, or that
nothing is planned." The instinct is a notification that fires on a timer.
**That's exactly what this project doesn't do** (see `AI-INTEGRATION-NOTES.md`
and `AGENT-EMBODIMENT-PLAN.md`): nothing here wakes a model or nags on a
clock. The resolution is real and it's actually *better*:

**Sebastian advises on engagement, not on a timer — pull, not push.** He
speaks when you come to him, when you open the calendar, and (silently)
through the glanceable badge the HUD already has. The "your time is thin"
read happens the moment you walk up to his desk, computed right then from
your real calendar and planner — not pushed at you while you're doing
something else. A butler doesn't shout across the house; he tells you when
you walk into the room. That's the humane version *and* the one that keeps
the machine quiet.

## What Sebastian is built on — mostly things that already exist

Sebastian is largely a **human face over data the Pavilion already keeps**,
plus one genuinely new layer (the calendar):

- **The Planner** (`data.planner[day]`, with its rhythm blocks, intentions,
  and sparks) — already the day's substance. Sebastian reads and helps
  shape it.
- **Due dates** (`upcomingItems()` / `dueSoon()` over courses and grants) —
  already the "what's coming" spine and the existing due badge. Sebastian
  speaks over exactly this.
- **Still-open sparks** (`openSparks()`) — already "the intentions you set
  and haven't acted on." This is *precisely* the raw material for "you said
  this mattered and haven't touched it." Sebastian gives it a voice.
- **NEW: a real calendar layer** — timed events on specific dates, which
  the planner (a per-day list) and due-dates (a deadline) don't currently
  express. This is the one substantial new data shape (see below).

The point: Sebastian isn't a second silo competing with the Study. He's
the concierge over the day-management the Pavilion already does, plus the
calendar it's missing.

## The calendar app — the genuinely new piece

Completely new, and the part that needs real design:

- **Data model.** `data.calendar` — a list of events: `{ id, date, start,
  end?, title, note?, kind?, recurring? }`. Start simple (a titled event on
  a date, optional time); recurrence and multi-day come later. Kept local,
  per-device, in the same save as everything else — no new store, same
  export/import.
- **Views.** A month grid to see shape, a day/agenda view to see detail.
  The low-res aesthetic makes a calendar cheap to render (the sleeper-car
  point) — the resources go to Sebastian's reading of it, not the pixels.
- **One source of truth for "the day."** The calendar, the planner's due
  badge, and course/grant due dates should reconcile into one honest
  answer to "what does today actually hold" — `upcomingItems()` is the
  natural place to fold calendar events in, so the existing badge and any
  Sebastian summary read from one place, not three.
- **Where it lives.** Sebastian gets a room or a desk — a butler's study.
  Opening the calendar and talking to Sebastian are two doors into the same
  room, the way the Library's shelves and Reader are one place.

## The advisory behaviour — the actual "human interaction"

When you come to Sebastian (or open the calendar), he computes, right then,
a read of your day and says something real. Grounded in actual data,
never invented:

- **Overbooked** — events/blocks stacked past what fits: "You've three
  things between two and five, sir. Something will have to give, and better
  you choose than the clock."
- **Empty** — nothing on the books: "Tomorrow's blank. No judgment — but if
  it stays blank by accident rather than on purpose, shall we put something
  worth doing on it?" (The "you're being lazy lol" energy, delivered as a
  butler would — teasing, fond, never scolding.)
- **Neglected intentions** — an open spark or an overdue course: "You told
  me the writing mattered. It's been a week. I'm not nagging; I'm
  remembering, which is my job."
- **Well-kept** — when the day's actually in good shape, he says so.
  Accountability includes noticing when you did well, or the whole thing
  reads as guilt, and guilt is the opposite of ease.

His system prompt is grounded exactly like the other residents': the
`BUTLER_CHARTER`, plus a computed summary of the real calendar/planner/
due/spark state, plus his memory of past visits (`agentMemory`, already
built). Nothing silent, nothing pushed.

## Staging — what's v1, what's later

**v1 — the last key before beta:**
- The `BUTLER_CHARTER` and Sebastian as a real chat resident.
- The calendar data model + a month and day view + event creation.
- Calendar events folded into `upcomingItems()` so the due badge is honest.
- Sebastian's engagement-time advisory read (overbooked / empty /
  neglected / well-kept), computed on visit, grounded in real state.
- His room/desk in the Pavilion.

**Later — bigger, flagged honestly:**
- **Email and professional exchanges.** This is the one part that breaks
  local-first: email lives on someone else's server, so any real
  integration is inherently cloud, opt-in, and clearly labeled the way the
  ☁ cloud AI connections already are. There's a Gmail connector available
  but it needs the user's own authorization; treat it exactly like a cloud
  AI provider — a real, eyes-open choice, never a default, never required
  for Sebastian to be useful. The `exchange_questions` table and the
  agent-notes commons are the in-house, local-first cousin of this and are
  the safer first place to grow "professional exchanges" before touching
  real email.
- **Recurrence, multi-day events, reminders** — the calendar's normal
  growth, once the simple version has actually been lived with.
- **Proactive-feeling nudges without background polling** — richer reads,
  still computed on engagement, never on a timer.

## Why this is the last key before beta

The Pavilion already helps the day (the user's own read: "so far this has
been largely achieved"). What it doesn't yet do is *hold* the day — be the
one place you go to run it, with someone who notices. That's the
difference between a tool you visit and a tool you live in, and it's the
difference a beta tester will feel in the first week. Sebastian is the hook
that makes the calendar — and by extension the whole day-management spine
already built — something people actually return to. Build him well, and
the Pavilion is ready to show someone who isn't Zac.

## Ties to the rest of what's written down

- The **no-background-polling** rule (`AI-INTEGRATION-NOTES.md`,
  `AGENT-EMBODIMENT-PLAN.md`) shapes the whole advisory design — pull, not
  push.
- **Effectiveness-first** (`CLAUDE.md`) applies even though personality *is*
  the feature here: reliable and grounded before charming.
- The **`CHARTER` / `WORK_CHARTER`** split (`AI-INTEGRATION-NOTES.md`) gets a
  real third member in `BUTLER_CHARTER` — warm like the residents, secular
  like the work tools.
- **`FOUNDATION-AND-EXTRAS.md`:** Sebastian and the calendar are a strong
  candidate for *foundation*, not an extra — "manage your day" is close to
  the core mission of turning intention into action. Worth deciding
  against that triage as he's built.
