import {stage} from '/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css/scripts/playground.ts';
import {verifyInstalledArtifact} from '/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css/scripts/packed-distribution-contract.ts';
import {verifyCandidatePackageFiles,stagePureMotionProbe} from '/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css/scripts/playground-sdk-candidate.ts';
import {verifyRuntimeBundles} from '/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css/scripts/runtime-bundle-contract.ts';
import {mkdtemp,mkdir,rm,readFile,writeFile,cp} from 'node:fs/promises';import {tmpdir}from'node:os';import{join,dirname}from'node:path';import{createHash}from'node:crypto';
const sdk=Number(process.argv[2]); if(![56,57,58].includes(sdk))throw Error("Expected SDK");
const repo='/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css',base='/private/tmp/crumbs-m110a-20261016',out=join(base,'sdk'+sdk+'-qualified');await mkdir(out,{recursive:true});
const previous=JSON.parse(await readFile(join(out,'qualification.json'),'utf8'));const root=previous.root??previous.artifacts.root,tarball=(await readFile(join(base,'sdk58-artifact-path.txt'),'utf8')).trim(),consumer=previous.consumer;
const manifestPath=join(consumer,'package.json'),matched=JSON.parse(await readFile(manifestPath,'utf8'));
matched.dependencies['@opsydyn/crumbs-css']='file:'+tarball;await writeFile(manifestPath,JSON.stringify(matched,null,2));
const tarballSha256=createHash('sha256').update(await readFile(tarball)).digest('hex');
const files=JSON.parse(await readFile(join(base,'review-artifact/expected-files.json'),'utf8'));
const report:any={sdk,root,consumer,tarball,tarballSha256,crumbs:{...previous.crumbs,tarballSha256,files},checks:{},commands:[],recordedAt:new Date().toISOString(),requalification:"review parser repair; reused owned strict-install cohort"};
async function save(){await writeFile(join(out,'qualification.json'),JSON.stringify(report,null,2)+'\n')}
async function run(name:string,args:string[],cwd=consumer){console.log(name);const proc=Bun.spawn(args,{cwd,env:{...process.env,CI:'1',EXPO_NO_TELEMETRY:'1',EXPO_NO_METRO_WORKSPACE_ROOT:'1',npm_config_cache:join(root,'npm-cache')},stdout:'pipe',stderr:'pipe'});const [stdout,stderr,code]=await Promise.all([new Response(proc.stdout).text(),new Response(proc.stderr).text(),proc.exited]);await writeFile(join(out,name+'.log'),stdout+'\n'+stderr);report.commands.push({name,args,code});await save();if(code)throw Error(name+' failed');return stdout.trim()}
try{
 report.node=await run('node-version',['node','--version']);
 await run('strict-resolution',['npm','install','--package-lock-only','--strict-peer-deps','--ignore-scripts','--no-audit','--no-fund']);report.checks.strictResolution='passed';
 await run('install',['npm','ci','--strict-peer-deps','--no-audit','--no-fund']);
 const manifest=JSON.parse(await readFile(join(repo,'packages/css/package.json'),'utf8'));
 const installed=await verifyInstalledArtifact(consumer,manifest),reference={crumbs:{files:JSON.parse(await readFile('/private/tmp/crumbs-m110a-20261016/review-artifact/expected-files.json','utf8'))}};
 await verifyCandidatePackageFiles(installed.packageRoot,reference.crumbs.files);report.installed=installed;report.checks.installedBytes='passed';
 const source=join(repo,'packages/css/fixtures/packed-distribution/app');await mkdir(join(consumer,'test'),{recursive:true});
 for(const name of ['motion.integration.tsx','motion-peer.cjs','motion.node.mjs','motion-control-values.json'])await cp(join(source,'test',name),join(consumer,'test',name));await cp(join(source,'src/motion.types.tsx'),join(consumer,'src/motion.types.tsx'));await rm(join(dirname(installed.packageRoot),'crumbs-css-copy'),{recursive:true,force:true});await cp(installed.packageRoot,join(dirname(installed.packageRoot),'crumbs-css-copy'),{recursive:true});
 await run('installed-types',[join(consumer,'node_modules/.bin/tsc'),'--noEmit']);report.checks.types='passed';
 for(const order of ['esm-first','cjs-first']){const old=process.env.CRUMBS_IMPORT_ORDER;process.env.CRUMBS_IMPORT_ORDER=order;await run('motion-'+order,['bun','test','./test/motion.integration.tsx']);if(old===undefined)delete process.env.CRUMBS_IMPORT_ORDER;else process.env.CRUMBS_IMPORT_ORDER=old}
 const pure=await stagePureMotionProbe(consumer,installed.packageRoot,root);for(const format of ['esm','cjs'])await run('motion-pure-'+format,['node','test/motion.node.mjs',format],pure);report.checks.motion='passed';
 await run('all-platforms',[join(consumer,'node_modules/.bin/expo'),'export','--platform','all','--source-maps']);report.checks.exports='passed';report.runtimeBundles=await verifyRuntimeBundles(join(consumer,'dist'));report.checks.runtimeGraph='passed';report.contractPassed=true;
}catch(e){report.failure=String(e);throw e}finally{await save()}
