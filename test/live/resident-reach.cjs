/* ================================================================
   [I CAN SEE IT AND I CANNOT READ IT] — 2026-08-10.

     "we should be able to have the resedents be like i dont have acces
      to this can you please put the book in your back pack and add it
      to the pavilion. kinda thing i know this but for a new user we
      gotta hold there hand"

   IT MUST BE ELECTRON, and that is correction 2 of the plan rather
   than caution. shelfLookup() returns null with no desktop bridge, so
   two of the three gap states would test NOTHING in a browser — the
   suite would go green having exercised the one state a browser can
   reach. That is a vacuous pass with a tick on it.

   Isolated the same way note-search.cjs is: userData redirected to a
   temp directory and the container port pointed at nothing, so this is
   always the FRESH EMBEDDED case — the one everybody who is not the
   steward gets.

   REAL BOOKS, NEVER A SEED. SEED_LIBRARY is [] and a tidy stub is
   exactly what lies (rule 1). The shelf below is built from real texts
   in library-sources/.

     npm run build:beta
     env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/resident-reach.cjs

   Exit 0 = a resident can say what it cannot reach, and the visitor
   has a button that fixes it.
   ================================================================ */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');

app.commandLine.appendSwitch('disable-gpu');
process.env.POSTGRES_PORT = '5433';                       // no container here
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-reach-'));
app.setPath('userData', tmp);

const db = require('../../electron/db.cjs');
ipcMain.handle('desktop-db-status', async () => db.status());
ipcMain.handle('desktop-db-query', async (e, { name, params }) => db.query(name, params));
ipcMain.handle('desktop-db-write', async (e, { name, params }) => db.write(name, params));
ipcMain.handle('desktop-db-write-many', async (e, { name, rows }) => db.writeMany(name, rows));

const R = [];
const check = (name, ok, detail) => { R.push([name, !!ok, detail]); };
const wait = ms => new Promise(r => setTimeout(r, ms));

const srcDir = path.join(__dirname, '..', '..', 'library-sources');
const textOf = (f) => {
  try { return fs.readFileSync(path.join(srcDir, f), 'utf8').slice(0, 200000); }
  catch (e) { return null; }
};
const book = (slug, title, who, file) => {
  const text = textOf(file);
  return {
    slug, title, tradition: 'Non-fiction', personal: true,
    license: 'Public domain', attribution: who,
    doc: { summary: 'A real book on this shelf.', sections: [],
           fullText: { license: 'Public domain', text: text || '' } },
  };
};

