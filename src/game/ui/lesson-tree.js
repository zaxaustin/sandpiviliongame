/* ================================================================
   [THE LEARNING TREE] — the curriculum, the lessons you write
   yourself, drafting one with a model, and taking one out as a
   document.

   Cut #1 of `plans/OVERLAYS-SPLIT-PLAN.md`, moved out of
   `ui/overlays.js` on 2026-08-04. It is the region the visual-tree
   work lands in next, which is why it went first.

   Moved VERBATIM — not one line of the 998 was rewritten. What it
   needs from the rest of the application arrives through
   initLessonTree() rather than an import, so this file never imports
   backwards and there is no cycle. Same seam as ui/residents.js and
   ui/study-table.js.

   THE WINDOW-EXPORT BLOCK STAYS IN overlays.js, which owns it. Every
   handler here is re-listed over there, and `npm test` checks that
   join in both directions across the whole ui/ directory.
   ================================================================ */

import { state, data, persist, todayKey, logActivity, awardBadge } from '../entities.js';
import { blip } from '../main.js';
import { Store } from '../data/store.js';
import { esc, jsq, mdLite, NOTE_SELECT_STYLE } from './dom.js';
import { parseSteps, stepsToText } from '../data/course-format.js';
import { byLine, currentUser } from '../data/note-versions.js';
import { WORK_CHARTER } from '../data/charter.js';
import { AI, isEmptyReply, chatOptsFor } from '../ai/provider.js';
import { planToLesson } from '../data/plan-to-lesson.js';
import { chapterAt, findChapters } from '../data/chapters.js';
import { paginate } from '../data/retrieval.js';
import { isAIActive } from '../ai/provider.js';
import { parseDraftedSteps, tooSimilarStep } from '../data/draft-parse.js';
import { stopSpeaking } from '../tts.js';
import { readingIn, readingLabel, lessonToMarkdown, lessonToHTML, lessonFileName } from '../data/lesson-doc.js';

let X = {};
export function initLessonTree(deps) { X = deps || {}; }

const closeUI                = (...a) => X.closeUI(...a);
const hideAllOv              = (...a) => X.hideAllOv(...a);
const showOv                 = (...a) => X.showOv(...a);
const openReader             = (...a) => X.openReader(...a);
const openFullText           = (...a) => X.openFullText(...a);
const renderFullTextPage     = (...a) => X.renderFullTextPage(...a);
const chapterPages           = (...a) => X.chapterPages(...a);
const loadBookText           = (...a) => X.loadBookText(...a);
const currentDocSlug         = (...a) => X.currentDocSlug(...a);
const newNoteId              = (...a) => X.newNoteId(...a);
const openChatDialog         = (...a) => X.openChatDialog(...a);
const renderChatView         = (...a) => X.renderChatView(...a);
const openIndex              = (...a) => X.openIndex(...a);
const openCourses            = (...a) => X.openCourses(...a);
const openCommonsTable       = (...a) => X.openCommonsTable(...a);
const openPacket             = (...a) => X.openPacket(...a);
const publishFrom            = (...a) => X.publishFrom(...a);
const commonsStore           = (...a) => X.commonsStore(...a);
const cleanAnswer            = (...a) => X.cleanAnswer(...a);
const visBadge               = (...a) => X.visBadge(...a);
const openNotesLog           = (...a) => X.openNotesLog(...a);
const refreshNoteEditors     = (...a) => X.refreshNoteEditors(...a);
const setHud                 = (...a) => X.setHud(...a);

/* ================================================================
   The Learning Tree — COURSE-PROGRESSION-PLAN.md, Phase 0+1, beta-
   tested with the "A Beating Heart" lesson (lessons/01). Built-in,
   curated curriculum (like the Hall's seed investigations), distinct
   from the personal Course Board (data.courses). Nodes form a real
   prerequisite tree: a node is available only once its prereqs are
   done, locked-but-visible otherwise (you can see the whole climb).
   Progress is per-node in data.curriculum, saved like everything else.

   Two philosophies baked in at the user's ask:
   - Self-first, AI-last: every step is written to have you FIND and DO
     it yourself; asking a resident to help is offered only as the last
     resort, never the first move.
   - Privacy/sandbox: stated plainly at the top — nothing here leaves
     your machine; the Pavilion is your own private sandbox.
   ================================================================ */
