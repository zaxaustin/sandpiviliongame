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

## Why this can afford to be big: the sleeper car, not the budget

Stated directly, 2026-07-10, because it changes how "grow the Library" should
actually be read: **the low-res, pixel-art look was never just the easy
thing to build.** It's a deliberate resource choice — a simple 2D canvas
costs almost nothing in CPU, GPU, or RAM, on purpose, so that the majority
of *this* machine's actual resources stay free for the things that
genuinely need them: a local AI model actually running, a much bigger
Library actually indexed and searchable, real background work, all at
once, on hardware that was never asked to also render a 3D world.

**The sleeper car, the actual image to hold onto:** looks plain and
simple from the outside — visually fine, deliberately not impressive —
and is a real beast under the hood once you actually look. A pixel-art
game that also happens to hold a genuine library, residents who give
real advice and can draft a real lesson plan, and a full calendar/day
planner running on a real voice AI, is not what anyone expects walking
in. That gap between what it looks like and what it actually does is
not an accident to apologize for — it's the whole design.

**What this means in practice for growing the Library specifically:**
the visual budget was never competing with the content budget the way it
would in almost any other game — there's no ceiling on how big and real
this Library can get that comes from "the engine can't handle it,"
because the engine was built cheap on purpose to make room for exactly
this. Worth carrying forward as the actual tie-breaker anywhere a future
choice seems to trade "looks more impressive" against "does more" — this
project already knows which side of that trade it's on.

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

