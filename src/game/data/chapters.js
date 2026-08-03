/* ================================================================
   [CHAPTERS] — finding where the chapters actually are.

   BETA-TESTING-FEEDBACK.md #41, and rebuilt 2026-08-03 after the first
   version was measured against the steward's REAL library instead of
   the six texts in the seed. The seed said it worked. 296 books said
   otherwise:

     books over 40 pages          282
       0 chapters found           135   (109 of them HAVE a contents block)
       1-4 found                   41   <- "it still gives me the first
       5+ found                   106       four chapters"

   62% wrong. The cause was a single wrong assumption: that a heading
   says the word "chapter". Walden's chapters are "Economy", "Sounds",
   "Solitude". Emerson's are "SELF-RELIANCE". Epictetus' Discourses is
   Book I-IV, each holding ~24 chapters marked only with a roman
   numeral on its own line — which is exactly the book that shows four
   marks and stops.

   THE STEWARD SAID IT FIRST AND HE WAS RIGHT: read the index first.
   The earlier version had it backwards (body first, contents only for
   names) because that happened to be true of the two seed books. For a
   real library the contents block is the ONLY reliable source for the
   109 books whose headings carry no keyword at all.

   FOUR ROUTES, in order, and `how` says which one answered:

     'toc'       the book's own contents block, each entry located in
                 the body as a whole LINE, searching forward only
     'headings'  keyword headings (chapter/book/lecture/canto/...)
     'numerals'  a bare numeral alone on a line, taking the next short
                 line as its title
     'none'      say so. Do not guess.

   WHY 'none' IS A REAL ANSWER AND NOT A FAILURE. Inferring chapters
   from "short standalone lines" was tried and measured on Walden: it
   returns "Boards", "$8.03", "[Illustration: Fig. 1.]", "FOOTNOTES" —
   because Walden prints a cost table the same way it prints a heading.
   A wrong chapter list is worse than no chapter list: it is silently
   wrong on a note that cites it. Books like that get honest silence
   and a way to mark chapters by hand.

   Pure logic, no DOM, no imports.
   ================================================================ */

/* A keyword heading must carry a NUMBER — without that, "Part of the
   reason we do this" is a chapter break. The list is wider than it was:
   `lecture` alone was costing us The Chemical History of a Candle, a
   six-lecture book that found zero. */
const KEYWORDS = 'chapter|book|part|canto|letter|section|act|scene|lecture'
  + '|discourse|essay|fable|hymn|psalm|ode|dialogue|sermon|tale|story|volume';

const HEADING = new RegExp(
  '^(' + KEYWORDS + ')\\s*[.:#—–-]*\\s*([ivxlcdm]+|\\d+)\\b[\\s.:—–)\\]-]*(.*)$', 'i');

/* A contents ENTRY: a line opening with its own numbering, in either the
   keyword form or the bare form the Gita uses (`I. THE DISTRESS OF ARJUNA`).
   Many books number nothing at all in the contents (Walden would, if it had
   one), so an unnumbered short line is accepted too once the block has
   started — see readContents(). */
const TOC_ENTRY = new RegExp(
  '^((' + KEYWORDS + ')\\s*)?[.:#(\\[]?\\s*([ivxlcdm]+|\\d+)\\b[\\s.:—–)\\]-]+(.+)$', 'i');

const CONTENTS_LINE = /^(table of\s+)?contents\.?$/i;

/* A line that is ONLY a numeral. Unambiguous in a way "any short line" is
   not, and it is how Epictetus, the Upanishads and much of Gutenberg mark
   divisions. Guarded hard below, because verse numbering looks identical. */
const NUMERAL_ONLY = /^([ivxlcdm]{1,7}|\d{1,3})\.?$/i;

const MAX_HEADING_CHARS = 70;
const ROMAN = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };

/* Chapter numbers are compared, not just read — a number that goes
   BACKWARDS is how a contents block is told apart from the body that
   follows it. Arabic or roman; anything else is 0, which simply fails the
   increasing test rather than throwing. */
export function numeralValue(s) {
  const t = String(s || '').trim().toLowerCase();
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  if (!/^[ivxlcdm]+$/.test(t)) return 0;
  let total = 0;
  for (let i = 0; i < t.length; i++) {
    const cur = ROMAN[t[i]], next = ROMAN[t[i + 1]];
    total += (next && cur < next) ? -cur : cur;
  }
  return total;
}

/* Fold the differences that are never meaningful in a heading — case,
   punctuation, and the hyphen that turns "Twin Verses" into "Twin-Verses". */
