/* npm install, then npm run build:three. The committed bundle works offline. */
const path=require('node:path');
const esbuild=require('esbuild');
esbuild.buildSync({entryPoints:[path.join(__dirname,'../assets/three-view.js')],outfile:path.join(__dirname,'../assets/three-view.bundle.js'),bundle:true,format:'iife',platform:'browser',target:['es2020'],minify:true,legalComments:'inline',alias:{'three/addons/renderers/SVGRenderer.js':path.join(path.dirname(require.resolve('three')),'../examples/jsm/renderers/SVGRenderer.js'),three:path.join(path.dirname(require.resolve('three')),'three.module.js')},logLevel:'info'});
