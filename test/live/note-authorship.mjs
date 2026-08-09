/* [NOTE AUTHORSHIP] — nobody's words are read back as somebody else's.
   ======================================================================
   THE BUG, precisely. saveAiBookNote() wrote the assistant's prose into
   data.bookNotes marked by nothing but a '✨ ' at the front of the text.
   gatherNotes() pulled every book note into the pool the residents search and
   dropped even that. And deskDraftLesson() handed the lot to a model under

       THEIR OWN NOTES ON THIS BOOK:

   so the assistant's own earlier output came back to it as the visitor's
   writing — and was then used to judge what the visitor understood.

   `npm test` guard B holds the shape: the predicate exists, no .filter()
   decides authorship by string, every reader of data.bookNotes is declared.
   IT CANNOT SEE THE ONE THING THAT MATTERS, which is what a model is actually
   sent. So this suite reads the request body off the wire.

   THE FIXTURE IS A LEGACY NOTE ON PURPOSE. The AI note here has NO `by` field
   — exactly the shape of the 415 books' worth already on the steward's disk.
   If the read-time backfill does not work, every assertion below fails, which
   is the point: a save written before today must not be left mislabelled.

   Needs `npm run preview` on :4173. */
import puppeteer from 'puppeteer-core';
import http from 'node:http';
/* The house fixture — a book the way a real one arrives, through
   personalLibrary. CLAUDE.md rule 1. A hand-rolled card here opened to an
   empty Reader and cost a run. */
import { inlineBook, A_BOOK } from './_books.mjs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SLUG = A_BOOK;

let failed = 0;
const ok = (name, cond, detail) => {
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (detail ? '  — ' + detail : ''));
  if (!cond) failed++;
};

/* ---------- the fake model, which is here to be EAVESDROPPED ON ---------- */
let lastPrompt = null;
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
      { name: 'testmodel:8b', model: 'testmodel:8b', size: 4_500_000_000, capabilities: ['completion'] }] }));
  }
  if (req.url.startsWith('/api/ps')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ models: [] }));
  }
  if (req.url.startsWith('/api/chat')) {
    let raw = '';
    req.on('data', c => { raw += c; });
    req.on('end', () => {
      try { lastPrompt = JSON.parse(raw); } catch (e) { lastPrompt = { parseError: String(e), raw }; }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: { content: '1. Read it again, slowly.' }, done: true }));
    });
    return;
  }
  res.writeHead(404); res.end('{}');
});
await new Promise((r, e) => { server.on('error', e); server.listen(0, '127.0.0.1', r); });
const PORT = server.address().port;

/* ---------- the save: one note of each kind, the AI one in the LEGACY shape ---------- */
const MINE = 'Assent is the only thing wholly ours, and I keep forgetting it.';
const THEIRS = '✨ Analysis of this page (AI)\nThe passage turns on the distinction between what is up to us and what is not.';
const save = {
  seenWelcome: true,
  aiConnections: [{ id: 'test-ollama', name: 'Test Ollama', kind: 'ollama',
                    baseUrl: 'http://127.0.0.1:' + PORT, enabled: true, builtin: false }],
  personalLibrary: [inlineBook()],
  /* NO `by` ON EITHER — this is a save written before the field existed. */
  bookNotes: { [SLUG]: [
    { ts: '2026-08-08', text: MINE, page: 3 },
    { ts: '2026-08-08', text: THEIRS, page: 3 },
  ] },
};

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1100, height: 950 } });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(s => localStorage.setItem('sandPavilionSave.v2', s), JSON.stringify(save));
await p.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
await p.click('#startBtn');
await new Promise(r => setTimeout(r, 2200));
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ---------- 1 · THE READER: TELLABLE APART AT A GLANCE ---------- */
console.log('\nThe Reader — two notes, two authors\n');
await p.evaluate(s => window.openReader(s), SLUG);
await wait(800);
const shown = await p.evaluate(() => {
  const cards = [...document.querySelectorAll('#rdNotesList .card')];
  return cards.map(c => ({
    head: c.querySelector('.s') ? c.querySelector('.s').textContent.replace(/\s+/g, ' ').trim() : '',
    body: (c.children[1] ? c.children[1].textContent : '').slice(0, 40),
  }));
});
console.log('   ', JSON.stringify(shown, null, 0).slice(0, 300));
await p.screenshot({ path: 'test/live/_authorship-reader.png' });

