# The tutorial, the backpack's ceiling, and signing in

**Status:** Design, agreed 2026-08-07. Not built — queued behind "notes solid".
**Sits with:** `plans/done/THE-BACKPACK-AND-THE-TUTORIAL.md` (the carry model)

Three decisions from the steward, written down while they are exact. Two of
them have a wrinkle worth naming before anyone builds them; both are named
below rather than discovered halfway.

---

## 1 · The backpack's ceiling

> *"the backpack ceeling can hold a standard invintroy in a game, there should
> be a place where we can see things non active or not in our backpack but keep
> it as current tasks rather than a limmiter, should be more than enough room in
> the code for a humans attantions span."*

**A standard game inventory — call it 20 slots.** Not a scarcity mechanic. The
number exists so the backpack stays *readable at a glance*, which is the only
thing it is for. Nothing is ever refused for lack of space without saying so
plainly and offering the obvious fix.

**The ceiling is on attention, not on storage.** Everything you own is still
everywhere it was — the Library, the Notes Log, the Course Board. The backpack
is the small set you are *working on now*.

So there are two lists, and the distinction is the whole design:

| | **the backpack** | **the shelf beside it** |
|---|---|---|
| means | I am working on this now | I own this / I was working on this |
| size | ~20, glanceable | everything |
| the question it answers | "what's in front of me?" | "what else is there?" |

**"Current tasks rather than a limiter"** is the exact phrase to build to. Taking
something out of the backpack is *putting it down*, never *losing* it — the same
word the Today panel now uses for a project past its date, and deliberately so.
A thing set down goes to the shelf; the shelf is how you look back and pick it
up again.

This also gives the Today panel's `🌾 set down` item a real home to point at,
which it does not have today.

---

## 2 · The tutorial, in the steward's own order

> *"go to the library put a book in your back pack, set one task for the day and
> see how to upload books, after that we can troduce the agents and there
> functions, then the other tools usefull, and last the community missions and
> the goal of the sand pavilion to build a system of abundance. let them know
> they can create quest and learning path themsleves or follow the ones already
> here."*

Five stages. **Nothing is locked** — the standing rule is that the gate is on
the claim and never on the learning, so every room stays reachable throughout.
What is staged is what the Pavilion *points at*.

### Stage 1 — The first loop, and it is the whole product in miniature
1. Go to the Library.
2. **Put a book in your backpack.**
3. Set **one** task for the day.
4. See how to bring your own books in.

This is the right opening and it is not a tour: at the end of it the visitor has
a book they chose, a task they wrote, and the knowledge that the shelf is theirs
to fill. Three things they keep. It also teaches the carry verb *first*, which
everything later depends on.

**Why "one task" and not "plan your day":** one is finishable in the first
sitting. A planner asked to be filled in is the thing that made "what should I
do here?" have no answer.

### Stage 2 — The residents
Who they are, that they are **optional**, and that they run on your machine or
not at all. Introduced *after* the visitor has something of their own, because a
resident with nothing to talk about is a chatbot, and a resident who can see the
book you chose is the thing this place actually is.

### Stage 3 — The other tools that earn their place
The reader with notes beside it (*"it was magic"* — 2026-08-07, and it is the
strongest single moment the Pavilion currently has, so it should be *taught*,
not stumbled on), the Study Table, the Notes Log, the Computer.

### Stage 4 — Making, not only following
> *"let them know they can create quest and learning path themsleves or follow
> the ones already here."*

Both halves, said plainly, and this is the hinge of the whole sequence: it is
where a visitor stops being a reader of someone else's thing. It is also the
on-ramp to the F-rank gate in `INDEPENDENT-COURSE-GRADUATION.md` — the same act,
introduced casually long before it is named as a threshold.

### Stage 5 — What it is all for
Community missions, and the goal: **a system of abundance**. Last, because it
means nothing to someone who has not yet felt the first four, and everything to
someone who has.

### Rules for the whole thing
- **Skippable, and re-openable.** The steward does not need it; a returning
  visitor should be able to ask "what else is there?"
- **It teaches by producing something kept.** Never a highlight-and-arrow tour.
- **One next thing at a time.** The next stage is not mentioned until the last
  is done — that is the answer to *"im loosing track at this rate lol"*.
- **It doubles as the audit.** A feature with no place in these five stages is a
  feature nobody will find. That is the Lab's lesson made checkable.

---

## 3 · Signing in, and what dev mode is actually for

> *"there should be a sign in and a user interface for everyone already
> something in settings like log in. not an email but there own game name and
> password. mabie with an email verfy link."*

> *"dev mode is jsut the place where i get those rewuest for thigns like new
> books for the total library, needs proper soursing for this, idipendnet paper
> review, and misison and lesion review."*

**Dev mode is an inbox, not a permission level.** That is a much better idea
than the one in `THE-BACKPACK-AND-THE-TUTORIAL.md`, which framed it as a
capability switch, and it should replace that framing. Three request types, all
of them work the steward actually wants to receive:

| request | what it carries | why it needs a person |
|---|---|---|
| **a book for the shared library** | title, author, **where it came from and under what licence** | sourcing is a rights judgement; `data/copyright.js` deliberately does not let an AI make it |
| **a paper for independent review** | the paper, the claim, the falsifier | the Science Hall's whole point is evidence over volume |
| **a mission or lesson for review** | the draft, and what it claims to produce | the nesting rule: no mission may exist only as a grand statement |

Each is **a packet** — the same envelope, provenance and signature the Commons
already specifies, with a different `type`. Nothing new, and **nothing sends
itself**: it writes a file the person chooses to hand over.

### The wrinkle, named up front: an account with no server

**A name and a password can be local. An email verification link cannot.** A
verify link requires something to send mail and something to receive the click —
a server — and the Pavilion's first promise is that it makes zero network
requests and needs no account. These are not compatible today, and pretending
otherwise would put a "verify your email" screen in front of a person the
Pavilion cannot possibly email.

So it splits cleanly, and the split is the honest version of what was asked:

- **Now, local and real:** a **profile** in Settings — your own game name, and a
  password if you want one. It names your work (so a packet you write says who
  wrote it), it lets more than one person share a machine, and it is what
  unlocks the steward's inbox on the steward's machine. **No email, no server,
  no verification, and it never leaves the disk.**
- **Later, with the Commons server:** the name becomes a **public key** rather
  than a login. `COMMONS-SERVER-TIGHTENING.md` already specifies allowlists
  keyed on public keys precisely so there is no user database to run — and a
  keypair is what makes "this request really came from that person" checkable
  without anyone storing a password. **Email verification is then optional and
  probably unnecessary**, because the key already does the job the email was
  standing in for.

**A password is not a security boundary here and must not be described as one.**
Anyone with the disk has the save. It is a *doorway*, so a curious visitor does
not wander into the steward's inbox — which is exactly the checks-and-balances
job it was asked to do. Saying that plainly is required; implying it encrypts
anything would be a lie of the kind this project refuses.

---

## Order

Unchanged, and this document is entirely in the "later" half:

1. **Notes solid** ← current
2. The backpack unified, and the shelf beside it
3. **This document**: the tutorial, then the profile and the inbox
4. The Science Room
5. The website and connectivity — last