const CURRICULUM = [
  // ---- Getting Started ----
  { id:'beating-heart', track:'Getting Started', level:101, prereqs:[],
    title:'A Beating Heart — get your local AI running',
    summary:"Give the Pavilion its heartbeat: a free AI running on your own machine, so the residents actually talk back. No coding, about 20 minutes.",
    more:'lessons/01-a-beating-heart.md',
    steps:[
      {title:'Check what YOUR machine can run', body:"Open Task Manager (Ctrl+Shift+Esc) → Performance and note your RAM, and whether you have a real graphics card. Match it to a model size — pick smaller if unsure. Do this yourself first; it's the habit that makes all the rest make sense."},
      {title:'Install Ollama', body:"Get it from ollama.com (or, on Windows, `winget install Ollama.Ollama`). It runs quietly in your system tray afterward."},
      {title:'Pull your model', body:"In a terminal: `ollama pull llama3.2` (or the size your machine fits). Run `ollama list` to confirm it downloaded."},
      {title:'Connect it to the Pavilion', body:"Desktop app: automatic. Browser: set OLLAMA_ORIGINS (the full lesson shows how). Look for the green ● Connected line on the title screen.", action:{label:'Open ⚙ Manage AI connections', fn:'openConnections'}},
      {title:'Say hello to Quill (the real test)', body:"Talk to Quill in the Library. If he answers in his own words, grounded in the actual books — your Pavilion has a beating heart."},
    ]},
  { id:'first-book', track:'Getting Started', level:101, prereqs:[],
    title:'Make the Library yours — add your first book',
    summary:"The Library grows because you grow it. Bring in a book you actually want to read. (No AI needed — this one stands on its own.)",
    more:'PROTOCOLS.md',
    steps:[
      {title:'Find a genuinely free book', body:"Project Gutenberg or Standard Ebooks. 'Free to read' isn't the same as 'free to keep' — look for public domain or a CC license. Pick something you truly want; that's the point."},
      {title:'Get it as .epub or .txt', body:"Most sites offer both. EPUB is fine — the game unpacks it itself, no conversion."},
      {title:'Drop it on the Caravan Desk', body:"Workshop → face the Caravan Desk (press E) → '+ Add a text by hand' → drag your file onto the drop zone. Title and author fill themselves in.", action:{label:'Open the Caravan Desk', fn:'openReviewQueue'}},
      {title:'Pick its shelf and add it', body:"Choose the shelf (tradition), confirm the license, and press '📚 Add to my Library now.' It appears on that shelf, marked 👤 as yours."},
      {title:'Go read it', body:"Walk to the shelf you chose (or Your Shelf by the reading nook) and open your book. It's part of your Library now — and you can always find it in the Stacks.", action:{label:'Browse the Stacks', fn:'openCatalog'}},
    ]},
  { id:'library-storage', track:'Getting Started', level:201, prereqs:['first-book'],
    title:'Room for a Library — local storage with Docker (optional)',
    summary:"For a BIG library, not just a few books: give the Pavilion a local storage room with Docker + MinIO, on your own machine. Optional and a bit more advanced — personal books need none of this.",
    more:'lessons/02-room-for-a-library.md',
    steps:[
      {title:'Decide if you need it', body:"Only if you want a large, growing collection of full texts. A few personal books are stored as plain files already — no Docker needed. Be honest about which you're doing before setting anything up."},
      {title:'Know the size (it’s reassuring)', body:"A whole book as text is under ~1 MB, so 1 GB holds ~1,000 books. Give it about 32 GB of headroom to start — 'as big as a game' — which is far more than you'll likely use. You don't pre-carve a fixed size; it just grows in the folder you give it."},
      {title:'Install Docker Desktop', body:"From docker.com. On Windows it sets up WSL2 for you; restart if asked, and let the whale icon go steady."},
      {title:'Run MinIO, pointed at a real folder', body:"One `docker run` line (see the full lesson) with `-v C:\\sand-pavilion-library:/data` — that folder on your drive IS your library's storage. Do it yourself following the lesson; that's how you'll know how to move or grow it later."},
      {title:'Confirm and grow when needed', body:"`curl http://localhost:9000/minio/health/live` should answer. To grow later: it grows on its own, or move the folder to a bigger drive and re-run. There's no cap but your disk."},
    ]},
  { id:'meet-residents', track:'Getting Started', level:101, prereqs:['beating-heart'],
    title:'Meet the residents — put the heartbeat to work',
    summary:"Now that your AI is running, actually work with the people who live here. This one needs a beating heart first.",
    steps:[
      {title:'Ask Quill about the shelves', body:"In the Library, ask Quill what's worth reading for something you actually care about. He's grounded in the real books."},
      {title:'Sit with the Monk', body:"In the Keep, bring the Monk a real question of meaning or practice — not trivia. He answers differently than the others."},
      {title:'Plan a day with Sebastian', body:"In the Workshop, ask Sebastian for a schedule, then use '📋 Send this plan to today' to drop it straight onto your calendar and plan.", action:{label:'Open the Calendar', fn:'openCalendar'}},
      {title:'Notice where it all happened', body:"Every one of those conversations ran on your own machine and left it never. That's the whole idea — help that's genuinely yours."},
    ]},
  // ---- Coding (the next track — shown so you can see the shape and what's missing) ----
  /* WRITTEN FOR REAL 2026-07-28, and deliberately reordered from the outline it
     replaces. The old shape saved "make a change" for last, as a reward for
     understanding. That is backwards: changing one line and watching it happen
     is what makes the rest worth learning, so it moved to step 2. Everything
     after it exists to make changing things feel safe rather than frightening. */
  { id:'coding-101', track:'Coding', level:101, prereqs:['beating-heart'],
    title:'Coding 101 — your first real change to this actual place',
    summary:"Not a course about programming in the abstract — six steps in this codebase, on your machine. By the end you will have changed something in the Pavilion, proved you didn't break it, and saved that change under your own name. That is the whole unlock: after it, every idea you have becomes something you can try instead of something you have to ask for.",
    steps:[
      {title:'Five commands, and that is genuinely most of it',
       body:"Open a terminal in the project folder. `npm run dev` starts it and gives you a localhost link. `npm test` checks nothing is broken. `git status` shows what you changed. `git diff` shows exactly what. `git log --oneline -5` shows the last five things anyone did. That is the working set — everything else you can look up when you need it. The terminal is not a skill, it is a habit of typing five things."},
      {title:'Change one line, and watch it change',
       body:"With `npm run dev` running: open `src/game/ui/overlays.js`, find any sentence you have read in the app — search for a phrase you remember seeing — and edit it. Save. The browser updates by itself, instantly. That's it. That's the whole loop, and it is the same loop for a one-word fix and a new room. Sit with how small it is for a second, because the size of that gap is the thing that was stopping you."},
      {title:'Break something on purpose, then read the error',
       body:"Delete a closing brace and save. The app goes blank and the console (F12 → Console) says exactly where. Put it back. Do this once deliberately, while nothing is at stake, so that the first time it happens by accident you recognise it as information rather than disaster. Every error message names a file and a line number; that is the message telling you where to look, not scolding you."},
      {title:'Prove you did not break anything else',
       body:"Run `npm test`. It takes about a second and checks the things this project has actually got wrong before: a button wired to a function that doesn't exist, a room with no exit, a save field that never got a privacy line. If it passes, your change is safe. This is why changing things stops being frightening — you are not relying on care, you have a net."},
      {title:'Save it under your own name',
       body:"`git add -A`, then `git commit -m \"my first change\"`. That version now exists forever and you can always return to it — which means from here on, nothing you try can lose anything. This is the actual reason git matters, and it is worth learning for that reason alone rather than because it is professional.",
       action:{label:'Read The Log — the same idea, for days', fn:'openActivity'}},
      {title:'Trace one button from click to answer',
       body:"Pick a button in the app. Search `overlays.js` for its label, find the `onclick=\"someName()\"` beside it, then search for `function someName`. Read that function. You have now followed a real path from a thing you pressed to the code that answered — the single most useful thing you can learn to do, because after this you can find anything by pulling on the visible end of it.",
       action:{label:'Open the Computer and ask it to walk you through one', fn:'openComputer'}},
    ]},
  // ---- Electronics (the beta test for the lab + research room — RESEARCH-ROOM-PLAN.md) ----
  { id:'electronics-101', track:'Electronics', level:101, prereqs:[],
    title:'Electronics 101 — light your first LED',
    summary:"Teach yourself the real basics, hardware or not, and use the Science Hall as your lab to test what you learn. This is the beta test for the research room — notice anywhere you think 'where do I put this?'",
    steps:[
      {title:'The core idea: voltage, current, resistance', body:"Voltage pushes, current flows, resistance limits — and Ohm's law ties them together: V = I x R. Get this one idea solid before touching parts. Find a free primer yourself; All About Circuits has a free online textbook and SparkFun's tutorials are friendly."},
      {title:'Start with no hardware — a free simulator', body:"You don't need to buy anything to begin. The free Falstad circuit simulator (falstad.com/circuit) builds and runs circuits right in your browser — wire a battery, a resistor, and an LED and watch the current move."},
      {title:'Light an LED (the hello-world)', body:"In the simulator, or a cheap breadboard kit if you have one: battery -> resistor -> LED -> back to battery. The resistor keeps the LED from burning out. Getting it to glow is electronics' hello-world."},
      {title:'Test it in the Lab', body:"Now use the Science & Research Hall as your lab: open a self-experiment or an investigation like 'does doubling the resistor roughly halve the brightness?' Predict first, then check in the simulator or with a meter. Letting the evidence settle it IS the lab working.", action:{label:'Open the Science & Research Hall', fn:'openScienceHall'}},
      {title:'Keep your notes and a datasheet', body:"Every component has a datasheet. Find your LED's, paste it into the Research Desk, and summarize it into notes you keep. Your growing electronics notes and ideas live there — private until you choose to share a build.", action:{label:'Open the Research Desk', fn:'openResearchDesk'}},
    ]},
  { id:'electronics-201', track:'Electronics', level:201, prereqs:['electronics-101'],
    title:'Electronics 201 — measure for real, and read the drawing',
    summary:"101 was one glowing LED. This rung is about stopping guessing: a meter in your hand, a schematic you can actually read, and the two parts that turn a circuit from a light into a machine. Everything here is checkable against a number.",
    steps:[
      {title:'Buy the one tool that matters',
       body:"A multimeter, £15-40. Not the most exciting purchase you will ever make and easily the most useful: it is the difference between \"I think there's power there\" and knowing. Get one with a continuity beeper — you will use that more than any other setting, because most of debugging is asking \"is this actually connected to that?\" and hearing the answer without looking up."},
      {title:'Measure the three quantities you already know the names of',
       body:"Voltage is measured ACROSS a component — probes on either side, circuit running. Current is measured THROUGH it — you break the circuit and let the meter complete it, which feels wrong the first time and is correct. Resistance is measured with the power OFF and the part out of circuit, or you are measuring the whole board. Do all three on the LED circuit from 101. Write the numbers down."},
      {title:'Predict, then measure — this is the actual lesson',
       body:"Before you touch the probes: work out from Ohm's law what the current SHOULD be, and write the number down. Then measure it. It will be close but not equal, and the gap is the real lesson — resistors are typically ±5%, your battery is not exactly 9V, and the LED's forward voltage is a range not a value. A circuit that behaves exactly as calculated usually means you calculated what you measured. Log this one at the Bench.",
       action:{label:'Open the Bench and predict it first', fn:'openScienceHall'}},
      {title:'Read a schematic, and then draw one',
       body:"A schematic is a sentence about connection, not a picture of a board — the layout means nothing, only what touches what. Learn six symbols and you can read most beginner circuits: battery, resistor, capacitor, diode/LED, switch, ground. Then do the harder half: draw YOUR breadboard circuit as a schematic. Anything you cannot draw, you have not understood yet, and that is worth finding out on paper rather than at 2am with a meter."},
      {title:'The transistor: a switch with no moving parts',
       body:"A small current into the base lets a much larger current flow collector-to-emitter. That is the whole idea, and it is the single most important sentence in electronics — every computer is this trick, repeated. Wire a 2N3904 so a microcontroller pin can switch an LED far brighter than the pin could ever drive directly. Base resistor around 1k. Note that you have just built the exact circuit the remote needs."},
      {title:'The capacitor: a bucket for charge',
       body:"It resists CHANGE in voltage, which makes it two things at once: a small local reservoir that steadies a supply when something suddenly draws current (a \"decoupling cap\", why boards are covered in them), and half of every timing circuit, because charging through a resistor takes a predictable amount of time. Both uses are the same property seen from different sides."},
      {title:'Break something on purpose',
       body:"Take an LED, leave out the resistor, and connect it straight across the battery. It will flare and die, and you will never again wonder why the resistor is there. Do it once, deliberately, with a component you can afford to lose — a lesson you paid a few pence for is one you keep. Then log what you predicted and what actually happened.",
       action:{label:'Log it at the Bench', fn:'openScienceHall'}},
    ]},
  { id:'electronics-301', track:'Electronics', level:301, prereqs:['electronics-201'],
    title:'Electronics 301 — build a universal remote from scratch',
    summary:"A real project with a real ending: a thing on your table that changes the channel. Six stages, each finishing in something that works. This is where the meter, the transistor and the datasheet stop being exercises. Full reading list, parts and the protocol reference are in plans/UNIVERSAL-REMOTE-PROJECT.md.",
    steps:[
      {title:'Understand why the beam is chopped',
       body:"A remote does not send plain infrared. It chops the beam roughly 38,000 times a second. The reason is the best idea in the whole project: sunlight, bulbs and fluorescent tubes all pour out infrared, so a plain flash is a whisper in a shouting room — but chop it at a known frequency and band-pass filter for exactly that frequency at the far end, and everything that is not your signal falls away. That is amplitude modulation and noise rejection, the spine of radio, on a breadboard for eight dollars."},
      {title:'Stage 1 — see the signal',
       body:"A TSOP38238 receiver (three pins: ground, Vs, out) and an Arduino. Print the raw pulse timings from your own TV remote to the serial monitor. Nothing is decoded yet — you are just looking at the numbers coming off a real remote. This is your first genuine measurement of something you did not build."},
      {title:'Stage 2 — decode one frame BY HAND',
       body:"Take a capture from stage 1 and work out the bits on paper before letting any library do it. NEC format: a 9ms burst and 4.5ms space to open, then 32 bits — a 560us burst every time, followed by a 560us space for 0 or a 1690us space for 1. The 32 bits are address, address inverted, command, command inverted. Check that the inverted copies really are complements: if they are not, you misread the frame. This is the stage everyone skips and the only one that teaches you anything."},
      {title:'Stage 3 — send one command',
       body:"An IR LED (TSAL6200) driven through a 2N3904 — the exact transistor circuit from 201, and now you know why the pin alone will not do: a pin gives about 20mA and the LED is rated for far more, and range depends on it. Transmit the power code. The TV responds. That is the moment it stops being an exercise.",
       action:{label:'Predict the range before you try it', fn:'openScienceHall'}},
      {title:'Stage 4 — capture and replay anything',
       body:"Store the raw timings, play them back. This alone is a working LEARNING remote — the same thing sold in shops — and it works on devices whose protocol you never identified, because you are replaying the waveform rather than understanding it."},
      {title:'Stage 5 — make it universal',
       body:"Decode to protocol plus address plus command rather than raw timings, keep a table of device codes, and add a keypad. The difference between stage 4 and stage 5 is the difference between a recording and a language: now you can send a command you never captured."},
      {title:'Stage 6 — make it an object',
       body:"An enclosure off the 3D printer, a battery, real buttons. Something that sits on the table and belongs there. Then write the whole thing up at the Bench — what you predicted at each stage and what actually happened — because a build log someone else could follow and reproduce is worth more than the remote.",
       action:{label:'Read your build log with the Investigator', fn:'openLab'}},
    ]},
  // ---- Cybersecurity (planned — CYBERSECURITY-PLAN.md; defensive/educational, authorized practice only) ----
  { id:'security-101', track:'Cybersecurity', level:101, prereqs:[],
    title:'Security 101 — see what your own machine is doing',
    summary:"Security starts with SEEING, not with tools. Six steps, each one a real thing you look at on your own computer — most of them using the Computer in the Study, and every one naming the Linux command that does the same job for real. Defensive and educational throughout: you learn to watch your own machine, and anything adversarial happens on targets that exist to be broken.",
    steps:[
      {title:'Learn to ask the machine: man',
       body:"Open the Computer and type `man`. Then `man ls`, then `man man`. Every page says what the command does HERE and what its equivalent is on a real Linux or macOS box — because these commands were named after real ones on purpose. This first step is the whole method: when a word is unfamiliar, ask the machine instead of guessing. On Linux that habit is `man <thing>`, `apropos <word>` when you don't know the name, and `--help` when you just want the flags.",
       action:{label:'Open the Computer', fn:'openComputer'}},

      {title:'Know what you are trusting: hash something',
       body:"In the Computer: `ls`, then `hash 1`. You get a SHA-256 — sixty-four characters that change completely if one character of that book changes. That is the whole idea, and it is the foundation under signed downloads, package managers and git. You have already relied on it: it is how you checked the Pavilion's own installer was the file it claimed to be. Do it to a book you own so it stops being abstract. `man hash` gives you `sha256sum` for real files.",
       action:{label:'Try it at the Computer', fn:'openComputer'}},

      {title:'Know what is talking: type net',
       body:"In the Computer: `net`. It tells you, honestly, that this app makes no network requests on its own — and then tells you not to believe it and how to check (F12 → Network → reload; it stays empty). **Verify it.** A claim you tested is worth more than a promise you were given, and being the kind of person who checks is most of security. `man net` gives you the real versions: `ss -tulpn` on Linux to see what is LISTENING on your machine and which program owns each port, `lsof -i` from the other side.",
       action:{label:'Run net, then check it yourself', fn:'openComputer'}},

      {title:'Look at your own machine, outside the game',
       body:"Now the real thing, with no Pavilion involved. On Windows: Task Manager → Details for what is running, and `netstat -ano` in a terminal for what is listening. On Linux or macOS: `ps aux`, `ss -tulpn`, `lsof -i`. You will not understand most of it, and that is correct — the skill is noticing what is NORMAL for your machine, so that one day something abnormal stands out. Write down three things you did not recognise and look them up. That is a real evening's work and worth more than any course."},

      {title:'Where the line is, and why we hold it',
       body:"Two rules this project holds to and you should too. First: only ever probe machines you own or have written permission to test — the difference between a security researcher and a criminal is permission, not skill. Second: the Pavilion will never ship a fake vulnerable box for you to break. A simulated target teaches simulated lessons, and this whole project's ethic is that the checkable thing is the real thing. So the seeing happens here, on your own machine, honestly; the breaking happens somewhere built for it."},

      {title:'Practise where it is legal: Hack The Box',
       body:"HTB Academy's Starting Point is free, guided, and consists entirely of machines that exist to be broken into. TryHackMe is the gentler sibling and also good. Both give you a legal target, a hint when you are stuck, and a writeup when you are done. This is the honest next rung and it is deliberately OUTSIDE the Pavilion — build the habit of seeing here, and go and practise where the targets are real and permitted.",
       action:{label:'Add these to your Waypoints', fn:'openWaypoints'}},

      {title:'Then: Linux, and the tools that live there',
       body:"Nearly all of this work happens on Linux, and the reason is not fashion — it is that the tools are there, they are free, and the system is legible in a way that rewards looking. A cheap old laptop with Ubuntu or Debian on it, or WSL on the Windows machine you already have, is enough to start. Everything you learned in the steps above is the same word: `ls`, `man`, `sha256sum`, `ss`. You will already know how to ask.",
       action:{label:'Keep this as a Path you are walking', fn:'openPaths'}},
    ]},
];
/* ----- Lessons you wrote yourself (ADMIN-AND-AUTHORING-PLAN #3).
   The built-in CURRICULUM lives in this file — source code — so until now a
   visitor could build a Course Board course but never a PROGRESSION: a 101
   that unlocks a 201. That's the thing COURSE-PROGRESSION-PLAN calls crucial
   for other people getting on board, and it's exactly what a teacher wants.
   So the tree now reads from two places. Yours carry `mine:true`, sit in
   their own track, and are otherwise ordinary nodes — prerequisites, progress,
   and "Study with the Tutor" all work on them unchanged. */
