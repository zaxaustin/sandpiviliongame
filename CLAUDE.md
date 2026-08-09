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

**1 · TEST THE PLAYER'S BOOKS, NOT THE SEED.** **`SEED_LIBRARY` is now `[]` —
there is no seed left to hide behind** (all 27 deleted 2026-08-10; texts kept in
`archive/seed-texts-2026-08-10/`). The rule is stronger for it, not obsolete: a
seed book was tidier in every way a test cares about — clean sections, known
licence, guaranteed shape — and that tidiness is exactly what made it lie. The
chapter finder once passed on six seed texts and was **wrong on 62% of the real
296**; the Index rendered **zero of 415 real books** while 27 seed stubs
rendered perfectly and hid it.

So a suite that seeds an **empty save** is now the same mistake in a new
costume — it tests a Pavilion with no books in it. Use `test/live/_books.mjs`
(the fixture, in all three storage homes), `library-sources/`, or
`test/fixtures/chapters/`. Sweep the whole library when changing a rule that
applies to all of them.

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
- **An offscreen Electron window hands back a STALE frame.** `capturePage()` on
  a `show:false` window returned a dark, empty screenshot of a panel that was
  provably open (`opacity 1`, full size, right content). `win.show()`, wait,
  and **discard the first `capturePage()`**. A screenshot showing nothing is not
  evidence of nothing — verify the harness before believing the picture.
- **A bare identifier is only a ReferenceError on the path that runs it.**
  `overlays.js` called `estimateTokens()` and never imported it, for days: the
  build was happy, and every test called the enclosing function on a path that
  returned *before* the throw. `npm test` now derives this check from
  `ai/provider.js`'s exports. **A wider one-off scan across every local import
  in `src/game` found no other instance** (validated by re-introducing the known
  bug — a clean scan from an unproven scanner is a vacuous pass).

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
library makes one have a sence of ownerhip."* A book nobody chose is inert.

**THE SHELF STARTS EMPTY, AND THAT IS THE FINISHED POSITION** (2026-08-10). This
used to read "the seed shelf is an on-ramp, not a library; its small size is
correct." There is no on-ramp now — `SEED_LIBRARY` is `[]`, and that is
permanent. The argument got simpler rather than weaker: a shelf of 27 books
nobody chose was doing the ownership argument harm, and it was actively hiding
bugs (see rule 1). **A first armful is a documentation problem, not a shipping
problem** — `docs/BOOKS-TO-SOURCE.md` is the list.

**The low-res look is a resource choice.** Plain pixel art costs almost nothing
so the machine's power goes to a local AI actually running and a big Library
actually indexed. Looks plain, is a beast underneath. That gap is the design.

**AI effectiveness before AI features or personality.** A resident that answers
reliably in a plain voice beats a rich one that hangs. The work tools carry
`WORK_CHARTER`, not the devotional `CHARTER`, so they serve any goal on its own
terms.

**Residents are agents, not personalities.** *"there real purpous should be
agents without a doubt."* One at a time, chosen for a purpose, each with its own
thread. Personality is the skin.

**The Monk is no longer given a bigger model.** Retired 2026-08-07: *"lets not
treat the monk differently for now hav him focus on guidens."* He used to get
the largest installed local model and a deep token/timeout tier; now he gets
what everyone gets. Guidance is carried by who he is and what he is grounded
in, not by how long he is allowed to think — and a bigger model on this machine
buys slower counsel, not better counsel, since cooling is the real limit.

**⚠ AND THE LOCAL-ONLY PROPERTY WENT WITH IT. Measured 2026-08-10.** This
paragraph used to say *"What did NOT change: he is still local-only, by the
cloud guard in the transport layer"* — and warned in the same breath that
"losing one must not quietly lose the other." **That is exactly what happened,
and the doc asserted the opposite for three days.**

There is **no cloud guard in the transport layer**, and there never was one for
this. Verified: `chatOptsFor()` returns `{}` for every agent
(`ai/provider.js`); `detectAI()` picks the **first enabled connection that
answers and assigns it to every resident** — there is no per-resident routing
anywhere in `src/`. The only cloud-related guard is `isCloudModel()`, which
excludes Ollama's *hosted* models from `bestLocalModel()`, and `bestLocalModel()`
now has exactly one caller: a sentence in the Connections panel that was itself
false until today. **Configure a cloud provider and the Monk uses it.**

