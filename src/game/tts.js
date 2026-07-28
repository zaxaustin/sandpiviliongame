/* ================================================================
   [TTS] — read-aloud via the browser's own Web Speech API. Free,
   local, no key, no cloud round-trip — the same "own your data, no
   gate" instinct as everything else here, just applied to a voice.

   Voice + rate are real, persisted settings (BETA-FEEDBACK.md #6) —
   set once via setTTSSettings() (called from entities.js at load,
   and from whatever settings panel lets a visitor pick a voice), read
   by every speak() call after that. Not a new save shape: lives at
   data.ttsSettings, exported/imported with everything else already.
   ================================================================ */
let current = null;
let settings = { voiceURI: null, rate: 0.98 };
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

export function ttsAvailable(){ return typeof window !== 'undefined' && 'speechSynthesis' in window; }
export function isSpeaking(){ return ttsAvailable() && window.speechSynthesis.speaking; }
export function stopSpeaking(){ if(ttsAvailable()) window.speechSynthesis.cancel(); current = null; paused = null; }

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
  if(!ttsAvailable() || !isSpeaking() || !fullText) return false;
  paused = { text: fullText, offset: Math.min(fullText.length, segStart + lastCharIndex), endCb };
  if(current){ current.onend = null; current.onerror = null; current.onboundary = null; }
  window.speechSynthesis.cancel();
  current = null;
  return true;
}
export function resumeSpeaking(){
  if(!ttsAvailable() || !paused) return false;
  const p = paused; paused = null;
  fullText = p.text; endCb = p.endCb;
  return speakFrom(p.offset);
}
export function isPaused(){ return !!paused; }
export function hasAudio(){ return isSpeaking() || !!paused; }
export function clearPaused(){ paused = null; }
/* How far through the current text we are, 0..1 — for a progress readout on
   the pocket card, so "where was I?" has a visible answer. */
export function speechProgress(){
  if(!fullText) return 0;
  const at = paused ? paused.offset : (segStart + lastCharIndex);
  return Math.max(0, Math.min(1, at / Math.max(1, fullText.length)));
}

// getVoices() is populated asynchronously in some browsers (fires
// 'voiceschanged' once the OS/browser's voice list actually loads) —
// callers needing the real list (the settings panel) should listen for
// that event themselves rather than assume this returns everything on
// the very first call.
export function ttsVoices(){ return ttsAvailable() ? window.speechSynthesis.getVoices() : []; }
export function setTTSSettings(next){ settings = { ...settings, ...next }; }
export function getTTSSettings(){ return settings; }

export function speak(text, onEnd){
  if(!ttsAvailable()) return false;
  fullText = String(text); endCb = onEnd || null;
  return speakFrom(0);
}
// (re)start speaking from an absolute character offset into fullText. Used
// by speak() (offset 0) and by skipSpeech() (a new offset). Detaches the
// previous utterance's handlers before canceling so an internal re-speak
// never fires the caller's end callback by mistake.
function speakFrom(offset){
  if(!ttsAvailable()) return false;
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
  if(!ttsAvailable() || !fullText || !isSpeaking()) return false;
  const cps = CHARS_PER_SEC * (settings.rate || 1);
  const absolute = segStart + lastCharIndex;
  const next = Math.max(0, Math.min(fullText.length, absolute + Math.round(seconds * cps)));
  if(next >= fullText.length){ stopSpeaking(); if(endCb) endCb(); return true; }
  return speakFrom(next);
}
// can the skip controls do anything right now? (only while actually reading)
export function canSkipSpeech(){ return ttsAvailable() && !!fullText && isSpeaking(); }
