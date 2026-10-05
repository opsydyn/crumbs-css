"""Replay the private guard-receipt A/B without implying production cache admission."""
import pathlib, json, gzip, hashlib, statistics, math, sys, re
P=pathlib.Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
def check(value,message):
    if not value:raise AssertionError(message)
def read(path):
    p=P/path;return json.loads(gzip.decompress(p.read_bytes()) if p.suffix=='.gz' else p.read_bytes())
manifest=read('archive-manifest.json')
actual={str(x.relative_to(P)):sha(x.read_bytes()) for x in P.rglob('*') if x.is_file() and x.name!='archive-manifest.json'}
check(actual==manifest['files'],'archive membership/hash')
controls=read('controls.json'); kinds=['repair','entry','buffer','unknown','unstable','artifact','package']
check([(d['kind'],d['variant']) for d in controls]==[(kind,variant) for kind in kinds for variant in ['baseline','buffer','path']],'control membership')
controlBytes={}
for file in (P/'control-receipts').glob('*.json.gz'):
    kind,digest=file.name.removesuffix('.json.gz').split('-',1);b=gzip.decompress(file.read_bytes());check(sha(b)==digest,'control dictionary hash');controlBytes[(kind,digest)]=b.decode() if kind=='source' else json.loads(b)
for d in controls:
    check(d['node']=='v24.15.0','control Node identity')
    c=d['closed'];check(c['state']=='closed' and all(c[k]==0 for k in ['pending','live','creating','disposing','quarantined','cleanupFailures']),'control cleanup')
    check(all(x['originalSha256']==x['restoredSha256'] for x in d['restored']),'restored control bytes')
    check(d['deduplicate']==(d['variant']!='baseline') and d['pathDigests']==(d['variant']=='path'),'control flags')
    mate=next(x for x in controls if x['kind']==d['kind'] and x['variant']=='baseline')
    for row in [d['before'],d['after'],d['reference']]:
        for kind in ['source','inputs','metadata','result']:check((kind,row[kind+'Hash']) in controlBytes,'complete control bytes')
    for key in ['sourceHash','inputsHash','metadataHash','resultHash']:
        check(d['after'][key]==mate['after'][key],'control toggle parity')
        if d['kind']!='package':check(d['after'][key]==d['reference'][key],'control fresh parity')
    if d['kind']=='repair':
        check(d['error']==mate['error'] and bool(d['failedPhases']),'syntax error/span parity')
        check(all(d['before'][key]==d['after'][key] for key in ['sourceHash','inputsHash','metadataHash','resultHash']),'repaired parity')
    if d['kind'] in ['entry','unstable']:
        code='\n'.join(x['data'].get('code','') for x in controlBytes[('result',d['after']['resultHash'])]['output'])
        check(all(re.search(r'\b'+field+r'"?\s*:\s*50000\b',code) for field in ['paddingTop','paddingBottom','paddingLeft','paddingRight']),'changed native padding')
    reasons={'buffer':'entry-buffer-mismatch','unknown':'unknown-build-option','unstable':'source-unstable','artifact':'loaded-artifact-changed','package':'package-info-changed'}
    if d['kind'] in reasons:check(d['after']['snapshot']['lastBypassReason']==reasons[d['kind']],'control reason')
    if d['kind'] in ['artifact','package']:check(d['after']['snapshot']['state']=='disabled','restart retention disabled')
    if d['kind']=='unstable':check(d['after']['snapshot']['hits']==1,'actual retained instability')
r=read('report.json');expected=[]
for workload in ['seven-entry','hot-scan','32-entry']:
    for block in range(5):
        variants=[(mode,variant) for mode in ['fresh','immediate','repeat'] for variant in ['baseline','buffer','path']]
        if block%2:variants.reverse()
        for mode,variant in variants:expected.append(dict(id=f"{workload}-{block}-{mode}-{variant}",workload=workload,block=block,mode=mode,profile=True,deduplicate=variant!='baseline',pathDigests=variant=='path',variant=variant,capacity=8))
check(r['matrix']==expected and len(r['raw'])==135 and {x.name for x in (P/'raw').glob('*.gz')}=={x['id']+'.json.gz' for x in expected},'fixed135 matrix')
receipts={}
for p in (P/'receipts').glob('*.json.gz'):
    kind,digest=p.name.removesuffix('.json.gz').split('-',1);b=gzip.decompress(p.read_bytes());check(sha(b)==digest,'dictionary hash');receipts[(kind,digest)]=b.decode() if kind=='source' else json.loads(b)
