# The Beta Build — what ships, how it's packaged, and what to iron out first

> **STATUS (2026-07-11, same day): BUILT — on the `beta` branch.** Phases 0–4
> below were walked end to end: storage fork resolved as §5(A) (Electron-native
> personal library, built), welcome packet = the 21-text seed as-is, provenance
> split built (👤 Your Shelf), local-only mode via `.env.beta` +
> `electron:build:beta` (bundle verified key-free), first-arrival orientation
> built, tiered model guide written (PROTOCOLS.md P2 + Connections panel), and
> a real installer produced: `release/Sand Pavilion Setup 0.1.0-beta.1.exe`.
> **Still open:** §6.8's clean-machine install test, and a live click-through
> of the shelve→read flow. Details in `archive/dev-log-2026-07-11.txt`.

Written 2026-07-11, at direct request: a full build plan for a Pavilion
someone can **download and run on their own computer** for their own use.
This is the *mechanics* companion to [`BETA-LAUNCH-PLAN.md`](BETA-LAUNCH-PLAN.md)
(the stance) — this doc answers "what's in the build, what's not, how do we
package it, what backend, and what has to be solved before we press build."

**The governing principle** (from BETA-LAUNCH-PLAN): the **shell ships, the
content is theirs**. The interface — the world, the residents (Quill, the
Monk, Sebastian), the Library room, the desks — is the finished product. The
**books and the local AI are what each person brings** to complete it on
their own machine. So the build is a self-contained, local-first desktop app
with clear outlets for the user to fill it. No account required, no server
required, nothing phones home.

---

## 1. What the build IS

