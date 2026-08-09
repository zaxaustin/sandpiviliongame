/* ================================================================
   [AI PROVIDER] — the seam local AI plugs into, same shape as Store:
   a small swappable adapter, with a permanent no-AI fallback so the
   game never depends on one being present.

   Connections are user-managed (see data.aiConnections in
   entities.js / the Connections panel in ui/overlays.js) and tried
   in order; the first one that answers isAvailable() wins.
   ================================================================ */

export const NoProvider = {
  name: 'None (scripted dialog only)',
  async isAvailable(){ return false; },
  async chat(){ throw new Error('No AI provider is available.'); },
};

// LOCAL-AI-MONITORING-PLAN.md step 2 — wraps any provider's chat() with
// elapsed-time tracking, the same side-channel pattern lastThinking
// already uses, applied once here instead of touching all three
// providers' own chat() bodies individually.
function withTiming(p){
  const rawChat = p.chat;
  p.lastElapsedMs = null;
  p.chat = async function(messages, opts){
    const t0 = Date.now();
    try{ return await rawChat(messages, opts); }
    finally{ p.lastElapsedMs = Date.now() - t0; }
  };
  return p;
}

function withTimeout(signalMs){
  const ctrl = new AbortController();
  const timer = setTimeout(()=>ctrl.abort(), signalMs);
  return { signal: ctrl.signal, done: ()=>clearTimeout(timer) };
}

/* Inside the desktop app, a plain fetch() from this (renderer) context
   still hits the exact same CORS wall an ordinary browser tab does —
   contextIsolation keeps the renderer a real Chromium context. When
   electron/preload.cjs has exposed window.desktopBridge, route the
   request through the main process instead: a Node-side request that
   was never subject to CORS in the first place (see DESKTOP-APP-PLAN.md).
   Falls back to a plain fetch when not running inside the desktop app,
   so nothing here changes for the ordinary browser build. */
async function localFetch(url, { method='GET', headers, body, signalMs }={}){
  if(typeof window !== 'undefined' && window.desktopBridge){
    const r = await window.desktopBridge.fetchJSON(url, { method, headers, body, signalMs });
    return {
      ok: r.ok, status: r.status,
      json: async()=>{ if(r.json===null) throw new Error('Response was not JSON'); return r.json; },
      text: async()=>r.text,
    };
  }
  const t = withTimeout(signalMs || 30000);
  try{ return await fetch(url, { method, headers, body, signal:t.signal }); }
  finally{ t.done(); }
}

/* Live token streaming for Ollama (/api/chat with stream:true → NDJSON: one
   JSON object per line, each carrying a delta of message.content and, when a
   thinking model is asked to reason, message.thinking). We accumulate both
   and call onStream({content,thinking}) as they grow, so the reply can be
   watched live instead of only after the fact.

   ⚠ THE `thinking` HALF IS PLUMBED AND NEVER FED — measured 2026-08-10. This
   comment used to promise "the Monk's reasoning can be watched live", and the
   whole road for it exists: this accumulator, p.lastThinking, and the
   `💭 thought for a moment` panel in renderChatView(). But `think` defaults to
   false in chat() below and **nothing in src/, tools/, electron/ or test/ ever
   sets think:true**. The only caller that ever did was the Monk's tier in
   chatOptsFor(), retired 2026-08-07 — so this went with it, unnoticed, the
   same way the local-only rule did.

   Kept exactly as it is, deliberately: the code is correct and complete, and
   turning it back on is one option object, not a rebuild. Registered in
   docs/DOCS-DRIFT.md so it is a decision rather than a ruin.
   Two transports: an ordinary browser reads the fetch body stream directly;
   the desktop app's bridge buffers by default, so it uses a dedicated
   streaming channel when preload exposes one, and otherwise throws so the
   caller falls back to the plain buffered request. */
