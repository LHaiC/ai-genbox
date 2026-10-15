'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const api=require('../assets/animations.js');
const {chord,supporting,projection,kkt,gradient,soft,proximal,newton,admm}=api.compute;
const close=(actual,expected,tol=1e-10)=>assert.ok(Math.abs(actual-expected)<=tol,`${actual} ≠ ${expected}`);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const sq=v=>dot(v,v);

test('Eight discoverable scenes have substantive, synchronized explanatory stages',()=>{
  assert.deepEqual(api.keys,['convex-chord','supporting-plane','projection','kkt','gradient','prox','newton','admm']);
  for(const key of api.keys){const frames=api.getFrames(key);assert.ok(frames.length>=6);const seen=new Set();frames.forEach((f,i)=>{for(const prop of ['title','caption','formula','reason'])assert.ok(typeof f[prop]==='string'&&f[prop].length>=5,`${key}/${i}/${prop}`);assert.ok(f.caption.length>=30);assert.ok(f.reason.length>=20);assert.ok(!seen.has(f.caption));seen.add(f.caption);const d=api.drawScene(key,i);assert.ok(d.body.length>100);assert.ok(d.axes.length>20);assert.ok(!/NaN|undefined|Infinity/.test(d.body+d.axes));});}
});

test('Chord gap equals exact Jensen deficit at all weights and at endpoints',()=>{
  for(let k=0;k<=100;k++){const t=k/100,a=chord(t);close(a.x,2*t);close(a.curve,4*t*t);close(a.gap,4*t*(1-t));assert.ok(a.gap>=-1e-12);}
  close(chord(0).gap,0);close(chord(1).gap,0);assert.throws(()=>chord(-.1));assert.throws(()=>chord(1.1));
});

test('Supporting line touches at a, has the derivative slope, and stays below globally',()=>{
  for(const a of [-2,-1,0,1,2])for(const x of [-4,-2,-.7,0,1,2,3]){const r=supporting(a,x);close(r.value-r.line,r.gap);close(r.gap,(x-a)**2/2);assert.ok(r.gap>=0);close(r.slope,a);close(supporting(a,a).gap,0);}
});

test('Disk projection is feasible, radial, nonexpansive, and satisfies the variational inequality',()=>{
  const example=projection();close(example.p[0],1.2);close(example.p[1],1.6);close(example.distance,3);close(example.vi,-1.2);close(example.distance2,13);close(example.split,10.6);
  for(const v of [[0,0],[.5,.7],[3,4],[-7,2],[10,-10]])for(const radius of [0,.5,2,8]){const p=projection(v,radius,[0,0]).p;assert.ok(Math.hypot(...p)<=radius+1e-10);for(let k=0;k<60;k++){const z=[radius*Math.cos(k),radius*Math.sin(k)],r=projection(v,radius,z);assert.ok(r.vi<=1e-9);assert.ok(r.distance2+1e-9>=r.split);}}
  const pairs=[[[3,4],[-1,7]],[[0,0],[1,1]],[[-5,0],[2,3]]];for(const [v,w]of pairs){const p=projection(v).p,q=projection(w).p;assert.ok(Math.hypot(p[0]-q[0],p[1]-q[1])<=Math.hypot(v[0]-w[0],v[1]-w[1])+1e-10);}
});

test('Halfspace KKT conditions and strong duality hold for active and inactive constraints',()=>{
  for(const center of [[2,2],[0,0],[-1,3],[7,4]])for(const b of [-1,0,2,10]){const a=kkt(center,b);assert.ok(a.constraint<=1e-10);assert.ok(a.lambda>=0);close(a.complementarity,0);a.stationarity.forEach(x=>close(x,0));close(a.primal,a.dual);for(let j=-5;j<=5;j++){const z=[j,b-j-1],value=((z[0]-center[0])**2+(z[1]-center[1])**2)/2;assert.ok(value>=a.primal-1e-10);}}
  const a=kkt();assert.deepEqual(a.p,[1,1]);close(a.lambda,1);close(a.primal,1);close(a.dual,1);
});

test('Gradient iterations, smooth bound and exact spectral stability agree',()=>{
  for(const alpha of [.05,.1,.125,.175,.225,.25,.275]){const a=gradient(alpha,20);for(let k=0;k<20;k++){close(a.path[k+1][0],a.path[k][0]-alpha*a.path[k][0]);close(a.path[k+1][1],a.path[k][1]-alpha*8*a.path[k][1]);}assert.ok(a.values[1]<=a.bound+1e-10);if(alpha<=.125){for(let k=0;k<20;k++)assert.ok(a.values[k+1]<=a.values[k]+1e-10);}assert.equal(a.converges,a.factor<1);}
  close(gradient(.125).path[1][1],0);close(Math.abs(gradient(.25).path[5][1]),1);assert.ok(Math.abs(gradient(.275).path[5][1])>1);assert.throws(()=>gradient(0));
});

test('Soft threshold uses the subgradient interval and is never hard thresholding',()=>{
  for(const lambda of [0,.1,.6,1,2.4,2.6,3])for(const v of [-4,-2.4,-1,-.1,0,.1,1,2.4,4]){const a=proximal(lambda,v);close(a.stationarity,0);assert.ok(Math.abs(a.s)<=1+1e-10);if(Math.abs(v)<=lambda)close(a.x,0);else close(a.x,v-Math.sign(v)*lambda);for(let j=-40;j<=40;j++){const x=j/10,value=(x-v)**2/2+lambda*Math.abs(x);assert.ok(value>=a.value-1e-10);}}
  close(soft(2.4,1),1.4);close(soft(-2.4,1),-1.4);close(soft(.8,1),0);assert.throws(()=>soft(1,-1));
});

