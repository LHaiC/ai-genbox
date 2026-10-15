'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const api=require('../assets/animations.js'),katex=require('../assets/katex.min.js');
const ranges={'convex-chord':[0,1,.1],'supporting-plane':[-1.5,1.5,.25],projection:[.5,6,.5],kkt:[0,6,.5],gradient:[.05,.275,.025],prox:[0,3,.2],newton:[.25,2.5,.25],admm:[.25,4,.25]};
const values=([min,max,step])=>Array.from({length:Math.round((max-min)/step)+1},(_,i)=>Number((min+i*step).toFixed(8)));
const close=(x,y)=>assert.ok(Math.abs(Number(x)-y)<.000051,`${x} != ${y} at display precision`);

test('Every supported lab parameter and stage renders strict TeX with finite geometry',()=>{
 for(const [key,range]of Object.entries(ranges))for(const parameter of values(range)){
  const frames=api.getFrames(key,parameter),lab=api.laboratory(key,parameter);
  assert.ok(lab.values.length>=4&&lab.rule.length>5&&lab.contrast.length>30);
  for(const [i,f]of frames.entries()){
   katex.renderToString(f.formula,{throwOnError:true,strict:'error',trust:false});
   const d=api.drawScene(key,i,parameter);
   assert.ok(!/NaN|undefined|Infinity/.test(JSON.stringify({f,d,lab})),`${key} ${parameter} ${i}`);
  }
 }
});

test('Laboratory displayed values independently match their exact parameter models',()=>{
 for(const a of values(ranges['supporting-plane'])){const v=api.laboratory('supporting-plane',a).values;close(v[0][1],a);close(v[2][1],-a-a*a/2);close(v[3][1],(-1-a)**2/2);}
 for(const R of values(ranges.projection)){const v=api.laboratory('projection',R).values;close(v[1][1],Math.max(0,5-R));close(v[3][1],Math.min(5,R));}
 for(const b of values(ranges.kkt)){const v=api.laboratory('kkt',b).values;close(v[1][1],Math.max(0,(4-b)/2));close(v[2][1],Math.min(0,4-b));close(v[3][1],Math.max(0,4-b)**2/4);}
 for(const t of values(ranges.newton)){const v=api.laboratory('newton',t).values;close(v[2][1],8.5*(1-t)**2);close(v[3][1],8.5*(2*t-t*t));}
 for(const rho of values(ranges.admm)){const v=api.laboratory('admm',rho).values;let z=0,lambda=0,lastZ=0,x;for(let k=0;k<8;k++){lastZ=z;x=(3+rho*z-lambda)/(1+rho);z=(-1+rho*x+lambda)/(1+rho);lambda+=rho*(x-z);}close(v[1][1],Math.abs(x-z));close(v[2][1],Math.abs(rho*(z-lastZ)));close(v[3][1],lambda);}
});

test('Preset boundary cases belong to the supported parameter grids and remain renderable',()=>{
 for(const [key,cases]of Object.entries(api.cases)){
  assert.equal(cases.length,3,key);
  const [min,max,step]=ranges[key];
  for(const [value,label]of cases){assert.ok(value>=min&&value<=max,key);assert.ok(Math.abs((value-min)/step-Math.round((value-min)/step))<1e-8,key);assert.ok(label.length>2);api.getFrames(key,value);}
 }
 assert.match(api.laboratory('kkt',4).contrast,/λ=0/);
 assert.match(api.laboratory('gradient',.25).contrast,/4/);
 assert.match(api.laboratory('newton',2).contrast,/不变/);
});
