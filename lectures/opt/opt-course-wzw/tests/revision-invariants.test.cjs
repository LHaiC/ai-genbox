'use strict';
// Independent algebraic invariants; no copied implementation or visual claims.
const test = require('node:test');
const assert = require('node:assert/strict');
const {compute:c} = require('../assets/animations.js');
const dot=(x,y)=>x.reduce((s,v,i)=>s+v*y[i],0), sub=(x,y)=>x.map((v,i)=>v-y[i]);
const close=(x,y,t=1e-9)=>assert.ok(Math.abs(x-y)<=t*Math.max(1,Math.abs(x),Math.abs(y)),`${x} != ${y}`);
let seed=20261015; const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const vector=()=>[20*random()-10,20*random()-10];

test('Projection is firmly nonexpansive, idempotent and invariant under positive scaling',()=>{
 for(let i=0;i<300;i++){
  const v=vector(),w=vector(),r=5*random(),p=c.projection(v,r,[0,0]).p,q=c.projection(w,r,[0,0]).p;
  const dp=sub(p,q),dv=sub(v,w);
  assert.ok(dot(dp,dp)<=dot(dp,dv)+1e-9);
  c.projection(p,r,[0,0]).p.forEach((x,j)=>close(x,p[j]));
  const scaled=c.projection(v.map(x=>3*x),3*r,[0,0]).p;
  scaled.forEach((x,j)=>close(x,3*p[j]));
  const residual=sub(v,p);close(dot(residual,p),Math.hypot(...residual)*r);
 }
 assert.deepEqual(c.projection([0,0],0,[0,0]).p,[0,0]);
});

test('KKT dual certificate and strong-convex lower bound hold for random feasible points',()=>{
 for(let i=0;i<300;i++){
  const center=vector(),b=10*random()-5,a=c.kkt(center,b),z1=10*random()-5,z=[z1,b-z1-random()*5];
  close(a.lambda,Math.max(0,(center[0]+center[1]-b)/2));
  close(a.primal,a.dual);close(a.lambda*a.constraint,0);
  const objective=dot(sub(z,center),sub(z,center))/2;
  assert.ok(objective+1e-9>=a.primal+dot(sub(z,a.p),sub(z,a.p))/2);
 }
 const activeZero=c.kkt([1,1],2);close(activeZero.constraint,0);close(activeZero.lambda,0);
 const inactive=c.kkt([1,1],3);assert.ok(inactive.constraint<0);close(inactive.lambda,0);
});

test('Gradient stability boundary distinguishes all-start convergence from a special initial point',()=>{
 for(const alpha of [1e-7,.05,.125,.2,.249999,.25,.250001,.275]){
  const m=c.gradient(alpha,30,[2.5,1]);
  for(let k=0;k<=30;k++){
   close(m.path[k][0],2.5*(1-alpha)**k);
   close(m.path[k][1],(1-8*alpha)**k);
  }
  const exactDifference=m.values[1]-m.values[0];
  close(exactDifference,-alpha*(2.5**2+64)+alpha**2*(2.5**2+512)/2);
  assert.equal(m.converges,alpha>0&&alpha<.25);
 }
 close(c.gradient(.25,30,[0,1]).values[30],4);
 assert.ok(c.gradient(.275,30,[0,1]).values[30]>4);
 // An unstable method can still converge when the unstable eigenspace is absent.
 assert.ok(c.gradient(.275,30,[1,0]).values[30]<1e-8);
});

test('Soft threshold satisfies Moreau decomposition, firm nonexpansiveness and threshold endpoints',()=>{
 for(let i=0;i<400;i++){
  const lambda=3*random(),v=10*random()-5,w=10*random()-5;
  const p=c.soft(v,lambda),q=c.soft(w,lambda);
  close(v,p+Math.max(-lambda,Math.min(lambda,v)));
  assert.ok((p-q)**2<=(p-q)*(v-w)+1e-9);
  for(const endpoint of [-lambda,lambda])close(c.soft(endpoint,lambda),0);
  close(c.soft(v,0),v);
 }
});

test('Newton decrement matches exact objective decrease at arbitrary starts',()=>{
 for(let i=0;i<300;i++){
  const x=vector(),a=c.newton(x);
  close(a.decrement2,x[0]**2+8*x[1]**2);
  close(a.before-a.after,a.decrement2/2);
  close(dot(a.g,a.d),-a.decrement2);
 }
});

test('ADMM scaled/unscaled multipliers and stationarity residual identities hold across penalty scales',()=>{
 for(const rho of [.01,.05,.2,1,5,20,100]){
  const a=c.admm(1500,rho);
  for(const row of a.rounds){
   close((row.z+1)-row.lambda,0);
   // With displayed s=rho*(z-new - z-old), x stationarity is -s.
   close(row.x-3+row.lambda,-row.dual);
   close(row.primal,row.x-row.z);
  }
  const end=a.rounds.at(-1);close(end.x,1,1e-9);close(end.z,1,1e-9);close(end.lambda,2,1e-9);
 }
 assert.equal(c.admm(0,1).rounds.length,0);
});

test('Public numerical routines reject nonfinite and malformed input rather than draw misleading geometry',()=>{
 for(const bad of [NaN,Infinity,-Infinity]){
  for(const invoke of [()=>c.chord(bad),()=>c.supporting(bad),()=>c.projection([bad,0]),()=>c.kkt([0,bad]),()=>c.gradient(bad),()=>c.soft(bad,1),()=>c.proximal(bad),()=>c.newton([bad,0]),()=>c.admm(1,bad)])assert.throws(invoke);
 }
 for(const v of [[],[1],[1,2,3],null])for(const invoke of [()=>c.projection(v),()=>c.kkt(v),()=>c.newton(v)])assert.throws(invoke);
});
