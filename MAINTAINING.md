# Maintaining the Sand Pavilion — the administrator's reference

**This is the technical current-state doc.** `README.md` is now written for
someone who just downloaded the app and wants to use it; everything a
maintainer needs — architecture, invariants, gotchas, backend, release, and
what's actually next — lives here.

*A standing note to whoever picks this up next, human or a fresh Claude, since
context windows don't carry over. Read `CLAUDE.md` first (the standing
decisions), then this.*

---

## Get oriented, in order

1. **`CLAUDE.md`** — the standing decisions, stated so they don't get
   re-derived. Start there.
2. **This file** — what's built, how it fits together, what not to break.
3. **The latest `archive/dev-log-*.txt`** — the narrative of how it got here,
   session by session. Skim the last one or two.
4. **`plans/*.md`** — every open plan (`plans/done/` for closed ones).
   `plans/BETA-TESTING-FEEDBACK.md` is real issues found by real use.
5. **`MANUAL.md`** — the visitor's handbook: every room and desk, written for
   a non-technical user. Moves with any feature that changes what a user sees.
6. **`LEARNING-PATH.md`** — the self-paced curriculum built around this
   project; answer "why does this work" questions at the stage the user has
   actually reached.

---

## What's built (current state)

**Eleven scenes.** Grounds · the Keep (Eightfold Path + the Monk) · the
Library (ground floor, second floor, and a genuinely secret basement) · the
Study · the Workshop (three floors) · the Café · **the Inheritance Hall**.

**Six AI-backed residents** on one shared chat stack (`CHAT_AGENTS`) with live
streaming, per-resident memory, read-aloud, and a pocket-phone minimise:
Quill (Library), the Mountain Monk (meaning/conduct), Sebastian (the day), the
Steward/Investigator (café + Science Hall), the Computer, and the Tutor
(Academy).

**The day spine.** Writing Desk, Sebastian's calendar + scheduler, opt-in
reminder pings, the due badge, Still Open, task migration across days, The Log,
and **Paths** (ideas you pick up and walk — deliberately no due dates).

**The Writing Desk is the editor pane** (2026-08-03, `plans/WRITING-DESK-PLAN.md`
steps 1–4). Four things sit on one surface: **the pocketed book** you walked
over with (`state.readerPocket` → `deskBook()`), notes on it written through the
Reader's own `writeBookNote()`; **a resident picker** derived from `roles.js`
(`deskResidents()`) where each keeps a separate thread in `state.plannerChat.byAgent`
and answers through the same `CHAT_AGENTS[key].systemPrompt()` as in their own
room, plus `deskFraming()`/`deskStateBlock()`; **your older notes**, recent and
resurfaced via the shared `forgottenNotes()` in `data/the-day.js`; and
**`deskDraftLesson()`**, which drafts into a note and stops — the model drafts,
the person promotes. `test/live/writing-desk.mjs` counts the picker against
`ROLE_KEYS` in both directions and asserts nothing reaches the tree unpressed.

**Learning.** The Learning Tree (a real prerequisite curriculum, progress in
`data.curriculum`), the Academy Tutor (teach / quiz / review / plan a lesson),
`lessons/` as the content home, and the Course Board.

**The Science & Research Hall.** Investigations requiring evidence *and* a
falsifier, self-experiments (n-of-1), and keepable, re-readable paper analyses.

**The Library.** Two floors, ten shelves plus **Your Library** — the personal
half, with **your own named shelves** (`data.myShelves`), bulk filing, search,
and an optional local-AI shelf suggester. Two taxonomies kept deliberately
apart: `TRADITIONS` is the *commons'* lineage ordering and stays fixed; a
visitor's own shelves are theirs and unbounded. `openShelf(name)` resolves all
three cases (Your Shelf → everything personal; a custom name → personal only;
a tradition → certified + personal side by side).

Also: the serif Reader with read-aloud, the Index and the Stacks, bulk import,
drag-and-drop `.txt`/`.epub` intake, and the eight Caravan connectors in
`tools/caravan/`. **27 texts in the shipped seed** — 6 complete source texts, 11
written for the Pavilion (including three guides), 10 classics carried as
summaries that say so and invite the real text; ~51 on the
dev machine's full setup.

**Standing instructions + the prompt inspector.** `data.standing[agentKey]` is
appended to a resident's system prompt by `withStanding()` — the single funnel
every send path calls, so no route can silently skip it. `recordSent()` captures
the exact message array at each call site; the inspector renders that array, not
a reconstruction. Kept in memory only (a window on the last call, not a record).

**User-authored lessons.** `data.myLessons` merges with the built-in
`CURRICULUM` through `allNodes()`; `curriculumNode()` and every prereq/progress
path read from both. A user lesson is an ordinary node with `mine:true`.

