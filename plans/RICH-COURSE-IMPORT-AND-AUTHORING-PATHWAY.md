# Rich Course Import & Authoring Pathway
## From Thin Task List to High-Standard Living Courses

**Status:** Phase A in progress 2026-08-14
**Date:** 2026-08-13
**Author:** Steward + Grok
**Depends on / Extends:**
- Existing `src/game/data/course-format.js` (portable Markdown parser — already the correct foundation)
- `plans/COURSE-AUTHORING-AND-IMPORT.md` (this repo's own version, step 1 built 2026-08-12)
- `plans/HIGH-STANDARD-COURSE-CREATION-GUIDE.md`
- `plans/INDEPENDENT-COURSE-GRADUATION.md`
- [`courses/theoretical-minimum.course.md`](../courses/theoretical-minimum.course.md) (the method)
- `plans/AI-INTEGRATION-NOTES.md`
- Current Course Board (thin checklist) + Learning Tree / `myLessons`

**Goal:**
Make it straightforward for a resident to draft a high-quality course outside the Pavilion (with ChatGPT / Claude / Grok in a browser window next to the game), then drag-and-drop or paste that work into a clear "Receive Course" surface so it becomes a full living course log with real body text, practices, reflections, and artifacts. Keep the simple task-list path easy. Raise the ceiling for academic excellence without raising the floor of difficulty.

This is the missing hand-off that turns the Theoretical Minimum method and the 7-step protocol into something people can actually use inside the Pavilion.

> **Filed into the repo 2026-08-14**, along with the two courses it exists to
> carry. Both are in [`courses/`](../courses/) as real `.course.md` files and the
> live suite reads them rather than a tidied fixture.

---

## 1. Current Reality (Measured)

What already works:
- `course-format.js` parses full portable Markdown (frontmatter + `##` modules + multi-paragraph body text).
- The display side can already show step bodies.
- External drafting is the declared philosophy in the code comments themselves: "the strongest drafting happens in an ordinary chat window with a strong model."
- Course Board exists for personal tracking.
- Independent Course Graduation and transmission (bequest / packet) already require polish for others.

What is broken or missing:
- The in-game course maker is still a thin task list. There is no first-class place to land a rich course.
- No clear drag-and-drop or large paste surface for `.course.md` / full Markdown.
- Imported or drafted rich content risks being flattened back into the old one-line step model.
- No visible distinction between "simple personal checklist" and "full transmissible course."
- Prompt templates and Theoretical Minimum method exist in plans but are not yet living tools inside the game.

### ⚠ Measured again 2026-08-14, and it is worse than "thin"

Run against the real frontmatter of `courses/junior-electrical-engineer.course.md`,
`parseCourse()` returned:

```
ok: false
problems: [ 'Could not read the line "- \"A genuine personal question or
             project\"" — frontmatter is "key: value".', … ]
```

**The two courses this plan was written to carry could not enter the Pavilion at
all.** Three defects, each hit by both documents:

1. `prerequisites:` followed by `- item` lines — the item lines have no `:`, so
   the frontmatter reader rejects them and the whole import fails.
2. Quoted values keep their quote marks — the title renders as
   `"Junior Electrical Engineer Path"`, punctuation included.
3. Everything before the first `##` is discarded except its first paragraph — so
   `# How to walk this course` is **thrown away**, and that section *is* the
   Opening Intention, required piece #1 of the High-Standard guide.

Fixing these is Phase A step zero.

---

## 2. Core Design Decisions (Locked for this plan)

1. **Two modes, clearly separated**
   - **Simple mode** — current Course Board task list. Stays easy and unchanged for personal tracking.
   - **Full Course mode** — rich modules with body text, practice, reflection, artifact. Arrives primarily by import.

2. **Pavilion does not become a rich-text editor**
   Heavy drafting stays in the browser chat window. Pavilion owns the portable shape, the import hand-off, the living log, and the transmission path.

3. **Receive Course is a first-class surface**
   Drag-and-drop of `.course.md` (or paste of full Markdown) is the primary way rich courses enter the Pavilion. This is the concrete pathway the steward asked for.

4. **Quality is taught and surfaced, not hard-blocked at import**
   A course can be imported even if thin. Status flags and the ready-for-others checklist make the standard visible. Independent Course Graduation remains the gate for recognition / F-rank.

5. **Theoretical Minimum + 7-step protocol remain the method**
   They live as prompt templates the player can copy into the external chat, and later as a short in-game Protocol / desk.

6. **Local-first and privacy stay absolute**
   Nothing private leaves the device. Shared courses travel only as deliberate packets or bequests.

7. **The Course Board is where courses live and are walked** (steward, 2026-08-14).
   The Learning Tree becomes the visual map of what you might want to do and
   **directs you to the Board**. That settles `COURSE-AUTHORING-AND-IMPORT.md`
   step 4: the Board's step shape grows a `body`, additively.

---

## 3. The Player Experience We Want

1. Player opens a browser tab with ChatGPT / Grok / Claude next to the Pavilion window.
2. They use the prompt templates (Theoretical Minimum → Outline → Expand to portable Markdown → Review).
3. Model produces clean Markdown.
4. Player drags the file onto the Receive Course drop zone **or** pastes the full text into the paste area.
5. Pavilion parses it with the existing `course-format.js` logic and parks it as a full course (Incoming / Drafts or directly on Course Board with a "full" flag).
6. Player opens the course, walks modules one by one, reads real body text, does practices, links artifacts, marks completion.
7. When ready, they run the ready-for-others checklist, polish, and transmit (bequest / Commons packet / Independent Course Graduation).

Simple personal task lists continue to work exactly as they do today.

---

## 4. Concrete Work Items (Sequenced)

### Phase A — Receive & Park (highest leverage, do first)

- [ ] **Fix `parseCourse` against the real files** (block lists, quote
      stripping, keep-and-show the preamble as `intro`, promote
      `purpose`/`audience`/`outcome`/`prerequisites`/`category` to real fields).
- [ ] **Receive Course panel / drop zone**
  Clear UI surface (can live near Course Board or as a dedicated desk action). Accepts:
  - Drag-and-drop of `.course.md` or `.md` files
  - Large paste of full Markdown text
  - Uses existing parser from `course-format.js`
  - Shows parse problems clearly if the Markdown is malformed
  - On success, creates a full course entry (not flattened)

- [ ] **Parking place**
  Incoming / Drafts section or clear visual flag on Course Board so rich imports are not lost among simple checklists. Once the player starts walking it, it becomes a normal course log.

- [ ] **Status distinction**
  Simple checklist vs Full Course (has substantial body text / multiple modules with content). Visible but not punitive.

### Phase B — Living Full Course Experience

- [ ] Ensure opening a full-course step shows the real body text (and recommended Practice / Reflection / Artifact sections written as bold labels inside the body, per current format design).
- [ ] Progress tracking, artifact linking, and completion work the same way for full courses as for simple ones.
- [ ] "Export as Markdown" already partially exists; confirm round-trip fidelity for rich courses.

### Phase B¼ — What this course requires you to have (added 2026-08-15)

The steward, while beta-testing the meditation course:

> *"We should plan a wave for the pavilion to have a requirement of knowledge
> imports — where we have a list of things that we need to get for the books,
> or a way to reference the books that are already in the pavilion."*

**A course should be able to say what it reads, and the Pavilion should say
which of those you have.** Most of this exists already and it is derivation
rather than new authoring:

- **The declaration is already there.** As of 2026-08-15 a module carries
  `**Reading:** <title>`, and the Board resolves it in three states —
  a confirmed door, an offer to link a close shelf match, and a plain
  *"not on your shelf yet"*. The course-level view is the same data, counted.
- **A required-reading panel on the course:** *"This course reads 5 texts —
  you have 4, one is missing."* Derived from the modules; nothing new stored,
  nothing for the author to maintain separately, so it cannot drift from what
  the modules actually say (rule 4).
- **The missing ones get a real path, not a shrug.** The **Request Board**
  already exists (`openRequests` — *"where a book you want but can't fetch
  in-game is tracked until it's brought in by hand"*) and is exactly the right
  home. One press adds a missing text to it. `PROTOCOL 1` already lists where
  books can be had free and legally, and the reading prompt already returns
  **search terms rather than links** for precisely this moment.
- **Show it BEFORE pinning.** The Receive preview should say *"reads 5 texts,
  you have 4"* while a person is deciding — that is the honest moment to learn
  a course expects a book you do not own, rather than three modules in.

**⚠ What this must NOT become:** a gate. A course you cannot start because a
book is missing would be the Pavilion auditing your shelf, which
`plans/GUIDANCE-NOT-ENFORCEMENT` territory forbids — the line is at *spreading*,
not *holding*. It reports and it offers; it never blocks, and it never scolds.

### Phase B½ — Intention and Baseline (next session, added 2026-08-14)

- [ ] **Opening Intention** recorded before the high-standard tools open.
- [ ] **Baseline check** — required piece 2 of
      `HIGH-STANDARD-COURSE-CREATION-GUIDE.md`. Four written questions taken
      *before* the course is shaped around the person, re-taken at the end, kept
      local, and offered as a reference to whoever walks the course next.
      The course side of this already exists as of today: `prerequisites`,
      `audience` and `level` are real parsed fields, so the comparison the
      baseline exists to make has something concrete to compare against.
- [ ] Daily check-in + commitment status; reset on a broken commitment.

### Phase C — Method Living Inside the Pavilion

- [ ] Prompt template set available from a Course Authoring desk / resident / Protocol entry:
  - Draft Theoretical Minimum
  - Produce outline
  - Expand to portable Markdown
  - Ready-for-others review
- [ ] Short in-game pointer to the Theoretical Minimum course and the 7-step protocol so the standard is teachable.
- [ ] Optional later: "Turn this simple list into a skeleton" export that a cloud model can expand.

### Phase D — Transmission & Community (after A–C are solid)

- [ ] Full courses can be packaged as Commons packets or left as bequests with clear attribution and license.
- [ ] Ready-for-others checklist surfaces the Theoretical Minimum + standalone clarity + artifact + transmission readiness.
- [ ] Future (explicitly later): Open Square / Friday presentation days for reviewed courses or papers (inspired by ABC-group present → feedback loops). This is a transmission surface, not part of the core authoring hand-off. Requires the rich course path to exist first.

---

## 5. Balancing Ease and Academic Excellence

| Concern | How we handle it |
|---------|------------------|
| Making courses too hard | Simple task-list mode is untouched. Import path is drag/drop or paste — no new complex editor. |
| Thin content flooding the place | Status flags + ready-for-others checklist + Independent Course Graduation gate. Excellence is visible and rewarded, not enforced by blocking import. |
| Player does not know the method | Prompt templates + Theoretical Minimum course + short Protocol entry teach the standard. |
| Drafting friction | External chat remains the high-power environment; Pavilion only needs excellent hand-off. |
| Scope creep | Phase A (Receive + Park) is the single highest-leverage change. Everything else builds on it. |

---

## 6. Mapping to Existing Code

- **Parser**: `src/game/data/course-format.js` — already correct. Do not invent a second format.
- **Emitter**: `data/lesson-doc.js` `lessonToMarkdown(node,{frontmatter:true})` is the **one** emitter and `npm test` fails if a second appears. All conversion goes through it.
- **Course Board / `myLessons` / Learning Tree**: extend storage and display to honour full body text and the full/simple distinction.
- **AI pathways**: prompt templates can be handed to the player for use with any connection (local or cloud). No requirement that the local model write the entire course.
- **Packets / bequests / copyright**: reuse existing systems for transmission and book citations.
- **Tutorial Stage 5 / Independent Course Graduation**: once Receive Course exists, these surfaces become real instead of aspirational.

---

## 7. Success Criteria

- A resident can take a course drafted in a browser chat, drop it into the Pavilion, and immediately walk it as a multi-module log with real explanatory text.
- Simple personal checklists remain as easy as they are today.
- The Theoretical Minimum method and 7-step protocol have a clear living path from external draft → import → walk → polish → transmit.
- The door is open for later public presentation / ABC-style peer feedback surfaces without blocking the current work.

---

## 8. Recommended Immediate Next Actions

1. Review and accept (or adjust) this plan.
2. Implement Phase A (parser fixes + Receive Course panel + parking + status flag). This is the concrete pathway the steward asked for.
3. Seed the prompt templates inside the game so players can copy them into the external chat.
4. Use the practical electrical engineering course as the first full example that travels through the new path end-to-end.
5. Only after A–C are working, revisit Open Square / Friday presentation days as a transmission feature.

---

## Note on ABC Groups & Public Presentation

The video (Stephen Petro — self-education, ABC groups: research → present → feedback → next topics) points to a strong future transmission surface: an Open Square or scheduled presentation days where reviewed courses or papers can be presented. That idea fits the Pavilion's skill-and-ability mission and the ABC peer-learning pattern. It is deliberately placed in Phase D / future work. The rich course import path must exist first; otherwise there is nothing solid to present.

---

*This plan stays local-first, keeps the high-standard method teachable, and solves the exact hand-off problem between external cloud drafting and a living course inside the Sand Pavilion.*
