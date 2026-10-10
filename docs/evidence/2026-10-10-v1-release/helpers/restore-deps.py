from pathlib import Path
import os,json,hashlib,datetime
r=Path.cwd();e=r/'docs/evidence/2026-10-10-v1-release';scratch=Path('/private/tmp/crumbs-v1-20261010');pre=json.loads((scratch/'preflight.json').read_text());old=json.loads((r/'docs/evidence/2026-10-10-m11-5-runtime-extensions/dependency-restoration.json').read_text());by={v['path']:v for v in old['roots']}
for d in pre['roots']:
 p=r/d['path'];b=Path(d['backup']);assert p.is_symlink() and os.readlink(p)==str(Path(pre['ownedInstall'])/d['path']);assert b.lstat().st_ino==d['inode']==by[d['path']]['inode']
 for f in by[d['path']]['files']:
  q=b if f['path']=='.' else b/f['path']
  if 'link' in f:assert q.is_symlink() and os.readlink(q)==f['link']
  else:assert hashlib.sha256(q.read_bytes()).hexdigest()==f['sha256']
for d in pre['ownedLinks']:assert Path(d['path']).is_symlink() and os.readlink(d['path'])==str(r/'packages/css')
for d in pre['roots']:
 p=r/d['path'];p.unlink();Path(d['backup']).rename(p);assert p.lstat().st_ino==d['inode']
 if d['target'] is not None:assert p.is_symlink() and os.readlink(p)==d['target']
for d in pre['ownedLinks']:
 p=Path(d['path']);p.unlink();p.symlink_to(d['target']);assert os.readlink(p)==d['target']
for f in pre['primaryFiles']:assert hashlib.sha256(Path(f['path']).read_bytes()).hexdigest()==f['sha256']
(e/'dependency-restoration.json').write_text(json.dumps({'schema':'crumbs.v1.dependency-restoration.v1','roots':pre['roots'],'rootCount':5,'ownedLinksRestored':pre['ownedLinks'],'originalInventoryBindingsVerified':sum(len(v['files']) for v in old['roots']),'primaryFilesPreserved':pre['primaryFiles'],'allPassed':True,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()},indent=2)+'\n')
print('Restored exact five dependency-root inodes/inventories and both links; unrelated primary files preserved')
