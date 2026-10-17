
/* ============================================================
   Fig. 06 — Microwave (retro countertop, 1 unit ≈ 0.5 cm)
   Body x 0..80 (depth), y 0..104 (width), z 4..66 on feet.
   Door on the viewer-RIGHT, hinged at y = 3 so it swings open beside the
   cavity; control panel on the viewer-left.
   ============================================================ */
const W = 80, D = 104, H = 66, ZB = 4, BR = 9;
const OUT = rrUV(0, ZB, D, H, BR);
const CAV = { x0:36, x1:W, y0:5, y1:60, z0:10, z1:58 };          // cooking cavity (opening on the front x = W)
const DOOR = { x0:W, x1:W+3, y0:3, y1:68, z0:8, z1:62, r:4 };
const AX = DOOR.x1, AY = DOOR.y0, DOOR_MAX = 92;                  // hinge axis (outer viewer-right edge of the door)
const WIN = { y0:8, y1:58, z0:14, z1:56, r:3 };                    // window in the door
const TT = { x:62, y:22, z:12, r:16 };                             // turntable centre; plate z 12..12.9
const PLATE_TOP = 12.9;
const PANEL = { y0:71, y1:100, z0:7, z1:62 };
const DIAL = { y:86, z:43.5 };
const SPEED = 15;
const FK = 1.3;                                                    // food scale                                                  // shown seconds per real second
const FOODS = {
  popcorn: { name:'popcorn', label:'POP',   preset:120 },
  soup:    { name:'soup',    label:'SOUP',  preset:90 },
  pizza:   { name:'pizza',   label:'PIZZA', preset:45 },
};
const ORDER = ['popcorn','soup','pizza'];
const GREEN = '#43c25c', RED = '#e2483d';
const PAPER = { l:'#fbf6ea', m:'#e9dfc8', d:'#c4b89a' };
const clamp = (v,a=0,b=1) => Math.max(a, Math.min(b, v));
const hash = k => { const s = Math.sin(k*12.9898 + 78.233)*43758.5453; return s - Math.floor(s); };
const pad2 = n => String(n).padStart(2,'0');
const clock = t => { const s = Math.max(0, Math.ceil(t - 1e-6)); return Math.floor(s/60) + ':' + pad2(s%60); };

