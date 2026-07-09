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

### 8. [x] The Writing Desk should be a document first, a toolbox second

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

**Fixed 2026-07-09** — see `WRITING-DESK-PLAN.md` for the full staged
plan and #9 below for the "My Notes" filing cabinet that shipped
alongside it. Verified live, not just built: every toolbox panel opens
correctly, the page auto-saves, and a filed note survives a real reload.

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

## Round 2 — 2026-07-09, raw session notes triaged

A separate session's worth of real feedback got jotted straight into the
bottom of `README.md` instead of here — that session's connection dropped
(a local wifi issue, confirmed not a code problem) before it could be
cleaned up properly. Nothing was lost; it's triaged below into real,
scoped items, each with the actual code checked, not guessed. The raw
notes are gone from `README.md` now that they live here properly — see
"Kept, not actioned" at the bottom for the two lines that were praise or
mood rather than an ask.

### 9. [x] The Writing Desk should feel like an actual document (same open item as #8 above, with a sharper ask)

**The added specific:** "just paper and the ability to write," plus a
real file-tree alongside it — "a file system nest to it like VS Code" —
for personal notes generally, not only the daily plan. This is the same
open design question as #8 (page-first, toolbox-second), now with a
second, related piece: today, personal writing is split across three
separate places with no shared browsing structure — the planner's own
ember/intention text, Research Desk project notes, and Grant Desk
documents (all three are what `sparks` already treats as one family, per
`READING-TO-DOING-PLAN.md`, now fully wired) — but there's no single
"my files" tree across them the way a code editor's sidebar shows a
whole project at once. Real design work, same tier as #8: whether that
tree is a new, fourth thing, or a different view onto the three that
already exist, is the actual question to answer before any code.

