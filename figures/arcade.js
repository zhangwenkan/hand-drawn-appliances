
/* ============================================================
   Fig. 05 — Arcade cabinet.
   Body = side profile in the (x,z) plane, extruded along y:
   right cheek (y 0..T) · centre body (y T..D-T) · left cheek (y D-T..D).
   The centre body uses a profile with the screen recessed, so the
   cheeks frame an alcove around the tilted CRT.
   ============================================================ */
const W = 75, D = 65, H = 180, T = 2.5, XF = 56;      // XF = lower front plane
// outer silhouette (cheeks), CCW in (x,z)
const OUTER = [[0,0],[XF,0],[XF,86],[75,93],[75,99],[59,106],[58,108],[57,152],[60,154],[60,176],[56,180],[0,180]];
// centre body: same, but the screen sits back in an alcove
const INNER = [[0,0],[XF,0],[XF,86],[75,93],[75,99],[59,106],[55,108],[48,146],[60,154],[60,176],[56,180],[0,180]];
const I_FRONT = 1, I_PANEL = 4, I_SCREEN = 6, I_MARQ = 8;

/* ---------- planes: tilted screen and control panel ---------- */
const S0 = [55,108], ST = norm([-7,0,38]), SN = norm([38,0,7]);          // screen: bottom edge, up-slope, normal
const S3 = (u,v,o=0) => [S0[0]+v*ST[0]+o*SN[0], u, S0[1]+v*ST[2]+o*SN[2]];  // u = y, v = distance up the glass
const K0 = [75,99], KT = norm([-16,0,7]), KN = norm([7,0,16]);           // panel: front lip, back-slope, normal
const K3 = (u,s,o=0) => [K0[0]+s*KT[0]+o*KN[0], u, K0[1]+s*KT[2]+o*KN[2]];
const onS = (uv,o=0) => uv.map(([u,v]) => S3(u,v,o));
const onK = (uv,o=0) => uv.map(([u,s]) => K3(u,s,o));
// text lying in any plane: U = reading direction, V = "down" on the page (both 3D, turn-aware via Dv)
const txPl = (p,U,V,str,size,col,weight=700,ls='.04em') =>
  `<text transform="${txM(P(...p), Dv(...U), Dv(...V))}" font-size="${size}" fill="${col}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="${weight}" letter-spacing="${ls}">${str}</text>`;
// text lying in a tilted plane whose "up" is dir t (unit, in xz); reads along -y like the front
const txT = (p,t,str,size,col,weight=700,ls='.04em') => txPl(p, [0,-1,0], [-t[0],0,-t[2]], str, size, col, weight, ls);
// text on the back face (x = const), reading along +y as seen from behind
const txB = (y,z,str,size,col=INK,weight=800,x=-.45) => txPl([x,y,z], [0,1,0], [0,0,-1], str, size, col, weight);

/* ---------- extrusion of an (x,z) profile along y ---------- */
function strips(prof, y0, y1){
  return prof.map(([xa,za],i) => { const [xb,zb] = prof[(i+1)%prof.length];
    return { i, n: norm([zb-za,0,-(xb-xa)]), pts: [[xa,y0,za],[xb,y0,zb],[xb,y1,zb],[xa,y1,za]] }; });
}

/* ---------- the game on the CRT ---------- */
const GW = 32, GH = 21, GL = 53, GB = 4.2, CS = 43/GW;                 // grid, left edge (u), bottom (v), cell size
const GLASS = rrUV(GL-GW*CS-1.2, GB-1.2, GL+1.2, GB+GH*CS+1.2, 3);       // (u,v): u runs right→left on screen
const SPR = {
  ship: ['..#..','.###.','#####'],
  inv0: ['.###.','#.#.#','#####','#...#'],
  inv1: ['.###.','#.#.#','#####','.#.#.'],
  boom: ['#.#.#','.#.#.','#.#.#'],
  mini: ['.#.','###'],
};
const SCR = { bg:'#16201f', fg:'#8af0ae', dim:'#2f5a45', inv:'#ff8fb1', inv2:'#ffd166', shot:'#ffffff', boom:'#ffb347' };
const cellQuad = (i,j,k=.08) => { const u0 = GL-i*CS-k, u1 = GL-(i+1)*CS+k, v0 = GB+j*CS+k, v1 = GB+(j+1)*CS-k;
  return pd([S3(u0,v0,.15),S3(u1,v0,.15),S3(u1,v1,.15),S3(u0,v1,.15)]); };
function sprite(buf, rows, ci, jTop, col){
  const w = rows[0].length, i0 = Math.round(ci) - (w>>1);
  rows.forEach((r,ri) => { for (let c=0;c<w;c++) if (r[c]==='#'){ const i=i0+c, j=Math.round(jTop)-ri; if (i>=0&&i<GW&&j>=0&&j<GH) buf[col]=(buf[col]||'')+cellQuad(i,j); } });
}
// screen text: centred at cell column ci, baseline row j, size in cells
const stx = (ci,j,str,size,col=SCR.fg,anchor='middle') => txT(S3(GL-ci*CS, GB+j*CS, .2), ST, str, (size*CS).toFixed(2), col, 800, '.08em').replace('text-anchor="middle"', `text-anchor="${anchor}"`);
const pad = (n,k=4) => String(n).padStart(k,'0');

