# The Self-Hosted Stack — owning the whole backend, off Supabase

Written 2026-07-12, at direct request. The user keeps book text local (MinIO in
Docker, a 100 GB reserve) and **is not a fan of Supabase**; the chosen direction
is the **full self-hosted stack** — local Postgres + MinIO in Docker now, and a
small VPS running the *same* stack later, only if a shared Commons is ever
actually wanted. This plan gets there honestly, in slices, with nothing lost and
no cloud dependency required at any step.

> **STATUS (2026-08-03) — PHASE 1 IS BUILT.** This said "a written plan; build
> later" for three weeks after the thing was standing up. It is not a plan any
> more at the bottom of the stack:
>
> - **Postgres and MinIO both run in Docker** — `docker-compose.yml`,
>   `tools/schema.sql`, and numbered re-runnable migrations in
>   `tools/migrations/`.
> - **294 books, 6,361 chapters, plus notes and records tables** are in it.
> - `electron/db.cjs` is the bridge (named queries only, fails soft in 27ms
>   with the container stopped); `store.js hydrateFromDb()` pulls the
>   catalogue once at boot and **merges upward**, so a shelf you assigned
>   always beats a NULL.
> - **The app still runs with every container stopped**, and that is a tested
>   release gate (`test/live/backend.mjs`, 12 checks).
>
> The reason it finally happened is worth keeping, because it is not the one
> written above: not local-first preference, but that **Supabase did not allow
> AI integration on the backend**. A resident should ASK a question of the
> library rather than be handed a pasted list and left to guess.
>
> **Genuinely still open:** the VPS running the same stack, auth (named here
> as the one honestly hard piece, and still is), and anything to do with a
> shared commons. Those wait for a second person, exactly as this plan says.

**The ethos this serves:** local-first, own-your-data, "build it ourselves
before a third party" (README standing decisions). Supabase was always kept
optional/dormant here; this makes *off* the direction, not just the fallback.
See [[feedback_prefer_local_over_supabase]].

---

## Where things actually stand (read from the code, not assumed)

**Already Supabase-free:**
- **Book full text** — in MinIO (`localhost:9000`, local Docker) or as files
  (desktop) or inline in the seed. The reader fetches from MinIO. Never cloud.
- **Player save** — `localStorage` (single device). Always local.
- **The whole game** if Supabase is simply unconfigured: `store.js` starts from
  the bundled `seed.js` catalog and only *swaps in* a Supabase mirror if one
  answers. No config → seed + MinIO, fully working.

**What still touches Supabase today (all of it optional, most of it multi-user):**
| Feature | Supabase piece | Needs a *server* at all? |
|---|---|---|
| The fuller catalog (~51 cards vs. 22 in seed) | `library_documents` table | No — it's just metadata; a file can hold it |
| Ranked full-text search | `search_library_documents` RPC | No — client-side local search already the fallback |
| Cross-device save sync | `player_saves` table | Yes — needs a shared server to sync between devices |
| Café Notice Board / Residents' Board | `exchange.js` / `agentNotes.js` tables | Yes — shared, multi-writer |
| Accounts + steward moderation | `auth.js`, `profiles`, `is_steward()` | Yes — identity is inherently server-side |

**The key insight:** for a **single local Pavilion**, *none* of the
server-needing features are actually in use. Only the catalog + search touch
Supabase, and both have zero-server local answers. So the single-user Pavilion
can be **completely Supabase-free with no feature loss** — that's Phase 1.

---

## The one distinction to decide up front: the *service* vs. the *software*

"Not a fan of Supabase" can mean two different things, and they lead different
places — worth naming so the choice is deliberate:

- **The hosted *service*** (supabase.com, a cloud account, their servers holding
  your data). Disliking this is the local-first instinct, and this plan removes
  it entirely.
- **The open-source *software*** (Supabase is self-hostable — Postgres + PostgREST
  + GoTrue auth + Storage, all in Docker, on *your* machine, nobody else's).
  Self-hosting it would mean the app's existing client code keeps working
  unchanged, just pointed at `localhost` — the least-code path to a real DB.

This plan's recommendation: **remove the hosted service in Phase 1** (serverless
local catalog — no DB at all for single-user), and **when a real DB is
eventually needed (Phase 2/3), prefer a minimal own stack** (plain Postgres +
a thin API) over self-hosting Supabase's software — truer to "build it
ourselves." But self-hosted Supabase-OSS is named here as a legitimate, lower-
effort middle option if the own-API work ever isn't worth it. Decide at Phase 2,
not now.

---

## Phase 1 — Catalog goes local & serverless (the real "off Supabase" step)

Make the single-user Pavilion need no Supabase at all, losing nothing.

1. **Export the live catalog** (all ~51 `library_documents` rows) out of
   Supabase into a **local source** — either straight into `seed.js`, or a
   local `catalog.json` the app loads at startup. The rows are small metadata;
   the book *text* already lives in MinIO and is untouched.
