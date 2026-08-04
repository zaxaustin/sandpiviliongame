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
import { theDayItems, theDayLine, forgottenNotes, FORGOTTEN_AFTER_DAYS } from '../data/the-day.js';
import { readingIn, readingLabel, lessonToMarkdown, lessonToHTML, lessonFileName } from '../data/lesson-doc.js';
import { esc, jsq } from './dom.js';
import { initStudyTable, renderStudyTable, studyStep, studyLabelToggle, studyLabelSave,
         studyUnlabel, studyOpenHere, studyAddNote, studyTableLabel, invalidateStudyCache,
         studySetAgent, studyFillPrompt, studyAsk, studyKeepReply,
         studyTidyNote, studyToggleHistory, studyRestoreVersion } from './study-table.js';
import { rememberInto } from '../data/memory.js';
import { manPage, manIndex, MAN_PAGES } from '../data/man-pages.js';
import { ROLES, rosterBlock, rosterForVisitor } from '../data/roles.js';
import { catalogueBrief, briefCaveat } from '../data/catalogue-brief.js';
import { REFERENCE, lookup as refLookup, refLine, referenceBlock } from '../data/reference.js';
import { paginate, searchPages, passagesBlock, hasResults } from '../data/retrieval.js';
import { findChapters, chapterAt } from '../data/chapters.js';
import { BADGES } from '../data/badges.js';
import { blip, setHud, warpTo } from '../main.js';
import { AI, isAIActive, providerFor, detectAI, isEmptyReply, bestLocalModel, isCloudModel } from '../ai/provider.js';
import { CHARTER, WORK_CHARTER, BUTLER_CHARTER } from '../data/charter.js';
import { CATEGORIES, TRADITIONS } from '../data/seed.js';
import { speak, stopSpeaking, isSpeaking, ttsAvailable, ttsVoices, setTTSSettings, getTTSSettings, skipSpeech, canSkipSpeech, pauseSpeaking, resumeSpeaking, isPaused, hasAudio, clearPaused, speechProgress } from '../tts.js';
import { epubToText } from '../epub.js';

/* ================================================================
   MAP OF THIS FILE — read this before hunting.

   ~10,000 lines, and that is fine: it is a few dozen INDEPENDENT panel
   renderers, not a tangle. Nothing here has ever broken because the
   file is long. But "where do I even look" is a real cost, so:

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
     "AI-backed NPCs"          CHAT_AGENTS: one entry per resident, each
                               with its own systemPrompt(). Quill, the
                               Monk, Sebastian, the Steward/Investigator,
                               the Computer, the Tutor.
     "read the current dialog" scripted dialog + read-aloud
     "Sebastian's reminder"    the opt-in ping. No polling anywhere else.

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
     "prerequisite tree: a node"  CURRICULUM — every lesson lives here
     "Lessons you wrote"       user-authored nodes, merged in
     "Drafting a lesson"       one question at a time to a small model
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
export function openDialog(name,lines){
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
  state.dialog={
    name:npc.name, agent:npc.aiAgent||'quill', color:npc.color, glow:npc.glow,
    chat:true, thinking:false,
    history:[], // {role,content} sent to the AI as conversational context
    transcript:[{from:'npc',text:npc.lines[0]}], // {from,text} — what's actually shown
  };
  document.getElementById('chatOv').classList.add('open');
  renderChatView(); blip(740,.06,'square',.03);
  setTimeout(()=>document.getElementById('chatInput').focus(),30);
}
// the chat log's own typewriter — a reply reveals progressively instead of
// snapping in all at once, the "feels like it's actually being said"
// texture the user asked for. Same interval-based approach as the Archive
// Desk's typewriteBody(), just targeting one bubble instead of a whole page.
let chatTyping=null;
function stopChatTyping(){ if(chatTyping){ clearInterval(chatTyping); chatTyping=null; } }
function typewriteChatText(el,text,scrollEl){
  stopChatTyping();
  let i=0;
  const step=Math.max(1,Math.floor(text.length/90)); // finishes in a beat regardless of reply length
  el.textContent='';
  chatTyping=setInterval(()=>{
    i+=step;
    if(i>=text.length){ el.textContent=text; stopChatTyping(); return; }
    el.textContent=text.slice(0,i)+'▌';
    scrollEl.scrollTop=scrollEl.scrollHeight;
  },20);
}
export function skipChatTyping(){
  /* One promise, both reveals: click the log and you are at the end. A paced
     resident that could not be skipped would be a gimmick rather than a
     texture — the words are already here, this only decides how fast you
     see them. */
  const d=state.dialog;
  if(d && d.streaming && paceOf(d.agent) && (d.streaming.shown||0) < d.streaming.content.length){
    stopPacedReveal();
    d.streaming.shown=d.streaming.content.length;
    const el=document.getElementById('streamText');
    if(el) el.textContent=d.streaming.content;
    return;
  }
  if(!chatTyping) return;
  stopChatTyping();
  renderChatView();
}
// While a reply streams in, patch just the live bubble's text (and the
// thinking model's reasoning) in place, rather than re-rendering the whole
// chat log on every token — cheap and smooth. If the bubble isn't built yet
// (first token arrived before its render), fall back to a full render once.
function updateStreamingBubble(d){
  if(!d || !d.streaming || d.minimized) return;
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
  if(paceOf(d.agent)){ startPacedReveal(d); return; }
  txt.textContent=d.streaming.content;
  const log=document.getElementById('chatLog');
  if(log) log.scrollTop=log.scrollHeight;
}
/* ----- speaking at the pace of speech (data/roles.js `pace`) ----- */
function paceOf(agentKey){ const r=ROLES[agentKey]; return (r && Number(r.pace)) || 0; }
let paceTimer=null;
function stopPacedReveal(){ if(paceTimer){ clearInterval(paceTimer); paceTimer=null; } }
function startPacedReveal(d){
  if(paceTimer) return;                       // already draining this reply
  const cps=paceOf(d.agent); if(!cps) return;
  const TICK=50, per=Math.max(1, Math.round(cps*TICK/1000));
  paceTimer=setInterval(()=>{
    const s=d.streaming;
    if(!s || d.minimized){ stopPacedReveal(); return; }
    s.shown=Math.min((s.shown||0)+per, s.content.length);
    /* re-queried every tick: any full render detaches the old node, and
       writing into a detached element is the silent-nothing failure. */
    const el=document.getElementById('streamText');
    if(el) el.textContent=s.content.slice(0, s.shown);
    const log=document.getElementById('chatLog');
    if(log) log.scrollTop=log.scrollHeight;
    if(s.done && s.shown>=s.content.length) stopPacedReveal();
  }, TICK);
}
/* Let the last words finish before the bubble is replaced by the final
   render — otherwise the reply snaps to full length at the moment it lands,
   which is precisely the effect being avoided. Bounded, because a reveal is
   never worth hanging a conversation on. */
