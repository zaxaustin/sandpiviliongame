# A database everyone gets — Postgres inside the app, Docker when it's there

**Written 2026-08-04, for review. Nothing here is built.**

From the steward:

> *"should we add a backend framwork to the electron game before the next beta
> build? and should we make it able to connect to the one in docker?"*

## The recommendation, up front

**Build it — but AFTER the next beta, not before. And design for both now.**

The beta's one job is to put the Pavilion in front of a real second person: his
teacher friend. **Nothing in the teacher path needs a database** — set texts,
reading doors, the handout, the Study Table, labelling, notes and the residents
all run on the save alone. Adding a new storage engine to that release buys that
person nothing and costs a fresh class of packaging risk, in the exact place
this project keeps getting burned: `base:'./'` missing, `pg` thought unpackaged,
electron-builder EPERM. A release whose purpose is a first real user is the
worst possible release to also debut a database in.

**After it, though, this is the highest-value structural work left**, because it
retires the whole "locked until Docker" category — which is a thing we invented
to work around a limitation, not a thing anyone wants.

## And yes — both, behind one seam that already exists

This is the part that makes it cheap. `electron/db.cjs` is already built for
it and was, by accident, built exactly right:

- **Named queries only.** The renderer asks for `'unshelved'` or
  `'searchBooks'` and never sends SQL. `QUERIES` and `WRITES` are the whole
  interface — 244 lines, and the renderer cannot tell what is underneath.
- **`getPool()` is the only function that knows `pg` exists.** One function.
- **The connection is lazy and fails soft** — 27 ms, then the app carries on.

So the change is: `getPool()` becomes `getBackend()`, and returns one of two
things behind the same `query`/`write`/`writeMany`/`status` surface.

```
  Docker Postgres running?  ──yes──▶  pg Pool          (this machine, unchanged)
            │
            no
            ▼
  PGlite in userData/db     ──────▶  embedded Postgres (everyone else)
```

**Docker wins when present**, because on this machine it is the real thing and
already holds MinIO beside it. PGlite is what a stranger gets, silently, with
nothing installed.

## Why PGlite and not SQLite

`better-sqlite3` is smaller and far more mature. It is still the wrong choice
here, for one reason that outweighs both: **our schema is Postgres.** `TEXT[]`,
`GIN`, `to_tsvector`, `BIGSERIAL`, `TIMESTAMPTZ`, and four views. SQLite means
**a second schema, kept in step by hand** — the two-implementations rot
`CLAUDE.md` forbids and `store.js` already carries a scar from:

> *"the fallback path was the only path anyone actually ran, which meant it was
> load-bearing while still being written and tested as a fallback."*

PGlite runs `tools/schema.sql` and `tools/migrations/*.sql` essentially
unchanged. One schema, one set of migrations, one truth — and the migrations are
already `IF NOT EXISTS` throughout and already proven re-runnable.

## The build, in order

1. **`@electric-sql/pglite`** as a dependency (~25 MB unpacked). Data directory
   under `app.getPath('userData')/db`.
2. **`getPool()` → `getBackend()`** in `electron/db.cjs`. Two adapters, one
   surface. `QUERIES`, `WRITES`, `query`, `write`, `writeMany` untouched.
3. **Run the schema and migrations on first open**, in order, from the files
   already in `tools/`. No second copy of the SQL, ever.
4. **`status()` says which one it is** — the visitor should be able to see
   whether they are on the embedded database or the container, and the
   title-screen line should stop implying a database is a Docker thing.
5. **Verify in the PACKAGED app**, not `npm run dev`. This is the step that
   matters and the one this project has skipped before.
6. **Retire the locks.** Every "needs the local database" gate becomes
   unconditional. Keep the absent-or-locked *rule* — it is still right for
   anything genuinely optional — but this particular category disappears.

## What must be measured before committing

- **Installer size, before and after.** ~25 MB unpacked is the package; what
  lands in the .exe is the number that matters.
- **First-open time.** Creating the schema on a cold start must not sit in front
  of a new visitor. If it does, it happens lazily, after the title screen.
- **`test/live/backend.mjs` against PGlite**, and the whole suite with Docker
  *stopped* — which now means "on PGlite" rather than "on nothing", so that
  suite's meaning changes and its comments must change with it.
- **`to_tsvector` / `GIN` actually working** in PGlite, not assumed. Migration
  002's full-text index is the single most valuable thing a database buys here;
  if it does not work, this plan is worth much less and we should know that on
  day one rather than after the swap.

## What this does NOT change

- **MinIO stays a Docker thing.** Book text is big and opaque; object storage is
  right for it and there is no embedded equivalent worth having. The desktop app
  already writes personal texts to real files under userData, which is the
  answer for everyone who has no container.
- **The save stays the source of truth.** `notes.save_key` is `UNIQUE` because
  the save owns identity and the database indexes it. An embedded database makes
  the index available to everyone; it does not make it the master.
- **The beta still ships without any of it.** Seed + localStorage remains a
  complete Pavilion, and the release gate stays.

## What would tell us this was the wrong call

- The installer grows enough that a first-time downloader hesitates.
- PGlite's full-text search turns out to be materially weaker than real
  Postgres, and "search every note" — the whole reason a database is here —
  lands as a disappointment for the people who only have the embedded one.
- It takes more than a session or two, at which point it is competing with the
  Study Table and the teacher path for attention, and those have a person
  waiting on them.
