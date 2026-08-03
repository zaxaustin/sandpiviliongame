# The Study Chain — book → notes → plan → a path you are walking

**Status: all four stages BUILT 2026-08-03,** the same day this was written.
Guarded by `test/live/study-chain.mjs` (33 checks) and the `plan-to-lesson.js`
cases in `npm test`. It stays here rather than in `plans/done/` for one reason:
it is built and **unproven by real use**, and the seams between rooms are
exactly where this project's bugs have always lived. Walk it with a real book
first; move it to `done/` when it has survived that.

Written 2026-08-03, from real use. The steward's own words:

> "one of the things i wana be able to do in the lab is to disect a book, i
> was able to take a look at a book but it wasent really streamlined, if i
> wana take notes on a book with ai and then save them for later that would
> be great. i tried making a lesson plan and that worked to with some
> fenagling but its hard to link those to an active learning tree where i
> have other task and things i wana learn there — i want to be able to go to
> the tree and pick up a learning path. that way we have some streamlining
> and usefulness in the sand pavilion."

---

## The diagnosis, which is one fault and not four

Everything in this Pavilion **produces** something. Almost nothing that gets
produced can become the **input** to the next thing. The chain the steward
described already exists in pieces, and it breaks at two exact joints:

| link | today |
|---|---|
| a book → notes on it | **works.** `data.bookNotes[slug]`, per page, AI or your own |
| notes → a lesson plan | **works.** `draftLessonPlanFromNote` / `…FromLesson` |
| a lesson plan → a lesson in the tree | **nothing.** The plan is plain text in a note, forever |
| a lesson in the tree → something you are actually walking | **nothing.** There is no "the one I'm on" |

Both breaks have the same shape: **a thing was made and there was nowhere for
it to go.** The AI writes you a genuine, sequenced study plan and it dies in a
notes list. The tree holds lessons you can tick, but nothing in the Pavilion
knows which one you *picked up* — so Today can't offer it, the menu can't name
it, and the tree can't put it at the top where you'd find it again.

That is why it took "some finagling." Not a missing feature — **a missing
join.**

The same fault, once more, in the Lab: reading a book produces notes; the Hall
produces dissections; neither knows the other exists. You can pull a *pasted
paper* apart with the Investigator, but a book on your own shelf — the thing
you actually read — has no way to become an analysis you keep.

## The rule this plan is built on

**Every artifact gets exactly one door out, and that door leads to the next
artifact.** Not a menu of possibilities. One button that says what it makes.

And the corollary, because this project has been bitten by the opposite:
**join what exists, do not add a parallel store.** A book dissection is a
`data.hall.dissections` entry that happens to know its book — not a new
`data.studies`. A picked-up lesson is one field, not a new tracking system.
Six note stores is already the ceiling; the Notes hub gathers them and that is
the design, but nothing new joins that list.

---

## Stage 1 — The bridge: a lesson plan becomes a real path in the tree

**The single highest-value fix in this document.** It is the joint that the
steward hit head-on, and it is small.

- New pure module `src/game/data/plan-to-lesson.js`, so `npm test` can hold it:
  `planToLesson(text, title)` → `{title, summary, steps:[{title, body}]}`.
  It parses what a local model *actually* writes for a study plan — "Session
  1 (30 min): …", "Week 2 — …", "Day 3.", numbered lists, bare paragraphs —
  the same discipline as `draft-parse.js`, which exists because a 9B model
  does not obey a format and pretending otherwise produced "steps: 1 lines."
- Anywhere a lesson-plan note lives (the note editor, and the moment after
  drafting), one button: **🌳 Put this in the tree.**
- It creates a real `mine:true` node — the same shape `saveMyLesson` writes,
  standing in the tree beside the built-in lessons, with real prerequisites
  available to it. The note is linked to it, so the prose survives.
- It lands you in the tree, on the new lesson, so the result is visible rather
  than announced.

**Done when:** a plan drafted from a note is a walkable lesson with ticks,
without retyping a word of it.

## Stage 2 — Pick up a path (the tree gets a "you are here")

`data.study = { id, since }`. One field. The lesson you are currently walking.

- Lesson detail: **🧭 Pick this up** → *✓ You're walking this* → *Put it down*.
- Tree list: the picked-up lesson pinned at the top, under its own heading,
  showing the next unticked step — so "go to the tree and pick up a learning
  path" is literally what the screen offers.
