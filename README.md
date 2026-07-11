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

---

## For the next session — where everything is, and what not to break

*A standing note to whoever picks this up next (human or a fresh Claude),
since context windows don't carry over. Read `CLAUDE.md` first — it's the
fuller orientation; this is the quick map.*

**Where to find things**
- **`CLAUDE.md`** — how to get oriented, and the standing decisions. Start here.
- **This README** — current state: what's built, what's next. The source of truth for *now*.
- **`archive/dev-log-*.txt`** — the narrative of how it got here, session by session. Skim the latest one or two.
- **`plans/*.md`** — every open plan; `plans/done/` for closed ones; `plans/BETA-TESTING-FEEDBACK.md` for real issues found by using it.
- **`LEARNING-PATH.md`** — the self-paced curriculum; answer "why/how does this work" questions at the stage the user's actually reached.
- **`MANUAL.md`** — the visitor's handbook: every room, desk, resident, and where your data lives — the "how do I use this place" layer, written for someone non-technical.
- **`PROTOCOLS.md`** — the how-to manual for filling your own Pavilion: adding a book (both paths), connecting your own AI, more to come.
- **Code map:** `src/game/` — `main.js` (loop, input, onAction dispatch), `scenes.js` (every room + NPCs/stations/warps), `render.js` (pixel drawing, `drawStation`), `entities.js` (data model + `freshData()` + `dueSoon`/`upcomingItems`/`openSparks`), `ui/overlays.js` (**the big one** — every panel, chat, `CHAT_AGENTS`), `ai/provider.js` (Ollama/cloud adapters), `data/` (`charter.js`, `seed.js`, `store.js`, `supabase.js`). Tools in `tools/caravan/`. Memory lives outside the repo in the user's `.claude` memory dir.

**Invariants — the structure to keep, not silently change**
- **The Temple (Eightfold Path) and the Library stay — always, in every tier.** Set intentions; act on them. That's the whole mission.
- **Three residents, three roles:** Quill teaches (Library, plans), the Monk guides (meaning/conduct), Sebastian works with you (the day). The Monk always gets the best local model + real room to think.
- **Three charters, don't cross them:** `CHARTER` (in-world residents, devotional), `WORK_CHARTER` (work tools, neutral/secular), `BUTLER_CHARTER` (Sebastian — warm but secular). Never skew a secular goal toward the dharma.
- **No background polling.** Every AI call is triggered by a real user action, never a timer. This is load-bearing.
- **Local-first.** No paid cloud API required to use it. Book *text* → local MinIO/Docker; catalog → Supabase. Cloud AI is an eyes-open opt-in, always labeled ☁.
- **Effectiveness before features/personalities.** A resident that answers reliably beats a richer one that hangs.
- **The sleeper car:** low-res on purpose, so the machine's resources go to AI/Library/work, not the renderer. That's the tie-breaker on "looks more impressive" vs "does more, uses less."
- **Build it ourselves before a third party.** The long path is the shortest path.
- **Provenance at the door:** every shelved text carries license + source. "Restricted"/"dangerous" content is always 100% atmosphere, never real harm.

