# The Self-Hosted Stack — owning the whole backend, off Supabase

Written 2026-07-12, at direct request. The user keeps book text local (MinIO in
Docker, a 100 GB reserve) and **is not a fan of Supabase**; the chosen direction
is the **full self-hosted stack** — local Postgres + MinIO in Docker now, and a
small VPS running the *same* stack later, only if a shared Commons is ever
actually wanted. This plan gets there honestly, in slices, with nothing lost and
no cloud dependency required at any step. A written plan; **build later.**

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
