# The living tree, the collective tree, and somewhere to talk

Written **2026-07-27**, from the clearest statement of intent this project has
had yet:

> *"The lesson board looks good, but it's not enough to support thousands of
> courses — let's animate it to make it more like a skill tree in a video game
> with ever-extending branches. A small one for personal use and a big one for
> every member of the Sand Pavilion to have collectively, and only adds when
> they have a repertory or notes on what they learned, and even better a class
> to help the next group get there themselves. What I really want now is to
> have a place where I can make my own basic courses on how to meditate and
> study the Dao, and have a place where people can discuss it."*

Four things are tangled there. Untangling them matters, because **one of them
already exists**, two are real build work, and one is the only thing in this
whole project that cannot honestly be done without a server.

---

## 1 · Making your own courses — **this already works** (built 2026-07-27)

Course Board → 🌳 the Learning Tree → **✎ Write a lesson**. Title, what it's
for, steps one per line, and prerequisites — tick a lesson that must be
finished first and yours stays locked until it is. The Tutor studies your
lessons exactly as it studies the built-in ones.

So *"a place where I can make my own basic courses on how to meditate and study
the Dao"* is **available now**, today, with no further work. Worth walking one
before building anything below: writing a real meditation 101 is the fastest way
to find out what the authoring form is actually missing.

**What writing one will probably expose** (guesses, to be replaced by findings):
required reading isn't linkable to a shelved book yet; there's no way to say
"do this daily for a week" as distinct from a step you tick once; and a lesson
can't carry an image or a posture diagram.

---

## 2 · The tree as a real tree *(the visual ask)*

**The problem is honest:** the tree currently renders as headed lists. That is
fine for the twelve lessons that exist and hopeless at a hundred, let alone
thousands. Prerequisites exist in the *data* and are invisible in the *drawing*
— you're told "🔒 finish X" in text rather than shown a branch running from X
to here.

**The build, smallest first:**

1. **Draw the edges.** An SVG layer behind the cards with a line from each
   prerequisite to each dependent. Nothing else changes. This alone turns a list
   into a tree and is maybe half a day.
2. **Lay it out by depth, not by track.** Column = how many prerequisites deep a
   node is. Roots on the left, everything reachable to the right. Tracks become
   colour, not structure.
3. **Only draw the neighbourhood.** The scaling answer: never render the whole
   tree. Render what you've finished, what's available, and one ring beyond —
   with the rest as a faint edge running off-screen labelled with a count.
   *"Thousands of courses"* is only a rendering problem if you insist on drawing
   thousands of courses.
4. **Animate the growth, not the idle state.** A branch that *extends* when you
   finish a lesson, once, for about a second. Standing animation on a hundred
   nodes would cost real frames for nothing — and the sleeper-car rule
   (`CLAUDE.md`) is explicit that the renderer stays cheap so the machine's
   power goes to the AI and the Library. A one-off growth animation honours both.

**Do not** build a general graph editor. The tree is drawn from data that
already exists; the authoring form is where structure gets made.

---

## 3 · The collective tree, and the price of entry

The good idea in the message, stated plainly: **a shared tree that only grows
when someone brings back what they actually learned.** Not "I completed this" —
*a repertory, notes, or better, a class that helps the next group get there
themselves.*

That is a genuinely unusual design and it's worth protecting. It means:

- **Finishing a lesson adds nothing to the collective tree.** Only *contributing*
  does — notes worth reading, or a lesson authored for the next person.
- The natural unit already exists: a **packet** (Commons Table). A contributed
  lesson is a packet; the collective tree is the graph of packets people have
  handed on.
- Which means **the collective tree can be built today, file-based, with no
  server**: your Pavilion draws the tree from the packets it has received. It's
  a *partial* view of the commons — the part that has reached you — and that is
  honest rather than a limitation to hide. Two people who have swapped packets
  see overlapping trees.
- The rule to write into the code: *a node enters the collective tree when it
  arrives as a packet carrying either notes or a lesson.* A bare completion
  claim can't get in, because nothing about it is worth passing on.

**Build order:** the shared tree is the same renderer as #2, pointed at
`data.commons.received` instead of `data.myLessons`. Do #2 first and this is
nearly free.

---

## 4 · Somewhere to discuss — the honest wall

This is the one thing in the project that **cannot be done well without a
server**, and it should be said plainly rather than half-built.

Discussion means several people, asynchronously, seeing each other's words. A
file you hand to one person is not a conversation. The existing café boards do
exactly this and are the only Supabase-dependent feature left — which is why
they're dormant.

**The three honest options, in order of cost:**

| | What it is | Cost | Honest verdict |
|---|---|---|---|
| **A** | **Discuss with the residents** — a lesson's own conversation with the Tutor/Monk, kept with the lesson | already possible; a day to make it a real per-lesson thread | Not what was asked for, but genuinely useful, and works offline forever |
| **B** | **Correspondence** — a discussion thread that travels as a packet: you write, hand it over, they append, hand it back | ~2 days | Real, server-free, and slow in a way that suits a Pavilion. Closest to the project's own grain |
| **C** | **A real shared board** — the VPS running the same Postgres+MinIO stack (`SELF-HOSTED-STACK-PLAN.md` Phase 3) | a rented box, plus identity and moderation | The only true "people discuss it" answer. Costs money and brings auth, moderation and takedown with it |

**Recommendation:** **A now, B next, C only when there is genuinely a second
person on the other end** — which is the same rule already governing every other
server question here. Building C before there are two users would be renting a
room for a conversation nobody is having yet.

---

## The order I'd actually do it

1. **Write a meditation 101 and a Dao course** in the existing authoring form,
   and note every place it fights you. *(No code. Do this first.)*
2. **Draw the edges** (#2 step 1) — the cheapest change with the biggest
   "oh, it's a tree" payoff.
3. **Per-lesson discussion with a resident** (#4 option A).
4. Depth layout + neighbourhood rendering (#2 steps 2–3), when there are enough
   lessons to need it.
5. The collective tree over received packets (#3).
6. Correspondence threads (#4 option B).
7. A real shared board — only with a second person waiting for it.

**One line to hold onto:** the tree already knows its own shape; it just isn't
drawing it yet. And a commons that only grows when someone brings something back
is a better idea than most platforms have ever had — it's worth building
carefully rather than quickly.