function myLessons(){ if(!data.myLessons) data.myLessons=[]; return data.myLessons; }
function allNodes(){ return [...CURRICULUM, ...myLessons()]; }
function curriculumNode(id){ return allNodes().find(n=>n.id===id); }
function lessonProgress(id){ return data.curriculum[id]||(data.curriculum[id]={steps:{}}); }
function lessonDone(node){ if(!node||!node.steps.length||node.status==='planned') return false; const p=data.curriculum[node.id]; return !!p && node.steps.every((_,i)=>p.steps[i]); }
function lessonAvailable(node){ return (node.prereqs||[]).every(pid=>lessonDone(curriculumNode(pid))); }
function lessonCompletedCount(node){ const p=data.curriculum[node.id]; return p ? node.steps.filter((_,i)=>p.steps[i]).length : 0; }
export function openLearningTree(){ state.ui='tree'; hideAllOv(); state.treeView={mode:'list'}; renderLearningTree(); showOv('treeOv'); }
export function openLesson(id){
  const node=curriculumNode(id); if(!node) return;
  /* A locked lesson OPENS — changed 2026-08-02, and it is the change the whole
     progression principle turns on. The gate is on the CLAIM, never on the
     learning: nothing here is ever withheld from anyone, and a tree that hides
     its own text from you is a wall rather than a ladder. What "locked" costs
     you is the tick, not the reading. See COURSE-PROGRESSION-PLAN.md, "What the
     ladder is actually for." A node still being written is a different case —
     there is genuinely nothing to show yet. */
  if(node.status==='planned'){ state.treeView={mode:'list'}; renderLearningTree(); return; }
  /* SHOW THE OVERLAY, like both its siblings do (openLessonFromNote and the
     note-lesson door below). Until 2026-08-10 this only set treeView and
     re-rendered, which is fine when you clicked a lesson from inside the open
     tree and silently paints a hidden panel from anywhere else. Nothing called
     it from outside yet — so this was latent rather than live — but it is on
     window, so the first surface that reached for it would have got nothing.
     Found by a live suite asserting the panel was OPEN rather than merely
     rendered, which is a distinction document.body.textContent cannot make. */
  state.ui='tree'; hideAllOv();
  state.treeView={mode:'lesson',id}; renderLearningTree();
  showOv('treeOv');
}
export function backToTree(){ state.treeView={mode:'list'}; renderLearningTree(); }
/* The Academy Tutor (PAVILION-ACADEMY-PLAN.md Phase 1) — a conversation with the
   Tutor over the existing chat stack. openAcademy() is the general door (learn
   or teach anything); studyLessonWithTutor() grounds it in one Learning Tree
   lesson. Both reuse streaming, the pocket phone, and read-aloud for free. */
export function openAcademy(){
  openChatDialog({ name:'THE ACADEMY · Tutor', aiAgent:'tutor', color:'#5f8a4e', glow:'#bfe3a3',
    lines:["Welcome to the Academy. What shall we work on — learn a subject, be quizzed on one, have me "
      +"review something you wrote, or plan a lesson for a class? Tell me the topic and roughly your level, "
      +"and we'll begin."] });
  if(!isAIActive() && state.dialog){ state.dialog.transcript.push({from:'npc', text:"(Connect a local AI first — ⚙ Manage AI connections — and I can actually teach back.)"}); renderChatView(); }
}
export function studyLessonWithTutor(id){
  const node=curriculumNode(id); if(!node) return;
  const lessonText=node.title+'\n'+node.summary+'\n\n'+lessonAsText(node);
  openChatDialog({ name:'THE ACADEMY · Tutor', aiAgent:'tutor', color:'#5f8a4e', glow:'#bfe3a3',
    lines:['We’re on “'+node.title+'”. Want me to teach it, quiz you on it, or help where you’re stuck? Ask me anything about it.'] });
  if(state.dialog){ state.dialog.lesson=lessonText; renderChatView(); }
}
/* Lessons live in the codebase (CURRICULUM + lessons/*.md). Two pathways OUT of
   them, at the user's ask (2026-07-26): (1) plainly SAVE a lesson into your Notes
   so it's yours to keep, edit, and link to a book — no AI, always works; (2) have
   the local AI DRAFT A LESSON PLAN from it (a personal, scheduled study plan),
   saved as a note too. The AI path degrades gracefully — no model, an empty
   reply, or a dropped connection all fall back to "📓 Save to my Notes always
   works." Both land in the unified Notes hub, so a lesson becomes a real note. */
