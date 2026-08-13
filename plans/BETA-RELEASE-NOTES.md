**Sand Pavilion 0.1.0-beta.6** — a small world for reading, thinking, and the
quiet work of a day, kept entirely on your own machine.

This is a **beta**. Expect rough edges, and please tell me about them.

---

### Installing

Download `Sand Pavilion Setup 0.1.0-beta.6.exe` below and run it. It installs
for you only — no administrator password — and appears in the Start menu.

**Windows will warn you it doesn't recognise the app.** Click **More info**,
then **Run anyway**. That's because I haven't bought a code-signing certificate
(a few hundred dollars a year, hard to justify for a handful of testers), not
because anything is wrong. If you'd like to check the download:

```powershell
Get-FileHash "Sand Pavilion Setup 0.1.0-beta.6.exe" -Algorithm SHA256
# 966CB0D7F772B2854905F0C0529E5C97B51288C2A3C9EE061C5B7EA626C99B9B
```

Nothing else is needed. No Node, no Docker, no account, no key.

---

### Start here

There is a **🧭 New here? Start here** button on the title screen. It is five
stages and about ten minutes, and **the first one ends with a book you chose, a
note you wrote in your own words, and both of them in your bag.**

Take it. The Pavilion is a place rather than a menu, and the walk is the
shortest way to find out whether that suits you.

---

### What it is

A Library you fill yourself, a reader that will read aloud to you, a day
planner, a notes system where a thought from a book becomes a task, a
prerequisite curriculum you can add your own lessons to, and a set of residents
who will talk with you — **if** you give them a mind to think with.

**Nothing is uploaded, ever.** Not what you read, not what you write, not what
you plan, not a word you say to a resident. There is no account and no server;
the app makes **zero** network requests on startup. Sharing, when you want it,
happens by writing a file and handing it over.

---

### New in beta.6

**The residents speak at one rate, and you can stop them.** A reply used to
arrive at whatever speed the machine managed — a short answer crawled, a long
one flooded. Now it reveals at a **constant characters-per-second that belongs
to the character**, so the Mountain Monk is slower than everyone else because
that is who he is, not because his answer was longer. **⏸ holds it, ▶ resumes,
⏭ shows the rest at once.** Waiting on the machine is a cost and is now drawn
as one; the speaking rate is a choice and is drawn as speech.

**Every note says who wrote it.** Notes you typed and notes a model produced
were becoming the same grey text three days later. Each now carries its author
— you, or the model by name — visible wherever notes are read. **And a model is
never handed its own words back as yours**, which is the part that was quietly
distorting answers.

**Publishing asks why, once.** When you pass something on, one screen asks what
makes it worth passing on. It is optional and it is one press. Nothing leaves
your machine at any point — publishing writes a file for you to hand over.

**The AI panel tells you which failure it is.** Six different problems used to
produce one sentence. Now *nothing is switched on*, *nothing answered*, *it
answered but has no models*, *it timed out*, and *the model errored* each say
their own thing, with the one action that fixes that one.

**A lesson step can hold real teaching material** — paragraphs, not just a
title — and it survives being written, published and received by someone else,
which it did not before.

**Model guidance now matches measured hardware.** The panel used to suggest
"an 8–14B model, plus optionally one thinking model" for a strong card. Tested
on a 16GB GPU, a 12B model fills 13.8GB and spills the rest to shared memory,
where it does not fail — it **crawls**, which is much harder to diagnose. The
guidance now says what is true: **a 9B model is the honest ceiling on most
cards, and one model at a time.**

---

### The AI is optional

The Library, reader, read-aloud, notes, planner, lessons and the Inheritance
Hall all work with nothing installed. The residents — Quill, the Mountain Monk,
Sebastian, the Tutor — wake only when a local AI is running on your machine:
install [Ollama](https://ollama.com), pull a model, then press **Detect** under
*Manage AI connections*.

**Don't go looking up your laptop's specifications.** Open *Manage AI
connections* and press **Check this computer** — the Pavilion reads the machine
you're actually on and tells you whether it's worth doing, which model to get,
and the one line to type, ready to copy. On a small or old machine it will tell
you honestly not to bother, and it means it.

Two things worth knowing before you pull anything:

- **Every resident runs on the one connection you set up.** There is no
  per-resident routing, so one good default serves the whole place.
- **If you connect a cloud provider instead, your words leave this device**, and
  the chat header says so in plain language — `🏠 stays on this computer` or
  `☁ leaves this device` — on every conversation, not buried in a settings page.

There's a guide inside the app that explains all of it plainly — *Waking the
Residents*, on the Practice shelf.

---

### Known and deliberate

- **The Library starts empty, and that is the finished position.** Earlier betas
  shipped 27 texts. They are gone on purpose: a shelf of books nobody chose was
  doing the wrong thing to the whole idea, and it was hiding real bugs behind
  tidy fixtures. **You fill it** — drag any `.txt` or `.epub` onto the window.
  Standard Ebooks and Project Gutenberg are both free and both plain text, and
  the walk's first stage does the first one with you.
- **Missions, ranks and the Inner Grounds do not exist.** The walk's final stage
  says so outright rather than pointing at a door that opens onto nothing.
- **The two café boards are dormant** — they wait on a shared server that
  doesn't exist yet, and they say that when you open them.
- **One lesson is marked "being written"** because it is — Security 101.
  Everything else in the Learning Tree is real, including the full Electronics
  track: 101 (light an LED), 201 (measure for real, read a schematic, the
  transistor and the capacitor), and 301 — build a universal TV remote from
  scratch, in six stages that each end in something that works.
- **A lesson you haven't unlocked yet still opens, in full.** The prerequisite
  holds back the tick, never the reading.
- **The Course Board starts bare.** It's yours to pin.
- Read-aloud uses your operating system's voices; the list can take a moment to
  appear the first time.

---

### If you are coming from an earlier build

**Installing over it is safe** — your library, notes and save carry across
untouched, and nothing is deleted from a shelf you already filled. The empty
shelf above is about a *fresh* install.

**If you are still on beta.2, please replace it.** It had a bug that could undo
your filing work: sorting books onto shelves by hand and then using *Suggest
shelves* could overwrite those choices with no way back, and it silently stopped
after sixty books. Fixed since beta.3.

Since beta.3 the app also gained **its own database, with nothing to install** —
search every note you have ever written, matched by meaning as well as spelling
(search `walking`, find `walked`); a **Records Hall** that lists what you have
actually done, every entry a door to the real thing; and the **🔧 Bench** and
**🔬 Lab** for things you are making rather than claims you are weighing. It is
an *index* over your work, never a second copy of it — everything still lives in
your save, export still carries all of it, and if the database ever fails to
open the Pavilion says so plainly and keeps working without it.

---

### Telling me what happened

Press **Esc → ✍ Tell them what happened.** It asks the four questions worth
answering and writes the note for you, with the build number and whether an AI
was connected attached so it is actually useful.

**Nothing is sent from it.** It copies the note or saves it as a file, and you
decide whether to pass it on. You can read exactly what it includes before you
copy anything.

### What would help most

Tell me what confused you, what you expected that didn't happen, and where you
stopped. **Especially in the first ten minutes** — the walk is the newest thing
here and nobody outside this machine has ever taken it.

A beta isn't a smaller version of a finished thing — it's a finished thing with
the parts nobody has stood on yet, and you're the one standing on them.
