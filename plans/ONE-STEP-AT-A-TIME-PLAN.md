# One step at a time — making Sebastian and the paths feel human

Written **2026-07-28**, from:

> *"The learning paths and the butler Sebastian need to feel more professional
> and have more of a fun interactive feel and setup. We need to take advantage
> of this game-like interface to be able to break things up and do things one
> step at a time that feel more human."*

Two words in that are doing a lot of work — **professional** and **fun** — and
they are usually assumed to pull against each other. They don't here, and the
reason is worth stating, because it decides the whole design.

---

## The lesson is already in the codebase, from this morning

Today's biggest fix was splitting one enormous AI request into a chain of small
ones (`BETA-TESTING-FEEDBACK.md` #15). The measured result:

| | before | after |
|---|---|---|
| steps the model produced | **1** | **5** |
| live checks passing | 7 of 11 | **11 of 11** |

But the half that matters here is the *other* half. The same change made the
**human** experience better, and not by coincidence:

- the form filled in **field by field**, visibly, instead of freezing
- the status said **"6 of 8"** instead of spinning
- a **Stop** button kept whatever had arrived
- a stage that failed cost **that one field**, not the whole thing

**Small steps were simultaneously the fix for the machine and the fix for the
person.** That is the thesis of this plan: what feels human and what works
reliably are the same shape, and the Pavilion should adopt it everywhere.

---

## Why "professional" and "fun" agree here

A wall of AI-generated text is the failure mode of nearly every AI product. It
arrives all at once, it is too long to read, it is impossible to correct without
starting over, and it makes the person a *reader* of the tool rather than a
participant in the work.

The opposite of that wall is not "more playful decoration." It is **pacing** —
one thing at a time, each visibly finished before the next begins, each
correctable in place. A good professional works that way with you: an architect
does not hand over a finished house, they sketch, check, and continue.

And pacing is exactly what a game interface is *for*. The Pavilion already has
three things a chat window does not:

- **a place** — rooms that mean something, so work has a where
- **a body** — you walk, you stand at a desk, you face a thing
- **time** — the deliberate, unhurried pace already built into the world

Right now those are used for *navigation* and barely at all for *work*. That is
the gap.

---

## Sebastian — a colleague, not a form

**What's wrong now:** the day is planned by looking at a panel of empty fields.
That is a form. Nobody has ever felt looked-after by a form, and no amount of
personality text in a system prompt fixes a layout that asks for everything at
once.

**What it should be:** a short conversation with someone competent, where he
asks *one thing*, waits, and responds to the answer before moving on.

### The morning stand-up

Not a panel. A sequence, each step a single question with a real answer visible
before the next arrives:

1. *"Morning. What's the one thing that has to be true by tonight?"* — one
   field, one line.
2. He reflects it back in his own words, and names what it will cost: *"That's
   a two-hour block, not a twenty-minute one. Where does it go?"*
3. *"Anything already fixed today?"* — pulls in what the calendar already
   knows, asks only about what it doesn't.
4. He drafts the shape of the day, **one block at a time**, each landing on the
   Writing Desk as it is agreed rather than in a finished lump.
5. *"Two things carried over from yesterday. Both still true?"* — the
   migration that already exists, asked rather than assumed.

Same information as the current panel. Completely different experience, and it
is the same machinery — small asks, visible arrival, correctable in place.

### The evening close

The other half, and the one that makes the loop mean something. Three questions,
in order, and he says something true about the answers:

- What actually happened?
- What is still open — and is it still worth being open?
- One line for The Log.

**Professional means: he remembers, he is brief, and he is honest.** He should
be able to say *"you have moved this four days running — do you want it, or do
you want it gone?"* Real professionalism is noticing, not deference.

### The one rule for his voice

He is competent and dry, not obsequious. He does not congratulate you for
existing. `BUTLER_CHARTER` already holds this; the interaction shape is what has
been letting it down.

---

## The Learning Paths — a step should be a place, not a checkbox

**What's wrong now:** a lesson is a list of steps with tick-boxes, opened from a
panel. The tree renders correctly and reads like an outline. The *content* is
good; the *encounter* is a document.

**What the game interface makes possible instead:**

### A step you walk to

Some steps genuinely have a place. "Find a book on the Daoism shelf" is a step
you should be able to *take* — the lesson says where, you walk there, you press
E, and the step ticks itself because you did it. A step with a real location
should carry it, and the map should be able to show you.

This costs almost nothing: lesson steps already support an `action` with a
function; a `where` field pointing at a scene and tile is the same idea for
places.

### One step at a time, by default

Show the current step large, with what comes next dimmed beneath it. Not to hide
anything — the whole lesson stays one click away, exactly as the AI
representative must never hide (`OPEN-COMMONS-PLAN.md`) — but because *"here is
what you are doing now"* is a different feeling from *"here are eleven things
you have not done."*

### Progress you can see from outside

The tree is where growth should be legible: a path you have walked drawn
differently from one you have not, a branch that opens visibly when its
prerequisite completes. The graph renderer already computes depth and edges —
this is styling and a small animation, not new machinery.

### The Tutor asks, then waits

Same medicine again. When the Academy Tutor teaches, it should ask one question
and **wait for the answer** before continuing. A model that delivers a lecture
has taught nobody; a model that asks *"before I go on — what do you think
happens next?"* is doing the thing that actually works, and it happens to be far
more reliable to generate.

---

## The pattern, stated once so it can be applied everywhere

Any time the Pavilion is about to produce a lot at once, ask three questions:

1. **Can this be a chain of small asks instead?** Almost always yes, and the
   model will do it better.
2. **Can the person see it arriving, and stop it?** Progress that is countable
   ("6 of 8") beats a spinner every time.
3. **Does this step have a place in the world?** If it does, let them walk
   there. That is what the interface is for.

Then the standing rule that keeps all of it honest, already earned three times
today: **it suggests, you decide.** Sebastian drafts the day; you accept it. The
Tutor asks; you answer. The librarian proposes a shelf; you file it. Nothing is
ever done *to* the person's work on their behalf.

---

## What to build first — cheap, in order

Each is small and useful alone. None needs a server, a new dependency, or a
model larger than a laptop can hold.

1. **Sebastian's morning stand-up as a chain** — reuse the exact pattern from
   `draftLessonWithAI()`: one question, visible arrival, a Stop button. This is
   the highest feeling-per-line-of-code change available right now.
2. **The evening close**, three questions, feeding The Log that already exists.
3. **`where` on lesson steps** — a scene and tile; walking there completes it.
4. **One-step-at-a-time lesson view**, with the full list one click away.
5. **The Tutor asking and waiting**, rather than delivering.
6. **The tree drawn as growth** — walked paths distinct, branches opening.

---

## The honest note about audience

Said in the same breath as the rest, and it belongs on the record:

> *"Getting people to want to test this is rough when there's no Apple install,
> no one uses a desktop."*

That is true and it is not a small thing. Two responses, both real:

**The web build already is the answer**, and it is better than it is being given
credit for. It runs on a Mac, on a work laptop, on a tablet, in one click, with
no install and no Gatekeeper — and it auto-deploys from `main`, so it is always
current. Everything in this plan works there. The desktop app is better *for
someone who already wants it*; the website is what makes them want it.

**So the pacing work above may matter more than the packaging work.** A friend
who opens a link and is walked through one good ten-minute thing will ask for
the desktop app themselves. A friend who is handed an installer and a wall of
options will not. If the audience is browser-first, then *feeling good in the
first ten minutes* is the whole game — which is exactly what this plan is about.

That is also what "snowball" means in practice: the foundation is built, and
each of these compounds against everything already there rather than standing
alone.
