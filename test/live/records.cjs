/* ================================================================
   [THE RECORDS HALL] — 2026-08-04.

   The room was a hardcoded five-entry array frozen at 2026-07-10 while
   `records`, `recordCounts` and `upsertRecord` sat in electron/db.cjs
   with nothing calling them. This proves the round trip:

     the save (read / hall / commons) -> gatherRecords() -> the records
       table -> back out through dbQuery('records') into the room

   IT MUST BE ELECTRON. A browser tab has no desktop bridge and therefore
   no database, so a browser suite can only prove the save half — which
   test/live/ already does. The half that was missing is this one.

   ISOLATED: userData goes to a temp directory and the container port
   points at nothing, so this always runs the FRESH EMBEDDED case and
   never writes test rows into the steward's real database.

     npm run build:beta
     env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/records.cjs
   ================================================================ */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');

app.commandLine.appendSwitch('disable-gpu');
process.env.POSTGRES_PORT = '5433';                       // no container here
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-records-'));
app.setPath('userData', tmp);

const db = require('../../electron/db.cjs');
ipcMain.handle('desktop-db-status', async () => db.status());
ipcMain.handle('desktop-db-query', async (e, { name, params }) => db.query(name, params));
ipcMain.handle('desktop-db-write', async (e, { name, params }) => db.write(name, params));
ipcMain.handle('desktop-db-write-many', async (e, { name, rows }) => db.writeMany(name, rows));

const R = [];
const check = (name, ok, detail) => { R.push([name, !!ok, detail]); };
const wait = ms => new Promise(r => setTimeout(r, ms));

const SAVE = JSON.stringify({
  seenWelcome: true, aiConnections: [],
  read: { dhammapada: '2026-07-20' },
  hall: {
    builds:        [{ id:'b1', title:'A one-button IR remote', created:'2026-08-02' },
                    { id:'b2', title:'Undated build that must be skipped' }],
    investigations:[{ id:'i1', claim:'Does the capacitor actually matter?', ts:'2026-07-30' }],
    experiments:   [],
  },
  commons: { published: [{ id:'p1', title:'A lesson on soldering', created:'2026-08-03' }], received: [], taken:{} },
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

  await win.loadFile(page);
  await js(`localStorage.setItem('sandPavilionSave.v2', ${JSON.stringify(SAVE)}); true`);
  await win.loadFile(page);      // the save must exist before the first boot
  await wait(600);

  const st = await db.status();
  check('it opened a database at all', st.up, `${st.kind} — ${st.label}`);
  check('and it is the embedded one, not the container', st.kind === 'embedded', st.kind);
  check('its schema applied cleanly', !st.schemaError, st.schemaError || 'no schemaError');

  // books must exist first: records.slug is a foreign key into books, so an
  // unseeded catalogue would take the whole write down (the note-search scar).
  await js(`window.__store.hydrateFromDb()`).catch(() => null);
  await wait(400);

  await js(`window.openRecordsHall(); true`);
  await wait(1200);                        // render, then the async sync+query

  const rows = await db.query('records', [400]);
  check('the records table has rows at all', rows && rows.length > 0,
    `${rows ? rows.length : 0} row(s)`);

  const byKind = {};
  for (const r of (rows || [])) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
  check('the visitor\'s READING was indexed', byKind.reading > 0, `${byKind.reading || 0}`);
  check('the BUILD was indexed', byKind.build > 0, `${byKind.build || 0}`);
  check('the INVESTIGATION was indexed', byKind.investigation > 0, `${byKind.investigation || 0}`);
  check('the PACKET was indexed', byKind.packet > 0, `${byKind.packet || 0}`);
  check('the Pavilion\'s own MILESTONES are indexed too', byKind.milestone > 0, `${byKind.milestone || 0}`);

  const undated = (rows || []).some(r => /must be skipped/i.test(r.title || ''));
  check('the UNDATED build never reached the index', !undated,
    'a record in the wrong year is a lie a note can cite');

  // every door stored in the database must be a real function in the app
  const openers = [...new Set((rows || []).map(r => r.opener).filter(Boolean))];
  const alive = await js(`(${JSON.stringify(openers)}).filter(n => typeof window[n] === 'function').length`);
  check('every opener stored in the DB is a live window function', alive === openers.length,
    `${alive}/${openers.length} — ${openers.join(', ')}`);

  const counts = await db.query('recordCounts');
  check('recordCounts answers for the room header', counts && counts.length > 0,
    `${counts ? counts.length : 0} kind(s)`);

  // the room itself, reading the database rather than an array
  const html = await js(`document.getElementById('recordsPanel').innerHTML`);
  check('the room shows the indexed work', /one-button IR remote/i.test(html));
  check('and does NOT claim to be unindexed here', !/Not indexed on this device/i.test(html),
    'that line is for a browser tab only');

  /* RUNNING IT TWICE MUST NOT DUPLICATE. upsertRecord is ON CONFLICT on
     source_key; if that ever regressed, a visitor's history would grow every
     time they opened the room. */
  await js(`window.closeUI(); window.openRecordsHall(); true`);
  await wait(1200);
  const again = await db.query('records', [400]);
  check('opening the room twice does not duplicate history',
    again && rows && again.length === rows.length,
    `${rows ? rows.length : 0} then ${again ? again.length : 0}`);

  check('no console errors', errs.length === 0, errs[0] || 'none');

  console.log('\n--- the Records Hall ---');
  let bad = 0;
  for (const [n, ok, d] of R) { if (!ok) bad++; console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); }
  console.log(bad ? `\n  ${bad} FAILED\n` : '\n  ✓ the Hall is an index over real work, not an array.\n');

  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* windows holds it */ }
  app.exit(bad ? 1 : 0);
});
