from pathlib import Path
import json,hashlib,os
r=Path.cwd();s=r/'.superpowers/sdd/2026-10-09-m11-4-token-algebra';e=r/'docs/evidence/2026-10-09-m11-4-token-algebra';pre=json.loads((s/'preflight.json').read_text());inv={a['path']:a for a in json.loads((s/'dependency-original-inventories.json').read_text())};rows=[]
def inventory(p):
 out=[]
 for f in sorted(p.rglob('*')):
  if f.is_symlink():out.append({'path':str(f.relative_to(p)),'link':f.readlink().as_posix()})
  elif f.is_file():out.append({'path':str(f.relative_to(p)),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
 return out
for d in pre['originalDependencies']:
 p=r/d['path'];assert p.is_symlink();target=p.readlink().as_posix();expected=str(Path(pre['installation'])/d['path']);assert target==expected,(target,expected)
 if d['kind']=='directory':
  backup=Path(d['backup']);assert backup.stat().st_ino==inv[d['path']]['inode'];assert inventory(backup)==inv[d['path']]['files'];p.unlink();backup.rename(p);assert not p.is_symlink() and p.stat().st_ino==inv[d['path']]['inode'];assert inventory(p)==inv[d['path']]['files'];row={'path':d['path'],'kind':'directory','inode':p.stat().st_ino,'files':len(inv[d['path']]['files']),'restored':True}
 else:
  p.unlink();p.symlink_to(d['target']);assert p.readlink().as_posix()==d['target'];row={'path':d['path'],'kind':'symlink','target':d['target'],'restored':True}
 rows.append(row)
links=[]
for d in pre['ownedWorkspaceLinks']:
 p=Path(d['path']);assert p.is_symlink() and p.readlink().as_posix()==str(r/'packages/css');p.unlink();p.symlink_to(d['target']);assert p.readlink().as_posix()==d['target'];links.append(dict(d,restored=True))
for file,sha in pre['manifests'].items():
 if file=='packages/css/package.json':
  # The approved additive export is the sole manifest change; dependency/version/peer fields remain exact.
  import subprocess
  old=json.loads(subprocess.check_output(['git','show','72082f2:'+file]));new=json.loads((r/file).read_text());new['exports'].pop('./tokens/algebra');assert old==new
 else:assert hashlib.sha256((r/file).read_bytes()).hexdigest()==sha
(e/'dependency-restoration.json').write_text(json.dumps({'schema':'crumbs.m11.4.dependency-restoration.v1','roots':rows,'ownedWorkspaceLinks':links,'manifests':'all unchanged except authorised algebra export','lockSha256':pre['manifests']['bun.lock'],'allPassed':True},indent=2)+'\n');print('Restored five original dependency roots and two owned workspace links; manifests/lock unchanged except new export')
