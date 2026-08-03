/* ================================================================
   [RETRIEVAL] — finding the passage, instead of pasting the book.

   REFERENCE-AND-RETRIEVAL-PLAN.md Part B, first slice. The problem it
   closes, established 2026-08-03:

     A local model has no database. `searchDocs()` returned null.
     Nothing anywhere could look INSIDE a book. Quill was handed
     titles and blurbs and had never read one; a dissection lens could
     only see the single page you happened to have open.

   So "really go through this paper with the local AI" meant finding
   every relevant passage by hand first, which is most of the work.

   WHAT THIS IS, AND WHAT IT IS DELIBERATELY NOT. It is keyword
   retrieval — BM25-ish scoring over the book's own pages. It is not
   embeddings and not semantic search. That is a real limitation:
   asking for "impermanence" will not find a page that only ever says
   "nothing lasts". Embeddings are the honest second slice, and they
   want either a model call per chunk (slow, and this machine's limit
   is cooling) or an index that must be rebuilt as the Library grows.
   Most of the value is in this slice, it needs neither, and it is
   fully deterministic — so it can be tested, which the second slice
   largely cannot.

   THE RULE THIS OBEYS, from the plan and from the catalogue bug found
   the same morning:

     retrieve the relevant fragment, NEVER the corpus.

   Three passages with their page numbers, not a book.

   PAGES ARE THE READER'S PAGES. paginate() lives here and the reader
   calls it, rather than each having its own idea of where a page
   ends. Retrieval saying "page 47" and the reader showing you page 51
   is precisely the two-lists-that-must-agree failure that has bitten
   this project three times.

   Pure logic, no DOM, no imports.
   ================================================================ */

export const PAGE_CHARS = 1400;

/* The one definition of a page in the whole application. */
export function paginate(text) {
  const paras = String(text || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const pages = []; let cur = '';
  for (const p of paras) {
    if (cur && (cur.length + p.length + 2) > PAGE_CHARS) { pages.push(cur); cur = p; }
    else cur = cur ? cur + '\n\n' + p : p;
  }
  if (cur) pages.push(cur);
  return pages.length ? pages : [String(text || '')];
}

/* Small and deliberately incomplete. A long stopword list starts throwing away
   terms that matter in a particular book — "being" and "self" and "no" are
   noise in a manual and load-bearing in a sutta. Only words that carry no
   discriminating power anywhere. */
const STOP = new Set(('a an the and or but if then than that this these those of in on at to for from by with '
  + 'is are was were be been being it its as into about over under again further once here there all any both '
  + 'each few more most other some such only own same so too very can will just should now i you he she we they'
  ).split(' '));

export function tokenize(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9À-ɏ']+/g, ' ')
    .split(/\s+/).filter(w => w.length > 1 && !STOP.has(w));
}

/* BM25, the standard shape, over the pages of ONE document — so "rare" means
   rare in this book, which is exactly what makes a term worth matching on. */
const K1 = 1.4, B = 0.72;

export function searchPages(pages, query, opts = {}) {
  const limit = opts.limit || 3;
  const terms = [...new Set(tokenize(query))];
  const list = Array.isArray(pages) ? pages : [];
  if (!terms.length || !list.length) return [];

  const toks = list.map(tokenize);
  const N = list.length;
  const avgLen = toks.reduce((n, t) => n + t.length, 0) / N || 1;

  const df = new Map();
  for (const t of terms) df.set(t, toks.filter(pt => pt.includes(t)).length);

  const scored = list.map((text, i) => {
    const pt = toks[i]; const len = pt.length || 1;
    let score = 0; let matched = 0;
    for (const t of terms) {
      const n = df.get(t) || 0;
      if (!n) continue;
      const tf = pt.reduce((c, w) => c + (w === t ? 1 : 0), 0);
      if (!tf) continue;
      matched++;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * (tf * (K1 + 1)) / (tf + K1 * (1 - B + B * len / avgLen));
    }
    /* A page carrying every term beats one carrying a lot of a single term.
       Without this, a page that says "resistor" nine times outranks the page
       that actually answers "what resistor for this LED". */
    if (terms.length > 1 && matched === terms.length) score *= 1.35;
    return { page: i, score, matched, text };
  });

  return scored.filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score || a.page - b.page)
    .slice(0, limit)
    .map(p => ({ ...p, snippet: snippetAround(p.text, terms) }));
}

/* A window around the densest run of matches, cut at sentence-ish boundaries
   so it reads rather than starting mid-word. */
export function snippetAround(text, terms, width = 420) {
  const s = String(text || '');
  if (s.length <= width) return s;
  const low = s.toLowerCase();
  let best = 0, bestHits = -1;
  for (let i = 0; i < s.length; i += 80) {
    const win = low.slice(i, i + width);
    const hits = terms.reduce((n, t) => n + (win.includes(t) ? 1 : 0), 0);
    if (hits > bestHits) { bestHits = hits; best = i; }
  }
  let from = best, to = Math.min(s.length, best + width);
  const dot = s.lastIndexOf('. ', from + 40);
  if (dot > from - 120 && dot > 0) from = dot + 2;
  const end = s.indexOf('. ', to - 60);
  if (end > 0 && end < to + 120) to = end + 1;
  return (from > 0 ? '…' : '') + s.slice(from, to).trim() + (to < s.length ? '…' : '');
}

/* What actually goes into a prompt: the passages, each labelled with the page
   it came from so the model can cite it and the visitor can go and check.
   Capped by CHARACTERS, not by passage count — three pages of a dense paper is
   a different amount of text from three pages of verse, and the cap is what
   stops this quietly becoming "paste the corpus" again. */
export function passagesBlock(hits, opts = {}) {
  const cap = opts.cap || 6000;
  if (!hits || !hits.length) return '';
  const out = []; let used = 0;
  for (const h of hits) {
    const body = (opts.full ? h.text : h.snippet) || '';
    const chunk = `[page ${h.page + 1}]\n${body}`;
    if (used + chunk.length > cap && out.length) break;
    out.push(chunk); used += chunk.length;
  }
  return out.join('\n\n---\n\n');
}

/* Whether a search found anything worth showing. Kept separate so the UI can
   say "nothing matched" honestly instead of handing the model an empty block
   and letting it invent an answer from the title. */
export function hasResults(hits) { return !!(hits && hits.length); }
