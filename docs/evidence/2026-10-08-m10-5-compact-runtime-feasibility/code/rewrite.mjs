import ts from '/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css/node_modules/typescript/lib/typescript.js'
import {readFileSync,writeFileSync} from 'node:fs'
const root='/private/tmp/crumbs-m105-compact-runtime/candidate/src'
const policies={
 'components/contracts.ts':{dataRecordEntries:['contractRecord','runData(contractRecord,value,context) as Array<[string,unknown]>'],readArray:['contractArray','runData(contractArray,value,context) as unknown[]'],assertExactKeys:['contractKeys','runKeys(contractKeys,entries,required,optional,context)']},
 'components/extension-contract.ts':{dataRecordEntries:['extensionRecord','runData(extensionRecord,value,context) as Array<[string,unknown]>'],dataArray:['extensionArray','runData(extensionArray,value,context) as unknown[]'],assertExactKeys:['extensionKeys','runKeys(extensionKeys,entries,required,optional,context)']},
 'theme-runtime.ts':{assertComponentThemeRecord:['themeRecord','runData(themeRecord,value,context)']},
 'runtime/component-recipe-resolution-plan.ts':{assertRecord:['planRecord','runData(planRecord,value,context)']},
}
for(const [file,names]of Object.entries(policies)) {
 const path=root+'/'+file,source=readFileSync(path,'utf8'),ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true),edits=[]
 for(const node of ast.statements)if(ts.isFunctionDeclaration(node)&&names[node.name?.text]) {
  const n=node.name.text;edits.push({start:node.body.getStart(ast),end:node.body.end,text:'{'+(n.startsWith('assert')?'':'return ')+names[n][1]+'}'})
 }
 if(edits.length!==Object.keys(names).length)throw Error('Missing probe rewrite '+file)
 let next=source;for(const edit of edits.sort((a,b)=>b.start-a.start))next=next.slice(0,edit.start)+edit.text+next.slice(edit.end)
 const imports=['runData','runKeys',...Object.values(names).map(x=>x[0])].join(',')
 next=`import {${imports}} from '${file.startsWith('runtime/')?'./compact-program':file.startsWith('components/')?'../runtime/compact-program':'./runtime/compact-program'}'\n`+next
 writeFileSync(path,next)
}
const path=root+'/expressions/index.ts'
let source=readFileSync(path,'utf8')
const start=source.indexOf('    case "add": {',source.indexOf('function evaluateNode'))
const end=source.indexOf('    case "match": {',start)
if(start<0||end<0)throw Error('Arithmetic span missing')
const replacement=`    case "add": case "subtract": case "scale": case "clamp": {
      const kind=operationKind
      const value=runNumber(numberPrograms[kind],expression as unknown as Record<string,unknown>,node=>evaluateNode(node as NativeExpression<NativeExpressionDomain>,state,matches))
      try {assertLiteralValue(expression.domain,value)}
      catch(error) {if(error instanceof TypeError)throw evaluationError("domain-error",kind+" result does not satisfy its expression domain");throw error}
      return value as NativeExpressionValue<TDomain>
    }
`
let rewritten=source.slice(0,start)+replacement+source.slice(end)
const functionStart=rewritten.indexOf('function evaluateNode')
const switchStart=rewritten.indexOf('  switch (expression.kind)',functionStart)
rewritten=rewritten.slice(0,switchStart)+rewritten.slice(switchStart).replace('  switch (expression.kind)','  const operationKind = expression.kind\n  switch (operationKind)')
writeFileSync(path,"import {runNumber,numberPrograms} from '../runtime/compact-program'\n"+rewritten)
writeFileSync(root+'/runtime/compact-program.ts',readFileSync(new URL('./compact-program.ts',import.meta.url)))
console.log('Throwaway ordered-program rewrite: eight admission helpers, four arithmetic cases')