function crtSVG(st){
  const buf = {}, t = st.t; let txt = '';
  const blink = Math.floor(t*1.8) % 2 === 0;
  // a few twinkling stars in every mode
  for (let k=0;k<14;k++){ const i = (k*13+5)%GW, j = (k*7+3)%(GH-3)+1; if (((k*5 + Math.floor(t*2.5)) % 7) < 4) buf[SCR.dim] = (buf[SCR.dim]||'') + cellQuad(i,j,.32); }
  if (st.mode === 'play'){
    const g = st.g;
    for (let i=0;i<GW;i++) buf[SCR.dim] += cellQuad(i,0,.1);                                // ground
    for (const e of g.en) sprite(buf, Math.floor(t*3+e.x)%2 ? SPR.inv1 : SPR.inv0, e.x, Math.round(e.y)+3, e.c);
    for (const b of g.sh) { buf[SCR.shot] = (buf[SCR.shot]||'') + cellQuad(b.x, Math.round(b.y), .25) + cellQuad(b.x, Math.round(b.y)+1, .25); }
    for (const b of g.boom) sprite(buf, SPR.boom, b.x, Math.round(b.y)+2, SCR.boom);
    if (!(g.hitT > 0 && Math.floor(g.hitT*10)%2)) sprite(buf, SPR.ship, g.sx, 3, SCR.fg);
    txt += stx(.4, GH-1.25, 'SCORE '+pad(g.score), 1.25, '#ffffff', 'start') + stx(GW-.4, GH-1.25, 'HI '+pad(Math.max(st.hi,g.score)), 1.25, SCR.fg, 'end');
    for (let k=0;k<g.lives;k++) sprite(buf, SPR.mini, GW-2-k*4, 2, SCR.fg);
  } else if (st.mode === 'over'){
    txt += stx(GW/2, 12, 'GAME OVER', 2.6, SCR.inv) + stx(GW/2, 8, 'SCORE '+pad(st.g.score), 1.5, '#ffffff');
    if (st.g.score >= st.hi && st.g.score > 0) txt += stx(GW/2, 5, 'NEW HI-SCORE!', 1.3, SCR.inv2);
  } else {
    // attract: title, marching invaders, blinking prompt
    txt += stx(GW/2, GH-5.6, 'STAR BLASTER', 2.3, SCR.inv2);
    const off = Math.round(Math.sin(t*1.6)*4), fr = Math.floor(t*3)%2 ? SPR.inv1 : SPR.inv0;
    for (let k=0;k<4;k++) sprite(buf, fr, 7+k*6+off, 12, k%2 ? SCR.inv : SCR.inv2);
    sprite(buf, SPR.ship, GW/2 + Math.round(Math.sin(t*1.1+1)*12), 2, SCR.fg);
    if (st.mode === 'ready'){ if (blink) txt += stx(GW/2, 5.4, 'PUSH 1P START', 1.8, '#ffffff'); }
    else if (blink) txt += stx(GW/2, 5.4, 'INSERT COIN', 2.1, '#ffffff');
    txt += stx(GW-.4, GH-1.25, 'CREDIT '+st.credits, 1.25, SCR.fg, 'end') + stx(.4, GH-1.25, 'HI '+pad(st.hi), 1.25, '#ffffff', 'start');
  }
  let s = '';
  for (const [c,d] of Object.entries(buf)) if (d) s += `<path d="${d}" fill="${c}"/>`;
  return s + txt;
}

