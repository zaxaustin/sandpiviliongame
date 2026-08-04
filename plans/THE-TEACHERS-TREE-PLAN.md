# The teacher's tree — lesson planning a professional would actually use

**Written 2026-08-03, for review. Nothing here is built.**

From the steward:

> *"My friend is a teacher — I want to make this place a place where he can
> lesson plan for his class, where he teaches English. If he can get help
> making a lesson plan he can potentially publish, and make his own website
> for, is the goal. I want to get the Learning Tree to a spot it can be
> helpful for professionals and helps lay people either follow these pathways
> or make their own when they bring in some required textbooks."*

Two people, and they are not the same person:

| | **the teacher** | **the lay reader** |
|---|---|---|
| brings | a syllabus and a set text he must teach | a textbook he was told to read |
| wants | a lesson plan he can stand up in front of a class with | a path through it he can actually walk |
| finishes with | something **publishable** — a handout, a page, a site | something he understood |

**They meet at one artifact**: a sequence of steps over a real book. The tree
already holds exactly that. What it cannot do is the last mile at either end —
name the book, or leave the building.

---

## What already works, verified rather than assumed

Not a blank page. Reading the code today:

- **Authoring is real.** 🌳 the Learning Tree → **✎ Write a lesson**: title,
  what it's for, a track, a level, steps one per line (a `|` adds a longer
  body to a step), and prerequisites ticked off a list of every other lesson.
  Saved to `data.myLessons`, standing in the tree beside the built-in ones.
- **The AI drafts into that form**, field by field, and **chooses no
  prerequisites** — the structure stays the teacher's.
- **A step can carry a door** (`action:{label,fn}`) — the built-in curriculum
  uses it to open the right panel mid-step.
- **The Tutor already has lesson planning as one of her four jobs**, in her own
  prompt: objectives, a warm-up, core activities, guided then independent
  practice, a check for understanding, homework.
- **A note becomes a lesson without any AI at all** (`plan-to-lesson.js`), and
  as of today the Writing Desk can draft one from the book in front of you.
- **Prerequisites are honest** — an out-of-order lesson is *read in full* and
  simply told where it sits. Only the tick waits.

So *"a place where he can lesson plan"* is closer than it looks. The gaps are
specific and there are five.

---

## The five gaps, measured

### 1 · A lesson cannot name its book — and for a set text that is the whole job

`saveMyLesson()` writes `{title, summary, track, level, steps, prereqs}`. There
is **no field for a book**, and no field for a chapter or a page range. A
teacher planning *Of Mice and Men* week by week has nowhere to put "chapters
3–4"; a lay reader with a required textbook has nowhere to put the textbook.

Everything needed already exists elsewhere: notes carry `{slug, page, chapter}`,
`chapters.js` finds chapters, and today's Writing Desk work proved a note can
open the exact page it was written on. **The lesson node is the one artifact in
the Pavilion that cannot cite a book.**

*The fix is a field and a picker, not an architecture.* A step gains an
optional `reading:{slug, from, to}`, and the step renders "📖 Chapter 3 —
open it" as a real door.

### 2 · A lesson cannot leave the building

`🤝 Publish it` produces a **packet** — a `.json` for another Pavilion. That is
the right thing for the commons and the wrong thing for a classroom. A teacher
needs a **document**: something to print, hand out, email, or paste into a site.

There is no HTML or Markdown export anywhere in the app, and no print
stylesheet. The one save-to-disk path (`desktop-save-file`) hardcodes
`filters: [{name:'JSON', extensions:['json']}]` — so even the plain-text bug
report is offered a JSON filter. That's a small real bug on the way.

*This is the "publish, and make his own website" half of the ask, and it is the
cheapest thing on this list.* A lesson is already structured data; rendering it
as clean Markdown and as one self-contained HTML page is a rendering function
and a save dialog.

### 3 · A published lesson comes back as a *note*, not a lesson

`takePacket()` routes `course` → the Course Board and `paper` → the Hall.
Everything else, **including a lesson**, falls to the `else` branch and lands
in `data.notes` as plain text.

So the collective tree in `LIVING-TREE-AND-DISCUSSION-PLAN.md` cannot actually
grow: hand a colleague a lesson and it arrives as prose he must retype. One
missing branch in one function.

### 4 · Every step is a tick-once — no "for a week", no class period

A teacher's unit is a **session**: forty minutes, a date, a class. A reader's
unit is often **daily for a week**. A step is neither; it is a checkbox.

*Smallest honest version:* an optional `repeat` on a step (`daily × 7`) and an
optional `minutes`. Not a scheduler — the calendar already exists and Sebastian
already keeps it; a step with `minutes` can simply *offer* to become a calendar
block.

### 5 · The tree does not look like a tree

Already written up in `LIVING-TREE-AND-DISCUSSION-PLAN.md` §2 and unchanged:
prerequisites exist in the data and are invisible in the drawing. For a teacher
laying out a term, "what comes after what" **is** the artifact — the picture is
the plan. Drawing the edges is half a day and it is the thing that will make
him believe the tree is a tree.

---

## The build, in order

**1 · A lesson can cite a book.** The field, the picker, and the step door.
Everything else here gets better once a lesson is anchored to a real text, and
without it the other four polish a lesson that is still floating.

**2 · Export a lesson as a document** — Markdown and a single self-contained
HTML page, plus fixing the save dialog's hardcoded JSON filter. This is the
"publish it / make a website" half, and it is small. The HTML page should be
one file with the styles inside it, so dropping it on any host is the whole
deployment.

**3 · A packet of a lesson comes back as a lesson.** One branch in
`takePacket()`. Unblocks the collective tree.

**4 · Draw the edges** (`LIVING-TREE-AND-DISCUSSION-PLAN.md` §2 step 1).

**5 · `repeat` and `minutes` on a step**, and one button that offers the
calendar. Last, because it is the one a teacher can live without.

**Not in this**: the depth layout and neighbourhood rendering (§2 steps 2–3 —
they matter at a hundred lessons, not at ten); the shared board (still needs a
second person and a server); a general graph editor (deliberately never).

---

## The thing worth getting right, and it is not a feature

A teacher will judge this in **one sitting** — he will try to plan one real
lesson for one real class, and if the form fights him he will not come back.
So the acceptance test is not a checklist:

> **Plan a real English lesson on a real set text, end to end, and hand the
> result to the teacher himself.** Not a demo. A lesson he could teach on
> Monday.

Everything above should be judged by whether it survived that. If the export
is ugly on the page, it failed. If naming the book took four clicks, it failed.

## What would tell us it did not work

- He plans the first one and never opens it again — the form asked for more
  than it gave back.
- He exports once and then edits the file by hand afterwards, every time —
  the export is a starting point, not a document, and should say so.
- The tree stays a list of his own lessons with no prerequisites — which would
  mean the ladder is our idea and not his, and the tree should get out of the
  way of people who just want good handouts.

## And the honest limit

The **website** is his, not ours. The right scope here is a clean file he owns
— an `.html` he can drop anywhere, and `.md` he can paste into anything.
Building hosting, or a publish-to-web button, would put this project in the
business of running a server for someone else's classroom, which is the exact
thing `SELF-HOSTED-STACK-PLAN.md` says to do only when there is genuinely
someone on the other end.
