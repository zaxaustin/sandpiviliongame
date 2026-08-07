# One way to carry things, one way to learn them

**Status:** Design, agreed 2026-08-07. Not built.
**Comes from:** the steward, after the first real session of reading a book
with notes open beside it — *"it was magic it made the sand pavilion really be
like whoa this is really helpfull."*

That session produced four asks that turn out to be **one problem seen from four
sides**, plus two that are their own thing. This plan is the one problem.

> *"lock some info to the phone and have a certian book be with notes and
> upload that to the study table… the phone and backpack could be the same in
> this instance at least function wise."*
>
> *"we are gona need a totorial that unlocks these funcitons one by one cause im
> loosing track at this rate lol."*

---

## The finding: there are already TWO carry systems, and they don't know about each other

This was not a guess. Both are in the tree today:

| | `data.inventory` — **the backpack** | `state.readerPocket` — **the pocket** |
|---|---|---|
| holds | many books | **exactly one** book + a page |
| survives a reload | **yes**, it is in the save | **no**, it is UI state |
| filled by | 🎒 *Take with you* in the reader | ↓ *pocket* in the reader |
| read by | `openInventory()`, and nothing else | the Study Table, the book phone, read-aloud |
| in `DATA_MAP` | yes | n/a |

**Two names, two lifetimes, two consumers, and no connection.** The Study Table
accepts only the pocket; the backpack opens a panel that lists books and goes
nowhere else. So "take this with you" and "work on this" are different verbs
that sound identical, and the visitor has to know which button they pressed.

This is not theoretical. Wiring the reader's *"mark the chapters yourself"* door
on 2026-08-07 required calling `minimizeReader()` first — **pocketing a book you
already had open** — because the Study Table cannot see the book the reader is
showing. That is the seam leaking into the interface, and it is very likely
implicated in the four failing checks in `test/live/reader-chapters.mjs`: the
reader reads `state.fullTextView`, the Study Table reads the pocket, and nothing
guarantees they agree.

**The two should become one thing.** The steward's instinct — *"the phone and
backpack could be the same"* — is the correct reading of the code.

---

## What the user actually gets out of it

The steward asked the right question: *"we have to figure out what will the user
use this for and what can they get out of these functions."* Here is the honest
answer, and it is the reason to build it rather than a justification after the
fact.

**The backpack is the answer to one sentence: *"I found this here, I need it
there."*** That sentence is the whole product. It is what an index over your own
work is FOR.

Today the backpack carries **books, and only into the reader**. Every other
"bring this there" in the Pavilion is a bespoke button written once: *bring a
note to today's plan*, *graduate an appraisal into an investigation*, *promote a
note to a lesson*, *send a spark to the desk*. Each is real, each was written by
hand, and **a visitor can only discover them by finding that particular button
in that particular room.**

If the backpack carried *anything* — a book, a note, a chapter, a paper, a
lesson, a packet — then:

- **One verb replaces N buttons.** Pick it up here, put it down there. The rooms
  stop needing to know about each other.
- **"Nothing may be a dead end" becomes a mechanic instead of a review
  checklist.** A thing you can carry is by definition not a dead end.
- **It is discoverable.** A backpack with something in it is visible on the HUD.
  A bespoke button in a panel you have not opened is not.
- **It is the honest shape of the tool underneath the game.** The rooms are the
  skin; an index plus fast ways to act on it is the thing. Carrying *is* the
  fast way to act.

**What it must not become:** a second copy of your work. The backpack holds
**references** — a slug, a note key, a unit — never text. Same rule as the
database: an index over your work, not a duplicate of it to keep safe.

---

## The shape

**One store, `data.carrying`,** replacing `inventory` and absorbing the pocket's
job. Each entry is `{kind, ref, label, since}` where `kind` is one of a **derived**
list (rule 4 — the list of carryable kinds and the list of places that accept
them must not be two hand-written lists that drift).

Three rules, all of which fall out of decisions already made:

1. **A reference, never a copy.** If the thing is deleted, the carried entry
   goes stale loudly — it says so — rather than becoming a ghost copy.
2. **The reader's open book is carried implicitly.** No visitor should have to
   pocket a book they are reading in order to work on it. This is the specific
   bug above, fixed at the root.
