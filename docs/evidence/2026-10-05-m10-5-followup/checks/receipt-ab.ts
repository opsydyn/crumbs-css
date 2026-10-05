import {readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
const root='/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css'
const entry=root+'/packages/css/examples/recipe.css.ts'
const source=readFileSync(root+'/packages/css/src/compiler/resolution-identity.ts','utf8')
const before=source.replace('    const existing = files.get(absolute)\n    if (existing !== undefined) return existing\n','').replace('    if (links.has(logical)) return\n','')
writeFileSync('/private/tmp/crumbs-m105-receipt-before.ts',before)
writeFileSync('/private/tmp/crumbs-m105-receipt-after.ts',source)
const old=await import('./crumbs-m105-receipt-before.ts'),current=await import('./crumbs-m105-receipt-after.ts')
const options={cwd:root+'/packages/css',absoluteEntryPath:entry,verification:true}
const inputs={'examples/recipe.css.ts':{imports:[{original:'@vanilla-extract/css'},{original:'../src/native-style'}]},'src/native-style.ts':{imports:[]}}
const expected=JSON.stringify(old.captureResolutionIdentity(inputs,options))
const rows=[]
for(let round=0;round<5;round++)for(const [name,fn] of (round%2?[['after',current],['before',old]]:[['before',old],['after',current]])){
 for(let i=0;i<5;i++)fn.captureResolutionIdentity(inputs,options)
 const start=performance.now();for(let i=0;i<100;i++){const result=fn.captureResolutionIdentity(inputs,options);if(JSON.stringify(result)!==expected)throw Error('Receipt parity failure')}
 rows.push({round,name,meanMs:(performance.now()-start)/100})
}
console.log(JSON.stringify({scope:'per-pass resolution capture only, 5 alternating-order pairs of 100 captures; full transforms and admission budgets remain separate',entry,inputs,sourceBefore:createHash('sha256').update(before).digest('hex'),sourceAfter:createHash('sha256').update(source).digest('hex'),exactReceiptParity:true,rows},null,2))
