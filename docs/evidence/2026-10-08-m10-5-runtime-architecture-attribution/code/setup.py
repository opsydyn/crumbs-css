import json,tarfile
from pathlib import Path,PurePosixPath
repo=Path('/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css')
root=Path('/private/tmp/crumbs-m105-runtime-attribution')
assert not root.exists()
root.mkdir()
cache=Path('/private/tmp/crumbs-css-m105-clean/node_modules/.bun')
for cohort in ['control','candidate']:
 package=root/cohort
 package.mkdir()
 with tarfile.open(repo/f'docs/evidence/2026-10-08-m10-5-consolidated-host-remediation/{cohort}-package.tar.gz','r:gz') as archive:
  for entry in archive:
   assert entry.isfile() and not PurePosixPath(entry.name).is_absolute() and '..' not in PurePosixPath(entry.name).parts
   path=package/entry.name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(archive.extractfile(entry).read())
 modules=package/'node_modules';modules.mkdir()
 for name,target in [('tsdown','tsdown@0.21.10+0b680d063ff02e1e/node_modules/tsdown'),('react','react@19.2.3/node_modules/react')]:
  (modules/name).symlink_to(cache/target)
print(root)
