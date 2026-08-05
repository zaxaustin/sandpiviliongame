/* ================================================================
   [SEARCH EVERY NOTE YOU HAVE WRITTEN] — 2026-08-04.

   The one thing localStorage cannot do, and the whole reason there is a
   database at all. This proves the round trip end to end, in Electron,
   against a real Postgres:

     the save's six note stores -> gatherNotes() -> the notes table
       -> to_tsvector/GIN -> back into the panel as extra matches

   IT MUST BE ELECTRON. The other live suites drive a browser at the preview
   server, where there is no desktop bridge and therefore no database — they
   can only stub it. A stub would prove the wiring and nothing about whether
   Postgres actually stems.

   ISOLATED ON PURPOSE. userData is redirected to a temp directory and the
   container port is pointed at nothing, so this always runs against a fresh
   EMBEDDED database and never writes test notes into the steward's real one.
   That also makes it the first-run case, which is the common case for
   everybody who is not the steward.

     npm run build:beta
     env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/note-search.cjs

   Exit 0 = search works.
   ================================================================ */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');

app.commandLine.appendSwitch('disable-gpu');
process.env.POSTGRES_PORT = '5433';                       // no container here
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-notesearch-'));
app.setPath('userData', tmp);

const db = require('../../electron/db.cjs');
ipcMain.handle('desktop-db-status', async () => db.status());
ipcMain.handle('desktop-db-query', async (e, { name, params }) => db.query(name, params));
ipcMain.handle('desktop-db-write', async (e, { name, params }) => db.write(name, params));
ipcMain.handle('desktop-db-write-many', async (e, { name, rows }) => db.writeMany(name, rows));

const R = [];
const check = (name, ok, detail) => { R.push([name, !!ok, detail]); };
const wait = ms => new Promise(r => setTimeout(r, ms));

/* A save with notes in three different stores, so the union really is
   exercised. The wording is chosen so the search term NEVER appears
   literally — "walking" must find "walked", or the index did nothing that
   a substring match could not already do. */
const SAVE = JSON.stringify({
  seenWelcome: true, aiConnections: [],
  notes: [
    { id: 'n1', title: 'On the path', body: 'He walked the whole path slowly, and it taught him patience.',
      created: '2026-08-01', updated: '2026-08-01' },
    { id: 'n2', title: 'Unrelated', body: 'A grocery list: rice, salt, lentils.',
      created: '2026-08-01', updated: '2026-08-01' },
  ],
  bookNotes: {
    dhammapada: [ { ts: '2026-08-02', text: 'The teachings here repay a second reading.', ch: 1, page: 3 } ],
  },
  chatNotes: { quill: 'She recommended beginning with the shorter discourses.' },
});

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1200, height: 900, show: false,
    webPreferences: { preload: path.join(__dirname, '..', '..', 'electron', 'preload.cjs'),
      contextIsolation: true, sandbox: false } });
  const page = path.join(__dirname, '..', '..', 'dist', 'index.html');
  const js = expr => win.webContents.executeJavaScript(expr);

  const errs = [];
  win.webContents.on('console-message', (...a) => {
    const m = a.length > 1 ? a[1] : (a[0] && a[0].message);
    if (typeof m === 'string' && /error|not defined|undefined is not/i.test(m)) errs.push(m);
  });

  // Seed the save, THEN reload — the save must exist before the first boot,
  // and setting it after load would be read by nothing.
  await win.loadFile(page);
  await js(`localStorage.setItem('sandPavilionSave.v2', ${JSON.stringify(SAVE)}); true`);
  await win.loadFile(page);
  await wait(600);

  const st = await db.status();
  check('it opened a database at all', st.up, `${st.kind} — ${st.label}`);
  check('and it is the embedded one, not the container', st.kind === 'embedded', st.kind);

  // The books table must know the seed, or a note on a seed book takes the
  // whole indexing transaction down with it (notes.slug is a foreign key).
  await js(`window.__store.hydrateFromDb()`).catch(() => null);
  await wait(400);
  const books = await db.query('catalogue');
  check('hydration seeded an EMPTY database', books && books.length > 0, `${books ? books.length : 0} books`);
  check('including the seed shelf, so book notes have somewhere to point',
    !!(books || []).find(b => b.slug === 'dhammapada'), 'dhammapada present');

  await js(`window.openNotesLog(); true`);
  await wait(300);
  const total = await js(`document.querySelectorAll('#notesLogList .card, #notesLogList [onclick*="toggleNotesLogItem"]').length`);
  check('the Notes Log lists the save\'s notes', total >= 3, `${total} rows`);

  // ---- the actual question ----
  await js(`window.setNotesLogSearch('walking'); true`);
  await wait(1800);                       // debounce + sync + query

  const rows = await db.query('searchNotes', ['walking', 20]);
  check('the index itself answers a stemmed query', rows && rows.length > 0,
    `${rows ? rows.length : 0} row(s) for "walking"`);

  const html = await js(`document.getElementById('notesLogList').innerHTML`);
  check('"walking" FINDS "walked" in the panel', /walked the whole path/i.test(html),
    'the note is on screen');
  check('and it says so, rather than doing it invisibly', /found by meaning/i.test(html));
  check('the grocery list did NOT come along', !/lentils/i.test(html));

  /* Deletion must not leave a ghost in the index — a hit you cannot open is
     the silent wrong answer.

     DELETED THE WAY A PERSON DELETES IT. The first version of this check
     called Store.save() with the note removed, which writes localStorage but
     never touches the in-memory `data` the panel reads — so nothing was
     deleted, gatherNotes() still returned it, and the check failed against a
     prune that worked. Going through the app's own handler is both more
     honest and the only version that tests anything. */
  await js(`window.confirm = () => true; window.deleteNoteFromLog('n1'); true`);
  await js(`window.setNotesLogSearch('walking'); true`);
  await wait(1800);
  const after = await db.query('searchNotes', ['walking', 20]);
  check('a deleted note leaves the index too', !after || after.length === 0,
    `${after ? after.length : 0} row(s) remain`);

  check('no console errors', errs.length === 0, errs[0] || 'none');

  console.log('\n--- search every note you have written ---');
  let bad = 0;
  for (const [n, ok, d] of R) { if (!ok) bad++; console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); }
  console.log(bad ? `\n  ${bad} FAILED\n` : '\n  ✓ the index is real and the panel uses it.\n');

  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* windows holds it */ }
  app.exit(bad ? 1 : 0);
});
