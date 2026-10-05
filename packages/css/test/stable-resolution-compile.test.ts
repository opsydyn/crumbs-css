import {expect,test} from 'bun:test';
import {mkdtempSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compileWithStableResolution} from '../src/compiler/stable-resolution-compile';
test('M10.5 discovery verifies newly observed inputs once and warm requests compile once',async()=>{
 const cwd=mkdtempSync(join(tmpdir(),'crumbs-stable-'));const entry=join(cwd,'card.css.ts');writeFileSync(entry,'first');writeFileSync(join(cwd,'token.ts'),'one');let passes=0;
 try{
  const compile=async()=>{passes++;return {source:'styles',inputs:{'card.css.ts':{imports:[{original:'./token'}]},'token.ts':{imports:[]}}}};
  await compileWithStableResolution({cwd,absoluteEntryPath:entry},compile);expect(passes).toBe(2);
  await compileWithStableResolution({cwd,absoluteEntryPath:entry},compile);expect(passes).toBe(3);
 }finally{rmSync(cwd,{recursive:true,force:true})}
});
test('M10.5 changing configuration during every compile rejects output within a bounded retry',async()=>{
 const cwd=mkdtempSync(join(tmpdir(),'crumbs-unstable-'));const entry=join(cwd,'card.css.ts');writeFileSync(entry,'entry');let passes=0;
 try{await expect(compileWithStableResolution({cwd,absoluteEntryPath:entry},async()=>{writeFileSync(join(cwd,'tsconfig.json'),JSON.stringify({change:++passes}));return {source:'stale',inputs:{'card.css.ts':{imports:[]}}}})).rejects.toThrow('changed during compilation');expect(passes).toBe(3)}finally{rmSync(cwd,{recursive:true,force:true})}
});

test('M10.5 Metro refuses entry-buffer/disk conflicts before upstream transformation',async()=>{
 const cwd=mkdtempSync(join(tmpdir(),'crumbs-buffer-'));const entry=join(cwd,'card.css.ts');writeFileSync(entry,'disk source');const upstream=join(cwd,'upstream.cjs');writeFileSync(upstream,'exports.transform=()=>{throw Error("upstream must not run")};');
 try{
  const {transform}=await import('../src/transformer');
  await expect(transform({upstreamTransformerPath:upstream},cwd,'card.css.ts',Buffer.from('stale Metro buffer'),{platform:'ios',dev:false} as any)).rejects.toThrow('entry changed before compilation');
 }finally{rmSync(cwd,{recursive:true,force:true})}
});

test('M10.5 large graphs verify every input without retaining a truncated plan',async()=>{
 const cwd=mkdtempSync(join(tmpdir(),'crumbs-large-'));const entry=join(cwd,'card.css.ts');writeFileSync(entry,'entry');const inputs:Record<string,unknown>={'card.css.ts':{imports:[]}};
 for(let i=0;i<531;i++){const file='token'+i+'.ts';writeFileSync(join(cwd,file),'one');inputs[file]={imports:[]}}
 let passes=0;
 try{await expect(compileWithStableResolution({cwd,absoluteEntryPath:entry},async()=>{writeFileSync(join(cwd,'token529.ts'),String(++passes));return {source:'old',inputs}})).rejects.toThrow('changed during compilation');expect(passes).toBe(3)}finally{rmSync(cwd,{recursive:true,force:true})}
});
