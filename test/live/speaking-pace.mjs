/* [SPEAKING PACE] — a resident speaks at ONE RATE, and it is a rate.
   ======================================================================
   Until 2026-08-09 the chat log revealed a reply with
   `step = Math.max(1, Math.floor(text.length/90))`: a per-reply BUDGET
   dressed as a rate. Every reply took the same ~1.8 s, so the more the
   resident said, the less time you got per word. And the Monk's real
   `pace: 34` only applied to the streaming path — pocket the conversation
   and the same reply came back through the budget at ~500 cps.

   `npm test` guard A holds the shape of the code. This holds the BEHAVIOUR,
   which is the only place the bug was ever visible: it measures characters
   actually on screen over time, in a real browser, against a real streaming
   endpoint.

   WHY A FAKE OLLAMA AND NOT A REAL ONE. A real local model's reply length
   is not ours to choose, and the whole property under test is "two replies
   of very different lengths reveal at the SAME characters per second". That
   needs two replies whose lengths we control to the character. The endpoint
   is fake; everything above it — detectAI, the provider's NDJSON reader,
   the streaming bubble, startPacedReveal, the pocket — is the shipped path.

   Needs `npm run preview` on :4173, and port 11434 free (stop Ollama). */
import puppeteer from 'puppeteer-core';
import http from 'node:http';
import { inlineBook } from './_books.mjs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
/* test/live/_*.png, like every other suite here — it is the path .gitignore
   already covers. The first version of this built its own .tmp-shots/ from
   `new URL(...).pathname`, which on a project path containing a space hands
   back "sand%20pavilion%20game" and cheerfully creates a directory of that
   name on the Desktop. */
const SHOT = n => 'test/live/_pace-' + n + '.png';

/* ---------- the rates under test, DERIVED from the source of truth ----------
   Typing 90 and 34 here would be rule 4's exact shape: a hand-copied number
   that must match another file. Changing DEFAULT_PACE must change what this
   suite expects, not make it lie. */
const { ROLES, DEFAULT_PACE } = await import('../../src/game/data/roles.js');
const paceOf = k => (Number(ROLES[k].pace) > 0 ? Number(ROLES[k].pace) : DEFAULT_PACE);

/* ---------- a fake Ollama ---------- */
const SHORT = 'A short answer, and no more than that. '.repeat(3).trim();      // ~115 chars
const LONG  = 'A far longer answer, of the kind a local model produces when it warms to a subject. '.repeat(12).trim(); // ~1000
/* THE MONK GETS A SHORTER ONE, AND THAT IS NOT A CONVENIENCE. At 34 cps a
   1,000-character reply is thirty seconds of reveal, which is past the 20 s
   REVEAL_CAP_MS bail — so measuring him on LONG measures the CAP (it reads
   ~50 cps, the average of 20 s at his pace plus a dump) rather than his pace.
   His pace is checked below the cap; the cap is checked separately, because
   two behaviours measured as one is how a wrong number looks right. */
const MEDIUM = 'A measured answer, neither short nor long, said at the pace of speech. '.repeat(6).trim(); // ~420
let nextReply = SHORT;
let streamMs = 200;      // how long the fake model takes to deliver the whole reply

const cors = res => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
};
const server = http.createServer((req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.url.startsWith('/api/tags')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ models: [
      { name: 'testmodel:8b', model: 'testmodel:8b', size: 4_500_000_000, capabilities: ['completion'] },
    ] }));
  }
  if (req.url.startsWith('/api/ps')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ models: [] }));
  }
  if (req.url.startsWith('/api/chat')) {
    /* THE WHOLE REPLY ARRIVES IN 200 ms BY DEFAULT. That is the point: the
       model is not the slow thing. Anything the visitor sees after 200 ms is
       the reveal, which is what this suite is measuring.

       streamMs is raised for the pocket case only — see section 4. */
    const body = nextReply;
    res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
    const chunks = body.match(/[\s\S]{1,40}/g) || [];
    let i = 0;
    const tick = setInterval(() => {
      if (i >= chunks.length) {
        clearInterval(tick);
        res.end(JSON.stringify({ message: { content: '' }, done: true }) + '\n');
        return;
      }
      res.write(JSON.stringify({ message: { content: chunks[i++] }, done: false }) + '\n');
    }, streamMs / Math.max(1, chunks.length));
    return;
  }
  res.writeHead(404); res.end('{}');
});
/* AN EPHEMERAL PORT, NOT 11434. Binding Ollama's own port would make this
   suite fight the steward's real Ollama for it — and a suite that only runs
   when a service is switched off is a suite nobody runs. The save below names
   this port as the one connection, so detectAI finds this and nothing else. */
