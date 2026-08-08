# Course Progression & Display Plan — Professional Learning Surfaces

**Status:** Draft for implementation
**Date:** 2026-08-07
**Author:** the steward
**Depends on:** Existing Teacher's Tree, Course Board, `COURSE-PROGRESSION-PLAN.md`,
`THE-TEACHERS-TREE-PLAN.md`, Academy Tutor
**Supports:** `INDEPENDENT-COURSE-GRADUATION.md`, `MISSION-SYSTEM-PLAN.md`,
`MISSION-WORKSPACE-PLAN.md`
**Filed:** 2026-08-07. See `plans/done/NEW-PLANS-RECONCILED-2026-08-07.md`.

The current course progression and Learning Tree are functional but not yet
professional enough for serious independent course creation, long hierarchical
paths, or communal trees. Displaying tall trees, complex prerequisites, and rich
course editing inside the pure top-down game view quickly becomes cramped, hard
to read, and risks breaking the "place" feeling.

This plan makes course progression professional while protecting the game
format.

---

## Core Design Decision

**Separate presence in the world from serious work surfaces.**

- In the walkable world: light, atmospheric entry points and glanceable signals
  only.
- For real progression, lesson planning, Course Board, and tree editing: open a
  large, calm, website-quality work surface that still lives inside the
  Pavilion.

This keeps the three promises intact (Esc closes everything, nothing phones
home, starts empty) while giving the tools the breathing room they need.

---

## Goals for a Professional Course Progression

1. **Readable hierarchy** — Tall trees, nested prerequisites, personal vs seeded
   vs communal nodes must be scannable and editable without eye strain or
   overlapping elements.
2. **Clear progression wall** — Guided "what to study next" packets remain
   gated. Library and all book content stay fully open.
3. **Independent course first-class** — Creating, completing, and polishing a
   `mine: true` course is a prominent, smooth flow (the F-rank gate).
4. **Professional authoring** — Steps, book citations, purpose, outcomes,
   artifacts, and "ready for others" checklist feel like a real course design
   tool, not a game inventory.
5. **Communal / shared trees** — Received packets and shared courses appear in a
   distinct, clean section without polluting personal progress.
6. **No breakage of game feel** — The work surface is still "inside" the
   Pavilion (same visual language, same Esc behaviour, same local data).

---

## The Learning Work Surface

A single large panel (or family of related panels) opened from an in-world
object in the Study, Academy, or Workshop.

### Entry Points in the World
- A physical board, desk, living tree sculpture, or wall of cards in the Academy
  / Study.
- Interacting (E) opens the Learning Work Surface.
- Ambient signals only: soft glow for "independent course in progress", small
  count of open guided packets, quiet marker when graduation is complete. No
  interactive tree drawn on the floor.

### Work Surface Layout (Professional, Calm)

**Visual language:** Continuous with the Pavilion — paper, ink, quiet light,
generous margins, readable serif or clean sans for long text. Not generic SaaS
blue.

**Primary modes inside the surface:**

1. **Browse / Tree View**
   - Clean hierarchical or indented list (not a force-directed graph that
     collides).
   - Filters: Personal (`mine`), Seeded, Received / Communal, In Progress,
     Completed, Ready for others.
   - Search across titles, purposes, and book citations.
   - Prerequisite links shown as clear parent/child relationships or a side
     outline.
   - Progress indicators are quiet (checkmarks, thin progress lines) — never
     gamified badges.

2. **Course / Lesson Editor**
   - Focused editing of one course or lesson.
   - Fields: title, purpose / intended outcome, track/level, ordered steps,
     optional `reading` citations (book + chapter/page), prerequisites, linked
     artifact.
   - Drag-and-drop or clear up/down controls for step order.
   - Live preview of how the course will look to someone else.
   - "Ready for others" checklist (clarity, standalone steps,
     license/attribution, export readiness).
   - One-click export to Markdown / HTML / packet.

