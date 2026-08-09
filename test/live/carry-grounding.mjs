/* ================================================================
   [THE BACKPACK IS THE CONTEXT] — 2026-08-08.

   groundingFor() was written, tested and documented on 2026-08-07 and
   HAD NO CALLER for a day. carrying.js said "what you carry is what a
   resident can see"; visibility.js said the backpack "is the one store
   a resident is allowed to read"; no resident read it. Every unit test
   passed the entire time, because a pure function with no caller is
   perfectly testable and completely inert.

   So this suite does the one thing npm test cannot: it presses the real
   buttons in a real browser and reads what the panel actually SAYS.

     npm run build:beta && npm run preview
     node test/live/carry-grounding.mjs

   RULE 1 - the fixture carries a book the player ADDED, not only a seed
   one: a seed book resolves through seed.js and a dragged-in book
   through data.personalLibrary, and carriedLines() calls Store.getDoc()
   for both.

   NO AI IS CONNECTED, on purpose. Every assertion below is about what
   the app assembles and shows, which is the half that must be right
   before a model ever sees it.
   ================================================================ */
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const R = [];
const check = (name, ok, detail) => R.push([name, !!ok, detail || '']);

/* One seed book, one book added by hand, three notes - one of which the
   visitor has SEALED, and one set aside for later rather than held. */
const SAVE = {
  saveVersion: 1, seenWelcome: true,
  personalLibrary: [{
    slug: 'personal-epub-import', title: 'A Book You Dragged In', tradition: 'Personal',
    personal: true, license: '', added: '2026-08-08', category: 'personal', attribution: 'Someone',
    doc: { summary: '', sections: [], fullText: { text: 'A paragraph.\n\nAnd another one.' } },
  }, {
    /* WAS `dhammapada`, A SEED BOOK, until 2026-08-10. The seed shelf is
       gone and — far more to the point — a seed book was never what this
       suite should have been proving anything against. See _books.mjs. */
    slug: 'personal-walden', title: 'Walden', tradition: 'Non-fiction',
    personal: true, license: 'Personal — license not certified', added: '2026-08-08',
    category: 'personal', attribution: 'Henry David Thoreau',
    doc: { summary: 'Two years beside a pond.', sections: [],
           fullText: { text: 'I went to the woods because I wished to live deliberately.\n\nAnd another paragraph.' } },
  }],
  notes: [
    { id: 'n-open',  title: 'On impermanence', body: 'Everything that arises passes away.', created: '2026-08-01', updated: '2026-08-01' },
    { id: 'n-shut',  title: 'Something private', body: 'Nobody reads this but me.', created: '2026-08-02', updated: '2026-08-02' },
    { id: 'n-third', title: 'A third note', body: 'Filler so the list is not trivial.', created: '2026-08-03', updated: '2026-08-03' },
  ],
  // sealed BEFORE the first load, so this is a real save state and not a click
  noteReach: { 'mynotes:n-shut': 'sealed' },
  carrying: [
    { kind: 'book', ref: 'personal-walden',      label: 'Walden', since: '2026-08-08' },
    { kind: 'book', ref: 'personal-epub-import', label: 'A Book You Dragged In', since: '2026-08-08' },
    { kind: 'note', ref: 'mynotes:n-open',       label: 'On impermanence', since: '2026-08-08' },
    { kind: 'note', ref: 'mynotes:n-shut',       label: 'Something private', since: '2026-08-08' },
    // on the shelf, NOT in hand - must never be grounding
    { kind: 'note', ref: 'mynotes:n-third',      label: 'A third note', since: '2026-08-08', later: true },
  ],
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1200, height: 1000 } });
const p = await browser.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));

await p.evaluateOnNewDocument((s) => {
  localStorage.setItem('sandPavilionSave.v2', JSON.stringify(s));
}, SAVE);
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 800));
await p.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /Enter the Grounds/i.test(x.innerText));
  if (b) b.click();
});
await new Promise(r => setTimeout(r, 900));

// ---- 1 · the backpack panel, and what it says a resident can see -------
await p.evaluate(() => window.openInventory());
await new Promise(r => setTimeout(r, 400));
const bag = await p.evaluate(() => {
  const el = document.getElementById('inventoryPanel');
  return { text: el.innerText, html: el.innerHTML };
});

check('the bag opens at all', /Your Backpack/i.test(bag.text), bag.text.slice(0, 80));
/* THE METER. Four things carried in hand; the sealed note is not one a
   resident may see, so it must say 3 of 4 - not 4, and not 5 (the shelf). */