test('Newton direction solves the Hessian system and its model is exact for this quadratic',()=>{
  for(const point of [[3,1],[0,0],[-2,4],[.4,-.8]]){const a=newton(point);for(let i=0;i<2;i++){close(a.H[i]*a.d[i],-a.g[i]);close(a.next[i],0);}close(a.after,0);close(a.before,a.decrement2/2);assert.ok(a.gradientAfter>=a.after);}
  close(newton().gradientAfter,3.4453125);close(newton().before,8.5);
});

test('ADMM uses fresh x, scaled multipliers, and both residuals; limit satisfies KKT',()=>{
  const a=admm(8),r=a.rounds;assert.deepEqual([r[0].x,r[0].z,r[0].u],[1.5,.25,1.25]);close(r[0].splitObjective,1.90625);close(r[1].primal,.375);close(r[1].dual,.375);close(r[7].primal,.005859375);
  for(const rho of [.2,1,3]){const model=admm(150,rho);for(const q of model.rounds){close((q.x-3)+rho*(q.x-q.oldZ+q.oldU),0);close((q.z+1)+rho*(q.z-q.x-q.oldU),0);close(q.u,q.oldU+q.x-q.z);close(q.dual,rho*(q.z-q.oldZ));close(q.lambda,rho*q.u);}const q=model.rounds.at(-1);close(q.x,1,1e-8);close(q.z,1,1e-8);close(q.lambda,2,1e-8);close(q.primal,0,1e-8);close(q.dual,0,1e-8);}
  assert.throws(()=>admm(1,0));assert.throws(()=>admm(-1));assert.throws(()=>admm(1.2));
});

test('All slider variants retain valid computed geometry and narrative',()=>{
  const sliders={'convex-chord':Array.from({length:11},(_,i)=>i/10),gradient:Array.from({length:10},(_,i)=>.05+i*.025),prox:Array.from({length:16},(_,i)=>i*.2)};
  for(const [key,values] of Object.entries(sliders))for(const value of values)api.getFrames(key,value).forEach((f,i)=>{const d=api.drawScene(key,i,value);assert.ok(!/NaN|undefined|Infinity/.test(d.body+d.axes+f.formula+f.caption),`${key}/${value}/${i}`);});
});

test('Controller starts paused, advances explanatory stages, pauses and clears timeouts on cleanup',()=>{
  const vm=require('node:vm'),fs=require('node:fs');
  class Node {
    constructor(){this.children=new Map();this.events=new Map();this.classList={add(){},remove(){}};this.isConnected=true;this.attributes={};this.value='';this.textContent='';this.innerHTML='';}
    querySelector(selector){if(selector==='input'&&!this.innerHTML.includes('type="range"'))return null;if(!this.children.has(selector))this.children.set(selector,new Node());return this.children.get(selector);}
    setAttribute(k,v){this.attributes[k]=v;}
    addEventListener(k,fn){this.events.set(k,fn);}
    removeEventListener(k,fn){if(this.events.get(k)===fn)this.events.delete(k);}
    getBoundingClientRect(){return{width:420,height:320};}
    fire(name){this.events.get(name)?.();}
  }
  const timers=new Map(),document=new Node();let id=0;
  const window={document,matchMedia:()=>({matches:false}),setTimeout:fn=>{timers.set(++id,fn);return id;},clearTimeout:k=>timers.delete(k)};
  const context=vm.createContext({window});vm.runInContext(fs.readFileSync(require.resolve('../assets/animations.js'),'utf8'),context);
  for(const key of window.ConvexAnimations.keys){const el=new Node(),cleanup=window.ConvexAnimations.mount(el,key),count=window.ConvexAnimations.getFrames(key).length;
    assert.equal(timers.size,0,'No autoplay');assert.equal(el.querySelector('.ca-count').textContent,`第 1 / ${count} 步`);
    el.querySelector('[data-ca="play"]').fire('click');assert.equal(timers.size,1);
    for(let step=1;step<count;step++){const [timer,fn]=timers.entries().next().value;timers.delete(timer);fn();assert.equal(el.querySelector('.ca-count').textContent,`第 ${step+1} / ${count} 步`);}
    assert.equal(timers.size,0,'End of playback clears timer');assert.equal(el.querySelector('[data-ca="next"]').disabled,true);
    el.querySelector('[data-ca="reset"]').fire('click');assert.equal(el.querySelector('.ca-count').textContent,`第 1 / ${count} 步`);
    el.querySelector('[data-ca="play"]').fire('click');el.querySelector('[data-ca="next"]').fire('click');assert.equal(timers.size,0,'Manual step pauses playback');
    el.querySelector('[data-ca="play"]').fire('click');document.hidden=true;document.fire('visibilitychange');assert.equal(timers.size,0,'Hidden page pauses');document.hidden=false;
    el.querySelector('[data-ca="play"]').fire('click');assert.equal(timers.size,1);cleanup();assert.equal(timers.size,0);assert.equal(el.querySelector('[data-ca="play"]').events.size,0);assert.equal(el.__convexAnimationCleanup,undefined);cleanup();
  }
});
