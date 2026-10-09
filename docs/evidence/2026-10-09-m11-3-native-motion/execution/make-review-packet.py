import subprocess,json,hashlib,pathlib,difflib
root=pathlib.Path.cwd(); scratch=root/'.superpowers/sdd/2026-10-09-m11-3-native-motion'
auth=json.loads((scratch/'authorised-roots.json').read_text())
tracked=subprocess.check_output(['git','diff','--name-only','-z','c287ff133967a332cc31a31478e3534eb40e7e3b'],text=True).split('\0')
tracked=[p for p in tracked if p]
allowed=set(auth['tracked'])
for rel in auth['new']:
 p=root/rel
 if p.is_dir():allowed.update(str(f.relative_to(root)) for f in p.rglob('*') if f.is_file())
 elif p.is_file():allowed.add(rel)
assert set(tracked)<=allowed,set(tracked)-allowed
files=set(tracked)
for rel in auth['new']:
 p=root/rel
 if p.is_dir(): files.update(str(f.relative_to(root)) for f in p.rglob('*') if f.is_file())
 elif p.is_file():files.add(rel)
 else:raise RuntimeError('Missing authorised root: '+rel)
rows=[]
for path in sorted(files):
 data=(root/path).read_bytes(); rows.append({'path':path,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
packet={'schema':'crumbs.m11.3.proposed-tree.v1','base':'c287ff133967a332cc31a31478e3534eb40e7e3b','head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'scope':'pending single implementation commit; full authorised file inventory; binary/raw evidence inspected by path','files':rows}
(scratch/'proposed-files.json').write_text(json.dumps(packet,indent=2)+'\n')
diff=subprocess.check_output(['git','diff','-U10','c287ff133967a332cc31a31478e3534eb40e7e3b','--',*tracked],text=True)
for path in sorted(files-set(tracked)):
 if path.startswith('docs/evidence/'):continue
 data=(root/path).read_text();diff+='\n'+''.join(difflib.unified_diff([],data.splitlines(True),fromfile='/dev/null',tofile='b/'+path,n=10))
(scratch/'review-pending-authored.diff').write_text(diff)
print(json.dumps({'files':len(rows),'bytes':sum(r['bytes'] for r in rows),'authoredDiffBytes':len(diff.encode())}))