**Mechanical gotchas that will bite you**
- Every `onclick="fn()"` handler must be added to the `Object.assign(window, {…})` block at the bottom of `ui/overlays.js`, or it silently fails.
- Verify with `node --check <file>` and `node test/smoke.mjs`. There's no live browser test by default; the user prefers you *not* pull in Chrome/Playwright to test.
- Movement needs *held* keys, not `.press()` — relevant if you ever do automate a browser check.
- Supabase rows **replace** the seed (they don't merge) — seed edits won't show if Supabase is configured; promote via the Supabase MCP or `promote-draft.py`.
- At session end: append to `archive/dev-log-YYYY-MM-DD.txt` and update this README's "What's next." Commit only when asked; the project commits straight to `main`.

## New here? Start with this

The full visitor's handbook — every room, every desk, every resident,
written for someone who has never seen this before — is
[`MANUAL.md`](MANUAL.md). The short version of its two promises: nothing
breaks by clicking around, and nothing phones home.

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

## Running it — every mode, and how to get each up

There are five ways to run the Pavilion, plus three optional layers you
add on top. Every mode starts the same way, once:

```
npm install
```

Controls everywhere: walk with Arrows/WASD, interact/fish with `E`, close
menus with `Esc`, pause menu via `Esc` or `☰`. Everything saves
automatically. The full room-by-room guide to actually *using* the place
is [`MANUAL.md`](MANUAL.md) — the visitor's handbook.

### Mode 1 — a browser tab, live (the everyday dev loop)

```
npm run dev        # starts Vite, prints a localhost URL — open it
```

Instant reload on every code change. The browser mode needs the
`OLLAMA_ORIGINS` step (below) before local AI works.

### Mode 2 — a browser, built static site

```
npm run build      # outputs a static site to dist/
npm run preview    # serve that build locally to sanity-check it
npm test           # config sanity check — scenes, warps, seed data (no browser needed)
```

The deployed version is exactly this: **[sandpiviliongame.vercel.app](https://sandpiviliongame.vercel.app)**,
auto-deployed by Vercel on every push to `main`. Local AI still works on
the deployed site, since the game checks `localhost:11434` from *whoever's
browser is open*, not from wherever the files are hosted.

### Mode 3 — a real desktop window, live

```
npm run electron:dev     # a native window over the live dev server
```

The fastest "just show me it as an app." Bonus over a browser: the desktop
app's own process proxies Ollama directly, so **no `OLLAMA_ORIGINS` setup
is needed at all** in any desktop mode.

### Mode 4 — the installed desktop app (your own machine, full setup)

```
npm run electron:build   # a real Windows installer (.exe) in release/
```

Run the installer from `release/` once: Start Menu shortcut, its own
window, never a terminal again. This build carries whatever's in your
`.env.local` — on the dev machine that means the full personal setup
(Supabase catalog + MinIO full texts), which is exactly right for *this*
machine and wrong to hand to anyone else. For that:

### Mode 5 — the shareable beta installer (what you give other people)

```
npm run electron:build:beta   # same installer, built local-only
```

Builds with `.env.beta` (committed, deliberately *empty*), which Vite's
mode priority guarantees overrides `.env.local` — so no Supabase key, URL,
or MinIO endpoint can reach the installer even though the dev machine has
them (verified: the whole Supabase library tree-shakes out of the bundle).
A tester gets: the world, the residents, the 21-text seed Library, Your
Shelf, and every desk — zero services, nothing to stand up. The installer
is unsigned on purpose (see [`DESKTOP-APP-PLAN.md`](plans/DESKTOP-APP-PLAN.md));
Windows shows an "unknown publisher" warning the first run — expected.

**Where the installer actually is:** it lands in `release/` — right now
that's `release/Sand Pavilion Setup 0.1.0-beta.1.exe`. "Distributing the
beta" means handing someone that one file (or attaching it to a GitHub
Release when it's time). It isn't hosted anywhere yet, on purpose.

**One caution on the dev machine itself:** the beta installer and your own
Mode-4 install are the *same app* to Windows (same identity, same save) —
installing the beta here would replace your full personal app with the
local-only one. Nothing would be lost (your save persists, and the Library
lives in Supabase/MinIO, not the app — rebuilding Mode 4 restores it), but
to just *try* the beta without touching your install, run the unpacked
copy directly instead: `release/win-unpacked/Sand Pavilion.exe`.

### The three optional layers (each independent, each honest without it)

- **Local AI — Ollama** (any mode; the one layer most people want):
  install [ollama.com](https://ollama.com), pull a model that fits your
  machine (the tiered guide is in [`PROTOCOLS.md`](PROTOCOLS.md) Protocol 2),
  and in a *browser* mode also run
  `setx OLLAMA_ORIGINS "http://localhost:5173,http://localhost:5174"` and
  reopen the terminal. Desktop modes skip that step entirely. The
  beginner's walk-through is further down this README.
- **Full-text object storage — MinIO in Docker** (dev machine only): holds
  the full text of catalog-first *certified* books. Beta testers never
  need it — Your Shelf stores personal books as plain files through the
  app itself. Setup lives in [`LIBRARY-SCALING-PLAN.md`](plans/LIBRARY-SCALING-PLAN.md).
- **The Commons — Supabase** (optional, currently dormant by choice): a
  `.env.local` with `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`
  turns on the mirrored catalog, café boards, accounts, and steward
  moderation. Remember the standing gotcha: **Supabase rows replace the
  seed, they don't merge.**

Everything marked "works with zero setup" also works completely
disconnected from the internet, forever, on this or any machine — every
layer above is additive, never required.

## What the Sand Pavilion can do today

**With no setup at all:** walk the Grounds, read every Library text
(aloud, if you like), take notes alongside any book right in the Reader,
plan your day and pin courses, write in your own Archive Desk or start a
freeform Research Desk project, run a real grant-proposal workspace,
fish, carry books, earn badges, browse the café's boards, sit/lie/stand
in meditation (`M`), and export your whole save as a file. None of this
needs an account, a local AI, or a database — it just works, locally,
forever.

**The Library** — nine shelves (Theravada, Mahayana, Daoism, Practice,
Science, Classics, Native American, Hindu, and Tantra — the last three
all added 2026-07-09), 44 texts, most of them full, real, page-by-page
books, not summaries: the Theravada canon, the Tao Te Ching, the
Diamond Sutra, Meditations/Republic/Nicomachean Ethics/Discourses/
Wealth of Nations, Darwin's Origin of Species and Beagle journal plus
the Library's first research paper, Walden/Sailing Alone/Ten Acres
Enough, Charles Eastman's own Native American writing, the Bhagavad-
Gita/Upanishads/Ramayana-Mahabharata and Wilkins' *Hindu Mythology*,
and — kept deliberately separate, its own real warnings intact — a
genuine 1922 Tantra text, Arthur Avalon's *The Serpent Power*. Every
one hash-verified against its real source before it reached a shelf.
A handful of shelf entries are short original Pavilion Commons essays
instead — complete as-is, not placeholders for a longer work. A
reading nook exists in the world now too: a bean bag chair inside, a
bench just outside the
door.

**AI residents** — connect a local model (Ollama) and Quill, the
Steward, the Mountain Monk, the Computer (a full JARVIS-style terminal),
and now **Butler Sebastian** become real conversations, grounded in the
actual shelved texts, your own day, and the charter. The three main
residents divide the work cleanly: **Quill teaches** (the Library, and
turning a conversation into a real plan), **the Monk guides** (conduct,
meaning, and finding your own intention — he keeps his own quarters in
the Pavilion Keep, north of the Grounds, for that specifically), and
**Sebastian works with you** — the butler in the Workshop who helps run
the day itself. Talk to Sebastian and he reads the honest shape of your
day (today's plan, what's due, your still-open intentions) and can drop a
schedule he drafts straight into your daily plan; daily-life help is also
the Steward's place, including a real "Ask the Steward" at the Writing
Desk grounded in what's due soon, how recent days went, and any "sparks"
you've brought over from a book's reading notes. The Monk himself
always runs on the single best local model actually installed, with
real room to think — a standing rule, not a default, held separately
from the speed/reliability tradeoffs everything else in the Pavilion is
free to make. The Computer can save a plan straight to your Archive
Desk; the Research Desk's assistant helps with real projects, not just
research topics — turning an idea into concrete next steps — and can
summarize any chapter or paper you paste in, kept as a private note,
never shared. Connect a cloud provider instead or as well — Claude,
ChatGPT, or Grok — and the same residents talk through that; every
connection is labeled 🏠 local or ☁ cloud so it's always clear whose
machine a conversation is on.

**Reading and doing, one motion** — every note you take on a book in
the Reader gets a "Bring to today's plan" button; one click and it
lands as a "spark" on the Writing Desk, attributed to the book it came
from, visible to the Steward's day-planning help and to your own
journal when you look back on a past day. A book note isn't a dead end
anymore.

**A real desktop app** — Electron-based, wraps the same game in its own
window with its own native process that proxies local Ollama requests
directly, permanently fixing the browser CORS wall that requires
`OLLAMA_ORIGINS` to be configured just right. `npm run electron:dev` for
the live dev version (or double-click a desktop shortcut, if you've made
one), `npm run electron:build` for a real Windows installer. See
[`DESKTOP-APP-PLAN.md`](plans/DESKTOP-APP-PLAN.md).

**Real search** — the Index panel (every text in one place) uses
Postgres full-text search when Supabase is configured: word-stemmed,
ranked by relevance (a title match always outranks an incidental
mention), not just literal substring matching. Falls back to the
existing local search instantly if Supabase isn't configured or a query
errors, so the search box never just goes dead.

**Local Library storage — where book data actually lives (the split, kept
deliberate).** The full book **text** lives in **MinIO, running locally in
Docker on this machine** (`sand-pavilion-minio`, set to survive a reboot) —
on your computer, never the cloud. The **database (Supabase) holds only the
catalog card** — title, license, source, summary, tags, search — the small
metadata, not the book itself. A hundred gigabytes are set aside locally
for text; a few megabytes are used. (Note: books added catalog-first, like
the five shelved 2026-07-10, are readable as summaries until their full
text is pushed to local MinIO with `push-fulltext.py` — the text step is
always the local one.) See
[`LIBRARY-SCALING-PLAN.md`](plans/LIBRARY-SCALING-PLAN.md) for the reasoning
and the real setup.

**Growing the Library — the Caravan** — eight small tools in
`tools/caravan/`, each named for one real source rather than a general
scraper: Project Gutenberg, arXiv, Semantic Scholar, and OpenAlex for
public-domain books and research papers, SuttaCentral for the Buddhist
canon, Standard Ebooks for meticulously re-typeset classics (via
GitHub's own API, since Standard Ebooks' own catalog needs a Patrons
Circle membership), `pdf-to-text.py` to turn a fetched PDF into real
shelf-ready text, plus the drafting/promoting/full-text-attaching
scripts that get a fetched text properly onto a shelf. SuttaCentral is
reachable *from inside the game itself* — a live 🔍 **Browse
SuttaCentral** search in the Caravan Desk, no terminal needed.
Gutenberg, arXiv, and Semantic Scholar are confirmed unreachable
directly from a browser (a real limit of the platform, not a missing
feature) — the Request Board is where a text you want, but can't fetch
in-game, gets tracked until it's brought in by hand.

**Adding books manually — two real paths, pick whichever fits.** The full
step-by-step, both paths, with the free-source index and the provenance
rule up front, is written as a real protocol in [`PROTOCOLS.md`](PROTOCOLS.md)
(Protocol 1) — one place a newcomer can actually follow. In short: with a
terminal: download the text by hand and drop it in `library-inbox/`,
sorted into whichever subfolder matches the site it came from (one
already exists per source — see `library-inbox/README.md`). From there
it's the same pipeline as an automated fetch: `library-draft.py` to
start a draft — optionally with `--ai-draft` to have a local Ollama
model suggest a summary and tradition, always clearly marked as a
suggestion, never final — a real hand-written summary and confirmed
license, then `promote-draft.py` to shelve it and `push-fulltext.py` to
attach the full text. **Without a terminal at all:** the Caravan Desk's
"+ Add a text by hand" form has a real drag-and-drop zone — drop a
`.txt` file, pick which site it came from if it's a known one (title,
author, and license all fill in automatically), and it lands in the
same Steward Review Queue either way, nothing shelved until reviewed.
An unrecognized source routes to your own Research Desk notes instead
of the shared queue. `LIBRARY-GROWTH-PLAN.md` has the actual list of
legitimately free sources to pull from (checked for license, not just
"free to read") and the reasoning behind sorting drops by source in the
first place — a folder that fills up by hand is the real signal a
proper connector for that site is worth writing next.

**The Commons** — connect Supabase and the Library mirrors a real hosted
database, the café's two boards become genuinely shared, and signing in
(magic link, no password) adds cross-device save sync plus real steward
powers, moderation enforced by the database itself, not a client flag.
Currently dormant by choice while local-first daily use is the priority
— see "What's next."

**Sketched, not built yet:** character customization (clothes, color,
hairstyle — a real system, scoped below); a fuller pet/companion system;
six more Workshop rooms; real full-text search across a much larger
Library; giving AI agents actual hands, not just a voice — see
[`AGENT-EMBODIMENT-PLAN.md`](plans/AGENT-EMBODIMENT-PLAN.md) for the real plan.

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

**The actual north star, stated directly by the user (2026-07-08): "I
want my day to be at ease where this place can help me find direction
and the tools needed to make use of the knowledge provided — this
should be the key of the sand pavilion."** Ease, direction, and turning
knowledge into use — not feature count — is the tie-breaker for what
gets built next. The list below is ordered against that, not just by
what's technically easiest.

**Real bugs and rough edges found by actually beta-testing, not just
imagined** — a settings-navigation bug with a known cause, a
reasoning-model display gap, TTS voice/speed controls, and more — live
in [`BETA-TESTING-FEEDBACK.md`](plans/BETA-TESTING-FEEDBACK.md), a running log that gets
appended to each testing round rather than folded into this list.

**Done since this list was last written (2026-07-08, same day):**
closing the reading→doing loop (every book note can become a "spark" on
the Writing Desk, one click); real Postgres full-text search in the
Index; a Library-storage health check alongside the existing Ollama
status line; the Library grown to 25 texts (19 with real full text);
the Mountain Monk relocated to the Keep with a formal role split from
the Steward; the player/NPC sprite redesigned as an actual robed
silhouette (sash, draping sleeves, hair/topknot); and a standing rule
that the Monk always gets the best available local model with real
room to think, never traded for speed the way everything else may be.

**Done since then (2026-07-09):** the research-papers gap actually
closed — `tools/caravan/pdf-to-text.py` turns a fetched PDF into real
shelf-ready text, verified live against a real arXiv paper; two new
Caravan connectors, `openalex.py` (searches across publishers for the
legal open-access copy of a paper, no key needed) and
`standardebooks.py` (worked around their OPDS catalog needing a Patrons
Circle membership by using GitHub's own public API plus the books'
real EPUB3 semantic markup instead); `promote-draft.py` fixed to
actually support the `research` category instead of hardcoding
`classical`; a new **Native American** shelf added for Charles Eastman's
own writing rather than a secondhand ethnographic account; 10 more real
texts fetched, drafted, and promoted live — research papers, Mahayana,
Stoic philosophy, economics, sailing, homesteading, Native American
tradition (see `LIBRARY-GROWTH-PLAN.md` for the full list) — taking the
Library from 25 to **35 texts**, all with real full text attached in
MinIO the same day they were shelved. The Caravan is now 8 connector
scripts, not 4.

**Done since then (also 2026-07-09):** the Keep's temple was missing
something real — a Ganesha statue now stands mirrored across the aisle
from the Buddha shrine, same devotional weight, own iconography and
glow, verified by an actual screenshot pass (twice — the first attempt
read as a blob, not an elephant, before it was fixed). The Buddha
statue itself got a real second pass too: a lotus base, a seated
cross-legged silhouette instead of a shape that read as a plain cone,
hands in dhyana mudra. Three more Hindu texts shelved — Wilkins'
*Hindu Mythology, Vedic and Puranic* (1900, real chapters on both Shiva
and Ganesha) and an original steward's telling of why Ganesha is
invoked before any undertaking, kept beside the statue as its own
practice, not just a myth. Library: **35 → 44 texts.**
`USER-DATA-MANAGEMENT-PLAN.md` written — export/import/reset already
exist and work; the real gaps are visibility (no way to see what's in
your save) and granularity (all-or-nothing, no selective pruning).

**Done since then (also 2026-07-09):** `READING-TO-DOING-PLAN.md` step 1
— the same "bring to today's plan" bridge that already worked for book
notes now works for Research Desk notes and Grant Desk documents too,
reusing the exact same `sparks` data, same UI pattern. A real security
gap found and closed the same day: the MinIO container's ports were
bound to `0.0.0.0` (reachable from anywhere on the local network, not
just this machine) despite `LIBRARY-SCALING-PLAN.md` always claiming
localhost-only — confirmed via `docker inspect`, not assumed, then
fixed by recreating the container bound to `127.0.0.1` only, verified
after with `netstat` and by confirming existing book data survived the
recreate untouched.

**Done since then (also 2026-07-09):** `READING-TO-DOING-PLAN.md` closed
out — steps 2-4 (a `done` flag on every spark, an opt-in "carry forward
what's still open" toggle on the Writing Desk, and a new "📋 Still Open"
pause-menu panel showing every not-done spark across all three sources,
oldest first) shipped together. `USER-DATA-MANAGEMENT-PLAN.md` closed out
too — a "📊 Your Data" pause-menu panel (real save size, counts across
planner days/notes/projects/badges/activity) plus "clear old planner days
before a date," the one real pruning gap; per-project removal turned out
to already exist (each Research/Grant Desk project already has its own
"Delete project" button) so nothing needed duplicating there. All of it
verified live, not just read: a synthetic old save missing half its
fields (predating `settings`, `activityLog`, `badges`, and more) imported
clean through the real Import Save button in an actual browser, every
missing field fell back to its default, and a legacy spark with no `done`
field at all correctly showed up as open — then toggling it done and
pruning old days both worked and updated the Data panel's counts live.

**Done since then (also 2026-07-09):** a second session's worth of raw
feedback — jotted straight into this file after a local wifi drop cut
that session short — triaged into `BETA-TESTING-FEEDBACK.md`'s "Round 2"
properly, 11 real items, each checked against the actual code. The
Mountain Monk's actual role, corrected the same day: he's chat-only now
— spiritual counsel, text recommendations, helping visitors find their
own intentions, holding people to a higher moral standard, Native
American tradition held close alongside Buddhism and Vedanta as
something nearer his own path than a third subject — and the "draft a
plan from this conversation" button that used to live on him moved to
Quill, whose own role now explicitly includes turning a conversation
into an actual saved course/study/practice plan, alongside the Library
help she already gives. Two new plans written from that same triage:
`WRITING-DESK-PLAN.md` (the actual current-state breakdown of the
Writing Desk's eight stacked sections, plus a real 4-step fix — since
built, see below) and `LOCAL-AI-MONITORING-PLAN.md` (what Ollama's
`/api/ps` already gives for free today versus what real CPU/GPU tracking
would actually need — still plan-only, on purpose), paired with a new
`LEARNING-PATH.md` Stage 16 teaching the concepts behind the second one.

**Done since then (also 2026-07-09):** `WRITING-DESK-PLAN.md` built, not
just planned — the page (`#planIntent`/`#planEmber`) is the desk now,
auto-saving the same way `chatNotes` already did elsewhere, with blocks/
sparks/Ask the Steward/past days moved into a real collapsible toolbox
and due-soon items left visible outside it, as the plan called for.
**Asked for directly alongside the redesign:** "🗂 My Notes," a real
filing cabinet in the toolbox — freeform, named, dated notes kept across
days, separate from today's page, with its own create/edit/delete flow
and the same auto-save pattern; a smaller, Writing-Desk-scoped answer to
"file papers and make notes," not the bigger cross-app file-tree idea,
which stays out of scope on purpose (see `WRITING-DESK-PLAN.md`).
Verified live in a real browser, not just built: every toolbox panel
opens correctly, the page auto-saves, and a filed note survives an
actual page reload. The repo's own plan/tracking docs (eleven files —
every `*-PLAN.md` plus `BETA-TESTING-FEEDBACK.md`) moved into a new
`plans/` folder the same day, decluttering the root down to `README.md`,
`LEARNING-PATH.md`, and `API-AI-INTEGRATION-PLAN.md` — every link and
cross-reference to a moved file updated to match, checked directly, not
assumed.

**Done since then (2026-07-10):** a dropped-session's worth of raw beta
notes (an MCP auth issue cut the previous session short) triaged into
`BETA-TESTING-FEEDBACK.md`'s "Round 3," then four of its small, bounded
items actually fixed the same day: the Mountain Monk's own reasoning —
generated every reply once `think:true` was already set for him, then
silently discarded before it ever left `provider.js` — is now captured
and shown, collapsed, under a "💭 thought for a moment" toggle; Export
Save gets a real native save-location picker in the desktop app instead
of always dropping into Downloads; a real spell-check right-click menu
now works there too (Chromium's own suggestions were already on, just
never wired to a menu); and Quill's own prompt now points to the Request
Board when asked to fetch a book live, the same honest browser-limit
framing the Steward's prompt already had. Two long-term plans written
the same day, deliberately not built yet: `EIGHTFOLD-PATH-TEMPLE-PLAN.md`
(the Keep reimagined as a real, walkable Noble Eightfold Path, grounded
in the already-shelved Dhammapada, each fold tied to something real
already in the Pavilion rather than a plaque trail) and
`TOOL-COMMONS-PLAN.md` — the actual long-term vision for what this whole
project is reaching for past beta: not an in-game tool-builder, not a
promise to build every visitor's own CRM for them, but a local commons
of small tools (the Caravan scripts already an early, unnamed version of
this) plus a real `LEARNING-PATH.md` capstone teaching someone to build
their own, on their own foundation, for their own real need. Raised
alongside it, and folded into that same plan: a **bare-bones foundation
vs. Zac's own customizations** split — the concrete mechanism this
project's own "a Pavilion, not *the* Pavilion" hope (below) was always
missing.

**Done since then (also 2026-07-10):** the Eightfold Path Temple plan and
the Workshop's own sketched rooms both got built the same day, visuals
first, exactly as asked — real backend features are still open, on
purpose. The Keep gained all eight real signs, walked south to north in
canonical order, paired left and right down the corridor the same way
the Buddha and Ganesha shrines already are. The Workshop grew from one
room into three real floors — bigger on the inside than its outdoor
footprint, same trick the Library already uses, just extended upward
with a real staircase: the ground floor unchanged, a real Records Hall
one floor up (a distinct station, a real hand-kept timeline panel — not
yet reading `archive/dev-log-*.txt` live, that's the next real work),
and an "unfinished floor" above that holding the other five sketched
rooms, each with its own real, distinct visual (the Ledger's ruled
columns, the Maker's Bench's half-built birdhouse, the Greenhouse's
young sapling, the Round Table's four empty stools, the Mailroom's
waiting letter) and an honest "not open yet" reply when pressed — no
pillars on that floor, on purpose, so sparser reads as unfinished rather
than just saying so. All of it verified live against the actual running
game via Playwright, not just read — every room walked into, every panel
opened, every sign's real text confirmed on screen, the same discipline
this project has held itself to since the Ganesha statue's own two-pass
screenshot check.

**Done since then (also 2026-07-10):** the Local AI panel's remaining
two steps built and verified — every provider's `chat()` now tracks its
own elapsed time, so the activity log gets a real "(2.3s ·
llama3.2:latest)" tag for free, and the panel itself gained a "Today's
session" card (real-ask count, total/average time, per-model breakdown)
built entirely from that same log. The Caravan Desk gained a real
drag-and-drop intake — drop a `.txt` file, pick a known source, and the
existing manual-entry form fills itself in (title, author, and a real
license string per source), verified live end to end including the
unrecognized-source path, which now actually creates a real Research
Desk project ("Caravan Drops") instead of touching the shared queue.
`library-draft.py` also gained a local-AI-assisted `--ai-draft` flag for
the terminal half of the same pipeline, suggesting a summary and
tradition that stay clearly marked as suggestions, never final, and
never touching license or source. The Caravan Desk's own list view
gained a plain answer to "why can't I just paste a URL," right at the
point someone actually asks it. And `COURSE-BOARD-PLAN.md` got written
— a real 3-stage plan (personal now, real sharing standards next, a full
free course site further out) turning the Course Board's own scaling
complaint into a real roadmap instead of one undefined ask; paired with
a direct decision that `TOOL-COMMONS-PLAN.md` becomes real once this
Pavilion actually opens its beta to other people, not before.

**Done since then (also 2026-07-10):** the **pocket phone** — a chat can
now be minimized with a 📱 button into a small floating card, freeing you
to walk the grounds or read a book while a slow local model thinks; the
card buzzes when the reply lands and taps back into the same conversation
intact. It's a display trick, not a device (`state.dialog` just stays
alive while its overlay hides) — the *real* in-world phone, gathering
already-built features into one glanceable home screen, is written up as
a future piece in [`PHONE-PLAN.md`](plans/PHONE-PLAN.md), explicitly bound
by the same no-background-polling rule as the rest of the AI. (A resident's
own reasoning is already folded into the conversation under a collapsed
"💭 thought for a moment" toggle; watching it stream live remains the
separate, bigger piece flagged in `AI-INTEGRATION-NOTES.md`.)

