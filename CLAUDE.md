# Working on the Sand Pavilion

Streamlined 2026-08-04 at the steward's request — *"keep the best pratices and
cut the waist."* The long version, with the full reasoning behind every rule
below, is kept at [`archive/CLAUDE-full-2026-08-04.md`](archive/CLAUDE-full-2026-08-04.md).
When a rule here seems arbitrary, the story is in there.

Optional every time, recommended every time: read
[`library-drafts/done/ganesha-and-the-campaign.md`](library-drafts/done/ganesha-and-the-campaign.md)
before starting. This project asks to be built with care, not rushed.

---

## Get oriented, in order

1. **`MAINTAINING.md`** — what's built, the invariants, the code map, what's
   next. A snapshot of *now*. Trust it over your own guesses.
2. **The latest `archive/dev-log-*.txt`** — what was tried, what broke, what was
   learned. A static README can't carry this.
3. **`plans/*.md`** — open plans. Check before designing anything from scratch;
   it may already be planned, or half built. `plans/BETA-TESTING-FEEDBACK.md` is
   real issues from real use. Closed plans are in `plans/done/`.
4. **`LEARNING-PATH.md`** — for "why" / "how does this work" questions.
5. **`MANUAL.md`, `PROTOCOLS.md`** — the user-facing layer. A feature that
   changes what a *user* sees moves these too. Part of done, not an afterthought.

## Session workflow

1. Read `MAINTAINING.md` → **What's next**.
2. State the **single focus** in one plain sentence before touching code.
3. Prefer **player-added books** over seed books for any library/reader work.
4. After a UI, packaging or storage change: **build what you ship and look at
   it.** Reasoning is not evidence.
5. End by updating `MAINTAINING.md`'s "What's next" and the day's
   `archive/dev-log-YYYY-MM-DD.txt`.

---

## The rules that were paid for

**1 · TEST THE PLAYER'S BOOKS, NOT THE SEED.** 27 books ship in `seed.js`; 270+
were added by the player, and that gap only widens. A seed book is tidier in
every way a test cares about — clean sections, known licence, guaranteed shape.
The chapter finder once passed on six seed texts and was **wrong on 62% of the
real 296**. Use `library-sources/`, or `test/fixtures/chapters/`. Sweep the
whole library when changing a rule that applies to all of them.

**2 · LOOK AT IT.** Every serious bug this project has had was found by looking,
none by reasoning.

```bash
npm run build:beta && npm run preview      # dist/ on :4173
```

Then drive real Chrome at it (`puppeteer-core` is a devDependency; working
examples in `test/live/`). Always attach `page.on('pageerror')`. Seed the save
*before* the first load. **Then read the .png.** This caught: a packaged app
that never booted, three panels that could never be dismissed, a staircase that
was only a sign, "undefined" under every hand-added book.

**3 · BREAK EVERY NEW GUARD ON PURPOSE.** Write the check, then break the thing
it guards and watch it fail. Guards born dead here: a prompt-budget check that
parsed apostrophes in *comments* as quotes; a window-export check a *comment*
could satisfy; a chapter-landing check that passed because the reader was
already on the page.

**4 · DERIVE ANY LIST THAT MUST MATCH ANOTHER FILE.** `hideAllOv()`, the window
exports and the resident roster have each drifted. `npm test` now checks them.
The same applies to **anything handed to a model**: every list in a system
prompt is capped and names its remainder, or it grows with how much the visitor
has done — the Monk once carried all 294 books on every message.

**5 · SILENT FAILURE IS THE HOUSE FAILURE MODE.** A button that does nothing, a
panel that won't close, a door onto nothing. Nobody reports these; they just
stop using the feature. Prefer a loud wrong thing.

**6 · SAY "I DON'T KNOW".** *"i dont know or unable to summerize is fine it
leaves the user space to also contribute."* A wrong chapter is worse than none,
because a note cites it. Where detection is uncertain, say so and offer a way
to fix it by hand.

**7 · DETERMINISTIC CODE FIRST.** Counting, measuring, matching and
de-duplicating are things code does exactly and a model does approximately,
slowly, and hot. The model is for what code cannot do.

**8 · TEST THE ARTIFACT YOU SHIP.** `npm run build:beta`, then
`env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/packaged-boot.cjs`
before any installer moves. **Never plain `electron:build`** — it bakes
`.env.local` keys into the installer. `npm run verify:release` checks the docs
*and* that the .exe isn't older than the source.

### Gotchas that cost a session each

- **localStorage is per-origin.** `:5173`, `:4173` and `file://` are three
  separate saves. "My books vanished" is almost always this.
- **`evaluateOnNewDocument` re-fires on reload** — it overwrites the save you
  were about to verify. Carry it to a second page instead.