/* ---------- props ---------- */
const COIN = { l:'#f0d27a', m:'#d2ad4a', d:'#9a7a2a' };
const BTN = { red:'#e2483d', yellow:'#f2c230', blue:'#3e86d9' };
const BTNS = [ { k:'red', u:30.5, s:7.6, r:3 }, { k:'yellow', u:22.5, s:8.8, r:3 }, { k:'blue', u:14.5, s:10, r:3 } ];
const STICK = { u:50, s:8.4 }, START = { u:39.5, s:4 };
const ringK = (u,s,r,o,n=22) => Array.from({length:n}, (_,i) => { const a=i/n*2*Math.PI; return K3(u+r*Math.cos(a), s+r*Math.sin(a), o); });
function panelButton(u,s,r,col,down,label){
  const m = matOf(col), h = down ? .5 : 1.7;
  const collar = ringK(u,s,r+.9,.05), A = ringK(u,s,r,.05), B = ringK(u,s,r,h);
  let o = shape(collar, '#171412', 1) + loft(A,B,n=>toneI(n,m)) + fill(pd(B), m.l) + hullInk([...A,...B],1.1) + ink(pd(B),.8);
  o += fill(pd(onK(ellUV(u+r*.3,s+r*.25,r*.42,r*.28,12),h+.02)), '#ffffff', 'opacity=".55"');
  if (label) o += txT(K3(u, s-r-3.4, .05), KT, label, 2.3, '#f3eee0', 800);
  return o;
}
function startButton(u,s,label,down){
  const h = down ? .3 : 1, A = onK(rrUV(u-2,s-1.6,u+2,s+1.6,.8), .05), B = onK(rrUV(u-2,s-1.6,u+2,s+1.6,.8), h);
  return shape(onK(rrUV(u-2.8,s-2.4,u+2.8,s+2.4,1),.04), '#171412', .9) + loft(A,B,n=>toneI(n,CERAMIC)) + fill(pd(B), CERAMIC.l) + hullInk([...A,...B],1) + ink(pd(B),.7)
    + txT(K3(u, s-.6, h+.05), KT, label, 2, INK, 800);
}
function joystick(st){
  const dir = stickDir(st), th = dir * 26 * Math.PI/180;
  const b = K3(STICK.u, STICK.s, .1), L = 11.5;   // stick stands upright; left (dir -1) leans toward +y, the player's left
  const c = [b[0], b[1] - L*Math.sin(th), b[2] + L*Math.cos(th)];
  const pb = P(...b), pc = P(...c), R = 2.9 * 1.2247;
  let s = shape(ringK(STICK.u, STICK.s, 3.6, .04), '#171412', 1) + shape(ringK(STICK.u, STICK.s, 1.9, .3), METAL.m, .8);
  s += `<path d="M${f(pb[0])} ${f(pb[1])}L${f(pc[0])} ${f(pc[1])}" stroke="${INK}" stroke-width="3.1" stroke-linecap="round"/>`
     + `<path d="M${f(pb[0])} ${f(pb[1])}L${f(pc[0])} ${f(pc[1])}" stroke="${METAL.l}" stroke-width="1.3" stroke-linecap="round"/>`;
  s += `<circle cx="${f(pc[0])}" cy="${f(pc[1])}" r="${f(R)}" fill="${BTN.red}" stroke="${INK}" stroke-width="1.2"/>`
     + `<path d="M${f(pc[0]-R*.62)} ${f(pc[1]+R*.15)}A${f(R*.8)} ${f(R*.8)} 0 0 0 ${f(pc[0]+R*.55)} ${f(pc[1]+R*.62)}" fill="none" stroke="#8f2a22" stroke-width="1.1" stroke-linecap="round" opacity=".7"/>`
     + `<ellipse cx="${f(pc[0]-R*.3)}" cy="${f(pc[1]-R*.38)}" rx="${f(R*.3)}" ry="${f(R*.2)}" fill="#fff" opacity=".7" transform="rotate(-25 ${f(pc[0]-R*.3)} ${f(pc[1]-R*.38)})"/>`;
  // hit zones: left / right halves around the stick, in screen space
  const mx = pb[0], top = pc[1]-R-4, bot = pb[1]+5;
  s += `<path data-act="stickL" d="${sp([[mx-13,top],[mx,top],[mx,bot],[mx-13,bot]])}" fill="transparent"/>`
     + `<path data-act="stickR" d="${sp([[mx,top],[mx+13,top],[mx+13,bot],[mx,bot]])}" fill="transparent"/>`;
  return s;
}
// a coin seen edge-on (disc in a y = const plane), clipped where it enters the slot (x < XF)
function coinDisc(x,y,z,r){
  let pts = ellUV(x,z,r,r,20), o = [];
  for (let i=0;i<pts.length;i++){ const a=pts[i], b=pts[(i+1)%pts.length], ia = a[0]>=XF+.3, ib = b[0]>=XF+.3;
    if (ia) o.push(a); if (ia!==ib){ const k=(XF+.3-a[0])/(b[0]-a[0]); o.push([XF+.3, a[1]+k*(b[1]-a[1])]); } }
  if (o.length < 3) return '';
  const inner = ellUV(x,z,r*.62,r*.62,14).filter(p => p[0] >= XF+.3);
  return shape(on(PY(y),o), COIN.l, 1) + (inner.length >= 3 ? shape(on(PY(y+.1),inner), COIN.m, .5) : '');
}

/* ---------- scene ---------- */
/* Painter's order across views. The body is one (x,z) profile swept along y, so:
   - the y-sections go far cheek → centre → near cheek (the +y cheek is near in views 0/1, the −y cheek in 2/3);
   - within a section, profile index order is back-to-front in every view (views 0/3 see the front strips,
     views 1/2 see only panel (4) → step (5) → top (10) → back (11), which is also in index order);
   - the panel props stand on strip 4: from the front (views 0/3) they go last, from behind (views 1/2) right
     after the panel strip so the top, back and near cheek cover them. */
