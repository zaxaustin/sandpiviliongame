# The Third Wall — what a local AI does with what it cannot answer

**Written 2026-08-03, for review. Nothing here is built.**

From the steward, and it is the right question rather than the obvious one:

> **how do we give the local AI access to the internet, or to questions with
> no answers, without hallucinating** — access to search the web, or to say
> *"write a note"* or *"get a book about this topic so we can talk about
> it"*, if we cannot get the internet for it.
>
> *"this will be important to track if we let the local ai be a user for the
> game in the future."*

---

## The problem, stated exactly

This session made one rule real: *if a resident does not have a reference, it
says so instead of guessing.* Quill searches the database, and an empty result
is now a fact he may state rather than a gap in what he happened to be shown.

**But "I don't know" is a dead end, and a dead end is what a hallucination is
for.** A model that has nowhere to put an unanswerable question will fill the
silence, because filling silence is what it was trained to do. Telling it not
to is the weakest possible fix — it is the same "be careful" instruction that
failed on the pre-notes, where a prompt saying *never invent a quotation*
produced an invented quotation.

**So the cure is not a stricter rule. It is somewhere for the gap to go.**

---

## Part 1 — Turn the gap into an ACTION (buildable now, no internet)

The Pavilion already has the machinery. What is missing is the residents'
permission and route to use it.

> **"I don't have anything on that"** → **"shall I put it on the Request
> Board so we can read it together?"**

**What already exists and would be reused, not rebuilt:**

- **The Request Board** (`openRequests()`, the Study) — books the visitor
  wants fetched. Already the honest answer to "a browser cannot reach
  Project Gutenberg", already in Quill's prompt as a place to point.
- **Notes** — `data.notes`, and now a `notes` table with full-text search.
- **Paths and the Learning Tree** — an idea picked up and walked.
- **`records`** (added 2026-08-03) — the index that can hold *"the
  Investigator asked for a paper on 3 August"* as a thing that happened.

**The four honest moves**, in rough order of how often they will fire:

| the gap | the action | where it lands |
|---|---|---|
| a book we do not have | **request it** | Request Board |
| a fact we cannot check | **note the open question** | a note, tagged `open` |
| a topic worth learning | **make it a path** | the Learning Tree |
| a claim worth testing | **open an investigation** | the Science Hall |

**The design rule, and it is the whole safety property:** *the resident may
PROPOSE; only the visitor may commit.* Nothing is filed by a model on its own.
That is the standing "nothing moves by itself" decision applied to residents,
and it is what keeps a helpful suggestion from becoming an agent quietly
filling your Request Board overnight.

**Why this is worth building even after Part 2 exists:** a fetched web result
is still not *yours*. A request, a note, a path — those are the Pavilion doing
what it is for. The internet answers a question; an action turns it into work.

---

## Part 2 — The internet, and why it needs its own scrutiny

**The steward's position, stated 2026-08-03 and governing this part: free
tools are prioritised, and he is not getting an API key.** So anything here
must work without one, or not be built.

**What is actually available:**

- **Ollama's web-search API** — free tier, but it needs an account key, which
  puts it on the wrong side of the line above. Worth naming honestly rather
  than assuming it qualifies as "free".
- **A free cloud model** — same problem in most cases.
- **A deterministic fetcher of our own** — the Caravan connectors already do
  exactly this for Gutenberg and arXiv, in Python, with no model involved.
  **This is the one that fits the standing decisions**: build it ourselves,
  extraction is deterministic and never an AI job, and it needs no account
  anywhere.

**So the recommendation, and it inverts the obvious order:** do not start with
"give the model a search engine". Start by letting a resident *ask for a
Caravan fetch* — the tools already work, they are ours, and they need no key.
General web search is the thing to scrutinise later, behind the
green/yellow/red badge in `TRUST-LEVELS-AND-GATEWAYS-PLAN.md`, where the
colour answers exactly one question: **what leaves this machine.**

**The line that must not be crossed quietly:** the moment a resident can reach
the internet, the Pavilion stops being local-first in the way its README
promises. That is a real change and it must be an eyes-open, per-resident,
per-request opt-in — never a default, never a silent capability.

---

## Part 3 — The desktop companion, and the actual third wall

The other half of the steward's framing:

> *"the sand pavilion is a small window that is useful for desktop work and
> leisure — to read a book, or to have a youtube transcript they want
> analysed. there needs to be a way to acknowledge that work outside this
> game window."*

**This is the inverse of Part 2**: rather than the Pavilion reaching out, the
world comes in. `plans/CAPTURE-PATHWAYS-PLAN.md` already holds the design and
its load-bearing decision — **extraction is deterministic Python, a Caravan
connector, never an AI job; the model only ever sees clean text.** A YouTube
transcript is exactly that shape: fetched and cleaned by code, then analysed
like any other text, with a dissection and notes and a citation.

**What joins it up with everything else:** once it is in, it is a book-shaped
thing — it has a card, it can be dissected, noted, cited by chapter. Nothing
new to learn. That is the payoff of having built the library machinery first.

---

## Part 4 — When the local AI is a user of the game

The steward's forward-looking note, and the reason to design Part 1 properly
rather than bolt it on:

> *"this will be important to track if we let the local ai be a user for the
> game in the future."*

If a resident can file a request, it is taking an action in the world. That is
the first real step from *answering machine* to *inhabitant*, and it is the
direction `LIVING-VILLAGE-PLAN.md` and `AGENT-EMBODIMENT-PLAN.md` already
point at.

**What that demands from Part 1, from the start:**

- **Every proposed action is recorded** — who proposed it, when, on what
  question, and whether the visitor accepted. The `records` table already has
  the shape; `kind` gains `'proposal'`.
- **Attribution is never lost.** A request filed at the Investigator's
  suggestion must say so forever. When agents act, "who did this" is the
  whole audit trail.
- **The visitor's commit stays mandatory** until there is a deliberate,
  separate decision to relax it — and that decision deserves its own plan,
  not a flag.

---

## Order, if this is approved

1. **Part 1**, and only the *request* move first — one gap, one action, end
   to end, recorded. It is the smallest complete version and it exercises
   every piece.
2. The other three actions, once the first has been used for a week.
3. **Part 3** — the capture pathway, joined to the Caravan connectors.
4. **Part 2**, last and with the badge, because it is the only part that
   changes what leaves the machine.

## What would tell us it works

Not a test suite. **A week of real use**, and one question: *how often did a
resident turn "I don't know" into something you actually wanted?* If the
answer is "rarely, and the suggestions were noise", the feature is wrong and
should be pulled rather than tuned — a resident that proposes constantly is a
worse companion than one that simply says it does not know.
