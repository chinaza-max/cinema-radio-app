/*
 * Cinebox scene engine. Pure functions, no DOM access: it turns one playback scene
 * into an SVG string, so it also runs in Node (see scripts/check-vocab.mjs).
 *
 * Input  : a playback scene { p, tm, pr, fx, c, cam, fl, s } plus the movie's cast map.
 * Output : an <svg> string. Animation lives in public/css/app.css (classes .cam, .pz, .flick ...).
 *
 * To add vocabulary (a new place, prop, hat, effect, ...): see "Extending the vocabulary" in README.md.
 * Every name registered here must also be listed in src/movies/vocabulary.json (npm run check:vocab).
 */
function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}

/* ---------- palettes ---------- */
const SKY={
 day:{t:'#5fa8dc',b:'#cfe8fa',far:'#8aa898',mid:'#5f8f58',gr:'#47773f',ink:'#1f2d1c',sun:'#fff3b8',s1:'#2f86b0',s2:'#17566f',sand:'#e0c791'},
 dawn:{t:'#53659e',b:'#f0b48d',far:'#76769c',mid:'#566a70',gr:'#3b5244',ink:'#1b2130',sun:'#ffd9a2',s1:'#6d7fae',s2:'#2e3e63',sand:'#c9a98e'},
 dusk:{t:'#2d2a5b',b:'#e0836a',far:'#5a4870',mid:'#403858',gr:'#2b2f40',ink:'#13121e',sun:'#ffb273',s1:'#5c4a72',s2:'#241d3a',sand:'#8a6a5a'},
 night:{t:'#060a1b',b:'#1b2644',far:'#17223c',mid:'#111a2f',gr:'#0d1525',ink:'#04060e',sun:'#e8efff',s1:'#10213d',s2:'#070d1c',sand:'#2a2a3a'},
 storm:{t:'#1c222d',b:'#48525f',far:'#2f3843',mid:'#262f39',gr:'#1b232b',ink:'#0b1015',sun:'#9aa7b5',s1:'#2a3a4a',s2:'#121c26',sand:'#3a3f44'},
 future:{t:'#3a2a6c',b:'#f5a0b2',far:'#8a6aa8',mid:'#c887a1',gr:'#ebbba8',ink:'#3a2450',sun:'#fff1d2',s1:'#c07090',s2:'#6a4a8a',sand:'#f0d0c0'}
};
const DARK=tm=>tm==='night'||tm==='dusk'||tm==='storm';
export const GY={hall:218,forest:216,citadel:216,room:218,moor:214,sea:216,island:216,cave:216,future:216,warp:214,village:216,street:218,office:218,apartment:218,restroom:218,workshop:218,clinic:218,floodedRoad:218,servicePath:216};

/* ---------- characters ---------- */
const HATS={
 headwrap:c=>`<path d="M-8.8 -60 Q-9 -73 0 -73 Q9 -73 8.8 -60 Q0 -64 -8.8 -60Z" fill="${c.hc}"/><path d="M-9 -65 Q0 -70 9 -65" stroke="#fff" stroke-width="1.1" fill="none" opacity=".55"/><path d="M8 -67 Q16 -72 14 -60 Q11 -65 8 -63Z" fill="${c.hc}"/>`,
 horned:c=>`<path d="M-11 -50 Q-12.5 -74 0 -74 Q12.5 -74 11 -50 L8 -50 Q9 -64 0 -65 Q-9 -64 -8 -50Z" fill="${c.hc}"/><path d="M-7 -70 Q-15 -78 -11 -90 Q-8 -80 -4 -73Z" fill="${c.hc2||'#cfc6dd'}"/><path d="M7 -70 Q15 -78 11 -90 Q8 -80 4 -73Z" fill="${c.hc2||'#cfc6dd'}"/>`,
 wizard:c=>`<path d="M-10 -62 L1 -93 L10 -62Z" fill="${c.hc}"/><ellipse cx="0" cy="-62" rx="15" ry="3" fill="${c.hc}"/><circle cx="1.5" cy="-76" r="1.6" fill="#ffd36b"/><circle cx="-3" cy="-68" r="1.1" fill="#ffd36b"/>`,
 deerstalker:c=>`<path d="M-9 -61 Q-9 -72 0 -72 Q9 -72 9 -61Z" fill="${c.hc}"/><path d="M5 -61.5 L15 -59.5 L5 -58.5Z" fill="${c.hc2||c.hc}"/><rect x="-9.6" y="-62" width="19.2" height="2.6" rx="1.2" fill="${c.hc2||c.hc}"/>`,
 bowler:c=>`<path d="M-8 -62 Q-8 -72 0 -72 Q8 -72 8 -62Z" fill="${c.hc}"/><rect x="-11" y="-63" width="22" height="2.4" rx="1.2" fill="${c.hc}"/>`,
 top:c=>`<rect x="-6.5" y="-80" width="13" height="18" rx="1" fill="${c.hc}"/><rect x="-10.5" y="-63" width="21" height="2.4" rx="1.2" fill="${c.hc}"/><rect x="-6.5" y="-67" width="13" height="2.6" fill="#a33"/>`,
 tricorn:c=>`<path d="M-13 -62 L0 -76 L13 -62 Q0 -58 -13 -62Z" fill="${c.hc}"/><path d="M-13 -62 L0 -76 L13 -62" fill="none" stroke="${c.hc2||c.hc}" stroke-width="1.5"/>`,
 cap:c=>`<path d="M-9 -62 Q-9 -69.5 0 -69.5 Q9 -69.5 9 -62Z" fill="${c.hc}"/><path d="M6 -62.4 L14 -61 L6 -59.6Z" fill="${c.hc}"/>`,
 straw:c=>`<ellipse cx="0" cy="-63" rx="14" ry="3" fill="${c.hc}"/><path d="M-7 -63 Q-7 -72 0 -72 Q7 -72 7 -63Z" fill="${c.hc}"/><rect x="-7" y="-65.5" width="14" height="2" fill="${c.hc2||c.hc}"/>`,
 bandana:c=>`<path d="M-8.4 -60 Q-8.4 -71 0 -71 Q8.4 -71 8.4 -60 Q0 -63 -8.4 -60Z" fill="${c.hc}"/><path d="M-8 -62 L-16 -57 L-9 -67Z" fill="${c.hc}"/>`,
 hood:c=>`<path d="M-11 -50 Q-12.5 -74 0 -74 Q12.5 -74 11 -50 L8 -50 Q9 -64 0 -65 Q-9 -64 -8 -50Z" fill="${c.hc}"/>`,
 hair:c=>`<path d="M-8.4 -59 Q-9 -70 0 -70 Q9 -70 8.4 -59 Q4 -64 -2 -63 Q-6 -62 -8.4 -59Z" fill="${c.hc}"/>`,
 hairlong:c=>`<path d="M-8.4 -59 Q-9 -70 0 -70 Q9 -70 8.4 -59 Q4 -64 -2 -63 Q-6 -62 -8.4 -59Z" fill="${c.hc}"/><path d="M-8 -60 Q-14 -44 -7 -37 L-3 -41 Q-6 -50 -5 -58Z" fill="${c.hc}"/>`
};
const EXTRA={
 lightstaff:{hand:`<line x1="8" y1="-76" x2="8" y2="18" stroke="#6a4a2a" stroke-width="2.2"/><circle cx="8" cy="-79" r="14" fill="#9ff3e6" opacity=".28" class="pulse"/><circle cx="8" cy="-79" r="4.6" fill="#c9fff6"/>`},
 staff:{hand:`<line x1="8" y1="-46" x2="8" y2="2" stroke="#4a3418" stroke-width="2.2"/><circle cx="8" cy="-49" r="4.2" fill="#ffcf5a"/><circle cx="8" cy="-49" r="12" fill="#ffcf5a" opacity=".28" class="pulse"/>`},
 darkstaff:{hand:`<line x1="8" y1="-46" x2="8" y2="2" stroke="#2a1d33" stroke-width="2.2"/><circle cx="8" cy="-49" r="4.2" fill="#b06aff"/><circle cx="8" cy="-49" r="12" fill="#b06aff" opacity=".3" class="pulse"/>`,head:`<circle cx="3" cy="-58" r="1.5" fill="#ff3355"/><circle cx="6.6" cy="-58" r="1.5" fill="#ff3355"/>`},
 spark:{hand:`<circle cx="8" cy="-22" r="3" fill="#ffd36b"/><circle cx="8" cy="-22" r="12" fill="#ff9a2e" opacity=".32" class="pulse"/>`},
 bow:{hand:`<path d="M10 -42 Q24 -26 10 -8" stroke="#6a4a2a" stroke-width="1.8" fill="none"/><line x1="10" y1="-42" x2="10" y2="-8" stroke="#ddd" stroke-width=".6"/>`},
 pipe:{head:`<path d="M7.6 -53 L12.4 -53 Q15.6 -53 15.6 -56.4" stroke="#3a2412" stroke-width="1.4" fill="none"/>`},
 cane:{hand:`<line x1="8" y1="-27" x2="8" y2="20" stroke="#4a3018" stroke-width="2"/>`},
 lantern:{hand:`<rect x="5.5" y="-23" width="5" height="7" fill="#e8b020"/><circle cx="8" cy="-19" r="13" fill="#ffcf6b" opacity=".28"/>`},
 net:{hand:`<line x1="8" y1="-25" x2="22" y2="-68" stroke="#7a5a30" stroke-width="1.4"/><ellipse cx="23.5" cy="-72" rx="7" ry="5" fill="none" stroke="#7a5a30" stroke-width="1.2"/><path d="M16.5 -71 Q23.5 -58 30.5 -71" fill="#e8e0d0" opacity=".4"/>`},
 parrot:{body:`<ellipse cx="-9" cy="-52" rx="3.2" ry="4.6" fill="#d43a2a"/><circle cx="-9" cy="-58" r="2.4" fill="#d43a2a"/><path d="M-11.2 -58 L-14.4 -57 L-11.2 -56Z" fill="#e8b020"/><path d="M-10 -48 L-13 -40 L-8 -45Z" fill="#2a9d8f"/>`}
};
function fig(c,o){
  const ink='#1a1410',skin=c.skin||'#e8c4a0';
  const ex=(c.extra||'').split(',').map(k=>EXTRA[k]||{});
  const pick=k=>ex.map(e=>e[k]||'').join('');
  const hatf=HATS[c.hat];
  const leg2=c.peg?`<rect class="leg l2" x="2.5" y="-20" width="3.2" height="20" rx="1.2" fill="#5a3a1c"/>`:`<rect class="leg l2" x="1.5" y="-20" width="5.5" height="20" rx="2" fill="${c.pants||ink}"/>`;
  return `<g class="pz ${o.pose||''}"><g class="fg ${o.talk?'talk':''}">
  <ellipse cx="0" cy="0" rx="15" ry="3.2" fill="#000" opacity=".28"/>
  <rect class="leg l1" x="-7" y="-20" width="5.5" height="20" rx="2" fill="${c.pants||ink}"/>${leg2}
  <path d="M-12 -18 Q-13 -36 -9 -46 Q0 -52 9 -46 Q13 -36 12 -18 Q0 -13 -12 -18Z" fill="${c.coat}"/><path d="M-5 -49 Q0 -53 5 -49 L3 -45 L-3 -45Z" fill="${c.coat2||c.coat}" opacity=".85"/>
  <rect x="-1" y="-48" width="2" height="31" fill="${c.trim||'#00000040'}"/>
  ${pick('body')}
  <g class="head"><rect x="-3" y="-51" width="6" height="5" rx="2" fill="${skin}"/><circle cx="0" cy="-57" r="10.2" fill="${skin}"/>
   ${c.hair?`<path d="M-8.4 -58 Q-10.4 -64 -7 -67 L-3 -64 Q-6 -58 -5.4 -52Z" fill="${c.hair}"/>`:''}
   ${c.beard?`<path d="M-6 -54 Q0 -44 6.5 -54Z" fill="${c.beard}"/>`:''}
   <ellipse cx="-3.5" cy="-58" rx="2.1" ry="2.4" fill="#fff"/><ellipse cx="3.5" cy="-58" rx="2.1" ry="2.4" fill="#fff"/><circle cx="-3.2" cy="-58" r="1" fill="#1a1410"/><circle cx="3.8" cy="-58" r="1" fill="#1a1410"/><path d="M0 -59 L-1.2 -55.5 L1.2 -55.5" stroke="#a16d55" stroke-width=".7" fill="none"/>
   <rect class="mouth" x="3.8" y="-53.6" width="3.4" height="1.4" rx=".7" fill="#7a3a2a"/>
   ${hatf?hatf(c):''}${pick('head')}</g>
  <g class="arm left"><rect x="-11" y="-45" width="6" height="20" rx="3" fill="${c.coat2||c.coat}" transform="rotate(12 -8 -25)"/><circle cx="-9" cy="-25" r="3.2" fill="${skin}"/></g><g class="arm right"><rect x="5" y="-46" width="6" height="20" rx="3" fill="${c.coat2||c.coat}" transform="rotate(-12 8 -25)"/><circle cx="8" cy="-25" r="3.2" fill="${skin}"/>${pick('hand')}</g>
  </g></g>`;
}

