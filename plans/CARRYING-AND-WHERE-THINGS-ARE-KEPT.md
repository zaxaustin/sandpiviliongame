# Carrying, and where things are kept

**Status:** Plan. Agreed 2026-08-07. Nothing here is built.
**Replaces the carry sections of:** `plans/THE-BACKPACK-AND-THE-TUTORIAL.md`
(that document's tutorial and dev-mode parts still stand; its dev-mode framing
is superseded by `THE-TUTORIAL-AND-SIGNING-IN.md`)

> *"this part is a bit of a whall perhaps we should make a more solid plan on
> how to takle it."*

It is a wall, and the reason is worth naming before any of it is built: **four
separate features all turn out to be the same missing verb.** The Study Table
cannot see the reader's book. The Records Hall, the Computer and the Notes Log
each answer a different question and nobody has said which is which. The
backpack holds books and nothing else. And there is no way to hand a thing from
one room to another except by a button someone wrote for that exact pair.

So this plan does the verb first, then says where things live, and only then
adds features on top.

---

## 0 · The principle everything below follows from

> *"we want the sand pavilion to be there for the user not do everything they
> can automatically."*

**Carrying is manual, and that is the feature, not a limitation.**

This is not a new rule — it is the one already written into `the-day.js`, where
a path you picked up beats any path inferred from progress, because *"progress
is a guess at what you care about; picking one up is you saying so, and a stated
intention must not be outranked by a heuristic."* The backpack is that sentence
made into an object.

Concretely, this settles a design question that would otherwise be argued four
times:

- The Study Table does **not** helpfully load the book you were just reading.
  **You put it on the table.**
- It does **not** pull in every note about that book. **You bring the notes.**
- Nothing arrives on a surface because the program guessed you wanted it there.

**What the Pavilion owes you in exchange is that the manual act is one press
and always visible.** Manual must never mean tedious. If carrying takes three
clicks and a panel, the principle has been used as an excuse.

---

## 1 · The verb

**`data.carrying`** — a list of `{kind, ref, label, since}`. **References, never
copies.** ~20 slots, glanceable; a shelf beside it for what you set down.

`kind` is one of a **derived** list. The list of carryable kinds and the list of
places that accept each kind must not be two hand-written lists — that is rule
4's exact shape, and it is how `hideAllOv()`, the window exports and the
resident roster each drifted.

| kind | ref is | picked up at | put down at |
|---|---|---|---|
| `book` | slug | Library, reader, Computer | Study Table, reader, a Mission shelf |
| `note` | note key | Notes Log, Computer, reader | Study Table, Writing Desk, a lesson |
| `chapter` | slug + unit | Study Table, reader | Writing Desk, a lesson |
| `lesson` | id | Course Board, tree | Today, a Mission |
| `paper` | slug | Library, Science Hall | the Bench, an investigation |

### What replaces `state.readerPocket`

The pocket is deleted. **The book you have open in the reader is carried
implicitly** — no visitor should have to pocket a book they are looking at in
order to work on it, and that requirement is the seam leaking into the
interface. The pocket's real jobs (read-aloud continuing while you walk, the
book phone) become properties of *the carried book that is currently playing*,
which is a different and smaller idea.

### The Study Table, specifically

> *"mabie we can make it so the notes of the book can be loaded there through
> the back pack or somthing so the user has to do it, and the book can be
> broung out and references in the same way or one after another."*

The table has a **tray**: what you have put on it. You put down a book; the unit
navigation appears. You put down notes; they sit beside the unit they belong to.
You can put down a second book and reference them one after another — which is
the thing the table cannot do at all today, and the reason "work through a book"
is currently *one* book forever.

**And the table must name what is on it.** Found 2026-08-07 by a live test: the
Study Table's heading is the generic *"Work through a book, one story at a
time"*, so arriving there from the reader's door, nothing on screen says which
book is on the table. A tray fixes this by existing.

---

## 2 · Where things are kept — three rooms, three questions

Asked directly:

> *"we need a way to see the logs of everything but mabie the stury table is
> not the place the records hall might be an option if your searching for
> somthing or the compurter mabie."*

Right on both counts, and the split falls out cleanly once the question each
room answers is written down:

| room | the question | ordered by |
|---|---|---|
| **Records Hall** | *what have I done?* | **time** — newest first |
| **The Computer** | *what do I have?* | **set** — filtered, searched, listed |
| **Study Table** | *what is in front of me right now?* | **one thing** |

**The Study Table is not a log and must not become one.** It is the workbench.
A workbench that also lists your history is a workbench you cannot see.

