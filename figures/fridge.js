
/* ---------- geometry (x = depth, y = width, z = up) ---------- */
const W = 70, D = 75, H = 170;      // overall: depth incl. doors, width, height
const CW = 63, DT = 7, T = 5;        // cabinet front plane, door thickness, wall thickness
const DOOR_MAX = 110, FZ_MAX = 105;  // max swing (degrees)
// rounded rect with separate top / bottom corner radii (Smeg-style: big top, small bottom)
const rrT = (u0,v0,u1,v1,rt,rb,n=8) => [...arcUV(u1-rb,v0+rb,rb,-90,0,n), ...arcUV(u1-rt,v1-rt,rt,0,90,n), ...arcUV(u0+rt,v1-rt,rt,90,180,n), ...arcUV(u0+rb,v0+rb,rb,180,270,n)];
const OUT    = rrT(0,4,D,H,20,3);            // body profile in (y,z)
const FDOOR  = rrT(0,7,D,123,2,2);           // fridge door
const ZDOOR  = rrT(0,124.5,D,H,20,2);        // freezer door
const F_OPEN = rrUV(T,14,D-T,119,3);         // fridge compartment opening on x = CW
const Z_OPEN = rrT(T,128,D-T,H-6,14,3);      // freezer compartment opening
const SHELVES = [35,59,84];                  // glass shelf heights (lowest covers the crisper)

/* ---------- materials ---------- */
const LINER = { l:'#f8f8f3', m:'#e6e8e3', d:'#c9cdc8' };
const FROST = { l:'#eef7fb', m:'#d5e8f0', d:'#adc9d6' };
const GASKET = '#c3c5bf';
const GLASS = { l:'#e2f1f3', m:'#c8e0e4', d:'#9fbfc5' };
const MILK = { l:'#fdfdf8', m:'#eceee6', d:'#c9ccc2' };
const PLATE = { l:'#fcfbf5', m:'#e5e2d6', d:'#bdb9aa' };
const CARD = matOf('#d9c7a4');
const EGG = matOf('#f4e2c4');

/* ---------- small helpers ---------- */
// view-aware sort key (in view 0 exactly x+y+z, so the old hand order is kept)
const dk = (x,y,z=0) => { const r = rotV([x,y,z]); return r[0]+r[1]+r[2]; };
const byDk = (list, at) => list.slice().sort((p,q) => dk(...at(p)) - dk(...at(q)));
// glint offset: the screen-right edge of a round thing, in model coordinates (view 0: +x −y)
const GO = r => [[r,-r],[r,r],[-r,r],[-r,-r]][VIEW & 3];
// text on the back plane x = const (reads +y) and on the right side plane y = const (reads −x)
const txB = (x,y,z,str,size,col=INK,weight=700) => { const o=P(x,y,z);
  return `<text transform="${txM(o, Dv(0,1,0), Dv(0,0,-1))}" font-size="${size}" fill="${col}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="${weight}" letter-spacing=".04em">${str}</text>`; };
const txR = (x,y,z,str,size,col=INK,weight=700,ls='.04em') => { const o=P(x,y,z);
  return `<text transform="${txM(o, Dv(-1,0,0), Dv(0,0,-1))}" font-size="${size}" fill="${col}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="${weight}" letter-spacing="${ls}">${str}</text>`; };
