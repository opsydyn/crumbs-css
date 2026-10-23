#!/usr/bin/env python3
"""Verify the retained rejected proof; this is not execution attestation."""
from pathlib import Path
import argparse, gzip, hashlib, json, subprocess, tarfile
p=argparse.ArgumentParser();p.add_argument('--repository',type=Path);a=p.parse_args()
root=Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
read=lambda name:json.loads((root/name).read_text())
inventory=read('inventory.json')
assert set(inventory)=={str(f.relative_to(root)) for f in root.rglob('*') if f.is_file() and f.name!='inventory.json'}
for name,value in inventory.items():assert sha((root/name).read_bytes())==value,name
s=read('summary.json');i=read('isolation.json');artifacts=read('artifact-inventories.json')
assert s['status']=='rejected-at-source-guard-preflight' and s['candidateLayouts']==1
assert s['builds']['sameConfiguration'] and s['builds']['byteIdenticalArtifacts']
assert s['builds']['artifactCount']==len(artifacts['candidate'])==182
with tarfile.open(root/'candidate-dist.tar.gz') as archive:
 members=archive.getmembers()
 assert all(not m.issym() and not m.islnk() and m.name.startswith('dist') and '..' not in Path(m.name).parts for m in members)
 candidate={m.name.removeprefix('dist/'):sha(archive.extractfile(m).read()) for m in members if m.isfile()}
assert candidate==artifacts['candidate']
initial_bun=read('initial-build-bun-artifacts.json')
assert initial_bun['files']==candidate and len(initial_bun['files'])==182
control_tar=root.parent/'2026-10-17-m10-5-fresh-pipeline-remediation/control-v1.2.0.tgz'
assert sha(control_tar.read_bytes())==s['controlTarballSha256']=='4bd7897aa5beb6383b158f4e214436ba5d0d659b6b0fc005142c945a10dda02e'
with tarfile.open(control_tar) as archive:control={m.name.removeprefix('package/'):sha(archive.extractfile(m).read()) for m in archive.getmembers() if m.isfile()}
assert control==read('control-package-files.json') and len(control)==185
assert {name.removeprefix('dist/'):value for name,value in control.items() if name.startswith('dist/')}==artifacts['control']
for label in ['control','candidate']:
 row=i[label];assert row['packedGraphStatus']=='pass' and len(row['graphs'])==59
 ordinary=[g for g in row['graphs'] if g['classification']=='ordinary-runtime']
 assert len(ordinary)==len(row['sourceGuards'])==30
 fails=[g for g in row['sourceGuards'] if g['status']=='fail']
 assert len(fails)==(0 if label=='control' else 2)
 if label=='candidate':
  assert {(g['subpath'],g['format']) for g in fails}=={('./tokens','esm'),('./tokens','cjs')}
  assert all('Non-runtime Crumbs module in runtime bundle:' in g['error'] and '/crumbs-authoring~' in g['error'] for g in fails)
 for format in ['esm','cjs']:
  token=next(g for g in ordinary if g['subpath']=='./tokens' and g['format']==format)
  assert len(token['files'])==6 and token['externalSpecifiers']==[]
 for format in ['mjs','cjs']:
  graph=row['style'][format]
  assert len(graph['files'])==(8 if format=='mjs' else 9)
  for f in graph['artifacts']:
   name=f['file'].rsplit('/dist/',1)[1]
   assert artifacts[label][name]==f['sha256']
  assert graph['bytes']==sum(f['bytes'] for f in graph['artifacts'])
for format in ['mjs','cjs']:
 expected=s['styleGraph'][format];c=i['control']['style'][format];d=i['candidate']['style'][format]
 assert expected==dict(controlFiles=len(c['files']),candidateFiles=len(d['files']),controlBytes=c['bytes'],candidateBytes=d['bytes'],byteChange=d['bytes']-c['bytes'])
expected_sources={'src/diagnostics.ts','src/theme-token.ts','src/tokens/identity.ts','src/theme-contract.ts','src/tokens/domain-values.ts'}
for membership_format,graph_format in [('es','esm'),('cjs','cjs')]:
 membership=json.loads(gzip.decompress((root/f'membership-{membership_format}.json.gz').read_bytes()))
 token=next(g for g in i['candidate']['graphs'] if g['subpath']=='./tokens' and g['format']==graph_format)
 grouped=[m for m in membership if 'dist/'+m['file'] in token['files'] and m['file'].startswith('crumbs-authoring~')]
 assert len(grouped)==4 and all(m['facadeModuleId'] is None for m in grouped)
 assert {module['id'].split('/packages/css/',1)[1] for m in grouped for module in m['modules']}==expected_sources
 facade=[m for m in membership if m['facadeModuleId'] and m['facadeModuleId'].endswith('/src/tokens/index.ts')]
 assert len(facade)==1 and facade[0]['file']=='tokens.'+('mjs' if graph_format=='esm' else 'cjs')
negatives=read('negative-controls.json')
assert {(n['kind'],n['format']) for n in negatives}=={('direct','esm'),('direct','cjs'),('transitive','esm'),('transitive','cjs')}
assert all(n['status']=='rejected-as-required' and 'ordinary-runtime export imports unauthorized external @vanilla-extract/css' in n['error'] for n in negatives)
sources=read('source-inventories.json')
assert all(row['control']==row['candidate'] for row in sources.values())
assert sum(len(row['candidate']) for row in sources.values())==s['sourcePreservation']['matchedFiles']==369
assert s['fullTransformTiming']==s['sdkNativeFullHost']=='not-run'
for stage in ['identity','node22Loads','declarationBrands','behavioralParity']:assert s[stage].startswith('not-run')
if a.repository:
 repo=a.repository.resolve()
 before=read('shipping-artifacts-before.json')
 actual={str(f.relative_to(repo)):sha(f.read_bytes()) for f in (repo/'packages/css/dist').iterdir() if f.is_file()}
 assert actual==before and len(actual)==181
 for directory,row in sources.items():
  for name,digest in row['candidate'].items():assert sha((repo/'packages/css'/directory/name).read_bytes())==digest
 subprocess.run(['git','diff','--exit-code',s['base'],'--','packages/css','scripts','apps','.github','package.json','bun.lock'],cwd=repo,check=True)
print(json.dumps({'status':'verified-stopped-proof','controlGraphs':59,'candidateGraphs':59,'candidateSourceGuardFailures':2,'negativeControls':4,'candidateArtifacts':182,'recordedShippingArtifacts':181,'repositoryShippingArtifactsVerified':181 if a.repository else None,'fullTransformTiming':'not-run'}))
