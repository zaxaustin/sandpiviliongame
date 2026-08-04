# The Study Table — working through a book one story at a time

**Written 2026-08-04. Stage 1a is BUILT; 1b and 1c are the current work.**

From the steward, and it is the clearest description of a real workflow this
project has been given:

> *"where can i go to have the book along side me to go over the stories there
> and make a plan to digest these teachings one by one and have notes of it
> grow and be ready to be put into my own book of personal notes alongside this
> text… an ai chat window there so i can say i wana make a small lesson on this
> story help me break it down and the lessons we can gain from it. i can then
> add my own thoughts, the ai would have a chance to respond or edit what i
> wrote to make it better, then with all these notes i would like to draft a
> lesson plan slowly and with guidlnes."*

Two audiences: **him**, working through the Long Discourses; **his teacher
friend**, who needs the same loop to end in something he can stand up and teach.

## The seven decisions he made, which shape all of it

1. **Expand the Writing Desk, don't replace it** — the Study Table is a toolbox
   toggle beside the others; the desk's existing panels stay as they are.
2. **Specialise a resident** — the Steward, whose duty in `roles.js` already
   reads *"pre-notes on a book before you read it, gathering and shaping raw
   material."*
3. **Locking a feature behind Docker is allowed, and is a feature** — *"we can
   encourage that by locking out features that are hindering us… but doing as
   much as we can without a database should be good."*
4. **Break up `overlays.js`** — this panel is the pilot, and ships outside it.
5. **The Course Board should feel like a website**; the Learning Tree like a
   **visual tree or a game talent menu**.
6. **The unit is what he labels himself, page by page where needed.**
7. **Notes versioned like git** — `original`, `ai-cleanup`, his own tags.

---

## Stage 1a · The unit, and labelling it — **BUILT 2026-08-04**

`src/game/data/marks.js` (pure) + `src/game/ui/study-table.js`.

**Measured before building: 18 of the 39 books on this machine find NO
chapters.** So page-by-page is the majority case, not a fallback — a workroom
built on detected chapters would refuse to open for nearly half the shelf.

- `mergeMarks(detected, hand, pageCount)` — **hand outranks detection**, as
  `tools/schema.sql` has said since the chapters table went in and nothing ever
  wrote to it. An empty hand label keeps the detected words: the person marked
  the place, not the name.
- `unitsFor(pageCount, marks)` — units cover **every** page. With no marks it
  returns page-sized units. Pages before the first mark become *"The opening"*
  rather than falling out of the book.
- The panel moves `◀ ▶` through stories, says where the division came from
  ("you named this one" / "found in the text" / "no divisions found yet — mark
  them as you read"), shows the text, and keeps notes per story.

Verified in `test/live/study-table.mjs` on `advice-to-sigalaka.txt` — a real
discourse **from** the Long Discourses, imported by hand, and one of the books
that finds no chapters. 22 checks, no AI needed.

## Stage 1b · The chat, grounded in THIS story — **the current work**

The desk's resident picker exists and is grounded in the day and the book. It
is **not** grounded in the story in front of him, which is the whole ask.

- A picker on the table, **defaulting to the Steward**, marked in `roles.js`
  with `studio: true` the way Sebastian carries `hub: true` — derived, never
  hand-listed, and `npm test` asserts exactly one.
- **One at a time, one thread each**, the same rule the desk already follows.
- Grounded in the **current unit's actual text**, bounded and declared an
  excerpt, plus your own notes on that story.
- Quick starts include the two he typed: *"help me break this story down"*,
  *"what can we take from it"*.
- **`✎ Keep this`** on any reply writes a book note on this unit through the
  Reader's own `writeBookNote()` — same shape, same page, same four doors.

## Stage 1c · Versioned notes — "it should feel like git"

```
data.bookNotes[slug][i] = {
  ts, text, page, ch, chLabel,       // `text` stays the CURRENT version
  versions: [ {text, tag:'original',   ts},
              {text, tag:'ai-cleanup', ts, by:'steward'} ]
}
```

`text` remains the latest, so `gatherNotes()`, the four doors, the desk and
export keep working untouched. A note with no `versions` is a single
`original` — an absent field, not a migration. **Restore appends rather than
deleting forward**, git's own instinct, which makes it unlosable.

**The invariant, with a test broken on purpose:** no path ever replaces the
text of an existing version.

## Stage 1d · Named, not built

Lesson drafting from the accumulated notes; the **lecture** script; **slides**
(one self-contained HTML deck, same family as `lessonToHTML()`, no third-party
library); and **his own book of notes** compiled from `data.bookNotes[slug]`.

---

## What needs the database, and how it locks

Almost none of this. Labels, versions, notes and the chat all live in the save
and work with nothing installed — which is what his teacher friend will have.

| needs Postgres | why |
|---|---|
| search every note you have written | `notes_fts`, migration 002 |
| "everything I wrote about this chapter, across all books" | `v_notes_by_book` |

Those appear **greyed with one line and one command** — never missing, never
half-working. The lock is an invitation to set the stack up, which is his own
argument for it.

## Verification

- **On the Long Discourses, in his save.** His reason: *"the majority of
  people's work will be with the books they import."*
- **A book with no detected chapters** — page by page, labelling from nothing.
- **Every suite with the container stopped** — his friend's machine.
- **Break each guard deliberately**; screenshot the panel and read it.

## What would tell us this is wrong

- He labels three stories and stops — labelling is a chore, not commentary.
- The versions pile up unread — "like git" was the wrong metaphor.
- The desk becomes the everything-panel it was just rescued from being.
