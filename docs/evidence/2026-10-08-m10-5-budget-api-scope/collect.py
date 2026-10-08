import gzip, hashlib, io, json, subprocess, tarfile
from pathlib import Path
repo=Path('/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css')
root=Path('/private/tmp/crumbs-m105-budget-api-scope'); out=root/'packet';out.mkdir(exist_ok=True)
def sha(b):return hashlib.sha256(b).hexdigest()
def read(p):return json.loads(p.read_text())
def git(*args):return subprocess.check_output(['git',*args],cwd=repo)
def emit(name,v): (out/name).write_text(json.dumps(v,indent=2)+'\n')
def archive(cohort):
 b=io.BytesIO()
 with tarfile.open(fileobj=b,mode='w') as a:
  for p in sorted((root/cohort).rglob('*')):
   if p.is_file() and 'node_modules' not in p.parts:
    data=p.read_bytes();info=tarfile.TarInfo(p.relative_to(root/cohort).as_posix());info.size=len(data);a.addfile(info,io.BytesIO(data))
 (out/(cohort+'-package.tar.gz')).write_bytes(gzip.compress(b.getvalue(),mtime=0))
for c in ['baseline','baseline-minified']:archive(c)
base='fefdf2aa84b2d2cd607ffa5cfc41919d6f59ba3e';admitted='8130d1a3504973efdc451b328faaa0784eb47897';current=git('rev-parse','HEAD').decode().strip()
paths=lambda ref:git('ls-tree','-r','--name-only',ref,'packages/css/src','packages/css/tsdown.config.ts','packages/css/build-policy.ts').decode().splitlines()
manifest=lambda ref:[{'file':p.removeprefix('packages/css/'),'sha256':sha(git('show',ref+':'+p))}for p in paths(ref)]
bm=manifest(base);am=manifest(admitted);cm=manifest(current);assert bm==am
for row in cm:assert sha((root/'current'/row['file']).read_bytes())==row['sha256']
features=[('M5.3','a080b7a','runtime Sprinkles lookup plans'),('M6.1','468c756','bounded native condition lifecycle'),('M6.2','6bf5c94','conditional value helpers'),('M6.3','1aa2638','native expression contract'),('M6.4','8140d80','expression evaluation runtime'),('M7.1','ba9b9ed','typed component recipe authoring'),('M7.1','5d6e7ff','component recipe token resolution'),('M7.2','863cff4','discriminated component states'),('M7.3','aca9f3d','public component contracts'),('M7.4','e9c1580','component recipe extensions'),('M7.4','f77b0b9','extension permission enforcement'),('M9.3','8f4e7a7','opt-in style explanation entry'),('M10.5','91892df','focused recipe and Sprinkles runtime entries')]
history=[]
for roadmap,ref,capability in features:
 full=git('rev-parse',ref).decode().strip()
 subprocess.run(['git','merge-base','--is-ancestor',base,full],cwd=repo,check=True)
 subprocess.run(['git','merge-base','--is-ancestor',full,current],cwd=repo,check=True)
 history.append({'roadmap':roadmap,'revision':full,'capability':capability,'subject':git('show','-s','--format=%s',full).decode().strip(),'changedSourceFiles':git('diff-tree','--no-commit-id','--name-only','-r',full,'--','packages/css/src','packages/css/tsdown.config.ts').decode().splitlines()})
