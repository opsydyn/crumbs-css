import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, symlinkSync, realpathSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";
import { prepareQualificationFixture } from "./qualification-fixture";
import { shippingInventory } from "./build-candidate";
import { qualificationHash as hash } from "./qualify";
export function isCurrentGraphEntry(trace: { entryHash?: string; diskEntryHash?: string } | undefined, currentHash: string): boolean {
 return trace?.entryHash === currentHash && trace.diskEntryHash === currentHash;
}
// Diagnosis only: fresh/immediate stock Metro, isolated edits, forced entry invalidation, new owner.
export async function diagnoseGraph(root: string) {
 const before=shippingInventory(),f=await prepareQualificationFixture(root),g=f.integration;
 const entry=g.entries[0];if(!entry)throw Error("Missing entry fixture");
 const originalFiles=[entry,join(g.app,"tsconfig.base.json"),join(g.workspace,"package.json")];
 const originals=new Map(originalFiles.map(p=>[p,readFileSync(p)]));
 const report:any={base:"7be16ed",scope:"Private Node/stock SDK-peer Metro graph diagnosis; no production admission, timing budget or device claim",fixture:f,shippingBefore:before,rows:[],owners:[],restoration:[]};
 const save=()=>writeFileSync(join(root,"diagnosis.json"),JSON.stringify(report,null,2));save();
 // Full boundary values and supplied entry bytes, outside transform timings.
 const wrapper=readFileSync(f.wrapper,"utf8").replace("resultHash:hash(JSON.stringify(result)),", "entryHash:hash(args[3]),diskEntryHash:hash(fs.readFileSync(require('node:path').resolve(args[1],args[2]))),result,resultHash:hash(JSON.stringify(result)),").replace("filePath:r.filePath,sourceHash:","filePath:r.filePath,receipt:r.receipt,sourceHash:");
 writeFileSync(f.wrapper,wrapper);
 const port=8162,url=`http://[::1]:${port}/index.bundle?platform=ios&dev=false&minify=false&modulesOnly=false&runModule=true`;
 const match=(body:string,property:string,value:number)=>({padding:["paddingTop","paddingBottom","paddingLeft","paddingRight"],borderWidth:["borderTopWidth","borderBottomWidth","borderLeftWidth","borderRightWidth"]}[property]??[property]).every(field=>new RegExp('\\b'+field+'"?\\s*:\\s*'+value+'\\b').test(body));
 const restore=()=>{for(const[p,b]of originals)writeFileSync(p,b);unlinkSync(g.link);symlinkSync(g.workspace,g.link);};
 for(const kind of ["alias-retarget","workspace-package-import","symlink-retarget"])for(const mode of ["fresh","immediate"]) {
  restore();const id=kind+"-"+mode,trace=join(root,id+"-trace");mkdirSync(trace);
  const source=readFileSync(entry,"utf8");
  if(kind==="alias-retarget") {writeFileSync(join(g.app,"tsconfig.base.json"),JSON.stringify({compilerOptions:{baseUrl:".",paths:{"qual-token":["./src/token.ts"]}}}));writeFileSync(entry,source.replace("from './token'","from 'qual-token'"));}
  if(kind==="symlink-retarget")writeFileSync(entry,source.replace("'../../bundle-workspace/tokens'","'qualification-workspace-tokens/tokens'"));
  const session=join(root,id+"-session.json");writeFileSync(session,JSON.stringify({mode,settings:{capacity:8,admission:"immediate"},idleMs:120000,domain:g.domain}));
  const traces=()=>readdirSync(trace).flatMap(n=>readFileSync(join(trace,n),"utf8").trim().split("\n").filter(Boolean).map(x=>JSON.parse(x))).filter(x=>x.kind==="transform"&&x.args[2].endsWith("Q0.css.ts")).sort((a,b)=>a.at-b.at);
  let sequence=0;
  const start=async()=>{
   const ownerId=id+"-"+(sequence++),exit=join(root,ownerId+"-close.json");
   const child=Bun.spawn(["node",join(import.meta.dir,"graph-diagnosis-server.cjs"),join(root,"qualification-fixture.json"),String(port),exit],{cwd:g.app,env:{...process.env,EXPO_NO_METRO_WORKSPACE_ROOT:"1",CRUMBS_CONTEXT_QUALIFICATION_CONFIG:session,CRUMBS_QUALIFICATION_TRACE:trace},stdout:"pipe",stderr:"pipe"});
   const stdout=new Response(child.stdout).text(),stderr=new Response(child.stderr).text();
   // Public status polling, bounded, rather than assuming server readiness from elapsed time.
   const began=performance.now();let ready=false;
   while(performance.now()-began<45000){try{const r=await fetch(url,{signal:AbortSignal.timeout(10000)});await r.text();if(r.status===200){ready=true;break;}}catch{}await Bun.sleep(100);}
   const stop=async()=>{child.kill("SIGINT");const timeout=setTimeout(()=>child.kill("SIGKILL"),15000);const exitCode=await child.exited;clearTimeout(timeout);writeFileSync(join(root,ownerId+".log"),(await stdout)+"\n"+(await stderr));if(exitCode!==0)throw Error("Owned Metro exit failed: "+ownerId);const data=JSON.parse(readFileSync(exit,"utf8"));if(data.closed.live||data.closed.cleanupFailures||data.closed.state!=="closed")throw Error("Owner resources not closed");report.owners.push({id:ownerId,exitCode,...data});save();};
   if(!ready){await stop();throw Error("Metro unavailable");}return stop;
  };
  let stop: (() => Promise<void>) | undefined;
  const stage=async(stage:string,value:number,prior?:number)=>{
   const begun=Date.now(),previous=traces().length;let body="",status=0,attempts=0;
   const property=kind==="alias-retarget"?"padding":"borderWidth";
   const began=performance.now();do{attempts++;const r=await fetch(url,{signal:AbortSignal.timeout(30000)});status=r.status;body=await r.text();if(status===200&&match(body,property,value)&&(!prior||!match(body,property,prior))&&isCurrentGraphEntry(traces().at(-1),hash(readFileSync(entry))))break;await Bun.sleep(400);}while(performance.now()-began<8000);
   const all=traces(),actual=all.at(-1),entryHash=hash(readFileSync(entry));
   if(status!==200||!actual)throw Error("Missing successful Metro trace "+id+stage+body.slice(0,500));
   const refId=id+"-"+stage,refOutput=join(root,refId+"-reference.json"),refSpec=join(root,refId+"-spec.json"),refSession=join(root,refId+"-fresh.json");
   const store=join(root,"receipts");mkdirSync(store,{recursive:true});
   writeFileSync(refSession,JSON.stringify({mode:"fresh",settings:{capacity:8,admission:"immediate"},idleMs:1000,domain:g.domain}));
   writeFileSync(refSpec,JSON.stringify({id:refId,kind:"performance",transformerPath:f.artifact.transformerPath,mode:"fresh",capacity:8,app:g.app,entries:g.entries.map(p=>relative(g.app,p)),requests:[0],config:actual.args[0],options:actual.args[3],receiptStore:store,output:refOutput}));
   const ref=Bun.spawnSync(["node",join(import.meta.dir,"qualification-probe.cjs"),refSpec],{cwd:g.app,env:{...process.env,CRUMBS_CONTEXT_QUALIFICATION_CONFIG:refSession},maxBuffer:10000000});writeFileSync(join(root,refId+"-reference.log"),ref.stdout.toString()+ref.stderr.toString());if(ref.exitCode)throw Error(ref.stderr.toString());
   const reference=JSON.parse(readFileSync(refOutput,"utf8"));
   const state={entryHash,files:originalFiles.map(p=>({path:p,sha256:hash(readFileSync(p))})),link:realpathSync(g.link)};
   const row={id,kind,mode,stage,begun,status,attempts,property,value,prior,expectedPresent:match(body,property,value),previousAbsent:!prior||!match(body,property,prior),bundleHash:hash(body),state,traceCountBefore:previous,traceCountAfter:all.length,transformAfterRequest:actual.at>=begun,actual,reference};
   writeFileSync(join(root,refId+"-bundle.js.gz"),gzipSync(Buffer.from(body)));report.rows.push(row);save();console.log(JSON.stringify({id,stage,expected:row.expectedPresent,traceDelta:all.length-previous,entryMatches:actual.entryHash===entryHash,sourceEqual:actual.receipts[0].sourceHash===reference.rows[0].sourceHash,inputsEqual:actual.receipts[0].inputsHash===reference.rows[0].inputsHash,resultEqual:actual.resultHash===reference.rows[0].resultHash}));
  };
  try {
   stop=await start();
   await stage("initial",kind==="alias-retarget"?40011:41013);
   if(kind==="alias-retarget")writeFileSync(join(g.app,"tsconfig.base.json"),JSON.stringify({compilerOptions:{baseUrl:".",paths:{"qual-token":["./src/alias-token.ts"]}}}));
   else if(kind==="workspace-package-import")writeFileSync(entry,source.replace("'../../bundle-workspace/tokens'","'qualification-workspace-tokens/tokens'"));
   else {unlinkSync(g.link);symlinkSync(g.otherWorkspace,g.link);}
   const value=kind==="alias-retarget"?40017:kind==="symlink-retarget"?41023:41013;
   await stage("edit",value,kind==="workspace-package-import"?undefined:kind==="alias-retarget"?40011:41013);
   writeFileSync(entry,readFileSync(entry,"utf8")+"\n// diagnosis forced entry invalidation\n");
   await stage("forced-entry",value);
   writeFileSync(entry,readFileSync(entry,"utf8").replace("\n// diagnosis forced entry invalidation\n",""));
   await stop();stop=undefined;stop=await start();await stage("new-owner",value);
  }finally{try{await stop?.();}finally{restore();report.restoration.push({id,files:[...originals].map(([p,b])=>({path:p,original:hash(b),restored:hash(readFileSync(p))})),link:realpathSync(g.link)});save();}}
 }
 report.shippingAfter=shippingInventory();if(JSON.stringify(before)!==JSON.stringify(report.shippingAfter))throw Error("Shipping changed");save();return report;
}
if(import.meta.main){const root=process.argv[2];if(!root)throw Error("usage: bun graph-diagnosis.ts <empty-owned-root>");await diagnoseGraph(root);}
