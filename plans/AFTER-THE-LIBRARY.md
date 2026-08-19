# After the Library — six things, in the order they matter

*Written 2026-08-10, at the end of the session that fixed the Library.
Full account: [`archive/dev-log-2026-08-10.txt`](../archive/dev-log-2026-08-10.txt).*

> ## ✅ STATUS, verified against the code 2026-08-10 — three of six are DONE
>
> | # | | evidence |
> |---|---|---|
> | 1 | **DONE** — the Computer's `random` / `test` | both handled in `termRun()`, both have `MAN_PAGES` entries, and `npm test` crosses help ↔ `termRun` ↔ `MAN_PAGES` in both directions |
> | 2 | **DONE** — the in-game Docker path | `openStorage()` → **📦 Where books are kept**: the honest ceiling table, a **copyable** `docker compose` line (never a fake install button), `BACKEND_UPGRADES`, and how to turn it off again. Reachable from the pause menu, from the intake's ceiling line, and exported. `test/live/storage-room.mjs` (browser) + `library-homes.cjs` (real container) |
> | 3 | **DONE** — a real model on the 415-book Library | measured: monk **2,386** · investigator 1,526 · sebastian 1,432 · quill 1,059 tokens. The Monk once spent ~12,800 on the catalogue alone |
> | 4 | open — `notesInReach` | half built |
> | 5 | open — the notice board | not started |
> | 6 | **DONE** — MANUAL §4 | closed 2026-08-10: the empty shelf, the four storage badges, the 100-book cap, and `electron:dev` vs `dev` |
>
> **What is actually next is not in this file.** See
> [`RESIDENT-REACH-PLAN.md`](done/RESIDENT-REACH-PLAN.md) *(built 2026-08-10)* and
> [`THE-BACKEND-UNTANGLE.md`](THE-BACKEND-UNTANGLE.md), and read
> [`AI-INTEGRATION-NOTES.md`](AI-INTEGRATION-NOTES.md) first — it records two
> promises the code stopped keeping on 2026-08-07.

---

## Context

The Library works now: 415 books catalogued, 326 in Docker, 59 on this machine,
30 honestly summary-only. The seed shelf is gone and so is every pathway to it.
Every suite is green and nine of them were rewritten to test **your** books
instead of the shipped ones.

What follows is everything named and not done. Two of these are corrections to
things I assumed wrong earlier in the day and checked properly at the end —
worth reading before the work is scoped.

---

## 1 · The Computer — one book, not a wall of them

**Correction: the Computer already indexes the real Library.** I said it
couldn't. `termRun()` in [overlays.js:6427](../src/game/ui/overlays.js#L6427)
reads `Store.allDocs()` and `personalBooks()`, so `ls`, `find`, `owned`,
`papers` and the rest have been answering over all 415 books the whole time.

The actual gap is your own words: *"we can make a command like **test book
random** instead of scanning the whole library."* With 27 books `ls` was a
list; with 415 it is a wall, and a wall is not an index.

- **`random [shelf]`** — one book, drawn at random, with its card and the
  numbered row so `open 1` works. Optionally narrowed to a shelf.
- **`test <number|random>`** — hands the book to whatever tests a book: the
  Study Table, a dissection, a chapter scan. Reuses `state.termLast`'s
  `{kind, ref}` shape, which already exists precisely so a numbered row can be
  a book or a note.
- Deterministic, no model — it belongs on the same rung as `ls`.
- Add both to `MAN_PAGES` in [`data/man-pages.js`](../src/game/data/man-pages.js);
  `npm test` already checks every command has a page.

**Small, self-contained, and it makes a 415-book Library usable from the
terminal.** Do it first.

## 2 · A new user and Docker — there is no in-game path at all

**Measured, not assumed:** setup exists *only* as terminal commands in
`PROTOCOLS.md` and `LEARNING-PATH.md`. Nothing in the game mentions it. That is
against a standing decision — *"it is for a lay user: no terminal required, no
config file"* — and it is the difference between "hundreds of books" and "about
a dozen" for everyone who is not you.

- A **Docker panel** reachable from the pause menu and from the intake table's
  destination line, which already says where the next book will go.
