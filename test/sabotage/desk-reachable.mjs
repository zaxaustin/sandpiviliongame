/* Break the Learning Desk's reachability guards on purpose. */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const run = () => {
  try { execSync('node test/smoke.mjs', { encoding: 'utf8', stdio: 'pipe' }); return { ok: true, out: '' }; }
  catch (e) { return { ok: false, out: (e.stdout || '') + (e.stderr || '') }; }
};
const base = run();
if (!base.ok) { console.error('BASELINE IS RED — nothing below means anything.\n' + base.out); process.exit(1); }
console.log('baseline: green\n');

const CASES = [
  { f: 'src/game/main.js', name: 'pressing E at the desk does nothing (dispatch removed)',
    find: "    else if(st.kind==='learning') openLearningDesk();\n", with: '',
    expect: /THE LEARNING DESK.*kind 'learning'|kind 'learning'/ },
  { f: 'src/game/data/places.js', name: 'the desk loses its keystroke door (places row removed)',
    find: "  learning: { icon: '🧠', label: 'The Learning Desk', door: 'openLearningDesk',\n    scene: 'study', station: 'learning' },\n",
    with: '', expect: /'learning' station stands in study and has NO menu door/ },
  { f: 'src/game/ui/overlays.js', name: 'the door is not a window export',
    find: '  openLearningDesk, learnTab,', with: '  learnTab,',
    expect: /door is 'openLearningDesk\(\)', which is NOT a window export/ },
  { f: 'src/game/data/visibility.js', name: 'courseWork vanishes from the privacy line',
    find: "  { key:'courseWork',", with: "  { key:'courseWorkXX',",
    expect: /courseWork/ },
];

/* ⚠ THE WORKING COPY IS CRLF. A literal multi-line `find` matched nothing and
   reported "the line to break is not there" — the same shape as the 2026-08-13
   scrape that found zero residents on a CRLF checkout. Match either ending. */
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const asRe = s => new RegExp(esc(s).replace(/\\?\n/g, '\\r?\\n'));

let bad = 0;
for (const c of CASES) {
  const original = readFileSync(c.f, 'utf8');
  const re = asRe(c.find);
  if (!re.test(original)) { console.log('  ??   ' + c.name + '  — the line to break is not there'); bad++; continue; }
  writeFileSync(c.f, original.replace(re, c.with), 'utf8');
  const r = run();
  writeFileSync(c.f, original, 'utf8');
  if (r.ok) { console.log('  DEAD ' + c.name + '  — the suite stayed GREEN'); bad++; }
  else if (!c.expect.test(r.out)) { console.log('  WRONG ' + c.name + '  — red, but not for this reason:\n' + r.out.slice(0, 500)); bad++; }
  else console.log('  ok   ' + c.name + '  — caught');
}
const restored = run();
if (!restored.ok) { console.error('\nRESTORE FAILED.\n' + restored.out); process.exit(1); }
console.log('\nrestored: green');
process.exit(bad ? 1 : 0);
