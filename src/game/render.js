import { state, scene, facingTile, npcAt, signAt, stationAt, tileAt } from './entities.js';
import { currentSeason, isNight } from './season.js';

/* ---------- canvas ---------- */
export const canvas=document.getElementById('game');
export const ctx=canvas.getContext('2d');
export let S=48;
function resize(){
  canvas.width=window.innerWidth; canvas.height=window.innerHeight;
  S=Math.max(34,Math.min(56,Math.floor(Math.min(canvas.width/11,canvas.height/9))));
}
window.addEventListener('resize',resize); resize();

/* ================================================================
   Render
   ================================================================ */
const PAL={
  grassA:'#7da45c',grassB:'#749955',path:'#d9b98a',pathEdge:'#c2a069',
  sand:'#e3cfa1',water:'#3f6f8e',waterLite:'#4d82a3',waterDark:'#35617d',
  ice:'#cfe0e6',iceB:'#bcd4dc',iceCrack:'rgba(255,255,255,.4)',
  trunk:'#6b4a2f',canopy:'#4f7a42',canopyD:'#43683a',
  flower:'#e07a7a',flower2:'#e0c04a',
  floor:'#b8a184',floorD:'#ab947a',carpet:'#c8862e',carpetD:'#b3771f',
  wall:'#5e5044',wallTop:'#4a3f36',shelf:'#7c5033',shelfD:'#63402a',
  rug:'#e8dcb8',rugD:'#e0d2a8',pillar:'#cbb79a', // the Library floor — parchment, not a carpet
};
/* seasonal grass/canopy/flower palette — pure atmosphere, read once per
   frame (not per tile) since it only depends on the real calendar date */
