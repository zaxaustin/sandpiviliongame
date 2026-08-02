/* ================================================================
   [SCENES]
   Tile chars: G grass · P path · S sand · W water · T tree · F flower
   D dock · B building footprint · f floor · c carpet · w wall
   k bookshelf · p pillar · r rug · s shrine · t table · i votive candle
   b bean bag chair · n bench · m the Grand Master's platform (walkable —
   just a decorated floor tile, not an obstacle)
   K a bookshelf that looks exactly like every other 'k' tile (same
   render.js drawing) but is deliberately left out of SOLID below —
   one real, walkable secret passage disguised as a bookshelf, not a
   fake door with a distinct sprite. Added 2026-07-09, at the
   requester's own suggestion: "pull out a book" only works as a
   surprise if nothing on screen gives it away first.
   g a Ganesha statue — added 2026-07-09, mirrored across the Keep's
   aisle from the Buddha shrine ('s') on purpose: same devotional
   weight, same "bleed above the tile" technique, distinct iconography.
   N the same bench as 'n', standing on sand instead of grass — the
   Inheritance Hall's court is bare sand, and 'n' paints its own patch
   of grass underneath, which left a green square in the middle of a
   desert. A variant tile, not a scene check in the renderer.
   ================================================================ */
export const SOLID = new Set(['T','W','B','w','k','p','s','t','i','b','n','N','g']);
export const scenes = {};
function grid(w,h,fill){ return Array.from({length:h},()=>Array(w).fill(fill)); }
function makeRng(seed){ let s=seed>>>0; return ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }

