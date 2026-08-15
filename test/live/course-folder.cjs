/* [THE COURSE FOLDER] — a real directory, with real bytes in it.
   ======================================================================
   The steward, 2026-08-15:

     "i also wanna see where we're gonna hold all these files together and if
      we can combine them all into a course folder that people can access in
      the back end."

   ⚠ THIS SUITE IS ELECTRON, AND THAT IS NOT OPTIONAL. A browser has no
   desktopBridge, so a browser test of this could only stub one — which proves
   the wiring and nothing about whether a file lands on a disk. The two homes
   lesson from 2026-08-04 is the same shape: a bridge that returns {ok:true} and
   writes nothing is this project's oldest bug, and the only thing that catches
   it is reading the file back with fs, outside the app, as this does.

   userData is redirected to a throwaway directory, so it cannot touch the
   steward's own save or his own courses.

   Run:
     env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/course-folder.cjs
*/
const { app } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

/* ⚠ ELECTRON_RUN_AS_NODE MUST BE UNSET. With it set, `electron` is node and
   `app` is undefined — which looks exactly like a crash on boot. Refuse rather
   than report that as a failure. */
if (!app) {
  console.error('\nThis must run under electron, not node.');
  console.error('ELECTRON_RUN_AS_NODE is probably set. Unset it:\n');
  console.error('  env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/course-folder.cjs\n');
  process.exit(2);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-folder-'));
app.setPath('userData', tmp);

let failed = 0;
const ok = (name, cond, detail) => {
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (detail ? '  — ' + detail : ''));
  if (!cond) failed++;
};

/* ---- The real course, from disk, through the real parser and the real
   folder builder. No fixture: rule 1, in a course. ---- */
const COURSE_MD = fs.readFileSync('courses/junior-electrical-engineer.course.md', 'utf8');