function lessonAsText(node){
  return node.steps.map((s,i)=>`${i+1}. ${s.title}\n   ${s.body}`).join('\n\n');
}
export function saveLessonToNotes(id){
  const node=curriculumNode(id); if(!node) return;
  const body=node.summary+'\n\n'+lessonAsText(node)+(node.more?`\n\n(Fuller written version: ${node.more})`:'');
  const note={id:newNoteId(), title:'Lesson — '+node.title, body, created:todayKey(), updated:todayKey()};
  data.notes.unshift(note); persist();
  logActivity('Saved the lesson "'+node.title+'" to Notes.'); blip(660,.08);
  const el=document.getElementById('lessonNoteMsg'); if(el) el.textContent='📓 Saved to your Notes — open 🗒 Your Notes (pause menu) to work with it.';
}
export async function draftLessonPlanFromLesson(id){
  const node=curriculumNode(id); if(!node) return;
  const el=document.getElementById('lessonNoteMsg');
  if(!isAIActive()){ if(el) el.textContent='Connect a local AI (⚙ Manage AI connections) to draft a plan — or use 📓 Save to my Notes, which needs no AI.'; return; }
  const btns=document.querySelectorAll('#lessonPlanRow button'); btns.forEach(b=>b.disabled=true);
  if(el) el.textContent='Your local AI is drafting a lesson plan… (a slower model may take a moment)';
  try{
    const reply=await AI.chat([
      {role:'system', content:WORK_CHARTER+'\n\nYou turn a lesson outline into a concrete, personal LESSON PLAN the learner can actually '
        +'follow. Given the lesson below, produce: a one-line goal; a short sequence of study sessions (each with what to do and roughly how '
        +'long); one small hands-on task per session; and a simple way to check understanding at the end. Keep it practical and encouraging, '
        +'grounded strictly in the lesson — invent no tools or steps that contradict it. Plain readable text.'},
      {role:'user', content:'LESSON: '+node.title+'\n\n'+node.summary+'\n\n'+lessonAsText(node)},
    ], {...chatOptsFor('tutor'), long:true});
    if(isEmptyReply(reply)){ if(el) el.textContent='The model came back empty — a lighter model may do better, or use 📓 Save to my Notes (no AI needed).'; }
    else {
      const note={id:newNoteId(), title:'Lesson plan — '+node.title,
        body:'✨ Drafted by your local AI from the lesson "'+node.title+'".\n\n'+String(reply).trim(), created:todayKey(), updated:todayKey()};
      data.notes.unshift(note); persist();
      logActivity('AI drafted a lesson plan from "'+node.title+'".'); blip(660,.08); setTimeout(()=>blip(825,.09),90);
      if(el) el.innerHTML='✨ A lesson plan is now in 🗒 Your Notes, yours to edit. '
        +'<button class="btn ghost" style="font-size:11px;padding:2px 8px" onclick="lessonFromPlanNote(\''+note.id+'\',\'lessonNoteMsg\')">🌳 Put it in the tree too</button>';
    }
  }catch(e){ if(el) el.textContent='The connection flickered — no plan this time (is your local AI still running?). 📓 Save to my Notes always works without one.'; }
  btns.forEach(b=>b.disabled=false);
}
/* ================================================================
   THE JOINT — a drafted plan becomes a lesson you can actually walk.
   THE-STUDY-CHAIN-PLAN.md Stage 1, and the fault it closes is worth
   stating plainly because it is the shape of the whole file's next
   decade of bugs:

     Everything here PRODUCES something. Almost nothing that gets
     produced can become the INPUT to the next thing.

   draftLessonPlanFromNote and draftLessonPlanFromLesson have both
   worked since 2026-07-26. Both wrote a real, sequenced study plan
   into a text note, where it stayed forever. Reported 2026-08-03 as
   "it's hard to link those to an active learning tree." Nothing was
   broken. There was simply nowhere for the thing to go.

   So: one button, on any note, that turns it into a real tree node —
   the same shape saveMyLesson() writes, standing beside the built-in
   lessons with real prerequisites available to it. The note survives
   and is linked both ways, because the prose is worth keeping and a
   parse is never the last word on it.

   The parsing lives in data/plan-to-lesson.js so `npm test` can hold
   it to what a small local model ACTUALLY writes, which is not what
   the prompt asked for. That lesson cost a day in July. */
export function lessonFromPlanNote(noteId, msgEl){
  const note=data.notes.find(n=>n.id===noteId); if(!note) return;
  const say=t=>{ const el=document.getElementById(msgEl||'noteSaved'); if(el) el.textContent=t; };
  const parsed=planToLesson(note.body||'', {title:note.title});
  if(!parsed.steps.length){ say('There is nothing in this note to walk yet — write a step or two first.'); return; }
  const node={ id:'mine-'+Date.now().toString(36),
    track:'Your own lessons', level:101,
    title:parsed.title||'A plan of your own',
    summary:parsed.summary||('From your note "'+(note.title||'untitled')+'".'),
    prereqs:[], steps:parsed.steps, mine:true, written:todayKey(), fromNote:noteId };
  myLessons().unshift(node);
  note.lesson=node.id; note.updated=todayKey();
  persist();
  logActivity('A plan became a lesson in the tree: "'+node.title+'".');
  blip(660,.08); setTimeout(()=>blip(825,.09),90);
  state.notesLogEdit=null; state.plannerNoteView={mode:'list'};
  state.ui='tree'; hideAllOv(); state.treeView={mode:'lesson',id:node.id}; renderLearningTree(); showOv('treeOv');
}
/* The note keeps a pointer at the lesson it became, so the round trip works
   from either end and neither is the "real" copy. */
export function openLessonFromNote(noteId){
  const note=data.notes.find(n=>n.id===noteId); if(!note||!note.lesson) return;
  if(!curriculumNode(note.lesson)){ delete note.lesson; persist(); return; } // it was deleted from the tree
  state.notesLogEdit=null; state.plannerNoteView={mode:'list'};
  state.ui='tree'; hideAllOv(); state.treeView={mode:'lesson',id:note.lesson}; renderLearningTree(); showOv('treeOv');
}

/* ================================================================
   PICKING ONE UP — THE-STUDY-CHAIN-PLAN.md Stage 2.

   "i want to be able to go to the tree and pick up a learning path."

   One field, data.study = {id, since}. ONE at a time, deliberately:
   you walk one path or you walk none. A list of active lessons is a
   second to-do list, and the standing rule here (the-day.js) is that
   a list of everything outstanding is a guilt inventory.

   What picking one up actually buys you: it is what THE DAY offers
   first, it sits at the top of the tree, and the pause menu says its
   name. Nothing is locked, nothing is scheduled, nothing nags. */
export function currentStudy(){
  const st=data.study; if(!st||!st.id) return null;
  const node=curriculumNode(st.id);
  if(!node){ data.study=null; return null; }        // the lesson was deleted out from under it
  return { ...st, node };
}
export function pickUpLesson(id){
  const node=curriculumNode(id); if(!node) return;
  data.study={ id, since:todayKey() };
  persist(); logActivity('Picked up a path: "'+node.title+'".'); blip(740,.09); setTimeout(()=>blip(880,.09),100);
  renderLearningTree();
}
export function putDownLesson(){
  const cur=currentStudy();
  data.study=null; persist();
  if(cur) logActivity('Put down the path "'+cur.node.title+'" — it is waiting, not failed.');
  blip(520,.07); renderLearningTree();
}
/* The next thing to actually do on the path you are walking — the same
   question THE DAY asks, answered here so both agree. */
