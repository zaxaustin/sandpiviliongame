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
import { readFileSync } from 'node:fs';

/* THE BUILD NUMBER, DERIVED — never typed twice.

   overlays.js used to carry the version as a literal string, and on
   2026-08-04 it still read 0.1.0-beta.3 while package.json said beta.4.
   Every bug report from that build would have named the wrong binary,
   which is the one thing a build number exists to prevent. `verify:release`
   caught it, and rule 4 says the fix is to derive the list rather than to
   remember harder. Read once, at build time, from the one place that
   already has to be right for electron-builder to name the installer. */
const pkgVersion = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8')
).version;

export default {
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkgVersion) },
};
