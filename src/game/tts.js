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

export function ttsAvailable(){ return typeof window !== 'undefined' && 'speechSynthesis' in window; }
export function isSpeaking(){ return ttsAvailable() && window.speechSynthesis.speaking; }
export function stopSpeaking(){ if(ttsAvailable()) window.speechSynthesis.cancel(); current = null; }

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
  stopSpeaking();
  const u = new SpeechSynthesisUtterance(String(text));
  u.rate = settings.rate; // a hair slower than default (0.98) reads more like a librarian than an alarm clock
  if(settings.voiceURI){
    const v = ttsVoices().find(v=>v.voiceURI===settings.voiceURI);
    if(v) u.voice = v;
  }
  if(onEnd){ u.onend = onEnd; u.onerror = onEnd; }
  current = u;
  window.speechSynthesis.speak(u);
  return true;
}
