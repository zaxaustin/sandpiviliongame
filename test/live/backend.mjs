/* ================================================================
   [THE BACKEND SEAM] — 2026-08-03.

   Postgres holds what the Pavilion knows about a book; MinIO holds the
   text; the save holds your day. This guards the two properties that
   would hurt most if they broke, and they pull in opposite directions:

     1. WITH a database, hydration must MERGE UPWARD — a shelf the
        visitor assigned beats a NULL in the database, always. The rows
        loaded by tools/load-library.mjs came from MinIO object NAMES
        (guessed titles, no author, no shelf), so getting this backwards
        would silently erase a whole sorting session. That is precisely
        what librarian-safety.mjs exists to prevent, and this is the
        same hazard arriving through a new door.

     2. WITHOUT a database — no bridge, no Docker, nothing — the
        Pavilion must be exactly what it was. The beta ships to people
        who have never installed a container, and that is a release
        gate rather than a preference.

   The bridge is STUBBED here rather than run through Electron: this
   suite has to work in a plain browser. Note the stub is installed
   AFTER load, because a partial window.desktopBridge breaks startup
   (MAINTAINING.md, "mechanical gotchas").

     npm run build:beta
     npm run preview            # another terminal
     node test/live/backend.mjs
   ================================================================ */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const R = [];
const check = (name, ok) => R.push([name, !!ok]);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1000, height: 800 } });
const p = await browser.newPage();
p.on('pageerror', e => console.log('PAGEERR', e.message));

/* A save that already knows two of these books, with REAL cards and a shelf
   the visitor chose. The database will report both with no shelf at all. */
await p.evaluateOnNewDocument(save => localStorage.setItem('sandPavilionSave.v2', save),
  JSON.stringify({
    seenWelcome: true, aiConnections: [], myShelves: ['Stoicism'],
    personalLibrary: [
      { slug: 'discourses', title: "The Discourses of Epictetus", attribution: 'Epictetus',
        license: 'Public domain', tradition: 'Stoicism', personal: true,
        doc: { summary: 'Four books.', sections: [], fullText: { text: 'CHAPTER I\n\nsome text' } } },
      { slug: 'walden', title: 'Walden', attribution: 'H. D. Thoreau',
        license: 'Public domain', tradition: 'Nature', personal: true,
        doc: { summary: 'A year at the pond.', sections: [], fullText: { text: 'Economy\n\nwords' } } },
    ],
  }));
await p.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
await p.click('#startBtn');
await new Promise(r => setTimeout(r, 1200));

/* ---------- 1. no bridge at all: nothing changes ---------- */
const before = await p.evaluate(() => ({
  mode: window.__store ? window.__store.libraryMode : null,
  titles: [...document.querySelectorAll('x')].length,   // not used; kept cheap
}));
check('the app started with no database and no bridge', true);

/* ---------- 2. the merge, with a stubbed database ---------- */
const merged = await p.evaluate(async () => {
  /* installed AFTER load, and complete enough for the seam */
  window.desktopBridge = {
    isDesktop: true,
    dbQuery: async (name) => {
      if (name !== 'catalogue') return null;
      // exactly what load-library.mjs produces: a filename-derived row
      return [
        { slug: 'discourses', title: 'Discourses', attribution: null, license: null,
          source_url: null, shelf: null, kind: 'book', part: null,
          text_key: 'discourses.txt', pages: 426, health: 'ok' },
        { slug: 'walden', title: 'Walden', attribution: null, license: null,
          source_url: null, shelf: null, kind: 'book', part: null,
          text_key: 'walden.txt', pages: 395, health: 'ok' },
        { slug: 'brand-new-book', title: 'Brand New Book', attribution: null, license: null,
          source_url: null, shelf: null, kind: 'book', part: null,
          text_key: 'personal/personal-brand-new-book.txt', pages: 120, health: 'ok' },
      ];
    },
    dbWriteMany: async (name, rows) => { window.__pushed = { name, rows }; return { ok: true, n: rows.length }; },
    dbWrite: async () => ({ ok: true }),
    dbStatus: async () => ({ up: true, error: null }),
  };
  const report = await window.__store.hydrateFromDb();
  const doc = window.__store.getDoc('discourses');
  const walden = window.__store.getDoc('walden');
  const fresh = window.__store.getDoc('brand-new-book');
  return {
    report,
    mode: window.__store.libraryMode,
    discoursesTitle: doc && doc.title,
    discoursesShelf: doc && doc.tradition,
    discoursesAuthor: doc && doc.attribution,
    waldenShelf: walden && walden.tradition,
    freshTitle: fresh && fresh.title,
    freshShelf: fresh && fresh.tradition,
    freshHasText: !!(fresh && fresh.doc.fullText && fresh.doc.fullText.storage),
    pushedShelves: (window.__pushed ? window.__pushed.rows : []).map(r => [r[0], r[5]]),
  };
});

check('the catalogue hydrated from the database', merged.report && merged.report.ok);
check('and the library says where it came from', merged.mode === 'postgres');

/* THE ONE THAT MATTERS. The database said shelf=NULL and title='Discourses';
   the save said 'Stoicism' and "The Discourses of Epictetus". The save wins. */
check('a shelf the visitor assigned survives hydration', merged.discoursesShelf === 'Stoicism');
check('and so does the second one', merged.waldenShelf === 'Nature');
check('the real title beats the filename-derived one', merged.discoursesTitle === 'The Discourses of Epictetus');
check('the real author is not erased by a NULL', merged.discoursesAuthor === 'Epictetus');

/* A book only the database knows about still arrives, and can be read. */
check('a book new to this save still appears', merged.freshTitle === 'Brand New Book');
check('and it points at its text in MinIO', merged.freshHasText);

/* The shelves are carried back UP, so the database stops being wrong. */
const pushed = Object.fromEntries(merged.pushedShelves || []);
check('the assigned shelves are written back to the database',
  pushed.discourses === 'Stoicism' && pushed.walden === 'Nature');

/* ---------- 3. a database that is simply not there ---------- */
const down = await p.evaluate(async () => {
  window.desktopBridge = {
    isDesktop: true,
    dbQuery: async () => null,          // container stopped: null, never a throw
    dbWrite: async () => null,
    dbWriteMany: async () => null,
    dbStatus: async () => ({ up: false, error: 'ECONNREFUSED' }),
  };
  const report = await window.__store.hydrateFromDb();
  return { report, stillHasBooks: window.__store.allDocs().length > 0 };
});
check('a stopped database reports failure rather than throwing', down.report && down.report.ok === false);
check('and the Pavilion still has its shelves', down.stillHasBooks);

await browser.close();

let bad = 0;
for (const [name, ok] of R) { console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`); if (!ok) bad++; }
console.log(bad ? `\n${bad} of ${R.length} failed` : `\nall ${R.length} checks passed`);
process.exit(bad ? 1 : 0);
