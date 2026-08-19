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

/* THE BYTES, undecoded. Split out of readEntry() 2026-08-18 so images can come
   out of the same zip walk the chapters do: readEntry() ended in a UTF-8
   decode, which is right for XHTML and destroys a JPEG. */
async function readEntryBytes(zip, name){
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
  if(e.method === 0) return comp;                 // stored, no compression
  if(e.method === 8) return await inflateRaw(comp); // raw DEFLATE
  throw new Error('Unsupported ZIP compression (method ' + e.method + ') in ' + name);
}

async function readEntry(zip, name){
  const raw = await readEntryBytes(zip, name);
  return raw === null ? null : new TextDecoder('utf-8').decode(raw);
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

/* ---- chapter text: keep readable blocks, drop nav/boilerplate by structure ----

   ⚠ IT REPORTS IMAGES; IT DOES NOT FETCH THEM. This is a DOM-in / data-out
   walker with no zip access and no I/O, which is the only reason it can be
   tested with a string. epubToText() below is the layer holding the zip, so it
   is the layer that resolves what this reports into actual bytes.

   Until 2026-08-18 an <img> was in neither SKIP_TAGS nor BLOCK_TAGS, so the
   walker descended into it, found no text children, and contributed nothing —
   silently. Measured on the acceptance case, `Drawing for Beginners`: 113
   images, 99.4% of the file, dropped without a word, leaving 70 KB of prose
   that is mostly captions for pictures that are not there ("You can see that
   in the last step the shading is…"). The book still READ as complete, which
   is what made it the bad kind of failure.

   Returns { text, images:[{href, alt, marker}] }. The marker is left inline in
   the text so a renderer can put the picture back exactly where it belongs —
   and because it is a plain string, paginate() keeps working unchanged and
   pages stay strings, which BM25, TTS and the note page-anchoring all rely on. */
export const FIG_MARK = (n) => '⟦fig:' + n + '⟧';
const FIG_RE = /⟦fig:(\d+)⟧/g;
export function stripFigMarks(s){ return String(s == null ? '' : s).replace(FIG_RE, ' ').replace(/[ \t]{2,}/g, ' '); }
export function splitOnFigMarks(s){
  const out = [];
  let last = 0;
  const str = String(s == null ? '' : s);
  FIG_RE.lastIndex = 0;
  let m;
  while((m = FIG_RE.exec(str))){
    if(m.index > last) out.push({ text: str.slice(last, m.index) });
    out.push({ fig: Number(m[1]) });
    last = m.index + m[0].length;
  }
  if(last < str.length) out.push({ text: str.slice(last) });
  return out;
}

function chapterText(xhtml, startIndex){
  let doc = parseXml(xhtml, 'application/xhtml+xml');
  if(!doc) doc = new DOMParser().parseFromString(xhtml, 'text/html');
  const root = doc.body || doc.documentElement;
  if(!root) return { text: '', images: [] };
  const paras = [];
  const images = [];
  let n = startIndex || 0;
  let buf = [];
  const flush = () => {
    const t = buf.join('').replace(/[^\S\n]+/g, ' ').trim();
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
      /* <img>, and SVG's <image href>, which a surprising number of EPUBs use
         for exactly the diagrams that matter most. */
      if(tag === 'img' || tag === 'image'){
        if(!sup){
          const href = child.getAttribute('src') || child.getAttribute('href')
            || child.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || '';
          const alt = (child.getAttribute('alt') || '').trim();
          if(href){
            flush();
            images.push({ href, alt, marker: FIG_MARK(n) });
            /* The alt travels WITH the marker rather than instead of it: on the
               acceptance case only 11 of 113 images carry any, so alt alone
               would still be silence for the other 102. */
            paras.push(FIG_MARK(n) + (alt ? '\n' + alt : ''));
            n++;
          }
        }
        continue;
      }
      /* an <svg> that only wraps a <title> is a figure too — take the title as
         its alt and keep walking for the <image> inside. */
      const block = BLOCK_TAGS.has(tag);
      if(block) flush();
      if(tag === 'br') buf.push(' ');
      walk(child, sup);
      if(block) flush();
    }
  };
  walk(root, false);
  flush();
  return { text: paras.join('\n\n'), images };
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
  const mediaTypes = new Map();
  let coverHref = null;
  for(const it of g('item')){
    const id = it.getAttribute('id'), href = it.getAttribute('href');
    if(!id || !href) continue;
    manifest.set(id, href);
    mediaTypes.set(href, it.getAttribute('media-type') || '');
    if((it.getAttribute('properties') || '').includes('cover-image')) coverHref = href;
  }
  /* EPUB 2 declared its cover with <meta name="cover" content="<id>">; EPUB 3
     uses properties="cover-image". The acceptance case is the first form and
     the other drawing book declares neither, so all three cases are real. */
  if(!coverHref){
    const mc = g('meta').find(m => m.getAttribute('name') === 'cover');
    if(mc) coverHref = manifest.get(mc.getAttribute('content')) || null;
  }

  const baseDir = dirOf(opfPath);
  /* One entry may be listed under a percent-encoded name; try both, once, and
     hand back what actually resolved so the image pass does not repeat it. */
  const readEither = async (path, asBytes) => {
    const get = asBytes ? readEntryBytes : readEntry;
    try{ const v = await get(zip, path); if(v !== null) return v; }catch(e){ return null; }
    try{ return await get(zip, decodeURIComponent(path)); }catch(e){ return null; }
  };

  const parts = [];
  const figures = [];
  for(const ir of g('itemref')){
    const href = manifest.get(ir.getAttribute('idref'));
    if(!href) continue;
    const path = resolvePath(baseDir, href);
    const xhtml = await readEither(path, false);
    if(!xhtml) continue;
    const { text, images } = chapterText(xhtml, figures.length);
    /* the chapter's own directory is the base for its <img src>, not the OPF's */
    for(const im of images) figures.push({ ...im, path: resolvePath(dirOf(path), im.href) });
    if(text.trim()) parts.push(text);
  }

  /* NOW the bytes — the walker only ever named them. A figure that cannot be
     read is dropped from the list rather than carried as a broken promise, and
     the count of what was dropped is reported instead. */
  const images = [];
  let unreadable = 0;
  for(const f of figures){
    const bytes = await readEither(f.path, true);
    if(!bytes || !bytes.length){ unreadable++; continue; }
    images.push({ marker: f.marker, href: f.href, path: f.path, alt: f.alt,
                  mediaType: mediaTypes.get(f.href) || guessType(f.path), bytes });
  }
  let cover = null;
  if(coverHref){
    const cpath = resolvePath(baseDir, coverHref);
    const bytes = await readEither(cpath, true);
    if(bytes && bytes.length) cover = { path: cpath, mediaType: mediaTypes.get(coverHref) || guessType(cpath), bytes };
  }
  /* No declared cover, but the book is full of pictures? The first figure is a
     better answer than none — and it is labelled as a guess by being derived
     here rather than claimed by the file. */
  if(!cover && images.length) cover = { ...images[0], guessed: true };

  const body = parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  return { title, author, body, images, cover, unreadableImages: unreadable };
}

function guessType(path){
  const m = /\.([a-z0-9]+)$/i.exec(path || '');
  const e = m ? m[1].toLowerCase() : '';
  return e === 'jpg' || e === 'jpeg' ? 'image/jpeg'
    : e === 'png' ? 'image/png' : e === 'gif' ? 'image/gif'
    : e === 'svg' ? 'image/svg+xml' : e === 'webp' ? 'image/webp' : '';
}