function seasonPalette(season){
  switch(season){
    case 'winter': return { grassA:'#8b9b95',grassB:'#7e8e88',canopy:'#7c8c87',canopyD:'#697873',flower:'#dbe4e2',flower2:'#dbe4e2',snow:true };
    case 'autumn': return { grassA:'#a68a4c',grassB:'#977c40',canopy:'#b5722e',canopyD:'#9c5f24',flower:PAL.flower,flower2:PAL.flower2,snow:false };
    case 'spring': return { grassA:'#8fc26b',grassB:'#7fb35c',canopy:'#5c8a4a',canopyD:'#4d763d',flower:'#f2a6c8',flower2:'#f2e06a',snow:false };
    default:       return { grassA:PAL.grassA,grassB:PAL.grassB,canopy:PAL.canopy,canopyD:PAL.canopyD,flower:PAL.flower,flower2:PAL.flower2,snow:false };
  }
}
let SPAL=seasonPalette('summer');
function camera(){
  const p=state.player, s=scene();
  const vw=canvas.width/S, vh=canvas.height/S;
  let cx=p.px+.5-vw/2, cy=p.py+.5-vh/2;
  cx=Math.max(0,Math.min(s.w-vw,cx)); cy=Math.max(0,Math.min(s.h-vh,cy));
  if(s.w<vw) cx=(s.w-vw)/2;
  if(s.h<vh) cy=(s.h-vh)/2;
  return {cx,cy};
}
function drawTile(ch,x,y,sx,sy){
  const t=state.time;
  switch(ch){
    case 'G': case 'F':
      ctx.fillStyle=((x+y)%2===0)?SPAL.grassA:SPAL.grassB; ctx.fillRect(sx,sy,S,S);
      if((x*31+y*17)%5===0){ ctx.fillStyle='rgba(0,0,0,.06)'; ctx.fillRect(sx+S*.3,sy+S*.55,S*.1,S*.18); ctx.fillRect(sx+S*.6,sy+S*.3,S*.1,S*.18); }
      if(SPAL.snow&&(x*13+y*29)%4===0){ ctx.fillStyle='rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(sx+S*.5,sy+S*.5,S*.05,0,7); ctx.fill(); }
      if(ch==='F'){
        ctx.fillStyle=((x+y)%2===0)?SPAL.flower:SPAL.flower2;
        const fx=sx+S*.5, fy=sy+S*.5, r=S*.11;
        for(let a=0;a<4;a++){ ctx.beginPath(); ctx.arc(fx+Math.cos(a*1.57)*r*1.4,fy+Math.sin(a*1.57)*r*1.4,r,0,7); ctx.fill(); }
        ctx.fillStyle='#fff3cf'; ctx.beginPath(); ctx.arc(fx,fy,r*.8,0,7); ctx.fill();
      }
      break;
    case 'P':
      ctx.fillStyle=PAL.path; ctx.fillRect(sx,sy,S,S);
      ctx.fillStyle=PAL.pathEdge;
      if((x*13+y*7)%4===0) ctx.fillRect(sx+S*.2,sy+S*.35,S*.16,S*.1);
      if((x*7+y*13)%4===1) ctx.fillRect(sx+S*.6,sy+S*.6,S*.16,S*.1);
      break;
    case 'S':
      ctx.fillStyle=PAL.sand; ctx.fillRect(sx,sy,S,S);
      ctx.fillStyle='rgba(0,0,0,.05)'; if((x+y)%2===0) ctx.fillRect(sx,sy,S,S*.08);
      break;
    case 'W':{
      if(SPAL.snow){ // frozen pond — winter only, purely visual, fishing still works the same
        ctx.fillStyle=((x+y)%2===0)?PAL.ice:PAL.iceB; ctx.fillRect(sx,sy,S,S);
        if((x*7+y*13)%5===0){
          ctx.strokeStyle=PAL.iceCrack; ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(sx+S*.18,sy+S*.22); ctx.lineTo(sx+S*.62,sy+S*.5); ctx.lineTo(sx+S*.3,sy+S*.82); ctx.stroke();
        }
        break;
      }
      ctx.fillStyle=PAL.water; ctx.fillRect(sx,sy,S,S);
      const ph=Math.sin(t*1.6+x*1.1+y*.8);
      ctx.fillStyle=ph>0.3?PAL.waterLite:(ph<-0.5?PAL.waterDark:PAL.water);
      ctx.fillRect(sx+S*.12,sy+S*(.3+.06*ph),S*.4,S*.09);
      ctx.fillRect(sx+S*.55,sy+S*(.65-.06*ph),S*.3,S*.09);
      break; }
    case 'D':
      drawTile('W',x,y,sx,sy);
      ctx.fillStyle='#8a6438'; ctx.fillRect(sx,sy+S*.1,S,S*.8);
      ctx.fillStyle='#75542e'; for(let i=0;i<3;i++) ctx.fillRect(sx,sy+S*(.1+i*.27),S,S*.05);
      break;
    case 'T':
      ctx.fillStyle=((x+y)%2===0)?SPAL.grassA:SPAL.grassB; ctx.fillRect(sx,sy,S,S);
      ctx.fillStyle=PAL.trunk; ctx.fillRect(sx+S*.4,sy+S*.55,S*.2,S*.4);
      ctx.fillStyle=SPAL.canopyD; ctx.beginPath(); ctx.arc(sx+S*.5,sy+S*.38,S*.42,0,7); ctx.fill();
      ctx.fillStyle=SPAL.canopy; ctx.beginPath(); ctx.arc(sx+S*.42,sy+S*.3,S*.3,0,7); ctx.fill();
      if(SPAL.snow){ ctx.fillStyle='rgba(255,255,255,.65)'; ctx.beginPath(); ctx.arc(sx+S*.42,sy+S*.22,S*.14,0,7); ctx.fill(); }
      break;
    case 'B': ctx.fillStyle='#6f5a43'; ctx.fillRect(sx,sy,S,S); break;
    case 'f': ctx.fillStyle=((x+y)%2===0)?PAL.floor:PAL.floorD; ctx.fillRect(sx,sy,S,S); break;
    case 'c':
      ctx.fillStyle=((x+y)%2===0)?PAL.carpet:PAL.carpetD; ctx.fillRect(sx,sy,S,S);
      ctx.strokeStyle='rgba(0,0,0,.12)'; ctx.strokeRect(sx+S*.08,sy+S*.08,S*.84,S*.84);
      break;
    case 'r': // the Library floor — parchment, with faint fiber flecks and the occasional ruled line
      ctx.fillStyle=((x+y)%2===0)?PAL.rug:PAL.rugD; ctx.fillRect(sx,sy,S,S);
      if((x*17+y*11)%5===0){ ctx.fillStyle='rgba(120,100,60,.10)'; ctx.fillRect(sx+S*.2,sy+S*.62,S*.6,S*.03); }
      if((x*7+y*23)%6===0){ ctx.fillStyle='rgba(120,100,60,.07)'; ctx.fillRect(sx+S*.3,sy+S*.3,S*.04,S*.04); }
      break;
    case 'w':
      ctx.fillStyle=PAL.wall; ctx.fillRect(sx,sy,S,S);
      ctx.fillStyle=PAL.wallTop; ctx.fillRect(sx,sy,S,S*.25);
      ctx.strokeStyle='rgba(0,0,0,.15)'; ctx.strokeRect(sx,sy+S*.25,S,S*.75);
      break;
    case 'k': case 'K':{ // 'K' is the secret passage — must render pixel-identical
      // to a normal shelf, or it stops being a secret. See scenes.js's tile legend.
      ctx.fillStyle=PAL.shelfD; ctx.fillRect(sx,sy,S,S);
      ctx.fillStyle=PAL.shelf; ctx.fillRect(sx+S*.06,sy+S*.06,S*.88,S*.88);
      const cols=['#b34d4d','#4d7ab3','#b3934d','#5d9c66','#8a5db3'];
      for(let i=0;i<4;i++){
        ctx.fillStyle=cols[(x*3+y+i)%cols.length];
        ctx.fillRect(sx+S*(.12+i*.2),sy+S*.16,S*.14,S*.3);
        ctx.fillStyle=cols[(x+y*5+i*2)%cols.length];
        ctx.fillRect(sx+S*(.12+i*.2),sy+S*.55,S*.14,S*.3);
      }
      break; }
    case 'p':
      ctx.fillStyle=((x+y)%2===0)?PAL.floor:PAL.floorD; ctx.fillRect(sx,sy,S,S);
      ctx.fillStyle=PAL.pillar; ctx.fillRect(sx+S*.25,sy,S*.5,S);
      ctx.fillStyle='rgba(0,0,0,.15)'; ctx.fillRect(sx+S*.62,sy,S*.13,S);
      ctx.fillStyle='#e5d6bb'; ctx.fillRect(sx+S*.2,sy,S*.6,S*.12); ctx.fillRect(sx+S*.2,sy+S*.88,S*.6,S*.12);
      break;
    case 's':{ // the temple's central shrine — rebuilt 2026-07-08 into a
      // real centerpiece, not a corner curiosity: a golden Buddha figure
      // that bleeds well above its own tile, a proper offering altar with
      // two lit candles and a stick of incense actually rising, all inside
      // a wide, saturated glow. Bleeds only upward/leftward on purpose —
      // drawTile runs row-major, so those are the only directions already
      // painted and safe to draw over; right/down would get clobbered by
      // whatever's drawn next.
      ctx.fillStyle=((x+y)%2===0)?PAL.rug:PAL.rugD; ctx.fillRect(sx,sy,S,S);
      const shrineGlow=ctx.createRadialGradient(sx+S*.5,sy+S*.1,S*.1,sx+S*.5,sy+S*.1,S*.95);
      shrineGlow.addColorStop(0,'rgba(255,196,90,.5)'); shrineGlow.addColorStop(1,'rgba(255,196,90,0)');
      ctx.fillStyle=shrineGlow; ctx.fillRect(sx-S*.4,sy-S*1.3,S*1.8,S*2.2);
      ctx.fillStyle='#5a4529'; ctx.fillRect(sx+S*.1,sy+S*.8,S*.8,S*.2);
      ctx.strokeStyle='#2a2118'; ctx.lineWidth=Math.max(1,S*.02); ctx.strokeRect(sx+S*.1,sy+S*.8,S*.8,S*.2);
      const flick=.6+.4*Math.sin(state.time*8);
      for(const cxo of [sx+S*.22,sx+S*.78]){
        ctx.fillStyle='#e8dcb8'; ctx.fillRect(cxo-S*.03,sy+S*.68,S*.06,S*.14);
        ctx.fillStyle=`rgba(255,180,80,${.85*flick})`; ctx.beginPath(); ctx.arc(cxo,sy+S*.65,S*.045,0,7); ctx.fill();
      }
      ctx.fillStyle='#8a6a3a'; ctx.fillRect(sx+S*.48,sy+S*.68,S*.03,S*.16);
      const smoke=(state.time*.3)%1;
      ctx.strokeStyle=`rgba(220,220,220,${.4*(1-smoke)})`; ctx.lineWidth=Math.max(1,S*.015);
      ctx.beginPath(); ctx.moveTo(sx+S*.5,sy+S*.68-smoke*S*.1);
      ctx.quadraticCurveTo(sx+S*.56,sy+S*.5-smoke*S*.4,sx+S*.48,sy+S*.3-smoke*S*.7);
      ctx.stroke();
      ctx.fillStyle='#e0a43c'; ctx.strokeStyle='#5a3f18'; ctx.lineWidth=Math.max(1,S*.03);
      ctx.beginPath(); ctx.moveTo(sx+S*.2,sy+S*.75); ctx.quadraticCurveTo(sx+S*.5,sy-S*.35,sx+S*.8,sy+S*.75); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle='rgba(255,220,140,.9)'; ctx.lineWidth=Math.max(1,S*.035);
      ctx.beginPath(); ctx.arc(sx+S*.5,sy-S*.55,S*.28,0,7); ctx.stroke();
      ctx.fillStyle='#e0a43c'; ctx.strokeStyle='#5a3f18'; ctx.lineWidth=Math.max(1,S*.025);
      ctx.beginPath(); ctx.arc(sx+S*.5,sy-S*.45,S*.19,0,7); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#e0a43c'; ctx.beginPath(); ctx.arc(sx+S*.5,sy-S*.68,S*.07,0,7); ctx.fill();
      break; }
    case 'i':{ // a smaller votive candle, scattered near the shelves — the
      // room should feel devotional throughout, not just at one corner shrine
      ctx.fillStyle=((x+y)%2===0)?PAL.rug:PAL.rugD; ctx.fillRect(sx,sy,S,S);
      const iflick=.6+.4*Math.sin(state.time*8+x+y);
      ctx.fillStyle=`rgba(255,180,80,${.3*iflick})`; ctx.beginPath(); ctx.arc(sx+S*.5,sy+S*.5,S*.4,0,7); ctx.fill();
      ctx.fillStyle='#5a4529'; ctx.beginPath(); ctx.arc(sx+S*.5,sy+S*.78,S*.18,0,7); ctx.fill();
      ctx.fillStyle='#e8dcb8'; ctx.fillRect(sx+S*.44,sy+S*.5,S*.12,S*.26);
      ctx.fillStyle=`rgba(255,180,80,${.9*iflick})`; ctx.beginPath(); ctx.arc(sx+S*.5,sy+S*.46,S*.07,0,7); ctx.fill();
      break; }
    case 't':{ // a café table, two chairs — somewhere to actually sit, not just a station to work at
      ctx.fillStyle=((x+y)%2===0)?PAL.floor:PAL.floorD; ctx.fillRect(sx,sy,S,S);
      ctx.fillStyle='#4a3a28'; // chairs, one each side
      ctx.fillRect(sx+S*.06,sy+S*.4,S*.14,S*.3); ctx.fillRect(sx+S*.8,sy+S*.4,S*.14,S*.3);
      ctx.fillStyle='rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(sx+S*.5,sy+S*.58,S*.3,S*.12,0,0,7); ctx.fill();
      ctx.fillStyle='#8a6438'; ctx.beginPath(); ctx.ellipse(sx+S*.5,sy+S*.5,S*.28,S*.2,0,0,7); ctx.fill(); // tabletop
      ctx.strokeStyle='#6b4a2f'; ctx.lineWidth=Math.max(1,S*.02); ctx.beginPath(); ctx.ellipse(sx+S*.5,sy+S*.5,S*.28,S*.2,0,0,7); ctx.stroke();
      ctx.fillStyle='#e8dcb8'; ctx.beginPath(); ctx.arc(sx+S*.5,sy+S*.46,S*.06,0,7); ctx.fill(); // a small cup on top
      break; }
    case 'b':{ // a bean bag chair — a reading nook, explicitly just a place to sit, no mechanic
      ctx.fillStyle=((x+y)%2===0)?PAL.rug:PAL.rugD; ctx.fillRect(sx,sy,S,S);
      ctx.fillStyle='rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(sx+S*.5,sy+S*.86,S*.32,S*.1,0,0,7); ctx.fill(); // shadow
      ctx.fillStyle='#8a4a3a'; // the bag itself — squat, soft, no straight edges
      ctx.beginPath(); ctx.ellipse(sx+S*.5,sy+S*.58,S*.36,S*.3,0,0,7); ctx.fill();
      ctx.fillStyle='#a55a48'; ctx.beginPath(); ctx.ellipse(sx+S*.44,sy+S*.46,S*.24,S*.2,0,0,7); ctx.fill(); // a highlight, off-center — looks squished-into, not perfectly round
      ctx.strokeStyle='rgba(0,0,0,.12)'; ctx.lineWidth=Math.max(1,S*.02);
      ctx.beginPath(); ctx.moveTo(sx+S*.3,sy+S*.62); ctx.quadraticCurveTo(sx+S*.5,sy+S*.72,sx+S*.7,sy+S*.62); ctx.stroke(); // a seam
      ctx.fillStyle='#e8dcb8'; ctx.save(); ctx.translate(sx+S*.68,sy+S*.4); ctx.rotate(-.3); // a book left open on the arm of it
      ctx.fillRect(-S*.1,-S*.07,S*.2,S*.14); ctx.strokeStyle='#8a7350'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,-S*.07); ctx.lineTo(0,S*.07); ctx.stroke();
      ctx.restore();
      break; }
    case 'm':{ // the Grand Master's own platform — a raised dais with a cushion,
      // where he actually sits now rather than being placed on bare floor
      ctx.fillStyle=((x+y)%2===0)?PAL.rug:PAL.rugD; ctx.fillRect(sx,sy,S,S);
      ctx.fillStyle='rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(sx+S*.5,sy+S*.58,S*.4,S*.14,0,0,7); ctx.fill();
      ctx.fillStyle='#8a6438'; ctx.beginPath(); ctx.ellipse(sx+S*.5,sy+S*.5,S*.42,S*.24,0,0,7); ctx.fill(); // the wooden dais
      ctx.strokeStyle='#5a3f18'; ctx.lineWidth=Math.max(1,S*.025); ctx.beginPath(); ctx.ellipse(sx+S*.5,sy+S*.5,S*.42,S*.24,0,0,7); ctx.stroke();
      ctx.fillStyle='#b5654a'; ctx.beginPath(); ctx.ellipse(sx+S*.5,sy+S*.44,S*.26,S*.15,0,0,7); ctx.fill(); // a cushion on top
      ctx.strokeStyle='rgba(0,0,0,.15)'; ctx.lineWidth=Math.max(1,S*.018);
      ctx.beginPath(); ctx.moveTo(sx+S*.3,sy+S*.44); ctx.quadraticCurveTo(sx+S*.5,sy+S*.5,sx+S*.7,sy+S*.44); ctx.stroke();
      break; }
    case 'n':{ // a bench, outdoors — a place to read that isn't inside the shelves
      ctx.fillStyle=((x+y)%2===0)?SPAL.grassA:SPAL.grassB; ctx.fillRect(sx,sy,S,S);
      ctx.fillStyle='rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(sx+S*.5,sy+S*.82,S*.38,S*.09,0,0,7); ctx.fill(); // shadow
      ctx.fillStyle='#5a4530'; // legs, both ends
      ctx.fillRect(sx+S*.1,sy+S*.5,S*.08,S*.3); ctx.fillRect(sx+S*.82,sy+S*.5,S*.08,S*.3);
      ctx.fillStyle=PAL.trunk; ctx.fillRect(sx+S*.06,sy+S*.42,S*.88,S*.16); // the seat plank
      ctx.fillStyle='#8a6438'; ctx.fillRect(sx+S*.06,sy+S*.28,S*.88,S*.14); // the backrest plank, just behind it
      ctx.strokeStyle='rgba(0,0,0,.2)'; ctx.lineWidth=Math.max(1,S*.015);
      ctx.beginPath(); ctx.moveTo(sx+S*.06,sy+S*.5); ctx.lineTo(sx+S*.94,sy+S*.5); ctx.stroke(); // seat/backrest seam
      break; }
  }
}
function drawBuilding(b,ox,oy){
  const x=(b.x-ox)*S, y=(b.y-oy)*S, w=b.w*S, h=b.h*S;
  if(b.type==='annex'){
    // an open-sided lean-to, not a fully enclosed building — support posts
    // and a roof, floor visible underneath, reads as "semi-open" even from
    // outside. The Study's own second entrance lives here.
    ctx.fillStyle='#8f6a4e'; ctx.fillRect(x,y+S*.9,w,h-S*.9);
    ctx.fillStyle='rgba(0,0,0,.1)'; for(let r=0;r<b.h-1;r++) ctx.fillRect(x,y+S*.9+r*S*.75,w,2);
    ctx.fillStyle='#5e5468'; ctx.beginPath();
    ctx.moveTo(x-S*.15,y+S*.9); ctx.lineTo(x+w/2,y-S*.15); ctx.lineTo(x+w+S*.15,y+S*.9); ctx.fill();
    ctx.fillStyle='rgba(0,0,0,.12)'; ctx.fillRect(x-S*.15,y+S*.8,w+S*.3,S*.12);
    ctx.fillStyle='#6b4a2f';
    for(const px of [x+S*.15, x+w-S*.35, x+w/2-S*.85, x+w/2+S*.7]) ctx.fillRect(px,y+S*.9,S*.2,h-S*.9);
    ctx.fillStyle='#2a2118'; ctx.fillRect(x+w/2-S*1.1,y+S*1.4,S*2.2,S*.4);
    ctx.fillStyle='#e0a43c'; ctx.font=`bold ${Math.floor(S*.2)}px Courier New`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(b.label,x+w/2,y+S*1.6);
    return;
  }
  if(b.type==='castle'){
    ctx.fillStyle='#cbb79a'; ctx.fillRect(x,y+S*1.2,w,h-S*1.2);
    ctx.fillStyle='rgba(0,0,0,.08)';
    for(let r=0;r<b.h-1;r++) ctx.fillRect(x,y+S*1.2+r*S*.8,w,2);
    const tw=S*1.6;
    for(const tx of [x,x+w-tw]){
      ctx.fillStyle='#bda887'; ctx.fillRect(tx,y,tw,h);
      ctx.fillStyle='#8a7a63';
      for(let c=0;c<3;c++) ctx.fillRect(tx+c*tw/3+tw*.06,y-S*.35,tw/3*.7,S*.35);
      ctx.fillStyle='#5e5468'; ctx.beginPath();
      ctx.moveTo(tx-S*.15,y); ctx.lineTo(tx+tw/2,y-S*1.1); ctx.lineTo(tx+tw+S*.15,y); ctx.fill();
    }
    ctx.fillStyle='#8a7a63';
    for(let c=0;c<Math.floor(w/(S*.8));c++) ctx.fillRect(x+tw+c*S*.8,y+S*.85,S*.45,S*.35);
    ctx.fillStyle='#e0a43c'; ctx.fillRect(x+w/2-S*.35,y+S*1.5,S*.7,S*1.5);
    ctx.fillStyle='#2a2118'; ctx.beginPath(); ctx.arc(x+w/2,y+S*2.1,S*.22,0,7); ctx.fill();
    const dx=x+(19-b.x)*S;
    ctx.fillStyle='#3a2c1e'; ctx.fillRect(dx,y+h-S*1.5,S*2,S*1.5);
    ctx.beginPath(); ctx.arc(dx+S,y+h-S*1.5,S,Math.PI,0); ctx.fill();
    ctx.fillStyle='#e0a43c'; ctx.beginPath(); ctx.arc(dx+S,y+h-S*.9,S*.08,0,7); ctx.fill();
    ctx.fillStyle='#ffe9b0';
    for(const wx of [x+w*.28,x+w*.66]) ctx.fillRect(wx,y+S*2.4,S*.5,S*.7);
  } else {
    const wood=b.type==='library'?'#a3744a':(b.type==='cafe'?'#b5754a':'#8f6a4e');
    const roof=b.type==='library'?'#7c3f33':(b.type==='cafe'?'#8a4a3a':'#5e5468');
    if(b.type==='library'){
      // a small pagoda-style tiered roof — the Library reads as a temple now, on purpose
      ctx.fillStyle=roof; ctx.beginPath();
      ctx.moveTo(x-S*.25,y+S*1.4); ctx.lineTo(x+w/2,y+S*.5); ctx.lineTo(x+w+S*.25,y+S*1.4); ctx.fill();
      ctx.fillStyle='rgba(0,0,0,.15)'; ctx.fillRect(x-S*.18,y+S*1.3,w+S*.36,S*.12);
      ctx.fillStyle=roof; ctx.beginPath();
      ctx.moveTo(x+w*.16,y+S*.78); ctx.lineTo(x+w/2,y-S*.35); ctx.lineTo(x+w*.84,y+S*.78); ctx.fill();
      ctx.fillStyle='rgba(0,0,0,.15)'; ctx.fillRect(x+w*.14,y+S*.68,w*.72,S*.1);
      ctx.fillStyle='#c8a04a'; ctx.beginPath(); ctx.arc(x+w/2,y-S*.45,S*.09,0,7); ctx.fill();
      ctx.fillStyle='#c8a04a'; ctx.fillRect(x+w/2-S*.03,y-S*.6,S*.06,S*.25);
      // prayer-flag bunting, strung between the two roof tiers — the
      // classic Tibetan five-element colors, a small sway so it never
      // reads as a static texture
      const flagCols=['#5a8fc9','#e8dcb8','#c8574a','#7fa36b','#e0a43c'];
      const sway=Math.sin(state.time*1.4)*S*.05;
      ctx.strokeStyle='#3a2c1e'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(x+w*.16,y+S*.82); ctx.quadraticCurveTo(x+w/2,y+S*.95+sway,x+w*.84,y+S*.82); ctx.stroke();
      for(let i=0;i<9;i++){
        const ft=i/8, fx=x+w*.16+(w*.68)*ft, fy=y+S*.82+Math.sin(ft*Math.PI)*(S*.13+sway);
        ctx.fillStyle=flagCols[i%flagCols.length];
        ctx.beginPath(); ctx.moveTo(fx-S*.07,fy); ctx.lineTo(fx+S*.07,fy); ctx.lineTo(fx,fy+S*.16); ctx.fill();
      }
    } else {
      ctx.fillStyle=roof; ctx.beginPath();
      ctx.moveTo(x-S*.2,y+S*1.4); ctx.lineTo(x+w/2,y-S*.3); ctx.lineTo(x+w+S*.2,y+S*1.4); ctx.fill();
      ctx.fillStyle='rgba(0,0,0,.12)'; ctx.fillRect(x-S*.2,y+S*1.25,w+S*.4,S*.15);
    }
    ctx.fillStyle=wood; ctx.fillRect(x,y+S*1.4,w,h-S*1.4);
    ctx.fillStyle='rgba(0,0,0,.08)';
    for(let r=0;r<3;r++) ctx.fillRect(x,y+S*1.7+r*S,w,2);
    const doorX=x+((b.type==='library'?7:b.type==='cafe'?24:31)-b.x)*S;
    ctx.fillStyle='#3a2c1e'; ctx.fillRect(doorX,y+h-S*1.4,S*2,S*1.4);
    ctx.fillStyle='#ffe9b0';
    ctx.fillRect(x+S*.7,y+S*2,S*.7,S*.8);
    ctx.fillRect(x+w-S*1.4,y+S*2,S*.7,S*.8);
    if(b.type==='library'){
      ctx.fillStyle='#cbb79a';
      ctx.fillRect(doorX-S*.5,y+h-S*1.6,S*.3,S*1.6);
      ctx.fillRect(doorX+S*2.2,y+h-S*1.6,S*.3,S*1.6);
      // small paper lanterns, one each side of the door
      for(const lx of [doorX-S*.35,doorX+S*2.35]){
        ctx.fillStyle='#3a2c1e'; ctx.fillRect(lx+S*.14,y+h-S*2.05,S*.02,S*.15);
        ctx.fillStyle='#c8574a'; ctx.beginPath(); ctx.arc(lx+S*.15,y+h-S*1.8,S*.13,0,7); ctx.fill();
        ctx.fillStyle='#e0a43c'; ctx.beginPath(); ctx.arc(lx+S*.15,y+h-S*1.8,S*.05,0,7); ctx.fill();
      }
    }
    if(b.type==='workshop'){
      ctx.fillStyle='#6d6d78'; ctx.fillRect(x+w-S*1.2,y-S*.1,S*.6,S*1.2);
      ctx.fillStyle='rgba(230,225,215,.5)';
      const t=state.time;
      for(let i=0;i<3;i++){
        const yy=((t*.5+i*.4)%1.4);
        ctx.beginPath(); ctx.arc(x+w-S*.9+Math.sin(t+i)*S*.1,y-S*.2-yy*S,S*(.12+yy*.1),0,7); ctx.fill();
      }
    }
    if(b.type==='cafe'){
      for(let i=0;i<4;i++){ ctx.fillStyle=i%2?'#e0a43c':'#c86e5a'; ctx.fillRect(doorX-S*.3+i*S*.65,y+h-S*1.85,S*.65,S*.4); }
    }
    ctx.fillStyle='#2a2118'; ctx.fillRect(x+w/2-S*1.6,y+S*1.55,S*3.2,S*.5);
    ctx.fillStyle='#e0a43c'; ctx.font=`bold ${Math.floor(S*.28)}px Courier New`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(b.label,x+w/2,y+S*1.8);
  }
}
function drawStation(st,ox,oy){
  const x=(st.x-ox)*S, y=(st.y-oy)*S;
  if(st.kind==='planner'){ // writing desk
    ctx.fillStyle='#75542e'; ctx.fillRect(x+S*.08,y+S*.55,S*.1,S*.4); ctx.fillRect(x+S*.82,y+S*.55,S*.1,S*.4);
    ctx.fillStyle='#8a6438'; ctx.fillRect(x+S*.02,y+S*.3,S*.96,S*.3);
    ctx.fillStyle='#f5e9d4'; ctx.fillRect(x+S*.18,y+S*.34,S*.34,S*.2);   // paper
    ctx.fillStyle='#9c8b74'; ctx.fillRect(x+S*.22,y+S*.39,S*.24,S*.03); ctx.fillRect(x+S*.22,y+S*.45,S*.18,S*.03);
    ctx.fillStyle='#2a2118'; ctx.fillRect(x+S*.66,y+S*.28,S*.12,S*.14); // inkwell
    ctx.fillStyle='#e0a43c'; ctx.fillRect(x+S*.7,y+S*.14,S*.03,S*.16);  // quill
  } else if(st.kind==='courses'){ // course board — enlarged, spills over its own tile like a real bulletin board would
    ctx.fillStyle='#63402a'; ctx.fillRect(x-S*.18,y-S*.32,S*1.36,S*1.14);
    ctx.fillStyle='#a97c50'; ctx.fillRect(x-S*.1,y-S*.24,S*1.2,S*1.0);
    const notes=[['#f5e9d4',-.02,-.14],['#ffd98a',.34,-.18],['#cfe4d2',.68,-.1],['#f0c9c9',.06,.16],['#cfe0f0',.42,.22],['#f5e9d4',.76,.14]];
    for(const [c,nx,ny] of notes){
      ctx.fillStyle=c; ctx.fillRect(x+S*nx,y+S*ny,S*.24,S*.22);
      ctx.fillStyle='#d94f4f'; ctx.beginPath(); ctx.arc(x+S*(nx+.12),y+S*ny,S*.03,0,7); ctx.fill();
    }
  } else if(st.kind==='computer'){ // a desk with a computer — the AI planning assistant
    ctx.fillStyle='#75542e'; ctx.fillRect(x+S*.08,y+S*.62,S*.1,S*.36); ctx.fillRect(x+S*.82,y+S*.62,S*.1,S*.36);
    ctx.fillStyle='#8a6438'; ctx.fillRect(x+S*.02,y+S*.56,S*.96,S*.14);
    ctx.fillStyle='#3a342e'; ctx.fillRect(x+S*.28,y+S*.16,S*.44,S*.36); // monitor body
    const glow=.5+.5*Math.sin(state.time*1.3);
    ctx.fillStyle=`rgba(126,196,222,${.55+glow*.35})`; ctx.fillRect(x+S*.32,y+S*.2,S*.36,S*.26); // screen
    ctx.fillStyle='#2a2118'; ctx.fillRect(x+S*.46,y+S*.52,S*.08,S*.08); // stand
    ctx.fillStyle='#5a4a38'; ctx.fillRect(x+S*.22,y+S*.58,S*.56,S*.05); // keyboard
  } else if(st.kind==='requests'){ // request board — a corkboard with a few pinned cards, waiting for the Caravan
    ctx.fillStyle='#8a6d4a'; ctx.fillRect(x+S*.04,y+S*.06,S*.92,S*.82);
    ctx.fillStyle='#c9a06a'; ctx.fillRect(x+S*.1,y+S*.12,S*.8,S*.7);
    const cards=[['#f5e9d4',.2,.22],['#f5e9d4',.52,.2],['#f5e9d4',.32,.5],['#f5e9d4',.6,.52]];
    for(const [c,nx,ny] of cards){
      ctx.fillStyle=c; ctx.fillRect(x+S*nx,y+S*ny,S*.2,S*.18);
      ctx.strokeStyle='#9c8b74'; ctx.lineWidth=.6; ctx.strokeRect(x+S*nx,y+S*ny,S*.2,S*.18);
      ctx.fillStyle='#2a2118'; ctx.beginPath(); ctx.arc(x+S*(nx+.1),y+S*ny,S*.025,0,7); ctx.fill();
    }
  } else if(st.kind==='notice'){ // the Notice Board — a blue-toned corkboard, deliberately not the same look as the Request Board
    ctx.fillStyle='#5a6d7a'; ctx.fillRect(x+S*.04,y+S*.06,S*.92,S*.82);
    ctx.fillStyle='#7f96a3'; ctx.fillRect(x+S*.1,y+S*.12,S*.8,S*.7);
    const cards=[['#f5e9d4',.18,.2],['#ffd98a',.5,.24],['#cfe0f0',.3,.5],['#f0c9c9',.58,.5]];
    for(const [c,nx,ny] of cards){
      ctx.fillStyle=c; ctx.fillRect(x+S*nx,y+S*ny,S*.2,S*.16);
      ctx.strokeStyle='#3a4650'; ctx.lineWidth=.6; ctx.strokeRect(x+S*nx,y+S*ny,S*.2,S*.16);
    }
  } else if(st.kind==='residents'){ // the Residents' Board — pinned notes tinted with each resident's own color
    ctx.fillStyle='#5a4a68'; ctx.fillRect(x+S*.04,y+S*.06,S*.92,S*.82);
    ctx.fillStyle='#7d6a90'; ctx.fillRect(x+S*.1,y+S*.12,S*.8,S*.7);
    const notes=[['#d9b9ea',.2,.22],['#f2b6a3',.52,.2],['#f2d78a',.32,.5],['#f5e9d4',.6,.52]];
    for(const [c,nx,ny] of notes){
      ctx.fillStyle=c; ctx.fillRect(x+S*nx,y+S*ny,S*.2,S*.18);
      ctx.fillStyle='#2a2118'; ctx.beginPath(); ctx.arc(x+S*(nx+.1),y+S*ny,S*.025,0,7); ctx.fill();
    }
  } else if(st.kind==='hearth'){ // a small stone fire pit, flame always lit
    ctx.fillStyle='#4a4038'; ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.78,S*.4,S*.16,0,0,7); ctx.fill();
    ctx.fillStyle='#6b5d4e'; for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; ctx.beginPath(); ctx.arc(x+S*.5+Math.cos(a)*S*.36,y+S*.78+Math.sin(a)*S*.14,S*.055,0,7); ctx.fill(); }
    ctx.fillStyle='#5a4028'; ctx.fillRect(x+S*.42,y+S*.62,S*.16,S*.18); // crossed logs
    const flick=.6+.4*Math.sin(state.time*7);
    ctx.fillStyle=`rgba(224,164,60,${.85*flick})`;
    ctx.beginPath(); ctx.moveTo(x+S*.5,y+S*.36); ctx.quadraticCurveTo(x+S*.34,y+S*.58,x+S*.5,y+S*.68); ctx.quadraticCurveTo(x+S*.66,y+S*.58,x+S*.5,y+S*.36); ctx.fill();
    ctx.fillStyle=`rgba(255,220,140,${.9*flick})`;
    ctx.beginPath(); ctx.moveTo(x+S*.5,y+S*.46); ctx.quadraticCurveTo(x+S*.42,y+S*.6,x+S*.5,y+S*.66); ctx.quadraticCurveTo(x+S*.58,y+S*.6,x+S*.5,y+S*.46); ctx.fill();
  } else if(st.kind==='grantdesk'){ // a desk with a real folder, a green banker's lamp — deliberately not the Archive Desk's open-book look
    ctx.fillStyle='#75542e'; ctx.fillRect(x+S*.08,y+S*.62,S*.1,S*.36); ctx.fillRect(x+S*.82,y+S*.62,S*.1,S*.36);
    ctx.fillStyle='#8a6438'; ctx.fillRect(x+S*.02,y+S*.5,S*.96,S*.18);
    ctx.fillStyle='#c9a06a'; ctx.fillRect(x+S*.16,y+S*.36,S*.34,S*.2); // folder
    ctx.strokeStyle='#8a6d4a'; ctx.lineWidth=1; ctx.strokeRect(x+S*.16,y+S*.36,S*.34,S*.2);
    ctx.fillStyle='#3a5a3a'; ctx.beginPath(); ctx.arc(x+S*.68,y+S*.34,S*.1,Math.PI,0); ctx.fill(); // lamp shade
    ctx.fillStyle='rgba(140,210,140,.6)'; ctx.beginPath(); ctx.arc(x+S*.68,y+S*.34,S*.14,0,Math.PI); ctx.fill(); // glow
    ctx.fillStyle='#2a2118'; ctx.fillRect(x+S*.66,y+S*.34,S*.04,S*.2); // lamp neck
  } else if(st.kind==='coffee'){ // the counter — order a coffee, purely for the atmosphere of it
    ctx.fillStyle='#5a4028'; ctx.fillRect(x,y+S*.5,S,S*.44);
    ctx.fillStyle='#7a5a38'; ctx.fillRect(x,y+S*.42,S,S*.1);
    ctx.fillStyle='#e8dcb8'; ctx.fillRect(x+S*.2,y+S*.2,S*.16,S*.22); // mug body
    ctx.fillStyle='none'; ctx.strokeStyle='#e8dcb8'; ctx.lineWidth=Math.max(1,S*.03);
    ctx.beginPath(); ctx.arc(x+S*.4,y+S*.31,S*.06,-Math.PI*.5,Math.PI*.5); ctx.stroke(); // handle
    const steam=.5+.5*Math.sin(state.time*2);
    ctx.strokeStyle=`rgba(255,255,255,${.35*steam})`; ctx.lineWidth=Math.max(1,S*.02);
    ctx.beginPath(); ctx.moveTo(x+S*.28,y+S*.18); ctx.quadraticCurveTo(x+S*.22,y+S*.08,x+S*.28,y-S*.02); ctx.stroke();
  } else if(st.kind==='review'){ // the Caravan Desk — a travel crate with a luggage tag, things arriving from outside the Pavilion
    ctx.fillStyle='#6b4a2f'; ctx.fillRect(x+S*.08,y+S*.36,S*.84,S*.5);
    ctx.strokeStyle='#3a2c1e'; ctx.lineWidth=Math.max(1,S*.025);
    ctx.strokeRect(x+S*.08,y+S*.36,S*.84,S*.5);
    ctx.beginPath(); ctx.moveTo(x+S*.08,y+S*.61); ctx.lineTo(x+S*.92,y+S*.61); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+S*.5,y+S*.36); ctx.lineTo(x+S*.5,y+S*.86); ctx.stroke();
    ctx.strokeStyle='#8a6d4a'; ctx.lineWidth=Math.max(1,S*.06);
    ctx.beginPath(); ctx.moveTo(x+S*.22,y+S*.36); ctx.quadraticCurveTo(x+S*.5,y+S*.14,x+S*.78,y+S*.36); ctx.stroke(); // rope handle
    ctx.fillStyle='#e8dcb8'; ctx.fillRect(x+S*.62,y+S*.44,S*.22,S*.16); // luggage tag
    ctx.strokeStyle='#2a2118'; ctx.lineWidth=1; ctx.strokeRect(x+S*.62,y+S*.44,S*.22,S*.16);
  } else { // the Archive Desk — an open book, plus a small stack of your own bound volumes
    ctx.fillStyle='#4a3520'; ctx.fillRect(x,y+S*.6,S,S*.34);
    ctx.fillStyle='#f3e6c8';
    ctx.beginPath(); ctx.moveTo(x+S*.5,y+S*.42); ctx.lineTo(x+S*.12,y+S*.52); ctx.lineTo(x+S*.12,y+S*.68); ctx.lineTo(x+S*.5,y+S*.6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+S*.5,y+S*.42); ctx.lineTo(x+S*.88,y+S*.52); ctx.lineTo(x+S*.88,y+S*.68); ctx.lineTo(x+S*.5,y+S*.6); ctx.fill();
    ctx.strokeStyle='#c9b48c'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(x+S*.24,y+S*.485); ctx.lineTo(x+S*.24,y+S*.625); ctx.moveTo(x+S*.76,y+S*.485); ctx.lineTo(x+S*.76,y+S*.625); ctx.stroke();
    const cols=['#4d7ab3','#b34d4d','#5d9c66'];
    cols.forEach((c,i)=>{ ctx.fillStyle=c; ctx.fillRect(x+S*.68+i*S*.02, y+S*(.38-i*.06), S*.16, S*.055); });
  }
  // every station gets a small floating label — the indoor equivalent of
  // the outdoor building labels, so you can tell desks apart from across
  // the room instead of needing to walk up and press E to find out
  if(st.name){
    ctx.font=`bold ${Math.floor(S*.16)}px Courier New`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    const w=ctx.measureText(st.name).width+S*.16;
    ctx.fillStyle='rgba(26,19,12,.82)'; ctx.fillRect(x+S*.5-w/2,y-S*.32,w,S*.22);
    ctx.strokeStyle='#e0a43c'; ctx.lineWidth=1; ctx.strokeRect(x+S*.5-w/2,y-S*.32,w,S*.22);
    ctx.fillStyle='#e0a43c'; ctx.fillText(st.name,x+S*.5,y-S*.21);
  }
}
function drawCritter(px,py,ox,oy,species){
  const x=(px-ox)*S, y=(py-oy)*S;
  const bob=Math.sin(state.time*3+px*7+py*3)*S*.02; // small idle sway, out of phase per-critter so a pair never moves in lockstep
  ctx.fillStyle='rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.86,S*.22,S*.08,0,0,7); ctx.fill();
  if(species==='deer'){
    ctx.fillStyle='#9a6f47';
    ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.68+bob,S*.24,S*.15,0,0,7); ctx.fill(); // body
    ctx.fillStyle='#7a5636';
    for(const lx of [x+S*.36,x+S*.46,x+S*.56,x+S*.64]) ctx.fillRect(lx,y+S*.78+bob,S*.04,S*.14); // legs
    ctx.fillStyle='#9a6f47'; ctx.beginPath(); ctx.arc(x+S*.72,y+S*.56+bob,S*.13,0,7); ctx.fill(); // head
    ctx.strokeStyle='#6b4a2f'; ctx.lineWidth=Math.max(1,S*.025);
    ctx.beginPath(); ctx.moveTo(x+S*.68,y+S*.46+bob); ctx.lineTo(x+S*.64,y+S*.36+bob); ctx.moveTo(x+S*.76,y+S*.46+bob); ctx.lineTo(x+S*.8,y+S*.36+bob); ctx.stroke(); // antlers
    ctx.fillStyle='#e8dcb8'; ctx.beginPath(); ctx.ellipse(x+S*.28,y+S*.68+bob,S*.06,S*.08,0,0,7); ctx.fill(); // tail spot
  } else { // bunny
    ctx.fillStyle='#d8d0c4';
    ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.74+bob,S*.17,S*.13,0,0,7); ctx.fill(); // body
    ctx.beginPath(); ctx.arc(x+S*.5,y+S*.58+bob,S*.12,0,7); ctx.fill(); // head
    ctx.fillStyle='#c8bfae';
    ctx.beginPath(); ctx.ellipse(x+S*.42,y+S*.38+bob,S*.035,S*.14,-.15,0,7); ctx.fill(); // ear
    ctx.beginPath(); ctx.ellipse(x+S*.56,y+S*.38+bob,S*.035,S*.14,.15,0,7); ctx.fill(); // ear
    ctx.fillStyle='#f5e9d4'; ctx.beginPath(); ctx.arc(x+S*.34,y+S*.76+bob,S*.05,0,7); ctx.fill(); // tail
  }
}
// Same hair-cap + topknot motif as drawRobedFigure, parameterized by head
// center/radius since sitting/standing meditation frame the head slightly
// differently — kept in one place so the "disciple" look stays consistent
// across every pose, not just the walking sprite.
function drawHairTopknot(cx,cy,r,color){
  ctx.fillStyle='#2a2118';
  ctx.beginPath(); ctx.arc(cx,cy-r*.03,r*1.03,Math.PI*1.02,Math.PI*1.98); ctx.fill();
  ctx.beginPath(); ctx.arc(cx,cy-r*.72,r*.27,0,7); ctx.fill();
  ctx.fillStyle=color; ctx.fillRect(cx-r*.13,cy-r*.93,r*.26,r*.32);
}
function drawMeditating(x,y,color,pose){
  ctx.fillStyle='rgba(0,0,0,.22)';
  ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.88,S*.3,S*.1,0,0,7); ctx.fill();
  const breathe=Math.sin(state.time*1.6)*S*.015; // slow and calm, deliberately not the walking bob
  if(pose==='sitting'){
    ctx.fillStyle='#8a4a3a'; ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.87,S*.34,S*.11,0,0,7); ctx.fill(); // cushion — the clearest "this is sitting, not standing" cue at this scale
    ctx.fillStyle='#6b3a2c'; ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.84,S*.34,S*.09,0,0,7); ctx.fill();
    ctx.fillStyle=color;
    ctx.beginPath(); ctx.moveTo(x+S*.22,y+S*.82); ctx.lineTo(x+S*.5,y+S*.62); ctx.lineTo(x+S*.78,y+S*.82); ctx.closePath(); ctx.fill();
    ctx.fillRect(x+S*.32,y+S*.4+breathe,S*.36,S*.44);
    ctx.fillStyle='#1c1620'; ctx.fillRect(x+S*.34,y+S*.55+breathe,S*.32,S*.05); // sash
    ctx.fillStyle='#f0cfa4'; ctx.beginPath(); ctx.arc(x+S*.5,y+S*.32+breathe,S*.17,0,7); ctx.fill();
    drawHairTopknot(x+S*.5,y+S*.32+breathe,S*.17,color);
    ctx.fillStyle='#2a2118'; ctx.fillRect(x+S*.43,y+S*.33+breathe,S*.14,S*.018);
  } else if(pose==='lying'){
    ctx.fillStyle=color; ctx.fillRect(x+S*.14,y+S*.7+breathe*.3,S*.6,S*.18);
    ctx.fillStyle='#f0cfa4'; ctx.beginPath(); ctx.arc(x+S*.8,y+S*.79+breathe*.3,S*.15,0,7); ctx.fill();
    ctx.fillStyle='#2a2118'; ctx.beginPath(); ctx.arc(x+S*.8,y+S*.79+breathe*.3,S*.15,Math.PI*1.15,Math.PI*1.95); ctx.fill(); // hair, back-of-head side
    ctx.fillStyle='#2a2118'; ctx.fillRect(x+S*.84,y+S*.775+breathe*.3,S*.03,S*.016);
  } else { // standing meditation — the idle pose, hands together, eyes closed, a faint aura
    const g=ctx.createRadialGradient(x+S*.5,y+S*.4,1,x+S*.5,y+S*.4,S*.7);
    g.addColorStop(0,color+'33'); g.addColorStop(1,'transparent');
    ctx.fillStyle=g; ctx.fillRect(x-S*.2,y-S*.3,S*1.4,S*1.4);
    ctx.fillStyle=color; ctx.fillRect(x+S*.28,y+S*.34+breathe,S*.44,S*.5);
    ctx.fillStyle='#1c1620'; ctx.fillRect(x+S*.32,y+S*.58+breathe,S*.36,S*.055); // sash
    ctx.fillStyle='#f0cfa4'; ctx.beginPath(); ctx.arc(x+S*.5,y+S*.28+breathe,S*.19,0,7); ctx.fill();
    drawHairTopknot(x+S*.5,y+S*.28+breathe,S*.19,color);
    ctx.fillStyle='#2a2118'; ctx.fillRect(x+S*.42,y+S*.27+breathe,S*.12,S*.018);
    ctx.fillStyle='#6b4a2f'; ctx.beginPath(); ctx.arc(x+S*.5,y+S*.62+breathe,S*.08,0,7); ctx.fill();
  }
}
/* A cultivation-sect robe silhouette, not a plain rectangle: shoulders
   wide, waist gathered at a sash, hem flaring back out; wide sleeves;
   dark hair with a topknot instead of a bare skin-tone head. Same
   silhouette function draws every NPC and the player — the sect look
   is the Pavilion's whole aesthetic, not a player-only skin. */
