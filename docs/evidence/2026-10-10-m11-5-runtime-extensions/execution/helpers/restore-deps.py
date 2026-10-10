from pathlib import Path
import json,os,hashlib
r=Path.cwd();e=r/'docs/evidence/2026-10-10-m11-5-runtime-extensions';pre=json.loads((e/'execution/preflight.json').read_text());rows=[]
def inventory(p):
 if p.is_symlink():return [{'path':'.','link':os.readlink(p)}]
 out=[]
 for f in sorted(p.rglob('*')):
  if f.is_symlink():out.append({'path':str(f.relative_to(p)),'link':os.readlink(f)})
  elif f.is_file():out.append({'path':str(f.relative_to(p)),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
 return out
# Prevalidate all seven owned links and all five preserved backups before any mutation.
for d in pre['roots']:
 p=r/d['path'];backup=Path(d['backup']);assert p.is_symlink() and os.readlink(p)==str(Path(pre['ownedInstall'])/d['path']);assert backup.lstat().st_ino==d['inode'];assert backup.is_symlink()==(d['kind']=='symlink')
 if d['kind']=='symlink':assert os.readlink(backup)==d['target']
 d['preservedInventory']=inventory(backup)
for d in pre['ownedLinks']:
 p=Path(d['path']);assert p.is_symlink() and os.readlink(p)==str(r/'packages/css')
assert hashlib.sha256((r/'bun.lock').read_bytes()).hexdigest()==pre['lockSha256']
for d in pre['roots']:
 p=r/d['path'];p.unlink();Path(d['backup']).rename(p);assert p.lstat().st_ino==d['inode'];assert inventory(p)==d['preservedInventory'];rows.append({'path':d['path'],'kind':d['kind'],'inode':p.lstat().st_ino,'target':os.readlink(p) if p.is_symlink() else None,'files':d['preservedInventory'],'restored':True})
links=[]
for d in pre['ownedLinks']:
 p=Path(d['path']);p.unlink();p.symlink_to(d['target']);assert os.readlink(p)==d['target'];links.append(dict(d,restored=True))
(e/'dependency-restoration.json').write_text(json.dumps({'schema':'crumbs.m11.5.dependency-restoration.v1','roots':rows,'ownedLinks':links,'lockSha256':pre['lockSha256'],'allPassed':True},indent=2)+'\n')
print('Restored exact five original root inodes/inventories and both owned link targets')
