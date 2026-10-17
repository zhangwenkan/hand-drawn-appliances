
/* ---------- geometry (x = depth, y = width, z = height) ---------- */
const W = 100, D = 150, H = 200, R = 24, T = 6;
const OA = 62, OB = 128, OZ0 = 14, OZ1 = 182;   // entrance opening on the front: y from OA to OB, z from OZ0 to OZ1
const XB = 40;                                  // camera wall inside (the cabinet behind it holds the machinery)
const SIGN = [W-14, 24, W-4, 126, 22];          // roof sign: x0, y0, x1, y1, height
const RAIL_X = W+4, RAIL_Z = 188, CUR_TOP = 186, CUR_END = 142, CUR_SHUT = 58, CUR_OPEN = 124, NSEG = 16;
const STRIP = { y0:30, y1:44, top:66, len:46 }; // photo strip coming out of the delivery slot
const OUT = rrUV(0,0,D,H,R), HOLE = rrUV(OA,OZ0,OB,OZ1,5);
const INT = { back:'#e8e1cf', side:'#d3cab3', floor:'#8b8476', rib:'#6f695e' };
const CURTAINS = { cobalt:'#e0574a', tomato:'#f2c14a', mustard:'#d5473f', mint:'#e0574a', blush:'#5f74bd' };
const PHOTO_BG = ['#f3a6bb','#93d3b0','#f4b829','#76a0e2','#ef6a4c','#c8b6f0'];
const SHOT = 1.8, N_SHOTS = 4, T_DEV = N_SHOTS*SHOT, T_OUT = T_DEV + 1.4, T_END = T_OUT + 1.3;

/* ---------- turning helpers ---------- */
const Dw = n => { const r = rotV(n); return r[0] + r[1]; };   // how much a step along n moves toward the viewer (±1 for x / y)
// text lying on a plane through o, reading along the 3D direction u (so it reads left-to-right on that face)
const txU = (o, u, str, size, col=INK, weight=700) =>
  `<text transform="${txM(P(...o), Dv(...u), Dv(0,0,-1))}" font-size="${size}" fill="${col}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="${weight}" letter-spacing=".04em">${str}</text>`;
const txBack = (x,y,z,str,size,col,weight) => txU([x,y,z], [0,1,0], str, size, col, weight);    // back face (−x)
const txRight = (x,y,z,str,size,col,weight) => txU([x,y,z], [-1,0,0], str, size, col, weight);  // right side (−y)
// a short peg / knob along x from x0 to x1 (either direction), outer cap at x1
function pegX(x0,x1,y,z,r,mt,w=1,n=18){
  const A=on(PX(x0),ellUV(y,z,r,r,n)), B=on(PX(x1),ellUV(y,z,r,r,n));
  return loft(A,B,nr=>toneI(nr,mt)) + fill(pd(B), toneI([Math.sign(x1-x0),0,0],mt)) + hullInk([...A,...B],w) + ink(pd(B),w*.8);
}

/* ---------- little portraits: a framed photo on a flat plane (PX(x) for the front, or any plane fn) ---------- */
function portrait(x, y0, z0, y1, z1, bg, kind, w=.6){
  const X = typeof x === 'function' ? x : PX(x), yc = (y0+y1)/2, hgt = z1-z0, wid = y1-y0;
  let s = shape(on(X, rectUV(y0,z0,y1,z1)), bg, w);
  const sh = [...arcUV(yc, z0, wid*.36, 0, 180, 10)];                  // shoulders
  s += shape(on(X, sh), mix(bg,'#231e16',.55), 0);
  const hz = z0 + hgt*.56, r = Math.min(wid*.25, hgt*.25);
  s += shape(on(X, ellUV(yc, hz, r, r, 18)), '#fde3b4', w);           // head
  const ex = r*.4, ez = hz + r*.18, er = Math.max(.35, r*.13);
  const dot = (u,v,rr) => fill(pd(on(X, ellUV(u,v,rr,rr,8))), INK);
  if (kind === 1){ s += dot(yc-ex, ez, er) + line(on(X, [[yc+ex-er*1.6, ez],[yc+ex+er*1.6, ez]]), w); }   // wink
  else s += dot(yc-ex, ez, er) + dot(yc+ex, ez, er);
  if (kind === 2) s += ink(pd(on(X, ellUV(yc, hz-r*.42, r*.2, r*.24, 10))), w);                         // "o"
  else if (kind === 3) s += shape(on(X, arcUV(yc, hz-r*.18, r*.5, 180, 360, 8)), '#7a2a22', w*.9);      // big grin
  else s += ink(pd(on(X, arcUV(yc, hz-r*.08, r*.48, 205, 335, 6)), false), w);                         // smile
  return s;
}

