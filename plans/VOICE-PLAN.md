# Better voices — open-source TTS, and whether it's worth it

Written **2026-07-27**, asked directly: *"the text to speech is good — are there
any open source models of voice we can add?"*

**Short answer: yes, and one of them is an obvious fit.** The Pavilion currently
uses the browser's own Web Speech API — free, offline, zero setup, and it sounds
like a satnav. Every option below is a real upgrade in warmth, and every one of
them costs something the current setup doesn't: a download, and a desktop-only
code path.

---

## Where we are now

`tts.js` calls `speechSynthesis`, using whatever voices Windows already has.
Pros: nothing to install, works in the browser build, works offline, costs no
disk. Cons: robotic, inconsistent across machines, and the voice list is
whatever the OS happens to ship.

**This stays the default and the fallback no matter what we add** — same rule as
everywhere else here: the zero-setup path must never stop working.

---

## The candidates, honestly compared

| | Licence | Size | Speed | Sounds like |
|---|---|---|---|---|
| **Piper** | MIT | ~20–60 MB/voice | Real-time on CPU, easily | Good. Clearly synthetic, but warm and steady |
| **Kokoro** | Apache 2.0 | ~330 MB | Real-time on CPU | Very good — the best quality-per-megabyte available |
| **eSpeak NG** | GPL | ~2 MB | Instant | Worse than what we have. Useful only as a last resort |
| **StyleTTS2** | MIT | ~1 GB + deps | Needs a GPU to be pleasant | Excellent, and far too heavy for the sleeper-car rule |
| **XTTS-v2** | **Non-commercial (CPML)** | ~2 GB | GPU | Great, and the licence disqualifies it |
| **Bark** | MIT | ~2 GB | Slow, unpredictable | Expressive but unreliable — wrong for reading a book |

**Recommendation: Piper first, Kokoro as the "I want it to sound really good"
option.** Piper is designed for exactly this job — offline, CPU, small, MIT — and
was built for the same local-first, no-cloud instinct this project already runs
on. Kokoro is the upgrade for someone willing to spend 330 MB.

**Ruled out on principle:** XTTS-v2 (non-commercial licence — the Pavilion is
MIT and given away, so a non-commercial dependency would poison it), and
anything needing a cloud key, which the standing decisions already forbid.

---

## How it would actually work

The seam already exists. `electron/main.cjs` spawns processes (it already runs
`mc` in a container for MinIO), and `desktopBridge` already carries binary-ish
work across. So:

1. **Voice files live beside the app data**, downloaded once, by explicit choice
   — never bundled, because a 60 MB installer bloat for a feature not everyone
   wants is exactly the wrong trade.
2. **Main process runs the binary**, gets a WAV back, hands it to the renderer.
3. **The renderer plays it** through an `<audio>` element instead of
   `speechSynthesis`, behind the *same* `speak()/pause/resume` interface in
   `tts.js` — so the reader, the pocket card, the ±10s skip and everything built
   this week keep working untouched.
4. **The browser build is unchanged** and stays on Web Speech.

**The one real design catch:** the whole pause/resume/skip machinery built
2026-07-27 works by re-speaking from a character offset. With a file-based
engine, seeking is *easier* (audio has real timestamps) — but the sentence-level
chunking has to be redone, because you can't re-synthesise from an arbitrary
character mid-file. Chunk per paragraph, keep an index, and seeking becomes
exact rather than estimated. **That's a genuine improvement, not a workaround.**

---

## Is it worth doing, and when

**Not before the beta.** The current voice is *adequate*, and the beta's real
risks are an artifact 16 days stale and a desktop path barely tested
(`BETA-PREFLIGHT.md`). Adding a download step and a new audio path to the
shipping build right before handing it to strangers would be a poor trade.

**After the first tester round**, it's one of the strongest quality upgrades
available — reading aloud is one of the few things the Pavilion does that people
use for hours, and the difference between a satnav and a warm voice is the
difference between "a feature" and "how I read now."

**The cheaper thing to do first, and worth naming:** LibriVox is public-domain
*human* recordings of exactly the classics on these shelves. A real person
reading Walden beats any local model, costs no compute, and is already free —
see `LIBRARY-GROWTH-PLAN.md`. Wiring an audiobook to a shelved text may be a
better use of a day than a neural voice.