`chatOptsFor()` IS still the single seam where this would be decided, and
`npm test` genuinely enforces that every `AI.chat` caller in `ui/` can reach it
(`test/smoke.mjs`, the guard is real). But **a reachable seam that returns `{}`
enforces nothing** — which is this project's oldest bug shape, the one
`groundingFor()` already wore: a boundary around a door nobody opened.

**RESOLVED THE SAME DAY, and the answer is that the Monk MAY be cloud:**

> *"the monk can be cloud if there computer cant run local ai alot of people
> have laptops just let the user know."*

So the promise is **dropped on purpose**, not merely found broken. A laptop that
cannot comfortably run a local model must not mean no Mountain Monk — guidance
you can reach beats a principle that locks you out of the room. Every resident
uses the one detected connection, and that is now a stated decision.

**What carries it instead is labelling, and labelling has to be where the person
is.** `isLocalConn()` lives in `ai/provider.js` (one definition), `detectAI()`
stamps `AI.local`, and the **chat header** now reads `🏠 connected — <model> ·
stays on this computer` or `☁ … · leaves this device`. The Connections panel had
badged this all along; the room where people actually speak did not.

**`chatOptsFor()` is still the seam** if per-resident routing is ever wanted —
and it still returns `{}`, which is now correct rather than a silent loss.

**DON'T FORCE THE MODEL TO CONFORM.** Stated 2026-08-04:

> *"we dont have to force the modles to conform so stricly — thats for fine
> tuning and having real personal modles which we are not there yet. having the
> game like format to focus the users intentions is more than enough."*

**The room already does the work.** Someone who walked to the Keep and sat with
the Monk has already narrowed what they want; the prompt does not have to
re-narrow it with rules. So: **identity, knowledge, and real grounding** —
who this resident is, what they actually know, and what is genuinely in front
of them right now. Not a rulebook.

A thinking model handed a list of constraints audits itself against them
mid-thought — *"Does this violate any rules? Is it helpful?"* was visible in
the Monk's own reasoning on 2026-08-04 — which spends the visitor's seconds on
compliance instead of on them. Every instruction added to a prompt is paid for
on every message, forever. Grounding earns its place; another rule usually
does not.

**Two Pavilions.** This machine is the steward's own, maximally rich. The
shareable version stays lean and neutral. Know which one a change serves.

---

## The database, and what it may gate

```
MinIO (Docker)     book TEXT        big, opaque, written once
Postgres           the KNOWLEDGE    cards, shelves, chapters, notes — small,
  Docker, or                        queryable, edited constantly
  PGlite in-app
localStorage       YOUR day         days, notes, courses, progress
```

**EVERY DESKTOP INSTALL HAS POSTGRES** (2026-08-04). `electron/db.cjs` picks the
container when it answers and its own embedded PGlite otherwise — **below** the
named-query seam, so both run the same SQL against the same schema from the same
files in `tools/`. The renderer cannot tell which, and must not try. Only
`dbStatus()` names it, and only so a person can be told.

