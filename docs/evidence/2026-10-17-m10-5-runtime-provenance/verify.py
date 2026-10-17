#!/usr/bin/env python3
"""Verify the stopped capture packet's integrity/derivations, not execution attestation."""
import argparse,hashlib,json,posixpath,tarfile
from pathlib import Path

UNRUN={'clean-repeat-skip-clean-finalization','installed-artifact-and-relocation','artifact-contamination-negative-controls','strict-platform-maps-sdk56-sdk57-sdk58','workspace-babel-rust','current-release-v3-integration','emitted-library-node-floor-current-qualification','standalone-helper-node-floor-smoke','full-library-storybook-types-suites','full-host-performance-and-publication'}
OWNERS={'extensions','algebra','motion','motion-native','containers','theme','core','theme-token','tools','devtools'}
EXPECTED={('.', 'cjs'):['url'],('./tooling/manifest','esm'):['metro-transform-worker'],('./tooling/manifest','cjs'):['metro-transform-worker','url'],('./metro-plugin','cjs'):['url'],('./dist/transformer','esm'):['metro-transform-worker'],('./dist/transformer','cjs'):['metro-transform-worker','url'],('./dist/metro-plugin','cjs'):['url']}
def require(ok,message):
 if not ok:raise ValueError(message)
def sha(data):return hashlib.sha256(data).hexdigest()
def archive(path):
 with tarfile.open(path) as t:
  result={}
  for m in t.getmembers():
   require(m.isfile() and not m.name.startswith('/') and '..' not in m.name.split('/'),'unsafe archive member')
   require(m.name not in result,'duplicate archive member');result[m.name]=t.extractfile(m).read()
  return result

