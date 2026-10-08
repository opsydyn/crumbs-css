"""Check historical proposal and current approval/plan bindings; no product qualification."""
import hashlib,json,subprocess,sys,tarfile,tempfile
from pathlib import Path
folder=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parent
repo=Path(sys.argv[2]).resolve() if len(sys.argv)>2 else folder.parents[2]
read=lambda path:json.loads(path.read_text())
sha=lambda data:hashlib.sha256(data).hexdigest()
packet=read(folder/'packet.json')
assert packet['format']=='crumbs.m10.5.expanded-runtime-plan-packet' and packet['version']==1
for name,digest in packet['files'].items():
 assert Path(name).name==name and sha((folder/name).read_bytes())==digest,name
for name,digest in packet['documents'].items():assert sha((repo/name).read_bytes())==digest,name
a=read(folder/'approval.json')
assert a['status']=='scope-approved-plan-awaiting-review' and a['actualBaselines']=='not admitted'
assert a['executionMethod']=='inline' and a['activeHostMetricCount']==21 and a['unchangedHostMetricCount']==17
assert a['policyId']=='crumbs-host-budgets-2026-10-08-expanded-runtime-v1'
assert a['caps']=={'runtime-theme-core-esm-graph-bytes':39000,'runtime-theme-core-cjs-graph-bytes':39000,'runtime-theme-compatibility-esm-graph-bytes':96000,'runtime-theme-compatibility-cjs-graph-bytes':99000}
assert a['maxRegressionPercent']==0 and a['registrySchemaVersion']==2
assert a['futureComparisonFormatVersion']==3 and a['futureQualificationManifestFormatVersion']==2
assert a['physicalDeviceWork']==a['spokenReaderWork']=='deferred'
assert a['shippingSourceSha256']=='8fe7d6c28c26c9d4214549790d504c62f87c24f6886d7da40e031dd7e9fb4a76' and a['shippingFileCount']==694
assert sha((repo/a['planPath']).read_bytes())==a['planSha256']
pfolder=repo/'docs/evidence/2026-10-08-m10-5-budget-scope-proposal'
assert sha((pfolder/'packet.json').read_bytes())==a['proposalPacketSha256']
assert sha((pfolder/'proposal.json').read_bytes())==a['proposalSha256']
original=read(pfolder/'packet.json');proposal=read(pfolder/'proposal.json')
expected=dict(proposal['references']);expected[original['specPath']]=original['specSha256']
assert a['frozenReferences']==expected and a['originalSpecPath']==original['specPath'] and a['originalSpecSha256']==original['specSha256']
archive=folder/'proposal-references.tar.gz';assert sha(archive.read_bytes())==a['frozenArchiveSha256']
with tempfile.TemporaryDirectory(prefix='crumbs-m105-approved-snapshot-') as temporary:
 root=Path(temporary)
 with tarfile.open(archive,'r:gz') as tar:
  members=tar.getmembers();assert len(members)==len(expected) and {m.name for m in members}==set(expected)
  for member in members:
   assert member.isfile() and not Path(member.name).is_absolute() and '..' not in Path(member.name).parts
   data=tar.extractfile(member).read();assert sha(data)==expected[member.name],member.name
   target=root/member.name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
 subprocess.run([sys.executable,str(pfolder/'verify.py'),str(pfolder),str(root),str(root/original['specPath'])],check=True)
# No active registry/enforcement change is admitted by this planning packet.
for name in ['packages/css/bench/budgets.json','scripts/release-host-budget-policy.ts','scripts/release-host-environment.ts']:
 assert sha((repo/name).read_bytes())==expected[name],name
print('Verified approved scope and inline plan, frozen original proposal, unchanged active registry/enforcement. Implementation and baseline admission remain pending.')
