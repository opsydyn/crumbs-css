import pathlib,json,hashlib,tarfile,shutil
root=pathlib.Path('docs/evidence/2026-10-09-m11-3-native-motion')
dirs=sorted([p for p in root.iterdir() if p.is_dir() and (p.name.startswith('host-attempt-') or p.name in [f'native-attempt-{n}' for n in range(1,15)])])
assert len(dirs)==28,len(dirs)
rows=[]
for d in dirs:
 for p in sorted(d.rglob('*')):
  assert not p.is_symlink(),p
  if p.is_file():rows.append(dict(path=str(p.relative_to(root)),bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
archive=root/'superseded-cohorts.tar.gz';assert not archive.exists()
with tarfile.open(archive,'w:gz') as t:
 for d in dirs:t.add(d,arcname=d.name)
expected={r['path']:r for r in rows}
with tarfile.open(archive,'r:gz') as t:
 files=[m for m in t.getmembers() if m.isfile()]
 assert {m.name for m in files}==set(expected)
 for m in files:
  b=t.extractfile(m).read();assert len(b)==expected[m.name]['bytes'] and hashlib.sha256(b).hexdigest()==expected[m.name]['sha256'],m.name
index=dict(schema='crumbs.m11.3.superseded-archive.v1',classification='lossless diagnostic failed/superseded cohorts; never final acceptance',archive=archive.name,sha256=hashlib.sha256(archive.read_bytes()).hexdigest(),cohorts=[d.name for d in dirs],pathTranslation='Receipt absolute paths retain their original execution location; archived members use the listed relocated cohort prefixes. Old host paths originally pointed at host; their archival relocation does not claim another execution.',files=rows)
(root/'superseded-cohorts.json').write_text(json.dumps(index,indent=2)+'\n')
for d in dirs:shutil.rmtree(d)
print(json.dumps(dict(cohorts=len(dirs),files=len(rows),rawBytes=sum(r['bytes'] for r in rows),archiveBytes=archive.stat().st_size,verified=True)))
p=pathlib.Path('.superpowers/sdd/2026-10-09-m11-3-native-motion/progress.md');p.write_text(p.read_text()+'\nTask5: Ruling: Preserve the28 failed/superseded host/native cohorts in one lossless tar.gz with every original file size/SHA and complete extraction verification before removing only those loose cohort directories. Raw receipts keep original execution paths, explicitly translated by the archive index. Current acceptance remains loose and directly inspectable. Cost if wrong: archival evidence is harder to navigate; full member/hash equality and archive SHA guard loss, and no archived prefix counts as acceptance.\n')