/* ---------- curtain: pleated fabric on the rail. open = 0 (shut) .. 1 (bunched at the left end) ---------- */
function curtain(st, m){
  const c = matOf(CURTAINS[st.pal] || '#e0574a');
  const yf = CUR_SHUT + (CUR_OPEN-CUR_SHUT)*ease(st.cur);
  const seg = (CUR_END-CUR_SHUT)/NSEG*1.08, w = (CUR_END-yf)/NSEG, dep = Math.sqrt(Math.max(0, seg*seg - w*w));
  const vx = [], bz = [];
  for (let i=0;i<=NSEG;i++){ vx.push([W+2 + (i%2 ? dep : 0), yf + i*w]); bz.push(18 + 1.6*Math.sin(i*1.9 + 0.6) + (i%2 ? -1.2 : 0.6)); }
  const strips = [], wx = Dw([1,0,0]), wy = Dw([0,1,0]);
  for (let i=0;i<NSEG;i++){
    const [x0,y0] = vx[i], [x1,y1] = vx[i+1];
    const p = [[x0,y0,CUR_TOP],[x1,y1,CUR_TOP],[x1,y1,bz[i+1]],[x0,y0,bz[i]]];
    strips.push({ p, k:(wx*x0 + wx*x1 + wy*y0 + wy*y1)/2, col: i%2 ? c.m : c.l });   // depth in the current view
  }
  strips.sort((a,b) => a.k-b.k);
  let s = '';
  for (const t of strips) s += face(pd(t.p), t.col);
  for (let i=1;i<NSEG;i++) if (i%2) s += line([[vx[i][0],vx[i][1],CUR_TOP-2],[vx[i][0],vx[i][1],bz[i]+3]], .7);
  if (st.flash > 0 && st.cur < .6) for (const t of strips) s += fill(pd(t.p), '#fff8dc', `opacity="${f(.45*st.flash)}"`);
  const top = vx.map(([x,y]) => [x,y,CUR_TOP]), bot = vx.map(([x,y],i) => [x,y,bz[i]]);
  s += line(bot, 1.4) + line([top[0], bot[0]], 1.4) + line([top[NSEG], bot[NSEG]], 1.2) + line(top, 1);
  // rings on the rail
  for (let i=0;i<=NSEG;i+=2){ const [x,y] = vx[i]; s += ink(pd(on(PX(Math.max(x,RAIL_X)), ellUV(y, RAIL_Z-.5, 1.6, 2.2, 10))), .9); }
  return act('curtain', s);
}