function scene(st, m){
  let s = '';
  s += castShadow([...OUTER.map(([x,z]) => [x,0,z]), ...OUTER.map(([x,z]) => [x,D,z])]);
  const FR = facing([1,0,0]);            // the front (screen, marquee, coin door) is toward the viewer: views 0 and 3
  const LN = facing([0,1,0]);            // the +y (left) cheek is the near one: views 0 and 1
  const cheek = (y0,y1) => strips(OUTER, y0, y1).filter(q => vis(q.n)).map(q => face(pd(q.pts), tone(q.n, m))).join('');   // cheek edges in the body colour (black trim read as a heavy outline)
  const props = () => BTNS.map(b => act('btn', panelButton(b.u, b.s, b.r, BTN[b.k], st.down === b.k, ''), `data-k="${b.k}"`)).join('')
    + act('start', startButton(START.u, START.s, '1P', st.down === 'start')) + `<g id="stk">${joystick(st)}</g>`;

  // 1. far cheek: edge strips, then its inner face (only the alcove part survives; only seen from the front)
  if (LN){ s += cheek(0, T);   if (FR) s += shape(on(PY(T), OUTER),   mix(tone([0,1,0], m),'#000000',.12), 1); }
  else   { s += cheek(D-T, D); if (FR) s += shape(on(PY(D-T), OUTER), mix(tone([0,-1,0], m),'#000000',.12), 1); }

  // 2. centre body, strip by strip, with each strip's details right after it
  for (const st_ of strips(INNER, T, D-T)){
    if (!vis(st_.n)) continue;
    const i = st_.i;
    if (i === I_SCREEN){ s += shape(st_.pts, '#2a2624', 1.2); s += screenDetail(st, m); continue; }
    s += shape(st_.pts, tone(st_.n, m), 1.1);
    if (i === I_FRONT) s += frontDetail(st, m);
    if (i === I_PANEL){ s += panelDetail(st, m); if (!FR) s += props(); }
    if (i === I_MARQ) s += marquee(st, m);
  }

  // 3. near cheek: edge strips + the big side face with the side art (mirrored on the −y side)
  const yS = LN ? D : 0, SP = PY(yS);
  s += LN ? cheek(D-T, D) : cheek(0, T);
  s += fill(pd(on(SP, OUTER)), tone([0, LN ? 1 : -1, 0], m));
  s += sideArt(m, LN ? D+.15 : -.15);
  s += ink(pd(on(SP, OUTER)), 2.2);

  // 4. things standing on the control panel (front views) or the back panel (rear views)
  if (FR) s += props();
  else s += backDetail(st, m);

  // 5. silhouette, then the mains cable lying on the floor behind (it crosses the back's bottom edge)
  s += ink(pd(silhouette()), 2.8);
  if (!FR) s += powerCord();
  return s;
}

// Body outline per view. Views 3 and 1 are views 0 and 2 seen in a mirror (y → D−y): the cabinet is symmetric.
function silhouette(){
  const v = VIEW & 3, mir = ([x,y,z]) => [x, D-y, z];
  if (v === 0 || v === 3){
    // under the panel the visible edge is the lip's bottom edge, which meets the cabinet's right edge at z = 93 - (75 - XF)
    const s = [[0,D,0],[XF,D,0],[XF,0,0],[XF,0,93-(75-XF)],[75,75-XF,93], ...OUTER.slice(3,12).map(([x,z]) => [x,0,z]), [0,D,180]];
    return v === 0 ? s : s.map(mir);
  }
  // from behind, the far half of the panel's top lip edge (75, y, 99) peeks over the near cheek until it meets the
  // near cheek's alcove edge (58,108)→(57,152): at y = t with 75−t = 58 − (t−9)/44  →  t = 739/43
  const t = 739/43;
  const s = [[XF,0,0],[XF,0,86],[75,0,93],[75,0,99],[75,t,99],[75-t,0,99+t],[57,0,152],[60,0,154],[60,0,176],[56,0,180],[56,D,180],[0,D,180],[0,D,0],[0,0,0]];
  return v === 2 ? s : s.map(mir);
}

function screenDetail(st, m){
  let s = '';
  // printed bezel: frame line around the glass
  s += ink(pd(onS(rrUV(GL-GW*CS-4.2, GB-3.6, GL+4.2, GB+GH*CS+3.4, 4), .05)), .9).replace(INK, m.l);
  // CRT glass + live picture
  s += shape(onS(GLASS,.08), SCR.bg, 1.5);
  s += `<clipPath id="crtclip"><path d="${pd(onS(GLASS,.08))}"/></clipPath>`;
  s += act('screen', `<g clip-path="url(#crtclip)"><g id="crt">${crtSVG(st)}</g></g>`);
  // glass: a soft inner rim + two streaks
  s += `<g pointer-events="none">` + ink(pd(onS(rrUV(GL-GW*CS-.5, GB-.5, GL+.5, GB+GH*CS+.5, 2.4),.12)), .7).replace(INK,'#3c4f4a')
     + `</g>`;
  return s;
}