function parseOllamaStreamLines(buf, acc, onStream){
  let nl;
  while((nl=buf.indexOf('\n'))>=0){
    const line=buf.slice(0,nl).trim(); buf=buf.slice(nl+1);
    if(!line) continue;
    let obj; try{ obj=JSON.parse(line); }catch(e){ continue; } // ignore a partial/garbled line
    const m=obj.message;
    if(m){
      if(m.content) acc.content+=m.content;
      if(m.thinking) acc.thinking+=m.thinking;
      onStream({ content:acc.content.trim(), thinking:acc.thinking.trim() });
    }
  }
  return buf; // hand back the leftover partial line
}
async function ollamaStreamChat(chatUrl, payload, timeoutMs, onStream){
  const acc={ content:'', thinking:'' };
  // Desktop app: the ordinary bridge buffers the whole response, which would
  // defeat streaming — use its streaming channel if present, else throw.
  if(typeof window!=='undefined' && window.desktopBridge){
    if(typeof window.desktopBridge.fetchStream!=='function') throw new Error('desktop stream bridge unavailable');
    let buf='';
    const r = await window.desktopBridge.fetchStream(chatUrl,
      { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(payload), signalMs:timeoutMs },
      (msg)=>{ if(msg && msg.chunk){ buf=parseOllamaStreamLines(buf+msg.chunk, acc, onStream); } });
    if(r && r.ok===false) throw new Error('desktop stream failed: '+(r.status||0));
    return { content:acc.content.trim(), thinking:acc.thinking.trim() };
  }
  // Ordinary browser: read the fetch body stream line by line.
  const t=withTimeout(timeoutMs);
  try{
    const res=await fetch(chatUrl, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(payload), signal:t.signal });
    if(!res.ok || !res.body) throw new Error('Ollama stream failed: '+res.status);
    const reader=res.body.getReader(), decoder=new TextDecoder();
    let buf='';
    for(;;){
      const { done, value }=await reader.read();
      if(done) break;
      buf=parseOllamaStreamLines(buf+decoder.decode(value,{stream:true}), acc, onStream);
    }
    return { content:acc.content.trim(), thinking:acc.thinking.trim() };
  } finally { t.done(); }
}

// NPC chat and quick assistant replies stay short-ish — fast, cheap, and
// resistant to a "thinking" model burning its whole budget on invisible
// reasoning before it starts answering (see below). Drafted documents
// (a grant section, a full course/lesson plan) need real room to
// actually finish a thought — callers pass {long:true} for those.
// 'deep' is bigger still, reserved for the Mountain Monk specifically —
// see bestLocalModel() below: a standing decision that the Monk always
// gets the best available model and real room to actually think,
// regardless of what's fastest for everything else.
const REPLY_TOKENS = { short:450, long:1600, deep:3000 };

/* ================================================================
   THE CONTEXT WINDOW, SET EXPLICITLY — and the reason, measured on
   this machine 2026-08-03, because it is the most expensive silent
   bug this project has had.

   OLLAMA RUNS EVERY MODEL AT num_ctx 4096 UNLESS YOU TELL IT
   OTHERWISE. Not the model's own limit — `ollama ps` on this machine
   reported context_length 4096 for llama3.2, whose real window is
   131k, and ornith:9b's is 262k. We were sending num_predict and
   never num_ctx, so we got 4096 every time.

   What that actually costs, measured, not reasoned about:

     prompt sent 7,279 tokens -> Ollama evaluated 2,050
     the model answered "I am Llama, a large language model by Meta AI"
     ...having been told, in the first line it never saw, that it was
     the Investigator.

   With num_ctx 16384 the same request kept every token and the role
   held perfectly. So THE RESIDENT'S IDENTITY WAS BEING DELETED BEFORE
   THE MODEL SAW IT, silently, whenever a conversation or a grounded
   task got big — which is every Investigator call over a paper, every
   Monk conversation with real history, every dissection lens. The
   visitor's report was "I'm worried these different roles will confuse
   the AI instead of it acting out its role." Exactly right, and the
   cause was never the number of roles.

   Silent truncation is the house failure mode wearing a new coat: the
   reply still arrives, still reads fluently, and is simply not the
   resident you were talking to.

   SIZED TO THE REQUEST, not fixed. A bigger window costs KV-cache
   memory (and this machine's real constraint is cooling, so nothing
   here is set larger than the request actually needs). Powers of two
   from 4096 up to a cap, so short chats stay cheap and a paper gets
   the room it needs.
   ================================================================ */
