# Breaking up `overlays.js` — the comprehensive version

**Written 2026-08-04, after the first cut proved the method.** The steward's
question was the right one: *"is that enough of a breakup for the overlays? i
think we need a better more comprehensive plan for that."*

**No, it is not enough.** One 630-line extraction took the file from 12,726 to
12,115 — a **5% cut**. That was a proof of method, not a breakup. This is the
plan for the rest.

---

## Where it actually stands, measured

| | |
|---|---|
| `overlays.js` | **12,115 lines**, **719 top-level definitions** |
| already out | `ui/residents.js` (686), `ui/study-table.js` (565), `ui/dom.js` (27) |

**The biggest single functions**, which is where the weight really is:

```
348  renderScienceHall      141  renderCommons
293  renderLearningTree     129  generateQuillReport
226  renderMyLibrary        128  renderCourses
212  termRun                124  renderConnections
209  renderGrove            123  draftLessonWithAI
188  suggestShelvesWithAI   120  openBookIntake
162  CURRICULUM             119  renderResearch
157  renderReviewQueue      102  renderGrant
```

Fourteen functions account for ~2,500 lines. **The file is not 719 equal
things; it is about 25 panels, a few of them enormous.**

## The seam already exists, and it is good

Every panel in this project follows one shape, documented in the file's own
header:

```
openThing()      sets state.ui, hideAllOv(), renderThing(), showOv('thingOv')
renderThing()    writes innerHTML into #thingPanel
state.thingView  what that panel is currently showing
```

That convention is the split. A panel is a module. Nothing needs redesigning —
this is a moving job, not a rewrite, and it must stay one.

## What actually makes it hard

Not the panels. Three shared things they all touch:

1. **The window-export block.** Every inline `onclick` needs its function on
   `window`, and one file must own that list. **It stays in `overlays.js`
   permanently.** Each new module exports its handlers; overlays imports and
   re-lists them. `npm test` checks that join in both directions and has
   already caught it three times.
2. **`hideAllOv()`** — a hand-maintained list of every overlay id. It has
   drifted before. It stays in one place and is checked.
3. **Small helpers used everywhere** — `esc`, `jsq`, `blip`, `showOv`,
   `logActivity`, `persist`. `esc`/`jsq` are already out in `ui/dom.js`; the
   rest already live in `entities.js` / `main.js`.

## The method, proven once, unchanged

1. **Move the region's lines VERBATIM.** Not one character rewritten. The
   residents' 630 lines moved byte for byte.
2. **Satisfy outward calls with shims**, filled by an `initX(deps)` call from
   `overlays.js`. Never import backwards — no cycles, and the seam is written
   down instead of implied.
3. **Re-export anything overlays still needs**, and re-list every handler in
   the window block.
4. **`npm test` + `preflight` + the live suite that covers that panel**, before
   the next region.
5. **One region per commit.** Stop the moment a suite goes red.

**The guards are what make this safe, and they are already proven.** Moving the
residents broke twelve checks at once and every one named itself — *"could not
find CHAT_AGENTS.monk"*, *"referenceShelfBlock() is gone"*, *"the map points at
'AI-backed NPCs' and no such text exists below it"*. Nothing went silently
un-guarded. The content checks now read the whole `ui/` directory rather than a
filename, so the next move costs no test edits.

## The order, and why

Sized from the inventory above. Each line is one commit.

| # | module | ~lines | why here |
|---|---|---|---|
| 1 | `ui/lesson-tree.js` | ~1,050 | tree + authoring + drafting + export + Course Board. Freshest, and the visual-tree work lands in it next |
| 2 | `ui/hall.js` | ~900 | `renderScienceHall` alone is 348. Self-contained: investigations, experiments, dissections, the folds |
| 3 | `ui/library.js` | ~1,350 | shelves, Reader, full text, the pocket, intake, the review queue. The biggest, and the most entangled with notes — do it once the pattern is boring |
| 4 | `ui/notes.js` | ~350 | Your Notes, the gather, the four doors. Small but touched by everything, so it moves after the Library |
| 5 | `ui/planner.js` | ~900 | the Writing Desk and its toolbox. Already half-modular via the toolbox |
| 6 | `ui/workshop.js` | ~530 | Archive, Research, Grant, Lab, Bench, Records |
| 7 | `ui/computer.js` | ~350 | `termRun` is 212 on its own; the terminal is genuinely separate |
| 8 | `ui/commons.js` | ~300 | packets, publish, take |

**What is left in `overlays.js` afterwards, on purpose:** the frame. The pause
menu, `hideAllOv`, `showOv`, connections, settings, Your Data, the activity log,
☀ Today — and **the window-export block**. Estimated **1,500–2,000 lines**, and
that is a reasonable size for the file that owns the frame.

## What "done" looks like

**A number, so it cannot be argued with:** `overlays.js` under 2,500 lines, and
no single file in `src/game/ui/` over 1,400.

## The rule that matters most

**This is a refactor with no user-visible gain, so it never blocks a feature and
never precedes a release.** It runs between things. If the beta is close, it
waits. A regression introduced here would cost more than the tidiness is worth
— which is exactly why it moves one region at a time, verbatim, behind guards
that have already proved they fire.
