import subprocess,json,re,time,xml.etree.ElementTree as E
from pathlib import Path
root=Path(__file__).parent
base=['/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css/.superpowers/tools/m11-3-native/sdk/platform-tools/adb','-s','emulator-5570']
def run(*args):return subprocess.check_output(base+list(args))
assert run('emu','avd','name').decode().splitlines()[0]=='crumbs_m113'
assert run('shell','getprop','sys.boot_completed').strip()==b'1'
def read(predicate,name):
 deadline=time.monotonic()+10
 while True:
  run('shell','uiautomator','dump','/sdcard/crumbs-m19f.xml');raw=run('shell','cat','/sdcard/crumbs-m19f.xml');nodes=[x.attrib for x in E.fromstring(raw).iter('node')]
  if predicate(nodes):(root/(name+'.xml')).write_bytes(raw);return nodes
  if time.monotonic()>deadline:raise AssertionError(f'Native condition failed: {name}; {nodes}')
  time.sleep(.2)
def tap(nodes,label):
 b=next(x for x in nodes if x.get('content-desc')==label and x.get('class')=='android.widget.Button')
 assert b['enabled']=='true' and b['clickable']=='true'
 x1,y1,x2,y2=map(int,re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]',b['bounds']).groups());assert x2>x1 and y2>y1 and y2<=2400
 run('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));return {'label':label,'bounds':b['bounds']}
def telemetry(nodes):return next((json.loads(x['content-desc'][5:]) for x in nodes if x.get('content-desc','').startswith('M115:')),None)
a=read(lambda a:any(x.get('content-desc')=='Runtime extensions' for x in a),'android-home');tap(a,'Runtime extensions')
a=read(lambda a:(t:=telemetry(a)) is not None and t['actions']=={'generated':0,'control':0},'android-extensions-before')
(root/'android-extensions-before.png').write_bytes(run('exec-out','screencap','-p'));obs=[]
for label,expected in [('generated action',{'generated':1,'control':0}),('control action',{'generated':1,'control':1})]:
 action=tap(a,label);a=read(lambda a:(t:=telemetry(a)) is not None and t['actions']==expected,'android-'+label.replace(' ','-'));action['actions']=telemetry(a)['actions'];obs.append(action)
for label,field,value in [('literal','mode','themed'),('light','theme','dark'),('blue','foundation','red')]:
 action=tap(a,label);a=read(lambda a:(t:=telemetry(a)) is not None and t['selection'][field]==value,'android-'+field+'-after');t=telemetry(a)
 assert t['generated']['backgroundColor']==t['control']['backgroundColor'];assert t['actions']=={'generated':1,'control':1};assert t['counts']['factories']==4
 action['selection']=t['selection'];action['backgroundColor']=t['generated']['backgroundColor'];obs.append(action)
(root/'android-extensions-after.png').write_bytes(run('exec-out','screencap','-p'));journeys=[]
for label in ['List','Form','Scopes','Measure','Gradients','Token styles','Local styles','Container conditions','Native motion','Token algebra','Runtime extensions']:
 tap(a,label);a=read(lambda a:any(x.get('content-desc')==label and x.get('selected')=='true' for x in a),'android-journey-'+label.lower().replace(' ','-'));journeys.append(label)
(root/'android-observations.json').write_text(json.dumps({'status':'passed','platform':'android','avd':'crumbs_m113','serial':'emulator-5570','readOnly':True,'apiLevel':run('shell','getprop','ro.build.version.sdk').decode().strip(),'expoGo':'57.0.9','mode':'workspace','callbacks':obs,'journeysMounted':journeys,'scope':'native startup, journey switching, callback/state/theme smoke; no spoken reader, HMR or release performance acceptance'},indent=2)+'\n')
print('SDK57 Android: native callbacks, themed/red factory state, and 11 journey switches passed')