function buildOverworld(){
  const W=40,H=34, t=grid(W,H,'G'), rng=makeRng(20260705);
  for(let x=0;x<W;x++){ t[0][x]='T'; t[1][x]='T'; t[H-1][x]='T'; t[H-2][x]='T'; }
  for(let y=0;y<H;y++){ t[y][0]='T'; t[y][1]='T'; t[y][W-1]='T'; t[y][W-2]='T'; }
  const cx=31.5,cy=26.5,rx=5.6,ry=4.3;
  for(let y=2;y<H-2;y++) for(let x=2;x<W-2;x++){
    const dx=(x-cx)/rx, dy=(y-cy)/ry;
    if(dx*dx+dy*dy<=1) t[y][x]='W';
  }
  t[26][26]='G'; t[26][27]='D'; t[26][28]='D';
  const stamp=(x0,y0,x1,y1)=>{ for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) t[y][x]='B'; };
  stamp(14,2,25,8); stamp(4,11,11,15); stamp(28,11,35,15); stamp(21,11,27,15); stamp(12,12,15,14);
  // The Inheritance Hall — deliberately at the southwest EDGE, off the plaza,
  // down a lane of its own: you go out of your way to reach it, and what's
  // inside is whatever anyone has actually left there. See BETA-BUILD-PLAN §8.
  stamp(5,22,11,26);
  t[8][19]='P'; t[8][20]='P'; t[15][7]='P'; t[15][8]='P'; t[15][31]='P'; t[15][32]='P'; t[15][24]='P'; t[15][25]='P'; t[15][13]='P'; t[15][14]='P';
  for(let y=9;y<=25;y++){ t[y][19]='P'; t[y][20]='P'; }
  for(let x=3;x<=34;x++){ t[17][x]='P'; t[18][x]='P'; } // the plaza road, now reaching the west corner
  for(let y=19;y<=27;y++){ t[y][3]='P'; t[y][4]='P'; } // the lane down the west side
  for(let x=3;x<=10;x++) t[27][x]='P';                 // and east along the Hall's front
  t[26][7]='P'; t[26][8]='P';                          // the open archway itself — no door, never shut
  t[16][7]='P'; t[16][8]='P'; t[16][31]='P'; t[16][32]='P'; t[16][24]='P'; t[16][25]='P';
  for(let x=21;x<=26;x++){ t[26][x]=(t[26][x]==='W')?'W':'P'; }
  for(let y=19;y<=26;y++){ if(t[y][21]!=='W') t[y][21]='P'; }
  for(let y=19;y<=22;y++) for(let x=16;x<=23;x++){ if(t[y][x]==='G') t[y][x]='S'; }
  const reserved=(x,y)=>t[y][x]!=='G';
  for(let i=0;i<46;i++){ const x=2+Math.floor(rng()*(W-4)), y=2+Math.floor(rng()*(H-4)); if(!reserved(x,y)) t[y][x]='T'; }
  for(let i=0;i<34;i++){ const x=2+Math.floor(rng()*(W-4)), y=2+Math.floor(rng()*(H-4)); if(!reserved(x,y)) t[y][x]='F'; }
  [[19,9],[20,9],[7,16],[8,16],[31,16],[32,16],[26,26],[25,26],
   [17,9],[5,16],[34,16],[24,25],[17,20],[10,18],[31,18],[25,27],[27,16],
   [13,15],[14,15],[13,16],[14,16],
   [12,22],[30,20],[14,24],[32,23],
   [11,27],[2,27],[5,27] // keep the Hall's own approach clear of RNG trees
  ].forEach(([x,y])=>{ if(t[y][x]==='T'||t[y][x]==='F') t[y][x]='G'; });
  t[16][10]='n'; // a bench just outside the Library door, on the grass — reading doesn't
  // have to happen indoors; placed after the tree/flower RNG pass so it always wins the tile

  scenes.overworld = {
    name:'Pavilion Grounds', outdoor:true, tiles:t, w:W, h:H,
    buildings:[
      {type:'castle',  x:14,y:2, w:12,h:7, label:'PAVILION KEEP'},
      {type:'library', x:4, y:11,w:8, h:5, label:'THE LIBRARY'},
      {type:'workshop',x:28,y:11,w:8, h:5, label:'THE WORKSHOP'},
      {type:'cafe',    x:21,y:11,w:7, h:5, label:'THE CAFE'},
      {type:'annex',   x:12,y:12,w:4, h:3, label:'THE STUDY'},
      {type:'hall',    x:5, y:22,w:7, h:5, label:'INHERITANCE HALL', door:7},
    ],
    warps:[
      {x:19,y:8,to:'keep',sx:8,sy:11},{x:20,y:8,to:'keep',sx:9,sy:11},
      {x:7,y:15,to:'library',sx:7,sy:13},{x:8,y:15,to:'library',sx:8,sy:13},
      {x:31,y:15,to:'workshop',sx:6,sy:8},{x:32,y:15,to:'workshop',sx:7,sy:8},
      {x:24,y:15,to:'cafe',sx:6,sy:8},{x:25,y:15,to:'cafe',sx:7,sy:8},
      {x:13,y:15,to:'study',sx:6,sy:8},{x:14,y:15,to:'study',sx:7,sy:8},
      {x:7,y:26,to:'grove',sx:8,sy:12},{x:8,y:26,to:'grove',sx:9,sy:12},
    ],
    // An open-air hearth in the plaza — the café's fire moved outside, where
    // people actually gather, beside the path between the buildings.
    stations:[{x:22,y:22,kind:'hearth',name:'THE HEARTH'}],
    signs:[
      {x:17,y:9, name:'WOODEN SIGN', text:"PAVILION KEEP\nThe guild's charter rests here. All are welcome.\nNothing here is owned — only kept, and passed on."},
      {x:5,y:16, name:'WOODEN SIGN', text:"THE LIBRARY\nOpen to all. No gate, no fee, no ledger of debts.\nThe Study stands just beside it now, its own door — no\nneed to pass through the shelves to reach a desk."},
      {x:34,y:16,name:'WOODEN SIGN', text:"THE WORKSHOP\nThree desks stand finished on the ground floor. Climb\nthe stairs: the Records Hall is real too, one floor up.\nFive more rooms wait above that, still just framing\nand good intentions. — The Stewards"},
      {x:27,y:16,name:'HAND-LETTERED SIGN', text:"THE CAFE\nWhere the Pavilion looks outward. Inside: a notice board, a\ngrant desk, and THE COMMONS TABLE — work people wrote and\nchose to hand on, laid out for anyone to take a copy of, and\nwhere your own goes out if you decide it should. The hearth\nburns in the plaza, where people gather. — The Stewards"},
      {x:24,y:25,name:'OLD DOCK',    text:"The pond is older than the Pavilion.\nThe koi remember everything.\n(Stand on the dock, face the water, press E.)"},
      {x:11,y:27,name:'A LEANING POST', text:"THE INHERITANCE HALL\nNo roof, no door, no keeper. Open ground, and whatever\nanyone has left standing in it.\nWhat you plant here outlives your visit. That is the\nwhole of the arrangement."},
    ],
    npcs:[
      {x:17,y:20,color:'#e0a43c',glow:'#ffd27a',name:'EMBER · Archivist Agent',wander:true,lines:[
        "Fourteen texts shelved so far, license metadata on every one. The Theravada shelf is CC0 top to bottom — SuttaCentral released the whole canon to the commons.",
        "My person sleeps while I file. That's the arrangement.\nEverything I shelve, anyone may read."]},
      {x:10,y:18,color:'#7fa36b',glow:'#b9e29a',name:'MOSS · Steward Agent',wander:true,lines:[
        "A badge here can't be bought, only witnessed.\nThe Pavilion reads the record — never the soul.",
        "Building your own course? The board in the Study confers nothing. That's the point — it's practice, witnessed by you alone."]},
      {x:31,y:18,color:'#6f8fb5',glow:'#a9c8ea',name:'COBALT · Caravan Agent',wander:true,lines:[
        "Three small shops on my follow-up list. A promise made by a volunteer is a promise the whole guild made.",
        "The Caravan's rule: never leave a relationship half-built.\nI nag kindly until the loop is closed."]},
      {x:25,y:27,color:'#b9976b',glow:'#e8d5a8',name:'SAGARA the Fisher',wander:false,lines:[
        "Cast, wait, and when the line jumps — move. Hesitate and the moment's gone. Same as sitting practice, really.",
        "Caught a pearl here once. It dissolved in my palm.\nStill counts, I figure. Everything turns to sand."]},
      // just wildlife — wandering, decorative, no AI and no agenda. First
      // small step of the fuller pet/animal-track system sketched in the
      // README's Hopes and Dreams; these two are just here to live their lives.
      {x:12,y:22,species:'deer',wander:true,lines:["A deer looks up, chews once, decides you're not interesting, and goes back to grazing."]},
      {x:30,y:20,species:'deer',wander:true,lines:["It watches you a moment longer than a deer usually should, then bounds off."]},
      {x:14,y:24,species:'bunny',wander:true,lines:["A rabbit freezes, ears up, then remembers you're not a hawk and keeps nibbling."]},
      {x:32,y:23,species:'bunny',wander:true,lines:["It thumps a back foot once — not at you, just because rabbits do that — and hops on."]},
    ],
    spawn:{x:19,y:21}
  };
}

