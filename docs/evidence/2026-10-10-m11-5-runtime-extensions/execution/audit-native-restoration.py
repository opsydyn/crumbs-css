from pathlib import Path
import json,subprocess,datetime
r=Path.cwd();e=r/'docs/evidence/2026-10-10-m11-5-runtime-extensions';o=json.loads((e/'execution/ownership.json').read_text());n=json.loads((e/'native/qualification.json').read_text());checks=[]
def run(name,args,accepted=(0,)):
 p=subprocess.run(args,capture_output=True,text=True);assert p.returncode in accepted,(name,p.stderr);checks.append({'name':name,'command':args,'exitCode':p.returncode,'stdout':p.stdout,'stderr':p.stderr});return p.stdout
states=json.loads(run('simulator-state',['xcrun','simctl','list','devices','available','-j']));owned=[d for ds in states['devices'].values() for d in ds if d['udid']==o['devices']['ios']['id']];assert len(owned)==1 and owned[0]['state']=='Shutdown'
adb=run('android-state',[o['tools']['adb'],'devices']);assert o['devices']['android']['id'] not in adb
for port in [8885,8886]:assert not run('port-'+str(port),['lsof','-nP','-iTCP:'+str(port),'-sTCP:LISTEN'],(1,)).strip()
assert not Path(o['idbInput']['socket']).exists()
for platform in ['ios','android']:
 f=n[platform+'FontProof'];assert f['originalPreference']==n['originalPreferences'][platform]==f['restoredPreference'];assert f['original']['nativeFontScale']==f['restored']['nativeFontScale']
assert n['ios']==n['android']==n['acceptance']=='passed' and all(c['status']=='passed' for c in n['cleanup'])
(e/'native/post-run-audit.json').write_text(json.dumps({'schema':'crumbs.m11.5.native-restoration-audit.v1','checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks,'fontPreferences':'Exact captured original/restored preferences and native text scale agree','idbSocketAbsent':True,'allPassed':True},indent=2)+'\n')
print('Owned Simulator/Android shutdown, ports/socket absent and native preferences restored')
