/* ================================================================
   [TTS] — read-aloud via the browser's own Web Speech API. Free,
   local, no key, no cloud round-trip — the same "own your data, no
   gate" instinct as everything else here, just applied to a voice.

   Voice + rate are real, persisted settings (BETA-FEEDBACK.md #6) —
   set once via setTTSSettings() (called from entities.js at load,
   and from whatever settings panel lets a visitor pick a voice), read
   by every speak() call after that. Not a new save shape: lives at
   data.ttsSettings, exported/imported with everything else already.

   ---------------------------------------------------------------
   ★ TWO ENGINES, ONE INTERFACE (2026-08-16)

   There is now a second backend — Kokoro, a neural voice running on the
   CPU in the Electron main process (`tts-kokoro.js` and
   `electron/kokoro.cjs`). This file became the router between them and
   NOT ONE EXPORTED SIGNATURE CHANGED, which was the whole requirement:
   overlays.js calls fifteen of these functions across roughly sixty
   sites, and none of them knows there is a choice being made.

   THE SYSTEM VOICE IS THE DEFAULT AND THE PERMANENT FALLBACK. Kokoro is
   opt-in, needs an 88 MB download, and is desktop-only. Every route below
   asks `useKokoro()`, which is false unless ALL of: the bridge exists,
   the model is installed, and the visitor turned it on. Any one of those
   missing and this file behaves exactly as it did before it was written —
   so the browser build is untouched by construction rather than by
   remembering to check.

   ⚠ WHY THE ROUTING IS PER-CALL AND NOT A STORED HANDLE: a reading that
   is already sounding must keep being driven by the engine that started
   it. Switching voices mid-chapter would otherwise leave audio playing
   that nothing can stop — the silent failure this house is named for. So
   `stopSpeaking()`, `pauseSpeaking()` and friends ask "is Kokoro
   *currently speaking*", not "is Kokoro *selected*".
   ================================================================ */
import { kokoroAvailable, kSpeak, kStop, kSpeaking, kWarming, kPaused, kPause,
         kResume, kProgress, kSkip, kCanSkip, kSetRate, kError } from './tts-kokoro.js';

let current = null;
let settings = { voiceURI: null, rate: 0.98, engine: 'system', kokoroVoice: null, kokoroReady: false };

/* ---- WHICH ENGINE, and the three conditions are all necessary ----
   `kokoroReady` is set by the settings panel from the main process's own
   answer about what is on disk; it is NOT a wish. A save copied from a
   machine that had the model onto one that does not must fall back to the
   system voice rather than reading nothing, and this is where that
   happens. */
function useKokoro() {
  return settings.engine === 'kokoro' && !!settings.kokoroReady && kokoroAvailable();
}
/* Is the NEURAL engine the one currently making noise? Different question,
   and the one every control has to ask. */
function kokoroLive() { return kokoroAvailable() && (kSpeaking() || kPaused()); }
/* Exposed so a panel can say "warming the voice…" instead of showing a
   pressed button that appears to have done nothing for two seconds.
   Machine latency is a cost and is drawn as one — never as pace. */
export function ttsWarming() { return kokoroAvailable() && kWarming(); }
/* ★ AUDITION THE SYSTEM VOICE SPECIFICALLY, whatever is selected.
   Found by LOOKING at the settings panel on 2026-08-16: there are two
   "Preview this voice" buttons, and the top one sits under the SYSTEM voice
   dropdown — but it went through speak(), which routes to whichever engine is
   chosen. So with Kokoro on, the control for auditioning your Windows voices
   played Kokoro. A button doing something other than what it says, which is
   the house failure mode in its politest costume.

   A NEW export rather than a parameter on speak(): the fifteen existing
   signatures are frozen, and a preview is genuinely a different act from
   reading — it deliberately ignores your choice for one sentence. */
export function speakSystem(text, onEnd){
  if(!webSpeech()) return false;
  stopSpeaking();
  fullText = String(text); endCb = onEnd || null;
  return speakFrom(0);
}
export function ttsEngine() { return useKokoro() ? 'kokoro' : 'system'; }
export function ttsLastError() { return kokoroAvailable() ? kError() : null; }
/* ----- position tracking, so a podcast-style ±10s skip is possible on top
   of the Web Speech API — which has no native seek. We keep the full text,
   where the *current* utterance began within it (`segStart`), and the
   latest word boundary the engine reported (`lastCharIndex`, relative to
   the current utterance). Skipping computes a new absolute offset and
   simply re-speaks from there. `endCb` is preserved across a skip so the
   caller's "done reading" callback still fires at the true end, not on the
   internal cancel a re-speak does. (BETA-TESTING-FEEDBACK.md #6.) */
