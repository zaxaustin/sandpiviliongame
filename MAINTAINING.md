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

**Twelve scenes**, in **two Grounds** since 2026-08-10 — `npm test` prints the
count, so this number is derived rather than remembered:

| **The Pavilion** — study alone | **The Works** — make, meet, give, rest |
|---|---|
| `overworld` (the road) · `keep` (Eightfold Path + the Monk) · `library` + `libraryfloor2` + `librarybasement` (genuinely secret) · `study` | `works` (the road) · `workshop` + `workshopfloor2` + `workshopfloor3` · `cafe` · `grove` (the Inheritance Hall, the Alexandria Stone, the pond) |

**Seven role keys, six people.** `ROLES` in `data/roles.js` has seven entries —
`quill · monk · sebastian · steward · investigator · tutor · computer` — and the
Steward and the Investigator are **the same resident in two rooms**, under two
different charters (see the charter invariant below). Both numbers matter: seven
is what a guard counts, six is who a visitor meets.

One shared chat stack (`CHAT_AGENTS`, in **`ui/residents.js`** since 2026-08-04)
with live streaming, per-resident memory, read-aloud, and a pocket-phone
minimise. Every one of the seven reaches the Library, the backpack and your
notes by the **same** `pathwayBlock()`; the only difference is a one-line `lens`
in `roles.js`.

**The day spine.** Writing Desk, Sebastian's calendar + scheduler, opt-in
reminder pings, the due badge, Still Open, task migration across days, The Log,
and **Paths** (ideas you pick up and walk — deliberately no due dates).

**The Writing Desk is the editor pane** (2026-08-03, `plans/WRITING-DESK-PLAN.md`
steps 1–4). Four things sit on one surface: **the pocketed book** you walked
over with (`state.pocketSlug` + `data.readingPos` → `deskBook()`; the old
`state.readerPocket` was retired 2026-08-07 and the page it held is now saved),
notes on it written through the
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
`tools/caravan/`. **`SEED_LIBRARY` is `[]` — nothing ships on the shelf**, and
that is permanent (2026-08-10; the 27 former texts are in
`archive/seed-texts-2026-08-10/`, re-download list in `docs/BOOKS-TO-SOURCE.md`).
**This section said "27 texts in the shipped seed" until 2026-08-10 while the
Library section 250 lines below correctly said the shelf was empty** — the file
contradicted itself, which is why `npm test` now derives the number instead.
The dev machine's own setup is **415 catalogued**.

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
  works with you. **The Monk is no longer given a bigger model** (retired
  2026-08-07 — see `CLAUDE.md`).
- **THE MONK MAY BE CLOUD, and that is a decision** (2026-08-10): *"the monk can
  be cloud if there computer cant run local ai alot of people have laptops just
  let the user know."* This bullet used to claim he was local-only "enforced by
  the transport layer's cloud guard" — there was no such guard, and the property
  had been silently lost on 2026-08-07 with his model tier. Rather than restore
  it, the steward dropped it: **a laptop that cannot run a local model must not
  mean no Mountain Monk.** Every resident uses the one detected connection.
- **SO LABELLING IS THE INVARIANT NOW, and it must be where the person is.**
  `isLocalConn()` in `ai/provider.js` is the single definition, `detectAI()`
  stamps `AI.local`, and the **chat header** says 🏠/☁ with what it means. The
  Connections panel badged this all along and the room where people actually
  speak did not — an honest choice the visitor cannot see is not an honest
  choice. **Never let a surface that sends words to a model omit this.**
- **A resident may name a book from the catalogue and may never claim to have
  read one it is not carrying.** The lookup returns shelf metadata — title,
  author, shelf — and not one word of any book's text. `carriedBlock()` is the
  only path by which a text reaches a prompt, and it sends a card, not the book.
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
  room is a `build*()` function plus registration in `scenes`. **TWO GROUNDS
  since 2026-08-10:** `overworld` (the Keep, the Library, the Study) and
  `works` (the Workshop, the Café, the Inheritance Hall, the pond), joined by
  a road east/west. Every building carries its own `door` column — that used
  to be three absolute tile numbers hard-coded in `render.js` by building
  *type*, which would have painted the Café's door onto blank wall the day it
  moved. `npm test` now flood-fills every scene from its spawn and fails if
  any warp, station, sign or resident stands where nobody can walk.
- **`data/places.js`** — **every room, and the one keystroke to it.** The pause
  menu's PLACES section is derived from here, never hand-listed. Before it
  existed the menu reached ~25 panels and named **no rooms at all**: eleven
  exported openers were in it nowhere, and `openArchive` was on no window at
  all, so nothing in the whole application could click the Archive Desk open.
  `npm test` crosses it against `scenes.js` in **both** directions.
- **`entities.js`** — the one mutable `state` and the one saved `data` object,
  `freshData()` + every migration, world lookups (`tileAt`, `blocked`,
  `plantingAt`, `canPlantAt`), fishing, NPC wander.
- **`ui/overlays.js`** — **the big one: 13,591 lines** (740 top-level
  definitions, ~2,000 lines carrying HTML). Every panel not yet extracted, the
  chat stack, and the window-export block, which it owns permanently. **It opens
  with a map of itself**, anchored to searchable text rather than line numbers
  and checked by `npm test`. Read that first. *(This entry said "~10k lines"
  until 2026-08-10, and the file's own header said "~10,000 lines, and that is
  fine" — both understated it by ~3,000. See `plans/OVERLAYS-SPLIT-PLAN.md`.)*
- **Already out of it:** `ui/residents.js` (1,238 — `CHAT_AGENTS`, every
  `systemPrompt()`, and `pathwayBlock()` with the whole grounding chain), `ui/lesson-tree.js` (1,063), `ui/study-table.js` (747),
  `ui/daily-tasks.js` (334 — **born outside**, the shape to copy), `ui/dom.js`
  (27 — `esc`/`jsq`).
- **`render.js`** — owns the canvas; reads state, never mutates it.
- **`data/`** — `seed.js` (**now `[]`**, the shape and `TRADITIONS`/`CATEGORIES`
  remain), `store.js` (persistence + library adapter; `mergedDocs()` is the one
  gate every catalogue read passes through), `charter.js`, `visibility.js`
  (yours/shared/commons + `DATA_MAP`), and the pure-logic modules, each covered
  by `npm test` precisely because they hold rules that erode quietly:
  - `the-day.js` — what is waiting for you, and the four rules that keep it
    from becoming a nag
  - `shelf-rules.js` — file the obvious books with no model at all
  - `machine-advice.js` — can this computer run a model, and the honest "no"
  - `draft-parse.js` — what a small model actually returns, not what it was
    asked for
  - `copyright.js` — rules decide, the AI only gathers evidence
  - `commons-packets.js` — starter shared work (**3 packets, real**)
  - `bequests.js` — the Inheritance Hall gate-gift *shape*. **`GATE_BEQUESTS`
    is `[]` since 2026-08-10** — the shipped gifts were a seed pathway and went
    with the seed. The module stays: it is what your own bequests are built
    from, and deleting a working shape because its list is empty is how a
    feature quietly disappears.
  - `supabase.js`/`auth.js`/`exchange.js`/`agentNotes.js` — the optional,
    dormant server layer. **Supabase is gone** (2026-08-02); these are kept as
    history, never as instructions.

  **The five that were missing from this map entirely** until 2026-08-10, all
  load-bearing and all added since the map was last written:
  - **`data/places.js`** — see above; the room table the pause menu is derived
    from, and now also the seam the `overlays.js` split follows
  - **`data/lookup.js`** — **one road to knowledge.** `groundingPlan()`,
    `lookupTerms()`, `privacyLeaks()`, `reachGap()`, and the `REACH` table
    saying what may be searched versus what must be carried. Books are looked
    up; notes are not searched unasked. **Every term extractor in the
    application comes from here** — the shelf lookup, the notes search and the
    passage retrieval all share `lookupTerms()`, and the third one did not until
    2026-08-10, which is how a question about Hildegard retrieved two pages of
    Thoreau
  - **`data/retrieval.js`** — BM25 over one book's own pages, `paginate()` (the
    single definition of a page, so retrieval saying "p.47" and the reader
    showing p.47 cannot drift), the multi-slot `pagesOf()` cache, and
    `RESIDENT_PASSAGE_CAP` — the number standing between "the relevant
    fragment" and pasting the corpus
  - **`data/note-reach.js`** — the three states on a note: 🔒 sealed · 🔎
    askable · 🏛 published. **A different axis from `visibility.js`** — that one
    answers *can this leave the machine*, this one answers *may a local model
    here see it*. `npm test` asserts the two vocabularies never collide
  - **`data/carrying.js`** — the backpack: one `KINDS` table, a cap of 20 in
    hand, a "pick up later" shelf outside both the cap and the grounding, and
    `fitToBudget()` bounding grounding in **tokens** rather than items
  - **`data/book-storage.js`** — where a book's text actually lives, read from
    the book's own pointer and never from what is running: 🐳 Docker · 💾 this
    machine · 📄 in the save · 📝 summary only, plus the local shelf limit —
    500 by default and **set by the visitor** (`data.settings.localBookCap`)
  - **`data/daily-tasks.js`** + **`ui/daily-tasks.js`** — Today's Tasks, and the
    first room built entirely outside the monolith
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
  guard. No browser needed. **Since 2026-08-10 it also walks the world:** a
  flood fill from each scene's spawn proves every warp, station, sign and
  resident stands somewhere reachable; the scene graph must be connected in
  **both** directions (a one-way road is a trap); no warp may land you on
  another warp; and every room must have a keystroke door (`data/places.js`,
  crossed against `scenes.js` both ways).
