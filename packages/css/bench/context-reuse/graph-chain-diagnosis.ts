import { prepareQualificationFixture } from "./qualification-fixture";
import { shippingInventory } from "./build-candidate";
import { mkdirSync,readFileSync,writeFileSync,readdirSync } from "node:fs";
import { join } from "node:path";
export async function diagnoseChain(root:string, watch=false, noDiskCache=false){
 const nodeVersion=Bun.spawnSync(["node","--version"]);if(nodeVersion.exitCode)throw Error("Node unavailable");
 const before=shippingInventory(),f=await prepareQualificationFixture(root),g=f.integration;
 writeFileSync(f.wrapper,readFileSync(f.wrapper,"utf8").replace("resultHash:hash(JSON.stringify(result)),", "entryHash:hash(args[3]),diskEntryHash:hash(fs.readFileSync(require('node:path').resolve(args[1],args[2]))),result,resultHash:hash(JSON.stringify(result)),").replace("filePath:r.filePath,sourceHash:","filePath:r.filePath,receipt:r.receipt,sourceHash:"));
 const report:any={base:"7be16ed",scope:"Original Task 5 edit sequence through normal Expo CLI; no performance/device/admission claim",watch,noDiskCache,fixture:f,shippingBefore:before,trials:[]};
 if(noDiskCache){const config=join(g.app,"metro.config.js");writeFileSync(config,readFileSync(config,"utf8")+"\nmodule.exports.cacheStores=[];\n");}
 if(watch){
  const config=join(g.app,"metro.config.js");
  writeFileSync(config,readFileSync(config,"utf8")+`\nconst previousEnhance=module.exports.server.enhanceMiddleware;module.exports.server.enhanceMiddleware=(middleware,server)=>{const watcher=server.getBundler().getBundler().getWatcher();watcher.on('change',e=>require('node:fs').appendFileSync(process.env.CRUMBS_QUALIFICATION_TRACE+'/watch.jsonl',JSON.stringify({kind:'watch',at:Date.now(),rootDir:e.rootDir,changes:Object.fromEntries(['addedFiles','modifiedFiles','removedFiles'].map(k=>[k,[...e.changes[k]].map(([p,m])=>({path:p,isSymlink:m.isSymlink}))]))})+'\\n'));return previousEnhance?previousEnhance(middleware,server):middleware;};\n`);
 }
 for(const [index,mode]of (watch?["fresh"]:["fresh","immediate"]).entries()){
  const owned=join(root,mode);mkdirSync(owned);mkdirSync(join(owned,"receipts"));mkdirSync(join(owned,"trace"));
  // Original script expects its fixture and installation marker at its supplied root.
  writeFileSync(join(owned,"qualification-fixture.json"),JSON.stringify(f));writeFileSync(join(owned,"bun.lock"),"qualification-lock");
  const session=join(owned,"session.json");writeFileSync(session,JSON.stringify({mode,settings:{capacity:8,admission:"immediate"},idleMs:30000,domain:g.domain}));
  const port=(noDiskCache?8165:8163)+index,url=`http://[::1]:${port}/index.bundle?platform=ios&dev=false&minify=false&modulesOnly=false&runModule=true`;
  const child=Bun.spawn(["node",f.expoCli,"start","--offline","--port",String(port),"--clear","--max-workers","1"],{cwd:g.app,env:{...process.env,CI:undefined,EXPO_NO_TELEMETRY:"1",EXPO_NO_METRO_WORKSPACE_ROOT:"1",CRUMBS_CONTEXT_QUALIFICATION_CONFIG:session,CRUMBS_QUALIFICATION_TRACE:join(owned,"trace"),CRUMBS_QUALIFICATION_WORKERS:"1",CRUMBS_QUALIFICATION_THREADS:"0"},stdout:"pipe",stderr:"pipe"});
  const stdout=new Response(child.stdout).text(),stderr=new Response(child.stderr).text();let run:any;
  try{
   const began=performance.now();let ready=false;
   while(performance.now()-began<45000){if(child.exitCode!==null)throw Error("Owned Expo exited before readiness");try{const r=await fetch(url,{signal:AbortSignal.timeout(10000)});await r.text();if(r.status===200&&readdirSync(join(owned,"trace")).some(n=>n!=="watch.jsonl"&&readFileSync(join(owned,"trace",n),"utf8").includes(g.app))){ready=true;break;}}catch{}await Bun.sleep(200);}
   if(!ready)throw Error("Expo CLI unavailable");
   run=Bun.spawn([process.execPath,join(import.meta.dir,"graph-chain-controls.ts"),owned,url,join(owned,"trace"),"node"],{cwd:g.app,stdout:"pipe",stderr:"pipe"});
   const out=new Response(run.stdout).text(),err=new Response(run.stderr).text();const watchdog=setTimeout(()=>run.kill("SIGTERM"),300000);
   const exitCode=await run.exited;clearTimeout(watchdog);writeFileSync(join(owned,"controls.log"),(await out)+"\n"+(await err));if(exitCode)throw Error("Chain controls failed");
  }finally{
   const timeout=setTimeout(()=>child.kill("SIGKILL"),15000);child.kill("SIGINT");const exitCode=await child.exited;clearTimeout(timeout);writeFileSync(join(owned,"expo.log"),(await stdout)+"\n"+(await stderr));if(exitCode!==0)throw Error("Expo shutdown failed");
  }
  const traces=readdirSync(join(owned,"trace")).flatMap(n=>readFileSync(join(owned,"trace",n),"utf8").trim().split("\n").filter(Boolean).map(x=>JSON.parse(x)));
  report.trials.push({mode,node:nodeVersion.stdout.toString().trim(),cliPid:child.pid,observations:JSON.parse(readFileSync(join(owned,"integration-observations.json"),"utf8")),restoration:JSON.parse(readFileSync(join(owned,"integration-restoration.json"),"utf8")),traces});
  writeFileSync(join(root,"chain.json"),JSON.stringify(report));console.log("Completed chain "+mode);
 }
 report.shippingAfter=shippingInventory();if(JSON.stringify(before)!==JSON.stringify(report.shippingAfter))throw Error("Shipping changed");writeFileSync(join(root,"chain.json"),JSON.stringify(report));
}
if(import.meta.main){const root=process.argv[2];if(!root)throw Error("usage: bun graph-chain-diagnosis.ts <empty-owned-root>");await diagnoseChain(root,process.argv.includes("--watch"),process.argv.includes("--no-disk-cache"));}
