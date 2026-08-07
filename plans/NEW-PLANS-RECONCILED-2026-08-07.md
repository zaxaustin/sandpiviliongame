# The five new plans, against what is actually in the tree

**Written 2026-08-07**, when the steward filed five plans at once and asked to
get un-confused about where things stand.

The plans are the steward's and are filed unchanged. This file is the other
half: **what each one already has**, what it collides with, what it would
actually cost, and the two places it asks for something that does not exist.

The reason this file exists at all is the lesson from three days ago: *"write
down what this does" and "check what this does" are the same action.* The doc
pass on 2026-08-04 is what found the migration bug. So the plans get read
against the code before anything is built from them.

---

## The five, and one that came in the same breath

| file | what it is |
|---|---|
| `MISSION-SYSTEM-PLAN.md` | F→E→D→C→B→A→S ranks; F is the personal gate |
| `INDEPENDENT-COURSE-GRADUATION.md` | what F-rank actually requires |
| `MISSION-WORKSPACE-PLAN.md` | "GitHub for quests" — one repo per Mission |
| `COURSE-PROGRESSION-AND-DISPLAY-PLAN.md` | a big calm work surface, not a cramped in-world tree |
| `PRIVACY-AND-WEBSITE-PATHWAY-PLAN.md` | privacy rules + website ↔ game pathway |
| `COMMONS-SERVER-TIGHTENING.md` | outside advice on the Commons server shape |

They are not five separate projects. **Four of them are one dependency chain**,
and it runs backwards from how they were written:

```
  COURSE-PROGRESSION-AND-DISPLAY   the surface everything else is drawn on
            ↓
  INDEPENDENT-COURSE-GRADUATION    the gate, which needs that surface to be walkable
            ↓
  MISSION-SYSTEM                   the ranks, which are meaningless without the gate
            ↓
  MISSION-WORKSPACE                the repo, which is the same surface a third time
```

`MISSION-WORKSPACE-PLAN.md` says so itself — *"same family as the planned
Learning Tree / Course Board surface"*, *"the same workspace shape, scoped to one
investigation"*. **The work surface is built once and reused three times**, or it
is built three times and drifts. Build order should follow the arrow, not the
filing order.

---

## PRIVACY-AND-WEBSITE-PATHWAY — mostly already true

This is the surprise. **Phase A is roughly 80% built**, and nothing in it needs
inventing.

