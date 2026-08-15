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

**One exception, and it's important: Your Shelf (personal, 👤) needs none of
this.** A book you add just for *yourself* — your own copy, never redistributed —
is your business, not the commons'. Leave license and source blank, pick any
shelf, and add it. Provenance is required only for the **shared, certified**
path (the review queue), where you're vouching for something *others* will rely
on. The wall protects the commons; it was never meant to stop you keeping your
own books.

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
4. **Pick its shelf** (the Tradition dropdown — e.g. Classics for *Paradise
   Lost*), and, if it came from a known source, confirm the license that
   filled itself in. That shelf is where the book will actually appear.
5. **Press "📚 Add to my Library now."** That's the whole local path — no
   database, no container, no terminal, no review-queue detour. The book
   appears **immediately on the shelf you chose** (findable by walking to it,
   and in the Index search), marked **👤** as your own addition. It also
   gathers on **Your Shelf**, the case by the reading nook. In the **desktop
   app** its full text is stored as a plain file in the app's own data folder;
   in a browser it lives inside your save (very large books need the desktop
   app).
   - **Want a shared, certified commons instead?** Use **"Send to review
     queue"** — the book waits in the Steward Review Queue until *approved*,
     the multi-person path where texts are vetted before shelving. (An
     unrecognized drop source routes to a Research Desk project, "Caravan
     Drops," rather than the shared queue.)

**The provenance split, stated plainly:** a book you shelve this way is
**personal — yours, marked 👤, kept apart from the certified shelves.** The
six certified shelf blocks carry texts whose license and source a steward has
stood behind; Your Shelf carries what *you* brought in, on your own judgment.
Both are first-class citizens of the Library (the Index lists them, Quill
knows them) — the label just always tells the truth about who vouched.

*This pathway handles `.epub` and `.txt` in the game directly. PDF-in-the-game
and writing straight to `library-inbox/` are real browser limits — use Pathway
B (or the `pdf-to-text.py` / `epub-to-text.py` converters) for those.*

### Pathway B — the maintainer's path into the *shared* catalog

> **Read this box before the steps. Pathway B is almost certainly not for you.**
>
> This pathway does **not** add a book to *your* Pavilion — Pathway A above does
> that, completely, and it is the real pathway for anyone running their own
> Pavilion. Pathway B is how a book gets into the **catalog that ships with the
> app**, which only the person maintaining that catalog ever needs to do.
>
> **Changed 2026-08-02, and simplified by it.** This used to end with
> `promote-draft.py` pushing a row into a hosted database, which needed a cloud
> project and a `SERVICE_ROLE`-class key. That backend was **deleted**, not left
> dormant — the app now reads exactly one catalog, `src/game/data/seed.js`, plus
> whatever you added yourself.
>
> So the last step is now **a code change**: you add the entry to `seed.js` and
> rebuild. That is slower, and it is honest — the shipped catalog is source
> code, so changing it is a commit someone can read, review and revert. **No
> account, no key, and no secret is involved anywhere in this project any more.**

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
4. **Add the entry to the catalog** — `src/game/data/seed.js`. Copy the shape
   of any neighbouring entry: `slug`, `tradition`, `title`, `license`,
   `source_url`, `attribution`, and a `doc` with a `summary` and `sections`.
   The filled-in draft from step 3 has every field you need; this step is
   mostly transcription.

   `python tools/caravan/promote-draft.py <draft>` is worth running first. Its
   push step is retired, but the **draft checker survives**: it refuses a draft
   still saying `TODO`, then prints every field this step needs and stops
   without writing or moving anything. Use it as the transcription source.

5. **Optional — attach the full text** so the Reader's "📖 Read the full text"
   button works.

   > **`push-fulltext.py` does not work.** Its second half updated the hosted
   > database deleted on 2026-08-02. It now exits immediately, *before* the
   > MinIO upload, so it cannot leave an orphaned object in the bucket with no
   > catalogue row pointing at it. Rewriting it against local Postgres + MinIO
   > is a real, well-scoped job — the writes it needs already exist as named
   > queries in `electron/db.cjs` — and until someone does it, this step has no
   > terminal path.

   **What works today:** drag the `.txt` or `.epub` onto the Pavilion's window.
   The desktop app writes the text as a real file in its own data folder and
   the catalogue row into the local database. That covers your own Pavilion
   completely; it is only the *shipped* catalog's full text that is waiting on
   the rewrite above. Until then, a shipped book is readable as its summary
   card only, which ten of them do deliberately and say so in the Reader.

6. **Rebuild** — `npm run build:beta`, and `npm test` to be sure. The catalog
   is source code now, so a shelf change is a commit: reviewable, revertable,
   and visible in `git log`. That is a feature.

### Two honest facts about the catalog

- **The card lives in `seed.js`; the full text lives in local MinIO.** A book
  can be shelved — card visible, searchable — before its full text is pushed.
  That's the catalog-only state, and ten of the shipped classics sit in it
  deliberately, each saying so in the Reader.
- **There is exactly one catalog, and it is in the repo.** Until 2026-08-02 a
  hosted database could silently replace the seed, which meant editing
  `seed.js` might change nothing you could see. That whole class of confusion
  is gone: what is in the file is what is on the shelf.

---

## Protocol 2 — Connecting your own local AI

So Quill, the Monk, and the others actually talk back. **The gentlest,
step-by-step version — including how to check what *your* machine can run — is
now its own lesson: [`lessons/01-a-beating-heart.md`](lessons/01-a-beating-heart.md).
Point a newcomer there first.** The full reference walk-through (installing
Ollama, the `OLLAMA_ORIGINS` step, troubleshooting) is in the main
[`README.md`](README.md#setting-up-local-ai--a-beginners-guide); the short
version:

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
first** — sometimes minutes, sometimes coming back blank.

**You can now switch that reasoning on and watch it** — *Pause → Your data →
"Let the model show its reasoning, and show it to me"*. It is **off by default**,
and the reason is a measurement rather than a preference. On this machine, the
same question to a 9B reasoning model:

| | reasoning off | reasoning on |
| --- | --- | --- |
| time to answer | **1.2 s** | **107 s** |
| reasoning shown | none | 7,900 characters |

That is the trade in full. Switch it on when an answer looks wrong and you want
to see *where* it went wrong — it is the single best way to understand what your
model is actually doing — and switch it off again for ordinary use.

Three things worth knowing:

- **Some models reason whether or not you ask.** `deepseek-r1` is one: its
  thinking comes back and the 💭 panel fills even with the switch off.
- **Some models cannot reason at all**, and asking them to is an *error*, not
  something they ignore — `llama3.2` answers the request with HTTP 400. The
  Pavilion checks what your model reports it can do and simply does not ask the
  ones that cannot. The panel tells you which case you are in, by name.
- **Reasoning gets a much bigger reply budget**, automatically. A model told to
  think on a small budget can spend all of it thinking and answer nothing —
  measured here at 3m26s for an empty reply, before this was fixed.

*This section was wrong twice. It first promised live reasoning that nothing
requested; the correction on 2026-08-10 then said the 💭 panel could never fill,
which was inference rather than measurement — `deepseek-r1` had been filling it
all along. Both are recorded in `docs/DOCS-DRIFT.md`.*

Pick by the machine you actually have:

| Your machine | Pull this | What to expect |
| --- | --- | --- |
| Modest — no real GPU, 8GB RAM, a few years old | `ollama pull llama3.2:1b` | Snappy, simple replies; the whole Pavilion works |
| Everyday — most laptops/desktops, 8–16GB RAM | `ollama pull llama3.2` (3B) | The dependable default; quick, plain-spoken residents |
| Capable — a real GPU (8GB+ VRAM) or 16GB+ RAM | an 8B instruct model, e.g. `ollama pull llama3.1:8b` | Noticeably deeper conversations, still reliable |
| Strong — a gaming/creator machine, 12GB+ VRAM | **a 9B instruct is the honest ceiling for most cards this size, and one model at a time** | Deeper conversations throughout. Measured on a 16GB card, which is *above* this floor: a 12B filled 13.8GB and spilled the rest to shared memory, where every token waits on the PCIe bus. It does not fail — it **crawls**, which is harder to diagnose. The context window and the KV cache take their share too, and the game needs room alongside |
| **None of the above** — an old laptop, a MacBook Air, 8GB shared with everything | **`ollama signin`, then `ollama pull gpt-oss:20b-cloud`** | The residents, on a machine that cannot host a model. See below |

### The hosted way in, for a machine that cannot run a model at all

Added to the app 2026-08-13, after the second time the same question was asked
about the same friends. **The engine has honoured this since 2026-08-03 and no
surface ever mentioned it**, which meant the machine most in need of the door
was the one being told to give up.

Ollama serves hosted models **through the same local endpoint**, so no API key
is ever pasted into the Pavilion. Install Ollama as normal, `ollama signin` with
a free account, pull a `-cloud` model, press **Detect**, and choose it from the
model list. Measured 2026-08-03: `gpt-oss:20b-cloud` answered in **0.64s** where
a local 9B takes many seconds.

- **Sign in before you pull.** The other order fails with an auth error that
  reads exactly like a broken install.
- **A hosted model is offered, never taken.** `isCloudModel()` keeps it out of
  every automatic choice; it works only because you picked it on purpose.
- **Be clear about what this costs you.** What you type to a resident is sent to
  Ollama's servers and answered there. Your library, your notes, your day and
  your whole save never leave this computer — but the conversation does, and the
  chat header says `☁ leaves this device` on every message so you are never
  guessing.
- Ollama's free tier has limits, and some models need a paid plan
  (`deepseek-v4-pro:cloud` returns *"requires a subscription"*). The app reports
  the refusal rather than going quiet.

Two Pavilion-specific facts that make the choice easier:

- **Every resident runs on the same model — your connection's default.** This
  changed on 2026-08-07. The Mountain Monk used to claim the largest model you
  had installed, and no longer does, at the steward's word: *"lets not treat
  the monk differently for now hav him focus on guidens."* His job is guidance,
  and guidance is carried by who he is and what he is grounded in, not by how
  long he is allowed to think. On a machine whose real limit is **cooling**, a
  bigger model buys slower counsel rather than better counsel.

  So **you no longer need to install a large model for the Monk's sake.** Pick
  one default you are happy talking to, and everyone uses it.
- **Every resident uses the one connection you configured — the Monk included,
  and that is now a decision rather than an oversight** (2026-08-10):

  > *"the monk can be cloud if there computer cant run local ai alot of people
  > have laptops just let the user know."*

  There is no per-resident routing: `detectAI()` picks the first connection that
  answers, and Quill, the Monk, Sebastian and every desk all speak through it.
  **A laptop that cannot comfortably run a local model should not mean no
  Mountain Monk.** Guidance you can actually reach beats a principle that locks
  you out of the room.

  So the rule is **tell the visitor, don't decide for them.** Everything is
  labelled 🏠 local or ☁ cloud, on every connection and in every conversation,
  precisely so you always know whose machine you are talking on. If you would
  rather the Monk's conversations never leave this computer, keep a local
  connection active — that is your call to make, not ours.

  *(An earlier version of this page said he was local-only whatever you
  configured. That was never enforced in the code, and is now not the intent
  either.)*

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

### Shelving a book into the SHIPPED catalog (maintainer only)

**Not needed to fill your own Pavilion** — drag a file onto the window and
you are done (Protocol 1, Pathway A). These prepare an entry for
`src/game/data/seed.js`, which is source code, so the last step is a commit
rather than a command. **No key, no account and no secret is involved anywhere**
— the hosted backend that once needed one was deleted 2026-08-02.

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

### The database — you already have one

**Since 2026-08-04 the desktop app carries its own Postgres.** Nothing to
install, nothing to start. There is no command to run and no setup step; this
section exists so you can *look at* it, not so you can turn it on.

- **Where it is:** a `db/` folder inside the app's own data folder — the same
  folder that holds `library/`, where your shelved books' `.txt` files go. On
  Windows that is `%APPDATA%/sand-pavilion`. It appears the first time the app
  opens *without* a Docker container answering, so on a machine running the
  container you will not have one, and that is correct.
- **Which one you're on:** the title screen says — *built-in database*,
  *Postgres in Docker*, or *running in a browser tab* (the only case with no
  database at all).
- **The schema is `tools/schema.sql` plus `tools/migrations/*.sql`**, and
  `electron/db.cjs` applies all of them, in order, on every open, to **both**
  homes. Adding a migration means adding a file to `tools/migrations/` and
  nothing else.

### Postgres in Docker — optional, and only if you want the container

You do **not** need this for the database. It is for keeping one database
that two machines can share, and it sits beside MinIO.

| Command | What it does |
| --- | --- |
| `docker compose up -d postgres` | Start the container (needs `POSTGRES_PASSWORD` in `.env`) |
| `docker compose stop postgres` | Stop it — the app falls back to its built-in database |
| `docker exec -it sand-pavilion-postgres psql -U pavilion -d pavilion` | A real SQL prompt: `\dt` lists tables, `\q` leaves |

When the container answers, the app uses it and says so. When it doesn't, the
app uses its own. You do not have to do anything either way.

### The local Library store — Docker + MinIO (for the book TEXT, not the database)

Beta testers never need this; it's for your own machine's certified library.
MinIO holds the **text** of books, which is the big opaque part — the
catalogue and your notes live in the database above, container or not.

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

> **There are no secrets in this project any more.** Nothing in the Pavilion
> asks for an account, a key, a token or a cloud service — not to run it, not
> to fill it, and not to maintain the shipped catalog. The last thing that did
> was the hosted backend, deleted 2026-08-02. `.env.local` is optional and
> currently empty of anything meaningful; see `.env.example`.
>
> **The habit is still worth keeping for everything else you do.** If some
> future command wants a credential, set it as an environment variable in that
> one terminal session and let it die with the window. Never commit it, and
> never put it in a file git tracks. A key in a repo is forever, even after you
> delete it — the history keeps it.

---

## Protocol 4 — Drafting a course somewhere else

**The Pavilion can host a course, walk it with you, and hand it on. It is not
the best place to WRITE one**, and pretending otherwise would cost you the one
thing that actually works: a long conversation with a strong model that can hold
the whole shape in its head. So the method is — draft it out there, live with it
in here.

This is the same protocol the game hands you. **Course Board → 📥 Receive a
course** builds the prompt below with your own answers already in it and copies
it to the clipboard. This page is for working from the docs instead, and for
knowing what that button is actually doing.

### The seven steps

1. Goal and audience, with success criteria
2. Prerequisites and gaps
3. Ordered modules, each with an objective
4. The explanatory body of each module
5. Practice · reflection · artifact
6. Polish for transmission — standalone clarity, attribution, licence
7. Package, import, and walk it yourself

Step 7 is the one that gets dropped, and it is the one that matters:
[`plans/INDEPENDENT-COURSE-GRADUATION.md`](plans/INDEPENDENT-COURSE-GRADUATION.md)
requires the author to have walked their own course before it is worth handing
to anybody.

### First — where *you* are starting from

Answer these before you ask for anything. A complete beginner and someone with
real experience need **different material for the same subject**, and a model
told nothing will draft for a stranger — which usually means too slow to bear or
too fast to follow.

- **What have you already done in this area?** Projects, jobs, courses, years. Or "nothing at all" — a real answer, and the most useful one to be honest about.
- **What can you already do without looking it up?** The blank-page question, asked at the start instead of only at the end.
- **Where did you last get stuck, and what stopped you?** Time, money, a missing tool, a concept that would not land — or you simply stopped. All four are worth saying.
- **What do you have to hand?** Tools, parts, software, minutes in a day, a computer that can or cannot run a local model.

**These go into the course itself** and stay there, as a `baseline:` block in
its frontmatter. That is deliberate: *"I built this having never soldered
anything"* tells the next reader what the work will actually cost them, and no
`level: 201` ever does.

Note the difference from `prerequisites:` — that is what the **course** demands
of anyone starting it. The baseline is what its author actually brought.

### The prompt

Paste this into Claude, ChatGPT, Grok, or a local model — anything that will hold
a long conversation. **No API key and no connection are needed.** It is text on a
clipboard, which is why this works on a machine that cannot run a model at all.

~~~text
Draft a full course for the Sand Pavilion in the portable Markdown format below.
**Do not produce a thin checklist.** Modules need real explanatory prose.

WHAT I WANT TO LEARN
(replace with the real goal, and the honest reason it matters to you)

WHERE I AM STARTING FROM — write this back into the frontmatter as `baseline:`
- What have you already done in this area? (not answered)
- What can you already do without looking it up? (not answered)
- Where did you last get stuck, and what stopped you? (not answered)
- What do you have to hand? (not answered)
Teach for that. Do not re-teach what I can already do, and assume nothing I did not claim.
If the gap is too wide for one course, say so and propose the smaller one that comes first.

BUILD IT IN THIS ORDER
1. Goal and audience, with success criteria
2. Prerequisites and gaps
3. Ordered modules, each with an objective
4. The explanatory body of each module
5. Practice · reflection · artifact
6. Polish for transmission — standalone clarity, attribution, licence
7. Package, import, and walk it yourself

IT MUST CONTAIN — all seven
1. Opening intention — the real question that makes the work worth doing.
2. Baseline — mine, above, in the frontmatter for whoever reads this next.
3. Theoretical minimum — the few things I must rebuild from scratch, not recall. Cut hard.
4. A daily commitment I can actually keep, named in the opening.
5. Modules with real prose, each with practice, reflection and one artifact.
6. A final gate — what I demonstrate from a blank page, and what must actually work.
7. Transmission — polished so another person can walk it without me.
Note: `prerequisites:` is what the COURSE demands; `baseline:` is what I brought.

Work me in three modes throughout — analytical (predict, measure, diagnose), creative
(reframe the question), practical (build it, explain it to someone who needs it today).

THE FORMAT — reply with this and nothing else. Every module is a `## ` heading and nothing
else uses `##`. Objective / Body / Practice / Reflection / Artifact are bold labels inside
the text, not frontmatter keys. Aim for 5–9 modules. Spell the keys exactly as shown.

```markdown
---
title: "The course title"
purpose: "What this is for, in a sentence or two."
audience: "Who it is for, and what it assumes."
outcome: "What I will be able to do at the end."
category: "Skill"   # Practice, Study, Skill, Work, Health or Personal
track: "A subject area"
level: 101          # 101 beginner, 201 working, 301 advanced
license: "CC-BY-SA 4.0"
prerequisites:
  - "What anyone needs before starting, even if that is nothing"
baseline:
  - "my four answers from above, one per line"
---

# How to walk this course

One line on what this course is.

Then the intention: the real question behind it, the daily commitment I am making,
and how I will know it is working. Kept visible for the whole course.

## Module 1 — Its title

**Objective:** one sentence.

**Body:** real explanatory paragraphs, as many as the idea needs.

**Practice:** something I do, not something I read.

**Reflection:** a question I answer in writing.

**Artifact:** what I will have made when this module is done.
```
~~~

### Bringing it back

Save the reply as `something.course.md`. Then, whichever suits you:

- **Course Board → 📥 Receive a course** → paste it → **Read it** → **Pin it**
- **Drop the file anywhere on the window**
- **Drop it at the book table** — the same place you add books

All three are the same path and land in the same place.

You see what it found *before* anything is saved: the title, how many modules,
and whether it reads as a **📘 full course** or as **personal tracking**. Nothing
is written until you press.

If it will not import, the panel names the line to fix in plain sentences. The
usual cause is a module that is not a `## ` heading.

### What makes it high-standard

The full standard is
[`plans/HIGH-STANDARD-COURSE-CREATION-GUIDE.md`](plans/HIGH-STANDARD-COURSE-CREATION-GUIDE.md),
and the short version is in the game under **📐 How high-standard courses work**.
Seven pieces: an opening intention · your baseline · a theoretical minimum · a
daily commitment · structured modules · a final blank-page gate · transmission.

**The app checks three of them** — an intention, a stated outcome, and modules
with real explanatory text. The other four are yours to hold, and the surfaces
for them are still being built. A badge claiming all seven would be a sticker
rather than a standard.

Two real examples ship in [`courses/`](courses/) and are listed inside the
Receive panel, so you can read a finished one before writing your own.

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
  `plans/done/DESKTOP-APP-PLAN.md`).
