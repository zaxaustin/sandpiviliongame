/* ================================================================
   [notes · carry] — the terminal fills the backpack, 2026-08-07.

   The Computer was already an index over everything on this machine
   and notes were the one thing it could not list — the largest pile
   most visitors have. With `carry` it becomes the FASTEST way to fill
   the backpack, which matters because "one keystroke to anywhere
   beats a beautiful room you must walk to" is a standing decision.

   The whole loop, end to end, exactly as the steward described it:

     notes <book>  ->  carry <n>  ->  it is on the Study Table

   No AI at any point.

     npm run build:beta && npm run preview
     node test/live/terminal-carry.mjs
   ================================================================ */
import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const R = [];
const check = (name, ok, detail) => R.push([name, !!ok, detail || '']);

const PARA = 'It runs on in ordinary sentences with nothing that reads like a heading. ';
const TEXT = Array.from({ length: 30 }, () => PARA.repeat(8)).join('\n\n');
const SLUG = 'personal-terminal-book';
const SAVE = {
  saveVersion: 2, seenWelcome: true,
  personalLibrary: [{
    slug: SLUG, title: 'A Book For The Terminal', tradition: 'Personal', personal: true,
    license: '', added: '2026-08-07', category: 'personal', attribution: 'Nobody',
    doc: { summary: '', sections: [], fullText: { text: TEXT } },
  }],
  bookNotes: { [SLUG]: [{ ts: '2026-08-07', text: 'The thought worth carrying somewhere.', page: 0 }] },
  notes: [{ id: 'x1', title: 'Unrelated to any book', body: 'nothing to do with it',
            created: '2026-08-07', updated: '2026-08-07', book: null }],
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1200, height: 1000 } });
const p = await browser.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));

await p.evaluateOnNewDocument((s) => localStorage.setItem('sandPavilionSave.v2', JSON.stringify(s)), SAVE);
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 900));
await p.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /Enter the Grounds/i.test(x.innerText));
  if (b) b.click();
});
await new Promise(r => setTimeout(r, 800));

/* Typed into the real input and submitted the real way — not by calling
   termRun(), which would prove the function works and nothing about whether
   a person can reach it. */
const run = async (cmd) => p.evaluate(async (c) => {
  const el = document.getElementById('termIn');
  if (!el) return '(no terminal input)';
  el.value = c;
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await new Promise(r => setTimeout(r, 350));
  const out = document.getElementById('termOut') || document.getElementById('computerPanel');
  /* ONLY THIS COMMAND'S OUTPUT. The terminal keeps its scrollback, so reading
     the whole pane made an assertion about `notes terminal` fail on text
     printed by the earlier `notes` — the check was right and the reading was
     wrong. Split on the prompt for the command just typed. */
  const all = out ? out.innerText : '';
  const at = all.lastIndexOf('> ' + c);
  return at >= 0 ? all.slice(at) : all;
}, cmd);

await p.evaluate(() => { window.closeUI(); window.openComputer(); });
await new Promise(r => setTimeout(r, 500));

const help = await run('help');
check('help lists the new commands', /notes \[word\]/.test(help) && /carry <number>/.test(help),
      JSON.stringify((help.match(/ {2}(notes|carry)[^\n]*/g) || [])));

const listed = await run('notes');
check('`notes` lists what you have written', /2 notes|notes:/i.test(listed),
      JSON.stringify(listed.slice(-260)));

const narrowed = await run('notes terminal');
check('`notes <book>` narrows by the BOOK\'s name, which is the obvious thing to type',
      /worth carrying/i.test(narrowed) && !/Unrelated to any book/i.test(narrowed),
      JSON.stringify(narrowed.slice(-260)));

const carried = await run('carry 1');
check('`carry 1` puts it in the backpack', /carried:/i.test(carried), JSON.stringify(carried.slice(-160)));
const held = await p.evaluate(() => window.carryList().filter(e => e.kind === 'note').length);
check('and it really is a NOTE in the bag, not a book', held === 1, 'notes held: ' + held);

const bag = await run('carry');
check('`carry` on its own shows what you are holding', /carrying 1/i.test(bag), JSON.stringify(bag.slice(-160)));

const again = await run('carry 1');
check('carrying it twice says so rather than duplicating', /already/i.test(again), JSON.stringify(again.slice(-120)));

/* AND IT ARRIVES. A terminal command that reports success while the thing
   never reaches the table is the exact silent failure this project keeps
   finding — so the loop is followed all the way to the other room. */
const table = await p.evaluate(async () => {
  window.closeUI();
  window.openPlanner();
  await new Promise(r => setTimeout(r, 300));
  window.togglePlannerTool('study');
  await new Promise(r => setTimeout(r, 900));
  const body = document.getElementById('planToolBody');
  const offered = body ? body.innerText : '';
  /* CARRYING A NOTE BUT NOT ITS BOOK used to land on "nothing on the table" —
     true and useless, when the one thing needed is named in the note you are
     holding. The table offers the book; press it, the way a person would. */
  const bring = [...(body ? body.querySelectorAll('button') : [])]
    .find(b => /Bring /.test(b.innerText));
  if (bring) bring.click();
  await new Promise(r => setTimeout(r, 900));
  const after = document.getElementById('planToolBody');
  return { offered, pressed: !!bring, text: after ? after.innerText : '' };
});
check('carrying a note without its book is not a dead end - the table offers the book, BY NAME',
      /carrying a note about/i.test(table.offered) && /A Book For The Terminal/.test(table.offered),
      JSON.stringify(table.offered.slice(0, 160)));
check('and pressing it brings the book', table.pressed);
check('THE LOOP CLOSES — the note carried from the terminal is on the Study Table',
      /Notes you brought/i.test(table.text) && /worth carrying/i.test(table.text),
      JSON.stringify(table.text.slice(0, 240)));

check('no console errors', errs.length === 0, errs.join(' | '));

await p.screenshot({ path: 'test/live/_terminal-carry.png' });
await browser.close();

let bad = 0;
for (const [n, ok, d] of R) { if (!ok) bad++; console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (d ? '  — ' + d : '')); }
console.log(bad ? `\n  ✗ ${bad} failed` : '\n  ✓ typed in the terminal, on the table in the other room.');
process.exit(bad ? 1 : 0);
