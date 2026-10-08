from pathlib import Path
import json,hashlib,subprocess,datetime,gzip
repo=Path('/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css'); e=repo/'docs/evidence/2026-10-08-m11-1-local-vars'
h=json.loads((e/'host/qualification.json').read_text());n=json.loads((e/'native/qualification.json').read_text());b=json.loads((e/'host-budgets/comparison.json').read_text());i=json.loads((e/'host-budgets/input-identity.json').read_text())
assert h['host']=='passed' and all(c['exitCode']==0 for c in h['commands'])
assert n['native']=={'ios':'passed','android':'passed'} and n['artifact']==h['artifact']
assert n['sourceDigest']==h['sourceAfter']['digest']==h['sourceBefore']['digest']
assert len(b['metrics'])==21 and len({m['id'] for m in b['metrics']})==21
assert b['blocking']['incompleteIds']==[] and b['advisory']['incompleteIds']==[]
assert b['blocking']['failIds']==['warm-transform-ms']
assert i['sourceBefore']['sha256']==i['sourceAfter']['sha256'] and i['artifactsBefore']==i['artifactsAfter'] and i['policyBefore']==i['policyAfter']
for f in h['sourceAfter']['files']:assert hashlib.sha256((repo/f['path']).read_bytes()).hexdigest()==f['sha256'],f['path']
for f in n['files']:
 p=e/'native'/f['path']
 raw=p.read_bytes() if p.exists() else gzip.decompress(Path(str(p)+'.gz').read_bytes())
 assert hashlib.sha256(raw).hexdigest()==f['sha256'],f['path']
for f in h['artifactHashes']:
 if f['path'].startswith('dist/') or f['path']=='package.json':assert hashlib.sha256((repo/'packages/css'/f['path']).read_bytes()).hexdigest()==f['sha256'],f['path']
matched=Path('/private/tmp/crumbs-m111-matched-host')
for p in (repo/'packages/css/dist').iterdir():
 if p.is_file():assert p.read_bytes()==(matched/'packages/css/dist'/p.name).read_bytes(),p.name
for rel in ['apps/playground/metro.config.js','apps/playground/src/incremental-entry.ts','apps/playground/src/incremental.css.ts','apps/playground/src/incremental-token.ts','apps/playground/src/incremental-base.css.ts','packages/css/fixtures/m2-7-workspace-token.ts']:
 assert (repo/rel).read_bytes()==(matched/rel).read_bytes(),rel
r={'schema':'crumbs.m11.1.final-acceptance.v1','recordedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceFileHashes':'passed','nativeEvidenceHashes':'passed','artifactCohort':'passed','matchedScaffoldArtifactsAndCurrentFixtures':'passed','host':'passed','ios':'passed','android':'passed','featureAcceptance':'passed','releaseAcceptance':'open','hostBudgetBlocking':b['blocking'],'hostBudgetAdvisory':b['advisory'],'policyBinding':b['policy'],'physicalAndScreenReader':'deferred','releaseLimitsChanged':False}
(e/'acceptance.json').write_text(json.dumps(r,indent=2)+'\n')
print('M11.1 feature acceptance passed; M10.5 remains open with the warm-transform failure.')