export function normalizeHeading(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/* Every line of the book, each remembering its page. Marks are per-PAGE
   (the unit the reader turns) but the contents block must be excluded per
   LINE, because in the Dhammapada the block and the real "Chapter I" share
   a page. */
function flatten(pages) {
  const out = [];
  (pages || []).forEach((text, page) => {
    String(text == null ? '' : text).split('\n').forEach(raw => out.push({ page, text: raw.trim() }));
  });
  return out;
}

/* ---------- route 1: the book's own contents ---------- */

/* Where the contents block starts, where it ends, and what it lists.

   THE COUNTING-UP RULE is load-bearing: a contents block is followed by the
   body, whose first heading looks exactly like a contents entry — so the
   block ate the Dhammapada's real "Chapter I" and reported 27 for a
   26-chapter book. A contents list counts up; the body starts over at one.
   A number that does not increase ends the block. */
export function readContents(lines) {
  const start = lines.findIndex(l => CONTENTS_LINE.test(l.text));
  if (start < 0) return null;

  const entries = [];
  let misses = 0, last = start, highest = 0;
  for (let i = start + 1; i < lines.length; i++) {
    const t = lines[i].text;
    if (!t) continue;                                   // blanks never end it
    const m = t.length <= MAX_HEADING_CHARS + 20 ? TOC_ENTRY.exec(t) : null;
    if (m) {
      const n = numeralValue(m[3]);
      if (n <= highest) break;                          // it started over: the body
      entries.push({ text: t, title: (m[4] || '').trim(), number: n, line: i });
      highest = n; last = i; misses = 0;
      continue;
    }
    /* An UNNUMBERED short line inside a block that has already started is
       still an entry — plenty of contents pages list bare titles. Only two
       consecutive non-entries end the block. */
    if (entries.length && t.length <= MAX_HEADING_CHARS && !/[.,;:?!]$/.test(t)) {
      entries.push({ text: t, title: t, number: 0, line: i });
      last = i; misses = 0;
      continue;
    }
    if (++misses >= 2) break;
  }
  if (entries.length < 2) return null;
  return { from: start, to: last, entries };
}

/* Locate each contents entry in the BODY, as a whole line, searching FORWARD
   ONLY from the previous chapter.

   Forward-only is the whole trick. Matching a title anywhere lands on the
   wrong page constantly, because chapter titles are ordinary words: the
   first page containing "Self" or "Happiness" or "The World" is page 1 of
   almost any book. Chapters are in order, so the search is too. */
function marksFromContents(lines, toc) {
  if (!toc) return [];
  const marks = [];
  let cursor = toc.to + 1;
  for (const entry of toc.entries) {
    const wantFull = normalizeHeading(entry.text);
    const wantTitle = normalizeHeading(entry.title);
    if (wantTitle.length < 3 && wantFull.length < 3) continue;
    let hit = -1;
    for (let i = cursor; i < lines.length; i++) {
      const t = lines[i].text;
      if (!t || t.length > MAX_HEADING_CHARS) continue;
      const n = normalizeHeading(t);
      if (!n) continue;
      /* The body rarely quotes the contents exactly — "Chapter 1: The Twin
         Verses" against "Chapter I. The Twin-Verses". So match on the TITLE
         as the whole line, or on the full entry, either way anchored to the
         line rather than found inside prose. */
      if (n === wantFull || (wantTitle.length >= 3 && n === wantTitle)
        || (wantTitle.length >= 6 && n.endsWith(' ' + wantTitle))) { hit = i; break; }
    }
    if (hit < 0) continue;
    marks.push({ page: lines[hit].page, label: entry.text.slice(0, 60) });
    cursor = hit + 1;
  }
  return marks;
}

/* ---------- route 2: keyword headings ---------- */

function marksFromHeadings(lines, toc) {
  const marks = [];
  lines.forEach((l, i) => {
    if (toc && i >= toc.from && i <= toc.to) return;    // the contents is not the body
    const t = l.text;
    if (!t || t.length > MAX_HEADING_CHARS) return;
    const m = HEADING.exec(t);
    if (!m) return;
    marks.push({ page: l.page, label: t, keyword: m[1].toLowerCase(), value: numeralValue(m[2]) });
  });
  return marks;
}

/* A book numbers its divisions ONE way. The Dhammapada's front matter says
   "Part I" (volume X, part I of a series) — one "part" against twenty-six
   "chapter"s — and keeping only the dominant keyword drops it with no
   special case. Returns the marks of the winning keyword AND the runners-up,
   because a two-level book needs both (Book I-IV over Chapter 1-24). */
function byKeyword(marks) {
  const groups = new Map();
  for (const m of marks) {
    if (!groups.has(m.keyword)) groups.set(m.keyword, []);
    groups.get(m.keyword).push(m);
  }
  return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
}

/* ---------- route 3: a bare numeral on its own line ---------- */

/* Epictetus marks a chapter as a lone "IV" followed by its title. So does a
   great deal of Gutenberg. The danger is that VERSE numbering looks exactly
   the same — the Upanishads yields 171 "chapters" for a 90-page book — so
   two guards, and both are needed:

     SEQUENCE  the numbers must mostly count up. Verse numbers restart every
               chapter; chapter numbers do not.
     DENSITY   a chapter spans pages. More than one mark per two pages is
               verse numbering, not structure. */
function marksFromNumerals(lines, pageCount) {
  const raw = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].text;
    if (!t || !NUMERAL_ONLY.test(t)) continue;
    let title = '';
    for (let j = i + 1; j < lines.length; j++) {
      if (!lines[j].text) continue;
      const cand = lines[j].text;
      if (cand.length <= MAX_HEADING_CHARS && !/[.,;:?!]$/.test(cand)) title = cand;
      break;
    }
    raw.push({ page: lines[i].page, value: numeralValue(t.replace(/\.$/, '')),
               label: title ? t.replace(/\.$/, '') + '. ' + title : t });
  }
  if (raw.length < 2) return [];

  const rising = raw.filter((m, i) => i === 0 || m.value > raw[i - 1].value);
  if (rising.length < raw.length * 0.6) return [];            // restarts: verse numbering
  if (pageCount && rising.length > pageCount / 2) return [];  // too dense to be chapters

  /* A SCANNED BOOK PRINTS ITS PAGE NUMBER ON EVERY PAGE, and OCR turns that
     into a lone numeral followed by the running header. The Serpent Power
     yielded 230 "chapters" this way — "VI. THE SIX CENTRES AND THE SERPENT
     POWER", then the same header again, and again. Density cannot catch it
     (every 4 pages, same as Epictetus) but this can: CHAPTER TITLES ARE
     DISTINCT. A title that keeps coming back is a running header. */
  const seen = new Map();
  for (const m of rising) {
    const k = normalizeHeading(String(m.label).replace(/^[ivxlcdm\d]+\.?\s*/i, ''));
    if (k) seen.set(k, (seen.get(k) || 0) + 1);
  }
  const repeated = [...seen.values()].filter(n => n > 1).reduce((a, b) => a + b, 0);
  if (repeated > rising.length * 0.25) return [];

  return rising;
}

