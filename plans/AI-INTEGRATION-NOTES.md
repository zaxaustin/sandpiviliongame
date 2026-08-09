# AI Integration — what's actually running, what it costs, and the rule

> **REWRITTEN 2026-08-10, from the code rather than from memory.** The previous
> version was dated 2026-07-10 and had become the most out-of-date file in the
> repository — it predated `lookup.js`, `carrying.js`, `note-reach.js`,
> `pathwayBlock()`, the `lens` in `roles.js`, the residents' move out of
> `overlays.js`, live streaming, and the Monk's retirement from a bigger model.
> **Four of its claims were false**, and two of those had been repeated into
> `CLAUDE.md` and `PROTOCOLS.md`. Every number below was measured today.

Originally written 2026-07-10, asked for directly: understand what's going on
under the hood, and set the priority plainly — **effectiveness before features
or extra personalities.** That framing was right and is unchanged.

## The one rule this document exists to state

**Make the AI actually work before making it more elaborate.** A resident that
answers reliably in a plain voice is worth more than a resident with a rich
personality that hangs, returns blank, or takes two minutes. Reliability and
speed first, then grounding and honesty, and only then character and flourish.

And the rule that now sits beside it, from 2026-08-10:

> *"we have to balance what the local ai can handle and real functionality and
> walk that line as best we can. i would rather have a strong foundation for
> tomrrow than loose functionalty for the local ai."*

**The model's limit is never a reason to cut a feature — it is a reason to do
more of the work in code.** An 8B model on a cooling-limited machine cannot hold
415 books, cannot be trusted to remember a rule, and cannot judge whether it is
allowed to read something. It does not follow that the Pavilion offers less. It
follows that counting, matching, filtering and deciding belong to deterministic
code, and the model is handed the small, relevant, already-correct thing.

---

## What actually happens when you talk to a resident

1. **Detection.** `detectAI(connections)` walks the enabled connections **in
   order** and takes the **first** one whose `isAvailable()` answers. That
   single provider is then `AI` for **every resident and every desk** — there is
   **no per-resident routing of any kind**. (`ai/provider.js`)

2. **The prompt.** Each resident's `systemPrompt()` — in **`ui/residents.js`**,
   not `overlays.js`, since 2026-08-04 — composes:
   - a charter: `CHARTER` (in-world), `WORK_CHARTER` (work tools),
     `BUTLER_CHARTER` (Sebastian)
   - its own identity paragraph
   - **`pathwayBlock(key)`** — the same road for all seven, see below
   - `rosterBlock()` and `pastAsksBlock()`
   - `withStanding()` appends `data.standing[agentKey]`, the single funnel every
     send path calls, so no route can skip a standing instruction

3. **The call.** `AI.chat(messages, opts)`. `stream:true` **when a caller passes
   `onStream`** — live token streaming is built and has been since 2026-07-11.
   `num_ctx` is set explicitly on **every** request; leaving it to Ollama's
   default silently discarded the front of the system prompt, which was the most
   expensive quiet bug this project has had.

4. **The safety nets.** An empty reply retries once at the `long` budget
   (search `isEmptyReply(reply)` in `overlays.js` — anchored to text rather than
   a line number, because line numbers here rot within a day). A dead
   connection falls back to scripted dialog and says
   so. `sendChatMessage`'s catch logs the real exception — it wraps the whole
   turn including prompt assembly, so a bug in *our* code used to be reported to
   the visitor as the model failing.

5. **Memory.** The last real questions per resident are kept (`agentMemory`) and
   fed into that resident's next system prompt, capped at 8 entries. Local,
   per-device, and visible — Quill's memory report shows exactly what he holds.

---

## One pathway, seven behaviours

`pathwayBlock()` in `ui/residents.js` assembles the whole road **once,
identically, for every resident**, so none can opt in and none can forget:

```
libraryLookupBlock  →  carriedBlock  →  notesLookupBlock  →  referenceShelfBlock
     →  referenceBlock  →  lensBlock  →  stanceBlock
```

**The only thing that differs is the `lens`** — one line in `data/roles.js`
saying what that role *does* with what it found. That is the entire specialty.

Before 2026-08-08 this was **2 of 7**: each `systemPrompt()` composed its
grounding by hand, so the Investigator — *"insists on evidence someone else
could check"* — could not look up a book.

