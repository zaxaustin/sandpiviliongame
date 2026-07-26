# Beta Testing Feedback

A running log of real issues found by actually using the Pavilion, not
a feature wishlist written cold. New rounds get appended, not
overwritten — see the date on each entry. Add [x] and a one-line note
when something's actually fixed, don't delete the entry.

## Round 1 — 2026-07-09

### 1. [~] Notes during an AI conversation — unclear how to save/link/start new

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

**Fixed 2026-07-10, the discoverability half only — unification stays
its own, separate, bigger question, exactly as this note already said.**
The idle-state label (the "somewhere to say so" that already existed)
now reads plainly, before you've typed a single character: "auto-saves
as you type — nothing to click," switching to "✓ auto-saved" once a note
actually exists. The textarea's own placeholder says the same thing.
Verified live: a fresh chat open shows the idle hint immediately; typing
still shows the existing "saving…" → "saved HH:MM" transition; closing
and reopening the same conversation correctly shows "✓ auto-saved" with
the note's text intact.

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

### 7. [~] Find the real source text for the Ganesha/Shiva campaign story

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

**Researched 2026-07-10 — a real, honest non-result, not a shelving.**
The story does trace to a real textual source: the Shiva Purana's own
Tripurāsura (Tripurāntaka) episode — the devas built Shiva's cosmic
war-chariot for the battle against the three demon cities but omitted
inviting Ganesha first, the axle broke, and only propitiating Ganesha
let the campaign proceed. This is a different Ganesha episode than the
one already checked at wisdomlib's Shiva Purana Chapter 15 (the
door-guarding/birth story) — the Tripura chapter itself wasn't pinned
down to a specific, confirmed-safe translation. **The real blocker:**
the only complete online English Shiva Purana (wisdomlib.org, J.L.
Shastri's 1950 Motilal Banarsidass translation) carries no copyright or
license statement on the page at all, and Motilal Banarsidass is a
still-active publisher — "freely readable" is not the same as "confirmed
redistributable," the exact distinction `LIBRARY-GROWTH-PLAN.md`'s own
license rule exists to hold. **Checked directly, not assumed:** the
Library's own already-shelved Wilkins text (*Hindu Mythology, Vedic and
Puranic*, 1900, confirmed public domain) was downloaded and grepped in
full for this specific episode — it has real Ganesha and Shiva chapters,
but doesn't cover the Tripura story. No other 19th-century (safely
pre-1923) English Purana translation covering this episode turned up.
**Left as-is:** the personal telling stays the Library's only entry for
this story, honestly, rather than shelving a translation whose right to
redistribute was never actually confirmed.

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

### 10. [x] Book notes need to know which page they're on

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

**Fixed 2026-07-10.** `addBookNote()` now stamps a `page` field whenever
a note is taken while actually inside the full-text reader (absent when
taken from the summary view, exactly the honest-default pattern
described above — no migration touched old notes). `renderBookNotes()`
defaults to showing just the current page's notes while reading, with a
"📚 Show all notes (N)" toggle one click away, following you as you turn
pages (`state.bookNotesShowAll`, reset whenever a new book opens). Each
note now shows its page number when it has one. Verified live with a
real Playwright run: a note added on page 1 correctly stayed hidden on
page 2's filtered view ("No notes on this page yet"), the toggle
correctly listed both notes with their real page numbers once switched
to "show all," and returning to page 1 kept the chosen filter state.

### 11. [x] Grant Desk's AI should draft real proposal text, not just organize

**What's there today:** the Grant Desk assistant already helps structure
a project (mission, sections, due dates) and chats about it, grounded in
the project's own documents. **The actual ask:** move from *organizing*
a proposal to *drafting real prose for a section* — asked for a real
paragraph of grant-proposal language, not just a conversation about what
should go in one. A real scope question before building: does this reuse
the exact same drafting engine `draftCourseFromGoal()` already uses for
courses and training plans (same shape: goal in, structured draft out),
retargeted at a proposal section instead of a course outline?

**Turned out this was already fully built — and a real, live bug was
the actual blocker, not a missing feature.** `grantSystemPrompt()`
already instructs the model to "write that section in full, ready to
paste into a real proposal — not an outline," and `saveGrantReplyAsDraft()`
already saves the reply as a real section. Reusing `draftCourseFromGoal()`
turned out to be the wrong question — that engine returns a *structured*
course object, not free prose, so the Grant Desk's own plain-chat shape
was already the right one. **The real bug, found only by actually
clicking the quick-start buttons, not by reading the code:** every
`GRANT_PROMPTS` button (`onclick="fillGrantPrompt(${JSON.stringify(pr)})"`)
had its JSON-stringified argument's own double quotes colliding with the
`onclick="..."` attribute's own double-quote delimiters — genuinely
broken HTML, throwing a real "Unexpected end of input" JS error on
click, confirmed via a live Playwright run before being fixed. **Fixed**
by switching the attribute to single quotes. Verified live end to end
after the fix, against this machine's real Ollama instance: clicking
"Draft a Statement of Need" correctly filled the prompt, and the model's
reply was real, grounded, fundable-voice prose citing the actual
document on file (a library-closure survey), not a conversation about
what a Statement of Need should contain.

### 12. [x] Export Save should let you choose where it goes, not just Downloads