export function nextStepOf(node){
  if(!node||!(node.steps||[]).length) return null;
  const p=(data.curriculum||{})[node.id]||{steps:{}};
  const i=node.steps.findIndex((_,k)=>!(p.steps||{})[k]);
  return i<0 ? null : { i, step:node.steps[i] };
}
export function toggleLessonStep(id,i){
  const node=curriculumNode(id); if(!node) return;
  const p=lessonProgress(id); const wasDone=lessonDone(node);
  p.steps[i]=!p.steps[i];
  if(!wasDone && lessonDone(node)){ p.completedAt=todayKey(); logActivity('Finished a lesson: "'+node.title+'".'); blip(659,.1); setTimeout(()=>blip(880,.12),110); }
  persist(); renderLearningTree();
}
function renderLearningTree(){
  const v=state.treeView||{mode:'list'}, panel=document.getElementById('treePanel');
  const tabs=(active)=>`<div class="row" style="gap:6px;margin:10px 0;flex-wrap:wrap">
    <button class="btn ${active==='list'?'':'ghost'}" onclick="treeTab('list')">🌳 Your tree</button>
    <button class="btn ${active==='collective'?'':'ghost'}" onclick="treeTab('collective')">🏛 The collective tree</button>
  </div>`;
  if(v.mode==='collective'){
    const nodes=collectiveNodes();
    const mine=nodes.filter(x=>x.__mine).length;
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>🏛 The collective tree</h2>
      ${tabs('collective')}
      <div class="meta">Everything people have actually <b>handed on</b> — a class they wrote, notes worth
        reading, an analysis they kept. <b>Finishing something adds nothing here.</b> Only contributing
        does, which is the whole point: this is not a record of what anyone consumed, it's a record of
        what they gave back.</div>
      <div class="meta" style="margin-top:8px">It grows as packets reach you, so what you see is
        <b>the part of the commons that has actually come your way</b> — never "everything," because
        there is no everything. Someone who has swapped packets with different people sees a different
        tree, and neither of you is missing out on a complete version that exists somewhere.</div>
      ${nodes.length?`
        <div class="meta" style="margin:10px 0"><b>${nodes.length}</b> contribution${nodes.length===1?'':'s'}${mine?` · <b>${mine}</b> of them yours`:''}. Branches run from what a lesson needs to what it opens.</div>
        ${renderTreeGraph(nodes, {
          needsOf:x=>x.needs||[],
          onClickAttr:x=>`onclick="openPacket('${esc(x.id)}')"`,
          cardHTML:x=>`<div class="t" style="font-size:12.5px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${x.kind==='lesson'?'🎓':x.kind==='course'?'🧭':x.kind==='paper'?'📄':'🗒'} ${esc((x.title||'').slice(0,44))}</div>
            <div class="s" style="font-size:11px">by ${esc(x.by||'unknown')}${x.__mine?' · yours':''}</div>`,
        })}`
        :`<p class="meta" style="margin-top:14px"><b>Nothing has been contributed yet.</b> That is the
          honest starting state of a commons whose entry price is real work.
          <br><br>Two ways to put the first thing in it: publish a lesson you wrote (🌳 Your tree →
          open one → 🤝 Publish), or accept a packet someone hands you at the Commons Table.</p>`}
      <div class="row" style="margin-top:16px;gap:6px;flex-wrap:wrap">
        <button class="btn ghost" onclick="openCommonsTable()">🏛 The Commons Table</button>
        <button class="btn ghost" onclick="treeTab('list')">← Your own tree</button>
      </div>`;
    return;
  }
  if(v.mode==='write'){
    const editing=v.id?curriculumNode(v.id):null;
    const others=allNodes().filter(n=>!editing||n.id!==editing.id);
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <div class="row" style="margin-bottom:8px"><button class="btn ghost" onclick="backToTree()">← The tree</button></div>
      <h2>✎ ${editing?'Rewrite':'Write'} a lesson ${visBadge('private')}</h2>
      <div class="meta">Yours stands in the tree beside the built-in ones. Give it prerequisites and it
        becomes a real progression — a 101 that opens a 201 — for you, or for whoever you're teaching.</div>
      <div class="card" style="cursor:default;margin-top:10px;border-color:#8fb4d9">
        <div class="t" style="font-size:13px">✨ Let the AI do the typing</div>
        <div class="s" style="margin-top:4px">Say what it's about; it drafts the rest. The direction stays
          yours — it never chooses prerequisites, and nothing is saved until you add it to the tree.</div>
        <div class="row" style="margin-top:8px;gap:6px">
          <input type="text" id="mlSeed" placeholder="e.g. how to meditate · studying the Dao De Jing · soldering" style="flex:1"
            onkeydown="if(event.key==='Enter'){event.preventDefault();draftLessonWithAI();}">
          <button class="btn" onclick="draftLessonWithAI()">Draft it</button>
          <button class="btn ghost" id="mlStopBtn" style="display:none" onclick="stopDrafting()">✕ Stop</button>
        </div>
        <div class="s" style="margin-top:6px;opacity:.8">It fills the form one field at a time — title, then summary,
          then each step — so you can watch it arrive and stop whenever you've got enough.</div>
        <div class="meta" id="mlAiOut" style="margin-top:6px"></div>
      </div>
      <label style="margin-top:12px">Title</label>
      <input type="text" id="mlTitle" value="${esc(editing?editing.title:'')}" placeholder="e.g. Soldering 101 — a joint that holds">
      <label>What it's for, in a sentence or two</label>
      <textarea id="mlSummary" rows="2" placeholder="Why someone should walk this, and what they'll be able to do afterward.">${esc(editing?editing.summary||'':'')}</textarea>
      <div class="row" style="gap:6px;flex-wrap:wrap">
        <div style="flex:1;min-width:150px"><label>Track (a heading in the tree)</label>
          <input type="text" id="mlTrack" value="${esc(editing?editing.track:'Your own lessons')}"></div>
        <div style="width:110px"><label>Level</label>
          <input type="number" id="mlLevel" min="101" max="999" step="1" value="${editing?Number(editing.level)||101:101}"></div>
      </div>
      <label>The set text <span class="badge lic">optional</span></label>
      <div class="meta">Name the book this lesson is about and every step that mentions a chapter or a page
        becomes a door straight to it — write it however you like (<code>Read chapters 3–4</code>,
        <code>pp. 12-18</code>); it is read, not a code you have to learn.</div>
      ${(function(){
        /* HONEST ABOUT WHICH BOOKS CAN CARRY A READING. On a fresh install 21
           of the 27 shipped books are summaries with no full text — so a
           teacher picking one at random would write "Read chapters 3-4",
           get no door, and have no idea why. The split is a property check,
           instant, and it is the difference between a feature and a trap. */
        const all=Store.allDocs();
        // arriving from a book preselects it — see writeLessonOnThisBook()
        const preset=(editing&&editing.book&&editing.book.slug) || v.book || '';
        const opt=d=>`<option value="${esc(d.slug)}"${preset===d.slug?' selected':''}>${esc(d.title)}${d.attribution?' — '+esc(d.attribution):''}</option>`;
        const readable=all.filter(d=>d.doc&&d.doc.fullText);
        const summary=all.filter(d=>!(d.doc&&d.doc.fullText));
        return `<select id="mlBook" style="${NOTE_SELECT_STYLE}">
          <option value="">— no set text —</option>
          ${readable.length?`<optgroup label="📖 full text — steps can link to a chapter or page">${readable.map(opt).join('')}</optgroup>`:''}
          ${summary.length?`<optgroup label="📄 summary only — a lesson can still be about it, but steps won't link">${summary.map(opt).join('')}</optgroup>`:''}
        </select>`;
      })()}
      <label>The steps — one per line</label>
      <div class="meta">Optionally put a longer explanation after a <b>|</b> on the same line:
        <code>Tin the tip | Melt a little solder onto the iron before you start; it makes everything after it work.</code></div>
      <textarea id="mlSteps" rows="7" placeholder="Buy a cheap iron and a reel of 60/40&#10;Tin the tip | Melt a little solder onto the iron first&#10;Join two wires, then tug them hard">${esc(editing?stepsToText(editing.steps||[]):'')}</textarea>
      <h3 style="margin-top:16px">Locked until… <span class="badge lic">optional</span></h3>
      <div class="meta">Tick any lesson that should be finished first. Leave them all unticked and yours is
        open from the start.</div>
      <div style="max-height:190px;overflow:auto;margin-top:8px">
        ${others.map(n=>`<label class="card" style="cursor:pointer;display:block">
          <input type="checkbox" class="mlPre" value="${esc(n.id)}"${editing&&(editing.prereqs||[]).includes(n.id)?' checked':''} style="width:auto;margin-right:6px">
          <b>${esc(n.title)}</b>${n.mine?' <span class="badge lic">yours</span>':''}
        </label>`).join('')}
      </div>
      <div class="row" style="margin-top:14px;gap:6px;flex-wrap:wrap">
        <button class="btn" onclick="saveMyLesson(${editing?`'${esc(editing.id)}'`:'null'})">${editing?'Save the changes':'Add it to the tree'}</button>
        ${editing?`<button class="btn ghost" style="border-color:var(--danger);color:var(--danger-soft)" onclick="deleteMyLesson('${esc(editing.id)}')">Delete this lesson</button>`:''}
      </div>
      <div class="meta" id="mlMsg" style="margin-top:6px"></div>`;
    setTimeout(()=>document.getElementById('mlTitle')?.focus(),30);
    return;
  }
  if(v.mode==='lesson'){
    const node=curriculumNode(v.id); if(!node){ return backToTree(); }
    const p=lessonProgress(node.id), done=lessonDone(node);
    const next=allNodes().filter(n=>(n.prereqs||[]).includes(node.id));
    // the set text, if this lesson names one and it is still on the shelves
    const setText=(node.book&&node.book.slug) ? Store.getDoc(node.book.slug) : null;
    const setReadable=!!(setText&&setText.doc&&setText.doc.fullText);
    /* HOW MANY CHAPTERS THE BOOK REALLY HAS, when we can know it without
       loading anything. `null` means genuinely unknown (the text lives in
       MinIO or on disk and has not been fetched) — and unknown is NOT the
       same as zero, so an unverifiable citation still gets its door and is
       simply resolved on the way in. What this catches is the citation the
       book CANNOT honour: "chapter 30" of a book with nine. Saying so on
       the lesson beats sending a class to a page that is not there. */
    const setChapters=(setReadable && setText.doc.fullText.text)
      ? findChapters(paginate(setText.doc.fullText.text)).marks.length : null;
    panel.innerHTML = `
      <button class="xbtn" onclick="closeUI()">Esc ✕</button>
      <h2>${esc(node.title)}</h2>
      <div class="meta"><span class="badge">${node.track} · ${node.level}</span> ${done?'<span class="badge lic">✓ complete</span>':''}${node.mine?' <span class="badge lic">you wrote this</span>':''}</div>
      ${node.mine?`<div class="row" style="margin-top:6px;gap:6px">
        <button class="btn ghost" style="font-size:11px;padding:2px 8px" onclick="newLessonForm('${esc(node.id)}')">✎ Rewrite it</button>
        <button class="btn ghost" style="font-size:11px;padding:2px 8px" onclick="publishFrom('lesson','${esc(node.id)}')" title="Hand it on — it joins the collective tree">🤝 Publish it</button>
      </div>`:''}
      <div class="meta" style="margin-top:8px">${esc(node.summary)}</div>
      ${setText?`<div class="row" style="margin-top:6px"><button class="btn ghost" style="font-size:11.5px"
        onclick="openLessonReading('${jsq(setText.slug)}','page',1)" title="Open the set text">📕 Set text: ${esc(setText.title)}${setText.attribution?' — '+esc(setText.attribution):''}</button></div>`:''}
      ${(node.book&&node.book.slug&&!setText)?`<div class="meta" style="margin-top:6px;color:#e0a43c">📕 Its set text is no longer on these shelves.</div>`:''}
      ${(setText&&!setReadable)?`<div class="meta" style="margin-top:6px">This one is a summary rather than the full text, so steps can't link to a chapter or a page. The lesson works exactly as well; it just points at the book rather than into it.</div>`:''}
      ${(function(){
        /* An out-of-order lesson is READ IN FULL, and told plainly where it sits.
           A fact, not a refusal — and it always names the way round, because a
           curriculum confident in itself can say "learn it elsewhere and come
           back" out loud. COURSE-PROGRESSION-PLAN.md, "What the ladder is
           actually for." */
        if(lessonAvailable(node)) return '';
        const missing=(node.prereqs||[]).filter(pid=>!lessonDone(curriculumNode(pid)))
          .map(pid=>curriculumNode(pid)).filter(Boolean);
        return `<div class="card" style="cursor:default;margin-top:10px;border-color:#8fb4d9">
          <div class="t" style="color:#8fb4d9">This one comes after ${missing.map(m=>esc(m.title)).join(' and ')}</div>
          <div class="s" style="margin-top:6px">Read it anyway — all of it. Nothing here is ever withheld from
            anyone, and this is not a refusal. It is just where the rung sits: it assumes what the earlier one
            teaches, so it will make more sense afterwards.</div>
          <div class="s" style="margin-top:6px">What waiting protects is only the <b>tick</b> — the claim that
            you climbed the ladder, which is worth something precisely because the order was real. If you
            already know this material, don't tick it: <b>produce what it asks for.</b> The measurements, the
            drawing, the thing that works. An artifact settles it; a checkbox never did.</div>
          <div class="s" style="margin-top:6px">And if the ladder doesn't suit you, that is a fine answer too —
            get the book, use the Library, use another platform entirely. This is one way up, not the only one.</div>
          <div class="row" style="margin-top:9px;flex-wrap:wrap">
            ${missing.map(m=>`<button class="btn ghost" style="font-size:11.5px" onclick="openLesson('${esc(m.id)}')">↑ ${esc(m.title)}</button>`).join('')}
            <button class="btn ghost" style="font-size:11.5px" onclick="openIndex()">📚 Find the reading yourself</button>
          </div>
        </div>`;
      })()}
      <div style="margin-top:14px">${node.steps.map((s,i)=>{
        const on=!!p.steps[i];
        /* THE READING DOOR. A step that names a chapter or a page of the set
           text opens it. Detected from what the teacher typed rather than a
           syntax they had to learn (data/lesson-doc.js) — and absent, never
           guessed, where the step names nothing. */
        // no full text, no reading door — the Reader has no page to open
        const r=setReadable ? readingIn((s.title||'')+' '+(s.body||'')) : null;
        // a chapter this book demonstrably does not have: say so, never a door
        const beyond=!!(r && r.kind==='chapter' && setChapters!=null && r.from>setChapters);
        return `<div class="card" style="cursor:pointer" onclick="toggleLessonStep('${node.id}',${i})">
          <div class="t">${on?'☑':'☐'} ${esc(s.title)}</div>
          <div class="s" style="margin-top:5px;white-space:pre-wrap">${mdLite(s.body)}</div>
          ${beyond?`<div class="s" style="margin-top:6px;color:#e0a43c">⚠ ${esc(readingLabel(r))} — this text has ${setChapters} chapter${setChapters===1?'':'s'}, so there is nothing to link to.</div>`:''}
          ${((r&&!beyond)||s.action)?`<div class="row" style="margin-top:8px;gap:6px;flex-wrap:wrap">
            ${(r&&!beyond)?`<button class="btn ghost" style="font-size:11.5px" onclick="event.stopPropagation(); openLessonReading('${jsq(setText.slug)}','${r.kind}',${r.from})"
                   title="Open ${esc(setText.title)} at ${esc(readingLabel(r))}">📖 ${esc(readingLabel(r))} →</button>`:''}
            ${s.action?`<button class="btn ghost" style="font-size:11.5px" onclick="event.stopPropagation(); ${s.action.fn}()">${esc(s.action.label)} →</button>`:''}
          </div>`:''}
        </div>`;
      }).join('')}</div>
      ${done ? `<div class="card" style="cursor:default;margin-top:12px;border-color:#7fb069"><div class="t">✓ Lesson complete</div><div class="s" style="margin-top:5px">${next.length?'You\'ve unlocked: '+next.map(n=>esc(n.title)).join(', ')+'.':'That\'s the end of this branch — for now.'}</div></div>` : ''}
      <div class="meta" style="margin-top:14px;opacity:.85">Try each step yourself first — that's how it sticks. Prefer a hand? If your local AI is connected, a resident can help — but reach for that last, not first.${node.more?` The fuller written version lives in <code>${esc(node.more)}</code>.`:''}</div>
      <div class="card" style="cursor:default;margin-top:12px;border-color:#8fb4d9">
        <div class="t">Take this lesson with you</div>
        <div class="s" style="margin-top:5px">Pull it into your Notes to keep and edit, or let your local AI draft a personal, scheduled plan from it. Both land in <b>🗒 Your Notes</b>.</div>
        <div class="s" style="margin-top:8px">Or take it <b>out</b> of the Pavilion entirely — a handout to print, or one
          self-contained page you can put on your own website. The file is yours; nothing is uploaded anywhere.</div>
        <div class="row" style="margin-top:8px;flex-wrap:wrap;gap:8px">
          <button class="btn ghost" style="font-size:11.5px" onclick="exportLesson('${esc(node.id)}','md')">⤓ Save as Markdown</button>
          <button class="btn ghost" style="font-size:11.5px" onclick="exportLesson('${esc(node.id)}','html')">⤓ Save as a web page</button>
        </div>
        <div class="meta" id="lessonExportMsg" style="margin:6px 0 0"></div>
        <div class="row" id="lessonPlanRow" style="margin-top:10px;flex-wrap:wrap;gap:8px">
          ${(function(){
            /* THE-STUDY-CHAIN-PLAN.md Stage 2 — "I want to be able to go to the
               tree and pick up a learning path." One at a time, on purpose. */
            const cur=currentStudy();
            if(cur && cur.id===node.id) return `<button class="btn ghost" onclick="putDownLesson()" title="It stays exactly where it is \u2014 a path put down is waiting, not failed">🧭 You\u2019re walking this \u00b7 put it down</button>`;
            return `<button class="btn" onclick="pickUpLesson('${node.id}')" title="Make this the path you\u2019re on \u2014 \u2600 Today will offer its next step">🧭 Pick this up</button>`;
          })()}
          <button class="btn ghost" onclick="studyLessonWithTutor('${node.id}')">🎓 Study with the Tutor</button>
          <button class="btn ghost" onclick="saveLessonToNotes('${node.id}')">📓 Save to my Notes</button>
          <button class="btn ghost" onclick="draftLessonPlanFromLesson('${node.id}')">✨ Draft a lesson plan (AI)</button>
        </div>
        <div class="meta" id="lessonNoteMsg" style="margin-top:8px"></div>
      </div>
      <div class="row" style="margin-top:12px"><button class="btn ghost" onclick="backToTree()">← Back to the tree</button></div>`;
    return;
  }
  // tree list, grouped by track in order
  const tracks=[]; allNodes().forEach(n=>{ if(!tracks.includes(n.track)) tracks.push(n.track); });
  const nodeCard=n=>{
    const planned=n.status==='planned', done=lessonDone(n), avail=lessonAvailable(n);
    const locked=!planned && !avail;
    let badge, style='', click=`onclick="openLesson('${n.id}')" style="cursor:pointer"`;
    if(planned){ badge='<span class="badge" style="background:rgba(224,164,60,.14);color:#e0a43c;border-color:#e0a43c">✎ being written</span>'; click='style="cursor:default;opacity:.7"'; }
    else if(done){ badge='<span class="badge lic">✓ complete</span>'; }
    else if(locked){ const missing=(n.prereqs||[]).filter(pid=>!lessonDone(curriculumNode(pid))).map(pid=>(curriculumNode(pid)||{}).title||pid); badge='<span class="badge">comes after '+esc(missing.join(', '))+'</span>'; }
    else { const c=lessonCompletedCount(n); badge=`<span class="badge">${c}/${n.steps.length} steps</span>`; }
    return `<div class="card" ${click}>
      <div class="t">${esc(n.title)} ${badge}</div>
      <div class="s" style="margin-top:4px">${esc(n.summary)}</div>
    </div>`;
  };
  panel.innerHTML = `
    <button class="xbtn" onclick="closeUI()">Esc ✕</button>
    <h2>🌳 The Learning Tree</h2>
    ${tabs('list')}
    <div class="meta">Start at a 101 and climb — each course unlocks the next once you've walked it. The
      board confers nothing; the walking is the whole credential. This is the first, small tree — here to
      be poked at, so tell me what's missing before we grow the coding branch for real.</div>
    ${(function(){
      /* What you are ON, before everything you COULD do. The tree used to open
         as a flat catalogue of tracks, which answers "what exists here" and
         never "where was I" \u2014 so picking something up had nowhere to show. */
      const cur=currentStudy(); if(!cur) return '';
      const nx=nextStepOf(cur.node);
      return `<div class="card" style="margin-top:12px;border-color:#7fb069;background:rgba(127,176,105,.07)" onclick="openLesson('${esc(cur.id)}')">
        <div class="s" style="color:#7fb069">🧭 The path you\u2019re walking \u00b7 picked up ${esc(cur.since||'')}</div>
        <div class="t" style="margin-top:3px">${esc(cur.node.title)}</div>
        <div class="s" style="margin-top:5px">${nx
          ? '🌱 Next: <b>'+esc(nx.step.title)+'</b> \u00b7 step '+(nx.i+1)+' of '+cur.node.steps.length
          : '\u2713 Every step ticked \u2014 open it to publish it, or pick up something new.'}</div>
      </div>`;
    })()}
    <div class="card" style="cursor:default;margin-top:10px;border-color:#8fb4d9">
      <div class="t">🔒 Your own private sandbox</div>
      <div class="s" style="margin-top:5px">Everything here runs on your own machine. Nothing you do in a
        lesson — what you read, check off, or try — ever leaves your computer or is sent anywhere. Learn
        freely; it's yours alone.</div>
    </div>
    ${tracks.map(t=>`<h3 style="margin-top:20px">${esc(t)}</h3>
      <div style="margin-top:6px">${allNodes().filter(n=>n.track===t).map(nodeCard).join('')}</div>`).join('')}
    <h3 style="margin-top:22px">Write your own</h3>
    <div class="meta">The lessons above ship with the Pavilion. Yours sit in the tree beside them, with
      real prerequisites — so you can build a 101 that unlocks a 201, for yourself or for whoever you're
      teaching. The Tutor studies your lessons exactly as it studies ours.</div>
    <div class="row" style="margin-top:8px"><button class="btn" onclick="newLessonForm()">✎ Write a lesson</button></div>
    <div class="row" style="margin-top:18px"><button class="btn ghost" onclick="openCourses()">← Back to the Course Board</button></div>`;
}

/* ================================================================
   THE COLLECTIVE TREE — LIVING-TREE-AND-DISCUSSION-PLAN §3, built
   2026-07-27 at direct request.

   The idea worth protecting, in the user's own words: a shared tree
   that "only adds when they have a repertory or notes on what they
   learned, and even better a class to help the next group get there
   themselves."

   So FINISHING something adds nothing here. Only CONTRIBUTING does.
   That single rule is what makes this different from every skill tree
   and every course platform: the graph is not a record of consumption,
   it is a record of what people gave back.

   It needs no server. The unit is a packet — a file one person hands
   another — so your Pavilion draws the part of the commons that has
   actually reached you. That is a partial view, and saying so is more
   honest than pretending completeness. Two people who have swapped
   packets see overlapping trees; neither sees "everything," because
   there is no everything to see.
   ================================================================ */
const TREE_COL=230, TREE_ROW=112;   // one card's footprint in the graph
const TREE_CARD_H=84;               // fixed, so a long title can never run into the row below
/* Depth = the longest chain of prerequisites behind a node. That's what makes
   the drawing read as a tree rather than a list: roots on the left, and
   anything that needed something else further right. */
function graphDepths(nodes, needsOf){
  const byTitle=new Map(nodes.map(n=>[String(n.title||'').toLowerCase(), n]));
  const depth=new Map(); const seen=new Set();
  const walk=(n)=>{
    const key=n.__k;
    if(depth.has(key)) return depth.get(key);
    if(seen.has(key)) return 0;           // a cycle: treat as a root rather than hang
    seen.add(key);
    let d=0;
    for(const need of needsOf(n)){
      const parent=byTitle.get(String(need||'').toLowerCase());
      if(parent && parent.__k!==key) d=Math.max(d, walk(parent)+1);
    }
    depth.set(key,d); return d;
  };
  nodes.forEach((n,i)=>{ n.__k=n.__k||('n'+i); });
  nodes.forEach(walk);
  return { depth, byTitle };
}
/* The one graph renderer, used by both trees: absolutely-positioned cards with
   an SVG layer behind them drawing every prerequisite edge. This is the whole
   "make it look like a skill tree" ask — the prerequisites already existed in
   the data; they simply were never drawn. */
function renderTreeGraph(nodes, opts){
  const { needsOf, cardHTML, onClickAttr } = opts;
  if(!nodes.length) return '<p class="meta">Nothing here yet.</p>';
  const { depth, byTitle } = graphDepths(nodes, needsOf);
  const cols=new Map();
  for(const n of nodes){ const d=depth.get(n.__k)||0; if(!cols.has(d)) cols.set(d,[]); cols.get(d).push(n); }
  const maxD=Math.max(...cols.keys());
  const maxRows=Math.max(...[...cols.values()].map(c=>c.length));
  const pos=new Map();
  for(const [d,list] of cols) list.forEach((n,i)=>pos.set(n.__k,{x:d*TREE_COL+14, y:i*TREE_ROW+10}));
  const W=(maxD+1)*TREE_COL+30, H=maxRows*TREE_ROW+TREE_CARD_H-TREE_ROW+34;
  const edges=[];
  for(const n of nodes){
    const to=pos.get(n.__k);
    for(const need of needsOf(n)){
      const parent=byTitle.get(String(need||'').toLowerCase());
      if(!parent||parent.__k===n.__k) continue;
      const from=pos.get(parent.__k); if(!from) continue;
      const x1=from.x+196, y1=from.y+TREE_CARD_H/2, x2=to.x, y2=to.y+TREE_CARD_H/2;
      const mid=(x1+x2)/2;
      edges.push(`<path d="M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}" fill="none" stroke="#8a6a3a" stroke-width="2" opacity=".65"/>`
        +`<circle cx="${x2}" cy="${y2}" r="3" fill="#e0a43c" opacity=".8"/>`);
    }
  }
  return `<div style="overflow:auto;max-height:60vh;border:1px solid var(--edge);border-radius:8px;background:rgba(0,0,0,.12)">
    <div style="position:relative;width:${W}px;height:${H}px">
      <svg width="${W}" height="${H}" style="position:absolute;inset:0;pointer-events:none">${edges.join('')}</svg>
      ${nodes.map(n=>{ const p=pos.get(n.__k);
        return `<div class="card" style="position:absolute;left:${p.x}px;top:${p.y}px;width:196px;height:${TREE_CARD_H}px;margin:0;padding:8px 10px;overflow:hidden;box-sizing:border-box"
          ${onClickAttr?onClickAttr(n):''}>${cardHTML(n)}</div>`; }).join('')}
    </div></div>`;
}
/* What has actually been contributed to you: packets that carry real substance.
   A bare completion claim can't get in, because nothing about it is worth
   passing on — that IS the entry price. */
function collectiveNodes(){
  const g=commonsStore();
  const carried=[...(g.received||[]), ...(g.published||[])];
  return carried.filter(p=>{
    if(!['lesson','course','paper','note'].includes(p.kind)) return false;
    const substance=(p.body&&p.body.trim().length>40)||((p.steps||[]).length>0);
    return substance; // notes worth reading, or a class with real steps
  }).map(p=>({ ...p, __mine:(g.published||[]).some(x=>x.id===p.id) }));
}
export function treeTab(mode){ state.treeView={mode}; renderLearningTree(); }
/* ----- Drafting a lesson with the local model (2026-07-27, and the reasoning
   behind it is worth keeping verbatim):

     "Too much manual work will defeat the purpose. I just want the environment
      to be the mindset for the task, then have the heavy lifting done by the AI
      when possible — and the direction and intention is in the user's control."

   That is the correct division and it's the one this whole project keeps
   returning to. So: YOU supply the direction — a subject, in your own words —
   and the model does the typing. Every field it fills is yours to overwrite,
   nothing is saved until you press the button, and it never invents a
   prerequisite (that's structure, and structure is direction). */
/* ----- ONE QUESTION AT A TIME (rewritten 2026-07-28, from:

     "What human needs are simple steps. If it's too much for the model we
      should break up the steps to make it more manageable for the AI and
      the user."

   Both halves of that are true and they have the same cure. The first version
   asked for TITLE, SUMMARY, TRACK, LEVEL and 4-6 STEPS in a single reply, and
   ornith:9b returned one run-on line for the lot of it — the parser rescued
   something, but a rescue is not the same as an answer. So the draft is a chain
   of small asks now: a title, then a summary, then a track, then each step in
   turn, every one of them a single question with a one-line answer.

   The model finds each ask easy. The person watching gets the form filling in
   in front of them, a plain "step 3 of 5" instead of a spinner, a Stop button
   that keeps whatever arrived, and no all-or-nothing failure — a stage that
   comes back badly costs that one field, not the draft. Slower in wall-clock,
   far more likely to actually finish. Prerequisites are still never asked for:
   structure is direction, and direction stays the visitor's. */
const DRAFT_SYS = 'You are helping draft one practical lesson someone will actually walk. '
  +'You are asked ONE small question at a time. Answer that question only, in one line, '
  +'with no label, no preamble, no markdown and no explanation of what you are doing. '
  +'Steps must be things a person DOES, not things they read about. Be concrete and unpretentious.';
export function stopDrafting(){
  if(state.mlDraft) state.mlDraft.stop=true;
  const el=document.getElementById('mlAiOut');
  if(el) el.textContent='Stopping — whatever it wrote is still in the form, and still yours to edit.';
}
export async function draftLessonWithAI(){
  // look the element up every time: a stage can land after a re-render, and a
  // captured reference becomes a detached node nobody ever sees (the bug that
  // made the librarian's suggestions look inert, 2026-07-27).
  const say=t=>{ const el=document.getElementById('mlAiOut'); if(el) el.textContent=t; };
  const seedEl=document.getElementById('mlSeed');
  let seed=(seedEl&&seedEl.value||'').trim() || (document.getElementById('mlTitle')?.value||'').trim();
  const bookSlug=(document.getElementById('mlBook')?.value||'').trim();
  if(!seed && !bookSlug) return say('Tell it what the lesson is about first — a few words is enough ("how to meditate", "reading the Dao De Jing") — or pick a set text below and it will work from the book.');
  if(!isAIActive()) return say('No local AI connected (⚙ Manage AI connections). You can still write it by hand.');
  if(state.mlDraft && state.mlDraft.running) return; // never two chains at once
  const job = state.mlDraft = { running:true, stop:false };
  const stopBtn=document.getElementById('mlStopBtn'); if(stopBtn) stopBtn.style.display='';
  const set=(id,val)=>{ const e=document.getElementById(id); if(e&&val) e.value=val; return !!val; };
  const shelf=Store.allDocs().slice(0,20).map(d=>d.title).join(' | ');
  /* GROUNDED IN THE SET TEXT, if one was chosen. The steward's line:
     "needing one and being able to have their assistance are two different
     things" — a teacher must never NEED an AI, and when he wants one it
     should know the book he is actually teaching. Without this the drafter
     produced a competent generic lesson about a title it had never read.

     The chapter list is handed over as a CLOSED SET and named as one. That
     is the whole reason this is worth doing: a step citing a chapter becomes
     a door (data/lesson-doc.js), and a door to a chapter that does not exist
     is exactly the confident-wrong-answer this project refuses. Where the
     text cannot be read, the model is told to cite nothing at all rather
     than guess. */
  let bookBlock='';
  if(bookSlug){
    const bd=Store.getDoc(bookSlug);
    if(bd){
      // picking a book is enough to start — the book IS the subject
      if(!seed) seed='teaching "'+bd.title+'"'+(bd.attribution?' by '+bd.attribution:'');
      say('reading the set text first…');
      let marks=[];
      try{
        const text=await loadBookText(bookSlug);
        if(text) marks=findChapters(paginate(text)).marks;
      }catch(e){ marks=[]; }
      const chapters=marks.slice(0,40).map((m,i)=>`${i+1}. ${String(m.label||'').slice(0,70)}`);
      bookBlock='\n\nTHE SET TEXT this lesson is built on: "'+bd.title+'"'
        +(bd.attribution?' by '+bd.attribution:'')+'.'
        +((bd.doc&&bd.doc.summary)?'\nWhat it is: '+bd.doc.summary:'')
        +(chapters.length
          ? '\n\nITS CHAPTERS. These are the only ones that exist — refer to them by number, and NEVER '
            +'invent one that is not on this list:\n'+chapters.join('\n')
            +(marks.length>40?`\n…and ${marks.length-40} more.`:'')
            +'\n\nWhere a step asks the learner to read part of the book, say so plainly in the step itself '
            +'— "Read chapters 3-4", "Read chapter 7" — using only the numbers above. Those become real '
            +'links to the page.'
          : '\nIts chapters could not be read, so do NOT cite any chapter or page number anywhere.');
    }
  }
  const ask=async(prompt,opts)=>{
    if(job.stop) return '';
    const reply=await AI.chat([{role:'system',content:WORK_CHARTER+'\n\n'+DRAFT_SYS+bookBlock},{role:'user',content:prompt}]);
    return isEmptyReply(reply) ? '' : cleanAnswer(reply,opts);
  };
  const N=5, total=3+N;
  let filled=0;
  try{
    say(`1 of ${total} — giving it a title…`);
    const title=await ask(`Someone wants to learn: ${seed}\n\nGive that lesson a short, concrete title.\n`
      +`Reply with the title alone — no quotes, no label, nothing else.`, {label:'title', maxWords:12});
    if(set('mlTitle', title)) filled++;

    if(!job.stop) say(`2 of ${total} — what it's for…`);
    const summary=await ask(`A lesson titled "${title||seed}" teaches someone about: ${seed}\n\n`
      +`In one or two sentences, say what they will be able to DO once they've walked it.\n`
      +`Reply with those sentences alone.`, {label:'summary', multiline:true});
    if(set('mlSummary', summary)) filled++;

    if(!job.stop) say(`3 of ${total} — where it belongs…`);
    const track=await ask(`Under which single short heading would you file a lesson called "${title||seed}"?\n`
      +`Two or three words, like "Meditation" or "Electronics".\nReply with the heading alone.`,
      {label:'track', maxWords:4});
    set('mlTrack', track);

    /* The steps, one at a time, each one shown the ones already written so it
       builds a sequence instead of five restatements of the same idea. If a
       model volunteers several at once we take them all and skip ahead —
       obeying more than it was asked is not a failure. */
    const steps=[];
    let asked=0;
    // a few spare asks, because a repeated step is thrown away and asked again
    while(steps.length<N && asked<N+3 && !job.stop){
      asked++;
      say(`${3+steps.length+1} of ${total} — ${steps.length?`step ${steps.length+1}, building on the last`:'the first thing they actually do'}…`);
      const sofar=steps.length?`Steps already written — do NOT repeat any of these:\n${steps.map((s,k)=>`${k+1}. ${s}`).join('\n')}\n\n`:'';
      const reply=await ask(`The lesson: "${title||seed}" — ${summary||seed}\n\n${sofar}`
        +`Write step ${steps.length+1}: one single new thing the person does next.\n`
        +`Address them directly and start with a verb — "Sit down…", not "Sits down…".\n`
        +`Reply with exactly one line, in this form and nothing else:\n`
        +`what they do | one sentence of why or how\n\n`
        +`(Books on their shelves, if one is genuinely relevant — never invent another: ${shelf})`);
      if(!reply) continue;
      parseDraftedSteps(reply).map(s=>cleanAnswer(s,{label:'step'})).filter(Boolean)
        .forEach(s=>{ if(steps.length<N && !tooSimilarStep(s, steps)) steps.push(s); });
      set('mlSteps', steps.join('\n'));
    }
    if(steps.length) filled++;

    if(job.stop) return say(`Stopped after ${filled} field${filled===1?'':'s'} — what arrived is in the form and yours to finish. Nothing has been saved.`);
    // Never claim success without having actually filled something in. A model
    // that answers in the wrong shape (or a provider that answers with a
    // fallback string) used to produce a cheerful "Drafted" over an untouched
    // empty form — caught in testing 2026-07-27.
    if(!filled) return say("It answered, but not in a shape I could read — nothing has been filled in. Try again, or write it yourself; the form works the same either way.");
    say(`Drafted ${steps.length} step${steps.length===1?'':'s'} — every field is yours to change. Prerequisites are left to you: what a lesson needs is direction, and that stays your call. Nothing is saved until you add it to the tree.`);
    blip(660,.07);
  }catch(e){
    say(filled?`The connection flickered after ${filled} field${filled===1?'':'s'} — what arrived is still in the form. Finish it by hand, or try again.`
      :'The connection flickered — nothing drafted. Writing it by hand always works.');
  }finally{
    job.running=false;
    const b=document.getElementById('mlStopBtn'); if(b) b.style.display='none';
  }
}
/* Open the set text at what a step actually asks for. A chapter is resolved
   through the SAME chapter marks the reader and the notes use, so a lesson
   citing "ch. 3" lands where a note citing ch. 3 lands. Where the book has no
   detected chapters this falls back to the page of that number — and says so
   rather than silently landing somewhere arbitrary. */
