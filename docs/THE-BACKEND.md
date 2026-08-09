# The backend, honestly — what is where, and what needs what

*Written 2026-08-10, measured rather than inherited. Every claim here was
checked against the running code and the running containers on the day.*

> *"the backend is a bit complecated the docker has all the books and the
> backeds are somewhat twisted. i wanted docker for privacy and that the game
> can run without it so its a bit wierd."*

That reading is fair, and this page exists to dissolve it. The tangle is mostly
**one framing that outlived its reason**, plus two real knots — and the knots
are written up separately in
[`plans/THE-BACKEND-UNTANGLE.md`](../plans/THE-BACKEND-UNTANGLE.md).

---

## Three separate things, routinely confused as one

| | what it holds | needs Docker? | if it is not there |
|---|---|---|---|
| **the save** | your day, notes, courses, progress, **and the personal catalogue** | no | always present — `localStorage`, key `sandPavilionSave.v2` |
| **Postgres** | the *knowledge*: book cards, shelves, chapters, the notes index | **no** | **PGlite inside the app** — same SQL, same schema, same files in `tools/` |
| **MinIO** | the book **TEXT**, and only that | **yes** | a `.txt` under `userData` (500 by default, visitor-set) → then inline in the save |

**They are independent.** You can have all three, any two, or just the save.

### The save is the thing that matters

The database is an **index over your work, not a second copy of it.** Everything
still lives in the save, exporting still carries all of it, and if the database
never opens the Pavilion says so plainly and keeps working. **Nothing you have
moves anywhere without you.**

---

## The sentence that clears up most of the confusion

> **Docker buys capacity for the book TEXT. It does not buy privacy, and it
> does not buy search.**

Both halves are worth stating, because both were once believed the other way
round.

### Search ships with the app

Every desktop install has Postgres. `electron/db.cjs` picks the **container**
when it answers and its own **embedded PGlite** otherwise — and the choice sits
**below the named-query seam**, so both homes run the same SQL against the same
schema from the same files. The renderer cannot tell which, and must not try;
only `dbStatus()` names it, and only so a person can be told.

So "needs Docker" was retired as a reason to lock a feature. Docker is now only
about the *book text* and sharing one database between machines.

### Privacy is not what Docker was buying

**Measured 2026-08-10, with both containers up:**

```
sand-pavilion-postgres   127.0.0.1:5432->5432/tcp
sand-pavilion-minio      127.0.0.1:9000-9001->9000-9001/tcp
```

Both bound to **loopback only** — deliberately, and the compose file says why:
*"Without 127.0.0.1 Docker publishes to every interface, and on a laptop that
means the coffee shop's wifi."* Nothing off this machine can reach either.

The privacy property comes from **localhost-binding plus no cloud account**, and
**PGlite under `userData` and `.txt` files under `userData` have exactly the
same property.** So:

> **Making Docker optional cost no privacy at all.**

The original instinct — *Docker for privacy, and the game runs without it* —
turned out to be two goods that were never in tension. That is precisely why it
felt weird to hold both at once.

---

## Where a book's text actually lives — per book, not per machine

Read from the **book's own pointer**, never from what happens to be running.
That is what keeps a badge honest when something is switched off: a book written
to MinIO in June still says Docker in December with the container stopped — it
says **Docker**, *and* it will not open, which are two true things.

| badge | pointer | notes |
|---|---|---|
| 🐳 **Docker** | `fullText.storage.bucket` | no practical limit; shared between machines reaching the same container |
| 💾 **this machine** | `fullText.storage.personal` | a real file under `userData`. **Limit 500 by default, set by the visitor** (25–5,000) |
| 📄 **in the save** | `fullText.text` | only a few fit — a browser has ~5–10 MB in total |
| 📝 **summary only** | none | a card with no text behind it |

`data/book-storage.js` owns this, is pure, and is the only definition. The write
order (`shelveAsPersonal`: MinIO → file → inline) and the read order are
deliberately the same, **so the badge can never disagree with what happened.**

**Measured ceilings** — real books average **563 KB**:

| where | ceiling |
|---|---|
| web build | **~10–20 books** (text goes inline into a ~5–10 MB quota) |
| desktop app | **500 by default, visitor-set up to 5,000** (~2.7 GB at 563 KB a book) |
| + Docker | no practical limit |

The dev machine today: **415 catalogued** — 326 Docker · 59 this machine · 30
genuinely summary-only.

---

## Why `npm run dev` shows an empty shelf

**This is correct by construction, and it is three reasons stacked, not one.**
It cost a real morning: *"i cant find my books in the library … i tried in
npm run dev and i cant find the books there … this issue keeps happening."*

1. **No desktop bridge.** `bridge()` in `data/store.js` needs
   `window.desktopBridge`, which a browser tab does not have. So
   `Store.dbAvailable()` is false → `hydrateFromDb()` never runs → `libraryDocs`
   stays `SEED_LIBRARY`, **which is now `[]`**. A 415-book library renders as
   nothing.
2. **`localStorage` is per-origin.** `localhost:5173`, `localhost:4173` and the
   desktop app are **three separate saves** that cannot see each other's books.
   Even books stored *inline* in the app's save are not in the dev save.
