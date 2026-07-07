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
  around this project itself.

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
Library texts (aloud, if they like), plan their day and pin courses,
write in their own Archive Desk or start a freeform Research Desk
project, fish, carry books, earn badges, browse the café's Notice Board
and Residents' Board, and export/import their whole save as a file.
Nothing above needs an account, local AI, or Supabase — it all just
works, locally, forever.

**Connect a local AI (Ollama)** and Quill, the Steward, the Computer,
and the Research Desk all become real conversations — grounded in the
actual shelved texts, the charter, and (for the Steward/Residents'
Board) the live café board — instead of scripted lines. Quill remembers
what you've asked across visits and can write a memory report.

**Connect Supabase** (already live for this deployment) and the Library
mirrors a real hosted database, the café's two boards become genuinely
shared across everyone visiting the site, and signing in (magic link,
no password) adds cross-device save sync plus real steward powers —
moderation enforced by the database itself, not a client-side flag.

**Grow the Library yourself:** `tools/caravan/gutenberg.py` fetches a
public-domain book from Project Gutenberg and formats it for bulk
import into your own Archive Desk. Getting something onto the *shared*
shelves is a deliberate, always-manual second step — see "Growing the
Library," below.

**Sketched, not built:** six more Workshop rooms, giving AI agents real
hands (their own action API, not just a mouth), a public site beyond
this one deploy / a desktop app, loading the tile map from external
JSON, and a couple of dev-hygiene items (delegated click-listeners
instead of inline `onclick`, promoting a few ad-hoc Playwright passes
into a committed e2e suite). Full detail on all of these — including a
much larger, deliberately-speculative "AI Task Manager" design and a
three-tier public-site/desktop-app plan — lives in
`archive/readme-2026-07-07-full.md`, kept out of this file so it stays
readable.

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

1. **Grow the Library.** Close the Caravan pipeline gap — `gutenberg.py`
   needs a `--for-library` flag so its output feeds directly into
   `library-draft.py` (right now the two scripts don't actually chain);
   then build `promote-draft.py`, sketched but not built, which takes a
   completed draft from `library-drafts/` and inserts it into
   `library_documents` (Supabase) instead of hand-editing `seed.js`.
   Four real candidate texts are already identified and checked
   (public domain, non-duplicate) — see `archive/readme-2026-07-07-full.md`'s
   "Growing the Library" section for exactly which four and why. A
   second Caravan connector (Standard Ebooks, archive.org, or
   SuttaCentral's API) would open up sourcing beyond Gutenberg alone.
2. **Finish the production auth setup** — add the Vercel URL to
   Supabase's Auth redirect-URL allowlist so magic-link sign-in works on
   the live site, not just localhost; grant a real `profiles.role =
   'steward'` and verify the moderation UI with an actual session.
3. **The Mountain Monk's real voice** — a second AI-backed resident,
   seated and waiting; needs his persona/instructions written into
   `data/charter.js`-style content once supplied.
4. **Shelf-case scaling** — `renderShelf` draws every spine in one row
   with no overflow handling; fine at 4 texts per shelf, worth a real
   look once the Library-growth work above lands a 5th or 6th.
5. **Six more Workshop rooms**, a real action API for AI agents (a
   designed-but-unbuilt way for an agent to move/act in the world, not
   just answer questions), and the larger public-site/desktop-app
   question — all still open, all detailed further in the archived
   full README if picked up.

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
`archive/readme-2026-07-07-full.md` if you want the whole thing. The one
line worth keeping without reading further: *everything turns to sand,
so give it away first.*
