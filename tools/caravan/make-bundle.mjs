/* ================================================================
   [MAKE A BUNDLE] — package books with their provenance into one
   file a person can hand to another person.

   Built 2026-08-02 for a concrete want: a WELCOME PACKET. The app
   ships ten public-domain classics as summaries only — Meditations,
   The Republic, the Tao Te Ching and so on — each saying outright
   "this is a summary, here is where the real text lives, drag it in."
   The real texts have been sitting in library-sources/ and the local
   MinIO pool the whole time. This turns them into one file that makes
   those ten books real in somebody else's Pavilion.

   See plans/BOOK-BUNDLES-AND-THE-POOL.md. The format is deliberately
   the same shape as a bequest's books[] — plus the bytes, plus a
   sha256 per book so a bundle is checkable rather than merely
   received.

   PROVENANCE IS ENFORCED HERE, not trusted:
     - `--share` (the default) refuses anything that is not both
       freely licensed AND freely gathered, and prints what it left
       out and why. Both axes must agree — copyright.js and
       sourcing.js, the same gate mayEnterCommons() uses in-game.
     - `--private` skips the gate. A personal archive is your own
       business; the flag is written into the file so it can never be
       mistaken for something to hand out.

   Usage:
     node tools/caravan/make-bundle.mjs --welcome
     node tools/caravan/make-bundle.mjs --slugs walden,republic --title "Two long books"
     node tools/caravan/make-bundle.mjs --all --private --out my-archive.json

   Texts are read from library-sources/ (plain files on disk). The
   MinIO pool holds the same set; reading from disk keeps this script
   runnable with Docker stopped.
   ================================================================ */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { SEED_LIBRARY } from '../../src/game/data/seed.js';
import { assess } from '../../src/game/data/sourcing.js';

const SOURCES = 'library-sources';

/* Transliteration and titling differ enough that no amount of fuzzy matching
   gets these right, and a fuzzier matcher would start pairing the wrong books.
   An explicit list is the honest tool: short, readable, and wrong loudly rather
   than quietly. slug -> the filename stem actually on disk or in the pool. */
const ALIASES = {
  'tao-te-ching': 'the-tao-teh-king-or-the-tao-and-its-characteristics',
};

/* WHY THERE IS NO "read it straight out of the pool" PATH HERE.

   It was written, and then deleted the same hour, because it worked and the
   output was wrong. MinIO stores an object as <key>/<uuid>/part.1, and reaching
   in with `docker exec cat` returns the file with MinIO's own inline metadata
   header still attached — thirty-odd bytes of binary in front of "Title:
   Meditations". The container is also minimal enough to have no `find` and no
   `grep`, which was the first hint.

   That is not a bug to parse around. The on-disk layout of a storage engine is
   not an interface, and a tool that depends on it breaks silently on the next
   MinIO version — silently being the operative word, because it would produce a
   bundle that LOOKS fine with a few corrupt bytes at the head of a book.

   The supported input is library-sources/, which is where texts are staged
   anyway and where 40 of the 41 already live. If a text exists only in the pool,
   pull it out through the S3 API the way push-fulltext.py puts it in — that is
   the symmetrical tool this project should have next, and it is a small one.
   Until then this script says plainly which book it could not find and where it
   looked, which is a better failure than a quietly damaged bundle. */

const args = process.argv.slice(2);
const flag = n => args.includes('--' + n);
const val = (n, d = null) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

if (flag('help') || !args.length) {
  console.log(readFileSync(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), 'utf8')
    .split('*/')[0].replace(/^\/\* =+\n/, '').replace(/^ {3}/gm, ''));
  process.exit(0);
}

const isPrivate = flag('private');

/* --- which books --- */
let picked;
if (flag('welcome')) {
  // The packet that has an obvious reason to exist: every public-domain classic
  // the app ships as a summary, made whole.
  picked = SEED_LIBRARY.filter(d =>
    !(d.doc && d.doc.fullText && d.doc.fullText.text) &&
    /public domain|^cc0|creative commons/i.test(d.license || ''));
} else if (val('slugs')) {
  const want = val('slugs').split(',').map(s => s.trim()).filter(Boolean);
  picked = want.map(s => SEED_LIBRARY.find(d => d.slug === s) || { slug: s, __missing: true });
} else if (flag('all')) {
  picked = SEED_LIBRARY.slice();
} else {
  console.error('Pick something: --welcome, --slugs a,b,c, or --all. (--help for more.)');
  process.exit(1);
}

