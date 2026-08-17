/* ================================================================
   [RELEASE DOC CHECK] — do the docs describe the file we would
   actually hand someone?

   Written 2026-08-02, after outside review found a SHA-256 mismatch
   between the published GitHub release and this repo's own docs. The
   hash was the symptom. The disease was worse:

     published v0.1.0-beta.2  ->  FB094807…  built 2026-07-28
     repo docs + release/     ->  E995D768…  built 2026-08-02

   The SAME TAG served two different binaries, and the published one
   predated the librarian data-loss fix. So every tester downloading
   it got a build that could silently overwrite their filing work, and
   anyone verifying the download against the repo's instructions got a
   mismatch and would reasonably conclude tampering.

   Nothing caught that, because nothing was looking. This looks:

     1. package.json's version, the in-app Build: string, and the
        filename in the shipping docs must all agree.
     2. Every SHA-256 printed in a doc must be the REAL hash of the
        installer sitting in release/.
     3. The docs must not still be naming an older installer.

   Run:  npm run verify:release
   Exit 0 means the docs and the artifact tell the same story. It does
   NOT mean the release is published — only a human can do that, and
   SHIPPING-THE-BETA.md has the command.
   ================================================================ */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

const problems = [];
const bad = m => problems.push(m);

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = pkg.version;
const installer = `release/Sand Pavilion Setup ${version}.exe`;

/* 1 — the in-app build string must match package.json, or a tester's bug
       report is labelled with the wrong build and is worth much less. */
const overlays = readFileSync('src/game/ui/overlays.js', 'utf8');
/* Two legal shapes, and the DERIVED one is the one we want.

   This check used to accept only a literal — `'Build:      0.1.0-beta.3'` —
   and on 2026-08-04 that literal had drifted a whole version behind
   package.json. Catching it was the check working. The fix was to stop
   typing the version twice: vite.config.js reads package.json and defines
   __APP_VERSION__, so drift is now impossible rather than merely detected.

   So: accept the derived form and stop looking (there is nothing left that
   CAN disagree), and keep the literal comparison for anyone who types one
   back in. Rule 4 — derive any list that must match another file. */
if (/__APP_VERSION__/.test(overlays)) {
  if (!/define/.test(readFileSync('vite.config.js', 'utf8'))
      || !/__APP_VERSION__/.test(readFileSync('vite.config.js', 'utf8'))) {
    bad('overlays.js uses __APP_VERSION__ but vite.config.js does not define it — the build number would read "dev" in the shipped app');
  }
} else {
  const buildLine = overlays.match(/'Build:\s+([0-9][^']*)'/);
  if (!buildLine) bad("overlays.js: couldn't find the 'Build: …' line the feedback composer stamps on a report");
  else if (buildLine[1].trim() !== version) {
    bad(`overlays.js says Build: ${buildLine[1].trim()} but package.json says ${version} — every bug report would carry the wrong build number`);
  }
}

/* 2 — the installer the docs describe must exist, and every hash printed
       anywhere must be ITS hash. */
const DOCS = ['plans/SHIPPING-THE-BETA.md', 'plans/BETA-RELEASE-NOTES.md'];

