import pathlib,subprocess,json
p=pathlib.Path('/private/tmp/crumbs-m105-root-cause-20261018'); rows=[]
for pair in range(1,6):
 combos=[('historical','historical'),('historical','current'),('current','historical'),('current','current')]
 if pair%2==0:combos.reverse()
 for pipe,author in combos:
  out=p/f'factorial-{pair}-{pipe}-{author}.json';cmd=['/Users/alancurrie/.bun/bin/bun',str(p/'factorial.cjs'),str(p/author/'packages/css'),'profile',str(pair),str(out),str(p/pipe/'packages/css')]
  r=subprocess.run(cmd,capture_output=True,text=True);rows.append({'pipeline':pipe,'authoring':author,'pair':pair,'command':cmd,'exit':r.returncode,'stderr':r.stderr});print(pair,pipe,author,r.returncode,flush=True)
  if r.returncode:print(r.stderr);break
(p/'factorial-commands.json').write_text(json.dumps(rows,indent=2))