**Done since then (also 2026-07-10):** **Course Board Stage 1** built (see
[`COURSE-BOARD-PLAN.md`](plans/COURSE-BOARD-PLAN.md)) — the board now has a
real category axis (Practice / Study / Skill / Work / Health / Personal),
a search box and category chips that mirror the Index panel's own pattern,
and a real **archive** state distinct from deletion, so a finished or
set-aside course becomes kept personal history instead of being erased
(archived courses also stop nagging the upcoming-due badge). AI-drafted
courses now suggest a fitting category too, still just a suggestion you can
change before pinning. All personal and local — sharing standards are
Stage 2, deliberately not touched yet.

**Done since then (also 2026-07-10):** a **±10-second skip** on the book
read-aloud (beta #6) — the Web Speech API can't seek, so it's done by
tracking word boundaries and re-speaking from a new offset; feels like a
podcast skip. The **Library grew to 49 texts** — five HTTP-verified
public-domain books (Franklin's *Autobiography*, Emerson's *Essays*, Sun
Tzu's *Art of War*, the full *Zhuangzi*, *Aesop's Fables*) added to the
`seed.js` source of truth and promoted into the live Supabase library, so
they're on the shelves now. And two decisions got recorded: the
foundation/extras **unlock mechanic** (walk up, see the requirement,
unlock by learning-what-it-does or walking a short learning path — tutorial
deferred to beta; see [`FOUNDATION-AND-EXTRAS.md`](plans/FOUNDATION-AND-EXTRAS.md)),
and beta #24's "priority shelf" closed in favor of letting the local AI
advise on what to read given the visitor's real situation, uploaded books
included.

**Done since then (2026-07-11):** Sebastian's calendar built — the "last
key" v1 is code-complete (see his section just below). Alongside it, two new
plans written from a direct steer on what the beta actually is:
[`BETA-LAUNCH-PLAN.md`](plans/BETA-LAUNCH-PLAN.md) (keep the core small, ship
real outlets to link your own local AI, a welcome packet of books, and let
people fill the Pavilion themselves — plus the resolution to the Monk model
risk: he's *definitely* in the beta because guidance is what people lack, and
the pre-launch task is to curate a tiered set of models he runs well on
across modest/mid/beefy machines, not to exclude thinking models) and
[`NOTES-AND-LOG-ROOM-PLAN.md`](plans/NOTES-AND-LOG-ROOM-PLAN.md) (the Records
Hall today shows the *Pavilion's* hand-kept history, not *your* notes; the
real want is one place to see the five scattered personal-note stores
gathered and organised for the long term, with Sebastian as concierge —
likely repurposing the Records Hall to hold it).

**Done since then (also 2026-07-11): the beta build, actually built — on
the `beta` branch.** `BETA-BUILD-PLAN.md` walked end to end in one session:
**(1) the personal library** — every Caravan-queue item now has a "👤 Shelve
on Your Shelf" button, the whole no-infrastructure local path: the catalog
card lives in `data.personalLibrary` (save-migrated), the full text lives as
a plain file in the desktop app's own data folder via three new bridge
handlers (slug-locked names, no path traversal), with an inline-in-save
browser fallback that refuses oversized books honestly; a real **YOUR SHELF**
station stands in the Library by the reading nook (`openShelf('Personal')`),
personal books carry a 👤 badge + "Remove from Your Shelf" in the Reader,
ride along in the Index/Quill's grounding automatically via a `Store`
getter-merge, and never mix into the six certified shelf blocks — the
provenance split, built. **(2) local-only build mode** — `.env.beta`
(committed; it *empties* the service vars) + `build:beta`/
`electron:build:beta` scripts; the built bundle verified to contain **zero**
mentions of the Supabase project ref, key, or `supabase.co`. **(3) first
arrival** — a welcome overlay (keys, the three doors, how residents start
talking, "nothing phones home") that auto-shows exactly once on a genuinely
fresh save, then lives behind the title screen's "🧭 New here?" button.
**(4) the model on-ramp** — the tiered pull guide (modest → strong machines)
in `PROTOCOLS.md` Protocol 2 and as a 📏 collapsible in the Connections
panel; `bestLocalModel()` deliberately untouched — the Monk keeps the
largest model, guidance not downgrade. A real installer built from all of
it: `release/Sand Pavilion Setup 0.1.0-beta.1.exe`, unsigned on purpose.
**Still open, stated honestly:** a live click-through of shelve→read in a
running window, and the clean-machine install test (§6.8) — the one thing
only different hardware can prove.

**The last key before beta: Butler Sebastian — v1 now code-complete
(2026-07-11).** Sebastian is the third resident, and the division is
clean: **Quill teaches** (the Library, turning a talk into a plan), **the
Monk guides** (meaning, conduct, finding your intention), and **Sebastian
works with you** — the helper who actually gets the day done. He lives in
the **Workshop**, the working counterpart to the Monk's Temple. Talk to
him: a `BUTLER_CHARTER` (warm like the residents, secular and goal-agnostic
like the work tools), grounded in the real state of your day, with a
**"send this plan to today"** button that drops a schedule he drafts into
your daily plan (read-aloud lets you *listen* to it). And now his back half
is built too — a real **calendar** at his desk: a month grid, a day view,
an add-event form, with events folded into the same due-date spine the HUD
badge and Upcoming panel already read, so there's one honest picture of the
day, not three. At the top of the calendar sits his **advisory read** —
"you've three things on the books today, something may have to give," or
"the day's a blank page so far" — computed the moment you open it, **with
no AI connected at all** (and richer when one is), never on a background
timer. Full design and build order, plus an honest note that the one thing
left is a live click-through in a running window, in
[`BUTLER-SEBASTIAN-PLAN.md`](plans/BUTLER-SEBASTIAN-PLAN.md). The honest
tradeoff, stated in the plan: he's more AI than the Pavilion has leaned on,
real hardware cost — but bounded by no-background-polling, and exactly what
the sleeper-car resource choice was saving room for. **Still open before
beta:** the AI-reliability pass (the Monk's `bestLocalModel()` still hands
him the largest installed model, often an unreliable thinking one — a live
gap in `provider.js`, not yet fixed) and a clean "someone who isn't Zac can
run this" path (first-arrival orientation + a clean-machine install).

1. **Grow the Library toward a much bigger real dataset** — actively in
   progress, 49 live texts across 9 shelves; see
   [`LIBRARY-GROWTH-PLAN.md`](plans/LIBRARY-GROWTH-PLAN.md) for the curated
   source list and which connectors (Wikisource, OpenStax, Internet
   Archive) are worth building next.
2. **Giving AI residents actual bodies, not just voices** — see
   [`AGENT-EMBODIMENT-PLAN.md`](plans/AGENT-EMBODIMENT-PLAN.md): a bounded
   first version (one resident, one real action, like Quill reading a
   shelved book during an idle tick) before any general action API.
   Direct service to "find direction" — a resident who's actually doing
   something, not just answering when spoken to.
3. **A "Local AI" panel — step 1 built 2026-07-10** (see
   `LOCAL-AI-MONITORING-PLAN.md`): a real "🧠 Local AI" panel in the pause
   menu, reading Ollama's own `/api/ps` for every currently-loaded
   model's memory footprint and GPU residency, verified live against a
   real running Ollama instance. **Still open:** per-action elapsed-time
   logging and a running session summary (steps 2-3, small, no new
   dependency); real CPU/GPU percentage stays a separate, later,
   desktop-only step needing a new package in Electron's main process.
4. **A real color/appearance picker** — see
   [`CHARACTER-CUSTOMIZATION-PLAN.md`](plans/CHARACTER-CUSTOMIZATION-PLAN.md),
   written down 2026-07-08 after the sprite redesign made it a real
   foundation instead of a placeholder. A genuine system (persisted
   data, threaded through every render site), not a quick add.
5. **A friendlier wrapper around the Caravan scripts** — worth
   confirming it's still wanted before it's built, now that the
   terminal tools work well on their own and `library-inbox/` covers
   manual sourcing.
6. **A machine-that-isn't-the-dev-machine test for the desktop app** —
   Phases 1-4 done and proven live (2026-07-08), including actually
   running the packaged installer itself (not just dev mode) for the
   first time. The one thing still genuinely unverified: a clean
   install on hardware that was never used to build it.
7. **Finish the production auth setup** — add the Vercel URL to
   Supabase's Auth redirect-URL allowlist, grant a real steward role, and
   verify moderation with an actual session — whenever the Commons comes
   back off pause.
8. **The Eightfold Path Temple, real behind the signs** — built
   2026-07-10 (visuals; see
   [`EIGHTFOLD-PATH-TEMPLE-PLAN.md`](plans/EIGHTFOLD-PATH-TEMPLE-PLAN.md)).
   All eight stations stand in the Keep now, real canonical order,
   grounded in the shelved Dhammapada, each tied to something already
   built. **Still open:** whether this counts as bare-bones foundation
   or a Zac-specific addition (see `TOOL-COMMONS-PLAN.md`, #10 below) —
   still undecided on purpose; and any real interactive layer past
   reading a sign — a keepsake, a small practice tied to each fold —
   genuinely later work, not assumed to be the same size as the visuals.
9. **The Workshop's five sketched rooms, real behind the walls** —
   built 2026-07-10 (visuals; three real floors now, not one room — the
   ground floor unchanged, a real Records Hall one floor up, and an
   "unfinished floor" above that holding the other five). **Still
   open**, each its own real feature, not assumed to be similar work:
   - **The Ledger** — real budget-tracking, the direct answer to
     actually beta-testing this as an office; pairs with Wealth of
     Nations and Ten Acres Enough's "real numbers, not general
     encouragement" already on the shelves.
   - **The Maker's Bench** — a home for real-world physical projects
     (a build, a repair, a garden), distinct from the Grant Desk's
     funding focus and the Research Desk's thinking-through focus;
     matches The Boy Mechanic and the homesteading texts already added.
   - **The Greenhouse** — something that visibly grows over real
     calendar time, not game-time — the same patience the four
     postures and the Daoist shelf already teach, made literal; a
     natural home for the sketched beaver/companion idea ("a creature
     that teaches by living its own life near you").
   - **The Records Hall** — the panel exists and opens now, with a
     real, hand-kept timeline; still not reading `archive/dev-log-*.txt`
     live, the one piece of actual backend connection this room still
     needs.
   - **The Round Table** — a real co-study room for the "free place to
     pursue higher education together" hope; the already-sketched Five
     Animals practice track is the obvious first real occupant.
   - **The Mailroom** — a home for the `Waypoints` feature (external
     links), which already exists in the pause menu with nowhere in
     the world that's actually *about* it.
10. **The Tool Commons — the "soon" slice** — see
    [`TOOL-COMMONS-PLAN.md`](plans/TOOL-COMMONS-PLAN.md), written
    2026-07-10, the long-term vision behind the whole project past beta.
    Not the in-game no-code builder (considered, set aside as too big a
    first step) — the real near-term piece is a `tools/commons/` folder
    convention with the Library's own what/who/license discipline
    applied to tools instead of texts, seeded with the Caravan scripts
    reframed as its first real entries, plus a `LEARNING-PATH.md`
    capstone stage teaching someone to actually build and run one small
    tool of their own. The rest — a real registry browser, local-AI-
    assisted tool generation, an eventual in-game builder — stays
    genuinely long-term, named so it isn't lost, not promised. See
    "Hopes and dreams" below for the fuller vision.
11. **A drag-and-drop book intake at the Caravan Desk — built 2026-07-10**
    (see [`BOOK-DRAG-DROP-PLAN.md`](plans/BOOK-DRAG-DROP-PLAN.md)). Pick a
    source website, drop a `.txt` file, and the Pavilion fills in the
    rest of the existing manual-entry form instead of retyping it by
    hand — title/author detected, license pre-filled per source, never
    auto-confirmed. An unrecognized source routes to a real Research
    Desk project ("Caravan Drops") instead of the shared queue, verified
    live. **Still open:** `.pdf` support, and real Electron filesystem
    integration (writing straight to `library-inbox/`, invoking
    `library-draft.py` directly) — a browser genuinely can't do either,
    so both stay later, separate phases, not assumed to be the same
    amount of work as the `.txt` path that's live now.

## Hopes and dreams

The short version: a Pavilion, not *the* Pavilion — anyone able to stand
up their own instance and optionally open a gate between two. Residents
who keep living and noticing each other while the tab's closed, not just
waiting frozen for you to walk up. Proof, sitting in a browser tab, that
a rich AI-mediated commons never had to watch you, sell you, or lock your
words up to work. Checked directly, not assumed, 2026-07-09: this is
already true today, not just aspirational — see `DESKTOP-APP-PLAN.md`'s
"Could someone else clone this and build their own?" for the real
verification (MIT license, a git history confirmed clean of any
secret, ever, and a zero-config fallback that already builds a working
desktop app off the seed Library with no Supabase project required).
**The one piece that hope was always missing, named 2026-07-10:** a real
seam between the bare-bones foundation (the engine, the core mechanics)
and this particular Pavilion's own additions (the curated Library, the
Buddhist/Hindu Keep, the charter's exact wording) — see
`TOOL-COMMONS-PLAN.md`'s "bare-bones foundation vs. Zac's own
additions." Without that seam, forking this today means forking both,
tradition and all; with it, someone else's fork keeps the foundation and
brings their own tradition, their own shelf, their own shape.

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

Every visitor draws as an actual cultivation-sect disciple now, not a
plain colored rectangle — a real robe silhouette, a sash, draping
sleeves, hair with a topknot (redesigned 2026-07-08; the player's own
robe is purple and black). Still just one fixed look, though. The real
ask, and the actual reason the redesign happened first: **pick your own
robe color**, and eventually a **hairstyle** — a real character-creator
moment, not just a palette swap. See
[`CHARACTER-CUSTOMIZATION-PLAN.md`](plans/CHARACTER-CUSTOMIZATION-PLAN.md)
for the real scope: a character-creator UI, persisted appearance data,
and every place a player sprite renders (the overworld, every interior,
all three meditation poses) threaded to actually draw it.

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

### The best home office anyone's ever had (2026-07-08, asked for explicitly — go big)

Everything below is speculative, not scoped — the point of this section
is to not lose a good idea, same as the rest of Hopes and Dreams, not to
promise it. Held against the actual north star (ease, direction,
knowledge into use):

- **A real morning briefing, opt-in and passive** — the Steward already
  sees due items, recent embers, and today's sparks; the natural next
  step is a single "here's your day" moment when you first open the
  Study, generated once, sitting there to read or ignore — never a
  popup, matching the standing automation rule this project already
  holds itself to.
- **A real weekly/monthly review** — the Steward drafting an actual
  look-back from a stretch of planner days and sparks, the same way the
  Monk can already draft a training plan from a conversation. The
  journal already holds the raw material; nothing reads it back at
  range yet.
- **Voice in, not just voice out** — TTS already reads books and NPC
  replies aloud; the missing half is speaking *to* Quill, the Steward,
  or the Monk instead of typing, using the browser's own free
  `SpeechRecognition` API — same "no paid cloud API" rule that already
  governs TTS, applied to the other direction.
- **Research papers actually readable in-game** — the 2026-07-08
  priority above, not a someday idea; a home office where the papers
  you pulled in still have to be opened in a separate PDF reader isn't
  actually one place yet.
- **Your own documents, not just the shared Library's** — a real
  "bring your own PDF/doc" import into the Archive Desk (personal,
  never shared), with the Research Desk's assistant able to actually
  read and summarize it — the same trust boundary already drawn for
  pasted text, extended to files.
- **The Commons back off pause, for real cross-device use** — Supabase
  save sync already exists and already works; a home office spanning a
  desktop and a laptop is the actual use case it was half-built for.
- **A genuine focus mode for the desktop app** — a minimal, borderless
  window onto just the Writing Desk or Research Desk, for when the
  point is getting work done, not walking through a world to get there.

### AI worth everyone actually having (2026-07-08, asked for explicitly — go big)

The pitch this project is quietly sitting on, stated plainly instead of
implied: **an AI companion that never phones home, never trains on you,
never asks for a subscription, and belongs entirely to the machine it
runs on.** Every AI-mediated product most people have used trades
presence for surveillance; this one doesn't have to, because it
technically can't — there's no server collecting anything, by
construction, not by policy. That's not a feature to add. It's already
true, and mostly just needs saying out loud as the actual point.

What would make that pitch undeniable instead of just true:

- **Real embodiment** — see `AGENT-EMBODIMENT-PLAN.md`; a resident who
  acts, not just answers, is the difference between "a chatbot skin on
  a game" and something that actually feels like it lives there.
  Everything else in this section is secondary to this one.
- **Residents who keep living while the tab's closed** — the harder,
  later half of embodiment: a small always-on process (not a browser
  tab) driving the same `scenes.js`/`entities.js` world state headless,
  the way `test/smoke.mjs` already proves is possible without a
  browser at all. Come back tomorrow, and Quill actually did something
  today, not just waited.
- **Federation — a Pavilion, not *the* Pavilion.** Anyone able to stand
  up their own instance from this same codebase, and optionally open a
  gate between two — visit a friend's Library, meet their residents,
  without either Pavilion being owned by a platform in the middle. The
  save export/import already built this session's precursor idea
  (carrying a Pavilion in a file) is the honest first step toward this,
  already shipped, not just imagined.
- **The Pavilion as an open protocol, not one codebase** — a documented
  shape (what a resident is, what a shelf entry is, what a charter is)
  that other implementations could speak, the way email or ActivityPub
  are protocols many programs implement rather than one company's app.
  The furthest-out idea here, and the one that would matter most if it
  ever actually happened.
- **A real accessibility pass** — text scaling, a colorblind-safe
  palette, fully remappable keys. Not urgent for one person on one
  machine; genuinely load-bearing before "worth everyone having" is
  true rather than aspirational.

### A commons of tools, not just texts (2026-07-10, the long-term vision)

The actual bar, stated directly and kept close to how it was said: a
friend who's a full-time teacher wants to get back into real-estate
side income and needs a CRM — not a hypothetical, the real test every
design decision in `TOOL-COMMONS-PLAN.md` gets held against. **This
project's job was never to build that CRM.** It's to already have the
foundation — local storage, a local AI that can help, a working example
built the right way, and a real teaching path — so a motivated,
non-expert person can build *their own* thing on it, for a need nobody
here ever anticipated. "I don't want to build these features for him,
but have the Sand Pavilion be a place where he can find the knowledge
and tools needed for himself" — the actual mission statement this
project has been circling since "everything turns to sand, so give it
away first."

Concretely, not an in-game no-code builder (weighed and set aside as too
big a first step) — a local, file-based commons of small tools, the same
what/who/license discipline the Library already holds applied to code
instead of text, with `tools/caravan/`'s eight connector scripts as its
first, already-existing, unnamed entries. The building half is teaching,
not a builder UI: a real `LEARNING-PATH.md` capstone using the exact
pattern the Caravan and the Workshop desks already prove works. Local AI
becomes the actual assist once that pattern's learned — "help me turn
this template into a client tracker" — not a code-generation platform on
day one. See `TOOL-COMMONS-PLAN.md` for the full staging, and its
bare-bones-foundation-vs-personal-additions split for the mechanism that
makes any of this shareable beyond one person's own Pavilion.

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
- `archive/dev-log-2026-07-09.txt` — the Keep's Ganesha statue and the
  Native American shelf, sparks/Your-Data closing out, a dropped
  session's raw notes triaged for real, the Monk/Quill role split, the
  Writing Desk rebuilt with a real "My Notes" filing cabinet, a local-AI
  monitoring plan, and every plan doc moved into `plans/`. See
  [`CLAUDE.md`](CLAUDE.md), written the same day, for the two standing
  decisions that came out of it: the desktop app is the main focus now,
  and new work gets built here first, not bolted on from a third party.
- `archive/dev-log-2026-07-10.txt` — the whole beta list walked end to
  end (the Local AI panel, the drag-and-drop book intake, book-note
  pages, Grant Desk drafting, and more), three new Workshop floors and
  the Eightfold Path Temple built visuals-first, the sleeper-car design
  philosophy written down, and a real AI fix: the lesson planner (and
  every practical work tool) made subject-neutral so it serves any goal,
  not just Buddhist ones. See
  [`AI-INTEGRATION-NOTES.md`](plans/AI-INTEGRATION-NOTES.md), written the
  same day, for the honest accounting of how the AI actually works, what
  it costs to run inside a game, and the standing rule: effectiveness
  before features or extra personalities.
- `archive/readme-2026-07-07-full.md` — a full snapshot of this file
  before its second trim, including detailed design essays not carried
  forward into the current version.

This README stays a current-state reference — what's actually true
right now, what's still open — not a scrolling changelog.

The one line worth keeping without reading further: *everything turns to
sand, so give it away first.*