**The Records Hall is already the log**, and it was built for exactly this three
days ago: it walks your save, lists what you did newest-first, every entry is a
door, and it holds `hidden` because which of your history you want to see is
your own choice. What it is missing is **search and filter** — which is what
makes it the answer to *"a way to see the logs of everything"* rather than a
nice page you visit once.

**The Computer is the index**, and it already has the right shape — `ls`,
`find`, `papers`, `unread`, `analyses`, `open 3`. It gains `notes`,
`notes <book>`, and `carry N`. That last one is the whole point: **the Computer
becomes the fastest way to fill the backpack**, because typing is faster than
walking, and *one keystroke to anywhere beats a beautiful room you must walk to*.

That gives the loop the steward described, end to end, with no new room:

```
  Computer:  notes dhammapada  →  carry 3
  walk to the Study Table       →  put it down
```

---

## 3 · Password boxes in the Inheritance Hall

> *"we should make ways for people to make password boxes and leave stuff in
> there untill you get the password, a fun feature to the inhertiance hall."*

A good fit — the Hall is already about leaving things for people who come after
you, and a locked box is the honest shape of *"this is for you, when you are
ready"*.

**One decision has to be made before it is built, and it decides whether the
feature is real.**

- **A game lock** — the box checks a stored password and reveals the contents.
  Anyone who opens the save file reads everything. That is fine for a
  *ceremony* — "don't spoil this for yourself" — and it must then SAY so.
- **A real lock** — the contents are encrypted with a key derived from the
  passphrase, and without it there is nothing to read. `crypto.subtle` is in
  every browser and in Electron: PBKDF2 to derive, AES-GCM to seal. **No third
  party, no dependency** — which is exactly the "build it ourselves" standing
  decision, and it is perhaps forty lines.

**Recommendation: the real one.** The cost is small, and the alternative is a
box that says "locked" and isn't — which is the one thing this project refuses
everywhere else. A packet handed to someone else is the whole point of the
Hall, and a packet that travels is precisely where a fake lock stops being
harmless.

**Two things it must say out loud**, because they are the parts people get
wrong: **a forgotten passphrase means the contents are gone** — there is no
recovery and there is nobody to ask — and the box's *existence*, its title and
who it is for are visible; only the contents are sealed. Both belong on the
screen where the box is made, not in a manual.

---

## 4 · Sign-in moves

> *"we can add the sign in to the website and server plan to do after that."*

Agreed, and it resolves the wrinkle rather than deferring it. The local profile
(a game name, optionally a password) stays a small Settings feature. **Anything
involving verification, identity across machines, or an inbox that receives from
other people belongs to `PRIVACY-AND-WEBSITE-PATHWAY-PLAN.md` and
`COMMONS-SERVER-TIGHTENING.md`**, where the public-key design already does that
job without a user database. Noted in `THE-TUTORIAL-AND-SIGNING-IN.md`.

---

## 5 · Order, and the honest warning

> *"redoing the backend to be proper is gona cause some issues but lets make
> sure we build up that solid foundation now so we dont run into these isuuses
> when we make something even more comlecated lol."*

Correct, and the evidence is already in the log: today's four "hand marks never
reach the reader" failures were a one-page test fixture, and the day before that
the Records Hall silently wrote nothing for a week because a JS array is not a
Postgres array. **Both were found only because something was being rebuilt
carefully.** That is the argument for doing it now.

1. **`data.carrying`, and the pocket deleted.** The riskiest step, because the
   pocket has four consumers (Study Table, book phone, read-aloud, the reader's
   own minimize). Do it alone, with the live suites green before and after.
2. **The Study Table's tray**, which is the first thing that pays for step 1 —
   and which names the book, closing today's finding.
3. **The Computer's `notes` and `carry`.**
4. **Search and filter in the Records Hall.**
5. Password boxes.
6. The tutorial, which cannot be written until 1–4 have settled, or it gets
   written twice.

**Before step 1**, the guard that is owed: every save key must appear in **both**
`freshData()` and `visibility.js`'s `DATA_MAP`. `bookMarks` and `study` are both
missing one right now, and `carrying` will be a new key on day one of this plan.
Writing that guard first means the plan cannot repeat the mistake it just found.

---

## What would tell us this was wrong

- Carrying gets used once and then everyone goes back to the bespoke buttons.
  The buttons are the control group; watch whether they get used *less*.
- The backpack fills and never empties. Things must come back *out*.
- "Manual" turns into "tedious" — if putting a book on the table takes more than
  one press from where you already are, the principle is being used as an
  excuse for a missing shortcut.
