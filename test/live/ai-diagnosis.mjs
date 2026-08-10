/* [WHY THERE IS NO AI] — four failures, four different sentences.
   ======================================================================
   2026-08-09, and this suite exists because of a live debugging session
   rather than a code review.

   The steward's residents went silent. Ollama was running. `ollama list` was
   empty while 19 GB of models sat on disk — the desktop app's model folder had
   been pointed at the `manifests/registry.ollama.ai/library` subfolder instead
   of the models root. He fixed that, and it STILL did not work, because his
   save had no ENABLED connection: detectAI() made zero network calls, so no log
   anywhere recorded a single failure. It looked exactly like a dead server.

   Telling those apart took a request log, a second Ollama on a spare port, and
   an Electron probe. A tester will do none of that.

   `npm test` holds the SHAPE — that the states resolve to distinct sentences
   and that the two surfaces render them. It cannot see what a person is
   actually shown, because that depends on a real detectAI() against a real
   endpoint. So this drives each failure for real and reads the panel.

   Needs `npm run preview` on :4173. */
import puppeteer from 'puppeteer-core';
import http from 'node:http';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
let failed = 0;
const ok = (name, cond, detail) => {
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (detail ? '  — ' + detail : ''));
  if (!cond) failed++;
};

/* ---------- a fake Ollama whose answer we choose per case ---------- */
let mode = 'models';           // models | empty | cloudonly
const cors = res => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
};
const TAGS = {
  models:    [{ name:'llama3.2:latest', model:'llama3.2:latest', size: 2_000_000_000, capabilities:['completion'] }],
  empty:     [],
  /* Hosted models are served through the SAME local endpoint and listed beside
     local ones — isCloudModel() filters them on the full entry, and a size of 0
     is how Ollama reports them. */
  cloudonly: [{ name:'gpt-oss:20b-cloud', model:'gpt-oss:20b-cloud', size: 0, capabilities:['completion'] }],
};
const server = http.createServer((req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.url.startsWith('/api/tags')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ models: TAGS[mode] || [] }));
  }
  if (req.url.startsWith('/api/ps')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ models: [] }));
  }
  res.writeHead(404); res.end('{}');
});
await new Promise((r, e) => { server.on('error', e); server.listen(0, '127.0.0.1', r); });
const PORT = server.address().port;
/* A port nothing is listening on, for the "not running" case. Taken and
   released, so it is almost certainly free and definitely not ours. */
const deadServer = http.createServer(() => {});
await new Promise(r => deadServer.listen(0, '127.0.0.1', r));
const DEAD_PORT = deadServer.address().port;
await new Promise(r => deadServer.close(r));

const conn = (baseUrl, enabled = true) => ([{ id:'t', name:'Ollama (local)', kind:'ollama',
                                              baseUrl, enabled, builtin:false }]);

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1100, height: 900 } });
const errs = [];
const wait = ms => new Promise(r => setTimeout(r, ms));

/* Each case is its own page: detectAI() runs at boot and the whole point is
   what a person sees on ARRIVAL, not after a recheck. */
async function look(label, aiConnections, m) {
  mode = m || 'models';
  const p = await b.newPage();
  p.on('pageerror', e => errs.push(label + ': ' + e.message));
  await p.evaluateOnNewDocument(s => localStorage.setItem('sandPavilionSave.v2', s),
    JSON.stringify({ seenWelcome: true, aiConnections }));
  await p.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
  const title = await p.evaluate(() => (document.getElementById('aiMode') || {}).textContent || '');
  await p.click('#startBtn');
  await wait(1500);
  await p.evaluate(() => window.openConnections());
  await wait(500);
  const panel = await p.evaluate(() => {
    const el = document.getElementById('connPanel');
    const card = el && el.querySelector('.card');
    return { head: card ? (card.querySelector('.t') || {}).textContent || '' : '',
             body: card ? (card.querySelector('.s') || {}).textContent || '' : '' };
  });
  return { p, title: title.trim(), head: panel.head.trim(), body: panel.body.trim() };
}

const seen = {};
console.log('\nFour failures, and what a person is actually told\n');

