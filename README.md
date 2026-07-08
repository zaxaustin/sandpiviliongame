# The Sand Pavilion

A small top-down world you walk around in — a Library with real, readable
books, a Study for planning your day, a Workshop for your own writing and
research, a Café that looks outward. It's built like a game because a
game is a good shape for a place, but the actual point is a commons:
things freely given, license and source attached to everything, nothing
gated.

The long-term idea: a platform where AI agents are residents, not just
flavor text — and, further out, a free place where people study,
practice, and pursue their own education together, the way a school or
an order does, not a platform that owns what they learn. The NPCs
already carry that identity in their names — Ember · *Archivist Agent*,
Moss · *Steward Agent*, Cobalt · *Caravan Agent*, Quill · *Librarian
Agent*, the Steward — some scripted, some with real AI voices now. A
game that's not a game: an exploratory, spatial way to move through a
personal (and, in time, shared) body of data, practice, and writing,
rather than a dashboard or a feed.

**Not everything has to happen inside the Pavilion, either.** Where the
game can genuinely do something itself — read a book, hold a note,
search SuttaCentral live from the Caravan Desk — it does. Where a real
wall gets in the way (a browser can't fetch Project Gutenberg or arXiv
directly — confirmed, not assumed), the honest move is to step outside,
do that piece by hand or by script, and bring the result back in. The
Request Board and `tools/caravan/` are that door, not a workaround to
feel bad about — a commons that pretends to be more self-sufficient than
it actually is just breaks trust with whoever's using it.

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
  — a terminal, APIs, Docker, databases, how this whole thing is built,
  and how to actually go find and add real books yourself — there's a
  self-paced curriculum for that in [`LEARNING-PATH.md`](LEARNING-PATH.md),
  built around this project itself, plus
  [`API-AI-INTEGRATION-PLAN.md`](API-AI-INTEGRATION-PLAN.md) for the same
  ideas pointed outward at work/desktop AI integration generally.

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

Everything below "works with zero setup" also works completely
disconnected from the internet, forever, on this or any machine — the
cloud pieces (Supabase, a hosted deploy) are additive, never required.

## What the Sand Pavilion can do today

**With no setup at all:** walk the Grounds, read every Library text
(aloud, if you like), take notes alongside any book right in the Reader,
plan your day and pin courses, write in your own Archive Desk or start a
freeform Research Desk project, run a real grant-proposal workspace,
fish, carry books, earn badges, browse the café's boards, sit/lie/stand
in meditation (`M`), and export your whole save as a file. None of this
needs an account, a local AI, or a database — it just works, locally,
forever.

**The Library** — six shelves (Theravada, Mahayana, Daoism, Practice,
Science, Classics), 20 texts. Fourteen of them are full, real,
page-by-page books, not summaries: the Dhammapada, Satipatthana, the
Metta Sutta, the Vibhaṅga Sutta, and Anapanasati (Theravada); the Tao Te
Ching (Daoism); Meditations, The Republic, and The Nicomachean Ethics
(Classics); and On the Origin of Species, Our National Parks, Man and
Nature, The Chemical History of a Candle, and The Inventions, Researches
and Writings of Nikola Tesla (Science) — every one hash-verified against
its real source before it reached a shelf. The remaining six shelf
entries are short original Pavilion Commons essays, complete as-is — not
placeholders for a longer work, just not full-length books either. A
reading nook exists in the world now too: a bean bag chair inside, a
bench just outside the door.

**AI residents** — connect a local model (Ollama) and Quill, the
Steward, the Mountain Monk, and the Computer (a full JARVIS-style
terminal) become real, streaming conversations, grounded in the actual
shelved texts and the charter. The Monk can draft a real training plan
from a conversation; the Computer can save a plan straight to your
Archive Desk; the Research Desk's assistant can summarize any chapter or
paper you paste in, kept as a private note, never shared. Connect a
cloud provider instead or as well — Claude, ChatGPT, or Grok — and the
same residents talk through that; every connection is labeled 🏠 local
or ☁ cloud so it's always clear whose machine a conversation is on.

