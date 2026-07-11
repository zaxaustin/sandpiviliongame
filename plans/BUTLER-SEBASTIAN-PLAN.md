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

A **butler** — warm, competent, a touch dry, genuinely attentive. A *true*
butler, which is the important word: a butler doesn't run one drawer of the
house, he runs the household. Sebastian helps with **home life and work
alike** — the day, the week, the errands, and equally the projects, the
deadlines, the professional correspondence. He doesn't treat "your life"
and "your work" as two apps; a good butler knows they're one day, and keeps
them as one.

**He is the working counterpart to the Mountain Monk, by design.** The Monk
sits in the Temple and is there to **guide you** — to help you find the
intention beneath the day. Sebastian stands in the Workshop and is there to
**work with you** — to take that intention and actually make the day hold
it. Guide and butler, Temple and Workshop, intention and action: the two
residents are the Pavilion's guiding mission (*set intentions; act on
them*) given two faces. Neither replaces the other; you go to the Monk to
know what matters, and to Sebastian to get it done.

Said plainly, the three main residents divide the work: **Quill is the
teacher** (the Library, and turning a conversation into a real plan), **the
Monk is the guide** (meaning, conduct, and finding your intention — the
preacher, affectionately), and **Sebastian is the helper and worker** (the
day itself, and getting it done). Three doors: learn, orient, act.

