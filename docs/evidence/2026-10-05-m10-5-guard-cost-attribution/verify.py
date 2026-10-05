"""Replay the diagnostic matrix without interpreting profiling as an optimisation."""
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
repair=read('error-repair.json')
check(repair['off']['error']==repair['on']['error'],'error parity')
for toggle,d in repair.items():
    check(d['profile']==(toggle=='on'),'repair profile toggle')
    check(d['originalSha256']==d['restoredSha256'],'restored fixture')
    check(d['closed']['state']=='closed' and all(d['closed'][k]==0 for k in ['pending','live','creating','disposing','quarantined','cleanupFailures']),'repair cleanup')
    check(d['closed']['hits']==1 and d['closed']['misses']==2 and d['closed']['disposals']==2,'retained repair lifecycle')
    check(bool(d['failedPhases'])==(toggle=='on'),'failed span drain')
    for key in ['sourceHash','inputsHash','metadataHash','resultHash']:
        check(d['before'][key]==d['after'][key]==repair['off']['before'][key]==repair['on']['before'][key],'repair output parity')
r=read('report.json');expected=[]
for workload in ['seven-entry','hot-scan','32-entry']:
    for block in range(5):
        variants=[(mode,profile) for mode in ['fresh','immediate','repeat'] for profile in [False,True]]
        if block%2:variants.reverse()
        for mode,profile in variants:expected.append(dict(id=f"{workload}-{block}-{mode}-{'on' if profile else 'off'}",workload=workload,block=block,mode=mode,profile=profile,capacity=8))
check(r['matrix']==expected and len(r['raw'])==90,'fixed90 matrix')
receipts={}
for p in (P/'receipts').glob('*.json.gz'):
    kind,digest=p.name.removesuffix('.json.gz').split('-',1);b=gzip.decompress(p.read_bytes());check(sha(b)==digest,'dictionary hash');receipts[(kind,digest)]=b.decode() if kind=='source' else json.loads(b)
raw={}
for x in r['raw']:
    b=(P/x['path']).read_bytes();check(sha(b)==x['sha256'],'raw hash '+x['id']);raw[x['id']]=read(x['path'])
phases={'session','read-bytes','sha256','configuration','eligibility','input-validation','context-key','source-inventory','receipt-clone','compile-fresh','context-create','rebuild','native'}
rows=[];last=0;calls=0;paired_toggle=0;paired_mode=0
for plan in expected:
    v=raw[plan['id']];d=v['result'];check(v['row']==plan,'row attribution');check(v['run']['exitCode']==0 and not v['survivors'],'process exit');check(d['node']==r['environment']['node'],'Node identity');check(v['run']['startedAt']>=last,'overlapping collection');last=v['run']['finishedAt']
    c=d['closed'];check(c['state']=='closed' and all(c[k]==0 for k in ['live','creating','disposing','quarantined','cleanupFailures']),'owned cleanup');check(c['disposals']==d['beforeClose']['disposals']+d['beforeClose']['live'],'disposal accounting')
    requests=[i%7 for i in range(63)] if plan['workload']=='seven-entry' else [i%32 for i in range(64)] if plan['workload']=='32-entry' else [i%4 for i in range(32)]+list(range(32))+[i%4 for i in range(32)]
    check(d['requests']==requests and [x['index'] for x in d['rows']]==requests,'workload');calls+=len(requests)
    baseline=raw[f"{plan['workload']}-{plan['block']}-fresh-{'on' if plan['profile'] else 'off'}"]['result']
    toggle=raw[f"{plan['workload']}-{plan['block']}-{plan['mode']}-{'off' if plan['profile'] else 'on'}"]['result']
    warm=[];cold=[];seen=set()
    for index,x in enumerate(d['rows']):
        for kind in ['source','inputs','metadata','result']:
            key=kind+'Hash';check((kind,x[key]) in receipts,'full receipt');check(x[key]==baseline['rows'][index][key]==toggle['rows'][index][key],'exact mode/toggle parity')
        if plan['profile']:paired_toggle+=1
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
check(calls==6690 and paired_toggle==3345 and paired_mode==4460,'transform and comparison totals')
groups=[]
for workload in ['seven-entry','hot-scan','32-entry']:
    for mode in ['fresh','immediate','repeat']:
        on=[x for x in rows if (x['workload'],x['mode'],x['profile'])==(workload,mode,True)];off=[x for x in rows if (x['workload'],x['mode'],x['profile'])==(workload,mode,False)]
        ratios=[x['warmMedianMs']/next(y['warmMedianMs'] for y in off if y['block']==x['block']) for x in on]
        groups.append(dict(workload=workload,mode=mode,profileOverheadRatios=ratios,profileOverheadRatioMedian=statistics.median(ratios),profileOffWarmMs=statistics.median(x['warmMedianMs'] for x in off),profileOnWarmMs=statistics.median(x['warmMedianMs'] for x in on),guardWarmMs=statistics.median(x['guardMedianMs'] for x in on),residualWarmMs=statistics.median(x['residualMedianMs'] for x in on),phaseMediansMs={phase:statistics.median(x['phaseMediansMs'][phase] for x in on) for phase in phases},readGroupBytesMedian={key:statistics.median(x['readGroupBytesMedian'][key] for x in on) for key in ['configuration','eligibility','source-inventory']},readBytesMedian=statistics.median(x['readBytesMedian'] for x in on),readCallsMedian=statistics.median(x['readCallsMedian'] for x in on)))
check(r['shippingBefore']==r['shippingAfter'],'shipping inventories')
if '--live' in sys.argv:
    for x in r['shippingAfter']+r['fixture']['artifact']['artifactFiles']:check(sha(pathlib.Path(x['path']).read_bytes())==x['sha256'],'live shipping/candidate')
summary=dict(processes=90,transforms=calls,toggleComparisons=paired_toggle,retainedFreshComparisons=paired_mode,groups=groups,perProcess=rows,scope='Capacity8 diagnostic subset; profiled/off use same instrumented artifact. No production admission, host-budget or device performance claim.')
check(read('summary.json')==summary,'saved summary reproduction')
print('Verified 90 isolated processes, 6,690 transforms, 3,345 toggle pairs and 4,460 retained/fresh pairs; conserved spans and bytes.')