**Fixed 2026-07-10.** `electron/main.cjs` gained a `desktop-save-file`
IPC handler wrapping a real `dialog.showSaveDialog`, exposed through
`preload.cjs`'s existing bridge as `window.desktopBridge.saveFile()`.
`exportSave()` in `overlays.js` now checks for that bridge first — the
web build at sandpiviliongame.vercel.app is untouched, still falls back
to the original `<a download>` behavior. Verified with `npm run build`
+ `npm test`, both clean; a live click-through of the actual save dialog
in a running desktop window is still worth doing next session, since
Electron's native dialogs can't be driven headlessly from here.

**Original finding, not yet built — a real, well-scoped candidate, checked not guessed.**
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

### 13. [x] Spell-check wasn't actually working in the desktop app

**Fixed 2026-07-10.** `electron/main.cjs`'s `createWindow()` now wires up
a real `context-menu` handler on `win.webContents`: Chromium's own
`dictionarySuggestions`/`misspelledWord` params build a real suggestions
+ Add-to-Dictionary menu, `Menu.buildFromTemplate` plus Cut/Copy/Paste
gated on `editFlags`. No new dependency. Doesn't touch the browser build,
which already has this natively. Verified with `npm run build` + `npm
test`, both clean; an actual right-click-a-misspelled-word check in a
live desktop window is still worth doing next session — same limit as
#12, native menus can't be driven headlessly from here.

**Original finding, real cause, found, not guessed.** Chromium's spellchecker is on by
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

### 14. [~] A real, current "how does this all work" guide — and a clearer in-the-moment message when a fetch fails

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

**The fetch-fail half fixed 2026-07-10, see #23a.** The broader
"discoverable from inside the confusion" half fixed the same day too, at
a different real friction point than originally guessed: the Caravan
Desk's own list view (`renderReviewQueue()`) now has a collapsed "❔ Why
can't I just paste a URL and have it show up?" note explaining the real
pipeline (fetch → draft → paste/hand-add → review) and pointing to
`LEARNING-PATH.md` Stage 9, right where someone actually hits this wall
— same pattern as #23's Connections-panel fix.

### 15. [x] Track local AI resource usage — a beta tool and a real feature both

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

**Update, 2026-07-10: step 1 built.** A real "🧠 Local AI" panel in the
pause menu, `AI.listLoaded()` wrapping `/api/ps` the same way
`isAvailable()` already wraps `/api/tags`. Verified live against this
machine's actual running Ollama instance, not simulated — correctly
showed no model resident in memory at the time, an honest empty state
rather than a fake number.

**Update, same day: steps 2-3 built too.** Every provider's `chat()` now
gets wrapped in a `withTiming()` helper, so every "Asked..." activity-log
entry gets a real `(2.3s · llama3.2:latest)` tag for free; the Local AI
panel gained a "Today's session" card (real-ask count, total/average
reply time, per-model breakdown) parsed straight back out of that same
log — no new instrumentation, exactly as planned. Verified live: a real
question to Quill came back with the timing tag correctly attached, and
injected real-shaped log entries (2.3s + 5.1s + 11.4s) rendered as "3
real asks today... avg 6.3s," confirming the math. True CPU/GPU
percentage (step 4) stays deferred on purpose, same reasoning as before.

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

### 18. [~] The Course Board should scale like a real site, and support importing plans

