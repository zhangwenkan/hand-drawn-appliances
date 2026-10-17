
/* ============================================================
   Fig. 07 — Capsule toy machine (gashapon / gumball style)
   Units ≈ 1 cm. Base x 0..40 (depth), y 0..40 (width), z 0..55; globe on top, ~97 tall.
   ============================================================ */
const W = 40, D = 40, BH = 52, SLAB = 55;          // base box, top slab
const OUT = rrUV(0, 0, D, BH, 3);
const CX = 20, CY = 20;                            // vertical axis of collar / globe
const COLLAR_R = 15, FLOOR = 60;                   // collar ring the globe sits in
const GR = 19, G = [CX, CY, FLOOR + Math.sqrt(GR*GR - 13.5*13.5)];   // globe centre (meets the floor at r 13.5)
const CAP_TOP = G[2] + GR - 1.4;
const PLATE = { y:20, z:31.2, r:10.4 };                // coin / crank plate on the front
const SLOT = [19.1, 36, 20.9, 41.2];               // vertical coin slot (y0,z0,y1,z1) on the plate
const CH = { y0:10.5, y1:29.5, z0:4, z1:18.6 };     // capsule exit
const CHUTE = rrUV(CH.y0, CH.z0, CH.y1, CH.z1, 3.4);
const HINGE = [W + .6, CH.z1], FLAP_L = CH.z1 - CH.z0 - .6;         // flap hinge (x,z) and length
const CAP_R = 5.6;                                    // dispensed capsule radius
const REST = [W + 18, 13, CAP_R];                     // where the capsule comes to rest on the ground
const CAP_COLS = ['#e2473a', '#f2c230', '#3e86d9', '#38a565', '#8c4bd1', '#f08a2b'];
const PRIZES = { duck:'Rubber duck', star:'Lucky star', cat:'Lucky cat', robot:'Tin robot', dino:'Tiny dino' };
const COIN = { l:'#f0d27a', m:'#d2ad4a', d:'#9a7a2a' };
const VV = norm([1,1,1]);
const clamp = (v,a=0,b=1) => Math.max(a, Math.min(b, v));
const lerp = (a,b,t) => a + (b-a)*t;
const add = (a,b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
const scl = (a,k) => a.map(v => v*k);
function rng(seed){ return () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const L2 = (() => { const d = Dv(...LIN), l = Math.hypot(...d); return [d[0]/l, d[1]/l]; })();   // screen dir of the prop light
/* ---------- turning helpers (VIEW 0..3) ---------- */
const unrot = v => rotV(rotV(rotV(v)));                       // viewer-space direction -> model direction for this view
const vp = p => [...rotXY(p[0], p[1]), p[2]];                  // model point -> where it sits in turned coordinates
// draw something that should look the same from every side (prizes, the opened capsule) at model point p
function asSeen(p, fn){ const v = VIEW, q = vp(p); VIEW = 0; try { return fn(q); } finally { VIEW = v; } }
// text on the back (x = const, seen from -x) and on the right side (y = const, seen from -y)
const tF = (o,U,str,size,col,weight) => `<text transform="${txM(o, U, Dv(0,0,-1))}" font-size="${size}" fill="${col}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="${weight}" letter-spacing=".04em">${str}</text>`;
const txB = (x,y,z,str,size,col=INK,weight=700) => tF(P(x,y,z), Dv(0,1,0), str, size, col, weight);
const txR = (x,y,z,str,size,col=INK,weight=700) => tF(P(x,y,z), Dv(-1,0,0), str, size, col, weight);
const C2 = (c, r, fillC, extra='') => `<circle cx="${f(c[0])}" cy="${f(c[1])}" r="${f(r)}" fill="${fillC}" ${extra}/>`;

/* ---------- spheres ---------- */
// a ball: orthographic sphere = circle of r·1.2247; base tone + lit offset disc + glint
function ball(c, r, m, w=.9){
  const [X,Y] = P(...c), R = r*1.2247;
  return C2([X,Y], R, m.m, `stroke="${INK}" stroke-width="${w}"`)
       + C2([X + L2[0]*R*.22, Y + L2[1]*R*.22], R*.68, m.l)
       + C2([X + L2[0]*R*.5, Y + L2[1]*R*.5], R*.16, '#ffffff', 'opacity=".75"');
}
// screen geometry of a hemisphere boundary: pole direction p (3D) -> e2 (screen dir of p), e1, minor axis of the rim ellipse
function rimFrame(c, r, p){
  const [X,Y] = P(...c), R = r*1.2247, d = Dv(...p), l = Math.hypot(d[0], d[1]);
  const e2 = l > 1e-6 ? [d[0]/l, d[1]/l] : [0,1], e1 = [-e2[1], e2[0]];
  const mn = R*Math.abs(dot(rotV(p), VV));
  const at = (a, rr, ry) => [X + rr*Math.cos(a)*e1[0] + ry*Math.sin(a)*e2[0], Y + rr*Math.cos(a)*e1[1] + ry*Math.sin(a)*e2[1]];
  const arc = (a0, a1, ry, n=18) => Array.from({length:n+1}, (_,i) => at(a0 + (a1-a0)*i/n, R, ry));
  return { X, Y, R, mn, arc };
}
const poly = (pts, close=true) => 'M' + pts.map(q => f(q[0]) + ' ' + f(q[1])).join('L') + (close ? 'Z' : '');
// shading overlay for any sphere: darker crescent away from the light + glint
function sphereShade(X, Y, R, glint=true){
  const o = [X + L2[0]*R*.11, Y + L2[1]*R*.11];
  return `<path d="M${f(X-R)} ${f(Y)}a${f(R)} ${f(R)} 0 1 0 ${f(2*R)} 0a${f(R)} ${f(R)} 0 1 0 ${f(-2*R)} 0Z M${f(o[0]-R*.88)} ${f(o[1])}a${f(R*.88)} ${f(R*.88)} 0 1 0 ${f(2*R*.88)} 0a${f(R*.88)} ${f(R*.88)} 0 1 0 ${f(-2*R*.88)} 0Z" fill="#1a1020" fill-rule="evenodd" opacity=".16"/>`
       + (glint ? C2([X + L2[0]*R*.5, Y + L2[1]*R*.52], R*.17, '#ffffff', 'opacity=".9"')
                + C2([X + L2[0]*R*.18 + L2[1]*R*.35, Y + L2[1]*R*.18 - L2[0]*R*.35], R*.07, '#ffffff', 'opacity=".7"') : '');
}
// a closed two-tone capsule: k = direction of the coloured half's pole
function capsuleArt(c, r, k, col, w=.9){
  const kv = dot(rotV(k), VV), away = kv < 0 ? k : scl(k, -1);
  const { X, Y, R, mn, arc } = rimFrame(c, r, away);
  const cm = matOf(col), pale = mix(col, '#ffffff', .8), inner = mix(col, '#ffffff', .3);
  const crescent = poly([...arc(0, Math.PI, R), ...arc(Math.PI, 0, mn)]);
  const ell = poly(arc(0, 2*Math.PI, mn, 32));
  let s = '';
  if (kv < 0){   // coloured half points away (usual: coloured bottom seen from above) -> clear dome on top
    s += C2([X,Y], R, pale) + fill(ell, inner) + fill(crescent, cm.l);
    s += `<path d="${poly(arc(Math.PI, 2*Math.PI, mn), false)}" fill="none" stroke="${cm.d}" stroke-width=".5" opacity=".55"/>`;
  } else {       // coloured half faces the viewer, the clear half is the far crescent
    s += C2([X,Y], R, cm.l) + fill(crescent, pale);
  }
  s += sphereShade(X, Y, R);
  s += `<path d="${poly(arc(0, Math.PI, mn), false)}" fill="none" stroke="${INK}" stroke-width=".55"/>`;
  s += C2([X,Y], R, 'none', `stroke="${INK}" stroke-width="${w}"`);
  return s;
}
// half a capsule shell (open), pole p: outside visible on the half-disk, inside through the rim ellipse when p points away
function hemiArt(c, r, p, outC, inC, w=.9, under=''){
  const pv = dot(rotV(p), VV), { X, Y, R, mn, arc } = rimFrame(c, r, p);
  const half = poly(arc(0, Math.PI, R)), ell = poly(arc(0, 2*Math.PI, mn, 32));
  let s = '';
  if (pv < 0){
    s += fill(half, outC) + fill(ell, inC) + under;
    s += fill(poly([...arc(0, Math.PI, R), ...arc(Math.PI, 0, mn)]), outC);
    s += `<path d="${poly([...arc(0, Math.PI, R), ...arc(Math.PI, 0, mn)])}" fill="#1a1020" opacity=".12"/>`;
    s += C2([X + L2[0]*R*.45, Y + L2[1]*R*.45], R*.12, '#ffffff', 'opacity=".8"');
    s += ink(poly(arc(0, Math.PI, R), false), w) + `<path d="${ell}" fill="none" stroke="${INK}" stroke-width="${w*.7}"/>`;
  } else {
    s += fill(half, outC) + fill(ell, outC) + under;
    s += ink(poly(arc(0, Math.PI, R), false), w) + ink(poly(arc(Math.PI, 2*Math.PI, mn), false), w);
  }
  return s;
}

/* ---------- the capsule pile inside the globe ---------- */
const fits = (placed, p, r) => Math.hypot(p[0]-CX, p[1]-CY, p[2]-G[2]) <= GR - r - .6 && p[2] >= FLOOR + r
  && placed.every(o => Math.hypot(o.p[0]-p[0], o.p[1]-p[1], o.p[2]-p[2]) >= o.r + r - .15);
// let the pile fall into gaps: each capsule (lowest first) takes the lowest free spot near where it was
function settle(list, rnd){
  const placed = [];
  for (const c of list.slice().sort((a,b) => a.p[2] - b.p[2])){
    let best = fits(placed, c.p, c.r) ? c.p : null;
    for (let k=0;k<160;k++){
      const p = [c.p[0] + (rnd()-.5)*6, c.p[1] + (rnd()-.5)*6, c.p[2] - rnd()*5 + .5];
      if ((!best || p[2] < best[2]) && fits(placed, p, c.r)) best = p;
    }
    for (let dz=0; !best && dz<30; dz+=.25){ const p = [c.p[0], c.p[1], c.p[2]+dz]; if (fits(placed, p, c.r)) best = p; }
    placed.push({ ...c, p:best || c.p });
  }
  return placed;
}
// a fresh heap: drop each capsule into the lowest free spot of many random tries
function freshPile(seed=7, n=24){
  const rnd = rng(seed), placed = [];
  for (let i=0;i<n;i++){
    const r = 3.7 + rnd()*.5; let best = null;
    for (let k=0;k<600;k++){
      const a = rnd()*2*Math.PI, d = Math.sqrt(rnd())*(GR - r), p = [CX + Math.cos(a)*d, CY + Math.sin(a)*d, FLOOR + r + rnd()*30];
      if ((!best || p[2] < best[2]) && fits(placed, p, r)) best = p;
    }
    const th = Math.acos(lerp(-1, .35, rnd())), ph = rnd()*2*Math.PI;   // mostly coloured half down
    placed.push({ id:i, r, p:best, col:CAP_COLS[Math.floor(rnd()*CAP_COLS.length)], k:[Math.sin(th)*Math.cos(ph), Math.sin(th)*Math.sin(ph), Math.cos(th)] });
  }
  return placed;
}

/* ---------- prizes (local base b = bottom centre) ---------- */
const bb = (c, u, v) => [c[0] + u*.7071, c[1] - u*.7071, c[2] + v];     // billboard plane facing the viewer
const bbPts = (c, uv) => uv.map(([u,v]) => bb(c, u, v));
const dot2 = (c, r=.36, col=INK) => { const q = P(...c); return C2(q, r, col); };
function prizeArt(kind, b, k=1.3){
  // local helpers, everything scaled by k
  const up = dz => add(b, [0,0,dz*k]), Q = (c,u,v) => bb(c, u*k, v*k);
  const QP = (c, uv) => uv.map(([u,v]) => Q(c,u,v)), SP = (c, uv) => QP(c, uv).map(q => P(...q));
  const B = (c, r, m, w=.9) => ball(c, r*k, m, w), dotK = (c, r, col) => dot2(c, r*k, col);
  let s = '';
  if (kind === 'duck'){
    const Y = matOf('#f6c935'), c0 = up(2.6), c1 = Q(c0, 1.2, 3);
    s += shape(QP(c0, [[-2,.5],[-3.7,2.5],[-1.4,1.7]]), Y.m, .8);
    s += B(c0, 2.8, Y) + ink(poly(SP(c0, [[-1.7,.5],[-.3,-.6],[.9,.3]]), false), .7);
    s += B(c1, 1.95, Y);
    s += shape(QP(c1, [[1.2,.1],[3.3,-.3],[1.2,-.9]]), '#f08a2b', .7);
    s += dotK(Q(c1, .55, .55), .34) + dotK(Q(c1, -.3, -.5), .42, '#f3a3a0');
  } else if (kind === 'star'){
    const c = up(4.4), pts = [];
    for (let i=0;i<10;i++){ const a = Math.PI/2 + i*Math.PI/5, rr = i%2 ? 1.6 : 3.7; pts.push([rr*Math.cos(a), rr*Math.sin(a)]); }
    s += shape(QP(add(c, [-.9*k,0,.3*k]), pts), '#d49c1f', 1);
    s += shape(QP(c, pts), '#ffd84a', 1.1);
    s += dotK(Q(c, -.8, .4), .32) + dotK(Q(c, .8, .4), .32);
    s += dotK(Q(c, -1.4, -.2), .38, '#f3a3a0') + dotK(Q(c, 1.4, -.2), .38, '#f3a3a0');
    s += ink(poly(SP(c, [[-.6,-.5],[0,-1],[.6,-.5]]), false), .6);
    s += fill(poly(SP(c, [[-1.4,1.9],[-.9,2.4],[-1.7,2.6]])), '#ffffff', 'opacity=".8"');
  } else if (kind === 'cat'){
    const O = matOf('#f2a65a'), c = up(3.4);
    for (const sx of [-1, 1]){
      s += shape(QP(c, [[sx*2.7,1.2],[sx*2.4,4.3],[sx*.6,2.5]]), O.m, .9);
      s += fill(poly(SP(c, [[sx*2.3,1.9],[sx*2.15,3.5],[sx*1.2,2.5]])), '#f3a3a0');
    }
    s += B(c, 3.1, O);
    s += fill(poly(SP(c, [[-.9,3],[0,2.2],[.9,3],[0,3.6]])), mix(O.m,'#000000',.12));
    for (const sx of [-1, 1]){
      s += ink(poly(SP(c, [[sx*1.6,.4],[sx*1.1,.95],[sx*.6,.4]]), false), .75);
      s += ink(poly(SP(c, [[sx*1.7,-.6],[sx*3.6,-.2]]), false), .45);
      s += ink(poly(SP(c, [[sx*1.7,-1],[sx*3.5,-1.3]]), false), .45);
      s += dotK(Q(c, sx*1.9, -.35), .45, '#f37f8a');
    }
    s += shape(QP(c, [[-.45,-.3],[.45,-.3],[0,-.8]]), '#e2617a', .4);
    s += ink(poly(SP(c, [[-.8,-1.1],[-.4,-1.4],[0,-1],[.4,-1.4],[.8,-1.1]]), false), .5);
  } else if (kind === 'robot'){
    const Hd = matOf('#9fc0cf'), [x,y,z] = b, K = v => v*k;
    s += box(x-K(1.9), y-K(1.9), z, x+K(1.9), y+K(1.9), z+K(3.6), METAL, toneI, .9);
    s += shape(on(PX(x+K(1.9)+.05), rectUV(y-K(1.1), z+K(1), y+K(1.1), z+K(2.6))), '#1d2a26', .5);
    s += dot2([x+K(1.9)+.1, y+K(.5), z+K(1.8)], K(.3), '#e2483d') + dot2([x+K(1.9)+.1, y-K(.4), z+K(1.8)], K(.3), '#43c25c');
    s += box(x-K(1.6), y-K(1.6), z+K(3.6), x+K(1.6), y+K(1.6), z+K(6.6), Hd, toneI, .9);
    for (const dy of [-.8, .8]) s += shape(on(PX(x+K(1.6)+.05), ellUV(y+K(dy), z+K(5.4), K(.55), K(.55), 10)), '#ffd84a', .5);
    s += line([[x+K(1.6)+.05, y-K(.8), z+K(4.3)],[x+K(1.6)+.05, y+K(.8), z+K(4.3)]], .6);
    s += line([[x, y, z+K(6.6)],[x, y, z+K(8.3)]], .8) + ball([x, y, z+K(8.6)], K(.65), matOf('#e2483d'), .6);
  } else if (kind === 'dino'){
    const Gm = matOf('#5cc46a'), c0 = up(2.6), c1 = Q(c0, 1, 3.5);
    s += shape(QP(c0, [[-1.6,-.4],[-4.6,-1.6],[-1.8,1]]), Gm.m, .8);
    s += shape(QP(c1, [[-1.4,1.4],[-1.6,3.2],[-.4,2]]), '#f6c935', .7);
    s += shape(QP(c0, [[-2.4,1.6],[-3.4,3.2],[-1.6,2.6]]), '#f6c935', .7);
    s += shape(QP(c0, [[-2.8,-.2],[-4.1,1],[-2.6,1]]), '#f6c935', .7);
    s += B(c0, 2.9, Gm);
    s += fill(poly(SP(Q(c0,.7,-.5), ellUV(0,0,1.4,1.6,16))), '#d9efb0');
    s += B(c1, 2.2, Gm);
    s += dotK(Q(c1, .7, .5), .36) + dotK(Q(c1, 1.4, -.4), .2) + dotK(Q(c1, -.2, -.4), .4, '#f3a3a0');
  }
  return s;
}

/* ---------- state ---------- */
const st = { pal:'blush', coin:false, coinT:null, crank:0, turn:null, jig:null, roll:null, out:null, pile:freshPile(), served:0 };
const PRIZE_KEYS = Object.keys(PRIZES);

/* ---------- the dispensed capsule's path: chute -> lip -> drop -> bounce -> rest ---------- */
function rollPose(u){
  const x0 = W - 10, xLip = W + 5, xLand = W + 9.5, z0 = CH.z0 + CAP_R;
  let x, z;
  if (u < .36){ const t = u/.36; x = lerp(x0, xLip, t*t*(1.6 - .6*t)); z = z0; }
  else if (u < .54){ const t = (u-.36)/.18; x = lerp(xLip, xLand, t); z = z0 - CH.z0*t*t; }
  else { const t = (u-.54)/.46, k = 1 - Math.pow(1-t, 2.2); x = lerp(xLand, REST[0], k);
         z = CAP_R + (t < .45 ? 2.4*Math.sin(Math.PI*t/.45) : t < .7 ? .6*Math.sin(Math.PI*(t-.45)/.25) : 0); }
  const a = (x - x0)/(REST[0] - x0) * 2*Math.PI;
  const y = u < .54 ? 20 : lerp(20, REST[1], 1 - Math.pow(1 - (u-.54)/.46, 2.2));
  return { c:[x, y, z], k:[-Math.sin(a), 0, -Math.cos(a)] };
}
function flapAngle(){
  if (st.roll == null) return 0;
  const u = st.roll.t, D2R = Math.PI/180;
  if (u < .12) return 0;
  if (u < .3) return 76*ease((u-.12)/.18)*D2R;
  if (u < .58) return 76*D2R;
  const t = (u-.58)/.42;
  return 76*D2R*Math.max(0, Math.cos(t*Math.PI*1.5)*Math.exp(-3*t)*(1-t) + (1-t)*(t<.33?1-3*t:0)*0);
}

/* ---------- pieces ---------- */
function crankArt(theta){
  const hub = [PLATE.y, PLATE.z], cs = Math.cos(theta), sn = Math.sin(theta);
  const rot = ([a, b]) => [hub[0] + a*cs - b*sn, hub[1] + a*sn + b*cs];
  const wing = rrUV(-10.5, -2.7, 10.5, 2.7, 2.7, 6).map(rot);
  let s = cylX(W+1.2, W+3.2, hub[0], hub[1], 4.6, METAL, toneI, 1.1, 24);
  s += loft(on(PX(W+3.2), wing), on(PX(W+5.4), wing), n => toneI(n, METAL));
  s += fill(pd(on(PX(W+5.4), wing)), METAL.l) + hullInk([...on(PX(W+3.2), wing), ...on(PX(W+5.4), wing)], 1.3) + ink(pd(on(PX(W+5.4), wing)), .9);
  s += `<path d="${pd([[W+5.45, ...rot([-7.5,0])],[W+5.45, ...rot([-2.6,0])]], false)}" stroke="#ffffff" stroke-width="1" opacity=".7" stroke-linecap="round"/>`;
  s += cylX(W+5.4, W+6.4, hub[0], hub[1], 2.2, METAL, toneI, .9, 16);
  const kn = rot([7.6, 0]), m = PALS[st.pal];
  s += cylX(W+5.4, W+11.5, kn[0], kn[1], 2.5, { l:m.l, m:m.m, d:m.d }, toneI, 1.1, 20);
  s += fill(pd(on(PX(W+11.55), ellUV(kn[0]-.5, kn[1]+.7, .9, .7, 10))), '#ffffff', 'opacity=".7"');
  return s;
}
function coinArt(){
  if (st.coinT == null) return '';
  const t = st.coinT, zc = (SLOT[1] + SLOT[3])/2;
  let x, z;
  if (t < .45){ const k = ease(t/.45); x = lerp(W + 12, W + 4, k); z = lerp(zc + 8, zc, k) + 3*Math.sin(Math.PI*k); }
  else { const k = ease((t-.45)/.55); x = lerp(W + 4, W - 2, k); z = zc; }
  const yf = facing([0,1,0]) ? 1 : -1;            // the coin face toward the viewer
  const A = on(PY(20 - .4*yf), ellUV(x, z, 2.6, 2.6, 18)), B = on(PY(20 + .4*yf), ellUV(x, z, 2.6, 2.6, 18));
  let s = loft(A, B, n => toneI(n, COIN)) + fill(pd(B), COIN.l) + ink(sp(hull([...A,...B].map(p => P(...p)))), .8) + ink(pd(on(PY(20 + .45*yf), ellUV(x, z, 1.6, 1.6, 14))), .45);
  return clipTo(on(PY(20), rectUV(W + 1.25, 0, W + 40, 120)), s);
}
function flapArt(){
  const ph = flapAngle(), d = [Math.sin(ph), 0, -Math.cos(ph)], n = [Math.cos(ph), 0, Math.sin(ph)], t = 1;
  const Q = (s, w, y) => [HINGE[0] + s*d[0] + w*n[0], y, HINGE[1] + s*d[2] + w*n[2]];
  const y0 = CH.y0 + .6, y1 = CH.y1 - .6, L = FLAP_L, MAT = { l:'#6a6460', m:'#4b4642', d:'#2e2b28' };
  let s = '';
  if (vis(d)) s += shape([Q(L,0,y0),Q(L,0,y1),Q(L,t,y1),Q(L,t,y0)], toneI(d, MAT), .9);
  s += fill(pd([Q(0,t,y0),Q(0,t,y1),Q(L,t,y1),Q(L,t,y0)]), MAT.m, 'fill-opacity=".42"') + ink(pd([Q(0,t,y0),Q(0,t,y1),Q(L,t,y1),Q(L,t,y0)]), 1.1);
  const ys = facing([0,1,0]) ? y1 : y0;            // the flap edge toward the viewer
  s += shape([Q(0,0,ys),Q(L,0,ys),Q(L,t,ys),Q(0,t,ys)], MAT.l, .7);
  s += fill(pd([Q(L*.2,t+.05,y0+2),Q(L*.2,t+.05,y0+5),Q(L*.85,t+.05,y0+10),Q(L*.85,t+.05,y0+7)]), '#ffffff', 'opacity=".3"');
  s += shape([Q(L-2.4,t+.05,16.5),Q(L-2.4,t+.05,23.5),Q(L-1,t+.05,23.5),Q(L-1,t+.05,16.5)], MAT.d, .6);
  s += cylX(W, W+1.8, CH.y0 + .2, CH.z1, .9, METAL, toneI, .7, 10) + cylX(W, W+1.8, CH.y1 - .2, CH.z1, .9, METAL, toneI, .7, 10);
  return s;
}

/* ---------- globe ---------- */
function globeLight(){   // screen direction toward the sun (follows the light slider; L is already in viewer space)
  const d = [(L[0]-L[1])*C, (L[0]+L[1])*S - L[2]], l = Math.hypot(...d); return [d[0]/l, d[1]/l];
}
function pileNow(){
  const T = st.turn;
  let list = st.pile.map(c => ({ ...c }));
  if (T){
    const t = T.t;
    if (t >= .5){ const k = ease(clamp((t - .5)/.45));
      list = T.next.map(c => { const o = st.pile.find(q => q.id === c.id); return { ...c, p:o.p.map((v,i) => lerp(v, c.p[i], k)) }; }); }
    const amp = .55*Math.sin(Math.PI*t);
    list.forEach(c => { const h = c.id*1.7; c.p = [c.p[0] + amp*Math.sin(t*23 + h), c.p[1] + amp*Math.cos(t*19 + h*1.3), c.p[2] + amp*.5*Math.abs(Math.sin(t*29 + h))]; });
  }
  return list;
}
function globeArt(){
  const [X, Y] = P(...G), R = GR*1.2247, l = globeLight();
  let s = `<clipPath id="cGlobe"><circle cx="${f(X)}" cy="${f(Y)}" r="${f(R - .6)}"/></clipPath>`;
  let inn = C2([X,Y], R, '#c9e3ea', 'opacity=".6"');
  // far wall of the glass: a soft back rim
  inn += `<path d="M${f(X-R)} ${f(Y)}a${f(R)} ${f(R)} 0 1 0 ${f(2*R)} 0a${f(R)} ${f(R)} 0 1 0 ${f(-2*R)} 0Z M${f(X-R*.93)} ${f(Y+R*.03)}a${f(R*.93)} ${f(R*.93)} 0 1 0 ${f(2*R*.93)} 0a${f(R*.93)} ${f(R*.93)} 0 1 0 ${f(-2*R*.93)} 0Z" fill="#b6d4dc" fill-rule="evenodd" opacity=".35"/>`;
  const caps = pileNow().sort((a,b) => depthOf(a.p) - depthOf(b.p));
  for (const c of caps) inn += capsuleArt(c.p, c.r, c.k, c.col, .85);
  s += `<g clip-path="url(#cGlobe)">${inn}</g>`;
  // front glass: tint, shadow-side rim, big curved highlight + glint
  let gl = C2([X,Y], R, '#cfe9f0', 'opacity=".16"');
  const so = [X + l[0]*R*.16, Y + l[1]*R*.16];
  gl += `<path d="M${f(X-R)} ${f(Y)}a${f(R)} ${f(R)} 0 1 0 ${f(2*R)} 0a${f(R)} ${f(R)} 0 1 0 ${f(-2*R)} 0Z M${f(so[0]-R*.9)} ${f(so[1])}a${f(R*.9)} ${f(R*.9)} 0 1 0 ${f(2*R*.9)} 0a${f(R*.9)} ${f(R*.9)} 0 1 0 ${f(-2*R*.9)} 0Z" fill="#4f7d8a" fill-rule="evenodd" opacity=".42"/>`;
  // curved highlight: a band inside the rim on the lit side
  const ang = Math.atan2(l[1], l[0]), band = [];
  const arcBand = (a0, a1, r0, th) => { const b = [];
    for (let i=0;i<=24;i++){ const a = a0 + (a1-a0)*i/24; b.push([X + Math.cos(a)*R*r0, Y + Math.sin(a)*R*r0]); }
    for (let i=24;i>=0;i--){ const a = a0 + (a1-a0)*i/24, w = Math.pow(Math.sin(Math.PI*i/24), .7); b.push([X + Math.cos(a)*R*(r0 - th*w), Y + Math.sin(a)*R*(r0 - th*w)]); }
    return poly(b); };
  gl += fill(arcBand(ang - 1.5, ang + .6, .9, .25), '#ffffff', 'opacity=".92"');
  gl += fill(arcBand(ang + .95, ang + 1.25, .9, .1), '#ffffff', 'opacity=".7"');
  const g1 = [X + Math.cos(ang + 1.25)*R*.72, Y + Math.sin(ang + 1.25)*R*.72];
  gl += `<ellipse cx="${f(g1[0])}" cy="${f(g1[1])}" rx="${f(R*.075)}" ry="${f(R*.045)}" transform="rotate(${f((ang+1.25)*180/Math.PI + 90)} ${f(g1[0])} ${f(g1[1])})" fill="#ffffff" opacity=".7"/>`;
  const ref = [];   // faint reflection on the shadow side
  for (let i=0;i<=14;i++){ const a = ang + Math.PI - .55 + 1.1*i/14; ref.push([X + Math.cos(a)*R*.8, Y + Math.sin(a)*R*.8]); }
  gl += `<path d="${poly(ref, false)}" fill="none" stroke="#ffffff" stroke-width="1.1" stroke-linecap="round" opacity=".45"/>`;
  s += act('globe', `<g pointer-events="none">${gl}</g>` + C2([X,Y], R, 'transparent'));
  s += C2([X,Y], R, 'none', `stroke="${INK}" stroke-width="2.4"`);
  return s;
}

/* ---------- the dispensed capsule (rolling, resting or open) ---------- */
function groundCapsule(){
  if (st.roll){
    const { c, k } = rollPose(st.roll.t);
    return capsuleArt(c, CAP_R, k, st.roll.col, 1);
  }
  if (!st.out) return '';
  // the resting / opened capsule is shown the same way from every side (the prize faces whoever looks)
  return asSeen(REST, restCapsule);
}
function restCapsule(c){
  const o = st.out.open, col = st.out.col, cm = matOf(col), pale = mix(col, '#ffffff', .8);
  if (o <= 0) return act('capsule', capsuleArt(c, CAP_R, [0,0,-1], col, 1));
  const ph = 112*ease(clamp(o))*Math.PI/180, hd = norm([1,-1,0]);
  const p = add(scl([0,0,1], Math.cos(ph)), scl(hd, Math.sin(ph)));
  const h = add(c, scl(hd, CAP_R)), ctop = add(h, add(scl(hd, -CAP_R*Math.cos(ph)), [0,0,CAP_R*Math.sin(ph)]));
  const top = hemiArt(ctop, CAP_R, p, pale, mix(col, '#ffffff', .62), .9);
  const prizeZ = c[2] - 4.2 + 3.2*ease(clamp((o - .25)/.75));
  // bottom bowl: inside (rim ellipse), prize, then the outer front crescent over the prize's foot
  const { X, Y, R, mn, arc } = rimFrame(c, CAP_R, [0,0,-1]);
  const ell = poly(arc(0, 2*Math.PI, mn, 32));
  let bowl = fill(ell, mix(col, '#000000', .12)) + `<path d="${ell}" fill="none" stroke="${INK}" stroke-width=".7"/>`;
  bowl += prizeArt(st.out.prize, [c[0], c[1], prizeZ]);
  const cres = poly([...arc(0, Math.PI, R), ...arc(Math.PI, 0, mn)]);
  bowl += fill(cres, cm.l);
  bowl += sphereShade(X, Y, R, false).replace('opacity=".16"', 'opacity=".16" clip-path="url(#cBowl)"');
  bowl += `<clipPath id="cBowl"><path d="${cres}"/></clipPath>`;
  bowl += C2([X + L2[0]*R*.3 + R*.35, Y + R*.55], R*.11, '#ffffff', 'opacity=".75"');
  bowl += ink(cres, 1);
  return act('capsule', bowl + top);
}

/* ---------- the faces of the base ---------- */
// left side (+y): GACHA decal with three capsules
function sideLeftArt(m){
  const sideM = tone([0,1,0], m), decal = mix(sideM, '#ffffff', .14);
  let s = shape(on(PY(D+.2), rrUV(5, 9, W-5, 43, 6)), decal, 1.2);
  s += txY(W/2, D+.3, 30, 'GACHA', 8.4, mix(sideM, '#000000', .4), 800);
  for (const [x, z, col] of [[11, 18, '#e2473a'], [20, 16.5, '#f2c230'], [29, 18, '#3e86d9']]){
    const ring = on(PY(D+.3), ellUV(x, z, 3, 3, 20)), lowH = on(PY(D+.3), [...arcUV(x, z, 3, 180, 360, 10)]);
    s += fill(pd(ring), mix(col, '#ffffff', .75)) + fill(pd(lowH), col) + ink(pd(ring), .8) + ink(pd(on(PY(D+.3), [[x-3, z], [x+3, z]]), false), .5);
  }
  return s;
}
// right side (−y): the same decal style, a different doodle — a smiling capsule with sparkles
function sideRightArt(m){
  const sf = tone([0,-1,0], m), decal = mix(sf, '#ffffff', .14), Y = PY(-.3), on3 = uv => on(Y, uv);
  let s = shape(on(PY(-.2), rrUV(5, 9, W-5, 43, 6)), decal, 1.2);
  s += txR(W/2, -.3, 36, 'GACHA', 6.6, mix(sf, '#000000', .4), 800);
  const cx = W/2, cz = 21, r = 7.2, col = '#38a565';
  s += fill(pd(on3(ellUV(cx, cz, r, r, 28))), mix(col, '#ffffff', .78));
  s += fill(pd(on3(arcUV(cx, cz, r, 180, 360, 14))), col);
  s += ink(pd(on3(ellUV(cx, cz, r, r, 28))), 1) + ink(pd(on3([[cx-r, cz], [cx+r, cz]]), false), .6);
  s += fill(pd(on3(arcUV(cx - 2.6, cz + 3.6, 1.6, 100, 170, 6).concat([[cx - 2.6, cz + 3.6]]))), '#ffffff', 'opacity=".75"');
  for (const sx of [-1, 1]){
    s += fill(pd(on3(ellUV(cx + sx*2.5, cz + 3.2, .75, .95, 10))), INK);
    s += fill(pd(on3(ellUV(cx + sx*4.5, cz + 1.4, 1.1, .7, 10))), '#f3a3a0');
  }
  s += ink(pd(on3(arcUV(cx, cz + 2.4, 1.5, 200, 340, 8)), false), .7);
  // sparkles (four-point stars) and a couple of dots
  const star = (x, z, a, c) => { const p = []; for (let i=0;i<8;i++){ const ang = i*Math.PI/4, rr = i%2 ? a*.32 : a; p.push([x + rr*Math.cos(ang), z + rr*Math.sin(ang)]); } return shape(on3(p), c, .6); };
  s += star(9.5, 29.5, 2.6, '#f2c230') + star(31, 14, 2.1, '#3e86d9') + star(30.5, 28.5, 1.6, '#e2473a');
  s += fill(pd(on3(ellUV(10.5, 15, .7, .7, 8))), mix(sf, '#000000', .35)) + fill(pd(on3(ellUV(33, 22, .55, .55, 8))), mix(sf, '#000000', .35));
  return s;
}
// back (−x): service door with key lock + REFILL label, maker's sticker, coin-box hatch, corner screws
function backArt(m){
  const bf = tone([-1,0,0], m), X = x => PX(-x), dk = mix(bf, '#000000', .3);
  const screw = (y, z, r=.75) => shape(on(X(.25), ellUV(y, z, r, r, 10)), METAL.m, .6) + ink(pd(on(X(.3), [[y - r*.7, z], [y + r*.7, z]]), false), .45);
  let s = '';
  // service door
  s += shape(on(X(.15), rrUV(5, 17, 35, 48.5, 2.4)), mix(bf, '#ffffff', .06), 1.4);
  s += `<path d="${pd(on(X(.2), rrUV(6.3, 18.3, 33.7, 47.2, 1.6)))}" fill="none" stroke="${dk}" stroke-width=".7"/>`;
  for (const z of [21, 42.5]) s += shape(on(X(.3), rectUV(3.7, z, 6.3, z + 3.6)), METAL.m, .7) + ink(pd(on(X(.35), [[5, z], [5, z + 3.6]]), false), .45);
  // REFILL label
  s += shape(on(X(.3), rrUV(11, 39.6, 25, 45, 1.2)), '#fff4d6', .9);
  s += txB(-.45, 18, 41, 'REFILL', 3.4, m.d, 800);
  // key lock: a short metal barrel with a keyhole
  { const ly = 30, lz = 32, A = on(X(.1), ellUV(ly, lz, 2.2, 2.2, 18)), B = on(X(1.3), ellUV(ly, lz, 2.2, 2.2, 18));
    s += loft(A, B, n => toneI(n, METAL)) + fill(pd(B), toneI([-1,0,0], METAL)) + hullInk([...A, ...B], 1) + ink(pd(B), .7);
    s += ink(pd(on(X(1.35), ellUV(ly, lz, 1.5, 1.5, 16))), .4);
    s += fill(pd(on(X(1.4), ellUV(ly, lz + .45, .5, .5, 10))), '#26231f') + fill(pd(on(X(1.4), rectUV(ly - .25, lz - 1, ly + .25, lz + .45))), '#26231f'); }
  // maker's sticker
  s += shape(on(X(.3), rectUV(8.5, 21, 22.5, 29.5)), '#f7f3ea', .7);
  s += fill(pd(on(X(.35), rectUV(8.5, 27.6, 22.5, 29.5))), '#e2473a');
  s += txB(-.45, 15.5, 25.7, 'COLORFIG CO.', 1.7, INK, 800);
  s += txB(-.45, 15.5, 23.7, 'MODEL CG-07', 1.35, '#5b554a', 700);
  s += txB(-.45, 15.5, 21.9, 'No. 0723 · 100¥', 1.2, '#5b554a', 600);
  // coin-box hatch
  s += shape(on(X(.2), rrUV(9, 3.6, 31, 13.4, 1.4)), METAL.m, 1.1);
  s += ink(pd(on(X(.25), rrUV(10, 4.6, 30, 12.4, 1))), .45);
  s += shape(on(X(.3), rrUV(12.5, 7, 21.5, 9, 1)), '#26231f', .6);
  s += txB(-.4, 17, 10.3, 'COIN BOX', 1.6, '#4a4540', 800);
  s += shape(on(X(.3), ellUV(26.5, 8.5, 1.3, 1.3, 14)), METAL.l, .7) + fill(pd(on(X(.35), rectUV(26.3, 7.7, 26.7, 9.3))), '#26231f');
  for (const [y, z] of [[10.2, 5.1], [29.8, 5.1], [10.2, 11.9], [29.8, 11.9]]) s += screw(y, z, .45);
  // corner screws of the back panel
  for (const [y, z] of [[2.6, 2.6], [37.4, 2.6], [2.6, 49.4], [37.4, 49.4]]) s += screw(y, z);
  return s;
}

/* ---------- scene ---------- */
// is a free-standing point (outside the base's footprint) in front of the machine in this view?
const inFront = p => (p[0] > W && facing([1,0,0])) || (p[0] < 0 && facing([-1,0,0])) || (p[1] > D && facing([0,1,0])) || (p[1] < 0 && facing([0,-1,0]));
function scene(st, m){
  let s = '';
  const sph = [];
  for (let i=0;i<16;i++){ const a = i/16*2*Math.PI; for (const zz of [-.6, 0, .6, .9]) { const rr = GR*Math.sqrt(1 - zz*zz); sph.push([G[0] + rr*Math.cos(a), G[1] + rr*Math.sin(a), G[2] + GR*zz]); } }
  const shadowPts = [...on(PX(0), OUT), ...on(PX(W), OUT), [-1.5,-1.5,SLAB],[41.5,-1.5,SLAB],[41.5,41.5,SLAB],[-1.5,41.5,SLAB], ...sph, [CX,CY,CAP_TOP+4]];
  s += castShadow(shadowPts);
  const cap = st.roll ? rollPose(st.roll.t).c : st.out ? REST : null;
  if (cap && (!st.roll || st.roll.t > .45)) s += castShadow(ellUV(cap[0], cap[1], CAP_R*.95, CAP_R*.95, 16).map(([x,y]) => [x, y, Math.max(0, cap[2] - CAP_R)]));

  const front = facing([1,0,0]), F = PX(W), fr = tone([1,0,0], m);
  const inChute = st.roll && rollPose(st.roll.t).c[0] < W - 1.2;
  const rc = st.roll && !inChute ? rollPose(st.roll.t).c : null;
  // the capsule resting on the ground, when it is behind the machine in this view
  const restFront = st.out && !st.roll && inFront(REST);
  if (st.out && !st.roll && !restFront) s += groundCapsule();

  // things sticking out of the front: with the front turned away, draw them before the body so it hides them
  // (whatever pokes out past the silhouette — crank, flap, sill, a rolling capsule — still peeks out)
  const plateArt = () => {
    let pl = cylX(W, W+1.2, PLATE.y, PLATE.z, PLATE.r, METAL, toneI, 1.4, 36);
    pl += ink(pd(on(PX(W+1.25), ellUV(PLATE.y, PLATE.z, PLATE.r - 1.6, PLATE.r - 1.6, 36))), .5);
    for (let i=0;i<12;i++){ const a = i/12*2*Math.PI; pl += ink(pd([[W+1.25, PLATE.y + (PLATE.r-1.6)*Math.cos(a), PLATE.z + (PLATE.r-1.6)*Math.sin(a)],[W+1.25, PLATE.y + (PLATE.r-.6)*Math.cos(a), PLATE.z + (PLATE.r-.6)*Math.sin(a)]], false), .5); }
    let sl = shape(on(PX(W+1.25), rrUV(SLOT[0]-1.3, SLOT[1]-1, SLOT[2]+1.3, SLOT[3]+1, 1.4)), METAL.d, .8);
    sl += shape(on(PX(W+1.3), rrUV(...SLOT, .7)), '#26231f', .6);
    return pl + act('slot', sl) + coinArt() + act('crank', crankArt(st.crank));
  };
  const flapAndRoll = () => (rc && rc[0] < W + 9) ? groundCapsule() + act('flap', flapArt())
                                                 : act('flap', flapArt()) + (rc ? groundCapsule() : '');
  const lipArt = () => box(W, CH.y0 - 1, CH.z0 - 2, W + 5, CH.y1 + 1, CH.z0, METAL, toneI, 1);
  if (!front) s += lipArt() + plateArt() + flapAndRoll();

  // base: body, side decals, back panel
  s += extrude(OUT, 0, W, m);
  if (facing([0,1,0])) s += sideLeftArt(m);
  if (facing([0,-1,0])) s += sideRightArt(m);
  if (facing([-1,0,0])) s += shape(on(PX(0), OUT), tone([-1,0,0], m), 0) + backArt(m);

  if (front){
    // chute opening: cavity, jamb, floor, capsule inside
    const jy = facing([0,1,0]) ? CH.y0 : CH.y1;
    let ch = fill(pd(on(PX(W-13), CHUTE)), mix(m.d, '#000000', .3));
    ch += face(pd([[W-13,jy,CH.z0],[W,jy,CH.z0],[W,jy,CH.z1],[W-13,jy,CH.z1]]), mix(m.d, '#000000', .45));
    ch += face(pd([[W-13,CH.y0,CH.z0],[W,CH.y0,CH.z0],[W,CH.y1,CH.z0],[W-13,CH.y1,CH.z0]]), mix(m.d, '#ffffff', .1));
    if (inChute) ch += groundCapsule();
    s += clipTo(on(PX(W), CHUTE), ch);

    // front face with the chute hole
    s += `<path d="${pd(on(F, OUT))}${pd(on(F, CHUTE))}" fill="${fr}" fill-rule="evenodd"/>`;
    s += ink(pd(on(F, CHUTE)), 1.7);
    // chute lip (metal sill the capsule rolls over)
    s += lipArt();
    // price label: lights up with a coin in
    const lit = st.coin;
    if (lit) s += fill(pd(on(PX(W+.2), rrUV(5.5, 41.6, 34.5, 52.8, 4))), '#ffe27a', 'opacity=".45"');
    s += shape(on(PX(W+.3), rrUV(8, 44, 32, 50.4, 1.6)), lit ? '#ffe58a' : '#fff4d6', 1.2);
    s += tx(W+.45, 20, 45.6, '100¥', 4.8, lit ? '#c8322a' : m.d, 800);
    s += shape(on(PX(W+.3), ellUV(4.6, 47.2, 1.3, 1.3, 12)), lit ? '#43c25c' : '#e2483d', .7);
    if (lit){ const [lx, ly] = P(W+.4, 4.6, 47.2); s += C2([lx, ly], 3.6, '#8af0ae', 'opacity=".35"'); }
    // turn arrow above the plate
    const arr = []; for (let i=0;i<=14;i++){ const a = (148 - 116*i/14)*Math.PI/180; arr.push([W+.3, PLATE.y + 13.2*Math.cos(a), PLATE.z + 13.2*Math.sin(a)]); }
    s += `<path d="${pd(arr, false)}" fill="none" stroke="${mix(fr,'#000000',.4)}" stroke-width="1.1" stroke-linecap="round" stroke-dasharray="2 1.6"/>`;
    { const a = 150*Math.PI/180, ae = arr[0], tg = [-Math.sin(a), Math.cos(a)], nm = [Math.cos(a), Math.sin(a)];
      s += fill(pd([[W+.3, ae[1] + tg[0]*2.2, ae[2] + tg[1]*2.2],[W+.3, ae[1] + nm[0]*1.3, ae[2] + nm[1]*1.3],[W+.3, ae[1] - nm[0]*1.3, ae[2] - nm[1]*1.3]]), mix(fr,'#000000',.4)); }
    // coin / crank plate, then the flap + rolling capsule (the capsule passes under the open flap)
    s += plateArt();
    s += flapAndRoll();
  }

  // top slab + collar floor
  s += box(-1.5, -1.5, BH, 41.5, 41.5, SLAB, m, tone, 1.3);
  s += hullInk([...on(PX(0), OUT), ...on(PX(W), OUT), [-1.5,-1.5,SLAB],[41.5,-1.5,SLAB],[41.5,41.5,SLAB],[-1.5,41.5,SLAB],[41.5,41.5,BH],[41.5,-1.5,BH],[-1.5,41.5,BH],[-1.5,-1.5,BH]], 2.8);
  if (front) s += ink(pd(on(F, OUT)), 2.2);
  if (facing([-1,0,0])) s += ink(pd(on(PX(0), OUT)), 2.2);
  const ringA = (z, r, n=40) => on(PZ(z), ellUV(CX, CY, r, r, n));
  s += loft(ringA(SLAB, COLLAR_R), ringA(FLOOR, COLLAR_R), n => tone(n, m));
  s += fill(pd(ringA(FLOOR, COLLAR_R)), tone([0,0,1], m));
  s += fill(pd(ringA(FLOOR+.05, 13.5)), mix(tone([0,0,1], m), '#000000', .18)) + fill(pd(ringA(FLOOR+.1, 4.6, 20)), mix(m.d, '#000000', .3));

  // globe + capsules
  s += globeArt();

  // collar front: the half ring in front of the glass (the half toward the viewer), and the band
  const fr0 = [], fr1 = [], tv = unrot([1,1,0]), a0 = Math.atan2(tv[1], tv[0])*180/Math.PI - 90;
  for (let i=0;i<=24;i++){ const a = (a0 + 180*i/24)*Math.PI/180; fr0.push([CX + COLLAR_R*Math.cos(a), CY + COLLAR_R*Math.sin(a), FLOOR]); fr1.push([CX + 13.5*Math.cos(a), CY + 13.5*Math.sin(a), FLOOR]); }
  s += fill(pd([...fr0, ...fr1.reverse()]), tone([0,0,1], m));
  s += loft(ringA(SLAB, COLLAR_R), ringA(FLOOR, COLLAR_R), n => tone(n, m));
  s += ink(pd(fr1.reverse(), false), .9);
  const fb = fr0.map(([x,y]) => [x, y, SLAB]);
  s += ink(pd([...fr0.slice().reverse(), ...fb]), 1.6);
  s += ink(pd(fr0, false), 1.2);

  // metal cap on top of the globe
  s += cyl(CX, CY, CAP_TOP, CAP_TOP + 2.6, 6.6, METAL, toneI, 1.3, 28);
  s += cyl(CX, CY, CAP_TOP + 2.6, CAP_TOP + 3.6, 4.8, METAL, toneI, 1, 24);
  s += ball([CX, CY, CAP_TOP + 4.6], 2.2, matOf(m.l), 1.1);

  // dispensed capsule on the ground, in front of the machine
  if (restFront) s += groundCapsule();
  return s;
}
/* ---------- behaviour ---------- */
let UI;
const readout = st => {
  if (st.coinT != null) return 'Clink — coin going in…';
  if (st.turn){ const n = Math.min(4, Math.floor(st.turn.t*4 + .15)); return 'Turning — ' + (n ? Array(n).fill('click').join(' · ') : '…'); }
  if (st.roll) return st.roll.t < .3 ? 'Ka-chunk! Something is coming down the chute…' : 'A capsule rolls out…';
  if (st.out){
    if (st.out.open >= 1) return `You got: ${PRIZES[st.out.prize]}${st.out.prize === 'star' ? ' (rare!)' : ''} — click to clear`;
    if (st.out.open > 0) return 'Opening…';
    return 'A capsule! Click it to open';
  }
  if (!st.pile.length) return 'Sold out — refill the globe';
  return st.coin ? 'Coin in — the price lights up. Turn the crank' : `Insert a coin (100¥) — ${st.pile.length} capsules left`;
};
function kick(){
  if (st._run) return; st._run = true;
  UI.animate(dt => { const more = step(dt); if (!more) st._run = false; return more; });
}
function step(dt){
  let a = false;
  if (st.coinT != null){ st.coinT += dt/.75; a = true; if (st.coinT >= 1){ st.coinT = null; st.coin = true; } }
  if (st.jig){ st.jig.t += dt/.5; const t = st.jig.t; st.crank = .22*Math.sin(t*Math.PI*3)*(1-t); a = true; if (t >= 1){ st.jig = null; st.crank = 0; } }
  if (st.turn && !st.turn.frozen){
    st.turn.t += dt/2; a = true;
    const t = clamp(st.turn.t), q = Math.min(3.999, t*4);
    st.crank = (Math.floor(q) + ease(clamp((q % 1)/.6)))*Math.PI/2;
    if (t >= 1){ st.crank = 0; st.pile = st.turn.next; st.roll = { t:0, col:st.turn.drop.col }; st.turn = null; }
  }
  if (st.roll){ st.roll.t += dt/1.6; a = true;
    if (st.roll.t >= 1){ st.out = { col:st.roll.col, prize:PRIZE_KEYS[Math.floor(Math.random()*PRIZE_KEYS.length)], open:0 }; st.roll = null; st.coin = false; } }
  if (st.out && st.out.opening){ st.out.open = Math.min(1, st.out.open + dt/.8); a = true; if (st.out.open >= 1) st.out.opening = false; }
  return a;
}
const busy = () => st.coinT != null || (st.turn && !st.turn.frozen) || st.roll || st.jig;
function insertCoin(st, ui){
  if (busy()) return;
  if (st.coin) return ui.flash('There is already a coin in — turn the crank');
  if (!st.pile.length) return ui.flash('Sold out — refill first');
  if (st.out) return ui.flash('Take your capsule first');
  st.coinT = 0; kick();
}
function prepareTurn(seed){
  const pile = st.pile, low = pile.reduce((a,b) => (b.p[2] - .3*Math.hypot(b.p[0]-CX, b.p[1]-CY)) < (a.p[2] - .3*Math.hypot(a.p[0]-CX, a.p[1]-CY)) ? b : a);
  const rest = pile.filter(c => c !== low).sort((a,b) => a.p[2] - b.p[2]);
  return { t:0, drop:low, next:settle(rest, rng(seed)) };
}
function turnCrank(st, ui){
  if (st.turn && st.turn.frozen){ st.turn.frozen = false; kick(); return; }
  if (busy()) return;
  if (st.out) return ui.flash('Take your capsule first — click it');
  if (!st.coin){ ui.flash('Insert a coin first'); st.jig = { t:0 }; kick(); return; }
  if (!st.pile.length) return ui.flash('Sold out');
  st.turn = prepareTurn(st.served++ * 31 + 5); kick();
}
function clickCapsule(st, ui){
  if (!st.out || st.roll) return;
  if (st.out.open <= 0){ st.out.opening = true; kick(); return; }
  if (st.out.open >= 1){ const n = PRIZES[st.out.prize]; st.out = null; ui.flash(`${n} added to your collection`); }
}

UI = mountFigure({
  fig:'13', title:'Capsule toy machine', hint:'insert a coin, turn the crank, open the capsule',
  idea:"Each turn of the crank lines up one capsule-sized hole, so exactly one capsule drops out for each coin.",
  size:[62, 42, 97], center:[CX, CY], views:true, palette:'blush', state:st,
  scene,
  readout,
  buttonsLabel:'Machine',
  buttons:[
    { label:'Insert coin', onClick:(st, ui) => insertCoin(st, ui) },
    { label:'Turn crank', onClick:(st, ui) => turnCrank(st, ui) },
    { label:'Open capsule', onClick:(st, ui) => !st.out ? ui.flash('No capsule yet') : st.out.open > 0 ? ui.flash('Already open') : clickCapsule(st, ui) },
    { label:'Put the prize away', onClick:(st, ui) => st.out && st.out.open >= 1 ? clickCapsule(st, ui) : ui.flash('Open a capsule first') },
    { label:'Refill', onClick:(st, ui) => { if (busy()) return; st.pile = freshPile(Math.floor(Math.random()*1e6)); ui.flash('Globe refilled'); } },
  ],
  next: st => busy() || (st.out && st.out.opening) ? -1 : st.out ? (st.out.open >= 1 ? 3 : 2) : !st.pile.length ? 4 : st.coin ? 1 : 0,
  stats: st => [ { label:'Credit', value: st.coin ? '100¥' : '0¥' }, { label:'Capsules left', value: st.pile.length, small:true } ],
  acts:{
    slot:(st, el, ui) => insertCoin(st, ui),
    crank:(st, el, ui) => turnCrank(st, ui),
    capsule:(st, el, ui) => clickCapsule(st, ui),
    flap:(st, el, ui) => { if (!st.out && !st.roll) ui.flash(st.coin ? 'Turn the crank to get a capsule' : 'Empty — insert a coin and turn the crank'); },
    globe:(st, el, ui) => { if (!busy()) ui.flash(`${st.pile.length} capsules inside — what will you get?`); },
  },
  params:(st, q) => {
    if (q.get('coin') === '1') st.coin = true;
    if (q.has('crank')){ const t = clamp(+q.get('crank')); st.coin = true; st.turn = prepareTurn(5); st.turn.t = t; st.turn.frozen = true;
      const qq = Math.min(3.999, t*4); st.crank = (Math.floor(qq) + ease(clamp((qq % 1)/.6)))*Math.PI/2; }
    if (q.has('insert')) st.coinT = clamp(+q.get('insert'), 0, .99);
    if (q.has('roll')){ st.roll = { t:clamp(+q.get('roll')), col:'#e2473a' }; }
    const pz = q.get('prize');
    if (q.get('capsule') === 'out' || PRIZES[pz]) st.out = { col:q.get('col') || '#3e86d9', prize:PRIZES[pz] ? pz : 'duck', open:PRIZES[pz] ? clamp(q.has('open') ? +q.get('open') : 1) : 0 };
  },
});
