"""Verify a rejected candidate and complete restoration, never certify release admission."""
import gzip,hashlib,json,subprocess,sys,tarfile,tempfile
from pathlib import Path
folder=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
read=lambda p:json.loads(p.read_text())
p=read(folder/'packet.json');assert p['format']=='crumbs.m10.5.expanded-runtime-rejection' and p['version']==1
assert p['disposition']=='rejected' and p['hostGate']=='not-run' and p['baselineAdmission']=='not-run', 'Cannot certify acceptance'
for name,digest in p['files'].items():
 assert Path(name).name==name and sha((folder/name).read_bytes())==digest, 'Raw file hash: '+name
assert sha(gzip.decompress((folder/'candidate.patch.gz').read_bytes()))==p['candidatePatchSha256'],'Original patch binding'
raw=json.loads(gzip.decompress((folder/'raw.json.gz').read_bytes()));restore=read(folder/'restoration.json')
for key,identity in [('controlSource',raw['controlSource']),('candidateSource',raw['candidateSource'])]:
 assert sha(json.dumps(identity['files'],ensure_ascii=False,separators=(',',':')).encode())==identity['sha256'],'Source digest'
 assert len({f['path'] for f in identity['files']})==len(identity['files'])
assert raw['controlSource']['sha256']==p['restoredSourceSha256']==restore['source']['sha256']=='8fe7d6c28c26c9d4214549790d504c62f87c24f6886d7da40e031dd7e9fb4a76'
assert raw['candidateSource']['sha256']==p['candidateSourceSha256']
assert len(raw['controlSource']['files'])==694 and len(raw['candidateSource']['files'])==699
assert restore['failures']==[] and restore['inventory']['sources']==raw['control']['inventory']['sources'] and restore['inventory']['artifacts']==raw['control']['inventory']['artifacts'],'Incomplete restoration'
assert all(r['exitCode']==0 for r in raw['types'])
def contents(name):
 with tarfile.open(folder/name,'r:gz')as tar:
  rows=tar.getmembers();assert len({r.name for r in rows})==len(rows)
  result={}
  for r in rows:
   assert r.isfile() and not Path(r.name).is_absolute() and '..' not in Path(r.name).parts
   result[r.name]=tar.extractfile(r).read()
  return result
archives={}
for label in ['control','candidate']:
 files=contents(label+'-tree.tar.gz');identity=raw[label+'Source'];inventory=raw['control']['inventory'] if label=='control' else raw['candidate']
 archives[label]=files
 expected={f['path']:f['sha256'] for f in identity['files']};expected.update({'packages/css/'+f['path']:f['sha256'] for f in inventory['artifacts']})
 assert set(files)==set(expected),'Archive inventory'
 for path,digest in expected.items():assert sha(files[path])==digest,'Archive hash: '+path
assert raw['registry']==json.loads(archives['control']['packages/css/bench/budgets.json']),'Registry substitution'
for name in ['controlBuiltParity','shippingBuiltParity','minifiedBuiltParity','candidateBuiltParity']:
 report=raw[name];assert report['failures']==[] and len(report['cohorts'])==4
 assert {(c['control']['node'],c['format'])for c in report['cohorts']}=={('v22.0.0','esm'),('v22.0.0','cjs'),('v24.15.0','esm'),('v24.15.0','cjs')}
 for c in report['cohorts']:
  a,b=c['control'],c['candidate'];assert a['node']==b['node'] and a['format']==b['format'] and a['rows']==b['rows'],'Differential mismatch'
  assert len(a['rows'])==921 and len({r['label'] for r in a['rows']})==921
  assert all('snapshotFailure' not in str(row['outcome']['graph'])for row in a['rows'])
  assert all(row['outcome']['kind']=='value'for row in a['rows']if row['label'].startswith('returned:'))
