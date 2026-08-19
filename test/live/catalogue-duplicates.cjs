/* ================================================================
   [ONE ENTRY PER SLUG] — the book that was in the catalogue twice.

   Reported from real use 2026-08-18, with two screenshots: the Index
   listed "Drawing for Beginners" and "The Lost World" TWICE each, and
   said 431 personal books, while the sorter — which reads
   data.personalLibrary directly — said 367.

   THE CAUSE IS A ROUND TRIP THAT NOBODY CLOSED. hydrateFromDb() pushes
   the visitor's own books UP into Postgres (it has to: notes.slug is a
   foreign key into books) and pulls them back DOWN into libraryDocs on
   the next boot. mergedDocs() was `libraryDocs.concat(personalDocs())`
   with no dedupe — so every personal book that survived ONE RESTART was
   in the catalogue twice.

   ⚠ WHICH IS WHY THIS SUITE BOOTS THE APP TWICE. A single boot cannot
   see it: the push happens on boot 1 and the double only appears when
   boot 2 pulls it back. Any one-boot test passes against the bug.

   The same file also holds the second half of the report — "some books
   show in the Index and not on my shelf when I sort" — which is the
   removal ghost: a deleted book left its row in Postgres and came back.

   ISOLATED: userData is a temp directory, so this never touches the
   steward's real library or database.

     npm run build:beta
     env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/catalogue-duplicates.cjs
   ================================================================ */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');

app.commandLine.appendSwitch('disable-gpu');
process.env.POSTGRES_PORT = '5433';                      // never the container
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-dupes-'));
app.setPath('userData', tmp);

const db = require('../../electron/db.cjs');
ipcMain.handle('desktop-db-status', async () => db.status());
ipcMain.handle('desktop-db-query', async (e, { name, params }) => db.query(name, params));
ipcMain.handle('desktop-db-write', async (e, { name, params }) => db.write(name, params));
ipcMain.handle('desktop-db-write-many', async (e, { name, rows }) => db.writeMany(name, rows));
const LIB = path.join(tmp, 'library');
fs.mkdirSync(LIB, { recursive: true });
ipcMain.handle('desktop-library-write', async (e, { name, content }) => {
  await fs.promises.writeFile(path.join(LIB, name), content, 'utf-8'); return { ok: true }; });
ipcMain.handle('desktop-library-read', async (e, { name }) => {
  try { return { ok: true, text: await fs.promises.readFile(path.join(LIB, name), 'utf-8') }; }
  catch (err) { return { ok: false }; } });
ipcMain.handle('desktop-library-delete', async (e, { name }) => {
  try { await fs.promises.unlink(path.join(LIB, name)); } catch (err) {} return { ok: true }; });
ipcMain.handle('desktop-library-usage', async () => ({ ok: true, bytes: 0, free: 1e12 }));
for (const ch of ['desktop-minio-write', 'desktop-minio-delete']) {
  ipcMain.handle(ch, async () => ({ ok: false, error: 'no minio here' }));
}

const R = [];
const check = (name, ok, detail) => { R.push([name, !!ok, detail]); };
const wait = ms => new Promise(r => setTimeout(r, ms));

const book = (slug, title, shelf) => ({
  slug, title, tradition: shelf, personal: true, license: 'Personal — license not certified',
  attribution: 'Someone', added: '2026-08-18', category: 'personal',
  doc: { summary: title, sections: [], fullText: { text: 'the text of ' + title } },
});
const SAVE = JSON.stringify({
  seenWelcome: true, aiConnections: [],
  personalLibrary: [book('personal-drawing', 'Drawing for Beginners', 'Practice'),
                    book('personal-lost-world', 'The Lost World', 'Fiction')],
});

