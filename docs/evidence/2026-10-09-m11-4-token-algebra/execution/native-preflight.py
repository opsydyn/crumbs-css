import json,hashlib,subprocess,os
from pathlib import Path
root=Path.cwd(); scratch=root/'.superpowers/sdd/2026-10-09-m11-4-token-algebra'
o=json.loads((root/'.superpowers/tools/m11-3-native/ownership.json').read_text()); o['schema']='crumbs.m11.4.native-ownership.v1';o['studyId']='crumbs-m114';o['idbInput']['socket']='/private/tmp/crumbs-m114-idb.sock';o['environment']['metroPorts']=[8875,8876]
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
for f in o['idbInput']['files']: assert sha(f['path'])==f['sha256'],f['path']
assert sha(o['assets']['androidApk'])==o['assets']['androidApkSha256']
env={**os.environ,'JAVA_HOME':o['tools']['javaHome']}
def run(cmd):
 p=subprocess.run(cmd,text=True,capture_output=True,env=env);assert p.returncode==0,p.stderr;return p.stdout.strip()+p.stderr.strip()
versions={}
for name,cmd in [('xcode',['xcodebuild','-version']),('adb',[o['tools']['adb'],'version']),('emulator',[o['tools']['emulator'],'-version']),('maestro',[o['tools']['maestro'],'--version']),('idb',[o['tools']['idb'],'help']),('java',[o['tools']['javaHome']+'/bin/java','-version'])]:versions[name]=run(cmd)
o['verifiedTools']=versions;o['verifiedToolHashes']={k:sha(o['tools'][k]) for k in ['adb','emulator','maestro','idb','idbCompanion']}
devices=json.loads(run(['xcrun','simctl','list','devices','available','-j']))
ios=next(d for a in devices['devices'].values() for d in a if d['udid']==o['devices']['ios']['id']);assert ios['name']=='Crumbs M11.3 Native Motion';assert ios['state']=='Shutdown'
o['originalDeviceStates']={'ios':ios,'android':run([o['tools']['adb'],'devices'])}
assert 'emulator-5570' not in o['originalDeviceStates']['android']
o['fontCapability']=run(['xcrun','simctl','help','ui']);assert 'content_size' in o['fontCapability']
(scratch/'ownership.json').write_text(json.dumps(o,indent=2)+'\n')
print(json.dumps({'versions':versions,'ios':ios,'android':o['originalDeviceStates']['android'],'idbBoundFiles':len(o['idbInput']['files'])},indent=2))