3. **`VITE_MINIO_ENDPOINT` is deliberately blank** in `.env.beta`, so no book
   text could be fetched even if a card existed.

> ### Use `npm run electron:dev`, not `npm run dev`.
>
> A browser tab is not a smaller Pavilion — **it is a different one.** The title
> screen says so, and so does an empty shelf. Nothing is lost.

---

## The five run modes

```
npm run dev              # 1 · browser, live reload — SEPARATE SAVE, no database, no books
npm run build && preview # 2 · static build on :4173 — also its own separate save
npm run electron:dev     # 3 · the real thing over the dev server. USE THIS
npm run electron:build   # 4 · installer carrying YOUR .env.local (personal)
npm run electron:build:beta   # 5 · the shareable installer, built local-only
```

**Never plain `electron:build` for anything shared** — it bakes `.env.local`
keys into the installer. Mode 5 builds with the committed, deliberately empty
`.env.beta`, which Vite's mode priority guarantees overrides `.env.local`.

---

## Adding a migration

**Add a file to `tools/migrations/` and nothing else.**

`applySchema()` runs `schema.sql` plus **every** migration on **both** homes, on
every open. Do not add it to `docker-compose.yml`: that entrypoint fires only on
an empty volume and does not recurse into a directory, so listing migrations
there would be a hand-maintained list that must match one — rule 4's exact
shape, and every such list in this project has drifted.

For half a day it ran on the embedded home only. The container had been seeded
once by the compose entrypoint, so migration 004 would have been **missing on
Docker with every status line reading healthy.**

**The two homes fail differently on purpose.** Docker keeps the connection and
reports `status().schemaError`, because throwing would split this machine's
writes across two stores. Embedded treats it as fatal, because a schema-less
fresh database is not a database.

### They have already disagreed twice

Not caution — history. Migrations reached only one of them until 2026-08-04, and
a JS array passed for a `TEXT[]` parameter **wrote on Docker and failed on
PGlite**. That is why `normalizeParams()` sits *below* the seam, and why there
are two test suites that cannot substitute for each other:

| suite | home | runner |
|---|---|---|
| `note-search.cjs`, `records.cjs` | **fresh embedded** (`userData` redirected, port pointed at nothing) | Electron |
| `docker-home.cjs` | **the container** | plain node |

`docker-home.cjs` **skips loudly and exits 0** when the container is down —
a suite that goes green because the thing it tests is switched off is the house
failure mode wearing a tick. Break it with `POSTGRES_PORT=5999`.

---

## Two knots that are real — not fixed, deliberately

Full write-ups and the order to do them in:
[`plans/THE-BACKEND-UNTANGLE.md`](../plans/THE-BACKEND-UNTANGLE.md).

- **A · Two implementations of one read.** `loadBookTextResult()` and
  `openFullText()` each independently implement inline → `libraryRead` →
  MinIO-fetch, with their own error messages. Two paths, free to drift — the
  `store.js` scar exactly.
- **B · Reads and writes reach MinIO by unrelated routes.** Writes go through
  `mc` in a throwaway container, authenticated from `.env`. Reads are a bare
  **unauthenticated `fetch('http://localhost:9000/…')` from the renderer** —
  **`minioRead` does not exist** on the bridge (verified: zero occurrences in
  `preload.cjs` and `main.cjs`), and the bucket answers an anonymous request
  with **HTTP 200**. That policy was set by hand and is in no compose file, no
  protocol doc and no test.

  Low risk today — loopback only — but **a fresh machine will not have it**, and
  it is the concrete reason this layer feels twisted: *one storage system, two
  unrelated doors, one of them undocumented.*

---

## The catalogue in Postgres is a manual snapshot

**`tools/load-library.mjs` walks MinIO and writes rows; nothing re-runs it**, and
it only ever sees MinIO. `shelveAsPersonal()` has three storage paths, so a book
can be on the shelf and in none of the database's rows.

**Never quote a database count as if it were the library.**
`tools/reconcile-library.mjs` is the missing half: it emits SQL, connects to
nothing, and dry-runs by default.

## What is deliberately NOT wired

A list of unused named queries reads as debt. Most of it is not:

| query | verdict |
|---|---|
| `notesForBook`, `notesByPlace`, `noteCounts` | **leave unwired** — `gatherNotes()` already unions all six note sources exactly, instantly, and on the web build too |
| `unshelved`, `unshelvedCount`, `shelfCounts` | **leave unwired** — `books` mirrors `personalLibrary`, already in the save |
| `recordCounts` | leave unless the Records Hall grows a summary |
| `chaptersFor`, `needsChapters`, `chapterCoverage` | **worth wiring** — they answer the one question plain JS cannot: *which of my books have no divisions*, without opening all of them |

**The test for "should this be wired":** can plain JS over the save answer it
exactly and instantly? If yes, leave it — a query is then a second path, not a
feature. If no (stemming, or knowing something about a book you have not
opened), it earns its place.

`book_health` is still a table nothing writes, so `v_unshelved`'s health filter
is inert — the status is always absent, so the clause is always true. Harmless,
and said out loud rather than left looking load-bearing.
