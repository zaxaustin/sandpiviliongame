# Beta Testing Feedback

A running log of real issues found by actually using the Pavilion, not
a feature wishlist written cold. New rounds get appended, not
overwritten — see the date on each entry. Add [x] and a one-line note
when something's actually fixed, don't delete the entry.

## Round 1 — 2026-07-09

### 1. Notes during an AI conversation — unclear how to save/link/start new

**What happened:** talking to an AI resident, the note-taking section
is a good idea, but it's not clear how to actually save a note, link it
to "my notebook," or start a fresh note mid-conversation.
**Status:** needs real UX design, not a quick fix — first figure out
which existing note surface this should feed (`data.bookNotes`,
Research Desk `p.notes`, or something new specific to a resident
conversation), then make saving/starting-new an obvious, discoverable
action rather than something you have to guess exists.

**Checked, 2026-07-09 (still open, but now a precise finding instead
of a guess):** two completely separate memory mechanisms already exist
in an AI conversation, and neither is discoverable:
- **`data.chatNotes[agent]`** — the actual note textarea already
  **auto-saves**, no button, 600ms after you stop typing (a small
  "saving…" → "saved HH:MM" label is the only visible confirmation).
  One continuous note per resident (Quill, the Monk, the Steward each
  get their own), never linked to book notes or Research Desk notes —
  three separate systems today, not one unified "notebook."
- **`data.agentMemory[agent]`** — fully automatic, zero user action:
  every real question you ask a resident gets remembered (last 20,
  `remember()` in `overlays.js`) and quietly fed back into that
  resident's own system prompt next time for continuity. Nothing to
  save here either — it already just happens.

So the real gap isn't "how do I save a note" — it's that saving is
already automatic in both places and doesn't look like it. The design
work that's still real: make that visible (the notes area already has
somewhere to say so, it's just easy to miss), and decide whether
"link it to my notebook" should mean actually unifying these three
separate note stores, which is a bigger, separate decision.

### 2. [x] Settings — can't get back from AI Connections to the pause menu

**Fixed 2026-07-09.** The Connections panel's close button now calls
`openMenu()` instead of `closeUI()` — verified with a real Playwright
run, not just read: opened the menu, opened Connections, clicked back,
confirmed the menu is what's actually showing afterward. `openMenu`
also had to be added to the `Object.assign(window, {...})` export list
at the bottom of `overlays.js` — it was only ever called directly from
`main.js`'s own module scope, never reachable from an inline `onclick`.

**What happened:** click "⚙ Manage AI connections" from the pause
menu, then can't navigate back to the menu itself.
**Real cause, found, not guessed:** `renderConnections()`'s close
button (`src/game/ui/overlays.js`, the `Esc ✕` button at the top of
the Connections panel) calls `closeUI()` — which closes back to the
game world, not back to the menu it was opened from. Every other
"opened from the pause menu" panel has this same shape; worth checking
whether any others have the identical bug before calling this one
comment done. **This is a real, small, likely-one-line fix** — swap
that button's handler to return to the menu instead of closing
entirely. Good candidate to just fix now rather than defer, since it's
a genuine usability blocker, not a design question.

### 3. Thinking-model output is too long, and hides its own reasoning

