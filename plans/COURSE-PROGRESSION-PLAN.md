# The Course Progression Tree — from "101" to mastery, with required reading

Written 2026-07-12, at direct and emphatic request: *"this is crucial and
should not be a placeholder — we need to get this right so other people can get
on board."* The vision, in the user's own shape:

- Lessons have **required reading and course reading** — real books, tied to
  the lesson.
- Every subject has a **101 class** to get started and *see what the skill has
  to offer* — a low-commitment on-ramp.
- From there, **higher courses sit behind a tree of progression** —
  prerequisites. *"Spanish 101 → more Spanish courses, and hence forth."*
- **Even if the books aren't shelved yet, we plan to upload them, then
  self-study** — the curriculum can be designed ahead of the Library that feeds
  it, with the gaps named honestly.
- Later, **people make their own lesson plans, or pioneer entirely new lessons**
  for others — the commons applied to learning, not just texts.

**The measure (north star): knowledge into use, and *others getting on
board*.** This is the mechanism that turns the Pavilion from "one person's
study" into "a free place to pursue higher education together"
(`HOPES-AND-DREAMS-ROADS.md` Road 7). It has to be real enough that a stranger
can walk in, pick a 101, and climb — which is exactly why it can't be a
placeholder.

---

## What already exists to build on (so we don't reinvent)

This is further along than a blank page — four real pieces fit:

- **The Course Board** (`COURSE-BOARD-PLAN.md`, Stage 1 built): courses are
  real saved objects (`data.courses` — `{id, title, why, begun, due, category,
  steps:[{text,done}], archived}`), with pinning, **categories (Study /
  Skill)**, search, archive, and **AI-drafted courses**. A course with ordered,
  checkable steps already exists — that's a lesson sequence in embryo.
- **The Library**: real, shelved, licensed, full-text books — the thing
  "required reading" points at. A course step can reference a `slug`.
- **The Pavilion Academy** (`PAVILION-ACADEMY-PLAN.md`): the *tutor* that
  teaches, tests, reviews, and counsels on the lesson you're on. The tree is
  *what* you learn and in what order; the Academy tutor is *how* you're helped
  through each node. They are two halves of one school.
- **`LEARNING-PATH.md`**: a real, 17-stage, prerequisite-ordered curriculum
  built around this project — the **working proof that a progression tree with
  required reading is buildable**, because it already is one, in prose. The
  Course Progression Tree is that idea made structural and general.

---

## The core model: a course is a node in a tree

Keep the existing `data.courses` shape and **add three fields** — small,
backward-compatible, the same discipline as every other save extension here:

