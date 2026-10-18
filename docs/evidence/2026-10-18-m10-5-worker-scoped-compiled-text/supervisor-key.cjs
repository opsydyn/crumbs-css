const fs=require('node:fs');
const crypto=require('node:crypto');
const {createRequire}=require('node:module');
const path=require('node:path');
const root='/private/tmp/crumbs-m105-worker-20261018-w0r6f0k7/metro-eligible/app';
const req=createRequire(path.join(root,'package.json'));
const config=req(path.join(root,'metro.config.js'));
const expoConfig=req('expo/metro-config');
const workerPath=expoConfig.internal_supervisingTransformerPath;
const worker=req(workerPath);
const base={...config.transformer,expo_customTransformerPath:config.transformerPath};
const sessionA={...base,__crumbsNativeCacheSession:{...base.__crumbsNativeCacheSession,token:'test-session-A'}};
const sessionB={...base,__crumbsNativeCacheSession:{...base.__crumbsNativeCacheSession,token:'test-session-B'}};
const {__crumbsNativeCacheSession:ignored,...noSession}=base;
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
const key=c=>digest(worker.getCacheKey(c,{projectRoot:root}));
const report={
  stage:'installed Expo SDK 58 supervising worker cache-key isolation',
  workerPath,workerSha256:digest(fs.readFileSync(workerPath)),
  expoVersion:req('expo/package.json').version,
  onlyDifference:'__crumbsNativeCacheSession.token',
  sessionA:key(sessionA),sessionB:key(sessionB),
  unchangedA:key(base),unchangedB:key(base),
  noSessionA:key(noSession),noSessionB:key(noSession),
};
report.unchangedControlStable=report.unchangedA===report.unchangedB&&report.noSessionA===report.noSessionB;
report.sessionIsolationPassed=report.sessionA===report.sessionB;
console.log(JSON.stringify(report,null,2));
if(!report.unchangedControlStable||!report.sessionIsolationPassed)process.exitCode=1;