/* ---------- 1 · nothing switched on — the steward's own ---------- */
{
  const r = await look('none-enabled', conn('http://127.0.0.1:' + PORT, false));
  seen.NONE_ENABLED = r.body;
  console.log('    ' + r.head + '  ::  ' + r.body.slice(0, 110));
  ok('nothing enabled says nothing was CONTACTED, not that nothing answered',
     /nothing was contacted|nothing is switched on/i.test(r.body) && !/answered at/i.test(r.body),
     r.body.slice(0, 80));
  ok('...and the headline says what to do', /switch one on/i.test(r.head), r.head);
  await r.p.screenshot({ path: 'test/live/_ai-none-enabled.png' });
  await r.p.close();
}

/* ---------- 2 · nothing listening ---------- */
{
  const r = await look('no-answer', conn('http://127.0.0.1:' + DEAD_PORT));
  seen.NO_ANSWER = r.body;
  console.log('    ' + r.head + '  ::  ' + r.body.slice(0, 110));
  ok('a dead port names the address it tried',
     /nothing answered at/i.test(r.body) && r.body.includes(String(DEAD_PORT)),
     r.body.slice(0, 90));
  await r.p.close();
}

/* ---------- 3 · running, zero models — the misconfigured-folder case ---------- */
{
  const r = await look('no-models', conn('http://127.0.0.1:' + PORT), 'empty');
  seen.NO_MODELS = r.body;
  console.log('    ' + r.head + '  ::  ' + r.body.slice(0, 140));
  ok('an empty model list is NOT reported as "not running"',
     !/nothing answered/i.test(r.body) && /answered/i.test(r.body), r.body.slice(0, 60));
  ok('it gives the command that fixes it', /ollama pull/i.test(r.body));
  ok('and it names the OTHER cause too — the app cannot tell them apart (rule 6)',
     /folder|director/i.test(r.body), r.body.slice(60, 170));
  await r.p.screenshot({ path: 'test/live/_ai-no-models.png' });
  await r.p.close();
}

/* ---------- 4 · hosted models only ---------- */
{
  const r = await look('cloud-only', conn('http://127.0.0.1:' + PORT), 'cloudonly');
  seen.CLOUD_ONLY = r.body;
  console.log('    ' + r.head + '  ::  ' + r.body.slice(0, 140));
  ok('hosted-only says the models leave this device',
     /leave this device/i.test(r.body), r.body.slice(0, 90));
  ok('and names the hosted model it found', /gpt-oss/i.test(r.body));
  await r.p.close();
}

/* ---------- THE POINT: all four differ ---------- */
{
  const keys = Object.keys(seen);
  const uniq = new Set(keys.map(k => seen[k]));
  ok(`all ${keys.length} states produced DIFFERENT sentences on screen`, uniq.size === keys.length,
     uniq.size + ' distinct of ' + keys.length);
  const anyEmpty = keys.filter(k => !seen[k] || seen[k].length < 20);
  ok('none of them is blank or a stub', !anyEmpty.length, anyEmpty.join(', ') || 'all real');
}

/* ---------- and a working connection says so, with no diagnosis ---------- */
{
  const r = await look('connected', conn('http://127.0.0.1:' + PORT), 'models');
  console.log('    ' + r.head + '  ::  ' + r.title.slice(0, 90));
  ok('a working connection is announced, not diagnosed',
     /Connected/i.test(r.head) && !/No AI is answering/i.test(r.head), r.head);
  ok('it names the model', /llama3\.2/i.test(r.head), r.head);
  ok('and the title screen agrees', /Connected to/i.test(r.title), r.title.slice(0, 70));
  ok('🏠 — an Ollama connection is local by its kind', /🏠/.test(r.head), r.head);
  await r.p.screenshot({ path: 'test/live/_ai-connected.png' });
  await r.p.close();
}

console.log('\npage errors:', errs.length ? errs.slice(0, 3) : 'none');
console.log('screenshots -> test/live/_ai-*.png');
await b.close(); server.close();
process.exit(failed || errs.length ? 1 : 0);
