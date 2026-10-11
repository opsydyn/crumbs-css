import json,subprocess,time
from pathlib import Path
root=Path(__file__).parent
repo=Path('/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css')
base=[str(repo/'.superpowers/tools/m11-3-native/idb/venv/bin/idb'),'--companion',str(root/'idb.sock')]
def read(predicate=lambda a: True,name='ios-current'):
 deadline=time.monotonic()+10
 while True:
  raw=subprocess.check_output(base+['ui','describe-all','--api','axbridge','--json']); nodes=json.loads(raw)
  if predicate(nodes): (root/(name+'.json')).write_bytes(raw);return nodes
  if time.monotonic()>deadline: (root/(name+'-failed.json')).write_bytes(raw);raise AssertionError(name)
  time.sleep(.25)
def tap(nodes,label,trait=None):
 candidates=[x for x in nodes if x.get('AXLabel')==label and (trait is None or trait in x.get('traits',[])) and x.get('frame',{}).get('width',0)>0 and 0<=x.get('frame',{}).get('y',-1)<860]
 assert candidates, 'No visible '+label
 b=candidates[0];f=b['frame'];subprocess.run(base+['ui','tap',str(round(f['x']+f['width']/2)),str(round(f['y']+f['height']/2))],check=True)
 with (root/'ios-taps.jsonl').open('a') as out:out.write(json.dumps({'label':label,'frame':f})+'\n')
def labels(a):return [(x.get('AXLabel'),x.get('type'),x.get('frame')) for x in a if x.get('AXLabel') and not x['AXLabel'].startswith(('M112','M113','M114','M115'))]
def has(a,label):return any(x.get('AXLabel')==label for x in a)
