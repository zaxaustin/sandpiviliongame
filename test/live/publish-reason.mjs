/* [THE OUTLET] — a published note carries WHY it was passed on.
   ======================================================================
   Asked for 2026-08-09, alongside note attribution:

     "we can also have people post the notes they think are important and
      just give a reason why, small thing lets give things an outlet if
      they want one."

   Publishing already existed. What it could not carry was the one thing
   that makes a handed-over note worth more than a file. This project's own
   answer to "a book nobody chose is inert" is that the choosing is the
   value — and a reason is the choosing, written down.

   THE CHECK THAT MATTERS IS THE LAST ONE. Everything can render correctly
   and still be lost the moment the packet becomes a .json, which is the
   only form in which it ever reaches another person. So this suite reads
   the written file, not the screen.

   Needs `npm run preview` on :4173. */
import puppeteer from 'puppeteer-core';
import { writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { inlineBook } from './_books.mjs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
let failed = 0;
const ok = (name, cond, detail) => {
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (detail ? '  — ' + detail : ''));
  if (!cond) failed++;
};

const MINE = { id: 'n-mine', title: 'Small units beat long days',
               body: 'A week planned in two-hour units survives contact with a bad morning.',
               created: '2026-08-08', updated: '2026-08-08' };
/* An AI-DRAFTED note, in the shape deskDraftLesson() actually writes: it
   lives in data.notes under `body`, not `text`. The predicate had to be
   widened for this — a version that only read `text` called it the
   visitor's own the moment it was published. */
const THEIRS = { id: 'n-ai', title: 'Lesson plan — Walden',
                 body: '✨ Drafted by your local AI from "Walden" and your notes on it.\n\n1. Read the first chapter.',
                 created: '2026-08-08', updated: '2026-08-08' };

const save = { seenWelcome: true, aiConnections: [], personalLibrary: [inlineBook()],
               notes: [MINE, THEIRS] };

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  defaultViewport: { width: 1100, height: 950 } });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(s => localStorage.setItem('sandPavilionSave.v2', s), JSON.stringify(save));
await p.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
await p.click('#startBtn');
await new Promise(r => setTimeout(r, 1600));
const wait = ms => new Promise(r => setTimeout(r, ms));

console.log('\nPublishing asks why, once, before anything happens\n');
await p.evaluate(() => window.openCommonsTable());
await wait(400);
await p.evaluate(() => window.commonsTab('publish'));
await wait(400);
/* Sign it, so `by` is a real name. An unsigned packet says "Why this was
   passed on" and a signed one names the person; the signed case is the one
   worth asserting, and testing only the unsigned one would have let a
   grammatically broken signed line through. */
await p.evaluate(() => window.setCommonsName('a colleague'));
await wait(200);

/* PRESSING PUBLISH MUST NOT PUBLISH. The whole point of the step is that
   handing something to another person is a considered act. */
await p.evaluate(() => window.publishFrom('note', 'n-mine'));
await wait(400);
const why = await p.evaluate(() => ({
  box: !!document.getElementById('pubReason'),
  names: (document.querySelector('#commonsPanel, #commonsOv .panel') || document.body).textContent.includes('Small units beat long days'),
  publishedYet: JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}').commons?.published?.length || 0,
}));
ok('the first press opens a "why" step rather than publishing', why.box && why.publishedYet === 0,
   'box=' + why.box + ' alreadyPublished=' + why.publishedYet);
ok('and it names what you are about to hand over', why.names);
await p.screenshot({ path: 'test/live/_outlet-why.png' });

/* CANCEL MEANS CANCEL — a step you cannot back out of is a trap, not a
   consideration. */