**Update, 2026-07-09:** the page-first/toolbox-second half (this item
and #8) shipped in full — see `WRITING-DESK-PLAN.md`. The "file system
nest" half landed too, in a deliberately scoped-down form: "🗂 My Notes,"
a real filing cabinet in the toolbox (`data.notes` — named, dated,
freeform, create/edit/delete, its own auto-save), separate from today's
page. **What it isn't:** the full cross-app tree unifying Research Desk
notes, Grant Desk documents, and book notes into one browsable structure
— that idea is still confirmed and still kept out of scope, still its
own separate, bigger question, exactly as this update originally said.
This is one desk's own drawer, real and shipped, not the whole building.

### 10. Book notes need to know which page they're on

**Checked, not guessed:** `data.bookNotes[slug]` (`overlays.js`,
`addBookNote()`/`renderBookNotes()`) is one flat array per book — a note
has a timestamp and text, nothing else. There's no page field anywhere in
that shape today, so "show notes for just this page" isn't a rendering
gap, it's a missing piece of data: the Reader would need to know its own
current page at the moment `+ Add note` is clicked, and every note would
need a `page` field from then on (older notes predating this would
naturally show under "all notes," never a specific page — no migration
needed, just an absent field, same honest-default pattern already used
for `done` on old sparks). Two real, small UI pieces once the data
exists: a per-page notes view (default, matches where you're actually
reading) and an all-notes-for-this-book view, one click away.

### 11. Grant Desk's AI should draft real proposal text, not just organize

**What's there today:** the Grant Desk assistant already helps structure
a project (mission, sections, due dates) and chats about it, grounded in
the project's own documents. **The actual ask:** move from *organizing*
a proposal to *drafting real prose for a section* — asked for a real
paragraph of grant-proposal language, not just a conversation about what
should go in one. A real scope question before building: does this reuse
the exact same drafting engine `draftCourseFromGoal()` already uses for
courses and training plans (same shape: goal in, structured draft out),
retargeted at a proposal section instead of a course outline?

### 12. Export Save should let you choose where it goes, not just Downloads

**Not yet built — a real, well-scoped candidate, checked not guessed.**
This game runs mainly as the desktop app now, not a browser tab
(confirmed directly), so the real fix targets that, not a browser
workaround: `electron/main.cjs` has no native save dialog wired up at
all today, and `exportSave()` in `overlays.js` just triggers a browser-
style `<a download>`, which Electron still honors but always drops into
the OS default Downloads folder with no picker. The fix is small and
contained — a real `dialog.showSaveDialog` in the main process, exposed
through `preload.cjs`'s existing bridge, called from `exportSave()` only
when running inside Electron (falls back to the current behavior on the
web build at sandpiviliongame.vercel.app, which stays untouched).

### 13. Spell-check wasn't actually working in the desktop app

**Real cause, found, not guessed.** Chromium's spellchecker is on by
default in Electron (the red squiggly underline is likely already
there), but Electron never wires up the right-click "Did you mean…"
menu on its own — a well-known Electron gap, not a Sand Pavilion bug.
Confirmed: `electron/main.cjs` has no `context-menu` handler at all
today. The fix is a small, well-known Electron pattern — add one,
surfacing Chromium's own real dictionary suggestions plus Add-to-
Dictionary/Cut/Copy/Paste, on every text field across the app. No new
dependency, no wordlist to maintain. Doesn't apply to the browser build
(Chrome/Edge/Firefox already do this themselves in any `<textarea>`),
which is fine since the ask was specifically about the desktop app.

### 14. A real, current "how does this all work" guide — and a clearer in-the-moment message when a fetch fails

**Two related asks, one real gap:** `LEARNING-PATH.md` already exists
(a self-paced curriculum built around this exact project, linked from
the README's own "New here?" section) — but it wasn't found or used in
the moment it would have helped most, which is itself the finding:
existing docs aren't discoverable *from inside the confusion*, only from
already knowing to go read a top-level file first. The concrete trigger
was a failed Gutenberg/arXiv fetch attempted directly from the game —
confirmed elsewhere in the README as a real, permanent browser limit
(not a bug), but the in-game error at the moment it fails doesn't say
that or point anywhere. Real, scoped fix: when a direct fetch fails in
the Caravan/Request Board flow, say plainly *why* (a browser can't reach
that source directly) and link to where the real path is (the Request
Board, or `library-inbox/` for hand-fetched files) — the honest-about-
limits framing the README already uses, just surfaced at the actual
moment of friction instead of only in a file you'd have to already know
to open.

### 15. Track local AI resource usage — a beta tool and a real feature both

**The ask, exactly as given:** see CPU usage from the local AI models,
how many can run at once, and what effect each action has — useful for
testing, genuinely useful as a shipped feature too ("a cool developer
feature for this app"). Real, scoped first version: Ollama's own
`/api/ps` endpoint (already reachable the same way `/api/tags` is today)
reports which models are currently loaded and their memory footprint —
that's real data available for free, no new instrumentation needed, and
a natural fit for a small panel next to the existing Ollama connection
status line. True CPU/GPU percentage is a further, harder step (no
browser API reaches system-level process stats — Electron's desktop
process could get closer via Node's own OS module, browser build
genuinely cannot) — worth being honest that the first version is model
memory/count, not full system load, rather than promising both at once.

**Update, 2026-07-09:** real plan written — `LOCAL-AI-MONITORING-PLAN.md`
— plus a new `LEARNING-PATH.md` Stage 16 teaching the concepts behind it
(what "loaded," VRAM vs. RAM, and `expires_at` actually mean), verified
live against this machine's real, running Ollama instance (`/api/ps` and
`/api/tags` both actually curled, not assumed). Explicitly not built yet
— "let's not get ahead of ourselves," direct instruction — the plan and
the learning module are the whole scope of this update.

### 16. [x] The Mountain Monk's actual role, corrected

**Direct instruction, kept close to the original wording since it's a
real spec, not a vibe:** the Monk is for spiritual guidance and text
recommendations — visited like a monastery, asked for counsel — never
day-planning or drafting. He should be a teacher *and* a student of the
dharma himself, hold visitors to a higher moral standard, help them find
their own intentions, and actively direct them elsewhere for anything
that isn't his place (naming who, not just declining). He should also
hold Native American tradition as something close to his own path — "his
tribe" — alongside Buddhism and Hindu/Vedantic teaching, not as a third,
separate subject.

**Checked against the actual system prompt (`CHAT_AGENTS.monk` in
`overlays.js`) — partly already true, partly a real gap:**
- Already correct: daily-life logistics are explicitly deferred to the
  Steward ("that's the Steward's place, not yours"), and the Monk
  already teaches toward "how to actually live in harmony with the
  world," already asks probing questions rather than just answering.
- **Real gap:** nothing currently frames him as a *student* of the
  dharma himself, nothing explicitly invokes "holding visitors to a
  higher moral standard" or "helping them find their own intentions" as
  a named part of his role, and Native American tradition isn't
  mentioned in his prompt at all yet — despite the Library's own Native
  American shelf (Charles Eastman) existing since this same day.
- **The one real open question, needs a decision before touching
  code:** the Monk currently has a real, working "📋 Draft a training
  plan from this conversation" button (`draftTrainingPlanFromChat()`)
  that lands a practice-plan draft on the Course Board for review before
  anything's saved — arguably on-brand for a monastery (a training
  regimen, not a day-plan), and structurally already separate from the
  Steward's day-planning. The note says drafting should be "with Quill"
  instead. Quill has no drafting capability of any kind today — so this
  isn't a one-line fix, it's a real choice: (a) leave training-plan
  drafting on the Monk as practice guidance, distinct from a "plan for
  today," and focus the fix on the prompt-language gaps above, or
  (b) actually build a hand-off — the Monk suggests a practice direction
  in conversation, then points the visitor to Quill (or a new Quill
  capability) to have it actually written down. **(a) is far less work
  and arguably already matches what "training plan" means versus "day
  plan"; (b) is the more literal reading of the note.** Worth confirming
  which before building either.

**Resolved, 2026-07-09: option (b), direct instruction.** The Monk
becomes chat-only — the "📋 Draft a..." button moved to Quill
(`overlays.js`: `d.agent==='quill'` now gates it, was `'monk'`), and
`draftTrainingPlanFromChat()`'s own wording generalized from
"training/practice plan" to "a course, a study plan, or a practice"
since it's no longer monastery-specific. `CHAT_AGENTS.quill`'s prompt
now names this capability directly, alongside library help. `CHAT_AGENTS.monk`'s
prompt gained: explicit "student, not just teacher" framing; Native
American tradition named as close to his own path, alongside Buddhism/
Vedanta; holding visitors to a higher moral standard and helping them
find their own intentions, named directly as his real work; and an
explicit line that he doesn't draft or save anything himself, pointing
to Quill by name when that's what's actually needed. Verified with a
real `npm run build` + `npm test` pass, both clean.

### 17. [x] Library request — Tibetan Buddhism, inner fire, Milarepa

Added straight to `LIBRARY-GROWTH-PLAN.md`'s wishlist rather than the
in-game Request Board, since this is session/planning work, not
gameplay: *Tibet's Great Yogī Milarepa* (Evans-Wentz's 1928 translation —
genuinely US public domain, confirmed by publication date, not assumed)
and *Sixty Songs of Milarepa* (already posted in full on Archive.org,
rights unconfirmed) are the two real, findable candidates; both need the
not-yet-built Internet Archive connector or a manual `library-inbox/`
drop, not a Gutenberg fetch — no clean Gutenberg edition turned up.