const CTX_FLOOR = 4096;      // never ask for less than Ollama's own default
const CTX_CAP   = 32768;     // affordable for a 9B on 16 GB; a paper fits many times over
const CTX_MARGIN = 256;      // chat-template scaffolding we do not see
/* ~3.4 chars per token is a fair estimate for English prose and errs LARGE
   on code and CJK. Erring large is the right direction: over-estimating buys
   a bigger window, under-estimating silently deletes the system prompt. */
export function estimateTokens(messages){
  const chars = (messages||[]).reduce((n,m)=>n+String((m&&m.content)||'').length, 0);
  return Math.ceil(chars/3.4);
}
export function contextFor(messages, replyTokens){
  const need = estimateTokens(messages) + (replyTokens||0) + CTX_MARGIN;
  let n = CTX_FLOOR;
  while(n < need && n < CTX_CAP) n *= 2;
  return Math.min(n, CTX_CAP);
}
// Deliberately generous (bumped 2026-07-12 at the user's ask: "don't cut a
// convo in the middle"). A local model on modest hardware — or one streaming a
// long, thoughtful reply — can legitimately take a while, and the pocket/phone
// already lets you walk away while it works, so a longer wall is nearly free
// and far kinder than clipping a reply mid-thought. 'deep' is the widest tier
// and is currently unused: it was the Monk's, until his special treatment was
// retired 2026-08-07. Kept because the tier is a transport concern and outlives
// whichever resident happens to want it — chatOptsFor() is where that is said.
const REPLY_TIMEOUT = { short:90000, long:240000, deep:360000 };

// Picks the largest-parameter model actually installed, reading the
// "Nb" size Ollama tags conventionally end with (qwen3.5:9b,
// deepseek-r1:8b, llama3.2:3b) — never guessed, only ever the models
// isAvailable() already confirmed are real. Falls back to whatever the
// connection auto-picked if nothing parses, so this never breaks a
// connection, just fails to improve on it.
/* A MODEL OLLAMA LISTS IS NOT NECESSARILY A MODEL OLLAMA RUNS HERE.

   Ollama serves hosted models through the same local endpoint and lists
   them in /api/tags beside the real ones. Using one sends the
   conversation to Ollama's servers — which is fine if you chose it, and a
   straightforward lie if the title screen says "running on this device
   alone" while it happens.

   This was already guarded, with `name.endsWith(':cloud')`, and the guard
   had gone stale: the free-tier models are named `gpt-oss:20b-cloud`, so
   the hyphen form slipped straight through as local. Measured 2026-08-03
   on this machine — `bestLocalModel()` returned `gpt-oss:20b-cloud`,
   meaning THE MONK'S standing "largest local model" rule would have sent
   his conversations to a server, silently.

   So: two independent signals, because a naming convention is exactly the
   sort of thing that changes again.
     · the NAME — `:cloud` or `-cloud`, the tags Ollama actually uses;
     · the SIZE — a hosted entry is a bare manifest (306 and 344 bytes on
       this machine) where any real local model is hundreds of megabytes.
   Either one is enough to disqualify it. */
export function isCloudModel(nameOrEntry){
  const e = (nameOrEntry && typeof nameOrEntry === 'object') ? nameOrEntry : { name: nameOrEntry };
  if (/[:\-]cloud\b/i.test(String(e.name || ''))) return true;
  return typeof e.size === 'number' && e.size >= 0 && e.size < 1e6;
}
/* THE LARGEST MODEL THAT ACTUALLY RUNS ON THIS COMPUTER. Cloud entries are
   excluded here as well as at detection — this is the one call that decides
   where the Monk's most private conversations go, and it should not depend
   on someone else having filtered the list first. */
export function bestLocalModel(availableModels, fallback){
  let best=fallback, bestSize=-1;
  for(const m of (availableModels||[])){
    if(isCloudModel(m)) continue;
    const match=String(m).match(/(\d+(?:\.\d+)?)\s*b\b/i);
    if(!match) continue;
    const size=parseFloat(match[1]);
    if(size>bestSize){ bestSize=size; best=m; }
  }
  return isCloudModel(best) ? (fallback && !isCloudModel(fallback) ? fallback : null) : best;
}

