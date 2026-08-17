/* [THE NEURAL VOICE] — the whole path, inside a real Electron app.
   ======================================================================
   Not a browser suite, and that is not optional: the model lives in the
   MAIN process and the renderer reaches it over the desktop bridge, so a
   browser tab can only stub what this exists to prove.

   WHAT IT DRIVES, in order:
     the engine is ABSENT until installed   — and the save says 'system'
     install                                 — 88 MB into a THROWAWAY userData
     ★ the file is really on disk            — read with fs, not believed
     start + pull sentences                  — real PCM, real duration
     ★ the splitter is closed                — 4 sentences, and it ENDS
     ★ synthesis makes NO network call       — proven by breaking fetch
     remove                                   — the directory is gone

   ⚠ userData is redirected to a temp directory, so this can never touch
   the steward's own 88 MB download or his settings — the same precaution
   note-search.cjs and records.cjs take.

   Run:  env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/kokoro-voice.cjs
   ⚠ ELECTRON_RUN_AS_NODE must be UNSET or require('electron') is a string. */
const { app } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-kokoro-'));
app.setPath('userData', tmp);

let failed = 0;
const ok = (name, cond, detail) => {
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (detail ? '  — ' + detail : ''));
  if (!cond) failed++;
};

/* Offline mode is a real command-line switch, so "no network" is enforced by
   Chromium rather than by our own politeness. It is turned on only AFTER the
   download, because the download is the one thing allowed to use it. */
