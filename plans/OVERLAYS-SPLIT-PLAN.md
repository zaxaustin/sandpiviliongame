# Breaking up `overlays.js` — the plan that maintains itself

**Rewritten 2026-08-10.** The previous version was written 2026-08-04 against
12,115 lines and 719 definitions as of an earlier session, and hand-listed the
order. Both had gone
stale — and a plan whose numbers are wrong is a plan nobody trusts enough to
run. This one derives its order from a table `npm test` already checks.

---

## Where it actually stands, measured 2026-08-10

| | |
|---|---|
| `overlays.js` | **13,734 lines**, **740 top-level definitions** |
| of which | **74% code** · 22% comment · ~2,000 lines carrying HTML markup |
| already out | `ui/lesson-tree.js` **1,063** · `ui/residents.js` **1,017** · `ui/study-table.js` **747** · `ui/daily-tasks.js` **334** · `ui/dom.js` **27** |

**The biggest single functions**, which is where the weight is:

```
380  termRun              (was 212 on 2026-08-04 — +79%, the fastest-growing region)
348  renderScienceHall    230  renderMyLibrary      209  renderGrove
188  suggestShelvesWithAI 157  renderReviewQueue    148  generateQuillReport
141  renderCommons        128  renderCourses        127  openBookIntake
127  shelveAsPersonal     124  renderConnections    119  renderResearch
```

### The honest measurement, and why it is uncomfortable

**One region came out since 2026-08-04 and the file still grew by 850 lines.**
`termRun` alone grew 79%. The split is losing the race, and it will keep losing
while it is the thing that yields.

That is not a failure of method — the method works, four times over. It is the
consequence of this plan's own last rule, which used to read: *"it never blocks
a feature and never precedes a release. It runs between things."* **There is
always a feature. "Between things" never arrives.**

---

## The seam already exists, it is good, and it is now DERIVED

Every panel in this project follows one shape, documented in the file's own
header:

```
openThing()      sets state.ui, hideAllOv(), renderThing(), showOv('thingOv')
renderThing()    writes innerHTML into #thingPanel
state.thingView  what that panel is currently showing
```

**And since 2026-08-10 there is a second seam, which is the important one.**
`data/places.js` gives every room a `scene:` field, and `npm test` crosses that
table against `scenes.js` in **both** directions. So the split order does not
have to be a hand-written list that goes stale — **it is the `scene` field**.

That is why the two-Grounds work matters here even though it moved no panel
code: it produced the table this plan is now indexed by.

## Measured by room

| room (`scene` in `places.js`) | panels | ~lines |
|---|---|---|
| **library** | shelves · Reader · full text · Index · Catalogue · Your Shelf · intake · chapters · review queue · Steward's Index | **~1,560** |
| **workshopfloor3** (`hall`) | Science Hall · Lab · Bench | ~510 |
| **study** (`computer`) | the terminal | ~430 |
| **study** (`notes`) | Your Notes · the gather · reach | ~420 |
| **workshop** | Archive · Research · Records · Caravan | ~350 |
| **cafe** | Commons Table · Grant Desk · the boards | ~280 |
| **grove** | Inheritance Hall · Alexandria Stone · the pond | ~274 |
| **study** (`planner`) | Writing Desk + toolbox | ~246 |
| **study** (`courses`) | Course Board | ~134 |

*Named renderers only (~4,400 of 12,966); helpers and the comment blocks around
each region roughly double every number.*

**What stays in `overlays.js`, on purpose: the frame.** The pause menu,
`hideAllOv`, `showOv`, connections, settings, Your Data, the activity log,
☀ Today, the chat stack — and **the window-export block**, permanently.

---

## What actually makes it hard — three shared things

1. **The window-export block.** Every inline `onclick` needs its function on
   `window`, and one file must own that list. **It stays in `overlays.js`
   permanently.** Each module exports its handlers; overlays imports and
   re-lists them. `npm test` checks that join in both directions and has caught
   it three times.
2. **`hideAllOv()`** — a hand-maintained list of every overlay id. It has
   drifted before. One place, checked.
3. **Small helpers used everywhere** — `esc`, `jsq` are already out in
   `ui/dom.js`; `blip`, `showOv`, `logActivity`, `persist` live in
   `entities.js` / `main.js`.

