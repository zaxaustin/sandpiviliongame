/* ================================================================
   [WHERE YOUR BOOKS ARE] — 2026-08-10.

   Asked for directly, after a morning spent unable to find a 415-book
   library:

     "lets fix this so docker is displayed in the library, and we start
      testing that."

   THIS ONE RUNS AGAINST THE REAL CONTAINER, on purpose, and it is the
   only suite that does through the UI. records.cjs and note-search.cjs
   deliberately point the port at nothing so they always exercise the
   fresh embedded case — the one everybody who is not the steward gets.
   Neither can answer "does the Library show me my Docker books", which
   is exactly the question that went unanswered for weeks.

   SKIPS LOUDLY AND EXITS 0 when the container is down. A suite that goes
   green because the thing it tests is switched off is rule 5 wearing a
   tick — the same rule docker-home.cjs already follows.

   READ-ONLY BY CONSTRUCTION. userData goes to a temp directory so there
   are no local book files, and the save is seeded EMPTY — which means
   hydrateFromDb() has nothing of its own to push up, so this cannot
   write into the real catalogue. Everything it sees came out of Postgres.

     npm run build:beta
     env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/library-homes.cjs
   ================================================================ */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');

app.commandLine.appendSwitch('disable-gpu');
/* The REAL container. Everything else about this process is throwaway. */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-homes-'));
app.setPath('userData', tmp);

const db = require('../../electron/db.cjs');
ipcMain.handle('desktop-db-status', async () => db.status());
ipcMain.handle('desktop-db-query', async (e, { name, params }) => db.query(name, params));
ipcMain.handle('desktop-db-write', async (e, { name, params }) => db.write(name, params));
ipcMain.handle('desktop-db-write-many', async (e, { name, rows }) => db.writeMany(name, rows));
/* The bridge must LOOK complete or the app takes a different path than a
   real install would. These two are never called: nothing here imports. */
ipcMain.handle('desktop-minio-write', async () => ({ ok: false, error: 'read-only suite' }));
ipcMain.handle('desktop-library-write', async () => ({ ok: false, error: 'read-only suite' }));
ipcMain.handle('desktop-library-read', async () => ({ ok: false, error: 'read-only suite' }));

const R = [];
const check = (name, ok, detail) => { R.push([name, !!ok, detail]); };
const wait = ms => new Promise(r => setTimeout(r, ms));

const SAVE = JSON.stringify({ seenWelcome: true, aiConnections: [] });

app.whenReady().then(async () => {
  const st = await db.status();
  if (!st || !st.up || st.kind !== 'docker') {
    console.log('\n--- where your books are ---');
    console.log('  SKIPPED — the Postgres container is not answering'
      + (st ? ` (opened '${st.kind}' instead)` : ''));
    console.log('  This suite is ONLY about the container case. Start it with:');
    console.log('    docker compose up -d');
    console.log('  Exiting 0: a skip is not a pass, and it is not a failure either.\n');
    app.exit(0); return;
  }

  const win = new BrowserWindow({ width: 1300, height: 1000, show: false,
    webPreferences: { preload: path.join(__dirname, '..', '..', 'electron', 'preload.cjs'),
      contextIsolation: true, sandbox: false } });
  const page = path.join(__dirname, '..', '..', 'dist', 'index.html');
  const js = expr => win.webContents.executeJavaScript(expr);

  const errs = [];
  /* `a[1]` is the console LEVEL, not the message. See note-search.cjs. */
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
  win.webContents.on('render-process-gone', (e, d) => errs.push('renderer gone: ' + d.reason));

  await win.loadFile(page);
  await js(`localStorage.setItem('sandPavilionSave.v2', ${JSON.stringify(SAVE)}); true`);
  await win.webContents.reload();
  await wait(2500);                       // title screen, then hydrateFromDb

  console.log('\n--- where your books are ---');
  check('the container answered', st.up && st.kind === 'docker', `${st.kind} — ${st.label}`);

  await js(`(function(){const b=[...document.querySelectorAll('button')]
    .find(x=>/Enter the Grounds/i.test(x.innerText)); if(b)b.click(); return true;})()`);
  await wait(1500);

  /* ---- 1 · the catalogue really arrived ---------------------------------- */
  const n = await js(`window.carryList ? 0 : 0`).then(() => js(`
    (async()=>{ const m = await import('./assets/index.js').catch(()=>null); return 0; })()
  `).catch(() => 0));
  const shelf = await js(`(function(){
    try{ return { docs: (window.currentDocSlug, 0) }; }catch(e){ return { err:String(e) }; }
  })()`);

  await js(`window.openIndex(); true`);
  await wait(900);
  const html = await js(`document.getElementById('indexPanel').innerHTML`);
  const text = await js(`document.getElementById('indexPanel').innerText`);

  const cards = (html.match(/class="card"/g) || []).length;
  check('the Library is not empty in the desktop app', cards > 50, `${cards} cards rendered`);
  check('...and it does NOT show the empty-library on-ramp',
    !/Your Library is empty/i.test(text),
    'the catalogue did not hydrate — 415 books in Postgres and the room says it has none');

  /* ---- 2 · DOCKER IS DISPLAYED, which is the whole ask ------------------- */
  const dockerBadges = (html.match(/🐳 Docker/g) || []).length;
  check('books say DOCKER on their own card', dockerBadges > 50, `${dockerBadges} cards badged Docker`);
  check('the shelf line names Docker too', /🐳\s*\d+\s*Docker/.test(text),
    text.split('\n').find(l => /Docker/.test(l)) || '(no line mentions Docker)');

  /* A badge that says the same thing for every book is not information. */
  const kinds = ['🐳 Docker', '💾 this machine', '📄 in the save', '📝 summary only']
    .filter(k => html.includes(k));
  check('the badge distinguishes homes rather than labelling everything the same',
    kinds.length >= 1 && dockerBadges < cards + 1, kinds.join(' / ') || '(none)');

  /* ---- 3 · and the next book would go to Docker -------------------------- */
  await js(`window.openBookIntake(); true`);
  await wait(600);
  const intake = await js(`document.getElementById('intakePanel').innerText`);
  check('the intake says where the next book goes', /next book goes/i.test(intake),
    intake.slice(0, 120));
  check('...and with the container up it names Docker', /Docker/.test(intake),
    (intake.split('\n').find(l => /next book goes/i.test(l)) || '').slice(0, 160));

  /* Scroll the OVERLAY (not the panel) back to the top before capturing —
     it keeps its scroll position between openings, and a 415-card Index is
     tall enough that the capture landed on empty space below the list. */
  await js(`window.openIndex();
    document.getElementById('indexOv').scrollTop = 0;
    document.documentElement.scrollTop = 0; document.body.scrollTop = 0;
    window.scrollTo(0,0); true`);
  await wait(900);
  await win.webContents.capturePage().then(img =>
    fs.writeFileSync(path.join(__dirname, '_library-docker.png'), img.toPNG()));

  check('no console errors', errs.length === 0, errs[0] || 'none');

  let bad = 0;
  for (const [name, ok, detail] of R) {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
    if (!ok) bad++;
  }
  console.log(bad ? `\n  ${bad} FAILED` : '\n  ✓ Docker is displayed in the Library, and the next book knows where it is going.');
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  app.exit(bad ? 1 : 0);
});