await new Promise((ok, no) => {
  server.on('error', no);
  server.listen(0, '127.0.0.1', ok);
});
const PORT = server.address().port;

/* ---------- the browser ---------- */
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
                                   args: ['--window-size=1280,860'] });
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 860 });
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(s => localStorage.setItem('sandPavilionSave.v2', s),
  JSON.stringify({ seenWelcome: true, personalLibrary: [inlineBook()],
    aiConnections: [{ id: 'test-ollama', name: 'Test Ollama', kind: 'ollama',
                      baseUrl: 'http://127.0.0.1:' + PORT, enabled: true, builtin: false }] }));
await p.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
await p.click('#startBtn');
await new Promise(r => setTimeout(r, 2200));   // let detectAI find the fake endpoint

const R = [];
const wait = ms => new Promise(r => setTimeout(r, ms));
/* what is actually ON SCREEN — the streaming bubble while a reply is arriving,
   the settled bubble once it has. Never the buffer. */
const shownChars = () => p.evaluate(() => {
  const s = document.getElementById('streamText');
  if (s) return s.textContent.length;
  const all = document.querySelectorAll('#chatLog .bubble.npc .bubbleText');
  const last = all[all.length - 1];
  return last ? last.textContent.replace(/\u258c$/, '').length : 0;
});

const connected = await p.evaluate(() =>
  !!document.querySelector('#chatOv, body') && true);
if (!connected) R.push(['the page came up', false]);

/* Measure one reply: send, then sample the visible length until it settles.
   Returns { cps, total, samples }. */
async function measure(agent, reply, { pocketAt } = {}) {
  nextReply = reply;
  await p.evaluate(k => window.talkTo(k), agent);
  await wait(500);
  await p.evaluate(() => { document.getElementById('chatInput').value = 'hello'; });
  await p.evaluate(() => window.sendCurrentChatMessage());

  const samples = [];
  let pocketed = false, atPocket = -1, afterRestore = -1;
  const t0 = Date.now();
  for (let i = 0; i < 240; i++) {
    await wait(100);
    const n = await shownChars();
    samples.push([Date.now() - t0, n]);
    if (pocketAt && !pocketed && n >= pocketAt) {
      pocketed = true; atPocket = n;
      await p.evaluate(() => window.minimizeChat());
      await wait(1000);                       // a second of walking the grounds
      await p.evaluate(() => window.restoreChat());
      await wait(120);
      afterRestore = await shownChars();
    }
    if (n >= reply.length) break;
    if (Date.now() - t0 > 22000) break;
  }
  /* the rate over the STEADY part: skip the first 400 ms (the model's own
     latency and the first render) and stop when it hits full length. */
  const done = samples.find(s => s[1] >= reply.length);
  const start = samples.find(s => s[0] >= 400 && s[1] > 0);
  const cps = (done && start && done[0] > start[0])
    ? (done[1] - start[1]) / ((done[0] - start[0]) / 1000) : 0;
  return { cps, total: samples[samples.length - 1][1], atPocket, afterRestore, samples };
}

/* ---------- 1 · IT IS A RATE, NOT A BUDGET ----------
   The bug in one assertion: a short reply and a long one, same resident, must
   come out at the same characters per second. Under `length/90` the long one
   was ~9x faster per word. */
const shortRun = await measure('quill', SHORT);
await p.evaluate(() => window.closeDialog());
await wait(300);
const longRun = await measure('quill', LONG);

const ratio = shortRun.cps && longRun.cps ? longRun.cps / shortRun.cps : 99;
R.push([`a 1,000-char reply reveals at the same rate as a 115-char one `
      + `(${shortRun.cps.toFixed(0)} vs ${longRun.cps.toFixed(0)} cps, ratio ${ratio.toFixed(2)})`,
        ratio > 0.6 && ratio < 1.7]);
