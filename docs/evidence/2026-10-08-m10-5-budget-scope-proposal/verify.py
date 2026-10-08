"""Verify the draft's source bindings and arithmetic; does not approve policy or product."""
import hashlib,json,sys
from pathlib import Path
folder=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parent
repo=Path(sys.argv[2]).resolve() if len(sys.argv)>2 else folder.parents[2]
def read(p):return json.loads(p.read_text())
def sha(data):return hashlib.sha256(data).hexdigest()
packet=read(folder/'packet.json')
assert packet['status']=='proposed-not-approved'
for name,digest in packet['files'].items():assert sha((folder/name).read_bytes())==digest,name
specPath=Path(sys.argv[3]).resolve() if len(sys.argv)>3 else repo/packet['specPath']
assert sha(specPath.read_bytes())==packet['specSha256']
p=read(folder/'proposal.json')
assert p['status']=='proposed-not-approved' and p['activeHostMetricCount']==21
assert p['mobileTargets']=='none proposed' and p['physicalDeviceWork']=='deferred'
assert p['proposedPolicyId']=='crumbs-host-budgets-2026-10-08-expanded-runtime-v1'
assert p['proposedReportFormatVersion']==3 and p['proposedQualificationManifestFormatVersion']==2 and p['registrySchemaVersionRemains']==2
for path,digest in p['references'].items():assert sha((repo/path).read_bytes())==digest,path
registry=read(repo/'packages/css/bench/budgets.json')
rows=[r for r in registry['metrics']if r['baseline']['status']=='recorded'and r['threshold']['status']=='approved'];assert len(rows)==21
scope=read(repo/'docs/evidence/2026-10-08-m10-5-budget-api-scope/review.json')
expected={'runtime-theme-core-esm-graph-bytes':('theme-core.mjs',39000),'runtime-theme-core-cjs-graph-bytes':('theme-core.cjs',39000),'runtime-theme-compatibility-esm-graph-bytes':('theme.mjs',96000),'runtime-theme-compatibility-cjs-graph-bytes':('theme.cjs',99000)}
assert len(p['changedMetrics'])==4 and {r['id']for r in p['changedMetrics']}==set(expected)
assert p['capDerivation']['numerator']==11 and p['capDerivation']['denominator']==10 and p['capDerivation']['roundUpQuantumBytes']==1000
for row in p['changedMetrics']:
 id=row['id'];entry,cap=expected[id];original=next(r for r in rows if r['id']==id);measured=next(r for r in scope['comparisons']if r['entry']==entry)
 assert row['originalMetric']==original and row['selector']==original['baseline']['selector'] and row['entry']==entry
 assert row['referenceMinificationOnlyBytes']==measured['currentMinifiedBytes']
 assert row['proposedAdmissionCapBytes']==cap==((measured['currentMinifiedBytes']*11+9999)//10000)*1000
 assert row['referenceMarginBytes']==cap-row['referenceMinificationOnlyBytes'] and row['proposedMaxRegressionPercent']==0
 assert abs(row['minimumReductionFromShippingPercent']-(1-cap/measured['currentBytes'])*100)<1e-10
 assert 'no baseline admitted by this proposal' in row['baselineAdmission']
assert p['unchangedHostMetrics']==[r for r in rows if r['id']not in expected] and len(p['unchangedHostMetrics'])==17
assert len({r['id']for r in p['unchangedHostMetrics']}|set(expected))==21
print('Verified proposed-only policy: four numeric caps, zero post-admission growth, 17 unchanged host contracts, immutable reference hashes. No policy accepted or product qualified.')
