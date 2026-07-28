/* ================================================================
   [MAKE ICON] — draws build/icon.ico from scratch, with no
   dependencies at all: a 32×32 pixel-art grid, scaled by whole
   numbers, encoded to PNG by hand (node:zlib does the compression)
   and wrapped in an ICO container.

   Why bother, when an icon is a download away: the beta.2 build log
   said "default Electron icon is used — application icon is not set",
   which means every tester's taskbar, Start menu and installer would
   have shown the generic Electron atom. That is the first thing anyone
   sees, before the app even opens.

   Drawn rather than fetched, and drawn in whole pixels rather than
   traced from a photo, because that is the same choice the game itself
   makes — the low-res look is a resource decision, not a budget one,
   and an icon that scales by integer multiples stays crisp at every
   size Windows asks for. Colours are lifted straight from
   src/game/style.css so the icon and the app agree.

   Run:  node scripts/make-icon.mjs
   ================================================================ */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

/* ---- the palette, straight out of style.css ---- */
const C = {
  '.': [0x14, 0x10, 0x19, 255],  // --bg, the deep ink sky
  'm': [0x8a, 0x64, 0x23, 255],  // --gold-deep, the moon behind everything
  'M': [0xa8, 0x7c, 0x30, 255],  // moon, lit edge
  'g': [0xe0, 0xa4, 0x3c, 255],  // --gold, THE accent — the pavilion itself
  'G': [0xff, 0xd9, 0x8a, 255],  // --gold-bright, the lit edge of the roof
  'e': [0x8a, 0x64, 0x23, 255],  // --gold-deep, shadow side
  's': [0xc9, 0xa8, 0x6a, 255],  // sand, lit
  'd': [0xa8, 0x89, 0x5a, 255],  // sand in shadow — warmed off --muted, which
                                 // reads grey next to this much gold
  'k': [0x55, 0x43, 0x2e, 255],  // --edge, the darkest sand line
};

/* ---- 32×32. A pavilion on a dune, a moon behind it. ---- */
const ART = [
  '................................',
  '................................',
  '..............MMMM..............',
  '.............MMmmmm.............',
  '............MMmmmmmm............',
  '............MMmmmmmm............',
  '............mmmmmmmm............',
  '............mmmmmmmm............',
  '.............mmmmmm.............',
  '..............mmmm..............',
  '................................',
  '...............GG...............',
  '..............GGGG..............',
  '............GGgggggg............',
  '..........GGgggggggggg..........',
  '........GGgggggggggggggg........',
  '......GGgggggggggggggggggg......',
  '....GGgggggggggggggggggggggg....',
  '..GGgggggggggggggggggggggggggg..',
  '.eeeeeeeeeeeeeeeeeeeeeeeeeeeeee.',
  '.......gge............gge.......',
  '.......gge............gge.......',
  '.......gge............gge.......',
  '.......gge............gge.......',
  '.......gge............gge.......',
  '.......gge............gge.......',
  '.....Gggggggggggggggeeeeeee.....',
  '....eeeeeeeeeeeeeeeeeeeeeeee....',
  '.ssssssssssssssssssssssssssssss.',
  'ssssdddsssssssssssdddsssssddssss',
  'ddssddddddddsssdddddddssdddddddd',
  'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
];

const N = 32;
if (ART.length !== N) throw new Error(`art is ${ART.length} rows, expected ${N}`);
ART.forEach((row, y) => { if (row.length !== N) throw new Error(`row ${y} is ${row.length} wide, expected ${N}`); });

/* ---- PNG, by hand ---- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size) {
  const scale = size / N;
  if (!Number.isInteger(scale)) throw new Error(`${size} is not a whole multiple of ${N}`);
  // raw scanlines: one filter byte (0 = none) then RGBA per pixel
  const raw = Buffer.alloc(size * (1 + size * 4));
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0;
    const row = ART[Math.floor(y / scale)];
    for (let x = 0; x < size; x++) {
      const px = C[row[Math.floor(x / scale)]] || C['.'];
      raw[o++] = px[0]; raw[o++] = px[1]; raw[o++] = px[2]; raw[o++] = px[3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;    // bit depth
  ihdr[9] = 6;    // colour type: RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---- ICO container: a directory, then the PNGs ---- */
const SIZES = [256, 128, 64, 32];
const images = SIZES.map(png);
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(SIZES.length, 4);
let offset = 6 + 16 * SIZES.length;
const entries = SIZES.map((size, i) => {
  const e = Buffer.alloc(16);
  e[0] = size >= 256 ? 0 : size;   // 0 means 256 in the ICO format
  e[1] = size >= 256 ? 0 : size;
  e[2] = 0; e[3] = 0;
  e.writeUInt16LE(1, 4);           // colour planes
  e.writeUInt16LE(32, 6);          // bits per pixel
  e.writeUInt32BE(0, 8); e.writeUInt32LE(images[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += images[i].length;
  return e;
});

mkdirSync('build', { recursive: true });
writeFileSync('build/icon.ico', Buffer.concat([header, ...entries, ...images]));
console.log(`✓ build/icon.ico — ${SIZES.join(', ')}px, ${(Buffer.concat([header, ...entries, ...images]).length / 1024).toFixed(1)} KB, no dependencies`);
