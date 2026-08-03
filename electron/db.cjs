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

   The connection is lazy: nothing is attempted until something actually
   asks a question, so a Pavilion that never touches the database never
   pays for it.
   ================================================================ */
const path = require('path');
const fs = require('fs');

let pool = null;
let state = 'unknown';   // 'unknown' | 'up' | 'down'
let lastError = null;

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

function getPool() {
  if (pool) return pool;
  const env = readEnv();
  const password = process.env.POSTGRES_PASSWORD || env.POSTGRES_PASSWORD;
  if (!password) { state = 'down'; lastError = 'no POSTGRES_PASSWORD'; return null; }
  let Pool;
  try { ({ Pool } = require('pg')); }
  catch (e) { state = 'down'; lastError = 'pg not installed'; return null; }
  pool = new Pool({
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
  return pool;
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
  searchNotes: `SELECT n.id, n.source, n.slug, b.title AS book_title,
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

async function run(sql, params) {
  const p = getPool();
  if (!p) return null;
  try {
    const res = await p.query(sql, params || []);
    state = 'up'; lastError = null;
    return res.rows;
  } catch (e) {
    state = 'down'; lastError = e.message;
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
  const p = getPool();
  if (!p) return null;
  const client = await p.connect().catch(() => null);
  if (!client) { state = 'down'; return null; }
  try {
    await client.query('BEGIN');
    for (const params of rowsOfParams) await client.query(sql, params);
    await client.query('COMMIT');
    state = 'up';
    return { ok: true, n: rowsOfParams.length };
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) { /* already gone */ }
    state = 'down'; lastError = e.message;
    return null;
  } finally { client.release(); }
}

async function status() {
  const rows = await query('ping');
  return { up: !!rows, error: rows ? null : lastError };
}

module.exports = { query, write, writeMany, status, QUERIES, WRITES };