/* ---------- scene pieces ---------- */
function sky(id,P){return `<defs><linearGradient id="${id}sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.t}"/><stop offset="1" stop-color="${P.b}"/></linearGradient></defs><rect width="400" height="250" fill="url(#${id}sk)"/>`}
function orb(tm,P){
  if(tm==='night')return `<circle cx="300" cy="80" r="38" fill="${P.sun}" opacity=".1"/><circle cx="300" cy="80" r="19" fill="${P.sun}"/><circle cx="294" cy="76" r="4" fill="#c5cfe6" opacity=".6"/><circle cx="306" cy="87" r="3" fill="#c5cfe6" opacity=".5"/>`;
  if(tm==='day')return `<circle cx="84" cy="52" r="34" fill="${P.sun}" opacity=".25"/><circle cx="84" cy="52" r="17" fill="${P.sun}"/>`;
  if(tm==='dawn'||tm==='dusk')return `<circle cx="96" cy="130" r="46" fill="${P.sun}" opacity=".22"/><circle cx="96" cy="130" r="22" fill="${P.sun}"/>`;
  if(tm==='future')return `<circle cx="290" cy="78" r="64" fill="${P.sun}" opacity=".18"/><circle cx="290" cy="78" r="46" fill="${P.sun}" opacity=".3"/><circle cx="290" cy="78" r="30" fill="${P.sun}"/>`;
  return '';
}
const PLACES={
 hall(P,id,R,sc){
  let s=`<defs><linearGradient id="${id}hl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0a22"/><stop offset="1" stop-color="#1f1745"/></linearGradient></defs><rect width="400" height="250" fill="url(#${id}hl)"/>`;
  [105,295].forEach(x=>{s+=`<path d="M${x-28} 196 V92 Q${x-28} 48 ${x} 48 Q${x+28} 48 ${x+28} 92 V196Z" fill="#251d58"/>`;for(let i=0;i<9;i++)s+=`<circle class="twk" style="--t:${(2+R()*3).toFixed(1)}s;--d:${(R()*3).toFixed(1)}s" cx="${(x-20+R()*40).toFixed(0)}" cy="${(70+R()*100).toFixed(0)}" r="1.1" fill="#fff"/>`});
  [28,168,232,372].forEach(x=>{s+=`<rect x="${x-11}" y="0" width="22" height="208" fill="#2b2362"/><rect x="${x-11}" y="0" width="5" height="208" fill="#3a3180" opacity=".7"/><rect x="${x-14}" y="196" width="28" height="12" fill="#1d1648"/>`});
  s+=`<rect y="206" width="400" height="44" fill="#140f30"/>`;
  [222,236,248].forEach(y=>s+=`<line x1="0" y1="${y}" x2="400" y2="${y}" stroke="#7be0d0" opacity=".08"/>`);
  return s;
 },
 forest(P,id,R,sc){
  const d=DARK(sc.tm),top=d?'#050f14':'#2f6a5a',bot=d?'#14403a':'#a8d8a4';
  let s=`<defs><linearGradient id="${id}fo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient></defs><rect width="400" height="250" fill="url(#${id}fo)"/>`;
  if(!d)for(let i=0;i<3;i++){const x=40+i*130+R()*30;s+=`<path d="M${x.toFixed(0)} 0 L${(x+40).toFixed(0)} 0 L${(x+110).toFixed(0)} 220 L${(x+50).toFixed(0)} 220Z" fill="#fff6c0" opacity=".1"/>`}
  [[d?'#0a2622':'#3f8a66',150],[d?'#071c1a':'#2d6e52',185]].forEach((L,li)=>{
    for(let i=0;i<9;i++){
      const x=i*50-10+R()*26,h=70+R()*60+li*20,w=9+li*5,ty=L[1]-h+60;
      s+=`<rect x="${x.toFixed(0)}" y="${ty.toFixed(0)}" width="${w}" height="${h.toFixed(0)}" fill="${L[0]}"/>`;
      [[0,-4,28],[-16,10,20],[16,8,22]].forEach(c=>{s+=`<circle cx="${(x+w/2+c[0]).toFixed(0)}" cy="${(ty+c[1]).toFixed(0)}" r="${c[2]+li*6}" fill="${L[0]}"/>`});
    }
  });
  s+=`<path d="M0 204 Q200 192 400 206 V250 H0Z" fill="${d?'#0b2420':'#2d6a3a'}"/>`;
  if(d)for(let i=0;i<9;i++){s+=`<ellipse class="twk" style="--t:${(2+R()*2).toFixed(1)}s;--d:${(R()*2).toFixed(1)}s" cx="${(R()*400).toFixed(0)}" cy="${(212+R()*30).toFixed(0)}" rx="4" ry="2.6" fill="#7ff0d8"/>`}
  return s;
 },
 citadel(P,id,R,sc){
  let s=`<defs><linearGradient id="${id}ci" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#120820"/><stop offset=".6" stop-color="#4a1a40"/><stop offset="1" stop-color="#8a2a3a"/></linearGradient></defs><rect width="400" height="250" fill="url(#${id}ci)"/>`;
  s+=`<path d="M0 150 L40 100 L80 140 L130 90 L170 135 L230 80 L280 130 L330 95 L370 140 L400 110 V250 H0Z" fill="#0d0716"/>`;
  s+=`<rect x="176" y="40" width="48" height="170" fill="#07040c"/><path d="M170 40 L200 -10 L230 40Z" fill="#07040c"/><rect x="118" y="86" width="30" height="124" fill="#07040c"/><path d="M114 86 L133 52 L152 86Z" fill="#07040c"/><rect x="252" y="96" width="30" height="114" fill="#07040c"/><path d="M248 96 L267 62 L286 96Z" fill="#07040c"/>`;
  [[192,70],[192,100],[192,130],[126,110],[126,140],[260,120],[260,150]].forEach(w=>{s+=`<rect class="flick" x="${w[0]}" y="${w[1]}" width="6" height="10" fill="#ff7a3a" opacity=".9"/>`});
  s+=`<path d="M0 208 Q200 198 400 208 V250 H0Z" fill="#0a0610"/>`;
  for(let i=0;i<7;i++){const x=R()*380,y=214+R()*30;s+=`<path class="pulse" d="M${x.toFixed(0)} ${y.toFixed(0)} l${(10+R()*20).toFixed(0)} ${(R()*6-3).toFixed(0)}" stroke="#ff5a2a" stroke-width="1.6" fill="none"/>`}
  return s;
 },
 room(P,id,R,sc){
  const n=DARK(sc.tm),w=n?['#35271f','#1e140f','#2a1d16']:['#8a6c50','#5c4533','#715840'];
  let s=`<rect width="400" height="250" fill="${w[0]}"/>`;
  for(let i=0;i<20;i++)s+=`<rect x="${i*20+8}" y="0" width="2" height="150" fill="#000" opacity=".07"/>`;
  s+=`<rect y="150" width="400" height="22" fill="${w[2]}"/><rect y="170" width="400" height="80" fill="${w[1]}"/>`;
  [186,204,226].forEach(y=>s+=`<line x1="0" y1="${y}" x2="400" y2="${y}" stroke="#000" opacity=".25"/>`);
  return s;
 },
 moor(P,id,R,sc){
  let s=sky(id,P)+orb(sc.tm,P);
  s+=`<path d="M0 150 Q60 118 130 144 T262 132 T400 142 V250 H0Z" fill="${P.far}"/>`;
  s+=`<path d="M0 178 Q90 138 170 170 T330 160 T400 168 V250 H0Z" fill="${P.mid}"/>`;
  s+=`<path d="M286 170 L300 136 L312 129 L322 137 L336 152 L350 170Z" fill="${P.ink}"/>`;
  s+=`<path d="M0 200 Q100 186 200 200 T400 196 V250 H0Z" fill="${P.gr}"/>`;
  for(let i=0;i<28;i++){const x=R()*400,y=206+R()*40;s+=`<path d="M${x.toFixed(1)} ${y.toFixed(1)} l-2 -6 l2 3 l2 -5 l1 6 l3 -4 l-1 6z" fill="${P.ink}" opacity=".35"/>`}
  return s;
 },
 sea(P,id,R,sc){
  let s=sky(id,P)+orb(sc.tm,P);
  s+=`<defs><linearGradient id="${id}sa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.s1}"/><stop offset="1" stop-color="${P.s2}"/></linearGradient></defs><rect y="132" width="400" height="118" fill="url(#${id}sa)"/>`;
  const wp=(y,o,t,c,op)=>{let d=`M-100 ${y}`;for(let i=0;i<8;i++)d+=` q25 -${o} 50 0 t50 0`;return `<g class="wv" style="--t:${t}s" opacity="${op}"><path d="${d} V260 H-100Z" fill="${c}"/></g>`};
  s+=wp(150,4,6,P.s1,.55)+wp(174,6,4.5,P.s2,.5)+wp(200,8,3.2,P.s2,.7);
  return s;
 },
 island(P,id,R,sc){
  let s=sky(id,P)+orb(sc.tm,P);
  s+=`<defs><linearGradient id="${id}sa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.s1}"/><stop offset="1" stop-color="${P.s2}"/></linearGradient></defs><rect y="142" width="400" height="108" fill="url(#${id}sa)"/>`;
  for(let i=0;i<9;i++){const x=R()*380,y=150+R()*30;s+=`<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x+22).toFixed(0)}" y2="${y.toFixed(0)}" stroke="#fff" opacity=".16" stroke-width="1.4"/>`}
  s+=`<path d="M100 148 Q150 98 206 84 Q262 98 306 148Z" fill="${P.mid}"/><path d="M150 148 Q202 112 264 148Z" fill="${P.gr}" opacity=".75"/>`;
  s+=`<path d="M0 206 Q200 190 400 204 V250 H0Z" fill="${P.sand}"/>`;
  for(let i=0;i<30;i++){const x=R()*400,y=214+R()*32;s+=`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(1+R()*1.4).toFixed(1)}" fill="#000" opacity=".1"/>`}
  return s;
 },
 cave(P,id,R,sc){
  let s=`<defs><linearGradient id="${id}cv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#080605"/><stop offset="1" stop-color="#241a14"/></linearGradient></defs><rect width="400" height="250" fill="url(#${id}cv)"/>`;
  s+=`<path d="M0 0 H400 V92 Q360 62 330 102 Q300 72 260 112 Q220 62 180 106 Q140 72 100 112 Q60 68 0 100Z" fill="#15100d"/>`;
  for(let i=0;i<14;i++){const x=i*30+R()*14,h=22+R()*40;s+=`<path d="M${x.toFixed(0)} 60 L${(x+10).toFixed(0)} 60 L${(x+5).toFixed(0)} ${(60+h).toFixed(0)}Z" fill="#1d1612" opacity=".9"/>`}
  s+=`<path d="M0 0 L54 0 Q30 120 62 250 H0Z" fill="#0c0907"/><path d="M400 0 L346 0 Q370 120 338 250 H400Z" fill="#0c0907"/>`;
  s+=`<path d="M0 208 Q200 196 400 208 V250 H0Z" fill="#2b2119"/>`;
  for(let i=0;i<16;i++){const x=R()*400,y=214+R()*30;s+=`<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${(3+R()*5).toFixed(1)}" ry="2" fill="#000" opacity=".3"/>`}
  return s;
 },
 future(P,id,R,sc){
  let s=sky(id,P)+orb('future',P);
  for(let i=0;i<7;i++){const x=20+i*55+R()*20,h=60+R()*60;s+=`<rect x="${x.toFixed(0)}" y="${(150-h).toFixed(0)}" width="9" height="${h.toFixed(0)}" fill="${P.far}"/><circle cx="${(x+4.5).toFixed(1)}" cy="${(150-h).toFixed(0)}" r="6" fill="${P.far}"/>`}
  for(let i=0;i<14;i++){const x=i*30+R()*12,r=18+R()*12;s+=`<circle cx="${x.toFixed(0)}" cy="${(170+R()*8).toFixed(0)}" r="${r.toFixed(0)}" fill="${P.mid}"/>`}
  s+=`<path d="M0 196 Q200 184 400 196 V250 H0Z" fill="${P.gr}"/>`;
  const fc=['#ff7aa8','#ffd36b','#ffffff','#b99aff'];
  for(let i=0;i<36;i++){const x=R()*400,y=204+R()*40;s+=`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="2.2" fill="${fc[i%4]}" opacity=".9"/>`}
  return s;
 },
 warp(P,id,R,sc){
  let s=`<rect width="400" height="250" fill="#120a2e"/><g class="spin">`;
  for(let i=0;i<12;i++){const a=i*30*Math.PI/180,b=(i*30+15)*Math.PI/180;s+=`<path d="M200 125 L${(200+420*Math.cos(a)).toFixed(0)} ${(125+420*Math.sin(a)).toFixed(0)} L${(200+420*Math.cos(b)).toFixed(0)} ${(125+420*Math.sin(b)).toFixed(0)}Z" fill="${i%2?'#3d1f7a':'#e0486f'}" opacity=".55"/>`}
  s+=`</g><rect width="400" height="250" fill="#fff7c8" class="blinkbg"/><rect y="206" width="400" height="44" fill="#0a0620"/>`;
  return s;
 },
 village(P,id,R,sc){
  const lit=DARK(sc.tm);
  let s=sky(id,P)+orb(sc.tm,P);
  s+=`<path d="M0 148 Q100 120 200 142 T400 136 V250 H0Z" fill="${P.far}"/>`;
  s+=`<path d="M0 172 Q120 148 240 168 T400 162 V250 H0Z" fill="${P.mid}"/>`;
  for(let i=0;i<4;i++){
    const tx=30+i*100+R()*20,ty=166;
    s+=`<path d="M${tx-8} ${ty} Q${tx} ${ty-22} ${tx+8} ${ty}Z" fill="${lit?'#1b2d1c':'#3f7042'}"/>`;
  }
  const huts=[[46,182,32,18],[130,176,28,16],[310,178,34,18],[360,184,30,16]];
  huts.forEach(h=>{
    const hx=h[0],hy=h[1],hw=h[2],hh=h[3];
    s+=`<rect x="${hx}" y="${hy-hh}" width="${hw}" height="${hh}" fill="${lit?'#2a1d18':'#8a5a3a'}"/>`;
    s+=`<path d="M${hx-4} ${hy-hh} Q${hx+hw/2} ${hy-hh-18} ${hx+hw+4} ${hy-hh}Z" fill="${lit?'#3a2a1a':'#c08a4a'}"/>`;
    s+=`<rect x="${hx+hw/2-3}" y="${hy-hh+5}" width="6" height="8" fill="${lit?'#ffcf6b':'#5a3a24'}"${lit?' class="flick"':''}/>`;
  });
  s+=`<path d="M0 200 Q200 188 400 200 V250 H0Z" fill="${P.gr}"/>`;
  s+=`<path d="M60 250 Q160 216 220 206 Q280 202 340 250Z" fill="${lit?'#221a14':'#b88a52'}" opacity=".6"/>`;
  for(let i=0;i<20;i++){const x=R()*400,y=206+R()*40;s+=`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(0.8+R()*1.2).toFixed(1)}" fill="${P.ink}" opacity=".25"/>`}
  return s;
 },
 street(P,id,R,sc){const n=DARK(sc.tm);return `<rect width="400" height="250" fill="${n?'#172337':'#9bb6c5'}"/><path d="M0 150 Q80 130 160 150 T320 145 T400 150 V250 H0Z" fill="${n?'#253447':'#778b91'}"/><rect y="182" width="400" height="68" fill="#3d4145"/><path d="M0 210 H400" stroke="#e7d8a2" stroke-width="3" stroke-dasharray="28 24"/><rect x="24" y="84" width="86" height="98" fill="#6c554b"/><path d="M18 84 L67 52 L116 84Z" fill="#473b38"/><rect x="42" y="104" width="18" height="26" fill="#f3c879"/><rect x="75" y="104" width="18" height="26" fill="#f3c879"/><rect x="285" y="72" width="88" height="110" fill="#5a514b"/><path d="M278 72 L329 40 L380 72Z" fill="#403a37"/><rect x="305" y="95" width="20" height="28" fill="#e8c58a"/><rect x="340" y="95" width="20" height="28" fill="#e8c58a"/>`;},
 apartment(P,id,R,sc){return `<rect width="400" height="250" fill="#b9a69a"/><rect y="190" width="400" height="60" fill="#725b4b"/><rect x="24" y="34" width="110" height="95" fill="#9dc3d7" stroke="#614a3b" stroke-width="6"/><path d="M79 34 V129 M24 81 H134" stroke="#614a3b" stroke-width="3"/><rect x="168" y="140" width="130" height="46" rx="7" fill="#775b65"/><rect x="178" y="124" width="48" height="25" rx="6" fill="#a77f88"/><rect x="235" y="124" width="48" height="25" rx="6" fill="#a77f88"/><rect x="326" y="58" width="48" height="132" fill="#5c4030"/><circle cx="361" cy="128" r="3" fill="#e4c16c"/>`;},
 workshop(P,id,R,sc){return `<rect width="400" height="250" fill="#625d59"/><rect y="190" width="400" height="60" fill="#423c38"/><rect x="24" y="38" width="110" height="92" fill="#253b4b" stroke="#302b28" stroke-width="6"/><path d="M79 38 V130 M24 84 H134" stroke="#302b28" stroke-width="3"/><rect x="205" y="126" width="150" height="12" fill="#6b4630"/><rect x="216" y="138" width="8" height="54" fill="#35291f"/><rect x="337" y="138" width="8" height="54" fill="#35291f"/><path d="M232 120 L260 82 L288 120" stroke="#a98a5b" stroke-width="5" fill="none"/><circle cx="260" cy="82" r="6" fill="#d7b36a"/>`;},
 clinic(P,id,R,sc){return `<rect width="400" height="250" fill="#dce8e7"/><rect y="190" width="400" height="60" fill="#9aa9a7"/><rect x="40" y="32" width="320" height="42" rx="5" fill="#f7fbf8"/><rect x="176" y="38" width="48" height="30" fill="#4c9b83"/><path d="M200 43 V63 M190 53 H210" stroke="#fff" stroke-width="6"/><rect x="42" y="94" width="95" height="80" fill="#b7d7e1" stroke="#fff" stroke-width="5"/><rect x="270" y="90" width="80" height="100" fill="#f8fbfa" stroke="#9caeaa" stroke-width="4"/><rect x="290" y="116" width="40" height="10" fill="#74a99b"/>`;},
 floodedRoad(P,id,R,sc){return `<rect width="400" height="250" fill="#202c3e"/><path d="M0 0 H400 V125 Q300 110 200 132 T0 125Z" fill="#374b62"/><path d="M0 132 Q70 110 140 134 T280 130 T400 138 V250 H0Z" fill="#32647a"/><path d="M0 160 Q60 145 120 160 T240 158 T400 164 M0 198 Q70 182 140 198 T280 196 T400 202" stroke="#9ed0dc" stroke-width="3" fill="none" opacity=".65"/><path d="M0 126 L400 126" stroke="#7c858b" stroke-width="8"/><rect x="260" y="95" width="12" height="55" fill="#6b4a36" transform="rotate(28 266 122)"/><path d="M250 98 L295 120" stroke="#d5b66a" stroke-width="7"/>`;},
 servicePath(P,id,R,sc){return `<rect width="400" height="250" fill="#152431"/><path d="M0 0 H400 V250 H0Z" fill="#1e3b35"/><path d="M0 250 Q70 196 130 172 Q210 144 270 180 Q330 202 400 250Z" fill="#9a8965"/><path d="M0 224 Q80 174 150 164 M250 165 Q320 180 400 224" stroke="#c4b48a" stroke-width="3" fill="none"/><g fill="#315d45"><circle cx="42" cy="80" r="48"/><circle cx="112" cy="66" r="40"/><circle cx="332" cy="72" r="55"/><circle cx="390" cy="128" r="44"/></g><path d="M44 0 V180 M110 0 V156 M334 0 V180 M390 0 V200" stroke="#493c2d" stroke-width="10"/>`;},
 restroom(P,id,R,sc){return `<rect width="400" height="250" fill="#cbd0d2"/><path d="M0 0 H400 M0 45 H400 M0 90 H400 M0 135 H400 M0 180 H400" stroke="#a9afb3" stroke-width="2"/><path d="M40 0 V180 M80 0 V180 M120 0 V180 M160 0 V180 M200 0 V180 M240 0 V180 M280 0 V180 M320 0 V180 M360 0 V180" stroke="#b3b8bb" stroke-width="2"/><rect y="180" width="400" height="70" fill="#6b7075"/><rect x="16" y="58" width="82" height="112" fill="#d8dadd" stroke="#71767a" stroke-width="3"/><rect x="28" y="70" width="58" height="76" fill="#bfc3c6"/><rect x="318" y="62" width="52" height="84" rx="3" fill="#f0f1f1"/>`;}
};