check('the meter states what a resident can see', /visible to a resident/i.test(bag.text),
  bag.text.split('\n').find(l => /visible/i.test(l)) || 'NO METER LINE AT ALL');
check('the meter counts 3 of 4 (the sealed note is not seen)', /\b3\b of 4/.test(bag.text),
  (bag.text.match(/\d+ of \d+ things? (?:is|are) visible/) || ['NO COUNT'])[0]);
check('the meter names the sealed note', /1 .{0,3}sealed/i.test(bag.text),
  (bag.text.match(/\d+ .{0,3}sealed[^.]*/i) || ['NOT MENTIONED'])[0]);

/* NOTES IN THE BAG WERE INVISIBLE IN THIS PANEL until today - it rendered
   carriedOf(...,'book') and nothing else, so a note you carried simply did
   not appear. A panel showing half of what a resident reads is worse than
   one showing none of it. */
check('a carried NOTE is shown in the bag', /On impermanence/.test(bag.text), 'the notes section is missing');
check('the sealed note is SHOWN, not hidden', /Something private/.test(bag.text),
  'a bag that silently drops what it holds is not a boundary anyone can read');
check('the sealed note wears its badge', /Sealed/.test(bag.text), 'no seal badge on the card');
check('the shelf is NOT in the bag list', !/A third note/.test(bag.text.split('Pick up later')[0]),
  'a set-aside note appeared among the carried ones');
check('per-item marks are present', (bag.html.match(/👁 seen/g) || []).length >= 3,
  'expected a seen badge on each visible item, got ' + (bag.html.match(/👁 seen/g) || []).length);
/* The token bar is OFF by default - the steward asked for it behind a
   setting, and a default-on technical readout is noise for everyone else. */
check('the token bar is off by default', !/tokens of room/i.test(bag.text), 'the bar showed without being switched on');

await p.screenshot({ path: 'test/live/_carry-grounding.png' });

// ---- 2 · turn the meter on, and it must agree with the prompt ----------
await p.evaluate(() => window.toggleContextMeter());
await new Promise(r => setTimeout(r, 300));
await p.evaluate(() => window.openInventory());
await new Promise(r => setTimeout(r, 300));
const withBar = await p.evaluate(() => document.getElementById('inventoryPanel').innerText);
check('the token bar appears once switched on', /tokens of room/i.test(withBar),
  'the setting did nothing - a control that does nothing is the house failure mode');
const shown = (withBar.match(/~([\d,]+) of ([\d,]+) tokens/) || []);
check('the bar reports a real number', shown[1] && Number(shown[1].replace(/,/g, '')) > 0,
  'reported ' + (shown[1] || 'nothing'));

await p.screenshot({ path: 'test/live/_carry-meter.png' });

/* THE ONE THAT MATTERS: the number on screen is the number in the prompt.
   A meter with its own idea of the answer is the store.js scar in miniature.
   Quill's system prompt is built the same way sendChatMessage builds it. */
const truth = await p.evaluate(async () => {
  const prompt = await window.previewPrompt('quill');
  return { prompt, len: prompt.length };
});
check('the carried block reaches Quill', /WHAT THE VISITOR IS CARRYING/.test(truth.prompt),
  'the backpack is not in the prompt at all - groundingFor() is inert again');
check("the carried BOOK is named", /Walden/.test(truth.prompt), 'a carried book of your own is missing');
check('the book you ADDED is named', /A Book You Dragged In/.test(truth.prompt),
  'a hand-added book resolves through personalLibrary and was dropped');
check('the carried note reaches the prompt', /impermanence/i.test(truth.prompt), 'a carried note is missing');
/* THE HEADLINE ASSERTION OF THIS WHOLE SESSION. */
check('THE SEALED NOTE IS NOT IN THE PROMPT', !/Nobody reads this but me/.test(truth.prompt),
  'A SEALED NOTE REACHED THE MODEL');
check('the shelved note is not in the prompt', !/Filler so the list/.test(truth.prompt),
  'a set-aside note reached the model - the shelf is not the bag');

// ---- 3 · the second send button, locked with no database --------------
await p.evaluate(() => window.closeUI());
/* Opened the way a person opens it — from a note card, through a real
   window export — rather than by reaching for internals a visitor cannot. */
