# Pathways — bringing a page you're reading into the Pavilion

Written **2026-07-28**, from:

> *"Is there a way we can have a web scraper or something if I have a webpage
> open in my browser — say I'm reading a paper, or want a transcript of a
> YouTube video, for making a training plan... the pathways can be part of the
> user's API settings and in Python, so they don't take local AI to do from
> scratch, just run a preloaded program to web scrape it and take what's
> useful."*

The sharpened successor to [`WEB-VESSEL-PLAN.md`](WEB-VESSEL-PLAN.md)
(2026-07-12), which had the goal right and the architecture vaguer. The second
half of that sentence is the good part, and this plan is mostly its
consequences.

**Status: a plan. Build the first slice only when the beta has real users.**

---

## The insight worth naming: extraction is not an AI job

The obvious design is *"hand the page to the local model and ask for the useful
part."* It is also wrong, for exactly the reason today's lesson-drafting fix
taught (`BETA-TESTING-FEEDBACK.md` #15):

> **Do not give a model work that deterministic code does better.**

Handing 400 KB of HTML to an 8B model to find the article text is slow
(minutes), unreliable (it will paraphrase, truncate, or invent), and expensive
in the only currency that matters on a laptop — memory and heat. A forty-line
Python function gets it exactly right, every time, for nothing.

So the division of labour:

| | Does what | Why it belongs there |
|---|---|---|
| **A pathway** — Python, deterministic | finds the article body, the transcript, the abstract; strips nav, ads, cookie banners; keeps URL, title, author, date | a parsing problem, with a right answer |
| **A resident** — the local AI | reads clean text and *thinks*: summarise, connect it to your shelves, draft a training plan, quiz you on it | a judgement problem, with no single right answer |

**The model never sees HTML.** It sees a clean document — the same shape as a
book, which is what everything downstream already handles.

This is also why it stays quick on a modest machine: the expensive part costs
nothing, and the model only ever reads what a person would have read.

---

## Pathways are Caravan connectors, generalised

The pattern already exists and has for weeks: `tools/caravan/gutenberg.py`,
`arxiv.py`, `openalex.py`, `suttacentral.py`, `standardebooks.py`,
`semanticscholar.py`, `pdf-to-text.py`. Each one is

- **stdlib-only Python** — nothing to install, nothing to break
- **one named source**, hand-picked
- output in **one fixed shape** the Pavilion already imports

`gutenberg.py`'s own docstring states the rule: *"one connector per allowed
source, added by hand, not a general-purpose scraper."* That was right then and
it is right now. **A pathway is that same thing, pointed at a page you are
reading rather than a catalogue ID.**

### The four worth shipping first

| Pathway | Takes | Gives back |
|---|---|---|
| `article` | any URL or pasted page | title, author, date, body — a readability heuristic, the same idea as a browser's Reader Mode |
| `youtube` | a video URL | the caption track as plain text, timestamps kept as paragraph markers |
| `arxiv` / `openalex` | a paper URL or DOI | abstract, authors, open full text — **already built** |
| `pdf` | a local file | text — **already built** |

**YouTube deserves to be first-class.** *"Watch a talk, get a study plan out of
it"* is a real want that nothing serves well. The caption track is fetchable as
plain text with the standard library, and once it is a transcript it behaves
like any other document: shelvable, note-able, readable aloud, feedable to the
Tutor.

### Where they live

In settings, beside the AI connections — same place, same mental model: *these
are the outlets you have wired up.* A pathway is a file, a name, and the source
it handles.

Shipping four does not stop anyone writing a fifth. **Someone who writes a
pathway for their own favourite site should be able to drop it in and see it
appear** — the "fill your own Pavilion" instinct, applied to a new kind of
thing.

---

## Getting the page in — four routes

1. **Paste.** Works today, everywhere, no infrastructure, no permissions.
   Underrated: select-all, copy, paste — a pathway cleans text as well as HTML.
2. **Drag the saved file in.** Works today; already the main path.
3. **A bookmarklet or small browser extension.** One click on the page you
   already have open, posting its text to the Pavilion on localhost. **This is
   probably the best answer to the actual question asked**, and the smallest:
   the browser has already fetched and rendered the page, you are already logged
   in where you need to be, and paywalls and cookie walls are handled by you
   being an ordinary reader. No crawler, no widened bridge, no credential
   handling anywhere.
4. **Fetch the URL directly.** Desktop only, and it requires widening the
   `electron/main.cjs` bridge past localhost — which its own comment warns
   against: *"this bridge exists to fix Ollama's CORS wall, not to become a
   general fetch-anything-from-the-renderer hole."* If it is ever done it wants
   an allowlist, a size cap, a timeout, no cookies and no forwarded credentials,
   decided deliberately rather than arriving as a side effect.

Route 3 is the interesting one and it is genuinely small. Try it before 4.

---

## Personal work, and where the line actually is

> *"This will be part of the user's personal work and not something to share
> publicly or for sale."*

That line already exists in the codebase, and is enforced exactly where it
matters. Your own shelf asks for **no licence and no source** — a personal copy
is your business. The moment something might be handed to another person,
`data/copyright.js` applies: deterministic rules decide, the model only gathers
evidence, and uncertainty always defaults to personal.

**A captured page is personal by construction.** It lands on your shelf with its
source URL and capture date attached, marked 👤, and is excluded from sharing by
default — not because a rule forbids it, but because it has not earned its way
across that line and the app should not pretend otherwise.

---

## Guidelines, not rules

> *"If we can do that while setting proper guidelines rather than rules we
> should be ok. Rules are for the government and we will follow them. But I want
> our job to be one of guidance and a place for people to find their footing and
> have the tools to support their own intentions."*

Consistent with how the residents are already written — capability through
identity, knowledge and real grounding, never a fear-based rulebook. Applied
here:

**The app enforces exactly one thing: the sharing boundary.** That is where
another person is affected, so that is where a rule belongs. Everything else is
craft, and craft is taught by showing rather than blocking.

**Good practice, written as practice:**

- Take what you were going to read anyway. A pathway is a better pair of
  scissors, not a vacuum cleaner.
- One page at a time, at human speed. Nothing crawls, follows links, or runs on
  a timer — which is just "nothing moves by itself" applied to the web.
- Keep the URL and the date on everything. Not for compliance: a quote you
  cannot source is worth less **to you** in six months.
- Respect `robots.txt` where it speaks, and identify the tool honestly in its
  user agent. Both are cheap; both are what a good neighbour does.
- If a site offers an API or a bulk download, prefer it. Kinder to them, more
  reliable for you.
- What you captured is yours to read. It is not yours to republish — and the
  Pavilion keeps those two things visibly separate on your behalf, so you never
  have to hold the distinction in your head.

The job is to make the good version the easy version, and to keep provenance
visible so a person can make their own call with the facts in front of them.
That is guidance. The one place guidance is not enough — handing someone else's
copyrighted text to a third person — already has a rule, and already has a test.

---

## Why this is foundation rather than a feature

The request framed it as *"a foundation that can support the future."* It is,
and specifically:

- **A pathway's output is the same shape as a Caravan connector's**, so the
  intake table, the personal shelf, the copyright triage and the reader already
  accept it. Nothing downstream needs building.
- **Anything captured becomes an ordinary document**, so every existing tool
  works on it on day one, free: read-aloud, book notes, spark-to-the-Writing-
  Desk, the Science Hall's dissect, lesson drafting, the Tutor.
- **It is the missing input side.** The Pavilion is already good at holding,
  breaking down and using material. This is how material gets in from the place
  most of it actually lives.

That is what snowballing looks like structurally: each new pathway multiplies
against every tool already built, rather than adding a feature that stands alone.

---

## First honest slice

In order, each useful on its own:

1. **`youtube.py` and `article.py` as ordinary Caravan connectors** — run from a
   terminal, output pasted in. Zero app changes, immediately useful, and it
   proves extraction quality before any UI is committed to.
2. **A pathway picker in the intake table** — paste a URL, choose a pathway, get
   a document. Still no widened bridge.
3. **The bookmarklet**, if "capture what I have open" is still the thing most
   wanted after 1 and 2.
4. **Then**, only if genuinely needed, the narrowed fetch bridge.
