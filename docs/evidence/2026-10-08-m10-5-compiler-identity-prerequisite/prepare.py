from pathlib import Path
import shutil,json,hashlib
out=Path('/private/tmp/crumbs-m105-compiler-identity');healthy=Path('/private/tmp/crumbs-css-m105-clean/node_modules/.bun');root=Path('/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css')
owned=out/'owned-install';owned.mkdir(exist_ok=True)
modules=owned/'node_modules';modules.mkdir(exist_ok=True)
source=healthy/'@vanilla-extract+integration@8.0.10/node_modules'
for item in source.iterdir():
 if item.name.startswith('@'):
  scope=modules/item.name;scope.mkdir(exist_ok=True)
  for child in item.iterdir():
   target=scope/child.name
   if child.name=='integration' and item.name=='@vanilla-extract':shutil.copytree(child.resolve(),target,dirs_exist_ok=True)
   elif not target.exists():target.symlink_to(child.resolve(),target_is_directory=True)
 elif item.name=='esbuild':shutil.copytree(item.resolve(),modules/item.name,dirs_exist_ok=True)
 else:
  target=modules/item.name
  if not target.exists():target.symlink_to(item.resolve(),target_is_directory=True)
arch=modules/'@esbuild/darwin-arm64';arch.parent.mkdir(exist_ok=True);shutil.copytree(healthy/'@esbuild+darwin-arm64@0.27.7/node_modules/@esbuild/darwin-arm64',arch,dirs_exist_ok=True)
(owned/'package.json').write_text(json.dumps({'name':'crumbs-compiler-identity-owned','private':True})+'\n')
(owned/'probe.css.ts').write_text("import { style } from '@vanilla-extract/css';\nexport const box = style({ padding: 8 });\n")
print('Prepared owned integration/esbuild/native binary; shared dependencies only read through links')