He is where you go to:
- **plan the day** (and the week, and what's coming) — home and work
  together, one calendar, one honest picture,
- **run the work** — a butler over the whole Workshop: the writing, the
  research, the grants, the records already living there, plus his own
  calendar. He knows which desk a thing belongs at and will point you there
  ("that's the Grant Desk's business, sir — shall I walk you over?"),
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
- **Where it lives — the Workshop is his home.** Sebastian is the
  Workshop's butler, standing on its ground floor among the working desks
  that already live there (the Writing/Archive Desk, Research Desk, Grant
  Desk, Caravan Desk, and the Records Hall upstairs). This is deliberate:
  the Workshop is already *where work happens*, so its butler belongs there,
  not in a new room built to hold him. It also completes the mirror — the
  Monk in the Temple, Sebastian in the Workshop, the two poles of the whole
  place. Talking to Sebastian and opening the calendar are two doors into
  the same spot: walk up to him for the conversation, or to his desk/ledger
  for the calendar view, the way the Library's shelves and Reader are one
  place. He's the concierge who ties the Workshop's separate desks into one
  household, which is exactly a butler's actual job.

## Open decision: the Computer overlaps Sebastian — merge or co-locate

Raised directly 2026-07-10: the **Computer** (the JARVIS-style terminal
assistant, currently in the Study, on `WORK_CHARTER`) does much of what
Sebastian does — draft a plan from a rough idea, think a task through, save
a result. Two AI work-assistants is one too many, especially for a
newcomer and for the foundation-vs-extras cleanliness. Two ways to resolve
it, to decide when the calendar half is built:

- **(a) Fold the Computer into Sebastian (recommended).** Retire the
  separate Computer; Sebastian absorbs its real abilities (draft/think/save
  a plan). One assistant, one clear "who do I talk to about my day and
  work." Simpler for everyone, and it fits the three-resident division
  cleanly: teacher / guide / worker, no fourth overlapping voice. Cost: the
  Computer's Study station and its `computer` `CHAT_AGENTS` entry get
  migrated or removed, and its "save to Archive" quick action moves to
  Sebastian.
- **(b) Keep the Computer as a device beside Sebastian.** The butler and
  his terminal, both in the Workshop — the Computer stays a distinct, more
  technical surface for people who want a plain tool, standing next to the
  person who gives it a voice. Cost: the redundancy stays, just co-located
  instead of merged.

Recommendation: **(a)**, unless the plain-terminal feel turns out to be
worth keeping as its own thing. Either way the Computer likely moves from
the Study to the Workshop, next to Sebastian.

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

**v1 — the last key before beta, in build order (grounded in the real
code). Steps 1–2 built 2026-07-10; steps 3–6 are the next session's start.**

> **Built so far:** the `BUTLER_CHARTER`, Sebastian as a real chat resident
> standing in the Workshop (an AI NPC reusing the existing chat path), his
> `butlerDayRead()` grounding (real planner + upcoming due + open sparks,
> computed only on visit), and a **"Send this plan to today"** quick action
> that drops each line of a schedule he drafts into the day's planner as
> sparks. Listening to him works via the chat's existing read-aloud button.
> **Still to build:** steps 3–6 — the real calendar data model and views,
> folding events into `upcomingItems()`, and surfacing the advisory read as
> its own spoken line (right now it only grounds his chat replies).

1. **`BUTLER_CHARTER`** ✅ — in `src/game/data/charter.js`, a third charter
   beside `CHARTER` and `WORK_CHARTER`. Warm, candid, a touch dry; fully
   secular and goal-agnostic; treats home and work as one day; declines
   real harm plainly; never performs personality at the expense of being
   useful.
2. **Sebastian as a chat resident** ✅ — add a `sebastian` entry to
   `CHAT_AGENTS` in `ui/overlays.js`: a `label`, a `systemPrompt()` that
   stitches `BUTLER_CHARTER` + the computed day read (step 6) +
   `pastAsksBlock('sebastian')`, an `errorLine`, and his own memory key.
   Give him an avatar in `AGENT_AVATAR` (🎩 or 🛎). Then place him as an NPC
   on the Workshop ground floor (`buildWorkshop` in `scenes.js`, currently
   `npcs:[]`) with `ai:true, aiAgent:'sebastian'` and a distinct
   color/glow. Talking to an AI NPC already routes through `openChatDialog`
   (see `main.js` `onAction`), so this needs **no new chat plumbing** — the
   same path Quill, the Steward, and the Monk already use.
3. **Calendar data model** — add `calendar:[]` to `freshData()` in
   `entities.js` (migration-safe: an older save with no field reads as
   empty). An event is `{ id, date:'YYYY-MM-DD', start?:'HH:MM', end?:'HH:MM',
   title, note?, kind? }`. Local, in the same save, exported/imported with
   everything else — no new store.
4. **Calendar UI + his desk** — a new `#calendarOv` overlay and
   `openCalendar()` in `overlays.js`: a **month grid** (click a day → a
   **day/agenda view**) and an **add-event form**, reusing the existing
   overlay/panel CSS. Add a `calendar` station at Sebastian's desk in
   `buildWorkshop`, a `drawStation` case in `render.js`, and an `onAction`
   dispatch in `main.js` — the exact pattern the Records Hall just followed.
   Two doors, one spot: the NPC for the conversation, the desk for the grid.
5. **One source of truth for the day** — extend `upcomingItems()` in
   `entities.js` to include calendar events that carry a date, so the HUD
   due badge and Sebastian's read both draw from one place, not three.
   Follow the archived-course precedent: only surface what should honestly
   nag.
6. **Sebastian's advisory read** — a pure function (say `butlerDayRead()`)
   that computes, from `data.calendar` + `data.planner[today]` +
   `dueSoon()` + `openSparks()`, the **overbooked / empty / neglected /
   well-kept** state as plain text. It feeds his `systemPrompt` grounding
   *and* backs a short scripted line shown when you open the calendar — so
   the advisory still works with **no AI connected**, and simply gets richer
   when one is. Computed only on engagement, never on a timer.

**Definition of done for v1:** you can walk into the Workshop, open the
calendar at Sebastian's desk, add real events, see them reflected in the
due badge, and have Sebastian — in his own warm, secular voice — tell you
the honest shape of your day when you ask him, all without a single
background call.

### The honest cost, and why it's worth it (the user's own note)

Sebastian *is* more AI than the Pavilion has leaned on before: every
advisory read can be a real model call, and a resident you consult often is
a resident the machine works for often. **That's real hardware strain, and
it's named plainly here** the way `AI-INTEGRATION-NOTES.md` names every AI
cost — no pretending it's free. But it's the doorway the whole project has
been walking toward: genuine **AI–human interaction**, a resident you
actually *work with*, not a box you query. Two things keep that cost honest
rather than runaway:
- **On engagement, never a timer.** The strain happens when *you* choose to
  talk to him, and stops the moment you walk away. No background model, no
  ambient nag — the ceiling on the cost is your own attention.
- **This is the sleeper car paying off, not straining against it.** The
  plain-pixel world was kept deliberately cheap (`LIBRARY-GROWTH-PLAN.md`,
  `CLAUDE.md`) precisely so the machine's real resources were free for
  exactly this — a real local model carrying a real working relationship.
  Sebastian is what those saved resources were *for*.

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