| Phase A item | state | where |
|---|---|---|
| audit that nothing is sent automatically | **done, and enforced** | `test/live/preflight.mjs` asserts ZERO network; `scripts/verify-beta-build.mjs` fails the build on a cloud host or anything key-shaped |
| a surface showing everything the app knows about you | **built** | **Your Data**, `overlays.js:1698` |
| export the full local archive | **built, and complete** | `exportSave()` `:1893` — it reads desktop book text back off disk and inlines it, so the file really is the whole Pavilion |
| delete data | **built, partly** | `resetSave()` `:2624` (all), `pruneOldPlannerDays()` (planner days), `forgetAllMemory()` `:1790` (a resident's memory) |
| document the privacy rules | **built** | `data/visibility.js` — the three states, with `activityLog` mapped `private` / leaves: `"Never."` |

**Your Data is the "My Ledger" the plan asks for**, and it is written better than
the spec: it names the localStorage key, says where book text goes, and has an
"☁ Anywhere else → Nowhere" card that explains *why* — *"not as a policy, but
because none of it is built."*

**What is genuinely missing is small:**

1. **Graduation / tier status.** Doesn't exist, because F-rank doesn't exist.
   Blocked on the chain above, not on privacy work.
2. **"What packets have I published or pulled."** `data.commons` already carries
   `{received, published, taken}` in `freshData()` — it just isn't surfaced in
   Your Data. **This is a half-hour, and it closes a real gap**: a person can
   currently see every private store itemised and cannot see the one category
   that *did* leave.
3. **Clearing AI conversation logs from Your Data.** The control exists, in a
   different panel. Standing rule: *one keystroke to anywhere.*
4. **The website ↔ game cross-links** (Phase B). Cheap, but see the open
   question below.

**The plan names a dependency that is not in this repo:**
`PAVILION-TIERS-AND-COMMONS-SERVER-PLAN.md`. There is no such file here, in
`plans/` or `plans/done/`. The nearest things are
`plans/done/COMMONS-AND-PRIVATE-PLAN.md` and
`plans/TRUST-LEVELS-AND-GATEWAYS-PLAN.md`.

### The three courts — settled 2026-08-07

Asked where the tier document was, the steward answered that it isn't one:
the courts are **new thinking**, not a file that went missing.

> *"the outer inner and core court are new ideas that i have had and right now
> all of the public is the outer court the inner court shuld be for
> contributiers and the core souuld be for those spirtual seekers on the path
> for a kind of laymans sangha."*

| court | who | today |
|---|---|---|
| **Outer** | everyone, the whole public | **this is where all of it is right now** |
| **Inner** | contributors — people who have left work others can use | not built |
| **Core** | those on the path; a layman's sangha | not built |

**These do NOT replace private / shared / commons, and the earlier worry that
they were a second vocabulary for one idea was wrong.** They are orthogonal, and
saying so is what keeps either of them honest:

- **private / shared / commons is about a THING** — where a note, a course or a
  book *is*, and whether it has left this machine. `VIS` in
  `data/visibility.js`. It answers *"can this leave?"*
- **Outer / Inner / Core is about a PERSON** — which circle someone stands in.
  It answers *"who is this for?"*

A commons packet is commons whichever court you are in. A private note is
private even in the Core. The two axes cross rather than compete, so both words
can appear on the same screen without either one lying.

**Two consequences worth holding on to:**

1. **Everything today is the Outer Court, and that is the correct default, not
   a gap.** The beta ships to strangers. Nothing should require a court before
   it works — the Library, the reader, the notes, the planner and the residents
   are Outer Court features and must stay that way. A court is what *opens*, not
   what gates the thing already promised.

2. **The Core is not a higher rank than the Inner.** The Mission ranks
   (F→E→D→C→B→A→S) measure the scale of *work*. The courts describe *company*.
   A layman's sangha is not what you get for contributing more; it is a
   different room, entered for a different reason. Anything that renders these
   as one ladder — a progress bar from Outer to Core — would turn a practice
   into a score, which is the thing `MISSION-SYSTEM-PLAN.md` refuses in its
   first paragraph.

The Inner Court's entry condition is the one already specified: contribution,
evidenced by hosted work with clean provenance (`COMMONS-SERVER-TIGHTENING.md`'s
allowlist, keyed off a Graduation Packet). **The Core's entry condition is
deliberately not specified here** — it is the steward's to say, and it is the
one place in this whole stack where a wrong guess by me would be genuinely
disrespectful of what the room is for.

---

## COURSE-PROGRESSION-AND-DISPLAY — the right diagnosis, and it is already half paid for

The plan's core claim — *tall trees are cramped in the top-down view* — is
correct and was independently found. From the backend plan's Phase 4 audit,
still true today:

- `renderTreeGraph()` (`ui/lesson-tree.js:741`) draws an SVG edge layer that
  **is only ever called for the collective tab** (`:443`). The personal tree has
  never been drawn as a graph at all; it is a flat list at `:640`.
- `graphDepths` (`:719`) **matches parents by TITLE**, which is right for
  packets (`needs` is titles) and **wrong for `allNodes()`**, where `prereqs`
  are ids. Anything reusing it for personal courses inherits a silent
  mis-parenting.
- The graph is sparse — **4 roots, 5 edges, max depth 2.** Depth-columns alone
  will not read as a tree.

**One thing the plan must not lose**, and it is worth restating because a
"professional" redesign is exactly where it gets dropped:
`COURSE-PROGRESSION-PLAN.md` settles that **a locked node still shows its full
text — the gate is on the claim, never on the learning.** The new plan keeps
this (*"content is readable even if prerequisites are incomplete"*). Good. Any
Browse view that greys out or hides a locked node contradicts a settled design
law.

**Cost:** this is the largest of the five. It is a new panel family, and every
new handler needs adding in **three** places (the export at the end of
`lesson-tree.js`, the import at `overlays.js:7270`, the window block at
`overlays.js:11098`).

---

## INDEPENDENT-COURSE-GRADUATION — the cheapest real thing here

Every input it names already exists:

- `mine: true` courses — real, written in three places
  (`lesson-tree.js:356`, `:1040`, `overlays.js:6292`)
- note→lesson promotion — real
- the study chain (note → lesson → path → Today) — real, 39 checks green
- export to Markdown / packet — real (`data/lesson-doc.js`,
  `data/commons-packets.js`)

**What is missing is only the check and the flag**, and the plan already
specifies it in three testable conditions. That is a `data/graduation.js` of
maybe 60 lines, pure and DOM-free, in the same shape as `data/records.js` and
`data/backend-trouble.js` — which means `npm test` can hold it to account
without a browser.

**Two things to get right, both of them house rules:**

1. **`readyForOthers` is a new save field.** `data/visibility.js` needs a
   `DATA_MAP` entry or the privacy line is incomplete, **and** `freshData()`
   needs the key. `data.study` is missing from *both* right now — it went in
   without either. Don't add a second.
2. **Rule 6 applies hard.** "Is this course ready for someone else?" is a
   judgement, and a wrong yes is worse than no answer — it puts a person's name
   on work that doesn't teach. The checklist should be **static and honest**
   (does it have a purpose, ordered steps, an artifact, a license), and where it
   cannot tell, say so and let the person decide. Not a model's verdict.

---

## MISSION-SYSTEM and MISSION-WORKSPACE — right, and last

No objection to either. Both are downstream of everything above, and
`MISSION-WORKSPACE` is explicitly the same surface a third time.

Two notes worth keeping:

- **The nesting rule is the load-bearing part.** *"No Mission may exist only as
  a grand statement"* is what keeps an S-rank from being decoration. It is also
  the thing that will be quietly skipped when seeding starter content, because
  writing a grand statement takes ten minutes and writing a finishable work
  package takes an afternoon. Seed **one** E-rank Mission properly before
  seeding seven of anything.
- **"Reputation only from inspectable hosted work"** is the same principle as
  *evidence not volume* behind the Science Hall, and the same as
  *testing out requires an artifact, not a claim*. Three plans, one rule. It
  should live in one place and be cited, not restated a fourth time.

---

## Phase 2d was the wrong shape — measured 2026-08-07

The backend plan listed six named queries with no consumer and treated that as
a debt. **It is not a debt; it is a design question, and for four of the six the
honest answer is that they should stay unwired.** Rule 7 says deterministic code
first. Checked one at a time:

| query | what it buys over plain JS over the save | verdict |
|---|---|---|
| `searchNotes` | **stemming and ranking** — `walking` finds `walked`. JS cannot. | **wired, and right** ✓ |
| `records` | nothing the walk doesn't do, but it holds `hidden`, which is the visitor's own choice and must outlive a rebuild | **wired, and right** ✓ |
| `notesForBook` | nothing. `gatherNotes()` already unions all six sources in the renderer, exactly, instantly, and on the web build too. Its one extra column, `chapter_label`, joins `chapters` — **which nothing ever writes** | **leave unwired** |
| `notesByPlace`, `noteCounts` | grouping and counting. Rule 7 names counting as the thing code does exactly | **leave unwired** |
| `unshelved`, `shelfCounts` | nothing — `books` is a mirror of `personalLibrary`, which is already in the save | **leave unwired** |
| `chaptersFor`, `needsChapters` | **genuinely something JS cannot do cheaply**: know a book has no chapters *without opening it and running the finder over 563 KB* | **blocked, see below** |

Wiring the middle four would put a second path over data the save already
holds — the `store.js` scar, arriving through a new door.

### Why the chapter queries are blocked, and it is not "unwired"

**Nothing anywhere writes the `chapters` or `chapter_scans` tables.** Not the
app, not `electron/`. The only writer is `tools/load-library.mjs`, which is the
MinIO loader — Docker, a manual run, the steward's machine only. In the app,
`findChapters()` runs *on open* (`overlays.js:3294`) and the answer is thrown
away when you close the book.

And `v_needs_chapters` gates on `b.text_key IS NOT NULL` — `text_key` is a MinIO
object key, also written only by that loader. **So on every machine that is not
the steward's, that view returns zero rows, always.**

Which means: wiring "books that need chapters" today would render a panel
saying **"0 books need chapters"** while 18 of 39 actually do. A confident,
specific, wrong answer — rule 6's exact prohibition, and worse than the current
silence because a panel that says zero gets believed.

**Doing it properly is three pieces, in order, and it is a real chunk of work:**

1. **The app must write what it already knows.** `syncChapters(slug, marks,
   how)` beside `syncNotes`/`syncRecords`, called when the reader computes
   `_chapterInfo`. Needs a new WRITE — `markChapter` sets `source:'hand',
   confirmed:TRUE`, which is the wrong label for a detection.
2. **A migration to un-MinIO the view.** `text_key IS NOT NULL` has to become
   "we have the text", which is now three different places depending on build.
3. **Then** the panel, and only then is it true.

Piece 1 also only learns about books you have opened, so the panel must either
say so plainly or offer a deliberate sweep ("scan my library for chapters", the
shape *Suggest shelves* already uses). **It must not quietly present "of the
books you opened" as "of your library."**

---

## What this changes about what to build next

The backend plan's remaining phases (2d: `notesForBook`/`notesByPlace`,
`chaptersFor`/`needsChapters`, shelving; 2e: migration 004) **are not superseded
by any of this.** They are the queries that already exist and have no consumer,
and every one of the new plans assumes notes and books are findable.