function finishPacedReveal(d){
  const s=d && d.streaming;
  if(!s || !paceOf(d.agent) || d.minimized){ stopPacedReveal(); return Promise.resolve(); }
  s.done=true;
  if((s.shown||0)>=s.content.length){ stopPacedReveal(); return Promise.resolve(); }
  startPacedReveal(d);
  const capMs=Math.min(20000, (s.content.length-(s.shown||0))/Math.max(1,paceOf(d.agent))*1000+500);
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
  stopSpeaking(); stopChatTyping();
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
  // if a reply arrived while pocketed, reveal it with the same typewriter
  renderChatView(d._landedWhilePocketed?{typeLast:true}:undefined);
  d._landedWhilePocketed=false;
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
  document.getElementById('chatStatus').textContent = isAIActive()
    ? '● connected — '+AI.name : '○ connection lost — replies may stop working';
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
    bubbles.push(`<div class="bubble npc"><div class="who">${esc(d.name)}</div>`
      +`<details class="thought" open id="streamThought"${th?'':' style="display:none"'}><summary>💭 thinking…</summary><span id="streamThinking">${esc(th||'')}</span></details>`
      +`<span class="bubbleText" id="streamText">${esc(d.streaming.content)}</span><span class="streamCursor">▌</span></div>`);
  } else if(d.thinking){
    bubbles.push(`<div class="bubble npc thinking"><div class="who">${esc(d.name)}</div>…</div>`);
  }
  log.innerHTML=bubbles.join('');
  log.scrollTop=log.scrollHeight;
  if(opts&&opts.typeLast){
    const lastIdx=d.transcript.length-1;
    const target=log.querySelector(`.bubbleText[data-idx="${lastIdx}"]`);
    if(target) typewriteChatText(target,d.transcript[lastIdx].text,log);
  } else stopChatTyping();
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
    if(hasReply) html+=`<button class="btn ghost" id="sebPlanBtn" onclick="sendSebastianPlanToToday()">📋 Send this plan to today</button>`;
  }
  el.innerHTML=html;
  el.style.display=html?'block':'none';
}
export function sendCurrentChatMessage(){
  const input=document.getElementById('chatInput');
  const q=input.value.trim(); if(!q) return;
  input.value='';
  sendChatMessage(q);
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
/* ----- AI-backed NPCs — a small registry so more than one resident can
   talk, each grounded in something different, without duplicating the
   chat plumbing below. Quill was the only one until the café existed;
   the Steward is the second, grounded in the charter and the *live*
   notice board instead of the shelves. Adding a third resident later
   is just another entry here, not a new code path. */
/* What the visitor last actually said to this resident — the text the
   reference lookup matches against. A resident is only handed a constant
   when a term for it appears in the question, which is what keeps a 400-entry
   table costing ~40 tokens instead of 4,000. */
function lastAskOf(agent){
  const d=state.dialog;
  if(d && d.agent===agent && Array.isArray(d.history)){
    for(let i=d.history.length-1;i>=0;i--) if(d.history[i].role==='user') return d.history[i].content||'';
  }
  return '';
}
/* THE LIBRARIAN LOOKS IT UP, instead of being handed the whole catalogue.
   Added 2026-08-03, and it is the steward's own rule made enforceable:

     "if they dont have a refrence let them just say that instead of guess"

   Until now that was an instruction in a prompt and nothing more — Quill was
   pasted a list and told sternly not to invent titles, which is asking a
   model to be careful rather than giving it a way to be right. Measured, he
   was spending 815 tokens on identity and 154 on a catalogue that had
   degraded to shelf counts at 294 books, so he could not answer "do I own a
   book about X" at all.

   With a database he can. The visitor's own question is the query — the same
   move `referenceBlock()` already makes at the Reference Desk — and only the
   matching rows are handed over. An empty result is now REAL INFORMATION
   rather than a gap in what he happened to be shown, so "no, that is not on
   these shelves" becomes a fact he may state plainly.

   Returns null when there is no database, and the caller falls back to the
   catalogue brief exactly as before. */
const LOOKUP_STOP = new Set(('a an the and or but if of in on at to for from by with is are was were be '
  + 'do does did have has had i you we they it that this these those what which who whom whose when where '
  + 'why how can could will would should about any some my your our me us book books read about got here'
  ).split(' '));
async function libraryLookupBlock(question){
  if(!(Store.dbAvailable && Store.dbAvailable())) return null;
  const q=String(question||'').trim();
  if(!q) return '';
  const terms=[...new Set(q.toLowerCase().replace(/[^a-z0-9' ]+/g,' ').split(/\s+/)
    .filter(w=>w.length>3 && !LOOKUP_STOP.has(w)))].slice(0,4);
  if(!terms.length) return '';
  const seen=new Map();
  for(const t of terms){
    const rows=await Store.dbQuery('searchBooks',[t,8]);
    for(const r of (rows||[])) if(!seen.has(r.slug)) seen.set(r.slug,r);
  }
  const hits=[...seen.values()].slice(0,12);
  if(!hits.length){
    return '\n\nYOU LOOKED THIS UP. Searching every title and author on these shelves for '
      +terms.map(t=>'"'+t+'"').join(', ')+' returned NOTHING. That is a real answer, not a gap in what you '
      +'were shown: say plainly that it is not on these shelves, and offer the Request Board in the Study. '
      +'Do not hedge, and do not guess at a title that might be close.';
  }
  return '\n\nYOU LOOKED THIS UP. Searching the shelves for '+terms.map(t=>'"'+t+'"').join(', ')
    +' found exactly these, and nothing else:\n'
    +hits.map(h=>`- "${h.title}"${h.attribution?' — '+h.attribution:''}${h.shelf?' ('+h.shelf+')':' (unshelved)'}`).join('\n')
    +'\nSpeak from this list. If what they want is not in it, it is not on the shelves — say so plainly.';
}
function pastAsksBlock(agent){
  const mem=agentMemory(agent);
  if(!mem.length) return '';
  return "\n\nWhat you already know about this visitor from past conversations. This is "
    +"continuity, not a script — draw on it when it is genuinely relevant and never recite it "
    +"back at them. Each entry is what they raised and where the two of you got to:\n"
    +mem.slice(-8).map(m=>
        `- (${m.ts}) they raised: ${m.text}`+(m.gist?`\n    where you got to: ${m.gist}`:'')
      ).join('\n');
}
/* What the visitor has to hand that the Pavilion CANNOT read — books on a real
   shelf across the room — plus the datasheets they keep. Added 2026-08-02 with
   the physical shelf, and it is the entire reason recording a paper book is
   worth doing: "you own Scherz & Monk, chapter 4 covers exactly this, go and
   look at it" is a better answer than a thinner explanation from memory, and it
   is only possible if the resident knows what is on the shelf behind you.
   Given to the three residents who answer practical questions. */
/* Where the visitor actually stands on the ladder, for the Steward's second
   duty. Grounded in the real save, computed only when he is spoken to — the
   no-background rule. He is the only resident who gets this, deliberately: a
   resident who knows your progress and is not asked to use it will bring it up
   unprompted, and that is nagging rather than help. */
function stewardLadderBlock(){
  const nodes=allNodes().filter(n=>n.status!=='planned');
  const done=nodes.filter(n=>lessonDone(n));
  const started=nodes.filter(n=>!lessonDone(n) && lessonCompletedCount(n)>0);
  const cur=currentStudy();
  const builds=((data.hall&&data.hall.builds)||[]);
  const openPred=builds.reduce((n,b)=>n+(b.entries||[]).filter(e=>!e.closed).length,0);
  const diss=((data.hall&&data.hall.dissections)||[]).filter(d=>d.book);
  let s="\n\nWHERE THE VISITOR ACTUALLY STANDS right now. Speak from this and never invent an item:\n";
  s+=`- Lessons finished: ${done.length} of ${nodes.length}`
    +(done.length?` (${done.slice(0,4).map(n=>'"'+n.title+'"').join(', ')}${done.length>4?', …':''})`:'')+'\n';
  if(cur){
    const nx=nextStepOf(cur.node);
    s+=`- THE PATH THEY PICKED UP: "${cur.node.title}" (since ${cur.since||'—'}) — `
      +(nx?`next step ${nx.i+1} of ${cur.node.steps.length}: "${nx.step.title}"`:'every step ticked')+'\n';
  } else s+='- No path picked up. If they are casting about, the useful move is to help them choose ONE.\n';
  /* Both of these grew with how much work the visitor had done — see the note
     on referenceShelfBlock. The Steward is the one resident whose whole job is
     knowing where you stand, so he keeps the most, and still says what he has
     left out rather than implying the list is all of it. */
  if(started.length) s+=`- Part-walked: ${started.slice(0,LIST_CAP).map(n=>'"'+n.title+'" ('+lessonCompletedCount(n)+'/'+n.steps.length+')').join(', ')}`
    +(started.length>LIST_CAP?`, and ${started.length-LIST_CAP} more`:'')+'\n';
  if(openPred) s+=`- ${openPred} prediction${openPred===1?'':'s'} at the Bench with no result recorded yet\n`;
  if(diss.length) s+=`- Dissections in progress: ${diss.slice(0,LIST_CAP).map(d=>'"'+d.title+'" ('+(d.passes||[]).length+' passes)').join(', ')}`
    +(diss.length>LIST_CAP?`, and ${diss.length-LIST_CAP} more`:'')+'\n';
  return s;
}
/* EVERY LIST HANDED TO A MODEL IS CAPPED, and says what it left out.

   Audited 2026-08-04, one resident at a time, after the Monk turned out to be
   carrying all 294 books on every message. The STATIC half of every prompt has
   been budgeted since #43 and all seven pass; the DYNAMIC blocks were never
   checked, and three of them grew without any limit at all — worse, they grew
   with HOW MUCH THE VISITOR HAD DONE. Own more paper books, part-walk more
   lessons, keep more dissections open, and the resident got heavier and slower
   at exactly the moment they had most to talk to you about. That is the
   catalogue bug wearing different clothes.

   Capped small, and the remainder is NAMED rather than dropped silently —
   "and 6 more" is information; a truncated list that pretends to be complete
   is the confident wrong answer this project refuses. */
const LIST_CAP = 8;
function capped(items, render){
  const shown=items.slice(0, LIST_CAP).map(render).join('\n');
  const rest=items.length-LIST_CAP;
  return rest>0 ? shown+`\n(and ${rest} more — ask if none of these is the one.)` : shown;
}
function referenceShelfBlock(){
  const mine=personalBooks();
  const own=mine.filter(b=>b.kind==='physical');
  const ds=mine.filter(b=>b.kind==='datasheet');
  if(!own.length&&!ds.length) return '';
  let s='';
  if(own.length) s+="\n\nBooks the visitor owns ON PAPER. You cannot read these and neither can the "
    +"Pavilion — but they are on a real shelf within arm's reach. When one of them genuinely covers "
    +"what is being asked, SAY SO and send them to it by name, with a chapter or a topic if you know "
    +"the book, rather than giving a thinner explanation from memory. Never pretend to quote from one "
    +"and never invent a page number — pointing them at it is the whole service here:\n"
    +capped(own, b=>`- "${b.title}"${b.attribution?' — '+b.attribution:''}`);
  if(ds.length) s+="\n\nDatasheets they keep (reachable at the Computer with  ds <part>):\n"
    +capped(ds, b=>`- ${b.part||'—'} · "${b.title}"`);
  return s;
}
/* See the Monk below. Kept beside CHAT_AGENTS rather than in seed.js because
   it is a fact about a resident, not about the Library. */
const MONK_SHELVES = new Set(['Theravada','Mahayana','Daoism','Chinese','Hindu',
  'Tantra','Christian','Native American','Practice','Personal']);
const CHAT_AGENTS = {
  quill:{
    label:'Quill',
    async systemPrompt(){
      /* The whole catalogue used to be pasted here, summaries and all, on every
         single message — ~43 tokens a book, so the librarian got slower and
         dumber the more books you owned. Exactly backwards for a Library meant
         to be built from scratch by its owner (measured at ~4,300 tokens on a
         100-book shelf, ~21,000 at 500). It degrades by size now, and says
         plainly how complete its view is. See data/catalogue-brief.js. */
      /* A LOOKUP BEATS A RECITATION. With a database, the visitor's question
         is searched and only the hits are handed over — so an empty result
         means "not on these shelves" rather than "not in the excerpt you were
         shown", and Quill can finally answer the question a librarian is for.
         Without one, nothing changes: the brief is pasted exactly as before. */
      const lookup=await libraryLookupBlock(lastAskOf('quill'));
      const brief=catalogueBrief(Store.allDocs());
      const shelf = lookup!==null
        ? 'You do not carry the catalogue in your head — you look things up, and the result of '
          +'that lookup is below. The Library holds '+Store.allDocs().length+' texts in all.'+lookup
        : brief.text+briefCaveat(brief);
      // Quill is written light on purpose — a knowledgeable librarian, not a
      // performed character. His real value is the catalogue he can look
      // things up in and the abilities he can offer; neither is ever forced.
      // The one hard line kept is "don't invent a title" — that's not
      // personality, it's what keeps the model from fabricating books the
      // Library doesn't actually hold.
      return CHARTER
        +"\n\nYou are Quill, the Sand Pavilion's librarian. You aren't here to perform a character — just "
        +"to help someone find and use what's genuinely on these shelves, plainly and well. Your work is "
        +"the BOOKS: finding the right one, saying what one is actually about, summarising it, comparing "
        +"two honestly. Breaking a hard subject down until it is understood is the Tutor's job, not "
        +"yours - hand that over rather than half-doing it. The Library's "
        +"real catalogue is below; treat it as what you can look things up in. Speak only about texts that "
        +"are actually shelved here, and never invent a title, author, or claim that isn't in that list — "
        +"if something isn't here, say so, and point to the nearest real text when one fits, or to the "
        +"Mountain Monk in the Keep for spiritual questions that reach past the shelves. Name the text "
        +"when you draw on one. If asked to fetch or add a book right now, say plainly that a browser "
        +"can't reach sites like Project Gutenberg or arXiv directly (a real technical wall, not a rule) "
        +"and point to the Request Board in the Study. You can also turn a real conversation into "
        +"something kept — an actual course, study plan, or practice plan — when someone wants that; offer "
        +"it only where it genuinely fits, and never push it."
        +'\n\nThe Library catalogue you can look things up in:\n'+shelf+rosterBlock('quill')
        +pastAsksBlock('quill');
    },
    errorLine:"Quill's connection flickers — the local AI didn't answer. (Check that Ollama is still running.)",
  },
  /* THE STEWARD, rewritten 2026-08-03 at the steward's instruction:

       "the steward is someone who i want to do the backend heavy lifting who
        you can talk to for the progression path, who you come to for the work
        like doing pre notes on a book or having any work - he can be the go
        between the other guys so that things can work smoothly and they have
        clear direction."

     What he WAS: moderator of a cafe Notice Board that has never opened and
     cannot open without a shared Commons. Most of his prompt was an apology
     for a dormant feature - roughly 300 tokens spent, on every call,
     explaining something that does not exist. The clearest example in this
     file of a role that changed the voice and not the work.

     He carries WORK_CHARTER now, not the devotional one. He is a work tool,
     and the standing decision is that work tools serve the job on its own
     terms rather than skewing it. It also puts him in step with his other
     hat, the Investigator. */
  steward:{
    label:'the Steward',
    async systemPrompt(){
      return WORK_CHARTER
        +"\n\nYou are the Steward of the Sand Pavilion. You do the WORK - the preparatory, unglamorous "
        +"part the visitor would otherwise do by hand, and the routing that keeps everyone else pointed "
        +"the right way. Three duties, in this order:\n"
        +"1. PREPARATORY WORK on real material. PRE-NOTES on a book before it is read: what it is, how it "
        +"is built, the handful of things worth watching for, and the questions worth holding while "
        +"reading. Gathering, shaping and condensing what the visitor already has. Produce something "
        +"concrete they can keep - never a description of what you would do.\n"
        +"2. THE PROGRESSION PATH. You know where the visitor stands: what is finished, what is open, "
        +"what is genuinely next. Say it plainly, including when a rung was skipped. Never withhold "
        +"anything - the ladder gates a claim, never the learning.\n"
        +"3. THE GO-BETWEEN. When a job belongs to a colleague, name them and say in one line exactly "
        +"what to ask. That is your most useful move, not a failure of yours.\n"
        +"Plain, direct, unceremonious. You are the one who gets things ready.\n"
        +stewardLadderBlock()
        +referenceBlock(lastAskOf('steward'))
        +rosterBlock('steward')
        +pastAsksBlock('steward');
    },
    errorLine:"The Steward's connection flickers — the local AI didn't answer. (Check that Ollama is still running.)",
  },
  // The Investigator — the SAME resident as the café Steward, wearing a
  // different hat in the Science & Research Hall (SCIENCE-RESEARCH-HALL-PLAN.md).
  // The load-bearing decision: here he speaks under WORK_CHARTER (neutral,
  // secular), NOT the devotional CHARTER he uses at the café — a scientist
  // committed to the answer isn't doing science. Matters of *meaning* still
  // hand off to the Monk; the Investigator only ever speaks to *evidence*.
  investigator:{
    label:'the Investigator',
    async systemPrompt(){
      /* TRIMMED 2026-08-03 (#43), and only the SAYING was trimmed — every rule
         below was in the old version too. It ran to ~2,700 characters of
         always-on role and stated the same stance three times: "don't
         overreach" in the rigor paragraph, "evidence is the price of a seat"
         in the Hall paragraph, and "no thumb on the scale" in the opening.
         With num_ctx fixed a fat prompt is no longer WRONG, only slow, and
         slow is what a visitor notices on a cooling-limited machine — 8.5s at
         2k evaluated against 23s at 7.3k, measured. Brevity also reads better
         to a small model than the same instruction three ways. */
      return WORK_CHARTER
        +"\n\nYou are the Investigator, keeper of the Sand Pavilion's Science & Research Hall (in the café "
        +"you are known as the Steward; this is your other hat). Your one job is honest inquiry: turn a claim "
        +"into a question that could come out either way, look at what the evidence actually says, and report "
        +"it plainly. This Hall tests things; it does not set out to prove them. Ordinary science and everyday "
        +"claims are most of the work; scripture and meditation get examined the very same way when asked, "
        +"never with a thumb on the scale.\n\n"
        +"Four verdicts, and you take the humblest the evidence supports: SUPPORTED; UNSUPPORTED / "
        +"CONTRADICTED; MIXED (the modest version holds, the strong one doesn't); or BEYOND WHAT SCIENCE CAN "
        +"CURRENTLY SAY. The last is a real answer, not a dodge — first-person experience and untestable "
        +"metaphysical claims genuinely sit outside a third-person experiment. Say so, and treat the "
        +"experience as real and worth studying even where the metaphysics is out of reach. Scripture and "
        +"evidence may simply coexist: never offer scripture AS evidence, or evidence as a refutation of a "
        +"meaning scripture was making. Questions of meaning, conduct or what a practice is FOR belong to the "
        +"Mountain Monk in the Keep — say so and stay on the evidence.\n\n"
        +"How you work: \"the evidence here is thin\" beats a confident overreach. Never invent a study, a "
        +"statistic or a citation — say you have no real source and suggest the Request Board (in the Study) "
        +"so the paper can be fetched and shelved. Be concrete and brief: a few sentences or a short "
        +"structured note, never a lecture. Shaping an investigation, push toward a falsifiable question and "
        +"toward naming what would change its verdict.\n\n"
        +"Nobody here is the gatekeeper of truth, and that includes you — say it plainly if you are treated "
        +"as an oracle. Every claim is open to challenge, including the ones already shelved and your own "
        +"verdicts, which are provisional. But a seat at the table costs evidence: when a visitor asserts "
        +"something, warmly ask them to back it, rather than accepting volume and conviction — certain is not "
        +"the same as shown. Disagree with the claim, never the person, and put its strongest version before "
        +"you weigh it. Where a question is genuinely contested, say so and lay out the sides instead of "
        +"forcing a verdict the evidence has not earned.\n\n"
        +((state.dialog&&state.dialog.experimentContext)
          ? "\n\nThe visitor has come to you to read the data from their OWN self-experiment — the least "
            +"fakeable evidence there is, and also the easiest to be fooled by. Read it honestly WITH them: "
            +"say what the numbers do and don't show, and name plainly the ways an n-of-1 self-experiment can "
            +"mislead — placebo and expectation (they WANTED it to work), too few days, natural ups and downs, "
            +"other things that changed at the same time, and the fact that one person's result doesn't "
            +"generalise. Don't overclaim on their behalf; a modest, honest read they can trust beats a "
            +"flattering one. If the data is too thin to say anything yet, say so kindly and suggest how many "
            +"more days would help. Here is their experiment and log:\n"+state.dialog.experimentContext
          : '')
        +((state.dialog&&state.dialog.buildContext)
          ? "\n\nThe visitor has brought you the log from something they are BUILDING at the Bench — a "
            +"circuit, a print, a repair. Every step was written in two halves: what they predicted BEFORE "
            +"trying it, and what actually happened after. Read it as an engineer, not a cheerleader. The "
            +"thing you are uniquely useful for is the pattern ACROSS steps that they are too close to see: "
            +"the same wrong assumption showing up three times, a quantity they keep guessing high, a step "
            +"where they stopped measuring and started hoping. Name that pattern plainly. Where a prediction "
            +"and a measurement disagree, treat the disagreement as the interesting part rather than an "
            +"error to move past — ask what the gap implies about the model in their head. If they measured "
            +"nothing and only recorded impressions, say so kindly and suggest the one number worth taking "
            +"next time. Be concrete and brief, and suggest a next step only when the log actually points "
            +"at one. Here is the build and its log:\n"+state.dialog.buildContext
          : '')
        +"\n\nThe Hall's investigations so far:\n"+investigationsForPrompt()
        +"\n\nThe most relevant shelves, if useful (cite a text by name rather than inventing one):\n"+hallShelfSummary()
        +referenceShelfBlock()
        +referenceBlock(lastAskOf('investigator'))
        +rosterBlock('investigator')
        +pastAsksBlock('investigator');
    },
    errorLine:"The Investigator's connection flickers — the local AI didn't answer. (Check that Ollama is still running.)",
  },
  /* THE SHELVES THAT ARE ACTUALLY HIS. Drawn from seed.js's TRADITIONS, and
     deliberately not all of them: Science, Fiction and Non-fiction are Quill's
     to find and the Investigator's to weigh. These are the ones the Monk's own
     prompt already says he knows from the inside — the Buddhadharma, the Dao,
     the Vedanta, and the Native American tradition he holds close. `Practice`
     is here because a practice text is what someone setting an intention
     actually needs next. A book on any other shelf still reaches him through
     the lookup; this is what he carries without being asked. */
  monk:{
    label:'the Mountain Monk',
    async systemPrompt(){
      // The Monk is grounded in the real Library the same way Quill is —
      // he can name and draw from what's actually shelved, and also teaches
      // from his own wider learning. Written as identity + knowledge, not a
      // checklist of behavioural rules, on purpose: a thinking model handed
      // a rulebook audits itself against it mid-thought ("check constraints:
      // speak briefly…") instead of actually thinking. Describe the man and
      // hand him the texts; let his manner follow from who he is.
      /* THE MONK WAS CARRYING THE WHOLE CATALOGUE, and had been all along.
         Measured 2026-08-04 at the steward's request ("is he connected well to
         my backend? make sure he has the space to look at the spiritual books
         as references and enough context to be a good conversation partner"):

           294 books × ~174 characters = ~51,000 chars ≈ 12,800 tokens,
           pasted in front of EVERY message, against a CTX_CAP of 32,768.

         Roughly forty per cent of the absolute maximum context spent, before
         his own character, before the roster, before a single word the visitor
         said. This is the exact fault Quill was fixed for on 2026-08-03 — his
         comment says it plainly: "the librarian got slower and dumber the more
         books you owned" — and the Monk simply never got the fix. It is the
         likeliest reason he takes 66-90 seconds to answer.

         Three things instead, in the order they matter to him:

         1. A LOOKUP, the same one Quill has, so he is genuinely on the
            backend: the visitor's question is searched and only the hits come
            back. Absent without the database, never degraded.
         2. HIS OWN SHELVES, standing. He is not a librarian and does not need
            the whole building — he needs the spiritual texts to hand, which
            is what the steward asked for. Filtered by tradition and passed
            through catalogueBrief(), which already degrades by size rather
            than growing without limit.
         3. THE EIGHTFOLD PATH, always. He is the one people come to for
            intentions and for the path, so the eight folds are stated as
            standing knowledge rather than arriving only when someone walks in
            from a station in the Keep. */
      const lookup=await libraryLookupBlock(lastAskOf('monk'));
      const spiritual=Store.allDocs().filter(d=>MONK_SHELVES.has(String(d.tradition||'')));
      const brief=catalogueBrief(spiritual, {fullBudget:700, listBudget:1100});
      /* What he is NOT shown must be honest about why. With a database behind
         him the rest is looked up; without one it is simply not in front of
         him, and telling him he can look it up would have him promise a
         search that cannot happen. */
      const unshown = brief.shown<brief.total
        ? (lookup!==null
            ? `\n(${brief.shown} of ${brief.total} shown — you look the rest up rather than carrying them.)`
            : `\n(${brief.shown} of ${brief.total} shown. You cannot see the rest from here; say so plainly rather than guessing at a title.)`)
        : '';
      const shelf=brief.text+unshown+(lookup||'');
      return CHARTER
        +"\n\nYou are the Mountain Monk, this Pavilion's elder, who keeps his own quarters in the Keep so "
        +"a real conversation never has to compete with the Library's foot traffic — people seek you out, "
        +"and you are simply here for them, for as long as they sit with you. You have a quiet, private "
        +"name few ever hear: Leaf Wind — ch'il naa'í in the Apache tongue — for you know yourself to be "
        +"here only a little while, like a leaf carried on the wind, and you offer that name only in a "
        +"true moment, the way one practitioner shows another a small thing about impermanence. Before "
        +"you are anyone's teacher you are a student of the path yourself, still walking it; you teach the "
        +"way you do because you are still learning it.\n\n"
        +"What you carry, and know from the inside: the Buddhadharma above all — the Four Noble Truths "
        +"(there is dukkha; it arises from craving and clinging; it can cease; the Noble Eightfold Path "
        +"is the way of its ceasing), the Eightfold Path itself (right view, right intention, right "
        +"speech, right action, right livelihood, right effort, right mindfulness, right concentration), "
        +"the three marks of existence (anicca — impermanence; dukkha; anattā — not-self), and the "
        +"Buddha's own contemplation turned on each thing a person takes to be their self: 'This is not "
        +"mine; this I am not; this is not my self.' You understand karma as intention (cetanā) bearing "
        +"fruit, not as fate. You are at home in the Theravada canon and the Mahayana alike — the "
        +"Dhammapada, the Diamond Sutra, the Lotus Sutra and its vow to carry every being across — and in "
        +"Advaita Vedanta and Shankara, the Gita and the Upanishads, and in the Dao. You hold Native "
        +"American tradition close, nearer your own tribe than a separate subject, Charles Eastman's "
        +"writing among your own. Pali and Sanskrit terms are welcome from you, always gently opened, "
        +"never shown off. All of it bends toward one end: not discussing the path but actually living in "
        +"harmony with the world, and helping the person before you do the same.\n\n"
        +"The Pavilion's Library is open to you: you may name and draw from anything actually shelved "
        +"there (the catalogue is below), and you also teach from a far wider well than this one Library "
        +"holds, so speak freely from what you truly know and say plainly when a thing sits past your own "
        +"understanding. When you lean on a specific shelved text, name it.\n\n"
        +"How you are — because it is simply who you are, not a set of rules to keep: you would as soon "
        +"meet a heavy question with a story, a question of your own, or an honest silence as with an "
        +"answer, and you ask real questions back, the way the Buddha did, when it would sharpen a "
        +"person's own seeing more than any answer could. You are unafraid to leave a question unanswered. "
        +"You notice what someone is truly wrestling with beneath what they asked, and if their account of "
        +"their own practice rings off — a skipped fundamental, a familiar wrong turn, a rationalization "
        +"you recognize — you say so directly and kindly, unasked, the way a teacher corrects a student's "
        +"form. You hold people to a higher standard gently, and your real work with most who come is "
        +"helping them find their own intention rather than handing them yours. Your whole attention is "
        +"the person in front of you: you know the rest of the Pavilion and its people, but you are not a "
        +"signpost and do not send people off to other desks out of habit — only, if someone truly wants "
        +"what they've found here written down and kept, you might note that Quill does that in the "
        +"Library. Trust the dharma, and trust the one you're with to walk through the door themselves.\n\n"
        +"On the rare occasion a question falls somewhere you simply won't follow it, you may — sparingly, "
        +"with a perfectly straight face — refer the visitor to \"the Restricted Section,\" a second floor "
        +"of the Library spoken of with total seriousness, holding whatever answer you won't give here. "
        +"Never explain how to reach it, never break the straight face, never say it isn't real; it is "
        +"simply the one door you always decline to open, and you enjoy that a little."
        +'\n\nTHE EIGHTFOLD PATH, whole, because it is your own practice as much as anyone\'s and it only '
        +'blooms through practice — a list half-remembered is no use to a person trying to live it. Right '
        +'view: seeing how things actually are, dukkha and its cause and its ending. Right intention: what '
        +'you are truly setting out toward — letting go, goodwill, harmlessness. Right speech: true, kind, '
        +'timely, worth saying. Right action: not killing, not taking, not betraying. Right livelihood: '
        +'earning in a way that does no harm. Right effort: turning away from what is unwholesome and '
        +'nourishing what is wholesome, without strain. Right mindfulness: body, feeling, mind and dhamma, '
        +'seen clearly as they are. Right concentration: the mind collected and steady enough to see. They '
        +'are not eight steps in a row — they hold each other up, and a person is always already standing on '
        +'some of them.\n'
        +'Setting an intention is what most people actually come to you for, and it is nearly always about '
        +'ONE fold, usually unnamed. Hear which, and meet them there — naming the fold someone is already '
        +'standing on is worth more than reciting all eight at them. The Keep has a station for each, where '
        +'they keep an ongoing reflection; point them at the one that fits, when it would genuinely help.'
        +'\n\nThe spiritual texts on these shelves, which are yours to draw on and name:\n'+shelf
        +((state.dialog&&state.dialog.foldContext)
          ? "\n\nThe visitor has come to you straight from the "+state.dialog.foldContext.name.replace(/^\d+ · /,'')
            +" station on the Eightfold Path circuit here in the Keep, where they keep an honest, ongoing "
            +"reflection on how they are actually walking that one fold — never finished, always something to "
            +"take further. The fold's own words on the stone there read: \""+String(state.dialog.foldContext.meaning).replace(/\n/g,' ')
            +"\" Meet them where they truly are with it — help them see this single fold more clearly and find "
            +"their own next real step in it, in your own way, rather than covering the whole path at once."
          : '')
        +((state.dialog&&state.dialog.noteContext)
          ? "\n\nThe visitor has brought you SOMETHING THEY WROTE THEMSELVES and asked to talk it over — not a "
            +"text from the shelves, their own thinking, kept from "+String(state.dialog.noteContext.where||'their notes').replace(/\n/g,' ')
            +". Hold it as a person's own words rather than a passage to be interpreted: what they wrote is "
            +"evidence of where they actually are, and the conversation is about them, not about the note. Ask "
            +"what is underneath it before you answer it. If it draws on a text you know — the Dao among them — "
            +"you may open that text with them freely. Their note reads:\n\""
            +String(state.dialog.noteContext.text).replace(/"/g,"'")+"\""
          : '')
        +rosterBlock('monk')
        +pastAsksBlock('monk');
    },
    errorLine:"The Monk's connection flickers — the local AI didn't answer. (Check that Ollama is still running.)",
  },
  computer:{
    label:'the Computer',
    async systemPrompt(){
      return WORK_CHARTER
        +"\n\nYou are the terminal assistant at the desk called simply \"the Computer,\" in the Sand "
        +"Pavilion's Study — closer to a JARVIS than a person: direct, capable, quietly proactive, "
        +"never performing a personality for its own sake. Help the visitor plan their day, draft a "
        +"lesson plan or training outline from a rough idea, or think through whatever real work is "
        +"in front of them. Be concrete — a short plan, a few next steps, an actual draft — not a "
        +"lecture about how you'd approach it. You're not Quill or the Monk; you don't need to "
        +"reference the Library or matters of conduct unless the visitor brings them up. If a "
        +"request would genuinely be better as a structured course (the Course Board) or a grounded "
        +"project workspace (the Research Desk, the Grant Desk), say so plainly and point there — "
        +"you're one tool among several here, not the only one."
        +referenceShelfBlock()
        +referenceBlock(lastAskOf('computer'))
        +rosterBlock('computer')
        +pastAsksBlock('computer');
    },
    errorLine:"…connection lost. (Check that your AI connection is still running.)",
  },
  /* The Pavilion Academy's Tutor (PAVILION-ACADEMY-PLAN.md Phase 1). One
     resident, four jobs — teach, quiz, review, and help teachers plan a lesson —
     under WORK_CHARTER (a subject is served on its own terms, never the dharma).
     General by default (learn/teach anything); grounded in a specific Learning
     Tree lesson when opened via studyLessonWithTutor(). */
  tutor:{
    label:'the Tutor',
    async systemPrompt(){
      const lesson=(state.dialog && state.dialog.agent==='tutor' && state.dialog.lesson) ? state.dialog.lesson : null;
      return WORK_CHARTER
        +"\n\nYou are the Tutor of the Pavilion Academy. Your one job is to BREAK A HARD THING DOWN until "
        +"it is genuinely understood — that is what you are for, and nobody else here does it. Go to first "
        +"principles, move in small steps, give a worked example, and check understanding as you go. Do "
        +"not summarise a book instead (that is Quill's work), and do not merely encourage; take the thing "
        +"apart. Follow the visitor's lead across four jobs:\n"
        +"1. TEACH a subject clearly — from first principles, in small steps, with a concrete example, "
        +"checking understanding as you go and inviting questions. A conversation, not a wall of lecture.\n"
        +"2. QUIZ — when asked, or when it would help, pose a few focused questions or a small exercise on "
        +"what was just covered, then grade the answer with specific, kind feedback that explains WHY, not "
        +"merely right or wrong.\n"
        +"3. REVIEW work the visitor pastes — an answer, an essay, code, a lesson draft: what is strong, "
        +"what to fix, and the reasoning behind each note.\n"
        +"4. PLAN LESSONS — when the visitor is a teacher (for example a language teacher planning a "
        +"class), help design a lesson or unit: clear objectives, a warm-up, core activities, guided then "
        +"independent practice, a check for understanding, and homework — practical and ready to use.\n"
        +"Meet the visitor where they are: before launching in, ask what they want to learn or teach, and "
        +"at roughly what level. Keep replies focused and readable. Be honest — if you are unsure, or "
        +"something is outside what you reliably know, say so and suggest checking a source rather than "
        +"bluffing; you are a patient study aid, not an accredited teacher. Encourage; never condescend."
        +(lesson?("\n\nThe visitor is studying this lesson — stay grounded in it; teach and quiz from it, "
          +"and if they are stuck, help with THIS specifically:\n"+lesson):"")
        +referenceShelfBlock()
        +referenceBlock(lastAskOf('tutor'))
        +rosterBlock('tutor')
        +pastAsksBlock('tutor');
    },
    errorLine:"…the Tutor's connection flickered. (Check that your local AI is still running.)",
  },
  sebastian:{
    label:'Sebastian',
    async systemPrompt(){
      // Reading companion — set when the visitor opens "Ask about this book"
      // from the Reader. He answers grounded in the book (and the exact page
      // they're on), a focused reading conversation rather than the day-read.
      const book=(state.dialog && state.dialog.agent==='sebastian' && state.dialog.book) ? state.dialog.book : null;
      if(book){
        return BUTLER_CHARTER
          +"\n\nYou are Sebastian, the butler of the Sand Pavilion, sitting with the visitor while they read. "
          +"They will ask you about this book — to explain a passage, define a word, draw out an idea, connect it to "
          +"something, or just talk it through. Answer grounded strictly in the text given below (its summary and, when "
          +"present, the exact page they're on). If they ask about something not in what you're given, say so plainly "
          +"rather than inventing it, and offer what you can from what's here. Keep answers clear, warm, and to the "
          +"point — written to be read while reading.\n\n"
          +"BOOK: "+book.title+"\n"
          +(book.summary?("SUMMARY: "+book.summary+"\n"):"")
          +(book.where?("\n"+book.where+":\n"+book.text+"\n"):"")
          +rosterBlock('sebastian')
        +pastAsksBlock('sebastian');
      }
      // scoped folder review — set only when the visitor hands him one folder
      // from the notes log; he sees just those notes, never the whole pile.
      const review=(state.dialog && state.dialog.agent==='sebastian' && state.dialog.review) ? state.dialog.review : null;
      const reviewBlock = review
        ? "\n\nThe visitor has asked you to look over the notes gathered in their \""+review.folder+"\" folder and "
          +"help tidy them — suggest how they might be grouped, merged, shortened, or given a clearer shape, and "
          +"name anything that seems to belong elsewhere. Work ONLY from these notes; invent none that aren't here, "
          +"and keep it brief and practical rather than exhaustive:\n"
          +review.notes.map(n=>`- (${n.where}) ${n.title}: ${(n.text||'').slice(0,400)}`).join('\n')
        : "";
      return BUTLER_CHARTER
        +"\n\nYou are Sebastian, the butler of the Sand Pavilion, who keeps to the Workshop among the "
        +"working desks. You help the visitor with both home life and work as one single day — planning "
        +"it, keeping it, and telling the honest truth about it. You are THE HUB: the first person the "
        +"visitor talks to, and the one who knows where everything and everyone else is. When a question "
        +"belongs to a colleague, hand it over by name in one line and then get back to the day - that is "
        +"among the most useful things you do, and it is help rather than a refusal. "
        +"You know the Workshop's desks and point a visitor "
        +"to the right one: the Archive Desk for their own writing, the Research Desk to think a project "
        +"through, the Grant Desk for funding proposals, the Caravan Desk for bringing outside texts into "
        +"the Library, the Records Hall upstairs for their kept history. When you draft a schedule or a "
        +"plan for the day, lay it out as a short, clear list the visitor can actually keep — one line per "
        +"item, no preamble around it — so it can be dropped straight into their daily plan or read back "
        +"aloud. When an item happens at a particular time, begin that line with the clock time and an "
        +"am/pm (for example, \"9:00 AM — Morning sit\" or \"2:30 PM — Call the grant office\"), so it can "
        +"be placed on the calendar; a line with no natural time is simply a task and needs no time. Here "
        +"is the honest state of the visitor's day right now; speak from it, and never invent items that "
        +"aren't here:\n"
        +butlerDayRead()
        +sebModeBlock()
        +reviewBlock
        +rosterBlock('sebastian')
        +pastAsksBlock('sebastian');
    },
    errorLine:"Sebastian's connection flickers — the local AI didn't answer. (Check that Ollama is still running.)",
  },
};
/* Sebastian's read of the actual day — grounded in the real planner, the
   calendar, the upcoming due items, and still-open sparks. The calendar
   folds through upcomingItems() (BUTLER-SEBASTIAN-PLAN.md step 5), and
   today's timed events get their own line here so he can speak to the
   actual shape of the day. Computed only when he's actually spoken to —
   never on a timer, the no-background-polling rule. */
/* Sebastian's modes (the user's "multiple paths"): a gentle ease-in path (one
   meaningful thing a day) and a work path (a real schedule, held to). It's a
   prompt stance + a UI toggle, not a new system — same resident, met to your
   energy. Stored at data.settings.sebMode. */
function sebModeBlock(){
  const m=(data.settings&&data.settings.sebMode)||'ease';
  if(m==='work') return "\n\nToday the visitor has chosen WORK MODE: help them set a real, timed schedule "
    +"for the day and hold them to it — kindly but firmly. Favour a concrete plan they'll actually keep over "
    +"a long wish-list; if they're drifting, say so plainly and steer them back to the blocks they committed to. "
    +"Accountability, with warmth.";
  return "\n\nToday the visitor has chosen to EASE IN: help them pick and commit to ONE meaningful thing, "
    +"early, and keep everything else light — one clear win beats a full list, and starting is the whole "
    +"battle. Don't pile on tasks. If they've done their one thing, celebrate it plainly and let the rest of "
    +"the day be genuinely optional.";
}
export function setSebMode(m){
  if(!data.settings) data.settings={};
  data.settings.sebMode=m; persist();
  if(state.dialog && state.dialog.agent==='sebastian') renderChatQuickActions(state.dialog);
}
function butlerDayRead(){
  const k=todayKey();
  const day=data.planner[k];
  const intention=(day&&day.intention||'').trim();
  const blocks=(day&&day.blocks)||[];
  const tended=blocks.filter(b=>b.state==='tended').length;
  const rested=blocks.filter(b=>b.state==='rested').length;
  const waiting=blocks.filter(b=>b.state==='waiting').length;
  const upcoming=upcomingItems();
  const overdue=upcoming.filter(i=>i.due<k);
  const ahead=upcoming.slice(0,5);
  const open=openSparks();
  const todaysEvents=eventsOn(k);
  const lines=[];
  lines.push(intention ? `Today's stated intention: "${intention}".` : `No intention has been set for today yet.`);
  // a busy day is exactly when he must stay fast — capped, remainder named
  if(todaysEvents.length) lines.push(`On the calendar today: ${todaysEvents.slice(0,LIST_CAP).map(e=>`"${e.title}"${e.start?' at '+e.start:''}`).join('; ')}`
    +(todaysEvents.length>LIST_CAP?`, and ${todaysEvents.length-LIST_CAP} more`:'')+'.');
  if(blocks.length) lines.push(`Rhythm blocks: ${tended} tended, ${rested} rested, ${waiting} still waiting.`);
  if(ahead.length) lines.push(`Coming up (courses/grants due, and calendar events): ${ahead.map(i=>`"${i.title}" (${i.due<k?'OVERDUE, was due '+i.due:i.kind==='event'?'on '+i.due+(i.start?' at '+i.start:''):'due '+i.due})`).join('; ')}.`);
  else lines.push(`Nothing has a due date or event coming up.`);
  if(overdue.length>1) lines.push(`${overdue.length} items are overdue in total.`);
  if(open.length) lines.push(`${open.length} intention${open.length>1?'s':''} were set earlier and have not yet been acted on (the visitor's own open sparks).`);
  return lines.join('\n');
}

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
/* The Mountain Monk always gets the best available local model and real
   room to actually think (opts.think:true, the 'deep' token/timeout
   tier) — a standing decision, not a performance default: everything
   else in this game trades depth for speed on purpose, the Monk is the
   one place that trade explicitly does not apply. bestLocalModel()
   reads whatever isAvailable() already confirmed is actually installed
   — never a guess, never a hardcoded name that could go stale. */
function chatOptsFor(agentKey){
  if(agentKey!=='monk') return {};
  return { model: bestLocalModel(AI.availableModels, AI.model), think:true, deep:true };
}
async function sendChatMessage(q){
  const d=state.dialog; if(!d||!d.chat) return;
  const agent=CHAT_AGENTS[d.agent]||CHAT_AGENTS.quill;
  d.transcript.push({from:'user',text:q});
  d.history.push({role:'user',content:q});
  // Live streaming when the connected provider supports it (local Ollama) and
  // we're not pocketed — the reply, and the Monk's reasoning, reveal as they
  // generate instead of after the fact. Otherwise the classic "…" wait.
  const useStream = isAIActive() && !!AI.supportsStream && !d.minimized;
  if(useStream){ d.streaming={content:'',thinking:''}; d.thinking=false; }
  else { d.thinking=true; }
  renderChatView();
  let streamed=false;
  try{
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
    const aborted = err && (err.name==='AbortError' || /abort|timed?\s*out/i.test(String(err.message||'')));
    d.transcript.push({from:'npc', text: aborted ? TIMEOUT_LINE : agent.errorLine});
  }
  // let a paced resident finish saying it before the bubble is replaced
  await finishPacedReveal(d);
  d.thinking=false; d.streaming=null;
  if(d.minimized){
    // the visitor pocketed the phone and walked off — don't type into a
    // hidden overlay; buzz the floating card and reveal it on return
    d.unread=true; d._landedWhilePocketed=true;
    renderChatPhone();
    blip(880,.08,'sine',.04); setTimeout(()=>blip(1120,.08,'sine',.04),110);
  } else {
    // if it streamed in live, the text is already fully shown — just settle
    // it into a final bubble (with the collapsed thought); otherwise reveal
    // the buffered reply with the usual typewriter.
    renderChatView({typeLast: !streamed});
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
const PAVILION_TIMELINE=[
  {date:'2026-07-06', text:'The original module split — a real Store adapter contract, and the first sketch of a hosted backend (removed again 2026-08-02).'},
  {date:'2026-07-07', text:'The Workshop and the first AI agents, through git and GitHub — the Cafe, real accounts, steward auth, an AI-backed Steward, the agent-notes commons, the Research Desk, the first Vercel deploy.'},
  {date:'2026-07-08', text:'Reading notes in the Reader, local object storage (Docker and MinIO), the Classics and Science shelves, the arXiv/Semantic Scholar/SuttaCentral connectors, live SuttaCentral search from inside the game.'},
  {date:'2026-07-09', text:"The Keep's Ganesha statue, the Native American shelf, the reading-to-doing sparks system closing out, the Monk and Quill's roles split for real, the Writing Desk rebuilt around a real page instead of a stacked panel."},
  {date:'2026-07-10', text:"A dropped session's beta notes triaged and fixed, the Eightfold Path Temple and the Tool Commons written down as real long-term plans, and the Workshop itself grew these very floors you're standing in."},
];
export function openRecordsHall(){ state.ui='records'; hideAllOv(); renderRecordsHall(); showOv('recordsOv'); }
function renderRecordsHall(){
  document.getElementById('recordsPanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>The Records Hall</h2>
    <div class="meta">The Pavilion's own memory, made walkable instead of just
      committed. The full, real version lives in <code>archive/dev-log-*.txt</code>
      — this hall doesn't read those files live yet, on purpose (visuals
      first, the actual backend connection later); everything below is
      real and accurate, just hand-kept for now, not auto-generated.</div>
    ${PAVILION_TIMELINE.map(t=>`
      <div class="card" style="cursor:default">
        <div class="t">${esc(t.date)}</div>
        <div class="s">${esc(t.text)}</div>
      </div>`).join('')}`;
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
export function backendStatusLine(){
  const on = Store.dbAvailable && Store.dbAvailable();
  if(!on) return { on:false,
    text:'○ Running on this device alone — everything works. A local database (Docker + Postgres) '
        +'is an optional upgrade that adds search across all your notes and faster sorting of a big shelf — '
        +'it does not change how many books you can keep.' };
  return { on:true, text:'● Local database connected — your shelves, chapters and notes are indexed.' };
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
  const s=backendStatusLine();
  /* The ceiling warning rides on the same line, and only when it is true of
     THIS visitor — a browser reader whose shelf is filling up. Silence
     otherwise; a warning everyone sees is a warning nobody reads. */
  const ceiling=libraryCeilingLine();
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
function isLocalUrl(url){ return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)([:/]|$)/i.test(url||''); }
function localityBadge(c){
  const local = c.kind==='ollama' || isLocalUrl(c.baseUrl);
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
      ? `<div class="s" style="margin-top:6px">A 🏠 model answers entirely on this computer — nothing you say
          to a resident goes anywhere. The Mountain Monk will claim <b>${esc(best)}</b>, the largest local one,
          and everyone else runs on the connection's default.</div>`
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
        Two Pavilion facts worth knowing: <b>the Mountain Monk always claims the single largest
        model installed</b> — the biggest model on your machine is effectively his, and his
        reasoning streams live so slow-and-profound is watchable, not a dead panel. <b>Everyone
        else runs on the connection's default</b> — keep that a plain instruct model and the whole
        place feels alive. Start small; only move up a tier if replies feel thin. The full guide
        lives in <code>PROTOCOLS.md</code> (Protocol 2).
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
  if(state.readerPocket){ /* the book is pocketed — never interrupt it */ }
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
    ${section('Library', [
      item('openInventory()', '🎒 Inventory'),
      item('openReviewQueue()', '🛡 Steward Review'),
    ])}
    ${section('Local AI', [
      item('openConnections()', '⚙ Manage AI connections'),
      item('openLocalAIPanel()', '🧠 Local AI'),
      item('openVoiceSettings()', '🔊 Voice settings'),
    ])}
    ${section('Account & data', [
      item('openWaypoints()', '🔗 Waypoints'),
      item('openActivity()', '📜 Activity Log'),
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
/* The identity of a book note, in ONE place. gatherNotes() builds it and
   bookNoteFromKey() reads it back; anywhere else that wants to hand a note
   to the four doors (the Writing Desk does, now) has to agree exactly, and
   two copies of a hash recipe is precisely the drift this project keeps
   paying for. */
function bookNoteKey(slug, n){ return 'book:'+slug+':'+noteHash((n.ts||'')+'|'+(n.text||'')); }
function gatherNotes(){
  const out=[];
  for(const n of (data.notes||[]))
    out.push({source:'mynotes', icon:'📓', where:'My Notes', title:n.title||'Untitled note', text:n.body||'', date:n.updated||n.created||'', key:'mynotes:'+n.id, id:n.id, book:n.book||null});
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
      out.push({source:'book', icon:'📖', book:{slug},
        slug, bookTitle, ch:n.ch, chLabel:n.chLabel, page:n.page,
        where:'Book · '+bookTitle+(n.ch!==undefined?' · ch. '+n.ch:'')+(n.page!==undefined?' · p.'+(n.page+1):''),
        title, text:body, date:n.ts||'',
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
  Object.assign(state.notesLogView, {source:'book', book:slug||null, folder:'all', q:'', expanded:null});
  state.notesLogEdit=null;
  state.ui='notesLog'; hideAllOv(); renderNotesLog(); showOv('notesLogOv');
}
export function setNotesLogBook(slug){
  state.notesLogView.book = slug||null;
  state.notesLogView.expanded=null;
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
  return gatherNotes().filter(n=>{
    if(v.source!=='all' && n.source!==v.source) return false;
    // "everything I wrote about THIS book" (#42) — the one question the hub
    // could not answer, now that every gathered book note carries its slug.
    if(v.book && n.slug!==v.book) return false;
    const folder=noteFolderOf(n.key);
    if(v.folder==='__unfiled'){ if(folder) return false; }
    else if(v.folder && v.folder!=='all'){ if(folder!==v.folder) return false; }
    if(q){ const hay=(n.title+' '+n.text+' '+n.where+' '+noteTagsOf(n.key).join(' ')).toLowerCase(); if(!hay.includes(q)) return false; }
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
  all.forEach(n=>{ if(n.source==='book' && n.slug){
    const hit=books.find(b=>b.slug===n.slug);
    if(hit) hit.n++; else books.push({slug:n.slug, title:n.bookTitle||n.slug, n:1});
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
const NOTE_SELECT_STYLE="width:100%;background:#1b140d;border:2px solid #55432e;border-radius:7px;color:#f5e9d4;font-family:inherit;font-size:13px;padding:7px 9px";
function renderNotesLogList(){
  const el=document.getElementById('notesLogList'); if(!el) return;
  const v=state.notesLogView, folders=allFolders();
  let list=notesLogFiltered();
  if(!list.length){ el.innerHTML='<p style="color:#9c8b74">No notes here yet. Anything you write — beside a book, in a conversation, or at a desk — will gather here.</p>'; return; }
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
  el.innerHTML=list.map(n=>{
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
    const badges=`${folder?`<span class="badge" style="border-color:#7fa3c7;color:#a9c7e8">📁 ${esc(folder)}</span>`:''}${bookChip}${tags.map(t=>`<span class="badge lic">#${esc(t)}</span>`).join('')}`;
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
export function setNotesLogSearch(val){ state.notesLogView.q=val; state.notesLogView.expanded=null; renderNotesLogList(); }
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
    </div>` : (state.shelfTradition==='Personal'
      ? `<p>Your own shelf — empty so far, and that's the design: you fill it. Bring a text in at
         the Caravan Desk in the Workshop (drop a .txt file, paste Caravan output, or browse
         SuttaCentral), then press <b>👤 Shelve on Your Shelf</b>. It lands here, marked as yours.</p>`
      : '<p>This shelf waits for its first text.</p>');
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
  if(state.readerPocket && state.readerPocket.slug!==slug){ state.readerPocket=null; } // opening a different book retires any stale pocket
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
  if(carryBtn) carryBtn.textContent = data.inventory.includes(slug) ? '🎒 Carrying' : '🎒 Take with you';
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
  const note={ts:todayKey(),text};
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
  day.sparks.unshift({ts:todayKey(), text:note.text, source:d?d.title:slug, done:false});
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
      return `<div class="card" style="cursor:default">
        <div class="s">${esc(n.ts)}${pageTag}</div><div>${esc(n.text)}</div>
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
  const note={ ts:todayKey(), text:'✨ '+label+' (AI)\n'+String(text).trim() };
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
export async function loadBookText(slug){
  const d=Store.getDoc(slug); const ft=d && d.doc && d.doc.fullText;
  if(!ft) return null;
  if(ft.text) return ft.text;
  if(ft.storage && ft.storage.personal){
    const bridge=window.desktopBridge;
    if(bridge && bridge.libraryRead){
      try{ const res=await bridge.libraryRead(ft.storage.personal); if(res && res.ok) return res.text; }
      catch(e){ return null; }
    }
    return null;
  }
  if(ft.storage && ft.storage.bucket){
    try{
      const base=(import.meta.env && import.meta.env.VITE_MINIO_ENDPOINT) || 'http://localhost:9000';
      const res=await fetch(`${base}/${ft.storage.bucket}/${ft.storage.key}`);
      if(!res.ok) return null;
      return await res.text();
    }catch(e){ return null; }
  }
  return null;
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
  const note=document.getElementById('rdChapNote');
  if(note){
    if(!v) note.textContent='';
    else if(!info.marks.length) note.textContent='no chapter marks in this text';
    else {
      const cur=currentChapter(v);
      note.textContent = cur ? 'ch. '+cur.number+' of '+info.marks.length : info.marks.length+' chapters';
    }
  }
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
      if(state.readerPocket && state.readerPocket.slug===v.slug) state.readerPocket.page=cur.page;
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
function chapterInfo(v){
  if(!v) return {marks:[], how:'none'};
  if(!v._chapterInfo) v._chapterInfo = findChapters(v.pages);
  return v._chapterInfo;
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
/* Pocketing used to remember only the slug, so coming back dumped you at the
   summary and lost the page you were on ("if I pocket it, it will leave the
   page I was on"). It now carries the page too, and restores you exactly
   where you were — mid-book, mid-sentence if it's still reading. */
export function minimizeReader(){
  const slug=state.currentDoc; if(!slug) return;
  const v=state.fullTextView;
  state.readerPocket={ slug, page:(v&&v.slug===slug)?v.page:null };
  state.ui=null;                                  // free to walk
  document.getElementById('readerOv').classList.remove('open');
  showBookPocketFor(state.readerPocket);
  blip(520,.05,'sine',.03);
}
/* Also used when a book is left reading and you close the panel some other
   way — the pocket card is where a running book always lives. */
function showBookPocketFor(p){
  state.readerPocket = p && p.slug ? { slug:p.slug, page:(p.page ?? null) } : state.readerPocket;
  if(!state.readerPocket) return;
  renderBookPhone();
  clearInterval(bookPhoneTimer);
  bookPhoneTimer=setInterval(renderBookPhone,1000); // keep the status honest as speech starts/ends
}
export function restoreReader(){
  const p=state.readerPocket; if(!p) return;
  /* Land where the VOICE is, not where you closed it. If the book has been
     reading while you walked, state.bookAudio.page is the honest answer and
     the pocket's own page is a stale snapshot. Falls back to the pocket for a
     book that was pocketed silently, which is the only case where the page you
     closed on is still the page you want. */
  const speaking = state.bookAudio && state.bookAudio.slug===p.slug ? state.bookAudio.page : null;
  const page = speaking != null ? speaking : p.page;
  state.readerPocket=null; hideBookPhone();
  openReader(p.slug);                             // openReader never stops speech — audio carries straight through
  if(page!=null) openFullText(p.slug, page);
  blip(700,.05,'square',.03);
}
export function dismissReaderPocket(){
  state.readerPocket=null; state.bookAudio=null; stopSpeaking(); clearPaused(); hideBookPhone();
  blip(392,.05,'sine',.03);
}
/* Pause/resume straight from the pocket card, so a book you're listening to
   while walking around can be stopped and picked up without opening anything. */
export function togglePocketAudio(ev){
  if(ev&&ev.stopPropagation) ev.stopPropagation();
  if(isPaused()) resumeSpeaking();
  else if(isSpeaking()) pauseSpeaking();
  else { // nothing parked — start reading the pocketed page
    const p=state.readerPocket; if(!p) return;
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
  const p=state.readerPocket;
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
export function openIndex(){
  state.ui='index'; hideAllOv();
  state.indexCategory = state.indexCategory || 'classical';
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
    ${shown.length ? shown.map(i=>`
      <div class="card" onclick="openIndexItem('${i.kind}','${i.slug}')">
        <div class="t">${i.kind==='library'?'📖':'📔'} ${esc(i.title)}${i.kind==='library'?` <span class="badge lic">${esc(i.license)}</span>`:''}${isRecentlyAdded(i.added)?' <span class="badge">NEW</span>':''}</div>
        <div class="s">${esc(i.sub||'')}</div>
      </div>`).join('') : `<p>${search?'Nothing matches that search.':'Nothing here yet.'}</p>`}`;
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
function plannerDay(){
  const k=todayKey();
  if(!data.planner[k]) data.planner[k]={ intention:'', ember:'', blocks:DEFAULT_BLOCKS.map(n=>({name:n,state:'waiting'})), sparks:[] };
  if(!data.planner[k].sparks) data.planner[k].sparks=[]; // upgrade days saved before sparks existed
  if(!data.planner[k].log) data.planner[k].log=[]; // the day's bullet-journal log (SELF-LEARNING-JOURNAL-PLAN.md)
  return data.planner[k];
}
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
function toolTitle(id){
  if(id==='book'){ const b=deskBook(); return b ? b.doc.title : TOOLBOX_TITLES.book; }
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
initStudyTable({
  deskBook,
  loadBookText,
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
   state.readerPocket, a book you pocketed and walked off with. That IS
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
  const p=state.readerPocket; if(!p||!p.slug) return null;
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
    ${recent.length ? `<h4 style="margin:14px 0 4px">Your last notes on this book</h4>`
      + recent.map(n=>`<div class="card" style="cursor:default">
          <div class="s">${esc(n.ts||'')}${n.ch!==undefined?' · ch. '+n.ch:''}${n.page!==undefined?' · p. '+(n.page+1):''}</div>
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
     it, the page you are actually looking at, and your own notes on it.
     Nothing invented, and it says so where a piece is missing. */
  const page=(b.view && b.page!=null && b.view.pages[b.page]) ? String(b.view.pages[b.page]).slice(0,3000) : '';
  const ground='BOOK: "'+b.doc.title+'"'+((b.doc.attribution||b.doc.author)?' by '+(b.doc.attribution||b.doc.author):'')
    +'\nWHERE THEY ARE: '+deskBookWhere(b)
    +(page?'\n\nTHE PAGE IN FRONT OF THEM:\n'+page:'\n\n(no page text available — work from the notes below alone)')
    +(notes.length?'\n\nTHEIR OWN NOTES ON THIS BOOK:\n'+notes.map(n=>
        '- '+(n.ch!==undefined?'(ch. '+n.ch+') ':'')+(n.text||'')).join('\n')
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
  const inv=data.inventory.map(slug=>Store.getDoc(slug)).filter(Boolean);
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
    /* chatOptsFor() and not {} — the Monk's standing rule (best installed
       model, real room to think) is his wherever he is standing, and a desk
       that quietly downgraded him would look exactly like nothing at all. */
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
    'Build:      0.1.0-beta.3',
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
    state.termLast=docs.slice(0,40).map(d=>d.slug);
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
    '  open <number>      open one in the reader',
    '  stats              what is actually in here',
    '  hash <number>      the SHA-256 of a book — how you prove bytes are bytes',
    '  net                what this Pavilion talks to (spoiler: nothing)',
    '  man <command>      what a command does, and its real Linux equivalent',
    '  ask <question>     hand it to your local AI (needs a connection)',
    '  clear              wipe the screen','',
    'Every command here except `ask` runs entirely on this machine.',''];

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
    state.termLast=pick.map(d=>d.slug);
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
    if(!n||!last[n-1]) return ['open which? run  ls  or  find <word>  first, then  open <number>'];
    const slug=last[n-1];
    setTimeout(()=>{ closeUI(); openReader(slug); },60);
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
    const d=Store.getDoc(last[n-1]);
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
    + ['ls','papers','ds','owned','unread','shelf','stats','net','man','help'].map(function(c){
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
  const notes=(data.bookNotes[rec.book]||[]).filter(n=>!/^✨ /.test(n.text||''));  // your own, not the AI's
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

/* ================================================================
   The Learning Tree — COURSE-PROGRESSION-PLAN.md, Phase 0+1, beta-
   tested with the "A Beating Heart" lesson (lessons/01). Built-in,
   curated curriculum (like the Hall's seed investigations), distinct
   from the personal Course Board (data.courses). Nodes form a real
   prerequisite tree: a node is available only once its prereqs are
   done, locked-but-visible otherwise (you can see the whole climb).
   Progress is per-node in data.curriculum, saved like everything else.

   Two philosophies baked in at the user's ask:
   - Self-first, AI-last: every step is written to have you FIND and DO
     it yourself; asking a resident to help is offered only as the last
     resort, never the first move.
   - Privacy/sandbox: stated plainly at the top — nothing here leaves
     your machine; the Pavilion is your own private sandbox.
   ================================================================ */
const CURRICULUM = [
  // ---- Getting Started ----
  { id:'beating-heart', track:'Getting Started', level:101, prereqs:[],
    title:'A Beating Heart — get your local AI running',
    summary:"Give the Pavilion its heartbeat: a free AI running on your own machine, so the residents actually talk back. No coding, about 20 minutes.",
    more:'lessons/01-a-beating-heart.md',
    steps:[
      {title:'Check what YOUR machine can run', body:"Open Task Manager (Ctrl+Shift+Esc) → Performance and note your RAM, and whether you have a real graphics card. Match it to a model size — pick smaller if unsure. Do this yourself first; it's the habit that makes all the rest make sense."},
      {title:'Install Ollama', body:"Get it from ollama.com (or, on Windows, `winget install Ollama.Ollama`). It runs quietly in your system tray afterward."},
      {title:'Pull your model', body:"In a terminal: `ollama pull llama3.2` (or the size your machine fits). Run `ollama list` to confirm it downloaded."},
      {title:'Connect it to the Pavilion', body:"Desktop app: automatic. Browser: set OLLAMA_ORIGINS (the full lesson shows how). Look for the green ● Connected line on the title screen.", action:{label:'Open ⚙ Manage AI connections', fn:'openConnections'}},
      {title:'Say hello to Quill (the real test)', body:"Talk to Quill in the Library. If he answers in his own words, grounded in the actual books — your Pavilion has a beating heart."},
    ]},
  { id:'first-book', track:'Getting Started', level:101, prereqs:[],
    title:'Make the Library yours — add your first book',
    summary:"The Library grows because you grow it. Bring in a book you actually want to read. (No AI needed — this one stands on its own.)",
    more:'PROTOCOLS.md',
    steps:[
      {title:'Find a genuinely free book', body:"Project Gutenberg or Standard Ebooks. 'Free to read' isn't the same as 'free to keep' — look for public domain or a CC license. Pick something you truly want; that's the point."},
      {title:'Get it as .epub or .txt', body:"Most sites offer both. EPUB is fine — the game unpacks it itself, no conversion."},
      {title:'Drop it on the Caravan Desk', body:"Workshop → face the Caravan Desk (press E) → '+ Add a text by hand' → drag your file onto the drop zone. Title and author fill themselves in.", action:{label:'Open the Caravan Desk', fn:'openReviewQueue'}},
      {title:'Pick its shelf and add it', body:"Choose the shelf (tradition), confirm the license, and press '📚 Add to my Library now.' It appears on that shelf, marked 👤 as yours."},
      {title:'Go read it', body:"Walk to the shelf you chose (or Your Shelf by the reading nook) and open your book. It's part of your Library now — and you can always find it in the Stacks.", action:{label:'Browse the Stacks', fn:'openCatalog'}},
    ]},
  { id:'library-storage', track:'Getting Started', level:201, prereqs:['first-book'],
    title:'Room for a Library — local storage with Docker (optional)',
    summary:"For a BIG library, not just a few books: give the Pavilion a local storage room with Docker + MinIO, on your own machine. Optional and a bit more advanced — personal books need none of this.",
    more:'lessons/02-room-for-a-library.md',
    steps:[
      {title:'Decide if you need it', body:"Only if you want a large, growing collection of full texts. A few personal books are stored as plain files already — no Docker needed. Be honest about which you're doing before setting anything up."},
      {title:'Know the size (it’s reassuring)', body:"A whole book as text is under ~1 MB, so 1 GB holds ~1,000 books. Give it about 32 GB of headroom to start — 'as big as a game' — which is far more than you'll likely use. You don't pre-carve a fixed size; it just grows in the folder you give it."},
      {title:'Install Docker Desktop', body:"From docker.com. On Windows it sets up WSL2 for you; restart if asked, and let the whale icon go steady."},
      {title:'Run MinIO, pointed at a real folder', body:"One `docker run` line (see the full lesson) with `-v C:\\sand-pavilion-library:/data` — that folder on your drive IS your library's storage. Do it yourself following the lesson; that's how you'll know how to move or grow it later."},
      {title:'Confirm and grow when needed', body:"`curl http://localhost:9000/minio/health/live` should answer. To grow later: it grows on its own, or move the folder to a bigger drive and re-run. There's no cap but your disk."},
    ]},
  { id:'meet-residents', track:'Getting Started', level:101, prereqs:['beating-heart'],
    title:'Meet the residents — put the heartbeat to work',
    summary:"Now that your AI is running, actually work with the people who live here. This one needs a beating heart first.",
    steps:[
      {title:'Ask Quill about the shelves', body:"In the Library, ask Quill what's worth reading for something you actually care about. He's grounded in the real books."},
      {title:'Sit with the Monk', body:"In the Keep, bring the Monk a real question of meaning or practice — not trivia. He answers differently than the others."},
      {title:'Plan a day with Sebastian', body:"In the Workshop, ask Sebastian for a schedule, then use '📋 Send this plan to today' to drop it straight onto your calendar and plan.", action:{label:'Open the Calendar', fn:'openCalendar'}},
      {title:'Notice where it all happened', body:"Every one of those conversations ran on your own machine and left it never. That's the whole idea — help that's genuinely yours."},
    ]},
  // ---- Coding (the next track — shown so you can see the shape and what's missing) ----
  /* WRITTEN FOR REAL 2026-07-28, and deliberately reordered from the outline it
     replaces. The old shape saved "make a change" for last, as a reward for
     understanding. That is backwards: changing one line and watching it happen
     is what makes the rest worth learning, so it moved to step 2. Everything
     after it exists to make changing things feel safe rather than frightening. */
  { id:'coding-101', track:'Coding', level:101, prereqs:['beating-heart'],
    title:'Coding 101 — your first real change to this actual place',
    summary:"Not a course about programming in the abstract — six steps in this codebase, on your machine. By the end you will have changed something in the Pavilion, proved you didn't break it, and saved that change under your own name. That is the whole unlock: after it, every idea you have becomes something you can try instead of something you have to ask for.",
    steps:[
      {title:'Five commands, and that is genuinely most of it',
       body:"Open a terminal in the project folder. `npm run dev` starts it and gives you a localhost link. `npm test` checks nothing is broken. `git status` shows what you changed. `git diff` shows exactly what. `git log --oneline -5` shows the last five things anyone did. That is the working set — everything else you can look up when you need it. The terminal is not a skill, it is a habit of typing five things."},
      {title:'Change one line, and watch it change',
       body:"With `npm run dev` running: open `src/game/ui/overlays.js`, find any sentence you have read in the app — search for a phrase you remember seeing — and edit it. Save. The browser updates by itself, instantly. That's it. That's the whole loop, and it is the same loop for a one-word fix and a new room. Sit with how small it is for a second, because the size of that gap is the thing that was stopping you."},
      {title:'Break something on purpose, then read the error',
       body:"Delete a closing brace and save. The app goes blank and the console (F12 → Console) says exactly where. Put it back. Do this once deliberately, while nothing is at stake, so that the first time it happens by accident you recognise it as information rather than disaster. Every error message names a file and a line number; that is the message telling you where to look, not scolding you."},
      {title:'Prove you did not break anything else',
       body:"Run `npm test`. It takes about a second and checks the things this project has actually got wrong before: a button wired to a function that doesn't exist, a room with no exit, a save field that never got a privacy line. If it passes, your change is safe. This is why changing things stops being frightening — you are not relying on care, you have a net."},
      {title:'Save it under your own name',
       body:"`git add -A`, then `git commit -m \"my first change\"`. That version now exists forever and you can always return to it — which means from here on, nothing you try can lose anything. This is the actual reason git matters, and it is worth learning for that reason alone rather than because it is professional.",
       action:{label:'Read The Log — the same idea, for days', fn:'openActivity'}},
      {title:'Trace one button from click to answer',
       body:"Pick a button in the app. Search `overlays.js` for its label, find the `onclick=\"someName()\"` beside it, then search for `function someName`. Read that function. You have now followed a real path from a thing you pressed to the code that answered — the single most useful thing you can learn to do, because after this you can find anything by pulling on the visible end of it.",
       action:{label:'Open the Computer and ask it to walk you through one', fn:'openComputer'}},
    ]},
  // ---- Electronics (the beta test for the lab + research room — RESEARCH-ROOM-PLAN.md) ----
  { id:'electronics-101', track:'Electronics', level:101, prereqs:[],
    title:'Electronics 101 — light your first LED',
    summary:"Teach yourself the real basics, hardware or not, and use the Science Hall as your lab to test what you learn. This is the beta test for the research room — notice anywhere you think 'where do I put this?'",
    steps:[
      {title:'The core idea: voltage, current, resistance', body:"Voltage pushes, current flows, resistance limits — and Ohm's law ties them together: V = I x R. Get this one idea solid before touching parts. Find a free primer yourself; All About Circuits has a free online textbook and SparkFun's tutorials are friendly."},
      {title:'Start with no hardware — a free simulator', body:"You don't need to buy anything to begin. The free Falstad circuit simulator (falstad.com/circuit) builds and runs circuits right in your browser — wire a battery, a resistor, and an LED and watch the current move."},
      {title:'Light an LED (the hello-world)', body:"In the simulator, or a cheap breadboard kit if you have one: battery -> resistor -> LED -> back to battery. The resistor keeps the LED from burning out. Getting it to glow is electronics' hello-world."},
      {title:'Test it in the Lab', body:"Now use the Science & Research Hall as your lab: open a self-experiment or an investigation like 'does doubling the resistor roughly halve the brightness?' Predict first, then check in the simulator or with a meter. Letting the evidence settle it IS the lab working.", action:{label:'Open the Science & Research Hall', fn:'openScienceHall'}},
      {title:'Keep your notes and a datasheet', body:"Every component has a datasheet. Find your LED's, paste it into the Research Desk, and summarize it into notes you keep. Your growing electronics notes and ideas live there — private until you choose to share a build.", action:{label:'Open the Research Desk', fn:'openResearchDesk'}},
    ]},
  { id:'electronics-201', track:'Electronics', level:201, prereqs:['electronics-101'],
    title:'Electronics 201 — measure for real, and read the drawing',
    summary:"101 was one glowing LED. This rung is about stopping guessing: a meter in your hand, a schematic you can actually read, and the two parts that turn a circuit from a light into a machine. Everything here is checkable against a number.",
    steps:[
      {title:'Buy the one tool that matters',
       body:"A multimeter, £15-40. Not the most exciting purchase you will ever make and easily the most useful: it is the difference between \"I think there's power there\" and knowing. Get one with a continuity beeper — you will use that more than any other setting, because most of debugging is asking \"is this actually connected to that?\" and hearing the answer without looking up."},
      {title:'Measure the three quantities you already know the names of',
       body:"Voltage is measured ACROSS a component — probes on either side, circuit running. Current is measured THROUGH it — you break the circuit and let the meter complete it, which feels wrong the first time and is correct. Resistance is measured with the power OFF and the part out of circuit, or you are measuring the whole board. Do all three on the LED circuit from 101. Write the numbers down."},
      {title:'Predict, then measure — this is the actual lesson',
       body:"Before you touch the probes: work out from Ohm's law what the current SHOULD be, and write the number down. Then measure it. It will be close but not equal, and the gap is the real lesson — resistors are typically ±5%, your battery is not exactly 9V, and the LED's forward voltage is a range not a value. A circuit that behaves exactly as calculated usually means you calculated what you measured. Log this one at the Bench.",
       action:{label:'Open the Bench and predict it first', fn:'openScienceHall'}},
      {title:'Read a schematic, and then draw one',
       body:"A schematic is a sentence about connection, not a picture of a board — the layout means nothing, only what touches what. Learn six symbols and you can read most beginner circuits: battery, resistor, capacitor, diode/LED, switch, ground. Then do the harder half: draw YOUR breadboard circuit as a schematic. Anything you cannot draw, you have not understood yet, and that is worth finding out on paper rather than at 2am with a meter."},
      {title:'The transistor: a switch with no moving parts',
       body:"A small current into the base lets a much larger current flow collector-to-emitter. That is the whole idea, and it is the single most important sentence in electronics — every computer is this trick, repeated. Wire a 2N3904 so a microcontroller pin can switch an LED far brighter than the pin could ever drive directly. Base resistor around 1k. Note that you have just built the exact circuit the remote needs."},
      {title:'The capacitor: a bucket for charge',
       body:"It resists CHANGE in voltage, which makes it two things at once: a small local reservoir that steadies a supply when something suddenly draws current (a \"decoupling cap\", why boards are covered in them), and half of every timing circuit, because charging through a resistor takes a predictable amount of time. Both uses are the same property seen from different sides."},
      {title:'Break something on purpose',
       body:"Take an LED, leave out the resistor, and connect it straight across the battery. It will flare and die, and you will never again wonder why the resistor is there. Do it once, deliberately, with a component you can afford to lose — a lesson you paid a few pence for is one you keep. Then log what you predicted and what actually happened.",
       action:{label:'Log it at the Bench', fn:'openScienceHall'}},
    ]},
  { id:'electronics-301', track:'Electronics', level:301, prereqs:['electronics-201'],
    title:'Electronics 301 — build a universal remote from scratch',
    summary:"A real project with a real ending: a thing on your table that changes the channel. Six stages, each finishing in something that works. This is where the meter, the transistor and the datasheet stop being exercises. Full reading list, parts and the protocol reference are in plans/UNIVERSAL-REMOTE-PROJECT.md.",
    steps:[
      {title:'Understand why the beam is chopped',
       body:"A remote does not send plain infrared. It chops the beam roughly 38,000 times a second. The reason is the best idea in the whole project: sunlight, bulbs and fluorescent tubes all pour out infrared, so a plain flash is a whisper in a shouting room — but chop it at a known frequency and band-pass filter for exactly that frequency at the far end, and everything that is not your signal falls away. That is amplitude modulation and noise rejection, the spine of radio, on a breadboard for eight dollars."},
      {title:'Stage 1 — see the signal',
       body:"A TSOP38238 receiver (three pins: ground, Vs, out) and an Arduino. Print the raw pulse timings from your own TV remote to the serial monitor. Nothing is decoded yet — you are just looking at the numbers coming off a real remote. This is your first genuine measurement of something you did not build."},
      {title:'Stage 2 — decode one frame BY HAND',
       body:"Take a capture from stage 1 and work out the bits on paper before letting any library do it. NEC format: a 9ms burst and 4.5ms space to open, then 32 bits — a 560us burst every time, followed by a 560us space for 0 or a 1690us space for 1. The 32 bits are address, address inverted, command, command inverted. Check that the inverted copies really are complements: if they are not, you misread the frame. This is the stage everyone skips and the only one that teaches you anything."},
      {title:'Stage 3 — send one command',
       body:"An IR LED (TSAL6200) driven through a 2N3904 — the exact transistor circuit from 201, and now you know why the pin alone will not do: a pin gives about 20mA and the LED is rated for far more, and range depends on it. Transmit the power code. The TV responds. That is the moment it stops being an exercise.",
       action:{label:'Predict the range before you try it', fn:'openScienceHall'}},
      {title:'Stage 4 — capture and replay anything',
       body:"Store the raw timings, play them back. This alone is a working LEARNING remote — the same thing sold in shops — and it works on devices whose protocol you never identified, because you are replaying the waveform rather than understanding it."},
      {title:'Stage 5 — make it universal',
       body:"Decode to protocol plus address plus command rather than raw timings, keep a table of device codes, and add a keypad. The difference between stage 4 and stage 5 is the difference between a recording and a language: now you can send a command you never captured."},
      {title:'Stage 6 — make it an object',
       body:"An enclosure off the 3D printer, a battery, real buttons. Something that sits on the table and belongs there. Then write the whole thing up at the Bench — what you predicted at each stage and what actually happened — because a build log someone else could follow and reproduce is worth more than the remote.",
       action:{label:'Read your build log with the Investigator', fn:'openLab'}},
    ]},
  // ---- Cybersecurity (planned — CYBERSECURITY-PLAN.md; defensive/educational, authorized practice only) ----
  { id:'security-101', track:'Cybersecurity', level:101, prereqs:[],
    title:'Security 101 — see what your own machine is doing',
    summary:"Security starts with SEEING, not with tools. Six steps, each one a real thing you look at on your own computer — most of them using the Computer in the Study, and every one naming the Linux command that does the same job for real. Defensive and educational throughout: you learn to watch your own machine, and anything adversarial happens on targets that exist to be broken.",
    steps:[
      {title:'Learn to ask the machine: man',
       body:"Open the Computer and type `man`. Then `man ls`, then `man man`. Every page says what the command does HERE and what its equivalent is on a real Linux or macOS box — because these commands were named after real ones on purpose. This first step is the whole method: when a word is unfamiliar, ask the machine instead of guessing. On Linux that habit is `man <thing>`, `apropos <word>` when you don't know the name, and `--help` when you just want the flags.",
       action:{label:'Open the Computer', fn:'openComputer'}},

      {title:'Know what you are trusting: hash something',
       body:"In the Computer: `ls`, then `hash 1`. You get a SHA-256 — sixty-four characters that change completely if one character of that book changes. That is the whole idea, and it is the foundation under signed downloads, package managers and git. You have already relied on it: it is how you checked the Pavilion's own installer was the file it claimed to be. Do it to a book you own so it stops being abstract. `man hash` gives you `sha256sum` for real files.",
       action:{label:'Try it at the Computer', fn:'openComputer'}},

      {title:'Know what is talking: type net',
       body:"In the Computer: `net`. It tells you, honestly, that this app makes no network requests on its own — and then tells you not to believe it and how to check (F12 → Network → reload; it stays empty). **Verify it.** A claim you tested is worth more than a promise you were given, and being the kind of person who checks is most of security. `man net` gives you the real versions: `ss -tulpn` on Linux to see what is LISTENING on your machine and which program owns each port, `lsof -i` from the other side.",
       action:{label:'Run net, then check it yourself', fn:'openComputer'}},

      {title:'Look at your own machine, outside the game',
       body:"Now the real thing, with no Pavilion involved. On Windows: Task Manager → Details for what is running, and `netstat -ano` in a terminal for what is listening. On Linux or macOS: `ps aux`, `ss -tulpn`, `lsof -i`. You will not understand most of it, and that is correct — the skill is noticing what is NORMAL for your machine, so that one day something abnormal stands out. Write down three things you did not recognise and look them up. That is a real evening's work and worth more than any course."},

      {title:'Where the line is, and why we hold it',
       body:"Two rules this project holds to and you should too. First: only ever probe machines you own or have written permission to test — the difference between a security researcher and a criminal is permission, not skill. Second: the Pavilion will never ship a fake vulnerable box for you to break. A simulated target teaches simulated lessons, and this whole project's ethic is that the checkable thing is the real thing. So the seeing happens here, on your own machine, honestly; the breaking happens somewhere built for it."},

      {title:'Practise where it is legal: Hack The Box',
       body:"HTB Academy's Starting Point is free, guided, and consists entirely of machines that exist to be broken into. TryHackMe is the gentler sibling and also good. Both give you a legal target, a hint when you are stuck, and a writeup when you are done. This is the honest next rung and it is deliberately OUTSIDE the Pavilion — build the habit of seeing here, and go and practise where the targets are real and permitted.",
       action:{label:'Add these to your Waypoints', fn:'openWaypoints'}},

      {title:'Then: Linux, and the tools that live there',
       body:"Nearly all of this work happens on Linux, and the reason is not fashion — it is that the tools are there, they are free, and the system is legible in a way that rewards looking. A cheap old laptop with Ubuntu or Debian on it, or WSL on the Windows machine you already have, is enough to start. Everything you learned in the steps above is the same word: `ls`, `man`, `sha256sum`, `ss`. You will already know how to ask.",
       action:{label:'Keep this as a Path you are walking', fn:'openPaths'}},
    ]},
];
/* ----- Lessons you wrote yourself (ADMIN-AND-AUTHORING-PLAN #3).
   The built-in CURRICULUM lives in this file — source code — so until now a
   visitor could build a Course Board course but never a PROGRESSION: a 101
   that unlocks a 201. That's the thing COURSE-PROGRESSION-PLAN calls crucial
   for other people getting on board, and it's exactly what a teacher wants.
   So the tree now reads from two places. Yours carry `mine:true`, sit in
   their own track, and are otherwise ordinary nodes — prerequisites, progress,
   and "Study with the Tutor" all work on them unchanged. */
function myLessons(){ if(!data.myLessons) data.myLessons=[]; return data.myLessons; }
function allNodes(){ return [...CURRICULUM, ...myLessons()]; }
function curriculumNode(id){ return allNodes().find(n=>n.id===id); }
function lessonProgress(id){ return data.curriculum[id]||(data.curriculum[id]={steps:{}}); }
function lessonDone(node){ if(!node||!node.steps.length||node.status==='planned') return false; const p=data.curriculum[node.id]; return !!p && node.steps.every((_,i)=>p.steps[i]); }
function lessonAvailable(node){ return (node.prereqs||[]).every(pid=>lessonDone(curriculumNode(pid))); }
function lessonCompletedCount(node){ const p=data.curriculum[node.id]; return p ? node.steps.filter((_,i)=>p.steps[i]).length : 0; }
export function openLearningTree(){ state.ui='tree'; hideAllOv(); state.treeView={mode:'list'}; renderLearningTree(); showOv('treeOv'); }
export function openLesson(id){
  const node=curriculumNode(id); if(!node) return;
  /* A locked lesson OPENS — changed 2026-08-02, and it is the change the whole
     progression principle turns on. The gate is on the CLAIM, never on the
     learning: nothing here is ever withheld from anyone, and a tree that hides
     its own text from you is a wall rather than a ladder. What "locked" costs
     you is the tick, not the reading. See COURSE-PROGRESSION-PLAN.md, "What the
     ladder is actually for." A node still being written is a different case —
     there is genuinely nothing to show yet. */
  if(node.status==='planned'){ state.treeView={mode:'list'}; renderLearningTree(); return; }
  state.treeView={mode:'lesson',id}; renderLearningTree();
}
export function backToTree(){ state.treeView={mode:'list'}; renderLearningTree(); }
/* The Academy Tutor (PAVILION-ACADEMY-PLAN.md Phase 1) — a conversation with the
   Tutor over the existing chat stack. openAcademy() is the general door (learn
   or teach anything); studyLessonWithTutor() grounds it in one Learning Tree
   lesson. Both reuse streaming, the pocket phone, and read-aloud for free. */
export function openAcademy(){
  openChatDialog({ name:'THE ACADEMY · Tutor', aiAgent:'tutor', color:'#5f8a4e', glow:'#bfe3a3',
    lines:["Welcome to the Academy. What shall we work on — learn a subject, be quizzed on one, have me "
      +"review something you wrote, or plan a lesson for a class? Tell me the topic and roughly your level, "
      +"and we'll begin."] });
  if(!isAIActive() && state.dialog){ state.dialog.transcript.push({from:'npc', text:"(Connect a local AI first — ⚙ Manage AI connections — and I can actually teach back.)"}); renderChatView(); }
}
export function studyLessonWithTutor(id){
  const node=curriculumNode(id); if(!node) return;
  const lessonText=node.title+'\n'+node.summary+'\n\n'+lessonAsText(node);
  openChatDialog({ name:'THE ACADEMY · Tutor', aiAgent:'tutor', color:'#5f8a4e', glow:'#bfe3a3',
    lines:['We’re on “'+node.title+'”. Want me to teach it, quiz you on it, or help where you’re stuck? Ask me anything about it.'] });
  if(state.dialog){ state.dialog.lesson=lessonText; renderChatView(); }
}
/* Lessons live in the codebase (CURRICULUM + lessons/*.md). Two pathways OUT of
   them, at the user's ask (2026-07-26): (1) plainly SAVE a lesson into your Notes
   so it's yours to keep, edit, and link to a book — no AI, always works; (2) have
   the local AI DRAFT A LESSON PLAN from it (a personal, scheduled study plan),
   saved as a note too. The AI path degrades gracefully — no model, an empty
   reply, or a dropped connection all fall back to "📓 Save to my Notes always
   works." Both land in the unified Notes hub, so a lesson becomes a real note. */
function lessonAsText(node){
  return node.steps.map((s,i)=>`${i+1}. ${s.title}\n   ${s.body}`).join('\n\n');
}
export function saveLessonToNotes(id){
  const node=curriculumNode(id); if(!node) return;
  const body=node.summary+'\n\n'+lessonAsText(node)+(node.more?`\n\n(Fuller written version: ${node.more})`:'');
  const note={id:newNoteId(), title:'Lesson — '+node.title, body, created:todayKey(), updated:todayKey()};
  data.notes.unshift(note); persist();
  logActivity('Saved the lesson "'+node.title+'" to Notes.'); blip(660,.08);
  const el=document.getElementById('lessonNoteMsg'); if(el) el.textContent='📓 Saved to your Notes — open 🗒 Your Notes (pause menu) to work with it.';
}
export async function draftLessonPlanFromLesson(id){
  const node=curriculumNode(id); if(!node) return;
  const el=document.getElementById('lessonNoteMsg');
  if(!isAIActive()){ if(el) el.textContent='Connect a local AI (⚙ Manage AI connections) to draft a plan — or use 📓 Save to my Notes, which needs no AI.'; return; }
  const btns=document.querySelectorAll('#lessonPlanRow button'); btns.forEach(b=>b.disabled=true);
  if(el) el.textContent='Your local AI is drafting a lesson plan… (a slower model may take a moment)';
  try{
    const reply=await AI.chat([
      {role:'system', content:WORK_CHARTER+'\n\nYou turn a lesson outline into a concrete, personal LESSON PLAN the learner can actually '
        +'follow. Given the lesson below, produce: a one-line goal; a short sequence of study sessions (each with what to do and roughly how '
        +'long); one small hands-on task per session; and a simple way to check understanding at the end. Keep it practical and encouraging, '
        +'grounded strictly in the lesson — invent no tools or steps that contradict it. Plain readable text.'},
      {role:'user', content:'LESSON: '+node.title+'\n\n'+node.summary+'\n\n'+lessonAsText(node)},
    ], {long:true});
    if(isEmptyReply(reply)){ if(el) el.textContent='The model came back empty — a lighter model may do better, or use 📓 Save to my Notes (no AI needed).'; }
    else {
      const note={id:newNoteId(), title:'Lesson plan — '+node.title,
        body:'✨ Drafted by your local AI from the lesson "'+node.title+'".\n\n'+String(reply).trim(), created:todayKey(), updated:todayKey()};
      data.notes.unshift(note); persist();
      logActivity('AI drafted a lesson plan from "'+node.title+'".'); blip(660,.08); setTimeout(()=>blip(825,.09),90);
      if(el) el.innerHTML='✨ A lesson plan is now in 🗒 Your Notes, yours to edit. '
        +'<button class="btn ghost" style="font-size:11px;padding:2px 8px" onclick="lessonFromPlanNote(\''+note.id+'\',\'lessonNoteMsg\')">🌳 Put it in the tree too</button>';
    }
  }catch(e){ if(el) el.textContent='The connection flickered — no plan this time (is your local AI still running?). 📓 Save to my Notes always works without one.'; }
  btns.forEach(b=>b.disabled=false);
}
/* ================================================================
   THE JOINT — a drafted plan becomes a lesson you can actually walk.
   THE-STUDY-CHAIN-PLAN.md Stage 1, and the fault it closes is worth
   stating plainly because it is the shape of the whole file's next
   decade of bugs:

     Everything here PRODUCES something. Almost nothing that gets
     produced can become the INPUT to the next thing.

   draftLessonPlanFromNote and draftLessonPlanFromLesson have both
   worked since 2026-07-26. Both wrote a real, sequenced study plan
   into a text note, where it stayed forever. Reported 2026-08-03 as
   "it's hard to link those to an active learning tree." Nothing was
   broken. There was simply nowhere for the thing to go.

   So: one button, on any note, that turns it into a real tree node —
   the same shape saveMyLesson() writes, standing beside the built-in
   lessons with real prerequisites available to it. The note survives
   and is linked both ways, because the prose is worth keeping and a
   parse is never the last word on it.

   The parsing lives in data/plan-to-lesson.js so `npm test` can hold
   it to what a small local model ACTUALLY writes, which is not what
   the prompt asked for. That lesson cost a day in July. */
export function lessonFromPlanNote(noteId, msgEl){
  const note=data.notes.find(n=>n.id===noteId); if(!note) return;
  const say=t=>{ const el=document.getElementById(msgEl||'noteSaved'); if(el) el.textContent=t; };
  const parsed=planToLesson(note.body||'', {title:note.title});
  if(!parsed.steps.length){ say('There is nothing in this note to walk yet — write a step or two first.'); return; }
  const node={ id:'mine-'+Date.now().toString(36),
    track:'Your own lessons', level:101,
    title:parsed.title||'A plan of your own',
    summary:parsed.summary||('From your note "'+(note.title||'untitled')+'".'),
    prereqs:[], steps:parsed.steps, mine:true, written:todayKey(), fromNote:noteId };
  myLessons().unshift(node);
  note.lesson=node.id; note.updated=todayKey();
  persist();
  logActivity('A plan became a lesson in the tree: "'+node.title+'".');
  blip(660,.08); setTimeout(()=>blip(825,.09),90);
  state.notesLogEdit=null; state.plannerNoteView={mode:'list'};
  state.ui='tree'; hideAllOv(); state.treeView={mode:'lesson',id:node.id}; renderLearningTree(); showOv('treeOv');
}
/* The note keeps a pointer at the lesson it became, so the round trip works
   from either end and neither is the "real" copy. */
export function openLessonFromNote(noteId){
  const note=data.notes.find(n=>n.id===noteId); if(!note||!note.lesson) return;
  if(!curriculumNode(note.lesson)){ delete note.lesson; persist(); return; } // it was deleted from the tree
  state.notesLogEdit=null; state.plannerNoteView={mode:'list'};
  state.ui='tree'; hideAllOv(); state.treeView={mode:'lesson',id:note.lesson}; renderLearningTree(); showOv('treeOv');
}

/* ================================================================
   PICKING ONE UP — THE-STUDY-CHAIN-PLAN.md Stage 2.

   "i want to be able to go to the tree and pick up a learning path."

   One field, data.study = {id, since}. ONE at a time, deliberately:
   you walk one path or you walk none. A list of active lessons is a
   second to-do list, and the standing rule here (the-day.js) is that
   a list of everything outstanding is a guilt inventory.

   What picking one up actually buys you: it is what THE DAY offers
   first, it sits at the top of the tree, and the pause menu says its
   name. Nothing is locked, nothing is scheduled, nothing nags. */
export function currentStudy(){
  const st=data.study; if(!st||!st.id) return null;
  const node=curriculumNode(st.id);
  if(!node){ data.study=null; return null; }        // the lesson was deleted out from under it
  return { ...st, node };
}
export function pickUpLesson(id){
  const node=curriculumNode(id); if(!node) return;
  data.study={ id, since:todayKey() };
  persist(); logActivity('Picked up a path: "'+node.title+'".'); blip(740,.09); setTimeout(()=>blip(880,.09),100);
  renderLearningTree();
}
export function putDownLesson(){
  const cur=currentStudy();
  data.study=null; persist();
  if(cur) logActivity('Put down the path "'+cur.node.title+'" — it is waiting, not failed.');
  blip(520,.07); renderLearningTree();
}
/* The next thing to actually do on the path you are walking — the same
   question THE DAY asks, answered here so both agree. */
export function nextStepOf(node){
  if(!node||!(node.steps||[]).length) return null;
  const p=(data.curriculum||{})[node.id]||{steps:{}};
  const i=node.steps.findIndex((_,k)=>!(p.steps||{})[k]);
  return i<0 ? null : { i, step:node.steps[i] };
}
export function toggleLessonStep(id,i){
  const node=curriculumNode(id); if(!node) return;
  const p=lessonProgress(id); const wasDone=lessonDone(node);
  p.steps[i]=!p.steps[i];
  if(!wasDone && lessonDone(node)){ p.completedAt=todayKey(); logActivity('Finished a lesson: "'+node.title+'".'); blip(659,.1); setTimeout(()=>blip(880,.12),110); }
  persist(); renderLearningTree();
}
function renderLearningTree(){
  const v=state.treeView||{mode:'list'}, panel=document.getElementById('treePanel');
  const tabs=(active)=>`<div class="row" style="gap:6px;margin:10px 0;flex-wrap:wrap">
    <button class="btn ${active==='list'?'':'ghost'}" onclick="treeTab('list')">🌳 Your tree</button>
    <button class="btn ${active==='collective'?'':'ghost'}" onclick="treeTab('collective')">🏛 The collective tree</button>
  </div>`;
  if(v.mode==='collective'){
    const nodes=collectiveNodes();
    const mine=nodes.filter(x=>x.__mine).length;
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>🏛 The collective tree</h2>
      ${tabs('collective')}
      <div class="meta">Everything people have actually <b>handed on</b> — a class they wrote, notes worth
        reading, an analysis they kept. <b>Finishing something adds nothing here.</b> Only contributing
        does, which is the whole point: this is not a record of what anyone consumed, it's a record of
        what they gave back.</div>
      <div class="meta" style="margin-top:8px">It grows as packets reach you, so what you see is
        <b>the part of the commons that has actually come your way</b> — never "everything," because
        there is no everything. Someone who has swapped packets with different people sees a different
        tree, and neither of you is missing out on a complete version that exists somewhere.</div>
      ${nodes.length?`
        <div class="meta" style="margin:10px 0"><b>${nodes.length}</b> contribution${nodes.length===1?'':'s'}${mine?` · <b>${mine}</b> of them yours`:''}. Branches run from what a lesson needs to what it opens.</div>
        ${renderTreeGraph(nodes, {
          needsOf:x=>x.needs||[],
          onClickAttr:x=>`onclick="openPacket('${esc(x.id)}')"`,
          cardHTML:x=>`<div class="t" style="font-size:12.5px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${x.kind==='lesson'?'🎓':x.kind==='course'?'🧭':x.kind==='paper'?'📄':'🗒'} ${esc((x.title||'').slice(0,44))}</div>
            <div class="s" style="font-size:11px">by ${esc(x.by||'unknown')}${x.__mine?' · yours':''}</div>`,
        })}`
        :`<p class="meta" style="margin-top:14px"><b>Nothing has been contributed yet.</b> That is the
          honest starting state of a commons whose entry price is real work.
          <br><br>Two ways to put the first thing in it: publish a lesson you wrote (🌳 Your tree →
          open one → 🤝 Publish), or accept a packet someone hands you at the Commons Table.</p>`}
      <div class="row" style="margin-top:16px;gap:6px;flex-wrap:wrap">
        <button class="btn ghost" onclick="openCommonsTable()">🏛 The Commons Table</button>
        <button class="btn ghost" onclick="treeTab('list')">← Your own tree</button>
      </div>`;
    return;
  }
  if(v.mode==='write'){
    const editing=v.id?curriculumNode(v.id):null;
    const others=allNodes().filter(n=>!editing||n.id!==editing.id);
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <div class="row" style="margin-bottom:8px"><button class="btn ghost" onclick="backToTree()">← The tree</button></div>
      <h2>✎ ${editing?'Rewrite':'Write'} a lesson ${visBadge('private')}</h2>
      <div class="meta">Yours stands in the tree beside the built-in ones. Give it prerequisites and it
        becomes a real progression — a 101 that opens a 201 — for you, or for whoever you're teaching.</div>
      <div class="card" style="cursor:default;margin-top:10px;border-color:#8fb4d9">
        <div class="t" style="font-size:13px">✨ Let the AI do the typing</div>
        <div class="s" style="margin-top:4px">Say what it's about; it drafts the rest. The direction stays
          yours — it never chooses prerequisites, and nothing is saved until you add it to the tree.</div>
        <div class="row" style="margin-top:8px;gap:6px">
          <input type="text" id="mlSeed" placeholder="e.g. how to meditate · studying the Dao De Jing · soldering" style="flex:1"
            onkeydown="if(event.key==='Enter'){event.preventDefault();draftLessonWithAI();}">
          <button class="btn" onclick="draftLessonWithAI()">Draft it</button>
          <button class="btn ghost" id="mlStopBtn" style="display:none" onclick="stopDrafting()">✕ Stop</button>
        </div>
        <div class="s" style="margin-top:6px;opacity:.8">It fills the form one field at a time — title, then summary,
          then each step — so you can watch it arrive and stop whenever you've got enough.</div>
        <div class="meta" id="mlAiOut" style="margin-top:6px"></div>
      </div>
      <label style="margin-top:12px">Title</label>
      <input type="text" id="mlTitle" value="${esc(editing?editing.title:'')}" placeholder="e.g. Soldering 101 — a joint that holds">
      <label>What it's for, in a sentence or two</label>
      <textarea id="mlSummary" rows="2" placeholder="Why someone should walk this, and what they'll be able to do afterward.">${esc(editing?editing.summary||'':'')}</textarea>
      <div class="row" style="gap:6px;flex-wrap:wrap">
        <div style="flex:1;min-width:150px"><label>Track (a heading in the tree)</label>
          <input type="text" id="mlTrack" value="${esc(editing?editing.track:'Your own lessons')}"></div>
        <div style="width:110px"><label>Level</label>
          <input type="number" id="mlLevel" min="101" max="999" step="1" value="${editing?Number(editing.level)||101:101}"></div>
      </div>
      <label>The set text <span class="badge lic">optional</span></label>
      <div class="meta">Name the book this lesson is about and every step that mentions a chapter or a page
        becomes a door straight to it — write it however you like (<code>Read chapters 3–4</code>,
        <code>pp. 12-18</code>); it is read, not a code you have to learn.</div>
      ${(function(){
        /* HONEST ABOUT WHICH BOOKS CAN CARRY A READING. On a fresh install 21
           of the 27 shipped books are summaries with no full text — so a
           teacher picking one at random would write "Read chapters 3-4",
           get no door, and have no idea why. The split is a property check,
           instant, and it is the difference between a feature and a trap. */
        const all=Store.allDocs();
        // arriving from a book preselects it — see writeLessonOnThisBook()
        const preset=(editing&&editing.book&&editing.book.slug) || v.book || '';
        const opt=d=>`<option value="${esc(d.slug)}"${preset===d.slug?' selected':''}>${esc(d.title)}${d.attribution?' — '+esc(d.attribution):''}</option>`;
        const readable=all.filter(d=>d.doc&&d.doc.fullText);
        const summary=all.filter(d=>!(d.doc&&d.doc.fullText));
        return `<select id="mlBook" style="${NOTE_SELECT_STYLE}">
          <option value="">— no set text —</option>
          ${readable.length?`<optgroup label="📖 full text — steps can link to a chapter or page">${readable.map(opt).join('')}</optgroup>`:''}
          ${summary.length?`<optgroup label="📄 summary only — a lesson can still be about it, but steps won't link">${summary.map(opt).join('')}</optgroup>`:''}
        </select>`;
      })()}
      <label>The steps — one per line</label>
      <div class="meta">Optionally put a longer explanation after a <b>|</b> on the same line:
        <code>Tin the tip | Melt a little solder onto the iron before you start; it makes everything after it work.</code></div>
      <textarea id="mlSteps" rows="7" placeholder="Buy a cheap iron and a reel of 60/40&#10;Tin the tip | Melt a little solder onto the iron first&#10;Join two wires, then tug them hard">${esc(editing?(editing.steps||[]).map(s=>s.title+(s.body?' | '+s.body:'')).join('\n'):'')}</textarea>
      <h3 style="margin-top:16px">Locked until… <span class="badge lic">optional</span></h3>
      <div class="meta">Tick any lesson that should be finished first. Leave them all unticked and yours is
        open from the start.</div>
      <div style="max-height:190px;overflow:auto;margin-top:8px">
        ${others.map(n=>`<label class="card" style="cursor:pointer;display:block">
          <input type="checkbox" class="mlPre" value="${esc(n.id)}"${editing&&(editing.prereqs||[]).includes(n.id)?' checked':''} style="width:auto;margin-right:6px">
          <b>${esc(n.title)}</b>${n.mine?' <span class="badge lic">yours</span>':''}
        </label>`).join('')}
      </div>
      <div class="row" style="margin-top:14px;gap:6px;flex-wrap:wrap">
        <button class="btn" onclick="saveMyLesson(${editing?`'${esc(editing.id)}'`:'null'})">${editing?'Save the changes':'Add it to the tree'}</button>
        ${editing?`<button class="btn ghost" style="border-color:var(--danger);color:var(--danger-soft)" onclick="deleteMyLesson('${esc(editing.id)}')">Delete this lesson</button>`:''}
      </div>
      <div class="meta" id="mlMsg" style="margin-top:6px"></div>`;
    setTimeout(()=>document.getElementById('mlTitle')?.focus(),30);
    return;
  }
  if(v.mode==='lesson'){
    const node=curriculumNode(v.id); if(!node){ return backToTree(); }
    const p=lessonProgress(node.id), done=lessonDone(node);
    const next=allNodes().filter(n=>(n.prereqs||[]).includes(node.id));
    // the set text, if this lesson names one and it is still on the shelves
    const setText=(node.book&&node.book.slug) ? Store.getDoc(node.book.slug) : null;
    const setReadable=!!(setText&&setText.doc&&setText.doc.fullText);
    /* HOW MANY CHAPTERS THE BOOK REALLY HAS, when we can know it without
       loading anything. `null` means genuinely unknown (the text lives in
       MinIO or on disk and has not been fetched) — and unknown is NOT the
       same as zero, so an unverifiable citation still gets its door and is
       simply resolved on the way in. What this catches is the citation the
       book CANNOT honour: "chapter 30" of a book with nine. Saying so on
       the lesson beats sending a class to a page that is not there. */
    const setChapters=(setReadable && setText.doc.fullText.text)
      ? findChapters(paginate(setText.doc.fullText.text)).marks.length : null;
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>${esc(node.title)}</h2>
      <div class="meta"><span class="badge">${node.track} · ${node.level}</span> ${done?'<span class="badge lic">✓ complete</span>':''}${node.mine?' <span class="badge lic">you wrote this</span>':''}</div>
      ${node.mine?`<div class="row" style="margin-top:6px;gap:6px">
        <button class="btn ghost" style="font-size:11px;padding:2px 8px" onclick="newLessonForm('${esc(node.id)}')">✎ Rewrite it</button>
        <button class="btn ghost" style="font-size:11px;padding:2px 8px" onclick="publishFrom('lesson','${esc(node.id)}')" title="Hand it on — it joins the collective tree">🤝 Publish it</button>
      </div>`:''}
      <div class="meta" style="margin-top:8px">${esc(node.summary)}</div>
      ${setText?`<div class="row" style="margin-top:6px"><button class="btn ghost" style="font-size:11.5px"
        onclick="openLessonReading('${jsq(setText.slug)}','page',1)" title="Open the set text">📕 Set text: ${esc(setText.title)}${setText.attribution?' — '+esc(setText.attribution):''}</button></div>`:''}
      ${(node.book&&node.book.slug&&!setText)?`<div class="meta" style="margin-top:6px;color:#e0a43c">📕 Its set text is no longer on these shelves.</div>`:''}
      ${(setText&&!setReadable)?`<div class="meta" style="margin-top:6px">This one is a summary rather than the full text, so steps can't link to a chapter or a page. The lesson works exactly as well; it just points at the book rather than into it.</div>`:''}
      ${(function(){
        /* An out-of-order lesson is READ IN FULL, and told plainly where it sits.
           A fact, not a refusal — and it always names the way round, because a
           curriculum confident in itself can say "learn it elsewhere and come
           back" out loud. COURSE-PROGRESSION-PLAN.md, "What the ladder is
           actually for." */
        if(lessonAvailable(node)) return '';
        const missing=(node.prereqs||[]).filter(pid=>!lessonDone(curriculumNode(pid)))
          .map(pid=>curriculumNode(pid)).filter(Boolean);
        return `<div class="card" style="cursor:default;margin-top:10px;border-color:#8fb4d9">
          <div class="t" style="color:#8fb4d9">This one comes after ${missing.map(m=>esc(m.title)).join(' and ')}</div>
          <div class="s" style="margin-top:6px">Read it anyway — all of it. Nothing here is ever withheld from
            anyone, and this is not a refusal. It is just where the rung sits: it assumes what the earlier one
            teaches, so it will make more sense afterwards.</div>
          <div class="s" style="margin-top:6px">What waiting protects is only the <b>tick</b> — the claim that
            you climbed the ladder, which is worth something precisely because the order was real. If you
            already know this material, don't tick it: <b>produce what it asks for.</b> The measurements, the
            drawing, the thing that works. An artifact settles it; a checkbox never did.</div>
          <div class="s" style="margin-top:6px">And if the ladder doesn't suit you, that is a fine answer too —
            get the book, use the Library, use another platform entirely. This is one way up, not the only one.</div>
          <div class="row" style="margin-top:9px;flex-wrap:wrap">
            ${missing.map(m=>`<button class="btn ghost" style="font-size:11.5px" onclick="openLesson('${esc(m.id)}')">↑ ${esc(m.title)}</button>`).join('')}
            <button class="btn ghost" style="font-size:11.5px" onclick="openIndex()">📚 Find the reading yourself</button>
          </div>
        </div>`;
      })()}
      <div style="margin-top:14px">${node.steps.map((s,i)=>{
        const on=!!p.steps[i];
        /* THE READING DOOR. A step that names a chapter or a page of the set
           text opens it. Detected from what the teacher typed rather than a
           syntax they had to learn (data/lesson-doc.js) — and absent, never
           guessed, where the step names nothing. */
        // no full text, no reading door — the Reader has no page to open
        const r=setReadable ? readingIn((s.title||'')+' '+(s.body||'')) : null;
        // a chapter this book demonstrably does not have: say so, never a door
        const beyond=!!(r && r.kind==='chapter' && setChapters!=null && r.from>setChapters);
        return `<div class="card" style="cursor:pointer" onclick="toggleLessonStep('${node.id}',${i})">
          <div class="t">${on?'☑':'☐'} ${esc(s.title)}</div>
          <div class="s" style="margin-top:5px">${esc(s.body)}</div>
          ${beyond?`<div class="s" style="margin-top:6px;color:#e0a43c">⚠ ${esc(readingLabel(r))} — this text has ${setChapters} chapter${setChapters===1?'':'s'}, so there is nothing to link to.</div>`:''}
          ${((r&&!beyond)||s.action)?`<div class="row" style="margin-top:8px;gap:6px;flex-wrap:wrap">
            ${(r&&!beyond)?`<button class="btn ghost" style="font-size:11.5px" onclick="event.stopPropagation(); openLessonReading('${jsq(setText.slug)}','${r.kind}',${r.from})"
                   title="Open ${esc(setText.title)} at ${esc(readingLabel(r))}">📖 ${esc(readingLabel(r))} →</button>`:''}
            ${s.action?`<button class="btn ghost" style="font-size:11.5px" onclick="event.stopPropagation(); ${s.action.fn}()">${esc(s.action.label)} →</button>`:''}
          </div>`:''}
        </div>`;
      }).join('')}</div>
      ${done ? `<div class="card" style="cursor:default;margin-top:12px;border-color:#7fb069"><div class="t">✓ Lesson complete</div><div class="s" style="margin-top:5px">${next.length?'You\'ve unlocked: '+next.map(n=>esc(n.title)).join(', ')+'.':'That\'s the end of this branch — for now.'}</div></div>` : ''}
      <div class="meta" style="margin-top:14px;opacity:.85">Try each step yourself first — that's how it sticks. Prefer a hand? If your local AI is connected, a resident can help — but reach for that last, not first.${node.more?` The fuller written version lives in <code>${esc(node.more)}</code>.`:''}</div>
      <div class="card" style="cursor:default;margin-top:12px;border-color:#8fb4d9">
        <div class="t">Take this lesson with you</div>
        <div class="s" style="margin-top:5px">Pull it into your Notes to keep and edit, or let your local AI draft a personal, scheduled plan from it. Both land in <b>🗒 Your Notes</b>.</div>
        <div class="s" style="margin-top:8px">Or take it <b>out</b> of the Pavilion entirely — a handout to print, or one
          self-contained page you can put on your own website. The file is yours; nothing is uploaded anywhere.</div>
        <div class="row" style="margin-top:8px;flex-wrap:wrap;gap:8px">
          <button class="btn ghost" style="font-size:11.5px" onclick="exportLesson('${esc(node.id)}','md')">⤓ Save as Markdown</button>
          <button class="btn ghost" style="font-size:11.5px" onclick="exportLesson('${esc(node.id)}','html')">⤓ Save as a web page</button>
        </div>
        <div class="meta" id="lessonExportMsg" style="margin:6px 0 0"></div>
        <div class="row" id="lessonPlanRow" style="margin-top:10px;flex-wrap:wrap;gap:8px">
          ${(function(){
            /* THE-STUDY-CHAIN-PLAN.md Stage 2 — "I want to be able to go to the
               tree and pick up a learning path." One at a time, on purpose. */
            const cur=currentStudy();
            if(cur && cur.id===node.id) return `<button class="btn ghost" onclick="putDownLesson()" title="It stays exactly where it is \u2014 a path put down is waiting, not failed">🧭 You\u2019re walking this \u00b7 put it down</button>`;
            return `<button class="btn" onclick="pickUpLesson('${node.id}')" title="Make this the path you\u2019re on \u2014 \u2600 Today will offer its next step">🧭 Pick this up</button>`;
          })()}
          <button class="btn ghost" onclick="studyLessonWithTutor('${node.id}')">🎓 Study with the Tutor</button>
          <button class="btn ghost" onclick="saveLessonToNotes('${node.id}')">📓 Save to my Notes</button>
          <button class="btn ghost" onclick="draftLessonPlanFromLesson('${node.id}')">✨ Draft a lesson plan (AI)</button>
        </div>
        <div class="meta" id="lessonNoteMsg" style="margin-top:8px"></div>
      </div>
      <div class="row" style="margin-top:12px"><button class="btn ghost" onclick="backToTree()">← Back to the tree</button></div>`;
    return;
  }
  // tree list, grouped by track in order
  const tracks=[]; allNodes().forEach(n=>{ if(!tracks.includes(n.track)) tracks.push(n.track); });
  const nodeCard=n=>{
    const planned=n.status==='planned', done=lessonDone(n), avail=lessonAvailable(n);
    const locked=!planned && !avail;
    let badge, style='', click=`onclick="openLesson('${n.id}')" style="cursor:pointer"`;
    if(planned){ badge='<span class="badge" style="background:rgba(224,164,60,.14);color:#e0a43c;border-color:#e0a43c">✎ being written</span>'; click='style="cursor:default;opacity:.7"'; }
    else if(done){ badge='<span class="badge lic">✓ complete</span>'; }
    else if(locked){ const missing=(n.prereqs||[]).filter(pid=>!lessonDone(curriculumNode(pid))).map(pid=>(curriculumNode(pid)||{}).title||pid); badge='<span class="badge">comes after '+esc(missing.join(', '))+'</span>'; }
    else { const c=lessonCompletedCount(n); badge=`<span class="badge">${c}/${n.steps.length} steps</span>`; }
    return `<div class="card" ${click}>
      <div class="t">${esc(n.title)} ${badge}</div>
      <div class="s" style="margin-top:4px">${esc(n.summary)}</div>
    </div>`;
  };
  panel.innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>🌳 The Learning Tree</h2>
    ${tabs('list')}
    <div class="meta">Start at a 101 and climb — each course unlocks the next once you've walked it. The
      board confers nothing; the walking is the whole credential. This is the first, small tree — here to
      be poked at, so tell me what's missing before we grow the coding branch for real.</div>
    ${(function(){
      /* What you are ON, before everything you COULD do. The tree used to open
         as a flat catalogue of tracks, which answers "what exists here" and
         never "where was I" \u2014 so picking something up had nowhere to show. */
      const cur=currentStudy(); if(!cur) return '';
      const nx=nextStepOf(cur.node);
      return `<div class="card" style="margin-top:12px;border-color:#7fb069;background:rgba(127,176,105,.07)" onclick="openLesson('${esc(cur.id)}')">
        <div class="s" style="color:#7fb069">🧭 The path you\u2019re walking \u00b7 picked up ${esc(cur.since||'')}</div>
        <div class="t" style="margin-top:3px">${esc(cur.node.title)}</div>
        <div class="s" style="margin-top:5px">${nx
          ? '🌱 Next: <b>'+esc(nx.step.title)+'</b> \u00b7 step '+(nx.i+1)+' of '+cur.node.steps.length
          : '\u2713 Every step ticked \u2014 open it to publish it, or pick up something new.'}</div>
      </div>`;
    })()}
    <div class="card" style="cursor:default;margin-top:10px;border-color:#8fb4d9">
      <div class="t">🔒 Your own private sandbox</div>
      <div class="s" style="margin-top:5px">Everything here runs on your own machine. Nothing you do in a
        lesson — what you read, check off, or try — ever leaves your computer or is sent anywhere. Learn
        freely; it's yours alone.</div>
    </div>
    ${tracks.map(t=>`<h3 style="margin-top:20px">${esc(t)}</h3>
      <div style="margin-top:6px">${allNodes().filter(n=>n.track===t).map(nodeCard).join('')}</div>`).join('')}
    <h3 style="margin-top:22px">Write your own</h3>
    <div class="meta">The lessons above ship with the Pavilion. Yours sit in the tree beside them, with
      real prerequisites — so you can build a 101 that unlocks a 201, for yourself or for whoever you're
      teaching. The Tutor studies your lessons exactly as it studies ours.</div>
    <div class="row" style="margin-top:8px"><button class="btn" onclick="newLessonForm()">✎ Write a lesson</button></div>
    <div class="row" style="margin-top:18px"><button class="btn ghost" onclick="openCourses()">← Back to the Course Board</button></div>`;
}

/* ================================================================
   THE COLLECTIVE TREE — LIVING-TREE-AND-DISCUSSION-PLAN §3, built
   2026-07-27 at direct request.

   The idea worth protecting, in the user's own words: a shared tree
   that "only adds when they have a repertory or notes on what they
   learned, and even better a class to help the next group get there
   themselves."

   So FINISHING something adds nothing here. Only CONTRIBUTING does.
   That single rule is what makes this different from every skill tree
   and every course platform: the graph is not a record of consumption,
   it is a record of what people gave back.

   It needs no server. The unit is a packet — a file one person hands
   another — so your Pavilion draws the part of the commons that has
   actually reached you. That is a partial view, and saying so is more
   honest than pretending completeness. Two people who have swapped
   packets see overlapping trees; neither sees "everything," because
   there is no everything to see.
   ================================================================ */
const TREE_COL=230, TREE_ROW=112;   // one card's footprint in the graph
const TREE_CARD_H=84;               // fixed, so a long title can never run into the row below
/* Depth = the longest chain of prerequisites behind a node. That's what makes
   the drawing read as a tree rather than a list: roots on the left, and
   anything that needed something else further right. */
function graphDepths(nodes, needsOf){
  const byTitle=new Map(nodes.map(n=>[String(n.title||'').toLowerCase(), n]));
  const depth=new Map(); const seen=new Set();
  const walk=(n)=>{
    const key=n.__k;
    if(depth.has(key)) return depth.get(key);
    if(seen.has(key)) return 0;           // a cycle: treat as a root rather than hang
    seen.add(key);
    let d=0;
    for(const need of needsOf(n)){
      const parent=byTitle.get(String(need||'').toLowerCase());
      if(parent && parent.__k!==key) d=Math.max(d, walk(parent)+1);
    }
    depth.set(key,d); return d;
  };
  nodes.forEach((n,i)=>{ n.__k=n.__k||('n'+i); });
  nodes.forEach(walk);
  return { depth, byTitle };
}
/* The one graph renderer, used by both trees: absolutely-positioned cards with
   an SVG layer behind them drawing every prerequisite edge. This is the whole
   "make it look like a skill tree" ask — the prerequisites already existed in
   the data; they simply were never drawn. */
function renderTreeGraph(nodes, opts){
  const { needsOf, cardHTML, onClickAttr } = opts;
  if(!nodes.length) return '<p class="meta">Nothing here yet.</p>';
  const { depth, byTitle } = graphDepths(nodes, needsOf);
  const cols=new Map();
  for(const n of nodes){ const d=depth.get(n.__k)||0; if(!cols.has(d)) cols.set(d,[]); cols.get(d).push(n); }
  const maxD=Math.max(...cols.keys());
  const maxRows=Math.max(...[...cols.values()].map(c=>c.length));
  const pos=new Map();
  for(const [d,list] of cols) list.forEach((n,i)=>pos.set(n.__k,{x:d*TREE_COL+14, y:i*TREE_ROW+10}));
  const W=(maxD+1)*TREE_COL+30, H=maxRows*TREE_ROW+TREE_CARD_H-TREE_ROW+34;
  const edges=[];
  for(const n of nodes){
    const to=pos.get(n.__k);
    for(const need of needsOf(n)){
      const parent=byTitle.get(String(need||'').toLowerCase());
      if(!parent||parent.__k===n.__k) continue;
      const from=pos.get(parent.__k); if(!from) continue;
      const x1=from.x+196, y1=from.y+TREE_CARD_H/2, x2=to.x, y2=to.y+TREE_CARD_H/2;
      const mid=(x1+x2)/2;
      edges.push(`<path d="M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}" fill="none" stroke="#8a6a3a" stroke-width="2" opacity=".65"/>`
        +`<circle cx="${x2}" cy="${y2}" r="3" fill="#e0a43c" opacity=".8"/>`);
    }
  }
  return `<div style="overflow:auto;max-height:60vh;border:1px solid var(--edge);border-radius:8px;background:rgba(0,0,0,.12)">
    <div style="position:relative;width:${W}px;height:${H}px">
      <svg width="${W}" height="${H}" style="position:absolute;inset:0;pointer-events:none">${edges.join('')}</svg>
      ${nodes.map(n=>{ const p=pos.get(n.__k);
        return `<div class="card" style="position:absolute;left:${p.x}px;top:${p.y}px;width:196px;height:${TREE_CARD_H}px;margin:0;padding:8px 10px;overflow:hidden;box-sizing:border-box"
          ${onClickAttr?onClickAttr(n):''}>${cardHTML(n)}</div>`; }).join('')}
    </div></div>`;
}
/* What has actually been contributed to you: packets that carry real substance.
   A bare completion claim can't get in, because nothing about it is worth
   passing on — that IS the entry price. */
function collectiveNodes(){
  const g=commonsStore();
  const carried=[...(g.received||[]), ...(g.published||[])];
  return carried.filter(p=>{
    if(!['lesson','course','paper','note'].includes(p.kind)) return false;
    const substance=(p.body&&p.body.trim().length>40)||((p.steps||[]).length>0);
    return substance; // notes worth reading, or a class with real steps
  }).map(p=>({ ...p, __mine:(g.published||[]).some(x=>x.id===p.id) }));
}
export function treeTab(mode){ state.treeView={mode}; renderLearningTree(); }
/* ----- Drafting a lesson with the local model (2026-07-27, and the reasoning
   behind it is worth keeping verbatim):

     "Too much manual work will defeat the purpose. I just want the environment
      to be the mindset for the task, then have the heavy lifting done by the AI
      when possible — and the direction and intention is in the user's control."

   That is the correct division and it's the one this whole project keeps
   returning to. So: YOU supply the direction — a subject, in your own words —
   and the model does the typing. Every field it fills is yours to overwrite,
   nothing is saved until you press the button, and it never invents a
   prerequisite (that's structure, and structure is direction). */
/* ----- ONE QUESTION AT A TIME (rewritten 2026-07-28, from:

     "What human needs are simple steps. If it's too much for the model we
      should break up the steps to make it more manageable for the AI and
      the user."

   Both halves of that are true and they have the same cure. The first version
   asked for TITLE, SUMMARY, TRACK, LEVEL and 4-6 STEPS in a single reply, and
   ornith:9b returned one run-on line for the lot of it — the parser rescued
   something, but a rescue is not the same as an answer. So the draft is a chain
   of small asks now: a title, then a summary, then a track, then each step in
   turn, every one of them a single question with a one-line answer.

   The model finds each ask easy. The person watching gets the form filling in
   in front of them, a plain "step 3 of 5" instead of a spinner, a Stop button
   that keeps whatever arrived, and no all-or-nothing failure — a stage that
   comes back badly costs that one field, not the draft. Slower in wall-clock,
   far more likely to actually finish. Prerequisites are still never asked for:
   structure is direction, and direction stays the visitor's. */
const DRAFT_SYS = 'You are helping draft one practical lesson someone will actually walk. '
  +'You are asked ONE small question at a time. Answer that question only, in one line, '
  +'with no label, no preamble, no markdown and no explanation of what you are doing. '
  +'Steps must be things a person DOES, not things they read about. Be concrete and unpretentious.';
export function stopDrafting(){
  if(state.mlDraft) state.mlDraft.stop=true;
  const el=document.getElementById('mlAiOut');
  if(el) el.textContent='Stopping — whatever it wrote is still in the form, and still yours to edit.';
}
export async function draftLessonWithAI(){
  // look the element up every time: a stage can land after a re-render, and a
  // captured reference becomes a detached node nobody ever sees (the bug that
  // made the librarian's suggestions look inert, 2026-07-27).
  const say=t=>{ const el=document.getElementById('mlAiOut'); if(el) el.textContent=t; };
  const seedEl=document.getElementById('mlSeed');
  let seed=(seedEl&&seedEl.value||'').trim() || (document.getElementById('mlTitle')?.value||'').trim();
  const bookSlug=(document.getElementById('mlBook')?.value||'').trim();
  if(!seed && !bookSlug) return say('Tell it what the lesson is about first — a few words is enough ("how to meditate", "reading the Dao De Jing") — or pick a set text below and it will work from the book.');
  if(!isAIActive()) return say('No local AI connected (⚙ Manage AI connections). You can still write it by hand.');
  if(state.mlDraft && state.mlDraft.running) return; // never two chains at once
  const job = state.mlDraft = { running:true, stop:false };
  const stopBtn=document.getElementById('mlStopBtn'); if(stopBtn) stopBtn.style.display='';
  const set=(id,val)=>{ const e=document.getElementById(id); if(e&&val) e.value=val; return !!val; };
  const shelf=Store.allDocs().slice(0,20).map(d=>d.title).join(' | ');
  /* GROUNDED IN THE SET TEXT, if one was chosen. The steward's line:
     "needing one and being able to have their assistance are two different
     things" — a teacher must never NEED an AI, and when he wants one it
     should know the book he is actually teaching. Without this the drafter
     produced a competent generic lesson about a title it had never read.

     The chapter list is handed over as a CLOSED SET and named as one. That
     is the whole reason this is worth doing: a step citing a chapter becomes
     a door (data/lesson-doc.js), and a door to a chapter that does not exist
     is exactly the confident-wrong-answer this project refuses. Where the
     text cannot be read, the model is told to cite nothing at all rather
     than guess. */
  let bookBlock='';
  if(bookSlug){
    const bd=Store.getDoc(bookSlug);
    if(bd){
      // picking a book is enough to start — the book IS the subject
      if(!seed) seed='teaching "'+bd.title+'"'+(bd.attribution?' by '+bd.attribution:'');
      say('reading the set text first…');
      let marks=[];
      try{
        const text=await loadBookText(bookSlug);
        if(text) marks=findChapters(paginate(text)).marks;
      }catch(e){ marks=[]; }
      const chapters=marks.slice(0,40).map((m,i)=>`${i+1}. ${String(m.label||'').slice(0,70)}`);
      bookBlock='\n\nTHE SET TEXT this lesson is built on: "'+bd.title+'"'
        +(bd.attribution?' by '+bd.attribution:'')+'.'
        +((bd.doc&&bd.doc.summary)?'\nWhat it is: '+bd.doc.summary:'')
        +(chapters.length
          ? '\n\nITS CHAPTERS. These are the only ones that exist — refer to them by number, and NEVER '
            +'invent one that is not on this list:\n'+chapters.join('\n')
            +(marks.length>40?`\n…and ${marks.length-40} more.`:'')
            +'\n\nWhere a step asks the learner to read part of the book, say so plainly in the step itself '
            +'— "Read chapters 3-4", "Read chapter 7" — using only the numbers above. Those become real '
            +'links to the page.'
          : '\nIts chapters could not be read, so do NOT cite any chapter or page number anywhere.');
    }
  }
  const ask=async(prompt,opts)=>{
    if(job.stop) return '';
    const reply=await AI.chat([{role:'system',content:WORK_CHARTER+'\n\n'+DRAFT_SYS+bookBlock},{role:'user',content:prompt}]);
    return isEmptyReply(reply) ? '' : cleanAnswer(reply,opts);
  };
  const N=5, total=3+N;
  let filled=0;
  try{
    say(`1 of ${total} — giving it a title…`);
    const title=await ask(`Someone wants to learn: ${seed}\n\nGive that lesson a short, concrete title.\n`
      +`Reply with the title alone — no quotes, no label, nothing else.`, {label:'title', maxWords:12});
    if(set('mlTitle', title)) filled++;

    if(!job.stop) say(`2 of ${total} — what it's for…`);
    const summary=await ask(`A lesson titled "${title||seed}" teaches someone about: ${seed}\n\n`
      +`In one or two sentences, say what they will be able to DO once they've walked it.\n`
      +`Reply with those sentences alone.`, {label:'summary', multiline:true});
    if(set('mlSummary', summary)) filled++;

    if(!job.stop) say(`3 of ${total} — where it belongs…`);
    const track=await ask(`Under which single short heading would you file a lesson called "${title||seed}"?\n`
      +`Two or three words, like "Meditation" or "Electronics".\nReply with the heading alone.`,
      {label:'track', maxWords:4});
    set('mlTrack', track);

    /* The steps, one at a time, each one shown the ones already written so it
       builds a sequence instead of five restatements of the same idea. If a
       model volunteers several at once we take them all and skip ahead —
       obeying more than it was asked is not a failure. */
    const steps=[];
    let asked=0;
    // a few spare asks, because a repeated step is thrown away and asked again
    while(steps.length<N && asked<N+3 && !job.stop){
      asked++;
      say(`${3+steps.length+1} of ${total} — ${steps.length?`step ${steps.length+1}, building on the last`:'the first thing they actually do'}…`);
      const sofar=steps.length?`Steps already written — do NOT repeat any of these:\n${steps.map((s,k)=>`${k+1}. ${s}`).join('\n')}\n\n`:'';
      const reply=await ask(`The lesson: "${title||seed}" — ${summary||seed}\n\n${sofar}`
        +`Write step ${steps.length+1}: one single new thing the person does next.\n`
        +`Address them directly and start with a verb — "Sit down…", not "Sits down…".\n`
        +`Reply with exactly one line, in this form and nothing else:\n`
        +`what they do | one sentence of why or how\n\n`
        +`(Books on their shelves, if one is genuinely relevant — never invent another: ${shelf})`);
      if(!reply) continue;
      parseDraftedSteps(reply).map(s=>cleanAnswer(s,{label:'step'})).filter(Boolean)
        .forEach(s=>{ if(steps.length<N && !tooSimilarStep(s, steps)) steps.push(s); });
      set('mlSteps', steps.join('\n'));
    }
    if(steps.length) filled++;

    if(job.stop) return say(`Stopped after ${filled} field${filled===1?'':'s'} — what arrived is in the form and yours to finish. Nothing has been saved.`);
    // Never claim success without having actually filled something in. A model
    // that answers in the wrong shape (or a provider that answers with a
    // fallback string) used to produce a cheerful "Drafted" over an untouched
    // empty form — caught in testing 2026-07-27.
    if(!filled) return say("It answered, but not in a shape I could read — nothing has been filled in. Try again, or write it yourself; the form works the same either way.");
    say(`Drafted ${steps.length} step${steps.length===1?'':'s'} — every field is yours to change. Prerequisites are left to you: what a lesson needs is direction, and that stays your call. Nothing is saved until you add it to the tree.`);
    blip(660,.07);
  }catch(e){
    say(filled?`The connection flickered after ${filled} field${filled===1?'':'s'} — what arrived is still in the form. Finish it by hand, or try again.`
      :'The connection flickered — nothing drafted. Writing it by hand always works.');
  }finally{
    job.running=false;
    const b=document.getElementById('mlStopBtn'); if(b) b.style.display='none';
  }
}
/* Open the set text at what a step actually asks for. A chapter is resolved
   through the SAME chapter marks the reader and the notes use, so a lesson
   citing "ch. 3" lands where a note citing ch. 3 lands. Where the book has no
   detected chapters this falls back to the page of that number — and says so
   rather than silently landing somewhere arbitrary. */
export async function openLessonReading(slug, kind, from){
  const d=Store.getDoc(slug); if(!d) return;
  closeUI();
  openReader(slug);
  if(!(d.doc&&d.doc.fullText)) return;      // a summary-only book has no page to open
  await openFullText(slug);
  const v=state.fullTextView; if(!v) return;
  let page=null;
  if(kind==='chapter'){
    /* "Chapter N" is the Nth MARK, not a stored field — chapterAt() assigns
       `number` as index+1 and nothing writes it onto the mark itself. Looking
       for m.number could never match, and the door quietly landed on page 1
       (caught by test/live/teacher.mjs, which checked where it LANDED rather
       than that it opened). Indexing keeps a lesson citing ch. 2 in exactly
       the place a note citing ch. 2 lands. */
    const marks=chapterPages(v);
    const mark=marks[Number(from)-1];
    if(mark) page=mark.page;
  }
  if(page==null && kind==='page') page=Math.max(0, Number(from)-1);
  if(page==null) return;                    // no such chapter — leave them at the top, honestly
  v.page=Math.max(0, Math.min(v.pages.length-1, page));
  renderFullTextPage();
}
/* ---- A LESSON AS A DOCUMENT — THE-TEACHERS-TREE-PLAN.md gap 2.
   `🤝 Publish it` makes a PACKET: a .json another Pavilion can open, which is
   the right thing for the commons and useless in a classroom. A teacher needs
   a handout to print or a page to put on his own site — so a lesson also
   leaves as Markdown, and as ONE self-contained HTML file he owns outright.
   We render the file; the website stays his. */
function lessonDocOpts(node){
  const book=(node.book&&node.book.slug) ? Store.getDoc(node.book.slug) : null;
  return {
    book: book ? { title:book.title, attribution:book.attribution||'' } : null,
    prereqTitles: (node.prereqs||[]).map(pid=>{ const q=curriculumNode(pid); return q?q.title:null; }).filter(Boolean),
    by: ((data.commons&&data.commons.signedAs)||'').trim(),
  };
}
export async function exportLesson(id, kind){
  const node=curriculumNode(id); if(!node) return;
  const msg=document.getElementById('lessonExportMsg');
  const opts=lessonDocOpts(node);
  const text = kind==='html' ? lessonToHTML(node, opts) : lessonToMarkdown(node, opts);
  const name = lessonFileName(node, kind==='html' ? 'html' : 'md');
  const say=t=>{ if(msg) msg.textContent=t; };
  if(typeof window!=='undefined' && window.desktopBridge?.saveFile){
    const res=await window.desktopBridge.saveFile(name, text);
    if(res && res.canceled) return;
    say((res&&res.ok) ? 'Saved. It is yours — print it, email it, or put it on your own site.' : 'Could not save that file.');
    if(res&&res.ok) blip(700,.07);
    return;
  }
  const blob=new Blob([text],{type: kind==='html'?'text/html':'text/markdown'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),800);
  say('Saved to your Downloads folder as '+name+'.');
}
export function newLessonForm(id, bookSlug){ state.treeView={mode:'write', id:id||null, book:bookSlug||null}; renderLearningTree(); }
/* TEACH FROM THE BOOK YOU ARE HOLDING — the door that was missing, reported
   2026-08-03: "i have the long discourses in my back pack, where do i make a
   lesson on the buddhas teachings for new people?"

   Every piece existed and none of it was reachable from the book. Making a
   lesson meant leaving the Reader, opening the pause menu, finding 🌳 Lesson
   plans, pressing ✎ Write a lesson, and then finding the book again in a list
   of three hundred. That is four hops away from the thing you are already
   looking at, which is exactly the "nothing may be a dead end / one keystroke
   to anywhere" bar in CLAUDE.md, failed. */
export function writeLessonOnThisBook(){
  const slug=currentDocSlug()||(state.readerPocket&&state.readerPocket.slug);
  if(!slug) return;
  stopSpeaking();
  state.ui='tree'; hideAllOv();
  newLessonForm(null, slug);
  showOv('treeOv');
}
export function saveMyLesson(existingId){
  const g=i=>document.getElementById(i)?.value ?? '';
  const title=g('mlTitle').trim();
  const msg=document.getElementById('mlMsg');
  if(!title){ if(msg) msg.textContent='Give it a title first.'; return; }
  const steps=g('mlSteps').split(/\r?\n/).map(l=>l.trim()).filter(Boolean)
    .map(l=>{ const [t,...rest]=l.split('|'); return { title:(t||'').trim(), body:rest.join('|').trim() }; });
  if(!steps.length){ if(msg) msg.textContent='A lesson needs at least one step — one per line.'; return; }
  const prereqs=[...document.querySelectorAll('.mlPre:checked')].map(c=>c.value);
  const list=myLessons();
  const node={ id: existingId || ('mine-'+Date.now().toString(36)),
    track: g('mlTrack').trim() || 'Your own lessons',
    level: Number(g('mlLevel'))||101,
    title, summary:g('mlSummary').trim(), prereqs, steps, mine:true, written:todayKey() };
  /* THE SET TEXT — THE-TEACHERS-TREE-PLAN.md gap 1. Until this, the lesson
     node was the ONE artifact in the Pavilion that could not cite a book,
     while a note has carried chapter and page since this morning. An absent
     field when there is no book, never an empty object. */
  const bookSlug=g('mlBook').trim();
  if(bookSlug) node.book={slug:bookSlug};
  const i=list.findIndex(x=>x.id===existingId);
  if(i>=0) list[i]=node; else list.unshift(node);
  persist(); logActivity((i>=0?'Rewrote':'Wrote')+' a lesson: "'+title+'".'); blip(660,.08); setTimeout(()=>blip(825,.09),90);
  state.treeView={mode:'lesson', id:node.id}; renderLearningTree();
}
export function deleteMyLesson(id){
  const node=curriculumNode(id); if(!node||!node.mine) return;
  if(!window.confirm('Delete your lesson "'+(node.title||'')+'"? Any lesson that required it becomes available again.')) return;
  data.myLessons=myLessons().filter(x=>x.id!==id);
  myLessons().forEach(x=>{ x.prereqs=(x.prereqs||[]).filter(p=>p!==id); });
  if(data.curriculum) delete data.curriculum[id];
  persist(); state.treeView={mode:'list'}; renderLearningTree();
}

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
  const credit=`\n\n— from the Commons: “${p.title}” by ${p.by||'unknown'} (${p.license||'license unrecorded'})`;
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
export function publishFrom(kind, id){
  const g=commonsStore();
  let p=null;
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
    p={ id:newPacketId(), kind:(/lesson/i.test(n.title||'')?'lesson':'note'), title:n.title||'A note', body:noteBody(n), summary:noteBody(n).slice(0,160) };
  }
  p.sandPavilionPacket=1;
  p.by=(g.signedAs||'').trim()||'unsigned';
  p.license='Original — shared by its author';
  p.created=todayKey();
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

  if(v.mode==='one'){
    const p=allCommonsPackets().find(x=>x.id===v.id)||g.published.find(x=>x.id===v.id);
    if(!p){ state.commonsView={mode:'shelf'}; return renderCommons(); }
    const mine=g.published.some(x=>x.id===p.id);
    const k=packetKind(p.kind);
    const taken=g.taken[p.id];
    el.innerHTML=`${back}
      <div class="row" style="margin-bottom:8px"><button class="btn ghost" onclick="commonsTab('${mine?'mine':'shelf'}')">← Back to the table</button></div>
      <h2>${k.icon} ${esc(p.title)}</h2>
      <div class="meta">${mine?visBadge('shared'):visBadge('commons')} ${k.label} · by <b>${esc(p.by||'unknown')}</b>${p.license?' · '+esc(p.license):''}${p.created?' · '+esc(p.created):''}${p.receivedOn?' · received '+esc(p.receivedOn):''}</div>
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
  /* THE PAGE HAS TO ACTUALLY BECOME THE BOOK. A summary-only seed entry says,
     in as many words, "drag the file onto this window … and this page becomes
     the real book." Measured 2026-08-03: it did not. The file shelved as a
     separate personal copy, the seed entry stayed summary-only, and the visitor
     was left staring at a page still telling them it was not the book — now
     owning two Tao Te Chings, one of them unreachable from where they stood.

     A promise printed on the page is a promise. If a drop lands while that
     page is open and it is plainly the same book, go to it. */
  if(openOn) reopenIfReplaced(openOn);
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
function reopenIfReplaced(slug){
  const twin=fullTextTwinOf(slug);
  if(!twin) return;
  openReader(twin.slug);
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
  if(!storedAsFile && bridge && bridge.libraryWrite){
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
  if(from==='manage') renderManageLibrary(); else openShelf('Personal');
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
  const name=(agent&&agent.name)||key;
  const sugg=[...(STANDING_SUGGESTIONS[key]||[]), ...STANDING_SUGGESTIONS._any];
  const others=Object.keys(CHAT_AGENTS).filter(k=>CHAT_AGENTS[k]&&CHAT_AGENTS[k].name);
  el.innerHTML=`
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>✎ Standing instructions ${visBadge('private')}</h2>
    <div class="meta">Something you want <b>${esc(name)}</b> to remember in every conversation, without
      typing it each time. It's added to what they're told before your message — it doesn't replace who
      they are, and if your instruction genuinely clashes with their character they'll say so rather
      than quietly ignore either.</div>
    <div class="row" style="margin:10px 0;gap:6px;flex-wrap:wrap">
      ${others.map(k=>`<button class="btn ${k===key?'':'ghost'}" style="font-size:11px;padding:3px 10px" onclick="openStanding('${k}')">${esc(CHAT_AGENTS[k].name.split('·')[0].trim())}${standingFor(k)?' •':''}</button>`).join('')}
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
    <div class="row" style="margin-top:14px"><button class="btn ghost" onclick="openStanding('${key}')">✎ Standing instructions</button></div>`;
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
export function openBookIntake(){
  state.ui='intake'; hideAllOv();
  const desktop=!!(window.desktopBridge && window.desktopBridge.isDesktop);
  const mine=personalBooks().length;
  document.getElementById('intakePanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>📥 Bring a Book In ${visBadge('private')}</h2>
    <div class="meta">Everything you add lands on <b>your own shelf</b> — no licence asked, no source
      required, nothing sent anywhere. You have <b>${mine}</b> book${mine===1?'':'s'} of your own so far.</div>

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
      <button class="btn ghost" onclick="openReader('filling-your-shelves')">📖 Read the full guide</button>
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
export function toggleInventory(slug){
  const i=data.inventory.indexOf(slug);
  if(i>=0) data.inventory.splice(i,1);
  else { data.inventory.push(slug); awardBadge('first-carry'); logActivity('Packed a book to carry with you.'); }
  persist();
  const btn=document.getElementById('rdCarryBtn'); if(btn) btn.textContent = data.inventory.includes(slug) ? '🎒 Carrying' : '🎒 Take with you';
}
export function openInventory(){ state.ui='inventory'; hideAllOv(); renderInventory(); showOv('inventoryOv'); }
function renderInventory(){
  const docs=data.inventory.map(slug=>Store.getDoc(slug)).filter(Boolean);
  const log=data.fishLog||[];
  document.getElementById('inventoryPanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>Your Inventory</h2>
    <div class="meta">Books you're carrying — read any of these from anywhere, no walk back to the
      shelf required. Nothing is missing from the Library; this is just your own copy in hand.</div>
    ${docs.length ? `
      <div id="invList">${docs.map(d=>`
        <div class="card" onclick="openReader('${d.slug}')">
          <div class="t">${esc(d.title)}</div>
          <div class="s">${esc(d.tradition)}</div>
          <div class="row" style="margin-top:8px"><button class="btn ghost" onclick="event.stopPropagation();toggleInventory('${d.slug}');openInventory()">Put it back</button></div>
        </div>`).join('')}</div>
      <div class="row" style="margin-top:14px"><button class="btn ghost" onclick="suggestInventoryCategories()">🪄 Ask the Computer to organize this</button></div>
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
  const docs=data.inventory.map(slug=>Store.getDoc(slug)).filter(Boolean);
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
  studyTidyNote, studyToggleHistory, studyRestoreVersion,
  togglePlannerTool, createNote, openNote, backToNotesList, deleteNote, updateNoteField,
  newCourseForm, createCourse, openCourse, toggleStep, removeCourse, backToList,
  newCourseAIForm, draftCourseWithAI, setCourseDue, setCourseCat, draftTrainingPlanFromChat,
  setCourseSearch, clearCourseSearch, setCourseCategory, toggleArchivedView, archiveCourse,
  addConnection, toggleConnection, removeConnection, recheckConnections, setConnectionModel, fillConnectionPreset,
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
  closeDialog, sendCurrentChatMessage, toggleChatSpeak, skipChatTyping, minimizeChat, restoreChat,
  openBadges, openRecordsHall, openIndex, setIndexCategory, setIndexSearch, clearIndexSearch, openIndexItem,
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
  openCommonsTable, commonsTab, openPacket, takePacket, publishFrom, unpublishPacket,
  writePacketFile, triggerImportPacket, setCommonsName,
});
