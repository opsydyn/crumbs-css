// Diagnostic only: two known fixtures, owned contexts, no production admission.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const [root,variant,out]=process.argv.slice(2);const req=createRequire(root+'/package.json');const ir=createRequire(req.resolve('@vanilla-extract/integration'));const es=ir('esbuild');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const contexts=new Map();const events=[];let active;
if(variant!=='control')require.cache[ir.resolve('esbuild')].exports={...es,async build(opts){
 const key=JSON.stringify([opts.entryPoints,opts.absWorkingDir]);let slot=contexts.get(key);
 if(!slot){
  slot={opts,cache:new Map()};contexts.set(key,slot);
  const scope=opts.plugins[0];if(scope.name!=='vanilla-extract-filescope')throw Error('Unexpected plugin');
  const freshReads={name:'fresh-input-bytes',setup(api){api.onLoad({filter:/.*/},args=>{
   if(args.namespace!=='file')throw Error('Unsupported namespace');
   const ext=path.extname(args.path);const loaders={'.ts':'ts','.tsx':'tsx','.js':'js','.jsx':'jsx','.mjs':'js','.cjs':'js','.json':'json'};if(!loaders[ext])throw Error('Unsupported input');
   active.reads++;return {contents:fs.readFileSync(args.path),loader:loaders[ext],resolveDir:path.dirname(args.path)};
  })}};
  const scoped={...scope,setup(api){scope.setup(new Proxy(api,{get(target,k){if(k!=='onLoad')return Reflect.get(target,k);return(filter,cb)=>target.onLoad(filter,async args=>{
   if(variant==='fresh-read-context')return cb(args);
   const bytes=fs.readFileSync(args.path,'utf8');active.reads++;const key=args.path+'\0'+bytes;let result=slot.cache.get(key);if(result){active.scopeHits++;return {...result};}
   result=await cb(args);slot.cache.set(key,result);return result;
  })}}))}};
  slot.ctx=await es.context({...opts,plugins:[scoped,freshReads,{name:'current-request-receipts',setup(api){api.onEnd(result=>{for(const p of slot.opts.plugins.slice(1))p.setup({onEnd:cb=>cb(result)})})}}]});
 }
 slot.opts=opts;const start=performance.now();try{return await slot.ctx.rebuild()}finally{active.builds.push(performance.now()-start)}
}};
const t=req(root+'/dist/transformer.cjs');
(async()=>{process.chdir(root);try{
 for(const [label,file,cwd]of [['README','examples/recipe.css.ts',root],['consumer','fixtures/consumer/styles/button.css.ts',root+'/fixtures/consumer']])for(let i=-2;i<6;i++){
  active={label,i,reads:0,scopeHits:0,builds:[],start:performance.now()};let code=await t.transformCssTsToStyleSheet(root+'/'+file,cwd,{strictDiagnostics:true});active.end=performance.now();active.outputSha=sha(code);events.push(active);
 }
}finally{for(const s of contexts.values())await s.ctx.dispose();await es.stop()}
fs.writeFileSync(out,JSON.stringify({variant,events},null,2));})().catch(e=>{console.error(e);process.exitCode=1});
