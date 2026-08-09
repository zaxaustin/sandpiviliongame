# The three courts — Outer, Inner, Core

*Written 2026-08-10. **Nothing here is built.** This exists so that "demote it
to the Inner Pavilion" becomes an actionable move instead of a sentiment, and so
that the demotion has a rule rather than a mood.*

---

## The three, in the steward's words

> *"the outer court is to better your self, the inner court is to better the
> world … for contributers. missions are unlocked, they understand the exsisting
> features already and have added at least one course themselves. the core
> pavilion will be for seekers of the dao like me."*

| court | for | what it is |
|---|---|---|
| **Outer** | **better yourself** | The default, and everyone starts here. App + optionally Ollama. Your library, your day, your notes, the residents. **Self-sufficient — nothing in it requires infrastructure.** |
| **Inner** | **better the world** | **Contributors.** Missions unlock. Advanced and infrastructure-heavy rooms live here. |
| **Core** | seekers of the Dao | The steward's own. **Named, not designed** — do not build toward it yet. |

## The gate to Inner

Two conditions, and both are already measurable:

1. **They understand the existing features.** Not a quiz — a proxy: they have
   actually used the Outer court. Candidate signals already in the save:
   books brought in, a course walked, days kept, notes written.
2. **They have authored at least one course themselves.** `data.myLessons` and
   `data.courses` make this exact. This is the contribution half, and it is the
   one that matters: *better the world* starts with having made something.

**Reuse `requirementMet()` / `requirementText()` in `entities.js`.** They already
express "this is gated, and here is the plain-English reason it is not open yet"
for bequests — the same shape, a new `kind`. Do **not** invent a second gate
vocabulary.

### This is what `mission` was being held for

`data/carrying.js` still reserves the `mission` kind, unclaimed, with the
reasoning already written down:

> *"we can call it daily tasks instead of missions, you cant do missions unless
> you graduate lol"* — a mission is a thing you earn, and the name stays.

**Daily tasks are Outer. Missions are Inner.** That was decided a session before
the courts had names, and it still fits.

---

## Why this matters NOW, before any of it is built

The immediate job is **not** the tier system. It is a parking place.

> *"i want the inner pavilion now to be a place to park the advance features we
> dont have room for in the overlays and streamline the game without removeing
> all the cool things we spent weeks adding."*

> *"make sure the overlays for the outer pavilon are streamline … 1 not
> overwelm the user but 2 also to cut the overlays down to a reasoabel number."*

**So the demotion serves two purposes at once, and the second one is
architectural.** A room moved to Inner takes its panel code out of the Outer
surface — which means **the demotion and the `overlays.js` split are the same
job**, not two competing ones. Every room that moves is both a room a newcomer
no longer has to understand *and* a few hundred lines that leave the monolith.

Measured, from `plans/OVERLAYS-SPLIT-PLAN.md`:

| candidate | ~lines | fails the first-hour test because |
|---|---|---|
| Science & Research Hall | ~510 | needs a claim, a falsifier and a method before it does anything |
| Café boards (dormant by design) | small | they open and explain that they cannot work yet |
| Inheritance Hall / grove | ~274 | arrives empty on purpose; meaningless until you have something to give |
| Commons Table | part of ~280 | sharing, before you have made anything to share |
| fishing | small | genuinely does nothing, which is the point, but it is not a first-hour thing |

**Roughly 1,000+ lines of Outer surface**, and the same rooms are the ones a new
visitor cannot use yet. That is not a coincidence — *a room you cannot understand
in your first hour is usually a room built on something you have not done yet.*

---

## The two tests, both concrete

*"If it doesn't break anything and makes sense"* is the right spirit and too soft
to act on later — sentiment decides it otherwise. So:

### Demotion — a room moves to Inner if it fails this

> **Would a new visitor find it *and* understand it in their first hour?**

Both halves. Findable-but-baffling and understandable-but-hidden both fail.

### Promotion — a room returns to Outer only if all three hold

1. **Discoverable in the first hour** — reachable without already knowing the
   system, and self-explaining when reached.
2. **No new infrastructure for the Outer user** — needs nothing beyond the app
   and optionally Ollama. **Anything requiring Docker stays Inner by
   definition.**
3. **The contribution gate still means something** — promote so much that Inner
   empties and there was no point earning it.

> *"after we fix the game abd get it in a better state we can add it to the outer
> court if it dosent break anything and makes sence to have it. if not leave it
> for the inner pavilion when we actually build it."*

**Demoting is reversible. Cutting is not.** That is the whole reason this exists.

---

## Where Docker sits

**Inner.** Decided 2026-08-10: *"we might have to build an inner pavilion path
for docker, i gues im promoting myself lol, and have the outerpavilion be able to
support itself."*

That is consistent with rule 2 above — Docker *is* new infrastructure, so it
could never be promoted to Outer anyway.

**What made this safe to do** was making the Outer court genuinely
self-sufficient first, in the same session:

- the local shelf limit moved from a fixed **100** to **500 by default and set
  by the visitor** (25–5,000), after the panel shows them what their library
  weighs and what the disk has spare;
- the storage room now leads with *"the app carries its own database, there is
  nothing to install"*, and Docker sits behind an **Advanced** disclosure;
- a full shelf offers **raising your own limit first**, and mentions Docker
  second — a refusal whose only exit was "become a contributor" would be a dead
  end with a signpost on it.

**Until Inner is built, Docker's Advanced disclosure in the storage room is
standing in for the Inner door.** When Inner exists, that disclosure moves there.

---

## What is NOT decided

- **Whether Administrator and Inner are one door or two.** Docker is
  infrastructure anyone might want; Inner is earned by contribution. Requiring a
  course before someone may enlarge their own library is hard to defend. The
  current lean: **Inner is the room, Administrator is a capability inside it**,
  and until Inner exists the settings-level disclosure is the pragmatic stand-in.
- **What Inner physically is** — a scene you walk to, a tier that unlocks
  existing rooms in place, or a second Grounds like `works`. The `scene` field in
  `data/places.js` already makes "which court is this room in?" a one-field
  question, which is the cheapest possible version.
- **Core.** Named only. Building toward it now would be inventing requirements.

## Order

1. **Outer becomes self-sufficient** ← *done 2026-08-10 for storage.*
2. **Agree the demotion list** — the table above, argued room by room.
3. **Build the Inner door** — the gate, and one place for demoted rooms to live.
4. **Move rooms**, one per commit, verbatim, exactly as the overlays split
   already prescribes. Each move is both a streamlining and an extraction.
5. **Re-test the first hour** with someone who has never seen it.

**No room moves before step 3.** A demotion with nowhere to demote to is a
deletion, and this plan exists specifically to avoid that.