- **`test/live/every-room.mjs`** — presses every room in the pause menu and
  checks a real panel came up. `test/live/two-grounds.mjs` — **walks** between
  the two Grounds and back. Movement here is **held keys, not `.press()`**, and
  a long walk is a timing measurement rather than a test: seed `data.pos` near
  what you actually want to prove.
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

**Where things stand, end of 2026-08-10 — READ THIS ONE.**
Full account in [`archive/dev-log-2026-08-10.txt`](archive/dev-log-2026-08-10.txt)
(Parts One–Five are the Library and the two Grounds; Six is the documentation
reconciliation; **Seven to Eleven are the grounding chain**).

> ## ⚠ READ BEFORE SCOPING ANYTHING
>
> **00 · THE PACE WORK HAS STARTED, and the charter is written LAST.** The
> steward named the project's own thesis — *"the pace is too fast… i want it to
> feel like its the users doing it and they have a sence of ownership"* — and an
> audit against it found **eleven contradictions in the code: 5 real, 5
> defensible, 2 arguable.** The plan takes the five, then writes `CLAUDE.md`
> rule 9 from what was actually built. **Writing the charter first would make it
> a wish**, which is the exact failure the grounding chain just spent a week
> undoing.
>
> - **DONE — one speaking rate.** `typewriteChatText()` used
>   `step = floor(text.length/90)`: a per-reply *budget*, so a long reply was
>   revealed faster per word than a short one, and the Monk spoke at two
>   different speeds depending on whether you had pocketed the chat. Three of
>   the eleven were this one bug. `DEFAULT_PACE` (90 cps) in `roles.js`,
>   `paceOf()` resolves for every role, both reveals compute their head from the
>   clock. **The visitor can now HOLD a reply** (⏸, asked for mid-session) —
>   pocketing does not pause it either.
> - **DONE — every note says who wrote it.** `note.by = {who,user,model}` in
>   `data/note-versions.js`, read-time backfill for the 415 books' worth that
>   predate it, and **AI notes stay in grounding, labelled** (the steward
>   overruled filtering them out, and was right). The live bug: `deskDraftLesson()`
>   handed a model its own earlier output under *"THEIR OWN NOTES ON THIS BOOK"*.
>   **Guard B was written first and failed seven ways** on untouched code.
> - **DONE — the outlet.** Publishing asks *why is this worth passing on?* once,
>   optionally, and the reason travels into the file and into the copy whoever
>   takes it makes. An AI-drafted packet says so.
> - **DONE — 1c/1d/1e.** A drop offers rather than turns your page; the boot no
>   longer writes into your activity log; the streak STAYS and
>   `data/daily-tasks.js` now records it as a stated exception.
> - **DONE — rule 9 is written**, and written LAST on purpose. Guards A, B and D
>   in `npm test`, each broken on purpose.
> - **NEXT — the tutorial (Part 3)**, five stages built on `data/badges.js`.
>   Also queued, found live 2026-08-09: **the Connections panel says the same
>   sentence for four different AI failures** — nothing on the port, no models,
>   misconfigured, or no *enabled* connection. That last one makes zero network
>   calls, so nothing anywhere records a failure. Rules 5 and 6 both.
> - **The `overlays.js` split is OFF the critical path** for the beta, on
>   Grok's advice — see [`plans/OVERLAYS-SPLIT-PLAN.md`](plans/OVERLAYS-SPLIT-PLAN.md).
>   The tutorial comes first.
>
> **0 · THE GROUNDING CHAIN IS FINISHED, and it is the thing to understand
> before touching a prompt.** Five commits on 2026-08-10, in this order and for
> this reason:
>
> 1. **The Outer court supports itself** — Docker demoted, the shelf limit set
>    by the visitor.
> 2. **`groundingPlan()` gets a caller** — the boundary is performed, not
>    described. One Library lookup a turn (6 → 3 round-trips). `think:true`
>    turned back on behind a switch.
> 3. **A role declares what it is given** — `grounding: [...]` in `roles.js`,
>    with a floor no role may decline. Measured **−484 tokens**.
> 4. **A carried book can be quoted** — real passages, real page numbers,
>    behind a cap that binds at **1,939 of 2,600 characters** worst case.
> 5. **A resident can say what it cannot reach** — and the visitor gets a 🎒
>    button that fixes it.
>
> **The order was not cosmetic.** 3 had to precede 4 because once passages are
> expensive, "everyone gets every block" stops being free. And **every one of
> these was a thing already built and reached by almost nobody** —
> `groundingFor()`, `chatOptsFor()`, `groundingPlan()`, `searchPages()`. That is
> the complete list of that shape found in one week, and **in every case a
> document asserted the feature existed.** Before adding anything to this layer,
> check whether it is already there and merely uncalled.
>
> **The rule that came out of it, and it cost six born-dead guards to learn:**
> when you check that something is wired, **check the statement, not the word** —
> `if(d) d.passages=`, not `/d\.passages/`; and strip a function's own
> definition before asking whether it is called. Every single one of those six
> died the same way: a leftover mention satisfied the pattern.
>
> **1 · Two promises the code stopped keeping on 2026-08-07 — BOTH NOW CLOSED.**
> When the Monk's model tier was retired, `chatOptsFor()` was emptied to
> `return {}` — and **local-only** and **`think:true`** went with it, unnoticed,
> while the docs kept promising both for three days.
>
> - **Local-only: RESOLVED 2026-08-10 — dropped on purpose.** *"the monk can be
>   cloud if there computer cant run local ai."* Every resident uses the one
>   detected connection; 🏠/☁ labelling in the **chat header** carries it now.
> - **`think:true`: RESOLVED 2026-08-10 — turned back on, off by default.** A
>   visitor switch (`data.settings.showThinking`) in the data panel; `chatOptsFor()`
>   returns `{think:true, deep:true}`, which gives the retired `deep` tier a
>   caller again. **The finding was itself half wrong** and the correction is
>   worth carrying: "the 💭 panel can never fill" was inference, not measurement
>   — `deepseek-r1` reasons unasked and had been filling it all along. Measured
>   properly, the switch also turned up a real bug: `think:true` on a model
>   without the capability is **HTTP 400**, so `canThink()` now filters it from
>   what Ollama reports. See [`docs/DOCS-DRIFT.md`](docs/DOCS-DRIFT.md).
>
> **The lesson generalises**, and it is the one to carry into the next audit:
> *"nothing sets this flag"* and *"this feature never happens"* are different
> claims. The first was checkable by grep and true; the second needed a model
> and was false. **Grep proves the absence of a caller, never the absence of a
> behaviour.**
>
> **2 · If the backend feels twisted, read
> [`docs/THE-BACKEND.md`](docs/THE-BACKEND.md) first.** It is the map, measured
> rather than inherited. The one sentence: **Docker buys capacity for the book
> TEXT — not privacy, and not search.** Both containers bind `127.0.0.1` only,
> and PGlite under `userData` is exactly as private, so **making Docker optional
> cost no privacy at all.**
>
> **3 · `npm run dev` shows an empty shelf by construction** — no bridge, a
> per-origin save, and a blank MinIO endpoint. Three reasons, not one. Use
> `npm run electron:dev`.