3. **Every place that can accept something says so when you are carrying it.**
   Not a new panel — a line that appears where you already are. *"You are
   carrying 2 chapters of A Plain Account — put them on the table?"*

### The book-notes log the steward asked for

> *"for the book notes we should have a book note log section on the computer or
> somtihng."*

The Computer is already a terminal over everything on this machine — `ls`,
`find`, `papers`, `unread`, `analyses`, `open 3`. **It is the right home**, and
it needs no new room: add `notes` and `notes <book>`, listing from
`gatherNotes()` — which as of 2026-08-07 finally returns every note about a
book, not only the ones written inside it. Then `carry 3` puts one in the
backpack, and it can be put down at the Study Table.

That is the whole loop the steward described — *"have a certian book be with
notes and upload that to the study table"* — expressed in the terminal that
already exists, with no new concepts.

---

## The tutorial that unlocks one at a time

> *"im loosing track at this rate lol"*

If the steward is losing track, **nobody else stands a chance**, and this is the
person who built it. That is the clearest possible signal, and it arrives before
a single outside user — which is the good version of receiving it.

**Not a tutorial that gates.** The standing rule is that the gate is on the
claim, never on the learning, and the Library is open at every stage. So:

- **Nothing is locked.** Every room stays reachable.
- **What is staged is what is *pointed at*.** The Pavilion offers **one next
  thing** at a time, and only mentions the next one when the last is done.
- **It is a real use of the thing, not a tour.** "Take a note from a book"
  teaches note-taking by producing a note the visitor keeps. A tour teaches
  nothing and is skipped.
- **It must be skippable and re-openable**, because the steward does not need it
  and a returning visitor should be able to ask "what else is there?"

This is also the honest answer to *"20x there lives"*: a person who cannot
program will not read `MANUAL.md`. The sequence IS the manual.

**It doubles as the audit.** A function with no place in the sequence is a
function nobody will find — which is the Lab's lesson (*built and unreachable is
the same as unbuilt*) turned into something checkable.

---

## Dev mode and user mode

> *"we need some checks and balaances a dev mode for us to aprove things and a
> user mode to send reqwuest to the devs thats way they dont break anything if
> they poke around."*

Real, and cheap, and it should be **built into the same seam that already
exists**, not bolted on.

| | **user mode** (the default) | **dev mode** (the steward) |
|---|---|---|
| destructive actions | become a **request**, written to a file | do the thing |
| unfinished rooms | absent, with a plain line saying so | visible |
| the database home | named, not chosen | switchable, `reconnect()` |
| a request | writes a packet the visitor can send | reads them |

Three things to get right:

1. **User mode is the default and dev mode is opt-in**, because the fallback
   path is always the one that actually runs (the `store.js` scar, verbatim).
   Dev mode is the exception and must be visibly on.
2. **A "request" is a packet.** The Pavilion already has a packet format, a
   provenance rule, and *Tell them what happened*. A request to the devs is that
   same envelope with a different `type` — not a new channel, and **nothing is
   sent by itself**; it writes a file the person chooses to hand over.
3. **It must not become a way to ship half-built things.** "Absent in user mode"
   is a legitimate state; "degraded in user mode" is the thing the house rule
   already forbids. If a feature is not ready, it is absent in both.

---

## Order

The steward set it, and it is the right order:

1. **Notes solid.** Including the two known gaps: hand marks reaching the reader
   (currently failing, `test/live/reader-chapters.mjs`), and the note-page
   grouping (1-based vs 0-based, recorded not guessed).
2. **The backpack unified**, and the Computer's `notes` listing on top of it.
3. **The tutorial**, once there is a stable set of things to sequence. Doing it
   earlier means writing it twice.
4. **Dev/user mode**, which the tutorial needs anyway to know what to offer.
5. **The Science Room.**
6. **Then** the website and connectivity. Not before.

**No beta build until this is a solid foundation** — stated 2026-08-07. beta.5
is built, verified and unpublished, and stays that way.

---

## What would tell us this was wrong

- The backpack becomes a place things get put and forgotten — a junk drawer
  rather than a verb. Watch whether things come back *out*.
- The tutorial reads as a tour. If it can be skipped with nothing lost, it was
  teaching nothing.
- "Carryable" grows into a list nobody can hold in their head, which is the same
  failure the bespoke buttons have, wearing a backpack.
