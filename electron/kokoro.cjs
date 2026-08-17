/* ================================================================
   [KOKORO] — a neural voice, in the main process, on the CPU.

   WHY MAIN AND NOT THE RENDERER, since that is the first question:
   the renderer is `sandbox:true`, `contextIsolation:true` and loads over
   `file://` in the packaged app, where Chromium refuses to fetch()
   file:// URLs — so neither the ONNX runtime's WASM nor the 88 MB model
   could be loaded there without a custom protocol handler. `db.cjs`
   already settled this shape for PGlite: heavy local compute lives here,
   the renderer asks over IPC and knows nothing about how it is done.

   MEASURED BEFORE IT WAS BUILT (2026-08-15, ornith-class CPU, this box):

     warm load                0.6 s
     first audio, streamed    2.5 s   ← the wait a person actually feels
     real-time factor         0.56-0.80x
     after chunk one          6.4 s AHEAD of the listener, and widening
     model on disk            88.1 MB, one file, q8
     offline                  proven by replacing fetch() with a throw

   ⚠ THE WASM BACKEND WAS TRIED FIRST AND DOES NOT EXIST HERE.
   `device:'wasm'` returns "Should be one of: dml, cpu" — transformers.js
   registers only the native providers under Node — and deleting
   onnxruntime-node is a hard ERR_MODULE_NOT_FOUND rather than a
   fallback. Reaching WASM would mean tricking transformers.js into
   thinking it is a browser, which also flips kokoro-js's voice loader
   from readFile() to fetch()+caches, neither of which exists in main.
   Do not re-attempt without reading this paragraph.

   ⚠ AND DirectML IS BROKEN ON THIS MODEL, not merely unnecessary:
   `device:'dml'` dies with "Non-zero status code returned while running
   ConvTranspose node". Its 17.7 MB DLL is excluded in package.json for
   that reason, so CPU is not a default — it is the only one that works.
   ================================================================ */
const path = require('node:path');
const fsp = require('node:fs/promises');

const { KOKORO_VOICES, KOKORO_DEFAULT_VOICE, isShippedVoice } = require('./kokoro-voices.cjs');

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const DTYPE = 'q8';          // 88 MB. fp32 is 326 MB for a difference nobody asked for.

/* ---------------------------------------------------------------
   STATE. One engine, one job at a time — a second reading voice
   talking over the first is not a feature anyone wants, and the
   renderer's own tts.js already enforces one-at-a-time above this.  */
let tts = null;                 // the loaded model, once
let loading = null;             // the in-flight load promise, so two presses share one download
let status = { state: 'idle', pct: 0, error: null, bytes: 0, total: 0 };
let jobs = new Map();           // id -> { gen, splitter, cancelled }
let nextJob = 1;
let userDataDir = null;         // injected by main.cjs; this file never requires electron

/* WHERE THE MODEL LIVES. Under userData, beside the database and the
   book text — never in the installer, and removable by deleting one
   folder, which is the whole of "reversible" at the disk level. */
function modelDir() {
  return path.join(userDataDir || process.cwd(), 'kokoro');
}
function init(dir) { userDataDir = dir; }

/* ---------------------------------------------------------------
   IS IT ALREADY HERE? Asked before anything is downloaded, so the
   panel can say "88 MB will be downloaded" or "ready, offline"
   truthfully rather than optimistically.

   It looks for the actual weights on disk rather than a marker file
   we wrote ourselves: a marker says what we believed last time, and
   this says what is true now. A half-finished download leaves the
   directory there and the .onnx absent, which reads correctly as
   "not installed" instead of "installed and broken".                */
async function findModelFile() {
  const root = path.join(modelDir(), MODEL_ID.replace('/', path.sep), 'onnx');
  for (const name of ['model_quantized.onnx', 'model_q8f16.onnx', 'model.onnx']) {
    try {
      const st = await fsp.stat(path.join(root, name));
      if (st.size > 1024 * 1024) return { path: path.join(root, name), size: st.size };
    } catch (e) { /* not this one */ }
  }
  return null;
}

async function state() {
  const found = await findModelFile();
  return {
    installed: !!found,
    sizeMB: found ? Math.round(found.size / 1048576) : 0,
    loaded: !!tts,
    dir: modelDir(),
    voices: KOKORO_VOICES,
    defaultVoice: KOKORO_DEFAULT_VOICE,
    downloadMB: 88,
    ...status,
  };
}

