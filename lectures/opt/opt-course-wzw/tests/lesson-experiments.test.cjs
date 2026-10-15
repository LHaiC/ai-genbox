const assert=require('node:assert/strict');
const m=require('../assets/lesson-experiments.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
assert.deepEqual(m.preStep([1,1]),[.99,0]);
assert.deepEqual(m.preStep([1,10],1,true),[0,0]);
let x=0;[1,1.5,1.75].forEach(e=>{x=m.scalarStep(x);near(x,e)});
near(m.scalarF(x),2.53125);near(m.scalarStep(2),2);
assert.deepEqual(m.lassoStep([0,0]),[.5,0]);
let c=m.certificate([.5,0]);near(c.primal,3.705);near(c.dual,2.5512);near(c.gap,1.1538);near(c.feasibility,1);
c=m.certificate([2,0]);near(c.primal,2.58);near(c.dual,2.58);near(c.gap,0);
for(let i=0;i<200;i++){let x=[Math.sin(i)*5,Math.cos(i)*5],c=m.certificate(x);assert.ok(c.feasibility<=1+1e-12);assert.ok(c.dual<=2.58+1e-12);assert.ok(c.gap>=c.primal-2.58-1e-12);}
for(const t of [.125,.25]){let x=[0,0];for(let i=0;i<30;i++){let n=m.lassoStep(x,t);assert.ok(m.certificate(n).primal<=m.certificate(x).primal+1e-12);x=n;}}
console.log('Lesson-specific experiment numerical checks passed.');
