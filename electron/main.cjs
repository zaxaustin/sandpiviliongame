/* ================================================================
   Electron main process — the native backend plans/done/DESKTOP-APP-PLAN.md calls
   for. Its one real job: proxy requests to local Ollama through Node
   instead of the renderer's own fetch(), so they're never subject to
   the browser CORS check that requires OLLAMA_ORIGINS to be configured
   just right. A server-to-server request made from here was never
   inside a browser context in the first place.
   ================================================================ */
const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const { spawn } = require('child_process');

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

let mainWindow = null;
function createWindow(){
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'The Sand Pavilion',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  // Any target="_blank" link (e.g. the "install Ollama" link shown when no
  // local AI is detected) should open in the user's real browser, not a
  // second app window with no address bar or way back.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // BETA-TESTING-FEEDBACK.md #13 — Chromium's spellchecker is already on
  // by default (the red squiggly underline), but Electron never wires up
  // the right-click "Did you mean…" menu on its own; this is that menu.
  win.webContents.on('context-menu', (event, params) => {
    const menu = Menu.buildFromTemplate([
      ...params.dictionarySuggestions.map(suggestion => ({
        label: suggestion,
        click: () => win.webContents.replaceMisspelling(suggestion),
      })),
      ...(params.dictionarySuggestions.length ? [{ type: 'separator' }] : []),
      ...(params.misspelledWord ? [{
        label: 'Add to dictionary',
        click: () => win.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord),
      }, { type: 'separator' }] : []),
      { label: 'Cut', role: 'cut', enabled: params.editFlags.canCut },
      { label: 'Copy', role: 'copy', enabled: params.editFlags.canCopy },
      { label: 'Paste', role: 'paste', enabled: params.editFlags.canPaste },
    ]);
    menu.popup();
  });

  if(!app.isPackaged){
    win.loadURL(DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
  mainWindow = win;
}

/* Deliberately narrow: only ever proxies to localhost/127.0.0.1. This
   bridge exists to fix Ollama's CORS wall, not to become a general
   fetch-anything-from-the-renderer hole — a compromised or buggy
   renderer can't use it to reach an arbitrary URL. */
function isAllowedLocalUrl(url){
  try{
    const u = new URL(url);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  }catch(e){ return false; }
}

ipcMain.handle('desktop-fetch', async (event, { url, method, headers, body, timeoutMs }) => {
  if(!isAllowedLocalUrl(url)){
    console.log(`[desktop-fetch] blocked non-local URL: ${url}`);
    return { ok:false, status:0, text:'Blocked: desktop-fetch only proxies localhost requests.', json:null };
  }
  const ctrl = new AbortController();
  const timer = timeoutMs ? setTimeout(()=>ctrl.abort(), timeoutMs) : null;
  try{
    const res = await fetch(url, { method: method||'GET', headers, body, signal: ctrl.signal });
    const text = await res.text();
    let json = null;
    try{ json = JSON.parse(text); }catch(e){ /* not JSON, fine */ }
    console.log(`[desktop-fetch] ${method||'GET'} ${url} -> ${res.status}`);
    return { ok: res.ok, status: res.status, text, json };
  }catch(e){
    console.log(`[desktop-fetch] ${method||'GET'} ${url} -> FAILED: ${e.message}`);
    return { ok:false, status:0, text:String(e), json:null };
  }finally{
    if(timer) clearTimeout(timer);
  }
});

/* Streaming sibling of desktop-fetch — reads the response body and pushes
   each chunk back to the renderer over a per-request channel, so a local
   model's reply/reasoning can be watched live in the desktop app instead of
   arriving as one buffered lump (BETA-TESTING-FEEDBACK.md #35). Same
   localhost-only guard as desktop-fetch. If anything goes wrong the promise
   resolves { ok:false }, and the renderer falls back to the buffered path. */
ipcMain.handle('desktop-fetch-stream-start', async (event, { id, url, method, headers, body, timeoutMs }) => {
  if(!isAllowedLocalUrl(url)){
    console.log(`[desktop-fetch-stream] blocked non-local URL: ${url}`);
    return { ok:false, status:0 };
  }
  const channel = 'desktop-fetch-stream:' + id;
  const ctrl = new AbortController();
  const timer = timeoutMs ? setTimeout(()=>ctrl.abort(), timeoutMs) : null;
  try{
    const res = await fetch(url, { method: method||'POST', headers, body, signal: ctrl.signal });
    if(!res.ok || !res.body){ return { ok:false, status:res.status }; }
    const decoder = new TextDecoder();
    const reader = res.body.getReader(); // getReader() works on every Electron/Node; async-iterating res.body doesn't
    for(;;){
      const { done, value } = await reader.read();
      if(done || event.sender.isDestroyed()) break;
      event.sender.send(channel, { chunk: decoder.decode(value, { stream:true }) });
    }
    console.log(`[desktop-fetch-stream] ${method||'POST'} ${url} -> ${res.status} (streamed)`);
    return { ok:true, status:res.status };
  }catch(e){
    console.log(`[desktop-fetch-stream] ${method||'POST'} ${url} -> FAILED: ${e.message}`);
    return { ok:false, status:0, error:String(e) };
  }finally{
    if(timer) clearTimeout(timer);
  }
});

/* BETA-TESTING-FEEDBACK.md #12 — Export Save previously always dropped
   into the OS default Downloads folder with no picker (the browser
   <a download> pattern, which Electron still honors but never prompts).
   A real save dialog in the main process, exposed through preload's
   existing bridge. */
/* The filter follows the FILE, not a guess. It was hardcoded to JSON, so the
   plain-text bug report — and, from 2026-08-03, a teacher's lesson plan saved
   as .md or .html — was offered a JSON filter and could be saved with the
   wrong extension. A one-line fault that would look like the app mangling
   his handout. */
const SAVE_FILTERS = {
  json: { name: 'JSON', extensions: ['json'] },
  md:   { name: 'Markdown', extensions: ['md'] },
  html: { name: 'Web page', extensions: ['html'] },
  txt:  { name: 'Text', extensions: ['txt'] },
};
ipcMain.handle('desktop-save-file', async (event, { defaultName, content }) => {
  const ext = String(defaultName || '').split('.').pop().toLowerCase();
  const filter = SAVE_FILTERS[ext];
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [...(filter ? [filter] : []), { name: 'All files', extensions: ['*'] }],
  });
  if(canceled || !filePath) return { ok:false, canceled:true };
  try{
    await fs.writeFile(filePath, content, 'utf-8');
    return { ok:true, filePath };
  }catch(e){
    return { ok:false, canceled:false, error:String(e) };
  }
});