def verify(root,repository=None):
 root=Path(root);summary=json.loads((root/'summary.json').read_text())
 for row in json.loads((root/'packet-files.json').read_text()):require(sha((root/row['path']).read_bytes())==row['sha256'],'packet file hash: '+row['path'])
 require(summary['disposition']=='rejected-at-build-provenance-agreement' and not summary['shippingProductChanged'] and not summary['releaseAdmission'],'wrong disposition')
 require(set(summary['notRun'])==UNRUN and len(summary['notRun'])==len(UNRUN),'incomplete unrun declaration')
 original=archive(root/'original-product.tar.gz');original_inventory=json.loads((root/'original-product.json').read_text())
 require(len(original)==len(original_inventory)==948,'original product inventory')
 for row in original_inventory:require(sha(original[row['path']])==row['sha256'],'original product hash')
 original_dist=archive(root/'original-dist.tar.gz');dist_inventory=json.loads((root/'original-dist.json').read_text())
 require(len(original_dist)==len(dist_inventory)==181,'original dist count')
 for row in dist_inventory:require(sha(original_dist[row['path']])==row['sha256'],'original dist hash')
 baseline=archive(root/'baseline-1-dist.tar.gz');baseline2=archive(root/'baseline-2-dist.tar.gz');capture=archive(root/'capture-dist.tar.gz')
 require(len(baseline)==181 and baseline==baseline2==capture,'baseline/capture artifact byte drift')
 candidate=archive(root/'candidate-files.tar.gz');candidate_inventory=json.loads((root/'candidate-source-files.json').read_text())
 require(len(candidate)==len(candidate_inventory)==13,'candidate source count')
 for row in candidate_inventory:require(len(candidate[row['path']])==row['bytes'] and sha(candidate[row['path']])==row['sha256'],'candidate source hash')
 raw=archive(root/'raw-evidence.tar.gz');owners=archive(root/'capture-owner-receipts.tar.gz')
 session=json.loads(owners['session.json']);receipts={name:json.loads(data) for name,data in owners.items() if name!='session.json'}
 require(set(receipts)=={f'{owner}-{fmt}.json' for owner in OWNERS for fmt in ['esm','cjs']},'missing capture owner')
 artifacts={}
 for c in receipts.values():
  require(c['generation']==session['generation'],'capture generation mismatch')
  for a in c['artifacts']:
   require(a['owner']==c['owner'] and a['format']==c['format'],'capture owner identity')
   require(a['path'] not in artifacts,'duplicate capture artifact owner');artifacts[a['path']]=a
   data=capture['packages/css/'+a['path']]
   require(len(data)==a['bytes'] and sha(data)==a['sha256'],'captured JS bytes')
 require(len(artifacts)==105,'JS artifact count')
 audit=json.loads(raw['actual-audit.json']);graphs=audit['entries']
 require(len(graphs)==59 and len({(g['subpath'],g['format']) for g in graphs})==59,'audited row count/identity')
 require(audit['generation']==session['generation'],'audit generation')
 ordinary=[g for g in graphs if g['classification']=='ordinary-runtime'];require(len(ordinary)==30,'ordinary count')
 sources=set();differences={}
 for graph in graphs:
  if graph['format']=='metadata':continue
  files=set();externals=set()
  def visit(path):
   if path in files:return
   files.add(path);a=artifacts[path]
   for specifier in set(a['imports']+a['dynamicImports']):
    local=posixpath.normpath(posixpath.join(posixpath.dirname(path),specifier))
    if local in artifacts:visit(local)
    else:externals.add(specifier)
  visit(graph['entry'].removeprefix('./'))
  require(files==set(graph['files']),'captured local-file graph mismatch')
  actual=set(graph['externalSpecifiers']);require(not(externals-actual),'captured extra external')
  if actual!=externals:differences[(graph['subpath'],graph['format'])]=sorted(actual-externals)
  if graph['classification']=='ordinary-runtime':
   require(externals==actual,'ordinary external mismatch')
   for path in graph['files']:
    for member in artifacts[path]['members']:
     require(member['kind']=='source','ordinary non-source member')
     key='packages/css/'+member['path'];require(sha(original[key])==member['sha256'],'runtime source binding');sources.add(member['path'])
 require(differences==EXPECTED,'wrong tooling graph omissions')
 require(len(sources)==62,'ordinary source count')
 policy=json.loads(candidate['packages/css/build/runtime-provenance-policy.json'])
 require(set(policy['runtimeSources'])==sources and not policy['helpers'],'bootstrap policy mismatch')
 require(json.loads(raw['capture-finalized-2-exit.json'])['exitCode']==1,'missing failed finalization')
 require(b'Captured dependency graph differs from actual audit: .:cjs' in raw['capture-finalized-2.log'],'wrong final error')
 require(b'19 pass' in raw['initial-focused-green-2.log'] and b'0 fail' in raw['initial-focused-green-2.log'],'focused test result')
 require(b'"status":"observed-not-qualified"' in raw['capture-observation.log'],'bootstrap falsely qualified')
 require(not any(p.endswith('runtime-provenance.json') for p in capture),'usable sidecar in stopped artifacts')
 if repository:
  repository=Path(repository)
  for row in original_inventory:require(sha((repository/row['path']).read_bytes())==row['sha256'],'live product changed: '+row['path'])
  for row in dist_inventory:require(sha((repository/row['path']).read_bytes())==row['sha256'],'live artifact changed: '+row['path'])
  require(len([p for p in (repository/'packages/css/dist').rglob('*') if p.is_file()])==181,'live artifact count')
  for name in candidate:
   if name not in original:require(not (repository/name).exists(),'owned candidate file still live')
 return {'status':'verified-stopped-runtime-provenance','owners':20,'javascriptArtifacts':105,'unchangedBaselineArtifacts':181,'ordinarySources':62,'auditRows':59,'ordinaryGraphDifferences':0,'toolingGraphDifferences':7,'repositoryProductFilesVerified':948 if repository else None,'repositoryArtifactsVerified':181 if repository else None,'platformAndPerformance':'not-run'}
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--repository');args=parser.parse_args();print(json.dumps(verify(Path(__file__).parent,args.repository)))
