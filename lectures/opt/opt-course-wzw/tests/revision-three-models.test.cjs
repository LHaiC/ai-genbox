'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../assets/three-models.js'),A=require('../assets/animations.js'),E=require('../assets/lesson-experiments.js');
const close=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<=t*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const ranges={'convex-chord':[0,1,.1],'supporting-plane':[-1.5,1.5,.25],projection:[.5,6,.5],kkt:[0,6,.5],gradient:[.05,.275,.025],prox:[0,3,.2],newton:[.25,2.5,.25],admm:[.25,4,.25]};
const grid=([a,b,h])=>Array.from({length:Math.round((b-a)/h)+1},(_,i)=>Number((a+i*h).toFixed(8)));
const validPoint=p=>{assert.equal(p.length,3);p.forEach(x=>assert.ok(Number.isFinite(x)));};

test('All 680 shared 3D scene states have finite true model samples, coordinates and proof caveats',()=>{
 let count=0;for(const [key,range]of Object.entries(ranges))for(const value of grid(range))for(let step=0;step<A.getFrames(key,value).length;step++){
  count++;const m=M.build({key,value,step});assert.ok(m.note.includes('不能证明'));assert.equal(m.axisLabels.length,3);
  for(const s of m.surfaces)for(let i=0;i<=10;i++)for(let j=0;j<=10;j++){const x=m.domain[0][0]+(m.domain[0][1]-m.domain[0][0])*i/10,y=m.domain[1][0]+(m.domain[1][1]-m.domain[1][0])*j/10;assert.ok(Number.isFinite(s.f(x,y)));}
  for(const p of m.points)validPoint(p.position);for(const p of m.paths)p.points.forEach(validPoint);for(const s of m.solids){s.vertices.forEach(validPoint);s.faces.flat().forEach(i=>assert.ok(i>=0&&i<s.vertices.length));}
 }
 assert.equal(count,680);
});

test('Convex lift preserves original section; supporting-plane gap and tangency hold in both variables',()=>{
 for(const theta of grid(ranges['convex-chord'])){const m=M.build({key:'convex-chord',value:theta,step:4}),f=m.surfaces[0].f;close(f(2*theta,0),4*theta*theta);close(m.data.gap,4*theta*(1-theta));close(f(1,2),5);}
 for(const a of grid(ranges['supporting-plane'])){const m=M.build({key:'supporting-plane',value:a,step:4}),f=m.surfaces[0].f,tangent=m.surfaces[1].f;close(f(a,0),tangent(a,0));for(let i=-4;i<=4;i++)for(let j=-4;j<=4;j++){const x=i/2,y=j/2;close(f(x,y)-tangent(x,y),((x-a)**2+y*y)/2);close(m.data.gap(x,y),f(x,y)-tangent(x,y));}}
});

test('Projection normals and KKT feasible geometry refer to variable-space constraints, not graph normals',()=>{
 for(const R of grid(ranges.projection)){const m=M.build({key:'projection',value:R,step:5}),a=m.data;close(Math.hypot(...a.p),Math.min(R,5));close(m.surfaces[0].f(...a.p),Math.max(5-R,0)**2/2);for(const q of m.solids[0].vertices){close(q[2],0);assert.ok(Math.hypot(q[0],q[1])<=R+1e-9);}for(const arrow of m.arrows){close(arrow.from[2],0);close(arrow.to[2],0);close(arrow.to[0]-arrow.from[0],a.residual[0]);close(arrow.to[1]-arrow.from[1],a.residual[1]);}}
 for(const b of grid(ranges.kkt)){const m=M.build({key:'kkt',value:b,step:5}),a=m.data;for(const q of m.solids[0].vertices)assert.ok(q[0]+q[1]<=b+1e-9);close(m.surfaces[0].f(...a.p),a.primal);close(a.primal,a.dual);for(const s of m.solids.slice(1))for(const q of s.vertices)close(q[0]+q[1],b);}
});

