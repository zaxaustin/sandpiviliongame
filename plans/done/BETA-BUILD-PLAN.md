> ## CLOSED 2026-08-02 — moved to `plans/done/`
>
> The build happened. `Sand Pavilion Setup 0.1.0-beta.2.exe` was cut, verified
> as an *artifact* rather than as source (`test/live/packaged-boot.cjs`),
> installed on a real machine, and used — 2026-07-28.
>
> The three gates this plan named are all closed: the welcome-packet decision
> (27 texts, honest about which are summaries), the installer itself, and the
> local-only guarantee (`scripts/verify-beta-build.mjs` fails the build if a
> key or a cloud host survives into the bundle).
>
> **Handing it to people is now `SHIPPING-THE-BETA.md`'s job**, and what a
> tester reads is `BETA-RELEASE-NOTES.md`. Findings from real use go to
> `BETA-TESTING-FEEDBACK.md`.

---

# The Beta Build — what ships, how it's packaged, and what to iron out first

> **STATUS (2026-07-27) — the code is beta-ready at `0.1.0-beta.2`; three gates
> and one new feature stand between here and handing it to people.**
>
> *History:* the first installer was cut 2026-07-11 on the `beta` branch
> (`Sand Pavilion Setup 0.1.0-beta.1.exe`, Phases 0–4 walked end to end). `main`
> has moved a long way past it since, and the version is already bumped to
> **0.1.0-beta.2** in prep for a fresh cut.
>
> **What's landed since that first installer** (all of it in the build a tester
> would get today): the whole **visual revamp** (design tokens, grouped menu,
> hover/focus states, serif Reader + redesigned title, world vignette, seasonal
> breeze, softened characters, café hearth outdoors, panel-open motion); a
> **second Library floor** with alphabetical shelf bays; **unified Notes**
> (create/edit anywhere, link a note to a book down to page/chapter); **bulk book
> import**; **personal books stored in local Docker MinIO** with an app-data file
> fallback; the **Learning Tree** (a real prerequisite curriculum) and the
> **Academy Tutor** (teach / quiz / review / plan-a-lesson, 🎓, on your own local
> model); **Paths** (ideas you pick up and walk — no due dates, no guilt); the
> **Science & Research Hall** (investigations, self-experiments, and keepable,
> re-readable **paper analyses**); the **Eightfold Path Keep** reflection ladders;
> and a welcome packet grown to **24 texts** with the Bhagavad Gita and the
> Buddha's first sermon added whole.
>
> **Pre-build checks, still standing (re-verified 2026-07-26):**
> - **Save migrations safe (§6.7):** every new field has a default or lazy patch
>   (`personalLibrary/hall/temple/curriculum/paths/hall.dissections` all patched;
>   `day.log/note.book/note.log/settings.sebMode` lazily created) — a tester's
>   save survives the update.
> - **No-Docker graceful:** a tester has no `.env.local`, so `minioWrite` returns
>   `no-minio-config` and personal books fall back to the app-data **file** path
>   (durable on desktop, no Docker). MinIO is the opt-in layer, never required
>   — see §5.
> - **Local-only intact:** `.env.beta` is key-free; `npm run build:beta` compiles
>   clean and the bundle carries **no** Supabase URL, MinIO endpoint, or creds
>   (re-verified by grep — only the localStorage save-key name appears).
>
> **Remaining to cut the fresh beta:** (1) the **welcome-packet call** (§6.3) —
> only **6 of 24** seed texts read in full today, the rest are summary-only, so
> either bundle more full texts, ship a MinIO **starter package**
> (SELF-HOSTED-STACK-PLAN.md), or ship lean *and say so*; (2) run
> `npm run electron:build:beta` on the user's machine; (3) the **§6.8
> clean-machine install test** + a live shelve→read / drop-a-book click-through.
>
> **New for this beta, and the reason it's worth waiting for: the Inheritance
> Hall (§8)** — where a visitor writes their *own* learning program and, at the
> end of it, walks away with something real to keep or give: the book collection
> that program was built on, plus their own notes, in one file. It's the piece
> that makes "they should fill the Pavilion up just as we have" something a
> tester can actually *do* on day one, not just an invitation.

