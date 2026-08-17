/* ================================================================
   [KOKORO, RENDERER SIDE] — the second read-aloud engine.

   `tts.js` owns the public interface and routes to one of two backends.
   This is the second one: it asks the main process for one sentence of
   audio at a time and plays it through WebAudio. It never touches the
   model, the network or the disk — `electron/kokoro.cjs` does all of
   that, and this file would work identically against any engine that
   returned PCM.

   ⚠ THE HARD PART IS NOT AUDIO, IT IS THE SHAPE OF THE OLD INTERFACE.
   `speak()` returns a boolean SYNCHRONOUSLY and `isSpeaking()` is polled
   eighteen times across overlays.js to draw button labels. Neural
   synthesis is asynchronous and the first sentence takes ~2.5 s. If
   `isSpeaking()` only became true once audio actually started, every
   "🔊 Read it to me" button in the Pavilion would sit there unchanged
   for two and a half seconds after being pressed, and people would press
   it again. So `play.on` is set SYNCHRONOUSLY on the way in, before any
   await, and everything asynchronous happens behind it.

   THE OTHER HALF OF THAT: the wait has to be visible. Machine latency is
   a cost, never dressed up as pace (CLAUDE.md rule 9), so the pocket card
   reads "warming the voice…" until the first sentence lands rather than
   showing a fake progress bar or silence.

   POSITION IS EXACT HERE, WHICH IT NEVER WAS BEFORE. The system engine
   estimates a character offset from CHARS_PER_SEC = 14 because the Web
   Speech API cannot seek. Every chunk from Kokoro arrives with the exact
   text it was made from, so `played + elapsed` is a real number and a
   ±10 s skip lands where it says it does.
   ================================================================ */

const bridge = () => (typeof window !== 'undefined' && window.desktopBridge) || null;
export function kokoroAvailable() { return !!(bridge() && bridge().kokoroStart); }

/* ---------- one reading at a time ---------- */
const play = {
  on: false,          // set SYNCHRONOUSLY by speak(); the whole interface hangs off it
  warming: false,     // pressed, but the first sentence has not arrived
  jobId: null,
  ctx: null,
  src: null,          // the AudioBufferSourceNode currently sounding
  queue: [],          // decoded chunks waiting their turn: {buf, text, chars}
  done: false,        // main said there are no more sentences
  fullText: '',
  charsBefore: 0,     // characters covered by chunks already finished
  chunkChars: 0,      // characters in the chunk now playing
  startedAt: 0,       // ctx.currentTime when the current chunk began
  offsetIn: 0,        // seconds into the current chunk when it began (after a pause/seek)
  cur: null,          // the chunk now playing
  paused: null,       // { buf, text, chars, offset } while parked
  endCb: null,
  rate: 1,
  voice: null,
  error: null,
};

function ctx() {
  if (!play.ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    play.ctx = new AC();
  }
  /* Chrome suspends a context created before a gesture. Every path into
     here is a button press, so resuming is safe and is what makes the
     first press work rather than the second. */
  if (play.ctx.state === 'suspended') play.ctx.resume().catch(() => {});
  return play.ctx;
}

/* PCM in, AudioBuffer out. Main sends Int16 at 24 kHz mono. */
function toBuffer(pcm, sampleRate) {
  const i16 = new Int16Array(pcm.buffer || pcm, pcm.byteOffset || 0,
    (pcm.byteLength || pcm.length) / 2);
  const buf = ctx().createBuffer(1, i16.length, sampleRate);
  const out = buf.getChannelData(0);
  for (let i = 0; i < i16.length; i++) out[i] = i16[i] / 32768;
  return buf;
}

/* ---------- the pull loop ----------
   Asks main for the next sentence and keeps asking. It runs AHEAD of
   playback — measured at 0.76x real time, so after the first sentence the
   generator is several seconds in front and the listener never waits
   again. One sentence of lookahead is deliberately all we keep: a whole
   chapter of audio buffered in memory is 100 MB for no benefit, since
   nobody can hear ahead of themselves. */
async function pump() {
  const b = bridge();
  while (play.on && !play.done && play.jobId != null) {
    /* Two chunks in hand is enough to cover any gap. Stop asking until
       one is consumed — the generator sits idle rather than racing. */
    if (play.queue.length >= 2) { await new Promise(r => setTimeout(r, 120)); continue; }
    let res;
    try { res = await b.kokoroNext(play.jobId); }
    catch (e) { res = { ok: false, error: String(e) }; }
    if (!play.on) return;                       // stopped while we waited
    if (!res || !res.ok) { play.error = (res && res.error) || 'the voice stopped answering'; play.done = true; break; }
    if (res.done) { play.done = true; break; }
    play.queue.push({ buf: toBuffer(res.pcm, res.sampleRate), text: res.text, chars: (res.text || '').length });
    if (!play.src && !play.paused) playNext();
  }
  /* If generation finished and nothing is sounding, the reading is over. */
  if (play.done && !play.src && !play.queue.length && !play.paused) finish();
}

function playNext() {
  if (!play.on || play.paused) return;
  const chunk = play.queue.shift();
  if (!chunk) {
    if (play.done) finish();
    return;
  }
  startChunk(chunk, 0);
}