**What happened:** a reasoning-capable local model's response is long
and unwieldy. The actual ask: show the thinking *as it happens* (don't
hide it — "there should be no thoughts to hide, ideally, in the Sand
Pavilion"), then once a final answer arrives, collapse the thinking
down to a single line (a "thought for Ns" style toggle), not remove it
entirely.
**What's actually there today, checked:** `d.thinking` is currently
just a boolean flag that shows a generic "…" placeholder bubble while
true (`overlays.js` line ~120), then swaps to the real answer once
done — it does not currently surface a model's actual `<think>...</think>`
reasoning content at all, hidden or otherwise. Real design + build
work: detect and separate `<think>` content from the visible answer
per chunk while streaming, render it live, then collapse (not delete)
once the final answer lands. Directly in the spirit of this project's
own transparency ethic — worth doing right, not rushed.

### 4. [x] Ganesha statue — needs a body/legs, trunk direction variety, an offering

**Fixed 2026-07-09, verified with real screenshots, twice.** Rebuilt
the body with the same visible-knee-bumps technique the Buddha statue
needed; the trunk now sways slowly left/right over time
(`Math.sin(state.time*.3)`) instead of always curving one direction;
the modak offering moved to the side. **A real second bug turned up
while verifying this one:** the new leg bumps were drawn *before* the
altar's diyas/modak offering in the code, so the opaque legs painted
directly over them — a screenshot showed both statues with their
offerings completely invisible. Fixed by moving the offerings to draw
last (in front) and repositioning them onto the altar's front edge;
re-screenshotted and confirmed both are actually visible now. Same
root cause as #5 below — see that entry, this was the same bug hitting
both statues at once.

**What's there today (built 2026-07-09):** head, ears, trunk, crown,
and a rounded seated "body" blob, mirrored across the aisle from the
Buddha shrine in the Keep (`src/game/render.js`, the `'g'` tile case).
**Real ask:** the body needs actual legs, not just a rounded mass (the
Buddha statue's second pass — visible knee bumps, a real seated
silhouette — is the model to follow here, not repeat the same mistake
twice); the trunk should have real left/right variation instead of
always curving the same direction (a per-tile-position or time-based
coin flip, matching how the shrine's candle-flicker already varies);
and a food offering (modaks are already there in the small altar bowl
— check whether a *visible*, more prominent offering beside the figure
itself is what's actually being asked for, versus what's already
there at the altar).

### 5. [x] Incense in front of the Buddha statue

**Turned out to be a real, different bug than either of us
guessed — found only by actually zooming into a screenshot.** The
incense/candles were already coded, but completely invisible: the same
day's earlier knee-bump fix drew the seated body *after* (on top of)
the candles/incense in the code, so the opaque robe painted right over
them. Confirmed by cropping tight on the altar at full zoom — genuinely
nothing there, not just hard to see. Fixed by moving candles/incense to
draw last (in front of the now-higher-seated figure) and shifting them
onto the altar's front edge; re-verified at the same tight zoom,
confirmed both now actually visible. The lesson worth keeping: "read
the code, it looks right" is not the same check as "look at the
rendered pixels" — this project's kept finding real gaps between those
two all session.

### 6. [~] Text-to-speech — voice/speed selection, and a 10-second skip

**Voice + speed: fixed 2026-07-09, verified with a real Playwright
run.** A new "🔊 Voice settings" panel in the pause menu
(`openVoiceSettings()` in `overlays.js`) lists every voice this
browser/OS actually has installed (confirmed: 4 real voices showed up
in testing, not a mock) plus a speed slider (0.5×-1.75×) with a live
preview button. Persisted at `data.ttsSettings` (`tts.js` gained
`setTTSSettings()`/`getTTSSettings()`, read by every `speak()` call);
older saves default in via a small patch in `entities.js`, the same
pattern already used for `workshop.research`. Confirmed the setting
actually survives a save (checked the raw localStorage JSON after
changing it, not just the UI label). **Not done: the UK-female-voice
preference specifically** — whatever voices this game ships to depends
entirely on what's installed on each player's own OS/browser, so
there's no way to guarantee that exact voice is available; the settings
panel is the general answer, picking the specific voice is on the
player. **The 10-second skip is still open** — genuinely a different,
harder problem (see original note below), not touched this round.

**What's actually there today, checked (original note):**
`toggleReadAloud()` / `toggleSpokenSummary()` call a `speak()` helper
that wraps the browser's real `SpeechSynthesisUtterance` API — which
already natively supports `.voice` and `.rate`. A 10-second skip is a
real gap, though: `SpeechSynthesisUtterance` has no native seek — skip
would need to be built as "stop, then re-speak from an approximate word
offset," not a true seek, worth knowing before promising exact
10-second precision.

### 7. Find the real source text for the Ganesha/Shiva campaign story

**Current state:** `ganesha-and-the-campaign` (Hindu shelf, `personal`
category) is an *original* telling — the steward's own account of
hearing and practicing the story, explicitly not sourced from a single
canonical text. **Real ask:** find whether there's an actual Puranic
source for this specific story (likely somewhere in the Ganesha Purana
or Shiva Purana) and, if a legitimately public-domain English
translation exists, add it as a real second, separately-sourced entry
alongside the personal telling — same "both exist, clearly labeled"
pattern already used elsewhere in this Library rather than replacing
one with the other.

### 8. The Writing Desk should be a document first, a toolbox second

**The actual ask:** right now the Writing Desk (`openPlanner()` in
`overlays.js`) stacks everything at once — intention, rhythm blocks,
sparks, evening ember, past days, upcoming due items, and the
Steward's AI chat, all front and center in one panel. The real want:
make it feel like an actual word document — a blank page you're just
typing on, front and center — with all of that (blocks, sparks,
Steward chat, past days) moved to the side as tools in a toolbox,
opened only when reached for, not shown by default. The AI becomes an
assistant sitting in that toolbox with some preloaded prompts/tools,
not a chat window competing for space with the page itself.
**Status:** real design work, not a quick fix — same tier as #1 and #3
above. Worth thinking through before touching code: which of the
current panel's pieces are actually "the page" (the intention/ember
text, arguably) versus "tools" (blocks, sparks, past days, chat), and
whether the toolbox is a collapsible side panel, a separate small
overlay reachable by a button, or something else — a real UI pattern
decision, not just moving CSS around.

### Not an issue — just enjoyed

*The Book of Household Management* is landing well; a real "want to
read the whole thing" reaction. No action needed — the full text is
already attached and readable, page by page, in the Reader.

## What to actually do with this list

**Update, 2026-07-09, same day:** #2, #4, #5, and #6 (voice/speed half)
done — all four turned out to be genuinely bounded, and #4/#5 actually
shared one root cause (a z-order bug: newer elements drawn on top of
older ones), only found by actually zooming into a screenshot rather
than trusting the code. **Still open, on purpose:** #1, #3, and #8 are real
design work, not quick patches — don't rush any of them just because
today had momentum. #7 is a sourcing question, not code. #6's
10-second skip is a real, harder problem than it looks (no native seek
in the Web Speech API) — worth its own real look, not a bolt-on.