- **`level`** — e.g. `101`, `201`, `301`. The on-ramp vs. the climb.
- **`prereqs: [courseId, …]`** — the edges of the tree. A course is *available*
  when its prereqs are complete, *locked* (but visible, so you can see where
  you're headed) when they aren't. Visible-but-locked matters: the tree is also
  a map of what's possible, the way the Badges panel shows locked badges.
- **`reading: [{slug, required:true|false}]`** — required vs. supplementary
  reading, each pointing at a real Library book by `slug`. **If the `slug`
  isn't shelved yet, it's a named gap** (see "upload-then-self-study" below),
  not a broken link.

A **subject** (Spanish, say) is then just the connected sub-graph: `Spanish
101` → `Spanish 201` → branches (conversation, reading, grammar), each a node
with its own reading and steps. No new "subject" object needed at first — the
prereq edges *are* the subject's shape.

### Why a tree, not a flat list (the thing to get right)

- **A 101 is a real, low-stakes on-ramp** — "see what this offers" — not a
  commitment to a degree. It should be completable in a sitting or two.
- **Prereqs protect the learner from starting in the deep end** *and* show them
  the whole climb ahead, so effort has a visible horizon (Right View, even —
  seeing the path clearly).
- **It's how strangers get on board:** "start at any 101" is a door anyone
  understands; "here is a flat pile of 40 courses" is not.

---

## "Upload the books, then self-study" — the honest gap-first workflow

The user's key insight: **the curriculum can be designed before the Library
that feeds it exists.** So the tree is allowed to reference reading that isn't
shelved yet, *as long as the gap is honest and actionable*:

1. **Design the node** — its reading list, by title/author (even if not yet in
   the Library).
2. **Any unshelved reading auto-becomes a Request Board entry** (the mechanism
   already exists — the Request Board is the Library's "what to fetch next"
   queue), tagged with the course it serves.
3. **Fetch it for real** via the Caravan (Gutenberg/arXiv/etc., or manual
   drop) — same provenance discipline as every shelved text.
4. **Self-study** — once shelved, the node's reading is live and the tutor can
   ground on it.

This keeps the whole thing honest (no fake "reading" that doesn't exist) while
letting the *plan* run ahead of the *content* — exactly what the user asked for.
It also turns "grow the Library" from an open-ended chore into a **demand-driven
queue**: the courses people actually want to take name the books actually worth
fetching next.

---

## Others get on board: take, make, or pioneer

Three levels of participation, in honest build order:

1. **Take** a course (the tree, above) — read the reading, climb the prereqs,
   with the tutor's help. This is the first and biggest slice.
2. **Make** your own lesson plan — the AI-drafted-course path already exists;
   extend it so a visitor turns their own goal into a node (level, reading,
   steps) for themselves, private by default.
3. **Pioneer** a lesson for *others* — a made course, submitted (the same
   steward-reviewed queue the Library already uses for texts, so quality and
   provenance hold), becomes part of the shared tree. This is the commons
   applied to curriculum — the furthest-out piece, and the one that makes it a
   *school*, not a personal notebook. Ties to `COURSE-BOARD-PLAN.md` Stage 2
   (sharing) and `TOOL-COMMONS-PLAN.md`'s bare-foundation-vs-own-additions seam.

---

## Phases — each a real, usable slice

**Phase 0 — Seed one real subject as the proof (content-first).**
Turn `LEARNING-PATH.md`'s coding stages into a real tree: `Coding 101`
(terminal → HTML/CSS/JS) → `Coding 201` (how files talk, git) → branches, each
with its real reading (some already shelved; the rest named as Request Board
gaps). One subject, done right, is the spec for all the others — and it's the
subject the user is learning anyway, so it doubles as beta testing.

**Phase 1 — The three fields + a locked/available tree view.**
Add `level`/`prereqs`/`reading` to the course model (backward-compatible), and a
Course Board view that shows the tree: available nodes, locked-but-visible
nodes, completed nodes. Start at a 101; unlock as you finish. This is the
structural heart.

**Phase 2 — Required reading wired to the Library + the gap queue.**
A node's reading list links straight into the Reader for shelved books; unshelved
reading shows as an honest gap with a one-click "add to the Request Board (for
this course)." The demand-driven Library loop.

**Phase 3 — The tutor on a node (reuses the Academy).**
"Study with the tutor" on a course node, grounded in *that node's* reading and
steps — the Academy plan's tutor, pointed at a tree node. Teaching + testing +
review + counsel, per `PAVILION-ACADEMY-PLAN.md`.

**Phase 4 — Make & pioneer.**
Visitor-authored nodes (private), then steward-reviewed submission into the
shared tree. The commons goes multi-student.

---

## The honest risks (named so they're designed around)

- **Prereq rigidity vs. real learners.** People arrive mid-way, or want to skip.
  Locked ≠ forbidden: allow "I already know this, mark it done / test out of it"
  (a tutor-graded challenge is the honest version) so the tree guides without
  jailing.
- **A tree that's mostly gaps feels broken.** Seed at least one subject with
  *real, shelved* reading (Phase 0) before exposing the tree, so a newcomer's
  first climb isn't all Request-Board IOUs.
- **Quality of pioneered lessons.** The same steward-review discipline the
  Library already uses for texts applies to submitted courses — provenance and
  quality held structurally, not hoped for. See [[feedback_truth_seeking_ethos]]
  (evidence over volume) applied to teaching.
- **Effectiveness before cleverness / local-first / no background work** — the
  standing rules hold, same as the Academy and the Hall.

---

## Cross-references

- `COURSE-BOARD-PLAN.md` — the board and course object this extends; Stage 2
  (sharing) is the "pioneer" path.
- `PAVILION-ACADEMY-PLAN.md` — the tutor that helps you through each node; this
  plan is the *map*, that plan is the *guide*.
- `LEARNING-PATH.md` — the working proof of a prereq-ordered curriculum with
  reading; Phase 0 turns it into the first real tree.
- `LIBRARY-GROWTH-PLAN.md` / the Request Board — where "upload the books then
  self-study" actually happens.
- `HOPES-AND-DREAMS-ROADS.md` Road 7 — "a free place to pursue higher education
  together," which this is the concrete machinery for.

**One line to hold onto:** the Library lets anyone *read* everything; the
Course Progression Tree tells a newcomer *where to start and what comes next* —
which is the difference between a pile of books and a school you can actually
enroll in.