### 18. The Course Board should scale like a real site, and support importing plans

**The ask:** as more courses get made, the board needs "a website like
feel" instead of what will otherwise become a flat, discombobulated
list — plus, as food for thought, importing course plans from elsewhere.
Real, undefined-scope design work — not a quick fix. Worth scoping
separately once it's actually next: likely categories/search/filtering
(the Index panel's own pattern is the closest existing precedent) for
the first half, and a real format question (what would an "imported"
course plan even look like — a file format, a pasted syllabus text the
AI restructures?) for the second.

### 19. Thinking-model reveal, raised again

Same open item as #3 above, from an independent angle this time: "the
thoughts slipped away when unspoken, help me understand that issue and
let him speak more if needed... I also wanna see the chain of thought
that shrinks down to an expandable window when the real text comes out."
Two independent asks landing on the same real feature is a stronger
signal this is worth doing, not a reason to rush it — still real design
+ build work, not a quick patch, per #3's own note above.

### Kept, not actioned

**The Mountain Monk quote** from that session — a real, in-character
response to being asked about the temple statues, worth keeping for its
own sake: *"A heartful intention indeed, friend... Before you polish
walls or design spaces for them, I suggest we build the Citta, mind-field
of your home visitor..."* (full text was in the README's raw notes,
preserved in git history from before this cleanup, 2026-07-09). Also
kept, no action needed: "I love this mindset and hopefully we can keep it
and watch it grow till one day the mango falls in our hand," and the
closing north-star restatement — wanting a place to turn real ideas into
something tangible, use the Library when seeking knowledge, and turn to
counsel here rather than have ideas "turn to sand" — which the README's
own "Hopes and dreams" section and its `README`-closing line already
speak to directly.
