/* ================================================================
   [AN ILLUSTRATED BOOK, ON THE DESKTOP] — the sidecar path.

   The browser suite (test/live/illustrated-book.mjs) proves the figures
   survive intake and reach the page. It cannot prove the path everybody
   who is not in a browser actually uses: there is no desktopBridge in a
   tab, so figures go INLINE there and the `<slug>.images.txt` sidecar —
   the write that keeps ~1.5 MB of base64 out of the save — is never
   exercised at all.

   ⚠ THIS IS THE PATH THAT LOOKED BROKEN IN REAL USE. The steward opened
   his own copy in the desktop app and saw no pictures. It was not this
   code: the book had been shelved BEFORE the walker learned to see
   images, so its stored text had zero ⟦fig:⟧ markers and no sidecar
   existed. A book already on the shelf cannot retroactively gain
   pictures. That is worth a suite either way, because "it works in a
   browser" was never evidence about this.

   ISOLATED: userData goes to a temp directory, so this never touches the
   steward's real library.

     npm run build:beta
     env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/illustrated-desktop.cjs
   ================================================================ */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');

app.commandLine.appendSwitch('disable-gpu');
process.env.POSTGRES_PORT = '5433';                       // no container here
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-illus-'));
app.setPath('userData', tmp);

const EPUB = process.env.EPUB
  || 'C:/Users/resto/Downloads/Drawing_for_Beginners_-_Reed_Karen.epub';

const R = [];
const check = (name, ok, detail) => { R.push([name, !!ok, detail]); };
const wait = ms => new Promise(r => setTimeout(r, ms));

/* the library IPC the renderer will call — the same handlers electron/main.cjs
   registers, so safeLibraryName's rules are the ones actually under test */
const LIB = path.join(tmp, 'library');
fs.mkdirSync(LIB, { recursive: true });
const safeLibraryName = n => /^[a-z0-9][a-z0-9._-]{0,120}\.txt$/i.test(String(n || ''));
ipcMain.handle('desktop-library-write', async (e, { name, content }) => {
  if (!safeLibraryName(name) || typeof content !== 'string') return { ok: false, error: 'bad name or content' };
  await fs.promises.writeFile(path.join(LIB, name), content, 'utf-8');
  return { ok: true };
});
ipcMain.handle('desktop-library-read', async (e, { name }) => {
  if (!safeLibraryName(name)) return { ok: false, error: 'bad name' };
  try { return { ok: true, text: await fs.promises.readFile(path.join(LIB, name), 'utf-8') }; }
  catch (err) { return { ok: false, error: String(err.message) }; }
});
ipcMain.handle('desktop-library-delete', async () => ({ ok: true }));
ipcMain.handle('desktop-library-usage', async () => ({ ok: true, bytes: 0, free: 1e12 }));
for (const ch of ['desktop-db-status', 'desktop-db-query', 'desktop-db-write', 'desktop-db-write-many']) {
  ipcMain.handle(ch, async () => (ch === 'desktop-db-status' ? { up: false } : null));
}
for (const ch of ['desktop-minio-write', 'desktop-minio-delete']) {
  ipcMain.handle(ch, async () => ({ ok: false, error: 'no minio here' }));  // force the FILE path
}

