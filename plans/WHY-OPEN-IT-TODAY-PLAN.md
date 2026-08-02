# Why would I open this today?

Written **2026-07-28**, from the most useful thing said about this project so
far:

> *"What I am missing is using the Pavilion daily, and why. I think the lesson
> planning isn't intuitive enough, and the Sebastian interface, while very good,
> is not enough for me to use daily. The library is something I already feel is
> a precious collection, and I don't really know how or where to mess around
> with papers yet — perhaps another floor for that."*

Three complaints. **They are one problem**, and finding that is worth more than
fixing them separately.

---

## The diagnosis: there is no *today* in the Pavilion

Everything here is a place you *could* go. Nothing is a thing that is *waiting
for you*.

- The Writing Desk plans a day — **after you fill it in.**
- The Learning Tree holds lessons — **after you choose one.**
- The Hall dissects papers — **after you decide which.**
- Sebastian organises the day — **the day you describe to him.**

Every single one of those puts the burden of *starting* on the person, every
time. That is fine for a tool you visit with an errand. It is fatal for a place
you are supposed to inhabit, because on an ordinary evening — tired, no
particular agenda — "what should I do here?" is a question with no answer, and
the honest response is to close it.

**Note what is not the problem.** The Library "already feels like a precious
collection." That is the hardest thing to build and it is done. The bottleneck
is not quality, and adding more features will not fix it: **more rooms is more
choosing.**

### The three complaints, re-read through that lens

| Said | Actually |
|---|---|
| *"Lesson planning isn't intuitive"* | On an ordinary day you don't want to **author** a lesson — that's producer work. You want to **walk one step** of something you already started. The tree offers writing and browsing; it never offers *"here is your next step."* |
| *"Sebastian isn't enough for daily"* | He **asks** and doesn't **bring**. A planner you fill in is work. A colleague who says *"you've moved this four days running, do you still want it?"* is worth showing up for. |
| *"Don't know where to mess around with papers"* | Papers **do** have a home — the Science & Research Hall dissects them and keeps the analyses. Nobody can find it. Same class of bug as the Caravan Desk: the right feature, in a room you have no reason to enter. |

---

## The fix: one door, and something behind it

**A single daily surface — "The Day" — that answers "what is waiting for me?"
before you have to decide anything.**

Not a dashboard. Not a summary of everything. **Three to five items, each one a
single action you can take right now**, assembled from what the Pavilion already
knows:

| Item | Where the data already lives |
|---|---|
| *"Two things you left open yesterday."* | `openSparks()` — already computed |
| *"This is due today."* | `upcomingItems()` — already computed |
| *"Next step on Coding 101: change one line."* | `data.curriculum` + `allNodes()` — computable now |
| *"You added 3 books last week and haven't opened them."* | `personalLibrary` + `data.read` |
| *"You brought this paper in and never pulled it apart."* | personal shelf, minus kept analyses |
| *"You're 40 pages into the Dhammapada."* | `data.read` + reader position |

**Almost none of this needs new data.** It needs one screen that *asks the
questions nobody is asking on your behalf.*

### The rules that decide whether it works

1. **Never empty.** If genuinely nothing is pending, it offers one small good
   thing — a page of something you're mid-way through, an unopened book. "You're
   all caught up" is a dead end and a reason not to return.
2. **Never a wall.** Five items, hard cap. A list of everything outstanding is
   a guilt inventory, and guilt is the opposite of a habit.
3. **Every item is one press.** Not "go to the Study and open the desk" —
   *the step itself*, right there.
4. **It notices, it does not nag.** *"Moved four days running"* is an
   observation. A red badge is a demand. This project's standing decision is
   that reminders stay passive and opt-in; that holds here.
5. **Nothing runs in the background.** It is computed when you open it, from
   what is already saved. No timers, no polling — the standing rule.

### Where the door is