/* ---------- interior, seen through the entrance ---------- */
function interior(st, m){
  let s = '';
  const Xb = PX(XB);
  s += shape(on(Xb, rectUV(T, OZ0, D-T, H-T)), INT.back, 0);
  // the inside wall we can see: the −y wall (y = T) faces +y, so it shows when +y faces the viewer; else the +y wall
  const Ys = facing([0,1,0]) ? T : D-T, Yo = D+T - Ys - T;    // Yo: the far edge of the floor across the booth
  s += shape(on(PY(Ys), rectUV(XB, OZ0, W-T, H-T)), INT.side, 0);
  s += shape([[XB,T,OZ0],[W-T,T,OZ0],[W-T,D-T,OZ0],[XB,D-T,OZ0]], INT.floor, 0);
  let rib = ''; for (let x=XB+6; x<W-T; x+=7) rib += pd([[x,T,OZ0],[x,D-T,OZ0]], false);
  s += `<path d="${rib}" fill="none" stroke="${INT.rib}" stroke-width=".8"/>`;
  s += line([[XB,Ys,H-T],[XB,Ys,OZ0],[XB,Yo,OZ0]], 1.1) + line([[XB,Ys,OZ0],[W-T,Ys,OZ0]], 1);
  if (Ys > D/2){   // the +y inside wall only shows from the right side: a mirror and a coat hook hang there
    const Wy = PY(Ys-.3);
    s += shape(on(Wy, rrUV(54, 96, 76, 128, 3)), METAL.m, 1.1) + shape(on(PY(Ys-.4), rrUV(56, 98, 74, 126, 2)), '#cfe9f0', .6);
    s += fill(pd(on(PY(Ys-.5), [[60,104],[62,104],[70,122],[68,122]])), '#ffffff', 'opacity=".45"');
    s += line([[84,Ys,142],[84,Ys-3,142],[84,Ys-3.6,145]], 1.6);
  }
  // flash panel (diffuser box) above the camera
  const lit = st.flash > 0;
  s += box(XB, 26, 108, XB+5, 66, 124, METAL, toneI, 1.1);
  const dif = on(PX(XB+5.2), rrUV(28.5, 110.5, 63.5, 121.5, 1.5));
  s += shape(dif, lit ? '#ffffff' : '#f6f3e6', .9);
  let grid = ''; for (let y=33; y<63; y+=5) grid += pd([[XB+5.3,y,111],[XB+5.3,y,121]], false);
  s += `<path d="${grid}" fill="none" stroke="#c9c4b2" stroke-width=".5"/>`;
  // camera window + lens
  const Xc = PX(XB+.3);
  s += shape(on(Xc, rrUV(32, 80, 60, 102, 4)), '#24221f', 1.4);
  s += shape(on(PX(XB+.4), ellUV(46, 91, 7, 7, 22)), '#3d3935', .9);
  s += shape(on(PX(XB+.5), ellUV(46, 91, 4.6, 4.6, 20)), '#141821', .8);
  s += fill(pd(on(PX(XB+.6), ellUV(47.6, 92.8, 1.5, 1.5, 10))), '#cfe9f0', 'opacity=".75"');
  s += fill(pd(on(Xc, ellUV(36, 98, 1.3, 1.3, 8))), st.phase === 'shoot' ? '#e2483d' : '#5a2a26');
  // mini countdown screen under the camera, facing the sitter
  s += shape(on(Xc, rrUV(39, 66, 53, 76, 1.5)), '#1d2a26', 1.1);
  const mini = st.phase === 'shoot' ? (st.count ? String(st.count) : '★') : '· ·';
  s += tx(XB+.5, 46, 68.2, mini, 7, '#8af0ae', 800);
  // stool: round padded seat on a chrome post
  const sx = 68, sy = 50;
  s += cyl(sx, sy, OZ0, OZ0+2, 9, METAL, toneI, 1);
  s += cyl(sx, sy, OZ0+2, 50, 1.8, METAL, toneI, .9);
  s += cyl(sx, sy, 50, 52, 7, METAL, toneI, .9);
  s += cyl(sx, sy, 52, 57, 12, matOf(m.m), toneI, 1.2);
  if (st.flash > 0) s += fill(pd(on(PX(W), HOLE)), '#fffbea', `opacity="${f(.72*st.flash)}"`);
  return s;
}

