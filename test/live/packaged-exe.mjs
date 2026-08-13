/* ================================================================
   [THE ARTIFACT ITSELF] — the .exe electron-builder produced, run.

   WHY THIS EXISTS ALONGSIDE packaged-boot.cjs, written 2026-08-13.

   `packaged-boot.cjs` reproduces the packaged *load path* — same
   preload, same contextIsolation, same loadFile(dist/index.html) —
   using the repo's own electron against the repo's own dist/. That is
   the check that caught a title screen with nothing behind it, and it
   is still the fast one to run after every build.

   But rule 8 says TEST THE ARTIFACT YOU SHIP, and dist/ is not the
   artifact. Between dist/ and the .exe sit: the asar pack, the `files`
   glob in package.json (does tools/migrations/*.sql actually make it
   in?), asarUnpack for PGlite's WASM, the icon, the signing step, and
   whatever electron-builder decided to leave out. None of that is
   exercised by loading dist/ off the working tree.

   So this one launches the real binary out of win-unpacked, with a
   throwaway --user-data-dir so it cannot touch the steward's own save,
   and drives it over CDP. It asserts the things only the packaged app
   can be wrong about: that it loads out of app.asar, that the bundle
   ran, that the bridge and the database are reachable from inside the
   pack, and that the build number a tester will read back to us is the
   one in package.json.

       npm run electron:build:beta -- --config.directories.output=$TEMP/sp-build
       node test/live/packaged-exe.mjs

   ⚠ ELECTRON_RUN_AS_NODE must be UNSET. With it set the .exe runs as
   node, rejects --user-data-dir with "bad option", and exits 9 — which
   looks exactly like a packaged app that crashes on boot. That cost a
   detour on the day this was written.

       env -u ELECTRON_RUN_AS_NODE node test/live/packaged-exe.mjs

   It SKIPS LOUDLY and exits 0 when no unpacked build is on disk, the
   same contract as docker-home.cjs — a suite that goes green because
   the thing it tests is absent is rule 5 wearing a tick, so say it.
   ================================================================ */
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

/* Derived from package.json, never typed — the same rule the in-app
   Build: line follows (vite.config.js defines __APP_VERSION__ from it). */
const WANT = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

const CANDIDATES = [
  process.env.SP_UNPACKED,
  join(process.env.TEMP || tmpdir(), 'sp-build', 'win-unpacked', 'Sand Pavilion.exe'),
  join(ROOT, 'release', 'win-unpacked', 'Sand Pavilion.exe'),
].filter(Boolean);
const EXE = CANDIDATES.find(p => existsSync(p));

if (!EXE) {
  console.log('\n  SKIPPED — no unpacked build on disk. Looked in:');
  CANDIDATES.forEach(p => console.log('    ' + p));
  console.log('  Build one first:  npm run electron:build:beta -- --config.directories.output=$TEMP/sp-build');
  console.log('  (this is a skip, not a pass — nothing about the artifact was checked)\n');
  process.exit(0);
}
if (process.env.ELECTRON_RUN_AS_NODE) {
  console.log('\n  REFUSING TO RUN — ELECTRON_RUN_AS_NODE is set, so the .exe would run as');
  console.log('  node and exit 9 on the first switch. Re-run with: env -u ELECTRON_RUN_AS_NODE\n');
  process.exit(1);
}

const UD = mkdtempSync(join(tmpdir(), 'sp-exe-'));
const PORT = 9335;

let fails = 0;
const check = (what, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${what}${ok ? '' : '  <- ' + detail}`);
  if (!ok) fails++;
};
const wait = ms => new Promise(r => setTimeout(r, ms));

console.log('\n--- the .exe electron-builder produced, launched for real ---');
console.log('    ' + EXE);

const child = spawn(EXE, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${UD}`], { stdio: 'ignore' });

let browser;
try {
  for (let i = 0; i < 40 && !browser; i++) {
    await wait(500);
    try { browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${PORT}`, defaultViewport: null }); } catch { /* not up yet */ }
  }
  if (!browser) throw new Error('the packaged app never opened a debugging port');

  const page = (await browser.pages())[0];
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await wait(2500);

  const url = page.url();
  check('it loaded out of app.asar over file://', /app\.asar\/dist\/index\.html$/.test(url), url);
  check("the game's own code is running", await page.evaluate(() => typeof window.openWelcome === 'function'));
  check('the desktop bridge is wired up', await page.evaluate(() => !!(window.desktopBridge && window.desktopBridge.isDesktop)));

  /* The database is the sharpest asar question there is: schema.sql and
     tools/migrations/*.sql are listed in `files`, and PGlite's WASM is the
     one thing asarUnpack exists for. If any of that missed the pack, this
     is where it shows up rather than on a tester's machine. */
  const db = await page.evaluate(() => window.desktopBridge.dbStatus().then(s => s, e => ({ error: String(e) })));
  check('the packaged app reaches a database', !!db && !db.error && (db.up || db.kind),
    JSON.stringify(db).slice(0, 300));
  check('and its schema applied cleanly inside the pack', !!db && !db.schemaError, String(db && db.schemaError));
  console.log('    db says:', JSON.stringify(db).slice(0, 300));

  /* The build number lives in the bug-report card — the one place a tester
     reads it back to us, so it is the one that must not say "dev". */
  const report = await page.evaluate(async () => {
    window.openReport();
    await new Promise(r => setTimeout(r, 500));
    return (document.getElementById('reportPanel') || document.body).innerText;
  });
  check(`the app names itself ${WANT}`, report.includes(WANT),
    (report.match(/Build:.*/) || ['no Build: line at all'])[0]);
  check('and it knows it is the installed app, not a tab',
    /Running as:\s*the installed app/.test(report), (report.match(/Running as:.*/) || [''])[0]);

  const entered = await page.evaluate(async () => {
    document.querySelectorAll('.ov').forEach(o => o.classList.remove('show'));
    const b = document.getElementById('startBtn');
    if (!b) return 'no start button';
    b.click();
    await new Promise(r => setTimeout(r, 1500));
    const c = document.querySelector('canvas');
    return c && c.offsetWidth > 0 ? 'ok' : 'no canvas';
  });
  check('"Enter the Grounds" actually enters', entered === 'ok', entered);

  check('no page errors', errs.length === 0, errs.join(' | '));
} catch (e) {
  check('the run completed', false, String(e));
} finally {
  try { if (browser) await browser.disconnect(); } catch { /* already gone */ }
  try { child.kill(); } catch { /* already gone */ }
  await wait(1000);
  try { rmSync(UD, { recursive: true, force: true }); } catch { /* windows holds it briefly */ }
}

console.log(fails === 0
  ? '\n  ✓ SHIPPABLE — the artifact boots, names its version, and reaches its database.\n'
  : `\n  ✗ ${fails} failure(s) against the real .exe — do not move the installer.\n`);
process.exit(fails === 0 ? 0 : 1);
