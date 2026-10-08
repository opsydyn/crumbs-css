"""Offline integrity/arithmetic verifier. Never qualifies behaviour or release acceptance."""
import gzip, hashlib, io, json, math, sys, tarfile
from pathlib import Path
packet=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parent
repo=Path(sys.argv[2]).resolve() if len(sys.argv)>2 else packet.parents[2]
def read(path):return json.loads(path.read_text())
def sha(data):return hashlib.sha256(data).hexdigest()
def archive(path):
 result={}
 with tarfile.open(path,'r:gz') as a:
  for e in a:
   assert e.isfile() and not Path(e.name).is_absolute() and '..' not in Path(e.name).parts
   assert e.name not in result
   result[e.name]=a.extractfile(e).read()
 return result
p=read(packet/'packet.json');assert p['qualification']=='diagnostic-only'
for name,digest in p['files'].items():assert sha((packet/name).read_bytes())==digest,name
for name,digest in p['references'].items():assert sha((repo/name).read_bytes())==digest,name
admission=read(repo/'docs/evidence/2026-09-21-m4-6-runtime-byte-budget-admission/admission.json')
prior=read(repo/'docs/evidence/2026-10-08-m10-5-runtime-architecture-attribution/summary.json')
origins=json.loads(gzip.decompress((repo/'docs/evidence/2026-10-08-m10-5-runtime-architecture-attribution/attribution.json.gz').read_bytes()))
cohorts={c:archive(packet/(c+'-package.tar.gz'))for c in ['baseline','baseline-minified']}
cohorts['current']=archive(repo/'docs/evidence/2026-10-08-m10-5-consolidated-host-remediation/control-package.tar.gz')
minified=archive(repo/'docs/evidence/2026-10-08-m10-5-runtime-architecture-attribution/mapped-artifacts.tar.gz')
sources=read(packet/'sources.json');assert sources['baseline']==sources['admission']
assert sources['baselineRevision']==admission['sourceRevision'] and sources['admissionRevision']==admission['admissionSourceRevision']
for c in ['baseline','baseline-minified','current']:
 for s in sources['baseline' if c.startswith('baseline') else 'current']:assert sha(cohorts[c][s['file']])==s['sha256']
 # Current identity check is limited to the retained source/config manifest.
graphs=read(packet/'graphs.json')['graphs'];assert len(graphs)==12
entries=['theme-core.mjs','theme-core.cjs','theme.mjs','theme.cjs']
assert {(x['cohort'],x['entry'])for x in graphs}=={(c,e)for c in cohorts for e in entries}
for g in graphs:
 assert g['externals']==['react'] and g['nonliteralLoads']==0
 assert len(g['artifacts'])==len(g['files'])
 total=0
 for item in g['artifacts']:
  data=cohorts[g['cohort']]['dist/'+Path(item['file']).name]
  assert len(data)==item['bytes'] and sha(data)==item['sha256'];total+=len(data)
 assert total==g['bytes']
exports=read(packet/'exports.json');assert exports['qualification']=='namespace-presence-only' and len(exports['rows'])==8
review=read(packet/'review.json');assert review['qualification'].startswith('diagnostic-only;') and len(review['comparisons'])==4
for r in review['comparisons']:
 e=r['entry'];family='theme-core'if e.startswith('theme-core')else'theme';fmt='esm'if e.endswith('mjs')else'cjs'
 historical=admission['currentGraphs'][family][fmt]
 get=lambda c:next(g for g in graphs if g['entry']==e and g['cohort']==c)
 for actual,expected in zip(get('baseline')['artifacts'],historical['artifacts']):
  assert Path(actual['file']).name==expected['file'] and actual['sha256']==expected['sha256'] and actual['bytes']==expected['bytes']
 assert len(get('baseline')['artifacts'])==len(historical['artifacts'])
 assert r['ceiling']==r['historicalBytes']==get('baseline')['bytes']==historical['graphBytes']
 assert r['historicalMinifiedBytes']==get('baseline-minified')['bytes']
 assert r['currentBytes']==get('current')['bytes']
 old=next(x for x in prior['graphs']if x['entry']==e);assert r['currentBytes']==old['controlBytes'] and r['currentMinifiedBytes']==old['minifiedControlBytes']
 ag=origins['cohorts']['minified-control'][e]
 assert r['minifiedSourceOrigins']==ag['sourceBytes'] and sum(x['bytes']for x in r['minifiedSourceOrigins'])==r['currentMinifiedBytes']
 assert sum(len(minified['minified-control/reference/'+a['file']])for a in ag['artifacts'])==r['currentMinifiedBytes']
 for a in ag['artifacts']:assert sha(minified['minified-control/reference/'+a['file']])==a['sha256']
 assert r['minifiedGrowthBytes']==r['currentMinifiedBytes']-r['historicalMinifiedBytes']
 assert r['minifiedGapBytes']==r['currentMinifiedBytes']-r['ceiling']>0
 assert math.isclose(r['requiredMinifiedReductionPercent'],r['minifiedGapBytes']/r['currentMinifiedBytes']*100,abs_tol=1e-10)
 names=lambda c:next(x['names']for x in exports['rows']if x['entry']==e and x['cohort']==c)
 before=names('baseline');after=names('current')
 assert before==sorted(set(before)) and after==sorted(set(after))
 assert r['baselineExports']==len(before) and r['currentExports']==len(after)
 assert r['addedExports']==sorted(set(after)-set(before)) and r['removedExports']==sorted(set(before)-set(after))==[]
for c in ['baseline','current']:
 for stem in ['theme-core','theme']:assert next(x['names']for x in exports['rows']if x['cohort']==c and x['entry']==stem+'.mjs')==next(x['names']for x in exports['rows']if x['cohort']==c and x['entry']==stem+'.cjs')
print('Verified: historical artifact identity, 12 graph totals, source/config bindings, namespace comparison and four fixed-limit failures. Diagnostic only.')
