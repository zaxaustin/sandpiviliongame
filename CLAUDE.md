# Working on the Sand Pavilion

This file orients a fresh session, not a returning one — read it once,
then get oriented for real from the sources below rather than trusting
this summary alone.

## Before anything else (optional, recommended)

Before diving into code, consider reading
[`library-drafts/done/ganesha-and-the-campaign.md`](library-drafts/done/ganesha-and-the-campaign.md)
— the steward's own telling of why Ganesha is invoked before any real
undertaking, kept beside his statue in the Keep as a practice, not just
a myth. Sitting with it for a minute before touching code is never
required, but it's the right mindset for this particular project: it
asks to be built with care, not rushed. Optional every time. Recommended
every time.

## Get oriented, in order

1. **`MAINTAINING.md`** — the actual current-state reference: what's
   built, the invariants, the code map, the gotchas, the backend, and
   what's next. Read this first, every time. It stays a snapshot of
   *now*, not a changelog — trust it over your own guesses about what
   exists. (**`README.md` was rewritten 2026-07-27 as the new-user /
   beta guide** — it's the front door for someone who just downloaded
   the app, not the technical reference. Both move with a change; they
   answer different questions.)
2. **The most recent `archive/dev-log-*.txt`** — the narrative version
   of how the project actually got here, session by session. Worth
   skimming the last one or two for real context a static README can't
   carry (what was tried, what broke, what got learned the hard way).
3. **`plans/*.md`** — every open, real, staged plan for what's next.
   Check here before assuming something needs designing from scratch;
   it may already have a real plan written, sometimes already half
   built. `plans/BETA-TESTING-FEEDBACK.md` is the running log of actual
   issues found by actually using the Pavilion — check it before
   assuming a rough edge is undiscovered. Fully-built, closed plans live
   in `plans/done/` — kept for the record, out of the way of what's
   actually still open.
4. **`LEARNING-PATH.md`** — if the user asks a "why" or "how does this
   work" question, this self-paced curriculum (built around this exact
   project) is where that kind of explanation belongs, calibrated to
   where they've already gotten to.