**Library administration.** The **Steward's Index** (Caravan Desk) edits any
catalogue card in-game. Certified entries live in `seed.js`, which a
browser can't rewrite, so edits are an **override layer** (`data.catalogEdits`)
applied in `store.js`'s `mergedDocs()` — the one choke point every read passes
through. Exportable, and reversible per card. The **copyright check**
(`data/copyright.js`) triages whether a text may be shared: deterministic rules
decide, the local model only extracts evidence, uncertain always defaults to
personal. Both are covered by `npm test`.

**Sharing — two kinds, both file-based, neither needing a server:**
- **The Commons Table** (Café) — *packets*: papers, lesson plans, courses
  published for anyone to use.
- **The Inheritance Hall** — *bequests*: books, notes and courses left as gifts
  in a sand court, optionally buried behind a real requirement.

**The yours/shared/commons distinction** — one vocabulary in
`data/visibility.js`, badges on every content surface, and `DATA_MAP` rendered
in Your Data. **`npm test` fails if a save store has no `DATA_MAP` entry.**

---

## Invariants — the structure to keep, not silently change

- **The Temple (Eightfold Path) and the Library stay, always, in every tier.**
- **Three residents, three roles:** Quill teaches, the Monk guides, Sebastian
  works with you. The Monk always gets the best local model and real room to
  think.
- **Three charters, don't cross them:** `CHARTER` (in-world residents,
  devotional), `WORK_CHARTER` (work tools — neutral, serves any goal),
  `BUTLER_CHARTER` (Sebastian). Never skew a secular goal toward the dharma.
- **No background polling.** Every AI call is triggered by a real user action,
  never a timer. Load-bearing.
- **Nothing moves by itself.** No sync, no upload. Work becomes shared only
  because a person deliberately wrote a file and handed it over.
- **Local-first.** No paid cloud API required. Cloud AI is an eyes-open opt-in,
  always labelled ☁.
- **Effectiveness before features or personalities.** A resident that answers
  reliably beats a richer one that hangs.
- **The sleeper car.** Low-res on purpose, so the machine's resources go to
  AI / Library / work rather than the renderer. This is the tie-breaker on
  "looks more impressive" vs "does more, uses less."
- **Build it ourselves before a third party.** The long path is the shortest.
- **Provenance at the door.** Every *shared* text carries license + source.
  Your own shelf needs neither — a personal copy is your business.
  "Restricted"/"dangerous" content is always 100% atmosphere, never real harm.

---

## Code map

```
data/seed.js → data/store.js → scenes.js → entities.js → ui/overlays.js → render.js → main.js
(content)      (persistence)   (world)     (state+logic)  (DOM panels)     (canvas)    (loop+input)
```

- **`main.js`** — the rAF loop, input, audio, and `onAction()`'s dispatch.
- **`scenes.js`** — pure data: tile grids plus npcs/signs/warps/stations. A new
  room is a `build*()` function plus registration in `scenes`.
- **`entities.js`** — the one mutable `state` and the one saved `data` object,
  `freshData()` + every migration, world lookups (`tileAt`, `blocked`,
  `plantingAt`, `canPlantAt`), fishing, NPC wander.
- **`ui/overlays.js`** — **the big one** (~10k lines). Every panel, the chat
  stack, `CHAT_AGENTS`. **It opens with a map of itself**, anchored to searchable
  text rather than line numbers and checked by `npm test`. Read that first.
- **`render.js`** — owns the canvas; reads state, never mutates it.
- **`data/`** — `seed.js` (library), `store.js` (persistence + library
  adapter), `charter.js`, `visibility.js` (yours/shared/commons + `DATA_MAP`),
  and five pure-logic modules added 2026-07-28, each covered by `npm test`
  precisely because they hold rules that erode quietly: `the-day.js` (what is
  waiting for you, and the four rules that keep it from becoming a nag),
  `shelf-rules.js` (file the obvious books with no model at all),
  `machine-advice.js` (can this computer run a model, and the honest "no"),
  `draft-parse.js` (what a small model actually returns, not what it was asked
  for), `copyright.js` (rules decide, the AI only gathers evidence),
  `bequests.js` (Inheritance Hall gate gifts), `commons-packets.js` (starter
  shared work), `supabase.js`/`auth.js`/`exchange.js`/`agentNotes.js` (the
  optional, currently-dormant server layer).
- **`electron/`** — `main.cjs` (Ollama proxy, save dialog, MinIO write/delete
  via `mc` in a throwaway container), `preload.cjs` (the `desktopBridge`).
- **`tools/caravan/`** — the eight source connectors and the draft/promote/
  push-fulltext pipeline.

