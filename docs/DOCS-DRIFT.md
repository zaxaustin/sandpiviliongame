# The drift register — what is out of date, and what is unbacked

*Opened 2026-08-10. One row per stale or unbacked claim: what it says, what is
true, and how big the fix is. **Fixed later, deliberately** — the point of this
file is that the next session inherits a list instead of a memory.*

**Everything here was measured against the code, not read off a dev log.** The
logs contain their own retractions; a doc rebuilt from an uncorrected log is the
same problem with a fresher date.

---

## 🔴 Unbacked promises — claims the code does not keep

**These are not documentation drift. They are properties the program lost, which
the documents then went on asserting.** Both were casualties of the same change:
`chatOptsFor()` was emptied to `return {}` on 2026-08-07 when the Monk's model
tier was retired. Only the model change was intended.

### 1 · "The Monk is local-only" — ✅ RESOLVED 2026-08-10, dropped on purpose

> *"the monk can be cloud if there computer cant run local ai alot of people
> have laptops just let the user know."*

**The steward chose option (b) below: drop the promise, and make the labelling
carry it.** The reasoning is worth keeping — *a laptop that cannot comfortably
run a local model must not mean no Mountain Monk.* Guidance you can actually
reach beats a principle that locks you out of the room. Every resident uses the
one detected connection, and that is now a stated decision rather than an
accident.

**What was built to make it honest**, because a choice the visitor cannot see is
not an honest choice:

- `isLocalConn(conn)` moved into `ai/provider.js` — **one** definition, where it
  had been private to the Connections panel
- `detectAI()` stamps `AI.local` on the active provider
- the **chat header** now reads `🏠 connected — <model> · stays on this computer`
  or `☁ … · leaves this device`. The Connections panel had badged this all
  along; **the room where people actually speak did not.**

**New standing rule:** never let a surface that sends words to a model omit the
🏠/☁ label.

*The original finding is kept below, because the shape of it is the useful part.*

---

#### The original finding

| | |
|---|---|
| **claimed in** | `CLAUDE.md`, `MAINTAINING.md` invariants, `PROTOCOLS.md`, `ai/provider.js`'s own comment |
| **the claim** | *"he is still local-only, by the cloud guard in the transport layer"* — stated in the same paragraph that warned *"losing one must not quietly lose the other"* |
| **measured** | `chatOptsFor()` returns `{}` for every agent · `detectAI()` takes the **first enabled connection that answers and assigns it to all seven residents** · **no per-resident routing exists anywhere in `src/`** · the only cloud-related guard is `isCloudModel()`, which keeps Ollama's *hosted* models out of `bestLocalModel()` — a different question, and `bestLocalModel()` now feeds no routing decision at all |
| **so** | **configure a cloud provider and the Monk speaks through it** |
| **status** | ✅ closed — documents corrected **and** the decision made, same day |

**The two options that were put, kept because the choice is the record:**

- **(a) Restore the rule.** `chatOptsFor('monk')` returns a local-only marker and
  the transport honours it. Would have needed a real answer for the case where
  the *only* configured connection is cloud — refuse and say so, or fall back to
  scripted dialog. **Not chosen:** on a laptop that cannot run a local model,
  every one of those answers means no Monk at all.
- **(b) Drop the promise** and let 🏠/☁ labelling carry it. **← chosen**, and
  the labelling was then made real in the chat header, not just the settings
  panel.

**The lesson to keep:** the warning and the reassurance were in the *same
paragraph*, and the reassurance was the false one. When a change retires a rule,
the things that rule was quietly also providing do not announce themselves.

### 2 · "You can watch the Monk think"

| | |
|---|---|
| **claimed in** | `PROTOCOLS.md`, the in-app Connections panel, `ai/provider.js`'s comment |
| **measured** | **`think:true` has no caller anywhere** — zero occurrences in `src/`, `tools/`, `electron/`, `test/`. `think` defaults to `false`, so Ollama is always told not to reason |
| **but** | the whole road is built and correct: `parseOllamaStreamLines` accumulates `message.thinking`, `p.lastThinking` holds it, and `renderChatView()` has a `💭 thought for a moment` panel ready to render it |
| **status** | ✅ documents corrected · ❌ **one option object away from working, and not turned on** |

