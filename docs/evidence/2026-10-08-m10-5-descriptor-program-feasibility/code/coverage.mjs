import ts from '/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css/node_modules/typescript/lib/typescript.js'
import{readFileSync,writeFileSync}from'node:fs'
const root='/private/tmp/crumbs-m105-descriptor-program',r=JSON.parse(readFileSync(root+'/lowering.json','utf8')),rows=[]
for(const file of [...new Set(r.inventory.map(x=>x.file))]){
 const old=readFileSync(root+'/control/src/'+file,'utf8'),next=readFileSync(root+'/candidate/src/'+file,'utf8')
 const a=ts.createSourceFile(file,old,ts.ScriptTarget.Latest,true),b=ts.createSourceFile(file,next,ts.ScriptTarget.Latest,true)
 const selected=r.inventory.filter(x=>x.file===file),names=selected.map(x=>x.name)
 for(const f of a.statements.filter(ts.isFunctionDeclaration)){
  const g=b.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name.text===f.name.text)
  if(!g)throw Error('Missing original function')
  if(f.getText(a).slice(0,f.body.getStart(a)-f.getStart(a))!==g.getText(b).slice(0,g.body.getStart(b)-g.getStart(b)))throw Error('Signature changed')
  if(names.includes(f.name.text)){
   if(!g.body.getText(b).includes('return runProgram(__program_'+f.name.text))throw Error('Original body retained')
   rows.push({file,name:f.name.text,signature:'unchanged',body:'entirely replaced'})
  }else if(f.body.getText(a)!==g.body.getText(b))throw Error('Unselected function changed')
 }
}
if(rows.length!==98)throw Error('Incomplete lowering')
writeFileSync(root+'/coverage.json',JSON.stringify({qualification:'diagnostic-only',functions:rows.length,rows},null,2));console.log('98 complete bodies replaced; all original function signatures retained')
