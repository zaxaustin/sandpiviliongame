# Commons Server Tightening — architecture notes

**Status:** Advice taken, not yet merged into `COMMONS-BACKEND-PLAN.md`
**Date:** 2026-08-07
**Source:** outside advice the steward sought and chose to take
**Sits with:** `plans/COMMONS-BACKEND-PLAN.md`,
`plans/PRIVACY-AND-WEBSITE-PATHWAY-PLAN.md`

Concrete ways to tighten the backend architecture and the overall Pavilion setup
so the three tiers + optional Commons server stay healthy for years instead of
becoming fragile or noisy.

**This file is deliberately separate rather than pasted into
`COMMONS-BACKEND-PLAN.md`.** That plan is long and predates this advice; merging
them without reading both in full would risk two contradictory specifications
under one title, which is the exact failure this project keeps paying for. The
merge is a real task, listed in the reconciliation note.

---

## 1. Backend Architecture Tightening (the biggest lever)

Stick hard to the packet model, but make the server even thinner.

- **Content-addressed everything** (SHA-256 of the payload as the ID). This is
  already in the Commons Backend plan — keep it absolute. Notes, annotations,
  graduation packets, Mission fragments, and library contributions all become
  the same kind of object.
- **Two-layer server only:**
  - **Static layer** (nginx / Cloudflare R2 / S3-compatible): serves
    `index.json` + the actual packet files. Read-only and cheap forever.
  - **Tiny write layer** (Cloudflare Worker, small Node process, or even a
    single Deno script): only accepts signed POSTs, verifies the signature,
    checks the allowlist (for Inner/Core), and writes the new packet + updates
    the index. No sessions, no user database, no real-time anything.
- **Allowlists instead of accounts.** Graduation Packet → public key goes on the
  Inner list. Core is a second, smaller allowlist (or invitation packets that
  grant temporary write rights). This keeps identity portable and reversible.
- **No database until you actually need threaded discussion.** Start with pure
  packets. If later you want light threads under a book hash, add a tiny SQLite
  table that can itself be exported as a packet every night. Never let a
  database become the source of truth.

This keeps monthly cost near zero and makes the whole Commons forkable or
movable in an afternoon.

---

## 2. Packet Schema Evolution (so it doesn't break in 2–3 years)

Define a small, versioned envelope now:

```json
{
  "v": 1,
  "type": "annotation" | "graduation" | "course" | "mission-fragment" | "note-on" | "...",
  "id": "sha256-of-payload",
  "created": "ISO timestamp",
  "author": { "pubkey": "...", "sig": "..." },
  "targets": ["book-hash-or-doi", "..."],
  "license": "...",
  "payload": { }
}
```

- Always include `"v"`. Future readers can ignore unknown fields.
- Keep the payload itself human-readable Markdown + structured front-matter
  where possible.
- Add a simple `supersedes` or `builds-on` field early so notes and Mission work
  can form clean chains without a graph database.

---

## 3. Local App Resilience & Update Path

- **Progressive enhancement only.** Network features (pull index, publish,
  community notes) must fail silently and never block core offline functions.
  The app already has this DNA — protect it.
- **Local cache of the public index.** On successful pull, store the latest
  `index.json` + a few recent packets. Offline users still see what was last
  available.
- **App update strategy:**
  - Electron: continue with the existing installer + GitHub Releases.
  - Web version: Vercel stays the Outer face; it can also serve a lightweight
    "latest packet index" mirror.
  - Optional: a tiny "Pavilion Update" packet type that the local app can check
    for (still user-initiated).

---

## Where this agrees with the house rules, and where it needs a second look

**Agrees, strongly:**

- *"Never let a database become the source of truth"* is the same sentence as
  the one already in `MANUAL.md` and the beta release notes about the local
  database being an **index over your work, not a second copy of it**. The save
  is the truth; Postgres is derived and rebuildable. Good that the Commons wants
  the same shape.
- *"Two-layer server, no sessions, no user database"* is the only version of a
  Commons that survives the steward losing interest in running it for a year.
- Content addressing removes the question "is this the same packet I already
  have", which is otherwise a hand-written comparison that will drift.

**Needs a second look before it is built:**

1. **"Fail silently" is the one phrase to reject.** House rule 5 is *silent
   failure is the house failure mode*, and rule 5 is written in scars. The
   intent here is right — a failed network call must never block offline work —
   but the implementation must be **fail visibly, proceed anyway**: the panel
   still opens, the local content is still there, and a quiet line says the
   index could not be reached. That is the same distinction the database already
   makes with `status().error`, and it is why the title screen names its home in
   one plain line.

2. **Signature verification means key management**, and key management is the
   part that hurts a lay user. `PRIVACY-AND-WEBSITE-PATHWAY-PLAN.md` promises
   *no terminal required, no config file*. A keypair a person can lose, and a
   signature they cannot inspect, is a real usability cost that should be
   designed before it is specified. This is the single largest unknown in the
   whole document.

3. **The allowlist is a moderation system wearing a different hat.** Deciding
   who is on it is a governance question, not an architecture one, and
   `feedback_guidance_not_enforcement` says the line is at *spreading*, not
   *holding*. An allowlist gates spreading, so it is on the right side of that
   line — but it needs the written answer to "who removes someone, and on what
   grounds" before the first key goes on it, not after.

4. **`"type"` is a hand-maintained list that must match the code that reads
   it** — house rule 4's exact shape. Derive the accepted types from one place
   and let both the writer and the validator read it, or it drifts the first
   time a fifth type is added.