**Local Library storage** — full book text lives in MinIO, running
locally in Docker on this machine (`sand-pavilion-minio`, set to survive
a reboot), not stuffed into the database. A hundred gigabytes are set
aside for it; a few megabytes are used. See
[`LIBRARY-SCALING-PLAN.md`](LIBRARY-SCALING-PLAN.md) for the reasoning
and the real setup.

**Growing the Library — the Caravan** — eight small tools in
`tools/caravan/`, each named for one real source rather than a general
scraper: Project Gutenberg and arXiv for public-domain books and
research papers, SuttaCentral for the Buddhist canon, plus the drafting/
promoting/full-text-attaching scripts that get a fetched text properly
onto a shelf. SuttaCentral is reachable *from inside the game itself* —
a live 🔍 **Browse SuttaCentral** search in the Caravan Desk, no terminal
needed. Gutenberg, arXiv, and Semantic Scholar are confirmed unreachable
directly from a browser (a real limit of the platform, not a missing
feature) — the Request Board is where a text you want, but can't fetch
in-game, gets tracked until it's brought in by hand.

**The Commons** — connect Supabase and the Library mirrors a real hosted
database, the café's two boards become genuinely shared, and signing in
(magic link, no password) adds cross-device save sync plus real steward
powers, moderation enforced by the database itself, not a client flag.
Currently dormant by choice while local-first daily use is the priority
— see "What's next."

**Sketched, not built yet:** character customization (clothes, color,
hairstyle — a real system, scoped below); a fuller pet/companion system;
six more Workshop rooms; a standalone desktop app (see
[`DESKTOP-APP-PLAN.md`](DESKTOP-APP-PLAN.md)); real full-text search
across a much larger Library; giving AI agents actual hands, not just a
voice.

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
- **`scenes.js`** — pure data: tile grids plus arrays of npcs/signs/
  warps/stations. A new room is a `build*()` function plus registering
  it in `scenes`.
- **`entities.js`** — the one mutable `state` object and the one `data`
  object (everything saved), plus world lookups (`tileAt`, `blocked`, …).
- **`ui/overlays.js`** — the only place touching DOM overlay panels;
  `CHAT_AGENTS` is the small registry powering every AI-backed NPC from
  one shared chat function instead of one-off code per resident.
- **`render.js`** — owns the `<canvas>`, reads state, never mutates it.
- **`main.js`** — the `requestAnimationFrame` loop, input, audio.

`npm test` covers config sanity (scenes, warps, seed data) but not
rendering/input/adapters — the fuller manual QA checklist lives in
`archive/readme-2026-07-07-full.md` if you need it.

## What's next

Roughly in priority order:

1. **Real search at scale** (`tsvector` for keywords, `pgvector` for
   semantic/AI-grounded search) — worth adding once the Library's real
   volume justifies it; see `LIBRARY-SCALING-PLAN.md`.
2. **A friendlier wrapper around the Caravan scripts** — real and
   buildable, not yet started; worth confirming it's still wanted before
   it's built, now that the terminal tools work well on their own.
3. **Fill out the Science and Classics shelves further** — coding and
   electronics material specifically is thin, since most modern texts in
   that space are copyrighted; the honest path is openly-licensed
   sources (like *Lessons In Electric Circuits*) fetched deliberately,
   not scraped from anywhere reachable.
4. **Turn downloaded papers into something the Reader can page through**
   — right now a fetched arXiv PDF is read outside the game; parsing it
   into plain text would close that loop.
5. **Character customization** — clothes, a color picker, hairstyles;
   see Hopes and Dreams for the real scope. A genuine system, not a quick
   add: a character-creator UI, persisted appearance data, and every
   place a player sprite renders (the overworld, every interior, the
   meditation poses) threaded to actually draw it.
6. **Finish the production auth setup** — add the Vercel URL to
   Supabase's Auth redirect-URL allowlist, grant a real steward role, and
   verify moderation with an actual session — whenever the Commons comes
   back off pause.
7. **A standalone desktop app** — see [`DESKTOP-APP-PLAN.md`](DESKTOP-APP-PLAN.md).
   The real problem it solves: a browser's CORS rules block local Ollama
   unless configured just right; a proper desktop shell routes that
   through native code instead, permanently, for every future person who
   installs it. Electron picked, Phase 1 done and proven live
   (2026-07-08): a real Electron window reaching Ollama through a native
   proxy with zero `OLLAMA_ORIGINS` setup. Remaining: a real installer,
   a first-run "no local AI found" message, and a test on a machine that
   isn't the dev machine.
