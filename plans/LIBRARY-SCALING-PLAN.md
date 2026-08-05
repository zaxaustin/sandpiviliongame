# Library Scaling Plan

> **STATUS (2026-07-11) — the storage picture now has three honest layers,
> reconciled here so they stop reading as contradictions:**
> 1. **Certified library, dev machine (today):** catalog → Supabase, full
>    text → local MinIO in Docker. Unchanged, working.
> 2. **Personal books, any machine (built 2026-07-11):** plain files in the
>    desktop app's own data folder, via the Electron bridge — no services.
>    This is what beta testers get; they never touch Docker.
> 3. **"The books should live on Docker, not Supabase" (user direction,
>    2026-07-11) + the backend decision (Supabase now, hybrid VPS later):**
>    the future move for the *certified* library — catalog and text together
>    on a small VPS running this same Docker stack, Supabase kept only for
>    the social pieces. A deliberate later build, not started.

In progress. Written down so the decision survives between sessions — see
README's "Work still to be done" for how this fits the rest of the
priority list. Same spirit as `DESKTOP-APP-PLAN.md`: no drastic moves
while things are working, this gets picked up deliberately.

## Project priority, stated plainly (2026-07-08)

**Local-first, on the user's own PC, is the actual goal right now — not
a stepping stone to skip past.** The point of this phase is a real daily
environment: local AI (Ollama) plus a local Library big enough to be
genuinely useful, both running entirely on this machine, no account, no
cloud dependency required to use it day to day. Two known problems have
to be solved *before* "make it a real website anyone can visit" is worth
picking up at all:

1. **Local AI integration** — Ollama already works, but the browser's
   CORS rules block it unless `OLLAMA_ORIGINS` is configured exactly
   right (bit us once already — see `DESKTOP-APP-PLAN.md`, still
   undecided between Electron/Tauri for the real fix).
2. **A local data server for the Library** — this document. Object
   storage on this machine, not a hosted one, for the reasons and design
   below.

**Turning this into a true multi-user website is real, and explicitly
not abandoned — it's just sequenced after both of the above are solid,**
not in parallel with them. Chasing "reachable by anyone" before "great
to use alone, every day, on this machine" would mean building
public-facing plumbing (a rented server, a bigger auth story) around a
foundation that isn't proven yet. Revisit this ordering once local AI
and local storage both just work without thinking about them.

## The actual goal

Grow the Library from a handful of hand-vetted texts toward thousands —
eventually potentially far more — of full public-domain books and papers,
without the game slowing down, without a monthly hosting bill, and
without losing the ability to read the whole thing and take notes on it
inside the Pavilion, the same way the Dhammapada already works today.

## The decision (made 2026-07-08, after a real conversation about it)

**Keep Supabase/Postgres exactly as it is** for everything it's already
doing well — accounts, the café, and the Library's *metadata* (title,
tradition, license, summary, tags, search). **Add local object storage
for the actual book text**, run on the user's own machine via
**MinIO** (Docker, S3-compatible API). Explicitly rejected: introducing a
second database engine (MongoDB or similar "NoSQL" database) — Postgres's
JSONB columns already give schema flexibility where it's needed, and a
second database would mean a second system to run and back up for no
real gain here.

Why object storage and not "just a bigger Postgres column": right now a
book's title/license/summary and its entire full text all live in one
JSONB blob (`library_documents.doc`). That's fine at 24 books (160KB
today). It stops being fine once `store.js`'s existing "mirror the whole
table into the browser" pattern is dragging gigabytes of book text along
with it just to render a shelf list. Splitting "what do we know about
this book" (stays tiny, stays in Postgres) from "the book itself" (can
get huge, moves to object storage) fixes that at the root.

**Confirmed scope: plain text / clean digital sources**, not scanned
page images — this keeps the storage math cheap (a million documents is
tens of GB, not tens of terabytes) and matches what the Caravan pipeline
already sources (Gutenberg, SuttaCentral). Scanned books are a real,
separate, much bigger problem (storage size, plus OCR to make them
readable/searchable at all) — explicitly out of scope for this plan.

**Confirmed budget:** up to 100GB of the user's own disk, for now.
Reachable only from their own machine while playing locally — that's
fine for the current "just me" phase; renting a server for
farther-than-localhost access is a later, separate decision (see
Stage 3 below), not blocking this work.

## The concrete design

**Storage:** one MinIO instance running locally in Docker, one bucket
(e.g. `sand-pavilion-library`), one object per book's full text (e.g.
key `dhammapada.txt`). MinIO speaks the exact same API as Cloudflare R2,
Backblaze B2, and AWS S3 — this is the whole point of picking it: moving
to a rented server later means changing an endpoint URL and a credential,
not rewriting how the game reads a book.