app.whenReady().then(async () => {
  const page = path.join(__dirname, '..', '..', 'dist', 'index.html');
  const errs = [];
  const msgOf = (a) => {
    const ev = a[0];
    if (ev && typeof ev === 'object' && typeof ev.message === 'string') return ev.message;
    for (let i = 1; i < a.length; i++) if (typeof a[i] === 'string') return a[i];
    return '';
  };

  /* ⚠ ONE WINDOW, RELOADED — not a new BrowserWindow per boot. Destroying a
     window while its loadFile is still settling gives ERR_FAILED (-2) and an
     unhandled rejection, which is a harness failure that looks exactly like a
     boot crash. A fresh loadFile IS a renderer restart for what is on trial
     here: libraryDocs is module state in the renderer and starts empty every
     time, while db.cjs lives in MAIN and keeps the database across all of them
     — which is precisely the asymmetry that produced the duplicate. */
  const win = new BrowserWindow({ width: 1200, height: 900, show: false,
    webPreferences: { preload: path.join(__dirname, '..', '..', 'electron', 'preload.cjs'),
      contextIsolation: true, sandbox: false } });
  win.webContents.on('console-message', (...a) => {
    const m = msgOf(a);
    if (m && /error|not defined|undefined is not|before initialization/i.test(m)) errs.push(m);
  });
  const boot = async () => {
    await win.loadFile(page);
    await wait(3500);   // PGlite cold open ~1.5s, then hydrate + push, all fire-and-forget
    return win;
  };

  /* Count what the visitor actually sees: rows in the Index, searched exactly
     the way the steward searched when he found this ("draw").

     ⚠ THE FIRST VERSION OF THIS WAS VACUOUS AND EVERY REMOVAL CHECK PASSED
     AGAINST IT. A card's title element is `📖 <title> <badge> <badge> NEW`, so
     matching /^Drawing for Beginners$/ against its textContent found NOTHING —
     which made "the removed book is gone" true before anything was removed.
     Badges are stripped and the leading icon trimmed; and countTitles asserts
     it can see the books at all before any absence is believed. */
  const indexTitles = async (term) => {
    await win.webContents.executeJavaScript('window.closeUI && window.closeUI(); window.openIndex(); true');
    await wait(400);
    await win.webContents.executeJavaScript(`window.setIndexSearch(${JSON.stringify(term)}); true`);
    await wait(900);
    return win.webContents.executeJavaScript(`(() => {
      return [...document.querySelectorAll('#indexPanel .card .t')].map(e => {
        const c = e.cloneNode(true);
        c.querySelectorAll('.badge').forEach(b => b.remove());
        return c.textContent.replace(/^[^A-Za-z0-9]+/, '').trim();
      });
    })()`);
  };
  const countIn = (list, title) => list.filter(t => t === title).length;

  // ---- boot 1: the save arrives, and hydrate pushes it up -------------------
  await boot();
  await win.webContents.executeJavaScript(
    `localStorage.setItem('sandPavilionSave.v2', ${JSON.stringify(SAVE)}); true`);
  await boot();          // first real boot WITH the books: pushes them into Postgres

  const rows1 = await db.query('catalogue');
  check('boot 1 pushed the two books up into the database',
    (rows1 || []).filter(r => /personal-/.test(r.slug)).length === 2,
    ((rows1 || []).filter(r => /personal-/.test(r.slug)).length) + ' rows');

  // ---- boot 2: hydrate pulls them back down. THIS is where the double was ---
  await boot();
  const drawTitles = await indexTitles('Drawing');
  const lostTitles = await indexTitles('Lost World');
  /* THE PRECONDITION, so no absence below can ever be believed for free */
  check('the Index can see the books at all (else every check below is vacuous)',
    drawTitles.length > 0 && lostTitles.length > 0,
    `draw rows=${drawTitles.length}, lost rows=${lostTitles.length}`);
  const nDraw = countIn(drawTitles, 'Drawing for Beginners');
  const nLost = countIn(lostTitles, 'The Lost World');
  check('★ after a RESTART the Index lists each book ONCE, not twice',
    nDraw === 1 && nLost === 1, `Drawing×${nDraw}, Lost World×${nLost}`);

  const total = await win.webContents.executeJavaScript(`(() => {
    const s = JSON.parse(localStorage.getItem('sandPavilionSave.v2'));
    return (s.personalLibrary || []).length;
  })()`);
  check('and the save still holds exactly the two it started with', total === 2, 'save=' + total);

  // ---- and removing one really removes it ---------------------------------
  await win.webContents.executeJavaScript(`window.confirm = () => true; true`);
  await win.webContents.executeJavaScript(`window.removePersonalBook('personal-drawing'); true`);
  await wait(1500);

  const afterDraw = await indexTitles('Drawing');
  const afterLost = await indexTitles('Lost World');
  check('a removed book leaves the Index immediately',
    countIn(afterDraw, 'Drawing for Beginners') === 0,
    afterDraw.join(', ') || 'gone');
  /* the control: the OTHER book must still be there, or "gone" only means the
     search broke */
  check('and the one you kept is still there',
    countIn(afterLost, 'The Lost World') === 1,
    'Lost World×' + countIn(afterLost, 'The Lost World'));

  const rows2 = await db.query('catalogue');
  check('★ and its DATABASE row is gone, so it cannot come back as a ghost',
    !(rows2 || []).some(r => r.slug === 'personal-drawing'),
    ((rows2 || []).filter(r => /personal-/.test(r.slug)).map(r => r.slug).join(', ')) || 'none left');

  // ---- the real proof of the ghost: boot again ----------------------------
  await boot();
  const finalDraw = await indexTitles('Drawing');
  const finalLost = await indexTitles('Lost World');
  check('★ AND IT IS STILL GONE AFTER A RESTART (the ghost is what was reported)',
    countIn(finalDraw, 'Drawing for Beginners') === 0, finalDraw.join(', ') || 'gone');
  check('while the kept book survived the restart, still exactly once',
    countIn(finalLost, 'The Lost World') === 1,
    'Lost World×' + countIn(finalLost, 'The Lost World'));

  check('no console errors', errs.length === 0, errs.slice(0, 2).join(' | ') || 'none');

  let bad = 0;
  for (const [n, ok, d] of R) {
    console.log((ok ? '  ok   ' : '  FAIL ') + n + (d ? '  — ' + d : ''));
    if (!ok) bad++;
  }
  console.log(bad ? `\n✗ ${bad} failure(s)\n` : '\n✓ one entry per slug, and a removal that sticks\n');
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
  app.exit(bad ? 1 : 0);
});
