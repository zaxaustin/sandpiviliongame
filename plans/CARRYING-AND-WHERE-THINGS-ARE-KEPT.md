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
> when we make something even more complecated lol."*

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

## 6 · The table is not a person — the people are

Set 2026-08-07:

> *"the people in the pavilion can refrences material, mabie each speclize on
> how but the study table is not a person and the ai can help with notes but
> wont know much, notes from quill or the moutian monk might be a nice feature
> to add."*

This is the cleanest line yet between the two halves of the Pavilion, and it
settles what each part of the pathway above is allowed to do.

### The rule

**A surface holds. A person knows.** The Study Table, the Writing Desk, the
Records Hall and the backpack are surfaces: they arrange what you put on them
and they never volunteer. Anything that *references*, *compares* or *suggests*
is a resident — with a name, a duty, and a room you walked to.

The practical test: if a panel produces a sentence nobody asked it for, that
sentence should have a face attached, or it should not exist.

### Each specialises in HOW, and roles.js already says so

The roster has carried this since it was written; it just was not being used as
a design constraint:

| resident | how they reference | `sendMe` |
|---|---|---|
| **Quill** | *"knows what is actually on the shelves… **speaks only of texts genuinely shelved here**"* | finding a book, what one is about, a summary |
| **the Monk** | *"not information — **orientation**"* | what a thing is *for*, how to live with it |
| **the Tutor** | breaks a hard thing down until it is genuinely understood | first principles, small steps |
| **the Computer** | *"most of what it does **needs no AI at all**, which is the point of it"* | listing, searching, opening |

So "reference this material" is **four different acts**, not one feature with a
dropdown. Ask Quill and you get *where it sits and what else is like it*. Ask
the Monk and you get *what it is for* — and if you ask him what page something
is on, the honest answer is that this is Quill's question.

### The constraint, said plainly: the model will not know much

> *"the ai can help with notes but wont know much"*

Correct, and it is the most useful sentence for building this. A model small
enough to run on this machine has thin recall and will invent a chapter number
sooner than admit it does not have one. So **its value is never recall — it is
work on what is in front of it.**

**And that is what carrying is for.** This is the part that makes the whole plan
hold together rather than being two plans:

> **The backpack is the grounding.**

What you carried in is what the resident can see. Not a heuristic guessing at
relevance, not the whole catalogue — the specific things you deliberately picked
up. Which means:

- **The uncapped-prompt bug cannot recur.** It has been fixed three times
  (Quill, the Monk, and a third site still open at `overlays.js:5748`) because
  every grounding block is assembled by hand and each one is written fresh. A
  carried list is *already* capped, by a person, on purpose — and rule 7 says
  the deterministic answer beats the approximate one.
- **The visitor can see exactly what the resident can see**, which is the only
  honest version of "grounded".
- **"I don't know" gets easy.** With nothing carried, a resident can say *"put
  the book in your backpack and I will read it with you"* — a real next step
  instead of a guess. Rule 6 stops being a discipline and becomes the obvious
  path.

### Can a resident go and look something up?

Asked 2026-08-07: *"can the ai use the backend to pull info like a book im
refrencing or older notes if they need to?"*

**Yes — and one of them already does.** `residents.js:103` searches the
catalogue with `searchBooks` and injects a `YOU LOOKED THIS UP` block, with an
honest branch for a search that finds nothing: *"That is a real answer, not a
gap in what you were shown… do not guess at a title that might be close."* That
is already the right shape and does not need rebuilding.

**Two facts about what the backend can actually serve:**

- **It holds the catalogue, not the text.** `books.text_key` is a *pointer*; the
  words live in MinIO or in a `.txt` under userData. So a lookup answers *which
  book, and where it sits* — the passage comes from `retrieval.js` (BM25, inside
  one book). Two systems, both already built, and confusing them would have a
  resident quoting a book it never opened.
