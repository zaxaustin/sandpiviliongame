/* ================================================================
   [KOKORO VOICES] — the four that ship, and the ONE place they are named.

   kokoro-js carries all 54 voice embeddings inside its own npm package
   (512 KB each, 28 MB in total) and reads them off its own directory at
   synthesis time. Shipping all of them would put 28 MB of voices nobody
   picked into an installer, against a standing decision that the model
   files download on first use rather than riding along.

   So package.json's `files` glob keeps exactly these four and drops the
   rest. THAT GLOB AND THIS LIST MUST AGREE, and a list in a build config
   that must match a list in code is rule 4's exact shape — so `npm test`
   derives the check from this file. Add a voice here, forget the glob,
   and the suite says so before a build does.

   THE PICKS, and the reasoning is recorded because "why these four" is
   the question a future session will ask. Grades are the model card's
   own, measured against its training targets:

     af_heart    A     the best-rated voice in the set
     af_bella    A-    the other strong one, warmer and more animated
     am_michael  C+    the steadiest male. am_puck is playful and
                       am_fenrir dramatic — wrong for a chapter
     bf_emma     B-    en-GB, and the highest-graded voice that is not
                       American. A different ACCENT is more real variety
                       per megabyte than a fourth US voice, and it suits
                       the register of this place

   ⚠ af_nicole grades the same as bf_emma and was left out on purpose:
   its trait is 🎧, an ASMR/whisper voice, which is a poor way to be read
   a book for an hour.

   Plain CommonJS with no requires, so the main process, the packaging
   guard and the test suite can all read the same file.
   ================================================================ */
const KOKORO_VOICES = [
  { id: 'af_heart',   name: 'Heart',   lang: 'en-US', gender: 'female',
    note: 'The best of them. Warm, even, unhurried.' },
  { id: 'af_bella',   name: 'Bella',   lang: 'en-US', gender: 'female',
    note: 'More animated — better for dialogue than for a long chapter.' },
  { id: 'am_michael', name: 'Michael', lang: 'en-US', gender: 'male',
    note: 'Steady and plain. The one to pick for hours of reading.' },
  { id: 'bf_emma',    name: 'Emma',    lang: 'en-GB', gender: 'female',
    note: 'British. A different voice rather than a different American.' },
];

/* The default when someone turns Kokoro on without choosing. Named rather
   than "the first one", so reordering the list above cannot silently
   change what everybody hears. */
const KOKORO_DEFAULT_VOICE = 'af_heart';

const isShippedVoice = id => KOKORO_VOICES.some(v => v.id === id);

module.exports = { KOKORO_VOICES, KOKORO_DEFAULT_VOICE, isShippedVoice };