- It says, from real state: whether the container answers, what turning it on
  would change (`BACKEND_UPGRADES` already holds that copy), and the *one*
  command to run — copyable, the way `copyPullCommand()` already does for
  Ollama.
- **Never a fake install button.** We do not shell out to Docker. Say the
  step, make it copyable, then detect the result and say plainly that it
  worked.
- The honest ceiling stays visible throughout: **web ~9 books (measured) · desktop
  hundreds · +Docker no practical limit.**

## 3 · Point a real model at a 415-book Library

**Nothing written this session has been seen by a model.** Sebastian's Mrs
Beeton grounding and the shared resident `STANCE` in
[`data/roles.js`](../src/game/data/roles.js) are both unverified, and the
2026-08-03 lesson stands: a prompt nobody has pointed a model at is a guess.

- Run `tools/resident-bench.mjs` against the real catalogue with a thinking
  model, as on 2026-08-08 — that run is what found residents inventing
  colleagues' powers in two runs of three.
- **The three questions that matter:** does the STANCE actually stop the
  endless-questions tic; does Sebastian sound like a butler with training
  rather than a butler with a costume; and does a 415-book Library blow the
  prompt budget where 27 did not.
- `estimateTokens()` / `contextFor()` and the per-agent budgets in
  `test/smoke.mjs` are the measuring stick. **Expect to raise a budget and
  document why**, the way the Monk's was raised twice.

## 4 · Notes: today is in reach, the rest is asked for

Half of this landed today — notes written today appear in ☀ Today with their
reach control on the card. The other half is yours and is not built:

> *"mabie we make it where the ai can see current notes and only daily notes
> the rest have to be pulled from the arcive."*

- `notesInReach(notes, today)` beside `notesToday()` in
  [`data/the-day.js`](../src/game/data/the-day.js): **today's notes are in
  reach by default; older ones are not.**
- Older notes stay reachable **on request** through the existing
  `searchMyNotesFor()` path — which is what `askable` has always meant. The
  three reach states do not change; what changes is the *default* scope.
- This is a real token win as well as a privacy one: a resident carrying every
  note ever written is the uncapped-prompt bug in its fifth costume.
- The backpack still overrides everything — a note you are *carrying* is in
  reach whatever its age, because you put it there.

## 5 · The notice board — say what this place is actually doing

Currently `comingCommons()`: a dialog explaining what the board *would* be.
Your two asks:

- **A hint at the global missions** — pointing at Today's Tasks and the
  learning paths, so the board gestures at the wider thing rather than at a
  server that does not exist.
- **A "work in progress — help us get books legally" notice**, which is the
  honest one and fits the Library's own door test: what is it, where is it
  from, what licence does it travel under. Point it at
  [`docs/BOOKS-TO-SOURCE.md`](../docs/BOOKS-TO-SOURCE.md), Standard Ebooks,
  Gutenberg and SuttaCentral's CC0 canon.
- It stops being a dead end and starts being the one place that says what the
  Pavilion is *for*.

## 6 · MANUAL §4 — the last of the docs

The only piece of today's work not yet written down for a reader: the two
homes, the 100-book local cap, the storage badges, the empty seed shelf and
`npm run electron:dev` vs `npm run dev`.

---

## Verification

The bar every one of these is held to, unchanged:

- **`npm test`** for anything with a rule — pure module first, then a guard,
  then **break the guard on purpose**. Three guards were born dead today and
  all three were found this way.
- **Live suites** for anything with a button. `test/live/_books.mjs` is the
  fixture — **never the seed shelf**, which no longer exists.
- **Look at the .png.** Every real bug this project has had was found by
  looking; today's biggest (415 books rendering as zero cards) was invisible
  to every count in the codebase.
- **Both database homes** where schema is touched — `docker-home.cjs` caught a
  10-vs-11 parameter mismatch today that `npm test` did not.
- The day's dev log, and `MAINTAINING.md`'s What's next.

## Order, and where to stop

**1 then 2** are the two that change what a person can do tomorrow, and both
are self-contained. **3** should happen before any more prompt work is layered
on guesses. **4, 5, 6** are good any time.

Stopping after 1 and 2 would be a complete session.
