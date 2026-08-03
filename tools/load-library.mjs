/* ================================================================
   [LOAD THE LIBRARY INTO POSTGRES]

   Walks every text in MinIO, works out its structure with the app's OWN
   chapter finder, and writes the result to the database as SQL.

   WHY IT EMITS SQL INSTEAD OF CONNECTING. No `pg` dependency, nothing to
   install, and the output is readable before it is run — which matters for
   a script that writes to a database. Pipe it through the container's own
   psql:

       node tools/load-library.mjs > /tmp/load.sql
       docker exec -i sand-pavilion-postgres \
         psql -U pavilion -d pavilion -v ON_ERROR_STOP=1 -f - < /tmp/load.sql

   WHAT IT WILL NOT DO: overwrite a chapter you marked by hand. Detected
   chapters are written with source 'toc'/'headings'/'numerals'; anything
   with source='hand' or confirmed=true is left exactly as it is. Re-running
   this is safe, and that property is the whole reason chapters live in a
   table rather than being recomputed on every open.
   ================================================================ */
import { paginate } from '../src/game/data/retrieval.js';
import { findChapters } from '../src/game/data/chapters.js';

const ENDPOINT = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
const BUCKET = process.env.MINIO_BUCKET || 'sand-pavilion-library';

const q = (s) => s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`;
const say = (s) => process.stdout.write(s + '\n');
const note = (s) => process.stderr.write(s + '\n');

async function listAll() {
  const out = []; let token = null;
  for (;;) {
    let url = `${ENDPOINT}/${BUCKET}?list-type=2&max-keys=1000`;
    if (token) url += '&continuation-token=' + encodeURIComponent(token);
    const xml = await (await fetch(url)).text();
    for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) out.push(m[1]);
    if (!/<IsTruncated>true<\/IsTruncated>/.test(xml)) break;
    token = (xml.match(/<NextContinuationToken>([^<]+)</) || [])[1];
    if (!token) break;
  }
  return out.filter(k => k.endsWith('.txt'));
}

const slugOf = (key) => key.replace(/\.txt$/, '').replace(/^personal\//, '').replace(/^personal-/, '');
const titleOf = (key) => slugOf(key).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

/* READ THE TITLE AND AUTHOR OUT OF THE TEXT ITSELF.

   Added 2026-08-03 after the resident bench caught the failure this fixes.
   Asked "do you have anything by Epictetus?", Quill answered — confidently,
   because the database lookup had made him confident — "no Enchiridion, no
   discourses, nothing like it." Both are on the shelf. The rows had been
   built from MinIO OBJECT NAMES, so every one of 294 books had a guessed
   title and NO AUTHOR AT ALL, and a search for "epictetus" could not
   possibly hit.

   A confident wrong answer is worse than the hedging it replaced. The cure
   is not a softer prompt: it is the data being right.

   Gutenberg texts state both in their header. Deterministic, no model —
   the standing rule, and this is exactly the kind of job it is for. */
const AUTHOR_LINE = /^\s*Author:\s*(.+?)\s*$/im;
const TITLE_LINE = /^\s*Title:\s*(.+?)\s*$/im;
function headerOf(text) {
  const head = String(text).slice(0, 3000);
  const a = AUTHOR_LINE.exec(head), t = TITLE_LINE.exec(head);
  const clean = (s) => s ? s.replace(/\s+/g, ' ').slice(0, 120).trim() : '';
  return { author: clean(a && a[1]), title: clean(t && t[1]) };
}

/* Same rule as tools/library-audit.py: judged on the BODY with the Gutenberg
   wrapper stripped, so a short work is a short work and not a broken file. */
const GUT_START = /\*\*\*\s*START OF (THIS|THE) PROJECT GUTENBERG/i;
const GUT_END = /\*\*\*\s*END OF (THIS|THE) PROJECT GUTENBERG/i;
const DEAD_BODY = 900;

function health(text) {
  const problems = [];
  let body = text;
  const ms = text.match(GUT_START), me = text.match(GUT_END);
  if (ms && me && me.index > ms.index) body = text.slice(ms.index + ms[0].length, me.index);
  body = body.trim();
  if (/<html|<!doctype/i.test(text.slice(0, 2000))) problems.push('HTML, not text');
  if (body.length < DEAD_BODY) problems.push(`no work here (${body.length} chars of body)`);
  return { status: problems.length ? 'dead' : 'ok', problems, bodyChars: body.length };
}

const keys = await listAll();
note(`${keys.length} texts in ${BUCKET}`);

say('BEGIN;');
let i = 0;
for (const key of keys) {
  i++;
  if (i % 50 === 0) note(`  ...${i}/${keys.length}`);
  let text;
  try { text = await (await fetch(`${ENDPOINT}/${BUCKET}/${encodeURIComponent(key).replace(/%2F/g, '/')}`)).text(); }
  catch { note(`  unreadable: ${key}`); continue; }

  const slug = slugOf(key);
  const pages = paginate(text);
  const { marks, how } = findChapters(pages);
  const h = health(text);

  /* The book's own header beats a filename every time. COALESCE on the way
     in so a real card already in the table is never overwritten by a guess. */
  const hdr = headerOf(text);
  const title = hdr.title || titleOf(key);
  say(`INSERT INTO books (slug, title, attribution, text_key, pages) VALUES (${q(slug)}, ${q(title)}, ${q(hdr.author || null)}, ${q(key)}, ${pages.length})`);
  say(`  ON CONFLICT (slug) DO UPDATE SET`);
  say(`    title = COALESCE(NULLIF(EXCLUDED.title,''), books.title),`);
  say(`    attribution = COALESCE(books.attribution, NULLIF(EXCLUDED.attribution,'')),`);
  say(`    text_key = EXCLUDED.text_key, pages = EXCLUDED.pages;`);

  say(`INSERT INTO book_health (slug, status, problems, body_chars) VALUES (${q(slug)}, ${q(h.status)}, ARRAY[${h.problems.map(q).join(',')}]::TEXT[], ${h.bodyChars})`);
  say(`  ON CONFLICT (slug) DO UPDATE SET status = EXCLUDED.status, problems = EXCLUDED.problems, body_chars = EXCLUDED.body_chars, checked_at = now();`);

  say(`INSERT INTO chapter_scans (slug, how, found) VALUES (${q(slug)}, ${q(how)}, ${marks.length})`);
  say(`  ON CONFLICT (slug) DO UPDATE SET how = EXCLUDED.how, found = EXCLUDED.found, scanned_at = now();`);

  /* Replace only what the DETECTOR wrote. A hand-marked or confirmed chapter
     is the steward's, and re-running a scan must never quietly discard it. */
  say(`DELETE FROM chapters WHERE slug = ${q(slug)} AND source <> 'hand' AND confirmed = FALSE;`);
  marks.forEach((m, idx) => {
    say(`INSERT INTO chapters (slug, idx, page, label, source) VALUES (${q(slug)}, ${idx + 1}, ${m.page}, ${q(m.label)}, ${q(how)}) ON CONFLICT (slug, idx) DO NOTHING;`);
  });
}
say('COMMIT;');
note('done');