R.push([`and that rate is the house rate, ${DEFAULT_PACE} cps `
      + `(measured ${longRun.cps.toFixed(0)})`,
        longRun.cps > DEFAULT_PACE * 0.65 && longRun.cps < DEFAULT_PACE * 1.45]);

/* ---------- 2 · THE MONK IS SLOWER, AND BY HIS OWN NUMBER ---------- */
await p.evaluate(() => window.closeDialog());
await wait(300);
const want = paceOf('monk');
const monkRun = await measure('monk', MEDIUM);
R.push([`the Monk speaks at his own ${want} cps, not the house rate `
      + `(measured ${monkRun.cps.toFixed(0)})`,
        monkRun.cps > want * 0.6 && monkRun.cps < want * 1.5]);
R.push(['and he is audibly slower than everyone else', monkRun.cps < longRun.cps * 0.75]);

/* ---------- 2b · AND THE SAFETY CAP IS A SAFETY, NOT THE ROUTINE PATH ----------
   1,000 characters at 34 cps is thirty seconds. REVEAL_CAP_MS bails at 20 s
   and the rest simply arrives. That is a deliberate ceiling on the WAIT, and
   it is checked here so it stays a ceiling: if a future edit turns it into a
   division of the text, the two rates above start disagreeing and this stops
   being the only thing that fires. */
await p.evaluate(() => window.closeDialog());
await wait(300);
const capT0 = Date.now();
const capRun = await measure('monk', LONG);
const capMs = Date.now() - capT0;
R.push([`a reply too long for the Monk to finish saying is capped at ~20 s, not `
      + `${(LONG.length / want).toFixed(0)} s (took ${(capMs / 1000).toFixed(1)} s)`,
        capMs < 24000 && capRun.total >= LONG.length]);

/* ---------- 3 · LOOK AT IT ---------- */
{
  nextReply = MEDIUM;
  await p.evaluate(() => window.closeDialog());
  await wait(300);
  await p.evaluate(() => window.talkTo('monk'));
  await wait(400);
  await p.evaluate(() => { document.getElementById('chatInput').value = 'what is this for?'; });
  await p.evaluate(() => window.sendCurrentChatMessage());
  await wait(4000);                                  // ~3.5 s into a 34 cps reveal
  const mid = await shownChars();
  await p.screenshot({ path: SHOT('monk-midreveal') });
  R.push([`the screenshot caught the reveal MID-SENTENCE (${mid} of ${MEDIUM.length} chars) — `
        + 'a full bubble here would mean there is nothing to look at',
          mid > 20 && mid < MEDIUM.length - 20]);
}

/* ---------- 4 · POCKETED IS NOT PAUSED ----------
   Pocket the chat part of the way in, walk around for a second, come back.
   The reply must be FURTHER ALONG than where you left it — the words kept
   being said — and must not have been dumped whole.

   THE SLOW STREAM IS THE WHOLE TEST, and it is here because the first version
   of this check could not be broken. With the default 200 ms stream the reply
   has fully LANDED before you pocket it, so the resume runs through
   _landedAt/revealHead() — which is a different mechanism, and one that was
   already correct. Restoring `if(d.minimized) stopPacedReveal()` to the tick
   still passed. Only a reply STILL ARRIVING while pocketed exercises the
   counter surviving the pocket, and that sabotage now fails here. */
await p.evaluate(() => window.closeDialog());
await wait(400);
streamMs = 9000;                       // still arriving when we come back
const pocketRun = await measure('monk', MEDIUM, { pocketAt: 60 });
streamMs = 200;
const gained = pocketRun.afterRestore - pocketRun.atPocket;
R.push([`a second pocketed MID-STREAM advances the reveal by about ${want} chars `
      + `(left at ${pocketRun.atPocket}, back at ${pocketRun.afterRestore}, +${gained})`,
        gained > want * 0.4]);
R.push(['and it was NOT dumped whole while pocketed — the point of a rate',
        pocketRun.afterRestore < MEDIUM.length]);
await p.screenshot({ path: SHOT('pocket-resumed') });

