const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createRequire}=require('node:module');const {pathToFileURL}=require('node:url');
const root=path.resolve(process.argv[2]),variant=process.argv[3],output=path.resolve(process.argv[4]);
if(!['control','rolldown'].includes(variant))throw Error('Invalid variant');
const req=createRequire(path.join(root,'package.json'));
const compilerReq=createRequire(req.resolve('@vanilla-extract/integration'));
const originalEsbuild=compilerReq('esbuild');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const stats={calls:0,created:0,closed:0};
(async()=>{
 const toolsReq=createRequire(req.resolve('tsdown'));
 const {rolldown}=await import(pathToFileURL(toolsReq.resolve('rolldown')).href);
 if(variant==='rolldown'){
  const build=require('./bridge.cjs').createBridge(rolldown,stats);
  require.cache[compilerReq.resolve('esbuild')].exports=new Proxy(originalEsbuild,{get(target,key){return key==='build'?build:Reflect.get(target,key)}});
 }
 const integration=req('@vanilla-extract/integration'),original=integration.compile;
 let calls=[];
 integration.compile=async options=>{
  let metafile;const start=performance.now();
  const recorder={name:'owned-metafile-recorder',setup(build){build.onEnd(result=>{metafile=result.metafile})}};
  const result=await original({...options,esbuildOptions:{...options.esbuildOptions,plugins:[...(options.esbuildOptions?.plugins??[]),recorder]}});
  const ms=performance.now()-start;
  calls.push({ms,sourceSha256:sha(result.source),watchFiles:result.watchFiles,inputs:Object.entries(metafile.inputs).map(([file,info])=>({file,bytes:info.bytes,sha256:sha(fs.readFileSync(path.resolve(options.cwd,file))),imports:info.imports}))});
  return result;
 };
 const transformer=req(path.join(root,'dist/transformer.cjs'));
 process.chdir(root);
 const rows=[];let failure;
 try{
  for(const [label,file,cwd] of [['README','examples/recipe.css.ts',root],['consumer','fixtures/consumer/styles/button.css.ts',path.join(root,'fixtures/consumer')]]){
   const run=async()=>{calls=[];const start=performance.now();const code=await transformer.transformCssTsToStyleSheet(path.join(root,file),cwd,{strictDiagnostics:true});return {ms:performance.now()-start,sha256:sha(code),code,compileCalls:calls}};
   const setup=[await run(),await run()],samples=[];
   for(let n=0;n<6;n++)samples.push(await run());
   rows.push({label,file,cwd,setup,samples});
  }
 }catch(error){failure=String(error.stack||error);process.exitCode=1}
 finally{await originalEsbuild.stop();}
 fs.writeFileSync(output,JSON.stringify({format:'crumbs.m105.rolldown-spike.v1',variant,runtime:{node:process.version,bun:typeof Bun==='undefined'?null:Bun.version},stats,rows,...(failure?{failure}:{})},null,2)+'\n');
 if(failure)console.error(failure);
})().catch(error=>{console.error(error);process.exitCode=1});
