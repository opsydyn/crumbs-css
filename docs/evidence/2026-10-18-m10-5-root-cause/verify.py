#!/usr/bin/env python3
"""Offline evidence derivation, not production or timing qualification."""
from pathlib import Path
import json,gzip,math,hashlib,copy,re,sys
P=Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
def require(ok,message):
 if not ok:raise ValueError(message)
def q(values):
 require(bool(values),'empty samples');return sorted(values)[math.ceil(len(values)*.5)-1]
def cohort_rows(d):
 ev=d['events'];require(len(ev)==16,'incomplete cohort')
 for label in ['README','consumer']:
  require(sorted(e.get('i',e.get('sample'))for e in ev if e['label']==label)==list(range(-2,6)),'wrong sample set')
  for e in ev:require(math.isfinite(e['end']-e['start'])and e['end']>e['start'],'invalid timing')
 return {label:[e for e in ev if e['label']==label and e.get('i',e.get('sample'))>=0]for label in ['README','consumer']}
def derive(raw):
 factorial=[]
 for pipe in ['historical','current']:
  for author in ['historical','current']:
   for label in ['README','consumer']:
    totals=[];compiles=[];remainders=[]
    for pair in range(1,6):
     rows=cohort_rows(raw[f'factorial-{pair}-{pipe}-{author}.json'])[label]
     totals.append(q([e['end']-e['start']for e in rows]));compiles.append(q([sum(c['end']-c['start']for c in e['compiles'])for e in rows]));remainders.append(q([e['end']-e['start']-sum(c['end']-c['start']for c in e['compiles'])for e in rows]))
     for e in rows:
      require(len(e['compiles'])==len(e['builds'])==1,'unexpected repeated warm build')
      inputs=e['builds'][0]['inputs'];package=[f for f in inputs if f['category']=='crumbs-dist'];require(len(package)==(3 if author=='historical'else 8),'graph size mismatch');require(sum(f['bytes']for f in package)==(11799 if author=='historical'else 78679),'graph byte mismatch');require(len([f for f in inputs if f['category']=='authored'])==2,'authored inputs changed')
    factorial.append({'pipeline':pipe,'authoring':author,'fixture':label,'fullMs':q(totals),'compileMs':q(compiles),'remainderMs':q(remainders)})
 envelope=[]
 for variant in ['control','memo']:
  selectors=[]
  for pair in range(1,6):
   d=raw[f'text-v2-{pair}-{variant}.json'];rows=cohort_rows(d)
   selectors.append(max(q([e['end']-e['start']for e in r])for r in rows.values()))
   if variant=='memo':
    control=raw[f'text-v2-{pair}-control.json']
    require([(e['label'],e['i'],e['outputSha'])for e in d['events']]==[(e['label'],e['i'],e['outputSha'])for e in control['events']],'memo output mismatch')
    for r in rows.values():require(all(e['hits']==1 and e['misses']==0 for e in r),'warm memo not a hit')
    for label in rows:require(next(e for e in d['events']if e['label']==label and e['i']==-2)['misses']==2,'missing fresh discovery confirmation')
  envelope.append({'variant':variant,'selectorMs':q(selectors),'rangeMs':[min(selectors),max(selectors)]})
 for key in ['effect-control.json','effect-memo.json','mutations-control.json','mutations-memo.json']:
  require(len(raw[key]['events'])==8,'missing control rows')
  for e in raw[key]['events']:require(sha(e['code'].encode())==e['outputSha'],'code receipt mismatch')
 effect=[raw[f'effect-{v}.json']['events']for v in ['control','memo']]
 require([e['outputSha']for e in effect[0]]==[e['outputSha']for e in effect[1]],'fresh execution mismatch');require(len(set(e['outputSha']for e in effect[1]))==8,'ambient change hidden')
 for group in effect:
  require([int(re.search(r'"width":(\d+)',e['code'])[1])for e in group]==list(range(18,26)),'wrong ambient widths')
 mutations=[raw[f'mutations-{v}.json']['events']for v in ['control','memo']]
 widths=[[int(re.search(r'"width":(\d+)',e['code'])[1])for e in group]for group in mutations]
 require(widths==[[11,11,12,11,11,22,22,11],[11,11,12,11,11,11,11,11]],'expected stale-resolution failure missing')
 require(all(mutations[1][i]['hits']==1 for i in [5,6]),'negative control did not hit memo')
 return {'historicalFactorial':factorial,'textEnvelope':envelope,'freshAuthoringEffectRows':8,'knownInputEditRestoreObserved':True,'higherPriorityCandidateControl':'stale-output-reproduced','productionEligible':False,'releaseQualified':False}
def main():
 manifest=P/'files.json'
 require(manifest.is_file(),'required integrity manifest missing')
 for f in json.loads(manifest.read_text()):require(sha((P/f['path']).read_bytes())==f['sha256'],'packet hash mismatch: '+f['path'])
 raw=json.loads(gzip.decompress((P/'raw.json.gz').read_bytes()));result=derive(raw)
 inventory=json.loads(gzip.decompress((P/'build-inventory.json.gz').read_bytes()));inputRows=0
 for key,d in raw.items():
  if not key.startswith('factorial-') or not key.endswith('.json') or not isinstance(d,dict) or 'events'not in d:continue
  author=key.removesuffix('.json').split('-')[-1];files={f['path']:f for f in inventory[author]['files']}
  for e in d['events']:
   for build in e['builds']:
    for item in build['inputs']:
     import os
     relative=os.path.relpath(os.path.normpath(os.path.join(e['cwd'],item['file'])),d['root']);file=files['packages/css/'+relative]
     require(file['sha256']==item['sha256'],'input/source inventory mismatch');inputRows+=item['category']=='crumbs-dist'
 require(inputRows==1870,'incomplete dist input bindings');result['boundDistInputRows']=inputRows
 parity=json.loads((P/'current-build-parity.json').read_text());require(len(parity['files'])==105 and parity['all105Match'],'current artifact parity missing')
 currentFiles={f['path']:f for f in inventory['current']['files']}
 for f in parity['files']:require(f['matchesOriginal']and f['sha256']==currentFiles['packages/css/dist/'+f['path']]['sha256'],'current build binding mismatch')
 for v in ['control','memo']:require((P/f'effect-{v}.log').read_text()==''.join(str(n)+'\n'for n in range(18,26)),'effect count mismatch')
 require(all(r['identical']for r in json.loads((P/'fixture-parity.json').read_text()).values()),'fixture drift')
 status=json.loads((P/'status.json').read_text());require(all(status[k]is False for k in ['productionChanged','prototypeAdmitted','completeResolutionProof','compilerLifetimeContractApproved','releaseGatePassed','publicationAuthorized']),'false qualification')
 if '--self-test' in sys.argv:
  for kind in ['output','discovery','negative-control']:
   bad=copy.deepcopy(raw)
   if kind=='output':bad['text-v2-1-memo.json']['events'][2]['outputSha']='0'*64
   elif kind=='discovery':bad['text-v2-1-memo.json']['events'][0]['misses']=1
   else:
    e=bad['mutations-memo.json']['events'][5];e['code']=e['code'].replace('"width":11','"width":22');e['outputSha']=sha(e['code'].encode())
   try:derive(bad)
   except ValueError:pass
   else:raise ValueError('negative verifier self-test accepted: '+kind)
  result['semanticVerifierControls']=3
 print(json.dumps(result,indent=2))
if __name__=='__main__':main()
