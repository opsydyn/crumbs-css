import pathlib,sys,subprocess,time,json,hashlib
from PIL import Image
ROOT=pathlib.Path(sys.argv[1]);OUT=pathlib.Path(sys.argv[2]);OUT.mkdir(parents=True,exist_ok=True)
FILE=ROOT/'apps/storybook/src/components/NativeAccessibilityContexts.css.ts';original=FILE.read_bytes(); patched=original.replace(b'backgroundColor: vars.color.panel,',b'backgroundColor: "#00ff73",',1);assert patched!=original
ADB='/private/tmp/crumbs-m105-native/sdk/platform-tools/adb';UDID='1A3F4713-3D35-4CD7-9240-466D87DFAB99'
def capture(platform,name):
 p=OUT/(platform+'-'+name+'.png')
 if platform=='android':p.write_bytes(subprocess.check_output([ADB,'-s','emulator-5554','exec-out','screencap','-p']))
 else:subprocess.run(['xcrun','simctl','io',UDID,'screenshot',str(p)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 img=Image.open(p).convert('RGB');count=sum(1 for r,g,b in img.getdata() if r<4 and g>250 and 110<b<120)
 return {'path':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'probePixels':count,'width':img.width,'height':img.height}
report={'scope':'Shipping Metro development Fast Refresh, same running app instances, authored CSS background change and restoration. No reload commanded. No device performance claim.','sourcePath':str(FILE.relative_to(ROOT)),'originalHash':hashlib.sha256(original).hexdigest(),'patchedHash':hashlib.sha256(patched).hexdigest(),'platforms':{p:{'before':capture(p,'before')} for p in ['ios','android']}}
try:
 FILE.write_bytes(patched)
 for attempt in range(25):
  for p,row in report['platforms'].items():
   if 'changed' not in row:
    frame=capture(p,'changed')
    if frame['probePixels']>1000:row['changed']=frame
  if all('changed' in r for r in report['platforms'].values()):break
  time.sleep(1)
finally:
 FILE.write_bytes(original);report['sourceRestored']=FILE.read_bytes()==original
 for attempt in range(25):
  for p,row in report['platforms'].items():
   if 'restored' not in row:
    frame=capture(p,'restored')
    if frame['probePixels']==row['before']['probePixels']:row['restored']=frame
  if all('restored' in r for r in report['platforms'].values()):break
  time.sleep(1)
report['status']='passed' if report['sourceRestored'] and all('changed' in r and 'restored' in r for r in report['platforms'].values()) else 'failed'
(OUT/'observations.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2));sys.exit(0 if report['status']=='passed' else 1)
