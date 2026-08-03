/* ================================================================
   [THE CATALOGUE, BRIEFED] — what Quill is actually handed, and why
   it cannot just be "all of it".

   Measured 2026-08-03, right after the steward imported ~100 books:

     every Quill message pasted the WHOLE catalogue — title, shelf,
     licence and summary for every book — at ~43 tokens a book.

       27 shipped books   ~1,150 tokens
      100 books           ~4,300
      200 books           ~8,600
      500 books          ~21,400

   So the librarian got slower and dumber the more books you owned,
   which is precisely backwards, and a Library that is "meant to be
   built from scratch by its owner" walks straight into it. At 500
   books the catalogue alone would fill the window and leave no room
   for the actual conversation.

   THE FIX IS NOT A SMALLER LIBRARY. It is that a librarian does not
   recite the whole catalogue before answering; he knows the shape of
   the collection and looks things up. So this degrades in three
   stages as the shelf grows:

     small   every book with its summary   (what we had, and it is good)
     medium  every book, title + shelf     (~8 tokens a book, not 43)
     large   the SHAPE — shelf counts and a sample — plus an explicit
             instruction to ask the visitor to narrow it down

   Stage three is honest rather than clever: Quill is told plainly
   that he is seeing part of the catalogue, so he can say "I can't see
   all of it from here, what subject?" instead of confidently claiming
   a book is not shelved when it simply was not in the excerpt. A
   librarian saying "let me look that up" is not a failure; a
   librarian inventing a No is.

   The real answer underneath all of this is retrieval — searching the
   books themselves rather than pasting a list — and that is written
   up in plans/REFERENCE-AND-RETRIEVAL-PLAN.md. This is the honest
   holding pattern until then, and it is what makes a 500-book Library
   usable in the meantime.

   Pure logic, no DOM, no imports — `npm test` holds it to the budget.
   ================================================================ */

/* Rough but consistently LARGE-erring, same convention as provider.js:
   over-estimating costs a little brevity, under-estimating silently
   truncates the prompt. */
export function briefTokens(text) {
  return Math.ceil(String(text || '').length / 3.4);
}

const FULL_BUDGET = 1600;   // tokens we are willing to spend reciting books
const LIST_BUDGET = 2400;   // a title-only list may run a little longer

function line(d) {
  return `- "${d.title}" (${d.tradition}, ${d.license}): ${(d.doc && d.doc.summary) || ''}`;
}
function shortLine(d) {
  return `- "${d.title}" (${d.tradition})`;
}

/* docs: [{title, tradition, license, doc:{summary}}]
   Returns { text, mode, shown, total } — `mode` is reported so the caller can
   tell the model how complete its view is, which is the whole safety property
   here. */
export function catalogueBrief(docs, opts = {}) {
  const all = Array.isArray(docs) ? docs.filter(Boolean) : [];
  const total = all.length;
  if (!total) return { text: '(The Library is empty.)', mode: 'empty', shown: 0, total: 0 };

  const full = all.map(line).join('\n');
  if (briefTokens(full) <= (opts.fullBudget || FULL_BUDGET)) {
    return { text: full, mode: 'full', shown: total, total };
  }

  const list = all.map(shortLine).join('\n');
  if (briefTokens(list) <= (opts.listBudget || LIST_BUDGET)) {
    return { text: list, mode: 'titles', shown: total, total };
  }

  /* Too many even for titles. Give the SHAPE — which is what a librarian
     actually carries in their head — plus a sample, and say so. */
  const byShelf = new Map();
  for (const d of all) {
    const k = d.tradition || 'Unfiled';
    if (!byShelf.has(k)) byShelf.set(k, []);
    byShelf.get(k).push(d);
  }
  const shelves = [...byShelf.entries()].sort((a, b) => b[1].length - a[1].length);
  const parts = [`The Library holds ${total} texts across ${shelves.length} shelves:`];
  for (const [shelf, books] of shelves) {
    const sample = books.slice(0, 3).map(b => `"${b.title}"`).join(', ');
    parts.push(`- ${shelf}: ${books.length} — e.g. ${sample}${books.length > 3 ? ', …' : ''}`);
  }
  return { text: parts.join('\n'), mode: 'shape', shown: shelves.length, total };
}

/* What to TELL the model about how complete its view is. Separated from the
   listing so the honesty cannot be dropped by accident when someone changes
   the formatting above. */
export function briefCaveat(brief) {
  if (!brief || brief.mode === 'full' || brief.mode === 'empty') return '';
  if (brief.mode === 'titles') {
    return '\n\n(You are seeing every shelved title but NOT their summaries — the collection is too large to '
      + 'recite in full. You know what is here; you do not know what each one says. Say so plainly rather than '
      + 'guessing at a book\'s contents from its title.)';
  }
  return '\n\n(IMPORTANT: the collection is too large to list, so you are seeing only its SHAPE — shelf names, '
    + 'counts, and a few examples. You are NOT seeing every title. Never tell the visitor a book is absent from '
    + 'the Library: you cannot see that from here. Ask which subject or shelf they mean and say you will look '
    + 'there, or send them to the Index, which lists everything.)';
}
