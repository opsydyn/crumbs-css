import pathlib,json,os
root=pathlib.Path.cwd();scratch=root/'.superpowers/sdd/2026-10-09-m11-3-native-motion';pre=json.loads((scratch/'preflight.json').read_text());install=pathlib.Path(pre['installRoot']).resolve();records=[]
for row in pre['originalDependencies']:
 p=root/row['path'];assert p.is_symlink(),p
 assert p.resolve()==(install/row['path']).resolve(),(p,p.resolve())
 if not row['symlink']:
  b=p.with_name('.m113-original-node_modules');assert b.is_dir() and not b.is_symlink(),b
for row in pre['originalDependencies']:
 p=root/row['path'];owned=os.readlink(p);p.unlink()
 if row['symlink']:p.symlink_to(row['link'],target_is_directory=True);assert os.readlink(p)==row['link']
 else:p.with_name('.m113-original-node_modules').rename(p);assert p.is_dir() and not p.is_symlink()
 records.append(dict(path=row['path'],ownedTemporaryLink=owned,restoredSymlink=p.is_symlink(),restoredLink=os.readlink(p) if p.is_symlink() else None,restoredRealpath=str(p.resolve()),original=row))
result=dict(schema='crumbs.m11.3.dependency-restoration.v1',scope='only five audited owned temporary links; original user links/directories restored, no primary dependency contents changed',passed=True,records=records)
(root/'docs/evidence/2026-10-09-m11-3-native-motion/dependency-restoration.json').write_text(json.dumps(result,indent=2)+'\n');print('Five original dependency roots restored')