- **`searchNotes` is the one that earns its place**, and it is unused. It stems
  — `walking` finds `walked` — which JS genuinely cannot do, and "what did I
  write about this before" is the question a resident most needs and cannot
  currently ask.

**But a lookup must not become invisible grounding**, or §0 has been quietly
reversed and we are back to the uncapped-prompt bug in a new costume. So:

1. **A lookup happens because you asked**, or because the resident says it is
   going to look — never silently in the background of a reply.
2. **What it found goes into the backpack.** This is the important one: a
   resident's search is the *fastest way to fill the backpack*, not a private
   channel around it. You end up holding what it found, so you can see it, carry
   it elsewhere, or put it down.
3. **What was searched and what came back is stated**, as `searchBooks` already
   does — including "nothing", which is a real answer.

That keeps one rule for everything: **what the resident sees is what you are
carrying.** A lookup adds to it in the open rather than bypassing it.

### A gap in what a resident knows is a REQUEST, not an apology

Asked 2026-08-07, and it is the best idea of the session:

> *"lets have the resedends when they dont know whats going on or have a hole
> in knolege to ask the user to get more data on that topic lol to have the
> user get more books to complete there knolege and to be more helpfull lol."*

This closes a loop the project has had open since the beginning, and it turns
the *weakest* thing about a small local model into the thing that grows the
Library.

Rule 6 says say "I don't know", and until now that was where it stopped — an
honest dead end, and a dead end is the one thing nothing here may be. This
makes the not-knowing **actionable**:

> *"There is nothing on these shelves about Kalman filters. If you bring one
> in, I can work from it — the Request Board is in the Study, and dragging a
> file onto the window is the fastest way."*

**Why this is right and not a trick:**

- **The gap is real and already detected.** `residents.js:107` has the branch
  today: a search that finds nothing already produces *"say plainly that it is
  not on these shelves, and offer the Request Board"*. What is missing is that
  it only fires for a **title** search. It should fire for a gap in *what the
  resident could answer with*, which is a wider and more honest question.
- **It is the ownership principle, arriving from the other side.** *"filling up
  your own library makes one have a sence of ownerhip"* — and a book you
  fetched because a resident could not answer without it is the most owned book
  there is. The seed shelf is an on-ramp; this is the on-ramp doing its job.
- **It makes the model's real limit useful.** A small local model has thin
  recall and will invent a chapter number sooner than admit it lacks one. This
  gives it somewhere to put the admission that is not an apology.

**Three rules, or it becomes nagging:**

1. **Name the gap, not the feeling.** *"Nothing here covers X"* — a specific,
   checkable claim about the shelves, which the visitor can verify and the
   resident can be wrong about out loud. Never *"I'm not sure"*.
2. **Ask once, and only when it blocks the actual question.** A resident that
   ends every reply with a book request is an upsell. The test: would the
   answer have been genuinely better with that book? If not, say nothing.
3. **Offer the shortest real path.** The Request Board, or drag a file onto the
   window — both already exist. Never *"go and find something"*.

**And it lands in the backpack.** A request the visitor acts on ends with a book
carried in, which is the same loop as a lookup: the resident's limits are filled
by the visitor, deliberately, and everything the resident then sees is something
a person chose to hand it.

### Notes from Quill and the Monk

A resident's note is **the same kind of thing as yours** — it lands in the Notes
Log, it is carryable, it can go on the Study Table. It differs in exactly one
way: **it is attributed and it is obvious.** The `✨` convention already exists
for AI-written notes and already survives sorting; this extends it from "an AI
wrote this" to *which* resident, because a note from the Monk and a note from
Quill are different kinds of claim and should not wear one badge.

Two rules, both of which follow from things already decided:

1. **A resident writes a note only when asked.** Nothing in the Pavilion happens
   in the background, and a note that appeared by itself is the automatic
   behaviour §0 rules out.
