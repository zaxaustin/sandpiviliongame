/* ================================================================
   [MARKS] — how a book is divided, and who divided it.

   Built 2026-08-04 for the Study Table. The steward's own answer to
   "what is a story?", and it is better than the one detection gives:

     "the first part of this would be to make notes of the book and
      lable where the chapters and the stories are, espically for the
      spirtual books its already nice to have our own commentary. if
      anything we can do it page by page, if using a text book this
      will be ideal."

   Two things follow from that, and they are the whole file.

   ONE — A MARK YOU MADE OUTRANKS ONE WE GUESSED. Not a preference:
   `tools/schema.sql` has said so since the day the chapters table went
   in — *'hand' is the steward and outranks everything, because a person
   who has the book open is better evidence than any heuristic.* The
   column has existed all along and nothing ever wrote to it.

   TWO — THE PAGE ALWAYS WORKS. `findChapters()` is silent on 88 of the
   library's books, so a workroom built on detected chapters would refuse
   to open for a third of the shelf. With no marks at all this returns
   page-sized units, which is exactly right for a textbook and means the
   Study Table opens for every book there is.

   Pure: no DOM, no imports, no reaching for `data`. So `npm test` can
   hold it to all of the above rather than trusting it.
   ================================================================ */

/* A page index that is real for this book, or null. Guards every entry
   point, because marks are saved data and saved data outlives the code
   that wrote it — a mark left behind by a book that was re-imported
   shorter must not put the reader past the end. */
function realPage(page, pageCount) {
  const n = Math.floor(Number(page));
  if (!Number.isFinite(n) || n < 0) return null;
  if (Number.isFinite(pageCount) && pageCount > 0 && n > pageCount - 1) return null;
  return n;
}

const cleanLabel = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

/* ---- 1 · the two sources of division, merged --------------------------

   `detected`  findChapters(pages).marks — [{page, label, …}]
   `hand`      data.bookMarks[slug]      — [{page, label, ts}]

   Same page, both sources: HAND WINS, whole. Not a merge of the two
   labels — if someone opened the book and typed a name for this page,
   that is the name, and quietly appending a guessed one beside it would
   be the confident-wrong-answer this project keeps refusing.

   A hand mark on a page nothing detected is simply inserted. Nothing is
   deduplicated by proximity: two marks a page apart are two divisions,
   because a person may well mean that, and collapsing them would throw
   away the more deliberate of the two.                                   */
export function mergeMarks(detected, hand, pageCount) {
  const byPage = new Map();
  for (const m of (detected || [])) {
    const page = realPage(m && m.page, pageCount);
    if (page == null) continue;
    byPage.set(page, { page, label: cleanLabel(m.label) || 'Untitled', source: 'detected' });
  }
  for (const m of (hand || [])) {
    const page = realPage(m && m.page, pageCount);
    if (page == null) continue;
    /* An empty hand label on a page that WAS detected keeps the detected
       words — the person marked the place, not the name, and throwing the
       only label away would leave them worse off than before they touched
       it. On a page nothing detected there is nothing to fall back to. */
    const existing = byPage.get(page);
    const label = cleanLabel(m.label) || (existing ? existing.label : '') || 'Untitled';
    byPage.set(page, { page, label, source: 'hand', ts: m.ts || '' });
  }
  return [...byPage.values()].sort((a, b) => a.page - b.page);
}

/* ---- 2 · the divisions as things you can move between -----------------

   Returns units covering EVERY page, always, so no page in the book is
   outside the workroom. Three shapes, in order of how much the book has
   told us:

     marks present     one unit per mark, running to the next
     no marks          one unit per page — the textbook case
     no pages          nothing, honestly                                  */
export function unitsFor(pageCount, marks) {
  const pages = Math.floor(Number(pageCount));
  if (!Number.isFinite(pages) || pages < 1) return [];

  const list = (marks || [])
    .map(m => ({ ...m, page: realPage(m.page, pages) }))
    .filter(m => m.page != null)
    .sort((a, b) => a.page - b.page);

  if (!list.length) {
    return Array.from({ length: pages }, (_, i) => ({
      idx: i + 1, label: 'Page ' + (i + 1), from: i, to: i, source: 'page',
    }));
  }

  const units = [];
  /* A book rarely starts its first chapter on page one — there is a title,
     a preface, a translator's note. Those pages are part of the book, so
     they get a unit of their own rather than belonging to nothing. Named
     plainly, and marked `implicit` so nothing mistakes it for a division
     anyone actually claimed. */
  if (list[0].page > 0) {
    units.push({ idx: 1, label: 'The opening', from: 0, to: list[0].page - 1, source: 'implicit' });
  }
  list.forEach((m, i) => {
    const next = list[i + 1];
    units.push({
      idx: units.length + 1,
      label: cleanLabel(m.label) || 'Untitled',
      from: m.page,
      to: next ? next.page - 1 : pages - 1,
      source: m.source === 'hand' ? 'hand' : 'detected',
    });
  });
  return units;
}

/* ---- 3 · which one you are in ---------------------------------------- */
export function unitAt(units, page) {
  const n = Math.floor(Number(page));
  if (!Number.isFinite(n)) return null;
  return (units || []).find(u => n >= u.from && n <= u.to) || null;
}

/* How a unit says where it is, in the vocabulary the reader and the notes
   already use. A page-sized unit does not repeat itself ("Page 4 · p. 4"). */
export function unitLabel(unit) {
  if (!unit) return '';
  if (unit.source === 'page') return unit.label;
  const span = unit.from === unit.to ? `p. ${unit.from + 1}` : `pp. ${unit.from + 1}–${unit.to + 1}`;
  return `${unit.label} · ${span}`;
}