export async function openLessonReading(slug, kind, from){
  const d=Store.getDoc(slug); if(!d) return;
  closeUI();
  openReader(slug);
  if(!(d.doc&&d.doc.fullText)) return;      // a summary-only book has no page to open
  await openFullText(slug);
  const v=state.fullTextView; if(!v) return;
  let page=null;
  if(kind==='chapter'){
    /* "Chapter N" is the Nth MARK, not a stored field — chapterAt() assigns
       `number` as index+1 and nothing writes it onto the mark itself. Looking
       for m.number could never match, and the door quietly landed on page 1
       (caught by test/live/teacher.mjs, which checked where it LANDED rather
       than that it opened). Indexing keeps a lesson citing ch. 2 in exactly
       the place a note citing ch. 2 lands. */
    const marks=chapterPages(v);
    const mark=marks[Number(from)-1];
    if(mark) page=mark.page;
  }
  if(page==null && kind==='page') page=Math.max(0, Number(from)-1);
  if(page==null) return;                    // no such chapter — leave them at the top, honestly
  v.page=Math.max(0, Math.min(v.pages.length-1, page));
  renderFullTextPage();
}
/* ---- A LESSON AS A DOCUMENT — THE-TEACHERS-TREE-PLAN.md gap 2.
   `🤝 Publish it` makes a PACKET: a .json another Pavilion can open, which is
   the right thing for the commons and useless in a classroom. A teacher needs
   a handout to print or a page to put on his own site — so a lesson also
   leaves as Markdown, and as ONE self-contained HTML file he owns outright.
   We render the file; the website stays his. */
