from pathlib import Path
import subprocess,json,time,xml.etree.ElementTree as ET,re
ROOT=Path('/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css')
OUT=Path('/private/tmp/crumbs-m19g-storybook57-20261011')
ADB=ROOT/'.superpowers/tools/m11-3-native/sdk/platform-tools/adb'
def adb(*args):
 return subprocess.check_output([str(ADB),'-s','emulator-5570',*args],timeout=30)
def snap(name):
 adb('shell','uiautomator','dump','/sdcard/crumbs-m19g.xml')
 raw=adb('shell','cat','/sdcard/crumbs-m19g.xml')
 (OUT/f'{name}.xml').write_bytes(raw)
 nodes=[dict(n.attrib) for n in ET.fromstring(raw).iter('node')]
 return nodes
def label(n):return n.get('text','') or n.get('content-desc','')
def tap(n):
 x1,y1,x2,y2=map(int,re.findall(r'\d+',n['bounds']));x=(x1+x2)//2;y=(y1+y2)//2
 adb('shell','input','tap',str(x),str(y))
 with (OUT/'android-taps.jsonl').open('a') as f:f.write(json.dumps({'label':label(n),'bounds':n['bounds'],'tap':[x,y]})+'\n')
def shot(name):
 (OUT/f'{name}.png').write_bytes(adb('exec-out','screencap','-p'))
def find(nodes,value):
 ns=[n for n in nodes if label(n)==value];assert ns,(value,[label(n) for n in nodes if label(n)])
 return ns[0]
def wait_label(name,value,seconds=30):
 end=time.monotonic()+seconds
 while time.monotonic()<end:
  ns=snap(name)
  found=[n for n in ns if label(n)==value]
  if found:return ns
  time.sleep(.7)
 raise AssertionError(('Missing',value))