/* ---------- putting it together ---------- */

/* Increasing pages, never twice on one page. A control that jumps backwards
   is worse than no control. */
function ordered(marks) {
  const out = [];
  for (const m of marks || []) {
    if (out.length && m.page <= out[out.length - 1].page) continue;
    out.push(m);
  }
  return out;
}

const clean = (marks) => ordered(marks).map(m => ({ page: m.page, label: String(m.label).slice(0, 60) }));

/* THE ANSWER, and how it was reached.

     marks  [{page, label}]  in increasing page order
     how    'toc' | 'headings' | 'numerals' | 'none'                */
export function findChapters(pages) {
  const list = Array.isArray(pages) ? pages : [];
  if (list.length < 2) return { marks: [], how: 'none' };

  const lines = flatten(list);
  const toc = readContents(lines);

  /* THE INDEX FIRST — but not blindly first-past-the-post.
     Running the contents route and returning the moment it found anything
     cost the Gita 18 chapters for 14 and Origin of Species 20 for 7: both
     have a contents block AND clean keyword headings, and the block simply
     lists fewer entries (or a few fail to match). So the contents route wins
     when it genuinely resolved most of what it listed; otherwise every route
     is scored and the best one answers. */
  const fromToc = clean(marksFromContents(lines, toc));
  const tocCoverage = toc && toc.entries.length ? fromToc.length / toc.entries.length : 0;
  if (fromToc.length >= 2 && tocCoverage >= 0.9) return { marks: fromToc, how: 'toc' };

  /* keyword headings, and bare numerals, considered together so a two-level
     book (Book I-IV over 24 chapters each) keeps the FINER division rather
     than stopping at four. */
  const groups = byKeyword(marksFromHeadings(lines, toc));
  const coarse = groups.length ? clean(groups[0][1]) : [];
  const numerals = clean(marksFromNumerals(lines, list.length));

  /* The contents route still wins over a WEAKER body scan — it names chapters
     properly and it is the only route many books have. It only loses when the
     body genuinely knows about more divisions than the block listed. */
  if (fromToc.length >= 2 && fromToc.length >= coarse.length && fromToc.length >= numerals.length) {
    return { marks: fromToc, how: 'toc' };
  }

  if (numerals.length > coarse.length * 2 && numerals.length >= 5) {
    /* Prefix each fine mark with the coarse division it sits inside, so
       "Book I · III. Of Progress" reads as its place in the whole. */
    if (coarse.length >= 2) {
      const labelled = numerals.map(n => {
        let outer = null;
        for (const c of coarse) { if (c.page <= n.page) outer = c; else break; }
        return { page: n.page, label: (outer ? outer.label + ' · ' : '') + n.label };
      });
      return { marks: clean(labelled), how: 'numerals' };
    }
    return { marks: numerals, how: 'numerals' };
  }
  if (coarse.length >= 2) return { marks: coarse, how: 'headings' };
  if (numerals.length >= 2) return { marks: numerals, how: 'numerals' };

  return { marks: [], how: 'none' };
}

/* Which chapter a given page falls in — the lookup behind "ch. 4, p. 61" on
   a note. Null where a book has no marks, so a caller records an ABSENT
   field rather than a wrong one. */
export function chapterAt(marks, page) {
  if (!marks || !marks.length) return null;
  let hit = null;
  for (let i = 0; i < marks.length; i++) {
    if (marks[i].page <= page) hit = { index: i, number: i + 1, ...marks[i] };
    else break;
  }
  return hit;
}
