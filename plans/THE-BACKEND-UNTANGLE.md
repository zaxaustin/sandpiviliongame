# Untangling the backend — three knots, each measured

*Written 2026-08-10. The findings are measured, not inherited. **Nothing here is
built** — this was scoped during a documentation session, and the steward's call
was explicit:*

> *"the backend is a bit complecated the docker has all the books and the
> backeds are somewhat twisted. i wanted docker for privacy and that the game
> can run without it so its a bit wierd … then we can fix the backend after we
> get more famalar with this project that has seemed to get away from be a bit."*

**Read [`docs/THE-BACKEND.md`](../docs/THE-BACKEND.md) first.** It is the map —
what the three storage systems are, what Docker actually buys, and why
`npm run dev` shows an empty shelf. This file is only the *work*.

---

## The one sentence that dissolves most of the confusion

**Docker buys capacity for the book TEXT. It does not buy privacy, and it does
not buy search.**

- **Search ships with the app** — every desktop install has Postgres, via the
  container when it answers and PGlite otherwise, below the named-query seam.
- **Privacy is not what Docker was buying.** Postgres binds `127.0.0.1:5432`,
  MinIO `127.0.0.1:9000` — confirmed 2026-08-10, neither reachable off this
  machine. The property comes from **localhost-binding and no cloud**. PGlite
  under `userData` and `.txt` files under `userData` are exactly as private.
  **Making Docker optional cost no privacy at all.**

So the original instinct — *Docker for privacy, and the game runs without it* —
turned out to be two separate goods that were never in tension. That is why it
feels weird: the framing outlived the reason.

---

## Knot A · Two implementations of one read

**Measured:** `loadBookTextResult(slug)` and `openFullText(slug, landOnPage)`,
both in `ui/overlays.js`, **each independently implement the same three-home
read** — inline text → `bridge.libraryRead()` → an HTTP fetch at MinIO — with
their own separate error messages for each failure.

Two code paths for one decision, free to drift. **This is the `store.js` scar
exactly**, which that file records in its own words: *"the fallback path was the
only path anyone actually ran, which meant it was load-bearing while still being
written and tested as a fallback."*

**The fix is small and boring, which is the point.** `openFullText()` calls
`loadBookTextResult()` and switches on its `reason` (`'none'`, `'no-bridge'`,
`'unreadable'`, `'unreachable'`) to choose the message it already writes. One
read path, one set of reasons, one place to change.

**Verify by breaking it:** with the container stopped, open a 🐳 Docker book and
a 💾 this-machine book. Before the change the two functions can disagree about
what went wrong; after it they cannot. Then `test/live/library-homes.cjs` and
`storage-off.mjs`.

---

## Knot B · Reads and writes reach MinIO by unrelated routes

**This is the concrete reason the backend "feels twisted": one storage system,
two unrelated doors, one of them undocumented.**

| | route | authenticated? |
|---|---|---|
| **write** | `desktop-minio-write` → `mc pipe` inside a throwaway `minio/mc` container, credentials from `.env` | **yes** |
| **delete** | `desktop-minio-delete` → `mc rm`, same route | **yes** |
| **read** | a bare `fetch('http://localhost:9000/<bucket>/<key>')` **from the renderer** | **no** |

**Verified 2026-08-10:** `minioRead` does not exist — zero occurrences in
`electron/preload.cjs` and `electron/main.cjs`. The read bypasses the desktop
bridge entirely. And the bucket answers an **anonymous** request with
**HTTP 200**, so it has been set public-read by hand at some point.

That policy is **in no compose file, no protocol document, and no test.** The
actual risk today is low — it is `127.0.0.1`-only, so nothing off this machine
can reach it — but:

- **a fresh machine will not have it**, and the failure will look like "the
  book won't load" rather than "you skipped an undocumented step";
- it means the honest answer to *"is my library private?"* depends on a setting
  nobody wrote down;
- and it is the asymmetry that makes the whole layer hard to hold in your head.

### The fix, in the order that keeps it working throughout

1. **Add `minioRead` to the bridge** — `desktop-minio-read` in `main.cjs` using
   the same `mcRun()` helper the write already uses (`mc cat`), exposed in
   `preload.cjs`. Reads and writes then use one authenticated door.
2. **Point `loadBookTextResult()` at it** — after Knot A, that is the *only*
   place to change. Keep the plain `fetch` as a **fallback**, so nothing
   regresses for a bucket that is already public and a bridge that is older.
3. **Then, and only then, make the bucket private** and confirm books still
   open. This ordering matters: flip the policy first and every 🐳 book stops
   loading at once.
4. **Write the policy down** wherever it ends up living, and add it to
   `docs/THE-BACKEND.md`.

**Break it on purpose:** with the bucket private and the bridge path disabled,
a 🐳 book must fail *loudly and specifically* — "the container is not
answering" — never silently render an empty page.

---

## Knot C · The write half still lives in `overlays.js`

`shelveAsPersonal()` is ~127 lines in `ui/overlays.js` and holds the **write**
half of the same three-home decision that `data/book-storage.js` already owns
the **read** half of: MinIO first, then a file under `userData`, then inline in
the save.

`book-storage.js` is pure, tested, and documents the order precisely so *"the
badge can never disagree with what actually happened."* Right now that agreement
is maintained by two files remembering the same order — and **"two files
remember" is not enforcement**, which is the lesson `chatOptsFor()` was moved
for.

**Lower priority than A and B**, and it is genuinely entangled with the intake
UI, so it belongs in the `ui/library.js` extraction rather than as its own job.
Named here so it is not rediscovered.

---

## Order, and where to stop

**A, then B.** A is small and makes B a one-line change instead of a
three-place change. Stopping after A is a complete, useful session.

**C waits for the `ui/library.js` extraction** — see
[`OVERLAYS-SPLIT-PLAN.md`](OVERLAYS-SPLIT-PLAN.md).

## Verification, for any of it

- **Both database homes.** `docker-home.cjs` (container) and `records.cjs` /
  `note-search.cjs` (fresh embedded). **Neither can stand in for the other** —
  they have already disagreed twice about the same named write.
- **`test/live/library-homes.cjs`** against the real container, and
  `storage-off.mjs` / `storage-room.mjs` for the honest-absence path.
- **Break the container on purpose** (`docker compose stop`) and confirm every
  storage badge still reads correctly — a badge is read from the **book's own
  pointer**, never from what is running, and that must survive this work.
- **`packaged-boot.cjs`** before anything ships.
