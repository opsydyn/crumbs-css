import ts from '/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css/node_modules/typescript/lib/typescript.js'
import {readFileSync,writeFileSync} from 'node:fs'
const root='/private/tmp/crumbs-m105-descriptor-program'
const files=['components/contracts.ts','components/extension-contract.ts','runtime/component-recipe-resolution-plan.ts','theme-runtime.ts']
const counts={},functions=[]
for(const file of files){
 const source=readFileSync(root+'/control/src/'+file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true)
 for(const f of ast.statements)if(ts.isFunctionDeclaration(f)&&(file!=='theme-runtime.ts'||f.getStart(ast)>=source.indexOf('export function resolveThemeStyles'))){
  functions.push({file,name:f.name.text,line:ast.getLineAndCharacterOfPosition(f.getStart(ast)).line+1})
  const js=ts.transpileModule(f.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
  const tree=ts.createSourceFile('f.js',js,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS)
  function visit(n){counts[ts.SyntaxKind[n.kind]]=(counts[ts.SyntaxKind[n.kind]]||0)+1;ts.forEachChild(n,visit)}visit(tree)
 }
}
writeFileSync(root+'/inventory.json',JSON.stringify({functions,counts},null,2));console.log(JSON.stringify({functions:functions.length,counts},null,2))