if (!existsSync(installer)) {
  const found = existsSync('release') ? readdirSync('release').filter(f => f.endsWith('.exe')) : [];
  bad(`no installer at "${installer}" for version ${version}`
    + (found.length ? ` — release/ holds: ${found.join(', ')}. Build it, or the docs describe a file nobody can download.` : ' — release/ has no .exe at all.'));
} else {
  /* ★ A SIZE CEILING, ADDED 2026-08-16 BECAUSE THIS GATE CERTIFIED A 977 MB
     INSTALLER AND SAID NOTHING.

     Everything below checks that the docs AGREE with the artifact. Nothing
     checked whether the artifact was sane. A build-config change moved four
     exclusions into `build.win.files`, electron-builder's "an all-negative
     files array implies **\/*" rule quietly defeated the top-level allow-list,
     and the previous `release/win-unpacked` (225 MB) was packed inside the new
     app.asar. 116 MB → 977 MB. The hash matched itself perfectly, so this
     script printed a green tick over a download nobody could use.

     The ceiling is deliberately generous — it is a tripwire for a regression
     of this shape, not a budget. Kokoro's arrival was a legitimate +15 MB and
     must not need this number touched; a doubling always wants a human. */
  const MAX_MB = 260;
  const sizeMB = readFileSync(installer).length / 1048576;
  if (sizeMB > MAX_MB) {
    bad(`${installer} is ${sizeMB.toFixed(0)} MB, over the ${MAX_MB} MB ceiling. Something is being `
      + 'packed that should not be — check `build.files`, and remember that release/ is only '
      + 'auto-excluded when it IS the output directory (building to $TEMP makes it an ordinary '
      + 'folder). Raise this number only with a reason worth writing down.');
  }

  /* ★ AND THE SIZE A DOC PROMISES MUST BE THE SIZE ON DISK.
     `docs/FRESH-INSTALL.md` told testers to download a 101 MB file for four
     days after it became 116 MB. Small, and the same shape as every other
     fault this script exists for: a person following the instructions meets
     something other than what they were told.

     ⚠ THIS IS THE THIRD TIME THAT SHAPE HAS SHOWN UP IN ONE DAY — the 977 MB
     installer the hash check happily certified, the release notes that never
     mentioned the largest feature in the build, and this. Every other check
     here asks whether the docs agree with the artifact's IDENTITY (version,
     filename, hash, age). Almost none asks whether they DESCRIBE it. Worth
     remembering the next time this file is extended.

     ±3 MB, because a doc that rounds is not lying. */
  for (const d of ['docs/FRESH-INSTALL.md', 'plans/BETA-RELEASE-NOTES.md']) {
    if (!existsSync(d)) continue;
    const text = readFileSync(d, 'utf8');
    const m = new RegExp('Setup ' + version.replace(/\./g, '\\.') + '\\.exe`?\\s*\\((\\d+)\\s*MB\\)')
      .exec(text);
    if (!m) continue;
    const claimed = Number(m[1]);
    if (Math.abs(claimed - sizeMB) > 3) {
      bad(`${d} tells a tester to download a ${claimed} MB file; it is ${sizeMB.toFixed(0)} MB. `
        + 'They will wonder what they actually got.');
    }
  }

  const real = createHash('sha256').update(readFileSync(installer)).digest('hex').toUpperCase();
  let sawOne = false;
  for (const d of DOCS) {
    if (!existsSync(d)) continue;
    const text = readFileSync(d, 'utf8');
    for (const m of text.matchAll(/\b[A-Fa-f0-9]{64}\b/g)) {
      sawOne = true;
      if (m[0].toUpperCase() !== real) {
        bad(`${d} prints SHA-256 ${m[0].slice(0, 12)}… but ${installer} actually hashes to ${real.slice(0, 12)}… — a tester following these instructions concludes the download was tampered with`);
      }
    }
    if (!text.includes(version)) {
      bad(`${d} never mentions version ${version} — it is describing a build we are no longer shipping`);
    }
    // An older installer name left behind is how the wrong file gets attached.
    for (const m of text.matchAll(/Sand Pavilion Setup (0\.[0-9][^.]*\.[0-9-a-z.]*?)\.exe/g)) {
      if (m[1] !== version) bad(`${d} still names "Sand Pavilion Setup ${m[1]}.exe" — stale, and exactly how the wrong binary gets published under a new tag`);
    }
  }
  if (!sawOne) bad(`neither shipping doc prints a SHA-256 — testers are told to verify and given nothing to verify against`);

  /* 3 — IS THE INSTALLER OLDER THAN THE CODE?
     Added hours after the rest, because the rest was not enough. This script
     already proved the docs matched the .exe — and the .exe was an hour stale,
     missing two whole commits, one click away from being published. Hash
     agreement is not freshness: docs and binary can agree perfectly with each
     other and both be wrong about the source.

     So: no tracked file under src/ or electron/ may be newer than the
     installer. Uses git's own list rather than a directory walk, so an
     untracked scratch file cannot trip it. */
  try {
    const built = statSync(installer).mtimeMs;
    const tracked = execSync('git ls-files src electron index.html package.json', { encoding: 'utf8' })
      .split('\n').map(f => f.trim()).filter(Boolean);
    const newer = tracked
      .filter(f => existsSync(f) && statSync(f).mtimeMs > built + 1000)
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
    if (newer.length) {
      const when = new Date(built).toISOString().slice(0, 16).replace('T', ' ');
      bad(`the installer was built ${when} but ${newer.length} source file(s) have changed since — `
        + `${newer.slice(0, 3).join(', ')}${newer.length > 3 ? ', …' : ''}. `
        + `Publishing this ships code that is not the code in the repo, which is the exact fault that put a `
        + `data-loss bug in front of testers on 2026-07-28. Rebuild.`);
    }
  } catch (e) {
    bad(`could not compare the installer's age against the source (${e.message}) — check by hand before publishing`);
  }
}

if (problems.length) {
  console.error(`\n✗ release docs do not match the artifact (${problems.length}):\n`);
  for (const p of problems) console.error('  - ' + p);
  console.error('\nFix the docs, or rebuild, before publishing anything.\n');
  process.exit(1);
}
console.log(`✓ release docs match the artifact — ${installer}, version ${version}, hash verified.`);
