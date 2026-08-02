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
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const problems = [];
const bad = m => problems.push(m);

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const version = pkg.version;
const installer = `release/Sand Pavilion Setup ${version}.exe`;

/* 1 — the in-app build string must match package.json, or a tester's bug
       report is labelled with the wrong build and is worth much less. */
const overlays = readFileSync('src/game/ui/overlays.js', 'utf8');
const buildLine = overlays.match(/'Build:\s+([0-9][^']*)'/);
if (!buildLine) bad("overlays.js: couldn't find the 'Build: …' line the feedback composer stamps on a report");
else if (buildLine[1].trim() !== version) {
  bad(`overlays.js says Build: ${buildLine[1].trim()} but package.json says ${version} — every bug report would carry the wrong build number`);
}

/* 2 — the installer the docs describe must exist, and every hash printed
       anywhere must be ITS hash. */
const DOCS = ['plans/SHIPPING-THE-BETA.md', 'plans/BETA-RELEASE-NOTES.md'];

if (!existsSync(installer)) {
  const found = existsSync('release') ? readdirSync('release').filter(f => f.endsWith('.exe')) : [];
  bad(`no installer at "${installer}" for version ${version}`
    + (found.length ? ` — release/ holds: ${found.join(', ')}. Build it, or the docs describe a file nobody can download.` : ' — release/ has no .exe at all.'));
} else {
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
}

if (problems.length) {
  console.error(`\n✗ release docs do not match the artifact (${problems.length}):\n`);
  for (const p of problems) console.error('  - ' + p);
  console.error('\nFix the docs, or rebuild, before publishing anything.\n');
  process.exit(1);
}
console.log(`✓ release docs match the artifact — ${installer}, version ${version}, hash verified.`);