---

## Mechanical gotchas that will bite you

- **Every `onclick="fn()"` must be in the `Object.assign(window, {…})` block at
  the bottom of `ui/overlays.js`**, or it silently does nothing. **`npm test`
  now enforces this** — it cross-checks every inline `on*=` handler against the
  export block. It found two live no-ops the day it was written (`openShelf`,
  and the Learning Tree's own "Back to the Course Board"). A silent no-op button
  is worse than a crash: nobody reports it.
- **`node --check` cannot catch a nested backtick inside a template literal.**
  Writing `` `.json` `` inside a template string parses as a *tagged template* —
  legal syntax, runtime crash ("(…).json is not a function"). Found 2026-07-27.
  Use `<b>.json</b>` or `&#96;`.
- **A partial `window.desktopBridge` breaks startup.** The app assumes a
  complete bridge if one exists. Only relevant when stubbing it in a test —
  install the stub *after* load.
- **Supabase rows replace the seed, they don't merge.** Seed edits won't show
  if Supabase is configured.
- **Movement needs *held* keys, not `.press()`** if you ever automate a browser.
- **Save migrations are per-field and lazy.** Every new store needs a
  `if(!data.x) data.x=…` line *and* a `DATA_MAP` entry (the test enforces the
  second, not the first).
- **Git Bash mangles `docker run -v` paths.** Prefix with
  `MSYS2_ARG_CONV_EXCL="*"`.

---

## Testing

- **`npm test`** — `test/smoke.mjs`: scene/warp/station/building sanity, no
  overlapping interactables, seed-library shape, and the `DATA_MAP` coverage
  guard. No browser needed.
- **`node --check <file>`** after editing any module.
- **Seeing it for real.** The live harness (puppeteer-core + system Chrome +
  `vite preview`) drives the actual game and screenshots any panel — set up in
  the scratchpad, not the repo, to keep dependencies clean. Seed a save via
  `localStorage` before load (seed *once*, or a reload wipes what the test
  wrote), click `#startBtn`, then call any `window.*` handler. `data`/`state`
  are **not** globals — only handlers are. This is how the Inheritance Hall and
  the Commons Table were verified (49 live checks across four suites).

---

## The five run modes

```
npm install
npm run dev              # 1 · browser, live reload (needs OLLAMA_ORIGINS for AI)
npm run build && preview # 2 · static build; deployed at sandpiviliongame.vercel.app
npm run electron:dev     # 3 · desktop window over the dev server (no CORS setup)
npm run electron:build   # 4 · installer carrying YOUR .env.local (personal setup)
npm run electron:build:beta   # 5 · the shareable installer, built local-only
```

Mode 5 builds with `.env.beta` (committed, deliberately empty), which Vite's
mode priority guarantees overrides `.env.local` — no Supabase key, URL, or MinIO
endpoint can reach the shipped installer. Verified by grep on every build.
Installers land in `release/`. Unsigned on purpose; Windows shows an "unknown
publisher" warning on first run.

**Caution on this machine:** the beta installer and your Mode-4 install are the
same app to Windows. To try the beta without replacing your own, run
`release/win-unpacked/Sand Pavilion.exe` directly.

---

## The backend — now, next, later

**THE CATALOGUE IN POSTGRES IS A MANUAL SNAPSHOT, and it goes stale.**
`tools/load-library.mjs` walks MinIO and writes rows; **nothing re-runs it**,
and it only ever sees MinIO. `shelveAsPersonal()` has THREE storage paths —
MinIO, a desktop app-data file, and inline in the save — so a book can be on
the shelf and in none of the database's 294 rows. *The Long Discourses of the
Buddha* was exactly that on 2026-08-03. **Never quote a database count as if
it were the library.**

**Now (and for the whole beta): there is no backend.** A Pavilion is a folder
and a save. Three storage tiers, each degrading honestly:

| What | Where | If it's missing |
|---|---|---|
| The save (days, notes, courses, progress) | `localStorage` key `sandPavilionSave.v2` | — always present |
| Personal book **text** | local **MinIO** (Docker, `sand-pavilion-library` bucket, 100 GB reserve) | an app-data file via the desktop bridge, then inline |
| The catalog | bundled `seed.js` | — optionally mirrored from Supabase, currently dormant |

**A book added by hand — any source, or none — already lands in MinIO** through
`shelveAsPersonal()`. The source field is free text and the license is optional
*for your own shelf*; both matter only when something is shared.

**The distinction that keeps this honest: your MinIO is *yours*, not a
commons.** It's storage on one machine. Nothing connects two people's
containers, and a tester with no Docker simply gets files instead. What is
actually shared today is a **file a person carried** (a packet or a bequest).

**Next:** move the catalog off Supabase entirely — a local `catalog.json`, then
a local Postgres in the same compose as MinIO. `store.js` already has the
adapter seam; this is a data export plus one source. See
`plans/SELF-HOSTED-STACK-PLAN.md`.

**Later, and only when there is genuinely a second person to serve:** a small
VPS running *the same* Postgres + MinIO stack — renting a box, not joining a
platform. That is the only version where other people's books land in one
shared library, and it is the only step that costs money. Auth is the one
honestly hard piece; it is named rather than pretended away.

**Do not build a feature that requires Supabase**, or any third party, unless
we genuinely cannot run it ourselves — and say so plainly when that's the case.

---

## What's next

**Read `plans/SHIPPING-THE-BETA.md` first** — one file, how to hand it over,
and "the first ten minutes" (the path the beta is actually built around and
held to). `plans/done/BETA-PREFLIGHT.md` is the older checklist; its three headline
risks were closed on 2026-07-28 and it says so at the bottom.

**Where things stand, end of 2026-07-28:** beta.2 is cut, verified, **installed
and used** — the last genuinely unverified thing is closed. Everything is pushed;
the repo is **still private by choice**. The next action is making it public and
cutting the Release.

**Where things stand, end of 2026-08-03 (FOURTH session) — read this one.**

**THE PAVILION HAS A BACKEND.** Local Postgres in Docker beside MinIO, and
the split that governs everything from here:

```
MinIO      the book TEXT        296 texts, 168 MB
Postgres   the KNOWLEDGE        294 books, 6,361 chapters, notes, records
localStorage  YOUR day          days, notes, courses, progress
```

The reason, in the steward's words, and it is sharper than "local-first":
**Supabase did not allow AI integration on the backend.** A resident should
ASK a question of the library, not be handed a pasted list and left to guess.

**What went in**
- `docker-compose.yml` + `tools/schema.sql` (books, chapters, health, scans)
  and **numbered migrations** — 002 notes (with full-text search), 003 the
  Records Hall index and `hidden`. Every migration is re-runnable and was
  applied **twice** to prove it.
- `electron/db.cjs` — **named queries only** (the renderer asks for
  `'unshelved'`, never SQL) and **fails soft in 27ms** with the container
  stopped.
- `store.js hydrateFromDb()` — pulled ONCE at boot because every
  `allDocs()` downstream is synchronous and mid-render. **It MERGES UPWARD:**
  a shelf the visitor assigned always beats a NULL, and the save's real cards
  are written back up. Guarded by `test/live/backend.mjs` (12 checks),
  sabotage-verified.
- `pg` is the project's **first runtime dependency**. `dependencies` was
  empty; that was a deliberate break, not a shrug.
- **The chapter finder, rebuilt** against the steward's real 296 books rather
  than the six in the seed. Across all of them: **0-chapter books 135 → 88,
  working books 106 → 160**, and Epictetus' *Discourses* — the reported
  "still the first four chapters" — went **4 → 89**, verified in the app.
- **Quill looks things up** instead of reciting a catalogue. An empty search
  is now real information, so "not on these shelves" is a fact he may state.

**Three of this session's own guards were born broken and were caught only by
deliberately breaking the thing** (rule 2, earning its keep for the fifth and
sixth time this week). The worst: the prompt-budget guard parsed apostrophes
in COMMENTS as string quotes, so every token figure it ever printed was wrong
in both directions. Fixed; the numbers in it now mean what they say.

**THE RULE THAT DID NOT CHANGE, and is tested:** the app runs with every
container stopped. Seed + localStorage is a complete Pavilion. `CLAUDE.md`
now states how that coexists with a real database — *a feature that needs it
is ABSENT without it, never DEGRADED*, because two code paths means the one
you test is not the one that runs.

**The Writing Desk was rebuilt on 2026-08-03 (fifth session)** — all four
steps of `plans/WRITING-DESK-PLAN.md`. It was a day planner with one AI panel
hardcoded to the Steward while your notes, your book and a drafting lesson
lived in three other rooms. It now carries the pocketed book (write a note on
it without leaving), a resident picker derived from `roles.js` with one thread
each, your older notes including the resurfacing rule, and a lesson drafted
into a note that reaches the tree only when you press. See the section above
for the code map.

**What's next, in order:** hand-marked chapters for the 88 books that still
find none (`source='hand'` and `confirmed` already exist in the schema and
nothing writes them); the real-library sweep promoted to `tools/chapter-sweep.mjs`
so "how does this do on the actual library" is one command; then the launch
mechanics — `npm run verify:release` currently FAILS correctly (the installer
is older than the source), so: `build:beta`, `electron:build:beta`,
packaged-boot, and `plans/BETA-RELEASE-NOTES.md` updated. After that: the
sorter on `v_unshelved` (twenty at a time, resumable, allowed to say UNSURE —
mostly deletion now); the notes and records tables actually filled; the rest
of the residents given lookups the way Quill has one.

**And still, unchanged and still the most important line here:**
`0.1.0-beta.3` has **zero downloads**. All of the above makes the steward's
own Pavilion better, which is a real goal he named. It does not put it in
front of a second person, and nothing in this repo can.

**Where things stood, end of 2026-08-03 (THIRD session).**

Round 5's list, taken in order, and the day's lesson is in #45 below: **the
first time a real model was pointed at one of the prompts that had only ever
run on its no-AI path, it was confidently making things up.**

- **Chapters (#41) — fixed, and the diagnosis was too generous.** The old
  scan read the first three lines of a 1,400-character page. It did not find
  "the first four chapters"; it found **zero** of the Dhammapada's 26 and
  **zero** of the Gita's 18, both of which ship in the welcome packet. Now
  26 and 18. The written cure (parse the Contents, find each name's second
  occurrence) had to be **inverted after measuring it**: chapter titles are
  ordinary words, so name-matching lands on page 1. The **body** is the
  authority on pages, the **Contents** on names. `data/chapters.js`, pure
  logic, tested against the real books. Books with no chapters now *say so*.
- **A note knows its chapter.** `ch. 5 · page 8`, and `ch. 5 of 26` in the
  reader as you move.
- **Per-book notes (#42) — built.** From the reader or the Books filter;
  grouped under real chapter headings, in the book's order.
- **Prompt weight (#43) — trimmed, and the real weight was elsewhere.** The
  Investigator's prose came down 1,409 → 1,187 tokens with no rule dropped.
  But two blocks in the same prompt pasted *everything* every message: every
  seeded investigation with its full grounding note (~430 tokens before you
  do anything), and every Science/Hindu book with its full summary, growing
  without limit. **That is the Quill catalogue bug, still live in the Hall.**
  Both bounded now — ~533 tokens saved per message, growth gone.
- **#45 — the pre-notes were lying.** Asked for pre-notes on the Dhammapada,
  `ornith:9b` wrote *"grouped into five thematic chapters"*. It has 26. On a
  431-character Tao Te Ching blurb it invented an author, a technical term,
  and **a quotation** — with "never invent a quotation" in the prompt it had
  just been given. **A rule the model must notice it is breaking is weaker
  than a fact it is simply given**, so it is handed the real structure
  (`bookStructureBlock()`, built on the chapter work above) and told the
  thinness in numbers. Re-probed: *"51 pages across 26 chapters"*, and *"the
  text itself is not here."*

Four guards added, each verified by deliberate sabotage — and **one was born
broken**: the prompt budget called `briefTokens()` (which takes text) with a
character count, measured the length of the number, and reported 2 tokens for
every resident. It passed against a prompt padded with 2,000 characters. Rule
2 caught it. That is the third inert guard this repo has found this week.

**The next real information is still one other person's first ten minutes.**
Nothing above changes that. The town square is the likeliest thing to produce
one, and it needs the identity keypair first.

**Where things stood, end of 2026-08-03 (second session).**

A long day, and the shape of it is worth keeping: **the steward found every
bug by using the thing, and several had passed every automated check.** Two of
those were invisible-by-construction and are the ones to remember:

1. **Ollama runs every model at `num_ctx` 4096 unless told otherwise.** We sent
   `num_predict` and never `num_ctx`, so a 7,279-token request was evaluated at
   2,050 and the model answered "I am Llama, by Meta AI" — having been told, in
   the first line it never saw, that it was the Investigator. **The resident's
   identity was being deleted before the model saw it.** Sized per request now.
2. **A patch script aborted before writing, so an import never landed while the
   code calling it did.** `node --check` passed, the build passed, `npm test`
   passed, and the reader's full text was dead. `npm test` now walks every
   `data/*.js` export and fails if `overlays.js` calls it without importing it.

Built today: the study chain (note → lesson → a path you walk → Today; book →
dissection → investigation), the roles cleaned up from one table with a
directory for the visitor, the Steward recast as the workhorse with real
pre-notes, the Reference Desk (`ref`), retrieval (BM25 over a book's own
pages), and the catalogue brief that stops the librarian getting worse as the
Library grows.

**Tomorrow's list lives in `plans/BETA-TESTING-FEEDBACK.md` Round 5** — chapters
via the table of contents (#41) is the one to take first, and the diagnosis is
already written. **What to poke at is in the same place**, and the honest
headline there is that the dissection lenses, the pre-notes and every reworked
prompt have only ever been run on their no-AI paths.

**And still: beta.3 has zero downloads.** Everything above is more good work
that no second human has seen. `MAKING-AND-THE-OPEN-HARDWARE-COMMONS.md` now
opens with the reason a **town square** — a free page for anyone with something
to show — is the likeliest thing to change that, and it is a small build.

---

**Where things stood, end of 2026-08-03 (first session) — the study chain.**

**The chain now runs.** `plans/done/THE-STUDY-CHAIN-PLAN.md`, built in one session from
real use. The diagnosis is worth keeping in front of you because it is the
shape of most of what is still wrong anywhere in this codebase:

> Everything in the Pavilion **produces** something. Almost nothing that gets
> produced can become the **input** to the next thing.

Three joints were missing and every room on either side of them already worked:
a plan drafted by the AI died as text in a note; nothing in the app knew which
lesson you were actually *on*; and a book on your own shelf could not become an
analysis you keep. All three are joined now — **note → lesson → a path you are
walking → ☀ Today**, and **book → dissection → investigation**. `data.study`
is one field; a book dissection is a `data.hall.dissections` entry that knows
its book. No new store was invented for either, on purpose.

Guarded by `test/live/study-chain.mjs` (33 checks) and the `plan-to-lesson.js`
cases in `npm test`. Both were verified by deliberate sabotage, per rule 2.

**Still true, and still the most important line here:** `0.1.0-beta.3` has
**zero downloads**. Everything above is more good work that no second human has
seen. The chain being built does not change what comes next; giving it to one
person does.

---

**Where things stood, end of 2026-08-02.**

`0.1.0-beta.3` is **published and verified** (asset digest matches the hash in
the notes) and has **zero downloads**. That is the honest state of the project:
everything built for other people — the welcome packet, the feedback composer,
the release page, the guides, the first-ten-minutes flow — has still never met
a second human. The steward's call is to polish before promoting, which is
right. But the next real information comes from one other person's first ten
minutes, not from any list in this repo.

**The day's lesson, and it is now the first thing `CLAUDE.md` says: every
serious bug found on 2026-08-02 was found by LOOKING.** None were found by
reasoning. A Lab that was built and unreachable, three panels that could not be
dismissed, a staircase that was only a sign, an Index that hid the shelves the
steward had just spent an evening making, a documented drop gesture that did
nothing anywhere. All of them found in about ninety seconds of walking around,
by a person, after passing tests written by me.

**Closed on 2026-08-02:** every finding from the first real sorting session
(#34–#40), the drop-anywhere lie (#33), book bundles end to end with a real
welcome packet, the Stacks learning custom shelves, Security 101 — and with it
**the last `status:'planned'` stub in the Learning Tree. Every lesson is real.**

**Genuinely open, in the order I would take them:**
0. **Walk the chain yourself before anything else** (added 2026-08-03). Take a
   real book off your own shelf, dissect it over two sittings, make a plan from
   what you found, put it in the tree, pick it up, and see whether ☀ Today
   offers you the right thing the next morning. It passes 33 live checks, which
   is not the same as being *good*, and the seams between rooms are exactly
   where this project's bugs have always been.
1. **Give it to one person.** Not a public push — one person who will say when
   they are confused. Everything else is guessing.
2. **The pool door in-game** (`BOOK-BUNDLES-AND-THE-POOL.md` B2) — 75 MB sits
   in MinIO and cannot be seen from inside the Pavilion.
3. **`pull-fulltext.py`**, through the S3 API. The symmetrical half of
   `push-fulltext.py`, and the reason is recorded in `make-bundle.mjs`: reading
   the pool by poking at MinIO's files worked and returned corrupt text.
4. **Piper for voice** (`VOICE-PLAN.md`). The OS voices got the steward most of
   the way — Windows' Natural voices, which are installed and never found.
5. **The macOS `.dmg`** — never built. CI can do it on a `v*` tag.
6. **`overlays.js` is ~10k lines.** No bug has ever come from that, the pure
   logic is already out in `data/*.js`, and there is now a map at the top with a
   test keeping it honest. When it is split: by room, one at a time, while
   already working in that room. Never as a big-bang refactor.

**2026-08-02 — the Science Hall gained the Bench, and the research room finally
has a real subject.** The steward brought a concrete project — *build a universal
TV remote from scratch* — as the beta test `RESEARCH-ROOM-PLAN.md` always said
electronics should be. The reading list, the six-stage ladder, the parts, and the
five investigations it will produce are in
[`plans/UNIVERSAL-REMOTE-PROJECT.md`](plans/UNIVERSAL-REMOTE-PROJECT.md), along
with an honest audit of what the Hall supports today.

That audit's first finding is built: **a build had no home.** Self-experiments
are `a practice + one 1–5 measure, daily` — right for meditation, wrong for
making a thing. So the **Bench** (`data.hall.builds`, in the Hall under
self-experiments) logs *what I expected → what I did → what actually happened*,
and does it in **two phases on purpose**: the prediction saves alone, and only
then is the result half reachable. There is no path to edit a guess after the
fact. Guarded by `test/live/bench.mjs` (12 checks) because that property could
rot into one all-at-once form and still look perfectly fine.

**Then, same day, three more of that audit's gaps closed** — datasheets, paper
books, and the room:

- **A shelf entry now has a `kind`**: a book, 📄 a paper, ⚙ **a datasheet**
  (carrying a `part` number), or 📕 **owned on paper**. Set from a dropdown in
  Your Library; `setBookKind()`.
- **Datasheets get a lookup, not a browse**, because nobody browses one: `ds` at
  the Computer lists them by part, `ds <part>` opens the thing. `ls` gained a
  three-character kind column.
- **Books you own on PAPER** — no text here and never will be, which is the
  honest part. They stay findable and citable, and **`referenceShelfBlock()`
  tells the Computer, the Tutor and the Investigator that you own them**, so the
  answer can be *"you have that one, chapter 4, go and look"* instead of a worse
  explanation from memory. That is the whole reason the kind exists.
- **🔬 The Lab** (`openLab()`) — the gathering view: builds, datasheets, the
  paper shelf, investigations, experiments. It **owns nothing**; every count is
  read live from where the thing lives. This is `RESEARCH-ROOM-PLAN.md` Phase 1
  ("My Research") and the Hall plan's L1 room, both at once.
- **It cost no new building.** The Workshop's Unfinished Floor already carried a
  MAKER'S BENCH placeholder promising *"a home for real-world physical projects
  — a build, a repair."* That is what got built, so the placeholder **opened**
  rather than a room appearing beside it. `scenes.js` keeps the sprite key
  `makersbench`; only the visible name changed to THE LAB.
- Fixed in passing: the reader printed the literal word **"undefined"** under the
  title of every book added by hand (no `source_url`). Guarded, and tested.

**Guards:** `test/live/lab.mjs` (16 checks) and `test/live/bench.mjs` (12).

**One gap left from that audit:** the **Electronics track** — 201 is three
`(planned)` stubs and there is no 301. The six-stage ladder in the project file
should *be* that track. (The fifth item — a hard, measured exemplar investigation
in the Hall — is best written once the steward has actually run one.)

**The one open platform gap: macOS.** Most of the first testers are on Macs and
the `.exe` is Windows-only. A macOS app cannot be built on Windows, so there are
three answers, in [`SHIPPING-THE-BETA.md`](plans/SHIPPING-THE-BETA.md): the web
build (works today, auto-deploys from `main`), CI
(`.github/workflows/build-installers.yml`, both platforms on a `v*` tag), or by
hand on a real Mac ([`MAC-BUILD.md`](MAC-BUILD.md), written for someone with no
context).

**The three gates to a real beta** (nothing large):
1. **[done 2026-07-28] The welcome-packet decision** — resolved by honesty
   rather than bulk. The seed is **27 texts**: 6 complete source texts, 11
   written for the Pavilion (whole as they stand, and now including three
   guides — a local AI explained, filling your own shelves, and what to do when
   something misbehaves), and 10 classics carried as summaries. Each of those
   ten now **says so in the reader**, names its source, and invites a drag-and-
   drop that turns the page into the real book (`BETA-TESTING-FEEDBACK.md` #18,
   #21).
2. **[done 2026-07-28] The installer is cut** — `release/Sand Pavilion Setup 0.1.0-beta.2.exe`,
   and it is the first one ever verified as an *artifact* rather than as
   source. Before it, the packaged app **did not boot at all**: no
   `vite.config.js` meant absolute asset paths, which resolve to the
   filesystem root under `file://` — a title screen with a dead button and
   nothing behind it (`BETA-TESTING-FEEDBACK.md` #17). Always run
   `test/live/packaged-boot.cjs` before cutting another.
   **Never the plain `electron:build`**: that reads `.env.local` and bakes this
   machine's Supabase URL and key into the installer. `scripts/verify-beta-build.mjs`
   now runs inside both beta scripts and fails the build if a cloud host, a
   JWT-shaped string, a Supabase key or MinIO credentials survive into the
   bundle (added 2026-07-28, after a network probe caught a dev build calling
   Supabase on startup — `BETA-TESTING-FEEDBACK.md` #16).
3. **[done 2026-07-28] The install test** — downloaded from GitHub, installed,
   opened, used. Both origins now hold saves (`localhost:5173` for dev,
   `file://` for the installed app) and neither disturbs the other, exactly as
   predicted. Before this, the machine had a broken **0.0.1 from 8 July** whose
   localStorage held *nothing* under `file://` — disk-level proof the packaged
   app had never once run (#24).

**Test the artifact you ship, not the one you develop in.** The single most
expensive lesson of 2026-07-28, learned three times in one day: the packaged app
had never booted (#17), a plain build shipped this machine's cloud keys (#16),
and the deployed *website* was phoning Supabase while the README promised it
didn't (#27). All three were invisible to every existing test and obvious within
minutes of running the real thing and watching what it did. Both build paths now
carry `scripts/verify-beta-build.mjs`, and `vercel.json` pins the deploy to
`build:beta` so the promise is enforced where it is made.

**When a local model gets something wrong, ask it something smaller** — the
standing lesson from 2026-07-28 (`BETA-TESTING-FEEDBACK.md` #15). The lesson
draft was one call asking for five labelled fields and returned one step; split
into a chain of single questions it returns five, and the person watching gets a
"6 of 8" progress line and a Stop button instead of a spinner. Same cure for the
librarian's sort (sixty titles → eight at a time). Prefer a smaller ask to a
cleverer parser; it is usually the better *interface* as well as the more
reliable prompt.

**Then:** hand it to two or three people and let `BETA-TESTING-FEEDBACK.md`
fill up.

**Real but optional depth, each with a plan:** per-resident model assignment
(`BETA-LAUNCH-PLAN.md` #3 — still doesn't exist; `detectAI()` picks one
connection for everyone); voice *in* (`SpeechRecognition`); the Science Hall's
physics/electricity sandbox; the five sketched Workshop rooms; character
customization; the visual polish tail.

**Structural, and harder the longer it waits:** the move off Supabase
(above), and the seam between this personal instance and a lean shareable one
(`TOOL-COMMONS-PLAN.md`).

**Built late 2026-07-28, and the reason the rest matters:** `☀ Today`
(`data/the-day.js` + the pause menu) answers *"why open this today?"* — at most
five things actually waiting, each one press away, computed on open from saved
data with no AI and no network. **Sebastian's stand-up** delivers them one at a
time instead of presenting a form. `plans/done/WHY-OPEN-IT-TODAY-PLAN.md` holds the
diagnosis they came from — three complaints that turned out to be one problem:
everything here was a place you *could* go and nothing was *waiting for you*.
**The next move is not more building — it is using it for a real day**, because
every remaining item is better designed after that than before it.

**The positioning decision, 2026-07-28** (`plans/TRUST-LEVELS-AND-GATEWAYS-PLAN.md`):
**the website is the commons, the installed app is your Pavilion.** Different
things, different jobs — the site is a library you visit, the app is a house you
live in, and ownership is the point of the split. The commons site is *additional,
never a replacement*: do not remove the playable browser build, which is currently
the only Mac answer. Same plan covers cloud gateways (the provider layer already
speaks `ollama`, `openai-compatible` and `anthropic`, so it is presets and
task-routing, not protocol) and the green/yellow/red badge — where the colour
answers exactly one question, *what leaves this machine*, and red means "we cannot
honestly say", never "you are compromised", which nothing can detect from inside.

**Two plans written 2026-07-28 that shape near-term work:**
`plans/CAPTURE-PATHWAYS-PLAN.md` — bringing a page you're reading into the
Pavilion, with the load-bearing decision that **extraction is deterministic
Python (a Caravan connector), never an AI job**; the model only ever sees clean
text. And `plans/ONE-STEP-AT-A-TIME-PLAN.md` — Sebastian and the Learning Paths
as chains of small asks rather than forms and walls, generalising the morning's
lesson-drafting fix into a house pattern. Its first item (Sebastian's stand-up
as a chain) is the highest feeling-per-line-of-code change currently available.

**The longest-horizon thinking** is `plans/OPEN-COMMONS-PLAN.md` (2026-07-28):
sharing what you build, an AI representative that filters for *you* rather than a
platform filtering at you, provenance-not-verdicts on downloads, and reading the
internet into your own Library. Written as a plan, deliberately unbuilt — every
line of it is better designed after real users than before them.

**The master roadmap** is `plans/PLATFORM-ROADMAP.md`; the north star, stated
by the user, is *ease, direction, and turning knowledge into use* — the
tie-breaker for what gets built next.

**At session end:** append to `archive/dev-log-YYYY-MM-DD.txt` and update this
file's "What's next" to match reality. Commit only when asked; the project
commits straight to `main`.

---

*Everything turns to sand, so give it away first.*
