/* ================================================================
   [PACKAGED BOOT] — does the app the INSTALLER produces actually run?

   This exists because for weeks it did not, and nothing could tell us.
   `npm run electron:dev` loads the app from the Vite dev server over
   http, where absolute asset paths resolve fine. The packaged app uses
   win.loadFile(dist/index.html) — a file:// origin, where Vite's
   default `/assets/...` resolves to the filesystem root and 404s.

   The failure was quiet in the worst way: index.html itself loads, so
   the window shows a title screen and an "Enter the Grounds" button.
   Nothing behind it exists. No script, no stylesheet, no error dialog —
   just a button that does nothing. Fixed by vite.config.js (`base:
   './'`); this harness is what stops it coming back.

   It reproduces the packaged path exactly: same preload, same
   contextIsolation/sandbox settings, same loadFile call. Run it after
   any build, before cutting an installer:

       npm run build:beta
       env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/packaged-boot.cjs

   (Call the binary directly rather than through npx — npx can set
   ELECTRON_RUN_AS_NODE, which makes require('electron') hand back a
   path string instead of the API.)

   Exit code 0 = shippable. Non-zero = do not cut the installer.

   One expected bit of noise: "No handler registered for 'desktop-fetch'".
   This harness is a minimal main process and deliberately does not
   register main.cjs's IPC handlers — seeing that error is the bridge
   being genuinely exercised, not a fault.
   ================================================================ */
const { app, BrowserWindow } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('disable-gpu');

const js = (win, expr) => win.webContents.executeJavaScript(expr).catch(() => false);

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false, width: 1280, height: 900,
    webPreferences: {
      preload: path.join(__dirname, '..', '..', 'electron', 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
    },
  });

  const errs = [];
  win.webContents.on('console-message', (e, level, message) => {
    const text = String(message);
    // Electron's own dev-only CSP nag is not a fault in the app
    if (level >= 2 && !/Electron Security Warning/.test(text)) errs.push(text.slice(0, 160));
  });
  win.webContents.on('did-fail-load', (e, code, desc, url) => errs.push(`did-fail-load ${code} ${desc} ${url}`));

  await win.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'))
    .catch(e => errs.push('loadFile: ' + e.message));
  await new Promise(r => setTimeout(r, 2500));

  /* The shell loading proves nothing — that was the whole trap. What
     matters is whether the game's OWN code ever ran. */
  const booted = await js(win, `({
    shell:   !!document.getElementById("startBtn"),
    codeRan: typeof window.openWelcome === "function",
    bridge:  !!window.desktopBridge,
    styled:  getComputedStyle(document.body).backgroundColor
  })`) || {};

  let starts = false, panelWorks = false;
  if (booted.codeRan) {
    await js(win, 'document.getElementById("startBtn").click(), true');
    await new Promise(r => setTimeout(r, 1800));
    starts = await js(win, `(function(){
      var c = document.getElementById("game");
      var t = document.getElementById("title");
      return !!c && c.width > 0 && (!t || getComputedStyle(t).display === "none" || !t.offsetParent);
    })()`);
    panelWorks = await js(win, `(function(){
      try { window.openMyLibrary();
        var o = document.querySelector(".open .panel");
        var ok = !!o && o.textContent.trim().length > 30;
        window.closeUI(); return ok;
      } catch (e) { return false; }
    })()`);
  }

  const row = (label, ok) => console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}`);
  console.log('--- the packaged app, booted the way the installer boots it ---');
  row('index.html loads at all', !!booted.shell);
  row("THE GAME'S OWN CODE RUNS", !!booted.codeRan);
  row(`the stylesheet arrives (${booted.styled})`, booted.styled === 'rgb(20, 16, 25)');
  row('the desktop bridge is wired up (preload)', !!booted.bridge);
  row('"Enter the Grounds" actually enters', !!starts);
  row('a panel opens and has real content', !!panelWorks);
  console.log('  console errors:', errs.length ? errs.slice(0, 4) : 'none');

  const ok = booted.codeRan && booted.bridge && starts && panelWorks && !errs.length;
  console.log(ok ? '\n  ✓ SHIPPABLE — the packaged app boots, starts, and works.'
                 : '\n  ✗ DO NOT CUT AN INSTALLER FROM THIS BUILD.');
  app.exit(ok ? 0 : 1);
});
