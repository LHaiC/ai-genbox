/* Pure formula-level scenes for duality and first-order algorithms.
 * Every height is an explicitly named mathematical value, never an arbitrary decoration. */
(function(root){
'use strict';
const C={blue:'#225b9b',orange:'#af4d20',green:'#25735b',purple:'#7952a3',gray:'#657681'};
const counts={'m4-l1':7,'m4-l2':8,'m4-l3':9,'m4-l4':8,'m5-l1':8,'m5-l2':8,'m5-l3':7,'m5-l4':8,'m6-l1':8,'m6-l2':7,'m6-l3':10,'m6-l4':10};
const specs={
 'm4-l1':['共轭与 Fenchel 差额','斜率 / 混合权重',.5],
 'm4-l2':['对偶下界与误差证书','乘子 λ=4p',.25],
 'm4-l3':['Slater 与可达性','扰动 / 有限逼近程度',.5],
 'm4-l4':['KKT 与资源价格','资源上限 B=1+3p',1/3],
 'm5-l1':['下降引理与安全步长','步长 t=1/36+11p/36',3/11],
 'm5-l2':['凸光滑速率','迭代 k=1+round(11p)',4/11],
 'm5-l3':['强凸几何速率','迭代 k=1+round(60p)',0],
 'm5-l4':['模态与预条件','步长选择 p（按坐标系换算）',5/17],
 'm6-l1':['近端存在与唯一','近端步长 t=0.5+3p',.5],
 'm6-l2':['软阈值的三分支','步长 t=0.1+0.8p',.5],
 'm6-l3':['近端梯度上界与预算','步长 t=0.2+0.6p',.5],
 'm6-l4':['Lasso 更新与证书','迭代 / 正则化参数',0]
};
const stageNames={
 'm4-l1':['最紧支撑截距','Fenchel 差额','共轭凸性','次梯度给等号','等号给支撑','二次共轭峰值','绝对值共轭可行域'],
 'm4-l2':['非负乘子','可行性与乘子','下界链','最佳下界','对偶凹性','误差证书','配方消元','零间隙'],
 'm4-l3':['扰动集','开集与严格余量','最优边界点','支撑超平面','法向符号','Slater 失败反例','归一化支撑','有限最优乘子','原始不可达'],
 'm4-l4':['四组 KKT 条件','拉格朗日极小','互补松弛','强对偶等号链','逐项互补','驻点平衡','资源价格下界','值函数支撑斜率'],
 'm5-l1':['沿线段积分','线性预测余项','Lipschitz 控制','二次上界','梯度一步','充分下降','回溯检验','安全步长阈值'],
 'm5-l2':['下降量','凸性误差界','合并估计','距离平方','单步预算','望远镜求和','末次速率','迭代预算'],
 'm5-l3':['强凸唯一解','二次下界','梯度支配','误差收缩','几何速率','条件数代价','距离保证'],
 'm5-l4':['误差坐标','特征模态','稳定区间','最坏模态','平衡端点','距离与目标因子','换变量','原空间预条件'],
 'm6-l1':['有限比较点','仿射下界','强制性','存在与唯一','近端最优性','单调性','牢固非扩张','投影特例'],
 'm6-l2':['坐标可分','统一最优性','正分支','负分支','零区间','分段拼合','平方惩罚对比'],
 'm6-l3':['复合上界','配方更新','新点次梯度','两项凸性界','三点不等式','完整目标下降','距离预算','末次速率','固定点','投影梯度'],
 'm6-l4':['光滑曲率','ISTA 一步','坐标最优性','残差等式','残差消元','对偶约束','强对偶','缩放成可行点','间隙证书','零解阈值']
};
const catalog=Object.fromEntries(Object.entries(counts).map(([id,n])=>[id,{title:specs[id][0],proofCount:n,parameter:{min:0,max:1,step:.01,value:specs[id][2],label:specs[id][1]},stages:stageNames[id]}]));
const sample=(fn,a,b,n=64)=>Array.from({length:n+1},(_,i)=>fn(a+(b-a)*i/n));
const soft=(v,a)=>Math.sign(v)*Math.max(0,Math.abs(v)-a);
const sq=p=>p.reduce((s,x)=>s+x*x,0);
function base(id,i,title,objective,f,domain,axes){return {key:id+'-proof-'+i,lessonId:id,proofIndex:i,title,objective,description:objective,domain,axisLabels:axes||['x₁','x₂','目标值'],surfaces:f?[{name:'目标函数',f,color:C.blue,opacity:.6}]:[],points:[],paths:[],planes:[],solids:[],arrows:[],metrics:[],data:{},note:'有限窗口中的具体例子用于解释公式，不能代替全域证明。',scaleNote:'坐标为数学原值；一维薄片的展示厚度不是第二个优化变量。',axisMapping:'模型坐标 [第一变量, 第二变量, 目标高度]；引擎映射 [x, height, −y]。'};}
const point=(m,p,label,c='blue')=>m.points.push({position:p,label,color:C[c]});
const path=(m,ps,label,c='purple',dashed=false)=>m.paths.push({points:ps,label,color:C[c],dashed});
const surf=(m,f,name,c='orange')=>m.surfaces.push({name,f,color:C[c],opacity:.32});
function polygon(m,vertices,label){m.solids.push({vertices,faces:Array.from({length:vertices.length-2},(_,i)=>[0,i+1,i+2]),label,color:C.green,opacity:.24});}
function arrow(m,a,b,label){m.arrows.push({from:a,to:b,label,color:C.purple});path(m,[a,b],label);}
function metric(m,label,value){m.metrics.push({label,value});}
function thin(id,i,title,objective,f,lo,hi){const m=base(id,i,title,objective,(x,y)=>f(x),[[lo,hi],[-.3,.3]],['变量','展示厚度（非变量）','代价']);path(m,sample(x=>[x,0,f(x)],lo,hi),'精确一维截面','blue');return m;}
function get(id,index=0,parameter){
 if(!counts[id])return null;
 const i=Math.max(0,Math.min(counts[id]-1,Math.floor(Number(index)||0))),p=Math.max(0,Math.min(1,parameter!==undefined&&Number.isFinite(Number(parameter))?Number(parameter):specs[id][2]));
 let m;
 if(id==='m4-l1'){
  const y=1+4*p,x=i===3||i===4?y:2;
  if(i===6){const slope=1+2*p,extent=2+6*p,h=u=>2*Math.abs(u);m=thin(id,i,'绝对值共轭：斜率可行域','h(u)=2|u|；|y|≤2 时 h*(y)=0，|y|>2 时为 +∞。',h,-extent,extent);surf(m,(u)=>slope*u,'线性收益 yu');path(m,sample(u=>[u,0,slope*u-h(u)],-extent,extent),'yu−h(u)','purple');m.data={slope,conjugateFinite:slope<=2,conjugate:slope<=2?0:Infinity,escapeSlope:slope-2};metric(m,'斜率 y',slope);metric(m,'正半轴收益增长率 y−2',slope-2);m.note+=' +∞ 不画成有限高度；沿 u→+∞ 的增长率 y−2>0 才证明无界。';
  }else if(i===2){m=thin(id,i,'共轭的凸性：斜率空间','f*(y)=y²/2；斜率 y 现在是横轴。',u=>u*u/2,-1,5);const a=1,b=4,z=(1-p)*a+p*b,h=(1-p)*a*a/2+p*b*b/2;path(m,[[a,0,a*a/2],[b,0,b*b/2]],'共轭图像的弦','orange');path(m,[[z,0,z*z/2],[z,0,h]],'凸性差额');point(m,[z,0,z*z/2],'f*(混合斜率)');m.axisLabels[0]='斜率 y';m.data={theta:p,z,gap:h-z*z/2};metric(m,'弦 − 共轭',m.data.gap);
  }else{const f=u=>u*u/2,b=y*y/2;m=thin(id,i,'共轭与 Fenchel 差额','f(u)=u²/2；f*(y)=y²/2；最紧仿射下界 yu−y²/2。',f,-1,5);surf(m,u=>y*u-b,'斜率固定的最紧下界');point(m,[y,0,f(y)],'相切点 u=y','green');point(m,[x,0,f(x)],'检验位置 x');path(m,[[x,0,y*x-b],[x,0,f(x)]],'Fenchel 差额');if(i===5)path(m,sample(u=>[u,0,y*u-f(u)],-1,5),'yu−f(u)，峰值 f*(y)','purple');m.data={x,y,conjugate:b,fenchelGap:(x-y)**2/2,supportGap:u=>(u-y)**2/2};metric(m,'斜率 y',y);metric(m,'f*(y)',b);metric(m,'Fenchel 差额',m.data.fenchelGap);}
 }else if(id==='m4-l2'){
  const lambda=4*p,x=i===7?1:1.1,g=lambda-lambda*lambda/4,L=u=>u*u+lambda*(1-u);
  if(i===3||i===4){m=thin(id,i,'对偶函数是凹下界族','g(λ)=λ−λ²/4，λ≥0；p*=1。',v=>v-v*v/4,0,4);m.axisLabels[0]='乘子 λ';surf(m,()=>1,'原始最优值 p*=1','green');point(m,[lambda,0,g],'当前对偶下界');if(i===4)path(m,[[0,0,0],[4,0,0]],'端点弦低于凹函数','orange');
  }else{m=thin(id,i,'弱对偶：可核查的下界链','min x²，x≥1；L(x,λ)=x²+λ(1−x)，λ≥0。',u=>u*u,-.5,3);surf(m,L,'拉格朗日 L');surf(m,()=>g,'精确内层下确界 g(λ)','green');point(m,[lambda/2,0,g],'内层极小点 x=λ/2','green');point(m,[x,0,x*x],'原始可行候选','blue');path(m,[[x,0,g],[x,0,L(x)],[x,0,x*x]],'g ≤ L ≤ f','orange');path(m,[[1,0,0],[3,0,0]],'原始可行域 x≥1','green');}
  m.data={lambda,x,dual:g,lagrangian:L(x),primal:x*x,optimal:1,gap:x*x-g,actualError:x*x-1,innerMinimizer:lambda/2};metric(m,'λ（非负）',lambda);metric(m,'可行目标 − 对偶下界',m.data.gap);metric(m,'实际误差',m.data.actualError);m.note+=' g 由全实数上的配方精确求出，不是把近似内层值冒充下界。本例无等式约束；自由等式乘子的一般结论仍依赖正文。';
 }else if(id==='m4-l3'){
  if(i===8){const x=-1-7*p;m=thin(id,i,'原始不可达：指数函数','无约束 min exp(x)：下确界 0，但每个有限 x 都有 exp(x)>0。',Math.exp,-9,1);surf(m,()=>0,'下确界（不被达到）','green');point(m,[x,0,Math.exp(x)],'有限候选');m.data={x,value:Math.exp(x),infimum:0,attained:false};metric(m,'有限点的正目标',Math.exp(x));
  }else if(i===5){const lambda=.25+9.75*p,g=-1/(4*lambda),x=-1/(2*lambda);m=thin(id,i,'没有 Slater：强对偶但乘子不可达','min x，x²≤0；g(λ)=−1/(4λ)<0 对每个有限 λ>0。',u=>u+lambda*u*u,-2,1);surf(m,()=>0,'原始值 p*=0','green');point(m,[x,0,g],'内层极小值','orange');point(m,[0,0,0],'唯一原始可行点','green');m.data={lambda,dual:g,primal:0,dualGap:-g,dualAttained:false};metric(m,'有限 λ',lambda);metric(m,'0−g(λ)',-g);m.note+=' 这是正文反例 B；Slater 失败不等于一定有正对偶间隙。λ→∞ 才逼近 0。';
  }else{const v=u=>Math.max(0,1-u)**2,u=-.5+2*p,eps=.1+.5*p;m=base(id,i,'Slater 的扰动几何（无等式特例）','min x²，1−x≤u；V(u)=max(0,1−u)²，支撑式 r+2u≥1。',(a,b)=>v(a),[[-1,2],[-.35,.35]],['约束放宽 u','展示厚度（无等式）','目标上界 r']);surf(m,(a)=>1-2*a,'支撑超平面 r=1−2u','orange');point(m,[0,0,1],'边界 (0,p*)','green');point(m,[u,0,v(u)+eps],'严格上界 r>V(u)');path(m,[[u,0,v(u)],[u,0,v(u)+eps]],'开集严格余量');m.data={u,r:v(u)+eps,boundary:v(u),lambda:2,gamma:1,separationSlack:v(u)+eps+2*u-1,strictWitness:2};metric(m,'支撑式 r+2u−1',m.data.separationSlack);metric(m,'归一化乘子 λ',2);m.note+=' 仅展示无等式、单约束特例的扰动集边界；曲面本身属于闭包，严格上方才是开集 S。不能由这个有限图推出一般分离定理或满行秩条件。';}
 }else if(id==='m4-l4'){
  const B=1+3*p,x=B<2?[B,0]:B<4?[(B+2)/2,(B-2)/2]:[3,1],lambda=B<2?3-B:B<4?(4-B)/2:0,eta=[0,Math.max(0,2-B)],f=(a,b)=>((a-3)**2+(b-1)**2)/2,value=f(...x);
  if(i>=6){const V=b=>b<2?((b-3)**2+1)/2:b<4?(4-b)**2/4:0;m=thin(id,i,'KKT 价格与资源敏感性','V(B)；−λ* 是最优值函数的支撑斜率。',V,0,5);surf(m,b=>value-lambda*(b-B),'价格给出的全局下界');point(m,[B,0,value],'当前资源量 B','green');m.axisLabels[0]='资源上限 B';
  }else{m=base(id,i,'原题 KKT：非负三角形与互补松弛','min ½[(x₁−3)²+(x₂−1)²]，x₁+x₂≤B，x₁,x₂≥0。',f,[[-.5,4.5],[-.5,4.5]]);polygon(m,[[0,0,0],[B,0,0],[0,B,0]],'可行三角形');path(m,[[B,0,0],[0,B,0]],'总量上限','green');point(m,[...x,value],'KKT 最优点','green');point(m,[3,1,0],'无约束中心','orange');arrow(m,[...x,0],[x[0]+x[0]-3,x[1]+x[1]-1,0],'∇f');arrow(m,[...x,0],[x[0]+lambda,x[1]+lambda-eta[1],0],'λ(1,1)−η');if(i===1)surf(m,(a,b)=>f(a,b)+lambda*(a+b-B)-eta[1]*b,'最优乘子的拉格朗日函数');}
  const residual=[x[0]-3+lambda-eta[0],x[1]-1+lambda-eta[1]];m.data={B,x,lambda,eta,value,stationarity:residual,complementarity:[lambda*(x[0]+x[1]-B),-eta[0]*x[0],-eta[1]*x[1]],dual:value};metric(m,'B',B);metric(m,'资源乘子 λ',lambda);metric(m,'第二个非负约束乘子 η₂',eta[1]);metric(m,'驻点残量范数',Math.hypot(...residual));m.note+=' B=2 时 x₂=0 是活跃约束，但 η₂=0。三角形是原题可行域，不能替换为仅一个半空间。';
 }else if(id==='m5-l1'){
  const t=1/36+p*(1/3-1/36),f=(x,y)=>(x*x+9*y*y)/2,start=[3,1],g=[3,9],next=[3-3*t,1-9*t],upper=9-t*(1-9*t/2)*90;
  m=base(id,i,'下降引理：原题 L=9 的二次上界','f(x)=½x₁²+9x₂²/2；x⁰=(3,1)，g=(3,9)。',f,[[-1,4],[-2.6,2]]);const q=(x,y)=>9+3*(x-3)+9*(y-1)+4.5*((x-3)**2+(y-1)**2);if(i<=3)surf(m,q,'L=9 的全局二次上界');point(m,[...start,9],'当前点');point(m,[...next,f(...next)],'梯度新点','green');path(m,[start,next].map(x=>[...x,f(...x)]),'离散一步','orange');if(i>=4)point(m,[...next,upper],'下降引理的上界','orange');m.data={t,L:9,start,g,next,before:9,after:f(...next),upper,armijoC:.5,armijoPass:f(...next)<=9-.5*t*90,safe:t<=1/9,stable:t<2/9};metric(m,'步长 t',t);metric(m,'实际新目标',f(...next));metric(m,'理论上界',upper);m.note+=' 该例曲率为 9，不能用其他动画的 8。t≤1/9 保证常用充分下降；t≥2/9 不再处于严格稳定区间。折线只连接离散端点。';
 }else if(id==='m5-l2'){
  const k=1+Math.round(p*11),t=1/8,x=3/2**k,delta=18/4**k,D=9/4**k,previousD=9/4**(k-1),sum=6*(1-4**(-k));
  if(i>=4){m=base(id,i,'距离预算如何变成末次速率','f(x)=2x²，t=1/8；Δₖ=18/4ᵏ，通用界 36/k。',null,[[1,12],[-.3,.3]],['迭代 k','展示厚度','误差 / 上界']);path(m,sample(j=>[j,0,36/j],1,12),'一般凸界 36/k','orange');path(m,Array.from({length:12},(_,j)=>[j+1,0,18/4**(j+1)]),'实际误差','blue');point(m,[k,0,delta],'当前实际误差');point(m,[k,0,36/k],'保守上界','orange');
  }else{m=thin(id,i,'梯度下降与距离平方预算','f(x)=2x²，x⁰=3，t=1/8；xᵏ=3/2ᵏ。',u=>2*u*u,-.5,3.2);path(m,Array.from({length:k+1},(_,j)=>[3/2**j,0,18/4**j]),'精确迭代轨迹');point(m,[x,0,delta],'当前迭代');}
  m.data={k,t,x,delta,bound:36/k,D,previousD,oneStepBudget:(previousD-D)/(2*t),sum,telescopingBudget:(9-D)/(2*t)};metric(m,'迭代 k',k);metric(m,'实际 Δₖ',delta);metric(m,'末次通用界 36/k',36/k);metric(m,'累计实际误差',sum);m.note+=' 本例也强凸，实际几何下降比仅利用凸性的 O(1/k) 保证快。速率曲线的横轴是迭代次数，不是优化变量。';
 }else if(id==='m5-l3'){
  const k=1+Math.round(60*p),x=[5*(24/25)**k,0],f=(a,b)=>(a*a+25*b*b)/2,delta=f(...x),bound=25*(24/25)**k;
  if(i>=3){m=base(id,i,'强凸误差的几何包络','μ=1，L=25；实际 Δₖ=12.5(24/25)²ᵏ，保证 25(24/25)ᵏ（k≥1）。',null,[[0,61],[-.3,.3]],['迭代 k','展示厚度','目标误差']);path(m,sample(j=>[j,0,25*(24/25)**j],0,61),'通用线性界','orange');path(m,[[0,0,25],...Array.from({length:61},(_,j)=>[j+1,0,12.5*(24/25)**(2*(j+1))])],'实际目标误差','blue');point(m,[k,0,delta],'当前误差');
  }else{m=base(id,i,'强凸二次下界与唯一最优','f(x)=½x₁²+25x₂²/2，μ=1，L=25。',f,[[-1,6],[-1.5,1.5]]);const a=[5,1],g=[5,25];surf(m,(u,v)=>25+g[0]*(u-5)+g[1]*(v-1)+((u-5)**2+(v-1)**2)/2,'μ=1 的二次下界');point(m,[0,0,0],'唯一最优点','green');point(m,[...x,delta],'当前迭代');path(m,[[...a,25],[4.8,0,11.52]],'第一步');}
  m.data={k,x,mu:1,L:25,kappa:25,delta,bound,distance:Math.hypot(...x),distanceBound:Math.sqrt(50)*(24/25)**(k/2),gradientSquared:x[0]**2};metric(m,'迭代 k',k);metric(m,'实际误差',delta);metric(m,'通用误差保证',bound);m.note+=' 不把一般界当作实际递推；第 1 步为 (4.8,0)，目标 11.52，而通用界为 24。';
 }else if(id==='m5-l4'){
  const scaled=i>=6,t=scaled?.5+1.7*p:.005+.017*p,k=i===5?8:3,f=scaled?(x,y)=>(x*x+y*y)/2:(x,y)=>(x*x+100*y*y)/2,start=scaled?[1,10]:[1,1],xs=[start];for(let j=0;j<k;j++)xs.push(scaled?xs[j].map(a=>(1-t)*a):[(1-t)*xs[j][0],(1-100*t)*xs[j][1]]);const e=scaled?Math.max(11,...xs.flat().map(a=>1.1*Math.abs(a))):Math.max(1.4,...xs.flat().map(Math.abs));m=base(id,i,scaled?'预条件：同一物理点的坐标变化':'条件数：快慢模态与稳定区间',scaled?'D=diag(1,0.1)，x=Dz，DᵀQD=I；z⁰=(1,10)。':'Q=diag(1,100)，e⁺=(I−tQ)e，稳定区间 0<t<0.02。',f,[[-e,e],[-e,e]]);m.axisLabels=scaled?['z₁','z₂','f(Dz)']:['x₁','x₂','f(x)'];path(m,xs.map(x=>[...x,f(...x)]),'精确离散轨迹');point(m,[...start,f(...start)],'同一物理起点','orange');point(m,[...xs.at(-1),f(...xs.at(-1))],'最后迭代','green');const rho=Math.max(Math.abs(1-t),Math.abs(1-100*t));m.data={scaled,t,k,xs,rho:scaled?Math.abs(1-t):rho,physical:scaled?xs.at(-1).map((a,j)=>a*(j===0?1:.1)):xs.at(-1),optimalStep:2/101,optimalRho:99/101,stable:scaled?t<2:t<.02};metric(m,'步长 t',t);metric(m,'距离模态因子 ρ',m.data.rho);metric(m,'目标最坏因子 ρ²',m.data.rho**2);m.note+=' 原始步长滑块可越过稳定边界；缩放图步长为 0.5+1.7p，默认 t=1；新稳定区间为 0<t<2。原始 x⁰=(1,1) 与 z⁰=(1,10) 是同一个物理点，屏幕宽度不能用于比较条件数。';
 }else if(id==='m6-l1'){
  const t=.5+3*p,v=6,u=v/(1+t),J=x=>x*x/2+(x-v)**2/(2*t);
  if(i===7){const f=(x,y)=>((x+2)**2+(y-3)**2)/(2*t);m=base(id,i,'示性函数的近端就是正交锥投影','v=(−2,3)，C=R²₊；投影 p=(0,3)，v−p=(−2,0)。',f,[[-3,4],[-1,5]]);polygon(m,[[0,0,0],[4,0,0],[4,5,0],[0,5,0]],'可行正交锥的窗口');point(m,[-2,3,0],'输入 v','orange');point(m,[0,3,f(0,3)],'唯一投影','green');arrow(m,[0,3,0],[-2,3,0],'外法向 v−p');m.data={t,v:[-2,3],u:[0,3],normal:[-2,0],normalPairing:z=>-2*z[0]};
  }else{m=thin(id,i,'近端存在、唯一与稳定性','h(u)=u²/2，v=6；J(u)=u²/2+(u−6)²/(2t)。',J,-1,7);surf(m,x=>(x-v)**2/(2*t),'由 h≥0 得到的强制下界','orange');point(m,[u,0,J(u)],'唯一近端点','green');point(m,[0,0,J(0)],'比较点 0');point(m,[6,0,J(6)],'输入点 6','orange');const z=3,w=z/(1+t);if(i>=5){point(m,[w,0,J(w)],'另一输入的近端位置 w','purple');path(m,[[w,0,0],[u,0,0]],'近端输出距离');}m.data={t,v,u,value:J(u),otherInput:z,otherProx:w,outputDistanceSquared:(u-w)**2,firmInnerProduct:(u-w)*(v-z),optimality:u+(u-v)/t};metric(m,'步长 t',t);metric(m,'近端点 u',u);metric(m,'J(u)',J(u));if(i>=5)metric(m,'牢固非扩张余量',(u-w)*(v-z)-(u-w)**2);m.note+=' 二次 h 的有限示例不证明一般适当闭凸函数的仿射下界定理；存在性和唯一性仍由正文给出的强制性、闭性、强凸性证明。';}
 }else if(id==='m6-l2'){
  const t=.1+.8*p,lambda=1,v=i===3?-2:i===4?-.4:i===2?3:3-6*p,u=soft(v,t),J=(a,b)=>Math.abs(a)+(a-b)**2/(2*t);m=base(id,i,'软阈值三分支与最优性平衡','J(u;v)=|u|+(u−v)²/(2t)，λ=1；v 是输入参数而不是共同优化变量。',J,[[-3.5,3.5],[-3.5,3.5]],['决策 u','输入参数 v','J(u;v)']);path(m,sample(b=>{const a=soft(b,t);return[a,b,J(a,b)];},-3.5,3.5),'每个固定输入的最优脊线','green');path(m,sample(a=>[a,v,J(a,v)],-3.5,3.5),'当前输入截面','purple');point(m,[u,v,J(u,v)],'当前唯一近端点','green');if(i===6)path(m,sample(b=>{const a=b/(1+t);return[a,b,J(a,b)];},-3.5,3.5),'平方惩罚的解位置（高度仍按 J）','orange');const inputs=[3,-.4,1,-2],outputs=inputs.map(x=>soft(x,t)),s=(v-u)/t;m.data={t,lambda,v,u,subgradient:s,optimality:s+(u-v)/t,inputs,outputs,total:outputs.reduce((a,x,j)=>a+Math.abs(x)+(x-inputs[j])**2/(2*t),0)};if(i===0)inputs.forEach((b,j)=>point(m,[outputs[j],b,J(outputs[j],b)],'第 '+(j+1)+' 坐标的近端解','green'));metric(m,'四坐标近端目标',m.data.total);metric(m,'阈值 tλ',t);metric(m,'输入 v',v);metric(m,'输出 u',u);metric(m,'合法次梯度 (v−u)/t',s);m.note+=' 零区间包含两个端点。比较曲线只比较解的位置，不把平方惩罚解误标成绝对值目标的最优解。';
 }else if(id==='m6-l3'){
  const t=.2+.6*p,k=i>=6?3:0,x=2*(1-(1-t)**k),next=soft(x-t*(x-3),t),F=u=>(u-3)**2/2+Math.abs(u),q=u=>(x-3)**2/2+(x-3)*(u-x)+(u-x)**2/(2*t)+Math.abs(u),G=(x-next)/t,s=G-(x-3);
  if(i===9){const v=4*p,old=[v,1],t0=.5,f=(a,b)=>((a+2)**2+(b-3)**2)/2,smooth=[v-t0*(v+2),2],projected=smooth.map(a=>Math.max(0,a));m=base(id,i,'近端梯度恢复投影梯度','示例：f(x)=½‖x−(−2,3)‖²，C=R²₊，t=0.5。',f,[[-3,4],[-1,4]]);polygon(m,[[0,0,0],[4,0,0],[4,4,0],[0,4,0]],'可行域窗口');path(m,[old,smooth,projected].map(a=>[...a,0]),'梯度子步，再投影');point(m,[...projected,f(...projected)],'可行新点','green');m.data={old,smooth,projected,t:t0};m.note+=' 此处明确换为投影特例；前面的绝对值例子并没有非负约束。';
  }else{m=thin(id,i,'近端梯度：上界、次梯度与误差预算','F(u)=½(u−3)²+|u|；F*=2.5，x*=2。',F,-1,4);surf(m,u=>q(u),'保留 |u| 的上界 Qₜ');point(m,[x,0,F(x)],'当前 x');point(m,[next,0,F(next)],'新点 x⁺','green');point(m,[next,0,q(next)],'Qₜ 极小值','orange');path(m,[[x,0,F(x)],[next,0,F(next)]],'离散迭代');if(i===8){point(m,[2,0,2.5],'固定点，光滑梯度 −1','green');}m.data={t,k,x,next,F:F(x),nextF:F(next),q,G,s,modelGap:u=>(1/t-1)*(u-x)**2/2,budget:((x-2)**2-(next-2)**2)/(2*t),gap:F(next)-2.5,rate:4/(2*t*(k+1))};metric(m,'t≤1/L',t);metric(m,'完整目标 F(x⁺)',F(next));metric(m,'新点次梯度 s',s);metric(m,'梯度映射 Gₜ',G);metric(m,'距离预算',m.data.budget);m.note+=' Qₜ−F=(1/t−1)(u−x)²/2≥0。s 属于新点 x⁺ 的次梯度，Gₜ 不应误称为旧点 F 的次梯度。';}
 }else if(id==='m6-l4'){
  const k=1+Math.round(11*p),t=.25,lambda=i===9?.2+3.8*p:1,f=(x,y)=>(x-3)**2/2+(2*y-.4)**2/2+lambda*(Math.abs(x)+Math.abs(y)),xs=[[0,0]];for(let j=0;j<k;j++){const a=xs[j];xs.push([soft(a[0]-t*(a[0]-3),t*lambda),soft(a[1]-2*t*(2*a[1]-.4),t*lambda)]);}const x=xs.at(-1),r=[3-x[0],.4-2*x[1]],M=Math.max(Math.abs(r[0]),Math.abs(2*r[1])),alpha=M<=lambda?1:lambda/M,y=r.map(a=>alpha*a),D=(a,b)=>3*a+.4*b-(a*a+b*b)/2,primal=f(...x),dual=D(...y),exact=[soft(3,lambda),soft(.8,lambda)/4];
  if(i>=4&&i<=8){m=base(id,i,'Lasso 对偶：可行残差与证书','D(y)=3y₁+0.4y₂−½‖y‖²；|y₁|≤λ，|y₂|≤λ/2。',D,[[-1.5*lambda,1.5*lambda],[-lambda,lambda]],['对偶 y₁','对偶 y₂','D(y)']);polygon(m,[[-lambda,-lambda/2,0],[lambda,-lambda/2,0],[lambda,lambda/2,0],[-lambda,lambda/2,0]],'对偶可行矩形');path(m,[[-lambda,-lambda/2,D(-lambda,-lambda/2)],[lambda,-lambda/2,D(lambda,-lambda/2)],[lambda,lambda/2,D(lambda,lambda/2)],[-lambda,lambda/2,D(-lambda,lambda/2)],[-lambda,-lambda/2,D(-lambda,-lambda/2)]],'约束边界端点（线段非曲面）','green');point(m,[...y,dual],'缩放后的合法下界','green');surf(m,()=>primal,'当前原始上界 F(x)','orange');path(m,[[...y,dual],[...y,primal]],'原始—对偶证书 gap');
  }else{m=base(id,i,'Lasso：原题曲率、ISTA 与稀疏阈值','A=diag(1,2)，b=(3,0.4)，L=4；F=½‖Ax−b‖²+λ‖x‖₁。',f,[[-.5,3.5],[-1,1]]);path(m,xs.map(a=>[...a,f(...a)]),'ISTA 离散轨迹');point(m,[...x,primal],'当前点');point(m,[...exact,f(...exact)],'精确最优点','green');}
  m.data={k,t,lambda,x,r,M,alpha,y,primal,dual,gap:primal-dual,dualNorm:Math.max(Math.abs(y[0]),Math.abs(2*y[1])),exact,optimal:f(...exact),zeroThreshold:3};metric(m,'λ',lambda);metric(m,'原始 F(x)',primal);metric(m,'合法对偶 D(y)',dual);metric(m,'证书 gap',primal-dual);metric(m,'‖Aᵀy‖∞',m.data.dualNorm);m.note+=' 原始 x 与对偶 y 属于不同空间，轴标签明确区分。证书用解析目标及已验证的对偶约束计算，不能由曲面采样判断零间隙。';
 }
 m.title=stageNames[id][i]+' · '+m.title;m.parameter=p;m.description=m.objective+' '+m.note;return m;
}
const api={get,catalog,version:'1.0.0'};
if(typeof module==='object'&&module.exports)module.exports=api;else root.FormulaModelsAlgorithms=api;
})(typeof window!=='undefined'?window:globalThis);
