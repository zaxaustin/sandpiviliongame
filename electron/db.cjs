/* ================================================================
   [THE DATABASE, FROM THE DESKTOP APP]

   A browser cannot speak to Postgres — it is a binary TCP protocol and a
   renderer only does HTTP. The Electron main process is Node, so it can,
   and this is the whole of that bridge.

   TWO RULES, and both are load-bearing.

   1. NAMED QUERIES ONLY. The renderer asks for 'unshelved' or
      'chaptersFor', never for a string of SQL. That keeps every statement
      in one readable file, makes them testable, and means a mistake in a
      panel cannot become a mistake in the database.

   2. IT MUST FAIL SOFTLY, ALWAYS. Every call returns null when there is no
      database — not an error, not a hang. The beta ships to people who have
      never installed Docker, and seed + localStorage is a complete Pavilion
      on its own. `npm run electron:dev` with the container stopped must
      behave exactly as it did before any of this existed.

      This rule is UNCHANGED by the embedded database below, and deliberately
      so. "Everyone has Postgres now" must not quietly become "everything
      assumes Postgres" — a corrupt data directory, a disk with no room, a
      platform where the WASM will not load, all still land here and still
      return null. The soft path is the one that was load-bearing before and
      it stays tested.

   The connection is lazy: nothing is attempted until something actually
   asks a question, so a Pavilion that never touches the database never
   pays for it.

   ----------------------------------------------------------------
   TWO HOMES, ONE DATABASE (2026-08-04, plans/EMBEDDED-BACKEND-PLAN.md)

     Docker Postgres answering?  --yes-->  pg Pool          (this machine)
               |
               no
               v
     PGlite in userData/db       ------->  embedded Postgres (everyone else)

   WHY THIS IS ONE PATH AND NOT TWO — and the reason has a scar behind it.
   store.js records what went wrong last time: "the fallback path was the
   only path anyone actually ran, which meant it was load-bearing while
   still being written and tested as a fallback."

   The difference here is WHERE the choice sits. It is BELOW the named-query
   seam, so both homes run the SAME SQL against the SAME schema from the
   SAME files in tools/. There is no second implementation to drift — which
   is exactly why PGlite and not better-sqlite3, since SQLite would mean a
   second hand-maintained schema and that is the rot CLAUDE.md forbids.

   And the fallback IS the common path now: everyone who is not the steward
   runs the embedded one. So test it as the primary, because it is.

   What this deletes is the real second path — "no database at all", where
   features were absent or locked and every resident's grounding had to be
   assembled by hand in JS. After this, every install has Postgres.
   ---------------------------------------------------------------- */
const path = require('path');
const fs = require('fs');

let backend = null;      // the resolved adapter
let opening = null;      // the in-flight open, so concurrent IPC calls share one
let state = 'unknown';   // 'unknown' | 'up' | 'down'
let lastError = null;
/* Set when a backend opened but its schema did not fully apply. Separate from
   lastError, which means "this home would not open at all" — a connected
   database that is behind on migrations is a different, quieter problem, and
   the one most likely to be mistaken for health. */
let schemaError = null;
/* THE LAST WRITE THAT FAILED, AND IT STICKS.

   `lastError` is wiped by the next successful call, and `status()` runs a
   ping first — so a write that failed a moment ago reported a perfectly
   healthy database. Finding the array bug above took a hand-written probe
   for exactly that reason: writeMany returned null, and null is also what
   "no bridge" returns, so there was nothing to tell them apart.

   A read that fails shows up immediately — the panel is empty. A WRITE that
   fails shows nothing at all until much later, when something is missing
   that nobody watched being saved. That is the house failure mode, so this
   one is kept until it is explicitly cleared. */
let lastWriteError = null;

/* Credentials come from .env beside the compose file — the same file Docker
   Compose reads, so there is one place to change them and no chance of the
   app and the container disagreeing. */
function readEnv() {
  const out = {};
  for (const dir of [path.join(__dirname, '..'), process.cwd()]) {
    const p = path.join(dir, '.env');
    try {
      for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const i = t.indexOf('=');
        if (i > 0) out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
      }
      if (Object.keys(out).length) return out;
    } catch (e) { /* no .env here; try the next place */ }
  }
  return out;
}

