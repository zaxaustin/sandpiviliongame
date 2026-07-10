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
const REPLY_TIMEOUT = { short:45000, long:120000, deep:180000 };

// Picks the largest-parameter model actually installed, reading the
// "Nb" size Ollama tags conventionally end with (qwen3.5:9b,
// deepseek-r1:8b, llama3.2:3b) — never guessed, only ever the models
// isAvailable() already confirmed are real. Falls back to whatever the
// connection auto-picked if nothing parses, so this never breaks a
// connection, just fails to improve on it.
export function bestLocalModel(availableModels, fallback){
  let best=fallback, bestSize=-1;
  for(const m of (availableModels||[])){
    const match=m.match(/(\d+(?:\.\d+)?)\s*b\b/i);
    if(!match) continue;
    const size=parseFloat(match[1]);
    if(size>bestSize){ bestSize=size; best=m; }
  }
  return best;
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
    name: name || 'Ollama', model: null, availableModels: [],
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
        const models = (body.models||[]).map(m=>m.name);
        // ":cloud" models show up in /api/tags like any local one, but they
        // proxy to Ollama's hosted service and 403 on /api/chat without a
        // paid subscription — never auto-pick one of those for a resident.
        const local = models.filter(m=>!m.endsWith(':cloud'));
        if(!local.length) return false;
        p.availableModels = local;
        // an explicit model wins if it's actually installed; otherwise
        // fall back to auto-pick so a stale/misspelled choice never just
        // breaks the connection silently.
        p.model = (preferredModel && local.includes(preferredModel))
          ? preferredModel
          : local.find(m=>m.startsWith('llama3.2')) || local[0];
        p.name = (name || 'Ollama') + ' · ' + p.model;
        return true;
      } catch(e){ return false; } // not running, wrong port, or OLLAMA_ORIGINS doesn't allow this page
    },
    async chat(messages, opts){
      const size = (opts && opts.deep) ? 'deep' : (opts && opts.long) ? 'long' : 'short';
      const model = (opts && opts.model) || p.model;
      const think = (opts && typeof opts.think==='boolean') ? opts.think : false;
      // local models vary wildly in speed; don't hang forever
      const res = await localFetch(url+'/api/chat', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ model, messages, stream:false, think, options:{ num_predict:REPLY_TOKENS[size] } }),
        signalMs: REPLY_TIMEOUT[size],
      });
      if(!res.ok) throw new Error('Ollama request failed: '+res.status);
      const body = await res.json();
      p.lastThinking = (body.message?.thinking||'').trim() || null;
      return (body.message?.content||'').trim() || EMPTY_REPLY_TEXT.ollama;
    },
  };
  return p;
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
  return p;
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
  return p;
}

export function providerFor(conn){
  if(conn.kind==='ollama') return makeOllamaProvider(conn.baseUrl, conn.name, conn.model);
  if(conn.kind==='openai-compatible') return makeOpenAICompatProvider(conn.baseUrl, conn.apiKey, conn.name, conn.model);
  if(conn.kind==='anthropic') return makeAnthropicProvider(conn.baseUrl, conn.apiKey, conn.name, conn.model);
  return NoProvider;
}

export let AI = NoProvider;
export function isAIActive(){ return AI !== NoProvider; }

/* Tries each enabled connection in order; the first reachable one wins.
   Called on load, and again any time the Connections panel changes something. */
export async function detectAI(connections){
  for(const conn of (connections||[]).filter(c=>c.enabled!==false)){
    const provider = providerFor(conn);
    if(await provider.isAvailable()){ AI = provider; return AI; }
  }
  AI = NoProvider;
  return AI;
}
