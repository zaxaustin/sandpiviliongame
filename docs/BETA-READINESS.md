# Beta readiness — the honest state

**Written 2026-08-10, and every number in it was measured rather than
remembered.** Its job is to be the document somebody reads before deciding to
cut a release, so it is written to be *uncomfortable* where the truth is
uncomfortable. A readiness doc that only lists what works is a marketing page.

The standing instruction it serves:

> *"we can commit the work done but lets not build another beta launch unless we
> test the features some more and have somethign we can be proud of. and a place
> ready for alot of human testing and beta notes"*

---

## The one-line answer

**The code is ready, the installer exists, and the evidence that a stranger can
use it is still the only thing missing.**

*Updated 2026-08-13.* Everything on the critical path is built, guarded and
green, and `0.1.0-beta.6` is on disk with `verify:release` passing. What has
never happened is a person who is not the steward sitting down at a fresh
install and getting anywhere. Until that happens, "ready" is a claim about test
suites, and this project's whole method says that is not the same thing.

The difference from the previous version of this page is that **that sentence is
now actionable.** It used to be a gate with nothing behind it — see §2.

---

## What is built and green

| | |
|---|---|
| rooms / residents | **25 places**, **7 residents**, all reachable from one keystroke |
| source | **27,725 lines** of game JS |
| test suites | **33 browser**, **9 Electron**, **1 against the shipped `.exe`**, plus `npm test` with **826** assertion sites |
| the grounding chain | done — a resident can quote a carried book *with page numbers*, say what it cannot reach, and hand you a button that fixes it |
| the pace charter | `CLAUDE.md` rule 9, with guards A, B and D, each broken on purpose |
| note authorship | every note carries who wrote it, human or model, and the model is never told a person wrote its own output |
| **the front door** | **the five-stage walk**, with a 27-check Electron gate on a genuinely empty save |
| AI diagnosis | six failure states, six different sentences, instead of one for all of them |
| the database | on every install — Docker container when present, embedded PGlite otherwise |

---

## What is honestly not ready

### 1 · Nobody who is not the steward has ever walked it

**This is the gate, and everything else on this page is subordinate to it.**

`test/live/tutorial-stage1.cjs` proves a visitor ends Stage 1 holding a book
they chose, a note they wrote, and it in their bag. It cannot prove it *felt*
like theirs, that it took ten minutes, or that the first card reads as an
invitation rather than a chore. Those are the only questions that matter for a
front door, and no suite can answer any of them.

Same category, and equally never done: **a stranger clicking the installer on a
clean machine.** Named in `plans/done/BETA-PREFLIGHT.md` as the last unverified
thing, and it is still true.

### 2 · ~~The installer is 36 source files behind~~ — CUT 2026-08-13

**This section is kept, struck through, because it was the real gap and it is
worth remembering what it looked like from the inside.** It read: the installer
is `0.1.0-beta.5`, built 2026-08-07, 36 source files behind, `verify:release`
fails and *should*, that is a decision not an oversight.

Every sentence of that was true. It was also the whole problem, named by the
steward in one line:

> *"you haven't finished the build so I can't test anything"*

Gate 1 of this page has been *"a human who is not the steward walks Stage 1
cold"* since the day it was written — while there was **no artifact to walk it
in.** A release gate that cannot be attempted is not a gate, it is a shelf.

**`0.1.0-beta.6` is cut, and `verify:release` is green for the first time since
2026-08-07.** Both artifact guards pass: `packaged-boot.cjs` (the packaged load
path) and the new `packaged-exe.mjs` (the real `.exe` out of `win-unpacked`,
which is the only one that exercises the asar pack, the `files` glob and
`asarUnpack`). The `.exe` opens its own database with the schema applied
*inside the pack* and names itself `0.1.0-beta.6`.

**The rule this cost:** never let a gate depend on something only a person can
do while the thing they would do it *to* does not exist. Build the artifact
first; the human step is then the only step.