/* props: all drawn between the backdrop and the characters unless listed in FG */
function palm(x,y,sc,fl){
  let f='';
  [-165,-130,-95,-60,-25].forEach(a=>{f+=`<path transform="rotate(${a})" d="M0 0 Q20 -14 44 -2 Q22 -6 0 0Z" fill="#2f7a3e"/>`});
  return `<g transform="translate(${x} ${y}) scale(${fl*sc} ${sc})"><path d="M0 0 Q8 -42 -2 -84" stroke="#5a4028" stroke-width="5" fill="none"/><g class="sway" transform="translate(-2 -84)">${f}</g></g>`;
}
function dog(){
  return `<ellipse cx="0" cy="-14" rx="22" ry="9" fill="#050505"/><ellipse cx="24" cy="-23" rx="9" ry="7.5" fill="#050505"/><path d="M30 -24 L41 -21 L30 -17Z" fill="#050505"/><path d="M20 -29 L23 -37 L27 -29Z" fill="#050505"/><path d="M-20 -17 Q-34 -26 -38 -12 Q-30 -18 -20 -11Z" fill="#050505"/><rect x="-17" y="-12" width="5" height="12" fill="#050505"/><rect x="-8" y="-12" width="5" height="12" fill="#050505"/><rect x="8" y="-12" width="5" height="12" fill="#050505"/><rect x="16" y="-12" width="5" height="12" fill="#050505"/><circle cx="27.5" cy="-24.5" r="13" fill="url(#${'\u0000'}hg)" class="pulse"/><circle cx="28" cy="-25" r="2" fill="#ff7a1a"/><circle cx="23.5" cy="-25" r="1.7" fill="#ff7a1a"/>`;
}
function baseSvg(lit){
  const c1=lit?'#f3e8c8':'#3a3550',c2=lit?'#ffd36b':'#2a2640',w=lit?'#ffb02e':'#15121c';
  return `<g transform="translate(252 58)"><g class="float">${lit?`<circle cx="0" cy="-2" r="66" fill="#ffe9a8" opacity=".16" class="flick"/><circle cx="0" cy="-2" r="42" fill="#ffe9a8" opacity=".16" class="flick"/>`:''}<path d="M-34 14 Q-28 40 0 58 Q28 40 34 14Z" fill="${lit?'#6a5a48':'#26222e'}"/><path d="M-40 14 L40 14 L34 8 L-34 8Z" fill="${lit?'#8a7a62':'#322c3c'}"/><rect x="-22" y="-14" width="44" height="22" fill="${c1}"/><rect x="-34" y="-8" width="14" height="16" fill="${c1}"/><rect x="20" y="-8" width="14" height="16" fill="${c1}"/><path d="M-37 -8 L-27 -28 L-17 -8Z" fill="${c2}"/><path d="M17 -8 L27 -28 L37 -8Z" fill="${c2}"/><path d="M-15 -14 L0 -44 L15 -14Z" fill="${c2}"/><rect x="-8" y="-4" width="5" height="9" fill="${w}"/><rect x="3" y="-4" width="5" height="9" fill="${w}"/><rect x="-29" y="-1" width="4" height="7" fill="${w}"/><rect x="25" y="-1" width="4" height="7" fill="${w}"/><line x1="0" y1="-44" x2="0" y2="-54" stroke="${c2}" stroke-width="1.5"/><path d="M0 -54 L10 -51 L0 -48Z" fill="${lit?'#ff7a5a':'#3a3550'}"/></g></g>`;
}
function crystalSvg(id,dim){
  return `<g transform="translate(200 104)"><g class="float">${dim?'':`<circle r="86" fill="url(#${id}cg)" class="pulse"/>`}<path d="M0 -34 L18 -8 L0 34 L-18 -8Z" fill="${dim?'#55536c':'#bff7ef'}"/><path d="M0 -34 L18 -8 L0 -4Z" fill="${dim?'#6b6984':'#ffffff'}" opacity=".85"/><path d="M0 -4 L18 -8 L0 34Z" fill="${dim?'#403e56':'#5fcfc0'}"/>${dim?'<path d="M-4 -26 L2 -10 L-6 4 L3 18" stroke="#14121f" stroke-width="1.6" fill="none"/>':''}</g></g>`;
}
const PROPS={
 base(sc,P,id){return baseSvg(true)},
 basedim(sc,P,id){return baseSvg(false)},
 crystal(sc,P,id){return crystalSvg(id,false)},
 crystaldim(sc,P,id){return crystalSvg(id,true)},
 beam(sc,P,id){return `<defs><linearGradient id="${id}bm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0" stop-opacity="0"/><stop offset=".6" stop-color="#ffe27a" stop-opacity=".55"/><stop offset="1" stop-color="#fff8d0" stop-opacity=".9"/></linearGradient></defs><g class="flick"><rect x="170" y="0" width="60" height="216" fill="url(#${id}bm)"/><rect x="188" y="0" width="24" height="216" fill="#fffbe0" opacity=".35"/><ellipse cx="200" cy="214" rx="62" ry="10" fill="#fff3b0" opacity=".7"/></g>`},
 tower(sc,P,id){return `<g transform="translate(300 0)"><path d="M-26 216 L-16 96 L-10 96 L-8 40 L-3 6 L0 -10 L3 6 L8 40 L10 96 L16 96 L26 216Z" fill="#07040e"/><rect x="-3" y="120" width="6" height="14" fill="#ff2a4a" opacity=".7" class="pulse"/><rect x="-3" y="156" width="6" height="14" fill="#ff2a4a" opacity=".7" class="pulse"/><circle cx="0" cy="44" r="26" fill="#ff2a4a" opacity=".22" class="pulse"/><circle cx="0" cy="44" r="7" fill="#ff3a5a" class="pulse"/></g>`},
 runes(sc,P,id){return `<g class="pulse"><ellipse cx="200" cy="212" rx="96" ry="14" fill="#7be0d0" opacity=".08"/><ellipse cx="200" cy="212" rx="96" ry="14" fill="none" stroke="#7be0d0" stroke-width="2"/><ellipse cx="200" cy="212" rx="66" ry="9" fill="none" stroke="#7be0d0" stroke-width="1.4" stroke-dasharray="4 6"/></g>`},
 village(sc,P,id){const lit=DARK(sc.tm);let s='';[[214,204],[246,208],[278,203]].forEach(h=>{s+=`<rect x="${h[0]}" y="${h[1]-14}" width="24" height="14" fill="${lit?'#2a1d18':'#8a5a3a'}"/><path d="M${h[0]-4} ${h[1]-14} Q${h[0]+12} ${h[1]-32} ${h[0]+28} ${h[1]-14}Z" fill="${lit?'#3a2a1a':'#c08a4a'}"/><rect x="${h[0]+9}" y="${h[1]-9}" width="6" height="9" fill="${lit?'#ffcf6b':'#5a3a24'}"${lit?' class="flick"':''}/>`});return s},
 crown(sc,P,id){
  return `<g transform="translate(200 0)"><circle cx="0" cy="150" r="54" fill="#ffd36b" opacity=".2" class="pulse"/><rect x="-14" y="176" width="28" height="30" fill="#2a2030"/><rect x="-20" y="172" width="40" height="6" fill="#3a2e46"/><path d="M-18 170 L-18 150 L-9 160 L0 142 L9 160 L18 150 L18 170Z" fill="#f0c040" stroke="#b8861f" stroke-width="1.2"/><circle cx="0" cy="146" r="3" fill="#ff7a3a"/><path class="flick" d="M-6 142 q-3 -9 0 -16 q3 6 0 16z" fill="#ffb02e"/></g>`;
 },
 orb(sc,P,id){return `<g transform="translate(200 112)"><circle r="46" fill="#ffd36b" opacity=".18" class="pulse"/><circle r="26" fill="#ffd36b" opacity=".35"/><circle r="12" fill="#fff4c0"/></g>`},
 crystals(sc,P,id){
  const c=(x,y,h,col)=>`<path d="M${x} ${y} l-7 -${(h*.3).toFixed(1)} l7 -${h} l7 ${h} l-7 ${(h*.3).toFixed(1)}Z" fill="${col}" opacity=".9"/>`;
  return `<circle cx="90" cy="190" r="80" fill="#6ad0ff" opacity=".12" class="pulse"/><circle cx="330" cy="190" r="80" fill="#9a8aff" opacity=".12" class="pulse"/>`+c(60,214,50,'#6ad0ff')+c(82,214,34,'#a0e8ff')+c(104,214,44,'#5ab8f0')+c(310,214,46,'#9a8aff')+c(334,214,30,'#c0b4ff')+c(356,214,54,'#8a7af0');
 },
 fire(sc,P,id){
  return `<rect x="50" y="90" width="104" height="8" fill="#5b4535"/><rect x="56" y="98" width="92" height="74" fill="#3b2e27"/><rect x="66" y="110" width="72" height="62" fill="#120c09"/>
  <g class="flick"><path d="M88 168 q-10 -28 4 -40 q2 14 10 18 q4 -16 14 -22 q8 22 -2 44z" fill="#ff8a1f"/><path d="M95 168 q-4 -16 4 -24 q2 10 8 14 q2 -8 6 -12 q4 12 -2 22z" fill="#ffd36b"/></g>
  <circle cx="102" cy="150" r="130" fill="url(#${id}fg)" class="flick"/>`;
 },
 window(sc,P,id){
  const st=DARK(sc.tm)?`<circle cx="318" cy="56" r="7" fill="${P.sun}" opacity=".9"/>`:'';
  return `<rect x="268" y="34" width="78" height="92" fill="${P.b}"/><rect x="268" y="34" width="78" height="46" fill="${P.t}" opacity=".7"/>${st}<rect x="268" y="34" width="78" height="92" fill="none" stroke="#2a1b12" stroke-width="5"/><line x1="307" y1="34" x2="307" y2="126" stroke="#2a1b12" stroke-width="3"/><line x1="268" y1="80" x2="346" y2="80" stroke="#2a1b12" stroke-width="3"/><path d="M256 28 L268 28 L268 140 Q258 120 256 100Z" fill="#6a2a2a"/><path d="M358 28 L346 28 L346 140 Q356 120 358 100Z" fill="#6a2a2a"/>`;
 },
 shelves(sc,P,id,R){
  let s=`<rect x="158" y="26" width="100" height="116" fill="#2a1b12"/>`;
  const col=['#8a2a2a','#2a4a6a','#5a6a2a','#7a5a2a','#4a2a5a','#a07a30'];
  for(let r=0;r<3;r++){let x=162;const y=30+r*37;while(x<252){const w=4+R()*5,h=24+R()*9;s+=`<rect x="${x.toFixed(1)}" y="${(y+34-h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${col[Math.floor(R()*6)]}"/>`;x+=w+.6}s+=`<rect x="158" y="${y+34}" width="100" height="3" fill="#4a3322"/>`}
  return s;
 },
 portrait(sc,P,id){
  return `<rect x="168" y="34" width="60" height="76" fill="#b08a3a"/><rect x="173" y="39" width="50" height="66" fill="#1c1410"/><circle cx="198" cy="64" r="11" fill="#9a7a60"/><path d="M178 104 Q180 80 198 78 Q216 80 218 104Z" fill="#3a3a4a"/>`;
 },
 table(sc,P,id){
  return `<rect x="150" y="172" width="120" height="8" rx="2" fill="#5a3f28"/><rect x="156" y="180" width="6" height="40" fill="#4a3320"/><rect x="258" y="180" width="6" height="40" fill="#4a3320"/><rect x="204" y="158" width="6" height="14" fill="#efe3c8"/><path class="flick" d="M207 148 q-4 6 0 10 q4 -4 0 -10z" fill="#ffb02e"/><circle cx="207" cy="152" r="16" fill="#ffcf6b" opacity=".16" class="flick"/>`;
 },
 door(sc,P,id){
  return `<rect x="16" y="64" width="50" height="108" fill="#3a2518"/><rect x="22" y="70" width="38" height="46" fill="#4a3220"/><rect x="22" y="122" width="38" height="44" fill="#4a3220"/><circle cx="56" cy="124" r="3" fill="#d8b04a"/>`;
 },
 barrels(sc,P,id){
  const b=(x,y)=>`<rect x="${x}" y="${y}" width="40" height="52" rx="12" fill="#6a4426"/><rect x="${x}" y="${y+10}" width="40" height="4" fill="#2a1a0e"/><rect x="${x}" y="${y+36}" width="40" height="4" fill="#2a1a0e"/>`;
  return b(330,160)+b(356,184);
 },
 machine(sc,P,id){
  let rods='';[-30,-2,26].forEach(x=>rods+=`<rect class="pulse" x="${x}" y="156" width="5" height="40" rx="2.5" fill="#9ff3e6"/>`);
  return `<g transform="translate(210 0)"><circle cx="0" cy="170" r="70" fill="#9ff3e6" opacity=".07" class="pulse"/><rect x="-52" y="196" width="104" height="9" rx="2" fill="#b98a2f"/><rect x="-46" y="205" width="92" height="5" fill="#6b4a14"/><rect x="-44" y="150" width="4" height="48" fill="#c79b3b"/><rect x="40" y="150" width="4" height="48" fill="#c79b3b"/>${rods}<path d="M-22 188 Q-22 174 -8 174 L8 174 Q22 174 22 188Z" fill="#7a2f2a"/><g transform="translate(0 150)"><g class="spinx"><circle r="14" fill="#2a1e10" stroke="#e0b24a" stroke-width="2"/><line x1="-12" y1="0" x2="12" y2="0" stroke="#e0b24a" stroke-width="2"/><line x1="0" y1="-12" x2="0" y2="12" stroke="#e0b24a" stroke-width="2"/></g></g></g>`;
 },
 chest(sc,P,id){
  let g='';for(let i=0;i<14;i++)g+=`<circle cx="${(-26+i*4.2).toFixed(1)}" cy="${(-29-(i%3)*2).toFixed(1)}" r="3.4" fill="${i%2?'#f6cf55':'#e8b52e'}"/>`;
  return `<g transform="translate(300 214)"><circle cx="0" cy="-30" r="56" fill="#ffd36b" opacity=".22" class="flick"/><path d="M-34 -24 L-26 -48 L26 -48 L34 -24Z" fill="#7d4f28"/><rect x="-34" y="-24" width="68" height="24" rx="3" fill="#6b4220"/><rect x="-34" y="-24" width="68" height="5" fill="#3d2410"/><ellipse cx="0" cy="-27" rx="30" ry="7" fill="#f0c040"/>${g}<rect x="-6" y="-14" width="12" height="9" fill="#d8b04a"/></g>`;
 },
 torch(sc,P,id){
  return `<circle cx="60" cy="92" r="100" fill="url(#${id}fg)" class="flick"/><rect x="58" y="96" width="5" height="28" fill="#4a3018"/><g class="flick" transform="translate(60.5 96)"><path d="M0 0 q-9 -10 0 -26 q9 16 0 26z" fill="#ffb02e"/><path d="M0 0 q-4 -6 0 -14 q4 8 0 14z" fill="#fff0a0"/></g>`;
 },
 eyes(sc,P,id,R){
  let s='';for(let i=0;i<7;i++){const x=40+R()*320,y=118+R()*70;s+=`<ellipse cx="${x.toFixed(0)}" cy="${(y+8).toFixed(0)}" rx="9" ry="13" fill="#cfd4d8" opacity=".1"/><g class="eye"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.9" fill="#ffe36b"/><circle cx="${(x+7).toFixed(1)}" cy="${y.toFixed(1)}" r="1.9" fill="#ffe36b"/></g>`}
  return s;
 },
 manor(sc,P,id,R){
  const lit=DARK(sc.tm),wc=lit?'#ffcf6b':P.b;let w='';
  [[10,24],[26,24],[42,24],[58,24],[-2,10],[76,10]].forEach((p,i)=>{w+=`<rect x="${p[0]}" y="${p[1]}" width="5" height="7" fill="${wc}" opacity="${lit?(i%2?.95:.6):.4}"${lit?' class="flick"':''}/>`});
  return `<g transform="translate(50 128)"><rect x="0" y="12" width="82" height="34" fill="${P.ink}"/><rect x="-8" y="0" width="16" height="46" fill="${P.ink}"/><path d="M-10 0 L0 -12 L10 0Z" fill="${P.ink}"/><rect x="74" y="0" width="16" height="46" fill="${P.ink}"/><path d="M72 0 L82 -12 L92 0Z" fill="${P.ink}"/><rect x="30" y="2" width="5" height="12" fill="${P.ink}"/><rect x="50" y="4" width="5" height="10" fill="${P.ink}"/>${w}</g>`;
 },
 hound(sc,P,id){
  return `<g transform="translate(314 131) scale(.62)">${dog().replace('\u0000',id)}</g>`;
 },
 houndbig(sc,P,id){
  return `<g transform="translate(40 218) scale(2.6)"><g class="mv" style="--dx:40px">${dog().replace('\u0000',id)}</g></g>`;
 },
 stranger(sc,P,id){
  return `<g transform="translate(314 131)"><circle cx="0" cy="-27" r="3.4" fill="#04060e"/><path d="M-5 0 L-4 -22 Q0 -25 4 -22 L5 0Z" fill="#04060e"/><path d="M-5 -22 L-11 -8" stroke="#04060e" stroke-width="2"/></g>`;
 },
 sphinx(sc,P,id){
  return `<g transform="translate(0 0)"><rect x="236" y="176" width="150" height="30" fill="#ddd2d0"/><ellipse cx="312" cy="156" rx="62" ry="26" fill="#efe6e1"/><path d="M290 140 Q252 98 216 120 Q252 124 284 164Z" fill="#e2d6d4"/><rect x="352" y="112" width="26" height="46" rx="8" fill="#efe6e1"/><circle cx="366" cy="124" r="15" fill="#f4ece7"/><path d="M350 118 L384 118 L388 150 L376 138Z" fill="#c9bcba"/><rect x="298" y="178" width="28" height="28" fill="#6b4a22"/><line x1="312" y1="178" x2="312" y2="206" stroke="#3a2610" stroke-width="2"/></g>`;
 },
 ship(sc,P,id){
  return `<g class="sail"><path d="M118 30 Q200 50 282 30 L274 128 Q200 146 126 128Z" fill="#efe3c8" stroke="#c9b88f" stroke-width="2"/></g><rect x="196" y="16" width="8" height="190" fill="#3a2616"/><line x1="200" y1="20" x2="40" y2="200" stroke="#2a1a0e" stroke-width="1.2"/><line x1="200" y1="20" x2="360" y2="200" stroke="#2a1a0e" stroke-width="1.2"/><rect y="188" width="400" height="5" fill="#3a2616"/>${[20,80,140,260,320,380].map(x=>`<rect x="${x}" y="188" width="5" height="20" fill="#3a2616"/>`).join('')}<rect y="206" width="400" height="44" fill="#4a2f1c"/><line y1="222" x1="0" y2="222" x2="400" stroke="#2a1a0e" stroke-width="1.5"/><line y1="236" x1="0" y2="236" x2="400" stroke="#2a1a0e" stroke-width="1.5"/>`;
 },
 shipfar(sc,P,id){
  return `<g transform="translate(262 132)"><path d="M-22 0 L22 0 L16 8 L-16 8Z" fill="${P.ink}"/><rect x="-1" y="-30" width="2" height="30" fill="${P.ink}"/><path d="M-14 -26 L14 -26 L12 -6 L-12 -6Z" fill="${P.ink}" opacity=".85"/></g>`;
 },
 palms(sc,P,id){return palm(54,214,1.15,1)+palm(352,218,1.3,-1)},
 flag(sc,P,id){return `<line x1="206" y1="84" x2="206" y2="58" stroke="${P.ink}" stroke-width="1.6"/><path d="M206 58 L226 62 L206 68Z" fill="#0a0a0a"/><circle cx="213" cy="62.4" r="1.4" fill="#fff"/>`},
 scanner(sc,P,id){return `<g transform="translate(195 190)"><rect x="-17" y="-16" width="34" height="25" rx="4" fill="#e8eef0" stroke="#53616b" stroke-width="2"/><rect x="-11" y="-11" width="22" height="11" rx="2" fill="#83b7ca"/><path d="M-12 9 Q0 18 12 9" fill="none" stroke="#53616b" stroke-width="3"/></g>`},
 car(sc,P,id){return `<g transform="translate(292 178)"><path d="M-62 12 Q-54 -10 -30 -14 L28 -14 Q52 -10 62 12Z" fill="#7c1f2a"/><path d="M-30 -13 L-17 -34 L21 -34 L36 -13Z" fill="#b8d6e8"/><circle cx="-35" cy="13" r="11" fill="#17191c"/><circle cx="37" cy="13" r="11" fill="#17191c"/></g>`},
 boxes(sc,P,id){return `<g><rect x="35" y="164" width="38" height="36" fill="#a87945" stroke="#5f3e23" stroke-width="2"/><path d="M54 164 V200 M35 178 H73" stroke="#6b4728" stroke-width="2"/><rect x="79" y="180" width="34" height="24" fill="#bc8c50" stroke="#6b4728" stroke-width="2"/></g>`},
 briefcase(sc,P,id){return `<g transform="translate(200 192)"><rect x="-22" y="-16" width="44" height="30" rx="3" fill="#3b2b24"/><path d="M-9 -16 V-22 Q0 -26 9 -22 V-16" fill="none" stroke="#3b2b24" stroke-width="3"/><rect x="-22" y="-5" width="44" height="3" fill="#b28a45"/></g>`},
 papers(sc,P,id){return `<g transform="translate(200 188) rotate(-5)"><rect x="-24" y="-15" width="42" height="29" fill="#f5f0df"/><path d="M-17 -7 H12 M-17 0 H14 M-17 7 H7" stroke="#8d8b83" stroke-width="1.4"/></g>`},
 phone(sc,P,id){return `<g transform="translate(199 190)"><rect x="-7" y="-14" width="14" height="25" rx="3" fill="#242a31"/><rect x="-5" y="-11" width="10" height="17" fill="#8db4c7"/></g>`},
 medbox(sc,P,id){return `<g transform="translate(198 188)"><rect x="-13" y="-12" width="26" height="22" rx="2" fill="#f7f5e9" stroke="#76928b" stroke-width="1.5"/><path d="M0 -8 V6 M-7 -1 H7" stroke="#d34f52" stroke-width="3"/></g>`},
 bridgeSign(sc,P,id){return `<g transform="translate(300 116) rotate(18)"><rect x="-3" y="-28" width="6" height="70" fill="#62472e"/><rect x="-34" y="-32" width="68" height="26" rx="2" fill="#d5b45f" stroke="#59472f" stroke-width="2"/><path d="M-22 -19 H22" stroke="#493a28" stroke-width="3"/></g>`},
 map(sc,P,id){return `<g transform="translate(198 158)"><rect x="-40" y="-20" width="80" height="44" fill="#e8dfc4" stroke="#7a674b" stroke-width="2"/><path d="M-30 10 L-10 -8 L8 5 L29 -12" stroke="#6b986c" stroke-width="3" fill="none"/><path d="M-28 -13 L28 14" stroke="#c58c58" stroke-width="2" fill="none"/></g>`},
 bike(sc,P,id){return `<g transform="translate(160 181)" stroke="#27343b" stroke-width="3" fill="none"><circle cx="-30" cy="10" r="20"/><circle cx="34" cy="10" r="20"/><path d="M-30 10 L-7 -20 L10 10 L-30 10 M-7 -20 L34 10 L10 10 M-13 -24 H0 M-7 -20 L-10 -30"/></g>`}}
