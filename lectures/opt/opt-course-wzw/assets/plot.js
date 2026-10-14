/* Computation-driven SVG renderer. Marching squares interpolates evaluated function values;
   it never fabricates numerical samples. Axis units are equal for geometric scenes. */
(function(root){'use strict';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let serial=0;
function number(v){if(!Number.isFinite(v))return String(v);if(v===0)return '0';if(Math.abs(v)<.001||Math.abs(v)>=1e4)return v.toExponential(2);return +v.toFixed(3)+'';}
function draw(container,scene,name){
 const available=container.getBoundingClientRect().width||760,W=Math.max(250,Math.round(available)),H=W<560?420:490,b=scene.bounds,[xmin,xmax,ymin,ymax]=b;
 let left=W<560?80:98,top=40,width=W-(W<560?98:126),height=H-116;
 const equal=['norms','modeling','gradient','newton','bfgs','trustsub','trust','alm','groupprox','proxgrad','fista','ppa','bcd','pdhg','admm','semismooth','manifold','frankwolfe','mirror','nuclear'].includes(name)||scene.equal===true;
 if(equal){const scale=Math.min(width/(xmax-xmin),height/(ymax-ymin)),nw=(xmax-xmin)*scale,nh=(ymax-ymin)*scale;left+=(width-nw)/2;top+=(height-nh)/2;width=nw;height=nh;}
 const X=x=>left+(x-xmin)/(xmax-xmin)*width,Y=y=>top+(ymax-y)/(ymax-ymin)*height;
 const id='clip-'+(++serial);let a=[`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(name)}：由当前参数和算法状态计算的图。下方数值表提供可读结果。"><title>${esc(name)} 实际计算图</title><defs><clipPath id="${id}"><rect x="${left}" y="${top}" width="${width}" height="${height}"/></clipPath></defs>`];
 const ticks=W<560?2:4;for(let i=0;i<=ticks;i++){const x=xmin+(xmax-xmin)*i/ticks,y=ymin+(ymax-ymin)*i/ticks;a.push(`<line class="grid" x1="${X(x)}" x2="${X(x)}" y1="${top}" y2="${top+height}"/><text x="${X(x)}" y="${top+height+35}" text-anchor="middle">${number(x)}</text><line class="grid" x1="${left}" x2="${left+width}" y1="${Y(y)}" y2="${Y(y)}"/><text x="${left-10}" y="${Y(y)+8}" text-anchor="end">${number(y)}</text>`);}
 a.push(`<rect class="axis" fill="none" x="${left}" y="${top}" width="${width}" height="${height}"/><g clip-path="url(#${id})">`);
 for(const q of scene.polygons||[])a.push(`<polygon class="${q.style||'feasible'}" points="${q.pts.map(p=>X(p[0])+','+Y(p[1])).join(' ')}"/>`);
 if(scene.surface){
  const nx=80,ny=54,grid=Array.from({length:ny+1},(_,j)=>Array.from({length:nx+1},(_,i)=>scene.surface([xmin+i*(xmax-xmin)/nx,ymin+j*(ymax-ymin)/ny])));
  for(const level of scene.contours||[]){let d='';
   for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const ps=[[i,j],[i+1,j],[i+1,j+1],[i,j+1]],vs=ps.map(([u,v])=>grid[v][u]);if(!vs.every(Number.isFinite))continue;
    const hits=[];for(let k=0;k<4;k++){let n=(k+1)%4;if((vs[k]>=level)===(vs[n]>=level))continue;let t=(level-vs[k])/(vs[n]-vs[k]);let u=ps[k][0]+t*(ps[n][0]-ps[k][0]),v=ps[k][1]+t*(ps[n][1]-ps[k][1]);hits.push([X(xmin+u*(xmax-xmin)/nx),Y(ymin+v*(ymax-ymin)/ny)]);}
    if(hits.length===2)d+=`M${hits[0][0].toFixed(2)},${hits[0][1].toFixed(2)}L${hits[1][0].toFixed(2)},${hits[1][1].toFixed(2)}`;
    else if(hits.length===4){const high=scene.surface([xmin+(i+.5)*(xmax-xmin)/nx,ymin+(j+.5)*(ymax-ymin)/ny])>=level;const pairs=high===(vs[0]>=level)?[[0,1],[2,3]]:[[0,3],[1,2]];for(const [u,v]of pairs)d+=`M${hits[u][0]},${hits[u][1]}L${hits[v][0]},${hits[v][1]}`;}
   }if(d)a.push(`<path class="contour" d="${d}"><title>f = ${esc(number(level))}</title></path>`);
  }
 }
 const all=[...(scene.curves||[]),...(scene.segments||[]),...(scene.paths||[])];
 for(const q of all){let d='',pen=false;for(const p of q.pts||[]){if(!p||!p.every(Number.isFinite)||Math.abs(p[0])>1e14||Math.abs(p[1])>1e14){pen=false;continue;}d+=(pen?'L':'M')+X(p[0]).toFixed(2)+','+Y(p[1]).toFixed(2);pen=true;}if(d)a.push(`<path class="${q.style||'primary'}" d="${d}" stroke-width="${q.style==='muted'?1.3:2.4}" ${q.style==='muted'||q.dashed?'stroke-dasharray="7 6"':''}><title>${esc(q.label||'')}</title></path>`);}
 for(const q of scene.points||[]){if(!q.x?.every(Number.isFinite))continue;a.push(`<circle class="${q.style||'primary'}" cx="${X(q.x[0])}" cy="${Y(q.x[1])}" r="5.3" stroke-width="2"><title>${esc(q.label||'')} (${number(q.x[0])}, ${number(q.x[1])})</title></circle>`);}
 a.push('</g>');let occupied=[];
 for(const [i,q]of(scene.points||[]).entries()){if(!q.label||!q.x?.every(Number.isFinite)||q.x[0]<xmin||q.x[0]>xmax||q.x[1]<ymin||q.x[1]>ymax)continue;let x=Math.min(left+width-15,Math.max(left+15,X(q.x[0])+16)),y=Math.min(top+height-8,Math.max(top+24,Y(q.x[1])-16));for(let tries=0;tries<3&&occupied.some(p=>Math.abs(p[0]-x)<30&&Math.abs(p[1]-y)<26);tries++)y=Math.max(top+24,y-28);occupied.push([x,y]);a.push(`<text class="point-label" x="${x}" y="${y}" text-anchor="middle">${i+1}</text>`);}
 a.push(`<g class="plot-cross" visibility="hidden"><line class="axis" id="cx" y1="${top}" y2="${top+height}" stroke-dasharray="3 3"/><line class="axis" id="cy" x1="${left}" x2="${left+width}" stroke-dasharray="3 3"/></g></svg>`);
 container.innerHTML=a.join('');const svg=container.querySelector('svg');const host=container.parentElement;let labels=host.querySelector('.plot-axis-labels');if(!labels){labels=document.createElement('div');labels.className='plot-axis-labels';host.insertBefore(labels,container);}labels.innerHTML=`<span>横轴：${esc(scene.xlabel||'第一分量')}</span><span>纵轴：${esc(scene.ylabel||'第二分量')}</span>`;let key=host.querySelector('.plot-point-key');if(!key){key=document.createElement('div');key.className='plot-point-key';container.after(key);}key.innerHTML=(scene.points||[]).map((q,i)=>q.label&&q.x?.every(Number.isFinite)?`<p><strong>${i+1}.</strong> ${esc(q.label)}<br>(${number(q.x[0])}, ${number(q.x[1])})</p>`:'').join('');let legend=host.querySelector('.plot-legend');if(legend){const seen=new Set();legend.innerHTML=all.filter(q=>q.label&&!seen.has(q.label)&&seen.add(q.label)).slice(0,8).map(q=>`<span class="${q.style||'primary'} ${q.dashed?'dashed':''}">${esc(q.label)}</span>`).join('');}
 let note=host.querySelector('.plot-footnote');if(note)note.textContent=[...(scene.notes||[]),scene.surface?'淡线为实际函数值等高线；指向图内可读取坐标和 f 值。':'点与线均由当前公式 / 迭代状态计算。',equal?'几何坐标轴使用相同比例。':''].filter(Boolean).join(' ');
 svg.addEventListener('pointermove',ev=>{const rect=svg.getBoundingClientRect(),px=(ev.clientX-rect.left)/rect.width*W,py=(ev.clientY-rect.top)/rect.height*H,g=svg.querySelector('.plot-cross');if(px<left||px>left+width||py<top||py>top+height){g.setAttribute('visibility','hidden');return;}const x=xmin+(px-left)/width*(xmax-xmin),y=ymax-(py-top)/height*(ymax-ymin);g.setAttribute('visibility','visible');const vx=g.querySelector('#cx'),vy=g.querySelector('#cy');vx.setAttribute('x1',px);vx.setAttribute('x2',px);vy.setAttribute('y1',py);vy.setAttribute('y2',py);const out=host.querySelector('.plot-inspect');if(out)out.textContent=`坐标 (${number(x)}, ${number(y)})${scene.surface?' · f = '+number(scene.surface([x,y])):''}`;});
 svg.addEventListener('pointerleave',()=>svg.querySelector('.plot-cross').setAttribute('visibility','hidden'));
}
root.OptPlot={draw,number};
})(globalThis);
