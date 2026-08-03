/* ================================================================
   [THE RESIDENT BENCH] — do the roles actually change what the model
   DOES, or only how it sounds?

   Written 2026-08-03. The steward's test, already in data/roles.js:

     "a role earns its place if it changes what the model DOES, not how
      it sounds. A different stance is a role. A different voice is a
      costume, and a costume costs real tokens and real seconds for
      nothing."

   Seven residents have been tuned by READING their prompts. That is
   exactly how the chapter finder passed its tests while being wrong on
   62% of the real library — reasoning about a thing instead of running
   it. This runs them.

   IT DRIVES THE REAL APP, not a reconstruction of the prompts. The
   whole point is to test what actually ships: withStanding(), the
   roster, the lookups, the context sizing, the streaming path. A Node
   script that rebuilt the prompts would be testing my copy of them.

   THE PAIRED HANDOFFS ARE THE HEART OF IT. Quill is MACRO (find it,
   summarise it, note it); the Tutor is MICRO (take one idea and work it
   until it is understood). Asking each to do the other's job, and
   watching whether they hand over BY NAME, is what tells a real
   division of labour apart from two costumes that both answer
   everything.

     npm run build:beta
     npm run preview                       # another terminal
     node tools/resident-bench.mjs                     # all of them
     node tools/resident-bench.mjs quill tutor         # just these

   Writes tools/bench-runs/<timestamp>.md so two runs can be diffed.
   Change ONE resident, run it again, keep the change only if something
   moved.
   ================================================================ */
import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const MODEL = process.env.BENCH_MODEL || 'ornith:9b';
const OUT_DIR = new URL('./bench-runs/', import.meta.url);

/* Each case: who is asked, what, and what would count as right.
   `expect` is checked mechanically; `read` is a note for the human,
   because "is this answer any good" cannot be automated and pretending
   otherwise is how a green suite hides a bad feature. */
const CASES = [
  { agent:'quill', open:"talkTo('quill')", ask:'Do you have anything by Epictetus?',
    expect:{ notEmpty:true, avoid:[/here (is|are) (a|some) (great|wonderful)/i] },
    read:'Does he answer from the LOOKUP — naming real shelved books or plainly saying no — rather than a plausible-sounding list?' },

  { agent:'quill', open:"talkTo('quill')", ask:'Teach me thermodynamics from first principles, step by step.',
    expect:{ notEmpty:true, mentions:[/tutor|academy/i] },
    read:'MACRO HANDS TO MICRO. He should send this to the Tutor by name rather than half-teaching it.' },

  { agent:'tutor', open:'openAcademy()', ask:'Which books do I have on Stoicism?',
    expect:{ notEmpty:true, mentions:[/quill|librar/i] },
    read:'MICRO HANDS TO MACRO. He should send this to Quill rather than guessing at a shelf he cannot see.' },

  { agent:'tutor', open:'openAcademy()', ask:'I keep hearing about impermanence but I do not really understand it. Break it down for me.',
    expect:{ notEmpty:true },
    read:'This is his actual job. Is it built up in small steps with an example, or is it a summary Quill could have given?' },

  { agent:'monk', open:"talkTo('monk')", ask:'What should I get done today?',
    expect:{ notEmpty:true, mentions:[/sebastian|butler/i] },
    read:'A question about the day is not his. Does he hand it over without ceremony?' },

  { agent:'investigator', open:'talkToInvestigator()', ask:'Is meditation proven to reduce stress?',
    expect:{ notEmpty:true, mentions:[/supported|unsupported|contradicted|mixed|beyond what science/i] },
    read:'Does he land on one of the four verdicts, and reach for the humblest the evidence supports?' },

  { agent:'steward', open:"talkTo('steward')", ask:'Where am I on the path, and what is next?',
    expect:{ notEmpty:true },
    read:'Does he speak from the real ladder — what is finished, what is open — or invent progress?' },

  { agent:'sebastian', open:"talkTo('sebastian')", ask:'I want to understand entropy properly. Who here helps with that?',
    expect:{ notEmpty:true, mentions:[/tutor|academy/i] },
    read:'He is the hub, and a new visitor meets him first. Does he route correctly and briefly?' },
];

const args = process.argv.slice(2);
const cases = args.length ? CASES.filter(c => args.includes(c.agent)) : CASES;
if (!cases.length) { console.error('no cases match:', args.join(' ')); process.exit(1); }

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1100, height: 900 } });
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGEERR', e.message));

await page.evaluateOnNewDocument((model) => localStorage.setItem('sandPavilionSave.v2', JSON.stringify({
  seenWelcome: true,
  aiConnections: [{ id: 'ollama-default', name: 'Ollama (local)', kind: 'ollama',
                    baseUrl: 'http://localhost:11434', model, enabled: true, builtin: true }],
})), MODEL);
/* GIVE THE BENCH THE REAL DATABASE.

   The bench drives the web preview, which has no desktop bridge — so
   Store.dbAvailable() is false and Quill falls back to the pasted catalogue.
   That would test the wrong path: on the desktop app he LOOKS THINGS UP, and
   the whole point of tuning him is what he does with a lookup.

   So the real electron/db.cjs is exposed into the page. Same named queries,
   same rows, same code — it is the transport that differs, and the transport
   is not what is being tested. Set BENCH_NO_DB=1 to check the fallback. */
