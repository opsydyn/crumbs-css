import ts from '/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css/node_modules/typescript/lib/typescript.js'
import {readFileSync,writeFileSync,mkdirSync}from'node:fs'
const root='/private/tmp/crumbs-m105-compact-runtime'
const files={'components/contracts.ts':['dataRecordEntries','readArray','assertExactKeys'],'components/extension-contract.ts':['dataRecordEntries','dataArray','assertExactKeys'],'theme-runtime.ts':['assertComponentThemeRecord'],'runtime/component-recipe-resolution-plan.ts':['assertRecord']}
for(const cohort of ['control','candidate'])for(const [file,names]of Object.entries(files)){
 const path=root+'/'+cohort+'/src/'+file,source=readFileSync(path,'utf8'),ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true)
 const imports=cohort==='candidate'?`import * as engine from '../candidate/src/runtime/compact-program.ts'; const {runData,runKeys,contractRecord,extensionRecord,themeRecord,planRecord,contractArray,extensionArray,contractKeys,extensionKeys}=engine;\n`:''
 const definitions=ast.statements.filter(x=>ts.isFunctionDeclaration(x)&&names.includes(x.name?.text)).map(x=>'export '+x.getText(ast)).join('\n')
 if(definitions.match(/export function/g).length!==names.length)throw Error('Missing helpers '+file)
 mkdirSync(root+'/helpers',{recursive:true});writeFileSync(root+'/helpers/'+cohort+'-'+file.replaceAll('/','-'),imports+definitions)
}