const SHELF = [
  book('personal-walden', 'Walden', 'Henry David Thoreau', 'walden.txt'),
  book('personal-tao', 'The Tao Teh King', 'Laozi',
       'the-tao-teh-king-or-the-tao-and-its-characteristics.txt'),
];
const withBooks = JSON.stringify({ seenWelcome: true, aiConnections: [], personalLibrary: SHELF });
const emptyShelf = JSON.stringify({ seenWelcome: true, aiConnections: [], personalLibrary: [] });

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1200, height: 1000, show: false,
    webPreferences: { preload: path.join(__dirname, '..', '..', 'electron', 'preload.cjs'),
      contextIsolation: true, sandbox: false } });
  const page = path.join(__dirname, '..', '..', 'dist', 'index.html');
  const js = expr => win.webContents.executeJavaScript(expr);

  /* Expected: no AI is connected, so every turn ends with the model failing and
     sendChatMessage logging "[chat] <agent> turn failed". Separated rather than
     filtered, so that the capture is provably alive — see note-search.cjs. */
  const errs = [], chatFails = [];
  const msgOf = (a) => {
    const ev = a[0];
    if (ev && typeof ev === 'object' && typeof ev.message === 'string') return ev.message;
    for (let i = 1; i < a.length; i++) if (typeof a[i] === 'string') return a[i];
    return '';
  };
  win.webContents.on('console-message', (...a) => {
    const m = msgOf(a);
    if (!m) return;
    if (/\[chat\] \w+ turn failed/.test(m)) { chatFails.push(m); return; }
    if (/error|not defined|undefined is not|before initialization/i.test(m)) errs.push(m);
  });

  /* THE EMPTY CASE RUNS FIRST, and the ordering is load-bearing rather than
     tidy. userData is one temp directory for the whole run, and main.js
     hydrates from the database on EVERY boot — so once the two real books have
     been shelved, no later boot can produce an empty shelf no matter what the
     save says. Booting empty-first is the only way this suite tests what a
     brand-new install actually hits. (Found by the assertion below reporting
     "4 books still on the shelf" — a check that refuses to run against the
     wrong fixture is worth more than the check itself.) */
  const boot = async (save) => {
    await win.loadFile(page);
    await js(`localStorage.setItem('sandPavilionSave.v2', ${JSON.stringify(save)}); true`);
    await win.loadFile(page);
    await wait(900);
    await js(`(function(){var b=[...document.querySelectorAll('button')]
        .find(x=>/Enter the Grounds/i.test(x.textContent)); if(b) b.click();})()`);
    await wait(600);
    await js(`window.__store.hydrateFromDb()`).catch(() => null);
    await wait(700);
  };
  const ask = async (agent, q) => {
    await js(`window.closeUI(); window.talkTo('${agent}'); true`).catch(() => {});
    await wait(250);
    await js(`(function(){var el=document.getElementById('chatInput');
              if(el){ el.value=${JSON.stringify(q)}; window.sendCurrentChatMessage(); }})()`);
    await wait(1600);
  };
  const prompt = (agent) => js(`window.previewPrompt('${agent}')`);
  const receipts = () => js(`(function(){var el=document.getElementById('chatQuickActions');
      return el ? el.innerHTML : '';})()`);

  /* ---- GAP 3 FIRST: the empty shelf, which is what a NEW INSTALL hits ---- */
  await boot(emptyShelf);
  const st = await db.status();
  check('a database opened', st.up, `${st.kind} — ${st.label}`);
  check('...and it is the fresh EMBEDDED one', st.kind === 'embedded', st.kind);
  const shelfCount = await js(`window.__store.allDocs().length`);
  check('the empty case really is empty (or everything below tests nothing)',
    shelfCount === 0, `${shelfCount} books still on the shelf`);

  await ask('quill', 'what do you have about walking');
  const p4 = await prompt('quill');
  check('AN EMPTY LIBRARY IS ITS OWN ANSWER',
    /THEIR LIBRARY IS EMPTY/.test(p4),
    'a brand-new visitor is told a title is missing, which describes their whole Library as a miss');
  check('...and never "that title is not on these shelves"',
    !/WHAT THEY ASKED FOR IS NOT ON THESE SHELVES/.test(p4), 'both states fired at once');
  const r4 = await receipts();
  check('...with the way to fix it',
    /openBookIntake\(\)/.test(r4), 'no “Bring a book in” button on an empty shelf');

  // ---------------------------------------------------------------
  await boot(withBooks);
  const cat = await db.query('catalogue');
  check('the real shelf hydrated into it', (cat || []).length >= 2, `${(cat || []).length} books`);

  /* ---- GAP 1: shelved, not carried ---- */
  await ask('quill', 'what does walden say about solitude');
  const p1 = await prompt('quill');
  check('THE RESIDENT IS TOLD IT CANNOT READ WHAT IT FOUND',
    /YOU CAN SEE THESE ON THE SHELF AND YOU CANNOT READ THEM/.test(p1),
    'the reach gap never reached the prompt — a resident would answer from the title');
  check('...and the block is a SITUATION, not a line of dialogue to recite',
    !/^\s*"/.test(p1.slice(p1.indexOf('YOU CAN SEE THESE'), p1.indexOf('YOU CAN SEE THESE') + 200)),
    'phrased as dialogue, which gets delivered as dialogue');
  const r1 = await receipts();
  check('the visitor gets a REAL BUTTON, not just a suggestion',
    /carryFromChat\(&#039;personal-walden&#039;\)|carryFromChat\('personal-walden'\)/.test(r1),
    'no 🎒 button for the uncarried hit — the resident moved the dead end instead of removing it');
  check('...and the button is named for the book',
    /Walden/.test(r1), 'the button does not say which book it carries');

  /* ---- PRESS IT. This is the whole feature. ---- */
  await js(`window.carryFromChat('personal-walden')`);
  await wait(400);
  const carried = await js(`JSON.stringify(window.carryList())`);
  check('*** PRESSING IT ACTUALLY CARRIES THE BOOK ***',
    /personal-walden/.test(carried), carried);

  /* ---- and the gap is GONE next ask, not repeated ---- */
  await ask('quill', 'what does walden say about solitude');
  const p2 = await prompt('quill');
  check('*** THE GAP IS CLOSED ON THE NEXT ASK ***',
    !/YOU CAN SEE THESE ON THE SHELF AND YOU CANNOT READ THEM/.test(p2),
    'the resident STILL asks them to carry a book that is already in the bag');
  check('...and now it is handed the real passages instead',
    /PASSAGES FROM THE BOOK ITSELF/.test(p2),
    'carrying it bought nothing — the point of the button is what comes after');
  check('...with page numbers the reader agrees with',
    /\[page \d+\]/.test(p2), 'no page labels, so nothing can be checked');
  const r2 = await receipts();
  check('the receipt names the pages that were read',
    /Read \d+ passage/.test(r2), 'the pages read are not reported to the visitor');

  /* ---- GAP 2: a real miss ---- */
  await ask('quill', 'do you have anything by hildegard of bingen');
  const p3 = await prompt('quill');
  check('a real miss offers the two real doors',
    /WHAT THEY ASKED FOR IS NOT ON THESE SHELVES/.test(p3),
    'a miss produced no gap at all');
  check('...naming the Caravan Desk and the Request Board',
    /Caravan Desk/.test(p3) && /Request Board/.test(p3), 'the doors are not named');
  const r3 = await receipts();
  check('...and both are pressable',
    /openReviewQueue\(\)/.test(r3) && /openRequests\(\)/.test(r3),
    'the doors are described and not offered');

  check('no console errors', errs.length === 0, errs.join(' | ') || 'none');
  check('...and the console capture is actually alive (self-test)',
    chatFails.length > 0,
    'expected the AI-less turns to log "[chat] … turn failed" and saw none — if the capture is dead, '
    + '"no console errors" above proves nothing');

  let bad = 0;
  for (const [name, ok, detail] of R) {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  — ' + detail}`);
    if (!ok) bad++;
  }
  console.log(bad
    ? `\n  ✗ ${bad} of ${R.length} failed.`
    : '\n  ✓ a resident can say what it cannot reach, and the button fixes it.');
  app.exit(bad ? 1 : 0);
}).catch(e => { console.error(e); app.exit(1); });
