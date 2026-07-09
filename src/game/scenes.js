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
   ================================================================ */
export const SOLID = new Set(['T','W','B','w','k','p','s','t','i','b','n']);
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
  t[8][19]='P'; t[8][20]='P'; t[15][7]='P'; t[15][8]='P'; t[15][31]='P'; t[15][32]='P'; t[15][24]='P'; t[15][25]='P'; t[15][13]='P'; t[15][14]='P';
  for(let y=9;y<=25;y++){ t[y][19]='P'; t[y][20]='P'; }
  for(let x=6;x<=34;x++){ t[17][x]='P'; t[18][x]='P'; }
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
   [12,22],[30,20],[14,24],[32,23]
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
    ],
    warps:[
      {x:19,y:8,to:'keep',sx:8,sy:11},{x:20,y:8,to:'keep',sx:9,sy:11},
      {x:7,y:15,to:'library',sx:7,sy:13},{x:8,y:15,to:'library',sx:8,sy:13},
      {x:31,y:15,to:'workshop',sx:6,sy:8},{x:32,y:15,to:'workshop',sx:7,sy:8},
      {x:24,y:15,to:'cafe',sx:6,sy:8},{x:25,y:15,to:'cafe',sx:7,sy:8},
      {x:13,y:15,to:'study',sx:6,sy:8},{x:14,y:15,to:'study',sx:7,sy:8},
    ],
    signs:[
      {x:17,y:9, name:'WOODEN SIGN', text:"PAVILION KEEP\nThe guild's charter rests here. All are welcome.\nNothing here is owned — only kept, and passed on."},
      {x:5,y:16, name:'WOODEN SIGN', text:"THE LIBRARY\nOpen to all. No gate, no fee, no ledger of debts.\nThe Study stands just beside it now, its own door — no\nneed to pass through the shelves to reach a desk."},
      {x:34,y:16,name:'WOODEN SIGN', text:"THE WORKSHOP\nOne room stands finished: the Archive Desk, for your\nown words. Seven more are still just framing and\ngood intentions. — The Stewards"},
      {x:27,y:16,name:'HAND-LETTERED SIGN', text:"THE CAFE\nWhere the Pavilion looks outward. A notice board, a\nhearth corner, a grant desk. — The Stewards"},
      {x:24,y:25,name:'OLD DOCK',    text:"The pond is older than the Pavilion.\nThe koi remember everything.\n(Stand on the dock, face the water, press E.)"},
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
  t[4][7]='m'; // the Grand Master's own platform, right by the shrine — moved in
  // from the Library on purpose: a quieter room, off the Grounds' main paths,
  // for anyone who wants to actually sit and talk with him one on one
  scenes.keep = {
    name:'The Pavilion Keep', outdoor:false, tiles:t, w:W, h:H, buildings:[],
    warps:[{x:8,y:12,to:'overworld',sx:19,sy:9},{x:9,y:12,to:'overworld',sx:20,sy:9}],
    signs:[{x:8,y:2,name:'THE CHARTER',text:"Everything turns to sand — so give it away first.\nAsk no repayment. Only that it be passed forward.\nThe long path is the shortest path."},
           {x:9,y:2,name:'THE CHARTER',text:"Everything turns to sand — so give it away first.\nAsk no repayment. Only that it be passed forward.\nThe long path is the shortest path."},
           {x:6,y:4,name:'A STONE BUDDHA',text:"Older than the scaffolding around it, somehow. No one\nremembers who carried it in, only that the Keep was built\naround it rather than the other way around."},
           {x:7,y:5,name:'A QUIET CORNER',text:"The Grand Master keeps his own quarters here now — apart\nfrom the Library's foot traffic, so a real conversation\ndoesn't have to compete with the shelves. Face him and press E."}],
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
           {x:15,y:4,to:'study',sx:1,sy:4},{x:4,y:6,to:'librarybasement',sx:4,sy:7}],
    signs:[{x:14,y:5,name:'BRASS ARROW',text:"→ THE STUDY\nA desk for the day. A board for the long paths."},
           {x:5,y:8,name:'HAND-LETTERED SIGN',text:"THE THIRD SHELF\nScience, west — Classics, east. Newer, and further from the\ndoor than the rest — same rule as always: what is it,\nwhere's it from, what license does it travel under."},
           {x:9,y:2,name:'A QUIET SHRINE',text:"Not for worship — just for remembering there's something\nlarger than any one shelf. The Grand Master keeps his own\nquarters in the Keep now, north of here, if you're after a\nreal conversation rather than a quiet moment."},
           {x:11,y:12,name:'A WELL-WORN BEAN BAG',text:"Someone's left a bookmark in the cushion. Take a book off\nany shelf, sink in, and stay a while — nothing here times you."},
           {x:12,y:2,name:'A LEDGER, KEPT BY THE DOOR',text:"Not everything that could be found gets shelved here. Every\ntext in this room passed a real test at the door — what is\nit, where's it from, what does it actually cost to keep — and\nsome things simply don't pass. That isn't hinted at for\natmosphere; it's the one promise this Library has made since\nthe first shelf went up, kept in full view, never behind a\nlocked door. Nothing here was ever going to hurt you, and\nthat was true before you walked in — not because anything's\nbeen hidden, but because of what the stewards refuse to\ncarry at all."}],
    shelves:true,
    npcs:[{x:8,y:4,color:'#9a6fb5',glow:'#d9b9ea',name:'QUILL · Librarian Agent',wander:false,ai:true,lines:[
      "Six shelves now, three rows deep: Theravada and Mahayana up front, Daoism and Practice behind them, Science and Classics further back still. Face one and press E.",
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
      {x:5,y:6,kind:'computer',name:'THE COMPUTER'},
      {x:9,y:6,kind:'requests',name:'THE REQUEST BOARD'},
    ],
    npcs:[],
    spawn:{x:1,y:4}
  };
}

function buildWorkshop(){
  const W=14,H=10, t=grid(W,H,'f');
  for(let x=0;x<W;x++){ t[0][x]='w'; t[1][x]='w'; t[H-1][x]='w'; }
  for(let y=0;y<H;y++){ t[y][0]='w'; t[y][W-1]='w'; }
  t[H-1][6]='f'; t[H-1][7]='f'; // south door back to the Grounds
  for(let y=2;y<=4;y++) for(let x=4;x<=9;x++) t[y][x]='c';
  [[2,2],[11,2],[2,7],[11,7]].forEach(([x,y])=>t[y][x]='p');
  scenes.workshop = {
    name:'The Workshop', outdoor:false, tiles:t, w:W, h:H, buildings:[],
    warps:[{x:6,y:9,to:'overworld',sx:31,sy:16},{x:7,y:9,to:'overworld',sx:32,sy:16}],
    signs:[{x:2,y:4,name:'ROUGH TIMBER SIGN',
      text:"THE ARCHIVE DESK\nYour own words, kept the same way the Library keeps\nothers' — a title, a license, a source, a body.\nTHE RESEARCH DESK, opposite wall — freeform notes on\nwhatever you're working through, with a research\nassistant AI to think alongside. THE CARAVAN DESK, by\nthe west pillar — where texts from outside actually\nenter the Library, one reviewed piece at a time. Face\na desk and press E."}],
    stations:[
      {x:6,y:3,kind:'archive',name:'THE ARCHIVE DESK'},
      {x:10,y:6,kind:'research',name:'THE RESEARCH DESK'},
      {x:3,y:6,kind:'review',name:'THE CARAVAN DESK'},
    ],
    npcs:[],
    spawn:{x:6,y:7}
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
      text:"THE CAFE\nA place to look outward, not down at a shelf. Face a\nstation and press E."}],
    stations:[
      {x:6,y:3,kind:'notice',name:'THE NOTICE BOARD'},
      {x:2,y:3,kind:'residents',name:"THE RESIDENTS' BOARD"},
      {x:10,y:6,kind:'hearth',name:'THE HEARTH CORNER'},
      {x:2,y:6,kind:'grantdesk',name:'THE GRANT DESK'},
      {x:11,y:3,kind:'coffee',name:'THE COUNTER'},
    ],
    npcs:[{x:9,y:3,color:'#c86e5a',glow:'#f2b6a3',name:'THE STEWARD',wander:false,ai:true,aiAgent:'steward',lines:[
      "Sit if you like. Nothing here is owed, only offered — same rule as everywhere else in this place.",
      "Every link on that board was walked through by a person first. Liberal, but never blind — that's the whole moderation model."]}],
    spawn:{x:6,y:8}
  };
}

buildOverworld(); buildKeep(); buildLibrary(); buildLibraryBasement(); buildStudy(); buildWorkshop(); buildCafe();
