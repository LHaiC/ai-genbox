'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const a=require('../assets/lesson-experiments.js');
const close=(x,y,t=1e-10)=>assert.ok(Math.abs(x-y)<=t*Math.max(1,Math.abs(x),Math.abs(y)),`${x} != ${y}`);
const norm2=v=>v.reduce((s,x)=>s+x*x,0),originalF=x=>(x[0]**2+100*x[1]**2)/2;

test('Exact preconditioning lesson: physical start, transformed Hessian, objectives and mode factors',()=>{
 close(originalF([1,1]),50.5);
 assert.deepEqual(a.preStep([1,1]),[.99,0]);close(originalF(a.preStep([1,1])),.49005);
 close(.1*100*.1,1);close(norm2([1,10])/2,50.5);
 assert.deepEqual(a.preStep([1,10],1,true),[0,0]);
 for(const t of [.01,2/101]){let x=[1,1];for(let k=1;k<=30;k++){x=a.preStep(x,t);close(x[0],(1-t)**k);close(x[1],(1-100*t)**k);}}
 close(Math.max(Math.abs(1-2/101),Math.abs(1-200/101)),99/101);
});

test('Exact scalar PG lesson: iterates, full objective, upper model and certified rate',()=>{
 let x=0;for(const [expected,value]of [[1,3],[1.5,2.625],[1.75,2.53125]]){x=a.scalarStep(x);close(x,expected);close(a.scalarF(x),value);}
 close(a.scalarF(2),2.5);close(a.scalarStep(2),2);
 for(const t of [.25,.5,1]){
  let x=0,previous=a.scalarF(x);
  for(let k=1;k<=30;k++){
   const next=a.scalarStep(x,t),value=a.scalarF(next),g=x-3;
   const model=u=>(x-3)**2/2+g*(u-x)+(u-x)**2/(2*t)+Math.abs(u);
   for(let j=-20;j<=40;j++){const u=j/10;assert.ok(model(u)+1e-10>=a.scalarF(u));assert.ok(model(u)+1e-10>=model(next));}
   assert.ok(value<=previous+1e-10);assert.ok(value-2.5<=2/(t*k)+1e-10);
   x=next;previous=value;
  }
 }
});

test('Exact Lasso lesson: first step, residual scaling, primal/dual certificate and optimum',()=>{
 const x=a.lassoStep([0,0]);assert.deepEqual(x,[.5,0]);
 const c=a.certificate(x);assert.deepEqual(c.r,[2.5,.4]);close(c.M,2.5);close(c.alpha,.4);
 close(c.y[0],1);close(c.y[1],.16);close(c.primal,3.705);close(c.dual,2.5512);close(c.gap,1.1538);close(c.feasibility,1);
 const optimum=a.certificate([2,0]);close(optimum.primal,2.58);close(optimum.dual,2.58);close(optimum.gap,0);
 assert.deepEqual(a.lassoStep([2,0]),[2,0]);
 for(const t of [.125,.25]){let x=[0,0],prior=a.certificate(x).primal;for(let k=1;k<=30;k++){x=a.lassoStep(x,t);const c=a.certificate(x);assert.ok(c.feasibility<=1+1e-12);assert.ok(c.primal<=prior+1e-12);assert.ok(c.dual<=2.58+1e-12);assert.ok(c.primal-2.58<=c.gap+1e-12);prior=c.primal;}}
});

test('Residual-scaled Lasso certificates stay valid off the shown trajectory, including zero residual',()=>{
 for(const lambda of [.1,1,3,5]){
  const optimum=[Math.max(3-lambda,0),Math.max(.8-lambda,0)/4];
  const fstar=.5*((optimum[0]-3)**2+(2*optimum[1]-.4)**2)+lambda*(Math.abs(optimum[0])+Math.abs(optimum[1]));
  for(let i=-15;i<=25;i++)for(let j=-10;j<=10;j++){
   const x=[i/5,j/5],c=a.certificate(x,lambda);
   assert.ok(c.feasibility<=lambda+1e-10);
   assert.ok(c.dual<=fstar+1e-10);assert.ok(c.primal>=fstar-1e-10);assert.ok(c.gap>=-1e-10);
  }
 }
 const c=a.certificate([3,.2]);close(c.M,0);close(c.alpha,1);assert.ok(Number.isFinite(c.gap));
});