let fullText = '', segStart = 0, lastCharIndex = 0, endCb = null;
const CHARS_PER_SEC = 14; // rough plain-speech rate at rate=1.0; scaled by settings.rate below

/* Read-aloud exists at all if EITHER engine can do it. On a desktop with
   Kokoro installed and a browser missing Web Speech, the buttons must still
   be there — this is the only export whose meaning genuinely widened. */
export function ttsAvailable(){
  return (typeof window !== 'undefined' && 'speechSynthesis' in window) || useKokoro();
}
function webSpeech(){ return typeof window !== 'undefined' && 'speechSynthesis' in window; }
export function isSpeaking(){
  if(kokoroLive()) return kSpeaking();
  return webSpeech() && window.speechSynthesis.speaking;
}
/* MUST detach the utterance's handlers before cancelling. speechSynthesis
   .cancel() fires `onend` on whatever is speaking — and once read-aloud
   auto-advances to the next page from that callback, a plain cancel() sets off
   a cascade: stop → onend → turn page → speak → stop → … all the way to the end
   of the book. Reported from real use 2026-07-27 ("when I click on it again it
   will go to the end of the book"). speakFrom() and pauseSpeaking() already
   detached first; this one didn't. */
export function stopSpeaking(){
  /* BOTH, ALWAYS, AND NOT AN else. Stop has to be able to stop anything —
     including audio started by the engine you have since switched away
     from. A stop that only reaches the currently-selected backend leaves
     the other one talking with no way to silence it, which is precisely
     the "panel that won't close" shape of failure this project keeps
     finding. Both are cheap and both are safe when idle. */
  if(kokoroAvailable()) kStop();
  if(current){ current.onend = null; current.onerror = null; current.onboundary = null; }
  if(webSpeech()) window.speechSynthesis.cancel();
  current = null; paused = null; fullText = ''; endCb = null;
}

/* ----- PAUSE AND RESUME (added 2026-07-27, from real use: "if I try to do
   anything it pauses that voice and I can't even unpause it... if I have to sit
   and listen that's fine, but let me resume where I was.")

   Deliberately NOT speechSynthesis.pause()/resume(): those are unreliable
   across engines — Chrome in particular can drop a long paused utterance
   entirely, which is exactly the failure being complained about. Instead we
   record the absolute character offset we'd reached, cancel for real, and
   re-speak from that offset on resume. The same trick skipSpeech() already
   proved works. A pause therefore survives anything — closing the panel,
   opening a chat, walking around — because there is no fragile engine state
   being relied on, only a number. */
let paused = null; // { text, offset, endCb } while something is parked

export function pauseSpeaking(){
  /* The neural engine parks a real AudioBuffer at a real second, so its
     resume is exact and instant. The system engine cannot pause reliably
     (see above) and re-speaks from a character offset. Same two words to
     the caller, two completely different mechanisms underneath. */
  if(kokoroLive()) return kPause();
  if(!webSpeech() || !isSpeaking() || !fullText) return false;
  paused = { text: fullText, offset: Math.min(fullText.length, segStart + lastCharIndex), endCb };
  if(current){ current.onend = null; current.onerror = null; current.onboundary = null; }
  window.speechSynthesis.cancel();
  current = null;
  return true;
}
export function resumeSpeaking(){
  if(kokoroAvailable() && kPaused()) return kResume();
  if(!webSpeech() || !paused) return false;
  const p = paused; paused = null;
  fullText = p.text; endCb = p.endCb;
  return speakFrom(p.offset);
}
export function isPaused(){ return (kokoroAvailable() && kPaused()) || !!paused; }
export function hasAudio(){ return isSpeaking() || isPaused(); }
export function clearPaused(){ if(kokoroAvailable() && kPaused()) kStop(); paused = null; }
/* How far through the current text we are, 0..1 — for a progress readout on
   the pocket card, so "where was I?" has a visible answer. */
export function speechProgress(){
  /* Both answer 0..1 over the same text, so the pocket card needs no case
     for it — but only one of them is telling the truth. The system number
     comes off a word-boundary event and a 14-chars-per-second guess; the
     neural one is measured against real audio it is holding. */
  if(kokoroLive()) return kProgress();
  if(!fullText) return 0;
  const at = paused ? paused.offset : (segStart + lastCharIndex);
  return Math.max(0, Math.min(1, at / Math.max(1, fullText.length)));
}