raw={}
for x in r['raw']:
    b=(P/x['path']).read_bytes();check(sha(b)==x['sha256'],'raw hash '+x['id']);raw[x['id']]=read(x['path'])
phases={'session','read-bytes','sha256','configuration','eligibility','input-validation','context-key','source-inventory','receipt-clone','compile-fresh','context-create','rebuild','native'}
rows=[];last=0;calls=0;paired_path_baseline=0;paired_path_buffer=0;paired_buffer_baseline=0;paired_mode=0
for plan in expected:
    v=raw[plan['id']];d=v['result'];check(v['row']==plan,'row attribution');check(v['run']['exitCode']==0 and not v['survivors'],'process exit');check(d['node']==r['environment']['node'],'Node identity');check(d['guardEnvironment']==dict(profile='1',receipts='1' if plan['deduplicate'] else '0',pathDigests='1' if plan['pathDigests'] else '0',variant=plan['variant']),'actual guard environment');check(v['run']['startedAt']>=last,'overlapping collection');last=v['run']['finishedAt']
    c=d['closed'];check(c['state']=='closed' and all(c[k]==0 for k in ['live','creating','disposing','quarantined','cleanupFailures']),'owned cleanup');check(c['disposals']==d['beforeClose']['disposals']+d['beforeClose']['live'],'disposal accounting')
    requests=[i%7 for i in range(63)] if plan['workload']=='seven-entry' else [i%32 for i in range(64)] if plan['workload']=='32-entry' else [i%4 for i in range(32)]+list(range(32))+[i%4 for i in range(32)]
    check(d['requests']==requests and [x['index'] for x in d['rows']]==requests,'workload');calls+=len(requests)
    baseline=raw[f"{plan['workload']}-{plan['block']}-fresh-{plan['variant']}"]['result']
    arms=[raw[f"{plan['workload']}-{plan['block']}-{plan['mode']}-{variant}"]['result'] for variant in ['baseline','buffer','path']]
    warm=[];cold=[];seen=set()
    for index,x in enumerate(d['rows']):
        for kind in ['source','inputs','metadata','result']:
            key=kind+'Hash';check((kind,x[key]) in receipts,'full receipt');check(x[key]==baseline['rows'][index][key] and all(x[key]==arm['rows'][index][key] for arm in arms),'exact mode/variant parity')
        if plan['variant']=='path':paired_path_baseline+=1;paired_path_buffer+=1
        if plan['variant']=='buffer':paired_buffer_baseline+=1
        if plan['mode']!='fresh':paired_mode+=1
        code='\n'.join(y['data'].get('code','') for y in receipts[('result',x['resultHash'])]['output'])
        check(all(re.search(r'\b'+field+r'"?\s*:\s*'+str(40000+x['index'])+r'\b',code) for field in ['paddingTop','paddingBottom','paddingLeft','paddingRight']),'native values')
        check(x['snapshot']['live']<=8 and x['snapshot']['probation']<=16,'bounds')
        table=x['phases'];check(isinstance(table,list),'profile field')
        if plan['profile']:
            check(len({z['phase'] for z in table})==len(table) and any(z['phase']=='session' and z['calls']==1 for z in table),'span membership')
            check(all(z['phase'] in phases and isinstance(z['calls'],int) and z['calls']>0 and math.isfinite(z['inclusiveMs']) and math.isfinite(z['exclusiveMs']) and 0<=z['exclusiveMs']<=z['inclusiveMs'] for z in table),'valid span metrics')
            check(sum(z['exclusiveMs'] for z in table)<=x['elapsedMs']+1e-6,'no double counting')
            if plan['mode']!='fresh':
                for phase,n in [('configuration',3),('eligibility',2),('source-inventory',2)]:check(next(z['calls'] for z in table if z['phase']==phase)==n,'guard invocation count')
                io=next(z for z in table if z['phase']=='read-bytes');check(sum(z['calls'] for z in io['readGroups'].values())==io['calls'] and sum(z['bytesRead'] for z in io['readGroups'].values())==io['bytesRead'],'byte accounting')
        else:check(not table,'disabled clocks/collector')
        (warm if x['index'] in seen else cold).append(x);seen.add(x['index'])
    metrics={phase:statistics.median(next((z['exclusiveMs'] for z in x['phases'] if z['phase']==phase),0) for x in warm) for phase in sorted(phases)}
    readgroups={name:statistics.median(next((z.get('readGroups',{}).get(name,{}).get('bytesRead',0) for z in x['phases'] if z['phase']=='read-bytes'),0) for x in warm) for name in ['configuration','eligibility','source-inventory']}
    guards=['read-bytes','sha256','configuration','eligibility','input-validation','context-key','source-inventory']
    guardTimes=[sum(z['exclusiveMs'] for z in x['phases'] if z['phase'] in guards) for x in warm]
    residual=[x['elapsedMs']-sum(z['exclusiveMs'] for z in x['phases']) for x in warm]
    rows.append(dict(**plan,warmMedianMs=statistics.median(x['elapsedMs'] for x in warm),coldMedianMs=statistics.median(x['elapsedMs'] for x in cold),guardMedianMs=statistics.median(guardTimes),residualMedianMs=statistics.median(residual),phaseMediansMs=metrics,readBytesMedian=statistics.median(next((z.get('bytesRead',0) for z in x['phases'] if z['phase']=='read-bytes'),0) for x in warm),readCallsMedian=statistics.median(next((z['calls'] for z in x['phases'] if z['phase']=='read-bytes'),0) for x in warm),readGroupBytesMedian=readgroups,hits=c['hits'],serviceRssMiB=d['memory']['serviceRssBytes']/1048576))