const zRing = (x,y,z,r,n=20) => on(PZ(z), ellUV(x,y,r,r,n));
// lathe: vertical body of revolution; prof = [[r,h],[r,h,mat],...] (mat colours the segment below that ring)
function lathe(x,y,z,prof,w=1.1,n=20){
  const rings = prof.map(([r,h]) => zRing(x,y,z+h,Math.max(r,.05),n)); let s = '';
  for (let i=1;i<rings.length;i++){ const mt = prof[i][2]; s += loft(rings[i-1],rings[i],nr=>toneI(nr,mt)); }
  const last = rings[rings.length-1], lm = prof[prof.length-1][2];
  return s + fill(pd(last), toneI([0,0,1],lm)) + ink(pd(last), w*.65) + hullInk(rings.flat(), w);
}
// front half of a horizontal ring (seam lines on lathes)
const seam = (x,y,z,r,w=.6) => { const a = 90*(VIEW&3); return line(arcUV(x,y,r,-45+a,135+a,10).map(([u,v])=>[u,v,z]), w); };
const R3 = 1.2247;                                  // iso scale of a sphere's radius on screen
function ball(x,y,z,r,mt,w=.8,sy=1){
  const [cx,cy] = P(x,y,z), rr = r*R3;
  return `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rr)}" ry="${f(rr*sy)}" fill="${mt.m}"/>`
    + `<ellipse cx="${f(cx-rr*.16)}" cy="${f(cy-rr*.2*sy)}" rx="${f(rr*.7)}" ry="${f(rr*.7*sy)}" fill="${mt.l}"/>`
    + `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rr)}" ry="${f(rr*sy)}" fill="none" stroke="${INK}" stroke-width="${w}"/>`;
}
const glint = (a,b,o=.55,w=1.2) => `<path d="${pd([a,b],false)}" stroke="#fff" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
// a tube between two 3D points (handles, posts)
function tube(a,b,r,mt,w=1,n=12){
  const ax = norm(sub(b,a)), u = norm(Math.abs(ax[2])<.9 ? cross(ax,[0,0,1]) : cross(ax,[1,0,0])), v = cross(ax,u);
  const ring = p => Array.from({length:n},(_,i)=>{ const t=i/n*2*Math.PI, c=Math.cos(t)*r, s=Math.sin(t)*r; return [p[0]+u[0]*c+v[0]*s, p[1]+u[1]*c+v[1]*s, p[2]+u[2]*c+v[2]*s]; });
  const A = ring(a), B = ring(b); let s = loft(A,B,nr=>toneI(nr,mt));
  if (vis(ax)) s += fill(pd(B), toneI(ax,mt)); else s += fill(pd(A), toneI(ax.map(q=>-q),mt));
  return s + hullInk([...A,...B], w);
}
// a frame maps local (t, y, z) to world. ID = the unrotated world; doorFrame = rotated about the hinge.
const ID = { R:(t,y,z)=>[t,y,z], nT:[1,0,0], nY:[0,1,0] };
function doorFrame(deg){
  const a = deg*Math.PI/180, c = Math.cos(a), s = Math.sin(a);
  // hinge axis: vertical line at (x = CW, y = 0) — the right-hand edge on screen
  return { R:(t,y,z)=>[CW + t*c + y*s, -t*s + y*c, z], nT:[c,-s,0], nY:[s,c,0] };
}
const PD = (fr,t) => ([u,v]) => fr.R(t,u,v);
const neg = n => n.map(v=>-v);
// box in a frame: t0..t1 (local depth), y0..y1, z0..z1
function rbox(fr,t0,t1,y0,y1,z0,z1,mt,w=1,op=1,top=true){
  const R = fr.R, e = op<1 ? `fill-opacity="${op}"` : '';
  const F = [
    { n:fr.nT,       p:[R(t1,y0,z0),R(t1,y1,z0),R(t1,y1,z1),R(t1,y0,z1)] },
    { n:neg(fr.nT),  p:[R(t0,y0,z0),R(t0,y1,z0),R(t0,y1,z1),R(t0,y0,z1)] },
    { n:fr.nY,       p:[R(t0,y1,z0),R(t1,y1,z0),R(t1,y1,z1),R(t0,y1,z1)] },
    { n:neg(fr.nY),  p:[R(t0,y0,z0),R(t1,y0,z0),R(t1,y0,z1),R(t0,y0,z1)] },
    { n:[0,0,1],     p:[R(t0,y0,z1),R(t1,y0,z1),R(t1,y1,z1),R(t0,y1,z1)] } ];
  if (!top) F.pop();
  let s = ''; for (const q of F) if (vis(q.n)) s += fill(pd(q.p), toneI(q.n,mt), e) + ink(pd(q.p), w);
  return s;
}
// carton with a gable top (ridge along local y)
function carton(fr,t,y,z,col,band){
  const m = matOf(col), a = 2.8, h = 15, R = fr.R;
  let s = rbox(fr,t-a,t+a,y-a,y+a,z,z+h,m,1);
  s += rbox(fr,t-a-.05,t+a+.05,y-a-.05,y+a+.05,z+4,z+8,matOf(band),.6,1,false);
  const top = [
    { n:norm([fr.nT[0]*1+0,fr.nT[1],1]), p:[R(t+a,y-a,z+h),R(t+a,y+a,z+h),R(t,y+a,z+h+3),R(t,y-a,z+h+3)] },
    { n:norm([-fr.nT[0],-fr.nT[1],1]),   p:[R(t-a,y-a,z+h),R(t-a,y+a,z+h),R(t,y+a,z+h+3),R(t,y-a,z+h+3)] },
    { n:fr.nY,      p:[R(t-a,y+a,z+h),R(t+a,y+a,z+h),R(t,y+a,z+h+3)] },
    { n:neg(fr.nY), p:[R(t-a,y-a,z+h),R(t+a,y-a,z+h),R(t,y-a,z+h+3)] } ];
  for (const q of top) if (vis(q.n)) s += fill(pd(q.p), toneI(q.n,m)) + ink(pd(q.p),.9);
  s += rbox(fr,t-.4,t+.4,y-a,y+a,z+h+3,z+h+4.3,m,.8);           // the fin
  return s;
}
// text lying on a door face (plane of local y,z at depth t)
function txF(fr,t,y,z,str,size,col=INK,weight=800,inner=false){
  const o = P(...fr.R(t,y,z)), d = Dv(...(inner ? fr.nY : neg(fr.nY)));
  return `<text transform="matrix(${d[0].toFixed(4)} ${d[1].toFixed(4)} 0 1 ${f(o[0])} ${f(o[1])})" font-size="${size}" fill="${col}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="${weight}" letter-spacing=".12em">${str}</text>`;
}