**Why this is safe for the context window**, which is the obvious worry when
five more prompts grow a pathway. Every part is bounded *by construction*:

- the lookup returns only rows matching the visitor's own terms, capped at 12,
  and is **empty when the question has no terms**
- the backpack is capped in **tokens** by `fitToBudget()`, not in items
- the notes search runs **only when the visitor pressed the button**
- the paper shelf and reference desk are `capped()` at 8

**None of them grows with the size of the Library or with how much work the
visitor has done** — which is the exact failure the 2026-08-04 audit found in
three blocks at once, when the Monk turned out to be carrying all 294 books on
every message (~12,800 tokens, before a word of his own character).

### The boundary, and where it lives

`data/lookup.js` is the one road, and it is **code, not instruction** — *"a
prompt is a request and a function is a boundary."*

- **BOOKS ARE LOOKED UP** — the catalogue is shelf metadata, freely searchable
- **NOTES ARE NOT SEARCHED UNASKED** — `asked` is a **button press**, set for
  one message and cleared in a `finally`. Never inferred from wording
- **PUBLISHED IS PUBLIC** — you already decided that
- **SEALED IS SEALED** — `data/note-reach.js`, and it outranks everything,
  including carrying the note in yourself

`privacyLeaks()` re-checks everything about to enter a prompt, and the receipt
under the reply shows the visitor what was searched and what came back.

---

## The three reply tiers, with the real numbers

```js
REPLY_TOKENS  = { short: 450,   long: 1600,   deep: 3000  }
REPLY_TIMEOUT = { short: 90_000, long: 240_000, deep: 360_000 }   // ms
CTX_FLOOR = 4_096   CTX_CAP = 32_768   CTX_MARGIN = 256
estimateTokens() = chars / 3.4   // errs LARGE on purpose
```

