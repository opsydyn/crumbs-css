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
  const file=path.join(root,'fixtures/consumer/styles/button.css.ts');
  const dependency=path.join(root,'fixtures/consumer/styles/theme.css.ts');
  const cwd=path.dirname(path.dirname(file));
  const originalEntry=fs.readFileSync(file),originalDependency=fs.readFileSync(dependency);
  const run=async label=>{calls=[];const code=await transformer.transformCssTsToStyleSheet(file,cwd,{strictDiagnostics:true});rows.push({label,code,sha256:sha(code),entrySha256:sha(fs.readFileSync(file)),dependencySha256:sha(fs.readFileSync(dependency)),compileCalls:calls});return code};
  try{
   const baseline=await run('baseline');
   if(!baseline.includes('"minHeight":48'))throw Error('Missing baseline minHeight');
   fs.writeFileSync(file,originalEntry.toString().replace('minimumHeight + 0','minimumHeight + 1'));
   const editedEntry=await run('entry-edit');
   if(!editedEntry.includes('"minHeight":49'))throw Error('Entry edit did not update compiled minHeight');
   fs.writeFileSync(file,originalEntry);
   const restoredEntry=await run('entry-restore');
   if(restoredEntry!==baseline)throw Error('Entry restoration differs');
   fs.writeFileSync(dependency,originalDependency.toString().replace('minimumHeight = 48','minimumHeight = 50'));
   const editedDependency=await run('dependency-edit');
   if(!editedDependency.includes('"minHeight":50'))throw Error('Dependency edit did not update compiled minHeight');
   fs.writeFileSync(dependency,originalDependency);
   const restoredDependency=await run('dependency-restore');
   if(restoredDependency!==baseline)throw Error('Dependency restoration differs');
  }finally{fs.writeFileSync(file,originalEntry);fs.writeFileSync(dependency,originalDependency)}
 }catch(error){failure=String(error.stack||error);process.exitCode=1}
 finally{await originalEsbuild.stop();}
 fs.writeFileSync(output,JSON.stringify({format:'crumbs.m105.rolldown-spike.v1',variant,runtime:{node:process.version,bun:typeof Bun==='undefined'?null:Bun.version},stats,rows,...(failure?{failure}:{})},null,2)+'\n');
 if(failure)console.error(failure);
})().catch(error=>{console.error(error);process.exitCode=1});