function frontDetail(st, m){
  const F = PX(XF+.2), F2 = PX(XF+.4);
  let s = '';
  // kick plate
  s += shape(on(F, rectUV(T+1, 1.5, D-T-1, 10.5)), tone([1,0,0], METAL), 1.1);
  for (const y of [8, D-8]) s += shape(on(F2, ellUV(y, 6, .7, .7, 8)), METAL.d, .5);
  // speaker grille under the panel
  s += shape(on(F, rrUV(18, 63, 47, 72, 2)), mix(m.d,'#000000',.2), 1.1);
  for (let k=0;k<4;k++) s += ink(pd(on(F2, [[20.5, 65+k*2.1],[44.5, 65+k*2.1]]), false), 1).replace(INK, mix(m.d,'#ffffff',.25));
  // coin door: metal plate, two coin mechs with lit 25¢ inserts, reject buttons, lock
  s += shape(on(F, rrUV(16, 17, 49, 59, 2)), tone([1,0,0], METAL), 1.5);
  s += ink(pd(on(F2, rrUV(18, 19, 47, 57, 1.4))), .7);
  for (const c of [39, 26]){
    const lit = st.coinGlow > 0 ? '#ffe08a' : '#ff8a5c';
    let g = shape(on(F2, rrUV(c-4.6, 38, c+4.6, 55, 1.2)), METAL.m, 1.1);
    g += shape(on(PX(XF+.6), rrUV(c-3.7, 48.5, c+3.7, 54, 1)), lit, .9);
    g += `<g opacity=".55">${fill(pd(on(PX(XF+.65), rrUV(c-3.1, 51.6, c+3.1, 53.4, .6))), '#ffffff')}</g>`;
    g += tx(XF+.7, c, 49.6, '25¢', 3.5, '#5a1d12', 800);
    g += shape(on(PX(XF+.6), rrUV(c-.6, 40.5, c+.6, 46.5, .5)), '#191614', .7);
    g += shape(on(PX(XF+.6), rrUV(c-3.2, 31, c+3.2, 35, 1)), METAL.l, 1);
    s += act('coin', g);
  }
  s += shape(on(F2, ellUV(32.5, 25, 1.7, 1.7, 14)), METAL.d, .9) + ink(pd(on(PX(XF+.6), [[32.5,24.2],[32.5,25.8]]), false), .9);
  if (st.coinT !== null){   // coin flying into the left slot
    const k = ease(Math.min(1, st.coinT)), x = XF + 13 - k*16, z = 43.5 + 3*(1-k);
    s += coinDisc(x, 39, z, 2.5);
  }
  return s;
}

function panelDetail(st, m){
  let s = shape(onK(rrUV(T+1.5, 1.2, D-T-1.5, 16.6, 2), .02), '#2b2725', 1);
  s += ink(pd(onK(rrUV(T+2.6, 2.2, D-T-2.6, 15.6, 1.6), .03)), .7).replace(INK, m.l);
  // little arrows either side of the stick
  s += fill(pd(onK([[STICK.u+6.8, STICK.s-1.4],[STICK.u+6.8, STICK.s+1.4],[STICK.u+8.8, STICK.s]], .04)), m.l);
  s += fill(pd(onK([[STICK.u-6.8, STICK.s-1.4],[STICK.u-6.8, STICK.s+1.4],[STICK.u-8.8, STICK.s]], .04)), m.l);
  return s;
}

function marquee(st, m){
  const F = PX(60.2);
  let s = shape(on(F, rrUV(3.6, 156, D-3.6, 174.4, 1.6)), '#fff3c8', 1.4);
  s += fill(pd(on(PX(60.3), rrUV(5, 157.4, D-5, 173, 1.2))), '#fffaea');
  const star = (u,v,r,col) => fill(pd(on(PX(60.4), Array.from({length:10},(_,i) => { const a=(i/10)*2*Math.PI+Math.PI/2, rr = i%2 ? r*.45 : r; return [u+rr*Math.cos(a), v+rr*Math.sin(a)]; }))), col) ;
  s += star(D-7.6, 165, 2.4, m.m) + star(7.6, 165, 2.4, m.m);
  s += tx(60.4, 32.2, 161.6, 'STAR BLASTER', 5.9, INK, 900) + tx(60.5, 32.5, 162.1, 'STAR BLASTER', 5.9, '#e2483d', 900);
  s += tx(60.5, 32.5, 158.3, '· ONE PLAYER · 25¢ ·', 2.2, m.d, 700);
  return s;
}

// side art on a cheek's outer face; the same (x,z) shapes on the −y face come out mirrored, like a real cabinet's
function sideArt(m, y){
  const SP = PY(y), side = tone([0, y > D/2 ? 1 : -1, 0], m), c = side === m.l ? m.m : m.l;   // art stays readable when the side is lit
  let s = shape(on(SP, [[10,168],[36,168],[26,130],[45,130],[15,40],[22,100],[5,100]]), c, 1.2);
  // speed stripes along the bottom
  for (const [z,len] of [[22,40],[16,46],[10,52]]) s += shape(on(SP, [[2,z],[len,z],[len+2,z+3],[4,z+3]]), c, .9);
  const star4 = (u,v,r) => shape(on(SP, [[u,v+r],[u+r*.25,v+r*.25],[u+r,v],[u+r*.25,v-r*.25],[u,v-r],[u-r*.25,v-r*.25],[u-r,v],[u-r*.25,v+r*.25]]), c, .8);
  s += star4(44, 160, 4) + star4(48, 112, 2.6) + star4(10, 66, 3.2);
  return s;
}

