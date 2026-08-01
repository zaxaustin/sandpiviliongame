/* ================================================================
   [SHELF RULES] — filing books the way a librarian actually does it:
   the obvious ones by hand, instantly, and only the genuinely unclear
   ones set aside to think about.

   Written 2026-07-28, from a standing budget rule:

     "Let's make sure we are only having the units do the sorting, or
      the things we can't do with Python or with Python assistance."

   Before this, `suggestShelvesWithAI()` sent EVERY selected book to the
   model in batches of eight — sixteen model calls for the 128-book
   import that prompted the feature, most of them about books that were
   never ambiguous. A title with "Sutta" in it does not need a language
   model's opinion.

   So this runs first. It files what is obvious and hands on only the
   remainder. Three things fall out of that, and all three matter:

     · it is FASTER, because most books never reach a model;
     · it is MORE RELIABLE, because a rule cannot hallucinate a shelf;
     · and it WORKS WITH NO AI AT ALL — which is the whole point for
       someone on a laptop that can't run a model.

   The governing discipline is the same one `data/copyright.js` uses:
   **only act when certain.** A rule that fires on two shelves at once
   has learned nothing, so it stays quiet and lets the book through to
   the next stage. Over-filing is worse than under-filing, because a
   wrong shelf is a book you will never find again.
   ================================================================ */

/* Words that reliably indicate a lineage, and are unlikely to appear by
   accident in a title about something else. Deliberately conservative:
   every one of these was chosen because it is close to unambiguous, and
   the ones that were merely *suggestive* (novel, history, art) were left
   out on purpose. A hint only ever applies if that shelf actually exists
   in this Pavilion. */
export const SHELF_HINTS = {
  Theravada: ['sutta', 'suttas', 'nikaya', 'dhammapada', 'dhamma', 'pali', 'theravada',
              'vipassana', 'satipatthana', 'anapanasati', 'visuddhimagga', 'abhidhamma'],
  Mahayana:  ['mahayana', 'bodhisattva', 'lotus sutra', 'heart sutra', 'diamond sutra',
              'dogen', 'zazen', 'koan', 'lankavatara', 'nagarjuna'],
  Daoism:    ['tao te ching', 'daodejing', 'zhuangzi', 'chuang tzu', 'laozi', 'lao tzu',
              'wu wei', 'daoism', 'taoism', 'i ching'],
  Hindu:     ['upanishad', 'upanishads', 'bhagavad', 'vedas', 'rig veda', 'ramayana',
              'mahabharata', 'yoga sutra', 'patanjali'],
  Science:   ['physics', 'chemistry', 'biology', 'astronomy', 'evolution', 'genetics',
              'thermodynamics', 'relativity', 'quantum'],
  Practice:  ['meditation', 'mindfulness', 'breathing', 'contemplation'],
};

const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/* Does `needle` appear in `hay` as whole words? Substring matching would
   file "Taoism for Beginners" and also "Automation", which is exactly the
   kind of confident error this module exists to avoid. */
function hasPhrase(hay, needle) {
  const h = ' ' + norm(hay) + ' ', n = ' ' + norm(needle) + ' ';
  return n.trim().length >= 3 && h.includes(n);
}

/* ---- the pass itself -------------------------------------------------
   books    — what to sort (each {slug, title, tradition, attribution})
   shelves  — the shelf names allowed (never 'Personal')
   filed    — every book ALREADY on a shelf, to learn from
   Returns { filed: [{slug, shelf, why}], unsure: [book] }.        */
export function preSortShelves(books, shelves, filed = []) {
  const out = [], unsure = [];
  const allowed = (shelves || []).filter(s => s && s !== 'Personal');

  // what this Pavilion already knows, learned from books already on shelves
  const titleShelf = new Map();   // normalised title  -> Set of shelves
  const authorShelf = new Map();  // normalised author -> Set of shelves
  for (const b of filed) {
    const shelf = b && b.tradition;
    if (!shelf || shelf === 'Personal' || !allowed.includes(shelf)) continue;
    const t = norm(b.title); if (t) { if (!titleShelf.has(t)) titleShelf.set(t, new Set()); titleShelf.get(t).add(shelf); }
    const a = norm(b.attribution || b.author); if (a) { if (!authorShelf.has(a)) authorShelf.set(a, new Set()); authorShelf.get(a).add(shelf); }
  }
  const only = set => (set && set.size === 1) ? [...set][0] : null;

  for (const b of books || []) {
    const title = b.title || '';
    let shelf = null, why = '';

    // 1 — the same book is already filed somewhere. The strongest signal there is.
    const dupe = only(titleShelf.get(norm(title)));
    if (dupe) { shelf = dupe; why = 'you already have this one on ' + dupe; }

    // 2 — this author's other books all sit on one shelf
    if (!shelf) {
      const byAuthor = only(authorShelf.get(norm(b.attribution || b.author)));
      if (byAuthor) { shelf = byAuthor; why = 'your other books by this author are on ' + byAuthor; }
    }

    // 3 — a shelf's own name appears in the title ("Electronics for Inventors").
    //     Your own shelf names win over the Library's lineages: you named them
    //     for a reason, and the reason is usually more specific.
    if (!shelf) {
      const hits = allowed.filter(s => norm(s).length >= 4 && hasPhrase(title, s));
      if (hits.length === 1) { shelf = hits[0]; why = '"' + hits[0] + '" is in the title'; }
    }

    // 4 — a lineage word that means one thing and nothing else
    if (!shelf) {
      const hits = [];
      for (const [s, words] of Object.entries(SHELF_HINTS)) {
        if (!allowed.includes(s)) continue;
        const word = words.find(w => hasPhrase(title, w));
        if (word) hits.push([s, word]);
      }
      // two lineages at once ("The Tao of Physics") is a real ambiguity, not a
      // tie to break. Let a person or a model decide that one.
      if (hits.length === 1) { shelf = hits[0][0]; why = '"' + hits[0][1] + '" in the title'; }
    }

    if (shelf) out.push({ slug: b.slug, shelf, why });
    else unsure.push(b);
  }
  return { filed: out, unsure };
}

/* A work order for whatever nothing could place — the "list the problems
   or request out" idea (2026-07-28). The local model does what it can and
   then says plainly what it couldn't, in a form you can hand to a bigger
   model in another window, or just read yourself. Being unable to finish is
   not a failure worth hiding; an unlabelled gap is. */
export function unsortedWorkOrder(unsure, shelves) {
  if (!unsure || !unsure.length) return '';
  const lines = unsure.map(b => '- ' + (b.title || 'Untitled'));
  return [
    'These books could not be filed automatically. For each, pick the single best shelf.',
    '',
    'Shelves available: ' + (shelves || []).filter(s => s !== 'Personal').join(' | '),
    '',
    'Books:',
    ...lines,
    '',
    'Answer with one line per book, exactly: TITLE => SHELF',
  ].join('\n');
}
