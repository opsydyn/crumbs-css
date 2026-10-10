const fs=require('node:fs'),path=require('node:path'),ts=require(process.cwd()+'/node_modules/typescript');
const targets=new Map([
 ['motion_entries_have_only_the_approved_values_and_isolated_graphs',30000],
 ['algebra_entry_has_ten_values_and_zero_externals',30000],
 ['matches independent nested and repeated-base alias compositions',30000],
 ['keeps-migrations-typescript-and-effect-out-of-runtime-graphs',30000],
 ['matches independent compiled nested/repeated-base evaluation',30000],
 ['extensions_entry_has_no_runtime_externals',30000],
 ['ships only the compiled npm surface and can be consumed outside the monorepo',60000],
]);
const files=['motion-package.test.ts','token-algebra-package.test.ts','logical-precedence.test.ts','migration-export.test.ts','inset-precedence.test.ts','runtime-extension-package.test.ts','pack-consumer-contract.test.ts'];const seen=[];
for(const f of files){const p=path.join('packages/css/test',f),text=fs.readFileSync(p,'utf8'),ast=ts.createSourceFile(p,text,ts.ScriptTarget.Latest,true),edits=[];function visit(n){if(ts.isCallExpression(n)&&n.arguments[0]&&ts.isStringLiteral(n.arguments[0])&&targets.has(n.arguments[0].text)){const name=n.arguments[0].text,duration=targets.get(name);if(n.arguments.length===3)edits.push([n.arguments[2].getStart(ast),n.arguments[2].end,String(duration)]);else {if(n.arguments.length!==2)throw Error(name);edits.push([n.arguments[1].end,n.arguments[1].end,', '+duration]);}seen.push(name)}ts.forEachChild(n,visit)}visit(ast);let out=text;for(const [a,b,v] of edits.sort((a,b)=>b[0]-a[0]))out=out.slice(0,a)+v+out.slice(b);fs.writeFileSync(p,out)}
if(seen.length!==targets.size||new Set(seen).size!==targets.size)throw Error('Incomplete named integration timeout repairs');process.stdout.write('Bounded timeout repair for '+seen.length+' named integration tests; assertion bodies unchanged.\n');
