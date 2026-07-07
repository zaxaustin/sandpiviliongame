/* ================================================================
   [SEASON] — real calendar time -> atmosphere only. Pure reads, no
   state of its own, and nothing anywhere is allowed to gate a
   mechanic on these — they only change what things look/sound like.
   ================================================================ */
export function currentSeason(d=new Date()){
  const m=d.getMonth(); // 0=Jan .. 11=Dec
  if(m===11||m<=1) return 'winter';
  if(m<=4) return 'spring';
  if(m<=7) return 'summer';
  return 'autumn';
}
export function isNight(d=new Date()){
  const h=d.getHours();
  return h<6||h>=19;
}