ok('both notes are on the page', shown.length === 2, shown.length + ' cards');
const mineCard = shown.find(c => c.body.startsWith('Assent'));
const aiCard = shown.find(c => c.body.startsWith('✨'));
ok('the visitor\'s own note is attributed to them',
  !!mineCard && /user 1/.test(mineCard.head) && !/AI/i.test(mineCard.head),
  mineCard ? mineCard.head : 'not found');
ok('AND THE LEGACY AI NOTE IS ATTRIBUTED TO THE AI, with no `by` field in the save',
  !!aiCard && /AI/i.test(aiCard.head),
  aiCard ? aiCard.head : 'not found');
ok('the two are tellable apart at a glance — the headings differ',
  !!mineCard && !!aiCard && mineCard.head !== aiCard.head);

/* ---------- 2 · WHAT THE MODEL IS ACTUALLY SENT ----------
   The only check that can see the real bug. Everything above could be perfect
   while the prompt still says "their own notes". */
console.log('\nThe Writing Desk — what actually goes over the wire\n');
/* pocket the book so the desk has one in front of it — the same path a
   visitor takes: open it, press ↓, walk to the desk. */
await p.evaluate(() => window.minimizeReader());
await wait(400);
await p.evaluate(() => { window.closeUI(); window.openPlanner(); });
await wait(500);
await p.evaluate(() => window.togglePlannerTool('book'));
await wait(500);

const deskShown = await p.evaluate(() => {
  const el = document.getElementById('planToolBody');
  return el ? el.textContent.replace(/\s+/g, ' ').slice(0, 400) : '';
});
ok('the desk names the author on its own note list',
  /user 1/.test(deskShown) && /AI/i.test(deskShown), deskShown.slice(0, 160));
await p.screenshot({ path: 'test/live/_authorship-desk.png' });

lastPrompt = null;
await p.evaluate(() => window.deskDraftLesson());
await wait(2500);

if (!lastPrompt) {
  ok('the desk actually called the model', false, 'no request reached the fake endpoint');
} else {
  const sent = (lastPrompt.messages || []).map(m => m.content).join('\n---\n');
  const line = (re) => (sent.match(re) || [''])[0];
  console.log('    prompt excerpt:', (sent.match(/NOTES ON THIS BOOK[\s\S]{0,240}/) || [''])[0]
    .replace(/\s+/g, ' ').slice(0, 240));

  ok('THE MODEL IS NO LONGER TOLD A PERSON WROTE ITS OWN OUTPUT',
    !/THEIR OWN NOTES ON THIS BOOK/.test(sent),
    /THEIR OWN NOTES ON THIS BOOK/.test(sent) ? 'still says "THEIR OWN NOTES ON THIS BOOK"' : 'gone');
  /* AND ITS SECOND LINE IS INDENTED UNDER THE LABEL. An AI note always runs to
     more than one line (it opens with its own "✨ Analysis… (AI)" heading), and
     written flat, "- [the AI] heading\nThe passage turns on…" reads as a SECOND
     list item with no attribution at all — the original bug in miniature.
     Checking only for the label would have passed straight over that. */
  ok('the AI note arrives labelled as the AI\'s',
    /- \[the AI[^\]]*\][^\n]*\n\s{4}The passage turns on/.test(sent),
    line(/- \[[^\]]*\][^\n]*\n\s*The passage turns on[^\n]{0,15}/) || 'no labelled AI line found');
  ok('and no continuation line is left looking like an unattributed note',
    !/^- (?!\[)/m.test(sent), 'every "- " line carries a [author]');
  ok('the visitor\'s note arrives labelled as theirs',
    /\[user 1\][^\n]*Assent is the only thing/.test(sent),
    line(/\[[^\]]*\][^\n]*Assent is the only thing[^\n]{0,20}/) || 'no labelled own line found');
  ok('and the prompt says which name is the reader being helped',
    /"user 1" is the reader you are helping/.test(sent));
  ok('BOTH notes still reach the model — attribution, not exclusion',
    /passage turns on/.test(sent) && /Assent is the only thing/.test(sent));
}

console.log('\npage errors:', errs.length ? errs.slice(0, 3) : 'none');
console.log('screenshots -> test/live/_authorship-*.png');
await b.close(); server.close();
process.exit(failed || errs.length ? 1 : 0);