/* ---------- front panel: screen, coin slot, button, sample strip, delivery slot ---------- */
function screenText(st){
  if (st.msg) return st.msg.split('|');
  if (st.phase === 'shoot') return st.count ? [String(st.count)] : ['SMILE'];
  if (st.phase === 'develop') return ['WAIT', '.'.repeat(1 + Math.floor(st.t*3) % 3)];
  if (st.phase === 'deliver' || st.phase === 'ready') return ['TAKE', 'STRIP'];
  return st.coin ? ['PRESS', 'START'] : ['INSERT', 'COIN'];
}
function panel(st, m){
  const F = PX(W+.3), lab = tone([1,0,0],m) === m.d ? m.l : m.d;   // label ink that reads on the front at any light
  let s = '';
  // screen
  s += shape(on(F, rrUV(10, 150, 30, 168, 2.5)), '#1d2a26', 1.3);
  const lines = screenText(st);
  if (lines.length === 1) s += tx(W+.4, 20, lines[0].length > 1 ? 156.5 : 154, lines[0], lines[0].length > 1 ? 4.6 : 12, '#8af0ae', 800);
  else s += tx(W+.4, 20, 160.5, lines[0], 3.9, '#8af0ae', 700) + tx(W+.4, 20, 153.5, lines[1], 3.9, '#8af0ae', 700);
  // coin slot plate
  let cp = shape(on(F, rrUV(11, 118, 29, 142, 2.5)), METAL.m, 1.2);
  cp += shape(on(PX(W+.5), rrUV(18.8, 123, 21.2, 137, 1)), '#26231f', .6);
  cp += tx(W+.5, 20, 112, '50¢', 4.6, lab, 800);
  if (st.coinT > 0){                       // coin sliding into the slot
    const k = ease(st.coinT), cx = W + 9*(1-k) + .6, cz = 130 - 1.5*k;
    const disc = on(PY(20), ellUV(cx, cz, 4.2, 4.2, 18));
    cp += shape(disc, '#f0d27a', .9) + ink(pd(on(PY(20), ellUV(cx, cz, 2.6, 2.6, 14))), .5);
  }
  s += act('coin', cp);
  // start button
  const ready = st.coin && st.phase === 'idle';
  let b = cylX(W, W+2.6, 20, 98, 6.5, METAL, toneI, 1.1);
  b += cylX(W+2.6, W+4.4, 20, 98, 4.8, matOf(ready ? '#ff6a55' : '#c9473c'), toneI, 1);
  if (ready) b += fill(pd(on(PX(W+4.5), ellUV(21.4, 99.4, 1.4, 1.4, 8))), '#fff', 'opacity=".7"');
  b += tx(W+.4, 20, 85, 'START', 3.6, lab, 800);
  s += act('go', b);
  // sample strip display
  s += shape(on(F, rrUV(31, 85, 55, 175, 2.5)), '#fff4d6', 1.3);
  const kinds = [0,3,1,2];
  for (let i=0;i<4;i++){ const z1 = 172 - i*21.4; s += portrait(W+.5, 34, z1-18.6, 52, z1, PHOTO_BG[i], kinds[i], .55); }
  // delivery slot + strip holder
  s += shape(on(F, rrUV(25, 63, 49, 72, 2.5)), METAL.m, 1.2);
  s += shape(on(PX(W+.5), rrUV(28, 66.6, 46, 68.8, 1)), '#26231f', .6);
  s += tx(W+.4, 37, 74.5, 'PHOTOS', 3.2, lab, 800);
  // recessed channel the strip hangs in
  s += shape(on(F, rrUV(28, 17, 46, 62, 2)), mix(tone([1,0,0],m), '#000000', .22), 1);
  // strip (behind the holder lip)
  if (st.strip > 0){
    const zb = STRIP.top - STRIP.len*st.strip, x = W+1.2;
    let sv = shape(on(PX(x), rectUV(STRIP.y0, zb, STRIP.y1, zb+STRIP.len)), '#fbfaf3', .8);
    for (let i=0;i<4;i++){ const zt = zb + STRIP.len - 1.5 - i*11; sv += portrait(x+.1, STRIP.y0+1.4, zt-9.6, STRIP.y1-1.4, zt, st.bgs[i], st.kinds[i], .45); }
    const clip = on(PX(x), rectUV(STRIP.y0-2, 0, STRIP.y1+2, STRIP.top+.9));
    s += act('strip', clipTo(clip, sv));
  }
  s += box(W, 27, 16, W+4, 47, 20, METAL, toneI, 1);      // little ledge the strip lands on
  return s;
}