/* WHAT A NAMED RESIDENT IS ANSWERED WITH — one place, reachable by everyone.

   Right now the answer is THE SAME FOR ALL OF THEM, and that is a decision
   rather than an absence, which is why this function still exists.

   THE MONK'S SPECIAL TREATMENT WAS RETIRED 2026-08-07, at the steward's word:

     "lets not treat the monk differently for now hav him focus on guidens"

   That reverses a standing decision, so the reversal is on the record and can
   be judged. Until today the Monk always got the largest LOCAL model plus a
   deep token/timeout tier — real room to think — on the reasoning that he
   handles the most private conversations and the one question the others hand
   over. What changed is the emphasis: his job is GUIDANCE, and guidance is
   carried by who he is and what he is grounded in, not by how many tokens he
   is allowed to spend thinking. A bigger model does not make better counsel;
   it makes slower counsel, on a machine whose cooling is already the limit.

   ⚠ WHAT THIS COMMENT CLAIMED, AND WHAT IS ACTUALLY TRUE — corrected
   2026-08-10, and the correction is the more useful half.

   It said: "What did NOT change, and must not be quietly lost with it: the
   Monk is still LOCAL-ONLY by the cloud guard in the transport layer, because
   the privacy reason was never the same as the depth reason."

   IT WAS LOST WITH IT. The warning was right and the reassurance was wrong, in
   the same breath, and CLAUDE.md and PROTOCOLS.md both repeated the
   reassurance for three days. Measured:

     · this function returns {} for EVERY agent, so it decides nothing;
     · detectAI() picks the first enabled connection that answers and assigns
       it to every resident — there is NO per-resident routing in src/;
     · the only cloud-related guard is isCloudModel(), which keeps Ollama's
       HOSTED models out of bestLocalModel(). That is a different question,
       and bestLocalModel() no longer feeds any routing decision at all.

   So: configure a cloud provider and the Monk speaks through it.

   AND THAT IS NOW THE DECISION, made the same day it was found:

     "the monk can be cloud if there computer cant run local ai alot of people
      have laptops just let the user know."

   A laptop that cannot comfortably run a local model must not mean no Mountain
   Monk — guidance you can reach beats a principle that locks you out of the
   room. So returning {} for every agent is CORRECT here, not a silent loss, and
   the honesty is carried by labelling instead: isLocalConn() above is the one
   definition, detectAI() stamps AI.local, and the CHAT HEADER says 🏠/☁ with
   what it means. Standing rule: no surface that sends words to a model may omit
   that label.

   THIS IS STILL THE SEAM if per-resident routing is ever wanted, and npm test
   still enforces that every AI.chat caller in ui/ can reach it.

   STILL OPEN, and tracked in docs/DOCS-DRIFT.md: think:true. The plumbing is
   complete and nothing turns it on. Decide it; do not let it drift again.

   MOVED HERE FROM ui/overlays.js the same day, where it was private. Three
   call sites remembered to pass it and ui/lesson-tree.js COULD NOT reach it
   at all. A rule enforced by "three files remember" is not enforced — which
   is precisely why it now has a guard, whatever the rule happens to say. */
export function chatOptsFor(agentKey){
  return {};
}

// The two "nothing came back" sentinels below — exported so a caller can
// notice a soft failure and retry with more room instead of just showing
// a visitor a dead end.
export const EMPTY_REPLY_TEXT = {
  ollama: '…the thought slips away before it can be spoken.',
  openai: '…the connection answers, but says nothing.',
};
export function isEmptyReply(text){
  return text===EMPTY_REPLY_TEXT.ollama || text===EMPTY_REPLY_TEXT.openai;
}

/* Ollama's native API — http://localhost:11434 by default. Some models
   (marked "thinking" models, e.g. qwen3.5, deepseek-r1, qwq) spend their
   whole reply budget on invisible reasoning and can return *empty*
   content if that budget runs out before they start actually answering
   — found this the hard way testing qwen3.5:9b (3m26s, empty reply).
   think:false and a capped num_predict keep short replies both fast and
   non-empty; long-form drafts get a much bigger cap and more time instead. */