8. **Six more Workshop rooms**, a real action API for AI agents (a
   designed-but-unbuilt way for an agent to move/act in the world, not
   just answer questions), and the larger public-site question.

## Hopes and dreams

The short version: a Pavilion, not *the* Pavilion — anyone able to stand
up their own instance and optionally open a gate between two. Residents
who keep living and noticing each other while the tab's closed, not just
waiting frozen for you to walk up. Proof, sitting in a browser tab, that
a rich AI-mediated commons never had to watch you, sell you, or lock your
words up to work.

**The larger hope this is actually reaching for: a free place to pursue
higher education together.** Not a course platform with a paywall at
the good part, and not a single teacher's personal following — closer to
an old idea of a school or an order: a charter instead of a business
model, stewards instead of a company, texts held in common instead of
licensed per seat. Anyone able to walk in, read anything on the shelves,
study alongside residents (human and AI) actually grounded in the
material, and leave having actually learned something, for free, for as
long as they want to stay. The commons framing was never decoration —
it's the actual mechanism that would make this different from every other
place claiming to democratize learning while quietly gating the parts
that matter.

None of that is scoped or scheduled — it's the Pavilion's own attic, not
load-bearing. The full, considerably longer version of one early sitting
on this lives in `archive/readme-2026-07-07-full.md`, and the running,
session-by-session narrative of everything actually built lives in
`archive/dev-log-*.txt` — this file stays a current-state reference, not
a diary.

### Make the character actually yours (sketched, not built)

Right now every visitor is the same orange-robed figure. The real ask:
**pick your own color**, **clothes in a light-novel cultivation-sect
style** (flowing robes, sect colors, the aesthetic this Pavilion already
half-leans on), and **hairstyles** — a real character-creator moment,
not just a palette swap. Worth doing once, worth doing right: it needs a
character-creator UI, persisted appearance data, and every place a
player sprite renders threaded to actually draw it.

### The four postures, and what comes after them

Walking, standing, sitting, and lying down — the Buddha's four
postures — all exist now (`M` cycles sitting → lying → standing → back
up). What's still just an idea: **a pet/companion system**, starting
small and honest — a creature that teaches by living its own life near
you, not by lecturing. The example that started this: a beaver,
restoring a water table just by building what beavers build, nothing
gamified about it — you'd learn by watching, the way the Library's texts
teach by being read rather than summarized at you. Further out, matched
to the cultivation aesthetic already running through this project: a
**Five Animals practice track** (Tiger, Crane, Leopard, Snake, Dragon,
the classical Wǔxíng Quán forms) as a real Course Board entry, once
there's a real teacher — the Monk, most likely — to ground it in
something more than decoration. Two deer and two bunnies wander the
Grounds today, decorative only, no mechanic yet — the first honest piece
of this, not the system itself.

### Project history

This repo is posted at
**[github.com/zaxaustin/sandpiviliongame](https://github.com/zaxaustin/sandpiviliongame)**
(private), deployed at
**[sandpiviliongame.vercel.app](https://sandpiviliongame.vercel.app)**.
The detailed, session-by-session build log lives in `archive/`:

- `archive/dev-log-2026-07-06.txt` — the original module split, the
  Store adapter contract, the Phase 3 Supabase sketch.
- `archive/dev-log-2026-07-07.txt` — the Workshop and AI agents through
  git/GitHub, Phase 3 going fully live (the café, real accounts, steward
  auth, an AI-backed Steward, the agent-notes commons, the Research
  Desk, the Vercel deploy), and the session's closing reflections.
- `archive/dev-log-2026-07-08.txt` — reading notes, local object
  storage (Docker + MinIO), the Classics and Science shelves, the
  arXiv/Semantic Scholar/SuttaCentral connectors, the in-game
  SuttaCentral search, and the README's own cleanup.
- `archive/readme-2026-07-07-full.md` — a full snapshot of this file
  before its second trim, including detailed design essays not carried
  forward into the current version.

This README stays a current-state reference — what's actually true
right now, what's still open — not a scrolling changelog.

The one line worth keeping without reading further: *everything turns to
sand, so give it away first.*
