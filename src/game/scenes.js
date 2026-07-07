/* ================================================================
   [SCENES]
   Tile chars: G grass · P path · S sand · W water · T tree · F flower
   D dock · B building footprint · f floor · c carpet · w wall
   k bookshelf · p pillar · r rug
   ================================================================ */
export const SOLID = new Set(['T','W','B','w','k','p']);
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
  stamp(14,2,25,8); stamp(4,11,11,15); stamp(28,11,35,15);
  t[8][19]='P'; t[8][20]='P'; t[15][7]='P'; t[15][8]='P'; t[15][31]='P'; t[15][32]='P';
  for(let y=9;y<=25;y++){ t[y][19]='P'; t[y][20]='P'; }
  for(let x=6;x<=34;x++){ t[17][x]='P'; t[18][x]='P'; }
  t[16][7]='P'; t[16][8]='P'; t[16][31]='P'; t[16][32]='P';
  for(let x=21;x<=26;x++){ t[26][x]=(t[26][x]==='W')?'W':'P'; }
  for(let y=19;y<=26;y++){ if(t[y][21]!=='W') t[y][21]='P'; }
  for(let y=19;y<=22;y++) for(let x=16;x<=23;x++){ if(t[y][x]==='G') t[y][x]='S'; }
  const reserved=(x,y)=>t[y][x]!=='G';
  for(let i=0;i<46;i++){ const x=2+Math.floor(rng()*(W-4)), y=2+Math.floor(rng()*(H-4)); if(!reserved(x,y)) t[y][x]='T'; }
  for(let i=0;i<34;i++){ const x=2+Math.floor(rng()*(W-4)), y=2+Math.floor(rng()*(H-4)); if(!reserved(x,y)) t[y][x]='F'; }
  [[19,9],[20,9],[7,16],[8,16],[31,16],[32,16],[26,26],[25,26],
   [17,9],[5,16],[34,16],[24,25],[17,20],[10,18],[31,18],[25,27]
  ].forEach(([x,y])=>{ if(t[y][x]==='T'||t[y][x]==='F') t[y][x]='G'; });

  scenes.overworld = {
    name:'Pavilion Grounds', outdoor:true, tiles:t, w:W, h:H,
    buildings:[
      {type:'castle',  x:14,y:2, w:12,h:7, label:'PAVILION KEEP'},
      {type:'library', x:4, y:11,w:8, h:5, label:'THE LIBRARY'},
      {type:'workshop',x:28,y:11,w:8, h:5, label:'THE WORKSHOP'},
    ],
    warps:[
      {x:19,y:8,to:'keep',sx:8,sy:11},{x:20,y:8,to:'keep',sx:9,sy:11},
      {x:7,y:15,to:'library',sx:7,sy:9},{x:8,y:15,to:'library',sx:8,sy:9},
      {x:31,y:15,to:'workshop',sx:6,sy:8},{x:32,y:15,to:'workshop',sx:7,sy:8},
    ],
    signs:[
      {x:17,y:9, name:'WOODEN SIGN', text:"PAVILION KEEP\nThe guild's charter rests here. All are welcome.\nNothing here is owned — only kept, and passed on."},
      {x:5,y:16, name:'WOODEN SIGN', text:"THE LIBRARY\nOpen to all. No gate, no fee, no ledger of debts.\nA Study waits behind the east door."},
      {x:34,y:16,name:'WOODEN SIGN', text:"THE WORKSHOP\nOne room stands finished: the Archive Desk, for your\nown words. Seven more are still just framing and\ngood intentions. — The Stewards"},
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
      {x:6,y:6,color:'#8a9a9a',glow:'#d6e2e2',name:'THE MOUNTAIN MONK',wander:false,lines:[
        "Sits quietly, some distance from the paths everyone else uses.",
        "(A placeholder for now — an old friend of the Pavilion's keeper, built long ago, waiting for his voice to be given back to him.)"]},
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
  scenes.keep = {
    name:'The Pavilion Keep', outdoor:false, tiles:t, w:W, h:H, buildings:[],
    warps:[{x:8,y:12,to:'overworld',sx:19,sy:9},{x:9,y:12,to:'overworld',sx:20,sy:9}],
    signs:[{x:8,y:2,name:'THE CHARTER',text:"Everything turns to sand — so give it away first.\nAsk no repayment. Only that it be passed forward.\nThe long path is the shortest path."},
           {x:9,y:2,name:'THE CHARTER',text:"Everything turns to sand — so give it away first.\nAsk no repayment. Only that it be passed forward.\nThe long path is the shortest path."}],
    npcs:[{x:12,y:6,color:'#c8862e',glow:'#ffd27a',name:'THE KEEPER',wander:false,lines:[
      "No throne in this keep — just the charter and a good roof. Leadership here is a chore we take turns carrying.",
      "The walls are scaffolding, friend. If the guild outgrows them, we'll take them down ourselves."]}],
    spawn:{x:8,y:11}
  };
}

function buildLibrary(){
  const W=16,H=11, t=grid(W,H,'r');
  for(let x=0;x<W;x++){ t[0][x]='w'; t[1][x]='w'; t[H-1][x]='w'; }
  for(let y=0;y<H;y++){ t[y][0]='w'; t[y][W-1]='w'; }
  t[H-1][7]='r'; t[H-1][8]='r';
  const shelfRow=y=>{ for(let x=2;x<=6;x++) t[y][x]='k'; for(let x=9;x<=13;x++) t[y][x]='k'; };
  shelfRow(3); shelfRow(6);
  t[4][15]='r'; // east door → the Study
  scenes.library = {
    name:'The Library', outdoor:false, tiles:t, w:W, h:H, buildings:[],
    warps:[{x:7,y:10,to:'overworld',sx:7,sy:16},{x:8,y:10,to:'overworld',sx:8,sy:16},
           {x:15,y:4,to:'study',sx:1,sy:4}],
    signs:[{x:14,y:5,name:'BRASS ARROW',text:"→ THE STUDY\nA desk for the day. A board for the long paths."}],
    shelves:true,
    npcs:[{x:8,y:4,color:'#9a6fb5',glow:'#d9b9ea',name:'QUILL · Librarian Agent',wander:false,ai:true,lines:[
      "Four shelves, four lineages: Theravada north-west, Mahayana north-east, Daoism south-west, Practice south-east. Face one and press E.",
      "Every text answered three questions at the door: what is it, where is it from, and under what license does it travel."]}],
    spawn:{x:7,y:9}
  };
}

function buildStudy(){
  const W=12,H=9, t=grid(W,H,'f');
  for(let x=0;x<W;x++){ t[0][x]='w'; t[1][x]='w'; t[H-1][x]='w'; }
  for(let y=0;y<H;y++){ t[y][0]='w'; t[y][W-1]='w'; }
  t[4][0]='f'; // west door back to the Library
  for(let y=3;y<=5;y++) for(let x=3;x<=8;x++) t[y][x]='c';
  scenes.study = {
    name:'The Study', outdoor:false, tiles:t, w:W, h:H, buildings:[],
    warps:[{x:0,y:4,to:'library',sx:14,sy:4}],
    signs:[],
    stations:[
      {x:3,y:3,kind:'planner',name:'THE WRITING DESK'},
      {x:8,y:2,kind:'courses',name:'THE COURSE BOARD'},
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
      text:"THE ARCHIVE DESK\nYour own words, kept the same way the Library keeps\nothers' — a title, a license, a source, a body.\nFace the desk and press E."}],
    stations:[{x:6,y:3,kind:'archive',name:'THE ARCHIVE DESK'}],
    npcs:[],
    spawn:{x:6,y:7}
  };
}

buildOverworld(); buildKeep(); buildLibrary(); buildStudy(); buildWorkshop();