test('Gradient and Newton plotted discrete endpoints use exact objectives and synchronized stages',()=>{
 const mapping=[0,0,1,2,3,5,5];
 for(const alpha of grid(ranges.gradient))for(let step=0;step<7;step++){
  const m=M.build({key:'gradient',value:alpha,step}),a=A.compute.gradient(alpha);assert.equal(m.data.visibleLast,mapping[step]);
  const trajectory=m.paths.find(p=>p.label==='迭代点连线');if(mapping[step]){assert.equal(trajectory.points.length,mapping[step]+1);trajectory.points.forEach((p,k)=>{close(p[0],a.path[k][0]);close(p[1],a.path[k][1]);close(p[2],a.values[k]);});}
 }
 for(const t of grid(ranges.newton)){const m=M.build({key:'newton',value:t,step:4});close(m.data.next[0],3*(1-t));close(m.data.next[1],1-t);close(m.data.after,8.5*(1-t)**2);}
});

test('ADMM joint surface keeps primal coordinates separate from multiplier and current-stage updates',()=>{
 for(const rho of grid(ranges.admm))for(let step=0;step<=8;step++){
  const m=M.build({key:'admm',value:rho,step}),a=A.compute.admm(8,rho);close(m.surfaces[0].f(1,1),4);
  if(step===0){assert.equal(m.data.current,null);continue;}
  const n=step>=7?8:step===6?4:step===5?2:1,q=a.rounds[n-1];close(m.data.current[0],q.x);close(m.data.current[1],step===1?q.oldZ:q.z);assert.equal(m.data.visibleRounds,n);
  const trajectory=m.paths.find(p=>p.label==='完成轮次的联合目标');if(trajectory)trajectory.points.forEach((p,k)=>{close(p[0],a.rounds[k].x);close(p[1],a.rounds[k].z);close(p[2],a.rounds[k].splitObjective);});
 }
});

test('Lesson-specific 3D scenes preserve coordinate transformations, scalar upper model and Lasso certificates',()=>{
 for(const t of [.01,2/101])for(let k=0;k<=30;k++)for(const variant of ['raw','scaled']){const m=M.build({lessonId:'m5-l4',k,t,variant}),p=m.data[variant].at(-1);close(m.metrics[1].value,variant==='raw'?(p[0]**2+100*p[1]**2)/2:(p[0]**2+p[1]**2)/2);if(k>0)m.data.physical.forEach(x=>close(x,0));if(k===0)close(m.metrics[1].value,50.5);}
 for(const t of [.25,.5,1])for(let k=0;k<=30;k++){const m=M.build({lessonId:'m6-l3',k,t}),x=m.data.x;for(let j=-10;j<=40;j++){const u=j/10;close(m.data.q(u)-E.scalarF(u),(1/t-1)*(u-x)**2/2);close(m.surfaces[0].f(u,.2),E.scalarF(u));}assert.match(m.axisLabels[1],/非变量/);}
 for(const t of [.125,.25])for(let k=0;k<=30;k++)for(const exact of [false,true]){const m=M.build({lessonId:'m6-l4',k,t,exact}),c=m.data.certificate;close(m.surfaces[0].f(...m.data.x),c.primal);assert.ok(c.gap>=-1e-10);assert.ok(c.feasibility<=1+1e-10);if(exact){close(c.primal,2.58);close(c.gap,0);}}
});

test('Soft-threshold parameter surface preserves the fixed-input problem and its conditional minimizer ridge',()=>{
 for(const lambda of grid(ranges.prox)){
  const m=M.build({key:'prox',value:lambda,step:6}),f=m.surfaces[0].f;
  assert.equal(m.section.axis,'y');close(m.section.value,2.4);assert.match(m.axisLabels[1],/参数/);
  for(let j=-30;j<=30;j++){
   const input=j/10,u=m.data.ridge(input);close(u,Math.sign(input)*Math.max(Math.abs(input)-lambda,0));
   for(let h=-30;h<=30;h++)assert.ok(f(h/10,input)>=f(u,input)-1e-10);
  }
  close(f(m.data.x,2.4),A.compute.proximal(lambda).value);
  const ridge=m.paths.find(p=>p.label.includes('最优脊线'));assert.ok(ridge);ridge.points.forEach(p=>{close(p[0],m.data.ridge(p[1]));close(p[2],f(p[0],p[1]));});
 }
});