/* ---------- food ---------- */
const FOOD = {
  cake(x,y,z){
    let s = lathe(x,y,z,[[9.5,0],[10.5,1,PLATE]],1);
    s += lathe(x,y,z+1,[[7.8,0],[7.8,2.6,matOf('#c98a5a')],[7.8,3.4,matOf('#fbeedd')],[7.8,6,matOf('#c98a5a')],[7.8,7.6,matOf('#f6b6c8')]],1.2);
    s += seam(x,y,z+3.6,7.9) + seam(x,y,z+4.4,7.9);
    const berries = byDk([0,72,144,216,288].map(a=>{ const r=a*Math.PI/180; return [x+5*Math.cos(r), y+5*Math.sin(r)]; }), p=>p);
    for (const [bx,by] of berries) s += ball(bx,by,z+9.6,1.5,matOf('#e2483d'),.7);
    s += ball(x,y,z+10.2,1.8,matOf('#c92a3e'),.7);
    return s;
  },
  eggs(x,y,z){
    let s = box(x-5,y-7.5,z,x+5,y+7.5,z+3.5,CARD,toneI,1);
    const pts = []; for (const dx of [-2.5,2.5]) for (let j=0;j<3;j++) pts.push([x+dx, y-5+5*j]);
    for (const [ex,ey] of byDk(pts, p=>p)) s += ball(ex,ey,z+5.3,2.1,EGG,.75,1.2);
    return s;
  },
  milk(x,y,z){
    const blue = matOf('#3f7fd6');
    let s = lathe(x,y,z,[[3.2,0],[3.6,.8,MILK],[3.6,5,MILK],[3.6,9,blue],[3.6,12,MILK],[2.1,16,MILK],[1.9,18,MILK],[2.1,18.1,blue],[2.1,19.6,blue]],1.2);
    const [gx,gy] = GO(2.6);
    s += glint([x+gx,y+gy,z+2],[x+gx,y+gy,z+14]);
    return s;
  },
  jam(x,y,z){
    const jam = matOf('#b8283e'), lab = matOf('#fff3d9'), lid = matOf('#e2483d');
    let s = lathe(x,y,z,[[3.8,0],[4.2,.7,jam],[4.2,2.6,jam],[4.2,5.8,lab],[4.2,7,jam],[3.5,8,jam],[3.8,8.1,lid],[3.8,10,lid]],1.1);
    s += ball(x+1.8,y-1.2,z+10.3,.6,{l:'#ffffff',m:'#ffffff'},0) + ball(x-.6,y+1.6,z+10.3,.6,{l:'#ffffff',m:'#ffffff'},0);
    const [gx,gy] = GO(3);
    return s + glint([x+gx,y+gy,z+1.2],[x+gx,y+gy,z+6.6],.5,1);
  },
  pickles(x,y,z){
    const g = matOf('#7ea33c'), lid = matOf('#d9b23a');
    let s = lathe(x,y,z,[[3.9,0],[4.3,.7,g],[4.3,11,g],[3.6,12,g],[3.9,12.1,lid],[3.9,14,lid]],1.1);
    s += seam(x,y,z+4,4.35,.5) + seam(x,y,z+8,4.35,.5);
    const [gx,gy] = GO(3);
    return s + glint([x+gx,y+gy,z+1.2],[x+gx,y+gy,z+10],.5,1);
  },
  cheese(x,y,z){
    const c = matOf('#f6cf55'), A = [[x-5,y-5,z],[x+5,y-5,z],[x+5,y+5,z]], B = A.map(([a,b])=>[a,b,z+5]);
    let s = loft(A,B,nr=>toneI(nr,c)) + fill(pd(B),c.l) + ink(pd(B),.9) + hullInk([...A,...B],1.1);
    for (const [hx,hy,r] of [[3,-3,.9],[0,-3.5,.6],[3.5,0,.7]]) s += fill(pd(on(PZ(z+5.05),ellUV(x+hx,y+hy,r,r,10))), c.d);
    for (const [hy,hz,r] of [[-2,2,.8],[2.5,3,.6]]) s += fill(pd(on(PX(x+5.05),ellUV(y+hy,z+hz,r,r,10))), c.d);
    return s;
  },
  melon(x,y,z){
    let s = lathe(x,y,z,[[7,0],[8,.8,PLATE]],1);
    const prof = arcUV(y,z+.8,8,0,180,14), A = on(PX(x-2),prof), B = on(PX(x+2),prof), X = x+2.05;
    s += loft(A,B,nr=>toneI(nr,matOf('#3f8f45')));
    s += fill(pd(B),'#2f7a3b') + fill(pd(on(PX(X),arcUV(y,z+.8,7.2,0,180,14))),'#e8f3c4') + fill(pd(on(PX(X),arcUV(y,z+.8,6.4,0,180,14))),'#ef5257');
    for (const [a,r] of [[30,4],[60,4.4],[90,4],[120,4.4],[150,4],[45,2],[90,1.8],[135,2]]){
      const t=a*Math.PI/180; s += fill(pd(on(PX(X+.05),ellUV(y+r*Math.cos(t),z+.8+r*Math.sin(t),.45,.7,8))),'#2a1f1a');
    }
    return s + ink(pd(B),1) + hullInk([...A,...B],1.2);
  },
  cola(x,y,z){ return canX(x,y,z,'#d8322f'); },
  lemonade(x,y,z){ return canX(x,y,z,'#f2d12e'); },
  leftovers(x,y,z){
    let s = box(x-4.5,y-5,z,x+4.5,y+5,z+5,GLASS,toneI,1);
    s += fill(pd(on(PX(x+4.6),rectUV(y-4,z+.8,y+4,z+3.5))),'#e08a3c','opacity=".75"');
    s += box(x-4.9,y-5.4,z+5,x+4.9,y+5.4,z+6.6,matOf('#4c8ad8'),toneI,1);
    return s;
  },
};
function canX(x,y,z,col){
  let s = lathe(x,y,z,[[2.7,0],[3.2,.8,METAL],[3.2,10.4,matOf(col)],[2.7,11.4,METAL]],1.1);
  s += line([[x+.4,y+.6,z+11.45],[x+1.6,y+1.6,z+11.45]],.7) + fill(pd(on(PX(x+3.25),rectUV(y-1.3,z+3.5,y+1.3,z+7))),'#ffffff','opacity=".6"');
  return s;
}
// door goods (positions in the door's local frame)
const DOORFOOD = {
  water(fr,y,z){ const [x,yy] = fr.R(-5.2,y,z), b = matOf('#bfe3f2'), cap = matOf('#3f7fd6');
    return lathe(x,yy,z,[[2.8,0],[3.1,.6,b],[3.1,8,b],[3.1,12,matOf('#5aa0e8')],[3.1,16,b],[1.4,21,b],[1.5,21.1,cap],[1.5,23,cap]],1.1) + glint([x+GO(2.3)[0],yy+GO(2.3)[1],z+1.5],[x+GO(2.3)[0],yy+GO(2.3)[1],z+14],.6); },
  juice(fr,y,z){ const [x,yy] = fr.R(-5.2,y,z), o = matOf('#f39a2b'), cap = matOf('#3a9a4a');
    return lathe(x,yy,z,[[2.9,0],[3.2,.6,o],[3.2,6,o],[3.2,11,matOf('#fff3d9')],[3.2,14,o],[1.6,18,o],[1.7,18.1,cap],[1.7,20,cap]],1.1); },
  ketchup(fr,y,z){ const [x,yy] = fr.R(-5.2,y,z), r = matOf('#d8322f'), cap = MILK;
    return lathe(x,yy,z,[[2.6,0],[2.6,2.2,cap],[2.9,2.4,r],[3.2,9,r],[3.2,12,matOf('#fff3d9')],[2.6,14.5,r]],1.1); },
  wine(fr,y,z){ const [x,yy] = fr.R(-5.2,y,z), g = matOf('#2f5b3a'), foil = matOf('#9c2235');
    return lathe(x,yy,z,[[2.9,0],[3.2,.6,g],[3.2,9,g],[3.2,13,matOf('#efe6cf')],[3.2,15,g],[1.3,20,g],[1.3,22,g],[1.4,22.1,foil],[1.4,26,foil]],1.1) + glint([x+GO(2.4)[0],yy+GO(2.4)[1],z+1.5],[x+GO(2.4)[0],yy+GO(2.4)[1],z+12],.45); },
  oatmilk(fr,y,z){ return carton(fr,-5.2,y,z,'#f1eadb','#4c8ad8'); },
  oj(fr,y,z){ return carton(fr,-5.2,y,z,'#f6b13b','#3a9a4a'); },
};
const NAMES = { cake:'the cake', eggs:'the eggs', milk:'the milk', jam:'the jam', pickles:'the pickles', cheese:'the cheese',
  melon:'the watermelon slice', cola:'a can of cola', lemonade:'a can of lemonade', leftovers:'the leftovers',
  water:'the water', juice:'the orange juice', ketchup:'the ketchup', wine:'the wine', oatmilk:'the oat milk', oj:'the OJ carton' };
const ITEMS = [
  { k:'cake',      sh:0, x:38, y:19 },
  { k:'eggs',      sh:0, x:45, y:37 },
  { k:'pickles',   sh:1, x:37, y:30 },
  { k:'milk',      sh:1, x:46, y:12 },
  { k:'jam',       sh:1, x:45, y:24 },
  { k:'cheese',    sh:1, x:46, y:39 },
  { k:'lemonade',  sh:2, x:38, y:34 },
  { k:'melon',     sh:2, x:43, y:17 },
  { k:'cola',      sh:2, x:46, y:31 },
  { k:'leftovers', sh:2, x:46, y:41 },
];
const BINS = [   // fridge door bins (local y range 8..67)
  { z:17,  h:7, goods:[['water',15],['juice',28],['ketchup',41],['wine',55]] },
  { z:52,  h:6, goods:[['oatmilk',20],['oj',34]] },
  { z:84,  h:4, eggs:true },
];