### The next session, in order

**The grounding chain is mid-build.** Parts 1–3 landed on 2026-08-10 (Docker
demoted, the three courts written down, the grounding path streamlined). 4, 5
and 6 are the rest of the same chain and are meant to go in that order.

1. ~~**Declarative per-role grounding**~~ — ✅ **done 2026-08-10.** `grounding:
   [...]` in `data/roles.js`; `pathwayBlock()` composes only what a role
   declares, and `wants()` fails CLOSED so an undeclared role gets nothing but
   its lens. Guarded both ways, plus a **floor**: `shelves`/`carried`/`notes`
   are the pathway and no role may decline them, which makes the 2-of-7 bug
   unrepeatable. **Measured, and it is not inert** — total across seven
   residents **49,152 → 47,505 chars (~−484 tokens)**, the Monk **−1,029**
   (~10%), on a save with paper books, datasheets and a full backpack.
   `training` landed with it: a resident's own book, declared as data.
   **`passages` is deliberately still absent** — it arrives with retrieval, in
   both the composer and the roles at once, because a kind declared before the
   composer knows it fails the guard and a kind implemented before anyone
   declares it is dead code.
2. ~~**Retrieval reaches the residents**~~ — ✅ **done 2026-08-10.** A carried
   book can now be quoted from, with page numbers the reader agrees with.
   `passagesFor()` in `ui/residents.js`, opt-in by role, **carried books only**.
   Cap went in on the first commit as `RESIDENT_PASSAGE_CAP` (2,600 chars across
   all books, 2 passages a book, 2 books) and **it binds**: worst case measured
   at 3 books carried and 7 very common words → **1,939 of 2,600 used**, third
   book correctly absent. Rise on the Monk: **+2,589 chars (~761 tokens)**,
   whole prompt 12,874 — well inside the 8,192-token floor's headroom.
   Multi-slot page cache in `retrieval.js` (4 books, oldest-used evicted);
   second ask on a warm cache is **~10 ms**.
   **Acceptance passed on a real 300 KB *Walden*:** `ornith:9b` quoted it
   verbatim and cited both pages; `llama3.2:3b` used the text but did **not**
   cite — which is why `passagesReceipt()` states the pages deterministically
   (rule 7), rather than hoping the model does.
3. ~~**The resident reach gap**~~ — ✅ **done 2026-08-10**, and with it the whole
   grounding chain. `reachGap()` is pure in `data/lookup.js`, three states, and
   **the doors are derived from `PLACES`** so renaming a room changes what a
   resident says. A 🎒 button per uncarried hit, capped at 4; **every button is
   a human press** and `npm test` fails if `residents.js` so much as calls
   `toggleInventory`. New Electron suite `test/live/resident-reach.cjs`, 21
   checks, including the round trip: press it → the book is carried → the gap is
   gone → passages arrive.
4. **Backend knot A, then B** — [`plans/THE-BACKEND-UNTANGLE.md`](plans/THE-BACKEND-UNTANGLE.md).
   A (one read path instead of two) makes B (a real `minioRead` on the bridge) a
   one-line change. Stopping after A is a complete session.
5. **`ui/computer.js`** — the first commit of
   [`plans/OVERLAYS-SPLIT-PLAN.md`](plans/OVERLAYS-SPLIT-PLAN.md), whose order is
   now derived from `data/places.js` rather than hand-listed. **One region per
   session that touches `overlays.js` at all** — "between things" never arrived,
   and the file grew 850 lines while that was the rule.

**`plans/AFTER-THE-LIBRARY.md` is four-sixths done** and marked as such. Still
open there: `notesInReach` (half built) and the notice board (not started).

### 📝 The documents were reconciled with the program on 2026-08-10

Twenty-three stale or unbacked claims, each measured against the code rather
than read off a dev log. The pattern worth remembering: **`SEED_LIBRARY` went to
`[]` and four files kept saying 27** — including `README.md`, the front door,
and `CLAUDE.md`, where it was rule 1's own worked example. `MAINTAINING.md` said
both 27 and "empty", 250 lines apart.

So it is **derived** now, not merely fixed. Two guards in `npm test`, each broken
on purpose: no document may claim a shipped book count that disagrees with
`SEED_LIBRARY.length`, and every `> ●`-quoted screen line in `MANUAL.md` must
exist in `src/` — **with comments stripped first**, because with comments
included the second guard passed while the string was gone, which is how three
guards in this project were born dead.

The full register, including what was deliberately left alone, is
[`docs/DOCS-DRIFT.md`](docs/DOCS-DRIFT.md).

### 📚 THE LIBRARY — the seed shelf is gone, and that exposed a real bug

**The seed shelf is EMPTY and that is permanent.** All 27 books deleted at the
steward's instruction; every text preserved in
`archive/seed-texts-2026-08-10/`, re-download list in
[`docs/BOOKS-TO-SOURCE.md`](docs/BOOKS-TO-SOURCE.md). The inlined
`data/library-texts/` (248 KB in every build) and the Inheritance Hall's
shipped bequests went with it — both were seed pathways.

**THE BUG IT WAS HIDING, and it is the important part.** `indexItems()` filters
by `category`, and **only `seed.js` ever set that field**. Books from the
database and from your own imports arrived `category: undefined`, matched no
tab, and the Index rendered **zero cards** while the storage line beneath it
correctly read "326 Docker". A shelf of 27 stubs rendered perfectly and hid the
fact that nothing else could. Fixed at `mergedDocs()` — the category is now
**derived from the shelf**.

That is CLAUDE.md **rule 1** stated as a bug. Every live suite seeded an *empty*
save, so all of them tested the seed and none tested a real library.
**`test/live/_books.mjs` is the fixture now** and nine suites use it.

**Two homes, both visible.** `data/book-storage.js` (pure, tested) decides from
the book's own pointer — never from what is running:

`🐳 Docker` · `💾 this machine` · `📄 in the save` · `📝 summary only`

Per book, plus a shelf line, plus the intake saying where the next book goes
*before* you drop it. Local storage caps at **500 books by default, a number the
visitor sets**, and refuses by naming
Docker as the way through.