export function makeOllamaProvider(baseUrl, name, preferredModel){
  const url = (baseUrl || 'http://localhost:11434').replace(/\/$/,'');
  const p = {
    name: name || 'Ollama', model: null, availableModels: [], cloudModels: [],
    // Ollama can stream tokens live; chat() below uses it when a caller passes
    // opts.onStream (see sendChatMessage). The cloud providers here don't set
    // this, so live streaming stays scoped to local models — which is exactly
    // where it matters most (the Monk's reasoning, and long local waits).
    supportsStream: true,
    // set by chat() whenever think:true gets real reasoning content back
    // (currently only the Monk asks for it) — a side channel rather than
    // changing chat()'s string-in-string-out contract, safe only because
    // this game has at most one chat in flight at a time.
    lastThinking: null,
    async isAvailable(){
      try{
        const res = await localFetch(url+'/api/tags', { signalMs:1200 });
        if(!res.ok) return false;
        const body = await res.json();
        // Hosted models show up in /api/tags exactly like local ones and
        // proxy to Ollama's servers — never auto-pick one for a resident.
        // Filtered on the FULL entry (name and size), not the name alone;
        // see isCloudModel above for why the name is not enough.
        const entries = (body.models||[]);
        p.cloudModels = entries.filter(isCloudModel).map(m=>m.name);
        const local = entries.filter(m=>!isCloudModel(m)).map(m=>m.name);
        p.availableModels = local;      // what may ever be auto-picked
        /* A HOSTED MODEL IS OFFERED, NEVER TAKEN. It is excluded from every
           automatic choice above — but if the visitor deliberately selected
           one it is theirs, and refusing to honour that would leave a laptop
           with no local model unable to use the Pavilion at all. Chosen, it
           works; unchosen, it does not exist. */
        const chosenCloud = preferredModel && p.cloudModels.includes(preferredModel);
        if(!local.length && !chosenCloud) return false;
        // an explicit model wins if it's actually installed; otherwise
        // fall back to auto-pick so a stale/misspelled choice never just
        // breaks the connection silently.
        p.model = (preferredModel && (local.includes(preferredModel) || chosenCloud))
          ? preferredModel
          : local.find(m=>m.startsWith('llama3.2')) || local[0];
        /* THE NAME MUST NOT LIE. The built-in connection is called "Ollama
           (local)", so choosing a hosted model produced the status line
           "Connected to Ollama (local) · gpt-oss:20b-cloud" — precisely the
           claim this whole guard exists to prevent, printed on the title
           screen. Seen 2026-08-03 in the output of the picker test. */
        p.usingCloud = !!chosenCloud;
        p.name = (chosenCloud
          ? (name || 'Ollama').replace(/\s*\(local\)\s*/i, '') + ' ☁ hosted'
          : (name || 'Ollama')) + ' · ' + p.model;
        return true;
      } catch(e){ return false; } // not running, wrong port, or OLLAMA_ORIGINS doesn't allow this page
    },
    // LOCAL-AI-MONITORING-PLAN.md step 1 — Ollama's own /api/ps, same
    // localFetch() pattern as /api/tags above, zero new dependency. Only
    // Ollama providers have this method at all (duck-typed by callers);
    // an OpenAI-compatible or Anthropic connection has no equivalent, so
    // there's nothing dishonest to fake here.
    async listLoaded(){
      try{
        const res = await localFetch(url+'/api/ps', { signalMs:1500 });
        if(!res.ok) return [];
        const body = await res.json();
        return (body.models||[]).map(m=>({
          name: m.name, size: m.size||0, sizeVram: m.size_vram||0, expiresAt: m.expires_at||null,
        }));
      } catch(e){ return []; }
    },
    async chat(messages, opts){
      const size = (opts && opts.deep) ? 'deep' : (opts && opts.long) ? 'long' : 'short';
      const model = (opts && opts.model) || p.model;
      const think = (opts && typeof opts.think==='boolean') ? opts.think : false;
      const onStream = (opts && typeof opts.onStream==='function') ? opts.onStream : null;
      /* num_ctx is set on EVERY request, never left to the default — see the
         block above REPLY_TOKENS. Without it the front of the system prompt is
         thrown away without a word and the resident stops being the resident. */
      const payload = { model, messages, think, options:{
        num_predict: REPLY_TOKENS[size],
        num_ctx: contextFor(messages, REPLY_TOKENS[size]),
      } };
      // Live streaming when a caller actually wants it — the reply, and the
      // Monk's reasoning, reveal as they generate. Any failure here (an older
      // desktop bridge, a proxy that won't stream) falls through to the plain
      // buffered request below, so nothing ever regresses to a dead end.
      if(onStream){
        try{
          const s = await ollamaStreamChat(url+'/api/chat', { ...payload, stream:true }, REPLY_TIMEOUT[size], onStream);
          p.lastThinking = s.thinking || null;
          return s.content || EMPTY_REPLY_TEXT.ollama;
        }catch(e){ /* fall through to the buffered request */ }
      }
      // local models vary wildly in speed; don't hang forever
      const res = await localFetch(url+'/api/chat', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ ...payload, stream:false }),
        signalMs: REPLY_TIMEOUT[size],
      });
      if(!res.ok) throw new Error('Ollama request failed: '+res.status);
      const body = await res.json();
      p.lastThinking = (body.message?.thinking||'').trim() || null;
      return (body.message?.content||'').trim() || EMPTY_REPLY_TEXT.ollama;
    },
  };
  return withTiming(p);
}

