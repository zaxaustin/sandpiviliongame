**Sand Pavilion 0.1.0-beta.2** — a small world for reading, thinking, and the
quiet work of a day, kept entirely on your own machine.

This is a **beta**. Expect rough edges, and please tell me about them.

---

### Installing

Download `Sand Pavilion Setup 0.1.0-beta.2.exe` below and run it. It installs
for you only — no administrator password — and appears in the Start menu.

**Windows will warn you it doesn't recognise the app.** Click **More info**,
then **Run anyway**. That's because I haven't bought a code-signing certificate
(a few hundred dollars a year, hard to justify for a handful of testers), not
because anything is wrong. If you'd like to check the download:

```powershell
Get-FileHash "Sand Pavilion Setup 0.1.0-beta.2.exe" -Algorithm SHA256
# FB0948071A6009D3FEADFE8EED7019D8613870348113DF6A6E39180565FF670B
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

### Known and deliberate

- **The Library starts small.** 27 texts: **6 complete source texts** (the
  Dhammapada, the Bhagavad Gita, three suttas), **11 written for the Pavilion**
  and whole as they stand, and **10 classics carried as summaries** — Meditations,
  The Republic, the Tao Te Ching and so on. Each of those ten says outright that
  it's a summary, names where the real text lives, and invites you to drag it in;
  the page then becomes the book. Filling it is the point, not a chore before it.
- **Three lessons are marked "being written"** because they are.
- **The Course Board starts bare.** It's yours to pin.
- **The café boards are closed** — they wait on a shared server that doesn't
  exist yet.
- Read-aloud uses your operating system's voices; the list can take a moment to
  appear the first time.

---

### What would help most

Tell me what confused you, what you expected that didn't happen, and where you
stopped. A beta isn't a smaller version of a finished thing — it's a finished
thing with the parts nobody has stood on yet, and you're the one standing on
them.
