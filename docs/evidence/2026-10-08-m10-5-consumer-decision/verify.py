import pathlib,json,statistics,gzip,sys
r=pathlib.Path(__file__).parent
receiptPath=r/'receipts.json.gz'
receipts=json.loads(gzip.decompress(receiptPath.read_bytes()) if receiptPath.exists() else (r/'receipts.json').read_text())
assert len(receipts)==18,len(receipts)
study=json.loads((r/'study.json').read_text())
assert all(x['study']==study['id'] for x in receipts)
assert len({(x['variant'],x['round']) for x in receipts})==18
assert all(x['warmup']==(x['round']==-1) for x in receipts)
assert sum(x['warmup'] for x in receipts)==3
variants=['plain','core','compatibility'];metric=lambda a: {'median':statistics.median(a),'min':min(a),'max':max(a),'samples':len(a)}
retained=[x for x in receipts if not x['warmup']];out={'retainedLaunches':len(retained),'excludedWarmups':3,'variants':{},'pairedDeltaVsPlain':{}}
for row in receipts:
 assert row['dev'] is False and row['hermes'] is True and row['platform']=='ios'
 assert row['react']=='19.2.3' and row['reactNative']=={'major':0,'minor':85,'patch':3}
 assert len(row['plan'])==40 and len(row['observations'])==40 and len(row['samples'])==(30 if row['variant']=='plain' else 40)
 assert row['counts']['mounts']==row['counts']['unmounts']>0
 assert row['layout']['width']>0 and row['layout']['height']>0 and row['layout']['entryToLayoutMs']>0
 for index,o in enumerate(row['observations']):assert o['index']==index
 for index,step in enumerate(row['plan']):
  samples=[s for s in row['samples'] if s['index']==index]
  if step['action']=='unmount':assert not samples;continue
  final=samples[-1]
  assert final['identity']=={'mount':'initial','rerender':'same','theme-switch':'changed'}[step['action']]
  assert (final['panel'],final['text'])==(('#172438','#ffffff') if step['action']=='theme-switch' else ('#ffffff','#172438'))
  if step['action']=='theme-switch' and row['variant']!='plain':
   assert len(samples)==2 and samples[0]['identity']=='same' and samples[0]['panel']=='#ffffff'
  else:assert len(samples)==1
def runmetrics(row):
 d={'entryToLayoutMs':row['layout']['entryToLayoutMs'],'moduleImportMs':row['moduleImportMs'],'firstStyleCallMs':row['samples'][0]['resolveMs']}
 for action in ['mount','rerender','theme-switch']:
  d['styleCallTotalPerStepMedian-'+action]=statistics.median(sum(s['resolveMs'] for s in row['samples'] if s['index']==i) for i,step in enumerate(row['plan']) if step['action']==action)
 for action in ['mount','rerender','theme-switch','unmount']:
  d['requestToLayoutEffectMedian-'+action]=statistics.median(s['requestToLayoutEffectMs'] for s in row['observations'] if s['action']==action)
 return d
for v in variants:
 rows=sorted([x for x in retained if x['variant']==v],key=lambda x:x['round']);assert [x['round'] for x in rows]==list(range(5));runs=[runmetrics(x) for x in rows]
 out['variants'][v]={'metrics':{k:metric([x[k] for x in runs]) for k in runs[0]},'rowMounts':[x['counts']['mounts'] for x in rows],'roundMetrics':runs}
for v in variants[1:]:
 plain=out['variants']['plain']['roundMetrics'];runs=out['variants'][v]['roundMetrics'];out['pairedDeltaVsPlain'][v]={k:metric([a[k]-b[k] for a,b in zip(runs,plain)]) for k in runs[0]}
if '--write' in sys.argv:(r/'summary.json').write_text(json.dumps(out,indent=2))
else:assert out==json.loads((r/'summary.json').read_text()),'Summary differs from raw receipts'
print(json.dumps({v:{k:round(x['median'],4) for k,x in data['metrics'].items()} for v,data in out['variants'].items()},indent=2))
