"""Break every new guard on purpose. A guard nobody has watched fail is a
guard born dead - and three of the ones written today were.

Verifies a GREEN BASELINE first: a runner that reports "all caught" while the
suite has a syntax error is reporting nothing at all."""
import io, re, subprocess, sys

def run():
    r = subprocess.run(['node', 'test/smoke.mjs'], capture_output=True, text=True)
    return r.returncode == 0, (r.stdout or '') + (r.stderr or '')

base_ok, base_out = run()
if not base_ok:
    print('BASELINE IS RED - nothing below means anything.\n' + base_out)
    sys.exit(1)
print('baseline: green\n')

CASES = [
    ('src/game/ui/learning-desk.js',
     'the blank page stops being enforced at the door',
     'if (!attempt) return;', 'if (false) return;',
     r'refuses an empty attempt at the top'),

    ('src/game/ui/learning-desk.js',
     'the aids get DISABLED instead of being absent',
     'const written = !!(box && box.value.trim());',
     'const written = true; const _w = !!(box && box.value.trim());',
     r'must be ABSENT before an attempt exists'),

    ('src/game/ui/learning-desk.js',
     "AI text is written back into the visitor's own textarea",
     '  if (!c || !box || !X.askTutor) return;',
     '  if (!c || !box || !X.askTutor) return;\n  box.value = box.value;',
     r"never be read back as the visitor's own words"),

    ('src/game/data/course-folder.js',
     'course.md is hand-rolled instead of coming from the one emitter',
     "content: lessonToMarkdown(lessonFromCourse(course), { frontmatter: true })",
     "content: '# ' + course.title",
     r'second Markdown emitter'),

    ('src/game/data/course-folder.js',
     'your working starts emitting the format\'s own labels',
     "    lines.push('', String(a.text || '').trim());",
     "    lines.push('', '**Practice:** ' + String(a.text || '').trim());",
     r"must not be parseable as a course module"),

    ('src/game/entities.js',
     'courseWork disappears from freshData()',
     'courseWork:{}, ', '',
     r'no longer creates courseWork'),

    ('src/game/data/visibility.js',
     'courseWork stops being marked private',
     "{ key:'courseWork',   name:'Your work at the Learning Desk', state:'private'",
     "{ key:'courseWork',   name:'Your work at the Learning Desk', state:'commons'",
     r'is not marked private'),
]

bad = 0
for path, name, find, repl, expect in CASES:
    original = io.open(path, encoding='utf-8').read()
    # ⚠ the working copy is CRLF; match either ending (2026-08-13's lesson)
    rx = re.compile(re.escape(find).replace(r'\\n', r'\r?\n').replace(r'\n', r'\r?\n'))
    if not rx.search(original):
        print('  ??   ' + name + '  - the line to break is not there')
        bad += 1
        continue
    io.open(path, 'w', encoding='utf-8').write(rx.sub(lambda m: repl, original, count=1))
    ok, out = run()
    io.open(path, 'w', encoding='utf-8').write(original)
    if ok:
        print('  DEAD ' + name + '  - the suite stayed GREEN with the fix removed')
        bad += 1
    elif not re.search(expect, out):
        print('  WRONG ' + name + '  - red, but not for this reason:')
        print('        ' + out.strip().splitlines()[-1][:160])
        bad += 1
    else:
        print('  ok   ' + name + '  - caught')

ok, out = run()
print('\nrestored: ' + ('green' if ok else 'RED\n' + out))
sys.exit(1 if (bad or not ok) else 0)