/* ---------- back (x = 0): service door with lock, fan grille, louvres, maker's plate ---------- */
function backFace(st, m){
  const B = PX(-.3), bt = tone([-1,0,0], m), lab = bt === m.d ? m.l : m.d;
  let s = shape(on(PX(0), OUT), bt, 0) + ink(pd(on(PX(0), OUT)), 2.2);
  // service door into the machinery cabinet: inset gap, two barrel hinges on the far edge, lock + pull
  let d = shape(on(B, rrUV(62, 22, 122, 150, 3)), mix(bt, '#000000', .08), 1.5);
  d += ink(pd(on(PX(-.35), rrUV(65, 25, 119, 147, 2))), .7);
  for (const z0 of [36, 124]) d += cyl(-1.4, 122, z0, z0+12, 1.7, METAL, toneI, .9, 12);
  d += shape(on(PX(-.5), rrUV(67, 96, 73, 116, 2)), METAL.m, 1) + shape(on(PX(-.6), rrUV(68.6, 99, 71.4, 113, 1.2)), METAL.d, .5);
  d += pegX(0, -2, 70, 86, 3.4, METAL, 1) + fill(pd(on(PX(-2.1), [[70,87.6],[70.7,85.6],[70.3,83.6],[69.7,83.6],[69.3,85.6]])), '#26231f');
  d += fill(pd(on(PX(-2.15), ellUV(70, 87.2, .9, .9, 8))), '#26231f');
  // yellow warning sticker + STAFF ONLY
  d += shape(on(PX(-.5), [[84,112],[100,112],[92,126]]), '#f4c430', 1);
  d += txBack(-.6, 92, 113.6, '!', 9, INK, 800);
  d += txBack(-.5, 92, 104, 'STAFF ONLY', 4, lab, 800);
  s += act('service', d);
  // fan grille in a square plate (the flash + printer get warm)
  s += shape(on(B, rrUV(16, 132, 52, 168, 2.5)), METAL.l, 1.2);
  for (const [y,z] of [[19.5,135.5],[48.5,135.5],[19.5,164.5],[48.5,164.5]]) s += fill(pd(on(PX(-.4), ellUV(y, z, .9, .9, 8))), METAL.d);
  s += shape(on(PX(-.4), ellUV(34, 150, 15, 15, 30)), '#3d3935', 1);
  let g = ''; for (const r of [12, 8.6, 5.2]) g += pd(on(PX(-.5), ellUV(34, 150, r, r, 28)));
  g += pd(on(PX(-.5), [[19,150],[49,150]]), false) + pd(on(PX(-.5), [[34,135],[34,165]]), false);
  s += `<path d="${g}" fill="none" stroke="${METAL.m}" stroke-width="1.1"/>` + shape(on(PX(-.6), ellUV(34, 150, 2.6, 2.6, 12)), METAL.m, .7);
  // maker's plate
  s += shape(on(B, rrUV(17, 92, 51, 114, 1.5)), METAL.m, 1);
  for (const [y,z] of [[19.5,94.5],[48.5,94.5],[19.5,111.5],[48.5,111.5]]) s += fill(pd(on(PX(-.4), ellUV(y, z, .7, .7, 8))), METAL.d);
  s += txBack(-.5, 34, 106.6, 'COLORFIG CO.', 3.6, INK, 800);
  s += txBack(-.5, 34, 101.4, 'MODEL 02 · 230V~', 2.6, INK, 700);
  s += txBack(-.5, 34, 97, 'SER 1957-0417', 2.6, INK, 700);
  // louvres above the cord inlet
  let v = ''; for (const z of [48, 54, 60, 66, 72]) v += pd([[-.3,20,z],[-.3,48,z]], false);
  s += `<path d="${v}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>`;
  s += pegX(0, -1.6, 34, 30, 3.2, DARK, .9);                     // rubber grommet where the cord comes out
  return s;
}
// power cord: from the grommet on the back, down to the floor, ending in a plug
function cord(){
  const pts = [[-1.6,34,30],[-4,34,29],[-6.5,34.5,25],[-8,35.5,16],[-8.6,37,7],[-9.5,39,1.2],[-12,41,.5],[-18,40,.5],[-24,34,.5],[-28,27,.5],[-31,22,.5]];
  const d = pd(pts, false);
  let s = `<path d="${d}" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>`
        + `<path d="${d}" fill="none" stroke="#4a4642" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>`;
  s += box(-38, 16, 0, -31, 25, 5, DARK, toneI, 1);            // plug body
  for (const y of [18.5, 22.5]) s += line([[-38,y,2.5],[-42,y,2.5]], 1.3);   // prongs
  return s;
}