check(calls==10035 and paired_path_baseline==3345 and paired_path_buffer==3345 and paired_buffer_baseline==3345 and paired_mode==6690,'transform and comparison totals')
groups=[]
for workload in ['seven-entry','hot-scan','32-entry']:
    for mode in ['fresh','immediate','repeat']:
        arms={variant:[x for x in rows if (x['workload'],x['mode'],x['variant'])==(workload,mode,variant)] for variant in ['baseline','buffer','path']}
        def ratios(a,b):return [x['warmMedianMs']/next(y['warmMedianMs'] for y in arms[b] if y['block']==x['block']) for x in arms[a]]
        group=dict(workload=workload,mode=mode)
        for a,b,key in [('path','baseline','pathBaseline'),('path','buffer','pathBuffer'),('buffer','baseline','bufferBaseline')]:
            values=ratios(a,b);group[key+'Ratios']=values;group[key+'RatioMedian']=statistics.median(values)
        group['variants']={variant:dict(warmMs=statistics.median(x['warmMedianMs'] for x in values),guardMs=statistics.median(x['guardMedianMs'] for x in values),readCalls=statistics.median(x['readCallsMedian'] for x in values),readBytes=statistics.median(x['readBytesMedian'] for x in values),phaseMediansMs={phase:statistics.median(x['phaseMediansMs'][phase] for x in values) for phase in phases},serviceRssMiB=statistics.median(x['serviceRssMiB'] for x in values)) for variant,values in arms.items()}
        groups.append(group)
check(r['shippingBefore']==r['shippingAfter'],'shipping inventories')
if '--live' in sys.argv:
    for x in r['shippingAfter']+r['fixture']['artifact']['artifactFiles']:check(sha(pathlib.Path(x['path']).read_bytes())==x['sha256'],'live shipping/candidate')
check(sha((P/'code/qualification-probe.cjs').read_bytes())==r['environment']['probeSha256'],'measured probe source')
summary=dict(processes=135,transforms=calls,pathBaselineComparisons=paired_path_baseline,pathBufferComparisons=paired_path_buffer,bufferBaselineComparisons=paired_buffer_baseline,retainedFreshComparisons=paired_mode,groups=groups,perProcess=rows,scope='Capacity8 private path-digest A/B with original/buffer controls; profiling enabled in all variants within one artifact. No production admission, host-budget or device claim.')
check(read('summary.json')==summary,'saved summary reproduction')
print('Verified 135 isolated processes, 10,035 transforms, 3,345 pairs per variant comparison and 6,690 retained/fresh pairs; 21 supplementary controls; conserved spans and bytes.')
