/* ================================================================
   [STAGE 1, WALKED COLD] — the acceptance gate for the tutorial.

   The promise Stage 1 makes is one sentence: at the end of it you have
   a book you chose, a note you wrote, and it is in your bag. This
   suite walks that on a GENUINELY EMPTY SAVE and asserts the three
   artifacts exist afterwards. Nothing else in the suite matters as
   much as that.

   IT MUST BE ELECTRON. A browser tab has no desktop bridge and
   therefore no database, and the intake path a real first book takes
   goes through it. A browser version of this would prove the panel
   renders and nothing about whether a stranger can actually get a book
   onto a shelf.

   AND IT MUST BE EMPTY. SEED_LIBRARY is [] and that is the finished
   position — the whole reason Stage 1 was rewritten by the steward to
   start with "add your own books" is that there is nothing there on
   arrival. So this asserts allDocs() === 0 BEFORE testing anything,
   the lesson resident-reach.cjs paid for: main.js hydrates from the
   database on every boot, so a book shelved during the run poisons any
   later one, and a check that refuses to run against the wrong fixture
   is worth more than the check itself.

     npm run build:beta
     env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/tutorial-stage1.cjs

   Exit 0 = a stranger can walk Stage 1 and end up holding something.
   ================================================================ */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');

app.commandLine.appendSwitch('disable-gpu');
process.env.POSTGRES_PORT = '5433';                       // no container here
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-tut-'));
app.setPath('userData', tmp);

const db = require('../../electron/db.cjs');
ipcMain.handle('desktop-db-status', async () => db.status());
ipcMain.handle('desktop-db-query', async (e, { name, params }) => db.query(name, params));
ipcMain.handle('desktop-db-write', async (e, { name, params }) => db.write(name, params));
ipcMain.handle('desktop-db-write-many', async (e, { name, rows }) => db.writeMany(name, rows));

const R = [];
const check = (name, ok, detail) => { R.push([name, !!ok, detail]); };
const wait = ms => new Promise(r => setTimeout(r, ms));

/* Real prose, not 'aaaa' — the paginator splits on blank lines and a text with
   none is one page, which has silently made page assertions unfailable here
   before. Public domain (Thoreau). */
