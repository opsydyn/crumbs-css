from pathlib import Path
import json,hashlib,tarfile,shutil
p=Path('docs/evidence/2026-10-09-m11-4-token-algebra');roots=[p/f'superseded-host-{i:02d}' for i in [1,2,3,4]]+[p/f'failed-native-{i:02d}' for i in [2,3,4]]+[p/'pre-review-cohort-05'];rows=[]
for root in roots:
 assert root.is_dir()
 for f in sorted(root.rglob('*')):
  assert not f.is_symlink()
  if f.is_file():rows.append({'path':str(f.relative_to(p)),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
archive=p/'superseded-cohorts.tar.gz';assert not archive.exists()
with tarfile.open(archive,'w:gz') as tar:
 for root in roots:tar.add(root,arcname=str(root.relative_to(p)),recursive=True)
expected={r['path']:r for r in rows};seen=set()
with tarfile.open(archive,'r:gz') as tar:
 for member in tar.getmembers():
  if not member.isfile():continue
  assert member.name in expected;data=tar.extractfile(member).read();row=expected[member.name];assert len(data)==row['bytes'] and hashlib.sha256(data).hexdigest()==row['sha256'];seen.add(member.name)
assert seen==set(expected)
(p/'superseded-archive.json').write_text(json.dumps({'schema':'crumbs.m11.4.lossless-history.v1','archive':archive.name,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'bytes':archive.stat().st_size,'verifiedMembers':len(rows),'members':rows,'pathSemantics':'The original relocation indices identify virtual member prefixes inside this archive. Extract to an owned directory, and verify every size/hash. Raw receipts are unchanged; relocation and compression are not new executions.'},indent=2)+'\n')
for root in roots:shutil.rmtree(root)
print('Lossless history verified',len(rows),'members;',archive.stat().st_size,'bytes')
