
/* ============================================================
   Fig. 06 — Espresso machine (retro prosumer, E61-style group)
   Units ≈ 0.37 cm. Body x 0..78 (depth), y 0..120 (width), z 4..110.
   ============================================================ */
const BX = 78, BY = 120, BZ = 110, BR = 10;
const OUT = rrUV(0, 4, BY, BZ, BR);
const TRAY = { x0:BX, x1:104, y0:8, y1:112, z0:4, z1:14 };
const CUP = { x:86, y:60, z:TRAY.z1, r:6.8, h:9.6 };          // the cup under the group
const GY = 60, GX = 86;                                        // group head axis
const SPOUT_Z = 40.5, SPOUTS = [57.5, 62.5];
const WAND_TIP = [91.3, 110.2, 34];
const COFFEE = '#4a2b18', CREMA = '#c8894b', CREMA_D = '#8a5328';
const GREEN = '#43c25c', RED = '#e2483d';
const clamp = (v,a=0,b=1) => Math.max(a, Math.min(b, v));
const hash = k => { const s = Math.sin(k*12.9898 + 78.233)*43758.5453; return s - Math.floor(s); };

/* ---------- shot model: t in 0..1 = a 25 s shot compressed to 4 s ---------- */
const SHOT_S = 25, SHOT_DUR = 4;
const fillOf = t => clamp((t - .14) / .82);
const pumpOf = t => t == null ? 0 : t < .08 ? 9*ease(t/.08) : t < .95 ? 9 + .3*Math.sin(t*47) : 9*(1 - (t-.95)/.05);
const flowing = t => t != null && t > .14 && t < .985;

