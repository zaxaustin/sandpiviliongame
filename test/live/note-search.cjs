/* ================================================================
   [SEARCH EVERY NOTE YOU HAVE WRITTEN] — 2026-08-04.

   The one thing localStorage cannot do, and the whole reason there is a
   database at all. This proves the round trip end to end, in Electron,
   against a real Postgres:

     the save's six note stores -> gatherNotes() -> the notes table
       -> to_tsvector/GIN -> back into the panel as extra matches

   IT MUST BE ELECTRON. The other live suites drive a browser at the preview
   server, where there is no desktop bridge and therefore no database — they
   can only stub it. A stub would prove the wiring and nothing about whether
   Postgres actually stems.

   ISOLATED ON PURPOSE. userData is redirected to a temp directory and the
   container port is pointed at nothing, so this always runs against a fresh
   EMBEDDED database and never writes test notes into the steward's real one.
   That also makes it the first-run case, which is the common case for
   everybody who is not the steward.

     npm run build:beta
     env -u ELECTRON_RUN_AS_NODE ./node_modules/.bin/electron test/live/note-search.cjs

   Exit 0 = search works.
   ================================================================ */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');

app.commandLine.appendSwitch('disable-gpu');
process.env.POSTGRES_PORT = '5433';                       // no container here
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-notesearch-'));
app.setPath('userData', tmp);

const db = require('../../electron/db.cjs');
ipcMain.handle('desktop-db-status', async () => db.status());
ipcMain.handle('desktop-db-query', async (e, { name, params }) => db.query(name, params));
ipcMain.handle('desktop-db-write', async (e, { name, params }) => db.write(name, params));
ipcMain.handle('desktop-db-write-many', async (e, { name, rows }) => db.writeMany(name, rows));

const R = [];
const check = (name, ok, detail) => { R.push([name, !!ok, detail]); };
const wait = ms => new Promise(r => setTimeout(r, ms));

/* A save with notes in three different stores, so the union really is
   exercised. The wording is chosen so the search term NEVER appears
   literally — "walking" must find "walked", or the index did nothing that
   a substring match could not already do. */