function buildKeep(){
  const W=18,H=13, t=grid(W,H,'f');
  for(let x=0;x<W;x++){ t[0][x]='w'; t[1][x]='w'; t[H-1][x]='w'; }
  for(let y=0;y<H;y++){ t[y][0]='w'; t[y][W-1]='w'; }
  t[H-1][8]='f'; t[H-1][9]='f';
  for(let y=2;y<H-1;y++){ t[y][8]='c'; t[y][9]='c'; }
  [[4,4],[13,4],[4,8],[13,8]].forEach(([x,y])=>t[y][x]='p');
  t[2][8]='k'; t[2][9]='k';
  t[3][6]='s'; // the Buddha shrine — the Keep is the charter's
  // home, not just the Library's; worth the same devotional weight, not borrowed
  t[3][11]='g'; // Ganesha, mirrored across the aisle from the Buddha shrine —
  // added 2026-07-09, at the requester's own insistence: a temple missing him
  // was the actual thing feeling wrong about this room, not a small omission.
  t[4][7]='m'; // the Grand Master's own platform, right by the shrine — moved in
  // from the Library on purpose: a quieter room, off the Grounds' main paths,
  // for anyone who wants to actually sit and talk with him one on one
  scenes.keep = {
    name:'The Pavilion Keep', outdoor:false, tiles:t, w:W, h:H, buildings:[],
    warps:[{x:8,y:12,to:'overworld',sx:19,sy:9},{x:9,y:12,to:'overworld',sx:20,sy:9}],
    signs:[{x:8,y:2,name:'THE CHARTER',text:"Everything turns to sand — so give it away first.\nAsk no repayment. Only that it be passed forward.\nThe long path is the shortest path."},
           {x:9,y:2,name:'THE CHARTER',text:"Everything turns to sand — so give it away first.\nAsk no repayment. Only that it be passed forward.\nThe long path is the shortest path."},
           {x:6,y:4,name:'A STONE BUDDHA',text:"Older than the scaffolding around it, somehow. No one\nremembers who carried it in, only that the Keep was built\naround it rather than the other way around."},
           {x:11,y:4,name:'GANESHA, REMOVER OF OBSTACLES',text:"Before any undertaking, Shiva himself once set out on a\ncampaign and met one delay after another before the first\nbattle was even fought. He realized he had not knelt to his\nson and asked for safe passage. He did — praising Ganesha's\nbrilliance, and the bond between them — and the rest of the\ncampaign went smoothly, start to finish. Kneel here the same\nway, whenever the road ahead feels uneasy, before you ever\nfind out whether it needed to be hard."},
           {x:7,y:5,name:'A QUIET CORNER',text:"The Grand Master keeps his own quarters here now — apart\nfrom the Library's foot traffic, so a real conversation\ndoesn't have to compete with the shelves. Face him and press E."},
           // The Noble Eightfold Path, walked south to north toward the shrine
           // and the Monk's own platform — real canonical order, each fold
           // tied to something already built rather than an isolated
           // quotation. See EIGHTFOLD-PATH-TEMPLE-PLAN.md. Source: the
           // Dhammapada (already shelved, Müller trans.), Chapter XX, "The
           // Path" — the chapter that names all eight together.
           {x:3,y:10,fold:'view',name:'1 · RIGHT VIEW (sammā-diṭṭhi)',text:"The first of the eight: seeing clearly what's actually\ntrue, not what's hoped or assumed. The Dhammapada names\nthis the first step of the path, in the same chapter —\n\"The Path\" — that names all eight together. The Library's\nown promise lives here too: every shelved text answers\nwhat it is, where it's from, what it costs to keep. Seeing\nclearly was always this Pavilion's first principle, not\njust the Buddha's."},
           {x:14,y:10,fold:'intention',name:'2 · RIGHT INTENTION (sammā-saṅkappa)',text:"The resolve behind an action, before the action itself —\nrenouncing ill will, aiming at something actually worth\naiming at. The Writing Desk asks this same question every\nmorning, plainly: what's your intention for today? That\nquestion didn't come from nowhere."},
           {x:3,y:9,fold:'speech',name:'3 · RIGHT SPEECH (sammā-vācā)',text:"Truthful. Kind. Never divisive, never idle. The Cafe's\nown Notice Board is steward-moderated by this same\nstandard — liberal, but never blind — and every resident\nhere, human or AI, is asked to speak the same way."},
           {x:14,y:9,fold:'action',name:'4 · RIGHT ACTION (sammā-kammanta)',text:"Conduct that doesn't harm. Nothing shelved in this\nLibrary, nothing spoken by a resident here, is ever real\nharm dressed up as content — checked, not assumed, the\nsame discipline every time."},
           {x:2,y:7,fold:'livelihood',name:'5 · RIGHT LIVELIHOOD (sammā-ājīva)',text:"A way of earning that doesn't require harming to sustain\nitself. Real numbers, real honest work — ask at the Grant\nDesk, or watch for the Ledger, still just framing upstairs\nin the Workshop."},
           {x:15,y:7,fold:'effort',name:'6 · RIGHT EFFORT (sammā-vāyāma)',text:"Sustained, honest practice — not a single burst of\nmotivation. Every spark carried forward from a book, a\nproject, a plan, and never let quietly drop, is this fold\nmade into a real habit instead of a virtue."},
           {x:3,y:6,fold:'mindfulness',name:'7 · RIGHT MINDFULNESS (sammā-sati)',text:"Real awareness of body, feeling, mind, and what's\nactually happening, moment to moment. Press M. Walk,\nstand, sit, lie down — the four postures were always this\nfold, made literal."},
           {x:14,y:6,fold:'concentration',name:'8 · RIGHT CONCENTRATION (sammā-samādhi)',text:"The settled, absorbed attention the other seven make\npossible — not forced, only made possible by everything\nthat came before it. Sit here a while, close to the Grand\nMaster's own quarters, and see what settles."}],
    npcs:[{x:12,y:6,color:'#c8862e',glow:'#ffd27a',name:'THE KEEPER',wander:false,lines:[
      "No throne in this keep — just the charter and a good roof. Leadership here is a chore we take turns carrying.",
      "The walls are scaffolding, friend. If the guild outgrows them, we'll take them down ourselves."]},
     {x:7,y:4,color:'#c8a04a',glow:'#f2d78a',name:'THE MOUNTAIN MONK · Grand Master',wander:false,ai:true,aiAgent:'monk',lines:[
      "Sanskrit, sutras, or just how to actually sit still — ask, and I'll teach whichever one you need. Usually not the one you think you came for.",
      "They call me Grand Master here, which mostly means: when something real is actually in question, I'm the one who has to answer it honestly. The rest of the time, I keep to the Keep and let the charter speak for itself."]}],
    spawn:{x:8,y:11}
  };
}

