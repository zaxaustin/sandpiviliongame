# The Writing Desk — from a day planner to the place you actually work

**Written 2026-08-03 for review. APPROVED AND BUILT the same day — all four
steps.** The steward's approval, and it sharpens what the residents are for:

> *"these personalities are good and they add a feel of realism but their real
> purpose should be agents without a doubt. Their roles are specific… we can
> have them work one at a time, the pace doesn't have to be fast, just good
> work should be done — it should feel like we are contributing to the greater
> knowledge pool of humanity."*

What was built, and where it lives:

| step | state | code |
|---|---|---|
| 1 · the picker | **built** | `deskResidents()` / `setDeskAgent()` / `deskSystemPrompt()` in `ui/overlays.js` |
| 2 · older notes | **built** | `renderNotesBody()`, sharing `forgottenNotes()` in `data/the-day.js` |
| 3 · the pocketed book | **built** | `deskBook()` / `renderDeskBookBody()` / `writeBookNote()` |
| 4 · the lesson draft | **built** | `deskDraftLesson()` → a note → `lessonFromPlanNote()` |

Verified in `test/live/writing-desk.mjs` (48 checks, against a **player-added**
book, including real exchanges with the local model). Four things were found
by deliberately breaking the guards and one by taking a screenshot and looking
at it — all recorded in `archive/dev-log-2026-08-03.txt`.

The original plan follows, unchanged.

---

From the steward:

> *"fix the writing desk to look at older notes, take notes on a book or paper
> in front of you, or to have the AI make a full lesson plan in notes first
> before its ready for the wall. The writing desk should also be a place with
> AI interaction — put a menu so you could pick which one to speak to. That way
> there one at a time and there purposes act like agents helping you."*

---

## What the desk is now, and why it does not match

The Writing Desk today is a **day planner**: an intention, an ember, time
blocks, and sparks. It has one AI panel, and that panel is **hardcoded to the
Steward** — `renderPlannerAssistBody()` offers three prompts about planning a
day and nothing else.

Everything else the steward describes — your notes, the book you are reading,
a lesson being drafted — happens somewhere else entirely, in a different room,
against a different panel.

**So the desk is a form you fill in, when what he is describing is a desk you
sit down at.** Those are different things. A desk has your work on it.

**This is `CLAUDE.md`'s IDE framing landing on one room.** If the Pavilion is a
non-code IDE, the Writing Desk is the **editor pane**: the open document, the
references beside it, and a tool you chose. It is the one room where all three
should be true at once.

---

## 1 · Pick who you are working with — the part that makes them agents

The steward's own reasoning, and it is the sharpest thing in the request:

> *"that way there one at a time and there purposes act like agents helping
> you."*

**One at a time is the design, not a limitation.** A desk with six residents
shouting is a group chat; a desk where you deliberately called *one* over is an
assistant. That is also the difference between a personality and an agent — an
agent is chosen **for a purpose**.

A small picker at the desk, and the roster already exists to build it from —
`data/roles.js` carries `label`, `title`, `duty` and `where` for all seven, and
`rosterForVisitor()` already returns exactly that table. **The picker should be
generated from it, never hand-listed**, because a hand-maintained list that
must match another file has drifted three times in this repo.

**Who is worth having at a desk, and for what:**

| resident | why you would call them over |
|---|---|
| **the Steward** | the day itself — the current behaviour, kept as the default |
| **the Tutor** | *"I do not understand this"* — the micro half |
| **Quill** | *"what do I have on this"* — the macro half |
| **Sebastian** | *"what is actually due"* |
| **the Investigator** | *"is this claim true"* |
| **the Monk** | *"what is this for"* |

`state.plannerChat` already exists and already keeps its own history; it needs
an `agent` field and to route through the same `CHAT_AGENTS[key].systemPrompt()`
every other resident uses. **No new AI plumbing** — the desk is currently the
odd one out for having its own.

## 2 · Your older notes, at the desk

Today the desk shows only today. `gatherNotes()` already unions every note
store and `sortNotes()` already offers four orders; the desk needs a panel that
shows the **recent** and the **resurfaceable**.

`data/the-day.js` already computes *"a note written 27 days ago and never
reopened"* — a genuinely good signal that currently only ☀ Today uses. At a
desk, where you are sitting down to work, it is more useful still.

**Deliberately a reader, not a second editor.** One place notes are written
(the note, wherever it lives) and one place they are gathered (Your Notes). The
desk *shows* them and opens them; it must not become a third store.

## 3 · The book in front of you

The mechanism already exists and is not used here: **`state.readerPocket`** — a
book you pocketed and walked off with. That *is* "the book in front of you", and
the desk should show it: title, chapter, page, and a note box that writes
straight to `data.bookNotes[slug]` with the chapter and page attached, exactly
as the reader does.

**What that closes:** you can already take a note *in* the reader, and you can
already plan *at* the desk. What you cannot do is sit at the desk with the book
open and write about it — which is what a person actually does when studying.

Papers and datasheets come along free: they are the same shelf entries with a
`kind`.

## 4 · A lesson plan drafted in notes, before it goes on the wall

The steward's sequencing, and it is the right instinct:

> *"have the AI make a full lesson plan in notes first before its ready for the
> wall."*

The pieces all exist and are already wired in the right order:

- `draftLessonFromNote()` writes a plan **into a note** — a draft you can read
  and edit before it is anything;
- `data/plan-to-lesson.js` turns that note into a real lesson node;
- `lessonFromPlanNote()` puts it in the tree.

**What is missing is that this is invisible from the desk**, which is where you
would be doing it. It is not a new feature; it is the same chain, surfaced in
the room where the work happens — draft, read it, edit it, *then* press
**🌳 Put this in the tree**.

**The rule that must survive:** the model drafts, the person promotes. Nothing
reaches the wall without a press. That is the same "a suggestion is not a
decision" line the sorter's review step exists to keep true.

---

## What this reuses rather than builds

Almost all of it, which is the argument for doing it:

`rosterForVisitor()` · `CHAT_AGENTS[*].systemPrompt()` · `state.plannerChat` ·
`gatherNotes()` / `sortNotes()` · `theDayItems()`'s resurfacing rule ·
`state.readerPocket` · `addBookNote()` · `draftLessonFromNote()` ·
`plan-to-lesson.js` · `lessonFromPlanNote()`

**New:** a picker, a notes panel, a pocket panel, and the desk's chat routed
through the shared stack instead of its own.

## Order, if approved

1. **The picker** — the smallest change with the largest effect, and it makes
   the desk's existing chat stop being a special case.
2. **The pocketed book, with its note box** — closes the study loop.
3. **Older notes** — the reading half.
4. **The lesson draft, surfaced** — last, because it depends on 2 and 3 being
   there to draft *from*.

## What would tell us it worked

Not a test suite. **A week of the steward actually planning at it.** The
question is whether he stops going to four rooms to do one piece of work — and
if after that week he still opens the Library, the notes hub and the Academy
separately, the desk has not earned the reframe and should go back to being a
good day planner.

## Verification, when built

- **Against a player-added book**, per `CLAUDE.md`'s standing rule — the
  pocket, the note, the chapter and page it records.
- **The picker derives from `roles.js`** — add a resident there and it must
  appear at the desk with no second edit. `npm test` should assert that.
- **Every resident answers at the desk** the way they answer in their own room:
  same prompt, same lane, same handoffs. The resident bench
  (`tools/resident-bench.mjs`) already runs those questions.
- **Nothing reaches the tree without a press**, and a drafted lesson can be
  edited between the draft and the promotion.
