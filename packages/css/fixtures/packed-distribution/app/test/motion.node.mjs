import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url),format=process.argv[2],root=dirname(require.resolve('@opsydyn/crumbs-css/package.json'));
const load=path=>format==='cjs'?require(path):import(pathToFileURL(path).href);
const a=await load(resolve(root,`dist/theme-motion.${format==='cjs'?'cjs':'mjs'}`)),b=await load(resolve(root,`../crumbs-css-copy/dist/theme-motion.${format==='cjs'?'cjs':'mjs'}`));
for(const api of [a,b]){assert.deepEqual(Object.keys(api).sort(),['defineMotion']);const d=api.defineMotion({states:{resting:{opacity:.6,translateX:0},selected:{opacity:1,translateX:112}},transition:{duration:180,easing:'ease-in-out'}});assert.equal(d.states.selected.translateX,112);assert(Object.isFrozen(d.states.selected));assert.throws(()=>api.defineMotion({states:{a:{width:1}},transition:{duration:1,easing:'linear'}}),/INVALID_MOTION_DEFINITION/)}
for(const peer of ['react','react-native','effect'])assert.throws(()=>require.resolve(peer));
console.log(JSON.stringify({node:process.version,format,copies:2,runtimePeers:'absent',status:'passed'}));
