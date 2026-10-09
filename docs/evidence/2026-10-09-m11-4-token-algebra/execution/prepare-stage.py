from pathlib import Path
import json,hashlib,subprocess,shutil
r=Path.cwd();s=r/'.superpowers/sdd/2026-10-09-m11-4-token-algebra';e=r/'docs/evidence/2026-10-09-m11-4-token-algebra';base='72082f2c6cf9c4f0bf45d753e99a70274f2f7343'
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==base
assert subprocess.check_output(['git','branch','--show-current'],text=True).strip()=='main'
assert json.loads((e/'dependency-restoration.json').read_text())['allPassed']
assert json.loads((e/'independent-cleanup.json').read_text())['allPassed']
assert 'Task 5: complete' in (s/'progress.md').read_text()
assert not any(p.name.startswith('original-') and p.is_dir() for p in s.iterdir())
authored=json.loads((s/'authoring-manifest.json').read_text())+['docs/roadmap.md','docs/superpowers/specs/2026-10-09-m11-4-token-algebra-design.md','docs/superpowers/plans/2026-10-09-m11-4-token-algebra.md','docs/assessments/2026-10-09-m11-4-token-algebra.md']
# Scope whitespace checks to authored content; raw generated evidence is kept lossless.
check=subprocess.run(['git','diff','--check','--',*authored],capture_output=True,text=True);(s/'authored-working-diff-check.log').write_text(check.stdout+check.stderr);assert check.returncode==0
raw=subprocess.run(['git','diff','--check'],capture_output=True,text=True);(s/'unscoped-working-diff-check.log').write_text(raw.stdout+raw.stderr)
for f in sorted(s.rglob('*')):
 if f.is_symlink():raise AssertionError('Unexpected execution symlink '+str(f))
 if f.is_file():
  target=e/'execution'/f.relative_to(s);target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(f,target);assert target.read_bytes()==f.read_bytes()
assert not any(p.is_symlink() for p in e.rglob('*'))
paths=sorted(set(authored+[str(p.relative_to(r)) for p in e.rglob('*') if p.is_file()]))
assert all((r/p).is_file() and not (r/p).is_symlink() for p in paths)
assert not any('/node_modules/' in p or p.startswith('.superpowers/') or p.startswith('apps/storybook/ios/') for p in paths)
rows=[{'path':p,'sha256':hashlib.sha256((r/p).read_bytes()).hexdigest(),'bytes':(r/p).stat().st_size} for p in paths]
manifest={'schema':'crumbs.m11.4.final-commit-manifest.v1','base':base,'authored':authored,'files':rows}
out=Path('/private/tmp/crumbs-m114-final-commit-manifest.json');out.write_text(json.dumps(manifest,indent=2)+'\n')
# Add only individually enumerated authorised files; generated dist/log/tar evidence may be ignored.
for i in range(0,len(paths),70):subprocess.run(['git','add','-f','--',*paths[i:i+70]],check=True)
staged=subprocess.check_output(['git','diff','--cached','--name-only','-z']).decode().split('\0');assert sorted(filter(None,staged))==paths
for row in rows:
 blob=subprocess.check_output(['git','show',':'+row['path']]);assert hashlib.sha256(blob).hexdigest()==row['sha256'];assert (r/row['path']).read_bytes()==blob
check=subprocess.run(['git','diff','--cached','--check','--',*authored],capture_output=True,text=True);assert check.returncode==0,(check.stdout,check.stderr)
print(json.dumps({'manifest':str(out),'authorisedFiles':len(paths),'authoredFiles':len(authored),'stagedBytes':sum(row['bytes'] for row in rows),'everyStagedByteMatches':True,'authoredWhitespace':'passed','unscopedRawWhitespaceExit':raw.returncode}))