/* ---------- adapter 1: the container on this machine ---------- */
async function openDocker() {
  const env = readEnv();
  const password = process.env.POSTGRES_PASSWORD || env.POSTGRES_PASSWORD;
  if (!password) throw new Error('no POSTGRES_PASSWORD');
  const { Pool } = require('pg');
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || env.POSTGRES_HOST || '127.0.0.1',
    port: Number(process.env.POSTGRES_PORT || env.POSTGRES_PORT || 5432),
    database: process.env.POSTGRES_DB || env.POSTGRES_DB || 'pavilion',
    user: process.env.POSTGRES_USER || env.POSTGRES_USER || 'pavilion',
    password,
    max: 4,
    // Short, on purpose. A stopped container must look like "no database"
    // within a moment, never like a hung app.
    connectionTimeoutMillis: 1500,
    idleTimeoutMillis: 10000,
  });
  pool.on('error', () => { /* a dropped idle client is not a crash */ });
  // PROVE it answers before claiming it. Constructing a Pool connects to
  // nothing; without this the embedded database would never be reached on a
  // machine where the container is merely stopped.
  await pool.query('SELECT 1');

  /* The container gets the same schema and the same migrations as the
     embedded one. node-postgres sends a parameterless query to the server
     whole, so the dollar-quoted function bodies in schema.sql survive — no
     splitting on semicolons here, which would cut them in half.

     DELIBERATELY NOT FATAL, and deliberately not silent. Throwing here would
     drop through to the embedded database and split this machine's writes
     across two stores, which is a worse outcome than a schema that is behind.
     So: keep the connection the steward asked for, and make status() say what
     went wrong. */
  try {
    await applySchema(sql => pool.query(sql));
  } catch (e) {
    schemaError = 'docker schema: ' + e.message;
  }
  return {
    kind: 'docker',
    label: 'Postgres in Docker',
    query: (sql, params) => pool.query(sql, params || []),
    async tx(each) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await each((sql, params) => client.query(sql, params || []));
        await client.query('COMMIT');
      } catch (e) {
        try { await client.query('ROLLBACK'); } catch (_) { /* already gone */ }
        throw e;
      } finally { client.release(); }
    },
  };
}

/* Where the SQL lives. ONE copy, shared by both homes — in a packaged app
   `tools/` rides along inside the asar (see build.files in package.json).
   A second copy of the schema is the thing this design exists to avoid. */
function sqlDir() {
  for (const d of [path.join(__dirname, '..', 'tools'),
                   path.join(process.resourcesPath || '', 'app.asar', 'tools'),
                   path.join(process.cwd(), 'tools')]) {
    try { if (fs.statSync(path.join(d, 'schema.sql')).isFile()) return d; } catch (e) { /* next */ }
  }
  return null;
}

/* schema.sql, then every migration in numeric order. */
function schemaFiles() {
  const d = sqlDir();
  if (!d) throw new Error('cannot find tools/schema.sql');
  return [path.join(d, 'schema.sql'),
    ...fs.readdirSync(path.join(d, 'migrations')).filter(f => f.endsWith('.sql')).sort()
      .map(f => path.join(d, 'migrations', f))];
}

/* BOTH HOMES RUN THIS, and that is the whole point of the design.

   Until 2026-08-04 only the embedded one did. The container got `schema.sql`
   once, from the `docker-entrypoint-initdb.d` mount in docker-compose.yml,
   which fires ONLY on an empty volume and never mentioned `migrations/` at
   all — so 002 and 003 reached the container by hand, and 004 would not have
   reached it at all. The failure mode was the house one: a query naming a
   table that exists in one home and not the other, on a machine where
   everything looks healthy.

   "One schema, two homes" has to be enforced by the code that opens them, or
   it is a sentence in a plan rather than a property of the program.

   Safe to run every time: every statement is IF NOT EXISTS / OR REPLACE, and
   re-applying measured 7 ms against real Postgres — cheaper than tracking
   whether it already happened. */
async function applySchema(runRaw) {
  for (const f of schemaFiles()) await runRaw(fs.readFileSync(f, 'utf8'));
}

/* ---------- adapter 2: the one everybody else gets ---------- */
async function openEmbedded() {
  const { PGlite } = await import('@electric-sql/pglite');

  let dir;
  try { dir = path.join(require('electron').app.getPath('userData'), 'db'); }
  catch (e) { dir = path.join(process.cwd(), '.pglite'); }   // outside Electron (tests)

  const db = await PGlite.create(dir);

  /* Schema and migrations on every open — the same files, in the same order,
     as the container gets in openDocker(). Measured at 57ms to create and 7ms
     to re-apply.

     Fatal here, unlike on the Docker path: a fresh embedded database with no
     schema is not a database, and there is no earlier store to split writes
     away from. Failing sends getBackend() on to its "neither" case, which the
     Pavilion already survives. */
  await applySchema(sql => db.exec(sql));

  return {
    kind: 'embedded',
    label: 'built-in database',
    query: (sql, params) => db.query(sql, params || []),
    tx: (each) => db.transaction(t => each((sql, params) => t.query(sql, params || []))),
  };
}