/* ---------- right side (y = 0): sample-photo sticker, entrance arrow, louvres ---------- */
function rightSide(st, m){
  const Y = PY(-.2), yt = tone([0,-1,0], m);
  let s = shape(on(Y, rrUV(14, 64, 86, 172, 6)), '#fff4d6', 1.3);
  s += txRight(W/2, -.3, 158, 'PHOTO BOOTH', 8.4, INK, 800);
  s += line(on(PY(-.3), [[22,153],[78,153]]), .8);
  const kinds = [3,1,0,2];
  [[24,116],[52,116],[24,84],[52,84]].forEach(([u,z],i) =>
    s += portrait(([a,b]) => [W - a, -.3, b], u, z, u+24, z+28, PHOTO_BG[(i+2) % PHOTO_BG.length], kinds[i], .55));
  s += txRight(W/2, -.3, 72.6, '4 POSES · READY IN 3 MIN', 3.7, INK, 700);
  s += txRight(W/2, -.3, 44, '‹ ENTRANCE', 6, yt === m.d ? m.l : m.d, 800);
  let v = ''; for (const z of [16,21,26,31]) v += pd([[24,-.2,z],[W-24,-.2,z]], false);
  s += `<path d="${v}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>`;
  return s;
}

/* ---------- roof sign: lit face with bulbs on the front, plain lettering on the back ---------- */
function sign(st, m){
  const [sx0, sy0, sx1, sy1, sh] = SIGN, glow = st.flash > 0;
  let s = box(sx0, sy0, H, sx1, sy1, H+sh, m, tone, 1.4);
  if (facing([1,0,0])){
    const SP = PX(sx1+.2);
    s += shape(on(SP, rrUV(sy0+4, H+3, sy1-4, H+sh-3, 3)), glow ? '#ffffff' : '#fff4d6', 1.2);
    s += tx(sx1+.3, (sy0+sy1)/2, H+7.4, 'PHOTOS', 12, m.d, 800);
    const bulbOn = i => glow || st.phase !== 'shoot' || ((i + Math.floor(st.t*4)) % 2 === 0);
    [[sy0+10,H+8],[sy0+10,H+15],[sy0+17,H+11.5],[sy1-10,H+8],[sy1-10,H+15],[sy1-17,H+11.5]].forEach(([y,z],i) =>
      s += shape(on(PX(sx1+.3), ellUV(y, z, 1.9, 1.9, 12)), bulbOn(i) ? (glow ? '#ffffff' : '#ffd75e') : '#c9b98a', .7));
  } else {
    s += shape(on(PX(sx0-.2), rrUV(sy0+4, H+3, sy1-4, H+sh-3, 3)), '#fff4d6', 1.2);
    s += txBack(sx0-.3, (sy0+sy1)/2, H+7.4, 'PHOTOS', 12, m.d, 800);
    for (const y of [sy0+7, sy1-7]) for (const z of [H+5, H+sh-5]) s += fill(pd(on(PX(sx0-.3), ellUV(y, z, .8, .8, 8))), m.d);
  }
  return s;
}

/* ---------- front: entrance (interior, reveal, face), panel, rail + curtain ---------- */
function frontOpening(st, m){
  let s = clipTo(on(PX(W), HOLE), interior(st, m));                         // interior through the entrance
  s += loft(on(PX(W-T), HOLE), on(PX(W), HOLE), n => tone(n, m), true);     // reveal
  const X = PX(W);
  s += `<path d="${pd(on(X,OUT))}${pd(on(X,HOLE))}" fill="${tone([1,0,0],m)}" fill-rule="evenodd"/>`;
  s += ink(pd(on(X,HOLE)), 1.7);
  return s;
}
function frontMounted(st, m){
  let s = panel(st, m);
  const railPts = [[RAIL_X, 56, RAIL_Z], [RAIL_X, 144, RAIL_Z]];
  for (const y of [56, 144]) s += line([[W, y, RAIL_Z], [RAIL_X, y, RAIL_Z]], 2.6);
  s += curtain(st, m);
  s += line(railPts, 3.6) + `<path d="${pd(railPts,false)}" fill="none" stroke="#dde1e2" stroke-width="1.6" stroke-linecap="round"/>`;
  return s;
}

