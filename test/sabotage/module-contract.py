"""Break the module-contract and homework-marking guards on purpose.

Rule 3. Every guard here was written today, and three guards written earlier
today were born dead - so none of these is trusted until it has been watched
to fail for the right reason."""
import io, re, subprocess, sys

def run():
    r = subprocess.run(['node', 'test/smoke.mjs'], capture_output=True, text=True)
    return r.returncode == 0, (r.stdout or '') + (r.stderr or '')

ok0, out0 = run()
if not ok0:
    print('BASELINE IS RED - nothing below means anything.\n' + out0)
    sys.exit(1)
print('baseline: green\n')

CASES = [
    # ---- the contract parses ----
    ('src/game/data/course-format.js',
     'the three new labels stop parsing',
     "  { label: 'Theory',     key: 'theory' },",
     '',
     r'does not read theory out of a module body'),

    ('src/game/data/course-format.js',
     '"By the end" goes back to a key with a space in it',
     "{ label: 'By the end', key: 'byTheEnd' }",
     "{ label: 'By the end', key: 'by the end' }",
     r'must be byTheEnd|does not read byTheEnd'),

    ('src/game/data/course-format.js',
     'the word beats the number again ("once a day for 20 days" -> 1)',
     "  const num = /(\\d+)/.exec(s);\n  if (num) return { times: Number(num[1]), byDay, text: s };",
     "  const num = null;",
     r'expected 20|invented a number'),

    ('src/game/data/course-format.js',
     'repeatSpec invents a target nobody wrote',
     '  return { times: null, byDay, text: s };',
     '  return { times: 30, byDay, text: s };',
     r'invented a number'),

    # ---- the desk consumes them ----
    ('src/game/ui/learning-desk.js',
     'the desk stops drawing the theory',
     '${parts.theory ? block(', '${false ? block(',
     r'does not render the theory'),

    ('src/game/ui/learning-desk.js',
     'the repeat tally counts presses instead of days',
     'new Set(list.map(a => a.at)).size', 'list.length',
     r'does not count DISTINCT DATES'),

    # ---- the marking ----
    ('src/game/ui/learning-desk.js',
     'the marker stops using the author\'s bar',
     '  const bar = parts.byTheEnd || \'\';', "  const bar = '';",
     r'no longer reads the module'),

    ('src/game/ui/learning-desk.js',
     'the marker is allowed to give a score',
     "'No score, no mark out of anything, no praise for its own sake. Do not rewrite their answer for them.',",
     "'Give it a mark out of ten.',",
     r'no longer forbids a score'),

    ('src/game/ui/learning-desk.js',
     'the marker stops asking for the extra work',
     "'If NOT YET: say precisely what is missing, then give ONE concrete piece of extra work that would',",
     "'If NOT YET: say so.',",
     r'what is missing and one concrete piece of extra work'),

    ('src/game/ui/learning-desk.js',
     'the marker ticks the module off for you',
     '  let text = \'\';\n  try { text = await X.askTutor(body); } catch (e) { text = \'\'; }',
     '  let text = \'\';\n  step.done = true;\n  try { text = await X.askTutor(body); } catch (e) { text = \'\'; }',
     r'writes to the visitor'),

    # ---- the prompts still ask for it ----
    ('src/game/data/course-prompt.js',
     'the drafting prompt stops asking for By the end',
     "'**By the end:** the level I should be at when this part is finished — one attainable thing,',",
     "'',",
     r'no longer asks for \*\*By the end|drifted apart'),
]

bad = 0
for path, name, find, repl, expect in CASES:
    original = io.open(path, encoding='utf-8').read()
    rx = re.compile(re.escape(find).replace(r'\\n', r'\r?\n').replace(r'\n', r'\r?\n'))
    if not rx.search(original):
        print('  ??   ' + name + '  - the line to break is not there')
        bad += 1
        continue
    io.open(path, 'w', encoding='utf-8').write(rx.sub(lambda m: repl, original, count=1))
    ok, out = run()
    io.open(path, 'w', encoding='utf-8').write(original)
    if ok:
        print('  DEAD ' + name + '  - stayed GREEN with the fix removed')
        bad += 1
    elif not re.search(expect, out):
        print('  WRONG ' + name + '  - red, but not for this reason:')
        print('        ' + (out.strip().splitlines() or [''])[-1][:170])
        bad += 1
    else:
        print('  ok   ' + name + '  - caught')

ok, out = run()
print('\nrestored: ' + ('green' if ok else 'RED\n' + out))
sys.exit(1 if (bad or not ok) else 0)
