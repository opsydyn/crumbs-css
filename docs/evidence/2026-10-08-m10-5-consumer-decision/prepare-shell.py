import pathlib,shutil,plistlib,hashlib,json
r=pathlib.Path('/private/tmp/crumbs-m105-consumer-decision-20261008')
shell=pathlib.Path('/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css/.superpowers/artifacts/m105-mobile-calibration-20261007-d/native/ios/plain/DerivedData/Build/Products/Release-iphonesimulator/CrumbsM105plain.app')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
manifest={'shell':str(shell),'shellOriginalBundleHash':sha(shell/'main.jsbundle'),'variants':{}}
for v in ['plain','core','compatibility']:
 app=r/v/'CrumbsDiagnostic.app';shutil.copytree(shell,app)
 bundles=list((r/v/'export').rglob('*.hbc'));assert len(bundles)==1
 assert bundles[0].read_bytes()[:8]==bytes.fromhex('c61fbc03c103191f')
 shutil.copy2(bundles[0],app/'main.jsbundle')
 p=plistlib.loads((app/'Info.plist').read_bytes());p['CFBundleIdentifier']='dev.crumbs.m105.diagnostic.'+v;p['CFBundleDisplayName']='Crumbs diagnostic '+v;p.pop('CFBundleURLTypes',None);p['NSAppTransportSecurity']={'NSAllowsArbitraryLoads':True,'NSAllowsLocalNetworking':True}
 (app/'Info.plist').write_bytes(plistlib.dumps(p))
 exe=p['CFBundleExecutable'];assert sha(shell/exe)==sha(app/exe)
 manifest['variants'][v]={'appId':p['CFBundleIdentifier'],'bundleHash':sha(app/'main.jsbundle'),'bundleBytes':(app/'main.jsbundle').stat().st_size,'executableHash':sha(app/exe),'fixtureHash':sha(r/v/'scene.js'),'entryHash':sha(r/v/'index.js')}
(r/'artifacts.json').write_text(json.dumps(manifest,indent=2));print(json.dumps(manifest,indent=2))
