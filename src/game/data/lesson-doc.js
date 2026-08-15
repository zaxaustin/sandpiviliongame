/* ================================================================
   [A LESSON AS A DOCUMENT] — THE-TEACHERS-TREE-PLAN.md, gaps 1 and 2.

   Written 2026-08-03 for the steward's friend, who teaches English:

     "if he can get help making a lesson plan he can potentially publish,
      and make his own website for, is the goal."

   Two jobs, both pure — no DOM, no imports from the game — so the test
   suite can hold them rather than trust them.

   1. READING DETECTION. A lesson can now name a set text, and a teacher
      writing "Read chapters 3-4 and annotate the argument" should get a
      door to chapter 3 without having learned a syntax. So this DETECTS
      a reference in what was typed naturally rather than demanding a
      field. Where it finds nothing it says nothing — the standing rule
      here is that "I don't know" is a fine answer and a wrong chapter is
      worse than none, because a lesson that cites the wrong pages is a
      class that goes wrong on Monday.

   2. RENDERING. A packet (.json) is the right thing for another Pavilion
      and the wrong thing for a classroom. A teacher needs a DOCUMENT: a
      handout to print, or a page to put on his own site. So a lesson
      renders to Markdown and to one self-contained HTML file with the
      styles inside it — dropping that file on any host is the whole
      deployment, and it stays HIS. We do not host anything.
   ================================================================ */

/* ---------- 1 · what this step asks you to read ---------- */

/* Ranges are written every way there is. `3-4`, `3–4` (en dash), `3 to 4`,
   `3 and 4`. Only the first reference in a step is taken: a step that
   mentions two different chapters is ambiguous, and an ambiguous door is
   the wrong kind of confident. */
const SEP = '\\s*(?:-|–|—|to|through|and|&)\\s*';
const CH  = new RegExp('\\b(?:ch|chap|chapter|chapters|chs)\\.?\\s*(\\d+)(?:' + SEP + '(\\d+))?\\b', 'i');
const PG  = new RegExp('\\bp{1,2}\\.?\\s*(\\d+)(?:' + SEP + '(\\d+))?\\b', 'i');
/* "page 12", spelled out, is common in a lesson plan and unambiguous. */
const PGW = new RegExp('\\bpages?\\s+(\\d+)(?:' + SEP + '(\\d+))?\\b', 'i');

export function readingIn(text) {
  const s = String(text || '');
  const ch = CH.exec(s);
  if (ch) return range('chapter', ch[1], ch[2]);
  const pw = PGW.exec(s);
  if (pw) return range('page', pw[1], pw[2]);
  const pg = PG.exec(s);
  if (pg) return range('page', pg[1], pg[2]);
  return null;
}
function range(kind, a, b) {
  const from = parseInt(a, 10);
  if (!from || from < 1 || from > 9999) return null;          // "chapter 0" is nothing
  let to = b == null ? from : parseInt(b, 10);
  if (!to || to < from || to > 9999) to = from;               // a backwards range is a typo, not a range
  return { kind, from, to };
}
/* How it reads on the button. "ch. 3" and "ch. 3–4" — the unit people
   actually think in, the same vocabulary the Reader and the notes use. */
export function readingLabel(r) {
  if (!r) return '';
  // "pp." for a span of pages, the way it is actually written on a handout —
  // seen in a screenshot of the exported page, not in any assertion.
  if (r.from === r.to) return (r.kind === 'chapter' ? 'ch. ' : 'p. ') + r.from;
  return (r.kind === 'chapter' ? 'ch. ' : 'pp. ') + r.from + '–' + r.to;
}

/* ---------- 2 · the lesson as something you can hand out ---------- */

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* `book` is optional and passed in rather than looked up, so this file stays
   pure: {title, attribution}. */