const SAVE = JSON.stringify({
  seenWelcome: true, aiConnections: [],
  notes: [
    { id: 'n1', title: 'On the path', body: 'He walked the whole path slowly, and it taught him patience.',
      created: '2026-08-01', updated: '2026-08-01' },
    { id: 'n2', title: 'Unrelated', body: 'A grocery list: rice, salt, lentils.',
      created: '2026-08-01', updated: '2026-08-01' },
    /* SEALED, and it matches the same stemmed query as n1. Added 2026-08-08:
       the whole point of the state is that an EXPLICIT ask cannot cross it, so
       the note that tests it has to be one the search would otherwise return.
       A sealed note nobody searched for proves nothing. */
    { id: 'n3', title: 'Not for anyone', body: 'I walked out of that meeting and never said why.',
      created: '2026-08-01', updated: '2026-08-01' },
  ],
  noteReach: { 'mynotes:n3': 'sealed' },
  /* A BOOK OF YOUR OWN. `notes.slug` is a foreign key into `books`, so a book
     note must have a real book to point at — that used to be a seed book, and
     the seed shelf was deleted 2026-08-10. Rule 1 wanted this anyway. */
  personalLibrary: [{ slug: 'personal-walden', title: 'Walden', tradition: 'Non-fiction',
    personal: true, license: 'Personal — license not certified', attribution: 'Henry David Thoreau',
    doc: { summary: 'Two years beside a pond.', sections: [],
           fullText: { license: 'Personal', text: 'I went to the woods.' } } }],
  bookNotes: {
    'personal-walden': [ { ts: '2026-08-02', text: 'The teachings here repay a second reading.', ch: 1, page: 3 } ],
  },
  chatNotes: { quill: 'She recommended beginning with the shorter discourses.' },
});

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1200, height: 900, show: false,
    webPreferences: { preload: path.join(__dirname, '..', '..', 'electron', 'preload.cjs'),
      contextIsolation: true, sandbox: false } });
  const page = path.join(__dirname, '..', '..', 'dist', 'index.html');
  const js = expr => win.webContents.executeJavaScript(expr);

  /* NO AI IS CONNECTED HERE, so every chat turn ends in the AI failing and
     sendChatMessage logs "[chat] <agent> turn failed". That line is EXPECTED
     and is separated out rather than filtered away silently — because seeing
     it is what proves this console capture works at all. A "no console errors"
     check that would pass with the capture broken is the vacuous-pass shape
     this suite has already been bitten by once today. */
  /* THIS CAPTURE WAS DEAD, and had been since the suite was written
     (found 2026-08-08 by the assertion below).

     The signature, MEASURED on Electron 43 rather than assumed:

       a[0]  event object — .message (string), .level ('error'|'warning')
       a[1]  level as a NUMBER — 3 error, 2 warning
       a[2]  the message string

     The old reader took `a[1]` as the message. It is the NUMBER, so
     `typeof m !== 'string'` threw every line away and "no console errors"
     passed no matter what the page logged — which is how a real TypeError in
     the notes-search path went unreported here for three runs today.

     Same bug in records.cjs and chapters-panel.cjs, fixed with them.
     packaged-boot.cjs was FINE — it read a[2] — and I briefly said otherwise
     before measuring; its comment now carries the correct account.

     So: read the message properly, and assert further down that something was
     actually captured. A capture nobody has proven is a comment. */
  const errs = [], chatFails = [];
  const msgOf = (a) => {
    const ev = a[0];
    if (ev && typeof ev === 'object' && typeof ev.message === 'string') return ev.message;
    for (let i = 1; i < a.length; i++) if (typeof a[i] === 'string') return a[i];
    return '';
  };
  win.webContents.on('console-message', (...a) => {
    const m = msgOf(a);
    if (typeof m !== 'string' || !m) return;
    if (/\[chat\] \w+ turn failed/.test(m)) { chatFails.push(m); return; }
    if (/error|not defined|undefined is not|before initialization/i.test(m)) errs.push(m);
  });

  // Seed the save, THEN reload — the save must exist before the first boot,
  // and setting it after load would be read by nothing.
  await win.loadFile(page);
  await js(`localStorage.setItem('sandPavilionSave.v2', ${JSON.stringify(SAVE)}); true`);
  await win.loadFile(page);
  await wait(600);

  const st = await db.status();
  check('it opened a database at all', st.up, `${st.kind} — ${st.label}`);
  check('and it is the embedded one, not the container', st.kind === 'embedded', st.kind);

  // The books table must know the seed, or a note on a seed book takes the
  // whole indexing transaction down with it (notes.slug is a foreign key).
  await js(`window.__store.hydrateFromDb()`).catch(() => null);
  await wait(400);
  const books = await db.query('catalogue');
  check('hydration seeded an EMPTY database', books && books.length > 0, `${books ? books.length : 0} books`);
  check("including the visitor's own book, so book notes have somewhere to point",
    !!(books || []).find(b => b.slug === 'personal-walden'), 'personal-walden present');

  await js(`window.openNotesLog(); true`);
  await wait(300);
  const total = await js(`document.querySelectorAll('#notesLogList .card, #notesLogList [onclick*="toggleNotesLogItem"]').length`);
  check('the Notes Log lists the save\'s notes', total >= 3, `${total} rows`);

  // ---- the actual question ----
  await js(`window.setNotesLogSearch('walking'); true`);
  await wait(1800);                       // debounce + sync + query

  const rows = await db.query('searchNotes', ['walking', 20]);
  check('the index itself answers a stemmed query', rows && rows.length > 0,
    `${rows ? rows.length : 0} row(s) for "walking"`);

  const html = await js(`document.getElementById('notesLogList').innerHTML`);
  check('"walking" FINDS "walked" in the panel', /walked the whole path/i.test(html),
    'the note is on screen');
  check('and it says so, rather than doing it invisibly', /found by meaning/i.test(html));
  check('the grocery list did NOT come along', !/lentils/i.test(html));

  /* Deletion must not leave a ghost in the index — a hit you cannot open is
     the silent wrong answer.

     DELETED THE WAY A PERSON DELETES IT. The first version of this check
     called Store.save() with the note removed, which writes localStorage but
     never touches the in-memory `data` the panel reads — so nothing was
     deleted, gatherNotes() still returned it, and the check failed against a
     prune that worked. Going through the app's own handler is both more
     honest and the only version that tests anything. */
  await js(`window.confirm = () => true; window.deleteNoteFromLog('n1'); true`);
  await js(`window.setNotesLogSearch('walking'); true`);
  await wait(1800);
  /* Asserts that N1 SPECIFICALLY is gone, rather than that the whole result
     set is empty. The count form broke on 2026-08-08 the moment a second note
     matching the same stem was added to the fixture — and it would have been
     "fixed" by weakening it. A check that means "this note left the index"
     should say that, not "nothing matches any more". */
  const after = await db.query('searchNotes', ['walking', 20]);
  const stillThere = (after || []).some(r => r.save_key === 'mynotes:n1');
  check('a deleted note leaves the index too', !stillThere,
    `n1 ${stillThere ? 'STILL INDEXED' : 'gone'}; ${after ? after.length : 0} other row(s) match`);

  /* ================================================================
     ASK A RESIDENT TO SEARCH YOUR NOTES — 2026-08-08.

     Everything above is the VISITOR searching their own Notes Log, which
     has worked since 2026-08-04. This is the same index reached on a
     RESIDENT's behalf, which data/lookup.js is explicit is a different
     act — and until today it was code with no caller.

     IT CAN ONLY BE TESTED HERE. The browser suite
     (test/live/carry-grounding.mjs) proves the button LOCKS with no
     database, which is real and is the half most people meet. It cannot
     prove the half that searches, because a browser tab has no database
     to search. This is that half.

     NO AI IS CONNECTED (aiConnections: []), and that is the point. The
     search runs while the system prompt is being BUILT, before AI.chat
     is ever called — so everything below is exercised and the model's
     absence only costs us the reply, which is not what is on trial.
     ================================================================ */
  await js(`window.closeUI(); true`);
  // restore the note the deletion test removed, so the search has its target
  await js(`(() => { const d = window.__data || null; return true; })()`);
  await js(`localStorage.setItem('sandPavilionSave.v2', ${JSON.stringify(SAVE)}); true`);
  await win.loadFile(page);
  await wait(700);
  await js(`window.__store.hydrateFromDb()`).catch(() => null);
  await wait(400);

  const dbUp = await js(`!!(window.__store && window.__store.dbAvailable && window.__store.dbAvailable())`);
  check('the renderer can see a database at all', dbUp, String(dbUp));

  await js(`window.talkTo('quill'); true`);
  await wait(300);
  const btn = await js(`(() => { const b=document.getElementById('askNotesBtn');
    return b ? { locked: b.dataset.locked || '', text: b.textContent } : null; })()`);
  check('the 🔎 button is LIVE here, not locked', btn && btn.locked !== '1' && btn.text === '🔎',
    btn ? `locked=${btn.locked} text=${btn.text}` : 'no button');

  // press it, exactly as a person does
  await js(`document.getElementById('chatInput').value = 'what did I write about walking?'; true`);
  await js(`window.sendCurrentChatMessageWithNotes(); true`);
  /* POLLED, not a fixed sleep. The receipt is painted by the final
     renderChatView(), which happens after AI.chat has failed and after
     finishPacedReveal() — a chain whose timing is not ours to predict with no
     model connected. A fixed wait here is a flaky suite, and a flaky suite
     gets its assertions weakened rather than its bug found. */
  let receipt = '';
  for (let i = 0; i < 40; i++) {
    receipt = await js(`document.getElementById('chatQuickActions').innerText`);
    if (/Searched your notes/i.test(receipt)) break;
    await wait(250);
  }
  check('the search happened and SAYS so', /Searched your notes/i.test(receipt), receipt.slice(0, 90));
  check('"walking" found "walked" for the resident too', /\b1 now in your|backpack/i.test(receipt),
    receipt.slice(0, 140));
  /* THE SEALED NOTE. It matches the query, the visitor asked explicitly, and
     it must still be refused — and SAID, so the person can see the rule
     holding rather than take it on trust. */
  check('the sealed note is reported as withheld', /1 .{0,3}sealed/i.test(receipt),
    receipt.slice(0, 200));

  /* WHAT IT FOUND IS IN THE BACKPACK — the steward's call, and what makes the
     search a way of filling the bag rather than a private channel around it. */
  const bag = await js(`JSON.stringify((window.carryList && window.carryList()) || [])`);
  const carried = JSON.parse(bag);
  const gotN1 = carried.some(e => e.kind === 'note' && e.ref === 'mynotes:n1');
  check('what it found landed in the backpack', gotN1, bag.slice(0, 240));
  /* NOT VACUOUS. The first run of this suite had an EMPTY backpack, and this
     check passed — for entirely the wrong reason. "The sealed note is not in
     the bag" means nothing unless the search put something in the bag at all;
     otherwise it is a suite going green because the thing it tests is switched
     off, which is CLAUDE.md rule 5 wearing a tick. So it is conditional on the
     positive case having worked. */
  check('THE SEALED NOTE WAS NOT PUT IN THE BACKPACK',
    gotN1 && !carried.some(e => e.ref === 'mynotes:n3'),
    gotN1 ? bag.slice(0, 240) : 'VACUOUS — nothing was carried at all, so this proves nothing');

  /* THE PROMPT ITSELF. recordSent() captures the exact message array handed to
     AI.chat — it runs BEFORE the call, so it exists even though the call
     failed. This is the artifact, not a reconstruction of it. */
  await js(`window.openPromptInspector('quill'); true`);
  await wait(400);
  const sent = await js(`document.getElementById('promptPanel').innerText`);
  const blockThere = /THEIR OWN NOTES, BECAUSE THEY ASKED/i.test(sent);
  check('the notes block reached the prompt', blockThere,
    'the block is absent from what was actually sent');
  check('the found note is in it', /walked the whole path/i.test(sent), 'the note text is missing');
  /* Again conditional on the block existing. "The sealed note is not in the
     prompt" is trivially true of a prompt with no notes block in it, and that
     is precisely the state the first run was in while this reported PASS. */
  check('*** THE SEALED NOTE IS NOT IN WHAT WAS SENT ***',
    blockThere && !/never said why/i.test(sent),
    blockThere ? 'A SEALED NOTE REACHED THE MODEL' : 'VACUOUS — there was no notes block at all');
  check('the grocery list did not come along either', blockThere && !/lentils/i.test(sent),
    blockThere ? 'an unrelated note leaked in' : 'VACUOUS — no notes block');

  /* ONE PRESS, ONE SEARCH. The ask is cleared in a `finally`, so the NEXT
     message must not search anything. Deleting that finally is the first
     sabotage case for this feature, and this is the check that catches it. */
  /* IN THE SAME CONVERSATION, and that is the whole point of the check.

     The first version reopened the chat with talkTo() first — which builds a
     FRESH state.dialog with askNotes:false, so the flag was reset by the new
     conversation rather than by the `finally`. Deleting the finally entirely
     still passed. Caught by breaking it on purpose, 2026-08-08; it is the
     third guard I have written this week that tested nothing. A lingering
     permission is a within-one-conversation risk, so the test has to stay in
     one conversation. */
  await js(`window.closeUI(); true`);
  await wait(200);
  await js(`document.getElementById('chatInput').value = 'and what about patience?';
            window.sendCurrentChatMessage(); true`);
  await wait(3000);
  const sent2 = await js(`window.openPromptInspector('quill');
    new Promise(r => setTimeout(() => r(document.getElementById('promptPanel').innerText), 300))`);
  /* Conditional on the FIRST message having searched, for the same reason as
     above: "the second message did not search" is trivially true if neither
     did. This one is the most tempting of all to leave vacuous, because it is
     the check whose whole job is to fail when someone deletes the `finally`. */
  check('*** THE NEXT MESSAGE DID NOT SEARCH *** (the ask does not linger)',
    blockThere && !/THEIR OWN NOTES, BECAUSE THEY ASKED/i.test(sent2),
    blockThere ? 'askNotes survived into a second message — it is now a standing permission'
               : 'VACUOUS — the first message never searched either');
  /* ...but the backpack is still grounding, because the note it found is in
     there now. That is the loop closing: the search filled the bag, and the
     bag is what the resident reads from here on. */
  check('...but what it found is still grounding, from the backpack',
    /WHAT THE VISITOR IS CARRYING/i.test(sent2) && /walked the whole path/i.test(sent2),
    'the carried note stopped reaching the resident');

  /* ================================================================
     ONE PATHWAY, N BEHAVIOURS — the headline claim of 2026-08-08.

     Measured that morning it was 2 of 7: only Quill and the Monk could
     reach the Library. The Investigator, whose stated duty is "insists
     on evidence someone else could check", could not look up a book.

     A unit test can only assert that residents.js CALLS pathwayBlock.
     This asserts that a real resident, against a real database, is
     actually handed real rows — which is the thing that was false.
     ================================================================ */
  for (const who of ['investigator', 'tutor', 'steward', 'computer', 'sebastian']) {
    await js(`window.closeUI(); window.talkTo('${who}'); true`).catch(() => {});
    await wait(150);
    const p = await js(`(async () => {
      const d = document.getElementById('chatInput');
      if (d) d.value = 'is there anything here about walden?';
      window.sendCurrentChatMessage();
      await new Promise(r => setTimeout(r, 1200));
      window.openPromptInspector('${who}');
      await new Promise(r => setTimeout(r, 300));
      return document.getElementById('promptPanel').innerText;
    })()`).catch(e => 'threw: ' + e.message);
    check(`${who} can look a book up now`, /YOU LOOKED THIS UP/i.test(p),
      'no lookup block in what was actually sent — this resident is still answering from memory');
    check(`${who} is told what to DO with it (its lens)`, /WHAT YOU DO WITH ANY OF THAT/i.test(p),
      'the pathway arrived without the lens — every resident would answer identically');
  }

  check('no console errors', errs.length === 0, errs[0] || 'none');
  /* The capture is alive — and this is not a formality. On 2026-08-08 a real
     TypeError inside the notes-search path was invisible for three runs
     because sendChatMessage's catch swallowed it and blamed the model. It logs
     now, and this check is what keeps the logging honest. */
  check('...and the console capture is actually working', chatFails.length > 0,
    'expected the AI-less turns to log "[chat] … turn failed" and saw none — '
    + 'if the capture is dead, "no console errors" above proves nothing');

  console.log('\n--- search every note you have written ---');
  let bad = 0;
  for (const [n, ok, d] of R) { if (!ok) bad++; console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); }
  console.log(bad ? `\n  ${bad} FAILED\n` : '\n  ✓ the index is real and the panel uses it.\n');

  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* windows holds it */ }
  app.exit(bad ? 1 : 0);
});
