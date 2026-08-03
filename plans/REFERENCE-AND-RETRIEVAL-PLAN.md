# What the local models actually know — and the two things to build

Written 2026-08-03, from the steward's question, which is the right one:

> "whats the database of these local modles? is it just the library and there
> offline? if so we should build a referance database for them for basic
> science and math"

---

## The honest answer first

**They have no database.** A local model is a weights file. Everything it
"knows" was compressed into those weights at training time and is frozen —
there is no lookup, no index, no source it can consult, and no way for it to
tell what it half-remembers from what it is confabulating.

The only database it gets is **whatever the Pavilion pastes into the prompt**,
fresh, every single message:

| resident | what it is handed |
|---|---|
| Quill | every book's title, shelf, licence and summary — **never a word of the text** |
| Sebastian | today's plan, calendar, what's due, what's open |
| the Steward | where you stand on the ladder (added 2026-08-03) |
| the Investigator / the dissection lenses | the one passage you point at |
| the Tutor | the lesson, plus the list of paper books you own |
| the Computer | nothing — most of it needs no AI at all |

So: no, it is not "the Library." Quill knows a book *exists* and what its blurb
says. He has never read one.

That single fact explains most of what feels thin about working with a local
model here, and it is the reason "really go through the jspace paper with the
local AI" is hard today: it can only see the chunk you hand it, and it cannot
check a number against anything.

## Two different problems, and they need different machines

**1. It cannot look INSIDE the books.** → retrieval.
**2. It cannot check a FACT it is unsure of.** → the reference database.

The steward proposed the second. Both are real, and the second is smaller,
sharper and more useful sooner, so it goes first.

---

## Part A — The reference database (basic science and maths)

**The idea, sharpened:** not "more things for the model to read," but **a set
of facts the model is not allowed to make up.** Deterministic, checkable,
loaded from a file, and — this is the point — **usable with no AI at all**,
exactly like the Computer's `ls` and `hash`.

This is the token-thrift ladder the project already runs on, applied to facts:

> deterministic code → a looked-up constant → the model on what is left

### What goes in it

Chosen by one test: **things a model gets subtly wrong and you cannot easily
notice.** Not encyclopaedia entries — an encyclopaedia is what the weights
already are, badly.

- **Physical constants** — c, e, k, h, g, ε₀, µ₀, N_A, with units and exact
  vs. measured flagged.
- **SI prefixes and unit conversions** — the single commonest silent error in
  any electronics calculation, off by a thousand.
- **Formulas that are cheap to state and expensive to misremember** — Ohm's
  law, power, voltage dividers, RC time constants, resonance, the small set of
  trig and log identities that actually get used.
- **Component reference** — resistor colour bands, E12/E24 series, standard
  capacitor markings, common logic-level thresholds.
- **Maths facts with a fixed answer** — derivative and integral tables for the
  handful of functions that appear constantly, unit-circle values.

Deliberately **not** in it: anything contested, anything that needs a citation
to be meaningful, anything that changes. Those belong in the Library, with
provenance, where the two-axis system already governs them.

### How it is used

1. **At the Computer, with no AI:** `ref <term>` — `ref ohm`, `ref 4k7`,
   `ref c`, `ref farad`. Instant, offline, exact. This alone earns the file.
2. **Handed to the residents, but only when relevant.** Not pasted wholesale —
   that would repeat the catalogue mistake this same day exposed. A term is
   matched out of the question and only the matching entries go in the prompt,
   with an instruction: *use these values; do not recall your own.*
3. **As a check.** When a resident states a constant that the table also holds
   and the numbers disagree, say so in the UI. A model confidently giving
   c = 3.0 × 10⁸ where precision matters is exactly the failure this catches.

### Why build it rather than reach for one

The standing decision: **build it ourselves before reaching for a third
party.** A constants table is a few hundred lines of data that never expires,
needs no service, and works on a plane. Reaching for an API to look up the
speed of light would be absurd — and it is the same instinct that keeps this
project local-first everywhere else.

**Stage 1** — `src/game/data/reference.js`, the table plus `lookup(term)`, and
`ref` at the Computer. No AI anywhere in it. Covered by `npm test`, because
a reference table with a wrong number in it is worse than no table.
**Stage 2** — relevant entries injected into the work residents' prompts.
**Stage 3** — the disagreement check.

---

## Part B — Retrieval (looking inside the books)

The larger one, and the reason it is second: it is genuinely harder, and Part A
delivers value on day one.

**The problem, concretely.** `searchDocs()` returns `null` — there is no
search. Quill is handed a list of titles; the dissection lenses are handed the
one page you opened them from. Nothing can answer "what does this book say
about X" without you finding the passage first.

**The honest constraint:** proper semantic retrieval wants embeddings, and
embeddings want either a model call per chunk (slow, and this machine's real
limit is cooling) or a stored index that must be rebuilt as the Library grows.
That is a real cost and it should not be pretended away.

**First slice, which needs none of that:** keyword retrieval over the full text
already on disk. Split each book into passages, match the question's terms,
hand the model **the three best passages with their page numbers** instead of a
summary. Unglamorous, fully deterministic, testable, and it turns "I can only
discuss the page you opened" into "let me find where it says that." Most of the
value of retrieval is in this slice.

**Second slice:** embeddings, if and only if the first proves too blunt — with
the index built once, on demand, and stored beside the text in MinIO where the
bulk text already lives.

**What this unlocks, in the steward's own words:** taking the jspace paper and
"really going through it" — because a lens could then work across the whole
paper rather than the page in front of you, and cite where it got each thing.

---

## The thing this document exists to prevent

Both parts have the same failure mode, and it is the one this project keeps
finding: **pasting more into the prompt.** The catalogue bug found the same day
(`data/catalogue-brief.js`) is the warning — the whole Library was being recited
on every message, so owning more books made the librarian worse.

So the rule for both: **retrieve the relevant fragment, never the corpus.**
A reference table with 400 entries must add ~40 tokens to a prompt, not 4,000.
