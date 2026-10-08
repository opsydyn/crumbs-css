// THROWAWAY feasibility control. No complete proof, no production admission.
const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto');
const root=process.argv[2], mode=process.argv[3];
const req=require('node:module').createRequire(path.join(root,'package.json'));
const integration=req('@vanilla-extract/integration');
const original=integration.compile, cache=new Map();let hits=0,misses=0;
if(mode==='replay') integration.compile=async options=>{
 const key=JSON.stringify([options.filePath,options.cwd,options.identOption]);
 const prior=cache.get(key);
 if(prior){hits++;for(const plugin of options.esbuildOptions?.plugins??[]){plugin.setup({onEnd:callback=>callback(prior.metafile)});}return prior.result;}
 misses++;let metafile;
 const recorder={name:'probe-only-compiled-text',setup(build){build.onEnd(result=>{metafile={metafile:result.metafile};});}};
 const result=await original({...options,esbuildOptions:{...options.esbuildOptions,plugins:[...(options.esbuildOptions?.plugins??[]),recorder]}});
 cache.set(key,{result,metafile});return result;
};
const transformer=req(path.join(root,'dist/transformer.cjs'));
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
(async()=>{
 process.chdir(root);
 const rows=[];
 for(const [label,file,cwd] of [['README',path.join(root,'examples/recipe.css.ts'),root],['consumer',path.join(root,'fixtures/consumer/styles/button.css.ts'),path.join(root,'fixtures/consumer')]]){
  const run=()=>transformer.transformCssTsToStyleSheet(file,cwd,{strictDiagnostics:true});
  await run();await run();const samples=[];
  for(let i=0;i<6;i++){const start=performance.now();const code=await run();samples.push({ms:performance.now()-start,sha256:hash(code)});}
  const ordered=samples.map(row=>row.ms).sort((a,b)=>a-b);
  rows.push({label,file,cwd,medianMs:(ordered[2]+ordered[3])/2,samples});
 }
 console.log(JSON.stringify({mode,protocol:'diagnostic compiled CJS; package-root cwd; two setup calls; six full transform samples; no invalidation proof',bun:Bun.version,node:process.version,hits,misses,rows}));
})().catch(error=>{console.error(error);process.exitCode=1;});
