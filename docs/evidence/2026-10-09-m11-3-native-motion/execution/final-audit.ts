import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {m113SourceIdentity,m113Sha,verifyM113InputFiles} from '../../../scripts/m11-3-qualification';
import {encodeM113AndroidRgba} from '../../../scripts/m11-3-native-observations';
const root=process.cwd(),evidence=join(root,'docs/evidence/2026-10-09-m11-3-native-motion');
const hostFile=join(evidence,'host/qualification.json'),host=JSON.parse(await readFile(hostFile,'utf8'));
const nativeDir=process.env.M113_NATIVE_ATTEMPT??'native-attempt-15',native=JSON.parse(await readFile(join(evidence,nativeDir,'qualification.json'),'utf8'));
const checks:string[]=[];
const ensure=(ok:boolean,name:string)=>{if(!ok)throw Error(name);checks.push(name)};
ensure(host.host==='passed'&&native.ios==='passed'&&native.android==='passed'&&native.acceptance==='passed','all functional phases passed');
const current=await m113SourceIdentity();ensure(current.digest===host.sourceBefore.digest&&host.sourceAfter.digest===current.digest&&native.sourceBefore.digest===current.digest&&native.sourceAfter.digest===current.digest,'source identity unchanged');
ensure(m113Sha(await readFile(host.artifact.tarball))===host.artifact.sha256&&native.artifact.sha256===host.artifact.sha256,'tarball identity unchanged');
ensure(m113Sha(await readFile(hostFile))===native.hostReceiptSha256,'native host receipt binding');
for(const file of host.artifactHashes){ensure(m113Sha(await readFile(join(host.installed.packageRoot,file.path)))===file.sha256,'installed '+file.path);ensure(m113Sha(await readFile(join(root,'packages/css',file.path)))===file.sha256,'current package '+file.path)}
await verifyM113InputFiles(host.consumerRoot,host.nativeInputs);checks.push('all authored/generated consumer inputs unchanged');
for(const command of native.commands)ensure(m113Sha(await readFile(command.log))===command.sha256,'native command '+command.log.split('/').at(-1));
for(const platform of ['ios','android']){
 for(const phase of native[platform+'Phases']){ensure(phase.status==='passed',platform+' phase '+phase.name);for(const image of [phase.image,phase.heldAgain].filter(Boolean)){ensure(m113Sha(await readFile(image.file))===image.sha256,platform+' image '+phase.name);if(image.raw){const compressed=await readFile(image.raw.file),original=gunzipSync(compressed);ensure(m113Sha(compressed)===image.raw.sha256&&m113Sha(original)===image.raw.rawSha256,platform+' raw '+phase.name);ensure(m113Sha(encodeM113AndroidRgba(original))===image.sha256,platform+' lossless PNG '+phase.name)}}}
 const bundle=native.bundles.find((x:any)=>x.platform===platform)!;
 ensure(m113Sha(gunzipSync(await readFile(join(evidence,nativeDir,platform+'-served.bundle.gz'))))===bundle.sha256,platform+' served bundle');
 ensure(m113Sha(gunzipSync(await readFile(join(evidence,nativeDir,platform+'-served.map.gz'))))===bundle.mapSha256,platform+' served map');
 ensure(m113Sha(await readFile(join(host.installed.packageRoot,'dist',bundle.entry)))===bundle.entrySha256,platform+' installed native entry');
}
ensure(native.cleanup.every((x:any)=>x.status==='passed'),'native restoration passed');
const result={schema:'crumbs.m11.3.final-integrity.v1',recordedAt:new Date().toISOString(),artifactSha256:host.artifact.sha256,sourceDigest:current.digest,nativeAttempt:nativeDir,passed:true,checks};
await writeFile(process.env.M113_AUDIT_OUTPUT??join(evidence,'final-integrity.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:true,checks:checks.length,source:current.digest,artifact:host.artifact.sha256}));