app.whenReady().then(async () => {
  if (!fs.existsSync(EPUB)) {
    console.log('\n  SKIP — the acceptance book is not on this machine:\n        ' + EPUB + '\n');
    app.quit(); return;
  }
  const win = new BrowserWindow({ width: 1200, height: 900, show: false,
    webPreferences: { preload: path.join(__dirname, '..', '..', 'electron', 'preload.cjs'),
      contextIsolation: true, sandbox: false } });
  const page = path.join(__dirname, '..', '..', 'dist', 'index.html');
  const js = expr => win.webContents.executeJavaScript(expr);

  const errs = [];
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
  await js(`localStorage.setItem('sandPavilionSave.v2', ${JSON.stringify(
    JSON.stringify({ seenWelcome: true, aiConnections: [] }))}); true`);
  await win.loadFile(page);
  await wait(800);

  check('the desktop bridge is present (this is not a browser)',
    await js('!!(window.desktopBridge && window.desktopBridge.libraryWrite)'));

  /* the real intake, driven the way a person drives it: a File on the real
     <input>, and the real change event */
  const b64 = fs.readFileSync(EPUB).toString('base64');
  await js(`window.__b64 = ${JSON.stringify(b64)}; true`);
  await js(`(() => {
    const bin = atob(window.__b64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    window.__file = new File([u8], 'Drawing_for_Beginners_-_Reed_Karen.epub');
    delete window.__b64;
    return true;
  })()`);

  await js('window.openBookIntake(); true');
  await wait(300);
  await js(`(() => { const b = [...document.querySelectorAll('button')]
      .find(x => /by hand/i.test(x.textContent)); if (b) b.click(); return true; })()`);
  await wait(300);

  const started = await js(`(() => {
    const inp = document.getElementById('bulkFilePick');
    if (!inp) return false;
    const dt = new DataTransfer();
    dt.items.add(window.__file);
    inp.files = dt.files;
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  check('the real file input took the file', started);

  let filled = false;
  for (let i = 0; i < 60; i++) {
    await wait(1000);
    filled = await js(`(() => { const t = document.getElementById('rmTitle'),
      b = document.getElementById('rmBody');
      return !!(t && t.value && b && b.value.length > 1000); })()`);
    if (filled) break;
  }
  check('the EPUB unpacked and filled the form', filled);
  check('figure markers are in the text',
    (await js(`(document.getElementById('rmBody').value.match(/⟦fig:\\d+⟧/g)||[]).length`)) === 113,
    (await js(`(document.getElementById('rmBody').value.match(/⟦fig:\\d+⟧/g)||[]).length`)) + ' markers');

  await js('window.shelveManualFormNow(); true');
  await wait(6000);

  const rec = await js(`(() => {
    const s = JSON.parse(localStorage.getItem('sandPavilionSave.v2'));
    const b = (s.personalLibrary || [])[0];
    if (!b) return null;
    const p = b.doc.pics || null;
    return { slug: b.slug, kept: p && p.kept, total: p && p.total,
             sidecar: p && p.storage ? p.storage.personal : null,
             inline: !!(p && p.figs), cover: !!(p && p.cover),
             saveKB: Math.round(localStorage.getItem('sandPavilionSave.v2').length / 1024) };
  })()`);
  check('the book shelved', !!rec, rec ? rec.slug : 'nothing');
  if (rec) {
    check('all 113 figures were kept', rec.kept === 113, `${rec.kept} of ${rec.total}`);
    check('★ THEY WENT TO A SIDECAR FILE, not into the save',
      rec.sidecar === rec.slug + '.images.txt', String(rec.sidecar));
    check('and therefore NOT inline in the save', !rec.inline);
    check('the save stayed small', rec.saveKB < 400, rec.saveKB + ' KB');
    check('a cover was kept', rec.cover);

    /* the file is really on disk, and safeLibraryName let that name through */
    const f = path.join(LIB, rec.slug + '.images.txt');
    const onDisk = fs.existsSync(f);
    check('the sidecar exists on disk', onDisk, onDisk ? (fs.statSync(f).size / 1048576).toFixed(2) + ' MB' : 'missing');
    if (onDisk) {
      let parsed = null;
      try { parsed = JSON.parse(fs.readFileSync(f, 'utf-8')); } catch (e) { /* reported below */ }
      check('it is valid JSON of data URIs', !!parsed && Object.keys(parsed).length === 113,
        parsed ? Object.keys(parsed).length + ' figures' : 'unparseable');
      check('and the text file is beside it', fs.existsSync(path.join(LIB, rec.slug + '.txt')));
    }

    /* ROUND TRIP: the reader must read them back off disk */
    await js('window.closeUI(); true');
    await wait(200);
    await js(`window.openReader(${JSON.stringify(rec.slug)}); true`);
    await wait(900);
    await js(`(() => { const b = [...document.querySelectorAll('button')]
        .find(x => /read the (whole|full)|full text/i.test(x.textContent)); if (b) b.click(); return true; })()`);
    await wait(1500);

    let found = null;
    for (let i = 0; i < 25; i++) {
      found = await js(`(() => {
        const el = document.getElementById('rdFullTextBody');
        const im = [...el.querySelectorAll('img.bookFigure')];
        return { n: im.length, loaded: im.filter(x => x.complete && x.naturalWidth > 0).length,
                 leaked: /⟦fig:/.test(el.textContent),
                 page: (document.getElementById('rdFullTextPageNum')||{}).textContent };
      })()`);
      if (found.n > 0) break;
      await js('window.fullTextNextPage(); true');
      await wait(250);
    }
    check('★ THE FIGURES CAME BACK OFF DISK ONTO THE PAGE', found && found.n > 0,
      found ? `${found.n} on ${found.page}` : 'none in 25 pages');
    if (found && found.n) {
      check('and they decoded', found.loaded === found.n, `${found.loaded} of ${found.n}`);
      check('no marker leaked into the text', !found.leaked);
    }
  }

  check('no console errors', errs.length === 0, errs.slice(0, 2).join(' | ') || 'none');

  let bad = 0;
  for (const [n, ok, d] of R) {
    console.log((ok ? '  ok   ' : '  FAIL ') + n + (d ? '  — ' + d : ''));
    if (!ok) bad++;
  }
  console.log(bad ? `\n✗ ${bad} failure(s)\n` : '\n✓ the sidecar path works on the desktop\n');
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
  app.exit(bad ? 1 : 0);
});
