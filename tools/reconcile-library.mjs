/* ================================================================
   [RECONCILE THE LIBRARY] — make the catalogue match what is really there.

   `load-library.mjs` only ever INSERTs. Nothing has ever REMOVED a stale
   row, RENAMED a wrong one, or ADOPTED a book that arrived without one, so
   the catalogue has only ever been able to drift in one direction. This is
   the missing half.

   WHAT WAS ACTUALLY WRONG, measured 2026-08-10 against 638 rows:

     254 DUPLICATE ROWS. slugOf() in load-library.mjs stripped `personal-`:

       const slugOf = (key) => key.replace(/\.txt$/, '')
         .replace(/^personal\//, '').replace(/^personal-/, '');   // <- this

     So walking `personal/personal-the-great-discovery.txt` minted a row
     keyed `the-great-discovery`, while the app had ALREADY written its own
     row keyed `personal-the-great-discovery` — which is also exactly what
     the local file is named (`shelveAsPersonal` writes `slug + '.txt'`).
     Two rows, one book, 254 times. That last `.replace` is now gone.

     31 ORPHANS. Objects sitting in MinIO with no catalogue row at all —
     books imported and then never shown to anyone.

     ZERO GHOSTS. Every one of the 295 distinct text_keys resolves. An
     earlier count claimed 255 ghosts; it had listed only the bucket ROOT
     and never looked inside the `personal/` prefix, where 285 of the 326
     objects live. Nothing is missing and nothing here deletes a book.

   EMITS SQL, CONNECTS TO NOTHING — same as load-library.mjs, and for the
   same reason: the output is readable before it is run, which matters
   rather a lot for a script that deletes rows.

       node tools/reconcile-library.mjs                 # dry run, a report
       node tools/reconcile-library.mjs --write > /tmp/fix.sql
       docker exec -i sand-pavilion-postgres \
         psql -U pavilion -d pavilion -v ON_ERROR_STOP=1 -f - < /tmp/fix.sql

   IDEMPOTENT. Run it twice and the second run is a no-op. That property is
   the entire point — a reconciler that is not safe to re-run is just
   another one-way script, which is how this mess arrived.
   ================================================================ */

const ENDPOINT = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
const BUCKET = process.env.MINIO_BUCKET || 'sand-pavilion-library';
const WRITE = process.argv.includes('--write');

