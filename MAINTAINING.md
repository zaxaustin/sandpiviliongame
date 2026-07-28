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
`tools/caravan/`. 24 texts in the shipped seed (6 readable in full); ~51 on the
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
catalogue card in-game. Certified entries live in `seed.js`/Supabase, which a
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
- **`ui/overlays.js`** — **the big one** (~7k lines). Every panel, the chat
  stack, `CHAT_AGENTS`.
- **`render.js`** — owns the canvas; reads state, never mutates it.
- **`data/`** — `seed.js` (library), `store.js` (persistence + library
  adapter), `charter.js`, `visibility.js` (yours/shared/commons + `DATA_MAP`),
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

**The three gates to a real beta** (nothing large):
1. **The welcome-packet decision** — only 6 of 24 seed texts read in full; the
   marquee classics are summary-only. Bundle more, ship a MinIO starter
   package, or label the summaries honestly. A decision, not a bug.
2. **Cut the installer** — `npm run electron:build:beta` at `0.1.0-beta.2`.
3. **The clean-machine install test** — hardware that never built it. Still the
   one genuinely unverified thing.

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

**The master roadmap** is `plans/PLATFORM-ROADMAP.md`; the north star, stated
by the user, is *ease, direction, and turning knowledge into use* — the
tie-breaker for what gets built next.

**At session end:** append to `archive/dev-log-YYYY-MM-DD.txt` and update this
file's "What's next" to match reality. Commit only when asked; the project
commits straight to `main`.

---

*Everything turns to sand, so give it away first.*