const FG=['houndbig'];
const OUTDOOR=['moor','sea','island','village'];

function fxMarkup(sc,id,R){
  let s='';const f=sc.fx||[];
  if(f.includes('stars')||(sc.tm==='night'&&OUTDOOR.includes(sc.p)&&!f.includes('rain'))){
    for(let i=0;i<38;i++)s+=`<circle class="twk" style="--t:${(2+R()*3).toFixed(1)}s;--d:${(R()*3).toFixed(1)}s" cx="${(R()*400).toFixed(0)}" cy="${(R()*110).toFixed(0)}" r="${(.6+R()*.9).toFixed(1)}" fill="#fff"/>`;
  }
  if(f.includes('fog')){
    s+=`<g class="fogg" fill="#dfe6ee"><ellipse cx="90" cy="190" rx="200" ry="26" opacity=".2"/><ellipse cx="300" cy="170" rx="210" ry="30" opacity=".18"/><ellipse cx="180" cy="215" rx="260" ry="30" opacity=".22"/><ellipse cx="330" cy="140" rx="160" ry="20" opacity=".12"/></g>`;
  }
  if(f.includes('rain')){
    let l='';for(let i=0;i<54;i++){const x=R()*430,y=-60+R()*320;l+=`<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x-3).toFixed(0)}" y2="${(y+14).toFixed(0)}"/>`}
    s+=`<g class="rain" stroke="#cfe3ff" stroke-width="1" opacity=".5">${l}</g>`;
  }
  if(f.includes('flash'))s+=`<rect class="lightn" width="400" height="250" fill="#eaf2ff" opacity="0"/>`;
  if(f.includes('embers')){for(let i=0;i<14;i++)s+=`<circle class="ember" style="--t:${(3+R()*3).toFixed(1)}s;--d:${(R()*4).toFixed(1)}s" cx="${(30+R()*340).toFixed(0)}" cy="${(190+R()*50).toFixed(0)}" r="1.6" fill="#ffb347"/>`}
  if(f.includes('glitter')){for(let i=0;i<26;i++)s+=`<circle class="twk" style="--t:${(1+R()*1.6).toFixed(1)}s;--d:${(R()*2).toFixed(1)}s" cx="${(240+R()*120).toFixed(0)}" cy="${(150+R()*60).toFixed(0)}" r="1.5" fill="#fff6c0"/>`}
  if(f.includes('magic')){const mc=['#ffd36b','#9ff3e6','#c79aff'];for(let i=0;i<24;i++)s+=`<circle class="ember" style="--t:${(3+R()*3).toFixed(1)}s;--d:${(R()*4).toFixed(1)}s" cx="${(20+R()*360).toFixed(0)}" cy="${(120+R()*120).toFixed(0)}" r="${(1.2+R()*1.4).toFixed(1)}" fill="${mc[i%3]}"/>`}
  if(f.includes('burst'))s+=`<circle class="burst" cx="200" cy="140" r="14" fill="none" stroke="#fff2b0" stroke-width="3"/><circle class="burst" style="animation-delay:.6s" cx="200" cy="140" r="14" fill="none" stroke="#ffd36b" stroke-width="2"/><rect class="lightn" width="400" height="250" fill="#fff4c0" opacity="0"/>`;
  if(f.includes('gloom'))s+=`<g class="fogg" fill="#7a3a9a"><ellipse cx="120" cy="206" rx="220" ry="24" opacity=".22"/><ellipse cx="320" cy="190" rx="200" ry="22" opacity=".2"/></g>`;
  if(f.includes('shadow')){s+=`<g class="fogg" fill="#12061f"><ellipse cx="80" cy="24" rx="150" ry="42" opacity=".78"/><ellipse cx="310" cy="14" rx="170" ry="48" opacity=".82"/><ellipse cx="200" cy="62" rx="230" ry="30" opacity=".5"/><ellipse cx="360" cy="110" rx="120" ry="24" opacity=".3"/></g>`}
  if(f.includes('candles')){for(let i=0;i<34;i++)s+=`<circle class="twk" style="--t:${(1+R()*1.5).toFixed(1)}s;--d:${(R()*2).toFixed(1)}s" cx="${(R()*400).toFixed(0)}" cy="${(190+R()*55).toFixed(0)}" r="2" fill="#ffcf6b"/>`}
  if(f.includes('birds')){for(let i=0;i<3;i++)s+=`<path class="bird" style="--t:${(12+i*3)}s;--d:${(-i*4)}s" d="M0 ${60+i*14} q6 -6 12 0 q6 -6 12 0" stroke="#1a1a22" stroke-width="1.4" fill="none" opacity=".7"/>`}
  return s;
}

