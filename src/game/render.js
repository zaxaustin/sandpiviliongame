import { state, scene, facingTile, npcAt, signAt, stationAt, tileAt, plantings, plantingAt, plantStage, canPlantAt, requirementMet } from './entities.js';
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
      // a lotus base (padmasana) — added 2026-07-09 so the figure is
      // actually seated on something, not floating directly off the altar
      ctx.fillStyle='#e8b8c2';
      for(const pxo of [-.28,-.14,0,.14,.28]){
        ctx.beginPath(); ctx.ellipse(sx+S*(.5+pxo),sy+S*.74,S*.1,S*.06,pxo*.6,0,7); ctx.fill();
      }
      // the seated body — two knee bumps at the base (the actual tell for
      // "cross-legged," a plain triangle reads as a tent/cone instead) then
      // a flatter-shouldered torso rising between them, replacing the first
      // pass's single smooth curve that turned out to look like a bell.
      ctx.fillStyle='#e0a43c'; ctx.strokeStyle='#5a3f18'; ctx.lineWidth=Math.max(1,S*.03);
      ctx.beginPath(); ctx.ellipse(sx+S*.24,sy+S*.64,S*.16,S*.11,.15,0,7); ctx.fill(); ctx.stroke(); // left knee
      ctx.beginPath(); ctx.ellipse(sx+S*.76,sy+S*.64,S*.16,S*.11,-.15,0,7); ctx.fill(); ctx.stroke(); // right knee
      ctx.beginPath();
      ctx.moveTo(sx+S*.28,sy+S*.62);
      ctx.quadraticCurveTo(sx+S*.3,sy+S*.1,sx+S*.5,sy+S*.02);
      ctx.quadraticCurveTo(sx+S*.7,sy+S*.1,sx+S*.72,sy+S*.62);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // a robe fold, breaking up the flat silhouette
      ctx.strokeStyle='rgba(90,63,24,.4)'; ctx.lineWidth=Math.max(1,S*.015);
      ctx.beginPath(); ctx.moveTo(sx+S*.4,sy+S*.2); ctx.quadraticCurveTo(sx+S*.5,sy+S*.4,sx+S*.42,sy+S*.56); ctx.stroke();
      // hands resting in the lap (dhyana mudra), between the two knees
      ctx.fillStyle='#c98a2e'; ctx.beginPath(); ctx.ellipse(sx+S*.5,sy+S*.56,S*.11,S*.06,0,0,7); ctx.fill();
      ctx.strokeStyle='rgba(255,220,140,.9)'; ctx.lineWidth=Math.max(1,S*.035);
      ctx.beginPath(); ctx.arc(sx+S*.5,sy-S*.55,S*.28,0,7); ctx.stroke();
      ctx.fillStyle='#e0a43c'; ctx.strokeStyle='#5a3f18'; ctx.lineWidth=Math.max(1,S*.025);
      ctx.beginPath(); ctx.arc(sx+S*.5,sy-S*.45,S*.19,0,7); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#e0a43c'; ctx.beginPath(); ctx.arc(sx+S*.5,sy-S*.68,S*.07,0,7); ctx.fill(); // ushnisha
      ctx.fillStyle='rgba(90,63,24,.8)'; ctx.beginPath(); ctx.arc(sx+S*.5,sy-S*.46,S*.02,0,7); ctx.fill(); // urna
      // candles + incense, drawn last (in front of the seated figure) —
      // real bug found and fixed 2026-07-09: these used to draw *before*
      // the body, so the knee bumps added the same day painted right
      // over them. Moved onto the altar's own front edge, in front of
      // the now-higher-seated knees, not underneath them.
      const flick=.6+.4*Math.sin(state.time*8);
      for(const cxo of [sx+S*.22,sx+S*.78]){
        ctx.fillStyle='#e8dcb8'; ctx.fillRect(cxo-S*.03,sy+S*.84,S*.06,S*.14);
        ctx.fillStyle=`rgba(255,180,80,${.85*flick})`; ctx.beginPath(); ctx.arc(cxo,sy+S*.81,S*.045,0,7); ctx.fill();
      }
      ctx.fillStyle='#8a6a3a'; ctx.fillRect(sx+S*.48,sy+S*.84,S*.03,S*.16);
      const smoke=(state.time*.3)%1;
      ctx.strokeStyle=`rgba(220,220,220,${.4*(1-smoke)})`; ctx.lineWidth=Math.max(1,S*.015);
      ctx.beginPath(); ctx.moveTo(sx+S*.5,sy+S*.84-smoke*S*.1);
      ctx.quadraticCurveTo(sx+S*.56,sy+S*.66-smoke*S*.4,sx+S*.48,sy+S*.46-smoke*S*.7);
      ctx.stroke();
      break; }
    case 'g':{ // the Ganesha statue — added 2026-07-09, same "bleed above the
      // tile" technique as the Buddha shrine ('s'), deliberately distinct
      // iconography and glow color rather than a recolored copy: broad
      // seated body, two ears, curved trunk, a small crown, an offering
      // bowl of modaks instead of the shrine's incense.
      ctx.fillStyle=((x+y)%2===0)?PAL.rug:PAL.rugD; ctx.fillRect(sx,sy,S,S);
      const ganeshaGlow=ctx.createRadialGradient(sx+S*.5,sy+S*.1,S*.1,sx+S*.5,sy+S*.1,S*.95);
      ganeshaGlow.addColorStop(0,'rgba(224,90,50,.5)'); ganeshaGlow.addColorStop(1,'rgba(224,90,50,0)');
      ctx.fillStyle=ganeshaGlow; ctx.fillRect(sx-S*.4,sy-S*1.3,S*1.8,S*2.2);
      // altar base, same shape as the Buddha shrine's for visual rhyme
      ctx.fillStyle='#5a4529'; ctx.fillRect(sx+S*.1,sy+S*.8,S*.8,S*.2);
      ctx.strokeStyle='#2a2118'; ctx.lineWidth=Math.max(1,S*.02); ctx.strokeRect(sx+S*.1,sy+S*.8,S*.8,S*.2);
      // body — two leg/knee bumps at the base, torso rising between them.
      // Fixed 2026-07-09: the original single rounded mass read as a
      // blob with no legs — same real problem the Buddha statue had,
      // same fix (see that tile's own case for the technique). Raised
      // slightly (sy+.6 instead of sy+.72) after a real second bug found
      // the same day: the offerings below were drawing *before* these
      // legs and getting painted over entirely — now the legs sit higher
      // and the offerings draw last, in front, so neither hides the other.
      ctx.fillStyle='#c9772a'; ctx.strokeStyle='#5a2f10'; ctx.lineWidth=Math.max(1,S*.03);
      ctx.beginPath(); ctx.ellipse(sx+S*.29,sy+S*.6,S*.15,S*.11,.15,0,7); ctx.fill(); ctx.stroke(); // left leg
      ctx.beginPath(); ctx.ellipse(sx+S*.71,sy+S*.6,S*.15,S*.11,-.15,0,7); ctx.fill(); ctx.stroke(); // right leg
      ctx.beginPath();
      ctx.moveTo(sx+S*.32,sy+S*.56);
      ctx.quadraticCurveTo(sx+S*.3,sy+S*.1,sx+S*.5,sy+S*.02);
      ctx.quadraticCurveTo(sx+S*.7,sy+S*.1,sx+S*.68,sy+S*.56);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.1)'; ctx.beginPath(); ctx.ellipse(sx+S*.5,sy+S*.32,S*.14,S*.2,0,0,7); ctx.fill(); // belly highlight
      // ears — two rounded flaps, drawn before the head so the head sits in front of them
      ctx.fillStyle='#d68a3a'; ctx.strokeStyle='#5a2f10'; ctx.lineWidth=Math.max(1,S*.02);
      ctx.beginPath(); ctx.ellipse(sx+S*.26,sy-S*.3,S*.17,S*.22,-.35,0,7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(sx+S*.74,sy-S*.3,S*.17,S*.22,.35,0,7); ctx.fill(); ctx.stroke();
      // head
      ctx.fillStyle='#d68a3a'; ctx.beginPath(); ctx.arc(sx+S*.5,sy-S*.4,S*.21,0,7); ctx.fill();
      ctx.strokeStyle='#5a2f10'; ctx.lineWidth=Math.max(1,S*.025); ctx.stroke();
      // trunk — a slow left/right sway over time (not a fixed side,
      // per real feedback), the same phase-based technique already
      // used for the candle flicker, just a much slower period
      const trunkSway=Math.sin(state.time*.3)*S*.13;
      ctx.strokeStyle='#c9772a'; ctx.lineWidth=Math.max(1,S*.08); ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(sx+S*.5,sy-S*.26); ctx.quadraticCurveTo(sx+S*.5+trunkSway,sy-S*.02,sx+S*.5,sy+S*.16); ctx.stroke();
      // a small crown
      ctx.fillStyle='#e0a43c'; ctx.beginPath(); ctx.arc(sx+S*.5,sy-S*.6,S*.06,0,7); ctx.fill();
      // two small oil lamps (diyas) and a modak offering to the side —
      // drawn last, in front of the seated figure, same real fix as the
      // Buddha shrine: these used to draw before the legs and vanish
      // underneath them.
      const gflick=.6+.4*Math.sin(state.time*8+2.1);
      for(const cxo of [sx+S*.22,sx+S*.78]){
        ctx.fillStyle='#7a4a22'; ctx.beginPath(); ctx.ellipse(cxo,sy+S*.91,S*.07,S*.035,0,0,7); ctx.fill();
        ctx.fillStyle=`rgba(255,150,60,${.85*gflick})`; ctx.beginPath(); ctx.arc(cxo,sy+S*.84,S*.045,0,7); ctx.fill();
      }
      ctx.fillStyle='#8a6a3a'; ctx.beginPath(); ctx.ellipse(sx+S*.28,sy+S*.9,S*.08,S*.035,0,0,7); ctx.fill();
      ctx.fillStyle='#e8c874';
      for(const mxo of [-.04,0,.04]){ ctx.beginPath(); ctx.arc(sx+S*(.28+mxo),sy+S*.86,S*.028,0,7); ctx.fill(); }
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
    case 'n': case 'N':{ // a bench, outdoors — a place to read that isn't inside the shelves.
      // 'N' is the same bench standing on sand (the Inheritance Hall's court);
      // 'n' stands on grass. Only the ground under it differs.
      if(ch==='N'){ drawTile('S',x,y,sx,sy); }
      else { ctx.fillStyle=((x+y)%2===0)?SPAL.grassA:SPAL.grassB; ctx.fillRect(sx,sy,S,S); }
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
  if(b.type==='hall'){
    // The Inheritance Hall — deliberately ROOFLESS: low stone walls open to
    // the sky, and a wide arch that was never fitted with a door. Every other
    // building here is a room you enter; this one is ground you work, and it
    // should read that way from across the Grounds before you ever walk in.
    const doorX=x+((b.door||b.x)-b.x)*S, T=S*.75; // wall thickness; door given as an absolute tile x
    // the ground inside — you can see over the wall, because there's no roof
    ctx.fillStyle='#6f8a55'; ctx.fillRect(x,y,w,h);
    ctx.fillStyle='#657f4e';
    for(let r=0;r<b.h;r++) for(let c=0;c<b.w;c++) if((r+c)%2) ctx.fillRect(x+c*S,y+r*S,S,S);
    for(let i=0;i<14;i++){ // things growing in there, glimpsed over the wall
      ctx.fillStyle=i%3?'#7fa36b':'#c9a06a';
      ctx.beginPath(); ctx.arc(x+T+((i*53)%Math.max(1,(w-2*T)))+S*.2,y+T+((i*97)%Math.max(1,(h-2*T))),S*.09,0,7); ctx.fill();
    }
    ctx.fillStyle='rgba(0,0,0,.18)'; ctx.fillRect(x+T,y+T,w-2*T,S*.3); // the wall's own shadow, cast inward
    // the wall itself — a ring, open to the sky
    ctx.fillStyle='#8e8778';
    ctx.fillRect(x,y,w,T); ctx.fillRect(x,y+h-T,w,T);
    ctx.fillRect(x,y,T,h); ctx.fillRect(x+w-T,y,T,h);
    ctx.fillStyle='#a8a08e'; // sunlit coping along every top edge
    ctx.fillRect(x,y,w,S*.22); ctx.fillRect(x,y+h-T,w,S*.18);
    ctx.fillRect(x,y,S*.18,h); ctx.fillRect(x+w-S*.18,y,S*.18,h);
    ctx.strokeStyle='rgba(0,0,0,.13)'; ctx.lineWidth=1; // stone courses
    for(let c=0;c<Math.floor(w/(S*.7));c++){
      ctx.beginPath(); ctx.moveTo(x+c*S*.7,y+S*.24); ctx.lineTo(x+c*S*.7,y+T); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x+c*S*.7+S*.35,y+h-T+S*.2); ctx.lineTo(x+c*S*.7+S*.35,y+h); ctx.stroke();
    }
    // the archway — no door, never fitted with one
    ctx.fillStyle='#b3ab99'; ctx.fillRect(doorX-S*.16,y+h-T-S*.5,S*2.32,T+S*.5); // dressed stone surround
    ctx.fillStyle='#2f2a20';
    ctx.fillRect(doorX,y+h-T-S*.1,S*2,T+S*.1);
    ctx.beginPath(); ctx.arc(doorX+S,y+h-T-S*.1,S,Math.PI,0); ctx.fill();
    ctx.fillStyle='rgba(224,164,60,.14)'; // the light of the garden, spilling out of it
    ctx.beginPath(); ctx.arc(doorX+S,y+h-T-S*.1,S*.8,Math.PI,0); ctx.fill();
    // ivy, up from the base — nobody prunes this place
    ctx.fillStyle='#5d8a4a';
    for(let i=0;i<9;i++){
      const ix=x+S*.25+i*(w-S*.5)/9, ih=S*(.25+((i*13)%5)*.13);
      if(ix>doorX-S*.3&&ix<doorX+S*2.3) continue; // not across the doorway
      ctx.fillRect(ix,y+h-ih,S*.12,ih);
      ctx.beginPath(); ctx.arc(ix+S*.06,y+h-ih,S*.11,0,7); ctx.fill();
    }
    ctx.fillStyle='#2a2118'; ctx.fillRect(x+w/2-S*2,y+S*.06,S*4,S*.46);
    ctx.fillStyle='#cfc39a'; ctx.font=`bold ${Math.floor(S*.25)}px Courier New`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(b.label,x+w/2,y+S*.29);
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
  } else if(st.kind==='records'){ // the Records Hall — a tall stack of bound volumes, dated spines, an hourglass on top: memory, not a desk to work at
    ctx.fillStyle='#4a3520'; ctx.fillRect(x+S*.14,y+S*.7,S*.72,S*.2); // base shelf
    const spines=['#6f8fb5','#c8574a','#7fa36b','#e0a43c'];
    spines.forEach((c,i)=>{ ctx.fillStyle=c; ctx.fillRect(x+S*.2+i*S*.15,y+S*.34+i*S*.02,S*.13,S*.38-i*S*.02); });
    ctx.fillStyle='#c9a06a'; ctx.beginPath(); ctx.moveTo(x+S*.42,y+S*.16); ctx.lineTo(x+S*.58,y+S*.16);
    ctx.lineTo(x+S*.46,y+S*.26); ctx.lineTo(x+S*.58,y+S*.36); ctx.lineTo(x+S*.42,y+S*.36);
    ctx.lineTo(x+S*.54,y+S*.26); ctx.closePath(); ctx.fill(); // a small hourglass, resting on the stack
  } else if(st.kind==='calendar'){ // Sebastian's desk calendar — a red-banded month pad on a small stand: the day kept, not a book to read
    ctx.fillStyle='#3a2c1e'; ctx.fillRect(x+S*.3,y+S*.72,S*.4,S*.06); // stand foot
    ctx.fillStyle='#5a4630'; ctx.fillRect(x+S*.46,y+S*.6,S*.08,S*.14); // stand post
    ctx.fillStyle='#f3ead2'; ctx.fillRect(x+S*.2,y+S*.2,S*.6,S*.42); // page
    ctx.strokeStyle='#8a6f4a'; ctx.lineWidth=1; ctx.strokeRect(x+S*.2,y+S*.2,S*.6,S*.42);
    ctx.fillStyle='#c8574a'; ctx.fillRect(x+S*.2,y+S*.2,S*.6,S*.11); // red header band
    ctx.strokeStyle='#b9b9b9'; ctx.lineWidth=Math.max(1,S*.03); // two binding rings above the band
    ctx.beginPath(); ctx.arc(x+S*.36,y+S*.2,S*.035,Math.PI,2*Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(x+S*.64,y+S*.2,S*.035,Math.PI,2*Math.PI); ctx.stroke();
    ctx.strokeStyle='#c9b48c'; ctx.lineWidth=1; // a little grid of day cells
    for(let r=0;r<3;r++) for(let c=0;c<4;c++) ctx.strokeRect(x+S*(.26+c*.13),y+S*(.36+r*.075),S*.1,S*.055);
    ctx.fillStyle='#e0a43c'; ctx.fillRect(x+S*(.26+2*.13),y+S*.36,S*.1,S*.055); // one cell marked — today
  } else if(st.kind==='yourshelf'){ // Your Shelf — a small personal bookcase, warmer wood than the six certified blocks, half-empty on purpose: you fill it
    ctx.fillStyle='#7a5a34'; ctx.fillRect(x+S*.08,y+S*.08,S*.84,S*.86); // case
    ctx.fillStyle='#4a3520'; ctx.fillRect(x+S*.14,y+S*.16,S*.72,S*.32); // upper cubby
    ctx.fillStyle='#4a3520'; ctx.fillRect(x+S*.14,y+S*.56,S*.72,S*.32); // lower cubby
    const yourSpines=[['#c8574a',.18],['#4a6a8a',.28],['#e0a43c',.38]]; // three books so far — room left beside them
    for(const [c,sx] of yourSpines){ ctx.fillStyle=c; ctx.fillRect(x+S*sx,y+S*.2,S*.08,S*.26); }
    ctx.fillStyle='#f3ead2'; ctx.fillRect(x+S*.2,y+S*.62,S*.24,S*.07); // a waiting label card in the empty lower cubby
    ctx.fillStyle='#e0a43c'; ctx.fillRect(x+S*.36,y+S*.03,S*.28,S*.05); // a small brass nameplate on top
  } else if(st.kind==='intake'){ // Bring a Book In — a low table with an open book on it and an arrow coming down into it: a drop target, made literal
    ctx.fillStyle='rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.86,S*.38,S*.1,0,0,7); ctx.fill();
    ctx.fillStyle='#4a3520'; ctx.fillRect(x+S*.14,y+S*.7,S*.07,S*.2); ctx.fillRect(x+S*.79,y+S*.7,S*.07,S*.2); // legs
    ctx.fillStyle='#8a6438'; ctx.fillRect(x+S*.08,y+S*.58,S*.84,S*.14);  // table top
    ctx.fillStyle='#a97c50'; ctx.fillRect(x+S*.08,y+S*.58,S*.84,S*.05);  // lit edge
    // an open book lying on it, pages up and waiting
    ctx.fillStyle='#f3ead2'; ctx.fillRect(x+S*.16,y+S*.46,S*.31,S*.13); ctx.fillRect(x+S*.53,y+S*.46,S*.31,S*.13);
    ctx.fillStyle='#c9b899'; ctx.fillRect(x+S*.47,y+S*.46,S*.06,S*.13); // the spine between the pages
    ctx.strokeStyle='#8a6d4a'; ctx.lineWidth=Math.max(1,S*.02);
    ctx.strokeRect(x+S*.16,y+S*.46,S*.68,S*.13);
    // an arrow dropping into it — this is where a thing from outside lands
    ctx.strokeStyle='#e0a43c'; ctx.lineWidth=Math.max(1,S*.07); ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(x+S*.5,y+S*.1); ctx.lineTo(x+S*.5,y+S*.34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+S*.36,y+S*.24); ctx.lineTo(x+S*.5,y+S*.38); ctx.lineTo(x+S*.64,y+S*.24); ctx.stroke();
    ctx.lineCap='butt';
  } else if(st.kind==='commons'){ // The Commons Table — a long table with work laid out on it for anyone to take a copy of
    ctx.fillStyle='rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.8,S*.42,S*.12,0,0,7); ctx.fill();
    ctx.fillStyle='#4a3520'; ctx.fillRect(x+S*.1,y+S*.66,S*.08,S*.24); ctx.fillRect(x+S*.82,y+S*.66,S*.08,S*.24); // legs
    ctx.fillStyle='#8a6438'; ctx.fillRect(x+S*.04,y+S*.5,S*.92,S*.18);   // the table top
    ctx.fillStyle='#a97c50'; ctx.fillRect(x+S*.04,y+S*.5,S*.92,S*.06);   // its lit edge
    // three little stacks, laid out side by side — papers, a lesson, a course
    const stacks=[[.14,'#f3ead2'],[.42,'#dce8f3'],[.68,'#e8dcc0']];
    for(const [ox2,col] of stacks){
      ctx.fillStyle='rgba(0,0,0,.15)'; ctx.fillRect(x+S*(ox2+.01),y+S*.3,S*.19,S*.21);
      ctx.fillStyle=col; ctx.fillRect(x+S*ox2,y+S*.28,S*.19,S*.21);
      ctx.strokeStyle='#9c8b74'; ctx.lineWidth=.7; ctx.strokeRect(x+S*ox2,y+S*.28,S*.19,S*.21);
      ctx.fillStyle='rgba(90,74,56,.5)';
      for(let i=0;i<3;i++) ctx.fillRect(x+S*(ox2+.03),y+S*(.32+i*.05),S*.13,S*.015);
    }
    ctx.fillStyle='#e0a43c'; ctx.fillRect(x+S*.42,y+S*.2,S*.16,S*.07); // a small "take one" card, standing up
    ctx.fillStyle='#2a2118'; ctx.fillRect(x+S*.44,y+S*.215,S*.12,S*.02);
  } else if(st.kind==='tree'){ // The Learning Tree — a branching diagram on a board, beside the Course Board
    ctx.fillStyle='#63402a'; ctx.fillRect(x-S*.06,y-S*.2,S*1.12,S*1.0);
    ctx.fillStyle='#2f3a2c'; ctx.fillRect(x,y-S*.14,S*1.0,S*.88);           // a dark slate to draw on
    ctx.strokeStyle='#7fa36b'; ctx.lineWidth=Math.max(1,S*.045); ctx.lineCap='round';
    // a trunk that forks twice — the shape of a prerequisite tree, chalked on
    ctx.beginPath(); ctx.moveTo(x+S*.5,y+S*.66); ctx.lineTo(x+S*.5,y+S*.42); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+S*.5,y+S*.42); ctx.lineTo(x+S*.26,y+S*.24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+S*.5,y+S*.42); ctx.lineTo(x+S*.74,y+S*.24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+S*.74,y+S*.24); ctx.lineTo(x+S*.62,y+S*.04); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+S*.74,y+S*.24); ctx.lineTo(x+S*.88,y+S*.06); ctx.stroke();
    const nodes=[[.5,.66],[.5,.42],[.26,.24],[.74,.24],[.62,.04],[.88,.06]];
    nodes.forEach(([nx,ny],i)=>{ ctx.fillStyle=i<3?'#e0a43c':'#8fb4d9';      // walked, then still ahead
      ctx.beginPath(); ctx.arc(x+S*nx,y+S*ny,S*.055,0,7); ctx.fill(); });
  } else if(st.kind==='alexandria'){ // a broken column, half-buried, scorched at the base
    ctx.fillStyle='rgba(0,0,0,.16)'; ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.84,S*.34,S*.1,0,0,7); ctx.fill();
    // drifted sand piled against it — it is being buried, slowly, which is the point
    ctx.fillStyle='#cbb287'; ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.8,S*.4,S*.14,0,0,7); ctx.fill();
    ctx.fillStyle='#c2a87c'; ctx.beginPath(); ctx.ellipse(x+S*.38,y+S*.84,S*.24,S*.08,0,0,7); ctx.fill();
    const colX=x+S*.5, top=y+S*.16;
    ctx.fillStyle='#b8ae97'; ctx.fillRect(colX-S*.15,top,S*.3,S*.66);            // the shaft
    ctx.fillStyle='#cbc2ab'; ctx.fillRect(colX-S*.15,top,S*.09,S*.66);           // its lit side
    ctx.strokeStyle='rgba(90,80,64,.5)'; ctx.lineWidth=Math.max(1,S*.015);       // fluting
    for(const f of [-.06,0,.06]){ ctx.beginPath(); ctx.moveTo(colX+S*f,top+S*.04); ctx.lineTo(colX+S*f,y+S*.78); ctx.stroke(); }
    // the break — snapped, not cut: a jagged top rather than a clean one
    ctx.fillStyle=((x+y)%2===0)?'#e3cfa1':'#e3cfa1';
    ctx.beginPath(); ctx.moveTo(colX-S*.16,top); ctx.lineTo(colX-S*.04,top-S*.07);
    ctx.lineTo(colX+S*.05,top+S*.02); ctx.lineTo(colX+S*.16,top-S*.05); ctx.lineTo(colX+S*.16,top-S*.16);
    ctx.lineTo(colX-S*.16,top-S*.16); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#9c927c'; ctx.fillRect(colX-S*.15,top,S*.3,S*.03);            // the raw broken face
    ctx.fillStyle='rgba(40,30,22,.30)';                                          // scorch, low on the shaft
    ctx.beginPath(); ctx.ellipse(colX,y+S*.66,S*.16,S*.12,0,0,7); ctx.fill();
    ctx.fillStyle='rgba(40,30,22,.18)';
    ctx.beginPath(); ctx.ellipse(colX-S*.06,y+S*.5,S*.08,S*.1,0,0,7); ctx.fill();
    // a fallen piece of the shaft, lying in the sand beside it
    ctx.fillStyle='#b0a68f'; ctx.beginPath(); ctx.ellipse(x+S*.76,y+S*.76,S*.16,S*.06,-.15,0,7); ctx.fill();
    ctx.strokeStyle='rgba(90,80,64,.45)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.ellipse(x+S*.76,y+S*.76,S*.16,S*.06,-.15,0,7); ctx.stroke();
  } else if(st.kind==='inheritance'){ // The Record Stone — a standing stone, tally-marked, the Hall's only furniture
    ctx.fillStyle='rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.88,S*.3,S*.09,0,0,7); ctx.fill();
    ctx.fillStyle='#8e8778'; ctx.beginPath();
    ctx.moveTo(x+S*.3,y+S*.88); ctx.lineTo(x+S*.36,y+S*.12); ctx.lineTo(x+S*.64,y+S*.08);
    ctx.lineTo(x+S*.72,y+S*.88); ctx.closePath(); ctx.fill();                     // the leaning slab
    ctx.fillStyle='rgba(255,255,255,.10)'; ctx.fillRect(x+S*.36,y+S*.12,S*.1,S*.74); // a lit edge
    ctx.strokeStyle='#5f594c'; ctx.lineWidth=Math.max(1,S*.03);                    // tally marks, cut by hand
    for(let i=0;i<4;i++){ ctx.beginPath(); ctx.moveTo(x+S*(.4+i*.06),y+S*.36); ctx.lineTo(x+S*(.42+i*.06),y+S*.56); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x+S*.38,y+S*.58); ctx.lineTo(x+S*.66,y+S*.34); ctx.stroke();
    ctx.fillStyle='rgba(150,124,84,.45)'; ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.86,S*.34,S*.07,0,0,7); ctx.fill(); // sand drifted against its foot
  } else if(st.kind==='ledger'){ // The Ledger — an open account book, ruled columns, a small coin stack, distinct from the Grant Desk's folder
    ctx.fillStyle='#75542e'; ctx.fillRect(x+S*.08,y+S*.6,S*.1,S*.34); ctx.fillRect(x+S*.82,y+S*.6,S*.1,S*.34);
    ctx.fillStyle='#8a6438'; ctx.fillRect(x+S*.02,y+S*.52,S*.96,S*.14);
    ctx.fillStyle='#f0e4c4'; ctx.fillRect(x+S*.16,y+S*.3,S*.68,S*.24); // open book
    ctx.strokeStyle='#c9b48c'; ctx.lineWidth=1;
    for(let i=0;i<4;i++){ ctx.beginPath(); ctx.moveTo(x+S*(.22+i*.14),y+S*.32); ctx.lineTo(x+S*(.22+i*.14),y+S*.52); ctx.stroke(); }
    const coins=['#e0a43c','#e0a43c','#c8862e'];
    coins.forEach((c,i)=>{ ctx.fillStyle=c; ctx.beginPath(); ctx.ellipse(x+S*.74,y+S*(.42-i*.055),S*.08,S*.035,0,0,7); ctx.fill(); });
  } else if(st.kind==='makersbench'){ // The Maker's Bench — a workbench, a hammer, a half-built birdhouse
    ctx.fillStyle='#6b4a2f'; ctx.fillRect(x+S*.04,y+S*.58,S*.92,S*.14); // bench top
    ctx.fillStyle='#4a3520'; ctx.fillRect(x+S*.1,y+S*.72,S*.08,S*.24); ctx.fillRect(x+S*.78,y+S*.72,S*.08,S*.24); // legs
    ctx.fillStyle='#a97c50'; ctx.fillRect(x+S*.32,y+S*.34,S*.3,S*.24); // birdhouse block, unfinished
    ctx.fillStyle='#8a4a3a'; ctx.beginPath(); ctx.moveTo(x+S*.28,y+S*.34); ctx.lineTo(x+S*.47,y+S*.18); ctx.lineTo(x+S*.66,y+S*.34); ctx.fill(); // roof
    ctx.fillStyle='#3a2c1e'; ctx.beginPath(); ctx.arc(x+S*.47,y+S*.46,S*.05,0,7); ctx.fill(); // hole
    ctx.strokeStyle='#2a2118'; ctx.lineWidth=Math.max(1,S*.03);
    ctx.beginPath(); ctx.moveTo(x+S*.68,y+S*.5); ctx.lineTo(x+S*.86,y+S*.32); ctx.stroke(); // hammer handle
    ctx.fillStyle='#5a5a5a'; ctx.fillRect(x+S*.82,y+S*.26,S*.14,S*.09); // hammer head
  } else if(st.kind==='greenhouse'){ // The Greenhouse — a terracotta pot, a small sapling, one sign of real patience
    ctx.fillStyle='#b5754a'; ctx.beginPath(); ctx.moveTo(x+S*.28,y+S*.6); ctx.lineTo(x+S*.72,y+S*.6);
    ctx.lineTo(x+S*.64,y+S*.86); ctx.lineTo(x+S*.36,y+S*.86); ctx.closePath(); ctx.fill(); // pot
    ctx.fillStyle='#8a4a3a'; ctx.fillRect(x+S*.24,y+S*.56,S*.52,S*.08); // pot rim
    ctx.strokeStyle='#5d9c66'; ctx.lineWidth=Math.max(1,S*.035);
    ctx.beginPath(); ctx.moveTo(x+S*.5,y+S*.56); ctx.quadraticCurveTo(x+S*.42,y+S*.36,x+S*.5,y+S*.2); ctx.stroke(); // stem
    ctx.fillStyle='#7fa36b';
    [[-.14,-.1,1],[ .1,-.06,-1],[0,-.24,1]].forEach(([dx,dy,dir])=>{
      ctx.beginPath(); ctx.ellipse(x+S*(.5+dx),y+S*(.4+dy),S*.09,S*.045,dir*.6,0,7); ctx.fill();
    }); // a few small leaves, not a full plant — young on purpose
  } else if(st.kind==='roundtable'){ // The Round Table — an actual round table, seen from above, distinct from the Cafe's square ones
    ctx.fillStyle='rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.72,S*.4,S*.14,0,0,7); ctx.fill();
    ctx.fillStyle='#8a6438'; ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.5,S*.42,S*.3,0,0,7); ctx.fill();
    ctx.fillStyle='#a97c50'; ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.46,S*.36,S*.25,0,0,7); ctx.fill();
    ctx.strokeStyle='#6b4a2f'; ctx.lineWidth=1; ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.46,S*.36,S*.25,0,0,7); ctx.stroke();
    const stoolCols=['#5a4a38','#5a4a38','#5a4a38','#5a4a38'];
    [[0,-.42],[0,.5],[-.46,.04],[.46,.04]].forEach(([dx,dy],i)=>{
      ctx.fillStyle=stoolCols[i]; ctx.beginPath(); ctx.arc(x+S*(.5+dx),y+S*(.46+dy),S*.08,0,7); ctx.fill();
    }); // four small stools, ringed round the table, empty, waiting
  } else if(st.kind==='mailroom'){ // The Mailroom — a wall of cubbies, one letter waiting, home for the Waypoints feature
    ctx.fillStyle='#6b4a2f'; ctx.fillRect(x+S*.06,y+S*.14,S*.88,S*.68);
    ctx.strokeStyle='#3a2c1e'; ctx.lineWidth=1;
    for(let r=0;r<3;r++) for(let c=0;c<3;c++){
      const cx0=x+S*(.1+c*.28), cy0=y+S*(.18+r*.21);
      ctx.strokeRect(cx0,cy0,S*.24,S*.18);
    }
    ctx.fillStyle='#f0e4c4'; ctx.fillRect(x+S*.38,y+S*.395,S*.24,S*.14); // one letter, sticking out of its cubby
    ctx.fillStyle='#c8574a'; ctx.beginPath(); ctx.arc(x+S*.5,y+S*.465,S*.035,0,7); ctx.fill(); // wax seal
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
/* ================================================================
   Plantings — the Inheritance Hall's contents. Drawn from the SAVE
   (data.grove.plantings), not from scenes.js, because nothing here
   was placed by us: a visitor planted every one of these, or was
   given it by someone else. Three things can stand in this ground:
   a book left on a stone, a sword set in a stone (a course behind a
   trial), and a seed, which is the only object in this Pavilion that
   changes on its own — over REAL calendar days, never game-time.
   ================================================================ */
function drawPlanting(pl,ox,oy){
  const x=(pl.x-ox)*S, y=(pl.y-oy)*S;
  const sway=Math.sin(state.time*.9+pl.x*1.7+pl.y*.6);
  ctx.fillStyle='rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.84,S*.28,S*.09,0,0,7); ctx.fill();
  if(!requirementMet(pl)){
    // still buried — a drift of sand with something's corner showing. You can
    // see that it's here and press E to learn what it waits on; you cannot
    // read it, and no amount of clicking changes that.
    ctx.fillStyle='#cbb287'; ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.72,S*.34,S*.17,0,0,7); ctx.fill();
    ctx.fillStyle='#bda175'; ctx.beginPath(); ctx.ellipse(x+S*.44,y+S*.76,S*.26,S*.12,0,0,7); ctx.fill();
    ctx.fillStyle='#8e8778'; // the corner of it, breaking the surface
    ctx.beginPath(); ctx.moveTo(x+S*.42,y+S*.7); ctx.lineTo(x+S*.52,y+S*.38); ctx.lineTo(x+S*.64,y+S*.72); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#6f6a5c'; ctx.lineWidth=Math.max(1,S*.02); ctx.stroke();
    ctx.fillStyle=`rgba(255,226,150,${.14+.08*sway})`;
    ctx.beginPath(); ctx.arc(x+S*.53,y+S*.55,S*.07,0,7); ctx.fill();
    ctx.font=`bold ${Math.floor(S*.15)}px Courier New`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    const bl='buried', bw=ctx.measureText(bl).width+S*.16;
    ctx.fillStyle='rgba(26,19,12,.7)'; ctx.fillRect(x+S*.5-bw/2,y-S*.28,bw,S*.21);
    ctx.strokeStyle='#a89878'; ctx.lineWidth=1; ctx.strokeRect(x+S*.5-bw/2,y-S*.28,bw,S*.21);
    ctx.fillStyle='#a89878'; ctx.fillText(bl,x+S*.5,y-S*.175);
    return;
  }
  if(pl.kind==='book'){
    // a book resting open on a flat stone — a collection someone curated and left
    ctx.fillStyle='#8e8778'; ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.72,S*.36,S*.16,0,0,7); ctx.fill(); // the slab
    ctx.fillStyle='#a29a89'; ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.68,S*.33,S*.13,0,0,7); ctx.fill();
    if(!pl.taken){ // an unclaimed gift catches the light
      const g=ctx.createRadialGradient(x+S*.5,y+S*.45,S*.05,x+S*.5,y+S*.45,S*.6);
      g.addColorStop(0,`rgba(255,226,150,${.28+.12*sway})`); g.addColorStop(1,'rgba(255,226,150,0)');
      ctx.fillStyle=g; ctx.fillRect(x-S*.3,y-S*.3,S*1.6,S*1.4);
    }
    ctx.fillStyle='#6b4a2f'; // the covers, splayed open
    ctx.beginPath(); ctx.moveTo(x+S*.5,y+S*.4); ctx.lineTo(x+S*.14,y+S*.5); ctx.lineTo(x+S*.16,y+S*.64); ctx.lineTo(x+S*.5,y+S*.55); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+S*.5,y+S*.4); ctx.lineTo(x+S*.86,y+S*.5); ctx.lineTo(x+S*.84,y+S*.64); ctx.lineTo(x+S*.5,y+S*.55); ctx.fill();
    ctx.fillStyle='#f3e6c8'; // the pages
    ctx.beginPath(); ctx.moveTo(x+S*.5,y+S*.42); ctx.lineTo(x+S*.18,y+S*.51); ctx.lineTo(x+S*.2,y+S*.61); ctx.lineTo(x+S*.5,y+S*.53); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x+S*.5,y+S*.42); ctx.lineTo(x+S*.82,y+S*.51); ctx.lineTo(x+S*.8,y+S*.61); ctx.lineTo(x+S*.5,y+S*.53); ctx.fill();
    ctx.strokeStyle='#c9b48c'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(x+S*.3,y+S*.5); ctx.lineTo(x+S*.3,y+S*.585); ctx.moveTo(x+S*.7,y+S*.5); ctx.lineTo(x+S*.7,y+S*.585); ctx.stroke();
    ctx.strokeStyle='#c8574a'; ctx.lineWidth=Math.max(1,S*.03); // a ribbon marker, stirring
    ctx.beginPath(); ctx.moveTo(x+S*.5,y+S*.44); ctx.quadraticCurveTo(x+S*(.56+sway*.03),y+S*.6,x+S*.52,y+S*.74); ctx.stroke();
  } else if(pl.kind==='sword'){
    // a sword set in a stone — a course nobody can simply pick up
    ctx.fillStyle='#6f6a5c'; ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.68,S*.34,S*.24,0,0,7); ctx.fill();  // the boulder
    ctx.fillStyle='#8e8778'; ctx.beginPath(); ctx.ellipse(x+S*.46,y+S*.62,S*.27,S*.18,0,0,7); ctx.fill();
    ctx.fillStyle='#2f2a20'; ctx.fillRect(x+S*.45,y+S*.5,S*.1,S*.12);                                      // the cleft it came out of
    if(!pl.drawn){
      ctx.strokeStyle='#c9ccd2'; ctx.lineWidth=Math.max(1,S*.09); ctx.lineCap='butt';                      // the blade
      ctx.beginPath(); ctx.moveTo(x+S*.5,y+S*.56); ctx.lineTo(x+S*.5,y+S*.2); ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.lineWidth=Math.max(1,S*.03);
      ctx.beginPath(); ctx.moveTo(x+S*.48,y+S*.54); ctx.lineTo(x+S*.48,y+S*.22); ctx.stroke();
      ctx.fillStyle='#8a6438'; ctx.fillRect(x+S*.34,y+S*.16,S*.32,S*.06);                                  // the crossguard
      ctx.fillStyle='#6b4a2f'; ctx.fillRect(x+S*.46,y+S*.04,S*.08,S*.13);                                  // the grip
      ctx.fillStyle='#e0a43c'; ctx.beginPath(); ctx.arc(x+S*.5,y+S*.04,S*.05,0,7); ctx.fill();              // the pommel
      if(pl.trial&&pl.trial.question){ // a locked one glints — the tell that there's a trial on it
        ctx.fillStyle=`rgba(255,240,190,${.35+.35*Math.sin(state.time*2.2+pl.x)})`;
        ctx.beginPath(); ctx.arc(x+S*.5,y+S*.28,S*.06,0,7); ctx.fill();
      }
    }
  } else { // a seed — the one thing here that grows, and only on real days
    const stage=plantStage(pl);
    ctx.fillStyle='#6b5335'; ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.78,S*.22,S*.09,0,0,7); ctx.fill();  // turned soil
    if(stage===0){
      ctx.fillStyle='#8a6438'; ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.74,S*.07,S*.05,.4,0,7); ctx.fill();
    } else if(stage===1){ // a sprout: a pale stem, two seed-leaves
      ctx.strokeStyle='#7fa36b'; ctx.lineWidth=Math.max(1,S*.035);
      ctx.beginPath(); ctx.moveTo(x+S*.5,y+S*.76); ctx.lineTo(x+S*(.5+sway*.02),y+S*.56); ctx.stroke();
      ctx.fillStyle='#8fc26b';
      ctx.beginPath(); ctx.ellipse(x+S*.42,y+S*.56,S*.08,S*.04,-.5,0,7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x+S*.58,y+S*.56,S*.08,S*.04,.5,0,7); ctx.fill();
    } else if(stage===2){ // a bud, still closed
      ctx.strokeStyle='#5d8a4a'; ctx.lineWidth=Math.max(1,S*.04);
      ctx.beginPath(); ctx.moveTo(x+S*.5,y+S*.76); ctx.quadraticCurveTo(x+S*(.5+sway*.04),y+S*.52,x+S*.5,y+S*.36); ctx.stroke();
      ctx.fillStyle='#7fa36b';
      ctx.beginPath(); ctx.ellipse(x+S*.38,y+S*.6,S*.1,S*.045,-.4,0,7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x+S*.62,y+S*.54,S*.1,S*.045,.4,0,7); ctx.fill();
      ctx.fillStyle='#c88fb0'; ctx.beginPath(); ctx.ellipse(x+S*.5,y+S*.32,S*.07,S*.11,0,0,7); ctx.fill();
    } else { // in bloom — and, if nobody's gathered from it, carrying seeds of its own
      const g=ctx.createRadialGradient(x+S*.5,y+S*.3,S*.05,x+S*.5,y+S*.3,S*.55);
      g.addColorStop(0,`rgba(255,200,230,${.22+.1*sway})`); g.addColorStop(1,'rgba(255,200,230,0)');
      ctx.fillStyle=g; ctx.fillRect(x-S*.2,y-S*.2,S*1.4,S*1.2);
      ctx.strokeStyle='#5d8a4a'; ctx.lineWidth=Math.max(1,S*.045);
      ctx.beginPath(); ctx.moveTo(x+S*.5,y+S*.76); ctx.quadraticCurveTo(x+S*(.5+sway*.05),y+S*.5,x+S*.5,y+S*.34); ctx.stroke();
      ctx.fillStyle='#7fa36b';
      ctx.beginPath(); ctx.ellipse(x+S*.36,y+S*.62,S*.11,S*.05,-.4,0,7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x+S*.64,y+S*.54,S*.11,S*.05,.4,0,7); ctx.fill();
      ctx.fillStyle='#f2a6c8'; // petals
      for(let a=0;a<6;a++){
        const ang=a*1.047+sway*.06;
        ctx.beginPath(); ctx.ellipse(x+S*.5+Math.cos(ang)*S*.13,y+S*.3+Math.sin(ang)*S*.13,S*.085,S*.05,ang,0,7); ctx.fill();
      }
      ctx.fillStyle='#f2e06a'; ctx.beginPath(); ctx.arc(x+S*.5,y+S*.3,S*.07,0,7); ctx.fill();
      if(!pl.harvested){ // seed pods, ready to be gathered and planted elsewhere
        ctx.fillStyle='#c9a06a';
        for(const px of [-.2,.2]){ ctx.beginPath(); ctx.ellipse(x+S*(.5+px),y+S*.44,S*.045,S*.065,px*2,0,7); ctx.fill(); }
      }
    }
  }
  // a small label, same treatment stations get — you should be able to tell
  // what someone left from across the garden, not by walking up to each one.
  // No emoji here on purpose: the canvas font renders them as tofu boxes, and
  // the sprite underneath already says which of the three this is.
  const label=pl.title||'left here';
  ctx.font=`bold ${Math.floor(S*.15)}px Courier New`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  const lw=ctx.measureText(label).width+S*.16;
  ctx.fillStyle='rgba(26,19,12,.78)'; ctx.fillRect(x+S*.5-lw/2,y-S*.3,lw,S*.21);
  ctx.strokeStyle=pl.received?'#9ac7e8':'#e0a43c'; ctx.lineWidth=1; ctx.strokeRect(x+S*.5-lw/2,y-S*.3,lw,S*.21);
  ctx.fillStyle=pl.received?'#9ac7e8':'#e0a43c'; ctx.fillText(label,x+S*.5,y-S*.195);
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
  // wide sleeves — soft draping curves with rounded cuffs, not sharp triangles
  ctx.beginPath();
  ctx.moveTo(x+S*.30, top+S*.03);
  ctx.quadraticCurveTo(x+S*.11, y+S*.46+bobb, x+S*.15, y+S*.63+bobb);
  ctx.quadraticCurveTo(x+S*.24, y+S*.68+bobb, x+S*.36, y+S*.58+bobb);
  ctx.quadraticCurveTo(x+S*.31, waist-S*.06, x+S*.30, top+S*.03);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x+S*.70, top+S*.03);
  ctx.quadraticCurveTo(x+S*.89, y+S*.46+bobb, x+S*.85, y+S*.63+bobb);
  ctx.quadraticCurveTo(x+S*.76, y+S*.68+bobb, x+S*.64, y+S*.58+bobb);
  ctx.quadraticCurveTo(x+S*.69, waist-S*.06, x+S*.70, top+S*.03);
  ctx.closePath(); ctx.fill();
  // the robe: rounded shoulders -> gathered waist -> a softly curved, flared hem
  ctx.beginPath();
  ctx.moveTo(x+S*.30, top+S*.02);
  ctx.quadraticCurveTo(x+S*.5, top-S*.04, x+S*.70, top+S*.02);   // rounded shoulders
  ctx.quadraticCurveTo(x+S*.66, waist-S*.04, x+S*.60, waist);    // in to the waist
  ctx.quadraticCurveTo(x+S*.74, hem-S*.10, x+S*.77, hem);        // flare out, curved
  ctx.quadraticCurveTo(x+S*.5, hem+S*.045, x+S*.23, hem);        // curved hem with a gentle dip
  ctx.quadraticCurveTo(x+S*.26, hem-S*.10, x+S*.40, waist);      // left flare up
  ctx.quadraticCurveTo(x+S*.34, waist-S*.04, x+S*.30, top+S*.02);// up to the shoulder
  ctx.closePath(); ctx.fill();
  // depth: a soft shoulder highlight and a centre seam (the robe's front
  // opening), so the figure reads as folded cloth, not a flat cutout
  ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect(x+S*.3,top,S*.4,S*.03);
  ctx.fillStyle='rgba(0,0,0,.12)'; ctx.fillRect(x+S*.485,top,S*.03,hem-top);
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
  // feet — planted when still, a small alternating stride when walking (bobb!=0),
  // so movement reads as steps under the hem rather than a gliding bob
  const stride = bobb!==0 ? Math.sin(state.time*22)*S*.05 : 0;
  ctx.fillStyle='#2a2118';
  ctx.fillRect(x+S*.4, hem-S*.01-stride, S*.09, S*.08);
  ctx.fillRect(x+S*.51, hem-S*.01+stride, S*.09, S*.08);
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
  const interactable=npcAt(ft.x,ft.y)||signAt(ft.x,ft.y)||stationAt(ft.x,ft.y)||plantingAt(ft.x,ft.y)||
    (s.shelves&&tileAt(ft.x,ft.y)==='k')||(s.outdoor&&tileAt(ft.x,ft.y)==='W')||canPlantAt(ft.x,ft.y);
  if(!interactable) return;
  const p=state.player;
  const px=(p.px-ox)*S, py=(p.py-oy)*S;
  const bob=Math.sin(state.time*5)*S*.04;
  ctx.fillStyle='#e0a43c'; ctx.fillRect(px+S*.36,py-S*.42+bob,S*.28,S*.28);
  ctx.fillStyle='#2a2118'; ctx.font=`bold ${Math.floor(S*.2)}px Courier New`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('E',px+S*.5,py-S*.27+bob);
}
/* A drifting breeze — a handful of petals/leaves carried on the wind, tinted to
   the season's own flowers/canopy. Pure atmosphere: ~14 sprites, positions
   derived from state.time so it needs no persistent state, and outdoor-only.
   The eastern "blossoms on the wind" feel, kept cheap (the sleeper car). */
function drawBreeze(){
  const W=canvas.width, H=canvas.height, t=state.time, n=14;
  const cols=[SPAL.flower, SPAL.flower2, SPAL.canopy];
  for(let i=0;i<n;i++){
    const vx=12+(i%5)*4, vy=7+(i%3)*3; // each petal its own drift speed
    const x=(((i*W)/n + i*41 + t*vx) % (W+60)) - 30 + Math.sin(t*1.4+i)*16; // drift + a fluttering wobble
    const y=(((i*H)/n + i*57 + t*vy) % (H+60)) - 30;
    const size=S*(0.05+(i%3)*0.02);
    ctx.save();
    ctx.translate(x,y); ctx.rotate(t*1.1+i);
    ctx.globalAlpha=0.42;
    ctx.fillStyle=cols[i%3];
    ctx.beginPath(); ctx.ellipse(0,0,size,size*0.5,0,0,7); ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha=1;
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
  for(const pl of plantings()) if((pl.scene||'grove')===state.scene) drawPlanting(pl,cx,cy);
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
    drawBreeze(); // petals on the wind, above the world
  }
}
