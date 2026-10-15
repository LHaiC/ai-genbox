'use strict';
// Rendering regressions for the sequential reading edition. Browser screenshots remain a separate check.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const modules=[1,2,3].flatMap(n=>JSON.parse(fs.readFileSync(path.join(root,`content/part${n}.json`),'utf8')));
const baseline=JSON.parse(fs.readFileSync(path.join(root,'reports/flat-reading-content-baseline.json'),'utf8'));
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
function renderer(){
 const context={window:{CONVEX_COURSE:modules},localStorage:{getItem:()=>null},Map,Set};
 vm.createContext(context);
 vm.runInContext(app.slice(0,app.indexOf('function sources()'))+'\nwindow.renderLessons=()=>lessons.map(l=>({id:l.id,html:lessonView(l)}));})();',context);
 return context.window.renderLessons();
}
test('Flat edition retains all modules, lesson fields, symbols and 258 ordered proof stages',()=>{
 assert.equal(modules.length,8);
 assert.equal(modules.flatMap(m=>m.lessons).length,34);
 let stages=0;
 for(const m of modules){
  const prior=baseline[m.id]; assert.ok(prior,m.id);
  assert.deepEqual(m.lessons.map(l=>l.id),prior.lessons.map(l=>l.id));
  for(const l of m.lessons){
   const b=prior.lessons.find(x=>x.id===l.id);
   assert.deepEqual(Object.keys(l).sort(),b.keys,l.id+' content fields');
   assert.equal(l.symbols.length,b.symbols,l.id+' glossary');
   assert.deepEqual(l.proof.map(p=>p.title),b.proof_titles,l.id+' proof order');
   assert.equal(l.proof.length,b.proof_steps,l.id+' proof count');stages+=l.proof.length;
   for(const p of l.proof)for(const k of ['body','formula','reason'])assert.ok(typeof p[k]==='string'&&p[k].trim(),l.id+' '+k);
   assert.ok(l.example.steps.length&&l.checks.length&&l.pitfalls.length,l.id+' supporting content');
  }
 }
 assert.equal(stages,258);
});
test('Every proof is directly visible once with no duplicate player or mode gate',()=>{
 for(const {id,html} of renderer()){
  const l=modules.flatMap(m=>m.lessons).find(x=>x.id===id);
  assert.equal((html.match(/class="proof-article"/g)||[]).length,1,id);
  assert.equal((html.match(/class="proof-step"/g)||[]).length,l.proof.length,id);
  assert.deepEqual([...html.matchAll(/data-proof-index="(\d+)"/g)].map(x=>+x[1]),Array.from({length:l.proof.length},(_,i)=>i),id);
  assert.ok(!/proof-player|proof-workbench|full-proof|data-proof-step|data-mode|proof-play/.test(html),id+' removed redundant UI');
  assert.ok(!/<details[^>]*>[\s\S]*class="proof-article"/.test(html),id+' proof cannot be gated');
  const order=['intro-copy','formal-block','symbol-note','proof-section','example-section','check-list','pitfalls','lesson-source'];
  const indices=order.map(x=>html.indexOf(x));assert.ok(indices.every((n,i)=>n>=0&&(!i||n>indices[i-1])),id+' logical order');
  assert.ok(!html.includes('diagram-column'),id+' old hero diagram removed in favor of proof-local figures');
 }
});
test('Standard type is 18px and renderer does not force prose newlines into line breaks',()=>{
 assert.ok(/state\.large\s*\?\s*['"]\d+px['"]\s*:\s*['"]18px['"]/.test(app),'18px standard type');
 assert.ok(!app.includes("replace(/\\n/g,'<br>')"),'single prose newlines should flow naturally');
});
