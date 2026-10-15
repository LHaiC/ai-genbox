'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const modules=[1,2,3].flatMap(n=>JSON.parse(fs.readFileSync(path.join(root,`content/part${n}.json`),'utf8')));
const lessons=modules.flatMap(m=>m.lessons);
const katex=require('../assets/katex.min.js');
const english=/\b[A-Za-z][A-Za-z-]{2,}\b/;
const chinese=/[\u3400-\u9fff]/;
const clean=s=>s.replace(/\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g,'');

test('All 34 lessons and 258 proof stages carry bilingual titles, retaining complete content',()=>{
 assert.equal(modules.length,8);assert.equal(lessons.length,34);
 assert.equal(lessons.reduce((n,l)=>n+l.proof.length,0),258);
 for(const lesson of lessons){
  assert.ok(english.test(lesson.title)&&chinese.test(lesson.title),lesson.id+' title must carry English and Chinese');
  for(const step of lesson.proof)assert.ok(english.test(step.title)&&chinese.test(step.title),lesson.id+': '+step.title);
  assert.ok(english.test(clean(lesson.formal+' '+lesson.intuition)),lesson.id+' technical English must occur in explanatory text, not only TeX');
 }
});

test('Every lesson retains a nonempty symbol glossary with valid mathematical symbols',()=>{
 for(const lesson of lessons){
  assert.ok(lesson.symbols.length>0,lesson.id);
  const symbols=new Set();
  for(const entry of lesson.symbols){
   assert.ok(entry.meaning.trim().length>1,lesson.id+' '+entry.symbol);
   assert.ok(!symbols.has(entry.symbol),lesson.id+' duplicate symbol '+entry.symbol);symbols.add(entry.symbol);
   const raw=entry.symbol.replace(/^\\[([]/, '').replace(/\\[)\]]$/, '');
   katex.renderToString(raw,{throwOnError:true,strict:'error',trust:false});
  }
 }
});

test('Terminology remains English-searchable across the major mathematical topics',()=>{
 const all=lessons.map(l=>JSON.stringify(l)).join('\n');
 for(const term of ['convex','gradient','Hessian','subgradient','projection','normal cone','conjugate','duality','Slater','KKT','Lipschitz','condition number','proximal','soft','Newton','barrier','ADMM'])
  assert.ok(all.toLowerCase().includes(term.toLowerCase()),'Missing English technical term: '+term);
});

test('Added bilingual prose has balanced math delimiters and no accidental nested annotation in TeX',()=>{
 function visit(x,loc){
  if(typeof x==='string'){
   const stripped=x.replace(/\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g,'');
   assert.ok(!/\\[()[\]]/.test(stripped),loc+' unmatched math delimiter');
   for(const match of x.matchAll(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g))katex.renderToString(match[1]??match[2],{throwOnError:true,strict:'error',trust:false});
  }else if(Array.isArray(x))x.forEach((v,i)=>visit(v,loc+'['+i+']'));
  else if(x&&typeof x==='object')for(const [k,v] of Object.entries(x))visit(v,loc+'.'+k);
 }
 modules.forEach(m=>visit(m,m.id));
});