/* Chosen ONCE, lazily, then kept — never per query. A mid-session switch
   would split writes across two stores, so the only way to re-decide is
   reconnect() below, which a person has to ask for. */
function getBackend() {
  if (backend) return Promise.resolve(backend);
  if (opening) return opening;
  opening = (async () => {
    try {
      backend = await openDocker();          // the container wins when present:
      state = 'up'; lastError = null;        // on this machine it is the real
      return backend;                        // thing, with MinIO beside it
    } catch (e) {
      lastError = 'docker: ' + e.message;
    }
    try {
      backend = await openEmbedded();
      state = 'up'; lastError = null;
      return backend;
    } catch (e) {
      // Both failed. Still soft: every call returns null and the Pavilion
      // carries on with seed + localStorage, exactly as it always could.
      state = 'down';
      lastError = (lastError ? lastError + ' | ' : '') + 'embedded: ' + e.message;
      opening = null;                        // let a later call try again
      return null;
    }
  })();
  return opening;
}

/* The explicit re-decide, for the Connections panel. Closing is best-effort:
   the point is to drop the choice, not to guarantee a clean shutdown. */
async function reconnect() {
  const old = backend;
  backend = null; opening = null; state = 'unknown';
  lastError = null; schemaError = null; lastWriteError = null;
  try { if (old && old.close) await old.close(); } catch (e) { /* let it go */ }
  return status();
}

/* Every statement the renderer may ask for. Add here, never inline. */
const QUERIES = {
  ping: 'SELECT 1 AS ok',

  // the whole catalogue, for the one hydration at startup
  catalogue: `SELECT b.slug, b.title, b.attribution, b.license, b.source_url,
                     b.shelf, b.kind, b.part, b.text_key, b.pages,
                     COALESCE(h.status, 'ok') AS health
                FROM books b
                LEFT JOIN book_health h ON h.slug = b.slug
               ORDER BY b.title`,

  // the sorter's work queue — "twenty at a time", straight from the database
  unshelved: 'SELECT slug, title, attribution, kind FROM v_unshelved LIMIT $1 OFFSET $2',
  unshelvedCount: 'SELECT count(*)::int AS n FROM v_unshelved',

  shelfCounts: 'SELECT shelf, n FROM v_shelf_counts',

  chaptersFor: `SELECT idx, page, label, source, confirmed
                  FROM chapters WHERE slug = $1 ORDER BY idx`,

  needsChapters: 'SELECT slug, title, pages, how, found FROM v_needs_chapters LIMIT $1',

  // what a resident can ASK, instead of being handed the whole shelf
  searchBooks: `SELECT slug, title, attribution, shelf
                  FROM books
                 WHERE title ILIKE '%' || $1 || '%'
                    OR COALESCE(attribution,'') ILIKE '%' || $1 || '%'
                 ORDER BY title LIMIT $2`,

  // ---- the Records Hall (migration 003) ----
  // It owns nothing: `ref` and `opener` point back at wherever the real
  // thing lives, so a record is never a dead end.
  records: `SELECT id, kind, title, detail, happened, ref, opener, slug, book_title, tags
              FROM v_records LIMIT $1`,
  recordCounts: 'SELECT kind, n, first, latest FROM v_record_counts',
  notesByPlace: 'SELECT place, n, books FROM v_notes_by_place',

  // ---- notes (migration 002) ----
  // everything written about one book, in the BOOK's order, with the real
  // chapter name rather than a number
  notesForBook: `SELECT chapter_idx, chapter_label, page, title, body, tags, created
                   FROM v_notes_by_book WHERE slug = $1`,

  // how much is written about each book - for a shelf card, without
  // loading a single note
  noteCounts: 'SELECT slug, title, notes, chapters_touched FROM v_note_counts',

  /* SEARCH EVERYTHING YOU HAVE EVER WRITTEN. The thing localStorage cannot
     do at all: Postgres builds and keeps the index itself.
     websearch_to_tsquery, not plainto_tsquery - it understands quoted
     phrases and OR, where plainto_ ANDs every word and quietly returns
     nothing for a two-word search whose terms sit in different notes. */
  // save_key is what the panel matches on: the save owns these notes and the
  // index only points at them, so a hit has to name the note in the save's
  // own terms or it cannot be opened.
  searchNotes: `SELECT n.id, n.save_key, n.source, n.slug, b.title AS book_title,
                       n.chapter_idx, n.page, n.title, n.body,
                       ts_rank(to_tsvector('english', COALESCE(n.title,'') || ' ' || n.body),
                               websearch_to_tsquery('english', $1)) AS rank
                  FROM notes n LEFT JOIN books b ON b.slug = n.slug
                 WHERE to_tsvector('english', COALESCE(n.title,'') || ' ' || n.body)
                       @@ websearch_to_tsquery('english', $1)
                 ORDER BY rank DESC LIMIT $2`,
};

