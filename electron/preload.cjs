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
  // Personal-Library text storage (BETA-BUILD-PLAN.md §5A) — a shelved
  // personal book's full text lives as a plain file in the app's own data
  // folder, not in the save and not in any container. Read back on demand
  // by the Reader's openFullText().
  libraryWrite: (name, content) => ipcRenderer.invoke('desktop-library-write', { name, content }),
  libraryRead: (name) => ipcRenderer.invoke('desktop-library-read', { name }),
  libraryDelete: (name) => ipcRenderer.invoke('desktop-library-delete', { name }),
  // Personal-Library text in the local Docker MinIO (the 100 GB space) —
  // SELF-HOSTED-STACK-PLAN.md. Preferred over libraryWrite when Docker/MinIO is
  // available; returns {ok,bucket,key} so the catalog stores a storage pointer
  // and the Reader loads it over plain HTTP, same as the certified texts.
  minioWrite: (name, content) => ipcRenderer.invoke('desktop-minio-write', { name, content }),
  minioDelete: (key) => ipcRenderer.invoke('desktop-minio-delete', { key }),
  // What this machine actually is — total RAM, cores, platform. The browser
  // can only guess (navigator.deviceMemory is capped at 8 GB and rounds), and
  // the guess is worst exactly where it matters: a laptop. Beta testers were
  // being asked "is your computer up to this?" and had no way to know
  // (2026-07-28), so the app answers it for them instead.
  machineInfo: () => ipcRenderer.invoke('desktop-machine-info'),
  // Live-streaming variant of fetchJSON, so the desktop app can stream a
  // local model's reply/reasoning instead of buffering the whole response
  // (BETA-TESTING-FEEDBACK.md #35 — "the thought slips away"). onChunk is
  // called with { chunk } for each piece of the body as it arrives; the
  // returned promise resolves { ok, status } when the stream ends. Each call
  // gets its own channel id so concurrent streams can't cross wires.
  fetchStream: (url, opts, onChunk) => {
    const id = 'strm-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    const channel = 'desktop-fetch-stream:' + id;
    const listener = (_e, msg) => { try{ onChunk(msg); }catch(e){ /* ignore a bad consumer */ } };
    ipcRenderer.on(channel, listener);
    return ipcRenderer.invoke('desktop-fetch-stream-start', {
      id, url, method: opts.method || 'POST', headers: opts.headers || {}, body: opts.body, timeoutMs: opts.signalMs,
    }).finally(() => ipcRenderer.removeListener(channel, listener));
  },
  /* The local Postgres — the KNOWLEDGE half of the backend (MinIO keeps the
     text). A browser cannot speak Postgres's binary protocol, so the main
     process holds the connection and the renderer asks by NAME: dbQuery
     ('unshelved', [20, 0]), never a string of SQL. See electron/db.cjs for
     every statement that exists.

     ALL FOUR RETURN null WHEN THERE IS NO DATABASE — not an error, not a
     hang (measured at 27ms to give up). The web build has none of this and
     must keep working; so must the desktop app with the container stopped. */
  dbStatus: () => ipcRenderer.invoke('desktop-db-status'),
  dbQuery: (name, params) => ipcRenderer.invoke('desktop-db-query', { name, params }),
  dbWrite: (name, params) => ipcRenderer.invoke('desktop-db-write', { name, params }),
  dbWriteMany: (name, rows) => ipcRenderer.invoke('desktop-db-write-many', { name, rows }),
});
