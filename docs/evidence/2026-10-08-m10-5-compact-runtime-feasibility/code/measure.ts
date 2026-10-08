import {readEmittedGraph} from '/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css/packages/css/bench/effect-boundary-audit'
import {readFileSync,writeFileSync}from'node:fs'
import {createHash}from'node:crypto'
const root='/private/tmp/crumbs-m105-compact-runtime'
const old=JSON.parse(readFileSync('/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css/docs/evidence/2026-10-08-m10-5-runtime-architecture-attribution/summary.json','utf8'))
const graphs=[]
for(const cohort of ['control','candidate'])for(const entry of ['theme-core.mjs','theme-core.cjs','theme.mjs','theme.cjs']){
 const graph=readEmittedGraph(root+'/'+cohort+'/dist/'+entry)
 if(graph.nonliteralLoads||JSON.stringify(graph.externals)!=='["react"]')throw Error('Changed dependency policy')
 const baseline=old.graphs.find((row:any)=>row.entry===entry)
 if(cohort==='control'&&graph.bytes!==baseline.minifiedControlBytes)throw Error('Control drift')
 graphs.push({cohort,entry,...graph,ceiling:baseline.ceiling,gate:graph.bytes<=baseline.ceiling?'pass':'fail'})
}
const comparison=graphs.filter(g=>g.cohort==='candidate').map(g=>({entry:g.entry,controlBytes:graphs.find(c=>c.cohort==='control'&&c.entry===g.entry)!.bytes,candidateBytes:g.bytes,ceiling:g.ceiling,gapBytes:g.bytes-g.ceiling,gate:g.gate}))
writeFileSync(root+'/graphs.json',JSON.stringify({qualification:'diagnostic-only',registrySha256:old.registrySha256,registryText:old.registryText,graphs,comparison},null,2))
console.log(JSON.stringify(comparison,null,2))