**Migration 005 — `books.local_file`.** `text_key` only ever meant "the MinIO
object", so 89 rows looked like books owned on paper while 59 real `.txt` files
sat under userData. Two nullable columns, because a book can be in both homes;
`upsertCard` COALESCEs each independently. Now: **326 docker · 59 this machine ·
30 genuinely summary-only.**

**A browser tab is a SEPARATE Pavilion** and now says so — on the title screen
*and* on an empty shelf, which is where a person actually looks. `npm run dev`
cannot reach Postgres, MinIO or your book files. **Use `npm run electron:dev`.**

**New guards:** no hardcoded book slug anywhere in `ui/` (no book is guaranteed
to exist); every `upsertCard` call site must pass as many parameters as the SQL
declares (a 10-vs-11 mismatch silently killed every write for ten minutes and
`npm test` saw nothing).

### 🗝 TWO GROUNDS — and the keystroke doors that had to come first

*"i dont wana loose features but we can move things like the pond and the
inhertince hall to a second overlays screen. mabie even the workshop and the
cafe as well."*

**Stage 0 first, and the measurement is why.** Before anything moved, the pause
menu reached about twenty-five panels and named **not one room**. Eleven
exported room openers appeared in it nowhere, and a twelfth — `openArchive` —
was on no `window` at all, so *nothing in the entire application* could open the
Archive Desk with a click; only `main.js`'s E key could. Moving rooms further
away while walking was the only way in would have deepened the Lab's bug rather
than leaving it fixed.

So `data/places.js` came first: one table, the menu derived from it, and a guard
that runs **both** directions — a station in the world with no menu entry fails,
and a menu entry naming a station that is not there fails too. (The `mission`
dead drop hid for weeks in exactly the direction that was never checked.)

**Then the world moved, and it cost nothing**, because walking had become
scenery instead of access.

| **The Pavilion** — study alone | **The Works** — make, meet, give, rest |
|---|---|
| the Keep, the Library (+2 floors), the Study | the Workshop (3 floors), the Café, the Inheritance Hall, the pond |

Not gated. One road, signposted at both ends.

**Four real bugs found on the way, none of them by reasoning:**

1. **`openArchive` on no window** — found by building the table.
2. **A dialog opened *behind* the pause menu.** The Hearth, the Counter, the
   Notice Board and the Residents' Board are scripted beats, not panels. Opened
   from the menu, the dialog box came up underneath a full-screen overlay with
   `state.ui` still `'menu'`, so `onAction()` returned early and **E could not
   even advance the thing you could not see**. Four menu buttons that silently
   did nothing. Fixed in `openDialog()` itself — every caller is world-level.
3. **`render.js` placed doorways from three absolute tile columns of the old
   Grounds, keyed off building *type*.** Correct only while nothing ever moved.
   Every building carries its own `door` now.
4. **Walking into the Study dropped you onto the Study's own exit warp**, so one
   sideways step ejected you back outside. Pre-existing, found by the new
   warp-onto-a-warp check, never reported by anyone — the house failure mode.

### ☀ THE LOGS ANSWER — a finished day is a day you worked

*"how are all the logs connected to this?"* Six log-ish surfaces share no
vocabulary; `data/records.js` is the one that converges, because it indexes real
work instead of narrating it. It had excluded days and said why: *"a planner day
exists as soon as it is opened, which is not the same as a day you worked."*

**A finished daily task is exactly that missing thing** — `closed && allDone`,
dated by the day it was *taken*, with the board to point back at. It also
finally earns `recordCounts`.

**A day taken and not finished is still NOT listed**, on purpose. The board
records both halves because a person needs to see both; an index of your own
work that fills with the days you fell short is the guilt inventory
`the-day.js` exists to prevent. Held by a test, on both database homes.

**Still open from the plan:** the framing art (Stage 2 — world stays pixel), the
`overlays.js` split along the new seam (Stage 3), and then **Sebastian**:
drafting the outline, and graduation to the inner Pavilion using the
`requirementMet()` / `requirementText()` shape already in `entities.js`.

---

**The session before it, end of 2026-08-09 (NINTH).**
Full account in [`archive/dev-log-2026-08-09.txt`](archive/dev-log-2026-08-09.txt).

### 📋 TODAY'S TASKS — and the first room built OUTSIDE the monolith

*"we can call it daily tasks instead of missions, you cant do missions unless
you graduate lol."* A mission is something you earn; a task is what you sit down
and do this afternoon. **`mission` stays unclaimed** in `carrying.js` for the
graduated thing.

**`mission` was already there as a DEAD DROP** — `book` and `lesson` both
declared `places:[…'mission']` and no surface existed, since the carry model was
built. `npm test` could not see it: the guard only ran one way (a surface
accepting a kind nothing offers), never the other. Renamed `dailyTask`, and
**the missing half of that guard now exists** in the daily-tasks tests.

- **`data/daily-tasks.js`** — pure: the shape, `isToday()` (computed on read,
  **never a timer**), `closeOut()` (pure and **idempotent**), `STEP_WHERE`,
  `streakAfter()`.
- **`ui/daily-tasks.js`** — the board. `overlays.js` gains only the window
  exports, one `initDailyTasks()` call and a pause-menu line.

**The date is a FRAMING DEVICE, not a stick** — the steward's correction. No
countdown, nothing red, and **a test fails on the words "overdue" or "late"** in
the notice *or* the recorded log line, so a future edit cannot reintroduce the
framing by being reassuring about it. **Both halves are recorded** — what you
did *and* what you did not.

**The AI does no legwork**: *"the tesla chain is for the user to go and do not
the ai."* Every step points at a door that **already existed** — and `world`
(*"go to the town library"*, *"wire the 555 timer"*) has **no door on purpose**;
a test fails if it grows one. The arc the steward named — *get the book → read
it → have the Tutor draft a plan → walk the course* — is four existing doors in
a row and needed **no new code** (`writeLessonOnThisBook` + `draftLessonWithAI`).

**The complexity question, measured** *(figures as of 2026-08-04 — `overlays.js`
has grown since)***:** `overlays.js` 12,317 lines vs
`roles.js` 284 and one `pathwayBlock()` for all seven residents. The agent
pathways are the **simplest** part of the codebase. `overlays.js` is the real
problem, and this feature is the first cut done right.

**What the guards caught, both within the hour:** the new door-guard rejected
`openStudyTable()` (it doesn't exist — the Study Table is a tool inside the
Writing Desk), and the live suite found that a `read` step opened **nothing**
because `needsRef` was declared and honoured by nothing. **Reading the
screenshots** caught three more, two of them quiet lies: work finished *today*
filed under "Before today", and "Nothing set for today yet" shown beside two
finished sittings.

**Verified:** `npm test` · **9 sabotage cases, all caught** · `build:beta` clean
· `test/live/daily-tasks.mjs` 24/24 · full browser sweep (11 suites) · all four
Electron suites, `packaged-boot` SHIPPABLE.

**Next, in order:** ① **Sebastian drafts the outline** — turning *"i wanna read
tesla"* into a three-step chain; he currently directs to the board and reads the
day into his prompt, nothing more. ② Steps that tick themselves. ③ Chains.
④ **No real model has seen `butlerDayRead()` with the task line in it.**

---

**Where things stood, end of 2026-08-08 (EIGHTH session).**
Full account in [`archive/dev-log-2026-08-08.txt`](archive/dev-log-2026-08-08.txt).
The seventh session's record follows below and is still accurate; this is the
frontier.

### THE BACKPACK IS THE CONTEXT WINDOW NOW — and it wasn't anything before

The steward's correction, which turned the session over:

> *"i wanted the back pack to serve the perpouse to make sure the condex of the
> modles dosent get blown out and so the user can fouce there attention on a few
> things and not 100."*

