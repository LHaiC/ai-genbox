const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const api=require('../assets/formula-models-foundations.js');
const course=JSON.parse(fs.readFileSync(path.join(__dirname,'../content/part1.json'),'utf8'));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('all 14 foundation lessons match actual proof counts and all stages emit finite geometry',()=>{
 assert.equal(Object.keys(api.catalog).length,14);
 for(const module of course)for(const lesson of module.lessons){
  const spec=api.catalog[lesson.id];assert.equal(spec.proofCount,lesson.proof.length);assert.equal(spec.stages.length,lesson.proof.length);
  for(let i=0;i<spec.proofCount;i++)for(const t of [0,.25,.5,1]){
   const m=api.get(lesson.id,i,t);assert.equal(m.proofIndex,i);assert.ok(m.objective&&m.note);assert.equal(m.axisLabels.length,3);
   const positions=[...m.points.map(p=>p.position),...m.paths.flatMap(p=>p.points),...m.solids.flatMap(p=>p.vertices),...m.arrows.flatMap(p=>[p.from,p.to])];
   positions.forEach(p=>{assert.equal(p.length,3);assert.ok(p.every(Number.isFinite),lesson.id);});
   m.metrics.forEach(p=>assert.ok(Number.isFinite(p.value),lesson.id));
   m.surfaces.forEach(s=>{for(const a of [0,.25,.5,1])for(const b of [0,.5,1]){const x=m.domain[0][0]+a*(m.domain[0][1]-m.domain[0][0]),y=m.domain[1][0]+b*(m.domain[1][1]-m.domain[1][0]);assert.ok(Number.isFinite(s.f(x,y)),lesson.id);}});
  }
 }
});
test('exact Taylor example retains linear and quadratic changes',()=>{
 const a=api.get('m1-l3',3,.1);near(a.data.change,-1.64);near(a.data.remainder,.36);near(api.get('m1-l3',5,1).data.change,16);
});
test('squared chord, strong convexity and least-squares examples retain their constants',()=>{
 near(api.get('m2-l2',3,.25).data.gap,.75);
 near(api.get('m2-l4',1,0).data.curvature,1);near(api.get('m2-l4',1,.25).data.curvature,4);
 assert.equal(api.get('m1-l4',6,.25).data.rankDeficient,true);
 near(api.get('m1-l4',7,.25).data.curvature,4);
});
test('partial minimization retains y=x/2 and the exact residual square',()=>{
 for(const t of [0,.25,.75,1]){const m=api.get('m2-l5',4,t),{x,y,epsilon}=m.data;near(m.surfaces[0].f(x,y)-x*x/2,epsilon);const exact=api.get('m2-l5',6,t);near(exact.data.y,exact.data.x/2);}
});
test('threshold examples and projected-gradient mapping reproduce nearby answers',()=>{
 assert.equal(api.get('m3-l3',6,.25).data.star,0);assert.equal(api.get('m3-l3',6,.75).data.star,1);
 const m=api.get('m3-l4',6,.25);assert.deepEqual(m.data.p,[1,0]);near(m.metrics.at(-1).value,Math.sqrt(8));
 assert.deepEqual(api.get('m3-l4',7,1).data.p,[-1,-2]);
 near(api.get('m3-l5',7,0).data.mapping,0);assert.ok(api.get('m3-l5',7,.5).data.mapping>0);
});
test('effective domains never encode infinity as a finite surface and unknown lesson is unsupported',()=>{
 assert.deepEqual(api.get('m2-l2',5,.25).domain[0],[0,1]);assert.equal(api.get('unknown',0),null);
});

test('all annotated geometry stays inside declared variable-axis framing',()=>{
 for(const [id,c] of Object.entries(api.catalog))for(let i=0;i<c.proofCount;i++)for(const t of [0,.25,.5,.75,1]){
  const m=api.get(id,i,t),positions=[...m.points.map(p=>p.position),...m.paths.flatMap(p=>p.points),...m.solids.flatMap(p=>p.vertices),...m.arrows.flatMap(p=>[p.from,p.to])];
  for(const p of positions)for(let j=0;j<2;j++)assert.ok(p[j]>=m.domain[j][0]-1e-9&&p[j]<=m.domain[j][1]+1e-9,`${id} stage ${i} parameter ${t}: coordinate ${p[j]} outside axis ${j}`);
 }
});
