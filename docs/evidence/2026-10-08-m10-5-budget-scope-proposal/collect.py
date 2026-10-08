from pathlib import Path
import hashlib,json,subprocess
repo=Path('/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css');out=Path('/private/tmp/crumbs-m105-budget-scope-proposal')
def sha(data):return hashlib.sha256(data).hexdigest()
def read(p):return json.loads((repo/p).read_text())
registry=read('packages/css/bench/budgets.json');scope=read('docs/evidence/2026-10-08-m10-5-budget-api-scope/review.json')
contracts=[]
for row in registry['metrics']:
 if row['baseline']['status']=='recorded' and row['threshold']['status']=='approved':contracts.append(row)
assert len(contracts)==21
byid={r['id']:r for r in contracts};mapping=[('runtime-theme-core-esm-graph-bytes','theme-core.mjs'),('runtime-theme-core-cjs-graph-bytes','theme-core.cjs'),('runtime-theme-compatibility-esm-graph-bytes','theme.mjs'),('runtime-theme-compatibility-cjs-graph-bytes','theme.cjs')]
changes=[]
for id,entry in mapping:
 old=byid[id];measured=next(r for r in scope['comparisons']if r['entry']==entry);cap=((measured['currentMinifiedBytes']*11+9999)//10000)*1000
 changes.append({'id':id,'selector':old['baseline']['selector'],'entry':entry,'originalMetric':old,'referenceMinificationOnlyBytes':measured['currentMinifiedBytes'],'proposedAdmissionCapBytes':cap,'referenceMarginBytes':cap-measured['currentMinifiedBytes'],'minimumReductionFromShippingPercent':(1-cap/measured['currentBytes'])*100,'proposedMaxRegressionPercent':0,'baselineAdmission':'actual graph bytes of the independently parity-qualified complete candidate; three identical clean full builds, five canonical scans per build; no baseline admitted by this proposal'})
refs=['packages/css/bench/budgets.json','docs/evidence/2026-10-08-m10-5-budget-api-scope/packet.json','docs/evidence/2026-10-08-m10-5-budget-api-scope/review.json','docs/decisions/anchor-m10-5-runtime-budget-revisions-in-expo-consumer-evidence.md','docs/superpowers/specs/2026-10-07-m10-5-host-budget-release-gate-design.md','docs/assessments/2026-10-06-m10-5-mobile-target-calibration.md','scripts/release-host-budget-policy.ts','scripts/release-host-environment.ts']
proposal={'format':'crumbs.m10.5.budget-scope-proposal','version':1,'status':'proposed-not-approved','roadmap':'M10.5','reviewedRevision':subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo).decode().strip(),'shippingSourceSha256':'8fe7d6c28c26c9d4214549790d504c62f87c24f6886d7da40e031dd7e9fb4a76','proposedPolicyId':'crumbs-host-budgets-2026-10-08-expanded-runtime-v1','capDerivation':{'reference':'full-API minification-only diagnostic','numerator':11,'denominator':10,'roundUpQuantumBytes':1000,'interpretation':'10 percent engineering allowance rounded up to 1000 bytes; policy judgement, not noise or mobile-performance evidence; no growth allowance after baseline admission'},'changedMetrics':changes,'unchangedHostMetrics':[r for r in contracts if r['id']not in {x['id']for x in changes}],'activeHostMetricCount':21,'proposedReportFormatVersion':3,'proposedQualificationManifestFormatVersion':2,'registrySchemaVersionRemains':2,'activation':'single complete API-preserving remediation and policy batch; all 21 host comparisons pass, no incomplete rows, public parity and non-physical qualification pass; otherwise reject entire candidate and keep current registry/gate','physicalDeviceWork':'deferred','mobileTargets':'none proposed','references':{p:sha((repo/p).read_bytes())for p in refs}}
(out/'proposal.json').write_text(json.dumps(proposal,indent=2)+'\n')
print(json.dumps([{k:r[k]for k in ['id','proposedAdmissionCapBytes','proposedMaxRegressionPercent','minimumReductionFromShippingPercent']}for r in changes],indent=2))