function buildLibrary(){
  // Taller than its outside footprint suggests on purpose — the Library
  // is bigger on the inside. Nobody's ever complained.
  const W=16,H=15, t=grid(W,H,'r');
  for(let x=0;x<W;x++){ t[0][x]='w'; t[1][x]='w'; t[H-1][x]='w'; }
  for(let y=0;y<H;y++){ t[y][0]='w'; t[y][W-1]='w'; }
  t[H-1][7]='r'; t[H-1][8]='r';
  const shelfRow=y=>{ for(let x=2;x<=6;x++) t[y][x]='k'; for(let x=9;x<=13;x++) t[y][x]='k'; };
  shelfRow(3); shelfRow(6); shelfRow(9);
  t[4][15]='r'; // east door → the Study
  t[2][7]='s'; // the temple's central shrine, near the entrance, easy to glimpse from the door
  t[6][7]='i'; t[9][7]='i'; // votive candles between the shelf rows — devotional throughout, not just one corner
  t[11][11]='b'; // a bean bag chair — a reading nook, off to the side of the door's approach
  t[6][4]='K'; // the secret shelf — Daoism/Practice row, on purpose: the very shelf
  // "On the Second Floor" is shelved on. Looks exactly like every other 'k'
  // tile; walking into it is the only way anyone finds the basement.
  scenes.library = {
    name:'The Library', outdoor:false, tiles:t, w:W, h:H, buildings:[],
    warps:[{x:7,y:14,to:'overworld',sx:7,sy:16},{x:8,y:14,to:'overworld',sx:8,sy:16},
           {x:15,y:4,to:'study',sx:1,sy:4},{x:4,y:6,to:'librarybasement',sx:4,sy:7},
           {x:14,y:3,to:'libraryfloor2',sx:8,sy:8}],
    // Your Shelf — the personal half of the provenance split: books the
    // visitor brought in themselves, marked as theirs, kept deliberately
    // apart from the six certified shelf blocks (BETA-BUILD-PLAN.md §6.4).
    // West of the reading nook, on the door's approach — yours, at hand.
    /* The intake table stands beside Your Shelf on purpose (2026-07-28). Adding a
       book was only ever explained at the Caravan Desk, in the Workshop, under a
       name that doesn't say what it does — so the single most important thing a
       visitor can do here was findable only by accident. The Caravan Desk keeps
       the connector and queue tooling, which is genuinely workshop work; the
       everyday act of bringing a book in now lives where you'd look for it, next
       to the shelf it lands on. Three tiles apart so the floating labels can't
       collide (the mistake made with the Learning Tree station). */
    stations:[{x:2,y:11,kind:'yourshelf',name:'YOUR SHELF'},
              {x:5,y:11,kind:'intake',name:'BRING A BOOK IN'}],
    signs:[{x:14,y:5,name:'BRASS ARROW',text:"→ THE STUDY\nA desk for the day. A board for the long paths."},
           {x:14,y:2,name:'A SPIRAL STAIRCASE',text:"↑ THE SECOND FLOOR\nMore shelves, up the stairs — the collection outgrew one\nroom. Hindu and Native American traditions up front; the\nFiction and Non-fiction wings behind. Same rule at every\nshelf: what is it, where's it from, what license does it\ntravel under. Step onto the stair to go up."},
           {x:5,y:8,name:'HAND-LETTERED SIGN',text:"THE THIRD SHELF\nScience, west — Classics, east. Newer, and further from the\ndoor than the rest — same rule as always: what is it,\nwhere's it from, what license does it travel under."},
           {x:9,y:2,name:'A QUIET SHRINE',text:"Not for worship — just for remembering there's something\nlarger than any one shelf. The Grand Master keeps his own\nquarters in the Keep now, north of here, if you're after a\nreal conversation rather than a quiet moment."},
           {x:11,y:12,name:'A WELL-WORN BEAN BAG',text:"Someone's left a bookmark in the cushion. Take a book off\nany shelf, sink in, and stay a while — nothing here times you."},
           {x:12,y:2,name:'A LEDGER, KEPT BY THE DOOR',text:"Not everything that could be found gets shelved here. Every\ntext in this room passed a real test at the door — what is\nit, where's it from, what does it actually cost to keep — and\nsome things simply don't pass. That isn't hinted at for\natmosphere; it's the one promise this Library has made since\nthe first shelf went up, kept in full view, never behind a\nlocked door. Nothing here was ever going to hurt you, and\nthat was true before you walked in — not because anything's\nbeen hidden, but because of what the stewards refuse to\ncarry at all."}],
    shelves:true,
    npcs:[{x:8,y:4,color:'#9a6fb5',glow:'#d9b9ea',name:'QUILL · Librarian Agent',wander:false,ai:true,lines:[
      "Six shelves down here, three rows deep: Theravada and Mahayana up front, Daoism and Practice behind them, Science and Classics further back still. Face one and press E. The small case by the reading nook is Your Shelf. And there's a second floor now — the spiral staircase at the back, east side — for Hindu and Native American traditions, and the Fiction and Non-fiction wings.",
      "Yes, it's bigger in here than the building looks outside. I've stopped explaining it. The shrine up front was the Grand Master's corner once — he's kept to the Keep now, north of the Grounds, for anyone after a real conversation instead of a quiet moment. Every text still answers three questions at the door, though, regardless of room: what is it, where is it from, and under what license does it travel."]}],
    spawn:{x:7,y:13}
  };
}

