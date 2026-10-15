const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('../assets/formula-models-algorithms.js');
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`);
test('all 98 proof scenes have finite render geometry across parameter interval',()=>{
 let count=0;for(const [id,c] of Object.entries(M.catalog)){
 assert.equal(c.stages.length,c.proofCount);
 for(let i=0;i<c.proofCount;i++){count++;for(const p of [0,c.parameter.value,.5,1]){
 const m=M.get(id,i,p);assert.equal(m.proofIndex,i);assert.equal(m.axisLabels.length,3);assert.ok(m.note.length>15);
 for(const s of m.surfaces)for(const x of m.domain[0])for(const y of m.domain[1])assert.ok(Number.isFinite(s.f(x,y)),id);
 const ps=[...m.points.map(x=>x.position),...m.paths.flatMap(x=>x.points),...m.solids.flatMap(x=>x.vertices)];for(const q of ps)assert.ok(q.length===3&&q.every(Number.isFinite),id);
 }} }assert.equal(count,98);assert.equal(M.get('missing'),null);
});
test('Fenchel supports and weak-duality bounds are analytic certificates',()=>{
 for(const p of [0,.25,.5,1]){const a=M.get('m4-l1',1,p).data;near(a.fenchelGap,(a.x-a.y)**2/2);const d=M.get('m4-l2',5,p).data;assert.ok(d.dual<=d.lagrangian+1e-10);assert.ok(d.lagrangian<=d.primal+1e-10);assert.ok(d.actualError<=d.gap+1e-10);}
 near(M.get('m4-l2',5,.25).data.gap,.46);near(M.get('m4-l2',7,.5).data.gap,0);
});
test('Slater scenes explicitly distinguish nonattainment and finite boundaries',()=>{
 const a=M.get('m4-l3',5,1);assert.equal(a.data.dualAttained,false);assert.ok(a.data.dual<0);assert.equal(M.get('m4-l3',8,1).data.attained,false);for(const p of [0,.5,1])assert.ok(M.get('m4-l3',3,p).data.separationSlack>=0);
});
test('KKT uses original simplex objective and valid active-set transitions',()=>{
 const d=M.get('m4-l4').data;assert.deepEqual(d.x,[2,0]);near(d.lambda,1);near(d.eta[1],0);near(d.value,1);
 for(const p of [0,.1,1/3,.4,.8,1]){const q=M.get('m4-l4',0,p).data;assert.ok(q.x.every(x=>x>=0));assert.ok(q.x[0]+q.x[1]<=q.B+1e-9);q.stationarity.forEach(x=>near(x,0));q.complementarity.forEach(x=>near(x,0));}
 near(M.get('m4-l4',6,.4).data.value,.81);
});
test('descent uses L=9 and reports both safe and unstable steps',()=>{
 const d=M.get('m5-l1').data;near(d.L,9);near(d.after,32/9);near(d.upper,4);assert.ok(d.after<=d.upper);const unstable=M.get('m5-l1',4,1).data;near(unstable.after,20);assert.equal(unstable.stable,false);
});
test('rate certificates remain conservative; preconditioning preserves physical point',()=>{
 const d=M.get('m5-l2').data;assert.equal(d.k,5);near(d.delta,18/1024);near(d.bound,7.2);assert.ok(d.delta<=d.oneStepBudget);assert.ok(d.sum<=d.telescopingBudget);
 const s=M.get('m5-l3').data;near(s.delta,11.52);near(s.bound,24);
 for(const p of [0,.3,.8,1]){const a=M.get('m5-l3',4,p).data;assert.ok(a.delta<=a.bound);}
 const raw=M.get('m5-l4',0).data,scaled=M.get('m5-l4',6).data;near(raw.t,.01);near(scaled.t,1);assert.deepEqual(scaled.xs[0],[1,10]);scaled.physical.forEach(x=>near(x,0));
});
test('prox examples and optimality conditions exactly match course',()=>{
 const d=M.get('m6-l1').data;near(d.t,2);near(d.u,2);near(d.value,6);near(d.optimality,0);
 const a=M.get('m6-l2').data;near(a.total,5.41);[2.5,0,.5,-1.5].forEach((x,j)=>near(x,a.outputs[j]));
 for(const p of [0,.5,1]){const b=M.get('m6-l2',4,p).data;near(b.optimality,0);assert.ok(Math.abs(b.subgradient)<=1+1e-10);const q=M.get('m6-l3',6,p).data;assert.ok(q.gap<=q.budget+1e-10);near(q.s,1);}
});
test('Lasso first-step primal dual certificate and zero threshold are exact',()=>{
 const d=M.get('m6-l4').data;assert.deepEqual(d.x,[.5,0]);near(d.primal,3.705);near(d.dual,2.5512);near(d.gap,1.1538);near(d.optimal,2.58);
 for(const p of [0,.5,1]){const q=M.get('m6-l4',8,p).data;assert.ok(q.dualNorm<=q.lambda+1e-10);assert.ok(q.primal-q.optimal<=q.gap+1e-10);}
 const z=M.get('m6-l4',9,1).data;assert.deepEqual(z.exact,[0,0]);
});
