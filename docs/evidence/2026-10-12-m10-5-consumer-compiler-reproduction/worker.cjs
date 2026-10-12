const {performance}=require('node:perf_hooks');
const {createHash}=require('node:crypto');
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {spawnSync}=require('node:child_process');
const root=__dirname;
process.chdir(root);
const mode=process.argv[2];
const phases=[];
if(mode==='profile') {
  const integration=require('@vanilla-extract/integration');
  const original=integration.compile;
  integration.compile=async function(...args) {
    const t=performance.now();const result=await original.apply(this,args);
    phases.push({phase:'vanilla-extract-compile',durationMs:performance.now()-t});return result;
  };
}
const {transformCssTsToStyleSheet}=require('@opsydyn/crumbs-css/dist/transformer');
const hash=code=>createHash('sha256').update(code).digest('hex');
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.ceil(xs.length/2)-1];
async function sample(file) {
  const t=performance.now();const code=await transformCssTsToStyleSheet(file,root,{strictDiagnostics:true});
  return {durationMs:performance.now()-t,outputSha256:hash(code),outputBytes:Buffer.byteLength(code),pid:process.pid};
}
async function main() {
  if(mode==='cold') {console.log(JSON.stringify(await sample(resolve(root,process.argv[3]))));return;}
  const results=[];
  for(const fixture of ['readme/recipe.css.ts','styles/button.css.ts']) {
    const cold=[];
    if(mode!=='profile') for(let n=0;n<6;n++) {
      const child=spawnSync(process.execPath,[__filename,'cold',fixture],{cwd:root,encoding:'utf8',env:process.env});
      if(child.status!==0) throw Error(child.stderr||child.stdout);
      cold.push(JSON.parse(child.stdout));
    }
    const file=resolve(root,fixture);
    await sample(file);await sample(file); // setup then one excluded warmup
    phases.length=0;
    const warm=[];
    for(let n=0;n<6;n++) warm.push(await sample(file));
    const outputs=new Set([...cold,...warm].map(s=>s.outputSha256));
    if(outputs.size!==1) throw Error('Output hash mismatch '+fixture);
    results.push({fixture,cold,warm,coldMedianMs:cold.length?median(cold.map(s=>s.durationMs)):null,warmMedianMs:median(warm.map(s=>s.durationMs)),outputSha256:warm[0].outputSha256,phases:[...phases]});
  }
  console.log(JSON.stringify({runtime:process.version,bun:process.versions.bun||null,mode,pid:process.pid,cwd:root,nodeEnv:process.env.NODE_ENV||'unset',protocol:'Six fresh-process cold samples per fixture; setup plus one excluded warmup, six same-process warm samples; same fixture-root cwd; startup/import excluded; no Metro cache',results}));
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
