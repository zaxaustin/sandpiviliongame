/* ================================================================
   [THE TREE GRAPH] — one renderer, laid out by dependency depth.

   Extracted from ui/lesson-tree.js on 2026-08-14, unchanged, when the
   Course Board needed the same drawing. Its own comment already called
   it "the whole 'make it look like a skill tree' ask", and it was
   already generic — needsOf / cardHTML / onClickAttr — so the only
   thing standing between it and a second caller was which file it
   lived in.

   THE ui/dom.js PRECEDENT, and the same reasoning verbatim: "a second
   copy of an escaping rule is exactly the drift this project has paid
   for three times." A shared renderer belongs in one place. Nothing
   here changed in the move; ui/lesson-tree.js imports it and draws
   exactly what it drew before, which test/live/study-chain.mjs holds.

   Pure presentation: it is handed nodes and three functions, and knows
   nothing about lessons, courses or the save.
   ================================================================ */

const TREE_COL=230, TREE_ROW=112;   // one card's footprint in the graph
const TREE_CARD_H=84;               // fixed, so a long title can never run into the row below
/* Depth = the longest chain of prerequisites behind a node. That's what makes
   the drawing read as a tree rather than a list: roots on the left, and
   anything that needed something else further right. */
export function graphDepths(nodes, needsOf){
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
export function renderTreeGraph(nodes, opts){
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