/* ---------- scene ---------- */
function scene(st, m){
  let s = '';
  const fF = facing([1,0,0]), fB = facing([-1,0,0]), fL = facing([0,1,0]), fR = facing([0,-1,0]);
  const sg = [[SIGN[0],SIGN[1],H+SIGN[4]],[SIGN[2],SIGN[1],H+SIGN[4]],[SIGN[0],SIGN[3],H+SIGN[4]],[SIGN[2],SIGN[3],H+SIGN[4]]];
  s += castShadow([...on(PX(0),OUT), ...on(PX(W),OUT), ...sg]);
  // flash spilling onto the floor in front of the entrance
  if (fF && st.flash > 0 && st.cur > .3)
    s += fill(pd([[W,OA,0],[W,OB,0],[W+46,OB+12,0],[W+46,OA-14,0]]), '#fff6d8', `opacity="${f(.55*st.flash*st.cur)}"`);
  // parts on faces turned away: drawn first so the body hides them and only what sticks out peeks past it
  if (!fB && fR) s += cord();          // (from the front-left the cord is entirely behind the body)
  if (!fF) s += frontMounted(st, m);

  if (fF) s += frontOpening(st, m) + frontMounted(st, m);
  // outer shell + the faces turned toward us, with their details
  s += extrude(OUT, 0, W, m);
  if (fL){
    const Y = PY(D+.2), sm = { l:mix(m.l,'#ffffff',.15), m:mix(m.m,'#ffffff',.12), d:mix(m.d,'#ffffff',.1) };
    s += shape(on(Y, rrUV(18, 70, W-18, 168, 8)), tone([0,1,0], sm), 1.3);
    const lt = tone([0,1,0], m) === m.l ? m.d : tone([0,1,0], m);    // lettering: body tone, unless that's lost on a sunlit decal
    s += txY(W/2, D+.3, 138, 'PHOTO', 13, lt, 800);
    s += txY(W/2, D+.3, 120, 'BOOTH', 13, lt, 800);
    s += txY(W/2, D+.3, 100, '4 POSES · 50¢', 5.2, lt, 700);
    // four little frames as a decal
    for (let i=0;i<4;i++){ const x0 = 30 + i*10.5; s += shape(on(Y, rectUV(x0, 80, x0+8, 89)), 'none', .9); }
    let v = ''; for (const z of [16,21,26,31]) v += pd([[24,D+.2,z],[W-24,D+.2,z]], false);
    s += `<path d="${v}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>`;
  }
  if (fR) s += rightSide(st, m);
  if (fB) s += backFace(st, m);
  // silhouette
  if (fF) s += ink(pd(on(PX(W),OUT)), 2.2);
  s += hullInk([...on(PX(0),OUT), ...on(PX(W),OUT)], 2.8);
  if (fB) s += cord();
  // roof sign (stands on top, after the shell)
  s += sign(st, m);
  return s;
}