await p.evaluate(() => window.talkToMonkAboutNote('mynotes:n-open'));
await new Promise(r => setTimeout(r, 400));
const btn = await p.evaluate(() => {
  const b = document.getElementById('askNotesBtn');
  return b ? { shown: b.style.display !== 'none', locked: b.dataset.locked,
               text: b.textContent, title: b.title } : null;
});
check('the 🔎 button exists', !!btn, 'no second send button in the chat');
check('it is visible', btn && btn.shown, 'hidden entirely rather than locked');
/* A browser tab has no desktop bridge and therefore no database. LOCKED with
   the reason, never absent-and-silent and never a quieter search. */
check('with no database it shows as locked', btn && btn.locked === '1' && btn.text === '🔒',
  'it looked available in a browser, which has no database');

/* PRESSING A LOCKED CONTROL MUST ANSWER. Found by reading the screenshot:
   the first version used `disabled`, which dimmed it by a fraction nobody
   notices and did NOTHING on click, with the only explanation in a tooltip
   that never appears on a first look. A button that does nothing is the
   house failure mode wearing a lock icon. */
await p.evaluate(() => window.sendCurrentChatMessageWithNotes());
await new Promise(r => setTimeout(r, 300));
const locked = await p.evaluate(() => document.getElementById('chatQuickActions').innerText);
check('pressing it explains, out loud', /desktop app/i.test(locked),
  'pressing the locked button did nothing visible: ' + locked.slice(0, 80));
check('and it does not pretend the rest is broken', /backpack/i.test(locked),
  'the lock message does not say what still works');

await p.screenshot({ path: 'test/live/_ask-notes-locked.png' });

/* ---- 3b · THE GROUNDING RECEIPT, under the reply ---------------------

   Added 2026-08-08 after the first real model was pointed at these prompts.
   Asked to build a course from two carried notes, the Tutor's REASONING named
   both precisely and its ANSWER named neither — so a visitor had no way to
   know it had read anything. On an 8B that will not become reliable by asking
   harder.

   Rule 7: the app KNOWS what it put in the prompt, so the app says it. This
   line is computed from carryGrounding() — the same call the backpack meter
   uses and the same one that built the block — so it is right every time and
   costs no tokens. It is also the trust story made visible: "what you carry is
   what a resident can see" becomes something you can read under every reply
   rather than a promise. */
const receipt = await p.evaluate(() => document.getElementById('chatQuickActions').innerText);
check('the chat says what it is grounded in', /(Answered with|They can see) what you are carrying/i.test(receipt),
  receipt.slice(0, 120) || '(empty)');
check("...and names the carried book", /Walden/.test(receipt), receipt.slice(0, 160));
check('...and counts the carried notes', /note/i.test(receipt), receipt.slice(0, 160));
/* The sealed one is REPORTED as withheld here too. A receipt that quietly
   omitted it would be the bag lying about what it holds, one screen further on. */
check('...and says the sealed note was not read', /sealed, not read/i.test(receipt),
  receipt.slice(0, 200));

await p.screenshot({ path: 'test/live/_grounded-line.png' });

// ---- 4 · the seal can be set by hand, and the meter follows -----------
await p.evaluate(() => window.closeUI());
await p.evaluate(() => window.toggleNoteSeal('mynotes:n-open'));
await new Promise(r => setTimeout(r, 300));
const after = await p.evaluate(async () => {
  const prompt = await window.previewPrompt('quill');
  window.openInventory();
  return { prompt, bag: document.getElementById('inventoryPanel').innerText };
});
check('sealing a note removes it from the prompt', !/Everything that arises/.test(after.prompt),
  'the note was still handed over after being sealed');
check('and the meter drops to 2 of 4', /\b2\b of 4/.test(after.bag),
  (after.bag.match(/\d+ of \d+ things? (?:is|are) visible/) || ['NO COUNT'])[0]);

// ---- report -----------------------------------------------------------
check('no page errors', errs.length === 0, errs.join(' | '));
await browser.close();

const bad = R.filter(r => !r[1]);
for (const [name, ok, detail] of R) console.log((ok ? '  ok  ' : '  FAIL') + '  ' + name + (ok ? '' : '  <- ' + detail));
console.log('\n' + (R.length - bad.length) + '/' + R.length + ' checks passed.');
writeFileSync('test/live/_carry-grounding.txt', R.map(r => (r[1] ? 'ok   ' : 'FAIL ') + r[0] + (r[1] ? '' : '  <- ' + r[2])).join('\n'));
process.exit(bad.length ? 1 : 0);