**What changes in Supabase:** `doc.fullText` stops holding the actual
`text` string. Instead it holds a pointer:
```
doc.fullText = {
  translator, source_url, license,   // unchanged
  storage: { bucket:'sand-pavilion-library', key:'dhammapada.txt' }
}
```
The `summary`/`sections` fields, and everything else about how a shelf
entry works, don't change at all.

**What changes in the game client:** `openFullText()` (in
`src/game/ui/overlays.js`) currently reads `d.doc.fullText.text` directly
out of the already-loaded document object. It'll instead do one `fetch()`
to MinIO's local HTTP endpoint (`http://localhost:9000/sand-pavilion-library/dhammapada.txt`,
served directly if the bucket has an anonymous-read policy — no AWS SDK
needed client-side for reads, same plain-`fetch()` pattern already used
everywhere else in this codebase) the first time a reader opens that
book's full text, then paginates the result exactly as it does today.
Reading notes (`data.bookNotes`) don't change at all — they're keyed by
`slug` already, independent of where the text itself physically lives.

**Migration:** the Dhammapada (and whichever suttas the current Caravan
run finishes) already have their full text sitting in Supabase's JSONB
column from the last session. Moving them into MinIO and replacing that
JSONB field with a pointer is a small, one-time script — worth doing now
while it's 2-4 books, not later once there are hundreds.

## Prerequisites — status as of 2026-07-08

**Docker is installed and confirmed working** (`docker run hello-world`
succeeded after the restart). VS Code's Docker extension
(`ms-azuretools.vscode-docker`) was already installed; this repo is
already linked to GitHub (`zaxaustin/sandpiviliongame`). This closes out
Stage 12 of `LEARNING-PATH.md` ("containers: what Docker is and isn't
for") for a real reason, not an abstract exercise.

**A real environment gotcha, hit and fixed live:** running `docker`
from Git Bash on Windows, MSYS2 silently rewrites Unix-style path
arguments before Docker ever sees them — `docker run -v
/c/Users/you/data:/data ...` can get mangled into garbage (we caught it
producing a literal directory named `.upload-test;C`, and the *first*
MinIO container came up healthy and passed its health check while
silently NOT writing to the intended host folder at all — it looked
completely fine until checked). **Fix: prefix any `docker run` with a
bind mount from Git Bash with `MSYS2_ARG_CONV_EXCL="*"`**, e.g.
`MSYS2_ARG_CONV_EXCL="*" docker run -v /c/Users/you/data:/data ...`.
Verified the fix by confirming `.minio.sys` actually appeared in the
real host folder afterward — don't trust "the container started fine"
as proof a bind mount worked; check the host filesystem directly.

## Local storage — live, as of 2026-07-08

- **Container:** `sand-pavilion-minio`, image `minio/minio`, `--restart
  unless-stopped` (survives reboots and Docker restarts without manual
  intervention — the point is it's just there, the way the rest of a
  daily environment is).
- **Data directory (on disk, outside the git repo on purpose):**
  `C:\Users\resto\sand-pavilion-library-data` — this is the real content,
  not something to ever commit or sync into the repo.
- **Ports:** `9000` (S3-compatible API, what the game's `fetch()` calls
  hit) and `9001` (MinIO's own web console, `http://localhost:9001`, for
  browsing the bucket by hand if useful). **Real gotcha found and fixed,
  2026-07-09:** the container's original port mapping (`-p 9000:9000 -p
  9001:9001`) bound to `0.0.0.0` — reachable from anywhere on the local
  network, not just this machine, confirmed via `docker inspect`, not
  assumed. The "reachable only from this machine" claim above was true
  in intent but not in the actual bind. Fixed by recreating the
  container with `-p 127.0.0.1:9000:9000 -p 127.0.0.1:9001:9001`;
  verified afterward with `netstat` that only `127.0.0.1` listens now,
  and that existing bucket contents survived the recreate (the bind
  mount is the real data, the container itself is disposable).
- **Bucket:** `sand-pavilion-library`, anonymous-**read** only (`mc
  anonymous set download`) — the game can fetch a book's text with a
  plain unauthenticated `fetch()`, but can't write; writes only happen
  from local scripts/tooling using the root credentials in `.env.local`
  (`MINIO_ENDPOINT`/`MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`/`MINIO_BUCKET`
  — not `VITE_`-prefixed on purpose, so they never ship to the browser).
- **Verified end-to-end:** uploaded a test file with `mc cp`, fetched it
  back with a plain anonymous `curl http://localhost:9000/sand-pavilion-library/test-book.txt`
  — the exact request shape the game's Reader will make — got the real
  content back, then cleaned the test file out of the bucket.

Stage 1 of the rollout below is done. Next: Stage 2, migrating the
Dhammapada/sutta texts already sitting in Supabase's JSONB column into
this bucket.

## Stages 2-4 — done, 2026-07-08

- **Migration:** all four Theravada texts (Dhammapada, Satipatthana,
  Metta, Anapanasati) moved out of Supabase's JSONB column into MinIO
  objects (`<slug>.txt`), each hash-verified byte-for-byte before and
  after. `library_documents.doc->'fullText'` now holds a pointer, not
  the text — Supabase's `doc` bytes for these four rows dropped from
  54KB to 23KB compressed.
- **Client fetch:** `openFullText()` in `src/game/ui/overlays.js` now
  tries `doc.fullText.text` first (the zero-setup seed.js fallback —
  keeps working with no Supabase, no MinIO, no setup at all, exactly as
  before), and only reaches for `doc.fullText.storage` (a fetch to
  MinIO) when there isn't one. If MinIO isn't running, it fails
  visibly with a real message instead of hanging on "Loading…" —
  verified both ways (MinIO up, and MinIO deliberately stopped).
- **The streamlined pipeline, the actual ask:** new
  `tools/caravan/push-fulltext.py` — attaches a full text to an
  *existing* shelf entry (one already created via `promote-draft.py`)
  in one command: uploads the text to MinIO via `mc pipe` (no bind
  mounts, sidesteps the MSYS2 gotcha entirely) and merges the
  `fullText` pointer into Supabase. Needs `SUPABASE_SERVICE_ROLE_KEY`
  set (same as `promote-draft.py`); MinIO's own (non-sensitive)
  connection details are read straight from `.env.local`.

  > **RETIRED 2026-08-02, guarded 2026-08-04.** The paragraph above is
  > the historical record of what was built, not a working recipe. The
  > Supabase half was deleted, so the script now stops before it uploads
  > — deliberately before, so a failed run cannot leave an orphaned
  > object in the bucket with no catalogue row pointing at it. The MinIO
  > half and the `host.docker.internal` fix below are still correct and
  > are what a rewrite should start from; the writes it would need now
  > exist as named queries in `electron/db.cjs`.
  **Real bug caught and fixed while first testing this script:**
  `mc` runs inside its own throwaway container, so "localhost" from
  in there means the container itself, not this machine — uploads
  silently would have targeted nothing. Fixed by rewriting
  `localhost`/`127.0.0.1` to `host.docker.internal` specifically for
  that one containerized hop, while the browser-facing endpoint stays
  plain `localhost` (see the comment in `upload_to_minio()`).
- **Proved it for real, not just reviewed the code:** used the new
  script to attach James Legge's real 1891 translation (Gutenberg
  #216 — matches the translator already cited for `tao-te-ching`'s
  summary) to the existing Tao Te Ching shelf entry. 48 pages, hash
  verified, confirmed live in the actual running game.

