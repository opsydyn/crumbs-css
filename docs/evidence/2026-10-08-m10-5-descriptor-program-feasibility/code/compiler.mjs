/** THROWAWAY: complete selected function bodies lowered to data, not shipping tooling. */
import ts from '/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css/node_modules/typescript/lib/typescript.js'
import {readFileSync,writeFileSync}from'node:fs'
const root='/private/tmp/crumbs-m105-descriptor-program'
const files=['components/contracts.ts','components/extension-contract.ts','runtime/component-recipe-resolution-plan.ts','theme-runtime.ts']
const inventory=[]
for(const file of files){
 const source=readFileSync(root+'/control/src/'+file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true)
 const edits=[],hoists=[]
 for(const f of ast.statements)if(ts.isFunctionDeclaration(f)&&(file!=='theme-runtime.ts'||f.getStart(ast)>=source.indexOf('export function resolveThemeStyles'))){
  const js=ts.transpileModule(f.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
  const tree=ts.createSourceFile('f.js',js,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),fn=tree.statements.find(ts.isFunctionDeclaration)
  const pool=[],indices=new Map(),references=new Set(),bound=new Set(),ops={}
  const word=x=>{if(!indices.has(x)){indices.set(x,pool.length);pool.push(x)}return indices.get(x)}
  const op=(code,...args)=>{ops[code]=(ops[code]||0)+1;return[code,...args]}
  function pattern(n){
   if(ts.isIdentifier(n)){bound.add(n.text);return [0,word(n.text)]}
   if(ts.isArrayBindingPattern(n))return[1,n.elements.map(x=>ts.isOmittedExpression(x)?null:[pattern(x.name),x.initializer?expr(x.initializer):null,!!x.dotDotDotToken])]
   if(ts.isObjectBindingPattern(n))return[2,n.elements.map(x=>[x.propertyName?key(x.propertyName):[0,0,word(x.name.text)],pattern(x.name),x.initializer?expr(x.initializer):null,!!x.dotDotDotToken])]
   throw Error('Unsupported binding '+ts.SyntaxKind[n.kind])
  }
  function key(n){return ts.isComputedPropertyName(n)?expr(n.expression):[0,0,word(ts.isIdentifier(n)||ts.isStringLiteral(n)?n.text:n.getText(tree))]}
  function expr(n){
   if(ts.isParenthesizedExpression(n))return expr(n.expression)
   if(ts.isIdentifier(n)){references.add(n.text);return op(1,word(n.text))}
   if(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))return op(0,0,word(n.text))
   if(ts.isNumericLiteral(n))return op(0,1,Number(n.text))
   if(n.kind===ts.SyntaxKind.TrueKeyword||n.kind===ts.SyntaxKind.FalseKeyword||n.kind===ts.SyntaxKind.NullKeyword)return op(0,1,n.kind===ts.SyntaxKind.NullKeyword?null:n.kind===ts.SyntaxKind.TrueKeyword)
   if(ts.isPropertyAccessExpression(n))return op(2,expr(n.expression),[0,0,word(n.name.text)],!!n.questionDotToken)
   if(ts.isElementAccessExpression(n))return op(2,expr(n.expression),expr(n.argumentExpression),!!n.questionDotToken)
   if(ts.isCallExpression(n))return op(3,expr(n.expression),n.arguments.map(expr),!!n.questionDotToken)
   if(ts.isNewExpression(n))return op(4,expr(n.expression),(n.arguments||[]).map(expr))
   if(ts.isBinaryExpression(n))return op(5,word(n.operatorToken.getText(tree)),expr(n.left),expr(n.right))
   if(ts.isPrefixUnaryExpression(n)||ts.isTypeOfExpression(n))return op(6,word(ts.isTypeOfExpression(n)?'typeof':ts.tokenToString(n.operator)),expr(n.operand||n.expression))
   if(ts.isPostfixUnaryExpression(n))return op(14,word(ts.tokenToString(n.operator)),expr(n.operand))
   if(ts.isConditionalExpression(n))return op(7,expr(n.condition),expr(n.whenTrue),expr(n.whenFalse))
   if(ts.isArrayLiteralExpression(n))return op(8,n.elements.map(x=>ts.isOmittedExpression(x)?null:expr(x)))
   if(ts.isObjectLiteralExpression(n))return op(9,n.properties.map(x=>{
    if(ts.isSpreadAssignment(x))return[1,expr(x.expression)]
    if(ts.isPropertyAssignment(x))return[0,key(x.name),expr(x.initializer)]
    if(ts.isShorthandPropertyAssignment(x))return[0,key(x.name),expr(x.name)]
    if(ts.isMethodDeclaration(x))return[0,key(x.name),op(10,x.parameters.map(param),stmt(x.body),false)]
    throw Error('Unsupported object member '+ts.SyntaxKind[x.kind])
   }))
   if(ts.isArrowFunction(n))return op(10,n.parameters.map(param),ts.isBlock(n.body)?stmt(n.body):op(23,expr(n.body)),true)
   if(ts.isSpreadElement(n))return op(11,expr(n.expression))
   if(ts.isTemplateExpression(n))return op(12,word(n.head.text),n.templateSpans.map(x=>[expr(x.expression),word(x.literal.text)]))
   if(n.kind===ts.SyntaxKind.RegularExpressionLiteral){const raw=n.getText(tree),end=raw.lastIndexOf('/');return op(13,word(raw.slice(1,end)),word(raw.slice(end+1)))}
   throw Error(file+' '+f.name.text+': unsupported expression '+ts.SyntaxKind[n.kind]+' '+n.getText(tree))
  }
  function param(n){return[pattern(n.name),n.initializer?expr(n.initializer):null,!!n.dotDotDotToken]}
  function declarations(list){return list.declarations.map(x=>[pattern(x.name),x.initializer?expr(x.initializer):null])}
  function stmt(n){
   if(ts.isBlock(n))return op(20,n.statements.map(stmt))
   if(ts.isVariableStatement(n))return op(21,declarations(n.declarationList))
   if(ts.isExpressionStatement(n))return op(22,expr(n.expression))
   if(ts.isReturnStatement(n))return op(23,n.expression?expr(n.expression):null)
   if(ts.isThrowStatement(n))return op(24,expr(n.expression))
   if(ts.isIfStatement(n))return op(25,expr(n.expression),stmt(n.thenStatement),n.elseStatement?stmt(n.elseStatement):null)
   if(ts.isForOfStatement(n))return op(26,pattern(n.initializer.declarations[0].name),expr(n.expression),stmt(n.statement))
   if(ts.isForStatement(n))return op(27,n.initializer?ts.isVariableDeclarationList(n.initializer)?op(21,declarations(n.initializer)):op(22,expr(n.initializer)):null,n.condition?expr(n.condition):null,n.incrementor?expr(n.incrementor):null,stmt(n.statement))
   if(ts.isContinueStatement(n))return op(28)
   if(ts.isBreakStatement(n))return op(29)
   if(ts.isTryStatement(n))return op(30,stmt(n.tryBlock),n.catchClause?[n.catchClause.variableDeclaration?pattern(n.catchClause.variableDeclaration.name):null,stmt(n.catchClause.block)]:null,n.finallyBlock?stmt(n.finallyBlock):null)
   if(ts.isSwitchStatement(n))return op(31,expr(n.expression),n.caseBlock.clauses.map(c=>[ts.isCaseClause(c)?expr(c.expression):null,c.statements.map(stmt)]))
   throw Error(file+' '+f.name.text+': unsupported statement '+ts.SyntaxKind[n.kind])
  }
  const params=fn.parameters.map(param),body=stmt(fn.body)
  const free=[...references].filter(n=>!bound.has(n))
  const name='__program_'+f.name.text
  hoists.push(`const ${name}=/* @__PURE__ */ freezeProgram(${JSON.stringify([pool,body])})`)
  const args=f.parameters.map(p=>{if(!ts.isIdentifier(p.name))throw Error('Top-level destructuring not supported');return JSON.stringify(p.name.text)+':'+p.name.text}).join(',')
  const lookup=free.map(n=>`case ${JSON.stringify(n)}:return ${n}`).join(';')
  edits.push({start:f.body.getStart(ast),end:f.body.end,text:`{return runProgram(${name},{${args}},name=>{switch(name){${lookup}}throw new ReferenceError(name+' is not defined')}) as any}`})
  inventory.push({file,name:f.name.text,line:ast.getLineAndCharacterOfPosition(f.getStart(ast)).line+1,free,parameters:f.parameters.map(p=>p.name.text),stringPool:pool.length,ops,instructions:body,program:name})
 }
 let output=source
 for(const edit of edits.sort((a,b)=>b.start-a.start))output=output.slice(0,edit.start)+edit.text+output.slice(edit.end)
 const prefix=file.startsWith('components/')?'../runtime/descriptor-program':file.startsWith('runtime/')?'./descriptor-program':'./runtime/descriptor-program'
 output=`import {runProgram,freezeProgram} from '${prefix}'\n${hoists.join('\n')}\n`+output
 writeFileSync(root+'/candidate/src/'+file,output)
}
writeFileSync(root+'/lowering.json',JSON.stringify({format:'crumbs.m10.5.descriptor-program-lowering',functions:inventory.length,inventory},null,2))
console.log('Lowered complete bodies of '+inventory.length+' functions; unsupported syntax rejected')