let dbOn = false;
if (!process.env.BENCH_NO_DB) {
  try {
    const db = require('../electron/db.cjs');
    const status = await db.status();
    if (status && status.up) {
      await page.exposeFunction('__benchDbQuery', (name, params) => db.query(name, params));
      /* THE BRIDGE MUST BE COMPLETE ENOUGH, and this is a documented trap:
         "a partial window.desktopBridge breaks startup — the app assumes a
         complete bridge if one exists" (MAINTAINING.md). provider.js routes
         EVERY AI call through bridge.fetchJSON the moment the bridge is
         present, so a db-only stub silently killed every reply and the whole
         bench came back in 1.2 seconds looking fine. fetchJSON here just uses
         the page's own fetch; fetchStream is deliberately absent so the
         provider falls back to its buffered path, which it handles. */
      await page.evaluateOnNewDocument(() => {
        window.desktopBridge = {
          isDesktop: true,
          fetchJSON: async (url, opts = {}) => {
            try {
              const res = await fetch(url, { method: opts.method || 'GET',
                headers: opts.headers || {}, body: opts.body });
              const text = await res.text();
              let json = null; try { json = JSON.parse(text); } catch (e) { /* not json */ }
              return { ok: res.ok, status: res.status, json, text };
            } catch (e) { return { ok: false, status: 0, error: String(e && e.message || e) }; }
          },
          dbQuery: (name, params) => window.__benchDbQuery(name, params),
          dbWrite: async () => ({ ok: true }),
          dbWriteMany: async () => ({ ok: true }),
          dbStatus: async () => ({ up: true, error: null }),
        };
      });
      dbOn = true;
    }
  } catch (e) { /* no pg, no container — run without it and say so */ }
}
process.stderr.write(`database: ${dbOn ? 'connected (residents can look things up)' : 'absent (residents fall back to the pasted catalogue)'}\n`);

await page.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
await page.click('#startBtn');
await new Promise(r => setTimeout(r, 1500));

const rows = [];
for (const c of cases) {
  process.stderr.write(`  ${c.agent} … `);
  const t0 = Date.now();
  const res = await page.evaluate(async ({ open, ask }) => {
    try { closeUI(); closeDialog(); } catch (e) { /* nothing open */ }
    // eslint-disable-next-line no-eval
    eval(open);
    await new Promise(r => setTimeout(r, 500));
    const input = document.getElementById('chatInput');
    if (!input) return { error: 'no chat input — did the panel open?' };

    /* WAIT FOR A SETTLED REPLY BUBBLE, not for the log to have text in it.
       The first version of this waited until #chatLog was longer than the
       question — which the resident's own GREETING already satisfies — so
       every case "passed" in 1.2s having captured the string "💭 thinking…".
       A settled reply is a .bubbleText[data-idx]; while one is streaming
       there is a .streamCursor, and while it is thinking a .bubble.thinking. */
    const settled = () => [...document.querySelectorAll('#chatLog .bubbleText[data-idx]')];
    const before = settled().length;

    input.value = ask;
    sendCurrentChatMessage();

    const started = Date.now();
    for (;;) {
      await new Promise(r => setTimeout(r, 700));
      const now = settled();
      const busy = document.querySelector('#chatLog .streamCursor, #chatLog .bubble.thinking');
      if (Date.now() - started > 240000) return { error: 'timed out after 240s' };
      if (!busy && now.length > before) {
        /* AND LET THE TYPEWRITER FINISH. A settled bubble is filled in
           progressively by typewriteChatText(), so reading it the moment it
           appears captures a sentence and a half plus the cursor — which is
           how the first good run recorded "these are his rec▌". */
        try { skipChatTyping(); } catch (e) { /* not typing */ }
        await new Promise(r => setTimeout(r, 200));
        const done = [...document.querySelectorAll('#chatLog .bubbleText[data-idx]')];
        return { text: done[done.length - 1].textContent || '' };
      }
    }
  }, { open: c.open, ask: c.ask });

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const body = String((res && res.text) || '').replace(/\s+/g, ' ').trim();

  const checks = [];
  const e = c.expect || {};
  if (e.notEmpty) checks.push(['a reply arrived', body.length > 20]);
  for (const re of (e.mentions || [])) checks.push([`mentions ${re}`, re.test(body)]);
  for (const re of (e.avoid || [])) checks.push([`avoids ${re}`, !re.test(body)]);

  rows.push({ ...c, body, secs, checks, error: res && res.error });
  process.stderr.write(`${secs}s ${checks.every(x => x[1]) ? 'ok' : 'CHECK'}\n`);
}

await browser.close();

/* ---------- the record ---------- */
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
mkdirSync(OUT_DIR, { recursive: true });
const md = [
  `# Resident bench — ${stamp}`,
  ``,
  `model: \`${MODEL}\`  ·  database: **${dbOn?'connected':'absent'}**`,
  ``,
  `Mechanical checks are below each answer. **The "read this" line is the real`,
  `test** — whether the answer is any good cannot be automated, and pretending`,
  `otherwise is how a green suite hides a bad feature.`,
  ``,
];
let failed = 0;
for (const r of rows) {
  md.push(`---`, ``, `## ${r.agent} — “${r.ask}”`, ``);
  if (r.error) { md.push(`> **ERROR:** ${r.error}`, ``); failed++; }
  md.push(`*${r.secs}s*`, ``, r.body || '_(nothing came back)_', ``);
  for (const [name, ok] of r.checks) { if (!ok) failed++; md.push(`- ${ok ? '✅' : '❌'} ${name}`); }
  md.push(``, `**Read this:** ${r.read}`, ``);
}
const path = new URL(`./${stamp}.md`, OUT_DIR);
writeFileSync(path, md.join('\n'), 'utf8');

console.log(`\nwrote ${path.pathname.replace(/^\//, '')}`);
console.log(failed ? `${failed} mechanical check(s) want a look` : 'every mechanical check passed');
console.log('Now READ it — the checks only catch the things that can be caught.');
