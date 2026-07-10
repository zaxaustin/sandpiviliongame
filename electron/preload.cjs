/* Exposes one narrow bridge into the main process — window.desktopBridge
   — instead of turning on nodeIntegration. src/game/ai/provider.js checks
   for this and routes local-AI requests through it when present, falling
   back to a plain fetch() when it's not (i.e. the ordinary browser build). */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopBridge', {
  isDesktop: true,
  fetchJSON: (url, opts={}) => ipcRenderer.invoke('desktop-fetch', {
    url,
    method: opts.method || 'GET',
    headers: opts.headers || {},
    body: opts.body,
    timeoutMs: opts.signalMs,
  }),
  // BETA-TESTING-FEEDBACK.md #12 — a real native "Save As" dialog for
  // Export Save, instead of always dropping into Downloads unasked.
  saveFile: (defaultName, content) => ipcRenderer.invoke('desktop-save-file', { defaultName, content }),
});
