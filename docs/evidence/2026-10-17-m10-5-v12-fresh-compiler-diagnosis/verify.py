import gzip, hashlib, json, math
from pathlib import Path
root=Path(__file__).resolve().parent
read=lambda name: json.loads(gzip.decompress((root/'raw'/name).read_bytes()))
median=lambda xs: sorted(xs)[math.ceil(len(xs)/2)-1]
expected=json.loads((root/'file-inventory.json').read_text())
actual={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in root.rglob('*') if p.is_file() and p.name!='file-inventory.json' and '__pycache__' not in p.parts}
assert actual==expected, 'Packet inventory differs'
summary={}; outputs={}; inputs={}; count=0
for variant,version in [('control','0.27.7'),('esbuild0282','0.28.2')]:
 runs=[read(f'{variant}-{n}.json.gz') for n in range(1,6)]
 for run in runs:
  assert run['variant']==variant and run['esbuildVersion']==version
  assert len(run['rows'])==2
  for row in run['rows']:
   assert len(row['setup'])==2 and len(row['samples'])==6
   for sample in row['samples']:
    assert len(sample['compileCalls'])==1 and sample['ms']>0
    call=sample['compileCalls'][0];assert 0<call['ms']<=sample['ms']
    outputs.setdefault(row['label'],set()).add(sample['sha256'])
    inputs.setdefault(row['label'],set()).add(json.dumps(call['inputs'],sort_keys=True))
    count+=1
 summary[variant]={'worstFixtureMedianMs':median([max(median([s['ms'] for s in row['samples']]) for row in run['rows']) for run in runs]),'fixtures':{}}
 for i in range(2):
  summary[variant]['fixtures'][runs[0]['rows'][i]['label']]={'fullMs':median([median([s['ms'] for s in run['rows'][i]['samples']]) for run in runs]),'compileMs':median([median([s['compileCalls'][0]['ms'] for s in run['rows'][i]['samples']]) for run in runs])}
assert summary==json.loads((root/'esbuild-summary.json').read_text()), 'Summary drift'
assert all(len(v)==1 for v in outputs.values()) and all(len(v)==1 for v in inputs.values()), 'Output/input mismatch'
smoke=read('selection-smoke.json.gz');assert smoke['esbuildVersion']=='0.28.2' and smoke['selectedBuildCalls']==18
preserved=json.loads((root/'preservation.json').read_text());assert preserved['sourceAndArtifactsUnchanged'] is True and preserved['sourceDigest']=='daf68a184c239e288c8ef743dfbf5e5213be0629562fd49a5d4c2e5261b31d5d' and preserved['artifactCount']==181
assert count==120
assert all(row['worstFixtureMedianMs']>6.514 for row in summary.values())
print('Verified all 120 timed outputs, complete input inventories, five-pair summary, selected backend smoke and preserved source/artifacts; diagnostic only, no admitted fix')