**`groundingFor()` had NO CALLER ANYWHERE.** `carrying.js` said *"what you carry
is what a resident can see"*, `visibility.js` said the backpack *"is the one
store a resident is allowed to read"*, and no resident read it. Every unit test
passed the whole time — **a pure function with no caller is perfectly testable
and completely inert.** That is a new shape of this project's oldest bug, and
`npm test` now asserts a resident actually calls it.

| built | where |
|---|---|
| **Three states on a note** — 🔒 sealed · 🔎 askable · 🏛 published | `data/note-reach.js` (new, pure) |
| **The backpack as bounded grounding** for Quill and the Monk | `carriedBlock()` in `ui/residents.js` |
| **A token budget, not an item count** | `fitToBudget()` in `data/carrying.js` |
| **The meter** — 👁 per item always; the bar behind a setting | `renderInventory()`, `data.settings.showContextMeter` |
| **Ask a resident to search your notes** — a second send button | `sendCurrentChatMessageWithNotes()` |
| **Preview a prompt without sending one** | `previewPrompt()`, in the prompt inspector |

**`SEALED` is the one state an ask cannot cross** — not by searching, not by
carrying it in. **Absent means askable**, which is exactly the rule that already
held, so hundreds of existing notes changed reach by nothing and there is no
migration. A present-but-unrecognised value **fails closed**.

**This is NOT `visibility.js` and must not merge with it.** Two axes:
`visibility.js` answers *can this leave the machine*; `note-reach.js` answers
*may a local model here see it*. A note can be private in every sense and still
be one you are glad to hand your own resident. `npm test` asserts the two
vocabularies never collide.

**The bound is TOKENS.** Twenty is a bound on *attention* and right for a
person; it is not a bound on a context window, where twenty notes is nothing and
twenty books is a catastrophe. Measured with the **same `estimateTokens()` the
request uses** — a meter with its own idea of the answer is the `store.js` scar
in miniature. This is the **fourth** costume of the uncapped-prompt bug.

### RUNNING IT UNDER ELECTRON FOUND THREE REAL BUGS, AND THE FIRST RUN WAS BROKEN

The notes search had only ever run on its *locked* path — a browser has no
database, so it could never reach the code. Extending
`test/live/note-search.cjs` (now **25 checks, green**) found all three in the
first run, and **every one was invisible to `npm test`, `node --check`, the
build and the browser suite**:

1. **A shadowed parameter in the temporal dead zone.** `sendChatMessage(q, opts)`
   — the body already declared `const opts = chatOptsFor(...)` *inside the try
   block*, which shadows the parameter for the whole block. Reading it threw
   `Cannot access 'opts' before initialization` **every time**, so the feature
   did nothing at all and the catch told the visitor *"the local AI didn't
   answer."* Renamed to `sendOpts`.
2. **The question is not the query.** `searchNotes` uses `websearch_to_tsquery`,
   which **ANDs** every word. Measured: `"walking"` → 2 rows, `"what did I write
   about walking?"` → **0 rows**. It would have returned nothing for nearly
   every real question while looking like it worked. Now uses the shared
   `lookupTerms()` joined with OR, exactly as `libraryLookupBlock` always has.
3. **The console capture was dead in THREE suites** — `note-search`, `records`
   and `chapters-panel`. `a[1]` is the console *level* (a **number**), not the
   message, so `typeof m === 'string'` threw every line away and *"no console
   errors"* passed no matter what the page logged. That is how bug 1 stayed
   hidden for three runs.

   **A correction I had to make to myself:** I first wrote that `packaged-boot`
   — the release gate — was dead too. Breaking its capture on purpose *still
   passed*, so I measured the signature instead of believing my theory:
   Electron 43 emits **both** forms at once (`a[0]` event object, `a[1]` level
   as a number, `a[2]` the message). `packaged-boot` reads `a[2]` and **was
   correct all along**. A false claim about the release gate in this file would
   have been worse than the original bug.

   All four now tolerate either shape, and **two prove their own capture** —
   `note-search` asserts it saw the expected `[chat] … turn failed` lines, and
   `packaged-boot` emits a console error of its own and fails unless it catches
   it. Both verified by breaking the reader on purpose.

**And a fourth, in my own new test:** the "the ask does not linger" check
reopened the chat before the second message, which builds a fresh dialog with
`askNotes:false` — so deleting the `finally` still passed. It now stays in one
conversation. Sixth inert guard of the session, third I wrote myself.

**`sendChatMessage`'s catch now logs the real exception.** It wraps the whole
turn, prompt assembly included, so every bug in *our* code has always been
reported to the visitor as the model failing — sending them to check Ollama for
something we did.

**Verified green:** `npm test` · 17 sabotage cases (13 pure + 4 Electron) ·
`build:beta` clean · **all 20 browser live suites** · `records.cjs`,
`chapters-panel.cjs`, `note-search.cjs` (embedded) · `docker-home.cjs` 31/31
(container up). **Nothing is committed**; it is all in the working tree.

### ONE PATHWAY, N BEHAVIOURS — was **2 of 7**, now all seven

*"i wana have the pathways for each agent really be the same and that how they
deal with that knolege be part of there specality."*

`lookup.js` has claimed since 2026-08-07 that every resident reaches the Library
the same way. **Measured, only Quill and the Monk could** — the other five,
including the Tutor and the **Investigator** (*"insists on evidence someone else
could check"*), could not look up a book, see the backpack, or search a note.
Each `systemPrompt()` composed its grounding **by hand**, so a resident had a
pathway only if someone remembered the line. Seven hand-maintained lists, rule
4's exact shape.

**`pathwayBlock()` in `ui/residents.js` now assembles the whole road once,
identically, for everyone.** A role cannot opt in and cannot forget. What a role
declares instead is a **`lens`** in `roles.js` — one line on what it *does* with
what it found, appended *after* the grounding. That is the entire specialty.

**Measured after** (real database, real backpack), because five prompts growing
a pathway is how the uncapped-prompt bug arrived the previous four times:
quill 1527 · **monk 2949** · steward 1331 · investigator 1950 · tutor 1480 ·
computer 1255 · sebastian 1702 tokens. Heaviest is **36% of the 8k floor**, and
every part is bounded by construction — none grows with the Library's size or
with how much the visitor has done.

**One argued exception:** Sebastian's *reading-companion* branch gets no
pathway. It is a **mode**, not a role — it says *"answer grounded strictly in
the text given below"*, and adding a catalogue would contradict its own
instruction. Narrowing IS the lens there.

**The same bug one layer up: three residents had no door.** `talkTo()` is called
*"ONE opener for every chat resident"* and worked for four — the Tutor,
Investigator and Computer had no `chat` entry, so it returned silently and a
colleague's handoff could *name* them without opening them. Fixed. `open` still
points at the **room** (the Academy has the lesson tree) because a handoff
should land where the work is; `chat` is the plain door. Two different things.

**Adding an assistant is now one entry in `roles.js`** — label, duty, sendMe,
where, open, chat, lens. The pathway comes free. Still hand-written: the
identity paragraph in `CHAT_AGENTS` and the icon in `AGENT_AVATAR` — the next
cut, and a small one.

### ⚠ What is still NOT proven

- **A real model HAS now seen it** — `deepseek-r1:8b`, local, `think:true`,
  against the real prompts. It found **three more bugs**, all fixed; see below.
  Still unproven: the *other* residents' prompts (Sebastian's day-read, the
  Steward's pre-notes) have not been read by a model since the pathway landed.
- **The Study Table's chat and the Writing Desk's picker** do not get the
  carried block — they take their own route to a resident.
- **`packaged-boot.cjs` must be re-run** before any cut. It is green and now
  self-tests its error capture.

### A REAL MODEL SAW IT, AND FOUND THREE MORE

The steward's idea, and it was the best debugging move of the session:
*"if you use a thinking modle you can see how the ai handles the info."*

1. **The zero-hit branch suppressed answers the model knew.** *"what's a classic
   fiction book from hg wells?"* — its reasoning said *"not even his most famous
   works like War of the Worlds or The Time Machine would be present"*, **and it
   said none of it**, because the wording read as *"say nothing you cannot find
   on a shelf"*. It also echoed that block's own sentence back verbatim, and
   invented a handoff. *"We don't have it"* and *"I don't know what it is"* are
   different claims and only the first was true. The block now separates them —
   the never-imply-we-hold-it rule is untouched — and is phrased as a situation
   rather than a line of dialogue, because dialogue gets delivered.
2. **Residents invented their colleagues' powers, in 2 runs of 3.** *"the
   Computer, which has access to more extensive research"* (it lists local
   files); *"the Steward, about any texts they carry"* (he carries none). One
   sentence in `rosterBlock()`, which all seven read. The prompt-budget guard
   immediately caught it pushing the Monk 15 tokens over — **2150 → 2175, raised
   deliberately with the measurement written beside it**, rather than trimming
   the Eightfold Path to pay for an unrelated fix.