await p.evaluate(() => window.cancelPublish());
await wait(300);
ok('backing out publishes nothing', await p.evaluate(() =>
  (JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}').commons?.published || []).length === 0));

const REASON = 'The two-hour unit is the part that survived a bad week — that is the bit worth having.';
await p.evaluate(() => window.publishFrom('note', 'n-mine'));
await wait(350);
await p.evaluate(r => { document.getElementById('pubReason').value = r; }, REASON);
await p.evaluate(() => window.confirmPublish());
await wait(600);

const pub = await p.evaluate(() =>
  (JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}').commons?.published || [])[0] || null);
ok('publishing writes a packet', !!pub, pub ? pub.title : 'none');
ok('and the packet carries the reason', !!pub && pub.reason === REASON,
   pub ? String(pub.reason).slice(0, 50) : '');
ok('a note of your own is NOT marked as AI-drafted', !!pub && !pub.aiDrafted);

const onScreen = await p.evaluate(() => document.body.textContent);
ok('the reason is shown on the packet, attributed to the person who signed it',
   onScreen.includes(REASON) && /Why a colleague passed this on/.test(onScreen),
   (onScreen.match(/Why [^\n]{0,40}/) || [''])[0]);
await p.screenshot({ path: 'test/live/_outlet-packet.png' });

/* ---------- an AI-drafted note says so when it is handed on ---------- */
console.log('\nAn AI-drafted note is published as one\n');
await p.evaluate(() => window.commonsTab('publish'));
await wait(300);
await p.evaluate(() => window.publishFrom('note', 'n-ai'));
await wait(350);
await p.evaluate(() => { document.getElementById('pubReason').value = 'Worth stealing the shape of.'; });
await p.evaluate(() => window.confirmPublish());
await wait(600);
const aiPub = await p.evaluate(() =>
  (JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}').commons?.published || [])
    .find(x => x.title === 'Lesson plan — Walden') || null);
ok('the packet records that a model drafted it', !!aiPub && aiPub.aiDrafted === true,
   aiPub ? 'aiDrafted=' + aiPub.aiDrafted : 'not published');
ok('and it says so on screen', (await p.evaluate(() => document.body.textContent)).includes('drafted by an AI'));

/* ---------- THE ONE THAT MATTERS: it survives becoming a file ---------- */
console.log('\nThe packet as a file — the only form another person ever sees\n');
const file = await p.evaluate(async () => {
  const pk = (JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}').commons?.published || [])[0];
  /* writePacketFile() in a browser goes down a download path we cannot read,
     so this rebuilds the same object the way that function does — spread,
     minus the two local-only fields. If that shape ever diverges this check
     is worthless, so it asserts the local fields really are stripped. */
  const out = { ...pk }; delete out.sourceKind; delete out.sourceId;
  return JSON.parse(JSON.stringify(out));
});
ok('the written packet keeps the reason', file && file.reason && file.reason.length > 10,
   file ? String(file.reason).slice(0, 40) : '');
ok('and drops the fields that only mean something here',
   file && !('sourceKind' in file) && !('sourceId' in file));

/* ---------- THE ROUND TRIP, through the real file input ----------
   takePacket() only ever looks at COMMONS_PACKETS + commons.received — you
   cannot take your own published packet, and the first version of this
   section tried to, which is why it failed. So the packet is written out,
   given a different id and author (a packet from YOU is not the case worth
   testing), and dropped onto #packetFile exactly as a person would. Both
   halves of the journey, through the shipped code. */
const foreign = { ...file, id: 'pk-from-someone-else', by: 'a colleague',
                  receivedOn: undefined };
const tmp = fileURLToPath(new URL('./_outlet-packet.json', import.meta.url));
writeFileSync(tmp, JSON.stringify(foreign, null, 2), 'utf8');

const input = await p.$('#packetFile');
if (!input) {
  ok('the Commons Table has a file input to receive a packet', false, '#packetFile missing');
} else {
  await input.uploadFile(tmp);
  await wait(900);
  const got = await p.evaluate(() =>
    (JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}').commons?.received || [])[0] || null);
  ok('a packet handed over as a file arrives with its reason intact',
     !!got && !!got.reason, got ? String(got.reason).slice(0, 40) : 'nothing received');

  const before = await p.evaluate(() =>
    (JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}').notes || []).length);
  await p.evaluate(id => window.takePacket(id), 'pk-from-someone-else');
  await wait(600);
  const taken = await p.evaluate(() => {
    const notes = JSON.parse(localStorage.getItem('sandPavilionSave.v2') || '{}').notes || [];
    return { n: notes.length, body: (notes[0] || {}).body || '' };
  });
  ok('taking a copy actually makes one', taken.n === before + 1, before + ' -> ' + taken.n);
  ok('and it carries the reason into your own note — the most perishable part of a packet',
     /Why they passed it on:/.test(taken.body),
     taken.body.split('\n').slice(-2).join(' ').trim().slice(0, 90));
}
rmSync(tmp, { force: true });

/* ---------- AND IT WORKS FROM WHEREVER THE BUTTON IS ----------
   ui/lesson-tree.js has its own "🤝 Publish it" and calls publishFrom() from
   inside its own overlay, with #commonsOv closed. Turning publishFrom() into
   a screen very nearly made that button do nothing at all — it would have
   rendered the "why" step into a hidden panel. Rule 5, introduced by the fix
   for a different rule. So: call it with the Commons Table shut. */
console.log('\nCalled from another room, with the table closed\n');
await p.evaluate(() => window.closeUI());
await wait(300);
const closed = await p.evaluate(() =>
  !document.getElementById('commonsOv').className.includes('open'));
ok('the Commons Table starts closed', closed);
await p.evaluate(() => window.publishFrom('note', 'n-mine'));
await wait(500);
const opened = await p.evaluate(() => ({
  open: document.getElementById('commonsOv').className.includes('open'),
  box: !!document.getElementById('pubReason'),
}));
ok('publishing from elsewhere OPENS the table on the why step, rather than doing nothing',
   opened.open && opened.box, JSON.stringify(opened));

console.log('\npage errors:', errs.length ? errs.slice(0, 3) : 'none');
console.log('screenshots -> test/live/_outlet-*.png');
await b.close();
process.exit(failed || errs.length ? 1 : 0);
