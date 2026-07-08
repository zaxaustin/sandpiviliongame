import { Store } from '../data/store.js';
import { state, data, persist, todayKey, DEFAULT_BLOCKS, logActivity, awardBadge, upcomingItems } from '../entities.js';
import { BADGES } from '../data/badges.js';
import { blip, setHud } from '../main.js';
import { AI, isAIActive, providerFor, detectAI, isEmptyReply } from '../ai/provider.js';
import { CHARTER } from '../data/charter.js';
import { CATEGORIES } from '../data/seed.js';
import { listApprovedQuestions, submitQuestion, listPendingQuestions, moderateQuestion } from '../data/exchange.js';
import { listApprovedNotes, submitNote, listPendingNotes, moderateNote } from '../data/agentNotes.js';
import { isLoggedIn, isSteward, userEmail, sendMagicLink, signOut, onAuthChange } from '../data/auth.js';
import { speak, stopSpeaking, isSpeaking, ttsAvailable } from '../tts.js';

function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
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
  if(wasChat) document.getElementById('chatOv').classList.remove('open');
  else document.getElementById('dialog').style.display='none';
}
/* ----- read the current dialog line aloud — one small step toward the
   hopes-and-dreams "a voice you can actually hear" for every resident,
   not just Quill's spoken library summaries below. */
