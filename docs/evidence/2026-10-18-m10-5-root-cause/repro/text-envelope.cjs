// Diagnostic fixed-toolchain envelope. NOT a complete resolution/compiler identity proof.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const {createRequire}=require('node:module');
const [root,variant,out,fixtureArg]=process.argv.slice(2),req=createRequire(root+'/package.json');const integration=req('@vanilla-extract/integration'),compile=integration.compile;const ir=createRequire(req.resolve('@vanilla-extract/integration')),es=ir('esbuild');const sha=x=>crypto.createHash('sha256').update(x).digest('hex');let active;const memo=new Map();
function snapshot(inputs,cwd){return Object.keys(inputs).map(p=>{const f=path.resolve(cwd,p);return [f,fs.realpathSync(f),sha(fs.readFileSync(f))]})}
if(variant==='memo')integration.compile=async function(opts){
 const key=JSON.stringify([opts.filePath,opts.cwd,opts.identOption]);const prior=memo.get(key);
 const before=prior?JSON.stringify(snapshot(prior.inputs,opts.cwd)):null;
 if(prior?.ready&&before===prior.identity){active.hits++;for(const p of opts.esbuildOptions.plugins)p.setup({onEnd:cb=>cb({metafile:{inputs:structuredClone(prior.inputs)}})});return {...prior.result,watchFiles:[...prior.result.watchFiles]}}
 let inputs;active.misses++;const result=await compile({...opts,esbuildOptions:{...opts.esbuildOptions,plugins:[...opts.esbuildOptions.plugins,{name:'envelope-inputs',setup(b){b.onEnd(r=>{inputs=r.metafile.inputs})}}]}});
 if(memo.size>=16)memo.delete(memo.keys().next().value);if(Buffer.byteLength(result.source)<1024*1024){const identity=JSON.stringify(snapshot(inputs,opts.cwd));memo.set(key,{result,inputs,identity,ready:!!prior&&before===prior.identity&&identity===before&&result.source===prior.result.source&&JSON.stringify(inputs)===JSON.stringify(prior.inputs)});}return result;
};
const t=req(root+'/dist/transformer.cjs');const events=[];
(async()=>{process.chdir(root);try{
 const fixtures=fixtureArg?[['effect',fixtureArg,root]]:[['README','examples/recipe.css.ts',root],['consumer','fixtures/consumer/styles/button.css.ts',root+'/fixtures/consumer']];
 for(const [label,file,cwd]of fixtures)for(let i=-2;i<6;i++){
  if(label==='effect')process.env.CRUMBS_PROBE_VALUE=String(20+i);
  active={label,i,hits:0,misses:0,start:performance.now()};const code=await t.transformCssTsToStyleSheet(path.resolve(root,file),cwd,{strictDiagnostics:true});active.end=performance.now();active.outputSha=sha(code);if(label==='effect')active.code=code;events.push(active);
 }
}finally{await es.stop()};fs.writeFileSync(out,JSON.stringify({variant,warning:'Known-input validation only; compiler and full topology proof excluded; not production-safe',events},null,2));})().catch(e=>{console.error(e);process.exitCode=1});