/* ---------- interiors ---------- */
const take = (k, svg) => act('take', svg, `data-k="${k}"`);
function fridgeInside(st){
  const lit = lightLevel(st), ring0 = on(PX(T),F_OPEN), ring1 = on(PX(CW),F_OPEN);
  let s = fill(pd(ring0), LINER.m);
  s += loft(ring0, ring1, n => n[2]>.7 ? '#e3e7e3' : n[1]>.7 ? LINER.l : LINER.m, true);
  // shelf rails moulded into whichever side wall is seen (the y = T wall from the front, the y = D−T wall from the right)
  const wy = facing([0,1,0]) ? T+.1 : D-T-.1;
  for (const z of [...SHELVES, 72, 47]) s += line([[T+3,wy,z-1.5],[CW-6,wy,z-1.5]],.6);
  // lamp housing on the y = T wall, near the top (that wall is turned away in the right-side view)
  if (facing([0,1,0])) s += shape(on(PY(T+.15),rrUV(30,106,50,113,2)), lit>.5 ? '#fffbe2' : '#d3d6cf', 1);
  // crisper drawer: veggies behind a frosted front
  const lettuce = [30,20,15], veg = [{ at:lettuce, svg: lathe(...lettuce,[[0,0],[5,1.5,matOf('#7cc15a')],[6.5,4.5,matOf('#7cc15a')],[6,8,matOf('#8fd16a')],[3.5,10,matOf('#8fd16a')],[.5,10.6,matOf('#a6e07c')]],1.1) }];
  for (const [vx,vy,c] of [[38,34,'#e2483d'],[44,28,'#e2483d'],[42,40,'#f2d12e'],[47,35,'#e2483d']]) veg.push({ at:[vx,vy,15], svg: ball(vx,vy,18.2,3,matOf(c),.8) });
  s += VIEW ? byDepth(veg) : veg.map(v => v.svg).join('');
  s += fill(pd(on(PX(54),rrUV(6,15,69,33.5,2))),'#e8f4f5','opacity=".62"') + ink(pd(on(PX(54),rrUV(6,15,69,33.5,2))),1.1);
  s += shape(on(PX(54.1),rrUV(28,28.5,48,31,1.2)),'#b9c4c5',.8);
  // shelves bottom-up, each with its items back-to-front
  SHELVES.forEach((z,i) => {
    const top = [[T,T,z],[54,T,z],[54,D-T,z],[T,D-T,z]];
    s += fill(pd(top), GLASS.l, 'opacity=".5"') + ink(pd(top),.7);
    s += shape([[54,T,z-1.6],[54,D-T,z-1.6],[54,D-T,z],[54,T,z]], '#eef4f4', .9);
    const items = byDk(ITEMS.filter(o => o.sh===i && !st.taken.includes(o.k)), o => [o.x,o.y]);
    for (const o of items) s += take(o.k, FOOD[o.k](o.x,o.y,z+.6));
  });
  // light: glow when on, darkness when off
  if (lit > 0) s += `<g pointer-events="none"><ellipse cx="${f(P(40,T,110)[0])}" cy="${f(P(40,T,110)[1])}" rx="34" ry="26" fill="#fffbe0" opacity="${(.28*lit).toFixed(2)}"/>`
     + `<ellipse cx="${f(P(40,T,110)[0])}" cy="${f(P(40,T,110)[1])}" rx="14" ry="10" fill="#ffffff" opacity="${(.5*lit).toFixed(2)}"/></g>`;
  s += fill(pd(ring1), '#18222a', `opacity="${((1-lit)*.74).toFixed(2)}" pointer-events="none"`);
  return clipTo(ring1, s);
}
function freezerInside(){
  const ring0 = on(PX(T),Z_OPEN), ring1 = on(PX(CW),Z_OPEN);
  let s = fill(pd(ring0), FROST.m);
  s += loft(ring0, ring1, n => n[2]>.7 ? '#dcecf3' : n[1]>.7 ? FROST.l : FROST.m, true);
  // frost patches
  const fy = facing([0,1,0]) ? T+.1 : D-T-.1;
  for (const [x,z,rx,rz] of [[30,150,9,4],[48,138,6,3],[20,140,7,3]]) s += fill(pd(on(PY(fy),ellUV(x,z,rx,rz,16))),'#ffffff','opacity=".85"');
  s += fill(pd(on(PZ(128.1),ellUV(28,30,10,6,16))),'#ffffff','opacity=".7"');
  // ice-cream tub (back), ice tray (front)
  const tub = lathe(38,36,128,[[5,0],[5.6,7,matOf('#f6d9e2')],[5.9,7.1,matOf('#d8608a')],[5.9,9,matOf('#d8608a')]],1.1);
  let tray = fill(pd(on(PX(43.7),rectUV(33,130,39,134))),'#7a4a2f','opacity=".0"') + box(40,9,128,56,27,131.2,matOf('#cfe5f1'),toneI,1);
  const cubes = []; for (let i=0;i<2;i++) for (let j=0;j<4;j++) cubes.push([44+i*7, 12.2+j*4.2]);
  for (const [cx,cy] of VIEW ? byDk(cubes, p=>p) : cubes) tray += box(cx-2.4,cy-1.6,131.2,cx+1.4,cy+1.6,133.4,{l:'#ffffff',m:'#e3f1f7',d:'#b9d4e0'},toneI,.6);
  const peas = box(44,44,128,55,56,130.4,matOf('#5cae4f'),toneI,1) + tx(55.1,50,128.7,'PEAS',2.2,'#ffffff');   // bag of peas
  // ice-cream tub (back), ice tray (front), peas; in the right-side view the peas are furthest
  s += VIEW ? byDepth([{ at:[38,36,128], svg:tub }, { at:[48,18,128], svg:tray }, { at:[49.5,50,128], svg:peas }]) : tub + tray + peas;
  return clipTo(ring1, s);
}

