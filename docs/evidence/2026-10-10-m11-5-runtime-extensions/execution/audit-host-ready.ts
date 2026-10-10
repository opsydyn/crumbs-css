import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {m115SourceIdentity,m115Sha,verifyM115InputFiles} from '../../../../scripts/m11-5-qualification';
import {captureGuaranteesSourceIdentity} from '../../../../scripts/guarantees-matrix/source-identity';
const root=process.cwd(),e=join(root,'docs/evidence/2026-10-10-m11-5-runtime-extensions');
const read=async(p:string)=>JSON.parse(await readFile(p,'utf8'));
function ensure(x:unknown,m:string):asserts x {if(!x)throw Error(m);}
const checks:{kind:string;path:string;sha256:string}[]=[];
const check=async(kind:string,path:string,expected:string)=>{const sha256=m115Sha(await readFile(path));ensure(sha256===expected,'Drift: '+path);checks.push({kind,path,sha256});};
const h=await read(join(e,'host/qualification.json')),source=await m115SourceIdentity();
ensure(h.mode==='full'&&h.host==='passed','Incomplete host');ensure(h.sourceBefore.digest===source.digest&&h.sourceAfter.digest===source.digest,'Source drift');
for(const f of source.files)await check('source',join(root,f.path),f.sha256);
for(const a of [h.artifact,h.extensionArtifact])await check('tarball',a.tarball,a.sha256);
for(const name of ['crumbs-css','crumbs-css-copy']) {const base=join(h.consumerRoot,'node_modules/@opsydyn',name);await verifyM115InputFiles(base,h.artifactHashes);for(const f of h.artifactHashes)await check('installed-'+name,join(base,f.path),f.sha256);}
for(const f of h.runtimePackageFiles)await check('runtime',join(h.consumerRoot,'node_modules/@acme/crumbs-extensions',f.path),f.sha256);
await verifyM115InputFiles(h.consumerRoot,h.nativeInputs);for(const f of h.nativeInputs)await check('native-input',join(h.consumerRoot,f.path),f.sha256);
for(const c of h.commands){ensure(c.exitCode===0,'Failed accepted host command');await check('command',c.log,c.sha256);}
for(const id of [1,2]){const c=await read(join(e,'cost/sample-'+id+'.json'));ensure(c.sourceBefore.digest===source.digest&&c.sourceAfter.digest===source.digest&&c.consumed,'Cost drift');for(const f of c.artifactFiles)await check('cost-artifact',join(root,'packages/css/dist',f.path),f.sha256);}
const input=await read(join(e,'host-budgets/input-identity.json')),collector=captureGuaranteesSourceIdentity(root);ensure(input.sourceBefore.sha256===input.sourceAfter.sha256&&input.sourceAfter.sha256===collector.sha256,'Collector source drift');ensure(JSON.stringify(input.artifactsBefore)===JSON.stringify(input.artifactsAfter)&&JSON.stringify(input.policyBefore)===JSON.stringify(input.policyAfter),'Collector artifact/policy drift');for(const f of input.artifactsAfter)await check('collector-artifact',join(root,'packages/css/dist',f.path),f.sha256);
const pre=await read(join(e,'execution/preflight.json'));await check('lock',join(root,'bun.lock'),pre.lockSha256);
for(const f of (await read(join(e,'host/exports-archive/inventory.json'))).files){await check('export-archive',join(root,f.archive),f.archiveSha256);ensure(m115Sha(gunzipSync(await readFile(join(root,f.archive))))===f.sha256,'Lossless archive drift');}
await writeFile(join(e,'host-ready-integrity.json'),JSON.stringify({schema:'crumbs.m11.5.host-ready-integrity.v1',sourceDigest:source.digest,artifactSha256:h.artifact.sha256,extensionArtifactSha256:h.extensionArtifact.sha256,collectorSourceDigest:collector.sha256,checks,allPassed:true,pending:['final repaired-source native acceptance','explicit new cold-budget disposition','dependency restoration','single implementation commit']},null,2)+'\n');console.log(JSON.stringify({source:source.digest,checks:checks.length,hostReady:true,nativeAcceptance:'pending'}));