app.whenReady().then(async () => {
  const CF = await import('../../src/game/data/course-format.js');
  const FOLDER = await import('../../src/game/data/course-folder.js');

  const parsed = CF.parseCourse(COURSE_MD, { user: 'user 1' });
  if (!parsed.ok) { console.error('the real course no longer parses'); process.exit(1); }
  const course = { id: 42, ...parsed.lesson, begun: '2026-08-15', archived: false,
                   steps: parsed.lesson.steps.map(s => ({ ...s, done: false })) };

  /* Two attempts on module 1, one of them with the line for the next person. */
  const ATTEMPTS = {
    0: [
      { at: '2026-08-10', text: 'First go. Voltage is the push.', before: 'not-yet', after: 'with-help',
        stuck: 'Kept confusing voltage with current until the water analogy.', by: 'user 1' },
      { at: '2026-08-15', text: 'Second go, and this time I did it without the book open.',
        before: 'with-help', after: 'on-my-own', stuck: '', by: 'user 1' },
    ],
  };
  const attemptsFor = (id, i) => (id === 42 && ATTEMPTS[i]) || [];

  console.log('\n1 · What the folder is made of — pure, no disk yet\n');
  const built = FOLDER.courseFolderFiles(course, { attemptsFor, owned: () => false });
  ok('the folder has a findable name', /^junior-electrical/.test(built.slug), built.slug);
  const names = built.files.map(f => (f.sub ? f.sub + '/' : '') + f.name);
  ok('README, course.md and syllabus.md are all there',
     names.includes('README.txt') && names.includes('course.md') && names.includes('syllabus.md'),
     names.join(', '));
  ok('★ exactly one work file — the module with attempts, and no empty ones',
     names.filter(n => n.startsWith('work/')).length === 1, names.filter(n => n.startsWith('work/')).join(', '));
  ok('the work file sorts in course order', /^work\/01-/.test(names.find(n => n.startsWith('work/'))));

  /* ★ THE ONE EMITTER. course.md must be byte-identical to what the export
     button produces, or there are two Markdown writers and the round-trip
     guard has stopped meaning anything. */
  const LD = await import('../../src/game/data/lesson-doc.js');
  const direct = LD.lessonToMarkdown(CF.lessonFromCourse(course), { frontmatter: true });
  const inFolder = built.files.find(f => f.name === 'course.md').content;
  ok('★ course.md comes from the ONE emitter, byte for byte', direct === inFolder,
     direct === inFolder ? '' : 'lengths ' + direct.length + ' vs ' + inFolder.length);

  /* ★ AND IT GOES BACK IN. A folder whose course.md the Pavilion cannot read
     is a folder of souvenirs, not a course you can hand to someone. */
  const back = CF.parseCourse(inFolder, { user: 'user 1' });
  ok('★ and it parses straight back in', back.ok, (back.problems || []).join(' | '));
  ok('with every module', back.ok && back.lesson.steps.length === course.steps.length,
     back.ok ? back.lesson.steps.length + ' of ' + course.steps.length : '—');

  console.log('\n2 · Your working, as a document\n');
  const work = built.files.find(f => f.sub === 'work').content;
  ok('both attempts are in it', /First go/.test(work) && /Second go/.test(work));
  ok('with their dates', /2026-08-10/.test(work) && /2026-08-15/.test(work));
  ok('★ and the two honest answers, in words not numbers',
     /beforehand you said: \*\*not yet\*\*/.test(work) && /afterwards: \*\*with my notes\*\*/.test(work));
  ok('the line for the next person is there', /water analogy/.test(work));
  ok('nothing in it is a score', !/\d+\s*\/\s*\d+|\bgrade\b/i.test(work));

  console.log('\n3 · ★ REAL BYTES ON A REAL DISK — read back with fs, outside the app\n');
  const { ipcMain } = require('electron');
  /* Load main.cjs's handlers by requiring it would boot a window; instead the
     handlers are exercised through the same ipcMain the preload would reach.
     Registering them means requiring the module — so this reimplements nothing
     and tests the shipped code path. */
  process.env.SP_NO_WINDOW = '1';
  let handlers = null;
  try {
    handlers = require('../../electron/main.cjs');
  } catch (e) { /* main.cjs may open a window; the handles are registered either way */ }

  /* ⚠ _invokeHandlers IS PRIVATE, so say so out loud rather than letting an
     Electron upgrade turn this whole suite into "every write failed". A harness
     that cannot reach the code under test must report THAT, not a red result
     about the code. */
  if (!ipcMain._invokeHandlers || !ipcMain._invokeHandlers.get('desktop-course-write')) {
    console.error('\nCannot reach main.cjs\'s ipc handlers (ipcMain._invokeHandlers is private and may '
                + 'have moved in this Electron). This suite is not testing anything — fix the harness '
                + 'rather than trusting the result.\n');
    app.exit(2);
    return;
  }
  const invoke = (channel, arg) => {
    const h = ipcMain._invokeHandlers.get(channel);
    if (!h) return Promise.resolve({ ok: false, error: 'no handler for ' + channel });
    return h({}, arg);
  };

  let wrote = 0;
  for (const f of built.files) {
    const res = await invoke('desktop-course-write',
      { slug: built.slug, sub: f.sub, name: f.name, content: f.content });
    if (!res || !res.ok) { ok('writing ' + f.name, false, (res && res.error) || 'no handler'); break; }
    wrote++;
  }
  ok('every file reported written', wrote === built.files.length, wrote + ' of ' + built.files.length);

  const dir = path.join(tmp, 'courses', built.slug);
  ok('★ the directory exists on disk', fs.existsSync(dir), dir);
  if (fs.existsSync(dir)) {
    const onDisk = fs.readFileSync(path.join(dir, 'course.md'), 'utf8');
    ok('★ course.md on disk is the course, not an empty file',
       onDisk.length > 5000 && /Charge, Field & Potential/.test(onDisk), onDisk.length + ' bytes');
    const workDir = path.join(dir, 'work');
    const workFiles = fs.existsSync(workDir) ? fs.readdirSync(workDir) : [];
    ok('★ work/ has your attempt in it', workFiles.length === 1, workFiles.join(', '));
    if (workFiles.length) {
      const w = fs.readFileSync(path.join(workDir, workFiles[0]), 'utf8');
      ok('★ and the words are really there', /Second go, and this time/.test(w));
    }
    ok('the README says what the folder is', /THIS FOLDER IS A COURSE/.test(fs.readFileSync(path.join(dir, 'README.txt'), 'utf8')));
  }

  console.log('\n4 · Break the path safety on purpose\n');
  const bad = [
    ['a slug climbing out', { slug: '../../evil', sub: '', name: 'course.md', content: 'x' }],
    ['a name climbing out', { slug: built.slug, sub: '', name: '../evil.md', content: 'x' }],
    ['an absolute name', { slug: built.slug, sub: '', name: 'C:/evil.md', content: 'x' }],
    ['a sub nobody allowed', { slug: built.slug, sub: 'system32', name: 'course.md', content: 'x' }],
    ['an extension nobody allowed', { slug: built.slug, sub: '', name: 'course.exe', content: 'x' }],
  ];
  for (const [what, arg] of bad) {
    const res = await invoke('desktop-course-write', arg);
    ok('refused: ' + what, !!res && res.ok === false, JSON.stringify(res).slice(0, 80));
  }
  ok('★ and nothing landed outside the courses tree',
     !fs.existsSync(path.join(tmp, 'evil.md')) && !fs.existsSync(path.join(tmp, 'courses', 'evil.md')));

  console.log('\n5 · Listing it back, and knowing where it is\n');
  const listed = await invoke('desktop-course-list', { slug: built.slug });
  ok('the folder lists its own files', !!listed && listed.ok && listed.files.length === built.files.length,
     listed && listed.ok ? listed.files.length + ' files' : JSON.stringify(listed));
  ok('and it names the work subfolder as a subfolder',
     !!listed && listed.ok && listed.files.some(f => f.sub === 'work'));
  const where = await invoke('desktop-course-folder', { slug: built.slug });
  ok('it can say where it is, in a path a person can paste',
     !!where && where.ok && where.dir === dir, where && where.dir);

  console.log(failed ? `\n✗ course-folder: ${failed} failure(s)\n` : '\n✓ course-folder: all checks passed\n');
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
  app.exit(failed ? 1 : 0);
}).catch(e => { console.error(e); app.exit(1); });
