# Sand Pavilion — Protocols

A **protocol** here is a clear, repeatable pathway for doing a real thing in
the Pavilion — written so a newcomer can actually follow it, and so it can be
*taught*, not just done by whoever built it. This is the growing-your-own-
Pavilion manual: how you fill the place up yourself, the same way it was
filled to begin with.

Each protocol is honest about what the game does for you and where a real
wall means you step outside and do a piece by hand. That honesty is the
point — a commons that pretends to be more self-sufficient than it is just
breaks trust with whoever's using it.

**Protocols in this file:**
1. [Adding a book to the Library](#protocol-1--adding-a-book-to-the-library) — the important one, two pathways
2. [Connecting your own local AI](#protocol-2--connecting-your-own-local-ai) — so residents talk back
3. [The terminal toolkit](#protocol-3--the-terminal-toolkit) — every useful command in one place
4. [More to come](#more-protocols-to-come)

---

## Protocol 1 — Adding a book to the Library

The Library is meant to grow, and you grow it. There are **two real
pathways** — one with no terminal at all, one through the actual pipeline —
and they meet at the same place: nothing is shelved until a human has
vouched for what it is and where it came from.

### The one rule everything else follows: provenance first

**A shelf entry is a claim you are making about a real text's real
provenance.** Before anything else, you need to know, for the exact edition
you have:

- **Its license** — it must be genuinely free to redistribute: **Public
  Domain**, **CC0**, or **CC-BY** (attribution kept). "Free to read" is *not*
  the same as "free to redistribute" — a book you can read on a publisher's
  site may still be copyrighted. When in doubt, don't shelve it.
- **Its source** — the exact page/URL it came from, not "I found it online."

This is the one step nothing here can automate, because it isn't data entry —
it's a person standing behind a claim. Every existing book on the shelves
passed this bar; so does yours.

### Where to get legitimately-free books (the index)

Fuller list with license notes in
[`plans/LIBRARY-GROWTH-PLAN.md`](plans/LIBRARY-GROWTH-PLAN.md); the
`library-inbox/` subfolders are that same list made into real folders. The
dependable ones:

| Source | What it's good for | License |
| --- | --- | --- |
| [Project Gutenberg](https://www.gutenberg.org) | 75,000+ classic books, clean plain text | Public Domain (US) |
| [Standard Ebooks](https://standardebooks.org) | Beautifully re-typeset classics | Public Domain |
| [Wikisource](https://wikisource.org) | Crowd-transcribed public-domain texts | Public Domain |
| [Internet Archive – Texts](https://archive.org/details/texts) | Huge scanned collection; use "Full Text" | Varies — check each |
| [SuttaCentral](https://suttacentral.net) | The Buddhist canon (Sujato's tr. is CC0) | CC0 / varies |
| [Perseus / Internet Classics Archive](http://classics.mit.edu) | Greek & Latin classics | Public Domain (mostly) |
| [OpenStax](https://openstax.org) | Real college textbooks | CC-BY |

If you pull repeatedly from a source that *isn't* on this list, that's a
signal — see "why sorted by source" in
[`library-inbox/README.md`](library-inbox/README.md).

### What format the file needs to be

**EPUB and plain text (`.txt`) both work directly** — and EPUB is the format
most free-book sites actually hand you (Standard Ebooks, Gutenberg's "EPUB"
download, most library exports). You do **not** have to format anything by
hand:

- **`.epub`** — just drop it on the Caravan Desk (Pathway A below). The game
  unpacks it right there — no conversion, no terminal, no upload — reading the
  book's own chapter order and dropping the title-page/colophon boilerplate
  automatically. (An EPUB is really a zip of chapter files; the Pavilion reads
  that structure directly, with nothing external.)
- **`.txt`** — works too; most sites offer a "Plain Text UTF-8" download.
- **`.pdf`** — one extra step first, since a PDF is page-layout, not text:
  `python tools/caravan/pdf-to-text.py <file.pdf>` turns it into shelf-ready
  text. (For EPUB from a terminal instead of in-game, the equivalent is
  `python tools/caravan/epub-to-text.py <file.epub>`.)

### Pathway A — no terminal (inside the game)

For when you just want to add a book without touching a command line.

1. Get an **`.epub`** or **`.txt`** of the book from a source above.
2. In the game, walk to the **Workshop** and face the **Caravan Desk**
   (west pillar); press **E**.
3. Choose **"+ Add a text by hand,"** and **drag your `.epub` (or `.txt`)
   onto the drop zone**. An EPUB is unpacked in the game on the spot — title
   and author fill themselves in from the book's own metadata.
4. **Pick which site it came from.** If it's a known source, the title,
   author, and a correct **license string fill in automatically**. Write a
   short honest **summary** in your own words.
5. **Submit.** It lands in the **Steward Review Queue** — *nothing is shelved
   until it's reviewed*. (You're the steward right now, so you approve your
   own; the queue exists for when more than one person submits.)
   - An **unrecognized source** routes to a **Research Desk project** ("Caravan
     Drops") instead of the shared queue — your own notes, not the public
     shelf, until its provenance is sorted.
6. **Press "👤 Shelve on Your Shelf."** This is the whole local path — no
   database, no container, no terminal. The book lands on **Your Shelf**, the
   small personal case by the Library's reading nook, readable in the Reader
   like any other text. In the **desktop app** its full text is stored as a
   plain file in the app's own data folder on your disk; in a browser it lives
   inside your save (very large books need the desktop app).

**The provenance split, stated plainly:** a book you shelve this way is
**personal — yours, marked 👤, kept apart from the certified shelves.** The
six certified shelf blocks carry texts whose license and source a steward has
stood behind; Your Shelf carries what *you* brought in, on your own judgment.
Both are first-class citizens of the Library (the Index lists them, Quill
knows them) — the label just always tells the truth about who vouched.

*This pathway handles `.epub` and `.txt` in the game directly. PDF-in-the-game
and writing straight to `library-inbox/` are real browser limits — use Pathway
B (or the `pdf-to-text.py` / `epub-to-text.py` converters) for those.*

### Pathway B — with a terminal (the real pipeline)

The full pipeline, the same one the Caravan connectors feed into. Exact
commands live in [`library-drafts/README.md`](library-drafts/README.md); this
is the shape:

1. **Get the text into `library-sources/`.**
   - Gutenberg has an ID? `python tools/caravan/gutenberg.py <id>`
   - Otherwise download the `.txt` by hand and drop it in
     `library-inbox/<source>/` (the folder matching where it came from).
   - Raw text is *not* the Library — it's raw material. The Library stores a
     card (title, license, source, summary), and — separately — the full text
     in local storage.
2. **Start a draft.**
   `python tools/caravan/library-draft.py library-sources/<file>.txt`
   — detects title/author from a Gutenberg-style header; **never** guesses
   license or tradition (those stay `TODO` until *you* decide them). Add
   `--ai-draft` to have your local Ollama model *suggest* a summary and
   tradition, always clearly marked as a suggestion, never final.
3. **Fill the draft in** (`library-drafts/<slug>.md`) — tradition, **license**,
   **source URL**, attribution, and the real work: a summary and 2–3 sections
   in your own words. See [`library-drafts/_TEMPLATE.md`](library-drafts/_TEMPLATE.md).
   This is the provenance-first rule made concrete — the script refuses to
   promote a draft that still says `TODO`.
4. **Promote it onto the shelves.**
   `python tools/caravan/promote-draft.py library-drafts/<slug>.md`
   — parses the draft, refuses if license/tradition are still `TODO`, and
   inserts it into Supabase's `library_documents`. **Live in the game
   immediately, no code deploy.** (Needs `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` set — `--help` explains.)
5. **Optional — attach the full text** so the Reader's "📖 Read the full text"
   button works:
   `python tools/caravan/push-fulltext.py <slug> library-sources/<file>.txt --translator "..." --source-url "..." --license "..."`
   — uploads the real text to this machine's **local MinIO** (needs Docker's
   `sand-pavilion-minio` running). Until this step, the book is readable as
   its summary card only.

### Two honest facts about "live"

- **The catalog card lives in Supabase; the full text lives in local MinIO.**
  A book can be shelved (card visible, searchable) before its full text is
  pushed — that's the catalog-only state.
- **Supabase rows replace the seed, they don't merge.** If Supabase is
  configured, editing `seed.js` alone won't show up live — the promote step is
  what makes a change appear. (Both `seed.js` and Supabase should be kept in
  step for a change meant to be permanent.)

---

## Protocol 2 — Connecting your own local AI

So Quill, the Monk, and the others actually talk back. Full beginner's walk-
through (installing Ollama, the `OLLAMA_ORIGINS` step, troubleshooting) is in
the main [`README.md`](README.md#setting-up-local-ai--a-beginners-guide);
the short version:

1. Install [Ollama](https://ollama.com) and pull a model —
   `ollama pull llama3.2` (fast, reliable; see the picking guide below).
2. Allow the game to reach it:
   `setx OLLAMA_ORIGINS "http://localhost:5173,http://localhost:5174"`,
   then restart the terminal. **The desktop app skips this step entirely** —
   its own native process talks to Ollama directly, no CORS rule involved.
3. Open the game — the title screen reports what it found. Manage everything
   from **⚙ Manage AI connections**.

Everything stays on your machine. Nothing is sent anywhere unless you
deliberately add a ☁ cloud connection.

### Which model should I pull? (the tiered guide)

The honest tradeoff, learned here the hard way: **plain "instruct" models
answer fast and reliably; "thinking"/"reasoning" models (`deepseek-r1`,
`qwq`, the `qwen3` reasoning family) spend a long, hidden stretch reasoning
first** — sometimes minutes, sometimes coming back blank. The Pavilion now
streams that reasoning live so you can *watch* it think instead of staring at
a dead panel, but a plain model sidesteps the wait entirely. Pick by the
machine you actually have:

| Your machine | Pull this | What to expect |
| --- | --- | --- |
| Modest — no real GPU, 8GB RAM, a few years old | `ollama pull llama3.2:1b` | Snappy, simple replies; the whole Pavilion works |
| Everyday — most laptops/desktops, 8–16GB RAM | `ollama pull llama3.2` (3B) | The dependable default; quick, plain-spoken residents |
| Capable — a real GPU (8GB+ VRAM) or 16GB+ RAM | an 8B instruct model, e.g. `ollama pull llama3.1:8b` | Noticeably deeper conversations, still reliable |
| Strong — a gaming/creator machine, 12GB+ VRAM | a 8–14B instruct **plus, optionally, one thinking model** | The Monk automatically claims the largest model installed and streams his reasoning live — on a machine like this, watching him actually think is worth the wait |

Two Pavilion-specific facts that make the choice easier:

- **The Mountain Monk always takes the single largest model you have
  installed** — a standing rule, his depth is never traded for speed. So the
  biggest model on your machine is, in effect, *his*. Install a thinking
  model only if you're happy for the Monk to be slow and profound rather
  than quick.
- **Everyone else favors speed.** Quill, Sebastian, and the work desks run
  on your connection's default model — keep that a plain instruct model and
  the whole Pavilion feels alive rather than laggy.

Start small, talk to a resident, and only move up a tier if the replies feel
thin. A model that answers in two seconds beats a smarter one you stop
wanting to talk to.

---

## Protocol 3 — The terminal toolkit

Every command worth keeping, in one place, so you never hunt for it. You do
**not** need any of these to use the Pavilion — the game and its in-app
Caravan Desk cover the everyday. This is for when you want the terminal's
extra reach (bigger books, the certified pipeline, running the app from
source). Commands are PowerShell-flavored (Windows); on Mac/Linux swap
`setx X "y"` for `export X=y` and backticks for backslashes.

### Running the Pavilion from source

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies (once, and after a `git pull`) |
| `npm run dev` | Browser dev server, live-reloads on edits — prints a localhost URL |
| `npm run build` | Build the static site into `dist/` |
| `npm test` | Config sanity check (scenes, warps, seed) — no browser needed |
| `npm run electron:dev` | The desktop app, live (no `OLLAMA_ORIGINS` step needed) |
| `npm run electron:build` | Your own installer (`.exe` in `release/`) — carries your `.env.local` |
| `npm run electron:build:beta` | The **shareable** installer — local-only, no keys baked in |

### Bringing in books — the Caravan connectors

Each is one named source, stdlib-only, no scraping. Output lands in
`library-sources/` ready for the draft step (or drop the result on the
Caravan Desk in-game).

| Command | What it does |
| --- | --- |
| `python tools/caravan/epub-to-text.py book.epub` | **EPUB → clean text** (the format most sites give you) |
| `python tools/caravan/pdf-to-text.py paper.pdf` | PDF → text (needs `pip install pypdf`) |
| `python tools/caravan/gutenberg.py 2680` | Fetch a Project Gutenberg book by its ID |
| `python tools/caravan/standardebooks.py search "meditations"` | Search Standard Ebooks |
| `python tools/caravan/standardebooks.py fetch-text <repo>` | Fetch one Standard Ebooks title's text |
| `python tools/caravan/suttacentral.py <uid>` | Fetch a text from the Buddhist canon |
| `python tools/caravan/arxiv.py <id>` | Fetch an arXiv paper (PDF) |
| `python tools/caravan/openalex.py "<query>"` | Find the open-access copy of a paper |
| `python tools/caravan/semanticscholar.py "<query>"` | Search Semantic Scholar |

### Shelving a book — the certified pipeline (terminal path)

Needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set for the last two
(the service-role key, never committed). See Protocol 1, Pathway B.

| Command | What it does |
| --- | --- |
| `python tools/caravan/library-draft.py library-sources/<file>.txt` | Start a draft (add `--ai-draft` for an AI summary suggestion) |
| `python tools/caravan/promote-draft.py library-drafts/<slug>.md` | Shelve it (refuses if license/tradition still TODO) |
| `python tools/caravan/push-fulltext.py <slug> <file>.txt --license "…" --source-url "…"` | Attach the full text to local MinIO |

### Your local AI — Ollama

| Command | What it does |
| --- | --- |
| `winget install Ollama.Ollama` | Install Ollama (Windows) |
| `ollama pull llama3.2` | Download a model (see Protocol 2's tiered guide) |
| `ollama list` | Show installed models |
| `ollama serve` | Make sure it's running |
| `ollama ps` | Show what's currently loaded in memory |
| `curl http://localhost:11434/api/tags` | Confirm the game can reach it (should print your models) |
| `setx OLLAMA_ORIGINS "http://localhost:5173,http://localhost:5174"` | Let a *browser* build reach Ollama (desktop app doesn't need this) |

### The local Library store — Docker + MinIO (only for the certified full-text pipeline)

Beta testers never need this; it's for your own machine's certified library.

| Command | What it does |
| --- | --- |
| `docker ps` | Is the MinIO container running? |
| `docker start sand-pavilion-minio` | Start it if stopped |
| `curl http://localhost:9000/minio/health/live` | Confirm MinIO is up |

### git — saving and sharing your work

| Command | What it does |
| --- | --- |
| `git status` | What's changed |
| `git add -A && git commit -m "message"` | Save a snapshot |
| `git log --oneline -10` | Recent history |
| `git tag v0.1.0` | Name a milestone |
| `git checkout -b my-branch` | Work on a branch without touching `main` |

> **The one habit worth keeping:** when a command asks for a secret (a
> `SERVICE_ROLE_KEY`, an API key), set it as an environment variable for that
> terminal session — never paste it into a file that git tracks. Every script
> here reads its secrets that way on purpose.

---

## More protocols to come

Written down so they aren't lost, not yet promised as finished:

- **Growing your own shelf / tradition** — when a book doesn't fit an existing
  shelf, adding a new one is a real layout decision, not just a category
  string (see `library-drafts/README.md`).
- **Curating and sharing a book bundle** — the "unlock by knowledge" idea (see
  `plans/BETA-TESTING-FEEDBACK.md` #34): earn a collection by learning, not by
  paying.
- **Standing up your own Pavilion** — clone, run, and make it yours (see
  `plans/DESKTOP-APP-PLAN.md`).
