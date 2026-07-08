// One-off / reusable helper: dump a library-texts/*.js module's exported
// full-text string to a plain .txt file, so it can be piped into MinIO
// without ever needing to pass through an LLM's own context window.
// Usage: node tools/caravan/export-fulltext.mjs <outDir>
import fs from 'fs';
import path from 'path';
import { dhammapadaFullText } from '../../src/game/data/library-texts/dhammapada.js';
import { satipatthanaFullText } from '../../src/game/data/library-texts/satipatthana.js';
import { mettaFullText } from '../../src/game/data/library-texts/metta.js';
import { anapanasatiFullText } from '../../src/game/data/library-texts/anapanasati.js';

const outDir = process.argv[2];
if (!outDir) { console.error('Usage: node export-fulltext.mjs <outDir>'); process.exit(1); }
fs.mkdirSync(outDir, { recursive: true });

const texts = {
  dhammapada: dhammapadaFullText,
  satipatthana: satipatthanaFullText,
  metta: mettaFullText,
  anapanasati: anapanasatiFullText,
};
for (const [slug, text] of Object.entries(texts)) {
  const p = path.join(outDir, slug + '.txt');
  fs.writeFileSync(p, text, 'utf8');
  console.log(slug, text.length, 'chars ->', p);
}
