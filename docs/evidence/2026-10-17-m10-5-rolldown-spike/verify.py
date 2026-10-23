import gzip, hashlib, json, math
from pathlib import Path
root=Path(__file__).resolve().parent
read=lambda name:json.loads(gzip.decompress((root/'raw'/(name+'.gz')).read_bytes()))
sha=lambda data:hashlib.sha256(data.encode() if isinstance(data,str) else data).hexdigest()
median=lambda xs:sorted(xs)[math.ceil(len(xs)/2)-1]
body=lambda code:'\n'.join(code.splitlines()[1:])
actual={str(p.relative_to(root)):sha(p.read_bytes()) for p in root.rglob('*') if p.is_file() and p.name!='file-inventory.json' and '__pycache__' not in p.parts}
assert actual==json.loads((root/'file-inventory.json').read_text()), 'Inventory drift'
c=read('control-pilot.json');v=read('rolldown-pilot.json');summary=json.loads((root/'summary.json').read_text());count=0
assert summary['disposition']=='reject-prototype' and summary['officialHostQualification'] is False and summary['timingProcessesPerVariant']==1
assert summary['warmTargetMs']==6.514
for i,(a,z) in enumerate(zip(c['rows'],v['rows'])):
 assert len(a['setup'])==len(z['setup'])==2 and len(a['samples'])==len(z['samples'])==6
 s=summary['rows'][i];assert s['fixture']==a['label']==z['label']
 for label,row in [('control',a),('rolldown',z)]:
  assert s[label+'FullMs']==median([x['ms'] for x in row['samples']])
  assert s[label+'CompileMs']==median([x['compileCalls'][0]['ms'] for x in row['samples']])
  assert s[label+'UnchangedOutputHashCount']==len({x['sha256'] for x in row['samples']})
  for x in row['samples']:
   assert sha(x['code'])==x['sha256'] and len(x['compileCalls'])==1
   assert 0<x['compileCalls'][0]['ms']<=x['ms'];count+=1
 assert s['rolldownFullMs']>6.514 and s['fullOutputParity'] is False and s['bodyParityExcludingCacheMarker'] is True and s['fileInputParity'] is True
 expected=sorted((x['file'],x['bytes'],x['sha256']) for x in a['samples'][0]['compileCalls'][0]['inputs'])
 assert len(expected)==10
 for x in z['samples']:
  assert body(x['code'])==body(a['samples'][0]['code']) and x['sha256']!=a['samples'][0]['sha256']
  assert sorted((y['file'],y['bytes'],y['sha256']) for y in x['compileCalls'][0]['inputs'])==expected
 assert s['controlUnchangedOutputHashCount']==1 and s['rolldownUnchangedOutputHashCount']==6
assert count==24
control=read('edits-control.json');candidate=read('edits-rolldown-complete.json');assert 'failure' not in control
assert candidate['failure'].splitlines()[0]=='Error: Entry restoration differs; Dependency restoration differs'
assert summary['editFindings']==candidate['failure'].splitlines()[0]
labels=['baseline','entry-edit','entry-restore','dependency-edit','dependency-restore'];values=[48,49,48,50,48]
assert [x['label'] for x in control['rows']]==[x['label'] for x in candidate['rows']]==labels
for a,z,value in zip(control['rows'],candidate['rows'],values):
 assert f'"minHeight":{value}' in a['code'] and f'"minHeight":{value}' in z['code']
 assert sha(a['code'])==a['sha256'] and sha(z['code'])==z['sha256']
 assert a['entrySha256']==z['entrySha256'] and a['dependencySha256']==z['dependencySha256']
 assert body(a['code'])==body(z['code'])
for n in [2,4]:
 assert control['rows'][n]['code']==control['rows'][0]['code']
 assert candidate['rows'][n]['code']!=candidate['rows'][0]['code']
 def norm(row):
  return sorted([dict(file=x['file'],bytes=x['bytes'],sha256=x['sha256'],imports=sorted(x['imports'],key=lambda y:json.dumps(y,sort_keys=True))) for x in row['compileCalls'][-1]['inputs']],key=lambda x:x['file'])
 assert norm(candidate['rows'][n])==norm(candidate['rows'][0])
total=0
for name in ['rolldown-pilot.json','edits-rolldown.json','edits-rolldown-complete.json']:
 stats=read(name)['stats'];assert stats==summary['resourceCounts'][name]
 assert stats['calls']==stats['created']==stats['closed'];total+=stats['created']
assert total==28
preserved=json.loads((root/'preservation.json').read_text());assert preserved['sourceAndArtifactsUnchanged'] and preserved['artifactCount']==181 and preserved['sourceDigest']=='daf68a184c239e288c8ef743dfbf5e5213be0629562fd49a5d4c2e5261b31d5d'
print('Verified rejected spike: all24 timed outputs, file-input/body comparisons, unstable cache markers, both edit/restoration failures, all28 bundle closures and unchanged release source/artifacts')
