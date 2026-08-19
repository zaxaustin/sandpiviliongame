/* [MEASURE AN EPUB] — what the shipped reader actually gets out of a file.
   Runs the REAL src/game/epub.js (it imports nothing, so it can be injected
   whole into a blank page) plus a zip inventory, and prints the numbers.

   Usage: node test/live/_measure-epub.mjs "C:/path/to/book.epub" [...more]
   Needs nothing running — it uses about:blank. */
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const files = process.argv.slice(2);
if (!files.length) { console.error('give me one or more .epub paths'); process.exit(2); }

const epubSrc = readFileSync(new URL('../../src/game/epub.js', import.meta.url), 'utf8')
  .replace(/^export /gm, '');

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const p = await b.newPage();
p.on('pageerror', e => console.log('  PAGEERROR ' + e.message));
await p.goto('about:blank');
await p.evaluate(epubSrc);

/* the zip inventory, using the same central-directory walk the reader uses.
   Uncompressed size lives at +24 in each central-directory entry, which
   readZipIndex does not keep — so this reads it directly. */
await p.evaluate(() => {
  window.inventory = (ab) => {
    const dv = new DataView(ab), bytes = new Uint8Array(ab), dec = new TextDecoder('utf-8');
    let eocd = -1;
    for (let i = ab.byteLength - 22; i >= Math.max(0, ab.byteLength - 22 - 65536); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    const count = dv.getUint16(eocd + 10, true);
    let q = dv.getUint32(eocd + 16, true);
    const out = [];
    for (let n = 0; n < count; n++) {
      if (dv.getUint32(q, true) !== 0x02014b50) break;
      const compSize = dv.getUint32(q + 20, true);
      const rawSize = dv.getUint32(q + 24, true);
      const fnLen = dv.getUint16(q + 28, true);
      const extraLen = dv.getUint16(q + 30, true);
      const commentLen = dv.getUint16(q + 32, true);
      out.push({ name: dec.decode(bytes.subarray(q + 46, q + 46 + fnLen)), compSize, rawSize });
      q += 46 + fnLen + extraLen + commentLen;
    }
    return out;
  };
  /* how many <img> the spine's XHTML actually references — the number the
     walker silently drops today. */
  window.imgRefs = async (ab) => {
    const zip = readZipIndex(ab);
    const containerXml = await readEntry(zip, 'META-INF/container.xml');
    const cdoc = new DOMParser().parseFromString(containerXml, 'application/xml');
    const opfPath = cdoc.getElementsByTagName('rootfile')[0].getAttribute('full-path');
    const odoc = new DOMParser().parseFromString(await readEntry(zip, opfPath), 'application/xml');
    const g = ln => Array.from(odoc.getElementsByTagNameNS('*', ln));
    const manifest = new Map(), types = new Map();
    for (const it of g('item')) {
      manifest.set(it.getAttribute('id'), it.getAttribute('href'));
      types.set(it.getAttribute('href'), it.getAttribute('media-type'));
    }
    const cover = g('item').find(it => (it.getAttribute('properties') || '').includes('cover-image'));
    const metaCover = g('meta').find(m => m.getAttribute('name') === 'cover');
    const base = opfPath.split('/').slice(0, -1).join('/');
    let imgs = 0, withAlt = 0, spine = 0;
    for (const ir of g('itemref')) {
      const href = manifest.get(ir.getAttribute('idref'));
      if (!href) continue;
      spine++;
      let xhtml = null;
      try { xhtml = await readEntry(zip, resolvePath(base, href)); } catch (e) { continue; }
      if (!xhtml) continue;
      let d = new DOMParser().parseFromString(xhtml, 'application/xhtml+xml');
      if (d.querySelector('parsererror')) d = new DOMParser().parseFromString(xhtml, 'text/html');
      for (const im of d.querySelectorAll('img,image')) {
        imgs++;
        if ((im.getAttribute('alt') || '').trim()) withAlt++;
      }
    }
    return { spine, imgs, withAlt,
             coverId: cover ? cover.getAttribute('href') : (metaCover ? manifest.get(metaCover.getAttribute('content')) : null),
             manifestImages: [...types.entries()].filter(([, t]) => t && t.startsWith('image/')).length };
  };
});

const KB = n => (n / 1024).toFixed(0) + ' KB';
const MB = n => (n / 1048576).toFixed(1) + ' MB';

for (const f of files) {
  const buf = readFileSync(f);
  console.log('\n══ ' + basename(f) + '  (' + MB(buf.length) + ' on disk)');
  const b64 = buf.toString('base64');
  await p.evaluate(s => {
    const bin = atob(s), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    window.__ab = u8.buffer;
    window.__file = new File([u8], 'book.epub');
  }, b64);

  const inv = await p.evaluate(() => window.inventory(window.__ab));
  const imgEntries = inv.filter(e => /\.(jpe?g|png|gif|svg|webp)$/i.test(e.name));
  const imgRaw = imgEntries.reduce((a, e) => a + e.rawSize, 0);
  const imgComp = imgEntries.reduce((a, e) => a + e.compSize, 0);

  const refs = await p.evaluate(() => window.imgRefs(window.__ab));
  const t0 = Date.now();
  const res = await p.evaluate(() => epubToText(window.__file).then(r => ({
    title: r.title, author: r.author, chars: r.body.length,
    figs: r.images.length,
    figBytes: r.images.reduce((a, i) => a + i.bytes.length, 0),
    withAlt: r.images.filter(i => i.alt).length,
    marks: (r.body.match(/⟦fig:\d+⟧/g) || []).length,
    unreadable: r.unreadableImages,
    cover: r.cover ? (r.cover.path + (r.cover.guessed ? ' (guessed — none declared)' : '')) : null,
    coverBytes: r.cover ? r.cover.bytes.length : 0,
  })).catch(e => ({ error: e.message })));
  const ms = Date.now() - t0;

  if (res.error) { console.log('  epubToText THREW: ' + res.error); continue; }
  console.log(`  title   : ${res.title}`);
  console.log(`  author  : ${res.author}`);
  console.log(`  spine   : ${refs.spine} documents`);
  console.log(`  TEXT    : ${res.chars.toLocaleString()} chars  (${KB(res.chars)})  in ${ms} ms`);
  console.log(`  IMAGES  : ${refs.imgs} <img> in the spine, ${refs.withAlt} with alt text`);
  console.log(`            ${imgEntries.length} image files in the zip`);
  console.log(`            ${MB(imgRaw)} uncompressed / ${MB(imgComp)} stored`);
  const pct = (imgComp / buf.length * 100).toFixed(1);
  console.log(`  ⇒ ${pct}% of this file is pictures, and the reader keeps ${KB(res.chars)} of text.`);
  console.log('  ── what epubToText() now hands back ──');
  console.log(`  figures : ${res.figs} carried with real bytes (${MB(res.figBytes)}), ${res.withAlt} with alt`);
  console.log(`  markers : ${res.marks} left inline in the body`);
  console.log(`  dropped : ${res.unreadable} unreadable`);
  console.log(`  cover   : ${res.cover || '(none)'}  ${res.coverBytes ? KB(res.coverBytes) : ''}`);
  const seen = res.figs === refs.imgs ? 'ALL' : `${res.figs} of ${refs.imgs}`;
  console.log(`  ⇒ ${seen} the spine's images are now seen, and ${res.marks} know where they go.`);
}

await b.close();
