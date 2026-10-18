import {readFileSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const [root,variant,out]=process.argv.slice(2);
const req=createRequire(root+'/package.json');
const {parse}=req('@babel/parser');
const targets=new Set(['compile','captureResolutionIdentity','hasChangedResolutionIdentity','assertPackageScopeIdentity','evaluateCompiledCssModule','processVanillaFileForNative','analyseDependencyInputs','createDependencyCacheIdentity','getCacheKey','buildStyleSheetCode','sourceIdentity']);
let active:any=null;
(globalThis as any).__crumbsProbe=(name:string,start:number)=>{if(active)active.spans.push({name,start,end:performance.now()})};
if(variant==='historical')Bun.plugin({name:'historical-pipeline-only',setup(build){build.onLoad({filter:/\/src\/transformer\.ts$/},()=>({contents:readFileSync('/private/tmp/crumbs-m105-root-cause-20261018/historical-transformer.ts','utf8'),loader:'ts'}))}});
if(variant==='profile')Bun.plugin({name:'owned-read-only-profiling',setup(build){build.onLoad({filter:/\/src\/(transformer|compiler\/(resolution-identity|stable-resolution-compile|dependency-analysis))\.ts$/},args=>{
 let source=readFileSync(args.path,'utf8').replace('return compileWithStableResolution(', 'return await compileWithStableResolution(');const ast=parse(source,{sourceType:'module',plugins:['typescript']});let edits:any[]=[];
 for(const item of ast.program.body){const n=item.type==='ExportNamedDeclaration'?item.declaration:item;if(n?.type!=='FunctionDeclaration'||!targets.has(n.id?.name))continue;
 edits.push([n.body.start+1,`const __probeStart=performance.now();try{`],[n.body.end-1,`}finally{globalThis.__crumbsProbe(${JSON.stringify(n.id.name)},__probeStart);}`]);}
 for(const [at,text] of edits.sort((a,b)=>b[0]-a[0]))source=source.slice(0,at)+text+source.slice(at);
 return {contents:source,loader:'ts'};
})}});
const {transformCssTsToStyleSheet}=await import(root+'/src/transformer.ts');
const events=[];process.chdir(root);
for(const [label,file,cwd]of [['README','examples/recipe.css.ts',root],['consumer','fixtures/consumer/styles/button.css.ts',root+'/fixtures/consumer']])for(let i=-2;i<6;i++){
 active={label,i,spans:[],start:performance.now()};const code=await transformCssTsToStyleSheet(root+'/'+file,cwd,{strictDiagnostics:true});active.end=performance.now();active.outputSha=new Bun.CryptoHasher('sha256').update(code).digest('hex');events.push(active);active=null;
}
writeFileSync(out,JSON.stringify({variant,events},null,2));process.exit(0);
