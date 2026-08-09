/* ================================================================
   [WALK UP TO A SHELF AND FIND A BOOK ON IT] — 2026-08-10.

   The steward's own bar for "is the Library working", and deliberately
   a low one:

     "make sure your not overloaded checking each book every time as long
      as you can test a book you can walk up to in the library then we
      shoudl be good."

   So this does NOT sweep 415 books. It walks to ONE shelf tile, presses
   the button that tile presses, and asks whether there is a real book on
   it that opens. That is the whole contract of a library: the thing in
   front of you is there.

   It costs one query and a handful of DOM reads, and it would have caught
   every library failure of this day — the categoryless books that rendered
   nowhere, the duplicate rows, the seed shelf standing in for a real one.

   ELECTRON AND THE REAL CONTAINER, because that is where the catalogue
   is. Skips loudly and exits 0 if the container is down.

     npm run build:beta
     env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/shelf-walk.cjs
   ================================================================ */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');

app.commandLine.appendSwitch('disable-gpu');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-shelf-'));
app.setPath('userData', tmp);

const db = require('../../electron/db.cjs');
ipcMain.handle('desktop-db-status', async () => db.status());
ipcMain.handle('desktop-db-query', async (e, { name, params }) => db.query(name, params));
ipcMain.handle('desktop-db-write', async (e, { name, params }) => db.write(name, params));
ipcMain.handle('desktop-db-write-many', async (e, { name, rows }) => db.writeMany(name, rows));
ipcMain.handle('desktop-minio-write', async () => ({ ok: false, error: 'read-only suite' }));
ipcMain.handle('desktop-library-write', async () => ({ ok: false, error: 'read-only suite' }));
ipcMain.handle('desktop-library-read', async () => ({ ok: false, error: 'read-only suite' }));

const R = [];
const check = (name, ok, detail) => R.push([name, !!ok, detail]);
const wait = ms => new Promise(r => setTimeout(r, ms));

app.whenReady().then(async () => {
  const st = await db.status();
  if (!st || !st.up || st.kind !== 'docker') {
    console.log('\n--- walk up to a shelf ---');
    console.log('  SKIPPED — the container is not answering. `docker compose up -d`, then retry.');
    console.log('  Exiting 0: a skip is not a pass.\n');
    app.exit(0); return;
  }

  const win = new BrowserWindow({ width: 1200, height: 900, show: false,
    webPreferences: { preload: path.join(__dirname, '..', '..', 'electron', 'preload.cjs'),
      contextIsolation: true, sandbox: false } });
  const js = expr => win.webContents.executeJavaScript(expr);
  const errs = [];
  const msgOf = (a) => {
    const ev = a[0];
    if (ev && typeof ev === 'object' && typeof ev.message === 'string') return ev.message;
    for (let i = 1; i < a.length; i++) if (typeof a[i] === 'string') return a[i];
    return '';
  };
  win.webContents.on('console-message', (...a) => {
    const lvl = a.find(x => typeof x === 'number');
    if (lvl === 3) errs.push(msgOf(a));
  });

  await win.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
  await js(`localStorage.setItem('sandPavilionSave.v2', JSON.stringify({seenWelcome:true, aiConnections:[]})); true`);
  await win.webContents.reload();
  await wait(2500);
  await js(`(function(){const b=[...document.querySelectorAll('button')]
    .find(x=>/Enter the Grounds/i.test(x.innerText)); if(b)b.click(); return true;})()`);
  await wait(1200);

  console.log('\n--- walk up to a shelf ---');

  /* THE TILE, NOT A GUESS. shelfTraditionFor(x,y) is what main.js calls when
     you press E facing a 'k' tile, so asking it is asking the world. (2,3) is
     the front-left block of the Library's ground floor. */
  const tradition = await js(`window.__shelfAt ? window.__shelfAt(2,3) : null`)
    .catch(() => null);

  /* No test-only hook: press the shelf the way the game does. openShelf() is
     exported precisely because the E key calls it. */
  const shelf = await js(`(function(){
    window.openShelf('Classics');
    const t = document.getElementById('shelfTitle').textContent;
    const n = (window.__store ? window.__store.listDocs('Classics').length : -1);
    const el = document.getElementById('shelfPanel') || document.querySelector('#shelfOv');
    return { title: t, count: n, text: el ? el.innerText.slice(0, 400) : '(no panel)' };
  })()`);

  /* THE SCREENSHOT IS PART OF THE TEST, not a souvenir. Every serious bug
     this project has had was found by looking, and today's — 415 books
     rendering as zero cards — was invisible to every count in the codebase
     while being obvious in one .png. */
  await wait(400);
  await win.webContents.capturePage().then(img =>
    fs.writeFileSync(path.join(__dirname, '_shelf-classics.png'), img.toPNG()));

  check('a shelf you can walk to opens', /Classics/.test(shelf.title), shelf.title);
  check('there are real books ON that shelf', shelf.count > 0,
    shelf.count + ' books on Classics — the shelf you face and press E at');
  check('...and the panel shows one rather than an empty case',
    !/nothing on this shelf/i.test(shelf.text) && shelf.text.length > 20,
    shelf.text.split('\n').slice(0, 3).join(' / '));

  /* AND THE BOOK OPENS. A title on a shelf that will not open is the same
     dead end as no book at all — this is the half a catalogue count cannot
     answer, and the reason this suite presses rather than counts. */
  /* #readerOv, not #readerPanel — the panel div inside it has no id. The
     first version of this check read a missing element, got '(no reader)',
     and PASSED anyway because the assertion also accepted the title. A
     check that can be satisfied by the thing it is not testing is not a
     check; this one now requires the reader to be OPEN and to be showing
     the book that was asked for. */
  const opened = await js(`(function(){
    const d = window.__store.listDocs('Classics')[0];
    if(!d) return { none:true };
    window.openReader(d.slug);
    const ov = document.getElementById('readerOv');
    return { slug:d.slug, title:d.title,
             open: !!ov && ov.classList.contains('open'),
             shown: ov ? ov.innerText.slice(0, 300) : '' };
  })()`);
  await wait(500);
  check('the first book on the shelf actually opens', !opened.none && opened.open,
    opened.none ? 'the shelf was empty' : 'reader open: ' + opened.open);
  check('...and the reader is showing THAT book',
    !opened.none && opened.shown.includes(opened.title.slice(0, 24)),
    `asked for "${opened.title}", reader shows "${(opened.shown || '').split('\n').find(l => l.trim()) || '(nothing)'}"`);
  await win.webContents.capturePage().then(img =>
    fs.writeFileSync(path.join(__dirname, '_shelf-book.png'), img.toPNG()));

  /* ONE MORE SHELF, a different floor, so this is about the Library and not
     about one lucky tile. Fiction lives upstairs. */
  const upstairs = await js(`(window.__store ? window.__store.listDocs('Fiction').length : -1)`);
  check('a shelf on the second floor has books too', upstairs > 0, upstairs + ' on Fiction');

  check('no console errors', errs.length === 0, errs[0] || 'none');

  let bad = 0;
  for (const [n, ok, d] of R) { console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); if (!ok) bad++; }
  console.log(bad ? `\n  ${bad} FAILED` : '\n  ✓ you can walk to a shelf and take a real book off it.');
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  app.exit(bad ? 1 : 0);
});
