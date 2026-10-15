'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../assets/three-models.js');
const A=require('../assets/animations.js').compute;
const E=require('../assets/lesson-experiments.js');
const close=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b)),`${a} ≠ ${b}`);
const vector=(a,b)=>{assert.equal(a.length,b.length);a.forEach((x,i)=>close(x,b[i]));};
test('all eleven models expose finite geometry and explicit mathematical interpretation',()=>{
 for(const key of M.keys)for(const step of [0,1,4,8]){
  const m=M.build({key,step});assert.ok(m.objective&&m.note&&m.scaleNote);assert.equal(m.axisLabels.length,3);
  for(const s of m.surfaces)for(let i=0;i<=8;i++)for(let j=0;j<=8;j++)assert.ok(Number.isFinite(s.f(m.domain[0][0]+i/8*(m.domain[0][1]-m.domain[0][0]),m.domain[1][0]+j/8*(m.domain[1][1]-m.domain[1][0]))));
  for(const p of m.points)assert.ok(p.position.every(Number.isFinite));
  for(const p of m.paths)assert.ok(p.points.every(q=>q.every(Number.isFinite)));
  for(const s of m.solids){assert.ok(s.vertices.every(q=>q.every(Number.isFinite)));assert.ok(s.faces.flat().every(i=>i>=0&&i<s.vertices.length));}
 }
});
test('Jensen chord is exact original section and nonnegative analytical gap',()=>{
 for(let i=0;i<=20;i++){const theta=i/20,m=M.build({key:'convex-chord',step:4,value:theta});close(m.surfaces[0].f(2*theta,0),4*theta*theta);close(m.data.gap,4*theta*(1-theta));assert.ok(m.data.gap>=-1e-12);}
});
test('supporting plane tangent and global quadratic identity on analytic grid',()=>{
 for(const a of [-1.5,-1,0,.75,1.5]){const m=M.build({key:'supporting-plane',value:a,step:3}),f=m.surfaces[0].f,l=m.surfaces[1].f;close(f(a,0),l(a,0));for(let x=-4;x<=4;x+=.25)for(let y=-3;y<=3;y+=.5){close(f(x,y)-l(x,y),((x-a)**2+y*y)/2);assert.ok(f(x,y)>=l(x,y)-1e-12);}}
});
test('projection matches every radius and the all-feasible-point variational inequality',()=>{
 for(const radius of [.5,2,5,6]){const m=M.build({key:'projection',value:radius,step:5}),a=m.data;vector(a.p,A.projection([3,4],radius,[0,radius]).p);for(let i=0;i<50;i++){const q=[radius*Math.cos(i),radius*Math.sin(i)];assert.ok(a.residual.reduce((z,r,j)=>z+r*(q[j]-a.p[j]),0)<=1e-10);}close(m.surfaces[0].f(...a.p),a.distance*a.distance/2);}
});
test('KKT active, degenerate and inactive cases preserve stationarity and feasible clipping',()=>{
 for(const b of [0,2,4,6]){const m=M.build({key:'kkt',value:b,step:6}),a=m.data;vector(a.stationarity,[0,0]);assert.ok(a.constraint<=1e-12);close(a.complementarity,0);close(a.primal,a.dual);for(const p of M.clipHalfspace(b))assert.ok(p[0]+p[1]<=b+1e-12);}
});
test('gradient state matches exact existing iterations, including unstable step',()=>{
 for(const alpha of [.05,.125,.25,.275])for(let step=0;step<=6;step++){
  const m=M.build({key:'gradient',value:alpha,step}),a=A.gradient(alpha,5);assert.deepEqual(m.data.path,a.path);assert.equal(m.data.visibleLast,[0,0,1,2,3,5,5][step]);for(let k=0;k<=5;k++){close(a.path[k][0],2.5*(1-alpha)**k);close(a.path[k][1],(1-8*alpha)**k);close(m.surfaces[0].f(...a.path[k]),a.values[k]);}
 }
});
test('Newton full and damped coordinates retain t=2 and overshoot counterexamples',()=>{
 for(const t of [.25,1,2,2.5]){const m=M.build({key:'newton',value:t,step:4});vector(m.data.next,[3*(1-t),1-t]);close(m.data.after,8.5*(1-t)**2);}
});
test('prox parametric surface fixes input 2.4 and ridge solves each scalar section',()=>{
 for(const lambda of [0,1,2.4,3]){const m=M.build({key:'prox',value:lambda,step:6}),f=m.surfaces[0].f;assert.equal(m.section.value,2.4);close(f(m.data.x,2.4),A.proximal(lambda).value);for(let v=-3;v<=3;v+=.25){const u=m.data.ridge(v);close(u,A.soft(v,lambda));for(let q=-3;q<=3;q+=.25)assert.ok(f(u,v)<=f(q,v)+1e-10);}}
});
test('ADMM uses joint objective and partial-round visibility without inventing x0',()=>{
 for(const rho of [.25,1,4]){for(let step=0;step<=8;step++){const m=M.build({key:'admm',value:rho,step}),a=A.admm(8,rho);assert.deepEqual(m.data.rounds,a.rounds);if(step===0)assert.equal(m.data.current,null);else{const r=a.rounds[(step>=7?8:step===6?4:step===5?2:1)-1];vector(m.data.current,[r.x,step===1?r.oldZ:r.z]);if(step>=2)close(m.surfaces[0].f(...m.data.current),r.splitObjective);}}}
 const m=M.build({key:'admm'});close(m.surfaces[0].f(1,1),4);
});
test('preconditioning coordinate transform preserves objective and synchronized paths',()=>{
 for(const t of [.01,2/101])for(const k of [0,1,5,30]){const a=M.build({lessonId:'m5-l4',k,t}),b=M.build({lessonId:'m5-l4',k,t,variant:'scaled'});assert.equal(a.data.raw.length,k+1);assert.equal(b.data.scaled.length,k+1);vector(a.data.raw[0],[1,1]);vector(b.data.scaled[0],[1,10]);for(let i=0;i<=k;i++)close(a.surfaces[0].f(b.data.scaled[i][0],.1*b.data.scaled[i][1]),b.surfaces[0].f(...b.data.scaled[i]));if(k)vector(b.data.physical,[0,0]);}
});
test('scalar PG has touching global upper model and exact proximal trajectory',()=>{
 for(const t of [.25,.5,1])for(const k of [0,1,6]){const m=M.build({lessonId:'m6-l3',k,t}),{x,q,xs,next}=m.data;close(q(x),E.scalarF(x));close(next,E.scalarStep(x,t));for(let i=1;i<xs.length;i++)close(xs[i],E.scalarStep(xs[i-1],t));for(let u=-4;u<=4;u+=.2){close(q(u)-E.scalarF(u),.5*(1/t-1)*(u-x)**2);assert.ok(q(u)>=E.scalarF(u)-1e-10);}}
});
test('Lasso exact objective, ISTA and dual certificate agree including optimum',()=>{
 for(const t of [.125,.25])for(const k of [0,1,5,30])for(const exact of [false,true]){const m=M.build({lessonId:'m6-l4',k,t,exact}),{xs,x,certificate:c}=m.data;for(let i=1;i<=k;i++)vector(xs[i],E.lassoStep(xs[i-1],t));close(m.surfaces[0].f(...x),c.primal);assert.ok(c.feasibility<=1+1e-12);assert.ok(c.primal-2.58<=c.gap+1e-12);assert.ok(c.gap>=-1e-12);if(exact){vector(x,[2,0]);close(c.gap,0);close(c.primal,2.58);}}
});
test('browser model can load before its math dependencies',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),window={};const context={window};vm.runInNewContext(fs.readFileSync(require.resolve('../assets/three-models.js'),'utf8'),context);window.ConvexAnimations={compute:A};window.LessonExperiments={math:E};close(window.ConvexThreeModels.build({key:'gradient'}).data.alpha,.125);close(window.ConvexThreeModels.build({lessonId:'m6-l4'}).data.certificate.primal,4.58);
});
test('prox stage zero and one preserve distance/penalty decomposition',()=>{
 const a=M.build({key:'prox',step:0,value:1}),b=M.build({key:'prox',step:1,value:1}),c=M.build({key:'prox',step:2,value:1});close(a.surfaces[0].f(2.4,2.4),0);close(b.surfaces[0].f(1.4,2.4)+b.surfaces[1].f(1.4,2.4),c.surfaces[0].f(1.4,2.4));
});