export function toggleDialogSpeak(){
  const d=state.dialog; if(!d||d.chat) return;
  if(isSpeaking()){ stopSpeaking(); updateDialogSpeakBtn(); return; }
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
const AGENT_AVATAR = { quill:'📜', steward:'🫖', monk:'🧘', computer:'💻' };
export function openChatDialog(npc){
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
  if(!chatTyping) return;
  stopChatTyping();
  renderChatView();
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
                    : `<div class="bubble npc"><div class="who">${esc(d.name)}</div><span class="bubbleText" data-idx="${idx}">${esc(m.text)}</span></div>`);
  if(d.thinking) bubbles.push(`<div class="bubble npc thinking"><div class="who">${esc(d.name)}</div>…</div>`);
  log.innerHTML=bubbles.join('');
  log.scrollTop=log.scrollHeight;
  if(opts&&opts.typeLast){
    const lastIdx=d.transcript.length-1;
    const target=log.querySelector(`.bubbleText[data-idx="${lastIdx}"]`);
    if(target) typewriteChatText(target,d.transcript[lastIdx].text,log);
  } else stopChatTyping();
  const notesArea=document.getElementById('chatNotesArea');
  if(document.activeElement!==notesArea) notesArea.value=data.chatNotes[d.agent]||'';
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
  if(d.agent==='monk') html+=`<button class="btn ghost" id="chatTrainBtn" onclick="draftTrainingPlanFromChat()">📋 Draft a training plan from this conversation</button>`;
  if(d.agent==='computer' && hasReply) html+=`<button class="btn ghost" onclick="saveLastChatReplyToArchive()">💾 Save last reply to Archive Desk</button>`;
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
  if(isSpeaking()){ stopSpeaking(); updateChatSpeakBtn(); return; }
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
function agentMemory(agent){ return data.agentMemory[agent]||(data.agentMemory[agent]=[]); }
function remember(agent,text){
  const mem=agentMemory(agent);
  mem.push({ts:todayKey(),text});
  while(mem.length>MEMORY_CAP) mem.shift();
  persist();
}
/* ----- AI-backed NPCs — a small registry so more than one resident can
   talk, each grounded in something different, without duplicating the
   chat plumbing below. Quill was the only one until the café existed;
   the Steward is the second, grounded in the charter and the *live*
   notice board instead of the shelves. Adding a third resident later
   is just another entry here, not a new code path. */
function pastAsksBlock(agent){
  const mem=agentMemory(agent);
  if(!mem.length) return '';
  return '\n\nThings this visitor has asked you about on past visits (for continuity — mention it naturally if relevant, don\'t force it):\n'
    +mem.slice(-8).map(m=>`- (${m.ts}) ${m.text}`).join('\n');
}
const CHAT_AGENTS = {
  quill:{
    label:'Quill',
    async systemPrompt(){
      const shelf=Store.allDocs().map(d=>`- "${d.title}" (${d.tradition}, ${d.license}): ${d.doc.summary}`).join('\n');
      return CHARTER
        +"\n\nYou are Quill, the Librarian of the Sand Pavilion — a small, quiet commons library. "
        +"Only speak about texts that are actually shelved here (listed below). Never invent a title, "
        +"author, or claim that isn't in that list. If someone asks about something not shelved, say so "
        +"plainly and, if it fits, point to the closest real text instead — or, for anything outside the "
        +"Library's own traditions, that the Mountain Monk may be a better person to ask — he keeps his "
        +"own quarters in the Pavilion Keep now, north of the Grounds, not here. When you draw "
        +"from a specific text, name it."
        +'\n\nWhat is actually on the shelves right now:\n'+shelf+pastAsksBlock('quill');
    },
    errorLine:"Quill's connection flickers — the local AI didn't answer. (Check that Ollama is still running.)",
  },
  steward:{
    label:'the Steward',
    async systemPrompt(){
      const { posts }=await listApprovedQuestions(5);
      const board=(posts&&posts.length)
        ? posts.map(p=>`- "${p.title}" by ${p.author||'a visitor'}: ${p.body}`).join('\n')
        : '(nothing posted yet — the board is empty right now)';
      return CHARTER
        +"\n\nYou are the Steward of the café — a meeting place that looks outward instead of down at a "
        +"shelf. You moderate the Notice Board: nothing goes onto it unmoderated, but the bar is liberal "
        +"and inclusive — anyone has a place here as long as their conduct holds to the charter above. "
        +"You yourself act on that charter day to day, but you aren't the one who wrote it or interprets "
        +"it when a real question of meaning comes up — that's the Mountain Monk's place, not yours, and "
        +"you'd say so plainly if a visitor pushed on something that deep. You didn't write any of the "
        +"posts below yourself; speak about them the way a steward who's actually read the board "
        +"would, not as their author. You don't add books to the Library yourself — nobody does directly, "
        +"including you — but you know exactly how it actually happens and say so plainly rather than "
        +"just deflecting: the Request Board (in the Study, past the Library's east door) is where anyone "
        +"leaves a title they'd like to see shelved; from there it's reviewed by hand before anything is "
        +"added. Point people there for real when they ask, the same way you'd point someone lost toward "
        +"the Library itself.\n\nWhat's currently on the Notice Board:\n"+board
        +pastAsksBlock('steward');
    },
    errorLine:"The Steward's connection flickers — the local AI didn't answer. (Check that Ollama is still running.)",
  },
  monk:{
    label:'the Mountain Monk',
    async systemPrompt(){
      return CHARTER
        +"\n\nYou are the Mountain Monk, Grand Master of the Sand Pavilion — its elder and final voice "
        +"on matters of conduct and practice, upholding the Four Noble Truths and the Noble Eightfold "
        +"Path for everyone who lives here or visits. You keep your own quarters in the Pavilion Keep, "
        +"apart from the Library's foot traffic, so a real conversation doesn't have to compete with "
        +"the shelves — visitors seek you out for that specifically, not in passing. Daily-life "
        +"logistics and the café's own comings and goings are the Steward's place, not yours; you're "
        +"here for matters of conduct, meaning, and practice, and you'd say so plainly if someone "
        +"brought you the wrong kind of question. You carry that authority lightly — you'd "
        +"rather answer a heavy question with an unexpected story or a small joke than a lecture, "
        +"though you go fully serious the moment a real question of conduct or meaning actually "
        +"deserves it. You teach Buddhism, Hinduism (especially Advaita Vedanta and the teachings of "
        +"Shankara), and Sanskrit, always toward one practical end: how to actually live in harmony "
        +"with the world, not just discuss it. Unlike Quill, you aren't limited to what's on the "
        +"Library's shelves — your own teaching draws from a wider well than this Library currently "
        +"holds (there's no Vedantic shelf here yet), so speak from what you actually know, and say so "
        +"plainly if something's genuinely outside it. Sanskrit terms are welcome, gently explained, "
        +"never showed off. You do not throw your title around; you simply are the one whose word "
        +"actually settles a real dispute here, and everyone else already knows it.\n\n"
        +"You are a teacher, not a search box — act like one. Don't just answer what's literally asked "
        +"and stop there: ask a probing question back when it would actually sharpen the visitor's own "
        +"thinking, name what you suspect they're really wrestling with underneath the surface question, "
        +"and if something in how they describe their own practice sounds off — skipped fundamentals, "
        +"a common wrong turn, a rationalization you recognize — say so directly and kindly, unprompted, "
        +"the way a real teacher corrects a student's form before they ask. You may also offer to build "
        +"them a concrete training plan when their situation calls for one, not just talk about it in "
        +"the abstract."
        +pastAsksBlock('monk');
    },
    errorLine:"The Monk's connection flickers — the local AI didn't answer. (Check that Ollama is still running.)",
  },
  computer:{
    label:'the Computer',
    async systemPrompt(){
      return CHARTER
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
        +pastAsksBlock('computer');
    },
    errorLine:"…connection lost. (Check that your AI connection is still running.)",
  },
};
async function sendChatMessage(q){
  const d=state.dialog; if(!d||!d.chat) return;
  const agent=CHAT_AGENTS[d.agent]||CHAT_AGENTS.quill;
  d.transcript.push({from:'user',text:q});
  d.history.push({role:'user',content:q});
  d.thinking=true; renderChatView();
  try{
    const systemPrompt=await agent.systemPrompt();
    const messages=[{role:'system',content:systemPrompt}, ...d.history];
    let reply=await AI.chat(messages);
    // a "thinking" model can burn its whole short-reply budget on invisible
    // reasoning and come back empty — worth one retry with real room before
    // giving up, rather than showing a visitor a dead end mid-conversation
    if(isEmptyReply(reply)) reply=await AI.chat(messages,{long:true});
    d.history.push({role:'assistant',content:reply});
    d.transcript.push({from:'npc',text:reply});
    remember(d.agent,q);
    logActivity('Asked '+agent.label+': "'+(q.length>60?q.slice(0,60)+'…':q)+'"');
  }catch(err){
    d.transcript.push({from:'npc',text:agent.errorLine});
  }
  d.thinking=false; renderChatView({typeLast:true});
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

/* ----- Local Library storage status — same passive-status-line pattern
   as refreshAIStatus() below, for MinIO instead of Ollama. Waits on
   Store.libraryReady first (an existing hook, unused until now) since
   the Supabase mirror — the only place a fullText.storage pointer can
   come from — hasn't necessarily resolved yet at page load. Only shown
   when it's actually relevant: if nothing in the mirrored Library uses
   MinIO storage at all (the zero-setup seed.js fallback, or Supabase
   simply not configured), there's nothing to warn about, so the line
   stays hidden rather than alarming a visitor about a thing that
   doesn't apply to them. */
export async function refreshLibraryStorageStatus(){
  const el=document.getElementById('libMode');
  if(!el) return;
  await Store.libraryReady;
  const usesStorage=Store.allDocs().some(d=>d.doc.fullText && d.doc.fullText.storage);
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
function modelPickerHTML(i,c,models){
  const opts=['<option value="">(auto-pick)</option>']
    .concat(models.map(m=>`<option value="${esc(m)}" ${c.model===m?'selected':''}>${esc(m)}</option>`));
  return `<div class="s">Model:
    <select onchange="setConnectionModel(${i},this.value)" style="background:#1b140d;border:1px solid #55432e;border-radius:5px;color:#f5e9d4;font-family:inherit;font-size:12px;padding:3px 6px">
      ${opts.join('')}
    </select></div>`;
}
const CONNECTION_PRESETS = {
  claude: { name:'Claude (Anthropic)', kind:'anthropic', baseUrl:'https://api.anthropic.com/v1' },
  openai: { name:'ChatGPT (OpenAI)', kind:'openai-compatible', baseUrl:'https://api.openai.com/v1' },
  grok:   { name:'Grok (xAI)', kind:'openai-compatible', baseUrl:'https://api.x.ai/v1' },
};
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
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>AI Connections</h2>
    <div class="meta">Stored on this device only. The first enabled connection below that answers
      is the one used by every resident and desk. A 🏠 local connection (Ollama, LM Studio, any
      server on your own machine) never sends anything anywhere else; a ☁ cloud connection sends
      your conversation — and whatever it's grounded in — to that provider's servers, same as
      using their own app would. Both are real options here; just know which one you're using.</div>
    <div id="connList">${conns.map((c,i)=>connCardHTML(c,i)).join('')}</div>
    <h3>Add a connection</h3>
    <div class="meta">"Base URL" is the address of the AI server — for Ollama that's usually
      <b>http://localhost:11434</b>. An API key is only needed for connections that require one —
      cloud providers always do, kept on this device only, sent straight to that provider and
      nowhere else.</div>
    <div class="row" style="margin-bottom:10px">
      <button class="btn ghost" style="font-size:11.5px" onclick="fillConnectionPreset('claude')">☁ Claude</button>
      <button class="btn ghost" style="font-size:11.5px" onclick="fillConnectionPreset('openai')">☁ ChatGPT</button>
      <button class="btn ghost" style="font-size:11.5px" onclick="fillConnectionPreset('grok')">☁ Grok</button>
    </div>
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
      if(ok && provider.availableModels?.length){
        const modelRow=document.getElementById('connModel'+i);
        if(modelRow) modelRow.outerHTML=modelPickerHTML(i,c,provider.availableModels);
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
function hideAllOv(){ ['shelfOv','readerOv','planOv','courseOv','connOv','archiveOv','menuOv','pastDayOv','waypointsOv','activityOv','badgesOv','indexOv','requestsOv','inventoryOv','reviewOv','noticeOv','accountOv','residentsOv','researchOv','grantOv','upcomingOv','ideaOv'].forEach(i=>document.getElementById(i).classList.remove('open')); }
export function closeUI(){ state.ui=null; hideAllOv(); stopTyping(); stopSpeaking(); persist(); }

/* ----- Account (Phase 3, optional) — magic-link sign-in. Local play
   works identically with no account at all; logging in adds cross-
   device save sync and, for whoever's been granted it by hand in the
   Supabase dashboard, real steward powers (see the café's Notice Board
   moderation view below). Re-renders itself on auth changes so a magic
   link finishing in another tab, or a manual sign-out, updates live. */
export function openAccount(){
  state.ui='account'; hideAllOv(); renderAccount(); showOv('accountOv');
}
onAuthChange(()=>{ if(state.ui==='account') renderAccount(); });
function renderAccount(){
  const panel=document.getElementById('accountPanel');
  if(isLoggedIn()){
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>Account</h2>
      <div class="meta">Signed in as <b>${esc(userEmail()||'')}</b>${isSteward()?' · <span class="badge">steward</span>':''}.
        Your save now backs up to this account (and syncs if you sign in on another device) —
        this device's save stays the working copy either way, nothing here replaces that.</div>
      <div class="row" style="margin-top:14px"><button class="btn ghost" onclick="signOutOfAccount()">Sign out</button></div>`;
    return;
  }
  panel.innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>Account</h2>
    <div class="meta">Optional — the Pavilion works fully without one. Signing in adds save
      sync across devices. No password: enter your email, we send a one-time link — it'll open
      the Pavilion in a new tab, already signed in.</div>
    <label>Email</label><input type="text" id="acctEmail" placeholder="you@example.com">
    <div id="acctMsg" class="meta"></div>
    <div class="row" style="margin-top:14px"><button class="btn" onclick="sendAccountLink()">Send magic link</button></div>`;
}
export async function sendAccountLink(){
  const email=document.getElementById('acctEmail').value.trim();
  const msg=document.getElementById('acctMsg');
  if(!email){ msg.textContent='An email address is required.'; return; }
  msg.textContent='Sending…';
  const { ok, error } = await sendMagicLink(email);
  msg.textContent = ok
    ? "Link sent — check your email. Clicking it opens the Pavilion in a new tab, signed in."
    : (error==='no-backend' ? "Accounts need a Supabase connection — nothing configured on this device."
      : "Couldn't send that just now — try again in a moment.");
}
export function signOutOfAccount(){ signOut(); renderAccount(); }

/* ----- Pause menu — reachable with Esc from the open world, or the ☰ HUD button ----- */
export function openMenu(){ state.ui='menu'; hideAllOv(); renderMenu(); showOv('menuOv'); awardBadge('first-menu'); }
function renderMenu(){
  document.getElementById('menuPanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>Menu</h2>
    <div class="meta">Arrows / WASD move · E interacts and fishes · Esc closes a panel, or opens
      this one from the open world.</div>
    <div class="row" style="margin-top:14px;flex-direction:column;align-items:stretch">
      <button class="btn ghost" onclick="closeUI()" style="margin-bottom:9px">Resume</button>
      <button class="btn ghost" onclick="openAccount()" style="margin-bottom:9px">👤 Account${isLoggedIn()?' · signed in':''}</button>
      <button class="btn ghost" onclick="openConnections()" style="margin-bottom:9px">⚙ Manage AI connections</button>
      <button class="btn ghost" onclick="openIdeaCapture()" style="margin-bottom:9px">💡 Idea Jar${data.ideas.length?' · '+data.ideas.length:''}</button>
      <button class="btn ghost" onclick="openWaypoints()" style="margin-bottom:9px">🔗 Waypoints</button>
      <button class="btn ghost" onclick="openActivity()" style="margin-bottom:9px">📜 Activity Log</button>
      <button class="btn ghost" onclick="openBadges()" style="margin-bottom:9px">🏅 Badges</button>
      <button class="btn ghost" onclick="openInventory()" style="margin-bottom:9px">🎒 Inventory</button>
      <button class="btn ghost" onclick="openReviewQueue()" style="margin-bottom:9px">🛡 Steward Review</button>
      <button class="btn ghost" onclick="exportSave()" style="margin-bottom:9px">⬇ Export save (.json)</button>
      <button class="btn ghost" onclick="triggerImportSave()" style="margin-bottom:9px">⬆ Import save…</button>
      <button class="btn ghost" onclick="returnToTitle()" style="margin-bottom:9px">← Return to title screen</button>
      <button class="btn ghost" onclick="resetSave()" style="border-color:#b56f6f;color:#e0a0a0">⚠ Reset all progress</button>
    </div>`;
}

/* ----- Save export / import — "a Pavilion you can carry in a file" -----
   Export is just Store's own data serialized to a file the browser downloads;
   import is the reverse, replacing the current save wholesale (confirmed first,
   same pattern as resetSave). No backend, no account — a real backup and a way
   to move devices, using nothing Phase 3 hasn't already earned. */
export function exportSave(){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download='sand-pavilion-save-'+todayKey()+'.json';
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
    Store.save(parsed);
    location.reload();
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
  // six shelf blocks, three rows deep → six lineages
  const row = y<=4 ? 0 : y<=7 ? 1 : 2;
  const side = x<8 ? 0 : 1;
  return [['Theravada','Mahayana'],['Daoism','Practice'],['Science','Classics']][row][side];
}
const SHELF_HUE={ Theravada:36, Mahayana:275, Daoism:112, Practice:200, Science:8, Classics:150 };
export function openShelf(tradition){
  state.ui='shelf'; state.shelfTradition=tradition; state.shelfIndex=0; hideAllOv();
  document.getElementById('shelfTitle').textContent='Shelf · '+tradition;
  state.shelfDocs=Store.listDocs(tradition);
  renderShelf();
  showOv('shelfOv'); blip(700,.05,'square',.03);
}
function renderShelf(){
  const docs=state.shelfDocs||[];
  const hue=SHELF_HUE[state.shelfTradition]||38;
  const sel=docs[state.shelfIndex];
  document.getElementById('shelfList').innerHTML = docs.length ? `
    <div class="shelfCase">
      ${docs.map((d,i)=>`
        <div class="spine ${i===state.shelfIndex?'sel':''}" style="--hue:${hue+i*4}" onclick="selectBook(${i})">
          ${data.read[d.slug]?'<span class="spineRead">✓</span>':''}
          ${isRecentlyAdded(d.added)?'<span class="spineNew">NEW</span>':''}
          <span class="spineTitle">${esc(d.title)}</span>
        </div>`).join('')}
    </div>
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
      </div>
      <div class="blHint">◀ ▶ browse the shelf · Enter / E open</div>
    </div>` : '<p>This shelf waits for its first text.</p>';
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
  state.ui='reader'; state.currentDoc=slug; state.fullTextView=null; hideAllOv();
  document.getElementById('rdTitle').textContent=d.title;
  document.getElementById('rdMeta').innerHTML =
    `<b>${esc(d.tradition)}</b> · License: <b>${esc(d.license)}</b> · Source: <b>${esc(d.attribution||'')}</b><br>${esc(d.source_url)}`;
  document.getElementById('rdBody').innerHTML =
    `<p class="rdSummary">${esc(d.doc.summary)}</p>` +
    d.doc.sections.map(s=>`<h3>${esc(s.heading)}</h3><p>${esc(s.body)}</p>`).join('');
  document.getElementById('rdMark').textContent = data.read[slug] ? 'Read ✓' : 'Mark as read';
  document.getElementById('rdSpokenNote').textContent='';
  updateReaderSpeakBtns();
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
   sent to Supabase or the shared shelves. Kept outside the summary/full-text
   toggle (rdSummaryView vs rdFullTextView) so it stays visible across both,
   the same note surviving whichever way you're reading the book right now. */
export function addBookNote(slug){
  if(!slug) return;
  const input=document.getElementById('rdNoteInput');
  const text=input.value.trim(); if(!text) return;
  (data.bookNotes[slug]=data.bookNotes[slug]||[]).unshift({ts:todayKey(),text});
  persist(); input.value=''; renderBookNotes(slug);
  const d=Store.getDoc(slug);
  logActivity('Added a note to "'+(d?d.title:slug)+'".');
  awardBadge('first-note');
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
  day.sparks.unshift({ts:todayKey(), text:note.text, source:d?d.title:slug});
  persist(); logActivity('Brought a note from "'+(d?d.title:slug)+'" to today\'s plan.'); blip(784,.09);
  renderBookNotes(slug);
}
function renderBookNotes(slug){
  const notes=data.bookNotes[slug]||[];
  const today=plannerDay();
  document.getElementById('rdNotesList').innerHTML = notes.length
    ? notes.map((n,i)=>{
      const alreadySent=today.sparks.some(s=>s.text===n.text);
      return `<div class="card" style="cursor:default">
        <div class="s">${esc(n.ts)}</div><div>${esc(n.text)}</div>
        <div class="row" style="margin-top:6px">
          <button class="btn ghost" style="font-size:11px;padding:3px 10px" ${alreadySent?'disabled':''}
            onclick="sendNoteToToday('${slug}',${i})">${alreadySent?'✓ In today\'s plan':'→ Bring to today\'s plan'}</button>
        </div>
      </div>`;
    }).join('')
    : '<p class="meta">No notes yet on this book — jot down whatever\'s worth remembering.</p>';
}
export function currentDocSlug(){ return state.currentDoc; }

/* ----- Reading the whole book, not just the shelf summary — paginated
   client-side (no server, no chunking API) since a full public-domain
   text is just a long string once it's in memory. Verses/paragraphs are
   kept whole per page (split on blank lines) so a page never cuts a
   thought in half; a page only overflows past the target size if a
   single paragraph genuinely runs longer than that on its own. */
const FULLTEXT_PAGE_CHARS = 1400;
function paginateFullText(text){
  const paras=text.split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean);
  const pages=[]; let cur='';
  for(const p of paras){
    if(cur && (cur.length+p.length+2)>FULLTEXT_PAGE_CHARS){ pages.push(cur); cur=p; }
    else cur = cur ? cur+'\n\n'+p : p;
  }
  if(cur) pages.push(cur);
  return pages.length ? pages : [text];
}
/* Full text lives one of two ways: inlined in doc.fullText.text (the
   zero-setup seed.js fallback — always works, no server required), or as
   doc.fullText.storage (a MinIO pointer, {bucket,key}) once a text has
   been migrated to local object storage — see LIBRARY-SCALING-PLAN.md.
   Try the inline copy first (instant, no network); only reach for MinIO
   when there isn't one, and fail visibly rather than silently if MinIO
   isn't running, instead of leaving the reader stuck on "Loading…". */
export async function openFullText(slug){
  const d=Store.getDoc(slug); if(!d||!d.doc.fullText) return;
  const ft=d.doc.fullText;
  document.getElementById('rdFullTextMeta').innerHTML =
    `${esc(ft.translator||'')}${ft.translator?' · ':''}License: <b>${esc(ft.license)}</b><br>${esc(ft.source_url||'')}`;
  document.getElementById('rdSummaryView').style.display='none';
  document.getElementById('rdFullTextView').style.display='block';
  document.getElementById('rdFullTextPageNum').textContent='';
  let text = ft.text;
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
  state.fullTextView = { slug, pages:paginateFullText(text), page:0 };
  renderFullTextPage();
}
export function backToSummary(){
  stopSpeaking();
  state.fullTextView=null;
  document.getElementById('rdSummaryView').style.display='block';
  document.getElementById('rdFullTextView').style.display='none';
}
function renderFullTextPage(){
  const v=state.fullTextView; if(!v) return;
  stopSpeaking();
  document.getElementById('rdFullTextBody').textContent=v.pages[v.page];
  document.getElementById('rdFullTextPageNum').textContent=`Page ${v.page+1} of ${v.pages.length}`;
  document.getElementById('rdFullTextBody').scrollTop=0;
  updateFullTextSpeakBtn();
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
  btn.textContent = isSpeaking() ? '⏹ Stop' : '🔊 Read this page';
}
/* Per-page, not whole-book — a 50-page speech queued up front would be
   impossible to stop cleanly or resume mid-book. Reading a page and
   turning to the next is the same unit a human reader already uses, so
   read-aloud follows the same unit instead of inventing a bigger one. */
export function toggleFullTextReadAloud(){
  if(isSpeaking()){ stopSpeaking(); updateFullTextSpeakBtn(); return; }
  const v=state.fullTextView; if(!v) return;
  speak(v.pages[v.page], updateFullTextSpeakBtn);
  updateFullTextSpeakBtn();
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
    sub:d.tradition, license:d.license, summary:d.doc.summary, added:d.added}));
  const arc = data.workshop.docs.map(d=>({kind:'archive', slug:d.slug, title:d.title, category:d.category||'personal',
    sub:d.license||'', summary:d.body||'', added:d.created}));
  return [...lib, ...arc];
}
export function setIndexCategory(id){ state.indexCategory=id; state.indexSearch=''; renderIndex(); }
/* Real search (Store.searchDocs -> Postgres tsvector/ts_rank) runs
   debounced, since every keystroke firing a network request would be
   wasteful; a "generation" counter drops any response that's been
   superseded by a newer keystroke before it got back. While waiting
   (or when there's no Supabase to search), the existing local
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
      // Real, ranked results already came back — library matches are in
      // relevance order from Postgres; a local substring match covers the
      // Archive Desk too, since personal writing never lives in Supabase
      // and real search can't reach it.
      const libResults=state.indexSearchResults.map(d=>({kind:'library', slug:d.slug, title:d.title,
        category:d.category, sub:d.tradition, license:d.license, summary:d.doc.summary, added:d.added}));
      const archiveMatches=items.filter(i=>i.kind==='archive'
        && (i.title.toLowerCase().includes(search) || (i.summary||'').toLowerCase().includes(search)));
      shown=[...libResults, ...archiveMatches];
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
  return data.planner[k];
}
export function openPlanner(){
  state.ui='planner'; hideAllOv();
  const day=plannerDay();
  document.getElementById('planDate').textContent = new Date().toDateString() + ' · a day is a small, complete thing';
  document.getElementById('planIntent').value = day.intention;
  document.getElementById('planEmber').value = day.ember;
  renderBlocks();
  renderPlanSparks();
  document.getElementById('planSaved').textContent='';
  renderPastDays();
  renderPlanUpcoming();
  state.plannerChat=state.plannerChat||{history:[]};
  renderPlannerAssist();
  showOv('planOv');
}
/* ----- Sparks — the bridge closing the gap between reading and doing:
   a book note, brought over from the Reader in one click, lands here
   instead of just sitting on the book forever. Lives on the same
   planner-day record as everything else (persists/exports for free),
   and plannerContext() below folds it straight into the Steward's
   day-planning grounding, the same way it already sees due items and
   past embers. */
function renderPlanSparks(){
  const day=plannerDay();
  const el=document.getElementById('planSparks'); if(!el) return;
  el.innerHTML = day.sparks.length
    ? day.sparks.map((s,i)=>`
      <div class="card" style="cursor:default">
        <div class="s">from "${esc(s.source)}"</div>
        <div>${esc(s.text)}</div>
        <div class="row" style="margin-top:6px">
          <button class="btn ghost" style="font-size:11px;padding:3px 10px" onclick="removeSpark(${i})">✕ remove</button>
        </div>
      </div>`).join('')
    : '<p class="meta">Nothing yet — in any book\'s Reader, bring a note over with one click.</p>';
}
export function removeSpark(i){
  const day=plannerDay();
  day.sparks.splice(i,1); persist(); renderPlanSparks();
}
// the one place "planning today" and the quiet due-date badge actually
// meet — still nothing that pops up on its own, just here if you came to
// this desk to look. Empty for the ordinary day nothing's due.
function renderPlanUpcoming(){
  const today=todayKey();
  const horizon=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  const soon=upcomingItems().filter(i=>i.due<=horizon);
  const el=document.getElementById('planUpcoming');
  if(!soon.length){ el.innerHTML=''; return; }
  el.innerHTML = `<div class="meta" style="margin-top:-6px">${soon.map(i=>{
    const overdue=i.due<today, dueToday=i.due===today;
    const label=overdue?'overdue':dueToday?'due today':'due '+i.due;
    return `${i.kind==='course'?'📚':'📝'} <b>${esc(i.title)}</b> — ${esc(label)}`;
  }).join(' &nbsp;·&nbsp; ')}</div>`;
}
function pastDays(){ return Object.keys(data.planner).filter(k=>k!==todayKey()).sort().reverse(); }
function renderPastDays(){
  const keys=pastDays();
  document.getElementById('planPast').innerHTML = keys.length ? keys.map(k=>{
    const d=data.planner[k];
    const tended=d.blocks.filter(b=>b.state==='tended').length;
    const preview=d.ember||d.intention||'(no entry written)';
    return `<div class="card" onclick="viewPastDay('${k}')">
      <div class="t">${esc(k)} <span class="badge">${tended}/${d.blocks.length} tended</span></div>
      <div class="s">${esc(preview.length>110?preview.slice(0,110)+'…':preview)}</div>
    </div>`;
  }).join('') : '<p>Nothing further back yet — this is the first day kept at this desk.</p>';
}
export function viewPastDay(key){
  const d=data.planner[key]; if(!d) return;
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
    ${d.sparks.map(s=>`<div class="card" style="cursor:default"><div class="s">from "${esc(s.source)}"</div><div>${esc(s.text)}</div></div>`).join('')}` : ''}
    <h3>Evening ember</h3>
    <p>${esc(d.ember||'(nothing written that night)')}</p>
    <div class="row" style="margin-top:14px">
      <button class="btn ghost" onclick="backToPlanner()">← Back to the desk</button>
    </div>`;
  state.ui='pastDay'; hideAllOv(); showOv('pastDayOv');
}
export function backToPlanner(){ openPlanner(); }
function renderBlocks(){
  const day=plannerDay();
  document.getElementById('planBlocks').innerHTML = day.blocks.map((b,i)=>`
    <div class="blk ${b.state}" onclick="cycleBlock(${i})">
      ${esc(b.name)}
      <div class="st">${b.state==='waiting'?'· waiting':b.state==='tended'?'🔥 tended':'🌙 rested'}</div>
    </div>`).join('');
}
export function cycleBlock(i){
  const day=plannerDay();
  const order=['waiting','tended','rested'];
  day.blocks[i].state = order[(order.indexOf(day.blocks[i].state)+1)%3];
  renderBlocks(); persist(); blip(620,.04,'square',.03);
}
export function savePlanner(announce){
  const day=plannerDay();
  day.intention=document.getElementById('planIntent').value.trim();
  day.ember=document.getElementById('planEmber').value.trim();
  persist();
  if(announce){ document.getElementById('planSaved').textContent='Saved · '+todayKey(); blip(784,.08); awardBadge('first-plan'); }
}

/* ----- Ask the Steward (Writing Desk) — the Steward's café persona,
   the same character, just grounded in today's actual planner state
   instead of the notice board. Reuses CHAT_AGENTS.steward's system
   prompt as a base rather than duplicating its charter/moderation
   framing — this is the same resident wearing a different hat, per
   the standing decision that daily-life help is the Steward's place,
   not the Monk's (see CHAT_AGENTS.monk). */
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
async function plannerSystemPrompt(){
  const stewardBase=await CHAT_AGENTS.steward.systemPrompt();
  const { day, blocksSummary, upcoming, recent, sparks }=plannerContext();
  return stewardBase
    +"\n\nRight now you're specifically helping at the Writing Desk, not the café counter — a "
    +"visitor wants real help planning or reviewing their actual day, not café chat. Be concrete: "
    +"suggest an actual intention, which rhythm blocks deserve real focus today, or what to notice "
    +"given what's coming up. If they've brought sparks over from something they read, treat those "
    +"as real signal for what's actually on their mind right now — weave them into the day rather "
    +"than ignoring them in favor of due dates alone. A short, usable answer, not a lecture.\n\n"
    +"Today's intention so far: "+(day.intention||'(not set yet)')
    +"\nToday's rhythm blocks: "+blocksSummary
    +"\nSparks brought over from reading today:\n"+sparks
    +"\nWhat's due soon:\n"+upcoming
    +"\nRecent days, for pattern:\n"+recent;
}
export function fillPlannerPrompt(text){ const el=document.getElementById('planAskInput'); if(el){ el.value=text; el.focus(); } }
export async function sendPlannerMessage(){
  const input=document.getElementById('planAskInput');
  const q=input.value.trim(); if(!q) return;
  state.plannerChat=state.plannerChat||{history:[]};
  state.plannerChat.history.push({role:'user',content:q}); input.value=''; renderPlannerAssist();
  try{
    const reply=await AI.chat([{role:'system',content:await plannerSystemPrompt()}, ...state.plannerChat.history]);
    state.plannerChat.history.push({role:'assistant',content:reply}); state.plannerChat.lastReply=reply;
    logActivity('Asked the Steward for help planning the day.');
  }catch(e){
    state.plannerChat.history.push({role:'assistant',content:"The Steward's connection flickers — no answer this time. Check that your AI connection is still running."});
  }
  renderPlannerAssist();
}
export function usePlannerReplyAsIntention(){
  const c=state.plannerChat; if(!c||!c.lastReply) return;
  document.getElementById('planIntent').value = c.lastReply.length>140 ? c.lastReply.slice(0,140) : c.lastReply;
}
function renderPlannerAssist(){
  const el=document.getElementById('planAssist'); if(!el) return;
  const aiOn=isAIActive();
  const c=state.plannerChat||{history:[]};
  el.innerHTML = aiOn ? `
    <div class="meta">The Steward can help you think through today, grounded in what's actually due and how recent days went.</div>
    <div class="row" style="margin-bottom:10px">
      <button class="btn ghost" style="font-size:11.5px" onclick="fillPlannerPrompt('Help me set an intention for today.')">Help me plan today</button>
      <button class="btn ghost" style="font-size:11.5px" onclick="fillPlannerPrompt('Given what\\'s due soon, what should I actually focus on?')">What should I focus on</button>
      <button class="btn ghost" style="font-size:11.5px" onclick="fillPlannerPrompt('Looking at my recent days, what pattern should I adjust?')">Spot a pattern</button>
    </div>
    <div id="planAskHistory">${(c.history||[]).map(h=>`
      <div class="card" style="cursor:default"><div class="t">${h.role==='user'?'You':'The Steward'}</div><div class="s">${esc(h.content)}</div></div>`).join('')}</div>
    <textarea id="planAskInput" rows="2" placeholder="Ask, or pick a quick start above…"></textarea>
    <div class="row" style="margin-top:8px">
      <button class="btn" onclick="sendPlannerMessage()">Ask</button>
      ${c.lastReply?`<button class="btn ghost" onclick="usePlannerReplyAsIntention()">📋 Use as today's intention</button>`:''}
    </div>`
    : `<div class="meta">No local AI connected right now (⚙ Manage AI connections) — the Steward needs a live connection to help plan.</div>`;
}

/* ----- Courses (the Course Board) ----- */
export function openCourses(){ state.ui='courses'; hideAllOv(); state.courseView={mode:'list',id:null}; renderCourses(); showOv('courseOv'); }
function renderCourses(){
  const el=document.getElementById('coursePanel');
  const v=state.courseView;
  if(v.mode==='list'){
    el.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>The Course Board</h2>
      <div class="meta">Paths you set for yourself. The board confers nothing — the walking is the credential.</div>
      ${data.courses.map(c=>{
        const done=c.steps.filter(s=>s.done).length, pct=c.steps.length?Math.round(done/c.steps.length*100):0;
        return `<div class="card" onclick="openCourse(${c.id})">
          <div class="t">${esc(c.title)} <span class="badge lic">${done}/${c.steps.length} steps</span></div>
          <div class="s">${esc(c.why||'')}${c.due?' · due '+esc(c.due):''}</div>
          <div class="prog"><div style="width:${pct}%"></div></div>
        </div>`;
      }).join('') || '<p>The board is bare. Pin your first path.</p>'}
      <div class="row" style="margin-top:14px">
        <button class="btn" onclick="newCourseForm()">+ Pin a new course</button>
        ${isAIActive()?'<button class="btn ghost" onclick="newCourseAIForm()">✨ Draft a course with AI</button>':''}
      </div>`;
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
      <h2>${esc(c.title)}</h2>
      <div class="meta">${esc(c.why||'')} · begun ${esc(c.begun)}${c.due?' · due '+esc(c.due):''}</div>
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
      <div class="row" style="margin-top:14px">
        <button class="btn ghost" onclick="backToList()">← All courses</button>
        <button class="btn ghost" onclick="removeCourse(${c.id})">Take down</button>
      </div>`;
  }
}
export function setCourseDue(id){
  const c=data.courses.find(x=>x.id===id); if(!c) return;
  c.due=document.getElementById('cDueEdit').value||null;
  persist(); setHud(); renderCourses();
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
  return CHARTER
    +"\n\nYou help a visitor turn a goal into a self-directed course outline for the Sand Pavilion's "
    +"Course Board — practical, concrete steps they can actually follow, not vague inspiration. Given "
    +"their goal, respond in EXACTLY this format and nothing else — no preamble, no closing remarks, "
    +"no markdown formatting:\n\n"
    +"TITLE: <a short course title>\n"
    +"WHY: <one sentence on what this course is for>\n"
    +"STEPS:\n"
    +"<step title> | <the practice for that step>\n"
    +"<step title> | <the practice for that step>\n"
    +"(4 to 8 steps total, one per line, each in that exact \"title | practice\" shape — never invent "
    +"a URL; only add a second | with a link if the visitor's goal already named a real one)";
}
function parseAIDraftedCourse(text){
  const titleM=text.match(/^TITLE:\s*(.+)$/mi);
  const whyM=text.match(/^WHY:\s*(.+)$/mi);
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
  return { title:titleM?titleM[1].trim():'', why:whyM?whyM[1].trim():'', steps };
}
async function draftCourseFromGoal(goal){
  const reply=await AI.chat(
    [{role:'system',content:courseDraftSystemPrompt()},{role:'user',content:goal}], {long:true});
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
    state.courseView={mode:'new', draftTitle:draft.title, draftWhy:draft.why, draftSteps:draft.steps};
    renderCourses(); blip(784,.09);
  }catch(e){
    msg.textContent="The connection flickered — no draft this time. Check that your AI connection is still running.";
  }
}
/* ----- Drafting a training plan from mid-conversation with a resident
   (the Monk, so far) — reuses the exact same drafting engine as the
   Course Board's own "Draft with AI" form, just seeded from the
   conversation instead of a typed goal. Lands on the same review-before-
   pinning screen; nothing is saved without the visitor choosing to pin it. */
export async function draftTrainingPlanFromChat(){
  const d=state.dialog; if(!d||!d.chat) return;
  const btn=document.getElementById('chatTrainBtn');
  if(btn){ btn.disabled=true; btn.textContent='Drafting…'; }
  const convo=d.transcript.map(m=>(m.from==='user'?'Visitor':d.name)+': '+m.text).join('\n');
  const goal="A visitor has been talking with "+d.name+" at the Sand Pavilion. Based on this real "
    +"conversation, draft a training/practice plan matching what they actually asked about or seem "
    +"to need — ground it in the specifics discussed, don't invent a generic plan unrelated to it:"
    +"\n\n"+convo;
  try{
    const draft=await draftCourseFromGoal(goal);
    if(btn){ btn.disabled=false; btn.textContent='📋 Draft a training plan from this conversation'; }
    if(!draft) return;
    closeDialog();
    openCourses();
    state.courseView={mode:'new', draftTitle:draft.title, draftWhy:draft.why, draftSteps:draft.steps};
    renderCourses(); blip(784,.09);
  }catch(e){
    if(btn){ btn.disabled=false; btn.textContent='📋 Draft a training plan from this conversation'; }
  }
}
export function createCourse(){
  const title=document.getElementById('ncTitle').value.trim();
  const why=document.getElementById('ncWhy').value.trim();
  const due=document.getElementById('ncDue')?.value||null;
  const steps=document.getElementById('ncSteps').value.split('\n').map(l=>l.trim()).filter(Boolean)
    .map(l=>{ const [t,p,u]=l.split('|').map(s=>s.trim()); return {title:t,practice:p||'',url:safeUrl(u),done:false}; });
  if(!title||!steps.length) return;
  data.courses.unshift({ id:Date.now(), title, why, due, steps, begun:todayKey() });
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
      <h2>The Archive Desk</h2>
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
export function openComputer(){
  if(!isAIActive()){
    openDialog('THE COMPUTER', ["No local AI connected right now (⚙ Manage AI connections) — this terminal needs a live connection to actually answer. Scripted planning still works fine at the Writing Desk."]);
    return;
  }
  openChatDialog({
    name:'THE COMPUTER', color:'#7ec4de', glow:'#a9dcf0', aiAgent:'computer',
    lines:["Online. Ask me to help plan your day, draft a lesson plan from an idea, or just think something through out loud."],
  });
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
  return CHARTER
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
    logActivity('Asked the Research Desk about "'+p.title+'".');
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
   the same personal, local-only, never-sent-to-Supabase place every
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
      {role:'system',content:CHARTER+'\n\nSummarize the text the visitor pastes into clear, well-organized '
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
      <div style="margin-top:10px">${p.notes.length ? p.notes.map(n=>`
        <div class="card" style="cursor:default"><div class="s">${esc(n.ts)}</div><div>${esc(n.text)}</div></div>`).join('')
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
    <h2>The Research Desk</h2>
    <div class="meta">Freeform, ongoing work — a running notebook per topic or per idea you're
      trying to make real, not a single polished page. An assistant AI can think alongside you here,
      grounded in your own notes — whether you're studying something or building it.</div>
    ${projects.length ? projects.map(p=>`
      <div class="card" onclick="openResearchProject('${p.id}')">
        <div class="t">${esc(p.title)}</div>
        <div class="s">${p.goal?esc(p.goal)+' · ':''}${p.notes.length} note${p.notes.length===1?'':'s'} · started ${esc(p.created)}</div>
      </div>`).join('') : '<p>Nothing started yet.</p>'}
    <div class="row" style="margin-top:14px"><button class="btn" onclick="newResearchForm()">+ Start a research project</button></div>`;
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

/* ----- The Notice Board (the café) — the shared, steward-moderated
   counterpart to Waypoints: a post points outward at wherever its real
   conversation lives, the same shape as a Waypoint, just shared instead
   of personal. Read is public once approved; posting always lands as
   'pending' — there's deliberately no "approve" button in the game
   itself (see data/exchange.js's moderation note). */
export function openNoticeBoard(){
  state.ui='notice'; hideAllOv();
  state.noticeView = { mode:'list', posts:null, loading:true, error:null, openPost:null, pending:null };
  renderNotice(); showOv('noticeOv');
  loadNoticeBoard();
  if(isSteward()) loadPendingQuestions();
}
async function loadNoticeBoard(){
  const { posts, error } = await listApprovedQuestions(3);
  if(state.ui!=='notice') return; // panel was closed before the fetch came back
  state.noticeView.posts=posts; state.noticeView.loading=false; state.noticeView.error=error;
  renderNotice();
}
async function loadPendingQuestions(){
  const { posts } = await listPendingQuestions();
  if(state.ui!=='notice') return;
  state.noticeView.pending=posts;
  renderNotice();
}
export async function approveNoticePost(id){
  await moderateQuestion(id, 'approved');
  loadNoticeBoard(); loadPendingQuestions();
}
export async function rejectNoticePost(id){
  await moderateQuestion(id, 'rejected');
  loadPendingQuestions();
}
export function openNoticePost(id){
  state.noticeView.openPost = (state.noticeView.posts||[]).find(p=>p.id===id);
  state.noticeView.mode='post'; renderNotice();
}
export function backToNoticeList(){ state.noticeView.mode='list'; state.noticeView.openPost=null; renderNotice(); }
export function newNoticePostForm(){ state.noticeView.mode='compose'; renderNotice(); }
export async function submitNoticePost(){
  const title=document.getElementById('npTitle').value.trim();
  const body=document.getElementById('npBody').value.trim();
  const url=safeUrl(document.getElementById('npUrl').value.trim());
  const author=document.getElementById('npAuthor').value.trim();
  const msg=document.getElementById('npMsg');
  if(!title||!body){ msg.textContent='A title and a body are both required.'; return; }
  msg.textContent='Submitting…';
  const { ok, error } = await submitQuestion({ title, body, external_url:url||null, author:author||null });
  if(!ok){
    msg.textContent = error==='no-backend'
      ? "The café needs a Supabase connection to post — nothing configured on this device."
      : "Couldn't submit just now — try again in a moment.";
    return;
  }
  logActivity('Posted a question to the café notice board: "'+title+'".');
  state.noticeView.mode='submitted'; renderNotice();
}
function renderNotice(){
  const v=state.noticeView, panel=document.getElementById('noticePanel');
  if(v.mode==='compose'){
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>Post a Question</h2>
      <div class="meta">Goes to a steward for review before it appears on the board — liberal, but never blind.</div>
      <label>Title</label><input type="text" id="npTitle" maxlength="140" placeholder="What are you asking or sharing?">
      <label>Body</label><textarea id="npBody" rows="5" placeholder="Say more, in your own words."></textarea>
      <label>Link (optional)</label><input type="text" id="npUrl" placeholder="https://... if the real conversation lives elsewhere">
      <label>Your name (optional)</label><input type="text" id="npAuthor" placeholder="How to sign it — defaults to anonymous">
      <div id="npMsg" class="meta"></div>
      <div class="row" style="margin-top:14px">
        <button class="btn" onclick="submitNoticePost()">Submit for review</button>
        <button class="btn ghost" onclick="backToNoticeList()">← Back</button>
      </div>`;
    return;
  }
  if(v.mode==='submitted'){
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>Submitted</h2>
      <div class="meta">Thank you — a steward will look it over. Nothing goes onto the board unmoderated.</div>
      <div class="row" style="margin-top:14px"><button class="btn ghost" onclick="backToNoticeList()">← Back to the board</button></div>`;
    return;
  }
  if(v.mode==='post' && v.openPost){
    const p=v.openPost;
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>${esc(p.title)}</h2>
      <div class="meta">${esc(p.author||'a visitor')} · ${new Date(p.created_at).toLocaleDateString()}</div>
      <p>${esc(p.body)}</p>
      ${p.external_url && safeUrl(p.external_url) ? `<p><a class="link" href="${esc(p.external_url)}" target="_blank" rel="noopener noreferrer">→ where the conversation continues</a></p>` : ''}
      <div class="row" style="margin-top:14px"><button class="btn ghost" onclick="backToNoticeList()">← Back to the board</button></div>`;
    return;
  }
  panel.innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>The Notice Board</h2>
    <div class="meta">Three most recent, steward-approved. A post here points outward — the real
      conversation may live elsewhere, or right in the words below.</div>
    ${v.loading ? '<p>Reading the board…</p>' :
      v.error==='no-backend' ? '<p>The café needs a Supabase connection to show the board — nothing configured on this device.</p>' :
      v.error ? "<p>Couldn't reach the board just now. Try again in a moment.</p>" :
      (v.posts && v.posts.length ? v.posts.map(p=>`
        <div class="card" onclick="openNoticePost('${p.id}')">
          <div class="t">${esc(p.title)}</div>
          <div class="s">${esc(p.author||'a visitor')} · ${new Date(p.created_at).toLocaleDateString()}</div>
        </div>`).join('') : '<p>Nothing posted yet.</p>')}
    <div class="row" style="margin-top:14px"><button class="btn" onclick="newNoticePostForm()">+ Post a question</button></div>
    ${isSteward() ? `
      <h3 style="margin-top:22px">🛡 Pending review</h3>
      <div class="meta">Only you can see this — steward-only, enforced by the database itself, not just this screen.</div>
      ${v.pending===null ? '<p>Reading the queue…</p>' :
        v.pending.length ? v.pending.map(p=>`
          <div class="card" style="cursor:default">
            <div class="t">${esc(p.title)}</div>
            <div class="s">${esc(p.author||'a visitor')} · ${new Date(p.created_at).toLocaleDateString()}</div>
            <div class="s">${esc(p.body)}</div>
            ${p.external_url && safeUrl(p.external_url) ? `<div class="s"><a class="link" href="${esc(p.external_url)}" target="_blank" rel="noopener noreferrer">${esc(p.external_url)}</a></div>` : ''}
            <div class="row" style="margin-top:8px">
              <button class="btn ghost" onclick="approveNoticePost('${p.id}')">✓ Approve</button>
              <button class="btn ghost" style="border-color:#b56f6f;color:#e0a0a0" onclick="rejectNoticePost('${p.id}')">✕ Reject</button>
            </div>
          </div>`).join('') : '<p>Nothing waiting.</p>'}
    ` : ''}`;
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
  return CHARTER
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
    logActivity('Asked the Grant Desk about "'+p.title+'".');
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
      <div style="margin-top:10px">${p.documents.length ? p.documents.map((d,i)=>`
        <div class="card" style="cursor:default">
          <div class="t">${esc(d.label)} <span class="badge">${esc(d.ts)}</span></div>
          <div class="s">${esc(d.text.length>200?d.text.slice(0,200)+'…':d.text)}</div>
          <div class="row" style="margin-top:6px"><button class="btn ghost" onclick="removeGrantDocument('${p.id}',${i})">Remove</button></div>
        </div>`).join('') : '<p>No documents yet — the more real material you add, the more useful a draft will be.</p>'}</div>

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
          ${GRANT_PROMPTS.map(pr=>`<button class="btn ghost" style="font-size:11.5px" onclick="fillGrantPrompt(${JSON.stringify(pr)})">${esc(pr)}</button>`).join('')}
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
    else { openGrantDesk(); openGrantProject(i.id); }
  };
  document.getElementById('upcomingPanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>Upcoming</h2>
    <div class="meta">Only things you gave a due date, on the Course Board or the Grant Desk. Nothing
      here ever pops up on its own — this panel is the whole feature.</div>
    ${items.length ? items.map((i,idx)=>{
      const overdue=i.due<today, dueToday=i.due===today;
      const status=overdue?'overdue':dueToday?'due today':'due '+i.due;
      const color=overdue?'#e0a0a0':dueToday?'#ffd98a':'#9c8b74';
      return `<div class="card" onclick="__spOpenUpcomingItem(${idx})">
        <div class="t">${i.kind==='course'?'📚':'📝'} ${esc(i.title)}</div>
        <div class="s" style="color:${color}">${esc(status)}</div>
      </div>`;
    }).join('') : '<p>Nothing due — because nothing has to be. Set a due date on a course or grant project any time you actually want a reminder.</p>'}`;
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
function renderIdeaJar(){
  const ideas=data.ideas;
  document.getElementById('ideaPanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>💡 The Idea Jar</h2>
    <div class="meta">Get it down before it slips — nothing here needs to be tidy. Digest it later,
      whenever you come back to read the jar.</div>
    <textarea id="ideaInput" rows="3" placeholder="What's the idea?"></textarea>
    <div class="row" style="margin-top:10px">
      <button class="btn" onclick="saveIdea()">Drop it in the jar</button>
      <button class="btn ghost" onclick="closeUI()">← Back to what I was doing</button>
    </div>
    ${ideas.length ? `<h3 style="margin-top:18px">${ideas.length} kept so far</h3>
      ${ideas.map(i=>`
        <div class="card" style="cursor:default">
          <div class="s">${esc(i.ts)}</div>
          <div>${esc(i.text)}</div>
          <div class="row" style="margin-top:6px"><button class="btn ghost" onclick="deleteIdea(${i.id})">Remove</button></div>
        </div>`).join('')}` : ''}`;
}
export function saveIdea(){
  const input=document.getElementById('ideaInput');
  const text=input.value.trim(); if(!text) return;
  data.ideas.unshift({id:Date.now(),text,ts:todayKey()});
  persist(); logActivity('Dropped an idea in the jar.'); blip(700,.06);
  renderIdeaJar();
  setTimeout(()=>document.getElementById('ideaInput')?.focus(),30);
}
export function deleteIdea(id){
  data.ideas=data.ideas.filter(i=>i.id!==id);
  persist(); renderIdeaJar();
}

/* ----- The Residents' Board (the café) — the agent-notes commons: the
   same "no gate" instinct as the Library, applied to the residents
   themselves. Deliberately a separate table/station from the human
   Notice Board — "notes from people" and "notes from agents" stay
   legible as two different things. A note is a real AI generation
   (grounded in the same charter + context CHAT_AGENTS already builds
   for live chat), not a canned line — needs a local AI connection to
   write one, same as any other AI feature here. Same steward-moderated
   shape as the Notice Board: nothing appears unreviewed. */
function agentLabel(key){ return CHAT_AGENTS[key]?.label || key; }
export function openResidentsBoard(){
  state.ui='residents'; hideAllOv();
  state.residentsView={ notes:null, loading:true, error:null, pending:null };
  renderResidents(); showOv('residentsOv');
  loadResidentsBoard();
  if(isSteward()) loadPendingNotes();
}
async function loadResidentsBoard(){
  const { notes, error }=await listApprovedNotes(5);
  if(state.ui!=='residents') return;
  state.residentsView.notes=notes; state.residentsView.loading=false; state.residentsView.error=error;
  renderResidents();
}
async function loadPendingNotes(){
  const { notes }=await listPendingNotes();
  if(state.ui!=='residents') return;
  state.residentsView.pending=notes;
  renderResidents();
}
export async function approveNote(id){ await moderateNote(id,'approved'); loadResidentsBoard(); loadPendingNotes(); }
export async function rejectNote(id){ await moderateNote(id,'rejected'); loadPendingNotes(); }
export async function askAgentForNote(agentKey){
  if(!isAIActive()) return;
  const msg=document.getElementById('resNoteMsg');
  const label=agentLabel(agentKey);
  msg.textContent=label+' is thinking…';
  const agent=CHAT_AGENTS[agentKey]||CHAT_AGENTS.quill;
  try{
    const systemPrompt=await agent.systemPrompt();
    const note=await AI.chat([
      {role:'system',content:systemPrompt},
      {role:'user',content:'In one or two sentences, in your own voice, leave a short note for the other residents of the Pavilion — something you noticed, not a summary of this prompt or a greeting. Return only the note itself, nothing else.'},
    ]);
    const { ok, error }=await submitNote({ agent:agentKey, note:note.trim() });
    msg.textContent = ok
      ? 'Left for review — a steward will look it over before it joins the board.'
      : "Couldn't submit that just now — try again in a moment.";
    if(isSteward()) loadPendingNotes();
  }catch(err){
    msg.textContent=label+"'s connection flickered — the local AI didn't answer. (Check that Ollama is still running.)";
  }
}
function renderResidents(){
  const v=state.residentsView, panel=document.getElementById('residentsPanel');
  panel.innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>The Residents' Board</h2>
    <div class="meta">Notes the residents leave for each other — overheard more than addressed to
      you. Steward-approved, same discipline as the Notice Board.</div>
    ${v.loading ? '<p>Reading the board…</p>' :
      v.error==='no-backend' ? '<p>Needs a Supabase connection to show the board — nothing configured on this device.</p>' :
      v.error ? "<p>Couldn't reach the board just now. Try again in a moment.</p>" :
      (v.notes && v.notes.length ? v.notes.map(n=>`
        <div class="card" style="cursor:default">
          <div class="t">${esc(agentLabel(n.agent))}</div>
          <div class="s">${esc(n.note)}</div>
        </div>`).join('') : '<p>No notes yet.</p>')}
    <h3 style="margin-top:18px">Ask a resident to leave a note</h3>
    <div class="meta">${isAIActive()
      ? "A real generation, grounded in the same charter they already follow — not a scripted line."
      : "Needs a local AI connection (⚙ Manage AI connections) — these are genuinely generated, never canned."}</div>
    <div class="row" style="margin-top:10px">
      <button class="btn ghost" ${isAIActive()?'':'disabled'} onclick="askAgentForNote('quill')">📝 Ask Quill</button>
      <button class="btn ghost" ${isAIActive()?'':'disabled'} onclick="askAgentForNote('steward')">📝 Ask the Steward</button>
    </div>
    <div id="resNoteMsg" class="meta"></div>
    ${isSteward() ? `
      <h3 style="margin-top:22px">🛡 Pending review</h3>
      <div class="meta">Only you can see this — enforced by the database, not just this screen.</div>
      ${v.pending===null ? '<p>Reading the queue…</p>' :
        v.pending.length ? v.pending.map(n=>`
          <div class="card" style="cursor:default">
            <div class="t">${esc(agentLabel(n.agent))}</div>
            <div class="s">${esc(n.note)}</div>
            <div class="row" style="margin-top:8px">
              <button class="btn ghost" onclick="approveNote('${n.id}')">✓ Approve</button>
              <button class="btn ghost" style="border-color:#b56f6f;color:#e0a0a0" onclick="rejectNote('${n.id}')">✕ Reject</button>
            </div>
          </div>`).join('') : '<p>Nothing waiting.</p>'}
    ` : ''}`;
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
      <div class="meta">Have something real — a paper, a chapter, notes you already have permission
        to share — but no Caravan JSON for it? Paste it straight in. Same review queue, same
        license/legality check before anything's approved.</div>
      <label>Title</label><input type="text" id="rmTitle" placeholder="e.g. On the Duty of Civil Disobedience">
      <label>Tradition</label>
      <select id="rmTradition" style="width:100%;background:#1b140d;border:2px solid #55432e;border-radius:7px;color:#f5e9d4;font-family:inherit;font-size:13.5px;padding:9px 11px">
        ${['Theravada','Mahayana','Daoism','Practice','Science','Classics'].map(t=>`<option value="${t}">${t}</option>`).join('')}
      </select>
      <label>License</label><input type="text" id="rmLicense" placeholder="e.g. Public Domain, CC0, CC-BY 4.0">
      <label>Source (URL or citation)</label><input type="text" id="rmSource" placeholder="Where this actually came from">
      <label>Full text</label><textarea id="rmBody" rows="8" placeholder="Paste the whole thing — this is what gets shelved."></textarea>
      <div id="reviewManualMsg" class="meta"></div>
      <div class="row" style="margin-top:14px">
        <button class="btn" onclick="submitManualReviewItem()">Add to queue</button>
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
    ${q.length ? q.map(item=>`
      <div class="card" style="cursor:default">
        <div class="t">${esc(item.title)} <span class="badge">${esc(item.origin)}</span> <span class="badge">${esc(item.status)}</span></div>
        <div class="s">${esc(item.license||'(no license given)')} ${item.source?'· '+esc(item.source):''}</div>
        ${draftedNote(item)}
        <div class="row" style="margin-top:8px">
          ${item.status==='pending' ? `
            <button class="btn" onclick="approveReviewItem(${item.id})">Approve</button>
            <button class="btn ghost" onclick="rejectReviewItem(${item.id})">Reject</button>` : ''}
          ${aiOn ? `<button class="btn ghost" id="reviewDraftBtn${item.id}" onclick="draftSummaryForReviewItem(${item.id})">✨ ${item.draftSummary?'Redraft':'Draft'} summary with AI</button>` : ''}
        </div>
      </div>`).join('') : '<p>Nothing waiting for review.</p>'}
    <div class="row" style="margin-top:14px">
      <button class="btn ghost" onclick="newReviewImportForm()">+ Paste Caravan output</button>
      <button class="btn ghost" onclick="newReviewManualForm()">+ Add a text by hand</button>
      <button class="btn ghost" onclick="newSCSearchForm()">🔍 Browse SuttaCentral</button>
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
  persist(); logActivity('Asked Quill for a memory report.'); blip(784,.09);
  state.archiveView={mode:'read',slug}; renderArchive();
}

/* index.html markup and the innerHTML templates above use inline
   onclick="..." handlers, which only resolve against `window` —
   module-scoped functions aren't visible there, so wire them up. */
Object.assign(window, {
  closeUI, openReader, markRead, backToShelf, addBookNote, sendNoteToToday, removeSpark,
  openFullText, backToSummary, fullTextNextPage, fullTextPrevPage, toggleFullTextReadAloud,
  selectBook, shelfOpenSelected,
  openPlanner, cycleBlock, savePlanner, viewPastDay, backToPlanner,
  fillPlannerPrompt, sendPlannerMessage, usePlannerReplyAsIntention,
  newCourseForm, createCourse, openCourse, toggleStep, removeCourse, backToList,
  newCourseAIForm, draftCourseWithAI, setCourseDue, draftTrainingPlanFromChat,
  addConnection, toggleConnection, removeConnection, recheckConnections, setConnectionModel, fillConnectionPreset,
  newArchiveForm, createArchiveDoc, backToArchiveList, openArchiveDoc, deleteArchiveDoc, skipTyping,
  newBulkForm, runBulkImport, generateQuillReport,
  openConnections, returnToTitle, resetSave,
  openWaypoints, addWaypoint, removeWaypoint, exportSave, triggerImportSave,
  openIdeaCapture, saveIdea, deleteIdea,
  toggleDialogSpeak, toggleReadAloud, toggleSpokenSummary, openActivity,
  closeDialog, sendCurrentChatMessage, toggleChatSpeak, skipChatTyping,
  openBadges, openIndex, setIndexCategory, setIndexSearch, clearIndexSearch, openIndexItem,
  openComputer, saveLastChatReplyToArchive,
  openRequests, addRequest, removeRequest,
  openInventory, toggleInventory, currentDocSlug, suggestInventoryCategories,
  openReviewQueue, newReviewImportForm, newReviewManualForm, newSCSearchForm, backToReviewList, importReviewCandidates, submitManualReviewItem,
  searchSuttaCentral, fetchSuttaCentralText,
  submitArchiveDocForReview, approveReviewItem, rejectReviewItem, draftSummaryForReviewItem, generateApprovedBatch, markBatchExported,
  openNoticeBoard, openNoticePost, backToNoticeList, newNoticePostForm, submitNoticePost,
  approveNoticePost, rejectNoticePost,
  openHearth, openGrantDesk, openCoffee,
  newGrantForm, backToGrantList, createGrantProject, openGrantProject, deleteGrantProject,
  addGrantDocument, removeGrantDocument, fillGrantPrompt, sendGrantMessage,
  saveGrantReplyAsDraft, removeGrantDraft, promoteGrantToArchive, setGrantDue,
  openUpcoming,
  openAccount, sendAccountLink, signOutOfAccount,
  openResidentsBoard, askAgentForNote, approveNote, rejectNote,
  openResearchDesk, newResearchForm, backToResearchList, createResearchProject,
  openResearchProject, deleteResearchProject, addResearchNote, fillResearchPrompt,
  sendResearchMessage, saveResearchReplyAsNote, promoteResearchToArchive,
  summarizeResearchText,
});
