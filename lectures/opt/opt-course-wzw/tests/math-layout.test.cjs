'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),katex=require(root+'/assets/katex.min.js');let checked=0;
for(let i=1;i<=3;i++)for(const m of JSON.parse(fs.readFileSync(root+'/content/part'+i+'.json')))for(const l of m.lessons){
 for(const symbol of l.symbols)assert(/^[A-Za-z].* · /.test(symbol.meaning),`${l.id}: missing compact English symbol term`);
 const formulas=l.proof.map(p=>p.formula);for(const match of l.formal.matchAll(/\\\[([\s\S]*?)\\\]/g))formulas.push(match[1]);
 for(const tex of formulas){assert(!/\\{3,}&/.test(tex),`${l.id}: escaped ampersand after row separator`);const html=katex.renderToString(tex,{throwOnError:true,strict:'error'});const visible=html.match(/<span class="katex-html"[\s\S]*$/)?.[0]||'';assert(!/&amp;/.test(visible),`${l.id}: rendered literal ampersand`);checked++;}
 assert(!/(?:^|\n)\s*[。，、；]\s*(?:\n|$)/.test(l.formal),`${l.id}: punctuation-only paragraph`);
 assert(!/\\\]\s*\n\s*[，、]/.test(l.formal),`${l.id}: dangling punctuation after display`);
}
console.log(`PASS: ${checked} proof/display equations have no literal ampersands; formal punctuation checked`);
