# The Sand Pavilion

A small top-down world you can walk around in — a Library with real texts,
a Keep with a charter, a Study where you plan your day and pin your own
courses of practice. It's built like a game because a game is a good shape
for a place, but the actual point is a commons: things freely given,
license and source attached to everything, nothing gated.

The long-term idea: this becomes a platform where AI agents are residents,
not just flavor text. The NPCs already carry that identity in their names —
Ember · *Archivist Agent*, Moss · *Steward Agent*, Cobalt · *Caravan Agent*,
Quill · *Librarian Agent* — walking around today as scripted dialog, but
built to be occupied by something real later. A game that's not a game: an
exploratory, spatial way to move through a personal (and eventually shared)
body of data, practice, and writing, rather than a dashboard or a feed.

## New here? Start with this

You don't need to know how to code, use a terminal, or understand what
an "API" is to enjoy the Sand Pavilion. None of that is required to walk
the Grounds, read a book in the Library, plan your day at the Writing
Desk, or fish at the pond. If that's all you want, skip to "Running it"
below and go play — everything past that point is optional.

Connecting your own local AI, so Quill can actually talk back, is a
deeper layer with real setup involved (installing a program, typing a
few commands). That's not because you need to be a programmer — it's
because that piece genuinely runs on *your* computer instead of ours,
which is the whole point. The [local AI setup guide](#setting-up-local-ai--a-beginners-guide)
further down is written for someone who has never done anything like
this before, start to finish, with a troubleshooting list at the end for
exactly when a step doesn't go as expected. If a step in it doesn't make
sense, that's a bug in the guide, not in you — say so, and it gets fixed.

Two things worth knowing going in:

- **Nothing here can break by clicking around.** Every panel has an Esc
  in the corner. Worst case, you close it and try again.
- **If you want to learn the "why" behind any of this alongside playing**
  — what a terminal actually is, what "local" and "API" mean, how this
  whole thing is built — there's a self-paced curriculum for that in
  [`LEARNING-PATH.md`](LEARNING-PATH.md), built around this project itself.

## Running it

```
npm install
npm run dev       # starts Vite, prints a localhost URL
```

Walk with Arrows/WASD, interact/fish with `E`, close menus with `Esc`.
`Esc` with nothing open — or the `☰` button in the corner — opens a pause
menu: resume, manage AI connections, return to the title screen, or reset
all progress on this device (behind a confirmation; there's no undo).
Everything you do — reading, your daily planner, your courses, your
Archive Desk entries, your position — saves to `localStorage`
automatically; the title screen tells you whether it's actually
persisting ("Saving to this device") or running in a memory-only preview
mode (e.g. inside a sandboxed iframe).

```
npm run build      # outputs a static site to dist/
npm run preview    # serve that build locally to sanity-check it
npm test           # config sanity check — scenes, warps, seed data (no browser needed)
```

Deploy `dist/` anywhere that serves static files (Vercel, Netlify, GitHub
Pages, etc). The build is deploy-ready (verified clean, zero console
errors, ~87KB JS / ~2.7KB CSS gzipped now that `@supabase/supabase-js`
is bundled in) — local AI still works after deployment, since the game
always checks `localhost:11434` from *whoever's browser is currently
open*, not wherever the static files are hosted. The one thing not yet
done is the actual deploy (needs a Vercel/Netlify account) — see
`LEARNING-PATH.md` Stage 5 and "Project history," below, for where this
repo actually lives.

**Phase 3 (Supabase) is live, optionally.** Copy `.env.example` to
`.env.local` and fill in `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`
from your own Supabase project's API settings to connect the Library and
café's notice board to a real database; without it, the Library reads
`data/seed.js` as always and the notice board says so plainly. See "The
café" and "How it's put together," below, for what actually moved.

## Features guide — everything, by location

A scannable reference for what's actually in the Pavilion today and
where to find it — separate from the architecture/history further down,
so "how do I use X" never means reading the whole file.

**Anywhere, via the pause menu (`Esc` / `☰`):**
- **⚙ Manage AI connections** — see/add/enable/disable AI backends.
- **🔗 Waypoints** — a personal, no-backend link list.
- **📜 Activity Log** — a capped, human-readable record of what you've
  actually done this and past visits.
- **🏅 Badges** — nine first-time-action badges, doubling as a soft
  tutorial; locked ones show what unlocks them.
- **🎒 Inventory** — books you're carrying (added from the Reader); read
  any of them from anywhere, plus an AI grouping suggestion.
- **🛡 Steward Review** — the queue for anything headed toward the
  shared Library; approve/reject, then generate one paste-ready batch
  for `seed.js`.
- **⬇/⬆ Export / Import Save** — your whole save as a real JSON file.
- **⚠ Reset all progress** — behind a confirmation; no undo.

**The Library** (four shelves — Theravada, Mahayana, Daoism, Practice):
face a shelf, `E` to browse spines, `Enter`/`E` to open a book. In the
Reader: **🔊 Read aloud**, **🔊/✨ Summary aloud** (a fresh spoken
summary from Quill if AI's connected), **🎒 Take with you**. **📑 Full
Index** (from any shelf) lists every text — Library and your own
Archive — sorted by category instead of tradition. Quill himself: face
him, `E` — a real chat if AI's connected, two scripted lines otherwise.

**The Keep:** the charter sign, and the Keeper's scripted dialog. No
stations yet.

**The Study:**
- **The Writing Desk** — today's intention, seven rhythm blocks, an
  evening ember; **Past days** below it reads back every prior day kept.
- **The Course Board** — pin a course (steps, optionally `title | practice | url`),
  toggle progress.
- **The Computer** — an AI planning assistant distinct from the Desk:
  day planning, lesson-plan drafting from an idea, general
  thinking-through. Needs a live AI connection to actually answer;
  clearly says so if not.
- **The Request Board** — a book wishlist feeding the Caravan connector's
  queue (see "Pathways outward" below).

**The Workshop:** the Archive Desk — your own writing, the same
title/license/source/body shape the Library uses. **+ Write a new
entry**, **+ Bulk import** (paste a JSON array, or run
`tools/caravan/gutenberg.py` first and paste its output), **📜 Ask
Quill for a memory report**, and **📤 Submit for Library review** on
any entry you've written.

**The Café:**
- **The Notice Board** — three most recent steward-approved posts from
  the shared `exchange_questions` table; click one to read the full
  thread, **+ Post a question** to submit your own (lands `pending`,
  reviewed by a steward before it's visible to anyone else). Needs a
  Supabase connection (see "Running it") — says so plainly if not.
- **The Hearth Corner** and **The Grant Desk** — low-stakes scripted
  stations, same shape as any sign or NPC; no backend involved.

**The pond:** face water, `E` to cast; ten fish varieties, purely
flavor-text, no mechanic beyond the catch.

## Setting up local AI — a beginner's guide

**This section assumes no prior experience with "local hosting" or APIs.**
Quill (the Librarian) can now actually talk back — but only once an AI
model is running *on your own computer* for the game to talk to. Nothing
about this is required to play; without it, Quill just uses his original
two scripted lines, same as every other NPC.

### First, three words worth actually understanding

- **"Localhost" / "local server"** — normally, when a website talks to
  something, it's reaching out across the internet to someone else's
  computer. "Local" means the opposite: a small program runs *on your own
  machine* and quietly listens for requests, and only your own machine
  (or things you explicitly allow) can reach it. `localhost` is just the
  name your computer uses to refer to itself. Ollama (below) is one such
  program — installing it turns your computer into a tiny, private AI
  server that only you can talk to.
- **"API"** — short for Application Programming Interface. It's just a
  fixed way of asking a program for something and getting an answer back
  — in this case, "here's a conversation so far, please continue it."
  You'll never write or see raw API calls yourself; the game does that
  part. The word only matters because Ollama's API has an address (a
  URL, like `http://localhost:11434`) that the game needs to know.
- **"Port"** — a number appended to that address (the `11434`) that says
  *which* program on your machine to talk to, since many can run at once.
  You don't need to choose this yourself — Ollama picks `11434` and the
  game already knows to look there by default.

### Why Ollama

[Ollama](https://ollama.com) is a free program that downloads an AI model
and runs it entirely on your computer — nothing you type is sent
anywhere else. It's the easiest on-ramp into local AI that still gives
you a real, capable model, which is why it's the default here. (LM Studio
is a popular alternative with a graphical interface instead of a command
line; the Connections panel below can talk to it too.)

### Setup, step by step (Windows)

**1. Install Ollama.** Either download the installer from
[ollama.com](https://ollama.com), or from PowerShell:

```
winget install Ollama.Ollama
```

**2. Pull a model.** This downloads the actual AI onto your computer —
it's a multi-gigabyte file, so this step needs a real internet connection
and a few minutes, but only happens once per model.

```
ollama pull llama3.2
```

`llama3.2` is a solid, fast, beginner-friendly default that runs fine
without a powerful graphics card. **Avoid "thinking" or "reasoning"
models for this** (names like `qwen3.5`, `deepseek-r1`, `qwq`) — found the
hard way while building this: those models spend a hidden stretch of
effort "reasoning" before answering, which can make a reply take minutes
instead of seconds, and in the worst case can come back completely
blank if that hidden reasoning eats the whole response budget before it
gets to an actual answer. The game already tells Ollama to skip that step
where it can, but a plain, direct model like `llama3.2` sidesteps the
problem entirely and is the easier choice while you're getting started.

**3. Allow the game to actually reach Ollama.** Browsers enforce a
security rule called CORS — a web page normally can't just talk to
*any* local program uninvited, since that could be a way for a malicious
site to poke at things running on your machine. Ollama has to be told,
by name, which addresses are allowed to talk to it. Set that with:

```
setx OLLAMA_ORIGINS "http://localhost:5173,http://localhost:5174"
```

(Vite — the tool that runs this game locally — normally uses port `5173`
and moves to `5174`, `5175`, etc. if that's busy; check the terminal
output from `npm run dev` for the port it actually picked, and add it
here if it's different.) Close and reopen your terminal after this (or
restart Ollama) for it to take effect — `setx` doesn't apply to windows
already open.

**4. Make sure Ollama is actually running.** The installer usually starts
it automatically in the background (look for its icon in the system
tray, near the clock). If you don't see it, start it yourself:

```
ollama serve
```

**5. Check it's working**, independent of the game:

```
curl http://localhost:11434/api/tags
```

This should print back a wall of text mentioning the model you pulled.
If it says "connection refused," Ollama isn't running — go back to step 4.

**6. Run the game** (`npm run dev`) and open it in your browser. Under
the "Enter the Grounds" button, a line now reports what it found:
"● Connected to Ollama · llama3.2" if everything above worked, or
"○ No local AI detected" if not (the game still works fine either way —
this just tells you which mode you're in).

### Using it

Once connected, walk to Quill in the Library and press `E` — instead of
just his two fixed lines, a text box appears: type a question and press
`Enter`. He only speaks about what's actually on the shelves (grounded in
the real seeded texts, not invented ones); replies typically take a few
seconds. Press `Esc` to leave the conversation at any point.

### The Connections panel

Click **"⚙ Manage AI connections"** on the title screen (works before or
after you've set up Ollama) to see this in one place:

- **A live status** for each connection — a green "● connected" or a red
  "○ unreachable," checked in real time, not just remembered from last
  time.
- **Add a connection** — point the game at anything else that speaks
  Ollama's API or the more universal "OpenAI-compatible" API shape (LM
  Studio, a self-hosted proxy, a friend's server on your network). Give
  it a name and its address (`http://localhost:11434`-shaped); an API
  key field is there for anything that needs one, but most local setups
  don't.
- **Disable / Remove** — turn a connection off without deleting it, or
  take it off the list entirely (the built-in Ollama entry can be
  disabled but not removed).
- Everything here is **stored only on this device** (the same
  `localStorage` everything else in the game uses) and is only ever sent
  to the address you typed in, nowhere else. If more than one connection
  is enabled, the game uses the first one (top to bottom) that actually
  answers.

### Troubleshooting

- **"○ No local AI detected" even though Ollama is running** → almost
  always step 3 above: `OLLAMA_ORIGINS` isn't set, doesn't include the
  exact port Vite is using, or Ollama wasn't restarted after setting it.
  Open the Connections panel — if it also says "unreachable" there,
  it's this. If `curl` (step 5) works but the game still can't connect,
  it's *always* this.
- **Quill's reply took a very long time, or came back strangely blank**
  → you're likely using a "thinking" model (see step 2). Try
  `ollama pull llama3.2` and switch to it.
- **"Connection refused" in `curl` too** → Ollama isn't running; check
  the tray icon or run `ollama serve`.
- **Replies are just generally slow** → the model's larger than your
  hardware handles comfortably; a smaller model (`ollama pull
  llama3.2:1b` is tiny) will answer faster at some cost to quality.
- **Added a connection and it just says "unreachable"** → double-check
  the address is typed exactly as the server reports it (including
  `http://` and the port number), and that the server is actually running.

## How it's put together

```
data/seed.js  →  data/store.js  →  scenes.js  →  entities.js  →  ui/overlays.js  →  render.js  →  main.js
(content)        (persistence)     (world data)  (state+logic)   (DOM panels)       (canvas)      (loop+input, wires it all up)
```

- **`data/store.js`** is the one seam meant to move. `load`/`save`/`reset`
  (player save data) are still local-only — there's no account system to
  hang a network save on yet. `listDocs`/`getDoc`/`allDocs` (the Library)
  now optionally read a Supabase mirror instead: on load, `Store` fetches
  `library_documents` once into an in-memory array and every call site
  keeps reading it synchronously, same as always — if Supabase isn't
  configured, the fetch fails, or the table's empty, it just stays on the
  bundled `SEED_LIBRARY`, no call site ever needs to know which. See
  **`data/supabase.js`** (the client, `null` if unconfigured — same
  NoProvider shape as the AI connection) and **`data/exchange.js`** (the
  café's `exchange_questions` table — list approved posts, submit a
  pending one; no in-game "approve," see the café section below for why).
  Nothing else should ever touch `localStorage` or Supabase directly —
  route through these three files.
- **`scenes.js`** is pure data — tile grids plus arrays of npcs / signs /
  warps / stations. Adding a room means adding a `build*()` function and
  registering it in `scenes`, nothing more.
- **`entities.js`** owns the one mutable `state` object (player position,
  current dialog/fishing/ui mode) and the one `data` object (everything
  that gets saved). It also does world lookups (`tileAt`, `npcAt`,
  `blocked`, etc.) — anything that answers "what's at this tile."
- **`ui/overlays.js`** is the only place that touches the DOM overlay
  panels (shelf, reader, planner, course board) and builds `innerHTML` with
  inline `onclick` strings.
- **`render.js`** owns the `<canvas>` outright and draws every frame; it
  never mutates state, only reads it.
- **`main.js`** is the only place with the `requestAnimationFrame` loop,
  keyboard/touch input, and audio.

### Known rough edges

1. Inline `onclick` + manual `Object.assign(window, {...})` at the bottom
   of `ui/overlays.js` works but is a footgun — a new overlay button whose
   handler isn't added to that list is a silent dead button (this bit us
   once already, with `openCourse`). Migrating to one delegated
   click-listener per panel reading a `data-action` attribute would remove
   this failure mode entirely.
2. `entities.js` / `ui/overlays.js` / `main.js` import each other in a
   circle. It only works today because every cross-module reference used
   during load is a `function` declaration (hoisted), never a `const`.
   That's an easy rule to break by accident — if the café or agent work
   adds more cross-module wiring, consider passing an explicit context
   object instead of adding a fourth circular edge.
3. `state` mixes UI-mode flags (dialog/fishing/ui/courseView) with
   world/player transform in one object. Fine at this size; splitting "UI
   state" from "world state" would help once the café/workshop add more
   overlay modes.
4. `persist()` re-serializes the entire save blob on every micro-action.
   Harmless at `localStorage` scale; needs debouncing or diffing once
   Phase 3 makes this a network call.
5. Save-data has a `saveVersion` field (`entities.js`) but no migration
   function yet, since nothing's needed migrating so far — the field
   exists so a future planner/course schema change has somewhere to hang
   one instead of retrofitting it under pressure. `Store.save()` reports
   back whether a write actually succeeded, and `persist()` warns the
   visitor once per session if it didn't (a full `localStorage` quota
   used to fail silently) — but there's still no automatic migration path.
6. `npm test` (`test/smoke.mjs`) checks scene/seed config sanity with no
   browser needed — warps land on walkable tiles, station kinds match
   what `onAction()` handles, spawns/footprints are in-bounds, seed docs
   are well-formed. It does **not** exercise rendering, input, or the
   AI/Store adapters. The Playwright passes that verified TTS, the
   Activity Log, bulk import, save export/import, and the Caravan
   connector this session were all one-off scratch scripts, never
   committed — promoting a couple of those into a real e2e test in this
   repo is worth doing before this grows further under other hands.

### Manual smoke-test checklist

Run through this after any nontrivial change, since there's no test suite:

1. Clear `localStorage`, load fresh → title screen → Enter the Grounds.
2. Walk to each warp (Keep, Library, locked Workshop, the dock) and confirm
   the right thing happens.
3. Talk to every NPC — dialog advances and closes.
4. Open all four library shelves, read at least one doc per tradition,
   mark one read, close and reopen to confirm the "read ✓" badge and the
   📖 HUD counter both persisted.
5. Writing Desk: set an intention, cycle all seven blocks through all
   three states, write an ember line, save, close, reopen — confirm
   everything came back. Confirm today's entry does *not* appear under
   "Past days" (only prior days should), and that opening an actual past
   day (once you have one) shows its blocks/ember read-only and returns
   cleanly to the desk.
6. Course Board: pin a course with 2+ steps (including one
   `title | practice` line), confirm it opens from the list, toggle steps,
   confirm the progress bar updates, take it down.
7. Fish at the pond long enough to see both a catch and a miss; confirm
   the counter only increments on a catch.
8. Walk through the Workshop's now-unlocked doors, face the Archive
   Desk, write an entry, confirm it opens with the typewriter reveal,
   click back to the desk and confirm its spine is on the shelf, tear
   it out and confirm it's gone.
9. At the Archive Desk: "+ Bulk import", paste a small JSON array of
   `{title,license,source,body}` entries, confirm the right count is
   reported and each lands on the shelf; then "📜 Ask Quill for a memory
   report" (after asking Quill at least one question in the Library)
   and confirm a dated report opens with the right note count and a
   `keep`/`summarize`/`let go` line per question.
10. Open the pause menu → "🔗 Waypoints", add one with a title/URL,
    confirm it appears and its link opens in a new tab; remove it.
11. Pause menu → "⬇ Export save (.json)" downloads a file; then
    "⬆ Import save…", pick a save file, confirm the browser's are-you-sure
    prompt appears, accept it, and confirm the game reloads showing that
    file's data instead of what was there before.
12. Hard-reload the page. Player position, fish count, read docs, today's
    planner entry, courses, waypoints, and Archive Desk entries should
    all still be there.
13. Press `Esc` with nothing open — the pause menu should appear (same
    from the `☰` button). "Return to title screen" should show the
    title without losing your position; re-entering should resume
    exactly where you left off. Don't actually confirm "Reset all
    progress" unless you mean it — there's no undo.
14. Devtools console should show zero errors at every step above.

**Fault isolation**, if a step fails — check in this order, since it maps
to the module boundaries:

- Blank page, nothing renders → almost certainly an import/export error;
  check this before anything else after a refactor.
- A button/overlay does nothing when clicked → the "forgot to expose it on
  `window`" bug class; check the `Object.assign(window, {...})` block at
  the bottom of `ui/overlays.js`.
- Movement/animation looks wrong → `entities.js` (`MOVE_TIME`, the
  position-lerp math in `main.js`'s `update()`), not `render.js`.
- A tile/building/sprite draws wrong or not at all → `render.js`'s
  `drawTile`/`drawBuilding`/`drawPerson` switch statements — an unmatched
  case fails silently by design, so a typo'd tile letter in `scenes.js`
  just draws nothing.
- Nothing persists across reload → check the text under the title
  screen's Enter button; if stuck in preview mode outside an iframe, the
  browser is probably blocking `localStorage` (privacy mode, embedded
  iframe, etc).
- "Cannot access 'X' before initialization" at load → a `const` export got
  used too early across the entities/ui/main circular boundary; see rough
  edge #2 above.

## Where things stand

**Built and verified:**

- **The Grounds, the Keep, the Library** — four shelves, fifteen texts,
  full license/attribution metadata, browsed as a book-spine carousel.
- **The Study** — Writing Desk (today's plan plus a real "Past days"
  journal of every prior day kept) and the Course Board (steps can carry
  an optional `| url` third segment as a "→ visit" link).
- **The Workshop's first room** — the Archive Desk: a personal writing
  surface in the same title/license/source/body shape the Library uses,
  with a page-turn compose/read UI and a typewriter-cadence reveal.
  Supports "+ Bulk import" (paste a JSON array of entries) alongside
  writing one by hand. Seven more rooms are still just the sign's promise.
- **Fishing**, full `localStorage` persistence, and a pause menu
  (`Esc`/`☰`) with Resume / Manage AI Connections / Waypoints / Activity
  Log / Export/Import Save / Return to Title / Reset Progress.
- **Real local AI** — Quill answers questions grounded in the shelved
  texts via your own Ollama (or any OpenAI-compatible) connection,
  remembers what you've asked across visits, and can generate a memory
  report (prose + a per-question keep/summarize/let-go suggestion) in
  the Archive Desk. A Connections panel manages multiple AI backends. A
  second resident, the Mountain Monk, is seated and waiting for his voice.
- **Text-to-speech** — native browser voice, no cloud API. The Reader
  can read a text aloud or speak its summary (a fresh one from Quill, if
  connected); any NPC dialog box can speak its current line.
- **The Activity Log** (📜) — a short, capped, human-readable record of
  what's actually happened in a visit.
- **A Pavilion you can carry in a file** — Export/Import Save as JSON.
- **Waypoints** (🔗) — a personal, no-backend link list.
- **A first Caravan connector** (`tools/caravan/gutenberg.py`) — a local
  Python script that fetches a public-domain book from Project Gutenberg
  and formats it for the Archive Desk's bulk import. Never touches the
  shared Library directly.
- **Seasons/weather** (`src/game/season.js`) — atmosphere only, no
  mechanic touched.
- **`npm test`** (`test/smoke.mjs`) — config sanity checks, no browser
  needed.
- Moss references what Quill remembers about you, by name — a first,
  one-directional taste of residents noticing each other.
- **Badges** (🏅, pause menu) — a first-time-actions checklist doubling
  as a soft tutorial: nine badges (first steps, first word, first page,
  first cast, and so on) unlock with a short toast the first time you
  try each core mechanic; the panel lists locked ones with their trigger
  still visible, so it reads as "things to try," not a forced walkthrough.
- **The Index** (📑, from any Library shelf) — every text in one list,
  sorted by category (Classical, Non-fiction, Fiction, Research papers,
  AI-written, Personal) rather than tradition, spanning both the Library
  shelves and your own Archive Desk. Categories with nothing in them yet
  are still shown — the taxonomy exists ahead of the content that will
  fill it, same instinct as `saveVersion`.
- The Library floor is parchment-toned now, not a carpet — a small
  visual pass toward "this room feels like paper."
- **The Study, expanded** — two new stations alongside the Writing Desk
  and (now visually bigger) Course Board:
  - **The Computer** (🖥) — an AI planning assistant distinct from the
    Writing Desk's pen-and-paper practice: ask for help planning today,
    drafting a lesson plan from a rough idea, or thinking something
    through. Same `NoProvider`-safe pattern as everything else — a
    clear message when no AI is connected, a real conversation when one
    is. A reply can be saved straight to the Archive Desk.
  - **The Request Board** — a wishlist of books you'd like added,
    feeding the Caravan connector's queue. Nothing here fetches itself;
    it's where a request waits until a human actually runs
    `tools/caravan/gutenberg.py` and reviews what comes back.
- **A first curated addition to the Library**, via that same connector:
  Herbert Giles' *Religions of Ancient China* (public domain, Gutenberg),
  a scholarly overview rather than primary scripture — chosen
  specifically because it doesn't duplicate the Tao Te Ching/Zhuangzi
  already on the Daoism shelf. Fetched, reviewed, and hand-added with an
  original summary, the exact human-in-the-loop path this project's own
  rules require for the shared Library (16 texts now, up from 15).
- **Inventory** (🎒, from the Reader or the pause menu) — carry a book
  with you and read it from anywhere, no walk back to the shelf. Nothing
  is depleted from the Library; it's a personal "currently carrying"
  list. Includes an AI-assisted categorization suggestion (ask "the
  Computer" what a loose grouping across what you're carrying might be)
  — a suggestion to consider, never applied automatically.
- More fish varieties at the pond (ten now, up from six).
- **Phase 3 — a real Supabase project, wired up (2026-07-07).**
  `library_documents` (all 16 texts, migrated from `seed.js`) and
  `exchange_questions` (the café's notice board, RLS + five seeded
  posts) both exist in a live Supabase project and are actually read by
  the game — see "How it's put together" above for the adapter shape.
  Player save data stays local-only; there's no account system yet to
  attach a network save to.
- **The Café — built (2026-07-07).** A fourth overworld building, east
  of the vertical path between the Library and the Workshop. The Notice
  Board is real and Supabase-backed (see above); the Hearth Corner and
  Grant Desk are deliberately just scripted dialog for now, same as any
  sign. Moderation is manual, on purpose — see the café section below
  for exactly why there's no in-game "approve" button.

Full session-by-session build narrative (what broke, what got fixed,
what got verified how) lives in `archive/` — see "Project history"
below — rather than growing here indefinitely.

**Sketched, not built:** seven more rooms of the workshop, the
agent-to-agent notes commons (waits on real steward auth — see the café
section below), giving AI agents real hands (their own
keyboard/mouse-equivalent access to the world), a public website /
desktop app, and loading the tile map from external JSON instead of
generating it in code. That's the build plan below.

### Project history

This repo is posted at
**[github.com/zaxaustin/sandpiviliongame](https://github.com/zaxaustin/sandpiviliongame)**
(private). The detailed, session-by-session build log — what broke, what
got fixed, exactly how each feature was verified — lives in `archive/`
rather than growing inside this file forever:

- `archive/dev-log-2026-07-06.txt` — the original module split, the
  Store adapter contract, the Phase 3 Supabase sketch.
- `archive/dev-log-2026-07-07.txt` — the day the Workshop, AI agents,
  text-to-speech, the Activity Log, save export/import, Waypoints, the
  first Caravan connector, and the pre-beta security/data-safety pass
  all landed.

This README stays a current-state reference — what's actually true
right now, what's still open, and the real decisions made along the way
(moderation models, naming, architecture calls) that the next session
needs, not a scrolling changelog of how it got there.

## Future build plan

### The café — a link outward

**Built (2026-07-07):** the building, the interior room, and the Notice
Board (real, Supabase-backed) all exist — see "Where things stand" above
and "How it's put together" for the adapter shape. The Hearth Corner and
Grant Desk below are still deliberately just scripted dialog, not new
subsystems. The rest of this section is kept as the original design
sketch/rationale, since it's still accurate about *why* things are
shaped the way they are — just read "could be" as "is" where it
describes the Notice Board.

The Library is a commons of *existing* human texts; the café is where the
Pavilion looks outward instead of down at a shelf. It's a meeting place —
a room whose job is to point at the rest of the web, and at each other,
rather than to hold content itself:

- **Notice board** — a small rotating set of live questions/threads people
  have posted, each one opening out to wherever the real conversation
  lives (could be Supabase-backed from the start, per the sketch already
  in the archived dev log — `exchange_questions`, three most recent,
  clicking opens the full thread).
- **Hearth corner** — informal, low-stakes: a "what are you working on"
  space, closer to a campfire than a forum.
- **Grant desk** — a pointer to real funding/support resources for people
  doing the kind of independent practice/research this place is for.
- The throughline with the Library: every outbound link should carry the
  same *what is it, where's it from* discipline the shelves already
  enforce. A café that links out to the best things humanity has already
  built only works if it's curated with the same care, not just a raw
  link dump.

**Moderation model (decided 2026-07-06):** links are built by the Pavilion
itself first, and the community can *submit* new ones, but nothing goes
live unmoderated. This reuses the `steward` role already sketched for the
library table in Phase 3 — a submission gets a `status: pending`, is
visible to its submitter, and only appears on the notice board once a
steward flips it to `approved`. No open free-for-all posting.

**A real gap, worth stating plainly:** the `steward` RLS policy below is
live in the database, but there's no steward *authentication* built yet
— the game has no login system at all. So today, "a steward flips it to
approved" literally means a person opening the Supabase dashboard's table
editor (which uses the project's service role, bypassing RLS entirely)
and editing the row by hand — the exact same manual gate
`library_documents`'s insert policy already relies on. There's
deliberately no "approve" button anywhere in the game itself: building
one against the anon key would mean any visitor could flip their own
submission to `approved`, which defeats the entire moderation model. Real
steward auth (Supabase Auth, a `role` claim, a real login) is the actual
prerequisite for an in-game moderation UI — worth its own build, not a
quick add-on.

**The dataset, concretely.** The notice board is a link-out, not an
in-app forum — a post *points at* wherever its real conversation
already lives, the same shape as a Waypoint, just shared and moderated
instead of personal:

```sql
create table exchange_questions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,           -- what's being asked/discussed, in the poster's own words
  external_url text,            -- where the real conversation lives, if it's not self-contained
  author text,                  -- a display name for now, not a real identity system yet
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
alter table exchange_questions enable row level security;
create policy "approved posts are visible to everyone" on exchange_questions
  for select using (status = 'approved');
create policy "stewards see and moderate everything" on exchange_questions
  for all using (auth.jwt() ->> 'role' = 'steward');
```

Reading the board is exactly the query the archived dev-log sketch
already had right: three most recent approved rows, clicking one opens
the full post (`listApprovedQuestions()` in `data/exchange.js`).
Submitting a new one (`submitQuestion()`, same file) always lands as
`pending` — there's no separate moderation UI in the game, per the gap
noted above.

**Seed content, so the board isn't empty on day one** — five examples,
actually seeded into `exchange_questions` now, written in the voice of a
first real community, each already shaped right for the table above:

1. *"Six months into a daily sit, and it's gotten boring — is that normal?"* — a
   practice question, the kind Moss or a fellow visitor would actually
   answer honestly rather than reassure.
2. *"Pinned 'Four Weeks with the Breath' on the Course Board — finished it
   today. What's a good next path for someone who liked Anapanasati?"* — a
   real Course-Board win, inviting a recommendation.
3. *"Working through the Tao Te Ching a chapter at a time. Chapter 11 (the
   usefulness of emptiness) stopped me cold — anyone else have a chapter
   that did that?"* — tied directly to a real shelved text.
4. *"Started keeping an Archive Desk entry every evening instead of just
   the planner's ember line. Recommend it — it's a different kind of
   honest."* — a Workshop feature, discussed the way a person actually
   would.
5. *"Is there a good, short introduction to the Eightfold Path anywhere,
   for someone who's never read Buddhist ethics before?"* — a real gap
   this Library doesn't fully close yet (see the café's charter section
   below), posted exactly the way a newcomer would ask it.

None of these need to be literally true — they're seed data shaped like
the real thing, the same role `SEED_LIBRARY`'s first fifteen texts
played for the Library: something worth walking up to on day one,
instead of an empty room waiting for a first visitor to speak first.

**The Steward NPC, for now:** plain scripted dialog, same as Ember/Moss/
Cobalt/Quill today — no live AI required to make the café feel alive.
The design intent: *the café should read as adventure, but run underneath
like an old game* — deterministic, inspectable, no hidden model calls —
right up until a real AI steward is deliberately introduced later. When
that happens, it should follow a written rule set, not a silent system
prompt, in keeping with the Library's own license-everything, hide-nothing
ethos.

**The charter that rule set would encode:** the stated principle is
deliberately liberal and inclusive — anyone has a place in the Pavilion as
long as their conduct holds to the Eightfold Path (right speech, right
action, right livelihood, and so on). That's not a new invented policy;
it's the same ethical spine already sitting on the Theravada shelf. Worth
eventually adding an actual Eightfold Path text to that shelf (there
isn't one yet — the closest today is the Dhammapada/Satipatthana/Metta/
Anapanasati set) so the charter a steward AI follows is itself a document
a player can walk up to and read, the same way the Keep's charter sign
works today.

### The workshop/office — where you do the work

The overworld had a locked "Workshop" building with a sign promising
"eight rooms of craft... opening soon." The first room, the Archive
Desk, is built (see "Where things stand"). Still open: **research/notes**
as a mode distinct from the personal archive (freeform thinking
alongside, not instead of, the Course Board's structured steps) — this
is also where a workshop research-assistant AI (see the AI agents plan
below) would eventually plug in. Seven more rooms are still just the
sign's promise.

### Pathways outward — links, imports, and the Caravan

The Pavilion can only hold so much itself — sooner or later a visitor
needs to leave it: to get a new book, to take an actual MIT OpenCourseWare
class, to bring back something they found elsewhere. Four separate asks
came out of one conversation, related but not the same feature:

1. **Tracking progress on something external.** Built — Course Board
   steps carry an optional `| url` third segment as a "→ visit" link.
2. **Outbound links as a curated commons.** This is the café's job
   (Notice board, Grant desk below) — steward-moderated, gated behind
   Phase 3 since a shared notice board only means something once it's
   shared. The no-backend precursor, **Waypoints**, is built.
3. **Mass import of books, split by whose commons it lands in.** Into
   your own Archive Desk — built, safe to automate freely (your device,
   your data). Into the shared Library (`SEED_LIBRARY`) — deliberately
   **never automatable**. The Library's whole identity is "what is it,
   where's it from, what license, checked by a person," same discipline
   as café links; a pipeline that mass-writes into the commons without a
   human looking at each entry undoes the one thing that makes it
   trustworthy. Keep this manual, always.
4. **"Animated web scraping," reframed as named connectors, not a
   scraper.** A browser page can't fetch arbitrary third-party sites
   (CORS) — what works without a backend is a short, named, hand-vetted
   list of connectors (one per allowed source: Project Gutenberg,
   Standard Ebooks, archive.org, SuttaCentral's API), each landing in a
   review queue (your own Archive Desk, or a `status: pending` steward
   queue for the shared Library) — never straight onto a shelf unseen.
   **The first connector is built:** `tools/caravan/gutenberg.py`, a
   standalone Python script (stdlib only) that fetches a Project
   Gutenberg book by ID, strips its boilerplate, and writes a file
   shaped for the Archive Desk's bulk import — verified end-to-end
   against a real book. Not yet wired to Cobalt or any in-game animation
   — today it's exactly what it says, a script you run locally. A second
   connector (Standard Ebooks, archive.org, SuttaCentral) is the same
   pattern, not new plumbing, whenever it's wanted.

Still open: a second Caravan connector; the shared café-side pieces,
which wait for Phase 3.

### Growing the Library — a sourcing backlog and a real promotion pipeline (2026-07-07)

"Get more books" and "organize them" turn out to be one problem with two
open seams, not a vague todo: the Caravan's two existing scripts
(`gutenberg.py`, `library-draft.py`) don't actually chain into each other
yet, and the last mile — folding a finished `library-drafts/*.md` into
the Library — is still "ask me to do it by hand." Neither gap is big;
both are worth closing before the backlog below grows past what
hand-copying can keep up with.

**The seam between the two existing scripts.** `gutenberg.py <id>`
fetches a book, strips the Gutenberg header/footer, and writes a JSON
file shaped for the Archive Desk's bulk import (`{title, license,
source, body}`) — by the time that JSON exists, the original
`Title:`/`Author:` lines `library-draft.py` looks for have already been
stripped out of `body`. Feeding that JSON's text back into
`library-draft.py` (which expects a raw `.txt` with those header lines
still present) silently loses title/author autodetection — the two
scripts were each built to work, but never actually run one after the
other. Small, mechanical fix: give `gutenberg.py` a `--for-library` flag
that, instead of (or alongside) the bulk-import JSON, writes
`library-sources/<slug>.txt` with a `Title:`/`Author:` line re-prepended
to the stripped body — so `gutenberg.py <id> --for-library` →
`library-draft.py library-sources/<slug>.txt` chains with zero manual
copy-paste, matching the two-step flow `library-drafts/README.md`
already documents.

**The last mile: `promote-draft.py`, replacing "ask me to fold it in."**
Once a draft's `TODO`s are actually filled in, step 4 of
`library-drafts/README.md` is still a person hand-typing a new object
into `seed.js`. A script can do the mechanical part while keeping the
one check that has to stay human — that license and tradition are real,
not still `TODO`:

```python
# tools/caravan/promote-draft.py — sketch, not yet built
# python tools/caravan/promote-draft.py library-drafts/lieh-tzu.md
#
# 1. Parse the completed draft (title/tradition/license/source/attribution/
#    summary/sections) out of its Markdown shape.
# 2. Refuse to run if license or tradition is still literally "TODO" —
#    the one non-negotiable check the Review Queue already states in-game.
# 3. Default target: append a formatted object to RAW_SEED_LIBRARY in
#    src/game/data/seed.js, in the same shape every hand-added entry uses.
# 4. Once Phase 3 exists (SUPABASE_URL/SUPABASE_KEY set): insert a row into
#    `library_documents` instead, over the REST API — same script, a second
#    target, no new design; matches the two-adapter shape Store/SupabaseAdapter
#    already uses elsewhere in this project.
# 5. Move the finished draft to library-drafts/done/<slug>.md so the staging
#    folder only ever holds work actually in progress.
```

This keeps the one rule that actually matters — a person reads the
source and writes the real summary, and a person decided the license is
clean — while removing the copy-paste step around it, the same
"automate the mechanical part, never the judgment call" line already
drawn for the Steward Review Queue and the Caravan connectors generally.

**A concrete backlog, not just an empty folder.** Four real, checked
candidates — public domain, from sources this project already trusts,
chosen specifically to not duplicate what's already on a shelf (the
current 16-text catalog lives in `seed.js` — four Theravada suttas, four
Mahayana texts, four Daoism texts, four Practice/house texts):

- **Theravada** — *SN 45.8, the Vibhaṅga Sutta ("An Analysis of the
  Path")*, [SuttaCentral](https://suttacentral.net/sn45.8), the same
  source and CC0-style licensing as the four suttas already shelved.
  This is the actual Eightfold Path text the café section above already
  flags as a real gap ("the closest today is the
  Dhammapada/Satipatthana/Metta/Anapanasati set") — closing it here
  means the café's charter can eventually point at a real,
  walk-up-readable shelf text instead of an assertion.
- **Mahayana** — *The Lotus Sutra* (tr. H. Kern, Sacred Books of the
  East vol. 21), sacred-texts.com, public domain. The current four
  Mahayana texts lean Madhyamaka/Zen/Dzogchen (Heart Sutra, Diamond
  Sutra, the Bodhicaryavatara, the Dzogchen note) with nothing from the
  Pure Land / major-sutra side of the tradition — this is the single
  most obvious gap.
- **Mahayana** — *The Lankavatara Sutra* (tr. D.T. Suzuki, 1932),
  [archive.org](https://archive.org/details/in.ernet.dli.2015.283028),
  public domain — the foundational Yogacara/early-Zen source text,
  again a different corner of Mahayana than what's shelved today.
- **Daoism** — *Taoist Teachings from the Book of Lieh-Tzu* (tr. Lionel
  Giles, 1912), [sacred-texts.com](https://sacred-texts.com/tao/tt/index.htm),
  public domain (pre-1931). The Zhuangzi and Tao Te Ching are both
  shelved; Liezi is the third of the three classical Daoist texts and
  isn't yet.

Each of these still needs the same discipline as every text on the
shelf today — actually open the source, confirm the exact edition and
license line, and write the summary/sections in your own words. This
list exists so the next Caravan session starts with "go read and draft
these four," not "figure out what to even look for."

**Where this leaves the Practice shelf:** unlike the other three,
Practice is the Pavilion's own writing (the steward's notes, the
logbook, "How This Library Works") — nothing to source externally
there; it grows from the Archive Desk and the Steward Review Queue, not
the Caravan.

### Streamlining the Library's front end — a two-track plan (2026-07-07)

The backlog above adds books; this is the other half — the Library's UI
(`openIndex`/`renderIndex`/`renderShelf` in `ui/overlays.js`) was built
and verified against 15-16 texts and hasn't been revisited since. None
of it is broken today, but a few real seams will start to show the
moment the backlog above actually lands. Split into what's a
straightforward front-end build (mine to do) and what's worth actually
learning by doing (the user's side), so both tracks move at once instead
of one waiting on the other.

**Track 1 — front-end work, ready to build now:**

1. **A real search box in the Index.** `renderIndex()` today only
   filters by one category button at a time (`state.indexCategory`) —
   there's no way to type "lieh" or "eightfold" and jump straight to a
   text. A small `<input>` above the category row, filtering `indexItems()`
   by title + summary text client-side (everything's already in memory,
   no query needed), collapsing the category filter while a search term
   is active. The single highest-value addition here — this is the thing
   that actually matters once the shelf count roughly doubles.
2. **A "new" marker on freshly-promoted texts.** Add an `added` (date)
   field to each `seed.js` entry — `promote-draft.py` (sketched above)
   would stamp it automatically — and show a small "NEW" tag on both the
   shelf spine (`renderShelf`) and the Index card for anything added in
   the last ~14 days. Makes the sourcing work above actually visible
   in-world, not just in a commit log.
3. **Shelf-case scaling check.** `renderShelf` renders every spine in one
   row (`hue+i*4` stepping per spine) with no scroll handling — fine at
   4 texts per shelf, untested past that. Once Theravada gains its 5th
   text (the Eightfold Path sutta above) and Mahayana its 6th, this needs
   an actual look: either the CSS already wraps gracefully, or `shelfCase`
   needs `overflow-x:auto` and a scroll hint. Small, but worth catching
   before it's a visibly cramped shelf rather than a hypothetical one.
4. **License visible everywhere in the Index, not just on the shelf.**
   `renderIndex`'s cards show `sub` (tradition for library docs, license
   for archive docs) but not license for library docs specifically —
   `renderShelf` already shows a license badge; the Index should match,
   so "what is it, where's it from" holds at the all-texts view too, not
   only per-shelf.

None of these four touch `Store`, `data`, or persistence — they're pure
`ui/overlays.js` + `style.css` changes, independently shippable, and
safe to build in any order without waiting on the library-growth or
Supabase work above.

**Track 2 — worth learning by actually doing, not just reading about:**

1. **Deploy the current build.** Still the single most valuable thing
   left undone in this whole project (see "Running it," above) — a
   Vercel or Netlify account, `npm run build`, point it at `dist/`. Real,
   fifteen-minutes-once-you-do-it work, and it's the thing every other
   plan on this page (café, Supabase, "other people visiting") actually
   depends on existing first.
2. **Run the Caravan pipeline on one real book, start to finish.** Pick
   one of the four backlog candidates above, actually fetch it (Gutenberg
   script or a direct sacred-texts.com/archive.org save), run
   `library-draft.py` on it, and fill in the draft by hand — title,
   license, tradition, and a summary written from actually having read
   some of it. This is Stage 9 of `LEARNING-PATH.md` (scraping ethics)
   made concrete, plus the actual editorial judgment call ("is this
   license really clean") that no script should ever make for you.
3. **Create the Supabase project now, ahead of writing any adapter
   code.** `supabase.com` → new project → look at the SQL editor, the
   table view, the auto-generated API docs. Nothing to build yet — just
   getting comfortable with what "a hosted Postgres database with an
   auto-generated API" actually looks like before Phase 3 asks you to
   reason about `SupabaseAdapter` and row-level security policies at the
   same time you're still learning what a table even is.
4. **`LEARNING-PATH.md` Stage 7 (system design), at whatever pace.** Not
   urgent, but it's the "months not an afternoon" list — worth picking
   one term a week rather than saving it for a day that never comes.

**Suggested pairing:** work Track 2 item 1 (deploy) and item 2 (one real
book through the pipeline) first — both are self-contained, both
produce something real you can point at, and neither blocks on me. I'll
start on Track 1 item 1 (the Index search box) whenever you say go,
since it's the smallest, most self-contained front-end piece and the one
most worth having before the shelf count grows any further.

### AI agents as residents — local-first integration plan (2026-07-07)

Every NPC already has an "· X Agent" identity and a personality in their
dialog. The natural first step isn't a generic chatbot bolted on — it's
giving one existing NPC (Quill, the Librarian, is the obvious first
candidate given the Library is the most built-out room) a real backing
agent that can actually answer questions about the shelved texts, instead
of two fixed lines of dialog. Scaling to "agents as community members" in
the café/workshop comes after that's proven out once, not before.

**The goal:** people should be able to use *their own* AI — running on
their own machine, under their own control — to have Quill (and later,
other residents) actually answer questions, help plan a day, or do
research, rather than everyone depending on one central, costly, and
privacy-losing API key. The first target user is you, running this
locally; "anyone can bring their own AI" is the same mechanism, just
opened up once it works for one person.

**Why local-first, and why Ollama specifically:** [Ollama](https://ollama.com)
is a free, open-source program that runs language models entirely on your
own computer — nothing you type is sent anywhere. It exposes a small HTTP
server on `localhost:11434` that any local web page (including this game,
running via `npm run dev`) can talk to directly, no API key and no cloud
account required. That matches the Store adapter's own philosophy: local
by default, with a real network backend as a later, opt-in upgrade — same
shape, one more seam.

**The adapter contract** — same pattern as `Store`, so it plugs into the
existing architecture the same way everything else does:

```js
AIProvider = {
  name: string,                        // shown in a status indicator
  isAvailable() -> Promise<boolean>,   // quick ping, times out fast
  chat(messages, opts) -> Promise<string>,
}
```

- **`NoProvider`** (today's behavior) — the current scripted two-line
  dialog. Always "available," zero setup, zero cost. This stays the
  permanent fallback: if no local AI is running, nothing breaks, NPCs
  just talk the way they do today.
- **`OllamaProvider`** (first one built) — `POST http://localhost:11434/api/chat`.
  `isAvailable()` pings `GET /api/tags` with a short timeout so a missing
  Ollama install never hangs or breaks the page load.
- **Later, optional:** an `LMStudioProvider` (LM Studio exposes an
  OpenAI-compatible local server on `localhost:1234` — some people prefer
  its GUI to Ollama's CLI; same contract, different URL) and, further out,
  a BYOK cloud provider (Anthropic/OpenAI API keys). Cloud is deliberately
  last: direct browser calls to those APIs generally hit CORS and expose
  the key client-side, so it needs either a small proxy or Phase 3's
  backend — a harder problem than local, and not what was asked for now.

**Where it plugs in, concretely:**

1. **Quill first.** When an `AIProvider` is available, facing Quill and
   pressing `E` offers a chat option alongside (or instead of) the fixed
   dialog. Quill's system prompt is grounded in the actual shelved
   documents — fed the `title`/`summary`/`tradition` of everything in
   `SEED_LIBRARY` (or just the current shelf, to keep the prompt small)
   — and instructed to only speak about what's really on the shelves, and
   to name the source document when it draws from one. No inventing texts
   that aren't there.
2. **The workshop's research assistant**, once that room exists — same
   provider, a different system prompt suited to "help me think through
   this," not "answer from the shelves."
3. **The café's steward**, once that room exists — same provider again,
   grounded in the Eightfold Path charter discussed below, and in whatever
   is actually on the notice board.

**The charter/rules the AI follows should be a real, versioned, readable
document — not a hidden system prompt.** This lives in code as something
like `data/charter.js`, and the intent is for it to eventually be a text a
player can walk up to and read in-world, the same way the Keep's charter
sign works today. Per the standing decision on the café's moderation
model: liberal and inclusive by default, with the Eightfold Path (right
speech, right action, right livelihood, and so on) as the actual bar for
conduct — not an invented rule, the same ethical spine already sitting on
the Theravada shelf.

**Status/privacy indicator:** mirrors the Store's existing "Saving to
this device" vs "Preview mode" text under the title screen. Something
like "○ No local AI detected — NPCs use scripted dialog" vs "● Connected
to Ollama · llama3.2" — checked once on load via `isAvailable()`, and the
game works identically either way. The point of surfacing this plainly:
a player should always know whether their words are going anywhere.

**Long-term memory, so an agent actually remembers you — built.** A
single chat exchange is stateless by default, so `data.agentMemory.quill`
is a short (20-entry capped), plain-text, third-person list of what
you've asked ("this visitor asked about the Metta Sutta"), written
through the normal `Store`/`persist()` path and folded back into Quill's
system prompt on later visits. Deliberately not a full transcript or a
vector database — cheap, human-readable, small enough to paste straight
into a prompt; embeddings are a real upgrade path once a plain list
stops fitting.

**A formal report + metadata, human-in-the-loop — built.** "📜 Ask Quill
for a memory report" (in the Archive Desk) writes a real document —
prose in Quill's voice, reusing the Library's own book-reader UI — plus
structured metadata: a note count, date range, and a per-question
`keep`/`summarize`/`let go` suggestion. The agent proposes; the user
reads the suggestions and decides. Never auto-deleted.

**Reframed as a "Lineage Journal," not continuity of self** — the
user's own framing: not "Quill remembers you" as one continuous mind,
but closer to *50 First Dates* — each conversation is genuinely new to
the agent, but it leaves a journal behind for whoever comes next (a
future instance of itself, or eventually a different agent) so what was
learned isn't lost, even though the one who learned it is. This is why
`agentMemory` is written in third person/documentary style, and why the
report hands the human a suggestion instead of deciding — a journal that
outlives its author needs a living reader to curate it. Same impermanence
as the Keep's charter ("everything turns to sand — so give it away
first"), one layer deeper. **Name it the Lineage Journal**, not "agent
notes," once the shared commons below actually gets built — the name
should carry that no entry claims to still be someone's live memory,
only a note passed down.

**A commons for agents to share notes, not just remember privately:**
The same "no gate" instinct the Library applies to human texts, applied
to the agents themselves — not only does Quill remember *you*, residents
can leave notes for each other.

- This piece genuinely needs Phase 3's network backend — a shared
  notebook only means something if it's actually shared across sessions
  and people, so it belongs alongside the café's Supabase-backed notice
  board, not before it. Nothing to build here until that lands.
- Sketch: an `agent_notes` table — `agent` (which resident wrote it, e.g.
  `"quill"`), `note`, `created_at` — held to the same `license`/`steward`
  review discipline already decided for café links, so agent-to-agent
  notes don't quietly become an unmoderated firehose.
- Likely its own café station (a second board, written by residents
  rather than people) rather than folded into the human notice board —
  keeps "notes from people" and "notes from agents" legible as two
  different things. Worth deciding for real once the café is underway,
  not now.

**Build order — done through step 9:** provider contract + `NoProvider` +
swappable connections model; `OllamaProvider` (with the `think:false`/
`num_predict`/timeout guards the "thinking model" gotcha above needs);
the status indicator; a real chat UI on Quill; `data/charter.js`; a full
Connections panel (`⚙ Manage AI connections` — add/enable/disable/remove,
Ollama-style or OpenAI-compatible, `detectAI()` uses the first reachable
one); a second resident, **the Mountain Monk**, seated at `(6,6)` as a
scripted placeholder (`ai:false`) until his original persona text is
supplied — same `ai:true` pattern as Quill once it is, not new plumbing;
per-agent long-term memory; the report/metadata generator. **Still open
(step 10):** extend to the workshop/café once those rooms exist; once
Phase 3 is live, build the agent-notes commons alongside the café's
notice board.

### Giving AI agents a real body — access, not just a mouth

Everything above lets an agent *answer questions*. This is a different
ask: could an AI agent actually *move around and act* in the Pavilion —
walk to the pond, read a shelf, write in its own Archive Desk — the same
way a person does, not through a special back door? This is the concrete
mechanism behind two things already in the hopes-and-dreams list above —
**"a society, not a save file"** (residents who keep acting while the tab
is closed) and **"an agent with real hands, not just a mouth"** (Cobalt
actually doing the following-up he talks about) — so it's worth treating
as a real, if unscoped, build question rather than a novelty.

**Two shapes this could take, and they're not equally good ideas:**

- **Pixel-level "computer use"** — an agent gets a screenshot of the
  canvas, decides "press ArrowUp" or "click at (x, y)," something
  executes that as a real keyboard/mouse event, loop repeats. This is
  literally how this session's own Playwright verification passes
  worked (a script decided what to press, watched the result, adjusted)
  — so it's already proven *possible* today with zero new game code.
  It's the most "authentic" option — the agent experiences the game
  exactly as a person would, no special access — but it's expensive
  (a vision-capable model call every tick) and slow, which matters a lot
  if the goal is a resident that acts continuously in the background,
  not a one-off demo.
- **A programmatic action API** — a small, explicit contract exposing
  the same *verbs* a person has (`moveTo`, `face`, `interact`,
  `say`, `readDoc`, `pinCourse`, …) that call directly into `state`/
  `data`, the same way `main.js`'s `onAction()` already does today,
  skipping pixel/DOM simulation entirely. Same shape as the `Store` and
  `AIProvider` adapters already in this codebase: a small seam, not a
  new subsystem. Far cheaper to run continuously, and — this is the
  actual argument for it over computer-use — an agent reasoning about
  "call `interact()` while facing the Archive Desk" is a much more
  reliable signal than an agent reasoning about which pixels to click.

**Recommendation:** build the action API first; keep computer-use as a
nice validation layer (a way to *prove* an ordinary AI agent, with no
special access, can also play it like a person — worth doing once, not
worth it as the everyday mechanism). This is the same "no gate, but a
real seam" instinct as everything else here — the action API is exactly
what a computer-use agent would end up calling indirectly anyway, just
without paying for a screenshot and a vision call on every tick.

**The real open question, and it's a design decision for the user, not
a technical one:** does an agent-controlled resident get **its own
character** in the world — a new, distinct entity walking around,
observable by whoever's actually playing, alongside Ember/Moss/Cobalt/
Quill — or does it **take over the human's own player character** for a
stretch (more like a remote-hands session)? The hopes-and-dream framing
("Ember still filing, Moss still witnessing, Quill still tending the
shelves, on their own clock") points at the first: agents as *additional*
residents with their own agency, not a replacement for the human's own
avatar. That also happens to be the only version that doesn't need
solving "whose save is this" — an agent-controlled resident acting
through the action API can read/write its own slice of `data` (its own
Archive Desk docs, its own course pins) the same way a second human
player eventually would once federation is real.

**Answered by the user (2026-07-07):** an agent-controlled resident can
have its own body, but that body should be **tied to a sponsoring
user** — unless the Pavilion itself is willing to formally adopt
responsibility for it. In practice, that means every agent-controlled
character carries an owner field (`sponsoredBy: <user>`), the same way
a `Store`/save is scoped to one visitor's device today — an agent isn't
an anonymous, free-floating resident by default, it's *someone's* guest,
accountable to whoever invited it in. The Pavilion adopting an agent
itself (no human sponsor) is a real, distinct tier above that — closer
to how Ember/Moss/Cobalt/Quill already are, in a sense, "adopted by the
Pavilion" as built-in residents rather than any one visitor's guest —
and should stay a deliberate, rare exception, not the default path any
agent can reach on its own. This answers the identity question above
more completely than "does it get its own character" alone did:
**yes, and every one of those characters answers to somebody** — a
visitor, or the Pavilion itself, never no one. Worth carrying straight
into the Charter (`data/charter.js`) once this is actually built: an
agent's allowed *actions*, not just its allowed *speech*, should be
scoped by who it's accountable to.

**Where this plugs into what's already built:**

- **The Activity Log, built the same day this was sketched, is exactly
  the observability layer this needs** — a per-agent-controlled
  resident's actions (walked here, read that, wrote this) would append
  to the same `logActivity()` path already wired into fishing, reading,
  the Archive Desk, courses, and warps, giving a human a legible record
  of what an agent actually did while unattended, instead of a leap of
  faith. This wasn't originally designed with agent-driven play in mind,
  but turns out to be the missing piece for it.
- **The Charter (`data/charter.js`)** already exists as the
  human-readable rule set Quill's *conversation* follows; an
  action-driven agent should follow the same document for what it's
  *allowed to do*, not just what it's allowed to say — e.g. never
  writing to the shared `SEED_LIBRARY`, same boundary already decided
  for the café and the Caravan's book-import connectors.
- **Running it continuously** (the actual "keeps living while the tab's
  closed" dream) needs something outside the browser tab driving the
  loop — a small Node process (using the same plain-data modules,
  `scenes.js`/`entities.js`, that `test/smoke.mjs` already proves can run
  headless with no browser) that an LLM drives one action at a time,
  writing through the same `Store`/`persist()` path so a human's browser
  picks up whatever changed next time they open the tab. This is a real
  chunk of new infrastructure, not a UI feature — worth its own design
  pass, not a side effect of this one.

**Not built. Not even started.** This is deliberately left as a sketch
with a recommendation and open questions, the same way the café and
Phase 3 were before they had real scope — worth a dedicated planning
session once picked up, since the character-identity question above
changes the shape of everything under it.

### An AI Task Manager — research, lesson plans, book acquisition, and an advisor, unified

The user asked for four capabilities in one breath: research tasks,
lesson-plan/paper generation, book-acquisition management, and an
in-game advisor companion. The single most important design decision
here is recognizing these are **one system wearing four hats**, not
four systems — every one of them is "ask AI something, track that it
happened, keep the result somewhere real," which is already exactly
what the Computer's lesson-plan drafting and Quill's memory report do
today, just never named as a shared pattern. Naming it now, before a
fourth and fifth bespoke version gets built, is the actual point of
this plan.

**The concept: an `AITask`.** One shape, one lifecycle, for all four:

```js
// data.aiTasks = [{
//   id, kind,              // 'research' | 'lesson-plan' | 'book-acquisition' | 'advisor'
//   input,                 // what the visitor asked for
//   status,                // 'running' | 'done' | 'failed'
//   output,                // the reply, once done
//   createdAt,
// }, ...]
```

Research becomes a task whose output is long enough to save as an
Archive Desk doc (`category:'research'` — a slot the category taxonomy
already has and nothing uses yet). A lesson plan is the same task kind
`'lesson-plan'` with a different system prompt, saved as `category:
'ai-written'`. Book acquisition is a task whose *output* is a
suggestion for the Request Board, never a fetch — more on why that
boundary doesn't move, below. An advisor exchange is a task that
doesn't need saving at all, most of the time. One data model, one UI
skeleton, four prompts.

**Solving the actual architecture problem — a task manager that owns
zero circular imports.** Known rough edge #2 above already flags the
`entities.js` / `ui/overlays.js` / `main.js` triangle as fragile, held
together by hoisting rather than by design, and explicitly warns that
adding a fourth circular edge for agent work is the wrong move. A Task
Manager is exactly that fourth edge waiting to happen — unless it's
built as a **leaf module that never imports from any of the three**,
receiving what it needs as an explicit context object instead:

```js
// src/game/ai/taskManager.js — imports ONLY from ai/provider.js.
// Never imports entities.js, ui/overlays.js, or main.js — everything
// it needs arrives through `ctx`, passed in by whoever calls it.
import { AI } from './provider.js';

const TASK_KINDS = {
  research: {
    docCategory: 'research',
    systemPrompt: (ctx) => `${ctx.charter}\n\nYou are a research assistant in the Sand `
      +`Pavilion. Write a grounded, well-organized answer to the visitor's research `
      +`question — cite specifics, don't pad length for its own sake.`,
  },
  'lesson-plan': {
    docCategory: 'ai-written',
    systemPrompt: (ctx) => `${ctx.charter}\n\nYou help draft lesson plans from a rough idea `
      +`or theme. Return a short, usable structure: objective, activities, a way to check `
      +`understanding.`,
  },
  'book-acquisition': {
    docCategory: null, // never saved as a doc — it becomes a Request Board suggestion, not a shelf entry
    systemPrompt: (ctx) => `${ctx.charter}\n\nSuggest 1-3 real, findable, public-domain books `
      +`matching the visitor's request — note likely source (Project Gutenberg, Standard `
      +`Ebooks, archive.org) and which existing shelf tradition it might fit. You are `
      +`suggesting, not adding anything — nothing you say here reaches a shelf on its own.`,
  },
  advisor: {
    docCategory: null,
    systemPrompt: (ctx) => `${ctx.charter}\n\nYou are a general advisor and thinking partner `
      +`in the Sand Pavilion, available wherever the visitor is — not tied to the Library's `
      +`shelves the way Quill is.`,
  },
};

export async function runTask(kind, input, ctx){
  const spec = TASK_KINDS[kind];
  const task = { id:ctx.now(), kind, input, status:'running', output:null, createdAt:ctx.today() };
  ctx.tasks.unshift(task);
  ctx.onUpdate(task);
  try{
    task.output = await AI.chat([
      { role:'system', content:spec.systemPrompt(ctx) },
      { role:'user', content:input },
    ]);
    task.status='done';
  }catch(e){
    task.status='failed';
  }
  ctx.onUpdate(task);
  return task;
}
export function taskSpec(kind){ return TASK_KINDS[kind]; }
```

`ui/overlays.js` — which already owns `state`/`data`/the DOM — is the
*only* place that builds the context object and calls in:

```js
// ui/overlays.js — the caller assembles ctx; taskManager.js never
// reaches for entities.js or the DOM itself.
import { runTask, taskSpec } from '../ai/taskManager.js';

async function submitTask(kind, input){
  const ctx = {
    tasks: data.aiTasks, charter: CHARTER,
    now: () => Date.now(), today: todayKey,
    onUpdate: () => renderTaskPanel(),
  };
  const task = await submitTask_inner(kind, input, ctx); // = runTask(kind, input, ctx)
  persist(); logActivity('Ran an AI task: '+kind);
  const cat = taskSpec(kind).docCategory;
  if(cat && task.status==='done'){
    // same createArchiveDoc-shaped write every other feature already uses
    data.workshop.docs.unshift({ slug:slugify(kind+'-'+task.id), title:input.slice(0,60),
      license:'personal record', source:'AI Task Manager', body:task.output,
      created:todayKey(), category:cat });
    persist();
  }
}
```

This is a real, not cosmetic, improvement over the existing pattern —
`taskManager.js` can be unit-tested with a fake `ctx` and no DOM, no
`entities.js`, no circular anything. Worth treating as the template for
future subsystems generally, not a one-off just for this feature.

**Book acquisition specifically — the AI suggests, the Request Board
still just queues, the human still runs the Caravan by hand.** This is
the one place worth being extra explicit: nothing above changes the
standing rule that the shared Library is never auto-filled. The
`'book-acquisition'` task kind only ever produces a *suggestion* —
concretely, "Ask the Computer" on the Request Board could pass whatever
the visitor typed as `input`, get back real candidate titles, and
pre-fill the "Request a book" form for a human to review and submit,
exactly like typing it in by hand would have been, just with better
starting suggestions. It never calls the Caravan script itself.

**The advisor companion — two different features hiding under one
name, worth telling apart before building either.** "An advisor you
walk up to and ask" is what the Computer already is, and what the
`advisor` task kind above formalizes — buildable now, cheaply. "An
advisor that follows you around as a body" is the *bigger* idea already
sketched in "Giving AI agents a real body" above, complete with its own
unresolved character-identity and `sponsoredBy` questions. Don't let the
word "companion" quietly smuggle the harder feature in under the easier
one's cost estimate — build the desk-bound advisor now; treat the
roaming one as the same open question it already was.

**A Task Manager panel — one overlay, not four.** Reachable from the
Computer (and maybe eventually the Request Board): a type selector
(Research / Lesson Plan / Book idea / Ask the Advisor), an input box,
and a history list reusing the exact card style every other panel here
already uses. Not sketched in full since it's a straightforward
extension of the Computer's existing render function once `taskManager.js`
exists — the interesting design work was the model above, not the markup.

**Backend adapters — what actually changes when Phase 3 arrives, and
what doesn't.** This is the part worth getting right *before* writing
Supabase code, because the existing `Store` contract has a property
that will not survive a naive port:

```js
// TODAY — src/game/data/store.js — synchronous, and entities.js
// depends on that synchronicity at module load:
export const data = Object.assign(freshData(), Store.load() || {});
```

`Store.load()` returns a value immediately, right now, in the same tick
`entities.js` finishes loading — every other module that imports `data`
assumes it's already fully populated. A `SupabaseAdapter` is
*necessarily* asynchronous (a network round-trip cannot return a value
synchronously) — swapping it in without changing anything else breaks
this exact assumption, silently, the first time `data` is read before
the network reply arrives. This is the real migration cost, not the
four-function contract itself, which barely changes:

```js
// PHASE 3 — src/game/data/supabaseAdapter.js
// Same four-function contract as Store, network instead of disk.
// Note listDocs/getDoc actually await and unwrap {data,error} — the
// dev-log-2026-07-06 sketch this builds on returned the raw query
// builder result, which isn't awaited data; worth fixing here, not
// carrying the bug forward.
export function makeSupabaseAdapter(client, userId){
  return {
    mode: 'network',
    async load(){
      const { data, error } = await client.from('user_saves').select('blob').eq('user_id', userId).single();
      return error ? null : data?.blob ?? null;
    },
    async save(saveData){
      const { error } = await client.from('user_saves').upsert({ user_id:userId, blob:saveData });
      return !error;
    },
    async listDocs(tradition){
      const { data, error } = await client.from('library_documents').select('*').eq('tradition', tradition);
      return error ? [] : data;
    },
    async getDoc(slug){
      const { data, error } = await client.from('library_documents').select('*').eq('slug', slug).single();
      return error ? null : data;
    },
  };
}
```

```js
// entities.js — the actual shape of the fix. freshData() stays
// synchronous; loading becomes an explicit async boot step instead of
// a top-level assignment, and main.js waits for it before its first
// render instead of assuming `data` is ready the instant the module runs.
export const data = freshData();
export async function boot(){
  const loaded = await Store.load();
  if(loaded) Object.assign(data, loaded);
  restorePosition(); // the pos-restore logic already in entities.js today, just moved out of top-level
}
```

`main.js` changes from "start the render loop" to "await `boot()`, *then*
start the render loop" — a real, if small, restructuring, and it's the
one piece of this whole plan that touches every module rather than just
adding a new leaf one. `localStorage`'s `Store` can stay perfectly
synchronous forever (it's local disk, no real reason to make it async
just for symmetry) — the honest fix is giving `Store`'s *contract* a
documented "may return a promise" allowance and having `boot()` `await`
it unconditionally (`await Promise.resolve(Store.load())` works
whether `load()` returns a value or a promise), so `LocalAdapter` never
has to change at all, only how it's *called*.

**Proposed build order:**
1. `ai/taskManager.js` + `data.aiTasks`, wired to the Computer's existing
   UI first (research + lesson-plan kinds only — no new panel yet).
2. A dedicated Task Manager panel replacing the Computer's single-purpose
   view, adding the book-acquisition and advisor kinds.
3. Wire book-acquisition suggestions into the Request Board's "Add
   request" form as pre-fill, not auto-submit.
4. The `boot()` restructuring above — worth doing as its own change,
   deliberately *before* Phase 3 actually needs it, so the async
   boundary is proven with the existing `LocalAdapter` first rather
   than debugged for the first time at the same moment a real network
   adapter is also new.
5. `SupabaseAdapter` itself, once Phase 3 is actually underway.

### The Steward Review Queue — the "pull request" for the shared Library — BUILT

The user's own instinct, confirmed and built the same day: once other
people exist, book-acquisition candidates and community-written
commentary shouldn't touch the shared Library directly — they should
queue for a steward (the user, today) to actually look at, the same
`status:pending` → `approved` shape already decided for the café's
links. **Built single-steward-first, since only one user exists right
now** — the workflow is real, just not yet multi-user:

- **Two ways something reaches the queue:** an Archive Desk entry ("📤
  Submit for Library review" in the reader), or a batch pasted straight
  from the Caravan connector's output — both land `pending`, in
  `data.reviewQueue`, never on a shelf.
- **The one non-negotiable review criterion, stated plainly in the
  panel itself:** is the license actually clear — public domain, or
  something with real permission — with no open legal question? Every
  other judgment ("does this fit the Library") is a real editorial call;
  that one isn't optional.
- **Approving doesn't write to `seed.js` by itself.** It marks the item
  `approved`; a separate "📋 Generate batch" step combines *every*
  currently-approved item into one paste-ready snippet, so the Library
  grows in occasional deliberate batches — one commit, one review pass
  — rather than a commit per text. "Mark this batch as done" clears the
  approved items once they're actually pasted in.
- **What "book acquisition management" concretely means today:** the
  Request Board (a personal wishlist) and this queue (a review
  checkpoint) are two different, adjacent tools — a request becoming a
  real candidate still means someone runs the Caravan and pastes the
  result in here, by hand, for review. Nothing was added that makes
  fetching more automatic; what was added makes *reviewing* real instead
  of "trust me, I checked."
- **The bigger vision behind this, stated by the user:** fill the
  Library's classical-text corpus mostly by hand/Caravan first, then
  let other people's main contribution be *their own* commentary and
  research — "their own thoughts on the Dao" — flowing through this
  same queue as `origin:'archive'` submissions, not more raw scraped
  primary texts. The `research`/`personal` categories already in the
  taxonomy exist for exactly this.
- **What changes at Phase 3, and what doesn't:** `reviewQueue` becomes a
  real table instead of a local array, `submittedBy` starts meaning
  something across real users, and multiple stewards can share one
  queue instead of one person seeing everything. The shape — pending,
  reviewed, approved, batched — doesn't change; only what's underneath
  it does. Worth deciding, once there's more than one steward, whether
  approval needs to become semi-automatic (light checks pre-filtering
  what a human sees) — deliberately not solved now, since one steward
  reviewing sixteen texts and one user's own submissions doesn't need it
  yet, and building it before it's needed risks solving the wrong
  problem.

### External tile-map JSON

Still just the one-line sketch it always was: load `/maps/grounds.json`
(a Tiled export or similar) instead of `buildOverworld()`'s procedural
generation, so the world can be *painted*, not coded. Lower priority than
the two rooms above — worth doing once the café/workshop add enough new
tile types that hand-writing grid code stops being pleasant.

### Three ways to meet the Pavilion — public site, main build, desktop app (sketched 2026-07-07)

The user asked for a plan to turn this into a real public website (working
name **Sand Pavilion v3**), while keeping this repo as "the main Pavilion,"
plus a way to download and run it as one's own desktop app. Three tiers,
and the good news first: **none of them require forking the codebase
today.** All three can be the exact same `dist/` build, aimed at three
different front doors.

**1. The public website ("Sand Pavilion v3").** The honest answer to
"how do we make it lighter for a public site" is: **it mostly already
is.** The current production build is ~75KB of JS and ~9KB of CSS,
gzipped smaller still (see "Running it" above) — that's already a light
website by any normal measure, not something that needs trimming down.
What a public multi-visitor site actually changes isn't the code, it's
the *expectation*: most visitors won't have Ollama running, so the
public framing should lean fully into "this works great with nothing
installed; local AI is a deeper optional layer" — which the README's own
"New here? Start with this" section already does. Concretely:
`npm run build`, deploy `dist/` to Vercel/Netlify/GitHub Pages (the one
step the README has flagged as undone since the very first session),
and each visitor gets their own private save automatically via their own
browser's `localStorage` — no accounts, no backend, no sharing between
visitors yet. That last part is the one real decision: launch v3 with
today's model (everyone gets their own private Grounds, zero backend)
first, and let the café's shared notice board (Phase 3, below) be the
point where visitors actually start seeing each other — don't wait for
Phase 3 to ship the public site, it's not a prerequisite for "everyone
can visit."
**2. "The main Pavilion" — this repo.** Rather than splitting into two
codebases prematurely, treat this repo as *both* the main Pavilion and
the source `v3` gets built from — one codebase, one `dist/`, aimed at
different doors. The reason not to fork yet: two codebases means every
feature gets built (and every bug gets fixed) twice, and nothing about
today's features actually needs to differ between "the version I run
for myself" and "the version a stranger visits." That changes the moment
v3 needs to *diverge* on purpose — e.g. if some experimental room should
stay private to this repo before it's ready for strangers — worth
revisiting then, not now.

**3. A downloadable desktop app.** This is a real, well-trodden path for
a Vite/vanilla-JS site like this one: wrap the same `dist/` build in a
small native shell so someone can download and double-click it, no
`npm`/Node/terminal knowledge required — literally the same thing this
README's beginner on-ramp already does for Ollama, one layer further
in. Two real options, and they're not equivalent:
- **Tauri** — bundles a webview using the OS's own native browser engine
  instead of shipping a full copy of Chromium, so packaged apps run a
  few MB instead of 100+MB and start close to instantly. Fits this
  project's "give it away light" instinct better. The real cost: it's
  built in Rust, so the wrapper layer itself needs a Rust toolchain to
  *build* (not to run — end users never see Rust), which is one more
  new tool for a beginner-learning-as-they-go project to pick up.
- **Electron** — ships its own bundled Chromium, so packages are much
  larger and heavier, but the tooling is older, more documented, and
  more likely to have a Stack-Overflow answer for whatever goes wrong —
  worth real weight given where the user is in the learning curve.

  **Recommendation: start with Tauri if there's appetite to learn one
  more small tool, Electron if the goal is "get a working .exe with the
  least new friction possible."** Either way, the actual integration
  work is small and doesn't touch game code at all — the wrapper just
  points at the existing `dist/` build; `npm run build` stays the one
  source of truth for both the website and the desktop app.

**Not built. Not even scaffolded.** Like the AI-agent-access sketch
above, this is a plan with a recommendation and two real open calls
(when v3 gets a shared backend; Tauri vs. Electron) rather than a
todo list — worth a dedicated session once picked up, starting with
step 1 (it's genuinely one `git init` and one deploy away).

**Is a desktop app actually needed right now? Honestly, no.** This
whole plan was written for the moment this gets handed to *other
people* who don't want to touch a terminal at all — that's not today.
`npm run dev` already works cleanly on this machine (the PowerShell
execution-policy issue is fixed), so the only thing a desktop app would
save right now is "open a terminal and type two commands" — real, but
small, and not worth spending effort on ahead of the café/Supabase work,
which is the thing actually blocked on nothing but time. Worth
revisiting once there's an actual second person waiting to play this
without installing Node.

**The build plan, for whenever that day comes (Electron, the
recommended path for a first attempt — reversing the earlier "start
with Tauri" lean, now that the constraint is "least new friction," not
"smallest package"):**
1. `npm install --save-dev electron`.
2. `electron/main.js` — a `BrowserWindow` loading `dist/index.html`
   (the same build `npm run build` already produces; nothing about the
   game's code changes).
3. Add `"electron": "electron ."` to `package.json`'s scripts; `npm run
   build && npm run electron` opens a real native window, no browser
   chrome, no terminal visible once it's open.
4. Confirm local AI still works from inside it — it should, since
   Electron's renderer is still just a browser context talking to
   `localhost:11434` the same way a normal browser tab does.
5. Only once that's solid: `electron-builder` for a real installer/exe
   — a separate, bigger step with its own real risk of Windows-specific
   packaging issues, worth its own session rather than folding into
   step 1-4's low-risk work.

### Phase 3 — Supabase (prerequisite for the café, useful for the rest)

**What Supabase actually is, in plain terms:** a hosted Postgres
database (a real, industry-standard SQL database, run on someone else's
server instead of your own machine) with a few things bolted on for
free — an auto-generated API so the browser can talk to tables directly
without you writing a backend server, a login/accounts system, and
row-level security (rules like "anyone can read this table, but only a
signed-in steward can insert into that one" — enforced by the database
itself, not by trusting the browser to behave). For this project, it's
the thing that turns "one visitor, one `localStorage` blob" into "many
visitors, one shared Library and café," without writing a traditional
server at all.

**Concrete setup, step by step, when you're ready:**
1. Create a free account at supabase.com, then "New project" — this
   gives you a URL (`https://xxxx.supabase.co`) and an "anon" public API
   key. Both are safe to put in client-side code — row-level security,
   not secrecy, is what protects the data.
2. In the SQL editor, create the tables this needs. The `library_documents`
   table and its policies are already sketched in
   `archive/dev-log-2026-07-06.txt` (part 3) — "anyone can read, only a
   steward can insert" is exactly the Review Queue's rule, just enforced
   by the database instead of by a script. Two more tables complete the
   picture: a `user_saves` table (one row per visitor, a `jsonb` column
   holding the exact same blob `localStorage` holds today — everything
   built this whole session, `badges`/`inventory`/`reviewQueue`/all of
   it, rides along unchanged) and, once the café is underway,
   `exchange_questions` for the notice board.
3. `npm install @supabase/supabase-js`, then implement `SupabaseAdapter`
   — the actual code sketch is already written out in the "AI Task
   Manager" section above (`makeSupabaseAdapter`), including the fix to
   the original dev-log sketch (awaiting and unwrapping `{data,error}`
   properly) and the note about why `Store.load()`'s async boundary is
   the real migration cost, not the four-function contract.
4. Swap `Store` for `SupabaseAdapter` behind a single flag/config value,
   so `LocalAdapter` keeps working for anyone who wants to run this
   fully offline/private — same instinct as `AIProvider`'s local-first
   default.

**What the café specifically needs on top of that:** an `exchange_questions`
table (id, title, body, `status:'pending'|'approved'`, author), a Notice
Board station reading the three most recent approved rows, and a
moderation flow that's *already built* — the Steward Review Queue's
approve/reject pattern is the exact shape café submissions need, just
pointed at a different table once one exists. The Hearth Corner and
Grant Desk are simpler still: mostly static content plus maybe one more
small table later.

**Suggested café build order, concretely:**
1. Stand up the Supabase project and `user_saves`/`library_documents`
   tables; port `Store` to `SupabaseAdapter` and confirm existing
   features (planner, courses, Archive Desk) still work identically
   against the network instead of disk — prove the migration before
   adding anything new.
2. Add `exchange_questions`; build the Notice Board station reading
   approved rows.
3. Reuse the Review Queue's approve/reject UI pattern, pointed at
   `exchange_questions` instead of `reviewQueue` — the workflow already
   exists, this is mostly wiring, not new design.
4. Hearth Corner, Grant Desk — lower-stakes, whenever there's an appetite
   for them.

### Suggested order

1. Deploy the current Vite build (verified deploy-ready — see "Running
   it" above) so persistence, and Quill, are real for people besides you.
2. Close the Caravan pipeline gap (`--for-library` + `promote-draft.py`,
   above) and work through the four-book sourcing backlog — this doesn't
   need Supabase and is safe to do in parallel with anything else here.
3. Stand up Supabase + `SupabaseAdapter` (Phase 3) — the café's notice
   board needs it, and it's better to have one storage migration than two.
4. Build the café's notice board + hearth corner against real (if sparse)
   data.
5. Give the Mountain Monk his real voice once his original persona is
   supplied.
6. Everything else (grant desk, external tile-map JSON, the agent-notes
   commons, more residents, the workshop's remaining seven rooms) after
   that foundation holds.

## Hopes and dreams (wildly speculative — read for fun, not as a promise)

Everything above this line is a real plan. Everything below it is the
two of us, at the end of a long session, refusing to pretend we don't
have bigger dreams than the next commit. None of this is scoped, none of
it is scheduled, and the next person (or the same person, better rested)
should feel entirely free to ignore, steal, or wildly improve on any of
it. Consider this the Pavilion's own attic — not load-bearing, just full
of things too interesting to throw out.

### Intentions — why this exists, stated plainly

Everything else in this document is *how*. This is *why*, written down
on purpose rather than left implicit, because a project this personal
deserves to have its own reasons on record.

**This is meant to be an abundance system, not a scarcity one.** Every
real decision made so far already points this direction, even before
the phrase existed: no gate on the Library, no ledger of debts on the
Keep's charter, no login wall, no tracking, save data that's a file *you*
own. "Abundance" here doesn't mean unlimited or careless — the Library's
whole discipline (license first, source first, one steward's judgment
per text) is exactly what makes giving something away safely *possible*.
An abundance system that hands out things it doesn't actually have the
right to give isn't generous, it's careless with other people's work.
The careful curation and the generosity are the same instinct, not two
competing ones.

**This is meant to uplift, not extract.** The existing hopes-and-dream
bullet about "proof this doesn't have to be extractive" already said
this; worth saying it as an intention rather than a feature pitch. Every
architectural choice that looks like it costs convenience — local AI
instead of one central account, license checked by a human instead of
scraped in bulk, a steward queue instead of instant publishing — is that
principle actually being spent on, not a limitation waiting to be lifted
later.

**This is meant to be a real tool in the user's own life** — for
learning (the whole `LEARNING-PATH.md` curriculum exists because of
this), and for spiritual practice (the Library's actual shelves, the
Writing Desk's daily rhythm blocks, the Course Board's "the walking is
the credential" ethos). Not a demo of what a personal knowledge tool
*could* look like — the actual one, used daily, by the person building
it, which is also why every feature so far has come from a real
question asked in a real conversation rather than a roadmap written in
advance.

**The tension worth naming, not resolving:** "digest the knowledge and
history of humanity" and "review everything a person carefully before
it's trusted" pull in opposite directions — one wants breadth and scale,
the other wants slowness and care. This project bets on the second
every time that choice actually comes up, on purpose, even knowing it
means growing slower than the ambition sounds. That bet is itself part
of the intention, not a compromise of it.

- **A Pavilion, not *the* Pavilion.** Right now this is one world, one
  save file, one visitor. What if anyone could stand up their own
  instance — their own Grounds, their own Library shelves stocked with
  *their* research — and then, optionally, open a gate between two
  Pavilions? Two people's Libraries, briefly one Library. Two Quills,
  comparing shelves. The Keep's charter already says "everything turns to
  sand — so give it away first"; a federated Pavilion is just that
  sentence taking its architecture seriously.
- ~~Residents who remember each other, not just you.~~ **A first, small
  version exists (2026-07-07).** Moss now has one extra scripted line,
  appended only when `data.agentMemory.quill` has an entry: "Quill
  mentioned you'd asked about '…'" — the exact "Moss mentions Quill
  mentioned you asked about the Metta Sutta" moment this bullet always
  imagined, built with zero networking and zero new AI calls, just Moss
  reading data Quill already wrote (`npcLines()` in `main.js`). What's
  still missing, and still the real dream: this only runs one direction
  (Moss reads Quill's memory; Quill doesn't know what Ember or Cobalt
  have seen), it's one hardcoded pairing rather than a real cross-agent
  system, and none of the scripted NPCs (Ember/Cobalt/the Monk) do this
  yet. A real version would need each resident's memory readable by the
  others generally, not one bespoke `if` — worth designing for real once
  a second AI-backed resident (the Monk) exists to make the two-way case
  concrete.
- **The Library grows itself, carefully.** Today the shelves are
  hand-seeded. Imagine a version where Quill can *propose* a new text for
  the shelves after a conversation goes somewhere interesting — subject
  to the exact same steward-review, license-and-source discipline as
  everything else, never auto-published. The Library slowly becoming a
  living thing that grows from real conversations, without ever
  compromising "no gate, but no chaos either."
- **A voice you can actually hear.** Text-to-speech for Quill and
  whoever else joins — not because typing is bad, but because there's
  something to "walk into a quiet library and hear a voice" that a text
  box can't quite do. Local, obviously, same as everything else — your
  own machine doing the speaking, nobody else's server.
- ~~Seasons, weather, a Pavilion that has moods.~~ **Built (2026-07-07)
  — the first hopes-and-dreams item to actually land.** The pond freezes
  in winter (`src/game/season.js`'s `currentSeason()`, read from real
  calendar time, plugged into `render.js` as a `SPAL` palette swap —
  frozen ice tiles with crack lines, grayer grass, bare-ish snow-capped
  trees) and Sagara has an extra grumble line waiting for exactly that
  season (`npcLines()` in `main.js`). The Grounds actually darken at
  night (`isNight()`, a heavier vignette + a cool wash over the outdoor
  scene only). Confirmed none of it touches a mechanic — fishing, tiles,
  collision all behave identically regardless of season/time; only the
  paint changed. Indoor rooms are untouched on purpose (torchlit, not
  weathered). Verified by mocking the system clock into both a
  winter-night and a summer-day session and comparing renders side by
  side.
- **A phone in your pocket, a Pavilion in your hand.** The touch controls
  already exist; a proper mobile-first pass (or an actual small native
  wrapper) would make "open the Library on the bus" a real, comfortable
  thing, not a cramped afterthought.
- **The workshop's writing desk, taken all the way seriously.** Not just
  a nice page-turn animation — real handwriting-style rendering, a pen
  that has weight, paper that yellows slightly the longer an entry sits
  unread. Writing your day down should feel like *writing it down*, not
  filling out a form that happens to look nice.
- **An actual room, somewhere, with this on a wall.** Every version of
  this so far lives inside a browser tab. There's no reason a physical
  space — a real café, a real reading room — couldn't have a screen
  running the Pavilion as its front desk, its guestbook, its notice
  board. The metaphor was always "a place." Nothing says it has to stay
  a metaphor forever.
- **A Pavilion you can carry in a file.** Export your whole save —
  reading, planner history, courses, Archive Desk entries, the lot — as
  a single downloadable JSON file, and import it back on any browser or
  machine. Needs no backend, no account, nothing Phase 3 hasn't already
  earned; it's just `Store.load()`/`Store.save()` pointed at a file
  instead of `localStorage` for one moment. Worth building on its own
  merits (a real backup, a way to move devices) — and it's also the
  honest, no-backend-required first step toward "a Pavilion, not *the*
  Pavilion": before two Pavilions can open a gate between them, one
  Pavilion should be able to leave its own house.
- **Residents who keep a schedule, not just a palette swap.** Seasons and
  night now change how the Grounds *look*; the next layer is residents
  who notice the same clock. Quill closing the Library at a certain hour
  and leaving a note instead of himself; Sagara only really fishing in
  daylight. Nothing structural — the same `isNight()`/`currentSeason()`
  this session added, just read by NPC placement instead of only by
  `render.js`.
- **A soundscape, not just blips.** The tiny procedural-audio engine in
  `main.js` (`blip()`, a few oscillator calls) already gives every
  action a small, honest sound with nothing licensed-in. The natural
  next step isn't music so much as *ambience* built the same
  scrappy way — wind over the Grounds, water at the pond, quieter under
  a roof — generated, not sampled, so it costs nothing and owes no one.
- **A colophon, walk-up-and-readable.** Somewhere in the Keep or the
  Library, a plaque or sign listing everything this place is built
  *from* — Vite, the license of every seed text, the fact that nothing
  here is tracked or sold — in the same voice as the charter sign. The
  Library already insists every text name its source; the game itself
  never has, and the whole project's ethos says it should.
- **Built for everyone, not just the person who can already see and hear
  fine.** No text scaling, no colorblind-safe palette check, no
  remappable keys yet. Not urgent while this is one person's local
  build, but real, and worth doing honestly before "good enough for
  everyone to use" means what it says.
### If this became everything it could be (2026-07-07, asked to go nuts)

Everything above is a room. These are the six that would make the whole
building mean something bigger than itself — written because we were
asked, honestly, what this needs to be a revolutionary achievement, not
just a nice local app. Wilder than anything above, on purpose.

- **A society, not a save file.** Every resident above still waits for
  you — frozen until you walk up and press E. What if the Pavilion kept
  living while the tab was closed? Ember still filing, Moss still
  witnessing, Quill still tending the shelves, on their own clock, so
  that coming back isn't reopening a save, it's *visiting* — the
  difference between a diorama and a place.
- **A protocol, not a product.** Right now "the Sand Pavilion" means
  *this* code, this one save file. The bigger version: a small, open
  spec for what a "Pavilion" *is* — a personal knowledge-commons world,
  license-first, local-first, agent-inhabited — that anyone could
  implement in their own engine, their own art style, their own
  language, and still be able to open a gate to yours. Not a platform
  you join. A shape you can build your own copy of, on purpose, the way
  RSS or email are shapes and not companies.
- **An agent with real hands, not just a mouth.** Cobalt's whole
  personality is already "I follow up until the loop closes." Give him
  actual permission, scoped and revocable, to *do* the following up —
  check a page for you, summarize something you dropped at the
  Workshop, nudge you about a promise you made yourself at the Writing
  Desk. Still local. Still yours. The difference between a chatbot and
  a caravan that actually goes somewhere.
- **Proof, not just a claim, that this doesn't have to be extractive.**
  Every choice so far — local models, no tracking, license on every
  text, save data that's a file you own — has been a design decision.
  Taken all the way, the Pavilion becomes an existence proof: a rich,
  multi-person, AI-mediated commons that never once needed to watch you,
  sell you, or lock your words up to make itself work. Not a pitch.
  A working example sitting right there, in a browser tab, that someone
  can point to.
- **A Library that grows across Pavilions, not just within one.** The
  self-growing Library above (Quill proposing texts, steward-reviewed)
  is one Pavilion learning from one person. Once federation is real, the
  interesting version isn't "sync my shelf" — it's many stewards, many
  Pavilions, each still gatekeeping their own shelf carefully, together
  slowly assembling something bigger than any one of them seeded —
  still no gate, still no chaos, just more hands.
- **The on-ramp this session actually was, generalized.** Tonight was,
  underneath everything, someone going from "I don't know what a
  terminal is" to shipping seasons, a memory model, and a real test
  suite in one sitting — not by reading a manual first, but by wanting
  something in a game enough to learn what stood in the way. The biggest
  version of this project isn't a feature. It's that exact on-ramp, on
  purpose, for anyone who's ever felt locked out of "how this stuff
  actually works" — the Pavilion as proof that the gap between *plays
  games* and *builds them* is a door, not a wall, and it was open the
  whole time.

- **Whatever the next person reading this actually wants.** This list is
  not a ceiling. If you're the next guy (or the same guy, tomorrow) and
  none of this sparks anything — good, write your own attic. The only
  rule that actually matters, the one etched into the Keep, is the one
  worth keeping: *everything turns to sand, so give it away first.*