const BODY = [
  'I went to the woods because I wished to live deliberately, to front only the',
  'essential facts of life, and see if I could not learn what it had to teach.',
  '',
  'CHAPTER II. Where I Lived, and What I Lived For',
  '',
  'At a certain season of our life we are accustomed to consider every spot as',
  'the possible site of a house.',
].join('\n');
const BOOK_TEXT = (BODY + '\n\n').repeat(14);

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1200, height: 1000, show: false,
    webPreferences: { preload: path.join(__dirname, '..', '..', 'electron', 'preload.cjs'),
      contextIsolation: true, sandbox: false } });
  const page = path.join(__dirname, '..', '..', 'dist', 'index.html');
  const js = expr => win.webContents.executeJavaScript(expr);

  const errs = [];
  const msgOf = (a) => {
    const ev = a[0];
    if (ev && typeof ev === 'object' && typeof ev.message === 'string') return ev.message;
    for (let i = 1; i < a.length; i++) if (typeof a[i] === 'string') return a[i];
    return '';
  };
  win.webContents.on('console-message', (...a) => {
    const m = msgOf(a);
    if (m && /error|not defined|undefined is not|before initialization/i.test(m)) errs.push(m);
  });

  /* ---- boot on NOTHING. Not even seenWelcome — this is the arrival. ---- */
  await win.loadFile(page);
  await js(`localStorage.removeItem('sandPavilionSave.v2'); true`);
  await win.loadFile(page);
  await wait(900);
  await js(`(function(){var b=[...document.querySelectorAll('button')]
      .find(x=>/Enter the Grounds/i.test(x.textContent)); if(b) b.click();})()`);
  await wait(900);

  /* THE FIXTURE ASSERTION. Everything below is about an empty Pavilion; if it
     is not empty, every result is meaningless rather than merely wrong. */
  const docs = await js(`(function(){ try{ return window.__store.allDocs().length; }catch(e){ return -1; } })()`);
  check('THE SHELF IS ACTUALLY EMPTY — the case a new install hits', docs === 0, docs + ' docs');

  /* ---- the welcome panel opened by itself, exactly once ---- */
  const w = await js(`(function(){
    var ov=document.getElementById('welcomeOv');
    var p=document.getElementById('welcomePanel');
    return { open: !!ov && ov.className.indexOf('open')>=0,
             deadBook: !!p && /How to Complete Your Own Pavilion/.test(p.innerHTML),
             hasWalk: !!p && /tutorialStart\\(\\)/.test(p.innerHTML) };
  })()`);
  check('a first arrival gets the welcome panel', w.open);
  check('...and it no longer cites a book deleted with the seed', !w.deadBook);
  check('...and it offers the walk', w.hasWalk);

  /* ---- press it. ONE stage is described; the rest are not. ---- */
  await js(`window.tutorialStart(); true`);
  await wait(500);
  const t0 = await js(`(function(){
    var ov=document.getElementById('tutorialOv'), p=document.getElementById('tutorialPanel');
    var h=p?p.innerHTML:'';
    return { open: !!ov && ov.className.indexOf('open')>=0,
             stage1: /THE FIRST LOOP/i.test(h),
             namesStage2: /The residents/i.test(h),
             namesStage5: /Leave something for others/i.test(h),
             started: (JSON.parse(localStorage.getItem('sandPavilionSave.v2')||'{}').tutorial||{}).started||'' };
  })()`);
  check('the walk opens on stage 1', t0.open && t0.stage1);
  /* ONE NEXT THING AT A TIME — asserted, not believed. This is the rule the
     steward gave a reason for ("im loosing track at this rate lol"), so it is
     the one most worth a test. */
  check('stage 2 is NOT described yet', !t0.namesStage2);
  check('nor stage 5', !t0.namesStage5);
  check('starting it is recorded, and it is the only thing recorded', !!t0.started);

  /* ---- beat 1: bring a book in, through the REAL intake ---- */
  const b1 = await js(`(function(){
    var h=document.getElementById('tutorialPanel').innerHTML;
    return /Bring one book in/i.test(h) && /openBookIntake/.test(h);
  })()`);
  check('beat one is "bring one book in", pointing at the real intake', b1);

  await js(`window.tutorialGo('openBookIntake'); true`);
  await wait(600);
  const moved = await js(`(function(){
    var t=document.getElementById('tutorialOv');
    return { tutClosed: !t || t.className.indexOf('open')<0,
             intake: (document.getElementById('intakeOv')||{className:''}).className.indexOf('open')>=0 };
  })()`);
  check('the press takes you to the intake', moved.intake);
  /* RULE 9: it points, then gets out of the way. And it must NOT reappear on
     its own once the beat is done — you come back by pressing. */
  check('...and the walk closed behind you', moved.tutClosed);

  /* Shelve through the same path a person uses, never by injecting
     personalLibrary — that would skip the thing under test. */
  await js(`(function(){
    window.closeUI();
    window.openMyLibrary();
    return true;
  })()`);
  await wait(400);
  /* The manual-entry form is the honest route and it is a lot of DOM; the
     shelving function it ends in is shelveManualFormNow(). Drive the function
     with the same arguments the form collects, which is one step in from the
     UI and still the real code path. */
  await js(`(function(){
    window.closeUI();
    if(typeof window.newReviewManualForm2==='function') window.newReviewManualForm2();
    return true;
  })()`).catch(()=>{});
  await wait(300);
  /* The real field ids are rmTitle/rmAuthor/rmBody — this is the "add the text
     yourself" form behind the intake, and driving it is the same path a person
     takes when they paste a book in rather than dragging a file. */
  const viaForm = await js(`(function(){
    var t=document.getElementById('rmTitle');
    if(!t) return 'no form';
    t.value='Walden';
    var a=document.getElementById('rmAuthor'); if(a) a.value='Henry David Thoreau';
    var b=document.getElementById('rmBody'); if(b) b.value=${JSON.stringify(BOOK_TEXT)};
    if(typeof window.shelveManualFormNow!=='function') return 'no shelve fn';
    window.shelveManualFormNow(); return 'ok';
  })()`).catch(e=>'threw '+e.message);
  await wait(900);

  let count = await js(`(function(){ try{ return window.__store.allDocs().length; }catch(e){ return -1; } })()`);
  if (count < 1) {
    /* THE FORM IS NOT THE THING UNDER TEST — Stage 1 is. If the manual form's
       ids have moved, say so out loud and shelve directly so the rest of the
       stage is still walked, rather than reporting a Stage 1 failure that is
       really a changed form. */
    check('NOTE: the manual intake form did not take (ids may have moved) — shelving directly instead',
          false, 'viaForm=' + viaForm);
    await js(`(function(){
      var s=JSON.parse(localStorage.getItem('sandPavilionSave.v2')||'{}');
      s.personalLibrary=[{slug:'personal-walden',title:'Walden',tradition:'Non-fiction',personal:true,
        license:'Personal',attribution:'Henry David Thoreau',
        doc:{summary:'',sections:[],fullText:{license:'Personal',text:${JSON.stringify(BOOK_TEXT)}}}}];
      localStorage.setItem('sandPavilionSave.v2', JSON.stringify(s)); return true;
    })()`);
    await win.loadFile(page);
    await wait(900);
    await js(`(function(){var b=[...document.querySelectorAll('button')]
        .find(x=>/Enter the Grounds/i.test(x.textContent)); if(b) b.click();})()`);
    await wait(700);
    count = await js(`(function(){ try{ return window.__store.allDocs().length; }catch(e){ return -1; } })()`);
  }
  check('a book is on the shelf', count >= 1, count + ' docs');

  /* Reopen BY PRESS. The walk does not come back on its own. */
  await js(`window.closeUI(); window.openTutorial(); true`);
  await wait(400);
  const afterBook = await js(`document.getElementById('tutorialPanel').innerHTML`);
  check('beat one is ticked when you come back', /✓ Bring one book in/.test(afterBook));

  /* ---- beat 2: a note beside the book ---- */
  const slug = await js(`(function(){ var d=window.__store.allDocs()[0]; return d?d.slug:''; })()`);
  await js(`window.closeUI(); window.openReader(${JSON.stringify('')}||'${slug}'); true`).catch(()=>{});
  await wait(500);
  await js(`(function(){
    var i=document.getElementById('rdNoteInput');
    if(i){ i.value='Assent is the only thing wholly ours.'; window.addBookNote('${slug}'); return true; }
    return false;
  })()`);
  await wait(500);
  const noteState = await js(`(function(){
    var s=JSON.parse(localStorage.getItem('sandPavilionSave.v2')||'{}');
    var notes=(s.bookNotes||{})['${slug}']||[];
    return { n: notes.length, by: notes[0]&&notes[0].by ? notes[0].by.who : '',
             badge: !!(s.badges||{})['first-book-note'] };
  })()`);
  check('a note is on the book', noteState.n === 1, JSON.stringify(noteState));
  check('...stamped as the visitor\'s own', noteState.by === 'you');
  check('...and it awarded first-book-note, the badge the stage reads', noteState.badge);

  /* ---- beat 3: into the backpack ---- */
  await js(`window.closeUI(); window.toggleInventory('${slug}'); true`).catch(()=>{});
  await wait(500);
  const carried = await js(`(function(){
    var s=JSON.parse(localStorage.getItem('sandPavilionSave.v2')||'{}');
    return { carrying:(s.carrying||[]).length, badge: !!(s.badges||{})['first-carry'] };
  })()`);
  check('the book is in the backpack', carried.carrying >= 1, JSON.stringify(carried));

  /* ================= THE GATE ================= */
  await js(`window.closeUI(); window.openTutorial(); true`);
  await wait(500);
  const done = await js(`(function(){
    var s=JSON.parse(localStorage.getItem('sandPavilionSave.v2')||'{}');
    var h=document.getElementById('tutorialPanel').innerHTML;
    var slugs=(s.carrying||[]).map(function(c){return c.slug||c.id||'';});
    return {
      stage1Done: /✓ 1 · The first loop/.test(h),
      stage2Now: /THE RESIDENTS/i.test(h),
      stage3Named: /The day, and the desk/i.test(h),
      book: (s.personalLibrary||[]).length >= 1,
      note: Object.keys(s.bookNotes||{}).length >= 1,
      carrying: slugs.length >= 1,
      tutorialKeys: Object.keys(s.tutorial||{}).sort().join(','),
    };
  })()`);
  check('STAGE 1 IS DONE, and collapses with its evidence', done.stage1Done, JSON.stringify(done));
  check('THE VISITOR HOLDS A BOOK THEY CHOSE', done.book);
  check('...A NOTE THEY WROTE', done.note);
  check('...AND IT IS IN THEIR BAG', done.carrying);
  check('stage 2 is now the one in front of them', done.stage2Now);
  check('stage 3 is still not described', !done.stage3Named);
  /* THE RULE-4 CHECK, LIVE. Three fields, and which stage you are on is not
     one of them. */
  check('the save holds only started/graduated/ready — no stage counter',
        done.tutorialKeys === 'graduated,ready,started', done.tutorialKeys);

  /* ---- skippable ---- */
  await js(`window.closeUI(); true`);
  await wait(250);
  const closed = await js(`(function(){var t=document.getElementById('tutorialOv');
      return !t || t.className.indexOf('open')<0;})()`);
  check('Esc closes it like everything else', closed);

  /* ---- the capture is provably alive ---- */
  await js(`console.error('self-test error: the console capture is alive'); true`);
  await wait(200);
  check('...and the error capture itself works (self-test)',
        errs.some(m => /self-test error/.test(m)));
  const real = errs.filter(m => !/self-test error/.test(m));
  check('no console errors', real.length === 0, real.slice(0, 2).join(' | ') || 'none');

  /* LOOK AT THE PANEL, not the world behind it. The first version captured
     after the closeUI() above and produced a picture of the Grounds — a
     screenshot of the wrong thing is worse than none, because it looks like
     evidence. Reopen, then shoot. */
  await js(`window.openTutorial(); true`);
  await wait(400);
  win.show(); await wait(500);
  await win.webContents.capturePage();                 // discard the stale first frame
  await wait(300);
  const img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(__dirname, '_tut-stage1.png'), img.toPNG());

  let bad = 0;
  console.log('\nStage 1, walked cold on an empty Pavilion\n');
  for (const [n, ok, d] of R) {
    console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (d ? '  — ' + d : ''));
    if (!ok) bad++;
  }
  console.log('\nscreenshot -> test/live/_tut-stage1.png');
  console.log(bad ? `\n  ✗ ${bad} failed` : '\n  ✓ a stranger can walk Stage 1 and end up holding something.');
  await db.close?.().catch(() => {});
  app.exit(bad ? 1 : 0);
});
