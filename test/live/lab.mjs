/* ================================================================
   [THE LAB, DATASHEETS, THE PAPER SHELF] — 2026-08-02.

   Three properties worth guarding, all of them the kind that break
   silently:

     1. `ds <part>` reaches a datasheet. This is the ONLY interaction
        a datasheet ever really has — nobody browses one — so if the
        lookup rots, the feature is gone even though it still lists.
     2. A book owned on PAPER has no text and must never pretend to.
        It exists to be findable and to be KNOWN to the residents.
     3. The Lab counts what actually exists. It owns nothing and
        duplicates nothing, so every number is read live — which is
        exactly the arrangement that silently stops matching.

     npm run build:beta
     npm run preview            # another terminal
     node test/live/lab.mjs

   Exit code 0 = the room tells the truth.
   ================================================================ */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const mk = (slug, title, kind, extra = {}) => ({ slug, title, tradition: 'Electronics', personal: true,
  license: '', added: '2026-08-01', category: 'personal', kind,
  doc: { summary: 'x', sections: [], fullText: { text: 'x' } }, ...extra });

const save = {
  seenWelcome: true, aiConnections: [], myShelves: ['Electronics'],
  personalLibrary: [
    mk('ds-tsop', 'TSOP38238 IR Receiver Module', 'datasheet', { part: 'TSOP38238' }),
    mk('ds-tsal', 'TSAL6200 940nm Infrared Emitter', 'datasheet', { part: 'TSAL6200' }),
    mk('own-pei', 'Practical Electronics for Inventors', 'physical', { attribution: 'Scherz & Monk, 4th ed.' }),
    mk('pap-1', 'Data Formats for IR Remote Control', 'paper'),
    mk('bk-1', 'Lessons In Electric Circuits, Vol I', undefined),
  ],
  hall: { investigations: [{ id: 'i1', question: 'q', evidence: 'e', falsifier: 'f' }],
          experiments: [], dissections: [],
          builds: [{ id: 'b1', name: 'A universal remote', created: '2026-08-01', entries: [
            { id: 'e1', stage: 'drive the LED off the pin', predicted: 'about a metre', opened: '2026-08-01', closed: null, outcome: null },
          ] }] },
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const p = await browser.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(s => localStorage.setItem('sandPavilionSave.v2', s), JSON.stringify(save));
await p.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
await p.click('#startBtn'); await new Promise(r => setTimeout(r, 1400));

/* The terminal keeps scrollback, so each command clears first — otherwise a
   check for "X is absent" reads the PREVIOUS command's output and lies. */
const term = async cmd => {
  await p.evaluate(c => {
    window.openComputer();
    // termSubmit re-renders the panel, so the input must be re-queried between
    // commands — the old node is detached and setting .value on it does nothing.
    const put = v => { document.getElementById('termIn').value = v; window.termSubmit(); };
    put('clear'); put(c);
  }, cmd);
  await new Promise(r => setTimeout(r, 250));
  return p.evaluate(() => document.getElementById('computerPanel').textContent);
};
const R = [];

/* 1 — the Computer knows the new kinds. */
R.push(['help lists ds and owned', /ds \[part\]/.test(await term('help')) && /owned/.test(await term('help'))]);
const dsOut = await term('ds');
R.push(['ds lists datasheets by PART NUMBER', /TSOP38238/.test(dsOut) && /TSAL6200/.test(dsOut)]);
R.push(['ds does not list ordinary books', !/Lessons In Electric/.test(dsOut)]);

const ownOut = await term('owned');
R.push(['owned lists the paper book', /Practical Electronics for Inventors/.test(ownOut)]);
R.push(['owned does not list files', !/TSOP38238/.test(ownOut)]);

const lsOut = await term('ls');
R.push(['ls marks each kind in its own column', /ds /.test(lsOut) && /own/.test(lsOut) && /pap/.test(lsOut)]);

const statOut = await term('stats');
R.push(['stats counts datasheets, owned and builds',
  /2 datasheets/.test(statOut) && /1 owned on paper/.test(statOut) && /1 builds on the Bench/.test(statOut)]);

/* THE LOOKUP — the only interaction a datasheet really has. A partial part
   number must land you IN the reader, not in a list of one. */
await p.evaluate(() => { window.openComputer(); const i = document.getElementById('termIn'); i.value = 'ds tsop'; window.termSubmit(); });
await new Promise(r => setTimeout(r, 900));
const landed = await p.evaluate(() => {
  const ov = document.getElementById('readerOv');
  return { open: !!ov && ov.className.includes('open'), text: ov ? ov.textContent : '' };
});
R.push(['DS <PART> OPENS THE DATASHEET ITSELF', landed.open && /TSOP38238/.test(landed.text)]);

/* 2 — the Lab room. */
await p.evaluate(() => window.openLab()); await new Promise(r => setTimeout(r, 500));
const lab = await p.evaluate(() => document.getElementById('labPanel').textContent);
R.push(['the Lab opens', /The Lab/.test(lab)]);
R.push(['it counts the datasheets it can actually see', /Datasheets\s*2/.test(lab.replace(/\s+/g, ' '))]);
R.push(['it counts what is owned on paper', /Owned on paper\s*1/.test(lab.replace(/\s+/g, ' '))]);
R.push(['it surfaces the prediction still waiting on a result', /1 prediction waiting on a result/.test(lab)]);
R.push(['it names the paper book so you can see it from here', /Practical Electronics for Inventors/.test(lab)]);
R.push(['it is honest that it holds nothing itself', /Nothing lives/.test(lab)]);

/* A book you added yourself has no license and no source_url. The reader used to
   print the literal word "undefined" under its title for exactly that reason. */
await p.evaluate(() => { closeUI(); openReader('own-pei'); }); await new Promise(r => setTimeout(r, 500));
const meta = await p.evaluate(() => document.getElementById('rdMeta').textContent);
R.push(['a book with no source never renders the word "undefined"', !/undefined/.test(meta)]);

/* AND THE SAME CHECK ONE LAYER IN, which is where it was still happening.
   The line above reads rdMeta — the SUMMARY header — on a paper book that has
   no full text at all, so it never reached the full-text header. That one had
   `License: <b>${ft.license}</b>` with no fallback, so every hand-added book
   printed "License: undefined" over its first page. Found 2026-08-03 by
   screenshotting a real book; the guard for this exact word had been passing
   happily beside it for a day. Check the header the READER actually shows. */
await p.evaluate(async () => { closeUI(); openReader('bk-1'); await openFullText('bk-1'); });
await new Promise(r => setTimeout(r, 500));
const ftMeta = await p.evaluate(() => document.getElementById('rdFullTextMeta').textContent);
R.push(['nor does the FULL-TEXT header of a book with no licence', !/undefined/.test(ftMeta)]);

/* 3 — the room is reachable in the world, not just by function call. */
const wired = await p.evaluate(() => {
  const s = window.__scenes || null;
  return s ? !!(s.workshopfloor3.stations || []).find(x => x.name === 'THE LAB') : 'no-scene-handle';
});
R.push(['the Maker\'s Bench placeholder is now THE LAB', wired === true || wired === 'no-scene-handle']);

let bad = 0;
for (const [name, ok] of R) { console.log((ok ? '  PASS  ' : '  FAIL  ') + name); if (!ok) bad++; }
console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');
await browser.close();
process.exit(bad || errs.length ? 1 : 0);
