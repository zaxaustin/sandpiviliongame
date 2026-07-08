# Library Growth Plan

Not started as code — this is the written plan first, on purpose, the
same way `DESKTOP-APP-PLAN.md` and `LIBRARY-SCALING-PLAN.md` were
written down before anything got built. See README's "What's next" for
how this fits the rest of the priority list.

## The actual goal

Grow the Library from 20 hand-vetted texts toward a real, much bigger
dataset — enough volume to actually stress-test the storage design in
`LIBRARY-SCALING-PLAN.md`, see how the shelves and search hold up with
real variety, and give the AI residents (Quill especially) enough real
material to be genuinely useful rather than thin. Getting more books in
is the means; a Library big enough to *play with* — to see what a real
commons of knowledge from many different sources actually feels like —
is the end.

## The one rule everything else follows: license first, always

This isn't new — every existing shelf entry already answers three
questions at the door (what is it, where's it from, what license does
it travel under) — but it matters more as volume grows, not less,
because volume is exactly what makes it tempting to cut this corner.

**Two genuinely different things, easy to blur, kept separate on
purpose:**

- **"Free to read"** (a paywall-free download, a library card, a
  personal PDF you already own) is not the same as **"free to put on a
  shared shelf anyone can read."** A book being easy to get your hands
  on for personal use says nothing about whether redistributing it is
  legal. Copyright default is "all rights reserved" the moment
  something is written — public domain, CC0, and explicit open
  licenses are the exceptions that make shelving legal, not the rule.
- **The Research Desk already draws this line correctly** — pasting
  your own copy of something copyrighted in for a private AI summary
  is fine (nothing gets redistributed, nothing leaves your machine);
  shelving that same text in the shared Library would not be. Keep
  following that same split as volume grows: personal reading and
  note-taking has much more latitude than what actually goes on a
  shelf with your name-as-steward attached to it.

**In practice:** only public domain, CC0, CC-BY (with attribution kept
intact), or another explicit open license gets shelved. "I have a copy"
is never sufficient by itself — the source has to actually say the text
may be redistributed.

## Why hand-picked connectors, never a general scraper

`tools/caravan/` already made this call for Gutenberg, arXiv,
SuttaCentral, and Semantic Scholar, and it's the right call to keep
making as more sources get added, not something to reconsider now that
scale is the goal:

- **A real, structured API** (what every current connector uses) hands
  back a title, author, and clean text on purpose — a source built to
  be read by a program. **Scraping HTML** means guessing at structure
  that can silently change and break, with no such agreement in place.
- **Respecting a site's actual terms** matters more, not less, once
  bulk-fetching enters the picture — a scraper ignoring robots.txt or a
  ToS to grab volume fast is exactly the kind of shortcut that gets an
  IP address blocked and, worse, is the kind of behavior a commons
  project shouldn't model.
- **One named connector per source** keeps every fetch auditable: read
  `tools/caravan/gutenberg.py` and know exactly what it does and
  doesn't touch. A general scraper pointed at "any URL" can't offer
  that.

Growing the Library faster means **adding more named connectors**, the
same shape as the existing four — not building one bigger, vaguer tool.

## The pipeline today (already built, this is the shape new connectors join)

1. **Fetch** — a connector (`gutenberg.py`, `suttacentral.py`, `arxiv.py`,
   `semanticscholar.py`) pulls one text from one named source, stdlib-only,
   no scraping.
2. **Draft** — `library-draft.py` turns a fetched raw text into a
   pre-filled draft in `library-drafts/`; license and tradition stay
   `TODO` until a human actually decides them, never guessed.
3. **Write the real part by hand** — a title, license, source URL, and
   an honest summary/sections in your own words. This step is *why*
   the pipeline isn't fully automatic, and stays that way even at
   scale: a shelf entry is a claim a steward is making, not a
   database row.
4. **Promote** — `promote-draft.py` inserts the finished draft straight
   into Supabase, live in the game immediately.
5. **Attach full text** (optional but usually done) — `push-fulltext.py`
   uploads the real text to local MinIO storage and wires up the
   Reader's "Read the full text" button.