// back panel (x = 0, seen from views 1 and 2): service door with lock, vents, warning sticker, lower panel, serial plate
function backDetail(st, m){
  const bt = tone([-1,0,0], m), B = PX(-.2), B2 = PX(-.4);
  const screw = (y,z) => shape(on(PX(-.45), ellUV(y, z, .75, .75, 8)), METAL.d, .5);
  let s = '';
  // upper service door (CRT access) with a bevel line and corner screws
  s += shape(on(B, rrUV(9, 92, D-9, 171, 1.6)), mix(bt,'#000000',.05), 1.6);
  s += ink(pd(on(B2, rrUV(11, 94, D-11, 169, 1.2))), .6).replace(INK, mix(bt,'#000000',.35));
  for (const [y,z] of [[12.5,95.5],[D-12.5,95.5],[12.5,167.5],[D-12.5,167.5]]) s += screw(y,z);
  // ventilation slots near the top of the door (the tube runs hot)
  for (let k=0;k<6;k++){ const z = 132 + k*3.7;
    s += shape(on(PX(-.45), rrUV(16, z, D-16, z+1.8, .9)), mix(m.d,'#000000',.25), .8); }
  // cam lock
  s += shape(on(PX(-.45), ellUV(D/2, 160.5, 2.6, 2.6, 18)), METAL.m, 1.1);
  s += shape(on(PX(-.6), ellUV(D/2, 160.5, 1.6, 1.6, 14)), METAL.l, .6);
  s += line([[-.7, D/2, 159.4], [-.7, D/2, 161.6]], 1);
  // warning sticker: DO NOT OPEN — HIGH VOLTAGE
  s += shape(on(PX(-.45), rrUV(14, 104, D-14, 123, 1.2)), '#f2c230', 1);
  s += ink(pd(on(PX(-.5), rrUV(15.3, 105.3, D-15.3, 121.7, .8))), .55);
  s += shape(on(PX(-.55), [[16.8,107.2],[26.6,107.2],[21.7,118.6]]), INK, .6);
  s += fill(pd(on(PX(-.6), [[22.6,116.2],[20.4,112.4],[22,112.4],[20.8,108.6],[23.2,113.2],[21.6,113.2]])), '#f2c230');
  s += txB(39.4, 115.2, 'DO NOT OPEN', 2.6, INK, 900) + txB(39.4, 109.8, 'HIGH VOLTAGE', 2.3, INK, 800);
  // serial / rating plate
  s += shape(on(PX(-.45), rrUV(36, 64, D-8, 81, 1)), METAL.l, .9);
  for (const [y,z] of [[37.6,79.4],[D-9.6,79.4],[37.6,65.6],[D-9.6,65.6]]) s += shape(on(PX(-.5), ellUV(y, z, .45, .45, 8)), METAL.d, .3);
  s += txB(46.5, 75.6, 'STAR BLASTER', 2.1, INK, 900) + txB(46.5, 72, 'MODEL SB-1', 1.8, INK, 700)
     + txB(46.5, 68.9, 'SER 04127', 1.8, INK, 700) + txB(46.5, 66.1, '120V~60Hz', 1.6, INK, 700);
  // lower access panel (coin box / PSU) with four screws
  s += shape(on(B, rrUV(9, 24, D-9, 58, 1.4)), mix(bt,'#000000',.05), 1.3);
  for (const [y,z] of [[12.5,27.5],[D-12.5,27.5],[12.5,54.5],[D-12.5,54.5]]) s += screw(y,z);
  s += shape(on(PX(-.45), rrUV(14, 46, 30, 51.5, .8)), mix(bt,'#000000',.22), .7);   // finger pull
  // cord grommet
  s += shape(on(PX(-.45), ellUV(46, 14, 2.6, 2.6, 14)), DARK.m, .9);
  return s;
}

