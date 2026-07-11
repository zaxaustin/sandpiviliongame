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
3. [More to come](#more-protocols-to-come)

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

**Plain text (`.txt`) is what the Library wants.** Most public-domain sites
offer a "Plain Text UTF-8" download — take it. If all you can get is a
**PDF**, that's fine, but it needs one extra step:
`python tools/caravan/pdf-to-text.py <file.pdf>` turns it into shelf-ready
text first.

### Pathway A — no terminal (inside the game)

For when you just want to add a book without touching a command line.

1. Get a **`.txt`** of the book from a source above.
2. In the game, walk to the **Workshop** and face the **Caravan Desk**
   (west pillar); press **E**.
3. Choose **"+ Add a text by hand,"** and **drag your `.txt` onto the drop
   zone**.
4. **Pick which site it came from.** If it's a known source, the title,
   author, and a correct **license string fill in automatically**. Write a
   short honest **summary** in your own words.
5. **Submit.** It lands in the **Steward Review Queue** — *nothing is shelved
   until it's reviewed*. (You're the steward right now, so you approve your
   own; the queue exists for when more than one person submits.)
   - An **unrecognized source** routes to a **Research Desk project** ("Caravan
     Drops") instead of the shared queue — your own notes, not the public
     shelf, until its provenance is sorted.

*Today this pathway handles `.txt`. PDF-in-the-game and writing straight to
`library-inbox/` are real browser limits — use Pathway B for those.*

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
   `ollama pull llama3.2` (fast, reliable; avoid "thinking" models for
   everyday residents).
2. Allow the game to reach it:
   `setx OLLAMA_ORIGINS "http://localhost:5173,http://localhost:5174"`,
   then restart the terminal.
3. Open the game — the title screen reports what it found. Manage everything
   from **⚙ Manage AI connections**.

Everything stays on your machine. Nothing is sent anywhere unless you
deliberately add a ☁ cloud connection.

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
