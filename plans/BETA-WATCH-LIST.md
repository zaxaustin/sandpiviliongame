# What to actually watch for in beta testing

Written **2026-07-28**, from: *"any pain points I should focus on in beta
testing?"*

Not a test plan — the machine-checkable things are already covered by
`npm test`, `test/live/preflight.mjs` and `test/live/packaged-boot.cjs`. This is
the list of things **only a person can tell you**, ordered by how much damage
they do if they are wrong.

---

## The one method that beats all of the questions below

**Watch someone use it for ten minutes and say nothing.**

Not a demo, not a walkthrough, not "let me just show you where that is." Sit
behind them, keep your mouth shut, and **write down every place they hesitate.**
A three-second pause is a finding. "Where do I…?" out loud is a serious finding.

It is uncomfortable and it is the highest-information hour available. Everything
below is a prediction; that hour is evidence.

---

## Tier 1 — the ones that lose a tester entirely

### 1. The first sixty seconds

They arrive through **SmartScreen's "Windows protected your PC"** with *Don't
run* as the default button. If you have not warned them in the same message as
the link, a meaningful number stop there and quietly assume it is malware.

Then: title screen → *Enter the Grounds* → the welcome panel → **and then what?**

**Watch for:** do they move? Do they know arrows/WASD? Do they find anything to
do without being told? The welcome says nothing here breaks by clicking around,
which is the single most important sentence in the app — check that it lands.

### 2. Day one has almost nothing in it

This is structural and worth being honest about with yourself. A new tester has:
no notes, no plans, no personal books, nothing carried over, no AI. Every
feature built around *accumulated* material has nothing to work with yet.

**☀ Today** on a genuinely fresh save now offers exactly one thing — *"The
Dhammapada, complete and ready to read — press 🔊 and it will read aloud to
you."* That is deliberate, and it was **wrong until today**: it used to say
"bring a book in" to someone who had just been handed 27 books, because the
fallback only looked at the personal shelf. Caught by running a fresh save
rather than a loaded one.

**Watch for:** does day one feel like a beginning, or like an empty room? If it
is the latter, the fix is not more features — it is a better first offer.

### 3. Do they try the AI, and what happens when they don't?

Most testers will not install Ollama. The whole design says that must be fine.

**Watch for:** does the app feel *complete* without it, or does it feel like a
demo of something gated? Every panel that says "no local AI connected" is a
small "you don't have the real version" message, and they add up.

The **Check this computer** button exists so nobody has to look up their own
specs, and it will honestly tell a weak laptop not to bother. **Watch whether
they find it** — and whether "don't bother" reads as respectful or as rejection.

---

## Tier 2 — the ones that make it feel unfinished

### 4. Ten of the 27 books are summaries

Meditations, The Republic, the Tao Te Ching and seven more. Each now says so,
names its source, and invites the real text — but **watch whether that reads as
honest or as disappointing.** It is the difference between "this is a library I
fill" and "this is half-empty."

### 5. Does anyone actually drag a file in?

This is the core loop of the entire project and it is one gesture. If testers do
not discover it, nothing downstream matters.

The **📥 Bring a Book In** table beside Your Shelf exists because the only
explanation used to be in the Workshop, three rooms away. **Watch whether they
find the table, and whether they try the drag without being told.**

### 6. The rooms they never enter

The Caravan Desk problem was real and it will not have been the only case. Track
which rooms a tester never walks into across a whole session. A room nobody
enters is either badly named, badly placed, or shouldn't exist.

Known suspects: the Science Hall (papers live there and nobody knows), the
Workshop's upper floors, the Café.

---

## Tier 3 — worth knowing, not worth chasing yet

- **Read-aloud** is the strongest zero-setup feature in the app. Watch whether
  anyone presses 🔊 unprompted.
- **Does the save feel trustworthy?** Do they believe it saved? Does anyone go
  looking for a save button?
- **The Learning Tree** — do they read it as a curriculum or as a menu?
- **Mac testers** get the website. Watch whether the browser version feels like
  the real thing or like a preview.

---

## The three questions worth asking afterwards

Short, and in this order. Anything longer and you get politeness instead of
information.

1. **"What did you expect to happen that didn't?"** — the single most useful
   question in software. It surfaces the model in their head, which is where
   every design fault actually lives.
2. **"Where did you stop?"** — not "what did you think." Where they stopped is a
   fact; opinions are guesses about facts.
3. **"Would you open it again tomorrow, honestly?"** — and if no, *"what would
   have to be different?"* Give explicit permission to say no; most people will
   not without it.

---

## What NOT to ask

- *"What do you think?"* — invites politeness, returns nothing.
- *"Do you like it?"* — they will say yes. It costs them nothing and tells you
  nothing.
- Anything about features they have not used. A tester's opinion of the
  Inheritance Hall having never opened it is noise, and acting on it is worse
  than ignoring it.

---

## And the one you have to run yourself

Nobody else can do this one, because it needs a Pavilion with real material in
it and a real ordinary day around it:

> **Open it tired, at the end of a normal day, with no agenda. Is there
> something worth ten minutes without having to decide what?**

If yes, the daily-use problem is solved and the rest is polish. If no, that is
the most important finding available and everything else should wait for it.

---

## Built 2026-07-28: the tester can now write the report

The guides told a tester to *"tell whoever gave you this"* — with no way to do
it. So reports would have arrived as half-remembered sentences, missing the two
facts that make them actionable: **which build, and whether an AI was
connected.**

**Esc → ✍ Tell them what happened** asks the four questions from this document,
in this order, and composes the note:

```
SAND PAVILION — a note from a beta tester

What I expected to happen that didn't:
I expected E to open the bookshelf
...
--- context (so the report is useful; nothing here identifies you) ---
Build:      0.1.0-beta.2
Running as: a browser
Local AI:   not connected
Own books:  0
Days used:  0
```

**Deliberately not telemetry.** Nothing is sent, nothing is collected, no server
is contacted. It copies the note or saves it as a file and the person chooses
whether to pass it on. The context block is shown **in full, on screen, before
anything is copied** — the same discipline as the prompt inspector: you can read
exactly what leaves, because the answer is only ever "whatever you paste
yourself."

Unanswered questions are marked `(not answered)` rather than dropped, so a
half-finished note is still honest about what it is.
