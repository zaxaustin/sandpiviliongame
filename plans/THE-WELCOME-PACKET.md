# The welcome packet — a first armful of books, earned

*Asked for 2026-08-10, and deliberately parked:*

> *"what we are missing cause the libary is empty is a welcome packet of books,
> we shuould make that a reward for the totorual completion lol lets make a
> plan for that for later"*

**Not started. This is a plan, not a queue-jump.** The same message set the
order:

> *"we now have a strong foundation for the next level but lets make sure we
> stablize this game and make it flow like water before we taclke any more
> ambitions ideas."*

So this waits behind stabilisation. It is written down now because the *idea*
is good and specific, and because an empty Library is the one thing a new
visitor cannot work around.

---

## The problem it solves, and the one it must not create

`SEED_LIBRARY` is `[]` and **that is the finished position** (see `CLAUDE.md`).
The argument for it is real: *"filling up your own library makes one have a
sence of ownerhip"*, and a shelf of 27 books nobody chose was actively hiding
bugs — the Index rendered zero of 415 real books while 27 seed stubs rendered
perfectly.

**So a welcome packet must not become a new seed shelf.** That is the whole
design constraint. The difference the steward's idea makes is the word
**earned**:

| the old seed | the welcome packet |
|---|---|
| present before you did anything | arrives because you finished the tutorial |
| nobody chose it | **you** chose to walk the tutorial, and you pick from the packet |
| shipped inside the app, inert | fetched or unpacked by a deliberate act |
| hid bugs, because it was always there | absent on a fresh save, so the empty-shelf paths stay tested |

**The bug-hiding property is the one to guard hardest.** If a packet lands
automatically on first run, every live suite is back to testing a Pavilion that
came pre-filled — CLAUDE.md rule 1, in a new costume for the third time.

## The shape

1. **It is a reward, so there has to be a tutorial.** This plan **depends on**
   [`THE-TUTORIAL-AND-SIGNING-IN.md`](THE-TUTORIAL-AND-SIGNING-IN.md), which is
   the harder, unbuilt half and the real front door. **Do not build the packet
   first** — a reward with nothing to earn it is just a seed shelf with a
   delay.
2. **The packet is a choice, not a delivery.** On completion the visitor is
   offered a small shelf — say six to eight — and **takes what they want**. One
   press each. Choosing is the point; a bundle that lands whole reintroduces
   exactly the inertness this replaces.
3. **Where the text comes from — the honest question.** Three options, and this
   is the decision to make when it is picked up:
   - **(a) Bundled in the installer.** Simple, offline, and it puts the text
     back inside the app — the thing that was just removed (248 KB of
     `data/library-texts/` went with the seed). Weighs the installer down again.
   - **(b) Fetched on demand** from Standard Ebooks / Gutenberg / SuttaCentral.
     Keeps the app light and the provenance real. **But a browser cannot reach
     those directly** — a real technical wall Quill already explains — so this
     needs the desktop bridge, and it fails without a network.
   - **(c) A guided list, not a payload** — the packet is a *panel* that walks
     you to `docs/BOOKS-TO-SOURCE.md`'s texts one at a time, with the drop
     target right there. **Cheapest, most honest, and closest to the standing
     decision** that a first armful is a documentation problem rather than a
     shipping one. Weakest as a "reward".

   **Recommendation: (c) first, (b) as the upgrade** where the bridge exists.
   (a) only if the other two prove too much friction for a real newcomer — and
   that is a thing to learn from a tester, not to decide here.
4. **Provenance at the door, as always.** Every text in the packet carries its
   licence and source. Public domain or CC0 only — Standard Ebooks, Project
   Gutenberg, SuttaCentral's CC0 canon. This is also the natural place for the
   *"help us get books legally"* notice the steward wanted on the notice board
   (`AFTER-THE-LIBRARY.md` item ⑤); the two belong together.

## Where it connects

- **Daily tasks.** The steward mentioned this *"in the daily task plan"* — the
  natural join is that finishing the tutorial can **seed a first daily task**
  (`data/daily-tasks.js`), so the packet is not the end of the tutorial but the
  start of the first real sitting: *get the book → read it → have the Tutor
  draft a plan → walk the course.* That arc is four existing doors and needed no
  new code when it was built.
- **The Inheritance Hall.** `GATE_BEQUESTS` is `[]` for the same reason the seed
  shelf is. If a welcome packet is ever right, a welcome *bequest* is the same
  argument — and the Record Stone already renders a gift list it never receives.
  **Decide both together or neither**; two half-answers to "what does a new
  visitor arrive to" is the drift this project keeps paying for.

## Verification, when it happens

- **A fresh save must still be empty**, and every live suite must still exercise
  the empty-shelf path. A test that asserts the packet has NOT arrived
  unprompted is the guard that keeps rule 1 alive.
- **`test/live/_books.mjs` stays the fixture.** The packet is not a test
  fixture and must never become one.
- **Look at it**: the offer screen, the shelf after taking two books, and the
  shelf after taking none — that third one is the state that must still feel
  deliberate rather than broken.
