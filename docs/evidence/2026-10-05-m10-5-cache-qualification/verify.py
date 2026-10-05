"""Offline evidence replay. Optional --live checks the preserved measured workspace too."""
import gzip, hashlib, json, pathlib, statistics, sys, re
P = pathlib.Path(__file__).resolve().parent
sha = lambda b: hashlib.sha256(b).hexdigest()
def read(name):
    p = P / name
    return json.loads(gzip.decompress(p.read_bytes()) if p.suffix == '.gz' else p.read_bytes())
def check(value, message):
    if not value: raise AssertionError(message)
manifest=read('archive-manifest.json')
for entry in manifest:
    check(sha((P/entry['path']).read_bytes())==entry['sha256'],'archive hash '+entry['path'])
r = read('report.json'); raw = {}
for row in r['raw']:
    check(sha((P / row['path']).read_bytes()) == row['sha256'], 'raw hash '+row['name'])
    raw[row['name']] = read(row['path'])
check(len(raw) == 126, 'raw membership')
# Re-hash the complete bytes: source is text; other dictionaries are exact JSON.
receipts = {}
for p in (P/'receipts').glob('*.json.gz'):
    kind, digest = p.name.removesuffix('.json.gz').split('-',1)
    b = gzip.decompress(p.read_bytes()); check(sha(b)==digest,'receipt hash '+p.name)
    receipts[(kind,digest)] = b.decode() if kind=='source' else json.loads(b)
plan=[]
for workload in ['seven-entry','hot-scan','32-entry']:
    for block in range(5):
        modes=[('fresh',4)]+[(mode,capacity) for mode in ['immediate','repeat'] for capacity in [4,8,16]]
        if block%2: modes.reverse()
        plan.extend(dict(id=f'{workload}-{block}-{mode}-{capacity}',workload=workload,block=block,mode=mode,capacity=capacity) for mode,capacity in modes)
check(r['matrix']==plan,'frozen matrix order/membership')
last=0; calls=0; per_process=[]
def parity(a,b):
    return len(a)==len(b) and all(x['index']==y['index'] and all(x[k]==y[k] for k in ['sourceHash','inputsHash','metadataHash','resultHash']) for x,y in zip(a,b))
def probe(value,node):
    check(value['run']['exitCode']==0 and not value['survivors'],'probe exit/survivors')
    d=value['result'];check(d['node']==node,'Node identity')
    c=d['closed'];check(c['state']=='closed' and all(c[k]==0 for k in ['live','creating','disposing','quarantined','cleanupFailures']), 'owned close')
    check(c['disposals']==d['beforeClose']['disposals']+d['beforeClose']['live'],'disposal accounting')
    for row in d['rows']:
        for kind in ['source','inputs','metadata','result']:check((kind,row[kind+'Hash']) in receipts,'missing full receipt')
    return d
for row in plan:
    value=raw[row['id']];d=probe(value,'v24.15.0');baseline=raw[f"{row['workload']}-{row['block']}-fresh-4"]['result']
    check(value['run']['startedAt']>=last,'overlapping throughput processes');last=value['run']['finishedAt']
    requests=[i%7 for i in range(63)] if row['workload']=='seven-entry' else [i%32 for i in range(64)] if row['workload']=='32-entry' else [i%4 for i in range(32)]+list(range(32))+[i%4 for i in range(32)]
    check(d['requests']==requests and [x['index'] for x in d['rows']]==requests,'workload')
    check(d['id']==row['id'] and d['mode']==row['mode'] and d['capacity']==row['capacity'],'process attribution')
    check(parity(d['rows'],baseline['rows']),'full paired parity '+row['id'])
    seen=set();cold=[];warm=[];queue=[];previous_queue=0
    for x in d['rows']:
        (warm if x['index'] in seen else cold).append(x['elapsedMs']);seen.add(x['index'])
        queue.append(x['queueWaitMs']-previous_queue);previous_queue=x['queueWaitMs']
        code='\n'.join(item['data'].get('code','') for item in receipts[('result',x['resultHash'])]['output'])
        check(all(re.search(r'\b'+field+r'"?\s*:\s*'+str(40000+x['index'])+r'\b',code) for field in ['paddingTop','paddingBottom','paddingLeft','paddingRight']), 'native baked values')
        check(x['snapshot']['live']<=row['capacity'] and x['snapshot']['probation']<=2*row['capacity'],'resource bounds')
    calls+=len(d['rows'])
    per_process.append(dict(**row,warmMedianMs=statistics.median(warm),coldMedianMs=statistics.median(cold),moduleLoadMs=d['moduleLoadMs'],processMs=value['run']['elapsedMs'],queueMedianMs=statistics.median(queue),nodeRssMiB=d['memory']['nodeRssBytes']/1048576,serviceRssMiB=d['memory']['serviceRssBytes']/1048576,hits=d['closed']['hits'],misses=d['closed']['misses'],evictions=d['closed']['evictions']))
check(calls==7805,'transform count')
groups=[]
for workload in ['seven-entry','hot-scan','32-entry']:
    for mode,capacity in [('fresh',4)]+[(m,c) for m in ['immediate','repeat'] for c in [4,8,16]]:
        rows=[x for x in per_process if (x['workload'],x['mode'],x['capacity'])==(workload,mode,capacity)]
        ratios=[x['warmMedianMs']/next(b['warmMedianMs'] for b in per_process if b['workload']==workload and b['block']==x['block'] and b['mode']=='fresh') for x in rows]
        groups.append(dict(workload=workload,mode=mode,capacity=capacity,pairedWarmRatios=ratios,pairedWarmRatioMedian=statistics.median(ratios),**{k:statistics.median([x[k] for x in rows]) for k in ['warmMedianMs','coldMedianMs','moduleLoadMs','processMs','queueMedianMs','nodeRssMiB','serviceRssMiB','hits','misses','evictions']}))