/* ---------- scene renderer ---------- */
let uid=0;
function parseC(list){
  return (list||[]).map(t=>{
    const p=t.split(':'),pos=String(p[1]||'200').split('>');
    return {k:p[0],x:+pos[0],x2:pos[1]!=null?+pos[1]:null,pose:p[2]||''};
  });
}
function sceneSvg(sc,cast,opts){
  opts=opts||{};
  const id='s'+(++uid),R=rng(hash(sc.p+sc.tm+(sc.pr||[]).join(',')));
  const P=SKY[sc.tm]||SKY.day,pr=sc.pr||[];
  const defs=`<defs><radialGradient id="${id}fg"><stop offset="0" stop-color="#ff9a2e" stop-opacity=".5"/><stop offset="1" stop-color="#ff9a2e" stop-opacity="0"/></radialGradient><radialGradient id="${id}hg"><stop offset="0" stop-color="#ff6a1a" stop-opacity=".9"/><stop offset="1" stop-color="#ff6a1a" stop-opacity="0"/></radialGradient><radialGradient id="${id}cg"><stop offset="0" stop-color="#9ff3e6" stop-opacity=".7"/><stop offset="1" stop-color="#9ff3e6" stop-opacity="0"/></radialGradient><radialGradient id="${id}vg" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient></defs>`;
  let s=defs+(PLACES[sc.p]||PLACES.room)(P,id,R,sc);
  pr.filter(k=>FG.indexOf(k)<0).forEach(k=>{if(PROPS[k])s+=PROPS[k](sc,P,id,R)});
  if(sc.p==='future'&&sc.tm!=='future'&&sc.tm!=='day'){s+=`<rect width="400" height="250" fill="${sc.tm==='night'?'#0a0820':'#1a1040'}" opacity="${sc.tm==='night'?.55:.3}"/>`}
  const gy=GY[sc.p]+(pr.indexOf('ship')>=0?8:0);
  parseC(sc.c).forEach(ch=>{
    const c=cast[ch.k];if(!c)return;
    const mv=ch.x2!=null&&ch.x2!==ch.x;
    const dir=mv?(ch.x2>ch.x?1:-1):(ch.x>200?-1:1);
    const sz=1.18*(c.sc||1);
    const pose=ch.pose||(mv?'walk':'');
    const body=fig(c,{pose:pose,talk:sc.s===ch.k&&!opts.still});
    const inner=`<g transform="scale(${(dir*sz).toFixed(3)} ${sz.toFixed(3)})">${body}</g>`;
    s+=`<g transform="translate(${ch.x} ${gy})">${mv?`<g class="mv" style="--dx:${ch.x2-ch.x}px">${inner}</g>`:inner}</g>`;
  });
  pr.filter(k=>FG.indexOf(k)>=0).forEach(k=>{s+=PROPS[k](sc,P,id,R)});
  s+=fxMarkup(sc,id,R);
  s+=`<rect width="400" height="250" fill="url(#${id}vg)"/>`;
  return `<svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Scene illustration"><g class="cam ${sc.cam||'in'}">${s}</g></svg>`;
}


/* Names the engine understands. Keep in sync with src/movies/vocabulary.json. */
const VOCAB={
  places:Object.keys(PLACES),
  times:Object.keys(SKY),
  props:Object.keys(PROPS),
  fx:['birds','burst','candles','embers','flash','fog','glitter','gloom','magic','rain','shadow','stars'],
  poses:['crouch','shock','run','point','walk','wave','cheer','think','laugh','angry','bow'],
  cameras:['in','out','l','r'],
  hats:Object.keys(HATS),
  extras:Object.keys(EXTRA)
};

export{sceneSvg,fig as figSvg,VOCAB};