// getVoices() is populated asynchronously in some browsers (fires
// 'voiceschanged' once the OS/browser's voice list actually loads) —
// callers needing the real list (the settings panel) should listen for
// that event themselves rather than assume this returns everything on
// the very first call.
/* Still the SYSTEM voice list, deliberately. Kokoro's four are a fixed,
   known set that comes from the main process (`electron/kokoro-voices.cjs`)
   and the settings panel asks for them by name — mixing them into this
   list would mean one dropdown whose entries mean two different things. */
export function ttsVoices(){ return webSpeech() ? window.speechSynthesis.getVoices() : []; }
export function setTTSSettings(next){
  settings = { ...settings, ...next };
  /* A rate change mid-sentence should be heard now, not next paragraph.
     WebAudio can retune a playing source; Web Speech cannot, and never
     could — that asymmetry existed before this file had two engines. */
  if(kokoroAvailable()) kSetRate(settings.rate || 1);
}
export function getTTSSettings(){ return settings; }

export function speak(text, onEnd){
  if(!ttsAvailable()) return false;
  /* ⚠ SILENCE THE OTHER ENGINE FIRST. Pressing "read it to me" while the
     other backend is mid-sentence has to interrupt it, exactly as pressing
     it twice on one engine always has. Without this, switching the setting
     between two presses leaves two voices reading different pages at once
     — and only one of them answers the Stop button. */
  stopSpeaking();
  if(useKokoro()){
    fullText = String(text); endCb = null;   // the neural side owns its own callback
    return kSpeak(String(text), onEnd, { rate: settings.rate || 1, voice: settings.kokoroVoice });
  }
  fullText = String(text); endCb = onEnd || null;
  return speakFrom(0);
}
// (re)start speaking from an absolute character offset into fullText. Used
// by speak() (offset 0) and by skipSpeech() (a new offset). Detaches the
// previous utterance's handlers before canceling so an internal re-speak
// never fires the caller's end callback by mistake.
function speakFrom(offset){
  /* ⚠ webSpeech(), NOT ttsAvailable(). This is the SYSTEM engine's own
     routine and it dereferences window.speechSynthesis on the next line.
     ttsAvailable() widened the moment a second engine existed — on a
     desktop with Kokoro installed and no Web Speech it now answers true,
     and this function would have thrown on a `speechSynthesis` that is
     not there. The kind of bug that only appears on somebody else's
     machine. */
  if(!webSpeech()) return false;
  if(current){ current.onend = null; current.onerror = null; current.onboundary = null; }
  window.speechSynthesis.cancel();
  current = null;
  segStart = Math.max(0, Math.min(offset, fullText.length));
  lastCharIndex = 0;
  const slice = fullText.slice(segStart);
  if(!slice){ if(endCb) endCb(); return true; }
  const u = new SpeechSynthesisUtterance(slice);
  u.rate = settings.rate; // a hair slower than default (0.98) reads more like a librarian than an alarm clock
  if(settings.voiceURI){
    const v = ttsVoices().find(v=>v.voiceURI===settings.voiceURI);
    if(v) u.voice = v;
  }
  u.onboundary = e => { if(e.charIndex != null) lastCharIndex = e.charIndex; };
  if(endCb){ u.onend = endCb; u.onerror = endCb; }
  current = u;
  window.speechSynthesis.speak(u);
  return true;
}
// jump forward (+) or back (-) roughly `seconds` worth of speech. The Web
// Speech API can't seek, so this estimates a character offset from the
// speaking rate and re-speaks from there — approximate, but it feels like
// a podcast skip, which is the whole ask.
export function skipSpeech(seconds){
  if(kokoroLive()) return kSkip(seconds);
  if(!webSpeech() || !fullText || !isSpeaking()) return false;
  const cps = CHARS_PER_SEC * (settings.rate || 1);
  const absolute = segStart + lastCharIndex;
  const next = Math.max(0, Math.min(fullText.length, absolute + Math.round(seconds * cps)));
  if(next >= fullText.length){ stopSpeaking(); if(endCb) endCb(); return true; }
  return speakFrom(next);
}
// can the skip controls do anything right now? (only while actually reading)
export function canSkipSpeech(){
  if(kokoroLive()) return kCanSkip();
  return webSpeech() && !!fullText && isSpeaking();
}
