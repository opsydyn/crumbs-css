import json, subprocess, time
from pathlib import Path
root=Path(__file__).parent
repo=Path('/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css')
base=[str(repo/'.superpowers/tools/m11-3-native/idb/venv/bin/idb'),'--companion',str(root/'idb.sock')]
udid=json.loads((root/'native-ownership.json').read_text())['simulator']
def read(predicate,name):
 deadline=time.monotonic()+8
 while True:
  raw=subprocess.check_output(base+['ui','describe-all','--json']); nodes=json.loads(raw)
  if predicate(nodes):
   (root/(name+'.json')).write_bytes(raw); return nodes
  if time.monotonic()>deadline: raise AssertionError(f'Native condition failed: {name}; {nodes}')
  time.sleep(.2)
def tap(nodes,label):
 b=next(x for x in nodes if x.get('AXLabel')==label and 'Button' in x.get('traits',[]))
 assert b['enabled']; f=b['frame']; assert f['width']>0 and 0<f['y']<874
 subprocess.check_call(base+['ui','tap',str(round(f['x']+f['width']/2)),str(round(f['y']+f['height']/2))])
 return {'label':label,'frame':f}
def telemetry(nodes):
 return next((json.loads(x['AXLabel'][5:]) for x in nodes if x.get('AXLabel','').startswith('M115:')),None)
obs=[]
a=read(lambda a: (t:=telemetry(a)) is not None and t['actions']=={'generated':0,'control':0},'ios-extensions-before')
subprocess.check_call(['xcrun','simctl','io',udid,'screenshot',str(root/'ios-extensions-before.png')])
for label,expected in [('generated action',{'generated':1,'control':0}),('control action',{'generated':1,'control':1})]:
 action=tap(a,label);a=read(lambda a: (t:=telemetry(a)) is not None and t['actions']==expected,'ios-'+label.replace(' ','-')); action['actions']=telemetry(a)['actions'];obs.append(action)
for label,field,value in [('literal','mode','themed'),('light','theme','dark'),('blue','foundation','red')]:
 action=tap(a,label);a=read(lambda a: (t:=telemetry(a)) is not None and t['selection'][field]==value,'ios-'+field+'-after');t=telemetry(a)
 assert t['generated']['backgroundColor']==t['control']['backgroundColor'];assert t['actions']=={'generated':1,'control':1};assert t['counts']['factories']==4
 action['selection']=t['selection'];action['backgroundColor']=t['generated']['backgroundColor'];obs.append(action)
subprocess.check_call(['xcrun','simctl','io',udid,'screenshot',str(root/'ios-extensions-after.png')])
journeys=[]
for label in ['List','Form','Scopes','Measure','Gradients','Token styles','Local styles','Container conditions','Native motion','Token algebra','Runtime extensions']:
 tap(a,label);a=read(lambda a: any(x.get('AXLabel')==label and 'Selected' in x.get('traits',[]) for x in a),'ios-journey-'+label.lower().replace(' ','-')); journeys.append(label)
(root/'ios-observations.json').write_text(json.dumps({'status':'passed','platform':'ios','simulator':udid,'runtime':'iOS 26.4','expoGo':'57.0.9','mode':'workspace','callbacks':obs,'journeysMounted':journeys,'scope':'native startup, mounted journeys, factory callback/state/theme smoke; no spoken reader, HMR or release performance acceptance'},indent=2)+'\n')
print('SDK57 iOS: native callbacks, themed/red factory state, and 11 journey mounts passed')