/* ---------- 5 · ONE CLICK STILL ENDS IT ---------- */
{
  nextReply = MEDIUM;
  await p.evaluate(() => window.closeDialog());
  await wait(300);
  await p.evaluate(() => window.talkTo('monk'));
  await wait(400);
  await p.evaluate(() => { document.getElementById('chatInput').value = 'again'; });
  await p.evaluate(() => window.sendCurrentChatMessage());
  await wait(1800);
  const before = await shownChars();
  await p.evaluate(() => window.skipChatTyping());
  await wait(250);
  const after = await shownChars();
  R.push([`clicking the log skips to the end (${before} -> ${after} of ${MEDIUM.length})`,
          before < MEDIUM.length && after >= MEDIUM.length]);
}

/* ---------- 6 · AND THE VISITOR CAN HOLD IT ----------
   Asked for 2026-08-09: "we should be able to pause that speaking chain its
   for users not for testing." Skip-to-the-end was the only control the reveal
   had, and a pace you can only end is a pace done TO you.

   The hold has to survive two things that would each quietly undo it: the
   next arriving token (updateStreamingBubble calls startPacedReveal on every
   one) and the handover from the streaming bubble to the settled one. Both
   are exercised here by holding MID-STREAM and waiting past the end of the
   stream. */
{
  nextReply = MEDIUM;
  streamMs = 9000;
  await p.evaluate(() => window.closeDialog());
  await wait(300);
  await p.evaluate(() => window.talkTo('monk'));
  await wait(400);
  await p.evaluate(() => { document.getElementById('chatInput').value = 'slowly, please'; });
  await p.evaluate(() => window.sendCurrentChatMessage());
  await wait(2000);

  const rowBefore = await p.evaluate(() =>
    document.getElementById('chatRevealRow').style.display !== 'none');
  R.push(['the hold appears only while a reply is being said', rowBefore]);

  await p.evaluate(() => window.toggleRevealPause());
  await wait(150);
  const held = await shownChars();
  const label = await p.evaluate(() => document.getElementById('chatPauseBtn').textContent);
  await p.screenshot({ path: SHOT('held') });
  await wait(2500);                              // tokens keep arriving meanwhile
  const stillHeld = await shownChars();
  R.push([`held stays held across 2.5 s and more tokens (${held} -> ${stillHeld})`,
          stillHeld === held && held > 10 && held < MEDIUM.length]);
  R.push([`and the button says how to undo it ("${label}")`, /carry on/i.test(label)]);

  /* HELD THROUGH THE HANDOVER. The streaming bubble is torn down and replaced
     by a settled one when the reply lands — and the first version of this
     section resumed BEFORE that happened, so removing the `|| d.revealPaused`
     from the settle call passed clean. Waiting past the end of the 9 s stream
     is what makes that sabotage fail. */
  await wait(7000);
  const afterLanding = await shownChars();
  const rowStill = await p.evaluate(() =>
    document.getElementById('chatRevealRow').style.display !== 'none');
  R.push([`still held after the whole reply has LANDED (${stillHeld} -> ${afterLanding} `
        + `of ${MEDIUM.length}) — the settled bubble must not snap to full`,
          afterLanding === stillHeld && rowStill]);

  await p.evaluate(() => window.toggleRevealPause());
  await wait(1200);
  const resumed = await shownChars();
  R.push([`▶ carries on from where it was held (${afterLanding} -> ${resumed})`,
          resumed > afterLanding]);

  /* AND IT LETS GO. A hold that outlived its reply would leave the row on
     screen over a finished bubble — a control explaining something that is
     no longer happening. */
  await wait(14000);
  const rowAfter = await p.evaluate(() =>
    document.getElementById('chatRevealRow').style.display !== 'none');
  const done = await shownChars();
  R.push([`the row goes away when the reply is finished (${done} of ${MEDIUM.length})`,
          !rowAfter && done >= MEDIUM.length]);
  streamMs = 200;
}

let bad = 0;
for (const [n, ok] of R) { console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) bad++; }
console.log('  short:', shortRun.cps.toFixed(1), 'cps | long:', longRun.cps.toFixed(1),
            'cps | monk:', monkRun.cps.toFixed(1), 'cps');
console.log('  screenshots -> test/live/_pace-*.png');
console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');
await b.close(); server.close();
process.exit(bad || errs.length ? 1 : 0);
