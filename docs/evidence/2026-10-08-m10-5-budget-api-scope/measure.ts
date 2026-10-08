import {readEmittedGraph} from "/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css/packages/css/bench/effect-boundary-audit"
import {writeFileSync} from "node:fs"
const root="/private/tmp/crumbs-m105-budget-api-scope"
const graphs=[]
for(const cohort of ["baseline","baseline-minified","current"])for(const entry of ["theme-core.mjs","theme-core.cjs","theme.mjs","theme.cjs"]){
const graph=readEmittedGraph(`${root}/${cohort}/dist/${entry}`)
if(graph.nonliteralLoads||JSON.stringify(graph.externals)!=='["react"]')throw Error("Dependency policy drift")
graphs.push({cohort,entry,...graph})
}
writeFileSync(root+"/graphs.json",JSON.stringify({qualification:"diagnostic-only",graphs},null,2))
console.log(JSON.stringify(graphs.map(({cohort,entry,bytes})=>({cohort,entry,bytes}))))