// mains cable: out of the grommet, down to the floor, plug lying behind the cabinet.
// It stays inside the cabinet's outline in views 0 and 3 (floor points with 0 ≤ y ≤ D and x ≥ max(y−D, −y) are hidden),
// so it is only drawn from behind.
function powerCord(){
  const path = [[-.5,46,14],[-2.4,46,13.4],[-3.6,46,11],[-3.9,46,4.5],[-4.4,45.6,1.9],[-6,44.6,.9],[-10,41.4,.9],[-14,38.2,.9],[-17,36,.9]];
  const d = pd(path, false);
  let s = `<path d="${d}" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`
        + `<path d="${d}" fill="none" stroke="${DARK.l}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += box(-18.5,34.2,0,-17,37.8,2.8,DARK,toneI,.8);                  // strain relief
  s += box(-24.5,33,0,-18.5,39,4.6,DARK,toneI,1);                       // plug body
  for (const y of [34.6,37.4]) s += line([[-24.5,y,2.3],[-28,y,2.3]], 1.5) + `<path d="${pd([[-24.5,y,2.3],[-28,y,2.3]],false)}" stroke="${METAL.l}" stroke-width=".55" stroke-linecap="round"/>`;
  return s;
}

/* ---------- state + game logic ---------- */
function stickDir(st){
  const k = (st.keyR?1:0) - (st.keyL?1:0) || st.hold || (st.nudgeT > 0 ? st.nudgeDir : 0);
  return k || st.stickParam;
}
const rnd = (() => { let a = 7; return () => (a = (a*16807) % 2147483647) / 2147483647; })();
function newGame(st){ st.g = { sx: GW/2, sh: [], en: [], boom: [], score: 0, lives: 3, spawn: .6, cool: 0, hitT: 0 }; st.mode = 'play'; st.frozen = false; }
function fire(st){
  const g = st.g; if (st.mode !== 'play') return;
  st.frozen = false;
  if (g.sh.length < 3 && g.cool <= 0){ g.sh.push({ x: Math.round(g.sx), y: 3.5 }); g.cool = .2; }
}
function stepGame(st, dt){
  const g = st.g, dir = stickDir(st);
  g.sx = Math.max(2, Math.min(GW-3, g.sx + dir*16*dt));
  g.cool -= dt; g.hitT = Math.max(0, g.hitT - dt);
  for (const b of g.sh) b.y += 30*dt;
  g.sh = g.sh.filter(b => b.y < GH-2);
  g.spawn -= dt;
  if (g.spawn <= 0){ g.spawn = Math.max(.55, 1.5 - g.score/500); g.en.push({ x: 3 + Math.floor(rnd()*(GW-6)), y: GH-6, c: rnd() < .5 ? SCR.inv : SCR.inv2 }); }
  const sp = 1.6 + g.score/320;
  for (const e of g.en) e.y -= sp*dt;
  for (const b of g.sh) for (const e of g.en) if (!e.dead && !b.dead && Math.abs(b.x - Math.round(e.x)) <= 2 && b.y+1 >= e.y && b.y <= e.y+3.5){
    e.dead = b.dead = true; g.score += 10; g.boom.push({ x: e.x, y: e.y, t: .35 }); }
  for (const e of g.en) if (!e.dead){
    if (e.y <= 3.5 && Math.abs(e.x - g.sx) <= 3.5 && g.hitT <= 0){ e.dead = true; g.lives--; g.hitT = 1.2; g.boom.push({ x: g.sx, y: 1, t: .5 }); }
    else if (e.y < .5){ e.dead = true; g.lives--; g.boom.push({ x: e.x, y: 0, t: .4 }); }
  }
  g.sh = g.sh.filter(b => !b.dead); g.en = g.en.filter(e => !e.dead);
  for (const b of g.boom) b.t -= dt; g.boom = g.boom.filter(b => b.t > 0);
  if (g.lives <= 0){ st.mode = 'over'; st.overT = 3; st.hi = Math.max(st.hi, g.score); return true; }
  return false;
}

const readout = st => {
  if (!facing([1,0,0]) && (st.mode === 'play' || st.mode === 'over')) return `${st.mode === 'over' ? 'Game over' : 'Playing'} · score ${st.g.score} — turn to the front to see the screen`;
  if (st.mode === 'play') return st.frozen ? `Paused mid-game · score ${st.g.score} — press ← → or fire to resume`
    : `Score ${st.g.score} · ships ${st.g.lives} · ← → or the joystick to steer, space / red button to fire`;
  if (st.mode === 'over') return `Game over · score ${st.g.score} · hi ${st.hi}` + (st.credits ? ' — press 1P start' : ' — insert coin');
  if (st.coinT !== null) return 'Coin in…';
  return st.credits ? `Credits ${st.credits} — press the white 1P START button (or Enter)` : 'Insert coin — click a 25¢ slot (or press 5)';
};

let ui = null, pressTimer = 0;
const press = k => { ui.st.down = k; clearTimeout(pressTimer); pressTimer = setTimeout(() => { ui.st.down = null; ui.render(); }, 150); };
function insertCoin(st){
  if (st.coinT !== null) return;
  if (st.credits >= 9) return ui.flash('Credits full (9)');
  st.coinT = 0;
  ui.animate(dt => { st.coinT += dt/.5; if (st.coinT < 1) return true;
    st.coinT = null; st.credits++; st.coinGlow = .6; if (st.mode === 'attract') st.mode = 'ready'; return false; });
}
function startGame(st){
  press('start');
  if (st.mode === 'play'){ ui.flash('Game already running'); return; }
  if (!st.credits){ ui.flash('Insert a coin first'); return; }
  st.credits--; newGame(st);
}
const nudge = (st, d) => { st.nudgeDir = d; st.nudgeT = .2; if (st.mode === 'play') st.frozen = false; };

ui = mountFigure({
  fig:'15', title:'Arcade cabinet', hint:'insert a coin, press 1P start, then ← → and space',
  idea:"A joystick is just four little switches \u2014 leaning it presses one, and the game moves your ship.",
  size:[W,D,H], palette:'blush', views:true,
  state:{ mode:'attract', credits:0, hi:500, t:0, g:null, coinT:null, coinGlow:0, down:null,
          keyL:false, keyR:false, hold:0, nudgeT:0, nudgeDir:0, stickParam:0, frozen:false, overT:0, tFrozen:false },
  scene, readout,
  buttonsLabel:'Cabinet',
  buttons:[
    { label:'Insert 25¢', onClick:(st)=>insertCoin(st) },
    { label:'1P Start', onClick:(st)=>startGame(st) },
    { label:'Move ◀', onClick:(st)=>nudge(st,-1) },
    { label:'Fire', onClick:(st)=>{ press('red'); fire(st); } },
    { label:'Move ▶', onClick:(st)=>nudge(st,1) },
  ],
  next: st => st.mode === 'play' ? 3 : st.credits > 0 ? 1 : 0,
  stats: st => [ { label:'Credits', value: st.credits },
                 st.g && st.mode !== 'attract' && { label:'Score', value: st.g.score, small:true },
                 { label:'Hi-score', value: st.hi, small:true } ],
  acts:{},
  params(st, q){
    if (q.has('credit')){ st.credits = Math.max(0, Math.min(9, +q.get('credit')||0)); if (st.credits) st.mode = 'ready'; }
    const sk = q.get('stick'); if (sk === 'left') st.stickParam = -1; if (sk === 'right') st.stickParam = 1;
    if (q.has('t')){ st.t = +q.get('t'); st.tFrozen = true; }
    if (q.get('play') === '1'){
      newGame(st); st.frozen = true;
      Object.assign(st.g, { sx: 12, score: 340, lives: 2,
        en: [{x:6,y:13.6,c:SCR.inv},{x:16,y:10.2,c:SCR.inv2},{x:25,y:14.4,c:SCR.inv},{x:21,y:6.4,c:SCR.inv2}],
        sh: [{x:12,y:7},{x:16,y:5.6}], boom:[{x:9,y:11,t:.3}] });
      if (st.stickParam) st.g.sx = 12 + st.stickParam*3;
    }
    if (q.get('over') === '1'){ newGame(st); st.g.score = 620; st.hi = 620; st.mode = 'over'; st.overT = 1e9; }
  },
});

/* ---------- input ---------- */
const svg = document.getElementById('fig');
svg.addEventListener('pointerdown', e => {
  const a = e.target.closest('[data-act]'); if (!a) return;
  const st = ui.st, n = a.dataset.act;
  if (n === 'coin') insertCoin(st);
  else if (n === 'start') startGame(st);
  else if (n === 'btn'){ press(a.dataset.k); if (a.dataset.k === 'red') fire(st); else if (st.mode === 'play') fire(st); }
  else if (n === 'stickL' || n === 'stickR'){ st.hold = n === 'stickL' ? -1 : 1; nudge(st, st.hold); }
  else if (n === 'screen'){ if (st.mode === 'play') fire(st); else if (st.credits) startGame(st); else insertCoin(st); }
  ui.render();
});
window.addEventListener('pointerup', () => { ui.st.hold = 0; });
window.addEventListener('keydown', e => {
  const st = ui.st;
  if (e.key === 'ArrowLeft'){ st.keyL = true; if (st.mode==='play') st.frozen = false; e.preventDefault(); }
  else if (e.key === 'ArrowRight'){ st.keyR = true; if (st.mode==='play') st.frozen = false; e.preventDefault(); }
  else if (e.key === ' ' ){ if (!e.repeat){ press('red'); fire(st); ui.render(); } e.preventDefault(); }
  else if (e.key === 'Enter' || e.key === '1'){ startGame(st); ui.render(); }
  else if (e.key === '5' || e.key === 'c'){ insertCoin(st); }
});
window.addEventListener('keyup', e => { if (e.key === 'ArrowLeft') ui.st.keyL = false; if (e.key === 'ArrowRight') ui.st.keyR = false; });

/* ---------- main loop: game ticks; only the CRT and the stick are redrawn every frame ---------- */
let last = performance.now(), acc = 0, lastDir = 0;
function tick(now){
  const st = ui.st, dt = Math.min(.05, (now-last)/1000); last = now;
  if (!st.tFrozen) st.t += dt;
  st.nudgeT = Math.max(0, st.nudgeT - dt);
  let full = false;
  if (st.coinGlow > 0){ st.coinGlow -= dt; if (st.coinGlow <= 0) full = true; }
  if (st.mode === 'play' && !st.frozen && stepGame(st, dt)) full = true;
  if (st.mode === 'over' && (st.overT -= dt) <= 0){ st.mode = st.credits ? 'ready' : 'attract'; full = true; }
  acc += dt;
  const dir = stickDir(st);
  if (full){ ui.render(); acc = 0; }
  else if (acc >= (st.mode === 'play' ? 1/30 : 1/12) || dir !== lastDir){
    acc = 0;
    const crt = document.getElementById('crt'), stk = document.getElementById('stk');
    if (crt) crt.innerHTML = inkScale(crtSVG(st));
    if (ui && ui.drawStats) ui.drawStats();
    if (stk && dir !== lastDir) stk.innerHTML = inkScale(joystick(st));
    if (!ui._flash) document.getElementById('readout').textContent = readout(st);
  }
  lastDir = dir;
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