export function lessonToMarkdown(node, opts = {}) {
  const book = opts.book || null;
  const L = [];
  /* THE PORTABLE HALF, added 2026-08-10 and deliberately an OPTION on this
     function rather than a second emitter. This already wrote the document a
     teacher hands out; `frontmatter: true` adds the machine-readable header
     that lets data/course-format.js read it back, so "Save as Markdown" now
     produces a file that can be edited in a chat window and dropped straight
     back in. Two Markdown writers for one object would be rule 4's exact
     shape — and this one already existed, written for the steward's friend
     who teaches English, who is the person the whole round trip is for. */
  /* A frontmatter value is one line. A field that arrives as a paragraph
     (purpose, outcome — both can be long) is folded onto one. */
  const one = v => String(v == null ? '' : v).replace(/\s*\n+\s*/g, ' ').trim();
  /* A block list, the shape the steward writes `prerequisites:` in. */
  const listOut = (k, arr) => k + ':\n' + arr.map(x => '  - ' + one(x)).join('\n');
  if (opts.frontmatter) {
    const by = node.by || {};
    const fm = ['title: ' + (node.title || 'A lesson')];
    if (node.summary) fm.push('summary: ' + one(node.summary));
    if (node.purpose) fm.push('purpose: ' + one(node.purpose));
    if (node.audience) fm.push('audience: ' + one(node.audience));
    if (node.outcome) fm.push('outcome: ' + one(node.outcome));
    if (node.track) fm.push('track: ' + node.track);
    if (node.level) fm.push('level: ' + node.level);
    if (node.category) fm.push('category: ' + node.category);
    if ((node.prerequisites || []).length) fm.push(listOut('prerequisites', node.prerequisites));
    /* What the author brought, not what the course demands — see LIST_KEYS in
       data/course-format.js. It travels with the file so the next reader knows
       what the work actually cost somebody starting from there. */
    if ((node.baseline || []).length) fm.push(listOut('baseline', node.baseline));
    if (node.book && node.book.slug) fm.push('reading: ' + node.book.slug);
    if (by.user) fm.push('author: ' + by.user);
    if (by.who === 'ai' && by.model) fm.push('drafted-with: ' + by.model);
    if (node.license) fm.push('license: ' + node.license);
    /* `source` was in the parser's KNOWN list from the start and was never
       written back out, so a course's provenance died on the first round
       trip. Found 2026-08-14 while adding the fields beside it. */
    if (node.source) fm.push('source: ' + one(node.source));
    for (const k of Object.keys(node.extra || {})) {
      const v = node.extra[k];
      fm.push(Array.isArray(v) ? listOut(k, v) : k + ': ' + one(v));
    }
    L.push('---'); L.push(fm.join('\n')); L.push('---'); L.push('');
  }
  L.push('# ' + (node.title || 'A lesson'));
  L.push('');
  if (node.summary) { L.push(node.summary); L.push(''); }
  const facts = [];
  if (node.track) facts.push(node.track);
  if (node.level) facts.push('level ' + node.level);
  if (book) facts.push('set text: *' + book.title + '*' + (book.attribution ? ' — ' + book.attribution : ''));
  if (facts.length) { L.push('*' + facts.join(' · ') + '*'); L.push(''); }
  if ((opts.prereqTitles || []).length) {
    L.push('**Before this:** ' + opts.prereqTitles.join(', '));
    L.push('');
  }
  /* The opening intention, below the facts and above the first module —
     where the person reading the handout meets it before any of the work. */
  if (node.intro) { L.push(node.intro); L.push(''); }
  (node.steps || []).forEach((s, i) => {
    const r = book ? readingIn((s.title || '') + ' ' + (s.body || '')) : null;
    L.push(`## ${i + 1}. ${s.title || ''}`);
    if (r) L.push(`*Reading: ${readingLabel(r)} of ${book.title}*`);
    /* The module's own book, written back as the bold label it arrived as, so
       a course handed to somebody else still points at the text it reads. */
    if (s.reading) { L.push(''); L.push('**Reading:** ' + s.reading); }
    if (s.body) { L.push(''); L.push(s.body); }
    L.push('');
  });
  L.push('---');
  L.push('');
  L.push('_Written in the Sand Pavilion' + (opts.by ? ' by ' + opts.by : '') + (node.written ? ' · ' + node.written : '') + '._');
  return L.join('\n');
}