- **Keep live tests small.** One 5 MB payload through puppeteer hung past 100s.
- **Writing files:** bash heredocs mangle `\n` and backticks. Write a Python
  script with the Write tool, run it, delete it. **Encode before opening for
  writing** — `open(p,'w').write(s)` truncates first and encodes second, which
  ate `overlays.js` once. Commit messages via `git commit -F`.
- **electron-builder EPERM on `release/`:** an editor is watching it. Build to
  `$TEMP/sp-build` via `--config.directories.output`, copy back.

---

## Standing decisions

**The game is a front for a real tool.** *"like a front for a real user
interface that could rival a non-code IDE for a lay user."* The rooms are the
skin; underneath it is an index over everything you're working on plus fast,
obvious ways to act on it. So: **nothing may be a dead end** — every artifact
must be reachable *and* actionable from where you're looking at it. **One
keystroke to anywhere** beats a beautiful room you must walk to (built and
unreachable is the same as unbuilt — learned with the Lab). **It has to flow
like water.** And it is **for a lay user**: no terminal required, no config file.

**The desktop app is the main focus.** Build desktop-native first; the web build
is the thing that shouldn't regress, not the thing being optimised for.

**Build it ourselves before reaching for a third party.** Slower up front, and
that is the point — the long path is the shortest path. Reach outside only when
something genuinely isn't buildable in reasonable time, and say so plainly.

**SUPABASE IS GONE.** Deleted 2026-08-02. Do not load Supabase skills, suggest
Supabase features, or check against cloud RLS / service-role patterns. Remaining
mentions in docs are historical or cleanup targets, never instructions.

**Local and self-hosted.** Book text in local MinIO, the catalogue local,
runnable with no cloud account. The Library is **built from scratch by its
owner** — and the reason is the person, not the privacy: *"filling up your own
library makes one have a sence of ownerhip."* A book nobody chose is inert. The
seed shelf is an on-ramp, not a library; its small size is correct.

**The low-res look is a resource choice.** Plain pixel art costs almost nothing
so the machine's power goes to a local AI actually running and a big Library
actually indexed. Looks plain, is a beast underneath. That gap is the design.

**AI effectiveness before AI features or personality.** A resident that answers
reliably in a plain voice beats a rich one that hangs. The work tools carry
`WORK_CHARTER`, not the devotional `CHARTER`, so they serve any goal on its own
terms.

**Residents are agents, not personalities.** *"there real purpous should be
agents without a doubt."* One at a time, chosen for a purpose, each with its own
thread. Personality is the skin. The Monk always gets the best **local** model
and real room to think — never a hosted one.

**Two Pavilions.** This machine is the steward's own, maximally rich. The
shareable version stays lean and neutral. Know which one a change serves.

---

## The database, and what it may gate

```
MinIO (Docker)     book TEXT        big, opaque, written once
Postgres (Docker)  the KNOWLEDGE    cards, shelves, chapters, notes — small,
                                    queryable, edited constantly
localStorage       YOUR day         days, notes, courses, progress
```

**This machine: assume the database.** Build features that need it; do not write
a second implementation for a machine that isn't this one.

**A feature that needs it is ABSENT or LOCKED — never DEGRADED**, and it says
plainly how to turn it on. *"we can encourage that by locking out features that
are hindering us… but doing as much as we can without a database should be
good."* One code path plus a visibility check; never two implementations. The
scar is in `store.js`: *"the fallback path was the only path anyone actually
ran, which meant it was load-bearing while still being written and tested as a
fallback."*

**The shareable beta still runs with nothing.** Seed + localStorage is a
complete Pavilion. A release gate, with tests run against a stopped container.

**Storage ceilings, measured 2026-08-04** — real books average 563 KB:

| where | ceiling | why |
|---|---|---|
| **web build** | **~10–20 books** | text goes inline into a ~5–10 MB localStorage quota |
| **desktop app** | hundreds | `libraryWrite` puts text in `.txt` under userData; the save keeps only the catalogue row |
| **+ Docker** | no practical limit | MinIO for text, Postgres for search across every note |

Docker buys **search and sorting**, not capacity. Say so honestly.

---

## The test suite

```bash
npm test                                   # pure logic + drift, ~1s, always
node test/live/preflight.mjs               # old saves migrate, panels open, ZERO network
node test/live/study-table.mjs             # the workroom, on a book with no chapters
node test/live/teacher.mjs                 # set text → reading doors → a handout
node test/live/writing-desk.mjs            # the desk, the picker, one thread each
node test/live/study-chain.mjs             # note→lesson→a path you walk→Today
node test/live/lab.mjs  bench.mjs  bundle.mjs  librarian-safety.mjs  backend.mjs
env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/packaged-boot.cjs
```

The `live/` suites need `npm run preview` running. `ELECTRON_RUN_AS_NODE` must
be unset or `require('electron')` returns a path string.