Written 2026-07-11, at direct request: a full build plan for a Pavilion
someone can **download and run on their own computer** for their own use.
This is the *mechanics* companion to [`BETA-LAUNCH-PLAN.md`](BETA-LAUNCH-PLAN.md)
(the stance) — this doc answers "what's in the build, what's not, how do we
package it, what backend, and what has to be solved before we press build."

**The governing principle** (from BETA-LAUNCH-PLAN): the **shell ships, the
content is theirs**. The interface — the world, the residents (Quill, the
Monk, Sebastian), the Library room, the desks — is the finished product. The
**books and the local AI are what each person brings** to complete it on
their own machine. So the build is a self-contained, local-first desktop app
with clear outlets for the user to fill it. No account required, no server
required, nothing phones home.

---

## 1. What the build IS

A **Windows desktop app** (Electron), installed from a `.exe`, that runs
entirely on the user's machine. Same codebase as the web build; the desktop
wrapper exists because it fixes the local-AI CORS wall and gives real
filesystem/native-dialog access (see
[`DESKTOP-APP-PLAN.md`](DESKTOP-APP-PLAN.md)). Start Windows-only (the dev
machine's platform); macOS/Linux are a later port, not a beta blocker.

---

## 2. What to INCLUDE

Everything that is the *shell*, and every *outlet* the user needs to fill it:

- **The whole world** — Grounds, Library (**both floors**, with ordered shelf
  bays), Study, Workshop (all three floors), Café, the Eightfold-Path Keep,
  the reading nook, fishing, meditation.
- **The residents + the full chat stack** — `CHAT_AGENTS` (Quill, the Monk,
  Sebastian, the Steward/Investigator, the Computer, the **Tutor**), the three
  charters, agent memory, the pocket phone, and **live streaming**.
- **The day-management spine** — the Writing Desk/planner, **Sebastian's
  calendar + scheduler** (talk to him → timed events + to-dos), the due badge,
  Still Open, task **migration** across days, The Log, and **Paths** (ideas you
  pick up and walk, deliberately without due dates).
- **Unified Notes** — create/edit from anywhere, folders and tags, and a note
  linked to a book down to page/chapter. The marginalia layer the Inheritance
  Hall (§8) later hands on.
- **The Library UI + the seed** — the shelves, the Reader (serif, with
  read-aloud), the Index with search, **bulk import**, and the bundled
  `seed.js` welcome packet — **24 texts, 6 of them full** (see §6.3, still the
  open call).
- **The school** — the **Learning Tree** (a real prerequisite curriculum with
  per-node progress), the **Academy Tutor** (teach / quiz / review / plan a
  lesson), and — new for this beta — the **Inheritance Hall** (§8), where a
  visitor writes a program of their own.
- **The Science & Research Hall** — investigations with evidence *and* a
  falsifier required, self-experiments, and keepable, re-readable paper
  analyses.
- **The "fill it yourself" outlets** — the Connections panel (bring your own
  Ollama/model), the Caravan Desk (drag-drop `.txt`/`.epub` intake + the
  terminal tools in `tools/caravan/`), and the teaching docs:
  [`PROTOCOLS.md`](../PROTOCOLS.md), [`MANUAL.md`](../MANUAL.md), and the
  in-world "How to Complete Your Own Pavilion" book.
- **Data ownership** — Export/Import save (personal book text inlined, so one
  `.json` is the whole Pavilion), the Your Data panel, the Idea Jar, badges,
  activity log. All local.
- **The zero-config guarantee** — it must run and be enjoyable with **no
  Supabase, no cloud AI, and no Docker**. Every optional piece degrades
  gracefully to a local default; the layers a user *can* add, and the order
  worth adding them in, are §5.

---

## 3. What NOT to include (strip or disable for beta)

- **The bundled Supabase Commons.** Supabase (when configured) powers the
  shared café boards, account/magic-link sync, steward moderation, and the
  mirrored catalog. **The beta must NOT ship pointing at Zac's own Supabase
  project** — that would put every tester on one shared database and one
  shared Library. Ship **local-only**: no `.env` Supabase keys in the build,
  so the app uses its local path for everyone. Since 2026-07-12 this is no
  longer just a beta measure — the standing direction is **off Supabase
  entirely**, toward a self-hosted stack the owner runs
  ([`SELF-HOSTED-STACK-PLAN.md`](SELF-HOSTED-STACK-PLAN.md)). A shared Commons,
  if it ever happens, is that same stack on a rented box (§5, §7).
- **Any secret or key.** Git history is already confirmed clean (DESKTOP-APP-
  PLAN); the build must carry no service-role key, no API key, nothing.
- **Nothing half-built pretending to be finished** — the five sketched
  Workshop rooms keep their honest "not open yet" replies (already true).
- **The steward/moderation UI** is meaningless with no shared backend — hide
  or no-op it in local-only mode rather than show dead buttons.

Keep the Caravan tools **in** — they're how a user grows their own Library,
not dev-only scaffolding.

---

## 4. How to PACKAGE it

- **Build command:** `npm run electron:build` → a real Windows installer in
  `release/`. Proven end-to-end (DESKTOP-APP-PLAN Phases 1–4), including
  running the packaged installer itself.
- **Unsigned, on purpose.** Windows will show an "unknown publisher" warning
  the first run — expected for a personal/small project, documented in the
  README. Code-signing is a paid cert; a later nicety, not a beta blocker.
- **What the installer contains:** the static `dist/` build + the Electron
  runtime + `electron/main.cjs`/`preload.cjs`. No external services.
- **The one unverified thing:** a clean install on **hardware that never
  built it** (DESKTOP-APP-PLAN's remaining gap). This is a real pre-ship test
  — ideally on a second machine or a fresh VM.

---

## 5. The setup ladder — what a person adds, in what order, all of it optional

**The shipped answer: no backend at all, and every capable layer is something
the user chooses to add.** This is the shape the beta is actually sold on —
*the app works out of the box; then you make it yours, one optional layer at a
time, in whatever order suits your machine.* Nothing below is a prerequisite
for the layer under it, and nothing breaks if a layer is missing — it degrades
to a named, honest fallback.

| Layer | What you install | What it buys | Without it |
|---|---|---|---|
| **0 — the installer** | the `.exe`, nothing else | the whole world, the residents (silent), 24 seed texts, notes, Paths, planner, Learning Tree, the Halls | — this layer is never optional |
| **1 — Ollama** (do this first) | [ollama.com](https://ollama.com) + one model | **residents talk back** — the Tutor teaches, the Monk guides, Sebastian plans your day | NPCs stay scripted; every non-AI feature is untouched |
| **2 — Docker + MinIO** | Docker Desktop, one `docker compose up` | book text in real object storage with room to grow (100 GB reserve on the dev machine); a curated **starter package** can be dropped in a bucket | personal books save as plain files in the app's own data folder — durable, just smaller-scale |
| **3 — your own setup** | whatever you already run | point the Pavilion at an Ollama on another box, LM Studio or any OpenAI-compatible endpoint, your own S3/MinIO, later a local Postgres catalog | the built-in local defaults, which are the same code paths |

**Layer 1 first, always.** It's the biggest single jump in what the Pavilion
*is* (a place with people in it), and it needs no container, no database, no
config file — install, pull a model per [`PROTOCOLS.md`](../PROTOCOLS.md)
Protocol 2's tiered guide, done. The desktop app proxies Ollama through its own
process, so the browser-only `OLLAMA_ORIGINS` step doesn't apply. A cloud key
(Claude/ChatGPT/Grok) is an eyes-open alternative here, always labeled ☁ — the
Pavilion never ships one.

**Layer 2 only when files aren't enough.** A tester downloading a `.exe` will
not stand up a container to try a game, and must never have to: personal books
already fall back to `app.getPath('userData')` files through the desktop bridge
(`minioWrite` → `no-minio-config` → file), which is genuinely durable and needs
nothing installed. Docker earns its place when someone wants a *library*, not a
shelf — many books, big texts, a store they can inspect with `mc` and back up
themselves. Setup lives in
[`LIBRARY-SCALING-PLAN.md`](LIBRARY-SCALING-PLAN.md); the build's job is to make
adding it a config change, not a migration.

**Layer 3 is the outlet, not a feature.** "Use your own local setup" means the
adapter seams already in the codebase (`provider.js` for AI, `store.js` for the
catalog, the desktop bridge for storage) are documented and reachable from the
UI, so someone who already runs their own things points the Pavilion at them
instead of duplicating. That's the whole "ship real outlets, not walls" stance
from [`BETA-LAUNCH-PLAN.md`](BETA-LAUNCH-PLAN.md), stated as infrastructure.

**What this means for the build:** ship Layer 0 complete and provably
self-sufficient; ship Layers 1–3 as *documented, one-step-each* add-ons with a
visible status readout for each (the Connections panel already does this for
AI; storage should say plainly which of MinIO / app-data files / inline it is
using). A tester should never have to guess which layer they're on.

> **Backend direction, sharpened 2026-07-12 — supersedes the 2026-07-11
> "keep Supabase for now" note that stood here.** The default backend is *this
> machine*: book text in local MinIO, the catalog local too, the whole Pavilion
> runnable with no cloud account at all. Don't build a feature that *requires*
> Supabase or any third party. If a shared Commons is ever genuinely wanted, it
> is a small VPS running **the same** Postgres + MinIO stack the dev machine
> already runs — renting a box, not joining a platform, and not before there's
> a real second person to serve. Full staging:
> [`SELF-HOSTED-STACK-PLAN.md`](SELF-HOSTED-STACK-PLAN.md). Auth is the one
> honestly hard piece, named rather than pretended away.

**AI backend:** none of ours, ever — the user's own local Ollama, or an opt-in
cloud key they add themselves. Already how it works.

---

## 6. What to IRON OUT before we build

A checklist, roughly in priority order. Most of the original nine are now
closed; what's left is short, and honest about which items are decisions
rather than bugs.

1. ~~**Local full-text storage without Docker.**~~ **Closed 2026-07-26.**
   Personal books write to local MinIO when Docker is up and fall back to
   app-data files when it isn't (§5, Layer 2) — both durable, neither
   required.
2. ~~**Local-only mode hardening.**~~ **Closed** — `.env.beta` is key-free and
   the Supabase tree shakes out of the bundle entirely (re-verified by grep
   2026-07-26). Worth one more click-through pass at build time, not a task.
3. **The welcome-packet decision — still open, and now the sharpest one.**
   Not seed-vs-empty anymore (24 texts ship), but **depth**: only **6 of 24
   read in full**; the marquee classics are summary-only, which is the first
   thing a stranger will notice. Three honest options — bundle more full
   texts as assets (costs bundle size, ~150k for the Gita), ship a MinIO
   **starter package** for Layer-2 users (SELF-HOSTED-STACK-PLAN.md), or ship
   lean and *label the summaries plainly* so nothing feels like a broken
   promise. Pick one before the build.
4. ~~**The personal / certified provenance split.**~~ **Closed 2026-07-11** —
   Your Shelf marks a visitor's own books 👤, distinct from certified shelves.
5. ~~**A minimal first-arrival orientation.**~~ **Closed** — the welcome panel
   plus [`MANUAL.md`](../MANUAL.md), the visitor's handbook.
6. ~~**The Monk's tiered-model recommendation.**~~ **Closed** — the tiered
   guide lives in [`PROTOCOLS.md`](../PROTOCOLS.md) Protocol 2. **Still open
   underneath it:** per-resident model assignment in the Connections panel
   (BETA-LAUNCH-PLAN #3) — wanted, not a beta blocker.
7. **Save-compatibility discipline — standing, forever.** Testers will update
   the app; their saves must survive. The `freshData()` + per-field migration
   pattern holds (`personalLibrary`, `curriculum`, `paths`,
   `hall.dissections` all patched lazily). **Every new store added for the
   Inheritance Hall (§8) must follow the same pattern** — and if a shape ever
   *changes* rather than grows, that's the moment to start using
   `saveVersion`.
8. **Clean-machine install test (§4).** Still the one genuinely unverified
   thing: install on hardware that never built it. This is the real gate.
9. **Distribution hygiene.** MIT license present, the "unknown publisher"
   note present, and one page of "what this is / how to install / what to try
   first / nothing phones home" written **for a non-technical tester** — with
   the §5 ladder as its shape, so nobody thinks Docker is required.
10. **The Inheritance Hall (§8).** New scope, deliberately added to this beta
    rather than after it — the reason is in §8.

---

## 7a. Visual polish for the beta (user's note, 2026-07-11)

The user's own words: *"I like this low-res Pokémon-style game, but we don't
need to be afraid to make it look nicer for the beta build."* This is a
deliberate, bounded relaxation of the sleeper-car stance (`CLAUDE.md`), not a
reversal:

- **Keep the identity.** Low-res, pixel-art, top-down Pokémon feel stays —
  it's who the Pavilion is, and the cheapness is still the point (resources go
  to AI/Library/work).
- **Polish within that.** Sharper palette harmony, more consistent UI panels,
  a warmer title screen, small readability and charm passes — all fine and
  welcome. **The bar:** stays cheap (no heavy assets, no perf-hungry effects,
  nothing external — CSP-safe, self-contained), and never breaks a working
  feature. Looking nicer must not cost the sleeper-car advantage.

## 7. The build order from here (the original Phases 0–4 are all closed)

Phases 0–4 as first written — decide, local storage, hardening + orientation,
the model on-ramp, package — were walked end to end and produced
`0.1.0-beta.1`. What replaces them:

- **Phase A — the Inheritance Hall, Phases 0–2 (§8).** The one new feature in
  this beta. Build it before cutting the installer, so the first thing testers
  meet is a Pavilion that invites them to *make* something, not just tour it.
- **Phase B — the welcome-packet call (§6.3).** A decision, then whatever
  small work it implies (bundle texts, seed a package, or label summaries
  honestly). Cheap once decided; do not build first.
- **Phase C — package.** `npm run electron:build:beta` on the user's machine
  at `0.1.0-beta.2` (already bumped).
- **Phase D — prove it.** The clean-machine install test (§6.8), then a live
  click-through: connect Ollama → a resident replies → drop a book → it reads
  back → write a program in the Hall → export a bequest. Both the Docker path
  and the no-Docker path (§5) get walked.
- **Phase E — hand it to people.** A handful of testers, the one-page install
  note (§6.9), and every finding into
  [`BETA-TESTING-FEEDBACK.md`](BETA-TESTING-FEEDBACK.md), triaged the same way
  every round so far has been.

The tester round's full checklist — what to verify, where it goes, who gets it
— lives in [`BETA-LAUNCH-PLAN.md`](BETA-LAUNCH-PLAN.md)'s "Next beta-test
round"; this list is only the ordering.

---

## 8. The Inheritance Hall — write your own program, and leave with something

> **BUILT 2026-07-27 — Phases 0–2, and it became a real place rather than a
> panel.** The user's own shape for it, given the same day: *"a new building at
> the edge, like an open sandbox, where you can plant things — a book, a sword
> in a stone, a seed that blooms into a flower and gives you seeds of its own.
> There people can find what others have left before. It can be empty unless we
> add things ourselves."* That is what shipped:
> - **A real building and a real room.** A roofless walled garden at the
>   southwest edge of the Grounds (`buildGrove()`, `scenes.grove`), down its own
>   lane, with a new `hall` building type in `render.js` — open to the sky, an
>   arch that was never fitted with a door. It arrives **empty**, on purpose.
> - **Planting is the mechanic.** Face any open ground, press E. Plantings live
>   in the **save** (`data.grove.plantings`), not in `scenes.js` — the first
>   interactable in this project that does. Three sprites, each its own thing:
>   a **book on a stone** (a curated collection), a **sword in a stone** (a
>   course behind a trial), and a **seed** — which grows on **real calendar
>   days** (seed → sprout → bud → bloom on day 3), then carries **seeds of its
>   own** to gather and plant again, which is the propagation half made literal.
> - **The trial** is a question and an answer the planter writes; matching is
>   case- and punctuation-forgiving. Answer it and the sword draws, and the
>   course lands on your Course Board.
> - **The bequest file** carries any planting to another person as one `.json`.
>   The provenance filter runs at the door: redistributable text travels
>   (inline **and** `doc.sections`, a gap found by actually exporting a
>   Pavilion-Commons essay and getting an empty card), everything else goes as a
>   card with its source. A preview shows exactly what leaves before it does.
> - **Verified live, not just built:** 19 checks driven in a real browser —
>   trial refuse/accept, course delivery, seed gathering, note copying with the
>   original untouched, planting, the empty-title guard, and a full **two-Pavilion
>   round trip** (A writes a bequest → B, empty grove, different person, plants
>   the file → attributed, shelved, provenance respected, no save data leaked).
> - Screenshots taken of the garden, the Hall from outside, and every panel.
>
> **ROUND 2, same day — it became an expedition.** The user's steer after
> seeing it: make the ground *all sand*, put something real on the stone, and
> let an AI help fill it, including hidden things with requirements.
> - **All sand, walled in stone.** The court's grass, paths and wildflowers are
>   gone; it's bare sand ringed by the compound's own wall (a new `N` tile —
>   the bench standing on sand rather than painting itself a green square in
>   the middle of a desert). It reads as a dig now, not a garden.
> - **The stone is engraved** with the Diamond Sutra's closing verse (§32,
>   F. Max Müller 1894, public domain) — the one that names *a star* among the
>   things that don't last, which is what the user asked for and happens to be
>   the real quote. The panel ties it to the Pavilion's own charter line.
> - **Gifts left at the gate** (`data/bequests.js`): three real bequests
>   bundled with the build and **never pre-planted** — the Hall still ships
>   empty; they're *offered*, and receiving one is a deliberate act.
>   **The First Turning** (five CC0 Buddhist texts), **The Four Truths and the
>   Eight Folds** (a seed of four notes quoting the first discourse verbatim
>   from the shelved CC0 translation, attributed on every one), and a **buried**
>   course behind both a requirement and a trial drawn from that same text.
> - **Buried things with requirements.** A planting can carry a condition —
>   read a given book, wait N real days, plant something yourself first, bring
>   your own books in. Until it's met it renders as a sand drift with a corner
>   showing, its contents unreadable, and it states plainly what it waits for.
>   Requirements check things a person *did*; nothing is ever unlocked by
>   paying or scoring, and the requirement travels with a bequest.
> - **The local AI drafts, never plants.** `draftPlantingWithAI()` reads your
>   actual shelves and notes and fills the form — title, message, which books,
>   or a course with a trial — under `WORK_CHARTER` (the Hall must serve a
>   trade or a language as readily as the dharma). No new resident, per the
>   standing "effectiveness before personalities" rule; it reuses `AI.chat`.
> - **Placement fixed:** `freeGroveTile()` picked the first free tile, which
>   piled every gift into one corner with overlapping labels. It now picks the
>   spot furthest from anything already planted, so the court fills the way a
>   dig site does.
> - **Bonus fix:** `select` and `input[type=number]` were never styled anywhere
>   in the app — every dropdown in the game rendered as a native white box in a
>   dark panel. One CSS rule fixes all of them.
> - **Verified:** 14 further live checks (verse engraved, gifts offered and
>   planted, court still honestly empty, contents hidden while buried, the
>   condition stated, surfacing once the book is actually read, its trial
>   accepting the real answer from the CC0 text, the seed sealed on day one,
>   quotes verbatim). 33 live checks across both rounds, all passing.
>
> **Still open:** a resident who keeps the court; a second pass on the Hall's
> interior seen over the wall; and sharing without hand-carrying a file, which
> stays the Commons/federation question and out of beta scope.

**New scope for this beta (2026-07-27), at the user's request.** A room where a
visitor **creates their own learning program**, and where finishing one leaves
them holding something real: **the book collection that program was built on,
and their own notes**, gathered into one thing they can keep — or give to
someone else.

**Why it belongs in the beta, not after it.** The whole launch stance is *"they
should fill the Pavilion up just as we have"* (BETA-LAUNCH-PLAN). Today a
visitor can fill it with **books** (the Caravan Desk) and **notes** (unified
Notes) — but the curriculum is ours: the Learning Tree's `CURRICULUM` is
hard-coded, so a stranger can *walk* a program and never *write* one. The
Inheritance Hall closes that gap, and it's the difference between handing
someone a school and handing them a school they can teach in. It is also the
project's own line — *everything turns to sand, so give it away first* — made
into a mechanic instead of a motto.

### What it is, concretely

- **A program** is user-authored and lives in the save: a title, why you're
  doing it, and ordered **lessons**, each with steps and **required reading**
  pointing at real shelved books (by `slug`, certified or personal). It is the
  Learning Tree's shape — prerequisites, per-node progress — with the content
  in the user's hands rather than the codebase's. Someone can write "Spanish
  101 → Spanish 201," or "learn my trade," or "what I want my kid to read."
- **You walk it the same way you walk ours.** Progress per lesson, the same
  self-first / AI-last framing, and **the Tutor teaches a user-authored lesson
  exactly as it teaches a built-in one** — `studyLessonWithTutor` already
  grounds on a lesson object, so this is a new *source* of lessons, not new
  chat plumbing.
- **The reward is an inheritance, not a score.** Finish a program and you can
  assemble a **bequest**: the program itself, the **collection of books** it
  was built on, and **your own notes** from walking it — the marginalia,
  linked to the page or chapter they came from. One file. Yours to keep,
  re-read, carry to another machine, or hand to another person, whose Pavilion
  can import it: the books land on their shelves, the notes arrive attributed
  as someone else's hand in the margin, and the program is theirs to walk.

### The rules it has to hold (each one already a project invariant)

- **No scoring, no guilt.** Paths have no due dates; the Eightfold ladders are
  never finished or graded. A program you abandoned is a program, not a
  failure — the Hall shows what you walked, never what you owe.
- **Provenance at the door, applied to giving.** A bequest carries license +
  source per text, and **only redistributes text that may be redistributed**
  (public domain / open license). Anything else travels as its **catalog card**
  — title, author, where to get it — plus your notes, which are yours to give.
  This is the same discipline the Library already holds, and it must be visible
  in the UI: show exactly what will be included before the file is written.
- **Notes are private until deliberately given.** Making a bequest is an
  explicit act with a preview, never a default, never automatic.
- **Local-first, no server.** A bequest is a file. Handing one to someone is
  handing them a file. Nothing about this needs a Commons — though it is
  exactly what a Commons would carry if one ever exists.
- **Save-migration safe (§6.7).** New stores get the lazy-patch treatment like
  `paths` and `hall.dissections`.

### Phases — smallest safe path, first two in the beta

- ~~**Phase 0 — author a program.**~~ **BUILT 2026-07-27**, and the shape moved:
  rather than a second Learning Tree, a program is planted as a **sword in a
  stone** — a title, a why, ordered steps, and an optional trial. Simpler, and
  it earns its place in the world instead of duplicating a panel.
- ~~**Phase 1 — walk it.**~~ **BUILT** — drawing the sword puts the course on
  the **Course Board**, which already tracks steps, progress and the Tutor.
  Reusing the board beat building a parallel progress system, which is the
  same instinct that made the Tutor reuse the chat stack.
- ~~**Phase 2 — the bequest.**~~ **BUILT** — one `.json`, provenance filtered,
  with a preview; verified end to end between two Pavilions.
- ~~**Phase 3 — the room.**~~ **BUILT the same day**, ahead of plan: the user
  asked for a real building at the edge, so the Hall is a walled garden you
  walk into rather than a panel you open. What's *still* open here is a second
  visual pass and a resident who keeps the place.
- **Phase 4 — beyond a file (well after beta).** Sharing without hand-carrying
  is the Commons/federation question, deliberately out of scope here.

**Beta scope was Phases 0–2; 0–3 landed.** What remains is polish, not
mechanism.

**One line to hold onto:** the Library lets you fill the Pavilion with books
and the Academy lets you learn from them — the Inheritance Hall is where what
you learned becomes something you can hand to the next person.
