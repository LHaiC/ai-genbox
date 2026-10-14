/* Numerical kernel. Deterministic, DOM-free, IEEE-754 double precision.
 * Every plotted point is computed from these functions; no experimental series are hard-coded.
 * Pedagogical examples are not reproductions of the source authors' benchmarks.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OptMath=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
const EPS=1e-12;
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
const dot=(a,b)=>{assert(a.length===b.length,'Vector dimension mismatch');return a.reduce((s,v,i)=>s+v*b[i],0);};
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const scale=(a,t)=>a.map(v=>v*t);
const norm=a=>Math.hypot(...a);
const l1=a=>a.reduce((s,v)=>s+Math.abs(v),0);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const eye=n=>Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>+(i===j)));
const trans=A=>A[0].map((_,j)=>A.map(r=>r[j]));
const mv=(A,x)=>A.map(r=>dot(r,x));
const mm=(A,B)=>{const Bt=trans(B);return A.map(r=>Bt.map(c=>dot(r,c)));};
const madd=(A,B,t=1)=>A.map((r,i)=>r.map((v,j)=>v+t*B[i][j]));
const mscale=(A,t)=>A.map(r=>scale(r,t));
const outer=(a,b)=>a.map(v=>scale(b,v));
const frob=A=>Math.hypot(...A.flat());
const clone=o=>JSON.parse(JSON.stringify(o));
function solve(A,b){
 const n=b.length;assert(A.length===n&&A.every(r=>r.length===n),'Non-square system');
 const M=A.map((r,i)=>[...r,b[i]]),sz=Math.max(1,...A.flat().map(Math.abs));
 for(let k=0;k<n;k++){
  let p=k;for(let i=k+1;i<n;i++)if(Math.abs(M[i][k])>Math.abs(M[p][k]))p=i;
  assert(Math.abs(M[p][k])>Number.EPSILON*sz*8,'Singular or numerically unresolved linear system');
  [M[p],M[k]]=[M[k],M[p]];
  for(let i=k+1;i<n;i++){const f=M[i][k]/M[k][k];for(let j=k;j<=n;j++)M[i][j]-=f*M[k][j];}
 }
 const x=Array(n).fill(0);for(let i=n-1;i>=0;i--){let v=M[i][n];for(let j=i+1;j<n;j++)v-=M[i][j]*x[j];x[i]=v/M[i][i];}return x;
}
function eigen2(A){
 assert(A.length===2&&Math.abs(A[0][1]-A[1][0])<1e-9,'eigen2 requires symmetric 2x2');
 const a=A[0][0],b=A[0][1],c=A[1][1],r=Math.hypot(a-c,2*b),t=.5*Math.atan2(2*b,a-c);
 return {values:[(a+c-r)/2,(a+c+r)/2],vectors:[[-Math.sin(t),Math.cos(t)],[Math.cos(t),Math.sin(t)]]};
}
function rotatedQ(kappa,angle=Math.PI/6){const c=Math.cos(angle),s=Math.sin(angle);return [[c*c+kappa*s*s,(1-kappa)*c*s],[(1-kappa)*c*s,s*s+kappa*c*c]];}
function problem(which='correlated',kappa=20){
 let Q,b;
 if(which==='isotropic'){Q=[[1,0],[0,1]];b=[1.4,.65];}
 else if(which==='ill'){Q=rotatedQ(kappa);b=mv(Q,[.7,-.8]);}
 else{Q=[[3,.9],[.9,1.2]];b=[2,.5];}
 const center=solve(Q,b),constant=.5*dot(b,center),e=eigen2(Q);
 return {Q,b,center,constant,L:e.values[1],mu:e.values[0]};
}
const qvalue=(p,x)=>.5*dot(x,mv(p.Q,x))-dot(p.b,x)+(p.constant||0);
const qgrad=(p,x)=>sub(mv(p.Q,x),p.b);
const lassoValue=(p,x,lambda)=>qvalue(p,x)+lambda*l1(x);
function soft(x,t){assert(t>=0,'Negative threshold');return Math.sign(x)*Math.max(Math.abs(x)-t,0);}
const softV=(x,t)=>x.map(v=>soft(v,t));
function groupSoft(x,t){const n=norm(x);return n<=t?x.map(()=>0):scale(x,1-t/n);}
function projectSimplex(v,r=1){
 assert(r>0,'Simplex mass must be positive');const u=[...v].sort((a,b)=>b-a);let s=0,theta=0;
 for(let j=0;j<u.length;j++){s+=u[j];const a=(s-r)/(j+1);if(u[j]>a)theta=a;}return v.map(x=>Math.max(x-theta,0));
}
function kktLasso(p,x,lambda){
 const g=qgrad(p,x);return norm(x.map((v,i)=>Math.abs(v)>1e-10?g[i]+lambda*Math.sign(v):Math.sign(g[i])*Math.max(Math.abs(g[i])-lambda,0)));
}
/* Exhaustive active-set oracle in R^2: independent of all iterative solvers. */
function lassoOracle2(p,lambda){
 assert(lambda>=0&&eigen2(p.Q).values[0]>0,'Oracle assumes SPD Q and lambda >= 0');let best=null;
 for(const a of [-1,0,1])for(const b of [-1,0,1]){
  const signs=[a,b],I=[0,1].filter(i=>signs[i]!==0),x=[0,0];
  if(I.length){const A=I.map(i=>I.map(j=>p.Q[i][j])),rhs=I.map(i=>p.b[i]-lambda*signs[i]),v=solve(A,rhs);I.forEach((i,j)=>x[i]=v[j]);}
  const g=qgrad(p,x);const ok=[0,1].every(i=>signs[i]===0?Math.abs(g[i])<=lambda+1e-8:x[i]*signs[i]>=-1e-10&&Math.abs(g[i]+lambda*signs[i])<1e-7);
  if(ok){const value=lassoValue(p,x,lambda);if(!best||value<best.value)best={x,value,kkt:kktLasso(p,x,lambda)};}
 }
 assert(best,'No active set passed KKT');return best;
}
function functions(which,p=problem()){
 if(which==='rosenbrock')return {f:x=>(1-x[0])**2+100*(x[1]-x[0]**2)**2,g:x=>[2*(x[0]-1)-400*x[0]*(x[1]-x[0]**2),200*(x[1]-x[0]**2)],H:x=>[[2-400*x[1]+1200*x[0]**2,-400*x[0]],[-400*x[0],200]],start:[-1.2,1],opt:[1,1]};
 if(which==='saddle')return {f:x=>x[0]**4/4-x[0]**2/2+x[1]**2/2+.25,g:x=>[x[0]**3-x[0],x[1]],H:x=>[[3*x[0]**2-1,0],[0,1]],start:[.25,1.4],opt:[1,0]};
 return {f:x=>qvalue(p,x),g:x=>qgrad(p,x),H:()=>p.Q,start:[2.5,1.8],opt:p.center};
}
function finiteDifference(f,x,h=1e-5){return x.map((_,i)=>{const a=[...x],b=[...x];a[i]+=h;b[i]-=h;return (f(a)-f(b))/(2*h);});}
function armijo(f,g,x,d,{alpha=1,beta=.5,c=1e-4,max=60}={}){
 const fx=f(x),slope=dot(g(x),d);assert(slope<0||norm(d)<1e-14,'Direction is not a descent direction');
 const trials=[];
 for(let j=0;j<max;j++){const v=f(add(x,scale(d,alpha))),bound=fx+c*alpha*slope;const ok=Number.isFinite(v)&&v<=bound+1e-14*Math.max(1,Math.abs(fx));trials.push({alpha,value:v,bound,accepted:ok});if(ok)return {alpha,trials};alpha*=beta;}
 throw new Error('Armijo search exhausted its safeguarded budget');
}
function bfgsInverse(H,s,y){
 const ys=dot(y,s);if(ys<=1e-12*norm(y)*norm(s)||ys<=1e-20)return {H:clone(H),skipped:true};
 const rho=1/ys,V=madd(eye(s.length),outer(s,y),-rho);const out=madd(mm(mm(V,H),trans(V)),outer(s,s),rho);return {H:out,skipped:false};
}
function lbfgsDirection(g,pairs){
 if(!pairs.length)return scale(g,-1);let q=[...g],alph=[];
 for(let i=pairs.length-1;i>=0;i--){const {s,y}=pairs[i],a=dot(s,q)/dot(y,s);alph[i]=a;q=sub(q,scale(y,a));}
 const last=pairs[pairs.length-1];let z=scale(q,dot(last.s,last.y)/dot(last.y,last.y));
 for(let i=0;i<pairs.length;i++){const {s,y}=pairs[i],beta=dot(y,z)/dot(y,s);z=add(z,scale(s,alph[i]-beta));}return scale(z,-1);
}
/* Global minimizer of a symmetric two-dimensional trust-region subproblem.
 * Handles SPD interior, indefinite boundary, zero gradient and the hard case.
 */
