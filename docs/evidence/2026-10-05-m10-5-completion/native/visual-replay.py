import pathlib,sys,subprocess,time,json,hashlib
from PIL import Image,ImageChops
OUT=pathlib.Path(sys.argv[1]);OUT.mkdir(parents=True,exist_ok=True)
ADB='/private/tmp/crumbs-m105-native/sdk/platform-tools/adb';UDID='C9F4ABB3-64F0-44AD-9021-879CD209BDBA'
def capture(platform,pass_):
 p=OUT/(platform+'-'+str(pass_)+'.png')
 if platform=='android':p.write_bytes(subprocess.check_output([ADB,'-s','emulator-5554','exec-out','screencap','-p']))
 else:subprocess.run(['xcrun','simctl','io',UDID,'screenshot',str(p)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 return p
r=[]
for platform in ['ios','android']:
 a=capture(platform,1);time.sleep(1);b=capture(platform,2);x=Image.open(a).convert('RGB');y=Image.open(b).convert('RGB');box=(int(x.width*.1),int(x.height*.2),int(x.width*.9),int(x.height*.85));d=ImageChops.difference(x.crop(box),y.crop(box));n=sum(any(v) for v in d.getdata());r.append({'platform':platform,'baseline':a.name,'replay':b.name,'baselineHash':hashlib.sha256(a.read_bytes()).hexdigest(),'replayHash':hashlib.sha256(b.read_bytes()).hexdigest(),'roi':box,'differentPixels':n,'totalPixels':d.width*d.height,'status':'passed' if n==0 else 'failed'})
report={'scope':'Same running native viewport, no intervening edits/actions; body ROI fixed at10-90% width,20-85% height; zero different RGB pixels required. Bounded repeatability, not exhaustive recipe screenshot coverage, cross-platform equivalence or HMR local-animation state preservation.','comparisons':r};(OUT/'screenshot-diff.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report));sys.exit(0 if all(x['status']=='passed' for x in r) else 1)
