import {readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {m114SourceIdentity,m114Sha,verifyM114InputFiles} from '../../../scripts/m11-4-qualification';
import {captureGuaranteesSourceIdentity} from '../../../scripts/guarantees-matrix/source-identity';
const root=process.cwd(),e=join(root,'docs/evidence/2026-10-09-m11-4-token-algebra');
const read=async(p:string)=>JSON.parse(await readFile(p,'utf8'));
function ensure(v:unknown,m:string):asserts v{if(!v)throw Error(m)}
const checks:{kind:string,path:string,sha256:string}[]=[];
const check=async(kind:string,path:string,expected:string)=>{const actual=m114Sha(await readFile(path));ensure(actual===expected,'Drift '+path);checks.push({kind,path,sha256:actual})};
const host=await read(join(e,'host/qualification.json')),native=await read(join(e,'native/qualification.json'));
ensure(host.host==='passed'&&native.acceptance==='passed'&&native.ios==='passed'&&native.android==='passed','Incomplete cohort');
const source=await m114SourceIdentity();
for(const x of [host.sourceBefore,host.sourceAfter,native.sourceBefore,native.sourceAfter])ensure(x.digest===source.digest,'Source digest drift');
for(const f of source.files)await check('source',join(root,f.path),f.sha256);
await check('tarball',host.artifact.tarball,host.artifact.sha256);
await check('native-host-receipt',join(e,'host/qualification.json'),native.hostReceiptSha256);
const owner=join(root,'.superpowers/sdd/2026-10-09-m11-4-token-algebra/ownership.json');await check('ownership',owner,native.ownershipSha256);
for(const name of ['crumbs-css','crumbs-css-copy']){const base=join(host.consumerRoot,'node_modules/@opsydyn',name);await verifyM114InputFiles(base,host.artifactHashes);for(const f of host.artifactHashes)await check('installed-'+name,join(base,f.path),f.sha256)}
await verifyM114InputFiles(host.consumerRoot,host.nativeInputs);for(const f of host.nativeInputs)await check('native-input',join(host.consumerRoot,f.path),f.sha256);
for(const cmd of [...host.commands,...native.commands]){ensure(cmd.exitCode===0,'Failed accepted command');await check('command',cmd.log,cmd.sha256)}
for(const p of ['ios','android']){ensure(native[p+'Phases'].length===12,'Incomplete '+p+' phases');for(const f of native[p+'Phases'])await check('image',f.file,f.sha256)}
for(const b of native.bundles)for(const [suffix,key] of [['bundle','sha256'],['map','mapSha256']] as const){const file=join(e,'native',b.platform+'-served.'+suffix+'.gz'),bytes=gunzipSync(await readFile(file));ensure(m114Sha(bytes)===b[key],'Archived served drift');checks.push({kind:'served-'+suffix,path:file,sha256:m114Sha(bytes)})}
for(const sample of ['run-1','run-2'])for(const row of (await read(join(e,'costs',sample+'.json'))).sizes)await check('cost-entry',join(root,'packages/css/dist/tokens-algebra.'+(row.format==='esm'?'mjs':'cjs')),row.sha256);
const input=await read(join(e,'host-budgets/input-identity.json')),collector=captureGuaranteesSourceIdentity(root);
ensure(input.sourceBefore.sha256===input.sourceAfter.sha256&&input.sourceAfter.sha256===collector.sha256,'Collector source drift');
ensure(JSON.stringify(input.artifactsBefore)===JSON.stringify(input.artifactsAfter)&&JSON.stringify(input.policyBefore)===JSON.stringify(input.policyAfter),'Collector artifact/policy drift');
for(const f of input.artifactsAfter)await check('collector-artifact',join(root,'packages/css/dist',f.path),f.sha256);
ensure(native.cleanup.every((c:any)=>c.status==='passed'),'Native cleanup failed');
await writeFile(join(e,'final-integrity.json'),JSON.stringify({schema:'crumbs.m11.4.final-integrity.v1',sourceDigest:source.digest,artifactSha256:host.artifact.sha256,collectorSourceDigest:collector.sha256,checks,checkedAt:new Date().toISOString(),allPassed:true},null,2)+'\n');
console.log(JSON.stringify({functionalSource:source.digest,artifact:host.artifact.sha256,collectorSource:collector.sha256,checks:checks.length}));
