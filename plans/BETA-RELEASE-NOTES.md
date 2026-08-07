**Sand Pavilion 0.1.0-beta.5** — a small world for reading, thinking, and the
quiet work of a day, kept entirely on your own machine.

This is a **beta**. Expect rough edges, and please tell me about them.

---

### Installing

Download `Sand Pavilion Setup 0.1.0-beta.5.exe` below and run it. It installs
for you only — no administrator password — and appears in the Start menu.

**Windows will warn you it doesn't recognise the app.** Click **More info**,
then **Run anyway**. That's because I haven't bought a code-signing certificate
(a few hundred dollars a year, hard to justify for a handful of testers), not
because anything is wrong. If you'd like to check the download:

```powershell
Get-FileHash "Sand Pavilion Setup 0.1.0-beta.5.exe" -Algorithm SHA256
# E955FBE6A75B1219F83ED45287375C91E7602EF575D27BD71138E86D0AA72A28
```

Nothing else is needed. No Node, no Docker, no account, no key.

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

There's a guide inside the app that explains all of it plainly — *Waking the
Residents*, on the Practice shelf.

---

### Please replace beta.2 if you have it

**beta.2 had a bug that could undo your filing work**, found by real use. If you
had sorted books onto shelves by hand and then used *Suggest shelves*, it could
overwrite those deliberate choices with no way back, and it silently stopped
looking after the first sixty books. **That is fixed here**, and it now: only
touches books you haven't filed yet unless you tick a box, never stops early,
and always offers an undo. Installing this over beta.2 is safe — your library,
notes and save carry across untouched.

### New in beta.5 — the app has a real database now, and you install nothing

- **The Records Hall keeps your history, and it is finally yours.** It used to
  show five hand-written lines about the Pavilion itself, frozen last July.
  Now it lists what *you* have done — books you finished, things you built at
  the Bench, claims you investigated, experiments you ran, work you published
  — newest first, alongside the Pavilion's own history. **Every entry is a
  door**: click it and you land where the real thing lives. It stores no
  copies; if it can't establish when something happened, it leaves it out
  rather than guessing a date.

- **Search every note you have ever written, at once.** The one thing the old
  save file genuinely could not do. It matches by *meaning* as well as
  spelling: search `walking` and it finds the note that says `walked`. When it
  adds notes that way it tells you — *"+2 found by meaning as well as
  spelling"* — so you're never left wondering why something appeared.
- **The desktop app now carries its own Postgres.** Nothing to install, no
  Docker, no account. It costs **6 MB more to download** than beta.3 and about
  25 MB on disk once installed, and it opens behind the title screen so you
  never sit waiting for it. Docker used to be the price of having a database at
  all; now it only matters if you want the *text* of a very large library kept
  outside the app. The title screen says which one you're on, in one plain line.
- **Standing instructions finally offer every resident.** That panel has been
  showing an empty row of buttons since it was built — you could only ever set
  an instruction for whichever resident you happened to arrive from, and there
  was no way to discover the other six existed. Seven residents, all reachable.
- A book removed from Your Shelf no longer risks a dead redraw.

*Your save carries across untouched. The database is an **index** over your
work, not a second copy of it to keep safe — everything still lives in your
save, export still carries all of it, and if the database ever fails to open
the Pavilion says so plainly and keeps working without it.*

### New in beta.3

- **🔧 The Bench** (in the Science & Research Hall) — for things you're *making*
  rather than claims you're weighing: a circuit, a print, a repair. Every step is
  written in two halves — **what you expect, saved before you try it**, then what
  actually happened. You can't go back and improve the guess. That's the point.
- **🔬 The Lab** — a real room at last, up the Workshop's staircase twice, where
  the Maker's Bench used to be closed. It gathers your builds, datasheets, paper
  books, investigations and experiments in one place and holds none of them.
- **Datasheets and books you own on paper.** A shelf entry can now say what kind
  of thing it is. A datasheet gets a *lookup* — `ds tsop38238` at the Computer
  opens it. A book you own **on paper** has no text here and isn't supposed to:
  it stays findable and citable, and **the residents know you own it**, so the
  answer can be "you have that one, chapter 4, go and look."
- **Where a book came from** — the intake now explains the four honest kinds
  plainly (freely given / yours to hold / grey / never spread), and where the
  line actually is. It does not scan your disk and never will.
- The reader no longer prints the word "undefined" under books you added
  yourself, and the café's two closed boards now say they're **dormant by
  design** instead of asking you to configure a service you've never heard of.

### What's new since the first build

- **☀ Today** — a door in the pause menu that says what is actually waiting for
  you: what is overdue, the next step of something you started, a thing you have
  carried for days, a book you added and never opened. Five at most, each one
  press from the thing itself. Computed when you open it; nothing runs in the
  background and no AI is involved.
- **Sebastian's stand-up** — one question at a time instead of a form, then he
  brings you what is waiting rather than asking you to remember it.
- **🖥 The Computer** is now a real terminal index over your own library —
  `ls`, `find`, `papers`, `unread`, `analyses`, `open 3`. **No AI needed.**
- **📥 Bring a Book In** — a table beside Your Shelf that explains the whole
  thing: drag a file onto the window, where to get free books, and which folder
  on your disk the text lands in.
- **Sorting is mostly automatic now** — rules file the obvious books with no AI
  at all, and only genuinely ambiguous ones are ever sent to a model.
- **Coding 101** is written for real: six steps to your first change to the app
  itself.
- **Your Notes has a desk in the Study** — no longer only in the pause menu —
  and sorts four ways: newest, oldest, by where it came from, A–Z.
- **📑 Summarise this chapter** in the reader, beside *Analyze this page* and
  *Overall impression* — a page, a chapter, or the whole book, whichever you
  actually want. Summaries land in that book's notes.

### Known and deliberate

- **The Library starts small.** 27 texts: **6 complete source texts** (the
  Dhammapada, the Bhagavad Gita, three suttas), **11 written for the Pavilion**
  and whole as they stand, and **10 classics carried as summaries** — Meditations,
  The Republic, the Tao Te Ching and so on. Each of those ten says outright that
  it's a summary, names where the real text lives, and invites you to drag it in;
  the page then becomes the book. Filling it is the point, not a chore before it.
- **One lesson is marked "being written"** because it is — Security 101.
  Everything else in the Learning Tree is real, including the full Electronics
  track: 101 (light an LED), 201 (measure for real, read a schematic, the
  transistor and the capacitor), and 301 — build a universal TV remote from
  scratch, in six stages that each end in something that works.
- **A lesson you haven't unlocked yet still opens, in full.** The prerequisite
  holds back the tick, never the reading. If you already know the material,
  don't tick it — produce what it asks for.
- **The Course Board starts bare.** It's yours to pin.
- **The café boards are closed** — they wait on a shared server that doesn't
  exist yet.
- Read-aloud uses your operating system's voices; the list can take a moment to
  appear the first time.

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
stopped. A beta isn't a smaller version of a finished thing — it's a finished
thing with the parts nobody has stood on yet, and you're the one standing on
them.
