# Architecture brief — for a reviewer reading this repo cold

*Written 2026-08-10, for an outside architect who can **read** the code but not
run it. Every number here was measured on the day, not remembered.*

**What this document is for.** The other docs describe *what exists*. This one
gives you the two things reading alone cannot: **why the odd decisions are odd**,
and **which questions are genuinely open**. If you only read one section, read
[the open questions](#the-open-questions).

---

## 1 · What this actually is

Strip the game fiction and it is a **local-first personal knowledge tool**:

- a **library** you fill yourself (415 books on the author's machine), with a
  reader, a catalogue, full-text search over your notes, and chapter detection
- a **day planner** — tasks, a calendar, notes, courses, a learning tree
- **seven AI residents** answering over that material, each on a local model

The rooms and the pixel art are **the UI metaphor**, not the point. The stated
design goal is *"a front for a real user interface that could rival a non-code
IDE for a lay user."* Nothing may be a dead end; every artifact must be reachable
*and* actionable from wherever you are looking at it.

**Stack:** vanilla ES modules, no framework, Vite build, Electron desktop shell.
Postgres (containerised **or** embedded PGlite) for the index. MinIO for book
text. `localStorage` for the save. **No server, no accounts, no telemetry** —
not as policy but because none is built.

## 2 · The constraints, which explain nearly every strange choice

Read these first or half the codebase looks like over-engineering.

| constraint | consequence you will see everywhere |
|---|---|
| **An ~8B model on a cooling-limited desktop** | every list handed to a model is capped and names its remainder; prompt budgets are enforced by tests; counting/matching/filtering is done in code, never by the model |
| **A lay user — no terminal, no config file** | features that need something absent are *absent or locked with an explanation*, never degraded; setup steps are copyable buttons |
| **Must run with no cloud account** | three storage tiers that each degrade honestly; the web build is a complete Pavilion with nothing installed |
| **Two Pavilions** | the author's own (rich, 415 books, Docker) and a lean shareable build. A change has to know which it serves |
| **Nothing moves by itself** | **no background polling anywhere.** Every AI call is triggered by a human action. No sync, no upload |
| **The low-res look is a resource choice** | the renderer is deliberately cheap so the machine's power goes to the model and the index |

**The governing principle**, in the author's words:

> *"i would rather have a strong foundation for tomrrow than loose functionalty
> for the local ai."*

A weak model is never a reason to cut a feature — it is a reason to do more of
the work in deterministic code and hand the model the small, already-correct
thing.

## 3 · The shape of the code

```
data/seed.js → data/store.js → scenes.js → entities.js → ui/overlays.js → render.js → main.js
(content)      (persistence)   (world)     (state+logic)  (DOM panels)     (canvas)    (loop+input)
```

**Roughly 25k lines of JS in `src/game/`.** The distribution is lopsided and
that is the main structural problem:

| file | lines | |
|---|---|---|
| `ui/overlays.js` | **12,966** | every panel not yet extracted, 732 top-level defs, ~2,000 lines of HTML strings |
| `render.js` | 1,121 | canvas only; reads state, never mutates |
| `ui/lesson-tree.js` | 1,063 | extracted |
| `ui/residents.js` | 1,017 | extracted — all seven system prompts |
| `ui/study-table.js` | 747 | extracted |
| `scenes.js` | 584 | pure data: tile grids, warps, stations |
| ~30 × `data/*.js` | 150–350 each | pure logic, no DOM, each unit-tested |

### The seams that matter

- **`data/*.js` is pure and testable.** No DOM, no fetch, no `Store`. This is
  where every *rule* lives — what may be reached for, what a note's reach state
  is, where a book's text is, what is waiting for you today. `npm test` holds
  them in about a second, with no browser.
- **`initX(deps)` for extracted UI modules.** An extracted panel never imports
  backwards into `overlays.js`; it receives what it needs through one init call.
  Keeps the dependency graph acyclic and the seam written down.
- **The window-export block.** Every inline `onclick` must appear in one
  `Object.assign(window, {…})` block that `overlays.js` owns permanently. A test
  cross-checks it **both** ways — it has caught silently-dead buttons three times.
- **Named queries only.** The renderer asks for `'searchNotes'` or
  `'chaptersFor'`, never a SQL string. Every statement lives in `electron/db.cjs`.
- **`chatOptsFor(agentKey)` in `ai/provider.js`** — the single place any
  per-resident model decision would be made. It currently returns `{}` for
  everyone, which is now a deliberate decision (see §5).

### Two database homes under one seam

`electron/db.cjs` uses **containerised Postgres when it answers, embedded PGlite
otherwise** — and the choice sits **below** the named-query seam, so both run the
same SQL, same schema, same migration files. The renderer cannot tell which, and
must not try; only `dbStatus()` names it.

**This is the design decision most worth your scrutiny.** It exists to avoid a
second implementation, and `normalizeParams()` sits below the seam because the
two homes have **already disagreed twice** about the same named write (migrations
reached only one of them; a JS array for a `TEXT[]` parameter wrote on Docker and
failed on PGlite).

### The AI path

```
detectAI(connections) → first enabled connection that answers → AI (one provider for everyone)
CHAT_AGENTS[key].systemPrompt()  in ui/residents.js
  charter + identity + pathwayBlock(key) + roster + past asks
pathwayBlock() → library lookup · backpack · notes (only if asked) · reference · lens · stance
```

**One pathway, seven residents.** All seven reach the Library, the backpack and
your notes identically. The *only* difference is a one-line `lens` in
`data/roles.js` saying what that role does with what it found. Before this it was
2 of 7, because each prompt composed its grounding by hand.

**The backpack is the context-window bound.** A user explicitly carries items;
`fitToBudget()` caps the grounding in **tokens** (using the same estimator the
request uses, deliberately — a meter with its own idea of the answer drifts and
then lies). Measured static prompts: quill 1,059 · monk 2,386 · investigator
1,526 · sebastian 1,432 tokens against an 8k floor.

## 4 · The scars — why this codebase looks paranoid

Four failure modes have recurred often enough to shape the style. They are worth
knowing before you judge a defensive-looking construct.

1. **Silent failure is the house failure mode.** A button that does nothing, a
   panel that will not close, a door onto nothing. Nobody reports these; they
   stop using the feature. The codebase prefers a **loud wrong thing**.
2. **A hand-maintained list that must match another file always drifts.** It has
   happened with `hideAllOv()`, the window exports, the resident roster, the
   Computer's command list, and a seed-book count that was wrong in four
   documents at once. The fix is always **derive it and add a guard**.
3. **A function can be written, tested, documented — and have no caller.**
   `groundingFor()` was inert for a day with every unit test passing.
   `chatOptsFor()` is a *reachable* seam that returns `{}` and therefore enforces
   nothing. `groundingPlan()` — the module's own stated boundary — **still has no
   caller**, and a comment claims it does. **A pure function with no caller is
   perfectly testable and completely inert.**
4. **Guards are born dead.** One was satisfied by a *comment*; one parsed
   apostrophes in comments as string literals; one ran after the suite printed
   its verdict. The rule now is: **write the check, then break the thing it
   guards and watch it fail.**

**The `store.js` scar**, quoted often: *"the fallback path was the only path
anyone actually ran, which meant it was load-bearing while still being written
and tested as a fallback."*

## 5 · Two decisions that recently reversed

Useful because the reasoning is on the record and you may disagree with it.

- **The Monk no longer gets a bigger model, and may run on cloud.** He used to
  claim the largest local model with a deep token/timeout tier. Retired because
  guidance is carried by grounding rather than by thinking time, and on a
  cooling-limited machine a bigger model buys *slower* counsel. Then, separately:
  a laptop that cannot run a local model must not mean no Monk. **Every resident
  uses the one detected connection**, and 🏠/☁ labelling in the chat header
  carries the honesty.
- **The seed library is `[]` and that is permanent.** 27 books used to ship. They
  were deleted because a shelf nobody chose undercut the ownership argument —
  **and because they were hiding bugs**: `indexItems()` filtered on a `category`
  field only `seed.js` set, so the Index rendered **zero of 415 real books** while
  27 seed stubs rendered perfectly. Every test suite had been exercising the seed.

## 6 · Testing

- **`npm test`** (`test/smoke.mjs`, ~4,000 lines, no browser, ~1s) — pure-logic
  units plus a large set of **drift guards**: world reachability by flood fill,
  inline handlers ↔ window exports both ways, every `ui/` module resolves every
  name it executes, prompt budgets per resident, the Computer's help ↔
  implementation ↔ man pages, doc claims against source.
- **`test/live/*.mjs`** — puppeteer-core against a real Chrome on the built
  bundle. Screenshots are taken **and read**; several bugs were invisible to every
  assertion and obvious in the .png.
- **`test/live/*.cjs`** — must run under **Electron**, because a browser tab has
  no desktop bridge and therefore no database. `docker-home.cjs` covers the
  container; `records.cjs`/`note-search.cjs` cover fresh-embedded. **Neither can
  substitute for the other.**

---

## The open questions

**Where outside help is actually wanted.** Each is a real, current decision, not
a rhetorical framing.

**Each one states a position rather than just asking.** A question with no
proposal behind it gets you an essay; a proposal gets you a decision. Every
answer below is one we are prepared to act on — **the useful reply is where you
think it is wrong**, and why.

### Q1 · Is a *room* the right decomposition unit for `ui/overlays.js`?

12,966 lines, 732 top-level definitions. Five regions are already out
(`residents`, `lesson-tree`, `study-table`, `daily-tasks`, `dom`). The remaining
split order is now **derived** from `data/places.js`'s `scene` field — the same
table the pause menu is built from and that `npm test` cross-checks against
`scenes.js`.

Measured by room: library ~1,560 · hall ~510 · computer ~430 · notes ~420 ·
workshop ~350 · cafe ~280 · grove ~274 · planner ~246 · courses ~134.

**Our position: yes, keep the room as the unit** — but for a reason that is
about *change* rather than tidiness. Panels in this codebase are edited
one-room-at-a-time because features arrive one-room-at-a-time, so a room-shaped
module means an edit touches one file. It is also the only boundary already
enforced by a test, which matters more than elegance here: a hand-written module
list would be the fifth drifting list in this project.

**Where we think we might be wrong:** `library` at ~1,560 lines is over the
1,400 target on its own, so the unit clearly does not divide evenly. And the
Reader is arguably its own thing rather than part of the Library.

**Tell us:** whether a second axis (lifecycle, or data dependency) would cut
`library` better than splitting it by sub-room — and whether the ~2,000 lines of
inline HTML strings should be addressed *first*, since they may be the real
weight rather than the panel logic. Constraint: this stays a **moving job, not a
rewrite** — verbatim moves, one region per commit.

Plan: `plans/OVERLAYS-SPLIT-PLAN.md`.

### Q2 · Retrieval vs. the meter — is the proposed split right?

`data/retrieval.js` (BM25 over a book's own pages) is built and tested with
**one caller**. Residents currently get a *card* for a carried book, never its
text — so you can carry *Walden* to a resident and it cannot quote a line.

The obstacle: `carriedLines()` is **synchronous** and feeds both the prompt
*and* the backpack's on-screen meter. Loading book text is **async**. Making it
async makes the meter async — and **the meter must never disagree with the
prompt** (the `store.js` scar again).

**Proposed:** keep `carriedLines()` sync and card-only for the meter; add an
async `passagesFor(question, carried)` that runs only in the prompt path and
stashes what it included, reported afterwards in a receipt under the reply. The
meter becomes a *pre-send estimate of cards*; the receipt a *post-send statement
of fact*.

**Our position: the split is right, because the two things genuinely are
different questions.** "What can a resident see?" is answerable instantly from
the save; "what did it actually read?" is only knowable after the question
exists. Forcing one function to answer both is what would make the meter async
and eventually wrong. The receipt-after-the-fact pattern is already proven here
for note search.

**Where we think we might be wrong:** two numbers on screen (an estimate before,
a fact after) may just be confusing to a person, in which case the honest move is
to show only the receipt and drop the pre-send meter entirely.

**Tell us:** whether that is the better call — and how you would cache. Current
thinking is a small multi-slot cache keyed on slug + page count + a content
stamp, mirroring `study-table.js`. Paginating and tokenising a 563 KB book per
message is real CPU on a machine whose limit is cooling.

### Q3 · Two database homes under one seam — sound, or a liability?

Container-or-embedded chosen *below* the named-query boundary so there is one
SQL surface. They have already disagreed twice. The alternative (pick one, drop
the other) costs either the no-install property or the shared-between-machines
property.

**Our position: keep it, and this is the one we hold least confidently.** The
property it buys is real — every desktop install has a working index with
nothing to install, which is what let "needs Docker" be retired as a reason to
lock a feature. Both disagreements were caught and fixed *below* the seam, which
is the design working rather than failing.

**Where we think we might be wrong:** two homes need two test suites that cannot
substitute for each other, and that cost is permanent and grows with every
schema change. "It has already disagreed twice" is also readable as evidence
against, not for.

**Tell us:** whether the abstraction is at the right level, or whether the
honest move is to make the home *explicit* to callers that care and stop
pretending it is invisible.

### Q4 · The MinIO read/write asymmetry

Writes go through `mc` in a throwaway container, authenticated from `.env`.
**Reads are a bare unauthenticated `fetch('http://localhost:9000/…')` from the
renderer** — there is no `minioRead` on the desktop bridge at all, and the bucket
answers anonymously. Loopback-only, so low actual risk, but the policy was set by
hand and is in no compose file, no doc and no test.

**Our position: add an authenticated `minioRead` to the bridge, point the one
read path at it, keep the plain `fetch` as a fallback, and only then close the
bucket.** In that order, because closing the bucket first breaks every Docker
book at once. The asymmetry is not a security hole so much as an *undocumented
manual step a fresh machine will not have* — which shows up as "the book won't
load" rather than as a missing instruction.

**Where we think we might be wrong:** an IPC round-trip through `mc cat` for a
563 KB text may be materially slower than an HTTP GET, and streaming a large book
over IPC is awkward. If so the right answer might be to keep HTTP and add a
presigned URL instead.

**Tell us:** which, given the read path is on the hot path for opening any
Docker-stored book.

Plan: `plans/THE-BACKEND-UNTANGLE.md`.

### Q5 · Does one pathway for seven residents scale?

All seven get identical grounding; a one-line `lens` is the entire specialty.
This replaced seven hand-composed prompts that had drifted to the point where
the Investigator could not look up a book.

**Our position: it holds, because `pathwayBlock()` is composed rather than
listed.** It calls a fixed set of grounding builders in order; adding a resident
adds a row to `ROLES` and nothing else. That is the opposite of a
hand-maintained list — the failure mode it replaced.

**Where we think we might be wrong:** every resident paying for every grounding
block is only cheap while all of them are cheap. Retrieval (Q2) will make the
carried-books block *expensive*, and at that point "everyone gets everything"
may stop being right — the Computer probably does not need passages from a
carried book.

**Tell us:** whether grounding should become opt-in per role *before* retrieval
lands, and if so how to express that without recreating seven hand-composed
prompts. Our instinct is a declarative per-role list of grounding *kinds* rather
than per-role code, but we have not designed it.

### Q6 · What would you cut?

**The honest one, and the only question here where we do not have a position.**
This is a solo project that grew fast and is now consolidating. Candidates,
named plainly: the Science & Research Hall, the Inheritance Hall, the Commons
Table, the Café boards (dormant by design), the Learning Tree, the Academy
Tutor, fishing.

The bias to argue against is the author's own and it is explicit — *"i dont wana
loose features"* — so the useful answer is a **case**, not a list. What is the
strongest argument that a given room costs more attention than it returns? The
relevant measure is probably *"would a new visitor find this and understand it in
their first hour"*, since the current front-door problem is an empty Library and
no tutorial, not a shortage of rooms.

---

## Where to start reading

1. **`CLAUDE.md`** — the standing decisions, and the rules that were paid for.
   Short, and the fastest way into the project's judgement.
2. **This file**, then `MAINTAINING.md` for current state.
3. **`docs/THE-BACKEND.md`** — the storage layer, measured.
4. **`docs/DOCS-DRIFT.md`** — what is known-stale or known-unbacked. Read this
   before trusting any other document; it is the project's own honest ledger.
5. **`archive/dev-log-*.txt`** — the narrative, session by session, including
   retracted diagnoses. The most recent is the most useful.
6. **`data/lookup.js`, `data/carrying.js`, `data/note-reach.js`** — the three
   small pure modules that hold the rules about what an AI may see. If you read
   only code, read these.