/* Writes are separate and equally explicit. */
const WRITES = {
  setShelf: 'UPDATE books SET shelf = $2 WHERE slug = $1',

  // the merge that carries the steward's existing cards UP into the database
  // rather than letting a filename-derived row overwrite real work
  upsertCard: `INSERT INTO books (slug, title, attribution, license, source_url, shelf, kind, part, text_key, pages)
               VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'book'),$8,$9,$10)
               ON CONFLICT (slug) DO UPDATE SET
                 title       = COALESCE(NULLIF(EXCLUDED.title,''), books.title),
                 attribution = COALESCE(NULLIF(EXCLUDED.attribution,''), books.attribution),
                 license     = COALESCE(NULLIF(EXCLUDED.license,''), books.license),
                 source_url  = COALESCE(NULLIF(EXCLUDED.source_url,''), books.source_url),
                 shelf       = COALESCE(EXCLUDED.shelf, books.shelf),
                 kind        = COALESCE(EXCLUDED.kind, books.kind),
                 part        = COALESCE(EXCLUDED.part, books.part),
                 text_key    = COALESCE(EXCLUDED.text_key, books.text_key),
                 pages       = COALESCE(EXCLUDED.pages, books.pages)`,

  // a chapter the visitor marked themselves. source='hand' and confirmed
  // outrank every detector, and tools/load-library.mjs refuses to touch them.
  markChapter: `INSERT INTO chapters (slug, idx, page, label, source, confirmed)
                VALUES ($1,$2,$3,$4,'hand',TRUE)
                ON CONFLICT (slug, idx) DO UPDATE SET
                  page = EXCLUDED.page, label = EXCLUDED.label,
                  source = 'hand', confirmed = TRUE`,
  clearHandChapters: "DELETE FROM chapters WHERE slug = $1 AND source = 'hand'",

  /* A note carried up from the save. Keyed by the save's own key so syncing
     twice updates rather than duplicates - the save stays the place a note
     is WRITTEN, and this is the index over it. */
  upsertNote: `INSERT INTO notes (source, slug, chapter_idx, page, title, body, tags, folder, created, save_key)
               VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'{}')::TEXT[],$8,$9,$10)
               ON CONFLICT (save_key) DO UPDATE SET
                 slug = EXCLUDED.slug, chapter_idx = EXCLUDED.chapter_idx,
                 page = EXCLUDED.page, title = EXCLUDED.title, body = EXCLUDED.body,
                 tags = EXCLUDED.tags, folder = EXCLUDED.folder`,
  deleteNote: 'DELETE FROM notes WHERE save_key = $1',
  /* Everything the save no longer has. The save owns identity and the
     database only indexes it, so a note deleted there must not survive here
     — a search that returns a note you already threw away is exactly the
     silent wrong answer this project refuses. Passing an empty list DOES
     clear the mirror, which is correct when the visitor has no notes left;
     the mirror is derived and rebuilds on the next sync either way. */
  pruneNotes: 'DELETE FROM notes WHERE save_key IS NULL OR save_key <> ALL($1::TEXT[])',

  // ---- the Records Hall ----
  upsertRecord: `INSERT INTO records (kind, title, detail, happened, ref, opener, slug, tags, source_key)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,'{}')::TEXT[],$9)
                 ON CONFLICT (source_key) DO UPDATE SET
                   title = EXCLUDED.title, detail = EXCLUDED.detail,
                   happened = EXCLUDED.happened, ref = EXCLUDED.ref,
                   opener = EXCLUDED.opener, slug = EXCLUDED.slug, tags = EXCLUDED.tags`,
  // Hiding never deletes, and never asks why. It is the visitor's room.
  hideRecord:   'UPDATE records SET hidden = TRUE  WHERE source_key = $1',
  unhideRecord: 'UPDATE records SET hidden = FALSE WHERE source_key = $1',
  hideNote:     'UPDATE notes   SET hidden = $2    WHERE save_key = $1',
};

