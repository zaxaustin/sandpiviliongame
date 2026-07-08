/* ================================================================
   Electron main process — the native backend DESKTOP-APP-PLAN.md calls
   for. Its one real job: proxy requests to local Ollama through Node
   instead of the renderer's own fetch(), so they're never subject to
   the browser CORS check that requires OLLAMA_ORIGINS to be configured
   just right. A server-to-server request made from here was never
   inside a browser context in the first place.
   ================================================================ */
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

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

  if(!app.isPackaged){
    win.loadURL(DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
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

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if(process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if(BrowserWindow.getAllWindows().length===0) createWindow(); });
