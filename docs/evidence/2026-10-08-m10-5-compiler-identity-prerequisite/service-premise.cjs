// Throwaway adversarial compiler-identity probe. Only the owned native executable is replaced.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]),output=path.resolve(process.argv[3]);
const req=require('node:module').createRequire(path.join(root,'package.json'));
const integration=req('@vanilla-extract/integration'),esbuild=req('esbuild');
const integrationPath=req.resolve('@vanilla-extract/integration'),esbuildPath=req.resolve('esbuild');
const binary=require('node:module').createRequire(esbuildPath).resolve('@esbuild/darwin-arm64/bin/esbuild');
assert(binary.startsWith(root+path.sep),'Must own the executable');assert(esbuildPath.startsWith(root+path.sep),'Must own esbuild JS');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const env=()=>sha(JSON.stringify(Object.entries(process.env).sort(([a],[b])=>a.localeCompare(b))));
const original=fs.readFileSync(binary),mode=fs.statSync(binary).mode&0o777,input=path.join(root,'probe.css.ts');
const request={filePath:input,cwd:root,identOption:'debug'};
const snapshot=()=>Object.entries(require.cache).map(([name,module])=>({name,module,exports:module.exports,descriptors:Object.getOwnPropertyDescriptors(Object(module.exports))}));
const unchanged=before=>{
 const after=snapshot();if(after.length!==before.length)return false;
 return before.every((prior,i)=>{const current=after[i];if(!current||prior.name!==current.name||prior.module!==current.module||prior.exports!==current.exports)return false;const keys=Reflect.ownKeys(prior.descriptors);if(keys.length!==Reflect.ownKeys(current.descriptors).length)return false;return keys.every(key=>{const a=prior.descriptors[key],b=current.descriptors[key];return b&&a.value===b.value&&a.get===b.get&&a.set===b.set&&a.configurable===b.configurable&&a.enumerable===b.enumerable&&a.writable===b.writable;});});
};
const replace=bytes=>{const next=binary+'.owned-replacement';fs.writeFileSync(next,bytes,{mode});fs.renameSync(next,binary);};
(async()=>{
 let report,error;
 try{
  const first=await integration.compile(request);replace(Buffer.from('#!/bin/sh\nexit 71\n'));const confirmed=await integration.compile(request);assert.equal(sha(first.source),sha(confirmed.source));
  const bindings=snapshot(),environment=env(),inputSha=sha(fs.readFileSync(input));
  const before={environment,inputSha,sourceSha:sha(confirmed.source),watchFiles:confirmed.watchFiles,binarySha:sha(fs.readFileSync(binary)),originalBinarySha:sha(original),moduleCount:bindings.length,compile:integration.compile,build:esbuild.build,stop:esbuild.stop};
  await esbuild.stop();
  const guard={moduleInstancesAndShallowExportDescriptorsStable:unchanged(bindings),compileFunctionStable:integration.compile===before.compile,buildFunctionStable:esbuild.build===before.build,stopFunctionStable:esbuild.stop===before.stop,environmentStable:env()===environment,entryStable:sha(fs.readFileSync(input))===inputSha,binaryContentStable:sha(fs.readFileSync(binary))===before.binarySha};
  assert(guard.moduleInstancesAndShallowExportDescriptorsStable);assert(guard.environmentStable&&guard.entryStable);assert(guard.binaryContentStable);
  let failed;
  try{await integration.compile(request);}catch(freshError){failed={name:freshError.name,message:freshError.message};}
  assert(failed,'Fresh compilation must observe the unusable replacement executable');
  await esbuild.stop();replace(original);
  const restored=await integration.compile(request);assert.equal(sha(restored.source),before.sourceSha);assert.deepEqual(restored.watchFiles,before.watchFiles);
  report={format:'crumbs.m10.5.compiler-service-identity-counterexample',version:2,runtime:{node:process.version,bun:typeof Bun==='undefined'?null:Bun.version},request,compiler:{integrationPath,esbuildPath,binary,esbuildVersion:esbuild.version,binaryBytes:original.length,integrationEntrySha:sha(fs.readFileSync(integrationPath)),esbuildEntrySha:sha(fs.readFileSync(esbuildPath))},before:{...before,compile:undefined,build:undefined,stop:undefined},guard,freshOutcome:{kind:'error',...failed},unsafeReplayOutcome:{kind:'retained-source',sourceSha:before.sourceSha,executed:false},restored:{sourceSha:sha(restored.source),watchFiles:restored.watchFiles,binarySha:sha(fs.readFileSync(binary))},interpretation:'The service already ran the original executable when confirmation captured a replacement disk image. After stop(), all recorded bindings, environment, entry and disk-executable hash remain unchanged, but fresh compilation fails. A post-load disk snapshot cannot certify native service origin. No production memo or guard is implemented.'};
 }catch(caught){error={name:caught.name,message:caught.message};}
 finally{await esbuild.stop();if(sha(fs.readFileSync(binary))!==sha(original))replace(original);}
 if(error){console.error(JSON.stringify(error));process.exitCode=1;return;}
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({runtime:report.runtime,guard:report.guard,freshOutcome:report.freshOutcome,restored:report.restored.sourceSha}));
})().catch(error=>{console.error(error);process.exitCode=1;});
