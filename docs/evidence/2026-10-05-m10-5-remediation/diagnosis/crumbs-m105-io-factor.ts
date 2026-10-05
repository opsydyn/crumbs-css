import {readFileSync,writeFileSync} from 'node:fs'
const root='/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css',source=readFileSync(root+'/packages/css/src/compiler/resolution-identity.ts','utf8')
const variants={base:source,exists:source.replace('readFileSync, realpathSync','existsSync, readFileSync, realpathSync').replace('try { return realpathSync(sourcePath) }','try { return existsSync(sourcePath) ? realpathSync(sourcePath) : null }').replace('  try { return { sourcePath, sourceHash:','  try { if (!existsSync(sourcePath)) return {sourcePath,sourceHash:null,canonicalPath:null}; return { sourcePath, sourceHash:'),native:source.replace('return realpathSync(sourcePath)','return realpathSync.native(sourcePath)')}
const options={cwd:root+'/packages/css',absoluteEntryPath:root+'/packages/css/examples/recipe.css.ts',verification:true},inputs={'examples/recipe.css.ts':{imports:[{original:'@vanilla-extract/css'},{original:'../src/native-style'}]},'src/native-style.ts':{imports:[]}}
let expected:string|undefined;const rows=[]
for(const [name,bytes] of Object.entries(variants)){
 const path='/private/tmp/crumbs-m105-io-'+name+'.ts';writeFileSync(path,bytes);const mod=await import(path)
 for(let j=0;j<5;j++){const start=performance.now();for(let i=0;i<100;i++){const r=JSON.stringify(mod.captureResolutionIdentity(inputs,options));expected??=r;if(r!==expected)throw Error('Parity failed '+name)}rows.push({name,round:j,meanMs:(performance.now()-start)/100})}
}
console.log(JSON.stringify({diagnosticOnly:true,receiptParity:true,rows},null,2))
