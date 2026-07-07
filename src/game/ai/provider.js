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

/* Ollama's native API — http://localhost:11434 by default. Some models
   (marked "thinking" models, e.g. qwen3.5, deepseek-r1, qwq) spend their
   whole reply budget on invisible reasoning and can return *empty*
   content if that budget runs out before they start actually answering
   — found this the hard way testing qwen3.5:9b (3m26s, empty reply).
   think:false and a modest num_predict cap keep replies both fast and
   non-empty, which matters more for a game NPC than a long essay would. */
export function makeOllamaProvider(baseUrl, name){
  const url = (baseUrl || 'http://localhost:11434').replace(/\/$/,'');
  const p = {
    name: name || 'Ollama', model: null,
    async isAvailable(){
      try{
        const t = withTimeout(1200);
        const res = await fetch(url+'/api/tags', { signal:t.signal });
        t.done();
        if(!res.ok) return false;
        const body = await res.json();
        const models = (body.models||[]).map(m=>m.name);
        if(!models.length) return false;
        p.model = models.find(m=>m.startsWith('llama3.2')) || models[0];
        p.name = (name || 'Ollama') + ' · ' + p.model;
        return true;
      } catch(e){ return false; } // not running, wrong port, or OLLAMA_ORIGINS doesn't allow this page
    },
    async chat(messages){
      const t = withTimeout(45000); // local models vary wildly in speed; don't hang forever
      try{
        const res = await fetch(url+'/api/chat', {
          method:'POST', headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ model:p.model, messages, stream:false, think:false, options:{ num_predict:300 } }),
          signal:t.signal,
        });
        if(!res.ok) throw new Error('Ollama request failed: '+res.status);
        const body = await res.json();
        return (body.message?.content||'').trim() || '…the thought slips away before it can be spoken.';
      } finally { t.done(); }
    },
  };
  return p;
}

/* Generic OpenAI-compatible endpoint — covers LM Studio, most self-hosted
   proxies, and any cloud provider exposing the same /chat/completions
   shape. apiKey is optional (many local servers don't need one). */
export function makeOpenAICompatProvider(baseUrl, apiKey, name){
  const url = (baseUrl||'').replace(/\/$/,'');
  const headers = { 'Content-Type':'application/json', ...(apiKey ? { Authorization:'Bearer '+apiKey } : {}) };
  const p = {
    name: name || 'Custom connection',
    async isAvailable(){
      if(!url) return false;
      try{
        const t = withTimeout(1500);
        const res = await fetch(url+'/models', { headers, signal:t.signal });
        t.done();
        return res.ok;
      } catch(e){ return false; }
    },
    async chat(messages){
      const t = withTimeout(45000);
      try{
        const res = await fetch(url+'/chat/completions', {
          method:'POST', headers,
          body: JSON.stringify({ model:'default', messages, max_tokens:300 }),
          signal:t.signal,
        });
        if(!res.ok) throw new Error('Request failed: '+res.status);
        const body = await res.json();
        return (body.choices?.[0]?.message?.content||'').trim() || '…the connection answers, but says nothing.';
      } finally { t.done(); }
    },
  };
  return p;
}

export function providerFor(conn){
  if(conn.kind==='ollama') return makeOllamaProvider(conn.baseUrl, conn.name);
  if(conn.kind==='openai-compatible') return makeOpenAICompatProvider(conn.baseUrl, conn.apiKey, conn.name);
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