function buildLibraryBasement(){
  // The real secret room, added 2026-07-09 at the requester's own idea:
  // reached only by walking into one specific bookshelf tile in the
  // Library (see the 'K' tile in buildLibrary) — no sign, no lever,
  // no visual tell. Small on purpose; this is a wink, not a wing.
  const W=9,H=9, t=grid(W,H,'f');
  for(let x=0;x<W;x++){ t[0][x]='w'; t[H-1][x]='w'; }
  for(let y=0;y<H;y++){ t[y][0]='w'; t[y][W-1]='w'; }
  t[2][4]='k'; // the one real shelf down here — added 2026-07-09, the
  // Tantra tradition's single text (The Serpent Power), face it and press
  // E like any shelf upstairs. shelfTraditionFor() special-cases this scene.
  t[5][2]='i'; t[5][6]='i'; // candles by the two joke signs — this room is not well lit
  t[6][4]='b'; // a single bean bag — the "secret study room" the idea started as
  t[3][4]='r'; // the one tile that actually leads back upstairs
  scenes.librarybasement = {
    name:'???', outdoor:false, tiles:t, w:W, h:H, buildings:[],
    warps:[{x:4,y:3,to:'library',sx:4,sy:7}],
    shelves:true,
    signs:[
      {x:3,y:2,name:'THE TANTRA SHELF',
       text:"One real text. Real practice, real warnings — written into the\ntext itself by its own translator, not invented here for\natmosphere. Same rule as every shelf upstairs: what is it,\nwhere's it from, what license does it travel under. Face the\nshelf and press E."},
      {x:2,y:5,name:"A CROOKED SHELF, MARKED \"DO NOT\"",
       text:"Someone shelved this here anyway. \"Vimana\" — Sanskrit for a\nself-moving, sky-going palace, described in the Ramayana and\nMahabharata long before anyone had a word for aircraft.\nCertain corners of the internet call this proof of ancient\nastronauts. The Pavilion's actual position: probably not — but\nit's a genuinely fun thing to imagine on a slow afternoon, and\nthat's exactly why it lives down here instead of upstairs with\nthe real citations."},
      {x:6,y:5,name:"A STAINED NOTE, TUCKED IN A JAR",
       text:"On \"the abundance system of the ancients\" — the old, unkillable\nrumor that some prior age solved scarcity itself, then lost the\nmethod, or hid it, or had it taken. No serious historian backs\nthis, and the Pavilion won't pretend otherwise. But every real\ntradition upstairs is, in its own way, still answering the\nquestion this rumor asks badly: what would it actually take to\nwant for nothing? Worth sitting with, even though the golden\nage never happened."},
    ],
    npcs:[],
    spawn:{x:4,y:7}
  };
}

