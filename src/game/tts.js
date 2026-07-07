/* ================================================================
   [TTS] — read-aloud via the browser's own Web Speech API. Free,
   local, no key, no cloud round-trip — the same "own your data, no
   gate" instinct as everything else here, just applied to a voice.
   ================================================================ */
let current = null;

export function ttsAvailable(){ return typeof window !== 'undefined' && 'speechSynthesis' in window; }
export function isSpeaking(){ return ttsAvailable() && window.speechSynthesis.speaking; }
export function stopSpeaking(){ if(ttsAvailable()) window.speechSynthesis.cancel(); current = null; }

export function speak(text, onEnd){
  if(!ttsAvailable()) return false;
  stopSpeaking();
  const u = new SpeechSynthesisUtterance(String(text));
  u.rate = 0.98; // a hair slower than default reads more like a librarian than an alarm clock
  if(onEnd){ u.onend = onEnd; u.onerror = onEnd; }
  current = u;
  window.speechSynthesis.speak(u);
  return true;
}