Recommended order, cheapest and most-owed first:

1. **Finish 2d/2e.** Six named queries the renderer still doesn't call, and
   *18 of 39 books find no chapters* — which is a rule-6 gap sitting in front of
   a real person right now.
2. **Publish/pulled packets in Your Data** (half an hour, closes the one
   category of leaving data that isn't itemised).
3. **`data/graduation.js`** — pure, testable, unblocks the whole Mission chain
   and needs no new UI to be correct.
4. **The Learning Work Surface.** The big one. Everything else is drawn on it.
5. Missions, after.

**Not yet:** the Commons server. `COMMONS-SERVER-TIGHTENING.md` has an open
usability question (key management for a lay user) that should be answered
before an endpoint is written, and the whole thing is downstream of graduation
packets, which are downstream of item 3.

---

## Open, and needs the steward

1. **Where is `PAVILION-TIERS-AND-COMMONS-SERVER-PLAN.md`?** And should
   Outer/Inner/Core replace private/shared/commons, or sit beside it? Two
   vocabularies is the worse option.
2. **`sand-pavion` vs `sandpiviliongame`** — the privacy plan's Immediate Next
   Action #1 is a decision only the steward can make. Noting also that `gh` is
   not authenticated on this machine.
3. **The merge** of `COMMONS-SERVER-TIGHTENING.md` into
   `COMMONS-BACKEND-PLAN.md` is a real task and deliberately not done blind.
