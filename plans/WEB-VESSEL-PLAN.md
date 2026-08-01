# The Web Vessel — the Pavilion as a ship you sail through the internet

> **Superseded in part, 2026-07-28.** The goal below is right; the architecture
> is sharper in [`CAPTURE-PATHWAYS-PLAN.md`](CAPTURE-PATHWAYS-PLAN.md), which
> settles the key question this plan left open — *extraction is deterministic
> Python, not an AI job* — and adds the bookmarklet route that gets a page you
> already have open into the Pavilion without widening the fetch bridge at all.

Written 2026-07-12, from the user's framing: *"a vessel for a ship growing
through the internet."* You already have a real process to bring a **book** in
and break it down (notes, sparks, read-aloud), and one being built for **papers**
(the Science Hall's dissect + investigations). The ask: let the Pavilion pull in
**the open web the same way** — drag-and-drop, copy-paste, and (where possible)
fetch a page you point at — so anything you find out there ("here's how they did
X") can come aboard, get broken down, and be kept in *your* library. A plan;
build later. **What do I think? It's very feasible, and it's arguably the single
highest-leverage direction for "a daily tool that really helps."**

**The one honest wall up front (and its solution):** a *browser tab* cannot fetch
an arbitrary web page — the same CORS wall this project already documented for
Gutenberg/arXiv. **But the desktop app can** — the Electron main process is
Node.js and can fetch anything. Today that bridge is *deliberately locked to
localhost* (`electron/main.cjs`, the `isLocalhost` guard) for safety. So real
web-fetch is **not a research question, it's a deliberate capability we haven't
opened yet** — desktop-only, which fits the desktop-first direction exactly. The
browser build keeps the paste/drop paths; the desktop app gets the real fetch.

---

## The shape: the Pavilion already has the "break it down" half

This is mostly an **intake** plan, because the *processing* already exists:
- **Research Desk** — paste-a-chapter/paper summarizer, project notes, sparks.
- **Science Hall** — dissect a paper, keep an investigation, self-experiments.
- **Library / book notes** — read, note per page, bring notes to today's plan.
- **Course/Academy (planned)** — turn "how they did X" into a real lesson.

So the web vessel is: **get the thing aboard → hand it to machinery that already
knows what to do with it.** That's why it's feasible — we're building the dock,
not the whole factory.

---

## Three ways aboard, in order of feasibility

### 1. Copy-paste (works everywhere, mostly already here) — do first
The paste-a-chapter summarizer already takes arbitrary pasted text. Extend the
*idea* across the Pavilion: paste an article, a page's text, a forum answer, a
snippet of "how they did it" → summarize / dissect / note / start an
investigation. Zero new plumbing, works in browser and desktop alike. The
humblest path and the one that already half-works.

### 2. Drag-and-drop (already built for books) — extend
The Caravan Desk already accepts dropped `.epub`/`.txt`. Extend to: a saved
webpage (`.html`/`.txt`), a `.pdf` (the Hall/Research summarizer's natural
partner once `pdf-to-text` is wired in-app), an image to keep with a note. Same
"drop it, we route it" pattern, already proven.

### 3. Fetch a page you point at (desktop app only) — the real new capability
The "web-scrape a page you like" piece, done our way and honestly:
- **A new, deliberate bridge method** (e.g. `desktop-fetch-web`) alongside the
  localhost-only one — **user-directed, one URL at a time**, never a crawler.
  You paste or click a link; the main process fetches that one page; a readability
  pass extracts the real text; it lands in the Research Desk / Hall / a note.
- **Explicitly NOT a general scraper.** This project already chose hand-picked
  connectors over a mass scraper on purpose; this keeps that ethic — it's *you*
  bringing one chosen page aboard for *your* study, not a bot harvesting the web.
- **Provenance & ethics stay at the door** (load-bearing, the project's oldest
  rule): a page you fetch for your *own* notes is fine — the same "your own copy,
  your own summary, never redistributed" line the paste summarizer already draws.
  Anything headed for a *shared* library still needs real license/provenance, the
  same wall every shelved text passes. Respect robots/terms; one-page-user-directed
  is defensible where mass-scraping isn't.

---

## Why this matters (my honest read on "what do you think")

- **It's the difference between a nice local app and a daily instrument.** Right
  now the web and the Pavilion are two tabs; this makes the Pavilion the place
  your web-findings *land and get metabolized* — read, dissected, noted, turned
  into a lesson or a build. That's "really helps in daily life," concretely.
- **It completes the learning/tool-commons loop.** "Here's how they did X on the
  web" → fetch/paste it → dissect it (Hall) → a course step or an investigation →
  build your own (Tool Commons). The vessel is the on-ramp to the whole
  "learn/build anything from scratch" vision.
- **It's genuinely feasible now**, desktop-first, because the processing exists
  and the fetch is a bounded, deliberate bridge — not an AI or a research risk.
- **It stays true to the soul:** every voyage is *you* steering — you paste, you
  drop, you point at the page. No autonomous crawling, nothing pulled in without
  you. The ship goes where the conductor sails it. ([[project_platform_and_conductor]],
  [[feedback_prefer_local_over_supabase]] — local, own-your-data.)

---

## Phases

**Phase 1 — Paste, everywhere.** Make "paste web text → summarize/dissect/note"
a first-class, obvious action across the Research Desk and the Hall (extend the
existing summarizer). Browser + desktop. Smallest real slice.

**Phase 2 — Richer drops.** Extend the Caravan/desk drop zone to `.html`, saved
pages, `.pdf` (wire `pdf-to-text` in-app), images-with-notes.

**Phase 3 — Fetch a chosen page (desktop).** The new `desktop-fetch-web` bridge +
a readability extractor + a "paste a link, bring the page aboard" action, routing
into Research/Hall/notes. Honest browser fallback ("this needs the desktop app").

**Phase 4 — The vessel felt as a place.** A small "harbor"/intake spot in the
world where things you've brought aboard collect before you sort them — the
Caravan Desk is the natural home, extended from "books" to "anything from out
there." Optional, later; the value is in Phases 1–3.

---

## The honest risks
- **CORS in the browser** — real; the answer is desktop-only fetch, said plainly.
- **Copyright/provenance** — handled by the existing "personal notes fine, shared
  library needs license" line; don't let web-fetch become a backdoor around the
  Library's provenance discipline.
- **Scraping fragility** — page structures vary; a readability pass gets the text
  ~80% of the time, and paste is always the fallback. Don't over-promise perfect
  extraction.
- **Scope creep toward a crawler** — hold the line: user-directed, one page at a
  time, for personal processing. That's the whole ethic difference.

## Cross-references
- `LIBRARY-GROWTH-PLAN.md` / the Caravan / Request Board — the existing "bring a
  text in" machinery this extends.
- `SCIENCE-RESEARCH-HALL-PLAN.md` (dissect), Research Desk summarizer — the
  processing half that's already built.
- `DESKTOP-APP-PLAN.md` / `electron/main.cjs` — the bridge and the localhost
  guard the Phase-3 fetch extends deliberately.
- `TOOL-COMMONS-PLAN.md` — the "learn/build it yourself" loop this feeds.
- [[project_platform_and_conductor]] — every voyage is user-steered; no
  autonomous crawling.

**One line to hold onto:** the Pavilion already knows how to *break a text down* —
the Web Vessel just lets you sail out, bring one aboard, and metabolize it into
your own library, notes, and skills, with you always at the helm.