/* ---------------------------------------------------------------
   LOADING, AND THE ONE PLACE THE NETWORK IS ALLOWED.

   `allowRemote` is false everywhere except an explicit, pressed
   install. After that the engine physically cannot reach out: a
   synthesis that silently re-downloaded a file would break the
   promise this whole feature is sold on, and "it worked on my
   machine, which had already downloaded it" is exactly how that ships
   unnoticed.                                                        */
async function load({ allowRemote = false, onProgress = null } = {}) {
  if (tts) return tts;
  if (loading) return loading;
  loading = (async () => {
    const { env } = await import('@huggingface/transformers');
    env.cacheDir = modelDir();
    env.allowLocalModels = true;
    env.allowRemoteModels = !!allowRemote;
    /* Threads: leave one core for the rest of the machine. The steward's
       box is cooling-limited (a standing note in CLAUDE.md), and a voice
       that pins every core to read a paragraph is a bad neighbour to the
       local model answering in the next room. */
    try {
      const cpus = require('node:os').cpus().length || 4;
      env.backends.onnx.node = env.backends.onnx.node || {};
      env.backends.onnx.numThreads = Math.max(1, Math.min(4, cpus - 1));
    } catch (e) { /* the default is fine */ }

    const { KokoroTTS } = await import('kokoro-js');
    const model = await KokoroTTS.from_pretrained(MODEL_ID, {
      dtype: DTYPE,
      device: 'cpu',
      progress_callback: onProgress || undefined,
    });
    tts = model;
    return model;
  })();
  try { return await loading; }
  finally { loading = null; }
}

/* THE ONE PRESS THAT IS ALLOWED TO USE THE NETWORK. Downloads the
   weights into userData and reports progress by polling rather than by
   pushing events — the renderer asks `status()` while its panel is
   open, which is the shape refreshAIStatus already uses and needs no
   new channel. */
async function install() {
  if (status.state === 'downloading') return { ok: true, already: true };
  status = { state: 'downloading', pct: 0, error: null, bytes: 0, total: 0 };
  try {
    await load({
      allowRemote: true,
      onProgress: (p) => {
        if (!p || p.status !== 'progress') return;
        status.pct = Math.max(status.pct, Math.round(p.progress || 0));
        status.bytes = p.loaded || 0;
        status.total = p.total || 0;
      },
    });
    const found = await findModelFile();
    if (!found) throw new Error('the download finished but no model file is on disk');
    status = { state: 'ready', pct: 100, error: null, bytes: found.size, total: found.size };
    return { ok: true };
  } catch (e) {
    /* LOUD, AND IT KEEPS THE REASON. A voice that quietly stays on the
       system engine after a failed download is the house failure mode. */
    tts = null;
    status = { state: 'failed', pct: 0, error: String(e && e.message || e), bytes: 0, total: 0 };
    return { ok: false, error: status.error };
  }
}

/* REMOVING IT IS ONE PRESS AND ONE DIRECTORY, because "reversible" has
   to mean the disk too, not just a setting that stops reading it. */