/* ---------- small 3D helpers ---------- */
function ring(c, d, r, n=16){
  const a = Math.abs(d[2]) < .9 ? [0,0,1] : [1,0,0], u = norm(cross(d,a)), v = cross(d,u);
  return Array.from({length:n}, (_,i) => { const t=i/n*2*Math.PI, cs=Math.cos(t), sn=Math.sin(t);
    return [c[0]+r*(cs*u[0]+sn*v[0]), c[1]+r*(cs*u[1]+sn*v[1]), c[2]+r*(cs*u[2]+sn*v[2])]; });
}
// tube through a path of 3D points with per-point radii (toneI shaded), capped at the visible end(s)
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
// a ball (orthographic sphere = circle of r·√1.5 on screen)
function ball(c, r, m, w=1){
  const [X,Y] = P(...c), R = r*1.2247;
  return `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(R)}" fill="${m.m}" stroke="${INK}" stroke-width="${w}"/>`
       + `<circle cx="${f(X-R*.28)}" cy="${f(Y-R*.3)}" r="${f(R*.42)}" fill="${m.l}"/>`;
}
// a thin bent metal pipe: thick ink stroke + metal core + highlight
function pipe(pts, wIn=3, col=METAL){
  const o = unrot([.45,0,.45]), d = pd(pts,false), hi = pd(pts.map(p => [p[0]+o[0], p[1]+o[1], p[2]+o[2]]), false);
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${wIn+1.8}" stroke-linecap="round" stroke-linejoin="round"/>`
       + `<path d="${d}" fill="none" stroke="${col.m}" stroke-width="${wIn}" stroke-linecap="round" stroke-linejoin="round"/>`
       + `<path d="${hi}" fill="none" stroke="${col.l}" stroke-width="${wIn*.32}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
const zRing = (x,y,z,r,n=24) => on(PZ(z), ellUV(x,y,r,r,n));

/* ---------- turning helpers (VIEW 0..3) ---------- */
// model vector that shows up as v in the current view (inverse of rotV): keeps screen-relative offsets fixed
const unrot = ([x,y,z]) => { switch (VIEW & 3){ case 1: return [-y,x,z]; case 2: return [-x,-y,z]; case 3: return [y,-x,z]; default: return [x,y,z]; } };
// text lying on any vertical face: U = reading direction (model), up is +z
const txOn = (p, U, str, size, col=INK, weight=700) =>
  `<text transform="${txM(P(...p), Dv(...U), Dv(0,0,-1))}" font-size="${size}" fill="${col}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="${weight}" letter-spacing=".04em">${str}</text>`;

/* ---------- a ceramic espresso cup; level: 0..1 of coffee, or null for an empty cup ---------- */
function cupArt(cx, cy, z0, r, h, level, latte=0){
  const rAt = k => r*(.62 + .38*Math.sqrt(clamp(k)));           // tulip profile
  const ks = [0, .08, .3, .6, 1], rings = ks.map(k => zRing(cx, cy, z0+h*k, k===0 ? r*.56 : rAt(k)));
  let s = '';
  // handle (on the -y side, behind the bowl)
  const hp = [[cx, cy-r*.9, z0+h*.8],[cx, cy-r-3.2, z0+h*.86],[cx, cy-r-4.1, z0+h*.6],[cx, cy-r-3, z0+h*.3],[cx, cy-r*.72, z0+h*.24]];
  const handle = pts => `<path d="${pd(pts,false)}" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`
     + `<path d="${pd(pts,false)}" fill="none" stroke="${CERAMIC.m}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
  const hFront = depthOf([cx, cy-r-3, z0+h*.5]) > depthOf([cx, cy, z0+h*.5]);
  if (!hFront) s += handle(hp);
  for (let i=0;i<rings.length-1;i++) s += loft(rings[i], rings[i+1], n => toneI(n, CERAMIC));
  s += hullInk(rings.flat(), 1.2);
  // handle toward the viewer: drawn over the bowl, its ends on the outer wall
  if (hFront) s += handle([[cx, cy-rAt(.8), z0+h*.8], hp[1], hp[2], hp[3], [cx, cy-rAt(.24), z0+h*.24]]);
  // rim + interior
  const top = rings[rings.length-1], inner = zRing(cx, cy, z0+h, r-.8);
  s += fill(pd(top), CERAMIC.l);
  let inside = fill(pd(inner), CERAMIC.d);
  const zf = z0 + 1.2;
  inside += fill(pd(zRing(cx, cy, zf, rAt(.1)-.8)), CERAMIC.m);
  if (level != null && level > 0){
    const zl = zf + level*(h - 3.2), rl = rAt((zl - z0)/h) - .8;
    inside += fill(pd(zRing(cx, cy, zl, rl)), COFFEE);
    const cr = rl * (.45 + .45*clamp(level*1.4));
    inside += fill(pd(on(PZ(zl+.01), ellUV(cx-.3, cy+.2, cr, cr*.94, 24))), CREMA);
    inside += ink(pd(on(PZ(zl+.02), ellUV(cx-.3, cy+.2, cr, cr*.94, 24))), .5).replace(INK, CREMA_D);
    if (latte > 0){   // milk foam: a pale ring that spreads, with a white heart poured into it
      const k = rl*clamp(latte*1.25), Z = PZ(zl+.03);
      inside += fill(pd(on(Z, ellUV(cx, cy, rl*(.35+.6*clamp(latte*1.5)), rl*(.35+.6*clamp(latte*1.5))*.96, 24))), '#e9c9a0');
      if (latte > .25){ const h = k*.95;
        const heart = [...arcUV(cx-h*.28, cy+h*.3, h*.38, 90, 270, 8), [cx+h*.62, cy], ...arcUV(cx-h*.28, cy-h*.3, h*.38, 90, 270, 8).reverse()];
        inside += fill(pd(on(Z, heart.map(([u,v]) => [u,v]))), '#fbf6ec'); }
    }
  }
  s += clipTo(inner, inside);
  s += ink(pd(top), 1) + ink(pd(inner), .6);
  return s;
}

/* ---------- milk jug: steel pitcher, local origin at its base centre; spout toward -y, handle toward +y ---------- */
const MILK = '#fbf8f0';
const JUG_REST = { x:92, y:88, z:TRAY.z1, tilt:0 };
const JUG_WAND = { x:WAND_TIP[0], y:WAND_TIP[1], z:TRAY.z1, tilt:0 };
const JUG_POUR = { x:CUP.x, y:CUP.y+21, z:CUP.z+CUP.h+3, tilt:58 };
const JUG_H = 22, JUG_PROFILE = [[0,5.4],[1.2,6.1],[8,6.7],[16,6.1],[JUG_H,5.6]];
const jugR = z => { for (let i=1;i<JUG_PROFILE.length;i++){ const [z0,r0]=JUG_PROFILE[i-1],[z1,r1]=JUG_PROFILE[i]; if (z<=z1) return r0+(r1-r0)*(z-z0)/(z1-z0); } return 5.6; };
const lerpPose = (a,b,t) => ({ x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t, z:a.z+(b.z-a.z)*t + 7*Math.sin(Math.PI*t), tilt:a.tilt+(b.tilt-a.tilt)*t });
function jugPose(st){
  const at = st.jug === 'wand' ? JUG_WAND : JUG_REST;
  if (st.jugAnim){ const { from, to, t } = st.jugAnim; return lerpPose(from, to, ease(clamp(t))); }
  if (st.pour != null){ const t = st.pour;
    if (t < .22) return lerpPose(st.pourFrom, JUG_POUR, ease(t/.22));
    if (t > .8)  return lerpPose(JUG_POUR, JUG_REST, ease((t-.8)/.2));
    return JUG_POUR; }
  return at;
}
function jugXf(pose){
  const a = pose.tilt*Math.PI/180, c = Math.cos(a), sn = Math.sin(a);
  return ([x,y,z]) => [pose.x + x, pose.y + y*c - z*sn, pose.z + y*sn + z*c];
}
// surface sits ~5 below the rim (so it shows through the mouth) and froths up to the rim; drops as it pours
const milkLevel = st => JUG_H - 5 + 4*st.foam - (1 - st.milk/.5)*12;
function jugArt(st, pose){
  const T = jugXf(pose), ringAt = (z,r,n=24) => ellUV(0,0,r,r,n).map(([x,y]) => T([x,y,z]));
  const rings = JUG_PROFILE.map(([z,r]) => ringAt(z,r));
  let s = '';
  // spout lip (behind the body when upright)
  const lip = [[-2.4,-5.3,JUG_H-.4],[0,-8.8,JUG_H+1.6],[2.4,-5.3,JUG_H-.4]].map(T);
  const lipFront = depthOf(avg(lip)) > depthOf(T([0,0,JUG_H-.4]));
  // handle on the +y side
  const hp = [[0,5.8,19.5],[0,10.2,18.6],[0,11.2,12.5],[0,10,6.6],[0,6.2,4.6]].map(T);
  const hFront = depthOf(T([0,10.5,12.5])) > depthOf(T([0,0,12.5]));
  const handle = `<path d="${pd(hp,false)}" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`
     + `<path d="${pd(hp,false)}" fill="none" stroke="${METAL.m}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (!hFront) s += handle;
  if (!lipFront) s += shape(lip, METAL.l, .9);
  for (let i=0;i<rings.length-1;i++) s += loft(rings[i], rings[i+1], n => toneI(n, METAL));
  s += hullInk(rings.flat(), 1.2);
  const u = unrot([1,0,0]), lineH = [[u[0],u[1],6],[u[0],u[1],15]].map(T);
  s += `<path d="${pd(lineH,false)}" fill="none" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" opacity=".6"/>`;
  // opening + milk (only while the mouth faces the viewer)
  const top = rings[rings.length-1], nTop = T([0,0,1]).map((v,i) => v - T([0,0,0])[i]);
  if (vis(nTop) && pose.tilt < 20){
    let inside = fill(pd(top), METAL.m) + fill(pd(ringAt(JUG_H-3.5, jugR(JUG_H-3.5)-.4)), METAL.d);
    if (st.milk > 0){
      const zl = milkLevel(st), r = jugR(zl) - .3, surf = ringAt(zl, r);
      inside += fill(pd(surf), st.foam > .05 ? mix(MILK, '#efe6d6', .35*(1-st.foam)) : MILK);
      const n = Math.round(st.foam*16), seed = st.steam && st.jug === 'wand' ? Math.floor(st.time*9) : 0;
      let bub = '';
      for (let i=0;i<n;i++){ const a = hash(i*3.1+seed)*2*Math.PI, d = Math.sqrt(hash(i*7.7+seed))*r*.8, br = .35 + .55*hash(i+.5+seed);
        bub += pd(on(PZ(zl+.05), ellUV(Math.cos(a)*d, Math.sin(a)*d, br, br, 8)).map(T));
      }
      if (bub) inside += `<path d="${bub}" fill="#ffffff" stroke="#b9b0a0" stroke-width=".35"/>`;
      if (st.steam && st.jug === 'wand' && !st.jugAnim){   // the wand tip dips into the milk
        inside += `<path d="${pd([[WAND_TIP[0]-.2,WAND_TIP[1],WAND_TIP[2]+3],[WAND_TIP[0],WAND_TIP[1],zl+pose.z]],false)}" fill="none" stroke="${INK}" stroke-width="4.4" stroke-linecap="round"/>`
                + `<path d="${pd([[WAND_TIP[0]-.2,WAND_TIP[1],WAND_TIP[2]+3],[WAND_TIP[0],WAND_TIP[1],zl+pose.z]],false)}" fill="none" stroke="${METAL.m}" stroke-width="2.4" stroke-linecap="round"/>`;
      }
    }
    s += clipTo(top, inside);
    s += ink(pd(top), 1);
  }
  if (lipFront) s += shape(lip, METAL.l, .9);
  if (hFront) s += handle;
  return s;
}

/* ---------- gauges: a 270° dial on the front plane ---------- */
function gauge(yc, zc, t, zones, label){
  const R = 9.4, X = BX + 2.6;
  let s = cylX(BX, X - .1, yc, zc, R + 1.3, METAL, toneI, 1.3, 30);
  if (!facing([1,0,0])) return s;                 // seen from behind: only the bezel can peek out
  const face = on(PX(X), ellUV(yc, zc, R, R, 36));
  s += fill(pd(face), '#fbfaf3') + ink(pd(face), .9);
  const pt = (tt, r, dx=.05) => { const a = (225 - 270*tt)*Math.PI/180; return [X+dx, yc - r*Math.cos(a), zc + r*Math.sin(a)]; };
  for (const zn of zones){
    const arc = []; for (let i=0;i<=10;i++) arc.push(pt(zn[0] + (zn[1]-zn[0])*i/10, R - 2.4));
    s += `<path d="${pd(arc,false)}" fill="none" stroke="${zn[2]}" stroke-width="1.9"/>`;
  }
  for (let i=0;i<=20;i++){ const major = i%5===0, tt = i/20;
    s += ink(pd([pt(tt, R-.9), pt(tt, major ? R-3.6 : R-2.3)], false), major ? .75 : .4); }
  s += tx(X+.1, yc, zc - 6, label, 2.1, INK, 700);
  // needle
  const a = (225 - 270*clamp(t))*Math.PI/180, du = -Math.cos(a), dv = Math.sin(a);
  const c = [X+.15, yc, zc], at = (k, side) => [X+.15, yc + du*k - dv*side, zc + dv*k + du*side];
  s += fill(pd([at(R-2.2, 0), at(0, .7), at(-2.2, 0), at(0, -.7)]), '#c8322a') + ink(pd([at(R-2.2, 0), at(0, .7), at(-2.2, 0), at(0, -.7)]), .4);
  s += shape(on(PX(X+.2), ellUV(yc, zc, 1.1, 1.1, 12)), INK, 0);
  // glass glints
  s += `<g pointer-events="none">` + fill(pd(on(PX(X+.25), [[yc+5.5,zc+2],[yc+3.6,zc+6.6],[yc+2,zc+7.2],[yc+4.2,zc+2.4]])), '#ffffff', 'opacity=".5"') + `</g>`;
  return s;
}

/* ---------- the scene ---------- */
const WATER = { l:'#c4e8f4', m:'#93cde4', d:'#64a3c0' };
const RES = { x0:-6, y0:66, y1:108, z0:30, z1:96, wl:72 };     // clear water reservoir on the back

// the back (-x): removable clear water tank with a lid, power cord + plug on the floor
function backParts(st, m){
  let s = '';
  const { x0, y0, y1, z0, z1, wl } = RES;
  // water seen through the clear walls
  s += box(x0+.7, y0+.7, z0+.7, -.4, y1-.7, wl, WATER, toneI, 0);
  // clear walls: whichever faces the viewer, tinted + inked
  const walls = [
    [[0,1,0],  [[x0,y1,z0],[0,y1,z0],[0,y1,z1],[x0,y1,z1]]],
    [[0,-1,0], [[x0,y0,z0],[0,y0,z0],[0,y0,z1],[x0,y0,z1]]],
    [[-1,0,0], [[x0,y0,z0],[x0,y1,z0],[x0,y1,z1],[x0,y0,z1]]]];
  for (const [n, pts] of walls) if (facing(n)) s += fill(pd(pts), CLEAR.l, 'opacity=".38"') + ink(pd(pts), 1.1);
  if (facing([-1,0,0])){
    const X = x0 - .1;
    s += ink(pd([[X,y0+.8,wl],[X,y1-.8,wl]], false), .7).replace(INK, WATER.d);
    for (const [z, t] of [[88,'MAX'],[42,'MIN']]){
      s += ink(pd([[X,y0+3,z],[X,y0+8,z]], false), .8);
      s += txOn([X-.05, y0+13.5, z-1.1], [0,1,0], t, 2.6, INK, 800); }
    for (let z = 48; z < 88; z += 5) s += ink(pd([[X,y0+3,z],[X,y0+5.5,z]], false), .5);
    s += `<g pointer-events="none">` + fill(pd(on(PX(X-.05), [[y1-14,z0+8],[y1-6,z0+34],[y1-3.5,z0+34],[y1-11.5,z0+8]])), '#ffffff', 'opacity=".38"')
       + fill(pd(on(PX(X-.05), [[y1-9,z0+44],[y1-5.5,z0+56],[y1-4.4,z0+56],[y1-7.9,z0+44]])), '#ffffff', 'opacity=".38"') + `</g>`;
  }
  // flip lid on top of the tank, with a finger tab
  s += box(x0-.7, y0-.9, z1, 0, y1+.9, z1+3.2, DARK, toneI, 1.1);
  s += box(x0-2.6, 82, z1+.7, x0-.7, 92, z1+2.5, DARK, toneI, .9);
  // power cord: strain relief -> droops to the floor -> plug lying behind the machine
  s += cylX(-3, 0, 34, 14, 2.2, DARK, toneI, 1, 16);
  s += tube([[-3,34,14],[-5.6,34.4,11],[-7.2,35.4,5.6],[-8.8,38,1.6],[-11,45,1.1],[-13.4,52.5,1.3],[-15,56,3.3]], [1,1,1,1,1,1,1], DARK, 1, 12);
  const pins = [54.3, 57.7].map(y => tube([[-22,y,3.3],[-25.2,y,3.3]], [.5,.5], METAL, .7, 8)).join('');
  const pinsFront = facing([-1,0,0]);
  if (!pinsFront) s += pins;
  s += cylX(-22, -15, 56, 3.3, 3.3, DARK, toneI, 1.1, 20);
  if (facing([1,0,0])) s += ink(pd(on(PX(-14.9), ellUV(56, 3.3, 1.3, 1.3, 10))), .6);
  else s += ink(pd([[-22.1,52.6,3.3],[-22.1,59.4,3.3]], false), .5);
  if (pinsFront) s += pins;
  return s;
}

// flat details on the back panel (x = 0)
function backFace(m){
  const tB = tone([-1,0,0], m), lab = tB === m.d ? mix(m.l, '#ffffff', .25) : mix(tB, '#000000', .55);
  const B = PX(-.2);
  let s = shape(on(PX(0), OUT), tB, 0);
  s += shape(on(B, rectUV(1.5, 22, BY-1.5, 26)), toneI([-1,0,0], METAL), .9);            // chrome band wraps round
  let vents = ''; for (const z of [84,88,92,96]) vents += pd([[-.2,14,z],[-.2,54,z]], false);
  s += `<path d="${vents}" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>`;
  // model / rating plate with rivets
  s += shape(on(B, rrUV(14, 46, 54, 72, 1.5)), toneI([-1,0,0], METAL), 1);
  for (const [y,z] of [[16.2,69.8],[51.8,69.8],[16.2,48.2],[51.8,48.2]]) s += shape(on(PX(-.3), ellUV(y, z, .6, .6, 8)), METAL.d, .3);
  s += txOn([-.3, 34, 65.6], [0,1,0], 'CAFFÈ · MOD. 06', 2.7, INK, 800);
  s += txOn([-.3, 34, 60.4], [0,1,0], '230V~ 50Hz 1400W', 2.2, INK, 700);
  s += txOn([-.3, 34, 55.6], [0,1,0], 'BOILER 1.8 L · 12 BAR', 2.2, INK, 700);
  s += txOn([-.3, 34, 50.8], [0,1,0], 'S/N 06-0611', 2.2, INK, 700);
  // hot-surface warning sticker
  s += shape(on(B, [[14,30],[26,30],[20,40.4]]), '#f4c430', .9);
  s += txOn([-.3, 20, 31.3], [0,1,0], '!', 6, INK, 800);
  s += txOn([-.3, 40, 34], [0,1,0], 'HOT', 3, lab, 800);
  // corner screws
  for (const [y,z] of [[9,103],[111,103],[9,15],[111,15]]){
    s += shape(on(PX(-.3), ellUV(y, z, 1.4, 1.4, 12)), toneI([-1,0,0], METAL), .6);
    s += ink(pd([[-.35,y-.9,z+.5],[-.35,y+.9,z-.5]], false), .45); }
  s += txOn([-.3, 87, 104.5], [0,1,0], 'WATER', 2.9, lab, 800);
  s += ink(pd(on(PX(0), OUT)), 2.2);
  return s;
}

// a +y or -y side panel: chrome band, CAFFÈ badge, vents (sgn = +1 for y = BY, -1 for y = 0)
function sidePanel(m, sgn){
  const n = [0,sgn,0], Y = sgn > 0 ? BY : 0, o = d => Y + sgn*d, Pl = PY(o(.2)), sideM = tone(n, m);
  let s = '';
  s += shape(on(Pl, rectUV(1.5, 22, BX-1.5, 26)), toneI(n, METAL), .9);
  s += shape(on(Pl, rrUV(16, 56, 62, 76, 10)), mix(sideM, '#ffffff', .12), 1.2);
  s += shape(on(PY(o(.3)), rrUV(19, 59, 59, 73, 7)), 'none', .6);
  s += txOn([39, o(.4), 63.4], [sgn,0,0], 'CAFFÈ', 7.6, mix(sideM, '#000000', .35), 800);
  let vents = ''; for (const z of [36,40,44]) vents += pd([[14,o(.2),z],[BX-14,o(.2),z]], false);
  s += `<path d="${vents}" fill="none" stroke="${INK}" stroke-width="1.4" stroke-linecap="round" opacity=".7"/>`;
  return s;
}

// cup-warmer tray on top: plate, rail (far half / cups / near half), cups
function warmer(st){
  let s = '';
  const PT = PZ(BZ + .1);
  s += shape(on(PT, rectUV(4, 8, 74, 112)), METAL.l, 1.2);
  let ribs = ''; for (let y=16; y<=104; y+=8) ribs += pd([[7,y,BZ+.15],[71,y,BZ+.15]], false);
  s += `<path d="${ribs}" fill="none" stroke="${METAL.d}" stroke-width=".8" stroke-linecap="round"/>`;
  const post = (x,y) => tube([[x,y,BZ],[x,y,BZ+7]], [1.1,1.1], METAL, .8, 10);
  const RZ = BZ + 7, CR = [[4,8],[74,8],[74,112],[4,112]];
  let k = 0; for (let i=1;i<4;i++) if (depthOf([...CR[i],RZ]) < depthOf([...CR[k],RZ])) k = i;
  const c = i => CR[(k+i+4)%4], R = i => [...c(i), RZ];
  s += post(...c(0));                                         // farthest corner
  s += pipe([R(-1), R(0), R(1)], 1.6);
  s += post(...c(1)) + post(...c(-1));
  s += byDepth([
    { at:[22,88,BZ], svg:cupArt(22, 88, BZ+.1, 6.6, 9.5, null) },
    { at:[34,66,BZ], svg:cupArt(34, 66, BZ+.1, 6.6, 9.5, null) },
    { at:[48,92,BZ], svg:act('warmcup', cupArt(48, 92, BZ+.1, 6.6, 9.5, null)) }]);
  s += pipe([R(-1), R(2), R(1)], 1.6);
  s += post(...c(2));                                         // nearest corner
  return s;
}

// things mounted on the front face (gauges, switch, lamp, knob, valve). Flat parts only when the front faces us.
function frontMounted(st, m, boiler, pump){
  const fF = facing([1,0,0]);
  let s = '';
  const tf = tone([1,0,0], m), lab = tf === m.d ? mix(m.l, '#ffffff', .25) : mix(tf, '#000000', .55);
  if (fF){ s += tx(BX+.3, 12, 102, 'POWER', 2.9, lab, 800); s += tx(BX+.3, 108, 102, 'STEAM', 2.9, lab, 800); }
  // gauges
  s += gauge(75, 95, boiler/2.5, [[.4,.6,GREEN],[.8,1,RED]], 'BOILER');
  s += gauge(45, 95, pump/16, [[.5,.69,GREEN],[.75,1,RED]], 'PUMP');
  // power switch + lamp
  let pw = fF ? shape(on(PX(BX+.2), rrUV(6.5, 84, 17.5, 100, 2.5)), toneI([1,0,0], METAL), 1.1) : '';
  pw += cylX(BX, BX+1.6, 12, 92, 2.6, METAL, toneI, .9, 16);
  const lvTip = [BX+7.5, 12, 92 + (st.on ? 4.2 : -4.2)];
  pw += tube([[BX+1.6,12,92], lvTip], [1.05,.75], METAL, .9, 12) + ball(lvTip, 1.5, METAL, .8);
  if (fF) pw += tx(BX+.3, 12, 81, st.on ? 'I' : 'O', 3, lab, 800);
  pw += cylX(BX, BX+1.6, 12, 72, 4, METAL, toneI, 1, 20);
  const lamp = st.on ? matOf('#ffa22e') : matOf('#9a7a5a');
  pw += cylX(BX+1.6, BX+2.6, 12, 72, 2.9, lamp, toneI, .9, 20);
  if (fF){
    if (st.on){ const [lx,ly] = P(BX+2.7, 12, 72);
      pw += `<circle cx="${f(lx)}" cy="${f(ly)}" r="7" fill="#ffb347" opacity=".35"/><circle cx="${f(lx)}" cy="${f(ly)}" r="4.2" fill="#ffd27a" opacity=".45"/>`; }
    pw += fill(pd(on(PX(BX+2.7), ellUV(12.9, 73.1, .9, .7, 10))), '#ffffff', 'opacity=".75"');
  }
  s += act('power', pw);
  // steam knob + valve
  let sk = cylX(BX, BX+1.6, 108, 92, 6.2, METAL, toneI, 1.1, 24);
  sk += cylX(BX+1.6, BX+6.5, 108, 92, 4.8, DARK, toneI, 1.1, 24);
  if (fF){
    const ka = (st.steam ? -90 : 0)*Math.PI/180, kx = BX+6.6;
    sk += ink(pd([[kx, 108, 92],[kx, 108 - 3.8*Math.sin(ka), 92 + 3.8*Math.cos(ka)]], false), 1.3).replace(INK, '#e9e3d3');
    for (const a of [0, -90]){ const r=a*Math.PI/180; sk += shape(on(PX(BX+.3), ellUV(108 - 7.8*Math.sin(r), 92 + 7.8*Math.cos(r), .7, .7, 8)), a===0 ? INK : '#e9e3d3', .4); }
  }
  s += act('steam', sk);
  s += cylX(BX, BX+4, 108, 74, 3, METAL, toneI, 1, 16);
  return s;
}

// free-standing things in front of the machine: drip tray first (everything stands on it), the rest by depth
function frontProps(st, m){
  // drip tray with grate + shot timer
  let tr = box(TRAY.x0, TRAY.y0, TRAY.z0, TRAY.x1, TRAY.y1, TRAY.z1, METAL, toneI, 1.4);
  tr += shape(on(PZ(TRAY.z1+.05), rectUV(TRAY.x0+2.5, TRAY.y0+3, TRAY.x1-2.5, TRAY.y1-3)), METAL.m, .9);
  let slots = ''; for (let y = TRAY.y0+6; y <= TRAY.y1-6; y += 4.4) slots += pd([[TRAY.x0+4.5,y,TRAY.z1+.1],[TRAY.x1-4.5,y,TRAY.z1+.1]], false);
  tr += `<path d="${slots}" fill="none" stroke="${DARK.d}" stroke-width="1.5" stroke-linecap="round"/>`;
  if (facing([1,0,0])){
    tr += ink(pd([[TRAY.x1,TRAY.y0,TRAY.z1-2.2],[TRAY.x1,TRAY.y1,TRAY.z1-2.2]], false), .7);
    tr += shape(on(PX(TRAY.x1+.1), rrUV(14, 6, 34, 13, 1.3)), '#1d2a26', 1);
    if (st.on) tr += tx(TRAY.x1+.2, 24, 7.8, timerText(st), 4.4, '#8af0ae', 700);
  }
  const parts = [];

  // the cup under the group (slides out / drops in)
  if (st.cup !== 'none' || st.cupAnim){
    let dx = 0, dz = 0, op = 1;
    if (st.cupAnim){ const t = st.cupAnim.t;
      if (st.cupAnim.kind === 'out'){ dx = 14*ease(clamp(t/.55)); dz = 10*ease(clamp((t-.45)/.55)); op = 1 - clamp((t-.55)/.45); }
      else { dz = 12*(1 - ease(t)); op = clamp(t*2); } }
    let c = '';
    if (dz < .5) c += fill(pd(on(PZ(CUP.z+.15), ellUV(CUP.x+dx+.6, CUP.y+.4, CUP.r*.78, CUP.r*.78, 20))), '#000000', 'opacity=".22"');
    c += cupArt(CUP.x+dx, CUP.y, CUP.z+dz, CUP.r, CUP.h, st.fill > 0 ? st.fill : null, st.latte);
    parts.push({ at:[CUP.x+dx, CUP.y, CUP.z+dz], svg:act('cup', `<g opacity="${op.toFixed(2)}">${c}</g>`) });
  }

  // coffee streams: spouts -> cup surface (lower part seen only through the rim)
  if (flowing(st.shot) && st.cup === 'cup' && !st.cupAnim){
    const zf = CUP.z + 1.2, zl = zf + st.fill*(CUP.h - 3.2), rimZ = CUP.z + CUP.h;
    const tail = st.shot > .93, dash = tail ? '1.2 3.2' : '4 1.3', off = f(-st.time*38);
    const strm = (z0, z1, y) => `<path d="${pd([[GX,y,z0],[GX,y,z1]],false)}" fill="none" stroke="${COFFEE}" stroke-width="${tail ? 1 : 1.35}" stroke-linecap="round" stroke-dasharray="${dash}" stroke-dashoffset="${off}"/>`;
    let up = '', low = '';
    for (const y of SPOUTS){ up += strm(SPOUT_Z, rimZ, y); low += strm(rimZ, zl, y); }
    parts.push({ at:[GX, GY, 30], svg: up + clipTo(zRing(CUP.x, CUP.y, rimZ, CUP.r-.8), low) });
  }

  // group head + portafilter (click to pull)
  let g = '';
  const ear = box(GX-1.5, GY+9.6, 53.6, GX+1.5, GY+11.4, 56, METAL, toneI, .8);
  const earFront = depthOf([GX, GY+10.5, 55]) > depthOf([GX, GY, 55]);
  if (!earFront) g += ear;
  for (const y of SPOUTS) g += tube([[GX,y,SPOUT_Z],[GX,y,43.6]], [1.05,1.05], METAL, .8, 12);
  g += cyl(GX, GY, 43.4, 46.2, 3.8, METAL, toneI, 1);
  g += cyl(GX, GY, 46, 53.6, 9, METAL, toneI, 1.3, 28);
  g += cyl(GX, GY, 53.4, 56.2, 10.2, METAL, toneI, 1.2, 28);
  if (earFront) g += ear;                      // ear of the portafilter
  g += cyl(GX, GY, 56, 57.8, 9.8, DARK, toneI, 1, 28);
  g += cyl(GX, GY, 57.6, 63.2, 10.6, METAL, toneI, 1.3, 28);
  const prof = rrUV(GY-11, 63, GY+11, 81, 4);
  g += extrude(prof, BX, 93, METAL, toneI) + (facing([1,0,0]) ? shape(on(PX(93), prof), toneI([1,0,0], METAL), 1.2) : '') + hullInk([...on(PX(BX), prof), ...on(PX(93), prof)], 1.5);
  g += cylX(93, 94.2, GY, 72, 3.4, METAL, toneI, .9, 18);
  if (facing([1,0,0])) g += shape(on(PX(94.3), ellUV(GY, 72, 1.6, 1.6, 12)), METAL.d, .6);
  // handle: steel neck + bakelite grip, tilting slightly down toward the viewer
  const hz = x => 50.6 - (x - 95)*.14;
  g += tube([[94.5,GY,hz(94.5)],[100,GY,hz(100)]], [2.1,1.8], METAL, 1, 16);
  const hx = [100, 101, 110, 119, 122.6, 124.2, 125.1];
  g += tube(hx.map(x => [x, GY, hz(x)]), [2.5, 2.9, 3.1, 3.5, 3.3, 2.5, 1.2], DARK, 1.3, 18);
  g += ink(pd([[106,GY+.2,hz(106)+3.1],[118,GY+.2,hz(118)+3.4]], false), .9).replace(INK, DARK.l);
  // E61 lever on top of the group: swings forward while brewing
  const la = (st.lever != null ? st.lever : -14) * Math.PI/180, piv = [GX, GY, 81];
  g += cyl(GX, GY, 81, 83, 2.6, METAL, toneI, .9, 16);
  const tip = [piv[0] + 10*Math.sin(la), GY, piv[2] + 2 + 10*Math.cos(la)];
  g += tube([[GX, GY, 83], tip], [1.2, .9], METAL, .9, 12) + ball(tip, 2.4, DARK, 1);
  parts.push({ at:[GX, GY, 46], svg:act('pull', g) });

  // milk jug: under the wand it is drawn with the wand (the nozzle dips into it); elsewhere it sorts on its own
  const jp = jugPose(st);
  const nearWand = st.pour != null ? Math.hypot(jp.x - JUG_WAND.x, jp.y - JUG_WAND.y) < 8
    : st.jug === 'wand' ? !(st.jugAnim && st.jugAnim.t < .5) : !!(st.jugAnim && st.jugAnim.t >= .5);
  let ju = act('jug', jugArt(st, jp));
  if (st.pour != null && st.pour > .3 && st.pour < .78 && st.cup === 'cup'){   // milk stream from the spout into the cup
    const sp0 = jugXf(jp)([0,-8.6,JUG_H+1.4]), rimZ = CUP.z + CUP.h, zl = CUP.z + 1.2 + st.fill*(CUP.h-3.2);
    const top = [sp0, [CUP.x, CUP.y-.5, rimZ]], low = [[CUP.x, CUP.y-.5, rimZ], [CUP.x, CUP.y-.5, zl]], off = f(-st.time*30);
    const strm = pts => `<path d="${pd(pts,false)}" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" opacity=".55"/><path d="${pd(pts,false)}" fill="none" stroke="${MILK}" stroke-width="1.9" stroke-linecap="round" stroke-dasharray="5 1.2" stroke-dashoffset="${off}"/>`;
    ju += strm(top) + clipTo(zRing(CUP.x, CUP.y, rimZ, CUP.r-.8), strm(low));
  }
  if (!nearWand) parts.push({ at:[jp.x, jp.y, jp.z + 11], svg:ju });

  // steam wand: valve -> ball joint -> bent pipe -> nozzle, then the jug on it, then the steam
  const wand = [[BX+4,108,74],[84.6,108,74],[86.6,108.2,73.3],[88,108.5,71.6],[88.6,108.8,69.4],[WAND_TIP[0]-.2,WAND_TIP[1],WAND_TIP[2]+3]];
  let w = act('steam', pipe(wand, 2.9) + ball([BX+4.4,108,74], 2.6, METAL, .9)
    + `<path d="${pd([[WAND_TIP[0]-.2,WAND_TIP[1],WAND_TIP[2]+3],WAND_TIP],false)}" fill="none" stroke="${INK}" stroke-width="4.4" stroke-linecap="round"/>`
    + `<path d="${pd([[WAND_TIP[0]-.2,WAND_TIP[1],WAND_TIP[2]+3],WAND_TIP],false)}" fill="none" stroke="${DARK.l}" stroke-width="2.4" stroke-linecap="round"/>`);
  if (nearWand) w += ju;
  w += steamPuffs(st);
  parts.push({ at:[88, 108, 30], svg:w });

  return act('tray', tr) + byDepth(parts);
}

// steam puffs (analytic: puff k is born at k·0.09 s and lives 1.5 s); into the milk only small wisps escape
function steamPuffs(st){
  const frothing = st.jug === 'wand' && !st.jugAnim && st.milk > 0;
  if (st.steamT > 0 && frothing && st.steam){
    let w = '';
    for (let k=0;k<5;k++){ const u = ((st.time*.9 + k/5) % 1), r = 1.2 + 3.2*u, a = k*1.3;
      const [X,Y] = P(WAND_TIP[0] + 2*Math.cos(a), WAND_TIP[1] + 2*Math.sin(a), JUG_WAND.z + JUG_H + 1 + 14*u);
      w += `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(r)}" fill="#ffffff" opacity="${f((1-u)*.8)}"/>`; }
    return `<g pointer-events="none">${w}</g>`;
  }
  if (!(st.steamT > 0)) return '';
  const LIFE = 1.5, EVERY = .09, stop = st.steamStop == null ? Infinity : st.steamStop;
  let puffs = '', rims = '';
  const k1 = Math.floor(Math.min(st.steamT, stop) / EVERY), k0 = Math.max(0, Math.ceil((st.steamT - LIFE) / EVERY));
  for (let k = k0; k <= k1; k++){
    const age = st.steamT - k*EVERY; if (age < 0 || age > LIFE) continue;
    const u = age / LIFE, h1 = hash(k), h2 = hash(k+.37), h3 = hash(k+.71);
    const z = WAND_TIP[2] - 3.5*Math.sin(Math.min(u,.18)/.18*Math.PI/2) + 58*Math.pow(u, 1.15);
    const x = WAND_TIP[0] + 4 + 16*u*(h1+.2), y = WAND_TIP[1] + 14*u*(h2-.4);
    const r = (1.8 + 10.5*Math.pow(u,.7)*(.7+.5*h3)) * (u > .65 ? Math.max(0, 1 - (u-.65)/.35) : 1);
    if (r < .3) continue;
    const [X,Y] = P(x,y,z);
    rims += `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(r+.8)}"/>`;
    puffs += `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(r)}"/>`;
  }
  // one merged cloud: an ink rim under a white fill, so overlapping puffs read as a single billow
  return `<g pointer-events="none" opacity=".95"><g fill="${INK}" opacity=".75">${rims}</g><g fill="#ffffff">${puffs}</g></g>`;
}

function scene(st, m){
  let s = '';
  const heatT = ease(st.heat), boiler = 1.25*heatT - (steaming(st) ? .07 : 0);
  const pump = pumpOf(st.shot);
  const fF = facing([1,0,0]), fB = facing([-1,0,0]);

  // cast shadow: body + drip tray + rail
  s += castShadow([...on(PX(0),OUT), ...on(PX(BX),OUT),
    [TRAY.x1,TRAY.y0,TRAY.z0],[TRAY.x1,TRAY.y1,TRAY.z0],[TRAY.x1,TRAY.y0,TRAY.z1],[TRAY.x1,TRAY.y1,TRAY.z1],
    [4,8,117],[74,8,117],[74,112,117],[4,112,117]]);

  // feet
  for (const [x,y] of [[8,8],[8,112],[70,112],[70,8]]) s += cyl(x, y, 0, 4.5, 3.4, DARK, toneI, 1);

  // whatever hangs off a face turned away is drawn before the body: the body hides it, protruding bits peek out
  const back = backParts(st, m), mounted = frontMounted(st, m, boiler, pump), props = frontProps(st, m);
  if (!fB) s += back;
  if (!fF) s += props + mounted;

  // body shell + its visible faces
  s += extrude(OUT, 0, BX, m);
  if (facing([0,1,0])) s += sidePanel(m, 1);
  if (facing([0,-1,0])) s += sidePanel(m, -1);
  if (fF){
    const F = PX(BX);
    s += shape(on(F, OUT), tone([1,0,0], m), 0);
    s += shape(on(PX(BX+.15), rrUV(34, 14, 86, 57, 3)), mix(tone([1,0,0], m), '#000000', .12), 1);   // splash panel behind the cup
    s += shape(on(PX(BX+.2), rectUV(1.5, 22, 32, 26)), toneI([1,0,0], METAL), .9) + shape(on(PX(BX+.2), rectUV(88, 22, BY-1.5, 26)), toneI([1,0,0], METAL), .9);
    s += ink(pd(on(F, OUT)), 2.2);
  }
  if (fB) s += backFace(m);
  s += hullInk([...on(PX(0),OUT), ...on(PX(BX),OUT)], 2.8);

  if (fB) s += back;
  s += warmer(st);
  if (fF) s += mounted + props;
  return s;
}

const steaming = st => st.steam;
const pad2 = n => String(n).padStart(2, '0');
const shotSecs = st => st.shot != null ? Math.floor(st.shot*SHOT_S) : st.lastShot;
function timerText(st){ const v = shotSecs(st); return v == null ? '--' : pad2(v) + 's'; }

/* ---------- behaviour ---------- */
let UI = null;
function kick(){ const st = UI.st; if (st._run) return; st._run = true; UI.animate(dt => { const more = step(st, dt); if (!more) st._run = false; return more; }); }
function step(st, dt){
  let a = false; st.time += dt;
  if (st.on && st.heat < 1){ st.heat = Math.min(1, st.heat + dt/2); a = true; if (st.heat >= 1) UI.flash('Up to temperature — pull a shot', 1600); }
  if (!st.on && st.heat > 0){ st.heat = Math.max(0, st.heat - dt/1.5); a = true; }
  if (st.shot != null && !st.frozen){
    st.shot += dt/SHOT_DUR;
    if (st.shot >= 1){ st.shot = null; st.fill = 1; st.lastShot = SHOT_S; UI.flash('Shot done — 25 s, about 36 g', 1800); }
    else st.fill = fillOf(st.shot);
    a = true;
  }
  // lever eases toward its target angle
  const lt = st.shot != null ? 72 : -14;
  if (st.lever == null) st.lever = -14;
  if (Math.abs(st.lever - lt) > .5){ st.lever += (lt - st.lever)*Math.min(1, dt*12); a = true; } else st.lever = lt;
  if (st.cupAnim){
    st.cupAnim.t += dt / (st.cupAnim.kind === 'out' ? 1 : .5);
    if (st.cupAnim.t >= 1){ if (st.cupAnim.kind === 'out'){ st.cup = 'none'; st.fill = 0; st.lastShot = null; st.latte = 0; } st.cupAnim = null; }
    a = true;
  }
  if (st.jugAnim){ st.jugAnim.t += dt/.6; if (st.jugAnim.t >= 1){ st.jug = st.jugAnim.dest; st.jugAnim = null; } a = true; }
  if (st.pour != null){
    st.pour += dt/3.2;
    if (st.pour > .3 && st.pour < .78){ st.latte = clamp((st.pour-.3)/.48); st.milk = Math.max(0, .5*(1 - (st.pour-.3)/.48)); }
    if (st.pour >= 1){ st.pour = null; st.jug = 'rest'; st.milk = 0; st.foam = 0; st.latte = 1; UI.flash('Latte ready — click the cup to take it', 2000); }
    a = true;
  }
  if (st.steam && st.jug === 'wand' && !st.jugAnim && st.milk > 0 && st.foam < 1){
    st.foam = Math.min(1, st.foam + dt/3.5);
    if (st.foam >= 1){ stopSteam(st); UI.flash('Milk is silky — click the jug to pour it on your shot', 2200); }
  }
  if (st.steam || (st.steamStop != null && st.steamT < st.steamStop + 1.6)){ st.steamT += dt; a = true; }
  else if (!st.steam && st.steamStop != null){ st.steamT = 0; st.steamStop = null; }
  return a;
}
function power(st){
  st.on = !st.on;
  if (!st.on){ if (st.steam) stopSteam(st); st.shot = null; st.frozen = false; }
  kick();
}
function pull(st, ui){
  if (st.shot != null){ if (st.frozen){ st.frozen = false; kick(); } return; }
  if (!st.on) return ui.flash('Switch the machine on first (power, right)');
  if (st.heat < 1) return ui.flash('Still heating — wait for the green zone');
  if (st.cup !== 'cup' || st.cupAnim) return ui.flash('No cup — click the drip tray to place one');
  if (st.fill > .02) return ui.flash('That cup is full — click it to take it');
  st.shot = 0; st.fill = 0; st.lastShot = null; kick();
}
function stopSteam(st){ st.steam = false; st.steamStop = st.steamT; }
function steam(st, ui){
  if (st.steam){ stopSteam(st); kick(); return; }
  if (!st.on) return ui.flash('Switch the machine on first');
  if (st.heat < .6) return ui.flash('Not enough steam pressure yet');
  st.steam = true; st.steamT = 0; st.steamStop = null; kick();
}
function moveJug(st, dest){ st.jugAnim = { from: jugPose(st), to: dest === 'wand' ? JUG_WAND : JUG_REST, dest, t:0 }; kick(); }
function jug(st, ui){
  if (st.jugAnim || st.pour != null) return;
  if (st.steam && st.jug === 'wand'){ stopSteam(st); kick(); return; }
  if (st.milk <= 0){ st.milk = .5; st.foam = 0; ui.flash('Fresh cold milk in the jug'); if (st.jug !== 'rest') moveJug(st, 'rest'); return; }
  if (st.foam >= .6){
    if (st.cup === 'cup' && !st.cupAnim && st.fill > .5 && st.latte === 0){ st.pourFrom = jugPose(st); st.pour = 0; kick(); return; }
    if (st.latte > 0) return ui.flash('This one already has milk — take the cup first');
    if (st.jug === 'wand') moveJug(st, 'rest');
    return ui.flash('Milk is ready — pull a shot to pour it on');
  }
  moveJug(st, st.jug === 'rest' ? 'wand' : 'rest');
  if (st.jug === 'rest') ui.flash('Jug under the wand — open the steam knob to froth', 1800);
}
function takeCup(st, ui){
  if (st.cupAnim) return;
  if (st.pour != null) return ui.flash('Pouring…');
  if (st.shot != null) return ui.flash('Wait for the shot to finish');
  ui.flash(st.fill > .5 ? 'Enjoy! — click the drip tray for a fresh cup' : 'Cup removed — click the drip tray for a fresh one', 1800);
  st.cupAnim = { kind:'out', t:0 }; kick();
}
function placeCup(st, ui){
  if (st.cupAnim) return;
  if (st.cup !== 'none') return st.fill > .5 ? takeCup(st, ui) : ui.flash('There is already a cup under the group');
  st.cup = 'cup'; st.fill = 0; st.latte = 0; st.lastShot = null; st.cupAnim = { kind:'in', t:0 }; kick();
}

UI = mountFigure({
  fig:'02', title:'Espresso machine', hint:'power on, pull a shot, froth milk under the wand, pour a latte',
  idea:"Hot water is squeezed through tightly packed coffee at about 9 times the push of the air around us.",
  size:[126, BY, 118], palette:'tomato', views:true,
  state:{ on:false, heat:0, shot:null, frozen:false, fill:0, cup:'cup', cupAnim:null, steam:false, steamT:0, steamStop:null, lastShot:null, lever:-14, time:0,
          jug:'rest', jugAnim:null, milk:.5, foam:0, pour:null, pourFrom:null, latte:0 },
  scene,
  readout: st => {
    const bar = (1.25*ease(st.heat)).toFixed(1);
    let r;
    if (st.pour != null) return 'Pouring the milk… latte art incoming';
    if (st.steam && st.jug === 'wand' && !st.jugAnim && st.milk > 0) return `Frothing milk · ${Math.round(st.foam*100)}% — click the jug to stop`;
    if (st.shot != null) r = `Pulling shot · ${pumpOf(st.shot).toFixed(1)} bar · ${pad2(shotSecs(st))} s / ${SHOT_S} s`;
    else if (!st.on) r = st.heat > 0 ? 'Cooling down' : 'Off — flip the power switch to heat up';
    else if (st.heat < 1) r = `Heating… boiler ${bar} bar`;
    else if (st.cup === 'none') r = `Ready · ${bar} bar — click the drip tray to place a cup`;
    else if (st.latte >= 1) r = 'Latte ready — click the cup to take it';
    else if (st.fill > .5 && st.foam >= .6) r = 'Shot + frothed milk — click the jug to pour';
    else if (st.jug === 'wand' && st.foam < .6) r = 'Jug under the wand — open the steam knob to froth the milk';
    else if (st.fill > .5) r = `Shot ready${st.lastShot ? ' (' + st.lastShot + ' s)' : ''} — now froth some milk for a latte`;
    else r = `Ready · boiler ${bar} bar — click the portafilter to pull a shot`;
    return r + (st.steam ? ' · steaming' : '');
  },
  buttonsLabel:'Machine',
  buttons:[
    { label:'Power on', onClick:(st, ui) => st.on ? ui.flash('Already on') : power(st) },
    { label:'Pull a shot', onClick:pull },
    { label:'Milk jug under wand', onClick:(st, ui) => { if (st.jug === 'wand' || st.foam >= .6) return ui.flash('Jug is ready at the wand');
        if (st.milk <= 0){ st.milk = .5; st.foam = 0; } jug(st, ui); } },
    { label:'Steam the milk', onClick:(st, ui) => st.jug !== 'wand' && !st.steam ? ui.flash('Put the milk jug under the wand first') : steam(st, ui) },
    { label:'Pour milk', onClick:(st, ui) => st.foam < .6 ? ui.flash('Froth the milk first') : jug(st, ui) },
    { label:'Take your cup', onClick:(st, ui) => st.cup === 'none' ? ui.flash('No cup to take') : takeCup(st, ui) },
    { label:'New cup', onClick:(st, ui) => st.cup === 'none' ? placeCup(st, ui) : ui.flash('There is already a cup') },
    { label:'Power off', onClick:(st) => st.on && power(st) },
  ],
  next: st => {
    if (!st.on) return 0;
    if (st.heat < 1 || st.shot != null || st.pour != null || st.jugAnim || st.cupAnim) return -1;
    if (st.cup === 'none') return 6;
    if (st.latte >= 1) return 5;
    if (st.fill < .5) return 1;
    if (st.steam) return -1;   // frothing: wait for it
    if (st.foam >= .6) return 4;
    return st.jug === 'wand' ? 3 : 2;
  },
  acts:{
    power:(st) => power(st),
    pull:(st, el, ui) => pull(st, ui),
    steam:(st, el, ui) => steam(st, ui),
    jug:(st, el, ui) => jug(st, ui),
    cup:(st, el, ui) => takeCup(st, ui),
    tray:(st, el, ui) => placeCup(st, ui),
    warmcup:(st, el, ui) => st.cup === 'none' ? placeCup(st, ui) : ui.flash('Cups warming on top — take the cup under the group first'),
  },
  params(st, q){
    const hot = () => { st.on = true; st.heat = 1; };
    if (q.get('on') === '1') hot();
    if (q.has('heat')){ st.on = true; st.heat = clamp(+q.get('heat')); }
    const c = q.get('cup');
    if (c === 'none') st.cup = 'none';
    if (c === 'full'){ st.cup = 'cup'; st.fill = 1; st.lastShot = SHOT_S; }
    if (q.has('fill')) st.fill = clamp(+q.get('fill'));
    if (q.has('shot')){ const t = clamp(+q.get('shot')); hot(); st.cup = 'cup';
      if (t >= 1){ st.fill = 1; st.lastShot = SHOT_S; } else { st.shot = t; st.frozen = true; st.fill = fillOf(t); st.lever = 72; st.time = .37; } }
    if (q.get('steam') === '1'){ hot(); st.steam = true; st.steamT = 1.7; }
    if (q.get('jug') === 'wand') st.jug = 'wand';
    if (q.has('foam')) st.foam = clamp(+q.get('foam'));
    if (q.has('latte')){ hot(); st.cup = 'cup'; st.fill = 1; st.lastShot = SHOT_S; st.latte = clamp(+q.get('latte')); }
    if (q.has('pour')){ hot(); st.cup = 'cup'; st.fill = 1; st.foam = 1; st.pourFrom = JUG_REST; st.pour = clamp(+q.get('pour')); st.time = .4;
      if (st.pour > .3 && st.pour < .78){ st.latte = clamp((st.pour-.3)/.48); st.milk = .5*(1-st.latte); } st._frozenPour = true; }
  },
});
if (UI.st.steam || (UI.st.on && UI.st.heat < 1)) kick();
