"""Break the Protocol 5 drift guard on purpose — the whole point of generating
a doc from a module is that the generation is CHECKED."""
import io, re, subprocess, sys

def run():
    r = subprocess.run(['node', 'test/smoke.mjs'], capture_output=True, text=True)
    return r.returncode == 0, (r.stdout or '') + (r.stderr or '')

ok0, out0 = run()
if not ok0:
    print('BASELINE IS RED\n' + out0); sys.exit(1)
print('baseline: green\n')

CASES = [
    ('PROTOCOLS.md', 'the doc drifts one word from the module',
     'Write ONE more module for a course I am already walking.',
     'Write one more module for a course I am already walking.',
     r'drifted apart'),
    ('PROTOCOLS.md', 'Protocol 5 stops naming what the desk knows',
     '**Where you actually got stuck**', '**Where things went awry**',
     r'what the desk knows that a chat window'),
    ('PROTOCOLS.md', 'Protocol 5 stops saying it works with no model',
     '**Without one it copies the prompt', '**It needs a model',
     r'works with no model'),
]

bad = 0
for path, name, find, repl, expect in CASES:
    original = io.open(path, encoding='utf-8').read()
    if find not in original:
        print('  ??   ' + name + '  - the text to break is not there'); bad += 1; continue
    io.open(path, 'w', encoding='utf-8').write(original.replace(find, repl, 1))
    ok, out = run()
    io.open(path, 'w', encoding='utf-8').write(original)
    if ok:
        print('  DEAD ' + name + '  - stayed GREEN'); bad += 1
    elif not re.search(expect, out):
        print('  WRONG ' + name + '  - red for another reason:')
        print('        ' + out.strip().splitlines()[-1][:160]); bad += 1
    else:
        print('  ok   ' + name + '  - caught')

ok, out = run()
print('\nrestored: ' + ('green' if ok else 'RED\n' + out))
sys.exit(1 if (bad or not ok) else 0)