/* BETA-BUILD-PLAN.md §5(A) — the personal Library's full-text storage,
   without Docker or MinIO: plain .txt files under the app's own data
   folder (app.getPath('userData')/library). The book genuinely lives on
   the user's disk, survives reinstalls of the app itself, and needs no
   running service at all. Names are locked to a slug-safe character set
   so a crafted save can't turn this into a path-traversal hole. */
const libraryDir = () => path.join(app.getPath('userData'), 'library');
function safeLibraryName(name){
  return typeof name === 'string' && /^[a-z0-9][a-z0-9._-]{0,120}\.txt$/i.test(name) && !name.includes('..');
}
/* What this machine actually is. Nothing identifying — no serial, no name, no
   MAC, nothing that leaves the process — just the three numbers that decide
   whether a local model is a good idea here, and how big it may be. Asked for
   2026-07-28: most of the first testers are on laptops and have no idea how to
   check their own specs, and the browser can't tell them (navigator.deviceMemory
   caps at 8 GB and rounds to a power of two, which is useless precisely where
   the answer matters). */
ipcMain.handle('desktop-machine-info', async () => {
  try{
    const os = require('os');
    const cpus = os.cpus() || [];
    return {
      ok: true,
      totalMemGB: Math.round(os.totalmem() / 1073741824),
      freeMemGB: Math.round(os.freemem() / 1073741824),
      cores: cpus.length,
      cpu: (cpus[0] && cpus[0].model || '').trim(),
      platform: process.platform,
      arch: process.arch,
    };
  }catch(e){ return { ok:false, error:String(e) }; }
});
ipcMain.handle('desktop-library-write', async (event, { name, content }) => {
  if(!safeLibraryName(name) || typeof content !== 'string') return { ok:false, error:'bad name or content' };
  try{
    await fs.mkdir(libraryDir(), { recursive: true });
    await fs.writeFile(path.join(libraryDir(), name), content, 'utf-8');
    return { ok:true };
  }catch(e){ return { ok:false, error:String(e) }; }
});
ipcMain.handle('desktop-library-read', async (event, { name }) => {
  if(!safeLibraryName(name)) return { ok:false, error:'bad name' };
  try{
    const text = await fs.readFile(path.join(libraryDir(), name), 'utf-8');
    return { ok:true, text };
  }catch(e){ return { ok:false, error:String(e) }; }
});
ipcMain.handle('desktop-library-delete', async (event, { name }) => {
  if(!safeLibraryName(name)) return { ok:false, error:'bad name' };
  try{
    await fs.unlink(path.join(libraryDir(), name));
    return { ok:true };
  }catch(e){ return { ok:false, error:String(e) }; }
});

/* SELF-HOSTED-STACK-PLAN.md — personal books in the local Docker MinIO (the
   100 GB space), the durable home for their full text instead of the fragile
   localStorage save. Uploads run exactly like tools/caravan/push-fulltext.py:
   `mc` inside a throwaway container, `mc pipe` over stdin, host reached via
   host.docker.internal. Credentials are read from the environment or .env.local
   (the same non-sensitive-on-this-machine MINIO_* values) — never from the
   renderer. Returns a clear failure so the caller falls back to a plain file. */