**`applySchema()` runs `schema.sql` + every migration on BOTH homes, on every
open.** For half a day it ran on the embedded one only — the container got
`schema.sql` once from the compose entrypoint, which fires only on an empty
volume and never mentioned `migrations/`. "One schema, two homes" was a sentence
in a plan rather than a property of the program, and migration 004 would have
been missing on Docker with every status line reading healthy. **Adding a
migration means adding a file to `tools/migrations/` and nothing else** — never
a list in `docker-compose.yml` (a hand-maintained list that must match a
directory is rule 4's exact shape). The two homes fail differently on purpose:
Docker keeps the connection and reports `status().schemaError`, because throwing
would split this machine's writes across two stores; embedded treats it as
fatal, because a schema-less fresh database is not a database.

**So "needs Docker" is no longer a reason to lock a feature.** That category is
retired. Docker is now only about the *book text* (MinIO) and sharing one
database between machines.

**A feature that genuinely needs something absent is ABSENT or LOCKED — never
DEGRADED**, and it says plainly how to turn it on. The rule still stands; it just
has far less to cover. One code path plus a visibility check; never two
implementations. The scar is in `store.js`: *"the fallback path was the only path
anyone actually ran, which meant it was load-bearing while still being written
and tested as a fallback."* **The embedded database is the answer to that scar,
not another instance of it** — it is not a second implementation, it is the same
SQL with a different file on disk. And it *is* the common path now, so test it as
the primary, because for everyone who is not the steward it is.

**Soft failure is unchanged.** "Everyone has a database" must not become
"everything assumes one": a corrupt data directory, a full disk, a platform where
the WASM will not load all still return `null`. Break it on purpose.

**The shareable beta still runs with nothing.** Seed + localStorage is a complete
Pavilion. A release gate — and "with the container stopped" now means "on PGlite"
rather than "on nothing", so a third case exists: **neither**.

**Storage ceilings, measured 2026-08-04** — real books average 563 KB:

| where | ceiling | why |
|---|---|---|
| **web build** | **~10–20 books** | text goes inline into a ~5–10 MB localStorage quota |
| **desktop app** | **500 by default, the VISITOR sets it** (25–5,000) | `libraryWrite` puts text in `.txt` under userData; the save keeps only the catalogue row |
| **+ Docker** | no practical limit | MinIO holds the text outside the app |

**The desktop row said "hundreds" until 2026-08-10 while the cap was 100** —
one hundred is not hundreds, and the number was invisible to every doc guard
because it was a word rather than a figure. It is now `DEFAULT_LOCAL_BOOK_CAP`
in `data/book-storage.js`, rendered from the constant (a `npm test` guard fails
if the panel types the digits), and **settable by the visitor** once the storage
room has shown them what their library weighs and what the disk has spare:
*"let the user set a limit after they understand there own disk space."*

**Docker buys capacity for the book TEXT, and the ability to share one library
between machines. It does NOT buy privacy, and it does NOT buy search.** Search
comes with the app; both containers bind `127.0.0.1` only and PGlite under
userData is exactly as private, so privacy was never Docker's contribution. Keep
this claim exactly this narrow — the wider version is what sent the backend
sideways for weeks.

**PGlite, measured:** 25 MB in the installer (all of it `app.asar.unpacked`),
40 MB for an empty cluster under userData, **1.5 s cold open — do it after the
title screen, never in front of a visitor** — 90 ms warm, `searchNotes` in
1–3 ms at 5,000 notes. Full-text search is real: it stems, ranks, and ships 30
dictionaries.

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
env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/note-search.cjs
env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/records.cjs
env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/resident-reach.cjs
node test/live/docker-home.cjs              # the container half; skips if it's down
```

The `live/` suites need `npm run preview` running. `ELECTRON_RUN_AS_NODE` must
be unset or `require('electron')` returns a path string.

**`resident-reach.cjs` runs its EMPTY-SHELF case FIRST, and the ordering is
load-bearing.** `userData` is one temp directory for the run and `main.js`
hydrates from the database on every boot, so once real books exist no later boot
can produce an empty shelf whatever the save says. It asserts `allDocs() === 0`
before testing that case — **a check that refuses to run against the wrong
fixture is worth more than the check itself**, and that assertion is what caught
it ("4 books still on the shelf").

**The four Electron suites are Electron, not a browser, and that is not
optional.** A browser tab has no desktop bridge and therefore no database, so a
browser suite can only *stub* one — which proves the wiring and nothing about
whether Postgres actually stems.

**THE TWO HOMES NEED TWO SUITES.** `note-search.cjs` and `records.cjs` redirect
`userData` to a temp directory and point the container port at nothing, so they
always run the **fresh embedded** case: the one everybody who is not the steward
gets, and the one where the two 2026-08-04 bugs were hiding. `docker-home.cjs`
is plain node — `db.cjs` only requires `electron` on the embedded path — and is
always the **container** case. It **skips loudly and exits 0** when the
container is down, because a suite that goes green because the thing it tests is
switched off is rule 5 wearing a tick. Break it on purpose with
`POSTGRES_PORT=5999`.

Neither can stand in for the other, and that is not caution — the two homes have
**already disagreed twice** about the same named write: migrations reached only
one of them until 2026-08-04, and a JS array for a `TEXT[]` parameter wrote on
Docker and failed on PGlite.