## The method, proven four times, unchanged

1. **Move the region's lines VERBATIM.** Not one character rewritten.
2. **Satisfy outward calls with shims**, filled by one `initX(deps)` call from
   `overlays.js`. **Never import backwards** — no cycles, and the seam is
   written down instead of implied.
3. **Re-export anything overlays still needs**, and re-list every handler.
4. **`npm test` + `preflight` + the live suite for that panel**, before the next.
5. **One region per commit.** Stop the moment a suite goes red.

**`ui/daily-tasks.js` is the shape to copy** — it was *born* outside, and
`overlays.js` kept only the window exports, one `initDailyTasks()` call and a
pause-menu line.

### ⚠ A guard breaks on the next extraction, and this is how to fix it

`test/smoke.mjs`'s **Computer command check** finds the `help` block and
`termRun` by reading **`overlays.js` by filename**. The moment the terminal
moves, it fails loudly — the right kind of break — but **the fix is not to
repoint it at `ui/computer.js`.** A guard keyed to a filename is itself rule 4.

**Make it read the whole `ui/` directory**, exactly as `UI_SOURCE` in the same
file already does for the prompt-budget and inline-handler checks. Then the
region after this one costs no test edits at all.

*The content checks already read all of `ui/`. This is the last one that does
not.*

---

## The order, and why

Each line is one commit. Sized from the table above.

| # | module | ~lines | why here |
|---|---|---|---|
| **1** | **`ui/computer.js`** | **~430** | **`termRun` is 380 on its own and the fastest-growing thing in the file.** The terminal shares no render state with any panel, and `terminal.mjs` / `terminal-carry.mjs` / `terminal-random.mjs` already cover it. Moved to first on evidence |
| 2 | `ui/hall.js` | ~510 | `renderScienceHall` alone is 348. Self-contained: investigations, experiments, dissections, the folds |
| 3 | `ui/notes.js` | ~420 | Your Notes, the gather, the four doors. Touched by everything, so it goes before the Library rather than after |
| 4 | `ui/library.js` | ~1,560 | the biggest and most entangled — shelves, Reader, full text, the pocket, intake, review queue. **Do it once the pattern is boring.** Fold in `shelveAsPersonal` (`THE-BACKEND-UNTANGLE.md` knot C) while here |
| 5 | `ui/workshop.js` | ~350 | Archive, Research, Grant, Records |
| 6 | `ui/cafe.js` | ~280 | Commons Table, Grant Desk, the boards |
| 7 | `ui/grove.js` | ~274 | Inheritance Hall, Alexandria, the pond |
| 8 | `ui/planner.js` | ~246 | the Writing Desk and its toolbox; already half-modular |
| 9 | `ui/courses.js` | ~134 | small; could fold into `ui/lesson-tree.js` instead |

## What "done" looks like

**A number, so it cannot be argued with:** `overlays.js` under **2,500 lines**,
and nothing in `src/game/ui/` over **1,400**.

## Where it stands — update this each session

| date | `overlays.js` | moved out that session |
|---|---|---|
| 2026-08-04 | 12,115 | `ui/residents.js`, `ui/study-table.js`, `ui/dom.js` |
| 2026-08-09 | 12,317 | — (`ui/daily-tasks.js` born outside) |
| 2026-08-10 | **12,966** | — (documentation session) |

---

## The rule that matters most — restated, because the old one failed

The old rule was: *"this is a refactor with no user-visible gain, so it never
blocks a feature and never precedes a release. It runs between things."*

**That rule is why nothing has moved since 2026-08-04.** "Between things" is not
a time that exists. The replacement is narrower and actually schedulable:

> **One region per session that touches `overlays.js` at all.** Not before a
> release, not in the middle of a broken suite — but not deferred to a mythical
> quiet week either. The region is named in advance (the table above), it is a
> verbatim move, and every guard that fires names itself.

**Considered and deliberately NOT adopted: a committed line-count ceiling in
`npm test`** that could only ever go down — the same ratchet shape that made
`UNDECLARED_STATE` work. The steward's call on 2026-08-10 was a real plan over a
gate. It is recorded here rather than argued again: **if the file grows through
another session or two, the ratchet is the one move to make**, and it is about
fifteen lines in `test/smoke.mjs`.
