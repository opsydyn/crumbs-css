import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url),format=process.argv[2];assert(['esm','cjs'].includes(format));
const root=dirname(require.resolve('@opsydyn/crumbs-css/package.json')),trace=[];
async function load(path,kind){const actual=kind==='cjs'?require(path):await import(pathToFileURL(path).href);trace.push({kind:kind==='cjs'?'require':'import',path});return actual;}
const first=resolve(root,`dist/tokens-algebra.${format==='cjs'?'cjs':'mjs'}`);
const a=await load(first,format); // CJS-first actually requires before any algebra import.
const b=await load(resolve(root,`../crumbs-css-copy/dist/tokens-algebra.${format==='cjs'?'mjs':'cjs'}`),format==='cjs'?'esm':'cjs');
const expected=['TokenAlgebraError','createColor','createTypography','createTypographyScale','mixColor','multiplyColorAlpha','scaleTypography','setColorAlpha','toNativeColor','toNativeTypography'].sort();
for(const api of [a,b]){assert.deepEqual(Object.keys(api).sort(),expected);const black=api.createColor('#000'),white=api.createColor('#fff');assert.equal(api.toNativeColor(api.mixColor(black,white,{ratio:.5,space:'srgb'})),'#808080ff');assert.equal(api.toNativeColor(api.mixColor(black,white,{ratio:.5,space:'srgb-linear'})),'#bcbcbcff');assert.equal(api.toNativeColor(api.multiplyColorAlpha(api.createColor('#0000ff40'),.5)),'#0000ff20');assert.throws(()=>api.createColor('red'),e=>e.code==='algebra.invalid-color')}
const color=a.createColor('#1234');assert.equal(b.toNativeColor(b.setColorAlpha(color,.5)),'#11223380');const type=a.createTypography({fontSize:16,lineHeight:{ratio:1.5},letterSpacing:-.25});assert.deepEqual(b.toNativeTypography(b.createTypographyScale(type,{ratio:1.25,steps:{title:2,body:0}}).title),{fontSize:25,lineHeight:37.5,letterSpacing:-.390625});let accesses=0;assert.throws(()=>b.mixColor(color,{...color,get alpha(){accesses++;return 1}},{ratio:0,space:'srgb'}),e=>e.code==='algebra.invalid-descriptor');assert.equal(accesses,0);
for(const peer of ['react','react-native','effect'])assert.throws(()=>require.resolve(peer));
console.log(JSON.stringify({node:process.version,format,copies:2,runtimePeers:'absent',trace,status:'passed'}));
