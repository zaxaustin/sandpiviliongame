**Sand Pavilion 0.1.0-beta.7.2** — a small world for reading, thinking, and the
quiet work of a day, kept entirely on your own machine.

This is a **beta**. Expect rough edges, and please tell me about them.

---

### Installing

**Windows:** download `Sand Pavilion Setup 0.1.0-beta.7.2.exe` below and run it.
It installs for you only — no administrator password — and appears in the Start
menu.

**macOS:** `Sand Pavilion 0.1.0-beta.7.2 arm64.dmg` (Apple Silicon — M1 and
later) or `… x64.dmg` (Intel Macs). It is **not notarised**, so macOS will
likely say *"Sand Pavilion is damaged and can't be opened"* — that is what it
says about every unsigned app, and it is not true. **Right-click the app →
Open → Open.** Only needed the first time. If it still refuses:
`xattr -dr com.apple.quarantine "/Applications/Sand Pavilion.app"`.

**Or neither:** [sandpiviliongame.vercel.app](https://sandpiviliongame.vercel.app)
is the same Pavilion in a browser tab, nothing to install. **A tab holds about
nine average books** rather than 500 — measured, not estimated: a browser keeps
every book's text in one ~5 MB store, and the Pavilion now refuses the tenth
politely instead of letting the browser throw. Illustrated books keep their
cover in a tab but not their figures, for the same reason. Reaching a local AI
from a browser needs `OLLAMA_ORIGINS` set; everything else is the same.

**Windows will warn you it doesn't recognise the app.** Click **More info**,
then **Run anyway**. That's because I haven't bought a code-signing certificate
(a few hundred dollars a year, hard to justify for a handful of testers), not
because anything is wrong. If you'd like to check the download:

```powershell
Get-FileHash "Sand Pavilion Setup 0.1.0-beta.7.2.exe" -Algorithm SHA256
# B480C7489D86A0E649F29B1016BBB0EEC61362FFF7986F0209BDD607B4ED3577
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

### beta.7.2 — the same Pavilion, cut properly

**Nothing in the app changed.** 7.2 does exactly what 7.1 does, byte for byte
in the source: `git diff` across `src/`, `electron/` and `index.html` between
the two is empty. If you already have 7.1 installed and it is working, there is
no reason to update.

It exists because the *release* around 7.1 was wrong in ways worth fixing at the
root rather than patching:

- The **tag** pointed at the previous version's code, so the release page
  offered a 7.1 download beside a "Source code" link containing beta.7.
- The **installer workflow had never once passed** — not for beta.6, beta.7 or
  7.1. `electron-builder` publishes on its own when it sees CI *and* a tag, and
  wants a token this workflow deliberately does not have. One flag. **The macOS
  dmg had therefore never been built at all**, despite the notes above offering
  one.
- `npm test` had been **failing on every clean checkout** for weeks, because two
  guards read `library-sources/`, which is gitignored. They skip loudly now.
  Green here and red there is the worst kind of failure to chase.
- The **release gate compared file timestamps**, which git rewrites on any
  checkout — so it called a perfectly current installer stale. It compares the
  actual source against the commit the build recorded now.

So: same software, and this time the tag, the hash, the download and the source
all agree, and CI builds both platforms from a clean clone.

---

### New in beta.7.1 — the first press, and books that keep their pictures

A friction pass. No new rooms; the things that made the Pavilion feel unfinished
to somebody arriving for the first time.

**The button for first-time visitors was invisible.** The title screen's
**🧭 New here? Start here** opened the welcome panel *behind* the title screen —
so the one control in the whole application addressed to a newcomer was the one
that looked broken. It works. So does **← Back** in the Connections panel, which
had the same fault.

**Illustrated books keep their illustrations.** An `.epub` full of diagrams used
to arrive as text alone, silently — a drawing book reduced to captions for
pictures that weren't there. Now the figures come in with the text and sit on
the page where they belong, the cover shows beside the book in the Index and on
the shelf, and **the book always says what it kept**: how many illustrations
came with it, and plainly when some could not be.

**The arrows work in a book.** ← → turn the page, ↑ ↓ scroll it. They used to do
nothing at all — not move you, not turn a page, not even scroll — while
PageUp/PageDown quietly still worked, which is what made it feel broken.

**The player no longer walks off on their own.** Losing focus mid-step — alt-tab,
another window — used to leave a direction stuck down.

**An empty Library now explains itself.** The shelves start empty on purpose, and
the Library says so, points at the table that brings a book in, and names where
free books come from. Quill has stopped giving tours of shelves that aren't
there.

**Removing a book actually removes it**, and a book you added twice no longer
appears twice in the Index.

**In a browser tab**, the Pavilion now refuses a book *before* the tab runs out
of room rather than after, and says how to get past it. A tab holds about nine
average books — the deployed site also has a **📚 See a demo shelf** button that
fills it with real public-domain books and two real courses in one press, and
clears again just as easily.

---

### New in beta.7 — a warmer voice, and a course you can actually walk

**A neural voice that reads like a person** *(desktop app, entirely optional)*.
The voices your computer ships with sound like a satnav. At the bottom of
**🔊 Voice settings** the desktop app now offers **Kokoro**, a small neural voice
that runs on your own processor:

- **88 MB, downloaded once**, when you press the button. Nothing is bundled in
  the installer, and it lands in your own data folder.
- **After that it never touches the network again** — not once, including with
  the machine offline. Verified by breaking the network and reading a book.
- **Four voices**: *Heart* and *Bella* (American), *Michael* (American, the
  steady one for long chapters), *Emma* (British).
- **It starts about two and a half seconds after you press read-aloud**, then
  stays ahead of you. The system voice starts instantly — that is the trade.
- **⏱ Check this computer** reads a sentence and times it, and tells you plainly
  whether *this* machine can keep up. On a slow laptop it says so rather than
  stuttering and letting you think the feature is broken.
- **Switch back with one press**, and **🗑 Remove the download** frees the disk.

The system voice stays the default and never stops working.

**Your residents will text you.** Sebastian, Quill and the Mountain Monk now
leave notes when they notice something while you work — on the little phone card
in the corner you already know from pocketed conversations. Sebastian offers to
hold one small thing on your board; Quill tells you which of a course's texts are
not on your shelf, and says plainly that fetching them is your part. And the Monk
will tell you, at some length, to go outside and eat something.

It is one-way, like a pager — each note has a button that opens the real
conversation. Sparse by construction: one note per thing, ever, and only one
waiting per resident. **None of it needs an AI**, and nothing is sent anywhere.

**Today's tasks now say which kind they are** — 🎓 learning or 🌿 personal — so a
course's homework and the rest of your life read apart on one board. Nothing
about it repeats: tomorrow still starts empty, and yesterday's work is one press
away when you want it.

**And finishing a course says so.** Walk every module and the board acknowledges
it, with the doors that actually exist — your work on it, the folder on disk,
handing it on. There is deliberately no rank and no unlocked door: that would be
a door onto nothing.

### The rest of beta.7 — a course you can actually walk

**Every module now says what gets you to the next one.** Reading a module and
knowing what to *do* were different things, and the second was missing: `✓ Mark
this module done` was a button you pressed on a hunch. There is now a short
checklist under each open module — read the book, write notes as you read, do
the homework, keep it up for the days the course asks for — and **it fills
itself in from what you have actually done.** Nothing to tick, nothing stored,
nothing to go stale. It counts the pages you reached, the notes you wrote, the
attempts you kept, and the distinct *days* you kept them.

**And it admits what it cannot see.** Whether you can rebuild the theory from a
blank page is not a thing a program can check, so those lines sit under their
own heading — *"and these are yours to say, nobody can check them for you"* —
with no tick at all. A checklist that pretended to know would be believed.

**A course can become today's work.** `📋 Take this into today` turns what is
left of a module into today's tasks, each with a door to the room where it
happens. The course and the day never touched before this. It carries only the
things a program can check; the honest ones stay with the module where they
belong.

**The Learning Desk** — new since beta.6, and this is its first release. It is
a room for *doing* a course rather than reading one: the blank page comes
first, before any help is on the screen; what you write is kept and you can
look back over every attempt; and each course becomes a **real folder of plain
Markdown on your disk** that you can open, back up, or read without this app.

**You can hand homework in to be marked** — *meets the bar · not yet · cannot
tell from this*, never a score. It marks against the bar the course's own
author wrote, quotes your own words back, and when it is short it says exactly
what is missing and gives **one** piece of extra work. It changes nothing: not
your words, not whether the module is done. Those stay yours.

**A module now has a contract.** Courses can state `**Theory:**` (what to
rebuild from scratch, not recall), `**By the end:**` (the level when this part
is finished, said *before* you start), and `**Repeat:**` (*"once a day for 20
days"*, with a plain tally of days kept — not a streak, nothing to break).

**And there is somewhere to send what you find.** *Tell them what happened* has
asked four good questions since the first beta and then left you holding a note
with nowhere to put it. It now points at the
[discussions page](https://github.com/zaxaustin/sandpiviliongame/discussions)
and an email address. Nothing is sent from the app — it still writes a note you
copy, and you choose where it goes.

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

**There is now a way in for a computer that cannot run a model at all.** If
*Check this computer* tells you not to run one locally — an older laptop, a
MacBook Air, 8GB shared with everything else — it now offers the other door in
the same breath: **Ollama can run the model on its own machines instead.**
`ollama signin`, `ollama pull gpt-oss:20b-cloud`, press **Detect**, choose it.
Both lines are on screen with a Copy button. No API key is ever pasted into the
Pavilion; it arrives through the same local Ollama, and a hosted model is
**offered but never picked for you.** It answers in about a second.

The trade is stated wherever it is offered: **what you type to a resident is
sent to Ollama's servers and answered there.** Your library, your notes, your
day and your whole save never leave this computer — but the conversation does,
and the chat header says `☁ leaves this device` on every message.

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
you honestly not to run one locally, and then show you the hosted way in
instead (see above) — so "my computer can't do this" is no longer the end of
the road.

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