assert raw['sourceParity']['mismatches']==[] and raw['sourceParity']['control']==raw['sourceParity']['candidate'] and len(raw['sourceParity']['control'])==1260
caps={'theme-core':{'esm':39000,'cjs':39000},'theme':{'esm':96000,'cjs':99000}}
assert raw['runtime']['eligible']is False and raw['runtime']['parity']['passed']is True
for entry,formats in raw['runtime']['runtimeGraph']['currentGraphs'].items():
 for fmt,g in formats.items():
  assert len(g['samples'])==5 and all(s==g['graphBytes']for s in g['samples'])
  assert sum(a['bytes']for a in g['artifacts'])==g['graphBytes'] and len({a['file']for a in g['artifacts']})==len(g['artifacts'])
  assert g['nonliteralLoads']==0 and all(e=='react'for e in g['externals'])
  for a in g['artifacts']:
   match=next(f for f in raw['candidate']['artifacts'] if f['path']=='dist/'+a['file']);assert match['sha256']==a['sha256']
   assert len(archives['candidate']['packages/css/dist/'+a['file']])==a['bytes'],'Artifact byte binding'
  if entry in caps:assert g['graphBytes']>caps[entry][fmt], 'Expected four admission-cap failures'
init=raw['runtime']['runtimeInit'];assert len(init['scenarios'])==4 and init['environment']['repetitions']==15
assert {(c['runtime'],c['format'])for c in init['scenarios']}=={('floor','esm'),('floor','cjs'),('current','esm'),('current','cjs')},'Startup cells'
for cell in init['scenarios']:
 assert cell['warmup']['excluded']is True and len(cell['samples'])==15
 expected_node='v22.0.0' if cell['runtime']=='floor' else 'v24.15.0'
 assert cell['node']==expected_node and cell['warmup']['node']==expected_node and all(s['node']==expected_node for s in cell['samples']),'Startup Node identity'
 entry='packages/css/dist/theme.'+('mjs' if cell['format']=='esm' else 'cjs')
 assert cell['entrySha256']==sha(archives['candidate'][entry]),'Startup artifact binding'
first=raw['firstUse'];assert first['qualification']=='diagnostic-only' and len(first['cells'])==4
for cell in first['cells']:
 for cohort in ['control','candidate']:assert len(cell[cohort]['samples'])==5 and cell[cohort]['warmup']['excluded']is True
with tempfile.TemporaryDirectory(prefix='crumbs-m105-rederive-')as temporary:
 root=Path(temporary);baselines=contents('baseline-evidence.tar.gz')
 assert set(baselines)=={r['path']for r in raw['baselineFiles']}
 for row in raw['baselineFiles']:
  assert sha(baselines[row['path']])==row['sha256'];target=root/row['path'];target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(baselines[row['path']])
 raw_path=root/'raw.json';raw_path.write_text(json.dumps({'registry':raw['registry'],'runtime':{'runtimeGraph':raw['runtime']['runtimeGraph'],'runtimeInit':raw['runtime']['runtimeInit']}},separators=(',',':')))
 result=subprocess.run(['node',str(folder/'derive.mjs'),str(raw_path),str(root)],capture_output=True,text=True)
 assert result.returncode==0,result.stderr
 derived=json.loads(result.stdout);assert derived['startup']==raw['runtime']['startupRows'] and derived['graphs']==raw['runtime']['oldGraphs'], 'Comparator rederivation mismatch'
 assert sum(r['result']=='fail'for r in derived['startup'])==3 and sum(r['result']=='pass'for r in derived['startup'])==1
 assert all(r['environment']=='exact' and r['measurementIdentity']=='exact'for r in derived['startup'])
# Verify historical authority against frozen documents, not the later roadmap.
with tempfile.TemporaryDirectory(prefix='crumbs-m105-prior-approval-')as temporary:
 root=Path(temporary);prior=contents('prior-approval-packets.tar.gz');documents=contents('approval-documents.tar.gz')
 approval_prefix='docs/evidence/2026-10-08-m10-5-expanded-runtime-plan/'
 packet=json.loads(prior[approval_prefix+'packet.json'])
 assert set(documents)==set(packet['documents'])
 for name,digest in packet['documents'].items():assert sha(documents[name])==digest,'Historical document: '+name
 control=contents('control-tree.tar.gz')
 for name in ['packages/css/bench/budgets.json','scripts/release-host-budget-policy.ts','scripts/release-host-environment.ts']:documents[name]=control[name]
 for name,data in (prior|documents).items():
  assert not Path(name).is_absolute() and '..' not in Path(name).parts
  target=root/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
 subprocess.run([sys.executable,str(root/approval_prefix/'verify.py'),str(root/approval_prefix),str(root)],check=True,capture_output=True,text=True)
print('Verified rejection: four byte caps and three startup failures; original comparator rederived, built parity preserved, 694 shipping files and 149 artifacts restored. No release qualification.')