function startChunk(chunk, offset) {
  const c = ctx();
  const src = c.createBufferSource();
  src.buffer = chunk.buf;
  src.playbackRate.value = play.rate;
  src.connect(c.destination);
  src.onended = () => {
    /* ⚠ onended ALSO fires on our own stop(). The system engine has this
       exact scar written into stopSpeaking(): a cancel that fires the end
       callback set off a cascade that read a whole book. Here the guard is
       identity — if this is no longer the current source, we caused it. */
    if (play.src !== src) return;
    play.src = null;
    play.charsBefore += play.chunkChars;
    play.chunkChars = 0;
    play.cur = null;
    if (play.on) playNext();
  };
  play.src = src;
  play.cur = chunk;
  play.chunkChars = chunk.chars;
  play.warming = false;
  play.offsetIn = offset;
  play.startedAt = c.currentTime;
  src.start(0, Math.max(0, Math.min(offset, chunk.buf.duration - 0.01)));
}

function killSource() {
  const s = play.src;
  play.src = null;                 // clear FIRST so onended knows it was us
  if (s) { try { s.onended = null; s.stop(); } catch (e) {} }
}

function finish() {
  const cb = play.endCb;
  reset();
  if (cb) cb();
}

function reset() {
  const b = bridge();
  if (b && play.jobId != null) { try { b.kokoroStop(play.jobId); } catch (e) {} }
  killSource();
  play.on = false; play.warming = false; play.jobId = null;
  play.queue = []; play.done = false; play.cur = null; play.paused = null;
  play.fullText = ''; play.charsBefore = 0; play.chunkChars = 0;
  play.offsetIn = 0; play.startedAt = 0; play.endCb = null;
}

/* ---------- what tts.js calls ---------- */

/* SYNCHRONOUS RETURN, ASYNCHRONOUS WORK. See the header. */
export function kSpeak(text, onEnd, opts) {
  if (!kokoroAvailable()) return false;
  kStop();
  const clean = String(text == null ? '' : text);
  if (!clean.trim()) { if (onEnd) onEnd(); return true; }
  play.on = true;                 // ← before any await, so the buttons flip now
  play.warming = true;
  play.fullText = clean;
  play.endCb = onEnd || null;
  play.rate = (opts && opts.rate) || 1;
  play.voice = (opts && opts.voice) || null;
  play.error = null;
  (async () => {
    const b = bridge();
    let res;
    try { res = await b.kokoroStart(clean, play.voice); }
    catch (e) { res = { ok: false, error: String(e) }; }
    if (!play.on) return;                       // stopped during the warm-up
    if (!res || !res.ok) {
      /* LOUD, AND IT HANDS BACK CONTROL. tts.js turns this into a visible
         line and falls the *next* press back to the system voice rather
         than silently reading nothing. */
      play.error = (res && res.error) || 'the voice could not start';
      play.warming = false;
      finish();
      return;
    }
    play.jobId = res.jobId;
    pump();
  })();
  return true;
}

export function kStop() {
  if (!play.on && !play.paused) return;
  const b = bridge();
  if (b && play.jobId != null) { try { b.kokoroStop(play.jobId); } catch (e) {} }
  killSource();
  reset();
}

export function kSpeaking() { return play.on; }
export function kWarming() { return play.warming; }
export function kPaused() { return !!play.paused; }
export function kError() { return play.error; }

/* WHERE WE ARE, IN SECONDS INTO THE CURRENT CHUNK. */
function elapsedIn() {
  if (!play.cur) return 0;
  if (play.paused) return play.paused.offset;
  return play.offsetIn + Math.max(0, (ctx().currentTime - play.startedAt) * play.rate);
}

export function kPause() {
  if (!play.on || !play.cur || play.paused) return false;
  /* Park the exact chunk and the exact second. The system engine has to
     re-synthesise from a guessed character offset; here the audio is
     already in hand, so a resume is exact and instant. */
  play.paused = { buf: play.cur.buf, text: play.cur.text, chars: play.cur.chars,
                   offset: elapsedIn() };
  killSource();
  return true;
}

export function kResume() {
  if (!play.paused) return false;
  const p = play.paused;
  play.paused = null;
  play.on = true;
  startChunk({ buf: p.buf, text: p.text, chars: p.chars }, p.offset);
  if (!play.done) pump();
  return true;
}

/* HOW FAR THROUGH, 0..1 — by characters, so it means the same thing the
   system engine's number means and the pocket card needs no special case. */
export function kProgress() {
  if (!play.fullText) return 0;
  const within = play.cur && play.cur.buf.duration
    ? (elapsedIn() / play.cur.buf.duration) * play.chunkChars : 0;
  const at = play.charsBefore + within;
  return Math.max(0, Math.min(1, at / Math.max(1, play.fullText.length)));
}

/* ±10 SECONDS, AND HERE IT IS REAL. Within the sentence being spoken this
   is exact. Past its edges we can only move to the start of the sentence
   we have — going further back would mean re-synthesising text already
   discarded, and a skip that silently did nothing is worse than one that
   lands at a sentence boundary, so it says which it did. */
export function kSkip(seconds) {
  if (!play.on || !play.cur) return false;
  const dur = play.cur.buf.duration;
  const target = elapsedIn() + seconds;
  if (target < 0) { killSource(); startChunk(play.cur, 0); return true; }
  if (target >= dur) {
    /* Forward past the end of this sentence: drop it and take the next. */
    killSource();
    play.charsBefore += play.chunkChars;
    play.chunkChars = 0; play.cur = null;
    playNext();
    return true;
  }
  killSource();
  startChunk(play.cur, target);
  return true;
}

export function kCanSkip() { return play.on && !!play.cur; }
export function kSetRate(r) {
  play.rate = Number(r) || 1;
  if (play.src) { try { play.src.playbackRate.value = play.rate; } catch (e) {} }
}