Remaining from the original rollout list: real search (`tsvector` /
`pgvector`, whenever there's enough volume to matter) and, much later,
renting a server if the Pavilion ever needs to be reachable by more
than this machine — see the priority note at the top of this document
for why that stays deliberately last.

## Staged rollout

1. ~~Install Docker Desktop, run MinIO locally, create the bucket~~ —
   **done, 2026-07-08.** See "Local storage — live" above for the real
   details (container name, ports, bucket policy, the MSYS2 path gotcha).
2. **Migrate the already-fetched full texts** (Dhammapada + suttas) from
   Supabase JSONB into MinIO objects; update their `doc.fullText` rows to
   the pointer shape above.
3. **Update the game client** to fetch full text from MinIO instead of
   reading it out of the already-loaded Supabase row. Re-verify with the
   same kind of Playwright pass used to confirm the Dhammapada reader
   worked (open a book, page through it, add a note, confirm the note
   survives).
4. **Point the Caravan pipeline at the new shape** — `promote-draft.py`
   and any future full-text connector write straight into MinIO +
   a Supabase pointer, instead of inlining text into JSONB, so every book
   added from here on already uses the real architecture.
5. **Real search, once volume justifies it** — Postgres full-text search
   (`tsvector`) for keyword search costs nothing extra and can go in any
   time; `pgvector` for semantic/AI-grounded search (the thing that
   actually matters for the "AI residents read the Library" vision) is
   worth adding once there's enough real content for it to be useful —
   revisit after stage 2 has a real book count to test against.
6. **Renting a server, if the Pavilion ever needs to be reachable by
   more than just this machine.** Not started, not urgent — MinIO's
   local bucket moves to Cloudflare R2 or Backblaze B2 (same API, no
   client code changes) whenever that day comes; Supabase is already
   cloud-hosted today and doesn't need to move at all.

## What doesn't change

Everything already built — the Reader, the notes panel, the shelf
browser, the Caravan/Steward Review pipeline, badges, accounts — keeps
working exactly as it does today. This plan only touches *where the raw
text of a full book physically lives* and *how the client fetches it*.
