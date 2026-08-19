/* ================================================================
   [IMAGE SHRINK] — make a book's pictures small enough to keep.

   An illustrated EPUB is almost entirely pictures. Measured on the acceptance
   case, `Drawing for Beginners` (Karen Reed): 7.8 MB on disk, 113 figures,
   **99.4% of the file is images**, and the reader kept 71 KB of text — text
   which is mostly captions for pictures that were not there ("You can see that
   in the last step the shading is…"). Keeping the originals is not an option;
   dropping them silently is what we are fixing.

   NO DEPENDENCY, and none is available: `sharp` is replaced by a six-line stub
   in the packaged build (package.json `files`), so there is no image codec in
   the main process at all. The renderer has had one the whole time — canvas
   decodes and re-encodes, in both the browser and the desktop build. Same
   sleeper-car reasoning as epub.js: cheap, no assets, nothing external.

   ⚠ THE NUMBERS BELOW ARE MEASURED, NOT CHOSEN. All 113 figures, re-encoded:

       480px webp q0.80    1.12 MB      mean 10 KB    largest 22 KB
       600px webp q0.70    1.21 MB      mean 11 KB    largest 23 KB
       600px webp q0.80    1.48 MB      mean 13 KB    largest 31 KB
       800px webp q0.80    2.02 MB      mean 18 KB    largest 42 KB
       600px jpeg q0.75    2.02 MB      mean 18 KB    largest 41 KB

   480px webp is the setting, at a 7.6x reduction. WebP beats JPEG by ~45% at
   equal size on line art, which is what a drawing book is, and every target
   this ships to is Chromium — so the usual "but Safari" objection does not
   apply here. The per-book budget is what stands between "the figures are
   back" and "one book ate the save"; a book that blows it keeps its cover and
   says so, rather than being quietly half-imported.
   ================================================================ */

export const FIG_EDGE = 480;        // longest side, px
export const FIG_TYPE = 'image/webp';
export const FIG_QUALITY = 0.80;
export const COVER_EDGE = 400;      // a cover is shown at card size, never full-bleed
export const COVER_MAX_BYTES = 120 * 1024;

/* Measured: the whole acceptance case lands at 1.12 MB. 2 MB leaves real room
   above the worst book we have seen — on the DESKTOP, where the figures go to a
   `<slug>.images.txt` sidecar and the save never sees them. */
export const FIG_BUDGET_BYTES = 2 * 1024 * 1024;

/* ⚠ IN A BROWSER THERE IS NO SIDECAR, SO THE FIGURES WOULD GO INTO THE SAVE —
   and the save is the thing that runs out. MEASURED 2026-08-18 against the
   deployed build: a 563 KB book is fine, and the NINTH one throws
   QuotaExceededError at ~5 MB. One illustrated book at the desktop budget
   weighs 1.6 MB of that, so three of them would end the library.

   So a browser gets THE COVER AND NOTHING ELSE, and is told why. That is the
   standing rule rather than a compromise: a feature that needs something
   absent is ABSENT or LOCKED, never DEGRADED — half a book's diagrams, chosen
   by whichever ones happened to come first, is exactly the degraded middle the
   rule forbids. The desktop app keeps all of them, and the message says so. */
export function figureBudgetFor(hasBridge){
  return hasBridge ? FIG_BUDGET_BYTES : 0;
}

/* An SVG is already text and usually tiny; canvas decoding one is unreliable
   (no intrinsic size, no external refs) and pointless. Pass it through if it is
   small, drop it if it is not. */
const SVG = 'image/svg+xml';
const SVG_KEEP_MAX = 64 * 1024;

function bytesToBlob(bytes, type){
  return new Blob([bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)], type ? { type } : undefined);
}

async function blobToDataURL(blob){
  return await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = () => rej(new Error('could not read the re-encoded image'));
    fr.readAsDataURL(blob);
  });
}

/* OffscreenCanvas where it exists (it does in Chrome and Electron), a real
   canvas otherwise, so this cannot become the one thing that fails on a
   machine we did not test. */
async function encode(bmp, w, h, type, quality){
  if(typeof OffscreenCanvas !== 'undefined'){
    const c = new OffscreenCanvas(w, h);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, w, h);
    return await c.convertToBlob({ type, quality });
  }
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, w, h);
  return await new Promise(r => c.toBlob(r, type, quality));
}

/* One picture in, one data: URI out — or null, which is an answer and not an
   error. Callers count the nulls and say how many there were. */
export async function shrinkImage(bytes, mediaType, opts){
  const o = opts || {};
  const edge = o.edge || FIG_EDGE;
  const type = o.type || FIG_TYPE;
  const quality = o.quality == null ? FIG_QUALITY : o.quality;
  const maxBytes = o.maxBytes || 0;
  if(!bytes || !bytes.length) return null;

  if((mediaType || '') === SVG){
    if(bytes.length > SVG_KEEP_MAX) return null;
    try{ return await blobToDataURL(bytesToBlob(bytes, SVG)); }catch(e){ return null; }
  }

  let bmp;
  try{ bmp = await createImageBitmap(bytesToBlob(bytes, mediaType)); }
  catch(e){ return null; }               // a codec this browser does not have
  try{
    const scale = Math.min(1, edge / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const blob = await encode(bmp, w, h, type, quality);
    if(!blob) return null;
    if(maxBytes && blob.size > maxBytes) return null;
    return await blobToDataURL(blob);
  }catch(e){ return null; }
  finally{ if(bmp && bmp.close) bmp.close(); }
}

/* THE WHOLE BOOK, UNDER ONE CEILING. Returns a map of marker-number to data
   URI plus an honest tally: what was kept, what could not be decoded, and what
   was cut because the budget ran out. The tally is the point — it is what the
   book says about itself afterwards, so it must be true even in the bad cases.

   Stops at the budget rather than shrinking harder. Re-encoding 113 images a
   second time to squeeze under a line is a lot of a visitor's seconds spent to
   make a promise we already know we cannot keep for the next book. */
export async function shrinkFigures(images, opts){
  const o = opts || {};
  const budget = o.budget || FIG_BUDGET_BYTES;
  const figs = {};
  let kept = 0, undecodable = 0, cut = 0, bytes = 0;
  const list = images || [];
  /* budget 0 is the browser: nothing is kept, and every figure is reported as
     cut so the sentence the book carries is true rather than silent */
  if(budget <= 0) return { figs:{}, kept:0, undecodable:0, cut:list.length, bytes:0, total:list.length };
  for(let i = 0; i < list.length; i++){
    const im = list[i];
    const n = markerNumber(im.marker);
    if(n === null) continue;
    if(bytes >= budget){ cut++; continue; }
    const url = await shrinkImage(im.bytes, im.mediaType, o);
    if(!url){ undecodable++; continue; }
    const size = Math.ceil(url.length * 0.75); // data: URI is base64; this is the real payload
    if(bytes + size > budget){ cut++; continue; }
    figs[n] = url;
    bytes += size;
    kept++;
    if(o.onProgress && (kept % 10 === 0)) o.onProgress(kept, list.length);
  }
  return { figs, kept, undecodable, cut, bytes, total: list.length };
}

export function markerNumber(marker){
  const m = /⟦fig:(\d+)⟧/.exec(String(marker || ''));
  return m ? Number(m[1]) : null;
}
