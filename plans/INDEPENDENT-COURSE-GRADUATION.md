# Independent Course Graduation — Pre-Mission Requirement

**Status:** Draft for implementation
**Date:** 2026-08-07
**Author:** the steward
**Depends on:** Existing Teacher's Tree, Course Board, Academy Tutor, Learning
Tree plans
**Used by:** F-rank recognition in `MISSION-SYSTEM-PLAN.md`
**Filed:** 2026-08-07. See `plans/done/NEW-PLANS-RECONCILED-2026-08-07.md`.

The Pavilion's goal is not to control direction. It is to give people (and the
steward) the foundations to pursue what they want, to create courses on the
platform, complete them, edit them until they are ready for others, and only
then step into larger shared work.

Graduating at least one independent course is therefore the required pre-mission
gate.

---

## The Required Sequence

1. Foundations remain open (full Library at all times).
2. Guided "what to study next" packets stay behind the existing
   course-progression wall.
3. The person designs and completes at least one course of their own making.
4. They edit that course until it is clear and usable by another person.
5. Only then is independent-course graduation recorded and F-rank (together with
   Right Livelihood) becomes available.

This sequence turns graduation into a real ability: the capacity to create,
finish, and transmit learning.

---

## What Counts as an Independent Course

- Created with the existing tools (`data.myLessons` with `mine: true`, Course
  Board, Teacher's Tree authoring).
- Has a clear purpose / intended outcome.
- Contains ordered steps (book citations via the existing `reading` field are
  encouraged).
- Is substantial enough that completing it produces a real skill, understanding,
  or artifact (not a single note).
- The author actually walks the course to completion and links the resulting
  artifact.

---

## Publish-Ready Editing (Transmission Step)

After personal completion the same course must be polished so another person can
follow it without the author present:

- Clean title, purpose, and outcome statement.
- Steps that stand alone and are understandable in isolation.
- License / attribution ready (Credit-and-Commons rules).
- Exportable as Markdown, HTML, or packet (tools already partially exist).

Optional but encouraged: leave the course as a bequest in the Inheritance Hall
or publish it as a Commons packet.

---

## Graduation Check (Local and Honest)

Recorded when all of the following are true:

1. At least one `mine: true` course exists.
2. All its steps are marked complete **and** an artifact is linked (the thing
   the course claimed to produce).
3. The course has passed a short "ready for others" review (static checklist +
   optional Tutor conversation) and has been exported or left as a
   bequest/packet.

The record is local. Higher Mission surfaces simply read the flag. No external
authority and no public ranking of people.

---

## Integration Points

| Existing piece | Use |
|----------------|-----|
| `data.myLessons` + `allNodes()` | Home for independent courses |
| Teacher's Tree authoring + note→lesson promotion | Primary creation path |
| Course Board | Personal drafting and tracking workspace |
| Tutor | "Help me design/review structure" and "Review for clarity so others can walk it" |
| Study chain (note → lesson → path → Today) | Daily walking of the independent course |
| Export / packet / Inheritance Hall | Transmission step |
| Progression wall | Continues to gate only guided recommendation packets; independent courses sit outside it once created |

---

## UI Implications

- "Start independent course" should be a prominent, calm action in the Academy
  / Learning Tree surface.
- The large work-surface panel (planned for lesson planning) is the right place
  for both creation and the ready-for-others checklist.
- Graduation itself is a quiet change of posture, not a celebration screen.

---

## Success Criteria

- A motivated person can design, finish, and make publish-ready a real course
  using only the Pavilion's tools.
- The act of doing so visibly prepares them to contribute to larger Missions.
- People who only want to read and explore are never blocked.
- The system never dictates the content of the independent course — only that
  one must be completed and made transmissible.

This is the concrete skill gate that turns the Pavilion from a private study
into a place that can feed work larger than any single life.
