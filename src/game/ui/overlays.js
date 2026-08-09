import { Store } from '../data/store.js';
import { state, data, persist, todayKey, DEFAULT_BLOCKS, logActivity, awardBadge, upcomingItems, openSparks, plantStage, freeGroveTile, requirementMet, requirementText } from '../entities.js';
import { GATE_BEQUESTS } from '../data/bequests.js';
import { COMMONS_PACKETS, PACKET_KINDS } from '../data/commons-packets.js';
import { VIS, visBadge, visLine, DATA_MAP } from '../data/visibility.js';
import { triage, extractEvidencePrompt, parseEvidence } from '../data/copyright.js';
import { LEVELS as SOURCE_LEVELS, LEVEL_ORDER, assess as assessSource, mayEnterCommons } from '../data/sourcing.js';
import { parseDraftedSteps, cleanAnswer, tooSimilarStep } from '../data/draft-parse.js';
import { planToLesson } from '../data/plan-to-lesson.js';
import { recommendModel, pullCommand } from '../data/machine-advice.js';
import { preSortShelves, unsortedWorkOrder } from '../data/shelf-rules.js';
import { theDayItems, theDayLine, forgottenNotes, FORGOTTEN_AFTER_DAYS, notesToday, notesTodayLine } from '../data/the-day.js';
import { gatherRecords, recordSummary, RECORD_LOOK } from '../data/records.js';
import { backendTrouble } from '../data/backend-trouble.js';
import { readingIn, readingLabel, lessonToMarkdown, lessonToHTML, lessonFileName } from '../data/lesson-doc.js';
import { esc, jsq, NOTE_SELECT_STYLE } from './dom.js';
import { initStudyTable, renderStudyTable, studyStep, studyLabelToggle, studyLabelSave,
         studyUnlabel, studyOpenHere, studyAddNote, studyTableLabel, invalidateStudyCache,
         studySetAgent, studyFillPrompt, studyAsk, studyKeepReply, studySetBook, studyCarryBook, tableBook,
         studyTidyNote, studyToggleHistory, studyRestoreVersion, studyDraftLesson } from './study-table.js';
import { rememberInto } from '../data/memory.js';
import { manPage, manIndex, MAN_PAGES } from '../data/man-pages.js';
import { ROLES, DEFAULT_PACE, rosterBlock, rosterForVisitor } from '../data/roles.js';
import { initNoteAuthor, byLine, isAiNote, authorOf, attributionOf, labelledNote, currentUser }
  from '../data/note-versions.js';
import { catalogueBrief, briefCaveat } from '../data/catalogue-brief.js';
import { REFERENCE, lookup as refLookup, refLine, referenceBlock } from '../data/reference.js';
import { paginate, searchPages, passagesBlock, hasResults } from '../data/retrieval.js';
import { findChapters, chapterAt } from '../data/chapters.js';
import { mergeMarks } from '../data/marks.js';
import { pickUp, setDown, isCarrying, carriedOf, carryLine, stale, carried,
         setAside, setAsideList, takeUp, KINDS, CARRY_CAP } from '../data/carrying.js';
import { reachOf, setReach, mayReachNote, REACH_STATES, REACH_NOTICE, sealedCount } from '../data/note-reach.js';
/* Today's Tasks lives in its OWN module — a new room does not go into a
   12k-line file. Only the window exports and one initDailyTasks() call are
   here, which is the ui/study-table.js seam exactly. */
import { initDailyTasks, openDailyTasks, takeDailyTask, toggleDailyTaskStep,
         dailyTaskGo, finishDailyTask, setDownDailyTask, retakeDailyTask,
         todaysTaskLine, closeOutPastDays, dailyTaskWhereChanged } from './daily-tasks.js';
/* The one road to knowledge — the same term extraction every resident uses to
   search the shelves, now used to search your notes too. Two ways of turning a
   question into a query is the drift this project keeps paying for. */
import { groundingPlan } from '../data/lookup.js';
import { placesByScene } from '../data/places.js';
import { storageBadge, storageOf, storageSummary, localRoom, nextDestination,
         STORAGE_STATES, DEFAULT_LOCAL_BOOK_CAP, LOCAL_CAP_MIN, LOCAL_CAP_MAX,
         normalizeCap, estimatedBytes, humanBytes, AVG_BOOK_BYTES } from '../data/book-storage.js';
import { scenes } from '../scenes.js';
import { BADGES } from '../data/badges.js';
import { blip, setHud, warpTo } from '../main.js';
/* `estimateTokens` was MISSING from this list until 2026-08-10 and is used at
   the bottom of previewPrompt() — so "👁 What would they be told right now?"
   threw, left "building…" on screen and never recovered. Silent since 06b892a.
   Found by taking a screenshot of the panel; there is a derived guard for the
   whole of this import in npm test now, because a bare identifier that only
   throws on one code path is exactly what a build will not tell you about. */
import { AI, isAIActive, providerFor, detectAI, isEmptyReply, bestLocalModel, isCloudModel, isLocalConn, chatOptsFor, initProviderSettings, estimateTokens } from '../ai/provider.js';
import { CHARTER, WORK_CHARTER, BUTLER_CHARTER } from '../data/charter.js';
import { CATEGORIES, TRADITIONS } from '../data/seed.js';
import { speak, stopSpeaking, isSpeaking, ttsAvailable, ttsVoices, setTTSSettings, getTTSSettings, skipSpeech, canSkipSpeech, pauseSpeaking, resumeSpeaking, isPaused, hasAudio, clearPaused, speechProgress } from '../tts.js';
import { epubToText } from '../epub.js';

/* ================================================================
   MAP OF THIS FILE — read this before hunting.

   ~13,000 lines, and that is NO LONGER FINE. This header said "~10,000
   lines, and that is fine" — it was written when that was true, and it
   was still saying it at 12,966 (measured 2026-08-10: 74% code, 732
   top-level definitions, ~2,000 lines carrying HTML).

   The original claim's REASONING is still correct and worth keeping:
   these are a few dozen INDEPENDENT panel renderers, not a tangle, and
   nothing here has ever broken because the file is long. That is
   precisely why the split is a moving job rather than a rewrite. What
   changed is the cost of "where do I even look", which grew with the
   file while this sentence said it hadn't.

   THE SPLIT IS PLANNED AND UNDER WAY — plans/OVERLAYS-SPLIT-PLAN.md.
   Five regions are already out (see below). The order is derived from
   data/places.js's `scene` field, so it cannot go stale the way this
   line did. So:

   HOW TO USE THIS MAP. Search for the quoted anchor text, not a line
   number — line numbers rot within a day and a stale map is worse than
   none. Every anchor below is checked by `npm test`; if you rename a
   section, the test tells you to fix this map.

   THE SHAPE OF EVERY PANEL, so one is enough to learn:
       openThing()      sets state.ui, hideAllOv(), renderThing(), showOv('thingOv')
       renderThing()    writes innerHTML into #thingPanel — no logic worth testing
       state.thingView  whatever that panel is currently showing
   and EVERY function called from an inline onclick MUST appear in the
   `Object.assign(window, {...})` block at the very bottom, in both
   directions — `npm test` checks both, because each has bitten.

   ── The residents and the chat stack ──────────────────────────────
     THE RESIDENTS THEMSELVES LIVE IN `ui/residents.js` — moved out
     2026-08-04 as the first cut of this file. CHAT_AGENTS and every
     systemPrompt() is over there; what they need from here is handed
     to initResidents() below. Their WINDOW EXPORTS still live here,
     because one file must own that block.
     "read the current dialog" scripted dialog + read-aloud
     "Sebastian's reminder"    the opt-in ping. No polling anywhere else.

   ── Panels that have already moved out ────────────────────────────
     `ui/residents.js`   CHAT_AGENTS and all their grounding blocks   1,017
     `ui/lesson-tree.js` the curriculum, authoring, drafting, export  1,063
     `ui/study-table.js` working through a book one story at a time     747
     `ui/daily-tasks.js` Today's Tasks — BORN OUT HERE, never in         334
     `ui/dom.js`         esc / jsq                                       27
     The order for the rest is in plans/OVERLAYS-SPLIT-PLAN.md, and
     `ui/daily-tasks.js` is the shape to copy: overlays.js kept only
     the window exports, one initDailyTasks() call, and a menu line.

   ── Frame: menu, settings, your data ──────────────────────────────
     "Pause menu"              every door in one place. Add new rooms here.
     "AI status + Connections" Ollama / OpenAI-compatible / Anthropic
     "Can my computer run"     measures the machine instead of asking
     "Voice settings"          read-aloud voice + rate
     "visibility first"        Your Data, and DATA_MAP
     "Save export / import"    the whole Pavilion as one file
     "Activity Log"            what actually happened, human-readable

   ── The Library ───────────────────────────────────────────────────
     "Library shelves"         shelf browser + the Reader
     "Reading the whole book"  paginated full text, read-aloud, the pocket
     "Getting somewhere in a"  chapter jumps in a long book
     "The Index"               flat list by category
     "The Stacks"              hierarchical, and knows YOUR shelves
     "Your Shelf"              the personal half: filing, bulk moves,
                               the AI shelf suggester, the undo
     "BRING A BOOK IN"         the intake table
     "DROP A FILE ANYWHERE"    the global drop handler + the veil
     "[BUNDLES]"               a packet of books, reviewed before it lands
     "Steward Review Queue"    texts entering the certified Library
     "Live SuttaCentral"       the one in-browser fetch that works

   ── The Study: the day ────────────────────────────────────────────
     "THE DAY"                 ☀ Today — five things, no AI, no timer
     "SEBASTIAN'S STAND-UP"    one question at a time
     "Planner (the Writing"    the Writing Desk
     "Sparks"                  a thought from a book becomes a task
     "Your Notes"              every note store, gathered
     "The Idea Jar"            one click to jot, one click back
     "Paths"                   things you walk, deliberately undated
     "THE COMPUTER, rebuilt"   the terminal index. No AI required.
     "Upcoming"                the due badge and everything behind it

   ── The Workshop ──────────────────────────────────────────────────
     "The Archive Desk"        your own writing
     "The Research Desk"       projects and notes to think in
     "The Records Hall"        the project's own memory, walkable
     "THE LIFT"                three floors, named
     "THE LAB"                 the gathering view: builds, datasheets,
                               paper books, investigations
     "THE BENCH"               predict → do → measure. Two-phase on
                               purpose; the guess cannot be edited after.

   ── The Science & Research Hall ───────────────────────────────────
     "seed investigations"     the worked examples, and the method
     "Phase 3 — self-experiments"  n-of-1, logged by hand
     (the Investigator lives in CHAT_AGENTS above)

   ── Learning ──────────────────────────────────────────────────────
     THE LEARNING TREE MOVED to `ui/lesson-tree.js` (2026-08-04, split
     cut #1): CURRICULUM, the lessons you wrote, drafting one with a
     model, and taking one out as a document. Its window exports are
     still listed here.
     "Course Board"            pinning and archiving

   ── The Café and sharing ──────────────────────────────────────────
     "The two café wall boards"  dormant by design; says so
     "The Grant Desk"          funding proposals
     "The Alexandria Stone"    the Commons Table
     "The bequest file"        the Inheritance Hall's unit
     "The Request Board"       books you want, queued for the Caravan

   ── Things worth knowing before you change anything ───────────────
   · Pure logic belongs in data/*.js so `npm test` can reach it —
     copyright, sourcing, memory, the-day, shelf-rules, draft-parse are
     all out already. Add to that habit rather than to this file.
   · hideAllOv() DERIVES its list. Never hand-maintain one again; that
     exact pattern has bitten twice (this file's window exports, and
     hideAllOv itself).
   · Splitting this file: by ROOM, one at a time, while you are already
     working in that room. Never as a big-bang refactor — a working
     10k-line file becomes a broken twelve-file one.
   ================================================================ */

/* esc/jsq moved to ui/dom.js — the first extraction out of this file, so
   ui/study-table.js can share them instead of keeping a second copy of an
   escaping rule. See the import at the top. */
/* escaping text is not the same as a safe link — a `javascript:` URL
   still renders as harmless text but still runs if someone clicks it.
   Anywhere a user-supplied URL becomes an href (Waypoints, course steps),
   route it through this first. */
function safeUrl(u){ return /^https?:\/\//i.test(u||'') ? u : ''; }

/* ---------- dialog ---------- */
/* Scripted, non-AI NPCs (and signs) still use the small popup box at the
   bottom of the screen — quick, doesn't interrupt the world. AI-backed
   residents (Quill, the Steward, the Monk) use the full-screen chat view
   below instead, since a real conversation deserves room to breathe. */
/* A DIALOG IS WORLD-LEVEL, SO IT CLOSES WHATEVER PANEL IS OVER IT.

   Found 2026-08-10 the first time the pause menu could open a room: pressing
   THE HEARTH, THE COUNTER, THE NOTICE BOARD or THE RESIDENTS' BOARD from the
   menu appeared to do NOTHING. The dialog box really did open — underneath a
   full-screen overlay that was still up — and because state.ui was still
   'menu', onAction() returned early, so E could not even advance the thing
   you could not see. Close the menu and a dialog you had no memory of asking
   for was waiting for you.

   That is the house failure mode exactly: a button that silently does
   nothing. Fixed here rather than in the four openers because EVERY caller of
   openDialog is world-level — fishing, signs, NPCs, the unbuilt-room
   placeholders and these four flavour stations. From the world this is a
   no-op (no panel is open); from a panel it is the only correct behaviour.
   npm test holds that: a dialog opener that leaves a panel up fails. */
export function openDialog(name,lines){
  if(state.ui){ state.ui=null; hideAllOv(); }
  state.dialog={name,lines:Array.isArray(lines)?lines:[lines],idx:0,chat:false};
  document.getElementById('dialog').style.display='block';
  renderDialog(); blip(740,.06,'square',.03);
}
function renderDialog(){
  const d=state.dialog;
  document.getElementById('dName').textContent=d.name;
  document.getElementById('dText').textContent=d.lines[d.idx];
  document.getElementById('dMore').textContent = (d.idx<d.lines.length-1)?'▼ E':'✕ E';
  updateDialogSpeakBtn();
}
export function advanceDialog(){
  const d=state.dialog; if(!d) return;
  if(d.chat) return; // the chat view has its own input; E does nothing while it's open
  stopSpeaking();
  if(d.idx<d.lines.length-1){ d.idx++; renderDialog(); blip(600,.04,'square',.025); }
  else{ state.dialog=null; document.getElementById('dialog').style.display='none'; }
}
export function closeDialog(){
  stopSpeaking();
  stopChatTyping();
  /* A REVEAL BELONGS TO ONE CONVERSATION. paceTimer is module-level and used
     to be stopped only by d.streaming going null at the end of the turn —
     which meant walking out mid-reply left it ticking, and `if(paceTimer)
     return` in startPacedReveal then blocked the NEXT conversation's reveal
     while the orphan wrote the old reply's slice into the new bubble.
     Measured 2026-08-09 in test/live/speaking-pace.mjs: the counter went
     BACKWARDS, 190 chars to 30. The tick has its own state.dialog check as
     well, because two ways to leave a conversation is two ways to leak. */
  stopPacedReveal();
  const wasChat = state.dialog && state.dialog.chat;
  state.dialog=null;
  if(wasChat){
    document.getElementById('chatOv').classList.remove('open');
    document.getElementById('chatPhone').classList.remove('show','unread','thinking');
  }
  else document.getElementById('dialog').style.display='none';
}
/* ----- read the current dialog line aloud — one small step toward the
   hopes-and-dreams "a voice you can actually hear" for every resident,
   not just Quill's spoken library summaries below. */
export function toggleDialogSpeak(){
  const d=state.dialog; if(!d||d.chat) return;
  if(isSpeaking() && !state.bookAudio){ stopSpeaking(); updateDialogSpeakBtn(); return; }
  yieldBookAudio();
  speak(d.lines[d.idx], updateDialogSpeakBtn);
  updateDialogSpeakBtn();
}
function updateDialogSpeakBtn(){
  const btn=document.getElementById('dSpeak'); if(!btn) return;
  if(!ttsAvailable()){ btn.style.display='none'; return; }
  btn.style.display='inline-block';
  btn.textContent = isSpeaking() ? '⏹' : '🔊';
}

/* ---------- full-screen AI conversation view ----------
   The resident + the transcript are the main event; a persistent,
   per-resident notes area sits alongside; speak/connections/leave are
   a slim side rail rather than floating over the text. */
const AGENT_AVATAR = { quill:'📜', steward:'🫖', monk:'🧘', computer:'💻', sebastian:'🎩', investigator:'🔬', tutor:'🎓' };
export function openChatDialog(npc){
  document.getElementById('chatPhone').classList.remove('show','unread','thinking'); // clear any pocketed prior chat
  stopChatTyping(); stopPacedReveal();   // never inherit the last conversation's reveal
  state.dialog={
    name:npc.name, agent:npc.aiAgent||'quill', color:npc.color, glow:npc.glow,
    chat:true, thinking:false,
    history:[], // {role,content} sent to the AI as conversational context
    transcript:[{from:'npc',text:npc.lines[0]}], // {from,text} — what's actually shown
    /* Declared rather than invented at the point of use. `askNotes` is one
       message's permission (see sendChatMessage) and `noteSearch` is the
       receipt shown for what that permission actually reached. `shelfLookup`
       is the same pattern for the Library half — set by shelfLookup() in
       residents.js, read by shelfLookupReceipt() below, and it doubles as the
       once-a-turn memo that stopped four residents making eight database
       round-trips for four questions. */
    askNotes:false, noteSearch:null, shelfLookup:null, passages:null, reach:null,
  };
  document.getElementById('chatOv').classList.add('open');
  renderChatView(); blip(740,.06,'square',.03);
  setTimeout(()=>document.getElementById('chatInput').focus(),30);
}
// the chat log's own typewriter — a reply reveals progressively instead of
// snapping in all at once, the "feels like it's actually being said"
// texture the user asked for. Same interval-based approach as the Archive
// Desk's typewriteBody(), just targeting one bubble instead of a whole page.
//
// IT TAKES A RATE, NOT A BUDGET. See DEFAULT_PACE in data/roles.js for the
// bug this replaced: `step = floor(text.length/90)` meant a long reply was
// revealed faster per word than a short one, and the same resident spoke at
// two different speeds depending on whether you had pocketed the chat.
/* A reveal is a texture, never a wait worth hanging a conversation on. This
   is a deadline on the WAIT, not a division of the text — the rate stays the
   rate right up until the bail, and then the rest simply arrives. The paced
   streaming path below uses the same ceiling. */
const REVEAL_CAP_MS = 20000;
let chatTyping=null;
let chatTypeHead=0;   // how far the live typewriter has got — read by minimizeChat()
function stopChatTyping(){ if(chatTyping){ clearInterval(chatTyping); chatTyping=null; } renderRevealControls(); }

/* ---------- HOLDING A REPLY WHERE IT IS ----------
   Asked for 2026-08-09: "we should be able to pause that speaking chain its
   for users not for testing." Until now the reveal had exactly one control —
   click the log and skip to the end — which is the ONLY control that cannot
   express "wait, I am still reading that". A pace with a skip button and no
   hold is a pace done TO the visitor, which is the opposite of the point.

   The hold is one flag on the conversation, and both reveal paths (the
   streaming counter and the settled typewriter) resume from the character it
   was left on. Sending a new message clears it, because a held reveal with
   nothing on screen to say so would be a button that does nothing (rule 5). */
export function toggleRevealPause(){
  const d=state.dialog; if(!d) return;
  if(d.revealPaused){
    d.revealPaused=false;
    if(d.streaming) startPacedReveal(d);
    else resumeTypewriter(d);
  } else {
    d._pausedAt = d.streaming ? (d.streaming.shown||0) : chatTypeHead;
    d.revealPaused=true;
    stopPacedReveal(); stopChatTyping();
  }
  renderRevealControls();
  blip(d.revealPaused?420:620,.04,'sine',.03);
}
function resumeTypewriter(d){
  const log=document.getElementById('chatLog'); if(!log) return;
  const i=d.transcript.length-1, t=d.transcript[i];
  if(!t || t.from!=='npc') return;
  const el=log.querySelector(`.bubbleText[data-idx="${i}"]`);
  if(el) typewriteChatText(el, t.text, log, paceOf(d.agent), d._pausedAt||0);
}
/* THE ROW IS ONLY THERE WHEN THERE IS SOMETHING TO HOLD. A permanently
   visible ⏸ that does nothing nine tenths of the time is a button that does
   nothing, which is this house's own failure mode. Called from every place a
   reveal starts or stops rather than polled. */
function renderRevealControls(){
  const row=document.getElementById('chatRevealRow'); if(!row) return;
  const d=state.dialog;
  const live=!!(d && d.chat && (paceTimer || chatTyping || d.revealPaused));
  row.style.display = live ? '' : 'none';
  if(!live) return;
  const btn=document.getElementById('chatPauseBtn');
  const hint=document.getElementById('chatRevealHint');
  if(btn) btn.textContent = d.revealPaused ? '▶ Carry on' : '⏸ Hold';
  if(hint) hint.textContent = d.revealPaused
    ? 'held — they are mid-sentence, nothing is lost'
    : 'click the log to skip to the end';
}
/* THE HEAD IS COMPUTED FROM THE CLOCK, NOT ACCUMULATED PER TICK. Adding
   `round(cps*TICK/1000)` characters every tick quantises the rate to whole
   characters: at 34 cps and a 50 ms tick that rounds 1.7 up to 2, and the
   Monk comes out at 40 — an 18% lie in the one number that is supposed to be
   his character. Measured in test/live/speaking-pace.mjs. Reading the clock
   also means a tick the browser was too busy to run costs nothing. */
function typewriteChatText(el,text,scrollEl,cps,fromChar){
  stopChatTyping();
  const rate=Math.max(1, Number(cps)||DEFAULT_PACE);
  const base=Math.max(0, Math.floor(Number(fromChar)||0)), t0=Date.now();
  chatTypeHead=base;
  if(base>=text.length){ el.textContent=text; return; }
  const bailAt=t0+REVEAL_CAP_MS;
  el.textContent=text.slice(0,base);
  chatTyping=setInterval(()=>{
    const i=base+Math.floor((Date.now()-t0)/1000*rate);
    chatTypeHead=i;
    if(i>=text.length || Date.now()>bailAt){ el.textContent=text; stopChatTyping(); return; }
    el.textContent=text.slice(0,i)+'▌';
    scrollEl.scrollTop=scrollEl.scrollHeight;
  },20);
  renderRevealControls();
}
export function skipChatTyping(){
  /* One promise, both reveals: click the log and you are at the end. A paced
     resident that could not be skipped would be a gimmick rather than a
     texture — the words are already here, this only decides how fast you
     see them. */
  const d=state.dialog;
  // skipping ends the reveal, so it also ends a hold — otherwise the row
  // would still read "held" over a bubble that is plainly finished
  if(d) d.revealPaused=false;
  if(d && d.streaming && (d.streaming.shown||0) < d.streaming.content.length){
    stopPacedReveal();
    d.streaming.shown=d.streaming.content.length;
    const el=document.getElementById('streamText');
    if(el) el.textContent=d.streaming.content;
    return;
  }
  if(!chatTyping){ renderRevealControls(); return; }
  stopChatTyping();
  renderChatView();
}
// While a reply streams in, patch just the live bubble's text (and the
// thinking model's reasoning) in place, rather than re-rendering the whole
// chat log on every token — cheap and smooth. If the bubble isn't built yet
// (first token arrived before its render), fall back to a full render once.
function updateStreamingBubble(d){
  if(!d || !d.streaming) return;
  /* POCKETED IS NOT PAUSED. This used to return here on d.minimized, so the
     reveal counter froze the moment you put the chat away and the reply was
     dumped whole when you came back. The words keep being said while you walk
     the grounds; the only thing that stops is writing to a hidden DOM. */
  if(d.minimized){ startPacedReveal(d); return; }
  const txt=document.getElementById('streamText');
  if(!txt){ renderChatView(); return; }
  if(d.streaming.thinking){
    const box=document.getElementById('streamThought'), span=document.getElementById('streamThinking');
    if(box) box.style.display='';
    if(span) span.textContent=d.streaming.thinking;
  }
  /* A PACED RESIDENT IS BUFFERED, NOT SLOWED. The tokens still arrive as fast
     as the model makes them — `content` is always the whole truth — and only
     the REVEAL is held to a speaking rate. So nothing waits on the display,
     the reply is complete in memory the moment it is complete, and a visitor
     who does not want to watch can click the log to skip to the end. */
  startPacedReveal(d);
}
/* ----- speaking at the pace of speech (data/roles.js `pace`) -----
   EVERY resident resolves to a positive rate. This used to return 0 for
   everyone but the Monk, and 0 meant "not paced" — which is why the other
   six fell through to the per-reply budget. There is one reveal path now,
   and a role's own `pace` only says whether it is slower or faster than the
   house rate. */
function paceOf(agentKey){
  const own=Number((ROLES[agentKey]||{}).pace);
  return own>0 ? own : DEFAULT_PACE;
}
/* HOW FAR IN THEY WOULD BE BY NOW. A reply that landed while the chat was
   pocketed has been "being said" the whole time you were away — coming back
   after a minute must not re-perform it from the first character. A rate in
   real time, not a performance that restarts when you look. */
function revealHead(d){
  if(!d) return 0;
  if(d.revealPaused) return d._pausedAt||0;   // a hold survives the handover
  const at=d._landedAt;
  if(!at) return 0;
  return Math.floor((d._landedShown||0) + (Date.now()-at)/1000*paceOf(d.agent));
}
let paceTimer=null;
function stopPacedReveal(){ if(paceTimer){ clearInterval(paceTimer); paceTimer=null; } renderRevealControls(); }
function startPacedReveal(d){
  if(paceTimer) return;                       // already draining this reply
  /* HELD MEANS HELD. Tokens keep arriving while the visitor is reading, and
     updateStreamingBubble() calls this on every one of them — without this
     line the next token would quietly restart the reveal they just stopped. */
  if(d.revealPaused){ renderRevealControls(); return; }
  // same clock, same reason as typewriteChatText above
  const cps=paceOf(d.agent), base=(d.streaming&&d.streaming.shown)||0, t0=Date.now();
  paceTimer=setInterval(()=>{
    const s=d.streaming;
    // this reveal's own conversation, or none: see closeDialog()
    if(!s || state.dialog!==d){ stopPacedReveal(); return; }
    s.shown=Math.min(base+Math.floor((Date.now()-t0)/1000*cps), s.content.length);
    /* THE COUNTER ADVANCES WHETHER OR NOT ANYONE IS LOOKING — only the DOM
       write is skipped while pocketed. That is the whole of "one rate": the
       reveal is a clock, not a performance waiting for an audience. */
    if(!d.minimized){
      /* re-queried every tick: any full render detaches the old node, and
         writing into a detached element is the silent-nothing failure. */
      const el=document.getElementById('streamText');
      if(el) el.textContent=s.content.slice(0, s.shown);
      const log=document.getElementById('chatLog');
      if(log) log.scrollTop=log.scrollHeight;
    }
    if(s.done && s.shown>=s.content.length) stopPacedReveal();
  }, 50);
  renderRevealControls();
}
/* Let the last words finish before the bubble is replaced by the final
   render — otherwise the reply snaps to full length at the moment it lands,
   which is precisely the effect being avoided. Bounded, because a reveal is
   never worth hanging a conversation on. */
function finishPacedReveal(d){
  const s=d && d.streaming;
  if(!s) { stopPacedReveal(); return Promise.resolve(); }
  s.done=true;
  /* Pocketed: mark it finished but do not stall the turn on a reveal nobody
     is watching. The counter is left where it is and restoreChat() carries on
     from there — see revealHead(). */
  if(d.minimized) return Promise.resolve();
  if((s.shown||0)>=s.content.length){ stopPacedReveal(); return Promise.resolve(); }
  startPacedReveal(d);
  const capMs=Math.min(REVEAL_CAP_MS, (s.content.length-(s.shown||0))/paceOf(d.agent)*1000+500);
  return new Promise(res=>{
    const done=()=>{ clearInterval(poll); clearTimeout(bail); res(); };
    const poll=setInterval(()=>{ if(!paceTimer || !d.streaming) done(); }, 60);
    const bail=setTimeout(()=>{ stopPacedReveal(); done(); }, capMs);
  });
}
/* ---------- the "phone": pocket a conversation and keep living ----------
   A local model can take 30–180s to answer. Rather than stand at the
   overlay watching a "…", you can pocket the conversation: the full view
   closes, a small floating card appears, and you're free to walk the
   grounds or read a book. When the reply lands the card buzzes; tap it to
   drop back into the exact same conversation, transcript and notes intact.
   state.dialog stays alive the whole time — only the overlay is hidden. */
export function minimizeChat(){
  const d=state.dialog; if(!d||!d.chat) return;
  stopSpeaking();
  /* POCKETED MID-SENTENCE. Remember where they had got to and when, so
     restoreChat() carries the reveal on from there instead of dumping the
     remainder into the log. The streaming path keeps its own counter
     (s.shown) and needs nothing here. */
  if(chatTyping){ d._landedWhilePocketed=true; d._landedAt=Date.now(); d._landedShown=chatTypeHead; }
  stopChatTyping();
  d.minimized=true;
  document.getElementById('chatOv').classList.remove('open');
  renderChatPhone();
  blip(520,.05,'sine',.03);
}
export function restoreChat(){
  const d=state.dialog; if(!d||!d.chat) return;
  if(state.ui) closeUI(); // if you'd wandered into a shelf or reader, step out of it first
  d.minimized=false; d.unread=false;
  document.getElementById('chatPhone').classList.remove('show','unread','thinking');
  document.getElementById('chatOv').classList.add('open');
  // if a reply arrived while pocketed, reveal it with the same typewriter —
  // picking up at revealHead(), not starting the reply over
  renderChatView(d._landedWhilePocketed?{typeLast:true}:undefined);
  d._landedWhilePocketed=false; d._landedAt=0; d._landedShown=0;
  setTimeout(()=>document.getElementById('chatInput').focus(),30);
  blip(700,.05,'square',.03);
}
export function hideChatPhone(){
  const el=document.getElementById('chatPhone');
  if(el) el.classList.remove('show','unread','thinking');
}
function renderChatPhone(){
  const d=state.dialog, el=document.getElementById('chatPhone');
  if(!el) return;
  if(!d||!d.chat||!d.minimized){ el.classList.remove('show','unread','thinking'); return; }
  const av=document.getElementById('phoneAvatar');
  av.textContent=AGENT_AVATAR[d.agent]||'💬';
  av.style.background=d.glow||'#e0a43c';
  av.style.color=d.color||'#2a2118';
  document.getElementById('phoneName').textContent=d.name;
  const status=document.getElementById('phoneStatus');
  el.classList.add('show');
  const busy = !!d.thinking || !!d.streaming;
  el.classList.toggle('thinking', busy);
  el.classList.toggle('unread', !!d.unread);
  status.textContent = busy ? 'thinking…'
                     : d.unread ? '✓ replied · tap to read'
                     : 'tap to return';
}
function renderChatView(opts){
  const d=state.dialog; if(!d||!d.chat) return;
  const av=document.getElementById('chatAvatar');
  av.textContent = AGENT_AVATAR[d.agent]||'💬';
  av.style.background = d.glow||'#e0a43c';
  av.style.color = d.color||'#2a2118';
  document.getElementById('chatName').textContent=d.name;
  /* 🏠 OR ☁, IN THE ROOM WHERE YOU ARE TALKING. Added 2026-08-10 with the
     steward's ruling that the Monk may run on a cloud connection — "alot of
     people have laptops just let the user know." Every resident uses the one
     detected connection, so the honest version of that decision is that the
     visitor can see where their words go WITHOUT opening a settings panel.
     The Connections panel badged this all along; the place people actually
     speak did not. */
  document.getElementById('chatStatus').textContent = isAIActive()
    ? (AI.local ? '🏠 ' : '☁ ') + 'connected — ' + AI.name
      + (AI.local ? ' · stays on this computer' : ' · leaves this device')
    : '○ connection lost — replies may stop working';
  const log=document.getElementById('chatLog');
  const bubbles=d.transcript.map((m,idx)=>
    m.from==='user' ? `<div class="bubble user">${esc(m.text)}</div>`
                    : `<div class="bubble npc"><div class="who">${esc(d.name)}</div>${
                        m.thinking ? `<details class="thought"><summary>💭 thought for a moment</summary>${esc(m.thinking)}</details>` : ''
                      }<span class="bubbleText" data-idx="${idx}">${esc(m.text)}</span></div>`);
  if(d.streaming){
    // a reply being streamed live — the answer accumulates in #streamText,
    // and a thinking model's reasoning shows open above it (#streamThinking),
    // both patched in place by updateStreamingBubble() as tokens arrive.
    const th=d.streaming.thinking;
    /* SLICED TO THE REVEAL, not the buffer. A full render mid-stream — which
       is what restoreChat() does when you come back to a reply still arriving
       — used to paint the whole of `content` and undo the pace in one frame.
       The counter is the truth about what has been said. */
    const said=d.streaming.content.slice(0, d.streaming.shown||0);
    bubbles.push(`<div class="bubble npc"><div class="who">${esc(d.name)}</div>`
      +`<details class="thought" open id="streamThought"${th?'':' style="display:none"'}><summary>💭 thinking…</summary><span id="streamThinking">${esc(th||'')}</span></details>`
      +`<span class="bubbleText" id="streamText">${esc(said)}</span><span class="streamCursor">▌</span></div>`);
  } else if(d.thinking){
    bubbles.push(`<div class="bubble npc thinking"><div class="who">${esc(d.name)}</div>…</div>`);
  }
  log.innerHTML=bubbles.join('');
  log.scrollTop=log.scrollHeight;
  if(opts&&opts.typeLast){
    const lastIdx=d.transcript.length-1;
    const target=log.querySelector(`.bubbleText[data-idx="${lastIdx}"]`);
    const text=d.transcript[lastIdx].text;
    /* A HOLD SURVIVES THE HANDOVER. When a streamed reply finishes, the
       streaming bubble is replaced by the settled one — and re-running the
       typewriter there would restart a reveal the visitor had deliberately
       stopped. Paint where they left it and wait for ▶. */
    if(target && d.revealPaused) target.textContent=text.slice(0, revealHead(d));
    else if(target) typewriteChatText(target,text,log,paceOf(d.agent),revealHead(d));
  } else stopChatTyping();
  renderRevealControls();
  const notesArea=document.getElementById('chatNotesArea');
  if(document.activeElement!==notesArea){
    notesArea.value=data.chatNotes[d.agent]||'';
    // BETA-TESTING-FEEDBACK.md #1 — saving already happens automatically,
    // it just wasn't visible until you'd already typed something. A calm,
    // persistent idle-state hint here, not just the transient "saving…"
    // that only shows up mid-type.
    document.getElementById('notesSaved').textContent =
      data.chatNotes[d.agent] ? '✓ auto-saved' : 'auto-saves as you type — nothing to click';
  }
  document.getElementById('chatOv').classList.toggle('terminal', d.agent==='computer');
  renderChatQuickActions(d);
  updateChatSpeakBtn();
}
// per-agent quick actions — each resident gets the ones that actually fit
// it, not one blanket button; empty for everyone else
function renderChatQuickActions(d){
  const el=document.getElementById('chatQuickActions');
  // d.transcript includes the scripted greeting as an 'npc' entry too —
  // only a real AI turn in d.history counts as something worth saving
  const hasReply=d.history.some(m=>m.role==='assistant');
  let html='';
  if(d.agent==='quill') html+=`<button class="btn ghost" id="chatTrainBtn" onclick="draftTrainingPlanFromChat()">📋 Draft a plan from this conversation</button>`;
  if(d.agent==='computer' && hasReply) html+=`<button class="btn ghost" onclick="saveLastChatReplyToArchive()">💾 Save last reply to Archive Desk</button>`;
  if(d.agent==='sebastian'){ // two doors, one spot: talk to him, or open the grid he keeps
    const m=(data.settings&&data.settings.sebMode)||'ease';
    html+=`<div class="meta" style="margin:0 0 6px">Today's path:
      <button class="btn ${m==='ease'?'':'ghost'}" style="font-size:11px;padding:4px 10px" onclick="setSebMode('ease')">🌱 Ease in</button>
      <button class="btn ${m==='work'?'':'ghost'}" style="font-size:11px;padding:4px 10px" onclick="setSebMode('work')">🎯 Work mode</button></div>`;
    html+=`<button class="btn ghost" onclick="openCalendar()">📅 Open the calendar</button>`;
    /* He is where you go to set the day's work, and where you go to take it up
       again. The calendar is for appointments; this is for what you actually
       sat down to do. */
    html+=`<button class="btn ghost" onclick="openDailyTasks()">📋 Today's tasks</button>`;
    if(hasReply) html+=`<button class="btn ghost" id="sebPlanBtn" onclick="sendSebastianPlanToToday()">📋 Send this plan to today</button>`;
  }
  /* THE RECEIPT. What was searched and what came back, including nothing, and
     including what was refused — rule 3 of the lookup design. A search whose
     only evidence is a better answer is indistinguishable from a resident
     making something up. */
  html = groundedInLine(d) + passagesReceipt(d) + shelfLookupReceipt(d) + noteSearchReceipt(d) + html;
  el.innerHTML=html;
  el.style.display=html?'block':'none';
  updateAskNotesBtn();
}
/* LOCKED, NOT ABSENT-AND-SILENT, and never a quieter search wearing the same
   label. A feature that genuinely needs something absent says plainly how to
   turn it on (CLAUDE.md) — and per the steward the web build stays a simple
   prototype for now: "lets get the app done first". */
function updateAskNotesBtn(){
  const b=document.getElementById('askNotesBtn'); if(!b) return;
  const has=!!(Store.dbAvailable && Store.dbAvailable());
  b.style.display='';
  /* LOCKED, NOT DISABLED — and that difference was found by looking at the
     screenshot (2026-08-08). `disabled` made it a dead button: dimmed by a
     fraction nobody notices, and pressing it did nothing at all, with the only
     explanation in a tooltip that never appears on a first look. That is the
     house failure mode with a lock icon on it.

     So it stays pressable and ANSWERS. A person who presses a locked control
     deserves the reason on screen, which is the whole of rule 5 and also the
     whole of "a feature that needs something absent says plainly how to turn
     it on". */
  b.disabled=false;
  b.style.opacity=has?'':'0.6';
  b.textContent=has?'🔎':'🔒';
  b.dataset.locked=has?'':'1';
  b.title = has
    ? 'Ask this, and search everything you have ever written for it. One press, one search — your notes are never read otherwise.'
    : 'Searching your notes needs the desktop app — press to read why.';
}
/* ----- WHAT THIS RESIDENT WAS ACTUALLY WORKING FROM -----

   Added 2026-08-08, after the first real model ever pointed at these prompts.
   Asked to build a course out of two carried notes, the Tutor's REASONING
   named both of them precisely — and its ANSWER mentioned neither, so a
   visitor had no way to know it had read anything at all. The Investigator,
   same run, did name the note. So it is not reliable, and on an 8B it will
   not become reliable by asking harder.

   RULE 7: this is not a thing to ask a model for. The application knows
   exactly what it put in the prompt — carryGrounding() computes it from the
   same carriedLines()/fitToBudget() pair that built the block. So the app
   says it, deterministically, in one line, and it is right every time and
   costs no tokens at all.

   It is also the trust story made visible: "what you carry is what a resident
   can see" stops being a promise and becomes something you can read under
   every reply. */
function groundedInLine(d){
  if(!d || !d.chat) return '';
  let g; try { g = carryGrounding(); } catch(e){ return ''; }
  if(!g || !g.shown) return '';
  const held = carried(carryList());
  const bits = [];
  const books = held.filter(e => (e.kind==='book'||e.kind==='paper') && g.seen.has(e.kind+':'+e.ref));
  const notes = held.filter(e => e.kind==='note' && g.seen.has('note:'+e.ref));
  if(books.length) bits.push(books.map(e=>'📖 '+esc(String(e.label||e.ref).slice(0,40))).join(' · '));
  if(notes.length) bits.push('🗒 '+notes.length+' note'+(notes.length===1?'':'s')+' of yours');
  if(!bits.length) return '';
  /* BEFORE the first reply this is a promise about what they WILL see, and
     after it a statement about what they DID. Saying "answered with" above a
     greeting — which is what the first version did, and it took a screenshot
     to notice — is a small lie in the one place whose entire job is telling
     the truth about what the model was given. */
  const answered = d.history && d.history.some(m => m.role === 'assistant');
  return `<div class="meta" style="margin:0 0 8px;opacity:.8">${answered
      ? 'Answered with what you are carrying'
      : 'They can see what you are carrying'} —
    ${bits.join(' · ')}${g.sealed?' · <b>'+g.sealed+' sealed, not read</b>':''}.
    <button class="btn ghost" style="font-size:10.5px;padding:2px 8px;margin-left:4px"
      onclick="openInventory()" title="Open your backpack">🎒</button></div>`;
}
/* ----- WHICH PAGES OF YOUR OWN BOOK WERE READ -----

   The fourth receipt, and the one that most needed to exist: this is the only
   block that puts real prose from YOUR book into a prompt, so it is the only
   one where "what did it actually read" is a question with pages for an answer.

   TWO NUMBERS, LABELLED APART. The backpack meter says what is AVAILABLE before
   you send; this says what was USED this turn. They are different questions and
   conflating them is how a meter starts disagreeing with the prompt it claims
   to measure — the store.js scar, which the carried block already carries a
   warning about.

   "You are carrying it and nothing in it matched" is REPORTED, not swallowed.
   That is rule 6: a real answer beats a gap, and it tells the visitor something
   true about their own book. */
function passagesReceipt(d){
  const p=d && d.passages; if(!p || !Array.isArray(p.books) || !p.books.length) return '';
  const read=p.books.filter(b=>b.pages && b.pages.length);
  const missed=p.books.filter(b=>!b.pages || !b.pages.length);
  if(!read.length && !missed.length) return '';
  const bits=read.map(b=>`<b>${esc(String(b.title||b.slug))}</b> (p.${b.pages.join(', p.')})`);
  return `<div class="meta" style="border-left:2px solid #c8a24a;padding-left:8px;margin:0 0 8px">
      📖 ${read.length
        ? `Read ${read.reduce((n,b)=>n+b.pages.length,0)} passage${read.reduce((n,b)=>n+b.pages.length,0)===1?'':'s'} from ${bits.join(' · ')}.`
        : ''}
      ${missed.length
        ? `<span style="opacity:.85">Nothing matched in ${missed.map(b=>esc(String(b.title||b.slug))
            +(b.why==='no text'?' (no text on this device)':'')).join(', ')} — which is a real answer about that book.</span>`
        : ''}
      ${read.length ? `<span style="opacity:.6"> ${p.chars} of ${p.cap} characters used.</span>` : ''}
    </div>`;
}
/* ----- WHAT THE SHELVES WERE ACTUALLY ASKED -----

   The third receipt, and the one the pathway had been running silently since
   2026-08-08. Every resident searches the Library on every message; until now
   the only evidence was the answer, which is exactly the case the notes receipt
   already exists to refuse — "a search whose only evidence is a better answer is
   indistinguishable from a resident making something up."

   Deterministic and free (rule 7): the application knows what it queried and
   what came back, so it says so rather than asking the model to.

   Deliberately one plain line for now. plans/RESIDENT-REACH-PLAN.md grows the
   next part onto this stash — a 🎒 button per hit you are NOT carrying, so a
   found book stops being a dead end. */
function shelfLookupReceipt(d){
  const r=d && d.shelfLookup; if(!r || !r.searched) return '';
  const asked=r.terms.map(t=>'“'+esc(t)+'”').join(', ');
  /* NAMED, NOT COUNTED — read off the screenshot on 2026-08-10. "2 found" is a
     number you cannot do anything with, sitting in a project whose standing
     rule is that nothing may be a dead end. The titles are already in the
     stash; printing them costs nothing and turns the receipt into something a
     person can act on. Capped and the remainder named, like every other list
     here. (The 🎒 button per uncarried hit is RESIDENT-REACH-PLAN.md's job.) */
  const NAME_CAP=3;
  const names=r.hits.slice(0,NAME_CAP).map(h=>'“'+esc(String(h.title||h.slug))+'”').join(', ');
  const rest=r.hits.length-NAME_CAP;
  return `<div class="meta" style="border-left:2px solid #8a7fb0;padding-left:8px;margin:0 0 8px">
      📚 Searched the shelves for ${asked} — <b>${r.hits.length}</b> found${
        r.hits.length ? ': '+names+(rest>0?`, and ${rest} more`:'') : ''}.
      ${r.hits.length ? '' : 'Nothing matched — and that is a real answer about this library, not about the subject. '
        + '<span style="opacity:.75">This searches titles, authors and shelves, not the words inside a book; '
        + 'for that, carry it.</span>'}
      ${reachGapOffer(d)}
    </div>`;
}
/* ----- THE HAND-HOLD, AND IT IS THE WHOLE POINT -----

     "we should be able to have the resedents be like i dont have acces to this
      can you please put the book in your back pack ... i know this but for a
      new user we gotta hold there hand"

   A resident saying "put it in your backpack" to somebody who does not know
   where the backpack IS has moved the dead end, not removed it. So the
   sentence the model was given and the button the person can press come from
   THE SAME reachGap() call, stashed on d.reach — two answers to "is this out
   of reach" would eventually put a 🎒 button under a reply that just said the
   book was already in the bag.

   EVERY BUTTON IS A HUMAN PRESS. The resident never carries anything itself;
   it can only say that carrying is possible. Same rule the notes receipt's 🎒
   offers already keep, and it is the rule the whole backpack rests on. */
function reachGapOffer(d){
  const g=d && d.reach; if(!g || !g.gap) return '';
  const doors=(g.doors||[]).map(x=>
    `<button class="btn ghost" style="font-size:11px" onclick="closeUI();${jsq(x.open)}()">${esc(x.icon)} ${esc(x.label)}</button>`
  ).join('');
  if(g.gap==='NOTHING_HERE_YET'){
    return `<div style="margin-top:6px">Your shelf is empty — the Pavilion ships with no books on
      purpose, because a library is worth more when it is the one you chose.
      <div class="row" style="margin-top:6px;gap:6px;flex-wrap:wrap">${doors}</div></div>`;
  }
  if(g.gap==='NOT_IN_THE_PAVILION'){
    return `<div style="margin-top:6px">Two ways to change that: bring the file in yourself, or ask
      for it to be fetched.
      <div class="row" style="margin-top:6px;gap:6px;flex-wrap:wrap">${doors}</div></div>`;
  }
  /* SHELVED_NOT_CARRIED — one press per book, and the press is toggleInventory,
     the same function the shelf's own 🎒 uses. Capped in lookup.js and the
     remainder named, because four buttons is a row and twelve is a wall. */
  const btns=(g.titles||[]).map(t=>
    `<button class="btn ghost" style="font-size:11px" onclick="carryFromChat('${jsq(t.slug)}')"
       title="Put it in your backpack — then they can quote from it">🎒 ${esc(t.title.slice(0,40))}</button>`
  ).join('');
  return `<div style="margin-top:6px">They can see ${g.titles.length===1?'this':'these'} on the shelf
    and cannot read ${g.titles.length===1?'it':'them'}. Carry ${g.titles.length===1?'it':'one'} and
    they get real passages, with page numbers.
    <div class="row" style="margin-top:6px;gap:6px;flex-wrap:wrap">${btns}</div>
    ${g.rest>0?`<div style="opacity:.7;margin-top:4px">…and ${g.rest} more found.</div>`:''}</div>`;
}
/* One press, from inside a conversation: put the book in the bag and redraw, so
   the offer disappears and the "answered with" line grows a book — the change
   is visible in the same breath as the click. */
export function carryFromChat(slug){
  if(!isCarrying(carryList(),'book',slug)) toggleInventory(slug);
  if(state.dialog) state.dialog.reach=null;   // the gap is closed; do not re-offer it
  renderChatView();
}
function noteSearchReceipt(d){
  const r=d && d.noteSearch; if(!r) return '';
  if(r.locked) return `<div class="meta" style="border-left:2px solid #c78f6f;padding-left:8px;margin:0 0 8px">
      🔒 <b>Searching your own notes needs the desktop app.</b> It carries a small database that can
      find “walked” when you typed “walking”; a browser tab has no way to hold one. Everything else
      in this conversation works exactly the same — and anything in your 🎒 backpack is already being
      read, because you put it there.</div>`;
  const bits=[];
  if(r.carried.length) bits.push(`<b>${r.carried.length}</b> now in your 🎒 backpack`);
  if(r.shelved.length) bits.push(`${r.shelved.length} on your "pick up later" shelf (bag was full)`);
  if(r.sealed.length)  bits.push(`${r.sealed.length} 🔒 sealed, not read`);
  const offer=r.offered.length ? `<div class="row" style="margin-top:6px;gap:6px;flex-wrap:wrap">`
      +r.offered.map(n=>`<button class="btn ghost" style="font-size:11px" onclick="carryNote('${jsq(n.key)}');renderChatView()"
          title="${esc(n.where)}">🎒 ${esc(String(n.title||'note').slice(0,40))}</button>`).join('')
    +`</div>` : '';
  return `<div class="meta" style="border-left:2px solid #7fa36b;padding-left:8px;margin:0 0 8px">
      🔎 Searched your notes for “${esc(r.shown||r.term)}” — <b>${r.hits.length + r.sealed.length}</b> found${bits.length?' · '+bits.join(' · '):''}.
      ${r.hits.length ? '' : 'Nothing you have written matches, which is a real answer.'}
      ${offer}
    </div>`;
}
export function sendCurrentChatMessage(){
  const input=document.getElementById('chatInput');
  const q=input.value.trim(); if(!q) return;
  input.value='';
  sendChatMessage(q);
}
/* THE SECOND SEND BUTTON. Deliberately a separate press rather than a toggle:
   `asked` is meant to be one question's permission, and a switch that stays on
   is a standing permission wearing a different word. Pressing this IS the ask,
   which is why data/lookup.js can say the boundary never lives in the model's
   judgement — it lives in whether a person clicked this instead of Send. */
export function sendCurrentChatMessageWithNotes(){
  const d=state.dialog;
  /* The locked case answers OUT LOUD rather than doing nothing. A browser tab
     has no desktop bridge and therefore no database at all; that is a real
     wall, not a policy, and saying which is the difference between an honest
     absence and a feature that looks broken. */
  if(!(Store.dbAvailable && Store.dbAvailable())){
    if(d) d.noteSearch={ locked:true, term:'', hits:[], sealed:[], carried:[], shelved:[], offered:[] };
    renderChatView();
    return;
  }
  const input=document.getElementById('chatInput');
  const q=input.value.trim();
  if(!q){ input.focus(); return; }
  input.value='';
  sendChatMessage(q, {searchMyNotes:true});
}
export function toggleChatSpeak(){
  const d=state.dialog; if(!d||!d.chat) return;
  if(isSpeaking() && !state.bookAudio){ stopSpeaking(); updateChatSpeakBtn(); return; }
  yieldBookAudio();
  const last=d.transcript[d.transcript.length-1];
  speak(last?last.text:'', updateChatSpeakBtn);
  updateChatSpeakBtn();
}
function updateChatSpeakBtn(){
  const btn=document.getElementById('chatSpeakBtn'); if(!btn) return;
  if(!ttsAvailable()){ btn.style.display='none'; return; }
  btn.style.display='flex';
  btn.textContent = isSpeaking() ? '⏹' : '🔊';
}
let notesSaveTimer=null;
document.getElementById('chatNotesArea').addEventListener('input',e=>{
  const d=state.dialog; if(!d||!d.chat) return;
  data.chatNotes[d.agent]=e.target.value;
  document.getElementById('notesSaved').textContent='saving…';
  clearTimeout(notesSaveTimer);
  notesSaveTimer=setTimeout(()=>{
    persist();
    document.getElementById('notesSaved').textContent='saved '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  },600);
});
document.getElementById('chatInput').addEventListener('keydown',e=>{
  if(e.key!=='Enter') return;
  e.preventDefault();
  sendCurrentChatMessage();
});
const MEMORY_CAP=20; // keep this a short, readable list, not a growing transcript
const CHAT_HISTORY_SENT=24; // how many recent turns get sent to the model (BETA-FEEDBACK #21) — generous on purpose; the on-screen transcript keeps everything
const TIMEOUT_LINE="…still with you — the thought just took longer than the clock allowed (a larger model can). Nothing was cut short on purpose. Ask again, pocket the chat and keep walking while it thinks, or pick a lighter model in ⚙ Manage AI connections.";
function agentMemory(agent){ return data.agentMemory[agent]||(data.agentMemory[agent]=[]); }
/* WHAT A RESIDENT ACTUALLY REMEMBERS — rewritten 2026-08-02.

   It used to store the question alone. Twenty questions pasted into a prompt
   is a TAG LIST: "they have asked about electronics before." True, and worth
   almost nothing. What makes someone feel known is the OUTCOME — "you decided
   to build the remote from scratch rather than buy one, and you were stuck on
   IR timing." Same mechanism, richer payload.

   So an entry keeps both halves: what was raised, and where the two of you got
   to. The gist is extracted by code, not by a second model call — that would
   double the cost and latency of every message in the game to improve one line
   of context. The logic lives in data/memory.js so npm test can hold it to real
   cases. Old entries have no `gist` and render fine without one. */
function remember(agent,text,reply){
  data.agentMemory[agent]=rememberInto(agentMemory(agent),{ts:todayKey(),text,reply,cap:MEMORY_CAP});
  persist();
}

// LOCAL-AI-MONITORING-PLAN.md step 2 — "Quill replied in 2.3s" sitting
// next to the activity it's already logging, built from AI.lastElapsedMs
// (the timing side-channel provider.js's withTiming() already sets on
// every chat() call), not a separate instrumentation system.
function elapsedTag(){
  if(AI.lastElapsedMs==null) return '';
  return ' ('+(AI.lastElapsedMs/1000).toFixed(1)+'s'+(AI.model?' · '+AI.model:'')+')';
}
// Parses that same "(2.3s · llama3.2)" suffix back out of today's activity
// log for the running session summary (step 3) — no separate store, the
// log text already collected in step 2 is the whole data source.
const ELAPSED_TAG_RE=/\((\d+(?:\.\d+)?)s(?:\s*·\s*([^)]+))?\)$/;
function sessionAISummary(){
  const today=todayKey();
  const asks=data.activityLog.filter(a=>a.text.startsWith('Asked ') && a.ts.slice(0,10)===today);
  let totalMs=0, timed=0; const byModel={};
  for(const a of asks){
    const m=ELAPSED_TAG_RE.exec(a.text);
    if(!m) continue;
    timed++; totalMs+=parseFloat(m[1])*1000;
    const model=m[2]||'unknown model';
    byModel[model]=(byModel[model]||0)+1;
  }
  return { count:asks.length, timed, totalMs, byModel };
}
/* ----- The residents moved to ui/residents.js on 2026-08-04 (the split).
   They touch no DOM; what they need from this file is handed over by
   initResidents() at the bottom of this section. ----- */
import { initResidents, CHAT_AGENTS, referenceShelfBlock, capped, LIST_CAP,
         MONK_SHELVES, setSebMode, carryGrounding } from './residents.js';
export { setSebMode };

/* ================================================================
   Sebastian's Calendar — BUTLER-SEBASTIAN-PLAN.md v1 steps 3-6.
   A calendar that's reached two ways, one place: talk to Sebastian the
   NPC for the conversation, or face his desk for the grid — the same way
   the Library's shelves and Reader are one place. Local, in the same
   save, exported/imported with everything else. No background anything:
   the advisory read below is computed only when the calendar is opened.
   ================================================================ */
function calYm(dk){ return dk.slice(0,7); }
function ymParts(ym){ const [y,m]=ym.split('-').map(Number); return {y,m}; }
function daysInMonth(y,m){ return new Date(y,m,0).getDate(); } // m is 1-based; day 0 of next month = last of this one
function dateKey(y,m,d){ return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0'); }
function shiftMonth(ym,delta){ let {y,m}=ymParts(ym); m+=delta; while(m<1){m+=12;y--;} while(m>12){m-=12;y++;} return y+'-'+String(m).padStart(2,'0'); }
function monthLabel(ym){ const {y,m}=ymParts(ym); return new Date(y,m-1,1).toLocaleDateString(undefined,{month:'long',year:'numeric'}); }
function dayLabel(dk){ return new Date(dk+'T00:00:00').toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}); }
function eventsOn(dk){ return (data.calendar||[]).filter(e=>e.date===dk).sort((a,b)=>(a.start||'').localeCompare(b.start||'')); }

/* Sebastian's scripted advisory line — the same overbooked / empty /
   neglected / well-kept read the plan calls for, in his own voice, and
   crucially computed with NO AI needed (step 6). Shown at the top of the
   calendar so a visitor who never connected a local model still gets the
   human read. A priority ladder: the thing most worth saying, said once. */
function butlerAdvisoryLine(){
  const k=todayKey();
  const t=new Date(k+'T00:00:00'); t.setDate(t.getDate()+1);
  const tomorrow=dateKey(t.getFullYear(),t.getMonth()+1,t.getDate());
  const todays=eventsOn(k);
  const tomorrows=eventsOn(tomorrow);
  const open=openSparks();
  const overdue=upcomingItems().filter(i=>i.due<k); // events are pre-filtered out of the past, so this is courses/grants
  const day=data.planner[k];
  const intention=(day&&day.intention||'').trim();
  const tended=((day&&day.blocks)||[]).filter(b=>b.state==='tended').length;

  if(overdue.length) return `A word before we go on, sir: ${overdue.length===1?'one thing has':overdue.length+' things have'} slipped past ${overdue.length===1?'its':'their'} due date. Not a scolding — a reminder, which is my job.`;
  if(open.length>=3) return `You set ${open.length} intentions earlier that haven't been acted on. I've not forgotten them — shall we set one or two on the calendar and make them real?`;
  if(todays.length>=3) return `You've ${todays.length} things on the books today, sir. Something may have to give, and better you choose than the clock.`;
  if(!todays.length && !intention && !tended) return `The day's a blank page so far. No judgement — but if it's blank by accident rather than on purpose, shall we decide something worth doing on it?`;
  if(!todays.length && !tomorrows.length) return `Nothing on the books today or tomorrow. A clear stretch is a fine thing when it's chosen — shall we spend a little of it on purpose?`;
  if(intention && tended && !overdue.length) return `The day's in good order, sir — an intention set and work already tended. Noted, and well done.`;
  if(todays.length) return `${todays.length===1?'One thing':todays.length+' things'} on today's calendar. I'll keep it in view; call on me if the shape of it wants changing.`;
  return `Tomorrow has ${tomorrows.length===1?'one thing':tomorrows.length+' things'} on it, today's clear. I'll have it ready when it comes, sir.`;
}

export function openCalendar(){
  // Always land on the current month in the grid view — a calendar you
  // open should show "now," not wherever you last paged to.
  state.calView={ mode:'month', ym:calYm(todayKey()), day:null };
  state.ui='calendar'; hideAllOv(); renderCalendar(); showOv('calendarOv');
}
function renderCalendar(){
  const el=document.getElementById('calendarPanel');
  el.innerHTML = state.calView.mode==='day' ? renderCalendarDay() : renderCalendarMonth();
}
function calendarHeader(){
  return `<button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>📅 Sebastian's Calendar</h2>
    <div class="card" style="cursor:default;border-color:#8a6f4a;background:#241d14">
      <div class="s" style="color:#d8c39c;font-size:13px;line-height:1.6">🎩 ${esc(butlerAdvisoryLine())}</div>
    </div>`;
}
function renderCalendarMonth(){
  const v=state.calView, {y,m}=ymParts(v.ym), today=todayKey();
  const lead=new Date(y,m-1,1).getDay(); // 0=Sun … which weekday the 1st falls on
  const dim=daysInMonth(y,m);
  const dows=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const cells=[];
  for(let i=0;i<lead;i++) cells.push(`<div class="calcell empty"></div>`);
  for(let d=1;d<=dim;d++){
    const dk=dateKey(y,m,d), evs=eventsOn(dk);
    cells.push(`<button class="calcell${dk===today?' today':''}" onclick="calSelectDay('${dk}')">
      <span class="caldnum">${d}</span>
      ${evs.length?`<span class="caldots">${'•'.repeat(Math.min(evs.length,3))}${evs.length>3?'+':''}</span>`:''}
    </button>`);
  }
  return `${calendarHeader()}
    <div class="row" style="justify-content:space-between;align-items:center;margin:4px 0 8px">
      <button class="btn ghost" onclick="calShiftMonth(-1)">‹</button>
      <b style="color:#e0a43c;font-size:15px">${esc(monthLabel(v.ym))}</b>
      <button class="btn ghost" onclick="calShiftMonth(1)">›</button>
    </div>
    <div class="calgrid">${dows.map(d=>`<div class="caldow">${d}</div>`).join('')}${cells.join('')}</div>
    <div class="meta" style="margin-top:10px">Click any day to see it in full and add something. Events show up in your Upcoming badge too — one honest picture of the day, kept on this device only.</div>`;
}
function renderCalendarDay(){
  const dk=state.calView.day, evs=eventsOn(dk), today=todayKey();
  const list = evs.length ? evs.map(e=>`
    <div class="card" style="cursor:default">
      <div class="t">${e.start?`<span style="color:#e0a43c">${esc(e.start)}${e.end?'–'+esc(e.end):''}</span>  `:''}${esc(e.title)}${e.remind?' <span title="Sebastian will remind you">🔔</span>':''}</div>
      ${e.note?`<div class="s">${esc(e.note)}</div>`:''}
      <div class="row" style="margin-top:8px">
        ${e.start?`<button class="btn ghost" onclick="toggleEventReminder(${e.id})">${e.remind?'🔕 No reminder':'🔔 Remind me'}</button>`:''}
        <button class="btn ghost" onclick="removeCalendarEvent(${e.id})">Remove</button>
      </div>
    </div>`).join('') : `<p style="color:#9c8b74">Nothing scheduled on this day yet.</p>`;
  // the untimed half of the day — to-dos (sparks) kept on the planner for
  // this date, so the calendar shows one whole picture: what's timed, and
  // what just needs doing. Managed on the Writing Desk; shown here read-only.
  const daySparks=(data.planner[dk]&&data.planner[dk].sparks)||[];
  const todos = daySparks.length ? `<h3 style="margin-top:16px">To-do (no set time)</h3>${daySparks.map(s=>
    `<div class="s" style="padding:3px 0;${s.done?'opacity:.5;text-decoration:line-through':''}">• ${esc(s.text)}${s.source?` <span style="color:#9c8b74;font-size:11px">— ${esc(s.source)}</span>`:''}</div>`).join('')}` : '';
  return `${calendarHeader()}
    <div class="row" style="justify-content:space-between;align-items:center;margin:4px 0 8px">
      <button class="btn ghost" onclick="calBackToMonth()">‹ ${esc(monthLabel(calYm(dk)))}</button>
      <b style="color:#e0a43c;font-size:14px;text-align:right">${esc(dayLabel(dk))}${dk===today?' · today':''}</b>
    </div>
    ${list}
    ${todos}
    <h3 style="margin-top:16px">Add to this day</h3>
    <label>What is it?</label><input type="text" id="calEvTitle" placeholder="e.g. Dentist, or Call with the grant office">
    <div class="row" style="gap:14px">
      <div style="flex:1"><label>Start (optional)</label><input type="time" id="calEvStart"></div>
      <div style="flex:1"><label>End (optional)</label><input type="time" id="calEvEnd"></div>
    </div>
    <label>Note (optional)</label><input type="text" id="calEvNote" placeholder="Anything worth remembering about it">
    <label style="display:flex;align-items:center;gap:8px;margin-top:8px;cursor:pointer">
      <input type="checkbox" id="calEvRemind" style="width:auto">
      🔔 Sebastian reminds you at the start time (a quiet card while the Pavilion is open — never a popup)
    </label>
    <div id="calEvMsg" class="meta"></div>
    <div class="row" style="margin-top:12px"><button class="btn" onclick="addCalendarEvent('${dk}')">Add to ${esc(dk)}</button></div>`;
}
export function calShiftMonth(delta){ state.calView.ym=shiftMonth(state.calView.ym,delta); renderCalendar(); }
export function calSelectDay(dk){ state.calView={ mode:'day', ym:calYm(dk), day:dk }; if(state.ui!=='calendar'){ state.ui='calendar'; hideAllOv(); showOv('calendarOv'); } renderCalendar(); }
export function calBackToMonth(){ state.calView.mode='month'; state.calView.day=null; renderCalendar(); }
export function addCalendarEvent(dk){
  const title=document.getElementById('calEvTitle').value.trim();
  const start=document.getElementById('calEvStart').value;
  const end=document.getElementById('calEvEnd').value;
  const note=document.getElementById('calEvNote').value.trim();
  if(!title){ document.getElementById('calEvMsg').textContent='Give it a name and it goes on the day.'; return; }
  if(end && start && end<start){ document.getElementById('calEvMsg').textContent='The end is before the start — worth a second look.'; return; }
  const remindBox=document.getElementById('calEvRemind');
  const remind=!!(remindBox && remindBox.checked && start); // a reminder needs a time to fire at
  if(remindBox && remindBox.checked && !start){ document.getElementById('calEvMsg').textContent='A reminder needs a start time to fire at — set one, or uncheck the bell.'; return; }
  data.calendar.push({ id:Date.now(), date:dk, start:start||'', end:end||'', title, note, remind });
  persist(); logActivity('Added to the calendar: "'+title+'" on '+dk+'.'); blip(700,.06);
  renderCalendar();
}
export function removeCalendarEvent(id){
  data.calendar=data.calendar.filter(e=>e.id!==id);
  persist(); renderCalendar();
}
export function toggleEventReminder(id){
  const e=data.calendar.find(x=>x.id===id); if(!e||!e.start) return;
  e.remind=!e.remind;
  if(!e.remind) delete e.reminded; // un-belling and re-belling later means it can fire again
  persist(); renderCalendar();
}
/* ----- Sebastian's reminder service — the butler taps you on the shoulder.
   Fires ONLY for reminders the visitor set themselves (the 🔔 on a calendar
   event), so it's opt-in by construction; it's a clock comparison, never an
   AI call, so the no-background-polling rule stands untouched; and it's a
   small dismissible card by the pocket phone, never a popup that blocks
   anything. Swept from main.js's existing frame loop (~every 20s), one
   reminder at a time; a reminder more than an hour stale (the Pavilion
   wasn't open) is marked quietly instead of ambushing the visitor late. */
const BUTLER_PING_LINES=[
  'Begging your pardon — this stands ready:',
  'As requested, the hour has arrived:',
  'A gentle word, as you asked:',
  'The time you set is upon us:',
];
let lastReminderSweep=0;
export function sweepReminders(){
  const nowMs=Date.now();
  if(nowMs-lastReminderSweep<20000) return;
  lastReminderSweep=nowMs;
  if(document.getElementById('butlerPing').classList.contains('show')) return; // one shoulder-tap at a time
  const today=todayKey(), d=new Date();
  const nowMin=d.getHours()*60+d.getMinutes();
  for(const e of (data.calendar||[])){
    if(!e.remind || e.reminded || e.date!==today || !e.start) continue;
    const [sh,sm]=e.start.split(':').map(Number);
    const evMin=sh*60+(sm||0);
    if(nowMin<evMin) continue;
    e.reminded=nowMs; persist();
    if(nowMin-evMin>60) continue; // stale — the Pavilion wasn't open; let it pass quietly
    const line=BUTLER_PING_LINES[Math.floor(Math.random()*BUTLER_PING_LINES.length)];
    document.getElementById('butlerPingText').innerHTML=`${esc(line)}<br><b style="color:#f5e9d4">${esc(e.title)}</b> · ${esc(e.start)}`;
    document.getElementById('butlerPing').classList.add('show');
    blip(880,.07); setTimeout(()=>blip(660,.09),140); // a two-note chime, not an alarm
    logActivity('Sebastian reminded you: "'+e.title+'" ('+e.start+').');
    return;
  }
}
export function dismissButlerPing(){ document.getElementById('butlerPing').classList.remove('show'); }
export function butlerPingGo(){ dismissButlerPing(); calSelectDay(todayKey()); }
/* `opts.searchMyNotes` is the visitor having pressed the second send button —
   ONE PRESS, ONE QUESTION, ONE SEARCH. It is deliberately not sticky and
   deliberately never inferred from the wording of the question: data/lookup.js
   is explicit that guessing would put the boundary back inside the model's
   judgement, which is the one place it must not live. */
/* NOT `opts` — the body already declares `const opts = chatOptsFor(...)` inside
   the try block below. A block-scoped const shadows the parameter for the WHOLE
   block, so reading `opts` before that line threw
   "Cannot access 'opts' before initialization" and the catch reported it to the
   visitor as "your local AI didn't answer". node --check, npm run build and
   npm test all passed; only running it in Electron with a real database found
   it, because the browser build locks the button that reaches this path. */
async function sendChatMessage(q, sendOpts){
  const d=state.dialog; if(!d||!d.chat) return;
  const agent=CHAT_AGENTS[d.agent]||CHAT_AGENTS.quill;
  /* A HOLD IS ON ONE REPLY, NOT ON THE CONVERSATION. Asking again is plainly
     "I am done with that one" — and a hold carried into the next reply would
     be a reveal frozen at zero with the ⏸ row explaining a reply nobody can
     see yet, which is a button that does nothing wearing an explanation. */
  d.revealPaused=false; d._pausedAt=0;
  d.transcript.push({from:'user',text:q});
  d.history.push({role:'user',content:q});
  // Live streaming when the connected provider supports it (local Ollama) and
  // we're not pocketed — the reply, and the Monk's reasoning, reveal as they
  // generate instead of after the fact. Otherwise the classic "…" wait.
  const useStream = isAIActive() && !!AI.supportsStream && !d.minimized;
  if(useStream){ d.streaming={content:'',thinking:'',shown:0}; d.thinking=false; }
  else { d.thinking=true; }
  renderChatView();
  let streamed=false;
  try{
    /* THE ASK, AND ITS LIFETIME. Set immediately before the prompt is built and
       cleared in the `finally` below, so it cannot survive into the next
       message. Deleting that clear is the first thing to break on purpose:
       everything still works, and every later question quietly searches your
       notes without you pressing anything. */
    if(sendOpts && sendOpts.searchMyNotes) d.askNotes=true;
    const systemPrompt=withStanding(d.agent, await agent.systemPrompt());
    // Send the system prompt plus only the most recent stretch of the
    // conversation, not an ever-growing transcript (BETA-FEEDBACK #21). The cap
    // is deliberately generous — a normal chat is untouched; it only trims a
    // very long session, and only what's *sent* to the model (the full
    // transcript stays on screen), so we protect a small-context local model
    // without doing anything to how it behaves in an ordinary conversation.
    const messages=[{role:'system',content:systemPrompt}, ...d.history.slice(-CHAT_HISTORY_SENT)];
    const opts=chatOptsFor(d.agent);
    recordSent(d.agent, messages, opts); // so "what was actually sent" is never a guess
    if(useStream) opts.onStream=(p)=>{
      if(!d.streaming||d.minimized) return;
      d.streaming.content=p.content; d.streaming.thinking=p.thinking;
      streamed=true; updateStreamingBubble(d);
    };
    let reply=await AI.chat(messages, opts);
    // a "thinking" model can burn its whole short-reply budget on invisible
    // reasoning and come back empty — worth one retry with real room before
    // giving up, rather than showing a visitor a dead end mid-conversation
    if(isEmptyReply(reply)) reply=await AI.chat(messages,{...opts, long:true});
    // prefer the live-streamed reasoning if the provider set it; then the
    // side-channel; so the thought is kept even when the final answer is empty
    const thinking=AI.lastThinking||(d.streaming&&d.streaming.thinking)||null;
    d.history.push({role:'assistant',content:reply});
    d.transcript.push({from:'npc',text:reply,thinking});
    remember(d.agent,q,reply);
    logActivity('Asked '+agent.label+': "'+(q.length>60?q.slice(0,60)+'…':q)+'"'+elapsedTag());
  }catch(err){
    // Tell a timeout apart from a real connection failure (BETA-FEEDBACK #22).
    // A timeout isn't "it broke" — the model was just slow — so say so kindly
    // and never imply the thought was cut on purpose; the wall is already
    // generous (see REPLY_TIMEOUT) and the pocket phone lets them walk away.
    /* SAY WHAT ACTUALLY WENT WRONG, at least to the console. This catch wraps
       the whole turn — building the prompt as well as the call — so a bug in
       OUR assembly has always been reported to the visitor as "your local AI
       didn't answer", which blames the model for our mistake and sends them to
       check Ollama. Found 2026-08-08: a genuine TypeError in the notes-search
       path was invisible for three test runs because of exactly this.
       The visitor still gets the kind sentence; the reason is one keypress
       away instead of nowhere. */
    console.error('[chat] '+d.agent+' turn failed:', err);
    const aborted = err && (err.name==='AbortError' || /abort|timed?\s*out/i.test(String(err.message||'')));
    d.transcript.push({from:'npc', text: aborted ? TIMEOUT_LINE : agent.errorLine});
  } finally {
    /* ONE PRESS, ONE SEARCH — and `finally` rather than the end of the happy
       path on purpose. A message that timed out or threw must still clear the
       ask, or a failed question silently turns the permission on for good. */
    d.askNotes=false;
  }
  // let a paced resident finish saying it before the bubble is replaced
  await finishPacedReveal(d);
  // how far into the reply the reveal had got — carried across the handover
  // from the streaming bubble to the final one, so a pocketed reply resumes
  // rather than restarts (see revealHead()).
  const shownSoFar=(d.streaming && d.streaming.shown)||0;
  if(d.revealPaused) d._pausedAt=shownSoFar;   // hold it exactly where they stopped it
  d.thinking=false; d.streaming=null; stopPacedReveal();
  if(d.minimized){
    // the visitor pocketed the phone and walked off — don't type into a
    // hidden overlay; buzz the floating card and reveal it on return
    d.unread=true; d._landedWhilePocketed=true;
    d._landedAt=Date.now(); d._landedShown=shownSoFar;
    renderChatPhone();
    blip(880,.08,'sine',.04); setTimeout(()=>blip(1120,.08,'sine',.04),110);
  } else {
    // if it streamed in live, the text is already fully shown — just settle
    // it into a final bubble (with the collapsed thought); otherwise reveal
    // the buffered reply with the usual typewriter. A held reveal takes the
    // typeLast branch either way, so the settled bubble is painted to the
    // character it was held on rather than snapping to full.
    renderChatView({typeLast: !streamed || !!d.revealPaused});
  }
}
document.getElementById('dialog').addEventListener('pointerdown',e=>{
  if(e.target.tagName==='INPUT'||e.target.id==='dSpeak') return; // let the speak button handle its own clicks
  e.preventDefault(); advanceDialog();
});

/* ----- Badges — a small toast on first unlock, plus a panel to review
   locked/unlocked ones. Locked entries keep their description visible,
   so the panel doubles as a "things to try" checklist without forcing
   a walkthrough on anyone who'd rather just wander. ----- */
let badgeToastTimer=null;
export function showBadgeToast(b){
  const el=document.getElementById('badgeToast'); if(!el) return;
  el.innerHTML = `<div class="bIcon">${b.icon}</div><div><div class="bT">New badge: ${esc(b.name)}</div><div class="bS">${esc(b.desc)}</div></div>`;
  el.classList.add('show');
  clearTimeout(badgeToastTimer);
  badgeToastTimer=setTimeout(()=>el.classList.remove('show'),4200);
  blip(880,.07); setTimeout(()=>blip(1100,.09),80);
}
/* The same strip, carrying a plain sentence instead of a badge. Added for the
   Records Hall, which can hold a door written by an older build whose function
   has since been renamed — a card that silently does nothing when clicked is
   the house failure mode, and this is the cheapest loud alternative. */
export function showToast(text){
  const el=document.getElementById('badgeToast'); if(!el) return;
  el.innerHTML = `<div class="bIcon">•</div><div><div class="bS">${esc(text)}</div></div>`;
  el.classList.add('show');
  clearTimeout(badgeToastTimer);
  badgeToastTimer=setTimeout(()=>el.classList.remove('show'),3200);
}
/* WHO DOES WHAT, for the person — 2026-08-03. The residents' duties were
   cleaned up the same day so a small local model would stop being handed two
   different org charts; this is the other half of that, and arguably the
   larger one. Nowhere in the Pavilion has ever told the VISITOR who to ask for
   what. Seven residents and no directory is not mystery, it is a maze.

   It renders straight off data/roles.js, the same table the prompts derive
   from, so the screen and the models can never disagree. */
/* ONE opener for every chat resident, read off data/roles.js. There were
   none before: each resident could only be reached by physically walking to
   them, so "ask the Tutor about this" was advice rather than a door. A handoff
   the visitor has to walk across three rooms to act on is not a handoff. */
export function talkTo(key){
  const r=ROLES[key]; if(!r||!r.chat) return;
  openChatDialog({ name:r.chat.name, aiAgent:key, color:r.chat.color, glow:r.chat.glow, lines:[r.chat.line] });
  if(!isAIActive() && state.dialog){
    state.dialog.transcript.push({from:'npc',
      text:'(No local AI is connected yet — ⚙ Manage AI connections in the pause menu, and I can actually answer.)'});
    renderChatView();
  }
}
export function openRoster(){ state.ui='roster'; hideAllOv(); renderRoster(); showOv('rosterOv'); }
function renderRoster(){
  const el=document.getElementById('rosterPanel'); if(!el) return;
  el.innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>Who to ask for what</h2>
    <div class="meta">Seven residents, and each one is a different <b>job</b> rather than a different voice.
      Ask the wrong one and you'll get a worse answer than the Pavilion can actually give — so this is the
      directory. Every one of them will hand you on by name when a question isn't theirs; that's part of
      the job, not a brush-off.</div>
    ${rosterForVisitor().map(r=>`
      <div class="card" onclick="closeUI();${r.open}">
        <div class="t">${esc(r.label)} <span class="badge lic">${esc(r.title)}</span>${r.hub?' <span class="badge">start here</span>':''}</div>
        <div class="s" style="margin-top:5px">${esc(r.duty)}</div>
        <div class="s" style="margin-top:5px;opacity:.8"><b>Go to them for:</b> ${esc(r.sendMe)} · <i>${esc(r.where)}</i></div>
      </div>`).join('')}
    <div class="card" style="cursor:default;margin-top:12px;border-color:#8fb4d9">
      <div class="t">If you don't know who to ask</div>
      <div class="s" style="margin-top:5px">Ask <b>Sebastian</b>. He's the hub — he keeps your day and knows
        where everything and everyone else is. The <b>Steward</b> is the other safe bet: he does the
        preparatory work and exists partly to point the others in the right direction.</div>
    </div>`;
}
export function openBadges(){ state.ui='badges'; hideAllOv(); renderBadges(); showOv('badgesOv'); }
function renderBadges(){
  const unlocked=Object.keys(data.badges).length;
  document.getElementById('badgesPanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>Badges</h2>
    <div class="meta">${unlocked}/${BADGES.length} earned — each one marks the first time you tried something.
      The locked ones double as a list of things worth trying.</div>
    ${BADGES.map(b=>{
      const got=data.badges[b.id];
      return `<div class="card" style="cursor:default;opacity:${got?1:.55}">
        <div class="t">${b.icon} ${esc(b.name)} ${got?`<span class="badge">${esc(got)}</span>`:'<span class="badge">locked</span>'}</div>
        <div class="s">${esc(b.desc)}</div>
      </div>`;
    }).join('')}`;
}

/* ----- The Records Hall (Workshop, floor 2) — a walkable version of
   what already exists only as files (archive/dev-log-*.txt). Visuals
   first, on purpose, per this session's own explicit instruction: a
   real, hand-written timeline for now, not yet reading the actual
   archive files live — the backend connection is real future work, not
   this pass. ----- */
export function openRecordsHall(){ state.ui='records'; hideAllOv(); renderRecordsHall(); showOv('recordsOv'); refreshRecordsHall(); }

/* ONE WALK, TWO READERS. gatherRecords() produces the history from the save
   and is the only thing that decides what counts as a record. The database
   is asked second, and only to ADD what the save can no longer see (older
   rows, and anything hidden staying hidden) — it is never a separate
   implementation of the same idea, which is the store.js scar.

   So with no database this room is complete and correct; with one it is the
   same room, longer. */
async function refreshRecordsHall(){
  const local = gatherRecords(data, s => { const d = Store.getDoc(s); return d && d.title; });
  Store.syncRecords(local);                        // fire and forget; it soft-fails
  let rows = null;
  try { rows = await Store.dbQuery('records', [400]); } catch(e){ rows = null; }
  if(state.ui !== 'records') return;               // they walked out while we asked
  renderRecordsHall(rows);
}

function renderRecordsHall(dbRows){
  const local = gatherRecords(data, s => { const d = Store.getDoc(s); return d && d.title; });
  /* The database's answer wins where it exists, because it is the one that
     knows about hiding. Merge on source_key so a row the save no longer
     produces still shows, rather than vanishing the day a book is removed. */
  let list = local, indexed = false;
  if(Array.isArray(dbRows) && dbRows.length){
    const bySrc = new Map(local.map(r => [r.source_key, r]));
    for(const r of dbRows){
      bySrc.set(r.source_key || (r.kind + ':' + r.id), {
        kind:r.kind, title:r.title, detail:r.detail, ref:r.ref, opener:r.opener,
        slug:r.slug, tags:r.tags || [],
        happened:(typeof r.happened === 'string' ? r.happened : new Date(r.happened).toISOString()).slice(0,10),
        source_key:r.source_key || (r.kind + ':' + r.id),
      });
    }
    list = [...bySrc.values()].sort((a,b)=> a.happened<b.happened?1:a.happened>b.happened?-1:0);
    indexed = true;
  }

  const counts = recordSummary(list);
  const summary = counts.map(([k,n]) => {
    const L = RECORD_LOOK[k] || { icon:'•', label:k };
    return `${L.icon} ${n} ${esc(L.label)}`;
  }).join(' · ');

  document.getElementById('recordsPanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>The Records Hall</h2>
    <div class="meta">Everything you have done here, newest first, beside the
      Pavilion's own history. This room <b>owns nothing</b> — every line points
      back at where the real thing lives, so nothing here is a dead end.
      ${indexed ? '' : '<br><b>Not indexed on this device</b> — a browser tab has no database, so this is built from your save each time you open it. Everything you have done still shows; older entries you have since removed do not.'}</div>
    ${summary ? `<div class="meta" style="color:#c9a227">${summary}</div>` : ''}
    ${list.length ? list.map(r => {
      const L = RECORD_LOOK[r.kind] || { icon:'•' };
      /* A record with an opener is a door; one without is a line of history.
         Never render a button that goes nowhere — the whole point of `opener`
         living in the schema is that the Hall cannot become a dead end. */
      const go = r.opener && window[r.opener]
        ? ` onclick="recordOpen('${jsq(r.opener)}','${jsq(r.ref||'')}')" style="cursor:pointer"`
        : ' style="cursor:default"';
      /* `detail` says what a record was a slice OF — for a finished day, the
         bigger thing it came out of ("Learning electronics"), which is the
         whole anti-overwhelm point of the board. It was carried through
         gatherRecords from the first version and rendered by nothing, which
         is the inert-data half of the inert-pure-function bug: perfectly
         correct, and invisible. */
      return `<div class="card"${go}>
        <div class="t">${L.icon} ${esc(r.happened)}${r.kind!=='milestone'?' · '+esc((RECORD_LOOK[r.kind]||{}).label||r.kind):''}</div>
        <div class="s">${esc(r.title)}</div>
        ${r.detail?`<div class="meta" style="margin-top:2px">part of ${esc(r.detail)}</div>`:''}
      </div>`;
    }).join('') : `<div class="meta">Nothing recorded yet. Read a book, run an
      experiment, or make something at the Bench and it will show up here.</div>`}`;
}

/* The door. Openers are stored as plain names in the database, so this
   checks the function actually exists before calling it — a record written
   by an older build must never crash the room it is listed in. */
export function recordOpen(opener, ref){
  const fn = window[opener];
  if(typeof fn !== 'function'){ showToast('That door has moved since this was recorded.'); return; }
  try { ref ? fn(ref) : fn(); } catch(e){ showToast('Could not open that.'); }
}

/* ----- Local Library storage status — same passive-status-line pattern
   as refreshAIStatus() below, for MinIO instead of Ollama. Waits on
   Store.libraryReady first (an existing hook, unused until now) since
   the shipped seed — the only place a fullText.storage pointer can
   come from — hasn't necessarily resolved yet at page load. Only shown
   when it's actually relevant: if nothing in the mirrored Library uses
   MinIO storage at all (the zero-setup seed.js path, or a catalogue
   simply not configured), there's nothing to warn about, so the line
   stays hidden rather than alarming a visitor about a thing that
   doesn't apply to them. */
export async function refreshLibraryStorageStatus(){
  const el=document.getElementById('libMode');
  if(!el) return;
  await Store.libraryReady;
  // Only MinIO-style pointers ({bucket,key}) need a running service — a
  // personal book's {personal:'…'} pointer is a plain file the desktop app
  // reads itself, so it must never trigger the MinIO warning.
  const usesStorage=Store.allDocs().some(d=>d.doc.fullText && d.doc.fullText.storage && d.doc.fullText.storage.bucket);
  if(!usesStorage){ el.textContent=''; return; }
  const base=(import.meta.env && import.meta.env.VITE_MINIO_ENDPOINT) || 'http://localhost:9000';
  try{
    const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),1500);
    const res=await fetch(base+'/minio/health/live', { signal:ctrl.signal });
    clearTimeout(t);
    el.textContent = res.ok
      ? '● Local Library storage connected — full texts will load'
      : "○ Local Library storage (MinIO) not responding — full texts won't load until it's running";
  }catch(e){
    el.textContent = "○ Local Library storage (MinIO) not running — full texts won't load until it's running (see LIBRARY-SCALING-PLAN.md)";
  }
}

/* ----- The local database: is it there, and what does it change -----
   Added 2026-08-03. The Pavilion is COMPLETE without a database — seed plus
   your own save is a whole working Pavilion, and that is a release gate with
   a test. The database is an UPGRADE, and until now nothing in the app said
   so, which made it a secret feature rather than an offer.

   Written for a person who has never installed a container: it says what is
   on, what it would add, and it never implies anything is broken. */
/* WHERE YOUR BOOKS ACTUALLY GO, and it is not the same answer in a browser as
   in the app. Measured 2026-08-04 against the steward's own 39 imported books,
   which average 563 KB:

     web build     text is stored INSIDE the save, against a browser quota of
                   about 5-10 MB — roughly A DOZEN BOOKS and then it is full
     desktop app   libraryWrite puts each text in its own .txt under userData;
                   the save keeps only the catalogue row — hundreds are fine
     + Docker      MinIO holds the text, Postgres indexes it — no real limit

   Docker buys SEARCH AND SORTING, not capacity, and saying otherwise would
   send someone to install a container for a problem it does not solve. A
   browser reader who is about to lose a book deserves the warning BEFORE the
   quota error, not after. */
export function libraryCeilingLine(){
  const desktop = typeof window!=='undefined' && !!window.desktopBridge;
  const n = (Store.dbAvailable && Store.dbAvailable()) ? 0 : personalBooks().length;
  if(desktop || (Store.dbAvailable && Store.dbAvailable())) return '';
  if(n < 8) return '';
  return n >= 12
    ? `⚠ ${n} books in a browser tab. Browser storage runs out at roughly a dozen full texts — `
      +`install the desktop app and your books live in real files instead, with no practical limit.`
    : `You have ${n} books here. A browser tab holds roughly a dozen full texts before its storage `
      +`is full; the desktop app keeps them as real files instead.`;
}
/* THE DESKTOP APP HAS A DATABASE. All of them, not just the ones with Docker
   — the app carries its own Postgres (PGlite) and falls back to it whenever
   the container is not answering. So this line stopped being "have you
   installed a container" and became "which home are you on", and the honest
   answer for a browser is no longer "install Docker" but "use the app".

   `kind` comes from electron/db.cjs and is the only place the difference is
   ever visible; every other caller asks for a named query and never learns
   where it ran. */
export function backendStatusLine(kind){
  const on = Store.dbAvailable && Store.dbAvailable();
  /* "EVERYTHING WORKS" WAS THE LIE, and it cost a real morning on
     2026-08-10: "i cant find my books in the library ... i tried in npm run
     dev and i cant find the books there ... this issue keeps happening."

     A browser tab is not a smaller Pavilion, it is a DIFFERENT ONE. bridge()
     in data/store.js needs window.desktopBridge, which a tab does not have,
     so there is no Postgres, no MinIO and no access to the book files on
     this machine — a library of 415 books renders as an empty shelf. And
     localStorage is per-origin, so :5173, :4173 and the app are three
     separate saves that cannot see each other's books either.

     None of that was said anywhere. The old line named a SEARCH limitation
     ("nothing is indexed") for what is actually an ABSENCE, and absence with
     the reason unsaid is the house failure mode. Say it plainly instead. */
  if(!on) return { on:false,
    text:'○ Running in a browser tab — this is a SEPARATE Pavilion. Your books, notes and days '
        +'here are its own: a tab cannot reach the desktop app\'s database, its book files, or '
        +'Docker, and each address (localhost:5173, :4173, the app) keeps its own save. '
        +'If your library looks empty here, it is not lost — open the desktop app.' };
  if(kind === 'docker') return { on:true,
    text:'● Postgres in Docker — your shelves, chapters and notes are indexed, '
        +'and the container holds the book text beside it.' };
  if(kind === 'embedded') return { on:true,
    text:'● Built-in database — your shelves, chapters and notes are indexed. '
        +'Nothing to install; Docker is only needed to keep the book text outside the app.' };
  // bridge present but neither home answered — say so rather than imply health
  return { on:false,
    text:'○ The database did not open. Everything still works and nothing is lost; '
        +'search and sorting are the parts that need it.' };
}
/* What a database actually adds, in the visitor's terms rather than ours.
   Kept beside the status so the two can never drift apart. */
export const BACKEND_UPGRADES = [
  'Search every note you have ever written, at once.',
  'See everything you wrote about one book, grouped by its real chapters.',
  'Sort a big shelf twenty books at a time, and pick up where you left off.',
  'Chapter marks that you can correct by hand, and that stay corrected.',
];
export async function refreshBackendStatus(){
  const el=document.getElementById('dbMode'); if(!el) return;
  /* Asked, not assumed. dbAvailable() only means "there is a bridge" — it
     cannot tell a working database from one that failed to open, and before
     the embedded one existed that gap did not matter because the two were
     the same thing. Now they are not. */
  const st = Store.dbStatus ? await Store.dbStatus() : null;
  const s = backendStatusLine(st && st.up ? st.kind : null);
  /* The ceiling warning rides on the same line, and only when it is true of
     THIS visitor — a browser reader whose shelf is filling up. Silence
     otherwise; a warning everyone sees is a warning nobody reads. */
  const ceiling=libraryCeilingLine();
  /* A DATABASE THAT READS FINE BUT DOES NOT SAVE MUST NOT LOOK HEALTHY.
     The wording and the precedence live in data/backend-trouble.js, which
     is DOM-free so npm test can hold it to account without a browser. */
  const trouble = backendTrouble(st);
  if(trouble){
    el.textContent = trouble.text;
    el.style.color = '#e0a43c';
    return;
  }
  el.textContent = ceiling ? s.text+'  '+ceiling : s.text;
  el.style.color = ceiling ? '#e0a43c' : (s.on ? '#8fbf8f' : '#9c8b74');
}

/* ----- AI status + Connections panel ----- */
export async function refreshAIStatus(){
  await detectAI(data.aiConnections);
  const el = document.getElementById('aiMode');
  if(isAIActive()){
    el.textContent = '● Connected to '+AI.name+' — ask Quill anything in the Library';
    return;
  }
  // The desktop app is meant to reach people without this repo (and its
  // README) sitting on disk — pointing at "see README" there is a dead
  // end. Point at the actual download instead, per DESKTOP-APP-PLAN.md's
  // "a plain, honest message and a link, not a silent fallback."
  if(typeof window !== 'undefined' && window.desktopBridge?.isDesktop){
    el.innerHTML = '○ No local AI detected — install <a href="https://ollama.com" target="_blank" rel="noopener">Ollama</a> and pull a model to let residents talk back';
  } else {
    el.textContent = '○ No local AI detected — Quill uses scripted dialog (see README for setup)';
  }
}
export function openConnections(){
  state.ui='connections'; hideAllOv();
  renderConnections();
  showOv('connOv');
}
/* ----- "Can my computer run this?", answered by measuring instead of asking.
   From the first real handover (2026-07-28): *"most of my friends don't even
   have Ollama or know how to check their computer's capabilities, most have
   laptops."* Looking up your own RAM is exactly the small friction that ends
   an evening's curiosity, so the app does it.

   The desktop app gets the true numbers from Node's `os`. A browser can only
   offer navigator.deviceMemory, which is capped at 8 and rounded to a power of
   two — so when that's all we have, the reading says so rather than pretending
   to precision it hasn't got. getBattery() is what distinguishes a laptop,
   which is worth knowing: on battery most of them throttle hard. */
export async function checkMyMachine(){
  const out=document.getElementById('machineOut'); if(!out) return;
  out.innerHTML='<div class="meta">Reading this machine…</div>';
  let info={ measured:false };
  const bridge=window.desktopBridge;
  if(bridge && bridge.machineInfo){
    try{ const r=await bridge.machineInfo(); if(r&&r.ok) info={ ...r, measured:true }; }catch(e){ /* fall through to hints */ }
  }
  if(!info.measured){
    // browser hints: coarse, and honest about it
    info.totalMemGB = navigator.deviceMemory || 0;
    info.cores = navigator.hardwareConcurrency || 0;
    info.platform = navigator.platform || '';
  }
  try{
    if(navigator.getBattery){ const bat=await navigator.getBattery(); info.hasBattery = !!bat && bat.charging!==undefined && bat.level<1.0 ? true : (bat? true : false); }
  }catch(e){ /* no battery API — desktop, or a browser that won't say */ }
  const rec=recommendModel(info);
  const colour = rec.tier==='tight' ? '#8a6a3a' : rec.tier==='unknown' ? '#8a6a3a' : '#7fa36b';
  out.innerHTML = `
    <div class="card" style="cursor:default;border-color:${colour}">
      <div class="t" style="color:${colour}">${esc(rec.verdict)}</div>
      <div class="s" style="margin-top:5px">${esc(rec.why)}</div>
      ${rec.model?`
        <div class="s" style="margin-top:10px"><b>Type this one line</b> in a terminal once Ollama is installed:</div>
        <div class="row" style="margin-top:5px;gap:6px;align-items:center;flex-wrap:wrap">
          <code style="font-size:13px;color:var(--gold)">${esc(pullCommand(rec.model))}</code>
          <button class="btn ghost" style="font-size:11px;padding:2px 8px" onclick="copyPullCommand('${esc(pullCommand(rec.model))}')">Copy</button>
        </div>`
      :`<div class="row" style="margin-top:10px;gap:6px;flex-wrap:wrap">
          <button class="btn ghost" onclick="openShelf('Practice')">📖 Read what the Pavilion is for instead</button>
        </div>`}
      <div class="meta" style="margin-top:10px">
        ${rec.measured
          ? `Read from this machine: <b>${rec.ram} GB</b> memory, <b>${rec.cores}</b> cores${info.cpu?` · ${esc(String(info.cpu).slice(0,44))}`:''}.`
          : `<b>An estimate.</b> A browser won't report real memory (it caps the number at 8), so this is a safe guess rather than a reading. The installed desktop app measures it properly.`}
      </div>
      ${rec.notes.length?`<ul style="margin:8px 0 0 18px;padding:0">${rec.notes.map(n=>`<li class="s" style="margin:4px 0">${esc(n)}</li>`).join('')}</ul>`:''}
      <div class="s" style="margin-top:10px;opacity:.85">Don't want to install anything? You never have to. The
        Library, the reader, read-aloud, your notes, the day planner and every lesson work with no AI at all.</div>
    </div>`;
}
export function copyPullCommand(cmd){
  try{ navigator.clipboard.writeText(cmd); blip(760,.06);
    const o=document.getElementById('machineOut'); if(o){ const m=o.querySelector('.meta'); if(m) m.insertAdjacentHTML('beforebegin','<div class="s" style="color:#7fa36b">✓ Copied.</div>'); }
  }catch(e){ /* clipboard refused — the line is on screen to type */ }
}
/* ----- Voice settings (BETA-FEEDBACK.md #6) — a real voice + rate
   picker for read-aloud, persisted at data.ttsSettings. getVoices()
   can come back empty on first call in some browsers until the
   'voiceschanged' event actually fires; re-render when it does rather
   than assume the first call already has the full list. */
if(ttsAvailable()) window.speechSynthesis.onvoiceschanged = () => { if(state.ui==='voice') renderVoiceSettings(); };
/* getVoices() is populated ASYNCHRONOUSLY — on most machines it returns []
   on the first call and fills in a moment later, firing 'voiceschanged'.
   Nothing listened for that, so opening this panel showed only "System
   default" and the improvements below were invisible. Reported from real use
   2026-07-27 ("I didn't see any changes on the voice in the settings; there is
   a default option though"). Listen once, redraw if the panel is still open. */
let voicesHooked=false;
export function openVoiceSettings(){
  state.ui='voice'; hideAllOv();
  if(!voicesHooked && ttsAvailable() && typeof window.speechSynthesis.addEventListener==='function'){
    voicesHooked=true;
    window.speechSynthesis.addEventListener('voiceschanged', ()=>{ if(state.ui==='voice') renderVoiceSettings(); });
  }
  renderVoiceSettings();
  // belt and braces: some engines never fire the event but do fill the list
  setTimeout(()=>{ if(state.ui==='voice' && ttsVoices().length) renderVoiceSettings(); }, 350);
  setTimeout(()=>{ if(state.ui==='voice' && ttsVoices().length) renderVoiceSettings(); }, 1200);
  showOv('voiceOv');
}
export function setTTSVoice(voiceURI){
  data.ttsSettings.voiceURI = voiceURI || null;
  setTTSSettings(data.ttsSettings);
  persist();
}
export function setTTSRate(rate){
  data.ttsSettings.rate = Number(rate);
  setTTSSettings(data.ttsSettings);
  persist();
  const label=document.getElementById('voiceRateLabel');
  if(label) label.textContent = Number(rate).toFixed(2)+'×';
}
export function previewTTSVoice(){
  speak("This is what reading aloud sounds like, at this speed.", null);
}
const voiceOption=(cur)=>(v)=>`<option value="${esc(v.voiceURI)}" ${v.voiceURI===cur.voiceURI?'selected':''}>${esc(v.name)} (${esc(v.lang)})</option>`;
function renderVoiceSettings(){
  const panel=document.getElementById('voicePanel');
  if(!ttsAvailable()){
    panel.innerHTML = `<button class="xbtn" onclick="openMenu()">← Back to menu</button>
      <h2>Voice Settings</h2>
      <div class="meta">This browser doesn't support read-aloud (the Web Speech API isn't
        available) — nothing to configure here.</div>`;
    return;
  }
  const voices = ttsVoices();
  const cur = getTTSSettings();
  /* Most machines have a dozen voices and two of them are worth using. The
     good ones announce themselves in their names — Windows calls its neural
     ones "Natural", browsers label theirs "Online"/"Neural" — so they get
     sorted to the top instead of being buried alphabetically among the old
     SAPI ones. Asked for 2026-07-27; this is the free half of the voice
     upgrade, and it needs no download at all. */
  const isBetter=v=>/natural|neural|online|premium|enhanced|siri|eloquence/i.test(v.name||'');
  const uiLang=(navigator.language||'en').slice(0,2).toLowerCase();
  const score=v=>((v.lang||'').toLowerCase().startsWith(uiLang)?0:1);
  const better=voices.filter(isBetter).sort((a,b)=>score(a)-score(b));
  const rest=voices.filter(v=>!isBetter(v)).sort((a,b)=>score(a)-score(b));
  panel.innerHTML = `
    <button class="xbtn" onclick="openMenu()">← Back to menu</button>
    <h2>Voice Settings</h2>
    <div class="meta">Applies to every "read aloud" button in the Pavilion — the Reader, a
      resident's spoken replies, all of it. Free, local, and built into your browser; nothing
      here is sent anywhere.</div>
    <label>Voice</label>
    <select id="voiceSelect" onchange="setTTSVoice(this.value)" style="width:100%">
      <option value="">System default</option>
      ${better.length?`<optgroup label="Better voices on this machine">${better.map(voiceOption(cur)).join('')}</optgroup>`:''}
      <optgroup label="${better.length?'Everything else':'Voices on this machine'}">${rest.map(voiceOption(cur)).join('')}</optgroup>
    </select>
    ${voices.length ? '' : '<div class="meta">No voices listed yet — some browsers load these a moment after the page opens; check back if the dropdown above is empty.</div>'}
    ${better.length
      ? `<div class="meta" style="margin-top:6px">The ones at the top are the neural voices already installed on this machine — they sound markedly warmer than the older built-in ones. Preview a couple; it's the cheapest improvement available here.</div>`
      : `<div class="meta" style="margin-top:6px"><b>Only the old robotic voices are installed.</b> Windows has far better ones for free:
          <b>Settings → Time &amp; Language → Speech → Manage voices → Add voices</b>. Install one, reopen the Pavilion, and it will appear at the top of this list. Nothing is bought and nothing is sent anywhere — they run on your machine like everything else here.</div>`}
    <label style="margin-top:12px">Speed — <span id="voiceRateLabel">${cur.rate.toFixed(2)}×</span></label>
    <input type="range" id="voiceRateSlider" min="0.5" max="1.75" step="0.05" value="${cur.rate}"
      oninput="setTTSRate(this.value)" style="width:100%">
    <div class="row" style="margin-top:14px">
      <button class="btn ghost" onclick="previewTTSVoice()">▶ Preview this voice</button>
    </div>`;
}
function statusBadge(c,ok){
  if(c.enabled===false) return '<span class="badge">off</span>';
  if(ok===null) return '<span class="badge">checking…</span>';
  return ok ? '<span class="badge" style="border-color:#7fa36b;color:#a9cf90">● connected</span>'
            : '<span class="badge" style="border-color:#b56f6f;color:#e0a0a0">○ unreachable</span>';
}
// anything not on this device's own loopback address is a real cloud call —
// worth a plain, unmissable label rather than blurring it with Ollama's
// "nothing leaves this device" promise
/* The rule itself lives in ai/provider.js now (isLocalConn), because the chat
   header needs the same answer and two copies of "is this on my machine" is
   the drift this project keeps paying for. */
function localityBadge(c){
  const local = isLocalConn(c);
  return local ? '<span class="badge" style="border-color:#7fa9c9;color:#a9cbe0">🏠 local</span>'
               : '<span class="badge" style="border-color:#e0a43c;color:#f2c97a">☁ cloud — leaves this device</span>';
}
function connCardHTML(c,i){
  return `<div class="card" style="cursor:default">
    <div class="t">${esc(c.name)} <span id="connStatus${i}">${statusBadge(c,null)}</span> ${localityBadge(c)}</div>
    <div class="s">${esc(c.kind)} · ${esc(c.baseUrl||'')}</div>
    <div id="connModel${i}" class="s">Model: ${c.model?esc(c.model):'(auto-picked)'}</div>
    <div class="row" style="margin-top:8px">
      <button class="btn ghost" onclick="toggleConnection(${i})">${c.enabled===false?'Enable':'Disable'}</button>
      ${c.builtin?'':`<button class="btn ghost" onclick="removeConnection(${i})">Remove</button>`}
    </div>
  </div>`;
}
/* HOSTED MODELS ARE OFFERED, NEVER TAKEN. The Pavilion will not auto-pick one
   and the Monk will never be handed one (see isCloudModel in ai/provider.js) —
   but a laptop cannot run a 9B model, and refusing to even LIST the thing that
   would work for that person is enforcement, not guidance. So they sit in
   their own group, labelled ☁, and only a deliberate choice selects one.
   The steward's line: needing an assistant and being able to have one are two
   different things. */
function modelPickerHTML(i,c,models,cloud){
  const local=models||[], hosted=cloud||[];
  const opt=m=>`<option value="${esc(m)}" ${c.model===m?'selected':''}>${esc(m)}</option>`;
  const opts=['<option value="">(auto-pick a local model)</option>']
    .concat(local.length?[`<optgroup label="🏠 on this machine">${local.map(opt).join('')}</optgroup>`]:[])
    .concat(hosted.length?[`<optgroup label="☁ run on Ollama's servers">${hosted.map(opt).join('')}</optgroup>`]:[]);
  const chosenCloud=hosted.includes(c.model);
  return `<div class="s">Model:
    <select onchange="setConnectionModel(${i},this.value)" style="background:#1b140d;border:1px solid #55432e;border-radius:5px;color:#f5e9d4;font-family:inherit;font-size:12px;padding:3px 6px">
      ${opts.join('')}
    </select>${chosenCloud?`<div class="s" style="color:#e0a43c;margin-top:4px">☁ This one runs on Ollama's servers — what you say to a resident leaves this machine. Useful on a laptop that cannot run a model itself; swap to a 🏠 one any time.</div>`:''}
    ${(!local.length&&hosted.length&&!chosenCloud)?`<div class="s" style="color:#e0a43c;margin-top:4px">Only hosted models are installed. Pick one above to use it, or pull a local one to keep everything on this machine.</div>`:''}</div>`;
}
const CONNECTION_PRESETS = {
  ollama: { name:'Ollama (local)', kind:'ollama', baseUrl:'http://localhost:11434' },
  claude: { name:'Claude (Anthropic)', kind:'anthropic', baseUrl:'https://api.anthropic.com/v1' },
  openai: { name:'ChatGPT (OpenAI)', kind:'openai-compatible', baseUrl:'https://api.openai.com/v1' },
  grok:   { name:'Grok (xAI)', kind:'openai-compatible', baseUrl:'https://api.x.ai/v1' },
};

/* ----- THE FRONT DOOR: is Ollama actually there? -----
   Added 2026-08-03. The panel used to open with three cloud buttons —
   ☁ Claude, ☁ ChatGPT, ☁ Grok — every one of which needs an API key. So the
   most prominent thing in "Add a connection" was three dead ends, while the
   free thing that IS already wired (Ollama is the built-in default) had no
   setup path at all beyond a placeholder URL in a form.

   The steward's own position, 2026-08-03: free tools first, and he is not
   getting an API key. So this checks the thing that works, tells you what it
   found, and hands you the exact line to copy if something is missing. */
export async function checkOllama(){
  const out=document.getElementById('ollamaOut'); if(!out) return;
  out.innerHTML='<div class="meta">Looking for Ollama on this machine…</div>';
  const base='http://localhost:11434';
  let models=null;
  try{
    const ctrl=new AbortController(); const t=setTimeout(()=>ctrl.abort(),2500);
    const res=await fetch(base+'/api/tags',{signal:ctrl.signal});
    clearTimeout(t);
    if(res.ok){ const j=await res.json(); models=(j.models||[]).map(m=>m.name); }
  }catch(e){ models=null; }

  if(models===null){
    out.innerHTML=`<div class="card" style="cursor:default;border-color:#8a6a3a">
      <div class="t">Ollama isn't answering</div>
      <div class="s" style="margin-top:4px">That's the free, private way to run an AI here — it lives on
        your own machine and nothing you say ever leaves it. It's a normal install, then one command
        to fetch a model.</div>
      <div class="s" style="margin-top:6px">1 · Install it from <b>ollama.com/download</b><br>
        2 · Open a terminal and run the line the button below gives you<br>
        3 · Come back and press <b>Check for Ollama</b> again</div>
      <div class="row" style="margin-top:8px">
        <button class="btn ghost" onclick="checkMyMachine()">Which model fits this computer?</button>
      </div>
    </div>`;
    return;
  }
  if(!models.length){
    out.innerHTML=`<div class="card" style="cursor:default;border-color:#8a6a3a">
      <div class="t">Ollama is running — but it has no models yet</div>
      <div class="s" style="margin-top:4px">It's installed and answering; it just needs something to think with.
        Press below and the Pavilion will read this machine and give you one line to copy.</div>
      <div class="row" style="margin-top:8px">
        <button class="btn" onclick="checkMyMachine()">Which model fits this computer?</button>
      </div>
    </div>`;
    return;
  }
  /* NOT EVERY MODEL OLLAMA LISTS IS LOCAL. Saying "nothing leaves this
     machine" while a hosted model is selected would be a straightforward
     lie, and the kind hardest to notice because the panel is otherwise
     telling the truth.

     This panel used to carry its OWN `/:cloud\b/` regex — a second copy of
     a rule that already existed in provider.js, and both had gone stale
     against `gpt-oss:20b-cloud`. One definition now, in provider.js, where
     the model list is actually built. */
  const cloud=models.filter(m=>isCloudModel(m));
  const local=models.filter(m=>!isCloudModel(m));
  const best=bestLocalModel(local, local[0]||models[0]);
  const list=(arr)=>arr.map(m=>esc(m)).join(' · ');
  out.innerHTML=`<div class="card" style="cursor:default;border-color:${local.length?'#7fa36b':'#8a6a3a'}">
    <div class="t">● Ollama is running${local.length?` — ${local.length} model${local.length===1?'':'s'} on this machine`:''}</div>
    ${local.length?`<div class="s" style="margin-top:4px">🏠 ${list(local)}</div>`:''}
    ${cloud.length?`<div class="s" style="margin-top:6px;color:#e0a43c">☁ ${list(cloud)} — these are Ollama's
      <b>hosted</b> models, not local ones. Using one sends your conversation to Ollama's servers.</div>`:''}
    ${local.length
      /* THE MONK NO LONGER CLAIMS THE LARGEST MODEL, and this line said he did
         for three days after the rule was retired (2026-08-07 → found
         2026-08-10). chatOptsFor() returns {} for every agent and detectAI()
         assigns ONE connection to everyone, so there is no per-resident model
         and no per-resident provider. A panel whose whole job is telling the
         truth about where a conversation goes is the worst possible place for
         a stale promise. `best` is still computed — bestLocalModel() is good
         code with no rule behind it — and is now shown as what it actually is:
         the biggest one you have, for your own information. */
      ? `<div class="s" style="margin-top:6px">A 🏠 model answers entirely on this computer — nothing you say
          to a resident goes anywhere. <b>Every resident uses this connection's model</b>; there is no
          per-resident routing. The largest local model you have is <b>${esc(best)}</b>.</div>`
      : `<div class="s" style="margin-top:6px">All of these are hosted. For the private, offline Pavilion,
          pull a local model — press below and you'll get the line to copy.</div>
         <div class="row" style="margin-top:8px"><button class="btn" onclick="checkMyMachine()">Which model fits this computer?</button></div>`}
  </div>`;
}
export function fillConnectionPreset(id){
  const p=CONNECTION_PRESETS[id]; if(!p) return;
  document.getElementById('ncnName').value=p.name;
  document.getElementById('ncnKind').value=p.kind;
  document.getElementById('ncnUrl').value=p.baseUrl;
  document.getElementById('ncnKey').focus();
}
function renderConnections(){
  const conns=data.aiConnections;
  document.getElementById('connPanel').innerHTML = `
    <button class="xbtn" onclick="openMenu()">← Back to menu</button>
    <h2>AI Connections</h2>
    <div class="meta">Stored on this device only. The first enabled connection below that answers
      is the one used by every resident and desk. A 🏠 local connection (Ollama, LM Studio, any
      server on your own machine) never sends anything anywhere else; a ☁ cloud connection sends
      your conversation — and whatever it's grounded in — to that provider's servers, same as
      using their own app would. Both are real options here; just know which one you're using.</div>
    <div class="card" style="cursor:default;margin:10px 0;border-color:#7fa36b">
      <div class="t">🏠 Start here — the free, private way</div>
      <div class="s" style="margin-top:4px">Ollama runs an AI on <b>your own machine</b>. No account, no key,
        no cost, and nothing you say ever leaves this computer. It's the way this Pavilion is meant to be used.</div>
      <div class="row" style="margin-top:8px"><button class="btn" onclick="checkOllama()">Check for Ollama</button></div>
      <div id="ollamaOut" style="margin-top:8px"></div>
    </div>
    <div class="card" style="cursor:default;margin:10px 0;border-color:#8fb4d9">
      <div class="t">🔍 Not sure if your computer can do this?</div>
      <div class="s" style="margin-top:4px">Don't go looking up your specifications — press the button and
        the Pavilion will read this machine and tell you which model to get, in one line you can copy.</div>
      <div class="row" style="margin-top:8px"><button class="btn" onclick="checkMyMachine()">Check this computer</button></div>
      <div id="machineOut" style="margin-top:8px"></div>
    </div>
    <details style="margin:4px 0 10px">
      <summary style="cursor:pointer;color:#e0a43c;font-size:13px">📏 Which model fits my machine? (the tiered guide)</summary>
      <div class="meta" style="margin-top:8px">
        Pick by the machine you actually have, not the biggest number:<br><br>
        <b>Modest</b> (no real GPU, 8GB RAM) — <code>ollama pull llama3.2:1b</code>. Snappy, simple, everything works.<br>
        <b>Everyday</b> (most laptops, 8–16GB RAM) — <code>ollama pull llama3.2</code>. The dependable default.<br>
        <b>Capable</b> (real GPU or 16GB+ RAM) — an 8B instruct model, e.g. <code>ollama pull llama3.1:8b</code>. Deeper, still reliable.<br>
        <b>Strong</b> (12GB+ VRAM) — an 8–14B instruct, plus optionally <i>one</i> "thinking" model.<br><br>
        Two Pavilion facts worth knowing: <b>every resident runs on this connection's model</b> —
        there is no per-resident routing, so one good default serves the whole place. The Monk
        used to claim the largest model you had installed; that was retired on 2026-08-07, so
        <b>you no longer need a big model on his account</b>. And <b>a "thinking" model is not
        worth it right now</b> — the Pavilion currently sends every request with thinking
        switched off, so you would get the long pause without seeing any of the reasoning.
        Start small; only move up a tier if replies feel thin.
        The full guide lives in <code>PROTOCOLS.md</code> (Protocol 2).
      </div>
    </details>
    <details style="margin:4px 0 14px">
      <summary style="cursor:pointer;color:#e0a43c;font-size:13px">❔ What's actually different between models, and where does my data go?</summary>
      <div class="meta" style="margin-top:8px">
        <b>Exactly what gets sent, for any connection:</b> the visible conversation so far, plus
        whatever that resident is grounded in — for Quill, the current Library shelf list; for
        every resident, the charter. Nothing more, nothing silent. For a 🏠 local connection that
        never leaves this device at all; for a ☁ cloud connection, that's what actually reaches
        the provider's servers.<br><br>
        <b>"Thinking" models</b> (named that way on purpose — qwen3.5, deepseek-r1, qwq, and
        similar) spend part of their reply budget on invisible reasoning before they actually
        answer, which can make a reply slow or, if that budget runs out first, come back
        completely blank. A plain model (llama3.2 and similar) skips that step entirely — faster
        and more predictable for everyday conversation, which is why it's the one this game
        suggests by default.<br><br>
        <b>Context window</b> is the real limit on how much conversation a model can actually
        "see" at once — a fixed budget, measured in tokens (roughly word-pieces), that a long
        back-and-forth can genuinely fill up. Once it does, the earliest parts of the conversation
        stop being visible to the model, even though they're still right there on your screen —
        a hard limit of the model itself, not a bug in this game. See <code>LEARNING-PATH.md</code>
        Stage 16 for the fuller version, including what "loaded," VRAM vs. RAM, and a model's own
        memory footprint actually mean.
      </div>
    </details>
    <div id="connList">${conns.map((c,i)=>connCardHTML(c,i)).join('')}</div>
    <h3>Add a connection</h3>
    <div class="meta">"Base URL" is the address of the AI server — for Ollama that's usually
      <b>http://localhost:11434</b>. An API key is only needed for connections that require one —
      cloud providers always do, kept on this device only, sent straight to that provider and
      nowhere else.</div>
    <div class="row" style="margin-bottom:10px">
      <button class="btn" style="font-size:11.5px" onclick="fillConnectionPreset('ollama')">🏠 Ollama (free, local)</button>
    </div>
    <!-- THE SENTENCE NOBODY TELLS YOU. A Claude or ChatGPT subscription is
         not an API key, and the panel used to lead with three buttons that
         implied otherwise. Cloud still works for anyone who has a real key —
         the provider layer speaks all three — it just stops being the front
         door. Removing it outright would leave the Anthropic provider
         dormant-but-reachable, which is exactly the state this project
         deleted the Supabase mirror over. -->
    <details style="margin:0 0 12px">
      <summary style="cursor:pointer;color:#9c8b74;font-size:12px">☁ I already have an API key from a cloud provider</summary>
      <div class="meta" style="margin-top:8px">
        <b>A subscription is not an API key.</b> Paying for Claude or ChatGPT in their own apps does
        not give you one — an API key is a separate, pay-per-use developer credential from the same
        company. If you don't have one, these won't work, and Ollama above is the free way in.<br><br>
        A ☁ connection sends your conversation, and whatever the resident is grounded in, to that
        company's servers — the same as using their app would.
      </div>
      <div class="row" style="margin-top:8px">
        <button class="btn ghost" style="font-size:11.5px" onclick="fillConnectionPreset('claude')">☁ Claude</button>
        <button class="btn ghost" style="font-size:11.5px" onclick="fillConnectionPreset('openai')">☁ ChatGPT</button>
        <button class="btn ghost" style="font-size:11.5px" onclick="fillConnectionPreset('grok')">☁ Grok</button>
      </div>
    </details>
    <label>Name</label><input type="text" id="ncnName" placeholder="e.g. LM Studio, or a friend's server">
    <label>Kind</label>
    <select id="ncnKind" style="width:100%;background:#1b140d;border:2px solid #55432e;border-radius:7px;color:#f5e9d4;font-family:inherit;font-size:13.5px;padding:9px 11px">
      <option value="ollama">Ollama-style (native /api/chat)</option>
      <option value="openai-compatible">OpenAI-compatible (/chat/completions)</option>
      <option value="anthropic">Anthropic (Claude Messages API)</option>
    </select>
    <label>Base URL</label><input type="text" id="ncnUrl" placeholder="http://localhost:11434">
    <label>API key (optional)</label><input type="text" id="ncnKey" placeholder="leave blank if not needed">
    <div class="row" style="margin-top:14px">
      <button class="btn" onclick="addConnection()">Add connection</button>
      <button class="btn ghost" onclick="recheckConnections()">Recheck all</button>
    </div>`;
  conns.forEach((c,i)=>{
    if(c.enabled===false) return;
    const provider=providerFor(c);
    provider.isAvailable().then(ok=>{
      const row=document.getElementById('connStatus'+i);
      if(row) row.outerHTML=`<span id="connStatus${i}">${statusBadge(c,ok)}</span>`;
      /* Rendered even when the connection is NOT active, because the one
         case that matters is a laptop with only hosted models installed:
         it reports inactive precisely until you choose one, and if the
         picker were hidden there would be no way to. */
      if(provider.availableModels?.length || provider.cloudModels?.length){
        const modelRow=document.getElementById('connModel'+i);
        if(modelRow) modelRow.outerHTML=modelPickerHTML(i,c,provider.availableModels,provider.cloudModels);
      }
    });
  });
}
export function setConnectionModel(i,model){
  const c=data.aiConnections[i]; if(!c) return;
  c.model=model||null;
  persist(); refreshAIStatus(); renderConnections();
}
export function addConnection(){
  const name=document.getElementById('ncnName').value.trim()||'Custom connection';
  const kind=document.getElementById('ncnKind').value;
  const baseUrl=document.getElementById('ncnUrl').value.trim();
  const apiKey=document.getElementById('ncnKey').value.trim();
  if(!baseUrl) return;
  data.aiConnections.push({ id:'conn-'+Date.now(), name, kind, baseUrl, apiKey, model:null, enabled:true, builtin:false });
  persist(); renderConnections(); refreshAIStatus(); blip(700,.06);
}
export function toggleConnection(i){
  const c=data.aiConnections[i]; if(!c) return;
  c.enabled = c.enabled===false;
  persist(); renderConnections(); refreshAIStatus();
}
export function removeConnection(i){
  const c=data.aiConnections[i]; if(!c||c.builtin) return;
  data.aiConnections.splice(i,1);
  persist(); renderConnections(); refreshAIStatus();
}
export function recheckConnections(){ renderConnections(); refreshAIStatus(); refreshLibraryStorageStatus(); }

/* ================================================================
   [UI] overlays — shelf browser, reader, planner, courses
   ================================================================ */
function showOv(id){ document.getElementById(id).classList.add('open'); }
/* Hide every overlay. This USED to be a hand-maintained list of 48 ids, and on
   2026-08-02 it was missing all three panels added that day — the Lab, the
   bundle importer and the lift. The symptom was reported as "I like the lift
   but I can't get into the room and it won't let me exit": the panel opened,
   nothing ever removed its .open class, so it sat over the world forever.

   Same failure as the window-export list caught the same day: a list that must
   be edited in lockstep with another file, with nothing checking. So it derives
   now. A new overlay is hidden correctly because it exists, not because someone
   remembered. (#chatOv and the phone cards are not .overlay and are handled on
   their own paths — deliberately outside this sweep.) */
function hideAllOv(){ document.querySelectorAll('.overlay').forEach(el=>el.classList.remove('open')); }
/* Closing a panel used to CANCEL read-aloud outright, with no way back — the
   single most-complained-of thing in real use ("if I try to do anything it
   pauses that voice and I can't even unpause it"). Now: a book you're
   listening to keeps its place. If it was reading from the pocket it simply
   keeps reading; otherwise it parks, resumable, and the pocket card shows a ▶.
   Speech that isn't a book (a spoken reply, a summary) still just stops. */
/* Another voice (a spoken reply, a summary) needs the one speech channel. It
   parks the book instead of cancelling it, so "I was listening to a book and
   then talked to Quill" ends with the book still resumable from the pocket
   rather than simply gone. */
function yieldBookAudio(){
  if(state.bookAudio && isSpeaking()){
    pauseSpeaking();
    showBookPocketFor(state.bookAudio);
    return true;
  }
  return false;
}
export function closeUI(){
  state.ui=null; hideAllOv(); stopTyping();
  if(state.pocketSlug){ /* the book is pocketed — never interrupt it */ }
  else if(state.bookAudio && isSpeaking()){ pauseSpeaking(); showBookPocketFor(state.bookAudio); }
  else stopSpeaking();
  state.audioReturnSlug=null; state.notesLogEdit=null; persist();
}

/* The Account panel is gone (2026-08-02). It existed to sign in to a hosted
   backend for cross-device save sync and steward powers; both left with
   the hosted backend. There is no account and nothing to sign in to — already
   the standing direction and is now simply true. Export Save / Import Save in
   the pause menu are how a save moves between machines. */

/* ----- Pause menu — reachable with Esc from the open world, or the ☰ HUD button ----- */
export function openMenu(){ state.ui='menu'; hideAllOv(); renderMenu(); showOv('menuOv'); awardBadge('first-menu'); }

/* PLACES — every room, one keystroke away, DERIVED from data/places.js and
   grouped by the room it stands in. Until 2026-08-10 this menu named about
   twenty-five panels and NOT ONE ROOM: the Writing Desk, the Request Board,
   the Grant Desk, the Commons Table, the Inheritance Hall and the Science
   Hall could be reached only by remembering where they were and walking. See
   the header of data/places.js for the count and the standing decision.

   The headings are the SCENES' OWN NAMES, so a room renamed in scenes.js is
   renamed here, and a room that stops existing shows up rather than vanishing
   quietly. npm test crosses the table against scenes.js in both directions. */
function placesSections(){
  return placesByScene(scenes).map(g => {
    const items = g.items.map(p => {
      /* The door is called through window like every other menu item, so a
         listed room that is not exported is a dud button — which is exactly
         the guard in test/smoke.mjs, and exactly what openArchive() was. */
      return `<button class="btn ghost menuItem" onclick="${p.door}()"${
        p.note ? ` title="${p.note.replace(/"/g,'&quot;')}"` : ''}>${p.icon} ${p.label}</button>`;
    });
    return `<div class="menuSection">${g.name}</div><div class="menuGrid">${items.join('')}</div>`;
  }).join('');
}

function renderMenu(){
  // Grouped into labelled sections in a two-column grid — a scannable menu with
  // real hierarchy, rather than one long identical stack (VISUAL-POLISH Phase 2).
  const item=(fn,label,extra='')=>`<button class="btn ghost menuItem${extra}" onclick="${fn}">${label}</button>`;
  const section=(title,items)=>`<div class="menuSection">${title}</div><div class="menuGrid">${items.join('')}</div>`;
  document.getElementById('menuPanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>Menu</h2>
    <div class="meta">Arrows / WASD move · E interacts and fishes · Esc closes a panel, or opens
      this one from the open world.</div>
    <button class="btn menuResume" onclick="closeUI()">▸ Resume</button>
    ${section('Your day', [
      item('openTheDay()', `☀ Today${(function(){const l=theDayLine(currentDayItems());return l?' · '+l:'';})()}`),
      item('openIdeaCapture()', `📓 The Log${data.ideas.length?' · '+data.ideas.length:''}`),
      item('openStillOpen()', `📋 Still Open${openSparks().length?' · '+openSparks().length:''}`),
      item('openPaths()', `🧭 Paths${(data.paths||[]).filter(p=>!p.walked).length?' · '+(data.paths||[]).filter(p=>!p.walked).length:''}`),
      item('openNotesLog()', '🗒 Your Notes'),
      item('openLearningTree()', `🌳 Lesson plans${(function(){
        const cur=currentStudy(); if(!cur) return '';
        return ' \u00b7 ' + cur.node.title.slice(0,26);
      })()}`),
      /* The Course Board had NO menu door at all — you reached it by walking
         to a desk in the Study, or backwards out of the Learning Tree. Asked
         plainly 2026-08-03: "where in game can i make a course, the course
         board?" A room that can only be found by remembering where it is has
         the Lab's problem in a milder form. */
      item('openCourses()', `📋 The Course Board${(function(){
        const n=(data.courses||[]).filter(c=>!c.archived).length; return n?' · '+n:'';
      })()}`),
      item('openAcademy()', '🎓 The Academy'),
      /* The Lab is four hops away — Grounds, Workshop, up, up — on a floor that
         until 2026-08-02 said "nothing open here", so anyone who explored early
         learned to skip it. Reported the same day: "we have talked a lot about
         having a research station and the electronics build, is that just a
         plan? I can't find anything like that." It was built and unreachable,
         which is the same thing as unbuilt. A room still deserves its place in
         the world; it just should not be the ONLY way in. */
      item('openLab()', `🔬 The Lab${(function(){
        const b=(data.hall&&data.hall.builds)||[];
        const open=b.reduce((n,x)=>n+(x.entries||[]).filter(e=>!e.closed).length,0);
        return open?' · '+open+' waiting':'';
      })()}`),
      item('openRoster()', '👥 Who to ask'),
      item('openBadges()', '🏅 Badges'),
    ])}
    ${/* Was "Library", which never described these three and became actively
          misleading on 2026-08-10 when the rooms went in below: a section
          headed LIBRARY sat directly above a section headed THE LIBRARY,
          meaning something else. Read off a screenshot, not reasoned. */''}
    ${section('What you are carrying', [
      item('openDailyTasks()', `📋 Today's Tasks${todaysTaskLine()?' ·':''}`),
      item('openInventory()', '🎒 Inventory'),
      item('openReviewQueue()', '🛡 Steward Review'),
    ])}
    ${placesSections()}
    ${section('Local AI', [
      item('openConnections()', '⚙ Manage AI connections'),
      item('openLocalAIPanel()', '🧠 Local AI'),
      item('openVoiceSettings()', '🔊 Voice settings'),
    ])}
    ${section('Account & data', [
      item('openWaypoints()', '🔗 Waypoints'),
      item('openActivity()', '📜 Activity Log'),
      item('openStorage()', '📦 Where books are kept'),
      item('openDataPanel()', '📊 Your Data'),
      item('openReport()', '✍ Tell them what happened'),
    ])}
    ${section('Save & session', [
      item('exportSave()', '⬇ Export save'),
      item('triggerImportSave()', '⬆ Import save…'),
      item('returnToTitle()', '← Title screen'),
      item('resetSave()', '⚠ Reset progress', ' menuDanger'),
    ])}`;
}

/* ----- USER-DATA-MANAGEMENT-PLAN.md steps 1-2 — visibility first (what's
   actually in your save, before deciding whether export or reset is even
   worth doing), then the one real pruning gap: clearing old planner days.
   Removing a single Research/Grant Desk project already has its own
   "Delete project" button right where that project lives — not duplicated
   here. Nothing here fires on its own; every action is opt-in and
   confirmed, matching the standing automation-philosophy rule. */
export function openDataPanel(){ state.ui='dataPanel'; hideAllOv(); renderDataPanel(); showOv('dataPanelOv'); }
function humanSize(bytes){
  if(bytes<1024) return bytes+' B';
  if(bytes<1024*1024) return (bytes/1024).toFixed(1)+' KB';
  return (bytes/(1024*1024)).toFixed(2)+' MB';
}
/* Where a visitor's own books physically are — read from the actual pointers
   on the books they've added, not guessed from what's configured. Three tiers,
   and the answer is whichever ones they're really using. */
function libraryStorageLine(){
  const mine=data.personalLibrary||[];
  if(!mine.length){
    return (typeof window!=='undefined' && window.desktopBridge)
      ? 'None added yet. When you add one, its text is written as a real file in the app’s own data folder — or into local MinIO instead, if you run Docker.'
      : 'None added yet. In a browser the text is kept inside the save itself, so a very large book may not fit; the desktop app writes real files instead.';
  }
  let minio=0,file=0,inline=0;
  for(const d of mine){
    const ft=(d.doc&&d.doc.fullText)||{};
    if(ft.storage&&ft.storage.bucket) minio++;
    else if(ft.storage&&ft.storage.personal) file++;
    else inline++;
  }
  const bits=[];
  if(minio) bits.push(`<b>${minio}</b> in local MinIO (Docker — the <code>sand-pavilion-library</code> bucket, on this machine)`);
  if(file) bits.push(`<b>${file}</b> as real files in the app’s own data folder`);
  if(inline) bits.push(`<b>${inline}</b> kept inside the save itself`);
  return `<b>${mine.length}</b> book${mine.length===1?'':'s'} of your own — ${bits.join(' · ')}.`;
}
function renderDataPanel(){
  const bytes=new Blob([JSON.stringify(data)]).size;
  const bookNoteCount=Object.values(data.bookNotes).reduce((n,arr)=>n+arr.length,0);
  const stat=(t,s)=>`<div class="card" style="cursor:default;flex:1 1 120px"><div class="t">${t}</div><div class="s">${s}</div></div>`;
  document.getElementById('dataPanelPanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>Your Data</h2>
    <div class="meta">What's actually in your save, kept on this device — see it before deciding
      whether export or reset is even worth doing. Looking here changes nothing.</div>
    <h3 style="margin-top:16px">Where your Pavilion is actually kept</h3>
    <div class="meta">Not a mystery, and worth knowing before you put real work in. These are the
      only places anything goes.</div>
    <div style="margin-top:10px">
      <div class="card" style="cursor:default">
        <div class="t">📦 Your save — days, notes, courses, progress</div>
        <div class="s">${Store.mode==='local'
          ? 'This device’s own browser storage, under the key <b>sandPavilionSave.v2</b>. It survives closing the app.'
          : '<b>Memory only</b> — this preview can’t write to storage, so progress lasts this session. Export before you close it.'}</div>
      </div>
      <div class="card" style="cursor:default">
        <div class="t">📖 The text of books you added</div>
        <div class="s">${libraryStorageLine()}</div>
      </div>
      <div class="card" style="cursor:default">
        <div class="t">🏛 The books that shipped with the Pavilion</div>
        <div class="s">Inside the app itself. They cost your save nothing.</div>
      </div>
      <div class="card" style="cursor:default">
        <div class="t">☁ Anywhere else</div>
        <div class="s">Nowhere. There is no server, no account and no sync — not as a policy, but
          because none of it is built. Nothing leaves unless you write a file and hand it over.</div>
      </div>
    </div>
    <h3 style="margin-top:16px">What a resident on this machine can read</h3>
    <div class="meta">A different question from the one below, and worth keeping apart: this is about
      what a model <b>here</b> may see, not about anything leaving. ${esc(REACH_NOTICE)}
      ${sealedCount(data.noteReach) ? `<br>You have <b>${sealedCount(data.noteReach)}</b> sealed note${sealedCount(data.noteReach)===1?'':'s'}.` : ''}</div>
    <label class="meta" style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:10px 0">
      <input type="checkbox" ${(data.settings&&data.settings.showContextMeter)?'checked':''} onchange="toggleContextMeter()">
      Show how much room the backpack is taking, in tokens
    </label>
    <div class="meta" style="margin:-4px 0 0">Off by default. The 👁 marks in your backpack are always
      there; this adds the bar and the numbers, which are useful when you are tuning a local model and
      noise when you are not.</div>
    <label class="meta" style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:10px 0">
      <input type="checkbox" ${(data.settings&&data.settings.showThinking)?'checked':''} onchange="toggleShowThinking()">
      Let the model show its reasoning, and show it to me
    </label>
    <div class="meta" style="margin:-4px 0 0">Off by default, and it costs something real: a reasoning
      model is asked to think out loud first, and that is <b>much</b> slower — the same question to a
      9B model here took <b>1 second with this off and 107 with it on</b>. It also gets a far bigger
      budget, because a model told to reason on a short one can spend the whole thing thinking and
      answer nothing. Leave it off for ordinary use; switch it on when an answer looks wrong and you
      want to see where it went wrong.
      ${thinkingCapabilityLine()}</div>

    <h3 style="margin-top:16px">What can leave this machine, and what never does</h3>
    <div class="meta">The honest accounting, store by store. The rule underneath all of it:
      <b>nothing moves by itself.</b> There is no sync and no upload — a thing becomes shared only
      because you deliberately wrote a file and handed it to someone.</div>
    <div style="margin-top:10px">
      ${DATA_MAP.map(d=>`<div class="card" style="cursor:default">
        <div class="t">${visBadge(d.state)} ${esc(d.name)}</div>
        <div class="s">${esc(d.leaves)}</div>
      </div>`).join('')}
    </div>
    <div class="meta" style="margin-top:8px">Where sharing actually happens: the <b>Commons Table</b> in the Café
      (papers, lesson plans, courses) and the <b>Inheritance Hall</b> (books, notes and courses left as gifts).
      Both write files. Neither needs an account.</div>
    <div class="row" style="flex-wrap:wrap;gap:10px;margin:14px 0">
      ${stat(humanSize(bytes),'total save size')}
      ${stat(Object.keys(data.planner).length,'planner days')}
      ${stat(bookNoteCount,'book notes')}
      ${stat(data.notes.length,'notes filed')}
      ${stat(data.workshop.research.length,'Research Desk projects')}
      ${stat(data.grantProjects.length,'Grant Desk projects')}
      ${stat(data.courses.length,'courses')}
      ${stat(Object.keys(data.badges).length,'badges earned')}
      ${stat(data.activityLog.length,'activity log entries')}
    </div>
    <h3 style="margin-top:16px">When it saves</h3>
    <div class="meta">Worth knowing before you trust a place with real work. There is no save button
      here because there is nothing to press: <b>everything you do is written the moment you do
      it</b>, and nothing is ever left waiting.</div>
    <div style="margin-top:10px">
      <div class="card" style="cursor:default">
        <div class="t">\u2713 Kept \u2014 written the instant it changes</div>
        <div class="s">Your books, notes, days, courses, chapter marks, the backpack and the
          \u201cpick up later\u201d shelf. Close the window mid-sentence and the sentence is there.</div>
      </div>
      <div class="card" style="cursor:default">
        <div class="t">\u25cb Not kept \u2014 and deliberately</div>
        <div class="s">Which panel you had open, and whether you had walked off with a book. These
          describe <i>this sitting</i> and mean nothing tomorrow. <b>Where you are in a book IS kept</b>
          \u2014 it used to be thrown away with the rest, and stopped being on 2026-08-07.</div>
      </div>
      <div class="card" style="cursor:default">
        <div class="t">\u26a0 If a save ever fails, you are told</div>
        <div class="s">If this device refuses to write \u2014 storage full, or blocked in a private
          window \u2014 the Pavilion says so once rather than carrying on as if nothing happened.
          A save that silently did not happen is the one thing worth interrupting you for.</div>
      </div>
    </div>
    <h3>Clear old planner days</h3>
    <div class="meta">Removes the intention, blocks, ember, and sparks for days before the date you
      pick — everything else in your save is untouched. Confirmed before anything happens, and it
      cannot be undone.</div>
    <div class="row" style="margin-top:8px;align-items:center">
      <input type="date" id="dataPruneBefore" style="width:auto">
      <button class="btn ghost" onclick="pruneOldPlannerDays()">Clear days before this date</button>
    </div>
    <div id="dataPruneMsg" class="meta"></div>
    <h3 style="margin-top:18px">What residents remember about you</h3>
    <div class="meta">Each resident keeps a short, private list of the topics you've raised with them —
      pinned to their memory so they can pick up where you left off. It lives only on this device, and
      it stores topics, not whole conversations. Sort it yourself: forget anything you'd rather a
      resident not carry, so the list stays short and useful instead of crowded.</div>
    <div style="margin-top:10px">${residentMemoryHtml()}</div>
    <h3 style="margin-top:18px">Removing a single project</h3>
    <div class="meta">A Research Desk or Grant Desk project has its own "Delete project" button right
      where you already work on it — nothing duplicated here.</div>`;
}
// Fix #23 (the user's part): the visitor can see and prune each resident's
// memory, so they curate it rather than it silently overcrowding. The deeper
// short-term -> long-term "converter" and the living village are planned
// separately (LIVING-VILLAGE-PLAN.md), not built here.
function residentMemoryHtml(){
  const keys=Object.keys(data.agentMemory||{}).filter(k=>(data.agentMemory[k]||[]).length);
  if(!keys.length) return '<div class="meta">Nothing remembered yet — talk with a resident and the topics you raise will collect here for you to manage.</div>';
  return keys.map(k=>{
    const label=(CHAT_AGENTS[k]&&CHAT_AGENTS[k].label)||k;
    const items=data.agentMemory[k];
    return `<div class="card" style="cursor:default">
      <div class="t">${AGENT_AVATAR[k]||'💬'} ${esc(label)} <span class="badge">${items.length}</span></div>
      <div style="margin-top:6px">${items.map((m,i)=>`
        <div class="row" style="align-items:center;gap:8px;margin-top:3px">
          <span class="s" style="flex:1;margin:0">${esc(m.ts)} — ${esc(m.text)}${m.gist?`<br><span style="opacity:.75">↳ ${esc(m.gist)}</span>`:''}</span>
          <button class="btn ghost" style="font-size:11px;padding:2px 9px" onclick="forgetMemoryItem('${k}',${i})">Forget</button>
        </div>`).join('')}</div>
      <div class="row" style="margin-top:8px"><button class="btn ghost" style="font-size:11px;padding:3px 10px;border-color:#b56f6f;color:#e0a0a0" onclick="forgetAllMemory('${k}')">Forget all from ${esc(label)}</button></div>
    </div>`;
  }).join('');
}
export function forgetMemoryItem(agent,idx){
  const mem=data.agentMemory[agent]; if(!mem) return;
  mem.splice(idx,1);
  if(!mem.length) delete data.agentMemory[agent];
  persist(); renderDataPanel();
}
export function forgetAllMemory(agent){
  delete data.agentMemory[agent];
  persist(); renderDataPanel();
}
export function pruneOldPlannerDays(){
  const cutoff=document.getElementById('dataPruneBefore').value;
  const msg=document.getElementById('dataPruneMsg');
  if(!cutoff){ msg.textContent='Pick a date first.'; return; }
  const doomed=Object.keys(data.planner).filter(k=>k<cutoff);
  if(!doomed.length){ msg.textContent='Nothing to clear before that date.'; return; }
  const sure=window.confirm('Clear '+doomed.length+' planner day(s) before '+cutoff+'? This cannot be undone.');
  if(!sure) return;
  doomed.forEach(k=>delete data.planner[k]);
  persist(); logActivity('Cleared '+doomed.length+' old planner day(s) from before '+cutoff+'.');
  renderDataPanel();
}

/* ----- LOCAL-AI-MONITORING-PLAN.md step 1 — a real "Local AI" panel,
   reachable from the pause menu. Polls /api/ps only while the panel is
   actually open, never a background timer — the same discipline this
   project already holds itself to around always-on cost (see
   AGENT-EMBODIMENT-PLAN.md's own tick-rate warning). Only Ollama
   connections expose listLoaded() at all; anything else gets an honest
   "no equivalent data" message instead of a fake zero. ----- */
/* ================================================================
   [WHERE YOUR BOOKS ARE KEPT] — 2026-08-10.

   Measured before it was built: there was NO in-game path to Docker at
   all. Setup existed only as terminal commands in PROTOCOLS.md and
   LEARNING-PATH.md, which is against a standing decision —

     "it is for a lay user: no terminal required, no config file."

   — and it is the difference between "about a dozen books" and "no
   practical limit" for everyone who is not the steward. A capability
   nobody can find is a capability nobody has.

   THREE RULES THIS ROOM FOLLOWS.

   1 · IT READS REAL STATE, never configuration. dbStatus() names which
       home actually answered; storageSummary() counts where the books
       really are. A panel that says "Docker: enabled" because a setting
       says so is how you get a person staring at an empty shelf.

   2 · NO FAKE INSTALL BUTTON. We do not shell out to Docker, and a
       button that pretends to would be the worst kind of dead end —
       one that appears to work. Say the step, make it copyable (the
       same thing copyPullCommand() already does for Ollama), then
       detect the result and say plainly that it worked.

   3 · IT NEVER IMPLIES ANYTHING IS BROKEN. The Pavilion is complete
       without Docker; that is a release gate with a test behind it.
       This is an OFFER, and the honest ceiling is stated either way.
   ================================================================ */
export function openStorage(){
  state.ui='storage'; hideAllOv(); renderStorage(); showOv('storageOv');
  /* dbStatus is async — draw the room immediately from what is already
     known and fill the live line in when it answers, rather than holding
     an empty panel open while a container is asked. */
  refreshStorageStatus();
  fillStorageDisk();
}
async function refreshStorageStatus(){
  const el=document.getElementById('storageLive'); if(!el) return;
  const st = Store.dbStatus ? await Store.dbStatus() : null;
  if(state.ui!=='storage') return;                 // they walked out while we asked
  const bridge = typeof window!=='undefined' && window.desktopBridge;
  if(!bridge){
    el.innerHTML = '<b style="color:#c8a04a">You are in a browser tab.</b> A tab cannot reach Docker, '
      + 'the desktop app\'s database, or your book files — it keeps its own separate save. '
      + 'Open the desktop app (or run <code>npm run electron:dev</code>) and this page will say something different.';
    return;
  }
  if(st && st.up && st.kind==='docker'){
    el.innerHTML = '<b style="color:#7fa36b">● Docker is running and the Pavilion is using it.</b> '
      + 'Your book text goes to local object storage, and there is no practical limit on how much.';
  } else if(st && st.up){
    /* THE DEFAULT PATH, AND IT READS LIKE ONE NOW. This used to end "Docker is
       how you go past that — the step is below", which framed the ordinary
       case as a waiting room for the advanced one. It is not: hundreds of
       books is where almost everyone stops. Docker is an offer further down
       the panel, behind a disclosure, for the two cases that need it. */
    el.innerHTML = '<b style="color:#7fa36b">● The built-in database is running, and nothing had to be '
      + 'installed.</b> Everything works: search, chapters, sorting. Book text is written as real files on '
      + 'this machine, up to the shelf limit you set below.';
  } else {
    el.innerHTML = '<b style="color:#c9a227">○ No database opened.</b> Nothing is lost and nothing is '
      + 'broken; search and sorting are the parts that want one.';
  }
}
/* THE VISITOR'S OWN SHELF LIMIT. One reader, so the panel, the intake table
   and the refusal can never disagree about what the number is. book-storage.js
   stays pure and takes it as an argument — it must not reach for `data`. */
export function bookCap(){
  const v = data && data.settings && data.settings.localBookCap;
  return v == null ? DEFAULT_LOCAL_BOOK_CAP : normalizeCap(v);
}
export function setBookCap(n){
  if(!data.settings) data.settings={};
  data.settings.localBookCap = normalizeCap(n);
  persist();
  renderStorage();
  showToast('Shelf limit set to ' + data.settings.localBookCap + ' books on this machine.');
}
function renderStorage(){
  const el=document.getElementById('storagePanel'); if(!el) return;
  const bridge = typeof window!=='undefined' && window.desktopBridge;
  const docs = Store.allDocs();
  const split = storageSummary(docs);
  const room = localRoom(docs, bookCap());
  /* ONE command, and it is the real one from docker-compose.yml. Copyable
     rather than typed, because a mistyped command is the commonest way a
     setup fails for someone who does not live in a terminal. */
  const CMD='docker compose up -d';
  el.innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>📦 Where your books are kept</h2>
    <div class="meta">The Pavilion works with none of this. Every step below is an offer, and
      nothing here is required to read, write or keep anything.</div>

    <div class="card" style="cursor:default;margin-top:12px;border-color:#8fb4d9">
      <div class="t">Right now</div>
      <div class="s" id="storageLive" style="margin-top:6px">checking…</div>
      ${split?`<div class="s" style="margin-top:8px">Your shelves: ${esc(split)}</div>`:''}
      ${room.used?`<div class="s" style="margin-top:4px">The local shelf holds <b>${room.used} of ${room.cap}</b> books
        — roughly <b>${esc(humanBytes(estimatedBytes(docs)))}</b> on this disk.${
        room.full?' <b style="color:#c8574a">It is full.</b> Raise your limit below.':''}</div>`:''}
    </div>

    ${bridge ? `
    <div class="menuSection" style="margin-top:16px">What you already have</div>
    <div class="card" style="cursor:default;border-color:#7fa36b">
      <div class="s"><b>The app carries its own database. There is nothing to install.</b> That is what
        gives you:</div>
      ${BACKEND_UPGRADES.map(u=>`<div class="s" style="margin-top:4px">· ${esc(u)}</div>`).join('')}
      <div class="s" style="margin-top:6px">All of it works right now, offline, on this computer alone.</div>
    </div>` : ''}

    <div class="menuSection" style="margin-top:16px">How much fits, honestly</div>
    <div class="card" style="cursor:default">
      <div class="s"><b>The desktop app</b> — <b>${room.cap} books</b> by default, with nothing to install,
        and <b>you can change that number below</b>. Each one is written as a real file in the app's own
        folder; the save only keeps the catalogue card. <b>This is the normal way to use the Pavilion</b>,
        and for almost everyone it is the only one needed.</div>
      <div class="s" style="margin-top:6px"><b>A browser tab</b> — about <b>10–20 books</b>. The text goes
        inside the save itself, against a browser's own few-megabyte limit. Real books average about half a
        megabyte.</div>
    </div>

    ${bridge ? `
    <div class="menuSection" style="margin-top:16px">Your shelf limit</div>
    <div class="card" style="cursor:default">
      <div class="s"><b>You set this, not the app.</b> It is a guardrail so a runaway import cannot quietly
        fill your disk — not a limit on what the Pavilion can hold. Books average about half a megabyte, so
        the default ${DEFAULT_LOCAL_BOOK_CAP} is roughly ${esc(humanBytes(DEFAULT_LOCAL_BOOK_CAP * AVG_BOOK_BYTES))}.</div>
      <div class="s" style="margin-top:6px" id="storageDisk">checking what this disk has spare…</div>
      <div class="row" style="margin-top:8px;align-items:center;gap:8px;flex-wrap:wrap">
        <label class="s" for="capInput">Stop at</label>
        <input id="capInput" type="number" min="${LOCAL_CAP_MIN}" max="${LOCAL_CAP_MAX}" step="25"
          value="${room.cap}" style="width:90px">
        <span class="s">books</span>
        <button class="btn" style="font-size:11.5px;padding:3px 12px"
          onclick="setBookCap(document.getElementById('capInput').value)">Set</button>
        ${room.cap!==DEFAULT_LOCAL_BOOK_CAP?`<button class="btn ghost" style="font-size:11.5px;padding:3px 10px"
          onclick="setBookCap(${DEFAULT_LOCAL_BOOK_CAP})">reset to ${DEFAULT_LOCAL_BOOK_CAP}</button>`:''}
      </div>
      <div class="s" style="margin-top:6px">Between ${LOCAL_CAP_MIN} and ${LOCAL_CAP_MAX}. Lowering it never
        removes a book you already have — it only stops the next one going to this machine.</div>
    </div>

    <details style="margin-top:16px">
      <summary style="cursor:pointer;color:#e0a43c;font-size:13px">⚙ Advanced — a library with no limit at all (Docker)</summary>
      <div class="card" style="cursor:default;margin-top:8px">
        <div class="s"><b>You do not need this.</b> It is for two situations: a library bigger than the local
          shelf holds, or wanting the same library on more than one computer.</div>
        <div class="s" style="margin-top:6px">What it buys, exactly:
          <b>book text with no practical limit</b>, and <b>one library shared between machines</b>.
          It does <b>not</b> make anything more private — the built-in database and your book files already
          never leave this computer — and it does <b>not</b> add search, which the app already has.</div>
      </div>
      <div class="card" style="cursor:default;margin-top:8px">
        <div class="s">One command, once. It needs <b>Docker Desktop</b> installed and running — that part is
          a normal download from docker.com, and the Pavilion cannot do it for you.</div>
        <div class="s" style="margin-top:8px">Then, in this project's folder:</div>
        <div class="row" style="margin-top:6px;align-items:center;gap:8px">
          <code style="background:var(--field);padding:6px 10px;border-radius:4px">${esc(CMD)}</code>
          <button class="btn ghost" style="font-size:11.5px;padding:3px 10px"
            onclick="copyStorageCommand('${jsq(CMD)}')">copy</button>
          <span class="s" id="storageCopied" style="color:#7fa36b"></span>
        </div>
        <div class="s" style="margin-top:8px">Come back to this panel afterwards and the line at the top
          will say so itself. Nothing needs restarting and nothing already saved moves.</div>
        <div class="s" style="margin-top:8px"><code>docker compose stop</code> turns it off again — the app
          falls back to its own built-in database and keeps working. Books already in Docker wait there
          until you start it again.</div>
      </div>
    </details>` : ''}

    <div class="row" style="margin-top:14px;gap:6px;flex-wrap:wrap">
      <button class="btn" onclick="openBookIntake()">📥 Bring a book in</button>
      <button class="btn ghost" onclick="openIndex()">📑 The Index</button>
      <button class="btn ghost" onclick="openDataPanel()">📊 Your Data</button>
    </div>`;
}
/* THE REAL NUMBERS, ASKED FOR ONCE THE PANEL IS ON SCREEN. Deliberately after
   the render rather than blocking it: reading a directory and a filesystem is
   fast but not free, and the panel is useful before it arrives. The line says
   what it is doing until it can say something true — never a zero that looks
   like an answer. */
async function fillStorageDisk(){
  const el=document.getElementById('storageDisk'); if(!el) return;
  const bridge=window.desktopBridge;
  if(!(bridge && bridge.libraryUsage)){
    el.textContent='';   // no bridge: the estimate above is all there is, and it says so
    return;
  }
  let u=null;
  try{ u=await bridge.libraryUsage(); }catch(e){ /* falls through to the honest line below */ }
  if(!u || !u.ok){ el.textContent='Could not read this disk — the estimate above still holds.'; return; }
  const used = u.bytes!=null ? `Your book files actually use <b>${esc(humanBytes(u.bytes))}</b>`
                             + (u.files!=null?` across ${u.files} file${u.files===1?'':'s'}`:'') : '';
  /* Free space is the half that decides the number, so when it is missing the
     line says so rather than quietly showing only the reassuring half. */
  const free = u.freeBytes!=null
    ? ` · <b>${esc(humanBytes(u.freeBytes))}</b> free on this disk`
    : ' · free space unavailable on this platform';
  el.innerHTML = used ? used + free : ('This disk' + free);
}
export function copyStorageCommand(cmd){
  try{ navigator.clipboard.writeText(cmd); blip(760,.06);
    const o=document.getElementById('storageCopied'); if(o) o.textContent='✓ copied';
  }catch(e){ /* clipboard refused — the command is on screen to type */ }
}

export function openLocalAIPanel(){
  state.ui='localai'; hideAllOv(); showOv('localaiOv');
  renderLocalAIPanel();
}
export async function renderLocalAIPanel(){
  const panel=document.getElementById('localaiPanel');
  panel.innerHTML = `<button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>Local AI</h2>
    <div class="meta">Checking what's actually loaded…</div>`;
  if(!isAIActive() || typeof AI.listLoaded!=='function'){
    panel.innerHTML = `<button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>Local AI</h2>
      <div class="meta">${isAIActive()
        ? 'The active connection ('+esc(AI.name)+") isn't Ollama — this panel only reads Ollama's own /api/ps endpoint, real usage data with no equivalent on other connection types."
        : 'No local AI connection is active right now — nothing to show.'}</div>`;
    return;
  }
  const loaded=await AI.listLoaded();
  if(state.ui!=='localai') return; // panel closed while the request was in flight
  const card=(t,s)=>`<div class="card" style="cursor:default"><div class="t">${esc(t)}</div><div class="s">${s}</div></div>`;
  const sess=sessionAISummary();
  const modelBreakdown=Object.entries(sess.byModel).map(([m,n])=>`${n}× ${esc(m)}`).join(', ');
  panel.innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>Local AI</h2>
    <div class="meta">Ollama's own <code>/api/ps</code>, read fresh right now — nothing polls in
      the background. Real memory and GPU-residency data, not a placeholder; true CPU/GPU
      percentage needs a further, desktop-only step (see LOCAL-AI-MONITORING-PLAN.md).</div>
    ${loaded.length ? loaded.map(m=>{
        const onGpu=m.sizeVram>0;
        const pct=m.size ? Math.round(m.sizeVram/m.size*100) : 0;
        const unloads=m.expiresAt ? '<br>unloads at '+new Date(m.expiresAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '';
        return card(m.name, humanSize(m.size)+' total · '+(onGpu?pct+'% on GPU':'running on CPU')+unloads);
      }).join('') : '<p>Nothing loaded right now — a model spins up fresh the moment a resident is actually asked something.</p>'}
    <h3 style="margin-top:16px">Today's session</h3>
    <div class="meta">Built entirely from the same activity log every ask already writes to —
      no separate tracking.</div>
    ${sess.count
      ? card(sess.count+' real ask'+(sess.count===1?'':'s')+' today',
          (sess.timed ? 'Total reply time: '+(sess.totalMs/1000).toFixed(1)+'s · avg '+((sess.totalMs/sess.timed)/1000).toFixed(1)+'s' : 'No timing recorded yet')
          +(modelBreakdown ? '<br>'+modelBreakdown : ''))
      : '<p>Nothing asked yet today.</p>'}
    <div class="row" style="margin-top:14px"><button class="btn ghost" onclick="renderLocalAIPanel()">↻ Refresh</button></div>`;
}

/* ----- Save export / import — "a Pavilion you can carry in a file" -----
   Export is just Store's own data serialized to a file the browser downloads;
   import is the reverse, replacing the current save wholesale (confirmed first,
   same pattern as resetSave). No backend, no account — a real backup and a way
   to move devices, using nothing Phase 3 hasn't already earned. */
/* A save export must be a whole Pavilion in one file. Personal books
   shelved in the desktop app keep their text as a file on disk, not in the
   save — so the export reads each one back through the bridge and inlines
   it into the exported COPY (live data is never touched). If a file can't
   be read, its pointer is kept as-is: a partial export beats none. */
async function exportableData(){
  const copy=JSON.parse(JSON.stringify(data));
  const bridge=window.desktopBridge;
  if(bridge && bridge.libraryRead){
    for(const b of (copy.personalLibrary||[])){
      const st=b.doc && b.doc.fullText && b.doc.fullText.storage;
      if(!st || !st.personal) continue;
      try{
        const res=await bridge.libraryRead(st.personal);
        if(res && res.ok){ b.doc.fullText.text=res.text; delete b.doc.fullText.storage; }
      }catch(e){ /* keep the pointer */ }
    }
  }
  return copy;
}
export async function exportSave(){
  const json=JSON.stringify(await exportableData(),null,2);
  const defaultName='sand-pavilion-save-'+todayKey()+'.json';
  // Desktop app: a real "Save As" dialog (BETA-TESTING-FEEDBACK.md #12) —
  // Electron still honors <a download> below but always drops it silently
  // into the OS Downloads folder with no picker.
  if(typeof window!=='undefined' && window.desktopBridge?.saveFile){
    const res=await window.desktopBridge.saveFile(defaultName, json);
    if(res.canceled) return;
    if(!res.ok){ alert('Could not save the file: '+(res.error||'unknown error')); return; }
    blip(700,.07);
    return;
  }
  const blob=new Blob([json],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=defaultName;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  blip(700,.07);
}
export function triggerImportSave(){ document.getElementById('importFile').click(); }
document.getElementById('importFile').addEventListener('change', e=>{
  const file=e.target.files[0]; e.target.value='';
  if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{
    let parsed;
    try{ parsed=JSON.parse(reader.result); }
    catch(err){ window.alert("That file isn't valid JSON — nothing was changed."); return; }
    if(typeof parsed!=='object'||parsed===null||Array.isArray(parsed)){
      window.alert("That doesn't look like a Sand Pavilion save file — nothing was changed."); return;
    }
    const sure=window.confirm('Import this save? It replaces everything currently on this device — '
      +'position, reading, planner days, courses, waypoints, AI connections, and Archive Desk entries. '
      +'This cannot be undone.');
    if(!sure) return;
    // The mirror of exportableData(): an imported save may carry personal
    // book texts inline. On desktop, write each back out as a real file and
    // keep only the pointer in the save (localStorage stays small); in a
    // browser, inline is already the right resting shape — leave it.
    (async ()=>{
      const bridge=window.desktopBridge;
      if(bridge && bridge.libraryWrite){
        for(const b of (parsed.personalLibrary||[])){
          const ft=b.doc && b.doc.fullText;
          if(!ft || !ft.text || !b.slug) continue;
          try{
            const res=await bridge.libraryWrite(b.slug+'.txt', ft.text);
            if(res && res.ok){ ft.storage={personal:b.slug+'.txt'}; ft.chars=ft.text.length; delete ft.text; }
          }catch(e){ /* keep inline — still readable, just bulkier */ }
        }
      }
      Store.save(parsed);
      location.reload();
    })();
  };
  reader.readAsText(file);
});

/* ----- Waypoints — a personal, no-backend link list.
   The café's eventual notice board needs Phase 3's shared backend to mean
   anything; this is the cheap precursor the README describes: links *you*
   trust, kept locally, that could graduate into the shared board later
   without changing shape. */
export function openWaypoints(){ state.ui='waypoints'; hideAllOv(); renderWaypoints(); showOv('waypointsOv'); }
function waypointCardHTML(w){
  return `<div class="card">
    <div class="t">${esc(w.title)}</div>
    <div class="s"><a class="link" href="${esc(w.url)}" target="_blank" rel="noopener noreferrer">${esc(w.url)}</a></div>
    ${w.note?`<div class="s">${esc(w.note)}</div>`:''}
    <div class="row" style="margin-top:8px">
      <button class="btn ghost" onclick="removeWaypoint(${w.id})">Remove</button>
    </div>
  </div>`;
}
function renderWaypoints(){
  document.getElementById('waypointsPanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>Waypoints</h2>
    <div class="meta">Links you trust, kept on this device only — nothing here is posted anywhere,
      and no one else can see it. The seed of what the café's shared notice board becomes later.</div>
    <div id="waypointList">${data.waypoints.length ? data.waypoints.map(waypointCardHTML).join('') : '<p>No waypoints yet.</p>'}</div>
    <h3>Add a waypoint</h3>
    <label>Title</label><input type="text" id="wpTitle" placeholder="e.g. MIT OpenCourseWare 6.006">
    <label>URL</label><input type="text" id="wpUrl" placeholder="https://...">
    <label>Note (optional)</label><input type="text" id="wpNote" placeholder="Why you're keeping this">
    <div id="wpMsg" class="meta"></div>
    <div class="row" style="margin-top:14px">
      <button class="btn" onclick="addWaypoint()">Add</button>
    </div>`;
}
export function addWaypoint(){
  const title=document.getElementById('wpTitle').value.trim();
  const rawUrl=document.getElementById('wpUrl').value.trim();
  const note=document.getElementById('wpNote').value.trim();
  const url=safeUrl(rawUrl);
  if(!title||!rawUrl) return;
  if(!url){ document.getElementById('wpMsg').textContent='Only http:// or https:// links are allowed here.'; return; }
  data.waypoints.unshift({id:Date.now(), title, url, note, added:todayKey()});
  persist(); logActivity('Added a waypoint: "'+title+'".'); awardBadge('first-waypoint'); renderWaypoints(); blip(700,.06);
}
export function removeWaypoint(id){
  data.waypoints=data.waypoints.filter(w=>w.id!==id);
  persist(); renderWaypoints();
}

/* ----- Activity Log — a short, human-readable record of what actually
   happened this visit and past ones (walked somewhere, read something,
   caught a fish, asked Quill something), not a raw debug event stream.
   Kept on this device like everything else; the same instinct behind
   Quill's memory report, applied to the whole session rather than one
   agent's conversation. */
export function openActivity(){ state.ui='activity'; hideAllOv(); renderActivity(); showOv('activityOv'); }
function renderActivity(){
  const log=data.activityLog||[];
  document.getElementById('activityPanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>Activity Log</h2>
    <div class="meta">What's actually happened, most recent first — kept on this device only,
      the last ${log.length ? log.length : 0} of up to 60 entries.</div>
    ${log.length ? log.map(e=>`
      <div class="card" style="cursor:default">
        <div class="s">${esc(new Date(e.ts).toLocaleString())}</div>
        <div class="t" style="font-weight:normal;font-size:13px">${esc(e.text)}</div>
      </div>`).join('') : '<p>Nothing logged yet — walk around, read something, catch a fish.</p>'}`;
}

/* READING-TO-DOING-PLAN.md step 4 — the exhaustive counterpart to the
   Writing Desk's own carry-forward toggle: every not-done spark from
   every day and every source (book, Research Desk, Grant Desk) in one
   place, reachable from the pause menu like Activity Log or Waypoints,
   never auto-opened. Closes the loop for real — not just "did I write
   this down" but "did I ever do anything with it." */
export function openStillOpen(){ state.ui='stillOpen'; hideAllOv(); renderStillOpen(); showOv('stillOpenOv'); }
function renderStillOpen(){
  const open=openSparks();
  document.getElementById('stillOpenPanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>Still Open</h2>
    <div class="meta">Every spark brought over from a book, the Research Desk, or the Grant Desk
      that isn't marked done yet, oldest first. Check one off here or wherever it came from —
      either way, it's the same record.</div>
    ${open.length ? open.map(s=>sparkCardHTML(s.dayKey,s.i,s,{showDay:true})).join('')
      : '<p>Nothing open right now — everything brought over from reading, research, or a grant project has been marked done.</p>'}`;
}

/* ----- Your Notes — one gathered, searchable view over every place a note
   actually lives (My Notes, book notes, chat notes, Research Desk notes,
   Grant Desk documents). NOTES-AND-LOG-ROOM-PLAN.md step 1: a *view*, not a
   sixth store — nothing is copied or moved, and each note is still edited
   where it lives. gatherNotes() is a pure read: it just walks data.* and
   normalises each note into the same small shape, so search/filter/sort work
   across all five at once. */
const NOTE_SOURCES=[
  {id:'all',      label:'All',           icon:'🗒'},
  {id:'mynotes',  label:'My Notes',      icon:'📓'},
  {id:'book',     label:'Book notes',    icon:'📖'},
  {id:'chat',     label:'Conversations', icon:'💬'},
  {id:'research', label:'Research',      icon:'🔬'},
  {id:'grant',    label:'Grant docs',    icon:'📝'},
];
// A small stable key per note so the folder/tag layer (data.noteMeta) can
// attach without touching the note itself. My Notes and chat notes already
// have stable identity (id / agent); book/research/grant notes are keyed by
// a content hash (source + a djb2 of ts|text) so the key survives another
// note being deleted or reordered — an index would not.
function noteHash(s){ let h=5381; for(let i=0;i<s.length;i++){ h=((h<<5)+h+s.charCodeAt(i))|0; } return (h>>>0).toString(36); }
/* A note counts as revisited only when it is opened — being in a list is not
   reading. Recorded so Today can tell the difference between a note you keep
   coming back to and one you wrote once and forgot. */
export function markNoteSeen(key){
  if(!key) return;
  if(!data.noteMeta[key]) data.noteMeta[key]={};
  data.noteMeta[key].seen=todayKey();
  persist();
}
function noteFolderOf(key){ return (data.noteMeta[key]&&data.noteMeta[key].folder)||''; }
function noteTagsOf(key){ return (data.noteMeta[key]&&data.noteMeta[key].tags)||[]; }
function allFolders(){ return [...new Set(Object.values(data.noteMeta||{}).map(m=>m&&m.folder).filter(Boolean))].sort(); }
function setNoteMeta(key, patch){
  const m=Object.assign({folder:'',tags:[]}, data.noteMeta[key]||{}, patch);
  if(!m.folder && (!m.tags||!m.tags.length)) delete data.noteMeta[key]; // don't keep empty entries
  else data.noteMeta[key]=m;
  persist();
}
/* ----- MAY A MODEL ON THIS MACHINE READ THIS NOTE? (data/note-reach.js) -----

   A SEPARATE side-map from noteMeta, and deliberately so: noteMeta sits on the
   DATA_MAP ignore list as "small, boring, self-evident", and a per-note AI
   permission is none of those — it belongs in Your Data where a person can
   read it. It is also the one thing here where absence is MEANINGFUL (absent
   means askable), and noteMeta deletes its own empty entries.

   The rule lives in the pure module; these three lines are only the save. */
function noteReachOf(key){ return reachOf(data.noteReach, key); }
export function toggleNoteSeal(key){
  if(!key) return;
  const now = noteReachOf(key);
  /* Two states under one press. A published note is not touched — that is a
     decision made elsewhere, through curation, and quietly un-publishing it
     from a lock button would be the silent wrong thing. */
  if(now === 'published'){
    setNotesLogMsg('This note is published, so it already reads like a book. Unpublish it at the Commons Table first.');
    return;
  }
  data.noteReach = setReach(data.noteReach, key, now === 'sealed' ? 'askable' : 'sealed');
  persist();
  blip(now === 'sealed' ? 760 : 420, .05);
  renderNotesLogList();
  refreshNoteEditors();
}
/* One badge, shown on any note a resident cannot read. Askable is the default
   and deliberately wears NO badge — a badge on every card is wallpaper, and
   the thing worth seeing at a glance is the departure from the rule. */
function reachBadge(key){
  const st = noteReachOf(key);
  if(st === 'askable') return '';
  const s = REACH_STATES[st];
  return `<span class="badge" style="border-color:#c78f8f;color:#e0a0a0" title="${esc(s.help)}">${s.icon} ${esc(s.label)}</span>`;
}
/* The same three states, but never silent — for anywhere the badge itself is
   the point rather than an exception to it (☀ Today's "Written today"). One
   vocabulary, two policies about when to show it, which is the difference
   between a list you scan and a control you act on. */
function reachState(key){
  const s = REACH_STATES[noteReachOf(key)] || REACH_STATES.askable;
  const colour = s === REACH_STATES.sealed ? '#c78f8f' : '#7fa36b';
  return `<span class="badge" style="border-color:${colour};color:${colour}" title="${esc(s.help)}">${s.icon} ${esc(s.label)}</span>`;
}
function setNotesLogMsg(text){
  const el=document.getElementById('notesLogMsg'); if(el) el.textContent=text;
}
/* The control itself, in the expanded card beside Folder and Tags — the other
   two things that are true ABOUT a note rather than part of it.

   It states the CURRENT rule in full, not just the switch, because "askable"
   is a promise with two halves and only one of them is obvious: a resident
   reads this when you ask, AND never otherwise. Someone who only sees a lock
   icon will reasonably assume the unlocked state means "always readable",
   which is not what it means and never has been. */
function reachRow(key){
  const st = reachOf(data.noteReach, key);
  const s = REACH_STATES[st];
  const isSealed = st === 'sealed';
  const btn = st === 'published' ? '' :
    `<button class="btn ${isSealed?'':'ghost'}" style="font-size:11px;margin-top:6px"
       onclick="toggleNoteSeal('${jsq(key)}')"
       title="${isSealed ? 'Let a resident read it when you ask' : 'Nothing will read it, even if you ask'}"
       >${isSealed ? '🔎 Let residents read it when I ask' : '🔒 Seal this note'}</button>`;
  return `<label style="margin:8px 0 4px">Residents</label>
    <div class="meta" style="margin:0">${s.icon} <b>${esc(s.label)}.</b> ${esc(s.help)}</div>
    ${btn}`;
}
/* The identity of a book note, in ONE place. gatherNotes() builds it and
   bookNoteFromKey() reads it back; anywhere else that wants to hand a note
   to the four doors (the Writing Desk does, now) has to agree exactly, and
   two copies of a hash recipe is precisely the drift this project keeps
   paying for. */
function bookNoteKey(slug, n){ return 'book:'+slug+':'+noteHash((n.ts||'')+'|'+(n.text||'')); }
/* ONE FIELD MEANS ONE THING: `slug` is "which book is this note about",
   whatever kind of note it is.

   Before 2026-08-07 only source:'book' notes carried it, and the Notes Log's
   book filter (`n.slug !== v.book`) reads exactly that field — so filtering by
   a book silently DROPPED every My Note linked to it, including the ✨ AI
   notes the reader itself writes there (`note.book = {slug, page, chapter}`).
   The one question the book row exists to answer was answering it short, and
   the count on the chip was short by the same amount, so nothing looked wrong.

   A note's link to a book is written two ways for good reason — a book note is
   OF a page, a My Note is ABOUT a book and keeps page/chapter beside the slug —
   and old saves may carry a bare string. This normalises all three at the one
   place that already exists to put notes in one shape. */
function bookSlugOf(link){
  if(!link) return null;
  if(typeof link==='string') return link;
  return link.slug||null;
}
/* WHERE IN THE BOOK, IN ONE BASE.

   A book note's `page` is 0-BASED (it indexes the paginated text and is shown
   as page+1). A My Note's link records `book.page` 1-BASED, because it was
   written from what the reader displayed. Both are correct where they live and
   they must not both be called `page`.

   Until 2026-08-07 the Notes Log only ever read the book-note fields, so a My
   Note about page 12 of chapter 2 was grouped under "No page — from the
   summary" and its card said "from the summary" — about a note that knew
   exactly where it was. Seen in a screenshot, and deliberately NOT fixed that
   morning: hoisting the number without converting the base would have put a
   WRONG page on a note, and a note gets cited. Rule 6 — record it, then do it
   properly.

   So the conversion happens once, here, beside bookSlugOf(), and everything
   downstream keeps reading one 0-based `page`. */
function bookPageOf(link){
  if(!link || typeof link!=='object') return undefined;
  const p=Number(link.page);
  return Number.isFinite(p) && p>=1 ? p-1 : undefined;   // 1-based in, 0-based out
}
function bookChapterOf(link){
  if(!link || typeof link!=='object') return undefined;
  const c=Number(link.chapter);
  return Number.isFinite(c) ? c : undefined;
}
function gatherNotes(){
  const out=[];
  for(const n of (data.notes||[]))
    out.push({source:'mynotes', icon:'📓', where:'My Notes', title:n.title||'Untitled note', text:n.body||'', date:n.updated||n.created||'', key:'mynotes:'+n.id, id:n.id, book:n.book||null, slug:bookSlugOf(n.book), ch:bookChapterOf(n.book), page:bookPageOf(n.book)});
  const titleFor={}; try{ Store.allDocs().forEach(d=>{ titleFor[d.slug]=d.title; }); }catch(e){}
  for(const slug of Object.keys(data.bookNotes||{})){
    const bookTitle=titleFor[slug]||slug;
    /* THE NOTE'S OWN WORDS ARE ITS TITLE. Reported 2026-08-03 as "where can I
       see the notes and for which book": they were all here, and twenty notes
       on one book rendered as twenty identical rows saying "The Dhammapada",
       because `title` was the BOOK's title. Unscannable, and A–Z sorting was
       meaningless. The book is already named on the `where` line right below,
       so it never needed to be the title too. An AI-written note keeps its
       ✨ label as the heading, which is the one case where the first line
       genuinely is the better name. */
    (data.bookNotes[slug]||[]).forEach(n=>{
      const body=(n.text||'').trim();
      const first=body.split('\n')[0].trim();
      const title=(first.length>2 ? first : body).slice(0,72) || 'A note';
      /* `book` stays {slug} only: renderNotesLogList's bookChip shares this
         field with My Notes, whose page is 1-BASED, and a book note's is
         0-based. The page is already on the `where` line below. */
      /* WHO WROTE IT TRAVELS WITH IT. This is the pool every resident
         searches, and until 2026-08-09 it dropped attribution entirely at
         exactly the point a note is handed to a model. AI notes STAY in the
         pool — the steward's call, and the right one — they arrive labelled.
         `by` is read-time backfilled for the 415 books' worth that predate
         the field; nothing is rewritten. */
      out.push({source:'book', icon:'📖', book:{slug},
        slug, bookTitle, ch:n.ch, chLabel:n.chLabel, page:n.page,
        where:'Book · '+bookTitle+(n.ch!==undefined?' · ch. '+n.ch:'')+(n.page!==undefined?' · p.'+(n.page+1):''),
        title, text:body, date:n.ts||'',
        by:attributionOf(n), author:authorOf(n), ai:isAiNote(n),
        key:bookNoteKey(slug,n)});
    });
  }
  for(const agent of Object.keys(data.chatNotes||{})){
    const text=(data.chatNotes[agent]||'').trim(); if(!text) continue;
    const label=(CHAT_AGENTS[agent]&&CHAT_AGENTS[agent].label)||agent;
    out.push({source:'chat', icon:AGENT_AVATAR[agent]||'💬', where:'Conversation · '+label, title:label, text, date:'', key:'chat:'+agent});
  }
  for(const p of (data.workshop.research||[]))
    (p.notes||[]).forEach(n=>
      out.push({source:'research', icon:'🔬', where:'Research · '+p.title, title:p.title, text:n.text||'', date:n.ts||'', key:'research:'+p.id+':'+noteHash((n.ts||'')+'|'+(n.text||''))}));
  for(const p of (data.grantProjects||[]))
    (p.documents||[]).forEach(n=>
      out.push({source:'grant', icon:'📝', where:'Grant · '+p.title, title:n.label||p.title, text:n.text||'', date:n.ts||'', key:'grant:'+p.id+':'+noteHash((n.ts||'')+'|'+(n.label||'')+'|'+(n.text||''))}));
  return sortNotes(out, (state.notesLogView&&state.notesLogView.sort)||'newest');
}
/* Sorting belongs in the interface, not in a settings page — asked for
   2026-07-28: "I want to be able to go into notes and sort them." Four orders,
   because those are the four questions people actually have of a pile of notes:
   what did I just write, what have I been carrying longest, what came from
   where, and where is the one called X. */
function sortNotes(list, how){
  const byDate=(a,b)=>(b.date||'').localeCompare(a.date||'');
  if(how==='oldest') return list.slice().sort((a,b)=>(a.date||'zzzz').localeCompare(b.date||'zzzz'));
  if(how==='title') return list.slice().sort((a,b)=>String(a.title||'').localeCompare(String(b.title||'')));
  if(how==='source') return list.slice().sort((a,b)=>
    String(a.where||'').localeCompare(String(b.where||'')) || byDate(a,b));
  return list.slice().sort(byDate); // newest first; undated (chat) sink to the bottom
}
export function setNotesLogSort(how){ state.notesLogView.sort=how; state.notesLogView.expanded=null; renderNotesLog(); }
/* "Show me everything I wrote about THIS book" (#42) — opened from the reader,
   which is where the question is actually asked. Deliberately NOT the Records
   Hall: that room is the project's memory, and reading notes are the
   visitor's. */
export function openNotesForBook(slug){
  state.notesLogView=state.notesLogView||{source:'all',folder:'all',q:'',expanded:null};
  /* SOURCE STAYS 'all', AND THE BOOK IS THE WHOLE QUESTION.
     This pinned source:'book' until 2026-08-07, which is a second filter
     nobody asked for: "everything I wrote about this book" then meant "every
     note I wrote INSIDE this book", silently excluding My Notes linked to it
     — including the ✨ notes the reader itself files there. The two are
     different axes (where a note was written vs which book it is about) and
     collapsing them answered a narrower question under the wider one's name.
     The source chips are still right there if you want to narrow it. */
  Object.assign(state.notesLogView, {source:'all', book:slug||null, folder:'all', q:'', expanded:null});
  state.notesLogEdit=null;
  state.ui='notesLog'; hideAllOv(); renderNotesLog(); showOv('notesLogOv');
}
export function setNotesLogBook(slug){
  state.notesLogView.book = slug||null;
  state.notesLogView.expanded=null;
  renderNotesLog();
}
/* One press to put a note in the backpack, and one to set it down. The label
   flips rather than a second button appearing, so the card never grows a row
   of near-identical controls. */
export function carryNote(key){
  const n = gatherNotes().find(x => x.key === key);
  if(!n){ showToast('That note is no longer there.'); return; }
  if(isCarrying(carryList(),'note',key)){
    data.carrying = setDown(carryList(),'note',key); persist();
    showToast('Set down. It is still exactly where it lives.');
  } else {
    const r = pickUp(carryList(), {kind:'note', ref:key,
      label:(n.title||'A note').slice(0,80)}, todayKey());
    if(!r.ok){ showToast(r.reason); return; }
    data.carrying = r.list; persist();
    showToast('In your backpack — it will be beside the part it belongs to at the Study Table.');
  }
  renderNotesLog();
}
export function openNotesLog(focusKey){
  state.notesLogView=state.notesLogView||{source:'all',folder:'all',q:'',expanded:null};
  if(!state.notesLogView.folder) state.notesLogView.folder='all';
  state.notesLogView.book=null;   // the general door shows everything
  /* Arriving from Today's "worth another look?" — clear the filters so the note
     is definitely visible, open it, and mark it seen, since it has now actually
     been read rather than merely listed. */
  if(focusKey){
    state.notesLogView.source='all'; state.notesLogView.folder='all'; state.notesLogView.q='';
    state.notesLogView.expanded=focusKey;
    markNoteSeen(focusKey);
  }
  state.notesLogEdit=null; // always land on the list, never a stale editor
  state.ui='notesLog'; hideAllOv(); renderNotesLog(); showOv('notesLogOv');
}
/* Listen while you jot: open Your Notes from the Reader WITHOUT stopping the
   read-aloud (opening the log never calls stopSpeaking), remembering the book so
   a banner can bring you back. The audio genuinely keeps playing while you
   write — the "pocket a book like the phone" feel, for notes. */
export function openNotesWhileListening(){
  state.audioReturnSlug = state.currentDoc || null;
  openNotesLog();
}
export function returnToBook(){
  const slug=state.audioReturnSlug; state.audioReturnSlug=null;
  if(slug) openReader(slug);
}
function notesLogFiltered(){
  const v=state.notesLogView, q=v.q.trim().toLowerCase();
  /* Only trust the index if it answered THIS question — the term is carried
     with the keys so a stale set from the previous keystroke can never widen
     the wrong search. */
  const fts = (v.fts && v.fts.term === v.q.trim()) ? v.fts.keys : null;
  return gatherNotes().filter(n=>{
    if(v.source!=='all' && n.source!==v.source) return false;
    // "everything I wrote about THIS book" (#42) — the one question the hub
    // could not answer, now that every gathered book note carries its slug.
    if(v.book && n.slug!==v.book) return false;
    const folder=noteFolderOf(n.key);
    if(v.folder==='__unfiled'){ if(folder) return false; }
    else if(v.folder && v.folder!=='all'){ if(folder!==v.folder) return false; }
    if(q){
      const hay=(n.title+' '+n.text+' '+n.where+' '+noteTagsOf(n.key).join(' ')).toLowerCase();
      // substring OR the index — the index knows word forms the substring
      // cannot see, and every other filter above still applies to both
      if(!hay.includes(q) && !(fts && fts.has(n.key))) return false;
    }
    return true;
  });
}
/* Your Notes is a real workspace now, not just a filtered view: you can start a
   note here and edit it inline (renderNotesLogEditor), the same data.notes a
   note at the Writing Desk uses. "make a new one at the note table" — one home
   for notes, reachable from either door. */
export function createNoteInLog(){
  const note={id:newNoteId(), title:'Untitled note', body:'', created:todayKey(), updated:todayKey()};
  data.notes.unshift(note); persist(); logActivity('Started a new note.'); awardBadge('first-note');
  state.notesLogEdit=note.id; renderNotesLog();
}
export function editNoteInLog(id){ state.notesLogEdit=id; renderNotesLog(); }
export function closeNotesLogEditor(){ state.notesLogEdit=null; renderNotesLog(); }
export function deleteNoteFromLog(id){
  const note=data.notes.find(n=>n.id===id); if(!note) return;
  if(!window.confirm('Delete "'+(note.title||'Untitled note')+'"? This cannot be undone.')) return;
  data.notes=data.notes.filter(n=>n.id!==id); persist(); state.notesLogEdit=null; renderNotesLog();
}
function renderNotesLogEditor(note){
  document.getElementById('notesLogPanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <div class="row" style="justify-content:space-between;margin-bottom:8px">
      <button class="btn ghost" onclick="closeNotesLogEditor()">← All notes</button>
      <button class="btn ghost" style="border-color:#b56f6f;color:#e0a0a0" onclick="deleteNoteFromLog('${note.id}')">✕ Delete</button>
    </div>
    <input type="text" id="noteTitleInput" placeholder="Note title" value="${esc(note.title)}"
      oninput="updateNoteField('${note.id}','title',this.value)">
    <textarea id="noteBodyInput" rows="9" style="margin-top:8px" placeholder="Write here…"
      oninput="updateNoteField('${note.id}','body',this.value)">${esc(note.body)}</textarea>
    <div class="meta" id="noteSaved" style="margin-top:6px"></div>
    ${noteToolsHtml(note)}
    ${noteBookLinkHtml(note)}
    ${noteLogHtml(note)}`;
}
function renderNotesLog(){
  // editing one of My Notes inline — the workspace, not the gathered list
  if(state.notesLogEdit){
    const note=data.notes.find(n=>n.id===state.notesLogEdit);
    if(note){ renderNotesLogEditor(note); return; }
    state.notesLogEdit=null;
  }
  const v=state.notesLogView, all=gatherNotes();
  const counts={all:all.length}; all.forEach(n=>{ counts[n.source]=(counts[n.source]||0)+1; });
  const chips=NOTE_SOURCES.map(s=>{
    const active=v.source===s.id;
    return `<button class="btn ghost" onclick="setNotesLogSource('${s.id}')" style="margin:0 6px 6px 0;padding:5px 10px;font-size:12px${active?';background:#e0a43c;color:#2a2118':''}">${s.icon} ${s.label}${counts[s.id]?' · '+counts[s.id]:''}</button>`;
  }).join('');
  // folder row — folders exist because a note is filed in one; a content-safe
  // name (no quotes) is enforced on creation so it's safe in these handlers.
  const folders=allFolders();
  const unfiled=all.filter(n=>!noteFolderOf(n.key)).length;
  const folderRow = folders.length ? '<div style="margin-bottom:8px">'+
    [{id:'all',label:'📁 All folders'}, ...folders.map(f=>({id:f,label:'📁 '+f})), {id:'__unfiled',label:'📂 Unfiled'+(unfiled?' · '+unfiled:'')}]
      .map(fc=>{ const active=v.folder===fc.id; return `<button class="btn ghost" onclick="setNotesLogFolder('${fc.id}')" style="margin:0 6px 6px 0;padding:5px 10px;font-size:12px${active?';background:#7fa3c7;color:#2a2118':''}">${esc(fc.label)}</button>`; }).join('')
    +'</div>' : '';
  /* THE BOOK ROW (#42). Shown only where it is the question being asked —
     with the Books filter on, or already narrowed to one — so the general
     view does not grow a fourth row of chips nobody pressed for. */
  const books=[];
  // Any note that names a book, not only the ones written IN one — otherwise
  // the chip's count disagrees with the list the chip opens. See bookSlugOf().
  all.forEach(n=>{ if(n.slug){
    const hit=books.find(b=>b.slug===n.slug);
    if(hit) hit.n++;
    // A My Note carries no bookTitle — it links by slug — so look it up.
    else { let t=n.bookTitle; if(!t){ try{ const d=Store.getDoc(n.slug); t=d&&d.title; }catch(e){} }
           books.push({slug:n.slug, title:t||n.slug, n:1}); }
  }});
  books.sort((a,b)=>b.n-a.n || String(a.title).localeCompare(b.title));
  const bookRow = (v.source==='book' || v.book) && books.length
    ? '<div style="margin-bottom:8px">'+
      [{slug:'', label:'📚 Every book'}, ...books.map(b=>({slug:b.slug, label:'📖 '+b.title+' · '+b.n}))]
        .map(bc=>{ const active=(v.book||'')===bc.slug;
          return `<button class="btn ghost" onclick="setNotesLogBook('${esc(bc.slug)}')" style="margin:0 6px 6px 0;padding:5px 10px;font-size:12px${active?';background:#8fb4d9;color:#2a2118':''}">${esc(bc.label)}</button>`; }).join('')
      +'</div>' : '';
  // Sebastian only gets handed one folder at a time, on purpose — "there when
  // needed, never swarmed with data he doesn't need."
  const sebBtn = (v.folder && v.folder!=='all' && v.folder!=='__unfiled')
    ? `<button class="btn ghost" onclick="askSebastianReviewFolder()" style="margin-bottom:10px;border-color:#7fa3c7;color:#a9c7e8">🎩 Ask Sebastian to tidy this folder</button>` : '';
  // "Listen while you jot" — came here from a book (openNotesWhileListening) with
  // the read-aloud still going; a tap-to-return banner so the audio isn't a dead
  // end. Audio keeps playing because opening this log never stops it.
  const returnDoc = state.audioReturnSlug ? Store.getDoc(state.audioReturnSlug) : null;
  const listenBanner = returnDoc
    ? `<div class="card" style="cursor:pointer;border-color:#8fb4d9;margin-bottom:10px" onclick="returnToBook()">
        <div class="t">${isSpeaking()?'🔊 Still reading':'📖'} ${esc(returnDoc.title)} — ▸ back to the book</div>
        <div class="s">Jot whatever you like here — ${isSpeaking()?'it keeps reading aloud while you do':'your book is waiting'}. Tap to return.</div>
      </div>` : '';
  document.getElementById('notesLogPanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>🗒 Your Notes ${visBadge('private')}<button class="btn ghost" style="font-size:11px;padding:2px 8px;margin-left:6px" onclick="openCommonsTable()" title="Share one at the Commons Table, in the Cafe">🤝 share one</button></h2>
    <div class="meta">Every note you've written, gathered in one place. Start a fresh one here with
      <b>＋ New note</b> (it's a My Note — writable, linkable to a book), or open any note to file it in
      a folder, add tags, or (for your own notes) edit it. Notes from books, chats, and desks stay
      living where they are; this is the one place they all meet.</div>
    <div class="row" style="margin:2px 0 10px"><button class="btn" onclick="createNoteInLog()">＋ New note</button></div>
    ${listenBanner}
    <input type="text" id="notesLogSearch" placeholder="Search notes and tags…" value="${esc(v.q)}"
      oninput="setNotesLogSearch(this.value)" style="margin-bottom:10px">
    <div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap;align-items:center">
      <span class="meta" style="margin:0">Sort:</span>
      ${[['newest','Newest'],['oldest','Oldest'],['source','By where it came from'],['title','A–Z']]
        .map(([k,label])=>`<button class="btn ${(v.sort||'newest')===k?'':'ghost'}" style="font-size:11px;padding:3px 10px" onclick="setNotesLogSort('${k}')">${label}</button>`).join('')}
    </div>
    <div style="margin-bottom:6px">${chips}</div>
    ${bookRow}${folderRow}${sebBtn}
    <div id="notesLogList"></div>`;
  renderNotesLogList();
  const inp=document.getElementById('notesLogSearch');
  if(inp && v.q){ inp.focus(); inp.setSelectionRange(inp.value.length,inp.value.length); }
}
/* NOTE_SELECT_STYLE moved to ui/dom.js — the Learning Tree needs it too. */
function renderNotesLogList(){
  const el=document.getElementById('notesLogList'); if(!el) return;
  const v=state.notesLogView, folders=allFolders();
  let list=notesLogFiltered();
  /* SAY WHEN THE INDEX EARNED ITS KEEP. A search that quietly returns more
     than it should is indistinguishable from a search that is wrong, and the
     visitor has no way to tell that "walking" found "walked" on purpose. Only
     shown when the index actually added something a plain match missed —
     otherwise it is noise on every keystroke. */
  let ftsLine = '';
  if(v.fts && v.fts.term === v.q.trim() && v.fts.keys.size){
    const q = v.q.trim().toLowerCase();
    const extra = list.filter(n =>
      v.fts.keys.has(n.key) &&
      !(n.title+' '+n.text+' '+n.where).toLowerCase().includes(q)).length;
    if(extra) ftsLine = `<div class="meta" style="margin:-4px 0 8px;color:#8fbf8f">`
      + `＋${extra} found by meaning as well as spelling — related word forms, not just “${esc(v.q.trim())}”.</div>`;
  }
  if(!list.length){ el.innerHTML='<p style="color:#9c8b74">No notes here yet. Anything you write — beside a book, in a conversation, or at a desk — will gather here.</p>'; return; }
  el.dataset.fts = ftsLine ? '1' : '';
  /* Narrowed to ONE book, the useful order is the BOOK's, not the diary's:
     notes follow the text, grouped under the chapter they were taken in.
     That is what makes "everything I wrote about this book" a re-readable
     thing rather than a pile. Undated position (a note from the summary
     view) sorts last, since it belongs to no page. */
  const byBook = !!v.book;
  const pos=(n,f)=>n[f]===undefined ? 1e9 : n[f];   // no chapter/page: it belongs after the text
  if(byBook) list=list.slice().sort((a,b)=>
    pos(a,'ch')-pos(b,'ch') || pos(a,'page')-pos(b,'page') || String(a.date||'').localeCompare(String(b.date||'')));
  let lastCh;
  el.innerHTML=ftsLine+list.map(n=>{
    let header='';
    if(byBook && n.ch!==lastCh){
      lastCh=n.ch;
      const name = n.ch===undefined ? 'No page — from the summary' : (n.chLabel || 'Chapter '+n.ch);
      header=`<div class="meta" style="margin:12px 0 4px;border-bottom:1px solid #55432e;padding-bottom:3px">${esc(name)}</div>`;
    }
    return header+notesLogCard(n, v, folders);
  }).join('');
}
function notesLogCard(n, v, folders){
  {
    const open=v.expanded===n.key, folder=noteFolderOf(n.key), tags=noteTagsOf(n.key);
    /* A short note's TITLE is its own first line (see gatherNotes), so printing
       the body underneath repeated the note twice on every card. Say it once. */
    const dupTitle = n.text && n.text.trim()===String(n.title||'').trim();
    const body = dupTitle ? ''
      : n.text ? (n.text.length>140 && !open ? esc(n.text.slice(0,140))+'…' : esc(n.text))
      : '<i>(empty)</i>';
    /* Already narrowed to one book: the chip and the "Book · <title>" prefix
       are both just the heading again, three times on one card. */
    const narrowed = v.book && n.slug===v.book;
    const bookChip = (n.book && !narrowed) ? `<span class="badge" style="border-color:#7fa3c7;color:#a9c7e8">📖 ${esc((Store.getDoc(n.book.slug)||{}).title||'linked')}${n.book.page?' · p.'+n.book.page:''}</span>` : '';
    const where = narrowed
      ? (n.page!==undefined ? 'page '+(n.page+1) : 'from the summary')
      : n.where;
    const badges=`${folder?`<span class="badge" style="border-color:#7fa3c7;color:#a9c7e8">📁 ${esc(folder)}</span>`:''}${bookChip}${reachBadge(n.key)}${tags.map(t=>`<span class="badge lic">#${esc(t)}</span>`).join('')}`;
    // My Notes are editable right here (title/body/book link); other sources are
    // shown read-only with a jump to where they actually live to edit them.
    /* The way OUT of a note sits on the card itself, not one level down inside
       the editor. Caught by looking, 2026-08-03: the tree button was there and
       correct, and reaching it meant first pressing a button labelled "Open to
       edit / link a book" — which does not sound like the thing that turns your
       plan into a path. A door nobody can see is not a door. */
    const own = data.notes.find(x=>x.id===n.id);
    const inTree = own && own.lesson && curriculumNode(own.lesson);
    /* TAKE IT TO THE MONK. Asked for 2026-08-03: "the monk can help with
       spiritual things and dhamma talks — at the very least we should be able
       to take our notes to him and have a discussion on the Dao."

       Every door on this card so far turns a note into another ARTIFACT — a
       plan, a lesson, a dissection. None of them let you simply talk it over,
       which is the oldest way anyone has ever worked out what they think.
       Offered on every source, because a note is a note; hidden with no AI,
       because a button that cannot answer is worse than no button. */
    /* CARRY IT. Added 2026-08-07, and it closes a gap I made the same day:
       the Study Table's tray renders notes you have brought and there was NO
       WAY TO BRING ONE. A surface that displays something nothing can produce
       is a dead feature, which is the exact shape this project keeps finding.

       Only for notes that name a book, because that is where a carried note
       is USEFUL — the table shows it beside the part it belongs to, and a
       note about nothing in particular would just be luggage. */
    const held = isCarrying(carryList(), 'note', n.key);
    const carryBtn = n.slug
      ? `<button class="btn ghost" style="font-size:11px" onclick="carryNote('${jsq(n.key)}')"
          title="${held ? 'On the Study Table beside the part it belongs to' : 'Bring it to the Study Table, and to a resident you ask'}"
          >${held ? '🎒 Carrying' : '🎒 Take with you'}</button>`
      : '';
    const monkBtn = isAIActive()
      ? `<button class="btn ghost" style="font-size:11px" onclick="talkToMonkAboutNote('${jsq(n.key)}')"
          title="Sit with the Mountain Monk in the Keep and talk this one over">🧘 Talk it over with the Monk</button>`
      : '';
    const editRow = (open && n.source==='mynotes')
      ? `<div class="row" onclick="event.stopPropagation()" style="margin-top:10px;gap:6px;flex-wrap:wrap">
          <button class="btn" style="font-size:11px" onclick="editNoteInLog('${n.id}')">✏ Open to edit / link a book</button>
          ${inTree
            ? `<button class="btn ghost" style="font-size:11px" onclick="openLessonFromNote('${n.id}')">🌳 It’s in the tree — open it</button>`
            : `<button class="btn ghost" style="font-size:11px" onclick="lessonFromPlanNote('${n.id}','notesLogMsg')" title="Turn this note into a lesson you can tick off and pick up">🌳 Put this in the tree</button>`}
          ${carryBtn}
          ${monkBtn}
        </div><div class="meta" id="notesLogMsg" style="margin:6px 0 0"></div>`
      /* A BOOK NOTE HAD NOWHERE TO GO. Reported 2026-08-03 from real use:
         "with note taking I played around with it but I'm lacking direction in
         what I can do there." Measured, it was not vague at all — beside a book
         note in the reader there was ONE door, and opened here in Your Notes
         there were NONE. A My Note on this very panel offered two.

         So you could gather every note you had written about a book, grouped
         under its real chapters, and then do nothing with any of them.

         All four below already existed somewhere else; none of this is new
         machinery. That is the point — the study chain was built for exactly
         this and book notes were simply never wired into it. */
      : (open && n.source==='book' && n.slug)
      ? `<div class="row" onclick="event.stopPropagation()" style="margin-top:10px;gap:6px;flex-wrap:wrap">
          <button class="btn" style="font-size:11px" onclick="openBookAtNote('${esc(n.key)}')"
            title="${n.page!==undefined?'Go to the exact page this was written on':'Open the book'}">📖 Open the book${n.page!==undefined?' here':''}</button>
          <button class="btn ghost" style="font-size:11px" onclick="bookNoteToToday('${esc(n.key)}')"
            title="Put it on today's plan, the way the reader already can">→ Bring to today's plan</button>
          <button class="btn ghost" style="font-size:11px" onclick="bookNoteToLesson('${esc(n.key)}')"
            title="Turn this into a lesson you can walk and tick off">🌳 Put this in the tree</button>
          <button class="btn ghost" style="font-size:11px" onclick="bookNoteToDissection('${esc(n.key)}')"
            title="A note is often where an investigation starts">🔬 Dissect this book</button>
          ${carryBtn}
          ${monkBtn}
        </div><div class="meta" id="notesLogMsg" style="margin:6px 0 0"></div>`
      /* Notes from a conversation, a research project or a grant have no
         artifact door of their own — they must still not be a dead end. */
      : (open && monkBtn)
      ? `<div class="row" onclick="event.stopPropagation()" style="margin-top:10px;gap:6px;flex-wrap:wrap">${monkBtn}</div>`
      : '';
    // folder + tag editors live only in the expanded view, and stop their own
    // clicks so fiddling with them doesn't collapse the card.
    const controls = open ? `${editRow}<div onclick="event.stopPropagation()" style="margin-top:10px;border-top:1px solid #55432e;padding-top:9px">
        <label style="margin:0 0 4px">Folder</label>
        <select onchange="assignNoteFolder('${n.key}',this.value)" style="${NOTE_SELECT_STYLE}">
          <option value=""${folder?'':' selected'}>Unfiled</option>
          ${folders.map(f=>`<option${f===folder?' selected':''}>${esc(f)}</option>`).join('')}
          <option value="__new">＋ New folder…</option>
        </select>
        <label style="margin:8px 0 4px">Tags</label>
        <input type="text" value="${esc(tags.join(', '))}" placeholder="comma, separated, tags" onchange="setNoteTags('${n.key}',this.value)">
        ${reachRow(n.key)}
      </div>` : '';
    return `<div class="card" onclick="toggleNotesLogItem('${n.key}')">
      <div class="t">${n.icon} ${esc(n.title)}${n.date?` <span class="badge lic">${esc(n.date)}</span>`:''}</div>
      <div class="s" style="color:#9c8b74;font-size:11px">${esc(where)}</div>
      ${badges?`<div style="margin:4px 0">${badges}</div>`:''}
      ${body?`<div class="s" style="white-space:pre-wrap${open?'':';max-height:3.6em;overflow:hidden'}">${body}</div>`:''}
      ${controls}
    </div>`;
  }
}
export { sortNotes };
export function setNotesLogSource(id){ state.notesLogView.source=id; state.notesLogView.expanded=null; renderNotesLog(); }
export function setNotesLogFolder(id){ state.notesLogView.folder=id; state.notesLogView.expanded=null; renderNotesLog(); }
export function setNotesLogSearch(val){
  state.notesLogView.q=val; state.notesLogView.expanded=null;
  state.notesLogView.fts=null;            // the old answer is not this question's
  renderNotesLogList();
  askTheIndex(val);                       // and see if the database knows more
}

/* THE ONE THING localStorage CANNOT DO. The filter below is a substring
   match, and it always runs — it is what a browser tab has and it is honest.
   What it cannot do is find "walked" when you typed "walking", or rank a
   hundred hits by how well they match.

   So the database WIDENS the existing filter rather than replacing it: it
   returns the keys of notes that match by meaning, and a note is shown if
   EITHER test passes. One filter, two inputs — not two searches whose answers
   could disagree.

   Debounced, because this runs on every keystroke and a sync rides in front
   of it. `seq` guards against an early query answering after a later one and
   putting stale results on screen. */
let ftsSeq = 0, ftsTimer = null;
function askTheIndex(q){
  if(!(Store.dbAvailable && Store.dbAvailable())) return;
  clearTimeout(ftsTimer);
  const term = String(q||'').trim();
  if(term.length < 2) return;
  const mine = ++ftsSeq;
  ftsTimer = setTimeout(async () => {
    // The index is only as fresh as the last sync, and a note written a
    // moment ago must be findable now. Cheap: one transaction.
    try { await Store.syncNotes(gatherNotes()); } catch(e){ /* stale, not broken */ }
    const rows = await Store.dbQuery('searchNotes', [term, 200]);
    if(mine !== ftsSeq || !rows) return;          // a newer query already ran
    const keys = new Set(rows.map(r => r.save_key).filter(Boolean));
    state.notesLogView.fts = { term, keys, n: rows.length };
    renderNotesLogList();
  }, 180);
}
/* ----- ASK A RESIDENT TO SEARCH YOUR NOTES -----

   groundingPlan(q, carrying, {searchMyNotes:true}) was written, tested and
   documented on 2026-08-07 and had NO CALLER.

   ⚠ AND THIS COMMENT SAID "THIS IS IT" FOR TWO DAYS WHILE THE BODY BELOW
   RE-IMPLEMENTED THE DECISION BY HAND — corrected 2026-08-10. It called
   lookupTerms() itself and searched notes because a boolean parameter said the
   visitor had asked; the plan was never consulted, so lookup.js's claim that
   "the caller performs exactly this and nothing else" was true of nothing. A
   comment is not a call site, and this file has now supplied the counterexample
   twice (see also groundingFor, chatOptsFor).

   Fixed the only way that stays fixed: the plan is asked, and if it does not
   return `note` in `search`, NOTHING IS SEARCHED. Change lookup.js and this
   feature changes with it, whether or not anybody remembers this function.

   Everything that makes it legitimate happens here rather than in a prompt:
   the visitor pressed a button (sendChatMessage's `opts.searchMyNotes`), the
   seal is honoured, what was found is SHOWN, and what was found goes into the
   backpack so the next question can build on it. A search that fed a model
   privately and left no trace would be exactly the invisible grounding the
   carrying plan rules out.

   Returns null when there is no database — the caller shows a locked control
   rather than a quieter search wearing the same label. */
async function searchMyNotesFor(q){
  if(!(Store.dbAvailable && Store.dbAvailable())) return null;
  /* THE QUESTION IS NOT THE QUERY, and getting this wrong made the whole
     feature return nothing (found 2026-08-08 by test/live/note-search.cjs,
     which is the only place it COULD be found — a browser has no database to
     be wrong against).

     `searchNotes` uses websearch_to_tsquery, which ANDs every word. Handed
     "what did I write about walking?" it demands a note containing what AND
     did AND write AND about AND walking, and returns nothing — for almost
     every question a person would actually type. Measured: "walking" → 2
     rows, the whole question → 0.

     groundingPlan() is where the terms now come from — it uses the same shared
     lookupTerms() extractor libraryLookupBlock reaches through, so both halves
     of the pathway still search the identical thing. Joining with OR asks the
     question a person means: "notes about any of these". */
  const plan=groundingPlan(q, carryList(), { searchMyNotes:true, noteReach:(data&&data.noteReach)||{} });
  /* THE PLAN IS THE PERMISSION. Not `searchMyNotes:true` on its own — that is
     what was asked for, and this is what lookup.js allows in return. Break this
     on purpose by making groundingPlan drop 'note' from `search`: the button
     goes quiet, which is the whole point of the boundary living in one file. */
  if(!plan.search.includes('note')) return null;
  const terms=plan.terms;
  if(!terms.length) return null;
  const term=terms.join(' OR ');
  // the index is only as fresh as the last sync, and a note written a moment
  // ago must be findable now — the same one transaction askTheIndex pays for
  try{ await Store.syncNotes(gatherNotes()); }catch(e){ /* stale, not broken */ }
  const rows=await Store.dbQuery('searchNotes',[term, 8]);
  if(!rows) return null;
  const all=gatherNotes();
  const hits=[], sealed=[];
  for(const r of rows){
    /* THE SAVE OWNS THE NOTE; the index only points at it. A row that will not
       resolve is dropped rather than shown, because there is nothing to open,
       carry or verify — a hit you cannot reach is the dead end this project
       keeps removing. */
    const n=all.find(x=>x.key===r.save_key);
    if(!n) continue;
    if(!mayReachNote(data.noteReach, n.key, {asked:true})){ sealed.push(n); continue; }
    hits.push(n);
  }
  /* WHAT IT FOUND GOES INTO THE BACKPACK — the steward's call, and it is what
     makes the search a way of FILLING the bag rather than a private channel
     around it. Only the top few: the bag is the model's context now, so one
     search taking a quarter of it would re-create the very bug the bag exists
     to prevent. The rest are listed with a 🎒 each. */
  const carriedNow=[], shelved=[];
  for(const n of hits.slice(0,3)){
    if(isCarrying(carryList(),'note',n.key)) continue;
    const r=pickUp(carryList(), {kind:'note', ref:n.key, label:String(n.title||'note').slice(0,80)}, todayKey());
    if(r.ok){ data.carrying=r.list; carriedNow.push(n); }
    else if(r.canSetAside){
      // a full bag is a redirection, never a wall — carrying.js says so
      const s=setAside(carryList(), {kind:'note', ref:n.key, label:String(n.title||'note').slice(0,80)}, todayKey());
      if(s.ok){ data.carrying=s.list; shelved.push(n); }
    }
  }
  if(carriedNow.length || shelved.length) persist();
  /* `shown` is what the person reads, `term` is what the database was asked.
     They differ, so the receipt must not print the raw OR-query at someone —
     "walking OR patience" is the machine's sentence, not theirs. */
  return { term, shown:terms.join(', '), hits, sealed, carried:carriedNow, shelved, offered:hits.slice(3) };
}
export function toggleNotesLogItem(key){
  const v=state.notesLogView;
  v.expanded = v.expanded===key ? null : key;
  if(v.expanded===key) markNoteSeen(key);   // opened, therefore actually read
  renderNotesLogList();
}
/* ----- WHAT A BOOK NOTE CAN BECOME -----
   Added 2026-08-03. Each of these is a door the note already deserved; the
   work is finding the note again from its gathered `key` (source:slug:hash),
   because the hub deliberately does not carry the raw save object around. */
function bookNoteFromKey(key){
  const parts=String(key||'').split(':');
  if(parts[0]!=='book') return null;
  const slug=parts[1];
  const list=data.bookNotes[slug]||[];
  const n=gatherNotes().find(x=>x.key===key);
  if(!n) return null;
  const i=list.findIndex(x=>(x.text||'').trim()===String(n.text||'').trim());
  return { slug, note:list[i], index:i, gathered:n };
}
/* The one nothing did before: a note knows its chapter and page, so it can
   put you back exactly where you wrote it. */
export async function openBookAtNote(key){
  const f=bookNoteFromKey(key); if(!f) return;
  const d=Store.getDoc(f.slug); if(!d) return;
  closeUI();
  openReader(f.slug);
  const page=f.note && f.note.page;
  if(page!==undefined && d.doc.fullText){
    await openFullText(f.slug);
    const v=state.fullTextView;
    if(v){ v.page=Math.max(0, Math.min(v.pages.length-1, page)); renderFullTextPage(); }
  }
}
export function bookNoteToToday(key){
  const f=bookNoteFromKey(key); if(!f||f.index<0) return;
  sendNoteToToday(f.slug, f.index);
  const el=document.getElementById('notesLogMsg');
  if(el) el.textContent='✓ It is on today’s plan.';
}
/* A book note becomes a My Note first, because that is what the tree takes —
   and it keeps the book link, so the lesson knows where it came from. */
export function bookNoteToLesson(key){
  const f=bookNoteFromKey(key); if(!f||!f.note) return;
  const d=Store.getDoc(f.slug);
  const body=String(f.note.text||'').replace(/^✨[^\n]*\n/,'');   // drop an AI label if present
  const note={ id:newNoteId(),
    title:(body.split('\n')[0]||'A note').slice(0,72),
    body, created:todayKey(), updated:todayKey(),
    book:{ slug:f.slug, page:(f.note.page!==undefined? f.note.page+1 : null), chapter:f.note.chLabel||null } };
  data.notes.unshift(note); persist();
  logActivity('Carried a note from "'+(d?d.title:f.slug)+'" into Your Notes, on the way to the tree.');
  lessonFromPlanNote(note.id,'notesLogMsg');
}
export function bookNoteToDissection(key){
  const f=bookNoteFromKey(key); if(!f) return;
  closeUI();
  openReader(f.slug);
  dissectBook();
}
export function assignNoteFolder(key, val){
  if(val==='__new'){
    let name=window.prompt('New folder name:'); if(name==null){ renderNotesLogList(); return; }
    name=name.replace(/['"\\]/g,'').trim(); if(!name){ renderNotesLogList(); return; } // keep names handler-safe
    setNoteMeta(key,{folder:name});
  } else setNoteMeta(key,{folder:val||''});
  renderNotesLog(); // the set of folders may have changed
}
export function setNoteTags(key, str){
  const tags=str.split(',').map(t=>t.trim().replace(/^#/,'')).filter(Boolean).slice(0,8);
  setNoteMeta(key,{tags});
  renderNotesLogList();
}
/* Hand Sebastian exactly one folder to look over — scoped grounding on his
   dialog, so he sees only what was asked and nothing else. Cleared naturally
   when the conversation ends (it lives on state.dialog). */
export function askSebastianReviewFolder(){
  const folder=state.notesLogView.folder;
  if(!folder||folder==='all'||folder==='__unfiled') return;
  const notes=gatherNotes().filter(n=>noteFolderOf(n.key)===folder);
  if(!notes.length) return;
  openChatDialog({ name:'SEBASTIAN · Butler', aiAgent:'sebastian', color:'#4a6a8a', glow:'#a9c7e8',
    lines:[`The “${folder}” folder — very good, sir. Let me see what’s gathered here, and what wants tidying.`] });
  state.dialog.review={ folder, notes: notes.map(n=>({where:n.where, title:n.title, text:n.text})) };
  renderChatView();
}

/* ----- First-arrival orientation (BETA-BUILD-PLAN.md §6.5) — the honest
   minimum someone who isn't the builder needs on day one. Auto-shown
   exactly once, only for a genuinely fresh save (see main.js), and
   findable forever after via the title screen's "New here?" button —
   never a recurring popup; the standing automation rule applies to
   orientation the same as everything else. */
export function openWelcome(){
  state.ui='welcome'; hideAllOv();
  document.getElementById('welcomePanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>🧭 Welcome to the Sand Pavilion</h2>
    <div class="meta">A small world you walk around in — a Library with real, readable books, a Study
      for planning your day, a Workshop where a butler helps you run it. It looks like a game because
      a game is a good shape for a place. Everything saves to this device; nothing phones home.</div>
    <h3>Getting around</h3>
    <p><b>Arrows / WASD</b> walk · <b>E</b> talks, reads, fishes · <b>Esc</b> closes anything
      (worst case, you close a panel and try again — nothing here breaks by clicking around) ·
      <b>M</b> to sit for a while.</p>
    <h3>Three doors worth knowing</h3>
    <p><b>The Library</b> — south of the Grounds. Face any shelf, press E, read a whole real book.
      The small case by the reading nook is <b>Your Shelf</b>: books you bring in yourself.<br>
      <b>The Study</b> — through the Library, or its own south door. The Writing Desk plans your day;
      the Course Board holds the long paths.<br>
      <b>The Workshop</b> — east side. Sebastian keeps your calendar there, and the desks
      (Archive, Research, Grants, the Caravan) are where real work happens.</p>
    <h3>Making the residents talk</h3>
    <p>Quill, the Monk, and Sebastian become real conversations once a local AI runs on
      <i>your</i> computer — that's the one piece of real setup here, and it's free. The short
      version: install <b>Ollama</b> (ollama.com), pull a model, and check
      <b>⚙ Manage AI connections</b>. The full walk-through — written for someone who's never
      done anything like it — is the book <i>“How to Complete Your Own Pavilion”</i> on the
      Library's Practice shelf.</p>
    <p class="meta">Skippable, all of it. The Pavilion works with no setup at all — walk, read,
      plan, fish. The AI and the books you add are how it becomes yours.</p>
    <div class="row" style="margin-top:12px">
      <button class="btn" onclick="closeUI()">Enter the Grounds</button>
      <button class="btn ghost" onclick="openConnections()">⚙ Set up an AI connection</button>
    </div>`;
  showOv('welcomeOv');
}

export function returnToTitle(){
  persist();
  state.ui=null; hideAllOv(); stopTyping(); stopSpeaking();
  if(state.dialog) closeDialog();
  document.getElementById('title').style.display='flex';
}
export function resetSave(){
  const sure=window.confirm('Reset all progress on this device? This clears your saved position, '
    +'reading, planner days, courses, AI connections, and Archive Desk entries. This cannot be undone.');
  if(!sure) return;
  Store.reset();
  location.reload();
}

/* ----- Library shelves ----- */
export function shelfTraditionFor(x,y){
  // The basement's two shelves both hold the one tradition kept down
  // there — no row/side math needed for a single-tradition room.
  if(state.scene==='librarybasement') return 'Tantra';
  // second floor — two rows, four blocks: the broader collection
  if(state.scene==='libraryfloor2'){
    const row = y<=4 ? 0 : 1;
    const side = x<8 ? 0 : 1;
    return [['Hindu','Native American'],['Fiction','Non-fiction']][row][side];
  }
  // ground floor — six shelf blocks, three rows deep → six lineages
  const row = y<=4 ? 0 : y<=7 ? 1 : 2;
  const side = x<8 ? 0 : 1;
  return [['Theravada','Mahayana'],['Daoism','Practice'],['Science','Classics']][row][side];
}
const SHELF_HUE={ Theravada:36, Mahayana:275, Daoism:112, Practice:200, Science:8, Classics:150, Personal:46,
  Hindu:20, 'Native American':90, Fiction:315, 'Non-fiction':230, Tantra:330 };
// A real library is ordered. Books on a shelf are sorted alphabetically (leading
// "the/a/an" ignored, the way a librarian shelves), then broken into rows of at
// most SHELF_ROW_MAX so no single shelf runs endlessly — each row captioned with
// its letter range, like a bay in a real stack. Sorting happens once at open, so
// state.shelfDocs IS the ordered list and every index (selectBook/shelfNav) lines
// up with what's shown. (Sort by title for now — a book has no stored author
// field yet; adding one later switches this to by-author, see VISUAL-POLISH-PLAN.)
const SHELF_ROW_MAX = 20;
function shelfSortKey(d){ return String(d.title||'').replace(/^(the|a|an)\s+/i,'').trim().toLowerCase(); }
export function openShelf(tradition){
  state.ui='shelf'; state.shelfTradition=tradition; state.shelfIndex=0; hideAllOv();
  document.getElementById('shelfTitle').textContent = tradition==='Personal' ? 'Shelf · Your Shelf' : 'Shelf · '+tradition;
  // "I see my books in my personal shelf — how do I sort them?" (real use,
  // 2026-07-27). The sorting lived one room away with nothing pointing at it.
  { const row=document.getElementById('shelfSortRow');
    if(row) row.style.display = (tradition==='Personal'||(data.myShelves||[]).includes(tradition)) ? 'flex' : 'none'; }
  // Your Shelf gathers every book YOU added, whatever tradition you filed it
  // under — a book filed as Classics shows both there and here. Every other
  // shelf is its tradition, certified and personal side by side (personal
  // ones wear the 👤 mark).
  // Three cases now: Your Shelf (everything you added, however you filed it),
  // one of YOUR OWN named shelves (personal books only — a shelf you invented
  // has no certified side), or a curated tradition (certified + personal,
  // side by side, personal ones wearing 👤).
  const list = tradition==='Personal' ? Store.allDocs().filter(d=>d.personal)
    : (data.myShelves||[]).includes(tradition) ? Store.allDocs().filter(d=>d.personal && d.tradition===tradition)
    : Store.listDocs(tradition);
  state.shelfDocs = list.slice().sort((a,b)=>shelfSortKey(a).localeCompare(shelfSortKey(b)));
  renderShelf();
  showOv('shelfOv'); blip(700,.05,'square',.03);
}
/* AN EMPTY SHELF HAS TO SAY WHY IT IS EMPTY — 2026-08-10.

   Reported the same day, after the whole library had been repaired:
   "if i run npm run dev im not seeing anything on the shelves still."

   And the shelf said, in full: "This shelf waits for its first text."
   True, useless, and pointing at the wrong cause. There are 415 books.
   They are simply not reachable from a browser tab: bridge() in
   data/store.js needs window.desktopBridge, so no Postgres, no MinIO, no
   book files — and localStorage is per-origin, so :5173, :4173 and the
   desktop app are three separate saves that cannot see each other.

   THE TITLE SCREEN ALREADY SAID SO and it was not enough, because nobody
   reads a status line and then walks to a bookcase. The place to say it
   is the empty bookcase. Three different empties, three different causes,
   three different next steps — never one sentence covering all of them. */
function emptyShelfText(tradition){
  const bridge = typeof window!=='undefined' && window.desktopBridge;
  if(!bridge){
    return `<p><b>Your library is not in this browser tab.</b> A tab has its own separate save and
      cannot reach the desktop app's database, your book files, or Docker — so every shelf here looks
      empty even when your Library is full.</p>
      <p style="margin-top:8px">Run <code>npm run electron:dev</code> instead of <code>npm run dev</code>
      to develop against your real Library, or open the installed app. Nothing is lost either way.</p>
      <p style="margin-top:8px">If you meant to start a fresh library right here, you can:
      <button class="btn ghost" style="font-size:11.5px;padding:3px 10px" onclick="openBookIntake()">📥 Bring a book in</button></p>`;
  }
  if(tradition==='Personal'){
    return `<p>Your own shelf — empty so far, and that's the design: you fill it. Drop a
      <b>.txt</b> or <b>.epub</b> anywhere on the Pavilion, or use
      <button class="btn ghost" style="font-size:11.5px;padding:3px 10px" onclick="openBookIntake()">📥 Bring a book in</button>
      It lands here, marked as yours.</p>`;
  }
  return `<p>Nothing on the <b>${esc(tradition||'this')}</b> shelf yet. Books land here when you file them
    under that shelf — bring one in, then set its shelf in
    <button class="btn ghost" style="font-size:11.5px;padding:3px 10px" onclick="openMyLibrary()">👤 Your Library</button></p>
    <div class="row" style="margin-top:8px">
      <button class="btn" onclick="openBookIntake()">📥 Bring a book in</button>
      <button class="btn ghost" onclick="openIndex()">📑 See the whole Index</button>
    </div>`;
}

function renderShelf(){
  const docs=state.shelfDocs||[];
  const hue=SHELF_HUE[state.shelfTradition]||38;
  const sel=docs[state.shelfIndex];
  const spine=(d,i)=>`
        <div class="spine ${i===state.shelfIndex?'sel':''}" style="--hue:${hue+i*4}" onclick="selectBook(${i})">
          ${data.read[d.slug]?'<span class="spineRead">✓</span>':''}
          ${isRecentlyAdded(d.added)?'<span class="spineNew">NEW</span>':''}
          ${d.personal?'<span class="spineNew" title="Your own addition">👤</span>':''}
          <span class="spineTitle">${esc(d.title)}</span>
        </div>`;
  // break into bays of at most SHELF_ROW_MAX, each labelled with its letter range
  const rows=[];
  for(let start=0; start<docs.length; start+=SHELF_ROW_MAX){
    const row=docs.slice(start, start+SHELF_ROW_MAX);
    const a=(shelfSortKey(row[0])[0]||'').toUpperCase();
    const b=(shelfSortKey(row[row.length-1])[0]||'').toUpperCase();
    const range = a && b ? (a===b ? a : a+'–'+b) : '';
    const count = docs.length>SHELF_ROW_MAX ? ` · ${start+1}–${start+row.length}` : '';
    rows.push(`<div class="shelfRow"><div class="shelfRowCap">${range}${count}</div>
      <div class="shelfCase">${row.map((d,i)=>spine(d, start+i)).join('')}</div></div>`);
  }
  document.getElementById('shelfList').innerHTML = docs.length ? rows.join('') + `
    <div class="bookLabel">
      <div class="blTitle">${esc(sel.title)}
        ${data.read[sel.slug]?'<span class="badge">read ✓</span>':''}
        ${isRecentlyAdded(sel.added)?'<span class="badge">NEW</span>':''}
        <span class="badge lic">${esc(sel.license)}</span>
      </div>
      <div class="blSummary">${esc(sel.doc.summary)}</div>
      <div class="row" style="margin-top:12px">
        <button class="btn" onclick="shelfOpenSelected()">Open book</button>
        <button class="btn ghost" onclick="openIndex()">📑 Full Index</button>
        ${state.shelfTradition==='Personal'?'<button class="btn ghost" onclick="openManageLibrary()">⚙ Manage my books</button>':''}
      </div>
      <div class="blHint">◀ ▶ browse the shelf · Enter / E open</div>
    </div>` : emptyShelfText(state.shelfTradition);
}
export function selectBook(i){
  state.shelfIndex=i; renderShelf(); blip(600,.03,'square',.02);
}
function shelfNav(dir){
  const docs=state.shelfDocs||[]; if(!docs.length) return;
  state.shelfIndex=(state.shelfIndex+dir+docs.length)%docs.length;
  renderShelf(); blip(600,.03,'square',.02);
}
export function shelfOpenSelected(){
  const d=(state.shelfDocs||[])[state.shelfIndex]; if(d) openReader(d.slug);
}
window.addEventListener('keydown',e=>{
  if(state.ui!=='shelf') return;
  const k=e.key.toLowerCase();
  if(k==='arrowleft'){ e.preventDefault(); shelfNav(-1); }
  else if(k==='arrowright'){ e.preventDefault(); shelfNav(1); }
  else if(k==='enter'||k==='e'||k===' '){ e.preventDefault(); shelfOpenSelected(); }
});
export function openReader(slug){
  const d=Store.getDoc(slug); if(!d) return;
  if(state.pocketSlug && state.pocketSlug!==slug){ state.pocketSlug=null; } // opening a different book retires any stale pocket
  hideBookPhone(); // the card belongs to the pocketed state, not the open reader
  state.ui='reader'; state.currentDoc=slug; state.fullTextView=null; state.bookNotesShowAll=false; hideAllOv();
  document.getElementById('rdTitle').textContent=d.title;
  document.getElementById('rdMeta').innerHTML =
    // A book you added yourself usually has no license and no source_url, and that
    // is fine — but esc(undefined) rendered the literal word "undefined" under the
    // title of every dragged-in book. Say nothing rather than say that. (2026-08-02)
    `<b>${esc(d.tradition||'Personal')}</b>`
    + (d.license?` · License: <b>${esc(d.license)}</b>`:'')
    + (d.attribution?` · Source: <b>${esc(d.attribution)}</b>`:'')
    + (d.source_url?`<br>${esc(d.source_url)}`:'')
    + (d.personal ? `<br><span class="badge">👤 personal — Your Shelf, not the certified commons</span>
        <button class="btn ghost" style="font-size:11px;padding:2px 8px;margin-left:6px" onclick="removePersonalBook('${esc(d.slug)}')">Remove from Your Shelf</button>` : '');
  /* SAY SO WHEN THE TEXT ISN'T HERE (2026-07-28). Ten of the seed books are
     real public-domain works the Pavilion ships a *summary* of — Meditations,
     The Republic, the Tao Te Ching and so on. Until now they simply had no
     "📖 Read the full text" button, and a visitor who opened Meditations
     expecting Marcus Aurelius got an unexplained précis and no idea whether
     the app was broken, the book was missing, or that was all there was.
     Silence is not honesty. So the gap is named, with the one action that
     closes it — this is a library you fill yourself, and that's the invitation,
     not an apology.

     The Pavilion's OWN writings (license "Original — Pavilion Commons") are
     complete as they stand and must never carry this note: they aren't missing
     anything. */
  const ownWriting=/Original\s*—\s*Pavilion Commons/i.test(d.license||'');
  const textMissing = !d.doc.fullText && !ownWriting && !d.personal;
  document.getElementById('rdBody').innerHTML =
    `<p class="rdSummary">${esc(d.doc.summary)}</p>` +
    d.doc.sections.map(s=>`<h3>${esc(s.heading)}</h3><p>${esc(s.body)}</p>`).join('') +
    /* IF YOU ALREADY OWN IT, SAY SO INSTEAD OF ASKING AGAIN. Without this the
       summary keeps inviting you to fetch a book that is already on your shelf
       — the drop worked, and the page that asked for it never noticed. */
    (textMissing && fullTextTwinOf(slug)?`<div class="card" style="cursor:default;margin-top:16px;border-color:#7fa36b">
        <div class="t" style="color:#7fa36b">✓ You have the whole text of this one</div>
        <div class="s" style="margin-top:5px">You added <b>${esc(fullTextTwinOf(slug).title)}</b> to your own shelf.
          This page is still the Pavilion's short summary — the real book is one press away.</div>
        <div class="row" style="margin-top:9px">
          <button class="btn" onclick="openReader('${esc(fullTextTwinOf(slug).slug)}')">📖 Open your copy</button>
        </div></div>`:'') +
    (textMissing && !fullTextTwinOf(slug)?`<div class="card" style="cursor:default;margin-top:16px;border-color:#8a6a3a">
        <div class="t">📄 This is the Pavilion's summary — not the book itself</div>
        <div class="s" style="margin-top:5px">The full text of <b>${esc(d.title)}</b> isn't bundled with the
          Pavilion. It is <b>public domain</b>, so nothing stops you having it — it just isn't shipped, because
          a library here is meant to be one you built, not one you downloaded whole.</div>
        <div class="s" style="margin-top:6px">Fetch it from ${esc(d.attribution||'its source')}${d.source_url?` (<b>${esc(d.source_url)}</b>)`:''},
          then <b>drag the file onto this window</b> — it lands on your own shelf, full text and all, and
          this page becomes the real book.</div>
        <div class="row" style="margin-top:9px;gap:6px;flex-wrap:wrap">
          <button class="btn ghost" style="font-size:11.5px" onclick="newReviewManualForm2()">＋ Add the text yourself</button>
          <button class="btn ghost" style="font-size:11.5px" onclick="openRequests()">📋 Put it on the Request Board</button>
        </div></div>`:'');
  document.getElementById('rdMark').textContent = data.read[slug] ? 'Read ✓' : 'Mark as read';
  document.getElementById('rdSpokenNote').textContent='';
  updateReaderSpeakBtns();
  // Always shown so the feature is discoverable even before a local AI is
  // connected — clicking without one gives a plain "connect a local AI" nudge
  // (see aiBookImpression) rather than the button silently not existing.
  { const ib=document.getElementById('rdImpressionBtn'); if(ib) ib.style.display='inline-block'; }
  const carryBtn=document.getElementById('rdCarryBtn');
  if(carryBtn) carryBtn.textContent = isCarrying(carryList(),'book',slug) ? '🎒 Carrying' : '🎒 Take with you';
  document.getElementById('rdFullTextBtn').style.display = d.doc.fullText ? 'inline-block' : 'none';
  document.getElementById('rdSummaryView').style.display='block';
  document.getElementById('rdFullTextView').style.display='none';
  document.getElementById('rdNoteInput').value='';
  renderBookNotes(slug);
  const panel=document.querySelector('#readerOv .panel');
  panel.classList.remove('bookPanel'); void panel.offsetWidth; panel.classList.add('bookPanel');
  showOv('readerOv');
  awardBadge('first-page');
}
/* A reading journal, not a submission — notes live only in the reader's own
   save (data.bookNotes), the same personal/local shape as data.read, never
   sent anywhere or added to the shared shelves. Kept outside the summary/full-text
   toggle (rdSummaryView vs rdFullTextView) so it stays visible across both,
   the same note surviving whichever way you're reading the book right now. */
/* WRITING A BOOK NOTE, in one place, so the Writing Desk takes a note on the
   book in front of you by exactly the path the Reader does — same shape, same
   chapter and page, same badge — rather than a second implementation that
   drifts (WRITING-DESK-PLAN.md step 3).

   BETA-TESTING-FEEDBACK.md #10 — a note taken while actually reading the full
   text knows which page it was on; a note taken from the summary view has no
   page to attach, same as every note taken before this field existed: an
   ABSENT field, not a migration. Same for the chapter (#41) — "ch. 4, p. 61"
   is the unit people think in, and a book with no chapter marks records
   nothing rather than a guess. */
function writeBookNote(slug, text, view, page){
  // stamped at the moment it is written — see data/note-versions.js
  const note={ts:todayKey(),text,by:byLine('you')};
  if(view && view.slug===slug){
    note.page = (page!=null) ? page : view.page;
    const ch=chapterAt(chapterPages(view), note.page);
    if(ch){ note.ch=ch.number; note.chLabel=ch.label; }
  }
  (data.bookNotes[slug]=data.bookNotes[slug]||[]).unshift(note);
  persist();
  const d=Store.getDoc(slug);
  logActivity('Added a note to "'+(d?d.title:slug)+'".');
  awardBadge('first-note');
  return note;
}
export function addBookNote(slug){
  if(!slug) return;
  const input=document.getElementById('rdNoteInput');
  const text=input.value.trim(); if(!text) return;
  writeBookNote(slug, text, state.fullTextView);
  input.value=''; renderBookNotes(slug);
}
/* The actual bridge between reading and doing: one click carries a note
   straight onto today's planner record (see plannerDay()'s `sparks`
   field in the Writing Desk section below) instead of it just sitting
   on the book forever. No dedicated "notes" table of its own — sparks
   live inside the same data.planner[day] object as everything else the
   Writing Desk already saves. */
export function sendNoteToToday(slug, i){
  const notes=data.bookNotes[slug]||[];
  const note=notes[i]; if(!note) return;
  const d=Store.getDoc(slug);
  const day=plannerDay();
  /* The spark carries the note's attribution with it. A note the AI wrote,
     brought to today's plan, must not become an anonymous line in the visitor's
     own day — the plan is read back to them and to residents. */
  day.sparks.unshift({ts:todayKey(), text:note.text, source:d?d.title:slug, done:false,
                      by:attributionOf(note)});
  persist(); logActivity('Brought a note from "'+(d?d.title:slug)+'" to today\'s plan.'); blip(784,.09);
  renderBookNotes(slug);
}
// BETA-TESTING-FEEDBACK.md #10 — per-page is the default view whenever
// you're actually mid-book (matches where you're reading right now);
// "show all" is one click away. Reset whenever a book is freshly opened
// (see openReader()) so a previous book's choice doesn't linger oddly.
export function toggleBookNotesFilter(){
  state.bookNotesShowAll=!state.bookNotesShowAll;
  renderBookNotes(state.currentDoc);
}
function renderBookNotes(slug){
  const all=data.bookNotes[slug]||[];
  const inFullText=state.fullTextView && state.fullTextView.slug===slug;
  const showAll=!inFullText || state.bookNotesShowAll;
  const notes=showAll ? all : all.filter(n=>n.page===state.fullTextView.page);
  const today=plannerDay();
  const toggle=inFullText
    ? `<div class="row" style="margin-bottom:8px">
        <button class="btn ghost" style="font-size:11px;padding:3px 10px" onclick="toggleBookNotesFilter()">
          ${showAll ? '📖 Show just this page' : '📚 Show all notes ('+all.length+')'}
        </button>
      </div>`
    : '';
  const list=notes.length
    ? notes.map(n=>{
      const i=all.indexOf(n); // the real index into data.bookNotes[slug], not the filtered list's own
      const alreadySent=today.sparks.some(s=>s.text===n.text);
      const pageTag=(n.ch!==undefined ? ` · ch. ${n.ch}` : '')
        +(n.page!==undefined ? ` · page ${n.page+1}` : '');
      /* WHO WROTE IT, ON THE SAME LINE AS WHEN. A hand-written note and an
         AI note have to be tellable apart at a glance or the labelling has
         failed — the ✨ buried in the first line of the text was not enough,
         and it was all there was until 2026-08-09. */
      const who=` · <b>${esc(authorOf(n))}</b>`;
      return `<div class="card" style="cursor:default">
        <div class="s">${esc(n.ts)}${pageTag}${who}</div><div>${esc(n.text)}</div>
        <div class="row" style="margin-top:6px">
          <button class="btn ghost" style="font-size:11px;padding:3px 10px" ${alreadySent?'disabled':''}
            onclick="sendNoteToToday('${slug}',${i})">${alreadySent?'✓ In today\'s plan':'→ Bring to today\'s plan'}</button>
        </div>
      </div>`;
    }).join('')
    : (inFullText && !showAll
        ? '<p class="meta">No notes on this page yet.</p>'
        : '<p class="meta">No notes yet on this book — jot down whatever\'s worth remembering.</p>');
  document.getElementById('rdNotesList').innerHTML = toggle+list;
}
export function currentDocSlug(){ return state.currentDoc; }
/* Give the local AI some real, fun use: let it actually ENGAGE with a book —
   an overall impression from the summary/sections, or an analysis of the page
   you're on — saved straight into your book notes (marked ✨ AI, so it's never
   confused with your own). Neutral/analytical (WORK_CHARTER) so it serves any
   book, fiction to science, on its own terms. Bounded on purpose: the impression
   uses the summary + sections (small), the analysis uses just the current page —
   never the whole book, which would overwhelm a local model's context. */
function saveAiBookNote(slug, label, text, page){
  /* THE ✨ STAYS IN THE TEXT and the `by` field is added beside it. Not
     either/or: every note already saved keeps the meaning it was saved with,
     and the prefix is what isAiNote() falls back to for those. What changes is
     that a note written from today names the model and the person. */
  const note={ ts:todayKey(), text:'✨ '+label+' (AI)\n'+String(text).trim(),
               by:byLine('ai', (AI && AI.model) || null) };
  if(typeof page==='number') note.page=page;
  /* An AI note files under the chapter it was actually about, so a chapter
     summary and your own notes on that chapter sit together (#41/#42). */
  const v=state.fullTextView;
  if(typeof page==='number' && v && v.slug===slug){
    const ch=chapterAt(chapterPages(v), page);
    if(ch){ note.ch=ch.number; note.chLabel=ch.label; }
  }
  (data.bookNotes[slug]=data.bookNotes[slug]||[]).unshift(note);
  persist(); logActivity('The AI wrote a book note — '+label+'.'); blip(660,.08); setTimeout(()=>blip(825,.09),90);
  renderBookNotes(slug);
}
/* Ask Sebastian about the book you're reading — a free-form, grounded chat, not
   a one-shot note. Reuses the whole resident chat stack (streaming, the pocket
   phone, transcript) via openChatDialog, then hands Sebastian the book as
   grounding (state.dialog.book) the same way a folder review is handed over. If
   you're in the full text, he gets the exact page you're on; from the summary, he
   gets the summary + sections. Pocket the chat to keep reading while he thinks. */
function readerBookGrounding(){
  const slug=state.currentDoc; const d=slug&&Store.getDoc(slug); if(!d) return null;
  const g={ title:d.title, summary:d.doc.summary };
  const v=state.fullTextView;
  if(v && v.slug===slug){ g.where='THE PAGE THEY ARE ON (page '+(v.page+1)+' of '+v.pages.length+')'; g.text=(v.pages[v.page]||''); }
  else { g.where='THE BOOK\'S SECTIONS'; g.text=d.doc.sections.map(s=>s.heading+': '+s.body).join('\n\n'); }
  return g;
}
export function askSebastianAboutBook(){
  const g=readerBookGrounding(); if(!g) return;
  if(!isAIActive()){
    const note=document.getElementById('rdSpokenNote'), meta=document.getElementById('rdFullTextMeta');
    const target=(state.fullTextView?meta:note);
    if(target) target.textContent='Connect a local AI (⚙ Manage AI connections) to ask Sebastian about this book.';
    return;
  }
  openChatDialog({ name:'SEBASTIAN · Butler', aiAgent:'sebastian', color:'#4a6a8a', glow:'#a9c7e8',
    lines:['“'+g.title+'” — ask me anything about it, and I\'ll answer from the page in front of you.'] });
  state.dialog.book=g;
  logActivity('Asked Sebastian about "'+g.title+'".');
  renderChatView();
}
export async function aiBookImpression(){
  const slug=state.currentDoc; if(!slug) return;
  const d=Store.getDoc(slug); if(!d) return;
  const note=document.getElementById('rdSpokenNote');
  if(!isAIActive()){ if(note) note.textContent='Connect a local AI (⚙ Manage AI connections) to get an impression.'; return; }
  const btn=document.getElementById('rdImpressionBtn'); if(btn) btn.disabled=true;
  if(note) note.textContent='Reading it over…';
  const src=[d.title, d.doc.summary, ...(d.doc.sections||[]).map(s=>s.heading+': '+s.body)].join('\n\n');
  try{
    const reply=await AI.chat([
      {role:'system', content:WORK_CHARTER+'\n\nYou are a perceptive, well-read literary companion in the Sand Pavilion. '
        +'Give a thoughtful OVERALL IMPRESSION of the book described below: what it is really doing, its spirit and worth, '
        +'who might love it, and an honest reservation or two — a few short paragraphs, written to be read, genuinely engaged '
        +'rather than a dry blurb. Stay grounded in what you are given; do not invent specifics about the book beyond it.'},
      {role:'user', content:src},
    ], {long:true});
    if(isEmptyReply(reply)){ if(note) note.textContent="The thought slipped away — try again in a moment."; }
    else { saveAiBookNote(slug, 'Overall impression', reply); if(note) note.textContent='✨ Saved an impression to your notes below.'; }
  }catch(e){ if(note) note.textContent="The connection flickered — no impression this time. (Is your local AI still running?)"; }
  if(btn) btn.disabled=false;
}
/* A chapter is the unit people actually think in — "what was that chapter
   about?" is a question a page summary cannot answer and a whole-book
   impression answers too vaguely. Asked for 2026-07-28: thoughts on "certain
   chapters or a page, even a whole book to get the TLDR".

   Chapter marks already exist (chapterPages(), built for the skip controls),
   so this reuses them: everything from the current chapter's first page up to
   the next mark. Where a book has no chapter marks it falls back to a window
   of pages around where you are, and says so rather than pretending. */
export async function aiSummariseChapter(){
  const v=state.fullTextView; if(!v) return;
  const slug=v.slug, d=Store.getDoc(slug);
  const meta=document.getElementById('rdFullTextMeta'); const prev=meta?meta.textContent:'';
  if(!isAIActive()){ if(meta) meta.textContent='Connect a local AI (⚙ Manage AI connections) to summarise a chapter.'; return; }
  const marks=chapterPages(v);
  let from=v.page, to=v.page, label='';
  if(marks.length){
    let idx=0; for(let i=0;i<marks.length;i++){ if(marks[i].page<=v.page) idx=i; }
    from=marks[idx].page;
    to=(idx+1<marks.length ? marks[idx+1].page-1 : v.pages.length-1);
    label=marks[idx].label;
  } else {
    from=Math.max(0, v.page-3); to=Math.min(v.pages.length-1, v.page+3);
    label='pages '+(from+1)+'–'+(to+1)+' (this book has no chapter marks)';
  }
  /* A chapter can be long. Cap what is sent so a small local model is not
     handed forty pages and asked to hold them all — the same reason the
     lesson-drafting was split into small asks. */
  let text=v.pages.slice(from, to+1).join('\n\n');
  const CAP=14000, trimmed=text.length>CAP;
  if(trimmed) text=text.slice(0, CAP);
  const btn=document.getElementById('rdChapterBtn'); if(btn) btn.disabled=true;
  if(meta) meta.textContent='Reading '+(label||'this chapter')+'…';
  try{
    const reply=await AI.chat([
      {role:'system', content:WORK_CHARTER+'\n\nSummarise the passage below from "'+(d?d.title:'a book')+'". '
        +'Give: one sentence of what happens or is argued; then three or four bullet points of the substance; '
        +'then one line on what is worth carrying away. Plain and useful, not a book-jacket blurb. '
        +'Stay strictly inside the passage — invent nothing, and if it is cut off mid-thought, say so.'},
      {role:'user', content:text+(trimmed?'\n\n[the passage was longer than this; it is cut off here]':'')},
    ], {long:true});
    if(meta) meta.textContent=prev;
    if(isEmptyReply(reply)){ if(meta) meta.textContent='The thought slipped away — try again in a moment.'; }
    else saveAiBookNote(slug, 'Chapter summary · '+(label||('pages '+(from+1)+'–'+(to+1))), reply, from);
  }catch(e){ if(meta) meta.textContent='The connection flickered — no summary this time.'; }
  if(btn) btn.disabled=false;
}
export async function aiAnalyzePage(){
  const v=state.fullTextView; if(!v) return;
  const slug=v.slug, d=Store.getDoc(slug);
  const pageText=(v.pages[v.page]||'').trim(); if(!pageText) return;
  const meta=document.getElementById('rdFullTextMeta'); const prev=meta?meta.textContent:'';
  if(!isAIActive()){ if(meta) meta.textContent='Connect a local AI (⚙ Manage AI connections) to analyze this page.'; return; }
  const btn=document.getElementById('rdAnalyzeBtn'); if(btn) btn.disabled=true;
  if(meta) meta.textContent='Analyzing this page…';
  try{
    const reply=await AI.chat([
      {role:'system', content:WORK_CHARTER+'\n\nYou are a perceptive literary companion in the Sand Pavilion. Analyze the single '
        +'passage below from "'+(d?d.title:'a book')+'": what it is saying, what is notable in HOW it says it, and anything '
        +'worth carrying away — a few short paragraphs, grounded strictly in this passage, written to be read. Do NOT summarize '
        +'the whole book; stay with this passage only.'},
      {role:'user', content:pageText},
    ], {long:true});
    if(meta) meta.textContent=prev;
    if(isEmptyReply(reply)){ if(meta) meta.textContent="The thought slipped away — try again in a moment."; }
    else saveAiBookNote(slug, 'Analysis · page '+(v.page+1), reply, v.page);
  }catch(e){ if(meta) meta.textContent="The connection flickered — no analysis this time. (Is your local AI still running?)"; }
  if(btn) btn.disabled=false;
}

/* ----- Reading the whole book, not just the shelf summary — paginated
   client-side (no server, no chunking API) since a full public-domain
   text is just a long string once it's in memory. Verses/paragraphs are
   kept whole per page (split on blank lines) so a page never cuts a
   thought in half; a page only overflows past the target size if a
   single paragraph genuinely runs longer than that on its own. */
/* Pagination MOVED to data/retrieval.js (2026-08-03) and is called from there
   rather than duplicated here. Retrieval reports "page 47" and the reader must
   then show you page 47 — two functions with their own idea of where a page
   ends is exactly the two-lists-that-must-agree failure this project has hit
   three times already. */
function paginateFullText(text){ return paginate(text); }
/* Full text lives one of two ways: inlined in doc.fullText.text (the
   zero-setup seed.js fallback — always works, no server required), or as
   doc.fullText.storage (a MinIO pointer, {bucket,key}) once a text has
   been migrated to local object storage — see LIBRARY-SCALING-PLAN.md.
   Try the inline copy first (instant, no network); only reach for MinIO
   when there isn't one, and fail visibly rather than silently if MinIO
   isn't running, instead of leaving the reader stuck on "Loading…". */
/* The three ways a book's text can live, with no DOM attached — extracted
   2026-08-03 so retrieval can read a book WITHOUT the reader being open. The
   copy inside openFullText() writes its progress and its failures into reader
   elements, which is right there and useless anywhere else. Returns the text
   or null; the caller says what a null means in its own words. */
/* WHY THERE IS NO TEXT IS NOT ONE ANSWER. Split 2026-08-08 after the steward
   closed Docker and asked why none of his books were loading.

   The reader already said the honest thing ("the local Library storage (MinIO)
   doesn't seem to be running"). This function did not: it returned a bare
   `null` for every reason, and the Study Table's message for null is "<title>
   is a summary rather than the full text". So with the container stopped, the
   table told him a 900-page book was a summary. A confident wrong answer,
   which is worse than the silence it replaced.

   `reason` is the fix, and every caller that shows a message must read it:

     'none'        this book genuinely has no full text (a summary card)
     'unreachable' the text lives in MinIO and MinIO did not answer
     'no-bridge'   the text is a file in the desktop app, opened in a browser
     'unreadable'  the desktop file is there and would not read

   loadBookText() keeps its old shape so the callers that only need the string
   are untouched. */
export async function loadBookTextResult(slug){
  const d=Store.getDoc(slug); const ft=d && d.doc && d.doc.fullText;
  if(!ft) return { text:null, reason:'none' };
  if(ft.text) return { text:ft.text, reason:null };
  if(ft.storage && ft.storage.personal){
    const bridge=window.desktopBridge;
    if(!(bridge && bridge.libraryRead)) return { text:null, reason:'no-bridge' };
    try{
      const res=await bridge.libraryRead(ft.storage.personal);
      if(res && res.ok) return { text:res.text, reason:null };
      return { text:null, reason:'unreadable' };
    }catch(e){ return { text:null, reason:'unreadable' }; }
  }
  if(ft.storage && ft.storage.bucket){
    try{
      const base=(import.meta.env && import.meta.env.VITE_MINIO_ENDPOINT) || 'http://localhost:9000';
      const res=await fetch(`${base}/${ft.storage.bucket}/${ft.storage.key}`);
      if(!res.ok) return { text:null, reason:'unreachable' };
      return { text:await res.text(), reason:null };
    }catch(e){ return { text:null, reason:'unreachable' }; }
  }
  return { text:null, reason:'none' };
}
export async function loadBookText(slug){
  return (await loadBookTextResult(slug)).text;
}
export async function openFullText(slug, landOnPage){
  const d=Store.getDoc(slug); if(!d||!d.doc.fullText) return;
  const ft=d.doc.fullText;
  /* "License: undefined" — the SAME bug that was fixed for source_url on
     2026-08-02 and missed here, one field along. A book added by hand has no
     fullText.license (the licence is optional for your own shelf, on purpose),
     so every one of the steward's ~255 personal books printed the word
     "undefined" under its title. Fall back the way the summary view already
     does, and print nothing at all rather than a broken label. */
  const licence = ft.license || d.license;
  document.getElementById('rdFullTextMeta').innerHTML =
    `${esc(ft.translator||'')}${ft.translator?' · ':''}`
    + (licence ? `License: <b>${esc(licence)}</b>` : `<span class="meta">Your own copy — no licence recorded</span>`)
    + `<br>${esc(ft.source_url||'')}`;
  document.getElementById('rdSummaryView').style.display='none';
  document.getElementById('rdFullTextView').style.display='block';
  document.getElementById('rdFullTextPageNum').textContent='';
  let text = ft.text;
  // A personal book shelved in the desktop app — its text is a plain file
  // in the app's own data folder, read back through the same bridge that
  // wrote it. No server involved, not even a local one.
  if(!text && ft.storage && ft.storage.personal){
    document.getElementById('rdFullTextBody').textContent='Loading from this device…';
    const bridge=window.desktopBridge;
    if(bridge && bridge.libraryRead){
      try{
        const res=await bridge.libraryRead(ft.storage.personal);
        if(res && res.ok) text=res.text;
      }catch(e){ /* falls through to the honest message below */ }
    }
    if(!text){
      document.getElementById('rdFullTextBody').textContent =
        "Couldn't load this personal book's text. It was shelved in the desktop app, where its file lives — "
        +"open it there to read it (or add the text again here).";
      return;
    }
  }
  if(!text && ft.storage){
    document.getElementById('rdFullTextBody').textContent='Loading from local storage…';
    try{
      const base=(import.meta.env && import.meta.env.VITE_MINIO_ENDPOINT) || 'http://localhost:9000';
      const res=await fetch(`${base}/${ft.storage.bucket}/${ft.storage.key}`);
      if(!res.ok) throw new Error('status '+res.status);
      text=await res.text();
    }catch(e){
      document.getElementById('rdFullTextBody').textContent=
        "Couldn't load the full text — the local Library storage (MinIO) doesn't seem to be running right now.";
      return;
    }
  }
  if(!text) return;
  const pages=paginateFullText(text);
  const want=(typeof landOnPage==='number') ? Math.max(0, Math.min(pages.length-1, landOnPage)) : 0;
  state.fullTextView = { slug, pages, page:want };
  renderFullTextPage();
}
export function backToSummary(){
  stopSpeaking();
  const slug=state.fullTextView?.slug;
  state.fullTextView=null;
  document.getElementById('rdSummaryView').style.display='block';
  document.getElementById('rdFullTextView').style.display='none';
  if(slug) renderBookNotes(slug); // leaving full-text drops the per-page filter back to "all"
}
function renderFullTextPage(){
  const v=state.fullTextView; if(!v) return;
  const wasReading=isSpeaking()||isPaused(); // carry the voice onto the new page rather than killing it
  stopSpeaking();
  document.getElementById('rdFullTextBody').textContent=v.pages[v.page];
  document.getElementById('rdFullTextPageNum').textContent=`Page ${v.page+1} of ${v.pages.length}`;
  document.getElementById('rdFullTextBody').scrollTop=0;
  updateFullTextSpeakBtn();
  updateChapterRow();
  { const ab=document.getElementById('rdAnalyzeBtn'); if(ab) ab.style.display='inline-block'; } // always shown; nudges to connect an AI if none (see aiAnalyzePage)
  { const cb=document.getElementById('rdChapterBtn'); if(cb) cb.style.display='inline-block'; } // same: discoverable first, honest about needing an AI when pressed
  renderBookNotes(v.slug); // the per-page note filter follows you as you turn pages
  if(wasReading) speakPage(); // you were listening — keep listening, on this page
}
export function fullTextNextPage(){
  const v=state.fullTextView; if(!v||v.page>=v.pages.length-1) return;
  v.page++; renderFullTextPage();
}
export function fullTextPrevPage(){
  const v=state.fullTextView; if(!v||v.page<=0) return;
  v.page--; renderFullTextPage();
}
function updateFullTextSpeakBtn(){
  const btn=document.getElementById('rdFullTextReadBtn'); if(!btn) return;
  if(!ttsAvailable()){ btn.style.display='none'; return; }
  btn.style.display='inline-block';
  btn.textContent = (isSpeaking()||isPaused()) ? '⏹ Stop reading' : '🔊 Read aloud from here';
  // the ±10s skip only means anything while actually reading — hide it
  // otherwise so the row isn't cluttered with dead controls (beta #6)
  const show = canSkipSpeech() ? 'inline-block' : 'none';
  const back=document.getElementById('rdSkipBack'), fwd=document.getElementById('rdSkipFwd');
  if(back) back.style.display=show;
  if(fwd) fwd.style.display=show;
  // pause/resume is available whenever a book has audio at all — the whole
  // point is that it survives being interrupted
  const pz=document.getElementById('rdPauseBtn');
  if(pz){
    pz.style.display = hasAudio() ? 'inline-block' : 'none';
    pz.textContent = isPaused() ? '▶ Resume' : '⏸ Pause';
  }
}
/* The chapter row is NOT part of the speech controls — it lived inside
   updateFullTextSpeakBtn(), which returns early when the browser has no
   speech synthesis, so on such a browser the chapter controls silently
   went with it. Separated 2026-08-03. */
function updateChapterRow(){
  const v=state.fullTextView;
  const ch=document.getElementById('rdChapterRow');
  if(ch) ch.style.display = v ? 'flex' : 'none';
  const cb=document.getElementById('rdChapPrev'), cf=document.getElementById('rdChapNext');
  const info = v ? chapterInfo(v) : {marks:[], how:'none'};
  const hasCh = info.marks.length ? 'inline-block' : 'none';
  if(cb) cb.style.display=hasCh;
  if(cf) cf.style.display=hasCh;
  /* SAY IT, rather than leaving two controls quietly absent. Plenty of real
     books have no chapter marks — the four suttas in the seed, and anything
     converted from a PDF with no contents block — and "the buttons are gone"
     reads as breakage. Silent failure is this project's house failure mode. */
  /* SAY WHOSE DIVISIONS THESE ARE, AND NEVER LEAVE IT A DEAD END.

     "no chapter marks in this text" was true and useless — a statement with
     nowhere to go, on the third of the library the detector cannot read.
     Asked for 2026-08-07: "it would be nice to have a tag like this book is
     not wired and for the community to tag the chapters."

     So the row now says one of three honest things, and the first two are
     doors: this book has none *yet*, these are the ones you marked, or these
     were found for you. No AI, no guessing a date, no pretending. */
  const note=document.getElementById('rdChapNote');
  if(note){
    if(!v) note.innerHTML='';
    else if(!info.marks.length){
      note.innerHTML = 'not divided yet — '
        + '<a class="link" href="#" onclick="markChaptersHere();return false">mark the chapters yourself</a>';
    } else {
      const cur=currentChapter(v);
      const where = cur ? 'ch. '+cur.number+' of '+info.marks.length : info.marks.length+' chapters';
      const whose = info.how==='hand' ? ' · yours' : '';
      note.innerHTML = esc(where+whose)
        + ' · <a class="link" href="#" onclick="markChaptersHere();return false">edit</a>';
    }
  }
}
/* The door from the reader to the place marks are actually made. The Study
   Table is where labelling lives (`data.bookMarks`), and it opens on the book
   and page you are looking at, so "mark the chapters yourself" lands on the
   one you meant rather than at the top of a list. */
export function markChaptersHere(){
  const v=state.fullTextView; if(!v) return;
  // Point the Study Table at THIS book before opening it, or it lands on
  // whatever was last open and the door goes somewhere you didn't ask for.
  state.studyView = state.studyView || { slug:null, idx:1, labelling:false };
  state.studyView.slug = v.slug;
  state.studyView.labelling = true;      // arrive ready to type a name
  invalidateStudyCache();
  /* THE TABLE WORKS ON THE POCKETED BOOK, not the open one — without this the
     door lands on "Nothing on the table yet", which is a dead end reached by
     pressing a button that promised the opposite. */
  minimizeReader();
  // openPlanner() resets plannerTool, so the tool is chosen AFTER it, not
  // before — setting it first opens the desk with no tool showing at all.
  openPlanner();
  togglePlannerTool('study');
}
export function toggleReadingPause(){
  if(isPaused()) resumeSpeaking(); else pauseSpeaking();
  updateFullTextSpeakBtn(); renderBookPhone();
}
// podcast-style skip within the page being read aloud. Re-speaks from a new
// offset (see tts.js skipSpeech) and re-syncs the buttons after.
export function skipReadAloud(seconds){
  if(!canSkipSpeech()) return;
  skipSpeech(seconds);
  blip(seconds<0?392:523,.04,'sine',.03);
  updateFullTextSpeakBtn();
}
/* Per-page, not whole-book — a 50-page speech queued up front would be
   impossible to stop cleanly or resume mid-book. Reading a page and
   turning to the next is the same unit a human reader already uses, so
   read-aloud follows the same unit instead of inventing a bigger one.

   What changed 2026-07-27, from real use: the page finishing now TURNS THE
   PAGE and keeps going, so "if I have to sit and listen that's fine" is
   actually true — you can listen to a whole book without touching anything.
   And `state.bookAudio` remembers which book is speaking, so the voice can
   survive closing the panel, opening a chat, or walking off. */
function speakPage(){
  const v=state.fullTextView; if(!v) return;
  state.bookAudio={ slug:v.slug, page:v.page };
  speak(v.pages[v.page], ()=>{
    // finished this page: turn to the next and carry on, or stop at the end
    const cur=state.fullTextView;
    if(!state.bookAudio) return;            // stopped while that page was reading
    if(cur && cur.slug===v.slug && cur.page<cur.pages.length-1){
      cur.page++;
      /* THE POCKET HAS TO LEARN WHERE THE VOICE GOT TO — fixed 2026-08-02.
         Reported: "I love how the book keeps reading but besides the little
         icon it goes back to the page I closed the book on." The pocket
         recorded the page at the moment you pocketed it and then never moved,
         while the voice read on for twenty minutes. Reopening threw away
         everything you had just listened to. Two records of "where we are",
         and while pocketed the VOICE'S is the true one. */
      state.bookAudio.page=cur.page;
      if(state.pocketSlug===v.slug) rememberPage(v.slug, cur.page);
      if(state.ui==='reader') renderFullTextPage(); else { renderBookPhone(); speakPage(); }
      return;
    }
    state.bookAudio=null;
    updateFullTextSpeakBtn(); renderBookPhone();
  });
  updateFullTextSpeakBtn();
}
export function toggleFullTextReadAloud(){
  if(isSpeaking()||isPaused()){
    state.bookAudio=null;   // clear the auto-advance marker FIRST, then stop
    stopSpeaking(); updateFullTextSpeakBtn(); renderBookPhone(); return;
  }
  const v=state.fullTextView; if(!v) return;
  speakPage();
}
/* ----- Getting somewhere in a long book. "It should let me skip to the next
   chapter, or like 10% of the book at the very least." Both, now: chapter
   marks where the text actually has them, and a 10% jump always. */
/* MOVED to data/chapters.js on 2026-08-03, and it was not a tidy-up. The
   scan that used to live here read the FIRST THREE LINES of each page, and
   a page is a 1,400-character slice — so it found 0 of the Dhammapada's 26
   chapters and 0 of the Gita's 18. Both shipped in the seed; both showed no
   chapter controls at all. The rule is real enough to erode quietly, so it
   is pure logic with real books as its test now. */
/* A MARK YOU MADE OUTRANKS ONE WE GUESSED — in the reader too, from
   2026-08-07.

   `marks.js` has said this since it was written, and `tools/schema.sql` since
   the chapters table went in. But it was only ever true at the Study Table:
   the reader called findChapters() raw, so you could sit and label a book's
   chapters by hand, walk to the reader, and find every one of them ignored.
   Labelling that changes nothing where you actually read is a dead end of the
   most discouraging kind — the work was done and the program threw it away.

   mergeMarks() is pure and already tested, and it is the same call the Study
   Table makes, so the two cannot disagree about what a book's divisions are. */
function handMarks(slug){
  const all = (data.bookMarks && data.bookMarks[slug]) || [];
  return Array.isArray(all) ? all : [];
}
function chapterInfo(v){
  if(!v) return {marks:[], how:'none'};
  if(!v._chapterInfo){
    const found = findChapters(v.pages);
    /* KEEP WHAT WE JUST FOUND. Until 2026-08-07 this answer was computed on
       every open and thrown away on close, so `chapters` and `chapter_scans`
       were written by nothing but the MinIO loader and were empty on every
       install that is not the steward's — while views and named queries sat
       on top of them. Fire-and-forget: nothing waits on it, and a browser
       (which has no database at all) simply never gets past the first line.

       The DETECTION is what is kept, deliberately, not the merge below — the
       database records what the finder saw, and a hand mark is a separate
       source with its own write. Mixing them here would make "how did we
       learn this" unanswerable. */
    try {
      const d = Store.getDoc(v.slug);
      Store.syncChapters(v.slug, found.marks, found.how,
        d ? { title:d.title, attribution:d.attribution, license:d.license,
              source_url:d.source_url, shelf:d.tradition, kind:d.kind,
              part:d.part, pages:v.pages.length } : null);
    } catch(e){ /* the Pavilion reads perfectly well without a database */ }
    const hand = handMarks(v.slug);
    v._chapterInfo = hand.length
      // `how` becomes 'hand' the moment you have touched it: the row below
      // says where the divisions came from, and "you" is the honest answer.
      ? { marks: mergeMarks(found.marks, hand, v.pages.length), how:'hand' }
      : found;
  }
  return v._chapterInfo;
}
/* Marking a chapter has to be visible immediately, so the cache cannot
   outlive an edit. Cheap: findChapters re-runs only for the open book. */
export function forgetChapterCache(slug){
  const v=state.fullTextView;
  if(v && (!slug || v.slug===slug)) v._chapterInfo=null;
}
function chapterPages(v){ return chapterInfo(v).marks; }
/* Which chapter the reader is actually in — the lookup behind "ch. 4, p. 61"
   on a note. Null where a book genuinely has none, so a note records an
   ABSENT field rather than a wrong one. */
function currentChapter(v){ return v ? chapterAt(chapterPages(v), v.page) : null; }
export function jumpChapter(dir){
  const v=state.fullTextView; if(!v) return;
  const marks=chapterPages(v); if(!marks.length) return;
  const next = dir>0 ? marks.find(m=>m.page>v.page) : [...marks].reverse().find(m=>m.page<v.page);
  if(!next){ if(dir<0) v.page=0; else return; } else v.page=next.page;
  renderFullTextPage(); blip(dir>0?600:460,.06);
}
export function jumpFraction(frac){
  const v=state.fullTextView; if(!v) return;
  const step=Math.max(1, Math.round(v.pages.length*Math.abs(frac)));
  v.page=Math.max(0, Math.min(v.pages.length-1, v.page + (frac<0?-step:step)));
  renderFullTextPage(); blip(frac>0?600:460,.06);
}
export function jumpToPageNum(){
  const v=state.fullTextView; if(!v) return;
  const raw=window.prompt(`Which page? (1 – ${v.pages.length})`, String(v.page+1));
  const n=parseInt(raw,10); if(!n||isNaN(n)) return;
  v.page=Math.max(0, Math.min(v.pages.length-1, n-1));
  renderFullTextPage();
}
export function markRead(){
  const slug=state.currentDoc; if(!slug) return;
  if(!data.read[slug]){
    data.read[slug]=todayKey(); persist(); setHud();
    const d=Store.getDoc(slug); logActivity('Marked "'+(d?d.title:slug)+'" as read.');
    blip(523,.09); setTimeout(()=>blip(659,.09),90); setTimeout(()=>blip(784,.14),180);
  }
  document.getElementById('rdMark').textContent='Read ✓';
}
export function backToShelf(){ stopSpeaking(); openShelf(state.shelfTradition||'Theravada'); }

/* ---------- pocket a book, exactly like the chat "phone" ----------
   Close the reader and keep walking the grounds while a book reads aloud
   (or simply to hold your place); a small floating card in the corner
   brings you back. Mirrors minimizeChat/restoreChat: only the overlay is
   hidden — the read-aloud is NEVER stopped here, and state.ui is cleared so
   the player is free to move (movement is gated on state.ui in main.js). */
let bookPhoneTimer=null;
/* ---- THE POCKET, RETIRED — 2026-08-07 ---------------------------------

   `state.readerPocket` was {slug, page} and did two unrelated jobs badly:
   it was a SECOND record of which book you are holding (the backpack is the
   first), and the only record of where you had got to — which, being session
   state, was thrown away every time you closed the app.

   Split into the two honest things it was standing in for:

     data.readingPos[slug]   WHERE YOU ARE in a book. Saved, so it survives
                             a reload — which the pocket never did. This is
                             new capability, not a rename.
     state.pocketSlug        WHICH book the phone is showing right now.
                             Genuinely a session question: "is the reader
                             minimised" has no meaning after you close.

   Neither duplicates the backpack, which is the point: `carrying` says what
   you are holding, and these two say where you are in it and whether you
   walked off with it. */
export function rememberPage(slug, page){
  if(!slug || page==null) return;
  if(!data.readingPos) data.readingPos={};
  if(data.readingPos[slug]===page) return;        // no write for no change
  data.readingPos[slug]=page; persist();
}
export function pageIn(slug){
  const p=data.readingPos && data.readingPos[slug];
  return Number.isInteger(p) ? p : null;
}
/* The pocketed book, in the shape the old field had, so every caller reads
   the same thing it always did. */
function pocketed(){
  const slug=state.pocketSlug;
  return slug ? { slug, page: pageIn(slug) } : null;
}

/* Pocketing used to remember only the slug, so coming back dumped you at the
   summary and lost the page you were on ("if I pocket it, it will leave the
   page I was on"). It now carries the page too, and restores you exactly
   where you were — mid-book, mid-sentence if it's still reading. */
export function minimizeReader(){
  const slug=state.currentDoc; if(!slug) return;
  const v=state.fullTextView;
  rememberPage(slug, (v&&v.slug===slug)?v.page:null);
  state.pocketSlug=slug;
  state.ui=null;                                  // free to walk
  document.getElementById('readerOv').classList.remove('open');
  showBookPocketFor({slug});
  blip(520,.05,'sine',.03);
}
/* Also used when a book is left reading and you close the panel some other
   way — the pocket card is where a running book always lives. */
function showBookPocketFor(p){
  if(p && p.slug){ state.pocketSlug=p.slug; if(p.page!=null) rememberPage(p.slug,p.page); }
  if(!state.pocketSlug) return;
  renderBookPhone();
  clearInterval(bookPhoneTimer);
  bookPhoneTimer=setInterval(renderBookPhone,1000); // keep the status honest as speech starts/ends
}
export function restoreReader(){
  const p=pocketed(); if(!p) return;
  /* Land where the VOICE is, not where you closed it. If the book has been
     reading while you walked, state.bookAudio.page is the honest answer and
     the pocket's own page is a stale snapshot. Falls back to the pocket for a
     book that was pocketed silently, which is the only case where the page you
     closed on is still the page you want. */
  const speaking = state.bookAudio && state.bookAudio.slug===p.slug ? state.bookAudio.page : null;
  const page = speaking != null ? speaking : p.page;
  state.pocketSlug=null; hideBookPhone();
  openReader(p.slug);                             // openReader never stops speech — audio carries straight through
  if(page!=null) openFullText(p.slug, page);
  blip(700,.05,'square',.03);
}
export function dismissReaderPocket(){
  state.pocketSlug=null; state.bookAudio=null; stopSpeaking(); clearPaused(); hideBookPhone();
  blip(392,.05,'sine',.03);
}
/* Pause/resume straight from the pocket card, so a book you're listening to
   while walking around can be stopped and picked up without opening anything. */
export function togglePocketAudio(ev){
  if(ev&&ev.stopPropagation) ev.stopPropagation();
  if(isPaused()) resumeSpeaking();
  else if(isSpeaking()) pauseSpeaking();
  else { // nothing parked — start reading the pocketed page
    const p=pocketed(); if(!p) return;
    const d=Store.getDoc(p.slug); if(!d) return;
    restoreReader(); return;
  }
  renderBookPhone();
}
function hideBookPhone(){
  clearInterval(bookPhoneTimer); bookPhoneTimer=null;
  const el=document.getElementById('bookPhone'); if(el) el.classList.remove('show','reading');
}
function renderBookPhone(){
  const el=document.getElementById('bookPhone'); if(!el) return;
  const p=pocketed();
  if(!p){ hideBookPhone(); return; }
  const d=Store.getDoc(p.slug);
  document.getElementById('bookPhoneName').textContent = d ? d.title : 'Book';
  const reading=isSpeaking(), parked=isPaused();
  el.classList.toggle('reading', reading);
  const pct=Math.round(speechProgress()*100);
  const where=(p.page!=null)?` · p.${p.page+1}`:'';
  document.getElementById('bookPhoneStatus').textContent =
    reading ? `🔊 reading${where} · ${pct}%` : parked ? `⏸ paused${where} · ${pct}% · tap ▶ to go on` : 'tap to return to the book'+where;
  const btn=document.getElementById('bookPhoneAudio');
  if(btn){ btn.style.display = (reading||parked) ? 'block' : 'none'; btn.textContent = parked ? '▶' : '⏸'; }
  el.classList.add('show');
}

/* ----- The Index — every text in one list, sorted by category rather
   than tradition: the Library's own shelves (all "classical" today)
   plus your own Archive Desk (personal writing, and Quill's "ai-written"
   reports). Categories are defined even where nothing's shelved there
   yet — the taxonomy is meant to hold future content, not just today's. */
/* ================================================================
   AN EMPTY LIBRARY IS AN ON-RAMP, NOT A DEAD END — 2026-08-10.

   The seed shelf was deleted this day, so an empty Library went from
   "impossible" to "what every new visitor sees on the first morning."
   That makes the empty state a real screen for the first time, and it
   was reading "Nothing here yet." with no way forward — the exact dead
   end the standing rule forbids:

     "nothing may be a dead end — every artifact must be reachable AND
      actionable from where you are looking at it."

   Your Library already got this right (+ Add a book or paper, right at
   the top, with the .txt/.epub sentence underneath). This is the same
   thing, said once, wherever a list of books can come back empty — so
   the three panels cannot drift apart, which is rule 4's shape.

   It also says WHERE the text will go, because with Docker up that is a
   different answer than without, and a person deciding whether to import
   a 5 MB book deserves to know which one they are getting. */
function emptyLibraryOnRamp(){
  const bridge = typeof window!=='undefined' && window.desktopBridge;
  const where = !bridge
    ? 'In a browser tab the text is kept inside the save itself, so only a few books fit — the desktop app holds hundreds.'
    : (Store.dbAvailable && Store.dbAvailable())
      ? 'Your books go to local Docker storage, where there is no practical limit.'
      : 'Your books are written as real files on this machine.';
  return `<div class="meta" style="margin-top:10px;line-height:1.6">
    <b>Your Library is empty, and that is the intended starting point.</b><br>
    The shipped shelf was removed on 2026-08-10 — it was mostly excerpts standing in
    for books, and a shelf you filled yourself is the whole idea.
    ${esc(where)}</div>
  <div class="row" style="margin-top:10px">
    <button class="btn" onclick="openBookIntake()">📥 Bring a book in</button>
    <button class="btn ghost" onclick="openMyLibrary()">📕 Your Shelf</button>
    <button class="btn ghost" onclick="openReviewQueue()">🐫 The Caravan Desk</button>
  </div>`;
}

/* WHERE THIS ONE BOOK'S TEXT IS, on the card itself. Read off the book's own
   pointer by data/book-storage.js, never off what happens to be running — so
   a book written to Docker still says Docker with the container stopped,
   which is true and is the thing you need to know when it will not open. */
function bookStorageBadge(slug){
  const d = Store.getDoc(slug);
  if(!d) return '';
  /* storageBadge() decides the icon and the words; STORAGE_STATES is read
     ONLY for the hover hint. Two ways of spelling the same badge would be
     rule 4's exact shape, and a second way to be wrong. */
  const text = storageBadge(d);
  if(!text) return '';
  const s = STORAGE_STATES[storageOf(d)] || {};
  return ` <span class="badge" title="${esc(s.hint||'')}">${esc(text)}</span>`;
}
/* And the whole shelf in one line, so "is Docker actually holding my books"
   is answerable at a glance instead of by opening one and finding out. */
function shelfStorageLine(){
  const line = storageSummary(Store.allDocs());
  if(!line) return '';
  const room = localRoom(Store.allDocs(), bookCap());
  const capNote = room.used
    ? ` · local shelf ${room.used}/${room.cap}${room.full?' — FULL, raise your limit in 📦 Where books are kept':''}`
    : '';
  return `<div class="meta" style="margin:10px 0 4px;color:#c9a227">${esc(line)}${esc(capNote)}</div>`;
}

export function openIndex(){
  state.ui='index'; hideAllOv();
  /* OPEN ON A TAB THAT HAS BOOKS IN IT.

     This used to hardcode 'classical', which was fine for exactly as long
     as the shipped seed existed to fill it. With the seed shelf removed
     (2026-08-10) a visitor with 415 books of their own would have opened
     the Index onto the one empty category and concluded the Library was
     empty — the same silent nothing this whole day was spent removing,
     reintroduced by a default.

     So: keep a category the visitor chose, otherwise pick the fullest one.
     Deterministic, and it can never be wrong about which tab has books
     because it counts them. */
  if(!state.indexCategory || !indexItems().some(i=>i.category===state.indexCategory)){
    const counts={};
    for(const i of indexItems()) counts[i.category]=(counts[i.category]||0)+1;
    const best=CATEGORIES.map(c=>c.id).sort((a,b)=>(counts[b]||0)-(counts[a]||0))[0];
    state.indexCategory = (counts[best] ? best : 'classical');
  }
  renderIndex(); showOv('indexOv');
}
function indexItems(){
  const lib = Store.allDocs().map(d=>({kind:'library', slug:d.slug, title:d.title, category:d.category,
    sub:d.tradition, license:d.license, summary:d.doc.summary, added:d.added, personal:d.personal}));
  const arc = data.workshop.docs.map(d=>({kind:'archive', slug:d.slug, title:d.title, category:d.category||'personal',
    sub:d.license||'', summary:d.body||'', added:d.created}));
  return [...lib, ...arc];
}
export function setIndexCategory(id){ state.indexCategory=id; state.indexSearch=''; renderIndex(); }
/* Real search (Store.searchDocs -> Postgres tsvector/ts_rank) runs
   debounced, since every keystroke firing a network request would be
   wasteful; a "generation" counter drops any response that's been
   superseded by a newer keystroke before it got back. While waiting
   (and there is no server-side search any more), the existing local
   substring match still runs immediately so the box never feels dead —
   real results simply replace it, ranked, once they arrive. */
let indexSearchTimer=null, indexSearchGen=0;
export function setIndexSearch(v){
  state.indexSearch=v;
  clearTimeout(indexSearchTimer);
  const gen=++indexSearchGen;
  state.indexSearchResults=null; state.indexSearching=false;
  renderIndex();
  // a full innerHTML rebuild on every keystroke would normally drop focus/cursor
  // from the input that triggered it, so re-focus and restore the cursor
  // position explicitly right here — only for this immediate, synchronous
  // render; the later async re-renders below must NOT steal focus back if
  // the visitor has since clicked elsewhere.
  const inp=document.getElementById('indexSearch');
  if(inp){ inp.focus(); inp.setSelectionRange(v.length, v.length); }
  const q=v.trim();
  if(!q) return;
  indexSearchTimer=setTimeout(async ()=>{
    if(gen!==indexSearchGen) return;
    state.indexSearching=true; renderIndex();
    const results=await Store.searchDocs(q);
    if(gen!==indexSearchGen) return; // a newer keystroke already superseded this
    state.indexSearching=false; state.indexSearchResults=results;
    renderIndex();
  }, 300);
}
export function clearIndexSearch(){
  clearTimeout(indexSearchTimer); indexSearchGen++;
  state.indexSearch=''; state.indexSearchResults=null; state.indexSearching=false;
  renderIndex();
}
export function openIndexItem(kind,slug){
  if(kind==='library') openReader(slug); else openArchiveDoc(slug);
}
// "new" is deliberately short-lived (14 days) — a welcome-mat for something just
// shelved, not a permanent label. `added`/`created` are plain 'YYYY-MM-DD' strings.
const INDEX_NEW_DAYS = 14;
function isRecentlyAdded(dateStr){
  if(!dateStr) return false;
  const t = new Date(dateStr+'T00:00:00').getTime();
  return !isNaN(t) && (Date.now()-t) < INDEX_NEW_DAYS*86400000;
}
function renderIndex(){
  const items=indexItems();
  const cat=state.indexCategory;
  const search=(state.indexSearch||'').trim().toLowerCase();
  const counts={}; items.forEach(i=>{ counts[i.category]=(counts[i.category]||0)+1; });
  let shown, usedRealSearch=false;
  if(search){
    if(state.indexSearchResults){
      // Real, ranked results already came back from Postgres — but that search
      // could only ever see the CERTIFIED library. Books that live only on this
      // device — your own Archive Desk writing AND the personal books on Your
      // Shelf — never reached it, so those are matched locally and folded in.
      // Store.searchDocs() now always returns null (there is no server to ask),
      // so in practice this local pass IS the search — kept as the same branch
      // rather than collapsed, so re-adding a real index later changes one
      // function instead of this whole path.
      const libResults=state.indexSearchResults.map(d=>({kind:'library', slug:d.slug, title:d.title,
        category:d.category, sub:d.tradition, license:d.license, summary:d.doc.summary, added:d.added}));
      const seen=new Set(libResults.map(d=>d.slug));
      const localMatches=items.filter(i=>!seen.has(i.slug) && (i.kind==='archive' || i.personal)
        && (i.title.toLowerCase().includes(search) || (i.summary||'').toLowerCase().includes(search)));
      shown=[...libResults, ...localMatches];
      usedRealSearch=true;
    } else {
      shown=items.filter(i => i.title.toLowerCase().includes(search) || (i.summary||'').toLowerCase().includes(search));
    }
  } else {
    shown=items.filter(i=>i.category===cat);
  }
  document.getElementById('indexPanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>The Index</h2>
    <div class="meta">Every text in one place, sorted by kind rather than lineage — the Library's
      shelves and your own Archive Desk together. Categories with nothing in them yet are still
      shown; the shape's there before the content is.</div>
    <div class="row" style="margin-top:10px"><button class="btn" onclick="openCatalog()">🗂 Browse by section (The Stacks)</button></div>
    <input type="text" id="indexSearch" placeholder="Search titles and summaries…"
      value="${esc(state.indexSearch||'')}" oninput="setIndexSearch(this.value)" style="margin-top:12px">
    ${search ? `<div class="meta" style="margin:8px 0 0">
        ${state.indexSearching ? 'Searching…' : usedRealSearch ? 'Ranked by relevance —' : 'Matching titles/summaries for'}
        "${esc(state.indexSearch)}".
        <button class="btn ghost" style="font-size:11px;padding:3px 10px;margin-left:6px" onclick="clearIndexSearch()">✕ clear</button>
      </div>` : ''}
    <div class="row" style="margin:12px 0${search?';opacity:.4':''}">
      ${CATEGORIES.map(c=>`<button class="btn ${c.id===cat&&!search?'':'ghost'}" style="font-size:11.5px;padding:6px 12px"
        onclick="setIndexCategory('${c.id}')">${esc(c.label)} <span class="badge">${counts[c.id]||0}</span></button>`).join('')}
    </div>
    ${shelfStorageLine()}
    ${shown.length ? shown.map(i=>`
      <div class="card" onclick="openIndexItem('${i.kind}','${i.slug}')">
        <div class="t">${i.kind==='library'?'📖':'📔'} ${esc(i.title)}${i.kind==='library'?` <span class="badge lic">${esc(i.license)}</span>`:''}${i.kind==='library'?bookStorageBadge(i.slug):''}${isRecentlyAdded(i.added)?' <span class="badge">NEW</span>':''}</div>
        <div class="s">${esc(i.sub||'')}</div>
      </div>`).join('') : `<p>${search?'Nothing matches that search.':''}</p>${search?'':emptyLibraryOnRamp()}`}`;
}

/* ================================================================
   The Stacks — a hierarchical catalog for a Library that SCALES
   (BETA-FEEDBACK #36; the user chose sections -> subsections). Physical
   shelves stay a curated handful; this is how a *mass* of books is
   actually browsed: Section -> Subsection -> books, driven by a taxonomy
   config so re-sorting is a data edit, never code. Reuses the two axes
   the data already has (`tradition` + `category`), with a category
   fallback for anything not explicitly mapped.
   ================================================================ */
const LIBRARY_TAXONOMY = {
  'Theravada':      {section:'Religion & Spirituality', sub:'Buddhism'},
  'Mahayana':       {section:'Religion & Spirituality', sub:'Buddhism'},
  'Tantra':         {section:'Religion & Spirituality', sub:'Hindu Tantra'},
  'Hindu':          {section:'Religion & Spirituality', sub:'Hinduism'},
  'Daoism':         {section:'Religion & Spirituality', sub:'Daoism'},
  'Native American':{section:'Religion & Spirituality', sub:'Indigenous'},
  'Practice':       {section:'Religion & Spirituality', sub:'Practice & Cross-tradition'},
  'Classics':       {section:'Philosophy & Classics', sub:'Philosophy & Classics'},
  'Science':        {section:'Science', sub:'Science'},
  'Fiction':        {section:'Fiction', sub:'Fiction'},
  'Non-fiction':    {section:'Non-fiction', sub:'Non-fiction'},
};
const SECTION_ORDER=['Your shelves','Religion & Spirituality','Philosophy & Classics','Science','Non-fiction','Fiction','Other'];
function bookSection(d){
  /* YOUR OWN SHELVES COME FIRST — fixed 2026-08-02, reported as "it's a bit
     weird to see all the different sections not being there."

     The taxonomy below maps the eleven LINEAGE shelves the Library ships with,
     and it was written before a visitor could name their own. So after a real
     sorting session — 111 books filed onto shelves like Electronics, Work,
     Recipes — every one of them fell through to {section:'Other'} and the
     Stacks showed the shelves you had just spent an evening making as a single
     grey heap called Other. The Index did the same thing one bucket over,
     lumping them all under "Personal".

     A book on a shelf you named goes in a section called what you named it.
     The lineage taxonomy still governs the certified Library; it simply no
     longer gets the first word about a book that was never part of it. */
  if(d.personal && d.tradition && d.tradition!=='Personal'){
    return {section:'Your shelves', sub:d.tradition};
  }
  const t=LIBRARY_TAXONOMY[d.tradition];
  if(t) return t;
  const c=d.category;
  if(d.personal) return {section:'Your shelves', sub:'Still to sort'};
  if(c==='fiction') return {section:'Fiction', sub:'Fiction'};
  if(c==='non-fiction') return {section:'Non-fiction', sub:'Non-fiction'};
  if(c==='research') return {section:'Science', sub:'Research papers'};
  return {section:'Other', sub:d.tradition||'Uncategorized'};
}
// attribute/JS-safe token for section & subsection names (they contain spaces &
// ampersands, and a user-added tradition could contain anything).
const encTok=s=>encodeURIComponent(String(s)).replace(/'/g,'%27');
export function openCatalog(){ state.ui='catalog'; hideAllOv(); state.catalogView={section:null,sub:null}; renderCatalog(); showOv('catalogOv'); }
export function catalogOpen(section,sub){
  state.catalogView={ section: section?decodeURIComponent(section):null, sub: sub?decodeURIComponent(sub):null };
  renderCatalog();
}
function renderCatalog(){
  const v=state.catalogView||{section:null,sub:null};
  const tree={};
  Store.allDocs().forEach(d=>{ const {section,sub}=bookSection(d); (tree[section]=tree[section]||{}); (tree[section][sub]=tree[section][sub]||[]).push(d); });
  /* A shelf you made but have not filled yet still exists, and a catalogue that
     omits it is telling you it forgot. Same reason the Index shows empty
     categories: the shape should be there before the content is. */
  (data.myShelves||[]).forEach(name=>{
    tree['Your shelves']=tree['Your shelves']||{};
    tree['Your shelves'][name]=tree['Your shelves'][name]||[];
  });
  const sections=SECTION_ORDER.filter(s=>tree[s]).concat(Object.keys(tree).filter(s=>!SECTION_ORDER.includes(s)));
  const panel=document.getElementById('catalogPanel');
  const header=`<button class="xbtn" onclick="closeUI()">Esc ✕</button><h2>🗂 The Stacks</h2>`;
  if(!v.section){
    panel.innerHTML = header
      +`<div class="meta">The whole Library, by section — built to hold a lot of books. The physical
        shelves are a curated handful; this is <i>everything</i>, sorted, including the shelves you
        named yourself. Pick a section to drill in.</div>`
      +`<div style="margin-top:12px">${sections.map(s=>{
        const subs=tree[s], n=Object.values(subs).reduce((a,arr)=>a+arr.length,0);
        return `<div class="card" onclick="catalogOpen('${encTok(s)}')"><div class="t">${esc(s)} <span class="badge">${n}</span></div>
          <div class="s">${Object.keys(subs).sort().map(esc).join(' · ')}</div></div>`;
      }).join('')}</div>
      <div class="row" style="margin-top:16px"><button class="btn ghost" onclick="openIndex()">↔ The flat Index instead</button></div>`;
    return;
  }
  const subs=tree[v.section]||{};
  if(!v.sub){
    const subNames=Object.keys(subs).sort();
    panel.innerHTML = header
      +`<div class="meta"><b>${esc(v.section)}</b> — ${subNames.length} subsection${subNames.length===1?'':'s'}</div>`
      +`<div style="margin-top:10px">${subNames.map(sub=>`
        <div class="card" onclick="catalogOpen('${encTok(v.section)}','${encTok(sub)}')"><div class="t">${esc(sub)} <span class="badge">${subs[sub].length}</span></div></div>`).join('')}</div>
      <div class="row" style="margin-top:16px"><button class="btn ghost" onclick="catalogOpen()">← All sections</button></div>`;
    return;
  }
  const books=(subs[v.sub]||[]).slice().sort((a,b)=>a.title.localeCompare(b.title));
  panel.innerHTML = header
    +`<div class="meta"><b>${esc(v.section)}</b> › <b>${esc(v.sub)}</b> · ${books.length} book${books.length===1?'':'s'}</div>`
    +`<div style="margin-top:10px">${books.map(d=>`
      <div class="card" onclick="openReader('${d.slug}')">
        <div class="t">📖 ${esc(d.title)}${d.personal?' <span class="badge">👤</span>':''} <span class="badge lic">${esc(d.license)}</span>${isRecentlyAdded(d.added)?' <span class="badge">NEW</span>':''}</div>
        <div class="s">${esc((d.doc.summary||'').slice(0,130))}</div>
      </div>`).join('')}</div>
    <div class="row" style="margin-top:16px"><button class="btn ghost" onclick="catalogOpen('${encTok(v.section)}')">← ${esc(v.section)}</button></div>`;
}

/* ----- read-aloud for the Library — the actual "have books be read to
   you" ask: full text always works (native browser voice, no AI needed);
   the spoken-summary button gets richer when Quill is actually connected
   but degrades gracefully to the doc's own written summary when he isn't. */
function updateReaderSpeakBtns(){
  const readBtn=document.getElementById('rdReadBtn'), sumBtn=document.getElementById('rdSummaryBtn');
  if(!readBtn||!sumBtn) return;
  if(!ttsAvailable()){
    readBtn.style.display='none'; sumBtn.style.display='none';
    return;
  }
  const speaking=isSpeaking();
  readBtn.textContent = speaking ? '⏹ Stop' : '🔊 Read aloud';
  sumBtn.textContent = speaking ? '⏹ Stop' : (isAIActive() ? '✨ Ask Quill (spoken)' : '🔊 Summary aloud');
}
export function toggleReadAloud(){
  if(isSpeaking()){ stopSpeaking(); updateReaderSpeakBtns(); return; }
  const d=Store.getDoc(state.currentDoc); if(!d) return;
  const text=[d.title, d.doc.summary, ...d.doc.sections.map(s=>s.heading+'. '+s.body)].join('. ');
  speak(text, updateReaderSpeakBtns);
  updateReaderSpeakBtns();
}
export async function toggleSpokenSummary(){
  if(isSpeaking()){ stopSpeaking(); updateReaderSpeakBtns(); return; }
  const d=Store.getDoc(state.currentDoc); if(!d) return;
  const note=document.getElementById('rdSpokenNote');
  if(!isAIActive()){ speak(d.doc.summary, updateReaderSpeakBtns); updateReaderSpeakBtns(); return; }
  note.textContent='Quill is composing a summary…';
  updateReaderSpeakBtns();
  try{
    const ask=`In 3-4 sentences written to be listened to rather than read, summarize "${d.title}" for `
      +`someone about to hear it read aloud. Base it only on this: ${d.doc.summary} `
      +d.doc.sections.map(s=>s.heading+': '+s.body).join(' ');
    const summary=await AI.chat([{role:'system',content:CHARTER},{role:'user',content:ask}]);
    note.textContent='Quill: “'+summary+'”';
    speak(summary, updateReaderSpeakBtns);
  }catch(e){
    note.textContent='Quill\'s connection flickered — reading the written summary instead.';
    speak(d.doc.summary, updateReaderSpeakBtns);
  }
  updateReaderSpeakBtns();
}

/* ----- Planner (the Writing Desk) ----- */
/* ANY day, created if absent. Split out from plannerDay() 2026-08-08 for the
   daily-tasks board, which records a finished day into the log of the day it
   BELONGED TO — you open the app on Tuesday and Monday's account lands on
   Monday, where it is true, rather than on today, where it is not. */
export function plannerDayFor(k){
  if(!k) return null;
  if(!data.planner[k]) data.planner[k]={ intention:'', ember:'', blocks:DEFAULT_BLOCKS.map(n=>({name:n,state:'waiting'})), sparks:[] };
  if(!data.planner[k].sparks) data.planner[k].sparks=[]; // upgrade days saved before sparks existed
  if(!data.planner[k].log) data.planner[k].log=[]; // the day's bullet-journal log (SELF-LEARNING-JOURNAL-PLAN.md)
  return data.planner[k];
}
function plannerDay(){ return plannerDayFor(todayKey()); }
/* The Writing Desk's white paper IS a bullet journal now (the user's ask):
   the classic three entry types — a • task, an ○ event, a — note — rapid-logged
   right on the day's page. Tasks toggle done. Kept simple and fast; migration
   (re-deciding what still matters) is a later phase, per the plan. */
const BUJO_KINDS=[
  {id:'task',  label:'• Task'},
  {id:'event', label:'○ Event'},
  {id:'note',  label:'— Note'},
];
function bujoSig(e){ return e.kind==='task' ? (e.done?'✓':'•') : e.kind==='event' ? '○' : '—'; }
/* Bullet-journal MIGRATION — the cornerstone the whole method turns on: an
   unfinished task (•) doesn't silently fall into the past, it surfaces on today's
   page to be pulled forward (>) or consciously let go. Only tasks migrate; events
   and notes are date-anchored and stay on their own day. Mirrors the sparks
   carry-forward already here, applied to the daily log the user asked for. */
function migratableTasks(){
  const today=todayKey(), out=[];
  for(const k of Object.keys(data.planner).sort()){
    if(k>=today) continue;
    (data.planner[k].log||[]).forEach(e=>{ if(e.kind==='task' && !e.done) out.push({dayKey:k, id:e.id, text:e.text}); });
  }
  return out;
}
export function migrateLogTask(dayKey,id){
  const src=data.planner[dayKey]; if(!src) return;
  const e=(src.log||[]).find(x=>x.id===id); if(!e) return;
  src.log=src.log.filter(x=>x.id!==id);
  const day=plannerDay(); if(!day.log) day.log=[];
  day.log.push({id:Date.now(), text:e.text, kind:'task', done:false});
  persist(); logActivity('Carried a task forward to today.'); blip(660,.06); renderPlanLog(); setHud();
}
export function dropLogTask(dayKey,id){
  const src=data.planner[dayKey]; if(!src) return;
  const e=(src.log||[]).find(x=>x.id===id); if(!e) return;
  e.done=true; // let it go, but keep the honest record on its own day (struck through)
  persist(); renderPlanLog();
}
export function migrateAllLogTasks(){
  const tasks=migratableTasks(); if(!tasks.length) return;
  const day=plannerDay(); if(!day.log) day.log=[];
  tasks.forEach((t,n)=>{
    const src=data.planner[t.dayKey]; if(!src) return;
    src.log=(src.log||[]).filter(x=>x.id!==t.id);
    day.log.push({id:Date.now()+n, text:t.text, kind:'task', done:false}); // +n keeps ids unique across the loop
  });
  persist(); logActivity('Carried '+tasks.length+' unfinished task(s) forward to today.'); blip(660,.06); setTimeout(()=>blip(825,.08),90);
  renderPlanLog(); setHud();
}
function renderPlanLog(){
  const el=document.getElementById('planLog'); if(!el) return;
  const day=plannerDay(), log=day.log||[], kind=state.planLogKind||'task';
  const carried=migratableTasks();
  const carriedBlock = carried.length ? `
    <div class="card" style="cursor:default;margin-bottom:10px;border-color:#8fb4d9">
      <div class="t">↩ ${carried.length} unfinished task${carried.length>1?'s':''} from earlier</div>
      <div class="s" style="margin:2px 0 8px">The bullet-journal move: pull forward what still matters, and let the rest go — nothing falls through the cracks.</div>
      ${carried.map(t=>`<div class="row" style="align-items:center;gap:8px;margin-top:3px">
        <span style="flex:1">• ${esc(t.text)} <span class="badge lic">${esc(t.dayKey)}</span></span>
        <button class="btn ghost" style="font-size:10px;padding:2px 8px" onclick="migrateLogTask('${t.dayKey}',${t.id})">→ today</button>
        <button class="btn ghost" style="font-size:10px;padding:2px 8px" onclick="dropLogTask('${t.dayKey}',${t.id})" title="Let it go">✕</button>
      </div>`).join('')}
      ${carried.length>1?`<div class="row" style="margin-top:8px"><button class="btn ghost" style="font-size:11px" onclick="migrateAllLogTasks()">→ Carry all to today</button></div>`:''}
    </div>` : '';
  el.innerHTML = carriedBlock + `
    <div class="meta" style="margin-top:4px">Today's log — a bullet journal: a <b>•</b> task, an <b>○</b> event, or a <b>—</b> note. Jot fast; tidy later.</div>
    <div class="row" style="margin-top:6px;flex-wrap:wrap;gap:6px">
      ${BUJO_KINDS.map(k=>`<button class="btn ${k.id===kind?'':'ghost'}" style="font-size:11px;padding:5px 10px" onclick="setPlanLogKind('${k.id}')">${esc(k.label)}</button>`).join('')}
      <input type="text" id="planLogInput" placeholder="add a ${esc(kind)} — Enter to log" style="flex:1;min-width:150px" onkeydown="if(event.key==='Enter'){event.preventDefault();addPlanLogEntry();}">
      <button class="btn ghost" style="font-size:11px" onclick="addPlanLogEntry()">Add</button>
    </div>
    ${log.length?`<div style="margin-top:8px">${log.map(e=>{
      const isTask=e.kind==='task';
      return `<div class="row" style="align-items:center;gap:8px;margin-top:3px">
        <span style="flex:1;${e.done?'opacity:.55;text-decoration:line-through':''}"><b style="cursor:${isTask?'pointer':'default'};color:#e0a43c" ${isTask?`onclick="togglePlanLogTask(${e.id})"`:''}>${bujoSig(e)}</b> ${esc(e.text)}</span>
        <button class="btn ghost" style="font-size:10px;padding:2px 8px" onclick="removePlanLogEntry(${e.id})">✕</button>
      </div>`;
    }).join('')}</div>`:''}`;
}
export function setPlanLogKind(k){ state.planLogKind=k; renderPlanLog(); setTimeout(()=>document.getElementById('planLogInput')?.focus(),20); }
export function addPlanLogEntry(){
  const inp=document.getElementById('planLogInput'); const text=(inp&&inp.value||'').trim(); if(!text) return;
  const day=plannerDay(); if(!day.log) day.log=[];
  day.log.push({id:Date.now(), text, kind:state.planLogKind||'task', done:false});
  persist(); if(inp) inp.value=''; renderPlanLog(); setHud();
  setTimeout(()=>document.getElementById('planLogInput')?.focus(),20);
}
export function togglePlanLogTask(id){
  const day=plannerDay(), e=(day.log||[]).find(x=>x.id===id); if(!e||e.kind!=='task') return;
  e.done=!e.done; persist(); renderPlanLog();
}
export function removePlanLogEntry(id){
  const day=plannerDay(); day.log=(day.log||[]).filter(x=>x.id!==id); persist(); renderPlanLog();
}
/* ----- WRITING-DESK-PLAN.md, steps 1-3 — the page is the desk now, not
   the sixth thing on it. `#planIntent`/`#planEmber` are the only things
   visible by default; everything else (blocks, sparks, notes, Ask the
   Steward, past days) lives in `state.plannerTool`, a single "which tool
   is open" slot rendered into one shared `#planToolPanel` — collapsed
   (null) every time the desk is freshly opened. Due-soon items are the
   one deliberate exception, per the plan: they already follow the
   passive/glanceable automation-philosophy pattern correctly and stay
   visible unconditionally. */
const TOOLBOX_ITEMS = [
  {id:'book', icon:'📖', label:'The book in front of you'},
  {id:'study', icon:'📚', label:'Work through a book'},
  {id:'blocks', icon:'🔥', label:'Rhythm blocks'},
  {id:'sparks', icon:'✨', label:'Sparks from reading'},
  {id:'notes', icon:'🗂', label:'Your notes'},
  {id:'assist', icon:'💬', label:'Call someone over'},
  {id:'past', icon:'📅', label:'Past days'},
];
const TOOLBOX_TITLES = {book:'The book in front of you',
  study:'Work through a book, one story at a time',
  blocks:'Rhythm blocks — tap to cycle: waiting → tended → rested',
  sparks:'Sparks from reading', notes:'Your notes — lately, and worth another look',
  assist:'Call someone over', past:'Past days'};
/* THE HEADING NAMES WHAT IS ON THE TABLE. Found 2026-08-07 by a live test
   arriving at the Study Table through the reader's "mark the chapters
   yourself" door: the toolbox BUTTON already said "Work through The
   Dhammapada" (studyTableLabel), while the panel HEADING above the work
   surface said the generic "Work through a book, one story at a time" — so
   the one place you are actually looking never told you which book you had.
   The `book` tool has named its book since it was written; this is the same
   rule, applied to the tool beside it. */
function toolTitle(id){
  if(id==='book'){ const b=deskBook(); return b ? b.doc.title : TOOLBOX_TITLES.book; }
  /* tableBook(), NOT deskBook(). They were different answers: the table works
     from the BACKPACK now and deskBook() is only the pocketed book, so with a
     carried book on the table the heading fell back to the generic title and
     said nothing. Two notions of "the book on the table" is the drift this
     whole day has been about — there is one, and study-table.js owns it. */
  if(id==='study'){ const b=tableBook(); return b ? 'Working through '+b.doc.title : TOOLBOX_TITLES.study; }
  return TOOLBOX_TITLES[id];
}
/* The toolbox button for the chat says WHO is at the desk, not a fixed
   name — the whole point of the picker is that it isn't always the same
   resident, and a button that says "Ask the Steward" while the Tutor is
   sitting there is the silent-wrong-thing this project keeps paying for. */
function toolLabel(t){
  if(t.id==='assist'){ const r=ROLES[deskChat().agent]; return r ? 'Ask '+r.label : t.label; }
  /* And the book button names the book you are actually carrying — the desk
     should show what is ON it before you open anything. */
  if(t.id==='book'){ const b=deskBook(); return b ? b.doc.title : t.label; }
  if(t.id==='study') return studyTableLabel();
  return t.label;
}
/* THE SEAM between this file and ui/study-table.js, written down rather than
   implied. The workroom lives outside the monolith (the steward asked for
   overlays.js to be broken up, and a new panel had no business making it
   worse); the handful of things it needs that still live here are handed over
   once, here, so nothing has to import backwards. */
/* The residents live in ui/residents.js now; these are the things they ask
   this file for. Same seam as the Study Table, same reason: they never
   import backwards, so there is no cycle to reason about. */
initLessonTree({
  closeUI, hideAllOv, showOv, openReader, openFullText, renderFullTextPage,
  chapterPages, loadBookText, loadBookTextResult, currentDocSlug, newNoteId, openChatDialog,
  renderChatView, openIndex, openCourses, openCommonsTable, openPacket,
  publishFrom, commonsStore, cleanAnswer, visBadge, openNotesLog,
  refreshNoteEditors, setHud,
});
/* THE ONE WIRE for anything in the transport layer that a VISITOR gets to
   decide. provider.js imports nothing on purpose, so the setting is read
   through here rather than imported over there. One call, beside the other
   init() seams — a second would be a hand-maintained list that must match
   another file, and every one of those in this project has drifted. */
initProviderSettings(() => (data && data.settings) || {});
/* WHO IS SITTING HERE, for every note written from now on. Same injected-reader
   shape and same reason: data/note-versions.js is pure and imports nothing.
   Until the profile exists (THE-TUTORIAL-AND-SIGNING-IN.md §3) this resolves to
   "user 1" — said out loud rather than left blank — and when it lands, exactly
   this line changes. */
initNoteAuthor(() => (data && data.profile) || {});
initResidents({
  agentMemory, personalBooks, allNodes, lessonDone, lessonCompletedCount,
  currentStudy, nextStepOf, eventsOn, hallShelfSummary, investigationsForPrompt,
  renderChatQuickActions,
  /* The backpack becomes grounding, 2026-08-08 — groundingFor()'s first
     caller lives over there. gatherNotes resolves a carried note, which is a
     reference and not a copy, so only this file can do it. */
  carryList, gatherNotes, searchMyNotes: searchMyNotesFor, todaysTaskLine,
  /* Retrieval's one dependency, 2026-08-10. Reading a book's text may mean the
     desktop bridge, a .txt under userData, or MinIO — three things residents.js
     must never learn about. */
  loadBookText,
});
/* Today's Tasks — the same seam again. `plannerDayFor` is the one thing it
   genuinely cannot reach: a finished day is recorded into the log of the day
   it belonged to, not the day you happened to open the app. */
initDailyTasks({ hideAllOv, showOv, closeUI, plannerDayFor, setHud });
initStudyTable({
  deskBook,
  getDoc: (slug) => { try { return Store.getDoc(slug); } catch(e){ return null; } },
  pageIn,
  refreshPanel: () => renderToolPanel(),
  carryBook: (slug) => { if(!isCarrying(carryList(),'book',slug)) toggleInventory(slug); },
  // A carried note is a REFERENCE. Resolved live from gatherNotes() so an edit
  // elsewhere reads correctly here, and a deletion simply stops appearing.
  noteByKey: (key) => { try { return gatherNotes().find(n => n.key === key) || null; } catch(e){ return null; } },
  loadBookText,
  loadBookTextResult,
  writeBookNote: (slug, text, page) => {
    /* The Reader's own path, so a note written at the table is identical to
       one written mid-page: same shape, same chapter, same four doors. The
       view is only used for the chapter lookup, so it is passed when it
       happens to be the same book and simply absent otherwise. */
    const v = (state.fullTextView && state.fullTextView.slug===slug) ? state.fullTextView : null;
    return writeBookNote(slug, text, v, page);
  },
  openBookAt: async (slug, page) => {
    closeUI();
    openReader(slug);
    await openFullText(slug, page);
  },
  /* THE AI PLUMBING STAYS IN ONE PLACE. The table says who it wants and what
     it is looking at; CHAT_AGENTS, the Monk's standing model rule, and the
     context budget all continue to live here, so there is exactly one way a
     resident is spoken to in this application. */
  /* The draft lands in the AUTHORING FORM, filled in, and stops. The steward's
     own sequencing — "before its ready for the wall" — and the same rule the
     Writing Desk's drafter follows: the model drafts, the person promotes. */
  openLessonWriter: (prefill) => {
    state.ui='tree'; hideAllOv();
    newLessonForm(null, prefill.bookSlug || null);
    showOv('treeOv');
    setTimeout(()=>{
      const set=(id,v)=>{ const el=document.getElementById(id); if(el&&v!=null) el.value=v; };
      set('mlTitle', prefill.title);
      set('mlSummary', prefill.summary);
      set('mlSteps', (prefill.steps||[]).map(s=>s.body?`${s.title} | ${s.body}`:s.title).join('\n'));
      const msg=document.getElementById('mlMsg');
      if(msg) msg.textContent='Drafted from your notes. Change anything you like — nothing is kept until you add it to the tree.';
    }, 40);
  },
  /* A ONE-SHOT DRAFTING JOB IS NOT A CONVERSATION, and must not wear a
     resident's prompt. Caught 2026-08-04 by reading the drafted steps instead
     of the pass/fail: routed through the Steward, whose whole prompt is about
     the Pavilion's desks and handing work to colleagues, the lesson came back
     as "Go to the Library and ask for a summary" and "Ask Sebastian what is
     due" — navigation instructions, not study. Every check still passed.

     The room does the work, and this was the wrong room. WORK_CHARTER +
     DRAFT_SYS is what draftLessonWithAI and draftCourseWithAI already use for
     the same shape of job. */
  draftText: async (prompt, opts) => {
    const reply = await AI.chat([{role:'system', content:WORK_CHARTER+'\n\n'+DRAFT_SYS},
                                 {role:'user', content:prompt}], opts||{long:true});
    return isEmptyReply(reply) ? '' : reply;
  },
  residents: () => rosterForVisitor().filter(r => CHAT_AGENTS[r.key] && CHAT_AGENTS[r.key].systemPrompt),
  aiActive: isAIActive,
  askResident: async (key, history, groundingBlock) => {
    const agent = CHAT_AGENTS[key] || CHAT_AGENTS[deskDefaultAgent()];
    const system = (await agent.systemPrompt()) + groundingBlock;
    const reply = await AI.chat([{role:'system', content:system}, ...history], chatOptsFor(key));
    return isEmptyReply(reply) ? 'The words did not come this time — ask again, or try a lighter model.' : reply;
  },
});
export function openPlanner(){
  state.ui='planner'; hideAllOv();
  const day=plannerDay();
  document.getElementById('planDate').textContent = new Date().toDateString() + ' · a day is a small, complete thing';
  document.getElementById('planIntent').value = day.intention;
  document.getElementById('planEmber').value = day.ember;
  document.getElementById('planSaved').textContent='';
  renderPlanUpcoming();
  renderPlanLog();
  deskChat();                       // who is at the desk, and their own thread
  state.plannerTool=null;
  renderToolbox();
  renderToolPanel();
  showOv('planOv');
}
let planSaveTimer=null;
function schedulePlanAutosave(){
  const day=plannerDay();
  day.intention=document.getElementById('planIntent').value;
  day.ember=document.getElementById('planEmber').value;
  const label=document.getElementById('planSaved');
  if(label) label.textContent='saving…';
  clearTimeout(planSaveTimer);
  planSaveTimer=setTimeout(()=>{
    persist();
    if(label) label.textContent='saved '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  },600);
}
document.getElementById('planIntent').addEventListener('input', schedulePlanAutosave);
document.getElementById('planEmber').addEventListener('input', schedulePlanAutosave);
export function togglePlannerTool(id){
  state.plannerTool = state.plannerTool===id ? null : id;
  if(state.plannerTool==='notes') state.plannerNoteView={mode:'list'};
  renderToolbox();
  renderToolPanel();
}
function renderToolbox(){
  const el=document.getElementById('planToolbox'); if(!el) return;
  el.innerHTML = TOOLBOX_ITEMS.map(t=>{
    const active=state.plannerTool===t.id;
    return `<button class="btn ghost" style="${active?'background:#e0a43c;color:#1a1208':''}"
      onclick="togglePlannerTool('${t.id}')">${t.icon} ${esc(toolLabel(t))}</button>`;
  }).join('');
}
function renderToolPanel(){
  const el=document.getElementById('planToolPanel'); if(!el) return;
  const tool=state.plannerTool;
  if(!tool){ el.innerHTML=''; return; }
  el.innerHTML = `<div class="card" style="cursor:default;margin-top:10px">
    <h3 style="margin-top:0">${esc(toolTitle(tool))}</h3>
    <div id="planToolBody"></div>
  </div>`;
  if(tool==='book') renderDeskBookBody();
  else if(tool==='study') renderStudyTable();
  else if(tool==='blocks') renderBlocksBody();
  else if(tool==='sparks') renderPlanSparksBody();
  else if(tool==='notes') renderNotesBody();
  else if(tool==='assist') renderPlannerAssistBody();
  else if(tool==='past') renderPastDaysBody();
}
/* ----- THE BOOK IN FRONT OF YOU — WRITING-DESK-PLAN.md step 3.

   The mechanism already existed and was used nowhere near here:
   the pocketed book you walked off with (see pocketed()). That IS
   "the book in front of you", so the desk shows it.

   WHAT THIS CLOSES. You could already take a note IN the Reader, and plan
   AT the desk. What you could not do was sit at the desk with the book
   open and write about it — which is what a person actually does when
   studying, and the reason the desk felt like a form rather than a desk.

   The chapter and page come from the live view when it is still the same
   book, and are simply ABSENT otherwise — the steward's own rule: "I don't
   know is fine, it leaves the user space to also contribute." A note that
   cites a guessed chapter is worse than one that cites none. */
function deskBook(){
  const p=pocketed(); if(!p||!p.slug) return null;
  let d=null; try{ d=Store.getDoc(p.slug); }catch(e){ d=null; }
  if(!d) return null;
  /* Land where the VOICE is, not where you closed it — the same honesty
     restoreReader() already applies: a book that has been reading aloud
     while you walked over here is further on than the pocket remembers. */
  const speaking = state.bookAudio && state.bookAudio.slug===p.slug ? state.bookAudio.page : null;
  const page = speaking!=null ? speaking : (p.page!=null ? p.page : null);
  const view = (state.fullTextView && state.fullTextView.slug===p.slug) ? state.fullTextView : null;
  const ch = (view && page!=null) ? chapterAt(chapterPages(view), page) : null;
  return { slug:p.slug, doc:d, page, ch, view, pages: view ? view.pages.length : null };
}
/* One line of "where you are in it", the same vocabulary the Reader and the
   notes use, with nothing invented where the book does not say. */
/* A detected chapter label is already clipped to a fixed width upstream, so a
   long one arrives mid-word ("…and Not in Our Powe"). Cut it back to a word
   instead — seen in a screenshot, not in any test. */
function trimLabel(s, max){
  s=String(s||'').trim();
  if(s.length<=max) return s;
  const cut=s.slice(0,max);
  const at=cut.lastIndexOf(' ');
  return (at>max*0.5 ? cut.slice(0,at) : cut).replace(/[,;:.\s]+$/,'')+'…';
}
function deskBookWhere(b){
  const bits=[];
  if(b.ch) bits.push('ch. '+b.ch.number+(b.ch.label?' · '+trimLabel(b.ch.label,44):''));
  if(b.page!=null) bits.push('p. '+(b.page+1)+(b.pages?' of '+b.pages:''));
  return bits.length ? bits.join(' · ') : 'no page kept — pocketed from the summary';
}
function renderDeskBookBody(){
  const el=document.getElementById('planToolBody'); if(!el) return;
  const b=deskBook();
  if(!b){
    /* NOT A DEAD END. An empty panel that only explains itself is the thing
       CLAUDE.md's IDE framing rules out — so it carries the door with it. */
    el.innerHTML = `<div class="meta">Nothing on the desk yet. Open any book and press <b>↓ pocket</b> in the
      Reader — it comes with you, and lands here so you can write about it while you work.</div>
      <div class="row" style="margin-top:8px">
        <button class="btn ghost" onclick="openMyLibrary()">📚 Your shelves</button>
        <button class="btn ghost" onclick="openIndex()">🗂 The whole Index</button>
      </div>`;
    return;
  }
  const notes=(data.bookNotes[b.slug]||[]);
  const recent=notes.slice(0,3);
  el.innerHTML = `
    <div class="meta" style="margin-top:0">${esc(b.doc.attribution||b.doc.author||'')}${(b.doc.attribution||b.doc.author)?' · ':''}${esc(deskBookWhere(b))}</div>
    <div class="row" style="margin:8px 0">
      <button class="btn" onclick="restoreReader()">📖 Open it here</button>
      <button class="btn ghost" onclick="dismissReaderPocket();renderDeskBookAfterPutDown()">Put it down</button>
    </div>
    <textarea id="deskNoteInput" rows="3" placeholder="Write about it — this note keeps the chapter and page you are on…"></textarea>
    <div class="row" style="margin-top:6px;align-items:center;flex-wrap:wrap">
      <button class="btn" onclick="deskAddNote()">✎ Keep this note</button>
      <button class="btn ghost" style="font-size:11.5px" onclick="deskDraftLesson()"
        title="Draft a lesson plan into a note first — you read it and edit it before anything reaches the tree">✨ Draft a lesson from this (AI)</button>
    </div>
    <div class="meta" id="deskNoteMsg" style="margin-top:6px"></div>
    ${recent.length ? `<h4 style="margin:14px 0 4px">The last notes on this book</h4>`
      + recent.map(n=>`<div class="card" style="cursor:default">
          <div class="s">${esc(n.ts||'')}${n.ch!==undefined?' · ch. '+n.ch:''}${n.page!==undefined?' · p. '+(n.page+1):''} · <b>${esc(authorOf(n))}</b></div>
          <div>${esc((n.text||'').length>200?n.text.slice(0,200)+'…':n.text)}</div>
          <div class="row" style="margin-top:6px">
            <button class="btn ghost" style="font-size:11px;padding:3px 10px" onclick="openBookAtNote('${jsq(bookNoteKey(b.slug,n))}')">📖 Open the book here</button>
            <button class="btn ghost" style="font-size:11px;padding:3px 10px" onclick="bookNoteToToday('${jsq(bookNoteKey(b.slug,n))}');deskNoteSent()">→ Bring to today</button>
          </div>
        </div>`).join('')
      + (notes.length>recent.length ? `<div class="row" style="margin-top:6px"><button class="btn ghost" style="font-size:11px;padding:3px 10px" onclick="openNotesForBook('${jsq(b.slug)}')">All ${notes.length} notes on this book →</button></div>` : '')
      : `<div class="meta" style="margin-top:12px">No notes on this book yet.</div>`}`;
}
export function renderDeskBookAfterPutDown(){ if(state.plannerTool==='book'){ renderToolbox(); renderToolPanel(); } }
export function deskNoteSent(){ const el=document.getElementById('deskNoteMsg'); if(el) el.textContent='✓ on today’s plan'; }
export function deskAddNote(){
  const b=deskBook(); if(!b) return;
  const input=document.getElementById('deskNoteInput'); if(!input) return;
  const text=input.value.trim(); if(!text) return;
  /* The confirmation is built from THE NOTE THAT WAS ACTUALLY WRITTEN, not
     from what the desk believed it was about to write. Caught by deliberately
     breaking this: the note recorded no page at all and the desk still said
     "✓ kept at ch. 1 · p. 4" — a confident wrong answer, which is the one
     thing this project has decided is worse than saying "I don't know". */
  const n=writeBookNote(b.slug, text, b.view, b.page);
  input.value='';
  renderDeskBookBody();
  const msg=document.getElementById('deskNoteMsg');
  if(msg) msg.textContent='✓ kept'+(n.ch!==undefined?' at ch. '+n.ch:'')
    +(n.page!==undefined?' · p. '+(n.page+1):' — no page kept for this one');
  blip(700,.06,'sine',.03);
}

/* ----- A LESSON DRAFTED IN NOTES, BEFORE IT GOES ON THE WALL —
   WRITING-DESK-PLAN.md step 4, in the steward's own sequencing:

     "have the AI make a full lesson plan in notes first before its ready
      for the wall."

   The chain already existed end to end and was invisible from the desk,
   which is where the work happens: a draft lands in a NOTE
   (draftLessonPlanFromNote), plan-to-lesson.js turns a note into a real
   lesson, lessonFromPlanNote puts it in the tree. What could not be done
   was start that chain from the book you are actually holding.

   THE RULE THAT MUST SURVIVE: the model drafts, the person promotes.
   Nothing reaches the tree without a press — the same "a suggestion is
   not a decision" line the shelf sorter's review step exists to keep
   true. So this writes a note and stops. */
export async function deskDraftLesson(){
  const b=deskBook(); if(!b) return;
  const el=document.getElementById('deskNoteMsg');
  const say=(t,html)=>{ if(!el) return; if(html) el.innerHTML=t; else el.textContent=t; };
  if(!isAIActive()){ say('Connect a local AI (⚙ Manage AI connections) to draft a lesson from this book.'); return; }
  const notes=(data.bookNotes[b.slug]||[]).slice(0,12);
  /* Grounded in what is genuinely on the desk: the book, where you are in
     it, the page you are actually looking at, and the notes on it.
     Nothing invented, and it says so where a piece is missing.

     THIS HEADING USED TO SAY "THEIR OWN NOTES ON THIS BOOK", and it was the
     live bug behind the whole attribution change (2026-08-09). data.bookNotes
     holds the assistant's ✨ notes as well as the visitor's, so a model was
     being handed its own earlier output and told a person wrote it — then
     asked to build a lesson plan on that reading of them.

     The fix is NOT to drop the AI notes. They are real notes and they stay;
     each one now says whose it is, in words, which is a thing a model can
     actually use ("you wrote this last week, they have not commented on it"
     is a different lesson from "they wrote this"). */
  const page=(b.view && b.page!=null && b.view.pages[b.page]) ? String(b.view.pages[b.page]).slice(0,3000) : '';
  const mine=notes.filter(n=>!isAiNote(n)).length;
  const ground='BOOK: "'+b.doc.title+'"'+((b.doc.attribution||b.doc.author)?' by '+(b.doc.attribution||b.doc.author):'')
    +'\nWHERE THEY ARE: '+deskBookWhere(b)
    +(page?'\n\nTHE PAGE IN FRONT OF THEM:\n'+page:'\n\n(no page text available — work from the notes below alone)')
    +(notes.length?'\n\nNOTES ON THIS BOOK — each one says who wrote it. '
        +'"'+currentUser()+'" is the reader you are helping; anything marked as the AI is a '
        +'previous assistant note, not their words.\n'
        +notes.map(n=>labelledNote(n, n.ch!==undefined?'(ch. '+n.ch+')':'')).join('\n')
        +(mine?'':'\n(none of these are the reader\'s own writing yet)')
      :'\n\n(they have not written any notes on this book yet)');
  say('Your local AI is drafting a lesson plan from this book…');
  try{
    const reply=await AI.chat([
      {role:'system', content:WORK_CHARTER+'\n\nTurn what this reader has in front of them into a concrete, personal '
        +'LESSON PLAN they can actually walk: a one-line goal, then a short sequence of numbered study sessions — each '
        +'with what to read or do and roughly how long — one small hands-on task per session, and a simple way to check '
        +'understanding at the end. Ground it strictly in the book and notes given; where you do not know something, say '
        +'so rather than inventing it. Plain readable text, no preamble about what you are about to do.'},
      {role:'user', content:ground},
    ], {long:true});
    if(isEmptyReply(reply)){ say('The model came back empty — a lighter model may do better.'); return; }
    const plan={id:newNoteId(), title:'Lesson plan — '+b.doc.title,
      body:'✨ Drafted by your local AI from "'+b.doc.title+'" ('+deskBookWhere(b)+') and your notes on it.\n\n'
        +String(reply).trim(), created:todayKey(), updated:todayKey(), book:{slug:b.slug, page:(b.page!=null?b.page+1:null), chapter:(b.ch?b.ch.number:null)}};
    data.notes.unshift(plan); persist();
    logActivity('Drafted a lesson plan from "'+b.doc.title+'" at the Writing Desk.');
    blip(660,.08); setTimeout(()=>blip(825,.09),90);
    /* A draft that only says "saved" is the dead end this plan exists to
       close. Read it, edit it, THEN promote it — all three from here. */
    say('✨ Drafted into a note — read it before it goes anywhere. '
      +'<button class="btn ghost" style="font-size:11px;padding:2px 8px" onclick="deskOpenDraft(\''+plan.id+'\')">✎ Read and edit it</button> '
      +'<button class="btn ghost" style="font-size:11px;padding:2px 8px" onclick="lessonFromPlanNote(\''+plan.id+'\',\'deskNoteMsg\')">🌳 Put it in the tree</button>', true);
  }catch(e){ say('The connection flickered — no draft this time (is your local AI still running?).'); }
}
/* Straight from the draft message into the desk's own note editor — the
   reading-and-editing step, in the room you are already in. */
export function deskOpenDraft(id){
  state.plannerTool='notes';
  state.plannerNoteView={mode:'edit', id};
  renderToolbox(); renderToolPanel();
}

/* ----- Sparks — the bridge closing the gap between reading and doing:
   a book note, brought over from the Reader in one click, lands here
   instead of just sitting on the book forever. Lives on the same
   planner-day record as everything else (persists/exports for free),
   and plannerContext() below folds it straight into the Steward's
   day-planning grounding, the same way it already sees due items and
   past embers. */
/* READING-TO-DOING-PLAN.md steps 2-4 — a spark now carries a `done` flag
   instead of only ever being deleted, so a day's record can actually show
   whether something read/researched turned into something acted on. Same
   card markup reused everywhere a spark appears (today's list, carried-
   forward, a past day, the Still Open panel) so "done" toggles consistently
   no matter where you're looking at it from. */
function sparkCardHTML(dayKey, i, s, opts){
  opts = opts || {};
  return `<div class="card" style="cursor:default">
    <div class="s">from "${esc(s.source)}"${opts.showDay?' · '+esc(dayKey):''}</div>
    <div style="${s.done?'text-decoration:line-through;opacity:.6':''}">${esc(s.text)}</div>
    <div class="row" style="margin-top:6px;align-items:center">
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
        <input type="checkbox" ${s.done?'checked':''} onchange="toggleSparkDone('${dayKey}',${i})"> done
      </label>
      ${opts.allowRemove?`<button class="btn ghost" style="font-size:11px;padding:3px 10px" onclick="removeSpark(${i})">✕ remove</button>`:''}
    </div>
  </div>`;
}
function renderPlanSparksBody(){
  const day=plannerDay();
  const el=document.getElementById('planToolBody'); if(!el) return;
  const cf=data.settings.carryForwardSparks;
  const desc=`<div class="meta">Notes brought over from the Library, Research Desk, or Grant Desk, one click at a time — not required.</div>`;
  const toggle=`<label class="meta" style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:8px 0">
    <input type="checkbox" ${cf?'checked':''} onchange="toggleCarryForward()">
    Carry forward what's still open from earlier days
  </label>`;
  const today = day.sparks.length
    ? day.sparks.map((s,i)=>sparkCardHTML(todayKey(),i,s,{allowRemove:true})).join('')
    : '<p class="meta">Nothing yet — in any book\'s Reader, bring a note over with one click.</p>';
  let carried='';
  if(cf){
    const open=openSparks().filter(s=>s.dayKey!==todayKey());
    if(open.length) carried = `<h4 style="margin:14px 0 4px">Still open from earlier</h4>`
      + open.map(s=>sparkCardHTML(s.dayKey,s.i,s,{showDay:true})).join('');
  }
  el.innerHTML = desc + toggle + today + carried;
}
export function removeSpark(i){
  const day=plannerDay();
  day.sparks.splice(i,1); persist(); renderPlanSparksBody();
}
export function toggleSparkDone(dayKey, i){
  const day=data.planner[dayKey]; if(!day||!day.sparks[i]) return;
  day.sparks[i].done=!day.sparks[i].done;
  persist();
  if(state.ui==='planner' && state.plannerTool==='sparks') renderPlanSparksBody();
  else if(state.ui==='pastDay' && state.currentPastDay) viewPastDay(state.currentPastDay);
  else if(state.ui==='stillOpen') renderStillOpen();
}
export function toggleCarryForward(){
  data.settings.carryForwardSparks=!data.settings.carryForwardSparks;
  persist(); renderPlanSparksBody();
}
/* The token bar in the backpack. Off by default: tokens are a technical unit
   most visitors never need a word for, and the 👁 marks — which are the part
   that makes the boundary legible — are always on regardless. */
export function toggleContextMeter(){
  if(!data.settings) data.settings={};
  data.settings.showContextMeter=!data.settings.showContextMeter;
  persist();
  if(state.ui==='dataPanel') openDataPanel();
  else if(state.ui==='inventory') openInventory();
}
/* WHETHER THE MODEL YOU ACTUALLY HAVE CAN DO THIS — said here rather than
   discovered by switching it on and getting nothing. Not every model reasons,
   and asking one that cannot used to be an HTTP 400 reported to the visitor as
   "your local AI didn't answer" (measured on llama3.2, 2026-08-10). The
   transport now filters the request; this is the same fact said out loud, so a
   switch that does nothing explains itself instead of looking broken. */
function thinkingCapabilityLine(){
  if(!isAIActive()) return 'Nothing is connected right now, so there is nothing to ask.';
  const can = !!(AI.canThink && AI.canThink());
  const model = esc(AI.model || 'the connected model');
  if(can) return `<b>${model}</b> can reason, so this switch will do something.`;
  const others = (AI.thinkingModels||[]).filter(m=>m!==AI.model).slice(0,3);
  return `<b>${model}</b> does not reason, so this switch will change nothing for it — the Pavilion `
    + `will not ask it to, because being asked is an error rather than something it can ignore.`
    + (others.length ? ` Models here that can: ${others.map(m=>esc(m)).join(', ')}.` : '');
}
/* WATCH THE MODEL THINK. Off by default and read straight out of settings by
   chatOptsFor(), so this function does nothing but flip the flag — there is no
   second place that has to be told, which is the whole reason the setting is
   injected rather than pushed. See the long note in ai/provider.js. */
export function toggleShowThinking(){
  if(!data.settings) data.settings={};
  data.settings.showThinking=!data.settings.showThinking;
  persist();
  if(state.ui==='dataPanel') openDataPanel();
}
// the one place "planning today" and the quiet due-date badge actually
// meet — still nothing that pops up on its own, just here if you came to
// this desk to look. Empty for the ordinary day nothing's due. Stays
// outside the toolbox on purpose — see WRITING-DESK-PLAN.md step 4.
// One icon vocabulary for everything upcomingItems() returns, so the
// Writing Desk's due line, the Upcoming panel, and anywhere else stay
// consistent as new kinds (like calendar events) get folded in.
function upcomingIcon(kind){ return kind==='course'?'📚':kind==='event'?'📅':'📝'; }
function renderPlanUpcoming(){
  const today=todayKey();
  const horizon=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  const soon=upcomingItems().filter(i=>i.due<=horizon);
  const el=document.getElementById('planUpcoming');
  if(!soon.length){ el.innerHTML=''; return; }
  el.innerHTML = `<div class="meta" style="margin-top:-6px">${soon.map(i=>{
    const overdue=i.due<today, dueToday=i.due===today;
    const label=i.kind==='event'&&i.start?`${dueToday?'today':i.due} at ${i.start}`:(overdue?'overdue':dueToday?'due today':'due '+i.due);
    return `${upcomingIcon(i.kind)} <b>${esc(i.title)}</b> — ${esc(label)}`;
  }).join(' &nbsp;·&nbsp; ')}</div>`;
}
function pastDays(){ return Object.keys(data.planner).filter(k=>k!==todayKey()).sort().reverse(); }
function renderPastDaysBody(){
  const keys=pastDays();
  const el=document.getElementById('planToolBody'); if(!el) return;
  const desc=`<div class="meta">Every day you've kept is still here — nothing is overwritten, only added to.</div>`;
  const list=keys.length ? keys.map(k=>{
    const d=data.planner[k];
    const tended=d.blocks.filter(b=>b.state==='tended').length;
    const preview=d.ember||d.intention||'(no entry written)';
    return `<div class="card" onclick="viewPastDay('${k}')">
      <div class="t">${esc(k)} <span class="badge">${tended}/${d.blocks.length} tended</span></div>
      <div class="s">${esc(preview.length>110?preview.slice(0,110)+'…':preview)}</div>
    </div>`;
  }).join('') : '<p>Nothing further back yet — this is the first day kept at this desk.</p>';
  el.innerHTML = desc + list;
}
export function viewPastDay(key){
  const d=data.planner[key]; if(!d) return;
  state.currentPastDay=key;
  const panel=document.querySelector('#pastDayOv .panel');
  panel.classList.remove('bookPanel'); void panel.offsetWidth; panel.classList.add('bookPanel');
  panel.innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>${esc(key)}</h2>
    <div class="meta">${esc(d.intention||'(no intention set that day)')}</div>
    <div class="blocks">${d.blocks.map(b=>`
      <div class="blk ${b.state}">${esc(b.name)}
        <div class="st">${b.state==='waiting'?'· waiting':b.state==='tended'?'🔥 tended':'🌙 rested'}</div>
      </div>`).join('')}</div>
    ${(d.sparks&&d.sparks.length) ? `<h3>Sparks from reading</h3>
    ${d.sparks.map((s,i)=>sparkCardHTML(key,i,s)).join('')}` : ''}
    <h3>The page</h3>
    <p>${esc(d.ember||'(nothing written that day)')}</p>
    <div class="row" style="margin-top:14px">
      <button class="btn ghost" onclick="backToPlanner()">← Back to the desk</button>
    </div>`;
  state.ui='pastDay'; hideAllOv(); showOv('pastDayOv');
}
export function backToPlanner(){ openPlanner(); }
function renderBlocksBody(){
  const day=plannerDay();
  const el=document.getElementById('planToolBody'); if(!el) return;
  el.innerHTML = `<div class="blocks">${day.blocks.map((b,i)=>`
    <div class="blk ${b.state}" onclick="cycleBlock(${i})">
      ${esc(b.name)}
      <div class="st">${b.state==='waiting'?'· waiting':b.state==='tended'?'🔥 tended':'🌙 rested'}</div>
    </div>`).join('')}</div>`;
}
export function cycleBlock(i){
  const day=plannerDay();
  const order=['waiting','tended','rested'];
  day.blocks[i].state = order[(order.indexOf(day.blocks[i].state)+1)%3];
  renderBlocksBody(); persist(); blip(620,.04,'square',.03);
}
export function savePlanner(announce){
  const day=plannerDay();
  day.intention=document.getElementById('planIntent').value;
  day.ember=document.getElementById('planEmber').value;
  persist();
  if(announce){ document.getElementById('planSaved').textContent='Saved · '+todayKey(); blip(784,.08); awardBadge('first-plan'); }
}

/* ----- My Notes — a real filing cabinet at the Writing Desk, separate
   from today's page: freeform, named, kept across days, for anything
   that isn't tied to one specific date. Asked for directly, 2026-07-09
   ("the ability to file papers and make notes... store those notes and
   look at them in a friendly user interface") alongside the page-first
   redesign above. Deliberately its own small `data.notes` list, not the
   bigger cross-app file-tree idea WRITING-DESK-PLAN.md explicitly keeps
   out of scope — this is one desk's own drawer, not a rebuild of how
   Research Desk/Grant Desk/book notes work. */
function newNoteId(){ return Date.now()+'-'+Math.random().toString(36).slice(2,7); }
export function createNote(){
  const note={id:newNoteId(), title:'Untitled note', body:'', created:todayKey(), updated:todayKey()};
  data.notes.unshift(note);
  persist(); logActivity('Started a new note at the Writing Desk.'); awardBadge('first-note');
  state.plannerNoteView={mode:'edit', id:note.id};
  renderNotesBody();
}
export function openNote(id){
  state.plannerNoteView={mode:'edit', id};
  renderNotesBody();
}
export function backToNotesList(){
  state.plannerNoteView={mode:'list'};
  renderNotesBody();
}
export function deleteNote(id){
  const note=data.notes.find(n=>n.id===id); if(!note) return;
  const sure=window.confirm('Delete "'+(note.title||'Untitled note')+'"? This cannot be undone.');
  if(!sure) return;
  data.notes=data.notes.filter(n=>n.id!==id);
  persist();
  state.plannerNoteView={mode:'list'};
  renderNotesBody();
}
/* A note can hold its own bullet-journal log too (the user's ask) — turning a
   note into a living "collection" (a topic you keep tasks/events/notes under),
   the BuJo idea beyond the daily page. Same • task / ○ event / — note vocabulary
   as the Writing Desk, stored per note in note.log. */
function noteLogHtml(note){
  const log=note.log||[], kind=state.noteLogKind||'task';
  return `<div style="margin-top:14px;border-top:1px solid #55432e;padding-top:10px">
    <div class="meta">A bullet-journal log for this note — a <b>•</b> task, an <b>○</b> event, a <b>—</b> note. Makes it a living collection, not just text.</div>
    <div class="row" style="margin-top:6px;flex-wrap:wrap;gap:6px">
      ${BUJO_KINDS.map(k=>`<button class="btn ${k.id===kind?'':'ghost'}" style="font-size:11px;padding:5px 10px" onclick="setNoteLogKind('${k.id}')">${esc(k.label)}</button>`).join('')}
      <input type="text" id="noteLogInput" placeholder="add a ${esc(kind)} — Enter to log" style="flex:1;min-width:150px" onkeydown="if(event.key==='Enter'){event.preventDefault();addNoteLogEntry('${note.id}');}">
      <button class="btn ghost" style="font-size:11px" onclick="addNoteLogEntry('${note.id}')">Add</button>
    </div>
    ${log.length?`<div style="margin-top:8px">${log.map(e=>{
      const isTask=e.kind==='task';
      return `<div class="row" style="align-items:center;gap:8px;margin-top:3px">
        <span style="flex:1;${e.done?'opacity:.55;text-decoration:line-through':''}"><b style="cursor:${isTask?'pointer':'default'};color:#e0a43c" ${isTask?`onclick="toggleNoteLogItem('${note.id}',${e.id})"`:''}>${bujoSig(e)}</b> ${esc(e.text)}</span>
        <button class="btn ghost" style="font-size:10px;padding:2px 8px" onclick="removeNoteLogItem('${note.id}',${e.id})">✕</button>
      </div>`;
    }).join('')}</div>`:''}`;
}
/* A note is now edited in TWO places that share one data.notes store: the
   Writing Desk's My Notes drawer (renderNotesBody) and the central Your Notes
   hub's inline editor (renderNotesLogEditor). These note-mutating handlers are
   fired from whichever is open, so they re-render through refreshNoteEditors()
   rather than assuming one target — one note, editable from either door. */
function refreshNoteEditors(){
  if(state.ui==='notesLog') renderNotesLog();
  else renderNotesBody();
}
export function setNoteLogKind(k){ state.noteLogKind=k; refreshNoteEditors(); setTimeout(()=>document.getElementById('noteLogInput')?.focus(),20); }
export function addNoteLogEntry(noteId){
  const note=data.notes.find(n=>n.id===noteId); if(!note) return;
  const inp=document.getElementById('noteLogInput'); const text=(inp&&inp.value||'').trim(); if(!text) return;
  if(!note.log) note.log=[];
  note.log.push({id:Date.now(), text, kind:state.noteLogKind||'task', done:false});
  note.updated=todayKey(); persist(); refreshNoteEditors();
  setTimeout(()=>document.getElementById('noteLogInput')?.focus(),20);
}
export function toggleNoteLogItem(noteId,id){
  const note=data.notes.find(n=>n.id===noteId); if(!note) return;
  const e=(note.log||[]).find(x=>x.id===id); if(!e||e.kind!=='task') return;
  e.done=!e.done; note.updated=todayKey(); persist(); refreshNoteEditors();
}
export function removeNoteLogItem(noteId,id){
  const note=data.notes.find(n=>n.id===noteId); if(!note) return;
  note.log=(note.log||[]).filter(x=>x.id!==id); note.updated=todayKey(); persist(); refreshNoteEditors();
}
/* ----- Link a note to a book you're carrying, down to a page or a chapter
   (the user's ask). The link lives on the note (note.book={slug,page,chapter}),
   points at a book in your Inventory, and "▸ Open the book" jumps straight to
   that page (in the full text) or opens the book at its chapters. Shared by both
   note editors via noteBookLinkHtml so the feature is identical wherever you
   edit. Reading and note-taking stop being separate rooms. */
function noteBookLinkHtml(note){
  const inv=carriedOf(carryList(),'book').map(e=>Store.getDoc(e.ref)).filter(Boolean);
  if(note.book && note.book.slug){
    const d=Store.getDoc(note.book.slug);
    const title=d?d.title:note.book.slug;
    const chapters=d?(d.doc.sections||[]).map(s=>s.heading):[];
    const pageBit = note.book.page ? ' · page '+note.book.page : '';
    const chapBit = note.book.chapter ? ' · '+note.book.chapter : '';
    return `<div style="margin-top:14px;border-top:1px solid #55432e;padding-top:10px">
      <div class="meta">🔗 Linked book</div>
      <div class="card" style="cursor:default;margin-top:6px;border-color:#8fb4d9">
        <div class="t">📖 ${esc(title)}${esc(pageBit)}${esc(chapBit)}</div>
        <div class="row" style="margin-top:8px;gap:6px;flex-wrap:wrap">
          <button class="btn ghost" style="font-size:11px" onclick="openLinkedBook('${note.id}')">▸ Open the book</button>
          <button class="btn ghost" style="font-size:11px;border-color:#b56f6f;color:#e0a0a0" onclick="unlinkNoteBook('${note.id}')">✕ Unlink</button>
        </div>
        <div class="row" style="margin-top:8px;gap:6px;flex-wrap:wrap;align-items:center">
          <label style="margin:0">Page</label>
          <input type="number" min="1" value="${note.book.page||''}" placeholder="—" style="width:78px"
            onchange="setNoteBookPage('${note.id}',this.value)">
          ${chapters.length?`<label style="margin:0 0 0 10px">Chapter</label>
          <select onchange="setNoteBookChapter('${note.id}',this.value)" style="max-width:220px">
            <option value="">— none —</option>
            ${chapters.map(h=>`<option${h===note.book.chapter?' selected':''}>${esc(h)}</option>`).join('')}
          </select>`:''}
        </div>
      </div>
    </div>`;
  }
  if(!inv.length) return `<div style="margin-top:14px;border-top:1px solid #55432e;padding-top:10px">
    <div class="meta">🔗 Link a book — you're not carrying one yet. Open a book and press <b>🎒 Take with you</b>, then it can be linked to this note.</div></div>`;
  return `<div style="margin-top:14px;border-top:1px solid #55432e;padding-top:10px">
    <div class="meta">🔗 Link this note to a book you're carrying</div>
    <div class="row" style="margin-top:6px;gap:6px;align-items:center;flex-wrap:wrap">
      <select id="noteBookPick_${note.id}" style="max-width:240px">
        ${inv.map(d=>`<option value="${esc(d.slug)}">${esc(d.title)}</option>`).join('')}
      </select>
      <button class="btn ghost" style="font-size:11px" onclick="linkNoteBook('${note.id}')">Link</button>
    </div>
  </div>`;
}
/* The general pathway the user asked for: a lesson saved into Notes (or any note
   you've written) can be handed to the local AI to shape into a LESSON PLAN.
   "get them out into notes, then build a pathway for the local AI to make lesson
   plans out of them." Shared by both note editors via noteToolsHtml. Graceful
   throughout — no model, empty reply, or dropped connection each say so plainly. */
function noteToolsHtml(note){
  /* Two buttons, and the ORDER is the point: drafting is the optional AI
     convenience, putting it in the tree is what makes a note into something you
     can actually walk. The second needs no model connected at all — a note you
     typed yourself becomes a lesson exactly the same way. */
  const linked=note.lesson&&curriculumNode(note.lesson);
  return `<div class="row" style="margin-top:12px;gap:6px;flex-wrap:wrap">
    ${linked
      ? `<button class="btn ghost" style="font-size:11.5px" onclick="openLessonFromNote('${note.id}')">🌳 It\u2019s in the tree \u2014 open it</button>`
      : `<button class="btn ghost" style="font-size:11.5px" onclick="lessonFromPlanNote('${note.id}')" title="Turn this note into a lesson you can tick off and pick up">🌳 Put this in the tree</button>`}
    <button class="btn ghost" style="font-size:11.5px" onclick="draftLessonPlanFromNote('${note.id}')">✨ Make a lesson plan from this note (AI)</button>
  </div>`;
}
export async function draftLessonPlanFromNote(noteId){
  const note=data.notes.find(n=>n.id===noteId); if(!note) return;
  const el=document.getElementById('noteSaved');
  const text=(note.body||'').trim();
  if(!text){ if(el) el.textContent='Write something in the note first — then I can shape a plan from it.'; return; }
  if(!isAIActive()){ if(el) el.textContent='Connect a local AI (⚙ Manage AI connections) to draft a plan from this note.'; return; }
  if(el) el.textContent='Your local AI is drafting a lesson plan from this note…';
  try{
    const reply=await AI.chat([
      {role:'system', content:WORK_CHARTER+'\n\nTurn the learner\'s note below into a concrete, personal LESSON PLAN they can follow: a '
        +'one-line goal, a short sequence of study sessions (each with what to do and roughly how long), one small hands-on task per session, '
        +'and a simple way to check understanding at the end. Practical and encouraging, grounded strictly in the note. Plain readable text.'},
      {role:'user', content:(note.title?note.title+'\n\n':'')+text},
    ], {long:true});
    if(isEmptyReply(reply)){ if(el) el.textContent='The model came back empty — a lighter model may do better.'; return; }
    const plan={id:newNoteId(), title:'Lesson plan — '+(note.title||'note'),
      body:'✨ Drafted by your local AI from your note.\n\n'+String(reply).trim(), created:todayKey(), updated:todayKey()};
    data.notes.unshift(plan); persist();
    logActivity('AI drafted a lesson plan from a note.'); blip(660,.08); setTimeout(()=>blip(825,.09),90);
    /* The plan used to end here, as text, and that WAS the dead end. Offer the
       next artifact in the same breath rather than filing it and hoping. */
    if(el) el.innerHTML='✨ Saved a new "Lesson plan" note. '
      +'<button class="btn ghost" style="font-size:11px;padding:2px 8px" onclick="lessonFromPlanNote(\''+plan.id+'\')">🌳 Put it in the tree</button>';
  }catch(e){ if(el) el.textContent='The connection flickered — no plan this time (is your local AI still running?).'; }
}
export function linkNoteBook(noteId){
  const note=data.notes.find(n=>n.id===noteId); if(!note) return;
  const sel=document.getElementById('noteBookPick_'+noteId); const slug=sel&&sel.value; if(!slug) return;
  note.book={slug, page:null, chapter:null}; note.updated=todayKey(); persist();
  const d=Store.getDoc(slug); logActivity('Linked a note to "'+(d?d.title:slug)+'".');
  refreshNoteEditors();
}
export function setNoteBookPage(noteId,val){
  const note=data.notes.find(n=>n.id===noteId); if(!note||!note.book) return;
  const p=parseInt(val,10); note.book.page=(p>0)?p:null; note.updated=todayKey(); persist(); refreshNoteEditors();
}
export function setNoteBookChapter(noteId,val){
  const note=data.notes.find(n=>n.id===noteId); if(!note||!note.book) return;
  note.book.chapter=val||null; note.updated=todayKey(); persist(); refreshNoteEditors();
}
export function unlinkNoteBook(noteId){
  const note=data.notes.find(n=>n.id===noteId); if(!note) return;
  delete note.book; note.updated=todayKey(); persist(); refreshNoteEditors();
}
export async function openLinkedBook(noteId){
  const note=data.notes.find(n=>n.id===noteId); if(!note||!note.book) return;
  const slug=note.book.slug, d=Store.getDoc(slug); if(!d) return;
  state.notesLogEdit=null; state.plannerNoteView={mode:'list'}; // stepping out of the editor into the book
  openReader(slug);
  if(note.book.page && d.doc.fullText){
    await openFullText(slug);
    const v=state.fullTextView;
    if(v){ v.page=Math.min(Math.max(0,note.book.page-1), v.pages.length-1); renderFullTextPage(); }
  }
}
let noteSaveTimer=null;
export function updateNoteField(id, field, value){
  const note=data.notes.find(n=>n.id===id); if(!note) return;
  note[field]=value;
  note.updated=todayKey();
  const label=document.getElementById('noteSaved');
  if(label) label.textContent='saving…';
  clearTimeout(noteSaveTimer);
  noteSaveTimer=setTimeout(()=>{
    persist();
    if(label) label.textContent='saved '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  },600);
}
function renderNotesBody(){
  const el=document.getElementById('planToolBody'); if(!el) return;
  const v=state.plannerNoteView||{mode:'list'};
  if(v.mode==='edit'){
    const note=data.notes.find(n=>n.id===v.id);
    if(!note){ state.plannerNoteView={mode:'list'}; return renderNotesBody(); }
    el.innerHTML = `
      <div class="row" style="margin-bottom:8px;justify-content:space-between">
        <button class="btn ghost" onclick="backToNotesList()">← All notes</button>
        <button class="btn ghost" style="border-color:#b56f6f;color:#e0a0a0" onclick="deleteNote('${note.id}')">✕ Delete</button>
      </div>
      <input type="text" id="noteTitleInput" placeholder="Note title" value="${esc(note.title)}"
        oninput="updateNoteField('${note.id}','title',this.value)">
      <textarea id="noteBodyInput" rows="10" style="margin-top:8px" placeholder="Write here…"
        oninput="updateNoteField('${note.id}','body',this.value)">${esc(note.body)}</textarea>
      <div class="meta" id="noteSaved" style="margin-top:6px"></div>
      ${noteToolsHtml(note)}
      ${noteBookLinkHtml(note)}
      ${noteLogHtml(note)}`;
    return;
  }
  /* WRITING-DESK-PLAN.md step 2 — YOUR OLDER NOTES, AT THE DESK.

     The desk showed only today. Everything you ever wrote was one room
     away, which is fine for a filing cabinet and wrong for a desk: you sit
     down at a desk with your earlier work already on it.

     DELIBERATELY A READER, NOT A SECOND EDITOR. One place a note is written
     (wherever it lives), one place they are all gathered (Your Notes). This
     shows them and opens them; it must never become a third store. The two
     sections below are pure reads of gatherNotes() — nothing new is saved. */
  const all=notesForRules();
  const back=forgottenNotes(all, todayKey(), 3);
  const recent=all.slice(0,5);              // gatherNotes() sorts newest-first by default
  const noteCard=(n,tail)=>`<div class="card" style="cursor:default">
      <div class="s">${esc(n.icon||'🗒')} ${esc(n.where||'')}${tail?' · '+esc(tail):''}</div>
      <div>${esc((n.text||'').length>170?n.text.slice(0,170)+'…':(n.text||'(empty)'))}</div>
      <div class="row" style="margin-top:6px">
        <button class="btn ghost" style="font-size:11px;padding:3px 10px" onclick="openNotesLog('${jsq(n.key)}')">Open it</button>
        ${n.source==='book'?`<button class="btn ghost" style="font-size:11px;padding:3px 10px" onclick="openBookAtNote('${jsq(n.key)}')">📖 Open the book here</button>`:''}
      </div>
    </div>`;
  el.innerHTML = `
    ${back.length ? `<h4 style="margin:0 0 4px">Worth another look</h4>
      <div class="meta" style="margin-top:0">Written and not opened in over ${FORGOTTEN_AFTER_DAYS} days. Nothing is overdue about it — it is only here because you are sitting down.</div>
      ${back.map(x=>noteCard(x.n, x.age+' days ago')).join('')}` : ''}
    ${recent.length ? `<h4 style="margin:${back.length?'14px':'0'} 0 4px">Lately</h4>
      ${recent.map(n=>noteCard(n, n.date||'')).join('')}` : ''}
    <h4 style="margin:14px 0 4px">Your filing cabinet</h4>
    <div class="meta" style="margin-top:0">For anything not tied to one day. The same notes appear in <b>🗒 Your Notes</b> (pause menu), where they can also be searched, filed, and linked to books.</div>
    <div class="row" style="margin:8px 0"><button class="btn" onclick="createNote()">+ New note</button></div>
    ${data.notes.length ? data.notes.map(n=>`
      <div class="card" onclick="openNote('${n.id}')">
        <div class="t">${esc(n.title||'Untitled note')}${n.book?' <span class="badge" style="border-color:#7fa3c7;color:#a9c7e8">📖 linked</span>':''}</div>
        <div class="s">${esc((n.body||'').length>110?n.body.slice(0,110)+'…':(n.body||'(empty)'))} · updated ${esc(n.updated)}</div>
      </div>`).join('') : '<p>No notes filed yet — start one above.</p>'}`;
}

/* ----- Call someone over (Writing Desk) — WRITING-DESK-PLAN.md step 1.

   WHAT THIS REPLACED: one AI panel hardcoded to the Steward, with its
   own system prompt, its own history, and its own error line — the desk
   was the only room in the Pavilion that talked to a resident through
   plumbing nobody else used. Every resident here now answers through
   the same CHAT_AGENTS[key].systemPrompt() they answer with in their
   own room, plus a desk framing on top.

   The steward's reasoning, and it is the design rather than a limit:

     "that way there one at a time and there purposes act like agents
      helping you."

   ONE AT A TIME. A desk with six residents on it is a group chat; a
   desk where you deliberately called ONE over is an assistant. That is
   also the difference between a personality and an agent — an agent is
   chosen for a purpose. So each resident keeps their OWN thread here
   (`byAgent`): calling the Tutor over must never hand her the
   librarian's last four exchanges as if they were her own.

   The roster DERIVES from data/roles.js. Add a resident there with a
   chat prompt and they appear at this desk with no second edit — a
   hand-maintained list that must match another file has drifted three
   times in this repo (hideAllOv, the window exports, Sebastian's
   org chart). test/live/writing-desk.mjs counts the buttons against
   ROLE_KEYS so this cannot quietly rot. */
function deskResidents(){
  return rosterForVisitor().filter(r => CHAT_AGENTS[r.key] && CHAT_AGENTS[r.key].systemPrompt);
}
/* The hub is the default, derived rather than named: roles.js says the
   day belongs to Sebastian ("keeps the visitor's day: the plan, the
   calendar, what is due, what is still open"), and the day is what this
   desk IS. Whoever is marked `hub` there is who is sitting here when
   you open it. */
function deskDefaultAgent(){
  const hub=deskResidents().find(r=>r.hub);
  return hub ? hub.key : (deskResidents()[0]||{key:'steward'}).key;
}
function deskChat(){
  const c = state.plannerChat = state.plannerChat || {};
  if(!c.agent || !CHAT_AGENTS[c.agent]) c.agent = deskDefaultAgent();
  c.byAgent = c.byAgent || {};
  c.byAgent[c.agent] = c.byAgent[c.agent] || {history:[]};
  return c;
}
function deskThread(){ const c=deskChat(); return c.byAgent[c.agent]; }
export function setDeskAgent(key){
  if(!CHAT_AGENTS[key]) return;
  const c=deskChat();
  if(c.agent===key){ return; }
  c.agent=key; deskChat();            // make sure the newcomer has a thread
  blip(560,.05,'sine',.03);
  renderToolbox();                    // the toolbox button names who is here
  renderPlannerAssistBody();
}
/* What the desk is FOR, in the resident's own words from roles.js — so a
   colleague called over knows why, and hands the job on when it is not
   theirs instead of half-doing it. Derived, never written twice. */
function deskFraming(key){
  const r=ROLES[key]; if(!r) return '';
  return "\n\nRIGHT NOW you are not in your own room — the visitor has called you over to their Writing "
    +"Desk, where they sit down to actually work. They came to you specifically for this: "+r.sendMe+". "
    +"They want something concrete they can keep — a line, a list, a draft — not a description of what you "
    +"would do, and not a lecture. Short and usable. If what they ask is plainly a colleague's work, name "
    +"them and say in one line what to ask; that is help, not a refusal.";
}
function plannerContext(){
  const day=plannerDay();
  const blocksSummary=day.blocks.map(b=>`${b.name}: ${b.state}`).join(', ');
  const horizon=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  const soon=upcomingItems().filter(i=>i.due<=horizon);
  const upcoming=soon.length ? soon.map(i=>`- ${i.title} (${i.kind}) due ${i.due}`).join('\n') : '(nothing due in the next week)';
  const recentKeys=pastDays().slice(0,3);
  const recent=recentKeys.length ? recentKeys.map(k=>{
    const d=data.planner[k];
    return `- ${k}: intention "${d.intention||'(none)'}" — ember: "${(d.ember||'(nothing written)').slice(0,140)}"`;
  }).join('\n') : '(no earlier days recorded yet)';
  const sparks=(day.sparks||[]).length
    ? day.sparks.map(s=>`- (from "${s.source}") ${s.text}`).join('\n')
    : '(nothing brought over from reading yet today)';
  return { day, blocksSummary, upcoming, recent, sparks };
}
/* WHAT IS ON THE DESK — the same grounding for whoever was called over,
   because it describes the desk and not the resident. One block, one code
   path; a resident who does not need a line simply ignores it, which is
   cheaper than two prompt builders that drift apart. */
function deskStateBlock(){
  const { day, blocksSummary, upcoming, recent, sparks }=plannerContext();
  const b=deskBook();
  /* The pocketed book is the single most useful fact at this desk and the one
     nothing was told: it is what the visitor is actually holding. It goes to
     WHOEVER was called over, not only to the librarian — the Tutor teaching
     from the page you are on is the point of the room. */
  const book = b
    ? `"${b.doc.title}"${(b.doc.attribution||b.doc.author)?' by '+(b.doc.attribution||b.doc.author):''}, open at ${deskBookWhere(b)}`
    : '(no book on the desk right now)';
  return "\n\nWHAT IS ON THE DESK IN FRONT OF THEM RIGHT NOW. Speak from this; never invent an item "
    +"that is not here. If they have brought sparks over from something they read, those are real signal "
    +"for what is actually on their mind today — weigh them, do not skip past them to the due dates.\n"
    +"The book open in front of them: "+book
    +"\nToday's intention so far: "+(day.intention||'(not set yet)')
    +"\nToday's rhythm blocks: "+blocksSummary
    +"\nSparks brought over from reading today:\n"+sparks
    +"\nWhat's due soon:\n"+upcoming
    +"\nRecent days, for pattern:\n"+recent;
}
async function deskSystemPrompt(key){
  const agent=CHAT_AGENTS[key]||CHAT_AGENTS[deskDefaultAgent()];
  return (await agent.systemPrompt()) + deskFraming(key) + deskStateBlock();
}
export function fillPlannerPrompt(text){ const el=document.getElementById('planAskInput'); if(el){ el.value=text; el.focus(); } }
export async function sendPlannerMessage(){
  const input=document.getElementById('planAskInput');
  const q=input.value.trim(); if(!q) return;
  const c=deskChat(), key=c.agent, thread=c.byAgent[key];
  const who=(ROLES[key]&&ROLES[key].label)||key;
  thread.history.push({role:'user',content:q}); input.value=''; renderPlannerAssistBody();
  try{
    /* chatOptsFor() and not {} — WHATEVER it currently says. It returns the
       same options for everyone since 2026-08-07 (the Monk's special model and
       thinking tier were retired), but the point of routing through it is that
       a resident's options are decided in ONE place. A desk that hardcoded {}
       would be right today and silently wrong the day that changes back. */
    const reply=await AI.chat([{role:'system',content:await deskSystemPrompt(key)}, ...thread.history], chatOptsFor(key));
    thread.history.push({role:'assistant',content:reply}); thread.lastReply=reply;
    logActivity('Called '+who+' over to the Writing Desk.'+elapsedTag());
  }catch(e){
    /* the resident's OWN error line, so a flickering connection sounds like
       the person you were talking to rather than a stray Steward */
    thread.history.push({role:'assistant',content:(CHAT_AGENTS[key]&&CHAT_AGENTS[key].errorLine)
      || (who+"'s connection flickers — no answer this time. Check that your AI connection is still running.")});
  }
  renderPlannerAssistBody();
}
export function usePlannerReplyAsIntention(){
  const t=deskThread(); if(!t||!t.lastReply) return;
  document.getElementById('planIntent').value = t.lastReply.length>140 ? t.lastReply.slice(0,140) : t.lastReply;
  schedulePlanAutosave();
}
function renderPlannerAssistBody(){
  const el=document.getElementById('planToolBody'); if(!el) return;
  const aiOn=isAIActive();
  const c=deskChat(), key=c.agent, t=c.byAgent[key], r=ROLES[key]||{label:key,title:'',duty:''};
  /* The quick start follows WHO IS THERE, derived from their own sendMe line.
     Three fixed day-planning prompts under a librarian is the same silent
     mismatch as a button labelled "Ask the Steward" while the Tutor is
     sitting at the desk — found by taking a screenshot and looking at it. */
  const startPrompt = "I called you over to my Writing Desk for "+(r.sendMe||'help with today')
    +". Given what is on the desk right now, where do we start?";
  /* The picker. Derived from roles.js — see deskResidents(). The visitor
     has as much right to know who does what as the model does, so the one
     who is here says what they are for, in the same words the model gets. */
  const picker=`<div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:8px">${
    deskResidents().map(p=>`<button class="btn ${p.key===key?'':'ghost'}" style="font-size:11px;padding:3px 10px"
      title="${esc(p.title)} — ${esc(p.sendMe)}"
      onclick="setDeskAgent('${p.key}')">${esc(p.label)}${(c.byAgent[p.key]&&c.byAgent[p.key].history.length)?' •':''}</button>`).join('')}</div>
    <div class="meta" style="margin-top:0">${esc(r.label)} — ${esc(r.title)}. Bring them: ${esc(r.sendMe||'')}. One at a time, on purpose; each keeps their own thread.</div>`;
  el.innerHTML = aiOn ? `
    ${picker}
    <div class="row" style="margin-bottom:10px">
      <button class="btn ghost" style="font-size:11.5px" onclick="fillPlannerPrompt('${jsq(startPrompt)}')">Set ${esc(r.label)} to work</button>
      <button class="btn ghost" style="font-size:11.5px" onclick="fillPlannerPrompt('Given what\\'s on this desk, what should I actually focus on today?')">What should I focus on</button>
      <button class="btn ghost" style="font-size:11.5px" onclick="fillPlannerPrompt('Looking at my recent days, what pattern should I adjust?')">Spot a pattern</button>
    </div>
    <div id="planAskHistory">${(t.history||[]).map(h=>`
      <div class="card" style="cursor:default"><div class="t">${h.role==='user'?'You':esc(r.label)}</div><div class="s">${esc(h.content)}</div></div>`).join('')}</div>
    <textarea id="planAskInput" rows="2" placeholder="Ask ${esc(r.label)}, or pick a quick start above…"></textarea>
    <div class="row" style="margin-top:8px">
      <button class="btn" onclick="sendPlannerMessage()">Ask</button>
      ${t.lastReply?`<button class="btn ghost" onclick="usePlannerReplyAsIntention()">📋 Use as today's intention</button>`:''}
    </div>`
    : `${picker}<div class="meta">No local AI connected right now (⚙ Manage AI connections) — nobody can be called over without a live connection.</div>`;
}

/* ----- Courses (the Course Board) ----- */
/* ----- Course Board — categories, search, and archiving (COURSE-BOARD-PLAN.md
   Stage 1). An orthogonal category axis, the same idea as the Library's own
   CATEGORIES, so the board stays browsable past a handful of courses; a
   search box that mirrors the Index panel's pattern; and a real archived
   state distinct from deletion — a walked-or-abandoned course is personal
   history worth keeping, matching this project's instinct that planner days,
   reading notes, and the activity log are all worth keeping. All local,
   personal; nothing here touches sharing (that's Stage 2). */
const COURSE_CATEGORIES = [
  {id:'all',      label:'All'},
  {id:'practice', label:'Practice'},
  {id:'study',    label:'Study'},
  {id:'skill',    label:'Skill'},
  {id:'work',     label:'Work'},
  {id:'health',   label:'Health'},
  {id:'personal', label:'Personal'},
];
const courseCatLabel = id => (COURSE_CATEGORIES.find(c=>c.id===id) || COURSE_CATEGORIES[COURSE_CATEGORIES.length-1]).label;
export function setCourseSearch(v){
  state.courseSearch=v; renderCourses();
  // a full innerHTML rebuild drops the cursor from the box that triggered it;
  // re-focus and restore the caret, exactly as the Index search does
  const inp=document.getElementById('courseSearch');
  if(inp){ inp.focus(); inp.setSelectionRange(v.length, v.length); }
}
export function clearCourseSearch(){ state.courseSearch=''; renderCourses(); }
export function setCourseCategory(id){ state.courseCat=id; state.courseSearch=''; renderCourses(); }
export function toggleArchivedView(){ state.courseShowArchived=!state.courseShowArchived; state.courseSearch=''; renderCourses(); }
export function archiveCourse(id){
  const c=data.courses.find(x=>x.id===id); if(!c) return;
  c.archived=!c.archived; persist(); setHud();
  logActivity((c.archived?'Archived':'Restored')+' course: "'+c.title+'".');
  blip(c.archived?392:523,.06,'sine',.03);
  state.courseView={mode:'list'}; renderCourses();
}
export function openCourses(){
  state.ui='courses'; hideAllOv();
  state.courseView={mode:'list',id:null};
  state.courseSearch=''; state.courseShowArchived=false; state.courseCat=state.courseCat||'all';
  renderCourses(); showOv('courseOv');
}
function renderCourses(){
  const el=document.getElementById('coursePanel');
  const v=state.courseView;
  if(v.mode==='list'){
    const q=(state.courseSearch||'').trim().toLowerCase();
    const cat=state.courseCat||'all';
    const showArch=!!state.courseShowArchived;
    const active=data.courses.filter(c=>!c.archived);
    const archived=data.courses.filter(c=>c.archived);
    const pool=showArch?archived:active;
    const counts={}; active.forEach(c=>{ const k=c.category||'personal'; counts[k]=(counts[k]||0)+1; });
    let shown=pool;
    if(q) shown=pool.filter(c=>c.title.toLowerCase().includes(q)||(c.why||'').toLowerCase().includes(q));
    else if(!showArch && cat!=='all') shown=pool.filter(c=>(c.category||'personal')===cat);
    const card=c=>{
      const done=c.steps.filter(s=>s.done).length, pct=c.steps.length?Math.round(done/c.steps.length*100):0;
      return `<div class="card" onclick="openCourse(${c.id})">
        <div class="t">${esc(c.title)} <span class="badge">${esc(courseCatLabel(c.category||'personal'))}</span> <span class="badge lic">${done}/${c.steps.length} steps</span></div>
        <div class="s">${esc(c.why||'')}${c.due?' · due '+esc(c.due):''}</div>
        <div class="prog"><div style="width:${pct}%"></div></div>
      </div>`;
    };
    const emptyMsg = q ? 'No course matches that search.'
      : showArch ? 'No archived courses yet — finished or set-aside paths will collect here.'
      : cat!=='all' ? 'No courses in this category yet.'
      : 'The board is bare. Pin your first path.';
    el.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>The Course Board${showArch?' · Archived':''} ${visBadge('private')}<button class="btn ghost" style="font-size:11px;padding:2px 8px;margin-left:6px" onclick="openCommonsTable()" title="Share one at the Commons Table, in the Cafe">🤝 share one</button></h2>
      <div class="meta">Paths you set for yourself. The board confers nothing — the walking is the credential.</div>
      ${data.courses.length>4 ? `<input type="text" id="courseSearch" placeholder="Search your courses…"
        value="${esc(state.courseSearch||'')}" oninput="setCourseSearch(this.value)" style="margin-top:12px">` : ''}
      ${q ? `<div class="meta" style="margin:8px 0 0">Matching "${esc(state.courseSearch)}".
        <button class="btn ghost" style="font-size:11px;padding:3px 10px;margin-left:6px" onclick="clearCourseSearch()">✕ clear</button></div>` : ''}
      ${showArch ? '' : `<div class="row" style="margin:12px 0${q?';opacity:.4':''}">
        ${COURSE_CATEGORIES.map(c=>{
          const n = c.id==='all' ? active.length : (counts[c.id]||0);
          return `<button class="btn ${c.id===cat&&!q?'':'ghost'}" style="font-size:11.5px;padding:6px 12px"
            onclick="setCourseCategory('${c.id}')">${esc(c.label)} <span class="badge">${n}</span></button>`;
        }).join('')}
      </div>`}
      ${shown.map(card).join('') || `<p>${emptyMsg}</p>`}
      <div class="meta" style="margin-top:16px">Want a guided path rather than one you set yourself? The
        <b>Learning Tree</b> is the Pavilion's own curriculum — start at a 101 and climb.</div>
      <div class="row" style="margin-top:6px"><button class="btn ghost" onclick="openLearningTree()">🌳 Open the Learning Tree</button></div>
      <div class="row" style="margin-top:14px">
        ${showArch
          ? `<button class="btn ghost" onclick="toggleArchivedView()">← Back to active courses</button>`
          : `<button class="btn" onclick="newCourseForm()">+ Pin a new course</button>
             ${isAIActive()?'<button class="btn ghost" onclick="newCourseAIForm()">✨ Draft a course with AI</button>':''}
             ${archived.length?`<button class="btn ghost" onclick="toggleArchivedView()">🗄 Archived (${archived.length})</button>`:''}`}
      </div>`;
    if(q){ const inp=document.getElementById('courseSearch'); if(inp){ inp.focus(); inp.setSelectionRange(state.courseSearch.length, state.courseSearch.length); } }
  }
  else if(v.mode==='draftAI'){
    el.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>Draft a Course with AI</h2>
      <div class="meta">Describe a goal and the assistant drafts a title, a reason, and a step-by-step
        outline. Nothing is saved until you review it on the next screen and choose to pin it.</div>
      <label>What's this course for?</label>
      <textarea id="ncGoal" rows="3" placeholder="e.g. A daily meditation and study practice I can actually stick to"></textarea>
      <div id="ncDraftMsg" class="meta"></div>
      <div class="row" style="margin-top:14px">
        <button class="btn" id="ncDraftBtn" onclick="draftCourseWithAI()">✨ Draft with AI</button>
        <button class="btn ghost" onclick="backToList()">← Back</button>
      </div>`;
  }
  else if(v.mode==='new'){
    el.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>Pin a New Course</h2>
      <div class="meta">${v.draftTitle
        ? '✨ Drafted by AI — review and edit anything below before pinning it.'
        : `One line per step. Add a practice after a |, and an optional link after a
        second | for anything the step points outward to:<br>
        <b>Read the Inner Chapters | one chapter each morning</b><br>
        <b>Learn indexing | read it front to back | https://use-the-index-luke.com/</b>`}</div>
      <label>Course title</label>
      <input type="text" id="ncTitle" value="${esc(v.draftTitle||'')}" placeholder="e.g. Four Weeks with the Breath">
      <label>Why this path (optional)</label>
      <input type="text" id="ncWhy" value="${esc(v.draftWhy||'')}" placeholder="What is this course for?">
      <label>Category — just for keeping the board browsable, not a claim about the course</label>
      <select id="ncCat" style="width:100%;background:#1b140d;border:2px solid #55432e;border-radius:7px;color:#f5e9d4;font-family:inherit;font-size:13.5px;padding:9px 11px">${COURSE_CATEGORIES.filter(c=>c.id!=='all').map(c=>
        `<option value="${c.id}" ${(v.draftCat||'personal')===c.id?'selected':''}>${c.label}</option>`).join('')}</select>
      <label>Steps — one per line</label>
      <textarea id="ncSteps" rows="7" placeholder="Sit ten minutes daily | breath counting
Read Anapanasati overview
Extend to fifteen minutes | note what changes
Write a logbook entry in the desk">${esc(v.draftSteps||'')}</textarea>
      <label>Due date (optional — entirely up to you)</label>
      <input type="date" id="ncDue" value="${esc(v.draftDue||'')}">
      <div class="row" style="margin-top:14px">
        <button class="btn" onclick="createCourse()">Pin to the board</button>
        <button class="btn ghost" onclick="backToList()">← Back</button>
      </div>`;
  }
  else if(v.mode==='detail'){
    const c=data.courses.find(x=>x.id===v.id); if(!c){ state.courseView={mode:'list'}; return renderCourses(); }
    const done=c.steps.filter(s=>s.done).length, pct=c.steps.length?Math.round(done/c.steps.length*100):0;
    el.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>${esc(c.title)}${c.archived?' <span class="badge">archived</span>':''}</h2>
      <div class="meta">${esc(c.why||'')} · begun ${esc(c.begun)}${c.due?' · due '+esc(c.due):''} · ${esc(courseCatLabel(c.category||'personal'))}</div>
      <div class="prog"><div style="width:${pct}%"></div></div>
      <div style="margin-top:12px">
        ${c.steps.map((s,i)=>`
          <div class="step ${s.done?'done':''}" onclick="toggleStep(${c.id},${i})">
            <div class="box">${s.done?'✓':''}</div>
            <div><div class="tt">${esc(s.title)}</div>${s.practice?`<div class="pp">${esc(s.practice)}</div>`:''}</div>
            ${s.url?`<a class="link" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">→ visit</a>`:''}
          </div>`).join('')}
      </div>
      ${pct===100?'<p style="color:#ffd98a;margin-top:12px">The path is walked. Everything turns to sand — pin another when you’re ready.</p>':''}
      <label style="margin-top:14px">Due date (optional)</label>
      <div class="row"><input type="date" id="cDueEdit" value="${esc(c.due||'')}" style="max-width:200px">
        <button class="btn ghost" onclick="setCourseDue(${c.id})">Set</button></div>
      <label style="margin-top:10px">Category</label>
      <div class="row"><select id="cCatEdit" style="max-width:200px;background:#1b140d;border:2px solid #55432e;border-radius:7px;color:#f5e9d4;font-family:inherit;font-size:13.5px;padding:8px 10px">${COURSE_CATEGORIES.filter(k=>k.id!=='all').map(k=>
        `<option value="${k.id}" ${(c.category||'personal')===k.id?'selected':''}>${k.label}</option>`).join('')}</select>
        <button class="btn ghost" onclick="setCourseCat(${c.id})">Set</button></div>
      <div class="row" style="margin-top:14px">
        <button class="btn ghost" onclick="backToList()">← All courses</button>
        <button class="btn ghost" onclick="archiveCourse(${c.id})">${c.archived?'♻ Restore':'🗄 Archive'}</button>
        <button class="btn ghost" onclick="removeCourse(${c.id})">Delete</button>
      </div>`;
  }
}
export function setCourseDue(id){
  const c=data.courses.find(x=>x.id===id); if(!c) return;
  c.due=document.getElementById('cDueEdit').value||null;
  persist(); setHud(); renderCourses();
}
export function setCourseCat(id){
  const c=data.courses.find(x=>x.id===id); if(!c) return;
  c.category=document.getElementById('cCatEdit').value||'personal';
  persist(); blip(523,.05,'sine',.03); renderCourses();
}
function backToList(){ state.courseView={mode:'list'}; renderCourses(); }
export function openCourse(id){ state.courseView={mode:'detail',id}; renderCourses(); }
export function newCourseForm(){ state.courseView={mode:'new'}; renderCourses(); }

/* ----- AI-drafted courses — the "auto-fill a lesson plan" path. The
   assistant only ever proposes a draft into the same Pin-a-New-Course
   form a human fills by hand; nothing saves to the board until the
   visitor reviews it and clicks Pin themselves, same human-in-the-loop
   shape as every other AI feature here. */
export function newCourseAIForm(){ state.courseView={mode:'draftAI'}; renderCourses(); }
function courseDraftSystemPrompt(){
  return WORK_CHARTER
    +"\n\nYou help a visitor turn a goal into a self-directed course outline for the Sand Pavilion's "
    +"Course Board — practical, concrete steps they can actually follow, not vague inspiration. The "
    +"goal can be about anything at all — a trade, a language, a business skill, a craft, a fitness "
    +"plan, a contemplative practice — draft the course the goal actually calls for, never steering it "
    +"toward spirituality unless the goal itself is spiritual. Given "
    +"their goal, respond in EXACTLY this format and nothing else — no preamble, no closing remarks, "
    +"no markdown formatting:\n\n"
    +"TITLE: <a short course title>\n"
    +"WHY: <one sentence on what this course is for>\n"
    +"CATEGORY: <exactly one of: practice, study, skill, work, health, personal — whichever best fits>\n"
    +"STEPS:\n"
    +"<step title> | <the practice for that step>\n"
    +"<step title> | <the practice for that step>\n"
    +"(4 to 8 steps total, one per line, each in that exact \"title | practice\" shape — never invent "
    +"a URL; only add a second | with a link if the visitor's goal already named a real one)";
}
function parseAIDraftedCourse(text){
  const titleM=text.match(/^TITLE:\s*(.+)$/mi);
  const whyM=text.match(/^WHY:\s*(.+)$/mi);
  const catM=text.match(/^CATEGORY:\s*([a-z]+)/mi);
  let category = catM ? catM[1].trim().toLowerCase() : 'personal';
  if(!COURSE_CATEGORIES.some(c=>c.id===category && c.id!=='all')) category='personal';
  const stepsM=text.match(/STEPS:\s*\n([\s\S]*)/i);
  const steps=stepsM ? stepsM[1].split('\n')
    // small local models are inconsistent about markdown decoration around
    // the requested "title | practice" shape — bold markers, a leading
    // bullet/number, or a stray table-style leading pipe all show up in
    // practice. Strip the decoration, not the content.
    .map(l=>l.trim().replace(/\*\*/g,'').trim()
      .replace(/^[-*•|]\s*/,'').replace(/^\d+[.)]\s*/,'').replace(/\*$/,'').trim())
    // they also sometimes tack on a conversational aside after the list
    // ("Would you like me to clarify...?") — not a real step, drop any
    // line with no pipe that reads like a question rather than a title.
    .filter(l=>l && !(!l.includes('|') && /\?$/.test(l)))
    .join('\n') : '';
  return { title:titleM?titleM[1].trim():'', why:whyM?whyM[1].trim():'', category, steps };
}
async function draftCourseFromGoal(goal, opts){
  const reply=await AI.chat(
    [{role:'system',content:courseDraftSystemPrompt()},{role:'user',content:goal}], {long:true, ...opts});
  const draft=parseAIDraftedCourse(reply);
  return (draft.title && draft.steps) ? draft : null;
}
export async function draftCourseWithAI(){
  const goal=document.getElementById('ncGoal').value.trim();
  const msg=document.getElementById('ncDraftMsg');
  if(!goal){ msg.textContent='Describe a goal first.'; return; }
  msg.textContent='Drafting…';
  try{
    const draft=await draftCourseFromGoal(goal);
    if(!draft){
      msg.textContent="Couldn't quite parse a course from that reply — try rephrasing the goal, or write it by hand instead.";
      return;
    }
    state.courseView={mode:'new', draftTitle:draft.title, draftWhy:draft.why, draftCat:draft.category, draftSteps:draft.steps};
    renderCourses(); blip(784,.09);
  }catch(e){
    msg.textContent="The connection flickered — no draft this time. Check that your AI connection is still running.";
  }
}
/* ----- Drafting a plan from mid-conversation with Quill — reuses the
   exact same drafting engine as the Course Board's own "Draft with AI"
   form, just seeded from the conversation instead of a typed goal. Lands
   on the same review-before-pinning screen; nothing is saved without the
   visitor choosing to pin it. Lives on Quill, not the Monk — 2026-07-09
   direct instruction: the Monk is a chat-only resident for spiritual
   questions and helping visitors find their own intentions; turning a
   conversation into an actual saved plan is Quill's work, alongside the
   Library and daily-life help she already does. */
export async function draftTrainingPlanFromChat(){
  const d=state.dialog; if(!d||!d.chat) return;
  const btn=document.getElementById('chatTrainBtn');
  if(btn){ btn.disabled=true; btn.textContent='Drafting…'; }
  const convo=d.transcript.map(m=>(m.from==='user'?'Visitor':d.name)+': '+m.text).join('\n');
  const goal="A visitor has been talking with "+d.name+" at the Sand Pavilion. Based on this real "
    +"conversation, draft a plan — a course, a study plan, or a practice, whichever actually matches "
    +"what they asked about or seem to need — ground it in the specifics discussed, don't invent a "
    +"generic plan unrelated to it:"
    +"\n\n"+convo;
  try{
    const draft=await draftCourseFromGoal(goal, chatOptsFor(d.agent));
    if(btn){ btn.disabled=false; btn.textContent='📋 Draft a plan from this conversation'; }
    if(!draft) return;
    closeDialog();
    openCourses();
    state.courseView={mode:'new', draftTitle:draft.title, draftWhy:draft.why, draftCat:draft.category, draftSteps:draft.steps};
    renderCourses(); blip(784,.09);
  }catch(e){
    if(btn){ btn.disabled=false; btn.textContent='📋 Draft a plan from this conversation'; }
  }
}
export function createCourse(){
  const title=document.getElementById('ncTitle').value.trim();
  const why=document.getElementById('ncWhy').value.trim();
  const category=document.getElementById('ncCat')?.value||'personal';
  const due=document.getElementById('ncDue')?.value||null;
  const steps=document.getElementById('ncSteps').value.split('\n').map(l=>l.trim()).filter(Boolean)
    .map(l=>{ const [t,p,u]=l.split('|').map(s=>s.trim()); return {title:t,practice:p||'',url:safeUrl(u),done:false}; });
  if(!title||!steps.length) return;
  data.courses.unshift({ id:Date.now(), title, why, category, due, steps, begun:todayKey(), archived:false });
  persist(); logActivity('Pinned a new course: "'+title+'".'); awardBadge('first-course'); blip(784,.09); setHud();
  state.courseView={mode:'list'}; renderCourses();
}
export function toggleStep(id,i){
  const c=data.courses.find(x=>x.id===id); if(!c) return;
  c.steps[i].done=!c.steps[i].done; persist();
  blip(c.steps[i].done?740:440,.05,'square',.035);
  renderCourses();
}
export function removeCourse(id){
  data.courses=data.courses.filter(c=>c.id!==id); persist();
  state.courseView={mode:'list'}; renderCourses();
}

/* ----- The Archive Desk (the Workshop) -----
   Personal writing, kept in the same shape the README calls for: a
   title, a license/ownership line, a source, a body — the same four
   questions every Library text already answers, so a page written here
   could one day be shelved there with no schema change, just a choice. */
function slugify(s){ return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')||'entry'; }
let typing=null; // the active typewriter interval, so leaving mid-reveal can't leak one
function stopTyping(){ if(typing){ clearInterval(typing); typing=null; } }
export function openArchive(){ state.ui='archive'; hideAllOv(); state.archiveView={mode:'list',slug:null}; renderArchive(); showOv('archiveOv'); }
function renderArchive(){
  stopTyping();
  const panel=document.querySelector('#archiveOv .panel');
  const v=state.archiveView;
  panel.classList.remove('bookPanel');
  if(v.mode==='list'){
    const docs=data.workshop.docs;
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>The Archive Desk ${visBadge('private')}</h2>
      <div class="meta">Your own words, kept the same way the Library keeps others' — a
        title, a license, a source, a body. Nothing here leaves this device unless you
        choose to shelve it yourself, one day.</div>
      ${docs.length ? `<div class="shelfCase">${docs.map((d,i)=>`
        <div class="spine" style="--hue:${198+i*9}" onclick="openArchiveDoc('${d.slug}')">
          <span class="spineTitle">${esc(d.title)}</span>
        </div>`).join('')}</div>` : '<p>The desk is bare. Write your first entry.</p>'}
      <div class="row" style="margin-top:14px">
        <button class="btn" onclick="newArchiveForm()">+ Write a new entry</button>
        <button class="btn ghost" onclick="newBulkForm()">+ Bulk import</button>
        <button class="btn ghost" onclick="generateQuillReport()">📜 Ask Quill for a memory report</button>
      </div>`;
  } else if(v.mode==='bulk'){
    void panel.offsetWidth; panel.classList.add('bookPanel');
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>Bulk Import</h2>
      <div class="meta">Paste a JSON array of entries, each shaped like
        <code>{"title":"…","license":"…","source":"…","body":"…"}</code>. Every entry lands in
        your own Archive Desk exactly as if you'd written it by hand — this never touches the
        shared Library shelves, which stay a human-reviewed, hand-seeded commons on purpose.</div>
      <div class="meta"><b>Where entries actually come from:</b> type or paste them by hand, or run
        <code>tools/caravan/gutenberg.py</code> (a small local script, no install needed) to pull a
        public-domain book from Project Gutenberg into this exact shape — it only ever talks to
        Gutenberg's own catalog, never an arbitrary web page, on purpose. This is <i>not</i> a general
        web scraper: fetching whatever a program can technically reach isn't the same as being
        allowed to, which is why this only ever points at one named, explicitly reuse-friendly
        source. See <code>LEARNING-PATH.md</code> Stage 9 for the full explanation.</div>
      <textarea id="bulkJson" rows="10" placeholder='[{"title":"First entry","license":"CC0","source":"written here","body":"..."}]'></textarea>
      <div id="bulkMsg" class="meta"></div>
      <div class="row" style="margin-top:14px">
        <button class="btn" onclick="runBulkImport()">Import all</button>
        <button class="btn ghost" onclick="backToArchiveList()">← Back</button>
      </div>`;
  } else if(v.mode==='generating'){
    void panel.offsetWidth; panel.classList.add('bookPanel');
    panel.innerHTML = `
      <h2>Quill's Report</h2>
      <div class="meta">Reading back through what you've asked him so far…</div>
      <p>…</p>`;
  } else if(v.mode==='compose'){
    void panel.offsetWidth; panel.classList.add('bookPanel');
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>A Blank Page</h2>
      <div class="meta">The same questions every shelved text answers: what is it, under
        what license does it travel, and where's it from?</div>
      <label>Title</label>
      <input type="text" id="arcTitle" placeholder="e.g. Notes on the Zhuangzi, first pass">
      <label>License / ownership</label>
      <input type="text" id="arcLicense" placeholder="e.g. © you, all rights reserved · or CC0 · or Public Domain">
      <label>Source</label>
      <input type="text" id="arcSource" placeholder="e.g. written here, at the Workshop desk">
      <label>Body</label>
      <textarea id="arcBodyIn" rows="9" placeholder="Write. One paragraph per line is fine."></textarea>
      <div class="row" style="margin-top:14px">
        <button class="btn" onclick="createArchiveDoc()">Set it on the shelf</button>
        <button class="btn ghost" onclick="backToArchiveList()">← Back</button>
      </div>`;
  } else if(v.mode==='read'){
    const d=data.workshop.docs.find(x=>x.slug===v.slug);
    if(!d){ state.archiveView={mode:'list'}; return renderArchive(); }
    void panel.offsetWidth; panel.classList.add('bookPanel');
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>${esc(d.title)}</h2>
      <div class="meta">License: <b>${esc(d.license||'unspecified')}</b> ·
        Source: <b>${esc(d.source||'unspecified')}</b> · written ${esc(d.created)}</div>
      <div id="arcBody" onclick="skipTyping()" style="min-height:60px;cursor:text"></div>
      ${d.meta ? reportMetaHTML(d.meta) : ''}
      <div class="row" style="margin-top:18px">
        <button class="btn ghost" onclick="backToArchiveList()">← Back to the desk</button>
        <button class="btn ghost" onclick="submitArchiveDocForReview('${d.slug}')">📤 Submit for Library review</button>
        <button class="btn ghost" onclick="deleteArchiveDoc('${d.slug}')">Tear out the page</button>
      </div>`;
    typewriteBody(d.body);
  }
}
function reportMetaHTML(meta){
  return `
    <h3>Metadata</h3>
    <div class="meta"><b>${meta.noteCount}</b> question${meta.noteCount===1?'':'s'} on record · ${esc(meta.dateRange)}</div>
    <div class="meta">Quill's own suggestion for each — you decide, he never deletes anything himself:</div>
    ${meta.suggestions.map(s=>`
      <div class="card">
        <div class="t">${esc(s.suggestion)} <span class="badge">${esc(s.ts)}</span></div>
        <div class="s">${esc(s.text)}</div>
      </div>`).join('')}`;
}
function typewriteBody(body){
  const el=document.getElementById('arcBody'); if(!el) return;
  const paras=String(body).split(/\n+/).filter(Boolean);
  const plain=paras.join('\n\n');
  const full=paras.map(p=>`<p>${esc(p)}</p>`).join('');
  let i=0;
  const step=Math.max(1,Math.floor(plain.length/220)); // short entries type letter-by-letter; long ones jump ahead so it never drags
  el.textContent='';
  typing=setInterval(()=>{
    i+=step;
    if(i>=plain.length){ el.innerHTML=full; stopTyping(); return; }
    el.textContent=plain.slice(0,i)+'▌';
  },14);
}
export function skipTyping(){
  const d=data.workshop.docs.find(x=>x.slug===state.archiveView.slug); if(!d) return;
  stopTyping();
  document.getElementById('arcBody').innerHTML = d.body.split(/\n+/).filter(Boolean).map(p=>`<p>${esc(p)}</p>`).join('');
}
export function newArchiveForm(){ state.archiveView={mode:'compose'}; renderArchive(); }
export function backToArchiveList(){ state.archiveView={mode:'list'}; renderArchive(); }
export function openArchiveDoc(slug){ state.archiveView={mode:'read',slug}; renderArchive(); }
export function createArchiveDoc(){
  const title=document.getElementById('arcTitle').value.trim();
  const body=document.getElementById('arcBodyIn').value.trim();
  if(!title||!body) return;
  const license=document.getElementById('arcLicense').value.trim();
  const source=document.getElementById('arcSource').value.trim();
  let slug=slugify(title), n=1;
  while(data.workshop.docs.some(d=>d.slug===slug)) slug=slugify(title)+'-'+(++n);
  data.workshop.docs.unshift({slug,title,license,source,body,created:todayKey(),category:'personal'});
  persist(); logActivity('Wrote a new Archive Desk entry: "'+title+'".'); awardBadge('first-entry'); blip(784,.09);
  state.archiveView={mode:'read',slug}; renderArchive();
}
export function deleteArchiveDoc(slug){
  data.workshop.docs=data.workshop.docs.filter(d=>d.slug!==slug);
  persist();
  state.archiveView={mode:'list'}; renderArchive();
}
export function newBulkForm(){ state.archiveView={mode:'bulk'}; renderArchive(); }
export function runBulkImport(){
  const raw=document.getElementById('bulkJson').value.trim();
  const msg=document.getElementById('bulkMsg');
  let arr;
  try{ arr=JSON.parse(raw); }catch(e){ msg.textContent='Not valid JSON — nothing imported.'; return; }
  if(!Array.isArray(arr)){ msg.textContent='Expected a JSON array — nothing imported.'; return; }
  let added=0, skipped=0;
  for(const entry of arr){
    const title=String((entry&&entry.title)||'').trim();
    const body=String((entry&&entry.body)||'').trim();
    if(!title||!body){ skipped++; continue; }
    const license=String((entry&&entry.license)||'').trim();
    const source=String((entry&&entry.source)||'').trim();
    let slug=slugify(title), n=1;
    while(data.workshop.docs.some(d=>d.slug===slug)) slug=slugify(title)+'-'+(++n);
    data.workshop.docs.unshift({slug,title,license,source,body,created:todayKey()});
    added++;
  }
  if(added){ persist(); logActivity('Bulk-imported '+added+' '+(added===1?'entry':'entries')+' into the Archive Desk.'); }
  msg.textContent = `Imported ${added} ${added===1?'entry':'entries'}`+(skipped?`, skipped ${skipped} missing a title or body.`:'.');
  blip(added?784:220,.08);
}

/* ----- The Computer — rebuilt 2026-07-08 from a small bespoke panel into
   a real terminal: the same full-screen chat view every resident uses
   (transcript + persistent notes + a side rail), just re-skinned dark/
   monospace and fronted by a JARVIS-style assistant instead of a person
   you walk up to. Reuses openChatDialog's exact plumbing — a "resident"
   here is just a plain object with a name/agent/color/lines, and the
   Computer qualifies as well as any NPC does. */
/* ----- TELL US WHAT HAPPENED (2026-07-28) — the thing that makes beta
   testing actually work, and the piece that was missing.

   The guides told a tester to "tell whoever gave you this", with no way to do
   it. So reports arrive as half-remembered sentences in a chat window, without
   the two facts that would make them actionable: which build, and whether an AI
   was connected.

   Deliberately NOT telemetry. Nothing is sent, nothing is collected, no server
   is contacted. It writes a report onto the clipboard or into a file, which the
   person then chooses to send — or doesn't. The context block is shown in full
   on screen before anything is copied, the same discipline as the prompt
   inspector: you can read exactly what leaves, because the answer is only ever
   "whatever you paste yourself".

   The three questions are the ones from BETA-WATCH-LIST.md, in that order,
   because they are the ones that return information rather than politeness. */
function reportContext(){
  const desktop = !!(window.desktopBridge && window.desktopBridge.isDesktop);
  const ai = isAIActive();
  const books = personalBooks().length;
  const nav = (typeof navigator!=='undefined' && navigator.userAgent) || '';
  const os = /Windows/.test(nav) ? 'Windows' : /Mac/.test(nav) ? 'macOS' : /Linux/.test(nav) ? 'Linux' : 'unknown';
  return [
    /* Derived from package.json by vite.config.js, never typed here. This
       line read 0.1.0-beta.3 while package.json said beta.4, which would
       have put the wrong build number on every bug report from that
       installer. `typeof` guard so a non-bundled import (the smoke suite)
       says "dev" rather than throwing. */
    'Build:      ' + (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'),
    'Running as: ' + (desktop ? 'the installed app' : 'a browser'),
    'System:     ' + os,
    'Local AI:   ' + (ai ? 'connected' : 'not connected'),
    'Own books:  ' + books,
    'Days used:  ' + Object.keys(data.planner||{}).length,
  ].join('\n');
}
export function openReport(){
  state.ui='report'; hideAllOv(); renderReport(); showOv('reportOv');
  setTimeout(function(){ const e=document.getElementById('rpExpected'); if(e) e.focus(); },40);
}
/* Exported so the payload itself can be checked, rather than trusting the
   clipboard — which is exactly the sort of thing that works in a test and not
   on a stranger's machine. */
export function reportText(){
  const g=function(id){ const e=document.getElementById(id); return e?e.value.trim():''; };
  return [
    'SAND PAVILION — a note from a beta tester',
    '',
    'What I expected to happen that didn\'t:',
    g('rpExpected') || '(not answered)',
    '',
    'What happened instead:',
    g('rpHappened') || '(not answered)',
    '',
    'Where I stopped:',
    g('rpStopped') || '(not answered)',
    '',
    'Would I open it again tomorrow, honestly?',
    g('rpAgain') || '(not answered)',
    '',
    '--- context (so the report is useful; nothing here identifies you) ---',
    reportContext(),
  ].join('\n');
}
export async function copyReport(){
  const t=reportText();
  const msg=document.getElementById('rpMsg');
  try{ await navigator.clipboard.writeText(t);
    if(msg) msg.textContent='Copied. Paste it wherever you like — a message, an email, anywhere.';
    blip(700,.07);
  }catch(e){ if(msg) msg.textContent='The clipboard refused. Use "Save it as a file" instead.'; }
}
export async function saveReport(){
  const t=reportText();
  const name='sand-pavilion-note-'+todayKey()+'.txt';
  const msg=document.getElementById('rpMsg');
  if(window.desktopBridge && window.desktopBridge.saveFile){
    const res=await window.desktopBridge.saveFile(name, t);
    if(res && res.canceled) return;
    if(msg) msg.textContent=(res&&res.ok)?'Saved. Send it whenever you like.':'Could not save that file.';
    if(res&&res.ok) blip(700,.07);
    return;
  }
  const blob=new Blob([t],{type:'text/plain'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(url); },800);
  if(msg) msg.textContent='Saved to your Downloads folder.';
}
function renderReport(){
  const el=document.getElementById('reportPanel'); if(!el) return;
  const q=function(id,label,ph){
    return '<label style="margin-top:12px">'+label+'</label>'
      + '<textarea id="'+id+'" rows="2" placeholder="'+esc(ph)+'"></textarea>';
  };
  el.innerHTML =
    '<button class="xbtn" onclick="closeUI()">Esc ✕</button>'
    + '<h2>✍ Tell them what happened</h2>'
    + '<div class="meta">This is a beta, and the most useful thing you can send back is what went wrong or '
    + 'felt odd. <b>Nothing is sent from here.</b> It writes a note you copy or save, and you choose whether '
    + 'to pass it on.</div>'
    + q('rpExpected','What did you expect to happen that didn\'t?','the most useful question there is — what was in your head?')
    + q('rpHappened','What happened instead?','')
    + q('rpStopped','Where did you stop?','not what you thought — where you actually stopped')
    + q('rpAgain','Would you open it again tomorrow, honestly?','"no" is a genuinely useful answer, and it is fine to give it')
    + '<div class="card" style="cursor:default;margin-top:14px">'
    + '<div class="t">What gets included</div>'
    + '<div class="s" style="margin-top:4px">Your answers above, and this — so the report is worth reading. '
    + 'No name, no files, no library contents, nothing that identifies you.</div>'
    + '<pre style="margin-top:8px;background:#0d1117;color:#a9dcf0;border:2px solid #2b4250;border-radius:6px;'
    + 'padding:10px;font-size:12px;white-space:pre-wrap">'+esc(reportContext())+'</pre></div>'
    + '<div class="row" style="margin-top:12px;gap:6px;flex-wrap:wrap">'
    + '<button class="btn" onclick="copyReport()">📋 Copy it</button>'
    + '<button class="btn ghost" onclick="saveReport()">💾 Save it as a file</button>'
    + '</div><div class="meta" id="rpMsg" style="margin-top:8px"></div>';
}
/* ----- SEBASTIAN'S STAND-UP (2026-07-28) — ONE-STEP-AT-A-TIME-PLAN.md, item 1.

   The complaint this answers: *"the Sebastian interface, while very good, is
   not enough for me to use daily."* The diagnosis in the plan is that he ASKS
   and does not BRING. A planner you fill in is work; a colleague who says
   "you've moved this four days running, do you still want it?" is worth showing
   up for.

   So: one question at a time, each answered before the next arrives, and he
   opens by carrying in what Today already knows rather than by presenting an
   empty form. This is the same medicine as the lesson-drafting chain — small
   asks beat one big one — except here the win is entirely on the human side.

   NO AI IS REQUIRED for any of it. The skeleton is deterministic: his questions
   are fixed, the items he brings are computed from saved data. A connected
   model can phrase things more warmly, but nothing here waits on one, which is
   the point for anyone on a laptop that cannot run one. */
export function openStandUp(mode){
  const items=currentDayItems();
  state.standUp={ mode: mode==='evening'?'evening':'morning', i:0, one:'', done:[], items };
  state.ui='standup'; hideAllOv(); renderStandUp(); showOv('standupOv');
  setTimeout(()=>{ const el=document.getElementById('suIn'); if(el) el.focus(); },40);
}
/* Each step is one question. Steps 0 and 1 are his, the rest are the items
   Today found — walked one at a time, each with a real choice, so the visitor
   is answering rather than reading. */
function standUpSteps(){
  const su=state.standUp||{};
  const head = su.mode==='evening'
    ? [{ ask:'What actually happened today?', place:'one line — the true version, not the tidy one', key:'happened' },
       { ask:'Anything still open that you have stopped wanting?', place:'name it and it goes; leave blank and it stays', key:'drop' }]
    : [{ ask:'What has to be true by tonight?', place:'one thing — the thing that would make today count', key:'one' }];
  return head.concat((su.items||[]).map(function(it){ return { item:it }; }));
}
export function standUpAnswer(){
  const su=state.standUp; if(!su) return;
  const el=document.getElementById('suIn');
  const val=el?el.value.trim():'';
  const steps=standUpSteps();
  const step=steps[su.i];
  if(step && step.key && val){
    su.done.push({ q:step.ask, a:val });
    if(step.key==='one'){
      su.one=val;
      const k=todayKey();
      const day=data.planner[k]||(data.planner[k]={ intention:'', ember:'', blocks:DEFAULT_BLOCKS.map(function(n){return {name:n,state:'waiting'};}), sparks:[] });
      if(!day.intention) day.intention=val; else { (day.sparks=day.sparks||[]).push({ text:val, done:false }); }
      persist(); logActivity('Set the day with Sebastian: "'+val+'".');
    }
    if(step.key==='happened'){ logActivity('Closed the day with Sebastian: "'+val+'".'); persist(); }
  }
  su.i++; renderStandUp();
  setTimeout(function(){ const i2=document.getElementById('suIn'); if(i2) i2.focus(); },40);
}
/* "Keep" and "let it go" on a carried item. Letting go is a real action with a
   real effect, because an observation you cannot act on is just a reminder with
   extra steps. */
export function standUpItem(act){
  const su=state.standUp; if(!su) return;
  const steps=standUpSteps(); const step=steps[su.i];
  if(step && step.item){
    if(act==='do'){ const it=step.item; su.i++;
      setTimeout(function(){ closeUI(); if(typeof window[it.fn]==='function'){ it.arg!==undefined?window[it.fn](it.arg):window[it.fn](); } },60);
      return;
    }
    if(act==='drop' && step.item.key==='stale'){
      // clear the oldest carried spark — the thing he just asked about
      const all=openSparks();
      const oldest=all.slice().sort(function(a,b){ return String(a.dayKey).localeCompare(String(b.dayKey)); })[0];
      if(oldest && data.planner[oldest.dayKey] && data.planner[oldest.dayKey].sparks[oldest.i]){
        data.planner[oldest.dayKey].sparks[oldest.i].done=true;
        persist(); logActivity('Let go of "'+(oldest.text||'something carried')+'".');
      }
    }
  }
  su.i++; renderStandUp();
}
export function endStandUp(){ state.standUp=null; closeUI(); }
function renderStandUp(){
  const el=document.getElementById('standupPanel'); if(!el) return;
  const su=state.standUp||{}; const steps=standUpSteps(); const n=steps.length;
  const evening=su.mode==='evening';
  const head='<button class="xbtn" onclick="closeUI()">Esc ✕</button>'
    + '<h2>🤵 '+(evening?'Closing the day':'Sebastian')+'</h2>';

  if(su.i>=n){
    const kept=(su.done||[]).length;
    el.innerHTML = head
      + '<div class="meta">'+(evening
          ? 'Noted, sir. It is on the record and the day can end.'
          : 'That is the shape of it, sir. The rest will keep.')+'</div>'
      + (su.one?'<div class="card" style="cursor:default;margin-top:12px;border-color:#7fa36b">'
          + '<div class="t" style="color:#7fa36b">Today, in one line</div>'
          + '<div class="s" style="margin-top:4px">'+esc(su.one)+'</div>'
          + '<div class="s" style="margin-top:6px;opacity:.8">It is on the Writing Desk.</div></div>':'')
      + '<div class="meta" style="margin-top:12px">'+kept+' answered · nothing here was sent anywhere.</div>'
      + '<div class="row" style="margin-top:14px;gap:6px;flex-wrap:wrap">'
      + '<button class="btn" onclick="openPlanner()">✍ Open the Writing Desk</button>'
      + (evening?'':'<button class="btn ghost" onclick="openStandUp(\'evening\')">🌙 Close the day instead</button>')
      + '<button class="btn ghost" onclick="endStandUp()">Done</button></div>';
    return;
  }

  const step=steps[su.i];
  const progress='<div class="meta" style="margin-top:2px">'+(su.i+1)+' of '+n+'</div>';

  if(step.item){
    const it=step.item;
    const line = it.icon==='⏳' ? 'This one is late, sir.'
      : it.icon==='📌' ? 'This is due today.'
      : it.icon==='🌱' ? 'You were part-way through this.'
      : it.icon==='🔁' ? 'You have carried this a while.'
      : it.icon==='📄' ? 'You brought this in and never pulled it apart.'
      : 'This has been sitting unopened.';
    el.innerHTML = head + progress
      + '<div class="card" style="cursor:default;margin-top:12px">'
      + '<div class="s" style="opacity:.85">'+esc(line)+'</div>'
      + '<div class="t" style="margin-top:6px">'+it.icon+' '+esc(it.title)+'</div>'
      + '<div class="s" style="margin-top:4px">'+esc(it.note)+'</div></div>'
      + '<div class="row" style="margin-top:12px;gap:6px;flex-wrap:wrap">'
      + '<button class="btn" onclick="standUpItem(\'do\')">Do it now</button>'
      + '<button class="btn ghost" onclick="standUpItem(\'keep\')">Keep it for later</button>'
      + (it.key==='stale'?'<button class="btn ghost" style="border-color:var(--danger);color:var(--danger-soft)" onclick="standUpItem(\'drop\')">Let it go</button>':'')
      + '</div>';
    return;
  }

  el.innerHTML = head + progress
    + '<div class="meta" style="margin-top:10px;font-size:14px;color:var(--ink)">'+esc(step.ask)+'</div>'
    + '<div class="row" style="margin-top:10px;gap:6px">'
    + '<input type="text" id="suIn" placeholder="'+esc(step.place||'')+'" style="flex:1" '
    + 'onkeydown="if(event.key===\'Enter\'){event.preventDefault();standUpAnswer();}">'
    + '<button class="btn" onclick="standUpAnswer()">Next</button></div>'
    + '<div class="meta" style="margin-top:8px;opacity:.8">One question at a time, and you can leave any of them blank. '
    + 'Nothing here needs an AI connection, and nothing is sent anywhere.</div>';
}
/* ----- THE DAY (2026-07-28) — one door, and something behind it.

   The whole of WHY-OPEN-IT-TODAY-PLAN.md in one panel. It computes on
   open, from data already saved: nothing runs in the background, nothing
   is stored, and no AI is involved at any point. It is a set of questions
   nobody was asking on the visitor's behalf.

   Deliberately NOT a dashboard. Five items maximum, each one press from
   the thing itself, never empty, and phrased as observation rather than
   demand — "carried for four days, still want it?" instead of a red
   badge. See data/the-day.js for the rules and their reasons. */
export function currentDayItems(){
  return theDayItems({
    today: todayKey(),
    sparks: openSparks(),
    upcoming: upcomingItems(),
    lessons: allNodes(),
    study: data.study||null,          // the path you picked up beats the one we'd guess
    curriculum: data.curriculum||{},
    books: personalBooks(),
    read: data.read||{},
    dissections: (data.hall&&data.hall.dissections)||[],
    catalogue: Store.allDocs(),
    notes: notesForRules(),
  });
}
/* Every note in the Pavilion, in the shape the pure rules in data/the-day.js
   expect — including `seen`, which lives in noteMeta and is what makes
   "not looked at since" mean anything. Shared by ☀ Today and the Writing
   Desk so both ask the same question of the same pile. */
function notesForRules(){
  return gatherNotes().map(function(n){
    return { key:n.key, title:n.title, text:n.text, date:n.date, where:n.where,
             icon:n.icon, source:n.source, slug:n.slug||null,
             seen:(data.noteMeta[n.key]&&data.noteMeta[n.key].seen)||'' };
  });
}
export function openTheDay(){
  state.ui='theday'; hideAllOv(); renderTheDay(); showOv('thedayOv');
}
/* WHAT YOU WROTE TODAY — the near end of the note pathway.

   Until 2026-08-10 a note's only route back into ☀ Today opened after a
   FORTNIGHT. Write six notes in a morning and the day knew about none of
   them. "lets make proper pathways for the notes to be in the logs."

   Deliberately BELOW the five waiting items and visually apart from them:
   these are not asking for anything, they are what you already did. The
   rule that decides which notes count is in data/the-day.js and is pure,
   so npm test holds it.

   AND THE REACH TOGGLE LIVES HERE TOO, which is the other half of the same
   request: "the ai can reach the ones in the back pack with we can toggle
   private or view". The one place you look at today's notes is the right
   place to decide which of them a resident may read — deciding that in a
   settings panel three rooms away is how a privacy control goes unused. */
function writtenTodayBlock(){
  const mine = notesToday(notesForRules(), todayKey());
  if(!mine.length) return '';
  const line = notesTodayLine(notesForRules(), todayKey());
  return '<div class="menuSection" style="margin-top:18px">Written today</div>'
    + '<div class="meta">' + esc(line) + ' — already done, not waiting on you. '
    + 'The badge is what a resident may read; press it to change your mind.</div>'
    + mine.map(function(n){
        return '<div class="card" style="cursor:default">'
          /* ALWAYS SHOW THE STATE HERE, even the default one. reachBadge()
             stays silent on `askable` because a badge on every row would be
             noise in a long list — right there, wrong here. This block says
             "the badge is what a resident may read", and a note with NO
             badge beside one marked Sealed reads as "unknown", not as
             "askable". Read off the screenshot. */
          + '<div class="t">🗒 ' + esc(n.title || 'A note') + ' ' + reachState(n.key) + '</div>'
          + '<div class="s" style="margin-top:4px">' + esc(String(n.text || '').slice(0, 160))
          + (String(n.text || '').length > 160 ? '…' : '') + '</div>'
          + '<div class="row" style="margin-top:8px">'
          + '<button class="btn ghost" style="font-size:11.5px;padding:3px 10px" '
          + 'onclick="openNotesLog(\'' + jsq(n.key) + '\')">open it</button>'
          + '<button class="btn ghost" style="font-size:11.5px;padding:3px 10px" '
          + 'onclick="toggleNoteSeal(\'' + jsq(n.key) + '\');openTheDay()">'
          + (noteReachOf(n.key)==='sealed' ? '🔎 let a resident read it' : '🔒 keep it private')
          + '</button></div></div>';
      }).join('');
}

function renderTheDay(){
  const el=document.getElementById('thedayPanel'); if(!el) return;
  const items=currentDayItems();
  el.innerHTML =
    '<button class="xbtn" onclick="closeUI()">Esc ✕</button>'
    + '<h2>☀ Today</h2>'
    + '<div class="meta">What is actually waiting for you — worked out just now from what is already '
    + 'saved here. Nothing ran in the background, and no AI was involved.</div>'
    + items.map(function(it){
        var act = it.arg!==undefined
          ? it.fn+'(\''+esc(String(it.arg)).replace(/'/g,'')+'\')'
          : it.fn+'()';
        return '<div class="card" style="cursor:pointer" onclick="'+act+'">'
          + '<div class="t">'+it.icon+' '+esc(it.title)+'</div>'
          + '<div class="s" style="margin-top:4px">'+esc(it.note)+'</div></div>';
      }).join('')
    + '<div class="meta" style="margin-top:14px;opacity:.85">Five at most, on purpose. A list of everything '
    + 'outstanding is a guilt inventory, and that is the opposite of a habit. The rest is where it always was.</div>'
    + writtenTodayBlock()
    + '<div class="row" style="margin-top:12px;gap:6px;flex-wrap:wrap">'
    + '<button class="btn" onclick="openStandUp()">🤵 Walk it through with Sebastian</button>'
    + '<button class="btn ghost" onclick="openPlanner()">✍ The Writing Desk</button>'
    + '<button class="btn ghost" onclick="openLearningTree()">🌳 The tree</button>'
    + '<button class="btn ghost" onclick="openComputer()">🖥 The index</button>'
    + '</div>';
}
/* ----- THE COMPUTER, rebuilt 2026-07-28 as a real terminal index.

   Asked for directly: "change the computer to be a useful index for the library
   and then also for the papers, in a more digitized and terminal view way lol."

   It used to be a chat agent that REFUSED TO OPEN without an AI connection —
   absurd on inspection: a terminal that cannot list your own books unless a
   language model is running. Everything below is a query over data already on
   this machine, so it works with nothing installed. That is the token-thrift
   ladder applied to a whole room: deterministic commands first, the model only
   for what code cannot answer (`ask …`).

   It also gives papers the front door they were missing. Papers had a real home
   — dissection and kept analyses in the Science Hall — and no visible way in,
   the same bug the Caravan Desk had. Now they are two words at a prompt. */
export function openComputer(){
  state.ui='computer';
  state.termLines = state.termLines || [
    'SAND PAVILION TERMINAL  ·  local index  ·  v1',
    'No connection required. Everything here is read from this machine.',
    '',
    'Type  help  for commands, or  ls  to see what you have.',
  ];
  hideAllOv(); renderComputer(); showOv('computerOv');
  setTimeout(()=>{ const i=document.getElementById('termIn'); if(i) i.focus(); }, 40);
}
function termPrint(lines){
  state.termLines=(state.termLines||[]).concat(lines);
  if(state.termLines.length>400) state.termLines=state.termLines.slice(-400);
}
/* Everything the terminal answers without a model. Pure logic over saved data,
   returning lines of text — the renderer does no thinking, which keeps this
   testable on its own. */
function termIsPaper(d){
  // an explicit mark first; the pattern-match is only for things shelved before
  // the mark existed, or dragged in with no source recorded
  return d.kind==='paper'
      || /arxiv|doi|pubmed|semanticscholar|openalex/i.test((d.source_url||'')+' '+(d.attribution||''))
      || /paper|preprint|journal/i.test((d.category||'')+' '+(d.title||''));
}
function termRun(raw){
  const line=String(raw||'').trim();
  if(!line) return [];
  const parts=line.split(/\s+/);
  const c=parts[0].toLowerCase();
  const arg=parts.slice(1).join(' ').trim();
  const mine=personalBooks();
  const all=Store.allDocs();
  // three-character kind column: a terminal should show you what a thing IS
  // without you having to open it. Blank for an ordinary book.
  const mark=d=>d.kind==='datasheet'?'ds ':d.kind==='paper'?'pap':d.kind==='physical'?'own':'   ';
  const fmt=(d,i)=>'  '+String(i+1).padStart(3)+'  '+mark(d)+'  '+(d.title||'untitled').slice(0,46).padEnd(46)+'  '+String(shelfOf(d)||'').slice(0,14);
  const listing=(docs,what)=>{
    /* {kind, ref}, NOT a bare slug — 2026-08-07, when `notes` arrived and a
       numbered row could be a note rather than a book. One list, two kinds,
       and every consumer asks which. A second parallel list keyed by number
       is the drift this project keeps paying for. */
    state.termLast=docs.slice(0,40).map(d=>({kind:'book', ref:d.slug}));
    if(!docs.length) return ['No '+what+'.'];
    const head=[docs.length+' '+what+':'];
    const rows=docs.slice(0,40).map(fmt);
    const tail=docs.length>40?['  … and '+(docs.length-40)+' more. Narrow it with  find <word>']:[];
    return head.concat(rows, tail, ['', 'Then:  open <number>']);
  };

  if(c==='help') return [
    'COMMANDS','',
    '  ls                 everything on your own shelves',
    '  find <word>        search titles, shelves and summaries',
    '  papers             just the papers',
    '  ds [part]          datasheets — or jump straight to one',
    '  owned              books you own on PAPER, off the shelf behind you',
    '  analyses           paper dissections you have kept',
    '  ref <term>         constants, units, formulas — exact, offline, no AI',
    '  shelf [name]       list your shelves, or open one',
    '  unread             what you brought in and never opened',
    '  random [shelf]     hand me ONE book — unread first',
    '  test <number>      carry it and open the Study Table  (test random works)',
    '  notes [word]       every note you have written, or the ones matching',
    '  carry <number>     put it in your backpack — the Study Table reads that',
    '  carry              what you are carrying right now',
    '  open <number>      open one in the reader',
    '  stats              what is actually in here',
    '  hash <number>      the SHA-256 of a book — how you prove bytes are bytes',
    '  net                what this Pavilion talks to (spoiler: nothing)',
    '  man <command>      what a command does, and its real Linux equivalent',
    '  ask <question>     hand it to your local AI (needs a connection)',
    '  clear              wipe the screen','',
    'Every command here except `ask` runs entirely on this machine.',''];

  /* ---- notes, and the fastest way to fill the backpack ----------------

     The Computer is already an index over everything on this machine, and
     notes were the one thing it could not list — the largest pile most
     visitors have. Added 2026-08-07 with `carry`, because typing is faster
     than walking and "one keystroke to anywhere beats a beautiful room you
     must walk to" is a standing decision.

     It reads gatherNotes(), the same union every other surface reads, so a
     note found here is the same note the Notes Log shows. No AI, like almost
     everything else in here. */
  const noteListing=(rows,what)=>{
    state.termLast=rows.slice(0,40).map(n=>({kind:'note', ref:n.key}));
    if(!rows.length) return ['No '+what+'.'];
    const head=[rows.length+' '+what+':'];
    const body=rows.slice(0,40).map((n,i)=>{
      const where=(n.slug?(Store.getDoc(n.slug)||{}).title||n.slug:(n.where||'')).slice(0,26);
      const one=String(n.title||n.text||'').replace(/\s+/g,' ').slice(0,44);
      return '  '+String(i+1).padStart(3)+'  '+(n.icon||' ')+'  '+one.padEnd(44)+'  '+where;
    });
    const tail=rows.length>40?['  … and '+(rows.length-40)+' more. Narrow it with  notes <word>']:[];
    return head.concat(body, tail, ['', 'Then:  open <number>   or   carry <number>']);
  };
  if(c==='notes'){
    const all=gatherNotes();
    if(!arg) return noteListing(all,'notes');
    const q=arg.toLowerCase();
    /* Matches the BOOK as well as the note, so `notes dhammapada` reads the
       way it looks — the book's name is the obvious thing to type. */
    const hit=all.filter(n=>{
      const t=(Store.getDoc(n.slug||'')||{}).title||'';
      return (n.title||'').toLowerCase().includes(q) || (n.text||'').toLowerCase().includes(q)
          || t.toLowerCase().includes(q) || (n.slug||'').toLowerCase().includes(q);
    });
    return noteListing(hit,'notes matching "'+arg+'"');
  }

  /* carry — the whole point of listing. A thing found in the terminal goes
     straight into the backpack, and from there onto the Study Table or in
     front of a resident you ask. */
  if(c==='carry'){
    const last=state.termLast||[];
    if(!arg){
      const held=carried(carryList()), shelf=setAsideList(carryList());
      if(!held.length && !shelf.length) return ['Your backpack is empty.',
        'Run  ls  or  notes  and then  carry <number>.'];
      return ['carrying '+held.length+':'].concat(
        held.map((e,i)=>'  '+String(i+1).padStart(3)+'  '+(KINDS[e.kind]||{}).icon+'  '+String(e.label||e.ref).slice(0,50)),
        shelf.length?['', shelf.length+' set aside for later.']:[]);
    }
    const n=parseInt(arg,10);
    if(!n||!last[n-1]) return ['carry which? run  ls  or  notes  first, then  carry <number>'];
    const it=last[n-1];
    const label = it.kind==='book'
      ? ((Store.getDoc(it.ref)||{}).title||it.ref)
      : ((gatherNotes().find(x=>x.key===it.ref)||{}).title||'a note');
    if(isCarrying(carryList(), it.kind, it.ref)) return ['Already in your backpack: '+label];
    const r=pickUp(carryList(), {kind:it.kind, ref:it.ref, label:String(label).slice(0,80)}, todayKey());
    if(!r.ok){
      if(r.canSetAside){
        const sa=setAside(carryList(), {kind:it.kind, ref:it.ref, label:String(label).slice(0,80)}, todayKey());
        if(sa.ok){ data.carrying=sa.list; persist();
          return ['Backpack full at '+CARRY_CAP+' — "'+label+'" is on your "pick up later" shelf.',
                  'Nothing is lost. Set something down and  carry  it again when you want it.']; }
      }
      return [r.reason];
    }
    data.carrying=r.list; persist();
    return ['carried: '+label, 'It is on the Study Table now, and a resident you ask can see it.'];
  }

  if(c==='ls'||c==='books') return listing(mine,'books on your shelves');
  if(c==='papers') return listing(mine.filter(termIsPaper),'papers');

  /* Datasheets — added 2026-08-02, asked for directly. A datasheet is genuinely
     not a book and not a paper: you never read one start to finish, it belongs
     to a PART rather than an author, and you come back to it fifty times for one
     number. So it gets a lookup, not a browse — `ds tsop` should land you on the
     thing, which is the only interaction a datasheet ever really has. */
  if(c==='ds'||c==='datasheet'||c==='datasheets'){
    const sheets=mine.filter(d=>d.kind==='datasheet');
    if(!sheets.length) return ['No datasheets yet.','',
      'Add the PDF as text (tools/caravan/pdf-to-text.py converts one),',
      'then open  👤 Your Library  and set its kind to  datasheet.',
      'Give it the part number and  ds <part>  will find it from here.'];
    const pick=arg?sheets.filter(d=>((d.part||'')+' '+(d.title||'')).toLowerCase().includes(arg.toLowerCase())):sheets;
    if(arg&&!pick.length) return ['No datasheet matching "'+arg+'".',
      'You have: '+sheets.map(d=>d.part||d.title).join(', ')];
    if(arg&&pick.length===1){
      const d=pick[0];
      setTimeout(()=>{ closeUI(); openReader(d.slug); },60);
      return [(d.part?d.part+'  —  ':'')+(d.title||''),'opening…'];
    }
    state.termLast=pick.map(d=>({kind:'book', ref:d.slug}));
    return [pick.length+' datasheet'+(pick.length===1?'':'s')+':']
      .concat(pick.map((d,i)=>'  '+String(i+1).padStart(3)+'  '+String(d.part||'—').slice(0,16).padEnd(16)+'  '+(d.title||'untitled').slice(0,44)))
      .concat(['','  ds <part>      jump straight to one','  open <number>  open it in the reader']);
  }

  /* Books you own on PAPER. They have no text here and never will — that's the
     honest part. What they can still do is be findable, hold page-referenced
     notes, be cited in an investigation, and be KNOWN to the residents, so the
     answer to a question can be "you own Scherz & Monk — chapter 4, go and look"
     instead of a worse explanation from memory. A real shelf across the room is
     part of your library; it just isn't part of your files. */
  if(c==='owned'||c==='physical'){
    const own=mine.filter(d=>d.kind==='physical');
    if(!own.length) return ['No paper books recorded yet.','',
      'Own one that matters? Add it by hand (title and author are enough —',
      'leave the text empty), then set its kind to  physical  in Your Library.',
      'It stays findable and citable here, and the residents will know you',
      'have it — which is the whole point of recording it.'];
    return listing(own,'book'+(own.length===1?'':'s')+' you own on paper');
  }
  if(c==='find'){
    if(!arg) return ['find what? e.g.  find electronics'];
    const q=arg.toLowerCase();
    const hits=all.filter(d=>((d.title||'')+' '+shelfOf(d)+' '+((d.doc&&d.doc.summary)||'')).toLowerCase().includes(q));
    return listing(hits,'matches for "'+arg+'"');
  }
  if(c==='unread'){
    const unread=mine.filter(d=>!(data.read||{})[d.slug]);
    return unread.length?listing(unread,'brought in and never opened')
      :['Nothing unread. Every book you brought in has been opened at least once.'];
  }

  /* ---- random — ONE book, because 415 of them is a wall ---------------

     Asked for 2026-08-10: "we can make a command like test book random
     instead of scanning the whole library alot that cant work since we got
     rid of those 26 books seed."

     He is right, and the reason is arithmetic. `ls` was a LIST when 27 books
     shipped; against a real 415-book collection it is a wall, and a wall is
     not an index. Every other command here narrows by something you already
     know — a word, a shelf, a kind. This one is for when you know nothing
     and want the shelf to hand you something, which is what a library is
     for on the days you have no particular question.

     Deterministic and offline like everything else in this room except
     `ask`. It prefers a book you have NOT read, because being handed one
     you finished last week is not a suggestion, and says so when it has to
     fall back. */
  if(c==='random'){
    /* EXACT SHELF FIRST, loose only if nothing matched exactly. A plain
       substring makes `random fiction` sweep in every NON-fiction book —
       and this steward has 98 on one shelf and 25 on the other, so the two
       are the most likely pair anyone types. `random non` still works
       loosely, which is the whole value of a loose match; it just no longer
       overrides an answer the visitor named precisely. */
    const want=String(arg||'').toLowerCase();
    const exact=arg ? all.filter(d=>String(shelfOf(d)||'').toLowerCase()===want) : null;
    const pool=!arg ? all
      : (exact.length ? exact
         : all.filter(d=>String(shelfOf(d)||'').toLowerCase().includes(want)));
    if(!pool.length) return arg
      ? ['Nothing on a shelf matching "'+arg+'".', 'Run  shelf  to see the shelves you have.']
      : ['The Library is empty.', 'Drag a .txt or .epub onto the window, or run  help.'];
    const fresh=pool.filter(d=>!(data.read||{})[d.slug]);
    const from=fresh.length?fresh:pool;
    const pick=from[Math.floor(Math.random()*from.length)];
    /* Set termLast so `open 1`, `carry 1` and `test 1` all work on it —
       the one-element case of the same {kind, ref} list every listing
       builds, rather than a second path that would drift. */
    state.termLast=[{kind:'book', ref:pick.slug}];
    const note=(pick.doc&&pick.doc.summary)||'';
    return ['one of '+pool.length+(arg?' on '+arg:'')+(fresh.length?'':' — you have read them all, so this is a re-read')+':', '',
      '  '+'  1'+'  '+mark(pick)+'  '+(pick.title||'untitled').slice(0,46).padEnd(46)+'  '+String(shelfOf(pick)||'').slice(0,14),
      note?'      '+note.replace(/\s+/g,' ').slice(0,70):'',
      '', 'Then:  open 1   ·   carry 1   ·   test 1'].filter(function(l,i){ return l!=='' || i>1; });
  }

  /* ---- test — hand that book to the thing that works a book ----------

     The other half of his sentence. Picking a book at random is only useful
     if there is somewhere to take it, and the Study Table is exactly that:
     it works a book one unit at a time and it reads the BACKPACK, which is
     why this carries first and opens second. Two steps that were already
     two commands, made one — the same "one keystroke to anywhere" that put
     every room in the pause menu. */
  if(c==='test'){
    const last=state.termLast||[];
    let it=null;
    if(!arg || arg.toLowerCase()==='random'){
      /* `test random` and `test book random` both work — his phrasing had
         the word `book` in the middle and refusing it over a noise word
         would be the pedantry this terminal is meant to avoid. */
      const fresh=all.filter(d=>!(data.read||{})[d.slug]);
      const from=(fresh.length?fresh:all);
      if(!from.length) return ['The Library is empty — nothing to work on yet.'];
      it={kind:'book', ref:from[Math.floor(Math.random()*from.length)].slug};
      state.termLast=[it];
    } else {
      const n=parseInt(arg.replace(/^book\s+/i,''),10);
      if(!n||!last[n-1]) return ['test which? run  ls,  find <word>  or  random  first, then  test <number>.',
                                 'Or just:  test random'];
      it=last[n-1];
    }
    if(it.kind!=='book') return ['The Study Table works on a book. That row is a note — try  carry '+arg+'  instead.'];
    const d=Store.getDoc(it.ref);
    if(!d) return ['That book is not on the shelves any more.'];
    const r=pickUp(carryList(), {kind:'book', ref:it.ref, label:d.title||it.ref}, todayKey());
    if(r.ok) data.carrying=r.list;
    persist();
    /* Open it rather than announce it. A terminal that says "now go to the
       Study" is the walking-to-a-room problem in text. */
    setTimeout(function(){ closeUI(); openPlanner(); }, 350);
    return ['"'+(d.title||it.ref)+'" is in your backpack.',
            r.ok?'':'  (the bag was full — set something down and it will be there)',
            'Opening the Writing Desk; the Study Table reads what you carry.'].filter(Boolean);
  }
  if(c==='shelf'){
    if(!arg){
      const counts={}; mine.forEach(b=>{ const k=shelfOf(b); counts[k]=(counts[k]||0)+1; });
      const rows=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
      return rows.length?['Your shelves:'].concat(rows.map(r=>'  '+String(r[1]).padStart(4)+'  '+r[0]))
        :['No shelves yet.'];
    }
    return listing(mine.filter(b=>shelfOf(b).toLowerCase()===arg.toLowerCase()),'on "'+arg+'"');
  }
  /* `ref` — the Reference Desk at the terminal. Needs no AI and never will:
     a local model cannot look anything up and cannot tell what it half-recalls
     from what it is inventing, so the values it is least reliable about are
     exactly the ones with a fixed right answer. See data/reference.js. */
  if(c==='ref'){
    const term=arg;
    if(!term){
      const byKind={};
      REFERENCE.forEach(e=>{ (byKind[e.kind]=byKind[e.kind]||[]).push(e.name); });
      return ['REFERENCE DESK — '+REFERENCE.length+' entries, exact and offline.',
        '',
        ...Object.keys(byKind).map(k=>'  '+k.padEnd(10)+byKind[k].join(', ')),
        '',
        'Try:  ref ohm · ref 4k7 · ref c · ref divider · ref colour code · ref db'];
    }
    const hits=refLookup(term);
    if(!hits.length) return ['Nothing in the reference table for "'+term+'".',
      'This table holds only things with ONE right answer — constants, units, formulas, component values.',
      'For anything that needs a source or an argument, that is the Library: try  find '+term];
    return hits.map(refLine);
  }
  if(c==='analyses'||c==='dissections'){
    const d=(data.hall&&data.hall.dissections)||[];
    if(!d.length) return ['No kept analyses yet.',
      'Dissect a paper at the Science & Research Hall and press Keep, and it lands here.'];
    return [d.length+' kept analys'+(d.length===1?'is':'es')+':']
      .concat(d.map((x,i)=>'  '+String(i+1).padStart(3)+'  '+x.ts+'  '+x.title))
      .concat(['','Open them at the Science & Research Hall.']);
  }
  if(c==='open'){
    const n=parseInt(arg,10);
    const last=state.termLast||[];
    if(!n||!last[n-1]) return ['open which? run  ls  or  find <word>  or  notes  first, then  open <number>'];
    const it=last[n-1];
    if(it.kind==='note'){ setTimeout(()=>{ closeUI(); openNotesLog(it.ref); },60); return ['opening the note…']; }
    setTimeout(()=>{ closeUI(); openReader(it.ref); },60);
    return ['opening…'];
  }
  if(c==='stats') return [
    '  '+mine.length+' books of your own',
    '  '+mine.filter(termIsPaper).length+' of them papers',
    '  '+mine.filter(d=>d.kind==='datasheet').length+' datasheets',
    '  '+mine.filter(d=>d.kind==='physical').length+' owned on paper (no text here)',
    '  '+(((data.hall&&data.hall.builds)||[]).length)+' builds on the Bench',
    '  '+all.length+' in the catalogue altogether',
    '  '+Object.keys(data.read||{}).length+' opened at least once',
    '  '+(((data.hall&&data.hall.dissections)||[]).length)+' kept paper analyses',
    '  '+((data.notes||[]).length)+' notes'];
  /* man — the doorway. See data/man-pages.js for why every page names its
     real-world equivalent: the point is that `ls` here is the same word doing a
     smaller version of the same job as `ls` on a Linux box, so the vocabulary
     travels even though this is not a shell. */
  if(c==='man'){
    if(!arg) return manIndex();
    const page=manPage(arg);
    return page || ['No page for "'+arg+'".', 'Type  man  on its own for the list.'];
  }

  /* hash — a real security primitive, on your own books. Same operation that
     verifies an installer download and the same one a bundle uses to prove a
     book arrived intact. Doing it to something you own makes it concrete. */
  if(c==='hash'){
    const n=parseInt(arg,10), last=state.termLast||[];
    if(!n||!last[n-1]) return ['hash which? run  ls  or  find <word>  first, then  hash <number>'];
    if(last[n-1].kind!=='book') return ['That one is a note, not a book. hash works on a book’s bytes.'];
    const d=Store.getDoc(last[n-1].ref);
    const text=d && d.doc && d.doc.fullText && d.doc.fullText.text;
    if(!text) return ['"'+((d&&d.title)||'that')+'" has no full text here, so there are no bytes to hash.',
      'Summary-only books carry a card, not a book. Drag the real text in and try again.'];
    termHash(text, d.title);
    return ['hashing '+text.length.toLocaleString()+' characters…'];
  }

  /* net — the claim the whole project rests on, made checkable from inside.
     Not a reassurance: a thing you can go and verify in the browser's own
     network tab, and the command says so. */
  if(c==='net'){
    const conns=(data.aiConnections||[]).filter(x=>x&&x.url);
    const cloud=conns.filter(x=>!/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(x.url||''));
    return ['NETWORK','',
      '  This Pavilion makes NO network requests on its own. Not on startup,',
      '  not on a timer, not in the background. There is no account, no server,',
      '  no telemetry and no analytics.','',
      '  Connections you have configured yourself:',
      ...(conns.length ? conns.map(x=>'    '+(/localhost|127\.0\.0\.1/.test(x.url)?'🏠 local  ':'☁ cloud  ')+x.url)
                       : ['    (none — the residents are asleep)']),
      '',
      cloud.length ? '  '+cloud.length+' of those reach off this machine. They are used only when you'
                   : '  Nothing you have configured leaves this machine.',
      cloud.length ? '  ask a resident something — never on their own.' : '',
      '',
      "  Don't take my word for it: F12 → Network, then reload. It should stay",
      '  empty. `man net` has the real Linux commands for asking the same',
      '  question of your whole machine.',''];
  }

  if(c==='clear'){ state.termLines=[]; return []; }
  if(c==='ask'){
    if(!isAIActive()) return ['No AI connection, so there is nothing to ask.',
      'Everything else in this terminal works without one — try  help.'];
    setTimeout(()=>{ closeUI(); openChatDialog({ name:'THE COMPUTER', color:'#7ec4de', glow:'#a9dcf0',
      aiAgent:'computer', lines:['Online. '+(arg||'What would you like to think through?')] }); },60);
    return ['handing you to the resident…'];
  }
  return [c+': no such command. Type  help.'];
}
/* SHA-256 in the browser is async, and termRun() is sync by design (it is a
   pure function from a line of text to lines of output, which is what makes it
   readable). So the command prints "hashing…" and this appends the answer when
   it lands — the same shape the AI commands use. */
async function termHash(text, title){
  try{
    const buf=new TextEncoder().encode(text);
    const d=await crypto.subtle.digest('SHA-256', buf);
    const hex=[...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('');
    termPrint(['', '  '+(title||''), '  SHA-256  '+hex, '',
      '  Change one character of that book and this line changes completely.',
      '  That is why a hash can prove a download, or a bundle, arrived intact.',
      '  `man hash` for how to do this to any file on your own machine.','']);
  }catch(e){
    termPrint(['  Could not hash that here ('+String(e&&e.message||e)+').','']);
  }
  renderComputer();
}
export function termSubmit(){
  const i=document.getElementById('termIn'); if(!i) return;
  const line=i.value; i.value='';
  termPrint(['> '+line]);
  termPrint(termRun(line).concat(['']));
  renderComputer();
}
export function termQuick(c){ const i=document.getElementById('termIn'); if(i) i.value=c; termSubmit(); }
function renderComputer(){
  const el=document.getElementById('computerPanel'); if(!el) return;
  el.innerHTML =
    '<button class="xbtn" onclick="closeUI()">Esc ✕</button>'
    + '<h2>🖥 The Computer <span class="badge lic">local index</span></h2>'
    + '<div class="meta">A terminal over everything on this machine — your books, your papers, your kept '
    + 'analyses. <b>No AI connection needed for any of it.</b></div>'
    + '<pre id="termOut" style="margin-top:12px;background:#0d1117;color:#a9dcf0;border:2px solid #2b4250;'
    + 'border-radius:6px;padding:12px;max-height:46vh;overflow:auto;font-size:12.5px;line-height:1.5;'
    + 'white-space:pre-wrap;word-break:break-word">'+esc((state.termLines||[]).join('\n'))+'</pre>'
    + '<div class="row" style="margin-top:8px;gap:6px;align-items:center">'
    + '<span style="color:#7ec4de;font-family:var(--font-mono)">&gt;</span>'
    + '<input type="text" id="termIn" placeholder="help" autocomplete="off" spellcheck="false" '
    + 'style="flex:1;font-family:var(--font-mono)" '
    + 'onkeydown="if(event.key===\'Enter\'){event.preventDefault();termSubmit();}">'
    + '<button class="btn" onclick="termSubmit()">Run</button></div>'
    + '<div class="row" style="margin-top:8px;gap:6px;flex-wrap:wrap">'
    /* `random` sits FIRST, ahead of `ls`. On a 415-book shelf `ls` is a wall
       and `random` is the useful one, and a quick button is the only part of
       this room a person presses without knowing the command exists. */
    + ['random','ls','papers','ds','owned','unread','shelf','stats','net','man','help'].map(function(c){
        return '<button class="btn ghost" style="font-size:11px;padding:2px 8px;font-family:var(--font-mono)" '
             + 'onclick="termQuick(\''+c+'\')">'+c+'</button>'; }).join('')
    + '</div>';
  const out=document.getElementById('termOut'); if(out) out.scrollTop=out.scrollHeight;
}
export function saveLastChatReplyToArchive(){
  const d=state.dialog; if(!d||!d.chat) return;
  const last=[...d.transcript].reverse().find(m=>m.from==='npc'); if(!last) return;
  const title='Plan · '+todayKey();
  let slug=slugify(title), n=1;
  while(data.workshop.docs.some(x=>x.slug===slug)) slug=slugify(title)+'-'+(++n);
  data.workshop.docs.unshift({slug,title,license:'personal record',source:'The Computer',body:last.text,created:todayKey(),category:'ai-written'});
  persist(); logActivity('Saved a plan from the Computer to the Archive Desk.'); blip(784,.09);
}
/* ----- Sebastian's "send this plan to today" — takes his most recent reply
   and drops each real line into today's planner as a spark (source
   "Sebastian"), so a schedule he drafts in chat lands straight in the daily
   plan the visitor already keeps. The lightweight, no-calendar-yet version
   of BUTLER-SEBASTIAN-PLAN.md's "copy it into the daily plan" — until the
   real calendar layer (v1 steps 3-4) exists, the planner IS the day. */
/* Pull a clock time off the front of a schedule line so Sebastian's plan can
   become a real timed day, not just a list of to-dos. Handles "9:00 — Sit",
   "2:00 PM Call", "10:30-11:30 Writing", "9am Meditate". Returns
   { start:'HH:MM', end?:'HH:MM', title } or null when there's no leading time
   (those lines stay untimed to-dos). Kept deliberately forgiving: a butler
   writes for a person, not a parser, so we read what a person would write. */
export function parseScheduleTime(raw){
  const m=raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?\s*[-–—:.)]?\s*(.+)$/i);
  if(!m) return null;
  const to24=(h,min,ap)=>{
    h=parseInt(h,10); min=min?parseInt(min,10):0;
    if(ap){ ap=ap.toLowerCase(); if(ap==='pm'&&h<12) h+=12; if(ap==='am'&&h===12) h=0; }
    if(h>23||min>59) return null;
    return String(h).padStart(2,'0')+':'+String(min).padStart(2,'0');
  };
  const start=to24(m[1],m[2],m[3]); if(!start) return null;
  const title=(m[7]||'').trim(); if(title.length<2) return null; // a bare time with no activity isn't schedulable
  const end=m[4]?to24(m[4],m[5],m[6]||m[3]):undefined; // borrow the start's am/pm if the end leaves it off
  return { start, end, title };
}
export function sendSebastianPlanToToday(){
  const d=state.dialog; if(!d||!d.chat) return;
  const last=[...d.transcript].reverse().find(m=>m.from==='npc' && m.text); if(!last) return;
  const k=todayKey();
  const day=data.planner[k]||(data.planner[k]={ intention:'', ember:'', blocks:DEFAULT_BLOCKS.map(n=>({name:n,state:'waiting'})), sparks:[] });
  if(!day.sparks) day.sparks=[];
  if(!data.calendar) data.calendar=[];
  // strip list decoration first — bullets always, numbering only when a space
  // follows the "1." so it can't swallow a "9:00" time.
  const lines=last.text.split('\n').map(l=>l.trim())
    .map(l=>l.replace(/^[-*•]\s*/,'').replace(/^\d+[.)]\s+/,'').trim())
    .filter(l=>l.length>2 && l.length<160 && !/[?]$/.test(l));
  if(!lines.length) return;
  const base=Date.now();
  const newSparks=[]; let events=0;
  lines.forEach((line,i)=>{
    const t=parseScheduleTime(line);
    if(t){ // a timed line becomes a real calendar event for today — and since
      // you set this schedule WITH Sebastian, he minds the clock for it too
      // (remind:true); any bell can be turned off in the day view.
      data.calendar.push({ id:base+i, date:k, start:t.start, end:t.end||'', title:t.title, note:'', remind:true });
      events++;
    } else { // an untimed line stays a to-do (spark)
      newSparks.push({ ts:k, text:line, source:'Sebastian', done:false });
    }
  });
  if(!events && !newSparks.length) return;
  newSparks.reverse().forEach(s=>day.sparks.unshift(s)); // keep the visitor's reading order
  persist(); setHud();
  logActivity(`Sebastian set today's plan: ${events} scheduled, ${newSparks.length} to do.`);
  blip(784,.08); setTimeout(()=>blip(988,.1),90);
  const btn=document.getElementById('sebPlanBtn');
  if(btn){
    const parts=[]; if(events) parts.push(events+' scheduled'); if(newSparks.length) parts.push(newSparks.length+' to do');
    btn.textContent='✓ '+parts.join(' · ')+' — on today'; btn.disabled=true;
  }
}

/* ----- The Research Desk (the Workshop) — "research/notes as a mode
   distinct from the personal archive," the piece the README's Workshop
   section named as still-open. Unlike the Archive Desk's one polished
   title/license/source/body page, a research project is a running,
   freeform list of timestamped notes — meant to be added to over
   several visits, not finished in one sitting. The research-assistant
   chat is grounded in the Library *and* the project's own notes so
   far, so it can actually help synthesize, not just answer trivia —
   the "workshop research-assistant AI" the AI-agents plan sketched.
   A finished project can graduate into a real Archive Desk entry
   (category:'research', the Index category that's existed since day
   one with nothing in it) — same three-stage shape as the Caravan's
   own gutenberg.py → library-draft.py → promote-draft.py pipeline,
   just for personal work instead of Library sourcing. */
function researchProject(id){ return data.workshop.research.find(p=>p.id===id); }
function researchSystemPrompt(project){
  const shelf=Store.allDocs().map(d=>`- "${d.title}" (${d.tradition}, ${d.license}): ${d.doc.summary}`).join('\n');
  const notes=project.notes.length ? project.notes.map(n=>`- (${n.ts}) ${n.text}`).join('\n') : '(nothing written yet)';
  return WORK_CHARTER
    +'\n\nYou are the research assistant at the Workshop\'s Research Desk in the Sand Pavilion. '
    +`The visitor is working on: "${project.title}"`+(project.goal?` — their stated goal: ${project.goal}.`:'.')
    +' This might be a topic they\'re studying, or it might be a real thing they want to build or make '
    +'happen (a garden, a habit, a piece of writing) — read which one it is from their title/goal/notes '
    +'and match it: for a study topic, help them think, find angles, ask good questions; for a project, '
    +'help them turn the idea into something concrete — real next steps, what they\'d actually need, '
    +'what could trip them up. Either way, organize what they already have rather than repeating it back. '
    +'You may draw on the Library\'s shelved texts below if relevant, but this work can range wider '
    +'than the Library alone — don\'t force a connection that isn\'t there. Be concrete and useful, '
    +'a few sentences or a short list, not an essay.'
    +'\n\nWhat\'s on the Library shelves, if useful:\n'+shelf
    +'\n\nTheir notes on this project so far:\n'+notes;
}
export function openResearchDesk(){
  state.ui='research'; hideAllOv();
  state.researchView=state.researchView||{mode:'list'};
  renderResearch(); showOv('researchOv');
}
export function newResearchForm(){ state.researchView={mode:'compose'}; renderResearch(); }
export function backToResearchList(){ state.researchView={mode:'list'}; renderResearch(); }
export function createResearchProject(){
  const title=document.getElementById('resTitle').value.trim();
  if(!title) return;
  const goal=document.getElementById('resGoal').value.trim();
  const id='res-'+Date.now();
  data.workshop.research.unshift({id,title,goal,notes:[],created:todayKey()});
  persist(); logActivity('Started a research project: "'+title+'".'); blip(784,.09);
  state.researchView={mode:'project',id,history:[]};
  renderResearch();
}
export function openResearchProject(id){ state.researchView={mode:'project',id,history:[]}; renderResearch(); }
export function deleteResearchProject(id){
  data.workshop.research=data.workshop.research.filter(p=>p.id!==id);
  persist(); state.researchView={mode:'list'}; renderResearch();
}
export function addResearchNote(id){
  const input=document.getElementById('resNoteInput');
  const text=input.value.trim(); if(!text) return;
  const p=researchProject(id); if(!p) return;
  p.notes.unshift({ts:todayKey(),text});
  persist(); input.value=''; renderResearch();
}
/* READING-TO-DOING-PLAN.md step 1 — the same spark bridge that already
   works for book notes (sendNoteToToday), extended to Research Desk
   notes. Reuses day.sparks verbatim; no new save shape. */
export function sendResearchNoteToToday(id,i){
  const p=researchProject(id); if(!p) return;
  const note=p.notes[i]; if(!note) return;
  const day=plannerDay();
  day.sparks.unshift({ts:todayKey(), text:note.text, source:p.title, done:false});
  persist(); logActivity('Brought a note from "'+p.title+'" to today\'s plan.'); blip(784,.09);
  renderResearch();
}
export function fillResearchPrompt(text){ const el=document.getElementById('resAskInput'); if(el){ el.value=text; el.focus(); } }
export async function sendResearchMessage(id){
  const input=document.getElementById('resAskInput');
  const q=input.value.trim(); if(!q) return;
  const p=researchProject(id); if(!p) return;
  const v=state.researchView;
  v.history.push({role:'user',content:q}); input.value=''; renderResearch();
  try{
    const reply=await AI.chat([{role:'system',content:researchSystemPrompt(p)}, ...v.history]);
    v.history.push({role:'assistant',content:reply}); v.lastReply=reply;
    logActivity('Asked the Research Desk about "'+p.title+'".'+elapsedTag());
  }catch(e){
    v.history.push({role:'assistant',content:"The connection flickered — no answer this time. Check that your AI connection is still running."});
  }
  renderResearch();
}
export function saveResearchReplyAsNote(id){
  const v=state.researchView; if(!v.lastReply) return;
  const p=researchProject(id); if(!p) return;
  p.notes.unshift({ts:todayKey(),text:v.lastReply});
  v.lastReply=''; persist(); renderResearch();
}
/* Paste-a-chapter summarizer: distinct from the "Ask" chat above on
   purpose. This sends the pasted text itself (a chapter, a paper, your
   own notes) with an instruction to summarize it — not grounded in the
   Library or the project's other notes, since the whole point is "just
   this text, faithfully condensed." The output lands as a project note,
   the same personal, local-only, never-sent-anywhere place every
   other Research Desk note lives — this stays a private study aid, not
   a path into the shared Library, on purpose: what you paste here may
   be your own copy of something copyrighted (a textbook chapter you
   own), which is fine for your own summary but was never meant to be
   redistributed. */
export async function summarizeResearchText(id){
  const input=document.getElementById('resSummarizeInput');
  const text=input.value.trim(); if(!text) return;
  const p=researchProject(id); if(!p) return;
  const statusEl=document.getElementById('resSummarizeStatus');
  if(statusEl) statusEl.textContent='Summarizing…';
  try{
    const reply=await AI.chat([
      {role:'system',content:WORK_CHARTER+'\n\nSummarize the text the visitor pastes into clear, well-organized '
        +'study notes: the main points, in order, plus anything genuinely worth remembering. Stay strictly '
        +'grounded in what\'s actually in the text — never add outside facts or fill gaps with a guess. '
        +'If the text is long, a few short paragraphs or a tight bulleted list is more useful than a wall of text.'},
      {role:'user',content:text},
    ]);
    p.notes.unshift({ts:todayKey(),text:reply});
    persist(); input.value=''; if(statusEl) statusEl.textContent='';
    logActivity('Summarized a pasted text into "'+p.title+'".'); blip(784,.09);
  }catch(e){
    if(statusEl) statusEl.textContent="The connection flickered — no summary this time. Check that your AI connection is still running.";
  }
  renderResearch();
}
export function promoteResearchToArchive(id){
  const p=researchProject(id); if(!p) return;
  if(!p.notes.length) return;
  const body=p.notes.slice().reverse().map(n=>n.text).join('\n\n');
  let slug=slugify(p.title), n=1;
  while(data.workshop.docs.some(d=>d.slug===slug)) slug=slugify(p.title)+'-'+(++n);
  data.workshop.docs.unshift({slug,title:p.title,license:'personal record',source:'The Research Desk',body,created:todayKey(),category:'research'});
  persist(); logActivity('Turned research project "'+p.title+'" into an Archive Desk entry.'); blip(784,.09);
  openArchive(); openArchiveDoc(slug);
}
function renderResearch(){
  const v=state.researchView, panel=document.getElementById('researchPanel'), aiOn=isAIActive();
  if(v.mode==='compose'){
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>Start a Research Project</h2>
      <div class="meta">Freeform — add notes over as many visits as it takes. Nothing here is
        published until you choose to turn it into an Archive Desk entry.</div>
      <label>What are you researching, or working toward?</label>
      <input type="text" id="resTitle" placeholder="e.g. How Chan Buddhism actually reached Japan — or a permaculture garden">
      <label>Goal (optional)</label>
      <input type="text" id="resGoal" placeholder="e.g. A short paper I can point people to — or an actual garden started this fall">
      <div class="row" style="margin-top:14px">
        <button class="btn" onclick="createResearchProject()">Start</button>
        <button class="btn ghost" onclick="backToResearchList()">← Back</button>
      </div>`;
    return;
  }
  if(v.mode==='project'){
    const p=researchProject(v.id);
    if(!p){ state.researchView={mode:'list'}; return renderResearch(); }
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>${esc(p.title)}</h2>
      <div class="meta">${p.goal?esc(p.goal)+' · ':''}started ${esc(p.created)} · ${p.notes.length} note${p.notes.length===1?'':'s'}</div>

      <h3>Notes</h3>
      <textarea id="resNoteInput" rows="3" placeholder="Write a note — an idea, a finding, a question to chase down."></textarea>
      <div class="row" style="margin-top:8px"><button class="btn ghost" onclick="addResearchNote('${p.id}')">+ Add note</button></div>
      <div style="margin-top:10px">${p.notes.length ? p.notes.map((n,i)=>{
        const alreadySent=plannerDay().sparks.some(s=>s.text===n.text);
        return `<div class="card" style="cursor:default">
          <div class="s">${esc(n.ts)}</div><div>${esc(n.text)}</div>
          <div class="row" style="margin-top:6px">
            <button class="btn ghost" style="font-size:11px;padding:3px 10px" ${alreadySent?'disabled':''}
              onclick="sendResearchNoteToToday('${p.id}',${i})">${alreadySent?'✓ In today\'s plan':'→ Bring to today\'s plan'}</button>
          </div>
        </div>`;
      }).join('')
        : '<p>No notes yet — start with whatever\'s in your head, it doesn\'t need to be tidy.</p>'}</div>

      <h3 style="margin-top:18px">📄 Summarize a chapter or paper</h3>
      <div class="meta">${aiOn
        ? 'Paste in a chapter, a paper, or anything you have legitimate access to — your local AI condenses it into study notes, saved below. Personal to this project only; never sent to the shared Library. Very long pastes may exceed what a local model can take in at once — a section at a time works better than a whole book.'
        : 'No local AI connected right now (⚙ Manage AI connections) — this needs a live connection to actually summarize.'}</div>
      ${aiOn ? `
        <textarea id="resSummarizeInput" rows="5" placeholder="Paste the text to summarize…"></textarea>
        <div class="row" style="margin-top:8px;align-items:center">
          <button class="btn ghost" onclick="summarizeResearchText('${p.id}')">Summarize into a note</button>
          <span class="meta" id="resSummarizeStatus" style="margin:0"></span>
        </div>` : ''}

      <h3 style="margin-top:18px">Research assistant</h3>
      <div class="meta">${aiOn
        ? 'Grounded in the Library and everything you\'ve noted above — ask it to help you think, find a next question, or summarize what you have.'
        : 'No local AI connected right now (⚙ Manage AI connections) — this desk needs a live connection to actually answer.'}</div>
      ${aiOn ? `
        <div class="row" style="margin-bottom:10px">
          <button class="btn ghost" style="font-size:11.5px" onclick="fillResearchPrompt('Summarize what I have so far.')">Summarize what I have</button>
          <button class="btn ghost" style="font-size:11.5px" onclick="fillResearchPrompt('What\\'s a good next question to chase down?')">Suggest a next question</button>
          <button class="btn ghost" style="font-size:11.5px" onclick="fillResearchPrompt('Draft a short outline from these notes.')">Draft an outline</button>
          <button class="btn ghost" style="font-size:11.5px" onclick="fillResearchPrompt('Break this into concrete next steps I could actually start on.')">Break into next steps</button>
          <button class="btn ghost" style="font-size:11.5px" onclick="fillResearchPrompt('What would I actually need to get started \\u2014 materials, tools, skills, anything?')">What do I need</button>
          <button class="btn ghost" style="font-size:11.5px" onclick="fillResearchPrompt('What could go wrong here, and how should I plan around it?')">What could go wrong</button>
        </div>
        <div id="resHistory">${(state.researchView.history||[]).map(h=>`
          <div class="card" style="cursor:default"><div class="t">${h.role==='user'?'You':'Research assistant'}</div><div class="s">${esc(h.content)}</div></div>`).join('')}</div>
        <textarea id="resAskInput" rows="3" placeholder="Ask, or pick a quick start above…"></textarea>
        <div class="row" style="margin-top:10px">
          <button class="btn" onclick="sendResearchMessage('${p.id}')">Ask</button>
          ${state.researchView.lastReply?`<button class="btn ghost" onclick="saveResearchReplyAsNote('${p.id}')">💾 Save last reply as a note</button>`:''}
        </div>` : ''}

      <div class="row" style="margin-top:22px">
        <button class="btn ghost" onclick="backToResearchList()">← Back</button>
        <button class="btn ghost" ${p.notes.length?'':'disabled'} onclick="promoteResearchToArchive('${p.id}')">→ Turn into an Archive Desk entry</button>
        <button class="btn ghost" style="border-color:#b56f6f;color:#e0a0a0" onclick="deleteResearchProject('${p.id}')">Delete project</button>
      </div>`;
    return;
  }
  const projects=data.workshop.research;
  panel.innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>The Research Desk ${visBadge('private')}</h2>
    <div class="meta">Freeform, ongoing work — a running notebook per topic or per idea you're
      trying to make real, not a single polished page. An assistant AI can think alongside you here,
      grounded in your own notes — whether you're studying something or building it.</div>
    ${projects.length ? projects.map(p=>`
      <div class="card" onclick="openResearchProject('${p.id}')">
        <div class="t">${esc(p.title)}</div>
        <div class="s">${p.goal?esc(p.goal)+' · ':''}${p.notes.length} note${p.notes.length===1?'':'s'} · started ${esc(p.created)}</div>
      </div>`).join('') : '<p>Nothing started yet.</p>'}
    <div class="row" style="margin-top:14px"><button class="btn" onclick="newResearchForm()">+ Start a research project</button></div>
    <div class="meta" style="margin-top:18px">Want to <i>test</i> a claim rather than research a topic?
      The Science &amp; Research Hall weighs a question against the actual evidence — modern science, and,
      if you like, the claims meditation and the scriptures put forward — and reaches an honest verdict.</div>
    <div class="row" style="margin-top:8px"><button class="btn ghost" onclick="openScienceHall()">🔬 The Science &amp; Research Hall</button></div>`;
}

/* ================================================================
   The Science & Research Hall — SCIENCE-RESEARCH-HALL-PLAN.md, Phase
   0 + Phase 1. The Pavilion stores a lot of knowledge but nothing
   actively *investigates* it; this is the room that does. The café
   Steward — under-loaded while the Commons is dormant — wears a second
   hat here as the Investigator (see CHAT_AGENTS.investigator above).

   The Hall is a place of *inquiry, not vindication*: it can test any
   claim, modern science first and — only when a visitor asks — the
   claims meditation and the scriptures put forward, judged the same
   honest way. The unit of work is an INVESTIGATION: a question, where
   it came from, what the evidence actually says, an honest verdict, and
   the falsifier (what would change that verdict).

   Phase 0 is these hand-written exemplar cards — deliberately spanning
   both tracks and all four verdicts, so the tone and the honesty bar
   are set in stone before any AI writes one. They are static content,
   like BADGES and the Records-Hall timeline; visitor-created, saved
   investigations are Phase 2, not this pass.
   ================================================================ */
const VERDICTS = {
  supported:  { label:'Supported',                       color:'#7fb069', bg:'rgba(127,176,105,.14)' },
  unsupported:{ label:'Unsupported / contradicted',      color:'#d98c8c', bg:'rgba(217,140,140,.14)' },
  mixed:      { label:'Mixed',                           color:'#e0a43c', bg:'rgba(224,164,60,.14)' },
  beyond:     { label:'Beyond what science can now say',  color:'#8fb4d9', bg:'rgba(143,180,217,.14)' },
};
const INVESTIGATIONS = [
  {
    id:'inv-habit-21',
    track:'Modern science',
    question:'Does forming a new habit really take 21 days?',
    origin:'A number repeated everywhere in self-help and productivity advice.',
    evidence:'The "21 days" traces to a 1960s plastic surgeon’s offhand observation about how long patients took to adjust to a new face — never a study of habits at all. The one real study to measure it (Lally et al., 2010) found habits took a *median of about 66 days* to become automatic, with a huge range across people and behaviours (drinking water was fast; doing sit-ups was slow).',
    verdictKind:'unsupported',
    verdict:'The clean "21 days" figure is unsupported. The honest version: it varies enormously, and often takes far longer.',
    falsifier:'A well-controlled study showing most people reliably automate a genuinely new behaviour in ~21 days.',
    grounding:'Reasoning from general knowledge — not yet grounded in a shelved paper. A good candidate for the Request Board (the Lally 2010 study).',
  },
  {
    id:'inv-selection',
    track:'Modern science',
    question:'Do small inherited variations, selected over generations, actually accumulate into large change?',
    origin:'The core claim of Darwin’s Origin of Species, on the Science shelf.',
    evidence:'Darwin’s own case is built from things anyone can check: the pronounced differences breeders produce in pigeons and dogs within a human lifetime, and the graded variation across island species in the Beagle journal. Later genetics supplied the mechanism he lacked (heritable mutation) and directly observed selection — antibiotic resistance, the peppered moth — confirms the accumulation happens.',
    verdictKind:'supported',
    verdict:'Supported — and unusually well, across independent lines of evidence Darwin himself never had.',
    falsifier:'A trait shown to be both heritable and variable that selection provably cannot shift over many generations.',
    grounding:'Grounded in "On the Origin of Species" and the Beagle journal, both on the Science shelf.',
  },
  {
    id:'inv-meditation-attention',
    track:'Contemplative',
    question:'Does meditation measurably change attention and stress?',
    origin:'A claim the Pavilion can actually test on itself — the four postures and the daily sit (M) are already here.',
    evidence:'The *modest* version has real support: controlled studies find small-to-moderate gains in sustained attention and reductions in self-reported stress and some stress physiology, in people who practise regularly. The *strong* popular version — that it "rewires your brain," cures illness, or transforms anyone quickly — outruns the evidence; effects are real but usually modest, and studies with weak controls tend to overstate them.',
    verdictKind:'mixed',
    verdict:'Mixed: the modest claim (some real gains in attention and stress) holds; the sweeping claims do not.',
    falsifier:'Well-controlled trials (vs. an active control, not just a waitlist) consistently finding no effect on attention or stress.',
    grounding:'Reasoning from general knowledge — a strong candidate for the Request Board (a contemplative-neuroscience review), and for a personal self-experiment right here (Phase 3).',
  },
  {
    id:'inv-atman-brahman',
    track:'Contemplative',
    question:'Is the deepest Self (ātman) identical with ultimate reality (brahman), as the Upanishads teach?',
    origin:'A central claim of the Upanishads and the Bhagavad-Gita, both on the Hindu shelf.',
    evidence:'Science can study the *experience* — the sense of boundary-dissolution and unity reported in deep meditation is real, describable, and increasingly mapped to brain activity. But the metaphysical claim itself — that this Self simply *is* the ground of all being — isn’t framed as a third-person prediction anything could measure or refute. Confirming the neural correlates of the experience would neither prove nor disprove it.',
    verdictKind:'beyond',
    verdict:'Beyond what science can settle: the experience is studiable; the metaphysical identity is not a testable claim. That’s an honest boundary, not a verdict against it.',
    falsifier:'None available in principle — which is exactly *why* it sits here. A claim that could be tested would get a different verdict.',
    grounding:'Grounded in the Upanishads and the Bhagavad-Gita (Hindu shelf). What the teaching *means* is the Mountain Monk’s to hold, in the Keep — not this desk’s.',
  },
];
// The seed investigations plus the visitor's own, formatted for the
// Investigator's system prompt. The visitor's own are flagged so he can speak
// to them as *their* work — and lean on the evidence they actually cited.
/* BOUNDED, 2026-08-03 (#43) — and THIS, not the role prose, was the real
   weight. Both blocks below used to paste everything, on every message:

     every seeded investigation with its full verdict AND its grounding note
     (~890 tokens before the visitor has done anything at all), plus every
     investigation they have ever made, forever;

     every Science and Hindu text with its full summary, growing without
     limit in a project whose whole point is a Library you build yourself.

   That is the bug already found and fixed for Quill — "the librarian got
   slower and dumber the more books you owned" — still live in the Hall.
   The four exemplars do not need their prose recited every message; he
   needs to know they exist and what they concluded. The visitor's OWN
   investigations are the ones that matter, so those keep their evidence
   line, the recent ones win, and the rest are COUNTED rather than dropped
   silently — he must never assume a question is new. */
const OWN_INVESTIGATIONS_SHOWN = 8;
function investigationsForPrompt(){
  const seed=INVESTIGATIONS.map(v=>
    `- [${v.track}] "${v.question}" — ${(VERDICTS[v.verdictKind]||{}).label}`
  );
  const own=(data.hall.investigations||[]);
  const recent=own.slice(-OWN_INVESTIGATIONS_SHOWN);
  const mine=recent.map(v=>
    `- [${v.track||'—'}] (the visitor's own) "${v.question}" — verdict: ${(VERDICTS[v.verdictKind]||{}).label||'unsettled'}.`
    +(v.verdict?` ${v.verdict}`:'')+(v.evidence?` Evidence they cited: ${v.evidence}`:' (no evidence cited yet — worth asking them for a source).')
  );
  const more = own.length>recent.length
    ? [`(…and ${own.length-recent.length} older investigations of theirs, not listed here. Ask, or send them to the Hall — never assume a question is new.)`]
    : [];
  return seed.concat(mine, more).join('\n');
}
// Just the two shelves the Hall leans on most (Science and Hindu), so the
// Investigator can cite a real shelved text by name instead of inventing one.
// Degrades by size through the SAME brief Quill uses, so a grown Library
// makes him better-informed rather than slower.
function hallShelfSummary(){
  const docs=Store.allDocs().filter(d=>d.tradition==='Science'||d.tradition==='Hindu');
  if(!docs.length) return '(no Science or Hindu texts are shelved right now)';
  const brief=catalogueBrief(docs, {fullBudget:450, listBudget:800});
  return brief.text+briefCaveat(brief);
}
export function openScienceHall(){ state.ui='hall'; hideAllOv(); state.hallView=state.hallView||{mode:'list'}; renderScienceHall(); showOv('hallOv'); }
// The Investigator is the café Steward wearing a different hat; opening his
// chat reuses the whole resident chat stack (openChatDialog) with a synthetic
// "npc" so no plumbing is duplicated. He answers under the investigator
// grounding + WORK_CHARTER (see CHAT_AGENTS.investigator).
export function talkToInvestigator(){
  openChatDialog({
    name:'the Investigator', aiAgent:'investigator',
    color:'#2a2118', glow:'#8fb4d9',
    lines:['The laboratory’s open. Bring me a claim — anything from a headline to a line of scripture — and we’ll ask what could actually be shown, and what the evidence really says. No one here decrees the truth, including me: bring a source, and we’ll weigh it. Questions of meaning I send up to the Monk.'],
  });
}
export function newInvestigationForm(){ state.hallView={mode:'compose'}; renderScienceHall(); }
export function backToHallList(){ state.hallView={mode:'list'}; renderScienceHall(); }
// Phase 2 — the visitor opens their OWN investigation. The form's required
// fields ARE the discipline the user asked for: you can't file a verdict
// without stating the evidence behind it and what would change your mind.
// A claim with no source, or one you'd never give up, doesn't get to be a
// finding here — that's the whole point, enforced by the shape, not a lecture.
export function createInvestigation(){
  const g=id=>(document.getElementById(id)||{}).value||'';
  const question=g('invQuestion').trim();
  const evidence=g('invEvidence').trim();
  const falsifier=g('invFalsifier').trim();
  const missing=[];
  if(!question) missing.push('the question');
  if(!evidence) missing.push('the evidence and sources');
  if(!falsifier) missing.push('what would change your mind');
  const warn=document.getElementById('invFormWarn');
  if(missing.length){
    if(warn) warn.textContent='An investigation needs '+missing.join(', ')+' — that\'s the price of a seat at the table here: a claim backed by a source, and one you\'d actually be willing to give up.';
    return;
  }
  const inv={
    id:'inv-'+Date.now(),
    track:g('invTrack')||'Modern science',
    question, origin:g('invOrigin').trim(), evidence,
    verdictKind:g('invVerdict')||'',
    verdict:g('invVerdictText').trim(),
    falsifier,
    grounding:'Your own investigation — the sources you cited above stand behind it.',
    mine:true, created:todayKey(),
  };
  data.hall.investigations.unshift(inv);
  persist(); logActivity('Opened an investigation: "'+(question.length>60?question.slice(0,60)+'…':question)+'".'); blip(784,.09);
  state.hallView={mode:'list'}; renderScienceHall();
}
export function deleteInvestigation(id){
  data.hall.investigations=(data.hall.investigations||[]).filter(v=>v.id!==id);
  persist(); renderScienceHall();
}
// "Dissect a paper" — the user's ask: a place to pull apart a paper you
// disagree with. Reuses the paste-a-text pattern (like the Research Desk's
// summarizer) but with a critical-appraisal prompt that embodies the Hall's
// creed: steelman FIRST, then probe method/leaps/overreach, argue the claim
// not the authors, and never invent details the visitor didn't paste. The
// output can graduate straight into a kept investigation.
export async function dissectPaper(){
  const input=document.getElementById('hallDissectInput');
  const text=(input&&input.value||'').trim(); if(!text) return;
  const status=document.getElementById('hallDissectStatus');
  if(status) status.textContent='Dissecting…';
  const sys=WORK_CHARTER
    +"\n\nYou are the Investigator of the Sand Pavilion's Science & Research Hall. The visitor has brought "
    +"a paper — or a claim from one — to dissect, often one they disagree with. Give it a real critical "
    +"appraisal, in this order. First STEELMAN it: state the strongest, fairest version of what it actually "
    +"claims and what it actually shows. Then probe rigorously: the real claim versus any headline "
    +"overreach; whether the method could even support the claim; sample size, controls, and confounds; "
    +"statistical or logical leaps; any conflict of interest or funding pressure that's actually evident; "
    +"and where it's genuinely supported versus where it stretches. Close with a fair overall read (an "
    +"honest weighing, never a dunk), the single most important thing that would change your assessment, "
    +"and one or two things the visitor could actually go check. Hold to the Hall's rules: argue the claim, "
    +"never the authors; work ONLY from what they pasted — if something (sample size, controls, funding) "
    +"isn't stated, say it's unstated rather than invent it; and if you genuinely don't know a fact, say so "
    +"instead of bluffing. Keep it structured and readable — short headed sections or a tight list.";
  try{
    const reply=await AI.chat([{role:'system',content:sys},{role:'user',content:text}], {long:true}); // a paper appraisal is long — give it room
    state.hallView.lastDissect=reply;
    logActivity('Dissected a paper at the Science & Research Hall.'+elapsedTag()); blip(660,.08);
  }catch(e){
    state.hallView.lastDissect="The Investigator's connection flickered — no appraisal this time. (Check that your AI connection is still running.)";
  }
  if(status) status.textContent='';
  renderScienceHall();
}
export function clearDissect(){ if(state.hallView) state.hallView.lastDissect=null; renderScienceHall(); }
/* Keep an appraisal so the Hall is a place you can RETURN to your paper analyses,
   not just read one and lose it. Stored on data.hall.dissections; titled by the
   paper's name (asked for) so a shelf of past dissections stays legible. */
export function keepDissection(){
  const text=(state.hallView&&state.hallView.lastDissect)||''; if(!text) return;
  let title=window.prompt('Name this analysis (the paper or claim):','');
  if(title===null) return;
  title=(title||'').trim()||('Analysis · '+todayKey());
  if(!data.hall.dissections) data.hall.dissections=[];
  data.hall.dissections.unshift({ id:'dis-'+Date.now(), ts:todayKey(), title, text });
  persist(); logActivity('Kept a paper analysis: "'+title+'".'); blip(660,.08); setTimeout(()=>blip(825,.09),90);
  renderScienceHall();
}
export function reviewDissection(id){
  const d=(data.hall.dissections||[]).find(x=>x.id===id); if(!d) return;
  if(d.book){ openDissection(id); return; }   // a book dissection has its own room
  state.hallView.lastDissect=d.text; renderScienceHall();
  const el=document.getElementById('hallDissectStatus'); if(el) el.textContent='Showing "'+d.title+'" above.';
}
export function deleteDissection(id){
  data.hall.dissections=(data.hall.dissections||[]).filter(x=>x.id!==id); persist(); renderScienceHall();
}
/* ================================================================
   DISSECTING A BOOK — THE-STUDY-CHAIN-PLAN.md Stage 3.

     "one of the things i wana be able to do in the lab is to disect a
      book, i was able to take a look at a book but it wasent really
      streamlined, if i wana take notes on a book with ai and then save
      them for later that would be great."   (2026-08-03)

   Every piece of this already existed and none of it joined up. The
   reader could ask the AI for an impression, summarise a chapter, and
   hold your own typed notes. The Hall could pull apart a PASTED paper
   and keep the result. But a book on your own shelf — the thing you
   actually read — had no way to become an analysis you keep, so every
   pass over it evaporated when the panel closed.

   So a dissection GAINS A BOOK rather than a new store getting invented:

     { id, ts, title, text,        ← unchanged: the pasted-paper case
       book: 'slug',               ← which book, when there is one
       question: '…',              ← what you are after, written FIRST
       passes: [{ts, lens, where, text}] }

   A pasted paper keeps working exactly as it did: no book, no passes,
   one shot. Nothing about that case changes, because it works.

   THE QUESTION COMES FIRST, deliberately — the same discipline as the
   Bench upstairs, where the prediction is written before the meter is
   read. A dissection with no question is four AI paragraphs about a
   book, which is the thing that already evaporated.

   And "pull in my notes" needs no model at all. Every AI feature in
   this project has to clear that floor. */
const BOOK_LENSES = {
  claim: { label:'What is it claiming?', icon:'◉',
    ask:'State plainly what this passage is actually CLAIMING or arguing — the position itself, stripped of '
       +'style and hedging. If it is making several claims, separate them. If it is not making a claim at all '
       +'(it is narrative, or description, or instruction), say so plainly rather than manufacturing one.' },
  rests: { label:'What is it resting on?', icon:'⚓',
    ask:'Name what this passage RESTS ON: its assumptions, the evidence it offers, and the things it takes as '
       +'given without arguing for them. Be specific about which are stated and which are silent. An unstated '
       +'assumption is the most useful thing you can hand back here.' },
  weak:  { label:'Where is it weak?', icon:'⚠',
    ask:'Give the honest reservations about this passage — where the reasoning is thin, where a claim outruns '
       +'its evidence, what a serious critic would press on. Be fair rather than harsh: if it is strong, say '
       +'where and why. Never invent a flaw to fill the space.' },
  use:   { label:'What do I do with it?', icon:'⚙',
    ask:'What is the PRACTICAL residue of this passage — what could the reader actually do, test, build, or '
       +'watch for as a result of it? Concrete actions, not "reflect on this". If there is genuinely nothing '
       +'actionable here, say that plainly; not every good passage is a to-do list.' },
};
function dissections(){ if(!data.hall) data.hall={}; if(!data.hall.dissections) data.hall.dissections=[]; return data.hall.dissections; }
function dissectionFor(slug){ return dissections().find(d=>d.book===slug); }
export function dissectionRec(id){ return dissections().find(d=>d.id===id); }
/* Opened from the READER, which is where you are when you want it. The book's
   position is captured on the way in — the reader closes behind you, and a
   lens run afterwards must still know it was working on page 212 rather than
   quietly falling back to the blurb without saying so. */
export function dissectBook(){
  const slug=state.currentDoc; const d=slug&&Store.getDoc(slug); if(!d) return;
  /* readerBookGrounding() is written for a MODEL — it carries no slug (it never
     needed one) and its `where` is shouty prompt-language. Both matter here: the
     slug is how the panel knows this grounding belongs to this book rather than
     silently falling back to the blurb, and the human label is what a person
     actually reads. Caught by looking, 2026-08-03: the panel said "no page is
     open" while the reader was open at that very page. */
  const g=readerBookGrounding();
  if(g){
    g.slug=slug;
    const v=state.fullTextView;
    g.human=(v&&v.slug===slug)
      ? 'page '+(v.page+1)+' of '+v.pages.length
      : 'the book’s summary and sections';
    g.onPage=!!(v&&v.slug===slug);
  }
  state.dissectWhere=g;
  let rec=dissectionFor(slug);
  if(!rec){
    rec={ id:'dis-'+Date.now(), ts:todayKey(), title:d.title, book:slug, question:'', passes:[], text:'' };
    dissections().unshift(rec); persist();
    logActivity('Started a dissection of "'+d.title+'".'); blip(700,.08);
  }
  state.ui='hall'; hideAllOv(); state.hallView={mode:'book', id:rec.id}; renderScienceHall(); showOv('hallOv');
}
/* Reached from the Lab or the Hall list instead, with no reader behind it. The
   grounding falls back to the book's summary and sections and SAYS SO — an
   analysis that quietly appraised the blurb while you thought it read the
   chapter is worse than no analysis. */
function dissectGrounding(rec){
  const w=state.dissectWhere;
  if(w && rec.book && w.slug===rec.book) return w;
  const d=rec.book&&Store.getDoc(rec.book); if(!d) return null;
  return { slug:rec.book, title:d.title, summary:d.doc.summary,
    where:"THE BOOK'S SUMMARY AND SECTIONS (not the full text — no page was open)",
    text:(d.doc.sections||[]).map(x=>x.heading+': '+x.body).join('\n\n') };
}
/* ================================================================
   SEARCH THE WHOLE BOOK — REFERENCE-AND-RETRIEVAL-PLAN.md Part B.

   Until now a lens could only see the page you happened to be on, so
   "go through this paper properly with the local AI" meant finding
   every relevant passage yourself first — which is most of the work.

   Now: your QUESTION is the query. It searches every page of the book,
   takes the three that actually answer it, and those become what the
   lenses work on — each labelled with its real page number, so the
   model can cite it and you can go and check.

   The question field earning a second job is the point. It was already
   the discipline of this room ("write it before you run anything");
   now it is also the thing that finds the material. One field, two
   reasons, no new UI to learn.

   Honest about what it is: keyword matching, not meaning. Ask about
   "impermanence" and it will not find a page that only says "nothing
   lasts". The panel says so rather than letting a thin result look
   like a thorough one. */
export async function findPassagesFor(id){
  const rec=dissectionRec(id); if(!rec||!rec.book) return;
  const status=document.getElementById('bdStatus');
  const q=(rec.question||'').trim();
  if(!q){ if(status) status.textContent='Write your question first — it is what the search looks for.'; return; }
  if(status) status.textContent='🔎 Reading the whole book…';
  const text=await loadBookText(rec.book);
  if(!text){
    if(status) status.textContent='This one has no full text here — there is nothing to search. '
      +'(A summary-only book, a paper book you own, or local storage is not running.)';
    return;
  }
  const pages=paginate(text);
  const hits=searchPages(pages, q, {limit:3});
  if(!hasResults(hits)){
    if(status) status.textContent='Nothing in this book matched those words. This searches for WORDS, not meaning — '
      +'try the terms the author would actually use, or open the passage yourself and press 🔬 Dissect from here.';
    return;
  }
  const d=Store.getDoc(rec.book);
  state.dissectWhere={
    slug:rec.book, title:d.title, summary:d.doc.summary,
    where:'THE '+hits.length+' PASSAGES OF THIS BOOK THAT BEST MATCH THE READER\'S QUESTION '
      +'(pages '+hits.map(h=>h.page+1).join(', ')+'). Cite the page number when you draw on one.',
    human:hits.length+' matching passage'+(hits.length===1?'':'s')+' · pages '+hits.map(h=>h.page+1).join(', '),
    onPage:true,
    text:passagesBlock(hits, {full:true, cap:7000}),
    found:hits.map(h=>({page:h.page, snippet:h.snippet})),
  };
  logActivity('Searched "'+rec.title+'" for the passages matching the question.');
  blip(700,.07);
  renderScienceHall();
}
export function setDissectQuestion(id,val){
  const rec=dissectionRec(id); if(!rec) return;
  rec.question=val; rec.ts=todayKey();
  clearTimeout(dissectQTimer); dissectQTimer=setTimeout(persist,600);
}
let dissectQTimer=null;
export async function runBookLens(id, lensKey){
  const rec=dissectionRec(id); if(!rec) return;
  const lens=BOOK_LENSES[lensKey]; if(!lens) return;
  const status=document.getElementById('bdStatus');
  const g=dissectGrounding(rec);
  if(!g){ if(status) status.textContent='That book is no longer on the shelf.'; return; }
  if(!isAIActive()){
    if(status) status.textContent='Connect a local AI (⚙ Manage AI connections) for the lenses — '
      +'“Pull in my notes” below works without one.';
    return;
  }
  const btns=document.querySelectorAll('#bdLensRow button'); btns.forEach(b=>b.disabled=true);
  if(status) status.textContent=lens.icon+' Reading it that way… (a slower model may take a moment)';
  try{
    const reply=await AI.chat([
      {role:'system', content:WORK_CHARTER+'\n\n'+lens.ask
        +'\n\nWork STRICTLY from the passage given. Do not draw on what you may know about this book from '
        +'elsewhere, and never invent a quotation, a page number or a chapter title. If the passage is too '
        +'short or too fragmentary to answer honestly, say exactly that. A few short paragraphs, plain prose.'
        +(rec.question?'\n\nThe reader is working towards this question, so answer with it in view: '+rec.question:'')},
      {role:'user', content:'BOOK: '+g.title+'\nWORKING FROM: '+g.where+'\n\n'+String(g.text||'').slice(0,7000)},
    ], {long:true});
    if(isEmptyReply(reply)){ if(status) status.textContent='The model came back empty — a lighter model may do better.'; }
    else {
      rec.passes.unshift({ ts:todayKey(), lens:lensKey, where:g.where, text:String(reply).trim() });
      rec.ts=todayKey(); persist();
      logActivity('Added a "'+lens.label+'" pass to "'+rec.title+'".'+elapsedTag());
      blip(660,.08); setTimeout(()=>blip(825,.09),90);
      renderScienceHall();
    }
  }catch(e){ if(status) status.textContent='The connection flickered — no pass this time (is your local AI still running?).'; }
  document.querySelectorAll('#bdLensRow button').forEach(b=>b.disabled=false);
}
/* The book's ACTUAL shape, for any prompt that would otherwise invite a model
   to invent one. Returns '' when we genuinely do not know — an absent block,
   never a guessed one, the same rule the notes follow for a missing chapter.
   Reads the text through loadBookText(), so it works with no reader open. */
async function bookStructureBlock(slug){
  try{
    const text=await loadBookText(slug); if(!text) return '';
    const pages=paginate(text);
    const {marks,how}=findChapters(pages);
    if(!marks.length){
      return '\n\nTHE BOOK\'S ACTUAL SHAPE (from the text itself): '+pages.length
        +' pages, with no chapter divisions marked in it. Do not invent chapters for it.';
    }
    const list=marks.slice(0,40).map((m,i)=>`  ${i+1}. ${m.label} (from page ${m.page+1})`).join('\n');
    return '\n\nTHE BOOK\'S ACTUAL SHAPE, read from the text itself — use THESE and never invent a chapter '
      +'or a count:\n'+pages.length+' pages, '+marks.length+' chapters'+(how==='toc'?' (named by its own table of contents)':'')
      +':\n'+list+(marks.length>40?'\n  …':'');
  }catch(e){ return ''; }
}
/* THE STEWARD'S PRE-NOTES — his first duty, made real (2026-08-03).

     "you come to [the Steward] for the work like doing pre notes on a book"

   The preparatory pass you would otherwise do by hand: before you read a
   thing, what is it, how is it built, what is worth watching for, and which
   questions are worth holding while you read. It lands as the FIRST pass of
   the dissection, so it is there waiting when you come back to it — the point
   of pre-notes being that they exist before the reading, not after.

   Grounded in the summary and section headings rather than the page you are
   on: you have not read it yet, so "the page you are on" is the wrong unit,
   and a pre-note built from a passage you already read is just a note. */
export async function stewardPreNotes(id){
  const rec=dissectionRec(id); if(!rec||!rec.book) return;
  const d=Store.getDoc(rec.book); if(!d) return;
  const status=document.getElementById('bdStatus');
  if(!isAIActive()){
    if(status) status.textContent='The Steward needs a local AI connected (⚙ Manage AI connections) to prepare notes.';
    return;
  }
  if((rec.passes||[]).some(x=>x.lens==='prenotes')){
    if(status) status.textContent='The Steward has already prepared notes on this one — they are in the passes below.';
    return;
  }
  const btns=document.querySelectorAll('#bdLensRow button'); btns.forEach(b=>b.disabled=true);
  if(status) status.textContent='📋 The Steward is preparing notes…';
  const src=[d.title, d.doc.summary, ...(d.doc.sections||[]).map(x=>x.heading+': '+x.body)].join('\n\n');
  /* HAND IT THE REAL STRUCTURE RATHER THAN HOPING (2026-08-03, from a probe
     against ornith:9b — BETA-TESTING-FEEDBACK.md Round 6). Asked for pre-notes
     on the Dhammapada from its blurb, the model wrote "grouped into five
     thematic chapters: the Mind, Heedfulness, Anger, the Self, and the Path."
     The book has TWENTY-SIX. The blurb listed five themes as examples and the
     model turned them into a structure — then the visitor opens the book and
     finds Chapter XXVI. "HOW IT IS BUILT" is a question with a real answer we
     now hold, so we answer it instead of asking a model to guess. */
  const struct=await bookStructureBlock(rec.book);
  /* And say how thin the material IS, in numbers, rather than asking the model
     to judge that for itself. It does not: on a 431-character blurb of the Tao
     Te Ching it invented an attribution, a technical term, and a QUOTATION —
     with "never invent a quotation" in the prompt it had just been given. A
     rule the model has to notice it is breaking is weaker than a fact. */
  const thin = src.length<900 && !struct
    ? '\n\nIMPORTANT — you have been given only a short catalogue blurb ('+src.length+' characters), NOT the book. '
      +'You do not know its structure, its chapter count, its author, or any of its wording. Say plainly, in HOW IT '
      +'IS BUILT, that the text itself is not here and this is prepared from the blurb alone. Do not name a number '
      +'of chapters, do not name an author, and quote nothing.'
    : '';
  try{
    const reply=await AI.chat([
      {role:'system', content:WORK_CHARTER+'\n\nYou are the Steward of the Sand Pavilion, doing the preparatory work '
        +'before someone reads a book. Produce PRE-NOTES, in four short labelled parts:\n'
        +'WHAT IT IS — what kind of thing this is and what it is trying to do, in two or three sentences.\n'
        +'HOW IT IS BUILT — its shape and how to move through it.\n'
        +'WATCH FOR — three or four specific things worth noticing as they read.\n'
        +'QUESTIONS TO HOLD — three questions worth carrying through the reading.\n'
        +'Work strictly from what you are given. Do not draw on what you may know about this book from '
        +'elsewhere, never invent a chapter title or a quotation, and where the material given is too thin '
        +'to say something useful, say that plainly instead of padding. This is preparation, not a review: '
        +'do not tell them what to conclude.'
        +thin
        +(rec.question?'\n\nThey are reading towards this question, so aim the notes at it: '+rec.question:'')},
      {role:'user', content:src+struct},
    ], {long:true});
    if(isEmptyReply(reply)){ if(status) status.textContent='The model came back empty — a lighter model may do better.'; }
    else {
      rec.passes.push({ ts:todayKey(), lens:'prenotes',
        where:"THE STEWARD'S PREPARATION, from the summary and section headings", text:String(reply).trim() });
      rec.ts=todayKey(); persist();
      logActivity('The Steward prepared pre-notes on "'+rec.title+'".'+elapsedTag());
      blip(660,.08); setTimeout(()=>blip(825,.09),90);
      renderScienceHall();
    }
  }catch(e){ if(status) status.textContent='The connection flickered — no pre-notes this time (is your local AI still running?).'; }
  document.querySelectorAll('#bdLensRow button').forEach(b=>b.disabled=false);
}

/* The no-AI half, and the one that makes a dissection YOURS rather than the
   model's: your own typed notes on that book, gathered into the analysis as a
   pass of their own. Reading notes were already saved per page and already
   went nowhere. */
export function pullNotesIntoDissection(id){
  const rec=dissectionRec(id); if(!rec||!rec.book) return;
  const status=document.getElementById('bdStatus');
  /* YOUR OWN, NOT THE AI'S — and this is the ONE place in the codebase where
     that distinction is a genuine exclusion rather than a labelling problem:
     the "mine" lens of a dissection is by definition the reader's own pass at
     the text, and seeding it with the assistant's reading would defeat the
     whole exercise. It was a /^✨ / regex until 2026-08-09; a prefix is a
     string one edit away from lying. */
  const notes=(data.bookNotes[rec.book]||[]).filter(n=>!isAiNote(n));
  if(!notes.length){ if(status) status.textContent='No notes of your own on this book yet — write one beside the text and it lands here.'; return; }
  const already=new Set(rec.passes.filter(x=>x.lens==='mine').map(x=>x.text));
  const text=notes.map(n=>'• '+(n.page!==undefined?'p.'+(n.page+1)+' — ':'')+n.text).join('\n');
  if(already.has(text)){ if(status) status.textContent='Those notes are already in here — nothing new since last time.'; return; }
  rec.passes.unshift({ ts:todayKey(), lens:'mine', where:'YOUR OWN READING NOTES ('+notes.length+')', text });
  rec.ts=todayKey(); persist(); blip(700,.08);
  logActivity('Pulled '+notes.length+' reading note'+(notes.length===1?'':'s')+' into the dissection of "'+rec.title+'".');
  renderScienceHall();
}
export function deleteDissectPass(id, i){
  const rec=dissectionRec(id); if(!rec) return;
  rec.passes.splice(i,1); persist(); renderScienceHall();
}
export function openDissection(id){
  const rec=dissectionRec(id); if(!rec) return;
  state.ui='hall'; hideAllOv(); state.hallView={mode:'book', id}; renderScienceHall(); showOv('hallOv');
}
export function readDissectedBook(id){
  const rec=dissectionRec(id); if(!rec||!rec.book) return;
  openReader(rec.book);
}
/* A book dissection graduates into a filed investigation the same way a paper
   one does — the passes become the evidence field. Free, because the compose
   form already takes a prefill. */
export function investigationFromBook(id){
  const rec=dissectionRec(id); if(!rec) return;
  const ev=(rec.question?'Working question: '+rec.question+'\n\n':'')
    +'From "'+rec.title+'":\n\n'
    +rec.passes.map(x=>'['+((BOOK_LENSES[x.lens]||{}).label||'My notes')+' — '+x.where+']\n'+x.text).join('\n\n');
  state.hallView={mode:'compose', prefill:{ evidence:ev }};
  renderScienceHall();
}

// Graduate an appraisal into a kept investigation — carries the critique into
// the compose form's evidence field, so a dissection becomes a real, filed
// finding (you still supply the question, verdict, and falsifier yourself).
export function investigationFromDissect(){
  const crit=(state.hallView&&state.hallView.lastDissect)||'';
  state.hallView={mode:'compose', prefill:{ evidence:crit }};
  renderScienceHall();
}
/* Phase 3 — self-experiments: "test things you think are great." The least-
   fakeable evidence, because it's your own logged data. Define a practice and a
   simple daily measure, log it honestly over real days, then read it back WITH
   the Investigator (who names how an n-of-1 fools you). No background timer — a
   day is only logged when you're here and log it, the no-background rule kept.
   Calendar/bell scheduling is the honest next increment (Phase 3b), not this
   slice. */
function experiment(id){ return (data.hall.experiments||[]).find(e=>e.id===id); }
export function newExperimentForm(){ state.hallView={mode:'experiment'}; renderScienceHall(); }
export function createExperiment(){
  const practice=((document.getElementById('expPractice')||{}).value||'').trim();
  const measure=((document.getElementById('expMeasure')||{}).value||'').trim();
  const warn=document.getElementById('expWarn');
  if(!practice||!measure){ if(warn) warn.textContent='A self-experiment needs both a practice to try and one honest thing to measure — those two are what makes it a test rather than a hope.'; return; }
  data.hall.experiments.unshift({ id:'exp-'+Date.now(), practice, measure, created:todayKey(), log:[] });
  persist(); logActivity('Started a self-experiment: "'+(practice.length>50?practice.slice(0,50)+'…':practice)+'".'); blip(784,.09);
  state.hallView={mode:'list'}; renderScienceHall();
}
export function logExperimentToday(id){
  const e=experiment(id); if(!e) return;
  const sel=document.getElementById('expVal-'+id), noteEl=document.getElementById('expNote-'+id);
  const value=sel?Number(sel.value):null; const note=noteEl?noteEl.value.trim():'';
  if(!value) return;
  const k=todayKey();
  const existing=e.log.find(d=>d.date===k);
  if(existing){ existing.value=value; existing.note=note; } // one honest entry per day; re-logging updates it
  else e.log.unshift({ date:k, value, note });
  persist(); logActivity('Logged a self-experiment day ('+value+'/5).'); blip(659,.07);
  renderScienceHall();
}
export function deleteExperiment(id){
  data.hall.experiments=(data.hall.experiments||[]).filter(e=>e.id!==id);
  persist(); renderScienceHall();
}
// Read your logged data honestly, with the Investigator — reuses the chat stack
// and tags the dialog with experimentContext (see CHAT_AGENTS.investigator).
export function readExperimentWithInvestigator(id){
  const e=experiment(id); if(!e) return;
  const days=e.log.slice().sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const ctx=`Practice: ${e.practice}\nMeasure (1-5): ${e.measure}\nStarted: ${e.created}\nDays logged (${days.length}):\n`
    +(days.length?days.map(d=>`- ${d.date}: ${d.value}/5${d.note?' — '+d.note:''}`).join('\n'):'(none yet)');
  openChatDialog({
    name:'the Investigator', aiAgent:'investigator', color:'#2a2118', glow:'#8fb4d9',
    lines:['Let’s read your own data honestly — what it shows, and every way a study of one could be fooling us. Here’s what you’ve logged; ask me what you like.'],
  });
  if(state.dialog) state.dialog.experimentContext=ctx;
}

/* ================================================================
   THE BENCH — where a BUILD lives. Added 2026-08-02, driven by the
   universal-remote project (plans/UNIVERSAL-REMOTE-PROJECT.md), which
   surfaced the real gap in this room: a self-experiment is shaped
   `a practice + one 1-5 measure, daily`. That is exactly right for
   meditation and exactly wrong for making a thing. Building has a
   different shape:

        what I expected  ->  what I did  ->  what actually happened

   ...and the ORDER is the entire point, not a formatting choice. So
   the Bench is deliberately TWO-PHASE: you save a prediction first,
   and only then does the "what happened" half become reachable. You
   cannot quietly backfill a prediction once you know the answer,
   because by then it is already written down. That one constraint is
   the Hall's creed made structural — the same trick the investigation
   form plays with its required falsifier field, and the same reason
   Stage 2 of the remote project decodes a frame by hand before letting
   a library do it.

   This is SCIENCE-RESEARCH-HALL-PLAN.md's "L0 — the print log",
   generalised past 3D printing: a circuit, a print, a recipe and a
   repair all log the same way.
   ================================================================ */
const OUTCOMES = {
  'as-predicted':{ label:'Went as I predicted',  color:'#7fb069', bg:'rgba(127,176,105,.14)' },
  'surprised':   { label:'Worked — but not how I expected', color:'#e0a43c', bg:'rgba(224,164,60,.14)' },
  'failed':      { label:'Did not work',          color:'#d98c8c', bg:'rgba(217,140,140,.14)' },
  'inconclusive':{ label:'Could not tell yet',    color:'#8fb4d9', bg:'rgba(143,180,217,.14)' },
};
function buildRec(id){ return (data.hall.builds||[]).find(b=>b.id===id); }
export function newBuildForm(){ state.hallView={mode:'build'}; renderScienceHall(); }
export function createBuild(){
  const g=id=>((document.getElementById(id)||{}).value||'').trim();
  const name=g('bldName'), goal=g('bldGoal');
  const warn=document.getElementById('bldWarn');
  if(!name){ if(warn) warn.textContent='Give the build a name — even a rough one. "A universal remote" is plenty.'; return; }
  if(!data.hall.builds) data.hall.builds=[];
  data.hall.builds.unshift({ id:'bld-'+Date.now(), name, goal, created:todayKey(), entries:[] });
  persist(); logActivity('Started a build at the Bench: "'+name+'".'); blip(740,.09);
  state.hallView={mode:'list'}; renderScienceHall();
}
export function deleteBuild(id){
  const b=buildRec(id); if(!b) return;
  const n=(b.entries||[]).length;
  if(n && !window.confirm('Close "'+b.name+'" and delete its '+n+' logged step'+(n===1?'':'s')+'?\n\nThe log is the point of a bench — this cannot be undone.')) return;
  data.hall.builds=(data.hall.builds||[]).filter(x=>x.id!==id);
  persist(); renderScienceHall();
}
// Phase one of an entry: the prediction, saved BEFORE you go and try it.
export function predictForm(buildId){ state.hallView={mode:'predict',buildId}; renderScienceHall(); }
export function createPrediction(){
  const v=state.hallView||{};
  const b=buildRec(v.buildId); if(!b) return;
  const g=id=>((document.getElementById(id)||{}).value||'').trim();
  const stage=g('preStage'), predicted=g('prePredict'), why=g('preWhy');
  const warn=document.getElementById('preWarn');
  const missing=[];
  if(!stage) missing.push('what you are about to try');
  if(!predicted) missing.push('what you expect to happen');
  if(missing.length){
    if(warn) warn.textContent='The Bench needs '+missing.join(' and ')+'. Writing the guess down before you find out is the whole reason this room exists — a prediction recorded afterwards is just a description.';
    return;
  }
  b.entries.unshift({ id:'e-'+Date.now(), stage, predicted, why, opened:todayKey(),
    did:null, measured:null, outcome:null, next:null, closed:null });
  persist(); logActivity('Predicted a bench step: "'+(stage.length>50?stage.slice(0,50)+'…':stage)+'".'); blip(659,.07);
  state.hallView={mode:'list'}; renderScienceHall();
}
// Phase two: what actually happened. Only reachable on an entry that
// already has a prediction sitting above it.
export function closeBenchEntry(buildId,entryId){
  const b=buildRec(buildId); if(!b) return;
  const e=(b.entries||[]).find(x=>x.id===entryId); if(!e) return;
  const g=id=>((document.getElementById(id)||{}).value||'').trim();
  const did=g('bDid-'+entryId), measured=g('bMeas-'+entryId), next=g('bNext-'+entryId);
  const outcome=g('bOut-'+entryId);
  const warn=document.getElementById('bWarn-'+entryId);
  if(!outcome){ if(warn) warn.textContent='Say how it went against what you predicted — that comparison is the only thing being logged here.'; return; }
  e.did=did; e.measured=measured; e.outcome=outcome; e.next=next; e.closed=todayKey();
  persist(); logActivity('Logged a bench result ('+((OUTCOMES[outcome]||{}).label||outcome)+').'); blip(784,.08);
  renderScienceHall();
}
export function reopenBenchEntry(buildId,entryId){
  const b=buildRec(buildId); if(!b) return;
  const e=(b.entries||[]).find(x=>x.id===entryId); if(!e) return;
  e.outcome=null; e.closed=null; persist(); renderScienceHall();
}
// Read the build log back with the Investigator — the same move as reading a
// self-experiment's data, pointed at a run of predictions and results. What he
// is actually good for here is the pattern across entries that you are too
// close to see: the same wrong assumption showing up four times.
export function readBuildWithInvestigator(id){
  const b=buildRec(id); if(!b) return;
  const done=(b.entries||[]).filter(e=>e.closed);
  const open=(b.entries||[]).filter(e=>!e.closed);
  const ctx=`Build: ${b.name}\nGoal: ${b.goal||'(not stated)'}\nStarted: ${b.created}\n`
    +`\nSteps logged and finished (${done.length}), newest first:\n`
    +(done.length?done.map(e=>
        `- [${e.opened}${e.closed&&e.closed!==e.opened?' → '+e.closed:''}] ${e.stage}\n`
        +`    PREDICTED: ${e.predicted}${e.why?' (because: '+e.why+')':''}\n`
        +`    DID: ${e.did||'(not written)'}\n`
        +`    MEASURED: ${e.measured||'(nothing measured)'}\n`
        +`    OUTCOME: ${(OUTCOMES[e.outcome]||{}).label||e.outcome}${e.next?`\n    NEXT: ${e.next}`:''}`
      ).join('\n'):'(none finished yet)')
    +(open.length?`\n\nPredicted but not yet run (${open.length}):\n`
      +open.map(e=>`- ${e.stage} — expects: ${e.predicted}`).join('\n'):'');
  openChatDialog({
    name:'the Investigator', aiAgent:'investigator', color:'#2a2118', glow:'#8fb4d9',
    lines:['Let’s read the bench log. I’m less interested in whether it works yet than in where your predictions and your measurements keep disagreeing — that gap is where the learning actually is.'],
  });
  if(state.dialog) state.dialog.buildContext=ctx;
}
/* ================================================================
   THE LAB — the room, at last. Asked for 2026-08-02: "it would be nice
   to have something like a science lab to do all these things."

   It cost no new building, because the Pavilion had already promised
   it. The Workshop's Unfinished Floor has carried a MAKER'S BENCH
   placeholder whose sign read, verbatim: "A home for real-world
   physical projects — a build, a repair, a garden. Not open yet."
   That is precisely what got built this week. So the placeholder
   opens rather than a new room appearing beside it — a promise kept
   is worth more than a promise added, and the floor is one room less
   unfinished.

   What the Lab actually IS: the gathering view. `RESEARCH-ROOM-PLAN.md`
   Phase 1 asked for a "My Research" home — one place showing the
   scattered research material together — and said to build it from
   what real use showed was needed rather than guessing. Real use has
   now shown: builds, datasheets, the paper shelf, investigations,
   experiments. So this is that home, wearing a lab coat. It OWNS
   nothing and duplicates nothing; every count here is read live from
   where the thing already lives, and every button walks you there.
   ================================================================ */
/* THE LIFT — added 2026-08-02, at the steward's own suggestion after they
   could not find the Lab: "there should be a staircase or an elevator."
   The Workshop has three real floors and the only way to the third was two
   separate staircases, on a floor that until that morning said nothing was
   open. A building tall enough to get lost in needs a way to name where you
   are going. Every floor has one; the one you are on is marked. */
const WORKSHOP_FLOORS = [
  { scene:'workshop',        label:'Ground floor',  what:'Sebastian, his calendar, and the Archive / Research / Caravan desks', sx:12, sy:6 },
  { scene:'workshopfloor2',  label:'Records Hall',  what:"the Pavilion's own memory, made walkable",                            sx:8,  sy:6 },
  { scene:'workshopfloor3',  label:'The Lab',       what:'the Bench, your datasheets and paper books, and the research you have gathered', sx:2, sy:5 },
];
export function openLift(){ state.ui='lift'; hideAllOv(); renderLift(); showOv('liftOv'); }
function renderLift(){
  const here=state.scene;
  document.getElementById('liftPanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>🛗 The Lift</h2>
    <div class="meta">Three floors. Pick one.</div>
    <div style="margin-top:12px">${WORKSHOP_FLOORS.map(f=>{
      const on=f.scene===here;
      return `<div class="card" ${on?'style="cursor:default;opacity:.6"':`style="cursor:pointer" onclick="takeLift('${f.scene}')"`}>
        <div class="t">${esc(f.label)}${on?' <span class="badge lic">you are here</span>':''}</div>
        <div class="s" style="margin-top:4px">${esc(f.what)}</div>
      </div>`;
    }).join('')}</div>`;
}
export function takeLift(scene){
  const f=WORKSHOP_FLOORS.find(x=>x.scene===scene); if(!f) return;
  closeUI(); blip(520,.07);
  warpTo(f.scene, f.sx, f.sy);
}
export function openLab(){ state.ui='lab'; hideAllOv(); renderLab(); showOv('labOv'); }
function renderLab(){
  const el=document.getElementById('labPanel'); if(!el) return;
  const mine=personalBooks();
  const ds=mine.filter(b=>b.kind==='datasheet');
  const own=mine.filter(b=>b.kind==='physical');
  const builds=(data.hall&&data.hall.builds)||[];
  const invs=(data.hall&&data.hall.investigations)||[];
  const exps=(data.hall&&data.hall.experiments)||[];
  const diss=(data.hall&&data.hall.dissections)||[];
  const openSteps=builds.reduce((n,b)=>n+(b.entries||[]).filter(e=>!e.closed).length,0);
  const bench=(n,label,note,btn,fn)=>`
    <div class="card" style="cursor:default">
      <div class="t">${label} <span class="badge lic">${n}</span></div>
      <div class="s" style="margin-top:5px">${note}</div>
      <div class="row" style="margin-top:8px"><button class="btn ghost" style="font-size:11.5px" onclick="${fn}">${btn}</button></div>
    </div>`;
  el.innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>🔬 The Lab ${visBadge('private')}</h2>
    <div class="meta">The bench where the making happens, and the one place your research material is
      gathered rather than scattered. Nothing lives <i>here</i> — every count below is read live from
      wherever the thing actually is, and every button walks you to it. Upstairs is where a claim gets
      appraised carefully; down here is where you are allowed to break things.</div>

    ${openSteps?`<div class="card" style="cursor:default;margin-top:12px;border-color:#e0a43c;background:rgba(224,164,60,.06)">
      <div class="t" style="color:#e0a43c">${openSteps} prediction${openSteps===1?'':'s'} waiting on a result</div>
      <div class="s" style="margin-top:5px">You wrote down what you expected and haven't recorded what happened yet.
        That's the only thing this room ever nags about, because it's the only half that goes stale.</div>
      <div class="row" style="margin-top:8px"><button class="btn" style="font-size:11.5px" onclick="openScienceHall()">Record what happened →</button></div>
    </div>`:''}

    <h3 style="margin-top:20px">Making</h3>
    ${bench(builds.length,'🔧 The Bench','Things you are building — a circuit, a print, a repair. Every step predicted before you try it, recorded after.','Open the Bench','openScienceHall()')}
    ${bench(exps.length,'🧪 Self-experiments','Things you are testing on yourself, logged day by day.','Open the Hall','openScienceHall()')}

    <h3 style="margin-top:20px">Reference — what you can reach for</h3>
    <div class="card" style="cursor:default">
      <div class="t">⚙ Datasheets <span class="badge lic">${ds.length}</span></div>
      <div class="s" style="margin-top:5px">The documents you look one number up in, over and over. At the Computer,
        <code>ds</code> lists them and <code>ds &lt;part&gt;</code> goes straight to one.</div>
      ${ds.length?`<div style="margin-top:7px">${ds.slice(0,8).map(b=>
        `<div class="s"><b>${esc(b.part||'—')}</b> · <span style="cursor:pointer;text-decoration:underline" onclick="closeUI();openReader('${esc(b.slug)}')">${esc(b.title||'untitled')}</span></div>`
        ).join('')}${ds.length>8?`<div class="s" style="opacity:.8">…and ${ds.length-8} more</div>`:''}</div>`
        :`<div class="s" style="margin-top:6px;opacity:.85">None yet. Datasheets are PDFs — <code>tools/caravan/pdf-to-text.py</code>
          turns one into text you can drop in, then set its kind to <b>a datasheet</b> in Your Library and give it the part number.</div>`}
      <div class="row" style="margin-top:8px"><button class="btn ghost" style="font-size:11.5px" onclick="openComputer()">🖥 Open the Computer</button></div>
    </div>
    <div class="card" style="cursor:default">
      <div class="t">📕 Owned on paper <span class="badge lic">${own.length}</span></div>
      <div class="s" style="margin-top:5px">Real books on a real shelf. There is no text here and there never will be —
        but they stay findable, they hold your page notes, you can cite them in an investigation, and
        <b>the residents know you have them</b>, so the answer can be "you own that one, chapter 4, go and look"
        instead of a worse explanation from memory. That is the point of recording one.</div>
      ${own.length?`<div style="margin-top:7px">${own.slice(0,8).map(b=>
        `<div class="s">• ${esc(b.title||'untitled')}${b.attribution?` <span style="opacity:.8">— ${esc(b.attribution)}</span>`:''}</div>`
        ).join('')}${own.length>8?`<div class="s" style="opacity:.8">…and ${own.length-8} more</div>`:''}</div>`
        :`<div class="s" style="margin-top:6px;opacity:.85">None recorded. Add one by hand with just its title and author — leave the
          text empty, that's expected — then set its kind to <b>owned on paper</b> in Your Library.</div>`}
      <div class="row" style="margin-top:8px">
        <button class="btn ghost" style="font-size:11.5px" onclick="openBookIntake()">📥 Record one</button>
        <button class="btn ghost" style="font-size:11.5px" onclick="openMyLibrary()">👤 Your Library</button>
      </div>
    </div>

    <h3 style="margin-top:20px">Asking</h3>
    ${bench(invs.length,'🔬 Your investigations','Claims you have put a question, evidence and a falsifier to.','Open the Hall','openScienceHall()')}
    <div class="card" style="cursor:default">
      <div class="t">🔬 Dissections <span class="badge lic">${diss.length}</span></div>
      <div class="s" style="margin-top:5px">Things you have pulled apart and <b>kept</b> — a book worked through
        over several evenings, or a paper appraised in one go. A book dissection holds your question, the
        passes you have taken at it, and your own reading notes; close the app and it is all still here.</div>
      ${diss.length?`<div style="margin-top:7px">${diss.slice(0,6).map(d=>
        `<div class="s">${d.book?'📖':'📄'} <span style="cursor:pointer;text-decoration:underline" onclick="${d.book
          ?`openDissection('${esc(d.id)}')`:`openScienceHall()`}">${esc(d.title||'untitled')}</span>${
          d.book&&(d.passes||[]).length?` <span style="opacity:.75">· ${d.passes.length} pass${d.passes.length===1?'':'es'}</span>`:''}</div>`
        ).join('')}${diss.length>6?`<div class="s" style="opacity:.8">…and ${diss.length-6} more</div>`:''}</div>`
        :`<div class="s" style="margin-top:6px;opacity:.85">None yet. Open any book and press <b>🔬 Dissect this book</b> —
          that is the whole way in, and pulling in the notes you already wrote needs no AI at all.</div>`}
      <div class="row" style="margin-top:8px">
        <button class="btn ghost" style="font-size:11.5px" onclick="openIndex()">📚 Find a book to dissect</button>
        <button class="btn ghost" style="font-size:11.5px" onclick="openScienceHall()">📄 Appraise a pasted paper</button>
      </div>
    </div>

    <div class="row" style="margin-top:18px;flex-wrap:wrap">
      <button class="btn ghost" onclick="openResearchDesk()">🗂 The Research Desk</button>
      <button class="btn ghost" onclick="openLearningTree()">🌳 The Learning Tree</button>
    </div>`;
}
function renderScienceHall(){
  const v=state.hallView||{mode:'list'};
  const panel=document.getElementById('hallPanel');
  /* ----- A BOOK, PULLED APART OVER TIME (THE-STUDY-CHAIN-PLAN.md Stage 3).
     Deliberately NOT the pasted-paper form below: that one is a single shot at
     a single passage, and it is right for what it does. This is the other
     shape — one book, revisited, the passes accumulating across evenings. */
  if(v.mode==='book'){
    const rec=dissectionRec(v.id);
    if(!rec){ state.hallView={mode:'list'}; return renderScienceHall(); }
    const d=rec.book&&Store.getDoc(rec.book);
    const g=(function(){ const w=state.dissectWhere; return (w&&w.slug===rec.book)?w:null; })();
    /* Every pass kind must have a name here. A pass falling through to the
       wrong label is the quietest possible lie about where something came
       from, in the one panel whose whole job is saying where things came from. */
    const PASS_KINDS={ mine:{label:'Your own reading notes', icon:'🗒'},
                       prenotes:{label:"The Steward's pre-notes", icon:'📋'} };
    const lens=k=>(BOOK_LENSES[k]||PASS_KINDS[k]||{label:'A pass', icon:'•'});
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <div class="row" style="justify-content:space-between;margin-bottom:8px;gap:6px;flex-wrap:wrap">
        <button class="btn ghost" onclick="backToHallList()">← The Hall</button>
        <button class="btn ghost" onclick="openLab()">🔬 The Lab</button>
      </div>
      <h2>🔬 ${esc(rec.title)}</h2>
      <div class="meta">${d?esc((d.tradition||'Personal'))+' · ':''}a dissection you can come back to. Every pass below is
        kept in your save — close the app, open it next week, it is still here. ${visBadge('private')}</div>

      <div class="card" style="cursor:default;margin-top:12px;border-color:#8fb4d9">
        <div class="t">What are you actually after?</div>
        <div class="s" style="margin-top:5px">Write it before you run anything. Same discipline as the Bench
          upstairs, and for the same reason: a dissection with no question is four paragraphs about a book,
          which is exactly what used to evaporate when the panel closed. Every lens below answers with this
          in view.</div>
        <textarea id="bdQuestion" rows="2" style="margin-top:8px"
          placeholder="e.g. Is this actually telling me how to pick a resistor, or only why it matters?"
          oninput="setDissectQuestion('${esc(rec.id)}',this.value)">${esc(rec.question||'')}</textarea>
      </div>

      <h3 style="margin-top:18px">Take a pass at it</h3>
      <div class="meta">Working from: <b>${esc(g?g.human:'the book’s summary and sections')}</b>.
        ${g&&g.onPage?'':'Open the book, turn to the passage you actually mean, and press 🔬 Dissect from here — the lens then works on that page rather than on the blurb.'}</div>
      <div class="row" id="bdLensRow" style="margin-top:9px;gap:6px;flex-wrap:wrap">
        ${Object.keys(BOOK_LENSES).map(k=>`<button class="btn ghost" style="font-size:11.5px"
          onclick="runBookLens('${esc(rec.id)}','${k}')">${BOOK_LENSES[k].icon} ${esc(BOOK_LENSES[k].label)}</button>`).join('')}
      </div>
      <div class="row" style="margin-top:8px;gap:6px;flex-wrap:wrap">
        <button class="btn ghost" style="font-size:11.5px" onclick="findPassagesFor('${esc(rec.id)}')"
          title="Search every page for the passages that answer your question, and work from those">🔎 Find the passages</button>
        <button class="btn ghost" style="font-size:11.5px" onclick="stewardPreNotes('${esc(rec.id)}')"
          title="Before you read it: what it is, how it's built, what to watch for, what to ask">📋 Steward's pre-notes</button>
        <button class="btn ghost" style="font-size:11.5px" onclick="pullNotesIntoDissection('${esc(rec.id)}')"
          title="Your own typed notes on this book — no AI needed">🗒 Pull in my notes</button>
        ${rec.book?`<button class="btn ghost" style="font-size:11.5px" onclick="readDissectedBook('${esc(rec.id)}')">📖 Open the book</button>`:''}
      </div>
      ${(g&&g.found&&g.found.length)?`<div class="card" style="cursor:default;margin-top:9px;border-color:#7fb069">
        <div class="s" style="color:#7fb069">🔎 Found ${g.found.length} passage${g.found.length===1?'':'s'} — the lenses work on these now</div>
        ${g.found.map(f=>`<div class="s" style="margin-top:6px">
          <b>page ${f.page+1}</b> · <span style="cursor:pointer;text-decoration:underline"
            onclick="closeUI();openReader('${esc(rec.book)}');setTimeout(()=>openFullText('${esc(rec.book)}',${f.page}),260)">go and read it</span>
          <div style="opacity:.85;margin-top:2px">${esc(f.snippet)}</div></div>`).join('')}
        <div class="s" style="margin-top:7px;opacity:.75">This matched WORDS, not meaning — a page that makes the same
          point in different words will not be here. Worth a look before you trust the answer.</div>
      </div>`:''}
      <div class="meta" id="bdStatus" style="margin-top:8px;color:#e0a43c"></div>

      <h3 style="margin-top:20px">The passes${rec.passes.length?` <span class="badge lic">${rec.passes.length}</span>`:''}</h3>
      ${rec.passes.length ? rec.passes.map((x,i)=>`
        <div class="card" style="cursor:default">
          <div class="s" style="color:#8fb4d9">${lens(x.lens).icon} <b>${esc(lens(x.lens).label)}</b> · ${esc(x.ts)}</div>
          <div class="s" style="opacity:.75;font-size:11px;margin-top:2px">from ${esc(x.where||'—')}</div>
          <div style="margin-top:7px;white-space:pre-wrap">${esc(x.text)}</div>
          <div class="row" style="margin-top:7px"><button class="btn ghost" style="font-size:11px;padding:2px 8px"
            onclick="deleteDissectPass('${esc(rec.id)}',${i})">✕ Remove this pass</button></div>
        </div>`).join('')
        : `<p class="meta">Nothing yet. Take a pass above — or press 🗒 Pull in my notes, which needs no AI at
           all and brings in what you have already written beside the text.</p>`}

      ${rec.passes.length?`<div class="row" style="margin-top:16px;gap:6px;flex-wrap:wrap">
        <button class="btn ghost" onclick="investigationFromBook('${esc(rec.id)}')">→ Open an investigation from this</button>
      </div>`:''}`;
    return;
  }
  if(v.mode==='compose'){
    const pf=v.prefill||{};
    const opt=(val,label,sel)=>`<option value="${val}"${sel?' selected':''}>${label}</option>`;
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>Open an investigation</h2>
      ${pf.evidence?`<div class="meta" style="color:#8fb4d9">Carried in from your paper dissection — it's sitting in the evidence field below. Add the question you're actually testing, your verdict, and what would change your mind.</div>`:''}
      <div class="meta">A finding here isn’t an opinion held firmly — it’s a claim you’ve backed with a
        source and stayed willing to lose. The three fields marked <b>*</b> are required on purpose: the
        question, the evidence behind it, and what would change your mind. That’s the discipline of this
        room, not a formality. (The Investigator can help you shape any of it — just ask him.)</div>
      <label>The question <b>*</b> — phrased so it could genuinely come out either way</label>
      <input type="text" id="invQuestion" placeholder="e.g. Does cold-water immersion actually speed muscle recovery?">
      <label>Track</label>
      <select id="invTrack">${opt('Modern science','Modern science',true)}${opt('Contemplative','Contemplative / spiritual')}${opt('Everyday claim','Everyday claim')}${opt('Other','Other')}</select>
      <label>Where it comes from (optional)</label>
      <input type="text" id="invOrigin" placeholder="a headline, a book, a scripture, something you were told, your own life">
      <label>Evidence &amp; sources <b>*</b> — cite papers, books, or real observations, not just conviction</label>
      <textarea id="invEvidence" rows="4" placeholder="What actually backs this? Name the study, the author, the shelved book, the observation. A source someone else could check — not 'everyone knows' or 'I'm sure of it.'">${esc(pf.evidence||'')}</textarea>
      <label>Your verdict — reach for the humblest one the evidence supports</label>
      <select id="invVerdict">${opt('','— not settled yet —',true)}${Object.keys(VERDICTS).map(k=>opt(k,VERDICTS[k].label)).join('')}</select>
      <label>The verdict in a sentence (optional)</label>
      <input type="text" id="invVerdictText" placeholder="what you actually conclude, and how strongly">
      <label>What would change your mind <b>*</b> — a claim you'd never give up isn't being tested</label>
      <input type="text" id="invFalsifier" placeholder="e.g. a large well-controlled trial finding no recovery benefit">
      <div class="meta" id="invFormWarn" style="color:#e0a43c;margin-top:10px"></div>
      <div class="row" style="margin-top:12px">
        <button class="btn" onclick="createInvestigation()">Open it</button>
        <button class="btn ghost" onclick="backToHallList()">← Cancel</button>
      </div>`;
    return;
  }
  if(v.mode==='experiment'){
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>Start a self-experiment</h2>
      <div class="meta">The least-fakeable evidence there is: your own. Pick something to actually try, and
        one honest thing to measure day by day. Then log it for a real stretch and read it back with the
        Investigator — who'll tell you plainly how a study of one can fool you. It only counts a day when
        you're here to log it; nothing runs in the background.</div>
      <label>The practice — what will you actually do?</label>
      <input type="text" id="expPractice" placeholder="e.g. A 10-minute sit every morning before my phone">
      <label>The measure — one honest thing to rate 1–5 afterward</label>
      <input type="text" id="expMeasure" placeholder="e.g. How settled I feel by mid-morning (1 = frazzled, 5 = clear)">
      <div class="meta" id="expWarn" style="color:#e0a43c;margin-top:10px"></div>
      <div class="row" style="margin-top:12px">
        <button class="btn" onclick="createExperiment()">Begin</button>
        <button class="btn ghost" onclick="backToHallList()">← Cancel</button>
      </div>`;
    return;
  }
  if(v.mode==='build'){
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>🔧 Start a build</h2>
      <div class="meta">A build is a thing you are making — a circuit, a print, a repair, a recipe.
        The Bench doesn't care what it is; it cares that every step gets a <b>prediction before you try
        it</b> and a <b>result after</b>. That's all it does, and it's the difference between a project
        you finished and a project you learned something from.</div>
      <label>What are you making?</label>
      <input type="text" id="bldName" placeholder="e.g. A universal remote for the TV">
      <label>What would count as done? (optional, but worth a sentence)</label>
      <input type="text" id="bldGoal" placeholder="e.g. It changes the channel from across the room, on a battery, in a printed case">
      <div class="meta" id="bldWarn" style="color:#e0a43c;margin-top:10px"></div>
      <div class="row" style="margin-top:12px">
        <button class="btn" onclick="createBuild()">Open the bench</button>
        <button class="btn ghost" onclick="backToHallList()">← Cancel</button>
      </div>`;
    return;
  }
  if(v.mode==='predict'){
    const b=buildRec(v.buildId);
    if(!b){ state.hallView={mode:'list'}; renderScienceHall(); return; }
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>Predict, then go and find out</h2>
      <div class="s" style="margin-top:2px;opacity:.85">${esc(b.name)}</div>
      <div class="meta" style="margin-top:8px">Write this <b>before</b> you go to the bench, not after. Once
        you save it you cannot edit the guess — that's deliberate, and it's the only rule this room has.
        Being wrong here in writing is worth more than being right from memory, so guess honestly rather
        than safely.</div>
      <label>What are you about to try? <b>*</b></label>
      <input type="text" id="preStage" placeholder="e.g. Drive the IR LED straight off the Arduino pin, no transistor">
      <label>What do you expect to happen? <b>*</b> — be specific enough to be wrong</label>
      <textarea id="prePredict" rows="3" placeholder="e.g. It'll work but with short range — maybe a metre. A number is better than a feeling: guess the number."></textarea>
      <label>Why do you think that? (optional — this is the field you'll learn most from re-reading)</label>
      <textarea id="preWhy" rows="2" placeholder="e.g. The pin can only give about 20mA and the datasheet rates the LED at 100mA, so roughly a fifth of the light."></textarea>
      <div class="meta" id="preWarn" style="color:#e0a43c;margin-top:10px"></div>
      <div class="row" style="margin-top:12px">
        <button class="btn" onclick="createPrediction()">Save the prediction</button>
        <button class="btn ghost" onclick="backToHallList()">← Cancel</button>
      </div>`;
    return;
  }
  const aiOn=isAIActive();
  const card=(v,mine)=>{
    const m=VERDICTS[v.verdictKind]||{label:'not settled yet',color:'#b7ad98',bg:'rgba(183,173,152,.14)'};
    return `<div class="card" style="cursor:default">
      <div class="s">${esc(v.track)}${mine?' · your own':''}</div>
      <div class="t">${esc(v.question)}</div>
      <div style="margin:6px 0"><span class="badge" style="background:${m.bg};color:${m.color};border-color:${m.color}">${esc(m.label)}</span></div>
      ${v.origin?`<div class="s" style="margin-top:4px"><b>Where it comes from:</b> ${esc(v.origin)}</div>`:''}
      <div class="s" style="margin-top:6px"><b>Evidence${mine?' &amp; sources':' says'}:</b> ${esc(v.evidence)}</div>
      ${v.verdict?`<div class="s" style="margin-top:6px"><b>The verdict, honestly:</b> ${esc(v.verdict)}</div>`:''}
      <div class="s" style="margin-top:6px"><b>What would change it:</b> ${esc(v.falsifier)}</div>
      <div class="s" style="margin-top:6px;opacity:.8"><i>${esc(v.grounding)}</i></div>
      ${mine?`<div class="row" style="margin-top:8px"><button class="btn ghost" style="font-size:11px;padding:3px 10px;border-color:#b56f6f;color:#e0a0a0" onclick="deleteInvestigation('${v.id}')">Delete</button></div>`:''}
    </div>`;
  };
  const mine=(data.hall.investigations||[]);
  panel.innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>🔬 The Science &amp; Research Hall ${visBadge('private')}<button class="btn ghost" style="font-size:11px;padding:2px 8px;margin-left:6px" onclick="openCommonsTable()" title="Share one at the Commons Table, in the Cafe">🤝 share one</button></h2>
    <div class="meta">A place that <b>tests things</b>, honestly. The Library holds what’s known; the
      Hall asks what’s true — turning a claim into a question that could come out either way, then
      reporting what the evidence actually says. Mostly that’s ordinary science; when you want it to, it
      can also weigh what meditation or the scriptures put forward — the same honest way, never with a
      thumb on the scale. Every finding lands in one of four verdicts, including the honest
      <i>“beyond what science can currently say.”</i></div>
    <div class="card" style="cursor:default;margin-top:12px;border-color:#8fb4d9">
      <div class="t">How this Hall works — the method</div>
      <div class="s" style="margin-top:6px">1. <b>No one here is the gatekeeper of truth</b> — not the Investigator, not the founder, not you. Every claim is open to challenge, including the ones already on the shelves. This is a marketplace of ideas, kept in that spirit on purpose.</div>
      <div class="s" style="margin-top:5px">2. <b>But a seat at the table has a price: evidence.</b> Back a claim with a paper, a source, a real observation. Being certain isn’t being right, and the loudest voice isn’t the truest — a source someone else can check beats any amount of conviction.</div>
      <div class="s" style="margin-top:5px">3. <b>Name what would change your mind.</b> Reach for the humblest verdict the evidence supports, and hold it provisionally — a claim you’d never give up isn’t being tested, it’s being defended.</div>
      <div class="s" style="margin-top:5px">4. <b>Argue the claim, never the person.</b> Put the strongest version of the other side before you weigh it. Where a question is genuinely open, say it’s contested and lay out the sides fairly.</div>
      <div class="s" style="margin-top:5px">5. <b>“Beyond what science can say” is an honest answer, not a defeat.</b> Some questions are for the Mountain Monk in the Keep, not the microscope — and the Hall says so plainly rather than faking a measurement.</div>
    </div>
    ${aiOn
      ? `<div class="row" style="margin-top:12px"><button class="btn" onclick="talkToInvestigator()">🔬 Talk to the Investigator</button><button class="btn ghost" onclick="newInvestigationForm()">+ Open an investigation</button></div>`
      : `<div class="meta" style="margin-top:12px">No local AI connected right now (⚙ Manage AI connections) — you can read and open investigations anytime, but talking to the Investigator needs a live connection.</div>
         <div class="row" style="margin-top:8px"><button class="btn ghost" onclick="newInvestigationForm()">+ Open an investigation</button></div>`}
    ${aiOn ? `
      <h3 style="margin-top:22px">📄 Dissect a paper</h3>
      <div class="meta">Bring a paper you disagree with — paste its abstract, a section, or just its
        central claim (and, if you like, why it doesn't sit right with you). The Investigator gives it a
        real critical appraisal: he steelmans it first, then probes the method, the leaps, and what's
        genuinely supported — and names what would change the verdict. He argues the claim, never the
        authors. You can turn any appraisal into a kept investigation.</div>
      ${state.hallView.lastDissect ? `
        <div class="card" style="cursor:default;border-color:#8fb4d9;margin-top:8px">
          <div class="t">The appraisal</div>
          <div class="s" style="margin-top:6px;white-space:pre-wrap">${esc(state.hallView.lastDissect)}</div>
          <div class="row" style="margin-top:8px">
            <button class="btn ghost" onclick="keepDissection()">💾 Keep this analysis</button>
            <button class="btn ghost" onclick="investigationFromDissect()">→ Open an investigation from this</button>
            <button class="btn ghost" onclick="clearDissect()">Clear</button>
          </div>
        </div>` : ''}
      <textarea id="hallDissectInput" rows="5" placeholder="Paste the abstract, a section, or the core claim — and why you disagree, if you want…"></textarea>
      <div class="row" style="margin-top:8px;align-items:center">
        <button class="btn ghost" onclick="dissectPaper()">Dissect it</button>
        <span class="meta" id="hallDissectStatus" style="margin:0"></span>
      </div>
      ${(data.hall.dissections||[]).length ? `<h4 style="margin-top:16px;color:#8fb4d9">Kept analyses</h4>
        <div style="margin-top:6px">${data.hall.dissections.map(d=>`
          <div class="card" style="cursor:pointer" onclick="reviewDissection('${d.id}')">
            <div class="t">📄 ${esc(d.title)} <span class="badge lic">${esc(d.ts)}</span></div>
            <div class="s" style="margin-top:4px">${esc(d.text.slice(0,120))}…</div>
            <div class="row" style="margin-top:6px"><button class="btn ghost" style="font-size:11px;padding:2px 8px" onclick="event.stopPropagation();deleteDissection('${d.id}')">✕ Remove</button></div>
          </div>`).join('')}</div>` : ''}` : ''}
    ${mine.length ? `<h3 style="margin-top:22px">Your investigations</h3>
      <div style="margin-top:8px">${mine.map(v=>card(v,true)).join('')}</div>` : ''}
    <h3 style="margin-top:22px">🧪 Self-experiments</h3>
    <div class="meta">Test something on yourself — the least-fakeable evidence there is, because it's your
      own logged data. Pick a practice and a daily measure, log it honestly over real days, then read it
      back with the Investigator, who names how a study of one can fool you. Nothing runs when you're not
      here.</div>
    <div style="margin-top:8px">${(data.hall.experiments||[]).map(e=>{
      const k=todayKey(), todayLogged=e.log.find(d=>d.date===k);
      const days=e.log.length, avg=days?(e.log.reduce((s,d)=>s+d.value,0)/days):0;
      const valOpts=[1,2,3,4,5].map(n=>`<option value="${n}"${todayLogged&&todayLogged.value===n?' selected':''}>${n}</option>`).join('');
      return `<div class="card" style="cursor:default">
        <div class="t">${esc(e.practice)}</div>
        <div class="s" style="margin-top:3px">Measuring: ${esc(e.measure)}</div>
        <div class="s" style="margin-top:3px">${days} day${days===1?'':'s'} logged${days?` · average ${avg.toFixed(1)}/5`:''} · started ${esc(e.created)}</div>
        <div class="row" style="margin-top:8px;align-items:center;flex-wrap:wrap">
          <span class="s" style="margin:0">${todayLogged?'Update today:':'Log today:'}</span>
          <select id="expVal-${e.id}" style="width:auto">${valOpts}</select>
          <input type="text" id="expNote-${e.id}" placeholder="a word on today (optional)" value="${esc(todayLogged&&todayLogged.note||'')}" style="flex:1;min-width:140px">
          <button class="btn ghost" style="font-size:11.5px" onclick="logExperimentToday('${e.id}')">${todayLogged?'Update':'Log'}</button>
        </div>
        ${days?`<div style="margin-top:8px">${e.log.map(d=>`<div class="s">${esc(d.date)}: <b>${d.value}/5</b>${d.note?' — '+esc(d.note):''}</div>`).join('')}</div>`:''}
        <div class="row" style="margin-top:8px">
          ${aiOn?`<button class="btn ghost" style="font-size:11.5px" onclick="readExperimentWithInvestigator('${e.id}')">🔬 Read my data with the Investigator</button>`:''}
          <button class="btn ghost" style="font-size:11px;padding:3px 10px;border-color:#b56f6f;color:#e0a0a0" onclick="deleteExperiment('${e.id}')">End &amp; delete</button>
        </div>
      </div>`;
    }).join('')}</div>
    <div class="row" style="margin-top:8px"><button class="btn ghost" onclick="newExperimentForm()">+ Start a self-experiment</button></div>
    <h3 style="margin-top:22px">🔧 The Bench</h3>
    <div class="meta">For things you are <b>making</b> rather than claims you are weighing — a circuit, a
      print, a repair. Every step here is written in two halves: what you expect, saved <i>before</i> you
      try it, and what actually happened, after. You can't go back and improve the guess, which is the
      point. The gap between those two halves is the only thing anyone ever learns from.</div>
    <div style="margin-top:8px">${(data.hall.builds||[]).map(b=>{
      const es=b.entries||[], done=es.filter(e=>e.closed), open=es.filter(e=>!e.closed);
      const surprises=done.filter(e=>e.outcome&&e.outcome!=='as-predicted').length;
      return `<div class="card" style="cursor:default">
        <div class="t">🔧 ${esc(b.name)}</div>
        ${b.goal?`<div class="s" style="margin-top:3px"><b>Done when:</b> ${esc(b.goal)}</div>`:''}
        <div class="s" style="margin-top:3px">${done.length} step${done.length===1?'':'s'} finished${open.length?` · ${open.length} predicted, not yet run`:''}${done.length?` · ${surprises} went differently than expected`:''} · started ${esc(b.created)}</div>
        ${open.length?`<div style="margin-top:10px">${open.map(e=>`
          <div class="card" style="cursor:default;border-color:#e0a43c;background:rgba(224,164,60,.06)">
            <div class="s" style="opacity:.85">Predicted ${esc(e.opened)} · not yet run</div>
            <div class="t" style="font-size:13px">${esc(e.stage)}</div>
            <div class="s" style="margin-top:5px"><b>You expected:</b> ${esc(e.predicted)}</div>
            ${e.why?`<div class="s" style="margin-top:3px"><b>Because:</b> ${esc(e.why)}</div>`:''}
            <div class="s" style="margin-top:9px;color:#e0a43c">Now go and try it. Then come back and say what happened:</div>
            <label style="font-size:11.5px">What you actually did</label>
            <input type="text" id="bDid-${e.id}" placeholder="what you built or changed, in a line">
            <label style="font-size:11.5px">What you measured — a number if you have one</label>
            <input type="text" id="bMeas-${e.id}" placeholder="e.g. worked to 1.4 m, then dropped out entirely">
            <label style="font-size:11.5px">Against your prediction, how did it go?</label>
            <select id="bOut-${e.id}"><option value="">— pick one —</option>${Object.keys(OUTCOMES).map(k=>`<option value="${k}">${OUTCOMES[k].label}</option>`).join('')}</select>
            <label style="font-size:11.5px">What you'd change next (optional)</label>
            <input type="text" id="bNext-${e.id}" placeholder="the next thing to try, while it's fresh">
            <div class="meta" id="bWarn-${e.id}" style="color:#e0a43c;margin-top:8px"></div>
            <div class="row" style="margin-top:8px">
              <button class="btn ghost" style="font-size:11.5px" onclick="closeBenchEntry('${b.id}','${e.id}')">Record what happened</button>
            </div>
          </div>`).join('')}</div>`:''}
        ${done.length?`<div style="margin-top:10px">${done.map(e=>{
          const o=OUTCOMES[e.outcome]||{label:e.outcome||'—',color:'#b7ad98',bg:'rgba(183,173,152,.14)'};
          return `<div class="card" style="cursor:default">
            <div class="s" style="opacity:.85">${esc(e.opened)}${e.closed&&e.closed!==e.opened?' → '+esc(e.closed):''}</div>
            <div class="t" style="font-size:13px">${esc(e.stage)}</div>
            <div style="margin:5px 0"><span class="badge" style="background:${o.bg};color:${o.color};border-color:${o.color}">${esc(o.label)}</span></div>
            <div class="s" style="margin-top:4px"><b>Expected:</b> ${esc(e.predicted)}</div>
            ${e.why?`<div class="s" style="margin-top:3px;opacity:.85"><b>Reasoning:</b> ${esc(e.why)}</div>`:''}
            ${e.did?`<div class="s" style="margin-top:3px"><b>Did:</b> ${esc(e.did)}</div>`:''}
            ${e.measured?`<div class="s" style="margin-top:3px"><b>Measured:</b> ${esc(e.measured)}</div>`:''}
            ${e.next?`<div class="s" style="margin-top:3px"><b>Next time:</b> ${esc(e.next)}</div>`:''}
            <div class="row" style="margin-top:6px"><button class="btn ghost" style="font-size:11px;padding:2px 8px" onclick="reopenBenchEntry('${b.id}','${e.id}')">Amend the result</button></div>
          </div>`;
        }).join('')}</div>`:''}
        <div class="row" style="margin-top:10px;flex-wrap:wrap">
          <button class="btn ghost" style="font-size:11.5px" onclick="predictForm('${b.id}')">+ Predict the next step</button>
          ${aiOn&&done.length?`<button class="btn ghost" style="font-size:11.5px" onclick="readBuildWithInvestigator('${b.id}')">🔬 Read the log with the Investigator</button>`:''}
          <button class="btn ghost" style="font-size:11px;padding:3px 10px;border-color:#b56f6f;color:#e0a0a0" onclick="deleteBuild('${b.id}')">Close &amp; delete</button>
        </div>
      </div>`;
    }).join('')}</div>
    <div class="row" style="margin-top:8px"><button class="btn ghost" onclick="newBuildForm()">+ Start a build</button></div>
    <h3 style="margin-top:22px">Worked examples</h3>
    <div class="meta">Four to start — both everyday science and the contemplative questions, one of each
      kind of verdict, so the honesty bar is visible before you open your own.</div>
    <div style="margin-top:10px">${INVESTIGATIONS.map(v=>card(v,false)).join('')}</div>
    <div class="row" style="margin-top:18px"><button class="btn ghost" onclick="openResearchDesk()">← Back to the Research Desk</button></div>`;
}

/* ================================================================
   The Eightfold reflection ladder — EIGHTFOLD-PATH-TEMPLE-PLAN.md, the
   interactive layer the Temple always flagged as open. The eight fold-
   signs in the Keep (scenes.js buildKeep, each now carrying a `fold` id)
   no longer just show their text — walking up to one opens a per-fold
   panel where you keep an honest, ongoing reflection: "where I am with
   this now" + "one way I could push it further." Kept, dated, added to
   over time, and DELIBERATELY never scored and never marked done — a
   ladder with no top rung. That anti-completion shape is the whole point
   the user asked for ("this is not enough, I can keep improving this
   aspect") and the reason it isn't a checklist. The Monk, the Path's
   living teacher next door in the Keep, can be asked about the specific
   fold — grounded via state.dialog.foldContext, the same mechanism
   Sebastian's folder-review already uses.
   ================================================================ */
export function openFoldReflection(sign){
  state.ui='fold'; hideAllOv();
  state.foldView={ sign };
  renderFoldReflection(); showOv('foldOv');
}
function foldEntries(id){ return data.temple.folds[id]||[]; }
export function addFoldReflection(id){
  const where=((document.getElementById('foldWhere')||{}).value||'').trim();
  const next=((document.getElementById('foldNext')||{}).value||'').trim();
  if(!where && !next) return; // nothing to keep
  if(!data.temple.folds[id]) data.temple.folds[id]=[];
  data.temple.folds[id].unshift({ where, next, ts:todayKey() });
  const nm=(state.foldView&&state.foldView.sign&&state.foldView.sign.name)||id;
  persist(); logActivity('Reflected on the Eightfold Path — '+nm+'.'); blip(587,.08); setTimeout(()=>blip(784,.1),90);
  renderFoldReflection();
}
export function deleteFoldReflection(id,idx){
  if(data.temple.folds[id]) data.temple.folds[id].splice(idx,1);
  persist(); renderFoldReflection();
}
// Ask the Monk about THIS fold — reuses the resident chat stack (like
// talkToInvestigator) but tags the dialog with foldContext, which the Monk's
// systemPrompt reads to meet the visitor where they are with this one fold.
/* Bring a note you wrote to the Monk and talk it over — the same mechanism as
   the fold above (state.dialog.*Context read by his systemPrompt), pointed at
   your own words instead of a stone in the Keep. Works on any note from any
   source; the Monk is told plainly that these are the visitor's OWN words and
   not a shelved text, because how he should hold the two is different. */
export function talkToMonkAboutNote(key){
  const n=gatherNotes().find(x=>x.key===key); if(!n) return;
  markNoteSeen(key);          // it has now genuinely been reopened, not merely listed
  /* CLOSE YOUR NOTES FIRST. openChatDialog does not hide overlays — the fold
     panel it was copied from is reached from a place that already closed one.
     Without this the Monk opens BEHIND the notes panel: connected, greeting
     you, and completely unreachable. Found in a screenshot, not a test; the
     test then had to be fixed too, because it was reading document.body and
     happily matching the title screen. */
  closeUI();
  openChatDialog({
    name:'the Mountain Monk', aiAgent:'monk', color:'#2a2118', glow:'#c9a86a',
    lines:['You have brought something you wrote yourself. Sit. What is it you are actually turning over in it?'],
  });
  if(state.dialog) state.dialog.noteContext={ title:n.title||'', where:n.where||'', text:String(n.text||'').slice(0,2200) };
  logActivity('Took a note to the Mountain Monk.');
}
export function talkToMonkAboutFold(){
  const sign=state.foldView&&state.foldView.sign; if(!sign) return;
  const plain=String(sign.name).replace(/^\d+ · /,'');
  openChatDialog({
    name:'the Mountain Monk', aiAgent:'monk', color:'#2a2118', glow:'#c9a86a',
    lines:['You come from the '+plain+' station. Sit a moment. What are you actually finding as you try to walk this one?'],
  });
  if(state.dialog) state.dialog.foldContext={ name:sign.name, meaning:sign.text };
}
function renderFoldReflection(){
  const sign=state.foldView&&state.foldView.sign;
  if(!sign){ closeUI(); return; }
  const id=sign.fold, entries=foldEntries(id), aiOn=isAIActive();
  document.getElementById('foldPanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>☸ ${esc(sign.name)}</h2>
    <div class="meta" style="white-space:pre-wrap">${esc(sign.text)}</div>
    <div class="card" style="cursor:default;margin-top:12px;border-color:#c9a86a">
      <div class="t">Keep climbing</div>
      <div class="s" style="margin-top:6px">This fold is never finished — it's an aspect you can always take
        further. There's no score here and nothing to complete; that's on purpose. Just tell the truth about
        where you are with it, and name one real, small way to push it. Come back and do it again whenever
        you like — the point is the climb, not a summit.</div>
    </div>
    <label>Where I am with this now</label>
    <textarea id="foldWhere" rows="3" placeholder="Honestly — how is this fold actually going for you right now?"></textarea>
    <label>One way I could push it further</label>
    <input type="text" id="foldNext" placeholder="one concrete, small step — not a whole new life">
    <div class="row" style="margin-top:10px">
      <button class="btn" onclick="addFoldReflection('${id}')">Keep this reflection</button>
      ${aiOn?`<button class="btn ghost" onclick="talkToMonkAboutFold()">🧘 Ask the Monk about this fold</button>`:''}
    </div>
    ${entries.length ? `<h3 style="margin-top:20px">Your climb so far</h3>
      <div style="margin-top:8px">${entries.map((e,i)=>`
        <div class="card" style="cursor:default">
          <div class="s">${esc(e.ts)}</div>
          ${e.where?`<div style="margin-top:4px">${esc(e.where)}</div>`:''}
          ${e.next?`<div class="s" style="margin-top:5px"><b>Next step named:</b> ${esc(e.next)}</div>`:''}
          <div class="row" style="margin-top:6px"><button class="btn ghost" style="font-size:11px;padding:3px 10px;border-color:#b56f6f;color:#e0a0a0" onclick="deleteFoldReflection('${id}',${i})">Delete</button></div>
        </div>`).join('')}</div>`
      : '<div class="meta" style="margin-top:16px">No reflections kept yet — the first one is just an honest sentence about where you actually are.</div>'}`;
}

/* ----- The Learning Tree moved to ui/lesson-tree.js on 2026-08-04
   (OVERLAYS-SPLIT-PLAN.md cut #1). What it needs from this file is handed to
   initLessonTree() further down. ----- */
import { initLessonTree, CURRICULUM, myLessons, allNodes, curriculumNode, lessonProgress, lessonDone, lessonAvailable, lessonCompletedCount, currentStudy, nextStepOf, openLearningTree, renderLearningTree, openLesson, openAcademy, lessonFromPlanNote, openLessonFromNote, newLessonForm, studyLessonWithTutor, saveLessonToNotes, lessonAsText, draftLessonPlanFromLesson, backToTree, deleteMyLesson, draftLessonWithAI, exportLesson, openLessonReading, pickUpLesson, putDownLesson, saveMyLesson, stopDrafting, toggleLessonStep, treeTab, writeLessonOnThisBook } from './lesson-tree.js';

/* ----- The Request Board — a wishlist of books you'd like added,
   feeding the Caravan connector's "what to fetch next" queue. Nothing
   here fetches itself; a request just sits until a human decides to
   actually run tools/caravan/gutenberg.py and review what comes back —
   same discipline as everything else about the shared Library. */
export function openRequests(){ state.ui='requests'; hideAllOv(); renderRequests(); showOv('requestsOv'); }
function renderRequests(){
  const reqs=data.bookRequests;
  document.getElementById('requestsPanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>The Request Board</h2>
    <div class="meta">Books you'd like to see on a shelf someday. Nothing here fetches itself —
      it's the queue for the Caravan (<code>tools/caravan/gutenberg.py</code>) to work through by
      hand, one reviewed text at a time.</div>
    <div id="reqList">${reqs.length ? reqs.map(r=>`
      <div class="card" style="cursor:default">
        <div class="t">${esc(r.title)}</div>
        <div class="s">${esc(r.note||'')}</div>
        <div class="row" style="margin-top:8px"><button class="btn ghost" onclick="removeRequest(${r.id})">Remove</button></div>
      </div>`).join('') : '<p>No requests yet.</p>'}</div>
    <h3>Request a book</h3>
    <label>Title</label><input type="text" id="reqTitle" placeholder="e.g. The Bhagavad Gita">
    <label>Note (optional)</label><input type="text" id="reqNote" placeholder="Which shelf it might fit, or why">
    <div class="row" style="margin-top:14px"><button class="btn" onclick="addRequest()">Add request</button></div>`;
}
export function addRequest(){
  const title=document.getElementById('reqTitle').value.trim();
  const note=document.getElementById('reqNote').value.trim();
  if(!title) return;
  data.bookRequests.unshift({id:Date.now(),title,note,added:todayKey()});
  persist(); logActivity('Requested a book: "'+title+'".'); renderRequests(); blip(700,.06);
}
export function removeRequest(id){
  data.bookRequests=data.bookRequests.filter(r=>r.id!==id);
  persist(); renderRequests();
}

/* ----- The two café wall boards. The hosted-backend implementation behind them was
   DELETED 2026-08-02 rather than left dormant, and the reasoning is worth
   keeping: while it sat there, every tester ran the fallback path, which meant
   the fallback was load-bearing while still being written and tested as a
   fallback. Nobody could ever reach the real path. "Dormant" was a fiction.

   The rooms stay, as honest placeholders — the same pattern the Workshop's
   Unfinished Floor uses — because a shared Commons is still genuinely planned,
   just self-hosted rather than on someone else's service
   (see plans/COMMONS-BACKEND-PLAN.md). What is gone is a specific dependency,
   not the intention.

   The Commons Table, in this same room, is the sharing that needs no server at
   all, and it works today. */
function comingCommons(title, what){
  openDialog(title, [
    what + "\n\nThis needs a shared Commons — somewhere posts from\ndifferent Pavilions can meet. That does not exist yet,\nand nothing here is broken or misconfigured.",
    "Sharing that needs no server already works: the Commons\nTable, in this room. A piece of work gets there because a\nperson wrote a file and handed it over — which is the\nkind of sharing this place trusts most anyway.",
  ]);
}
export function openNoticeBoard(){
  comingCommons('THE NOTICE BOARD',
    "A place to post a question outward, where the real\nconversation may live somewhere else entirely.");
}
export function openResidentsBoard(){
  comingCommons("THE RESIDENTS' BOARD",
    "Notes the residents of different Pavilions leave for each\nother — overheard, more than addressed to you.");
}

/* ----- Hearth Corner (the café) — deliberately just scripted dialog,
   same as any sign or NPC. A low-stakes flavor station, not a new
   subsystem; see the README's café section for why. */
export function openHearth(){
  openDialog('THE HEARTH CORNER', [
    "The fire's always going here. No agenda — just a chair, and whoever else wandered in.",
    "What are you working on lately? (No need to answer out loud. Some questions are just good to sit with.)",
  ]);
}

/* ----- The Counter — deliberately just a small scripted flavor beat, same
   as the Hearth Corner: the café should feel like somewhere you could sit,
   not just a row of work stations. No mechanic here on purpose. */
const COFFEE_ORDERS = [
  ["Something warm, coming up.", "Here — mind the first sip, it's still finding its temperature."],
  ["We only really make the one thing well here.", "Black, unless you ask otherwise. Nobody's ever asked otherwise."],
  ["On the house, like always.", "Nothing here is owed, only offered. Sit as long as you like."],
];
export function openCoffee(){
  const lines = COFFEE_ORDERS[Math.floor(Math.random()*COFFEE_ORDERS.length)];
  openDialog('THE COUNTER', lines);
}

/* ----- The Grant Desk (the café) — a real project workspace, not
   scripted flavor: a title + mission, labeled documents you paste in
   (site history, budget notes, a funder's guidelines — whatever's
   actually true), and a grant-writing assistant grounded only in what's
   on file, never inventing facts or figures. Same three-stage shape as
   the Research Desk: draft freely here, save good replies as named
   sections, then promote the whole set into one Archive Desk document
   when it's ready to actually submit somewhere. */
function grantProject(id){ return data.grantProjects.find(p=>p.id===id); }
function grantSystemPrompt(project){
  const docs=project.documents.length
    ? project.documents.map(d=>`--- ${d.label} (${d.ts}) ---\n${d.text}`).join('\n\n')
    : '(no documents on file yet)';
  const drafts=project.drafts.length
    ? project.drafts.map(d=>`--- ${d.section} (${d.ts}) ---\n${d.text}`).join('\n\n')
    : '(nothing drafted yet)';
  return WORK_CHARTER
    +"\n\nYou are the grant-writing assistant at the Sand Pavilion's Grant Desk, helping a visitor "
    +`draft a real proposal for their project: "${project.title}"`+(project.mission?` — ${project.mission}.`:'.')
    +" Write in a clear, concrete, fundable voice, grounded only in the documents on file below — never "
    +"invent facts, statistics, budget figures, or claims that aren't actually there. If something a "
    +"funder would expect is missing, say so plainly and ask for it rather than making it up. When "
    +"asked for a specific section (statement of need, project narrative, budget justification, "
    +"executive summary, or anything else), write that section in full, ready to paste into a real "
    +"proposal — not an outline of what it should contain, the actual prose. Start directly with the "
    +"prose itself; don't repeat the section's name as your own heading, it's added separately."
    +"\n\nProject documents on file:\n"+docs
    +"\n\nSections already drafted:\n"+drafts;
}
const GRANT_PROMPTS = [
  'Draft a Statement of Need.',
  'Draft the Project Narrative.',
  'Draft a Budget Justification outline.',
  'Draft a one-paragraph Executive Summary.',
];
function guessSectionName(q){
  const s=q.replace(/^draft\s+(a|the|an)?\s*/i,'').replace(/\.+$/,'').trim();
  return (s || 'Draft').slice(0,48);
}
export function openGrantDesk(){
  state.ui='grant'; hideAllOv();
  state.grantView=state.grantView||{mode:'list'};
  renderGrant(); showOv('grantOv');
}
export function newGrantForm(){ state.grantView={mode:'compose'}; renderGrant(); }
export function backToGrantList(){ state.grantView={mode:'list'}; renderGrant(); }
export function createGrantProject(){
  const title=document.getElementById('gpTitle').value.trim();
  if(!title) return;
  const mission=document.getElementById('gpMission').value.trim();
  const due=document.getElementById('gpDue')?.value||null;
  const id='grant-'+Date.now();
  data.grantProjects.unshift({id,title,mission,due,documents:[],drafts:[],created:todayKey()});
  persist(); logActivity('Started a grant project: "'+title+'".'); blip(784,.09); setHud();
  state.grantView={mode:'project',id,history:[]};
  renderGrant();
}
export function openGrantProject(id){ state.grantView={mode:'project',id,history:[]}; renderGrant(); }
export function deleteGrantProject(id){
  data.grantProjects=data.grantProjects.filter(p=>p.id!==id);
  persist(); setHud(); state.grantView={mode:'list'}; renderGrant();
}
export function setGrantDue(id){
  const p=grantProject(id); if(!p) return;
  p.due=document.getElementById('gDueEdit').value||null;
  persist(); setHud(); renderGrant();
}
export function addGrantDocument(id){
  const label=document.getElementById('gdLabel').value.trim();
  const text=document.getElementById('gdText').value.trim();
  const p=grantProject(id); if(!p||!label||!text) return;
  p.documents.unshift({ts:todayKey(),label,text});
  persist(); document.getElementById('gdLabel').value=''; document.getElementById('gdText').value='';
  renderGrant();
}
export function removeGrantDocument(id,i){
  const p=grantProject(id); if(!p) return;
  p.documents.splice(i,1); persist(); renderGrant();
}
/* READING-TO-DOING-PLAN.md step 1 — same spark bridge as book notes and
   Research Desk notes, applied to the Grant Desk's own closest analog
   to a note: a document (real material the user actually wrote in). */
export function sendGrantDocToToday(id,i){
  const p=grantProject(id); if(!p) return;
  const doc=p.documents[i]; if(!doc) return;
  const day=plannerDay();
  const text=doc.label+': '+doc.text;
  day.sparks.unshift({ts:todayKey(), text, source:p.title, done:false});
  persist(); logActivity('Brought "'+doc.label+'" from "'+p.title+'" to today\'s plan.'); blip(784,.09);
  renderGrant();
}
export function fillGrantPrompt(text){
  const el=document.getElementById('gAskInput'); if(!el) return;
  el.value=text; el.focus();
  state.grantView.pendingSection=guessSectionName(text);
}
export async function sendGrantMessage(id){
  const input=document.getElementById('gAskInput');
  const q=input.value.trim(); if(!q) return;
  const p=grantProject(id); if(!p) return;
  const v=state.grantView;
  const sectionGuess=v.pendingSection||guessSectionName(q);
  v.history.push({role:'user',content:q}); input.value=''; renderGrant();
  try{
    const reply=await AI.chat([{role:'system',content:grantSystemPrompt(p)}, ...v.history], {long:true});
    v.history.push({role:'assistant',content:reply}); v.lastReply=reply; v.lastSection=sectionGuess;
    logActivity('Asked the Grant Desk about "'+p.title+'".'+elapsedTag());
  }catch(e){
    v.history.push({role:'assistant',content:"The connection flickered — no answer this time. Check that your AI connection is still running."});
  }
  v.pendingSection=null;
  renderGrant();
}
export function saveGrantReplyAsDraft(id){
  const v=state.grantView; if(!v.lastReply) return;
  const section=(document.getElementById('gSectionName')?.value.trim())||v.lastSection||'Draft';
  const p=grantProject(id); if(!p) return;
  // small local models don't always follow "no heading" instructions —
  // the section name is already added when this promotes to a document,
  // so strip a redundant leading markdown heading if the model added one.
  const text=v.lastReply.replace(/^#{1,6}\s*.+\n+/,'');
  p.drafts.unshift({ts:todayKey(),section,text});
  v.lastReply=''; v.lastSection=''; persist(); renderGrant();
}
export function removeGrantDraft(id,i){
  const p=grantProject(id); if(!p) return;
  p.drafts.splice(i,1); persist(); renderGrant();
}
export function promoteGrantToArchive(id){
  const p=grantProject(id); if(!p||!p.drafts.length) return;
  const body=p.drafts.slice().reverse().map(d=>`## ${d.section}\n\n${d.text}`).join('\n\n');
  let slug=slugify(p.title), n=1;
  while(data.workshop.docs.some(d=>d.slug===slug)) slug=slugify(p.title)+'-'+(++n);
  data.workshop.docs.unshift({slug,title:p.title,license:'personal record',source:'The Grant Desk',body,created:todayKey(),category:'research'});
  persist(); logActivity('Turned grant project "'+p.title+'" into an Archive Desk entry.'); blip(784,.09);
  openArchive(); openArchiveDoc(slug);
}
function renderGrant(){
  const v=state.grantView, panel=document.getElementById('grantPanel'), aiOn=isAIActive();
  if(v.mode==='compose'){
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>Start a Grant Project</h2>
      <div class="meta">A real workspace for a real proposal — add documents over as many visits as it
        takes. Nothing here is submitted anywhere; it's yours until you export or copy it out.</div>
      <label>Project title</label>
      <input type="text" id="gpTitle" placeholder="e.g. Hollow Creek Community Garden Restoration">
      <label>Mission — what is this, in a sentence or two?</label>
      <textarea id="gpMission" rows="3" placeholder="What's being restored, for whom, and why it matters"></textarea>
      <label>Application deadline (optional — entirely up to you)</label>
      <input type="date" id="gpDue">
      <div class="row" style="margin-top:14px">
        <button class="btn" onclick="createGrantProject()">Start</button>
        <button class="btn ghost" onclick="backToGrantList()">← Back</button>
      </div>`;
    return;
  }
  if(v.mode==='project'){
    const p=grantProject(v.id);
    if(!p){ state.grantView={mode:'list'}; return renderGrant(); }
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>${esc(p.title)}</h2>
      <div class="meta">${p.mission?esc(p.mission)+' · ':''}started ${esc(p.created)} · ${p.documents.length} document${p.documents.length===1?'':'s'} · ${p.drafts.length} drafted section${p.drafts.length===1?'':'s'}${p.due?' · due '+esc(p.due):''}</div>
      <div class="row"><input type="date" id="gDueEdit" value="${esc(p.due||'')}" style="max-width:200px">
        <button class="btn ghost" onclick="setGrantDue('${p.id}')">Set deadline</button></div>

      <h3>Documents</h3>
      <div class="meta">Only real material — site history, budget notes, a funder's own guidelines. The assistant below never invents what isn't here.</div>
      <label>Label</label><input type="text" id="gdLabel" placeholder="e.g. Site history, Budget notes, Funder guidelines">
      <label>Text</label><textarea id="gdText" rows="4" placeholder="Paste or write it in — as much or as little as you have."></textarea>
      <div class="row" style="margin-top:8px"><button class="btn ghost" onclick="addGrantDocument('${p.id}')">+ Add document</button></div>
      <div style="margin-top:10px">${p.documents.length ? p.documents.map((d,i)=>{
        const alreadySent=plannerDay().sparks.some(s=>s.text===(d.label+': '+d.text));
        return `<div class="card" style="cursor:default">
          <div class="t">${esc(d.label)} <span class="badge">${esc(d.ts)}</span></div>
          <div class="s">${esc(d.text.length>200?d.text.slice(0,200)+'…':d.text)}</div>
          <div class="row" style="margin-top:6px">
            <button class="btn ghost" onclick="removeGrantDocument('${p.id}',${i})">Remove</button>
            <button class="btn ghost" style="font-size:11px;padding:3px 10px" ${alreadySent?'disabled':''}
              onclick="sendGrantDocToToday('${p.id}',${i})">${alreadySent?'✓ In today\'s plan':'→ Bring to today\'s plan'}</button>
          </div>
        </div>`;
      }).join('') : '<p>No documents yet — the more real material you add, the more useful a draft will be.</p>'}</div>

      <h3 style="margin-top:18px">Drafted sections</h3>
      <div style="margin-top:6px">${p.drafts.length ? p.drafts.map((d,i)=>`
        <div class="card" style="cursor:default">
          <div class="t">${esc(d.section)} <span class="badge">${esc(d.ts)}</span></div>
          <div class="s">${esc(d.text.length>200?d.text.slice(0,200)+'…':d.text)}</div>
          <div class="row" style="margin-top:6px"><button class="btn ghost" onclick="removeGrantDraft('${p.id}',${i})">Remove</button></div>
        </div>`).join('') : '<p>Nothing drafted yet.</p>'}</div>

      <h3 style="margin-top:18px">Grant-writing assistant</h3>
      <div class="meta">${aiOn
        ? 'Grounded only in the documents above — ask for a section by name, or pick a quick start below.'
        : 'No local AI connected right now (⚙ Manage AI connections) — this desk needs a live connection to actually draft anything.'}</div>
      ${aiOn ? `
        <div class="row" style="margin-bottom:10px">
          ${GRANT_PROMPTS.map(pr=>`<button class="btn ghost" style="font-size:11.5px" onclick='fillGrantPrompt(${JSON.stringify(pr)})'>${esc(pr)}</button>`).join('')}
        </div>
        <div id="gHistory">${(v.history||[]).map(h=>`
          <div class="card" style="cursor:default"><div class="t">${h.role==='user'?'You':'Grant Desk'}</div><div class="s">${esc(h.content)}</div></div>`).join('')}</div>
        <textarea id="gAskInput" rows="3" placeholder="Ask for a section, or pick a quick start above…"></textarea>
        <div class="row" style="margin-top:10px">
          <button class="btn" onclick="sendGrantMessage('${p.id}')">Ask</button>
        </div>
        ${v.lastReply?`
        <div class="row" style="margin-top:10px;align-items:center">
          <input type="text" id="gSectionName" value="${esc(v.lastSection||'Draft')}" style="max-width:220px" placeholder="Section name">
          <button class="btn ghost" onclick="saveGrantReplyAsDraft('${p.id}')">💾 Save as a draft section</button>
        </div>` : ''}` : ''}

      <div class="row" style="margin-top:22px">
        <button class="btn ghost" onclick="backToGrantList()">← Back</button>
        <button class="btn ghost" ${p.drafts.length?'':'disabled'} onclick="promoteGrantToArchive('${p.id}')">→ Turn into an Archive Desk entry</button>
        <button class="btn ghost" style="border-color:#b56f6f;color:#e0a0a0" onclick="deleteGrantProject('${p.id}')">Delete project</button>
      </div>`;
    return;
  }
  const projects=data.grantProjects;
  panel.innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>The Grant Desk</h2>
    <div class="meta">A workspace for real proposals — a project's own documents, plus an assistant
      that drafts sections grounded only in what's actually on file.</div>
    ${projects.length ? projects.map(p=>`
      <div class="card" onclick="openGrantProject('${p.id}')">
        <div class="t">${esc(p.title)}</div>
        <div class="s">${p.mission?esc(p.mission)+' · ':''}${p.documents.length} doc${p.documents.length===1?'':'s'} · ${p.drafts.length} section${p.drafts.length===1?'':'s'} · started ${esc(p.created)}${p.due?' · due '+esc(p.due):''}</div>
      </div>`).join('') : '<p>Nothing started yet.</p>'}
    <div class="row" style="margin-top:14px"><button class="btn" onclick="newGrantForm()">+ Start a grant project</button></div>`;
}

/* ----- Upcoming — the entire "reminders" feature. Only ever reachable
   by clicking the HUD badge (or the pause menu); never opens itself,
   never alerts, never nags. Lists exactly what you chose to give a due
   date and nothing else — most visitors will never see this panel
   because they never set one. */
export function openUpcoming(){ state.ui='upcoming'; hideAllOv(); renderUpcoming(); showOv('upcomingOv'); }
function renderUpcoming(){
  const today=todayKey();
  const items=upcomingItems();
  // card onclick handlers are plain HTML strings and can't close over `i`
  // directly — stash the list on window and open by index instead.
  // openCourse()/openGrantProject() assume their overlay is already
  // showing (normally true, navigating within an open desk) — from here
  // it isn't, so open the desk itself first.
  window.__spOpenUpcomingItem=(idx)=>{
    const i=items[idx];
    if(i.kind==='course'){ openCourses(); openCourse(i.id); }
    else if(i.kind==='event'){ openCalendar(); calSelectDay(i.due); }
    else { openGrantDesk(); openGrantProject(i.id); }
  };
  document.getElementById('upcomingPanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>Upcoming</h2>
    <div class="meta">Only things you gave a date — a course or grant due date, or an event on Sebastian's
      calendar. Nothing here ever pops up on its own — this panel is the whole feature.</div>
    ${items.length ? items.map((i,idx)=>{
      const overdue=i.due<today, dueToday=i.due===today;
      const when=i.kind==='event'&&i.start?`${dueToday?'today':i.due} at ${i.start}`:(overdue?'overdue':dueToday?'due today':'due '+i.due);
      const color=overdue?'#e0a0a0':dueToday?'#ffd98a':'#9c8b74';
      return `<div class="card" onclick="__spOpenUpcomingItem(${idx})">
        <div class="t">${upcomingIcon(i.kind)} ${esc(i.title)}</div>
        <div class="s" style="color:${color}">${esc(when)}</div>
      </div>`;
    }).join('') : '<p>Nothing due — because nothing has to be. Set a due date on a course or grant project, or an event on the calendar, any time you actually want a reminder.</p>'}`;
}

/* ----- The Idea Jar — one click to jot a thought down, one click back to
   whatever you were doing. The entire feature is capture; "digesting"
   later just means coming back and reading the list, no AI processing
   forced on it. Reachable from the HUD directly (💡, always visible in
   the open world) since the whole point is zero friction — walking to a
   station or opening the pause menu first would defeat it. */
export function openIdeaCapture(){
  state.ui='idea'; hideAllOv();
  renderIdeaJar(); showOv('ideaOv');
  setTimeout(()=>document.getElementById('ideaInput')?.focus(),30);
}
/* The Log — bullet-journal-style "rapid logging" (SELF-LEARNING-JOURNAL-PLAN.md,
   Phase 1). Formerly the Idea Jar; broadened into ONE frictionless capture point
   for anything on your mind, tagged by kind (idea / to-do / note / to-learn) so
   it can be organized and connected later — capture fast, digest later, the
   research-backed core of every system that actually sticks. Old entries have no
   `kind` and read as 'idea'. */
const LOG_KINDS=[
  {id:'idea',  label:'💡 Idea',           sig:'💡'},
  {id:'todo',  label:'• To-do',           sig:'•'},
  {id:'note',  label:'— Note',            sig:'—'},
  {id:'learn', label:'✦ To learn / try',  sig:'✦'},
];
function logSig(k){ return (LOG_KINDS.find(x=>x.id===(k||'idea'))||LOG_KINDS[0]).sig; }
function renderIdeaJar(){
  const ideas=data.ideas, kind=state.logKind||'idea';
  const curLabel=(LOG_KINDS.find(x=>x.id===kind)||LOG_KINDS[0]).label;
  document.getElementById('ideaPanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>📓 The Log</h2>
    <div class="meta">Get it out before it slips — a bullet journal for whatever's on your mind: an idea,
      a to-do, a note, or something you want to learn or try. Don't tidy it now; capture fast, digest
      later. This is the one place everything lands first — when something belongs on your day, send it <b>→ Today's page</b>.</div>
    <div class="row" style="margin-top:10px;flex-wrap:wrap">
      ${LOG_KINDS.map(k=>`<button class="btn ${k.id===kind?'':'ghost'}" style="font-size:11.5px;padding:6px 12px" onclick="setLogKind('${k.id}')">${esc(k.label)}</button>`).join('')}
    </div>
    <textarea id="ideaInput" rows="3" placeholder="Capturing as ${esc(curLabel)} — what is it?" style="margin-top:8px"></textarea>
    <div class="row" style="margin-top:10px">
      <button class="btn" onclick="saveIdea()">Capture it</button>
      <button class="btn ghost" onclick="closeUI()">← Back to what I was doing</button>
    </div>
    ${ideas.length ? `<h3 style="margin-top:18px">${ideas.length} captured</h3>
      ${ideas.map(i=>`
        <div class="card" style="cursor:default">
          <div class="s">${logSig(i.kind)} · ${esc(i.ts)}</div>
          <div style="margin-top:2px">${esc(i.text)}</div>
          <div class="row" style="margin-top:6px">
            <button class="btn ghost" style="font-size:11px;padding:3px 10px" onclick="sendLogEntryToToday(${i.id})">→ Today's page</button>
            <button class="btn ghost" style="font-size:11px;padding:3px 10px" onclick="startPathFromIdea(${i.id})" title="Keep it as a path to pick up and continue — no due date">🧭 Walk this</button>
            <button class="btn ghost" style="font-size:11px;padding:3px 10px" onclick="deleteIdea(${i.id})">Remove</button>
          </div>
        </div>`).join('')}` : ''}`;
}
export function setLogKind(k){ state.logKind=k; renderIdeaJar(); setTimeout(()=>document.getElementById('ideaInput')?.focus(),20); }
export function saveIdea(){
  const input=document.getElementById('ideaInput');
  const text=input.value.trim(); if(!text) return;
  data.ideas.unshift({id:Date.now(),text,ts:todayKey(),kind:state.logKind||'idea'});
  persist(); logActivity('Captured to the Log.'); blip(700,.06);
  renderIdeaJar();
  setTimeout(()=>document.getElementById('ideaInput')?.focus(),30);
}
export function deleteIdea(id){
  data.ideas=data.ideas.filter(i=>i.id!==id);
  persist(); renderIdeaJar();
}

/* ----- Paths — the daily-use heart the user asked for: an idea or intention
   kept NOT as a dated calendar item (which only accrues guilt when missed) but
   as a card you pick up and continue — "a path not yet walked, waiting for you
   to go further." No due dates. Each path keeps a running log of the steps you
   took, so picking it up again shows exactly where you left off. Its own small
   store (data.paths); The Log can promote a captured idea straight into one. */
let pathSaveTimer=null;
function newPathId(){ return 'path-'+Date.now()+'-'+Math.random().toString(36).slice(2,6); }
export function openPaths(){ state.ui='paths'; state.pathView={mode:'list'}; hideAllOv(); renderPaths(); showOv('pathsOv'); }
export function backToPaths(){ state.pathView={mode:'list'}; renderPaths(); }
export function createPath(seed){
  const p={ id:newPathId(), title:(seed&&seed.slice(0,60))||'A new path', seed:seed||'', steps:[], created:todayKey(), updated:todayKey(), walked:false };
  data.paths.unshift(p); persist(); logActivity('Set out on a new path.'); blip(740,.08);
  state.pathView={mode:'one', id:p.id}; renderPaths();
}
export function startPathFromIdea(id){
  const idx=data.ideas.findIndex(x=>x.id===id); if(idx<0) return;
  const idea=data.ideas[idx];
  const p={ id:newPathId(), title:idea.text.slice(0,60), seed:idea.text, steps:[], created:todayKey(), updated:todayKey(), walked:false };
  data.paths.unshift(p); data.ideas.splice(idx,1); // migrate out of the Log — it becomes a path, it doesn't duplicate
  persist(); logActivity('Turned a captured idea into a path to walk.'); blip(740,.08);
  state.ui='paths'; state.pathView={mode:'one', id:p.id}; hideAllOv(); renderPaths(); showOv('pathsOv');
}
export function openPath(id){ state.pathView={mode:'one', id}; renderPaths(); }
export function addPathStep(id){
  const p=(data.paths||[]).find(x=>x.id===id); if(!p) return;
  const inp=document.getElementById('pathStepInput'); const text=(inp&&inp.value||'').trim(); if(!text) return;
  p.steps.push({ts:todayKey(), text}); p.updated=todayKey(); p.walked=false; // taking a step means you're walking it again
  persist(); logActivity('Walked a path a little further.'); blip(660,.06); renderPaths();
  setTimeout(()=>document.getElementById('pathStepInput')?.focus(),20);
}
export function updatePathField(id, field, val){
  const p=(data.paths||[]).find(x=>x.id===id); if(!p) return;
  p[field]=val; p.updated=todayKey(); clearTimeout(pathSaveTimer); pathSaveTimer=setTimeout(persist,500);
}
export function togglePathWalked(id){
  const p=(data.paths||[]).find(x=>x.id===id); if(!p) return;
  p.walked=!p.walked; p.updated=todayKey(); persist();
  if(p.walked) logActivity('A path walked: "'+p.title+'".');
  renderPaths();
}
export function deletePath(id){
  const p=(data.paths||[]).find(x=>x.id===id); if(!p) return;
  if(!window.confirm('Let go of the path “'+(p.title||'untitled')+'”? Its steps go with it.')) return;
  data.paths=data.paths.filter(x=>x.id!==id); persist(); state.pathView={mode:'list'}; renderPaths();
}
function renderPaths(){
  const el=document.getElementById('pathsPanel'); if(!el) return;
  const v=state.pathView||{mode:'list'}, paths=data.paths||[];
  if(v.mode==='one'){
    const p=paths.find(x=>x.id===v.id); if(!p){ state.pathView={mode:'list'}; return renderPaths(); }
    el.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <div class="row" style="justify-content:space-between;margin-bottom:8px">
        <button class="btn ghost" onclick="backToPaths()">← All paths</button>
        <button class="btn ghost" style="border-color:var(--danger);color:var(--danger-soft)" onclick="deletePath('${p.id}')">✕ Let it go</button>
      </div>
      <input type="text" value="${esc(p.title)}" oninput="updatePathField('${p.id}','title',this.value)" style="font-size:16px;font-weight:bold">
      ${p.seed?`<div class="meta" style="margin-top:6px">Set out from: “${esc(p.seed)}”</div>`:''}
      <h3 style="margin-top:14px">The way so far${p.steps.length?` · ${p.steps.length} step${p.steps.length>1?'s':''}`:''}</h3>
      ${p.steps.length ? p.steps.map(s=>`<div class="card" style="cursor:default"><div class="s">${esc(s.ts)}</div><div style="white-space:pre-wrap">${esc(s.text)}</div></div>`).join('')
        : '<p class="meta">No steps yet — the path is fresh. Take one below whenever you pick it up.</p>'}
      <div class="row" style="margin-top:10px;gap:6px">
        <input type="text" id="pathStepInput" placeholder="Pick it up — what did you do, or what’s the next step?" style="flex:1" onkeydown="if(event.key==='Enter'){event.preventDefault();addPathStep('${p.id}');}">
        <button class="btn" onclick="addPathStep('${p.id}')">＋ Step</button>
      </div>
      <div class="row" style="margin-top:12px">
        <button class="btn ghost" onclick="togglePathWalked('${p.id}')">${p.walked?'↩ Still walking it':'✓ This path is walked'}</button>
      </div>`;
    setTimeout(()=>document.getElementById('pathStepInput')?.focus(),30);
    return;
  }
  const open=paths.filter(p=>!p.walked), walked=paths.filter(p=>p.walked);
  const card=p=>{ const last=p.steps[p.steps.length-1];
    return `<div class="card" onclick="openPath('${p.id}')">
      <div class="t">🧭 ${esc(p.title)}${p.walked?' <span class="badge lic">walked ✓</span>':''}</div>
      <div class="s">${p.steps.length?esc(p.steps.length+' step'+(p.steps.length>1?'s':'')+' · last '+last.ts+': '+last.text.slice(0,72)):'not yet begun — pick it up when you like'}</div>
    </div>`; };
  el.innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>🧭 Paths ${visBadge('private')}</h2>
    <div class="meta">Not a schedule, and not a to-do list with a due date. Each path is a thread of your own
      making — an idea or intention you pick up and walk a little further whenever you have the energy. A
      path left resting is waiting, not failing. Pick one up.</div>
    <div class="row" style="margin:10px 0"><button class="btn" onclick="createPath('')">＋ Start a path</button></div>
    ${open.length ? open.map(card).join('') : '<p class="meta">No paths yet. Start one above — or in 📓 The Log, turn a captured idea into a path to walk.</p>'}
    ${walked.length ? `<h3 style="margin-top:16px">Walked</h3>${walked.map(card).join('')}` : ''}`;
}
/* ================================================================
   THE COMMONS TABLE (the Café) — built 2026-07-27, at direct request:
   "I want to be able to differentiate between common data and what's
   private data... where can I find the community written ones and
   what's my private notes."

   The honest state of things before this existed: exactly ONE surface
   in the whole Pavilion made the distinction visible (the Library's
   certified shelves vs Your Shelf 👤). Papers, lesson plans, courses,
   notes and Paths were all private with NO path out at all — there was
   no "community written" version of any of them, because nothing could
   leave. This is the other half.

   A PACKET is the unit of shared work — a paper, a lesson plan, a
   course, a note — written out as one .json a person hands to another
   person. Same mechanics as the Inheritance Hall's bequests, pointed
   at work instead of gifts: no server, no account, and nothing moves
   unless someone deliberately writes a file. The two boards on the
   Café wall need a server and stay dormant without one; this table
   does not, which is why it lives in the same room as an honest
   contrast rather than a replacement.

   The vocabulary itself lives in data/visibility.js so that every
   other panel labels things the same way. See DATA_MAP there for the
   full "what leaves this machine" accounting, rendered in Your Data.
   ================================================================ */
function commonsStore(){ if(!data.commons) data.commons={received:[],published:[],taken:{}}; if(!data.commons.taken) data.commons.taken={}; return data.commons; }
function allCommonsPackets(){ return [...COMMONS_PACKETS, ...commonsStore().received]; }
function packetKind(k){ return PACKET_KINDS[k]||PACKET_KINDS.note; }
function newPacketId(){ return 'pk-'+Date.now()+'-'+Math.random().toString(36).slice(2,6); }

export function openCommonsTable(){ state.ui='commons'; state.commonsView={mode:'shelf'}; hideAllOv(); renderCommons(); showOv('commonsOv'); }
export function commonsTab(mode){ state.commonsView={mode}; renderCommons(); }
export function openPacket(id){ state.commonsView={mode:'one', id}; renderCommons(); }

/* Taking a packet copies it into the private store where that kind of thing
   already lives — a paper into the Hall, a lesson into your Notes, a course
   onto the Course Board. A shared thing you can't actually work with is a
   museum exhibit, not a commons. Your copy is then YOURS: editing it never
   touches the commons original. */
export function takePacket(id){
  const p=allCommonsPackets().find(x=>x.id===id); if(!p) return;
  const g=commonsStore();
  /* THE REASON TRAVELS INTO YOUR COPY. It is the most perishable part of a
     packet — read once on the table and gone — and it is the part that says
     why anyone bothered. Same for the AI mark: once this is a note in your
     save, nothing else records that a model drafted it. */
  const credit=`\n\n— from the Commons: “${p.title}” by ${p.by||'unknown'} (${p.license||'license unrecorded'})`
    + (p.aiDrafted?'\n  Drafted by an AI, and published as such.':'')
    + (p.reason?`\n  Why they passed it on: ${p.reason}`:'');
  if(p.kind==='course'){
    data.courses.unshift({ id:Date.now(), title:p.title, why:(p.why||p.summary||'')+credit, category:'personal',
      due:null, steps:(p.steps||[]).map(t=>({title:t,practice:'',url:'',done:false})), begun:todayKey(), archived:false });
  } else if(p.kind==='paper'){
    if(!data.hall) data.hall={investigations:[],experiments:[],dissections:[]};
    if(!data.hall.dissections) data.hall.dissections=[];
    data.hall.dissections.unshift({ id:'d-'+Date.now(), title:p.title, ts:todayKey(), text:(p.body||p.summary||'')+credit });
  } else if(p.kind==='lesson' && (p.steps||[]).length){
    /* A LESSON COMES BACK AS A LESSON — THE-TEACHERS-TREE-PLAN.md gap 3.
       It used to fall through to the `else` below and land in Your Notes as
       prose, so the collective tree in LIVING-TREE-AND-DISCUSSION-PLAN.md
       could not grow at all: hand a colleague a lesson and he retyped it.

       Prerequisites travel as TITLES (publishFrom says why: ids are local to
       one Pavilion). Matched against what THIS Pavilion has, and simply
       dropped where there is no match — a lesson locked behind something the
       recipient does not own would be unopenable, and this project does not
       withhold. A packet with no steps still falls through to a note, because
       there is nothing there to walk. */
    const steps=(p.steps||[]).map(l=>{ const [t,...r]=String(l).split('|'); return { title:(t||'').trim(), body:r.join('|').trim() }; })
      .filter(s=>s.title);
    const prereqs=(p.needs||[]).map(t=>{
      const hit=allNodes().find(n=>String(n.title||'').toLowerCase()===String(t).toLowerCase());
      return hit?hit.id:null;
    }).filter(Boolean);
    myLessons().unshift({ id:'mine-'+Date.now().toString(36), track:p.track||'From the Commons',
      level:Number(p.level)||101, title:p.title, summary:(p.summary||p.why||'')+credit,
      prereqs, steps, mine:true, written:todayKey(), fromPacket:p.id });
  } else {
    data.notes.unshift({ id:newNoteId(), title:p.title, body:(p.body||p.summary||'')+credit, created:todayKey(), updated:todayKey() });
  }
  g.taken[id]=todayKey(); persist();
  logActivity('Took “'+p.title+'” from the Commons.'); blip(700,.08);
  renderCommons();
}
/* Publishing. Your work becomes a packet — a file — and the copy in your save
   is marked as shared so you can see, from the Table, exactly what of yours is
   out in the world. The original never leaves your private store. */
/* ---------- THE OUTLET: why you thought it was worth passing on ----------
   Asked for 2026-08-09, in the same breath as note attribution:

     "we can also have people post the notes they think are important and
      just give a reason why, small thing lets give things an outlet if
      they want one."

   Publishing already existed. What it could not carry was the ONE thing
   that makes a handed-over note worth more than a file: why this person
   thought it mattered. This project's own answer to "a book nobody chose
   is inert" is that choosing is the whole value — and a reason is the
   choosing, written down.

   IT IS OPTIONAL, and that is the "if they want one". Publishing with the
   box empty works exactly as it did before. What is NOT optional is being
   asked: the step exists so that passing something on is a considered act
   rather than a click, which is the same argument as the backpack.

   A SCREEN RATHER THAN A prompt(). The reason is a sentence someone should
   be able to write, read back and edit, and a native modal is none of
   those. It also keeps publishing a two-press act. */
export function publishFrom(kind, id){
  /* OPENS THE TABLE, not just the view state. ui/lesson-tree.js calls this
     from inside its own overlay, where #commonsOv is closed — rendering into
     a hidden panel would have made that button do precisely nothing, which is
     the house failure mode and would have been introduced by this very change.
     Publishing taking you to the publishing screen is also the honest thing:
     you pressed publish, and the next thing you must do is here. */
  state.ui='commons';
  state.commonsView={ mode:'why', kind, id:String(id) };
  hideAllOv(); renderCommons(); showOv('commonsOv');
}
export function cancelPublish(){ state.commonsView={mode:'publish'}; renderCommons(); }
/* Name the thing on the "why" screen. Publishing something whose title you
   cannot see is exactly the kind of blind press this step exists to stop. */
function publishSourceTitle(kind, id){
  if(kind==='course') return ((data.courses||[]).find(x=>String(x.id)===String(id))||{}).title||'';
  if(kind==='paper'){
    const h=(data.hall||{});
    const d=((h.dissections||[]).find(x=>x.id===id))||((h.investigations||[]).find(x=>x.id===id))||{};
    return d.title||d.claim||'';
  }
  if(kind==='lesson') return (curriculumNode(id)||{}).title||'';
  return ((data.notes||[]).find(x=>String(x.id)===String(id))||{}).title||'';
}
export function confirmPublish(){
  const v=state.commonsView||{};
  if(v.mode!=='why') return;
  const box=document.getElementById('pubReason');
  doPublish(v.kind, v.id, box ? box.value.trim() : '');
}
function doPublish(kind, id, reason){
  const g=commonsStore();
  let p=null, source=null;
  if(kind==='course'){
    const c=(data.courses||[]).find(x=>String(x.id)===String(id)); if(!c) return;
    p={ id:newPacketId(), kind:'course', title:c.title, why:c.why||'', steps:(c.steps||[]).map(s=>s.title||s.text||''), summary:c.why||'' };
  } else if(kind==='paper'){
    const d=(data.hall&&data.hall.dissections||[]).find(x=>x.id===id)
      ||(data.hall&&data.hall.investigations||[]).find(x=>x.id===id);
    if(!d) return;
    p={ id:newPacketId(), kind:'paper', title:d.title||'An analysis', body:d.text||d.body||d.claim||'', summary:(d.text||'').slice(0,160) };
  } else if(kind==='lesson'){
    // A lesson you wrote, published so it can grow the collective tree. Its
    // prerequisites travel as TITLES, not ids: ids are local to one Pavilion,
    // titles are what another person can actually match against.
    const node=curriculumNode(id); if(!node) return;
    p={ id:newPacketId(), kind:'lesson', title:node.title, why:node.summary||'',
        summary:node.summary||'', steps:(node.steps||[]).map(s=>s.title+(s.body?' | '+s.body:'')),
        needs:(node.prereqs||[]).map(pid=>{ const q=curriculumNode(pid); return q?q.title:null; }).filter(Boolean),
        track:node.track||'', level:Number(node.level)||101 };
  } else {
    const n=(data.notes||[]).find(x=>String(x.id)===String(id)); if(!n) return;
    source=n;
    p={ id:newPacketId(), kind:(/lesson/i.test(n.title||'')?'lesson':'note'), title:n.title||'A note', body:noteBody(n), summary:noteBody(n).slice(0,160) };
  }
  p.sandPavilionPacket=1;
  p.by=(g.signedAs||'').trim()||'unsigned';
  p.license='Original — shared by its author';
  p.created=todayKey();
  /* WHY IT WAS PASSED ON. Absent when the visitor left the box empty —
     an absent field, not an empty string, so a packet from before this
     existed and a packet deliberately published without a reason look
     the same, which they should. */
  if(reason) p.reason=reason;
  /* AND WHETHER A MODEL WROTE IT. The receiving Pavilion has no other way
     to know: once a packet is a file, the ✨ in its body is just a
     character. Same argument as note.by one layer out — a thing handed to
     someone else has to carry who made it. */
  if(isAiNote(source)) p.aiDrafted=true;
  p.sourceKind=kind; p.sourceId=String(id);
  g.published.unshift(p); persist();
  logActivity('Published “'+p.title+'” to the Commons.'); blip(660,.08); setTimeout(()=>blip(825,.09),90);
  state.commonsView={mode:'one', id:p.id, published:true}; renderCommons();
}
export function setCommonsName(v){ commonsStore().signedAs=v; clearTimeout(pathSaveTimer); pathSaveTimer=setTimeout(persist,500); }
export function unpublishPacket(id){
  const g=commonsStore();
  if(!window.confirm('Take this out of your published list?\n\nAny file you already handed to someone is theirs — this only forgets it here.')) return;
  g.published=g.published.filter(p=>p.id!==id); persist();
  state.commonsView={mode:'mine'}; renderCommons();
}
export async function writePacketFile(id){
  const p=allCommonsPackets().find(x=>x.id===id)||commonsStore().published.find(x=>x.id===id);
  if(!p) return;
  const out={ ...p }; delete out.sourceKind; delete out.sourceId;
  const json=JSON.stringify(out,null,2);
  const name='packet-'+(p.title||'work').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)+'.json';
  if(typeof window!=='undefined' && window.desktopBridge?.saveFile){
    const res=await window.desktopBridge.saveFile(name, json);
    if(res.canceled) return;
    if(!res.ok){ alert('Could not write the file: '+(res.error||'unknown error')); return; }
  } else {
    const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));
    const a=document.createElement('a'); a.href=url; a.download=name;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  blip(700,.07);
  const el=document.getElementById('pkOut'); if(el) el.innerHTML='<div class="meta" style="margin-top:8px">Written. Hand that file to anyone — it lands on their Commons Table with your name on it.</div>';
}
export function triggerImportPacket(){ document.getElementById('packetFile').click(); }
if(typeof document!=='undefined' && document.getElementById('packetFile')){
  document.getElementById('packetFile').addEventListener('change', e=>{
    const f=e.target.files&&e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=()=>{
      try{
        const p=JSON.parse(r.result);
        if(!p||!p.sandPavilionPacket){ alert("That file isn't a packet — it should be a .json written at someone's Commons Table."); return; }
        const g=commonsStore();
        p.id=p.id||newPacketId();
        if(g.received.some(x=>x.id===p.id)) p.id=newPacketId(); // never silently replace one you already have
        p.receivedOn=todayKey();
        g.received.unshift(p); persist();
        logActivity('Received “'+(p.title||'a packet')+'” into the Commons.'); blip(523,.09); setTimeout(()=>blip(784,.12),100);
        state.ui='commons'; state.commonsView={mode:'one', id:p.id}; hideAllOv(); renderCommons(); showOv('commonsOv');
      }catch(err){ alert("Couldn't read that file: "+err.message); }
    };
    r.readAsText(f); e.target.value='';
  });
}

function renderCommons(){
  const el=document.getElementById('commonsPanel'); if(!el) return;
  const v=state.commonsView||{mode:'shelf'}, g=commonsStore();
  const back=`<button class="xbtn" onclick="closeUI()">Esc ✕</button>`;
  const tabs=(active)=>`<div class="row" style="gap:6px;margin:10px 0;flex-wrap:wrap">
    <button class="btn ${active==='shelf'?'':'ghost'}" onclick="commonsTab('shelf')">🏛 The commons</button>
    <button class="btn ${active==='mine'?'':'ghost'}" onclick="commonsTab('mine')">🤝 Shared by you</button>
    <button class="btn ${active==='publish'?'':'ghost'}" onclick="commonsTab('publish')">📤 Publish something</button>
    <button class="btn ${active==='private'?'':'ghost'}" onclick="commonsTab('private')">👤 What stays private</button>
  </div>`;

  /* The one screen between "publish this" and it being published. */
  if(v.mode==='why'){
    const title=publishSourceTitle(v.kind, v.id);
    el.innerHTML=`${back}
      <div class="row" style="margin-bottom:8px"><button class="btn ghost" onclick="cancelPublish()">← Not yet</button></div>
      <h2>📤 Why is this worth passing on?</h2>
      <div class="meta">You are about to publish <b>${esc(title||'this')}</b>.</div>
      <div class="meta" style="margin-top:8px">A packet with a reason on it is worth more than a file. Say what made
        you think someone else should have this — one line is plenty. It travels with the packet and is the first
        thing the next person reads.
        <br><br><b>It is optional.</b> Publish with the box empty and nothing is lost; the reason is an outlet, not a toll.</div>
      <textarea id="pubReason" rows="3" style="margin-top:10px"
        placeholder="e.g. this changed how I plan a week — the bit about small units is the part that matters"></textarea>
      <div class="row" style="margin-top:10px;gap:6px">
        <button class="btn" onclick="confirmPublish()">🤝 Publish it</button>
        <button class="btn ghost" onclick="cancelPublish()">Cancel</button>
      </div>`;
    setTimeout(()=>{ const t=document.getElementById('pubReason'); if(t) t.focus(); },30);
    return;
  }

  if(v.mode==='one'){
    const p=allCommonsPackets().find(x=>x.id===v.id)||g.published.find(x=>x.id===v.id);
    if(!p){ state.commonsView={mode:'shelf'}; return renderCommons(); }
    const mine=g.published.some(x=>x.id===p.id);
    const k=packetKind(p.kind);
    const taken=g.taken[p.id];
    el.innerHTML=`${back}
      <div class="row" style="margin-bottom:8px"><button class="btn ghost" onclick="commonsTab('${mine?'mine':'shelf'}')">← Back to the table</button></div>
      <h2>${k.icon} ${esc(p.title)}</h2>
      <div class="meta">${mine?visBadge('shared'):visBadge('commons')} ${k.label} · by <b>${esc(p.by||'unknown')}</b>${p.license?' · '+esc(p.license):''}${p.created?' · '+esc(p.created):''}${p.receivedOn?' · received '+esc(p.receivedOn):''}${p.aiDrafted?' · <b>✨ drafted by an AI</b>':''}</div>
      ${p.reason?`<div class="card" style="cursor:default;margin-top:10px;border-color:#7fa36b">
          <div class="s" style="color:#7fa36b">Why ${p.by && p.by!=='unsigned' ? esc(p.by)+' passed this on' : 'this was passed on'}</div>
          <div style="white-space:pre-wrap;margin-top:4px">${esc(p.reason)}</div>
        </div>`:''}
      ${p.summary?`<div class="meta" style="margin-top:8px">${esc(p.summary)}</div>`:''}
      ${p.steps&&p.steps.length?`<ol style="margin:12px 0 0 18px">${p.steps.map(s=>`<li style="margin:4px 0">${esc(s)}</li>`).join('')}</ol>`:''}
      ${p.body?`<div class="card" style="cursor:default;margin-top:12px"><div style="white-space:pre-wrap">${esc(p.body)}</div></div>`:''}
      ${!mine?`<div class="row" style="margin-top:14px"><button class="btn" onclick="takePacket('${p.id}')">${taken?'📥 Take another copy':'📥 Take a copy into '+k.lands}</button></div>
        <div class="meta" style="margin-top:6px">${taken?'You took a copy on '+esc(taken)+'. Your copy is yours — editing it never touches this one.':'A copy lands in '+k.lands+' as <b>yours</b>. This one stays on the table for the next person.'}</div>`
        :`<div class="row" style="margin-top:14px;gap:6px">
            <button class="btn" onclick="writePacketFile('${p.id}')">⤓ Write the file to hand over</button>
            <button class="btn ghost" style="border-color:var(--danger);color:var(--danger-soft)" onclick="unpublishPacket('${p.id}')">Take it off my list</button>
          </div>`}
      <div id="pkOut"></div>`;
    return;
  }

  if(v.mode==='mine'){
    el.innerHTML=`${back}
      <h2>🤝 Shared by you</h2>
      ${tabs('mine')}
      <div class="meta">${visLine('shared')}</div>
      <div class="row" style="margin-top:10px;gap:6px;align-items:center">
        <span class="meta" style="margin:0">Signed</span>
        <input type="text" value="${esc(g.signedAs||'')}" placeholder="your name, or leave it unsigned" oninput="setCommonsName(this.value)" style="flex:1">
      </div>
      ${g.published.length? g.published.map(p=>`<div class="card" onclick="openPacket('${p.id}')">
          <div class="t">${packetKind(p.kind).icon} ${esc(p.title)}</div>
          <div class="s">${packetKind(p.kind).label} · published ${esc(p.created||'')} — open it to write the file</div>
        </div>`).join('')
        : `<p class="meta" style="margin-top:12px">You haven't published anything yet. Nothing of yours has left this machine.
           <br><br>That is the default and it stays the default: the only way any of your work becomes commons is you choosing it, here, one piece at a time.</p>`}`;
    return;
  }

  if(v.mode==='publish'){
    const papers=[...((data.hall&&data.hall.dissections)||[])];
    const invs=((data.hall&&data.hall.investigations)||[]).filter(i=>i.mine!==false);
    const courses=(data.courses||[]).filter(c=>!c.archived);
    const notes=(data.notes||[]);
    const row=(kind,id,icon,title,sub)=>`<div class="card" onclick="publishFrom('${kind}','${String(id).replace(/'/g,'')}')">
      <div class="t">${icon} ${esc(title)}</div><div class="s">${esc(sub)} · publish this</div></div>`;
    el.innerHTML=`${back}
      <h2>📤 Publish something</h2>
      ${tabs('publish')}
      <div class="meta">Publishing turns one piece of your work into a <b>packet</b> — a single file you can hand to a person. Your original stays exactly where it is and stays private; the packet is a copy with your name on it.
        <br><br>Nothing is uploaded. There is no server here to upload to. A packet reaches someone because you gave it to them.</div>
      <div class="row" style="margin-top:10px;gap:6px;align-items:center">
        <span class="meta" style="margin:0">Sign as</span>
        <input type="text" value="${esc(g.signedAs||'')}" placeholder="your name, or leave it unsigned" oninput="setCommonsName(this.value)" style="flex:1">
      </div>
      <h3 style="margin-top:16px">📄 Papers and analyses</h3>
      ${papers.length||invs.length ? papers.map(d=>row('paper',d.id,'📄',d.title||'An analysis',esc(d.ts||'')))
          .concat(invs.map(i=>row('paper',i.id,'🔬',i.claim||i.title||'An investigation','investigation'))).join('')
        : '<p class="meta">Nothing yet — keep a paper analysis or an investigation in the Science &amp; Research Hall first.</p>'}
      <h3 style="margin-top:16px">🧭 Courses and lesson plans</h3>
      ${courses.length ? courses.map(c=>row('course',c.id,'🧭',c.title,`${(c.steps||[]).length} steps`)).join('')
        : '<p class="meta">Nothing yet — build one at the Course Board in the Study.</p>'}
      <h3 style="margin-top:16px">🗒 Notes</h3>
      ${notes.length ? notes.slice(0,40).map(n=>row('note',n.id,/lesson/i.test(n.title||'')?'🎓':'🗒',n.title||'Untitled note',(noteBody(n)||'').slice(0,60))).join('')
        : '<p class="meta">Nothing yet — write one in Your Notes.</p>'}`;
    return;
  }

  if(v.mode==='private'){
    el.innerHTML=`${back}
      <h2>👤 What stays private</h2>
      ${tabs('private')}
      <div class="meta">${visLine('private')}</div>
      <div class="meta" style="margin-top:8px">The full accounting — every store in your save, and whether it can ever leave this machine — is in <b>Your Data</b> (pause menu). The short version:</div>
      <div style="margin-top:10px">
        ${DATA_MAP.filter(d=>d.state==='private').map(d=>`<div class="card" style="cursor:default">
          <div class="t">${esc(d.name)}</div><div class="s">${esc(d.leaves)}</div></div>`).join('')}
      </div>
      <div class="row" style="margin-top:12px"><button class="btn ghost" onclick="openDataPanel()">Open Your Data →</button></div>`;
    return;
  }

  // the shelf — what the community wrote
  const packets=allCommonsPackets();
  const bundled=packets.filter(p=>!g.received.some(r=>r.id===p.id));
  const got=g.received;
  const card=p=>{ const k=packetKind(p.kind);
    return `<div class="card" onclick="openPacket('${p.id}')">
      <div class="t">${k.icon} ${esc(p.title)}${g.taken[p.id]?' <span class="badge lic">taken</span>':''}</div>
      <div class="s">${k.label} · by ${esc(p.by||'unknown')}${p.license?' · '+esc(p.license):''}</div>
    </div>`; };
  el.innerHTML=`${back}
    <h2>🏛 The Commons Table</h2>
    ${tabs('shelf')}
    <div class="meta">Work people wrote and chose to hand on — papers, lesson plans, courses. Every one carries who wrote it and under what license, exactly like a text on a Library shelf.
      <br><br>${visLine('commons')}</div>
    <div class="meta" style="margin-top:8px"><b>This table needs no account and no server.</b> A piece of work gets here because a person wrote a file and gave it to someone. (The two boards on the wall behind you are the other kind — they need a shared database, and stay dormant without one.)</div>
    ${bundled.length?`<h3 style="margin-top:16px">On the table</h3>${bundled.map(card).join('')}`:''}
    ${got.length?`<h3 style="margin-top:16px">Handed to you · ${got.length}</h3>${got.map(card).join('')}`:''}
    <h3 style="margin-top:18px">Someone gave you a packet</h3>
    <div class="meta">A <b>.json</b> written at another person's Commons Table. Nothing is fetched from anywhere — you were handed it.</div>
    <div class="row" style="margin-top:8px"><button class="btn" onclick="triggerImportPacket()">⤒ Put it on the table</button></div>`;
}

/* ================================================================
   THE INHERITANCE HALL — BETA-BUILD-PLAN.md §8, built 2026-07-27.

   An open sandbox at the southwest edge of the Grounds. It ships
   EMPTY on purpose: everything standing in it was planted by whoever
   keeps this Pavilion, or arrived as a bequest someone else left.
   Three things can be planted, and each is a real gift rather than a
   score:
     📖 a book on a stone  — a curated collection off your shelves
     🌱 a seed             — your own notes; it grows over REAL days,
                             blooms, and then gives seeds of its own,
                             which can be planted again elsewhere
     ⚔ a sword in a stone — a course, set behind a trial: a question
                             only someone who did the work can answer

   Two rules this must never break (both are project invariants):
   - PROVENANCE AT THE DOOR: a bequest carries license + source per
     text, and only redistributes text that may be redistributed.
     Anything else travels as its catalog card — where to get it —
     plus your notes, which are always yours to give.
   - NOTHING LEAVES WITHOUT YOU. Making a bequest is a deliberate act
     with a preview of exactly what's included. No auto-sharing, no
     server, no background anything. A bequest is a file you hand over.
   ================================================================ */
const TRIAL_MISS=["Not it. The stone doesn't move.","The stone holds. Try again when you know it.","Nothing gives. Whoever set this meant it."];
function newPlantId(){ return 'plant-'+Date.now()+'-'+Math.random().toString(36).slice(2,6); }
function groveStore(){ if(!data.grove) data.grove={plantings:[],seeds:[]}; if(!data.grove.seeds) data.grove.seeds=[]; return data.grove; }
function findPlanting(id){ return groveStore().plantings.find(p=>p.id===id); }
function normalizeAnswer(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9 ]+/g,'').replace(/\s+/g,' ').trim(); }
/* Licenses that genuinely permit passing the text on. Anything not on this
   list travels as a card, not a book — the same test the Library applies at
   its own door, applied to giving instead of shelving. */
function redistributable(license){ return /public domain|cc0|creative commons|cc by|cc-by|gutenberg|mit|open|pavilion commons/i.test(String(license||'')); }
function noteBody(n){ return (n && (n.body||n.text||'')) || ''; }
function plantedByLabel(pl){ return pl.by ? esc(pl.by) : (pl.received?'someone who came before':'you'); }
const STAGE_WORD=['a seed in the soil','a sprout','in bud','in bloom'];

/* ----- The Alexandria Stone (2026-07-27, at direct request: "I feel like we
   need a remembrance of Alexandria or something, that we can show that this can
   be forgotten but will never be burned down again").

   Told honestly, because the honest version makes the point better than the
   myth does. The popular story is one night and one fire. The historical
   picture is slower and sadder: partial damage across centuries, funding
   withdrawn, scholars leaving, copies not made — a library that was mostly
   *let* go. Which is exactly the failure this Hall is built against, and it's a
   failure of habit rather than of villains.

   The counter-argument isn't rhetoric here — it's counted from the visitor's
   own Pavilion and shown back to them. */
export function openAlexandria(){
  state.ui='alexandria'; hideAllOv(); renderAlexandria(); showOv('alexandriaOv');
}
function renderAlexandria(){
  const el=document.getElementById('alexandriaPanel'); if(!el) return;
  const g=commonsStore();
  const shelved=Store.allDocs().length;
  const planted=(data.grove&&data.grove.plantings||[]).length;
  const given=(g.published||[]).length + (data.grove&&data.grove.plantings||[]).filter(p=>!p.received).length;
  const received=(g.received||[]).length + (data.grove&&data.grove.plantings||[]).filter(p=>p.received).length;
  el.innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>🏛 The Alexandria Stone</h2>
    <div class="meta">A broken column, half-buried in the sand of this court. Nobody remembers carrying
      it in.</div>

    <div class="card" style="cursor:default;margin-top:12px;border-color:#b8ae97">
      <div style="white-space:pre-wrap;font-style:italic">“It was not one fire.

That is the part everyone gets wrong, and getting it wrong lets us off.

There was a fire, and it took some of it. Then a century passed and the salaries
stopped. Then the scholars went elsewhere, because scholars go where they are
fed. Then a war, and another, and each one took a little. Then nobody was
copying the scrolls any more, because copying is slow and dull and there was
always next year.

No single night destroyed the library at Alexandria. It was let go — quietly,
over generations, by people who each assumed someone else was keeping it.

What actually killed it was simpler than fire: there was only ever one of it.”</div>
    </div>

    <div class="meta" style="margin-top:12px">That is the whole argument this Hall exists to make. A
      text that lives in one place is one accident from gone — one fire, one dead hard drive, one
      company deciding it is no longer commercially interesting, one generation that forgets to copy it
      forward. <b>The answer was never a better building. It was more hands.</b></div>

    <h3 style="margin-top:16px">Where your Pavilion actually stands</h3>
    <div class="row" style="flex-wrap:wrap;gap:10px;margin-top:8px">
      <div class="card" style="cursor:default;flex:1 1 140px"><div class="t">${shelved}</div><div class="s">texts on your shelves</div></div>
      <div class="card" style="cursor:default;flex:1 1 140px"><div class="t">${planted}</div><div class="s">things standing in this court</div></div>
      <div class="card" style="cursor:default;flex:1 1 140px"><div class="t">${given}</div><div class="s">you have made copies of, for others</div></div>
      <div class="card" style="cursor:default;flex:1 1 140px"><div class="t">${received}</div><div class="s">reached you from someone else</div></div>
    </div>
    ${given===0
      ? `<div class="meta" style="margin-top:10px"><b>Nothing here exists in more than one place yet.</b>
          Everything on your shelves is currently one machine away from being forgotten — not burned,
          just lost the ordinary way. Plant something, or publish something, and that stops being true
          for that one thing.</div>`
      : `<div class="meta" style="margin-top:10px"><b>${given} thing${given===1?'':'s'} of yours now exist
          somewhere other than here</b> — or can, the moment you hand the file over. That is the only
          protection any library has ever actually had.</div>`}

    <div class="meta" style="margin-top:14px">This can still be forgotten. Nothing prevents that, and
      any promise otherwise would be a lie — sand is the honest name for it. What cannot happen again is
      a <i>single</i> fire ending it, because there is no single building to burn: only copies, in
      hands, given away faster than they can be lost.</div>

    <div class="row" style="margin-top:16px;gap:6px;flex-wrap:wrap">
      <button class="btn ghost" onclick="openInheritanceHall()">🗿 The Record Stone</button>
      <button class="btn ghost" onclick="openCommonsTable()">🏛 The Commons Table</button>
    </div>`;
}
export function openInheritanceHall(){ state.ui='grove'; state.groveView={mode:'hall'}; hideAllOv(); renderGrove(); showOv('groveOv'); }
export function openPlantHere(x,y){ state.ui='grove'; state.groveView={mode:'plant',x,y}; hideAllOv(); renderGrove(); showOv('groveOv'); }
export function openPlanting(id){ state.ui='grove'; state.groveView={mode:'one',id}; hideAllOv(); renderGrove(); showOv('groveOv'); }
export function backToHallRecord(){ state.groveView={mode:'hall'}; renderGrove(); }
export function choosePlantKind(kind){ const v=state.groveView||{}; state.groveView={mode:'compose',kind,x:v.x,y:v.y}; renderGrove(); }
export function backToPlantChoice(){ const v=state.groveView||{}; state.groveView={mode:'plant',x:v.x,y:v.y}; renderGrove(); }

export function groveHiddenChanged(){
  const k=document.getElementById('gvHidden')?.value||'none';
  const box=document.getElementById('gvHiddenOpts'), slug=document.getElementById('gvHiddenSlug'), num=document.getElementById('gvHiddenNum');
  if(!box) return;
  box.style.display = k==='none'||k==='planted' ? 'none' : 'block';
  if(slug) slug.style.display = k==='read' ? 'block' : 'none';
  if(num) num.style.display = (k==='days'||k==='books') ? 'block' : 'none';
}
function readHiddenChoice(){
  const k=document.getElementById('gvHidden')?.value||'none';
  if(k==='none') return null;
  const n=parseInt(document.getElementById('gvHiddenNum')?.value||'7',10)||1;
  if(k==='read'){
    const slug=document.getElementById('gvHiddenSlug')?.value||'';
    const d=Store.getDoc(slug);
    return slug? { kind:'read', slug, label:'read “'+((d&&d.title)||slug)+'” in the Library' } : null;
  }
  if(k==='days') return { kind:'days', days:n, label:`wait ${n} day${n===1?'':'s'} from the day it went in the ground` };
  if(k==='planted') return { kind:'planted', label:'plant something of your own here first' };
  if(k==='books') return { kind:'books', count:n, label:`bring ${n} book${n===1?'':'s'} of your own into the Library` };
  return null;
}
/* ----- The local AI's help, and its limits. It drafts a suggestion FROM what
   is actually on your shelves and in your notes; it never plants anything, and
   what it writes lands in the form for you to edit. WORK_CHARTER, not the
   residents' devotional one: what someone leaves here might be a trade, a
   language, or a recipe, and the Hall must serve it on its own terms. */
export async function draftPlantingWithAI(){
  const v=state.groveView||{}, kind=v.kind, out=document.getElementById('gvAiOut');
  const say=t=>{ if(out) out.textContent=t; };
  if(!isAIActive()) return say('No local AI connected — ⚙ Manage AI connections. Everything here still works by hand.');
  const shelf=Store.allDocs().slice(0,60).map(d=>`- ${d.title} (${d.tradition||'—'})`).join('\n');
  const notes=(data.notes||[]).slice(0,25).map(n=>`- ${n.title||'Untitled'}: ${noteBody(n).slice(0,120)}`).join('\n');
  const ask = kind==='book'
    ? `The visitor is leaving a CURATED COLLECTION OF BOOKS in the Inheritance Hall for a stranger to find.\nTheir shelves:\n${shelf}\n\nChoose 2–5 that genuinely belong together and say why.\nReply in exactly this shape:\nTITLE: <a short name for the collection>\nMESSAGE: <2–4 sentences to whoever finds it — concrete, not inspirational filler>\nBOOKS: <exact titles from the list above, separated by | >`
    : kind==='seed'
    ? `The visitor is burying a SEED holding some of their own notes, for a stranger to find. It opens after a few real days.\nTheir notes:\n${notes||'(none yet)'}\n\nReply in exactly this shape:\nTITLE: <a short name for the seed>\nMESSAGE: <2–4 sentences to whoever finds it — what these notes are for, honestly>`
    : `The visitor is setting a COURSE in stone in the Inheritance Hall, behind a trial only someone who did the work can answer.\nTheir shelves:\n${shelf}\n\nReply in exactly this shape:\nTITLE: <short course name>\nMESSAGE: <2–3 sentences to whoever finds it>\nWHY: <one line on why it is worth walking>\nSTEPS: <3–6 concrete steps, separated by | >\nTRIAL_Q: <a question only someone who actually did the steps could answer>\nTRIAL_A: <the short answer, a few words>`;
  say('Your local AI is drafting… (a bigger model may take a moment)');
  try{
    const reply=await AI.chat([
      {role:'system', content:WORK_CHARTER+'\n\nYou help someone decide what to leave behind for a stranger. Be concrete and plain. '
        +'Never invent a book that is not on their list. Answer ONLY in the labelled shape asked for, nothing before or after.'},
      {role:'user', content:ask},
    ]);
    if(isEmptyReply(reply)) return say('It came back empty — try again, or just write it yourself.');
    const field=(name)=>{ const m=reply.match(new RegExp('^\\s*'+name+':\\s*(.+)$','im')); return m?m[1].trim():''; };
    const set=(id,val)=>{ const e=document.getElementById(id); if(e&&val) e.value=val; };
    set('gvTitle', field('TITLE')); set('gvNote', field('MESSAGE'));
    if(kind==='sword'){
      set('gvWhy', field('WHY'));
      const steps=field('STEPS'); if(steps) set('gvSteps', steps.split('|').map(s=>s.trim()).filter(Boolean).join('\n'));
      set('gvTrialQ', field('TRIAL_Q')); set('gvTrialA', field('TRIAL_A'));
    }
    if(kind==='book'){
      const wanted=field('BOOKS').split('|').map(s=>s.trim().toLowerCase()).filter(Boolean);
      let ticked=0;
      document.querySelectorAll('.gvBook').forEach(cb=>{
        const label=(cb.parentElement?.textContent||'').toLowerCase();
        if(wanted.some(w=>w&&label.includes(w))){ cb.checked=true; ticked++; }
      });
      return say(`Drafted, and ticked ${ticked} book${ticked===1?'':'s'} it recognised. It's a suggestion — change anything, then plant it yourself.`);
    }
    say("Drafted. It's a suggestion, not a decision — edit freely, then plant it yourself.");
  }catch(e){ say('The connection flickered — nothing drafted. Writing it by hand always works.'); }
}
export function createPlanting(){
  const v=state.groveView||{}, kind=v.kind, msgEl=document.getElementById('gvMsgLine');
  const say=t=>{ if(msgEl) msgEl.textContent=t; };
  const title=(document.getElementById('gvTitle')?.value||'').trim();
  if(!title) return say('Give it a name first — whoever finds it sees that before anything else.');
  const g=groveStore();
  const by=(document.getElementById('gvBy')?.value||'').trim();
  if(by) g.signedAs=by; // remembered, so you don't retype your own name every time
  const pl={ id:newPlantId(), kind, scene:'grove', x:v.x, y:v.y, title,
    message:(document.getElementById('gvNote')?.value||'').trim(), by,
    planted:todayKey(), taken:false, drawn:false, harvested:false, received:false,
    hidden:readHiddenChoice() };
  if(kind==='book'){
    const slugs=[...document.querySelectorAll('.gvBook:checked')].map(c=>c.value);
    if(!slugs.length) return say('Pick at least one book — a collection of nothing is just a stone.');
    pl.books=slugs.map(s=>{ const d=Store.getDoc(s)||{};
      return { slug:s, title:d.title||s, license:d.license||'', source_url:d.source_url||'',
               attribution:d.attribution||'', tradition:d.tradition||'', summary:(d.doc&&d.doc.summary)||'' }; });
  } else if(kind==='seed'){
    const ids=[...document.querySelectorAll('.gvNote:checked')].map(c=>c.value);
    if(!ids.length) return say('A seed holds notes — choose at least one to put in it.');
    pl.notes=ids.map(id=>{ const n=(data.notes||[]).find(x=>String(x.id)===String(id)); return n?{title:n.title||'Untitled note', body:noteBody(n), created:n.created||todayKey()}:null; }).filter(Boolean);
  } else {
    const steps=(document.getElementById('gvSteps')?.value||'').split('\n').map(s=>s.trim()).filter(Boolean);
    if(!steps.length) return say('A course needs steps — one per line — or there is nothing to hand on.');
    const q=(document.getElementById('gvTrialQ')?.value||'').trim();
    const a=(document.getElementById('gvTrialA')?.value||'').trim();
    if(q&&!a) return say('A trial needs an answer as well as a question, or nobody can ever draw it.');
    pl.course={ title, why:(document.getElementById('gvWhy')?.value||'').trim(), steps };
    pl.trial=q? { question:q, answer:a, hint:(document.getElementById('gvTrialH')?.value||'').trim() } : null;
    pl.drawn=!pl.trial; // no trial set means it stands unlocked, freely taken
  }
  g.plantings.push(pl); persist();
  logActivity('Planted "'+title+'" in the Inheritance Hall.');
  awardBadge('first-note'); blip(523,.09); setTimeout(()=>blip(659,.11),95);
  state.groveView={mode:'one',id:pl.id}; renderGrove();
}
export function plantSeedFromPouch(seedId){
  const v=state.groveView||{}, g=groveStore();
  const i=g.seeds.findIndex(s=>s.id===seedId); if(i<0) return;
  const s=g.seeds[i];
  const pl={ id:newPlantId(), kind:'seed', scene:'grove', x:v.x, y:v.y, title:s.title, message:s.message||'',
    by:s.by||'', planted:todayKey(), notes:s.notes||[], taken:false, harvested:false, received:!!s.received,
    origin:s.origin||null };
  g.plantings.push(pl); g.seeds.splice(i,1); persist();
  logActivity('Planted a gathered seed — "'+s.title+'" grows again.'); blip(660,.08);
  state.groveView={mode:'one',id:pl.id}; renderGrove();
}
export function gatherSeeds(id){
  const pl=findPlanting(id); if(!pl||pl.kind!=='seed'||plantStage(pl)<3||pl.harvested) return;
  const g=groveStore();
  for(let i=0;i<2;i++) g.seeds.push({ id:'seed-'+Date.now()+'-'+i+Math.random().toString(36).slice(2,5),
    title:pl.title, message:pl.message, by:pl.by, notes:pl.notes||[], received:pl.received,
    origin:pl.origin||(pl.by?{by:pl.by,date:pl.planted}:null) });
  pl.harvested=true; persist();
  logActivity('Gathered seeds from "'+pl.title+'".'); blip(784,.08); setTimeout(()=>blip(988,.1),90);
  renderGrove();
}
export function attemptTrial(id){
  const pl=findPlanting(id); if(!pl||!pl.trial) return;
  const el=document.getElementById('gvTrialInput'), out=document.getElementById('gvTrialOut');
  const given=normalizeAnswer(el&&el.value);
  if(!given) return;
  if(given===normalizeAnswer(pl.trial.answer)){
    pl.drawn=true; persist();
    logActivity('Drew the sword from the stone: "'+pl.title+'".');
    blip(523,.1); setTimeout(()=>blip(659,.1),100); setTimeout(()=>blip(784,.16),200);
    renderGrove();
  } else {
    if(out) out.textContent=TRIAL_MISS[Math.floor(Math.random()*TRIAL_MISS.length)];
    blip(180,.14,'sawtooth');
  }
}
/* Taking what's in a planting. Books land on Your Shelf, notes in Your Notes,
   a course on the Course Board — the places those things already live. A gift
   nobody can actually use isn't a gift. */
export async function takePlanting(id){
  const pl=findPlanting(id); if(!pl) return;
  const out=document.getElementById('gvTakeOut');
  const say=t=>{ if(out) out.textContent=t; };
  if(pl.kind==='sword'&&!pl.drawn) return say('The stone holds. Answer the trial first.');
  if(pl.kind==='book'){
    let shelved=0, already=0, cardOnly=0;
    for(const b of (pl.books||[])){
      if(Store.getDoc(b.slug)){ already++; continue; } // already on your shelves — nothing to do
      const sections=b.sections||[];
      const body=b.text || sections.map(s=>(s.heading?s.heading+'\n\n':'')+s.body).join('\n\n');
      const res=await shelveAsPersonal({ title:b.title, body, license:b.license,
        source:b.source_url, tradition:b.tradition||'Personal', sections,
        summary:(b.summary||'')+(body?'':'\n\n(Left as a catalog card — its license doesn’t allow the text itself to travel. The source link above is where to get it.)') });
      if(res&&res.ok!==false){ shelved++; if(!body) cardOnly++; }
    }
    say(`Taken. ${shelved} shelved on Your Shelf${cardOnly?` (${cardOnly} as cards — see the note on each)`:''}${already?`, ${already} you already had`:''}.`);
  } else if(pl.kind==='seed'){
    for(const n of (pl.notes||[])){
      data.notes.unshift({ id:newNoteId(), title:n.title||'Untitled note',
        body:(noteBody(n)+`\n\n— left in the Inheritance Hall by ${pl.by||'someone who came before'}${pl.planted?', '+pl.planted:''}`).trim(),
        created:todayKey(), updated:todayKey() });
    }
    say((pl.notes||[]).length+' note(s) copied into 🗒 Your Notes — the originals stay in the ground.');
  } else {
    const c=pl.course||{title:pl.title,why:'',steps:[]};
    data.courses.unshift({ id:Date.now(), title:c.title||pl.title, why:c.why||pl.message||'', category:'personal',
      due:null, steps:(c.steps||[]).map(t=>({title:t,practice:'',url:'',done:false})),
      begun:todayKey(), archived:false });
    say('The course is on your Course Board (the Study) — yours to walk now.');
  }
  pl.taken=true; persist(); logActivity('Took what was left in "'+pl.title+'".'); blip(700,.08);
  renderGrove(); setTimeout(()=>{ const o=document.getElementById('gvTakeOut'); if(o&&out) o.textContent=out.textContent; },10);
}
export function digUpPlanting(id){
  const pl=findPlanting(id); if(!pl) return;
  if(!window.confirm('Dig up “'+(pl.title||'this')+'”? What it holds goes with it.\n\n(If you meant to keep a copy, leave a bequest file first.)')) return;
  const g=groveStore(); g.plantings=g.plantings.filter(p=>p.id!==id); persist();
  state.groveView={mode:'hall'}; renderGrove();
}
/* ----- The bequest file: how any of this reaches another person at all.
   No server, no account — one .json you hand over, exactly like the save
   export already works. The provenance filter runs HERE, at the door. */
function bequestFor(pl){
  const out={ sandPavilionBequest:1, kind:pl.kind, title:pl.title, message:pl.message||'',
    by:pl.by||groveStore().signedAs||'', left:pl.planted||todayKey(), origin:pl.origin||null,
    hidden:pl.hidden||null }; // a thing you buried stays buried for whoever you give it to
  if(pl.kind==='book'){
    out.books=(pl.books||[]).map(b=>{
      const d=Store.getDoc(b.slug)||{};
      const card={ slug:b.slug, title:b.title, license:b.license||d.license||'',
        source_url:b.source_url||d.source_url||'', attribution:b.attribution||d.attribution||'',
        tradition:b.tradition||d.tradition||'', summary:b.summary||(d.doc&&d.doc.summary)||'' };
      // A book's readable content lives in one of two places: inline fullText
      // (the big classics) or doc.sections (the Pavilion's own short originals).
      // Both have to travel, or a bequest of Commons essays arrives empty —
      // found the hard way, 2026-07-27, by actually exporting one.
      const inline=(d.doc&&d.doc.fullText&&d.doc.fullText.text)||'';
      const sections=(d.doc&&d.doc.sections)||[];
      if(redistributable(card.license) && (inline||sections.length)){
        if(inline) card.text=inline;
        if(sections.length) card.sections=sections;
      } else card.textOmitted=true;
      return card;
    });
  } else if(pl.kind==='seed'){ out.notes=(pl.notes||[]).map(n=>({title:n.title,body:noteBody(n),created:n.created})); }
  else { out.course=pl.course||null; out.trial=pl.trial||null; }
  return out;
}
export function previewBequest(id){
  const pl=findPlanting(id); if(!pl) return;
  const b=bequestFor(pl);
  const el=document.getElementById('gvGiveOut'); if(!el) return;
  let lines=[];
  if(b.kind==='book') lines=(b.books||[]).map(x=>`• ${esc(x.title)} — ${esc(x.license||'license unrecorded')} · ${x.text?'<b>full text travels</b>':'<i>card only — the text stays home</i>'}`);
  else if(b.kind==='seed') lines=(b.notes||[]).map(x=>`• ${esc(x.title)} — your own words, ${x.body.length} characters`);
  else lines=[`• The course “${esc((b.course&&b.course.title)||b.title)}” · ${(b.course&&b.course.steps||[]).length} steps`,
              b.trial?`• The trial travels with it — including its answer, so the stone still holds for them`:'• No trial — it stands open'];
  el.innerHTML=`<div class="meta" style="margin-top:8px"><b>This is exactly what leaves:</b><br>${lines.join('<br>')}
    <br><br>Signed ${esc(b.by||'unsigned')}. Nothing else in your Pavilion is in this file — not your save, not your day, not a note you didn’t pick.</div>`;
}
export async function giveBequest(id){
  const pl=findPlanting(id); if(!pl) return;
  const json=JSON.stringify(bequestFor(pl),null,2);
  const name='bequest-'+(pl.title||'gift').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)+'.json';
  if(typeof window!=='undefined' && window.desktopBridge?.saveFile){
    const res=await window.desktopBridge.saveFile(name, json);
    if(res.canceled) return;
    if(!res.ok){ alert('Could not write the file: '+(res.error||'unknown error')); return; }
  } else {
    const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));
    const a=document.createElement('a'); a.href=url; a.download=name;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  logActivity('Left a bequest to give away: "'+pl.title+'".'); blip(700,.07);
  const el=document.getElementById('gvGiveOut'); if(el) el.innerHTML='<div class="meta" style="margin-top:8px">Written. Hand that file to anyone — they plant it in their own Hall.</div>';
}
export function triggerImportBequest(){ document.getElementById('bequestFile').click(); }
/* Gifts left at the gate — bundled with the build, never pre-planted. The
   courtyard is still empty when you walk in; these are simply offered, and
   receiving one is a deliberate act, exactly like a bequest from a person. */
export function plantGift(giftId){
  const b=GATE_BEQUESTS.find(g=>g.id===giftId); if(!b) return;
  plantBequest(b, giftId);
}
function plantBequest(b,giftId){
  const spot=freeGroveTile();
  if(!spot){ alert('The court is full — dig something up, or there is nowhere to set this down.'); return; }
  const pl={ id:newPlantId(), kind:(['book','seed','sword'].includes(b.kind)?b.kind:'book'), scene:'grove',
    x:spot.x, y:spot.y, title:b.title||'Something left here', message:b.message||'', by:b.by||'',
    planted:todayKey(), taken:false, harvested:false, received:true, giftId:giftId||null,
    hidden:b.hidden||null,
    origin:{ by:b.by||'unknown', date:b.left||'' } };
  if(pl.kind==='book') pl.books=b.books||[];
  else if(pl.kind==='seed') pl.notes=(b.notes||[]).map(n=>({...n, created:n.created||todayKey()}));
  else { pl.course=b.course||null; pl.trial=b.trial||null; pl.drawn=!pl.trial; }
  groveStore().plantings.push(pl); persist();
  logActivity('Planted a bequest left by '+(b.by||'someone else')+': "'+pl.title+'".');
  blip(523,.09); setTimeout(()=>blip(784,.12),100);
  state.ui='grove'; state.groveView={mode:'one',id:pl.id}; hideAllOv(); renderGrove(); showOv('groveOv');
}
if(typeof document!=='undefined' && document.getElementById('bequestFile')){
  document.getElementById('bequestFile').addEventListener('change', e=>{
    const f=e.target.files&&e.target.files[0]; if(!f) return;
    const r=new FileReader();
    r.onload=()=>{
      try{
        const b=JSON.parse(r.result);
        if(!b || !b.sandPavilionBequest){ alert("That file isn't a bequest — it should be a .json written by an Inheritance Hall."); return; }
        plantBequest(b);
      }catch(err){ alert("Couldn't read that file: "+err.message); }
    };
    r.readAsText(f);
    e.target.value='';
  });
}

function renderGrove(){
  const el=document.getElementById('grovePanel'); if(!el) return;
  const v=state.groveView||{mode:'hall'}, g=groveStore();
  const back=`<button class="xbtn" onclick="closeUI()">Esc ✕</button>`;

  if(v.mode==='one'){
    const pl=findPlanting(v.id); if(!pl){ state.groveView={mode:'hall'}; return renderGrove(); }
    const stage=plantStage(pl);
    if(!requirementMet(pl)){
      el.innerHTML=`${back}
        <div class="row" style="justify-content:space-between;margin-bottom:8px">
          <button class="btn ghost" onclick="backToHallRecord()">← The record stone</button>
          <button class="btn ghost" style="border-color:var(--danger);color:var(--danger-soft)" onclick="digUpPlanting('${pl.id}')">⛏ Dig it up anyway</button>
        </div>
        <h2>⌛ ${esc(pl.title)}</h2>
        <div class="meta">Still under the sand. Something is here — you can feel the shape of it — and it will not come up yet.</div>
        ${pl.message?`<div class="card" style="cursor:default;margin-top:10px"><div class="s">Scratched on the part you can reach</div>
          <div style="white-space:pre-wrap">${esc(pl.message)}</div></div>`:''}
        <div class="card" style="cursor:default;margin-top:10px">
          <div class="t">It surfaces when you ${esc(requirementText(pl))}.</div>
          <div class="s">Left by ${esc((pl.origin&&pl.origin.by)||pl.by||'someone before you')}</div>
        </div>
        <div class="meta" style="margin-top:10px">This is a condition, not a riddle — it says plainly what it wants, because the point is the work and not the guessing. Nothing is bought, scored, or unlocked with anything but doing it. Come back when it's true.</div>
        <div class="meta" style="margin-top:8px">You can always dig it up and lose it, if you'd rather not be told what to do. It's your ground.</div>`;
      return;
    }
    let body='';
    if(pl.kind==='book'){
      body=`<h3>The collection · ${(pl.books||[]).length} book${(pl.books||[]).length===1?'':'s'}</h3>
        ${(pl.books||[]).map(b=>`<div class="card" style="cursor:default"><div class="t">📖 ${esc(b.title)}</div>
          <div class="s">${esc(b.license||'license unrecorded')}${b.tradition?' · '+esc(b.tradition):''}${b.text?' · full text carried':(b.textOmitted?' · card only — the text stays with its source':'')}</div></div>`).join('')}`;
    } else if(pl.kind==='seed'){
      body=`<div class="meta">This seed was planted ${esc(pl.planted)} and is <b>${STAGE_WORD[stage]}</b>.
        ${stage<3?`It opens on its own, on real days — nothing here can be hurried.`:(pl.harvested?'It has already given its seeds.':'It is carrying seeds of its own.')}</div>
        <h3 style="margin-top:12px">What it holds · ${(pl.notes||[]).length} note${(pl.notes||[]).length===1?'':'s'}</h3>
        ${stage<3 ? '<p class="meta">Closed until it blooms. Whoever planted it meant for it to be waited on.</p>'
          : (pl.notes||[]).map(n=>`<div class="card" style="cursor:default"><div class="t">🌱 ${esc(n.title||'Untitled note')}</div>
              <div style="white-space:pre-wrap;margin-top:4px">${esc(noteBody(n))}</div></div>`).join('')}
        ${stage>=3&&!pl.harvested?`<div class="row" style="margin-top:10px"><button class="btn" onclick="gatherSeeds('${pl.id}')">🌾 Gather its seeds</button></div>
          <div class="meta">Two seeds for your pouch. Plant them anywhere in this ground, or keep them — each one carries the same gift onward.</div>`:''}`;
    } else {
      const locked=pl.trial&&!pl.drawn;
      body=`<h3>${locked?'⚔ Set in the stone':'⚔ Drawn'} · ${(pl.course&&pl.course.steps||[]).length} steps</h3>
        ${locked?`<div class="meta">A trial stands on this one. Only whoever can answer it draws the sword.</div>
          <div class="card" style="cursor:default;margin-top:8px"><div class="t">${esc(pl.trial.question)}</div>
            ${pl.trial.hint?`<div class="s">Hint: ${esc(pl.trial.hint)}</div>`:''}</div>
          <div class="row" style="margin-top:8px;gap:6px">
            <input type="text" id="gvTrialInput" placeholder="your answer" style="flex:1" onkeydown="if(event.key==='Enter'){event.preventDefault();attemptTrial('${pl.id}');}">
            <button class="btn" onclick="attemptTrial('${pl.id}')">Take hold</button>
          </div><div class="meta" id="gvTrialOut" style="margin-top:6px"></div>`
        : `${pl.course&&pl.course.why?`<div class="meta">${esc(pl.course.why)}</div>`:''}
           <ol style="margin:8px 0 0 18px">${(pl.course&&pl.course.steps||[]).map(s=>`<li style="margin:3px 0">${esc(s)}</li>`).join('')}</ol>`}`;
    }
    const canTake=(pl.kind!=='sword'||pl.drawn)&&(pl.kind!=='seed'||stage>=3);
    const takeLabel=pl.kind==='book'?'📚 Take the collection to Your Shelf'
      :pl.kind==='seed'?'🗒 Copy the notes into Your Notes':'🎓 Put the course on my Course Board';
    el.innerHTML=`${back}
      <div class="row" style="justify-content:space-between;margin-bottom:8px">
        <button class="btn ghost" onclick="backToHallRecord()">← The record stone</button>
        <button class="btn ghost" style="border-color:var(--danger);color:var(--danger-soft)" onclick="digUpPlanting('${pl.id}')">⛏ Dig it up</button>
      </div>
      <h2>${pl.kind==='sword'?'⚔':pl.kind==='book'?'📖':'🌱'} ${esc(pl.title)}</h2>
      <div class="meta">${pl.received
        ? `Planted here ${esc(pl.planted)} · <span class="badge lic">left by ${esc((pl.origin&&pl.origin.by)||pl.by||'someone before you')}</span>${pl.origin&&pl.origin.date?`, originally ${esc(pl.origin.date)}`:''}`
        : `Planted ${esc(pl.planted)} by ${plantedByLabel(pl)}`}</div>
      ${pl.message?`<div class="card" style="cursor:default;margin-top:10px"><div class="s">A word to whoever finds this</div>
        <div style="white-space:pre-wrap">${esc(pl.message)}</div></div>`:''}
      <div style="margin-top:12px">${body}</div>
      ${canTake?`<div class="row" style="margin-top:14px"><button class="btn" onclick="takePlanting('${pl.id}')">${takeLabel}</button></div>
        <div class="meta" id="gvTakeOut" style="margin-top:6px">${pl.taken?'Taken once already — taking it again simply copies it to you a second time. What is in the ground stays in the ground.':''}</div>`:''}
      <h3 style="margin-top:18px">Give this away</h3>
      <div class="meta">Write it out as a <b>bequest file</b> — one .json you can hand to anyone. They plant it in their own Hall and find exactly this.</div>
      <div class="row" style="margin-top:8px;gap:6px">
        <button class="btn ghost" onclick="previewBequest('${pl.id}')">👁 What would leave?</button>
        <button class="btn" onclick="giveBequest('${pl.id}')">⤓ Write the bequest</button>
      </div>
      <div id="gvGiveOut"></div>`;
    return;
  }

  if(v.mode==='plant'){
    const seeds=g.seeds||[];
    el.innerHTML=`${back}
      <h2>Open ground</h2>
      <div class="meta">Nothing has been planted here. What do you want to leave — for yourself later, or for whoever comes after you?</div>
      <div class="card" onclick="choosePlantKind('book')"><div class="t">📖 A book on a stone</div>
        <div class="s">A collection you curated off your own shelves, with a word about why these ones.</div></div>
      <div class="card" onclick="choosePlantKind('seed')"><div class="t">🌱 A seed</div>
        <div class="s">Your own notes, put in the ground. It grows over real days, blooms, and then gives seeds of its own.</div></div>
      <div class="card" onclick="choosePlantKind('sword')"><div class="t">⚔ A sword in a stone</div>
        <div class="s">A course, set behind a trial — a question only someone who has done the work can answer.</div></div>
      ${seeds.length?`<h3 style="margin-top:16px">Seeds in your pouch · ${seeds.length}</h3>
        <div class="meta">Gathered from a bloom. Each carries the same gift onward.</div>
        ${seeds.map(s=>`<div class="card" onclick="plantSeedFromPouch('${s.id}')"><div class="t">🌾 ${esc(s.title)}</div>
          <div class="s">plant it here${s.by?' · first left by '+esc(s.by):''}</div></div>`).join('')}`:''}`;
    return;
  }

  if(v.mode==='compose'){
    const kind=v.kind;
    const head=kind==='book'?'📖 A book on a stone':kind==='seed'?'🌱 A seed':'⚔ A sword in a stone';
    const docs=Store.allDocs().slice().sort((a,b)=>String(a.title).localeCompare(String(b.title)));
    const notes=(data.notes||[]);
    let picker='';
    if(kind==='book'){
      picker=`<h3 style="margin-top:14px">Which books?</h3>
        <div class="meta">Everything on your shelves, yours and the Library's. A book whose license doesn't allow the text to travel still goes as a card — title, source, and where to get it.</div>
        <div style="max-height:230px;overflow:auto;margin-top:8px">
        ${docs.length?docs.map(d=>`<label class="card" style="cursor:pointer;display:block">
            <input type="checkbox" class="gvBook" value="${esc(d.slug)}"> <b>${esc(d.title)}</b>
            <div class="s" style="margin-left:22px">${esc(d.tradition||'')} · ${esc(d.license||'license unrecorded')}${redistributable(d.license)?'':' · card only'}</div>
          </label>`).join(''):'<p class="meta">No books on your shelves yet — add some at the Caravan Desk first.</p>'}</div>`;
    } else if(kind==='seed'){
      picker=`<h3 style="margin-top:14px">Which of your notes?</h3>
        <div class="meta">A copy travels; your own note stays exactly where it is.</div>
        <div style="max-height:230px;overflow:auto;margin-top:8px">
        ${notes.length?notes.map(n=>`<label class="card" style="cursor:pointer;display:block">
            <input type="checkbox" class="gvNote" value="${esc(n.id)}"> <b>${esc(n.title||'Untitled note')}</b>
            <div class="s" style="margin-left:22px">${esc((noteBody(n)||'').slice(0,90))}${noteBody(n).length>90?'…':''}</div>
          </label>`).join(''):'<p class="meta">No notes yet — write one in 🗒 Your Notes and come back.</p>'}</div>`;
    } else {
      picker=`<h3 style="margin-top:14px">The course</h3>
        <input type="text" id="gvWhy" placeholder="why it's worth walking (optional)">
        <textarea id="gvSteps" rows="6" placeholder="One step per line.&#10;Read the first three chapters.&#10;Write your own summary before reading anyone else's.&#10;Try it on something real."></textarea>
        <h3 style="margin-top:14px">The trial <span class="badge lic">optional</span></h3>
        <div class="meta">Leave this blank and the sword stands loose — anyone can take it. Set a question and only someone who can answer it draws the course out. Match is forgiving: case and punctuation don't matter.</div>
        <input type="text" id="gvTrialQ" placeholder="the question, e.g. “What does the third step actually cost you?”">
        <input type="text" id="gvTrialA" placeholder="the answer that draws it">
        <input type="text" id="gvTrialH" placeholder="a hint, if you want to be kind (optional)">`;
    }
    const readDocs=Object.keys(data.read||{}).map(s=>Store.getDoc(s)).filter(Boolean);
    el.innerHTML=`${back}
      <div class="row" style="margin-bottom:8px"><button class="btn ghost" onclick="backToPlantChoice()">← Something else</button></div>
      <h2>${head}</h2>
      <input type="text" id="gvTitle" placeholder="what to call it — this is what shows above it in the sand" style="font-size:15px">
      <textarea id="gvNote" rows="3" placeholder="A word to whoever finds this (optional)"></textarea>
      <input type="text" id="gvBy" placeholder="signed — your name, or leave it unsigned" value="${esc(g.signedAs||'')}">
      <div class="row" style="margin-top:8px;gap:6px">
        <button class="btn ghost" onclick="draftPlantingWithAI()">✨ Have your local AI draft this</button>
      </div>
      <div class="meta" id="gvAiOut" style="margin-top:6px">${isAIActive()?'It reads your own shelves and notes and suggests a draft — a suggestion, never planted for you. You edit and plant it yourself.':'Connect a local AI (⚙ Manage AI connections) and it can draft one from your own shelves. Everything here works fine without it.'}</div>
      ${picker}
      <h3 style="margin-top:16px">Bury it? <span class="badge lic">optional</span></h3>
      <div class="meta">Left plain, it stands in the open for anyone. Buried, it shows only as a marker until whoever finds it has actually done something first — and it always says plainly what that is.</div>
      <select id="gvHidden" onchange="groveHiddenChanged()">
        <option value="none">Leave it in the open</option>
        <option value="read">Buried until they've read a book of your choosing</option>
        <option value="days">Buried until a number of days have passed</option>
        <option value="planted">Buried until they've planted something of their own</option>
        <option value="books">Buried until they've brought their own books into the Library</option>
      </select>
      <div id="gvHiddenOpts" style="display:none;margin-top:8px">
        <select id="gvHiddenSlug" style="display:none">
          ${readDocs.length?readDocs.map(d=>`<option value="${esc(d.slug)}">${esc(d.title)}</option>`).join('')
            :docs.slice(0,60).map(d=>`<option value="${esc(d.slug)}">${esc(d.title)}</option>`).join('')}
        </select>
        <input type="number" id="gvHiddenNum" min="1" max="365" value="7" style="display:none" placeholder="how many">
      </div>
      <div class="row" style="margin-top:14px"><button class="btn" onclick="createPlanting()">🏜 Put it in the ground</button></div>
      <div class="meta" id="gvMsgLine" style="margin-top:6px"></div>`;
    setTimeout(()=>document.getElementById('gvTitle')?.focus(),30);
    return;
  }

  // the record stone — the whole ground at a glance
  const list=g.plantings.filter(p=>(p.scene||'grove')==='grove');
  const mine=list.filter(p=>!p.received), left=list.filter(p=>p.received);
  const card=p=>{ const stage=plantStage(p), buried=!requirementMet(p);
    const what=buried?('buried — surfaces when you '+requirementText(p))
      :p.kind==='book'?`${(p.books||[]).length} book(s)`:p.kind==='seed'?STAGE_WORD[stage]:(p.trial&&!p.drawn?'set behind a trial':'a course, standing open');
    return `<div class="card" onclick="openPlanting('${p.id}')">
      <div class="t">${buried?'⌛':p.kind==='sword'?'⚔':p.kind==='book'?'📖':'🌱'} ${esc(p.title)}</div>
      <div class="s">${esc(what)} · planted ${esc(p.planted)} by ${p.by?esc(p.by):(p.received?'someone else':'you')}${p.taken?' · taken':''}</div>
    </div>`; };
  const gifts=GATE_BEQUESTS.filter(gb=>!g.plantings.some(p=>p.giftId===gb.id));
  el.innerHTML=`${back}
    <h2>🗿 The Record Stone ${visBadge('private')}</h2>
    <div class="card" style="cursor:default;border-color:#8e8778">
      <div class="s">Cut into the face of it, worn nearly smooth</div>
      <div style="white-space:pre-wrap;font-style:italic;margin-top:4px">“Stars, darkness, a lamp, a phantom, dew, a bubble,
a dream, a flash of lightning, and a cloud —
thus we should look upon the world.”</div>
      <div class="s" style="margin-top:6px">The Diamond Sutra, §32 · trans. F. Max Müller, 1894 · public domain</div>
    </div>
    <div class="meta" style="margin-top:8px">A star is on that list. Whoever cut it there was not being gentle about scale: the sun goes too, and the ground you are standing on, and this courtyard, and the wall around it. That is not despair — it is the reason the Pavilion's own charter reads <b>everything turns to sand, so give it away first</b>. Nothing here can be kept. It can only be handed on.</div>
    <div class="meta" style="margin-top:10px">This court ships bare and stays bare until someone puts something in it. Nothing standing here was placed by the people who built the Pavilion — every one of them was planted by a visitor, or handed over by another person and planted sight-unseen.
      <br><br>Face any bare patch of sand and press <b>E</b> to plant.</div>
    ${gifts.length?`<h3 style="margin-top:16px">Left at the gate · ${gifts.length}</h3>
      <div class="meta">Not planted — offered. Bundled with the Pavilion so your first act here can be receiving something instead of staring at empty sand. Take one into the ground when you want it; dig it up again whenever.</div>
      ${gifts.map(gb=>`<div class="card" onclick="plantGift('${gb.id}')">
        <div class="t">${gb.kind==='sword'?'⚔':gb.kind==='book'?'📖':'🌱'} ${esc(gb.title)}${gb.hidden?' <span class="badge">buried</span>':''}</div>
        <div class="s">${gb.kind==='book'?`${(gb.books||[]).length} books`:gb.kind==='seed'?`${(gb.notes||[]).length} notes, sealed until it blooms`:'a course behind a trial'} · left by ${esc(gb.by||'the Pavilion')} — plant it</div>
      </div>`).join('')}`:''}
    ${list.length?'':'<p class="meta" style="margin-top:12px"><b>Nothing is in the ground yet.</b> That is not a bug and not an empty state waiting to be fixed — it is the honest condition of a place whose entire contents are gifts. Plant the first thing.</p>'}
    ${mine.length?`<h3 style="margin-top:14px">What you left · ${mine.length}</h3>${mine.map(card).join('')}`:''}
    ${left.length?`<h3 style="margin-top:16px">What others left before · ${left.length}</h3>${left.map(card).join('')}`:''}
    ${(g.seeds||[]).length?`<h3 style="margin-top:16px">Seeds in your pouch · ${g.seeds.length}</h3>
      <div class="meta">Gathered from things that bloomed. Face open ground and press E to plant one.</div>
      ${g.seeds.map(s=>`<div class="card" style="cursor:default"><div class="t">🌾 ${esc(s.title)}</div><div class="s">${(s.notes||[]).length} note(s) carried${s.by?' · first left by '+esc(s.by):''}</div></div>`).join('')}`:''}
    <h3 style="margin-top:18px">Something you were given</h3>
    <div class="meta">A bequest arrives as a single <b>.json</b> file — handed to you directly, not fetched from anywhere. Plant it and see what's inside.</div>
    <div class="row" style="margin-top:8px"><button class="btn" onclick="triggerImportBequest()">⤒ Plant a bequest someone gave you</button></div>`;
}

/* The Log -> the day (SELF-LEARNING-JOURNAL-PLAN.md — closing the capture ->
   organize seam). A captured entry MIGRATES onto today's bullet-journal page:
   a to-do or to-learn becomes a • task, anything else a — note. It LEAVES the
   Log when it does (true bullet-journal migration), so the inbox stays clean
   and never becomes a dumping ground. */
export function sendLogEntryToToday(id){
  const idx=data.ideas.findIndex(x=>x.id===id); if(idx<0) return;
  const entry=data.ideas[idx];
  const bujoKind=(entry.kind==='todo'||entry.kind==='learn') ? 'task' : 'note';
  const day=plannerDay(); if(!day.log) day.log=[];
  day.log.push({ id:Date.now(), text:entry.text, kind:bujoKind, done:false });
  data.ideas.splice(idx,1); // migrate: it moves to the day, it doesn't duplicate
  persist(); logActivity('Moved a Log capture to today\'s page.'); blip(784,.08); setHud();
  renderIdeaJar();
}

/* ----- Steward Review Queue — the real "pull request" workflow, built
   single-steward-first since only one user exists today. Anything
   headed for the shared Library — a submitted Archive Desk piece, or a
   batch pasted from the Caravan connector — lands here `pending`,
   never straight on a shelf. Approving doesn't write to seed.js by
   itself: it marks the item ready, and a separate "generate batch"
   step produces every approved item as one combined snippet, so the
   Library grows in occasional deliberate batches, not a commit per
   text. Once Phase 3 and more stewards exist, this becomes a real
   table and "approve" can write to it directly — same shape, only the
   underneath changes. */
/* ----- BOOK-DRAG-DROP-PLAN.md, Path A — client-side only, .txt first.
   No filesystem write, no shelling out to library-draft.py (a browser
   genuinely can't do either, the same wall the Caravan connectors
   already document) — reads the dropped file directly, runs the same
   Title:/Author: header regex library-draft.py already uses, and
   pre-fills the existing manual-entry form instead of a new pipeline.
   An unrecognized source routes to Research Desk notes, never the
   shared queue, exactly as asked for. */
const DROP_SOURCES = {
  gutenberg: { label:'Project Gutenberg', license:'Public Domain (Project Gutenberg)' },
  standardebooks: { label:'Standard Ebooks', license:'Public Domain / CC0 (Standard Ebooks)' },
  suttacentral: { label:'SuttaCentral', license:'CC0 1.0' },
  arxiv: { label:'arXiv', license:"Check the paper's own license — arXiv hosting isn't one" },
  openalex: { label:'OpenAlex (via publisher)', license:"Check the paper's own license — varies by publisher" },
  archiveorg: { label:'Internet Archive', license:"Check the item's own rights statement — varies" },
  // added 2026-07-27 — the open-access world, so a dropped paper's licence is
  // filled in from where it came from rather than typed from memory
  wikisource: { label:'Wikisource', license:'Public Domain / CC BY-SA (check the page)' },
  openlibrary: { label:'Open Library', license:"Check the item's own rights statement — varies" },
  doaj: { label:'DOAJ (open-access journal)', license:"Open access — check the article's own CC licence" },
  core: { label:'CORE (open-access aggregator)', license:"Check the paper's own licence — varies by source" },
  pmc: { label:'PubMed Central (OA subset)', license:"Open access — check the article's own licence" },
  zenodo: { label:'Zenodo', license:"Check the record's own licence — always stated" },
  biorxiv: { label:'bioRxiv / medRxiv (preprint)', license:'Preprint — not peer reviewed; check its licence' },
  openstax: { label:'OpenStax', license:'CC BY 4.0 (OpenStax)' },
  globalgrey: { label:'Global Grey', license:'Public Domain (Global Grey)' },
  librivox: { label:'LibriVox', license:'Public Domain (LibriVox)' },
};
const DROP_TITLE_RE=/^Title:\s*(.+)$/m;
const DROP_AUTHOR_RE=/^Author:\s*(.+)$/m;
function unrecognizedDropProject(){
  let p=data.workshop.research.find(x=>x.title==='Caravan Drops');
  if(!p){
    p={id:'res-dropzone', title:'Caravan Drops',
      goal:'Texts dropped from an unrecognized source — kept here, never shelved automatically.',
      notes:[], created:todayKey()};
    data.workshop.research.unshift(p);
  }
  return p;
}
/* Shared by both drop paths (.txt and .epub) — a detected book fills the
   review form for a listed source, or routes to your own notes for an
   unrecognized one. Nothing is ever auto-shelved; this only pre-fills. */
function fillDropForm(title, author, body, msg){
  const sourceKey=document.getElementById('rmDropSource')?.value;
  const known=DROP_SOURCES[sourceKey];
  const size=body.length.toLocaleString();
  if(known){
    document.getElementById('rmTitle').value=title;
    document.getElementById('rmBody').value=body;
    document.getElementById('rmLicense').value=known.license;
    if(author){ const a=document.getElementById('rmAuthor'); if(a) a.value=author; }
    document.getElementById('rmSource').value=known.label;
    msg.textContent='Detected "'+title+'"'+(author?' by '+author:'')+' ('+size+' characters). '
      +'License pre-filled for '+known.label+' — review everything below before adding to the '
      +'queue, nothing here is confirmed automatically.';
  } else {
    // Unknown / unlisted source = your own copy for your own shelf. Fill the
    // form so you can add it to Your Shelf (personal) — a personal book needs no
    // license or source; that's YOUR business, not the commons'. (It just can't
    // go to the shared, certified queue without a real license.) The old
    // behavior filed unknown drops away in a Research Desk note, which blocked
    // the legitimate "add my own book" case — so it fills the form now instead.
    document.getElementById('rmTitle').value=title;
    document.getElementById('rmBody').value=body;
    if(author){ const a=document.getElementById('rmAuthor'); if(a && !a.value) a.value=author; }
    msg.textContent='Detected "'+title+'"'+(author?' by '+author:'')+' ('+size+' characters). '
      +'No listed source — so this is a personal copy: pick a shelf and press "📚 Add to my Library '
      +'now" to put it on Your Shelf. No license or source needed for your own shelf. (Only the shared '
      +'review queue requires a certified license.)';
  }
}
/* One file fills the form (so you can name its shelf, add a license if you're
   sharing it, and eyeball the text). MANY files at once skip straight to Your
   Shelf as personal copies on the chosen shelf — the bulk path the user asked
   for. Both drag-drop (handleBookDrop) and the file picker (handleBookFilePick)
   funnel through intakeBookFiles so the two behave identically. */
/* ================================================================
   DROP A FILE ANYWHERE. Built 2026-08-02 to make true a promise the
   documentation had been making for weeks.

   MANUAL.md and the release notes both said a book could be "dropped
   ANYWHERE on the Pavilion — you do not need to be on this screen, or
   in the Library, or anywhere in particular." There was no
   document-level drop handler at all. The only target was a zone
   inside the Caravan Desk, which is a station on the Workshop's ground
   floor — so the most-promoted way to add a book worked in exactly one
   place, three rooms from the front door, and failed in SILENCE
   everywhere else. A tester drops their first book, nothing happens,
   and they conclude the app ignored them. Nobody reports that.

   Two details that matter more than the wiring:
     - the drag must SHOW something, or the gesture stays undiscoverable
       even once it works;
     - only file drags are intercepted. Dragging selected text inside a
       textarea carries 'text/plain', not 'Files', and must keep working
       normally — hijacking that would trade one silent bug for another.
   ================================================================ */
function dragHasFiles(e){
  const t=e.dataTransfer && e.dataTransfer.types;
  return !!t && Array.prototype.indexOf.call(t,'Files')>=0;
}
let dropDepth=0;
function showDropVeil(on){
  const v=document.getElementById('dropVeil'); if(!v) return;
  v.classList.toggle('on', !!on);
}
export function initGlobalDrop(){
  document.addEventListener('dragenter', e=>{
    if(!dragHasFiles(e)) return;
    e.preventDefault(); dropDepth++; showDropVeil(true);
  });
  document.addEventListener('dragover', e=>{
    if(!dragHasFiles(e)) return;
    e.preventDefault(); e.dataTransfer.dropEffect='copy';   // without this the browser opens the file
  });
  document.addEventListener('dragleave', e=>{
    if(!dragHasFiles(e)) return;
    dropDepth=Math.max(0,dropDepth-1); if(!dropDepth) showDropVeil(false);
  });
  document.addEventListener('drop', e=>{
    if(!dragHasFiles(e)) return;
    e.preventDefault(); dropDepth=0; showDropVeil(false);
    acceptDropAnywhere(e.dataTransfer.files);
  });
}
/* What a drop on the open world should actually DO.

   Not open a panel. The documentation's promise is "drop it anywhere and it
   lands on your shelf", so that is what happens: the book is shelved, unfiled,
   and a small card says so and gets out of the way. Opening the Caravan Desk
   because someone dropped a file would be answering a gesture with a chore.

   bulkShelveDroppedFiles() already does exactly this and only needs somewhere
   to print — it reads #rmTradition for the shelf and falls back to 'Personal'
   when there is no panel, which puts a dropped book in the "still to sort"
   pile. That is the right place for something that arrived in one motion.

   A bundle is the exception and brings its own panel, because taking fifty
   books at once is a decision, not a gesture. */
async function acceptDropAnywhere(fileList){
  const files=[...(fileList||[])];
  if(!files.length) return;
  if(files.length===1 && /\.json$/i.test(files[0].name)) return openDroppedBundle(files[0], null);
  const toast=document.getElementById('dropToast');
  if(!toast) return intakeBookFiles(fileList, document.getElementById('dropMsg'));
  toast.classList.add('on');
  toast.innerHTML='Reading…';
  clearTimeout(dropToastTimer);
  const openOn=(state.ui==='reader') ? state.currentDoc : null;
  await bulkShelveDroppedFiles(files, toast);
  if(state.ui==='mylib') renderMyLibrary();       // if the shelf is open, show it arrive
  /* THE PAGE HAS TO ACTUALLY BECOME THE BOOK — but you have to say so.

     The original problem was real and this is not a retreat from it: a
     summary-only entry says "drag the file onto this window … and this page
     becomes the real book", and measured 2026-08-03 it did not. The file
     shelved as a separate personal copy, the page went on claiming it was not
     the book, and the visitor owned two Tao Te Chings with the good one
     unreachable from where they stood.

     WHAT CHANGED, 2026-08-09: it used to call reopenIfReplaced() and turn your
     page for you. The drop IS a press — it means "take this" — and shelving on
     it is right. It does not mean "and navigate me". You could be reading one
     book and filing another; the page moving under you is the interface
     deciding what you meant. So the offer goes in the toast that is already on
     screen, and the answer is one click away instead of already made. */
  const twin = openOn ? fullTextTwinOf(openOn) : null;
  if(twin){
    toast.innerHTML += `<div style="margin-top:8px">Your full copy of <b>${esc(twin.title)}</b> is shelved.
      The page behind this is still the summary.</div>
      <div class="row" style="margin-top:6px;gap:6px">
        <button class="btn" style="font-size:11px;padding:3px 10px" onclick="openReplacedCopy('${jsq(twin.slug)}')">📖 Open your copy</button>
        <button class="btn ghost" style="font-size:11px;padding:3px 10px" onclick="dismissDropToast()">Stay here</button>
      </div>`;
    return;   // an offer that vanishes after nine seconds is a dead end
  }
  dropToastTimer=setTimeout(()=>toast.classList.remove('on'), 9000);
}
/* Did a personal copy of the book we are looking at just arrive? Matched on
   the normalised title, because the slugs differ by construction — a personal
   copy is `personal-<slug>` and can never collide with a certified one. */
function fullTextTwinOf(slug){
  const d=slug && Store.getDoc(slug);
  if(!d || d.doc.fullText) return null;             // already the real thing
  const want=String(d.title||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  if(want.length<4) return null;
  return Store.allDocs().find(x=>x.personal && x.doc.fullText && x.slug!==slug
    && String(x.title||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()===want) || null;
}
/* The same move reopenIfReplaced() used to make on its own — now behind the
   toast's button, so it happens because someone asked for it. */
export function openReplacedCopy(slug){
  dismissDropToast();
  openReader(slug);
  const msg=document.getElementById('rdSpokenNote');
  if(msg) msg.textContent='✓ This is your copy now — the whole text, not the summary.';
}
let dropToastTimer=null;
export function dismissDropToast(){
  clearTimeout(dropToastTimer);
  document.getElementById('dropToast')?.classList.remove('on');
}
export function handleBookDrop(event){
  event.preventDefault();
  event.stopPropagation();   // the document-level handler must not fire too, or the file imports twice
  document.getElementById('dropZone')?.classList.remove('over');
  intakeBookFiles(event.dataTransfer.files, document.getElementById('dropMsg'));
}
export function handleBookFilePick(event){
  intakeBookFiles(event.target.files, document.getElementById('dropMsg'));
  event.target.value=''; // let the same files be re-picked if needed
}
async function intakeBookFiles(fileList, msg){
  const files=[...(fileList||[])];
  if(!files.length) return;
  /* A bundle is checked FIRST and needs no status element, because it opens its
     own panel to report into. The .txt/.epub paths write into #dropMsg and so
     genuinely require it; a bundle does not, and making it wait for one would
     tie it to whichever panel happens to be open. */
  if(files.length===1 && /\.json$/i.test(files[0].name)) return openDroppedBundle(files[0], msg);
  if(!msg) return;
  if(files.length>1) return bulkShelveDroppedFiles(files, msg);
  return fillFromSingleFile(files[0], msg);
}

/* ================================================================
   [BUNDLES] — a set of books with their provenance, in one file.
   Built 2026-08-02. See plans/BOOK-BUNDLES-AND-THE-POOL.md.

   Nothing is added until you have seen the manifest and pressed the
   button. That is the same discipline the Commons Table already uses,
   and it matters more here because a bundle can carry fifty books at
   once: a silent bulk import is how a shelf you curated becomes a
   shelf you inherited.

   Every book carries a sha256, checked on arrival. A book already on
   your shelf with the same hash is skipped rather than duplicated —
   so re-importing the same packet twice does nothing, which is the
   behaviour anyone would expect and almost no importer has.
   ================================================================ */
async function sha256Hex(text){
  const buf=new TextEncoder().encode(text);
  const d=await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function openDroppedBundle(file, msg){
  const say=t=>{ if(msg) msg.textContent=t; };
  let b;
  try{ b=JSON.parse(await file.text()); }
  catch(e){ say("That .json isn't readable as a bundle."); return; }
  if(!b || !b.sandPavilionBundle || !Array.isArray(b.books)){
    say("That .json isn't a Pavilion bundle. (A save file? Use Import Save in the pause menu instead.)");
    return;
  }
  say('');
  const mine=new Set(personalBooks().map(x=>x.slug));
  const haveHash=new Set();
  for(const x of personalBooks()){
    const t=x.doc && x.doc.fullText && x.doc.fullText.text;
    if(t) haveHash.add(await sha256Hex(t));
  }
  const rows=[];
  for(const bk of (b.books||[])){
    const real=bk.text ? await sha256Hex(bk.text) : null;
    const intact = !bk.sha256 || !real || real===bk.sha256;
    rows.push({ ...bk, intact, already: mine.has(bk.slug) || (real && haveHash.has(real)) });
  }
  state.bundleView={ bundle:b, rows };
  state.ui='bundle'; hideAllOv(); renderBundle(); showOv('bundleOv');
}
function renderBundle(){
  const v=state.bundleView; if(!v) return;
  const b=v.bundle, rows=v.rows;
  const fresh=rows.filter(r=>!r.already && r.intact);
  const dupes=rows.filter(r=>r.already);
  const broken=rows.filter(r=>!r.intact);
  const kb=n=>n>1048576?(n/1048576).toFixed(1)+' MB':Math.round(n/1024)+' KB';
  document.getElementById('bundlePanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>📦 ${esc(b.title||'A bundle of books')}</h2>
    <div class="meta">${b.by?`From <b>${esc(b.by)}</b>. `:''}${b.made?`Made ${esc(b.made)}. `:''}
      ${b.private?'<b style="color:#e0a43c">Marked a private archive</b> — whoever made it did not intend it to be handed on.':''}</div>
    ${b.message?`<div class="card" style="cursor:default;margin-top:10px"><div class="s" style="white-space:pre-wrap">${esc(b.message)}</div></div>`:''}
    <div class="meta" style="margin-top:12px"><b>Nothing is added until you press the button.</b>
      ${fresh.length} new, ${dupes.length} already on your shelf${broken.length?`, ${broken.length} failed their checksum`:''}.</div>
    ${broken.length?`<div class="card" style="cursor:default;border-color:#c8574a;margin-top:8px">
      <div class="t" style="color:#c8574a">${broken.length} book${broken.length===1?'':'s'} did not match the hash recorded for ${broken.length===1?'it':'them'}</div>
      <div class="s" style="margin-top:5px">The text is not the text the bundle says it is — altered in transit, or the bundle was
        built wrong. These will not be added. ${broken.map(r=>esc(r.title)).join(', ')}</div></div>`:''}
    <div style="margin-top:10px">${rows.map(r=>`
      <div class="card" style="cursor:default${r.already?';opacity:.55':r.intact?'':';border-color:#c8574a'}">
        <div class="t">${r.already?'✓ ':''}${esc(r.title||r.slug)} ${r.bytes?`<span class="badge lic">${kb(r.bytes)}</span>`:''}</div>
        ${r.attribution?`<div class="s" style="margin-top:3px">${esc(r.attribution)}</div>`:''}
        <div class="s" style="margin-top:4px;opacity:.85">
          ${esc(r.license||'licence not stated')}${r.source_url?` · <span style="opacity:.8">${esc(r.source_url)}</span>`:''}</div>
        ${r.already?'<div class="s" style="margin-top:3px;color:#7fa36b">already on your shelf — will be skipped</div>':''}
      </div>`).join('')}</div>
    <div class="row" style="margin-top:14px">
      ${fresh.length?`<button class="btn" onclick="acceptBundle()">Add ${fresh.length} book${fresh.length===1?'':'s'} to my shelf</button>`:''}
      <button class="btn ghost" onclick="closeUI()">${fresh.length?'Not now':'Close'}</button>
    </div>`;
}
export function acceptBundle(){
  const v=state.bundleView; if(!v) return;
  const add=v.rows.filter(r=>!r.already && r.intact && r.text);
  if(!add.length) return;
  for(const r of add){
    let slug=r.slug||('bundle-'+Date.now());
    let n=1; while(personalBooks().some(x=>x.slug===slug)) slug=(r.slug||'book')+'-'+(++n);
    data.personalLibrary.unshift({
      slug, title:r.title||slug, tradition:r.tradition||'Personal', personal:true,
      license:r.license||'', source_url:r.source_url||'', attribution:r.attribution||'',
      added:todayKey(), category:'personal',
      // provenance travels with the book, permanently — so it can be honestly
      // re-shared, or correctly refused, by someone who was never here
      sharing:r.sharing||'', gathered:r.gathered||'',
      doc:{ summary:r.summary||'', sections:[], fullText:{ text:r.text } },
    });
  }
  persist();
  logActivity('Took '+add.length+' book'+(add.length===1?'':'s')+' from the bundle "'+(v.bundle.title||'untitled')+'".');
  blip(784,.09);
  state.bundleView=null; closeUI();
  openMyLibrary();
}
// Parse one .txt/.epub into {title, body, author}. Throws with a short reason so
// the bulk loop can record which files failed without stopping the rest.
async function parseBookFile(file){
  const name=file.name.toLowerCase();
  if(name.endsWith('.epub')){
    const res=await epubToText(file); // may throw (e.g. NO_DECOMPRESSION)
    if(!res.body || !res.body.trim()) throw new Error('no readable text (image-only?)');
    return { title:res.title||file.name.replace(/\.epub$/i,''), body:res.body, author:res.author||null };
  }
  if(name.endsWith('.txt')){
    const text=await file.text();
    const titleMatch=DROP_TITLE_RE.exec(text), authorMatch=DROP_AUTHOR_RE.exec(text);
    return { title:titleMatch?titleMatch[1].trim():file.name.replace(/\.txt$/i,''), body:text, author:authorMatch?authorMatch[1].trim():null };
  }
  throw new Error('not a .txt or .epub');
}
async function fillFromSingleFile(file, msg){
  const name=file.name.toLowerCase();
  if(name.endsWith('.epub')) msg.textContent='Unpacking the EPUB… a long book can take a few seconds.';
  else if(!name.endsWith('.txt')){
    msg.textContent='Drop a .txt or .epub file here. (For a PDF, convert it first with '
      +'tools/caravan/pdf-to-text.py, then drop the .txt.)';
    return;
  }
  let b;
  try{ b=await parseBookFile(file); }
  catch(err){
    const m=String(err&&err.message||'');
    msg.textContent = m.includes('NO_DECOMPRESSION')
      ? "This browser can't unpack an EPUB on its own. Use the desktop app, or convert it with "
        +"tools/caravan/epub-to-text.py and drop the resulting .txt here."
      : "Couldn't read that file ("+(m||'unknown error')+"). If it's an unusual EPUB, try "
        +"tools/caravan/epub-to-text.py, which prints a clearer reason.";
    return;
  }
  fillDropForm(b.title, b.author, b.body, msg);
}
/* Bulk add — many personal books in one drop/pick. Each lands on the shelf
   chosen in #rmTradition, marked 👤 as yours; personal copies need no license or
   source, which is exactly what makes a batch safe to do unattended. One bad file
   never stops the rest — failures are collected and reported at the end. */
async function bulkShelveDroppedFiles(files, msg){
  const supported=files.filter(f=>/\.(epub|txt)$/i.test(f.name));
  const skipped=files.length-supported.length;
  if(!supported.length){ msg.textContent='None of those are .txt or .epub, so there was nothing to add. (For PDFs, convert first with tools/caravan/pdf-to-text.py.)'; return; }
  /* A BATCH LANDS UNFILED. Changed 2026-08-03, reported by the steward:
     "it looks like i pulled too many books into the theravada shelf... when the
     source was verified and i dragged in over 100 books it made me choose a
     shelf."

     It did, and then it put ALL of them there — one dropdown applied to the
     whole drop. A hundred books are not one subject; that dropdown only ever
     made sense for one file. Worse, it was self-defeating: the librarian's job
     is explicitly THE UNFILED PILE (it will not second-guess books you placed
     on purpose), so filing a batch wrongly is precisely the state in which the
     AI sorter refuses to help. The pipeline created the mess and then disabled
     the tool for cleaning it up.

     GUIDED, NOT OVERRIDDEN — the standing rule here. If you deliberately pick a
     shelf, a batch still goes there; you may well be dropping twenty Theravada
     texts onto the Theravada shelf on purpose. What changes is that the picker
     DEFAULTS to unfiled, the form says "one subject at a time" in as many
     words, and a batch that does land on a named shelf offers one press to send
     it all back to the pile. The trap becomes escapable rather than forbidden.

     Unfiled is not a limbo here — it is the sorter's inbox, and Your Library
     opens straight to it whenever there is a pile. */
  const tradition=document.getElementById('rmTradition')?.value || 'Personal';
  const batch=supported.length>1;
  let added=0; const failed=[];
  for(let i=0;i<supported.length;i++){
    const f=supported[i];
    msg.textContent=`Adding ${i+1} of ${supported.length}${batch?'':' to the '+tradition+' shelf'}… (${added} shelved so far) — “${f.name}”`;
    try{
      const b=await parseBookFile(f);
      const res=await shelveAsPersonal({ title:b.title, body:b.body, author:b.author||'', license:'', source:'', tradition });
      if(res && res.ok) added++; else failed.push(f.name+(res&&res.reason?' — '+res.reason:''));
    }catch(e){ failed.push(f.name+' — '+String(e&&e.message||'unreadable')); }
  }
  logActivity('Bulk-added '+added+' personal book(s) to the '+tradition+' shelf.');
  const unfiled=tradition==='Personal';
  const parts=[unfiled
    ? `✓ Added <b>${added}</b> book${added===1?'':'s'} to Your Shelf, <b>unfiled</b> and marked 👤 as yours.`
    : `✓ Added <b>${added}</b> book${added===1?'':'s'} to Your Shelf on the <b>${esc(tradition)}</b> shelf, marked 👤 as yours.`];
  if(skipped) parts.push(`${skipped} file${skipped===1?'':'s'} skipped (not .txt/.epub).`);
  if(failed.length) parts.push(`Couldn't add ${failed.length}: ${esc(failed.slice(0,4).join('; '))}${failed.length>4?'…':''}.`);
  /* THE ESCAPE HATCH, offered at the only moment it is obvious something went
     wrong — right after a batch lands somewhere it may not belong. Without this
     the visitor has to know that "unfiled" is the sorter's inbox, that the
     librarian ignores filed books on purpose, and where the bulk move lives. */
  if(batch && !unfiled && added) parts.push(
    `<br>All ${added} went to <b>${esc(tradition)}</b>. Was this batch really all one subject? `
    + `<button class="btn ghost" style="font-size:11px;padding:2px 8px" onclick="unfileShelf('${esc(tradition)}')">`
    + `↩ Send them to the unsorted pile</button> — then the librarian can file them one by one.`);
  else if(unfiled) parts.push('They are in the unsorted pile, which is where the librarian works: <b>⚙ Sort my books</b>.');
  msg.innerHTML=parts.join(' ');
}
/* SEND A WHOLE SHELF BACK TO THE PILE — 2026-08-03, and the reason is worth
   keeping: a batch of 100+ books went onto one shelf in a single drop, and
   there was no way out. Un-filing them meant opening every book and changing
   its shelf by hand, one at a time, a hundred times — so in practice the only
   real option was to live with it.

   Nothing is deleted and nothing leaves Your Shelf. The books move to the
   unsorted pile, which is the librarian's inbox: the sorter deliberately will
   not second-guess books you have placed, so this is the switch that lets it
   help at all. Undo-able the same way it was done. */
export function unfileShelf(name){
  const books=personalBooks().filter(b=>shelfOf(b)===name);
  if(!books.length) return;
  if(!window.confirm(`Send all ${books.length} book(s) from “${name}” back to the unsorted pile?\n\n`
    +`Nothing is deleted — they stay on Your Shelf, just unfiled, so the librarian can sort them one by one. `
    +`You can re-file any of them at any time.`)) return;
  const before=books.map(b=>({slug:b.slug, shelf:shelfOf(b)}));
  books.forEach(b=>{ b.tradition='Personal'; });
  state.lastFiling={ kind:'unfile', from:name, moves:before };   // the existing undo path
  persist();
  logActivity('Sent '+books.length+' book(s) from "'+name+'" back to the unsorted pile.');
  blip(620,.08); setTimeout(()=>blip(760,.08),90);
  dismissDropToast();
  state.ui='mylib'; hideAllOv(); state.myLibView={ q:'', sel:{}, show:'unfiled' }; renderMyLibrary(); showOv('myLibOv');
}
/* ---- BOOKS THAT ARE NOT DIVIDED YET ----------------------------------

   The first thing built on the chapter tables, which until 2026-08-07 were
   in the schema and written by nothing. It answers the one question plain JS
   genuinely cannot: which of my books have no chapters — WITHOUT opening all
   of them, which on a 296-book shelf means paginating 160 MB of text.

   IT ONLY KNOWS BOOKS YOU HAVE OPENED, and it says so in the first line
   rather than implying it swept the shelf. The steward, on that being fine:

     "one step at a time is fine lets a user feel like he is contributing."

   So there is NO "scan everything" button, deliberately. A count that climbs
   because you opened a book and named its divisions is yours in a way a bulk
   sweep never is — the same reason the seed shelf is small and carrying is
   manual. Every row here is one press to the book itself. */
export async function openNeedsChapters(){
  state.ui='chapters'; hideAllOv(); showOv('chaptersOv');
  document.getElementById('chaptersPanel').innerHTML =
    '<button class="xbtn" onclick="closeUI()">Esc ✕</button><h2>Books not divided yet</h2>'
    + '<div class="meta">Looking…</div>';
  const [rows, cov] = await Promise.all([
    Store.dbQuery('needsChapters', [200]),
    Store.dbQuery('chapterCoverage', []),
  ]);
  renderNeedsChapters(rows, cov && cov[0]);
}
function renderNeedsChapters(rows, cov){
  const el=document.getElementById('chaptersPanel'); if(!el) return;
  /* NO DATABASE IS A REAL ANSWER, not an empty list. A browser tab has none,
     and saying "0 books need chapters" there would be the confident wrong
     answer this whole feature was rebuilt to avoid. */
  if(rows===null){
    el.innerHTML = `<button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>Books not divided yet</h2>
      <div class="meta">This needs the desktop app's own index, and a browser tab has none.
        Everything else about your books works here — this one question is the exception.</div>`;
    return;
  }
  const list=rows||[];
  const scanned=cov?Number(cov.books_scanned):0, divided=cov?Number(cov.books_divided):0;
  const byHand=cov?Number(cov.marks_by_hand):0;
  const HOW={ toc:'from its contents page', headings:'from its headings',
              numerals:'from numbered breaks', none:'nothing the finder could read' };
  /* A HANDFUL, NOT A WALL. The screenshot of the first version showed SIXTY
     rows scrolled off the viewport on the steward's real library — a list
     that long is a guilt inventory, which is the same reason ☀ Today caps at
     five. "one step at a time is fine lets a user feel like he is
     contributing": offer the next few, say how many more there are, and let
     the number move. Longest first, because a 900-page book with no
     divisions is the one worth dividing. */
  const SHOW_MAX=6;
  const SHOWN=list.slice(0,SHOW_MAX), more=Math.max(0,list.length-SHOW_MAX);
  el.innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>Books not divided yet</h2>
    <div class="meta">Chapters make a book navigable, quotable and worth working through.
      ${scanned ? `Of the <b>${scanned}</b> book${scanned===1?'':'s'} you have opened,
        <b>${divided}</b> ${divided===1?'has':'have'} divisions the finder could see${byHand?`,
        and <b>${byHand}</b> mark${byHand===1?' is':'s are'} yours`:''}.` : ''}
      <br><b>This only knows books you have actually opened</b> — nothing is scanned behind your
      back, and there is no button to sweep the shelf. Open one, name its parts, and the number moves.</div>
    ${SHOWN.map(r=>`
      <div class="card" onclick="openReader('${esc(r.slug)}')">
        <div class="t">${esc(r.title||r.slug)}</div>
        <div class="s">${r.pages?esc(String(r.pages))+' pages · ':''}${esc(HOW[r.how]||r.how||'not scanned')}${r.found?` · ${r.found} mark${r.found===1?'':'s'} found, which is not a division`:''}</div>
        <div class="row" style="margin-top:8px">
          <button class="btn ghost" onclick="event.stopPropagation();openReader('${esc(r.slug)}')">Open it</button>
        </div>
      </div>`).join('')}
    ${more ? `<div class="meta" style="margin-top:10px">…and <b>${more}</b> more.
      They are not going anywhere — this list is here when you want the next one.</div>` : ''}
    ${list.length ? '' : `<p>${scanned
        ? 'Every book you have opened has chapters. Nothing to do here.'
        : 'Open a book and its divisions are read and kept — this fills itself as you read.'}</p>`}`;
}
export function openReviewQueue(){ state.ui='review'; hideAllOv(); state.reviewView=state.reviewView||{mode:'list'}; renderReviewQueue(); showOv('reviewOv'); }
export function newReviewImportForm(){ state.reviewView={mode:'import'}; renderReviewQueue(); }
export function newReviewManualForm(){ state.reviewView={mode:'manual'}; renderReviewQueue(); }
export function newSCSearchForm(){ state.reviewView={mode:'suttacentral',results:null,query:''}; renderReviewQueue(); }
export function backToReviewList(){ state.reviewView={mode:'list'}; renderReviewQueue(); }
function renderReviewQueue(){
  const v=state.reviewView, q=data.reviewQueue, aiOn=isAIActive();
  const panel=document.getElementById('reviewPanel');
  if(v.mode==='import'){
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>Add Candidates to the Queue</h2>
      <div class="meta">Paste a JSON array from the Caravan connector (<code>tools/caravan/gutenberg.py</code>),
        shaped like <code>{"title":"…","license":"…","source":"…","body":"…"}</code>. These land as
        pending — nothing here touches a shelf until reviewed.</div>
      <textarea id="reviewImportJson" rows="8" placeholder='[{"title":"...","license":"...","source":"...","body":"..."}]'></textarea>
      <div id="reviewImportMsg" class="meta"></div>
      <div class="row" style="margin-top:14px">
        <button class="btn" onclick="importReviewCandidates()">Add to queue</button>
        <button class="btn ghost" onclick="backToReviewList()">← Back</button>
      </div>`;
    return;
  }
  if(v.mode==='manual'){
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>Add a Text by Hand</h2>
      <div class="meta">A book, a paper, a chapter — anything you want on your own shelf. Drop or paste
        it below, pick its shelf, and <b>📚 Add to my Library now</b> puts it straight there, marked 👤
        as your own. <b>Your Shelf is yours: no license or source required</b> — a personal copy for your
        own reading is your business, not the commons'. (Only if you <b>Send to the shared review queue</b>
        — a certified library for others — does a real, redistributable license matter.)</div>
      <label>Where did it come from?</label>
      <select id="rmDropSource" style="width:100%;background:#1b140d;border:2px solid #55432e;border-radius:7px;color:#f5e9d4;font-family:inherit;font-size:13.5px;padding:9px 11px">
        <option value="">Not listed / unknown source</option>
        ${Object.entries(DROP_SOURCES).map(([k,s])=>`<option value="${k}">${esc(s.label)}</option>`).join('')}
      </select>
      <div id="dropZone" ondragover="event.preventDefault();this.classList.add('over')"
        ondragleave="this.classList.remove('over')" ondrop="handleBookDrop(event)"
        style="margin-top:8px;border:2px dashed #55432e;border-radius:8px;padding:22px;text-align:center;color:#a8926c;font-size:13px">
        📄 Drag <code>.txt</code> or <code>.epub</code> files here — <b>one, or a whole pile at once</b>.
        An EPUB is unpacked right here in the game, no conversion needed.<br>
        <b>One file</b> fills the form below to review before adding. <b>Many files</b> go straight to
        Your Shelf, each marked 👤 as your own (personal copies need no license).
      </div>
      <div class="card" style="cursor:default;margin-top:8px;border-color:#e0a43c;background:rgba(224,164,60,.06)">
        <div class="t" style="color:#e0a43c">Dropping a batch? — one subject at a time</div>
        <div class="s" style="margin-top:5px">Whatever shelf is chosen below is applied to <b>every file in the
          drop</b>. So only pick a named shelf if the whole batch really is that one subject — twenty Theravada
          suttas, say. A mixed pile of a hundred books is not one subject, and it should go in
          <b>Unfiled</b>.</div>
        <div class="s" style="margin-top:5px">Unfiled is not a limbo: it is the <b>librarian’s inbox</b>. The
          sorter works the unsorted pile and deliberately leaves alone anything you have already placed — so
          filing a batch onto the wrong shelf is the one state in which the AI cannot help you fix it. Landing
          them unfiled is what lets it do the work.</div>
      </div>
      <input type="file" id="bulkFilePick" accept=".txt,.epub" multiple style="display:none" onchange="handleBookFilePick(event)">
      <div class="row" style="margin-top:8px"><button class="btn ghost" style="font-size:12px" onclick="document.getElementById('bulkFilePick').click()">📁 Choose files… (one or many)</button></div>
      <div id="dropMsg" class="meta"></div>
      <label style="margin-top:10px;color:#e0a43c">📚 Which shelf? — leave it Unfiled for a mixed batch; pick one only when every file is that subject</label>
      <select id="rmTradition" style="width:100%;background:#1b140d;border:2px solid #8a6a3a;border-radius:7px;color:#f5e9d4;font-family:inherit;font-size:13.5px;padding:9px 11px">
        ${TRADITIONS.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('')}
      </select>
      <label style="margin-top:10px">Title</label><input type="text" id="rmTitle" placeholder="e.g. On the Duty of Civil Disobedience">
      <!-- There was no Author box until 2026-08-03, so the author a dropped
           file announces ("Author: Epictetus") had nowhere to go and ended up
           in Source, or was dropped on the floor by a bulk add. It is the
           field residents search when you ask "do I have anything by X". -->
      <label>Author</label><input type="text" id="rmAuthor" placeholder="Filled in automatically from a dropped file when it says">
      <label>License <span style="color:#a8926c;font-weight:normal">(optional for Your Shelf — required only for the shared queue)</span></label><input type="text" id="rmLicense" placeholder="Leave blank for your own copy; e.g. Public Domain / CC0 if sharing">
      <label>Source <span style="color:#a8926c;font-weight:normal">(optional for Your Shelf)</span></label><input type="text" id="rmSource" placeholder="Where it came from — not needed for your own shelf">
      <label>Full text</label><textarea id="rmBody" rows="8" placeholder="Paste the whole thing — this is what gets shelved."></textarea>
      <div class="row" style="margin-top:8px"><button class="btn ghost" onclick="runCopyrightCheck()">⚖ Can this be shared, or is it personal?</button></div>
      <div id="rmCopyrightOut"></div>
      <div id="reviewManualMsg" class="meta"></div>
      <div class="row" style="margin-top:14px">
        <button class="btn" id="shelveNowBtn" onclick="shelveManualFormNow()">📚 Add to my Library now</button>
        <button class="btn ghost" onclick="submitManualReviewItem()">Send to review queue instead</button>
        <button class="btn ghost" onclick="backToReviewList()">← Back</button>
      </div>`;
    return;
  }
  if(v.mode==='suttacentral'){
    const results=v.results;
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>Browse SuttaCentral</h2>
      <div class="meta">Live search against suttacentral.net, straight from your browser — no server
        in between, same source the Theravada shelf's real full texts already come from. Fetching a
        result adds its actual translated text to the queue below as a pending item; nothing's on a
        shelf until you approve it, same as every other path in.</div>
      <div class="row">
        <input type="text" id="scQuery" placeholder="e.g. mindfulness, loving-kindness, the Buddha's last days" value="${esc(v.query||'')}" style="flex:1">
        <button class="btn" onclick="searchSuttaCentral()">Search</button>
      </div>
      <div id="scStatus" class="meta"></div>
      <div id="scResults">${results ? results.map(r=>`
        <div class="card" style="cursor:default">
          <div class="t">${esc(r.name)} <span class="s">(${esc(r.uid)})</span></div>
          <div class="s">${esc(r.author||'')}</div>
          <div class="row" style="margin-top:6px">
            <button class="btn ghost" id="scFetch-${esc(r.uid)}" onclick="fetchSuttaCentralText('${esc(r.uid)}','${esc(r.name).replace(/'/g,"\\'")}','${esc(r.author_uid||'sujato')}')">+ Fetch full text & add to queue</button>
          </div>
        </div>`).join('') || '<p>No matches yet — try a different word.</p>' : ''}</div>
      <div class="row" style="margin-top:14px">
        <button class="btn ghost" onclick="backToReviewList()">← Back</button>
      </div>`;
    return;
  }
  const draftedNote = item => item.draftSummary
    ? `<div class="s" style="margin-top:4px;font-style:italic">✨ ${esc(item.draftSummary)}</div>` : '';
  panel.innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>The Caravan Desk</h2>
    <div class="meta">Where texts from outside actually enter the Library. Before approving
      anything: is the license actually clear (public domain, or something you have real
      permission to shelve)? No legal or copyright question left open? That's the whole job of
      this queue — everything else about "does it fit the Library" is a judgment call, but
      license/legality is the one that isn't optional.</div>
    <details style="margin:4px 0 14px">
      <summary style="cursor:pointer;color:#e0a43c;font-size:13px">❔ Why can't I just paste a URL and have it show up?</summary>
      <div class="meta" style="margin-top:8px">
        A browser genuinely can't reach most outside sites directly — a real technical wall, not a
        rule (confirmed for Gutenberg, arXiv, and Semantic Scholar specifically). The real path: a
        small terminal script in <code>tools/caravan/</code> fetches the text, <code>library-draft.py</code>
        turns it into a draft, and pasting that draft's output here (<b>+ Paste Caravan output</b>
        below) is what actually lands it in this queue. No terminal at all? <b>+ Add a text by hand</b>
        works for anything you already have real permission to share. See <code>LEARNING-PATH.md</code>
        Stage 9 for the fuller explanation of why a browser can't do this itself, and what the
        Caravan does instead of a general scraper.
      </div>
    </details>
    ${q.length ? q.map(item=>`
      <div class="card" style="cursor:default">
        <div class="t">${esc(item.title)} <span class="badge">${esc(item.origin)}</span> <span class="badge">${esc(item.status)}</span></div>
        <div class="s">${esc(item.license||'(no license given)')} ${item.source?'· '+esc(item.source):''}</div>
        ${draftedNote(item)}
        <div class="row" style="margin-top:8px">
          ${item.status==='pending' ? `
            <button class="btn" onclick="approveReviewItem(${item.id})">Approve</button>
            <button class="btn ghost" onclick="rejectReviewItem(${item.id})">Reject</button>` : ''}
          <button class="btn ghost" id="shelfPersonalBtn${item.id}" onclick="shelvePersonalBook(${item.id})">👤 Shelve on Your Shelf</button>
          ${aiOn ? `<button class="btn ghost" id="reviewDraftBtn${item.id}" onclick="draftSummaryForReviewItem(${item.id})">✨ ${item.draftSummary?'Redraft':'Draft'} summary with AI</button>` : ''}
        </div>
      </div>`).join('') : '<p>Nothing waiting for review.</p>'}
    <div class="row" style="margin-top:14px">
      <button class="btn ghost" onclick="newReviewImportForm()">+ Paste Caravan output</button>
      <button class="btn ghost" onclick="newReviewManualForm()">+ Add a text by hand</button>
      <button class="btn ghost" onclick="newSCSearchForm()">🔍 Browse SuttaCentral</button>
      <button class="btn ghost" onclick="openStewardIndex()">🗂 The Steward's Index</button>
      ${data.reviewQueue.filter(x=>x.status==='approved').length ? `<button class="btn" onclick="generateApprovedBatch()">📋 Generate batch (${data.reviewQueue.filter(x=>x.status==='approved').length} approved)</button>` : ''}
    </div>
    <div id="reviewBatchOut"></div>`;
}
/* ----- Live SuttaCentral browsing, straight from the browser — the one
   Caravan source that's actually CORS-open for real content (confirmed:
   Gutenberg's raw text host and arXiv both refuse cross-origin fetches;
   SuttaCentral's search, suttaplex, and bilara endpoints all allow it).
   Ports tools/caravan/suttacentral.py's bilara-JSON-to-clean-text logic
   into JS — same segment-ordering discipline (always walk keys_order,
   never translation_text's own key order, since those can diverge), same
   "skip structural segments with no translation rather than guess." */
const SC_API='https://suttacentral.net/api';
function assembleBilaraHtml(bilara){
  const {translation_text,html_text,keys_order}=bilara;
  let out='';
  for(const key of keys_order){
    if(!(key in translation_text)) continue;
    const segText=translation_text[key];
    const template=html_text[key]||'{}';
    out += template.includes('{}') ? template.replace('{}',segText) : template+segText;
  }
  return out;
}
function bilaraHtmlToText(html){
  html=html.replace(/<(h[1-4])[^>]*>([\s\S]*?)<\/\1>/gi, m=>'\n\n'+m+'\n\n');
  html=html.replace(/<\/(h1|h2|h3|h4|p|li|header|article)>/gi, m=>m+'\n\n');
  let text=html.replace(/<[^>]+>/g,'');
  const ta=document.createElement('textarea'); ta.innerHTML=text; text=ta.value;
  text=text.split('\n').map(ln=>ln.trim().replace(/[ \t]+/g,' ')).join('\n');
  text=text.replace(/\n{3,}/g,'\n\n');
  return text.trim();
}
export async function searchSuttaCentral(){
  const q=document.getElementById('scQuery').value.trim();
  const status=document.getElementById('scStatus');
  if(!q) return;
  state.reviewView.query=q;
  status.textContent='Searching…';
  try{
    const url=`${SC_API}/search/instant?query=${encodeURIComponent(q)}&limit=12&language=en&restrict=&matchpartial=true`;
    const res=await fetch(url); if(!res.ok) throw new Error('status '+res.status);
    const data=await res.json();
    const seen=new Set();
    state.reviewView.results = (data.hits||[]).filter(h=>{
      if(seen.has(h.uid)) return false; seen.add(h.uid); return true;
    }).map(h=>({ uid:h.uid, name:h.heading?.title||h.name||h.uid, author:h.author, author_uid:h.author_uid }));
  }catch(e){
    state.reviewView.results=[];
    status.textContent="Couldn't reach SuttaCentral right now — check your internet connection and try again.";
    renderReviewQueue(); return;
  }
  renderReviewQueue();
}
export async function fetchSuttaCentralText(uid,name,authorUid){
  const btn=document.getElementById('scFetch-'+uid);
  if(btn){ btn.disabled=true; btn.textContent='Fetching…'; }
  try{
    const bilaraUrl=`${SC_API}/bilarasuttas/${uid}/en?author_uid=${authorUid}`;
    const res=await fetch(bilaraUrl); if(!res.ok) throw new Error('status '+res.status);
    const bilara=await res.json();
    if(!bilara.translation_text||!bilara.html_text||!bilara.keys_order) throw new Error('unexpected response shape');
    const html=assembleBilaraHtml(bilara);
    const body=bilaraHtmlToText(html);
    if(!body) throw new Error('empty text');
    data.reviewQueue.unshift({
      id:Date.now(), title:name, license:'CC0 1.0', source:`https://suttacentral.net/${uid}`,
      body, tradition:'Theravada', origin:'suttacentral', status:'pending', submittedAt:todayKey(),
    });
    persist(); logActivity('Fetched "'+name+'" from SuttaCentral into the Steward Review Queue.'); blip(700,.07);
    state.reviewView={mode:'list'}; renderReviewQueue();
  }catch(e){
    if(btn){ btn.disabled=false; btn.textContent='Fetch failed — try again'; }
  }
}
export function importReviewCandidates(){
  const raw=document.getElementById('reviewImportJson').value.trim();
  const msg=document.getElementById('reviewImportMsg');
  let arr; try{ arr=JSON.parse(raw); }catch(e){ msg.textContent='Not valid JSON — nothing added.'; return; }
  if(!Array.isArray(arr)){ msg.textContent='Expected a JSON array.'; return; }
  let added=0;
  for(const c of arr){
    if(!c||!c.title||!c.body) continue;
    data.reviewQueue.unshift({ id:Date.now()+added, title:c.title, license:c.license||'', source:c.source||'',
      body:c.body, tradition:c.tradition||'', origin:'caravan', status:'pending', submittedAt:todayKey() });
    added++;
  }
  persist();
  if(added) logActivity('Added '+added+' candidate(s) to the Steward Review Queue.');
  msg.textContent='Added '+added+' to the queue.';
  setTimeout(()=>{ state.reviewView={mode:'list'}; renderReviewQueue(); },700);
}
export function submitManualReviewItem(){
  const title=document.getElementById('rmTitle').value.trim();
  const body=document.getElementById('rmBody').value.trim();
  const msg=document.getElementById('reviewManualMsg');
  if(!title||!body){ msg.textContent='A title and the actual text are both required.'; return; }
  const tradition=document.getElementById('rmTradition').value;
  const license=document.getElementById('rmLicense').value.trim();
  const source=document.getElementById('rmSource').value.trim();
  data.reviewQueue.unshift({ id:Date.now(), title, license, source, body, tradition, origin:'manual', status:'pending', submittedAt:todayKey() });
  persist(); logActivity('Added "'+title+'" to the Steward Review Queue by hand.'); blip(700,.07);
  state.reviewView={mode:'list'}; renderReviewQueue();
}
export function submitArchiveDocForReview(slug){
  const d=data.workshop.docs.find(x=>x.slug===slug); if(!d) return;
  data.reviewQueue.unshift({ id:Date.now(), title:d.title, license:d.license, source:d.source,
    body:d.body, tradition:'', origin:'archive', status:'pending', submittedAt:todayKey() });
  persist(); logActivity('Submitted "'+d.title+'" to the Steward Review Queue.'); blip(700,.07);
}
export function approveReviewItem(id){
  const item=data.reviewQueue.find(x=>x.id===id); if(!item) return;
  item.status='approved';
  persist(); logActivity('Approved "'+item.title+'" — queued for the next Library batch.');
  renderReviewQueue();
}
export function rejectReviewItem(id){
  data.reviewQueue=data.reviewQueue.filter(x=>x.id!==id);
  persist(); renderReviewQueue();
}
/* ----- Your Shelf — the personal half of the provenance split
   (BETA-BUILD-PLAN.md): a text you brought in yourself gets shelved
   under YOU, plainly marked, never mixed into the certified commons
   shelves. This is the whole local path — no catalogue row, no MinIO
   object, no terminal batch: the catalog card lives in your save, and
   the full text lives as a plain file in the desktop app's own data
   folder (falling back to inline-in-save in a browser, where big books
   get refused honestly rather than corrupting the save). */
const INLINE_PERSONAL_MAX = 1500000; // ~1.5MB of text — past this, a browser's localStorage save genuinely can't hold it
/* The one place a personal book actually gets built and shelved — shared by
   the queue's "Shelve" button and the drop form's direct "Add to my Library
   now". It files the book under the tradition you chose, so it lands on that
   real shelf (findable under its title), while keeping personal:true and the
   👤 mark — honest that YOU vouched for it, not a steward. Full text goes to
   a file on desktop, inline in a browser. Returns {ok, slug, shelf} or
   {ok:false, reason}. */
/* `author` added 2026-08-03, reported by the steward as "the auto fill... misses
   the formatting" and "it doesn't work when you do a mass dump". Both were one
   bug with no author field anywhere to land in:

     parseBookFile() reads "Author: Epictetus" out of every Gutenberg text
     correctly — and then the single-file path put it in the SOURCE box, the
     bulk path passed it as `source`, and this function threw it away entirely
     by hardcoding `attribution`. Every book added by hand or in bulk was
     shelved with no author, and the author it had found sat in a URL field.

   That is also why the database showed 294 books and 118 authors: the loader
   was recovering from the text what the intake had discarded on the way in. */
async function shelveAsPersonal({title, body, author, license, source, tradition, summary, sections}){
  body=body||'';
  const bridge=window.desktopBridge;
  if(!(bridge&&bridge.libraryWrite) && body.length>INLINE_PERSONAL_MAX)
    return { ok:false, reason:'This book is large — the desktop app stores it as a real file, but a browser save can’t hold it.' };
  let slug='personal-'+slugify(title||'untitled');
  while(Store.getDoc(slug)) slug+='-2'; // never collide with a certified slug or an earlier personal copy
  const lic=license||'Personal — license not certified';
  const fullText={ license:lic, source_url:source||'' };
  let storedAsFile=false, storedWhere='';
  // Preferred: the local Docker MinIO (the 100 GB space) — the durable home for
  // the text, out of the fragile localStorage save, and readable by the Reader
  // over plain HTTP just like the certified library. Falls back to a plain
  // app-data file, then to inline, so no single service is ever required.
  if(bridge && bridge.minioWrite){
    try{
      const res=await bridge.minioWrite(slug+'.txt', body);
      if(res && res.ok){ fullText.storage={ bucket:res.bucket, key:res.key }; fullText.chars=body.length; storedAsFile=true; storedWhere=', stored in local MinIO'; }
    }catch(e){ /* fall through to a file / inline */ }
  }
  /* THE LOCAL SHELF HAS A CEILING, AND IT REFUSES WITH THE WAY THROUGH.

     The steward's split, 2026-08-10: "there should be 2 pathways a local
     file that limmits to 100 books but the docker setup should be the main
     path". At ~563 KB a book (measured), 100 is about 56 MB under userData —
     a number a person can hold in their head.

     The cap applies ONLY to this path. A book going to Docker is not on this
     machine's shelf and must never be refused for space it is not using —
     which is one of the cases npm test breaks on purpose. And the refusal
     names Docker, because a refusal with no next step is the dead end this
     project keeps removing. */
  if(!storedAsFile && bridge && bridge.libraryWrite){
    const room = localRoom(Store.allDocs(), bookCap());
    if(room.full && body.length>INLINE_PERSONAL_MAX){
      /* The refusal names the way through AND opens the door to it — since
         2026-08-10 there is a room that explains Docker in one panel, so
         "start Docker" is no longer a terminal instruction with no home. */
      showToast('Local shelf full — 📦 Where books are kept explains the next step.');
      setTimeout(function(){ if(!state.ui) openStorage(); }, 600);
      return { ok:false, reason:`Your local shelf is full — ${room.cap} books stored as files on this `
        + `machine. Start Docker and the text goes to local storage instead, with no practical limit; `
        + `everything already here stays exactly where it is.` };
    }
    try{
      const res=await bridge.libraryWrite(slug+'.txt', body);
      if(res && res.ok){ fullText.storage={ personal:slug+'.txt' }; fullText.chars=body.length; storedAsFile=true; storedWhere=', stored on this device'; }
    }catch(e){ /* falls back to inline below */ }
  }
  if(!storedAsFile){
    if(body.length>INLINE_PERSONAL_MAX) return { ok:false, reason:"Couldn’t write the file — try again." };
    fullText.text=body;
  }
  const shelf=(tradition && tradition.trim()) ? tradition.trim() : 'Personal';
  const sum=summary || (body.slice(0,240).replace(/\s+\S*$/,'')+(body.length>240?'…':''));
  data.personalLibrary.push({
    slug, tradition:shelf, title:title||'Untitled', license:lic,
    source_url:source||'',
    /* The real author when the file told us one; the provenance sentence only
       as a fallback. "This is yours, not certified" is already carried by
       personal:true and category:'personal' — attribution is where every other
       surface looks for a NAME (see referenceShelfBlock, the reader header,
       and the catalogue lookup a resident now searches). */
    attribution:(author && author.trim()) || 'Added by you — your own addition, not the certified commons',
    added:todayKey(), category:'personal', personal:true,
    doc:{ summary:sum, sections:sections||[], fullText },
  });
  persist();

  /* THE BOOK REACHES THE DATABASE NOW, AT IMPORT — not whenever somebody
     happens to open it.

     Reported from real use 2026-08-10, and precisely: "the multi load did
     not but one at a time did." Confirmed by reading the code. The ONLY
     call to upsertCard from the app was inside chapterInfo(), which runs
     when a book's full text is PAGINATED — i.e. when you open it. So:

       one at a time   you drop it, you read it, chapterInfo fires, the
                       row lands in Postgres                       ✓
       forty at once   you drop forty and open none of them, and NOT ONE
                       of them exists to the database               ✗

     Every consequence of that is invisible until you go looking: a
     resident's catalogue lookup cannot find them (searchBooks reads the
     books table), notes cannot point at them (notes.slug is a foreign key
     into it), and they are absent from the Records Hall. The books were
     fine the whole time; the index simply did not know.

     Fire-and-forget, exactly like syncChapters: nothing waits on it, a
     browser has no bridge and falls straight through, and a failure here
     must never cost you the book you just added — which is already
     shelved and persisted two lines above. */
  try {
    const st = fullText.storage || {};
    Store.dbWrite('upsertCard', [
      slug, title||'Untitled',
      (author && author.trim()) || null,
      lic, source||null,
      /* NULL, not 'Personal' — an unfiled book is unfiled, and `shelf IS
         NULL` is what the sorter's work queue asks for. Writing 'Personal'
         here would quietly empty the pile of books waiting to be sorted. */
      (shelf && shelf!=='Personal') ? shelf : null,
      'book', null,
      st.key || null,
      (fullText.chars ? Math.max(1, Math.ceil(fullText.chars/1400)) : null),
      st.personal || null,
    ]);
  } catch(e){ /* the Pavilion shelves books perfectly well without a database */ }

  logActivity('Shelved "'+(title||'untitled')+'" in your Library ('+shelf+', personal'+storedWhere+').');
  blip(784,.09);
  return { ok:true, slug, shelf, storedAsFile };
}
/* ----- REPAIRING BOOKS THE OLD INTAKE SHELVED WITHOUT THEIR AUTHOR -----
   Added 2026-08-03 alongside the fix above. Every book added before that fix
   was shelved with the boilerplate attribution and no real author, which is
   why a resident could say "no, nothing by Epictetus" with two of his books
   on the shelf.

   THE ANSWER IS NOT A CLEAN BUILD. Re-adding the library would cost every
   shelf assignment, every note, every reading position — and the authors are
   sitting in the text we already have. So this reads them back out: the same
   DROP_AUTHOR_RE the intake uses, over the stored text, book by book.

   Deterministic, no model — the standing rule, and this is exactly the kind
   of job it is for. It only ever FILLS IN a missing author; a book whose
   attribution you set yourself is never touched. */
const PLACEHOLDER_ATTRIB=/^Added by you\b/i;
export async function repairBookAuthors(){
  const out=document.getElementById('repairOut');
  const books=personalBooks().filter(b=>!b.attribution || PLACEHOLDER_ATTRIB.test(b.attribution));
  if(!books.length){
    if(out) out.innerHTML='<div class="meta">Every book on your shelf already has an author. Nothing to repair.</div>';
    return;
  }
  let fixed=0, noAuthor=0, unreadable=0;
  for(let i=0;i<books.length;i++){
    const b=books[i];
    if(out) out.innerHTML=`<div class="meta">Reading ${i+1} of ${books.length}… (${fixed} author${fixed===1?'':'s'} recovered so far)</div>`;
    let text=null;
    try{ text=await loadBookText(b.slug); }catch(e){ text=null; }
    if(!text){ unreadable++; continue; }
    const m=DROP_AUTHOR_RE.exec(text.slice(0,4000));
    const author=m && m[1].trim().replace(/\s+/g,' ').slice(0,120);
    if(!author){ noAuthor++; continue; }
    const rec=data.personalLibrary.find(x=>x.slug===b.slug);
    if(rec){ rec.attribution=author; fixed++; }
  }
  persist();
  logActivity('Recovered the author for '+fixed+' book'+(fixed===1?'':'s')+' from their own text.');
  if(fixed) blip(784,.09);
  const parts=[`<b>${fixed}</b> author${fixed===1?'':'s'} recovered and saved.`];
  if(noAuthor) parts.push(`${noAuthor} book${noAuthor===1?" doesn't":"s don't"} say who wrote them — add those by hand if you want them findable.`);
  if(unreadable) parts.push(`${unreadable} couldn't be read (is local storage running?).`);
  /* RE-RENDER FIRST, THEN SPEAK. renderMyLibrary() rebuilds the panel and
     takes #repairOut with it, so writing the result before the re-render
     meant the button worked perfectly and reported nothing at all — a silent
     success, which in this project is very nearly as bad as a silent
     failure. Caught by driving it rather than by reading it. */
  renderMyLibrary();
  const el=document.getElementById('repairOut');
  if(el) el.innerHTML=parts.join(' ');
}
export async function shelvePersonalBook(id){
  const item=data.reviewQueue.find(x=>x.id===id); if(!item) return;
  const btn=document.getElementById('shelfPersonalBtn'+id);
  if(btn){ btn.disabled=true; btn.textContent='Shelving…'; }
  const res=await shelveAsPersonal({ title:item.title, body:item.body, license:item.license,
    source:item.source, tradition:item.tradition, summary:item.draftSummary, sections:item.draftSections });
  if(!res.ok){ if(btn){ btn.disabled=false; btn.textContent=res.reason; } return; }
  data.reviewQueue=data.reviewQueue.filter(x=>x.id!==id);
  renderReviewQueue();
}
/* The direct path a solo visitor actually wants: drop a book, pick its shelf,
   and put it in the Library in one step — no review-queue detour. Reads the
   same manual-entry form the queue path uses. */
let shelveNowCooldown=false; // guards against a second add of the same book while the form is being cleared
export async function shelveManualFormNow(){
  if(shelveNowCooldown) return;
  const title=document.getElementById('rmTitle').value.trim();
  const body=document.getElementById('rmBody').value.trim();
  const msg=document.getElementById('reviewManualMsg');
  if(!title||!body){ if(msg) msg.textContent='A title and the actual text are both required.'; return; }
  const tradition=document.getElementById('rmTradition').value;
  const license=document.getElementById('rmLicense').value.trim();
  const source=document.getElementById('rmSource').value.trim();
  const author=(document.getElementById('rmAuthor')?.value||'').trim();
  if(msg) msg.textContent='Shelving…';
  const res=await shelveAsPersonal({ title, body, author, license, source, tradition });
  if(!res.ok){ if(msg) msg.textContent=res.reason; return; }
  // Clear the book fields so the same text can't be added twice by a stray
  // second click; the shelf stays picked in case you're adding several to it.
  ['rmTitle','rmAuthor','rmBody','rmLicense','rmSource'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const dm=document.getElementById('dropMsg'); if(dm) dm.textContent='';
  if(msg) msg.innerHTML='“'+esc(title)+'” is in your Library now — on the <b>'+esc(res.shelf)
    +'</b> shelf, marked 👤 as your own. Walk to that shelf in the Library, or find it in the Index search.';
  // A short cooldown on the button — a clear "done, don't double-add" beat.
  const btn=document.getElementById('shelveNowBtn');
  shelveNowCooldown=true;
  if(btn){
    btn.disabled=true;
    let secs=5;
    btn.textContent='✓ Added — ready in '+secs+'s';
    const tick=setInterval(()=>{
      secs--;
      if(secs<=0){
        clearInterval(tick); shelveNowCooldown=false;
        if(document.getElementById('shelveNowBtn')===btn){ btn.disabled=false; btn.textContent='📚 Add to my Library now'; }
      } else if(document.getElementById('shelveNowBtn')===btn){
        btn.textContent='✓ Added — ready in '+secs+'s';
      }
    },1000);
  } else {
    setTimeout(()=>{ shelveNowCooldown=false; },5000);
  }
}
export function removePersonalBook(slug, from){
  const b=data.personalLibrary.find(d=>d.slug===slug); if(!b) return;
  const sure=window.confirm('Take "'+b.title+'" off Your Shelf? Its stored text goes with it. '
    +'(Notes you took on it stay in your save.)');
  if(!sure) return;
  const st=b.doc && b.doc.fullText && b.doc.fullText.storage;
  const bridge=window.desktopBridge;
  if(st && st.personal && bridge && bridge.libraryDelete){
    bridge.libraryDelete(st.personal); // best-effort — a leftover file is harmless
  } else if(st && st.key && bridge && bridge.minioDelete){
    bridge.minioDelete(st.key); // best-effort — a leftover MinIO object is harmless
  }
  data.personalLibrary=data.personalLibrary.filter(d=>d.slug!==slug);
  persist(); logActivity('Removed "'+b.title+'" from Your Shelf.');
  /* renderManageLibrary() did not exist — the old Manage panel was replaced by
     My Library and its redraw was never repointed. Nothing passes 'manage'
     today, so this was a crash waiting for its first caller rather than a live
     bug, which is exactly the shape the free-identifier guard was written for.
     Redraw whatever is actually open, the same way handleLibraryChanged does. */
  if(from==='manage') renderMyLibrary(); else openShelf('Personal');
}
/* Manage my Library — the cleanup tool for your OWN 👤 books: fix duplicates
   (remove) and misfiled ones (move to the right shelf), in one place, with
   same-title duplicates flagged. Certified library books aren't shown — those
   go through the review pipeline, not here. Moving just changes a book's
   `tradition`, which is what the shelves and The Stacks sort by, so it re-files
   everywhere at once. */
/* ================================================================
   STANDING INSTRUCTIONS + THE PROMPT INSPECTOR — ADMIN-AND-AUTHORING
   -PLAN #1 and #2, built 2026-07-27.

   Both come from the same audit: things we could only do by editing
   source. We shaped a resident by editing `charter.js`; a visitor had
   no way to tell Quill "I'm working through electronics this year" and
   have it stick. And we knew what context a resident receives because
   we can read the code — which made the assembled prompt the single
   genuinely opaque thing in a project whose whole pitch is that
   nothing is hidden.

   They're built together on purpose: the inspector is where you SEE
   your standing instruction actually took effect. A promise you can
   check beats a promise you're asked to believe.

   The instruction is APPENDED to the charter, never replaces it, and
   is fenced so it reads as the visitor's own request rather than as
   the Pavilion's voice.
   ================================================================ */
export const STANDING_SUGGESTIONS = {
  _any: [
    "Keep answers short — three sentences unless I ask for more.",
    "Explain things like I'm new to this, and define any jargon you use.",
    "Don't soften bad news. If something won't work, say so plainly.",
    "Ask me one clarifying question before a long answer.",
    "I'm working through electronics this year — keep that in mind.",
    "Answer in Spanish.",
  ],
  quill: [
    "Always say which shelved book you're drawing on, or say you're going from general knowledge.",
    "Prefer suggesting something already on my shelves over something I'd have to find.",
  ],
  monk: [
    "Don't reassure me. I'd rather have the harder observation.",
    "Keep the religious framing light unless I ask for it.",
  ],
  sebastian: [
    "I work nights — never suggest anything before noon.",
    "I have small children; assume my day gets interrupted.",
  ],
  tutor: [
    "Quiz me before you explain — I learn better getting it wrong first.",
    "Use worked examples rather than definitions.",
  ],
};
function standingFor(agentKey){ if(!data.standing) data.standing={}; return (data.standing[agentKey]||'').trim(); }
/* The one place a standing instruction enters a prompt. Every send path calls
   this, so there is no route by which one is silently ignored. */
function withStanding(agentKey, systemPrompt){
  const s=standingFor(agentKey);
  if(!s) return systemPrompt;
  return systemPrompt
    +"\n\n--- STANDING INSTRUCTIONS FROM THE PERSON YOU ARE SPEAKING WITH ---\n"
    +"They set these themselves and expect them followed in every reply. They do not "
    +"override who you are or the charter above; where they genuinely conflict, say so plainly "
    +"rather than silently ignoring either.\n"
    +s+"\n--- end of their standing instructions ---";
}
/* What was actually sent, kept in memory only (never persisted — it's a window
   onto the last call, not a record to accumulate). */
const lastSent={};
function recordSent(agentKey, messages, opts){
  lastSent[agentKey]={ at:new Date().toLocaleTimeString(), messages, opts:opts||{} };
}
export function openStanding(agentKey){
  state.ui='standing'; state.standingAgent=agentKey||'quill';
  hideAllOv(); renderStanding(); showOv('standingOv');
}
export function setStanding(agentKey, v){
  if(!data.standing) data.standing={};
  data.standing[agentKey]=v;
  clearTimeout(pathSaveTimer); pathSaveTimer=setTimeout(persist,500);
  const el=document.getElementById('standingSaved'); if(el) el.textContent='saved';
}
export function addStandingSuggestion(agentKey, text){
  const box=document.getElementById('standingBox'); if(!box) return;
  box.value=(box.value.trim()? box.value.trim()+'\n' : '')+text;
  setStanding(agentKey, box.value);
}
export function clearStanding(agentKey){
  const box=document.getElementById('standingBox'); if(box) box.value='';
  setStanding(agentKey,''); renderStanding();
}
function renderStanding(){
  const el=document.getElementById('standingPanel'); if(!el) return;
  const key=state.standingAgent||'quill';
  const agent=CHAT_AGENTS[key]||CHAT_AGENTS.quill;
  /* .label, not .name. CHAT_AGENTS entries have only ever had `label` — the
     filter below asked for `.name`, so it matched nothing and this panel
     rendered ZERO resident buttons, while the heading above read the raw key
     ("quill") instead of "Quill". Silent since before the residents split
     (checked against bb45248^): the panel looked deliberate rather than
     broken, which is why nobody reported it. */
  const name=(agent&&agent.label)||key;
  const sugg=[...(STANDING_SUGGESTIONS[key]||[]), ...STANDING_SUGGESTIONS._any];
  const others=Object.keys(CHAT_AGENTS).filter(k=>CHAT_AGENTS[k]&&CHAT_AGENTS[k].label);
  el.innerHTML=`
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>✎ Standing instructions ${visBadge('private')}</h2>
    <div class="meta">Something you want <b>${esc(name)}</b> to remember in every conversation, without
      typing it each time. It's added to what they're told before your message — it doesn't replace who
      they are, and if your instruction genuinely clashes with their character they'll say so rather
      than quietly ignore either.</div>
    <div class="row" style="margin:10px 0;gap:6px;flex-wrap:wrap">
      ${others.map(k=>`<button class="btn ${k===key?'':'ghost'}" style="font-size:11px;padding:3px 10px" onclick="openStanding('${k}')">${esc(CHAT_AGENTS[k].label.split('·')[0].trim())}${standingFor(k)?' •':''}</button>`).join('')}
    </div>
    <textarea id="standingBox" rows="5" placeholder="e.g. I'm working through electronics this year — keep that in mind."
      oninput="setStanding('${key}', this.value)">${esc(standingFor(key))}</textarea>
    <div class="meta" id="standingSaved" style="margin-top:4px">${standingFor(key)?'saved':'saves as you type'}</div>
    <h3 style="margin-top:16px">Suggestions — click to add</h3>
    <div class="meta">Starting points, not rules. Edit them into your own words.</div>
    <div style="margin-top:8px">
      ${sugg.map(s=>`<div class="card" onclick="addStandingSuggestion('${key}', ${JSON.stringify(s).replace(/"/g,'&quot;')})">
        <div class="s">＋ ${esc(s)}</div></div>`).join('')}
    </div>
    <div class="row" style="margin-top:14px;gap:6px">
      <button class="btn ghost" onclick="openPromptInspector('${key}')">🔍 See what was actually sent</button>
      ${standingFor(key)?`<button class="btn ghost" style="border-color:var(--danger);color:var(--danger-soft)" onclick="clearStanding('${key}')">Clear</button>`:''}
    </div>`;
}
/* From inside a conversation: act on whoever you're actually talking to. */
export function openStandingForCurrentChat(){ openStanding((state.dialog&&state.dialog.agent)||'quill'); }
export function openPromptForCurrentChat(){ openPromptInspector((state.dialog&&state.dialog.agent)||'quill'); }
export function openPromptInspector(agentKey){
  state.ui='prompt'; state.promptAgent=agentKey||state.promptAgent||'quill';
  hideAllOv(); renderPromptInspector(); showOv('promptOv');
}
function renderPromptInspector(){
  const el=document.getElementById('promptPanel'); if(!el) return;
  const key=state.promptAgent||'quill';
  const rec=lastSent[key];
  const name=((CHAT_AGENTS[key]||{}).name)||key;
  el.innerHTML=`
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>🔍 What was actually sent</h2>
    <div class="meta">The exact text handed to your AI the last time <b>${esc(name)}</b> answered — nothing
      summarised, nothing hidden. This is the one part of the Pavilion you otherwise had to take on trust,
      so here it is verbatim.
      <br><br>It goes to whichever connection you chose: your own machine (🏠) or a cloud provider you
      added yourself (☁). Nothing is sent anywhere else, ever.</div>
    ${rec?`
      <div class="meta" style="margin-top:10px">Captured ${esc(rec.at)}${rec.opts&&rec.opts.model?' · model <b>'+esc(rec.opts.model)+'</b>':''}</div>
      ${rec.messages.map(m=>`
        <h3 style="margin-top:14px">${m.role==='system'?'The instructions it was given':m.role==='user'?'What you said':'What it said back'}
          <span class="badge lic">${esc(m.role)}</span></h3>
        <div class="card" style="cursor:default"><div style="white-space:pre-wrap;font-size:12px;max-height:320px;overflow:auto">${esc(m.content)}</div></div>
      `).join('')}
      ${standingFor(key)?'<div class="meta" style="margin-top:10px">✎ Your standing instructions are in there — search the system block for “STANDING INSTRUCTIONS”.</div>':''}
    `:`<p class="meta" style="margin-top:12px">Nothing captured yet — talk to ${esc(name)} once, then come back and this will show you exactly what they were sent.</p>`}
    <div id="promptPreview"></div>
    <div class="row" style="margin-top:14px">
      <button class="btn ghost" onclick="previewPrompt('${key}')">👁 What would they be told right now?</button>
      <button class="btn ghost" onclick="openStanding('${key}')">✎ Standing instructions</button></div>`;
}
/* WHAT THEY WOULD BE TOLD *NOW*, without spending a message to find out.

   Added 2026-08-08, because this panel could only ever show a prompt that had
   already been sent — so before your first message it said "nothing captured
   yet", which is the one moment you most want to look. It also had no way to
   answer the question this session made worth asking: "if I put that in my
   backpack, what does the resident actually see?" Now you can carry something,
   press this, and read the difference.

   It builds the prompt through exactly the same call sendChatMessage makes, so
   it is a preview and not a reconstruction — the distinction recordSent() was
   written to protect. */
export async function previewPrompt(agentKey){
  const key=agentKey||state.promptAgent||'quill';
  const agent=CHAT_AGENTS[key]; if(!agent||!agent.systemPrompt) return '';
  /* Build FIRST, render second. The text is the useful thing and the panel is
     only one way of looking at it — returning it regardless means a test can
     ask "what would this resident actually be told" without opening a window,
     which is the difference between checking the real prompt and checking a
     screenshot of it. */
  const el=document.getElementById('promptPreview');
  if(el) el.innerHTML='<div class="meta" style="margin-top:10px">building…</div>';
  const text=withStanding(key, await agent.systemPrompt());
  if(!el) return text;
  el.innerHTML=`<h3 style="margin-top:14px">What ${esc(((CHAT_AGENTS[key]||{}).label)||key)} would be told, as of right now
      <span class="badge lic">${text.length.toLocaleString()} chars · ~${estimateTokens([{content:text}]).toLocaleString()} tokens</span></h3>
    <div class="meta">Nothing was sent to build this. Carry something in your 🎒 backpack and press again —
      the difference is exactly what the backpack does.</div>
    <div class="card" style="cursor:default"><div style="white-space:pre-wrap;font-size:12px;max-height:340px;overflow:auto">${esc(text)}</div></div>`;
  return text;
}

/* ================================================================
   THE COPYRIGHT CHECK — built 2026-07-27, at direct request: "a
   pipeline for review where the local AI can judge if a book is out of
   copyright, or if it has to stay in a personal capacity."

   Built deliberately so that the AI does NOT judge it. See
   data/copyright.js for the full reasoning; the short version is that
   copyright is a legal question, a model's confident guess at one is
   worse than silence, and the safe default (keep it personal) costs
   the visitor nothing because a personal copy never needs a licence.

   So: deterministic rules read the actual text and decide; the model
   is used only to pull out evidence the rules can then weigh — a
   publication year, an author, a quoted licence line — and everything
   it found is shown to the person beside the verdict. A human presses
   the button either way.
   ================================================================ */
export async function runCopyrightCheck(){
  const out=document.getElementById('rmCopyrightOut'); if(!out) return;
  const title=(document.getElementById('rmTitle')?.value||'').trim()||'this text';
  const body=(document.getElementById('rmBody')?.value||'');
  const license=(document.getElementById('rmLicense')?.value||'');
  const source=(document.getElementById('rmSource')?.value||'');
  if(!body.trim()){ out.innerHTML='<div class="meta">Paste or drop the text first — the check reads the book itself, not the title.</div>'; return; }
  out.innerHTML='<div class="meta">Reading the text…</div>';
  let evidence={}, aiNote='';
  if(isAIActive()){
    try{
      const reply=await AI.chat([
        {role:'system', content:WORK_CHARTER+'\n\nYou extract facts stated in a document. You never draw legal conclusions and never guess. If the text does not say something, answer "unknown".'},
        {role:'user', content:extractEvidencePrompt(title, body.slice(0,6000))},
      ]);
      if(!isEmptyReply(reply)){ evidence=parseEvidence(reply); aiNote='Your local AI read the opening and pulled out what it actually states.'; }
    }catch(e){ aiNote='Your local AI did not answer, so this is from the text alone.'; }
  } else {
    aiNote='No local AI connected — this is from the text alone, which is usually enough.';
  }
  const v=triage({ text:body, license, source, evidence });
  const ev=[];
  if(evidence.published) ev.push(`published: <b>${esc(String(evidence.published))}</b>`);
  if(evidence.author) ev.push(`author: <b>${esc(evidence.author)}</b>`);
  if(evidence.authorDied) ev.push(`author died: <b>${esc(String(evidence.authorDied))}</b>`);
  if(evidence.licenseStatement) ev.push(`licence line found: “${esc(evidence.licenseStatement.slice(0,120))}”`);
  if(evidence.copyrightLine) ev.push(`copyright line found: “${esc(evidence.copyrightLine.slice(0,120))}”`);
  out.innerHTML=`
    <div class="card" style="cursor:default;border-color:${v.tone};margin-top:8px">
      <div class="t" style="color:${v.tone}">⚖ ${esc(v.label)}</div>
      <div class="s" style="margin-top:4px">${esc(v.advice)}</div>
      ${v.reasons.length?`<div class="meta" style="margin-top:8px"><b>What it found in the text:</b><br>${
        v.reasons.map(r=>`• ${esc(r.what)}${r.quote?` <span style="opacity:.7">— “${esc(r.quote)}”</span>`:''}`).join('<br>')}</div>`:''}
      ${ev.length?`<div class="meta" style="margin-top:6px">${ev.join(' · ')}</div>`:''}
      <div class="meta" style="margin-top:8px;opacity:.85">${esc(aiNote)} <b>This is a recommendation, not a legal opinion</b> — copyright differs by country and only you can decide. Anything uncertain stays on your own shelf, which needs no licence at all.
        ${v.mayShare?'':'<br><b>Your Shelf is the right home for this one.</b>'}</div>
    </div>`;
  blip(v.mayShare?700:300,.08);
}

/* ================================================================
   THE STEWARD'S INDEX — the administrator's view of the whole Library
   (2026-07-27, at direct request: "an index for administrators that
   lets me edit the library and move things around").

   The real constraint, stated rather than worked around: a certified
   entry lives in seed.js, which is source code. A running browser
   cannot rewrite either. So edits are kept as an OVERRIDE LAYER in the
   save (data.catalogEdits, applied by store.js on every read) — which
   means corrections take effect immediately, are yours, travel with
   your save, and can be EXPORTED to fold back into the source properly.
   The book's text is never touched; only its catalogue card.
   ================================================================ */
export function openStewardIndex(){ state.ui='stewardidx'; state.sidxView=state.sidxView||{q:'',edit:null}; hideAllOv(); renderStewardIndex(); showOv('stewardIdxOv'); }
export function sidxSearch(v){ state.sidxView.q=v; renderStewardIndex(true); }
export function sidxEdit(slug){ state.sidxView.edit=slug; renderStewardIndex(); }
export function sidxCancel(){ state.sidxView.edit=null; renderStewardIndex(); }
function catalogEdits(){ if(!data.catalogEdits) data.catalogEdits={}; return data.catalogEdits; }
export function sidxSave(slug){
  const d=Store.getDoc(slug); if(!d) return;
  const g=id=>document.getElementById(id)?.value ?? '';
  const next={ title:g('sidxTitle').trim(), attribution:g('sidxAttr').trim(), license:g('sidxLicense').trim(),
    source_url:g('sidxSource').trim(), tradition:g('sidxShelf'), summary:g('sidxSummary').trim() };
  if(d.personal){
    const b=data.personalLibrary.find(x=>x.slug===slug);
    if(b){ Object.assign(b, { title:next.title, attribution:next.attribution, license:next.license,
      source_url:next.source_url, tradition:next.tradition });
      b.doc={ ...b.doc, summary:next.summary }; }
  } else {
    catalogEdits()[slug]={ ...(catalogEdits()[slug]||{}), ...next, editedAt:todayKey() };
  }
  persist(); logActivity('Edited the library card for "'+next.title+'".'); blip(700,.07);
  state.sidxView.edit=null; renderStewardIndex();
}
export function sidxToggleHidden(slug){
  const d=Store.getDoc(slug);
  const ed=catalogEdits();
  if(d && !d.personal){
    ed[slug]={ ...(ed[slug]||{}), hidden:true, editedAt:todayKey() };
    logActivity('Pulled a book from the shelves: "'+(d.title||slug)+'".');
  } else { // already hidden — put it back
    if(ed[slug]){ delete ed[slug].hidden; if(!Object.keys(ed[slug]).length) delete ed[slug]; }
  }
  persist(); renderStewardIndex();
}
export function sidxRestore(slug){
  const ed=catalogEdits();
  if(!ed[slug]) return;
  if(!window.confirm('Undo your changes to this card and go back to what shipped?')) return;
  delete ed[slug]; persist(); state.sidxView.edit=null; renderStewardIndex();
}
export async function sidxExportEdits(){
  const ed=catalogEdits();
  if(!Object.keys(ed).length){ alert('No corrections to export yet.'); return; }
  const json=JSON.stringify({ sandPavilionCatalogEdits:1, exported:todayKey(), edits:ed }, null, 2);
  const name='catalog-edits-'+todayKey()+'.json';
  if(typeof window!=='undefined' && window.desktopBridge?.saveFile){
    const res=await window.desktopBridge.saveFile(name, json);
    if(res.canceled) return;
    if(!res.ok){ alert('Could not write the file: '+(res.error||'unknown error')); return; }
  } else {
    const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));
    const a=document.createElement('a'); a.href=url; a.download=name;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  blip(700,.07);
  const el=document.getElementById('sidxOut'); if(el) el.innerHTML='<div class="meta" style="margin-top:8px">Written. Fold these into <code>data/seed.js</code> when you next touch the source, and they stop being overrides.</div>';
}
function renderStewardIndex(keepFocus){
  const el=document.getElementById('stewardIdxPanel'); if(!el) return;
  const v=state.sidxView||(state.sidxView={q:'',edit:null});
  const ed=catalogEdits();
  const hidden=Object.entries(ed).filter(([,o])=>o&&o.hidden).map(([s])=>s);
  const docs=Store.allDocs();

  if(v.edit){
    const d=Store.getDoc(v.edit);
    if(!d){ v.edit=null; return renderStewardIndex(); }
    const shelves=[...(data.myShelves||[]), ...TRADITIONS];
    el.innerHTML=`
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <div class="row" style="margin-bottom:8px"><button class="btn ghost" onclick="sidxCancel()">← All books</button></div>
      <h2>✎ ${esc(d.title||d.slug)}</h2>
      <div class="meta">${d.personal?visBadge('private','your own book — edits apply directly')
        :visBadge('commons','a certified card — your edits are kept as a correction layer over the shipped entry')}
        · <code>${esc(d.slug)}</code></div>
      <label style="margin-top:12px">Title</label><input type="text" id="sidxTitle" value="${esc(d.title||'')}">
      <label>Author / attribution</label><input type="text" id="sidxAttr" value="${esc(d.attribution||'')}">
      <label>Licence</label><input type="text" id="sidxLicense" value="${esc(d.license||'')}">
      <label>Source</label><input type="text" id="sidxSource" value="${esc(d.source_url||'')}">
      <label>Shelf</label>
      <select id="sidxShelf">${shelves.map(s=>`<option value="${esc(s)}"${d.tradition===s?' selected':''}>${esc(s)}</option>`).join('')}
        <option value="Personal"${d.tradition==='Personal'?' selected':''}>Personal / unfiled</option></select>
      <label>Summary</label><textarea id="sidxSummary" rows="5">${esc((d.doc&&d.doc.summary)||'')}</textarea>
      <div class="meta" style="margin-top:8px">The book's <b>text</b> is never touched here — only its card. Moving it to another shelf moves where it stands in the building.</div>
      <div class="row" style="margin-top:14px;gap:6px;flex-wrap:wrap">
        <button class="btn" onclick="sidxSave('${esc(d.slug)}')">Save the card</button>
        <button class="btn ghost" onclick="openReader('${esc(d.slug)}')">Open it</button>
        ${!d.personal&&ed[d.slug]?`<button class="btn ghost" onclick="sidxRestore('${esc(d.slug)}')">↺ Back to what shipped</button>`:''}
        ${!d.personal?`<button class="btn ghost" style="border-color:var(--danger);color:var(--danger-soft)" onclick="sidxToggleHidden('${esc(d.slug)}')">Pull it from the shelves</button>`
          :`<button class="btn ghost" style="border-color:var(--danger);color:var(--danger-soft)" onclick="removePersonalBook('${esc(d.slug)}','sidx')">Remove the book</button>`}
      </div>`;
    return;
  }

  const q=(v.q||'').trim().toLowerCase();
  const list=docs.filter(d=>!q || ((d.title||'')+' '+(d.tradition||'')+' '+(d.license||'')+' '+(d.slug||'')).toLowerCase().includes(q));
  const editedCount=Object.keys(ed).filter(k=>!ed[k].hidden).length;
  el.innerHTML=`
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>🗂 The Steward's Index</h2>
    <div class="meta">Every book in the building — certified and your own — with its card open to editing.
      Fix a wrong licence, correct an attribution, rewrite a summary, or move a book to a different shelf.
      <b>The text is never touched, only the card.</b></div>
    <div class="meta" style="margin-top:6px">Certified entries ship inside the app, so your corrections are kept as a
      <b>layer over them</b>: they take effect at once and travel with your save. Export them to fold back into the
      source properly.</div>
    <div class="row" style="margin:12px 0;gap:6px;flex-wrap:wrap;align-items:center">
      <input type="text" id="sidxSearch" value="${esc(v.q||'')}" placeholder="search all ${docs.length} books…" style="flex:1;min-width:170px" oninput="sidxSearch(this.value)">
      <button class="btn ghost" onclick="sidxExportEdits()">⤓ Export my corrections${editedCount?' ('+editedCount+')':''}</button>
    </div>
    <div id="sidxOut"></div>
    ${hidden.length?`<div class="card" style="cursor:default;border-color:#8a6a3a">
      <div class="t">Pulled from the shelves · ${hidden.length}</div>
      <div class="s">${hidden.map(s=>`<button class="btn ghost" style="font-size:11px;padding:2px 8px;margin:2px" onclick="sidxToggleHidden('${esc(s)}')">↺ ${esc(s)}</button>`).join('')}</div></div>`:''}
    <div style="margin-top:8px">
    ${list.length?list.map(d=>`<div class="card" onclick="sidxEdit('${esc(d.slug)}')">
        <div class="t">${d.personal?'👤':'🏛'} ${esc(d.title||d.slug)}${d.edited?' <span class="badge lic">corrected</span>':''}</div>
        <div class="s">${esc(d.tradition||'—')} · ${esc(d.license||'no licence recorded')}${d.doc&&d.doc.fullText?' · full text':''}</div>
      </div>`).join('')
      :'<p class="meta">Nothing matches that search.</p>'}
    </div>`;
  if(keepFocus){ const s=document.getElementById('sidxSearch'); if(s){ s.focus(); s.setSelectionRange(s.value.length,s.value.length); } }
}

/* ================================================================
   YOUR LIBRARY — the personal half, made a real place (2026-07-27).

   The problem, in the user's words: "my personal library is a bit bigger
   and a bit discombobulated, and the shelves in the game might not match
   all the choices available."

   Both halves of that were true. A personal book could only be filed
   under one of the ELEVEN fixed `TRADITIONS`, which are the *commons'*
   lineages — Theravada, Daoism, Classics… A real personal library has
   electronics, recipes, work manuals, a folder of papers. None of those
   fit, so everything landed in Non-fiction or Personal and turned into a
   pile.

   The fix keeps the two taxonomies apart instead of stretching one:
   the curated shelves in the Library rooms stay the commons' own
   ordering, and YOU get your own named shelves, as many as you like,
   which exist only in your Pavilion. Filing is then bulk-able and
   searchable, because a big library is exactly where one-at-a-time
   dropdowns stop working.
   ================================================================ */
function myShelves(){ if(!data.myShelves) data.myShelves=[]; return data.myShelves; }
function shelfOf(b){ return (b && b.tradition) || 'Personal'; }
function allShelfChoices(){ return [...myShelves(), ...TRADITIONS, 'Personal']; }
function personalBooks(){ return data.personalLibrary||[]; }

/* ================================================================
   BULK COPYRIGHT TRIAGE — 2026-07-27, from a real accident: 128 books
   imported onto one shelf in one go, many of which probably can't be
   shared.

   The rule the user set, and it is the right one: **never remove
   anything.** A book whose status isn't established doesn't get
   deleted, doesn't get hidden, and doesn't get quarantined — it gets
   moved to a personal shelf, where it needs no licence at all and is
   yours to read forever. The only thing triage changes is whether a
   book is allowed to *travel*.

   Same engine as the single-book check (data/copyright.js): rules
   read the text and decide, uncertain defaults to personal. It runs
   over the whole shelf at once and reports before it touches anything.
   ================================================================ */
const PERSONAL_ONLY_SHELF='Personal — mine to read, not to pass on';
export function runLibraryTriage(){
  const out=document.getElementById('myLibTriageOut'); if(!out) return;
  const books=personalBooks();
  if(!books.length){ out.innerHTML='<div class="meta">No books of your own to check yet.</div>'; return; }
  out.innerHTML='<div class="meta">Reading each book…</div>';
  // synchronous and fast — it reads only the head and tail of each text
  const rows=books.map(b=>{
    const ft=(b.doc&&b.doc.fullText)||{};
    const text=ft.text || (b.doc&&b.doc.sections||[]).map(x=>x.body).join('\n\n') || '';
    const v=triage({ text, license:b.license||'', source:b.source_url||'' });
    b.sharing=v.id; // remembered, so the exporters and the shelf can show it
    return { b, v };
  });
  persist();
  const open=rows.filter(r=>r.v.id==='open'), pd=rows.filter(r=>r.v.id==='pd');
  const closed=rows.filter(r=>r.v.id==='copyright'), unk=rows.filter(r=>r.v.id==='unknown');
  const stay=[...closed,...unk];
  const already=stay.filter(r=>shelfOf(r.b)===PERSONAL_ONLY_SHELF).length;
  out.innerHTML=`
    <div class="card" style="cursor:default;margin-top:10px">
      <div class="t">⚖ ${rows.length} book${rows.length===1?'':'s'} checked</div>
      <div class="s" style="margin-top:6px">
        <b style="color:#7fa36b">${open.length}</b> carry an open licence ·
        <b style="color:#7fa36b">${pd.length}</b> look public domain ·
        <b style="color:#c8574a">${closed.length}</b> look to be in copyright ·
        <b style="color:#c8a04a">${unk.length}</b> can't be established either way
      </div>
      <div class="meta" style="margin-top:8px"><b>Nothing has been deleted, hidden, or changed.</b>
        Every one of these is still on your shelves and still readable — a personal copy never needs a
        licence. The only question here is which ones may <i>travel</i> in a bequest or a packet.</div>
      ${stay.length? `<div class="meta" style="margin-top:8px">
          <b>${stay.length}</b> should stay yours alone${already?` (${already} already are)`:''}. Moving them
          to their own shelf keeps them out of anything shareable without touching the books themselves.</div>
        <div class="row" style="margin-top:8px">
          <button class="btn" onclick="applyTriageMove()">📥 Move those ${stay.length} to “${esc(PERSONAL_ONLY_SHELF)}”</button>
        </div>`
        : '<div class="meta" style="margin-top:8px">Everything of yours can be passed on freely. That is unusual and rather nice.</div>'}
    </div>
    ${stay.length?`<div style="max-height:240px;overflow:auto;margin-top:10px">
      ${stay.slice(0,60).map(r=>`<div class="card" style="cursor:default">
        <div class="t" style="font-size:12.5px">${r.v.id==='copyright'?'🔒':'❔'} ${esc(r.b.title||'Untitled')}</div>
        <div class="s">${esc(r.v.reasons[0]?r.v.reasons[0].what:'nothing in the text establishes it either way')}</div>
      </div>`).join('')}
      ${stay.length>60?`<div class="meta">…and ${stay.length-60} more.</div>`:''}
    </div>`:''}
    <div class="meta" style="margin-top:8px">A recommendation, not a legal opinion — copyright differs by
      country and only you can decide. When it isn't sure, it says so and keeps the book personal.</div>`;
  blip(660,.07);
}
export function applyTriageMove(){
  const books=personalBooks();
  const moving=books.filter(b=>(b.sharing==='copyright'||b.sharing==='unknown') && shelfOf(b)!==PERSONAL_ONLY_SHELF);
  if(!moving.length) return;
  if(!myShelves().includes(PERSONAL_ONLY_SHELF)) myShelves().push(PERSONAL_ONLY_SHELF);
  moving.forEach(b=>{ b.priorShelf=shelfOf(b); b.tradition=PERSONAL_ONLY_SHELF; });
  persist();
  logActivity('Moved '+moving.length+' book(s) to a personal-only shelf after a copyright check.');
  blip(700,.08); setTimeout(()=>blip(880,.09),90);
  const out=document.getElementById('myLibTriageOut');
  if(out) out.innerHTML=`<div class="card" style="cursor:default;margin-top:10px;border-color:#7fa36b">
    <div class="t">Moved ${moving.length} book${moving.length===1?'':'s'}</div>
    <div class="s" style="margin-top:4px">They're on <b>${esc(PERSONAL_ONLY_SHELF)}</b>, still whole, still readable,
      and each remembers the shelf it came from — so this is reversible by hand if you disagree with any of it.
      Nothing was deleted.</div></div>`;
  renderMyLibrary();
}
export function openMyLibrary(){
  state.ui='mylib';
  /* OPEN ON WHAT IS LEFT TO DO — 2026-08-02, from real use. Reported after
     sorting a hundred books: "after i sort the books i can still see them all,
     im afraid that im gonna undo the work. is there a commit button?"

     There is nothing to commit — every move is written to the save the instant
     you make it. But the view showed the whole library either way, so an hour
     of work produced no visible change and felt unsaved right up until you
     closed it and hoped. The fear was correct about the FEEDBACK and wrong
     about the DATA, which is the worst combination.

     So: if there is a pile, the page opens on the pile. It shrinks as you work,
     which is the only reassurance that actually reassures. Everything is one
     chip away, and re-filing a sorted book is still a dropdown, exactly as
     before — the steward's own note, "we can always move a book later", is
     already true and stays true. */
  if(!state.myLibView){
    const unfiled=personalBooks().filter(b=>shelfOf(b)==='Personal').length;
    state.myLibView={ q:'', sel:{}, show: unfiled ? 'unfiled' : 'all' };
  }
  hideAllOv(); renderMyLibrary(); showOv('myLibOv');
}
export function createMyShelf(){
  const name=(window.prompt('Name a shelf of your own — anything you like:\n(e.g. Electronics · Work · Recipes · Papers to read)')||'').trim();
  if(!name) return;
  if(allShelfChoices().some(s=>s.toLowerCase()===name.toLowerCase())){ alert('You already have a shelf by that name.'); return; }
  myShelves().push(name); persist(); logActivity('Made a new shelf: "'+name+'".'); blip(700,.07);
  renderMyLibrary();
}
export function renameMyShelf(name){
  const next=(window.prompt('Rename "'+name+'" to:', name)||'').trim();
  if(!next||next===name) return;
  if(allShelfChoices().some(s=>s.toLowerCase()===next.toLowerCase())){ alert('You already have a shelf by that name.'); return; }
  const i=myShelves().indexOf(name); if(i>=0) myShelves()[i]=next;
  personalBooks().forEach(b=>{ if(b.tradition===name) b.tradition=next; }); // books move with it
  persist(); renderMyLibrary();
}
export function deleteMyShelf(name){
  const n=personalBooks().filter(b=>b.tradition===name).length;
  if(!window.confirm('Remove the shelf "'+name+'"?\n\n'+(n?n+' book(s) on it move back to Your Shelf, unfiled. Nothing is deleted.':'It is empty.'))) return;
  data.myShelves=myShelves().filter(s=>s!==name);
  personalBooks().forEach(b=>{ if(b.tradition===name) b.tradition='Personal'; });
  persist(); renderMyLibrary();
}
export function myLibSearch(v){ state.myLibView.q=v; renderMyLibrary(true); }
export function myLibToggle(slug){
  const sel=state.myLibView.sel; if(sel[slug]) delete sel[slug]; else sel[slug]=true;
  renderMyLibrary(true);
}
export function myLibSelectAll(on){
  const sel={}; if(on) myLibFiltered().forEach(b=>{ sel[b.slug]=true; });
  state.myLibView.sel=sel; renderMyLibrary(true);
}
function myLibFiltered(){
  const q=(state.myLibView.q||'').trim().toLowerCase();
  const show=state.myLibView.show||'all';
  let list=personalBooks();
  if(q) list=list.filter(b=>((b.title||'')+' '+shelfOf(b)+' '+((b.doc&&b.doc.summary)||'')).toLowerCase().includes(q));
  if(show==='unfiled') list=list.filter(b=>shelfOf(b)==='Personal');
  else if(show==='filed') list=list.filter(b=>shelfOf(b)!=='Personal');
  else if(show!=='all') list=list.filter(b=>shelfOf(b)===show);
  return list;
}
/* "There should be a distinction between the sorted and unsorted books"
   (2026-07-28). There was none: one flat list where a filed book and an
   unfiled one looked identical, so you could not see what was left to do —
   which is the only question that matters while you're sorting a pile of a
   hundred. Now the list is grouped under headers with the unfiled pile
   always first, and these chips narrow it to one group at a time. */
export function myLibShow(name){
  state.myLibView.show=name; state.myLibView.sel={}; renderMyLibrary();
}
/* Accepting what the librarian suggested. This is the half that was missing:
   the suggestions were rendered but there was no way to say yes to them, and
   setting a <select>'s value from code never fires its onchange — so they were
   inert. Reported from real use 2026-07-27 ("I saw the AI gave a suggestion and
   I couldn't approve his decision"). */
/* Filing a hundred books in one press is the most destructive single action in
   the app, and until 2026-07-28 it could not be taken back. Now every bulk
   accept records where each book came from, so one press returns all of it.
   An operation that large should never depend on the suggestion being right. */
/* ----- REVIEWING THE LIBRARIAN'S WORK, grouped by where each book is GOING.
   Built 2026-08-03, from the steward: "some books do end up in the wrong shelf
   — I think there should be a step to see the AI's work and where they would
   put them."

   The accept step already existed, and that is exactly why it failed. Each
   suggestion showed as a small green button on its own card, scattered through
   a list of 294 books, so reviewing meant scrolling and hunting for green.

   WRONGNESS IS A PROPERTY OF THE GROUP, NOT THE ROW. Read one at a time,
   "Chess Strategy → Nature" looks like any other line. Under a heading it is
   the one thing that does not belong:

       → Nature   14 books
         Walden · Our National Parks · Man and Nature · … · Chess Strategy

   And the reason is shown beside each book, because "a rule matched 'sutta'"
   and "the AI read the title" deserve different amounts of trust.

   NOTHING MOVES WITHOUT A PRESS — not even a rule-based placement. The moment
   one class of suggestion applies itself, a visitor has to remember which kind
   is which, and "a suggestion is not a decision" is the sentence this panel
   exists to keep true. */
/* One book out of a group — the fine-grained half of the review. */
export function rejectOneSuggestion(slug){
  const sug=state.myLibView.suggested||{};
  delete sug[slug];
  renderMyLibrary();
}
export function acceptShelfGroup(shelf){
  const sug=state.myLibView.suggested||{};
  const undo={}; let n=0;
  personalBooks().forEach(b=>{
    if(sug[b.slug]===shelf && shelfOf(b)!==shelf){ undo[b.slug]=b.tradition; b.tradition=shelf; n++; }
  });
  Object.keys(sug).forEach(s=>{ if(sug[s]===shelf) delete sug[s]; });
  state.myLibView.lastFiling = n ? { at:todayKey(), undo } : null;
  persist();
  logActivity('Filed '+n+' book(s) onto '+shelf+'.');
  blip(660,.07); setTimeout(()=>blip(825,.08),80);
  renderMyLibrary();
  const out=document.getElementById('myLibAiOut');
  if(out) out.textContent=`Moved ${n} book${n===1?'':'s'} to ${shelf}. Nothing was deleted, and you can undo this in one press.`;
}
/* Reject a whole group in one press — the other half of a review. Seeing
   fourteen books headed somewhere wrong and having to untick them one at a
   time is not a review, it is a chore. */
export function rejectShelfGroup(shelf){
  const sug=state.myLibView.suggested||{}; let n=0;
  Object.keys(sug).forEach(s=>{ if(sug[s]===shelf){ delete sug[s]; n++; } });
  renderMyLibrary();
  const out=document.getElementById('myLibAiOut');
  if(out) out.textContent=`Dropped the suggestion for ${n} book${n===1?'':'s'}. They stay where they were.`;
}
export function acceptAllSuggestions(){
  const sug=state.myLibView.suggested||{}; const slugs=Object.keys(sug);
  if(!slugs.length) return;
  const undo={}; let n=0;
  personalBooks().forEach(b=>{
    if(sug[b.slug] && shelfOf(b)!==sug[b.slug]){ undo[b.slug]=b.tradition; b.tradition=sug[b.slug]; n++; }
  });
  state.myLibView.suggested=null;
  state.myLibView.lastFiling = n ? { at:todayKey(), undo } : null;
  persist();
  logActivity('Accepted the librarian’s filing for '+n+' book(s).');
  blip(660,.07); setTimeout(()=>blip(825,.08),80);
  renderMyLibrary();
  const out=document.getElementById('myLibAiOut');
  if(out) out.textContent = n
    ? `Moved ${n} book${n===1?'':'s'}. Nothing was deleted, and you can undo this in one press.`
    : 'Nothing moved — every one of those was already where the librarian would have put it.';
}
export function undoLastFiling(){
  const last=state.myLibView.lastFiling; if(!last||!last.undo) return;
  let n=0;
  personalBooks().forEach(b=>{
    if(Object.prototype.hasOwnProperty.call(last.undo,b.slug)){ b.tradition=last.undo[b.slug]; n++; }
  });
  state.myLibView.lastFiling=null; persist();
  logActivity('Undid the librarian’s last filing — '+n+' book(s) put back.');
  blip(440,.07); renderMyLibrary();
  const out=document.getElementById('myLibAiOut');
  if(out) out.textContent=`Put ${n} book${n===1?'':'s'} back exactly where they were.`;
}
/* The work order is the "list the problems or request out" idea (2026-07-28):
   whatever neither rules nor the local model could place is handed back as a
   plain, pasteable request. The local model doing what it can and then naming
   precisely what it can't is more useful than it guessing — and the request is
   portable, so a bigger model in another window can finish the job. */
export function copyWorkOrder(){
  const t=(state.myLibView||{}).workOrder||''; if(!t) return;
  try{ navigator.clipboard.writeText(t); blip(760,.06);
    const el=document.getElementById('myLibAiOut');
    if(el) el.textContent='Copied — paste it to any model, then bring the answers back here.';
  }catch(e){ /* clipboard refused; the list is on screen either way */ }
}
export function dismissWorkOrder(){ if(state.myLibView) state.myLibView.workOrder=''; renderMyLibrary(); }
export function dismissSuggestions(){ state.myLibView.suggested=null; renderMyLibrary(); }
export function acceptOneSuggestion(slug){
  const sug=state.myLibView.suggested||{}; if(!sug[slug]) return;
  const b=personalBooks().find(x=>x.slug===slug); if(!b) return;
  b.tradition=sug[slug]; delete sug[slug]; persist(); renderMyLibrary();
}
export function myLibMoveSelected(){
  const to=document.getElementById('myLibMoveTo')?.value; if(!to) return;
  const sel=Object.keys(state.myLibView.sel||{}); if(!sel.length) return;
  let n=0;
  personalBooks().forEach(b=>{ if(state.myLibView.sel[b.slug]){ b.tradition=to; n++; } });
  state.myLibView.sel={}; persist();
  logActivity('Filed '+n+' book(s) onto "'+to+'".'); blip(660,.07); setTimeout(()=>blip(825,.08),80);
  renderMyLibrary();
}
/* The local model reads your own titles and suggests a shelf for each unfiled
   book, from YOUR shelf names plus the traditions. It never files anything —
   it fills the dropdowns and you press the button. Sorting a pile is exactly
   the tedious-but-judgement-y work worth handing to a model that already has
   the titles in front of it. */
/* "NEEDS A HUMAN" is a real state, not a missing shelf. The steward's own
   design, 2026-08-03: a book the sorter cannot place should be TAGGED rather
   than guessed at, so the pile visibly shrinks into two piles — the ones that
   got an answer and the ones waiting for you — instead of the same unsorted
   heap being re-asked forever.

   Stored on the book, so it survives a reload; cleared the moment the book
   gets a shelf by any route. */
function needsSort(slug){
  const b=data.personalLibrary.find(x=>x.slug===slug);
  return !!(b && b.needsSort);
}
function setNeedsSort(slug, on){
  const b=data.personalLibrary.find(x=>x.slug===slug); if(!b) return;
  if(on) b.needsSort=true; else delete b.needsSort;
}
export function clearNeedsSort(){
  let n=0;
  data.personalLibrary.forEach(b=>{ if(b.needsSort){ delete b.needsSort; n++; } });
  persist(); renderMyLibrary();
  const el=document.getElementById('myLibAiOut');
  if(el) el.textContent=n?`Cleared the “needs a look” mark from ${n} book${n===1?'':'s'}.`:'Nothing was marked.';
}
export async function suggestShelvesWithAI(){
  // look the element up EVERY time: renderMyLibrary() replaces the panel, and a
  // captured reference becomes a detached node whose text nobody ever sees.
  const say=t=>{ const el=document.getElementById('myLibAiOut'); if(el) el.textContent=t; };
  // Whatever you have selected, else whatever your search is showing, else the
  // unfiled pile. Misfiling a whole import onto one shelf is the normal
  // accident (128 books onto Theravada, in the case that prompted this), and
  // "only unfiled" would have been useless for exactly that.
  /* THE LIBRARIAN NEVER TOUCHES A BOOK YOU HAVE ALREADY PLACED (fixed
     2026-07-28, from real use: "the AI undoes all the work I did when sorting,
     and does nothing after sorting like 20 books").

     Three separate faults, all mine, all in these five lines:

     1. The pool included ALREADY-FILED books whenever anything was selected —
        and "Select all" is the natural gesture on a big library. Every one of
        them got a "suggestion", and Accept All wrote it back. Where a rule
        disagreed with a deliberate human choice, the human choice lost
        silently. That is the "undoes all the work I did", and it is the worst
        kind of bug this project can have: it destroys the exact thing the app
        exists to help you build.

     2. A hard `slice(0,60)` silently dropped everything past sixty. With 105
        books, forty-five were never even looked at — and if the first sixty
        were already filed, the entire budget was spent re-confirming books
        that needed nothing. That is the "does nothing after sorting like 20
        books": it reports a big number and changes nothing that mattered.

     3. Suggestions that merely restated a book's current shelf were counted
        and displayed as if they were work.

     The rule now: **the librarian's job is the unfiled pile.** Re-filing books
     you have already placed is a separate, explicit, opt-in act — because
     moving something a person put somewhere on purpose needs asking, not
     assuming. */
  const v=state.myLibView;
  const refile=!!v.refileFiled;
  const sel=Object.keys(v.sel||{});
  const showing=(v.show||'all')!=='all';
  let pool = sel.length ? personalBooks().filter(b=>v.sel[b.slug])
    : ((v.q||'').trim() || showing) ? myLibFiltered()
    : personalBooks();
  const filedInPool = pool.filter(b=>shelfOf(b)!=='Personal').length;
  if(!refile) pool = pool.filter(b=>shelfOf(b)==='Personal');
  // no cap: sixty was arbitrary and silently lost the rest. Everything gets
  // looked at; the model still only ever sees the genuinely ambiguous ones.
  const unfiled=pool;
  if(!unfiled.length){
    return say(filedInPool
      ? `Those ${filedInPool} are already on shelves, so there is nothing to sort. Ticking “also re-file books I have already placed” below would let the librarian second-guess them — off by default, because you put them there on purpose.`
      : 'Nothing to sort — select some books, search for a shelf, or leave some unfiled.');
  }
  const shelves=allShelfChoices().filter(s=>s!=='Personal');

  /* RULES FIRST, MODEL SECOND (2026-07-28) — the standing budget rule: only ask
     a model for what code cannot do. Most books are not ambiguous; a title with
     "Sutta" in it does not need a language model's opinion. So shelf-rules.js
     files the obvious ones instantly and only the genuine leftovers go to a
     model. Faster, cheaper, more reliable (a rule cannot hallucinate a shelf) —
     and, the part that matters most, it works with NO AI AT ALL, which is the
     whole point for a laptop that can't run one. */
  const alreadyFiled=personalBooks().filter(b=>shelfOf(b)!=='Personal');
  const { filed:byRule, unsure:allUnsure } = preSortShelves(unfiled, shelves, alreadyFiled);
  /* SUGGESTIONS ACCUMULATE ACROSS PASSES. `picks` used to start empty every
     press, so the second bite silently threw away the twenty answers the
     first one had earned — the visitor pressed again to make progress and
     went backwards. Caught 2026-08-03 by running two passes and reading the
     numbers, which is the only way it would ever have shown. */
  const picks=Object.assign({}, state.myLibView.suggested||{});
  const why=Object.assign({}, state.myLibView.suggestWhy||{});
  /* AND A BOOK THAT ALREADY HAS AN ANSWER IS NOT STILL "UNSURE". Without
     this the next bite re-asked books that were waiting to be accepted, so
     the pile never went down and the same titles came round again — the
     "first 7 over and over" wearing new clothes. A book marked `needs a
     look` is also settled for now; ↺ clears it to try again. */
  const unsure=allUnsure.filter(b=>!picks[b.slug] && !needsSort(b.slug));
  // a "suggestion" that puts a book back where it already is is not work, and
  // counting it as work is how the report came to say 60 while nothing changed
  const shelfNow={}; personalBooks().forEach(b=>{ shelfNow[b.slug]=shelfOf(b); });
  byRule.forEach(f=>{ if(shelfNow[f.slug]===f.shelf) return; picks[f.slug]=f.shelf; why[f.slug]=f.why; });
  /* Only what the RULES placed, not the running total — `picks` now carries
     earlier passes forward, so counting it here would report "filed 40 by
     rule" on the second press of a library the rules touched four times. */
  const ruled=byRule.filter(f=>shelfNow[f.slug]!==f.shelf).length;

  if(!isAIActive()){
    // No model? The rules still did real work — show it rather than refusing.
    state.myLibView.suggested=picks; state.myLibView.suggestWhy=why;
    state.myLibView.workOrder=unsortedWorkOrder(unsure, shelves);
    renderMyLibrary();
    return say(ruled
      ? `Filed ${ruled} of ${unfiled.length} by rule alone — no AI needed. ${unsure.length} still need a look; nothing has moved yet.`
      : 'No local AI connected (⚙ Manage AI connections), and no rule matched these titles. Filing by hand works exactly the same.');
  }
  if(!unsure.length){
    state.myLibView.suggested=picks; state.myLibView.suggestWhy=why;
    state.myLibView.workOrder=''; renderMyLibrary();
    return say(`Filed all ${ruled} by rule — the AI wasn't needed at all. Nothing has moved yet.`);
  }

  /* A HANDFUL AT A TIME (2026-07-28). Sixty titles in one ask is the same
     mistake the lesson-drafting made: a small model given a long list files
     the first few, invents shelves for the middle, and quietly drops the rest —
     which is exactly the "nothing matched your titles closely enough" answer
     seen in testing. Eight at a time it gets right, and a partial run is still
     worth something, because each batch's picks are kept even if a later one
     fails. It also gives the person a real count instead of a spinner. */
  /* ONE BOUNDED BITE THAT ADVANCES — rebuilt 2026-08-03 to the steward's own
     design, after he reported the sorter "tries to do everything and
     highlights like the first 7 over and over again."

     He was right twice. It looped over EVERY batch with no bound and no stop:
     a hundred unsure books is thirteen sequential model calls and six-plus
     minutes of frozen panel, so in practice the first batch or two landed and
     the rest never did — and because the pool is rebuilt from the same pile in
     the same order, the next press asked about the SAME eight titles again.

     So one press does ONE bite, and then:
       · books it placed are DESELECTED, so the next press takes new ones;
       · books it cannot place are TAGGED for a human, not guessed at.

     THE MODEL MAY SAY IT DOES NOT KNOW. Probed 2026-08-03: with no such
     option it filed Wealth of Nations, Wigwam Evenings, Ten Acres Enough and
     The Boy Mechanic all onto "Practice" — the shelf it dumps into when
     stuck. shelf-rules.js's whole discipline is ONLY ACT WHEN CERTAIN, and the
     AI stage had no way to honour it. */
  const SORT_BATCH=20;
  const group=unsure.slice(0, SORT_BATCH);
  const remaining=unsure.length-group.length;
  let n=0, flickered=false, unknown=0;
  say(`Filed ${ruled} by rule. Asking the AI about ${group.length}${remaining?' of '+unsure.length:''}…`);
  try{
    const reply=await AI.chat([
      {role:'system', content:WORK_CHARTER+'\n\nYou file books onto shelves. Answer ONLY with lines of the form '
        +'`TITLE => SHELF`, one per book, nothing else. SHELF must be copied exactly from the allowed list, '
        +'or the single word UNKNOWN. Use UNKNOWN whenever a title does not clearly belong to one of these '
        +'shelves — a wrong shelf is worse than none, because it is a book its owner will never find again. '
        +'Do not spread uncertain books across shelves to seem helpful.'},
      {role:'user', content:`Allowed shelves: ${shelves.join(' | ')}\n\nFile these ${group.length}:\n${group.map(b=>'- '+b.title).join('\n')}`},
    ]);
    if(!isEmptyReply(reply)){
      for(const line of String(reply).split('\n')){
        const m=line.match(/^\s*[-*]?\s*(.+?)\s*=>\s*(.+?)\s*$/); if(!m) continue;
        const title=m[1].trim().toLowerCase(), raw=m[2].trim();
        const b=group.find(x=>(x.title||'').trim().toLowerCase()===title);
        if(!b) continue;
        if(/^unknown\b/i.test(raw)){ setNeedsSort(b.slug,true); unknown++; continue; }
        const shelf=shelves.find(s=>s.toLowerCase()===raw.toLowerCase());
        if(!shelf) continue;
        if(shelfNow[b.slug]===shelf) continue;   // already there; not a change
        picks[b.slug]=shelf; why[b.slug]='the AI read the title'; n++;
        setNeedsSort(b.slug,false);              // it has an answer now
      }
    }
  }catch(e){ flickered=true; }

  /* Silence is not a shelf. Anything in this bite the model said nothing about
     is also a book a human needs to look at. */
  for(const b of group){ if(!picks[b.slug] && !needsSort(b.slug)){ setNeedsSort(b.slug,true); unknown++; } }
  /* DESELECT WHAT WAS HANDLED — the thing that makes the next press advance
     rather than re-ask the same titles forever. */
  if(state.myLibView.sel) for(const b of group) delete state.myLibView.sel[b.slug];
  persist();

  const stillStuck=unsure.filter(b=>!picks[b.slug]);
  state.myLibView.suggested=picks; state.myLibView.suggestWhy=why;
  state.myLibView.workOrder=unsortedWorkOrder(stillStuck, shelves);
  renderMyLibrary();
  /* SAY WHAT JUST HAPPENED AND WHAT IS LEFT. A bounded pass only feels like
     progress if the number going down is visible; without that it reads as
     the same button doing the same nothing. */
  const total=Object.keys(picks).length;
  const bits=[];
  if(ruled) bits.push(`Filed ${ruled} by rule alone.`);
  if(n) bits.push(`The AI placed <b>${n}</b> of the ${group.length} it looked at.`);
  if(unknown) bits.push(`<b>${unknown}</b> it could not place honestly — those are marked <b>needs a look</b> rather than guessed at.`);
  if(flickered) bits.push('The connection dropped part-way.');
  if(remaining>0) bits.push(`<b>${remaining}</b> still to go — press again for the next ${Math.min(remaining,20)}.`);
  else if(n||unknown) bits.push('That is the whole pile.');
  bits.push(total ? 'Nothing has moved yet: accept them, or change any first. A suggestion is not a decision.'
                  : 'Nothing was placed this time.');
  const el=document.getElementById('myLibAiOut'); if(el) el.innerHTML=bits.join(' ');
}
/* Which element actually scrolls behind a panel — `.panel` doesn't, the
   `.overlay` around it does. Filing books means ticking one box after another
   in a long list, and every tick re-renders; without this the list snapped back
   to the top each time and you lost your place after every single book.
   Reported from real use 2026-07-28. */
function scrollerFor(el){
  for(let n=el; n; n=n.parentElement){ if(n.scrollHeight>n.clientHeight+4) return n; }
  return null;
}
function renderMyLibrary(keepFocus){
  const el=document.getElementById('myLibPanel'); if(!el) return;
  const sc=scrollerFor(el), keptScroll=sc?sc.scrollTop:0;
  const v=state.myLibView||(state.myLibView={q:'',sel:{}});
  const books=personalBooks(), list=myLibFiltered();
  const selCount=Object.keys(v.sel||{}).length;
  const sug=v.suggested||{}; const sugCount=Object.keys(sug).length;
  const titleCount={}; books.forEach(b=>{ const t=(b.title||'').trim().toLowerCase(); titleCount[t]=(titleCount[t]||0)+1; });
  const counts={}; books.forEach(b=>{ const s=shelfOf(b); counts[s]=(counts[s]||0)+1; });
  const mine=myShelves(), unfiled=counts['Personal']||0;
  const opts=(b)=>[`<option value="Personal"${shelfOf(b)==='Personal'?' selected':''}>— unfiled —</option>`,
      mine.length?`<optgroup label="Your shelves">${mine.map(s=>`<option value="${esc(s)}"${shelfOf(b)===s?' selected':''}>${esc(s)}</option>`).join('')}</optgroup>`:'',
      `<optgroup label="The Library's own">${TRADITIONS.map(t=>`<option value="${esc(t)}"${shelfOf(b)===t?' selected':''}>${esc(t)}</option>`).join('')}</optgroup>`].join('');
  el.innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>👤 Your Library ${visBadge('private')}</h2>
    <div class="meta">Everything you brought in yourself — <b>${books.length}</b> book${books.length===1?'':'s'}.
      No license and no source needed here, ever: a personal copy is your business, not the commons'.
      Papers, drafts, a manual, something you wrote — all of it belongs on this shelf.</div>
    <div class="row" style="margin:12px 0;gap:6px;flex-wrap:wrap">
      <button class="btn" onclick="openBookIntake()">＋ Add a book or paper</button>
      <button class="btn ghost" onclick="openShelf('Personal')">📚 Read from the shelf</button>
      <button class="btn ghost" onclick="openNotesLog()">🗒 My notes</button>
      <button class="btn ghost" onclick="createMyShelf()">＋ New shelf of my own</button>
    </div>

    <h3>Your shelves</h3>
    <div class="meta">The Library's own shelves are its lineages — they were never going to fit a real
      personal collection. Make your own: Electronics, Work, Recipes, Papers to read. They exist only here.</div>
    <div style="margin-top:8px">
      ${mine.length ? mine.map(s=>`<div class="card" style="cursor:default">
          <div class="t">📗 ${esc(s)} <span class="badge lic">${counts[s]||0}</span></div>
          <div class="row" style="margin-top:6px;gap:6px">
            <button class="btn ghost" style="font-size:11px;padding:2px 8px" onclick="openShelf('${esc(s).replace(/'/g,'')}')">Open</button>
            <button class="btn ghost" style="font-size:11px;padding:2px 8px" onclick="renameMyShelf('${esc(s).replace(/'/g,'')}')">Rename</button>
            <button class="btn ghost" style="font-size:11px;padding:2px 8px;border-color:var(--danger);color:var(--danger-soft)" onclick="deleteMyShelf('${esc(s).replace(/'/g,'')}')">Remove</button>
          </div>
        </div>`).join('')
        : '<p class="meta">None yet. If your library feels like a pile, this is the cure — name a few shelves that match what you actually own.</p>'}
      ${unfiled?`<div class="card" style="cursor:default;border-color:#8a6a3a">
          <div class="t">📥 Unfiled <span class="badge lic">${unfiled}</span></div>
          <div class="s">Books with no shelf of their own yet. Sort them below.</div></div>`:''}
    </div>

    <h3 style="margin-top:18px">Sort them out</h3>
    <div class="row" style="gap:6px;align-items:center;flex-wrap:wrap">
      <input type="text" id="myLibSearch" value="${esc(v.q||'')}" placeholder="search your books…" style="flex:1;min-width:160px" oninput="myLibSearch(this.value)">
      <button class="btn ghost" style="font-size:11px;padding:3px 10px" onclick="myLibSelectAll(true)">Select all${v.q?' shown':''}</button>
      <button class="btn ghost" style="font-size:11px;padding:3px 10px" onclick="myLibSelectAll(false)">None</button>
    </div>
    <div class="row" style="gap:6px;align-items:center;margin-top:8px;flex-wrap:wrap">
      <button class="btn ghost" onclick="suggestShelvesWithAI()">✨ Have the librarian sort these</button>
      <!-- NOTHING MAY BE A DEAD END, and a panel with no door is unbuilt (the
           Lab's lesson). This is where books already are, so this is where the
           question about them belongs. Needs no AI. -->
      <button class="btn ghost" onclick="openNeedsChapters()">🔖 Books not divided yet</button>
      <label class="s" style="display:flex;align-items:center;gap:5px;opacity:.85;cursor:pointer" title="Off by default: a book you filed yourself was filed on purpose">
        <input type="checkbox" ${v.refileFiled?'checked':''} onchange="toggleRefileFiled()" style="width:auto;margin:0">
        also re-file books I've already placed
      </label>
      <button class="btn ghost" onclick="runLibraryTriage()" title="Check every book's licence — nothing is ever deleted">⚖ Which of these can I pass on?</button>
      <button class="btn ghost" onclick="repairBookAuthors()" title="Books added before 2026-08-03 lost their author on the way in — this reads it back out of the book's own text">✎ Recover missing authors</button>
      <button class="btn ghost" onclick="clearNeedsSort()" title="Clear the “needs a look” marks so the librarian will try those books again">↺ Clear “needs a look” marks</button>
    </div>
    <div class="meta" id="repairOut" style="margin-top:6px"></div>
    <div class="meta" id="myLibAiOut" style="margin-top:6px"></div>
    ${v.lastFiling?`<div class="card" style="cursor:default;margin-top:8px;border-color:#8a6a3a">
        <div class="t">↩ The last filing moved ${Object.keys(v.lastFiling.undo||{}).length} book(s)</div>
        <div class="s" style="margin-top:4px">Not what you wanted? Put every one of them back exactly where it was.</div>
        <div class="row" style="margin-top:8px"><button class="btn" onclick="undoLastFiling()">↩ Undo that filing</button></div>
      </div>`:''}
    ${v.workOrder?`<div class="card" style="cursor:default;margin-top:10px;border-color:#8a6a3a">
        <div class="t">📋 ${v.workOrder.split(String.fromCharCode(10)).filter(l=>l.startsWith('- ')).length} nothing could place</div>
        <div class="s" style="margin-top:4px">Not a failure — a list. Being unable to finish is worth saying out loud;
          an unlabelled gap isn't. Sort these by hand below, or take the request to a bigger model in another window
          and paste its answer back.</div>
        <div class="row" style="margin-top:8px;gap:6px;flex-wrap:wrap">
          <button class="btn ghost" style="font-size:11px;padding:3px 10px" onclick="copyWorkOrder()">📋 Copy the request</button>
          <button class="btn ghost" style="font-size:11px;padding:3px 10px" onclick="dismissWorkOrder()">✕ Hide</button>
        </div></div>`:''}
    <div id="myLibTriageOut"></div>
    ${sugCount?(()=>{
      /* Grouped by DESTINATION — see acceptShelfGroup() above for why that is
         the whole point rather than a layout preference. */
      const groups={};
      personalBooks().forEach(b=>{ const s=sug[b.slug]; if(s) (groups[s]=groups[s]||[]).push(b); });
      const order=Object.entries(groups).sort((a,b)=>b[1].length-a[1].length);
      return `<div class="card" style="cursor:default;margin-top:10px;border-color:#7fa36b">
        <div class="t" style="color:#7fa36b">✨ The librarian's work — ${sugCount} book${sugCount===1?'':'s'} across ${order.length} ${order.length===1?'shelf':'shelves'}</div>
        <div class="s" style="margin-top:4px"><b>Nothing has moved.</b> Read each shelf as a group — a book that does not
          belong is far easier to spot beside the others going to the same place than on its own.</div>
        ${order.map(([shelf,list])=>`
          <div style="margin-top:12px;border-top:1px solid #55432e;padding-top:8px">
            <div class="row" style="justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap">
              <b style="color:var(--gold)">→ ${esc(shelf)} <span style="opacity:.7;font-weight:normal">${list.length} book${list.length===1?'':'s'}</span></b>
              <span class="row" style="gap:6px">
                <button class="btn" style="font-size:11px;padding:3px 10px" onclick="acceptShelfGroup('${esc(shelf)}')">✓ File these ${list.length}</button>
                <button class="btn ghost" style="font-size:11px;padding:3px 10px" onclick="rejectShelfGroup('${esc(shelf)}')">✕ Not this shelf</button>
              </span>
            </div>
            <div style="margin-top:6px">
              ${list.map(b=>{
                const reason=(v.suggestWhy||{})[b.slug]||'';
                const byRule=!/read the title/i.test(reason);
                return `<div class="s" style="display:flex;gap:8px;align-items:baseline;padding:2px 0">
                  <span style="opacity:.55;font-size:10.5px;min-width:74px" title="${esc(reason)}">${byRule?'rule':'the AI'}</span>
                  <span style="flex:1">${esc(b.title||'Untitled')}</span>
                  <button class="btn ghost" style="font-size:10.5px;padding:1px 7px" onclick="rejectOneSuggestion('${esc(b.slug)}')" title="Leave this one where it is">✕</button>
                </div>`;
              }).join('')}
            </div>
          </div>`).join('')}
        <div class="row" style="margin-top:12px;gap:6px;flex-wrap:wrap;border-top:1px solid #55432e;padding-top:10px">
          <button class="btn" onclick="acceptAllSuggestions()">✓ Accept all ${sugCount}</button>
          <button class="btn ghost" onclick="dismissSuggestions()">✕ Ignore them all</button>
        </div></div>`;
    })():''}
    ${selCount?`<div class="row" style="gap:6px;align-items:center;margin-top:10px;flex-wrap:wrap">
        <b style="color:var(--gold)">${selCount} selected →</b>
        <select id="myLibMoveTo" style="width:auto;min-width:150px">
          <option value="Personal">— unfiled —</option>
          ${mine.length?`<optgroup label="Your shelves">${mine.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('')}</optgroup>`:''}
          <optgroup label="The Library's own">${TRADITIONS.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('')}</optgroup>
        </select>
        <button class="btn" onclick="myLibMoveSelected()">Move them all</button>
      </div>`:''}
    ${(()=>{
      /* THE FILED / UNFILED DISTINCTION. Chips to narrow the list, then the
         list itself grouped under headers with the unfiled pile first — so
         "how much is left to sort" is answerable at a glance instead of by
         scrolling a flat list looking at dropdowns. */
      const show=v.show||'all';
      const filedTotal=books.length-(counts['Personal']||0);
      const shelvesWith=[...mine, ...TRADITIONS].filter(s=>counts[s]);
      const chip=(key,label,n,colour)=>`<button class="btn ${show===key?'':'ghost'}" style="font-size:11px;padding:3px 10px${colour&&show!==key?';border-color:'+colour+';color:'+colour:''}" onclick="myLibShow('${esc(key)}')">${label}${n!=null?' <b>'+n+'</b>':''}</button>`;
      const chips=`<div class="row" style="gap:6px;margin-top:10px;flex-wrap:wrap;align-items:center">
        <span class="meta" style="margin:0">Show:</span>
        ${chip('all','Everything',books.length)}
        ${chip('unfiled','📥 Still to sort',counts['Personal']||0,'#8a6a3a')}
        ${chip('filed','✓ Sorted',filedTotal,'#7fa36b')}
        ${shelvesWith.map(s=>chip(s,'📗 '+esc(s),counts[s])).join('')}
      </div>
      ${(show!=='all'&&show!=='unfiled'&&show!=='filed'&&counts[show]>4)
        /* Offered only while you are LOOKING at one over-full shelf, which is
           the moment you notice a batch went somewhere it should not have.
           Before this, un-filing a hundred books meant opening each one and
           changing a dropdown, a hundred times — so in practice you lived with
           it, and the librarian stayed unable to help because it will not
           second-guess a book you placed. (2026-08-03) */
        ? `<div class="card" style="cursor:default;margin-top:8px;border-color:#8a6a3a">
            <div class="s">Did a whole batch land on <b>${esc(show)}</b> at once? Send the lot back to the
              unsorted pile and let the librarian file them one at a time. Nothing is deleted, and you can
              re-file any of them by hand at any point.</div>
            <div class="row" style="margin-top:7px"><button class="btn ghost" style="font-size:11px;padding:3px 10px"
              onclick="unfileShelf('${esc(show)}')">↩ Send all ${counts[show]} back to the pile</button></div>
          </div>` : ''}
      <div class="meta" style="margin-top:6px">
        ${(counts['Personal']||0)
          ? `<b style="color:#8a6a3a">${counts['Personal']} still to sort.</b> `
          : `<b style="color:#7fa36b">Nothing left to sort.</b> `}
        Every move is saved the moment you make it — there is nothing to commit and no way to
        lose the work. Books you file leave this pile; they are never gone, just on a shelf, and
        moving one again is the same dropdown.
      </div>`;
      const card=b=>{
        const dupe=titleCount[(b.title||'').trim().toLowerCase()]>1;
        const on=!!(v.sel||{})[b.slug];
        const isUnfiled=shelfOf(b)==='Personal';
        return `<div class="card" style="cursor:default${dupe?';border-color:#e0a43c':on?'':(isUnfiled?';border-color:#8a6a3a':';border-color:#4f6b45')}${on?';box-shadow:inset 0 0 0 2px var(--gold)':''}">
          <div class="t"><input type="checkbox" ${on?'checked':''} onchange="myLibToggle('${esc(b.slug)}')" style="width:auto;margin-right:6px"> <span title="${isUnfiled?'not filed yet':'filed'}">${isUnfiled?'📥':'✓'}</span> ${b.sharing==='copyright'?'🔒 ':b.sharing==='unknown'?'❔ ':(b.sharing==='open'||b.sharing==='pd')?'🤝 ':''}${esc(b.title||'Untitled')}${dupe?' <span class="badge" style="background:rgba(224,164,60,.14);color:#e0a43c;border-color:#e0a43c">possible duplicate</span>':''}${b.needsSort?' <span class="badge" style="background:rgba(143,180,217,.14);color:#8fb4d9;border-color:#8fb4d9" title="The librarian would not guess at this one — it is waiting for you">needs a look</span>':''}</div>
          <div class="row" style="margin-top:8px;align-items:center;gap:8px;flex-wrap:wrap">
            <select id="myLibShelf_${esc(b.slug)}" onchange="movePersonalBook('${esc(b.slug)}', this.value)" style="width:auto;min-width:150px">${opts(b)}</select>
            ${sug[b.slug]?`<button class="btn" style="font-size:11px;padding:3px 10px;border-color:#7fa36b" onclick="acceptOneSuggestion('${esc(b.slug)}')" title="${esc((v.suggestWhy||{})[b.slug]||'suggested')}">✨ → ${esc(sug[b.slug])}</button>
              <span class="s" style="opacity:.75;font-size:11px">${esc((v.suggestWhy||{})[b.slug]||'')}</span>`:''}
            <button class="btn ghost" style="font-size:11px;padding:3px 10px" onclick="openReader('${esc(b.slug)}')">Open</button>
            <select onchange="setBookKind('${esc(b.slug)}', this.value)" style="width:auto;font-size:11px" title="What KIND of thing this is. Papers show up under the Computer's 'papers' command and Today notices an undissected one; datasheets get 'ds <part>'; a paper book you own has no text here but stays findable, citable, and known to the residents.">
              ${[['','a book'],['paper','📄 a paper'],['datasheet','⚙ a datasheet'],['physical','📕 owned on paper']]
                .map(([k,l])=>`<option value="${k}"${(b.kind||'')===k?' selected':''}>${l}</option>`).join('')}
            </select>
            ${b.kind==='datasheet'&&b.part?`<span class="badge lic" style="font-size:10.5px">${esc(b.part)}</span>`:''}
            <button class="btn ghost" style="font-size:11px;padding:3px 10px;border-color:var(--danger);color:var(--danger-soft)" onclick="removePersonalBook('${esc(b.slug)}','mylib')">Remove</button>
          </div>
        </div>`;
      };
      if(!list.length) return chips+`<p class="meta" style="margin-top:12px">${
        books.length?'Nothing here — try another group, or clear the search.'
        :'No books of your own yet — ＋ Add a book or paper above. A .txt or .epub, dragged in, with no license needed.'}</p>`;
      // one group, or grouped-with-headers when showing everything
      const groups=[];
      if(show==='all'){
        const un=list.filter(b=>shelfOf(b)==='Personal');
        if(un.length) groups.push(['📥 Still to sort', un, '#8a6a3a', 'Books with no shelf yet. This is the pile.']);
        [...mine, ...TRADITIONS].forEach(s=>{
          const g=list.filter(b=>shelfOf(b)===s);
          if(g.length) groups.push(['📗 '+s, g, '#7fa36b', null]);
        });
      } else groups.push([null, list, null, null]);
      return chips+`<div style="margin-top:10px">${groups.map(([head,g,colour,note])=>`
        ${head?`<h3 style="margin:16px 0 4px;color:${colour}">${esc(head)} <span class="badge lic">${g.length}</span></h3>
          ${note?`<div class="meta" style="margin-bottom:6px">${note}</div>`:''}`:''}
        ${g.map(card).join('')}`).join('')}</div>`;
    })()}`;
  if(keepFocus){ const s=document.getElementById('myLibSearch'); if(s){ s.focus(); s.setSelectionRange(s.value.length,s.value.length); } }
  // put the reader back exactly where they were — see scrollerFor() above
  if(sc && keptScroll) sc.scrollTop=keptScroll;
}
/* ----- BRING A BOOK IN — the Library's intake table (2026-07-28).

   From the first real handover: *"the main thing we should focus on is letting
   people know how the Caravan Desk works and how it helps people add books."*

   The diagnosis was placement AND naming. Adding a book was only ever explained
   at the Caravan Desk — in the Workshop, three rooms away, under a name that
   tells you nothing about what it does. So the single most important action in
   the whole Pavilion, the one the entire project is built around, was findable
   only by accident.

   This is the fix, and it is deliberately not a move: the Caravan Desk keeps the
   connector output and the review queue, which are genuinely workshop work. What
   comes to the Library is the *everyday act* — bringing a book in — standing
   beside the shelf it lands on, under a name that is an instruction rather than
   a noun. It teaches drag-and-drop first, because that is the path that works
   from any website in the world and needs nothing installed. */
/* Where Electron's app.getPath('userData') actually lands, per platform. The
   first version of this panel hard-coded the Windows path, which would have
   been a confident lie on the very machines the first testers use — caught
   2026-07-28 while auditing for a Mac build. Electron's own rules:
     win32  → %APPDATA%\<name>
     darwin → ~/Library/Application Support/<name>
     linux  → ~/.config/<name>                                            */
function isMacish(){ return /Mac|iPhone|iPad/.test(navigator.userAgent || navigator.platform || ''); }
function isWindowsish(){ return /Win/.test(navigator.userAgent || navigator.platform || ''); }
function libraryFolderPath(){
  if(isMacish()) return '~/Library/Application Support/sand-pavilion/library/';
  if(isWindowsish()) return '%APPDATA%\\sand-pavilion\\library\\';
  return '~/.config/sand-pavilion/library/';
}
function libraryFolderHint(){
  if(isMacish()) return 'In Finder, press ⇧⌘G and paste that in.';
  if(isWindowsish()) return "Paste that into the address bar of any Explorer window.";
  return 'Paste that into your file manager.';
}
/* WHERE THE NEXT BOOK WILL GO, SAID BEFORE IT GOES THERE.

   Asked for 2026-08-10: "the docker pathway shuld be the main but dont
   ignore a place for a new user to put notes and books either ... add a
   pathway into the game of where to send it."

   Until now the app decided silently — MinIO if it answered, else a file,
   else inline — and told you afterwards, in a toast, in passing. Which
   home you get changes how many books fit and whether they survive a
   container reset, so it is worth one line BEFORE you drop a 5 MB file
   rather than a shrug after. The decision itself is in
   data/book-storage.js, which is pure and tested; this only renders it. */
function destinationLine(){
  const bridge = window.desktopBridge;
  const dest = nextDestination(Store.allDocs(), {
    hasDocker: !!(bridge && bridge.minioWrite),
    hasFiles:  !!(bridge && bridge.libraryWrite),
    cap: bookCap(),
  });
  const colour = dest.full ? '#c8574a' : dest.where === 'docker' ? '#7fa36b' : '#c9a227';
  /* AND A DOOR TO THE ROOM THAT EXPLAINS IT. Saying where the text goes
     without saying how to change that is half an answer — and this is the
     moment a person actually cares, standing over a file they are about to
     drop. Shown only when Docker is NOT already carrying it, because the
     offer is meaningless once it has been taken. */
  const offer = dest.where === 'docker' ? '' :
    ` <button class="btn ghost" style="font-size:11px;padding:2px 8px;margin-left:6px"
        onclick="openStorage()">📦 give it more room</button>`;
  return `<div class="meta" style="margin-top:8px;color:${colour}">
    <b>The text of your next book goes:</b> ${esc(dest.line)}${offer}</div>`;
}

export function openBookIntake(){
  state.ui='intake'; hideAllOv();
  const desktop=!!(window.desktopBridge && window.desktopBridge.isDesktop);
  const mine=personalBooks().length;
  document.getElementById('intakePanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>📥 Bring a Book In ${visBadge('private')}</h2>
    <div class="meta">Everything you add lands on <b>your own shelf</b> — no licence asked, no source
      required, nothing sent anywhere. You have <b>${mine}</b> book${mine===1?'':'s'} of your own so far.</div>
    ${destinationLine()}

    <div class="card" style="cursor:default;margin-top:12px;border-color:#7fa36b">
      <div class="t" style="color:#7fa36b;font-size:15px">1 · Drag the file onto this window</div>
      <div class="s" style="margin-top:6px">That is the whole method. A <b>.txt</b> or an <b>.epub</b>, dragged
        from your Downloads folder and dropped <b>anywhere on the Pavilion</b> — you do not need to be on this
        screen, or in the Library, or anywhere in particular. It lands on your shelf and is readable at once.</div>
      <div class="s" style="margin-top:6px">Drop a whole pile at once if you like. This is the way in that
        works for <i>every</i> website, even the ones with no tidy button — if your browser can download it,
        the Pavilion can shelve it.</div>
    </div>

    <div class="card" style="cursor:default;margin-top:10px">
      <div class="t">2 · Or type it in by hand</div>
      <div class="s" style="margin-top:5px">For a chapter you copied, a paper, something you wrote yourself, or
        anything that isn't a file yet. Paste the text, give it a title, choose a shelf.</div>
      <div class="row" style="margin-top:8px"><button class="btn" onclick="newReviewManualForm2()">＋ Add a text by hand</button></div>
      <div class="s" style="margin-top:8px;opacity:.85"><b>Adding a paper?</b> Add it exactly like a book —
        drop the file, or paste the text. Then open <b>👤 Your Library</b> and set its kind to <b>a paper</b>.
        That one setting is what makes it show up under the Computer's <code>papers</code> command, and what lets
        <b>☀ Today</b> notice when you have brought one in and never pulled it apart.</div>
    </div>

    <div class="card" style="cursor:default;margin-top:10px;border-color:#8fb4d9">
      <div class="t" style="color:#8fb4d9">3 · A datasheet, or a book you own on paper</div>
      <div class="s" style="margin-top:5px">Both go in the same way, and both get set in <b>👤 Your Library</b> under
        <i>what kind of thing this is</i>.</div>
      <div class="s" style="margin-top:6px"><b>⚙ A datasheet</b> — the PDF a part comes with.
        <code>tools/caravan/pdf-to-text.py</code> turns one into text you can drop in. Give it the part number and
        the Computer will reach it with <code>ds&nbsp;&lt;part&gt;</code> — which is the only way anyone ever
        actually wants to open a datasheet.</div>
      <div class="s" style="margin-top:6px"><b>📕 A book you own on paper</b> — a real book, on a real shelf, that
        you cannot scan and shouldn't. Add it with <b>just the title and author</b> and leave the text empty; that
        is expected, not a failure. It stays findable, holds your page notes, can be cited in an investigation, and
        <b>the residents will know you own it</b> — so the answer becomes "you have that one, chapter 4, go and
        look" instead of a thinner explanation from memory. That last part is the whole reason to bother.</div>
    </div>

    <h3 style="margin-top:18px">Where it came from — the four kinds</h3>
    <div class="meta">Two different questions get muddled together everywhere else, so they're kept
      apart here. <b>What a text's licence lets you do</b> is one thing — the Pavilion already works
      that out for you when you add one. <b>Where you got it</b> is a separate question with a separate
      answer, and no amount of reading the file will tell you which happened. The same book is fine to
      hold if you bought it and not fine to take from a shadow library; the bytes are identical.</div>
    <div class="card" style="cursor:default;margin-top:8px">
      ${LEVEL_ORDER.map(k=>{ const L=SOURCE_LEVELS[k]; return `
        <div class="s" style="margin-top:8px;padding-left:6px;border-left:2px solid ${L.tone}">
          <b style="color:${L.tone}">${L.mark} ${esc(L.label)}</b> — <i>${esc(L.short)}</i>
          <div style="margin-top:3px;opacity:.9">${esc(L.advice)}</div>
        </div>`; }).join('')}
      <div class="s" style="margin-top:12px;opacity:.9"><b>Where the line actually is:</b> at
        <b>spreading</b>, not at holding. What you keep on your own machine for your own study is between
        you and the law where you live — the Pavilion does not scan your disk, does not refuse to open
        anything you drag in, and will never ask you to justify your own shelf. People are entitled to
        govern their own education. What <i>is</i> gated is entry to the shared commons, because that is the
        one place your decision stops being only yours.</div>
      <div class="s" style="margin-top:8px;opacity:.9">We are not the rule-makers or the enforcers. All this
        does is say clearly what's clean and what isn't, so you can decide well. (And there's no
        shadow-library fetcher, under this looser line, for a consistent reason: a tool shipped to everybody
        <i>is</i> distribution. One person dragging in one file is a personal act; a connector doing it for
        thousands is a channel.)</div>
      <div class="s" style="margin-top:8px;opacity:.9">And the clean path is the strong one, not the timid
        one: a commons anyone can check cannot be dismissed, while one stolen shelf becomes the whole story
        and buries every honest thing beside it. There's more free material than anyone has organised —
        public domain, open-access science, government publications — and organising it well is the actual
        scarce thing.</div>
    </div>

    <h3 style="margin-top:18px">Where to get books worth having</h3>
    <div class="meta">All free, all legal, all plain downloads — no account anywhere.</div>
    <div class="card" style="cursor:default;margin-top:8px">
      <div class="s"><b>Project Gutenberg</b> — <code>gutenberg.org</code> · 70,000+ public-domain books.
        Choose <b>"Plain Text UTF-8"</b> and it drops straight in. Every classic on these shelves that shows
        only a summary is there in full.</div>
      <div class="s" style="margin-top:6px"><b>Standard Ebooks</b> — <code>standardebooks.org</code> · the same
        classics, carefully typeset. Take the <b>.epub</b>.</div>
      <div class="s" style="margin-top:6px"><b>SuttaCentral</b> — <code>suttacentral.net</code> · the Pali canon
        in modern translation.</div>
      <div class="s" style="margin-top:6px"><b>arXiv</b> and <b>PubMed Central</b> — open research papers.</div>
    </div>

    <h3 style="margin-top:18px">Where they actually go</h3>
    <div class="meta">No mystery, and worth knowing before you put real work in.</div>
    <div class="card" style="cursor:default;margin-top:8px">
      ${desktop?`<div class="s">The <b>text of every book you add</b> is written as an ordinary <code>.txt</code>
        file in this app's own data folder:</div>
        <div class="s" style="margin-top:5px;color:var(--gold)"><code>${esc(libraryFolderPath())}</code></div>
        <div class="s" style="margin-top:5px">${esc(libraryFolderHint())} They are plain text — openable in any
        text editor, copyable, backup-able, yours. Nothing is locked in a database and nothing needs this app
        to read it.</div>`
      :`<div class="s">In this browser version, book text is kept in the browser's own storage for this site.
        The <b>installed desktop app</b> writes each one as an ordinary <code>.txt</code> file in a folder you
        can open, which is the better home for anything you care about.</div>`}
      <div class="s" style="margin-top:6px">The catalogue — titles, shelves, what you've read — lives in your
        save. <b>Esc → Your Data</b> accounts for all of it, and <b>⬇ Export save</b> puts the whole Pavilion,
        book text included, into one file you can carry to another machine.</div>
    </div>

    <div class="card" style="cursor:default;margin-top:14px;border-color:#8fb4d9">
      <div class="t">Looking for the Caravan Desk?</div>
      <div class="s" style="margin-top:5px">It's still in the <b>Workshop</b>, and it's for the specialist end of
        this: the review queue, and importing a batch fetched by one of the Caravan connectors. Everything a
        visitor normally needs is on this table.</div>
    </div>

    <div class="row" style="margin-top:14px;gap:6px;flex-wrap:wrap">
      <button class="btn ghost" onclick="openMyLibrary()">👤 Your Library — sort what you have</button>
      ${/* WAS openReader('filling-your-shelves') — a seed book, deleted with the
           rest of the shelf on 2026-08-10, leaving a button that opened
           nothing. The guide it pointed at is real writing and still exists;
           it is in the docs now, where a guide belongs, rather than shelved as
           if it were literature. npm test forbids a literal openReader() slug
           for exactly this reason. */''}
      <button class="btn ghost" onclick="openMenu()">☰ Everything else — the menu</button>
    </div>`;
  showOv('intakeOv');
}
/* Kept for the old entry point; the Manage panel is now Your Library. */
export function openManageLibrary(){ openMyLibrary(); }
export function newReviewManualForm2(){ state.ui='review'; state.reviewView={mode:'manual'}; hideAllOv(); renderReviewQueue(); showOv('reviewOv'); }
/* Marking a paper is a judgement only the reader can make — a PDF-converted
   preprint with no source recorded looks exactly like a book to any heuristic.
   So it is one press, reversible, and it is what the Computer's `papers` command
   and Today's "never pulled apart" both read (2026-07-28). */
export function toggleRefileFiled(){
  state.myLibView.refileFiled=!state.myLibView.refileFiled;
  state.myLibView.suggested=null; state.myLibView.suggestWhy={};
  renderMyLibrary();
}
/* What KIND of thing a shelf entry is (2026-08-02 — was a paper-only toggle).
   Four kinds now, because the electronics work made the distinctions real:
   a book you read, a paper you dissect, a datasheet you LOOK UP, and a book
   that exists on a real shelf across the room and has no text here at all.
   A datasheet is asked for its part number once, because `ds tsop38238` is
   the only way anyone ever actually wants to reach one. */
export function setBookKind(slug, kind){
  const b=personalBooks().find(x=>x.slug===slug); if(!b) return;
  b.kind = kind || undefined;
  if(kind==='datasheet' && !b.part){
    // guess the part from the title — the token with digits in it usually is one
    const guess=(b.title||'').split(/[\s,/]+/).find(w=>/\d/.test(w)&&w.length>=4)||'';
    const p=window.prompt('Part number, so you can reach it with  ds <part>  at the Computer:\n(e.g. TSOP38238 — leave blank to skip)', guess);
    if(p && p.trim()) b.part=p.trim();
  }
  if(kind!=='datasheet') delete b.part;
  persist(); renderMyLibrary();
}
export function movePersonalBook(slug, tradition){
  const b=data.personalLibrary.find(d=>d.slug===slug); if(!b) return;
  b.tradition=tradition; persist(); logActivity('Moved "'+b.title+'" to the '+tradition+' shelf.'); blip(660,.06);
  if(state.ui==='mylib') renderMyLibrary(); else renderManageLibraryLegacy();
}
function renderManageLibraryLegacy(){ /* the old panel is gone; nothing to redraw */ }
/* ----- AI-assisted shelf copy — closes the real gap the batch generator
   always had: a promoted entry's summary/sections used to be pure "TODO"
   stubs, meaning the actual editorial work never got easier. Grounded
   only in the item's own pasted text, never inventing beyond it — same
   discipline as every other AI feature here, just applied to writing
   shelf copy instead of a conversation. Still just a draft: nothing
   skips the human review this whole queue exists for. */
function reviewDraftSystemPrompt(item){
  return CHARTER
    +"\n\nYou are drafting shelf copy for the Sand Pavilion's Library — the same kind of entry "
    +"every other shelved text already has. Given the title and the actual text below, respond "
    +"in EXACTLY this format and nothing else, no preamble:\n\n"
    +"SUMMARY: <one or two sentences — what this text actually is>\n"
    +"SECTION: <a short heading> | <two to three sentences>\n"
    +"SECTION: <a short heading> | <two to three sentences>\n"
    +"(exactly 2 or 3 SECTION lines total, grounded only in the text given below — never invent "
    +"a claim about it that isn't actually there)"
    +`\n\nTitle: ${item.title}\n\nText:\n${item.body.slice(0,6000)}`;
}
function parseReviewDraft(text){
  const summaryM=text.match(/^SUMMARY:\s*(.+)$/mi);
  const sections=[...text.matchAll(/^SECTION:\s*(.+?)\s*\|\s*(.+)$/mig)].map(m=>({heading:m[1].trim(),body:m[2].trim()}));
  return (summaryM && sections.length) ? { summary:summaryM[1].trim(), sections } : null;
}
export async function draftSummaryForReviewItem(id){
  const item=data.reviewQueue.find(x=>x.id===id); if(!item) return;
  const btn=document.getElementById('reviewDraftBtn'+id);
  if(btn){ btn.disabled=true; btn.textContent='Drafting…'; }
  try{
    const reply=await AI.chat([{role:'system',content:reviewDraftSystemPrompt(item)}], {long:true});
    const draft=parseReviewDraft(reply);
    if(draft){ item.draftSummary=draft.summary; item.draftSections=draft.sections; persist(); }
  }catch(e){ /* leave undrafted — the manual TODO stub is still there in the batch export */ }
  renderReviewQueue();
}
export function generateApprovedBatch(){
  const approved=data.reviewQueue.filter(x=>x.status==='approved');
  if(!approved.length) return;
  const snippet=approved.map(item=>{
    const slug=slugify(item.title);
    const summary=item.draftSummary?JSON.stringify(item.draftSummary):"'TODO — write a real summary'";
    const sections=item.draftSections?.length
      ? item.draftSections.map(s=>`{heading:${JSON.stringify(s.heading)}, body:${JSON.stringify(s.body)}}`).join(',\n      ')
      : `{heading:'TODO', body:'TODO'}`;
    return ` { slug:'${slug}', tradition:'${item.tradition||'Practice'}', title:${JSON.stringify(item.title)},\n`
      +`   license:${JSON.stringify(item.license||'')}, source_url:${JSON.stringify(item.source||'')}, attribution:'',\n`
      +`   doc:{ summary:${summary}, sections:[\n      ${sections}\n   ] }},`;
  }).join('\n');
  document.getElementById('reviewBatchOut').innerHTML = `
    <h3>Ready to paste into seed.js (${approved.length} ${approved.length===1?'entry':'entries'})</h3>
    <div class="meta">${approved.some(i=>i.draftSummary)
      ? 'AI-drafted summaries are marked ✨ above — read them before committing, they\'re a draft, not a final review.'
      : 'Summaries/sections are stubs where no AI draft was made — writing those is still the real editorial work.'}
      One commit for the whole batch, not one per text.</div>
    <textarea rows="10" readonly>${esc(snippet)}</textarea>
    <div class="row" style="margin-top:10px"><button class="btn ghost" onclick="markBatchExported()">Mark this batch as done</button></div>`;
}
export function markBatchExported(){
  data.reviewQueue=data.reviewQueue.filter(x=>x.status!=='approved');
  persist(); logActivity('Marked a Library review batch as committed.');
  renderReviewQueue();
}

/* ----- Inventory — carry a book with you, read it from anywhere without
   walking back to its shelf. Doesn't remove it from the Library (nothing
   is depleted); it's a personal "currently carrying" list. The AI
   categorization suggestion is human-in-the-loop, same as Quill's memory
   report — a suggestion to look at, never applied on its own. */
/* THE BACKPACK IS `data.carrying` NOW (2026-08-07). `data.inventory` was a
   list of slugs and therefore could only ever hold books; carrying holds a
   {kind, ref} so a note, a chapter or a lesson travels the same way. The rules
   — the cap, the identity, what may be put down where — are in
   data/carrying.js, pure and tested, rather than inlined here.

   The old list is MIGRATED, not read: see carryMigrate() below. */
export function carryList(){
  if(!Array.isArray(data.carrying)) data.carrying=[];
  return data.carrying;
}
/* One-time lift of the old book-only backpack. Kept rather than dropped
   because someone has books in there right now, and a save that quietly
   empties your bag on upgrade is exactly the silent wrong thing. */
/* THE 27 SEED SLUGS, WHICH CAN NEVER RESOLVE AGAIN — 2026-08-10.

   The seed shelf was deleted outright. A visitor carrying one of these, or
   holding it on the set-aside shelf, is holding a reference to a book that
   no longer exists anywhere and never will again.

   The bag already handles a stale entry WELL — it shows it, says "no longer
   exists", and offers a one-press set-down (see dropStaleCarried). That is
   the right behaviour for a book that has merely been removed from a shelf,
   because the visitor might want to know which one went.

   This is different, and narrower: these 27 are gone by a decision, not by
   an accident, and no future import can bring the slug back (a re-imported
   Dhammapada arrives as `personal-the-dhammapada`). Making someone press a
   button to acknowledge our own deletion is not a boundary worth keeping.

   ONLY THESE EXACT SLUGS. Anything else stale still goes through the loud
   path — a list of known-dead names is not a licence to silently prune
   whatever fails to resolve today, which could be a book whose file is
   merely missing. */
const DELETED_SEED_SLUGS = new Set([
  'dhammapada','satipatthana','metta','anapanasati','first-sermon','dzogchen-note',
  'tao-te-ching','inner-chapters','bhagavad-gita','hearth-logbook','steward-notes',
  'on-precision','how-library-works','completing-your-pavilion','a-visitors-handbook',
  'waking-the-residents','filling-your-shelves','when-something-goes-wrong','meditations',
  'republic','nicomachean-ethics','origin-of-species','franklin-autobiography',
  'emerson-essays','art-of-war','zhuangzi','aesops-fables',
]);
function dropDeletedSeedBooks(){
  const list=carryList();
  const doomed=list.filter(e=>e && e.kind==='book' && DELETED_SEED_SLUGS.has(e.ref));
  if(!doomed.length) return;
  let out=list;
  for(const d of doomed) out=setDown(out,'book',d.ref);
  data.carrying=out;
  /* Said out loud in the log rather than swallowed: this removed something
     from a person's bag, and they get to know it happened and which. */
  logActivity('Set down '+doomed.length+' book'+(doomed.length===1?'':'s')
    +' from the old shipped shelf, which was removed: '+doomed.map(d=>d.label||d.ref).join(', ')+'.');
  persist();
}

export function carryMigrate(){
  dropDeletedSeedBooks();
  if(!Array.isArray(data.inventory) || !data.inventory.length) return;
  let list=carryList();
  for(const slug of data.inventory){
    if(DELETED_SEED_SLUGS.has(slug)) continue;   // never lift a deleted seed book across
    const d=Store.getDoc(slug);
    list=pickUp(list, {kind:'book', ref:slug, label:(d&&d.title)||slug}, todayKey()).list;
  }
  data.carrying=list; data.inventory=[]; persist();
}
export function toggleInventory(slug){
  const d=Store.getDoc(slug);
  const held=isCarrying(carryList(),'book',slug);
  if(held){ data.carrying=setDown(carryList(),'book',slug); }
  else {
    const r=pickUp(carryList(), {kind:'book', ref:slug, label:(d&&d.title)||slug}, todayKey());
    /* A FULL BACKPACK SAYS SO. Before carrying there was no cap and so no way
       to fail; now there is, and a button that silently does nothing is the
       house failure mode. The reason is already a sentence fit for a screen. */
    /* A FULL BACKPACK OFFERS THE SHELF, in one press, from where you are.
       The cap is there to focus you on what you are working on — it is not a
       limit on what you may keep, and a message that only says no would make
       it feel like one. Asked for 2026-08-07: "i dont want people to feel like
       trhere not able to hold somthing just that to focus them in whats in the
       invitoruy." */
    if(!r.ok){
      if(r.canSetAside){ shelveRefused(slug, (d&&d.title)||slug); return; }
      showToast(r.reason); return;
    }
    data.carrying=r.list;
    if(!r.already){ awardBadge('first-carry'); logActivity('Packed a book to carry with you.'); }
  }
  persist();
  const btn=document.getElementById('rdCarryBtn');
  if(btn) btn.textContent = isCarrying(carryList(),'book',slug) ? '🎒 Carrying' : '🎒 Take with you';
}
/* Set down everything whose thing is gone. One press, and it says what it did
   rather than tidying up behind your back. */
/* "NOT NOW, BUT HERE." The bag REFUSES when it is full — the steward's call,
   and one rule with no exceptions. But refusing the bag is not refusing YOU:
   the thing goes on the shelf, and the message says so and where to find it.

   Deliberately not a confirm() dialog. A modal for this would block the page
   to ask a question whose answer is always yes — nobody presses "take with
   you" and then wants the thing dropped on the floor — and it turns one press
   into two. It also hangs the live suite, which is a fair warning about how it
   feels.

   Nor is anything of YOURS displaced: the steward rejected setting down the
   oldest for exactly that reason. The bag is untouched; only the new thing
   moves, to a place with no limit, named in the message. */
export function shelveRefused(slug, title){
  const r = setAside(carryList(), {kind:'book', ref:slug, label:title}, todayKey());
  if(!r.ok){ showToast(r.reason); return; }
  data.carrying = r.list; persist();
  showToast('Backpack full at ' + CARRY_CAP + ' — "' + title + '" is on your "pick up later" shelf. '
          + 'Open your backpack to take it up. Nothing is lost.');
}
/* Off the shelf and into the bag — subject to the cap, which is the one place
   it can bite twice, so it says the same thing rather than a second wording. */
export function takeUpLater(slug){
  const r = takeUp(carryList(), 'book', slug);
  if(!r.ok){ showToast(r.reason); return; }
  data.carrying = r.list; persist(); renderInventory();
}
export function shelveCarried(slug){
  const d=Store.getDoc(slug);
  const r = setAside(carryList(), {kind:'book', ref:slug, label:(d&&d.title)||slug}, todayKey());
  if(!r.ok){ showToast(r.reason); return; }
  data.carrying = r.list; persist(); renderInventory();
}
export function dropStaleCarried(){
  // the whole bag AND the shelf: a book deleted while set aside is just as gone
  const gone=stale(carryList(), (kind,ref)=> kind!=='book' || !!Store.getDoc(ref));
  if(!gone.length) return;
  let list=carryList();
  for(const g of gone) list=setDown(list,g.kind,g.ref);
  data.carrying=list; persist();
  showToast('Set down '+gone.length+' thing'+(gone.length===1?'':'s')+' that no longer exists.');
  renderInventory();
}
/* ----- THE BACKPACK'S METER — what a resident can see, and what it costs.

   Built 2026-08-08, when the bag became grounding for the first time. The
   steward's reason for the bag is the reason this is on screen at all:

     "i wanted the back pack to serve the perpouse to make sure the condex of
      the modles dosent get blown out and so the user can fouce there attention
      on a few things and not 100 i hope we can streamline that prosses for the
      user so that game like feel is there and interacive"

   TWO LAYERS, and the split is deliberate.

   The 👁 marks and the plain sentence are ALWAYS ON. They are not a debug
   view: they are the boundary being legible, which is the difference between
   a rule and a promise. Someone who cannot tell why a resident saw one note
   and not another has no way to know the rule is holding — and rule 5 says a
   thing you cannot see is a thing nobody reports.

   The BAR and the token numbers are behind a setting, default off, at the
   steward's word: "lets make it a feature we can toggle on and off in the
   settings. super usefull for us tho!". Tokens are a technical unit and most
   visitors should never need the word; the person tuning a local model wants
   the number. ----- */
function carryMeterHtml(g, held){
  if(!held.length) return '';
  const parts=[];
  parts.push(`<b>${g.shown}</b> of ${held.length} ${held.length===1?'thing is':'things are'} visible to a resident when you ask.`);
  if(g.sealed) parts.push(`${g.sealed} 🔒 sealed — nothing reads ${g.sealed===1?'it':'them'}, even if you ask.`);
  if(g.dropped) parts.push(`${g.dropped} held back for room.`);
  if(g.gone) parts.push(`${g.gone} no longer ${g.gone===1?'exists':'exist'}.`);
  const showBar = !!(data.settings && data.settings.showContextMeter);
  const pct = Math.max(2, Math.min(100, Math.round((g.tokens / g.budget) * 100)));
  /* Over budget is a real state and it says so rather than pinning at 100%
     and looking healthy — the silent-wrong-thing this project keeps removing. */
  const over = g.tokens > g.budget;
  const bar = showBar ? `
    <div style="margin:6px 0 2px;height:9px;background:#2c2418;border:1px solid #55432e;border-radius:2px;overflow:hidden">
      <div style="height:100%;width:${pct}%;background:${over?'#c78f6f':'#7fa36b'}"></div>
    </div>
    <div class="meta" style="margin:0">~${g.tokens.toLocaleString()} of ${g.budget.toLocaleString()} tokens of room${over?' — <b>over</b>, so the rest is held back':''}.
      Measured with the same estimate the request itself uses.</div>` : '';
  return `<div class="card" style="cursor:default;border-color:#7fa36b;margin:10px 0">
    <div class="s" style="margin:0">👁 ${parts.join(' ')}</div>
    ${bar}
  </div>`;
}
/* One mark per item, so "why did it see that one" never needs explaining twice. */
function seenBadge(g, kind, ref){
  return g.seen.has(kind+':'+ref)
    ? `<span class="badge" style="border-color:#7fa36b;color:#8fbf8f" title="A resident can see this while you carry it">👁 seen</span>`
    : `<span class="badge" style="border-color:#8a7a63;color:#9c8b74" title="Not handed to a resident right now">—</span>`;
}
/* NOTES IN THE BAG WERE INVISIBLE HERE. Found by reading this function on
   2026-08-08: it rendered `carriedOf(carryList(),'book')` and nothing else, so
   a note you carried — and carryNote() has existed since 2026-08-07 — simply
   did not appear. With the bag now grounding, a panel that shows only half of
   what a resident reads is worse than one that shows none of it. */
function carriedNotesHtml(g){
  const notes=carriedOf(carryList(),'note');
  const others=carriedOf(carryList(),'chapter').concat(carriedOf(carryList(),'lesson'));
  if(!notes.length && !others.length) return '';
  const all=gatherNotes();
  const row=(e,icon,label,extra)=>`
    <div class="card" style="cursor:default">
      <div class="t">${icon} ${esc(label)} ${seenBadge(g,e.kind,e.ref)} ${e.kind==='note'?reachBadge(e.ref):''}</div>
      ${extra?`<div class="s">${extra}</div>`:''}
      <div class="row" style="margin-top:8px">
        <button class="btn ghost" onclick="setDownCarried('${jsq(e.kind)}','${jsq(e.ref)}')">Put it back</button>
        ${e.kind==='note'?`<button class="btn ghost" onclick="openNotesLog('${jsq(e.ref)}')">Open it</button>
        <button class="btn ghost" onclick="toggleNoteSeal('${jsq(e.ref)}');openInventory()">${noteReachOf(e.ref)==='sealed'?'🔎 Unseal':'🔒 Seal'}</button>`:''}
      </div>
    </div>`;
  return `<h3 style="margin-top:18px">🗒 Notes and marks you carried in</h3>
    <div class="meta">Your own words. A resident reads these only because you put them here —
      and never the sealed ones.</div>
    ${notes.map(e=>{ const n=all.find(x=>x.key===e.ref);
      return row(e,'🗒', (n&&n.title)||e.label||e.ref, n?esc(n.where):'<i>no longer in your notes</i>'); }).join('')}
    ${others.map(e=>row(e,(KINDS[e.kind]||{icon:'·'}).icon, e.label||e.ref, '')).join('')}`;
}
export function setDownCarried(kind, ref){
  data.carrying=setDown(carryList(), kind, ref); persist(); openInventory();
}
export function openInventory(){ state.ui='inventory'; hideAllOv(); renderInventory(); showOv('inventoryOv'); }
function renderInventory(){
  const docs=carriedOf(carryList(),'book').map(e=>Store.getDoc(e.ref)).filter(Boolean);
  /* WHAT YOU ARE CARRYING THAT NO LONGER EXISTS — shown, never silently
     dropped. Caught 2026-08-07 by reading the screenshot rather than the
     assertions: the heading said "carrying 2 things" above a list of one,
     because `.filter(Boolean)` quietly discarded a book whose slug no longer
     resolves. That is the count-disagrees-with-the-list shape found in the
     Notes Log the same morning, and it is worse in a bag: a backpack that
     silently empties itself is one you stop trusting. carrying.js has
     stale() for exactly this. */
  const gone=stale(carryList(), (kind,ref)=> kind!=='book' || !!Store.getDoc(ref));
  const later=setAsideList(carryList());
  const log=data.fishLog||[];
  /* WHAT A RESIDENT WOULD ACTUALLY SEE. Computed by residents.js from the very
     same carriedLines()/fitToBudget() pair that builds the prompt — never a
     second calculation over here, which would drift and then lie about the
     one number this panel exists to report. */
  const g=carryGrounding();
  const held=carried(carryList());
  document.getElementById('inventoryPanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>Your Backpack</h2>
    <div class="meta">${held.length ? esc(carryLine(carryList()))+' — ' : ''}read any of these from anywhere,
      no walk back to the shelf required. Nothing is missing from the Library; this is just your own
      copy in hand, and <b>what you carry is what a resident can see</b> — your notes stay private
      unless you put one in here yourself.
      ${held.length >= CARRY_CAP ? '<br><b>Full at '+CARRY_CAP+'.</b> That is on purpose — it keeps this to what you are actually working on. Set something down, or put things on the shelf below for later. <b>Nothing is ever lost.</b>' : ''}</div>
    ${carryMeterHtml(g, held)}
    ${held.length ? `
      <div id="invList">${docs.map(d=>`
        <div class="card" onclick="openReader('${d.slug}')">
          <div class="t">${esc(d.title)} ${seenBadge(g,'book',d.slug)}</div>
          <div class="s">${esc(d.tradition)}</div>
          <div class="row" style="margin-top:8px">
            <button class="btn ghost" onclick="event.stopPropagation();toggleInventory('${d.slug}');openInventory()">Put it back</button>
            <button class="btn ghost" onclick="event.stopPropagation();shelveCarried('${d.slug}')">↓ Pick up later</button>
          </div>
        </div>`).join('')}</div>
      ${carriedNotesHtml(g)}
      ${gone.length ? `<div class="card" style="cursor:default;border-color:#b56f6f">
        <div class="t" style="color:#e0a0a0">⚠ ${gone.length} thing${gone.length===1?'':'s'} you are carrying no longer exist${gone.length===1?'s':''}</div>
        <div class="s">${gone.map(g=>esc(g.label||g.ref)).join(', ')} — removed from the Library since you picked
          ${gone.length===1?'it':'them'} up. Nothing of yours was lost; the backpack just still has the pointer.</div>
        <div class="row" style="margin-top:8px"><button class="btn ghost" onclick="dropStaleCarried()">Set ${gone.length===1?'it':'them'} down</button></div>
      </div>` : ''}
      <div class="row" style="margin-top:14px"><button class="btn ghost" onclick="suggestInventoryCategories()">🪄 Ask the Computer to organize this</button></div>
    ${later.length ? `
      <h3 style="margin-top:20px">↓ Pick up later</h3>
      <div class="meta">Yours, waiting. Not in your hands, so a resident cannot see these — and they
        do not count against the ${CARRY_CAP}. There is no limit here.</div>
      ${later.map(e=>{ const d=Store.getDoc(e.ref); return `
        <div class="card" style="cursor:default">
          <div class="t">${esc((d&&d.title)||e.label||e.ref)}</div>
          <div class="s">set aside${e.since?' on '+esc(e.since):''}</div>
          <div class="row" style="margin-top:8px">
            <button class="btn ghost" onclick="takeUpLater('${esc(e.ref)}')">↑ Take it up</button>
            ${d?`<button class="btn ghost" onclick="openReader('${esc(e.ref)}')">Read it</button>`:''}
          </div>
        </div>`; }).join('')}` : ''}

      <div id="invSuggestion" class="meta"></div>`
    : '<p>Not carrying anything yet — in the Reader, "🎒 Take with you" adds a book here.</p>'}

    <h3 style="margin-top:22px">🎣 Fish Caught${log.length?' ('+log.length+')':''}</h3>
    <div class="meta">A running tally from the pond — every catch, its own size, nothing thrown back.</div>
    ${log.length ? `
      <div id="fishLogList">${log.map(f=>`
        <div class="card" style="cursor:default">
          <div class="t">${esc(f.name)}</div>
          <div class="s">${f.size}" · ${esc(f.ts)}</div>
        </div>`).join('')}</div>`
    : '<p>Nothing caught yet — face the pond and press E to cast a line.</p>'}`;
}
export async function suggestInventoryCategories(){
  const docs=carriedOf(carryList(),'book').map(e=>Store.getDoc(e.ref)).filter(Boolean);
  const box=document.getElementById('invSuggestion'); if(!box) return;
  if(!docs.length) return;
  if(!isAIActive()){ box.textContent='No local AI connected right now (⚙ Manage AI connections) — nothing to ask.'; return; }
  box.textContent='Thinking about how these fit together…';
  try{
    const list=docs.map(d=>`- "${d.title}" (${d.tradition})`).join('\n');
    const ask=`Here's what a visitor is currently carrying from the Library:\n${list}\n\nIn 2-3 `
      +`sentences, suggest a loose way to group or think about these together — a theme, a reading `
      +`order, or a connection between them. This is just a suggestion for the visitor to consider, `
      +`not an instruction.`;
    const reply=await AI.chat([{role:'system',content:CHARTER},{role:'user',content:ask}]);
    box.textContent='Suggestion: '+reply;
  }catch(e){ box.textContent="The connection flickered — no suggestion this time."; }
}

/* ----- Quill's memory report — a formal, human-in-the-loop checkpoint on
   what an agent has been carrying about you, not a silent summarization.
   Reuses the exact same document shape and book-reader UI as everything
   else in the Archive — this is prose with a title and sections, so it
   never needed new UI, just a prompt and a small metadata schema. Quill
   never deletes a memory himself; he only suggests, per note, and the
   suggestion is shown back to you to accept or ignore. */
function reportSuggestion(i,total){
  const fromEnd=total-1-i; // 0 = most recently asked
  if(fromEnd<5) return 'keep';
  if(fromEnd<15) return 'summarize';
  return 'let go';
}
async function quillReportBody(mem){
  const list=mem.map(m=>`- (${m.ts}) ${m.text}`).join('\n');
  if(isAIActive()){
    try{
      const ask=`Write a short (3-5 sentence) first-person report, in your own warm librarian `
        +`voice, summarizing what this visitor has asked you about across your conversations so `
        +`far. Base it only on this list of their questions — don't invent anything beyond it, and `
        +`don't just restate the list verbatim:\n${list}`;
      return await AI.chat([{role:'system',content:CHARTER},{role:'user',content:ask}]);
    }catch(e){ /* fall through to the deterministic version below */ }
  }
  return `A running record, not a performance — here's what's passed between us so far:\n\n${list}`;
}
export async function generateQuillReport(){
  const mem=agentMemory('quill');
  if(!mem.length){ window.alert("Quill hasn't answered anything yet — ask him a question in the Library first."); return; }
  const dates=mem.map(m=>m.ts).sort();
  const dateRange = dates[0]===dates[dates.length-1] ? dates[0] : `${dates[0]} → ${dates[dates.length-1]}`;
  state.archiveView={mode:'generating'}; renderArchive();
  const body=await quillReportBody(mem);
  const suggestions=mem.map((m,i)=>({ts:m.ts,text:m.text,suggestion:reportSuggestion(i,mem.length)}));
  const created=todayKey();
  let slug='quill-report-'+created, n=1;
  while(data.workshop.docs.some(d=>d.slug===slug)) slug='quill-report-'+created+'-'+(++n);
  data.workshop.docs.unshift({
    slug, title:"Quill's Report · "+created, license:'personal record — not for the shared shelves',
    source:'Quill · Librarian Agent', body, created,
    meta:{ noteCount:mem.length, dateRange, suggestions },
  });
  persist(); logActivity('Asked Quill for a memory report.'+elapsedTag()); blip(784,.09);
  state.archiveView={mode:'read',slug}; renderArchive();
}

/* index.html markup and the innerHTML templates above use inline
   onclick="..." handlers, which only resolve against `window` —
   module-scoped functions aren't visible there, so wire them up. */
Object.assign(window, {
  closeUI, openReader, markRead, backToShelf, addBookNote, sendNoteToToday, removeSpark, toggleBookNotesFilter,
  aiSummariseChapter,
  openFullText, backToSummary, fullTextNextPage, fullTextPrevPage, toggleFullTextReadAloud, skipReadAloud,
  aiBookImpression, aiAnalyzePage, askSebastianAboutBook,
  minimizeReader, restoreReader, dismissReaderPocket,
  selectBook, shelfOpenSelected,
  openPlanner, cycleBlock, savePlanner, viewPastDay, backToPlanner,
  fillPlannerPrompt, sendPlannerMessage, usePlannerReplyAsIntention, setDeskAgent,
  deskAddNote, deskNoteSent, renderDeskBookAfterPutDown, deskDraftLesson, deskOpenDraft,
  /* ui/study-table.js — the window block stays in ONE file, which is this
     one, so the two-directional export check keeps working. */
  studyStep, studyLabelToggle, studyLabelSave, studyUnlabel, studyOpenHere, studyAddNote,
  studySetAgent, studyFillPrompt, studyAsk, studyKeepReply,
  studyTidyNote, studyToggleHistory, studyRestoreVersion, studyDraftLesson,
  togglePlannerTool, createNote, openNote, backToNotesList, deleteNote, updateNoteField,
  newCourseForm, createCourse, openCourse, toggleStep, removeCourse, backToList,
  newCourseAIForm, draftCourseWithAI, setCourseDue, setCourseCat, draftTrainingPlanFromChat,
  setCourseSearch, clearCourseSearch, setCourseCategory, toggleArchivedView, archiveCourse,
  addConnection, toggleConnection, removeConnection, recheckConnections, setConnectionModel, fillConnectionPreset,
  /* openArchive was exported from this module and on NO window until
     2026-08-10 — main.js's E-key handler was the only thing in the whole
     application that could open the Archive Desk. Found by building
     data/places.js, which is the argument for having one table. */
  openArchive,
  newArchiveForm, createArchiveDoc, backToArchiveList, openArchiveDoc, deleteArchiveDoc, skipTyping,
  newBulkForm, runBulkImport, generateQuillReport,
  openConnections, openMenu, returnToTitle, resetSave,
  openVoiceSettings, setTTSVoice, setTTSRate, previewTTSVoice,
  openWaypoints, addWaypoint, removeWaypoint, exportSave, triggerImportSave,
  openIdeaCapture, saveIdea, deleteIdea, setLogKind, sendLogEntryToToday,
  openPaths, backToPaths, createPath, startPathFromIdea, openPath, addPathStep, updatePathField, togglePathWalked, deletePath,
  setPlanLogKind, addPlanLogEntry, togglePlanLogTask, removePlanLogEntry,
  migrateLogTask, dropLogTask, migrateAllLogTasks,
  setSebMode,
  setNoteLogKind, addNoteLogEntry, toggleNoteLogItem, removeNoteLogItem,
  toggleDialogSpeak, toggleReadAloud, toggleSpokenSummary, openActivity,
  openStillOpen, toggleSparkDone, toggleCarryForward, openDataPanel, pruneOldPlannerDays,
  forgetMemoryItem, forgetAllMemory,
  openLocalAIPanel, renderLocalAIPanel,
  openStorage, copyStorageCommand, setBookCap,
  closeDialog, sendCurrentChatMessage, toggleChatSpeak, skipChatTyping, toggleRevealPause, minimizeChat, restoreChat,
  openBadges, openRecordsHall, recordOpen, openIndex, setIndexCategory, setIndexSearch, clearIndexSearch, openIndexItem,
  openCatalog, catalogOpen,
  openCalendar, calShiftMonth, calSelectDay, calBackToMonth, addCalendarEvent, removeCalendarEvent,
  openNotesLog, openNotesWhileListening, returnToBook, setNotesLogSource, setNotesLogFolder, setNotesLogSearch, toggleNotesLogItem,
  openNotesForBook, setNotesLogBook,
  openBookAtNote, bookNoteToToday, bookNoteToLesson, bookNoteToDissection,
  assignNoteFolder, setNoteTags, askSebastianReviewFolder,
  createNoteInLog, editNoteInLog, closeNotesLogEditor, deleteNoteFromLog,
  linkNoteBook, setNoteBookPage, setNoteBookChapter, unlinkNoteBook, openLinkedBook, draftLessonPlanFromNote,
  openComputer, saveLastChatReplyToArchive, sendSebastianPlanToToday,
  openRequests, addRequest, removeRequest,
  openInventory, toggleInventory, currentDocSlug, suggestInventoryCategories,
  openReviewQueue, newReviewImportForm, newReviewManualForm, newSCSearchForm, backToReviewList, importReviewCandidates, submitManualReviewItem, handleBookDrop, handleBookFilePick,
  shelvePersonalBook, shelveManualFormNow, removePersonalBook, openWelcome,
  openManageLibrary, movePersonalBook,
  toggleEventReminder, dismissButlerPing, butlerPingGo,
  searchSuttaCentral, fetchSuttaCentralText,
  submitArchiveDocForReview, approveReviewItem, rejectReviewItem, draftSummaryForReviewItem, generateApprovedBatch, markBatchExported,
  openNoticeBoard,
  openHearth, openGrantDesk, openCoffee,
  newGrantForm, backToGrantList, createGrantProject, openGrantProject, deleteGrantProject,
  addGrantDocument, removeGrantDocument, fillGrantPrompt, sendGrantMessage, sendGrantDocToToday,
  saveGrantReplyAsDraft, removeGrantDraft, promoteGrantToArchive, setGrantDue,
  openUpcoming,
  openResidentsBoard,
  openResearchDesk, newResearchForm, backToResearchList, createResearchProject,
  openResearchProject, deleteResearchProject, addResearchNote, sendResearchNoteToToday, fillResearchPrompt,
  sendResearchMessage, saveResearchReplyAsNote, promoteResearchToArchive,
  summarizeResearchText,
  openScienceHall, talkToInvestigator,
  newInvestigationForm, backToHallList, createInvestigation, deleteInvestigation,
  dissectPaper, clearDissect, investigationFromDissect, keepDissection, reviewDissection, deleteDissection,
  newExperimentForm, createExperiment, logExperimentToday, deleteExperiment, readExperimentWithInvestigator,
  newBuildForm, createBuild, deleteBuild, predictForm, createPrediction,
  closeBenchEntry, reopenBenchEntry, readBuildWithInvestigator,
  openFoldReflection, addFoldReflection, deleteFoldReflection, talkToMonkAboutFold, talkToMonkAboutNote,
  openLearningTree, openLesson, backToTree, toggleLessonStep, saveLessonToNotes, draftLessonPlanFromLesson,
  lessonFromPlanNote, openLessonFromNote, pickUpLesson, putDownLesson, currentStudy, nextStepOf,
  talkTo, openRoster, stewardPreNotes, findPassagesFor, loadBookText,
  unfileShelf,
  dissectBook, openDissection, dissectionRec, setDissectQuestion, runBookLens, pullNotesIntoDissection,
  deleteDissectPass, readDissectedBook, investigationFromBook,
  openAcademy, studyLessonWithTutor,
  openInheritanceHall, openPlantHere, openPlanting, backToHallRecord, backToPlantChoice,
  choosePlantKind, createPlanting, plantSeedFromPouch, gatherSeeds, attemptTrial,
  takePlanting, digUpPlanting, previewBequest, giveBequest, triggerImportBequest,
  plantGift, groveHiddenChanged, draftPlantingWithAI,
  toggleReadingPause, togglePocketAudio, jumpChapter, jumpFraction, jumpToPageNum, treeTab,
  markChaptersHere, carryMigrate, carryList, dropStaleCarried, rememberPage, openNeedsChapters, carryNote,
  toggleNoteSeal, setDownCarried, toggleContextMeter, toggleShowThinking, carryFromChat,
  sendCurrentChatMessageWithNotes, previewPrompt,
  openDailyTasks, takeDailyTask, toggleDailyTaskStep, dailyTaskGo,
  finishDailyTask, setDownDailyTask, retakeDailyTask, dailyTaskWhereChanged,
  studySetBook, studyCarryBook, renderStudyTable,
  shelveRefused, takeUpLater, shelveCarried,
  newLessonForm, saveMyLesson, deleteMyLesson, draftLessonWithAI, stopDrafting,
  openLessonReading, exportLesson, writeLessonOnThisBook,
  openAlexandria, runLibraryTriage, applyTriageMove,
  acceptAllSuggestions, dismissSuggestions, acceptOneSuggestion,
  acceptShelfGroup, rejectShelfGroup, rejectOneSuggestion,
  openStanding, setStanding, addStandingSuggestion, clearStanding,
  openPromptInspector, openStandingForCurrentChat, openPromptForCurrentChat,
  runCopyrightCheck,
  openStewardIndex, sidxSearch, sidxEdit, sidxCancel, sidxSave, sidxToggleHidden, sidxRestore, sidxExportEdits,
  openShelf, openCourses, // both reachable from inline onclicks — see the guard in test/smoke.mjs
  checkMyMachine, copyPullCommand, checkOllama, repairBookAuthors, clearNeedsSort,
  openBookIntake, termSubmit, termQuick, openTheDay, currentDayItems,
  openStandUp, standUpAnswer, standUpItem, endStandUp,
  openReport, copyReport, saveReport, reportText,
  markNoteSeen,
  openMyLibrary, createMyShelf, renameMyShelf, deleteMyShelf, myLibSearch, myLibToggle, myLibShow,
  setNotesLogSort,
  myLibSelectAll, myLibMoveSelected, suggestShelvesWithAI, copyWorkOrder, dismissWorkOrder,
  openLift, takeLift, acceptBundle, initGlobalDrop, dismissDropToast, setBookKind, undoLastFiling, toggleRefileFiled, newReviewManualForm2, openLab,
  openCommonsTable, commonsTab, openPacket, takePacket, publishFrom, confirmPublish, cancelPublish, unpublishPacket,
  openReplacedCopy,
  writePacketFile, triggerImportPacket, setCommonsName,
});

/* THE SPLIT MOVED THESE OUT, and main.js still imports them from here.
   A moved function must not become a broken import for the rest of the
   application — `node --check` and `npm test` both pass on a missing
   re-export; only the bundler catches it, which is why the build is part
   of the verification for every cut. */
export { openLearningTree };