/* ---------- one shape of parameter, both homes ----------

   A JS array passed for a TEXT[] column WRITES on node-postgres, which
   serialises it, and FAILS on PGlite, which does not. Both halves measured,
   the embedded one 2026-08-04 and the Docker one 2026-08-07:

                   embedded      docker
     []            failed        wrote
     ['a']         failed        wrote
     ['a','b']     failed        wrote
     null          wrote         wrote
     '{}'          wrote         wrote
     '{a,b}'       wrote         wrote

   So the two homes genuinely disagreed about the same named write, which is
   the one thing this design exists to prevent.

   Nothing had ever caught it because `tags` is the only array column the
   app writes and syncNotes passes null for it — so the first real array
   parameter in the project's history was the Records Hall's, and it
   silently wrote nothing at all.

   That is precisely the divergence this design exists to not have: the
   renderer asks for a named write and must not care which home answers.
   So the normalising happens HERE, below the seam and above both
   adapters, and a Postgres array literal is what actually leaves — a form
   both accept.

   Measured against the real container 2026-08-07: an array with a space in
   a tag and an array with a `"` in a tag both survive the round trip, and
   [] arrives as an empty TEXT[] rather than NULL.

   The two homes are covered by two suites, on purpose. records.cjs
   redirects userData and points the port at nothing, so it is always the
   fresh-embedded case; docker-home.cjs runs only when the container
   answers and skips loudly when it does not. Neither can stand in for
   the other, which is the lesson this comment is made of. */
function pgArray(a) {
  return '{' + a.map(v => {
    if (v === null || v === undefined) return 'NULL';
    return '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }).join(',') + '}';
}
function normalizeParams(params) {
  if (!Array.isArray(params)) return params;
  return params.map(p => (Array.isArray(p) ? pgArray(p) : p));
}

async function run(sql, params) {
  const b = await getBackend();
  if (!b) return null;
  try {
    const res = await b.query(sql, normalizeParams(params) || []);
    state = 'up'; lastError = null;
    return res.rows;
  } catch (e) {
    state = 'down'; lastError = e.message;
    lastWriteError = e.message;
    return null;                       // never throws at the renderer
  }
}

async function query(name, params) {
  const sql = QUERIES[name];
  if (!sql) return null;
  return run(sql, params);
}

async function write(name, params) {
  const sql = WRITES[name];
  if (!sql) return null;
  const rows = await run(sql, params);
  return rows === null ? null : { ok: true };
}

/* Several writes in one round trip — used by the hydration merge, which
   would otherwise be 294 separate IPC calls. */
async function writeMany(name, rowsOfParams) {
  const sql = WRITES[name];
  if (!sql || !Array.isArray(rowsOfParams)) return null;
  const b = await getBackend();
  if (!b) return null;
  try {
    // The transaction belongs to the adapter: a pg client does BEGIN/COMMIT
    // by hand, PGlite has its own. Both arrive here as the same `each`.
    await b.tx(async (q) => { for (const params of rowsOfParams) await q(sql, normalizeParams(params)); });
    state = 'up'; lastError = null;
    return { ok: true, n: rowsOfParams.length };
  } catch (e) {
    state = 'down'; lastError = e.message;
    lastWriteError = e.message;
    return null;
  }
}

/* WHICH HOME YOU ARE ON IS VISIBLE. Before this, "database" meant "Docker",
   and a visitor had no way to tell a working built-in database from none at
   all. `kind` and `label` are additions — `up` and `error` keep their old
   meaning so nothing that already reads this has to change. */
async function status() {
  const rows = await query('ping');
  const b = backend;
  return {
    up: !!rows,
    error: rows ? null : lastError,
    kind: rows && b ? b.kind : null,          // 'docker' | 'embedded' | null
    label: rows && b ? b.label : null,
    // "Open, but behind on its schema." Reported separately from `up` on
    // purpose: this database answers, so hiding the fault would be exactly
    // the silent wrong thing the schema change was made to prevent.
    schemaError: rows ? schemaError : null,
    // "Open, and reading fine, but something did not save." Survives the
    // ping above, which is the whole point — see lastWriteError.
    writeError: lastWriteError,
  };
}

module.exports = { query, write, writeMany, status, reconnect, QUERIES, WRITES };
