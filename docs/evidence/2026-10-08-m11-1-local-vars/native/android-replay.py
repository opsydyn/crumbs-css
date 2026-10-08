import subprocess, pathlib, time, re, xml.etree.ElementTree as ET, json, hashlib
root=pathlib.Path('/private/tmp/crumbs-m111-native/android-final')
root.mkdir(exist_ok=True)
adb=['/private/tmp/crumbs-m105-native/sdk/platform-tools/adb','-s','emulator-5568']
def run(args): return subprocess.run(adb+args,check=True,capture_output=True).stdout
def dump():
 run(['shell','uiautomator','dump','/sdcard/m111-ui.xml'])
 raw=run(['shell','cat','/sdcard/m111-ui.xml'])
 return raw,list(ET.fromstring(raw).iter('node'))
def matches(node,label):return label in [node.get('text'),node.get('content-desc')]
def assert_labels(labels):
 until=time.monotonic()+90
 while time.monotonic()<until:
  raw,nodes=dump()
  if all(any(matches(n,label) for n in nodes) for label in labels): return raw,nodes
  time.sleep(1)
 raise RuntimeError('Missing native labels: '+repr(labels))
def tap(label):
 _,nodes=assert_labels([label])
 n=next(n for n in nodes if matches(n,label))
 x1,y1,x2,y2=map(int,re.findall(r'\d+',n.get('bounds')))
 run(['shell','input','tap',str((x1+x2)//2),str((y1+y2)//2)])
records=[]
def capture(phase,a):
 labels=['Literal sample: 1','Local card styling',a,'Card B: #c42f73 / 0.75']
 raw,_=assert_labels(labels)
 (root/(phase+'.xml')).write_bytes(raw)
 (root/(phase+'.png')).write_bytes(run(['exec-out','screencap','-p']))
 records.append({'phase':phase,'assertedLabels':labels,'status':'passed'})
 print(phase+' passed',flush=True)
run(['reverse','tcp:8121','tcp:8121'])
run(['shell','am','force-stop','host.exp.exponent'])
run(['shell','am','start','-a','android.intent.action.VIEW','-d','exp://127.0.0.1:8121','host.exp.exponent'])
capture('initial','Card A: #2457d6 / 0.25')
for phase,label,a in [('opacity','Change A opacity','Card A: #2457d6 / 0.5'),('accent-clear','Clear A accent','Card A: #16804a / 0.5'),('clear','Clear A','Card A: #16804a / 1'),('dark','Toggle local theme','Card A: #9a65de / 1'),('restored','Toggle local theme','Card A: #16804a / 1')]:
 tap(label);capture(phase,a)
focus=run(['shell','dumpsys','window','windows']).decode()
if 'host.exp.exponent' not in focus:raise RuntimeError('Wrong harness')
(root/'window.txt').write_text(focus)
files=[{'path':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(root.iterdir()) if p.is_file()]
(root/'receipt.json').write_text(json.dumps({'schema':'crumbs.m11.1.android-replay.v1','serial':'emulator-5568','uri':'exp://127.0.0.1:8121','driver':'adb UIAutomator hierarchy plus native input taps','phases':records,'files':files,'status':'passed'},indent=2)+'\n')