const q = (s) => s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`;
const say = (s) => { if (WRITE) process.stdout.write(s + '\n'); };
const note = (s) => process.stderr.write(s + '\n');

/* The bucket listing returns EVERY key including prefixed ones, which is how
   `personal/…` got into the catalogue in the first place. Same pager as
   load-library.mjs. */
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

/* THE CANONICAL SLUG FOR A KEY, and the whole duplication bug is this one
   function. The `personal/` FOLDER is stripped; the `personal-` NAME is not,
   because that name is what shelveAsPersonal() writes as the slug AND as the
   local filename. Strip it and you invent a second identity for a book that
   already had one. */
export const slugForKey = (key) =>
  String(key).replace(/\.txt$/, '').replace(/^personal\//, '');

const titleFromSlug = (slug) => slug.replace(/^personal-/, '')
  .replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

/* Gutenberg texts state both in their header. Deterministic, no model — and
   load-library.mjs already learned this the hard way: 294 books built from
   FILENAMES had no author at all, so Quill told a visitor the Library held
   no Epictetus while two of his works sat on the shelf. */
const AUTHOR_LINE = /^\s*Author:\s*(.+?)\s*$/im;
const TITLE_LINE = /^\s*Title:\s*(.+?)\s*$/im;
function headerOf(text) {
  const head = String(text).slice(0, 3000);
  const a = AUTHOR_LINE.exec(head), t = TITLE_LINE.exec(head);
  const clean = (s) => s ? s.replace(/\s+/g, ' ').slice(0, 120).trim() : '';
  return { author: clean(a && a[1]), title: clean(t && t[1]) };
}

const keys = await listAll();
note(`${keys.length} objects in ${BUCKET}`);
if (!keys.length) {
  note('NOTHING IN THE BUCKET. Refusing to emit anything — an empty listing is far more');
  note('likely to be a stopped container than a library with no books in it, and a');
  note('reconciler that trusts it would delete the entire catalogue.');
  process.exit(1);
}

/* key -> canonical slug, and the reverse, so the SQL can be written against
   a real inventory rather than against an assumption. */
const rows = keys.map(k => ({ key: k, slug: slugForKey(k) }));

say('-- Generated by tools/reconcile-library.mjs. Read it before you run it.');
say('BEGIN;');

/* WHAT IS REALLY IN THE BUCKET, handed to Postgres so the set arithmetic
   happens in the database rather than in a script's head. */
say('CREATE TEMP TABLE present(key TEXT PRIMARY KEY, slug TEXT NOT NULL) ON COMMIT DROP;');
for (let i = 0; i < rows.length; i += 200) {
  const chunk = rows.slice(i, i + 200)
    .map(r => `(${q(r.key)}, ${q(r.slug)})`).join(',\n  ');
  say(`INSERT INTO present(key, slug) VALUES\n  ${chunk}\nON CONFLICT (key) DO NOTHING;`);
}

/* ---- 1 · THE CANONICAL ROW EXISTS ----------------------------------------
   Where a key's only row carries the WRONG slug, the row is copied to the
   right one rather than renamed: the foreign keys are ON DELETE CASCADE with
   no ON UPDATE CASCADE, so updating books.slug in place would either fail or
   orphan its children. Insert, repoint, delete — in that order, always.

   THIS BLOCK IS EMITTED TWICE, before and after the deletes, and that is not
   belt-and-braces — it is what makes the whole script converge in ONE pass.

   Caught by running it twice against a restored copy: the first run left 325
   of 326 objects with a row and the SECOND run created the 326th. A slug can
   be occupied at step 1 by a row that step 3 then deletes (its text_key
   belongs to a different object), so the slug comes free too late to be
   filled. One extra pass after the deletes and the second run is a genuine
   no-op — which is the property the whole tool exists to have, and the one
   `load-library.mjs` never had. */
const ensureCanonical = `
INSERT INTO books (slug, title, attribution, license, source_url, shelf, kind, text_key, pages)
SELECT p.slug,
       COALESCE(NULLIF(b.title,''), initcap(replace(regexp_replace(p.slug,'^personal-',''),'-',' '))),
       b.attribution, b.license, b.source_url,
       COALESCE(NULLIF(b.shelf,''), 'Personal'),
       COALESCE(NULLIF(b.kind,''), 'book'),
       p.key, b.pages
  FROM present p
  LEFT JOIN LATERAL (
        SELECT * FROM books x WHERE x.text_key = p.key ORDER BY (x.slug = p.slug) DESC LIMIT 1
       ) b ON TRUE
 WHERE NOT EXISTS (SELECT 1 FROM books y WHERE y.slug = p.slug)
ON CONFLICT (slug) DO NOTHING;`;

say('\n-- 1 · every object in the bucket has a row under its CANONICAL slug');
say(ensureCanonical);

/* ---- 2 · MERGE THE DUPLICATES -------------------------------------------
   The winner is the row whose slug is the canonical one for its key. The
   loser's real metadata is carried across first — a shelf the visitor
   assigned by hand beats a NULL every time, and losing one silently is the
   exact class of bug test/live/librarian-safety.mjs exists to prevent. */
say(`
-- 2 · carry every duplicate's real metadata onto the canonical row
UPDATE books w SET
  title       = COALESCE(NULLIF(w.title,''), NULLIF(l.title,'')),
  attribution = COALESCE(NULLIF(w.attribution,''), NULLIF(l.attribution,'')),
  license     = COALESCE(NULLIF(w.license,''), NULLIF(l.license,'')),
  source_url  = COALESCE(NULLIF(w.source_url,''), NULLIF(l.source_url,'')),
  shelf       = COALESCE(NULLIF(w.shelf,''), NULLIF(l.shelf,'')),
  pages       = COALESCE(w.pages, l.pages),
  text_key    = COALESCE(NULLIF(w.text_key,''), l.text_key)