function lessonDocOpts(node){
  const book=(node.book&&node.book.slug) ? Store.getDoc(node.book.slug) : null;
  return {
    book: book ? { title:book.title, attribution:book.attribution||'' } : null,
    prereqTitles: (node.prereqs||[]).map(pid=>{ const q=curriculumNode(pid); return q?q.title:null; }).filter(Boolean),
    by: ((data.commons&&data.commons.signedAs)||'').trim(),
  };
}
export async function exportLesson(id, kind){
  const node=curriculumNode(id); if(!node) return;
  const msg=document.getElementById('lessonExportMsg');
  const opts=lessonDocOpts(node);
  const text = kind==='html' ? lessonToHTML(node, opts) : lessonToMarkdown(node, opts);
  const name = lessonFileName(node, kind==='html' ? 'html' : 'md');
  const say=t=>{ if(msg) msg.textContent=t; };
  if(typeof window!=='undefined' && window.desktopBridge?.saveFile){
    const res=await window.desktopBridge.saveFile(name, text);
    if(res && res.canceled) return;
    say((res&&res.ok) ? 'Saved. It is yours — print it, email it, or put it on your own site.' : 'Could not save that file.');
    if(res&&res.ok) blip(700,.07);
    return;
  }
  const blob=new Blob([text],{type: kind==='html'?'text/html':'text/markdown'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),800);
  say('Saved to your Downloads folder as '+name+'.');
}
export function newLessonForm(id, bookSlug){ state.treeView={mode:'write', id:id||null, book:bookSlug||null}; renderLearningTree(); }
/* TEACH FROM THE BOOK YOU ARE HOLDING — the door that was missing, reported
   2026-08-03: "i have the long discourses in my back pack, where do i make a
   lesson on the buddhas teachings for new people?"

   Every piece existed and none of it was reachable from the book. Making a
   lesson meant leaving the Reader, opening the pause menu, finding 🌳 Lesson
   plans, pressing ✎ Write a lesson, and then finding the book again in a list
   of three hundred. That is four hops away from the thing you are already
   looking at, which is exactly the "nothing may be a dead end / one keystroke
   to anywhere" bar in CLAUDE.md, failed. */
