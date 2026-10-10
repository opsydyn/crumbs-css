from pathlib import Path
import hashlib,json,subprocess,datetime,shutil
root=Path.cwd(); rel=Path('docs/evidence/2026-10-10-m11-5-runtime-extensions');e=root/rel;sdd=root/'.superpowers/sdd/2026-10-10-m11-5-runtime-extensions';base='ed6c499137db0d385a14d12e5823a949ac5cf13f'
def sha(b):return hashlib.sha256(b).hexdigest()
def run(args,**kw):return subprocess.run(args,check=True,capture_output=True,**kw)
assert run(['git','rev-parse','HEAD'],text=True).stdout.strip()==base
# Archive only this plan's regular top-level records. Never archive dependency roots or executables.
a=json.loads((e/'execution/record-archive.json').read_text());records={v['source']:v for v in a['files']}
for p in sorted(sdd.iterdir()):
 if p.is_file() and not p.is_symlink():
  archive=rel/'execution'/('helpers' if p.suffix in ['.ts','.py'] else 'logs')/p.name
  data=p.read_bytes();q=root/archive;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(data);assert q.read_bytes()==data
  records[str(p)]={'source':str(p),'archive':str(archive),'sha256':sha(data),'bytes':len(data)}
for record in records.values():assert sha((root/record['archive']).read_bytes())==record['sha256']
a.update(files=list(records.values()),lossless=True,workspaceRetained=True,reason='Original dependency roots/owned links restored; functional closure authorised by direct commit/push/v1 request; single commit verification remains. This plan workspace remains until commit verification.');(e/'execution/record-archive.json').write_text(json.dumps(a,indent=2)+'\n')
(e/'execution/progress.md').write_bytes((sdd/'progress.md').read_bytes())
helper=e/'execution/helpers/prepare-commit.py';helper.write_bytes(Path('/private/tmp/crumbs-m115-prepare-commit.py').read_bytes())
author=[v['path'] for v in json.loads((e/'execution/authoring-manifest.json').read_text())['files']];assert len(author)==77 and len(set(author))==77
for f in author:
 p=root/f;assert p.is_file() and not p.is_symlink();assert all(not v.endswith(b' ') and not v.endswith(b'\t') for v in p.read_bytes().splitlines()),f
run(['git','diff','--check','--',*author])
manifestPath=rel/'execution/final-manifest.json';auditPath=rel/'execution/staged-byte-audit.json';excluded={str(manifestPath),str(auditPath)}
evidence=[str(p.relative_to(root)) for p in e.rglob('*') if p.is_file() and str(p.relative_to(root)) not in excluded]
assert not any(p.is_symlink() for p in e.rglob('*'))
paths=sorted(set(author+evidence)); rows=[]
for f in paths:
 b=(root/f).read_bytes();rows.append({'path':f,'bytes':len(b),'sha256':sha(b)})
manifest={'schema':'crumbs.m11.5.final-authorised-manifest.v1','baseCommit':base,'qualifiedSourceDigest':json.loads((e/'final-integrity.json').read_text())['sourceDigest'],'authoringPaths':author,'files':rows,'selfHashExclusions':sorted(excluded),'reason':'Manifest excludes itself and its derived staged audit to avoid circular hashes; both are explicitly staged and independently byte-compared. Earlier authoring-manifest/proposed diff remains the pre-review record.'}
(root/manifestPath).write_text(json.dumps(manifest,indent=2)+'\n');paths+=sorted(excluded)
# Refuse accidental staging outside the explicit authoring/evidence inventory.
cached=run(['git','diff','--cached','--name-only','-z']).stdout.split(b'\0');assert all(not p or p.decode() in paths for p in cached)
# Write a placeholder so all authorised names can be staged in one precise pathspec.
(root/auditPath).write_text('{}\n');ps=Path('/private/tmp/crumbs-m115-authorised-paths.nul');ps.write_bytes(b'\0'.join(f.encode() for f in paths)+b'\0')
run(['git','add','--force','--pathspec-from-file='+str(ps),'--pathspec-file-nul'])
assert sorted(p.decode() for p in run(['git','diff','--cached','--name-only','-z']).stdout.split(b'\0') if p)==sorted(paths)
index={}
for row in run(['git','ls-files','--stage','-z']).stdout.split(b'\0'):
 if not row:continue
 head,name=row.split(b'\t',1);mode,oid,stage=head.split();index[name.decode()]=(mode.decode(),oid.decode(),stage.decode())
verifyPaths=[f for f in paths if f!=str(auditPath)]
for f in verifyPaths:assert index[f][0]=='100644' and index[f][2]=='0',f
batch=run(['git','cat-file','--batch'],input=('\n'.join(index[f][1] for f in verifyPaths)+'\n').encode()).stdout;offset=0;checked=[]
for f in verifyPaths:
 end=batch.index(b'\n',offset);h=batch[offset:end].split();length=int(h[2]);offset=end+1;data=batch[offset:offset+length];offset+=length+1;working=(root/f).read_bytes();assert data==working,f;checked.append({'path':f,'sha256':sha(data),'bytes':len(data)})
assert offset==len(batch)
audit={'schema':'crumbs.m11.5.staged-byte-audit.v1','checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'baseCommit':base,'manifestSha256':sha((root/manifestPath).read_bytes()),'authoringPathCount':77,'authorisedPathCount':len(paths),'checks':checked,'selfHashExclusion':str(auditPath),'selfVerification':'After writing and staging this audit, its index bytes are independently compared with this file; self-hash is deliberately excluded.','allPassed':True,'commit':'pending single commit; functional closure authorised, no release waiver or commit made by this helper'}
(root/auditPath).write_text(json.dumps(audit,indent=2)+'\n');run(['git','add','--',str(auditPath)]);assert run(['git','show',':'+str(auditPath)]).stdout==(root/auditPath).read_bytes()
run(['git','diff','--cached','--check','--',*author]);assert not run(['git','diff','--name-only','--',*paths],text=True).stdout.strip()
print(json.dumps({'authoringPaths':77,'evidencePaths':len(paths)-77,'stagedPaths':len(paths),'stagedByteChecks':len(checked)+1,'losslessArchivedRecords':len(records),'allPassed':True,'commitPending':True}))
