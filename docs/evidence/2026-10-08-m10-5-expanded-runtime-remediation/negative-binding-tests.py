import gzip,hashlib,json,subprocess,tempfile,sys
from pathlib import Path
f=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parent;sha=lambda b:hashlib.sha256(b).hexdigest()
raw=json.loads(gzip.decompress((f/'raw.json.gz').read_bytes()));out=[]
for case in ['registry-substitution','artifact-size-redistribution']:
 with tempfile.TemporaryDirectory() as d:
  p=Path(d)
  for a in f.iterdir():
   if a.is_file():(p/a.name).hardlink_to(a)
  if case=='registry-substitution':raw['registry']['metrics'][0]['baseline']['reason']+=' forged'
  else:
   rows=raw['runtime']['runtimeGraph']['currentGraphs']['theme']['esm']['artifacts'];rows[0]['bytes']+=1;rows[1]['bytes']-=1
  target=p/'raw.json.gz';target.unlink();target.write_bytes(gzip.compress(json.dumps(raw,separators=(',',':')).encode(),mtime=0))
  packet=json.loads((p/'packet.json').read_text());packet['files']['raw.json.gz']=sha(target.read_bytes());target=p/'packet.json';target.unlink();target.write_text(json.dumps(packet))
  r=subprocess.run(['python3',str(p/'verify.py'),str(p)],capture_output=True,text=True);out.append({'case':case,'exitCode':r.returncode,'lastError':r.stderr.strip().splitlines()[-1] if r.stderr.strip() else 'accepted'})
  if case=='registry-substitution':raw['registry']['metrics'][0]['baseline']['reason']=raw['registry']['metrics'][0]['baseline']['reason'].removesuffix(' forged')
  else:rows[0]['bytes']-=1;rows[1]['bytes']+=1
assert all(r['exitCode']!=0 for r in out),out
assert 'Registry substitution' in out[0]['lastError'] and 'Artifact byte binding' in out[1]['lastError'],out
print(json.dumps(out))