async function main() {
  await app.whenReady();
  const kokoro = require('../../electron/kokoro.cjs');
  const { KOKORO_VOICES, KOKORO_DEFAULT_VOICE } = require('../../electron/kokoro-voices.cjs');
  kokoro.init(tmp);

  console.log('\n1 · Before anything is downloaded\n');
  let st = await kokoro.state();
  ok('the model is not installed on a fresh machine', st.installed === false);
  ok('it says how big the download is, before you press', st.downloadMB === 88, st.downloadMB + ' MB');
  ok('★ exactly four voices are offered', (st.voices || []).length === 4,
     (st.voices || []).map(v => v.id).join(', '));
  ok('the default voice is one of them',
     (st.voices || []).some(v => v.id === st.defaultVoice), st.defaultVoice);

  /* ★ SPEAKING WITHOUT THE MODEL FAILS LOUDLY AND SAYS WHAT TO DO, rather
     than hanging or returning silence — the house failure mode. */
  const cold = await kokoro.start({ text: 'This should not speak.', voice: KOKORO_DEFAULT_VOICE });
  ok('★ speaking before installing is refused, in words', cold.ok === false && !!cold.error,
     cold.error || '(no error given)');
  ok('and it says the fix is to install', cold.needsInstall === true);

  console.log('\n2 · Installing (this downloads 88 MB — the one press allowed to)\n');
  const t0 = Date.now();
  const res = await kokoro.install();
  ok('the download reported success', res.ok === true, res.error || '');
  if (!res.ok) { console.log('\n✗ cannot continue without the model'); return finish(); }
  console.log('     took ' + ((Date.now() - t0) / 1000).toFixed(1) + 's');

  /* ★ READ IT OFF THE DISK. A bridge that returns {ok:true} and writes
     nothing is this project's oldest bug shape. */
  st = await kokoro.state();
  ok('★ the model is really on disk, in OUR directory', st.installed === true, st.dir);
  ok('and it is the size we said', st.sizeMB > 70 && st.sizeMB < 120, st.sizeMB + ' MB');
  const inTmp = st.dir.startsWith(tmp);
  ok('★ it went to userData, not into the app', inTmp, inTmp ? 'throwaway dir' : st.dir);

  console.log('\n3 · Speaking — and the splitter must END\n');
  /* Four sentences on purpose: handed a plain string instead of a closed
     TextSplitterStream, kokoro-js emits three and then hangs forever. If the
     close() is ever removed, this section never returns and the timeout below
     kills the run — which is the loud failure we want. */
  const TEXT = 'The lamp is lit. The evening is long enough for one more chapter. '
             + 'He walked slowly, because nothing was waiting. The window stood open.';
  const started = await kokoro.start({ text: TEXT, voice: 'af_heart' });
  ok('a reading started', started.ok === true, started.error || ('job ' + started.jobId));

  let chunks = 0, samples = 0, sr = 0, bytes = 0;
  const t1 = Date.now();
  for (;;) {
    const c = await kokoro.next(started.jobId);
    if (!c.ok) { ok('a sentence came back', false, c.error); break; }
    if (c.done) break;
    chunks++; samples += c.samples; sr = c.sampleRate; bytes += c.pcm.length;
    if (chunks > 20) { ok('the stream terminates', false, 'more than 20 chunks — runaway'); break; }
  }
  const wall = (Date.now() - t1) / 1000;
  const secs = sr ? samples / sr : 0;
  ok('★ every sentence arrived and the stream ENDED', chunks === 4, chunks + ' chunks');
  ok('it is real audio, at 24 kHz', sr === 24000 && samples > 1000, sr + ' Hz, ' + samples + ' samples');
  ok('the PCM is 16-bit (two bytes a sample)', bytes === samples * 2);
  ok('and it is faster than speech', wall < secs,
     wall.toFixed(1) + 's of compute for ' + secs.toFixed(1) + 's of audio · RTF '
     + (secs ? (wall / secs).toFixed(2) : '?') + 'x');

  console.log('\n4 · ★ Synthesis makes no network call at all\n');
  /* Break the network for real, at the process level, then speak again. */
  const realFetch = global.fetch;
  let calls = 0;
  global.fetch = (...a) => { calls++; throw new Error('NETWORK: ' + a[0]); };
  const off = await kokoro.start({ text: 'Spoken with the network broken.', voice: 'bf_emma' });
  let offChunks = 0;
  if (off.ok) { for (;;) { const c = await kokoro.next(off.jobId); if (!c.ok || c.done) break; offChunks++; } }
  global.fetch = realFetch;
  ok('★ it still spoke with fetch() throwing', off.ok === true && offChunks > 0,
     offChunks + ' chunks');
  ok('★ and it made ZERO network calls', calls === 0, calls + ' calls');

  console.log('\n5 · A voice we do not ship falls back rather than crashing\n');
  const bogus = await kokoro.start({ text: 'Whose voice is this?', voice: 'am_nonexistent' });
  ok('an unknown voice is replaced by the default, not thrown',
     bogus.ok === true && bogus.voice === KOKORO_DEFAULT_VOICE, bogus.voice);
  if (bogus.ok) kokoro.stop(bogus.jobId);

  console.log('\n6 · ★ Asking whether THIS computer can keep up\n');
  /* The whole feature was measured on one fast desktop. On a thin laptop the
     real-time factor can cross 1.0, at which point the voice cannot make the
     next sentence before the current one ends and the reading pauses
     mid-paragraph — silently. This is the press that says so out loud. */
  const bench = await kokoro.bench();
  ok('the check ran', bench.ok === true, bench.error || '');
  ok('it produced a real real-time factor',
     bench.ok && bench.rtf > 0 && bench.rtf < 20,
     bench.ok ? bench.rtf.toFixed(2) + 'x  (' + bench.audio.toFixed(1) + 's of speech in '
                + bench.wall.toFixed(1) + 's)' : '');
  ok('and a verdict a person can act on',
     ['comfortable', 'tight', 'slow'].includes(bench.verdict), bench.verdict);
  /* ★ THE THRESHOLDS ARE THE POINT, so they are checked against the number
     rather than trusted. A benchmark that says "comfortable" whatever it
     measures is worse than none — it is the reassurance that stops a slow
     machine from ever being reported. */
  const expect = bench.rtf <= 0.9 ? 'comfortable' : bench.rtf <= 1.0 ? 'tight' : 'slow';
  ok('★ the verdict follows the measurement, not the other way round',
     bench.verdict === expect, bench.verdict + ' for ' + bench.rtf.toFixed(2) + 'x');

  console.log('\n7 · Removing it is one press and the disk is freed\n');
  const rm = await kokoro.remove();
  ok('remove reported success', rm.ok === true, rm.error || '');
  st = await kokoro.state();
  ok('★ the model is gone from disk', st.installed === false);
  ok('and the directory is really deleted', !fs.existsSync(st.dir), st.dir);

  finish();
}

function finish() {
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
  console.log(failed ? `\n✗ ${failed} failure(s)` : '\n✓ the neural voice holds');
  app.exit(failed ? 1 : 0);
}

/* If the splitter hang ever comes back, this is what turns an infinite wait
   into a red run. */
const KILL = setTimeout(() => {
  console.log('\n✗ TIMED OUT — the most likely cause is a TextSplitterStream that was never '
            + 'closed, which hangs mid-paragraph. See electron/kokoro.cjs.');
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
  app.exit(1);
}, 15 * 60 * 1000);
KILL.unref?.();

main().catch(e => { console.error(e); finish(); });