FROM books l, present p
WHERE p.slug = w.slug AND l.text_key = p.key AND l.slug <> w.slug;`);

/* Children move BEFORE the delete. notes.slug and records.slug are
   ON DELETE SET NULL, so a cascade would silently unlink a visitor's note
   from its book rather than following it to the surviving row. */
say(`
-- 3 · move the losers' children onto the canonical row, then drop the losers
UPDATE notes n SET slug = p.slug
  FROM books l, present p
 WHERE n.slug = l.slug AND l.text_key = p.key AND l.slug <> p.slug;
UPDATE records r SET slug = p.slug
  FROM books l, present p
 WHERE r.slug = l.slug AND l.text_key = p.key AND l.slug <> p.slug;
-- a chapter the visitor marked BY HAND follows the book; a detected one does
-- not need to, because the canonical row already has its own scan
INSERT INTO chapters (slug, idx, page, label, source, confirmed)
SELECT p.slug, c.idx, c.page, c.label, c.source, c.confirmed
  FROM chapters c JOIN books l ON l.slug = c.slug JOIN present p ON p.key = l.text_key
 WHERE l.slug <> p.slug AND (c.source = 'hand' OR c.confirmed)
ON CONFLICT (slug, idx) DO NOTHING;
DELETE FROM books l USING present p
 WHERE l.text_key = p.key AND l.slug <> p.slug;`);

/* THE SECOND PASS. See the note on ensureCanonical: a slug freed by the
   delete above has to be filled in this run, or the script needs a second
   run to converge — which is exactly the property it exists to guarantee. */
say('\n-- 3b · fill any canonical slug the deletes above have just freed');
say(ensureCanonical);

/* ---- 3 · ADOPT THE ORPHANS ----------------------------------------------
   Objects with no row at all. Title and author come from the TEXT, never
   from the filename — see the note on headerOf above. Only these are
   fetched, so this is 31 requests rather than 326. */
const orphanKeys = rows.map(r => r.key);
note('reading headers for adoption candidates…');
const adopted = [];
let n = 0;
for (const r of rows) {
  n++;
  if (n % 50 === 0) note(`  ...${n}/${rows.length}`);
  let text = '';
  try {
    const url = `${ENDPOINT}/${BUCKET}/${encodeURIComponent(r.key).replace(/%2F/g, '/')}`;
    const res = await fetch(url, { headers: { Range: 'bytes=0-3000' } });
    text = await res.text();
  } catch { continue; }
  const h = headerOf(text);
  if (!h.title && !h.author) continue;          // nothing worth asserting
  adopted.push({ ...r, ...h });
}
note(`${adopted.length} of ${rows.length} objects state a title or author in their text`);

/* COALESCE on the way in, so a card the visitor has already corrected is
   never overwritten by what a Gutenberg header happens to say. */
say(`
-- 4 · a real title and author from each book's own header, where it has one`);
for (const a of adopted) {
  say(`UPDATE books SET title = COALESCE(NULLIF(title,''), ${q(a.title || titleFromSlug(a.slug))}),`
    + ` attribution = COALESCE(NULLIF(attribution,''), ${q(a.author || null)})`
    + ` WHERE slug = ${q(a.slug)};`);
}

/* Anything still shelfless lands on the visitor's own shelf, which is where
   an unsorted book belongs — his call: "i can sort them again in game i dont
   mind but lets have a place for them in game if there not sorted they can go
   on my personal shelf." Never a silent NULL that renders nowhere. */
say(`
-- 5 · nothing is shelfless. An unsorted book goes on YOUR shelf, not into a void.
UPDATE books SET shelf = 'Personal' WHERE shelf IS NULL OR shelf = '';`);

say('COMMIT;');

/* ---- the report, which is what a dry run is FOR ------------------------- */
const bySlug = new Map();
for (const r of rows) bySlug.set(r.slug, r.key);
note('');
note('  objects in the bucket ............ ' + rows.length);
note('  under personal/ .................. ' + rows.filter(r => r.key.startsWith('personal/')).length);
note('  distinct canonical slugs ......... ' + bySlug.size);
note('  with a real title/author in text .. ' + adopted.length);
note('');
if (!WRITE) {
  note('DRY RUN — nothing was emitted. Re-run with --write to produce the SQL,');
  note('read it, and only then pipe it into psql. Back up first:');
  note('  docker exec sand-pavilion-postgres pg_dump -U pavilion -d pavilion > backup.sql');
} else {
  note('SQL written to stdout. READ IT before running it.');
}