emit('sources.json',{'baselineRevision':base,'admissionRevision':admitted,'currentRevision':current,'baselineAdmissionSourceAndConfigEqual':True,'scope':'all packages/css/src plus build-policy.ts and tsdown.config.ts; not whole repository equality','baseline':bm,'admission':am,'current':cm,'featureHistory':history,'shippingIdentity':{'sha256':'8fe7d6c28c26c9d4214549790d504c62f87c24f6886d7da40e031dd7e9fb4a76','files':694}})
for name in ['graphs.json','exports.json']:(out/name).write_bytes((root/name).read_bytes())
admission=read(repo/'docs/evidence/2026-09-21-m4-6-runtime-byte-budget-admission/admission.json')
prior=read(repo/'docs/evidence/2026-10-08-m10-5-runtime-architecture-attribution/summary.json')
attribution=json.loads(gzip.decompress((repo/'docs/evidence/2026-10-08-m10-5-runtime-architecture-attribution/attribution.json.gz').read_bytes()))
graphs=read(out/'graphs.json')['graphs'];rows=read(out/'exports.json')['rows'];comparisons=[]
for entry in ['theme-core.mjs','theme-core.cjs','theme.mjs','theme.cjs']:
 g=lambda c:next(x for x in graphs if x['cohort']==c and x['entry']==entry)
 family='theme-core' if entry.startswith('theme-core') else 'theme';fmt='esm'if entry.endswith('mjs')else'cjs'
 a=admission['currentGraphs'][family][fmt];assert g('baseline')['bytes']==a['graphBytes']
 for item,old in zip(g('baseline')['artifacts'],a['artifacts']):assert Path(item['file']).name==old['file'] and item['bytes']==old['bytes'] and item['sha256']==old['sha256']
 p=next(x for x in prior['graphs']if x['entry']==entry);assert g('current')['bytes']==p['controlBytes']
 old=next(x['names']for x in rows if x['cohort']=='baseline'and x['entry']==entry);now=next(x['names']for x in rows if x['cohort']=='current'and x['entry']==entry)
 comparisons.append({'entry':entry,'ceiling':a['graphBytes'],'historicalBytes':g('baseline')['bytes'],'historicalMinifiedBytes':g('baseline-minified')['bytes'],'currentBytes':g('current')['bytes'],'currentMinifiedBytes':p['minifiedControlBytes'],'minifiedGrowthBytes':p['minifiedControlBytes']-g('baseline-minified')['bytes'],'minifiedGapBytes':p['minifiedControlBytes']-a['graphBytes'],'requiredMinifiedReductionPercent':(p['minifiedControlBytes']-a['graphBytes'])/p['minifiedControlBytes']*100,'baselineExports':len(old),'currentExports':len(now),'addedExports':sorted(set(now)-set(old)),'removedExports':sorted(set(old)-set(now)),'minifiedSourceOrigins':attribution['cohorts']['minified-control'][entry]['sourceBytes']})
emit('review.json',{'qualification':'diagnostic-only; historical and scope comparison, not release admission','baselineArtifactHashesMatchAdmission':True,'sourceIdentityUnchanged':True,'tools':{'node':'v24.15.0','bun':'1.4.2','tsdown':'0.21.10','target':'node22'},'comparisons':comparisons,'scopeLimits':['No per-feature marginal byte measurement','Source-origin spans are not removable byte estimates','Exports show namespace presence, not public type or behavioural parity','Current minification-only artifacts reuse the earlier independently verified attribution packet','No complete host, Metro, Hermes, native or physical-device qualification']})
for name in ['build.mjs','measure.ts','exports.mjs','collect.py']:(out/name).write_bytes((root/name).read_bytes())
refs=['docs/evidence/2026-09-21-m4-6-runtime-byte-budget-admission/admission.json','docs/evidence/2026-10-08-m10-5-consolidated-host-remediation/control-package.tar.gz','docs/evidence/2026-10-08-m10-5-runtime-architecture-attribution/attribution.json.gz','docs/evidence/2026-10-08-m10-5-runtime-architecture-attribution/mapped-artifacts.tar.gz','docs/evidence/2026-10-08-m10-5-runtime-architecture-attribution/summary.json','packages/css/bench/budgets.json']
emit('packet.json',{'format':'crumbs.m10.5.budget-api-scope-review','version':1,'qualification':'diagnostic-only','files':{p.name:sha(p.read_bytes())for p in sorted(out.iterdir())if p.is_file()and p.name!='packet.json'},'references':{p:sha((repo/p).read_bytes())for p in refs}})
print(json.dumps([{k:v for k,v in x.items()if k not in ['minifiedSourceOrigins','addedExports','removedExports']}for x in comparisons],indent=2))