export function writeLessonOnThisBook(){
  const slug=currentDocSlug()||state.pocketSlug;
  if(!slug) return;
  stopSpeaking();
  state.ui='tree'; hideAllOv();
  newLessonForm(null, slug);
  showOv('treeOv');
}
export function saveMyLesson(existingId){
  const g=i=>document.getElementById(i)?.value ?? '';
  const title=g('mlTitle').trim();
  const msg=document.getElementById('mlMsg');
  if(!title){ if(msg) msg.textContent='Give it a title first.'; return; }
  /* ONE TEXTAREA, TWO SHAPES. `Title | body` per line is still right for a
     three-step lesson you are jotting down; the moment the text contains a
     `## ` heading it is the portable course format instead, which is what you
     get when you paste in something a model wrote. The text says which it is,
     so there is no mode switch — and both go through one parser, because two
     conventions for one thing is rule 4's shape. See data/course-format.js.

     Until today a step body could not contain a newline, so Tutorial Stage 5
     asked for steps that "stand alone" in a format that could not express
     one. */
  const parsed=parseSteps(g('mlSteps'), { user: currentUser() });
  if(!parsed.ok){ if(msg) msg.textContent=parsed.problems[0]; return; }
  const steps=parsed.lesson.steps;
  const prereqs=[...document.querySelectorAll('.mlPre:checked')].map(c=>c.value);
  const list=myLessons();
  const node={ id: existingId || ('mine-'+Date.now().toString(36)),
    track: g('mlTrack').trim() || 'Your own lessons',
    level: Number(g('mlLevel'))||101,
    title, summary:g('mlSummary').trim(), prereqs, steps, mine:true, written:todayKey(),
    /* WHO MADE IT, in the same shape a note carries (data/note-versions.js).
       A course drafted in a chat window and an AI note written in the Reader
       are the same question, and one vocabulary for it is rule 4. Pasted
       Markdown that declares `drafted-with:` keeps that; anything typed here
       is the visitor's own. */
    by: (parsed.lesson.by || byLine('you')) };
  /* THE SET TEXT — THE-TEACHERS-TREE-PLAN.md gap 1. Until this, the lesson
     node was the ONE artifact in the Pavilion that could not cite a book,
     while a note has carried chapter and page since this morning. An absent
     field when there is no book, never an empty object. */
  const bookSlug=g('mlBook').trim();
  if(bookSlug) node.book={slug:bookSlug};
  const i=list.findIndex(x=>x.id===existingId);
  if(i>=0) list[i]=node; else list.unshift(node);
  persist(); logActivity((i>=0?'Rewrote':'Wrote')+' a lesson: "'+title+'".'); blip(660,.08); setTimeout(()=>blip(825,.09),90);
  /* WRITING SOMETHING OF YOUR OWN EARNED NOTHING UNTIL 2026-08-09. This file
     imported awardBadge from the day it was written and never called it, while
     "you stopped being a reader of someone else's thing" is the hinge of the
     whole place. Only awarded on a NEW lesson — rewriting one is editing, not
     a first. */
  if(i < 0) awardBadge('first-lesson');
  state.treeView={mode:'lesson', id:node.id}; renderLearningTree();
}
export function deleteMyLesson(id){
  const node=curriculumNode(id); if(!node||!node.mine) return;
  if(!window.confirm('Delete your lesson "'+(node.title||'')+'"? Any lesson that required it becomes available again.')) return;
  data.myLessons=myLessons().filter(x=>x.id!==id);
  myLessons().forEach(x=>{ x.prereqs=(x.prereqs||[]).filter(p=>p!==id); });
  if(data.curriculum) delete data.curriculum[id];
  persist(); state.treeView={mode:'list'}; renderLearningTree();
}

/* What overlays.js and the other panels still reach for. The rest are
   already `export function` where they are defined. */
export { CURRICULUM, myLessons, allNodes, curriculumNode, lessonProgress, lessonDone, lessonAvailable, lessonCompletedCount, renderLearningTree, lessonAsText };