function trustRegion(Q,g,delta){
 assert(delta>0,'Trust radius must be positive');const {values:e,vectors:V}=eigen2(Q),h=V.map(v=>dot(v,g));
 const base=Math.max(0,-e[0]),tol=1e-11*Math.max(1,norm(g),Math.abs(e[1]));
 const lift=z=>add(scale(V[0],z[0]),scale(V[1],z[1]));
 if(e[0]>tol){const z=h.map((v,i)=>-v/e[i]);if(norm(z)<=delta+tol)return {d:lift(z),lambda:0,hard:false,interior:true};}
 const z=[0,0];let singular=[],possible=true;
 for(let i=0;i<2;i++){if(Math.abs(e[i]+base)<tol){singular.push(i);if(Math.abs(h[i])>tol)possible=false;}else z[i]=-h[i]/(e[i]+base);}
 if(possible&&norm(z)<=delta+tol){
  if(base>0&&singular.length)z[singular[0]]=Math.sqrt(Math.max(0,delta*delta-dot(z,z)));
  return {d:lift(z),lambda:base,hard:base>0,interior:base===0};
 }
 let lo=base,hi=Math.max(base+1,norm(g)/delta+Math.max(0,-e[0])+1);
 const at=l=>h.map((v,i)=>-v/(e[i]+l));
 while(norm(at(hi))>delta)hi=base+2*(hi-base);
 for(let i=0;i<110;i++){const mid=(lo+hi)/2;if(mid===lo||mid===hi)break;if(norm(at(mid))>delta)lo=mid;else hi=mid;}
 const d=lift(at(hi));return {d,lambda:hi,hard:false,interior:false};
}
function nuclearProx2(A,t){
 const B=mm(trans(A),A),eig=eigen2(B),out=[[0,0],[0,0]],sv=eig.values.map(v=>Math.sqrt(Math.max(v,0)));
 for(let k=0;k<2;k++){const s=sv[k];if(s<=t||s<1e-13)continue;const v=eig.vectors[k],Av=mv(A,v),fac=(s-t)/s;for(let i=0;i<2;i++)for(let j=0;j<2;j++)out[i][j]+=fac*Av[i]*v[j];}
 return {matrix:out,singular:sv,shrunk:sv.map(s=>Math.max(0,s-t))};
}
/* Mulberry32 one-step generator. State is part of algorithm history. */
function rng(seed){const state=(seed+0x6D2B79F5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return {state,value:((t^(t>>>14))>>>0)/4294967296};}
function lse(values,t=1){assert(t>0,'Temperature must be positive');const m=Math.max(...values);return m+t*Math.log(values.reduce((a,v)=>a+Math.exp((v-m)/t),0));}
function centralPoint(mu){assert(mu>0,'Barrier parameter must be positive');return 2*mu/(1+2*mu+Math.sqrt(1+4*mu*mu));}
function semismooth(p,x,lambda,t){
 const v=sub(x,scale(qgrad(p,x),t)),D=v.map(z=>lambda===0||Math.abs(z)>t*lambda?1:0),R=sub(x,softV(v,t*lambda));
 const J=p.Q.map((row,i)=>row.map((q,j)=>(i===j?1-D[i]:0)+t*D[i]*q));return {v,D,R,J};
}
function expFitData(which='noisy'){
 const ts=[0,.2,.4,.6,.8,1],noise=which==='exact'?[0,0,0,0,0,0]:[.05,-.04,.02,-.03,.04,-.02];
 const ys=ts.map((t,i)=>1.2*Math.exp(.8*t)+noise[i]);return {ts,ys};
}
function expFit(x,data){
 const r=data.ts.map((t,i)=>x[0]*Math.exp(x[1]*t)-data.ys[i]),J=data.ts.map(t=>[Math.exp(x[1]*t),x[0]*t*Math.exp(x[1]*t)]);
 return {r,J,value:.5*dot(r,r),g:mv(trans(J),r),H:mm(trans(J),J)};
}
return {EPS,assert,dot,add,sub,scale,norm,l1,clamp,eye,trans,mv,mm,madd,mscale,outer,frob,clone,solve,eigen2,rotatedQ,problem,qvalue,qgrad,lassoValue,soft,softV,groupSoft,projectSimplex,kktLasso,lassoOracle2,functions,finiteDifference,armijo,bfgsInverse,lbfgsDirection,trustRegion,nuclearProx2,rng,lse,centralPoint,semismooth,expFitData,expFit};
});
