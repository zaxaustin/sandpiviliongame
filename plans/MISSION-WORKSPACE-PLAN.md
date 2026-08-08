# Mission Workspace Plan — "GitHub for Quests & Research"

**Status:** Draft for implementation
**Date:** 2026-08-07
**Author:** the steward
**Depends on:** `MISSION-SYSTEM-PLAN.md`
**Also used by:** Science Hall personal papers and investigations
**Filed:** 2026-08-07. See `plans/done/NEW-PLANS-RECONCILED-2026-08-07.md`.

Every Mission (and every serious scientific investigation) is a living
repository. The workspace is the place where plans are extended, books are
gathered, thoughts are recorded, and public work is hosted with clean
provenance. It is deliberately closer to a focused research repository than to a
quest log or a social feed.

---

## Design Goals

- Dense, hierarchical, long-lived information must be readable and editable.
- Contribution is possible without permission, but publication carries
  provenance and optional review.
- Reputation emerges only from hosted, usable work — never from likes, stars, or
  rankings of people.
- The same pattern serves both humanity-scale Missions and personal scientific
  papers.
- Fully local-first; a Mission workspace can later be exported as a packet so
  other Pavilions can continue it.

---

## Workspace Structure (the "Quest Tab")

When a Mission is opened it loads a large, calm work-surface panel (same family
as the planned Learning Tree / Course Board surface). Esc closes it. Nothing
phones home.

### 1. Header
- Rank + title
- One-paragraph humanity-level purpose
- Eightfold Path alignment note (required)
- Status: Proposed / Active / Needs carriers / Legacy
- Top-level success metrics and falsifiers (Science Hall style)

### 2. Living Plan
- Nested outline (S → A → B → C work packages)
- Explicit, always-visible **Missing / Open** sections
- Anyone can propose additions; proposals become packets or notes attached to
  the plan
- Individual work packages can be turned into Paths or independent courses

### 3. Knowledge Shelf
- Mission-specific shelf
- Books dragged from the main Library or requested via Caravan
- Short "why this book matters here" annotations
- Unshelved but needed titles appear as honest gaps

### 4. Thoughts & Direction
- Private notebook for the individual's own thinking and direction
- Optional public Direction area where reasoned proposals, critiques, and new
  angles can be left
- Every entry carries provenance (author key or local identity, timestamp,
  linked evidence)

### 5. Public Work Hosting

The heart of the "GitHub for quests" idea.

Hosted items include:
- Research packets
- Experiment / bench logs
- Open hardware designs and build records
- Curriculum fragments or independent courses that serve the Mission
- Draft or finished papers
- Plan extensions that were accepted

Each hosted item shows:
- Title + short description
- License and attribution
- Provenance / hash
- Link to the actual artifact
- Optional "built upon" or "reproduced by" signals

No global ranking of people. The only visible reputation is the inspectable
record of what was hosted and whether others could use it.

### 6. Carriers & Continuity
- Optional "I am currently carrying a piece of this" (name visible only if
  chosen)
- Hand-off / bequest notes that can be sent to the Inheritance Hall
- Simple history of major plan changes

---

## Science Lab Reuse (Personal Papers)

Exactly the same workspace shape, scoped to one investigation or paper:

- Hypothesis / methods / results / falsifier
- Attached data and books
- Private thinking + optional public version
- Ability to host the finished or intermediate paper as a packet with full
  provenance

This gives every serious scientific effort inside the Pavilion a steady,
grounded home.

---

## Reputation Model (Quiet and Evidence-Based)

- Reputation = the visible trail of hosted work with clean provenance.
- Others can cite, build on, or reproduce it.
- The system never awards points or ranks individuals.
- Aligns with the existing Credit-and-Commons framework and open-hardware
  logging principles.

---

## AI Support Inside a Workspace (Grounded)

Local models (Ollama first) may:

- Draft missing plan sections for human acceptance or rejection
- Suggest relevant books already present in the Library
- Help structure a paper or experiment log
- Check language against the Mission's Eightfold Path note
- Summarise recent contributions

AI never owns the Mission, never auto-publishes, and never acts without an
explicit human request. This keeps the Pavilion steady while still using modern
tools.

---

## Data Shape (High Level)

A Mission object roughly contains:

- id, rank, title, purpose, eightfold_note, status
- plan_tree (nested nodes with "missing" flags)
- shelf (book references + annotations)
- notebook (private + optional public entries)
- hosted_works[] (packets / artifacts with provenance)
- carriers[] (optional)
- bequests[] / history

Personal Science Hall papers use a compatible subset of the same shape.

---

## UI Notes

- Large work-surface panel, calm typography, generous spacing.
- Internal modes: Overview · Plan · Shelf · Notebook · Hosted Work.
- Visual language continuous with the rest of the Pavilion (paper, ink, quiet
  light).
- Clear distinction between personal notes and public hosted work.
- "Host public work" is essentially "attach a properly attributed packet or
  export."

---

## Build Order

1. Data shape and local storage for Mission objects.
2. Large panel shell with the six sections above.
3. Living Plan + Missing sections (editable outline).
4. Knowledge Shelf integration with existing Library.
5. Public Work Hosting (packet attachment + provenance display).
6. Carrier and bequest hooks to Inheritance Hall.
7. Re-use the same panel for Science Hall personal papers.
8. Later: export of an entire Mission workspace as a shareable packet.

---

## Success Criteria

- A graduate can open a Mission and immediately see concrete open work packages.
- Adding a book, a thought, or a hosted packet feels natural and permanent.
- Someone years later can open the same Mission and understand what is missing
  and what has already been tried.
- Personal scientific papers feel first-class, not second-class citizens to the
  big Missions.
- The workspace never requires an account or network to be useful for one
  person.

This is the concrete place where "the sky is the limit" becomes daily, grounded
work.