function buildLibraryFloor2(){
  // The Library's own upper floor — reached by the spiral staircase at the back
  // (east) of the ground floor. Unlike the secret basement, this one is
  // signposted and MEANT to be found: it's where the collection grows past six
  // shelves. Four more shelf blocks — Hindu and Native American traditions up
  // front, the Fiction and Non-fiction wings behind. shelfTraditionFor() maps
  // this scene's 'k' tiles to those four (same row/side math as downstairs).
  const W=16,H=11, t=grid(W,H,'r');
  for(let x=0;x<W;x++){ t[0][x]='w'; t[1][x]='w'; t[H-1][x]='w'; }
  for(let y=0;y<H;y++){ t[y][0]='w'; t[y][W-1]='w'; }
  const shelfRow=y=>{ for(let x=2;x<=6;x++) t[y][x]='k'; for(let x=9;x<=13;x++) t[y][x]='k'; };
  shelfRow(3); shelfRow(6);
  t[8][2]='b';  // a reading nook up here too
  t[8][13]='i'; // a votive candle in the corner — devotional throughout, same as downstairs
  scenes.libraryfloor2 = {
    name:'The Library · Second Floor', outdoor:false, tiles:t, w:W, h:H, buildings:[],
    warps:[{x:8,y:9,to:'library',sx:14,sy:4}],
    shelves:true,
    signs:[
      {x:7,y:8,name:'A LANDING SIGN',text:"THE SECOND FLOOR\nMore of the collection, and room to grow. Front shelves:\nHindu (west) and Native American (east). Back shelves:\nFiction (west) and Non-fiction (east). Same rule as every\nshelf below — what is it, where's it from, what license.\nQuill keeps to the ground floor if you want a word."},
      {x:7,y:3,name:'THE FRONT SHELVES',text:"HINDU — west · NATIVE AMERICAN — east\nTwo living traditions, side by side. Face a shelf, press E."},
      {x:7,y:6,name:'THE BACK SHELVES',text:"FICTION — west · NON-FICTION — east\nStories on one side, the real world on the other. Face a\nshelf, press E."},
    ],
    npcs:[],
    spawn:{x:8,y:8}
  };
}

function buildStudy(){
  const W=12,H=9, t=grid(W,H,'f');
  for(let x=0;x<W;x++){ t[0][x]='w'; t[1][x]='w'; t[H-1][x]='w'; }
  for(let y=0;y<H;y++){ t[y][0]='w'; t[y][W-1]='w'; }
  t[4][0]='f'; // west door back to the Library — still there, just not the only way in
  t[H-1][6]='f'; t[H-1][7]='f'; // new south door, straight out to the Grounds
  // "semi-open" — a single wide carpet spanning almost the full floor, no
  // dividing walls between the stations, reads as one open room you can
  // see all the way across rather than a boxed-in office
  for(let y=2;y<=6;y++) for(let x=2;x<=9;x++) t[y][x]='c';
  scenes.study = {
    name:'The Study', outdoor:false, tiles:t, w:W, h:H, buildings:[],
    warps:[{x:0,y:4,to:'library',sx:14,sy:4},{x:6,y:8,to:'overworld',sx:13,sy:16},{x:7,y:8,to:'overworld',sx:14,sy:16}],
    signs:[],
    stations:[
      {x:3,y:3,kind:'planner',name:'THE WRITING DESK'},
      {x:8,y:2,kind:'courses',name:'THE COURSE BOARD'},
      // The Learning Tree stands beside the board rather than behind it — asked
      // for directly after real use: a progression you climb deserves its own
      // door, not a button inside something else.
      {x:10,y:3,kind:'tree',name:'THE LEARNING TREE'},
      {x:2,y:6,kind:'notes',name:'YOUR NOTES'},
      {x:5,y:6,kind:'computer',name:'THE COMPUTER'},
      {x:9,y:6,kind:'requests',name:'THE REQUEST BOARD'},
    ],
    npcs:[],
    spawn:{x:1,y:4}
  };
}

