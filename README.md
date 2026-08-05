# The Sand Pavilion

A small top-down world you walk around in — with a Library of real, readable
books, a desk for planning your day, a workshop for your own writing and
research, and residents who can actually talk back, using an AI running on
your own computer.

It's built like a game because a game is a good shape for a *place*. But the
point isn't to win anything. The point is a place to think, read, learn, and
keep your own work — one that belongs entirely to the machine it runs on.

**Three promises, and they're the whole design:**

1. **Nothing here can break by clicking around.** Every panel closes with Esc.
2. **Nothing phones home.** There is no account, no server, and no analytics —
   not as a policy, but because there is nothing built to send anything
   anywhere.
3. **It arrives mostly empty on purpose.** The shelves, the residents and the
   desks are finished; the *books*, the *AI*, and the *work* are yours to
   bring. Filling it is the activity, not the setup.

---

## Download it

### → **[Get the latest version here](https://github.com/zaxaustin/sandpiviliongame/releases/latest)**

Download `Sand Pavilion Setup ….exe` and run it. That is the entire setup — it
installs for you only (no administrator password), makes a Start Menu shortcut,
and opens in its own window. **Windows, 101 MB.**

> **On a Mac?** Open **[sandpiviliongame.vercel.app](https://sandpiviliongame.vercel.app)**
> instead — the same Pavilion, in Safari or Chrome, nothing to install and
> nothing to approve. A downloadable `.dmg` is coming; if you have a Mac and
> want to build one yourself, it's twenty minutes and
> **[`MAC-BUILD.md`](MAC-BUILD.md)** is the whole recipe.

**You need nothing else.** No account, no sign-up, no key, no Node, no Docker,
no AI. It works the moment it opens.

> ### One warning you'll see, and it's expected
>
> Windows will show a blue box: **"Windows protected your PC — unrecognised
> app."** The default button is *Don't run.*
>
> Click **More info**, then **Run anyway.**
>
> This happens because the installer isn't code-signed — a certificate costs a
> few hundred dollars a year, and this is a personal project given away free.
> It isn't a sign that anything's wrong. If you'd rather check the download
> anyway, each release lists a SHA-256 you can verify with
> `Get-FileHash <file> -Algorithm SHA256`.

**Just want a look first?** There's a browser version at
[sandpiviliongame.vercel.app](https://sandpiviliongame.vercel.app) — no install,
nothing saved to anyone's server. The downloaded app is the real one, though:
it reaches a local AI with no setup and stores your books as real files.

**Controls:** arrows or WASD to walk, `E` to interact, `M` to sit/lie/stand,
`Esc` for the menu. Everything saves by itself.

*(Prefer to build it from source? That's at the [end of this
file](#running-it-from-source) — the download is the way in for everyone else.)*

---

## Your first ten minutes

1. **Walk south into the Library.** Face a shelf, press `E`, pick a book, and
   read it. Several are complete, real books. Then press **🔊 Read aloud** and
   let it read to you — that works instantly, with nothing installed, and it's
   the fastest way to feel what this place is for.
2. **Press `Esc` → 🗒 Your Notes** and write one line. It saves as you type.
3. **Go into the Study** (its own door on the Grounds) and set an intention for
   the day at the Writing Desk.
4. **Walk southwest, down the lane, to the Inheritance Hall** — a walled court
   of bare sand. It's empty until someone plants something in it. There are
   three gifts waiting at the Record Stone; put one in the ground.
5. **Fish at the pond.** No reason. It's nice.

None of that needs an account, an internet connection, or an AI.

The full room-by-room guide — every desk, every resident, what each one is for
— is **[`MANUAL.md`](MANUAL.md)**, written for someone non-technical.

---

## The map

| Where | What's there |
|---|---|
| **The Grounds** | The outdoors that joins everything. A fishing pond, deer, and every door. |
| **The Library** (south) | Two floors of shelves, a reading nook, and **Your Shelf** for books you bring. Bigger inside than out. |
| **The Study** | The Writing Desk (your day), the Course Board, the Computer, the Request Board. |
| **The Workshop** (east) | Sebastian the butler, his calendar, and the Archive / Research / Caravan desks. Three floors. |
| **The Café** | The outward-looking room — and **the Commons Table**, where shared work lives. |
| **The Keep** (north) | The temple: the shrines, and the eight signs of the Eightfold Path as a reflection you keep adding to. |
| **The Inheritance Hall** (southwest) | A sand court where you plant things for whoever comes next. Arrives empty. |

---

## Making the residents talk

**This part is optional, and it's genuinely fine to skip.** Out of the box the
residents say scripted lines. To have real conversations you connect an AI
**that runs on your own computer** — it isn't ours, we never see it, and it
works with no internet once installed.

**Don't go looking up your laptop's specifications.** Press `Esc` → **⚙ Manage
AI connections** → **🔍 Check this computer**. The Pavilion reads the machine
you're actually sitting at and tells you in plain words whether this is worth
doing here, which model to get, and the exact line to type — with a Copy
button. On a small or older machine it will tell you honestly **not to bother**,
and it means it: everything above this section works without any of it.

1. **Install [Ollama](https://ollama.com)** (or `winget install Ollama.Ollama`).
2. **Run the line the app gave you** — something like `ollama pull llama3.2:3b`.
   A few gigabytes will download, so make tea. **Avoid "thinking" models**
   (`deepseek-r1`, `qwq`, `qwen3.5`) at first: they pause a long time before
   replying, which feels broken when it isn't.
3. **Press Detect** in that same panel. It looks only at your own machine. Now
   go and talk to Quill in the Library.

**On a laptop:** plug it in first — nearly all of them slow down deliberately on
battery — and expect the fans. The very first question after starting up is
always the slowest; that's the model loading into memory.

*(In a browser — not the desktop app — you also need
`setx OLLAMA_ORIGINS "http://localhost:5173,http://localhost:5174"` and a
terminal restart. The desktop app skips this entirely.)*

You can also connect a cloud provider (Claude, ChatGPT, Grok) with your own
key, if you'd rather. Everything is labelled 🏠 local or ☁ cloud so it's always
clear whose machine a conversation is happening on.

---

## Filling your Library

The Pavilion ships with **27 texts** — 6 complete source books (the Dhammapada,
the Bhagavad Gita, three suttas), 11 written for the Pavilion itself, and 10
classics carried as summaries. **Those ten say so when you open them**, name
exactly where the real text lives, and invite you to bring it in. Do that once
and the same page becomes the whole book.

**The easiest way — drag a file onto the window.** A `.txt` or an `.epub`,
dropped anywhere on the Pavilion, lands on your own shelf and is readable
immediately. No dialog, no import wizard. If a website has no tidy way to send
you a book but your browser can download one, this still works — that's the
point.

**Not sure how any of it works?** Walk into the **Library** and find
**📥 Bring a Book In**, the table beside Your Shelf. It explains dropping a
file, offers a type-it-in-by-hand form, lists where to actually get free books,
and tells you exactly which folder on your disk the text ends up in.

**Or, with more control:** Workshop → the **Caravan Desk** → *"Add a text by
hand."* One, or a whole pile at once, and you pick the shelf. If it came from a
site the Pavilion knows, title, author and license fill themselves in; if not,
**type the source yourself, or leave it blank.**

**Your Shelf is yours.** A personal copy needs no license and no source —
that's your business, not anyone else's. A license only matters for something
you intend to *share*, and the form says so where it matters.

**Make your own shelves.** Walk up to Your Shelf in the Library and it opens
**👤 Your Library**. The building's own shelves are lineages (Theravada, Daoism,
Classics) and won't fit a real collection, so name your own — *Electronics*,
*Work*, *Recipes*, *Papers to read* — and file books onto them in bulk: search,
tick several, move them all at once. Anything unsorted sits under **Unfiled** so
you can see the size of the job. Renaming a shelf carries its books; removing
one returns them to Unfiled. Nothing is ever deleted by tidying.

**Where to find free books:** [`LIBRARY-GROWTH-PLAN.md`](plans/LIBRARY-GROWTH-PLAN.md)
lists sources checked for license, not just "free to read" — Project Gutenberg,
Standard Ebooks, SuttaCentral, and more. [`PROTOCOLS.md`](PROTOCOLS.md)
Protocol 1 is the step-by-step.

---

## What's yours, and what's shared

Three words, used the same way on every screen:

- **👤 Yours** — private to this machine. Nothing sends it anywhere, ever,
  unless you personally do.
- **🤝 Shared by you** — you wrote it out as a file and gave it away. Your
  original stays yours.
- **🏛 Commons** — written by someone else, or shipped with the Pavilion. It
  carries an author and a license, like any book on a shelf.

**The rule underneath all three: nothing moves by itself.** There's no sync and
no upload — and no server for there to be one to. Something becomes shared
because you deliberately wrote a file and handed it to a person.

There are two places to do that, and they're different on purpose:

- **The Commons Table** (Café) — publish a **paper**, a **lesson plan**, or a
  **course** as a packet anyone can use. Three come with the Pavilion.
- **The Inheritance Hall** (southwest) — leave a **bequest**: a book
  collection, a seed holding your notes, or a course set behind a trial, for
  whoever finds it. Some can be buried until the finder has done the work.

---

## Where your things are actually kept

No mystery, and worth knowing before you put real work in:

| What | Where it lives |
|---|---|
| Your days, notes, courses, progress | Your browser's own storage on this device (`sandPavilionSave.v2`) |
| Books you added — the **text** | A real file in the app's own data folder. (If you run Docker + MinIO, they go there instead — see below.) |
| The books that shipped with it | Inside the app itself |
| The **index** over all of it | A real Postgres database inside the desktop app, in its data folder. Nothing to install. |
| Everything else | Nowhere. There is nowhere else. |

**The desktop app carries its own database, and you install nothing to get
it.** It is an *index* over your work — your books' cards, shelves and
chapters, and your notes — which is what makes "search every note I have ever
written" possible at all, and makes it search by meaning rather than by
spelling. Your save is still the thing that holds your work; the index is
rebuilt from it. If the database ever fails to open, the Pavilion says so and
keeps working without it.

The browser version has no database — that's the real difference between the
two, along with how many books each can hold.

**Pause menu → Your Data** shows all of it: how big your save is, every kind of
data in it, and one plain sentence on whether each can ever leave this machine.
The list is generated from the code itself — the build fails if a new kind of
data is ever added without a line explaining itself.

**Back it up.** Pause menu → **⬇ Export save** writes your entire Pavilion to
one `.json`, including the text of books you added. Import it on another
machine and you're back. That's the whole backup story, and it's the same file
either way.

---

## Optional layers — add what you want, in any order

The app works with none of these. Each is one step, and each degrades to
something honest.

| Layer | What you install | What it gets you | Without it |
|---|---|---|---|
| **1 · Local AI** *(do this first)* | Ollama + one model | The residents talk back. The single biggest change. | Everything else works; residents stay scripted. |
| **2 · Docker + MinIO** | Docker Desktop | Books stored in real object storage with room to grow — a proper library, inspectable and backup-able. | Books save as ordinary files in the app's data folder. Perfectly durable. |
| **3 · Your own setup** | whatever you already run | Point it at an Ollama on another machine, LM Studio, your own S3. | The built-in local defaults. |

**Docker is not required and never will be.** It earns its place when a shelf
becomes a library. Setup is in
[`LIBRARY-SCALING-PLAN.md`](plans/LIBRARY-SCALING-PLAN.md).

**Docker is not how you get a database.** It used to be, and that changed on
2026-08-04 — the desktop app now carries its own Postgres, so searching your
notes, shelving, and chapter marks all work on a plain install with nothing
running beside it. What Docker still buys is **room for the book text** (MinIO
holds it outside the app, so the ceiling stops being your disk's idea of a
reasonable folder) and **one database two machines can share**. If you already
run it, the Pavilion will use it and say so. If you don't, you are not missing
a feature.

---

## When something's off

| What you see | Almost always |
|---|---|
| "No local AI detected" | Ollama isn't running — check the system tray, or run `ollama serve`. In a *browser*, also the `OLLAMA_ORIGINS` step. |
| A reply takes minutes, or comes back blank | A "thinking" model. Switch to `llama3.2`. |
| Replies are slow in general | The model's too big for the machine. Drop a size. |
| Windows warns about the publisher | Expected — unsigned on purpose, not a safety problem. |
| A panel seems stuck | `Esc`. Worst case, return to the title screen and walk back in; your save is already written. |

Anything else, or something that just feels wrong: that's genuinely useful, and
it goes in [`BETA-TESTING-FEEDBACK.md`](plans/BETA-TESTING-FEEDBACK.md).

---

## Learning how any of this works

You don't need to know how a single piece of this works to use it. But if you
want to:

- **[`LEARNING-PATH.md`](LEARNING-PATH.md)** — a self-paced curriculum built
  around this exact project: the terminal, HTML/CSS/JS, git, local AI, Docker,
  databases. Start at whatever stage is honest for you.
- **[`AI-BACKEND-WALKTHROUGH.md`](AI-BACKEND-WALKTHROUGH.md)** — a plain-English
  trace of a message becoming a reply, with the real files named.
- **The Academy** (pause menu → 🎓) — a tutor that teaches, quizzes you, reviews
  your work, and helps plan a lesson, on your own local model.
- **[`PROTOCOLS.md`](PROTOCOLS.md)** — how to fill your own Pavilion: adding
  books, connecting AI, the terminal toolkit.

---

## Running it from source

Only if you want to change it, or you'd rather build it yourself than trust an
installer. You'll need [Node.js](https://nodejs.org):

```bash
npm install
npm run electron:dev      # the desktop app, with live reload
npm run dev               # or just the browser version
npm test                  # the smoke suite — fast, no browser needed
```

To build an installer of your own:

```bash
npm run electron:build:beta
```

Use the `:beta` script, **not** the plain `electron:build` — the beta one reads
`.env.beta`, which empties every service variable so the build ships local-only.
`scripts/verify-beta-build.mjs` runs inside it and fails the build if a cloud
host or anything key-shaped ends up in the bundle.

Before handing any build to another person, run the guard that exists because
the packaged app once silently didn't work at all:

```bash
env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/packaged-boot.cjs
```

Exit code 0 means it boots, starts and opens panels. Anything else means don't
send it.

---

## For maintainers

Architecture, invariants, the code map, the backend plan, release steps and
what's next are in **[`MAINTAINING.md`](MAINTAINING.md)**. Every open plan is
in [`plans/`](plans/); the build history is in [`archive/`](archive/). How to
hand the app to someone is [`SHIPPING-THE-BETA.md`](plans/SHIPPING-THE-BETA.md).

MIT licensed. Everything shelved carries its own license and source.

---

*Everything turns to sand, so give it away first.*
