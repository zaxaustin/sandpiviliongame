/* ================================================================
   [THE DOCKER HOME] — 2026-08-07.

   The other half of test/live/records.cjs. That suite redirects
   userData and points POSTGRES_PORT at nothing, so it is always the
   FRESH EMBEDDED case — the one everybody who is not the steward gets.
   This one is always the CONTAINER case, and neither can stand in for
   the other.

   That is not a theoretical distinction. The two homes have already
   disagreed twice about the same named write:

     - Until 2026-08-04 applySchema() ran on the embedded home only, so
       the container never saw tools/migrations/ at all. Every status
       line read healthy.
     - A JS array for a TEXT[] parameter WROTE here and FAILED there.
       Both halves are now measured; see the comment above pgArray().

   Plain node, not Electron — electron/db.cjs only requires('electron')
   on the embedded path, so requiring it here is safe as long as the
   container answers. If it does not, this SKIPS rather than passing:
   a suite that goes green because the thing it tests is switched off
   is the house failure mode wearing a tick.

     docker compose up -d
     node test/live/docker-home.cjs
   ================================================================ */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');

function readEnv() {
  const out = {};
  for (const f of ['.env.local', '.env']) {
    try {
      for (const line of fs.readFileSync(path.join(ROOT, f), 'utf8').split(/\r?\n/)) {
        const t = line.trim(); if (!t || t.startsWith('#')) continue;
        const i = t.indexOf('=');
        if (i > 0 && !(t.slice(0, i).trim() in out)) out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
      }
    } catch (e) { /* no .env here; try the next */ }
  }
  return out;
}

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };

(async () => {
  const env = readEnv();
  const { Pool } = require('pg');
  // process.env first, exactly as db.cjs resolves it — otherwise this suite
  // would connect somewhere db.cjs is not, and agree with itself about a
  // database neither of them opened.
  const cfg = {
    host: process.env.POSTGRES_HOST || env.POSTGRES_HOST || '127.0.0.1',
    port: Number(process.env.POSTGRES_PORT || env.POSTGRES_PORT || 5432),
    database: process.env.POSTGRES_DB || env.POSTGRES_DB || 'pavilion',
    user: process.env.POSTGRES_USER || env.POSTGRES_USER || 'pavilion',
    password: process.env.POSTGRES_PASSWORD || env.POSTGRES_PASSWORD,
    max: 2, connectionTimeoutMillis: 2000,
  };

  /* Prove it answers BEFORE requiring db.cjs. Otherwise db.cjs would fall
     through to the embedded home, require('electron') outside Electron, and
     this suite would report on a database it was never asked about. */
  let pool;
  try {
    if (!cfg.password) throw new Error('no POSTGRES_PASSWORD in .env.local or .env');
    pool = new Pool(cfg);
    await pool.query('SELECT 1');
  } catch (e) {
    console.log('SKIPPED — the container is not answering (' + e.message + ').');
    console.log('This suite is about the Docker home and cannot pretend otherwise.');
    console.log('  docker compose up -d    then run it again.');
    try { await pool.end(); } catch (_) {}
    process.exit(0);
  }

  const db = require(path.join(ROOT, 'electron', 'db.cjs'));

  console.log('--- 1. which home answers ---');
  const st = await db.status();
  console.log('   ' + JSON.stringify(st));
  ok(st.up, 'database is up');
  ok(st.kind === 'docker', 'kind is docker (got ' + st.kind + ')');
  ok(!st.schemaError, 'no schemaError — applySchema reached the container');

  console.log('\n--- 2. the migrations landed HERE, not only on the embedded home ---');
  const rel = (await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1")).rows.map(r => r.table_name);
  console.log('   ' + rel.join(', '));
  ok(rel.includes('notes'), 'migration 002 table `notes` exists');
  ok(rel.includes('records'), 'migration 003 table `records` exists');
  ok(rel.includes('v_records') && rel.includes('v_record_counts'), 'migration 003 views exist');
  const idx = (await pool.query("SELECT indexname FROM pg_indexes WHERE tablename='notes'")).rows.map(r => r.indexname);
  ok(idx.includes('notes_fts'), 'the full-text index on notes exists (got ' + idx.join(', ') + ')');

  console.log('\n--- 3. a JS array through the seam, which is what broke ---');
  const key = 'probe:docker:arrays';
  const w = await db.write('upsertRecord', [
    'reading', 'Docker array probe', 'written by test/live/docker-home.cjs',
    '2026-08-07', null, 'openReader', null, ['alpha', 'beta gamma', 'quote"inside'], key]);
  ok(w && w.ok, 'write("upsertRecord", [... a real JS array ...]) reported ok');
  const back = (await pool.query('SELECT tags FROM records WHERE source_key=$1', [key])).rows;
  console.log('   read back: ' + JSON.stringify(back));
  ok(back.length === 1, 'the row is actually there — `ok` is not the same as written');
  ok(back.length === 1 && back[0].tags.length === 3, 'all three tags survived');
  ok(back.length === 1 && back[0].tags[1] === 'beta gamma', 'a tag with a space survived');
  ok(back.length === 1 && back[0].tags[2] === 'quote"inside', 'a tag with a quote survived');

  const key2 = 'probe:docker:empty';
  await db.write('upsertRecord', ['reading', 'Empty tags', null, '2026-08-07', null, 'openReader', null, [], key2]);
  const back2 = (await pool.query('SELECT tags FROM records WHERE source_key=$1', [key2])).rows;
  ok(back2.length === 1 && Array.isArray(back2[0].tags) && back2[0].tags.length === 0,
     'an empty array wrote as an empty TEXT[], not NULL — most records carry one');

  console.log('\n--- 4. full-text search actually stems, on this home too ---');
  await db.write('upsertNote', ['mynotes', null, null, null, 'Docker probe note',
    'I walked the long way around the garden', null, null, '2026-08-07', 'probe:docker:note']);
  const hits = await db.query('searchNotes', ['walking', 20]);
  console.log('   searchNotes("walking") -> ' + (hits ? hits.length : 'null') + ' row(s)');
  ok(hits && hits.some(h => h.save_key === 'probe:docker:note'),
     'a note saying "walked" is found by searching "walking"');

  console.log(String.fromCharCode(10) + '--- 5. a note knows WHERE in the book and WHEN ---');
  /* Asked 2026-08-07: page number and date added, for organising later. Both
     are columns already (migration 002) and syncNotes sends both. What this
     checks is that they survive the round trip and come back through
     notesForBook in the BOOK's order rather than the diary's - which is the
     whole reason to store a page rather than only a date. */
  await db.write('upsertCard', ['probe-book', 'A Probe Book', null, null, null, null, 'book', null, null, 40, null]);
  for (const [key, ch, page, title] of [
        ['probe:docker:p2', 2, 11, 'Later, chapter two'],
        ['probe:docker:p1', 1,  2, 'Earlier, chapter one'],
        ['probe:docker:p0', null, null, 'No page at all']]) {
    await db.write('upsertNote', ['mynotes', 'probe-book', ch, page, title,
      'body for ' + title, null, null, '2026-08-07', key]);
  }
  const forBook = await db.query('notesForBook', ['probe-book']);
  console.log('   ' + JSON.stringify((forBook || []).map(r => [r.chapter_idx, r.page, r.title])));
  ok(forBook && forBook.length === 3, 'all three notes came back for the book');
  ok(forBook && forBook[0] && forBook[0].page === 2, 'they arrive in the BOOK order, earliest page first');
  ok(forBook && forBook[1] && forBook[1].page === 11, 'then the later page');
  ok(forBook && forBook[2] && forBook[2].page === null, 'and a note belonging to no page sorts LAST, not at page 1');
  ok(forBook && forBook.every(r => r.created), 'every note carries the date it was added');

  console.log(String.fromCharCode(10) + '--- 6. chapters: what the reader found, kept ---');
  /* `chapters` and `chapter_scans` were in the schema from the start and
     written by NOTHING in the app until 2026-08-07 - only the MinIO loader,
     which needs Docker and a manual run. So on every other install both were
     permanently empty while views and named queries sat on top of them. */
  await db.write('upsertCard', ['probe-ch', 'A Probe Book With Chapters', null, null, null, null, 'book', null, null, 60, null]);
  await db.write('clearDetectedChapters', ['probe-ch']);
  await db.write('addDetectedChapter', ['probe-ch', 1, 0,  'The Opening', 'toc']);
  await db.write('addDetectedChapter', ['probe-ch', 2, 12, 'The Turn',    'toc']);
  await db.write('recordChapterScan',  ['probe-ch', 'toc', 2]);
  const chs = await db.query('chaptersFor', ['probe-ch']);
  ok(chs && chs.length === 2, 'chaptersFor returns what the reader found');
  ok(chs && chs[0] && chs[0].confirmed === false, 'a DETECTION is not confirmed - only a person can do that');
  ok(chs && chs[0] && chs[0].source === 'toc', 'and it records HOW it was found');

  /* A MARK YOU MADE OUTRANKS ONE WE GUESSED, in the database too. Re-opening
     a book runs clearDetectedChapters, which must never touch source='hand'. */
  await db.write('markChapter', ['probe-ch', 3, 30, 'One I named myself']);
  await db.write('clearDetectedChapters', ['probe-ch']);
  const afterClear = await db.query('chaptersFor', ['probe-ch']);
  ok(afterClear && afterClear.length === 1, 'clearing detections left exactly the hand mark');
  ok(afterClear && afterClear[0] && afterClear[0].source === 'hand' && afterClear[0].confirmed === true,
     'and it is still yours, still confirmed');

  /* v_needs_chapters used to gate on text_key - a MinIO key - so it could
     never return a row anywhere but this machine. Migration 004 drives it off
     what was actually SCANNED instead. */
  await db.write('upsertCard', ['probe-none', 'A Book With No Divisions', null, null, null, null, 'book', null, null, 20, null]);
  await db.write('recordChapterScan', ['probe-none', 'none', 0]);
  /* Asked of the VIEW directly, not through needsChapters' LIMIT. On this
     machine 296 books are already scanned, so a 20-page probe never reaches
     the top 50 by page count - the first version of this check failed for
     that reason and would have looked like a broken view. */
  const inView = async (slug) => (await pool.query(
    'SELECT 1 FROM v_needs_chapters WHERE slug = $1', [slug])).rows.length > 0;
  ok(await inView('probe-none'), 'a scanned book with no chapters IS listed as needing them');
  ok(!(await inView('probe-ch')), 'a book with two chapters is NOT listed');
  const needs = await db.query('needsChapters', [50]);
  ok(Array.isArray(needs) && needs.length > 0 && needs[0].how,
     'needsChapters answers, and every row says HOW the scan went');
  const unopened = 'probe-never-opened';
  await db.write('upsertCard', [unopened, 'Never Opened', null, null, null, null, 'book', null, null, 99999, null]);
  ok(!(await inView(unopened)),
     'a book NOBODY HAS OPENED is unknown, not "needs chapters" - the absent-field rule, on a whole row');

  const cov = await db.query('chapterCoverage', []);
  console.log('   coverage: ' + JSON.stringify(cov && cov[0]));
  ok(cov && cov[0] && Number(cov[0].books_scanned) >= 2, 'coverage can say how much of the shelf was looked at');
  ok(cov && cov[0] && Number(cov[0].marks_by_hand) >= 1, 'and how many marks are the visitor\u2019s own');

  const st2 = await db.status();
  ok(!st2.writeError, 'no writeError after all of that (got ' + st2.writeError + ')');

  await pool.query('DELETE FROM records WHERE source_key LIKE $1', ['probe:docker:%']);
  await pool.query('DELETE FROM notes   WHERE save_key   LIKE $1', ['probe:docker:%']);
  await pool.query("DELETE FROM books WHERE slug LIKE 'probe-%'");
  await pool.end();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASHED: ' + e.stack); process.exit(2); });