**Classic literature / general public domain — has a Caravan connector already, added 2026-07-08:**
- [Standard Ebooks](https://standardebooks.org) — `standardebooks.py`.
  **Real gotcha found, not assumed:** their own OPDS catalog (the
  structured feed built for exactly this) needs a Patrons Circle
  membership or a project contribution, confirmed by actually requesting
  it and getting a 401 — a free account alone doesn't unlock it. Used
  two other real, structured, non-scraping sources instead: GitHub's own
  public API to list/search their ~1,500 book repos (each with a
  `description` and `homepage` already filled in — this is GitHub's API,
  not scraping standardebooks.org), and the book's own "single page"
  reading view (checked against robots.txt first: not disallowed, unlike
  the actual epub/kindle download files), parsed by its real EPUB3
  `epub:type` semantic markup (`bodymatter`/`frontmatter`/`backmatter` —
  a stable standard, not guessed layout). Verified against both a
  continuous work (Marcus Aurelius's *Meditations*) and a short-story
  collection (*The Adventures of Sherlock Holmes*, which uses `<article>`
  instead of `<section>` for each story — the extractor needed a real
  fix to handle both). GitHub's API allows 60 unauthenticated
  requests/hour; a free GitHub account + personal access token
  (no scopes needed) raises that to 5,000/hour — set as `GITHUB_TOKEN`.

**Classic literature / general public domain — no connector yet, real candidates:**
- [Internet Archive Texts](https://archive.org/details/texts) — huge
  public-domain and open-access scanned/OCR'd collection; check each
  item's own rights statement, since it also hosts in-copyright loans.
- [Wikisource](https://wikisource.org) — crowd-transcribed public-domain
  and CC-licensed primary sources; its MediaWiki API (`action=parse`,
  no key, no auth) is genuinely open and was test-fetched successfully,
  but many longer works are split across multiple linked subpages (one
  wiki page per chapter, chained via a `{{header}}` template's
  previous/next fields) — a real second problem beyond wikitext-to-text
  conversion, scoped as its own connector rather than folded into this
  session's work.
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

**Research papers — the priority, 2026-07-08: two connectors already
exist, several more real candidates, and the actual current gap is
integration, not sourcing (see the dedicated section right after this
list):**
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
- [PLOS](https://plos.org) — Public Library of Science; every article
  in every PLOS journal is CC-BY, no exceptions, no per-article
  license-checking needed — about as clean a source as exists here.
- [OpenAlex](https://openalex.org) — `openalex.py`, added 2026-07-08. No
  key, no signup; one API that points at the legal open-access copy of a
  paper across many publishers in one lookup instead of searching each
  source separately, plus a reconstructed plain-text abstract (OpenAlex
  stores these as a word-position index, not a string, for copyright
  reasons — the connector reassembles it) and, when the source declares
  one, the paper's real license. Verified live end-to-end: searched,
  fetched a CC-BY paper's metadata and PDF, ran it straight through
  `pdf-to-text.py` — the exact pairing this connector was scoped for.
- [Unpaywall](https://unpaywall.org) — not a source of papers itself,
  but an API that finds the legal open-access version of a paper given
  its DOI; genuinely useful paired with OpenAlex or Semantic Scholar's
  own search — look a paper up, then ask Unpaywall where the real
  legal copy actually lives before fetching anything.
- [bioRxiv](https://biorxiv.org) / [medRxiv](https://medrxiv.org) —
  biology/medicine preprints; license varies per paper (many CC-BY,
  some more restrictive), check the specific paper's license tag, same
  discipline as arXiv.
- [SciELO](https://scielo.org) — open-access journals, strong Latin
  American and Global South coverage most of the sources above don't
  reach; license varies per journal, check per article.

## Turning a paper into something the Reader can actually page through

**This is the real gap, not sourcing** — `arxiv.py` already fetches a
paper; what happens after is the problem. Right now a fetched arXiv PDF
gets read *outside* the game, breaking the one promise every other
shelf entry keeps: read it, note it, bring it into today's plan,
without leaving the Pavilion.

**Why this stalled at "fetch," not "shelve": PDFs aren't plain text.**
Every existing connector (`gutenberg.py`, `suttacentral.py`) works
because the source hands back clean text directly — no extraction step
needed. A PDF is a page-layout format, not a text format; getting
readable text out of one is a real, separate problem the existing
pipeline has never had to solve.

**The actual fix — one new step, not a new pipeline:**
1. **Fetch the PDF** — `arxiv.py` and `semanticscholar.py`'s
   `download-pdf` commands already do this.
2. **Extract plain text from it** — **done, 2026-07-08:**
   `tools/caravan/pdf-to-text.py`, one job only: take a PDF, hand back
   clean paragraph text in the same `library-sources/<slug>.txt` shape
   `library-draft.py` already expects (Title:/Author: header, same as
   `gutenberg.py --for-library`). Needed the one real dependency this
   plan called out (`pypdf`, pure-Python, `pip install pypdf` — the one
   Caravan script that isn't stdlib-only, for exactly the reason named
   here). Verified live against a real fetched arXiv paper (a 66-page,
   equation-dense tutorial): full run end-to-end, readable straight
   through, math notation the expected rough edge — matches the "gets
   you 90%, still needs a human pass" trust model below exactly, not a
   surprise found after the fact.
3. **From there, the existing pipeline already works unchanged** —
   `library-draft.py` → write the real summary by hand → `promote-draft.py`
   → `push-fulltext.py`. A paper becomes a shelf entry exactly the way
   a book does today, on the existing **Science** shelf (already in
   `TRADITIONS`, no new shelf/layout work needed); nothing downstream
   needs to know the source was ever a PDF.

**Known, real risk, worth naming honestly:** academic PDF layout is
messy — two-column text, footnotes, figure captions, references — and
naive extraction can interleave columns or scramble reading order.
Expect the first version to need real per-paper cleanup, not a
one-shot perfect extraction; scope it as "gets you 90% of the way,
still needs a human pass before shelving," same trust model as every
other step in this pipeline that already assumes a human reads before
anything ships.

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

## The wishlist — real, verified candidates, added 2026-07-09

Asked for directly: a running list of specific titles to fetch one by
one in future sessions, not a fetch-everything-now instruction. Every
Gutenberg ID below was actually looked up (via Gutendex, the unofficial
Gutenberg metadata API) before being written down here — nothing
guessed. Verify the license/edition again at fetch time regardless,
same rule as everywhere else in this document.

**Spiritual texts — filling gaps the current seven shelves don't cover:**
- *The Analects* — Confucius, tr. James Legge (Gutenberg #3330). A
  natural sibling to the existing Daoism shelf — Confucianism is the
  other great current of classical Chinese thought, deliberately not
  the same one.
- *The Song Celestial* (the Bhagavad Gita) — tr. Sir Edwin Arnold
  (Gutenberg #2388). The best-known public-domain English verse
  translation; Hindu/Vedantic thought has no shelf at all yet, same
  situation Native American texts were in before 2026-07-09.
- *The Upanishads* (Gutenberg #3283) — pairs with the Gita as the
  older philosophical core it draws from.
- *The Imitation of Christ* — Thomas à Kempis (Gutenberg #1653). The
  most-read Christian contemplative text after the Bible itself;
  Christian mysticism/contemplative practice has no shelf yet either.
- Rumi (Sufi poetry) — real gap, not yet closed: no clean public-domain
  English edition of the Masnavi turned up on Gutenberg directly (unlike
  everything else on this list). Worth a dedicated look at Internet
  Archive or a named public-domain translator (R.A. Nicholson's is the
  classic one) rather than assuming Gutenberg has it.

**Tibetan Buddhism — requested directly, 2026-07-09 ("books on inner fire
and Milarepa"):** no clean Gutenberg match found (checked via Gutendex,
same as everything else on this list) — this one needs the Internet
Archive connector this document already flags as worth building next, or
a manual `library-inbox/` drop, not a guessed ID.
- *Tibet's Great Yogī Milarepa* — W. Y. Evans-Wentz's translation of
  Kazi Dawa-Samdup's rendering of *The Life of Milarepa*, first published
  1928 — pre-1929, so genuinely US public domain despite still being
  in print from Oxford today; confirm the specific scanned edition's
  own rights on Internet Archive before fetching, same rule as always.
  The direct source for "inner fire" — Milarepa's own practice of
  *tummo* (yogic heat) runs through this biography.
- *Sixty Songs of Milarepa* — a full text already up on Archive.org
  (`archive.org/stream/SixtySongsOfMilarepa`); translator and rights
  need checking at fetch time, not assumed from it being posted there.
- **84000** (already listed above) remains the deeper, more complete
  source for Tibetan canon generally, but its CC-BY-NC-ND license needs
  that explicit steward decision first — these two Evans-Wentz-adjacent
  texts are the closer-to-hand, likely-public-domain answer to this
  specific request in the meantime.

**Cookbooks — Mrs. Beeton (2026-07-09) already shelved; more real candidates:**
- *The Boston Cooking-School Cook Book* — Fannie Merritt Farmer, 1896
  (Gutenberg #65061). The foundational modern American cookbook —
  standardized measurements are largely her doing — same "practical
  reference, not just recipes" spirit as Beeton.
- *The Physiology of Taste* — Brillat-Savarin (Gutenberg #5434). Less a
  cookbook than food philosophy/essays; a different, complementary
  angle from Beeton's and Farmer's practical manuals.

**Classic literature — named directly, Moby Dick and neighbors:**
- *Moby-Dick* — Herman Melville (Gutenberg #2701). Named directly.
- Other real, obvious Classics-shelf-fiction candidates once fiction
  as a category actually gets used: *Pride and Prejudice* (Austen),
  *Crime and Punishment* (Dostoevsky, tr. Constance Garnett), *Don
  Quixote* (Cervantes, tr. John Ormsby), *Frankenstein* (Shelley),
  *The Adventures of Huckleberry Finn* (Twain) — all confirmed
  public domain, not yet individually ID-checked the way the titles
  above were, since this list is already long enough to act on first.

**✅ ALL FIVE SHELVED 2026-07-10** — added to `seed.js` (the version-
controlled source of truth) *and* promoted into the live Supabase
`library_documents` table via the Supabase MCP, so they appear in the
running app immediately (49 texts now, up from 44). Slugs:
`franklin-autobiography`, `emerson-essays`, `art-of-war`, `zhuangzi`,
`aesops-fables`.

**IMPORTANT — where book data lives, so this is never confused (the split
is decided in `LIBRARY-SCALING-PLAN.md`, restated here at the point books
actually get added):**
- **The full book TEXT belongs in local object storage — MinIO, running in
  Docker on your own machine, S3-style. NOT the cloud, not Supabase.** This
  is the local-first line: the actual content stays on your computer.
- **Supabase/Postgres holds only the catalog CARD** — title, license,
  source, summary, tags, and the search index. Small metadata, not the
  book. That's all that was promoted for these five.
- **So these five are catalog-only right now — no full text attached
  anywhere yet.** To make "📖 Read the full text" appear, run
  `tools/caravan/push-fulltext.py <slug> <textfile> …` for each, which
  uploads the real text into your local MinIO (Docker must be up:
  `docker ps` should show `sand-pavilion-minio`). That is the *only* place
  the book text goes — on the machine, in Docker.
- The four already-readable Buddhist texts (Dhammapada, etc.) are a third
  case: their full text is *bundled in the repo* (`data/library-texts/*.js`)
  rather than MinIO — fine for a handful, but MinIO is the path for scale.

**Direction-finding & practical self-betterment — matched to the north
star (ease, direction, knowledge into use), all HTTP-verified reachable
2026-07-10 (real 200s from `gutenberg.org/cache/epub/<id>/pg<id>.txt`,
not a Gutendex lookup this time — actually pinged):**
- *The Autobiography of Benjamin Franklin* (Gutenberg #20203). The
  original English-language self-improvement book — Franklin's rise from
  a candlemaker's son to printer, scientist, and statesman, and his
  famous project of the thirteen virtues with a daily examination. The
  single best fit for this project's own office/self-direction angle;
  belongs on the Practice shelf beside the homesteading and household
  manuals. Unambiguously public domain (written 1771–1790).
- *Essays: First Series* — Ralph Waldo Emerson (Gutenberg #16643).
  "Self-Reliance," "Compensation," "Circles" — the American gospel of
  trusting your own direction. Directly serves "help me find direction";
  a Classics-shelf philosophy entry. Public domain.
- *The Art of War* — Sun Tzu, tr. Lionel Giles 1910 (Gutenberg #132).
  Strategy and decision-making under constraint — reads as much like a
  manual for real choices as a military text. Practice shelf. Giles's
  translation is pre-1929 public domain.
- *Chuang Tzŭ* (Zhuangzi) — tr. Herbert Giles (Gutenberg #59709). The
  other foundational Daoist text beside the already-shelved Tao Te
  Ching, and the Course Board's own example course literally references
  "the Inner Chapters" — shelving it closes a loop the game already
  points at. Deepens the Daoism shelf. Public domain.
- *Aesop's Fables* (Gutenberg #21). Teaching-by-story, the exact texture
  the Mountain Monk already reaches for ("rather answer a heavy question
  with an unexpected story"); short, universally readable, fits Practice
  or Classics. Public domain.

**Known gap, not forgotten:** Euclid's *Elements* (Gutenberg #21076) —
same problem as Einstein's *Relativity* before it: geometry-heavy
texts often ship as HTML/EPUB only, no plain-text mirror. Worth a
real HTML-to-text extractor eventually (same shape as
`standardebooks.py`'s `bodymatter`-only extraction, or reusing
`pdf-to-text.py`'s cleanup logic against Gutenberg's HTML edition
instead of a PDF) rather than skipped forever — old mathematics and
science textbooks will keep hitting this same wall.

## Roadmap — in rough order

1. **`tools/caravan/pdf-to-text.py` — done, 2026-07-08.** See "Turning a
   paper into something the Reader can actually page through" above.
   This was the one piece actually blocking research papers from being
   real shelf entries instead of external downloads; a fetched arXiv or
   Semantic Scholar PDF can now go through the exact same
   fetch → extract → draft → write summary → promote → attach-fulltext
   pipeline as any other source, landing on the Science shelf.
2. **An OpenAlex connector — done, 2026-07-08.** `tools/caravan/openalex.py`.
   See the Research papers list above for what it verified.
3. **A Standard Ebooks connector — done, 2026-07-08.**
   `tools/caravan/standardebooks.py`. See the Classic literature list
   above for the real OPDS-auth gotcha found and worked around.
   **Wikisource still open** — same rough shape (search, fetch, convert
   to text) but needs its own multi-page/chapter-chain handling first;
   real candidate for the next session in this vein.
4. **An OpenStax connector** — the textbook-specific version of the
   same Science-shelf gap, real current professionally-written
   textbooks rather than 19th-century public domain science writing.
5. **An Internet Archive connector** — the highest-volume option by
   far; needs the most care distinguishing actual public-domain items
   from access-restricted loans before fetching anything.
6. **In-game discoverability** — SuttaCentral already has a live
   in-game search (Caravan Desk); the same pattern (search a source,
   preview a result, one-click into a draft) is worth extending to
   whichever connector above gets built next, rather than leaving new
   sources terminal-only forever.
7. **A visible "how a book gets here" panel at the Caravan Desk** —
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

---

## More open sources — asked directly 2026-07-27 ("anything like Google Scholar?")

**On Google Scholar specifically: no.** It has no public API and its terms
forbid automated access; every "Scholar API" is a scraper that will break and
would put a user in the wrong. Say so plainly rather than half-building it. The
good news is that the legitimate open-access world is *better* for this purpose,
because it hands you a licence with the text.

**The honest substitutes for Scholar, in order of usefulness here:**

- **[OpenAlex](https://openalex.org)** — already connected (`openalex.py`). A
  full open catalogue of ~250M works, free API, no key. This *is* the Scholar
  replacement for search and metadata.
- **[CORE](https://core.ac.uk)** — the biggest aggregator of open-access
  full text (not just metadata). Free API key. **The best single addition** if
  you want papers you can actually read rather than cite.
- **[Unpaywall](https://unpaywall.org)** — give it a DOI, get back a legal
  open-access copy if one exists. Tiny, free, and exactly the "I found a paper,
  can I legally read it?" tool. Pairs with everything above.
- **[DOAJ](https://doaj.org)** — every journal on it is fully open access, so
  the licence question is answered before you start.
- **[PubMed Central OA subset](https://www.ncbi.nlm.nih.gov/pmc/tools/openftlist/)**
  — medicine and biology, with a machine-readable licence per article.
- **[Zenodo](https://zenodo.org)** — CERN-run; papers, datasets, and software,
  every item with an explicit licence.
- **bioRxiv / medRxiv** — preprints, free APIs. Preprints, so: not peer
  reviewed, and the Hall's appraisal method matters more here, not less.

**More books, beyond what's already listed above:**

- **[Open Library](https://openlibrary.org)** (Internet Archive) — a real API,
  and the cleanest way to look a book up by ISBN and get its metadata.
- **[Wikisource](https://wikisource.org)** — already on the list above and still
  the best unbuilt connector: crowd-transcribed public-domain texts with a real
  API and no scraping needed.
- **[LibriVox](https://librivox.org)** — public-domain *audiobooks*. Worth
  naming because the Pavilion already reads aloud; a real human recording of a
  public-domain classic is better than any TTS, and it's free.
- **[Global Grey](https://www.globalgreyebooks.com)** and
  **[ManyBooks](https://manybooks.net)** — smaller curated public-domain
  collections, useful for filling gaps Gutenberg formats badly.

**What to actually do first:** these all need the desktop fetch door
(`MAINTAINING.md`, the backend section) before they can be in-game, because a
browser can't reach them. Until then the honest path is the same as now:
download by hand, drag it in. **What was added today** is the cheap half —
these sources now appear in the drag-and-drop "where did it come from?" list, so
the licence field fills itself in correctly instead of being typed from memory.