3. **Guided Progression View**
   - The existing progression wall lives here.
   - Shows available next packets only when prerequisites are met.
   - Clearly labelled as "Guided recommendations" so it never feels like the
     only path.

4. **Graduation & Status**
   - Quiet summary of independent-course status.
   - Checklist progress toward F-rank recognition.
   - Link to export or leave as bequest once ready.

### Internal Navigation
- Persistent side or top navigation between Browse, Editor, Guided, Status.
- Never leaves the work surface until Esc.
- All data remains in the existing local stores (`data.myLessons`,
  `data.curriculum`, `allNodes()`, etc.).

---

## Making Progression Itself More Professional

### Data & Structure Improvements
- Ensure every course/lesson node has: clear purpose, ordered steps, optional
  reading citations, artifact link, and a `readyForOthers` flag or checklist
  state.
- Support nested courses (a course can contain or reference other lessons as
  modules).
- Keep the existing honest out-of-order behaviour: content is readable even if
  prerequisites are incomplete; only attestation and guided recommendations are
  gated.
- Communal packets arrive as first-class nodes with clear "Received" provenance
  and do not overwrite personal progress.

### Authoring Flow (Independent Course)
1. "Start independent course" is a prominent calm button.
2. Optional Tutor help to draft structure from a purpose statement (user keeps
   full control).
3. Author steps, attach books, define outcome.
4. Walk the course (steps mark complete, artifact is produced and linked).
5. Run the ready-for-others checklist + optional Tutor review.
6. Export or leave as bequest — graduation flag becomes true.

### Progression Wall Rules (Unchanged in Spirit)
- Library always open.
- Guided next-packet recommendations stay behind the wall.
- Independent courses, once created, sit outside the wall and are always
  editable by their owner.
- Testing out of a node still requires an artifact, not a claim
  (Credit-and-Commons principle).

---

## Integration with Missions & Science

- An independent course can be attached as a contribution or work package inside
  a Mission Workspace.
- The same large work-surface pattern is reused for Mission Workspaces and
  Science Hall personal papers (see `MISSION-WORKSPACE-PLAN.md`).
- This creates visual and interaction consistency across learning, research, and
  higher Missions.

---

## Implementation Order (Practical)

1. **Decide the in-world entry object** (or reuse an existing desk/board in
   Academy/Study).
2. **Build the large work-surface shell** using the existing overlay/panel
   system so Esc, focus, and save behaviour stay consistent.
3. **Implement Browse / Tree View** with clean hierarchy, filters, and search
   (replace any cramped in-world tree attempts).
4. **Implement Course / Lesson Editor** with professional fields, step ordering,
   reading citations, artifact link, and ready-for-others checklist.
5. **Wire Guided Progression View** so the existing wall lives cleanly inside
   the surface.
6. **Add graduation status summary** and connect the flag to F-rank / Mission
   surfaces.
7. **Polish visual language** so the surface feels continuous with the Pavilion
   rather than an external app.
8. **Optional later:** ambient in-world previews or pinned summary cards that
   open back into the surface.

---

## What This Solves

- Tall trees and communal trees become readable.
- Course planning feels professional enough for real independent work and for
  preparing material others can follow.
- The game format is protected: the world stays a place you walk, the heavy
  lifting happens on a dedicated, calm surface that still belongs to the
  Pavilion.
- Independent course graduation becomes a smooth, visible path rather than a
  hidden side activity.
- Future Mission Workspaces and Science papers inherit the same solid display
  pattern.

---

## Success Criteria

- A user can open the Learning Work Surface and comfortably design, reorder, and
  polish a multi-step independent course without fighting the UI.
- Hierarchical relationships remain clear even with dozens of nodes.
- Guided progression packets appear only when appropriate and never block
  library access or independent work.
- Esc always returns the user cleanly to the world.
- The surface feels like a natural extension of the Pavilion's desks and boards,
  not a bolted-on website.

This plan turns course progression from a constrained game feature into a
professional learning tool that still lives inside the game-shaped place.
It is the practical foundation that lets the independent-course gate and the
higher Mission system actually work for real people.
