/* Original, computed teaching scenes. No textbook images or remote dependencies. */
(function (root) {
  'use strict';
  const finite = (x) => { if (!Number.isFinite(x)) throw new TypeError('需要有限实数'); return x; };
  const nonnegative = (x) => { finite(x); if (x < 0) throw new RangeError('参数须非负'); return x; };
  const integer = (x) => { finite(x); if (!Number.isInteger(x) || x < 0) throw new RangeError('轮数须为非负整数'); return x; };
  const vector = (v) => { if (!Array.isArray(v) || v.length !== 2) throw new TypeError('需要二维向量'); v.forEach(finite); return v; };
  const dot = (a,b) => a.reduce((s,x,i) => s+x*b[i],0);
  const sub = (a,b) => a.map((x,i)=>x-b[i]);
  const norm2 = (v) => dot(v,v);
  const scale = (v,a) => v.map(x=>x*a);
  const fmt = (x) => Math.abs(x)<0.0000001 ? '0' : String(Number(x.toFixed(4)));
  const pair = (p) => '('+p.map(fmt).join(', ')+')';
  const texPair = (p) => '\\begin{pmatrix}'+p.map(fmt).join('\\\\')+'\\end{pmatrix}';
  const escape = (s) => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function chord(theta=.5) {
    finite(theta); if(theta<0||theta>1) throw new RangeError('权重须在 [0,1] 内');
    const x=2*theta, curve=x*x, height=4*theta;
    return {theta,x,curve,height,gap:height-curve};
  }
  function supporting(a=1,x=-1) {
    finite(a); finite(x);
    return {a,x,value:x*x/2,at:a*a/2,slope:a,line:a*x-a*a/2,gap:(x-a)*(x-a)/2};
  }
  function projection(v=[3,4],radius=2,z=[0,2]) {
    vector(v); vector(z); nonnegative(radius);
    const length=Math.hypot(...v), p=length<=radius?v.slice():scale(v,radius/length), residual=sub(v,p);
    return {v:v.slice(),radius,p,z:z.slice(),length,residual,distance:Math.hypot(...residual),
      vi:dot(residual,sub(z,p)),distance2:norm2(sub(v,z)),split:norm2(residual)+norm2(sub(p,z))};
  }
  function kkt(center=[2,2],b=2) {
    vector(center); finite(b);
    const lambda=Math.max(0,(center[0]+center[1]-b)/2), p=center.map(x=>x-lambda), gradient=sub(p,center), constraint=p[0]+p[1]-b;
    const primal=norm2(gradient)/2,dual=lambda*(center[0]+center[1]-b)-lambda*lambda;
    return {center:center.slice(),b,p,lambda,gradient,normal:[1,1],constraint,complementarity:lambda*constraint,primal,dual,stationarity:gradient.map(x=>x+lambda)};
  }
  function gradient(alpha=.125,iterations=5,start=[2.5,1]) {
    finite(alpha); if(alpha<=0) throw new RangeError('步长须为正'); integer(iterations); vector(start);
    const path=[start.slice()], objective=p=>(p[0]*p[0]+8*p[1]*p[1])/2;
    for(let k=0;k<iterations;k++) path.push([path[k][0]*(1-alpha),path[k][1]*(1-8*alpha)]);
    const g=[start[0],8*start[1]], values=path.map(objective), bound=values[0]-alpha*(1-4*alpha)*norm2(g);
    return {alpha,L:8,mu:1,path,values,g,bound,safe:alpha<=1/8,converges:alpha<1/4,factors:[1-alpha,1-8*alpha],factor:Math.max(Math.abs(1-alpha),Math.abs(1-8*alpha))};
  }
  function soft(v,lambda) {finite(v);nonnegative(lambda);return Math.sign(v)*Math.max(Math.abs(v)-lambda,0);}
  function proximal(lambda=1,v=2.4) {
    finite(v);nonnegative(lambda);const x=soft(v,lambda),s=x===0?(lambda===0?0:v/lambda):Math.sign(x);
    return {lambda,v,x,s,candidate:v-lambda,value:(x-v)*(x-v)/2+lambda*Math.abs(x),zero:v*v/2,
      stationarity:x-v+lambda*s,inputs:[-2.4,-.6,.4,2.4],outputs:[-2.4,-.6,.4,2.4].map(y=>soft(y,lambda))};
  }
  function newton(start=[3,1]) {
    vector(start);const H=[1,8],g=start.map((x,i)=>x*H[i]),d=g.map((x,i)=>-x/H[i]),next=start.map((x,i)=>x+d[i]),gd=start.map((x,i)=>x-g[i]/8);
    const objective=p=>(p[0]*p[0]+8*p[1]*p[1])/2;
    return {start:start.slice(),H,g,d,next,gd,before:objective(start),after:objective(next),gradientAfter:objective(gd),decrement2:-dot(g,d)};
  }
  function admm(iterations=8,rho=1) {
    integer(iterations);finite(rho);if(rho<=0)throw new RangeError('ρ 须为正');
    let z=0,u=0;const rounds=[];
    for(let k=1;k<=iterations;k++) {const oldZ=z,oldU=u,x=(3+rho*(oldZ-oldU))/(1+rho);z=(-1+rho*(x+oldU))/(1+rho);u=oldU+x-z;rounds.push({k,oldZ,oldU,x,z,u,primal:x-z,dual:rho*(z-oldZ),splitObjective:((x-3)**2+(z+1)**2)/2,lambda:rho*u});}
    return {rho,rounds,optimum:1,optimalValue:4,optimalMultiplier:2};
  }
  const compute={chord,supporting,projection,kkt,gradient,soft,proximal,newton,admm};
  // Plot coordinates and all plotted curves are derived from the same models as the text.
  const C={blue:'#225b9b',orange:'#af4d20',green:'#25735b',purple:'#7952a3',muted:'#657681',red:'#a03946'};
  function plot(xmin,xmax,ymin,ymax,equal=false) {
    const unit=Math.min(574/(xmax-xmin),380/(ymax-ymin));
    const width=equal?unit*(xmax-xmin):574,height=equal?unit*(ymax-ymin):380;
    const X=x=>86+(574-width)/2+(x-xmin)*width/(xmax-xmin),Y=y=>436-(380-height)/2-(y-ymin)*height/(ymax-ymin);
    const line=(a,b,c='muted',dash=false)=>`<line x1="${X(a[0])}" y1="${Y(a[1])}" x2="${X(b[0])}" y2="${Y(b[1])}" stroke="${C[c]||c}" class="ca-line${dash?' ca-dashed':''}"/>`;
    const point=(p,c='blue',r=8)=>`<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="${r}" fill="${C[c]}" class="ca-point"/>`;
    const label=(p,s,c='muted',anchor='middle')=>`<text x="${X(p[0])}" y="${Y(p[1])}" fill="${C[c]}" text-anchor="${anchor}">${escape(s)}</text>`;
    const path=(points,c='blue',fill='none',extra='')=>`<path d="${points.map((p,i)=>(i?'L':'M')+X(p[0])+','+Y(p[1])).join(' ')}" fill="${fill}" stroke="${C[c]||c}" class="ca-line" ${extra}/>`;
    const curve=(fn,lo=xmin,hi=xmax,c='blue')=>path(Array.from({length:101},(_,i)=>{const x=lo+(hi-lo)*i/100;return[x,fn(x)];}),c);
    const ellipse=(center,rx,ry,c='green',fill='none')=>`<ellipse cx="${X(center[0])}" cy="${Y(center[1])}" rx="${Math.abs(X(rx)-X(0))}" ry="${Math.abs(Y(ry)-Y(0))}" fill="${fill}" stroke="${C[c]}" class="ca-line"/>`;
    const arrow=(a,b,c='orange')=>{const x=X(b[0]),y=Y(b[1]),angle=Math.atan2(y-Y(a[1]),x-X(a[0]));return line(a,b,c)+`<path d="M ${x-16*Math.cos(angle-.45)} ${y-16*Math.sin(angle-.45)} L ${x} ${y} L ${x-16*Math.cos(angle+.45)} ${y-16*Math.sin(angle+.45)}" fill="none" stroke="${C[c]}" class="ca-line"/>`;};
    const axes=(xticks,yticks,xlabel='x',ylabel='f(x)')=>{const zy=Math.min(ymax,Math.max(ymin,0)),zx=Math.min(xmax,Math.max(xmin,0));let out=line([xmin,zy],[xmax,zy])+line([zx,ymin],[zx,ymax]);xticks.forEach(t=>{out+=`<line x1="${X(t)}" y1="${Y(zy)-6}" x2="${X(t)}" y2="${Y(zy)+6}" stroke="${C.muted}"/>`+`<text x="${X(t)}" y="${Y(ymin)+45}" text-anchor="middle">${fmt(t)}</text>`;});yticks.forEach(t=>{if(t!==0)out+=`<text x="${X(xmin)-14}" y="${Y(t)+11}" text-anchor="end">${fmt(t)}</text>`;});out+=`<text x="${X(xmax)}" y="${Y(ymin)+84}" text-anchor="end">${escape(xlabel)}</text><text x="${X(xmin)-4}" y="${Y(ymax)-18}" text-anchor="start">${escape(ylabel)}</text>`;return out;};
    return {X,Y,line,point,label,path,curve,ellipse,arrow,axes};
  }
  const frame=(title,caption,formula,reason,values=[])=>({title,caption,formula,reason,values});
  const metas={
    'convex-chord':{title:'弦为什么总在曲线上方？',intro:'固定 f(x)=x² 和端点 0、2；用同一个权重分别混合输入与函数值。',slider:{label:'端点 2 的权重 θ',min:0,max:1,step:.1,value:.5},legend:[['blue','函数与函数值'],['orange','端点连成的弦'],['purple','弦与曲线的差额']]},
    'supporting-plane':{title:'局部切线，为什么能作全局下界？',intro:'f(x)=x²/2，切点 a=1。图中的直线是上图集在二维平面内的支撑超平面。',legend:[['blue','函数 f'],['orange','切线 ℓ'],['purple','固定检验点 x=−1']]},
    projection:{title:'投影：走到最近的可行点',intro:'闭凸集 C={x∈ℝ²: ‖x‖₂≤2}，输入 v=(3,4)。展示位置、距离与法向条件。',legend:[['green','闭圆盘 C'],['orange','输入 v'],['blue','投影 p'],['purple','检验点 z']]},
    kkt:{title:'KKT：可行方向上的力平衡',intro:'最小化 f(x)=‖x−(2,2)‖₂²/2，约束 x₁+x₂≤2。梯度、乘子和边界来自同一算例。',legend:[['green','可行半空间'],['orange','无约束中心 a'],['blue','约束最优点 p'],['purple','约束法向量']]},
    gradient:{title:'步长怎样改变两种曲率下的运动？',intro:'f(x)= (x₁²+8x₂²)/2，L=8，μ=1，从 (2.5,1) 出发。改步长会重新计算全部轨迹。',slider:{label:'梯度步长 α',min:.05,max:.275,step:.025,value:.125},legend:[['green','目标函数等高线'],['orange','起点'],['blue','已经讲到的迭代'],['purple','当前梯度步']]},
    prox:{title:'软阈值：什么时候缩小，什么时候归零？',intro:'解 minᵤ (u−2.4)²/2 + λ|u|。阈值 λ 改变后，曲线、最优点和次梯度检验一起更新。',slider:{label:'阈值 λ',min:0,max:3,step:.2,value:1},legend:[['orange','二次距离项'],['purple','绝对值惩罚'],['blue','总目标与最优点']]},
    newton:{title:'牛顿步：先按曲率校正，再移动',intro:'f(x)=(x₁²+8x₂²)/2，从 (3,1) 出发。比较同一点的梯度步和牛顿步。',legend:[['green','目标函数等高线'],['orange','起点与梯度步'],['blue','牛顿方向与终点']]},
    admm:{title:'ADMM：三次更新，两个停止信号',intro:'最小化 (x−3)²/2+(z+1)²/2，满足 x=z；ρ=1，z⁰=u⁰=0。已知最优共识值为 1。',legend:[['blue','x：第一块变量'],['orange','z：第二块变量'],['purple','λ=ρu：未缩放乘子'],['green','目标 x=z=1，λ=2']]}
  };
  function getFrames(key,parameter) {
    if(!metas[key])throw new RangeError('未知教学图解');
    if(key==='convex-chord') {const a=chord(parameter===undefined?.5:parameter),t=fmt(a.theta),x=fmt(a.x);return [
      frame('先固定端点','两个输入分别是 0 和 2。蓝色抛物线给出函数值 0 和 4；此时还没有比较任何混合量。','f(0)=0,\\qquad f(2)=4','凸性比较的是相同端点、相同权重下的两种计算顺序。'),
      frame('第一条路线：先混合输入',`把权重 θ=${t} 放在端点 2 上，得到横坐标 x=${x}。竖虚线只标位置，尚未指定高度。`,`x_\\theta=(1-\\theta)0+\\theta 2=${x}`,'权重非负且和为 1，因此混合点留在两个端点之间。',[['θ',t],['混合输入',x]]),
      frame('再计算混合点的函数值',`沿同一条竖线找到蓝色曲线，高度是 ${fmt(a.curve)}。这是“先混合，再代入函数”的结果。`,`f(x_\\theta)=(2\\theta)^2=${fmt(a.curve)}`,'不要把输入 x 与函数值 f(x) 当成同一个量。',[['曲线高度',fmt(a.curve)]]),
      frame('第二条路线：先算值，再混合',`把端点的高度 0、4 按同一权重混合，得到 ${fmt(a.height)}。橙色弦上的点与蓝点具有同一个横坐标。`,`(1-\\theta)f(0)+\\theta f(2)=4\\theta=${fmt(a.height)}`,'直线插值得到弦上的高度；它通常不是函数本身的高度。',[['弦高度',fmt(a.height)],['曲线高度',fmt(a.curve)]]),
      frame('用竖直差额判断上下',`弦减曲线等于 ${fmt(a.gap)}。${a.gap===0?'当前权重在端点，两个高度重合。':'紫色竖线就是这个非负差额，说明混合输入的函数值更低。'}`,`4\\theta-(2\\theta)^2=4\\theta(1-\\theta)=${fmt(a.gap)}\\ge0`,'这里的非负性来自 0≤θ≤1，不来自图画看起来像一个碗。',[['差额',fmt(a.gap)]]),
      frame('从一组端点走向所有端点','这段播放验证了 0、2 两个端点。平方函数的一般证明把它们替换为任意 a、b，仍得到一个非负平方。','(1-\\theta)a^2+\\theta b^2-((1-\\theta)a+\\theta b)^2=\\theta(1-\\theta)(a-b)^2\\ge0','凸性的量词是：任意 a、b∈ℝ 和任意 θ∈[0,1]。一个数值例子只能帮助理解，不能代替这个量词。')];}
    if(key==='supporting-plane'){const a=supporting();return[
      frame('先认出函数和切点','蓝色曲线是 f(x)=x²/2。我们只在 a=1 处读取局部信息：函数值 0.5、斜率 1。','f(1)=\\tfrac12,\\qquad f\'(1)=1','可微性给出切线；全局支撑性质还需要凸性。',[['切点 a','1'],['f(a)','0.5']]),
      frame('用一阶信息构造直线','橙色短线经过 (1,0.5)，斜率等于 f′(1)=1。它是函数在该点的一阶近似。','\\ell(x)=f(1)+f\'(1)(x-1)=x-\\tfrac12','这里“一阶”指只使用函数值和导数，不使用二阶项。'),
      frame('把切线延伸到整个定义域','将短线延长，仍没有穿到蓝色曲线上方。这个全局下界并不是任意可微函数都具备的。','f(x)\\ge f(a)+f\'(a)(x-a)\\quad(\\forall x\\in\\mathbb R)','本例 f″(x)=1≥0；它在凸域 ℝ 上可微且凸。'),
      frame('在远处检查同一个横坐标',`取 x=−1，曲线高度 ${fmt(a.value)}，切线高度 ${fmt(a.line)}，二者相差 ${fmt(a.gap)}。`,`f(-1)=\\tfrac12,\\quad\\ell(-1)=-\\tfrac32,\\quad f(-1)-\\ell(-1)=2`,'“局部导数”构造的直线，现在约束了离切点很远的位置。',[['曲线','0.5'],['切线','−1.5'],['差额','2']]),
      frame('把观察变成恒等式','任意 x 处的差额恰好是到切点距离的平方的一半。它不会为负，且只在 x=a 时为零。','\\frac{x^2}{2}-\\left(\\frac{a^2}{2}+a(x-a)\\right)=\\frac{(x-a)^2}{2}\\ge0','这个计算同时说明下界成立、何时取等，以及差额如何随距离增长。'),
      frame('把“线在下面”读成支撑超平面','函数上图集中的每一点 (x,t) 都满足 t≥f(x)≥ℓ(x)。因此整片上图集都处在橙色直线的同一侧。','\\operatorname{epi}f\\subseteq\\{(x,t):t\\ge\\ell(x)\\}','在更高维，切线变成 f(a)+∇f(a)ᵀ(x−a)；证明仍需要可微凸函数和凸定义域。')];}
    if(key==='projection'){const a=projection();return[
      frame('先画出真正允许的位置','绿色闭圆盘包含边界，半径为 2。橙点 v=(3,4) 的长度为 5，位于可行集外。','C=\\{x:\\|x\\|_2\\le2\\},\\qquad\\|v\\|_2=5','非空、闭、凸保证欧氏投影存在且唯一。这个圆盘满足全部条件。',[['半径','2'],['‖v‖₂','5']]),
      frame('比较可行候选点','从 v 分别连到原点和边界点 z=(0,2)。距离为 5 和 √13≈3.6056，后者更近，但还不能说明它最近。','\\|v-0\\|_2=5,\\qquad\\|v-(0,2)\\|_2=\\sqrt{13}','找到一个更好的可行点，不等于证明全局最近。'),
      frame('沿半径拉回到边界','输入在圆盘外时，投影保持方向并把长度缩到 2，得到 p=(1.2,1.6)。橙点到蓝点的距离是 3。','p=\\frac{2}{\\|v\\|_2}v=(1.2,1.6),\\quad\\|v-p\\|_2=3','反三角不等式给出任意可行 z 的距离 ‖v−z‖≥‖v‖−‖z‖≥3；蓝点达到这个下界。',[['投影 p',pair(a.p)],['最短距离','3']]),
      frame('看残差与边界法线','向量 v−p=(1.8,2.4) 与 p 同方向，指向圆盘外。经过 p 且垂直于残差的虚线把整个圆盘留在另一侧。','v-p=\\tfrac32p,\\qquad (v-p)^T(z-p)\\le0','对所有 ‖z‖≤2，柯西–施瓦茨给出 pᵀz≤‖p‖‖z‖≤4=pᵀp，所以这个不等式对全体可行点成立。'),
      frame('检查一个不在径向上的点',`紫点 z=(0,2) 在圆盘边界上。将它代入，内积得到 ${fmt(a.vi)}≤0；不是只有径向点才满足。`,`(1.8,2.4)^T(-1.2,0.4)=${fmt(a.vi)}\\le0`,'蓝点的“最近性”与法向变分不等式在闭凸集上等价。',[['内积',fmt(a.vi)]]),
      frame('用距离展开再验一次',`对同一个 z，‖v−z‖²=${fmt(a.distance2)}，而 ‖v−p‖²+‖p−z‖²=${fmt(a.split)}。多出的 ${fmt(a.distance2-a.split)} 来自非正内积。`,`\\|v-z\\|^2=\\|v-p\\|^2+\\|p-z\\|^2-2(v-p)^T(z-p)\\ge\\|v-p\\|^2+\\|p-z\\|^2`,'这是投影的勾股型不等式；一般凸集上是“≥”，不必恰好为等式。',[['左侧','13'],['右侧','10.6']])];}
    if(key==='kkt'){const a=kkt();return[
      frame('无约束的最佳点不一定可用','橙点 a=(2,2) 是二次函数的无约束最小点，目标值为 0，但它的约束值为 2，超过允许的 0。','f(x)=\\tfrac12\\|x-a\\|^2,\\qquad c(a)=2+2-2=2>0','先检查可行性，再比较目标值；不可行的 0 不是原问题最优值。'),
      frame('等高线首次碰到可行集','从橙色中心扩大圆形等高线，第一次接触绿色半空间的位置是 p=(1,1)，此处 f(p)=1。','p=(1,1),\\qquad c(p)=0,\\qquad f(p)=1','约束为闭半空间，严格凸二次目标保证这个接触点是唯一最优点。',[['可行最优点',pair(a.p)],['目标值','1']]),
      frame('无约束梯度为什么不能为零','在 p 处 ∇f(p)=(-1,-1)，确实不是零。负梯度指向橙色中心，却马上进入不可行侧。','\\nabla f(p)=(-1,-1),\\qquad\\nabla c(p)=(1,1)','约束最优要求所有可行方向都不能下降，并不要求无约束梯度为零。'),
      frame('找一个非负乘子来平衡','取 λ=1，目标梯度与 λ 倍约束法向量恰好相消。紫色向量指向约束禁止的一侧。','\\nabla f(p)+\\lambda\\nabla c(p)=(-1,-1)+(1,1)=0','约束写作 c(x)≤0，因此不等式乘子的符号为 λ≥0。',[['λ','1'],['驻点残差','(0, 0)']]),
      frame('一起检查四条 KKT 条件','p 在边界，λ 非负，梯度已平衡，而且 λc(p)=0。这里约束活跃且乘子为正；一般“活跃”并不保证乘子严格为正。','c(p)=0,\\quad\\lambda=1\\ge0,\\quad\\lambda c(p)=0,\\quad\\nabla_xL(p,\\lambda)=0','原始可行、对偶可行、互补松弛、驻点条件缺一不可。',[['约束值','0'],['互补乘积','0']]),
      frame('用凸性证明它确实全局最优','对任意可行 z，梯度的一阶项等于 2−z₁−z₂≥0，剩下的平方项也非负。因此 f(z)≥f(p)。','f(z)-f(p)=2-z_1-z_2+\\tfrac12\\|z-p\\|^2\\ge0','这里直接证明了 KKT 的充分性。严格凸性进一步排除了第二个最优点。'),
      frame('最后让对偶下界追上原问题','对偶函数为 g(λ)=2λ−λ²（λ≥0），在 λ=1 处值为 1，与 f(p)=1 相同。点 (0,0) 严格满足约束，Slater 条件也成立。','g(1)=1=f(p),\\qquad c(0,0)=-2<0','零对偶间隙使原始可行上界和对偶下界吻合；不要只检查某一支箭头。',[['原始最优值','1'],['对偶最优值','1']])];}
    if(key==='gradient'){const a=gradient(parameter===undefined?.125:parameter),alpha=fmt(a.alpha),p=a.path;return[
      frame('先看两种曲率','沿 x₁ 方向曲率为 1，沿 x₂ 方向曲率为 8。绿色等高线是椭圆，起点为 (2.5,1)，目标值 7.125。','H=\\operatorname{diag}(1,8),\\qquad\\nabla f(x)=(x_1,8x_2)','同样的坐标偏离，在高曲率方向会引起更大的梯度和目标变化。',[['L','8'],['μ','1']]),
      frame('在当前点计算梯度',`起点的梯度是 (2.5,8)。用步长 α=${alpha} 乘负梯度，得到紫色位移；箭头终点才是下一次迭代。`,`x^1=x^0-\\alpha\\nabla f(x^0)\\approx${texPair(p[1])}`,'梯度必须在当前点重新计算；固定沿最初的箭头走到底不是梯度下降。',[['步长',alpha],['第一步终点',pair(p[1])]]),
      frame('检查第一步的目标变化',`目标从 ${fmt(a.values[0])} 变为 ${fmt(a.values[1])}。${a.safe?'当前 α≤1/L，可直接使用课程中的充分下降界。':a.alpha<.25?'当前 α>1/L，仍在本二次例的收敛范围内，但不能原样套用 α≤1/L 的简化界。':a.alpha===.25?'当前 α=2/L，高曲率坐标翻转符号、幅度不变。':'当前 α>2/L，高曲率方向会逐步放大。'}`,`f(x^1)\\le f(x^0)-\\alpha(1-L\\alpha/2)\\|\\nabla f(x^0)\\|^2\\approx${fmt(a.bound)}`,'这是 L-光滑上界；它可能比实际目标松。括号为负时，右侧本身不再保证下降。',[['实际 f(x¹)',fmt(a.values[1])],['上界',fmt(a.bound)]]),
      frame('第二次：用新点重算梯度',`第二个点为 ${pair(p[2])}，目标值 ${fmt(a.values[2])}。轨迹折线连接的每一段都来自一次重新计算。`,`x^2\\approx${texPair(p[2])},\\qquad f(x^2)\\approx${fmt(a.values[2])}`,'每个坐标各自乘一个固定因子：x₁ 乘 1−α，x₂ 乘 1−8α。',[['第 2 步',pair(p[2])]]),
      frame('第三次：快方向与慢方向分开',`第三个点为 ${pair(p[3])}。${a.alpha===.125?'高曲率的 x₂ 在第一步已经归零；随后只剩 x₁ 缓慢缩小。':'观察 x₂ 是否翻转符号，以及翻转后的幅度是减小还是增大。'}`,`x_1^{k+1}=${fmt(a.factors[0])}x_1^k,\\qquad x_2^{k+1}=${fmt(a.factors[1])}x_2^k`,'负因子意味着来回穿过最优点；负号本身不等于发散，关键是绝对值。',[['x₁ 因子',fmt(a.factors[0])],['x₂ 因子',fmt(a.factors[1])]]),
      frame('走到第五步，检查趋势',`第五个点为 ${pair(p[5])}，目标值 ${fmt(a.values[5])}。各轮目标依次为 ${a.values.map(fmt).join(' → ')}。`,`f(x^5)\\approx${fmt(a.values[5])}`,'一次下降不能代替长期分析；要检查两个特征方向的收缩因子。',[['第 5 步目标',fmt(a.values[5])]]),
      frame('用谱半径解释整条轨迹',`最大坐标幅度因子 q=${fmt(a.factor)}。${a.converges?'q<1，因此从任意初始点出发，两坐标都收敛到 0。':a.alpha===.25?'q=1，本例起点含非零高曲率分量，因此不会收敛到最优点。':'q>1，本例起点含非零高曲率分量，因此该分量发散。'}`,'q=\\max\\{|1-\\alpha|,|1-8\\alpha|\\}<1\\iff0<\\alpha<\\tfrac14','区分三件事：α≤1/L 是方便证明的安全范围；本二次例的完整收敛范围是 0<α<2/L；一般定理还要检查相应假设。',[['q',fmt(a.factor)],['条件数 L/μ','8']])];}
    if(key==='prox'){const a=proximal(parameter===undefined?1:parameter),l=fmt(a.lambda),x=fmt(a.x);return[
      frame('只考虑“别离输入太远”','橙色二次距离项在 v=2.4 处最小。如果没有惩罚项，输出就等于输入。','\\min_u\\tfrac12(u-v)^2,\\qquad v=2.4','近端算子保留距离项，因此不会只顾着把惩罚压到最小。'),
      frame('加上“偏好零”的惩罚',`紫色项 λ|u| 在 0 处有折角；当前 λ=${l}。它越重，离零的坐标付出越多代价。`,`\\phi(u)=\\tfrac12(u-2.4)^2+${l}|u|`,'折角处不能强行使用普通导数；要用次梯度区间。'),
      frame('把两种代价加在一起','蓝色总目标是橙色项与紫色项逐点相加。平方项严格凸，所以总目标有且只有一个最小点。','0\\in u-v+\\lambda\\partial|u|','这里距离项是强凸的，保证唯一最优解；惩罚本身可以不可微。'),
      frame('先尝试正数区域的解',`若 u>0，则 |u| 的导数为 1，驻点候选为 2.4−λ=${fmt(a.candidate)}。${a.candidate>0?'候选确实为正，可以保留。':'候选不满足 u>0，不能把这个分支的解直接当答案。'}`,`u>0:\\quad u-2.4+${l}=0\\Rightarrow u=${fmt(a.candidate)}`,'分段推导得到候选后，必须回头检查该分支的符号条件。'),
      frame(a.x===0?'在折角处用次梯度检验':'验证正分支并排除折角',a.x===0?`输出 u=0。可取 s=2.4/λ≈${fmt(a.s)}∈[−1,1]，满足 0−2.4+λs=0。`:`输出 u=${x}>0，对应次梯度 s=1。因为 λ<2.4，零点不能让 −2.4+λ[−1,1] 包含 0。`,a.x===0?`\\partial|0|=[-1,1],\\quad -2.4+\\lambda\\frac{2.4}{\\lambda}=0`:`${x}-2.4+${l}\\cdot1=0`,'负输入用相反符号对称处理；输入绝对值不超过阈值时，零点的次梯度区间吸收掉线性项。',[['输出',x],['总目标',fmt(a.value)]]),
      frame('合并成一个软阈值公式',`当前最优输出为 ${x}，总目标 ${fmt(a.value)}；如果一律取零，总目标为 2.88。`,`\\operatorname{prox}_{\\lambda|\\cdot|}(v)=\\operatorname{sign}(v)\\max(|v|-\\lambda,0)`,'“减去阈值”还不够：必须在 0 处截断，不能穿过零继续走。',[['soft(2.4,λ)',x],['归零目标','2.88']]),
      frame('向量的一范数：逐坐标应用',`同一个阈值作用于 ${pair(a.inputs)}，输出 ${pair(a.outputs)}。小坐标可能先归零，大坐标只被缩短。`,'\\operatorname{prox}_{\\lambda\\|\\cdot\\|_1}(v)_i=\\operatorname{sign}(v_i)\\max(|v_i|-\\lambda,0)','平方欧氏距离和一范数都可按坐标相加，才允许这样独立求解；一般耦合惩罚不能照搬。',a.inputs.map((v,i)=>[fmt(v)+' →',fmt(a.outputs[i])]))];}
    if(key==='newton'){const a=newton();return[
      frame('同一函数，不同方向的曲率','起点是 (3,1)，梯度为 (3,8)，目标值 8.5。高曲率方向产生更大的梯度分量。','\\nabla f(x)=\\begin{pmatrix}x_1\\\\8x_2\\end{pmatrix},\\quad H=\\begin{pmatrix}1&0\\\\0&8\\end{pmatrix}','等高线由函数本身计算；纵向更陡，并不意味着应该移动得更远。',[['起点目标','8.5']]),
      frame('先看一个安全梯度步','用 α=1/8 走梯度步，达到 (2.625,0)，目标约为 3.4453。它压住了高曲率方向，但低曲率方向仍留下较大偏离。','x_{\\rm GD}=x-\\tfrac18\\nabla f(x)=(2.625,0)','同一个标量步长必须照顾最陡的方向，所以其他方向可能进展缓慢。',[['梯度步终点',pair(a.gd)],['目标',fmt(a.gradientAfter)]]),
      frame('把局部二次模型写全','牛顿法最小化二次模型：原函数值、一阶项、曲率项。这里 Hessian 正定，因此模型有唯一最小点。','m(d)=f(x)+\\nabla f(x)^Td+\\tfrac12d^THd','求模型最优方向，就是让关于 d 的梯度等于零。'),
      frame('求解线性方程，而不是直接追梯度','分别解 d₁=−3 和 8d₂=−8，得到 d=(−3,−1)。较大的曲率 8 把第二个梯度分量也除以 8。','Hd=-\\nabla f(x)\\Rightarrow d=\\begin{pmatrix}-3\\\\-1\\end{pmatrix}','实际实现通常解线性方程组，不显式形成 H⁻¹。',[['牛顿方向',pair(a.d)]]),
      frame('完整牛顿步到达最优点','从 (3,1) 加上 (−3,−1) 得到 (0,0)，目标变为 0。蓝色路径同时修正了两种曲率。','x^+=x+d=(0,0),\\qquad f(x^+)=0','这一次可以完整步到达，是因为原函数本来就是正定二次函数，局部模型处处精确。',[['牛顿后目标','0'],['梯度步后目标',fmt(a.gradientAfter)]]),
      frame('核对预测下降量','牛顿减量平方为 −∇f(x)ᵀd=17；二次模型预测下降一半，即 8.5，恰好等于真实下降量。','\\delta^2=-\\nabla f(x)^Td=17,\\qquad f(x)-f(x+d)=\\tfrac12\\delta^2=8.5','一般非二次目标只有局部近似，预测下降量与实际下降量不一定吻合。'),
      frame('哪些结论不能带出这个算例？','一般目标需要检查 Hessian 的可逆性与正定性，并常用回溯线搜索选择阻尼步长。不能把本例的“一步到达”当作普遍结论。','x^+=x+td,\\qquad0<t\\le1','牛顿法的局部快速收敛需要额外光滑性、非退化性与足够近的初始点。这个图只证明了当前二次例。')];}
    const a=admm(),r=a.rounds;return[
      frame('先拆开目标，再要求两块一致','第一项单独喜欢 x=3，第二项单独喜欢 z=−1；约束要求 x=z。把两项合起来，最优共识值为 1，目标值为 4。','\\min_{x=z}\\tfrac12(x-3)^2+\\tfrac12(z+1)^2,\\quad x^*=z^*=1','u 是缩放乘子，不是第三个原始变量；初值 z⁰=u⁰=0。',[['z⁰','0'],['u⁰','0']]),
      frame('第一轮：固定旧 z、u，更新 x','用旧值 z⁰=0、u⁰=0 计算 x¹=1.5。第一块同时考虑自己的目标和一致性惩罚。','x^1=\\frac{3+z^0-u^0}{2}=1.5','对 x 子问题求导：(x−3)+(x−z⁰+u⁰)=0。此时还没更新 z。',[['x¹','1.5'],['旧 z','0'],['旧 u','0']]),
      frame('马上用新 x 更新 z','第二块使用刚算出的 x¹=1.5，得到 z¹=0.25。若误用旧 x，就变成了另一个算法。','z^1=\\frac{-1+x^1+u^0}{2}=0.25','对 z 子问题求导：(z+1)+(z−x¹−u⁰)=0。',[['x¹','1.5'],['z¹','0.25']]),
      frame('最后累加一致性残差','此时 x¹−z¹=1.25，所以 u¹=0+1.25=1.25。下一轮的两个子问题会使用这个修正量。','u^1=u^0+x^1-z^1=1.25','乘子记录约束违背的累积效应；不是用一个平均操作把 x、z 强行改成相同数。',[['原始残差 r¹','1.25'],['u¹','1.25']]),
      frame('检查两个残差，而非一个目标值','第一轮原始残差 r¹=1.25，对偶残差 s¹=0.25，均未为零。虽然拆分目标是 1.90625，小于 4，它来自不可行的 x≠z，不能拿来宣称更优。','r^1=x^1-z^1=1.25,\\quad s^1=\\rho(z^1-z^0)=0.25','本图采用 sᵏ=ρ(zᵏ−zᵏ⁻¹) 的符号约定；停止准则检查其绝对值，反号约定结论相同。',[['拆分目标',fmt(r[0].splitObjective)],['原问题最优值','4']]),
      frame('第二轮：更新顺序完整重来','新一轮得到 x²=1、z²=0.625、u²=1.625。x 已等于最终最优值，但 z 还没有跟上。','x^2=1,\\quad z^2=0.625,\\quad u^2=1.625','不能因为某一块不再变化就停止。此时原始和对偶残差都为 0.375。',[['|r²|','0.375'],['|s²|','0.375']]),
      frame('第四轮：两块逐渐达成共识',`第四轮 x=${fmt(r[3].x)}，z=${fmt(r[3].z)}，u=${fmt(r[3].u)}。两个残差的绝对值均约为 ${fmt(Math.abs(r[3].primal))}。`,`x^4=1,\\quad z^4=0.90625,\\quad u^4=1.90625`,'乘子趋向 2，与最优点处两个子目标的相反导数相配。',[['|r⁴|',fmt(Math.abs(r[3].primal))],['|s⁴|',fmt(Math.abs(r[3].dual))]]),
      frame('第八轮：接近共识，但仍要按容差判断',`第八轮 z=${fmt(r[7].z)}，u=${fmt(r[7].u)}；两个残差约为 ${fmt(Math.abs(r[7].primal))}。有限轮的近似解应报告误差，而不是称为精确相等。`,`|r^8|=|s^8|\\approx${fmt(Math.abs(r[7].primal))}`,'本例从第二轮起，两个残差每轮减半。这是这个参数与问题的计算结果，并非任意 ADMM 都有同一收敛率。',[['x⁸','1'],['z⁸',fmt(r[7].z)],['u⁸',fmt(r[7].u)]]),
      frame('用最优性条件核对极限','在 x=z=1、λ=ρu=2 时，第一块梯度为 −2，第二块梯度为 2，分别被乘子平衡，且一致性约束成立。','(x-3)+\\lambda=0,\\quad(z+1)-\\lambda=0,\\quad x-z=0','ADMM 的迭代是在逐渐满足这些条件。一般收敛定理仍需闭、真、凸目标、可解子问题与鞍点存在等假设。',[['极限共识值','1'],['极限乘子','2']])];
  }
  function drawScene(key,index,parameter) {
    let p,body='',axes='';
    if(key==='convex-chord') {const a=chord(parameter===undefined?.5:parameter);p=plot(-.15,2.2,-.35,4.65);axes=p.axes([0,1,2],[2,4]);body=p.curve(x=>x*x,-.15,2.15)+p.point([0,0])+p.point([2,4]);
      if(index>=1)body+=p.line([a.x,0],[a.x,Math.max(a.curve,a.height)],'muted',true)+p.point([a.x,0],'purple');
      if(index>=2)body+=p.point([a.x,a.curve],'blue',11);
      if(index>=3)body+=p.line([0,0],[2,4],'orange')+p.point([a.x,a.height],'orange',11);
      if(index>=4)body+=p.line([a.x,a.curve],[a.x,a.height],'purple');
    } else if(key==='supporting-plane') {p=plot(-2.2,2.2,-2,3);axes=p.axes([-2,0,2],[-1,1,3]);
      if(index>=5)body+=p.path([[-2.2,3],[2.2,3],...Array.from({length:65},(_,i)=>{const x=2.2-4.4*i/64;return[x,x*x/2];}),[-2.2,3]],'none','rgba(37,115,91,.12)');
      body+=p.curve(x=>x*x/2)+p.point([1,.5],'blue',10);
      if(index>=1)body+=p.line(index===1?[.4,-.1]:[-2.2,-2.7],index===1?[1.6,1.1]:[2.2,1.7],'orange');
      if(index>=3)body+=p.line([-1,-1.5],[-1,.5],'purple')+p.point([-1,.5],'purple')+p.point([-1,-1.5],'purple');
    } else if(key==='projection') {const a=projection();p=plot(-2.7,4,-2.7,4.8,true);axes=p.axes([-2,0,2,4],[-2,2,4],'x₁','x₂');body=p.ellipse([0,0],2,2,'green','rgba(37,115,91,.1)')+p.point(a.v,'orange',11);
      if(index===1)body+=p.line(a.v,[0,0],'muted',true)+p.line(a.v,a.z,'purple',true)+p.point(a.z,'purple');
      if(index>=2)body+=p.line([0,0],a.v,'muted',true)+p.line(a.p,a.v,'orange')+p.point(a.p,'blue',11);
      if(index>=3)body+=p.line([-2,4],[4,-.5],'green',true)+p.arrow(a.p,a.v,'orange');
      if(index>=4)body+=p.point(a.z,'purple',11)+p.line(a.p,a.z,'purple');
      if(index>=5)body+=p.line(a.v,a.z,'muted',true);
    } else if(key==='kkt') {const a=kkt();p=plot(-.65,3,-.65,3,true);axes=p.axes([0,1,2],[1,2],'x₁','x₂');body=p.path([[-.65,-.65],[2.65,-.65],[-.65,2.65],[-.65,-.65]],'none','rgba(37,115,91,.14)')+p.line([-.65,2.65],[2.65,-.65],'green')+p.ellipse([2,2],.6,.6,'orange')+p.point([2,2],'orange',11);
      if(index>=1)body+=p.ellipse([2,2],Math.SQRT2,Math.SQRT2,'orange')+p.point(a.p,'blue',11);
      if(index>=2)body+=p.arrow(a.p,[0,0],'blue')+p.arrow(a.p,[2,2],'orange');
      if(index>=3)body+=p.arrow(a.p,[2,2],'purple');
      if(index>=5)body+=p.point([.3,.8],'green')+p.line(a.p,[.3,.8],'green',true);
      if(index>=6)body+=p.point([0,0],'green',10);
    } else if(key==='gradient') {const a=gradient(parameter===undefined?.125:parameter),last=[0,0,1,2,3,5,5][index];p=plot(-3,3,-3,3,true);axes=p.axes([-2,0,2],[-2,2],'x₁','x₂');[1,2,4,7.125].forEach(c=>body+=p.ellipse([0,0],Math.sqrt(2*c),Math.sqrt(c/4),'green'));body+=p.point([0,0],'green',6)+p.point(a.path[0],'orange',11);
      if(index===1)body+=p.arrow(a.path[0],a.path[1],'purple');
      if(last>0){body+=p.path(a.path.slice(0,last+1),'blue');a.path.slice(1,last+1).forEach(q=>body+=p.point(q,'blue',8));body+=p.point(a.path[last],'purple',11);}
    } else if(key==='prox') {const a=proximal(parameter===undefined?1:parameter),q=x=>(x-a.v)**2/2,penalty=x=>a.lambda*Math.abs(x),f=x=>q(x)+penalty(x);p=plot(-1,3.5,-.3,Math.max(6.5,f(-1)+.5));axes=p.axes([0,1,2,3],[2,4,6],'u','代价');body=p.curve(q,-1,3.5,'orange');
      if(index>=1)body+=p.curve(penalty,-1,3.5,'purple');
      if(index>=2)body+=p.curve(f,-1,3.5,'blue');
      if(index>=3&&a.candidate>=-1)body+=p.line([a.candidate,0],[a.candidate,f(a.candidate)],'muted',true);
      if(index>=4)body+=p.point([a.x,a.value],'blue',12)+p.line([a.x,0],[a.x,a.value],'blue',true);
    } else if(key==='newton') {const a=newton();p=plot(-3.6,3.6,-1.65,1.65,true);axes=p.axes([-3,0,3],[-1,1],'x₁','x₂');[1,3,5,8.5].forEach(c=>body+=p.ellipse([0,0],Math.sqrt(2*c),Math.sqrt(c/4),'green'));body+=p.point([0,0],'green',6)+p.point(a.start,'orange',11);
      if(index>=1)body+=p.arrow(a.start,a.gd,'orange')+p.point(a.gd,'orange',8);
      if(index>=3)body+=p.arrow(a.start,a.next,'blue');
      if(index>=4)body+=p.point(a.next,'blue',12);
    } else {const a=admm(),roundIndex=index>=7?7:index===6?3:index===5?1:0,r=a.rounds[roundIndex],isFinal=index===8;let x=index===0?null:index===8?1:r.x,z=index<2?0:isFinal?1:r.z,u=index<3?0:isFinal?2:r.u;p=plot(-.4,3.2,0,4);axes=p.axes([0,1,2,3],[],'数值','');
      [3,2,1].forEach((y,i)=>{body+=p.line([0,y],[3,y],'muted',true)+p.label([-.28,y-.08],['x','z','u'][i],['blue','orange','purple'][i]);});body+=p.line([1,1.65],[1,3.35],'green',true)+p.line([2,.65],[2,1.35],'green',true);
      if(x!==null)body+=p.point([x,3],'blue',12);body+=p.point([z,2],'orange',12)+p.point([u,1],'purple',12);
      if(index>=3)body+=p.line([x,2.5],[z,2.5],'purple')+p.line([x,2.5],[x,3],'blue',true)+p.line([z,2],[z,2.5],'orange',true);
    }
    return {body,axes};
  }
  // Parameter laboratories: one model drives geometry, derivation, and measured outcomes.
  Object.assign(metas['supporting-plane'],{intro:'Supporting hyperplane：移动切点 a，观察局部斜率怎样改变全局下界。固定检验点 x=−1。',slider:{label:'切点 a',min:-1.5,max:1.5,step:.25,value:1}});
  Object.assign(metas.projection,{intro:'Euclidean projection：固定 v=(3,4)，改变闭圆盘半径 R；比较边界解和内部解。',slider:{label:'可行圆盘半径 R',min:.5,max:6,step:.5,value:2}});
  Object.assign(metas.kkt,{intro:'KKT / complementary slackness：改变 x₁+x₂≤b 的边界，观察 active 与 inactive 约束的切换。',slider:{label:'约束上界 b',min:0,max:6,step:.5,value:2}});
  Object.assign(metas.newton,{intro:'Damped Newton：同一个正定二次函数，改变 t，看模型预测、真实下降与过冲的关系。',slider:{label:'Newton 步长 t',min:.25,max:2.5,step:.25,value:1}});
  Object.assign(metas.admm,{intro:'ADMM：改变 penalty parameter ρ，逐项核对 x → z → u 更新及 primal / dual residual。',slider:{label:'惩罚参数 ρ',min:.25,max:4,step:.25,value:1}});
  const cases={
    'convex-chord':[[0,'θ=0 · equality'],[.5,'θ=½ · maximal gap'],[1,'θ=1 · equality']],
    'supporting-plane':[[-1,'a=−1 · touches probe'],[0,'a=0 · horizontal'],[1,'a=1 · positive slope']],
    projection:[[2,'R=2 · outside'],[5,'R=5 · boundary'],[6,'R=6 · inside']],
    kkt:[[2,'b=2 · active'],[4,'b=4 · λ=0'],[6,'b=6 · inactive']],
    gradient:[[.125,'α=1/L'],[.25,'α=2/L'],[.275,'α>2/L']],
    prox:[[0,'λ=0 · identity'],[1,'λ=1 · shrink'],[2.4,'λ=|v| · zero']],
    newton:[[.5,'t=½ · damped'],[1,'t=1 · exact'],[2.5,'t>2 · increase']],
    admm:[[.25,'ρ=¼'],[1,'ρ=1'],[4,'ρ=4']]
  };
  function laboratory(key,value) {
    const v=value===undefined?metas[key].slider.value:value;
    if(key==='convex-chord'){const a=chord(v);return {values:[['mixed input',fmt(a.x)],['f(mixed input)',fmt(a.curve)],['mixed f values',fmt(a.height)],['Jensen gap',fmt(a.gap)]],rule:'Δ = 4θ(1−θ) ≥ 0',contrast:'Counterexample：若改为 f(x)=−x²，同一端点的 gap 为 '+fmt(-a.gap)+'。内点时符号反转，所以 concave 不满足 convex inequality。'};}
    if(key==='supporting-plane'){const a=supporting(v,-1);return {values:[['slope f′(a)',fmt(v)],['f(−1)','0.5'],['tangent ℓ(−1)',fmt(a.line)],['gap f−ℓ',fmt(a.gap)]],rule:'ℓ(x)=ax−a²/2; f(x)−ℓ(x)=(x−a)²/2',contrast:'Counterexample：对 −x²/2，切线与曲线仍相切，但 f−ℓ=−(x−a)²/2≤0。Differentiability 本身不保证 global lower bound。'};}
    if(key==='projection'){const a=projection([3,4],v,[0,v]);return {values:[['projection p',pair(a.p)],['distance',fmt(a.distance)],['normal test',fmt(a.vi)],['‖p‖₂',fmt(Math.hypot(...a.p))]],rule:'p = min(1, R/‖v‖₂) v',contrast:v<5?'Outside：R 增加 1，最短距离减少 1，直到 R=5。Counterexample：若可行集只有 {−v,v}，原点有两个最近点；非凸集不保证唯一性。':'Inside / boundary：v 已可行，因此 p=v，residual=0；继续增大 R 不会再移动投影。'};}
    if(key==='kkt'){const a=kkt([2,2],v);return {values:[['p',pair(a.p)],['λ',fmt(a.lambda)],['constraint c(p)',fmt(a.constraint)],['primal = dual',fmt(a.primal)]],rule:'λ=max(0,(4−b)/2); p=(2−λ,2−λ)',contrast:v<4?'Active：c(p)=0 且 λ>0。提高 b 会减少最优代价；局部 sensitivity 为 d f*/db=−λ。':v===4?'Degenerate active：c(p)=0 但 λ=0。这是“约束活跃 ⇒ 乘子严格为正”的反例。':'Inactive：c(p)<0，λ=0，最优点回到无约束中心。Complementary slackness 不要求每个约束都取等。'};}
    if(key==='gradient'){const a=gradient(v,5);return {values:[['factor x₁',fmt(a.factors[0])],['factor x₂',fmt(a.factors[1])],['f(x⁰) → f(x⁵)',fmt(a.values[0])+' → '+fmt(a.values[5])],['spectral radius',fmt(a.factor)]],rule:'x₁ᵏ=(1−α)ᵏ·2.5; x₂ᵏ=(1−8α)ᵏ',contrast:a.converges?'Both |1−α| and |1−8α| < 1：两个方向都会衰减。α≤1/L 是充分条件；这个二次例的精确稳定范围更大：0<α<2/L。':v===.25?'Boundary case：x₂ 每步变号但幅度保持 1，f(xᵏ)→4 而非 0；“目标值下降”不等于收敛到最优点。':'Counterexample：|1−8α|>1，高曲率方向每步放大；即使初期某步下降，也不能保证收敛。'};}
    if(key==='prox'){const a=proximal(v);return {values:[['input v','2.4'],['soft output',fmt(a.x)],['subgradient s',fmt(a.s)],['optimal objective',fmt(a.value)]],rule:'soft(v,λ)=sign(v)·max(|v|−λ,0)',contrast:v===0?'Identity case：λ=0 没有惩罚，soft 和 hard threshold 都保留输入 2.4。将 λ 增大后，才会出现 soft 的连续收缩与 hard 的保留/删除差异。':v>=2.4?'Zero region：s=v/λ∈[−1,1] 让 stationarity 成立。若继续使用 u=v−λ，λ>2.4 时会错误地穿过零。':'Soft ≠ hard threshold：当前 hard threshold 输出 2.4，但 soft 输出 '+fmt(a.x)+'；保留下来的非零坐标也会被缩小。'};}
    if(key==='newton'){const a=newton(),next=a.start.map(x=>(1-v)*x),after=a.before*(1-v)**2;return {values:[['x+td',pair(next)],['f before','8.5'],['f after',fmt(after)],['actual decrease',fmt(a.before-after)]],rule:'f(x+td)=(1−t)²f(x); decrease=8.5(2t−t²)',contrast:v===1?'Exact quadratic：t=1 一步到达最优点，因为 local quadratic model 与原函数完全一致。一般非二次目标并不具有这个性质。':v<2?'0<t<2：这个二次例严格下降，t=1 最好。对一般目标需用 line search 核验充分下降，不能只依赖模型预测。':v===2?'t=2：到达 −x，目标完全不变；方向是 descent direction，不代表任意步长都下降。':'Counterexample：t>2 过冲，目标上升。即使 Hessian 正定、Newton direction 正确，过大步长仍会失败。'};}
    const a=admm(8,v),r=a.rounds[7];return {values:[['x⁸ / z⁸',fmt(r.x)+' / '+fmt(r.z)],['|r⁸|',fmt(Math.abs(r.primal))],['|s⁸|',fmt(Math.abs(r.dual))],['λ⁸ = ρu⁸',fmt(r.lambda)]],rule:'rᵏ=xᵏ−zᵏ; sᵏ=ρ(zᵏ−zᵏ⁻¹)',contrast:'对比 ρ=¼、1、4：较大 penalty 不保证两种 residual 都更小。这里极限 λ*=2，因此 u*=2/ρ='+fmt(2/v)+'，不是总等于 2。'};
  }
  const originalFrames=getFrames;
  getFrames=function(key,parameter){
    const v=parameter===undefined?metas[key]?.slider?.value:parameter;
    if(!['supporting-plane','projection','kkt','newton','admm'].includes(key))return originalFrames(key,parameter);
    const lab=laboratory(key,v),F=(title,caption,formula,reason,values=[])=>frame(title,caption,formula,reason,values);
    if(key==='supporting-plane'){const a=supporting(v,-1);return [
      F('1 · Local data',`当前切点 a=${fmt(v)}。先在蓝色函数 f(x)=x²/2 上读取高度和斜率；改变 a 会同时改变这两项。`,`f(a)=${String(a.at)},\\quad f'(a)=${fmt(v)}`,'只有切点处的局部数据被用于构造切线；检验点保持 x=−1。'),
      F('2 · Tangent construction','橙线经过蓝色切点，斜率由导数给出。将一阶模型展开，可得到一条对所有 x 都有定义的直线。',`\\ell(x)=f(a)+f'(a)(x-a)=${fmt(v)}x-${String(a.at)}`,'切线的截距依赖 a²，所以移动切点不能只平移一条固定斜率的线。'),
      F('3 · Global lower bound','把橙色切线延长到整个显示区间。对当前二次凸函数，直线不会穿过函数上方。','f(x)-\\ell(x)=\\tfrac12(x-a)^2\\ge0','平方恒非负，给出任意 x 的证明，而不只是显示窗口内的数值检查。'),
      F('4 · A distant probe',`固定 x=−1；此时函数值 0.5，切线值 ${fmt(a.line)}，紫色竖线长度 ${String(a.gap)}。移动切点可直接改变这个误差。`,`f(-1)-\\ell(-1)=\\tfrac12(-1-a)^2=${String(a.gap)}`,'同一个横坐标上的两种高度才能相减；切点与检验点重合时差额为零。',lab.values),
      F('5 · Equality and curvature','曲线与切线只在 x=a 处相等。检验点离切点越远，模型低估量按距离的平方增长。','f(x)=\\ell(x)\\iff x=a','本例 Hessian=1；对于一般 convex function，等号集合可能包含一段线段。'),
      F('6 · What convexity adds',lab.contrast,'h(x)=-x^2/2:\\quad h(x)-\\ell_h(x)=-(x-a)^2/2','同样可微、同样有切线，支撑方向却相反；因此必须检查 convexity 假设。')];}
    if(key==='projection'){const a=projection([3,4],v,[0,v]);return [
      F('1 · Feasible set',`绿色闭圆盘半径 R=${fmt(v)}；橙点 v=(3,4) 的长度固定为 5。先判断输入在可行集内还是外。`,`C=\\{x:\\|x\\|_2\\le${fmt(v)}\\},\\quad\\|v\\|_2=5`,'闭性保证极限仍可行，凸性保证平方距离最小点唯一；这两项假设都有作用。'),
      F('2 · Radial reduction',`当前输入${v<5?'在圆盘外，要沿同一方向缩短到边界':'已经可行，因此最短距离为零，不必移动'}。蓝点由一个截断比例计算得到。`,'p=\\min\\{1,R/\\|v\\|_2\\}\\,v','比例上限必须为 1；若遗漏 min，圆盘增大时会把内部输入错误地推出去。'),
      F('3 · Global minimum certificate',`投影 p=${pair(a.p)}，距离 ${fmt(a.distance)}。任意可行点都不可能比下界 max(5−R,0) 更近。`,`\\|v-p\\|_2=\\max(5-R,0)=${fmt(a.distance)}`,'反三角不等式给出 ‖v−z‖≥‖v‖−‖z‖；非负性补上内部情形。',lab.values),
      F('4 · Normal direction',`橙色 residual v−p=${pair(a.residual)}。它为零时，法向检验自动成立；非零时，它垂直于边界切线。`,'(v-p)^T(z-p)\\le0\\quad\\forall z\\in C','这是最近性的 variational inequality；不是必须让两个向量的内积恰好为零。'),
      F('5 · Test another feasible point',`紫点 z=(0,R)=${pair(a.z)} 在边界上；当前内积为 ${fmt(a.vi)}，距离平方 ${fmt(a.distance2)}。`,`\\|v-z\\|^2=${fmt(a.distance2)}\\ge\\|v-p\\|^2+\\|p-z\\|^2=${fmt(a.split)}`,'距离展开中的交叉项为 −2(v−p)ᵀ(z−p)≥0，因此通常是不等式。'),
      F('6 · Change the assumptions',lab.contrast,'\\Pi_{\\{-v,v\\}}(0)=\\{-v,v\\}','Projection 的唯一性依赖凸集；两个孤立点的例子明确展示非凸情形的歧义。')];}
    if(key==='kkt'){const a=kkt([2,2],v);return [
      F('1 · Test the unconstrained point',`橙点 a=(2,2) 使 f=0，但 c(a)=4−b=${fmt(4-v)}。改变边界 b 会决定这个点是否允许使用。`,`c(a)=4-${fmt(v)}=${fmt(4-v)}`,'先检查 primal feasibility，再比较目标值；不可行的低目标不是原问题解。'),
      F('2 · First feasible contour',`蓝色最优点 p=${pair(a.p)}，目标 ${fmt(a.primal)}。${v<4?'等高线首次碰到边界。':'无约束中心已经落在可行集内或边界上。'}`,`p=(2-\\lambda,2-\\lambda),\\quad f(p)=${fmt(a.primal)}`,'Strict convexity 给出唯一解；圆形等高线使用与横纵坐标一致的欧氏尺度。'),
      F('3 · Stationarity',`在最优点 ∇f(p)=${pair(a.gradient)}。取 λ=${fmt(a.lambda)} 后，目标梯度与 λ(1,1) 正好抵消。`,`\\nabla f(p)+\\lambda(1,1)=0`,'不等式写成 c≤0，所以 multiplier 必须非负；把符号反过来会改变平衡方向。'),
      F('4 · Complementary slackness',`当前 c(p)=${fmt(a.constraint)}，λ=${fmt(a.lambda)}，乘积为零。比较 b=2、4、6，可以看到三种不同的边界状态。`,`c(p)\\le0,\\quad\\lambda\\ge0,\\quad\\lambda c(p)=0`,'Active 并不推出 λ>0；b=4 的边界最优点同时具有 λ=0。',lab.values),
      F('5 · Matching primal and dual',`对偶下界 g(λ)=(4−b)λ−λ²。在当前乘子处 g=${fmt(a.dual)}，等于可行点目标 ${fmt(a.primal)}。`,`g(\\lambda)=(4-b)\\lambda-\\lambda^2=f(p)=${fmt(a.primal)}`,'一个可行原始点和一个可行对偶点取得相同值，就构成零对偶间隙的最优性证书。'),
      F('6 · Read the regime',lab.contrast,'\\lambda^*=\\max\\{0,(4-b)/2\\}','所有四条 KKT 条件必须同时核对；不能仅凭一条 stationarity 方程判定最优。')];}
    if(key==='newton'){const a=newton(),next=a.start.map(x=>(1-v)*x),after=8.5*(1-v)**2;return [
      F('1 · Same start, unequal curvature','起点 (3,1)，梯度 (3,8)，Hessian=diag(1,8)。高曲率方向有更大梯度，但不应该因此移动得更远。','H=\\operatorname{diag}(1,8),\\quad f(x)=8.5','绿色椭圆由同一目标函数计算，纵横比 √8 直接反映两个特征值的比。'),
      F('2 · Gradient descent reference','橙色参照箭头使用安全步长 1/8，到达 (2.625,0)，目标约为 3.4453。它还保留了低曲率方向上的误差。','x_{GD}=x-\\nabla f(x)/8=(2.625,0)','一个标量学习率必须照顾最陡方向，因此低曲率方向可能进展较慢。'),
      F('3 · Solve the curvature system','牛顿方向通过解 Hd=−g 得到 d=(−3,−1)。图中的虚线指向完整 Newton step 的终点，而非直接追逐梯度。','Hd=-g\\quad\\Rightarrow\\quad d=(-3,-1)','实际算法解线性方程组，通常不显式形成逆矩阵；这里正定 H 确保方向唯一。'),
      F('4 · Apply the chosen step',`当前 t=${fmt(v)}，沿同一 Newton direction 到达 ${pair(next)}。超过 t=1 后会穿过原点；大于 2 时目标反而升高。`,`x^+=x+td=(1-t)x`,'Descent direction 只描述足够小步长的局部行为，不代表任意距离都下降。',lab.values),
      F('5 · Predict and verify',`当前真实目标 f(x+td)=${fmt(after)}，真实下降 ${fmt(8.5-after)}；因为这是精确二次模型，两者与模型预测完全一致。`,`f(x+td)=8.5(1-t)^2,\\quad\\Delta f=8.5(2t-t^2)`,'t=1 时下降最大；t=2 时不变；t>2 时下降量为负，即目标增加。'),
      F('6 · Limits of the example',lab.contrast,'0<t<2\\Rightarrow f(x+td)<f(x)','这个精确区间来自当前二次函数；一般非二次目标还需要 line search 和局部收敛假设。')];}
    const a=admm(8,v),r=a.rounds,first=r[0];
    const fs=[
      F('1 · Split and agree','两块目标各自喜欢 3 和 −1；约束 x=z 要求它们找到共同值。原问题唯一最优共识是 1，目标是 4。','\\min_{x=z}\\tfrac12(x-3)^2+\\tfrac12(z+1)^2','u 是 scaled dual variable；当前从 z⁰=u⁰=0 出发。改变 ρ 会重新计算全部迭代。'),
      F('2 · Update x with old z,u',`当前 ρ=${fmt(v)}；用 z⁰=0,u⁰=0 得到 x¹=${fmt(first.x)}。第一块目标与共识惩罚共同决定新值。`,`x^1=\\frac{3+\\rho(z^0-u^0)}{1+\\rho}\\approx${fmt(first.x)}`,'对 x 子问题求导并置零；这一阶段 z 和 u 仍保持旧值。'),
      F('3 · Update z with fresh x',`立即使用刚得到的 x¹=${fmt(first.x)}，计算 z¹=${fmt(first.z)}。这一步必须使用新 x，而不是旧 x。`,`z^1=\\frac{-1+\\rho(x^1+u^0)}{1+\\rho}\\approx${fmt(first.z)}`,'交替更新的先后顺序是 ADMM 的组成部分，不能随意改为同时更新。'),
      F('4 · Accumulate the residual',`当前 x¹−z¹=${fmt(first.primal)}，因此 u¹=${fmt(first.u)}。下一轮两块子问题都会读取这个修正量。`,`u^1=u^0+x^1-z^1\\approx${fmt(first.u)}`,'这不是简单平均：乘子累计约束违背，持续修正下一轮子问题。'),
      F('5 · Check two stopping signals',`第一轮 |r|=${fmt(Math.abs(first.primal))}，|s|=${fmt(Math.abs(first.dual))}。拆分目标 ${fmt(first.splitObjective)} 不对应一个共识可行点。`,'r^k=x^k-z^k,\\quad s^k=\\rho(z^k-z^{k-1})','即使拆分目标低于 4，也不能宣称改进原问题；x≠z 时违反原始约束。')];
    for(const [k,title] of [[2,'6 · Repeat the full cycle'],[4,'7 · Compare residuals'],[8,'8 · Report finite accuracy']]){const q=r[k-1];fs.push(F(title,`第 ${k} 轮：x=${fmt(q.x)}，z=${fmt(q.z)}，u=${fmt(q.u)}。原始残差和对偶残差必须分别检查，不能仅看某一块是否稳定。`,`|r^{${k}}|\\approx${fmt(Math.abs(q.primal))},\\quad |s^{${k}}|\\approx${fmt(Math.abs(q.dual))}`,'有限轮数给出近似解；停止取决于两个容差，同时可对比不同 ρ 的收敛速度。',[['x',fmt(q.x)],['z',fmt(q.z)],['λ=ρu',fmt(q.lambda)]]));}
    fs.push(F('9 · Verify the limiting KKT system',lab.contrast,'x=z=1,\\quad\\lambda=\\rho u=2,\\quad u=2/\\rho','ρ 改变缩放变量 u 的极限，但不改变原问题解或未缩放的最优乘子 λ。',lab.values));return fs;
  };
  const originalDraw=drawScene;
  drawScene=function(key,index,parameter){
    const v=parameter===undefined?metas[key]?.slider?.value:parameter;
    let p,body='',axes='';
    if(key==='supporting-plane'){const a=supporting(v,-1);p=plot(-2.2,2.2,-4.5,3);axes=p.axes([-2,0,2],[-4,-2,2]);body=p.curve(x=>x*x/2)+p.point([v,v*v/2],'blue',10);
      if(index>=1)body+=p.curve(x=>v*x-v*v/2,-2.2,2.2,'orange');
      if(index>=3)body+=p.line([-1,a.line],[-1,.5],'purple')+p.point([-1,a.line],'purple')+p.point([-1,.5],'blue');
    }else if(key==='projection'){const a=projection([3,4],v,[0,v]);const extent=Math.max(3,v+.5);p=plot(-extent,Math.max(extent,4.5),-extent,Math.max(extent,5),true);axes=p.axes([-2,0,2,4],[-2,2,4],'x₁','x₂');body=p.ellipse([0,0],v,v,'green','rgba(37,115,91,.10)')+p.point(a.v,'orange',11);
      if(index>=1)body+=p.line([0,0],a.v,'muted',true)+p.line(a.v,a.p,'orange')+p.point(a.p,'blue',9);
      if(index>=3&&v<5){const t=[-.8,.6];body+=p.line([a.p[0]-3*t[0],a.p[1]-3*t[1]],[a.p[0]+3*t[0],a.p[1]+3*t[1]],'green',true);}
      if(index>=4)body+=p.point(a.z,'purple')+p.line(a.p,a.z,'purple')+p.line(a.v,a.z,'muted',true);
    }else if(key==='kkt'){const a=kkt([2,2],v);p=plot(-1,4,-1,4,true);axes=p.axes([0,2,4],[2,4],'x₁','x₂');
      const points=[[-1,-1],[4,-1],[4,4],[-1,4]],poly=[];for(let i=0;i<points.length;i++){const A=points[i],B=points[(i+1)%4],ca=A[0]+A[1]-v,cb=B[0]+B[1]-v;if(ca<=0)poly.push(A);if((ca<=0)!==(cb<=0)){const t=ca/(ca-cb);poly.push([A[0]+t*(B[0]-A[0]),A[1]+t*(B[1]-A[1])]);}}if(poly.length)body+=p.path([...poly,poly[0]],'none','rgba(37,115,91,.12)');
      body+=p.line([-1,v+1],[v+1,-1],'green')+p.ellipse([2,2],.5,.5,'orange')+p.point([2,2],'orange',11);
      if(index>=1){if(a.lambda>0)body+=p.ellipse([2,2],Math.sqrt(2)*a.lambda,Math.sqrt(2)*a.lambda,'orange');body+=p.point(a.p,'blue',9);}
      if(index>=2&&a.lambda>0)body+=p.arrow(a.p,a.p.map((x,i)=>x+a.gradient[i]),'blue')+p.arrow(a.p,[2,2],'purple');
    }else if(key==='newton'){const a=newton(),next=a.start.map(x=>(1-v)*x);p=plot(-5,4,-2,2,true);axes=p.axes([-4,-2,0,2,4],[-1,1],'x₁','x₂');[1,3,5,8.5].forEach(c=>body+=p.ellipse([0,0],Math.sqrt(2*c),Math.sqrt(c/4),'green'));body+=p.point(a.start,'orange',10)+p.point([0,0],'green',6);if(index>=1)body+=p.arrow(a.start,a.gd,'orange')+p.point(a.gd,'orange');if(index>=2)body+=p.line(a.start,[0,0],'blue',true);if(index>=3)body+=p.arrow(a.start,next,'blue')+p.point(next,'blue',10);
    }else if(key==='admm'){const a=admm(8,v),k=index>=7?8:index===6?4:index===5?2:1,rounds=a.rounds.slice(0,k);p=plot(0,8.5,-1,3.5);axes=p.axes([0,2,4,6,8],[1,2,3],'iteration k','x, z, λ=ρu');body=p.line([0,1],[8.5,1],'green',true)+p.line([0,2],[8.5,2],'green',true);for(const [field,color,start]of [['x','blue',3],['z','orange',0],['lambda','purple',0]]){const allowed=field==='x'?index>=1:field==='z'?index>=2:index>=3;if(field!=='x')body+=p.point([0,start],color);if(allowed){const pts=[...(field==='x'?[]:[[0,start]]),...rounds.map(r=>[r.k,r[field]])];body+=p.path(pts,color);pts.forEach(q=>body+=p.point(q,color,6));}}
    }else return originalDraw(key,index,parameter);
    return {body,axes};
  };

  // One shared plot region: both views always receive the exact current example state.
  // Keep the SVG as the accessible, offline fallback and as the derivation companion.
  function mountComparison(plotElement,initialModel,options={}) {
    if(!root.document?.createElement||!plotElement?.parentNode)return null;
    const shell=root.document.createElement('div');shell.className='ct-comparison';
    shell.innerHTML='<div class="ct-view-controls" role="group" aria-label="图形视角"><button type="button" data-ct-view="3d" aria-pressed="true">3D 几何</button><button type="button" data-ct-view="2d" aria-pressed="false">2D 推导 / 投影</button></div><p class="ct-view-notice three-model-objective" role="status"></p><div class="ct-3d-host"></div><div class="ct-2d-view" hidden></div><details class="ct-model-notes three-model-note"><summary>图形含义与限制</summary><p></p></details>';
    plotElement.replaceWith(shell);
    const flat=shell.querySelector('.ct-2d-view'),host=shell.querySelector('.ct-3d-host'),notice=shell.querySelector('.ct-view-notice'),buttons=[...shell.querySelectorAll('[data-ct-view]')],notes=shell.querySelector('.ct-model-notes');
    flat.append(plotElement);
    let controller=null,model=initialModel,mode='3d',failed=false,disposed=false;
    const modelDescription=()=>{
      if(options.modelSummary){
        if(model?.key==='convex-chord')return '3D 扩展为 F(x₁,x₂)=x₁²+x₂²；x₂=0 截面对应上方原题。';
        if(model?.key==='supporting-plane')return '3D 扩展为 F(x₁,x₂)=(x₁²+x₂²)/2；x₂=0 截面对应上方原题。';
        if(model?.key==='prox')return '3D 第二坐标 v 是输入参数；原题固定 v=2.4，脊线比较不同输入的最优解。';
        if(model?.key==='admm')return '3D 底面坐标为 x、z；共识线 x=z 对应上方约束，曲面高度表示拆分目标。';
        return '3D 曲面高度表示上方目标；底面坐标是优化变量。';
      }
      return ['convex-chord','supporting-plane'].includes(model?.key)?'二维函数扩展示意，x₂=0 对应正文。'+model.objective:model?.objective;
    };
    function fail(reason) {
      if(failed||disposed)return;
      failed=true;mode='2d';
      if(controller){const old=controller;controller=null;old.dispose();}
      if(options.onUnavailable)options.onUnavailable();
      host.hidden=true;flat.hidden=false;notes.hidden=true;
      buttons[0].disabled=true;buttons[0].setAttribute('aria-pressed','false');buttons[1].setAttribute('aria-pressed','true');
      notice.textContent='3D 暂不可用：'+(reason||'此设备无法创建 WebGL 图形')+'。已保留同一算例的完整 2D 图解。';
    }
    function show(next) {
      if(disposed||next==='3d'&&failed)return;
      mode=next;host.hidden=mode!=='3d';flat.hidden=mode!=='2d';
      buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ctView===mode)));
      notes.hidden=mode!=='3d';notes.querySelector('p').textContent=model?.note||'';
      notice.textContent=mode==='3d'?(modelDescription()||'拖动旋转 · 滚轮缩放；参数与步骤同步。'):'同一参数、同一步骤的 2D 推导与投影；可随时返回 3D。';
      if(mode==='3d') {
        try {
          if(!root.ConvexThree?.mount||!model){fail('离线 3D 组件未载入');return;}
          if(!controller){controller=root.ConvexThree.mount(host,model);if(!controller||controller.available===false){const reason=controller?.reason;controller?.dispose();controller=null;fail(reason);return;}}
          else controller.update(model);
        }catch(error){fail(error.message);}
      }
    }
    const click=event=>{const button=event.target.closest('[data-ct-view]');if(button)show(button.dataset.ctView);};
    const lost=event=>fail(event.detail?.reason||'图形上下文已中断');
    shell.addEventListener('click',click);host.addEventListener('convex-three-unavailable',lost);
    show('3d');
    return {element:shell,update(next){model=next;if(!disposed&&!failed){notes.querySelector('p').textContent=model?.note||'';if(mode==='3d')notice.textContent=modelDescription()||'';}if(!disposed&&!failed&&controller){try{controller.update(model);}catch(error){fail(error.message);}}},replaceFallback(node){flat.replaceChildren(node);},dispose(){if(disposed)return;disposed=true;shell.removeEventListener('click',click);host.removeEventListener('convex-three-unavailable',lost);if(controller)controller.dispose();controller=null;}};
  }

  const modelSummaries={
    'convex-chord':[String.raw`f(x)=x^2`,String.raw`x_0=0,\ x_1=2`,String.raw`x_\theta=2\theta`],
    'supporting-plane':[String.raw`f(x)=\tfrac12x^2`,String.raw`\text{切点 }a`,String.raw`\text{检验点 }x=-1`],
    projection:[String.raw`\min_x\ \tfrac12\|x-v\|_2^2`,String.raw`\|x\|_2\le R`,String.raw`v=(3,4)`],
    kkt:[String.raw`\min_x\ \tfrac12\|x-(2,2)\|_2^2`,String.raw`x_1+x_2\le b`],
    gradient:[String.raw`\min_x f(x)`,String.raw`f(x)=\tfrac12x_1^2+4x_2^2`,String.raw`x^0=(2.5,1)`,String.raw`L=8`],
    prox:[String.raw`\min_u\ q(u)+\lambda|u|`,String.raw`q(u)=\tfrac12(u-2.4)^2`,String.raw`\lambda\ge0`],
    newton:[String.raw`\min_x f(x)`,String.raw`f(x)=\tfrac12x_1^2+4x_2^2`,String.raw`x^0=(3,1)`,String.raw`x^+=x+td`],
    admm:[String.raw`\min_{x=z}\ f(x)+g(z)`,String.raw`f(x)=\tfrac12(x-3)^2`,String.raw`g(z)=\tfrac12(z+1)^2`,String.raw`z^0=u^0=0`,String.raw`\rho>0`]
  };
  function summaryHTML(key){return modelSummaries[key].map(tex=>'<span class="ca-model-term">'+(root.CourseMath?.render?root.CourseMath.render(tex):escape(tex))+'</span>').join('');}

  let sequence=0;
  function mount(element,key,context) {
    if(!element||typeof element.querySelector!=='function')throw new TypeError('需要一个 DOM 元素');
    if(element.__convexAnimationCleanup)element.__convexAnimationCleanup();
    if(!metas[key]) {element.textContent='此主题暂时没有独立动画，请阅读正文中的分步推导。';return()=>{};}
    const meta=metas[key],id='convex-scene-'+(++sequence), reduced=typeof root.matchMedia==='function'&&root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let parameter=meta.slider?meta.slider.value:undefined,frames=getFrames(key,parameter),index=0,timer=null,playing=false,disposed=false;
    element.classList.add('ca-root');
    element.innerHTML=`<section class="ca-teaching" aria-label="${escape(meta.title)}"><details class="ca-model"><summary>模型与对比情形 · Model</summary><h4 class="ca-title">${escape(meta.title)}</h4>${context?`<p class="ca-context">${escape(context)}</p>`:''}<p class="ca-intro">${escape(meta.intro)}</p><div class="ca-cases" aria-label="对比参数情形">${cases[key].map(([v,label])=>`<button type="button" data-case="${v}">${escape(label)}</button>`).join('')}</div><ul class="ca-legend">${meta.legend.map(([color,text])=>`<li><span style="--ca-key:${C[color]}" aria-hidden="true"></span>${escape(text)}</li>`).join('')}</ul></details><div class="ca-model-summary" aria-label="当前算例的目标与条件">${summaryHTML(key)}</div><label class="ca-slider">${escape(meta.slider.label)} <output for="${id}-parameter">${fmt(parameter)}</output><input id="${id}-parameter" type="range" min="${meta.slider.min}" max="${meta.slider.max}" step="${meta.slider.step}" value="${meta.slider.value}"></label><div class="ca-controls"><button type="button" data-ca="play" aria-pressed="false">播放</button><button type="button" data-ca="prev">← 上一步</button><button type="button" data-ca="next">下一步 →</button><button type="button" data-ca="reset">重置</button></div><div class="ca-progress-row"><span class="ca-count"></span><progress max="${frames.length-1}" value="0" aria-label="图解讲解进度"></progress></div><p class="ca-play-state"></p><div class="ca-svg-scroll" tabindex="0" role="region" aria-label="当前步骤的数学图形"><svg viewBox="0 0 720 540" role="img" aria-labelledby="${id}-svg-title ${id}-svg-desc"><title id="${id}-svg-title"></title><desc id="${id}-svg-desc"></desc><defs><clipPath id="${id}-clip"><rect x="75" y="44" width="596" height="402"/></clipPath></defs><g class="ca-shapes" clip-path="url(#${id}-clip)"></g><g class="ca-axes"></g></svg></div><div class="ca-explanation" aria-live="polite" aria-atomic="true"><h5 class="ca-stage-title"></h5><div class="ca-formula" tabindex="0" aria-label="当前步骤公式"></div><dl class="ca-values"></dl><div class="ca-step-discussion"><p class="ca-caption"></p><p class="ca-reason"></p></div></div><details class="ca-laboratory"><summary>参数的最终结果与反例 · Compare</summary><p class="ca-rule"></p><dl class="ca-live-values"></dl><p class="ca-contrast"></p><p class="ca-footnote">参数变化会重算全部步骤，并切到结果检验。图形与当前步骤同步；本面板显示同一参数的最终结果。小数保留至多四位。</p></details></section>`;
    const $=s=>element.querySelector(s),btnPlay=$('[data-ca="play"]'),btnPrev=$('[data-ca="prev"]'),btnNext=$('[data-ca="next"]'),btnReset=$('[data-ca="reset"]'),slider=$('input');
    const modelForView=()=>root.ConvexThreeModels?.build({key,step:index,value:parameter});
    const comparison=mountComparison($('.ca-svg-scroll'),modelForView(),{onUnavailable:stop,modelSummary:true});
    function stop() {if(timer!==null){root.clearTimeout(timer);timer=null;}playing=false;syncControls();}
    function syncControls() {btnPlay.textContent=playing?'暂停':index===frames.length-1?'重新播放':'播放讲解';btnPlay.setAttribute('aria-pressed',String(playing));btnPrev.disabled=index===0;btnNext.disabled=index===frames.length-1;$('.ca-play-state').textContent=playing?`正在逐步讲解；可随时暂停。${reduced?'已遵循减少动态效果设置。':''}`:index===frames.length-1?'已讲到最后一步。可以重播，或回看任意前一步。':'当前已暂停。按“播放讲解”连续展开，或按“下一步”自行推进。';}
    function render() {
      if(disposed)return;
      if(element.querySelectorAll)element.querySelectorAll('[data-case]').forEach(button=>button.setAttribute('aria-pressed',String(Math.abs(Number(button.getAttribute('data-case'))-parameter)<1e-9)));
      const f=frames[index],drawing=drawScene(key,index,parameter),lab=laboratory(key,parameter);
      $('.ca-rule').textContent=lab.rule;$('.ca-contrast').textContent=lab.contrast;$('.ca-live-values').innerHTML=lab.values.map(([name,value])=>`<div><dt>${escape(name)}</dt><dd>${escape(value)}</dd></div>`).join('');
      $('.ca-shapes').innerHTML=drawing.body;$('.ca-axes').innerHTML=drawing.axes;$('#'+id+'-svg-title').textContent=meta.title+'：'+f.title;$('#'+id+'-svg-desc').textContent=f.caption+' '+f.reason;
      $('.ca-stage-title').textContent=f.title;$('.ca-caption').textContent=f.caption;
      const formula=$('.ca-formula');formula.textContent='\\['+f.formula+'\\]';
      if(typeof root.renderMathInElement==='function'){try{root.renderMathInElement(formula);}catch(_){formula.textContent=f.formula;}}
      $('.ca-reason').textContent='为什么：'+f.reason;$('.ca-values').innerHTML=f.values.map(([name,value])=>`<div><dt>${escape(name)}</dt><dd>${escape(value)}</dd></div>`).join('');$('.ca-values').hidden=f.values.length===0;
      $('.ca-count').textContent=`第 ${index+1} / ${frames.length} 步`;$('progress').value=index;
      if(!reduced){$('.ca-shapes').classList.remove('ca-enter');void $('.ca-shapes').getBoundingClientRect();$('.ca-shapes').classList.add('ca-enter');}
      if(comparison)comparison.update(modelForView());
      syncControls();
    }
    function schedule() {if(!playing||disposed)return;timer=root.setTimeout(()=>{timer=null;if(!element.isConnected){stop();return;}if(index<frames.length-1){index++;render();}if(index===frames.length-1){stop();return;}schedule();},Math.min(13500,Math.max(8500,frames[index].caption.length*65+4500)));}
    const onPlay=()=>{if(playing){stop();return;}if(index===frames.length-1)index=0;playing=true;render();schedule();};
    const onPrev=()=>{stop();index=Math.max(0,index-1);render();};
    const onNext=()=>{stop();index=Math.min(frames.length-1,index+1);render();};
    const onReset=()=>{stop();index=0;if(slider){parameter=meta.slider.value;slider.value=String(parameter);$('output').textContent=fmt(parameter);frames=getFrames(key,parameter);}render();};
    const onInput=()=>{stop();parameter=Number(slider.value);$('output').textContent=fmt(parameter);frames=getFrames(key,parameter);index=Math.min(key==='admm'?7:key==='gradient'?5:4,frames.length-1);render();};
    const onCase=event=>{const button=event.target.closest?.('[data-case]');if(!button)return;slider.value=button.getAttribute('data-case');onInput();};
    element.addEventListener('click',onCase);
    const onVisibility=()=>{if(root.document&&root.document.hidden&&playing)stop();};
    btnPlay.addEventListener('click',onPlay);btnPrev.addEventListener('click',onPrev);btnNext.addEventListener('click',onNext);btnReset.addEventListener('click',onReset);if(slider)slider.addEventListener('input',onInput);if(root.document)root.document.addEventListener('visibilitychange',onVisibility);
    const cleanup=()=>{if(disposed)return;stop();disposed=true;if(comparison)comparison.dispose();btnPlay.removeEventListener('click',onPlay);btnPrev.removeEventListener('click',onPrev);btnNext.removeEventListener('click',onNext);btnReset.removeEventListener('click',onReset);if(slider)slider.removeEventListener('input',onInput);if(root.document)root.document.removeEventListener('visibilitychange',onVisibility);element.removeEventListener('click',onCase);delete element.__convexAnimationCleanup;};
    element.__convexAnimationCleanup=cleanup;render();return cleanup;
  }
  const api={mount,mountComparison,modelSummaries,compute,getFrames,drawScene,laboratory,cases,keys:Object.keys(metas),version:'2.0.0'};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ConvexAnimations=api;
})(typeof window!=='undefined'?window:globalThis);
