import subprocess, json, time
from pathlib import Path
root=Path(__file__).parent
repo=Path('/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css')
idb=str(repo/'.superpowers/tools/m11-3-native/idb/venv/bin/idb')
base=[idb,'--companion',str(root/'idb.sock')]
def read(expected, name):
    deadline=time.monotonic()+5
    while True:
        raw=subprocess.check_output(base+['ui','describe-all','--json'])
        attrs=json.loads(raw)
        if any(x.get('AXLabel')==f'Actions: {expected}' for x in attrs):
            (root/(name+'-hierarchy.json')).write_bytes(raw)
            return attrs
        if time.monotonic()>deadline: raise AssertionError(f'Expected Actions: {expected}; observed {attrs}')
        time.sleep(.2)
observations=[]
a=read(0,'before')
for label, count in [('Continue',1),('Preview',2)]:
    button=next(x for x in a if x.get('AXLabel')==label)
    assert button['enabled'] and 'Button' in button['traits']
    frame=button['frame']; x=frame['x']+frame['width']/2; y=frame['y']+frame['height']/2
    assert frame['width']>0 and frame['height']>=48 and y<874
    subprocess.check_call(base+['ui','tap',str(round(x)),str(round(y))])
    a=read(count,'after-'+str(count))
    observations.append({'label':label,'role':'button','frame':frame,'observedActions':count})
subprocess.check_call(['xcrun','simctl','io','BE55F761-6CDB-4FD9-A314-ABD96A0EA3B0','screenshot',str(root/'after.png')])
(root/'native-observations.json').write_text(json.dumps({'platform':'ios','runtime':'iOS 26.4','simulator':'BE55F761-6CDB-4FD9-A314-ABD96A0EA3B0','initialActions':0,'actions':observations,'status':'passed','evidence':'actual native accessibility hierarchy plus idb-delivered taps; no spoken-reader or performance claim'},indent=2)+'\n')
print('Native ActionCard actions 0 -> 1 -> 2 passed')
