'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const api=require('../assets/animations.js');
const root=path.resolve(__dirname,'..');
const katex=require(fs.existsSync(path.join(root,'assets/katex.min.js'))?'../assets/katex.min.js':'../../optimization_reading_edition/assets/katex.min.js');
const variants={'convex-chord':Array.from({length:11},(_,i)=>i/10),gradient:Array.from({length:10},(_,i)=>.05+i*.025),prox:Array.from({length:16},(_,i)=>i*.2)};
let frames=0,assertions=0;const checks=[];
function check(ok,why){assertions++;assert.ok(ok,why);}
for(const key of api.keys){
 let count=0;
 for(const value of variants[key]||[undefined])for(const [i,frame] of api.getFrames(key,value).entries()){
  frames++;count++;
  const html=katex.renderToString(frame.formula,{throwOnError:true,strict:'error',trust:false});
  check(!html.includes('katex-error'),`${key}/${value}/${i}: rendered error`);
  check(!/\\{2,}(?:operatorname|nabla|frac|tfrac|dfrac|mathbb|lambda|theta|qquad|quad)\b/.test(frame.formula),`${key}/${value}/${i}: suspicious doubled command`);
  const scene=api.drawScene(key,i,value);
  check(!/NaN|undefined|Infinity/.test(scene.body+scene.axes),`${key}/${value}/${i}: nonfinite geometry`);
 }
 checks.push({scene:key,formulaVariants:count});
}
for(const key of ['projection','kkt']){
 const scene=api.drawScene(key,5);
 const match=scene.body.match(/<ellipse[^>]*rx="([^"]+)" ry="([^"]+)"/);
 check(!!match,`${key}: circle geometry present`);
 check(Math.abs(Number(match[1])-Number(match[2]))<1e-9,`${key}: Euclidean circle retains equal screen scale`);
}
for(const key of ['gradient','newton']){
 const scene=api.drawScene(key,5),match=scene.body.match(/<ellipse[^>]*rx="([^"]+)" ry="([^"]+)"/);
 check(!!match,`${key}: computed contours present`);
 check(Math.abs(Number(match[1])/Number(match[2])-Math.sqrt(8))<1e-9,`${key}: contour aspect ratio matches Hessian diag(1,8)`);
}
const rounded=api.getFrames('prox',2.6)[4].formula;
check(!rounded.includes('0.9231=0')&&!rounded.includes('0.9231}=0'),'Prox stationarity does not falsely set rounded product to exact zero');
check(api.getFrames('admm')[7].formula.includes('\\approx'),'Rounded ADMM eighth residual is marked approximate');
const result={status:'PASS',formulaVariants:frames,assertions,checks,scope:'Exhaustive strict-KaTeX rendering across all supported slider values, finite SVG coordinates, and selected Euclidean-geometry invariants. Production controller behavior is separately exercised by animations.test.cjs; this is not a browser interaction test.'};
fs.writeFileSync(path.join(root,'reports/animation-audit.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
