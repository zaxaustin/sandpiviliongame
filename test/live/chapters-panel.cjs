/* ================================================================
   [BOOKS NOT DIVIDED YET] — the first panel built on the chapter
   tables, 2026-08-07.

   Those tables were in the schema from the start and written by
   NOTHING in the app until today — only the MinIO loader. So this
   question could not be asked, and a panel built on the old
   v_needs_chapters would have said "0 books need chapters" while
   dozens did, because the view gated on a MinIO object key.

   Electron, not a browser, and that is the whole point: the answer
   IS the database. A browser tab has none and the panel must say so
   rather than show an empty list — checked here too, because "no
   database" and "nothing to do" look identical on screen and mean
   opposite things.

   Runs against whichever home answers. On the steward's machine that
   is Docker with a real 296-book library; everywhere else it is the
   fresh embedded one, where the honest answer is "open a book and
   this fills itself".

     npm run build:beta
     env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/chapters-panel.cjs
   ================================================================ */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const db = require('../../electron/db.cjs');
ipcMain.handle('desktop-db-status', async () => db.status());
ipcMain.handle('desktop-db-query', async (e, { name, params }) => db.query(name, params));
ipcMain.handle('desktop-db-write', async (e, { name, params }) => db.write(name, params));
ipcMain.handle('desktop-db-write-many', async (e, { name, rows }) => db.writeMany(name, rows));

const R = [];
const check = (n, ok, d) => R.push([n, !!ok, d || '']);
const wait = ms => new Promise(r => setTimeout(r, ms));

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1100, height: 1000, show: false,
    webPreferences: { preload: path.join(__dirname, '..', '..', 'electron', 'preload.cjs'),
      contextIsolation: true, sandbox: false } });
  const js = expr => win.webContents.executeJavaScript(expr);
  const errs = [];
  /* `a[1]` is the console LEVEL, not the message — this capture was dead and
     "no console errors" passed no matter what the page logged. Found and
     explained in full in test/live/note-search.cjs, 2026-08-08. */
  const msgOf = (a) => {
    const ev = a[0];
    if (ev && typeof ev === 'object' && typeof ev.message === 'string') return ev.message;
    for (let i = 1; i < a.length; i++) if (typeof a[i] === 'string') return a[i];
    return '';
  };
  win.webContents.on('console-message', (...a) => {
    const m = msgOf(a);
    if (m && /error|not defined|undefined is not|before initialization/i.test(m)) errs.push(m);
  });

  await win.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
  await wait(1200);
  await js(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/Enter the Grounds/i.test(x.innerText)); if(b) b.click();})()`);
  await wait(1500);

  const home = await js(`window.__store.dbStatus().then(s=>s&&s.kind)`);
  check('the desktop app has a database at all', !!home, 'home is ' + home);

  // THE DOOR. A panel with no way in is unbuilt — the Lab's lesson.
  const door = await js(`(()=>{ window.openMyLibrary();
    const el=document.getElementById('myLibPanel');
    const b=[...(el?el.querySelectorAll('button'):[])].find(x=>/not divided yet/i.test(x.innerText));
    return !!b; })()`);
  check('there is a door to it where the books already are', door);

  const out = await js(`(async()=>{ await window.openNeedsChapters(); await new Promise(r=>setTimeout(r,1200));
    const ov=document.getElementById('chaptersOv');
    const el=document.getElementById('chaptersPanel');
    return { open: !!ov && ov.classList.contains('open'),
             text: el?el.innerText:'', rows: el?el.querySelectorAll('.card').length:0 }; })()`);

  check('the panel opens', out.open);
  check('it never claims a browser answer on the desktop',
        !/browser tab has none/i.test(out.text), JSON.stringify(out.text.slice(0, 90)));

  /* IT MUST SAY WHAT IT KNOWS ABOUT. This only learns from books the visitor
     has actually opened, and presenting that as "your library" would be the
     confident wrong answer the whole feature was rebuilt to avoid. */
  check('it says it only knows books you have opened',
        /only knows books you have actually opened/i.test(out.text),
        JSON.stringify(out.text.slice(0, 200)));

  /* AND NO BULK SWEEP. The steward: "one step at a time is fine lets a user
     feel like he is contributing." A count that climbs because you opened a
     book is yours in a way a sweep never is. */
  const sweep = await js(`(()=>{const el=document.getElementById('chaptersPanel');
    return [...(el?el.querySelectorAll('button'):[])].map(b=>b.innerText).join(' | ');})()`);
  check('there is NO "scan everything" button', !/scan|sweep|all books/i.test(sweep),
        JSON.stringify(sweep.slice(0, 120)));

  // every row is one press to the book itself
  if (out.rows > 0) {
    const doors = await js(`(()=>{const el=document.getElementById('chaptersPanel');
      const cards=[...el.querySelectorAll('.card')];
      return cards.filter(c=>/openReader/.test(c.getAttribute('onclick')||'')).length;})()`);
    check('every book listed is one press from being opened', doors === out.rows,
          doors + ' of ' + out.rows);
  } else {
    check('with nothing listed it still says something useful',
          /fills itself|Nothing to do here|has chapters/i.test(out.text),
          JSON.stringify(out.text.slice(-160)));
  }

  check('no console errors', errs.length === 0, errs.slice(0, 2).join(' | '));

  const img = await win.webContents.capturePage();
  require('fs').writeFileSync(path.join(__dirname, '_chapters-desktop.png'), img.toPNG());

  console.log('  home: ' + home + ' · books listed: ' + out.rows);
  console.log('  ---\n  ' + out.text.split('\n').slice(0, 6).join('\n  '));
  let bad = 0;
  for (const [n, ok, d] of R) { if (!ok) bad++; console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (d ? '  — ' + d : '')); }
  console.log(bad ? `\n  ✗ ${bad} failed` : '\n  ✓ the panel answers a question that could not be asked yesterday.');
  app.exit(bad ? 1 : 0);
});
