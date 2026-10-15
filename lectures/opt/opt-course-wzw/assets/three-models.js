/* Pure mathematical geometry. Coordinates are [first variable, second variable, objective].
 * Meshes are illustrations; analytic identities and the 2D companions remain the proof. */
(function(root){
'use strict';
const node=typeof module==='object'&&module.exports;
const nodeA=node?require('./animations.js').compute:null;
const nodeE=node?require('./lesson-experiments.js'):null;
const C={blue:'#225b9b',orange:'#af4d20',green:'#25735b',purple:'#7952a3',gray:'#657681'};
const number=(v,d)=>v===undefined?d:Number(v);
const lift=(p,f)=>[p[0],p[1],f(p[0],p[1])];
const sample=(f,a,b,n=80)=>Array.from({length:n+1},(_,i)=>{const x=a+(b-a)*i/n;return f(x);});
function base(key,title,objective,f,domain){return {key,title,objective,description:objective,domain,axisLabels:['x₁','x₂','f(x)'],surfaces:f?[{name:'目标函数',f,color:C.blue,opacity:.66}]:[],paths:[],points:[],planes:[],solids:[],arrows:[],metrics:[],data:{},note:'旋转只改变视角；有限采样的曲面不能证明全域不等式。精确公式和二维伴图保留。',scaleNote:'坐标均为数学原值；请结合轴刻度阅读高度和距离，不用透视图目测曲率。'};}
function point(m,p,label,color='blue'){m.points.push({position:p,label,color:C[color]||color});}
function path(m,ps,label,color='blue',dashed=false){m.paths.push({points:ps,label,color:C[color]||color,dashed});}
function arrow(m,a,b,label,color='purple'){m.arrows.push({from:a,to:b,label,color:C[color]});path(m,[a,b],label,color);point(m,b,label,color);}
function polygon(m,ps,label,color='green'){const faces=[];for(let i=1;i<ps.length-1;i++)faces.push([0,i,i+1]);m.solids.push({vertices:ps,faces,label,color:C[color],opacity:.3});}
function section(m,f,lo,hi){path(m,sample(x=>[x,0,f(x,0)],lo,hi),'原题截面 x₂=0','purple');m.section={axis:'y',value:0};}
function tangent(m,f,a,g,domain){const h=f(...a),fn=(x,y)=>h+g[0]*(x-a[0])+g[1]*(y-a[1]);m.surfaces.push({name:'支撑平面',f:fn,color:C.orange,opacity:.35,domain:domain||m.domain});return fn;}
function clipHalfspace(b,lo=-1,hi=4){const ps=[[lo,lo],[hi,lo],[hi,hi],[lo,hi]],out=[];for(let i=0;i<4;i++){const a=ps[i],c=ps[(i+1)%4],u=a[0]+a[1]-b,v=c[0]+c[1]-b;if(u<=0)out.push(a);if((u<=0)!==(v<=0)){const t=u/(u-v);out.push(a.map((x,j)=>x+t*(c[j]-x)));}}return out;}
function build(s={}){
 const A=nodeA||(root.ConvexAnimations&&root.ConvexAnimations.compute);
 const E=nodeE||(root.LessonExperiments&&root.LessonExperiments.math);
 const key=s.lessonId||s.key,step=Math.max(0,Math.floor(number(s.step,0))),k=Math.max(0,Math.min(30,Math.floor(number(s.k,s.step||0))));
 if(!A)throw new Error('ConvexAnimations must load before ConvexThreeModels');
 let m,f,v;
 if(key==='convex-chord'){
  v=number(s.value,.5);const a=A.chord(v);f=(x,y)=>x*x+y*y;m=base(key,'弦与凸曲面','F(x₁,x₂)=x₁²+x₂²；原题 f(x)=x² 是 x₂=0 截面。',f,[[-.4,2.4],[-1.4,1.4]]);section(m,f,0,2);point(m,[0,0,0],'端点 A');point(m,[2,0,4],'端点 B');if(step>=1)point(m,[a.x,0,0],'混合输入','gray');if(step>=2)point(m,[a.x,0,a.curve],'先混合输入再算值');if(step>=3){path(m,[[0,0,0],[2,0,4]],'同权重混合高度','orange');point(m,[a.x,0,a.height],'弦上的混合值','orange');}if(step>=4)path(m,[[a.x,0,a.curve],[a.x,0,a.height]],'Jensen gap','purple');m.data=a;m.metrics=[{label:'弦 − 曲面',value:a.gap}];m.note+=' 新增的 x₂² 是明确的二维推广，不改变原题截面。';
 }else if(key==='supporting-plane'){
  v=number(s.value,1);const a=A.supporting(v,-1);f=(x,y)=>(x*x+y*y)/2;m=base(key,'切线推广为支撑平面','F(x₁,x₂)=(x₁²+x₂²)/2；a=(滑块值,0)。',f,[[-2.2,2.2],[-2.2,2.2]]);section(m,f,-2.2,2.2);point(m,[v,0,v*v/2],'切点 a');if(step>=1)tangent(m,f,[v,0],[v,0]);if(step>=3){point(m,[-1,0,.5],'检验点');path(m,[[-1,0,a.line],[-1,0,.5]],'支撑差额','purple');}m.data={...a,tangent:(x,y)=>v*x-v*v/2,gap:(x,y)=>((x-v)**2+y*y)/2};m.note+=' 原题是一维切线；三维展示指定推广函数的真实切平面，差额为 ((x₁−a)²+x₂²)/2。';
 }else if(key==='gradient'||key==='newton'){
  f=(x,y)=>(x*x+8*y*y)/2;const isGD=key==='gradient';v=number(s.value,isGD?.125:1);const a=isGD?A.gradient(v,5):A.newton();const last=isGD?[0,0,1,2,3,5,5][Math.min(step,6)]:0,next=isGD?a.path[1]:a.start.map(x=>(1-v)*x);const all=isGD?a.path:[a.start,next],extentX=Math.max(3.5,...all.map(p=>Math.abs(p[0])*1.12)),extentY=Math.max(1.5,...all.map(p=>Math.abs(p[1])*1.12));m=base(key,isGD?'梯度法沿真实目标曲面迭代':'牛顿方向与阻尼步','f(x)=(x₁²+8x₂²)/2；H=diag(1,8)。',f,[[-extentX,extentX],[-extentY,extentY]]);point(m,[0,0,0],'最优点','green');const start=isGD?a.path[0]:a.start;point(m,lift(start,f),'起点','orange');
  if(isGD){if(last>0){path(m,a.path.slice(0,last+1).map(p=>lift(p,f)),'迭代点连线');point(m,lift(a.path[last],f),'当前迭代','purple');}if(step===1)arrow(m,[...start,0],[...next,0],'−α∇f 的底面位移');m.data={...a,visibleLast:last};}
  else{if(step>=1){path(m,[a.start,a.gd].map(p=>lift(p,f)),'安全梯度步','orange');point(m,lift(a.gd,f),'GD 终点','orange');}if(step>=2)path(m,[a.start,[0,0]].map(p=>lift(p,f)),'完整牛顿方向','gray',true);if(step>=3){path(m,[a.start,next].map(p=>lift(p,f)),'阻尼 Newton 端点连线');point(m,lift(next,f),'x+td');}m.data={...a,t:v,next,after:f(...next)};}
  m.note+=' 折线只连接离散迭代点；线段本身通常不在曲面上，也不是连续时间轨迹。底面箭头才是变量空间方向。';
 }else if(key==='projection'){
  v=number(s.value,2);const a=A.projection([3,4],v,[0,v]);f=(x,y)=>((x-3)**2+(y-4)**2)/2;const e=Math.max(5.5,v+.5);m=base(key,'距离碗与圆盘投影','min ½‖x−(3,4)‖²，约束 ‖x‖≤R；绿色圆盘在高度 0 的变量平面。',f,[[-e,e],[-e,e]]);const rim=sample(t=>[v*Math.cos(t),v*Math.sin(t),0],0,2*Math.PI,96);polygon(m,[[0,0,0],...rim],'可行圆盘');path(m,rim,'‖x‖=R','green');point(m,[3,4,0],'v=(3,4)','orange');if(step>=1){point(m,[...a.p,0],'投影 p');point(m,lift(a.p,f),'f(p)');path(m,[[...a.p,0],[...a.v,0]],'投影距离','orange');}if(step>=3&&a.distance>0){const t=[-.8,.6],ends=[-e,e].map(q=>[a.p[0]+q*t[0],a.p[1]+q*t[1],0]);path(m,ends,'支撑直线','green',true);arrow(m,[...a.p,0],[...a.v,0],'v−p 外法向','purple');}if(step>=4){point(m,[...a.z,0],'检验 z','purple');path(m,[[...a.p,0],[...a.z,0]],'可行检验方向','purple');}m.data=a;m.metrics=[{label:'投影距离',value:a.distance},{label:'(v−p)ᵀ(z−p)',value:a.vi}];m.note+=' 圆盘是二维可行集，不是球体；高度仅表示距离目标。法向条件须对所有可行 z 检验。';
 }else if(key==='kkt'){
  v=number(s.value,2);const a=A.kkt([2,2],v);f=(x,y)=>((x-2)**2+(y-2)**2)/2;m=base(key,'约束曲面与 KKT 平衡','min ½‖x−(2,2)‖²，x₁+x₂≤b。',f,[[-1,4],[-1,4]]);polygon(m,clipHalfspace(v).map(p=>[...p,0]),'可行半空间在窗口内的截面');const lo=Math.max(-1,v-4),hi=Math.min(4,v+1);if(lo<=hi){path(m,[[lo,v-lo,0],[hi,v-hi,0]],'约束边界','green');polygon(m,[[lo,v-lo,0],[hi,v-hi,0],[hi,v-hi,8],[lo,v-lo,8]],'边界竖直幕面（非额外约束）');}point(m,[2,2,0],'无约束中心','orange');if(step>=1){point(m,[...a.p,0],'约束最优 p');point(m,lift(a.p,f),'f(p)');}if(step>=2&&a.lambda>0){arrow(m,[...a.p,0],[a.p[0]+a.gradient[0],a.p[1]+a.gradient[1],0],'∇f(p)','blue');arrow(m,[...a.p,0],[2,2,0],'λ∇c(p)','purple');}m.data=a;m.metrics=[{label:'λ',value:a.lambda},{label:'c(p)',value:a.constraint},{label:'原始 = 对偶',value:a.primal}];m.note+=' 绿色竖直幕面只是标出 x₁+x₂=b；变量空间法向在底面，不是曲面法线。';
 }else if(key==='prox'){
  v=number(s.value,1);const a=A.proximal(v);f=(u,input)=>(u-input)**2/2+v*Math.abs(u);m=base(key,'软阈值：输入参数与最优解脊线','φ(u;v)=½(u−v)²+λ|u|；u 是决策变量，v 是输入参数，原题截面 v=2.4。',f,[[-3.2,3.2],[-3,3]]);m.axisLabels=['决策 u','输入参数 v','φ(u;v)'];m.section={axis:'y',value:2.4};
  const distance=(u,input)=>(u-input)**2/2;
  if(step<2)m.surfaces=[{name:'二次距离项',f:distance,color:C.orange,opacity:.66}];
  if(step===1)m.surfaces.push({name:'绝对值惩罚',f:(u,input)=>v*Math.abs(u),color:C.purple,opacity:.35});
  path(m,sample(u=>[u,2.4,(step<2?distance:f)(u,2.4)],-1,3.2),'原题 v=2.4 截面','purple');
  if(step>=4)point(m,[a.x,2.4,a.value],'当前输入的唯一最优 u');
  if(step>=5)path(m,sample(input=>{const u=A.soft(input,v);return[u,input,f(u,input)];},-3,3),'逐输入的 soft(v,λ) 最优脊线','green');
  m.data={...a,sectionInput:2.4,ridge:input=>A.soft(input,v)};m.note+=' v 不是本题要优化的变量；每个固定 v 的一维截面各有唯一最优 u。不可把整张曲面的最低点当成输入 2.4 的答案。';
 }else if(key==='admm'){
  v=number(s.value,1);const a=A.admm(8,v),n=step>=7?8:step===6?4:step===5?2:1,r=a.rounds[n-1];f=(x,z)=>((x-3)**2+(z+1)**2)/2;m=base(key,'ADMM 的联合目标与共识线','F(x,z)=½(x−3)²+½(z+1)²；可行性要求 x=z。',f,[[-1.5,3.5],[-1.5,3.5]]);m.axisLabels=['x','z','F(x,z)'];path(m,sample(q=>[q,q,f(q,q)],-1.5,3.5),'可行曲线 x=z','green');polygon(m,[[-1.5,-1.5,0],[3.5,3.5,0],[3.5,3.5,14],[-1.5,-1.5,14]],'共识约束幕面');point(m,[1,1,4],'精确共识最优','green');if(step>=1){const current=[r.x,step===1?r.oldZ:r.z];point(m,lift(current,f),step===1?'只更新 x':'当前 (x,z)');if(step>=2)path(m,a.rounds.slice(0,n).map(q=>lift([q.x,q.z],f)),'完成轮次的联合目标');m.data={...a,current,round:r,visibleRounds:n};}else m.data={...a,current:null,visibleRounds:0};m.metrics=[{label:'ρ',value:v},{label:'当前 r=x−z',value:step>=2?r.primal:null},{label:'当前 s=ρ(z−z旧)',value:step>=2?r.dual:null},{label:'λ=ρu',value:step>=3?r.lambda:0}];m.note+=' u 和 λ 是乘子，不能当成第三个原始坐标。不可行点的目标可小于 4；只看曲面下降不能判断收敛，二维伴图保留两种残差。';
 }else if(['m5-l4','m6-l3','m6-l4'].includes(key)){
  if(!E)throw new Error('LessonExperiments must load before lesson models');
  const t=number(s.t,s.value===undefined?(key==='m5-l4'?.01:key==='m6-l3'?.5:.25):s.value);
  if(!(t>0))throw new RangeError('步长必须为正');
  if(key==='m5-l4'){
   const raw=[[1,1]],scaled=[[1,10]];for(let i=0;i<k;i++){raw.push(E.preStep(raw.at(-1),t));scaled.push(E.preStep(scaled.at(-1),1,true));}const isScaled=s.variant==='scaled';f=isScaled?(x,y)=>(x*x+y*y)/2:(x,y)=>(x*x+100*y*y)/2;const ps=isScaled?scaled:raw;m=base(key,isScaled?'预条件后的圆碗':'原始病态二次碗',isScaled?'x=Dz，D=diag(1,0.1)；f(Dz)=½(z₁²+z₂²)，步长 1。':'f(x)=½(x₁²+100x₂²)，κ=100；当前原坐标步长 t='+t+'。',f,isScaled?[[-11,11],[-11,11]]:[[-1.3,1.3],[-1.3,1.3]]);m.axisLabels=isScaled?['z₁','z₂','f(Dz)']:['x₁','x₂','f(x)'];path(m,ps.map(p=>lift(p,f)),'当前坐标下的轨迹',isScaled?'purple':'blue');point(m,lift(ps.at(-1),f),'当前迭代');point(m,lift(ps[0],f),'同一物理起点','orange');m.data={raw,scaled,physical:scaled.at(-1).map((q,i)=>q*(i===0?1:.1)),variant:isScaled?'scaled':'raw',k,t};m.metrics=[{label:'κ',value:isScaled?1:100},{label:'当前目标',value:f(...ps.at(-1))}];m.note+=' 原始 x⁰=(1,1) 与 z⁰=(1,10) 是同一物理点；必须按坐标刻度比较，不能凭屏幕宽度推断条件数。';
  }else if(key==='m6-l3'){
   const xs=[0];for(let i=0;i<k;i++)xs.push(E.scalarStep(xs.at(-1),t));const x=xs.at(-1),next=E.scalarStep(x,t),q=u=>.5*(x-3)**2+(x-3)*(u-x)+(u-x)**2/(2*t)+Math.abs(u);f=(u,y)=>E.scalarF(u);m=base(key,'近端梯度：目标与上界薄片','F(u)=½(u−3)²+|u|；厚度不是优化变量。',f,[[-1,4],[-.55,.55]]);m.axisLabels=['u','展示厚度（非变量）','代价'];m.surfaces[0].resolution=60;m.surfaces.push({name:'上界 Qₜ',f:(u,y)=>q(u),color:C.orange,opacity:.32,resolution:60});section(m,f,-1,4);path(m,xs.map(u=>[u,0,E.scalarF(u)]),'PG 迭代','purple');point(m,[x,0,E.scalarF(x)],'当前点','purple');point(m,[next,0,q(next)],'Qₜ 极小点','orange');m.data={xs,x,next,t,k,q,v:x-t*(x-3)};m.note+=' Qₜ−F=(1/t−1)(u−x)²/2；t≤1 时才是全局上界。薄片不引入第二个变量。';
  }else{
   const xs=[[0,0]];for(let i=0;i<k;i++)xs.push(E.lassoStep(xs.at(-1),t));if(s.exact)xs.push([2,0]);const x=xs.at(-1),c=E.certificate(x),next=E.lassoStep(x,t),smooth=[x[0]-t*(x[0]-3),x[1]-2*t*(2*x[1]-.4)];f=(a,b)=>.5*(a-3)**2+.5*(2*b-.4)**2+Math.abs(a)+Math.abs(b);m=base(key,'Lasso：折脊、ISTA 与证书','F(x)=½(x₁−3)²+½(2x₂−0.4)²+|x₁|+|x₂|；x*=(2,0)。',f,[[-.5,3.5],[-1.5,1.5]]);m.surfaces[0].resolution=56;path(m,xs.map(p=>lift(p,f)),'ISTA 已完成轨迹');path(m,[x,smooth].map(p=>[...p,0]),'梯度子步','orange');path(m,[smooth,next].map(p=>[...p,0]),'软阈值子步','purple');point(m,lift(x,f),'当前 xᵏ');point(m,[2,0,2.58],'精确最优点','green');m.data={xs,x,next,smooth,certificate:c,k,t,exact:!!s.exact};m.metrics=[{label:'F(x)',value:c.primal},{label:'D(y)',value:c.dual},{label:'证书 gap',value:c.gap}];m.note+=' 对偶点 y 位于另一空间，不能放在原始曲面冒充 x；二维伴图保留对偶矩形与证书。有限网格不证明零间隙。';
  }
 }else throw new RangeError('未知三维教学模型: '+key);
 m.description=m.objective+' '+m.note;m.axisMapping='模型坐标 [第一变量, 第二变量, 目标高度]；引擎映射 [x, height, −y]。';return m;
}
const api={build,keys:['convex-chord','supporting-plane','projection','kkt','gradient','prox','newton','admm','m5-l4','m6-l3','m6-l4'],clipHalfspace,version:'1.0.0'};
if(node)module.exports=api;else root.ConvexThreeModels=api;
})(typeof window!=='undefined'?window:globalThis);
