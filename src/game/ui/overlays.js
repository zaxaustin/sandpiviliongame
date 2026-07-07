import { Store } from '../data/store.js';
import { state, data, persist, todayKey, DEFAULT_BLOCKS, logActivity, awardBadge } from '../entities.js';
import { BADGES } from '../data/badges.js';
import { blip, setHud } from '../main.js';
import { AI, isAIActive, providerFor, detectAI } from '../ai/provider.js';
import { CHARTER } from '../data/charter.js';
import { SEED_LIBRARY, CATEGORIES } from '../data/seed.js';
import { speak, stopSpeaking, isSpeaking, ttsAvailable } from '../tts.js';

function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
/* escaping text is not the same as a safe link — a `javascript:` URL
   still renders as harmless text but still runs if someone clicks it.
   Anywhere a user-supplied URL becomes an href (Waypoints, course steps),
   route it through this first. */
function safeUrl(u){ return /^https?:\/\//i.test(u||'') ? u : ''; }

/* ---------- dialog ---------- */
export function openDialog(name,lines){
  state.dialog={name,lines:Array.isArray(lines)?lines:[lines],idx:0,chat:false};
  document.getElementById('dialog').style.display='block';
  renderDialog(); blip(740,.06,'square',.03);
}
export function openChatDialog(npc){
  state.dialog={name:npc.name,lines:[npc.lines[0]],idx:0,chat:true,history:[],thinking:false};
  document.getElementById('dialog').style.display='block';
  renderDialog(); blip(740,.06,'square',.03);
}
function renderDialog(){
  const d=state.dialog;
  const atEnd=d.idx>=d.lines.length-1;
  const showChat=d.chat && atEnd && !d.thinking;
  document.getElementById('dName').textContent=d.name;
  document.getElementById('dText').textContent=d.thinking?'…':d.lines[d.idx];
  const input=document.getElementById('dChatInput');
  input.style.display=showChat?'block':'none';
  if(showChat){ input.value=''; input.focus(); }
  document.getElementById('dMore').textContent =
    showChat ? 'Esc leave · Enter ask' : ((d.idx<d.lines.length-1)?'▼ E':'✕ E');
  updateDialogSpeakBtn();
}
export function advanceDialog(){
  const d=state.dialog; if(!d||d.thinking) return;
  stopSpeaking();
  if(d.idx<d.lines.length-1){ d.idx++; renderDialog(); blip(600,.04,'square',.025); }
  else if(!d.chat){ state.dialog=null; document.getElementById('dialog').style.display='none'; }
  // chat mode, already at end: the input is showing, E does nothing further
}
export function closeDialog(){
  stopSpeaking();
  state.dialog=null;
  document.getElementById('dialog').style.display='none';
  document.getElementById('dChatInput').style.display='none';
}
/* ----- read the current dialog line aloud — one small step toward the
   hopes-and-dreams "a voice you can actually hear" for every resident,
   not just Quill's spoken library summaries below. */
export function toggleDialogSpeak(){
  const d=state.dialog; if(!d) return;
  if(isSpeaking()){ stopSpeaking(); updateDialogSpeakBtn(); return; }
  speak(d.thinking?'…':d.lines[d.idx], updateDialogSpeakBtn);
  updateDialogSpeakBtn();
}
function updateDialogSpeakBtn(){
  const btn=document.getElementById('dSpeak'); if(!btn) return;
  if(!ttsAvailable()){ btn.style.display='none'; return; }
  btn.style.display='inline-block';
  btn.textContent = isSpeaking() ? '⏹' : '🔊';
}
const MEMORY_CAP=20; // keep this a short, readable list, not a growing transcript
function agentMemory(agent){ return data.agentMemory[agent]||(data.agentMemory[agent]=[]); }
function remember(agent,text){
  const mem=agentMemory(agent);
  mem.push({ts:todayKey(),text});
  while(mem.length>MEMORY_CAP) mem.shift();
  persist();
}
function quillSystemPrompt(){
  const shelf=SEED_LIBRARY.map(d=>`- "${d.title}" (${d.tradition}, ${d.license}): ${d.doc.summary}`).join('\n');
  let prompt=CHARTER+'\n\nWhat is actually on the shelves right now:\n'+shelf;
  const mem=agentMemory('quill');
  if(mem.length){
    prompt+='\n\nThings this visitor has asked you about on past visits (for continuity — mention it naturally if relevant, don\'t force it):\n'
      +mem.slice(-8).map(m=>`- (${m.ts}) ${m.text}`).join('\n');
  }
  return prompt;
}
async function sendChatMessage(q){
  const d=state.dialog; if(!d||!d.chat) return;
  d.history.push({role:'user',content:q});
  d.thinking=true; renderDialog();
  try{
    const reply=await AI.chat([{role:'system',content:quillSystemPrompt()}, ...d.history]);
    d.history.push({role:'assistant',content:reply});
    d.lines.push(reply); d.idx=d.lines.length-1;
    remember('quill',q);
    logActivity('Asked Quill: "'+(q.length>60?q.slice(0,60)+'…':q)+'"');
  }catch(err){
    d.lines.push("Quill's connection flickers — the local AI didn't answer. (Check that Ollama is still running.)");
    d.idx=d.lines.length-1;
  }
  d.thinking=false; renderDialog();
}
document.getElementById('dialog').addEventListener('pointerdown',e=>{
  if(e.target.tagName==='INPUT'||e.target.id==='dSpeak') return; // let the chat field and speak button handle their own clicks
  e.preventDefault(); advanceDialog();
});
document.getElementById('dChatInput').addEventListener('keydown',e=>{
  if(e.key!=='Enter') return;
  e.preventDefault();
  const q=e.target.value.trim(); if(q) sendChatMessage(q);
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

/* ----- AI status + Connections panel ----- */
export async function refreshAIStatus(){
  await detectAI(data.aiConnections);
  document.getElementById('aiMode').textContent = isAIActive()
    ? '● Connected to '+AI.name+' — ask Quill anything in the Library'
    : '○ No local AI detected — Quill uses scripted dialog (see README for setup)';
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
function connCardHTML(c,i){
  return `<div class="card" style="cursor:default">
    <div class="t">${esc(c.name)} <span id="connStatus${i}">${statusBadge(c,null)}</span></div>
    <div class="s">${esc(c.kind)} · ${esc(c.baseUrl||'')}</div>
    <div class="row" style="margin-top:8px">
      <button class="btn ghost" onclick="toggleConnection(${i})">${c.enabled===false?'Enable':'Disable'}</button>
      ${c.builtin?'':`<button class="btn ghost" onclick="removeConnection(${i})">Remove</button>`}
    </div>
  </div>`;
}
function renderConnections(){
  const conns=data.aiConnections;
  document.getElementById('connPanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>AI Connections</h2>
    <div class="meta">Stored on this device only — nothing here is sent anywhere except each
      connection's own address. The first enabled connection below that answers is the one Quill uses.</div>
    <div id="connList">${conns.map((c,i)=>connCardHTML(c,i)).join('')}</div>
    <h3>Add a connection</h3>
    <div class="meta">"Base URL" is the address of the AI server — for Ollama that's usually
      <b>http://localhost:11434</b>. An API key is only needed for connections that require one.</div>
    <label>Name</label><input type="text" id="ncnName" placeholder="e.g. LM Studio, or a friend's server">
    <label>Kind</label>
    <select id="ncnKind" style="width:100%;background:#1b140d;border:2px solid #55432e;border-radius:7px;color:#f5e9d4;font-family:inherit;font-size:13.5px;padding:9px 11px">
      <option value="ollama">Ollama-style (native /api/chat)</option>
      <option value="openai-compatible">OpenAI-compatible (/chat/completions)</option>
    </select>
    <label>Base URL</label><input type="text" id="ncnUrl" placeholder="http://localhost:11434">
    <label>API key (optional)</label><input type="text" id="ncnKey" placeholder="leave blank if not needed">
    <div class="row" style="margin-top:14px">
      <button class="btn" onclick="addConnection()">Add connection</button>
      <button class="btn ghost" onclick="recheckConnections()">Recheck all</button>
    </div>`;
  conns.forEach((c,i)=>{
    if(c.enabled===false) return;
    providerFor(c).isAvailable().then(ok=>{
      const row=document.getElementById('connStatus'+i);
      if(row) row.outerHTML=`<span id="connStatus${i}">${statusBadge(c,ok)}</span>`;
    });
  });
}
export function addConnection(){
  const name=document.getElementById('ncnName').value.trim()||'Custom connection';
  const kind=document.getElementById('ncnKind').value;
  const baseUrl=document.getElementById('ncnUrl').value.trim();
  const apiKey=document.getElementById('ncnKey').value.trim();
  if(!baseUrl) return;
  data.aiConnections.push({ id:'conn-'+Date.now(), name, kind, baseUrl, apiKey, enabled:true, builtin:false });
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
export function recheckConnections(){ renderConnections(); refreshAIStatus(); }

/* ================================================================
   [UI] overlays — shelf browser, reader, planner, courses
   ================================================================ */
function showOv(id){ document.getElementById(id).classList.add('open'); }
function hideAllOv(){ ['shelfOv','readerOv','planOv','courseOv','connOv','archiveOv','menuOv','pastDayOv','waypointsOv','activityOv','badgesOv','indexOv'].forEach(i=>document.getElementById(i).classList.remove('open')); }
export function closeUI(){ state.ui=null; hideAllOv(); stopTyping(); stopSpeaking(); persist(); }

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
      <button class="btn ghost" onclick="openConnections()" style="margin-bottom:9px">⚙ Manage AI connections</button>
      <button class="btn ghost" onclick="openWaypoints()" style="margin-bottom:9px">🔗 Waypoints</button>
      <button class="btn ghost" onclick="openActivity()" style="margin-bottom:9px">📜 Activity Log</button>
      <button class="btn ghost" onclick="openBadges()" style="margin-bottom:9px">🏅 Badges</button>
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
  // four shelf blocks → four lineages
  return (y<=4) ? (x<8?'Theravada':'Mahayana') : (x<8?'Daoism':'Practice');
}
const SHELF_HUE={ Theravada:36, Mahayana:275, Daoism:112, Practice:200 };
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
          <span class="spineTitle">${esc(d.title)}</span>
        </div>`).join('')}
    </div>
    <div class="bookLabel">
      <div class="blTitle">${esc(sel.title)}
        ${data.read[sel.slug]?'<span class="badge">read ✓</span>':''}
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
  state.ui='reader'; state.currentDoc=slug; hideAllOv();
  document.getElementById('rdTitle').textContent=d.title;
  document.getElementById('rdMeta').innerHTML =
    `<b>${esc(d.tradition)}</b> · License: <b>${esc(d.license)}</b> · Source: <b>${esc(d.attribution||'')}</b><br>${esc(d.source_url)}`;
  document.getElementById('rdBody').innerHTML =
    `<p class="rdSummary">${esc(d.doc.summary)}</p>` +
    d.doc.sections.map(s=>`<h3>${esc(s.heading)}</h3><p>${esc(s.body)}</p>`).join('');
  document.getElementById('rdMark').textContent = data.read[slug] ? 'Read ✓' : 'Mark as read';
  document.getElementById('rdSpokenNote').textContent='';
  updateReaderSpeakBtns();
  const panel=document.querySelector('#readerOv .panel');
  panel.classList.remove('bookPanel'); void panel.offsetWidth; panel.classList.add('bookPanel');
  showOv('readerOv');
  awardBadge('first-page');
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
  const lib = SEED_LIBRARY.map(d=>({kind:'library', slug:d.slug, title:d.title, category:d.category, sub:d.tradition}));
  const arc = data.workshop.docs.map(d=>({kind:'archive', slug:d.slug, title:d.title, category:d.category||'personal', sub:d.license||''}));
  return [...lib, ...arc];
}
export function setIndexCategory(id){ state.indexCategory=id; renderIndex(); }
export function openIndexItem(kind,slug){
  if(kind==='library') openReader(slug); else openArchiveDoc(slug);
}
function renderIndex(){
  const items=indexItems();
  const cat=state.indexCategory;
  const counts={}; items.forEach(i=>{ counts[i.category]=(counts[i.category]||0)+1; });
  const shown=items.filter(i=>i.category===cat);
  document.getElementById('indexPanel').innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>The Index</h2>
    <div class="meta">Every text in one place, sorted by kind rather than lineage — the Library's
      shelves and your own Archive Desk together. Categories with nothing in them yet are still
      shown; the shape's there before the content is.</div>
    <div class="row" style="margin-bottom:12px">
      ${CATEGORIES.map(c=>`<button class="btn ${c.id===cat?'':'ghost'}" style="font-size:11.5px;padding:6px 12px"
        onclick="setIndexCategory('${c.id}')">${esc(c.label)} <span class="badge">${counts[c.id]||0}</span></button>`).join('')}
    </div>
    ${shown.length ? shown.map(i=>`
      <div class="card" onclick="openIndexItem('${i.kind}','${i.slug}')">
        <div class="t">${i.kind==='library'?'📖':'📔'} ${esc(i.title)}</div>
        <div class="s">${esc(i.sub||'')}</div>
      </div>`).join('') : '<p>Nothing here yet.</p>'}`;
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
  if(!data.planner[k]) data.planner[k]={ intention:'', ember:'', blocks:DEFAULT_BLOCKS.map(n=>({name:n,state:'waiting'})) };
  return data.planner[k];
}
export function openPlanner(){
  state.ui='planner'; hideAllOv();
  const day=plannerDay();
  document.getElementById('planDate').textContent = new Date().toDateString() + ' · a day is a small, complete thing';
  document.getElementById('planIntent').value = day.intention;
  document.getElementById('planEmber').value = day.ember;
  renderBlocks();
  document.getElementById('planSaved').textContent='';
  renderPastDays();
  showOv('planOv');
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
          <div class="s">${esc(c.why||'')}</div>
          <div class="prog"><div style="width:${pct}%"></div></div>
        </div>`;
      }).join('') || '<p>The board is bare. Pin your first path.</p>'}
      <div class="row" style="margin-top:14px"><button class="btn" onclick="newCourseForm()">+ Pin a new course</button></div>`;
  }
  else if(v.mode==='new'){
    el.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>Pin a New Course</h2>
      <div class="meta">One line per step. Add a practice after a |, and an optional link after a
        second | for anything the step points outward to:<br>
        <b>Read the Inner Chapters | one chapter each morning</b><br>
        <b>Learn indexing | read it front to back | https://use-the-index-luke.com/</b></div>
      <label>Course title</label>
      <input type="text" id="ncTitle" placeholder="e.g. Four Weeks with the Breath">
      <label>Why this path (optional)</label>
      <input type="text" id="ncWhy" placeholder="What is this course for?">
      <label>Steps — one per line</label>
      <textarea id="ncSteps" rows="7" placeholder="Sit ten minutes daily | breath counting
Read Anapanasati overview
Extend to fifteen minutes | note what changes
Write a logbook entry in the desk"></textarea>
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
      <div class="meta">${esc(c.why||'')} · begun ${esc(c.begun)}</div>
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
      <div class="row" style="margin-top:14px">
        <button class="btn ghost" onclick="backToList()">← All courses</button>
        <button class="btn ghost" onclick="removeCourse(${c.id})">Take down</button>
      </div>`;
  }
}
function backToList(){ state.courseView={mode:'list'}; renderCourses(); }
export function openCourse(id){ state.courseView={mode:'detail',id}; renderCourses(); }
export function newCourseForm(){ state.courseView={mode:'new'}; renderCourses(); }
export function createCourse(){
  const title=document.getElementById('ncTitle').value.trim();
  const why=document.getElementById('ncWhy').value.trim();
  const steps=document.getElementById('ncSteps').value.split('\n').map(l=>l.trim()).filter(Boolean)
    .map(l=>{ const [t,p,u]=l.split('|').map(s=>s.trim()); return {title:t,practice:p||'',url:safeUrl(u),done:false}; });
  if(!title||!steps.length) return;
  data.courses.unshift({ id:Date.now(), title, why, steps, begun:todayKey() });
  persist(); logActivity('Pinned a new course: "'+title+'".'); awardBadge('first-course'); blip(784,.09);
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
  closeUI, openReader, markRead, backToShelf,
  selectBook, shelfOpenSelected,
  cycleBlock, savePlanner, viewPastDay, backToPlanner,
  newCourseForm, createCourse, openCourse, toggleStep, removeCourse, backToList,
  addConnection, toggleConnection, removeConnection, recheckConnections,
  newArchiveForm, createArchiveDoc, backToArchiveList, openArchiveDoc, deleteArchiveDoc, skipTyping,
  newBulkForm, runBulkImport, generateQuillReport,
  openConnections, returnToTitle, resetSave,
  openWaypoints, addWaypoint, removeWaypoint, exportSave, triggerImportSave,
  toggleDialogSpeak, toggleReadAloud, toggleSpokenSummary, openActivity,
  openBadges, openIndex, setIndexCategory, openIndexItem,
});
