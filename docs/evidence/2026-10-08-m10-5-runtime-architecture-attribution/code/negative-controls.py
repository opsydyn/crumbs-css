import gzip,hashlib,json,shutil,subprocess,sys
from pathlib import Path
repo=Path('/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css')
evidence=repo/'docs/evidence/2026-10-08-m10-5-runtime-architecture-attribution'
root=Path('/private/tmp/crumbs-m105-attribution-verifier-controls')
root.mkdir(exist_ok=False)
(root/'2026-10-08-m10-5-consolidated-host-remediation').symlink_to(evidence.parent/'2026-10-08-m10-5-consolidated-host-remediation',target_is_directory=True)
results=[]
for name in ['valid','changed-raw','missing-raw','rehashed-allocation']:
 p=root/name;shutil.copytree(evidence,p)
 if name=='changed-raw':
  q=p/'attribution.json.gz';q.write_bytes(q.read_bytes()+b'changed')
 elif name=='missing-raw':(p/'mapped-artifacts.tar.gz').unlink()
 elif name=='rehashed-allocation':
  q=p/'attribution.json.gz';r=json.loads(gzip.decompress(q.read_bytes()))
  r['cohorts']['candidate']['theme-core.mjs']['artifacts'][0]['owners'][0]['bytes']+=1
  q.write_bytes(gzip.compress(json.dumps(r).encode()))
  manifest=json.loads((p/'packet.json').read_text());manifest['files'][q.name]=hashlib.sha256(q.read_bytes()).hexdigest()
  (p/'packet.json').write_text(json.dumps(manifest))
 result=subprocess.run([sys.executable,str(p/'verify.py')],capture_output=True,text=True)
 expected=0 if name=='valid' else 1
 assert result.returncode==expected,(name,result)
 if name=='rehashed-allocation':assert 'VLQ owner/literal derivation' in result.stderr,result.stderr
 results.append({'case':name,'exitCode':result.returncode,'stdout':result.stdout.strip(),'stderr':result.stderr.strip()})
(root/'verification-controls.json').write_text(json.dumps({'qualification':'diagnostic-only','controls':results},indent=2)+'\n')
print(json.dumps(results,indent=2))
