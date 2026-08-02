/* ================================================================
   [BUNDLES] — a packet of books arrives, is reviewed, and only then
   lands. Built 2026-08-02, plans/BOOK-BUNDLES-AND-THE-POOL.md.

   Three properties, each fine until the day it isn't:
     - nothing is added without a press. A bundle can carry fifty
       books; a silent bulk import turns a shelf you curated into a
       shelf you inherited.
     - a text not matching its recorded hash is refused.
     - importing the same packet twice is a no-op, not a doubled shelf.

   Deliberately a SMALL synthetic bundle rather than the real 5 MB
   welcome packet. The first version passed the real one through
   puppeteer's serializer twice and hashed nine full books, and hung
   past 100 seconds — a test slow enough to skip is one you eventually
   skip. These properties do not care how long the books are.

     npm run build:beta && npm run preview   (another terminal)
     node test/live/bundle.mjs
   ================================================================ */
import puppeteer from 'puppeteer-core';
import { createHash } from 'node:crypto';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sha = t => createHash('sha256').update(t).digest('hex');

const book = (slug, title, text) => ({
  slug, title, text, sha256: sha(text), bytes: Buffer.byteLength(text),
  attribution: 'Somebody', license: 'Public Domain', tradition: 'Classics',
  source_url: 'https://www.gutenberg.org/ebooks/1', summary: 'A short one.',
  sharing: 'pd', gathered: 'given',
});
const bundle = {
  sandPavilionBundle: 1, id: 'test-packet', title: 'A Test Packet',
  by: 'The Pavilion', made: '2026-08-02', private: false,
  message: 'Two small books.',
  books: [book('tp-one', 'The First One', 'x'.repeat(4000)),
          book('tp-two', 'The Second One', 'y'.repeat(4000))],
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const p = await browser.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(s => localStorage.setItem('sandPavilionSave.v2', s),
  JSON.stringify({ seenWelcome: true, aiConnections: [] }));
await p.goto('http://localhost:4173', { waitUntil: 'networkidle2' });
await p.click('#startBtn'); await new Promise(r => setTimeout(r, 1300));

const R = [];
const count = () => p.evaluate(() => (JSON.parse(localStorage.getItem('sandPavilionSave.v2')).personalLibrary || []).length);
const panel = () => p.evaluate(() => document.getElementById('bundlePanel').textContent.replace(/\s+/g, ' '));
const drop = async o => {
  await p.evaluate(j => {
    const dt = new DataTransfer();
    dt.items.add(new File([JSON.stringify(j)], 'packet.json', { type: 'application/json' }));
    window.handleBookDrop({ preventDefault() {}, dataTransfer: dt });
  }, o);
  await new Promise(r => setTimeout(r, 900));
};

await drop(bundle);
const t1 = await panel();
R.push(['the manifest is shown before anything lands', /A Test Packet/.test(t1) && /Nothing is added until/.test(t1)]);
R.push(['each book is named with its licence', /Public Domain/.test(t1) && /The First One/.test(t1)]);
R.push(['NOTHING WAS ADDED WITHOUT A PRESS', (await count()) === 0]);

await p.evaluate(() => window.acceptBundle()); await new Promise(r => setTimeout(r, 800));
const n1 = await count();
R.push(['accepting adds every book', n1 === 2]);
R.push(['the text really arrived', await p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('sandPavilionSave.v2'));
  const r = (s.personalLibrary || []).find(x => x.slug === 'tp-one');
  return !!(r && r.doc.fullText.text && r.doc.fullText.text.length === 4000);
})]);
R.push(['PROVENANCE TRAVELLED WITH THE BOOK', await p.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('sandPavilionSave.v2'));
  const r = (s.personalLibrary || []).find(x => x.slug === 'tp-one');
  return !!(r && r.sharing === 'pd' && r.gathered === 'given' && r.source_url && r.license);
})]);

await drop(bundle);
R.push(['a re-import reports them as already held', /already on your shelf/.test(await panel())]);
await p.evaluate(() => window.acceptBundle && window.acceptBundle()); await new Promise(r => setTimeout(r, 800));
R.push(['RE-IMPORTING THE SAME PACKET ADDS NOTHING', (await count()) === n1]);

const tampered = { ...bundle, books: [{ ...bundle.books[0], slug: 'tp-bad', title: 'Tampered', text: 'not what the hash says' }] };
await drop(tampered);
R.push(['a text failing its checksum is called out', /did not match the hash/.test(await panel())]);
await p.evaluate(() => window.acceptBundle && window.acceptBundle()); await new Promise(r => setTimeout(r, 700));
R.push(['and a tampered book is never shelved', (await count()) === n1]);

await drop({ some: 'other json', entirely: true });
R.push(['an ordinary .json is not mistaken for a bundle', (await count()) === n1]);

let bad = 0;
for (const [n, ok] of R) { console.log((ok ? '  PASS  ' : '  FAIL  ') + n); if (!ok) bad++; }
console.log('page errors:', errs.length ? errs.slice(0, 3) : 'none');
await browser.close();
process.exit(bad || errs.length ? 1 : 0);