let _minioCfg;
async function minioConfig(){
  if(_minioCfg !== undefined) return _minioCfg;
  const cfg = {
    endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
    user: process.env.MINIO_ROOT_USER || '',
    password: process.env.MINIO_ROOT_PASSWORD || '',
    bucket: process.env.MINIO_BUCKET || 'sand-pavilion-library',
  };
  if(!cfg.user || !cfg.password){
    for(const p of [path.join(process.cwd(), '.env.local'), path.join(__dirname, '..', '.env.local')]){
      try{
        const txt = await fs.readFile(p, 'utf-8');
        for(const line of txt.split(/\r?\n/)){
          const m = /^\s*(MINIO_[A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);
          if(!m) continue;
          const v = m[2].replace(/^["']|["']$/g,'');
          if(m[1]==='MINIO_ENDPOINT' && v) cfg.endpoint = v;
          else if(m[1]==='MINIO_ROOT_USER' && !cfg.user) cfg.user = v;
          else if(m[1]==='MINIO_ROOT_PASSWORD' && !cfg.password) cfg.password = v;
          else if(m[1]==='MINIO_BUCKET' && v) cfg.bucket = v;
        }
        if(cfg.user && cfg.password) break;
      }catch(e){ /* try the next candidate path */ }
    }
  }
  _minioCfg = (cfg.user && cfg.password) ? cfg : null;
  return _minioCfg;
}
function mcRun(cfg, mcCommand, stdinBuf){
  // from inside mc's own container, "localhost" is that container — the host's
  // published MinIO port is reached via host.docker.internal (Docker Desktop).
  const endpoint = cfg.endpoint.replace(/:\/\/(localhost|127\.0\.0\.1)([:/]|$)/, '://host.docker.internal$2');
  const shellCmd = `mc alias set local ${endpoint} ${cfg.user} ${cfg.password} >/dev/null && ${mcCommand}`;
  return new Promise((resolve)=>{
    let p;
    try{ p = spawn('docker', ['run','-i','--rm','--entrypoint','sh','minio/mc','-c', shellCmd], { windowsHide:true }); }
    catch(e){ return resolve({ ok:false, error:String(e) }); }
    let err='';
    p.stderr.on('data', d=>{ err += d.toString(); });
    p.on('error', e=>resolve({ ok:false, error:String(e) })); // e.g. docker not installed/running
    p.on('close', code=>resolve(code===0 ? { ok:true } : { ok:false, error:(err.trim()||('exit '+code)) }));
    try{ if(stdinBuf!==undefined) p.stdin.write(stdinBuf); p.stdin.end(); }catch(e){ /* 'error' handler resolves */ }
  });
}
ipcMain.handle('desktop-minio-write', async (event, { name, content }) => {
  if(!safeLibraryName(name) || typeof content !== 'string') return { ok:false, error:'bad name or content' };
  const cfg = await minioConfig();
  if(!cfg) return { ok:false, error:'no-minio-config' };
  const key = 'personal/' + name;
  const res = await mcRun(cfg, `mc pipe local/${cfg.bucket}/${key}`, Buffer.from(content, 'utf-8'));
  return res.ok ? { ok:true, bucket:cfg.bucket, key } : res;
});
ipcMain.handle('desktop-minio-delete', async (event, { key }) => {
  if(typeof key !== 'string' || key.includes('..') || !/^personal\/[a-z0-9][a-z0-9._-]{0,120}\.txt$/i.test(key)) return { ok:false, error:'bad key' };
  const cfg = await minioConfig();
  if(!cfg) return { ok:false, error:'no-minio-config' };
  return mcRun(cfg, `mc rm local/${cfg.bucket}/${key}`);
});

/* ----- The database (electron/db.cjs). Docker Postgres when it is running,
   the built-in one otherwise — the renderer cannot tell which, and that is
   the point. Named queries only — it asks for 'unshelved', never for SQL —
   and every one of these still returns null rather than throwing, because
   the app has to be complete even when both homes are unavailable. */
const db = require('./db.cjs');
ipcMain.handle('desktop-db-status', async () => db.status());
ipcMain.handle('desktop-db-query', async (event, { name, params }) => db.query(name, params));
ipcMain.handle('desktop-db-write', async (event, { name, params }) => db.write(name, params));
ipcMain.handle('desktop-db-write-many', async (event, { name, rows }) => db.writeMany(name, rows));
// Which home you are on is decided once and kept, so that writes cannot be
// split across two stores mid-session. This is the only way to re-decide,
// and a person has to ask for it.
ipcMain.handle('desktop-db-reconnect', async () => db.reconnect());

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if(process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if(BrowserWindow.getAllWindows().length===0) createWindow(); });