2. **A resident's note says what it was looking at.** Attribution without
   grounding is just a byline. If Quill wrote it from three carried books, the
   note names them — that is the provenance rule the Commons already uses,
   applied inward.

### Where this lands in the order

It does **not** become a seventh step. It is a constraint on steps 1–4: the
Study Table's tray stays dumb, the Computer stays mostly AI-free, and the first
resident to read from the backpack comes after carrying works — because a
resident grounded in a thing that does not exist yet cannot be tested.

---

## 7 · Two commitments to hold while the rest is built

Stated 2026-08-07, ahead of any security work:

> *"the app function has alot of data save locally on the computer, thats fine
> and the pavalino is gona see that, lets make sure cloude modles cant in the
> furtre and that personal info is not linked to a server if we connect on in
> the future. as long as we do that i dont wana restrict the user and the ai."*

Both halves matter, and the second is what makes the first affordable: **the
constraint is on what LEAVES, never on what the visitor and their own resident
may do together.** A local model reading your whole backpack is the Pavilion
working. The same bytes going to someone else's server is a different act.

### Where this already stands, honestly

- **The carry-only rule is provider-blind, and that is correct.**
  `data/lookup.js` says notes are never reached for, whichever model is
  answering. That holds today for Ollama, LM Studio, OpenAI-compatible and
  Anthropic alike.
- **The build refuses to ship a cloud host or anything key-shaped.**
  `scripts/verify-beta-build.mjs` *fails the build*, and `preflight.mjs`
  asserts zero network requests. Both are green today.
- **The Monk is already local-only** by standing decision.

### What is NOT yet true, and should not be pretended

**There is no provider-aware grounding rule.** A hosted resident and a local one
are handed the same block. The steward's ask is stricter than what exists:

> a hosted model should see *less* than a local one, by construction.

That is a real piece of work — a `reach` tier per provider, so `lookup.js`
answers differently for a hosted transport, and a **derived guard** that no
grounding path can hand a hosted provider anything from the private side. It
belongs with the security pass, not before it, but it must not be described as
done in the meantime.

**And "personal info is not linked to a server"** is currently true by the
strongest possible means — there is no server. The commitment is that when one
arrives it stays that way, which
`COMMONS-SERVER-TIGHTENING.md` already designs for: allowlists keyed on public
keys, no user database, no sessions. **A profile name is not an identity
record**, and the moment it becomes one linked to reading history, this
commitment is broken regardless of what the privacy page says.

### The log, in a git shape

> *"we should have a git format in the backend where things are loggned in a
> list and that data can live locally on the device. if docker is set up mabie
> there."*

Right instinct, and it is close to what already exists rather than new: the
Records Hall is an append-only list of what happened, and the Commons packet
format is already content-addressed (SHA-256 of the payload as the id), which
is the half of git that matters here. What a git shape would add is
**parentage** — each entry naming what it came from — which is exactly the
`supersedes` / `builds-on` field `COMMONS-SERVER-TIGHTENING.md` already says to
add early.

So: **not a new store.** A `parent` on the entries that have one, and the
Records Hall becomes a history you can walk backwards. Local by default; on
Postgres when Docker is up, because that is the same row either way — the home
choice sits below the named-query seam and the renderer cannot tell.

**Ordered after the library, notes and lesson planning**, at the steward's
word, and this section exists so the constraints are already written down when
that work starts.

---

## What would tell us this was wrong

- Carrying gets used once and then everyone goes back to the bespoke buttons.
  The buttons are the control group; watch whether they get used *less*.
- The backpack fills and never empties. Things must come back *out*.
- "Manual" turns into "tedious" — if putting a book on the table takes more than
  one press from where you already are, the principle is being used as an
  excuse for a missing shortcut.
- A surface starts volunteering. The first unprompted sentence on the Study
  Table with no face attached is the rule in §6 going.
- A resident answers from recall instead of from what was carried. The tell is a
  confident chapter number for a book that is not in the backpack.
