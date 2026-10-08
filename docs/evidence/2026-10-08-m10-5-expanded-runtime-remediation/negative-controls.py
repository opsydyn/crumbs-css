"""Read-only evidence regression suite; mutations replace owned temporary copies."""
import gzip,hashlib,json,subprocess,sys,tempfile
from pathlib import Path
folder=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
out=[]
for case in ['raw-byte-edit','source-digest','restoration-missing','raw-startup-replay','parity-forgery','accepted-disposition','registry-substitution','artifact-size-redistribution','startup-artifact-substitution']:
 with tempfile.TemporaryDirectory(prefix='crumbs-m105-rejection-negative-') as temporary:
  f=Path(temporary)
  # Hard-link immutable bulky archives; mutations below replace files, never write through shared inodes.
  for p in folder.iterdir():
   if p.is_file():(f/p.name).hardlink_to(p)
  def replace(name,data):
   p=f/name;p.unlink();p.write_bytes(data)
  packet=json.loads((f/'packet.json').read_text())
  if case=='raw-byte-edit':replace('candidate.patch.gz',b'edited patch')
  elif case=='accepted-disposition':packet['disposition']='accepted'
  elif case=='restoration-missing':
   data=json.loads((f/'restoration.json').read_text());data['inventory']['artifacts'].pop();replace('restoration.json',json.dumps(data).encode());packet['files']['restoration.json']=sha((f/'restoration.json').read_bytes())
  else:
   data=json.loads(gzip.decompress((f/'raw.json.gz').read_bytes()))
   if case=='registry-substitution':data['registry']['metrics'][0]['baseline']['reason']+=' forged'
   if case=='artifact-size-redistribution':
    rows=data['runtime']['runtimeGraph']['currentGraphs']['theme']['esm']['artifacts'];rows[0]['bytes']+=1;rows[1]['bytes']-=1
   if case=='startup-artifact-substitution':data['runtime']['runtimeInit']['scenarios'][0]['entrySha256']='0'*64
   if case=='source-digest':data['candidateSource']['sha256']='f'*64
   if case=='raw-startup-replay':
    for sample in data['runtime']['runtimeInit']['scenarios'][2]['samples']:sample['loadMs']=0
   if case=='parity-forgery':data['candidateBuiltParity']['cohorts'][0]['candidate']['rows'][0]['outcome']['trace']=['forged']
   replace('raw.json.gz',gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0));packet['files']['raw.json.gz']=sha((f/'raw.json.gz').read_bytes())
  replace('packet.json',json.dumps(packet).encode())
  r=subprocess.run(['python3',str(f/'verify.py'),str(f)],capture_output=True,text=True)
  assert r.returncode!=0,case
  expected={'raw-byte-edit':'Raw file hash: candidate.patch.gz','source-digest':'Source digest','restoration-missing':'Incomplete restoration','raw-startup-replay':'Comparator rederivation mismatch','parity-forgery':'Differential mismatch','accepted-disposition':'Cannot certify acceptance','registry-substitution':'Registry substitution','artifact-size-redistribution':'Artifact byte binding','startup-artifact-substitution':'Startup artifact binding'}[case]
  assert expected in r.stderr,(case,r.stderr)
  out.append({'case':case,'expected':'reject','exitCode':r.returncode,'outcome':'rejected','lastError':r.stderr.strip().splitlines()[-1]})
print(json.dumps({'scope':'rejection-verifier-only','controls':out},indent=2))