function drawRobedFigure(x,y,dir,color,bobb){
  const top=y+S*.32+bobb, waist=y+S*.58+bobb, hem=y+S*.86+bobb;
  // wide sleeves, draping down from the shoulder rather than sticking
  // straight out — drawn first so the torso overlaps their inner edge
  ctx.fillStyle=color;
  ctx.beginPath(); ctx.moveTo(x+S*.27,top); ctx.lineTo(x+S*.1,y+S*.6+bobb); ctx.lineTo(x+S*.33,y+S*.58+bobb); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x+S*.73,top); ctx.lineTo(x+S*.9,y+S*.6+bobb); ctx.lineTo(x+S*.67,y+S*.58+bobb); ctx.closePath(); ctx.fill();
  // the robe itself: shoulders -> gathered waist -> flared hem
  ctx.beginPath();
  ctx.moveTo(x+S*.28,top); ctx.lineTo(x+S*.72,top);
  ctx.lineTo(x+S*.62,waist); ctx.lineTo(x+S*.8,hem);
  ctx.lineTo(x+S*.2,hem); ctx.lineTo(x+S*.38,waist);
  ctx.closePath(); ctx.fill();
  // the sash — a contrasting band at the waist, the sect-color marker
  ctx.fillStyle='#1c1620';
  ctx.fillRect(x+S*.32,waist-S*.035,S*.36,S*.065);
  // head
  ctx.fillStyle='#f0cfa4';
  ctx.beginPath(); ctx.arc(x+S*.5,y+S*.28+bobb,S*.19,0,7); ctx.fill();
  // hair, capping the top/back of the head, plus a topknot with a
  // sect-colored pin — reads as "disciple," not just "hooded figure"
  drawHairTopknot(x+S*.5,y+S*.28+bobb,S*.19,color);
  // eyes
  ctx.fillStyle='#2a2118'; const e=S*.045;
  if(dir==='down'){ ctx.fillRect(x+S*.42,y+S*.29+bobb,e,e*1.4); ctx.fillRect(x+S*.54,y+S*.29+bobb,e,e*1.4); }
  else if(dir==='left'){ ctx.fillRect(x+S*.38,y+S*.29+bobb,e,e*1.4); }
  else if(dir==='right'){ ctx.fillRect(x+S*.58,y+S*.29+bobb,e,e*1.4); }
}
function drawPerson(px,py,dir,color,glow,isPlayer,ox,oy){
  const x=(px-ox)*S, y=(py-oy)*S;
  if(isPlayer && state.player.meditate){ drawMeditating(x,y,color,state.player.meditate); return; }
  const bobb=isPlayer&&state.player.moving?Math.sin(state.time*22)*S*.03:0;
  ctx.fillStyle='rgba(0,0,0,.22)';
  ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.88,S*.28,S*.1,0,0,7); ctx.fill();
  if(glow&&!isPlayer){
    const g=ctx.createRadialGradient(x+S*.5,y+S*.35,1,x+S*.5,y+S*.35,S*.75);
    g.addColorStop(0,glow+'55'); g.addColorStop(1,'transparent');
    ctx.fillStyle=g; ctx.fillRect(x-S*.3,y-S*.5,S*1.6,S*1.6);
  }
  drawRobedFigure(x,y,dir,color,bobb);
  if(isPlayer){ ctx.fillStyle='#6b4a2f'; ctx.fillRect(x+S*.64,y+S*.52+bobb,S*.15,S*.17); }
}
function drawSign(x,y,ox,oy){
  const sx=(x-ox)*S, sy=(y-oy)*S;
  ctx.fillStyle='#75542e'; ctx.fillRect(sx+S*.44,sy+S*.4,S*.12,S*.5);
  ctx.fillStyle='#a97c50'; ctx.fillRect(sx+S*.14,sy+S*.14,S*.72,S*.4);
  ctx.strokeStyle='#63402a'; ctx.lineWidth=2; ctx.strokeRect(sx+S*.14,sy+S*.14,S*.72,S*.4);
  ctx.fillStyle='#4a3520';
  ctx.fillRect(sx+S*.22,sy+S*.24,S*.56,S*.06);
  ctx.fillRect(sx+S*.22,sy+S*.36,S*.4,S*.06);
}
function drawFishing(ox,oy){
  const f=state.fishing; if(!f) return;
  const p=state.player;
  const px=(p.px-ox)*S, py=(p.py-oy)*S;
  const tx=(f.tile.x-ox)*S, ty=(f.tile.y-oy)*S;
  ctx.strokeStyle='#f5e9d4'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(px+S*.6,py+S*.35);
  ctx.quadraticCurveTo(px+S*.9,py-S*.3,tx+S*.5,ty+S*.45); ctx.stroke();
  const dip=f.phase==='bite'?Math.sin(state.time*30)*S*.08:Math.sin(state.time*3)*S*.03;
  ctx.fillStyle='#d94f4f'; ctx.beginPath(); ctx.arc(tx+S*.5,ty+S*.45+dip,S*.09,0,7); ctx.fill();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(tx+S*.5,ty+S*.42+dip,S*.05,0,7); ctx.fill();
  if(f.phase==='bite'){
    ctx.fillStyle='#2a2118'; ctx.beginPath(); ctx.arc(px+S*.5,py-S*.45,S*.3,0,7); ctx.fill();
    ctx.fillStyle='#e0a43c'; ctx.font=`bold ${Math.floor(S*.42)}px Courier New`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('!',px+S*.5,py-S*.43);
  }
}
function drawPrompt(ox,oy){
  if(state.dialog||state.fishing||state.ui) return;
  const ft=facingTile(), s=scene();
  const interactable=npcAt(ft.x,ft.y)||signAt(ft.x,ft.y)||stationAt(ft.x,ft.y)||
    (s.shelves&&tileAt(ft.x,ft.y)==='k')||(s.outdoor&&tileAt(ft.x,ft.y)==='W');
  if(!interactable) return;
  const p=state.player;
  const px=(p.px-ox)*S, py=(p.py-oy)*S;
  const bob=Math.sin(state.time*5)*S*.04;
  ctx.fillStyle='#e0a43c'; ctx.fillRect(px+S*.36,py-S*.42+bob,S*.28,S*.28);
  ctx.fillStyle='#2a2118'; ctx.font=`bold ${Math.floor(S*.2)}px Courier New`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('E',px+S*.5,py-S*.27+bob);
}
export function render(){
  SPAL=seasonPalette(currentSeason());
  const {cx,cy}=camera(), s=scene();
  ctx.fillStyle=s.outdoor?'#141019':'#1a130c';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  const x0=Math.floor(cx), y0=Math.floor(cy);
  const x1=Math.ceil(cx+canvas.width/S), y1=Math.ceil(cy+canvas.height/S);
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
    if(x<0||y<0||x>=s.w||y>=s.h) continue;
    drawTile(s.tiles[y][x],x,y,(x-cx)*S,(y-cy)*S);
  }
  for(const b of s.buildings) drawBuilding(b,cx,cy);
  for(const sg of (s.signs||[])) drawSign(sg.x,sg.y,cx,cy);
  for(const st of (s.stations||[])) drawStation(st,cx,cy);
  const ents=[...s.npcs.map(n=>({y:n.y,draw:()=>n.species?drawCritter(n.x,n.y,cx,cy,n.species):drawPerson(n.x,n.y,n.face||'down',n.color,n.glow,false,cx,cy)})),
    {y:state.player.py,draw:()=>drawPerson(state.player.px,state.player.py,state.player.dir,'#4a2f66',null,true,cx,cy)}];
  ents.sort((a,b)=>a.y-b.y).forEach(e=>e.draw());
  drawFishing(cx,cy);
  drawPrompt(cx,cy);
  if(s.outdoor){
    const night=isNight();
    const g=ctx.createRadialGradient(canvas.width/2,canvas.height/2,canvas.height*(night?.22:.35),canvas.width/2,canvas.height/2,canvas.height*.9);
    g.addColorStop(0,'transparent'); g.addColorStop(1,night?'rgba(10,10,38,.6)':'rgba(20,14,28,.35)');
    ctx.fillStyle=g; ctx.fillRect(0,0,canvas.width,canvas.height);
    if(night){ ctx.fillStyle='rgba(12,14,40,.28)'; ctx.fillRect(0,0,canvas.width,canvas.height); } // the Grounds actually darken at night
  }
}