5. **`MANUAL.md` and `PROTOCOLS.md`** — the user-facing layer (the
   visitor's handbook, and the fill-your-own-Pavilion protocols). When a
   feature changes what a *user* sees or does, these move with it —
   they're part of the definition of done, not an afterthought.

When you finish a real session of work, add to that day's
`archive/dev-log-YYYY-MM-DD.txt` (create it if the day doesn't have one
yet) and update `MAINTAINING.md`'s "What's next" section to match reality —
future sessions (yours or anyone else's) depend on both staying honest,
not aspirational.

---

## TEST THE PLAYER'S BOOKS, NOT THE SEED. Added 2026-08-03, twice earned.

At the steward's direct instruction, after he watched me do it twice in one
day:

> *"a few books are seeded correctly and another 100+ books are not seeded
> correctly but added to the in-game menu by the player himself — that should
> be the main pathway and also for testing."*

| how it got here | count | shape |
|---|---|---|
| shipped in `seed.js` | **27** | 6 with full text, hand-vetted, licence + source, real `doc.sections` |
| **added by the player** | **270+** | title/author read out of the file, no sections, text in MinIO *or* a desktop file *or* inline in the save |

**The player-added book is the normal case. The seed is the exception**, and
the gap only widens — a Library "built from scratch by its owner" is the whole
design.

**Why testing the seed proves almost nothing:** a seed book is *tidier* than a
real one in every way a test cares about. Clean sections, a known licence, a
guaranteed shape, text guaranteed present. Every rough edge that actually
breaks things — a missing author, an OCR scan, no contents block, a title that
is a filename, text that lives somewhere the backend never indexed — exists
only on the player's side.

**What that cost, on one day:**
- the chapter finder passed against six seed texts and was **wrong on 62% of
  the real 296** — 135 books finding zero chapters, 41 finding "the first
  four";
- fixed, and then every *interactive* test that afternoon ran against
  `dhammapada` and `tao-te-ching` again — the reader, the notes, the drop, the
  residents. The steward found the next bug himself, on **The Long Discourses
  of the Buddha**, a book none of it had touched.

**THERE IS A THIRD STORAGE PATH AND NOTHING INDEXES IT.** `shelveAsPersonal()`
tries MinIO, then a desktop file, then **inline in the save**. The Long
Discourses is in *neither MinIO nor Postgres* — it is inline. So even "294
books in the database" is not the library: it is the part the backend has
seen, because `tools/load-library.mjs` is a **manual snapshot and nothing
re-runs it**. Never quote a database count as if it were the shelf.

**So, concretely, when testing anything about books:**
1. Reach for a **player-added** book first — `library-sources/` on this machine,
   or the excerpts in `test/fixtures/chapters/` which were cut from real ones.
2. **Sweep the whole library** when changing a rule that applies to all of them
   (`tools/chapter-sweep.mjs`). "It works on the one I tried" is how both of the
   above happened.
3. A seed book is fine for checking a *panel opens*. It is not evidence about
   **content handling**, ever.

---

## LOOK AT IT. The single most useful habit here.

Added 2026-08-02, after a day where every serious bug was found by looking and
none were found by reasoning. **You can see the running game. Do it.**

```bash
npm run build:beta                       # or: npm run dev
npm run preview                          # serves dist/ on :4173
```

Then drive a real browser at it — `puppeteer-core` is a devDependency, and
system Chrome is already on this machine:

```js
import puppeteer from 'puppeteer-core';
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe';
const b=await puppeteer.launch({executablePath:CHROME,headless:'new',
                                defaultViewport:{width:1000,height:760}});
const p=await b.newPage();
p.on('pageerror',e=>console.log('PAGEERR',e.message));   // ALWAYS. Silent breakage is the norm here.
// seed a save BEFORE the first load, or you get the welcome screen
await p.evaluateOnNewDocument(s=>localStorage.setItem('sandPavilionSave.v2',s),
  JSON.stringify({seenWelcome:true, aiConnections:[]}));
await p.goto('http://localhost:4173',{waitUntil:'networkidle2'});
await p.click('#startBtn'); await new Promise(r=>setTimeout(r,1300));

await p.evaluate(()=>window.openLab());        // every panel fn is on window
await p.screenshot({path:'<scratchpad>/shot.png'});
```

Then **Read the .png**. You can see it. Working examples live in `test/live/`.

**Things this catches that nothing else does**, all real, all from one day:
- a packaged app that never booted (`base:'./'` missing) — the title screen
  rendered fine and the button did nothing
- three panels that could never be dismissed, because `hideAllOv()` was a
  hand-maintained list missing the newest ids
- a staircase that was only a *sign* — the warp tile drew as blank floor
- the word "undefined" printed under every hand-added book
- the café boards saying "needs a Supabase connection" to people who had never
  heard of Supabase

### Getting around inside a screenshot session
- `window.takeLift('workshop'|'workshopfloor2'|'workshopfloor3')` — jump floors
- every overlay opener is on `window`: `openLab`, `openScienceHall`, `openComputer`,
  `openMyLibrary`, `openCatalog`, `openIndex`, `openLearningTree`, `openMenu`…
- the terminal: set `#termIn`'s value then `window.termSubmit()` — and
  **re-query the input between commands**, the panel re-renders and the old
  node is detached
- reader/overlay open state is the class **`open`**, not `show`

---

## Hard-won rules, so they are not re-learned

1. **Test the artifact you ship, not the one you develop in.** Learned three
   times in one day. `npm run build:beta` then
   `env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/packaged-boot.cjs`
   before any installer goes anywhere. `npm run verify:release` checks the docs
   AND that the .exe is not older than the source.
2. **A guard that cannot fail is worse than no guard.** After writing a check,
   deliberately break the thing and watch it fail. Two checks written this week
   passed happily against the exact bug they were written for.
3. **Any hand-maintained list that must match another file WILL drift.** Derive
   it instead. `hideAllOv()` and the window-export block both bit on the same
   day, the same way. `npm test` now checks the export list in both directions.
4. **Silent failure is the house failure mode.** A button that does nothing, a
   panel that will not close, a drop that is ignored — nobody reports these,
   they just stop using the feature. Prefer a loud wrong thing.
5. **localStorage is per-origin.** `http://localhost:5173` (dev),
   `http://localhost:4173` (preview) and `file://` (packaged) are three separate
   saves. "My books vanished" is almost always this.
6. **`puppeteer.evaluateOnNewDocument` re-fires on reload** — it will overwrite
   the save you were about to verify. Carry the written save to a second page
   instead.
7. **Keep live tests small.** One passing 5 MB payload through puppeteer's
   serializer hung past 100 s. A test slow enough to skip is one you skip.
8. **Writing files:** bash heredocs mangle `\n` and backticks in JS. Write a
   Python patch script with the Write tool, run it, delete it. Commit messages
   go through `git commit -F <file>`.
   **Encode before you open for writing.** `open(p,'w').write(s)` truncates the
   target *first* and encodes second, so one bad character destroys the file and
   loses the whole session's edits — this ate `overlays.js` on 2026-08-03. Do
   `blob = s.encode('utf-8')`, then write a temp file, then `os.replace`. And
   never put an emoji outside the BMP in a Python `\uXXXX` escape (🌳 🗒 📕 are
   all surrogate pairs): paste the character, or use `\U0001F333`.
9. **electron-builder EPERM on `release/`:** an editor is watching the folder.
   Build to `$TEMP/sp-build` via `--config.directories.output` and copy back.

---

## The test suite, and what each part is for

```
npm test                                   # pure logic + config drift, ~1s, run always
node test/live/preflight.mjs               # 39 checks: old saves migrate, 33 panels open, ZERO network
node test/live/lab.mjs                     # the Lab, datasheets, the paper shelf
node test/live/bench.mjs                   # predict-before-you-look, and it cannot be edited after
node test/live/librarian-safety.mjs        # the data-loss bug that reached a real user
node test/live/bundle.mjs                  # a bundle is reviewed before anything lands
node test/live/study-chain.mjs             # the JOINTS: note→lesson→a path you walk→Today, book→dissection
node test/live/backend.mjs                 # the DB seam: a shelf you assigned is never overwritten
env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/packaged-boot.cjs
```

The `live/` ones need `npm run preview` running. `ELECTRON_RUN_AS_NODE` must be
unset or `require('electron')` returns a path string instead of the module.

## Five standing decisions, stated plainly so they don't have to be re-derived

**The desktop app is the main focus going forward.** This project runs
mainly as a real Electron app on the user's own machine now, not a
browser tab — see `plans/done/DESKTOP-APP-PLAN.md`. When a fix or a feature
has a browser-only version and a real desktop-native version (a save
dialog, spell-check, filesystem access), build for the desktop app
first and treat the web build (`sandpiviliongame.vercel.app`) as the
thing that shouldn't regress, not the thing being optimized for.

**Build it ourselves before reaching for a third party.** When
something new is genuinely needed, the default is to build it in this
codebase, in the open, rather than bolt on an external service or a
paid API — the same instinct already behind "no paid cloud API" for
text-to-speech, the hand-picked Caravan connectors instead of a general
scraper, and local-first AI as the whole point of the project, not a
fallback. This is slower up front and that's the actual point: **the
long path is the shortest path** — do it upright and properly the first
time, rather than fast now and rebuilt later. Reach for a third party
only when the alternative is genuinely not buildable in reasonable time
(a browser truly cannot do X), and say so plainly when that's the case,
the same honesty already applied to the Gutenberg/arXiv fetch wall.

**The low-res look is a resource choice, not a budget one — the sleeper
car, stated directly 2026-07-10.** Plain pixel art costs almost nothing
in CPU/GPU/RAM on purpose, so the machine's real resources stay free for
a local AI actually running, a much bigger Library actually indexed, and
real background work, all at once — see `plans/LIBRARY-GROWTH-PLAN.md`'s
"Why this can afford to be big" for the fuller version. Looks plain and
simple, deliberately not impressive, and is a real beast under the hood
once you look — that gap is the whole design, not a limitation to
apologize for. The actual tie-breaker anywhere a future choice seems to
trade "looks more impressive" against "does more, uses less": this
project already knows which side of that trade it's on.

**AI effectiveness comes before AI features or personalities, stated
directly 2026-07-10.** A resident that answers reliably in a plain voice
beats one with a rich personality that hangs, returns blank, or takes two
minutes. Fix the reply pipeline's reliability and speed before adding new
residents, new AI-flavored features, or extra character flourish. The
practical work tools (the course/lesson planner, the Computer, the
Research and Grant desks) carry a neutral `WORK_CHARTER`, not the
in-world residents' devotional `CHARTER`, precisely so they serve any
goal on its own terms rather than skewing every course toward the dharma
— see `plans/AI-INTEGRATION-NOTES.md` for the full accounting of how the
AI works and what it costs to run inside a game. (Its two once-live risks
were resolved 2026-07-11: replies/reasoning now stream live, and the
`bestLocalModel()` concern closed as guidance-not-downgrade — the Monk
keeps the largest installed model by standing rule, and the tiered
model-picking guide in `PROTOCOLS.md` Protocol 2 does the protecting.)

**Local and self-hosted, off Supabase — and build the Library from
scratch ourselves. Stated directly 2026-07-12.** The default backend is
*this machine*: book text in local MinIO (Docker, a 100 GB reserve), the
catalog local too, the whole Pavilion runnable with no cloud account at
all. The user is **not a fan of Supabase**; the direction is *off* it, not
toward it — see `plans/SELF-HOSTED-STACK-PLAN.md` (local Postgres + MinIO
in Docker now; a self-hosted VPS running the *same* stack later, only if a
shared Commons is ever actually wanted). Do **not** build a feature that
*requires* Supabase, or reach for any third-party service, unless we
genuinely cannot get it running ourselves in reasonable time — and say so
plainly when that's the case (auth is the one honestly hard piece; named,
not pretended away). This is the "build it ourselves" decision above,
sharpened to a concrete backend direction. The Library is meant to be
**built from scratch by its owner** — the Caravan tools, `library-inbox/`,
and the manual/drag-and-drop add paths already make a from-nothing library
the normal case, not a cloud you download; keep it that way.

**THE GAME IS A FRONT FOR A REAL TOOL. Stated by the steward
2026-08-03, and it reframes everything above it:**

> *"the game should be like a front for a real user interface that could
> rival a non-code IDE for a lay user"*

Read that as the standard to build to, not a metaphor. An IDE is not
impressive because it is pretty; it is **an index over everything you are
working on, plus fast, obvious ways to act on it.** Strip the code and that
is exactly what a person doing serious reading and thinking needs, and it is
what almost no consumer software gives them.

So the pixel-art rooms are the *skin*. Underneath, the parts map onto an
IDE's parts, and naming the mapping stops us building a toy:

```
project / workspace   ->  your Pavilion: the library, shelves, days, notes
file tree             ->  the Library, Your Shelves, the Index
search across all     ->  retrieval + the catalogue (now queryable)
go to definition      ->  a note -> its book -> its chapter -> the page
find all references   ->  "everything I wrote about this book/chapter"
command palette       ->  the Computer, and the request desk
extensions            ->  the residents, and the Caravan connectors
build / run           ->  a dissection, an analysis, a lesson you walk
version history       ->  the Log, the Bench's two-phase record
```

**What this makes true, and it is a real bar:**
- **Nothing may be a dead end.** Every artifact must be reachable *and*
  actionable from where you are looking at it. This is the "study chain"
  discipline generalised: everything produced must be able to become the
  input to the next thing.
- **One keystroke to anywhere** beats a beautiful room you have to walk to.
  A room still deserves its place in the world; it must never be the only
  door (learned the hard way with the Lab — built and unreachable is the
  same as unbuilt).
- **It has to flow like water** — the steward's own phrase and the current
  focus. Latency, modal traps, and buttons that quietly do nothing are the
  enemy, not missing features.
- **For a LAY user.** No terminal required, no config file, no jargon. The
  Computer teaches real commands *because it is fun*, never because it is
  the only way.

**The current focus follows directly, 2026-08-03: new users and beta
readiness.** Many books have been added; **notes, quick review of a book, and
doing your own analysis are the underbuilt half** — and they are precisely
the "find all references" and "build/run" of this IDE. That is the direction
of work now, not more rooms.

*(History worth knowing rather than hunting: a large number of books were
originally loaded by Claude as beta testing, before the epub filter existed.
That is the origin of the mismatch between the library build and later
hand-added books.)*

**The backend is real now, and here is what lives where. Stated
2026-08-03, when Postgres went in.** The reason for leaving Supabase was
never only "local-first" — the steward's own reason is sharper and it
governs the design: **Supabase did not allow AI integration on the
backend.** So the split is:

```
MinIO (Docker)     the book TEXT          ~296 books, 168 MB today
Postgres (Docker)  the KNOWLEDGE          cards, shelves, chapters, health
localStorage       YOUR day                days, notes, courses, progress
```

**Text is big, opaque and written once — object storage. What the Pavilion
knows *about* a book is small, queryable and edited constantly — a
database.** Before this, that second half lived in one browser key, which
is why sorting 300 books never felt like it stuck, and why a resident had
to be handed a pasted list of every title instead of asking a question.

`docker-compose.yml` + `tools/schema.sql` + `tools/load-library.mjs`.
**A chapter is a RECORD, not a recomputation** — it carries `source`
('toc' / 'headings' / 'numerals' / 'hand') and a `confirmed` flag, so a
detected list can be corrected by hand and a re-scan will never discard
what a person marked. That correctability is the entire difference between
a chapter you can cite and one you cannot.

**HOW THE DATABASE AND THE "RUNS WITH NOTHING" RULE ACTUALLY FIT
TOGETHER.** Revised 2026-08-03, when the steward asked whether the old
"no database" rule should go now that one is live. It should — but not
to "database required". The honest version maps onto **Two Pavilions**,
which is a decision already made:

- **This machine — the steward's own Pavilion: assume the database.**
  Docker is part of the setup here. Build features that need it, use it
  fully, and do **not** write a second implementation for a machine that
  is not this one.
- **The shareable beta: still runs with nothing.** Seed + localStorage is
  a complete Pavilion. That stays a release gate with a test
  (`test/live/backend.mjs`, plus the suites run with the container
  stopped), because it ships to people who have never installed a
  container.

**AND THE RULE THAT KEEPS THOSE TWO FROM ROTTING: a feature that needs
the database is ABSENT without it, never DEGRADED.** Absent, and it says
so plainly — like a room not yet built. One code path plus a visibility
check; never two implementations of the same feature.

That is not a style preference, it is this codebase's own scar. `store.js`
says why, about the hosted catalogue mirror it deleted outright:

> *"the fallback path was the only path anyone actually ran, which meant
> it was load-bearing while still being written and tested as a
> fallback."*

Two paths means the one you test is not the one that runs. Absent-or-
present has no second path to rot.

**Docker cannot be bundled into the installer** — Docker Desktop is a
separate multi-gigabyte install with its own business licensing, so "make
it part of the build" is not available in that form. The real option, if
the database ever needs to reach everyone, is an **embedded** one (PGlite
— Postgres compiled to WASM — or SQLite) shipped inside the Electron
app: no container, no setup, works for a stranger. Weaker than real
Postgres, and a decision worth making **after** it is clear which
database-backed features actually earn their place, not before.

**THE OLD RULE, KEPT BECAUSE IT IS STILL TRUE FOR THE SHIPPED BUILD: the
app must still run with every container stopped.** The beta ships to people who have never installed
Docker; seed + localStorage is a complete Pavilion. Postgres makes *this*
instance better and must never become something a stranger needs.

**Say "I don't know" — it is a feature, not a gap.** Stated by the steward
2026-08-03 about the chapter finder: *"i dont know or unable to summerize
is fine it leaves the user space to also contribute."* Where detection is
uncertain the Pavilion says so and offers the person a way to fix it,
rather than showing a confident wrong answer. A wrong chapter list is
worse than none, because a note cites it.

**Deterministic code first; the model only for what code cannot do.**
Already quoted at the top of `data/shelf-rules.js` in the steward's own
words — *"only having the units do the sorting, or the things we can't do
with Python."* `tools/library-audit.py` calls no model at all. Counting,
measuring, matching and de-duplicating are things code does exactly and a
language model does approximately, slowly, and at a cost in heat.

**Two Pavilions, kept distinct.** This dev machine is *the user's own*
instance — a personal desktop environment he wants maximum freedom to play
with, customize (display and all), and load up with a host of features
that make it genuinely useful in real life. That is deliberately different
from **"the Sand Pavilion for everyone"** — the shareable/forkable version,
which will need its own good plan (the bare-foundation-vs-personal-additions
seam in `plans/TOOL-COMMONS-PLAN.md`, the federation hopes). When building,
know which one a change serves: the personal instance can be as rich and
opinionated as he likes; the for-everyone version stays lean and neutral.
Both are real goals; they are not the same goal.
