import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { SourceMap } from 'node:module'
import { dirname, join, resolve, relative } from 'node:path'
import ts from '/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css/node_modules/typescript/lib/typescript.js'
const root = resolve(process.argv[2])
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const sourceCache = new Map()
const literalKinds = new Set([ts.SyntaxKind.StringLiteral,ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateHead,ts.SyntaxKind.TemplateMiddle,ts.SyntaxKind.TemplateTail])
function literals(ast) {
  const spans=[]
  function visit(node) { if(literalKinds.has(node.kind)) spans.push([node.getStart(ast),node.end]);ts.forEachChild(node,visit) }
  visit(ast);spans.sort((a,b)=>a[0]-b[0])
  if(spans.some((span,index)=>index>0 && spans[index-1][1]>span[0]))throw Error('Overlapping literal tokens')
  return spans
}
const fixture='const a = `hello ${world} tail`; const b="x";'
const fixtureAst=ts.createSourceFile('fixture.js',fixture,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS)
if(literals(fixtureAst).reduce((total,[a,b])=>total+Buffer.byteLength(fixture.slice(a,b)),0)!==19)throw Error('Literal span self-check failed')
function sourceOwner(source, line, column) {
  let record = sourceCache.get(source)
  if (!record) {
    const text = readFileSync(source,'utf8'), file = ts.createSourceFile(source,text,ts.ScriptTarget.Latest,true)
    const owners = file.statements.map(statement => {
      let name
      if (statement.name) name = statement.name.getText(file)
      else if (ts.isVariableStatement(statement)) name = statement.declarationList.declarations.map(d=>d.name.getText(file)).join(',')
      else name = ts.SyntaxKind[statement.kind]
      return {start:statement.getStart(file),end:statement.end,name,line:file.getLineAndCharacterOfPosition(statement.getStart(file)).line+1}
    })
    record = {file,owners}; sourceCache.set(source,record)
  }
  const offset = record.file.getPositionOfLineAndCharacter(line,column)
  const owner = record.owners.find(owner => offset >= owner.start && offset < owner.end)
  return owner ? {name:owner.name,line:owner.line} : {name:'<unowned>',line:line+1}
}
function graph(packageRoot, entry) {
  const generatedRoot = join(packageRoot,'mapped-dist'), seen = new Set(), pending = [entry], artifacts=[]
  while(pending.length) {
    const file = pending.pop()
    if(seen.has(file)) continue
    seen.add(file)
    const code = readFileSync(join(generatedRoot,file),'utf8')
    const reference = readFileSync(join(packageRoot,'dist',file))
    if(!Buffer.from(code).equals(reference)) throw Error('Map build parity failed: '+file)
    const ast = ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS)
    if(ast.parseDiagnostics.length) throw Error('Cannot parse emitted artifact: '+file)
    const imports = [], nonliteralLoads = [], spans=literals(ast)
    function visit(node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) imports.push(node.moduleSpecifier.text)
      if(ts.isCallExpression(node) && (node.expression.kind===ts.SyntaxKind.ImportKeyword ||
        ts.isIdentifier(node.expression) && ['require','__require'].includes(node.expression.text))) {
        if(node.arguments.length===1 && (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))) imports.push(node.arguments[0].text)
        else nonliteralLoads.push(node.getText(ast))
      }
      ts.forEachChild(node,visit)
    }
    visit(ast)
    for(const specifier of imports) {
      if(specifier.startsWith('.')) pending.push(relative(generatedRoot,resolve(generatedRoot,dirname(file),specifier)))
      else if(specifier!=='react') throw Error('Unexpected runtime external: '+specifier)
    }
    if(nonliteralLoads.length) throw Error('Nonliteral runtime load in '+file+': '+JSON.stringify(nonliteralLoads))
    const mapBytes=readFileSync(join(generatedRoot,file+'.map')), parsed=JSON.parse(mapBytes), map=new SourceMap(parsed)
    const sourceInventory=parsed.sources.map((name,index)=>{
      const absolute=resolve(generatedRoot,dirname(file),parsed.sourceRoot??'',name),bytes=readFileSync(absolute)
      if(typeof parsed.sourcesContent?.[index]!=='string' || !bytes.equals(Buffer.from(parsed.sourcesContent[index])))throw Error('Map source content mismatch: '+name)
      return {source:relative(packageRoot,absolute),sha256:sha(bytes)}
    })
    const owners=new Map(); let line=0,column=0,total=0,literalIndex=0
    for(let offset=0;offset<code.length;) {
      const cp=code.codePointAt(offset),width=cp>0xffff?2:1,char=code.slice(offset,offset+width),bytes=Buffer.byteLength(char)
      const location=map.findEntry(line,column)
      let source='<unmapped>',owner={name:'<unmapped>',line:0}
      if(location.originalSource && location.generatedLine===line) {
        const absolute=resolve(dirname(join(generatedRoot,file)),parsed.sourceRoot??'',location.originalSource)
        source=relative(packageRoot,absolute)
        if(!source.startsWith('src/')) throw Error('Unexpected mapped source: '+source)
        owner=sourceOwner(absolute,location.originalLine,location.originalColumn)
      }
      const key=source+'#'+owner.name+'@'+owner.line
      const record=owners.get(key)??{source,owner:owner.name,line:owner.line,bytes:0,literalTokenBytes:0}
      record.bytes+=bytes;total+=bytes
      while(literalIndex<spans.length && spans[literalIndex][1]<=offset) literalIndex++
      if(literalIndex<spans.length && spans[literalIndex][0]<=offset && offset<spans[literalIndex][1]) record.literalTokenBytes+=bytes
      owners.set(key,record)
      if(char==='\n') {line++;column=0} else column+=width
      offset+=width
    }
    if(total!==reference.length)throw Error('Attribution byte coverage failed')
    artifacts.push({file,bytes:total,sha256:sha(reference),mapSha256:sha(mapBytes),sources:parsed.sources,sourceInventory,literalSpans:spans,
      imports:[...new Set(imports)].sort(),owners:[...owners.values()].sort((a,b)=>b.bytes-a.bytes)})
  }
  artifacts.sort((a,b)=>a.file.localeCompare(b.file))
  const sources=new Map(),owners=new Map()
  for(const artifact of artifacts)for(const row of artifact.owners) {
    for(const [table,key] of [[sources,row.source],[owners,row.source+'#'+row.owner+'@'+row.line]]) {
      const accumulated=table.get(key)??{...row,bytes:0,literalTokenBytes:0};accumulated.bytes+=row.bytes;accumulated.literalTokenBytes+=row.literalTokenBytes;table.set(key,accumulated)
    }
  }
  const bytes=artifacts.reduce((total,a)=>total+a.bytes,0)
  if([...sources.values()].reduce((total,a)=>total+a.bytes,0)!==bytes)throw Error('Source totals')
  return {entry,bytes,artifacts,sourceBytes:[...sources.values()].sort((a,b)=>b.bytes-a.bytes),ownerBytes:[...owners.values()].sort((a,b)=>b.bytes-a.bytes)}
}
const cohorts={}
for(const cohort of ['control','minified-control','candidate']) {
  const packageRoot=join(root,cohort)
  cohorts[cohort]=Object.fromEntries(['theme-core.mjs','theme-core.cjs','theme.mjs','theme.cjs'].map(entry=>[entry,graph(packageRoot,entry)]))
}
const tools={node:process.version,typescript:ts.version,tsdown:'0.21.10',sourcemap:'hidden',sourceMapRuntime:'node:module SourceMap',
  typescriptImplementationSha256:sha(readFileSync('/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css/node_modules/typescript/lib/typescript.js'))}
const report={format:'crumbs.m10.5.runtime-owner-attribution',version:1,tools,cohorts,sourceDeclarations:Object.fromEntries([...sourceCache].map(([path,record])=>[path,record.owners])),
  method:'Each generated UTF-8 code point is assigned to its preceding same-line source-map entry and top-level source declaration. String/template token spans are classified independently. Full byte coverage includes unmapped spans. Source spans are attribution, not removable-byte or CPU estimates.'}
writeFileSync(join(root,'attribution.json'),JSON.stringify(report,null,2)+'\n')
for(const [cohort,entries] of Object.entries(cohorts))for(const [entry,result] of Object.entries(entries))
  console.log(JSON.stringify({cohort,entry,bytes:result.bytes,sources:result.sourceBytes,topOwners:result.ownerBytes.slice(0,12)},null,2))
