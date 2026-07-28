# Common vs private — the distinction, and where sharing happens

Written **2026-07-27**, at direct request, and built the same day. The user's
framing:

> "To really get this off the ground I want to be able to differentiate between
> common data and what's private data. What is the area where we can share our
> work and our plans — perhaps besides an inheritance I want to do a paper or a
> lesson plan; where can I find the community written ones and what's my private
> notes? Once people get a feel for common and private and we make that
> distinction I think we will be almost ready for other people to use it."

That last sentence is the point of this document: this isn't a feature, it's the
**precondition for handing the Pavilion to anyone else.** A person will not put
real work into a place whose boundaries they can't see.

---

## What was actually true before this (read from the code, not assumed)

- **One surface made the distinction visible:** the Library's certified shelves
  (license + source + attribution on every text) versus **Your Shelf** 👤. The
  **Steward Review Queue** was the real gate between them, and the Archive Desk
  already had "📤 Submit for Library review."
- **Two surfaces were genuinely shared but needed a server:** the Café's Notice Board
  and Residents' Board (`exchange.js`, `agentNotes.js`, Supabase). With the
  standing direction being *off* Supabase, those are dormant for anyone else —
  so in practice the Pavilion had no working commons at all.
- **Everything else was private with no path out.** Notes, book notes, chat
  notes, the planner, calendar, Paths, the Log, courses, Learning Tree progress,
  **investigations, self-experiments and kept paper analyses**, Eightfold
  reflections, Research Desk projects, Grant Desk projects. Exactly the two
  things the user named — **a paper and a lesson plan** — could not leave.
- **Nothing on screen said any of this.** A visitor had no way to know.

---

## The model: three states, one vocabulary

Defined once in [`src/game/data/visibility.js`](../src/game/data/visibility.js)
and used by every panel, so the words never drift:

| | | |
|---|---|---|
| 👤 **Yours** | private to this machine, in your save | nothing sends it anywhere, ever, unless you personally do |
| 🤝 **Shared by you** | you wrote it out as a packet and gave it away | your original stays yours |
| 🏛 **Commons** | written by someone else, or shipped with the Pavilion | carries an author, a license, a source — like any shelved text |

**The load-bearing rule underneath all three: nothing moves by itself.** No
sync, no upload, no background anything. Work becomes commons because a person
deliberately wrote a file and handed it over. That is what lets this work with
**no account and no server**, which is what makes it survivable under the
standing local-first / off-Supabase direction.

---

## Where sharing happens

**The Commons Table — the Café** (chosen by the user over the Round Table, a new
building, or the Inheritance Hall). The Café is already the room that looks
outward. Four tabs:

- **🏛 The commons** — papers, lesson plans and courses people wrote and handed
  on. Three ship with the build (honestly attributed to *The Pavilion*, not to
  invented people — there are no fake community members here). Taking one drops
  a copy into the private place that kind of thing already lives: a paper into
  the Science Hall, a lesson into Your Notes, a course onto the Course Board.
  Your copy is then yours; editing it never touches the original.
- **🤝 Shared by you** — what you've published, and where you write the file.
- **📤 Publish something** — lists your own papers, courses and notes; one click
  turns a piece into a **packet**. The original stays private.
- **👤 What stays private** — the plain list, with the full accounting one click
  away in Your Data.

**The Inheritance Hall** stays the *other* kind of sharing, and the distinction
is worth keeping: a **bequest** is a gift left for a person to find; a **packet**
is work published for anyone to use. Same mechanics (a file, no server), different
intent.

**A packet** is one `.json`: `{sandPavilionPacket, kind, title, by, license,
created, summary, body|steps}`. Nothing else from the save travels — verified.

---

## What "everywhere at once" meant (the user's choice)

The vocabulary was retrofitted rather than introduced in one room:

- Every private surface now carries the 👤 badge in its own heading — Your
  Notes, the Course Board, the Archive Desk, the Research Desk, the Science &
  Research Hall, Paths, the Inheritance Hall's Record Stone.
- The three the user named (notes, lesson plans, papers) also carry a **🤝 share
  one** door straight to the Commons Table, so the distinction has an exit, not
  just a label.
- **Your Data** now renders `DATA_MAP` — every store in the save, its state, and
  one plain sentence on whether it can ever leave this machine. That list is the
  real answer to "what's my private notes," and it is kept honest by being
  generated from a table that has to be updated when a store is added.

---

## Open, and worth doing before strangers arrive

1. ~~**A store added without a `DATA_MAP` entry is invisible.**~~ **Closed the
   same day** — `npm test` now reads `freshData()`'s top-level keys straight out
   of `entities.js` and fails if any of them has no `DATA_MAP` entry. Proved it
   catches real drift by removing an entry and watching it fail. A promise to a
   visitor about their own data deserves a test, not a good intention.
2. **Paths and the Log can't be published.** Named honestly in the map ("never
   yet — publishing a Path is not built") rather than quietly omitted. Decide
   whether a Path *should* be shareable; it may be the most personal thing here.
3. **The two Supabase boards sit in the same room as the working table.** The
   panel says so plainly, which is honest but not permanent. When the café
   boards are rebuilt file-first (or dropped), that paragraph goes.
4. **No provenance filter on packets yet.** A bequest filters what may travel by
   license, because it carries *books*. A packet carries *your own writing*, so
   there's nothing to filter — but the moment a packet can embed a quoted text,
   it needs the Hall's filter. Don't add that embedding without adding the filter.
5. **Federation** — the far end of this: today a packet reaches someone because
   you handed it over. A shared table across two Pavilions is the same question
   as the Commons in `SELF-HOSTED-STACK-PLAN.md` Phase 3, and stays deferred
   until there is genuinely a second person to serve.

**One line to hold onto:** the Library always knew the difference between what it
holds in common and what is yours — this puts that same distinction on everything
else, and gives the private half a door.
