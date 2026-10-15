'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../assets/three-view.js'),'utf8');
const ctx={};vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function clipTriangle('),source.indexOf('function clipGeometry('))+'\nthis.clip=clipTriangle;',ctx);
class Vec{constructor(x,y,z){Object.assign(this,{x,y,z});}clone(){return new Vec(this.x,this.y,this.z);}lerp(b,t){for(const k of ['x','y','z'])this[k]+=(b[k]-this[k])*t;return this;}}
const area=ps=>{let a=0;for(let i=0;i<ps.length;i++){const p=ps[i],q=ps[(i+1)%ps.length];a+=p.x*q.y-q.x*p.y;}return Math.abs(a)/2;};
test('Independent: actual CPU clipper retains correct halfspace and conserves triangle area',()=>{
 const tri=[new Vec(-2,-1,0),new Vec(2,-1,0),new Vec(0,3,0)];
 for(let h=-3;h<=3;h+=.125){const left=ctx.clip(tri,{distanceToPoint:p=>h-p.x}),right=ctx.clip(tri,{distanceToPoint:p=>p.x-h});
  left.forEach(p=>assert.ok(p.x<=h+1e-9));right.forEach(p=>assert.ok(p.x>=h-1e-9));
  assert.ok(Math.abs(area(left)+area(right)-8)<1e-9,'partition area at '+h);
 }
 assert.deepEqual(tri.map(p=>[p.x,p.y,p.z]),[[-2,-1,0],[2,-1,0],[0,3,0]],'source points not mutated');
});
test('Independent: engine-axis slice inequalities preserve mathematical x, y and height',()=>{
 for(const zScale of [.01,.2,1])for(const axis of ['x','y','z'])for(let x=-2;x<=2;x++)for(let y=-2;y<=2;y++)for(let z=-2;z<=2;z++){
  const p={x,y:z*zScale,z:-y},value=.5;
  const distance=axis==='x'?-p.x+value:axis==='y'?p.z+value:-p.y+value*zScale;
  const expected=axis==='x'?value-x:axis==='y'?value-y:(value-z)*zScale;
  assert.ok(Math.abs(distance-expected)<1e-12);
 }
 assert.match(source,/new THREE\.Vector3\(pn\[0\],pn\[2\]\/zScale,-pn\[1\]\)/,'inverse transpose for arbitrary plane normals');
 assert.match(source,/sourceGeometry!==o\.geometry/,'distinct unclipped geometry cleanup');
});
