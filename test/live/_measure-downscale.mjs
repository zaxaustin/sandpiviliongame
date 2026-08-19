/* [WHAT DO THE PICTURES WEIGH AFTER A DOWNSCALE?] — the go/no-go number for
   inline figures. Decodes every image in an epub, redraws it into a canvas at
   several target widths and formats, and totals the real encoded bytes.

   Guessed numbers are how a feature ships that eats the save. This measures.
   Usage: node test/live/_measure-downscale.mjs "C:/path/to/book.epub" */
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const file = process.argv[2];
if (!file) { console.error('give me an .epub path'); process.exit(2); }

const epubSrc = readFileSync(new URL('../../src/game/epub.js', import.meta.url), 'utf8')
  .replace(/^export /gm, '');

const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const p = await b.newPage();
p.on('pageerror', e => console.log('  PAGEERROR ' + e.message));
await p.goto('about:blank');
await p.evaluate(epubSrc);

const buf = readFileSync(file);
await p.evaluate(s => {
  const bin = atob(s), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  window.__ab = u8.buffer;
}, buf.toString('base64'));

console.log('\n══ ' + basename(file) + '  (' + (buf.length / 1048576).toFixed(1) + ' MB)');
console.log('   decoding and re-encoding every image — this takes a moment…\n');

const out = await p.evaluate(async () => {
  /* pull the raw bytes of every image entry straight out of the zip */
  const zip = readZipIndex(window.__ab);
  const names = [...zip.entries.keys()].filter(n => /\.(jpe?g|png|gif|webp)$/i.test(n));
  const raw = async (name) => {
    const e = zip.entries.get(name);
    const { dv, bytes } = zip;
    const lo = e.localOffset;
    const fnLen = dv.getUint16(lo + 26, true), extraLen = dv.getUint16(lo + 28, true);
    const comp = bytes.subarray(lo + 30 + fnLen + extraLen, lo + 30 + fnLen + extraLen + e.compSize);
    if (e.method === 0) return comp;
    const ds = new DecompressionStream('deflate-raw');
    const w = ds.writable.getWriter(); w.write(comp); w.close();
    return new Uint8Array(await new Response(ds.readable).arrayBuffer());
  };

  const shrink = async (bmp, maxEdge, type, q) => {
    const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale));
    const c = new OffscreenCanvas(w, h);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, w, h);
    const blob = await c.convertToBlob({ type, quality: q });
    return blob.size;
  };

  const configs = [
    { label: '480px webp q0.80', edge: 480, type: 'image/webp', q: 0.80 },
    { label: '600px webp q0.80', edge: 600, type: 'image/webp', q: 0.80 },
    { label: '600px webp q0.70', edge: 600, type: 'image/webp', q: 0.70 },
    { label: '800px webp q0.80', edge: 800, type: 'image/webp', q: 0.80 },
    { label: '600px jpeg q0.75', edge: 600, type: 'image/jpeg', q: 0.75 },
  ];
  const totals = Object.fromEntries(configs.map(c => [c.label, 0]));
  const peaks = Object.fromEntries(configs.map(c => [c.label, 0]));
  let n = 0, origTotal = 0, dims = [];

  for (const name of names) {
    let bmp;
    const bytes = await raw(name);
    origTotal += bytes.length;
    try { bmp = await createImageBitmap(new Blob([bytes])); } catch (e) { continue; }
    n++;
    if (dims.length < 5) dims.push(bmp.width + '×' + bmp.height);
    for (const c of configs) {
      const size = await shrink(bmp, c.edge, c.type, c.q);
      totals[c.label] += size;
      if (size > peaks[c.label]) peaks[c.label] = size;
    }
    bmp.close();
  }
  return { n, origTotal, totals, peaks, dims, count: names.length };
});

const KB = n => (n / 1024).toFixed(0) + ' KB';
const MB = n => (n / 1048576).toFixed(2) + ' MB';
console.log(`   ${out.n} of ${out.count} images decoded · originals total ${MB(out.origTotal)}`);
console.log(`   sample dimensions: ${out.dims.join(', ')}\n`);
console.log('   ' + 'setting'.padEnd(20) + 'ALL IMAGES'.padEnd(14) + 'mean'.padEnd(12) + 'largest one');
for (const [label, total] of Object.entries(out.totals)) {
  console.log('   ' + label.padEnd(20) + MB(total).padEnd(14)
    + KB(total / out.n).padEnd(12) + KB(out.peaks[label]));
}
console.log('\n   for scale: INLINE_PERSONAL_MAX is 1.43 MB · a browser save shares a ~5–10 MB quota');
await b.close();
