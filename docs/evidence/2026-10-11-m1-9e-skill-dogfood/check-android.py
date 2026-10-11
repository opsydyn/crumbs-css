import subprocess,json,re,time,xml.etree.ElementTree as E
from pathlib import Path
root=Path(__file__).parent
adb='/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css/.superpowers/tools/m11-3-native/sdk/platform-tools/adb'
base=[adb,'-s','emulator-5570']
def run(*args): return subprocess.check_output(base+list(args))
assert run('emu','avd','name').decode().splitlines()[0]=='crumbs_m113'
assert run('shell','getprop','sys.boot_completed').strip()==b'1'
def read(expected,name):
    deadline=time.monotonic()+10
    while True:
        run('shell','uiautomator','dump','/sdcard/crumbs-m19e.xml')
        raw=run('shell','cat','/sdcard/crumbs-m19e.xml')
        nodes=[x.attrib for x in E.fromstring(raw).iter('node')]
        if any(x.get('text')==f'Actions: {expected}' for x in nodes):
            (root/(name+'.xml')).write_bytes(raw);return nodes
        if time.monotonic()>deadline: raise AssertionError(f'Expected Actions: {expected}; observed {nodes}')
        time.sleep(.2)
a=read(0,'android-before');observations=[]
for label,count in [('Continue',1),('Preview',2)]:
    b=next(x for x in a if x.get('content-desc')==label and x.get('class')=='android.widget.Button')
    assert b['enabled']=='true' and b['clickable']=='true'
    x1,y1,x2,y2=map(int,re.fullmatch(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]',b['bounds']).groups())
    assert x2>x1 and y2>y1
    run('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2))
    a=read(count,'android-after-'+str(count))
    observations.append({'label':label,'role':'android.widget.Button','bounds':b['bounds'],'observedActions':count})
(root/'android-after.png').write_bytes(run('exec-out','screencap','-p'))
report={'status':'passed','platform':'android','emulator':'emulator-5570','avd':'crumbs_m113','readOnly':True,'apiLevel':run('shell','getprop','ro.build.version.sdk').decode().strip(),'displayDensity':run('shell','wm','density').decode().strip(),'initialActions':0,'actions':observations,'evidence':'real uiautomator hierarchy plus adb input taps; no screen-reader or performance claim'}
(root/'android-observations.json').write_text(json.dumps(report,indent=2)+'\n')
print('Android ActionCard actions 0 -> 1 -> 2 passed')