/* ---------- small helpers ---------- */
function ring(c, d, r, n=16){
  const a = Math.abs(d[2]) < .9 ? [0,0,1] : [1,0,0], u = norm(cross(d,a)), v = cross(d,u);
  return Array.from({length:n}, (_,i) => { const t=i/n*2*Math.PI, cs=Math.cos(t), sn=Math.sin(t);
    return [c[0]+r*(cs*u[0]+sn*v[0]), c[1]+r*(cs*u[1]+sn*v[1]), c[2]+r*(cs*u[2]+sn*v[2])]; });
}
function tube(pts, rs, m, w=1.1, n=16){
  const dirs = pts.map((p,i) => norm(sub(pts[Math.min(i+1,pts.length-1)], pts[Math.max(i-1,0)])));
  const R = pts.map((p,i) => ring(p, dirs[i], rs[i], n));
  let s = '';
  for (let i=0;i<R.length-1;i++) s += loft(R[i], R[i+1], nr => toneI(nr, m));
  const d1 = dirs[dirs.length-1], d0 = dirs[0].map(v=>-v);
  if (vis(d0) && rs[0] > .2) s += fill(pd(R[0]), toneI(d0,m)) + ink(pd(R[0]), w*.7);
  if (vis(d1) && rs[rs.length-1] > .2) s += fill(pd(R[R.length-1]), toneI(d1,m)) + ink(pd(R[R.length-1]), w*.7);
  return s + hullInk(R.flat(), w);
}
// text on any plane: o = baseline centre, eu = reading direction, ev = glyph up (unit 3D vectors)
function txV(o, eu, ev, str, size, col=INK, weight=700, extra=''){
  const [X,Y] = P(...o), a = Dv(...eu), b = Dv(...ev);
  return `<text transform="matrix(${a[0].toFixed(4)} ${a[1].toFixed(4)} ${(-b[0]).toFixed(4)} ${(-b[1]).toFixed(4)} ${f(X)} ${f(Y)})" font-size="${size}" fill="${col}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="${weight}" letter-spacing=".04em" ${extra}>${str}</text>`;
}
const vsub = (a,b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
// undo the view turn: the model vector / ground point that ends up at a given turned direction / place
const unV = ([x,y,z]) => { switch (VIEW & 3){ case 1: return [-y,x,z]; case 2: return [-x,-y,z]; case 3: return [y,-x,z]; default: return [x,y,z]; } };
const unXY = (a,b) => { const r = unV([a-RC[0], b-RC[1], 0]); return [r[0]+RC[0], r[1]+RC[1]]; };
// a round flexible line (cord, pin) drawn as an ink stroke under a coloured stroke, d = diameter in model units
const rope = (pts, d, col, hiCol) => { const w = d/INK_K, path = pd(pts, false);
  return `<path d="${path}" fill="none" stroke="${INK}" stroke-width="${(w+1.8).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`
       + `<path d="${path}" fill="none" stroke="${col}" stroke-width="${w.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`
       + (hiCol ? `<path d="${path}" fill="none" stroke="${hiCol}" stroke-width="${(w*.28).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>` : ''); };
// little white puff (popcorn, foam): ink rims under white fills so clusters merge
function puffs(list){
  let rims = '', fills = '', hi = '';
  for (const [c, r] of list){
    const [X,Y] = P(...c), R = r*1.2247;
    for (const [dx,dy,k] of [[0,0,1],[.72,-.3,.8],[-.62,-.42,.78],[.05,.62,.74]]){
      rims  += `<circle cx="${f(X+dx*R*.7)}" cy="${f(Y+dy*R*.7)}" r="${f(R*k*.62+.32)}"/>`;
      fills += `<circle cx="${f(X+dx*R*.7)}" cy="${f(Y+dy*R*.7)}" r="${f(R*k*.62)}"/>`;
    }
    hi += `<circle cx="${f(X-R*.25)}" cy="${f(Y-R*.3)}" r="${f(R*.2)}"/>`;
  }
  return `<g fill="${INK}">${rims}</g><g fill="#fffdf4">${fills}</g><g fill="#f2d98a" opacity=".7">${hi}</g>`;
}

/* ---------- the door: rotation about the vertical hinge axis (AX, AY) ---------- */
const doorAng = st => ease(clamp(st.door)) * DOOR_MAX * Math.PI/180;
function doorXf(th){
  const c = Math.cos(th), s = Math.sin(th);
  return { p: ([x,y,z]) => { const dx = x-AX, dy = y-AY; return [AX + dx*c + dy*s, AY - dx*s + dy*c, z]; },
           n: ([a,b,z]) => [a*c + b*s, -a*s + b*c, z] };
}

/* ---------- food on the turntable: local frame (u, v, z above the plate), rotated by st.rot ---------- */
function foodXf(st, dz=0){
  const a = st.rot, c = Math.cos(a), s = Math.sin(a);
  return ([u,v,z]) => [TT.x + FK*(u*c - v*s), TT.y + FK*(u*s + v*c), PLATE_TOP + FK*z + dz];
}
function steamArt(st, T, top, amt, n=3, len=16){
  if (amt <= .02) return '';
  let s = '';
  const sx = unV([1,-1,0]);                // the ground direction that runs left-right on screen
  for (let k=0;k<n;k++){
    const ph = k*2.1, [bu,bv] = [[-1.6,.8],[.6,-1.5],[1.9,1.4]][k], base = T([bu,bv,top]);
    const pts = [];
    for (let i=0;i<=9;i++){
      const q = i/9, w = Math.sin(q*5.2 - st.t*3.4 + ph)*(.4 + 1.9*q);
      pts.push([base[0] + w*.7*sx[0], base[1] + w*.7*sx[1], base[2] + 1 + q*len*(.85 + .15*Math.sin(st.t*1.3+ph))]);
    }
    const lo = pd(pts.slice(0,6), false), up = pd(pts.slice(5), false);
    s += `<path d="${pd(pts,false)}" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round" opacity="${f(.16*amt)}"/>`
       + `<path d="${lo}" fill="none" stroke="#ffffff" stroke-width="2.1" stroke-linecap="round" opacity="${f(.9*amt)}"/>`
       + `<path d="${up}" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" opacity="${f(.5*amt)}"/>`;
  }
  return `<g pointer-events="none">${s}</g>`;
}

// popcorn bag: a flat folded paper bag that puffs into a pillow; kernels hop while it cooks
function popcornArt(st, T){
  const p = clamp((st.heat - .06)/.72);
  const hl = 9 - .9*p, hw = 5.6 - .4*p, h = 1.1 + 6.6*p;
  const lev = [[0,1],[.2,1+.03*p],[.5,1+.02*p],[.8,1-.13*p],[1,1-.4*p]];
  const rings = lev.map(([k,sc]) => rrUV(-hl*sc, -hw*sc, hl*sc, hw*sc, Math.min(hw*sc*.9, 1 + 3.2*p), 4).map(([u,v]) => T([u,v,h*k])));
  let s = '';
  for (let i=0;i<rings.length-1;i++) s += loft(rings[i], rings[i+1], n => toneI(n, PAPER));
  const top = rings[rings.length-1], sc = lev[lev.length-1][1];
  s += fill(pd(top), PAPER.l) + ink(pd(top), .8);
  // printed red band + POP, fold creases
  const band = rrUV(-hl*sc*.55, -hw*sc*.72, hl*sc*.55, hw*sc*.72, Math.min(hw*sc*.6, 1+2*p), 4).map(([u,v]) => T([u,v,h+.03]));
  s += fill(pd(band), '#d9443a') + ink(pd(band), .6);
  const o = T([0,0,h+.05]), eu = vsub(T([1,0,0]), T([0,0,0])), ev = vsub(T([0,-1,0]), T([0,0,0]));
  const fs = 3.4*sc + .4;
  s += txV(vsub(o, ev.map(v => v*fs*.36)), eu, ev, 'POP', fs.toFixed(2), '#fff7e6', 800);
  for (const k of [-1,1]){ const u = k*hl*sc*.8;
    s += ink(pd([T([u,-hw*sc*.85,h+.04]), T([u,hw*sc*.85,h+.04])], false), .5); }
  if (p > .3){   // puffed: a little crinkle where the paper wrinkles
    s += ink(pd([T([-hl*.95,-hw*.3,h*.55]), T([-hl*.95-.3,0,h*.62]), T([-hl*.95,hw*.3,h*.55])], false), .5);
  }
  s += hullInk(rings.flat(), 1.2);
  // kernels: tiny white blobs that hop out of the bag and drop back in
  if (st.running && st.heat > .1 && st.heat < 1.04){
    const n = 2 + Math.round(6*clamp(st.heat*1.6)), list = [];
    for (let i=0;i<n;i++){
      const per = .42 + .3*hash(i+.13), cyc = st.t/per + hash(i+.57), c = Math.floor(cyc), q = (cyc - c)/.6;
      if (q > 1) continue;
      const u = (hash(i*7.1 + c*.31) - .5)*hl*sc*1.3, v = (hash(i*3.7 + c*.77) - .5)*hw*sc*1.2;
      list.push([T([u, v, h + .6 + 26*q*(1-q)*(.6+.5*hash(i+c))]), .85 + .3*hash(i*2.3)]);
    }
    list.sort((a,b) => depthOf(a[0]) - depthOf(b[0]));
    s += puffs(list);
  }
  return s;
}

// mug of tomato soup: ceramic with a red band and a handle that swings round with the turntable
function soupArt(st, T){
  const r = 5, h = 10.5, MUG = CERAMIC, BAND = matOf('#d9443a');
  const ringL = (z, rr, n=28) => ellUV(0,0,rr,rr,n).map(([u,v]) => T([u,v,z]));
  const A = ringL(0, 4.3), B = ringL(1, 5), B1 = ringL(6.4, 5), B2 = ringL(8, 5), Ct = ringL(h, 5);
  const hp = [[0,r-.4,h-2],[0,r+2.8,h-2.3],[0,r+3.5,h*.5],[0,r+2.6,2.9],[0,r-.4,2.6]].map(T);
  const front = depthOf(T([0,1,0])) - depthOf(T([0,0,0])) > 0;     // handle on the viewer's side of the mug?
  const hw = 1.25*FK/INK_K;
  const handle = `<path d="${pd(hp,false)}" fill="none" stroke="${INK}" stroke-width="${(hw+2.2).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`
               + `<path d="${pd(hp,false)}" fill="none" stroke="${MUG.m}" stroke-width="${hw.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  let s = front ? '' : handle;
  s += loft(A, B, n => toneI(n, MUG)) + loft(B, B1, n => toneI(n, MUG)) + loft(B1, B2, n => toneI(n, BAND)) + loft(B2, Ct, n => toneI(n, MUG));
  s += hullInk([...A, ...Ct], 1.2);
  // band edges (front halves only)
  s += bandLines(B1, T) + bandLines(B2, T);
  // rim, inside, soup
  const inner = ringL(h, r-.6);
  s += fill(pd(Ct), MUG.l);
  let inside = fill(pd(inner), MUG.d);
  const zl = h - 1.5, surf = ringL(zl, r-.65);
  const soup = st.heat > .5 ? '#d8582c' : '#d9662f';
  inside += fill(pd(surf), soup);
  inside += fill(pd(ellUV(-1.2,.9,2.2,1.1,16).map(([u,v]) => T([u,v,zl+.02]))), '#ec8a4c', 'opacity=".8"');
  inside += fill(pd(ellUV(1.6,-1.4,.9,.6,12).map(([u,v]) => T([u,v,zl+.03]))), '#f6c08a', 'opacity=".9"');
  if (st.running && st.heat > .35){   // simmer bubbles
    let b = '';
    for (let i=0;i<4;i++){ const q = (st.t*1.4 + hash(i)) % 1, a = hash(i+.4)*6.28, d = 2.6*hash(i+.8), rr = .25 + .5*q;
      b += pd(ellUV(Math.cos(a)*d, Math.sin(a)*d, rr, rr, 10).map(([u,v]) => T([u,v,zl+.05]))); }
    inside += `<path d="${b}" fill="#f0a070" stroke="#a8401d" stroke-width=".4"/>`;
  }
  s += clipTo(inner, inside);
  s += ink(pd(Ct), .9) + ink(pd(inner), .6);
  if (front) s += handle;
  return s;
}
function bandLines(rg, T){
  // ink only the half of a horizontal ring that faces the viewer
  const c = avg(rg), kk = p => depthOf(p) - depthOf(c) - (p[2]-c[2]), pts = rg.map(p => ({ p, k: kk(p) }));
  let best = 0; for (let i=0;i<pts.length;i++) if (pts[i].k < pts[best].k) best = i;
  const n = rg.length, seq = []; for (let i=0;i<=n;i++){ const q = pts[(best+i)%n]; seq.push(q.p); }
  // the visible half runs between the two silhouette points (k ≈ 0) through k > 0
  const vis = seq.filter(p => kk(p) >= -.4);
  return vis.length > 1 ? ink(pd(vis, false), .6) : '';
}

// slice of pizza: dough wedge, cheese, pepperoni, a crust tube; cheese bubbles when hot
function pizzaArt(st, T){
  const th = 1.1, AP = -9.5, RAD = 16.5, HALF = 27;
  const outline = [[AP+.2,0], ...arcUV(AP, 0, RAD, -HALF, HALF, 12)];
  const A = outline.map(([u,v]) => T([u,v,0])), B = outline.map(([u,v]) => T([u,v,th]));
  const DOUGH = matOf('#e9c68f'), CRUST = matOf('#d99b52');
  let s = loft(A, B, n => toneI(n, DOUGH)) + fill(pd(B), DOUGH.l) + hullInk([...A, ...B], 1.1);
  const g = clamp((st.heat - .55)/.5), cheese = mix('#f7d25a', '#eba53c', g);
  const ch = [[AP+1.4,0], ...arcUV(AP, 0, RAD-1.6, -HALF+3, HALF-3, 12)].map(([u,v]) => T([u,v,th+.05]));
  s += fill(pd(ch), cheese) + ink(pd(ch), .5).replace(INK, mix(cheese, '#000000', .35));
  // a little tomato peeking at the cheese edge
  for (const [u,v,r] of [[-3,-3.1,.8],[3,4.8,.9],[5,-5.4,.7]]) s += fill(pd(ellUV(u,v,r,r*.8,12).map(([a,b]) => T([a,b,th+.07]))), '#c94a2c');
  for (const [u,v] of [[-4.2,.6],[.6,-3.1],[2,3]]){
    const pp = ellUV(u,v,1.8,1.8,18).map(([a,b]) => T([a,b,th+.12]));
    s += fill(pd(pp), '#b8432e') + ink(pd(pp), .6);
    s += fill(pd(ellUV(u+.5,v-.4,.35,.35,8).map(([a,b]) => T([a,b,th+.14]))), '#8a2c1e');
    s += fill(pd(ellUV(u-.6,v+.5,.3,.3,8).map(([a,b]) => T([a,b,th+.14]))), '#8a2c1e');
  }
  // bubbles
  const spots = [[-6.4,-.7],[-2,-1.8],[-1.6,2.2],[2.6,.1],[4.2,-3.4],[4.3,3.6],[-3.3,3.2],[5.9,-.6],[-.3,-4.6]];
  const nB = Math.round(spots.length*clamp((st.heat - .18)/.6));
  for (let i=0;i<nB;i++){
    const [u,v] = spots[i];
    const r = st.running ? .3 + .9*((st.t*(.7+.6*hash(i)) + hash(i+.5)) % 1) : .5 + .45*hash(i+.2);
    const bp = ellUV(u,v,r,r,12).map(([a,b]) => T([a,b,th+.18]));
    s += fill(pd(bp), mix(cheese,'#ffffff',.45)) + ink(pd(bp), .45);
    s += fill(pd(ellUV(u-r*.3,v+r*.3,r*.3,r*.3,8).map(([a,b]) => T([a,b,th+.2]))), '#ffffff', 'opacity=".8"');
  }
  // crust
  const cp = arcUV(AP, 0, RAD-.6, -HALF-1, HALF+1, 12).map(([u,v]) => T([u,v,th+.4]));
  const rs = cp.map((_,i) => { const k = Math.sin(Math.PI*i/(cp.length-1)); return (.8 + .85*Math.pow(k,.4))*FK; });
  s += tube(cp, rs, CRUST, 1.1, 14);
  return s;
}
const FOOD_ART = { popcorn: popcornArt, soup: soupArt, pizza: pizzaArt };
const FOOD_FOOT = { popcorn:[9.6,6.2], soup:[5.4,5.4], pizza:[11,8] };

/* ---------- cavity: walls, lamp, turntable, food ---------- */
function cavityArt(st){
  const Lt = st.lit, col = (off, on) => mix(off, on, Lt);
  const { x0, x1, y0, y1, z0, z1 } = CAV;
  let s = '';
  s += fill(pd([[x0,y0,z0],[x0,y1,z0],[x0,y1,z1],[x0,y0,z1]]), col('#8f8a7b','#f0d47a'));          // back wall
  // the side wall we look at: the right one (y0, faces +y) or, turned, the left one behind the panel (y1, faces −y)
  const rightWall = facing([0,1,0]), yw = rightWall ? y0 : y1;
  s += fill(pd([[x0,yw,z0],[x1,yw,z0],[x1,yw,z1],[x0,yw,z1]]), col('#a6a190','#f9e6a0'));          // side wall
  s += fill(pd([[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0]]), col('#827d6e','#e6c96c'));          // floor
  s += line([[x0,yw,z0],[x0,yw,z1]], .9) + line([[x0,y0,z0],[x0,y1,z0]], .9) + line([[x0,yw,z0],[x1,yw,z0]], .9);
  const lampOn = Lt > .05;
  if (rightWall){
    // waveguide cover (mica) and lamp grille on the right wall
    s += shape(on(PY(y0+.1), rrUV(52, 26, 66, 38, 1.2)), col('#b2a98c','#ecd59a'), .7);
    s += shape(on(PY(y0+.1), rrUV(70, 37, 78, 45, 1)), lampOn ? mix('#d8d2bf', '#fff6c8', Lt) : '#bcb6a3', .7);
    let holes = '';
    for (let x = 71.5; x < 77.5; x += 1.6) for (let z = 38.5; z < 44.5; z += 1.6) holes += pd(on(PY(y0+.2), ellUV(x, z, .35, .35, 6)));
    s += `<path d="${holes}" fill="${lampOn ? '#e0a93a' : '#6c6656'}"/>`;
    if (lampOn){
      const [lx,ly] = P(74, y0+.3, 41);
      s += `<g pointer-events="none" filter="url(#mwG)"><circle cx="${f(lx)}" cy="${f(ly)}" r="7" fill="#fff3b0" opacity="${f(.85*Lt)}"/></g>`;
    }
  } else {
    // left wall: a patch of punched air-vent holes from the fan behind the control panel
    let holes = '';
    for (let x = 44; x < 62; x += 2.2) for (let z = 40; z < 53; z += 2.2) holes += pd(on(PY(y1-.2), ellUV(x, z, .45, .45, 6)));
    s += `<path d="${holes}" fill="${col('#6c6656','#c9a24a')}"/>`;
  }
  // roller ring + hub under the glass plate
  const roll = on(PZ(z0+.15), ellUV(TT.x, TT.y, 8.5, 8.5, 32));
  s += ink(pd(roll), 2.2).replace(INK, col('#5a5548','#b89a45'));
  s += cyl(TT.x, TT.y, z0, z0+1.8, 2.4, DARK, toneI, .8, 16);
  // glass plate (see-through)
  const GL = { l:'#eef8f8', m:'#d4e9ec', d:'#a9c6cb' };
  const pA = on(PZ(TT.z), ellUV(TT.x, TT.y, TT.r-.4, TT.r-.4, 40)), pB = on(PZ(PLATE_TOP), ellUV(TT.x, TT.y, TT.r, TT.r, 40));
  let pl = `<g opacity=".82">${loft(pA, pB, n => toneI(n, GL))}${fill(pd(pB), GL.l)}</g>`;
  pl += ink(pd(on(PZ(PLATE_TOP+.02), ellUV(TT.x, TT.y, TT.r-1.6, TT.r-1.6, 40))), .45).replace(INK, '#7f9fa6');
  pl += hullInk([...pA, ...pB], 1.1) + ink(pd(pB), .8);
  // rim marks show it turning
  for (let k=0;k<8;k++){ const a = st.rot + k*Math.PI/4;
    pl += fill(pd(on(PZ(PLATE_TOP+.03), ellUV(TT.x + (TT.r-.85)*Math.cos(a), TT.y + (TT.r-.85)*Math.sin(a), .42, .42, 8))), '#93b3b9'); }
  pl += fill(pd(on(PZ(PLATE_TOP+.03), [[TT.x+3,TT.y+6],[TT.x+4,TT.y+8.5],[TT.x-5,TT.y+10.5],[TT.x-6,TT.y+9]])), '#ffffff', 'opacity=".55"');
  s += act('plate', pl);
  // food
  if (st.food){
    let dz = 0, op = 1;
    if (st.foodAnim){ const t = clamp(st.foodAnim.t);
      if (st.foodAnim.kind === 'out'){ dz = 7*ease(t); op = 1 - ease(clamp((t-.3)/.7)); }
      else { dz = 8*(1 - ease(t)); op = clamp(t*2.2); } }
    const T = foodXf(st, dz), [fu, fv] = FOOD_FOOT[st.food];
    let fa = '';
    if (dz < 1) fa += fill(pd(ellUV(.6, -.4, fu, fv, 24).map(([u,v]) => T([u,v,.02-dz]))), '#000000', 'opacity=".13"');
    fa += FOOD_ART[st.food](st, T);
    if (st.food === 'soup') fa += steamArt(st, T, 10.5, steamAmt(st), 3, 17);
    if (st.food === 'pizza') fa += steamArt(st, T, 2.5, steamAmt(st)*.6, 2, 10);
    if (st.food === 'popcorn') fa += steamArt(st, T, 7.5, steamAmt(st)*.35*clamp(st.heat-.6)*2, 2, 9);
    s += act('food', `<g opacity="${f(op)}">${fa}</g>`);
  }
  return s;
}
const steamAmt = st => clamp((st.heat - .4)/.3) * clamp(1 - st.cool/30);

/* ---------- door (closed or swinging) ---------- */
function doorArt(st, m){
  const th = doorAng(st), X = doorXf(th), R = X.p;
  const prof = rrUV(DOOR.y0, DOOR.z0, DOOR.y1, DOOR.z1, DOOR.r);
  const win = rrUV(WIN.y0, WIN.z0, WIN.y1, WIN.z1, WIN.r);
  const at = (x, uv) => uv.map(([u,v]) => R([x,u,v]));
  const oOut = at(DOOR.x1, prof), oIn = at(DOOR.x0, prof), wOut = at(DOOR.x1, win), wIn = at(DOOR.x0, win);
  const nOut = X.n([1,0,0]), showOut = vis(nOut);
  const Lt = st.lit;
  let s = '';
  // handle: a chrome bar on standoffs, near the free (viewer-left) edge
  const hy = 62.6, H0 = 18, H1 = 52;
  let hd = tube([R([DOOR.x1,hy,H0+2]), R([DOOR.x1+3.6,hy,H0+2])], [1.1,1.1], METAL, .8, 12)
         + tube([R([DOOR.x1,hy,H1-2]), R([DOOR.x1+3.6,hy,H1-2])], [1.1,1.1], METAL, .8, 12)
         + tube([R([DOOR.x1+3.6,hy,H0]), R([DOOR.x1+3.6,hy,H1])], [1.5,1.5], METAL, 1.1, 16);
  if (showOut) hd += `<path d="${pd([R([DOOR.x1+4.6,hy+.6,H0+3]), R([DOOR.x1+4.6,hy+.6,H1-3])],false)}" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>`;
  if (!showOut) s += hd;
  // slab edges
  s += loft(oIn, oOut, n => tone(n, m));
  // glass pane (mid-thickness): tint + mesh dots
  const gX = (DOOR.x0 + DOOR.x1)/2, gl = at(gX, win);
  let g = fill(pd(gl), '#16201c', `opacity="${f(th > .05 ? .42 : .54 - .28*Lt)}"`);
  let dots = '';
  for (let y = WIN.y0+1.2; y < WIN.y1-.6; y += 1.75) for (let z = WIN.z0+1.2; z < WIN.z1-.6; z += 1.75){
    const [X2,Y2] = P(...R([gX+.05, y, z])); dots += `M${f(X2)} ${f(Y2)}h0`; }
  g += `<path d="${dots}" fill="none" stroke="#0b100e" stroke-width="1.15" stroke-linecap="round" opacity=".5"/>`;
  if (Lt > .02 && th < .05) g += fill(pd(gl), '#ffc94a', `opacity="${f(.13*Lt)}"`);
  g += fill(pd(at(gX+.1, [[16,WIN.z0],[23,WIN.z0],[41,WIN.z1],[34,WIN.z1]])), '#ffffff', 'opacity=".2"');
  g += fill(pd(at(gX+.1, [[26,WIN.z0],[28.5,WIN.z0],[46.5,WIN.z1],[44,WIN.z1]])), '#ffffff', 'opacity=".2"');
  s += clipTo(gl, `<g pointer-events="none">${g}</g>`);
  // window reveal (inside of the hole)
  s += `<g pointer-events="none">${loft(wIn, wOut, n => tone(n, m), true)}</g>`;
  // the visible big face, with the window as a hole
  const faceRing = showOut ? oOut : oIn, holeRing = showOut ? wOut : wIn, fx = showOut ? DOOR.x1 : DOOR.x0;
  const fn = showOut ? nOut : X.n([-1,0,0]);
  s += `<path d="${pd(faceRing)}${pd(holeRing)}" fill="${tone(fn, m)}" fill-rule="evenodd"/>`;
  const off = showOut ? .12 : -.12;
  if (showOut){
    // chrome trim around the window + nameplate
    s += ink(pd(at(fx+off, rrUV(WIN.y0-1.6, WIN.z0-1.6, WIN.y1+1.6, WIN.z1+1.6, WIN.r+1.4))), .9);
    const eu = X.n([0,-1,0]), ev = [0,0,1];
    const lab = tone(fn, m) === m.d ? mix(m.l, '#ffffff', .25) : mix(tone(fn, m), '#000000', .5);
    s += txV(R([fx+.15, 32, 9.6]), eu, ev, 'MICRO·CHEF', 2.6, lab, 800);
  } else {
    // inside: the choke-seal panel and two latch hooks
    s += shape(at(fx+off, rrUV(DOOR.y0+2.5, DOOR.z0+2.5, DOOR.y1-2.5, DOOR.z1-2.5, 2.5)), 'none', .8);
    for (const z of [22, 48]){
      const q = [[DOOR.x0, 64.5, z-1],[DOOR.x0-2.6, 64.5, z-1],[DOOR.x0-2.6, 66.5, z+.4],[DOOR.x0-2.6, 64.5, z+1],[DOOR.x0, 64.5, z+1]].map(R);
      s += shape(q, METAL.m, .8);
    }
  }
  s += ink(pd(faceRing), 2) + ink(pd(holeRing), 1.6);
  if (showOut) s += hd;
  s += hullInk([...oIn, ...oOut], 2.2);
  return s;
}

/* ---------- control panel ---------- */
function key(st, id, y0, z0, y1, z1, label, col, txt=INK, size=2.1){
  const F = PX(W+.5), down = st.press === id, c = down ? mix(col, '#000000', .22) : col;
  let b = shape(on(F, rrUV(y0, z0, y1, z1, 1.2)), c, 1);
  if (!down) b += ink(pd(on(PX(W+.55), [[y1-.8, z0+.5],[y0+.8, z0+.5]]).map(p=>p), false), .5).replace(INK, mix(col,'#000000',.3));
  b += tx(W+.6, (y0+y1)/2, (z0+z1)/2 - size*.36, label, size, txt, 800);
  return act(id, b);
}
function panelArt(st){
  const P0 = PX(W+.25);
  let s = shape(on(P0, rrUV(PANEL.y0, PANEL.z0, PANEL.y1, PANEL.z1, 2.5)), '#efe8d6', 1.2);
  // display
  s += shape(on(PX(W+.4), rrUV(73.5, 52.5, 97.5, 60, 1.6)), '#1d2a26', 1.2);
  let main;
  if (st.ding != null || st.done) main = 'End';
  else main = clock(st.time);
  const small = st.running ? 'COOK' : st.door > .02 ? 'OPEN' : st.paused ? 'PAUSE' : st.food ? FOODS[st.food].label : '';
  const blink = st.running && (st.t % .8) < .4;
  s += tx(W+.5, 84.4, 54.1, main, 4.6, '#8af0ae', 700);
  s += tx(W+.5, 94.6, 57.7, small, 1.4, '#5fbf82', 700);
  if (st.running) s += tx(W+.5, 77.6, 58.1, blink ? '≈≈' : '~~', 1.6, '#5fbf82', 700);
  // dial: time knob, pointer shows the time left (0..10 min clockwise)
  const fr = clamp(st.time/600), ang = fr * 300 * Math.PI/180;
  let dl = '';
  for (let k=0;k<=10;k++){ const a = k*30*Math.PI/180, r0 = 7.3, r1 = k%5 ? 8.1 : 8.7;
    dl += ink(pd([[W+.3, DIAL.y - r0*Math.sin(a), DIAL.z + r0*Math.cos(a)],[W+.3, DIAL.y - r1*Math.sin(a), DIAL.z + r1*Math.cos(a)]], false), k%5 ? .5 : .8); }
  dl += cylX(W+.25, W+1.4, DIAL.y, DIAL.z, 6.4, METAL, toneI, 1, 28);
  dl += cylX(W+1.4, W+4, DIAL.y, DIAL.z, 5.3, DARK, toneI, 1.1, 28);
  for (let k=0;k<12;k++){ const a = k*Math.PI/6 + ang;
    dl += ink(pd([[W+4.05, DIAL.y - 4.3*Math.sin(a), DIAL.z + 4.3*Math.cos(a)],[W+4.05, DIAL.y - 5.1*Math.sin(a), DIAL.z + 5.1*Math.cos(a)]], false), .5).replace(INK, DARK.l); }
  dl += ink(pd([[W+4.1, DIAL.y, DIAL.z],[W+4.1, DIAL.y - 3.9*Math.sin(ang), DIAL.z + 3.9*Math.cos(ang)]], false), 1.4).replace(INK, '#f4ead2');
  dl += fill(pd(on(PX(W+4.1), ellUV(DIAL.y+1.6, DIAL.z+2.1, 1.1, .7, 10))), '#ffffff', 'opacity=".3"');
  s += act('dial', dl);
  // auto-cook presets (left → right on screen = high y → low y)
  s += key(st, 'p_popcorn', 90.6, 30.3, 98.6, 34.6, 'POP',   st.food==='popcorn' ? '#f6d9a0' : '#fbf6ea', INK, 1.8);
  s += key(st, 'p_soup',    81.6, 30.3, 89.6, 34.6, 'SOUP',  st.food==='soup'    ? '#f6d9a0' : '#fbf6ea', INK, 1.8);
  s += key(st, 'p_pizza',   72.6, 30.3, 80.6, 34.6, 'PIZZA', st.food==='pizza'   ? '#f6d9a0' : '#fbf6ea', INK, 1.8);
  s += key(st, 'add',  86.6, 23, 98.6, 28.2, '+30s', '#fbf6ea');
  s += key(st, 'stop', 72.6, 23, 84.6, 28.2, 'STOP', '#f19a8f');
  s += key(st, 'start', 72.6, 15.4, 98.6, 20.8, 'START', '#9ad8a5');
  // run LED
  s += shape(on(PX(W+.5), ellUV(96.4, 18.1, .9, .9, 12)), st.running ? '#7bff95' : '#4d6b52', .6);
  if (st.running){ const [lx,ly] = P(W+.6, 96.4, 18.1); s += `<circle cx="${f(lx)}" cy="${f(ly)}" r="2.2" fill="#7bff95" opacity=".35" pointer-events="none"/>`; }
  // door release
  s += key(st, 'release', 72.6, 8.6, 98.6, 13.2, 'DOOR OPEN', mix(METAL.m,'#ffffff',.25), INK, 1.8);
  return s;
}

/* ---------- ding! ---------- */
function dingArt(st){
  if (st.ding == null) return '';
  const t = st.ding, op = t < 1.9 ? 1 : clamp(1 - (t-1.9)/.5);
  const bx = W+8, by = 90, bz = 94, rock = Math.sin(t*15)*Math.exp(-t*1.6)*.42;
  const rot = ([u,v]) => { const c = Math.cos(rock), s = Math.sin(rock); return [by + u*c - v*s, bz + u*s + v*c]; };
  const K = 1.7;
  const outline = [[-1,0],[-1.6,-.8],[-2.3,-2.8],[-2.7,-5],[-3.3,-6.6],[-4.3,-7.5],[-4.4,-8.2],[4.4,-8.2],[4.3,-7.5],[3.3,-6.6],[2.7,-5],[2.3,-2.8],[1.6,-.8],[1,0]].map(([u,v]) => [u*K, v*K]);
  // the bell hangs on a sheet that always faces the viewer, at the same spot on screen in every view
  const U = unV([0,1,0]), [ax, ay] = unXY(bx, by);
  const pl = ([u,v]) => [ax + (u-by)*U[0], ay + (u-by)*U[1], v], tr = uv => on(pl, uv.map(rot));
  let s = '';
  const cl = tr([[Math.sin(t*15+1)*1.2, -10.6*K]])[0];
  s += `<circle cx="${f(P(...cl)[0])}" cy="${f(P(...cl)[1])}" r="${f(1.3*K)}" fill="#c8941c" stroke="${INK}" stroke-width="1"/>`;
  s += shape(tr(outline), '#f2c230', 1.3);
  s += fill(pd(tr([[-1.6*K,-1.4*K],[-1*K,-1.2*K],[-1.9*K,-6.6*K],[-2.6*K,-6.6*K]])), '#fff3c4', 'opacity=".8"');
  s += ink(pd(tr([[-4.2*K,-7.4*K],[4.2*K,-7.4*K]]), false), .7);
  const kn = tr([[0, .9*K]])[0], [kX,kY] = P(...kn);
  s += `<circle cx="${f(kX)}" cy="${f(kY)}" r="${f(1*K*1.1)}" fill="#f2c230" stroke="${INK}" stroke-width="1"/>`;
  // sound arcs on both sides
  for (let i=0;i<3;i++){
    const ph = clamp(t*2.2 - i*.25), a = ph * (1 - clamp((t - 1.2 - i*.15)/.6));
    if (a <= .02) continue;
    const r = 10.5 + i*3.6 + ph*1.8;
    for (const [a0,a1] of [[-32,32],[148,212]])
      s += `<path d="${pd(on(pl, arcUV(by, bz-6.5, r, a0, a1, 10)), false)}" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round" opacity="${f(a)}"/>`;
  }
  const pop = 1 + .35*Math.exp(-t*7);
  s += txV(pl([by, bz + 5.2]), U.map(v => -v), [0,0,1], 'DING!', (6.4*pop).toFixed(2), '#d9443a', 900);
  return `<g pointer-events="none" opacity="${f(op)}">${s}</g>`;
}

