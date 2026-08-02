/* ================================================================
   [THE BENCH] — the guard for the two-phase property that is the whole
   reason this room is different from a notes list:

     a prediction is saved BEFORE the attempt, and cannot be edited
     once the result is known.

   If that ever quietly becomes a single form with all the fields at
   once, the Bench has turned into a diary and the pedagogy is gone —
   it would still look fine and still pass a smoke test. Hence this.

     npm run build:beta
     npm run preview            # another terminal
     node test/live/bench.mjs

   Exit code 0 = the property holds.
   ================================================================ */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const save = { seenWelcome: true, aiConnections: [] };

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const p = await browser.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(s => localStorage.setItem('sandPavilionSave.v2', s), JSON.stringify(save));
await p.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
await p.click('#startBtn'); await new Promise(r => setTimeout(r, 1400));

const hall = () => p.evaluate(() => JSON.parse(localStorage.getItem('sandPavilionSave.v2')).hall || {});
const text = () => p.evaluate(() => document.getElementById('hallPanel').textContent);
const set = (id, v) => p.evaluate((i, val) => { const el = document.getElementById(i); el.value = val; }, id, v);
const R = [];

await p.evaluate(() => window.openScienceHall()); await new Promise(r => setTimeout(r, 400));
R.push(['the Bench appears in the Hall', /The Bench/.test(await text())]);

/* A build with no name is refused rather than silently created. */
await p.evaluate(() => window.newBuildForm()); await new Promise(r => setTimeout(r, 300));
await p.evaluate(() => window.createBuild()); await new Promise(r => setTimeout(r, 300));
R.push(['a nameless build is refused', ((await hall()).builds || []).length === 0]);

await set('bldName', 'A universal remote for the TV');
await set('bldGoal', 'Changes the channel across the room, on a battery');
await p.evaluate(() => window.createBuild()); await new Promise(r => setTimeout(r, 400));
const b0 = (await hall()).builds || [];
R.push(['a named build is kept', b0.length === 1 && b0[0].name === 'A universal remote for the TV']);
const bid = b0[0].id;

/* THE PROPERTY: a step with no prediction cannot be opened at all. */
await p.evaluate(id => window.predictForm(id), bid); await new Promise(r => setTimeout(r, 300));
await set('preStage', 'Drive the IR LED straight off the Arduino pin');
await p.evaluate(() => window.createPrediction()); await new Promise(r => setTimeout(r, 300));
R.push(['A STEP WITH NO PREDICTION IS REFUSED', ((await hall()).builds[0].entries || []).length === 0]);

await set('prePredict', 'Works, but only about a metre');
await set('preWhy', 'The pin gives ~20mA; the datasheet rates the LED at 100mA');
await p.evaluate(() => window.createPrediction()); await new Promise(r => setTimeout(r, 400));
const e0 = (await hall()).builds[0].entries[0];
R.push(['the prediction is saved on its own', !!e0 && e0.predicted === 'Works, but only about a metre']);
R.push(['and it is saved OPEN — the result half is empty', e0.closed === null && e0.outcome === null]);

/* The result half is reachable only now, and needs the comparison. */
await p.evaluate(() => window.openScienceHall()); await new Promise(r => setTimeout(r, 400));
R.push(['the open step is shown as awaiting a result', /not yet run/.test(await text())]);

await p.evaluate((bi, ei) => window.closeBenchEntry(bi, ei), bid, e0.id); await new Promise(r => setTimeout(r, 300));
R.push(['a result with no verdict against the prediction is refused', (await hall()).builds[0].entries[0].closed === null]);

await set('bDid-' + e0.id, 'Wired LED + 220R straight to pin 3');
await set('bMeas-' + e0.id, 'Worked to 1.4 m, then dropped out entirely');
await set('bOut-' + e0.id, 'as-predicted');
await set('bNext-' + e0.id, 'Add the 2N3904 and measure again');
await p.evaluate((bi, ei) => window.closeBenchEntry(bi, ei), bid, e0.id); await new Promise(r => setTimeout(r, 400));
const e1 = (await hall()).builds[0].entries[0];
R.push(['the result closes the step', !!e1.closed && e1.outcome === 'as-predicted']);
R.push(['THE ORIGINAL PREDICTION SURVIVES THE RESULT', e1.predicted === 'Works, but only about a metre' && e1.why.includes('20mA')]);

/* The prediction must have no edit path anywhere in the closed card. */
const html = await p.evaluate(() => document.getElementById('hallPanel').innerHTML);
const closedCard = html.slice(html.indexOf('Drive the IR LED'));
R.push(['a closed step offers no way to rewrite the guess',
  !/id="prePredict"/.test(closedCard) && /Amend the result/.test(closedCard)]);

/* Survives a restart — the log is the point. A second page carrying the save
   that was actually written to disk, NOT the blank one this run started from. */
const written = await p.evaluate(() => localStorage.getItem('sandPavilionSave.v2'));
const p2 = await browser.newPage();
p2.on('pageerror', e => errs.push(e.message));
await p2.evaluateOnNewDocument(s => localStorage.setItem('sandPavilionSave.v2', s), written);
await p2.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
await p2.click('#startBtn'); await new Promise(r => setTimeout(r, 1200));
const after = (await p2.evaluate(() => JSON.parse(localStorage.getItem('sandPavilionSave.v2')).hall)).builds[0];
R.push(['the log survives a restart', after.entries.length === 1 && after.entries[0].measured.includes('1.4 m')]);

let bad = 0;
for (const [name, ok] of R) { console.log((ok ? '  PASS  ' : '  FAIL  ') + name); if (!ok) bad++; }
console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');
await browser.close();
process.exit(bad || errs.length ? 1 : 0);
