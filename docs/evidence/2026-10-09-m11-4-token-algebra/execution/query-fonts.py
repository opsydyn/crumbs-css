import json,os,subprocess,time
from pathlib import Path
s=Path('.superpowers/sdd/2026-10-09-m11-4-token-algebra');o=json.loads((s/'ownership.json').read_text());env={**os.environ,'JAVA_HOME':o['tools']['javaHome'],'ANDROID_HOME':o['tools']['sdk'],'ANDROID_SDK_ROOT':o['tools']['sdk'],'ANDROID_AVD_HOME':o['devices']['android']['avdHome']}
def run(c):
 p=subprocess.run(c,capture_output=True,text=True,env=env);assert p.returncode==0,p.stderr;return p.stdout.strip()
ios=o['devices']['ios']['id'];adb=o['tools']['adb'];serial=o['devices']['android']['id']
run(['xcrun','simctl','boot',ios]);run(['xcrun','simctl','bootstatus',ios,'-b'])
log=open(s/'android-boot.log','w');p=subprocess.Popen([o['tools']['emulator'],'-avd',o['devices']['android']['avdName'],'-port','5570','-no-snapshot-save','-no-audio','-no-boot-anim','-memory','2048','-cores','2','-gpu','swangle'],stdout=log,stderr=log,env=env,start_new_session=True)
o['preflightOwnedProcess']={'pid':p.pid,'command':'emulator crumbs_m113 port5570'};(s/'ownership.json').write_text(json.dumps(o,indent=2)+'\n')
start=time.monotonic()
while time.monotonic()-start<180:
 probe=subprocess.run([adb,'-s',serial,'shell','getprop','sys.boot_completed'],text=True,capture_output=True,env=env)
 if probe.stdout.strip()=='1':break
 time.sleep(2)
else:raise RuntimeError('Owned Android not ready')
assert run([adb,'-s',serial,'emu','avd','name']).splitlines()[0]==o['devices']['android']['avdName']
o['originalFontPreferences']={'ios':run(['xcrun','simctl','ui',ios,'content_size']),'android':run([adb,'-s',serial,'shell','settings','get','system','font_scale'])}
assert o['originalFontPreferences']['ios'] in ['extra-small','small','medium','large','extra-large','extra-extra-large','extra-extra-extra-large','accessibility-medium','accessibility-large','accessibility-extra-large','accessibility-extra-extra-large','accessibility-extra-extra-extra-large']
assert o['originalFontPreferences']['android']=='null' or float(o['originalFontPreferences']['android'])>0
(s/'ownership.json').write_text(json.dumps(o,indent=2)+'\n');print(o['originalFontPreferences'])