2. **`store.js` already has the seam:** it reads a synchronous in-memory
   `libraryDocs`, seeded from the bundle and *optionally* swapped for Supabase.
   Point that at the local catalog file instead of Supabase; keep the seed as
   the ultimate fallback. No call site changes (every `allDocs()`/`getDoc()`
   stays synchronous).
3. **Search:** drop the Supabase RPC path in favor of the existing client-side
   local search (already the fallback everywhere). For one machine's catalog,
   client-side search is entirely adequate.
4. **Turn Supabase off** (`.env.local` without the keys — the beta build already
   proves the whole Supabase tree shakes out). Verify: shelves, Index, Reader,
   residents' grounding all work from local catalog + MinIO text.

**Deliverable:** a single local Pavilion, full 51-book catalog, zero Supabase,
zero cloud, book text in your 100 GB MinIO. This is 90% of what "off Supabase"
means for you, and it's mostly a data export + one adapter change.

---

## Phase 2 — A local Postgres in the Docker stack (when a file isn't enough)

Only needed when the catalog grows past what's pleasant to regenerate as a file,
or you want to *write* catalog entries live (not via the `promote-draft.py`
pipeline). Then:

1. **Add Postgres to the same `docker-compose` as MinIO** — one local stack, one
   `docker compose up`, both surviving reboot (MinIO already is).
2. **A thin read/write API** the renderer can call (the browser can't speak raw
   Postgres): either **PostgREST** (auto-REST over Postgres, minimal), a **small
   Node/Express service**, or — desktop-only — the **Electron main process**
   querying Postgres and exposing it via `desktopBridge` (the same pattern that
   already proxies Ollama and MinIO).
3. **`store.js` gains a `local-api` source** alongside seed/Supabase — same
   pluggable-adapter, same NoProvider-style fallback. The app never cares which
   backend answered.

Migration of the schema is trivial — it's the same `library_documents` shape the
Supabase mirror already uses.

---

## Phase 3 — The shared Commons on your own VPS (only if/when wanted)

The genuinely server-needing features (cross-device sync, café boards, accounts/
steward moderation) only matter once there's more than one device or person.
When that day comes:

1. **A small VPS runs the same Postgres + MinIO Docker stack** the dev machine
   already runs — the hybrid backend already recorded in the README (2026-07-11).
   Same images, same schema; you're renting a box, not a platform.
