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
- **`ui/overlays.js`** — **the big one** (~9.4k lines). Every panel, the chat
  stack, `CHAT_AGENTS`.
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
held to). `plans/BETA-PREFLIGHT.md` is the older checklist; its three headline
risks were closed on 2026-07-28 and it says so at the bottom.

**Where things stand, end of 2026-07-28:** beta.2 is cut, verified, **installed
and used** — the last genuinely unverified thing is closed. Everything is pushed;
the repo is **still private by choice**. The next action is making it public and
cutting the Release.

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
time instead of presenting a form. `plans/WHY-OPEN-IT-TODAY-PLAN.md` holds the
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
