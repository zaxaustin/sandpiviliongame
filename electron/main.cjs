/* ================================================================
   Electron main process — the native backend plans/DESKTOP-APP-PLAN.md calls
   for. Its one real job: proxy requests to local Ollama through Node
   instead of the renderer's own fetch(), so they're never subject to
   the browser CORS check that requires OLLAMA_ORIGINS to be configured
   just right. A server-to-server request made from here was never
   inside a browser context in the first place.
   ================================================================ */
const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs/promises');

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
ipcMain.handle('desktop-save-file', async (event, { defaultName, content }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if(canceled || !filePath) return { ok:false, canceled:true };
  try{
    await fs.writeFile(filePath, content, 'utf-8');
    return { ok:true, filePath };
  }catch(e){
    return { ok:false, canceled:false, error:String(e) };
  }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if(process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if(BrowserWindow.getAllWindows().length===0) createWindow(); });
