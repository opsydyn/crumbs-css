import subprocess, pathlib, xml.etree.ElementTree as E, re, json, time, hashlib,sys
ADB='/private/tmp/crumbs-m105-native/sdk/platform-tools/adb'; OUT=pathlib.Path(sys.argv[1]); OUT.mkdir(parents=True,exist_ok=True)
rows=[]
def adb(*args):return subprocess.check_output([ADB,'-s','emulator-5554',*args])
def tree(name):
 adb('shell','uiautomator','dump','/sdcard/crumbs-m105-final.xml'); data=adb('shell','cat','/sdcard/crumbs-m105-final.xml'); (OUT/(name+'.xml')).write_bytes(data);return E.fromstring(data)
def nodes(t,label):return [n for n in t.iter('node') if label in [n.get('text'),n.get('content-desc')]]
def capture(name):
 t=tree(name); png=adb('exec-out','screencap','-p');(OUT/(name+'.png')).write_bytes(png);rows.append({'capture':name,'sha256':hashlib.sha256(png).hexdigest(),'labels':[{'text':n.get('text'),'label':n.get('content-desc'),'bounds':n.get('bounds'),'clickable':n.get('clickable'),'enabled':n.get('enabled'),'selected':n.get('selected')} for n in t.iter('node') if n.get('text') or n.get('content-desc')]});(OUT/'observations.json').write_text(json.dumps(rows,indent=2)+'\n');return t
def tap(label,left=False):
 t=tree('before-'+re.sub('[^a-zA-Z]','-',label));c=[n for n in t.iter('node') if n.get('clickable')=='true' and (n.get('content-desc')==label or any(v.get('text')==label for v in n.iter('node')))];assert c, 'No observed clickable '+label
 a,b,c,d=map(int,re.findall(r'\d+',c[0].get('bounds')));assert d>b and c>a;adb('shell','input','tap',str(a+max(5,(c-a)//4) if left else (a+c)//2),str((b+d)//2));time.sleep(.6)
def assert_label(t,label):assert nodes(t,label),'Missing '+label
for attempt in range(20):
 ready=tree('readiness-'+str(attempt))
 if nodes(ready,'STORYBOOK THEME'):break
 time.sleep(1)
else:raise Exception('Owned Storybook app not ready; no interactions dispatched')
if sys.argv[2]=='reference':
 t=capture('android-dark');assert_label(t,'Save changes');tap('LIGHT',True);capture('android-light');tap('Save changes');t=capture('android-light-action');assert_label(t,'Primary action selected.');tap('DARK');t=capture('android-dark-action');assert_label(t,'Primary action selected.')
elif sys.argv[2]=='conditions':
 for i in range(14):
  t=tree('scroll-'+str(i))
  if nodes(t,'Preview RTL layout'):break
  adb('shell','input','swipe','600','1660','600','540','350')
 else:raise Exception('Conditions control not reached')
 capture('android-conditions-ltr');tap('Preview RTL layout');t=capture('android-conditions-rtl');assert_label(t,'Native condition direction: RTL');tap('Preview LTR layout');capture('android-conditions-restored')

if sys.argv[2]=='settings':
 for i in range(18):
  t=tree('settings-scroll-'+str(i));texts=[n.get('text','') for n in t.iter('node')]
  if any('Current scale: 1.30' in s for s in texts):break
  adb('shell','input','swipe','600','1660','600','540','350')
 else:raise Exception('Scaled font context not reached')
 capture('android-font-scale-1-30')
 for i in range(8):
  t=tree('motion-scroll-'+str(i));texts=[n.get('text','') for n in t.iter('node')]
  if 'Native preference: reduced' in texts and 'Native condition: more' in texts:break
  adb('shell','input','swipe','600','1600','600','700','350')
 else:raise Exception('Reduced motion / more contrast context not reached')
 capture('android-reduced-motion-more-contrast')
 print('SETTINGS_PASSED')

print(json.dumps({'status':'passed','captures':len(rows),'output':str(OUT)}))