**Kept, not deleted** — per the steward, 2026-08-10: *"lets make sure not to
delete fucntions that are not wired in but to fix the writing."* This is correct
code without a caller, which is a decision to make rather than a ruin to clear.

**Note the shape.** A reachable seam that returns `{}` enforces nothing.
`npm test` genuinely checks that every `AI.chat` caller in `ui/` can *reach*
`chatOptsFor()` — a real, good guard — and it passed throughout. This is
`groundingFor()` again: written, tested, documented, and called by nobody.

---

## 🟡 Real tangles — named, measured, planned

Full write-up and ordering: [`../plans/THE-BACKEND-UNTANGLE.md`](../plans/THE-BACKEND-UNTANGLE.md).
Map: [`THE-BACKEND.md`](THE-BACKEND.md).

| # | what | why it matters |
|---|---|---|
| 3 | **Two implementations of one read.** `loadBookTextResult()` and `openFullText()` each independently do inline → `libraryRead` → MinIO-fetch, with separate error messages | the `store.js` scar exactly — two paths for one decision, free to drift |
| 4 | **MinIO reads and writes use unrelated doors.** Writes: `mc` in a throwaway container, authenticated. Reads: a bare unauthenticated `fetch()` from the renderer. **`minioRead` does not exist** on the bridge (0 occurrences), and the bucket answers anonymously with **HTTP 200** | the policy was set by hand, is in no compose file, no protocol doc and no test. Loopback-only so low risk — but **a fresh machine will not have it**, and this asymmetry is the concrete reason the backend "feels twisted" |
| 5 | **`shelveAsPersonal()` (~127 lines) is the write half of `book-storage.js`'s decision, living in `overlays.js`** | two files remembering the same order is not enforcement. Fold in during the `ui/library.js` extraction |
| 6 | **Quill and the Monk each call `libraryLookupBlock()` twice per message** — once in `systemPrompt()`, again inside `pathwayBlock()`. Up to 8 DB round-trips where 4 would do | harmless (both stash the same rows), pure waste. Fold in with [`RESIDENT-REACH-PLAN.md`](../plans/RESIDENT-REACH-PLAN.md) |

---

## 🟢 Documentation fixed on 2026-08-10

Kept as a record of what drifted and how, because the *pattern* is the useful
part. `SEED_LIBRARY` went to `[]` and **four files kept the old number**.

| file | was | now |
|---|---|---|
| `README.md` | *"The Pavilion ships with **27 texts**"* — the front door | the shelf starts empty, and why |
| `README.md` | *"three gifts waiting at the Record Stone"* in the first-ten-minutes walkthrough | `GATE_BEQUESTS` is `[]`; the court is genuinely bare, and the panel already said so honestly |
| `CLAUDE.md` | rule 1: *"27 books ship in `seed.js`"* | rule 1 restated — **there is no seed to hide behind**, and an *empty save* is now the same mistake in a new costume |
| `CLAUDE.md` | *"the seed shelf is an on-ramp… its small size is correct"* | the empty shelf is the finished position |
| `MAINTAINING.md` | *"27 texts in the shipped seed"* — **while the same file said the shelf was empty 250 lines later** | derived, and the contradiction named |
| `MAINTAINING.md` | *"Eleven scenes"* · *"Six AI-backed residents"* · `overlays.js` *"~10k lines"* | **twelve** scenes · **seven role keys, six people** · **12,966** lines |
| `MAINTAINING.md` | code map omitted five modules | `places.js`, `lookup.js`, `note-reach.js`, `carrying.js`, `book-storage.js`, `daily-tasks.js` added |
| `MANUAL.md` §8 | quoted the title screen as *"everything works, but nothing is indexed"* — a **search** limitation named for what is actually an **absence** | all four real states, quoted verbatim and now guarded |
| `MANUAL.md` §4 | one storage home, no cap, seed implied | four storage badges, the shelf limit, the empty shelf, `electron:dev` vs `dev` |
| everywhere | *"the desktop app holds **hundreds**"* while `LOCAL_BOOK_CAP` was **100** | one hundred is not hundreds. Now **500 by default and set by the visitor**, rendered from the constant — and a `npm test` guard fails if the panel types the digits instead of deriving them |
| `PROTOCOLS.md` | *"the biggest model on your machine is, in effect, **his**"* | one model for everyone; **cooling** is the real limit |
| `plans/AI-INTEGRATION-NOTES.md` | dated 2026-07-10; *"no live token streaming"*, `bestLocalModel()` for the Monk, `CHAT_AGENTS` in `overlays.js`, timeouts 45/120/180s | fully rewritten from the code; timeouts are **90/240/360s** |
| `LEARNING-PATH.md` | taught `stream:false` as current | tense fixed; the streaming exercise now says *build yours first, then read the real one and diff* |
| `overlays.js` header | *"~10,000 lines, and that is fine"* | ~13,000, and no longer fine — with the reasoning that still holds |
| `plans/OVERLAYS-SPLIT-PLAN.md` | 12,115 lines / 719 defs, hand-listed order | real numbers; **order derived from `places.js`'s `scene` field** |
| `plans/AFTER-THE-LIBRARY.md` | six things "next session" | **four now done**, each with its evidence |
| `AI-BACKEND-WALKTHROUGH.md`, `plans/BETA-LAUNCH-PLAN.md`, `plans/AGENT-EMBODIMENT-PLAN.md`, `data/charter.js` | pointed at `CHAT_AGENTS` in `overlays.js` | `ui/residents.js` |

