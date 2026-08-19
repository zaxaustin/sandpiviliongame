/* ================================================================
   [AFTER ARTIFACTS] — record WHICH COMMIT an installer was built from.

   ⚠ THIS EXISTS BECAUSE mtime IS NOT THE PROPERTY THE RELEASE GATE WANTS.

   `verify-release-docs.mjs` check 3 asks a real and important question —
   "is this installer older than the code?" — and answers it by comparing
   file modification times. That was right when it was written and it is
   the wrong instrument, because **git rewrites mtimes**. A `git checkout`,
   a merge, a branch switch: every tracked file gets a fresh mtime and the
   gate reports a stale installer that is in fact byte-for-byte current.

   Measured 2026-08-19: after merging beta 7.1 into main, the gate flagged
   13 source files as "changed since" the build. `git diff` between the
   build commit and HEAD over src/, electron/ and index.html was EMPTY —
   the installer was exactly the code in the repo. A gate that cries wolf
   is worse than no gate: it teaches you to skip it, and the one time it is
   right you will skip it then too.

   So the build now writes down the commit it was made from, and the gate
   compares CONTENT between that commit and HEAD. That is the actual
   question. mtime remains as the fallback for any installer built before
   this hook existed.

   Written next to the artifacts (buildResult.outDir), because builds go to
   $TEMP to dodge an editor's lock on release/ and the stamp has to travel
   back with the .exe.
   ================================================================ */
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const git = (cmd) => {
  try { return execSync('git ' + cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch (e) { return null; }
};

exports.default = async function afterAllArtifactBuild(buildResult) {
  const outDir = buildResult && buildResult.outDir;
  if (!outDir) return [];

  const commit = git('rev-parse HEAD');
  if (!commit) {
    console.log('  • build-stamp: not a git checkout, nothing recorded');
    return [];
  }

  /* ⚠ A DIRTY TREE MAKES THE STAMP A LIE, so it says so rather than
     claiming a commit it does not match. The gate treats a dirty stamp as
     no stamp and falls back to mtime — which is the conservative direction:
     it can only ever complain more, never less. Scoped to the paths the
     gate cares about, so an edited test file does not invalidate a
     perfectly good record of the app's own source. */
  const dirty = git('status --porcelain -- src electron index.html package.json') || '';

  const stamp = {
    commit,
    dirty: dirty.length > 0,
    dirtyFiles: dirty ? dirty.split('\n').map(s => s.trim()).filter(Boolean) : [],
    version: JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).version,
    builtAt: new Date().toISOString(),
  };

  const file = path.join(outDir, 'build-stamp.json');
  fs.writeFileSync(file, JSON.stringify(stamp, null, 2) + '\n');
  console.log('  • build-stamp: ' + commit.slice(0, 7) + (stamp.dirty ? ' (DIRTY TREE — gate will not trust it)' : '')
    + ' -> ' + path.relative(process.cwd(), file));
  return [];
};
