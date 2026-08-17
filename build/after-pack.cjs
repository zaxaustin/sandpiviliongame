/* ================================================================
   [AFTER PACK] — drop the ONNX binaries for platforms this build is not for.

   `onnxruntime-node` ships six platform folders (~208 MB) and a build needs
   exactly one of them (~16 MB on Windows without DirectML). That saving has to
   happen somewhere, and this is the somewhere.

   ⚠ IT IS NOT DONE WITH GLOBS, AND THE REASON COST A 977 MB INSTALLER.

   ⚠ AND NOTE HOW THIS PARAGRAPH IS WRITTEN: a doubled star followed by a
   slash cannot appear in a block comment, because it closes it. The first
   draft of this very comment quoted the offending glob literally and the
   build died with "ReferenceError: darwin is not defined". Globs are spelled
   out in words below rather than shown.

   The obvious build config is a platform-specific exclusion list under
   `build.win.files`. It was written that way on 2026-08-16 and
   the very next installer came out at **977 MB instead of 116 MB**, with the
   PREVIOUS build packed inside the new one (87 entries of
   `release/win-unpacked/` inside `app.asar`).

   The cause is a documented electron-builder rule that is easy to walk into:
   **a `files` array containing only NEGATIVE patterns has `**\/*` implied.**
   So `win.files` did not narrow the common allow-list — it replaced its effect
   with "everything, minus four folders", and `dist/**` + `electron/**` stopped
   being a boundary at all. Every unrelated directory in the repo went in.

   It bit this project rather than a hypothetical one because of the OTHER
   documented workaround: `release/` is normally auto-excluded as the output
   directory, but CLAUDE.md says to build with
   `--config.directories.output=$TEMP/sp-build` to dodge an editor's EPERM lock
   — and that makes `release/` an ordinary project folder holding a 225 MB
   unpacked app. Two safe-looking decisions, one 861 MB regression.

   ⚠ AND `verify:release` WENT GREEN ON IT. The gate checks that the docs' hash
   matches the artifact; it has never checked the artifact's SIZE. It was
   perfectly happy to certify a 977 MB download. A size ceiling now lives in
   `scripts/verify-release-docs.mjs` for that reason.

   So the pruning is done HERE, in real code, after the pack, where the platform
   is a variable rather than a pattern — `context.electronPlatformName` is what
   is actually being built. It cannot widen an allow-list because it does not
   touch one, and it refuses to delete the binaries for the platform it is
   building for.
   ================================================================ */
const fs = require('node:fs/promises');
const path = require('node:path');

/* electron-platform name → the folder in onnxruntime-node/bin/napi-v3 */
const OWN = { win32: 'win32', darwin: 'darwin', linux: 'linux' };
const ALL = ['win32', 'darwin', 'linux'];

async function rm(p) {
  try { await fs.rm(p, { recursive: true, force: true }); return true; }
  catch (e) { return false; }
}
async function sizeOf(dir) {
  let total = 0;
  try {
    for (const e of await fs.readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) total += await sizeOf(p);
      else total += (await fs.stat(p)).size;
    }
  } catch (e) { /* not there */ }
  return total;
}

exports.default = async function afterPack(context) {
  const plat = context.electronPlatformName;
  const own = OWN[plat];
  if (!own) { console.log('  • after-pack: unknown platform ' + plat + ', pruning nothing'); return; }

  /* The unpacked tree, because onnxruntime-node is in asarUnpack — a native
     .node/.dll cannot be loaded from inside an asar. If that ever changes this
     path stops matching and the log below says "nothing found", which is the
     loud version of doing nothing. */
  const roots = [
    path.join(context.appOutDir, 'resources', 'app.asar.unpacked', 'node_modules',
      'onnxruntime-node', 'bin', 'napi-v3'),
    /* macOS buries it a level deeper. */
    path.join(context.appOutDir, context.packager.appInfo.productFilename + '.app',
      'Contents', 'Resources', 'app.asar.unpacked', 'node_modules',
      'onnxruntime-node', 'bin', 'napi-v3'),
  ];

  let touched = false;
  for (const root of roots) {
    const before = await sizeOf(root);
    if (!before) continue;
    touched = true;

    /* 1 · every platform that is not this one */
    for (const other of ALL) {
      if (other === own) continue;                 // ⚠ never our own
      await rm(path.join(root, other));
    }

    /* 2 · DirectML, which is Windows-only AND BROKEN on the Kokoro model —
       `device:'dml'` dies with "Non-zero status code returned while running
       ConvTranspose node". 17.7 MB of a provider that cannot run. */
    for (const arch of ['x64', 'arm64']) {
      await rm(path.join(root, 'win32', arch, 'DirectML.dll'));
    }

    /* 3 · the other architectures of our own platform. Windows builds x64
       only today; a Mac dmg is built per-arch by electron-builder, so
       context.arch tells us which one this pass is for. */
    const archName = { 0: 'ia32', 1: 'x64', 3: 'arm64' }[context.arch];
    if (archName) {
      for (const other of ['x64', 'arm64', 'ia32']) {
        if (other === archName) continue;
        await rm(path.join(root, own, other));
      }
    }

    const after = await sizeOf(root);
    console.log('  • after-pack: onnxruntime pruned to ' + plat + '/' + (archName || '?')
      + ' — ' + (before / 1048576).toFixed(0) + ' MB → ' + (after / 1048576).toFixed(0) + ' MB');
  }

  if (!touched) {
    console.log('  • after-pack: no onnxruntime-node found to prune (is it still asarUnpacked?)');
  }
};
