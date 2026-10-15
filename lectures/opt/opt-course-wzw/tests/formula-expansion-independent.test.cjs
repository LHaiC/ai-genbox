'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const lessons=[1,2,3].flatMap(n=>JSON.parse(fs.readFileSync(path.join(root,`content/part${n}.json`),'utf8'))).flatMap(m=>m.lessons);
const providers=['foundations','algorithms','advanced'].map(n=>require(`../assets/formula-models-${n}.js`));
function point(p,label){assert.ok(Array.isArray(p)&&p.length===3,label+' coordinate triple');p.forEach(x=>assert.ok(Number.isFinite(x),label+' finite coordinate'));}
function inspect(m,id){
 assert.ok(m&&m.title&&m.objective,id+' labeled model');
 assert.equal(m.axisLabels.length,3,id+' axes');
 assert.ok(m.note&&m.note.length>15,id+' interpretation caveat');
 assert.ok(m.domain.length===2,id+' domain');
 m.domain.forEach(r=>assert.ok(r.length===2&&r.every(Number.isFinite)&&r[1]>r[0],id+' ordered domain'));
 const samples=[];
 for(const s of m.surfaces||[]){const d=s.domain||m.domain;for(let i=0;i<=8;i++)for(let j=0;j<=8;j++){
  const x=d[0][0]+(d[0][1]-d[0][0])*i/8,y=d[1][0]+(d[1][1]-d[1][0])*j/8,z=s.f(x,y);assert.ok(Number.isFinite(z),id+' finite sampled surface '+s.name+' at '+x+','+y);samples.push(z);
 }}
 for(const p of m.points||[])point(p.position,id);
 for(const p of m.paths||[])for(const q of p.points)point(q,id);
 for(const s of m.solids||[]){s.vertices.forEach(p=>point(p,id));s.faces.flat().forEach(i=>assert.ok(Number.isInteger(i)&&i>=0&&i<s.vertices.length,id+' solid index'));}
 for(const a of m.arrows||[]){point(a.from,id);point(a.to,id);}
 for(const v of m.metrics||[])if(typeof v.value==='number')assert.ok(Number.isFinite(v.value),id+' finite metric');
 assert.ok(samples.length+(m.points||[]).length+(m.paths||[]).length+(m.solids||[]).length>0,id+' nonempty geometry');
 return JSON.stringify({samples,points:m.points,paths:m.paths,solids:m.solids,arrows:m.arrows});
}
test('Independent: all 34 lessons expose a complete formula-model catalog',()=>{
 const ids=providers.flatMap(p=>Object.keys(p.catalog));
 assert.equal(new Set(ids).size,34);assert.equal(ids.length,34);
 assert.deepEqual([...ids].sort(),lessons.map(l=>l.id).sort());
 for(const l of lessons){const p=providers.find(p=>p.catalog[l.id]),c=p.catalog[l.id];assert.equal(c.proofCount,l.proof.length,l.id+' proof count');assert.equal(c.stages.length,l.proof.length,l.id+' stages');assert.ok(c.parameter.min<=c.parameter.value&&c.parameter.value<=c.parameter.max,l.id+' default bounds');assert.ok(c.parameter.step>0,l.id+' positive step');}
});
test('Independent: every catalog proof stage and exposed parameter grid stays finite',()=>{
 let count=0;
 for(const p of providers)for(const [id,c]of Object.entries(p.catalog)){
  const {min,max,step,value}=c.parameter;
  const values=[...new Set([min,max,value,...Array.from({length:Math.floor((max-min)/step)+1},(_,i)=>Number((min+i*step).toPrecision(12)))])];
  assert.ok(values.length<1001,id+' bounded UI parameter grid');
  const signatures=new Set();
  for(let stage=0;stage<c.proofCount;stage++)for(const value of values){const m=p.get(id,stage,value);signatures.add(inspect(m,id+' stage '+stage+' parameter '+value));count++;}
  assert.ok(signatures.size>1,id+' controls produce a geometric change');
 }
 assert.ok(count>=258,'all proof stages tested');
 console.log('Independently inspected '+count+' formula model states.');
});
test('Independent: 195 selected illustration slots preserve all 258 proof steps exactly once',()=>{
 const vm=require('node:vm');
 const map=JSON.parse(fs.readFileSync(path.join(root,'content/formula-visual-map.json'),'utf8'));
 let figureCount=0;
 const modules=[1,2,3].flatMap(n=>JSON.parse(fs.readFileSync(path.join(root,`content/part${n}.json`),'utf8')));
 const context={window:{CONVEX_COURSE:modules,FormulaModelsFoundations:providers[0],FormulaModelsAlgorithms:providers[1],FormulaModelsAdvanced:providers[2]},localStorage:{getItem:()=>null},Map,Set};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'assets/formula-figures.js'),'utf8'),context);
 const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
 vm.runInContext(app.slice(0,app.indexOf('function sources()'))+'\nwindow.renderLessons=()=>lessons.map(l=>({id:l.id,html:lessonView(l)}));})();',context);
 let count=0;
 for(const {id,html} of context.window.renderLessons()){
  const l=lessons.find(x=>x.id===id);
  assert.equal((html.match(/class="proof-article"/g)||[]).length,1,id);
  assert.equal((html.match(/class="proof-step"/g)||[]).length,l.proof.length,id);
  const expected=map.entries.filter(e=>e.lessonId===id&&e.renderInline).map(e=>e.proofIndex);
  assert.equal((html.match(/class="formula-figure"/g)||[]).length,expected.length,id);figureCount+=expected.length;
  assert.equal((html.match(/data-figure-index="\d+" open/g)||[]).length,2,id+' two default-open figures');
  assert.deepEqual([...html.matchAll(/data-figure-index="(\d+)"/g)].map(x=>+x[1]),expected,id+' figure step order');
  assert.ok(!/proof-player|proof-workbench|full-proof|data-mode/.test(html));
  count+=l.proof.length;
 }
 assert.equal(count,258);assert.equal(figureCount,195);
});
test('Independent: selected exact examples agree with original lesson numbers and certificates',()=>{
 const [F,A,V]=providers,close=(x,y)=>assert.ok(Math.abs(x-y)<1e-8,`${x} != ${y}`);
 close(F.get('m1-l3',5,.1).data.change,-1.64);
 close(F.get('m1-l3',5,1).data.change,16);
 close(F.get('m2-l2',3,.25).data.gap,.75);
 const support=F.get('m2-l3',2,.25);close(support.surfaces[0].f(-2,0)-support.surfaces[1].f(-2,0),9);
 assert.deepEqual(F.get('m3-l4',6,.25).data.p,[1,0]);
 const kkt=A.get('m4-l4',0,1/3);assert.deepEqual(kkt.data.x,[2,0]);close(kkt.data.lambda,1);close(kkt.data.value,1);
 const gd=A.get('m5-l1',4,3/11);close(gd.data.t,1/9);close(gd.data.after,32/9);close(gd.data.upper,4);
 const threshold=A.get('m6-l2',5,.5);threshold.data.outputs.forEach((v,i)=>close(v,[2.5,0,.5,-1.5][i]));close(threshold.data.total,5.41);
 const lasso=A.get('m6-l4',7,0);close(lasso.data.primal,3.705);close(lasso.data.dual,2.5512);close(lasso.data.gap,1.1538);
 const b=V.get('m7-l2',3,2/7);close(b.data.t,2);close(b.data.x,(1+Math.sqrt(3))/2);close(b.data.primal-b.data.dual,.5);
 const rounds=V.math.admm(2);assert.deepEqual(rounds[0].x,[1.5,1]);assert.deepEqual(rounds[0].z,[1.25,.75]);close(rounds[0].objective,.40625);close(rounds[1].objective,.425);
 for(let j=1;j<=12;j++){const x=V.math.pg(j).at(-1);close(x[0],1.2-.2*(3/8)**j);close(V.math.F(...x)-.4,.1*(9/64)**j);}
 for(const t of [.5,1,2,16,512]){const c=V.math.center(t),x=c.x,lambda=c.lambda,eta=c.eta;assert.ok(x[0]>0&&x[1]>0&&c.slack>0);close(lambda*c.slack,1/t);close(eta[0]*x[0],1/t);close(eta[1]*x[1],1/t);c.stationarity.forEach(v=>close(v,0));close(c.primal-c.dual,3/t);}
});
test('Independent: annotated points remain inside declared display-domain framing',()=>{
 for(const provider of providers)for(const [id,c] of Object.entries(provider.catalog))for(let i=0;i<c.proofCount;i++)for(const value of [c.parameter.min,c.parameter.value,c.parameter.max]){
  const m=provider.get(id,i,value);for(const p of m.points||[])p.position.slice(0,2).forEach((q,j)=>assert.ok(q>=m.domain[j][0]-1e-9&&q<=m.domain[j][1]+1e-9,`${id}:${i} ${p.label} coordinate ${j} outside display domain`));
 }
});