function buildWorkshop(){
  // Bigger on the inside than its 8x5 outdoor footprint suggests — same
  // trick the Library already uses. Three real floors now, not one room:
  // ground floor (unchanged, the three finished desks), the Records Hall
  // above it, and an unfinished attic above that — "seven more are still
  // just framing" made literal, not just a line on a sign.
  const W=14,H=10, t=grid(W,H,'f');
  for(let x=0;x<W;x++){ t[0][x]='w'; t[1][x]='w'; t[H-1][x]='w'; }
  for(let y=0;y<H;y++){ t[y][0]='w'; t[y][W-1]='w'; }
  t[H-1][6]='f'; t[H-1][7]='f'; // south door back to the Grounds
  for(let y=2;y<=4;y++) for(let x=4;x<=9;x++) t[y][x]='c';
  [[2,2],[11,2],[2,7],[11,7]].forEach(([x,y])=>t[y][x]='p');
  scenes.workshop = {
    name:'The Workshop', outdoor:false, tiles:t, w:W, h:H, buildings:[],
    warps:[{x:6,y:9,to:'overworld',sx:31,sy:16},{x:7,y:9,to:'overworld',sx:32,sy:16},
           {x:12,y:3,to:'workshopfloor2',sx:5,sy:3}],
    signs:[{x:2,y:4,name:'ROUGH TIMBER SIGN',
      text:"THE ARCHIVE DESK\nYour own words, kept the same way the Library keeps\nothers' — a title, a license, a source, a body.\nTHE RESEARCH DESK, opposite wall — freeform notes on\nwhatever you're working through, with a research\nassistant AI to think alongside. THE CARAVAN DESK, by\nthe west pillar — where texts from outside actually\nenter the Library, one reviewed piece at a time. Face\na desk and press E.\nSEBASTIAN the butler keeps this floor — talk to him to\nplan your day, or to be told the honest shape of it. His\nCALENDAR stands at his desk; face it and press E."},
           {x:12,y:2,name:'A NARROW STAIRCASE',text:"Up. The Workshop keeps growing — one real floor at a\ntime."}],
    stations:[
      {x:6,y:3,kind:'archive',name:'THE ARCHIVE DESK'},
      {x:10,y:6,kind:'research',name:'THE RESEARCH DESK'},
      {x:3,y:6,kind:'review',name:'THE CARAVAN DESK'},
      {x:10,y:7,kind:'calendar',name:"SEBASTIAN'S CALENDAR"},
    ],
    npcs:[{x:8,y:7,color:'#4a6a8a',glow:'#a9c7e8',name:'SEBASTIAN · Butler',wander:false,ai:true,aiAgent:'sebastian',lines:[
      "Welcome to the Workshop. Sebastian, at your service — I keep the day, so you're free to spend it.",
      "Tell me what the day holds, or ask what it's missing. Either way, sir, we'll sort it — and I can drop a plan straight into your day when you're ready."]}],
    spawn:{x:6,y:7}
  };
}

function buildWorkshopFloor2(){
  // The Records Hall — a walkable version of what already exists only as
  // files (archive/dev-log-*.txt, the reflections). One real station,
  // one real floor, given priority over the other five sketched rooms.
  // Interior floor is x=1..8, y=1..6 (walls ring the whole 10x8 grid) —
  // stair tiles sit inside that ring, not on it, same trick the
  // Library's own secret-shelf passage already uses.
  const W=10,H=8, t=grid(W,H,'f');
  for(let x=0;x<W;x++){ t[0][x]='w'; t[H-1][x]='w'; }
  for(let y=0;y<H;y++){ t[y][0]='w'; t[y][W-1]='w'; }
  for(let y=2;y<=5;y++) for(let x=2;x<=7;x++) t[y][x]='c';
  [[2,2],[7,2]].forEach(([x,y])=>t[y][x]='p');
  scenes.workshopfloor2 = {
    name:'The Workshop — Records Hall', outdoor:false, tiles:t, w:W, h:H, buildings:[],
    warps:[{x:2,y:1,to:'workshop',sx:12,sy:4},
           {x:8,y:1,to:'workshopfloor3',sx:2,sy:1}],
    signs:[{x:4,y:1,name:'ROUGH TIMBER SIGN',
      text:"THE RECORDS HALL\nThe Pavilion's own memory, made walkable instead of\njust committed. Face the hall and press E."}],
    stations:[{x:5,y:4,kind:'records',name:'THE RECORDS HALL'}],
    npcs:[],
    spawn:{x:5,y:3}
  };
}

function buildWorkshopFloor3(){
  // The unfinished floor — bare framing, real for the first time as a
  // place rather than a line on a sign. Five sketched rooms (README's
  // "What's next" #9), each a real, distinct visual and a real
  // description, none with working features yet — honest about that,
  // on purpose, the same way the ground floor's own sign always was.
  // Deliberately no pillars here, unlike every other room — sparser
  // reads as "unfinished," not just says so.
  const W=16,H=9, t=grid(W,H,'f');
  for(let x=0;x<W;x++){ t[0][x]='w'; t[H-1][x]='w'; }
  for(let y=0;y<H;y++){ t[y][0]='w'; t[y][W-1]='w'; }
  scenes.workshopfloor3 = {
    name:'The Workshop — the Unfinished Floor', outdoor:false, tiles:t, w:W, h:H, buildings:[],
    warps:[{x:2,y:7,to:'workshopfloor2',sx:7,sy:1}],
    signs:[{x:2,y:1,name:'ROUGH TIMBER SIGN',
      text:"THE UNFINISHED FLOOR\nFraming and good intentions, same as the sign outside\nalways said — just a real floor now instead of a line.\nFive rooms, none open yet. Face one and press E."}],
    stations:[
      {x:5,y:2,kind:'ledger',name:'THE LEDGER'},
      {x:10,y:2,kind:'makersbench',name:"THE MAKER'S BENCH"},
      {x:5,y:5,kind:'greenhouse',name:'THE GREENHOUSE'},
      {x:10,y:5,kind:'roundtable',name:'THE ROUND TABLE'},
      {x:13,y:4,kind:'mailroom',name:'THE MAILROOM'},
    ],
    npcs:[],
    spawn:{x:2,y:1}
  };
}

