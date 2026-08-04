# Your Notes, and the Log Room — one place to see what you've kept

> **STATUS (2026-07-11, same day):** the core got built — the 🗒 **Your
> Notes** pause-menu view gathering all five note stores, **folders and
> tags** (a content-hash side-map, `data.noteMeta`, touching no note
> itself), and Sebastian's **scoped folder review**. **Still open:** the
> Records Hall repurpose (making the room itself the log's home) and
> reading `archive/dev-log-*.txt` live — the room half of this plan.
>
> **UPDATE 2026-08-03 — the Records Hall half now has a FOUNDATION, and a
> precise next step rather than an open question.** Migration 003
> (`tools/migrations/003-records.sql`) adds a `records` table plus the
> `v_records` / `v_record_counts` / `v_notes_by_place` views, built to the
> steward's own design: the writing PLACES stay separate (reading, the bench,
> planning with Sebastian), and the Hall **sees across all of them unless a
> record is hidden**. Hiding is a property of the record, never a deletion,
> and never asks why.
>
> A `records` row is an INDEX ENTRY — kind, title, when, plus `ref` and
> `opener` pointing back at wherever the real thing lives — so the room owns
> nothing and duplicates nothing, the same discipline the Lab follows.
> Migration 002 does the same for `notes`, keyed to book AND chapter, with
> Postgres full-text search across everything ever written.
>
> **What is missing is the INDEXER.** Both tables are empty. Something has to
> walk the save — dissections, builds, experiments, lessons, days, notes —
> and write index rows. That is the next real slice of this plan, and it is
> now a nameable afternoon rather than a design problem.

Written 2026-07-11, from a direct ask: "I want a way for users to see their
notes and have them organised in a way that can be good for long term —
Sebastian can help with that." This plan first reports the honest state of
the Records Hall (the "log room"), then scopes the real want, which is
bigger than that one room.

## State of the log room (the Records Hall), checked in the code

The Records Hall exists and works — Workshop floor 2, a `records` station,
`openRecordsHall()` / `renderRecordsHall()` in `overlays.js`. But two honest
facts about what it actually is today:

1. **It shows the *Pavilion's* history, not *your* notes.** Its content is
   `PAVILION_TIMELINE` — a hand-written array of five dev-milestone cards
   (2026-07-06 … 07-10: "the module split," "the Ganesha statue," etc.). It's
   the project's own changelog made walkable, closer to the dev-log than to
   anything the visitor themselves wrote.
2. **It's hand-kept, not live.** Its own meta text says so: it does not read
   `archive/dev-log-*.txt` live yet — "visuals first, the actual backend
   connection later." So even as a project-history room, it's a static
   snapshot someone updates by hand.

So the "log room" as built is a nice idea only half-realized, and pointed at
the *wrong subject* for what's being asked now: the user wants a room about
**the visitor's own kept work**, not about the Pavilion's construction.

## The real want: the visitor's notes, gathered and organised for the long term

This is the same gap `BETA-TESTING-FEEDBACK.md` #1 and #9 circled and
deliberately deferred — the "file system nest like VS Code" idea. It's time
it had an owner and a plan, because personal notes today are **scattered
across five separate stores with no single place to see them:**

- `data.notes` — **My Notes**, the Writing Desk filing cabinet (named,
  dated, freeform; create/edit/delete; the closest thing to a real notes UI
  today).
- `data.bookNotes[slug]` — notes taken against a specific book, now
  page-aware.
- `data.chatNotes[agent]` — the auto-saving note beside each resident
  conversation (one per resident).
- `data.workshop.research[].notes` — Research Desk project notes.
- `data.grantProjects[].documents` — Grant Desk drafted sections.

(The `sparks` system already treats book/research/grant notes as one family
for the "bring to today" bridge — proof this unification is tractable, not
hypothetical.)

Nothing shows all of that in one browsable, organisable structure. That's
the thing to build.

## The shape to build (kept small, per the beta stance)

Deliberately not a from-scratch file-tree rebuild of all five stores — that's
the over-build `WRITING-DESK-PLAN.md` rightly set aside. Instead, a **reading
and organising *view* over the notes that already exist**, plus light
long-term structure:

- **One "Your Notes" surface** — a single panel that lists everything the
  visitor has written, across all five stores, each tagged by where it came
  from (📓 My Notes, 📖 a book, 🗣 a conversation, 🔬 a project, 📝 a grant).
  A view, not a fourth store — the notes stay where they live and stay
  editable there; this gathers and links.
- **Organised for the long term** — the missing structure. Candidates, cheap
  first: sort/filter by date, by source, by search (reuse the Index panel's
  own chips/search pattern, as the Course Board Stage 1 did); light,
  user-named **folders or tags** layered *on top* without moving the
  underlying notes. Start with search + source filter (nearly free), add
  user tagging only if the flat view proves too flat.
- **Sebastian is the concierge of it** — exactly his butler role: he already
  knows the Workshop's desks and points you to the right one. Extend that to
  the notes themselves — "you've three loose notes about the grant, sir;
  shall I file them together?" A grounded, on-engagement read of the notes
  (never a background pass), the same shape as his calendar advisory line.
  This is the "Sebastian can help with that" the ask named directly.

## Where it lives — and what becomes of the Records Hall

Two clean options, to decide when it's built:

- **(a) Repurpose/extend the Records Hall as the visitor's own memory.** The
  room's own framing — "the Pavilion's own memory, made walkable" — becomes
  *your* memory: your notes gathered here, with the project-history timeline
  kept as a secondary tab or moved to the dev-log where it honestly belongs.
  Fits the room's name and location; resolves its half-built state.
- **(b) A new "Your Notes" panel reachable from the Writing Desk and
  Sebastian**, leaving the Records Hall as the project-history room. Less
  disruptive; risks two overlapping "memory" surfaces a newcomer must
  distinguish.

Recommendation: lean **(a)** — the Records Hall is currently a room looking
for a real purpose, and "your kept work, organised" is a far better one than
"the changelog someone hand-updates." It also completes the honest-backend
promise the room already made (read real, kept data instead of a static
array). The project-history timeline isn't lost — it's what `archive/dev-log-*.txt`
already is, better.

## Staging

1. **The gathering view** — one panel listing all five note sources, tagged
   by origin, with search + source filter. The bulk of the value, mostly a
   read over existing data.
2. **Long-term structure** — user tags/folders layered on top, only if step 1
   proves too flat. Cheap, additive.
3. **Sebastian's notes read** — his on-engagement "here's the shape of what
   you've kept, shall I tidy it" line, same pattern as `butlerAdvisoryLine()`.
4. **Resolve the Records Hall's identity** — (a) vs (b) above; ideally fold
   this view *into* the Hall and retire the hand-kept timeline.

Ties to: [[the beta stance]] `BETA-LAUNCH-PLAN.md` (small core, fill it
yourself — your notes are a big part of what *you* fill it with),
`done/WRITING-DESK-PLAN.md` (which deferred exactly this), `done/BUTLER-SEBASTIAN-PLAN.md`
(Sebastian as concierge over the Workshop's kept things), and
`READING-TO-DOING-PLAN.md` (the sparks family that already proves the five
stores can be treated as one).
