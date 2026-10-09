from pathlib import Path
import json,subprocess,hashlib
r=Path.cwd();s=r/'.superpowers/sdd/2026-10-09-m11-4-token-algebra';p=json.loads((s/'preflight.json').read_text());observed=[]
for d in p['originalDependencies']:
 q=r/d['path'];assert (q.is_symlink() and q.readlink().as_posix()==d['target']) if d['kind']=='symlink' else (q.is_dir() and not q.is_symlink())
for name in ['node_modules','packages/css/node_modules']:
 q=r/name/'effect/package.json';observed.append({'root':name,'effectManifest':str(q),'exists':q.exists(),'version':json.loads(q.read_text())['version'] if q.exists() else None,'resultEntryExists':(q.parent/'dist/Result.js').exists()})
(s/'restored-dependency-diagnosis.json').write_text(json.dumps(observed,indent=2)+'\n')
for d in p['originalDependencies']:
 q=r/d['path']
 if d['kind']=='directory':q.rename(Path(d['backup']))
 else:q.unlink()
 q.symlink_to(Path(p['installation'])/d['path'])
for d in p['ownedWorkspaceLinks']:
 q=Path(d['path']);assert q.is_symlink() and q.readlink().as_posix()==d['target'];q.unlink();q.symlink_to(r/'packages/css')
try:
 res=subprocess.run(['/Users/alancurrie/.codex/plugins/cache/openai-curated-remote/superpowers/6.4.2/skills/executing-plans/scripts/task-done','docs/superpowers/plans/2026-10-09-m11-4-token-algebra.md','5','72082f2','--','bun','run','test']);code=res.returncode
finally:
 subprocess.run(['python3',str(s/'restore-deps.py')],check=True)
raise SystemExit(code)
