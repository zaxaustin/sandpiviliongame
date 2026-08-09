/* ================================================================
   [TEST BOOKS] — the player's books, not the seed's.

   CLAUDE.md rule 1, which this file exists to make possible:

     "TEST THE PLAYER'S BOOKS, NOT THE SEED. 27 books ship in seed.js;
      270+ were added by the player, and that gap only widens."

   Every live suite used to seed an EMPTY save and then reach for
   `dhammapada` — a seed book. That was convenient and it was the exact
   mistake the rule names, and on 2026-08-10 it came due twice over:

     1. The seed shelf was deleted, and nine suites went red at once
        because the only book they knew had gone.
     2. Far worse, it had been HIDING A REAL BUG for weeks. Books from
        the database and from your own imports carried no `category`,
        so the Index filtered all 415 of them out and rendered nothing.
        The seed books DID carry one, so every suite saw a working
        Library while the real one was empty on screen. "i cant find my
        books in the library" was true, and the tests said fine.

   So the fixture is a book the way a REAL one arrives: through
   personalLibrary, with a `personal-` slug, an honest licence, and its
   text where a real import puts it. A suite that passes against this
   has tested the path a person actually uses.

   THREE HOMES, because a book's text lives in one of three places and
   the suites should be able to reach for whichever one they mean:

     inlineBook()   text inside the save          — works in a browser
     fileBook()     a .txt under userData         — desktop
     dockerBook()   an object in MinIO            — desktop + Docker

   Import with:  import { inlineBook, withBooks } from './_books.mjs';
   ================================================================ */

/* Real prose rather than lorem: the chapter finder, the paginator and the
   dissection tools all behave differently on text with actual sentence and
   paragraph shape, and a suite that passes on 'aaaa' proves nothing about
   a book. Public domain (Thoreau, Walden), so it can live in the repo. */
const BODY = [
  'I went to the woods because I wished to live deliberately, to front only the',
  'essential facts of life, and see if I could not learn what it had to teach, and',
  'not, when I came to die, discover that I had not lived. I did not wish to live',
  'what was not life, living is so dear; nor did I wish to practise resignation,',
  'unless it was quite necessary.',
  '',
  'CHAPTER II. Where I Lived, and What I Lived For',
  '',
  'At a certain season of our life we are accustomed to consider every spot as the',
  'possible site of a house. I have thus surveyed the country on every side within',
  'a dozen miles of where I live. In imagination I have bought all the farms in',
  'succession, for all were to be bought, and I knew their price.',
  '',
  'CHAPTER III. Reading',
  '',
  'With a little more deliberation in the choice of their pursuits, all men would',
  'perhaps become essentially students and observers, for certainly their nature',
  'and destiny are interesting to all alike. Books are the treasured wealth of the',
  'world and the fit inheritance of generations and nations.',
].join('\n');

/* Long enough to look like a book to anything that measures one, short
   enough that a 5 MB payload does not hang puppeteer — one did, past 100s,
   and it is a documented gotcha. */
export const BOOK_TEXT = (BODY + '\n\n').repeat(12);

function card(slug, title, extra = {}) {
  return {
    slug, title,
    tradition: 'Non-fiction',
    /* A personal book has no certified licence and says so. Inventing one
       here would make the suites pass against a shape no real book has. */
    license: 'Personal — license not certified',
    attribution: 'Henry David Thoreau',
    source_url: '',
    kind: 'book',
    personal: true,
    doc: {
      summary: 'Two years, two months and two days beside a pond, and what it cost.',
      sections: [],
      ...extra,
    },
  };
}

/* Text inside the save. The only home that works in a browser tab, so this
   is the right default for the puppeteer suites. */
export function inlineBook(slug = 'personal-walden', title = 'Walden') {
  return card(slug, title, { fullText: { license: 'Personal', text: BOOK_TEXT, chars: BOOK_TEXT.length } });
}
/* A real .txt under userData. The suite must actually write the file too —
   a pointer to a file that is not there is a book that will not open. */
export function fileBook(slug = 'personal-emma', title = 'Emma') {
  return card(slug, title, { fullText: { license: 'Personal', storage: { personal: slug + '.txt' }, chars: BOOK_TEXT.length } });
}
/* An object in MinIO. Needs the container; use it only where that is the point. */
export function dockerBook(slug = 'personal-walden', title = 'Walden', key = 'personal/personal-walden.txt') {
  return card(slug, title, { fullText: { license: 'Personal', storage: { bucket: 'sand-pavilion-library', key }, chars: BOOK_TEXT.length } });
}

/* Drop books into a save without having to remember the field name. */
export function withBooks(save, ...books) {
  return { ...save, personalLibrary: [...(save.personalLibrary || []), ...books] };
}

/* The slug the suites reach for when they just need "a book that is here".
   One name, so replacing the fixture is one edit rather than nine. */
export const A_BOOK = 'personal-walden';