/* ---------- doors ---------- */
function gasketAndLiner(fr, outerUV, innerUV, linerUV, lm=LINER){
  let s = `<path d="${pd(on(PD(fr,-.3),outerUV))}${pd(on(PD(fr,-.3),innerUV))}" fill="${GASKET}" fill-rule="evenodd"/>` + ink(pd(on(PD(fr,-.3),innerUV)),.7);
  const a = on(PD(fr,-.3),linerUV), b = on(PD(fr,-2),linerUV);
  s += loft(a,b,nr=>toneI(nr,lm)) + fill(pd(b), toneI(neg(fr.nT),lm)) + ink(pd(b),.9);
  return s;
}
function bin(fr,y0,y1,z0,h,contents){
  const R = fr.R, t0 = -9.5, t1 = -2; let s = '';
  s += shape([R(t0,y0,z0),R(t1,y0,z0),R(t1,y1,z0),R(t0,y1,z0)], '#e4ecec', .8);                   // floor
  // the two end walls: which one is far depends on the door angle and the view
  const yf = vis(fr.nY) ? y0 : y1, yn = yf===y0 ? y1 : y0;
  s += shape([R(t0,yf,z0),R(t1,yf,z0),R(t1,yf,z0+h+3),R(t0,yf,z0+h)], '#d9e3e4', .8);             // far end (inside)
  s += contents;
  const lip = [R(t0,y0,z0),R(t0,y1,z0),R(t0,y1,z0+h),R(t0,y0,z0+h)];
  if (vis(neg(fr.nT))) s += fill(pd(lip), '#cfe9f0', 'opacity=".72"') + ink(pd(lip),1)
      + fill(pd([R(t0-.05,y0+3,z0+1.5),R(t0-.05,y0+7,z0+1.5),R(t0-.05,y0+12,z0+h-1),R(t0-.05,y0+8,z0+h-1)]),'#ffffff','opacity=".45"');
  s += shape([R(t0,yn,z0),R(t1,yn,z0),R(t1,yn,z0+h+3),R(t0,yn,z0+h)], '#e9f3f4', .9);            // near end
  s += line([R(t0,y0,z0+h),R(t0,y1,z0+h)],1.3);
  return s;
}
function fridgeDoorInner(fr, st){
  let s = gasketAndLiner(fr, rrUV(1.4,8.4,D-1.4,121.6,2), rrUV(3.6,10.6,D-3.6,119.4,2), rrUV(4.4,11.4,D-4.4,118.6,2));
  for (const b of BINS){
    let c = '';
    if (b.goods){
      const g = b.goods.filter(([k])=>!st.taken.includes(k)).map(([k,y])=>({k,y,d:(([x,yy])=>dk(x,yy))(fr.R(-5.2,y,b.z))})).sort((p,q)=>p.d-q.d);
      for (const o of g) c += take(o.k, DOORFOOD[o.k](fr,o.y,b.z+.2));
    }
    if (b.eggs){
      const e = byDk([14,22,30,38,46,54,62].map(y=>fr.R(-5.6,y,b.z+2.4)), p=>[p[0],p[1]]);
      for (const p of e) c += ball(p[0],p[1],p[2],2.2,EGG,.75,1.22);
    }
    s += bin(fr,8,67,b.z,b.h,c);
  }
  // dairy compartment with a flip lid
  s += rbox(fr,-8.5,-2,10,46,103,111,LINER,1);
  s += rbox(fr,-8.9,-2,9.6,46.4,111,112.4,matOf('#dfe9ea'),1);
  if (vis(neg(fr.nT))) s += txF(fr,-8.6,28,106,'DAIRY',3,'#7d8b8c',800,true);
  return s;
}
function freezerDoorInner(fr){
  let s = gasketAndLiner(fr, rrT(1.4,126,D-1.4,H-1.4,18.6,2), rrT(3.6,128.2,D-3.6,H-3.6,16.4,2), rrT(4.4,129,D-4.4,H-4.4,15.6,2), FROST);
  const R = fr.R, z0 = 131;
  let c = '';
  for (const [y,col] of byDk([[20,'#e2483d'],[30,'#f2d12e'],[40,'#4c8ad8']], ([y]) => { const p = fr.R(-5.75,y,z0); return VIEW ? [p[0],p[1]] : [0,y]; })) c += rbox(fr,-8,-3.5,y-3.5,y+3.5,z0,z0+9,matOf(col),.9);
  s += bin(fr,10,62,z0,4,c);
  return s;
}
function handleBar(fr, y, za, zb){
  let s = '', posts = [tube(fr.R(DT,y,za+1.5),fr.R(DT+3.2,y,za+1.5),.9,METAL,.9), tube(fr.R(DT,y,zb-1.5),fr.R(DT+3.2,y,zb-1.5),.9,METAL,.9)];
  const bar = tube(fr.R(DT+3.3,y,za),fr.R(DT+3.3,y,zb),1.35,METAL,1.1) + glint(fr.R(DT+4.3,y-.8,za+1.5),fr.R(DT+4.3,y-.8,zb-1.5),.85,.9);
  return vis(fr.nT) ? posts.join('') + bar : bar + posts.join('');
}
function drawDoor(kind, deg, m, st){
  const fr = doorFrame(deg), prof = kind==='door' ? FDOOR : ZDOOR;
  const A = on(PD(fr,0),prof), B = on(PD(fr,DT),prof), nF = fr.nT, nB = neg(fr.nT);
  const slab = loft(A,B,n=>tone(n,m));
  const inner = kind==='door' ? fridgeDoorInner(fr,st) : freezerDoorInner(fr);
  const handle = kind==='door' ? handleBar(fr, D-6, 98, 117) : handleBar(fr, D-6, 128, 143);
  let s = '';
  if (vis(nB)){
    s += handle + slab + fill(pd(A), tone(nB,m)) + hullInk([...A,...B],2.2) + inner;
  } else {
    s += inner + slab + fill(pd(B), tone(nF,m));
    const Q = PD(fr,DT+.05);
    // glossy streaks
    const zz = kind==='door' ? [12,118] : [128,160];
    s += fill(pd(on(Q,[[D-16,zz[0]],[D-11,zz[0]],[D-26,zz[1]],[D-31,zz[1]]])),'#ffffff','opacity=".2" pointer-events="none"');
    s += fill(pd(on(Q,[[D-34,zz[0]],[D-32,zz[0]],[D-47,zz[1]],[D-49,zz[1]]])),'#ffffff','opacity=".16" pointer-events="none"');
    s += hullInk([...A,...B],2.2) + ink(pd(B),1.6);
    if (kind==='door'){   // badge
      s += shape(on(Q,rrUV(25,110.5,50,116.5,3)), METAL.l, 1.1);
      s += txF(fr,DT+.15,37.5,112.3,'FRIGO',3.6,INK);
    }
    s += handle;
  }
  return act(kind==='door' ? 'door' : 'fz', s);
}

