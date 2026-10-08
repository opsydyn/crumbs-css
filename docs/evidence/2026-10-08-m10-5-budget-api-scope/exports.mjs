import {writeFileSync} from "node:fs"
import {pathToFileURL} from "node:url"
const root="/private/tmp/crumbs-m105-budget-api-scope"
const rows=[]
for(const cohort of ["baseline","current"])for(const entry of ["theme-core.mjs","theme-core.cjs","theme.mjs","theme.cjs"]){
const value=await import(pathToFileURL(`${root}/${cohort}/dist/${entry}`).href)
const names=Object.keys(value).filter(n=>n!=="default"&&n!=="module.exports").sort()
rows.push({cohort,entry,names})
}
writeFileSync(root+"/exports.json",JSON.stringify({qualification:"namespace-presence-only",rows},null,2))
console.log(JSON.stringify(rows.map(({cohort,entry,names})=>({cohort,entry,count:names.length}))))