A **Windows desktop app** (Electron), installed from a `.exe`, that runs
entirely on the user's machine. Same codebase as the web build; the desktop
wrapper exists because it fixes the local-AI CORS wall and gives real
filesystem/native-dialog access (see
[`DESKTOP-APP-PLAN.md`](DESKTOP-APP-PLAN.md)). Start Windows-only (the dev
machine's platform); macOS/Linux are a later port, not a beta blocker.

---

## 2. What to INCLUDE

Everything that is the *shell*, and every *outlet* the user needs to fill it:

- **The whole world** — Grounds, Library, Study, Workshop (all three floors),
  Café, the Eightfold-Path Keep, the reading nook, fishing, meditation.
- **The three residents + the full chat stack** — `CHAT_AGENTS`, the charters,
  agent memory, the pocket phone, and **live streaming** (built 2026-07-11).
- **The day-management spine** — the Writing Desk/planner, **Sebastian's
  calendar + scheduler** (talk to him → timed events + to-dos), the due badge,
  Still Open, and the **Your Notes** log with **folders/tags** and Sebastian's
  scoped folder-review (all built 2026-07-11).
- **The Library UI + the seed** — the shelves, the Reader (with read-aloud),
  the Index with search, and the bundled `seed.js` welcome packet (size TBD —
  see §6).
- **The "fill it yourself" outlets** — the Connections panel (bring your own
  Ollama/model), the Caravan Desk (drag-drop `.txt` intake + the terminal
  tools in `tools/caravan/`), and the two teaching docs:
  [`PROTOCOLS.md`](../PROTOCOLS.md) and the in-world "How to Complete Your
  Own Pavilion" book.
- **Data ownership** — Export/Import save, the Your Data panel, the Idea Jar,
  badges, activity log. All local.
- **The zero-config guarantee** — it must run and be enjoyable with **no
  Supabase, no cloud AI, and (see §5) no Docker**. Every cloud/optional piece
  degrades gracefully to a local default.

---

## 3. What NOT to include (strip or disable for beta)

- **The bundled Supabase Commons.** Today Supabase (when configured) powers
  the shared café boards, account/magic-link sync, steward moderation, and
  the mirrored catalog. **The beta must NOT ship pointing at Zac's own
  Supabase project** — that would put every tester on one shared database and
  one shared Library. For beta, ship **local-only**: no `.env` Supabase keys
  in the build, so the app uses its local fallback path for everyone. The
  shared/hosted Library is a later, deliberately-separate thing (§5, §7).
- **Any secret or key.** Git history is already confirmed clean (DESKTOP-APP-
  PLAN); the build must carry no service-role key, no API key, nothing.
- **Nothing half-built pretending to be finished** — the five sketched
  Workshop rooms keep their honest "not open yet" replies (already true).
- **The steward/moderation UI** is meaningless with no shared backend — hide
  or no-op it in local-only mode rather than show dead buttons.

Keep the Caravan tools **in** — they're how a user grows their own Library,
not dev-only scaffolding.

---

## 4. How to PACKAGE it

- **Build command:** `npm run electron:build` → a real Windows installer in
  `release/`. Proven end-to-end (DESKTOP-APP-PLAN Phases 1–4), including
  running the packaged installer itself.
- **Unsigned, on purpose.** Windows will show an "unknown publisher" warning
  the first run — expected for a personal/small project, documented in the
  README. Code-signing is a paid cert; a later nicety, not a beta blocker.
- **What the installer contains:** the static `dist/` build + the Electron
  runtime + `electron/main.cjs`/`preload.cjs`. No external services.
- **The one unverified thing:** a clean install on **hardware that never
  built it** (DESKTOP-APP-PLAN's remaining gap). This is a real pre-ship test
  — ideally on a second machine or a fresh VM.

---

## 5. What BACKEND is good — and the real storage decision

**For the beta: no backend at all.** The whole pitch is local-first — a
Pavilion that belongs to the machine it runs on. That means solving one
genuine problem before we build:

**The full-text storage problem.** Today the split is: catalog → Supabase,
full **book text** → local **MinIO running in Docker**. Neither survives a
"download and run" beta as-is:
- Supabase is being dropped for local-only beta (§3), and the user's stated
  direction is **"the books should live on Docker, not Supabase"** anyway.
- **But requiring a beta tester to install Docker + run MinIO is too much.**
  A person downloading a `.exe` to try it will not stand up a container.

So there's a real fork to decide **before building** — the single most
important pre-build call:

- **(A) Electron-native local storage (recommended for beta).** Store book
  text as plain files (or a small embedded store) under Electron's own
  `app.getPath('userData')`, read through the existing `preload`/`main`
  bridge — the same seam that already proxies Ollama and does the save
  dialog. Zero external dependencies; the book genuinely lives on the user's
  disk; no Docker. This reframes "books live on Docker" as "books live
  **locally**, in the app's own data dir" — which is the actual intent
  (local ownership), delivered without asking the user to run infrastructure.
- **(B) Keep Docker/MinIO.** Fine for Zac's own daily machine and for a
  future *shared host*, but wrong to require of a beta tester. Treat MinIO as
  the **host/dev** option, not the shipped one.

**Recommendation:** ship **(A)** for the beta; keep MinIO available for the
dev/host machine and for the eventual shared library. The seam that makes
this cheap already exists (the desktop bridge).

**The later shared library** (the user's own plan): when it's time to host
one live Library *for everyone*, rent a small cloud server (a VPS running
MinIO + Postgres, or a managed equivalent). Costs real money; needed only for
the shared/federated layer, not for anyone's personal Pavilion. Deliberately
out of scope for the first beta.

**AI backend:** none of ours — the user's own local Ollama (or an opt-in
cloud key they add themselves). Already how it works.

---

## 6. What to IRON OUT before we build

A checklist, roughly in priority order. Most are small; two are real.

1. **Local full-text storage without Docker (§5, option A).** The one real
   engineering task. Until it's done, a downloaded beta shows big books as
   summaries only.
2. **Local-only mode hardening.** Confirm the build with no Supabase config
   runs clean everywhere (search falls back, café/steward/account hidden or
   no-op, no console errors, no dead buttons). Partly already true via the
   zero-config fallback — needs a deliberate pass.
3. **The welcome-packet decision** (BETA-LAUNCH-PLAN). Empty Library + user
   fills it (the user's leaning), or a curated seed? And reconcile the
   **seed(21) vs live(49)** gap — most books currently live only in Zac's
   Supabase, not the shipped `seed.js`. Decide, then either backport chosen
   books into `seed.js` or ship intentionally lean.
4. **The personal / certified provenance split.** The "books you can't
   certify go **under the user** (personal), not the shared certified shelves"
   model — a real, small data/UX addition so a tester's own uncertified
   uploads are clearly theirs, not passed off as commons.
5. **A minimal first-arrival orientation.** Not the full tutorial — just
   enough that someone who isn't Zac knows where to start (and that nothing
   breaks by clicking around). Pairs with the in-world protocol book.
6. **The Monk's tiered-model recommendation** (BETA-LAUNCH #1). A short,
   vetted "pick this model for your machine" so a tester's flagship-resident
   first impression isn't a hang. Plus the safe-default guard.
7. **Save-compatibility discipline.** Testers will update the app; their
   saves must survive. The `freshData()` + per-field migration pattern
   already does this well — keep every new field migration-safe (as the
   calendar and noteMeta both are), and consider using `saveVersion` for the
   first time if a shape ever changes rather than just grows.
8. **Clean-machine install test (§4).** The one genuinely unverified thing.
9. **Distribution hygiene.** MIT license present, README's "unknown
   publisher" note present, a short "what this is / how to start / nothing
   phones home" first-run page or readme for testers.

---

## 7a. Visual polish for the beta (user's note, 2026-07-11)

The user's own words: *"I like this low-res Pokémon-style game, but we don't
need to be afraid to make it look nicer for the beta build."* This is a
deliberate, bounded relaxation of the sleeper-car stance (`CLAUDE.md`), not a
reversal:

- **Keep the identity.** Low-res, pixel-art, top-down Pokémon feel stays —
  it's who the Pavilion is, and the cheapness is still the point (resources go
  to AI/Library/work).
- **Polish within that.** Sharper palette harmony, more consistent UI panels,
  a warmer title screen, small readability and charm passes — all fine and
  welcome. **The bar:** stays cheap (no heavy assets, no perf-hungry effects,
  nothing external — CSP-safe, self-contained), and never breaks a working
  feature. Looking nicer must not cost the sleeper-car advantage.

## 7. A phased build order (smallest safe path)

- **Phase 0 — decide.** §6 items 1, 3, 4 (the storage fork, the welcome-packet
  size, the provenance split). These shape everything; don't build first.
- **Phase 1 — local storage.** Implement §5(A): book text in the app's data
  dir via the desktop bridge, with the web build unchanged.
- **Phase 2 — local-only hardening + orientation.** §6 items 2 and 5.
- **Phase 3 — the model on-ramp.** §6 item 6 (tiered recommendation + safe
  default), so residents reliably talk on a stranger's machine.
- **Phase 4 — package + prove.** `electron:build`, then the clean-machine
  install test (§6 item 8) and distribution hygiene (item 9).
- **Ship a tiny beta** to a handful of people, and let real use — the way Zac
  is already dogfooding it — drive the next round, exactly as
  `BETA-TESTING-FEEDBACK.md` has captured every round so far.

None of this is urgent (the user's own call: beta is further out, daily
usefulness first). It's written down so that when it *is* time, the path is
already clear and the decisions are already named, not re-derived.
