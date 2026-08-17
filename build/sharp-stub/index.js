/* ================================================================
   [SHARP — STUB] and this file is entirely deliberate.

   `@huggingface/transformers` hard-requires `sharp` at import time for its
   IMAGE pipelines. The Sand Pavilion uses exactly one thing from that
   library — Kokoro, a text-to-speech model — which never decodes an image
   in its life. The real package costs **20 MB** of platform-specific
   native codecs (`sharp` + `@img/*`) in the installer, for code that
   cannot run.

   Removing it outright is not an option: `sharp/lib/constructor.js`
   requires `@img/...` on load, so the import dies with
   ERR_MODULE_NOT_FOUND and takes the voice with it. MEASURED — that exact
   failure, then this stub, then a clean synthesis, before either was
   written into the build config.

   ⚠ IT THROWS RATHER THAN RETURNING SOMETHING PLAUSIBLE. If a future
   feature genuinely needs image processing, it must fail here, loudly, on
   the first call — with a message naming this file. A stub that quietly
   returned an empty object would produce a broken image somewhere far
   away, which is the silent failure this house is named for.

   package.json's `files` drops the real one and maps this directory over
   the top; `npm test` fails if either half goes missing.
   ================================================================ */
function sharp() {
  throw new Error(
    'sharp is stubbed in the Sand Pavilion (build/sharp-stub). Image pipelines are not '
    + 'shipped — only the Kokoro text-to-speech model uses @huggingface/transformers here. '
    + 'If you need images, remove the exclusion in package.json "files" and delete this stub.');
}
/* The three no-op knobs transformers.js touches on load. They are read for
   configuration, never for a result, so answering them is honest. */
sharp.cache = () => ({ memory: {}, files: {}, items: {} });
sharp.concurrency = () => 1;
sharp.simd = () => false;
sharp.format = {};
sharp.versions = { sharp: '0.34.5-stub' };

module.exports = sharp;
module.exports.default = sharp;
