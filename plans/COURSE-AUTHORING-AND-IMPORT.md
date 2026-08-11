# Course authoring — drafting outside, walking inside

**Status: step 1 BUILT 2026-08-10. The protocol and the drop-a-file path are
written down here and not started.**

Filed in the repo because the version this came from was not. The steward and
Grok wrote `COURSE-AUTHORING-EXTERNAL-DRAFT-AND-IMPORT-PLAN.md` in an artifact
space outside this tree, so the next session could not read it — the same thing
happened with `BETA-CRITICAL-PATH-2026-08-09.md`. A plan that is not in
`plans/` does not exist as far as this project's own workflow is concerned.

---

## The leverage, which is the steward's

> the strongest drafting happens in an ordinary chat window with a strong
> model. The Pavilion's job is not to replace that power. Its job is to give a
> clear protocol for using it well, a portable format the Library / Course
> Board / Teachers Tree can receive, and a local course log that is actually
> worth walking.

That is right, and it is why this is a **text format** rather than JSON: a
person can write it by hand, a model emits it from one prompt, it diffs, and it
survives being pasted into a chat window and back out. JSON fails all four.

---

## What was actually wrong (measured, 2026-08-10)

Tutorial Stage 5 asks for a course whose *"steps stand alone — someone who
never met you could follow them."* **A step could not hold more than one line.**
Three places enforced it independently:

| | |
|---|---|
| `saveMyLesson()` | split the textarea on newlines, `Title \| body` |
| `publishFrom()` | flattened each step back to `title \| body` |
| `takePacket()` | split it on the first `\|` |

**The renderer was never the problem.** `ui/lesson-tree.js` has printed
`s.body` since it was written, and `readingIn()` already scans title+body for a
chapter reference and offers a door to it. The display half was built and the
writing and interchange halves capped it at a line — a capability that existed
and could not be reached, which is this project's signature bug.

And `data/lesson-doc.js` **already emitted the Markdown document**, written
2026-08-03 for the steward's friend who teaches English. The emitter existed;
the reverse direction did not.

---

## Step 1 — BUILT

**One format, one emitter, one parser, and they round-trip.**

- `data/lesson-doc.js` `lessonToMarkdown(node, {frontmatter:true})` — the
  existing teacher-facing document, plus an optional machine-readable header.
  **Not a second writer**; `npm test` fails if `course-format.js` grows one.
- `data/course-format.js` — `parseCourse()` reads what that emits,
  `parseSteps()` accepts either the portable form or the old `Title | body`
  line form (the text says which it is — no mode switch), `stepsToText()` puts
  it back in the box to edit without truncating.
- **Authorship reuses `note-versions.js`'s `by`** — `{who, user, model}`, the
  same field a note carries, because a course drafted in a chat window and an
  AI note written in the Reader are the same question. `drafted-with: <model>`
  in the frontmatter is what sets it.
- Unknown frontmatter keys ride along in `extra` — a file from a newer Pavilion
  must not lose fields passing through an older one.
- The packet carries the whole document in `body`, **and still writes the old
  flattened `steps`**, because a Pavilion older than today reads that and
  nothing else.
- `mdLite()` in `ui/dom.js` renders `**bold**` and nothing else, escaping
  first. One mark, because that is all the format asks for and every other one
  is a way to smuggle HTML.

### The shape

```markdown
---
title: Reading slowly, on purpose
summary: How to get more from one chapter than from five.
track: Reading
level: 101
reading: personal-walden          # a slug on your shelf, optional
drafted-with: some-model          # omit if you wrote it yourself
author: user 1
---

## Pick one chapter, and only one

Real paragraphs. As many as it takes.

**Practice:** read it once at ordinary speed.

**Reflection:** what did you skim, and why that part?
```

**There is deliberately no Objective/Practice/Reflection FIELD.** Nothing in
the app reads them, and a field nobody reads is a field that rots. They are
bold labels inside the body, which render as prose today and can be promoted
the moment something actually consumes one.

---

## Step 2 — NOT STARTED: the protocol

The 7-step method for turning a skill into something transmissible, as a
document a person can follow with any chat window open beside them:

1. Goal and audience, with success criteria
2. Prerequisites and gaps
3. Ordered modules, each with an objective
4. The explanatory body of each module
5. Practice · reflection · artifact
6. Polish for transmission — standalone clarity, attribution, licence
7. Package, import, and **walk it yourself**

It belongs in `PROTOCOLS.md` beside the existing setup protocols, with
copy-paste prompt templates. Step 7 is the one that must not be dropped:
`INDEPENDENT-COURSE-GRADUATION.md` requires the author to have walked their own
course, and Tutorial Stage 5 checks it.

## Step 3 — NOT STARTED: dropping a `.md` on the window

`acceptDropAnywhere` already takes `.txt`, `.epub` and `.json` bundles. A
`.course.md` would route to `parseCourse()` and land as a lesson. Small, but it
is a new import path and therefore new surface for malformed input — it needs
its own live suite and should not ride in on something else.

## Step 4 — NOT STARTED: the Course Board and the Tree still disagree

`data.courses` steps are `{title, practice, url, done}`; `myLessons` steps are
`{title, body}`. Two shapes for one idea, diverged since July. Merging them is
`COURSE-PROGRESSION-AND-DISPLAY-PLAN.md`'s Learning Work Surface and is a real
piece of work — **not** a tidy-up to slip into another change.

---

## Verification

```bash
npm test                        # the round trip, one-emitter, mdLite escaping
node test/live/course-format.mjs
```

The live suite drives the whole journey with a genuinely multi-paragraph step:
written in the real textarea → visible in the open panel → re-opened to edit
without truncation → published through the real reason screen → written out as
a packet → handed back in through the real `#packetFile` input → taken → the
paragraphs and the authorship both survive.

Seven sabotages, all seven caught. One of them was written wrong first and is
worth recording: dropping `summary` from the emitter did **not** break the
round trip, because `lessonToMarkdown` writes the summary as prose under the
title and the parser reads it back from there. The guard was right and the
sabotage was wrong.