/* --- find each book's text on disk --- */
const available = existsSync(SOURCES) ? readdirSync(SOURCES).filter(f => f.endsWith('.txt')) : [];
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
function findText(slug) {
  if (ALIASES[slug]) {
    const aliased = path.join(SOURCES, ALIASES[slug] + '.txt');
    if (existsSync(aliased)) return aliased;
  }
  const exact = path.join(SOURCES, slug + '.txt');
  if (existsSync(exact)) return exact;
  const n = norm(slug);
  /* Filenames drift a long way from slugs, because a downloaded file keeps the
     publisher's full title: "on-the-origin-of-species-by-means-of-natural-
     selection.txt" for the slug "origin-of-species". So the slug has to be
     found ANYWHERE in the filename, not just at an edge — an endsWith-only
     match missed two of the four welcome-packet books on the first run.
     Guarded by a length floor, or a short slug like "metta" would happily
     match half the shelf, and by preferring the shortest filename that
     contains it, which is the least-padded and so the most likely match. */
  const hits = available.filter(f => {
    const fn = norm(f.replace(/\.txt$/, ''));
    if (fn === n) return true;
    if (n.length < 8) return false;
    return fn.includes(n) || n.includes(fn);
  }).sort((a, b) => a.length - b.length);
  return hits.length ? path.join(SOURCES, hits[0]) : null;
}

const books = [], skipped = [];
for (const d of picked) {
  if (d.__missing) { skipped.push([d.slug, 'no such book in the catalogue']); continue; }

  // Both provenance axes, computed rather than asserted.
  const sharing = /public domain/i.test(d.license || '') ? 'pd'
    : /cc0|creative commons|design science|mit|apache|gnu/i.test(d.license || '') ? 'open'
    : d.license ? 'copyright' : 'unknown';
  const gathered = assess({ source: d.source_url || d.attribution || '' }).id;

  if (!isPrivate) {
    if (sharing !== 'pd' && sharing !== 'open') { skipped.push([d.slug, `licence not established as shareable (${d.license || 'none stated'})`]); continue; }
    if (gathered !== 'given') { skipped.push([d.slug, `where it came from is not established as freely given (${d.source_url || 'no source recorded'})`]); continue; }
  }

  const inline = d.doc && d.doc.fullText && d.doc.fullText.text;
  const file = inline ? null : findText(d.slug);
  // disk first (works with Docker stopped), then the pool
  let text = inline || (file ? readFileSync(file, 'utf8') : null);
  let where = inline ? 'inline' : file ? 'disk' : null;
  if (!text) { skipped.push([d.slug, `no text staged — put it in ${SOURCES}/ (as ${d.slug}.txt, or add an alias in this script)`]); continue; }

  books.push({
    slug: d.slug,
    title: d.title,
    attribution: d.attribution || '',
    license: d.license || '',
    source_url: d.source_url || '',
    tradition: d.tradition || 'Classics',
    summary: (d.doc && d.doc.summary) || '',
    sharing, gathered,
    sha256: createHash('sha256').update(text).digest('hex'),
    bytes: Buffer.byteLength(text, 'utf8'),
    text, __where: where,
  });
}

const bundle = {
  sandPavilionBundle: 1,
  id: val('id', flag('welcome') ? 'welcome-packet' : 'bundle-' + Date.now()),
  title: val('title', flag('welcome') ? 'The Welcome Packet — the classics, whole' : 'A bundle of books'),
  by: val('by', 'The Pavilion'),
  made: new Date().toISOString().slice(0, 10),
  private: isPrivate,
  message: val('message', flag('welcome')
    ? 'The full text of every classic the Pavilion ships as a summary. Drag this onto the window and those books stop being summaries — the page becomes the book. All public domain; nothing here is anyone\'s to withhold.'
    : ''),
  books,
};

const out = val('out', bundle.id + '.json');
writeFileSync(out, JSON.stringify(bundle, null, 2), 'utf8');

const mb = (Buffer.byteLength(JSON.stringify(bundle), 'utf8') / 1048576).toFixed(1);
console.log(`\n${isPrivate ? '📦 private archive' : '🤝 shareable bundle'}: ${out}`);
console.log(`   ${books.length} book${books.length === 1 ? '' : 's'}, ${mb} MB`);
for (const b of books) console.log(`     ✓ ${b.title}  (${(b.bytes / 1024).toFixed(0)} KB, from ${b.__where})`);
books.forEach(b => delete b.__where);
if (skipped.length) {
  console.log(`\n   left out (${skipped.length}) — named rather than silently dropped:`);
  for (const [slug, why] of skipped) console.log(`     – ${slug}: ${why}`);
}
console.log('');