2. **Auth/accounts:** the one honestly hard piece to hand-roll well. Options, in
   order of build-it-ourselves purity vs. effort: a minimal magic-link service,
   self-hosted GoTrue (Supabase's auth, OSS), or a small third-party *identity*
   provider if hand-rolling auth proves not worth the risk (named honestly, per
   the "reach for a third party only when genuinely not buildable in reasonable
   time" rule).
3. **The client** points its one `baseUrl` at your VPS instead of Supabase; the
   adapter seam means little else changes.

This is the only phase that costs money (a VPS), and it's deferred until there's
a real second person/device to serve — no server rented before the need.

---

## Design principles that make this safe

- **The adapter seam is everything.** `store.js` and `provider.js` already prove
  the pattern: a swappable source with a permanent local fallback, every call
  site indifferent to which backend answered. Every phase here is "add a source
  to the seam," never "rewrite the callers."
- **Never regress the local-only path.** At every phase, an unconfigured
  Pavilion must still run from seed/local + MinIO. That's the invariant that
  keeps a fork (or a tester) working with zero setup.
- **Don't build new features that *require* Supabase** in the meantime
  ([[feedback_prefer_local_over_supabase]]) — target the local source, or make
  the feature server-optional.
- **Honesty about auth.** Identity is the one piece where "build it ourselves"
  meets real security risk; the plan says so plainly rather than pretending a
  hand-rolled auth is free.

---

## Cross-references

- `LIBRARY-SCALING-PLAN.md` — the MinIO/Docker setup this builds on; the
  Postgres addition slots into the same compose.
- `CAPACITY-AND-PIPELINES.md` — where the current storage split is spelled out.
- README "Backend, decided (2026-07-11)" — the hybrid VPS decision this makes
  concrete.
- `data/store.js`, `data/supabase.js`, `data/auth.js`, `data/exchange.js`,
  `data/agentNotes.js` — every current Supabase touchpoint, itemized above.

**One line to hold onto:** the books are already yours and local; this plan
makes the *whole* backend yours and local, one honest slice at a time — and
never rents a server before there's actually someone on the other end of it.

---

## Built 2026-07-26 — personal books stored in local MinIO (the 100 GB space)

The first real slice, chosen by the user (over desktop-files and localStorage):
drag-and-drop personal books now store their **full text in the local Docker
MinIO**, not in the fragile localStorage save. This fixes the reported data loss
at its root — the save stays tiny (just the catalog card + a `storage:{bucket,key}`
pointer), so a bulk import can't blow the ~5 MB localStorage quota.

**How it works (desktop app only — the standing "desktop is the focus" decision):**
- `electron/main.cjs` gains `desktop-minio-write` / `desktop-minio-delete` IPC
  handlers that upload/remove via `mc` in a throwaway container (`docker run
  minio/mc … mc pipe`), exactly like `tools/caravan/push-fulltext.py`. Host
  reached via `host.docker.internal`; creds read from env or `.env.local`
  (`MINIO_ROOT_USER/PASSWORD/ENDPOINT/BUCKET`), never from the renderer. Objects
  land under a `personal/` key prefix in the `sand-pavilion-library` bucket.
- `electron/preload.cjs` exposes `minioWrite`/`minioDelete` on `desktopBridge`.
- `shelveAsPersonal()` now prefers MinIO → falls back to an app-data file →
  falls back to inline. The Reader already loads `storage:{bucket,key}` over
  plain HTTP (`VITE_MINIO_ENDPOINT`), the same path as the certified texts —
  verified anonymous GET returns 200.
- Round-trip proven from the CLI before wiring (upload via mc → curl 200).

**Needs in-app verification** (can't drive Electron from the dev harness): run
`npm run electron:dev` with Docker running, drop a book, confirm it reads back and
survives a restart; check the object with `mc ls local/sand-pavilion-library/personal/`.

**Fallbacks / limits:** if Docker/MinIO isn't running, the write fails cleanly and
the book falls back to an app-data file (still durable on desktop). The **web
build** has no bridge, so it stays localStorage/inline (quota-limited) — unchanged.

**Bonus direction the user raised:** because the library text lives in MinIO, we
can **ship curated packages** (classic-book bundles, lesson-plan sets) *with the
beta* by seeding a MinIO bucket/prefix — a real "starter library" a tester gets
on day one. Worth its own small plan when we get to beta packaging.

**Next slices (unchanged from the plan above):** local Postgres for the catalog +
logs (so data is queryable and inspectable, not just localStorage JSON); a tiny
local API; then the web build can point at the same self-hosted stack.

---

## The commons library's backend — asked directly 2026-07-27, answered plainly

The question, in the user's words: *"If people want to get books from proper
sources, or name the source themselves — as long as it's books or self-written
— can I save them in the commons in the 100 GB Docker container? How should we
handle the backend of the commons library for now and in the future?"*

**Now: yes, and it already works — but "commons" is doing two jobs in that
sentence, and they need splitting.**

**1 · Storing them: already built.** The Caravan Desk's "Add a text by hand"
has a free-text **Source** field and a "Not listed / unknown source" option, and
the license field is explicitly optional. `shelveAsPersonal()` writes the text
to **local MinIO first** (the 100 GB reserve), falling back to an app-data file,
then inline. So a book from a proper source, a book whose source you typed
yourself, and a thing you wrote all land in the container today.

**2 · But your MinIO is *yours*, not a commons.** It is storage on one machine.
Nothing connects two people's containers; a tester with no Docker gets files
instead, and their books never arrive in yours. Calling it "the commons" invites
a promise the architecture doesn't make.

**3 · What is actually shared today is a file a person carried** — a *packet*
(Commons Table) or a *bequest* (Inheritance Hall). That is a real commons with
no server at all, and it is the one that works for the beta.

**4 · The license line, which is the part that actually constrains this.**
Your own shelf: anything you like, no license needed — a personal copy is your
business. Anything that *travels*: needs a genuinely redistributable license
(public domain, CC0/CC BY, or your own writing). The bequest exporter already
enforces exactly this, sending non-redistributable texts as catalog cards
instead. "Books from proper sources, or self-written" is the right instinct:
self-written is unambiguously yours to give.

### The staging

| | What runs | Who it serves | Cost |
|---|---|---|---|
| **Now (beta)** | Nothing. Seed catalog + MinIO or files, per machine. Sharing = handing over a file. | one person per Pavilion | £0 |
| **Next** | Catalog moves local (a `catalog.json`, then Postgres beside MinIO in the same compose). Still per-machine. | one person, but inspectable and queryable | £0 |
| **Later, only when there is genuinely a second person** | One small VPS running **the same** Postgres + MinIO stack. Other people's books land in one real shared library. | a group | a rented box |

**The rule that keeps the ordering honest: no server is rented until there is
actually someone on the other end of it.** Every step above is additive, and
none of them invalidates a Pavilion that stays entirely local — which must
remain the normal case, not the degraded one.

**When the VPS day comes, the three real pieces of work** are: identity (the
one honestly hard part — a minimal magic-link service, self-hosted GoTrue, or a
third-party identity provider, named rather than pretended away), moderation (a
shared library needs the Steward Review Queue to become a *real* multi-user
queue rather than a local one), and takedown/provenance discipline at scale
(one person can vouch for 51 books by hand; a hundred people cannot).

**What not to do in the meantime:** don't build a feature that *requires* a
server, and don't describe the local MinIO as a shared commons in any
user-facing text. `MAINTAINING.md`'s backend table and `README.md`'s "where
your things are kept" both state the current truth; keep them true.