/* ---------- light, puff, beep ---------- */
function lightLevel(st){
  if (st.door <= .002) return 0;
  if (!st.beep) return 1;
  const t = st.flick, v = Math.sin(t*31) + Math.sin(t*13.7) + Math.sin(t*5.3);
  return v > .9 ? .12 : v > -.2 ? .5 : 1;
}
function puff(p){
  // cold air spills over the freezer's bottom lip and sinks, spreading and fading
  let s = '';
  const BL = [[12,0,0,5],[24,2,.04,5.5],[36,-1,.02,6],[48,1,.08,5.5],[60,0,.12,5],[18,-3,.16,4.5],[42,-4,.2,5],[54,-2,.26,4.5],[30,-6,.3,4]];
  for (const [y,dz,ph,r0] of BL){
    const q = Math.max(0, Math.min(1,(p-ph)/(1-ph))); if (q<=0 || q>=1) continue;
    const e = 1-Math.pow(1-q,2), [cx,cy] = P(CW-1+e*22, y+e*5, 131+dz-e*e*24), r = (r0+e*8)*R3, o = .92*Math.pow(1-q,.8);
    s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="#ffffff" opacity="${o.toFixed(2)}"/>`;
    s += `<circle cx="${f(cx-r*.25)}" cy="${f(cy-r*.3)}" r="${f(r*.55)}" fill="#f4fbfe" opacity="${o.toFixed(2)}"/>`;
  }
  return `<filter id="mist" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.3"/></filter><g pointer-events="none" filter="url(#mist)">${s}</g>`;
}

/* ---------- the two faces never seen from the front ---------- */
const COIL = '#2b2825';
function backPanel(m){
  // back cap of the cabinet (x = 0)
  const B = on(PX(0),OUT), nb = [-1,0,0];
  let s = fill(pd(B), tone(nb,m)) + ink(pd(B),2.2);
  // spacer bumpers at the top corners keep the coil off the wall
  for (const y of [12,63]) s += tube([0,y,157],[-3.2,y,157],1.7,matOf('#7d817c'),.9);
  // rating label + a little warning triangle
  s += shape(on(PX(-.1),rectUV(25,144,51,157.5)), '#f6f4ec', .9);
  s += txB(-.15,38,153.4,'FRIGO · MOD F-170',1.75,INK,800);
  s += txB(-.15,38,150.6,'220-240V~ 50Hz 1.1A',1.35,'#4a453c',600);
  s += txB(-.15,38,148.2,'R600a 38g · CLASS N-ST',1.35,'#4a453c',600);
  for (let i=0;i<14;i++){ const y = 27.5+i*.9+(i%3)*.15; s += line([[-.15,y,145],[-.15,y,146.8]], i%4 ? .35 : .6); }
  s += shape(on(PX(-.1),[[54,145],[60,145],[57,150.5]]), '#f2c230', .8) + txB(-.15,57,145.7,'!',2.6,INK,900);
  // soft shadow of the condenser on the back panel, then the grid itself (standing off ~2.5)
  const cx = -2.6, y0 = 12, y1 = 63, zb = 32, zt = 140;
  s += fill(pd(on(PX(-.05),rectUV(y0+1.5,zb-2,y1+1.5,zt-2))), mix(tone(nb,m),'#000000',.18), 'opacity=".55"');
  // mounting straps with screws
  for (const z of [zb, zt]) s += shape(on(PX(cx+.3),rrUV(y0-3,z-1.4,y1+3,z+1.4,.6)), DARK.l, .8)
    + [y0-1.5, y1+1.5].map(y => fill(pd(on(PX(cx-.1),ellUV(y,z,.7,.7,10))), METAL.m) + ink(pd(on(PX(cx-.1),ellUV(y,z,.7,.7,10))),.5)).join('');
  // serpentine tube: straight runs joined by U-bends at alternating ends
  const runs = []; for (let z = zb+4; z <= zt-4; z += 6) runs.push(z);
  let path = [];
  runs.forEach((z,i) => {
    const l2r = i%2===0, ya = l2r ? y0+2 : y1-2, yb = l2r ? y1-2 : y0+2;
    path.push([cx,ya,z],[cx,yb,z]);
    if (i < runs.length-1) arcUV(yb, z+3, 3, l2r ? -90 : 270, l2r ? 90 : 90, 8).forEach(([u,v]) => path.push([cx,u,v]));
  });
  s += `<path d="${pd(path,false)}" fill="none" stroke="${COIL}" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/>`;
  // thin vertical wires welded across the outside of the tube
  for (let y = y0+3.5; y <= y1-3; y += 3.6) s += `<path d="${pd([[cx-.6,y,zb+1.5],[cx-.6,y,zt-1.5]],false)}" fill="none" stroke="${COIL}" stroke-width=".6"/>`;
  // compressor bump at the bottom: a black dome on a bracket, copper pipes up into the coil, a relay box
  s += box(-12,14,4,0,36,5.4,DARK,toneI,.9);
  const comp = [-6.2,24,5.4];
  const relay = box(-4.5,38,5,-.2,45,12,DARK,toneI,.9) + shape(on(PX(-4.6),rectUV(39.5,8,43.5,10.5)), '#e2483d', .5);
  const pipes = tube([-6.2,22,14],[cx,y0+2,zb+4],.55,matOf('#c97c48'),.7) + tube([-5,27,13.5],[cx,26,zb-1],.55,matOf('#c97c48'),.7);
  const dome = lathe(...comp,[[5.6,0],[6,.6,DARK],[6,6,DARK],[5,8.6,DARK],[3,10,DARK],[.4,10.4,DARK]],1.1)
    + `<ellipse cx="${f(P(-6.2+GO(2.2)[0],24+GO(2.2)[1],11)[0])}" cy="${f(P(-6.2,24,11)[1])}" rx="1.1" ry="2.4" fill="#ffffff" opacity=".22"/>`;
  s += byDepth([{ at:comp, svg:dome }, { at:[-2.4,41.5,5], svg:relay }]) + pipes;
  // power cord: out of a grommet low on the back, down to the floor, ending in a plug
  s += fill(pd(on(PX(-.1),ellUV(58,24,1.5,1.5,12))), DARK.d) + ink(pd(on(PX(-.1),ellUV(58,24,1.5,1.5,12))),.6);
  const cord = [[-.2,58,24],[-1.8,58.2,22.6],[-3,58.6,19],[-3.8,59.2,12],[-4.6,60,5],[-5.6,60.6,1.4],[-7.4,61,.7],[-10,60,.7],[-12.2,57,.7],[-13.4,53.4,.7]];
  const cordSvg = `<path d="${pd(cord,false)}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>`
    + `<path d="${pd(cord,false)}" fill="none" stroke="#4a4540" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"/>`;
  const plug = box(-15.6,47.6,0,-11.4,53.4,3.4,DARK,toneI,.9);
  const prongs = [-14.3,-12.7].map(x => tube([x,47.6,1.7],[x,45,1.7],.35,METAL,.6)).join('');
  s += byDepth([{ at:[-6,59,6], svg:cordSvg }, { at:[-13.5,50.5,1.7], svg:plug }, { at:[-13.5,45.2,1.7], svg:prongs }]);
  // screws holding the back panel
  for (const [y,z] of [[6,10],[69,10],[6,140],[69,140],[37.5,162]]) s += fill(pd(on(PX(-.1),ellUV(y,z,.75,.75,10))), METAL.m) + ink(pd(on(PX(-.1),ellUV(y,z,.75,.75,10))),.5);
  return s;
}
// the right-hand side (−y): matching gloss stripes, a chrome trim at the door split and a chrome badge
function rightSide(m, lm){
  const n = [0,-1,0], Q = PY(-.15);
  let s = fill(pd(on(Q,[[CW-15,10],[CW-10,10],[CW-10,150],[CW-15,150]])), tone(n,lm), 'opacity=".55"');
  s += fill(pd(on(Q,[[CW-22,10],[CW-20,10],[CW-20,150],[CW-22,150]])), tone(n,lm), 'opacity=".45"');
  const R2 = PY(-.3);
  s += shape(on(R2,rrUV(6,123.1,CW-3,124.9,.9)), METAL.l, .8) + glint([CW-8,-.45,124.3],[12,-.45,124.3],.8,.6);
  s += shape(on(R2,rrUV(19,129,43,137,4)), METAL.l, 1.1) + ink(pd(on(PY(-.35),rrUV(20.2,130.2,41.8,135.8,2.8))),.5);
  s += txR(31,-.4,131.9,'FRIGO',3.6,INK,800,'.12em');
  return s;
}

/* ---------- scene ---------- */
function scene(st, m){
  const dDeg = st.door*DOOR_MAX, zDeg = st.fz*FZ_MAX;
  const fD = doorFrame(dDeg), fZ = doorFrame(zDeg);
  const front = facing([1,0,0]), back = facing([-1,0,0]);
  let s = '';
  // 1. shadows: cabinet + each door slab
  s += castShadow([...on(PX(0),OUT), ...on(PX(CW),OUT)]);
  s += castShadow([...on(PD(fD,0),FDOOR), ...on(PD(fD,DT),FDOOR)]);
  s += castShadow([...on(PD(fZ,0),ZDOOR), ...on(PD(fZ,DT),ZDOOR)]);
  // 2. the cabinet: chrome feet, shell, side / back details, and (from the front) the openings
  let cab = '';
  const feet = [[6,6],[6,D-6],[CW-5,6],[CW-5,D-6]];
  for (const [x,y] of VIEW ? byDk(feet, p=>p) : feet) cab += cyl(x,y,0,4.2,2.2,METAL,toneI,1);
  cab += extrude(OUT, 0, CW, m);
  const lm = { l:mix(m.l,'#ffffff',.18), m:mix(m.m,'#ffffff',.14), d:mix(m.d,'#ffffff',.08) };
  if (facing([0,1,0])){
    cab += fill(pd(on(PY(D+.15),[[CW-15,10],[CW-10,10],[CW-10,150],[CW-15,150]])), tone([0,1,0],lm), 'opacity=".55"');
    cab += fill(pd(on(PY(D+.15),[[CW-22,10],[CW-20,10],[CW-20,150],[CW-22,150]])), tone([0,1,0],lm), 'opacity=".45"');
  }
  if (facing([0,-1,0])) cab += rightSide(m, lm);
  if (back) cab += backPanel(m);
  if (front){
    // 3. what is seen through the openings
    if (st.door > 0) cab += fridgeInside(st);
    if (st.fz > 0) cab += freezerInside();
    // 4. cabinet front face with the two openings
    const X = PX(CW);
    cab += `<path d="${pd(on(X,OUT))}${pd(on(X,F_OPEN))}${pd(on(X,Z_OPEN))}" fill="${tone([1,0,0],m)}" fill-rule="evenodd"/>`;
    cab += ink(pd(on(X,F_OPEN)),1.7) + ink(pd(on(X,Z_OPEN)),1.7) + ink(pd(on(X,OUT)),2.2);
    // kick grille in the recess under the door
    cab += shape(on(PX(CW+.1),rrUV(8,5,D-8,6.8,.8)), DARK.m, .8);
  }
  // 5. silhouette of the shell (doors draw their own outline)
  cab += hullInk([...on(PX(0),OUT), ...on(PX(CW),OUT)], 2.8);
  // 6. doors: fridge, then the middle hinge, then freezer (higher things can cover lower ones, never the reverse).
  // A door up to 90° lies in front of the plane x = CW, past 90° beside the plane y = 0: it draws after the
  // cabinet when that side of the plane faces the viewer, otherwise before it (the cabinet then hides it).
  const ahead = deg => front || (deg > 90 && facing([0,-1,0]));
  const parts = [
    { ahead: ahead(dDeg), svg: drawDoor('door', dDeg, m, st) },
    { ahead: front,       svg: box(CW,-1.6,122.6,CW+DT,2.5,124.9,METAL,toneI,.9) },
    { ahead: ahead(zDeg), svg: drawDoor('fz', zDeg, m, st) } ];
  const mist = st.puff != null ? puff(st.puff) : '';
  s += parts.filter(p => !p.ahead).map(p => p.svg).join('') + (front ? '' : mist) + cab + parts.filter(p => p.ahead).map(p => p.svg).join('');
  if (st.door===0 && st.fz===0) s += hullInk([...on(PX(0),OUT), ...on(PX(W),OUT)], 2.8);
  // 7. cold air + beeping (the BEEP floats beside whichever long side faces the viewer)
  if (front) s += mist;
  if (st.beep){
    const on1 = Math.sin(st.flick*9) > -.3;
    if (on1){
      if (VIEW === 0){
        s += txY(14, D+30, 146, 'BEEP!', 8, '#e2483d', 800);
        for (const r of [4,8]) s += ink(pd(arcUV(30,152,r,-50,50,6).map(([u,v])=>[u,D+30,v]),false),1.4);
      } else {
        // turned: float it in screen space just beside the cabinet's top corner (left when the doors are on the right)
        const pts = [...on(PX(0),OUT), ...on(PX(CW),OUT)].map(p => P(...p)), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        const left = VIEW === 1, y = Math.min(...ys) + 14, x = left ? Math.min(...xs) - 30 : Math.max(...xs) + 6;
        s += `<text transform="matrix(${C.toFixed(4)} ${(-S).toFixed(4)} 0 1 ${f(x)} ${f(y)})" font-size="8" fill="#e2483d" font-family="ui-monospace,Menlo,monospace" font-weight="800" letter-spacing=".04em">BEEP!</text>`;
        const ax = x + 27*C + 2, ay = y - 27*S - 2;
        for (const r of [4,8]) s += ink(`M${f(ax+r*.64)} ${f(ay-r*.77)}Q${f(ax+r*1.25)} ${f(ay)} ${f(ax+r*.64)} ${f(ay+r*.77)}`,1.4);
      }
    }
  }
  return s;
}

/* ---------- behaviour ---------- */
let UI = null, beepTimer = 0;
function loop(st){
  if (st._run) return; st._run = true;
  UI.animate(dt => {
    let more = false;
    for (const k of ['door','fz']){
      const a = st.anim[k]; if (!a) continue;
      a.t = Math.min(1, a.t + dt/a.dur); st[k] = a.from + (a.to-a.from)*ease(a.t);
      if (a.t >= 1){ st[k] = a.to; st.anim[k] = null; } else more = true;
    }
    if (st.puff != null){ st.puff += dt/1.7; if (st.puff >= 1) st.puff = null; else more = true; }
    if (st.beep){ st.flick += dt; st.openFor += dt; more = true; }
    if (!more) st._run = false;
    return more;
  });
}
function armBeep(st){
  clearTimeout(beepTimer);
  beepTimer = setTimeout(() => { if (st.doorTo > 0){ st.beep = true; st.openFor = 6; loop(st); } }, 6000);
}
function swing(st, k, to){
  if (k==='door'){ st.doorTo = to; if (to > 0) armBeep(st); else { clearTimeout(beepTimer); st.beep = false; } }
  else { st.fzTo = to; if (to > 0 && st.fz < .2) st.puff = 0; }
  const from = st[k], dist = Math.abs(to-from); if (!dist) return;
  st.anim[k] = { from, to, t:0, dur: (k==='door' ? 1.0 : .75) * Math.max(.35, dist) };
  loop(st);
}
const toggle = (st,k) => swing(st, k, (k==='door' ? st.doorTo : st.fzTo) > 0 ? 0 : 1);

UI = mountFigure({
  fig:'10', title:'Fridge', hint:'open the doors · take a snack · don’t leave it open',
  idea:"A fridge doesn't make cold \u2014 it carries heat out of the box and lets it go from the coil on the back. Turn it around to see.",
  size:[W,D,H], palette:'mustard', views:true,
  state:{ door:0, fz:0, doorTo:0, fzTo:0, anim:{}, taken:[], beep:false, flick:0, openFor:0, puff:null },
  scene,
  readout: st => {
    const left = ITEMS.filter(o=>!st.taken.includes(o.k)).length;
    if (st.beep) return 'BEEP BEEP — close the door! The light is flickering';
    if (st.anim.door) return st.doorTo > 0 ? 'Opening the fridge… click lights on' : 'Closing the fridge…';
    if (st.door > 0 && st.fz > 0) return `Both doors open · ${left} things on the shelves — click one to take it`;
    if (st.door > 0) return (st.door < 1 ? 'Door ajar · ' : 'Light on · ') + (left ? `${left} things on the shelves — click one to take it out` : 'shelves are empty — hit Restock');
    if (st.fz > 0) return 'Freezer open — brrr. Ice tray, peas, a tub of ice cream';
    return 'Click the big door to open the fridge — or the top door for the freezer';
  },
  buttonsLabel:'Fridge',
  buttons:[
    { label:'Open the fridge', onClick: (st,ui) => st.doorTo ? ui.flash('The fridge is open') : toggle(st,'door') },
    { label:'Take a snack', choices: st => [...ITEMS.map(i => i.k), ...BINS.flatMap(b => (b.goods || []).map(g => g[0]))].map(k => ({
        label: NAMES[k].replace(/^the /,''), disabled: !st.doorTo || st.taken.includes(k),
        onClick: (st,ui) => { st.taken.push(k); st.snacked = true; ui.flash('Took ' + NAMES[k]); } })) },
    { label:'Close the fridge', onClick: (st,ui) => st.doorTo ? toggle(st,'door') : ui.flash('Already closed') },
    { label:'Open the freezer', onClick: (st,ui) => { if (st.fzTo) return ui.flash('The freezer is open'); st.froze = true; toggle(st,'fz'); } },
    { label:'Close the freezer', onClick: (st,ui) => st.fzTo ? toggle(st,'fz') : ui.flash('Already closed') },
    { label:'Restock', onClick: (st,ui) => { const n = st.taken.length; st.taken = []; st.snacked = st.froze = false; ui.flash(n ? `Restocked ${n} item${n>1?'s':''}` : 'Already full'); } },
  ],
  next: st => st.fzTo ? 4 : st.doorTo ? (st.snacked ? 2 : 1) : !st.snacked ? 0 : !st.froze ? 3 : st.taken.length ? 5 : 0,
  acts:{
    door: st => toggle(st,'door'),
    fz:   st => { st.froze = true; toggle(st,'fz'); },
    take: (st, el, ui) => { const k = el.dataset.k; if (st.taken.includes(k)) return; st.taken.push(k); st.snacked = true; ui.flash('Took ' + NAMES[k]); },
  },
  params(st, q){
    const amt = v => v==null ? null : v==='open' ? 1 : v==='closed' ? 0 : Math.max(0, Math.min(1, +v || 0));
    const d = amt(q.get('door')), z = amt(q.get('freezer'));
    if (d != null) st.door = st.doorTo = d;
    if (z != null) st.fz = st.fzTo = z;
    if (q.get('taken')) st.taken = q.get('taken').split(',').filter(k => NAMES[k]);
    if (q.get('beep') === '1' && st.door > 0){ st.beep = true; st.openFor = 6; }
    if (q.has('puff')) st.puff = Math.max(0, Math.min(.99, +q.get('puff')));
  },
});
if (UI.st.doorTo > 0) armBeep(UI.st);
if (UI.st.beep) loop(UI.st);