/* Generic OpenAI-compatible endpoint — covers LM Studio, most self-hosted
   proxies, and any cloud provider exposing the same /chat/completions
   shape, including OpenAI's own API and xAI's (Grok is documented as
   OpenAI-schema-compatible) — just point baseUrl at the real API and
   supply a real API key. apiKey is optional (many local servers don't
   need one). A cloud call here leaves this device — see the Connections
   panel's own labeling, this file doesn't judge that, just does it. */
export function makeOpenAICompatProvider(baseUrl, apiKey, name, model){
  const url = (baseUrl||'').replace(/\/$/,'');
  const headers = { 'Content-Type':'application/json', ...(apiKey ? { Authorization:'Bearer '+apiKey } : {}) };
  const p = {
    name: name || 'Custom connection', model: model||'default', availableModels: [],
    async isAvailable(){
      if(!url) return false;
      try{
        const t = withTimeout(1500);
        const res = await fetch(url+'/models', { headers, signal:t.signal });
        t.done();
        if(!res.ok) return false;
        try{
          const body = await res.json();
          const ids = (body.data||[]).map(m=>m.id).filter(Boolean);
          if(ids.length) p.availableModels = ids;
        }catch(e){ /* some servers don't return a body shape worth parsing — still reachable */ }
        return true;
      } catch(e){ return false; }
    },
    async chat(messages, opts){
      const size = (opts && opts.deep) ? 'deep' : (opts && opts.long) ? 'long' : 'short';
      const model = (opts && opts.model) || p.model;
      const t = withTimeout(REPLY_TIMEOUT[size]);
      try{
        const res = await fetch(url+'/chat/completions', {
          method:'POST', headers,
          body: JSON.stringify({ model, messages, max_tokens:REPLY_TOKENS[size] }),
          signal:t.signal,
        });
        if(!res.ok) throw new Error('Request failed: '+res.status);
        const body = await res.json();
        return (body.choices?.[0]?.message?.content||'').trim() || EMPTY_REPLY_TEXT.openai;
      } finally { t.done(); }
    },
  };
  return withTiming(p);
}

/* Anthropic's Messages API — a genuinely different shape from the
   OpenAI-style providers above: system prompt is its own top-level field
   (not a role:'system' message), auth is x-api-key + anthropic-version
   rather than a Bearer token, and a reply's content is an array of
   blocks, not a single string. anthropic-dangerous-direct-browser-access
   is Anthropic's own documented opt-in for exactly this shape of tool —
   a personal client calling the API directly from a browser with the
   visitor's own key, never sent anywhere but api.anthropic.com. */
const ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-5';
export function makeAnthropicProvider(baseUrl, apiKey, name, model){
  const url = (baseUrl||'https://api.anthropic.com/v1').replace(/\/$/,'');
  const headers = {
    'Content-Type':'application/json', 'x-api-key':apiKey||'',
    'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true',
  };
  const p = {
    name: name || 'Claude', model: model||ANTHROPIC_DEFAULT_MODEL, availableModels: [],
    async isAvailable(){
      if(!apiKey) return false;
      try{
        const t = withTimeout(1500);
        const res = await fetch(url+'/models', { headers, signal:t.signal });
        t.done();
        if(!res.ok) return false;
        try{
          const body = await res.json();
          const ids = (body.data||[]).map(m=>m.id).filter(Boolean);
          if(ids.length) p.availableModels = ids;
        }catch(e){ /* reachable either way */ }
        return true;
      } catch(e){ return false; }
    },
    async chat(messages, opts){
      const size = (opts && opts.deep) ? 'deep' : (opts && opts.long) ? 'long' : 'short';
      const model = (opts && opts.model) || p.model;
      const t = withTimeout(REPLY_TIMEOUT[size]);
      try{
        const system = messages.find(m=>m.role==='system')?.content;
        const turns = messages.filter(m=>m.role!=='system');
        const res = await fetch(url+'/messages', {
          method:'POST', headers,
          body: JSON.stringify({ model, system, messages:turns, max_tokens:REPLY_TOKENS[size] }),
          signal:t.signal,
        });
        if(!res.ok) throw new Error('Request failed: '+res.status);
        const body = await res.json();
        const text = (body.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('').trim();
        return text || EMPTY_REPLY_TEXT.openai;
      } finally { t.done(); }
    },
  };
  return withTiming(p);
}

export function providerFor(conn){
  if(conn.kind==='ollama') return makeOllamaProvider(conn.baseUrl, conn.name, conn.model);
  if(conn.kind==='openai-compatible') return makeOpenAICompatProvider(conn.baseUrl, conn.apiKey, conn.name, conn.model);
  if(conn.kind==='anthropic') return makeAnthropicProvider(conn.baseUrl, conn.apiKey, conn.name, conn.model);
  return NoProvider;
}

/* IS THIS CONNECTION ON THIS MACHINE? Moved here from ui/overlays.js on
   2026-08-10, where it was private to the Connections panel — so the panel
   could badge 🏠/☁ and the CHAT HEADER, the place a person is actually
   speaking, could not.

   That gap became load-bearing the same day, when the steward settled the
   Monk's provider question:

     "the monk can be cloud if there computer cant run local ai alot of people
      have laptops just let the user know."

   Every resident uses the one detected connection, the Monk included. That is
   a deliberate choice now rather than an accident — a laptop that cannot run a
   local model should not mean no Mountain Monk. But it is only an honest
   choice if the visitor can SEE where their words are going, in the room where
   they are saying them. Hence one definition, two consumers.

   An Ollama connection counts as local by its kind: it is a server on this
   machine. The exception — Ollama's HOSTED models, served through the same
   local endpoint — is a different question and has its own guard,
   isCloudModel(), which the model picker already warns with. Do not conflate
   them here; a connection's locality and a model's locality are two facts. */
export function isLocalConn(conn){
  if(!conn) return false;
  if(conn.kind === 'ollama') return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)([:/]|$)/i.test(conn.baseUrl || '');
}

export let AI = NoProvider;
export function isAIActive(){ return AI !== NoProvider; }

/* Tries each enabled connection in order; the first reachable one wins.
   Called on load, and again any time the Connections panel changes something. */
export async function detectAI(connections){
  for(const conn of (connections||[]).filter(c=>c.enabled!==false)){
    const provider = providerFor(conn);
    /* Stamped on the provider so any surface can say 🏠 or ☁ without having to
       find the connection again. THIS connection is what every resident uses —
       see isLocalConn above for why that has to be visible while you talk. */
    provider.local = isLocalConn(conn);
    if(await provider.isAvailable()){ AI = provider; return AI; }
  }
  AI = NoProvider;
  return AI;
}