/* ---------- the back (x = 0) and the right side (y = 0), only seen when turned ---------- */
const CORD = { y:74, z:16 };                                       // where the mains cord leaves the back
function screw(plane, u, v, r=1.25){
  const c = on(plane, ellUV(u, v, r, r, 12));
  return shape(c, METAL.m, .7) + ink(pd(on(plane, [[u-r*.65, v+r*.3],[u+r*.65, v-r*.3]]), false), .6);
}
function backArt(m){
  const B = PX(0), Bo = PX(-.2), Bt = PX(-.35), bt = tone([-1,0,0], m);
  const btx = (y, z, str, size, col=INK, wt=800) => txV([-.4, y, z], [0,1,0], [0,0,1], str, size, col, wt);
  let s = fill(pd(on(B, OUT)), bt);
  // the removable back cover (a seam inset from the rounded edge) and its screws
  s += ink(pd(on(Bo, rrUV(6, ZB+5, D-6, H-5, BR-3))), 1);
  for (const [u,v] of [[11,13],[D-11,13],[11,H-9],[D-11,H-9]]) s += screw(Bt, u, v);
  // big vent grille over the magnetron / fan (behind the control panel)
  const gr = rrUV(52, 24, 96, 58, 3);
  s += shape(on(Bo, gr), mix(bt, '#000000', .1), 1.2);
  let slots = '';
  for (let y = 55; y <= 93.5; y += 3.3) slots += pd(on(Bt, rrUV(y, 27, y+1.5, 55, .7)));
  s += `<path d="${slots}" fill="${mix(m.d, '#000000', .35)}" stroke="${INK}" stroke-width=".5"/>`;
  // rating plate: white label with the model and the electrical rating
  s += shape(on(Bt, rrUV(12, 37, 44, 55, 1)), '#f6f2e6', .9);
  s += btx(28, 50.6, 'MICRO·CHEF', 2.6, INK, 900);
  s += btx(28, 47.6, 'MODEL MC-800', 1.5, '#5b5548', 700);
  s += ink(pd(on(PX(-.4), [[14, 46],[42, 46]]), false), .5);
  s += btx(28, 42.2, '230V ~ 800W', 2.9, INK, 900);
  s += btx(28, 39.1, '50Hz · S/N 06-1984', 1.35, '#5b5548', 700);
  // warning sticker: yellow, with a triangle
  s += shape(on(Bt, rrUV(12, 17, 44, 33, 1)), '#f2c230', .9);
  s += shape(on(PX(-.4), [[15.2, 20],[21.6, 20],[18.4, 30.2]]), '#f2c230', .9);
  s += btx(18.4, 21.2, '!', 4.2, INK, 900);
  s += btx(32.6, 28.4, 'CAUTION', 2.3, INK, 900);
  s += btx(32.6, 24.9, 'HIGH VOLTAGE', 1.4, INK, 800);
  s += btx(32.6, 22.4, 'DO NOT REMOVE', 1.4, INK, 800);
  s += btx(32.6, 19.9, 'COVER', 1.4, INK, 800);
  s += ink(pd(on(B, OUT)), 2.2);
  return s;
}
function sideRArt(m){
  const Ro = PY(-.2), Rt = PY(-.35), rt = tone([0,-1,0], m);
  let s = '';
  // louvred vent panel near the back
  s += shape(on(Ro, rrUV(7, 25, 37, 57, 4)), mix(rt, '#000000', .08), 1.1);
  let lv = ''; for (let z = 29; z <= 53.5; z += 3.5) lv += pd([[11,-.4,z],[33,-.4,z]], false);
  s += `<path d="${lv}" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round" opacity=".72"/>`;
  // a low row of round air holes along the cavity side
  let hl = ''; for (let x = 42; x <= 74; x += 3.2) for (const z of [11, 14.2]) hl += pd(on(Rt, ellUV(x + (z > 12 ? 1.6 : 0), z, .75, .75, 10)));
  s += `<path d="${hl}" fill="${mix(m.d, '#000000', .25)}" stroke="${INK}" stroke-width=".45"/>`;
  for (const [u,v] of [[4.5,12],[4.5,H-8]]) s += screw(Rt, u, v, 1.1);
  return s;
}
// mains cord: strain-relief bush on the back, drops to the floor and ends in a two-pin plug
function cordArt(){
  const { y:cy, z:cz } = CORD;
  const bush = (() => { const A = on(PX(0), ellUV(cy, cz, 2, 2, 16)), Bq = on(PX(-2.6), ellUV(cy, cz, 1.6, 1.6, 16));
    return loft(A, Bq, n => toneI(n, DARK)) + (facing([-1,0,0]) ? fill(pd(Bq), DARK.m) + ink(pd(Bq), .7) : '') + hullInk([...A, ...Bq], .9); })();
  const path = [[-2.6,cy,cz],[-5.6,cy,cz-1.2],[-8,cy-.8,cz-5],[-9.6,cy-2.2,cz-11.4],[-11.2,cy-4.6,1.4],[-13.4,cy-9,1],[-16,cy-14,1],[-18,cy-18,1],[-19,cy-19.5,1]];
  const cord = rope(path, 1.7, '#3d3935', '#6e675e');
  const py = cy - 19.5, plug = box(-25.5, py-2.6, 0, -19, py+2.6, 4.4, DARK, toneI, .9)
    + ink(pd([[-21,py-2.6,4.45],[-21,py+2.6,4.45]], false), .5) + ink(pd([[-22.4,py-2.6,4.45],[-22.4,py+2.6,4.45]], false), .5);
  const pins = rope([[-25.5,py-1.2,2.2],[-29.2,py-1.2,2.2]], .9, METAL.m) + rope([[-25.5,py+1.2,2.2],[-29.2,py+1.2,2.2]], .9, METAL.m);
  // the cord meets the plug's +x end, the pins stick out of its −x end
  const end = facing([1,0,0]) ? pins + plug + cord : cord + plug + pins;
  return `<g pointer-events="none">${bush}${end}</g>`;
}