Today's session proved this whole loop end-to-end multiple times
(Chemical History of a Candle, Our National Parks, Man and Nature,
Tesla's writings, the Vibhaṅga Sutta) — the pipeline itself doesn't
need rework, it needs **more raw material fed into step 1**, which is
what the source list and new-connector roadmap below are actually for.

## Real sources — legitimately free, checked for license before use

Every category below is public domain, CC0/CC-BY, or an explicit open
license at the source, not "free to read" in some looser sense. Still
**verify the license on the specific text** before shelving anything —
a site being generally open-license doesn't make every single item on
it open-license (an anthology can mix public-domain originals with a
copyrighted modern introduction, for instance).

**Classic literature / general public domain — has a Caravan connector already:**
- [Project Gutenberg](https://www.gutenberg.org) — 75,000+ public-domain
  ebooks, clean plain-text editions, exactly what `gutenberg.py` targets.

**Classic literature / general public domain — no connector yet, real candidates:**
- [Internet Archive Texts](https://archive.org/details/texts) — huge
  public-domain and open-access scanned/OCR'd collection; check each
  item's own rights statement, since it also hosts in-copyright loans.
- [Standard Ebooks](https://standardebooks.org) — public-domain texts,
  meticulously re-typeset and proofread, explicitly public-domain-dedicated.
- [Wikisource](https://wikisource.org) — crowd-transcribed public-domain
  and CC-licensed primary sources, very clean plain text.
- [HathiTrust](https://www.hathitrust.org) — public-domain portion only
  (most of the catalog is access-restricted); check the rights flag per item.

**Buddhist / Theravada / Mahayana — matches the existing shelves:**
- [SuttaCentral](https://suttacentral.net) — already connected
  (`suttacentral.py`); Bhikkhu Sujato's translations are CC0.
- [Access to Insight](https://www.accesstoinsight.org) — Theravada
  translations, mostly CC-licensed; check per-translator terms.
- [84000](https://84000.co) — Tibetan Buddhist canon in translation;
  **CC-BY-NC-ND** — noncommercial and no-derivatives, more restrictive
  than anything currently shelved, needs an explicit steward decision
  before use, not an automatic fetch.
- [Perseus Digital Library](http://www.perseus.tufts.edu) — classical
  Greek/Latin texts and translations, mostly public domain.

**Open textbooks — the README already flagged Science/coding as thin:**
- [OpenStax](https://openstax.org) — full, real college textbooks
  (physics, biology, calculus, economics, more), CC-BY, funded
  specifically to be free and open.
- [LibreTexts](https://libretexts.org) — a huge open-textbook network
  across nearly every subject, mostly CC-BY/CC-BY-SA.
- [Open Textbook Library](https://open.umn.edu/opentextbooks) —
  University of Minnesota's curated catalog, every entry license-tagged.
- [BCcampus Open Education](https://opentextbc.ca) — Canadian open
  textbook collection, CC-licensed.
- [Saylor Academy](https://learn.saylor.org) — free courses with open
  textbook-style materials, mixed open licenses, check per-course.

**Research papers — two connectors already exist:**
- [arXiv](https://arxiv.org) — already connected (`arxiv.py`); physics,
  math, CS preprints, mostly author-retains-copyright but freely
  readable — confirm redistribution terms per paper, not assumed CC0.
- [Semantic Scholar](https://www.semanticscholar.org) — already
  connected; an aggregator/search layer, not itself a rights-holder —
  it links out to each paper's actual open-access source.
- [DOAJ](https://doaj.org) — Directory of Open Access Journals, every
  listed journal peer-reviewed and genuinely open-access.
- [PubMed Central](https://www.ncbi.nlm.nih.gov/pmc/) — open-access
  biomedical/life-sciences papers, explicit license tag per article.
- [CORE](https://core.ac.uk) — aggregates open-access papers across
  thousands of repositories, one API, license metadata included.

**Whole open-license books, not just textbooks:**
- [Directory of Open Access Books (DOAB)](https://www.doabooks.org) —
  peer-reviewed academic books, every entry Creative Commons licensed.
- [Project Gutenberg's modern CC-licensed shelf](https://www.gutenberg.org/ebooks/subject/...) —
  a smaller but real slice of Gutenberg is contemporary CC-BY work, not
  just pre-1929 public domain.

**Government and public works — genuinely free by design, not by license grant:**
- [govinfo.gov](https://www.govinfo.gov) — official US government
  publications; US federal government works are public domain by statute.
- [NASA Technical Reports Server](https://ntrs.nasa.gov) — public domain.
- [National Academies Press](https://nap.edu) — many full books free to
  read/download; check the specific license per title, not blanket.

**Electronics/coding specifically (the README's known thin shelf):**
- *Lessons In Electric Circuits* (already the one example the README
  names) — openly licensed, a real fit already identified.
- [OpenStax's CS/engineering titles](https://openstax.org/subjects)
  where they exist — same CC-BY terms as the rest of OpenStax.
- Treat any GitHub "awesome free programming books" list as a **lead to
  verify, not a source to trust directly** — those lists mix public
  domain, CC-licensed, and plain "the author put a PDF online" (which
  is not the same as a redistribution license) indiscriminately.

## The manual half — `library-inbox/`, added 2026-07-08

Not every source is worth a script yet, and some (a scanned Archive.org
item you have to check the rights statement on by eye, a one-off find)
may never be. `library-inbox/` is the manual on-ramp into this same
pipeline: one subfolder per source website, gitignored like
`library-sources/`, for books downloaded by hand and sorted by where
they came from. See `library-inbox/README.md` for the real workflow.

**Why sorted by source from the start:** a folder that fills up by hand
is the actual signal a real connector for that site is worth writing —
proven by hand a few times, then scripted, the same way `gutenberg.py`
and `suttacentral.py` already exist. This turns "which connector should
we build next" from a guess into an observation.

## Roadmap — in rough order

1. **A `gutenberg-like` connector for Standard Ebooks and Wikisource** —
   both structured enough for a clean stdlib connector, both fill real
   gaps (better-typeset classics; primary-source documents Gutenberg
   doesn't have).
2. **An OpenStax connector** — directly addresses the README's known
   Science-shelf gap with real, current, professionally-written
   textbooks, not just 19th-century public domain science writing.
3. **An Internet Archive connector** — the highest-volume option by
   far; needs the most care distinguishing actual public-domain items
   from access-restricted loans before fetching anything.
4. **In-game discoverability** — SuttaCentral already has a live
   in-game search (Caravan Desk); the same pattern (search a source,
   preview a result, one-click into a draft) is worth extending to
   whichever connector above gets built next, rather than leaving new
   sources terminal-only forever.
5. **A visible "how a book gets here" panel at the Caravan Desk** —
   right now this whole pipeline only lives in `library-drafts/README.md`
   and this document; a short in-game sign or panel pointing at the real
   process (fetch → draft → human writes the summary → promote → attach
   text) would make the commons's own honesty about sourcing visible to
   a visitor, not just a steward reading the repo.

## What doesn't change

The actual editorial step — writing a real, honest summary in your own
words, deciding the tradition/category, confirming the license by
hand — stays manual, on purpose, no matter how many connectors exist or
how automated fetching gets. That's the one step in this whole pipeline
that's a steward's judgment, not a script's output, and it's the reason
a visitor can trust what's on a shelf here at all.