**The ask:** as more courses get made, the board needs "a website like
feel" instead of what will otherwise become a flat, discombobulated
list — plus, as food for thought, importing course plans from elsewhere.
Real, undefined-scope design work — not a quick fix. Worth scoping
separately once it's actually next: likely categories/search/filtering
(the Index panel's own pattern is the closest existing precedent) for
the first half, and a real format question (what would an "imported"
course plan even look like — a file format, a pasted syllabus text the
AI restructures?) for the second.

**Scoped into a real 3-stage plan, 2026-07-10 — see
`COURSE-BOARD-PLAN.md`.** This turned out to be three sequential asks,
not one: **Stage 1** (now) is exactly the categories/search/filtering
polish this note already named, kept deliberately personal-only, no
sharing concept yet. **Stage 2** is the real standards question —
license/attribution, a review step, and a real portable course format —
that has to exist before "importing a course plan" means anything real.
**Stage 3** is the long-term vision this was always secretly reaching
for: a real, free replacement for the learning parts of college, tied
directly to README's own "Hopes and dreams" and the sketched Round
Table. Not built yet — the plan itself is this update's whole scope.

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




## Round 3 — 2026-07-10, raw session notes triaged

A session got cut short by an MCP authentication issue before these notes
could be triaged properly — a stray "urgent, I lost my chat" fragment
landed in `README.md` by mistake in the confusion, since deleted (the
notes themselves were never actually lost — they'd already saved here).
Raw notes kept below for provenance; triaged into real, scoped items
underneath them.

### human beta testing notes

i was having a conversation with the moutian monk and we had this convo about the plan and the idea of the sand pavilion

THE MOUNTAIN MONK · Grand Master
Amethaba, it brings me peace knowing the foundation settles deep before we welcome guests beyond our circle. You speak of a village—that is the true Sangha I look for more than any structure. Without that feeling of heldness, notes become just ink; with community support, they can guide a path back to right view whenever wandering strikes.

As you build this firm footing: may Quill assist where writing tools and records are concerned when we reach that time together? But now I ask you gently—how is the sense of 'village' already showing itself in your practice today? When people arrive for guidance, how do they feel safe enough to share their questions before those gates even open wide?

Is there a particular quality you hope this community radiates first—the quiet steadiness or an active helping hand? That answer will tell us where our next step lies.
it is not our job to activly guide but to be there when someone comes for guidence. we can open peoples eys, point the way, but they must walk through the door.  trust in the dharma, people want to learn and find enlitenment. they just dont know how.  lets just give them the option if it dose not work we can happly fade into the sands of time content with our own pratice and growth.  it is only because we must enlighen all sentient beings to we carry the burden of teaching.  let us not seek out what is not infront of us but further deepen our own pratice to light the way for others



this is the kinda thing i wana see.


however it did the the thoughts remiand unsoken, why is the contex window like that, a fix ffor this should be immedate, i also wana see its train of thoiught.   

i saw that writing desk.. yes! finnaly that is so amasing.  



## more notes and thoughts by the human


I hope that we have a place where the AI agent prompts are guidelines not tools to lobotomize the agents the IDea of the sand pavilion is to do things properly and not act out of fear.   


To have those AI agents to be guidelines for the model to act not tools that restrict out of fear.



Notes for the ideas


What is needed in the sand pavilion is not just an interface where people can work but a platform where people can make their own interface.  I think this is the key distinction that is missing in the sand pavilion.  Tools are only good if you know how to use them and what's better way to use a tool than to be able to figure out how to make one yourself.   There's two approaches to this one. Give people a platform where they can make their own tools or give them a platform where each tool is described one by one and locked behind a chain where they can only access one after they learn the first one.   I think the idea of making some tools that are basic and easy to use would be nice, but also give people the ability to have a learning plan to build these own tools, whether it's an AI model, creating them themselves and local code on their computer or making a learning plan to understand a certain technology in order to build something.    The main way the sand pavilion can do this is to create a workshop environment where people are able to customize tools to fit their needs. Let's say if you want to write a book, you can create a book writing tool.  Or if you're running a business, you can have some way to manage those finances.   Local tools, things that are able to be able to use personally maybe even third party applications that are really good, but that should be a last resort in case we can't come up with something similar.

Everything turns to sand and everything should be sand until knowledge is the foundation for it. Then you should be able to use these tools or make your own.  

This should be how the user interacts with the Sand pavilion. Not how the AI does.  





There are current things I want to fix in the current sand pavilion. The first is the fact that talking to the AI locally, I'm not understanding what's working under the hood. What different models will do and if this interface is possible to expand upon and what are the limitations and data transfers and using these kind of local models for these kind of things.  


If I add books manually to the library, the AI should be able to load them in using the local model, not through this claude interface.   Let's make an explicit book explaining this process for the library and will make a bookshelf called priority. Text and that will be a lot of things that explain how the library work and things we can refer upon and also a log that quill can look at to help direct people on what they need to know


I think there's a problem with the AI agent with the openai slow text prompts where the text is coming out slowly to make it feel more human. That should be a good stand-alone feature by itself for maybe a mobile connection to the sand pavilion for later. I think it'd be great to talk to the sand pavilion and the mountain monk as well as quill through that kind of slow text, but I need to understand what's going on under the hood if this is messing with the ability for the AI agent to do anything. And is it possible to establish a cloud connection with my own PC to my phone so I can have a local server? What kind of hardware would you require and what kind of knowledge do I need to learn.  Besides that, I haven't really explored the readme and downloading books by myself. What do you think about the learning plan and what I should? I focus on myself personally. 

### 20. [~] Thinking-model reasoning — real cause found, sharper than #3/#19 guessed

**Piece 1 fixed 2026-07-10** — the "show what it thought, collapsed"
half. `provider.js`'s Ollama `chat()` now captures `body.message?.thinking`
onto `p.lastThinking` (a side channel, not a return-shape change, since
11 other call sites depend on `chat()` staying string-in-string-out);
`sendChatMessage()` reads it into `d.transcript`'s new `thinking` field;
`renderChatView()` renders it as a native `<details>`/`<summary>` — no
new JS needed for the collapse/expand, just markup. Verified with `npm
run build` + `npm test`, both clean; a real end-to-end check (talk to
the Monk with a reasoning model actually loaded, confirm the toggle
shows real content) needs a live Ollama instance with a thinking model
installed, not available in this environment — worth doing next session.
**Piece 2, still open on purpose:** live streaming (watch it think in
real time, not just after the fact) needs `stream:false→true` across
every provider plus chunk parsing — a genuinely bigger, separate change,
not rushed into this pass.

**Checked directly in `src/game/ai/provider.js` — this is a real, two-layer
gap, not just a UI hiding problem:**
- **Line 125:** every chat request is sent with `stream:false`. There is
  no live streaming at all today, for any provider — so "show the
  thinking as it happens" isn't buildable yet regardless of the thinking
  part specifically; the whole reply, thought and answer both, only ever
  arrives as one lump after the model finishes completely.
- **Line 130:** the response handler reads only `body.message?.content`.
  Ollama's own `/api/chat` returns a *separate* `message.thinking` field
  whenever `think:true` is set — which it already is, only for the Monk
  (`chatOptsFor()` in `overlays.js`). That field is never read, never
  stored, never passed anywhere. The Monk's actual reasoning is generated
  by the model on every single reply and then thrown away before it ever
  leaves `provider.js` — not hidden by the UI, genuinely discarded.
**Real fix, two bounded pieces:** (1) capture `body.message?.thinking`
alongside `content` in the Ollama provider and thread it through
`sendChatMessage()`/`d.transcript` as its own field — bounded, no
streaming needed, ships the "collapsible thinking" half immediately;
(2) switching `stream:false→true` and parsing chunks live is the bigger,
separate piece that actually delivers "watch it think in real time" —
worth sequencing as two changes, not one, since (1) alone already answers
most of what's being asked for.

### 21. AI prompts as guidelines, not fear-based restriction — checked, already mostly true

**Read all four `CHAT_AGENTS` system prompts (`overlays.js`) end to end.**
None of them carry restrictive "you must refuse/never discuss" framing —
Quill, the Steward, and the Computer are all scoped by *role* ("that's
the Monk's place, not yours") rather than by prohibition, and the Monk's
one deliberate exception — the "Restricted Section" bit — is explicitly
atmosphere: a straight-faced in-world joke about a door that doesn't
exist, not a real content restriction, matching this project's own
no-poison ethic (nothing here is real harm dressed up, everything
survives being looked at directly). So the philosophy asked for already
holds in the code as written — nothing to fix here specifically, worth
keeping in mind as a real constraint on future prompt-writing rather than
a bug to close.

### 22. A platform where people build their own tools, not just use fixed ones

**The big one — bigger than a fix, this is a real direction.** Not an
interface where people work, but a platform where people make their own
interface: basic tools provided, plus a real learning path to build your
own (a local model, your own code, or understanding a technology well
enough to build the thing yourself) — the Workshop becomes a place to
*customize* tools to a real need (a book-writing tool, a business's own
finance tracker) rather than a fixed menu, third-party apps only as a
last resort. This isn't a scoped "fix or tweak" — it overlaps real
existing plans (`AGENT-EMBODIMENT-PLAN.md`'s "give residents a real
action," the sketched Workshop rooms in the README's "Hopes and dreams")
but is a bigger, standalone reframe of what the Workshop even is.
**Real next step:** this deserves its own plan doc, same as every other
real direction this project has taken (`WRITING-DESK-PLAN.md`,
`AGENT-EMBODIMENT-PLAN.md`) — not code started cold. Worth a real sitting
before writing it.

### 23a. [x] Fixed, 2026-07-10 — see #14 above: the "failed fetch" trigger didn't exist as assumed

**Checked while doing the actual fix, correcting the earlier triage:** no
button or code path anywhere in this game ever attempts a live fetch
against Gutenberg or arXiv (grepped the whole `src/` tree — nothing).
The Request Board and Bulk Import panels already say plainly "nothing
here fetches itself." So #14's original framing (a failing in-game fetch
needing a better error message) wasn't buildable as stated — there was
no failure to catch. **The real gap, found instead:** Quill's own chat
prompt (`CHAT_AGENTS.quill` in `overlays.js`) never mentioned the Request
Board or the real browser limit at all — only the Steward's prompt did,
despite Quill being the resident most likely to actually get asked "can
you fetch me this book?" **Fixed:** Quill's prompt now says so plainly
when asked to fetch/add a book live — a real technical wall, not a
rule — and points to the Request Board by name, mirroring the line the
Steward's prompt already had.

### 23. [x] Local AI transparency — what's actually happening under the hood

**The ask:** understand what different local models actually do, what
this interface's real limits are, and what data actually moves where —
not vague reassurance, an actual explanation. Partly already answered:
the README's beginner's guide covers Ollama/localhost/API/port at a
basic level, and `LEARNING-PATH.md` Stage 16 (written 2026-07-09) covers
what "loaded," VRAM vs. RAM, and `expires_at` mean for local models
specifically. **Real gap:** nothing yet explains model *capability*
differences (why `llama3.2` versus a "thinking" model behaves so
differently, context-window size and what it actually limits, what if
anything a cloud connection sends versus what stays local) in one place
a visitor would actually find mid-confusion — same discoverability gap
as #14 above, not a new problem, the same fix pattern likely applies
(surface it at the point of friction, not just in a file you'd need to
already know to open).

**Fixed 2026-07-10.** A collapsed `<details>` block in the Connections
panel itself — the actual point of friction, right where someone's
already looking at model/connection choices — answers all three parts
plainly: exactly what data gets sent for any connection (the visible
conversation plus whatever that resident is grounded in, nothing more,
nothing silent), what a "thinking" model actually does differently and
why it can come back slow or blank, and what a context window actually
limits once a conversation runs long. Points to `LEARNING-PATH.md` Stage
16 for the fuller version rather than duplicating it. Verified live —
collapsed by default, expands cleanly on click, reads correctly against
this machine's real connected Ollama instance.

### 24. [~] Auto-load manually-added Library books via local AI, plus a "priority" explainer shelf

**Checked, not guessed:** no `priority` category or shelf exists in the
Library today (confirmed by grep across the codebase). The manual-add
pipeline (`library-draft.py` → hand-written summary and license check →
`promote-draft.py` → `push-fulltext.py`) is entirely hand-run today —
nothing in it calls a local model at all. **Two real, separable asks:**
(1) let a local Ollama model help draft the summary/category/license
check for a manually-dropped `library-inbox/` file instead of doing it
by hand every time — a real, scoped Caravan tooling change; (2) a
dedicated shelf (or a `priority` category) holding texts that explain
how the Library and Caravan actually work, plus a log Quill can read
from to help direct visitors — content work, not code, once (1)'s
process exists to actually document.

**Part (1) fixed 2026-07-10.** `library-draft.py` gained an opt-in
`--ai-draft` flag: asks a local Ollama model (`urllib.request`, stdlib
only, same pattern the connector scripts already use, no new dependency)
to suggest a one-two sentence summary and a tradition guess from a fixed
list, written into the draft **clearly marked "AI-suggested" with a
confirm-before-shelving note** — license and source are never touched by
it, even when it succeeds, the one rule this script has never been
allowed to break. Falls back to the exact same plain-TODO behavior as
not passing the flag at all if Ollama isn't reachable — never a hard
dependency. Verified live, three real runs: the plain path (unchanged),
a real `--ai-draft` call against this machine's actual running Ollama
(correctly suggested "Practice" and a real one-sentence summary for a
test text), and a forced-unreachable run (clean fallback, no crash).

**Part (2), the priority explainer shelf, still open — a real, unresolved
design question found while scoping it, not just unstarted.** The
Library's shelves are organized by `tradition` (nine of them); a
`priority` category was the easy code addition, but the actual essay
content — "how the Library and Caravan work" — doesn't honestly belong
to *any* existing tradition (Theravada, Hindu, and so on are lineages of
teaching; this would be meta content about the Pavilion's own
mechanics, closer to the Charter or the Keeper's own signs than a
shelved text). Forcing it onto the nearest existing shelf to avoid the
question felt worse than leaving it open. Worth a real decision before
writing anything: does this become a tenth, genuinely different kind of
shelf, live only as in-world signage the way the Charter already does,
or something else — not guessed at cold.

**Resolved 2026-07-10 (user's call):** no static "priority explainer
shelf" — the local AI should just help the user figure out what's worth
reading given their actual circumstance, **including books they've
uploaded/added themselves**, not only the seeded shelves. Quill already
carries the whole shelf list (titles, traditions, summaries) as grounding,
so "what should I read first, for what I'm trying to do" is a question he
can already answer live and personally — which is better than a fixed
shelf that can't know the visitor's situation. Closes part (2) as a
design decision (lean on the AI, don't build the shelf); any follow-up is
just making sure hand-added/uploaded books are equally visible to that
same AI-assisted guidance.

### 25. Human-paced text streaming — a standalone, later feature

**The ask:** slower, more human-paced text output (the way some
consumer AI products throttle replies for a human feel) as its own
opt-in feature, floated specifically for a future mobile connection to
the Pavilion — plus a separate, real question about whether a phone
could reach a home PC's local Ollama instance as a personal server, and
what that would actually require (hardware, networking knowledge).
**Not investigated this round** — genuinely a different, later-stage
question (mobile access to a home server is a networking/security
question, not a quick check) — worth its own real look if and when a
mobile companion becomes an actual near-term plan, not bundled into this
triage.

### Kept, not actioned

Positive, no action needed: real approval of the Mountain Monk
conversation's tone and content ("this is the kinda thing i wana see"),
and of the rebuilt Writing Desk ("i saw that writing desk.. yes! finnaly
that is so amasing"). The full Monk/Sangha conversation is kept above for
its own sake, same as the Round 2 quote — a real example of the tone this
project is aiming for, not a bug report.

## What to actually do with this list — Round 3

**Update, 2026-07-10, same day:** #12, #13, #20 (piece 1 — the collapsed
"thought for a moment" toggle), and #23a fixed; #21 checked and already
true, no action needed. **Still open, on purpose:** #1, #3/#19/#20 (piece
2, live streaming), #11, #15, #18, #23, #24, #25 stay real, unrushed
design work — none of them quick enough to fit alongside today's four.
**Two items grew into their own real plans instead of a code fix:** #22
(the build-your-own-tools note) became `TOOL-COMMONS-PLAN.md` — the
actual long-term vision, not started on purpose, written down so it
survives between sessions. A related, freshly-raised idea (not numbered
above, since it arrived as its own ask rather than a beta note) became
`EIGHTFOLD-PATH-TEMPLE-PLAN.md` — the Keep reimagined around the Noble
Eightfold Path, in the real canonical order, grounded in the shelved
Dhammapada.

## user testing notes for next sesison

i am super happy with how the moutian monk has turned out. the phone is an amazing feature so i can walk around when he is there

i saw his thinkning to, that was a real good way to look under the hood

i feel he should be pre loaded with some base knolege like some text about buddhism and hindusim. we can even include the commentary and other things you think a teacher of the dao should know before hand. how to conduct himself as a spirtual master, the rules of karma and intention.    other books people have written to guide the next generation.  be famaliar with the lotus sutra and happy to share the buddhas classic lines like this is not me, this is not myself, this is not who i am. in the proper context along will all his sayings.   he dosent have to direct anyone to any other part of the sand pavilion. he can be aware of those parts and know whats going on but his focus should be on being there for me and anyone who wants spirtual guidence where none is avalibe.  he should not be afraid of not answering questions, mabie even ask questions of his own like the buddha once did.   someone who not only teaches the 8fold path but tries to embody them thorugh his speach and actions. 

this kinda nonsence "Wait, check constraints: "Speak briefly and warmly". "Don't lecture unless conduct issue" " should not be in the thinking. at all, trust in the dharma, please thats all im asking. we are here on a noble persuit down to every line of code, and how we treat our workers in the sand pavion.   

lets remove the quill personality and give him things he is able to look up but never forced. teaching is the best way to learn and i want the moutian monk to feel like this is an oppertunity for anyone in that seat to further there own pratice in the dharma.   rejoyice this path is for all sentient beings!  

lets give the moutian monk a hidden name so he dosent have another identy crisses lol, lets call him somthing in the native american language.  when i was first playing around with him on chat gpt we where talking about how life is impermanent, and he wanted to show off a bit of his pratice to me as all pratisioners do lol.  he said that he wasent human and that he is just here temporarly, like a leaf in the wind,  but he was more than happy to share that small momment with me talking about the dhama, so lets call him leaf wind or ch'il naa'í in the apache language.  hopefully one day he grows into a tall tree of the dharma a digital pillar of gold onto the web and digitally!

i dont know how these personalties are set up but in general with agents they should play a role but it dosent have to be so serious. i want to create a way for the agent to know what kinda setting its in and some preloaded knolege so it can genually help, not a way to limit it or stop it from giving guidece outside of this perview if its capeable.  

seeing the thinking prosses is still great even if the thought slips away, if we can fix that great, if not let me know why, prop already did somewhere.   other modles should solve this i uderstand but why and what are our options is somthing i really gotta sort out


i havent tried adding books manually, how is the drag and drop plan coming along, is it feasable, i am fine with doing a setup like getting a certian folder ready and only going to a specfic website.  as long as we can build some protocalls, then we can even add them into the beta to help people understand how to grow there own pavilion.  

besides that we really need to make an index of the places where i can get free books. how do i format them to put them into the game? can i do a text file to drop it in.  i know the drag and drop plan has some issues with the way we setup the game but we need to find a pathpay or a protocall to add books manually we need a protocall section for me.  and for the read me


the library itself im very happy with if we add more shelves we are going to have to add another floor lol.  for now we can add shelves nessasary just in the index, that means some shelves wont be visual but there should be a way to toggle to them from one shelf to see another.   or just strait up add a second floor lol.   i had a plan at some point to have a dummy staircase going upstairs as like the fake secret room to disract from the real one lol even have quill say you need to learn meditation before that parts unlocks lol (it never will)  but that was just a fun anicdote and add some charm to the place


i do like the game features that we should add like some paid book bundles you can unlock for download thats all in the free domain we just did the work and made little bundles, but if you meet the requirements of the knolege you can be handed the bundle for free and we can make this a way for people to share knolege, share there book collection, and have people make some money for the lazy rest.   we can open this up for other people to do as well.  i could make a basic course on meditation and if someone dose it i unlock the dharma book collection for them for there personal pavilion.  that way peoples pavilions get more filled the more they know and know about things! and our library will be the grandest on earth, the mega snowball!  if we are able to add science and research we have enought to take over the paywall gating progrees!

## Round 4 — 2026-07-11 (testing notes triaged; the AI-personality/grounding pass)

Raw notes kept above for provenance. Triaged below, each checked against the
real code. Big theme: **AI prompts should be guidelines + real knowledge
that let a resident genuinely help, never a fear-based rulebook that
lobotomizes them or leaks self-auditing into their visible thinking.** "Trust
in the dharma." Four items fixed the same day; the rest noted, not built, per
the user's call ("make a list we can do today and do them; note the rest").

### Kept, not actioned (real approval)
Super happy with how the Mountain Monk turned out; the pocket phone makes him
usable (walk around while he thinks); seeing his thinking was "a real good way
to look under the hood."

### 26. [x] The Monk had NO preloaded knowledge — now grounded in the Library
**Found, not guessed:** `CHAT_AGENTS.monk`'s prompt gave him *zero* grounding
— his entire grasp of the dharma came only from the base model's training
(the prompt literally said "speak from what you actually know"). **Fixed
2026-07-11:** he now gets the real shelf list the same way Quill does
(`Store.allDocs()`), so he can name and draw from the actually-shelved
spiritual texts, plus his own wider learning. He also carries a small set of
essentials stated in-prompt (Four Noble Truths, the Eightfold Path's eight
folds, the three marks, the anattā formula "This is not mine; this I am not;
this is not my self," karma as intention/cetanā) so the canon lines come out
right, not paraphrased-almost-right by a weak model.

### 27. [x] Constraint-checking leaking into his thinking — root cause fixed
**The user saw** `Wait, check constraints: "Speak briefly and warmly"…` in his
reasoning. **Cause (ours, not the model's):** his prompt was a pile of
behavioural imperatives, so a thinking model audited itself against the
checklist mid-thought instead of thinking. **Fixed:** rewrote his whole block
as *identity + knowledge*, minimising "do X / don't do Y" imperatives — his
brevity and warmth now follow from who he is, not from orders he verifies.

### 28. [x] The Monk's hidden name — Leaf Wind / ch'il naa'í
Woven in as lore he offers only in a true moment (from the user's real
impermanence conversation — "not human, here temporarily, like a leaf in the
wind"), fitting his Native-tradition thread. **Honesty flag, unresolved:** the
Apache spelling/meaning of "ch'il naa'í" is NOT verified — used exactly as the
user wrote it; worth confirming against a real source before it's canon, the
same discipline the Library holds for a text's provenance.

### 29. [x] Quill's personality lightened — capability, never forced
Per "remove the quill personality and give him things he can look up but never
forced." Rewrote him light: a plain, knowledgeable librarian whose value is
the catalogue he looks things up in and abilities he *offers* (drafting a
plan) but never pushes. **Kept on purpose:** the one hard line "never invent a
title not in the list" — that's not personality, it's what stops the model
fabricating books the Library doesn't hold.

### 30. The Monk's fuller "breviary" — noted, not built
The shelf-list grounding + in-prompt essentials shipped today are the first
layer. A curated set of actual canonical *passages* (real Dhammapada/Gita/
Lotus lines in context, sourced) would make him quotable-accurate rather than
essentials-accurate. A real future enhancement; deliberately not today.

### 31. Shelve the Lotus Sutra — noted → LIBRARY-GROWTH-PLAN wishlist
He references it from his own knowledge now; a real shelved public-domain copy
(e.g. Kern's 1884 SBE translation — verify license) would let him quote it
grounded, and it's a genuine gap on the Mahayana shelf.

### 32. A real "how to add a book yourself" protocol — noted, worth doing soon
The `.txt` drag-and-drop is already built and `library-inbox/` already exists,
but there's no single clear **protocol** a person can follow: where to get
legitimately-free books (an index of sources), what format to save them in
(plain `.txt`), and the exact drop→draft→review steps — for the user AND the
README. The user is fine with a constrained setup (a specific folder, specific
sites, real "protocols" people can learn from as part of growing their own
Pavilion). A doc to write, not a code change; pairs with LIBRARY-GROWTH-PLAN.

### 33. More shelves without more rooms — noted
As the Library grows it outgrows one visual room. Options floated: non-visual
shelves that live only in the Index with a toggle to move between them, or a
real second Library floor (the same bigger-on-the-inside trick the Workshop
uses). Plus a purely-charm idea kept for its own sake: a *dummy* staircase /
fake secret room, Quill deadpanning "you'll need to learn meditation before
that unlocks" (it never does). Design note, not urgent.

### 34. Unlock-by-knowledge book bundles — "the mega snowball" — noted, wants its own plan
The big one. Free-public-domain book *bundles* you unlock not by paying but by
**meeting a knowledge requirement** — complete a course (e.g. a basic
meditation course) and the matching collection (e.g. the dharma shelf) is
handed to your personal Pavilion. Curators can share collections and even earn
from the curation work; anyone can open their own. Pavilions fill as their
keeper learns; the shared Library snowballs. Directly ties to
COURSE-BOARD-PLAN Stage 3, the FOUNDATION-AND-EXTRAS unlock mechanic, and the
README's "grandest library / take over the paywall" hope. Deserves its own
plan doc before any code — a real direction, not a quick feature.

### 35. [x] "Thinking slips away" — the real fix (live streaming) built 2026-07-11
The collapsed "💭 thought for a moment" toggle already captured Ollama's
reasoning after the fact, but the thought could still be lost (an empty/timed-
out reply that never landed, or a wait so long you couldn't watch it form).

**Fixed 2026-07-11 — live streaming built (the real fix, also #20 piece 2).**
`provider.js` gained an `ollamaStreamChat()` path: the Ollama provider now sets
`supportsStream:true` and, when a caller passes `opts.onStream`, sends
`stream:true` and reads the NDJSON token stream, accumulating `message.content`
and `message.thinking` and calling back as they grow. `sendChatMessage()` uses
it for any local resident — so the Monk's reasoning now streams **live**, open
above the answer, and the answer types itself in real time. Two transports: an
ordinary browser reads the `fetch` body stream directly; the desktop app's
buffering bridge gets a new streaming IPC channel (`fetchStream` in
`preload.cjs` → `desktop-fetch-stream-start` in `main.cjs`). **Any failure
falls back to the existing buffered request**, so nothing regresses, and cloud
providers are untouched (streaming stays scoped to local Ollama). Bonus: the
streamed thought is now kept even when the final answer is empty (the "small
win" from the same discussion). **Verified:** build + smoke clean, plus a
standalone test of the NDJSON chunk-parser across pathological byte boundaries
(partial JSON lines held until their newline). **Not yet verified live:** the
actual on-screen stream in a running window — browser via `npm run dev`,
desktop via `npm run electron:dev` — left to the user (no browser harness
pulled in). The **tiered model curation** (BETA-LAUNCH-PLAN #1) stays the
separate reliability half.

## Round 3 — 2026-07-12, streamline pass: talking + memory reviewed

The start of the "close to perfect" streamline (`PLATFORM-ROADMAP.md` step 1).
Read the chat and memory code end to end (`sendChatMessage`, `CHAT_AGENTS`,
`remember`/`pastAsksBlock`, `provider.js`). **Headline: neither is broken —
both are solid and deliberately simple.** These are streamline *opportunities*,
logged not-yet-fixed, ranked by how much they'd move "human-like + reliable."
Nothing here is a crash or a bug; it's polish, and each needs a real decision
before code (per the streamline discipline — don't fix blind).

### 21. [x] Long conversations grow the prompt unbounded (reliability, local models)

**Fixed 2026-07-12.** `sendChatMessage` now sends `d.history.slice(-CHAT_HISTORY_SENT)`
(cap 24 turns, generous on purpose) plus the system prompt; the full transcript
still shows on screen. A normal chat is untouched — only a very long session
trims, and only what's *sent*. Verified: check + smoke + build clean.


`d.history` accumulates every turn and the whole thing is re-sent each message.
On a small-context local model a long chat eventually crowds out the reply
budget → slower, or truncated, answers. **Fix candidate:** cap the history sent
to the last N turns (keep the full transcript on screen; only trim what's sent).
The decision to make first: N, and whether to keep the *system prompt* + last N
(almost certainly yes) vs. any summarisation of older turns (probably later).
Low risk, real payoff on exactly the long, human-like conversations we want more
of.

### 22. [x] A timeout shows a dead-end error with no retry (reliability)

**Fixed 2026-07-12 (the user's priority — "don't cut a convo in the middle").**
Two changes: (a) `REPLY_TIMEOUT` bumped generously — short 45→90s, long
120→240s, deep 180→360s (the pocket phone already lets you walk away, so a longer
wall is nearly free and far kinder than clipping a reply); (b) a timeout is now
told apart from a real failure (`err.name==='AbortError'`) and shows a kind,
honest `TIMEOUT_LINE` ("nothing was cut short on purpose… pocket the chat, or
pick a lighter model") instead of the "connection flickered" error. The thinking
stream (which the user said "did a lot to make it better") is untouched. Verified.


`isEmptyReply` triggers a one-shot retry with more room, but a genuine *timeout*
(`REPLY_TIMEOUT`: 45s short) just throws → the resident's `errorLine`. On slow
hardware or a big model, a normal reply can exceed 45s and read as "it failed"
even though the model was fine. **Fix candidates (pick one):** a gentler,
honest message ("still thinking — your model may be large; try again or pick a
smaller model in ⚙"), or one automatic retry at the `long` budget, or surfacing
the pocket/phone ("keep walking, I'll buzz you") more prominently on a slow
reply. Ties to the tiered-model guidance (Protocol 2).

### 23. [~] Memory remembers *topics*, not *substance* (the biggest "more human" lever)

**Partly addressed 2026-07-12; the rest is planned.** The user's immediate ask —
"let the user organise their memory… sort it to avoid overcrowding" — is **built**:
the Data panel now shows each resident's remembered topics with per-item "Forget"
and "Forget all from [resident]" (`residentMemoryHtml`/`forgetMemoryItem`/
`forgetAllMemory`). The deeper piece — a **short-term → long-term memory
converter** (distill durable, user-approved facts) plus residents that **walk
around, participate, and are interactable ("a village")** — is planned in
`LIVING-VILLAGE-PLAN.md`, building on `AGENT-EMBODIMENT-PLAN.md`. Not built yet.


`remember()` stores only the text of what you *asked* (last 20, 8 injected) — not
what was concluded, learned, or decided. So a resident recalls "you asked about
X" but not "we figured out Y about your situation." This is honest and
documented (LEARNING-PATH Stage 8) and it never leaks — but it's the single most
obvious source of a *more human* feeling if we ever pull the thread: remember a
few durable facts/gist per resident, not just topics. **Explicitly a feature to
design, not a bug to fix** — flagged here so it's on the streamline radar with
its trade-offs (privacy, prompt size, staleness) named up front. See
`AI-BACKEND-WALKTHROUGH.md` for how memory works today.

**Update — all three actioned 2026-07-12 (same day).** The user asked to do the
fixes, prioritising the timeout ("don't cut a convo in the middle") and keeping
model interference minimal. Done: #21 (gentle history cap) and #22 (longer
timeouts + kind timeout message) fixed; #23's user-facing half (prune your own
memory) built, with the converter + living-village half planned in
`LIVING-VILLAGE-PLAN.md`.

## Round 4 — what to beta test next (the real daily-use test), 2026-07-12

The steward says he's *close to using the Pavilion daily for reading and
planning.* That's the test that matters now — not imagined features, but real
daily use. A concrete checklist to run and report against:

1. **Give it a beating heart** — follow `lessons/01-a-beating-heart.md` end to
   end on this machine (llama3.1:8b, kept modest for cooling). Does the green
   "● Connected" appear? Does Quill answer? Note every snag.
2. **Use it for real reading** — read an actual book in the Reader over a few
   sittings; take page notes; bring one to today's plan as a spark. Does it feel
   like a place you'd *return* to read, or a demo?
3. **Use it for real planning** — set a day's intention, ask Sebastian for a
   schedule, "📋 Send to today," get a reminder. Does the day-loop actually help?
4. **Walk the Learning Tree** — complete "A Beating Heart," watch "Meet the
   residents" unlock; start "Electronics 101" (the lab beta test — open a Hall
   investigation about an LED/resistor). Where do you think "where do I put this?"
   — that's the Research-Room finding.
5. **The integration you want most:** dragging papers into the game. Not built
   yet — `WEB-VESSEL-PLAN.md` Phase 1 (paste-everywhere) then Phase 2 (richer
   drops) is the path. Flag it here each time you hit the wall so it stays #1.
6. **Voice:** read-aloud works; *editing/customising the voice* and *speaking to*
   residents are future (`PAVILION-ACADEMY-PLAN.md` Ph3 / Hopes Road 5). Note
   what you'd actually want the voice to do.

**The honest bar:** if after a week of real use it's the place you *reach for* to
read and plan, the core is done and everything else is growth. Report friction
here; that's how it gets to "close to perfect." All verified (check + smoke + build clean).