3. **The answer didn't show its work.** The Tutor's *reasoning* named both
   carried notes precisely; its *answer* named neither, so a visitor could not
   tell it had read anything. Rule 7 answers this, not more prompt: the app
   knows what it put in the prompt, so **the app says it** — *"Answered with
   what you are carrying — The Dhammapada · 1 note of yours · 1 sealed, not
   read."* Deterministic, right every time, zero tokens, and it makes *"what you
   carry is what a resident can see"* a line you can read rather than a promise.

After the fixes, same model and question: the Investigator **quotes the carried
note back**, says what would refute the claim (its lens, working), and hands off
to nobody it cannot vouch for.

**Measured:** 1,034–1,524 tokens in, 14–24 s per reply *including* visible
reasoning. Static worst case is the Monk at ~2,949 of an 8,192 floor (36%).

### The list, in order

1. **Point a real model at it** — see above.
2. **Pull the PASSAGE, not just the title.** `searchPages` + `passagesBlock` in
   `data/retrieval.js` (complete, one caller) over books **in the backpack** —
   the boundary now exists, which is what makes it safe. The steward's case:
   *"talking to the grand master about the 8fold path, he should be able to pull
   that info and my notes with permission."*
3. **Re-run `packaged-boot.cjs`**, then the other Electron suites, before any cut.
4. **A knowledge gap becomes a book request.** `libraryLookupBlock()`'s zero-hit
   branch (`ui/residents.js`) already detects the gap in code and discards it
   into a sentence the model may or may not say. One button, one prefilled
   Request Board entry.
5. Then the original list: **Records Hall search · public commentary · password
   boxes · THE TUTORIAL** (the hard one, and the front door) **· profile + inbox
   · Science Room · the website.**

Small and recorded so it is not re-found: the 🗒 note glyph renders as **tofu**
in the pixel font — and so does the one in `index.html`'s own Notes header, so
it is a pre-existing font-coverage gap, not something this session added.

### Two process notes that cost real work

- **Never `git checkout <file>` on a file with uncommitted work.** Used twice to
  undo a deliberate sabotage; it took the sabotage *and* the session's real
  edits with it (a `DATA_MAP` entry, then ~200 lines of new tests). The sabotage
  harness already restores in a `finally` — use that.
- **Two of this session's own guards were born dead**, both caught by breaking
  them. One was satisfied by a *comment*; the other's parser choked on a regex
  literal and silently ate 250 lines of the file it was checking. A guard that
  parses must be held to the same standard as the thing it guards.

---

**Where things stood, end of 2026-08-07 (SEVENTH session).**
Full account in [`archive/dev-log-2026-08-07.txt`](archive/dev-log-2026-08-07.txt),
sections 14–22. Everything below the horizontal rule further down is the
*previous* sessions' record: still accurate about the backend, kept because the
scars in it are load-bearing, but it is **history, not the frontier**.

### THE FOUNDATION PASS IS DONE. The carry model is the spine.

Two days went on one question — *"are there any other things that we fix on one
end and is still broken on the other?"* — and it had six answers. All six are
closed:

| was | now |
|---|---|
| **two carry systems** (`data.inventory`, `state.readerPocket`) | one: `data.carrying`, `{kind, ref}`, references never copies |
| `state` declared 10, assigned 55 | a guard; `UNDECLARED_STATE` is a written debt that **may only shrink** (46) |
| `chatOptsFor` private, unreachable from `lesson-tree.js` | in `ai/provider.js`, exported, guarded |
| `chapters` + `chapter_scans` **written by nothing** | `syncChapters()` keeps what the reader finds; migration 004 |
| Your Data said *where*, never *when* | three cards, and the claims are held against the code |
| a list of unwired queries reading as debt | written down: four should **stay** unwired (rule 7) |

**`data/carrying.js` is the spine now.** One table (`KINDS`) says what can be
carried and where each kind goes down; `PLACES` is derived from it. The cap is
20 and counts only what is **in hand** — a *"pick up later"* shelf sits outside
both the cap and the grounding, because *"what you carry is what a resident can
see"* has to stay literally true. Adding a kind there makes it work at every
surface that already accepts it, with nothing else edited.

**`data/lookup.js` is the one road to knowledge.** Every resident reaches the
Library the same way; the role decides only what it *does* with the result.
Books and published things may be searched; notes only when **you ask** —
`asked` is a deliberate press and is never inferred from wording.

### Built on it so far

- **The Study Table's tray** — works from the backpack, two books at once, one
  press to swap, carried notes beside the part they belong to.
- **The Computer**: `notes`, `notes <word>`, `carry <n>`, `carry`. Typing is
  now the fastest way to fill the backpack, and the loop closes — a note found
  in the terminal is on the table in the other room.
- **Books not divided yet** — the first panel on the chapter tables. Six at a
  time, longest first, **no bulk-scan button**: *"one step at a time is fine
  lets a user feel like he is contributing."*

### The list, in order

1. A resident's **knowledge gap becomes a book request**. The branch exists at
   `ui/residents.js:107` and fires only for a *title* search.
2. **Ask a resident to search your notes.** `groundingPlan(q, carrying,
   {searchMyNotes:true})` exists and **has no caller** — no UI yet.
3. **Records Hall search** (`recordCounts` would earn its place here).
4. **Public commentary** — publish a note against a book.
5. **Password boxes** in the Inheritance Hall — the *real* lock,
   `crypto.subtle`, PBKDF2 + AES-GCM, no dependency.
6. **The tutorial**, five stages. A design problem more than a coding one.
7. **Profile + the steward's inbox** (dev mode is an inbox, not a permission
   level).
8. **The Science Room.** The website **last**.