*(The old version of this file listed the timeouts as 45s/120s/180s. They were
raised to 90s/240s/360s at the steward's ask — "don't cut a convo in the
middle" — and this file never followed.)*

- **short** — ordinary chat. The default, and what almost everything uses.
- **long** — real drafted documents: a course, a grant section, a lesson, a
  paper appraisal. Widely used: **14 call sites** pass `long:true` (13 in
  `overlays.js`, 1 in `lesson-tree.js`), measured 2026-08-10.
- **deep** — ⚠ **has no caller.** It was the Monk's tier and nothing has
  selected it since 2026-08-07. The entries stay in both tables because turning
  a tier back on is one option object; a table with an unused row is not a bug.

---

## ⚠ What retiring the Monk's tier actually cost — measured 2026-08-10

On 2026-08-07, at the steward's word — *"lets not treat the monk differently for
now hav him focus on guidens"* — `chatOptsFor()` was emptied to `return {}`.

**That one change dropped three properties. Only one of them was intended, and
the docs went on asserting the other two for three days.**

| property | intended? | status |
|---|---|---|
| the largest local model | **yes**, deliberate and documented | correctly retired |
| **local-only for the Monk** | no — but **ratified 2026-08-10** | ✅ **dropped on purpose**; 🏠/☁ in the chat header carries it |
| **`think:true` / visible reasoning** | **no** | ✗ **still gone, and still undecided** |

> **The local-only question is settled.** *"the monk can be cloud if there
> computer cant run local ai alot of people have laptops just let the user
> know."* A laptop that cannot run a local model must not mean no Mountain Monk.
> `isLocalConn()` now lives in `ai/provider.js` as the single definition,
> `detectAI()` stamps `AI.local`, and the chat header reads
> `🏠 connected — <model> · stays on this computer` or `☁ … · leaves this
> device`. **Standing rule: no surface that sends words to a model may omit
> that label.**

**Local-only.** `CLAUDE.md`, `MAINTAINING.md` and `provider.js`'s own comment
all said *"he is still local-only, by the cloud guard in the transport layer"* —
and warned, in the same breath, that losing one must not quietly lose the other.
**There is no such guard.** `chatOptsFor()` returns `{}`; `detectAI()` assigns
one connection to everyone; the only cloud-related code is `isCloudModel()`,
which keeps Ollama's *hosted* models out of `bestLocalModel()` — a different
question entirely, and `bestLocalModel()` no longer feeds any routing decision.
**Configure a cloud provider and the Monk speaks through it.**

**Visible reasoning.** The streaming reader accumulates `message.thinking`,
`p.lastThinking` holds it, and `renderChatView()` has a `💭 thought for a
moment` panel ready. But `think` defaults to `false` and **nothing in `src/`,
`tools/`, `electron/` or `test/` ever sets `think:true`.** The Monk's tier was
the only thing that ever had.

**Both are one option object away from working.** Nothing is broken and nothing
was deleted — this is a reachable seam that returns `{}`, which is the same
shape as `groundingFor()`, written and tested and callerless for a day.
`npm test` genuinely enforces that every `AI.chat` caller in `ui/` can reach
`chatOptsFor()` — the guard is real and good. **A reachable seam that decides
nothing still enforces nothing.**

Tracked as the top item in `docs/DOCS-DRIFT.md`, with the two honest options:
**restore the rules**, or **drop the promises everywhere** and let the 🏠/☁
labelling carry what it can. Until one is chosen, **do not restate either claim
in any document.**

---

## The prompt budget, and how it is held

`test/smoke.mjs` measures the **always-on role text** of each resident — the
string literals in `systemPrompt()` plus the charter and roster carried on
every message — and fails over budget:

| | quill | steward | investigator | monk | computer | tutor | sebastian |
|---|---|---|---|---|---|---|---|
| **budget** | 1,100 | 820 | 1,280 | **2,175** | 810 | 1,100 | 1,470 |

Situational blocks are excluded on purpose: they are real text, but only when
that context exists. **The Monk is the only one near his line**, because the
Eightfold Path is carried whole at the steward's request — and raising his
budget by 25 tokens was chosen over trimming it to pay for an unrelated fix.

Two lessons paid for in this guard, both worth keeping:
- **Comments must be stripped before string literals are counted.** An
  apostrophe in prose — *"the visitor's question"* — opens a fake string that
  swallows to the next quote. It exaggerated every number it printed.
- **`briefTokens()` takes text, not a character count.** Handed a number it
  measured the length of the number and reported 2 tokens for everyone — and
  passed against a prompt it had just been given 2,000 characters of padding.

---

## The CHARTER / WORK_CHARTER split

In-world residents (Quill, the Monk) carry the devotional `CHARTER`. Practical
work tools — the Computer, the Tutor, the Research and Grant desks, the
Steward **and** the Investigator — carry the neutral `WORK_CHARTER`: same
harm-declining guardrail, no roleplay, no devotional framing, and an explicit
instruction to serve any goal on its own terms. Sebastian has `BUTLER_CHARTER`.

**Never cross them.** A lesson planner that skewed every course toward the
dharma was a worse lesson planner. The Steward and the Investigator are the
same resident wearing two hats, and the Investigator's hat is secular on
purpose: a scientist committed to the answer isn't doing science.

## Don't force the model to conform

> *"we dont have to force the modles to conform so stricly — thats for fine
> tuning and having real personal modles which we are not there yet. having the
> game like format to focus the users intentions is more than enough."*

**The room already does the work.** Someone who walked to the Keep has already
narrowed what they want. So a prompt is **identity, knowledge, and real
grounding** — not a rulebook. A thinking model handed a list of constraints
audits itself against them mid-thought (*"Does this violate any rules?"* was
visible in the Monk's own reasoning on 2026-08-04), spending the visitor's
seconds on compliance instead of on them.

Every instruction in a prompt is paid for on every message, forever. Grounding
earns its place; another rule usually does not.

---

---

## What a local model is actually good at — and what that means here

*Brought by the steward 2026-08-10, from advice he went and asked for. Recorded
verbatim in substance because it is the clearest statement yet of what the
residents should be pointed at.*

**Strong at:**

- autocomplete / fill-in-the-middle
- explaining existing code in detail
- generating functions, tests, boilerplate, documentation
- single-file or small multi-file edits
- **debugging when you feed it the error + the relevant code**
- refactoring **with clear constraints**
- commit messages, PR descriptions, design notes
- acting as a patient tutor — *"explain this like I'm learning the pattern"*

**Weaker, needs careful scaffolding:**

- large multi-file features needing architectural planning across dozens of files
- novel research-level algorithm design
- tasks needing perfect long-term memory with no external tools
- very large monorepos without good retrieval

### The line that matters most

> **"The difference between 'mediocre local AI' and 'genuinely useful local AI'
> is almost never the model alone — it is the loop you put around it
> (plan → act → observe → correct)."**

**This is the same principle as the one at the top of this file, arrived at from
the other direction.** *"I would rather have a strong foundation for tomrrow
than loose functionalty for the local ai"* says: do the work in code. This says:
the loop **is** the work. They are one idea.

### What it implies for the Pavilion, concretely

Read against the "strong at" list, the Pavilion is **already pointed the right
way**, and the gaps are specific rather than general:

| the list says | the Pavilion has | the gap |
|---|---|---|
| explaining existing material in detail | the Tutor's whole job, and the Reader's ✨ analyse | **none** — this is the best-served case |
| debugging *when fed the error + relevant code* | — | the **retrieval** half. A resident is handed a book's *card*, not the passage. That is the next feature, above |
| refactoring **with clear constraints** | `lens` in `roles.js`, one line per role | the constraint is the lens, and it is already deliberately one line |
| patient tutor | the Tutor, grounded in a real curriculum | **none** |
| weak at: **no good retrieval** | `searchPages`/`passagesBlock`, built, **one caller** | this is the same gap twice — it is why retrieval is item 2 |
| weak at: **long-term memory without tools** | `agentMemory` (capped 8), the backpack (capped in tokens), the notes index | **the tools exist**; the discipline is not to exceed them |

**Two conclusions worth holding:**

1. **Retrieval is not one feature among several — it is the answer to two
   separate weaknesses on that list** ("needs the error + the relevant code",
   "weak without good retrieval"). That is why it outranks anything that makes a
   resident more elaborate.
2. **The loop is the thing to build, and the Pavilion's version of the loop is a
   person.** *plan → act → observe → correct* here reads: the visitor chooses
   what goes in the backpack (plan), asks (act), reads the receipt showing
   exactly what was used (observe), and carries something different (correct).
   **Every one of those four already exists**, which is why this project's
   residents are more useful than their model size suggests. Protect that loop
   before adding to either end of it.

**And the standing decision it does NOT change:** no background loop. *"nothing
without you"* — the loop is driven by a person each turn, never a timer.

---

## What gets built next

1. **Decide `think:true`.** The local-only half is settled (above). This half is
   not: the plumbing is complete and nothing turns it on, while the docs used to
   tell people to install a thinking model to watch it think. Either give some
   tier `think:true`, or drop the feature and say so — one option object either
   way, and it should not stay ambiguous.
2. **Retrieval reaches the residents** — the next real feature, and the clearest
   case of the balance principle at the top of this file.
3. **Point a real model at the current prompts.** The last time this happened
   (2026-08-08, `deepseek-r1:8b`, reading its visible reasoning) it found three
   real bugs in one sitting. Nothing written since has been seen by a model.
4. **Don't add a background AI loop.** No always-thinking resident, no ambient
   briefing on a timer — the no-background-polling rule is load-bearing.

### 2 · Retrieval reaches the residents — the plan

`searchPages()` and `passagesBlock()` in `data/retrieval.js` are **built,
tested, and have exactly one caller**: a single button in the Science Hall
(search `searchPages(pages, q` in `overlays.js`). Meanwhile `carriedLines()`
gives a resident a **card** for
a carried book — title, author, shelf — and never a word of its text.

So a visitor can carry *Walden* to the Monk and he still cannot quote it.

**Same budget, same cap, relevant text instead of no text.** This is the
principle at the top of this file in its purest form: *a small model made
genuinely more capable by better code, not by a bigger model.* The steward's
own case: *"talking to the grand master about the 8fold path, he should be able
to pull that info and my notes with permission."*

**The real design problem, named rather than waved at.** `carriedLines()` is
**synchronous**, and `carryGrounding()` calls it to draw the backpack's meter.
Loading a book's text is **async** (`loadBookText`). Making one async makes both
async — and **the meter must keep agreeing with the prompt it claims to
measure.** A meter with its own idea of the answer is the `store.js` scar in
miniature, and it is the whole of the work here. Not a bolt-on.

**It also pairs with the other half**, which is planned separately in
`plans/RESIDENT-REACH-PLAN.md`: teaching a resident to say *"I can see that book
but cannot read it — put it in your backpack."* That plan is the half that says
*hand me the book*; this is the half that reads it. Do them in that order.