/* ---------- scene ---------- */
function scene(st, m){
  let s = `<filter id="mwG" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.6"/></filter>`;
  const th = doorAng(st), open = th > .02, XD = doorXf(th);
  const bodyPts = [...on(PX(0), OUT), ...on(PX(W), OUT)];
  // shadows: body, and the swung door on its own
  s += castShadow(bodyPts);
  if (open) s += castShadow([[DOOR.x0,DOOR.y0,DOOR.z0],[DOOR.x1,DOOR.y0,DOOR.z0],[DOOR.x0,DOOR.y1,DOOR.z0],[DOOR.x1,DOOR.y1,DOOR.z0],
                             [DOOR.x0,DOOR.y0,DOOR.z1],[DOOR.x1,DOOR.y0,DOOR.z1],[DOOR.x0,DOOR.y1,DOOR.z1],[DOOR.x1,DOOR.y1,DOOR.z1]].map(XD.p));
  // Painter's order across views. Everything on the front (cavity, panel, dial, door — open or shut) lives in x ≥ W
  // and the body in x ≤ W, so the front plane separates them: front facing → draw them after the body, else before it
  // (the body hides them; an open door sticking out past the silhouette still shows). Same for the cord behind x = 0.
  const FF = facing([1,0,0]), FB = facing([-1,0,0]);
  const doorS = act('door', doorArt(st, m)), cordS = cordArt();
  if (!FB) s += cordS;
  if (!FF) s += doorS;
  // feet
  for (const [x,y] of [[8,10],[8,94],[72,94],[72,10]]) s += cyl(x, y, 0, ZB+.5, 3, DARK, toneI, 1, 16);
  // body shell
  s += extrude(OUT, 0, W, m);
  if (facing([0,1,0])){
    const sideM = tone([0,1,0], m);
    let vents = ''; for (let z = 30; z <= 54; z += 4) vents += pd([[9,D+.2,z],[34,D+.2,z]], false);
    s += `<path d="${vents}" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round" opacity=".72"/>`;
    s += shape(on(PY(D+.2), rrUV(44, 26, 72, 40, 7)), mix(sideM, '#ffffff', .14), 1.1);
    s += txY(58, D+.3, 31.2, 'RETRO', 4.4, mix(sideM, '#000000', .4), 800);
  }
  if (facing([0,-1,0])) s += sideRArt(m);
  let tv = ''; for (let x = 8; x <= 22; x += 3.5) tv += pd([[x,62,H+.1],[x,94,H+.1]], false);
  s += `<path d="${tv}" fill="none" stroke="${INK}" stroke-width="1.3" stroke-linecap="round" opacity=".6"/>`;
  if (FB) s += backArt(m) + cordS;
  if (FF){
    // cavity (seen through the window or the open door)
    const opening = on(PX(W), rectUV(CAV.y0, CAV.z0, CAV.y1, CAV.z1));
    s += clipTo(opening, cavityArt(st));
    // front face with the cavity opening
    const F = PX(W);
    s += `<path d="${pd(on(F, OUT))}${pd(opening)}" fill="${tone([1,0,0], m)}" fill-rule="evenodd"/>`;
    s += ink(pd(opening), 1.6);
    for (const z of [22, 48]) s += shape(on(PX(W+.05), rrUV(63.8, z-1.3, 67, z+1.3, .5)), mix(tone([1,0,0], m), '#000000', .5), .6);   // latch slots
    // panel (y ≥ 71) and door (y ≤ 71) never overlap on screen in the views where the front shows
    s += panelArt(st);
    s += ink(pd(on(F, OUT)), 2.2);
    // door
    s += doorS;
    // glow around the window when lit and closed
    const glow = st.lit * (open ? 0 : 1);
    if (glow > .02){
      const wr = on(PX(DOOR.x1+.2), rrUV(WIN.y0, WIN.z0, WIN.y1, WIN.z1, WIN.r));
      s += `<g pointer-events="none" filter="url(#mwG)"><path d="${pd(wr)}" fill="none" stroke="#ffd35a" stroke-width="5" opacity="${f(.55*glow)}"/></g>`;
    }
  }
  // silhouette
  s += hullInk(open ? bodyPts : [...bodyPts, ...on(PX(DOOR.x1), rrUV(DOOR.y0, DOOR.z0, DOOR.y1, DOOR.z1, DOOR.r))], 2.8);
  s += dingArt(st);
  return s;
}