**Sebastian is the door**, and this resolves the second complaint properly. He
stops being a form to fill in and becomes the person who *tells you what's
waiting* — which is what a butler has always been for. His stand-up (see
[`ONE-STEP-AT-A-TIME-PLAN.md`](ONE-STEP-AT-A-TIME-PLAN.md)) is how it is
delivered: one thing at a time, in his voice, with the option to act or dismiss.

That plan and this one are halves of the same fix. **This one says what he has
to say. That one says how he says it.** Neither works alone: a form asked
politely one field at a time is still a form, and a good observation dumped as a
wall of text is still a wall.

---

## Papers: fix discoverability before building a floor

> *"Perhaps another floor for that to be displayed in the game."*

Tempting, and the instinct is right that papers deserve a *place*. But the
lesson from the intake table three hours ago applies exactly: **the Caravan Desk
wasn't broken, it was unfindable — and the fix was a station where people
already were, not a new room.**

Papers today can be brought in, dissected against a real critical standard, and
kept as re-readable analyses. That is a genuinely good workflow **that has no
visible front door.**

**So, in order:**

1. **Give papers a station in the Library**, beside the intake table — *"📄 Bring
   a paper in"*, or a shelf that shows papers separately from books. One place
   that says: here is what you brought, here is what you've pulled apart, here is
   what's still untouched. Cheap, and it may be the whole fix.
2. **Make the untouched ones appear in The Day.** *"You brought this in and never
   read it"* is exactly the kind of thing only the app can notice.
3. **Then, if it earns it, a floor.** A room is worth building when there is
   enough *activity* to fill it — a workbench with papers in progress, comparisons
   between them, a wall of what you've concluded. A floor built before that is a
   corridor with a sign on it. `RESEARCH-ROOM-PLAN.md` already asks this exact
   question ("should we add a floor to the library?"); the honest answer is *not
   yet, and here is what would earn it.*

---

## Lesson planning: separate the author from the walker

The word "planning" is hiding two different jobs:

- **Authoring** — writing a lesson for yourself or someone else. Occasional,
  deliberate, producer work. The AI chain built today already serves this.
- **Walking** — doing the next step of something you started. **Daily.** Almost
  entirely unserved.

The tree currently opens on *the whole tree* — a map, which is the right thing
to show someone deciding and the wrong thing to show someone returning. So:

- **The tree opens on "where you are"**, not on everything. One card: the lesson
  you're mid-way through, and its next unticked step. The full map one press away.
- **A step should be startable from The Day**, without opening the tree at all.
- **Authoring moves behind a clear door** — *"✎ Write one"* — so it stops being
  the thing you're implicitly asked to do on arrival.

That is the intuitiveness gap, and it is a *framing* fix more than a UI one: the
tree currently asks *"what would you like to learn?"* when the useful question is
*"shall we carry on?"*

---

## What to build, in order

Each useful alone, each small, none needing a server or a bigger model.

1. **"The Day" as a computed list** — the six item types above, capped at five,
   never empty. Almost pure logic over data that already exists, and it is the
   whole answer to *"why open it today?"*
2. **Sebastian delivers it** as his stand-up, one item at a time.
3. **The tree opens on where you are**, with the map one press away.
4. **A papers station in the Library**, beside the intake table.
5. **Untouched papers surface in The Day.**
6. **Capture pathways** ([`CAPTURE-PATHWAYS-PLAN.md`](CAPTURE-PATHWAYS-PLAN.md)) —
   the fourth ask, and it compounds with all of the above: anything dragged in
   becomes another thing The Day can notice you haven't read.

**Item 1 is the one that matters.** If it works, the Pavilion stops being
somewhere you *could* go and becomes somewhere with something waiting. If it
doesn't, nothing else on this list will fix daily use either — and that is worth
knowing quickly and cheaply, which is another argument for building it first.

---

## The test this plan has to pass

Not "does it have a daily view." This:

> **Open the Pavilion tired, at the end of an ordinary day, with no agenda. Is
> there something worth doing in the next ten minutes, without having to decide
> what?**

If yes, the dog food is edible. If no, we have added another room.