/* ONE FILE. Styles inside it, no fonts fetched, no script — so it opens from
   a USB stick, prints properly, and can be dropped on any host as-is. The
   print rules are not decoration: the first thing a teacher does with a
   lesson plan is print it. */
export function lessonToHTML(node, opts = {}) {
  const book = opts.book || null;
  const steps = (node.steps || []).map((s, i) => {
    const r = book ? readingIn((s.title || '') + ' ' + (s.body || '')) : null;
    return `<li>
      <h2>${esc(s.title || '')}</h2>
      ${r ? `<p class="reading">Reading: ${esc(readingLabel(r))} of <cite>${esc(book.title)}</cite></p>` : ''}
      ${s.body ? `<p>${esc(s.body)}</p>` : ''}
    </li>`;
  }).join('\n');
  const facts = [];
  if (node.track) facts.push(esc(node.track));
  if (node.level) facts.push('level ' + esc(node.level));
  if (book) facts.push('set text: <cite>' + esc(book.title) + '</cite>'
    + (book.attribution ? ' — ' + esc(book.attribution) : ''));
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(node.title || 'A lesson')}</title>
<style>
  :root { color-scheme: light dark; }
  body { max-width: 42rem; margin: 0 auto; padding: 2rem 1.25rem 4rem;
         font: 17px/1.65 Georgia, 'Iowan Old Style', 'Times New Roman', serif;
         color: #23201b; background: #fbf7ef; }
  h1 { font-size: 1.9rem; line-height: 1.2; margin: 0 0 .4rem; }
  .facts { color: #6b6154; font-style: italic; margin: 0 0 1.5rem; }
  .summary { font-size: 1.08rem; }
  .before { background: #f1e9da; border-left: 3px solid #c9a86a; padding: .6rem .9rem; margin: 1.5rem 0; }
  ol { padding-left: 0; list-style: none; counter-reset: step; }
  li { counter-increment: step; margin: 1.9rem 0; padding-left: 2.6rem; position: relative; }
  li::before { content: counter(step); position: absolute; left: 0; top: .1rem;
               width: 1.8rem; height: 1.8rem; border-radius: 50%; background: #c9a86a; color: #2b2419;
               font: bold 15px/1.8rem system-ui, sans-serif; text-align: center; }
  li h2 { font-size: 1.15rem; margin: 0 0 .3rem; }
  .reading { margin: .1rem 0 .5rem; font-size: .93rem; color: #7a6a4e; }
  li p { margin: .4rem 0; }
  footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #ddd2bd;
           color: #6b6154; font-size: .87rem; }
  @media (prefers-color-scheme: dark) {
    body { color: #e8e0d2; background: #1c1813; }
    .before { background: #2a2419; }
    li::before { background: #c9a86a; color: #1c1813; }
    footer { border-color: #3a3227; }
    .facts, .reading, footer { color: #a2957f; }
  }
  @media print {
    body { max-width: none; background: #fff; color: #000; padding: 0; font-size: 12pt; }
    li { break-inside: avoid; }
    .before { background: none; }
  }
</style></head><body>
<h1>${esc(node.title || 'A lesson')}</h1>
${facts.length ? `<p class="facts">${facts.join(' · ')}</p>` : ''}
${node.summary ? `<p class="summary">${esc(node.summary)}</p>` : ''}
${(opts.prereqTitles || []).length ? `<p class="before"><b>Before this:</b> ${esc(opts.prereqTitles.join(', '))}</p>` : ''}
<ol>
${steps}
</ol>
<footer>Written in the Sand Pavilion${opts.by ? ' by ' + esc(opts.by) : ''}${node.written ? ' · ' + esc(node.written) : ''}.</footer>
</body></html>`;
}

/* A filename someone can find again. */
export function lessonFileName(node, ext) {
  const slug = String(node.title || 'lesson').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'lesson';
  return slug + '.' + ext;
}