/* ---------- behaviour ---------- */
let UI = null;
function kick(){ const st = UI.st; if (st._run) return; st._run = true; UI.animate(dt => { const more = step(st, dt); if (!more) st._run = false; return more; }); }
function step(st, dt){
  let a = false;
  st.t += dt;
  // door swing
  if (st.door !== st.doorTarget){ const sg = Math.sign(st.doorTarget - st.door); st.door += sg*dt/.7;
    if ((st.doorTarget - st.door)*sg <= 0) st.door = st.doorTarget; a = true; }
  // cooking
  if (st.running){
    const shown = dt*SPEED;
    st.time -= shown; st.rot += dt*2*Math.PI/5; st.cool = 0;
    if (st.food) st.heat = Math.min(1.25, st.heat + shown/FOODS[st.food].preset);
    if (st.time <= 0){ st.time = 0; st.running = false; st.done = true; st.ding = 0;
      UI.flash(st.food ? `DING! ${cap(st.food)} is ready — open the door` : 'DING!', 2200); }
    a = true;
  } else if (st.heat > .4 && st.cool < 30){ st.cool += dt; a = true; }
  if (st.ding != null){ st.ding += dt; if (st.ding > 2.4) st.ding = null; a = true; }
  if (st.foodAnim){ st.foodAnim.t += dt/.6; a = true;
    if (st.foodAnim.t >= 1){ if (st.foodAnim.kind === 'out'){ st.food = null; st.heat = 0; st.cool = 0; st.done = false; } st.foodAnim = null; } }
  // interior lamp
  const lt = (st.running || st.door > 0 || st.doorTarget > 0 || (st.ding != null && st.ding < 1.4)) ? 1 : 0;
  if (Math.abs(st.lit - lt) > .01){ st.lit += (lt - st.lit)*Math.min(1, dt*6); a = true; } else st.lit = lt;
  return a;
}
const cap = s => s[0].toUpperCase() + s.slice(1);
let pressT = 0;
const press = (st, id) => { st.press = id; clearTimeout(pressT); pressT = setTimeout(() => { st.press = null; UI.render(); }, 170); };
function setFood(st, ui, food, viaPreset){
  if (st.running) return ui.flash('Cooking — press STOP first');
  st.food = food; st.heat = 0; st.cool = 0; st.done = false; st.ding = null; st.paused = false;
  st.time = FOODS[food].preset; st.foodAnim = { kind:'in', t:0 }; kick();
}
function nextFood(st, ui){ const i = st.food ? ORDER.indexOf(st.food) : (st.lastFood != null ? ORDER.indexOf(st.lastFood) : -1); setFood(st, ui, ORDER[(i+1) % ORDER.length]); }
function addTime(st){ st.time = Math.min(599, st.time + 30); if (st.done){ st.done = false; } }
function start(st, ui){
  if (st.door > 0 || st.doorTarget > 0) return ui.flash('Close the door first');
  if (!st.food) return ui.flash('Nothing inside — pick a food first');
  if (st.running) return;
  if (st.time <= 0) st.time = 30;
  st.running = true; st.paused = false; st.done = false; st.ding = null; kick();
}
function stop(st){
  if (st.running){ st.running = false; st.paused = true; kick(); return; }
  st.time = 0; st.paused = false; st.done = false; st.ding = null;
}
function toggleDoor(st, ui){
  if (st.doorTarget === 0){
    if (st.running){ st.running = false; st.paused = true; ui.flash('Door opened — cooking paused'); }
    st.doorTarget = 1; st.done = false; st.ding = null;
  } else st.doorTarget = 0;
  kick();
}
function clickFood(st, ui){
  if (st.foodAnim) return;
  if (st.doorTarget === 1 && st.door > .5){
    st.lastFood = st.food; st.foodAnim = { kind:'out', t:0 };
    ui.flash(st.heat > .9 ? `Enjoy your ${st.food}!` : st.heat > .2 ? `Took out the ${st.food} (only half cooked)` : `Took out the ${st.food}`, 1600);
    kick(); return;
  }
  if (st.running) return ui.flash('Hands off — it\'s cooking');
  nextFood(st, ui);
}
function clickPlate(st, ui){
  if (st.food) return clickFood(st, ui);
  if (st.doorTarget === 1) return nextFood(st, ui);
  ui.flash('Open the door to put food in');
}

