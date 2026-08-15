/* Break each new guard on purpose, one at a time, and check it goes red for
   the RIGHT reason. A guard nobody has watched fail is a guard born dead.

   Also verifies a GREEN BASELINE first — a runner that reports "all caught"
   while the suite has a syntax error is reporting nothing at all. */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const F = 'src/game/ui/overlays.js';
const original = readFileSync(F, 'utf8');

function run() {
  try { execSync('node test/smoke.mjs', { encoding: 'utf8', stdio: 'pipe' }); return { ok: true, out: '' }; }
  catch (e) { return { ok: false, out: (e.stdout || '') + (e.stderr || '') }; }
}

const base = run();
if (!base.ok) { console.error('BASELINE IS RED — nothing below means anything.\n' + base.out); process.exit(1); }
console.log('baseline: green\n');

const CASES = [
  { name: 'the duplicated paragraph comes back (metaWhy stops deriving)',
    find: "const metaWhy = (!syllabusHere && c.why) ? esc(c.why)+' · ' : '';",
    with: "const metaWhy = c.why ? esc(c.why)+' · ' : '';",
    expect: /on screen twice|DERIVES whether to print/ },
  { name: 'the syllabus stops asking the shelf',
    find: '|| !!shelfMatches(lookupTerms(step.reading || \'\', 5))[0];',
    with: '|| false;',
    expect: /shelfMatches\(\) to decide whether you own a text/ },
  { name: 'the syllabus stops being rendered at all',
    find: 'const syl = courseSyllabus(c, syllabusOwned);',
    with: 'const syl = { modules: 0, texts: [], artifacts: [] };',
    expect: /no longer renders a syllabus/ },
  { name: 'the category row goes back to showing empty filters',
    find: 'const catRow = !showArch && active.length>4;',
    with: 'const catRow = !showArch && active.length>0;',
    expect: /category|filter/i, mustFail: false },
];

let bad = 0;
for (const c of CASES) {
  if (!original.includes(c.find)) { console.log('  ??   ' + c.name + '  — the line to break is not there'); bad++; continue; }
  writeFileSync(F, original.replace(c.find, c.with), 'utf8');
  const r = run();
  writeFileSync(F, original, 'utf8');
  if (c.mustFail === false) { console.log('  --   ' + c.name + '  — ' + (r.ok ? 'no guard (expected)' : 'a guard caught it')); continue; }
  if (r.ok) { console.log('  DEAD ' + c.name + '  — the suite stayed GREEN with the fix removed'); bad++; }
  else if (!c.expect.test(r.out)) { console.log('  WRONG ' + c.name + '  — red, but not for this reason:\n' + r.out.slice(0, 400)); bad++; }
  else console.log('  ok   ' + c.name + '  — caught');
}

const restored = run();
if (!restored.ok) { console.error('\nRESTORE FAILED — the file did not come back clean.'); process.exit(1); }
console.log('\nrestored: green');
process.exit(bad ? 1 : 0);
