"""Offline replay of graph diagnosis. Does not admit a cache or pass device/budget gates."""
import pathlib,json,gzip,hashlib,sys
P=pathlib.Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
def check(ok,message):
 if not ok:raise AssertionError(message)
def read(file):
 b=(P/file).read_bytes();return json.loads(gzip.decompress(b) if str(file).endswith('.gz') else b)
def stringify(v):return json.dumps(v,separators=(',',':'),ensure_ascii=False).encode()
m=read('archive-manifest.json');files={str(f.relative_to(P)):sha(f.read_bytes()) for f in P.rglob('*') if f.is_file() and f.name!='archive-manifest.json'}
check(files==m['files'],'archive membership/hash')
reports={name:read(name+'.json.gz') for name in ['isolated','pilot','chain','watch','no-cache']}
dictionaries={}
for f in (P/'support').rglob('*.json.gz'):
 if f.parent.name!='receipts':continue
 kind,digest=f.name.removesuffix('.json.gz').split('-',1);b=gzip.decompress(f.read_bytes());check(sha(b)==digest,'reference dictionary bytes');dictionaries[(kind,digest)]=b
pairs=0
for name,r in reports.items():
 check(r['shippingBefore']==r['shippingAfter'],'shipping inventory')
 if '--live' in sys.argv:
  for f in r['shippingAfter']+r['fixture']['artifact']['artifactFiles']:check(sha(pathlib.Path(f['path']).read_bytes())==f['sha256'],'live shipping/artifact')
 rows=r['rows'] if name in ['isolated','pilot'] else [x for t in r['trials'] for x in t['observations'] if x.get('actual')]
 for x in rows:
  a=x['actual'];reference=x['reference']['rows'][0] if name in ['isolated','pilot'] else x['reference']
  receipt=a['receipts'][0]
  check(sha(receipt['receipt']['source'].encode())==receipt['sourceHash'],'actual full source')
  check(sha(stringify(receipt['inputs']))==receipt['inputsHash'],'actual full inputs')
  check(sha(stringify(a['result']))==a['resultHash'],'actual full result')
  check(a['metadata']==a['result']['__crumbsNativeStyles'],'actual native metadata')
  for kind in ['source','inputs','metadata','result']:check((kind,reference[kind+'Hash']) in dictionaries,'complete independent fresh bytes')
  if name in ['isolated','pilot']:
   check(x['reference']['node']=='v24.15.0' and x['reference']['closed']['live']==0 and x['reference']['closed']['state']=='closed','reference Node/close')
  pairs+=1
r=reports['isolated'];expected=[(k,m,s) for k in ['alias-retarget','workspace-package-import','symlink-retarget'] for m in ['fresh','immediate'] for s in ['initial','edit','forced-entry','new-owner']]
check([(x['kind'],x['mode'],x['stage']) for x in r['rows']]==expected,'isolated24 membership')
for x in r['rows']:
 a=x['actual'];ref=x['reference']['rows'][0];check(a['entryHash']==a['diskEntryHash']==x['state']['entryHash'],'current supplied/disk entry bytes')
 equal=all([a['receipts'][0]['sourceHash']==ref['sourceHash'],a['receipts'][0]['inputsHash']==ref['inputsHash'],sha(stringify(a['metadata']))==ref['metadataHash'],a['resultHash']==ref['resultHash']])
 failed=x['kind']=='alias-retarget' and x['stage']=='edit'
 check(x['status']==200 and x['expectedPresent']!=failed and equal!=failed,'isolated result classification')
 if failed:check(x['traceCountBefore']==x['traceCountAfter'],'alias edit no transform invocation')
 if x['stage']=='new-owner':
  prior=next(y for y in r['rows'] if (y['kind'],y['mode'],y['stage'])==(x['kind'],x['mode'],'edit'))
  check(x['state']['entryHash']==prior['state']['entryHash'],'restart restores original unchanged entry')
check(len(r['owners'])==12 and len({x['pid'] for x in r['owners']})==12,'twelve independent stock owners')
for o in r['owners']:
 check(o['exitCode']==0 and o['node']=='v24.15.0' and o['closed']['state']=='closed' and all(o['closed'][k]==0 for k in ['live','pending','creating','disposing','quarantined','cleanupFailures']),'stock owner close')
check(len(r['restoration'])==6,'all isolated cases restored')
for x in r['restoration']:check(all(f['original']==f['restored'] for f in x['files']) and x['link']==r['fixture']['integration']['workspace'],'isolated restoration')
check(len(reports['pilot']['rows'])==24 and any(x['actual']['entryHash']!=x['state']['entryHash'] for x in reports['pilot']['rows']),'pilot exposes stale observations')
sequence=['initial','entry-edit','import-removal','entry-restored','plain-token','nested-css','workspace-source','import-replacement','alias-added','alias-retarget','workspace-package-import','manifest-exports','symlink-retarget','installation-lock','syntax-error','syntax-repair']
for name in ['chain','watch','no-cache']:
 r=reports[name];check([t['mode'] for t in r['trials']]==(['fresh','immediate'] if name=='chain' else ['fresh']),'chain modes')
 for t in r['trials']:
  check([x['kind'] for x in t['observations']]==sequence,'original chain16 membership')
  check(all(f['originalSha256']==f['restoredSha256'] for f in t['restoration']['files']) and t['restoration']['link']['originalTarget']==t['restoration']['link']['restoredTarget'],'chain restoration')
  rows={x['kind']:x for x in t['observations']};alias=rows['alias-retarget'];workspace=rows['workspace-package-import'];symlink=rows['symlink-retarget']
  check(not alias['expectedPresent'] and not alias['referenceMatched'] and alias['actual']['at']==rows['alias-added']['actual']['at'],'alias fresh/retained no invocation')
  check(workspace['expectedPresent'] and not workspace['referenceMatched'] and workspace['actual']['entryHash']!=workspace['currentEntryHash'],'legacy workspace predicate uses older entry')
  if name=='no-cache':
   check(symlink['expectedPresent'] and symlink['referenceMatched'] and symlink['actual']['at']!=rows['manifest-exports']['actual']['at'],'cache disabled symlink parity')
   check(rows['entry-restored']['referenceMatched'],'cache disabled restored entry parity')
  else:
   check(not symlink['expectedPresent'] and not symlink['referenceMatched'] and symlink['actual']['at']==rows['manifest-exports']['actual']['at'],'cache enabled symlink no worker call')
   check(rows['entry-restored']['expectedPresent'] and not rows['entry-restored']['referenceMatched'] and rows['entry-restored']['actual']['entryHash']!=rows['entry-restored']['currentEntryHash'],'restored entry trace cannot qualify cached bundle')
  if name in ['watch','no-cache']:
   changes=[c for x in t['traces'] if x['kind']=='watch' for group in x['changes'].values() for c in group]
   check(any(c['path']=='tsconfig.base.json' for c in changes),'tsconfig watch event observed')
   check(any(c['path']=='node_modules/qualification-workspace-tokens' and c['isSymlink'] for c in changes),'symlink watch event observed')
check(reports['no-cache']['noDiskCache'] is True and reports['no-cache']['watch'] is True,'cache control declared')
check(pairs==108,'48 isolated/pilot and 60 chain complete pairs')
print('Verified corrected isolated24, diagnostic pilot24, four original-sequence trials64 (60 complete pairs), 12 stock owners, watch/cache controls, full fresh bytes and restoration. No production/device/budget admission.')