### 3 · The shelf is empty and the welcome packet is not written

`SEED_LIBRARY` is `[]` and **that is the finished position**, not a gap — a
shelf of 27 books nobody chose was doing the ownership argument harm and
actively hiding bugs. But it means a new visitor's first minute is
*"bring a book in"*, and the softening for that is
`plans/THE-WELCOME-PACKET.md`, which is the steward's own to write.

The tutorial's Stage 1 beat one is the seam it plugs into: **one function body,
and nothing else changes when the packet lands.**

### 4 · Eleven tester items are still open

Of **72** numbered items in `plans/BETA-TESTING-FEEDBACK.md`: **51 fixed**,
**10 partial**, **1 explicitly open**, **10 noted but never built**. Call it
**21 not closed**, of which 11 are the partial-and-open set that a tester could
plausibly hit again.

### 5 · The debt, stated so nobody discovers it

`src/game/ui/overlays.js` is **13,694 lines — half of all game source.** Its own
split plan says *"the split is losing the race"*, and it is **deliberately off
the critical path** for this beta: the higher-leverage target is the ~2,000
lines of inline HTML and the fragility of the paths a visitor actually walks.
Recorded so the next session does not pick it up by default.

**61 open plan documents** against 20 closed. Most say some version of *"written
down, not started"*, and that is fine — but it means the ratio of intention to
implementation in `plans/` is roughly 3:1, and anyone reading that folder should
know it before believing any single file in it.

### 6 · What is named in the app but does not exist

Being precise here, because a door onto nothing is this project's most-named
failure:

- **Missions, F-rank, the Outer→Inner door** — all unbuilt drafts. Stage 5 of
  the tutorial records a graduation and **says plainly that Missions are not
  built**, rather than implying a door.
- **The Notice Board and the Residents' Board** in the Café — dormant on
  purpose; they need a Commons server that does not exist. They open and say so.
- **The profile / sign-in** — `currentUser()` returns `user 1` and is the single
  seam a real name will arrive through.

---

## The release gate, in order

**Reordered 2026-08-13 so the machine's half comes first.** It used to put the
human steps at the top and the build at step 4, which is how a gate ends up
waiting on a person to test a thing that was never made.

1. ~~`build:beta` → `electron:build:beta` → `packaged-boot.cjs` +
   `packaged-exe.mjs` → `verify:release` green.~~ **Done, 2026-08-13.**
2. **The steward's own pass on the three things only taste settles**: whether
   34 cps *feels* like speech, whether the ⏸ hold sits where a hand reaches,
   and whether a hand-written and an AI note are tellable apart while actually
   reading.
3. **A human who is not the steward walks Stage 1 cold.** Not negotiable, and
   not substitutable by a green suite.
4. **A clean-machine install by someone else.**
5. The welcome packet, or a conscious decision to ship without it. *(Deliberately
   last: Stage 1 works on an empty shelf, and the packet replaces one function
   body when it lands.)*

**Steps 3 and 4 have never happened, and they are the two that decide whether
this is a beta or a demo. Nothing now stands between them and a person.**

---

## Running everything

```bash
npm test                                    # ~1s, always
npm run build:beta && npm run preview       # dist/ on :4173, for the browser suites
node test/live/tutorial-stages.mjs          # stages 2-5 and the Stage 5 checklist
node test/live/ai-diagnosis.mjs             # six AI failures, six sentences
node test/live/speaking-pace.mjs            # one reveal rate, the hold, the pocket
node test/live/note-authorship.mjs          # the prompt read off the wire
node test/live/publish-reason.mjs           # the outlet, and the packet round trip
env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/tutorial-stage1.cjs
env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/packaged-boot.cjs
env -u ELECTRON_RUN_AS_NODE node test/live/packaged-exe.mjs   # the real .exe, after a build
```

`ELECTRON_RUN_AS_NODE` must be unset or `require('electron')` returns a path
string. The full list is in `CLAUDE.md`.
