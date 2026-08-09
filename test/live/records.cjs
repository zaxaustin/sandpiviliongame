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
  /* A book the visitor actually has. Was the seed book `dhammapada`, deleted
     2026-08-10 — a reading record for a book that exists nowhere is a record
     pointing at nothing, which is what this file is against. */
  personalLibrary: [{ slug: 'personal-walden', title: 'Walden', tradition: 'Non-fiction',
    personal: true, license: 'Personal', attribution: 'Henry David Thoreau',
    doc: { summary: 'Two years beside a pond.', sections: [], fullText: { text: 'I went to the woods.' } } }],
  read: { 'personal-walden': '2026-07-20' },
  hall: {
    builds:        [{ id:'b1', title:'A one-button IR remote', created:'2026-08-02' },
                    { id:'b2', title:'Undated build that must be skipped' }],
    investigations:[{ id:'i1', claim:'Does the capacitor actually matter?', ts:'2026-07-30' }],
    experiments:   [],
  },
  commons: { published: [{ id:'p1', title:'A lesson on soldering', created:'2026-08-03' }], received: [], taken:{} },
  /* THREE DAILY TASKS, and only ONE of them is a day you worked (2026-08-10).
     The Records Hall excluded days entirely and said why: "a planner day
     exists as soon as it is opened, which is not the same as a day you
     worked." A FINISHED daily task is the thing that was missing, and the
     boundary is the whole feature — an index of real work that quietly
     counts the days you fell short is worse than one that lists no days. */
  dailyTasks: [
    { id:'d1', title:'Read the electricity fundamentals', taken:'2026-08-05', closed:true,
      source:{ kind:'free', ref:'', label:'Learning electronics' },
      steps:[{ text:'a', where:'note', ref:'', done:true },
             { text:'b', where:'world', ref:'', done:true }] },
    { id:'d2', title:'A day that got away', taken:'2026-08-06', closed:true,
      steps:[{ text:'a', where:'note', ref:'', done:true },
             { text:'b', where:'world', ref:'', done:false }] },
    { id:'d3', title:'Still going right now', taken:'2026-08-07', closed:false,
      steps:[{ text:'a', where:'note', ref:'', done:true }] },
  ],
});

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1200, height: 900, show: false,
    webPreferences: { preload: path.join(__dirname, '..', '..', 'electron', 'preload.cjs'),
      contextIsolation: true, sandbox: false } });
  const page = path.join(__dirname, '..', '..', 'dist', 'index.html');
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

  /* ---- A DAY YOU ACTUALLY WORKED, all the way into Postgres ----
     npm test holds the arithmetic. This is the half it cannot reach: that
     the row is really written, really dated by the day the work was DONE,
     and that the two days which are not work stayed out of the index. */
  const days = (rows || []).filter(r => r.kind === 'day');
  check('a FINISHED day reached the index', days.length === 1,
    `${days.length} day row(s) from three tasks — expected exactly the finished one`);
  if (days.length === 1) {
    /* NORMALISE THE WAY THE ROOM DOES. A Postgres DATE comes back as a JS
       Date at UTC midnight, and String()ing it renders in LOCAL time — so
       2026-08-05 reads as "Tue Aug 04 ... GMT-0400" and a correct row looks
       like an off-by-one-day bug. renderRecordsHall() already goes through
       .toISOString(), which is timezone-proof; the first version of this
       check did not, and reported the room wrong when the room was right. */
    const day = typeof days[0].happened === 'string'
      ? days[0].happened.slice(0, 10)
      : new Date(days[0].happened).toISOString().slice(0, 10);
    check('...dated the day the work was done, not the day it was closed out',
      day === '2026-08-05', day + '  (raw: ' + String(days[0].happened) + ')');
    check('...and it names what it was a slice of',
      /electronics/i.test(days[0].detail || ''), days[0].detail || '(no detail)');
  }
  check('a day with steps left undone is NOT filed as work',
    !(rows || []).some(r => /got away/i.test(r.title || '')),
    'an index of work done that includes the days you fell short is a guilt inventory');
  check("today's open board is NOT filed as history",
    !(rows || []).some(r => /Still going/i.test(r.title || '')),
    'the day is not over yet');

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
  check('the finished day shows up as a card in the room',
    /electricity fundamentals/i.test(html), 'indexed but never rendered is still invisible');
  /* `detail` was carried through gatherRecords from the first version and
     rendered by NOTHING — correct data with no consumer, which is the inert
     half of the same bug groundingFor() had for a day. */
  check('...and the card says what it was part of',
    /part of[\s\S]{0,40}electronics/i.test(html), 'the source line is not being rendered');
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