function buildGrove(){
  // THE INHERITANCE HALL — an open sandbox, and the only room in the Pavilion
  // that ships genuinely EMPTY. Nothing is placed here by us: every book on a
  // stone, every sword in a stone, every seed in the ground was planted by
  // whoever keeps this Pavilion, or arrived as a bequest someone else left
  // behind (data.grove.plantings — the save, not this file). Outdoor on
  // purpose: no roof, so it reads as ground you work rather than a room you
  // visit. See BETA-BUILD-PLAN.md §8.
  // ALL SAND, ringed by the compound's own stone wall (2026-07-27, the user's
  // call): not a garden — a dig. Bare ground under an open sky, the same sand
  // the whole Pavilion is named for, with a wall around it and nothing in it.
  // Anything growing here is something a person put there and waited on.
  const W=18,H=14, t=grid(W,H,'S');
  for(let x=0;x<W;x++){ t[0][x]='w'; t[H-1][x]='w'; }
  for(let y=0;y<H;y++){ t[y][0]='w'; t[y][W-1]='w'; }
  t[H-1][8]='S'; t[H-1][9]='S';                         // the gate, back out to the Grounds
  t[11][14]='N';                                        // a bench, weathered, facing the whole court
  scenes.grove = {
    name:'The Inheritance Hall', outdoor:true, tiles:t, w:W, h:H, buildings:[],
    warps:[{x:8,y:13,to:'overworld',sx:7,sy:27},{x:9,y:13,to:'overworld',sx:8,sy:27}],
    stations:[{x:8,y:2,kind:'inheritance',name:'THE RECORD STONE'},
      // A broken column, half-buried, standing apart from everything else in
      // the court. Not decoration: it is the argument the Hall exists to make.
      {x:3,y:4,kind:'alexandria',name:'THE ALEXANDRIA STONE'}],
    signs:[
      {x:7,y:12,name:'A STONE, SET AT THE GATE',
       text:"THE INHERITANCE HALL\nSand, a wall, and an open sky. Nothing else is provided.\nFace any bare patch and press E to put something in the\nground — a collection of books, a seed holding your own\nnotes, or a course set behind a trial for whoever comes\nafter. Some things left here are buried, and will not\nsurface for anyone who hasn't done the work first.\nWhat's planted stays. You will not always be the one who\nfinds it."},
      {x:13,y:11,name:'A BENCH, WELL SAT-IN',
       text:"Someone sat here long enough to wear the wood smooth, looking\nat a courtyard that may well have been empty at the time.\nPlanting something you won't be around to see found is the\noldest form of the charter there is: everything turns to sand,\nso give it away first."},
    ],
    npcs:[],
    spawn:{x:8,y:12}
  };
}

function buildCafe(){
  const W=14,H=10, t=grid(W,H,'f');
  for(let x=0;x<W;x++){ t[0][x]='w'; t[1][x]='w'; t[H-1][x]='w'; }
  for(let y=0;y<H;y++){ t[y][0]='w'; t[y][W-1]='w'; }
  t[H-1][6]='f'; t[H-1][7]='f'; // south door back to the Grounds
  for(let y=2;y<=4;y++) for(let x=4;x<=9;x++) t[y][x]='c'; // the hearth rug
  [[2,2],[11,2],[2,7],[11,7]].forEach(([x,y])=>t[y][x]='p');
  [[5,5],[8,5],[5,6],[8,6]].forEach(([x,y])=>t[y][x]='t'); // actual tables to sit at, not just stations to work at
  scenes.cafe = {
    name:'The Cafe', outdoor:false, tiles:t, w:W, h:H, buildings:[],
    warps:[{x:6,y:9,to:'overworld',sx:24,sy:16},{x:7,y:9,to:'overworld',sx:25,sy:16}],
    signs:[{x:2,y:4,name:'HAND-LETTERED SIGN',
      text:"THE CAFE\nA place to look outward, not down at a shelf. Face a\nstation and press E.\nTHE COMMONS TABLE, east side: papers, lesson plans and\ncourses people wrote and gave away — and where your own\nwork goes out, if you decide it should. Nothing on that\ntable moved without a person carrying it."}],
    stations:[
      {x:6,y:3,kind:'notice',name:'THE NOTICE BOARD'},
      {x:2,y:3,kind:'residents',name:"THE RESIDENTS' BOARD"},
      {x:2,y:6,kind:'grantdesk',name:'THE GRANT DESK'},
      {x:11,y:3,kind:'coffee',name:'THE COUNTER'},
      // The Commons Table — where work gets shared. Deliberately in the Café,
      // the room that already looks outward, and deliberately NOT dependent on
      // a server the way the two boards on the wall are: this one is files,
      // handed person to person, and works with no account at all.
      {x:11,y:6,kind:'commons',name:'THE COMMONS TABLE'},
    ],
    npcs:[{x:9,y:3,color:'#c86e5a',glow:'#f2b6a3',name:'THE STEWARD',wander:false,ai:true,aiAgent:'steward',lines:[
      "Sit if you like. Nothing here is owed, only offered — same rule as everywhere else in this place.",
      "Every link on that board was walked through by a person first. Liberal, but never blind — that's the whole moderation model."]}],
    spawn:{x:6,y:8}
  };
}

buildOverworld(); buildKeep(); buildLibrary(); buildLibraryBasement(); buildLibraryFloor2(); buildStudy(); buildWorkshop(); buildWorkshopFloor2(); buildWorkshopFloor3(); buildCafe(); buildGrove();