- ☀ Today: `theDayItems` rule 2 already surfaces "the next step of something
  already begun," but only *passively*, and only once you have ticked one step.
  It should **prefer the picked-up lesson** — that is the difference between
  a guess and an intention. `the-day.js` takes `ctx.study`; still pure, still
  tested.
- The pause menu's 🌳 entry names it, the way ☀ Today already names its line.

**Why one field and not a system:** you walk one path at a time or you walk
none. A list of "active" lessons is a second to-do list, and the Pavilion's
standing rule is that a list of everything outstanding is a guilt inventory.

**Done when:** you pick something up in the tree, close the app, come back
tomorrow, and ☀ Today's first non-urgent line is the next step of it.

## Stage 3 — Dissect a book (the Lab's real ask)

A **dissection gains a book.** Not a new store: `data.hall.dissections[]`
entries grow two optional fields —

```
{ id, ts, title, text,            // unchanged: the pasted-paper case
  book: 'slug',                   // NEW, optional — which book this is of
  passes: [{ts, lens, where, text}] }   // NEW, optional — built up over time
```

A pasted paper stays exactly what it is today: one shot, no book, no passes.
Nothing about that case changes, because it works.

A **book dissection** is the multi-pass case:

- Started from the reader — one button, **🔬 Dissect this book** — because
  that is where you are when you want it.
- It holds **your question first** ("what am I actually after here?"), written
  by you, before any model runs. Same discipline as the Bench: the ask before
  the answer.
- Then you add **passes**, one at a time, each with a *lens* and grounded in
  *where you actually are in the book* (this page, this chapter, the summary):
  - **What is it claiming?** — the argument, stated plainly
  - **What's it resting on?** — assumptions and evidence
  - **Where's it weak?** — the honest reservation
  - **What do I do with it?** — the practical residue
- **Pull in my notes** — your own typed notes on that book, appended as a pass,
  no AI. Works with nothing installed, which is the floor every AI feature in
  this project has to clear.
- It is **kept**, it is **revisitable**, and it already has a home: the Lab
  counts it under "Kept analyses" and the Hall lists it. Nothing new to find.
- `investigationFromDissect()` already exists — a book dissection can become a
  filed investigation the same as a paper one, for free.

**Done when:** you can read a chapter, pull it apart in four passes over two
evenings, close the app, and open the thing you built.

## Stage 4 — The reader's buttons

The reader is the long overlay, and it is the one the steward was in. Thirteen
flat identical buttons in full-text view, in one undifferentiated row, in
whatever order they were added over four months.

Regroup into three labelled rows that answer three different questions:

- **Listen** — read aloud, pause, ⏪10s, 10s⏩
- **Move** — prev/next page, chapters, 10% jumps, go to page
- **Work with it** — 🔬 Dissect · 🗒 Notes · 💬 Ask Sebastian · ✨ AI tools

No button is removed and nothing is hidden behind a menu — the standing rule
here is that a feature you cannot see is a feature you do not have. This is
grouping and labelling only.

---

## What this is *for*, since that was the actual question

> "i want to be able to make a plan to have all these things be usefull and
> serve there goals and reason there there."

Each room's reason, stated so a future session can check a change against it:

- **The Library** is where you *meet* material.
- **The Reader** is where you *work through* one piece of it.
- **The Lab** is where material becomes something of your own — a dissection,
  a build, an investigation. The Lab owns nothing; it gathers.
- **The Tree** is where what you learned becomes something *walkable*, by you
  or by whoever you hand it to.
- **Today** is the only surface that is allowed to *ask something of you*, and
  it asks for one thing.

The chain runs **Library → Reader → Lab → Tree → Today**, and every stage above
is one missing link in it. When all four are built, a book you dragged onto the
window on Monday can be a path you are walking on Friday, without you having
retyped anything or remembered where anything lives.

## Not in this plan, deliberately

- **No new note store.** Six is the ceiling; the hub gathers those six.
- **No second "active" list.** One path at a time.
- **No AI requirement anywhere.** Every stage has a path that works with no
  model connected — typing your own steps, pulling your own notes in, ticking
  your own boxes. The AI removes typing; it is never the door.
- **Splitting `overlays.js`.** Still by room, one at a time, while already
  working in that room. Not here.
