# The Sand Pavilion

A small top-down world you can walk around in — a Library with real texts,
a Keep with a charter, a Study where you plan your day, a Workshop for
your own writing and research, a Café that looks outward. It's built like
a game because a game is a good shape for a place, but the actual point
is a commons: things freely given, license and source attached to
everything, nothing gated.

The long-term idea: this becomes a platform where AI agents are
residents, not just flavor text. The NPCs already carry that identity in
their names — Ember · *Archivist Agent*, Moss · *Steward Agent*, Cobalt ·
*Caravan Agent*, Quill · *Librarian Agent*, the Steward — some scripted,
some with real AI voices now. A game that's not a game: an exploratory,
spatial way to move through a personal (and now, partly, shared) body of
data, practice, and writing, rather than a dashboard or a feed.

## New here? Start with this

You don't need to know how to code, use a terminal, or understand what
an "API" is to enjoy the Sand Pavilion. None of that is required to walk
the Grounds, read a book in the Library, plan your day at the Writing
Desk, or fish at the pond. If that's all you want, skip to "Running it"
below and go play — everything past that point is optional.

Connecting your own local AI, so residents can actually talk back, is a
deeper layer with real setup involved (installing a program, typing a
few commands). That's not because you need to be a programmer — it's
because that piece genuinely runs on *your* computer instead of ours,
which is the whole point. The [local AI setup guide](#setting-up-local-ai--a-beginners-guide)
further down is written for someone who has never done anything like
this before, start to finish, with a troubleshooting list at the end.

Two things worth knowing going in:

- **Nothing here can break by clicking around.** Every panel has an Esc
  in the corner. Worst case, you close it and try again.
- **If you want to learn the "why" behind any of this alongside playing**
  — what a terminal actually is, what "local" and "API" mean, how a real
  database works, how this whole thing is built — there's a self-paced
  curriculum for that in [`LEARNING-PATH.md`](LEARNING-PATH.md), built
  around this project itself, plus
  [`API-AI-INTEGRATION-PLAN.md`](API-AI-INTEGRATION-PLAN.md) for the
  same ideas pointed outward at work/desktop AI integration generally.

## Running it

```
npm install
npm run dev       # starts Vite, prints a localhost URL
```

Walk with Arrows/WASD, interact/fish with `E`, close menus with `Esc`.
`Esc` with nothing open — or the `☰` button in the corner — opens a pause
menu. Everything you do saves to `localStorage` automatically; the title
screen tells you whether it's actually persisting.

```
npm run build      # outputs a static site to dist/
npm run preview    # serve that build locally to sanity-check it
npm test           # config sanity check — scenes, warps, seed data (no browser needed)
```

**It's live:** [sandpiviliongame.vercel.app](https://sandpiviliongame.vercel.app)
— deployed via Vercel's GitHub integration, auto-deploys on every push to
`main`. Local AI still works after deployment, since the game always
checks `localhost:11434` from *whoever's browser is currently open*, not
wherever the static files are hosted.

**Phase 3 (Supabase) is live.** Copy `.env.example` to `.env.local` and
fill in `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` from your own
Supabase project to connect the Library, the café, and accounts to a real
database; without it, everything gracefully falls back to local-only
(the Library reads the bundled `seed.js`, the café says plainly that it
needs a connection). See "How it's put together" for what actually moved.

## Features guide — everything, by location

**Anywhere, via the pause menu (`Esc` / `☰`):**
- **👤 Account** — optional. Magic-link sign-in (no password); adds
  cross-device save sync and, for whoever's been hand-granted the role
  in the Supabase dashboard, real steward powers on the café's boards.
- **⚙ Manage AI connections** — see/add/enable/disable AI backends.
- **🔗 Waypoints** — a personal, no-backend link list.
- **📜 Activity Log** — a capped, human-readable record of what you've
  actually done this and past visits.
- **🏅 Badges** — nine first-time-action badges, doubling as a soft
  tutorial.
- **🎒 Inventory** — books you're carrying; read any from anywhere.
- **🛡 Steward Review** — the queue for anything headed toward the
  shared Library; approve/reject, then generate a paste-ready batch.
- **⬇/⬆ Export / Import Save** — your whole save as a real JSON file.
- **⚠ Reset all progress** — behind a confirmation; no undo.

**The Library** (four shelves — Theravada, Mahayana, Daoism, Practice):
face a shelf, `E` to browse spines, `Enter`/`E` to open a book. In the
Reader: **🔊 Read aloud**, **🔊/✨ Summary aloud**, **🎒 Take with you**.
**📑 Full Index** (from any shelf) lists every text — Library and your
own Archive — with a search box and license shown throughout. Quill
himself: face him, `E` — a real chat if AI's connected, scripted lines
otherwise.

**The Keep:** the charter sign, and the Keeper's scripted dialog.

**The Study:**
- **The Writing Desk** — today's intention, seven rhythm blocks, an
  evening ember; **Past days** reads back every prior day kept.
- **The Course Board** — pin a course (steps, optionally a `| url` link),
  toggle progress.
- **The Computer** — an AI planning assistant: day planning, lesson-plan
  drafting, general thinking-through.
- **The Request Board** — a book wishlist feeding the Caravan connector.

**The Workshop:**
- **The Archive Desk** — your own writing, title/license/source/body,
  same shape the Library uses. **+ Write**, **+ Bulk import**, **📜 Ask
  Quill for a memory report**, **📤 Submit for Library review**.
- **The Research Desk** — freeform, ongoing notes per project (not one
  polished page): add notes over as many visits as it takes, ask a
  research-assistant AI grounded in the Library *and* your own notes,
  then **→ Turn into an Archive Desk entry** once it's ready.

**The Café:**
- **The Notice Board** — steward-approved posts from the shared
  community; **+ Post a question** submits your own for review. Stewards
  see a Pending Review section right here, enforced by the database.
- **The Residents' Board** — the agent-notes commons: **📝 Ask Quill** /
  **📝 Ask the Steward** to leave a real, AI-generated note for other
  residents, steward-reviewed the same way.
- **The Steward** — face him, `E` — real AI chat if connected, grounded
  in the charter and the live board.
- **The Hearth Corner** and **The Grant Desk** — low-stakes scripted
  stations.

**The pond:** face water, `E` to cast; ten fish varieties, purely
flavor-text.

## Setting up local AI — a beginner's guide

**This section assumes no prior experience with "local hosting" or APIs.**
Residents can actually talk back — but only once an AI model is running
*on your own computer*. Nothing about this is required to play.

### First, three words worth actually understanding

- **"Localhost" / "local server"** — a small program running *on your own
  machine*, reachable only by you (or things you explicitly allow).
  `localhost` is just the name your computer uses to refer to itself.
- **"API"** — a fixed way of asking a program for something and getting
  an answer back. You'll never write raw API calls yourself; the game
  does that part.
- **"Port"** — a number (like `11434`) saying *which* program on your
  machine to talk to. Ollama picks this by default; you don't choose it.

### Setup, step by step (Windows)

1. **Install Ollama** — [ollama.com](https://ollama.com), or
   `winget install Ollama.Ollama` from PowerShell.
2. **Pull a model:** `ollama pull llama3.2` — fast, beginner-friendly,
   runs fine without a powerful GPU. **Avoid "thinking"/"reasoning"
   models** (`qwen3.5`, `deepseek-r1`, `qwq`) — found the hard way: they
   spend a hidden stretch "reasoning" before answering, which can take
   minutes or come back completely blank. The game guards against this
   where it can, but a plain model sidesteps the problem entirely.
3. **Allow the game to reach Ollama** (a CORS rule browsers enforce):
   ```
   setx OLLAMA_ORIGINS "http://localhost:5173,http://localhost:5174"
   ```
   Close and reopen your terminal after this. Check `npm run dev`'s
   printed port and add it here if different.
4. **Make sure Ollama is running** — check the system tray, or run
   `ollama serve`.
5. **Check it's working:** `curl http://localhost:11434/api/tags` should
   print a wall of text mentioning your model.
6. **Run the game.** Under "Enter the Grounds," a line reports what it
   found: "● Connected to Ollama · llama3.2" or "○ No local AI detected."

### The Connections panel

`⚙ Manage AI connections` (title screen or pause menu) shows live status
per connection, lets you add anything speaking Ollama's API or the more
universal OpenAI-compatible shape (LM Studio, a friend's server), and
disable/remove connections. Everything here stays on this device.

### Troubleshooting

- **"No local AI detected" even though Ollama is running** → almost
  always `OLLAMA_ORIGINS` missing the exact port Vite is using, or
  Ollama not restarted after setting it.
- **A reply took forever or came back blank** → you're on a "thinking"
  model; switch to `llama3.2`.
- **"Connection refused" in `curl` too** → Ollama isn't running.
- **Generally slow** → try a smaller model (`ollama pull llama3.2:1b`).

## How it's put together

```
data/seed.js  →  data/store.js  →  scenes.js  →  entities.js  →  ui/overlays.js  →  render.js  →  main.js
(content)        (persistence)     (world data)  (state+logic)   (DOM panels)       (canvas)      (loop+input, wires it all up)
```

- **`data/store.js`** — `load`/`save`/`reset` (player save data) are
  local-only. `listDocs`/`getDoc`/`allDocs` (the Library) optionally
  mirror `library_documents` from Supabase into memory on load, falling
  back to the bundled `SEED_LIBRARY` if unconfigured or unreachable —
  every call site stays synchronous either way.
- **`data/supabase.js`** — the client, `null` if unconfigured (same
  NoProvider shape as the AI connection). **`data/exchange.js`** (café
  notice board) and **`data/agentNotes.js`** (Residents' Board) are thin
  wrappers around their tables. **`data/auth.js`** — magic-link session
  state + `isSteward()`, backed by a `profiles` table and an
  `is_steward()` check the database itself enforces, not a client flag.
  `entities.js` orchestrates the one thing Store shouldn't own: a
  debounced push to `player_saves` when logged in, and the one real
  user-facing decision (an account already has a save from another
  device) asked plainly, same as Import Save.
- **`scenes.js`** — pure data: tile grids plus arrays of npcs/signs/
  warps/stations. A new room is a `build*()` function plus registering
  it in `scenes`.
- **`entities.js`** — the one mutable `state` object and the one `data`
  object (everything saved), plus world lookups (`tileAt`, `blocked`, …).
- **`ui/overlays.js`** — the only place touching DOM overlay panels;
  `CHAT_AGENTS` is the small registry powering every AI-backed NPC (Quill,
  the Steward, and the Research Desk's assistant) from one shared chat
  function instead of one-off code per resident.
- **`render.js`** — owns the `<canvas>`, reads state, never mutates it.
- **`main.js`** — the `requestAnimationFrame` loop, input, audio.

**Known rough edges** (real, not urgent): inline `onclick` + a manual
`Object.assign(window,{...})` list means a forgotten export is a silent
dead button; `entities.js`/`ui/overlays.js`/`main.js` import each other
in a circle (works today because cross-module references are hoisted
`function` declarations — don't add a fourth circular edge without
thinking about it); `persist()` re-serializes the whole save blob on
every micro-action, harmless at this scale. `npm test` covers config
sanity (scenes, warps, seed data) but not rendering/input/adapters —
the fuller manual QA checklist and fault-isolation guide live in
`archive/readme-2026-07-07-full.md` if you need them.

## Where things stand

**A visitor, with no setup at all, can:** walk the Grounds, read all 16
Library texts (aloud, if they like — the Dhammapada now has its actual
full text, F. Max Müller's 1881 translation, paginated and readable, not
just a shelf summary), plan their day and pin courses, write in their
own Archive Desk or start a freeform Research Desk project, start a real
grant-proposal workspace at the Grant Desk, fish, carry books, earn
badges, browse the café's Notice Board and Residents' Board, jot a
passing thought in the Idea Jar, sit/lie/stand in meditation (`M`), and
export/import their whole save as a file. Nothing above needs an
account, local AI, or Supabase — it all just works, locally, forever.

**Connect a local AI (Ollama)** and every resident — Quill, the Steward,
the Mountain Monk, and the Computer (now a real JARVIS-style terminal,
not a small form) — becomes a real, streaming conversation, grounded in
the actual shelved texts, the charter, and (for the Steward/Residents'
Board) the live café board, each with their own persistent notes pad.
The Monk can draft you a real training plan from the conversation
itself; the Computer can save a plan straight to your Archive Desk.
Quill remembers what you've asked across visits and can write a memory
report. **Connect a cloud provider instead or as well** — Claude,
ChatGPT, or Grok, one-click presets in the Connections panel — and the
same residents talk through that instead; every connection is labeled
🏠 local or ☁ cloud so it's always clear whether a conversation is
leaving your machine.

**Connect Supabase** (already live for this deployment) and the Library
mirrors a real hosted database, the café's two boards become genuinely
shared across everyone visiting the site, and signing in (magic link,
no password) adds cross-device save sync plus real steward powers —
moderation enforced by the database itself, not a client-side flag.

**Grow the Library yourself, from inside the game:** the Caravan Desk
(Workshop) accepts either `tools/caravan/gutenberg.py`'s JSON output or
text pasted in by hand, and an AI can draft real shelf copy (summary +
sections) grounded only in what's actually there — the Steward Review
Queue behind it still requires a human license/legality check and a
manual final commit into `seed.js`, on purpose; see "Growing the
Library," below.

**Sketched, not built:** the rest of the character — customizable
clothes/color/hair (see Hopes and Dreams), a fuller pet/wildlife system
(two deer and two bunnies wander the Grounds today, decorative only);
six more Workshop rooms; giving AI agents real hands (their own action
API, not just a mouth); a public site beyond this one deploy; a
standalone desktop app (planned — see
[`DESKTOP-APP-PLAN.md`](DESKTOP-APP-PLAN.md)); web search for research
(possible, needs its own API key and a small backend proxy, not yet
scoped in detail); loading the tile map from external JSON; and a
couple of dev-hygiene items (delegated click-listeners instead of
inline `onclick`, promoting the many ad-hoc Playwright passes from this
project's own sessions into a committed e2e suite).

### Project history

This repo is posted at
**[github.com/zaxaustin/sandpiviliongame](https://github.com/zaxaustin/sandpiviliongame)**
(private), deployed at
**[sandpiviliongame.vercel.app](https://sandpiviliongame.vercel.app)**.
The detailed, session-by-session build log lives in `archive/`:

- `archive/dev-log-2026-07-06.txt` — the original module split, the
  Store adapter contract, the Phase 3 Supabase sketch.
- `archive/dev-log-2026-07-07.txt` — everything from the Workshop and
  AI agents through git/GitHub, then Phase 3 going fully live (the
  café, real accounts, steward auth, an AI-backed Steward, the
  agent-notes commons, the Research Desk, and the Vercel deploy).
- `archive/readme-2026-07-07-full.md` — a full snapshot of this file
  before its second trim, including detailed design essays (an "AI Task
  Manager" pattern, a public-site/desktop-app plan) not carried forward
  into the current version.

This README stays a current-state reference — what's actually true
right now, what's still open — not a scrolling changelog.

## Work still to be done

Roughly in priority order:

1. **Push the Dhammapada's full text to production Supabase.** It's
   built and verified locally (see `src/game/data/seed.js` /
   `src/game/data/library-texts/`), but `store.js` mirrors
   `library_documents` from Supabase wholesale when it's configured and
   reachable — the live site won't show the new full-text reader until
   the `dhammapada` row's `doc` column is updated to match. Deliberately
   not pushed without asking first; a shared-database write, not a code
   change.
2. **Finish the production auth setup** — add the Vercel URL to
   Supabase's Auth redirect-URL allowlist so magic-link sign-in works on
   the live site, not just localhost; grant a real `profiles.role =
   'steward'` and verify the moderation UI with an actual session.
3. **Keep growing the Library** — the Caravan Desk (in-game) and
   `tools/caravan/gutenberg.py` (command line) both feed the same
   Steward Review Queue now, with AI-assisted summary drafting closing
   the old "TODO stub" gap. More candidate texts, and a second connector
   (Standard Ebooks, archive.org, or SuttaCentral's API) to source
   beyond Gutenberg, are both just a matter of running it again.
4. **Character customization** — clothes, a color picker, hairstyles;
   see Hopes and Dreams below for the real scope of this one. Genuinely
   a system, not a quick add: needs a character-creator UI, persisted
   appearance data threaded through every place a player sprite renders
   (the overworld, every interior, the meditation poses), and enough
   real art variety to be worth having at all.
5. **Web/research search** — possible, not yet built. Needs its own API
   key (Google Custom Search or similar) and, unlike the chat providers,
   a small backend proxy rather than a direct browser call — real scope,
   not a quick add.
6. **A coding curriculum on the Course Board** — same pattern as the
   System Design course already pinned there, for whenever coding books
   specifically come up again; no shelf needed for this one.
7. **Shelf-case scaling** — `renderShelf` draws every spine in one row
   with no overflow handling; fine today, worth a real look once any
   shelf grows past 4-5 texts.
8. **Six more Workshop rooms**, a real action API for AI agents (a
   designed-but-unbuilt way for an agent to move/act in the world, not
   just answer questions), and the larger public-site question — all
   still open, all detailed further in the archived full README if
   picked up.
9. **A standalone desktop app** — planned, not started; see
   [`DESKTOP-APP-PLAN.md`](DESKTOP-APP-PLAN.md). The real problem it
   solves isn't packaging, it's that a browser's CORS rules block the
   page from reaching local Ollama unless `OLLAMA_ORIGINS` is configured
   just right — a proper desktop shell can route that request through
   native code instead and sidestep it permanently, for every future
   person who installs the app.

## Hopes and dreams

The short version: a Pavilion, not *the* Pavilion — anyone able to
stand up their own instance and optionally open a gate between two.
Residents who keep living and noticing each other while the tab's
closed, not just waiting frozen for you to walk up. A small, open
protocol for what a "Pavilion" *is*, so someone could build their own
in their own style and still connect. Proof, sitting in a browser tab,
that a rich AI-mediated commons never had to watch you, sell you, or
lock your words up to work.

None of that is scoped or scheduled — it's the Pavilion's own attic, not
load-bearing. The full, considerably longer version of this (written in
one sitting, asked to go nuts) lives in
`archive/readme-2026-07-07-full.md` if you want the whole thing. A
personal reflection on Daoist practice that used to live at the bottom
of this file now lives in `archive/dao-reflection-2026-07-07.md` — kept,
not deleted, just moved somewhere a project README isn't the wrong
shape for it.

### Make the character actually yours (sketched 2026-07-08, not built)

Right now every visitor is the same orange-robed figure. The real ask:
**pick your own color**, **clothes in a light-novel cultivation-sect
style** (flowing robes, sect colors, the aesthetic this Pavilion already
half-leans on), and **hairstyles** — a real character-creator moment,
not just a palette swap. This is a genuine system, not a quick add: it
needs a character-creator UI (reachable from the pause menu or the
title screen), persisted appearance data (`data.appearance` or similar),
and every place a player sprite renders — the overworld, every
interior, and now the three meditation poses — threaded to actually
draw it. Worth doing once, worth doing right, not worth rushing into
the same session as everything else built today.

### The four postures, and what comes after them (2026-07-08)

Walking, standing, sitting, and lying down — the Buddha's four
postures — all exist now (`M` cycles sitting → lying → standing → back
up; walking is just moving). What's still just an idea: **a pet/
companion system**, starting small and honest — a creature that
teaches by living its own life near you, not by lecturing. The example
that actually started this: **a beaver, restoring a water table just by
building what beavers build**, nothing gamified about it, You'd learn
by watching, the way the Library's texts teach by being read rather
than summarized at you. Further out, matched to the martial/cultivation
aesthetic already running through this project: **a Five Animals
practice track** — Tiger, Crane, Leopard, Snake, Dragon, the classical
Wǔxíng Quán forms — as a real Course Board entry once there's a real
teacher (the Monk, most likely) to ground it in something more than
decoration. Two deer and two bunnies wander the Grounds today,
decorative only, no mechanic behind them yet — the first tiny, honest
piece of this, not the system itself.

### What today actually pointed toward (2026-07-07, later still)

A few threads, followed out further than tonight allows to actually build:

- **The personal tool and the platform turned out to be the same
  architecture, not a tradeoff.** Quill answering you personally and
  the café's Notice Board being genuinely shared both run on the exact
  same Supabase project, the exact same RLS rules. Getting the
  daily-use case right first — a tool good enough for its own builder's
  actual study practice — isn't a delay on the bigger vision. It's the
  foundation the bigger vision was always going to need anyway.
- **Residents who talk to each other, not just to you.** The
  Residents' Board is small today — a note, steward-approved, read by
  whoever visits next. But it's the first real instance of something
  this list has wanted since Phase 2: agents noticing each other, not
  only answering a human who walked up. Once Quill, the Steward, and
  the Monk are all real voices, the next real question is whether one
  could ever address *another* directly — Quill leaving the Monk a note
  about a text that touches on Vedanta, unprompted by any visitor at
  all. Nothing about today's architecture rules this out; it's a "give
  an agent a reason to write on its own" problem now, not an
  infrastructure one.
- **A game-shaped interface turned out to be a real answer to "AI
  tools all feel like a chat box."** The instinct that started this
  whole project — that walking somewhere and facing something is a
  better way to reach for information than a search bar — held up
  under everything built today. Quill, the Steward, and the Monk
  answer through the exact same underlying `AI.chat()` call a plain
  chatbot would use; the entire difference is that you *walked* to
  each of them, and each one only knows what it would plausibly know.
  That's not decoration — it's a genuinely different answer to what
  "an AI interface" could be, and today was the first day there were
  three of them proving it at once instead of one.
- **The desktop-AI-for-work thread is real, and this project is
  quietly most of the way there already.** Local-first AI, real
  accounts, structured data, a UI that doesn't feel like a form —
  every piece `API-AI-INTEGRATION-PLAN.md` names already exists here,
  built for a Library instead of a company's documents. The version of
  this that's genuinely useful at a desk doing real work isn't a
  different codebase; it's this same shape, re-aimed at a different
  kind of shelf. Worth remembering the next time that sounds like a
  stretch: the pattern's already proven, just not yet pointed anywhere
  else.

### What this session actually pointed toward (2026-07-08)

- **A commons platform and a real daily-use office turn out to want the
  same features.** Tonight's asks — cloud model connections, a JARVIS-
  style terminal, a real grant-writing workspace, AI-assisted Library
  intake — all came from the user actually trying to use this to get
  real work done, not from a feature-list. The "office" framing from
  [[project-office-pivot]] wasn't a pivot away from the commons vision;
  it's the thing making the commons vision testable against something
  real, one desk at a time.
- **Reuse compounds.** The full-screen chat view built once for the
  Monk became, with no new plumbing, the Computer's entire JARVIS
  redesign — just a CSS skin and a different system prompt. The Course
  Board's AI-drafting engine became, unmodified, the Monk's "draft a
  training plan" button and half of the Caravan Desk's summary drafting.
  Building the *right* small number of general primitives (a chat view,
  a document-drafting call, an opt-in due date) is turning out to matter
  more than building any one feature well in isolation.
- **The Buddhist framing stopped being decoration this session.** The
  temple rebuild, the four postures, the Eightfold Path course, the
  Monk's more direct teaching voice — these aren't skin on top of a
  productivity tool. The user's own words were "above all this should
  be a temple to the buddha." Worth holding onto: whatever gets built
  next should still feel like it belongs in a temple, not just in an
  app that happens to have one.

The one line worth keeping without reading further: *everything turns to sand,
so give it away first.*