/* ---------- behaviour ---------- */
function moveCurtain(st, ui){
  st.curT = st.curT ? 0 : 1;
  if (st.curMoving) return; st.curMoving = true;
  ui.animate(dt => { const sg = Math.sign(st.curT - st.cur); st.cur += sg*dt/0.9;
    if ((st.curT - st.cur)*sg <= 0){ st.cur = st.curT; st.curMoving = false; return false; } return true; });
}
function insertCoin(st, ui){
  if (st.phase !== 'idle') return ui.flash('Session in progress');
  if (st.coin) return ui.flash('Credit already in — press start');
  st.coinT = .001;
  ui.animate(dt => { st.coinT += Math.max(0, dt)/.45; if (st.coinT >= 1){ st.coinT = 0; st.coin = true; return false; } return true; });
}
function shuffle(a){ a = a.slice(); for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function sessionAt(st){        // derive count / flash / strip from the session clock st.t
  const t = st.t;
  if (t < T_DEV){
    const i = Math.floor(t/SHOT), u = t - i*SHOT;
    st.phase = 'shoot'; st.shot = i + (u >= 1.5 ? 1 : 0);
    st.count = u < 1.5 ? 3 - Math.floor(u/.5) : 0;
    st.flash = u >= 1.5 ? Math.max(0, 1 - (u-1.5)/.13) : 0;
  } else if (t < T_OUT){ st.phase = 'develop'; st.flash = 0; st.shot = N_SHOTS; }
  else if (t < T_END){ st.phase = 'deliver'; st.strip = ease((t - T_OUT)/(T_END - T_OUT)); }
  else { st.phase = 'ready'; st.strip = 1; }
}
function takePhotos(st, ui){
  if (st.phase === 'ready' || st.phase === 'deliver') return ui.flash('Collect your strip first');
  if (st.phase !== 'idle') return;
  if (!st.coin) return ui.flash('Insert a coin first');
  st.coin = false; st.t = 0; st.strip = 0;
  st.kinds = shuffle([0,1,2,3]); st.bgs = shuffle(PHOTO_BG).slice(0,4);
  sessionAt(st);
  ui.animate(dt => { st.t += Math.max(0, dt); sessionAt(st); return st.phase !== 'ready'; });
}
function collect(st, ui){
  if (st.phase !== 'ready') return;
  st.phase = 'idle'; st.strip = 0; st.shot = 0; st.collected++;
  ui.flash(st.collected === 1 ? 'Strip collected — nice faces' : `Strip collected (${st.collected} so far)`);
}

mountFigure({
  fig:'14', title:'Photo booth', hint:'open the curtain, insert a coin, press start',
  idea:"The flash fires for a tiny moment, so even if you move, the photo freezes you.",
  size:[W, D, H + SIGN[4]], palette:'cobalt', views:true, buttonsLabel:'Booth',
  state:{ cur:0, curT:0, coin:false, coinT:0, phase:'idle', t:0, shot:0, count:0, flash:0, strip:0, collected:0,
          kinds:[0,3,1,2], bgs:PHOTO_BG.slice(2,6), msg:'' },
  scene,
  readout: st => {
    if (st.phase === 'shoot') return st.flash > 0 ? `Flash! · shot ${st.shot} of ${N_SHOTS}` : st.count ? `Shot ${st.shot+1} of ${N_SHOTS} · ${st.count}…` : `Shot ${st.shot} of ${N_SHOTS} taken`;
    if (st.phase === 'develop') return 'Developing your strip…';
    if (st.phase === 'deliver') return 'Your strip is sliding out…';
    if (st.phase === 'ready') return 'Strip ready — click it to collect';
    if (st.coinT > 0) return 'Clink…';
    if (st.coin) return 'Credit 50¢ · press start for 4 photos';
    return st.cur > .5 ? 'Curtain open · insert a coin to start' : 'Click the curtain to look inside · or insert a coin';
  },
  buttons:[
    { label:'Open curtain, step in', onClick:(st,ui) => st.curT ? ui.flash('Curtain is open — insert a coin') : moveCurtain(st,ui) },
    { label:'Insert coin',  onClick:insertCoin },
    { label:'Take photos',  onClick:takePhotos },
    { label:'Collect strip',onClick:(st,ui) => st.phase === 'ready' ? collect(st,ui) : ui.flash('No strip yet') },
    { label:'Close curtain', onClick:(st,ui) => st.curT ? moveCurtain(st,ui) : ui.flash('Curtain is already closed') },
  ],
  next: st => st.phase === 'ready' ? 3 : st.phase !== 'idle' ? -1 : !st.curT && !st.coin && !st.collected ? 0 : !st.coin ? (st.collected && st.curT ? 4 : 1) : 2,
  stats: st => [ { label:'Credit', value: st.coin ? '50¢' : '0¢' }, { label:'Price', value:'50¢ · 4 poses', small:true } ],
  acts:{ curtain:(st,el,ui) => moveCurtain(st,ui), coin:(st,el,ui) => insertCoin(st,ui),
         go:(st,el,ui) => takePhotos(st,ui), strip:(st,el,ui) => collect(st,ui),
         service:(st,el,ui) => ui.flash('Service door is locked — staff only') },
  params:(st, q) => {
    const c = q.get('curtain');
    if (c === 'open') st.cur = st.curT = 1; else if (c !== null && isFinite(+c)) { st.cur = Math.min(1, Math.max(0, +c)); st.curT = st.cur > .5 ? 1 : 0; }
    if (q.get('coin') === '1') st.coin = true;
    const sv = +q.get('strip');
    if (sv > 0){ st.kinds = [3,0,2,1]; st.t = sv >= 1 ? T_END : T_OUT + (T_END-T_OUT)*sv; sessionAt(st); if (sv < 1) st.strip = sv; }
    if (q.get('flash') === '1'){ st.t = 2*SHOT + 1.55; sessionAt(st); st.flash = 1; }
    if (q.has('count')){ const n = Math.max(1, Math.min(3, +q.get('count'))); st.t = SHOT + (3-n)*.5 + .1; sessionAt(st); }
  },
});
