from pathlib import Path,PurePosixPath
import tarfile,shutil
repo=Path('/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css')
root=Path('/private/tmp/crumbs-m105-compact-runtime')
root.mkdir(exist_ok=False)
cache=Path('/private/tmp/crumbs-css-m105-clean/node_modules/.bun')
for name in ['control','candidate']:
 p=root/name;p.mkdir()
 with tarfile.open(repo/'docs/evidence/2026-10-08-m10-5-consolidated-host-remediation/control-package.tar.gz','r:gz') as archive:
  for item in archive:
   assert item.isfile() and not PurePosixPath(item.name).is_absolute() and '..' not in PurePosixPath(item.name).parts
   f=p/item.name;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(archive.extractfile(item).read())
 modules=p/'node_modules';modules.mkdir()
 for dep,target in [('tsdown','tsdown@0.21.10+0b680d063ff02e1e/node_modules/tsdown'),('react','react@19.2.3/node_modules/react')]:
  (modules/dep).symlink_to(cache/target)
 for directory in ['dist']:
  shutil.rmtree(p/directory)
shutil.copyfile(repo/'docs/evidence/2026-10-08-m10-5-runtime-architecture-attribution/code/build.mjs',root/'build.mjs')
print(root)