Small things worth closing on the way: `book_health` is a table nothing writes
(so `v_unshelved`'s health filter is inert); `tags` is a column and a GIN index
receiving `null`; note-versions in the database would be migration **005**.

### The working format, which earned itself

Pure module first (`npm test` holds it in a second) → **a derived guard, broken
on purpose** → a live suite that presses the real buttons → **read the .png** →
follow the loop to the other room → name things so they cannot be read wrong.

Two days produced **seven** cases where the check was the broken thing and
**four** real bugs found in a screenshot after the assertions passed. One test
block ran *after* the suite printed its verdict and reported "all clean" twice
while testing nothing. A guard nobody has broken is a comment.

### No beta cut

beta.5 is **built, verified and unpublished** at the steward's word. The honest
moment for beta.6 is after the tutorial — the first release where a stranger
could find their way around. beta.4's `.exe` is still in `release/` and is
**stale**.

---

*Below is the record from sessions five and six. The backend detail is still
correct; treat the "next" framing in it as superseded by the list above.*

**Where things stood, end of 2026-08-04 (FIFTH session).**
Full account in [`archive/dev-log-2026-08-04.txt`](archive/dev-log-2026-08-04.txt).

### THE PAVILION HAS A BACKEND ON EVERY MACHINE, not just this one

`electron/db.cjs` picks **Docker Postgres when the container answers and its
own embedded PGlite otherwise** — the choice sits *below* the named-query seam,
so both run the same SQL against the same schema from the same files in
`tools/`. The renderer cannot tell which, and must not try; only `dbStatus()`
names it, so a person can be told.

**`applySchema()` applies `schema.sql` + every migration to both homes on every
open** (2026-08-04, later the same day). Until then only the embedded one got
them: the container was seeded once by the `docker-entrypoint-initdb.d` mount in
`docker-compose.yml`, which fires only on an empty volume and lists `schema.sql`
alone. 002 and 003 reached this machine's container by hand; **004 would not
have reached it at all**, and the symptom would have been a named query failing
against a table that exists in one home and not the other, with every status
line green. Verified against the real container: a new migration created its
table there, invalid SQL surfaced as `status().schemaError` while queries kept
answering, and re-applying the real schema was a no-op (14 tables and views
before and after, `notes_fts` intact) — idempotency measured against real
Postgres, not just PGlite.

**Adding a migration is adding a file to `tools/migrations/`, and nothing
else.** The compose mount deliberately stays `schema.sql`-only: the entrypoint
does not recurse into a directory, so listing migrations there would be a
hand-maintained list that has to match one — rule 4's exact shape, and every
such list in this project has drifted.

**"Needs Docker" is retired as a reason to lock a feature.** Docker now buys
capacity for the book *text* (MinIO) and sharing one database between machines.
**Search comes with the app.** That is the reverse of what `CLAUDE.md` said that
morning, and the honest version.

**Search every note you have ever written now works** — the thing localStorage
cannot do, and the reason there is a database at all. The index *widens* the
existing substring filter rather than replacing it (one filter, two inputs, so
they can never disagree) and says so when it adds something.

> **Before the next cut, know this.** The **empty** database is now the common
> case, and two bugs hid there for as long as the only database was the
> steward's 294-book one: `hydrateFromDb()` returned early on zero rows so
> nothing was ever written *up*, and `notes.slug` is a foreign key into `books`
> inside a single transaction — one note on a seed book would have made *every*
> note unsearchable. Test against a **fresh** database, not this one.

**Measured**: 25 MB in the installer, 40 MB for an empty cluster, **1.5 s cold
open that happens behind the title screen** (painted in ~150 ms), 90 ms warm,
`searchNotes` in 1–3 ms at 5,000 notes.

### THE NAMED QUERIES WITH NO CONSUMER, AND WHICH ARE DELIBERATE

A list of unwired queries reads as debt. Most of it is not, and the ones that
are have a reason. Settled 2026-08-07 — **check this before "fixing" any of
them**, because wiring the wrong ones puts a second path over data the save
already owns, which is the `store.js` scar.

| query | verdict |
|---|---|
| `catalogue`, `searchBooks`, `searchNotes`, `records`, `upsertCard`, `upsertNote`, `upsertRecord`, `pruneNotes`, `ping` | **wired, and right** |
| `notesForBook`, `notesByPlace`, `noteCounts` | **LEAVE UNWIRED.** `gatherNotes()` already unions all six note sources exactly, instantly, and on the web build too. Rule 7: counting and grouping are what code does exactly |
| `unshelved`, `unshelvedCount`, `shelfCounts` | **LEAVE UNWIRED.** `books` mirrors `personalLibrary`, which is already in the save |
| `recordCounts` | **leave unwired unless the Records Hall grows a summary.** It answers a question nothing asks yet |
| `chaptersFor`, `needsChapters`, `chapterCoverage` | **BUILDABLE NOW, and worth it.** They were blocked until 2026-08-07 because nothing wrote `chapters` or `chapter_scans`; `syncChapters()` fixed that. These answer the one question JS genuinely cannot: *which of my books have no divisions* — **without opening all of them** |

**The test for "should this be wired":** can plain JS over the save answer it
exactly and instantly? If yes, leave it — a query is then a second path, not a
feature. If no — stemming, or knowing something about a book you have not
opened — it earns its place.

### `book_health` IS STILL A TABLE NOTHING WRITES

`v_unshelved` joins it (`COALESCE(h.status,'ok') <> 'dead'`), so that filter is
inert: the status is always absent, so the clause is always true. Not harmful
today, and honest to say rather than leave looking load-bearing.

It becomes real when something can mark a book dead — the obvious writer is the
reader failing to load a book's text, which is a real event with no record. Not
built. **Do not build a panel on `v_unshelved`'s health filter believing it
filters anything.**

Then `tools/migrations/004-note-versions.sql`, still unwritten.

> **A JS ARRAY IS NOT A VALID PARAMETER — normalizeParams() handles it now.**
> `[]`, `['a']` and `['a','b']` all FAILED on PGlite; `null`, `'{}'` and
> `'{a,b}'` all wrote. `tags` is the only array column the app writes and
> `syncNotes` passes null for it, so the Records Hall's was the first real
> array parameter in this project's history — and it silently wrote nothing.
> Fixed below the seam so both homes get a Postgres array literal.
>
> **Both halves measured now (2026-08-07, container up).** Every one of those
> six forms WROTE on the Docker home. So the two homes genuinely disagreed
> about the same named write — which is the one thing this design exists to
> prevent, and the reason the normalising has to live below the seam rather
> than at either adapter.
>
> It took a hand-written probe because `writeMany` returns `null` for both
> "failed" and "no bridge", and `status()` pings before reporting, so the
> successful ping wiped the evidence. `status().writeError` now SURVIVES a
> later good read, and `data/backend-trouble.js` owns the wording (DOM-free,
> unit-tested, write outranks schema). **A failed read is self-reporting; a
> failed write is not.**

`test/live/note-search.cjs` is new and **must be run under Electron** —
`env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/note-search.cjs`.
The browser suites cannot reach a database and can only stub one.

**The two homes have two suites, and neither can stand in for the other.**
`records.cjs` and `note-search.cjs` redirect `userData` to a temp directory and
point `POSTGRES_PORT` at nothing, so they are always the **fresh embedded**
case. `test/live/docker-home.cjs` is always the **container** case — plain
`node test/live/docker-home.cjs`, no Electron, because `db.cjs` only requires
`electron` on the embedded path. It **skips loudly and exits 0** when the
container is not answering, and proves it does: run it with
`POSTGRES_PORT=5999` and it says so rather than quietly testing the other home.
A suite that goes green because the thing it tests is switched off is the house
failure mode wearing a tick.

**Built and green today:** the **Study Table** — a toggle on the Writing Desk
where you work a book one story at a time, naming the units yourself
(`data/marks.js`, hand marks outrank detection; 18 of 39 books find no chapters
at all, so it falls back to page-sized units and opens for every book).
Notes keep their history (`data/note-versions.js` — restore **appends**, never
truncates). A resident sits with you who has read the story actually in front
of you. A lesson drafts out of the work you did.

**`CLAUDE.md` was streamlined at the steward's request**; the long version with
the reasoning is at `archive/CLAUDE-full-2026-08-04.md`. The storage ceiling in
it is **measured, not guessed** — web ~10–20 books, desktop hundreds, and
**Docker buys capacity for the book TEXT, not search** (search ships with the
app). This paragraph said the reverse until 2026-08-04 and contradicted the
table three sections above it; if you find a third phrasing anywhere, the
measured table in `CLAUDE.md` is the one to trust.

**`overlays.js` is coming apart: 12,726 → 11,138.** Two cuts done
(`ui/residents.js`, `ui/lesson-tree.js`), **seven to go** — the order and the
method are in [`plans/OVERLAYS-SPLIT-PLAN.md`](plans/OVERLAYS-SPLIT-PLAN.md).
Move the block verbatim, satisfy its outward calls with `initX()` shims, and
leave the window-export block in `overlays.js`, which owns it.

> **Before the next cut, know this.** The same bug crashed the Learning Tree
> cut twice — `stopSpeaking`, then `NOTE_SELECT_STYLE` — and **neither
> `node --check`, `npm test` nor `npm run build:beta` said a word about
> either.** A free identifier is legal JavaScript until the line runs. Both
> took driving real Chrome at the app to find. `npm test` now checks that
> every `ui/` module resolves every name it *executes*; **five versions of
> that check were wrong first**, each found by breaking it on purpose. Do not
> trust a green suite on a fresh cut until you have opened the app.

> **0.1.0-beta.5 IS BUILT AND VERIFIED, NOT PUBLISHED** (2026-08-04).
> `release/Sand Pavilion Setup 0.1.0-beta.5.exe`, 101 MB, hash
> `E955FBE6A75B1219F83ED45287375C91E7602EF575D27BD71138E86D0AA72A28`.
> beta.4 was built earlier the same day and **never published or tagged**; its
> `.exe` is still in `release/` and is now STALE — do not publish that one.
> `packaged-boot` says SHIPPABLE and `verify:release` says the docs match the
> artifact. **Publishing is a human action** — the command is in
> `plans/SHIPPING-THE-BETA.md`, and beta.3 is still the published release.
>
> The build number is now **derived** from `package.json` by `vite.config.js`
> (`__APP_VERSION__`); it had already drifted a version behind as a literal.
> `verify:release` checks the derived form and was broken on purpose.

**The immediate next three, in the steward's stated order:**

1. **The Learning Tree as a real visual tree** — his words, *"like a visual
   tree or like a game tallent menu."* `plans/LIVING-TREE-AND-DISCUSSION-PLAN.md`
   §2: the prerequisites exist in the data and are invisible in the drawing.
   Step one is an SVG edge layer behind the existing cards.
2. **The Course Board as a traditional website** — headed sections, a real
   index, less game-panel chrome.
3. **The Monk's role** — *"help people find there intention with the 8fold
   path… to be able to teach is a supreme gift where a pratitior learns the
   most."*

Also open, and named so it is not lost: `tools/migrations/004-note-versions.sql`
(planned in stage 1c, never written), stage 1d's lecture script / slides /
personal book of notes, and the beta build — `verify:release` is **correctly**
failing on an `.exe` older than the source.

**Two Caravan scripts are dead and now say so out loud** (2026-08-04).
`tools/caravan/promote-draft.py` and `push-fulltext.py` both wrote to the
Supabase project deleted 2026-08-02, and both still *asked for a
`SUPABASE_SERVICE_ROLE_KEY`* — sending anyone who ran them off to hunt for a
credential that cannot exist. They now stop first, with the real reason and the
path that works. Two details worth keeping:

- **`promote-draft.py` kept its useful half.** It still parses a draft, still
  refuses one saying `TODO` — the provenance-first rule made executable, and
  the thing `PROTOCOLS.md` Pathway B step 4 tells you to run — then prints
  every field and stops without writing or moving anything. Killing the
  validator along with the dead push would have removed the only automated
  check on the rule this project cares most about. (I did exactly that first,
  then put it back.)
- **`push-fulltext.py` stops before the MinIO upload**, so it cannot leave an
  orphaned object in the bucket with no catalogue row pointing at it. Its guard
  originally sat *after* a MinIO credential check, which meant a missing
  password answered first and blamed the wrong thing.

Rewriting both against local Postgres + MinIO is real, well-scoped work: the
writes they need already exist as named queries in `electron/db.cjs`. Until
then the in-game path (drag a `.txt`/`.epub` onto the window, or the Caravan
Desk) is the only one, and per the steward it is the one that matters:
*"the books i downloaded will be the main pathway people use."*

---

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

**The Learning Tree serves a teacher now** (2026-08-03,
`plans/THE-TEACHERS-TREE-PLAN.md` gaps 1–3). A lesson can name a **set text**
(`node.book`), and any step that mentions a chapter or page becomes a door —
**detected** from natural wording in `data/lesson-doc.js`, never a syntax, and
absent rather than guessed. `openLessonReading()` resolves a chapter through
the same marks the reader and notes use: **"chapter N" is the Nth mark**, an
index and not a stored field, which is the bug that made every door land on
page 1. A lesson leaves as Markdown or one self-contained HTML page
(`exportLesson()`), and a published lesson finally lands in a colleague's
**tree** rather than as prose in their notes (`takePacket()`'s `lesson`
branch). `test/live/teacher.mjs` drives all of it with **no AI connected**.

**A HOSTED MODEL IS NOT A LOCAL ONE, and `isCloudModel()` in
`ai/provider.js` is the only place that decides.** Ollama lists its hosted
models in `/api/tags` beside the real ones; on 2026-08-03 `bestLocalModel()`
returned `gpt-oss:20b-cloud`, meaning the Monk's standing "largest local
model" rule would have routed his conversations to a server while the title
screen said *running on this device alone*. Two signals — the name (`:cloud`
or `-cloud`) and the size (a hosted entry is a ~300-byte manifest) — because
the previous name-only rule went stale. Never add a second copy of that test.

**But hosted models are OFFERED, never taken** — the correction to that same
fix, which had left a laptop with no local model unable to use the Pavilion at
all. They appear in the connection's model picker in their own ☁ group, are
never auto-picked and never reach the Monk, and a deliberate choice is honoured
and labelled. `p.usingCloud` drops "(local)" from the connection name, because
the status line read *"Connected to Ollama (local) · gpt-oss:20b-cloud"* — the
exact claim the guard exists to prevent, on the title screen.

**And a laptop is the normal case for the beta's testers.** Ollama's hosted
models reach the app through the same local endpoint with **no API key**:
`ollama signin`, then `ollama pull gpt-oss:20b-cloud`. Measured at 0.64s where
a local 9B takes many seconds.

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
6. **`overlays.js` is ~10k lines.** *(**12,966** as of 2026-08-10 — this entry
   was written when ~10k was true and did not move with the file.)* No bug has
   ever come from that, the pure logic is already out in `data/*.js`, and there
   is a map at the top with a test keeping it honest. When it is split: by room,
   one at a time, while already working in that room. Never as a big-bang
   refactor. **That instinct was right and is now the actual plan** — the order
   in `plans/OVERLAYS-SPLIT-PLAN.md` is derived from `data/places.js`'s `scene`
   field, which is literally "by room", and five regions are already out.

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
1. **[done 2026-07-28 — ⚠ SUPERSEDED 2026-08-10]** The welcome-packet decision
   was resolved by honesty rather than bulk: a seed of **27 texts** (6 complete
   source texts, 11 written for the Pavilion including three guides, 10 classics
   carried as summaries that said so in the reader and invited the real book).

   **All 27 were deleted on 2026-08-10 and `SEED_LIBRARY` is now `[]`.** Kept
   here because the *reasoning* still stands and got sharper — honesty over
   bulk, taken all the way. The welcome packet is now a **document**
   (`docs/BOOKS-TO-SOURCE.md`), not a payload. Do not read the count above as
   current; nothing ships on the shelf.
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