UI = mountFigure({
  fig:'05', title:'Microwave', hint:'pick a food, add time, START — then open the door to take it out',
  idea:"Microwaves make the water inside food jiggle, and jiggling makes heat. The plate turns so every side gets its turn.",
  size:[100, D, H], palette:'mint', views:true,
  state:{ food:'popcorn', heat:0, time:FOODS.popcorn.preset, running:false, paused:false, done:false, ding:null,
          door:0, doorTarget:0, rot:.35, lit:0, t:0, cool:0, foodAnim:null, press:null, lastFood:null },
  scene,
  readout: st => {
    if (st.ding != null) return `DING! ${st.food ? cap(st.food) + ' is ready' : 'Done'} — open the door`;
    if (st.running){ const n = 3 + Math.floor((st.t*5) % 4); return `Cooking ${st.food} · ${clock(st.time)} left · ~ h${'m'.repeat(n)}${'m'.repeat(6-n).replace(/m/g,' ')} ~`; }
    if (st.door > .02 || st.doorTarget){
      if (st.foodAnim && st.foodAnim.kind === 'in') return `Putting in the ${st.food}…`;
      if (!st.food) return 'Door open · empty turntable — click it to put food in';
      return `Door open · ${st.food}${st.heat > .9 ? ' (hot!)' : st.paused ? ' (half cooked)' : ''} — click it to take it out, or close the door`;
    }
    if (!st.food) return 'Empty — open the door and click the turntable, or pick POP / SOUP / PIZZA';
    if (st.done) return `${cap(st.food)} is ready — press DOOR OPEN`;
    if (st.paused) return `Paused · ${clock(st.time)} left — START to resume, STOP to clear`;
    if (st.time <= 0) return `${cap(st.food)} inside — add time (+30s / dial), then START`;
    return `${cap(st.food)} inside · set ${clock(st.time)} — press START`;
  },
  buttonsLabel:'Microwave',
  buttons:[
    { label:'Choose food', choices: st => ORDER.map(k => ({ label:`${k} · ${Math.floor(FOODS[k].preset/60)}:${String(FOODS[k].preset%60).padStart(2,'0')}`,
        disabled: st.running, onClick:(st, ui) => setFood(st, ui, k) })) },
    { label:'Add 30 s', onClick:(st) => addTime(st) },
    { label:'Start', onClick:start },
    { label:'Stop', onClick:(st) => stop(st) },
    { label:'Open door', onClick:(st, ui) => st.doorTarget ? ui.flash('The door is open') : toggleDoor(st, ui) },
    { label:'Take food out', onClick:(st, ui) => !st.food ? ui.flash('Nothing inside') : st.doorTarget !== 1 ? ui.flash('Open the door first') : clickFood(st, ui) },
    { label:'Close door', onClick:(st, ui) => st.doorTarget ? toggleDoor(st, ui) : ui.flash('The door is closed') },
  ],
  next: st => st.foodAnim || st.door !== st.doorTarget ? -1
    : st.doorTarget === 1 ? (st.food ? 5 : 6)
    : st.running ? -1
    : !st.food ? 0
    : st.done || st.heat > .9 ? 4 : 2,
  acts:{
    food:(st, el, ui) => clickFood(st, ui),
    plate:(st, el, ui) => clickPlate(st, ui),
    door:(st, el, ui) => toggleDoor(st, ui),
    release:(st, el, ui) => { press(st, 'release'); toggleDoor(st, ui); },
    start:(st, el, ui) => { press(st, 'start'); start(st, ui); },
    stop:(st, el, ui) => { press(st, 'stop'); stop(st); },
    add:(st, el, ui) => { press(st, 'add'); addTime(st); },
    dial:(st, el, ui) => addTime(st),
    p_popcorn:(st, el, ui) => { press(st, 'p_popcorn'); setFood(st, ui, 'popcorn', true); },
    p_soup:(st, el, ui) => { press(st, 'p_soup'); setFood(st, ui, 'soup', true); },
    p_pizza:(st, el, ui) => { press(st, 'p_pizza'); setFood(st, ui, 'pizza', true); },
  },
  params(st, q){
    const fd = q.get('food');
    if (fd === 'none') st.food = null;
    else if (FOODS[fd]){ st.food = fd; st.time = FOODS[fd].preset; }
    if (q.has('time')) st.time = clamp(+q.get('time'), 0, 599);
    if (q.has('heat')) st.heat = clamp(+q.get('heat'), 0, 1.25);
    if (q.has('rot')) st.rot = +q.get('rot');
    if (q.get('run') === '1' && st.food){
      const t = q.has('t') ? clamp(+q.get('t')) : .5;
      st.running = true; st.heat = t; st.time = FOODS[st.food].preset*(1-t); st.lit = 1; st.t = .37; st.rot = 1.15; st._frozen = true;
    }
    if (q.get('done') === '1' && st.food){ st.heat = 1; st.time = 0; st.done = true; st.ding = +(q.get('ding') || .32); st.lit = 1; st.rot = 2.2; st.t = 1.1; }
    if (q.get('door') === 'open' || q.get('door') === '1'){ st.door = st.doorTarget = 1; st.lit = 1; st.ding = null; st.running = false; }
  },
});