async function remove() {
  try {
    tts = null;
    status = { state: 'idle', pct: 0, error: null, bytes: 0, total: 0 };
    await fsp.rm(modelDir(), { recursive: true, force: true });
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
}

/* ---------------------------------------------------------------
   SPEAKING, ONE SENTENCE AT A TIME.

   ⚠ TextSplitterStream + close(), AND THE close() IS LOAD-BEARING.
   Handed a plain string, `stream()` emitted three of four sentences and
   then hung on an unsettled await — the splitter waits for input that
   never arrives. Measured on a real paragraph before any of this was
   written. A reader that stops mid-paragraph with no error is precisely
   the silent failure this project keeps paying for, so the splitter is
   always driven explicitly and always closed.

   Chunks are pulled one at a time by the renderer rather than pushed,
   which keeps this a plain request/response bridge like every other
   handler in main.cjs. At 0.76x real time the renderer is generating
   the next sentence long before the current one finishes playing.     */
async function start({ text, voice }) {
  const clean = String(text == null ? '' : text).trim();
  if (!clean) return { ok: false, error: 'nothing to read' };
  const v = isShippedVoice(voice) ? voice : KOKORO_DEFAULT_VOICE;
  let model;
  try { model = await load({ allowRemote: false }); }
  catch (e) {
    return { ok: false, error: 'the voice is not installed on this machine yet', needsInstall: true };
  }
  const { TextSplitterStream } = await import('kokoro-js');
  const splitter = new TextSplitterStream();
  splitter.push(clean);
  splitter.close();                     // ⚠ see above — without this it hangs
  const id = nextJob++;
  jobs.set(id, { gen: model.stream(splitter, { voice: v }), cancelled: false, voice: v });
  return { ok: true, jobId: id, voice: v, chars: clean.length };
}

/* The next sentence, as 16-bit PCM. Int16 rather than Float32 halves what
   crosses the bridge for no audible difference — 24 kHz mono, and the
   renderer widens it back out into an AudioBuffer. */
async function next(jobId) {
  const job = jobs.get(jobId);
  if (!job) return { ok: false, error: 'no such reading' };
  if (job.cancelled) { jobs.delete(jobId); return { ok: true, done: true }; }
  try {
    const { value, done } = await job.gen.next();
    if (done || !value) { jobs.delete(jobId); return { ok: true, done: true }; }
    const f32 = value.audio.audio;
    const i16 = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) {
      const s = f32[i] < -1 ? -1 : f32[i] > 1 ? 1 : f32[i];
      i16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return {
      ok: true, done: false,
      text: value.text,
      pcm: Buffer.from(i16.buffer, i16.byteOffset, i16.byteLength),
      sampleRate: value.audio.sampling_rate,
      samples: f32.length,
    };
  } catch (e) {
    jobs.delete(jobId);
    return { ok: false, error: String(e && e.message || e) };
  }
}

/* ---------------------------------------------------------------
   ★ CAN THIS COMPUTER ACTUALLY KEEP UP?

   Everything about this feature was measured on one i9 with plenty of
   cooling. Synthesis is CPU-only, so on a thin laptop the real-time
   factor can cross 1.0 — at which point the voice cannot generate the
   next sentence before the current one finishes, and the reading pauses
   mid-paragraph. It does not crash and it prints no error: it simply
   stutters, which a person reasonably reads as "this feature is broken"
   rather than "this machine is slow".

   So the Pavilion asks the machine, exactly as `machineInfo()` already
   does for the local model — one press, a fixed sentence, a real number,
   and a plain verdict. Deterministic, and it costs one sentence.

   ⚠ THE SECOND SENTENCE IS THE HONEST ONE. The first generate() of a
   session pays graph warm-up that never recurs, so timing it alone would
   libel every machine. Two are run and the first is discarded.          */
const BENCH_TEXT = 'The evening is long enough for one more chapter, and the lamp is already lit.';
async function bench() {
  try { await load({ allowRemote: false }); }
  catch (e) { return { ok: false, error: 'not installed', needsInstall: true }; }
  const run = async () => {
    const j = await start({ text: BENCH_TEXT, voice: KOKORO_DEFAULT_VOICE });
    if (!j.ok) throw new Error(j.error || 'could not start');
    const t = Date.now();
    let samples = 0, rate = 24000;
    for (;;) {
      const c = await next(j.jobId);
      if (!c.ok) throw new Error(c.error || 'stopped');
      if (c.done) break;
      samples += c.samples; rate = c.sampleRate || rate;
    }
    return { wall: (Date.now() - t) / 1000, audio: samples / rate };
  };
  try {
    await run();                       // discarded: warm-up
    const r = await run();
    const rtf = r.audio > 0 ? r.wall / r.audio : 99;
    return {
      ok: true, rtf, wall: r.wall, audio: r.audio,
      /* Three verdicts, and the middle one exists because "it works" and
         "it works on a good day" are different things to be told.

         ⚠ THE THRESHOLDS ARE CALIBRATED AGAINST REAL USE, NOT PICKED.
         First draft: comfortable ≤ 0.80. Then the bench measured 0.81 on the
         steward's i9 — the fastest machine this has ever run on, and the one
         he had just read an entire book on, calling it "a real step up". A
         benchmark that warns the happiest user on the fastest hardware is not
         cautious, it is broken, and it would teach people to ignore it.

         What actually matters is whether the engine GAINS on the listener.
         Anything under 1.0 does: at 0.81 you bank roughly a minute of buffer
         every five minutes of reading, which is why a chapter feels seamless.
         The genuine risk starts when generation and speech are neck and neck,
         because any other load on the machine then tips it into waiting. */
      verdict: rtf <= 0.9 ? 'comfortable' : rtf <= 1.0 ? 'tight' : 'slow',
    };
  } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
}

function stop(jobId) {
  const job = jobs.get(jobId);
  if (job) { job.cancelled = true; jobs.delete(jobId); }
  return { ok: true };
}

module.exports = { init, state, install, remove, start, next, stop, bench, MODEL_ID, modelDir };
