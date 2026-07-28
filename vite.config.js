/* ================================================================
   [VITE CONFIG] — this file exists for exactly one reason, and it is
   a big one: `base: './'`.

   Found 2026-07-28, by booting the built app the way the INSTALLER
   boots it instead of the way development does.

   `electron:dev` calls win.loadURL('http://localhost:5173') — a real
   http origin, where Vite's default absolute asset paths
   (`/assets/index-xxx.js`) resolve perfectly. The packaged app calls
   win.loadFile(dist/index.html) instead, a **file:// origin**, where
   `/assets/...` resolves to the filesystem ROOT — `C:/assets/...` —
   which does not exist.

   The result was a window that looked like it half-worked: index.html
   itself loads, so you see the Start button, but no script and no
   stylesheet ever arrive. Unstyled page, dead button, no error dialog.
   Verified in real Electron 43 (test/live/packaged-boot.cjs):

       start button in the HTML      : true
       THE GAME'S CODE ACTUALLY RAN  : false

   Every desktop test until now went through `electron:dev`, which
   cannot see this — the one gap that mattered most, hidden by the one
   convenience that made testing easy.

   `base: './'` emits relative asset paths, which work under file://
   AND under http. The web build (sandpiviliongame.vercel.app) serves
   index.html from the site root, so './assets/...' resolves exactly as
   '/assets/...' did — nothing regresses there.

   If this file is ever deleted, the installer silently goes back to
   shipping a blank window. test/live/packaged-boot.cjs is the guard.
   ================================================================ */
export default {
  base: './',
};