check(all(x['pairedWarmRatioMedian']>1 for x in groups if x['mode']!='fresh'),'regression conclusion')
floor=[probe(raw['floor-'+m],'v22.0.0') for m in ['fresh','immediate','repeat']]
check(all(len(x['rows'])==63 and parity(x['rows'],floor[0]['rows']) for x in floor),'floor parity')
check(all(x['closed']['hits']>0 for x in floor[1:]),'floor retained hits')
for ms in [1000,30000,120000]:
    d=probe(raw['idle-'+str(ms)],'v24.15.0');check(len(d['cycles'])==3 and len(d['rows'])==28,'three idle/reopen cycles')
    for cycle in d['cycles']:check(cycle['waitMs']>=ms and cycle['after']['live']==0 and cycle['after']['disposals']-cycle['before']['disposals']==7,'real idle disposal')
entry=raw['entry-controls'];check(len(entry)==4,'entry controls')
for kind in ['entry-edit','import-removal']:
    x=next(x for x in entry if x['kind']==kind);check(x['status']==200 and x['expectedPresent'] is True and x['previousAbsent'] is True and x['referenceMatched'] is True,'entry/import removal')
check(next(x for x in entry if x['kind']=='entry-restored')['referenceMatched'] is False,'restored-entry parity failure retained')
inc=raw['incremental'];check(len(inc)==13,'incremental controls')
for kind in ['plain-token','nested-css','workspace-source']:
    x=next(x for x in inc if x['kind']==kind);check(x['status']==200 and all(x[k] is True for k in ['importerUnchanged','expectedPresent','previousAbsent','referenceMatched']),'dependency '+kind)
check([x['kind'] for x in inc if x.get('referenceMatched') is False]==['alias-retarget','workspace-package-import','symlink-retarget'],'failed resolver controls')
check(next(x for x in inc if x['kind']=='syntax-error')['status']==500 and next(x for x in inc if x['kind']=='syntax-repair')['referenceMatched'] is True,'error repair')
check(raw['fresh-production']['status']==200 and raw['fresh-development']['status']>=400,'CLI responses')
check(sha(gzip.decompress((P/'production-response.js.gz').read_bytes()))==raw['fresh-production']['sha256'],'actual successful body')
check(sha(gzip.decompress((P/'development-response.json.gz').read_bytes()))==raw['fresh-development']['sha256'],'actual failed body')
for name in ['multi-worker','worker-threads']:
    d=raw[name];check(d['status']==200,'worker bundle');transforms=[x for x in d['rows'] if x['kind']=='transform']
    check(len(set(x['pid'] for x in transforms))==2 if name=='multi-worker' else len(set(x['threadId'] for x in transforms))==2,'actual topology')
check(raw['multi-worker-shutdown']['survivors'] and not raw['worker-threads-shutdown']['survivors'],'bounded exit statuses')
check(not read('forced-cleanup.json')['laterObservedSurvivors'],'later survivor observation')
owner=raw['long-lived-owner-sdk-retry']['data'];check(len(owner['rows'])==3 and len(set(x['mainPid'] for x in owner['rows']))==1,'one owner')
for x,n in zip(owner['rows'],[8,8,7]):check(x['status']==200 and x['mainAlive'] is True and x['after']['live']==0 and x['after']['disposals']-x['before']['disposals']==n,'owner restart/project idle')
check(owner['rows'][0]['project']==owner['rows'][1]['project']!=owner['rows'][2]['project'],'restart then second project')
check(owner['closed']['state']=='closed' and owner['closed']['disposals']==23 and owner['closed']['live']==0 and owner['closed']['cleanupFailures']==0,'owner awaited close')
check(raw['long-lived-owner']['data'] is None,'failed original preserved')
discarded=read('invalidated-throughput.json');check(len(discarded)==105,'discarded collection')
for x in discarded:check(sha((P/'invalidated-throughput'/(x['id']+'.json.gz')).read_bytes())==x['sha256'],'discarded hash')
check(r['shippingBefore']==r['shippingAfter'],'shipping inventories')
rest=read('integration-restoration.json')
for x in rest['files']:check(x['originalSha256']==x['restoredSha256'],'restoration '+x['path'])
if '--live' in sys.argv:
    for x in rest['files']:check(sha(pathlib.Path(x['path']).read_bytes())==x['restoredSha256'],'live restored file')
    check(str(pathlib.Path(rest['link']['path']).resolve())==rest['link']['originalTarget'],'live restored symlink')
    for x in r['shippingAfter']:check(sha(pathlib.Path(x['path']).read_bytes())==x['sha256'],'live shipping inventory')
    for x in r['fixture']['artifact']['artifactFiles']:check(sha(pathlib.Path(x['path']).read_bytes())==x['sha256'],'live candidate artifact')
summary=dict(processes=105,transforms=calls,excludedProcesses=105,receiptDictionary=len(receipts),groups=groups,perProcess=per_process,performanceBenefit='failed')
(P/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print('Verified 105 isolated processes / 7,805 exact paired transforms; floor, real idle, stock owner, failed gates and excluded attempts retained.')