### Two guards added, so this class cannot regrow silently

Both in `test/smoke.mjs`, both **broken on purpose before being trusted**.

1. **No document may claim a shipped book count that disagrees with
   `SEED_LIBRARY.length`.** History is allowed when the line marks itself
   (`SUPERSEDED`, `until 2026-`, `used to`, `deleted`, …), checked in a
   two-line window because markdown wraps. It **found two more stale lines than
   the hand sweep did**, and it fails loudly if its own pattern ever stops
   matching anything.
2. **Every `> ●`/`> ○`-quoted screen line in `MANUAL.md` must exist in `src/`.**
   Normalised to letters and digits so it survives `'...' + '...'` concatenation
   and escaped apostrophes. **Comments are stripped first** — verified by
   deleting a UI string and leaving a comment quoting it: with comments included
   the guard passed, which is precisely how three guards in this project were
   born dead.

Proven in three directions: change the manual → red; change the source → red;
replace the source string with a comment → red.

---

## ⚪ Left alone on purpose

- **Supabase mentions.** `README.md`, `MANUAL.md` and `PROTOCOLS.md` are already
  clean (0 each). `LEARNING-PATH.md` has 4 and `MAINTAINING.md` 13, all in
  passages that are explicitly historical. `CLAUDE.md` already rules that
  remaining mentions are history, never instructions. **Register, don't chase.**
- **`plans/BETA-TESTING-FEEDBACK.md`** points at `CHAT_AGENTS` in `overlays.js`
  twice, and says "all four" residents when there are seven. It is a **log of a
  past review**, and rewriting the record of what someone found on a given day
  would be worse than the stale pointer.
- **`GATE_BEQUESTS = []`** and the `gifts.length ?` branch that renders them.
  Empty list, dead branch, **kept** — it is the shape your own bequests are
  built from, and the Record Stone's empty state is already written honestly.
- **The `deep` reply tier** (`3000` tokens / `360s`). No caller since
  2026-08-07. Kept: a table with an unused row is not a bug, and turning a tier
  back on is one option object.
- **`book_health`** — a table nothing writes, so `v_unshelved`'s health filter
  is inert. Harmless, and stated out loud rather than left looking load-bearing.

---

## How to use this file

**Add a row when you find a claim you are not fixing today.** A row costs
nothing; a memory costs a session. Move it to the 🟢 table when it is fixed, with
what it said — the old wording is the useful part, because it shows the shape the
mistake took.

**And prefer a derived guard to a fix.** Both guards above came out of a single
wrong number sitting in four files, which is CLAUDE.md rule 4 exactly. If a claim
can be computed, compute it.
