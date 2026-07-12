/* In-game EPUB reader — turn an .epub the visitor drags onto the Caravan
   Desk into clean shelf-ready text, with NO third-party library and NO
   server: an EPUB is a ZIP of XHTML chapters, and the browser already
   ships everything needed to read one —
     - `DecompressionStream('deflate-raw')` inflates each zipped file
       (built into every modern browser and Electron; CSP-safe, nothing
       external), and
     - `DOMParser` is a real XHTML parser, so chapter text comes out by
       structure, not by guessing.
   This is the exact logic of tools/caravan/epub-to-text.py ported to the
   browser, so the terminal and in-game paths agree. The whole file stays
   self-contained on purpose — the sleeper-car rule: cheap, no assets, no
   dependency. */

const EPUB_NS = 'http://www.idpf.org/2007/ops';
const SKIP_TAGS = new Set(['head', 'script', 'style', 'nav']);
const BLOCK_TAGS = new Set(['p', 'div', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'figcaption', 'td', 'tr', 'dd', 'dt', 'pre']);
const FRONT_BACK = /\b(frontmatter|backmatter|toc|titlepage|imprint|colophon|copyright-page)\b/;

/* ---- the minimal ZIP reader (central-directory walk + raw inflate) ---- */
function readZipIndex(arrayBuffer){
  const dv = new DataView(arrayBuffer);
  const bytes = new Uint8Array(arrayBuffer);
  const dec = new TextDecoder('utf-8');
  // Find the End-Of-Central-Directory record by scanning back from the end
  // for its signature (the trailing comment is almost always empty, so it's
  // usually the last 22 bytes; cap the search at 64KB just in case).
  let eocd = -1;
  const minStart = Math.max(0, arrayBuffer.byteLength - 22 - 65536);
  for(let i = arrayBuffer.byteLength - 22; i >= minStart; i--){
    if(dv.getUint32(i, true) === 0x06054b50){ eocd = i; break; }
  }
  if(eocd < 0) throw new Error('Not an EPUB (no ZIP end-of-central-directory record).');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const entries = new Map();
  for(let n = 0; n < count; n++){
    if(dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const fnLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localOffset = dv.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + fnLen));
    entries.set(name, { method, compSize, localOffset });
    p += 46 + fnLen + extraLen + commentLen;
  }
  return { dv, bytes, entries };
}

async function inflateRaw(bytes){
  if(typeof DecompressionStream === 'undefined') throw new Error('NO_DECOMPRESSION');
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const ab = await new Response(ds.readable).arrayBuffer();
  return new Uint8Array(ab);
}

async function readEntry(zip, name){
  const e = zip.entries.get(name);
  if(!e) return null;
  const { dv, bytes } = zip;
  const lo = e.localOffset;
  if(dv.getUint32(lo, true) !== 0x04034b50) throw new Error('Corrupt EPUB: bad local header for ' + name);
  // The local header's own filename/extra lengths (which can differ from the
  // central directory's) decide where the compressed data actually starts.
  const fnLen = dv.getUint16(lo + 26, true);
  const extraLen = dv.getUint16(lo + 28, true);
  const start = lo + 30 + fnLen + extraLen;
  const comp = bytes.subarray(start, start + e.compSize);
  let raw;
  if(e.method === 0) raw = comp;            // stored, no compression
  else if(e.method === 8) raw = await inflateRaw(comp); // raw DEFLATE
  else throw new Error('Unsupported ZIP compression (method ' + e.method + ') in ' + name);
  return new TextDecoder('utf-8').decode(raw);
}

/* ---- EPUB structure: container.xml -> OPF package -> spine reading order ---- */
function parseXml(text, type){
  const doc = new DOMParser().parseFromString(text, type);
  return doc.querySelector('parsererror') ? null : doc;
}

function dirOf(path){ return path.split('/').slice(0, -1).join('/'); }

function resolvePath(baseDir, href){
  const rel = href.split('#')[0];
  const stack = baseDir ? baseDir.split('/') : [];
  for(const part of rel.split('/')){
    if(part === '' || part === '.') continue;
    if(part === '..') stack.pop();
    else stack.push(part);
  }
  return stack.join('/');
}

/* ---- chapter text: keep readable blocks, drop nav/boilerplate by structure ---- */
function chapterText(xhtml){
  let doc = parseXml(xhtml, 'application/xhtml+xml');
  if(!doc) doc = new DOMParser().parseFromString(xhtml, 'text/html');
  const root = doc.body || doc.documentElement;
  if(!root) return '';
  const paras = [];
  let buf = [];
  const flush = () => {
    const t = buf.join('').replace(/\s+/g, ' ').trim();
    if(t) paras.push(t);
    buf = [];
  };
  const walk = (node, suppressed) => {
    for(const child of node.childNodes){
      if(child.nodeType === 3){ if(!suppressed) buf.push(child.nodeValue); continue; }
      if(child.nodeType !== 1) continue;
      const tag = (child.localName || '').toLowerCase();
      if(SKIP_TAGS.has(tag)) continue;
      let sup = suppressed;
      if(tag === 'section' || tag === 'article'){
        const et = child.getAttribute('epub:type') || child.getAttributeNS(EPUB_NS, 'type') || '';
        if(FRONT_BACK.test(et)) sup = true;
      }
      const block = BLOCK_TAGS.has(tag);
      if(block) flush();
      if(tag === 'br') buf.push(' ');
      walk(child, sup);
      if(block) flush();
    }
  };
  walk(root, false);
  flush();
  return paras.join('\n\n');
}

/* The one public entry point. Returns {title, author, body}; throws on a
   genuinely unreadable file (with 'NO_DECOMPRESSION' when the browser lacks
   the inflate API, so the caller can point at the terminal script). */
export async function epubToText(file){
  const zip = readZipIndex(await file.arrayBuffer());
  const containerXml = await readEntry(zip, 'META-INF/container.xml');
  if(!containerXml) throw new Error('Not an EPUB: missing META-INF/container.xml.');
  const cdoc = parseXml(containerXml, 'application/xml');
  const rootfile = cdoc && cdoc.getElementsByTagName('rootfile')[0];
  const opfPath = rootfile && rootfile.getAttribute('full-path');
  if(!opfPath) throw new Error('Not an EPUB: container names no package file.');

  const opfXml = await readEntry(zip, opfPath);
  const odoc = opfXml && parseXml(opfXml, 'application/xml');
  if(!odoc) throw new Error("EPUB package file isn't valid XML.");

  const g = (ln) => Array.from(odoc.getElementsByTagNameNS('*', ln));
  const title = (g('title')[0]?.textContent || '').trim() || null;
  const author = (g('creator')[0]?.textContent || '').trim() || null;
  const manifest = new Map();
  for(const it of g('item')){
    const id = it.getAttribute('id'), href = it.getAttribute('href');
    if(id && href) manifest.set(id, href);
  }
  const baseDir = dirOf(opfPath);
  const parts = [];
  for(const ir of g('itemref')){
    const href = manifest.get(ir.getAttribute('idref'));
    if(!href) continue;
    const path = resolvePath(baseDir, href);
    let xhtml = null;
    try{ xhtml = await readEntry(zip, path); }
    catch(e){ continue; } // one bad chapter shouldn't sink the whole book
    if(xhtml === null){ try{ xhtml = await readEntry(zip, decodeURIComponent(path)); }catch(e){} }
    if(!xhtml) continue;
    const t = chapterText(xhtml);
    if(t.trim()) parts.push(t);
  }
  const body = parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  return { title, author, body };
}
